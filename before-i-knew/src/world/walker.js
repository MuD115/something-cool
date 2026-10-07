// A body that walks the level: the player and every NPC share this.
// Stances: stand, crouch, prone. It steps up small ledges, mantles waist-high
// ones, can't stand under low ceilings, and falls under gravity.
// Feet are at (x, y); up is negative y.

import { Person, POSES, crawlPose, blendPose, L as LIMB, footDrop } from '../rigs/person.js';
import { clamp, lerp, smooth } from '../engine/util.js';
import { MOTION, LEG, amplify } from '../rigs/motion.js';
import { Ragdoll } from '../rigs/ragdoll.js';

export const HEIGHT = { stand: 170, crouch: 122, prone: 48 };
// halfway to the ground: on one knee, leaning forward onto the hands
// Getting up off the back after a fall: sit up, onto a knee, up.
const SIT_UP = { torso: 0.1, head: 0.15, thighN: 1.5, shinN: 1.1, thighF: 1.45, shinF: 0.9, armN: -0.55, foreN: -0.3, armF: -0.5, foreF: -0.25 };
const RISE_KNEE = { ...POSES.kneel, torso: 0.45, head: -0.1, armN: 0.9, foreN: 1.1, armF: 0.7, foreF: 0.9 };

// Motion-captured gaits (CMU mocap, see tools/mocap.mjs), with the speed
// each clip reads most naturally at: faster than that the stride lengthens
// a little, slower it shortens, and past it the next gait takes over.
const GAITS = {
  walk: { clip: MOTION.walk, natural: 125 },
  jog: { clip: MOTION.jog, natural: 250 },
  run: { clip: MOTION.run, natural: 320 },
  crouch: { clip: MOTION.crouchWalk, natural: 78 },
};

const KNEEL_DOWN = { ...POSES.kneel, torso: 0.62, head: -0.2, armN: 1.25, foreN: 1.35, armF: 1.1, foreF: 1.25 };
const SPEED = { stand: 162, run: 310, crouch: 84, prone: 42, carry: 98 };
const GRAVITY = 2600;
const JUMP_V = 640;
const STEP = 22;
const HALF_W = 14;
const MANTLE_MIN = 34;
const MANTLE_MAX = 150;
const MANTLE_TIME = 0.95;
// Forgiving jumps (see README): a jump still counts just after walking off
// an edge (coyote time) and just before landing (a buffer).
const COYOTE = 0.12;
const JUMP_BUFFER = 0.14;
// The body's side of a jump: a brief gather before it, a give after it.
const TAKEOFF_POSE = { torso: 0.32, head: -0.12, thighN: 0.95, shinN: -0.9, thighF: 0.75, shinF: -1.0, armN: -0.55, foreN: 0.3, armF: -0.6, foreF: 0.25 };
const LAND_POSE = { torso: 0.42, head: 0.05, thighN: 1.15, shinN: -1.05, thighF: 0.95, shinF: -1.15, armN: 0.55, foreN: 0.9, armF: 0.45, foreF: 0.8 };
// Mantling, in four: hands on the ledge, pulling up, a knee over and a push, standing.
const M_REACH = { torso: 0.1, head: -0.35, thighN: 0.1, shinN: 0.05, thighF: -0.1, shinF: -0.1, armN: 2.8, foreN: 3.0, armF: 2.6, foreF: 2.9 };
const M_PULL = { torso: 0.35, head: -0.2, thighN: 0.9, shinN: -0.7, thighF: 0.5, shinF: -1.0, armN: 1.9, foreN: 2.7, armF: 1.8, foreF: 2.6 };
const M_PUSH = { torso: 0.95, head: -0.1, thighN: 1.7, shinN: -0.6, thighF: 0.4, shinF: -0.9, armN: 0.35, foreN: 0.25, armF: 0.3, foreF: 0.2 };
// Idle actions, after standing still a while: a look at the watch, a
// glance back over the shoulder, a hand to the pouch at his hip.
const IDLES = [
  { dur: 2.2, pose: { head: 0.5, armF: 0.35, foreF: 1.75, armN: 0.3, foreN: 1.55 } },
  { dur: 2.0, pose: { head: -0.25, torso: -0.06, armN: 0.1, armF: -0.1 } },
  { dur: 1.6, pose: { head: 0.35, torso: 0.08, armN: -0.35, foreN: 0.75 } },
];

