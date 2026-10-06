// Small, continuous motion for the sets: so the street never stands still.
// Everything here is cheap (a handful of draw calls, no allocation of canvases)
// and quiet: periods of 2-8 s, amplitudes of a few units.
//
// `t` is the game's clock. Layering follows the sets: R.cast for things that
// take light and shadow, R.paint for flat shapes, R.glow for light.

const TAU = Math.PI * 2;
const fract = (v) => v - Math.floor(v);

// A wind that is mostly a breath and now and then a gust. -1 … 1, mostly small.
export function wind(t, ph = 0) {
  const g = Math.max(0, Math.sin(t * 0.21 + 1.3)) * Math.max(0, Math.sin(t * 0.53 + 0.4)); // a gust, rarely
  return (0.55 * Math.sin(t * 0.9 + ph) + 0.3 * Math.sin(t * 1.7 + ph * 2.1) + 0.9 * g * Math.sin(t * 2.6 + ph)) * 0.8;
}

// Rotate the canvas about (px, py) by a sway of `amp` radians: trees, vines.
export function lean(c, px, py, t, ph = 0, amp = 0.02) {
  c.translate(px, py);
  c.rotate(wind(t, ph) * amp);
  c.translate(-px, -py);
}

// A hanging cloth (a sheet, a shirt, a curtain, a flag): fixed along its top
// edge, its foot rippling; the ripple travels down it. (x, y) is the top left.
export function cloth(c, x, y, w, h, col, t, ph = 0, { amp = 3, sag = 3, folds = 0.1, period = 2.4 } = {}) {
  const wv = wind(t, ph);
  const off = (v) => Math.sin(t * (TAU / period) - v * 2.2 + ph) * amp * v * v + wv * amp * 1.4 * v;
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w + off(0.5), y + h * 0.5);
  c.lineTo(x + w + off(1), y + h);
  c.quadraticCurveTo(x + w / 2 + off(1) + off(0.9) * 0.2, y + h + sag, x + off(1), y + h);
  c.lineTo(x + off(0.5), y + h * 0.5);
  c.closePath();
  c.fill();
  if (folds) {
    c.fillStyle = `rgba(0,0,0,${folds})`;
    for (let i = 1; i < 4; i++) c.fillRect(x + (w * i) / 4 + off(0.6) * 0.5, y + 3, 1.4, h - 5);
  }
}

// A flag or a pennant on its pole end: base at (x, y), streaming to the right.
export function flag(c, x, y, w, h, col, t, ph = 0) {
  const wv = 0.5 + 0.5 * wind(t, ph);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    c.lineTo(x + w * u, y + Math.sin(t * 5 - u * 4 + ph) * h * 0.22 * u * (0.6 + wv) + u * h * 0.1);
  }
  for (let i = n; i >= 1; i--) {
    const u = i / n;
    c.lineTo(x + w * u, y + h + Math.sin(t * 5 - u * 4 + ph) * h * 0.22 * u * (0.6 + wv) + u * h * 0.1);
  }
  c.lineTo(x, y + h);
  c.closePath();
  c.fill();
}

// A rope, wire or cable that bobs very slightly: quadratic from a to b with
// its sag breathing. Returns nothing; the caller sets the stroke style.
export function wire(c, ax, ay, bx, by, sag, t, ph = 0, amp = 1.6) {
  const s = sag + Math.sin(t * 1.3 + ph) * amp + wind(t, ph) * amp;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + s, bx, by);
  c.stroke();
}

// Smoke from a chimney or a stove pipe: a column of soft puffs drifting up and
// leaning with the wind. warm = 0 (thin grey, daytime) … 1 (evening, warmer).
export function smoke(R, x, y, t, { warm = 0, h = 150, w = 16, alpha = 0.3, seed = 0 } = {}) {
  R.paint((c) => {
    const lean = wind(t, seed) * 22 + 10;
    for (let i = 0; i < 14; i++) {
      const u = fract(t / 8 + i / 14 + seed * 0.37); // age 0…1
      const px = x + lean * u * u * 2 + Math.sin(t * 0.8 + i * 1.9 + seed) * 5 * u;
      const py = y - h * u;
      const r = 3 + w * 1.15 * u;
      const a = alpha * 0.55 * Math.sin(Math.min(1, u * 1.2) * Math.PI) * (1 - u * 0.35);
      c.fillStyle = warm > 0 ? `rgba(${Math.round(150 + 60 * warm)},${Math.round(144 + 22 * warm)},${Math.round(140 - 20 * warm)},${a})` : `rgba(150,148,146,${a})`;
      c.beginPath();
      c.arc(px, py, r, 0, TAU);
      c.fill();
    }
  });
}

