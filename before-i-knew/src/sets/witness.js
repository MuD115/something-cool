// Act 2, Path B (the Witness): the southern quarter, 4:35 to 5:35 pm, and
// Um Said's room. script/act2.md, 2B-1 to 2B-3.
//
// The same quarter, the same hour, as Act Two's Retrieval, but we are in the
// quiet part now: people have gone indoors after the sniper. The sun is low
// and to the RIGHT, so every shadow is thrown long to the left. From the
// left to the right:
//
//   a woman's doorway -> Um Said's flat (a green door, ajar; curtains drawn)
//   -> Abu Firas's courtyard (a clay oven of stones and concrete, a hand
//   mill, loaves cooling) -> the wall of children's drawings, with a low
//   wall to sit on -> a balcony with what is left of it, and laundry ->
//   a building with its face torn off -> a gap, and School Street far off
//   with a small dark shape under a blanket -> a side alley -> rubble.
//
// World units: ground at y = 0, up is negative, a man is 170 tall. Nothing
// here draws a person: the story spawns the rigs, and this set only lights
// them and throws their shadows.

import { lerp, clamp, rng, mixc } from '../engine/util.js';
import * as T from './town.js';
import { horizon, rgbOf } from './horizon.js';
import { depthCast } from '../engine/dof.js';
import { extrudePoly, extrudeRect } from './depth.js';
import { XW, UM_SAID } from '../story/act2bc-map.js';
import * as A from './ambient.js';

const CONC = T.CONCRETE;
const TAU = Math.PI * 2;

// ------------------------------------------------------------ the places --

// Where things stand, so the set and the story agree.
const OVEN = { x: XW.bakery - 105, mouthY: -92 }; // centre of the clay oven, and the glow of its mouth
const WALL = { x0: 2395, x1: 2765, h: 255 }; // the wall of drawings
const SIT = { x0: 2455, x1: 2715, h: 46 }; // the low wall in front of it
const BALC = { x: XW.balcony, y: -224 }; // the balcony slab: the first floor, over the ground-floor shopfront (was -148)
const LEDGE = { x0: XW.balcony + 30, x1: XW.balcony + 190, h: 44 }; // the ledge below it, to sit on
const TORN = { x0: 3300, x1: 3640, fh: 224 }; // a storey is 224 now (was 140)
const GAP = { x0: 3830, x1: 4070 }; // between buildings: School Street, far off
const ALLEY = { x0: XW.alley - 100, x1: XW.alley + 100 };
const MILL = { x: XW.bakery + 62, y: -82 }; // the hand mill, on its table

// The façades, left to right. The gaps (the courtyard, the wall, the torn
// building, the view and the alley) are drawn by their own functions.
const BLOCKS = [
  { x: -1700, w: 420, floors: 4, seed: 81, color: CONC[1], holes: [[0.4, 0.4, 24]] },
  { x: -1280, w: 380, floors: 3, seed: 82, color: CONC[3], laundry: true, balcony: [1, 0.5, 0.05] },
  { x: -900, w: 360, floors: 4, seed: 83, color: CONC[0], dishes: [[0.5, 3]] },
  { x: -540, w: 300, floors: 3, seed: 84, color: CONC[4] },
  { x: -240, w: 380, floors: 4, seed: 85, color: CONC[2], dishes: [[0.3, 2]] },
  { x: 140, w: 240, floors: 3, seed: 86, color: CONC[5], holes: [[0.5, 0.5, 26]] },
  { x: 380, w: 300, floors: 3, seed: 87, color: CONC[3], shopFront: true }, // the woman's doorway is in this
  { x: 680, w: 320, floors: 4, seed: 88, color: CONC[0], dishes: [[0.7, 3]], laundry: true, balcony: [2, 0.3, 0.04] },
  { x: 1000, w: 330, floors: 3, seed: 89, color: CONC[5], shopFront: true }, // Um Said's flat
  { x: 1330, w: 290, floors: 4, seed: 90, color: CONC[1], holes: [[0.3, 0.45, 30]], torn: 0.3, tornLeft: false },
  { x: 2160, w: 235, floors: 3, seed: 91, color: CONC[4], dishes: [[0.4, 2]] },
  { x: 2780, w: 480, floors: 3, seed: 92, color: CONC[2], shopFront: true, holes: [[0.55, 0.62, 26], [0.15, 0.3, 18]] }, // the balcony
  { x: 3640, w: 190, floors: 4, seed: 93, color: CONC[3] },
  { x: 4070, w: 330, floors: 4, seed: 94, color: CONC[0], balcony: [3, 0.6, 0.05], laundry: true },
  { x: 4600, w: 360, floors: 3, seed: 95, color: CONC[5], dishes: [[0.5, 2]] },
  { x: 4960, w: 300, floors: 3, seed: 96, color: CONC[1], torn: 0.55, tornLeft: true },
  { x: 5260, w: 420, floors: 4, seed: 97, color: CONC[4], holes: [[0.5, 0.4, 28]] },
  { x: 5680, w: 380, floors: 3, seed: 98, color: CONC[2] },
  { x: 6060, w: 400, floors: 4, seed: 99, color: CONC[0] },
];

// ---------------------------------------------------------------- ground --

export function surfaceAt(x) {
  if (x > TORN.x0 - 80 && x < TORN.x1 + 60) return 'rubble';
  if (x > 4980 && x < 5300) return 'rubble';
  if (x > XW.bakery - 230 && x < XW.bakery + 300) return 'grit'; // the courtyard's packed earth
  if (x > XW.wall - 60 && x < XW.wall + 60) return 'grit';
  return 'grit';
}

// ----------------------------------------------------------------- light --

// The sun: low, and to the right. k 0 = 4:35 pm, 1 = 5:35 pm, when it is
// perhaps forty-five minutes from setting and everything has gone deep amber.
const sunUv = (k) => [1.04, lerp(0.02, 0.3, k)];
// Shadows are thrown to the LEFT (a positive shear), longer as it sinks.
export const shearFor = (k) => 2.1 + 1.5 * clamp(k);
const SQUASH = 0.1;

export function quarterLook(g, k = 0) {
  k = clamp(k);
  const fog = g.effects?.fog || 0;
  const uv = sunUv(k);
  const col = mixc([1.0, 0.76, 0.46], [1.0, 0.52, 0.27], k);
  const lights = [
    { uv, color: col, intensity: lerp(1.1, 0.9, k) * (1 - fog * 0.4), radius: 0, rim: lerp(1.0, 1.25, k) },
    { uv: [-0.6, -1.2], color: mixc([0.58, 0.64, 0.86], [0.62, 0.52, 0.66], k), intensity: lerp(0.28, 0.4, k), radius: 0, rim: 0.2 },
  ];
  // one local glow: the oven's mouth, or the lamp inside Um Said's door
  // (lights are few: the nearer of the two)
  const px = g.player?.x ?? 0;
  const flick = 0.85 + 0.15 * Math.sin(g.time * 9.1) * Math.sin(g.time * 5.3 + 1);
  const dOven = Math.abs(px - OVEN.x);
  const dDoor = Math.abs(px - XW.umSaid);
  if (dOven < 1100 && dOven <= dDoor) lights.push({ x: OVEN.x, y: OVEN.mouthY, color: [1, 0.5, 0.2], intensity: 0.95 * flick, radius: 0.15, rim: 0.5 });
  else if (dDoor < 1100) lights.push({ x: XW.umSaid + 10, y: -92, color: [1, 0.62, 0.32], intensity: 0.45, radius: 0.1, rim: 0.4 });
  const torch = g.torchLight?.();
  if (torch && lights.length < 4) lights.push(torch);
  const look = {
    ambient: mixc([0.3, 0.25, 0.26], [0.25, 0.19, 0.2], k),
    lights,
    groundShadow: lerp(0.78, 0.55, k) * (1 - fog * 0.6),
    god: { uv, strength: 0.16 + 0.12 * k + 0.2 * fog },
    bloom: lerp(0.62, 0.72, k),
    exposure: lerp(0.9, 0.84, k),
    grain: 0.05,
    grade: {
      sat: lerp(0.98, 0.94, k),
      contrast: lerp(1.08, 1.05, k),
      lift: 0.004 * k,
      tint: [1, lerp(0.99, 0.97, k), lerp(0.95, 0.93, k)],
      shadows: mixc([0.95, 0.96, 1.06], [0.95, 0.91, 1.02], k),
      highs: mixc([1.08, 1.0, 0.88], [1.12, 0.96, 0.82], k),
    },
    // dust and cooking smoke hanging low in the evening air
    fog: { density: 0.1 + 0.1 * k + 0.2 * fog, height: 130, color: mixc([0.9, 0.68, 0.5], [0.82, 0.52, 0.36], k) },
    time: g.time,
    fade: g.a?.endFade || 0,
  };
  // the camera's shutter: a small, brief white
  const d = g.time - (g.a?.flashAt ?? -9);
  if (d > -0.02 && d < 0.15) {
    const f = 1.5 * (1 - Math.max(0, d) / 0.15); // (added to the light: albedo still shows through)
    look.flash = [f, f, f * 0.96];
  }
  return look;
}

function skyStops(k) {
  const a = [[0, '#5b6e98'], [0.4, '#c6a58e'], [0.72, '#f1b87a']];
  const b = [[0, '#40466e'], [0.4, '#b8706c'], [0.72, '#eb9552']];
  return a.map(([p, ca], i) => {
    const A = [1, 3, 5].map((j) => parseInt(ca.slice(j, j + 2), 16));
    const B = [1, 3, 5].map((j) => parseInt(b[i][1].slice(j, j + 2), 16));
    return [p, `rgb(${A.map((v, j) => Math.round(lerp(v, B[j], k))).join(',')})`];
  });
}

// ------------------------------------------------------------ small tools --

// A crayon line: two passes, a little off each other, never quite straight.
function crayon(c, pts, col, w = 3, seed = 1, j = 1.1) {
  const r = rng(seed);
  c.save();
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.lineWidth = w * (pass ? 0.5 : 1);
    c.globalAlpha = pass ? 0.9 : 0.72;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x + (r() - 0.5) * j * 2;
      const py = y + (r() - 0.5) * j * 2;
      if (i) c.lineTo(px, py);
      else c.moveTo(px, py);
    });
    c.stroke();
  }
  c.restore();
}
function crayonCircle(c, x, y, rad, col, w = 3, seed = 1, over = 0.5) {
  const r = rng(seed);
  const pts = [];
  const n = 22;
  const a0 = r() * TAU;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((i + over * (n * 0.04)) / n) * TAU;
    const rr = rad * (1 + (r() - 0.5) * 0.12 + i * 0.002);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  crayon(c, pts, col, w, seed + 5, 0.6);
}
// Hatching, to colour a shape in: strokes back and forth inside a path.
function hatch(c, path, bx, by, bw, bh, col, seed = 1, gap = 4, w = 2.2) {
  const r = rng(seed);
  c.save();
  c.beginPath();
  path(c);
  c.clip();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.globalAlpha = 0.85;
  c.beginPath();
  let up = false;
  for (let x = bx - bh; x < bx + bw + bh; x += gap) {
    const x0 = x + (r() - 0.5) * 1.5;
    if (up) {
      c.moveTo(x0, by + bh);
      c.lineTo(x0 + bh * 0.7, by);
    } else {
      c.moveTo(x0 + bh * 0.7, by);
      c.lineTo(x0, by + bh);
    }
    up = !up;
  }
  c.stroke();
  c.restore();
}

// A sheet of cloth hanging from a line: corners at the top, a sagging foot.
function cloth(c, x, y, w, h, col, sway = 0, { sag = 4, fold = 0.12 } = {}) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + w / 2, y + 3, x + w, y);
  c.lineTo(x + w + sway, y + h);
  c.quadraticCurveTo(x + w / 2 + sway, y + h + sag, x + sway, y + h);
  c.closePath();
  c.fill();
  c.fillStyle = `rgba(0,0,0,${fold})`;
  for (let i = 1; i < 4; i++) c.fillRect(x + (w * i) / 4 + sway * 0.5, y + 4, 1.5, h - 4);
  c.fillStyle = 'rgba(255,248,230,0.1)';
  c.fillRect(x, y, w, 2);
}

// A scatter of rough stones in a clipped area, for walls built from rubble.
function stoneWork(c, pts, seed, palette, { rows = 14, wmin = 16, wmax = 34 } = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const r = rng(seed);
  c.save();
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.clip();
  const rh = (y1 - y0) / rows;
  for (let row = 0; row < rows; row++) {
    let x = x0 - r() * wmax;
    const y = y0 + row * rh;
    while (x < x1) {
      const w = wmin + r() * (wmax - wmin);
      const h = rh * (0.82 + r() * 0.3);
      c.fillStyle = palette[Math.floor(r() * palette.length)];
      c.beginPath();
      c.moveTo(x + 1, y + 1 + r() * 2);
      c.lineTo(x + w - 1, y + r() * 2);
      c.lineTo(x + w - 2 + r() * 2, y + h - 1);
      c.lineTo(x + 2, y + h - r() * 2);
      c.closePath();
      c.fill();
      // the lit top and the dark foot of each stone
      c.fillStyle = 'rgba(255,240,215,0.18)';
      c.fillRect(x + 2, y + 1, w - 4, 1.4);
      c.fillStyle = 'rgba(30,20,12,0.28)';
      c.fillRect(x + 1, y + h - 2.5, w - 2, 2);
      x += w;
    }
  }
  c.restore();
}

// A low wall laid from rubble: odd stones and the odd brick, capped flat.
const RUBBLE = ['#7c776c', '#8f8776', '#6e655a', '#857a68', '#615c54', '#948670', '#8a5a42', '#9a6c50'];
function rubbleWall(R, x0, x1, h, seed, cap = true) {
  const pts = [[x0, 0], [x0 + 1, -h + 3], [x0 + 6, -h], [x1 - 6, -h], [x1 - 1, -h + 3], [x1, 0]];
  R.cast((c) => {
    extrudePoly(c, pts, 18, { color: '#8f8472' });
    c.fillStyle = '#4a4036';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    stoneWork(c, pts, seed, RUBBLE, { rows: Math.max(3, Math.round(h / 13)), wmin: 14, wmax: 30 });
    if (cap) {
      c.fillStyle = '#a89c86';
      c.fillRect(x0 - 2, -h - 3, x1 - x0 + 4, 4);
      c.fillStyle = 'rgba(255,248,230,0.3)';
      c.fillRect(x0 - 2, -h - 3, x1 - x0 + 4, 1.2);
    }
    // the foot is in shade, the ground dust on it
    const fg = c.createLinearGradient(0, -14, 0, 0);
    fg.addColorStop(0, 'rgba(40,28,18,0)');
    fg.addColorStop(1, 'rgba(40,28,18,0.3)');
    c.fillStyle = fg;
    c.fillRect(x0, -14, x1 - x0, 14);
  });
}

// ----------------------------------------------------------- the façades --