// How far the planted foot sweeps back under the body over one stride of a
// gait, measured on the rig itself (so the ground can move at exactly that
// rate and the feet never slide). Cached per gait and stride scale.
const STRIDES = new Map();
function footStride(g, k) {
  const key = `${g.clip.name}:${k}`;
  let v = STRIDES.get(key);
  if (v) return v;
  const probe = new Person('sami', 1);
  const N = 96;
  let back = 0;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    probe.setPose(amplify(g.clip, g.clip.at(i / N), k));
    probe.local = null;
    const j = probe.solve();
    const n = j.footN[1] > j.footF[1] ? 'footN' : 'footF';
    const x = j[n][0];
    if (prev && prev.n === n && x < prev.x) back += prev.x - x;
    prev = { n, x };
  }
  // (double support counts the sweep twice for a moment: take a little off)
  v = Math.max(20, (back || g.clip.stride * LEG * k) * 0.9);
  STRIDES.set(key, v);
  return v;
}

// Standing: a captured wait (weight shifting, a lean, settling), looped by
// easing its end into its start. Kept gentle: mostly the legs and torso.
function idlePose(t) {
  const c = MOTION.idle;
  const T = c.duration;
  const u = ((t % T) + T) % T;
  let p = c.time(u);
  const fadeT = 0.8;
  if (u > T - fadeT) p = blendPose(p, c.time(0), smooth(T - fadeT, T, u));
  // arms mostly at rest: take a little of the capture's arm movement; and
  // the subject stood leaning back a touch, so his sways are kept but
  // about an upright stance
  const s = POSES.stand;
  const mean = (c.meanTorso ??= c.frames.reduce((acc, f) => acc + f.torso, 0) / c.frames.length);
  return {
    ...p,
    torso: s.torso + 0.03 + (p.torso - mean) * 0.7,
    armN: lerp(s.armN, p.armN, 0.4),
    foreN: lerp(s.foreN, p.foreN, 0.4),
    armF: lerp(s.armF, p.armF, 0.4),
    foreF: lerp(s.foreF, p.foreF, 0.4),
  };
}

export class Walker {
  constructor(level, outfit = 'sami', scale = 1) {
    this.level = level;
    this.rig = new Person(outfit, scale);
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.f = 1;
    this.stance = 'stand';
    this.shown = 'stand'; // pose being displayed, blends toward stance
    this.blend = 1;
    this.prevPose = { ...POSES.stand };
    this.onGround = true;
    this.mantle = null;
    this.stride = 0;
    this.carry = false;
    this.override = null; // scripted pose (object) or function(t) → pose
    this.overrideBlend = 0;
    this.visible = true;
    this.onStep = null;
    this.onStop = null;
    this.lastStep = 0;
    this.time = 0;
    this.blocked = null; // why we couldn't move this frame: 'ceiling' | 'wall' | null
    this.seed = Math.random() * 100; // so idle glances aren't in step
    this.coyote = 0;
    this.jumpBuf = 0;
    this.takeoff = 0; // seconds of the take-off gather left
    this.landing = 0; // how hard the last landing was, fading
    this.leanS = 0; // lean with acceleration, smoothed
    this.stillT = 0;
    this.idleAct = null;
    this.idles = false; // the player's idle actions (NPCs have their own lives)
  }

  // 'side' | 'front' | 'back': see Person.face.
  face(view) {
    this.rig.face(view);
  }

  get view() {
    return this.rig.view;
  }

  place(x, y = null) {
    this.x = x;
    this.y = y ?? this.level.groundAt(x, -9999);
    this.vx = 0;
    this.vy = 0;
    this.mantle = null;
    this.onGround = true;
    this.locks = null;
    this.ragdoll = null;
    this.getUp = null;
  }