const flapAt = (t, i) => Math.sin(t * 17 + i * 2.1);

// A pigeon in flight, seen side-on, centred on (x, y), flying to the right (d = 1) or left.
function flyingBird(c, x, y, s, d, t, i) {
  const f = flapAt(t, i);
  c.beginPath();
  c.moveTo(x - 7 * s * d, y);
  c.quadraticCurveTo(x - 2 * s * d, y - 6 * s * f - 2 * s, x + 1 * s * d, y - 1 * s);
  c.quadraticCurveTo(x + 4 * s * d, y - 6 * s * f - 2 * s, x + 9 * s * d, y);
  c.lineTo(x + 3 * s * d, y + 2 * s);
  c.lineTo(x - 3 * s * d, y + 2 * s);
  c.closePath();
  c.fill();
}

// Pigeons crossing the sky now and then: a small flock every `every` seconds,
// taking `dur` to cross the view. Drawn on a far layer so they feel high.
export function flock(R, camX, t, { y = -330, n = 4, every = 53, dur = 11, seed = 0, color = 'rgba(52,48,50,0.75)', layer = 0.55, dir = 1 } = {}) {
  const u = ((t + seed * 17) % every) / dur;
  if (u > 1) return;
  R.layer(layer);
  R.paint((c) => {
    c.fillStyle = color;
    const x0 = camX * layer - 900;
    for (let i = 0; i < n; i++) {
      const x = dir > 0 ? x0 + u * 1800 + i * 26 - Math.abs(i - n / 2) * 6 : x0 + 1800 - u * 1800 + i * 26;
      const yy = y - u * 40 + Math.sin(t * 1.1 + i) * 8 + (i % 2) * 14;
      flyingBird(c, x, yy, 1, dir, t, i);
    }
  });
  R.layer(1);
}

// A pigeon sitting on a parapet or a wire: now and then it hops, turns or pecks.
export function perch(R, x, y, t, seed = 0, { s = 1.6, color = '#4a4640' } = {}) {
  R.cast((c) => {
    const u = ((t + seed * 3.3) % 9) / 9;
    const hop = u > 0.62 && u < 0.69 ? Math.sin(((u - 0.62) / 0.07) * Math.PI) * 6 * s : 0;
    const peck = u > 0.2 && u < 0.3 ? Math.sin(((u - 0.2) / 0.1) * Math.PI) * 0.7 : 0;
    const face = ((t + seed) % 21 > 13 ? -1 : 1);
    c.save();
    c.translate(x, y - hop);
    c.scale(face, 1);
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(0, -5 * s, 6 * s, 4.2 * s, -0.2, 0, TAU); // body
    c.fill();
    c.beginPath();
    c.moveTo(-5 * s, -5 * s);
    c.lineTo(-11 * s, -3 * s); // the tail
    c.lineTo(-5 * s, -2 * s);
    c.fill();
    c.save();
    c.translate(5 * s, -8 * s);
    c.rotate(peck);
    c.beginPath();
    c.arc(2 * s, -1 * s, 2.4 * s, 0, TAU); // the head
    c.fill();
    c.fillStyle = '#d8b878';
    c.fillRect(4 * s, -1.6 * s, 2.4 * s, 1.2 * s);
    c.restore();
    c.strokeStyle = '#3a2a28';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-1 * s, -1 * s);
    c.lineTo(-1 * s, 0);
    c.moveTo(2 * s, -1 * s);
    c.lineTo(2 * s, 0);
    c.stroke();
    c.restore();
  });
}