// A pointed dark opening with a lit interior behind it.
function womanDoorway(R, x, t = 0) {
  const w = 96;
  const h = 205;
  const x0 = x - w / 2;
  R.cast((c) => {
    // the surround, with its thickness, and the step
    c.fillStyle = 'rgba(214,202,176,0.6)';
    c.fillRect(x0 - 8, -h - 8, w + 16, h + 8);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(x0 - 8, -h - 8, 3, h + 8);
    extrudeRect(c, x0 - 12, -6, w + 24, 6, 16, { color: '#b3a589' });
    c.fillStyle = '#b8aa8c';
    c.fillRect(x0 - 12, -6, w + 24, 6);
    // the hall inside: a stair going up, lit by a lamp somewhere above
    const hall = c.createLinearGradient(x0, 0, x0 + w, -h);
    hall.addColorStop(0, '#1c130d');
    hall.addColorStop(0.55, '#4a3623');
    hall.addColorStop(1, '#6a4c2c');
    c.fillStyle = hall;
    c.fillRect(x0, -h, w, h - 6);
    c.fillStyle = 'rgba(14,10,7,0.78)';
    for (let i = 0; i < 6; i++) c.fillRect(x0 + 14 + i * 12, -44 - i * 16, 12, 44 + i * 16 - 7);
    c.fillStyle = 'rgba(255,214,150,0.22)';
    for (let i = 0; i < 6; i++) c.fillRect(x0 + 14 + i * 12, -46 - i * 16, 12, 2);
    // the leaf, pushed right back against the wall, a blue edge
    c.fillStyle = '#35566e';
    c.fillRect(x0 - 4, -h, 4, h - 6);
    // a curtain hung in the doorway, drawn to one side
    c.fillStyle = '#5e382e';
    c.beginPath();
    const cw = A.wind(t, 5) * 3;
    c.moveTo(x0 + w - 4, -h + 2);
    c.lineTo(x0 + w - 36, -h + 2);
    c.quadraticCurveTo(x0 + w - 28 + cw, -h * 0.5, x0 + w - 40 + cw * 1.6, -9);
    c.lineTo(x0 + w - 4, -9);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < 4; i++) c.fillRect(x0 + w - 8 - i * 8, -h + 4, 1.6, h - 14);
  });
  R.glow((c) => {
    const g = c.createRadialGradient(x0 + w * 0.85, -h * 0.85, 2, x0 + w * 0.85, -h * 0.85, 90);
    g.addColorStop(0, 'rgba(255,190,110,0.34)');
    g.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = g;
    c.fillRect(x0, -h, w, h);
  });
}

// Um Said's flat: a green door, ajar; beside it a window with the curtains
// drawn; a lamp inside, a slit of it showing.
function umSaidFlat(R, x, t) {
  const w = 96;
  const h = 205;
  const hf = w / 2; // where the open leaf's free edge falls
  const x0 = x - w / 2;
  R.cast((c) => {
    c.fillStyle = 'rgba(214,202,176,0.6)';
    c.fillRect(x0 - 8, -h - 8, w + 16, h + 8);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(x0 - 8, -h - 8, 3, h + 8);
    // the step
    extrudeRect(c, x0 - 12, -6, w + 24, 6, 18, { color: '#b3a589' });
    c.fillStyle = '#b8aa8c';
    c.fillRect(x0 - 12, -6, w + 24, 6);
    // the doorway: dark, a lit hall at the back
    c.fillStyle = '#100b08';
    c.fillRect(x0, -h, w, h - 6);
    const hall = c.createLinearGradient(x0 + hf, 0, x0 + w, 0);
    hall.addColorStop(0, '#150e09');
    hall.addColorStop(0.7, '#2a1b10');
    hall.addColorStop(1, '#4a3016');
    c.fillStyle = hall;
    c.fillRect(x0 + hf, -h + 4, w - hf, h - 10);
    // the leaf, swung inward on its left hinge: its free edge recedes
    c.fillStyle = '#3d7a55';
    c.beginPath();
    c.moveTo(x0, -6);
    c.lineTo(x0, -h);
    c.lineTo(x0 + hf, -h + 15);
    c.lineTo(x0 + hf, -22);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.moveTo(x0 + 28, -h + 8);
    c.lineTo(x0 + hf, -h + 15);
    c.lineTo(x0 + hf, -22);
    c.lineTo(x0 + 28, -14);
    c.fill();
    // raised panels, and the paint worn through along the edge
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1.5;
    c.strokeRect(x0 + 6, -h + 22, hf - 18, 58);
    c.strokeRect(x0 + 6, -h + 96, hf - 18, 70);
    c.strokeStyle = 'rgba(255,255,255,0.14)';
    c.beginPath();
    c.moveTo(x0 + 7, -h + 85);
    c.lineTo(x0 + hf - 13, -h + 85);
    c.stroke();
    c.fillStyle = '#a99a72';
    c.fillRect(x0 + hf - 8, -h * 0.52, 5, 3);
    // the other leaf is shut, we see only a dark edge; a latch plate
    c.fillStyle = '#1b2f24';
    c.fillRect(x0 + hf, -h + 15, 2, h - 37);
  });
  R.glow((c) => {
    // the lamp inside, showing as a slit down the open side
    const g = c.createLinearGradient(x0 + 58, 0, x0 + w, 0);
    g.addColorStop(0, 'rgba(255,170,80,0.0)');
    g.addColorStop(0.55, `rgba(255,176,88,${0.32 + 0.04 * Math.sin(t * 2.3)})`);
    g.addColorStop(1, 'rgba(255,170,80,0.0)');
    c.fillStyle = g;
    c.fillRect(x0 + 58, -h + 26, w - 58, h - 56);
  });
  // slippers left on the step, a geranium in a tin
  R.cast((c) => {
    c.fillStyle = '#6a4a3a';
    c.beginPath();
    c.ellipse(x0 - 4, -9, 8, 3.5, 0, 0, TAU);
    c.ellipse(x0 + 10, -9, 8, 3.5, 0.1, 0, TAU);
    c.fill();
    c.fillStyle = '#8c8a86';
    c.fillRect(x0 + w + 20, -24, 18, 20);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x0 + w + 20, -24, 18, 3);
    c.fillStyle = '#4a6a34';
    c.beginPath();
    c.arc(x0 + w + 29, -32, 9, 0, TAU);
    c.arc(x0 + w + 22, -28, 5, 0, TAU);
    c.arc(x0 + w + 36, -29, 5, 0, TAU);
    c.fill();
    c.fillStyle = '#a8322a';
    for (const [dx, dy] of [[26, -36], [33, -34], [30, -40]]) {
      c.beginPath();
      c.arc(x0 + w + dx, dy, 2.6, 0, TAU);
      c.fill();
    }
  });
  // the window, grille and heavy curtains drawn closed: 76 x 107, sill 86 up
  const wx = x + 100;
  const wy = -193;
  const WW = 76;
  const WH = 107;
  R.cast((c) => {
    extrudeRect(c, wx - 4, wy - 4, WW + 8, WH + 8, 12, { color: '#bdb092' });
    c.fillStyle = '#bdb092';
    c.fillRect(wx - 4, wy - 4, WW + 8, WH + 8);
    c.fillStyle = '#1b1612';
    c.fillRect(wx, wy, WW, WH);
    // the curtain: dark maroon cloth, drawn, pleated, a thin pale edge of light;
    // it stirs a little where the window is not quite shut
    const cg = c.createLinearGradient(wx, 0, wx + WW, 0);
    cg.addColorStop(0, '#5a302c');
    cg.addColorStop(0.5, '#693c32');
    cg.addColorStop(1, '#4a2824');
    c.fillStyle = cg;
    const bw = A.wind(t, 3.3);
    c.beginPath();
    c.moveTo(wx + 1, wy + 3);
    c.lineTo(wx + WW - 1, wy + 3);
    c.lineTo(wx + WW - 1 + bw * 1.2, wy + WH - 4);
    for (let i = 0; i <= 8; i++) c.lineTo(wx + WW - 1 - (i * (WW - 2)) / 8 + bw * 1.2 * (1 - i / 8), wy + WH - 4 + Math.sin(t * 1.9 + i * 1.3) * 1.2 + (i % 2) * 1.5);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 0; i < 12; i++) c.fillRect(wx + 3 + i * 6.2, wy + 3, 2.4, WH - 6);
    c.fillStyle = 'rgba(255,230,190,0.14)';
    for (let i = 0; i < 12; i++) c.fillRect(wx + 5.4 + i * 6.2, wy + 3, 1, WH - 6);
    // the rod, and the grille
    c.fillStyle = '#2a2420';
    c.fillRect(wx - 2, wy + 1, WW + 4, 3);
    c.strokeStyle = 'rgba(30,26,22,0.9)';
    c.lineWidth = 1.6;
    c.beginPath();
    for (let gx = wx + 7; gx < wx + WW; gx += 10) {
      c.moveTo(gx, wy);
      c.lineTo(gx, wy + WH);
    }
    c.moveTo(wx, wy + WH / 2);
    c.lineTo(wx + WW, wy + WH / 2);
    c.stroke();
    // sill
    c.fillStyle = '#c9bc9c';
    c.fillRect(wx - 7, wy + WH, WW + 14, 6);
  });
  R.glow((c) => {
    // the lamp's warmth through the cloth
    c.fillStyle = `rgba(255,150,70,${0.05 + 0.015 * Math.sin(t * 2.3 + 1)})`;
    c.fillRect(wx + 1, wy + 3, WW - 2, WH - 6);
  });
}

// What is left of a balcony on the first floor (its slab 224 up, over the
// shopfront): one half of the slab, a railing bent like a hand, the other
// half hanging by its rebar; laundry on a line that still holds. Built for a
// person: the rail 92 high, the door 205, a woman 170 tall stands on the slab.
function balcony(R, x, y, t) {
  const sway = (s) => Math.sin(t * 1.25 + s) * 2 + A.wind(t, s) * 1.5;
  const RH = 92;
  const SL = x - 112; // the slab's left end
  const SR = x + 52; // and where the good half stops
  // the balcony door and the wall torn round it
  R.cast((c) => {
    const dx = x - 20;
    c.fillStyle = '#17110e';
    c.beginPath();
    c.moveTo(dx - 8, y);
    c.lineTo(dx - 16, y - 190);
    c.lineTo(dx + 6, y - 222);
    c.lineTo(dx + 50, y - 212);
    c.lineTo(dx + 90, y - 228);
    c.lineTo(dx + 104, y - 150);
    c.lineTo(dx + 120, y - 110);
    c.lineTo(dx + 98, y - 50);
    c.lineTo(dx + 106, y);
    c.closePath();
    c.fill();
    // a lit ring of broken render round the tear
    c.strokeStyle = 'rgba(205,190,160,0.5)';
    c.lineWidth = 3;
    c.stroke();
    // the door frame and what is left of the glass door, hanging by one hinge
    c.strokeStyle = '#3a2f28';
    c.lineWidth = 3.5;
    c.strokeRect(dx + 4, y - 205, 90, 203);
    c.fillStyle = 'rgba(120,150,170,0.18)';
    c.beginPath();
    c.moveTo(dx + 7, y - 202);
    c.lineTo(dx + 40, y - 202);
    c.lineTo(dx + 22, y - 90);
    c.lineTo(dx + 7, y - 90);
    c.fill();
    // a curtain blown out through the gap, a rust-coloured cloth
    const w1 = A.wind(t, 1.7);
    c.fillStyle = '#9a6a4c';
    c.beginPath();
    c.moveTo(dx + 62, y - 200);
    c.lineTo(dx + 100, y - 196);
    c.quadraticCurveTo(dx + 116 + sway(1) * 4 + w1 * 6, y - 130, dx + 98 + sway(2) * 4 + w1 * 5, y - 50);
    c.lineTo(dx + 80, y - 60);
    c.quadraticCurveTo(dx + 80 + w1 * 2, y - 110, dx + 62, y - 140);
    c.fill();
  });
  // the slab
  R.cast((c) => {
    const slab = [[SL, y], [SR, y], [SR, y + 14], [SL, y + 14]];
    extrudePoly(c, slab, 44, { color: '#a89c86' });
    c.fillStyle = '#a89c86';
    c.beginPath();
    slab.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(SL, y + 10, SR - SL, 4);
    // the far half has sheared and hangs from its rebar
    c.save();
    c.translate(SR, y);
    c.rotate(0.62 + Math.sin(t * 0.9) * 0.008);
    const hang = [[0, 0], [70, 0], [74, 7], [68, 14], [0, 14]];
    extrudePoly(c, hang, 44, { color: '#a89c86' });
    c.fillStyle = '#9a8e79';
    c.beginPath();
    hang.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.restore();
    c.strokeStyle = '#4a3b2e';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(SR - 2, y + 7 + i * 2);
      c.quadraticCurveTo(SR + 10, y + 24 + i * 3, SR + 16 + i * 3, y + 42 + i * 3);
      c.stroke();
    }
    // the railing, 92 high: upright on the good half, bent and torn at the break
    c.strokeStyle = '#2f2825';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(SL + 2, y - RH);
    c.lineTo(SR - 8, y - RH - 2);
    c.moveTo(SL + 2, y - RH * 0.5);
    c.lineTo(SR - 8, y - RH * 0.5);
    c.stroke();
    c.lineWidth = 2.2;
    c.beginPath();
    for (let px = SL + 2; px <= SR - 6; px += 13) {
      c.moveTo(px, y);
      c.lineTo(px + (px > SR - 40 ? (px - SR + 40) * 0.05 : 0), y - RH);
    }
    c.stroke();
    c.lineWidth = 3;
    // the end of the rail, bent out and down like a hand
    c.beginPath();
    c.moveTo(SR - 8, y - RH - 2);
    c.quadraticCurveTo(SR + 22, y - RH - 6, SR + 36, y - RH * 0.4);
    c.moveTo(SR - 18, y - RH * 0.5);
    c.quadraticCurveTo(SR + 4, y - RH * 0.3, SR + 2, y + 24);
    c.stroke();
    // a dry pot with the stalks of something somebody watered
    c.fillStyle = '#8a5a3a';
    c.fillRect(SL + 10, y - 22, 20, 22);
    c.strokeStyle = '#6a5a38';
    c.lineWidth = 1.6;
    c.beginPath();
    for (const dx of [-3, 3, 9]) {
      c.moveTo(SL + 20 + dx, y - 22);
      c.lineTo(SL + 20 + dx + dx * 0.7 + A.wind(t, dx) * 1.5, y - 48);
    }
    c.stroke();
  });
  // the laundry: a line from the rail to a bracket in the wall, still taut
  const ax = SL + 6;
  const ay = y - RH - 18;
  const bx = x + 250;
  const by = y - RH - 40;
  R.cast((c) => {
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.3;
    A.wire(c, ax, ay, bx, by, 34, t, 0.4, 1.2);
    // the bracket
    c.fillStyle = '#3a2f28';
    c.fillRect(bx - 2, by - 4, 10, 4);
    c.fillRect(bx + 2, by - 4, 3, 34);
    const sag = (u) => {
      const yy = lerp(ay, by, u) + 34 * 4 * u * (1 - u) * 0.9;
      return [lerp(ax, bx, u), yy];
    };
    // a pale sheet, two shirts, a pair of trousers, a headscarf
    const cl = (u, dx, w, h, col, ph) => {
      const p = sag(u);
      A.cloth(c, p[0] + dx, p[1], w, h, col, t, ph, { amp: 3.4, sag: 4, folds: 0.1 });
      c.fillStyle = '#d8b04a';
      c.fillRect(p[0] + dx + 3, p[1] - 3, 3, 7);
      c.fillRect(p[0] + dx + w - 6, p[1] - 3, 3, 7);
    };
    cl(0.1, -22, 66, 104, '#d8cfbd', 0);
    cl(0.3, -12, 38, 56, '#6f7e86', 1);
    cl(0.44, -10, 34, 50, '#a25a46', 2);
    // trousers
    let p = sag(0.6);
    c.fillStyle = '#4d5666';
    c.beginPath();
    c.moveTo(p[0] - 14, p[1]);
    c.lineTo(p[0] + 16, p[1]);
    c.lineTo(p[0] + 15 + sway(3), p[1] + 78);
    c.lineTo(p[0] + 3 + sway(3), p[1] + 78);
    c.lineTo(p[0], p[1] + 20);
    c.lineTo(p[0] - 3 + sway(4), p[1] + 78);
    c.lineTo(p[0] - 15 + sway(4), p[1] + 78);
    c.closePath();
    c.fill();
    cl(0.78, -11, 26, 28, '#b8a78a', 5);
  });
}

// The ledge below the balcony, where someone can sit: the foot of a garden wall.
function ledge(R) {
  rubbleWall(R, LEDGE.x0, LEDGE.x1, LEDGE.h, 17);
}