  height(stance = this.stance) {
    return HEIGHT[stance];
  }

  fits(stance, x = this.x) {
    return this.y - HEIGHT[stance] >= this.level.ceilingAt(x, this.y) - 1;
  }

  setStance(s) {
    if (s === this.stance) return true;
    // can't rise into a ceiling
    if (HEIGHT[s] > HEIGHT[this.stance] && !this.fits(s)) return false;
    this.stance = s;
    return true;
  }

  // Try to climb what's in front. Returns true if a mantle started.
  tryMantle() {
    const L = this.level;
    const ahead = this.x + this.f * (HALF_W + 26);
    for (const b of L.solids) {
      if (!(ahead >= b.x0 && ahead <= b.x1) && !(this.x + this.f * (HALF_W + 4) >= b.x0 && this.x + this.f * (HALF_W + 4) <= b.x1)) continue;
      const rise = this.y - b.y0;
      if (rise < MANTLE_MIN || rise > MANTLE_MAX) continue;
      if (b.noClimb) continue;
      const tx = this.f > 0 ? Math.max(b.x0 + 26, this.x + 44) : Math.min(b.x1 - 26, this.x - 44);
      this.mantle = { t: 0, x0: this.x, y0: this.y, x1: tx, y1: b.y0 };
      this.stance = 'stand';
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    return false;
  }

  // intent: { move: −1…1, run, jump, stance }
  // Knocked off his feet (a blast, a dive from a shot): the body goes to a
  // ragdoll with this push, and later gets up. muscle > 0 with pinFeet is a
  // stagger that rights itself without falling. then: 'stand' | 'prone' |
  // null (stay down until told).
  knockDown(impulse, { muscle = 0, pinFeet = false, then = 'stand', onUp = null } = {}) {
    this.ragdoll = new Ragdoll(this, impulse, { muscle, pinFeet });
    if (muscle > 0) {
      // the pose to be pulled back to: where the joints are now
      const t = {};
      for (const n of Object.keys(this.ragdoll.p)) t[n] = [...this.ragdoll.p[n]];
      this.ragdoll.target = t;
    }
    this.getUp = null;
    this.downThen = then;
    this.onUp = onUp;
    this.vx = 0;
    this.vy = 0;
    this.locks = null;
  }

  get down() {
    return !!(this.ragdoll || this.getUp);
  }

  // The ragdoll's frame: physics, then the rig follows its points. Once it
  // lies still, getting up begins (or it waits, with 'then' null).
  ragdollUpdate(dt) {
    const rd = this.ragdoll;
    rd.update(dt);
    const r = this.rig;
    const pose = rd.pose();
    r.tick(dt);
    r.setPose(pose);
    r.x = rd.p.hip[0];
    r.y = rd.p.hip[1];
    r.f = this.f;
    r.grounded = false;
    this.x = rd.p.hip[0];
    this.y = this.level.groundAt(this.x, rd.p.hip[1]);
    this.cur = pose;
    const stagger = rd.muscle > 0 && rd.pinFeet;
    if (stagger ? rd.t > 0.55 : rd.settled && this.downThen) {
      this.ragdoll = null;
      this.getUp = { t: 0, from: pose, lying: stagger ? 'feet' : rd.lying };
      r.grounded = true;
    }
  }

  // Up again: from the belly, through the stance system (prone, then a
  // kneel, then standing); off the back, sitting up first.
  getUpUpdate(dt) {
    const gu = this.getUp;
    gu.t += dt;
    const then = this.downThen;
    let pose;
    if (gu.lying === 'feet') {
      pose = blendPose(gu.from, POSES.stand, smooth(0, 0.35, gu.t));
      if (gu.t >= 0.35) this.finishGetUp('stand');
    } else if (gu.lying === 'front' || then === 'prone') {
      this.stance = 'prone';
      this.lastStance = 'prone';
      pose = blendPose(gu.from, POSES.prone, smooth(0, 0.4, gu.t));
      if (gu.t >= 0.45) {
        this.finishGetUp('prone');
        if (then === 'stand') this.setStance('stand');
      }
    } else {
      const k = gu.t;
      pose =
        k < 0.5
          ? blendPose(gu.from, SIT_UP, smooth(0, 0.5, k))
          : k < 0.95
            ? blendPose(SIT_UP, RISE_KNEE, smooth(0.5, 0.95, k))
            : blendPose(RISE_KNEE, POSES.stand, smooth(0.95, 1.35, k));
      if (k >= 1.35) this.finishGetUp('stand');
    }
    if (this.getUp) {
      this.cur = pose;
      const r = this.rig;
      r.tick(dt);
      r.setPose(pose);
      r.x = this.x;
      r.y = this.y;
      r.f = this.f;
      r.grounded = true;
    }
  }

  finishGetUp(stance) {
    this.getUp = null;
    this.stance = stance;
    this.lastStance = stance;
    this.stanceT = 0;
    const cb = this.onUp;
    this.onUp = null;
    cb?.();
  }

  update(dt, intent = {}) {
    this.time += dt;
    const L = this.level;
    this.blocked = null;
    if (this.ragdoll) {
      this.ragdollUpdate(dt);
      return;
    }
    if (this.getUp) {
      this.getUpUpdate(dt);
      return;
    }
    // moved by a script along a path (a stair flight, a drainpipe): no
    // physics, just the pose for the speed it's being moved at
    if (this.scripted) {
      this.pose(dt, this.scriptedSpeed || 0);
      return;
    }

    if (this.mantle) {
      const m = this.mantle;
      m.t += dt / MANTLE_TIME;
      const k = clamp(m.t);
      const up = smooth(0.15, 0.6, k);
      const over = smooth(0.4, 0.9, k);
      this.x = lerp(m.x0, m.x1, over);
      this.y = lerp(m.y0, m.y1, up);
      if (m.t >= 1) {
        this.mantle = null;
        this.y = m.y1;
        this.onGround = true;
        this.onLand?.(0.2);
      }
      this.pose(dt, 0);
      return;
    }

    if (intent.stance) this.setStance(intent.stance);

    let speed = SPEED[this.stance];
    if (this.stance === 'stand' && intent.run && !this.carry) speed = SPEED.run;
    if (this.carry && this.stance === 'stand') speed = SPEED.carry;
    const move = intent.move || 0;
    const target = move * speed;
    // ease in and out of a walk rather than snapping to speed
    const acc = this.onGround ? (Math.abs(target) > Math.abs(this.vx) ? 900 : 1300) : 600;
    this.vx += clamp(target - this.vx, -acc * dt, acc * dt);
    if (move !== 0 && !this.faceLock) {
      const f = move > 0 ? 1 : -1;
      if (f !== this.f) this.rig.pivot(); // a quick turn, not a flip
      this.f = f;
    }
    // facing held (dragging something, backing away from it): he goes
    // backwards, and his limbs go backwards too (see pose)
    if (this.faceLock) this.f = this.faceLock;

    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuf = intent.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0) && this.stance === 'stand' && !this.carry) {
      this.jumpBuf = 0;
      if (!(this.onGround && this.tryMantle())) {
        this.vy = -JUMP_V;
        this.onGround = false;
        this.coyote = 0;
        this.takeoff = 0.09;
        this.onJump?.();
      }
      if (this.mantle) {
        this.pose(dt, 0);
        return;
      }
    }

