// A ragdoll for the rig: Verlet points at the joints, held together by
// bone lengths and joint limits, falling under gravity onto the level.
//
// It starts from the rig's current pose (and the body's velocity plus an
// impulse), and each frame it is turned back into the rig's own angles, so
// the character is drawn exactly as always. With some 'muscle' the body
// is pulled back towards a pose (a stagger it recovers from); with none it
// is limp (a fall). Position-based dynamics after Jakobsen, "Advanced
// Character Physics" (GDC 2001): integrate, then relax constraints a few
// times a step.

import { L } from './person.js';
import { clamp } from '../engine/util.js';

const GRAVITY = 2600;
const STEP = 1 / 60;
const ITER = 8;

// joints and their bones (lengths from the rig, times its scale)
const POINTS = ['hip', 'neck', 'head', 'kneeN', 'footN', 'kneeF', 'footF', 'elbowN', 'handN', 'elbowF', 'handF'];
const BONES = [
  ['hip', 'neck', L.torso],
  ['neck', 'head', L.neck + L.head],
  ['hip', 'kneeN', L.thigh],
  ['kneeN', 'footN', L.shin],
  ['hip', 'kneeF', L.thigh],
  ['kneeF', 'footF', L.shin],
  // the arms hang from the shoulder, a point on the torso (see shoulder())
  ['elbowN', 'handN', L.fore],
  ['elbowF', 'handF', L.fore],
];
const RADIUS = { head: 9, hip: 10, neck: 8, footN: 4, footF: 4, kneeN: 6, kneeF: 6, handN: 3, handF: 3, elbowN: 4, elbowF: 4 };

// Rig angle conventions (src/rigs/person.js): limbs are measured from
// straight down, the torso from straight up, positive towards where the
// figure faces; the head is relative to the torso.
const fromDown = (dx, dy, f) => Math.atan2(dx * f, dy);
const fromUp = (dx, dy, f) => Math.atan2(dx * f, -dy);

export class Ragdoll {
  // walker: the body; impulse: [vx, vy] world units/s added to every point
  // (more to the upper body: a blast or a flinch moves the chest first).
  constructor(walker, impulse = [0, 0], { muscle = 0, pinFeet = false } = {}) {
    this.w = walker;
    const r = walker.rig;
    r.local = null;
    r.solve();
    this.s = r.scale;
    this.f = r.f;
    this.muscle = muscle;
    this.pinFeet = pinFeet;
    this.p = {};
    this.q = {}; // previous positions
    const [hx, hy] = r.hip();
    const base = [walker.vx || 0, walker.vy || 0];
    for (const n of POINTS) {
      const [x, y] = n === 'hip' ? [hx, hy] : r.world(n);
      const up = n === 'hip' || n.startsWith('knee') || n.startsWith('foot') ? 0.55 : 1.15;
      const vx = base[0] + impulse[0] * up;
      const vy = base[1] + impulse[1] * up;
      this.p[n] = [x, y];
      this.q[n] = [x - vx * STEP, y - vy * STEP];
    }
    this.pins = pinFeet ? { footN: [...this.p.footN], footF: [...this.p.footF] } : null;
    this.target = null; // world positions the muscles pull towards
    this.t = 0;
    this.acc = 0;
    this.still = 0;
    this.extraPins = {};
  }

  // Hold a point where it is (a hand on a rail), or let go (null).
  pin(name, at) {
    if (at) this.extraPins[name] = [...at];
    else delete this.extraPins[name];
  }

  shoulder() {
    const h = this.p.hip;
    const n = this.p.neck;
    const k = (L.torso - 7) / L.torso;
    return [h[0] + (n[0] - h[0]) * k, h[1] + (n[1] - h[1]) * k];
  }

  update(dt) {
    this.t += dt;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    // settled: moving less than a little for a while
    let e = 0;
    for (const n of POINTS) e = Math.max(e, Math.hypot(this.p[n][0] - this.q[n][0], this.p[n][1] - this.q[n][1]));
    this.still = e < 0.6 ? this.still + dt : 0;
  }

  get settled() {
    return this.t > 0.7 && this.still > 0.35;
  }