// A building with its face torn off: three rooms open to the street.
function tornFace(R, g, t) {
  const { x0, x1, fh } = TORN;
  const top = -3 * fh;
  const room = (n) => [-(n + 1) * fh, -n * fh]; // n = 0 on the ground
  const outline = [[x0 + 20, 0], [x0 + 20, top - 24], [x0 + 120, top - 8], [x0 + 190, top - 40], [x1 - 40, top + 36], [x1 - 40, 0]];
  const trace = (c) => {
    outline.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
  };
  // the back wall, each room a different paint
  R.paint((c) => {
    extrudePoly(c, outline, 26, { color: '#8c8068' });
    c.beginPath();
    trace(c);
    c.fillStyle = '#6a6052';
    c.fill();
    c.save();
    c.beginPath();
    trace(c);
    c.clip();
    const paints = ['#7f9a8c', '#b88c68', '#8a9bb0'];
    for (let n = 0; n < 3; n++) {
      const [ty, by] = room(n);
      c.fillStyle = paints[n];
      c.fillRect(x0, ty, x1 - x0, fh);
      // a stencilled border at the top, and the darker dado
      c.fillStyle = 'rgba(255,244,220,0.14)';
      for (let px = x0; px < x1; px += 18) c.fillRect(px, ty + 8, 9, 5);
      c.fillStyle = 'rgba(10,8,6,0.3)';
      c.fillRect(x0, by - 46, x1 - x0, 46);
      c.fillStyle = 'rgba(255,240,220,0.18)';
      c.fillRect(x0, by - 47, x1 - x0, 1.6);
      // soot where the blast went up the wall
      const sg = c.createRadialGradient(x1 - 90, ty + 10, 4, x1 - 90, ty + 10, 170);
      sg.addColorStop(0, 'rgba(6,5,4,0.6)');
      sg.addColorStop(1, 'rgba(6,5,4,0)');
      c.fillStyle = sg;
      c.fillRect(x0, ty - 20, x1 - x0, fh + 20);
      // the wall goes dim towards the left, where the light does not reach
      const dim = c.createLinearGradient(x0, 0, x1, 0);
      dim.addColorStop(0, 'rgba(14,10,8,0.5)');
      dim.addColorStop(1, 'rgba(14,10,8,0)');
      c.fillStyle = dim;
      c.fillRect(x0, ty, x1 - x0, fh);
    }
    // damp, and a long crack
    const r = rng(53);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '40,30,24' : '200,180,150'},0.1)`;
      c.fillRect(x0 + r() * (x1 - x0), -r() * fh * 3, 12 + r() * 44, 10 + r() * 30);
    }
    c.strokeStyle = 'rgba(20,14,10,0.55)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x0 + 120, top + 10);
    c.lineTo(x0 + 140, top + 80);
    c.lineTo(x0 + 124, top + 140);
    c.lineTo(x0 + 150, top + 230);
    c.stroke();
    c.restore();
  });
  R.surface(trace, 'plaster', { scale: 1.3, seed: 3, alpha: 0.85 });

  // what the rooms held
  R.cast((c) => {
    const f0 = -0;
    const RS = 1.2; // the rooms are taller now; what they held grows with them
    const room = (fy) => { c.translate(x0, fy); c.scale(RS, RS); c.translate(-x0, -fy); };
    c.save();
    room(f0);
    // ground floor: a kitchen. A shelf with pots, a gas cylinder, a table on its side
    c.fillStyle = '#5a4634';
    c.fillRect(x0 + 40, f0 - 98, 90, 5);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = ['#8a8c90', '#a06a3a', '#6e7480', '#9a9aa0'][i];
      c.beginPath();
      c.ellipse(x0 + 58 + i * 22, f0 - 106, 9, 9, 0, 0, TAU);
      c.fill();
      c.fillRect(x0 + 49 + i * 22, f0 - 106, 18, 8);
    }
    c.fillStyle = '#c47a2a';
    c.fillRect(x0 + 168, f0 - 66, 30, 66);
    c.beginPath();
    c.arc(x0 + 183, f0 - 66, 15, Math.PI, 0);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(x0 + 190, f0 - 66, 8, 66);
    c.fillStyle = '#6a4a30';
    c.save();
    c.translate(x0 + 232, f0 - 4);
    c.rotate(-0.28);
    c.fillRect(0, -40, 70, 6);
    c.fillRect(2, -34, 5, 34);
    c.fillRect(62, -34, 5, 34);
    c.restore();
    c.restore();
    c.save();
    room(-fh);
    // first floor: a bedroom. A wardrobe, door open; a bed, its blanket half over the edge
    const f1 = -fh;
    c.fillStyle = '#4a3326';
    c.fillRect(x0 + 40, f1 - 124, 62, 124);
    c.fillStyle = '#2a1c14';
    c.fillRect(x0 + 44, f1 - 118, 26, 112);
    c.fillStyle = '#5a4030';
    c.beginPath();
    c.moveTo(x0 + 70, f1 - 118);
    c.lineTo(x0 + 98, f1 - 112);
    c.lineTo(x0 + 98, f1 - 8);
    c.lineTo(x0 + 70, f1 - 6);
    c.fill();
    c.fillStyle = '#b8b0a0';
    c.fillRect(x0 + 48, f1 - 100, 18, 24); // a stack of folded sheets
    c.fillStyle = '#7a8a9a';
    c.fillRect(x0 + 48, f1 - 74, 18, 10);
    c.fillStyle = '#5a4634';
    c.fillRect(x0 + 130, f1 - 40, 96, 8);
    c.fillRect(x0 + 132, f1 - 32, 6, 32);
    c.fillRect(x0 + 218, f1 - 32, 6, 32);
    c.fillStyle = '#d6cdb8';
    c.fillRect(x0 + 132, f1 - 54, 90, 14);
    c.fillStyle = '#8a4a40';
    c.fillRect(x0 + 132, f1 - 48, 90, 8);
    c.fillStyle = 'rgba(255,240,220,0.12)';
    for (let i = 0; i < 6; i++) c.fillRect(x0 + 136 + i * 14, f1 - 48, 6, 8);
    c.fillStyle = '#8a4a40';
    c.beginPath();
    c.moveTo(x0 + 222, f1 - 44);
    c.quadraticCurveTo(x0 + 236, f1 - 30, x0 + 232, f1 - 6);
    c.lineTo(x0 + 220, f1 - 6);
    c.fill();
    c.restore();
    c.save();
    room(-2 * fh);
    // second floor: the sitting room. A sofa, a clock stopped, a picture hung crooked
    const f2 = -2 * fh;
    c.fillStyle = '#5a4a58';
    c.fillRect(x0 + 40, f2 - 44, 100, 30);
    c.fillRect(x0 + 40, f2 - 70, 14, 56);
    c.fillStyle = '#4a3a48';
    c.fillRect(x0 + 40, f2 - 18, 100, 18);
    c.fillStyle = '#6a5a68';
    c.fillRect(x0 + 56, f2 - 52, 34, 22);
    c.fillStyle = '#3a2a22';
    c.save();
    c.translate(x0 + 200, f2 - 100);
    c.rotate(0.09);
    c.fillRect(-18, -13, 36, 26);
    c.fillStyle = '#c8b48c';
    c.fillRect(-14, -9, 28, 18);
    c.fillStyle = '#6a7a5a';
    c.fillRect(-14, -1, 28, 10);
    c.restore();
    c.fillStyle = '#d8d0c0';
    c.beginPath();
    c.arc(x0 + 250, f2 - 104, 12, 0, TAU);
    c.fill();
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x0 + 250, f2 - 104, 12, 0, TAU);
    c.moveTo(x0 + 250, f2 - 104);
    c.lineTo(x0 + 250, f2 - 112);
    c.moveTo(x0 + 250, f2 - 104);
    c.lineTo(x0 + 257, f2 - 100);
    c.stroke();
    c.restore();
  });

  // the floor slabs and the stubs of the side walls
  R.cast((c) => {
    const slab = (n, xa, xb, tilt, ragged) => {
      const y = -n * fh;
      const sp = [[xa, y], [xb, y + tilt]];
      if (ragged) sp.push([xb + 6, y + tilt + 4], [xb - 4, y + tilt + 8], [xb + 7, y + tilt + 12]);
      sp.push([xb, y + tilt + 15], [xa, y + 15]);
      extrudePoly(c, sp, 26, { color: '#a89c86' });
      c.fillStyle = '#a09480';
      c.beginPath();
      sp.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(xa, y + 10, xb - xa, 5);
    };
    slab(1, x0 + 20, x1 - 40, 0, false);
    slab(2, x0 + 20, x1 - 120, 0, true);
    slab(3, x0 + 20, x0 + 180, 0, true);
    // the end of the second floor has sheared and hangs by its rebar
    c.save();
    c.translate(x1 - 120, -2 * fh);
    c.rotate(0.5);
    const hang = [[0, 0], [100, 0], [104, 6], [98, 12], [0, 15]];
    extrudePoly(c, hang, 26, { color: '#a89c86' });
    c.fillStyle = '#9a8e79';
    c.beginPath();
    hang.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.restore();
    c.strokeStyle = '#3f3226';
    c.lineWidth = 2;
    const r = rng(9);
    c.beginPath();
    for (const [xx, n] of [[x0 + 180, 3], [x1 - 120, 2], [x1 - 40, 1], [x0 + 20, 2]]) {
      for (let i = 0; i < 5; i++) {
        const sx = xx + (r() - 0.5) * 8;
        c.moveTo(sx, -n * fh + 12);
        c.quadraticCurveTo(sx + (r() - 0.5) * 20, -n * fh + 30, sx + (r() - 0.5) * 34, -n * fh + 38 + r() * 30);
      }
    }
    c.stroke();
    // the left-hand wall stands to the roof; the right is torn low
    const wl = [[x0 - 14, 0], [x0 - 14, top - 40], [x0, top - 56], [x0 + 24, top + 6], [x0 + 20, -2 * fh - 20], [x0 + 26, -fh - 40], [x0 + 20, 0]];
    const wr = [[x1 - 46, 0], [x1 - 48, -fh * 2 + 20], [x1 - 30, -fh * 2 - 30], [x1 - 14, -fh * 2 + 40], [x1 + 4, 0]];
    for (const w of [wl, wr]) {
      extrudePoly(c, w, 24, { color: '#a89c86' });
      c.fillStyle = '#9c9078';
      c.beginPath();
      w.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.fill();
    }
    // a torn window left in the standing wall
    c.fillStyle = '#17110e';
    c.fillRect(x0 - 6, -fh - 86 - 107, 26, 107); // (74 x 107 once: the edge of it shows)
    // a cable from the roof, swinging
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0 + 150, top - 20);
    c.quadraticCurveTo(x0 + 150 + Math.sin(t * 0.8) * 5, top + 40, x0 + 142 + Math.sin(t * 0.8) * 9, top + 96);
    c.stroke();
  });
  R.surface((c) => {
    c.rect(x0 + 20, -fh, x1 - x0 - 60, 15);
    c.rect(x0 + 20, -2 * fh, x1 - x0 - 140, 15);
    c.rect(x0 + 20, -3 * fh, 160, 15);
  }, 'concrete', { scale: 1, seed: 6, alpha: 0.9 });
  // the sun, low on the right, reaches a little way into each room
  R.glow((c) => {
    for (let n = 0; n < 3; n++) {
      const [ty, by] = room(n);
      const g1 = c.createLinearGradient(x1 - 30, ty, x1 - 260, by);
      g1.addColorStop(0, 'rgba(255,190,110,0.2)');
      g1.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g1;
      c.beginPath();
      c.moveTo(x1 - 48, ty + 4);
      c.lineTo(x1 - 48, by - 4);
      c.lineTo(x1 - 300, by - 4);
      c.lineTo(x1 - 200, ty + 4);
      c.fill();
    }
    // dust turning in it
    const r = rng(77);
    for (let i = 0; i < 20; i++) {
      const bx = x0 + 120 + r() * (x1 - x0 - 200);
      const by = -20 - r() * fh * 3;
      const px = bx + Math.sin(t * 0.4 + i) * 10;
      const py = by + Math.sin(t * 0.3 + i * 1.7) * 8;
      c.fillStyle = `rgba(255,222,170,${0.2 + 0.12 * Math.sin(t * 1.2 + i)})`;
      c.fillRect(px, py, 1.7, 1.7);
    }
  });
  // the rubble heaped in front of the ground floor; a bedstead's leg in it
  T.rubble(R, x0 + 150, 230, 78, { seed: 41 });
  R.cast((c) => {
    c.strokeStyle = '#3a3028';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x0 + 226, -52);
    c.lineTo(x0 + 262, -92);
    c.lineTo(x0 + 292, -88);
    c.stroke();
    c.fillStyle = '#b8a888';
    c.beginPath();
    c.moveTo(x0 + 296, -50);
    c.lineTo(x0 + 330, -40);
    c.lineTo(x0 + 320, -58);
    c.fill();
  });
}

// A gap between the buildings, and in it, far off, School Street: the road
// running away to the checkpoint, and halfway down it a small dark shape
// under a blanket. Nothing else of him is drawn.
function viewGap(R, g, t, k, dof) {
  const { x0, x1 } = GAP;
  const xc = (x0 + x1) / 2;
  const vy = -86;
  const at = (kk) => {
    const s = 1 / (1 + 3.4 * kk);
    return { s, x: xc, y: lerp(4, vy, 1 - s) };
  };
  const road = (c) => {
    // far end: the checkpoint, a long way off, in the last of the light
    c.fillStyle = '#7d6a60';
    c.fillRect(x0 + 80, vy - 130, x1 - x0 - 160, 140);
    c.fillStyle = '#5a4a46';
    c.fillRect(x0 + 96, vy - 112, 14, 30);
    c.fillRect(x0 + 130, vy - 120, 12, 28);
    c.fillRect(x1 - 110, vy - 108, 16, 26);
    // the road, long and flat, warm where the sun runs down it
    const rg = c.createLinearGradient(0, vy, 0, 4);
    rg.addColorStop(0, '#a98664');
    rg.addColorStop(1, '#7a6a5c');
    c.fillStyle = rg;
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 26, vy);
    c.lineTo(xc + 26, vy);
    c.lineTo(x1, 4);
    c.fill();
    c.strokeStyle = 'rgba(220,205,170,0.4)';
    c.lineWidth = 2;
    c.setLineDash([12, 16]);
    c.beginPath();
    c.moveTo(xc, 4);
    c.lineTo(xc, vy);
    c.stroke();
    c.setLineDash([]);
    // the façades running away, the left one in the low sun, the right in shade
    const side = (edge, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 4);
      c.lineTo(edge, -520);
      c.lineTo(xc + dir * 30, vy - 150);
      c.lineTo(xc + dir * 30, vy);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(22,16,14,0.55)';
      for (let i = 0; i < 6; i++) {
        const kk = i / 6 + 0.06;
        const wx = lerp(edge, xc + dir * 30, kk);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(lerp(-460, vy - 140, kk), lerp(-70, vy - 10, kk), f / 3 + 0.1);
          c.fillRect(wx - 5 * (1 - kk), wy, 10 * (1 - kk) + 2, 20 * (1 - kk) + 3);
        }
      }
    };
    side(x0, -1, '#b09070');
    side(x1, 1, '#5e5048');
    // sandbags across it, at our end; a tiny flag at theirs
    c.fillStyle = '#6a5a48';
    c.fillRect(xc - 26, vy - 4, 52, 6);
    c.fillStyle = '#7a3a36';
    c.fillRect(xc + 4, vy - 56, 1.6, 24);
    c.fillRect(xc + 5.6, vy - 56, 9, 5);
    // the long shadows of the left-hand buildings across the road
    c.fillStyle = 'rgba(30,20,30,0.28)';
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 20, vy + 2);
    c.lineTo(xc + 8, vy + 2);
    c.lineTo(x1 - 30, 4);
    c.fill();
  };
  // (softer the deeper it goes, but only a little: the gap is narrow)
  const box = [x0, vy - 160, x1, 6];
  depthCast(R, road, box, 0.3, {
    mode: dof,
    cast: false,
    mask: (c) => {
      const grd = c.createRadialGradient(xc, vy, 0, xc, vy, (x1 - x0) * 0.6);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(0.3, 'rgba(0,0,0,0.85)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grd;
      c.fillRect(box[0] - 50, box[1] - 50, box[2] - box[0] + 100, box[3] - box[1] + 100);
    },
  });
  // the blanket: a small dark mound, a pale stripe, its corner lifting
  const m = at(0.62);
  R.paint((c) => {
    c.save();
    c.translate(m.x + 6 * m.s, m.y);
    c.scale(m.s * 1.4, m.s * 1.4);
    const rip = Math.sin(t * 1.3) * 1.5;
    c.fillStyle = '#34292a';
    c.beginPath();
    c.moveTo(-70, 0);
    c.quadraticCurveTo(-66, -18, -40, -20 + rip);
    c.quadraticCurveTo(0, -26, 30, -18 + rip * 0.6);
    c.quadraticCurveTo(62, -16, 72, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(150,130,110,0.4)';
    c.fillRect(-52, -14, 6, 12);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(-60, -6, 128, 6);
    c.restore();
  });
  void g;
  void k;
}

// A side alley: narrow, deep, the far end bright; laundry across it.
function alley(R, g, t, k) {
  const { x0, x1 } = ALLEY;
  const xc = (x0 + x1) / 2;
  const vy = -84;
  R.paint((c) => {
    // the far end: a wall in the last of the light, a doorway, a strip of sky
    const sg = c.createLinearGradient(0, -520, 0, vy);
    sg.addColorStop(0, '#d8a070');
    sg.addColorStop(1, '#e8b078');
    c.fillStyle = sg;
    c.fillRect(x0, -520, x1 - x0, 520 + vy + 6);
    c.fillStyle = '#b88a62';
    c.fillRect(xc - 36, vy - 118, 72, 124);
    c.fillStyle = '#4a3326';
    c.fillRect(xc - 9, vy - 66, 18, 72);
    c.fillStyle = 'rgba(40,24,16,0.4)';
    c.fillRect(xc - 36, vy - 118, 72, 10);
    // the ground, a lane of old stone, steps near the far end
    c.fillStyle = '#8a7a66';
    c.beginPath();
    c.moveTo(x0, 6);
    c.lineTo(xc - 36, vy + 4);
    c.lineTo(xc + 36, vy + 4);
    c.lineTo(x1, 6);
    c.fill();
    // the walls closing in: left in shade, right lit amber by the low sun
    const wall = (edge, dir, col, win) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 6);
      c.lineTo(edge, -540);
      c.lineTo(xc + dir * 44, vy - 190);
      c.lineTo(xc + dir * 44, vy + 4);
      c.closePath();
      c.fill();
      c.fillStyle = win;
      for (let i = 0; i < 4; i++) {
        const kk = i / 4 + 0.08;
        const wx = lerp(edge, xc + dir * 44, kk);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(lerp(-480, vy - 180, kk), lerp(-80, vy - 10, kk), f / 3 + 0.12);
          c.fillRect(wx - 5 * (1 - kk) - 2, wy, 10 * (1 - kk) + 3, 24 * (1 - kk) + 3);
        }
      }
    };
    wall(x0, -1, '#4e4038', 'rgba(14,10,8,0.7)');
    wall(x1, 1, '#a07a58', 'rgba(30,20,14,0.6)');
    // a cast iron drainpipe on the lit wall, a bucket, a bicycle against the dark one
    c.fillStyle = '#3a3430';
    c.fillRect(x1 - 12, -430, 5, 430);
    c.fillStyle = '#6a7a8a';
    c.fillRect(x0 + 20, -30, 22, 26);
    c.strokeStyle = '#1e1814';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x0 + 70, -22, 20, 0, TAU);
    c.arc(x0 + 118, -22, 20, 0, TAU);
    c.moveTo(x0 + 70, -22);
    c.lineTo(x0 + 92, -50);
    c.lineTo(x0 + 118, -22);
    c.moveTo(x0 + 92, -50);
    c.lineTo(x0 + 86, -58);
    c.stroke();
  });
  // a line of laundry across the lane, high up, swaying a very little
  R.cast((c) => {
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.1;
    A.wire(c, x0 + 6, -300, x1 - 6, -312, 32, t, 0.8);
    const items = [[0.2, 30, 46, '#d6cdb8'], [0.4, 22, 34, '#6f7e86'], [0.58, 28, 52, '#a25a46'], [0.76, 20, 28, '#b8a78a']];
    for (const [u, w, h, col] of items) {
      const lx = lerp(x0 + 6, x1 - 6, u);
      const ly = lerp(-300, -312, u) + 32 * 4 * u * (1 - u) * 0.7;
      cloth(c, lx - w / 2, ly, w, h, col, Math.sin(t * 1.3 + u * 9) * 2 + A.wind(t, u * 9) * 3, { sag: 3 });
    }
  });
  // the low sun slants into the alley, a bar of amber down the lit wall
  R.glow((c) => {
    const g1 = c.createLinearGradient(x1, -400, xc, 0);
    g1.addColorStop(0, `rgba(255,170,90,${0.2 - 0.06 * k})`);
    g1.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = g1;
    c.beginPath();
    c.moveTo(x1, -520);
    c.lineTo(x1, 0);
    c.lineTo(xc, 4);
    c.lineTo(xc + 20, vy - 150);
    c.fill();
  });
  void g;
}

// ------------------------------------------------------ the graffiti wall --

// The wall of children's drawings: a house, a sun, a tree, a helicopter in
// red, a smiling family surrounded by fire, and below it, in a child's hand,
// «بكرا أحلى» (tomorrow is more beautiful). A low wall in front to sit on.
function graffitiWall(R, g, t) {
  const { x0, x1, h } = WALL;
  const w = x1 - x0;
  const top = -h;
  // the plaster wall: pale, its top broken, a shrapnel scar across it
  const pts = [[x0, 0], [x0, top + 8], [x0 + 60, top], [x0 + 130, top + 6], [x0 + 190, top - 6], [x0 + 260, top + 10], [x1 - 40, top + 2], [x1, top + 22], [x1, 0]];
  const trace = (c) => {
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
  };
  R.cast((c) => {
    extrudePoly(c, pts, 24, { color: '#d2c5a4' });
    c.beginPath();
    trace(c);
    const pg = c.createLinearGradient(0, top, 0, 0);
    pg.addColorStop(0, '#d9ccab');
    pg.addColorStop(1, '#c8b998');
    c.fillStyle = pg;
    c.fill();
    c.save();
    c.beginPath();
    trace(c);
    c.clip();
    // damp and years
    const r = rng(311);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(90,70,50,0.07)' : 'rgba(255,248,230,0.08)';
      c.fillRect(x0 + r() * w, top + r() * h, 20 + r() * 60, 14 + r() * 50);
    }
    // the base is dirty with splashed earth
    const bg = c.createLinearGradient(0, -70, 0, 0);
    bg.addColorStop(0, 'rgba(70,52,36,0)');
    bg.addColorStop(1, 'rgba(70,52,36,0.3)');
    c.fillStyle = bg;
    c.fillRect(x0, -70, w, 70);
    // bullet pocks, a cluster on the right
    c.fillStyle = 'rgba(50,38,28,0.55)';
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.arc(x1 - 60 + (r() - 0.5) * 70, -190 + (r() - 0.5) * 60, 1.5 + r() * 2, 0, TAU);
      c.fill();
    }
    c.restore();
  });
  R.surface(trace, 'plaster', { scale: 1.4, seed: 5, alpha: 0.7 });

  // the drawings (painted onto the lit wall, so they take its light)
  R.paint((c) => {
    c.save();
    c.beginPath();
    trace(c);
    c.clip();
    // ---- a stencilled dove and a slogan, adult work, faded
    c.fillStyle = 'rgba(30,28,30,0.5)';
    c.save();
    c.translate(x0 + 70, -205);
    c.scale(1.1, 1.1);
    c.beginPath();
    c.moveTo(-26, 4);
    c.quadraticCurveTo(-10, -16, 8, -6);
    c.quadraticCurveTo(14, -30, 32, -38);
    c.quadraticCurveTo(26, -18, 22, -4);
    c.quadraticCurveTo(34, 4, 40, 16);
    c.quadraticCurveTo(22, 10, 10, 8);
    c.quadraticCurveTo(0, 14, -26, 4);
    c.fill();
    c.strokeStyle = 'rgba(30,28,30,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-26, 4);
    c.quadraticCurveTo(-44, 16, -52, 34);
    c.stroke();
    c.restore();
    c.font = '34px "Aref Ruqaa", "Noto Naskh Arabic", "DejaVu Sans", serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = 'rgba(28,26,28,0.55)';
    c.fillText('حرية', x0 + 190, -218);
    // a drip from it
    c.fillRect(x0 + 200, -212, 2, 30);
    c.beginPath();
    c.arc(x0 + 201, -180, 2.2, 0, TAU);
    c.fill();
    // ---- the tree, in crayon
    const tx = x0 + 28;
    crayon(c, [[tx, -34], [tx - 1, -66], [tx + 1, -90]], '#7a4a2a', 6, 11, 0.8);
    for (const [dx, dy, rr] of [[0, -112, 24], [-17, -98, 15], [17, -100, 16]]) crayonCircle(c, tx + dx, dy, rr, '#4e8a3a', 3, 20 + dx);
    hatch(c, (cc) => cc.arc(tx, -108, 26, 0, TAU), tx - 26, -134, 52, 52, '#5c9a40', 14, 4);
    for (const [dx, dy] of [[-9, -116], [8, -102], [-2, -94]]) {
      c.fillStyle = '#c4322a';
      c.beginPath();
      c.arc(tx + dx, dy, 3, 0, TAU);
      c.fill();
    }
    crayon(c, [[tx - 40, -34], [tx + 40, -33]], '#5a8a3a', 3, 31, 1.2); // the grass
    // ---- the house
    const hx = x0 + 82;
    const hy = -34;
    crayon(c, [[hx, hy], [hx, hy - 52], [hx + 56, hy - 52], [hx + 56, hy], [hx, hy]], '#d8872a', 3.4, 41, 1.2);
    hatch(c, (cc) => cc.rect(hx, hy - 52, 56, 52), hx, hy - 52, 56, 52, '#e8b04a', 42, 5);
    crayon(c, [[hx - 8, hy - 52], [hx + 28, hy - 88], [hx + 64, hy - 52], [hx - 8, hy - 52]], '#b3261e', 3.6, 43, 1.2);
    hatch(c, (cc) => {
      cc.moveTo(hx - 6, hy - 53);
      cc.lineTo(hx + 28, hy - 86);
      cc.lineTo(hx + 62, hy - 53);
    }, hx - 6, hy - 88, 70, 36, '#c8483a', 44, 4);
    crayon(c, [[hx + 20, hy], [hx + 20, hy - 26], [hx + 36, hy - 26], [hx + 36, hy]], '#6a3a22', 3, 45, 0.8);
    crayon(c, [[hx + 6, hy - 40], [hx + 16, hy - 40], [hx + 16, hy - 30], [hx + 6, hy - 30], [hx + 6, hy - 40]], '#3a5a8a', 2.6, 46, 0.6);
    crayon(c, [[hx + 40, hy - 40], [hx + 50, hy - 40], [hx + 50, hy - 30], [hx + 40, hy - 30], [hx + 40, hy - 40]], '#3a5a8a', 2.6, 47, 0.6);
    crayon(c, [[hx + 46, hy - 86], [hx + 46, hy - 100], [hx + 52, hy - 100], [hx + 52, hy - 84]], '#8a5a3a', 3, 48, 0.8);
    crayon(c, [[hx + 49, hy - 106], [hx + 56, hy - 114], [hx + 48, hy - 122], [hx + 58, hy - 130]], '#8a8a90', 2.2, 49, 0.8);
    // ---- the sun
    const sx = x0 + 168;
    const sy = -168;
    crayonCircle(c, sx, sy, 20, '#e0a418', 3.4, 51);
    hatch(c, (cc) => cc.arc(sx, sy, 19, 0, TAU), sx - 20, sy - 20, 40, 40, '#f2c43a', 52, 4);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.1;
      crayon(c, [[sx + Math.cos(a) * 26, sy + Math.sin(a) * 26], [sx + Math.cos(a) * (36 + (i % 2) * 6), sy + Math.sin(a) * (36 + (i % 2) * 6)]], '#e0a418', 3, 60 + i, 0.8);
    }
    c.fillStyle = '#6a4a18';
    c.beginPath();
    c.arc(sx - 7, sy - 4, 1.8, 0, TAU);
    c.arc(sx + 7, sy - 4, 1.8, 0, TAU);
    c.fill();
    crayon(c, [[sx - 8, sy + 6], [sx, sy + 11], [sx + 8, sy + 6]], '#6a4a18', 2, 53, 0.4);
    // ---- the helicopter, in red, brush-heavy: body, tail boom, rotors, skids
    const px = x0 + 258;
    const py = -190;
    c.save();
    c.translate(px, py);
    c.fillStyle = '#a8261c';
    c.beginPath();
    c.ellipse(0, 0, 30, 15, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(24, -4);
    c.lineTo(78, -10);
    c.lineTo(80, -2);
    c.lineTo(26, 6);
    c.fill();
    c.beginPath();
    c.moveTo(70, -8);
    c.lineTo(84, -26);
    c.lineTo(88, -22);
    c.lineTo(78, 0);
    c.fill();
    c.fillRect(-1.5, -22, 3, 10);
    c.fillRect(-50, -24, 100, 3);
    c.fillRect(-20, 16, 44, 3);
    c.fillRect(-12, 12, 3, 6);
    c.fillRect(12, 12, 3, 6);
    c.fillStyle = 'rgba(250,236,220,0.9)';
    c.beginPath();
    c.ellipse(-14, -2, 8, 7, 0, 0, TAU);
    c.fill();
    // the paint ran
    c.fillStyle = '#a8261c';
    for (const [dx, len] of [[-18, 16], [4, 26], [20, 12]]) {
      c.fillRect(dx, 12, 2.4, len);
      c.beginPath();
      c.arc(dx + 1.2, 12 + len, 2, 0, TAU);
      c.fill();
    }
    c.restore();
    // barrel bombs drawn falling, small dark ovals with fins
    c.fillStyle = 'rgba(60,40,36,0.8)';
    for (const [bx, by, a] of [[px + 14, py + 62, 0.2], [px + 42, py + 90, -0.15]]) {
      c.save();
      c.translate(bx, by);
      c.rotate(a);
      c.beginPath();
      c.ellipse(0, 0, 6, 10, 0, 0, TAU);
      c.fill();
      c.fillRect(-5, -16, 10, 5);
      c.restore();
    }
    // ---- a smiling family, hand in hand, with fire all round them
    const fx = x0 + 252;
    const fb = -88;
    const fig = (cx, ht, col, seed, dress) => {
      crayonCircle(c, cx, fb - ht, 7.5, '#3a2a22', 2.6, seed);
      c.fillStyle = '#f2cda4';
      c.beginPath();
      c.arc(cx, fb - ht, 6.5, 0, TAU);
      c.fill();
      c.fillStyle = '#4a3226';
      c.fillRect(cx - 5, fb - ht - 8, 10, 3.5);
      crayon(c, [[cx - 2.4, fb - ht - 1], [cx - 2.4, fb - ht - 2.6]], '#3a2a22', 1.6, seed + 1, 0.2);
      crayon(c, [[cx + 2.4, fb - ht - 1], [cx + 2.4, fb - ht - 2.6]], '#3a2a22', 1.6, seed + 2, 0.2);
      crayon(c, [[cx - 3.4, fb - ht + 2], [cx, fb - ht + 4.6], [cx + 3.4, fb - ht + 2]], '#a8261c', 1.6, seed + 3, 0.2);
      // body: a triangle for a dress, a block for a coat
      const bh = ht - 10;
      c.fillStyle = col;
      c.beginPath();
      if (dress) {
        c.moveTo(cx, fb - ht + 8);
        c.lineTo(cx - bh * 0.34, fb - 14);
        c.lineTo(cx + bh * 0.34, fb - 14);
      } else {
        c.moveTo(cx - 6, fb - ht + 8);
        c.lineTo(cx + 6, fb - ht + 8);
        c.lineTo(cx + 7, fb - 14);
        c.lineTo(cx - 7, fb - 14);
      }
      c.fill();
      crayon(c, [[cx - 3, fb - 14], [cx - 3, fb]], '#3a2a22', 2.6, seed + 4, 0.5);
      crayon(c, [[cx + 3, fb - 14], [cx + 3, fb]], '#3a2a22', 2.6, seed + 5, 0.5);
    };
    fig(fx, 62, '#3a6aa8', 70, false);
    fig(fx + 24, 36, '#c8483a', 80, true);
    fig(fx + 46, 34, '#e0a418', 90, false);
    fig(fx + 68, 58, '#a84a7a', 100, true);
    // hands joined across
    crayon(c, [[fx + 4, fb - 40], [fx + 20, fb - 28], [fx + 40, fb - 26], [fx + 58, fb - 36], [fx + 66, fb - 34]], '#3a2a22', 2.2, 110, 0.5);
    // the fire: tongues of red and orange all round, taller at the sides
    const tongue = (fxx, fh, wd, col, seed) => {
      crayon(c, [[fxx - wd, fb + 2], [fxx - wd * 0.5, fb - fh * 0.5], [fxx - wd * 0.1, fb - fh * 0.9], [fxx + wd * 0.1, fb - fh * 0.5], [fxx + wd * 0.5, fb - fh], [fxx + wd, fb + 2]], col, 3.4, seed, 0.8);
    };
    const flames = [[-26, 70, 10], [-10, 36, 9], [8, 22, 8], [28, 30, 9], [52, 24, 8], [76, 28, 9], [96, 66, 10], [-34, 40, 8], [108, 40, 8]];
    flames.forEach(([dx, fh2, wd], i) => {
      tongue(fx + dx, fh2, wd, '#b3261e', 120 + i);
      tongue(fx + dx, fh2 * 0.6, wd * 0.6, '#e8841a', 140 + i);
    });
    // and a fire-ring overhead, between the two tall ones
    crayon(c, [[fx - 30, fb - 74], [fx - 10, fb - 90], [fx + 30, fb - 98], [fx + 70, fb - 92], [fx + 98, fb - 74]], '#b3261e', 3, 160, 1.4);
    // ---- below it all, in a child's hand: «بكرا أحلى»
    const cx = x0 + 282;
    const cy = -64;
    c.save();
    c.translate(cx, cy);
    c.rotate(-0.04);
    c.font = '34px "Aref Ruqaa", "Noto Naskh Arabic", "DejaVu Sans", serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    // felt-tip, twice, a hair apart, so the ink looks gone over
    c.fillStyle = 'rgba(28,48,112,0.75)';
    c.fillText('بكرا أحلى', 0, 0);
    c.fillStyle = 'rgba(34,58,128,0.6)';
    c.fillText('بكرا أحلى', 0.9, 0.7);
    // underlined with a wavering line, and a small heart at the end of it
    crayon(c, [[-66, 9], [-40, 12], [-10, 8], [22, 12], [52, 9], [66, 11]], '#223a80', 2.6, 170, 1.2);
    c.fillStyle = '#c4322a';
    c.beginPath();
    c.moveTo(80, 8);
    c.bezierCurveTo(70, -2, 82, -6, 84, 2);
    c.bezierCurveTo(88, -6, 100, -2, 88, 8);
    c.lineTo(84, 12);
    c.fill();
    c.restore();
    // ---- little hands in paint, down the left: red, blue, yellow, green
    const hands = [['#c4322a', 0], ['#2a5aa8', 22], ['#e0a418', 44], ['#3a8a4a', 66]];
    hands.forEach(([col, dx], i) => {
      const hxx = x0 + 262 + dx;
      const hyy = -34 - (i % 2) * 8;
      c.fillStyle = col;
      c.globalAlpha = 0.82;
      c.beginPath();
      c.ellipse(hxx, hyy - 6, 6, 7, 0, 0, TAU);
      c.fill();
      for (let f = 0; f < 4; f++) {
        c.beginPath();
        c.ellipse(hxx - 6 + f * 4, hyy - 16 - (f === 1 || f === 2 ? 2 : 0), 1.8, 5, (f - 1.5) * 0.18, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    });
    // a flag in three bands, as a child draws it, and its stars
    const ffx = x0 + 330;
    const ffy = -150;
    c.fillStyle = '#3a8a4a';
    c.fillRect(ffx, ffy, 30, 8);
    c.fillStyle = '#e8e4d8';
    c.fillRect(ffx, ffy + 8, 30, 8);
    c.fillStyle = '#22201e';
    c.fillRect(ffx, ffy + 16, 30, 8);
    c.fillStyle = '#b3261e';
    for (const dx of [6, 14, 22]) c.fillRect(ffx + dx, ffy + 10, 4, 4);
    crayon(c, [[ffx - 1, ffy - 4], [ffx - 1, ffy + 44]], '#5a4a3a', 2.4, 180, 0.6);
    c.restore();
  });
  void g;
  void t;
}

// ------------------------------------------------------------ the bakery --

// Abu Firas's courtyard, open to the street: the courtyard's back wall and
// a fig tree behind; then in front of it the clay oven built from rubble and
// concrete, a hand mill on a table, loaves cooling; a low wall at the front.
function courtyardBack(R, g, t, k) {
  // the back wall stands a little behind the street's line
  const d = 0.93;
  R.layer(d);
  const dx = (d - 1) * XW.bakery;
  T.block(R, { x: 1560 + dx, w: 700, floors: 2, seed: 72, color: '#8f8068', shopFront: true }, t);
  // the fig tree: a bare-ish tree against the wall, a few late leaves
  R.cast((c) => {
    const tx = XW.bakery + 270 + dx;
    c.fillStyle = '#4a3a2c';
    c.beginPath();
    c.moveTo(tx - 8, 0);
    c.quadraticCurveTo(tx - 6, -70, tx - 12, -120);
    c.lineTo(tx + 2, -120);
    c.quadraticCurveTo(tx + 6, -70, tx + 9, 0);
    c.fill();
    c.strokeStyle = '#4a3a2c';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(tx - 8, -118);
    c.quadraticCurveTo(tx - 40, -150, tx - 74, -148);
    c.moveTo(tx - 4, -122);
    c.quadraticCurveTo(tx + 24, -160, tx + 64, -164);
    c.moveTo(tx - 4, -100);
    c.quadraticCurveTo(tx + 30, -118, tx + 52, -112);
    c.stroke();
    const r = rng(66);
    c.save();
    A.lean(c, tx, -110, t, 2.1, 0.035); // the crown moves as one, the leaves a little more
    for (let i = 0; i < 26; i++) {
      const lx = tx - 70 + r() * 134;
      const ly = -170 + r() * 80;
      c.fillStyle = ['#6a7a30', '#8a8a38', '#a89a40', '#5a6a2c'][i % 4];
      c.save();
      c.translate(lx + Math.sin(t * 1.7 + i * 1.3) * 1.6, ly + Math.sin(t * 1.1 + i) * 1.4);
      c.rotate((r() - 0.5) * 2 + Math.sin(t * 2 + i) * 0.12);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(7, -9, 14, -3);
      c.quadraticCurveTo(7, 7, 0, 0);
      c.fill();
      c.restore();
    }
    c.restore();
    // a fig, still green
    c.fillStyle = '#7a8a3a';
    c.beginPath();
    c.ellipse(tx + 20, -128, 4, 5.5, 0, 0, TAU);
    c.fill();
  });
  // the haze of the courtyard air, to set it back
  R.paint((c) => {
    c.fillStyle = `rgba(150,100,70,${0.1 + 0.05 * k})`;
    c.fillRect(1560 + dx, -290, 700, 290);
  });
  R.layer(1);
  void g;
}

function clayOven(R, g, t) {
  const x = OVEN.x;
  const flick = 0.82 + 0.18 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1);
  // the dome, as a polygon: a stone base, then rounding in
  const dome = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    dome.push([x + Math.cos(a) * 82, -62 - Math.sin(a) * 100 * (0.9 + 0.1 * Math.sin(a))]);
  }
  const shell = [[x - 90, 0], [x - 90, -62], ...dome, [x + 90, -62], [x + 90, 0]];
  R.cast((c) => {
    // a rusted flue, on a bend, behind the dome
    c.fillStyle = '#6a4a38';
    c.fillRect(x + 22, -214, 20, 70);
    c.fillStyle = '#7a5440';
    c.beginPath();
    c.moveTo(x + 20, -214);
    c.lineTo(x + 44, -214);
    c.lineTo(x + 52, -234);
    c.lineTo(x + 14, -234);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x + 34, -214, 8, 70);
    c.fillStyle = '#4a3226';
    c.fillRect(x + 18, -240, 40, 6);
    // the thickness of the whole, behind it
    extrudePoly(c, shell, 46, { color: '#8f8472' });
    c.fillStyle = '#4a4036';
    c.beginPath();
    shell.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fill();
    // stones, bricks and chunks of concrete, laid by hand
    stoneWork(c, shell, 701, ['#7c776c', '#8f8776', '#6e655a', '#8a5a42', '#9a6c50', '#615c54', '#857a68', '#9a5238'], { rows: 17, wmin: 14, wmax: 32 });
    // the clay smoothed over the dome, thin and cracked, lit from the right
    const cg = c.createLinearGradient(x - 82, 0, x + 82, 0);
    cg.addColorStop(0, 'rgba(60,40,26,0.22)');
    cg.addColorStop(0.55, 'rgba(160,110,70,0.1)');
    cg.addColorStop(1, 'rgba(255,200,140,0.1)');
    c.fillStyle = cg;
    c.beginPath();
    dome.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    // soot fanned above the mouth
    const sg = c.createRadialGradient(x - 6, OVEN.mouthY - 34, 4, x - 6, OVEN.mouthY - 34, 56);
    sg.addColorStop(0, 'rgba(14,10,8,0.7)');
    sg.addColorStop(1, 'rgba(14,10,8,0)');
    c.fillStyle = sg;
    c.fillRect(x - 70, OVEN.mouthY - 90, 128, 90);
    // the mouth: an arch of laid bricks, dark inside, a lintel of concrete
    c.fillStyle = '#6c665c';
    c.beginPath();
    c.moveTo(x - 38, -62);
    c.lineTo(x - 38, -100);
    c.quadraticCurveTo(x - 32, -132, x - 6, -134);
    c.quadraticCurveTo(x + 22, -132, x + 28, -100);
    c.lineTo(x + 28, -62);
    c.fill();
    c.fillStyle = '#100a07';
    c.beginPath();
    c.moveTo(x - 30, -62);
    c.lineTo(x - 30, -98);
    c.quadraticCurveTo(x - 26, -124, x - 6, -126);
    c.quadraticCurveTo(x + 16, -124, x + 20, -98);
    c.lineTo(x + 20, -62);
    c.fill();
    // the lit throat of the oven
    const mg = c.createRadialGradient(x - 5, -70, 2, x - 5, -80, 52);
    mg.addColorStop(0, 'rgba(255,170,60,0.9)');
    mg.addColorStop(0.5, 'rgba(210,80,24,0.55)');
    mg.addColorStop(1, 'rgba(60,20,10,0)');
    c.fillStyle = mg;
    c.beginPath();
    c.moveTo(x - 30, -62);
    c.lineTo(x - 30, -98);
    c.quadraticCurveTo(x - 26, -124, x - 6, -126);
    c.quadraticCurveTo(x + 16, -124, x + 20, -98);
    c.lineTo(x + 20, -62);
    c.fill();
    // brick voussoirs round the arch
    c.strokeStyle = 'rgba(30,20,12,0.5)';
    c.lineWidth = 1.4;
    c.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const cx0 = x - 5;
      const cy0 = -100;
      c.moveTo(cx0 + Math.cos(a) * 25, cy0 + Math.sin(a) * 28);
      c.lineTo(cx0 + Math.cos(a) * 34, cy0 + Math.sin(a) * 36);
    }
    c.stroke();
    // an iron door, a sheet of steel with a handle, leaned beside the mouth
    c.fillStyle = '#5a4a40';
    c.beginPath();
    c.moveTo(x + 38, -6);
    c.lineTo(x + 48, -76);
    c.lineTo(x + 78, -74);
    c.lineTo(x + 72, -6);
    c.fill();
    c.fillStyle = 'rgba(140,70,34,0.5)';
    c.fillRect(x + 44, -60, 20, 5);
    c.fillRect(x + 42, -30, 24, 4);
    c.fillStyle = '#c9b48a';
    c.fillRect(x + 66, -50, 3, 12);
    // a baker's peel, a long pole with a flat head, against the wall
    c.fillStyle = '#7a5a3a';
    c.save();
    c.translate(x - 84, 0);
    c.rotate(0.07);
    c.fillRect(-2, -200, 4, 200);
    c.fillStyle = '#8a6a44';
    c.beginPath();
    c.ellipse(0, -204, 14, 9, 0, 0, TAU);
    c.fill();
    c.restore();
  });
  // the broken furniture it burns: chair legs, a door, laths
  R.cast((c) => {
    const r = rng(77);
    for (let i = 0; i < 12; i++) {
      c.save();
      c.translate(x + 96 + r() * 54, -4 - (i % 3) * 7);
      c.rotate((r() - 0.5) * 0.4 + (i % 2 ? 0 : 0.1));
      c.fillStyle = ['#6a4a30', '#8a6a44', '#4a3626', '#7a5a3c'][i % 4];
      c.fillRect(-26, -3, 54 + r() * 20, 6 + r() * 3);
      c.restore();
    }
  });
  // the oven's mouth and the lit stones around it
  R.glow((c) => {
    const gx = x - 5;
    const gy = OVEN.mouthY + 4;
    const g1 = c.createRadialGradient(gx, gy, 2, gx, gy, 70);
    g1.addColorStop(0, `rgba(255,170,70,${0.62 * flick})`);
    g1.addColorStop(0.35, `rgba(255,120,40,${0.3 * flick})`);
    g1.addColorStop(1, 'rgba(255,90,30,0)');
    c.fillStyle = g1;
    c.fillRect(gx - 80, gy - 80, 160, 160);
    // flames licking the lower part of the mouth
    c.fillStyle = `rgba(255,214,120,${0.85 * flick})`;
    for (let i = 0; i < 5; i++) {
      const fx = x - 24 + i * 9;
      const fh = 8 + 9 * Math.abs(Math.sin(t * (6 + i) + i * 2));
      c.beginPath();
      c.moveTo(fx - 4, -62);
      c.quadraticCurveTo(fx - 1, -62 - fh * 0.7, fx + Math.sin(t * 7 + i) * 2, -62 - fh);
      c.quadraticCurveTo(fx + 3, -62 - fh * 0.5, fx + 5, -62);
      c.fill();
    }
    // sparks rising
    const r = rng(12);
    for (let i = 0; i < 6; i++) {
      const u = (t * (0.4 + r() * 0.3) + r() * 5) % 1;
      c.fillStyle = `rgba(255,190,90,${0.7 * (1 - u)})`;
      c.fillRect(gx - 14 + r() * 28 + Math.sin(t * 2 + i) * 6, gy - 20 - u * 80, 1.6, 1.6);
    }
  });
  // smoke from the flue, and a thin lick of it from the mouth, drifting off to the left
  const top = -246;
  for (let i = 0; i < 2; i++) {
    T.plume(R, x + 38 - i * 30, top, t + i * 3, { depth: 1, age: 1, height: 150 + i * 30, width: 24 - i * 6, alpha: 0.3 - i * 0.1, color: [118, 104, 98] });
  }
  void g;
}

// The hand mill: two round stones one on the other, a peg to turn the upper,
// grain in the eye, flour spilling from the lip onto a cloth.
function handMill(R, g, t) {
  const { x, y } = MILL;
  const grinding = !!g.a?.grinding;
  const ph = grinding ? t * 4.4 : 0.6;
  R.cast((c) => {
    // the table: planks over two drums, scrubbed pale with flour
    extrudeRect(c, x - 58, y, 116, 7, 30, { color: '#7a5a3c' });
    c.fillStyle = '#7a5a3c';
    c.fillRect(x - 58, y, 116, 7);
    c.fillStyle = 'rgba(255,248,235,0.3)';
    c.fillRect(x - 56, y, 112, 1.6);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x - 58, y + 5, 116, 2);
    for (const dx of [-42, 32]) {
      c.fillStyle = '#5c6670';
      c.fillRect(x + dx - 12, y + 7, 24, -y - 7);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(x + dx + 4, y + 7, 8, -y - 7);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(x + dx - 12, y + 22, 24, 3);
      c.fillRect(x + dx - 12, y + 46, 24, 3);
      c.fillStyle = 'rgba(140,70,34,0.4)';
      c.fillRect(x + dx - 12, y + 30, 9, 12);
    }
    // a cloth laid under the mill
    c.fillStyle = '#b8a98c';
    c.fillRect(x - 44, y - 2, 92, 2.4);
    // a round stone seen from a little above: a drum and the ellipse of its face
    const drum = (cy, w, h, ry, body, face) => {
      c.fillStyle = body;
      c.beginPath();
      c.moveTo(x - w / 2, cy);
      c.lineTo(x - w / 2, cy - h);
      c.ellipse(x, cy - h, w / 2, ry, 0, Math.PI, 0);
      c.lineTo(x + w / 2, cy);
      c.ellipse(x, cy, w / 2, ry, 0, 0, Math.PI);
      c.closePath();
      c.fill();
      // the shaded flank on the left, the lit one on the right
      const sg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      sg.addColorStop(0, 'rgba(20,14,8,0.35)');
      sg.addColorStop(0.6, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(255,230,190,0.2)');
      c.fillStyle = sg;
      c.fill();
      c.fillStyle = face;
      c.beginPath();
      c.ellipse(x, cy - h, w / 2, ry, 0, 0, TAU);
      c.fill();
    };
    drum(y - 1, 66, 15, 5, '#7c766a', '#9a9384');
    // dressing marks: the furrows cut in the stone
    c.fillStyle = 'rgba(30,22,16,0.3)';
    for (const dx of [-22, -9, 6, 20]) c.fillRect(x + dx, y - 14, 1.5, 12);
    drum(y - 16, 56, 15, 4.6, '#8a8476', '#a8a190');
    // flour: along the seam, and spilling out over the right lip onto the cloth
    c.fillStyle = 'rgba(244,238,224,0.9)';
    c.beginPath();
    c.moveTo(x + 18, y - 17);
    c.quadraticCurveTo(x + 36, y - 16, x + 44, y - 4);
    c.lineTo(x + 24, y - 3);
    c.closePath();
    c.fill();
    c.beginPath();
    c.ellipse(x + 38, y - 2.4, 16, 4, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = 'rgba(244,238,224,0.7)';
    c.beginPath();
    c.ellipse(x, y - 16 + 5, 28, 2.4, 0, 0, Math.PI);
    c.fill();
    // the eye: a dark hole in the upper stone, the grain in it
    c.fillStyle = '#17120e';
    c.beginPath();
    c.ellipse(x - 2, y - 31, 9, 2.6, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#7a8260';
    for (let i = 0; i < 9; i++) c.fillRect(x - 9 + (i % 5) * 3, y - 33.4 - ((i * 3) % 3), 2, 2);
    // the handle: a peg in the upper stone's rim, a wooden grip above it, going round
    const hx = x + Math.cos(ph) * 21;
    const hy = y - 31 + Math.sin(ph) * 3.2;
    const lean = Math.sin(ph) * 2;
    c.lineCap = 'round';
    c.strokeStyle = '#5a3c22';
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(hx + lean, hy - 34);
    c.stroke();
    c.strokeStyle = '#8a6a44';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(hx + lean, hy - 34);
    c.lineTo(hx + lean * 1.2, hy - 46);
    c.stroke();
    c.lineCap = 'butt';
    // a tin bowl of ground feed, a scoop in it
    c.fillStyle = '#8c8a86';
    c.beginPath();
    c.moveTo(x - 48, y);
    c.lineTo(x - 54, y - 11);
    c.lineTo(x - 28, y - 11);
    c.lineTo(x - 34, y);
    c.fill();
    c.fillStyle = '#8a8a60';
    c.beginPath();
    c.ellipse(x - 41, y - 11, 13, 3.4, 0, Math.PI, 0);
    c.fill();
  });
  // flour dust, hanging in the low sun above it
  R.glow((c) => {
    const r = rng(33);
    const amt = grinding ? 1 : 0.35;
    const g1 = c.createRadialGradient(x + 6, y - 28, 4, x + 6, y - 28, 64);
    g1.addColorStop(0, `rgba(255,236,196,${0.14 * amt})`);
    g1.addColorStop(1, 'rgba(255,220,170,0)');
    c.fillStyle = g1;
    c.fillRect(x - 60, y - 96, 140, 106);
    for (let i = 0; i < 20; i++) {
      const u = (t * (0.07 + r() * 0.08) + r() * 4) % 1;
      const px = x + (r() - 0.5) * 60 + Math.sin(t * 0.9 + i) * 6 - u * 24;
      const py = y - 18 - u * 90 * (0.5 + r());
      c.fillStyle = `rgba(255,236,196,${amt * 0.55 * Math.sin(u * Math.PI)})`;
      c.fillRect(px, py, 1.5 + r() * 1.2, 1.5 + r() * 1.2);
    }
  });
}

// Loaves cooling on a board across a crate; a cloth over some; steam.
function loaves(R, g, t) {
  const x = XW.bakery + 195;
  const top = -64;
  R.cast((c) => {
    // the crate: slatted, a stencilled word on the side
    extrudeRect(c, x - 40, top, 80, -top, 26, { color: '#8a6a44' });
    c.fillStyle = '#8a6a44';
    c.fillRect(x - 40, top, 80, -top);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let yy = top + 16; yy < 0; yy += 16) c.fillRect(x - 40, yy, 80, 2.5);
    c.fillRect(x - 40, top, 4, -top);
    c.fillRect(x + 36, top, 4, -top);
    // the board, a plank over it, scorched at one end
    extrudeRect(c, x - 52, top - 5, 104, 5, 22, { color: '#a87e50' });
    c.fillStyle = '#a87e50';
    c.fillRect(x - 52, top - 5, 104, 5);
    c.fillStyle = 'rgba(40,24,12,0.5)';
    c.fillRect(x + 36, top - 5, 16, 5);
    // loaves: round, flat, grey-brown from the feed; scored, floured
    const loaf = (lx, ly, w, h, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(lx, ly - h / 2, w / 2, h / 2, 0, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,240,215,0.22)';
      c.beginPath();
      c.ellipse(lx - w * 0.1, ly - h * 0.7, w * 0.32, h * 0.2, 0, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(30,18,8,0.32)';
      c.fillRect(lx - w * 0.3, ly - h * 0.46, w * 0.6, 1.4);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(lx - w / 2 + 3, ly - 2.6, w - 6, 2.4);
    };
    // stacks laid flat, and one on edge leaning
    for (let n = 0; n < 3; n++) loaf(x - 28, top - 5 - n * 11, 44, 11, ['#85735c', '#7c6b56', '#8a7862'][n]);
    for (let n = 0; n < 2; n++) loaf(x + 14, top - 5 - n * 11, 42, 11, ['#7c6b56', '#85735c'][n]);
    c.save();
    c.translate(x + 40, top - 5);
    c.rotate(-0.2);
    c.fillStyle = '#7f6d58';
    c.beginPath();
    c.ellipse(0, -22, 8, 22, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,240,215,0.22)';
    c.beginPath();
    c.ellipse(-2.5, -30, 2.6, 10, 0, 0, TAU);
    c.fill();
    c.restore();
  });
  // steam from the warm bread, thin and brief
  R.glow((c) => {
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.22 + i * 0.25) % 1;
      const px = x - 30 + i * 22 + Math.sin(t * 1.4 + i * 2) * 4;
      const py = top - 42 - u * 40;
      const g1 = c.createRadialGradient(px, py, 0, px, py, 9 + u * 8);
      g1.addColorStop(0, `rgba(255,236,200,${0.15 * Math.sin(u * Math.PI)})`);
      g1.addColorStop(1, 'rgba(255,220,170,0)');
      c.fillStyle = g1;
      c.fillRect(px - 18, py - 18, 36, 36);
    }
  });
  void g;
}

// Sacks of feed, stacked against the far wall; a water can, a bucket.
function courtyardClutter(R) {
  const x = XW.bakery + 300;
  R.cast((c) => {
    const sack = (sx, sy, w, h, col, tilt = 0) => {
      c.save();
      c.translate(sx, sy);
      c.rotate(tilt);
      extrudePoly(c, [[-w / 2, 0], [-w / 2 + 3, -h + 8], [-w / 2 + 10, -h], [w / 2 - 10, -h], [w / 2 - 3, -h + 8], [w / 2, 0]], 14, { color: col });
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-w / 2, 0);
      c.quadraticCurveTo(-w / 2 - 3, -h * 0.5, -w / 2 + 5, -h + 6);
      c.lineTo(-w / 2 + 10, -h);
      c.lineTo(w / 2 - 10, -h);
      c.lineTo(w / 2 - 5, -h + 6);
      c.quadraticCurveTo(w / 2 + 3, -h * 0.5, w / 2, 0);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.fillRect(-w / 2 + 6, -h + 12, w - 12, 1.6);
      c.fillRect(w / 2 - 12, -h + 12, 1.6, h - 12);
      c.fillStyle = 'rgba(90,50,40,0.5)';
      c.font = '14px "Aref Ruqaa", "DejaVu Sans", serif';
      c.textAlign = 'center';
      c.fillText('علف', 0, -h * 0.42);
      c.restore();
    };
    sack(x, 0, 46, 66, '#97835e');
    sack(x + 44, 0, 46, 62, '#8e7a56', 0.03);
    sack(x + 18, -62, 44, 60, '#9c8862', -0.04);
    // a jerry can of water and a bucket
    T.jerryCan(c, x - 62, 0, 1, '#5a7a4a');
    c.fillStyle = '#6a7a8a';
    c.beginPath();
    c.moveTo(x - 36, 0);
    c.lineTo(x - 40, -26);
    c.lineTo(x - 14, -26);
    c.lineTo(x - 18, 0);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x - 40, -26, 26, 3);
  });
}

// The low wall that fronts the courtyard, in front of the oven.
function bakeryWall(R) {
  rubbleWall(R, XW.bakery - 232, XW.bakery - 12, 54, 23);
}

// ------------------------------------------------------------ the street --

// Small things left in the street: kerbside litter, a chair, a handcart.
function dressing(R, near) {
  if (near(XW.bakery + 330, XW.bakery + 560)) {
    // a handcart, its wooden bed empty, one wheel off
    R.cast((c) => {
      const x = XW.bakery + 440;
      c.fillStyle = '#7a5a3a';
      extrudeRect(c, x, -52, 90, 8, 18, { color: '#7a5a3a' });
      c.fillRect(x, -52, 90, 8);
      c.fillRect(x - 40, -50, 44, 4);
      c.fillStyle = '#4a3a2c';
      c.fillRect(x + 4, -44, 4, 14);
      c.fillRect(x + 82, -44, 4, 22);
      c.strokeStyle = '#2a2420';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x + 62, -22, 22, 0, TAU);
      c.moveTo(x + 62, -22);
      c.lineTo(x + 62, 0);
      c.moveTo(x + 40, -22);
      c.lineTo(x + 84, -22);
      c.stroke();
      c.fillStyle = '#2a2420';
      c.beginPath();
      c.arc(x + 62, -22, 3, 0, TAU);
      c.fill();
    });
  }
  if (near(4290, 4400)) {
    // two oil drums, one on its side, left against the wall
    R.cast((c) => {
      c.fillStyle = '#4a5a6a';
      c.fillRect(4312, -60, 36, 60);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(4336, -60, 12, 60);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(4312, -44, 36, 3);
      c.fillRect(4312, -20, 36, 3);
      c.fillStyle = 'rgba(150,70,34,0.5)';
      c.fillRect(4314, -34, 12, 14);
      c.fillStyle = '#6a7a8a';
      c.fillRect(4310, -64, 40, 5);
      c.fillStyle = '#5a4a3a';
      c.fillRect(4356, -36, 54, 36);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(4356, -12, 54, 12);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      for (const dx of [10, 26, 42]) c.fillRect(4356 + dx, -36, 3, 36);
      c.fillStyle = '#3a2e24';
      c.beginPath();
      c.ellipse(4356, -18, 6, 18, 0, 0, TAU);
      c.fill();
    });
  }
}

// ---------------------------------------------------------------- scene --

// What moves on its own: thin smoke from a stove pipe, pigeons on the walls
// and the rail, a flock over the roofs, a bag on the draught, a drip, and dust
// turning in the low sun.
function streetLife(R, g, t, k, near) {
  const cx = R.cam.x;
  if (near(2160, 2400)) {
    const [wx, wy, ww] = T.windowRect(BLOCKS[10], 0, 1);
    R.cast((c) => {
      c.fillStyle = '#4a4540';
      c.fillRect(wx + ww * 0.55, wy - 64, 6, 76);
      c.fillRect(wx + ww * 0.55 - 3, wy - 68, 12, 5);
    });
    A.smoke(R, wx + ww * 0.55 + 3, wy - 70, t, { warm: 0.5 + k * 0.5, h: 190, w: 20, alpha: 0.3, seed: 2 });
  }
  const sit = [[2490, -WALL.h + 2, 1], [2688, -WALL.h + 6, 2], [BALC.x + 34, BALC.y - 94, 3], [LEDGE.x1 - 10, -LEDGE.h - 2, 4], [XW.bakery + 150, -52, 5]];
  for (const [px, py, sd] of sit) if (near(px - 30, px + 30)) A.perch(R, px, py, t, sd);
  A.flock(R, cx, t, { y: -400, n: 4, every: 51, dur: 12, seed: 3, dir: -1, color: 'rgba(60,44,46,0.75)' });
  A.bag(R, cx, t, { every: 53, dur: 17, seed: 4 });
  if (near(1296, 1356)) {
    R.cast((c) => {
      c.fillStyle = '#4a4d52';
      c.fillRect(1296, -134, 22, 6);
      c.fillRect(1294, -170, 5, 38);
    });
    A.drip(R, 1318, -131, 0, t, 3);
  }
  if (near(WALL.x0, WALL.x1)) A.sunMotes(R, WALL.x0, WALL.x1, -250, -20, t, { n: 14, seed: 2, color: '255,200,140' });
}

export function drawQuarter(R, g, { k = 0, t = 0 } = {}) {
  k = clamp(k);
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1600 && x0 < cx + 1600;
  const dof = g.settings?.get?.('dof') || 'bokeh';
  const lite = g.settings?.get?.('quality') === 'low';

  // ---- the sky, the sun low on the right, the hills and the far roofline
  const stops = skyStops(k);
  T.sky(R, stops, { sun: [0.9, lerp(0.42, 0.62, k)], warmth: clamp(0.85 + k * 0.4), clouds: 0.6, cloudLit: mixc([255, 196, 140], [238, 132, 106], k), cloudShade: mixc([124, 104, 122], [74, 62, 92], k) });
  horizon(R, {
    haze: rgbOf(stops[stops.length - 1][1]),
    shade: mixc([122, 102, 104], [70, 56, 76], k),
    cloud: mixc([255, 214, 176], [236, 150, 136], k),
    span: 7000,
    seed: 31,
    t,
    lights: 0,
    lite,
  });
  T.plume(R, 1400, 60, t, { depth: 0.18, age: 1, height: 340, width: 56, alpha: 0.36, color: [86, 78, 80] });
  const sk = mixc([150, 134, 116], [102, 84, 98], k).map(Math.round);
  T.skyline(R, { depth: 0.32, y: 40, color: `#${sk.map((v) => v.toString(16).padStart(2, '0')).join('')}`, seed: 23, haze: ['#d4aa90', 0.2], x0: -3500, x1: 9000 });

  // ---- what lies between the buildings (before them, so they frame it)
  if (near(GAP.x0, GAP.x1)) viewGap(R, g, t, k, dof);
  if (near(ALLEY.x0, ALLEY.x1)) alley(R, g, t, k);
  if (near(1560, 2260)) courtyardBack(R, g, t, k);

  // ---- the façades
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  if (near(TORN.x0, TORN.x1)) tornFace(R, g, t);
  if (near(WALL.x0, WALL.x1)) graffitiWall(R, g, t);
  if (near(XW.woman - 80, XW.woman + 80)) womanDoorway(R, XW.woman, t);
  if (near(XW.umSaid - 120, XW.umSaid + 200)) umSaidFlat(R, XW.umSaid, t);
  if (near(BALC.x - 120, BALC.x + 220)) balcony(R, BALC.x, BALC.y, t);

  // the evening throws the shadows of the buildings long, to the left, across
  // the faces opposite
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,1)';
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (!near(b.x - 300, b.x + b.w + 300)) continue;
      const h = 200 + ((i * 97) % 5) * 36 + k * 150;
      const xr = b.x + b.w - ((i * 53) % 3) * 40 + 60;
      const w = b.w * (0.8 + ((i * 31) % 4) * 0.12);
      c.beginPath();
      c.moveTo(xr, 10);
      c.lineTo(xr - 60, -h);
      c.lineTo(xr - w - 60, -h + 50);
      c.lineTo(xr - w - 220, 10);
      c.closePath();
      c.fill();
    }
  }, 0, 0, 0, 1);

  // ---- the ground
  T.street(R, -1900, 6600);
  T.cables(R, cx, { seed: 278, from: -1700, to: 6200 });
  ledge(R);
  dressing(R, near);
  if (near(4980, 5320)) T.rubble(R, 5010, 300, 120, { seed: 93 });
  if (near(3560, 3720)) T.rubble(R, 3570, 120, 40, { seed: 94, rebar: false });

  // ---- the bakery: oven, table, mill, loaves, sacks, then the wall in front
  if (near(XW.bakery - 240, XW.bakery + 560)) {
    clayOven(R, g, t);
    courtyardClutter(R);
    handMill(R, g, t);
    loaves(R, g, t);
    bakeryWall(R);
  }
  // the wall to sit on, in front of the drawings
  if (near(SIT.x0, SIT.x1)) rubbleWall(R, SIT.x0, SIT.x1, SIT.h, 29);
  // a sack of flour at the foot of the torn building, if there is a man to help
  if (g.state?.e_choice === 'people' && !g.a?.carried && near(XW.torn - 80, XW.torn + 80)) {
    R.cast((c) => {
      const sx = XW.torn;
      c.fillStyle = '#d6ccb4';
      c.beginPath();
      c.moveTo(sx - 24, 0);
      c.quadraticCurveTo(sx - 30, -30, sx - 18, -50);
      c.lineTo(sx + 16, -50);
      c.quadraticCurveTo(sx + 30, -30, sx + 24, 0);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.fillRect(sx - 20, -44, 38, 2);
      c.fillRect(sx + 10, -44, 2, 44);
    });
  }

  streetLife(R, g, t, k, near);

  // ---- the scene's own props (the camera's flash, a dropped thing...)
  g.act?.drawProps?.(R, g);

  // ---- the people, their shadows long and thrown to the left
  const shear = shearFor(k);
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, SQUASH);
  }

  // ---- in front of everyone: smoke and dust in the air, the foreground
  g.effects?.draw?.(R);
  g.effects?.drawFog?.(R, [190, 150, 130]);
  T.motes(R, cx, t, 0.9 * (1 - k * 0.4));
  T.foreground(R, cx, { from: -1700, to: 6200 });
}

