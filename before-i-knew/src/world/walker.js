// A body that walks the level: the player and every NPC share this.
// Stances: stand, crouch, prone. It steps up small ledges, mantles waist-high
// ones, can't stand under low ceilings, and falls under gravity.
// Feet are at (x, y); up is negative y.

import { Person, POSES, walkPose, crouchWalkPose, crawlPose, blendPose } from '../rigs/person.js';
import { clamp, lerp, smooth } from '../engine/util.js';

export const HEIGHT = { stand: 188, crouch: 138, prone: 52 };
const SPEED = { stand: 175, run: 330, crouch: 92, prone: 44, carry: 105 };
const GRAVITY = 2600;
const JUMP_V = 640;
const STEP = 22;
const HALF_W = 14;
const MANTLE_MIN = 34;
const MANTLE_MAX = 150;
const MANTLE_TIME = 0.95;

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
    const acc = this.onGround ? 1800 : 700;
    this.vx += clamp(target - this.vx, -acc * dt, acc * dt);
    if (move !== 0) this.f = move > 0 ? 1 : -1;

    if (intent.jump && this.onGround && this.stance === 'stand' && !this.carry) {
      if (!this.tryMantle()) {
        this.vy = -JUMP_V;
        this.onGround = false;
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
    const phase = (this.stride / 88) * Math.PI;
    if (this.mantle) {
      const k = clamp(this.mantle.t);
      target =
        k < 0.35
          ? blendPose(POSES.stand, POSES.reachUp, smooth(0, 0.3, k))
          : k < 0.7
            ? blendPose(POSES.reachUp, { ...POSES.crouch, armN: 1.9, foreN: 2.3, armF: 1.7, foreF: 2.2 }, smooth(0.35, 0.65, k))
            : blendPose({ ...POSES.crouch, armN: 1.9, foreN: 2.3, armF: 1.7, foreF: 2.2 }, POSES.stand, smooth(0.7, 1, k));
    } else if (!this.onGround) {
      target = POSES.jump;
    } else if (this.stance === 'prone') {
      target = speed > 4 ? crawlPose(phase * 0.8) : POSES.prone;
    } else if (this.stance === 'crouch') {
      target = speed > 4 ? crouchWalkPose(phase) : POSES.crouch;
    } else if (speed > 4) {
      const runK = clamp((speed - 190) / 120);
      target = walkPose(phase, clamp(speed / 170, 0.4, 1.2), runK);
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

    // footsteps
    if (this.onGround && speed > 4 && this.stance !== 'prone') {
      const n = Math.floor(this.stride / 88);
      if (n !== this.lastStep) {
        this.lastStep = n;
        this.onStep?.(this.stance);
      }
    }

    // smooth stance changes
    this.cur = this.cur ? blendPose(this.cur, target, clamp(dt * 14)) : { ...target };
    let final = this.cur;
    if (this.override) {
      this.overrideBlend = Math.min(this.overrideBlend + dt * 4, 1);
      const op = typeof this.override === 'function' ? this.override(this.time) : this.override;
      final = blendPose(this.cur, op, this.overrideBlend);
    } else this.overrideBlend = 0;

    const r = this.rig;
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