  step(h) {
    const P = this.p;
    const Q = this.q;
    const level = this.w.level;
    // integrate
    for (const n of POINTS) {
      const p = P[n];
      const q = Q[n];
      const vx = (p[0] - q[0]) * 0.995;
      const vy = (p[1] - q[1]) * 0.995;
      q[0] = p[0];
      q[1] = p[1];
      p[0] += vx;
      p[1] += vy + GRAVITY * h * h;
    }
    const s = this.s;
    for (let it = 0; it < ITER; it++) {
      // bones
      for (const [a, b, len] of BONES) this.dist(P[a], P[b], len * s);
      // the arms from the shoulder
      const sh = this.shoulder();
      for (const e of ['elbowN', 'elbowF']) {
        const p = P[e];
        const dx = p[0] - sh[0];
        const dy = p[1] - sh[1];
        const d = Math.hypot(dx, dy) || 1;
        const k = (L.upper * s) / d;
        p[0] = sh[0] + dx * k;
        p[1] = sh[1] + dy * k;
      }
      this.limits();
      // muscle: a pull back towards the pose it was knocked out of
      if (this.muscle > 0 && this.target) {
        const m = this.muscle * 0.08;
        for (const n of POINTS) {
          const t = this.target[n];
          if (!t) continue;
          P[n][0] += (t[0] - P[n][0]) * m;
          P[n][1] += (t[1] - P[n][1]) * m;
        }
      }
      // pins
      if (this.pins) for (const n in this.pins) P[n] = [...this.pins[n]];
      for (const n in this.extraPins) P[n] = [...this.extraPins[n]];
      // the ground, and friction on it
      for (const n of POINTS) {
        const p = P[n];
        const r = (RADIUS[n] || 4) * s;
        const gy = level.groundAt(p[0], Q[n][1] - r - 4);
        if (p[1] > gy - r) {
          p[1] = gy - r;
          const q = Q[n];
          q[0] = p[0] - (p[0] - q[0]) * 0.55;
        }
      }
    }
  }

  dist(a, b, len) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1e-6;
    const k = ((d - len) / d) * 0.5;
    a[0] += dx * k;
    a[1] += dy * k;
    b[0] -= dx * k;
    b[1] -= dy * k;
  }

  // Keep a child point within an angle range about its joint, relative to
  // the parent bone's angle. Angles in the rig's convention (facing f).
  clampJoint(parentA, joint, child, lo, hi, len) {
    const f = this.f;
    const dx = child[0] - joint[0];
    const dy = child[1] - joint[1];
    const a = fromDown(dx, dy, f);
    let rel = a - parentA;
    while (rel > Math.PI) rel -= 2 * Math.PI;
    while (rel < -Math.PI) rel += 2 * Math.PI;
    if (rel >= lo && rel <= hi) return;
    const na = parentA + clamp(rel, lo, hi);
    const d = len ?? Math.hypot(dx, dy);
    child[0] = joint[0] + Math.sin(na) * d * f;
    child[1] = joint[1] + Math.cos(na) * d;
  }

  limits() {
    const P = this.p;
    const f = this.f;
    const torso = fromUp(P.neck[0] - P.hip[0], P.neck[1] - P.hip[1], f);
    // hips: flexion is torso lean plus thigh lift (thigh + torso in rig
    // angles), from a little behind the body to folded up at the chest
    for (const s of ['N', 'F']) {
      this.clampJoint(-torso, P.hip, P['knee' + s], -0.6, 2.5);
      // knees bend one way: the shin swings back from the thigh
      const th = fromDown(P['knee' + s][0] - P.hip[0], P['knee' + s][1] - P.hip[1], f);
      this.clampJoint(th, P['knee' + s], P['foot' + s], -2.5, 0.02);
    }
    // the head nods and tips, within reason
    this.clampJoint(torso + Math.PI, P.neck, P.head, -0.8, 0.8);
    // elbows bend one way: the forearm swings forward from the upper arm
    const sh = this.shoulder();
    for (const s of ['N', 'F']) {
      const ua = fromDown(P['elbow' + s][0] - sh[0], P['elbow' + s][1] - sh[1], f);
      this.clampJoint(ua, P['elbow' + s], P['hand' + s], -0.02, 2.5);
    }
  }

  // The rig's pose for where the points are now, and where its hip is.
  pose() {
    const P = this.p;
    const f = this.f;
    const sh = this.shoulder();
    const d = (a, b) => fromDown(b[0] - a[0], b[1] - a[1], f);
    const torso = fromUp(P.neck[0] - P.hip[0], P.neck[1] - P.hip[1], f);
    return {
      torso,
      head: fromUp(P.head[0] - P.neck[0], P.head[1] - P.neck[1], f) - torso,
      thighN: d(P.hip, P.kneeN),
      shinN: d(P.kneeN, P.footN),
      thighF: d(P.hip, P.kneeF),
      shinF: d(P.kneeF, P.footF),
      armN: d(sh, P.elbowN),
      foreN: d(P.elbowN, P.handN),
      armF: d(sh, P.elbowF),
      foreF: d(P.elbowF, P.handF),
    };
  }

  // Which way up it has come to rest: 'front' (face down) or 'back'.
  get lying() {
    const t = this.pose().torso;
    return t >= 0 ? 'front' : 'back';
  }
}