// ============================================================ Um Said's room ==

const [RC, RHW] = UM_SAID;
const FLOOR = { x0: RC - RHW, x1: RC + RHW, h: 270 };
const DOOR = { x: RC - 292, w: 96, h: 205 };
export const UM_SAID_SEAT = [RC - 20, -44];
export const BAG_X = UM_SAID_SEAT[0] - 74;
const WIN = { x: RC + 150, w: 92, y: -208, h: 116 };

export function umSaidLook(g) {
  const t = g.time || 0;
  const fl = 0.94 + 0.06 * Math.sin(t * 2.1) * Math.sin(t * 0.9);
  const lights = [
    // the street, in the door: low amber, from the left
    { x: DOOR.x + 10, y: -DOOR.h * 0.55, color: [1.0, 0.64, 0.32], intensity: 1.15 * fl, radius: 0.5, rim: 0.7 },
    // the window, its curtains drawn: the last of the day through cloth
    { x: WIN.x, y: WIN.y + WIN.h / 2, color: [1.0, 0.58, 0.32], intensity: 0.4, radius: 0.35, rim: 0.3 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: [0.2, 0.17, 0.16],
    lights,
    groundShadow: 0.5,
    bloom: 0.62,
    exposure: 0.92,
    grain: 0.06,
    grade: { sat: 0.88, contrast: 1.08, lift: 0, tint: [1.02, 0.97, 0.92], shadows: [0.95, 0.94, 1.08], highs: [1.1, 0.98, 0.84] },
    fog: { density: 0.06, height: 220, color: [0.62, 0.42, 0.28] },
    time: t,
    fade: g.a?.endFade || 0,
  };
}

// A dim ground-floor room. The open door at the left, with amber street
// light; one window, curtains drawn; a mattress on the floor; a tray with a
// teapot and cold tea; a low seat just inside where Um Said sits; and, when
// `bag` is 1, Ahmad's cloth school bag on the floor near her.
export function drawUmSaidRoom(R, g, { t = 0, bag = 0 } = {}) {
  const { x0, x1, h } = FLOOR;
  const w = x1 - x0;
  const top = -h;
  // the dark all round the room: its own world, the street gone
  R.paint((c) => {
    c.fillStyle = '#0c0907';
    c.fillRect(x0 - 1800, -1400, w + 3600, 2800);
  });
  // the shell: floor, ceiling and end walls as thick bars of old concrete
  R.cast((c) => {
    const slab = (px, py, pw, ph, col) => {
      extrudeRect(c, px, py, pw, ph, 30, { color: col });
      c.fillStyle = col;
      c.fillRect(px, py, pw, ph);
    };
    slab(x0 - 50, 0, w + 100, 40, '#6a5f52'); // the floor
    slab(x0 - 50, top - 36, w + 100, 36, '#6a5f52'); // the ceiling
    slab(x0 - 50, top - 36, 50, h + 76, '#665b4e'); // the left wall
    slab(x1, top - 36, 50, h + 76, '#665b4e'); // the right wall
    c.fillStyle = 'rgba(255,240,215,0.1)';
    c.fillRect(x0 - 50, 0, w + 100, 2);
  });
  // the back wall: old limewash gone the colour of tea; a green dado band
  R.paint((c) => {
    const bg = c.createLinearGradient(0, top, 0, 0);
    bg.addColorStop(0, '#6e5a46');
    bg.addColorStop(1, '#85705a');
    c.fillStyle = bg;
    c.fillRect(x0, top, w, h);
    c.fillStyle = '#3f5a48'; // oil-paint dado to shoulder height
    c.fillRect(x0, -108, w, 108);
    c.fillStyle = 'rgba(255,244,220,0.18)';
    c.fillRect(x0, -110, w, 2.4);
    c.fillStyle = 'rgba(8,6,4,0.25)';
    c.fillRect(x0, -106, w, 6);
    // stains, a tide-mark, cracks
    const r = rng(404);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(40,28,18,0.1)' : 'rgba(255,238,210,0.06)';
      c.fillRect(x0 + r() * w, top + r() * h, 16 + r() * 60, 12 + r() * 40);
    }
    c.strokeStyle = 'rgba(20,14,10,0.5)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(RC - 60, top + 4);
    c.lineTo(RC - 50, top + 60);
    c.lineTo(RC - 70, top + 110);
    c.lineTo(RC - 56, top + 170);
    c.stroke();
  });
  R.surface((c) => c.rect(x0, top, w, h), 'plaster', { scale: 1.3, seed: 8, alpha: 0.8 });
  // the floor's surface: old tiles, in a worn pattern, seen as a band at the foot
  R.surface((c) => c.rect(x0, 0, w, 40), 'pavers', { scale: 0.5, seed: 3, alpha: 0.7 });

  // ---- the door at the left: open; the amber street beyond
  const dx0 = DOOR.x - DOOR.w / 2;
  R.paint((c) => {
    // the street seen through it: a house across the way, lit orange, a sliver of sky
    const sg = c.createLinearGradient(0, -DOOR.h, 0, 0);
    sg.addColorStop(0, '#d8804a');
    sg.addColorStop(1, '#b86a3a');
    c.fillStyle = sg;
    c.fillRect(dx0, -DOOR.h, DOOR.w, DOOR.h);
    c.fillStyle = '#8a5a3c';
    c.fillRect(dx0 + 30, -DOOR.h * 0.8, DOOR.w - 30, DOOR.h * 0.8);
    c.fillStyle = '#a06c46';
    c.fillRect(dx0 + 30, -DOOR.h * 0.8, DOOR.w - 30, 6);
    c.fillStyle = 'rgba(30,16,10,0.65)';
    c.fillRect(dx0 + 40, -DOOR.h * 0.62, 16, 30);
    c.fillRect(dx0 + 62, -DOOR.h * 0.62, 16, 30);
    c.fillRect(dx0 + 40, -DOOR.h * 0.3, 16, 28);
    // the wall across the lane, dark against the sky; the kerb below
    c.fillStyle = '#8a6a50';
    c.fillRect(dx0, -14, DOOR.w, 14);
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(255,190,110,0.2)';
    c.fillRect(dx0, -DOOR.h, DOOR.w, DOOR.h);
  });
  R.cast((c) => {
    // a stone surround, deep, and the green leaf standing open, foreshortened
    extrudeRect(c, dx0 - 12, -DOOR.h - 12, 12, DOOR.h + 12, 24, { color: '#a89c86' });
    c.fillStyle = '#a89c86';
    c.fillRect(dx0 - 12, -DOOR.h - 12, 12, DOOR.h + 12);
    c.fillRect(dx0 + DOOR.w, -DOOR.h - 12, 12, DOOR.h + 12);
    c.fillRect(dx0 - 12, -DOOR.h - 12, DOOR.w + 24, 12);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(dx0 + DOOR.w, -DOOR.h - 12, 4, DOOR.h + 12);
    c.fillStyle = '#3d7a55';
    c.beginPath();
    c.moveTo(dx0 + DOOR.w + 12, 0);
    c.lineTo(dx0 + DOOR.w + 12, -DOOR.h - 12);
    c.lineTo(dx0 + DOOR.w + 38, -DOOR.h - 2);
    c.lineTo(dx0 + DOOR.w + 38, -10);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(dx0 + DOOR.w + 12, -DOOR.h - 12, 4, DOOR.h + 12);
    c.fillStyle = '#a99a72';
    c.fillRect(dx0 + DOOR.w + 32, -DOOR.h * 0.5, 4, 3);
  });
  // the shaft of street light falling across the room, and dust turning in it
  R.glow((c) => {
    const sx0 = dx0 + DOOR.w;
    const sh = c.createLinearGradient(sx0, -DOOR.h, sx0 + 330, 0);
    sh.addColorStop(0, 'rgba(255,184,100,0.34)');
    sh.addColorStop(1, 'rgba(255,170,90,0.04)');
    c.fillStyle = sh;
    c.beginPath();
    c.moveTo(sx0 + 4, -DOOR.h + 6);
    c.lineTo(sx0 + 4, -10);
    c.lineTo(sx0 + 380, -2);
    c.lineTo(sx0 + 210, -DOOR.h * 0.5);
    c.fill();
    // the lit patch on the floor and the wall by the door
    const fl = c.createLinearGradient(0, -14, 0, 0);
    fl.addColorStop(0, 'rgba(255,190,110,0)');
    fl.addColorStop(1, 'rgba(255,190,110,0.3)');
    c.fillStyle = fl;
    c.fillRect(sx0 + 40, -14, 300, 14);
    const r = rng(15);
    for (let i = 0; i < 28; i++) {
      const u = (t * (0.03 + r() * 0.04) + r() * 3) % 1;
      const px = sx0 + 10 + r() * 240 + Math.sin(t * 0.5 + i) * 8;
      const py = -DOOR.h + 20 + u * (DOOR.h - 40);
      c.fillStyle = `rgba(255,226,170,${0.5 * Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(t * 1.3 + i))})`;
      c.fillRect(px, py, 1.6, 1.6);
    }
  });

  // ---- the window, curtains drawn
  R.cast((c) => {
    extrudeRect(c, WIN.x - WIN.w / 2 - 8, WIN.y - 8, WIN.w + 16, WIN.h + 16, 18, { color: '#a89c86' });
    c.fillStyle = '#a89c86';
    c.fillRect(WIN.x - WIN.w / 2 - 8, WIN.y - 8, WIN.w + 16, WIN.h + 16);
    c.fillStyle = '#2a1e16';
    c.fillRect(WIN.x - WIN.w / 2, WIN.y, WIN.w, WIN.h);
    const sway = Math.sin(t * 0.7) * 1.2;
    const cg = c.createLinearGradient(WIN.x - WIN.w / 2, 0, WIN.x + WIN.w / 2, 0);
    cg.addColorStop(0, '#6a3830');
    cg.addColorStop(0.5, '#7a4636');
    cg.addColorStop(1, '#5a2c28');
    c.fillStyle = cg;
    c.fillRect(WIN.x - WIN.w / 2 + 1, WIN.y + 3, WIN.w - 2, WIN.h - 4);
    c.fillStyle = 'rgba(0,0,0,0.24)';
    for (let i = 0; i < 11; i++) c.fillRect(WIN.x - WIN.w / 2 + 3 + i * 8.4 + sway * (i / 11), WIN.y + 3, 3, WIN.h - 4);
    c.fillStyle = 'rgba(255,214,170,0.2)';
    for (let i = 0; i < 11; i++) c.fillRect(WIN.x - WIN.w / 2 + 6.4 + i * 8.4 + sway * (i / 11), WIN.y + 3, 1.2, WIN.h - 4);
    c.fillStyle = '#2a2420';
    c.fillRect(WIN.x - WIN.w / 2 - 6, WIN.y - 2, WIN.w + 12, 4);
    // the middle where the two halves meet does not quite close: a seam
    c.fillStyle = '#1a1210';
    c.fillRect(WIN.x - 1, WIN.y + 3, 2, WIN.h - 4);
    c.fillStyle = '#a89c86';
    c.fillRect(WIN.x - WIN.w / 2 - 10, WIN.y + WIN.h + 8, WIN.w + 20, 6);
  });
  R.glow((c) => {
    // the sun on its far side, through the cloth, and a bar of it at the seam
    c.fillStyle = 'rgba(255,150,70,0.18)';
    c.fillRect(WIN.x - WIN.w / 2 + 1, WIN.y + 3, WIN.w - 2, WIN.h - 4);
    const sg = c.createLinearGradient(WIN.x, 0, WIN.x, 0);
    void sg;
    c.fillStyle = 'rgba(255,196,120,0.55)';
    c.fillRect(WIN.x - 0.8, WIN.y + 4, 1.6, WIN.h - 6);
    // and a long slant of it on the floor, as it comes round the edge of the cloth
    const sh = c.createLinearGradient(WIN.x, WIN.y + WIN.h, WIN.x - 220, 0);
    sh.addColorStop(0, 'rgba(255,170,90,0.2)');
    sh.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = sh;
    c.beginPath();
    c.moveTo(WIN.x - 10, WIN.y + WIN.h + 6);
    c.lineTo(WIN.x + 10, WIN.y + WIN.h + 6);
    c.lineTo(WIN.x - 150, -3);
    c.lineTo(WIN.x - 280, -3);
    c.fill();
  });

  // ---- the wall: hooks with a coat and a headscarf, a clock, a framed photograph
  R.cast((c) => {
    // a row of hooks, a coat, a scarf
    const hx = RC + 40;
    c.fillStyle = '#2a2420';
    c.fillRect(hx - 10, -222, 80, 4);
    c.fillStyle = '#3a3a44';
    c.beginPath();
    c.moveTo(hx, -218);
    c.lineTo(hx + 28, -218);
    c.lineTo(hx + 32, -128);
    c.lineTo(hx - 4, -126);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(hx + 18, -218, 10, 92);
    c.fillStyle = '#6a5a7a';
    c.beginPath();
    c.moveTo(hx + 44, -218);
    c.lineTo(hx + 66, -218);
    c.quadraticCurveTo(hx + 66 + Math.sin(t * 0.9), -190, hx + 58, -160);
    c.lineTo(hx + 48, -164);
    c.fill();
    // the clock, stopped some time ago
    c.fillStyle = '#d8d0c0';
    c.beginPath();
    c.arc(RC - 130, -226, 17, 0, TAU);
    c.fill();
    c.strokeStyle = '#2a2420';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(RC - 130, -226, 17, 0, TAU);
    c.stroke();
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(RC - 130, -226);
    c.lineTo(RC - 130, -238);
    c.moveTo(RC - 130, -226);
    c.lineTo(RC - 122, -222);
    c.stroke();
    // a framed photograph, a young man in a school jacket, a black ribbon across a corner
    c.fillStyle = '#4a3326';
    c.fillRect(RC - 50, -216, 40, 52);
    c.fillStyle = '#6b4c38';
    c.fillRect(RC - 48, -214, 36, 48);
    // the print: a studio's faded backdrop, lighter at the head
    const bg = c.createRadialGradient(RC - 30, -196, 2, RC - 30, -192, 26);
    bg.addColorStop(0, '#d9c9a6');
    bg.addColorStop(1, '#9c8a6c');
    c.fillStyle = bg;
    c.fillRect(RC - 46, -212, 32, 44);
    // shoulders in a dark jacket, a white collar
    c.fillStyle = '#3e3a34';
    c.beginPath();
    c.moveTo(RC - 45, -168);
    c.quadraticCurveTo(RC - 44, -182, RC - 30, -184);
    c.quadraticCurveTo(RC - 16, -182, RC - 15, -168);
    c.fill();
    c.fillStyle = '#e8e0cc';
    c.beginPath();
    c.moveTo(RC - 34, -184);
    c.lineTo(RC - 30, -178);
    c.lineTo(RC - 26, -184);
    c.fill();
    // neck, face, hair
    c.fillStyle = '#8f6c52';
    c.fillRect(RC - 32.5, -188, 5, 5);
    c.beginPath();
    c.ellipse(RC - 30, -194, 5.6, 7, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#2a211b';
    c.beginPath();
    c.ellipse(RC - 30, -199, 6, 3.6, 0, Math.PI, TAU);
    c.fill();
    c.fillRect(RC - 36, -199.5, 12, 1.6);
    c.fillStyle = 'rgba(40,28,20,0.55)';
    c.fillRect(RC - 32.6, -195, 1.6, 1.1);
    c.fillRect(RC - 29, -195, 1.6, 1.1);
    // the glass: a sheen across one corner
    c.fillStyle = 'rgba(255,245,225,0.12)';
    c.beginPath();
    c.moveTo(RC - 14, -212);
    c.lineTo(RC - 22, -212);
    c.lineTo(RC - 46, -184);
    c.lineTo(RC - 46, -176);
    c.fill();
    // the black ribbon
    c.fillStyle = '#16120f';
    c.beginPath();
    c.moveTo(RC - 50, -216);
    c.lineTo(RC - 34, -216);
    c.lineTo(RC - 50, -200);
    c.fill();
  });

  // ---- the mattress on the floor, a quilt and a pillow, a folded blanket
  R.cast((c) => {
    const mx = RC + 196;
    extrudeRect(c, mx, -24, 170, 24, 28, { color: '#8a8470' });
    c.fillStyle = '#8f8872';
    c.beginPath();
    c.moveTo(mx, 0);
    c.lineTo(mx, -20);
    c.quadraticCurveTo(mx + 4, -26, mx + 14, -25);
    c.lineTo(mx + 156, -25);
    c.quadraticCurveTo(mx + 166, -26, mx + 170, -20);
    c.lineTo(mx + 170, 0);
    c.fill();
    c.fillStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < 6; i++) c.fillRect(mx + 20 + i * 24, -22, 1.6, 22);
    // the quilt, drawn up and thrown back, in stripes
    c.fillStyle = '#7a3c3a';
    c.beginPath();
    c.moveTo(mx + 52, -24);
    c.quadraticCurveTo(mx + 80, -44, mx + 130, -34);
    c.quadraticCurveTo(mx + 164, -30, mx + 168, -22);
    c.lineTo(mx + 168, -10);
    c.lineTo(mx + 52, -10);
    c.fill();
    c.fillStyle = 'rgba(230,206,150,0.5)';
    for (let i = 0; i < 6; i++) c.fillRect(mx + 66 + i * 17, -38 + (i % 3), 5, 28);
    // a pillow
    c.fillStyle = '#d8d0bc';
    c.beginPath();
    c.ellipse(mx + 28, -33, 24, 11, -0.08, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.beginPath();
    c.ellipse(mx + 34, -30, 20, 6, -0.08, 0, TAU);
    c.fill();
    // a folded blanket on a plastic stool, and a water bottle by it
    c.fillStyle = '#5a5a60';
    c.fillRect(RC + 160, -26, 28, 26);
    c.fillStyle = '#6a6a72';
    c.fillRect(RC + 156, -30, 36, 5);
    c.fillStyle = '#7a8a6a';
    c.fillRect(RC + 158, -44, 32, 14);
    c.fillStyle = '#b8a07a';
    c.fillRect(RC + 158, -48, 32, 5);
    // the bottle
    c.fillStyle = 'rgba(160,190,210,0.5)';
    c.fillRect(RC + 196, -28, 8, 28);
    c.fillRect(RC + 198, -34, 4, 6);
  });
  R.glow((c) => {
    // the pillow and the quilt, warmed by the window across the room
    const g1 = c.createRadialGradient(RC + 260, -34, 4, RC + 260, -34, 110);
    g1.addColorStop(0, 'rgba(255,160,80,0.14)');
    g1.addColorStop(1, 'rgba(255,150,70,0)');
    c.fillStyle = g1;
    c.fillRect(RC + 150, -140, 230, 150);
  });

  // ---- the tray: a brass tray on the floor, a teapot, glasses of tea gone cold
  R.cast((c) => {
    const tx = RC + 84;
    // a low folding stand under it
    c.fillStyle = '#4a3a2c';
    c.fillRect(tx - 36, -18, 3, 18);
    c.fillRect(tx + 33, -18, 3, 18);
    // the tray, brass, a rim
    c.fillStyle = '#a07a3a';
    c.fillRect(tx - 42, -22, 84, 4);
    c.fillStyle = '#c4a050';
    c.fillRect(tx - 42, -24, 84, 2);
    // the teapot: a squat steel one, a curved spout and a handle
    c.fillStyle = '#8a9096';
    c.beginPath();
    c.moveTo(tx - 28, -24);
    c.lineTo(tx - 31, -38);
    c.quadraticCurveTo(tx - 26, -46, tx - 12, -46);
    c.quadraticCurveTo(tx + 2, -46, tx + 4, -38);
    c.lineTo(tx + 1, -24);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(tx - 26, -42, 5, 16);
    c.fillStyle = '#6a7076';
    c.fillRect(tx - 22, -50, 12, 4);
    c.beginPath();
    c.arc(tx - 16, -52, 3, 0, TAU);
    c.fill();
    c.strokeStyle = '#8a9096';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(tx + 2, -34);
    c.quadraticCurveTo(tx + 20, -38, tx + 14, -46);
    c.stroke();
    c.beginPath();
    c.moveTo(tx - 30, -38);
    c.quadraticCurveTo(tx - 44, -44, tx - 36, -26);
    c.stroke();
    // three glasses, the tea in them dark and still, a film on it
    for (const gx of [tx + 14, tx + 26, tx + 37]) {
      c.fillStyle = 'rgba(190,210,220,0.34)';
      c.beginPath();
      c.moveTo(gx - 5, -24);
      c.lineTo(gx - 6, -45);
      c.lineTo(gx + 6, -45);
      c.lineTo(gx + 5, -24);
      c.fill();
      c.fillStyle = '#5a2a12';
      c.fillRect(gx - 5, -40, 10, 14);
      c.fillStyle = 'rgba(255,214,150,0.4)';
      c.fillRect(gx - 5, -40, 10, 1.4);
    }
    // a saucer of sugar lumps
    c.fillStyle = '#d8d0b8';
    c.fillRect(tx - 6, -26, 14, 2);
  });
  // a long shadow thrown across the floor from the tray, away from the door
  R.shadow((c) => {
    c.fillStyle = '#000';
    c.fillRect(RC + 84 - 36, -50, 70, 50);
  }, RC + 84, 0, -1.5, 0.1);

  // ---- the low seat just inside, where she sits
  const [sx, sy] = UM_SAID_SEAT;
  R.cast((c) => {
    // a stool with a rush seat and a short back at the right
    c.fillStyle = '#5a4030';
    c.fillRect(sx - 22, sy + 4, 5, -sy - 4);
    c.fillRect(sx + 17, sy + 4, 5, -sy - 4);
    c.fillRect(sx + 14, sy - 52, 5, 56);
    c.fillRect(sx + 14, sy - 52, 10, 4);
    c.fillStyle = '#8a6a3a';
    extrudeRect(c, sx - 26, sy, 52, 7, 18, { color: '#8a6a3a' });
    c.fillRect(sx - 26, sy, 52, 7);
    c.fillStyle = 'rgba(40,24,10,0.4)';
    for (let i = 0; i < 6; i++) c.fillRect(sx - 24 + i * 8.6, sy, 1.4, 7);
    c.fillStyle = '#3a2a1c';
    c.fillRect(sx - 20, sy + 7, 40, 3);
  });

  // ---- the bag: Ahmad's, a cloth school bag, a few things showing
  if (bag > 0) schoolBag(R, BAG_X, t, bag);

  // ---- the people the story has put here, shadows thrown to the right, away from the door
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || Math.abs(w.x - RC) > RHW + 200) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, -1.3, 0.1);
  }
}

