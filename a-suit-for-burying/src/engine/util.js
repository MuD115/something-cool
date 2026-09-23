// Small maths and animation helpers shared by the whole engine.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  back: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

// Keyframes: [[time, value], ...] with optional easing per segment
// ([time, value, 'out']). Values may be numbers or flat objects of numbers.
export function key(t, frames, defaultEase = 'inOut') {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      const k = ease[e || defaultEase]((t - t0) / (t1 - t0));
      return mix(v0, v1, k);
    }
  }
  return frames[frames.length - 1][1];
}

export function mix(a, b, k) {
  if (typeof a === 'number') return a + (b - a) * k;
  const out = {};
  for (const n in a) out[n] = typeof a[n] === 'number' && typeof b[n] === 'number' ? a[n] + (b[n] - a[n]) * k : k < 0.5 ? a[n] : b[n];
  for (const n in b) if (!(n in out)) out[n] = b[n];
  return out;
}

// Deterministic PRNG so procedural sets look the same on every visit.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash1 = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
// Smooth 1D value noise in [-1, 1].
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash1(i) * (1 - u) + hash1(i + 1) * u) * 2 - 1;
}

// Colour helpers: 'rgb(…)' strings from arrays, and mixing.
export const rgb = (c, a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Two-bone inverse kinematics. Returns the middle joint for a limb rooted at
// (rx, ry) reaching toward (tx, ty); bend = +1 or −1 picks the elbow side.
export function ik2(rx, ry, tx, ty, a, b, bend) {
  let dx = tx - rx;
  let dy = ty - ry;
  let d = Math.hypot(dx, dy);
  const max = (a + b) * 0.999;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  d = Math.max(d, Math.abs(a - b) + 0.01);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const ang = Math.atan2(dy, dx) + bend * Math.acos(clamp(cosA, -1, 1));
  return { jx: rx + Math.cos(ang) * a, jy: ry + Math.sin(ang) * a, ex: rx + dx, ey: ry + dy };
}
