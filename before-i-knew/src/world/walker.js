// A body that walks the level: the player and every NPC share this.
// Stances: stand, crouch, prone. It steps up small ledges, mantles waist-high
// ones, can't stand under low ceilings, and falls under gravity.
// Feet are at (x, y); up is negative y.

import { Person, POSES, walkPose, crouchWalkPose, crawlPose, blendPose } from '../rigs/person.js';
import { clamp, lerp, smooth } from '../engine/util.js';

export const HEIGHT = { stand: 170, crouch: 122, prone: 48 };
// halfway to the ground: on one knee, leaning forward onto the hands
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
  update(dt, intent = {}) {
    this.time += dt;
    const L = this.level;
    this.blocked = null;
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
    if (move !== 0) {
      const f = move > 0 ? 1 : -1;
      if (f !== this.f) this.rig.pivot(); // a quick turn, not a flip
      this.f = f;
    }

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

  pose(dt, speed, run = false) {
    let target;
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
      target = speed > 4 ? crawlPose(phase * 0.8) : POSES.prone;
    } else if (this.stance === 'crouch') {
      if (speed > 4) target = crouchWalkPose(phase);
      else {
        // holding still, low: breathing, and a look round now and then
        const tt = this.time + this.seed;
        const c = POSES.crouch;
        target = { ...c, torso: c.torso + 0.015 * Math.sin(tt * 2.1), head: c.head + Math.max(0, Math.sin(tt * 0.3) - 0.7) * 0.6 * Math.sin(tt * 1.1), armN: c.armN + 0.02 * Math.sin(tt * 2.1) };
      }
    } else if (speed > 4) {
      const runK = clamp((speed - 180) / 110);
      target = walkPose(phase, clamp(speed / 160, 0.35, 1.2), runK);
      if (this.carry) target = { ...target, ...POSES.carry, thighN: target.thighN, shinN: target.shinN, thighF: target.thighF, shinF: target.shinF, torso: -0.08 };
    } else {
      target = this.carry ? POSES.carry : POSES.stand;
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
      const n = Math.floor(this.stride / (this.stance === 'stand' ? 74 : this.stance === 'crouch' ? 34 : 52));
      if (n !== this.lastStep) {
        this.lastStep = n;
        this.onStep?.(this.stance);
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
      const op = typeof this.override === 'function' ? this.override(this.time) : this.override;
      final = blendPose(this.cur, op, this.overrideBlend);
    } else this.overrideBlend = 0;

    const r = this.rig;
    // any change of facing is a quick turn, never a flip (scripts too)
    if (r.f !== undefined && r.f !== this.f && r.flipK >= 1) r.pivot();
    r.tick(dt);
    r.setPose(final);
    r.x = this.x;
    r.y = this.y;
    r.f = this.f;
    r.grounded = true;
  }

  draw(ctx) {
    if (this.visible) this.rig.draw(ctx);
  }
}