// Ahmad's bag: canvas, a flap thrown back, exercise books, a blue pen, and
// a small digital camera with a cracked screen looking out of the top.
function schoolBag(R, x, t, a) {
  R.cast((c) => {
    c.globalAlpha = clamp(a);
    // the bag itself: khaki cloth, slumped on its side, a strap along the floor
    c.fillStyle = '#9a8c62';
    c.beginPath();
    c.moveTo(x - 30, 0);
    c.quadraticCurveTo(x - 36, -22, x - 24, -36);
    c.lineTo(x + 22, -34);
    c.quadraticCurveTo(x + 34, -20, x + 30, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.moveTo(x + 12, -34);
    c.lineTo(x + 22, -34);
    c.quadraticCurveTo(x + 34, -20, x + 30, 0);
    c.lineTo(x + 18, 0);
    c.fill();
    c.fillStyle = 'rgba(255,240,200,0.1)';
    c.fillRect(x - 26, -30, 3, 24);
    // a pocket on the front with a brass buckle
    c.fillStyle = '#85774e';
    c.fillRect(x - 22, -18, 38, 14);
    c.fillStyle = '#b89a50';
    c.fillRect(x - 5, -15, 8, 7);
    // the flap, thrown back over the far side, a darker underside
    c.fillStyle = '#74683f';
    c.beginPath();
    c.moveTo(x - 24, -36);
    c.lineTo(x + 22, -34);
    c.lineTo(x + 28, -46);
    c.lineTo(x - 16, -50);
    c.fill();
    // the things in it: exercise books at an angle, red, green and a blue one
    const book = (bx, by, ang, w, h, col) => {
      c.save();
      c.translate(bx, by);
      c.rotate(ang);
      c.fillStyle = col;
      c.fillRect(0, -h, w, h);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillRect(2, -h + 3, w - 4, 8);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(w - 3, -h, 3, h);
      c.fillStyle = 'rgba(40,40,60,0.5)';
      for (let i = 0; i < 3; i++) c.fillRect(4, -h + 5 + i * 2.6, w - 10, 0.8);
      c.restore();
    };
    book(x - 20, -34, -0.14, 11, 30, '#b04a3c');
    book(x - 8, -34, -0.03, 11, 34, '#4a8a5a');
    book(x + 4, -34, 0.1, 11, 31, '#3a5a9a');
    // the blue pen, lying across the top of them, cap and clip
    c.save();
    c.translate(x - 22, -33);
    c.rotate(-0.42);
    c.fillStyle = '#2a5ad0';
    c.fillRect(0, -3, 34, 4);
    c.fillStyle = '#e8e4d8';
    c.fillRect(34, -3, 6, 4);
    c.fillStyle = '#1a2a60';
    c.fillRect(0, -3, 6, 4);
    c.restore();
    // the camera: a small silver one, its back to us, in the mouth of the bag
    c.save();
    c.translate(x + 12, -34);
    c.rotate(0.12);
    c.scale(0.8, 0.8);
    c.fillStyle = '#9a9ca2';
    c.fillRect(-4, -26, 30, 26);
    c.fillStyle = '#b8bac0';
    c.fillRect(-4, -26, 30, 3);
    c.fillStyle = '#5a5c62';
    c.fillRect(22, -20, 4, 16);
    // the screen: cracked glass, a faint blue-white light under it
    c.fillStyle = '#1a2230';
    c.fillRect(0, -22, 20, 15);
    c.restore();
  });
  R.glow((c) => {
    c.save();
    c.translate(x + 12, -34);
    c.rotate(0.12);
    c.scale(0.8, 0.8);
    c.globalAlpha = clamp(a);
    const pulse = 0.82 + 0.18 * Math.sin(t * 2.2);
    const g1 = c.createLinearGradient(0, -22, 20, -7);
    g1.addColorStop(0, `rgba(150,200,240,${0.5 * pulse})`);
    g1.addColorStop(1, `rgba(110,160,210,${0.25 * pulse})`);
    c.fillStyle = g1;
    c.fillRect(0, -22, 20, 15);
    // the crack: a spray of fine lines from a corner, bright against the glow
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(16, -22);
    c.lineTo(11, -17);
    c.lineTo(6, -15);
    c.lineTo(1, -9);
    c.moveTo(11, -17);
    c.lineTo(13, -9);
    c.moveTo(6, -15);
    c.lineTo(8, -22);
    c.stroke();
    c.restore();
    // the glow spills a little onto the floor and the books
    const g2 = c.createRadialGradient(x + 18, -36, 2, x + 18, -36, 40);
    g2.addColorStop(0, `rgba(160,205,245,${0.18 * clamp(a)})`);
    g2.addColorStop(1, 'rgba(120,170,220,0)');
    c.fillStyle = g2;
    c.fillRect(x - 24, -80, 84, 80);
  });
}