// A drip from a pipe's mouth at (x, y): a bead swells, falls, and splashes a
// dark spot on `ground`. Period about 2.2 s.
export function drip(R, x, y, ground, t, seed = 0) {
  const per = 2.2 + (seed % 3) * 0.3;
  const u = ((t + seed * 1.7) % per) / per;
  R.cast((c) => {
    c.fillStyle = 'rgba(110,130,150,0.8)';
    if (u < 0.55) {
      c.beginPath();
      c.ellipse(x, y + 1 + u * 3, 1.2 + u * 1.6, 1.6 + u * 2.4, 0, 0, TAU);
      c.fill();
    } else {
      const v = (u - 0.55) / 0.45;
      const fy = y + 3 + (ground - y - 3) * v * v;
      if (v < 0.97) {
        c.beginPath();
        c.ellipse(x, fy, 1.1, 2.4, 0, 0, TAU);
        c.fill();
      }
    }
  });
  if (u > 0.97 || u < 0.12) {
    R.paint((c) => {
      const k = u > 0.5 ? 0 : u / 0.12;
      c.fillStyle = `rgba(40,34,30,${0.35 * (1 - k)})`;
      c.beginPath();
      c.ellipse(x, ground, 3 + k * 7, 1 + k * 1.4, 0, 0, TAU);
      c.fill();
    });
  }
}

// A plastic bag tumbling down the street on the draught, every so often.
export function bag(R, camX, t, { every = 47, dur = 15, seed = 0, y = 0 } = {}) {
  const u = ((t + seed * 9) % every) / dur;
  if (u > 1) return;
  const x = camX - 700 + u * 1400;
  const hop = Math.abs(Math.sin(t * 3.3 + seed)) * 26 * (0.4 + 0.6 * Math.sin(u * Math.PI));
  const by = y - 12 - hop;
  R.paint((c) => {
    c.save();
    c.translate(x, by);
    c.rotate(t * 4.2 + seed);
    const sq = 0.7 + 0.3 * Math.sin(t * 9);
    c.scale(1, sq);
    c.fillStyle = 'rgba(232,230,222,0.78)';
    c.beginPath();
    c.moveTo(-7, -2);
    c.quadraticCurveTo(-2, -9, 6, -5);
    c.quadraticCurveTo(10, 0, 4, 6);
    c.quadraticCurveTo(-4, 8, -7, -2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-2, -4, 3, 4);
    c.restore();
  });
}

// A few warm drifting motes in a patch of sun (a doorway, a shaft): x0…x1,
// from y0 up to y1. Brief and soft.
export function sunMotes(R, x0, x1, y0, y1, t, { n = 12, seed = 0, color = '255,230,180' } = {}) {
  R.glow((c) => {
    for (let i = 0; i < n; i++) {
      const a = fract(Math.sin((i + 1) * 91.7 + seed * 13.1) * 437.5);
      const b = fract(Math.sin((i + 1) * 31.3 + seed * 7.7) * 937.1);
      const x = x0 + (x1 - x0) * fract(a + t * (0.004 + a * 0.006)) + Math.sin(t * 0.6 + i * 2) * 6;
      const y = y0 + (y1 - y0) * b + Math.sin(t * 0.45 + i * 1.3) * 9;
      c.fillStyle = `rgba(${color},${0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.7))})`;
      c.fillRect(x, y, 1.8, 1.8);
    }
  });
}

// A cat's tail, curling and uncurling from (x, y) (the base), facing d.
export function tail(c, x, y, t, d = 1, ph = 0, len = 20) {
  c.strokeStyle = '#2a2420';
  c.lineWidth = 3;
  c.lineCap = 'round';
  const k = Math.sin(t * 1.6 + ph);
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x - d * len * 0.6, y - 2 + k * 4, x - d * len * 0.8, y - len * 0.6 + k * 6);
  c.stroke();
}

// A strand of leaf-clusters swaying as if in a breeze: for vines, a bush.
// (cx, cy) the pivot; leaves are given as [dx, dy, r] relative to it.
export function leaves(c, cx, cy, list, cols, t, ph = 0, amp = 0.05) {
  c.save();
  lean(c, cx, cy, t, ph, amp);
  list.forEach(([dx, dy, r], i) => {
    const sway = Math.sin(t * 1.8 + i * 1.3 + ph) * 1.2;
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.ellipse(cx + dx + sway, cy + dy, r, r * 0.8, i, 0, TAU);
    c.fill();
  });
  c.restore();
}