    // Horizontal, against walls and low ceilings.
    let nx = this.x + this.vx * dt;
    const edge = nx + Math.sign(this.vx || this.f) * HALF_W;
    if (this.vx !== 0) {
      for (const b of L.solids) {
        if (edge < b.x0 || edge > b.x1) continue;
        if (this.x + HALF_W > b.x0 && this.x - HALF_W < b.x1) continue; // already over it
        const rise = this.y - b.y0;
        if (rise <= STEP && rise > -1) {
          if (this.onGround) this.y = b.y0; // small step up
          continue;
        }
        if (b.y0 < this.y && b.y1 > this.y - HEIGHT[this.stance]) {
          nx = this.vx > 0 ? b.x0 - HALF_W - 0.5 : b.x1 + HALF_W + 0.5;
          this.vx = 0;
          this.blocked = 'wall';
        }
      }
      if (this.y - HEIGHT[this.stance] < L.ceilingAt(edge, this.y) - 1) {
        nx = this.x;
        this.vx = 0;
        this.blocked = 'ceiling';
      }
    }
    nx = clamp(nx, L.bounds[0] + HALF_W, L.bounds[1] - HALF_W);
    const moved = nx - this.x;
    this.x = nx;

    // Vertical.
    const ground = L.groundAt(this.x, this.y);
    if (this.onGround && this.y < ground - 1) this.onGround = false; // walked off an edge
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      const g2 = L.groundAt(this.x, this.y - this.vy * dt - 1);
      if (this.y >= g2) {
        const hard = this.vy;
        this.y = g2;
        this.vy = 0;
        this.onGround = true;
        this.landing = Math.max(this.landing, clamp(hard / 1300));
        this.onLand?.(clamp(hard / 1400));
        // a real drop (four metres and more) takes him off his feet
        if (hard > 1550 && this.fallsHard) this.knockDown([this.vx * 0.5, 0], { then: 'stand' });
      }
    } else {
      this.y = ground;
    }

    this.stride += Math.abs(moved);
    this.pose(dt, Math.abs(moved) / Math.max(dt, 1e-4), intent.run);
  }

  // Scripted movement for NPCs: walk toward x, climbing and ducking as needed.
  goTo(x, dt, { run = false, speedScale = 1 } = {}) {
    const d = x - this.x;
    if (Math.abs(d) < 6) {
      this.update(dt, { move: 0 });
      return true;
    }
    // NPCs duck under whatever they meet, and stand again when clear
    const ahead = this.x + Math.sign(d) * 40;
    const want = this.y - HEIGHT.stand >= this.level.ceilingAt(ahead, this.y) - 1 && this.fits('stand') ? 'stand' : this.y - HEIGHT.crouch >= this.level.ceilingAt(ahead, this.y) - 1 ? 'crouch' : 'prone';
    const move = Math.sign(d) * clamp(Math.abs(d) / 60, 0.25, 1) * speedScale;
    const wall = this.level.solids.some((b) => ahead >= b.x0 && ahead <= b.x1 && this.y - b.y0 > STEP && this.y - b.y0 <= MANTLE_MAX && b.y1 > this.y - 10);
    this.update(dt, { move, run, stance: want, jump: wall && this.onGround && this.stance === 'stand' });
    return false;
  }

  // One gait (or a blend of two or three) at the current speed, its phase
  // carried forward by the distance covered, so the feet keep pace with the
  // ground and don't slide.
  gait(dt, speed, parts) {
    let eff = 0;
    let wsum = 0;
    const poses = [];
    for (const [g, w] of parts) {
      if (w <= 0.001) continue;
      const k = Math.round(clamp(speed / g.natural, 0.6, 1.35) * 20) / 20;
      eff += footStride(g, k) * this.rig.scale * w;
      wsum += w;
      poses.push([g, k, w]);
    }
    eff /= wsum || 1;
    this.gphase = (this.gphase || 0) + ((this.backing ? -1 : 1) * speed * dt) / Math.max(eff, 1);
    let out = null;
    let acc = 0;
    for (const [g, k, w] of poses) {
      const p = amplify(g.clip, g.clip.at(this.gphase), k);
      acc += w;
      out = out ? blendPose(out, p, w / acc) : p;
    }
    return out;
  }

  pose(dt, speed, run = false) {
    let target;
    // moving against the way he faces: the cycles run in reverse
    this.backing = !!this.faceLock && Math.abs(this.vx) > 4 && Math.sign(this.vx) === -this.faceLock;
    const phase = (this.stride / (this.stance === 'stand' ? 74 : this.stance === 'crouch' ? 34 : 52)) * Math.PI;
    if (this.mantle) {
      const k = clamp(this.mantle.t);
      target =
        k < 0.25
          ? blendPose(POSES.stand, M_REACH, smooth(0, 0.22, k))
          : k < 0.5
            ? blendPose(M_REACH, M_PULL, smooth(0.25, 0.48, k))
            : k < 0.75
              ? blendPose(M_PULL, M_PUSH, smooth(0.5, 0.72, k))
              : blendPose(M_PUSH, POSES.stand, smooth(0.75, 1, k));
    } else if (!this.onGround) {
      // a brief gather at take-off, then the jump itself
      target = this.takeoff > 0 ? TAKEOFF_POSE : POSES.jump;
    } else if (this.stance === 'prone') {
      target = speed > 4 ? crawlPose((this.backing ? -phase : phase) * 0.8) : POSES.prone;
    } else if (this.stance === 'crouch') {
      if (speed > 4) target = this.gait(dt, speed, [[GAITS.crouch, 1]]);
      else {
        // holding still, low: breathing, and a look round now and then
        const tt = this.time + this.seed;
        const c = POSES.crouch;
        target = { ...c, torso: c.torso + 0.015 * Math.sin(tt * 2.1), head: c.head + Math.max(0, Math.sin(tt * 0.3) - 0.7) * 0.6 * Math.sin(tt * 1.1), armN: c.armN + 0.02 * Math.sin(tt * 2.1) };
      }
    } else if (speed > 4) {
      const wj = smooth(175, 255, speed);
      const wr = smooth(255, 320, speed);
      target = this.gait(dt, speed, [[GAITS.walk, 1 - wj], [GAITS.jog, wj * (1 - wr)], [GAITS.run, wr]]);
      if (this.carry) target = { ...target, ...POSES.carry, thighN: target.thighN, shinN: target.shinN, thighF: target.thighF, shinF: target.shinF, torso: -0.08 };
    } else {
      target = this.carry ? POSES.carry : idlePose(this.time + this.seed * 7);
      // idle life: breathing, and a glance around now and then
      const tt = this.time + this.seed;
      const glance = Math.max(0, Math.sin(tt * 0.23) - 0.6) * 0.5 * Math.sin(tt * 0.9);
      target = {
        ...target,
        torso: target.torso + 0.012 * Math.sin(tt * 1.7),
        head: target.head + glance - 0.05 * Math.max(0, Math.sin(tt * 0.11 + 2) - 0.8) * 5,
        armN: target.armN + 0.02 * Math.sin(tt * 1.7),
        armF: target.armF + 0.02 * Math.sin(tt * 1.7 + 0.4),
      };
    }

    this.takeoff = Math.max(0, this.takeoff - dt);
    if (!this.mantle && this.onGround) {
      // the give of a landing, fading (movement is never held up by it)
      if (this.landing > 0.02 && this.stance === 'stand') target = blendPose(target, LAND_POSE, Math.min(1, this.landing * 1.4));
      this.landing = Math.max(0, this.landing - dt * 4);
      // lean into a start, settle back from a stop
      const acc = ((this.vx - (this.lastVx ?? this.vx)) / Math.max(dt, 1e-4)) * this.f;
      this.leanS = lerp(this.leanS, clamp(acc / 1400, -1, 1), 1 - Math.exp(-dt * 9));
      if (this.stance === 'stand') target = { ...target, torso: target.torso + this.leanS * 0.12, head: target.head - this.leanS * 0.05 };
      // standing still a while: now and then, one small thing
      if (this.idles && this.stance === 'stand' && speed <= 4 && !this.override && !this.carry) {
        this.stillT += dt;
        if (!this.idleAct && this.stillT > 6.5 + (this.seed % 2)) {
          this.idleAct = { ...IDLES[Math.floor(Math.random() * IDLES.length)], t: 0 };
          this.stillT = -4 - Math.random() * 4; // and not again for a while
        }
      } else {
        this.stillT = 0;
        this.idleAct = null;
      }
      if (this.idleAct) {
        const ia = this.idleAct;
        ia.t += dt;
        const w = Math.sin(clamp(ia.t / ia.dur) * Math.PI);
        const q = w * w * (3 - 2 * w);
        target = blendPose(target, { ...target, ...ia.pose }, q);
        if (ia.t >= ia.dur) this.idleAct = null;
      }
    }
    // his gaze on what he's looking at (set by the game)
    this.gazeS = lerp(this.gazeS || 0, this.gaze || 0, 1 - Math.exp(-dt * 5));
    this.gazeLeanS = lerp(this.gazeLeanS || 0, this.gazeLean || 0, 1 - Math.exp(-dt * 4));
    if (Math.abs(this.gazeS) > 0.005 || this.gazeLeanS > 0.005) target = { ...target, head: target.head + this.gazeS, torso: target.torso + this.gazeLeanS };
    this.lastVx = this.vx;

    // footsteps
    if (this.onGround && speed > 4 && this.stance !== 'prone') {
      // two footfalls a stride
      const n = Math.floor((this.gphase || 0) * 2);
      if (n !== this.lastStep) {
        this.lastStep = n;
        this.onStep?.(this.stance);
      }
    }
    // coming to a stop from a walk: one scuff
    if (this.onGround && this.stance !== 'prone') {
      if (speed > 60) this.wasWalking = true;
      else if (speed < 4 && this.wasWalking) {
        this.wasWalking = false;
        this.onStop?.();
      }
    }

    // arms held a certain way whatever the legs are doing (a raised cloth)
    if (this.arms) target = { ...target, ...this.arms };

    // Stance changes take their time (about half a second), and going
    // between standing and lying passes through a kneel, hands going down
    // first, as a body really drops to the ground and gets up again.
    if (this.stance !== this.lastStance) {
      this.stanceFrom = this.lastStance;
      this.lastStance = this.stance;
      this.stanceT = this.cur ? 0.55 : 0;
    }
    this.stanceT = Math.max(0, (this.stanceT || 0) - dt);
    const deep = (this.stanceFrom === 'stand' && this.stance === 'prone') || (this.stanceFrom === 'prone' && this.stance === 'stand');
    if (deep && this.stanceT > 0.27 && this.onGround && !this.override) target = KNEEL_DOWN;
    const rate = this.stanceT > 0 ? 7 : 14;
    this.cur = this.cur ? blendPose(this.cur, target, clamp(dt * rate)) : { ...target };
    let final = this.cur;
    if (this.override) {
      this.overrideBlend = Math.min(this.overrideBlend + dt * 4, 1);
      let op = typeof this.override === 'function' ? this.override(this.time) : this.override;
      // one held pose giving way to another eases across (a few tenths of a
      // second); poses a script recomputes every frame are followed as they are
      if (this.override !== this.ovLast) {
        const settled = this.time - (this.ovSince ?? -9) > 0.12;
        this.ovFrom = settled && this.lastFinal && this.overrideBlend >= 1 ? this.lastFinal : null;
        this.ovT = 0;
        this.ovLast = this.override;
        this.ovSince = this.time;
      }
      if (this.ovFrom) {
        this.ovT += dt * 4.5;
        if (this.ovT >= 1) this.ovFrom = null;
        else op = blendPose(this.ovFrom, op, smoothstep01(this.ovT));
      }
      final = blendPose(this.cur, op, this.overrideBlend);
      this.ovRelease = op;
    } else if (this.ovRelease && this.overrideBlend > 0) {
      // let go of a scripted pose the way it was taken: eased, not snapped
      this.overrideBlend = Math.max(0, this.overrideBlend - dt * 5);
      final = blendPose(this.cur, this.ovRelease, this.overrideBlend);
      if (this.overrideBlend <= 0) this.ovRelease = null;
      this.ovLast = null;
    } else {
      this.overrideBlend = 0;
      this.ovLast = null;
    }
    this.lastFinal = final;

    const r = this.rig;
    // feet that are down stay where they landed, and stand on what's there
    if (this.onGround && !this.mantle && !this.override && this.stance !== 'prone' && this.visible) final = this.plantFeet(final, dt, speed);
    else this.locks = null;
    // any change of facing is a quick turn, never a flip (scripts too)
    if (r.f !== undefined && r.f !== this.f && r.flipK >= 1) r.pivot();
    // the body's acceleration, for what hangs from it
    r.ax = (this.vx - (this.swingVx ?? this.vx)) / Math.max(dt, 1e-4);
    this.swingVx = this.vx;
    r.tick(dt);
    r.setPose(final);
    r.x = this.x;
    r.y = this.y;
    r.f = this.f;
    r.grounded = true;
  }

  // Foot planting. A foot the clip puts on the ground is locked to the
  // spot where it came down, and the leg is solved (two-bone IK, knee
  // forward) to keep reaching it while the body moves over it; the ground
  // under each foot is looked up, so feet stand on a kerb or a lump of
  // rubble rather than in it. When the clip lifts the foot, the lock lets go
  // and the leg eases back to the animation.
  plantFeet(pose, dt, speed) {
    const r = this.rig;
    r.setPose(pose);
    r.local = null;
    const j = r.solve();
    const h = r.hipHeight();
    const sc = r.scale;
    this.locks = this.locks || { N: null, F: null, kN: 0, kF: 0 };
    const out = { ...pose };
    for (const s of ['N', 'F']) {
      const foot = j['foot' + s];
      const shin = pose['shin' + s];
      // down: at the ground (the rig stands 4 above its lowest point) and,
      // in the clip, travelling back under the body or still; a foot the
      // clip carries forward is swinging, however low it skims
      const lift = h - (foot[1] + footDrop(shin));
      const ax = this.locks['ax' + s];
      this.locks['ax' + s] = foot[0];
      const back = ax == null || foot[0] - ax <= 0.02;
      const down = lift <= 6.5 && back;
      const wx = this.x + foot[0] * this.f * sc;
      // the ground under this foot, relative to where the body stands
      const gy = this.level.groundAt(wx, this.y - 60);
      const dG = clamp((gy - this.y) / sc, -30, 12);
      let tx = foot[0];
      let ty = foot[1] + (down ? dG : Math.min(0, dG));
      const lock = this.locks[s];
      if (down && speed > 4) {
        if (lock == null) this.locks[s] = wx;
        else tx = (lock - this.x) / (this.f * sc);
        this.locks['k' + s] = Math.min(1, this.locks['k' + s] + dt * 20);
      } else {
        this.locks[s] = null;
        this.locks['k' + s] = Math.max(0, this.locks['k' + s] - dt * 10);
        // the foot comes off the ground from where it really was
        const last = this.locks['last' + s];
        if (last && this.locks['k' + s] > 0) {
          tx = lerp(tx, last.tx, this.locks['k' + s]);
          ty = lerp(ty, last.ty, this.locks['k' + s]);
        }
      }
      const k = speed > 4 ? this.locks['k' + s] : 1;
      if (k <= 0.001 && Math.abs(ty - foot[1]) < 0.01) continue;
      // two bones, hip at the origin, the knee bending forward
      const a1 = LIMB.thigh;
      const a2 = LIMB.shin;
      let d = Math.hypot(tx, ty);
      const max = (a1 + a2) * 0.999;
      if (d > max) {
        // can't reach: the foot drags along a touch rather than the leg
        // stretching (or the foot jumping to a new spot)
        tx *= max / d;
        ty *= max / d;
        d = max;
        if (this.locks[s] != null) this.locks[s] = this.x + tx * this.f * sc;
      }
      this.locks['last' + s] = { tx, ty };
      const phi = Math.atan2(tx, ty);
      const cosA = clamp((a1 * a1 + d * d - a2 * a2) / (2 * a1 * d), -1, 1);
      const th = phi + Math.acos(cosA);
      const kx = Math.sin(th) * a1;
      const ky = Math.cos(th) * a1;
      const sh = Math.atan2(tx - kx, ty - ky);
      out['thigh' + s] = lerp(pose['thigh' + s], th, k);
      out['shin' + s] = lerp(shin, sh, k);
    }
    return out;
  }

  draw(ctx) {
    if (this.visible) this.rig.draw(ctx);
  }
}

function smoothstep01(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}