// ------------------------------------------------------------ the body --
// What lies under a blanket: never drawn, only felt through the cloth. A
// chain from head to feet, each point with the girth of that part of a
// body, heavy and dragging on the ground. The blanket is drawn over it
// (see drape()), so when it's pulled by the shoulders the weight comes after
// a moment late, the hips and legs trailing and settling.
const GIRTH = [9, 13, 12, 11, 9, 7, 6]; // head, shoulders, chest, hips, thighs, knees, feet
const SEG = [22, 26, 26, 30, 26, 24]; // between them (a body of about 1.55 m)

export class Shroud {
  // x: the head end; dir: +1 if the feet lie to the right of the head.
  constructor(level, x, y = 0, dir = 1) {
    this.level = level;
    this.p = [];
    this.q = [];
    let at = x;
    for (let i = 0; i < GIRTH.length; i++) {
      this.p.push([at, y - GIRTH[i]]);
      this.q.push([at, y - GIRTH[i]]);
      if (i < SEG.length) at += SEG[i] * dir;
    }
    this.hold = null; // where the shoulders are being pulled to
    this.acc = 0;
  }

  // Pull by the shoulders (point 1) towards [x, y], or let go (null).
  pull(at) {
    this.hold = at ? [...at] : null;
  }

  update(dt) {
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
  }

  step(h) {
    const P = this.p;
    const Q = this.q;
    for (let i = 0; i < P.length; i++) {
      const vx = (P[i][0] - Q[i][0]) * 0.97;
      const vy = (P[i][1] - Q[i][1]) * 0.97;
      Q[i][0] = P[i][0];
      Q[i][1] = P[i][1];
      P[i][0] += vx;
      P[i][1] += vy + GRAVITY * h * h;
    }
    for (let it = 0; it < ITER; it++) {
      if (this.hold) {
        // the pull: firm on the shoulders, the head coming with them
        const s = P[1];
        s[0] += (this.hold[0] - s[0]) * 0.5;
        s[1] += (this.hold[1] - s[1]) * 0.5;
      }
      for (let i = 0; i < SEG.length; i++) this.link(P[i], P[i + 1], SEG[i], 1);
      // a body doesn't fold like a rope: resist bending
      for (let i = 0; i + 2 < P.length; i++) this.link(P[i], P[i + 2], SEG[i] + SEG[i + 1], 0.08);
      for (let i = 0; i < P.length; i++) {
        const gy = this.level.groundAt(P[i][0], Q[i][1] - GIRTH[i] - 4) - GIRTH[i];
        if (P[i][1] > gy) {
          P[i][1] = gy;
          // heavy on the ground: most of the slide is lost to friction
          Q[i][0] = P[i][0] - (P[i][0] - Q[i][0]) * 0.35;
        }
      }
    }
  }

  link(a, b, len, k) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1e-6;
    const m = ((d - len) / d) * 0.5 * k;
    a[0] += dx * m;
    a[1] += dy * m;
    b[0] -= dx * m;
    b[1] -= dy * m;
  }

  // The blanket's outline over the body: its top edge follows the girth of
  // each part, and it falls to the ground a little past the head and feet.
  drape(c) {
    const P = this.p;
    const n = P.length;
    const top = P.map((p, i) => [p[0], p[1] - GIRTH[i] + 2]);
    const dir = Math.sign(P[n - 1][0] - P[0][0]) || 1;
    const gy0 = this.level.groundAt(P[0][0], P[0][1]);
    const gy1 = this.level.groundAt(P[n - 1][0], P[n - 1][1]);
    c.moveTo(P[0][0] - dir * 16, gy0 + 1);
    c.quadraticCurveTo(top[0][0] - dir * 8, top[0][1] + 2, top[0][0], top[0][1]);
    for (let i = 1; i < n; i++) {
      const mx = (top[i - 1][0] + top[i][0]) / 2;
      const my = (top[i - 1][1] + top[i][1]) / 2;
      c.quadraticCurveTo(top[i - 1][0], top[i - 1][1], mx, my);
    }
    c.quadraticCurveTo(top[n - 1][0], top[n - 1][1], top[n - 1][0] + dir * 10, top[n - 1][1] + 4);
    c.quadraticCurveTo(P[n - 1][0] + dir * 16, gy1 - 2, P[n - 1][0] + dir * 14, gy1 + 1);
    c.closePath();
  }
}
