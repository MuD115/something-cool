// Act 4, the quiet endings' places.
//
//   Ending 2, The Last Farewell:
//     drawNomans    the exposed street at the grey hour, 4:20: the corner where
//                   Sami waits, the body under its white sheet, the checkpoint
//     drawCemetery  the small cemetery in the grape arbours, 5:15, the new grave
//   Ending 3, The Tunnel:
//     drawTunnel    the building's ground floor, the steps down, the mouth with
//                   the scratched words, and the tunnel going on into the dark
//
// People are not drawn here: the story spawns the rigs. World units: ground at
// y = 0 (the tunnel's floor too), up is negative, one unit about a centimetre,
// a man 170 tall. Everything solid is given thickness drawn behind its face,
// in the game's one oblique direction (depth.js).

import { rng, lerp, clamp, mixc } from '../engine/util.js';
import * as T from './town.js';
import { horizon } from './horizon.js';
import { extrudePoly, extrudeRect, DEPTH } from './depth.js';
import { sandbags, concreteBlocks } from '../story/act2r-set.js';
import { END, NOMANS, TUNNEL } from '../story/act4-map.js';

// ----------------------------------------------------------------- helpers --

const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hexRgb = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));
const rgbHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, k) => rgbHex(mixc(hexRgb(a), hexRgb(b), k));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const halfView = (R) => (R.cam.view || 1400) / 2;
// is [x0, x1] near enough the camera to be worth painting?
const seen = (R, x0, x1, pad = 500) => x1 > R.cam.x - halfView(R) - pad && x0 < R.cam.x + halfView(R) + pad;

// Run fn with the camera moved so that world x = `origin` sits at x = 0:
// the far layers (the horizon, skylines) are baked for a camera near zero.
function farShift(R, origin, fn) {
  const cx = R.cam.x;
  R.cam.x = cx - origin;
  try {
    fn();
  } finally {
    R.cam.x = cx;
    R.layer(1);
  }
}

// Visit the cells of a layer at `depth` that the camera can see: fn(i, x, r)
// with x the cell's left edge in that layer's coordinates and r a generator
// seeded by the cell alone, so what is drawn never depends on the camera.
function cells(R, depth, step, seed, fn, pad = 120) {
  const mid = R.cam.x * depth;
  const half = halfView(R) + pad;
  const i0 = Math.floor((mid - half) / step);
  const i1 = Math.ceil((mid + half) / step);
  for (let i = i0; i <= i1; i++) fn(i, i * step, rng((i * 7919 + seed * 104729) >>> 0));
}

// A Catmull-Rom curve through points, sampled `n` times a span.
function curve(pts, n = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < n; s++) {
      const u = s / n;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const poly = (c, pts) => {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
};

// A rough stone: an irregular, rounded lump sitting on the ground at (x, 0).
function stonePts(x, y, w, h, seed) {
  const r = rng(seed);
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const j = 0.88 + r() * 0.2;
    pts.push([x - Math.cos(a) * (w / 2) * j, y - Math.sin(a) * h * j]);
  }
  return pts;
}

function stone(c, x, y, w, h, color, seed) {
  const pts = stonePts(x, y, w, h, seed);
  extrudePoly(c, pts, Math.max(6, w * 0.5), { color });
  c.fillStyle = color;
  poly(c, pts);
  c.fill();
  // a lit top, a shaded foot
  const g = c.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  c.fillStyle = g;
  poly(c, pts);
  c.fill();
}

// ========================================================== the white sheet ==

// The profile of a person lying on their back under a sheet, head to the
// left, as points [x, height], x from -92 to 100.
const SHEET = [
  [-96, 0], [-92, 5], [-85, 15], [-76, 21.5], [-66, 23], [-56, 20], [-49, 14.5], [-41, 15.5], [-32, 19.5], [-18, 23], [0, 22.5],
  [18, 20.5], [36, 20], [52, 20.5], [64, 19], [74, 17.5], [82, 14], [88, 16.5], [94, 15], [99, 8], [102, 0],
];

function sheetOutline(sx = 1, sy = 1) {
  const pts = curve(SHEET, 5).map(([x, h]) => [x * sx, -Math.max(0, h) * sy]);
  return pts;
}

// The sheet on whatever lies under it, drawn at (x, y) with y the ground (or
// the door's face). `grey` darkens it slightly (in a grave).
function paintSheet(c, x, y, { sx = 1, sy = 1, depth = 24, tone = 1 } = {}) {
  c.save();
  c.translate(x, y);
  const pts = sheetOutline(sx, sy);
  const base = rgbHex([236 * tone, 233 * tone, 224 * tone]);
  extrudePoly(c, pts, depth, { color: base, topK: 1.06, sideK: 0.72 });
  c.fillStyle = base;
  poly(c, pts);
  c.fill();
  c.save();
  poly(c, pts);
  c.clip();
  // the cloth lies pale on top and falls into shade where it drops to the ground
  const g = c.createLinearGradient(0, -26 * sy, 0, 0);
  g.addColorStop(0, `rgba(255,255,250,${0.5 * tone})`);
  g.addColorStop(0.5, 'rgba(255,255,250,0)');
  g.addColorStop(1, 'rgba(110,108,100,0.32)');
  c.fillStyle = g;
  c.fillRect(-100 * sx, -30 * sy, 210 * sx, 32 * sy);
  // folds: where it gathers at the neck, the hips, the knees and the feet
  c.strokeStyle = 'rgba(120,115,105,0.42)';
  c.lineWidth = 1.2;
  c.lineCap = 'round';
  for (const [fx, a, b] of [[-49, 15, 0], [-38, 17, 2], [-4, 20, 3], [22, 18, 1], [48, 19, 2], [62, 17, 0], [80, 13, 1], [-72, 18, 4]]) {
    c.beginPath();
    c.moveTo(fx * sx, -a * sy);
    c.quadraticCurveTo((fx + 4) * sx, -(a * 0.5 + b) * sy, (fx - 2) * sx, -1);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,250,0.55)';
  c.lineWidth = 1.4;
  c.beginPath();
  for (const [fx, h] of SHEET.slice(2, -2)) c.lineTo(fx * sx, -(h - 2.2) * sy);
  c.stroke();
  c.restore();
  // the hem, gathered a little where it touches the ground
  c.strokeStyle = 'rgba(100,96,88,0.35)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-96 * sx, -0.5);
  c.lineTo(102 * sx, -0.5);
  c.stroke();
  c.restore();
}

// A corner stone holding the sheet down.
function holdStone(c, x, y, s = 1, seed = 1) {
  stone(c, x, y, 17 * s, 9.5 * s, '#8c8981', seed);
}

// The body under its white sheet, at x (the sheet's centre) on the ground.
// lifted 1: gone (the story carries it on the door); the stones stay behind,
// the cloth's outline darker on the tarmac.
export function drawBody(R, x, { lifted = 0 } = {}) {
  if (!seen(R, x - 140, x + 140)) return;
  if (lifted >= 1) {
    // only the four stones, where the corners were, and a paler place on the road
    R.paint((c) => {
      c.fillStyle = 'rgba(210,205,190,0.12)';
      c.beginPath();
      c.ellipse(x, 14, 104, 7, 0, 0, Math.PI * 2);
      c.fill();
    });
    R.cast((c) => {
      for (const [dx, dy, s, sd] of [[-101, 0, 1, 3], [105, 0, 1, 4], [-83, -9, 0.82, 5], [88, -9, 0.82, 6]]) holdStone(c, x + dx, dy, s, sd);
    });
    return;
  }
  const lift = clamp(lifted);
  const draw = (c) => {
    paintSheet(c, x, -lift * 20, { depth: 26 });
  };
  R.cast(draw);
  R.surface(
    (c) => {
      c.save();
      c.translate(x, -lift * 20);
      const pts = sheetOutline();
      c.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
      c.closePath();
      c.restore();
    },
    'cloth',
    { scale: 0.55, seed: 4, alpha: 0.5 },
  );
  // the cloth is the brightest thing in the grey: a little light of its own
  R.glow((c) => {
    c.save();
    c.translate(x, -lift * 20);
    const g = c.createLinearGradient(0, -26, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0.02)');
    c.fillStyle = g;
    const pts = sheetOutline();
    poly(c, pts);
    c.fill();
    c.restore();
  });
  // weighted with stones at its corners: the near two on the ground, the far two behind
  R.cast((c) => {
    for (const [dx, dy, s, sd] of [[-101, 0, 1, 3], [105, 0, 1, 4], [-83, -9, 0.82, 5], [88, -9, 0.82, 6]]) holdStone(c, x + dx, dy - lift * 20, s, sd);
  });
}

// A pair of leather shoes, side by side, centred on x.
export function drawShoes(R, x) {
  if (!seen(R, x - 60, x + 60)) return;
  const shoe = (c, ox, oy, k) => {
    c.save();
    c.translate(ox - 15, oy);
    c.scale(1.02, 1.02);
    const up = [[0, 0], [0, -9], [2, -13], [6.5, -13.5], [9.5, -11], [14, -10.5], [19, -9], [24.5, -6.5], [29, -4.2], [31.5, -2], [31.5, 0]];
    const col = mixHex('#5a3822', '#7a5030', k);
    extrudePoly(c, up, 9, { color: col, topK: 1.3, sideK: 0.5 });
    c.fillStyle = col;
    poly(c, up);
    c.fill();
    // the opening, dark; the leather's sheen along the vamp and toe cap
    c.fillStyle = '#1d140e';
    c.beginPath();
    c.moveTo(2, -13);
    c.quadraticCurveTo(6, -9, 9.5, -11);
    c.lineTo(6.5, -13.5);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,225,190,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(11, -9.2);
    c.quadraticCurveTo(22, -7.5, 29.5, -3.4);
    c.stroke();
    // laces
    c.strokeStyle = 'rgba(220,210,190,0.7)';
    c.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(11 + i * 3.1, -10.1 + i * 0.8);
      c.lineTo(12.4 + i * 3.1, -8.1 + i * 0.8);
      c.stroke();
    }
    // sole and heel
    c.fillStyle = '#251a13';
    c.fillRect(0, -2.4, 31.5, 2.4);
    c.fillRect(0, -4.6, 8.5, 4.6);
    c.restore();
  };
  R.cast((c) => {
    shoe(c, x + 7, -6.5, 0.4); // the far one, a little behind
    shoe(c, x, 0, 0.6);
  });
}

// ============================================================== the stretcher ==

