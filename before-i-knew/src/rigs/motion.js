// Motion-captured movement for the rig (see tools/mocap.mjs and
// src/rigs/mocap-data.js). A clip is a run of poses: a loop holds one
// stride and is played by distance travelled, so the feet keep pace with
// the ground; a one-shot plays by time.

import { CLIPS, KEYS } from './mocap-data.js';

const TAU = Math.PI * 2;

// Leg length of the rig (thigh + shin, src/rigs/person.js), for turning a
// clip's stride (in leg lengths) into world units.
export const LEG = 81;

class Clip {
  constructor(name, c) {
    this.name = name;
    this.loop = c.loop;
    this.n = c.n;
    this.period = c.period || 1;
    this.stride = c.stride || 1;
    this.rate = c.rate || 30;
    this.duration = this.loop ? this.period : (c.n - 1) / this.rate;
    this.src = c.src;
    const w = KEYS.length + 1;
    this.frames = [];
    for (let i = 0; i < c.n; i++) {
      const f = {};
      KEYS.forEach((k, j) => (f[k] = c.data[i * w + j] / 1000));
      f.hipY = c.data[i * w + KEYS.length] / 1000;
      this.frames.push(f);
    }
  }

  // The resting line of the legs and arms over the clip, which a longer or
  // shorter stride swings about.
  get mean() {
    if (!this._mean) {
      let th = 0;
      let ar = 0;
      for (const f of this.frames) {
        th += f.thighN + f.thighF;
        ar += f.armN + f.armF;
      }
      this._mean = { thigh: th / (2 * this.n), arm: ar / (2 * this.n) };
    }
    return this._mean;
  }

  // Pose at a fraction u of the clip (0…1; loops wrap).
  at(u) {
    const n = this.n;
    let x = this.loop ? (((u % 1) + 1) % 1) * n : Math.min(1, Math.max(0, u)) * (n - 1);
    const i = Math.floor(x);
    const k = x - i;
    const a = this.frames[i % n];
    const b = this.frames[this.loop ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const o = {};
    for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k;
    return o;
  }

  // Pose t seconds into a one-shot.
  time(t) {
    return this.at(t / this.duration);
  }

  // How far through a stride per world unit walked, at a given rig scale.
  perUnit(scale = 1) {
    return 1 / (this.stride * LEG * scale);
  }
}

export const MOTION = {};
for (const name of Object.keys(CLIPS)) MOTION[name] = new Clip(name, CLIPS[name]);

// A longer (k > 1) or shorter stride from the same clip: the thighs and
// arms swing further about their resting line, knees and elbows keep their
// bend. The stride length scales by about k.
export function amplify(clip, pose, k) {
  if (k === 1) return pose;
  const m = clip.mean;
  const o = { ...pose };
  for (const s of ['N', 'F']) {
    const th = m.thigh + (pose['thigh' + s] - m.thigh) * k;
    o['shin' + s] = th + (pose['shin' + s] - pose['thigh' + s]);
    o['thigh' + s] = th;
    const ar = m.arm + (pose['arm' + s] - m.arm) * Math.min(k, 1.2);
    o['fore' + s] = ar + (pose['fore' + s] - pose['arm' + s]);
    o['arm' + s] = ar;
  }
  return o;
}

// Where the data came from, for the credits.
export const MOTION_SOURCES = Object.values(MOTION).map((c) => c.src);

// Blend two poses key by key (angles are already continuous).
export function mixPose(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = { ...a };
  for (const key of KEYS) if (b[key] !== undefined && a[key] !== undefined) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

export { TAU };