// An improvised stretcher: a wooden door from a damaged building, two rope
// handles tied through the hinge holes. (x, y) is the middle of the door's
// near, lower edge; the oblique depth shows the door's face. With body, the
// white-wrapped shape lies on it.
export function drawStretcher(c, x, y, { body = false } = {}) {
  const L = 100; // half-length
  const Dp = 74; // the door's width, drawn along the depth direction
  const th = 5;
  c.save();
  c.translate(x, y);
  const vx = DEPTH.x * Dp;
  const vy = DEPTH.y * Dp;
  // the thin edge and the long face, with the hinge side nearest
  c.fillStyle = '#4a3624';
  c.fillRect(-L, 0, L * 2, th);
  c.fillStyle = '#5e4630';
  c.beginPath();
  c.moveTo(-L, 0);
  c.lineTo(L, 0);
  c.lineTo(L + vx, vy);
  c.lineTo(-L + vx, vy);
  c.closePath();
  c.fill();
  // the end grain on the right
  c.fillStyle = '#3f2e1f';
  c.beginPath();
  c.moveTo(L, 0);
  c.lineTo(L + vx, vy);
  c.lineTo(L + vx, vy + th);
  c.lineTo(L, th);
  c.closePath();
  c.fill();
  // the face: weathered paint over timber, a panelled door
  const face = c.createLinearGradient(-L, 0, L + vx, vy);
  face.addColorStop(0, '#8a6a46');
  face.addColorStop(1, '#9a7a52');
  c.fillStyle = face;
  c.beginPath();
  c.moveTo(-L, 0);
  c.lineTo(L, 0);
  c.lineTo(L + vx, vy);
  c.lineTo(-L + vx, vy);
  c.closePath();
  c.fill();
  c.save();
  c.clip();
  // grain along the length
  const r = rng(61);
  for (let i = 0; i < 26; i++) {
    const k = r();
    c.strokeStyle = r() < 0.5 ? 'rgba(60,40,24,0.28)' : 'rgba(210,180,140,0.16)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-L + k * vx, k * vy);
    c.lineTo(-L + k * vx + 30 + r() * 150, k * vy);
    c.stroke();
  }
  // two long recessed panels
  for (const [a, b] of [[0.16, 0.46], [0.54, 0.84]]) {
    c.fillStyle = 'rgba(55,36,20,0.28)';
    c.beginPath();
    for (const [p, q] of [[a, 0.12], [b, 0.12], [b, 0.88], [a, 0.88]]) {
      const px = -L * (1 - 2 * p) + q * vx;
      c.lineTo(px, q * vy);
    }
    c.closePath();
    c.fill();
  }
  // the lock plate and a flake of old paint
  c.fillStyle = 'rgba(30,26,22,0.6)';
  c.beginPath();
  c.ellipse(L - 30 + vx * 0.4, vy * 0.4, 5, 2, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(70,98,92,0.5)';
  for (let i = 0; i < 6; i++) c.fillRect(-L + r() * L * 1.6 + vx * 0.5, vy * (0.2 + r() * 0.6), 6 + r() * 14, 1.5);
  c.restore();
  // the hinge holes along the near edge, and the rope handles through two of them
  const holes = [-82, -4, 76];
  c.fillStyle = '#1a120c';
  for (const hx of holes) {
    c.beginPath();
    c.ellipse(hx, 2.4, 3.2, 1.8, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#b8a47e';
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  for (const [hx, dir] of [[-82, -1], [76, 1]]) {
    c.beginPath();
    c.moveTo(hx, 2.4);
    c.bezierCurveTo(hx + dir * 4, 30, hx + dir * 34, 36, hx + dir * 36, 10);
    c.bezierCurveTo(hx + dir * 36, 2, hx + dir * 30, -1, hx + dir * 22, 0);
    c.stroke();
    c.strokeStyle = '#8c7a58';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(hx, 2.4);
    c.bezierCurveTo(hx + dir * 4, 29, hx + dir * 33, 35, hx + dir * 35, 10);
    c.stroke();
    c.strokeStyle = '#b8a47e';
    c.lineWidth = 2.6;
    // the knot
    c.fillStyle = '#a89468';
    c.beginPath();
    c.arc(hx + dir * 2, 5, 3.2, 0, Math.PI * 2);
    c.fill();
  }
  if (body) paintSheet(c, vx * 0.5, vy * 0.5 - 1, { sx: 0.93, sy: 0.9, depth: 22 });
  c.restore();
}

// ============================================================ the grey hour ==

// k 0 -> 1: the grey hour into the first warmth.
const greyStops = (k) => [
  [0, rgbHex(mixc([168, 178, 192], [176, 190, 206], k))],
  [0.5, rgbHex(mixc([214, 218, 222], [236, 222, 208], k))],
  [0.85, rgbHex(mixc([232, 232, 228], [250, 232, 206], k))],
];

export function nomansLook(g, k = 0) {
  const lights = [
    // the sky is the light: a broad, faint wash from overhead
    { uv: [0.5, -1.6], color: [0.72, 0.78, 0.9], intensity: 0.2 + 0.1 * k, radius: 0, rim: 0.28 },
    // the first warmth, low in the east (to the left): nothing yet, then a breath of rose
    { uv: [-0.5, 0.42], color: [1.0, 0.78, 0.62], intensity: 0.34 * k * k, radius: 0, rim: 0.7 * k },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: [lerp(0.55, 0.6, k), lerp(0.58, 0.59, k), lerp(0.66, 0.62, k)],
    lights,
    groundShadow: 0.04 + 0.34 * k,
    bloom: 0.55,
    exposure: 1.06,
    grain: 0.05,
    relief: 0.5,
    contact: 0.45,
    grade: {
      sat: lerp(0.5, 0.74, k),
      contrast: lerp(0.9, 0.98, k),
      lift: 0.03,
      tint: [lerp(0.98, 1.0, k), 1.0, lerp(1.03, 0.97, k)],
      shadows: [0.95, 0.98, 1.06],
      highs: [lerp(1.0, 1.05, k), 1.0, lerp(1.02, 0.94, k)],
    },
    // a pale breath lying along the street: low and cool
    fog: { density: lerp(0.38, 0.22, k), height: 150, color: mixc([0.7, 0.73, 0.78], [0.8, 0.74, 0.7], k) },
    fade: g.a?.endFade || 0,
  };
}

// the regime flag: red, white, black, with two green stars; hanging limp
function flag(c, x, y, w, h, t) {
  const stripe = (i) => {
    const top = [];
    const bot = [];
    for (let s = 0; s <= 10; s++) {
      const u = s / 10;
      const rip = Math.sin(t * 0.9 + u * 3.6) * 3.2 * u + Math.sin(t * 1.7 + u * 7) * 0.8 * u;
      top.push([x + u * w, y + (h / 3) * i + rip]);
      bot.push([x + u * w, y + (h / 3) * (i + 1) + rip]);
    }
    return [...top, ...bot.reverse()];
  };
  c.fillStyle = '#9b2a2a';
  poly(c, stripe(0));
  c.fill();
  c.fillStyle = '#ebe7de';
  poly(c, stripe(1));
  c.fill();
  c.fillStyle = '#1c1c1c';
  poly(c, stripe(2));
  c.fill();
  c.fillStyle = '#2f7a3a';
  for (const u of [0.32, 0.68]) {
    const px = x + u * w;
    const py = y + h / 2 + Math.sin(t * 0.9 + u * 3.6) * 3.2 * u;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? 3.2 : 7.4;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      c.lineTo(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr);
    }
    c.closePath();
    c.fill();
  }
  // the folds
  c.strokeStyle = 'rgba(0,0,0,0.16)';
  c.lineWidth = 1.2;
  for (const u of [0.22, 0.5, 0.78]) {
    c.beginPath();
    for (let s = 0; s <= 6; s++) {
      const v = s / 6;
      const rip = Math.sin(t * 0.9 + u * 3.6) * 3.2 * u;
      c.lineTo(x + u * w + Math.sin(v * 5 + u * 9) * 2, y + v * h + rip);
    }
    c.stroke();
  }
}

function checkpoint(R, t, maher) {
  const C = NOMANS.checkpoint;
  // the post's canopy: a tarpaulin and camouflage net on poles, over the table
  if (seen(R, C, C + 600)) {
    R.cast((c) => {
      for (const px of [C + 220, C + 500]) {
        extrudeRect(c, px, -262, 8, 262, 6, { color: '#4a3a2a' });
        c.fillStyle = '#4a3a2a';
        c.fillRect(px, -262, 8, 262);
      }
      // the net sagging between the poles, and its fringe
      const pts = [[C + 200, -266]];
      for (let i = 1; i < 14; i++) {
        const u = i / 14;
        pts.push([C + 200 + u * 330, -266 + 20 * Math.sin(u * Math.PI) + Math.sin(u * 17) * 2]);
      }
      pts.push([C + 530, -266], [C + 530, -246], [C + 200, -246]);
      extrudePoly(c, pts, 40, { color: '#6c7355', topK: 1.1, sideK: 0.55 });
      c.fillStyle = '#6c7355';
      poly(c, pts);
      c.fill();
      const r = rng(23);
      for (let i = 0; i < 44; i++) {
        c.fillStyle = r() < 0.5 ? '#4f573d' : r() < 0.5 ? '#8b8668' : '#3d4331';
        c.beginPath();
        c.ellipse(C + 206 + r() * 318, -262 + r() * 22, 12 + r() * 16, 3 + r() * 4, (r() - 0.5) * 0.4, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(60,64,46,0.8)';
      for (let x = C + 204; x < C + 528; x += 9) c.fillRect(x, -248, 3, 6 + ((x * 7) % 9));
    });
  }
  // a flagpole, the flag hanging in the still air
  if (seen(R, C + 410, C + 560)) {
    R.cast((c) => {
      const fx = C + 420;
      extrudeRect(c, fx, -340, 5, 344, 4, { color: '#444a4f' });
      c.fillStyle = '#444a4f';
      c.fillRect(fx, -340, 5, 344);
      c.fillStyle = '#c9c1a0';
      c.beginPath();
      c.arc(fx + 2.5, -343, 4.5, 0, Math.PI * 2);
      c.fill();
      flag(c, fx + 5, -330, 92, 58, t);
    });
  }
  // the concertina wire and the oil drums out in front
  if (seen(R, C - 260, C - 10)) {
    R.cast((c) => {
      c.strokeStyle = 'rgba(70,72,74,0.9)';
      c.lineWidth = 1.2;
      for (let i = 0; i < 17; i++) {
        c.beginPath();
        c.ellipse(C - 245 + i * 11, -17, 17, 17, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.strokeStyle = 'rgba(190,196,200,0.4)';
      for (let i = 0; i < 17; i++) {
        c.beginPath();
        c.arc(C - 245 + i * 11, -17, 17, -2.4, -1.0);
        c.stroke();
      }
      for (const [dx, col] of [[-276, '#5c2a26'], [-250, '#c2beb0']]) {
        const bx = C + dx;
        extrudeRect(c, bx - 14, -52, 28, 52, 20, { color: col });
        c.fillStyle = col;
        c.fillRect(bx - 14, -52, 28, 52);
        c.fillStyle = 'rgba(0,0,0,0.22)';
        c.fillRect(bx - 14, -40, 28, 2.5);
        c.fillRect(bx - 14, -14, 28, 2.5);
        c.fillStyle = 'rgba(255,255,255,0.16)';
        c.fillRect(bx - 11, -50, 4, 48);
      }
    });
  }
  // concrete blocks in the road, then the sandbag wall
  if (seen(R, C - 100, C + 200)) {
    R.cast((c) => concreteBlocks(c, C - 160, 3, 1.25, '#9a9a94'));
    sandbags(R, C - 10, 250, 3, { color: '#a49c86' });
  }
  // the camp table, two chairs, the radio, a thermos and tea glasses
  const tx = C + 340;
  if (seen(R, tx - 140, tx + 140)) {
    R.cast((c) => {
      c.fillStyle = '#4e4a3d';
      extrudeRect(c, tx - 54, -82, 108, 6, 22, { color: '#5b5646' });
      c.fillRect(tx - 54, -82, 108, 6);
      c.fillRect(tx - 48, -76, 4, 76);
      c.fillRect(tx + 44, -76, 4, 76);
      for (const [cx, f] of [[tx - 100, 1], [tx + 108, -1]]) {
        c.fillStyle = '#3d3d3f';
        extrudeRect(c, cx - 18, -44, 36, 4, 18, { color: '#3d3d3f' });
        c.fillRect(cx - 18, -44, 36, 4);
        c.fillRect(cx - 16, -40, 3, 40);
        c.fillRect(cx + 13, -40, 3, 40);
        c.fillRect(cx - f * 18, -96, 3, 56);
      }
      // the radio and its aerial
      extrudeRect(c, tx + 14, -106, 32, 24, 10, { color: '#34372f' });
      c.fillStyle = '#34372f';
      c.fillRect(tx + 14, -106, 32, 24);
      c.fillStyle = '#7a8068';
      c.fillRect(tx + 32, -134, 2, 28);
      c.fillStyle = '#5a5e4b';
      c.fillRect(tx + 18, -102, 12, 8);
      // thermos, glasses
      c.fillStyle = '#7a2a24';
      c.fillRect(tx - 34, -114, 13, 32);
      c.fillStyle = '#b8b2a0';
      c.fillRect(tx - 34, -118, 13, 4);
      c.fillStyle = 'rgba(205,130,70,0.85)';
      c.fillRect(tx - 14, -92, 6, 10);
      if (maher === 'dignity') c.fillRect(tx - 2, -92, 6, 10);
    });
    // the radio's small red light, and a lamp still burning though the day is coming
    R.glow((c) => {
      const on = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.3));
      c.fillStyle = `rgba(255,70,50,${0.5 * on})`;
      c.beginPath();
      c.arc(tx + 40, -98, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(255,120,90,${0.9 * on})`;
      c.fillRect(tx + 38.5, -99.5, 3, 3);
      const lx = C + 170;
      const gr = c.createRadialGradient(lx, -72, 0, lx, -72, 50);
      gr.addColorStop(0, 'rgba(255,214,150,0.5)');
      gr.addColorStop(1, 'rgba(255,200,130,0)');
      c.fillStyle = gr;
      c.fillRect(lx - 50, -122, 100, 100);
    });
    R.cast((c) => {
      c.fillStyle = '#34322e';
      c.fillRect(C + 163, -78, 14, 16);
      c.fillStyle = '#c8b690';
      c.fillRect(C + 165, -74, 10, 7);
    });
  }
}

// a heap on the kerb with rubbish in it, quietly
function litter(R, x0, x1, seed) {
  R.paint((c) => {
    cells(R, 1, 46, seed, (i, x, r) => {
      if (x < x0 || x > x1) return;
      if (r() < 0.55) {
        c.fillStyle = `rgba(${70 + r() * 40},${66 + r() * 36},${60 + r() * 30},0.8)`;
        c.fillRect(x + r() * 40, 9 + r() * 14, 2 + r() * 5, 1.5 + r() * 2);
      }
      if (r() < 0.07) {
        c.fillStyle = r() < 0.5 ? 'rgba(235,232,220,0.7)' : 'rgba(140,160,175,0.6)';
        c.fillRect(x + r() * 40, 14 + r() * 36, 7 + r() * 8, 2.5); // a scrap of paper, a bag
      }
      if (r() < 0.06) {
        c.fillStyle = 'rgba(210,225,235,0.55)';
        c.fillRect(x + r() * 40, 11 + r() * 6, 2, 2); // glass
      }
    });
  });
}

export function drawNomans(R, g, { k = 0, t = g?.time ?? 0, maher = 'dignity', lifted = 0, shoes = true } = {}) {
  const E = NOMANS.edge;
  const B = NOMANS.body;
  const C = NOMANS.checkpoint;
  const origin = END.nomans[0] - 1500;

  // the sky: lighter than the ground, and nothing in it yet
  T.sky(R, greyStops(k), { sun: [0.1, 0.62], warmth: 0.2 * k, clouds: 0.3, cloudLit: [236, 238, 240], cloudShade: [186, 192, 202] });
  const haze = mixc([200, 205, 212], [232, 214, 196], k);
  farShift(R, origin, () => {
    horizon(R, {
      haze,
      shade: mixc([134, 144, 160], [150, 142, 152], k),
      cloud: [240, 240, 242],
      span: 4200,
      seed: 17,
      t,
      lite: g?.settings?.get?.('quality') === 'low',
    });
    // the town beyond, flat roofs and a minaret, drawn pale into the haze
    T.skyline(R, { depth: 0.3, y: 14, color: '#9ea2a8', seed: 52, x0: -1200, x1: 7200, minarets: [1500, 4200], haze: [rgbHex(haze), 0.55] });
  });
  // one thin thread of smoke, a long way off
  farShift(R, origin, () => T.plume(R, 2300, 20, t, { depth: 0.3, age: 1, color: [196, 196, 198], height: 330, width: 70, alpha: 0.5 }));

  // buildings, both sides of the open ground: a damaged corner where our side
  // ends, a stub with its front gone, a ruin, and the regime's block behind the post
  const tone = (a, b) => rgbHex(mixc(hexRgb(a), hexRgb(b), k * 0.5));
  const blocks = [
    { x: E - 1050, w: 1090, floors: 4, fh: 140, color: tone('#b0aca2', '#bfb09c'), seed: 321, torn: 0.35, tornLeft: false, noRoof: false },
    { x: E + 520, w: 460, floors: 3, fh: 140, color: tone('#a7a49c', '#b8ab98'), seed: 322, torn: 0.62, tornLeft: true },
    { x: E + 1380, w: 430, floors: 2, fh: 140, color: tone('#9d9a92', '#b0a490'), seed: 323, torn: 0.78, tornLeft: false },
    { x: C + 520, w: 820, floors: 5, fh: 140, color: tone('#a9a69e', '#baac98'), seed: 324, torn: 0.28, tornLeft: true },
  ];
  for (const b of blocks) if (seen(R, b.x, b.x + b.w, 300)) T.block(R, b, t);

  // the open street: broken tarmac, glass, paper
  T.street(R, E - 1100, C + 1000, { color: '#686664', pave: '#8b8984' });
  litter(R, E - 1100, C + 1000, 7);
  // rubble at the foot of the ruins, a dead lamp-post leaning over the road
  for (const [x, w, h, s] of [[E + 470, 160, 46, 11], [E + 1330, 150, 52, 12], [E + 1700, 130, 36, 13], [E - 40, 120, 30, 14]]) {
    if (seen(R, x, x + w)) T.rubble(R, x, w, h, { seed: s, color: tone('#a39f95', '#b3a894') });
  }
  if (seen(R, E + 1060, E + 1160)) {
    R.cast((c) => {
      c.save();
      c.translate(E + 1100, 0);
      c.rotate(0.07);
      extrudeRect(c, -4, -300, 8, 300, 6, { color: '#6a6c6e' });
      c.fillStyle = '#6a6c6e';
      c.fillRect(-4, -300, 8, 300);
      c.fillRect(-4, -300, 56, 6);
      c.fillStyle = '#9a9c9e';
      c.fillRect(40, -296, 14, 6);
      c.restore();
    });
  }
  T.cables(R, R.cam.x, { seed: 62, from: E - 900, to: C + 1000, y: -380 });

  // the body under its white sheet, the shoes placed beside it
  drawBody(R, B, { lifted });
  if (shoes) drawShoes(R, B + 140);
  // the corner where Sami and the helpers wait: the wall's foot, stacked crates
  if (seen(R, E - 200, E + 80)) {
    R.cast((c) => {
      extrudeRect(c, E - 130, -34, 70, 34, 24, { color: '#7d6a4a' });
      c.fillStyle = '#7d6a4a';
      c.fillRect(E - 130, -34, 70, 34);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(E - 130, -17, 70, 2);
      c.fillRect(E - 96, -34, 2, 34);
    });
  }
  checkpoint(R, t, maher);
  T.motes(R, R.cam.x, t, 0.12);
}

// ============================================================== the cemetery ==

export const GATE_X = END.cemetery[0] - 640;
export const GRAVE_X = END.cemetery[0];
export const GRAPES = [GRAVE_X, -258];

export function cemeteryLook(g, k = 0) {
  const sun = [lerp(1.0, 0.95, k), lerp(-0.18, -0.4, k)];
  const col = mixc([1.0, 0.8, 0.5], [1.0, 0.88, 0.66], k);
  const lights = [
    { uv: sun, color: col, intensity: lerp(1.15, 1.25, k), radius: 0, rim: 1.2 },
    { uv: [0.2, -1.2], color: [0.56, 0.68, 0.9], intensity: 0.2, radius: 0, rim: 0.3 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: [0.34, 0.33, 0.33],
    lights,
    groundShadow: 0.55,
    god: { uv: sun, strength: 0.34 },
    bloom: 0.75,
    exposure: 0.97,
    grain: 0.05,
    grade: { sat: 0.98, contrast: 1.08, lift: 0, tint: [1.02, 1.0, 0.96], shadows: [0.94, 0.98, 1.08], highs: [1.08, 1.02, 0.9] },
    // a golden haze just above the ground, dust and morning mist
    fog: { density: 0.14, height: 150, color: [0.95, 0.8, 0.58] },
    fade: g.a?.endFade || 0,
  };
}

// a heart-lobed vine leaf, pointing down, at (x, y), size s
function leaf(c, x, y, s, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, s);
  c.bezierCurveTo(-s * 1.1, s * 0.6, -s * 1.25, -s * 0.55, -s * 0.38, -s * 0.5);
  c.lineTo(-s * 0.12, -s * 0.95);
  c.lineTo(s * 0.12, -s * 0.5);
  c.lineTo(s * 0.38, -s * 0.5);
  c.bezierCurveTo(s * 1.25, -s * 0.55, s * 1.1, s * 0.6, 0, s);
  c.fill();
  c.restore();
}

// A cluster of small, hard, green grapes hanging at (x, y) top.
function grapes(c, x, y, s = 1, seed = 1) {
  const r = rng(seed);
  // the stem
  c.strokeStyle = '#5c6a32';
  c.lineWidth = 2 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y - 24 * s);
  c.quadraticCurveTo(x + 3 * s, y - 10 * s, x, y);
  c.stroke();
  const rows = 6;
  const berries = [];
  for (let row = 0; row < rows; row++) {
    const n = Math.max(1, Math.round(4.2 - Math.abs(row - 1.2) * 0.75));
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * 7.3 * s + (r() - 0.5) * 1.6 * s;
      const by = y + 4 * s + row * 6.6 * s + (r() - 0.5) * 1.2 * s;
      berries.push([bx, by, (3.6 + r() * 0.5 - row * 0.1) * s, r()]);
    }
  }
  berries.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, br, v] of berries) {
    c.fillStyle = v < 0.5 ? '#8da944' : '#9bb552';
    c.beginPath();
    c.arc(bx, by, br, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(60,84,24,0.45)';
    c.beginPath();
    c.arc(bx + br * 0.25, by + br * 0.35, br * 0.75, 0.2, Math.PI * 1.1);
    c.fill();
    c.fillStyle = 'rgba(235,245,190,0.7)';
    c.beginPath();
    c.arc(bx - br * 0.35, by - br * 0.4, br * 0.28, 0, Math.PI * 2);
    c.fill();
  }
}

// The arbour: posts and beams running along the cemetery, and over them the
// vine's whole roof. Drawn behind and in front of the people (two calls).
const BEAM_Y = -338;
function arbour(R, t) {
  const span = [GATE_X - 80, END.cemetery[0] + END.cemetery[1] + 100];
  // posts, every 320, a little behind the graves, and the long beams on top
  R.cast((c) => {
    const x0 = Math.max(span[0], R.cam.x - halfView(R) - 200);
    const x1 = Math.min(span[1], R.cam.x + halfView(R) + 200);
    // two beams, one behind the other, the roof's frame
    extrudeRect(c, x0, BEAM_Y, x1 - x0, 14, 40, { color: '#6a4f37', topK: 1.2 });
    c.fillStyle = '#6a4f37';
    c.fillRect(x0, BEAM_Y, x1 - x0, 14);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(x0, BEAM_Y + 9, x1 - x0, 5);
    for (let px = Math.floor((x0 - GATE_X) / 320) * 320 + GATE_X; px < x1 + 320; px += 320) {
      if (px < span[0] || px > span[1]) continue;
      extrudeRect(c, px - 7, BEAM_Y + 14, 14, -BEAM_Y - 14 - 14, 14, { color: '#6a4f37' });
      c.fillStyle = '#6a4f37';
      c.fillRect(px - 7, BEAM_Y + 14, 14, -BEAM_Y - 28);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(px + 2, BEAM_Y + 14, 5, -BEAM_Y - 28);
      // corbels
      c.fillStyle = '#6a4f37';
      c.beginPath();
      c.moveTo(px - 7, BEAM_Y + 14);
      c.lineTo(px - 52, BEAM_Y + 14);
      c.lineTo(px - 7, BEAM_Y + 58);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(px + 7, BEAM_Y + 14);
      c.lineTo(px + 52, BEAM_Y + 14);
      c.lineTo(px + 7, BEAM_Y + 58);
      c.closePath();
      c.fill();
    }
  });
}

const GREENS = ['#4f6a2e', '#5f7c37', '#6f8e3d', '#7c9a45', '#456128'];
function vineRoof(R, t, front) {
  // front: the lowest hanging leaves and grapes, drawn after the people; back:
  // the dense roof and the vines climbing the posts
  const draw = (c) => {
    cells(R, 1, 22, front ? 91 : 17, (i, x, r) => {
      if (x < GATE_X - 120 || x > END.cemetery[0] + END.cemetery[1] + 160) return;
      const n = front ? 2 : 5;
      for (let j = 0; j < n; j++) {
        const lx = x + r() * 30;
        const band = front ? r() : Math.pow(r(), 0.7);
        const ly = front ? BEAM_Y + 34 + band * 56 : BEAM_Y - 60 - band * 126 + r() * 20;
        const sway = Math.sin(t * 0.9 + i * 0.7 + j) * (front ? 2.2 : 1.1);
        const s = 11 + r() * 9;
        c.fillStyle = GREENS[(r() * GREENS.length) | 0];
        leaf(c, lx + sway, ly, s, (r() - 0.5) * 2.2 + (front ? 0 : 0.2));
      }
      if (!front) {
        // the roof's under-edge, a ragged fringe of leaves along the beam
        for (let j = 0; j < 2; j++) {
          c.fillStyle = GREENS[(r() * GREENS.length) | 0];
          leaf(c, x + r() * 22, BEAM_Y - 8 + r() * 26, 10 + r() * 7, (r() - 0.5) * 2.4);
        }
      }
    });
  };
  if (front) R.cast(draw);
  else R.cast(draw);
}

// the tendrils and grapes hanging under the roof
function hangers(R, t) {
  R.cast((c) => {
    cells(R, 1, 150, 33, (i, x, r) => {
      if (x < GATE_X - 100 || x > END.cemetery[0] + END.cemetery[1] + 120) return;
      const hx = x + r() * 120;
      if (Math.abs(hx - GRAPES[0]) < 90) return; // the grave's own cluster is drawn apart
      const len = 36 + r() * 60;
      const sw = Math.sin(t * 0.8 + i) * 1.8;
      // a tendril curling down with leaves
      c.strokeStyle = '#4a5a2a';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(hx, BEAM_Y + 10);
      c.bezierCurveTo(hx + 8 + sw, BEAM_Y + 10 + len * 0.4, hx - 10 + sw, BEAM_Y + len * 0.8, hx + 4 + sw * 2, BEAM_Y + 14 + len);
      c.stroke();
      c.fillStyle = GREENS[(r() * GREENS.length) | 0];
      leaf(c, hx + 6 + sw, BEAM_Y + 24 + len * 0.45, 12, 0.5 + r());
      leaf(c, hx - 5 + sw, BEAM_Y + 14 + len * 0.9, 10, -0.6 - r());
      if (r() < 0.55) grapes(c, hx + 14 + sw, BEAM_Y + 46 + r() * 30, 0.9 + r() * 0.25, i * 13 + 1);
    });
    // the cluster directly over the new grave, a little larger, with leaves around it
    const [gx, gy] = GRAPES;
    const sw = Math.sin(t * 0.7) * 1.4;
    c.strokeStyle = '#4a5a2a';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(gx - 24, BEAM_Y + 12);
    c.bezierCurveTo(gx - 10, BEAM_Y + 30, gx + 12, BEAM_Y + 24, gx + sw, gy - 24);
    c.stroke();
    c.fillStyle = '#5f7c37';
    leaf(c, gx - 30, BEAM_Y + 34, 17, 0.4);
    c.fillStyle = '#4f6a2e';
    leaf(c, gx + 28, BEAM_Y + 30, 16, -0.5);
    c.fillStyle = '#6f8e3d';
    leaf(c, gx - 22, BEAM_Y + 58, 13, 0.9);
    leaf(c, gx + 20, BEAM_Y + 66, 12, -1.0);
    grapes(c, gx + sw, gy, 1.5, 77);
  });
  // the grapes catch the morning, and so do the leaves around them
  R.glow((c) => {
    const [gx, gy] = GRAPES;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.3);
    const gr = c.createRadialGradient(gx, gy + 18, 0, gx, gy + 18, 70);
    gr.addColorStop(0, `rgba(255,240,170,${0.2 * pulse})`);
    gr.addColorStop(1, 'rgba(255,230,150,0)');
    c.fillStyle = gr;
    c.fillRect(gx - 80, gy - 60, 160, 160);
  });
}

// the sun through the leaves: translucent glowing leaves in the roof
function backlit(R, t) {
  R.glow((c) => {
    cells(R, 1, 34, 55, (i, x, r) => {
      if (x < GATE_X - 120 || x > END.cemetery[0] + END.cemetery[1] + 160) return;
      for (let j = 0; j < 2; j++) {
        const lx = x + r() * 34;
        const ly = BEAM_Y - 40 - Math.pow(r(), 0.8) * 130;
        const tw = 0.7 + 0.3 * Math.sin(t * 0.9 + i * 1.7 + j * 2);
        c.fillStyle = `rgba(255,236,140,${(0.07 + r() * 0.1) * tw})`;
        leaf(c, lx, ly, 12 + r() * 9, (r() - 0.5) * 2.4);
      }
    });
  });
}

// the dappled ground: light and leaf-shadow in patches that drift
function dapples(R, t) {
  R.paint((c) => {
    cells(R, 1, 36, 29, (i, x, r) => {
      if (x < GATE_X - 80 || x > END.cemetery[0] + END.cemetery[1] + 100) return;
      for (let j = 0; j < 3; j++) {
        const px = x + r() * 36 + Math.sin(t * 0.3 + i + j) * 3;
        const py = 8 + r() * 130;
        const rx = 14 + r() * 36;
        const lit = r() < 0.5;
        c.fillStyle = lit ? `rgba(255,226,150,${0.1 + r() * 0.12})` : `rgba(40,48,22,${0.16 + r() * 0.14})`;
        c.beginPath();
        c.ellipse(px, py, rx, rx * (0.16 + py / 900), (r() - 0.5) * 0.3, 0, Math.PI * 2);
        c.fill();
      }
    });
  });
  R.glow((c) => {
    cells(R, 1, 52, 31, (i, x, r) => {
      if (x < GATE_X - 80 || x > END.cemetery[0] + END.cemetery[1] + 100) return;
      const px = x + r() * 52 + Math.sin(t * 0.3 + i) * 3;
      const py = 6 + r() * 80;
      const rx = 12 + r() * 26;
      const tw = 0.7 + 0.3 * Math.sin(t * 0.8 + i * 2.1);
      c.fillStyle = `rgba(255,222,140,${0.06 * tw})`;
      c.beginPath();
      c.ellipse(px, py, rx, rx * 0.22, 0, 0, Math.PI * 2);
      c.fill();
    });
  });
}

// A fruit tree behind the wall: a trunk, a mass of canopy.
function orchardTrees(R, depth, baseY, size, color, seed, step, hazeCol, hazeA, light = 0) {
  R.layer(depth);
  const draw = (c, col) => {
    cells(R, depth, step, seed, (i, x, r) => {
      const h = size * (0.7 + r() * 0.6);
      const cx = x + step * (0.2 + r() * 0.6);
      c.fillStyle = col || '#3a2c20';
      c.fillRect(cx - h * 0.04, baseY - h * 0.38, h * 0.08, h * 0.4);
      const blobs = 7;
      for (let b = 0; b < blobs; b++) {
        const a = (b / blobs) * Math.PI * 2 + r();
        const rr = h * (0.2 + r() * 0.14);
        c.fillStyle = col || mixHex(color, '#8da552', r() * 0.35 * (0.4 + light));
        c.beginPath();
        c.arc(cx + Math.cos(a) * h * 0.26, baseY - h * 0.62 + Math.sin(a) * h * 0.2, rr, 0, Math.PI * 2);
        c.fill();
      }
    });
  };
  R.paint((c) => draw(c, null));
  if (hazeA > 0) R.glow((c) => {
    c.globalAlpha = hazeA;
    draw(c, hazeCol);
  });
  R.layer(1);
}

function cemeteryGround(R) {
  const x0 = R.cam.x - halfView(R) - 300;
  const x1 = R.cam.x + halfView(R) + 300;
  R.paint((c) => {
    // the earth: dusty tan, darker with depth
    const g = c.createLinearGradient(0, -6, 0, 300);
    g.addColorStop(0, '#a58c68');
    g.addColorStop(0.35, '#8c7352');
    g.addColorStop(1, '#5e4a34');
    c.fillStyle = g;
    c.fillRect(x0, -4, x1 - x0, 400);
    // the trodden path from the gate to the grave: paler, worn
    const p0 = GATE_X + 20;
    const p1 = GRAPES[0] - 60;
    const pg = c.createLinearGradient(0, -2, 0, 40);
    pg.addColorStop(0, 'rgba(215,190,146,0.55)');
    pg.addColorStop(1, 'rgba(215,190,146,0)');
    c.fillStyle = pg;
    c.beginPath();
    c.moveTo(p0 - 30, -2);
    c.bezierCurveTo(p0 + 100, 8, p1 - 200, -2, p1, 4);
    c.lineTo(p1, 34);
    c.lineTo(p0, 34);
    c.closePath();
    c.fill();
  });
  R.surface((c) => c.rect(x0, -4, x1 - x0, 400), 'asphalt', { scale: 1.3, seed: 5, alpha: 0.28 });
  // dry August grass, tufts along the edges and between the graves
  R.paint((c) => {
    cells(R, 1, 16, 41, (i, x, r) => {
      if (r() < 0.45) return;
      const h = 8 + r() * 18;
      c.strokeStyle = r() < 0.5 ? '#bda665' : r() < 0.5 ? '#8b8a4a' : '#d3bd7c';
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      const bx = x + r() * 16;
      const by = 1 + r() * 14;
      for (let b = 0; b < 4; b++) {
        c.beginPath();
        c.moveTo(bx + b * 1.6, by);
        c.quadraticCurveTo(bx + b * 2 + (r() - 0.3) * 6, by - h * 0.6, bx + b * 3 + (r() - 0.5) * 12, by - h * (0.7 + r() * 0.3));
        c.stroke();
      }
      if (r() < 0.06) {
        c.fillStyle = r() < 0.5 ? '#efe9d2' : '#d9c24a';
        c.beginPath();
        c.arc(bx + 3, by - h * 0.9, 1.6, 0, Math.PI * 2);
        c.fill(); // a small wildflower
      }
    });
    // pebbles
    cells(R, 1, 30, 43, (i, x, r) => {
      if (r() < 0.6) return;
      c.fillStyle = `rgba(${140 + r() * 40},${126 + r() * 30},${104 + r() * 30},0.9)`;
      c.beginPath();
      c.ellipse(x + r() * 30, 6 + r() * 70, 2 + r() * 3, 1.2 + r() * 1.5, 0, 0, Math.PI * 2);
      c.fill();
    });
  });
}

// an old grave: a raised plot with a stone kerb, an upright stele, some moss
function oldGrave(R, x, kind, back, seed) {
  const s = back ? 0.88 : 1;
  const y0 = back ? -26 : 0;
  const col = ['#bfb7a2', '#b0a892', '#c6bda6', '#a79f8b'][seed % 4];
  R.cast((c) => {
    c.save();
    c.translate(x, y0);
    c.scale(s, s);
    // the plot: an earthen mound inside a low stone kerb
    const plot = [[-82, 0], [-80, -15], [-40, -22], [40, -22], [80, -15], [82, 0]];
    extrudePoly(c, plot, 34, { color: col, topK: 1.12 });
    c.fillStyle = col;
    poly(c, plot);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(-82, -6, 164, 6);
    c.fillStyle = 'rgba(255,250,235,0.2)';
    c.fillRect(-72, -22, 144, 3);
    // a dry earth top inside the kerb, with grass seeding in it
    c.fillStyle = '#9a8660';
    c.beginPath();
    c.moveTo(-70, -17);
    c.quadraticCurveTo(0, -30, 70, -17);
    c.lineTo(66, -22);
    c.quadraticCurveTo(0, -34, -66, -22);
    c.closePath();
    c.fill();
    // the stele at the head
    const hx = -58;
    const types = [
      [[-12, 0], [-12, -62], [-6, -72], [6, -72], [12, -62], [12, 0]],
      [[-11, 0], [-11, -58], [0, -78], [11, -58], [11, 0]],
      [[-14, 0], [-14, -50], [-9, -56], [9, -56], [14, -50], [14, 0]],
    ];
    const st = types[kind % 3].map(([px, py]) => [hx + px, py - 12]);
    extrudePoly(c, st, 12, { color: col });
    c.fillStyle = col;
    poly(c, st);
    c.fill();
    // carved lines, worn almost smooth
    c.strokeStyle = 'rgba(70,62,50,0.4)';
    c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(hx - 8 + (i % 2) * 2, -48 - i * 5);
      c.lineTo(hx + 7 - (i % 3), -48 - i * 5);
      c.stroke();
    }
    // moss, weather
    c.fillStyle = 'rgba(96,118,62,0.4)';
    c.beginPath();
    c.ellipse(hx - 6, -14, 8, 3, 0, 0, Math.PI * 2);
    c.ellipse(hx + 2, -66, 5, 2.4, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
}

// a newer grave: fresher, darker earth heaped a hand's height, a simple marker
function newGrave(R, x, kind, back, seed) {
  const s = back ? 0.88 : 1;
  const y0 = back ? -26 : 0;
  R.cast((c) => {
    c.save();
    c.translate(x, y0);
    c.scale(s, s);
    const r = rng(seed);
    const mound = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      mound.push([-80 + u * 160, -Math.sin(u * Math.PI) * (24 + r() * 3) * (0.9 + 0.2 * Math.sin(u * 5))]);
    }
    extrudePoly(c, mound, 32, { color: '#5e4630' });
    c.fillStyle = '#5e4630';
    poly(c, mound);
    c.fill();
    // clods, and the dry crust on top
    for (let i = 0; i < 20; i++) {
      const u = 0.06 + r() * 0.88;
      const my = -Math.sin(u * Math.PI) * 20 * r();
      c.fillStyle = r() < 0.5 ? 'rgba(130,100,70,0.5)' : 'rgba(40,28,18,0.45)';
      c.beginPath();
      c.ellipse(-80 + u * 160, my - 1, 3 + r() * 4, 2 + r() * 2, 0, 0, Math.PI * 2);
      c.fill();
    }
    // stones round the edge, a marker at the head
    for (const [sx, sd] of [[-78, 1], [-40, 2], [40, 3], [78, 4]]) stone(c, sx, 0, 14, 8, '#9b9482', seed + sd);
    const hx = -66;
    if (kind % 3 === 0) {
      // a rough board with a name painted, tilted a little
      c.save();
      c.translate(hx, 0);
      c.rotate(-0.06);
      c.fillStyle = '#7d6446';
      c.fillRect(-9, -64, 18, 62);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(3, -64, 6, 62);
      c.fillStyle = '#e8e0cc';
      for (let i = 0; i < 4; i++) c.fillRect(-6, -56 + i * 9, 10 - (i % 2) * 3, 2);
      c.restore();
    } else if (kind % 3 === 1) {
      // a slab of concrete with a name scratched into it
      c.fillStyle = '#9c9a92';
      c.beginPath();
      c.moveTo(hx - 11, 0);
      c.lineTo(hx - 11, -44);
      c.lineTo(hx - 3, -50);
      c.lineTo(hx + 11, -46);
      c.lineTo(hx + 11, 0);
      c.fill();
      c.strokeStyle = 'rgba(40,40,40,0.5)';
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(hx - 6, -38 + i * 8);
        c.lineTo(hx + 7, -38 + i * 8);
        c.stroke();
      }
    } else {
      // two sticks tied in a cross, and a bottle with a green sprig
      c.strokeStyle = '#6e5538';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(hx, 0);
      c.lineTo(hx, -52);
      c.moveTo(hx - 12, -36);
      c.lineTo(hx + 12, -36);
      c.stroke();
      c.fillStyle = 'rgba(160,190,200,0.7)';
      c.fillRect(hx + 18, -18, 7, 18);
      c.fillRect(hx + 20, -24, 3, 6);
      c.strokeStyle = '#6a8a3c';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(hx + 21.5, -22);
      c.lineTo(hx + 20, -40);
      c.moveTo(hx + 21.5, -26);
      c.lineTo(hx + 28, -38);
      c.stroke();
    }
    c.restore();
  });
}

// The wall: dressed and rubble stone, a coping, the gate's pillars and its
// iron arch at the left.
function cemeteryWall(R) {
  const L = GATE_X - 80;
  const Rr = END.cemetery[0] + END.cemetery[1] + 80;
  const x0 = Math.max(L, R.cam.x - halfView(R) - 200);
  const x1 = Math.min(Rr, R.cam.x + halfView(R) + 200);
  // the wall runs behind the graves, its foot a little further back
  R.cast((c) => {
    const g0 = GATE_X + 70;
    const a = Math.max(x0, g0);
    if (a < x1) {
      extrudeRect(c, a, -128, x1 - a, 104, 14, { color: '#b5a68c' });
      c.fillStyle = '#b5a68c';
      c.fillRect(a, -128, x1 - a, 104);
      c.save();
      c.beginPath();
      c.rect(a, -128, x1 - a, 104);
      c.clip();
      const r = rng(5);
      for (let row = 0; row < 5; row++) {
        const y = -128 + row * 21;
        for (let bx = Math.floor(a / 40) * 40 - (row % 2) * 20; bx < x1; bx += 40) {
          const rr = rng((bx * 3 + row * 977) | 0);
          const v = (rr() - 0.5) * 0.18;
          c.fillStyle = v > 0 ? `rgba(255,246,225,${v})` : `rgba(50,38,26,${-v})`;
          c.fillRect(bx + 1, y + 1, 38, 19);
        }
        c.fillStyle = 'rgba(70,58,44,0.4)';
        c.fillRect(a, y + 20, x1 - a, 1.6);
      }
      void r;
      c.restore();
      // the coping, lit
      extrudeRect(c, a, -136, x1 - a, 9, 18, { color: '#cbbd9f', topK: 1.2 });
      c.fillStyle = '#cbbd9f';
      c.fillRect(a, -136, x1 - a, 9);
      c.fillStyle = 'rgba(255,250,230,0.35)';
      c.fillRect(a, -136, x1 - a, 2);
      // the foot, in shadow and grass
      const dg = c.createLinearGradient(0, -24, 0, -50);
      dg.addColorStop(0, 'rgba(40,30,20,0.35)');
      dg.addColorStop(1, 'rgba(40,30,20,0)');
      c.fillStyle = dg;
      c.fillRect(a, -50, x1 - a, 26);
    }
  });
  R.surface((c) => c.rect(Math.max(x0, GATE_X + 70), -128, x1 - Math.max(x0, GATE_X + 70), 104), 'limestone', { scale: 0.7, seed: 4, alpha: 0.5 });
  // the gate: two pillars with caps, an iron arch with a finial, both leaves open
  if (seen(R, GATE_X - 90, GATE_X + 90)) {
    R.cast((c) => {
      for (const px of [GATE_X - 56, GATE_X + 56]) {
        extrudeRect(c, px - 18, -168, 36, 168, 20, { color: '#c0b296' });
        c.fillStyle = '#c0b296';
        c.fillRect(px - 18, -168, 36, 168);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = -168 + 24; y < 0; y += 24) c.fillRect(px - 18, y, 36, 1.6);
        c.fillStyle = 'rgba(60,46,30,0.25)';
        c.fillRect(px + 8, -168, 10, 168);
        // the cap
        extrudeRect(c, px - 23, -182, 46, 14, 24, { color: '#d2c5a8', topK: 1.2 });
        c.fillStyle = '#d2c5a8';
        c.fillRect(px - 23, -182, 46, 14);
        c.fillStyle = 'rgba(255,250,230,0.4)';
        c.fillRect(px - 23, -182, 46, 2.5);
        c.fillStyle = '#c0b296';
        c.beginPath();
        c.moveTo(px - 12, -182);
        c.lineTo(px, -202);
        c.lineTo(px + 12, -182);
        c.fill();
      }
      // the iron arch
      c.strokeStyle = '#2c2a28';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(GATE_X - 56, -172);
      c.quadraticCurveTo(GATE_X, -236, GATE_X + 56, -172);
      c.stroke();
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(GATE_X - 56, -160);
      c.quadraticCurveTo(GATE_X, -214, GATE_X + 56, -160);
      c.stroke();
      for (let i = -4; i <= 4; i++) {
        const u = i / 4.6;
        c.beginPath();
        c.moveTo(GATE_X + u * 52, -160 - (1 - u * u) * 52 + 2);
        c.lineTo(GATE_X + u * 52, -170 - (1 - u * u) * 62);
        c.stroke();
      }
      c.fillStyle = '#2c2a28';
      c.beginPath();
      c.moveTo(GATE_X - 5, -229);
      c.lineTo(GATE_X, -248);
      c.lineTo(GATE_X + 5, -229);
      c.fill();
      // the open leaves, folded back edge-on against the pillars
      c.lineWidth = 2.2;
      for (const [px, d] of [[GATE_X - 40, 1], [GATE_X + 40, -1]]) {
        c.beginPath();
        c.moveTo(px, 0);
        c.lineTo(px, -150);
        c.moveTo(px + d * 7, 0);
        c.lineTo(px + d * 7, -145);
        c.moveTo(px, -150);
        c.lineTo(px + d * 7, -145);
        c.stroke();
        for (let y = -10; y > -145; y -= 12) {
          c.beginPath();
          c.moveTo(px, y);
          c.lineTo(px + d * 7, y + 2);
          c.stroke();
        }
      }
    });
  }
}

export function drawGrave(R, x, { filled = 0, stones = false, lowered = 0 } = {}) {
  if (!seen(R, x - 300, x + 300)) return;
  const f = clamp(filled);
  const W = 96; // half-length of the grave
  const pitD = 150;
  const level = Math.min(1, f / 0.78); // the pit fills first, then the mound rises
  const moundH = 27 * smoothstep(0.7, 1, f);
  // the section: the pit, cut open to its depth, seen into
  if (f < 1) {
    R.paint((c) => {
      // the far wall, lit near the top where the sun reaches, black at the foot
      const g = c.createLinearGradient(0, 0, 0, pitD);
      g.addColorStop(0, '#7a5f40');
      g.addColorStop(0.18, '#5a4530');
      g.addColorStop(0.55, '#2d2218');
      g.addColorStop(1, '#120d09');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - W, 0);
      c.lineTo(x - W + 6, pitD);
      c.lineTo(x + W - 6, pitD);
      c.lineTo(x + W, 0);
      c.closePath();
      c.fill();
      // strata in the far wall, roots, a stone or two
      c.save();
      c.clip();
      const r = rng(47);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(180,150,110,0.14)' : 'rgba(0,0,0,0.18)';
        c.fillRect(x - W, 8 + i * 15 + r() * 6, W * 2, 3 + r() * 5);
      }
      c.strokeStyle = 'rgba(120,96,64,0.5)';
      c.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const rx = x - W + 14 + r() * (W * 2 - 28);
        c.beginPath();
        c.moveTo(rx, 0);
        c.quadraticCurveTo(rx + (r() - 0.5) * 16, 18, rx + (r() - 0.5) * 24, 28 + r() * 16);
        c.stroke();
      }
      for (let i = 0; i < 6; i++) {
        c.fillStyle = `rgba(${150 + r() * 40},${130 + r() * 30},${100 + r() * 30},0.6)`;
        c.beginPath();
        c.ellipse(x - W + 10 + r() * (W * 2 - 20), 12 + r() * 90, 3 + r() * 5, 2 + r() * 3, 0, 0, Math.PI * 2);
        c.fill();
      }
      // the sun's slant, reaching a little way in
      const sg = c.createLinearGradient(x + W, 0, x - W * 0.2, 60);
      sg.addColorStop(0, 'rgba(255,214,140,0.38)');
      sg.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = sg;
      c.beginPath();
      c.moveTo(x + W, 0);
      c.lineTo(x + W * 0.5, 0);
      c.lineTo(x - W * 0.3, 70);
      c.lineTo(x + W - 6, 100);
      c.closePath();
      c.fill();
      c.restore();
    });
    // the rim: a lip of cut earth, the near end wall
    R.cast((c) => {
      c.fillStyle = '#7e6544';
      c.fillRect(x - W - 3, -2, 8, 5);
      c.fillRect(x + W - 5, -2, 8, 5);
      c.fillStyle = 'rgba(255,230,170,0.3)';
      c.fillRect(x - W - 3, -2, W * 2 + 6, 1.6);
    });
  }
  // the body being lowered, wrapped in white, going down into the dark
  if (lowered > 0 && f < 0.95) {
    const ly = lerp(-30, pitD - 6, smoothstep(0, 1, lowered));
    const tone = lerp(1, 0.62, clamp(ly / pitD));
    R.paint((c) => paintSheet(c, x, ly, { sx: 0.9, sy: 0.9, depth: 18, tone }));
  }
  // earth going back in: the level rises through the pit
  if (f > 0 && f < 1) {
    R.cast((c) => {
      const top = pitD * (1 - level);
      const r = rng(81);
      const pts = [[x - W + 6 * (1 - level), pitD], [x - W + 6 * (1 - level), top + 2]];
      for (let i = 1; i < 12; i++) pts.push([x - W + (i / 12) * (W * 2), top - Math.sin((i / 12) * Math.PI) * 5 * level + (r() - 0.5) * 4]);
      pts.push([x + W - 6 * (1 - level), top + 2], [x + W - 6 * (1 - level), pitD]);
      c.fillStyle = '#5b4430';
      poly(c, pts);
      c.fill();
      for (let i = 0; i < 22; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(130,100,70,0.5)' : 'rgba(30,20,12,0.4)';
        c.beginPath();
        c.ellipse(x - W + 8 + r() * (W * 2 - 16), top + r() * (pitD - top), 3 + r() * 5, 2 + r() * 2.5, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
  }
  // the mound over a filled grave, its fresh earth dark
  if (moundH > 0.5) {
    R.cast((c) => {
      const r = rng(83);
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        pts.push([x - W - 6 + u * (W * 2 + 12), -Math.pow(Math.sin(u * Math.PI), 0.8) * moundH * (0.94 + 0.06 * Math.sin(u * 9))]);
      }
      extrudePoly(c, pts, 36, { color: '#5a432e' });
      c.fillStyle = '#5a432e';
      poly(c, pts);
      c.fill();
      c.save();
      poly(c, pts);
      c.clip();
      for (let i = 0; i < 40; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(140,108,76,0.45)' : 'rgba(30,20,12,0.4)';
        c.beginPath();
        c.ellipse(x - W + r() * W * 2, -r() * moundH, 3 + r() * 5, 1.8 + r() * 2.5, 0, 0, Math.PI * 2);
        c.fill();
      }
      const sg = c.createLinearGradient(0, -moundH, 0, 0);
      sg.addColorStop(0, 'rgba(255,220,150,0.22)');
      sg.addColorStop(1, 'rgba(0,0,0,0.12)');
      c.fillStyle = sg;
      c.fillRect(x - W - 8, -moundH, W * 2 + 16, moundH);
      c.restore();
    });
  }
  // the dug earth, heaped beside it, with the shovel still in it
  const heap = 1 - clamp(f / 0.8);
  if (heap > 0.04 || f < 1) {
    const hx = x + W + 70;
    const hh = 58 * Math.max(0.12, heap);
    R.cast((c) => {
      const r = rng(85);
      const pts = [[hx - 78, 2]];
      for (let i = 1; i < 11; i++) {
        const u = i / 11;
        pts.push([hx - 78 + u * 156 + (r() - 0.5) * 8, -Math.pow(Math.sin(u * Math.PI), 0.9) * hh * (0.88 + r() * 0.2)]);
      }
      pts.push([hx + 78, 2]);
      extrudePoly(c, pts, 38, { color: '#6a5037' });
      c.fillStyle = '#6a5037';
      poly(c, pts);
      c.fill();
      c.save();
      poly(c, pts);
      c.clip();
      for (let i = 0; i < 60; i++) {
        const u = r();
        c.fillStyle = r() < 0.4 ? 'rgba(170,138,100,0.5)' : r() < 0.5 ? 'rgba(40,28,18,0.45)' : 'rgba(95,72,48,0.6)';
        c.beginPath();
        c.ellipse(hx - 70 + u * 140, -r() * hh * Math.sin(u * Math.PI) - 1, 4 + r() * 7, 2.4 + r() * 3.4, 0, 0, Math.PI * 2);
        c.fill();
      }
      const sg = c.createLinearGradient(0, -hh, 0, 0);
      sg.addColorStop(0, 'rgba(255,225,160,0.3)');
      sg.addColorStop(1, 'rgba(0,0,0,0.1)');
      c.fillStyle = sg;
      c.fillRect(hx - 80, -hh, 160, hh);
      c.restore();
      // the shovel leaning in the heap
      if (heap > 0.3) {
        c.save();
        c.translate(hx - 18, -hh * 0.55);
        c.rotate(-0.25);
        c.fillStyle = '#7b6240';
        c.fillRect(-2.5, -86, 5, 84);
        c.fillStyle = '#7b6240';
        c.fillRect(-9, -92, 18, 5);
        c.fillStyle = '#8b9096';
        c.beginPath();
        c.moveTo(-9, -2);
        c.lineTo(9, -2);
        c.lineTo(7, 24);
        c.lineTo(0, 30);
        c.lineTo(-7, 24);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.fillRect(-7, -2, 3, 22);
        c.restore();
      }
    });
  }
  // the two white stones, at the head and the foot
  if (stones) {
    R.cast((c) => {
      const y = -moundH * 0.18;
      stone(c, x - W + 4, y + 1, 28, 34, '#e9e4d4', 9);
      stone(c, x + W - 4, y + 1, 22, 24, '#e4dfcf', 10);
      c.strokeStyle = 'rgba(150,140,120,0.35)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - W - 4, y - 12);
      c.quadraticCurveTo(x - W + 2, y - 20, x - W + 10, y - 16);
      c.stroke();
    });
    R.glow((c) => {
      c.fillStyle = 'rgba(255,248,220,0.12)';
      c.beginPath();
      c.ellipse(x - W + 4, -17, 10, 15, 0, 0, Math.PI * 2);
      c.fill();
    });
  }
}

export function drawCemetery(R, g, { k = 0, t = g?.time ?? 0, filled, stones, lowered } = {}) {
  const origin = END.cemetery[0] - 800;
  const cx = R.cam.x;
  // sunrise sky, a bright haze in the gaps of the vine
  T.sky(R, [[0, rgbHex(mixc([140, 176, 214], [150, 190, 226], k))], [0.45, '#f5dcae'], [0.8, '#fbe6bb']], { sun: [0.9, 0.2], warmth: lerp(1.0, 0.7, k), clouds: 0.35, cloudLit: [255, 238, 205], cloudShade: [210, 186, 170] });
  farShift(R, origin, () => {
    horizon(R, { haze: [244, 222, 184], shade: [150, 150, 148], cloud: [255, 244, 224], span: 4200, seed: 9, t, lite: g?.settings?.get?.('quality') === 'low' });
    // the town, damaged and standing, far to the left, faintly smoking, caught by the sun
    T.skyline(R, { depth: 0.22, y: -10, color: '#b9a089', seed: 63, x0: -3000, x1: 5000, minarets: [-600, 700], haze: ['#f2dcb4', 0.45] });
  });
  farShift(R, origin, () => {
    for (const [px, h, w, a] of [[-1020, 360, 70, 0.55], [-640, 270, 60, 0.45], [-180, 200, 50, 0.38]]) T.plume(R, px, 30, t, { depth: 0.22, age: 1, color: [224, 204, 176], height: h, width: w, alpha: a });
  });
  // the orchards beyond the wall, three ranks growing hazier with distance
  farShift(R, origin, () => {
    orchardTrees(R, 0.42, 20, 150, '#68804a', 3, 120, '#f0deb0', 0.3, 0.4);
    orchardTrees(R, 0.7, 4, 190, '#5a7640', 4, 150, '#f0deb0', 0.18, 0.4);
  });
  // a field of dry gold behind the wall
  if (seen(R, GATE_X, END.cemetery[0] + 800)) {
    R.paint((c) => {
      const f = c.createLinearGradient(0, -60, 0, -20);
      f.addColorStop(0, 'rgba(206,182,110,0)');
      f.addColorStop(1, 'rgba(206,182,110,0.6)');
      c.fillStyle = f;
      c.fillRect(cx - 1000, -60, 2000, 44);
    });
  }
  // trees right behind the wall: fig, pomegranate, apricot, their canopies in the sun
  R.paint((c) => {
    cells(R, 1, 210, 12, (i, x, r) => {
      const h = 150 + r() * 70;
      const tx = x + r() * 120;
      c.fillStyle = '#4b3a2a';
      c.fillRect(tx - 5, -h * 0.55, 10, h * 0.55 + 10);
      for (let b = 0; b < 9; b++) {
        const a = (b / 9) * 6.283 + r();
        const rr = 36 + r() * 24;
        c.fillStyle = mixHex(['#5f7a3c', '#6e8844', '#52703a'][b % 3], '#a2b866', r() * 0.35);
        c.beginPath();
        c.arc(tx + Math.cos(a) * 52, -h * 0.82 + Math.sin(a) * 34, rr, 0, Math.PI * 2);
        c.fill();
      }
      if (r() < 0.4) {
        c.fillStyle = '#b8402e';
        for (let q = 0; q < 4; q++) {
          c.beginPath();
          c.arc(tx + (r() - 0.5) * 90, -h * 0.82 + (r() - 0.3) * 50, 4, 0, 6.283);
          c.fill();
        }
      }
    });
  });
  cemeteryWall(R);
  cemeteryGround(R);
  dapples(R, t);

  // the back row of graves, further in, then the front row
  const oldBack = [[-540, 0], [-420, 1], [-300, 2], [310, 3], [430, 0], [550, 1]];
  const newBack = [[-170, 1], [190, 2]];
  for (const [dx, kind] of oldBack) oldGrave(R, GRAVE_X + dx, kind, true, 3 + kind + ((dx / 10) | 0));
  for (const [dx, kind] of newBack) newGrave(R, GRAVE_X + dx, kind, true, 7 + kind + ((dx / 10) | 0));
  const oldFront = [[-560, 2], [-440, 0], [-320, 1], [420, 2]];
  const newFront = [[-196, 0], [312, 1]];
  for (const [dx, kind] of oldFront) if (seen(R, GRAVE_X + dx - 100, GRAVE_X + dx + 100)) oldGrave(R, GRAVE_X + dx, kind, false, 5 + kind + ((Math.abs(dx) / 10) | 0));
  for (const [dx, kind] of newFront) if (seen(R, GRAVE_X + dx - 100, GRAVE_X + dx + 100)) newGrave(R, GRAVE_X + dx, kind, false, 11 + kind);
  drawGrave(R, GRAVE_X, { filled: filled ?? 0, stones: !!stones, lowered: lowered ?? 0 });

  // the arbour's frame and roof, the vine over all of it
  arbour(R, t);
  vineRoof(R, t, false);
  backlit(R, t);
  hangers(R, t);
  vineRoof(R, t, true);
  T.motes(R, cx, t, 0.9);
}

// ================================================================= the tunnel ==

// The room's floor stands this far above the tunnel floor (y = 0): five steps
// down between them. floorAt(x) is the walking surface along the whole set.
export const TUNNEL_DROP = 115;
export const STEPS = { x0: TUNNEL.steps, x1: TUNNEL.steps + 300, n: 6 };
export const TUNNEL_END = END.tunnel[0] + END.tunnel[1];
export function floorAt(x) {
  if (x <= STEPS.x0) return -TUNNEL_DROP;
  if (x >= STEPS.x1) return 0;
  const run = (STEPS.x1 - STEPS.x0) / STEPS.n;
  const i = Math.floor((x - STEPS.x0) / run);
  return -TUNNEL_DROP + ((i + 1) * TUNNEL_DROP) / STEPS.n;
}

let LAST_LIGHT = 1;
const FRAME_GAP = 150;
const TUN_H = 192; // inside height at the props
const TUN_D = 84; // the tunnel's width, drawn along the oblique depth

export function tunnelLook(g, light = LAST_LIGHT) {
  const px = g.player?.x ?? TUNNEL.mouth;
  const d = Math.max(0, px - TUNNEL.mouth);
  // daylight from the entrance: strong at the mouth, nothing a few hundred units in
  const dayK = light * Math.pow(Math.max(0, 1 - d / 1100), 2);
  const lights = [];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  if (dayK > 0.01) lights.push({ x: Math.min(px - 60, TUNNEL.mouth + 120), y: -110, color: [0.62, 0.7, 0.82], intensity: 0.7 * dayK, radius: 0.3, rim: 0.45 });
  // the grey window up in the room
  if (px < STEPS.x1 + 300) lights.push({ x: TUNNEL.steps - 320, y: floorAt(TUNNEL.steps - 320) - 240, color: [0.6, 0.68, 0.84], intensity: 0.28 * light, radius: 0.25, rim: 0.3 });
  return {
    ambient: [0.05, 0.052, 0.07].map((v) => v * (0.5 + 0.5 * Math.max(light, 0.2))),
    lights,
    groundShadow: 0.7,
    bloom: 0.85,
    exposure: 1.0,
    grain: 0.08,
    grade: { sat: 0.7, contrast: 1.12, lift: 0.004, tint: [0.97, 0.98, 1.02], shadows: [0.92, 0.96, 1.1], highs: [1.06, 1.0, 0.9] },
    // damp air hangs in the tunnel
    fog: { density: 0.1, height: 120, color: [0.1, 0.1, 0.12] },
    fade: g.a?.endFade || 0,
  };
}

// the ceiling's lip at x: arched between the props
const lipY = (x) => {
  const u = ((((x - TUNNEL.mouth) % FRAME_GAP) + FRAME_GAP) % FRAME_GAP) / FRAME_GAP;
  return -(TUN_H + 14) - 26 * Math.sin(u * Math.PI);
};

// The rectangle of grey light behind him, getting smaller as he goes deeper:
// drawn on the far wall, a pale doorway receding. px is the player's x.
export function entranceGlow(R, g, px, light = LAST_LIGHT) {
  const d = Math.max(0, px - TUNNEL.mouth);
  // the real mouth is on screen until he is a few hundred in; then this takes over
  const a = smoothstep(380, 820, d) * (1 - smoothstep(2000, 2700, d)) * light;
  if (a <= 0.01) return;
  const H = 360 * Math.pow(1 + d / 320, -1.5);
  const W = H * 0.58 * (1 / (1 + d / 1400));
  const frac = 0.15 - 0.07 * clamp(d / 2600);
  const wx = R.cam.x - (R.cam.view || 1400) * (0.5 - frac);
  const cy = -100;
  R.glow((c) => {
    // the bloom, then the doorway itself, its edges soft
    const gr = c.createRadialGradient(wx, cy, 0, wx, cy, Math.max(30, H * 1.1));
    gr.addColorStop(0, `rgba(190,208,226,${0.4 * a})`);
    gr.addColorStop(1, 'rgba(190,208,226,0)');
    c.fillStyle = gr;
    c.fillRect(wx - H * 1.2, cy - H * 1.2, H * 2.4, H * 2.4);
    c.save();
    c.shadowColor = `rgba(205,222,238,${0.9 * a})`;
    c.shadowBlur = Math.max(3, H * 0.12);
    c.fillStyle = `rgba(214,228,240,${0.92 * a})`;
    c.beginPath();
    c.moveTo(wx - W / 2, cy + H / 2);
    c.lineTo(wx - W / 2, cy - H / 2 + W * 0.3);
    c.quadraticCurveTo(wx, cy - H / 2 - W * 0.12, wx + W / 2, cy - H / 2 + W * 0.3);
    c.lineTo(wx + W / 2, cy + H / 2);
    c.closePath();
    c.fill();
    c.restore();
    // its light along the floor, ahead of it: a pale path leading out
    const fg = c.createLinearGradient(wx, 0, wx + 700, 0);
    fg.addColorStop(0, `rgba(170,190,212,${0.2 * a})`);
    fg.addColorStop(1, 'rgba(170,190,212,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(wx - W / 2, cy + H / 2);
    c.lineTo(wx + W / 2, cy + H / 2);
    c.lineTo(wx + 700 + TUN_D * DEPTH.x, -TUN_D * 0.4 * 0.5);
    c.lineTo(wx + 700, 0);
    c.lineTo(wx, 0);
    c.closePath();
    c.fill();
  });
}

// scratched into concrete: pale where the surface is broken, a dark edge
function scratched(c, text, x, y, size) {
  c.save();
  c.font = `${size}px "Aref Ruqaa", "Noto Naskh Arabic", "Noto Sans Arabic", serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.direction = 'rtl';
  const r = rng(99);
  // the dark groove, the pale lip, and the scatter of a nail
  c.fillStyle = 'rgba(20,18,16,0.7)';
  c.fillText(text, x + 1.2, y + 1.2);
  c.fillStyle = 'rgba(210,205,190,0.75)';
  c.fillText(text, x - 0.5, y - 0.5);
  c.strokeStyle = 'rgba(170,166,154,0.55)';
  c.lineWidth = 1.1;
  c.strokeText(text, x, y);
  c.fillStyle = 'rgba(220,214,198,0.5)';
  for (let i = 0; i < 40; i++) c.fillRect(x - size * 1.7 + r() * size * 3.4, y - size * 0.5 + r() * size, 1.2, 1.2);
  c.restore();
}

export function drawTunnel(R, g, { k = 0, t = g?.time ?? 0, light = 1 } = {}) {
  LAST_LIGHT = light;
  const S0 = STEPS.x0;
  const S1 = STEPS.x1;
  const M = TUNNEL.mouth;
  const XR = TUNNEL_END + 200;
  const XL = END.tunnel[0] - END.tunnel[1] - 500;
  const px = g?.player?.x ?? M;
  const cx = R.cam.x;
  const vx0 = cx - halfView(R) - 150;
  const vx1 = cx + halfView(R) + 150;
  const roomTop = -TUNNEL_DROP - 292;
  void k;

  // the dark behind everything
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#05060a';
    c.fillRect(0, 0, R.W, R.H);
    c.restore();
  });
  R.paint((c) => {
    c.fillStyle = '#0a0908';
    c.fillRect(vx0, -900, vx1 - vx0, 1400);
  });

  // ---- the building: its back wall, bare concrete, from the room to the foot of the steps
  const wallR = M + 64;
  if (vx0 < wallR) {
    const a = Math.max(vx0, XL);
    R.paint((c) => {
      const g1 = c.createLinearGradient(0, roomTop, 0, 0);
      g1.addColorStop(0, '#34322f');
      g1.addColorStop(0.7, '#403e3a');
      g1.addColorStop(1, '#2c2a27');
      c.fillStyle = g1;
      c.fillRect(a, roomTop, wallR - a, -roomTop);
      // damp, stains, plaster fallen to the blocks beneath
      const r = rng(13);
      for (let i = 0; i < 46; i++) {
        const x = a + r() * (wallR - a);
        if (x > wallR) continue;
        c.fillStyle = r() < 0.5 ? 'rgba(90,86,78,0.22)' : 'rgba(10,8,6,0.3)';
        c.fillRect(x, roomTop + r() * -roomTop, 18 + r() * 70, 10 + r() * 50);
      }
      // a dado line of old paint, and its tide mark
      c.fillStyle = 'rgba(70,84,80,0.35)';
      c.fillRect(a, -TUNNEL_DROP - 130, wallR - a, 6);
    });
    R.surface((c) => c.rect(a, roomTop, wallR - a, -roomTop), 'concrete', { scale: 1.2, seed: 6, alpha: 0.9 });
    R.paint((c) => {
      // bullet pocks, the electrics torn out, a cable hanging
      const r = rng(15);
      c.fillStyle = 'rgba(14,12,10,0.7)';
      for (let q = 0; q < 3; q++) {
        const ox = a + 200 + r() * 800;
        const oy = -TUNNEL_DROP - 60 - r() * 180;
        for (let i = 0; i < 12; i++) {
          c.beginPath();
          c.arc(ox + (r() - 0.5) * 60, oy + (r() - 0.5) * 40, 1.4 + r() * 2.2, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = '#58554d';
      c.fillRect(TUNNEL.steps - 520, -TUNNEL_DROP - 100, 16, 22);
      c.strokeStyle = '#1a1816';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(TUNNEL.steps - 512, -TUNNEL_DROP - 78);
      c.quadraticCurveTo(TUNNEL.steps - 500, -TUNNEL_DROP - 50, TUNNEL.steps - 520, -TUNNEL_DROP - 30);
      c.stroke();
    });
    // the high window: a slot of grey dawn
    const wxs = TUNNEL.steps - 320;
    R.paint((c) => {
      c.fillStyle = '#10151c';
      c.fillRect(wxs - 40, -TUNNEL_DROP - 270, 80, 34);
    });
    R.glow((c) => {
      const gl = 0.8 * light;
      c.fillStyle = `rgba(150,172,200,${0.7 * gl})`;
      c.fillRect(wxs - 38, -TUNNEL_DROP - 268, 76, 30);
      // its bar of light slanting down across the floor
      const sg = c.createLinearGradient(wxs, -TUNNEL_DROP - 240, wxs + 160, -TUNNEL_DROP);
      sg.addColorStop(0, `rgba(150,172,200,${0.2 * gl})`);
      sg.addColorStop(1, `rgba(150,172,200,${0.05 * gl})`);
      c.fillStyle = sg;
      c.beginPath();
      c.moveTo(wxs - 38, -TUNNEL_DROP - 238);
      c.lineTo(wxs + 38, -TUNNEL_DROP - 238);
      c.lineTo(wxs + 230, -TUNNEL_DROP);
      c.lineTo(wxs + 70, -TUNNEL_DROP);
      c.closePath();
      c.fill();
    });
  }

  // ---- the room's ceiling slab and the floor: dark concrete, with its thickness
  R.cast((c) => {
    const a = Math.max(vx0, XL);
    // ceiling
    if (vx0 < wallR) {
      extrudeRect(c, a, roomTop - 26, wallR - a, 26, 22, { color: '#4a4844' });
      c.fillStyle = '#4a4844';
      c.fillRect(a, roomTop - 26, wallR - a, 26);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(a, roomTop - 8, wallR - a, 8);
    }
    // the floor: concrete slab to the steps' head, crumbled at its edge
    const fl = -TUNNEL_DROP;
    if (a < S0) {
      const pts = [[a, fl], [S0, fl], [S0 + 4, fl + 6], [S0 - 3, fl + 12], [S0 + 3, fl + 20], [S0 - 4, fl + 28], [S0, fl + 34], [a, fl + 34]];
      extrudePoly(c, pts, 26, { top: '#7a766a', side: '#2c2a26' });
      c.fillStyle = '#5c5a54';
      poly(c, pts);
      c.fill();
      c.fillStyle = 'rgba(220,214,196,0.16)';
      for (let tx = Math.floor(a / 40) * 40; tx < S0; tx += 40) c.fillRect(tx + 1, fl, 38, 3);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(a, fl + 22, S0 - a, 12);
      // rebar at the broken edge
      c.strokeStyle = '#3a2d26';
      c.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(S0 - 2, fl + 8 + i * 8);
        c.lineTo(S0 + 10 + i * 4, fl + 12 + i * 9);
        c.stroke();
      }
    }
  });
  // the foundation below the room's floor, and below the steps: cut earth and rubble
  R.paint((c) => {
    const a = Math.max(vx0, XL);
    const fl = -TUNNEL_DROP;
    const g1 = c.createLinearGradient(0, fl + 34, 0, 160);
    g1.addColorStop(0, '#2a241f');
    g1.addColorStop(1, '#0d0b09');
    c.fillStyle = g1;
    c.fillRect(a, fl + 30, Math.min(S0, vx1) - a, 400);
    // the earth under the steps
    c.fillStyle = '#26201a';
    c.beginPath();
    c.moveTo(S0, fl + 30);
    c.lineTo(S1, 0);
    c.lineTo(S1, 400);
    c.lineTo(S0, 400);
    c.closePath();
    c.fill();
    const r = rng(19);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(120,96,70,0.2)' : 'rgba(0,0,0,0.3)';
      const x = a + r() * (S1 - a);
      c.beginPath();
      c.ellipse(x, fl + 40 + r() * 130, 8 + r() * 24, 3 + r() * 7, 0, 0, Math.PI * 2);
      c.fill();
    }
  });

  // ---- the open hatch door and the steps
  if (seen(R, S0 - 120, S1 + 100)) {
    // steps: timber risers, earth treads, worn at the middle
    R.cast((c) => {
      const run = (S1 - S0) / STEPS.n;
      const rise = TUNNEL_DROP / STEPS.n;
      for (let i = 0; i < STEPS.n; i++) {
        const x = S0 + i * run;
        const y = -TUNNEL_DROP + (i + 1) * rise;
        // each step's block: earth tread, a plank riser, its thickness behind
        extrudeRect(c, x, y, run, 400, 40, { color: '#5b4630', topK: 1.18, sideK: 0.5 });
        c.fillStyle = '#6b5339';
        c.fillRect(x, y, run, 18);
        c.fillStyle = 'rgba(255,230,180,0.14)';
        c.fillRect(x + 2, y, run - 4, 2.5);
        c.fillStyle = '#4a3827';
        c.fillRect(x, y + 3, 5, rise); // the plank holding it
        c.fillStyle = '#251d16';
        c.fillRect(x, y + 18, run, 400);
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + 4, y + 8);
        c.lineTo(x + 4 + run * 0.4, y + 9);
        c.stroke();
      }
    });
    // the wooden door: stood open at the head of the steps, leaning on the wall
    R.cast((c) => {
      c.save();
      c.translate(S0 - 22, -TUNNEL_DROP);
      c.rotate(-0.11);
      const dw = 64;
      const dh = 176;
      const pts = [[0, 0], [0, -dh], [dw, -dh], [dw, 0]];
      // seen along its edge, the door shows its face as a long parallelogram
      extrudePoly(c, pts, 6, { color: '#7a5b3a', topK: 1.1, sideK: 0.5 });
      c.fillStyle = '#7a5b3a';
      poly(c, pts);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)';
      for (const [a, b] of [[8, 28], [36, 56]]) c.fillRect(a, -dh + 14, b - a, dh - 28);
      c.fillStyle = 'rgba(210,184,140,0.14)';
      for (const [a, b] of [[8, 28], [36, 56]]) c.fillRect(a, -dh + 14, 1.6, dh - 28);
      c.fillStyle = '#2a2420';
      c.fillRect(dw - 14, -88, 6, 10);
      c.fillRect(-1, -dh + 18, 12, 4);
      c.fillRect(-1, -40, 12, 4);
      c.restore();
    });
  }

  // ---- the wall at the foot of the steps, where someone scratched their words
  const W = TUNNEL.wall;
  if (seen(R, W - 140, W + 140)) {
    R.paint((c) => {
      // a patch of pale, newer render where the concrete was dressed, to scratch on
      c.fillStyle = 'rgba(120,118,108,0.35)';
      c.beginPath();
      c.moveTo(W - 78, -8);
      c.lineTo(W - 74, -112);
      c.lineTo(W + 70, -118);
      c.lineTo(W + 76, -6);
      c.closePath();
      c.fill();
      scratched(c, 'لا تنسونا', W, -64, 34);
    });
  }

  // ---- the tunnel: the cut earth above and below, the far wall, the floor
  const a0 = Math.max(M, vx0);
  const b0 = Math.min(XR, vx1);
  if (b0 > a0) {
    const dd = TUN_D;
    const ox = DEPTH.x * dd;
    const oy = DEPTH.y * dd;
    // the cut face of the earth above the ceiling's lip, between the props
    R.cast((c) => {
      // below the floor: the cut face under the tunnel
      c.fillStyle = '#2b2219';
      c.fillRect(a0, 0, b0 - a0, 400);
      const gg = c.createLinearGradient(0, 0, 0, 160);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      gg.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = gg;
      c.fillRect(a0, 0, b0 - a0, 400);
    });
    R.paint((c) => {
      // the far wall: packed earth, darker towards the ceiling
      const fw = c.createLinearGradient(0, -170, 0, -30);
      fw.addColorStop(0, '#2b2118');
      fw.addColorStop(0.6, '#43342a');
      fw.addColorStop(1, '#4e3d2e');
      c.fillStyle = fw;
      c.fillRect(a0, -240, b0 - a0, 240);
      const r = rng(21);
      // the pick's marks, ruts, small stones, damp
      for (let x = Math.floor(a0 / 30) * 30; x < b0; x += 30) {
        const q = rng((x * 5 + 3) | 0);
        for (let i = 0; i < 4; i++) {
          const yy = -40 - q() * 150;
          c.fillStyle = q() < 0.5 ? 'rgba(120,96,70,0.22)' : 'rgba(0,0,0,0.3)';
          c.beginPath();
          c.ellipse(x + q() * 30, yy, 5 + q() * 12, 1.5 + q() * 3.5, (q() - 0.5) * 0.5, 0, Math.PI * 2);
          c.fill();
        }
        if (q() < 0.18) {
          c.fillStyle = `rgba(${110 + q() * 30},${98 + q() * 26},${80 + q() * 24},0.8)`;
          c.beginPath();
          c.ellipse(x + q() * 30, -50 - q() * 130, 3 + q() * 5, 2 + q() * 3, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      void r;
      // a cable pinned along the wall, with its insulators, running on into the dark
      c.strokeStyle = '#17140f';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(a0, -150);
      for (let x = Math.floor(a0 / 150) * 150; x < b0 + 150; x += 150) c.quadraticCurveTo(x + 75, -144, x + 150, -150);
      c.stroke();
      c.fillStyle = '#8a8a82';
      for (let x = Math.floor(a0 / 150) * 150; x < b0 + 150; x += 150) c.fillRect(x - 1.5, -153, 3, 6);
      // the floor strip, from the near edge back to the far wall: packed dirt worn
      // to a pale smooth track down its middle
      const fg = c.createLinearGradient(0, 0, 0, oy);
      fg.addColorStop(0, '#6a553d');
      fg.addColorStop(1, '#4a3b2b');
      c.fillStyle = fg;
      c.beginPath();
      c.moveTo(a0, 0);
      c.lineTo(b0, 0);
      c.lineTo(b0 + ox, oy);
      c.lineTo(a0 + ox, oy);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(205,184,148,0.16)';
      c.beginPath();
      c.moveTo(a0 + ox * 0.3, oy * 0.3 - 3);
      c.lineTo(b0 + ox * 0.3, oy * 0.3 - 3);
      c.lineTo(b0 + ox * 0.62, oy * 0.62 + 3);
      c.lineTo(a0 + ox * 0.62, oy * 0.62 + 3);
      c.closePath();
      c.fill();
      // footprints in it, one way
      c.fillStyle = 'rgba(30,22,14,0.35)';
      for (let x = Math.floor(a0 / 46) * 46; x < b0; x += 46) {
        const q = rng((x * 3 + 8) | 0);
        c.beginPath();
        c.ellipse(x + q() * 10, -9 - q() * 14, 8, 2.4, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
    R.surface((c) => c.rect(a0, -240, b0 - a0, 240), 'concrete', { scale: 1.1, seed: 9, alpha: 0.4 });
    // above the lip: the cut face of the earth, strata and roots
    R.cast((c) => {
      c.beginPath();
      c.moveTo(a0, -720);
      c.lineTo(b0, -720);
      for (let x = b0; x >= a0; x -= 10) c.lineTo(x, lipY(x));
      c.closePath();
      c.fillStyle = '#4f3d2b';
      c.fill();
      c.save();
      c.clip();
      const gg = c.createLinearGradient(0, -520, 0, -190);
      gg.addColorStop(0, 'rgba(0,0,0,0.55)');
      gg.addColorStop(0.7, 'rgba(0,0,0,0.05)');
      gg.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = gg;
      c.fillRect(a0, -720, b0 - a0, 540);
      const r = rng(25);
      for (let i = 0; i < 18; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(150,120,86,0.18)' : 'rgba(10,6,2,0.28)';
        const y = -230 - i * 24 - r() * 10;
        c.beginPath();
        c.moveTo(a0, y);
        for (let x = a0; x < b0; x += 60) c.lineTo(x, y + Math.sin(x * 0.011 + i) * 7 + (r() - 0.5) * 3);
        c.lineTo(b0, y + 5 + r() * 6);
        for (let x = b0; x > a0; x -= 60) c.lineTo(x, y + 5 + r() * 6 + Math.sin(x * 0.013 + i) * 4);
        c.closePath();
        c.fill();
      }
      for (let x = Math.floor(a0 / 60) * 60; x < b0; x += 60) {
        const q = rng((x * 11 + 2) | 0);
        if (q() < 0.4) {
          c.fillStyle = `rgba(${120 + q() * 30},${106 + q() * 24},${86 + q() * 20},0.8)`;
          c.beginPath();
          c.ellipse(x + q() * 60, -250 - q() * 240, 5 + q() * 12, 3 + q() * 8, q() * 3, 0, Math.PI * 2);
          c.fill();
        }
        if (q() < 0.35) {
          // a root coming through the roof
          c.strokeStyle = 'rgba(140,110,76,0.8)';
          c.lineWidth = 1.2 + q();
          c.beginPath();
          const rx = x + q() * 60;
          c.moveTo(rx, lipY(rx) - 4);
          c.bezierCurveTo(rx + (q() - 0.5) * 20, lipY(rx) + 14, rx + (q() - 0.5) * 30, lipY(rx) + 24, rx + (q() - 0.5) * 20, lipY(rx) + 30 + q() * 24);
          c.stroke();
        }
      }
      c.restore();
      // the roof's lip, a darker shadow line, with the earth lagging between props
      c.strokeStyle = 'rgba(0,0,0,0.55)';
      c.lineWidth = 6;
      c.beginPath();
      for (let x = a0; x <= b0; x += 10) c.lineTo(x, lipY(x));
      c.stroke();
      c.strokeStyle = 'rgba(190,150,104,0.14)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let x = a0; x <= b0; x += 10) c.lineTo(x, lipY(x) - 3.5);
      c.stroke();
    });
    R.surface(
      (c) => {
        c.moveTo(a0, -720);
        c.lineTo(b0, -720);
        for (let x = b0; x >= a0; x -= 20) c.lineTo(x, lipY(x));
        c.closePath();
      },
      'concrete',
      { scale: 1.3, seed: 12, alpha: 0.5 },
    );
  }

  // the daylight rectangle behind him, between the far wall and the props
  entranceGlow(R, g, px, light);

  // ---- the mouth: heavy timber portal where the building ends and the earth begins
  if (seen(R, M - 100, M + 120)) {
    R.cast((c) => {
      // the lintel, running in, and two posts
      extrudeRect(c, M - 14, -TUN_H - 28, 140, 26, 40, { color: '#6a5033', topK: 1.2 });
      c.fillStyle = '#6a5033';
      c.fillRect(M - 14, -TUN_H - 28, 140, 26);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(M - 14, -TUN_H - 8, 140, 6);
      extrudeRect(c, M - 12, -TUN_H, 22, TUN_H, 40, { color: '#6a5033' });
      c.fillStyle = '#6a5033';
      c.fillRect(M - 12, -TUN_H, 22, TUN_H);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(M + 4, -TUN_H, 6, TUN_H);
      c.fillStyle = 'rgba(225,190,140,0.14)';
      c.fillRect(M - 12, -TUN_H, 2, TUN_H);
      // wedges and nails
      c.fillStyle = '#1c1612';
      for (const yy of [-TUN_H + 14, -TUN_H + 90, -26]) c.fillRect(M - 4, yy, 3, 3);
      c.fillStyle = '#7e623f';
      c.beginPath();
      c.moveTo(M + 10, -TUN_H + 4);
      c.lineTo(M + 54, -TUN_H + 4);
      c.lineTo(M + 10, -TUN_H + 48);
      c.closePath();
      c.fill();
    });
  }

  // ---- the props, every ~150: a near post, a far post, and the cap beam between
  R.cast((c) => {
    const dd = TUN_D;
    const ox = DEPTH.x * dd;
    const oy = DEPTH.y * dd;
    const ph = TUN_H - 14;
    const first = Math.floor((Math.max(M, vx0) - M) / FRAME_GAP) + 1;
    for (let i = first; M + i * FRAME_GAP < Math.min(XR, vx1); i++) {
      const x = M + i * FRAME_GAP;
      const q = rng(i * 313 + 7);
      const lean = (q() - 0.5) * 3;
      const col = q() < 0.5 ? '#6a5033' : '#5d452c';
      // the far post
      c.fillStyle = mixHex(col, '#000000', 0.35);
      c.beginPath();
      c.moveTo(x + ox - 7, oy);
      c.lineTo(x + ox + 7, oy);
      c.lineTo(x + ox + 7 + lean, oy - ph);
      c.lineTo(x + ox - 7 + lean, oy - ph);
      c.closePath();
      c.fill();
      // the cap beam running across, seen as a band back to the far post
      c.fillStyle = mixHex(col, '#000000', 0.2);
      c.beginPath();
      c.moveTo(x - 8, -ph);
      c.lineTo(x + 8, -ph);
      c.lineTo(x + ox + 8, oy - ph);
      c.lineTo(x + ox - 8, oy - ph);
      c.closePath();
      c.fill();
      c.fillStyle = mixHex(col, '#ffffff', 0.12);
      c.beginPath();
      c.moveTo(x - 9, -ph - 14);
      c.lineTo(x + 9, -ph - 14);
      c.lineTo(x + 9, -ph + 2);
      c.lineTo(x - 9, -ph + 2);
      c.closePath();
      c.fill();
      // the near post, full height, its right side in shade
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x - 9, 0);
      c.lineTo(x + 9, 0);
      c.lineTo(x + 9 + lean, -ph);
      c.lineTo(x - 9 + lean, -ph);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.26)';
      c.fillRect(x + 3, -ph, 6, ph);
      c.fillStyle = 'rgba(235,200,150,0.14)';
      c.fillRect(x - 9, -ph, 2, ph);
      // a wedge to bind the beam, a nail
      c.fillStyle = '#7a5f3d';
      c.beginPath();
      c.moveTo(x + 9, -ph + 2);
      c.lineTo(x + 40, -ph + 2);
      c.lineTo(x + 9, -ph + 34);
      c.closePath();
      c.fill();
      c.fillStyle = '#1c1612';
      c.fillRect(x - 2, -ph + 8, 3, 3);
    }
  });

  // things left in the tunnel: a plank, a bucket, a bottle, a sandbag, a hung lantern
  R.cast((c) => {
    for (const [dx, kind] of [[330, 0], [610, 1], [980, 2], [1290, 3], [1610, 0]]) {
      const x = M + dx;
      if (x < vx0 - 80 || x > vx1 + 80) continue;
      if (kind === 0) {
        // a plank on the floor and a coil of rope
        c.fillStyle = '#5a4630';
        c.fillRect(x, -5, 90, 5);
        c.strokeStyle = '#9a8660';
        c.lineWidth = 2.4;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.ellipse(x + 108, -6, 14 - i * 3, 4.5 - i, 0, 0, Math.PI * 2);
          c.stroke();
        }
      } else if (kind === 1) {
        extrudePoly(c, [[x - 11, -22], [x + 11, -22], [x + 8, 0], [x - 8, 0]], 14, { color: '#6c6c68' });
        c.fillStyle = '#6c6c68';
        poly(c, [[x - 11, -22], [x + 11, -22], [x + 8, 0], [x - 8, 0]]);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.2)';
        c.fillRect(x - 9, -21, 3, 20);
      } else if (kind === 2) {
        c.fillStyle = 'rgba(160,196,214,0.8)';
        c.fillRect(x, -26, 9, 26);
        c.fillRect(x + 2.5, -34, 4, 9);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fillRect(x + 1.5, -24, 2, 20);
      } else {
        const sb = (bx, by, k2) => {
          c.fillStyle = k2 ? '#8a7e62' : '#7c7156';
          c.beginPath();
          c.ellipse(bx, by, 24, 11, 0.04, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = 'rgba(30,24,16,0.4)';
          c.beginPath();
          c.moveTo(bx - 16, by);
          c.lineTo(bx + 16, by - 1);
          c.stroke();
        };
        sb(x, -10, 0);
        sb(x + 40, -10, 1);
        sb(x + 18, -30, 0);
      }
    }
  });
  // the tunnel curves away: its far end is black
  if (vx1 > TUNNEL_END - 700) {
    R.paint((c) => {
      const x0 = TUNNEL_END - 700;
      const g1 = c.createLinearGradient(x0, 0, XR, 0);
      g1.addColorStop(0, 'rgba(2,2,3,0)');
      g1.addColorStop(0.55, 'rgba(2,2,3,0.78)');
      g1.addColorStop(1, 'rgba(2,2,3,1)');
      c.fillStyle = g1;
      c.fillRect(x0, -760, XR - x0, 1000);
    });
  }
  // dust turning in the air, only where light touches it
  R.glow((c) => {
    const r = rng(41);
    for (let i = 0; i < 40; i++) {
      const bx = cx + (r() - 0.5) * 1300;
      const by = -TUN_H + r() * (TUN_H - 20);
      const dx = Math.sin(t * 0.3 + i) * 10;
      const dy = Math.cos(t * 0.23 + i * 1.3) * 8;
      c.fillStyle = `rgba(210,200,176,${0.04 + 0.05 * Math.sin(t * 0.7 + i)})`;
      c.fillRect(bx + dx, by + dy, 1.6, 1.6);
    }
  });
}
