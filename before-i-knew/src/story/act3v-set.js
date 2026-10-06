// Act 3, Parts 4 to 6: The Small Hours. The present-day night street, a little
// after one in the morning. The same silver town as the Night Walk, but later:
// the moon has dropped low into the west (left), so every shadow is long and
// lies away to the right; the dark is a touch less absolute; and the street
// is a different one, running past six places that each open a memory, to the
// tall building he climbs.
//
//   left to right:  Ahmad's classroom, a half-flight down -> the stone arch
//   between two buildings -> the cracked shop window -> the shuttered
//   family door with its wreath nail -> the mosque and its broken minaret ->
//   the gutted room with the half-burned portrait -> the six-storey tower.
//
// World units: ground at y = 0, up is negative.

import { lerp, rng } from '../engine/util.js';
import * as T from '../sets/town.js';
import { nightSky } from './act3r-set.js';
import { extrudePoly, extrudeRect } from '../sets/depth.js';
import { X4 } from './act3v-map.js';

export const surfaceAt = (x) => {
  if (x > X4.classroom - 110 && x < X4.classroom + 130) return 'tile';
  if (x > X4.arch - 90 && x < X4.arch + 90) return 'tile';
  if (x > X4.portrait - 220 && x < X4.portrait + 220) return 'rubble';
  if (x > 1090 && x < 1150) return 'rubble';
  if (x > X4.tower - 60 && x < X4.tower + 60) return 'tile';
  return 'grit';
};

// The moon: low, to the left (west). Its light comes from further off to the
// left and lower than on the Night Walk, so shadows are long and raking.
const MOON_UV = [0.1, 0.34];
const MOON_LIGHT_UV = [-0.62, -0.14];
const SHEAR = -1.3;
const SQUASH = 0.11;

// Landmark geometry shared with the story.
const SHOP = { x: X4.shop - 70, y: -134, w: 140, h: 98 };
export function shopWindowRect() {
  return { ...SHOP };
}
export const PORTRAIT = { x: X4.portrait - 28, y: -124, w: 56, h: 76 };

// ------------------------------------------------------------ the look --

export function streetLook(g) {
  const a = g.a || {};
  const dream = Math.max(0, Math.min(1, a.dream || 0));
  const lights = [
    // the moon, low and cold; the first light carries the ground shadows
    { uv: MOON_LIGHT_UV, color: [0.64, 0.74, 1.0], intensity: 0.8, radius: 0, project: 1.07, soft: 0.0025, rim: 1.0 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  // Damascus on the horizon, far right: a faint warm edge on what faces it
  lights.push({ uv: [1.35, 0.55], color: [1, 0.62, 0.34], intensity: 0.09, radius: 0, rim: 0.35 });
  // a vision beginning: the colour drains, then floods back too rich
  const sat = dream < 0.5 ? lerp(0.55, 0.2, dream / 0.5) : lerp(0.2, 1.4, (dream - 0.5) / 0.5);
  return {
    ambient: [0.14, 0.155, 0.225],
    lights: lights.slice(0, 4),
    groundShadow: 0.95,
    bloom: 0.8 + dream * 0.5,
    exposure: 1.0,
    grain: 0.06 + dream * 0.03,
    grade: { sat, contrast: 1.14, lift: 0.0, tint: [0.94, 0.985, 1.07], shadows: [0.8, 0.92, 1.16], highs: [1.05, 1.04, 1.0] },
    fog: { density: 0.13, height: 70, color: [0.3, 0.38, 0.54] },
    time: g.time,
    fade: Math.max(a.endFade || 0, dream * 0.14),
  };
}

// --------------------------------------------------------------- helpers --

const poly = (c, pts) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

// A solid slab: its thickness behind, then the face.
const slab = (c, x, y, w, h, d, face, top = '#9a9ca8', side = '#2e313b') => {
  extrudeRect(c, x, y, w, h, d, { top, side });
  c.fillStyle = face;
  c.fillRect(x, y, w, h);
};

// A hole `d` deep cut in a face: the reveal on the lower-left edges, then the
// dark of what lies beyond, set back. (Painted, so nothing is erased.)
const pit = (c, pts, d, reveal = '#232736', dark = '#04050a') => {
  c.save();
  poly(c, pts);
  c.clip();
  c.fillStyle = reveal;
  c.fillRect(-1e5, -1e5, 2e5, 2e5);
  c.translate(0.55 * d, -0.4 * d);
  poly(c, pts);
  c.fillStyle = dark;
  c.fill();
  c.restore();
};

// A pointed arch, springing at (cx ± hw, spring), apex `rise` above it.
const archPath = (c, cx, spring, hw, rise) => {
  c.moveTo(cx - hw, spring);
  c.bezierCurveTo(cx - hw, spring - rise * 0.62, cx - hw * 0.28, spring - rise * 0.88, cx, spring - rise);
  c.bezierCurveTo(cx + hw * 0.28, spring - rise * 0.88, cx + hw, spring - rise * 0.62, cx + hw, spring);
};

// ------------------------------------------------------------- the town --

const BLOCKS = [
  { x: -1500, w: 520, floors: 3, fh: 138, color: '#b7b4ae', seed: 601, mat: 'plaster', torn: 0.3, laundry: true, balcony: [2, 0.3, 0.03] },
  { x: -980, w: 500, floors: 3, fh: 136, color: '#adabaa', seed: 602, mat: 'concrete', holes: [[0.3, 0.4, 24]], dishes: [[0.7, 3]] },
  { x: -480, w: 470, floors: 4, fh: 134, color: '#bcb7ad', seed: 603, mat: 'limestone', balcony: [2, 0.5, 0], laundry: true },
  { x: -10, w: 490, floors: 3, fh: 140, color: '#b3b0a9', seed: 604, mat: 'plaster', torn: 0.35, tornLeft: false },
  // Ahmad's classroom building: the basement door is in the pavement in front
  { x: 480, w: 460, floors: 3, fh: 140, color: '#aeaca7', seed: 605, mat: 'concrete', noDoors: true, balcony: [2, 0.7, 0.05] },
  { x: 940, w: 240, floors: 3, fh: 136, color: '#bab5aa', seed: 606, mat: 'plaster', torn: 0.5, tornLeft: true, holes: [[0.5, 0.35, 26]] },
  // either side of the arch's wall
  { x: 1150, w: 230, floors: 4, fh: 134, color: '#b0ada8', seed: 607, mat: 'limestone', noDoors: true },
  { x: 1620, w: 300, floors: 3, fh: 138, color: '#bcb8ae', seed: 608, mat: 'plaster', noDoors: true, laundry: true, balcony: [2, 0.4, 0.04] },
  { x: 1920, w: 240, floors: 3, fh: 136, color: '#aeaca8', seed: 609, mat: 'concrete', torn: 0.4, tornLeft: false },
  // the shop
  { x: 2160, w: 300, floors: 3, fh: 138, color: '#b5b1a6', seed: 610, mat: 'plaster', noDoors: true, balcony: [2, 0.5, 0] },
  { x: 2460, w: 320, floors: 3, fh: 140, color: '#a9a8a6', seed: 611, mat: 'concrete', torn: 0.45, tornLeft: true, holes: [[0.4, 0.5, 22]] },
  // the family house with the shutter (five columns, the middle one the door)
  { x: 2725, w: 550, floors: 3, fh: 138, color: '#c0baae', seed: 612, mat: 'limestone', noDoors: true, balcony: [3, 0.6, 0.02], laundry: true },
  { x: 3275, w: 225, floors: 3, fh: 136, color: '#adaba6', seed: 613, mat: 'plaster', torn: 0.35, tornLeft: false },
  // (the mosque is drawn by hand, 3500 to 3960)
  { x: 3960, w: 220, floors: 3, fh: 138, color: '#b3afa5', seed: 614, mat: 'concrete', noDoors: true },
  // the gutted building
  { x: 4180, w: 460, floors: 3, fh: 138, color: '#a8a5a1', seed: 615, mat: 'concrete', noDoors: true, holes: [[0.25, 0.62, 30], [0.8, 0.5, 26]], torn: 0.3, tornLeft: true },
  { x: 4640, w: 185, floors: 3, fh: 136, color: '#b1aea8', seed: 616, mat: 'plaster', torn: 0.5, tornLeft: false },
  // the tower: six storeys, tall, little hurt
  { x: 4825, w: 550, floors: 6, fh: 134, color: '#bfbaaf', seed: 617, mat: 'limestone', noDoors: true, balcony: [3, 0.5, 0], laundry: true },
  { x: 5375, w: 520, floors: 4, fh: 136, color: '#aeaba6', seed: 618, mat: 'plaster', torn: 0.4, tornLeft: true },
  { x: 5895, w: 600, floors: 3, fh: 138, color: '#a9a8a4', seed: 619, mat: 'concrete' },
];
const blockOf = (seed) => BLOCKS.find((b) => b.seed === seed);

// A candle in a window: a dark window cut into the facade, one tiny flame.
function candle(R, spec, f, k, t, flick = 0) {
  const [wx, wy, ww, wh] = T.windowRect(spec, f, k);
  R.paint((c) => {
    c.fillStyle = '#0b0c10';
    c.fillRect(wx, wy, ww, wh);
    c.fillStyle = 'rgba(170,180,210,0.35)';
    c.fillRect(wx - 5, wy + wh - 1, ww + 10, 3);
  });
  const fl = 0.8 + 0.2 * Math.sin(t * 7.3 + flick) * Math.sin(t * 2.9 + flick * 2);
  const cx = wx + ww * 0.55;
  const cy = wy + wh - 9;
  R.glow((c) => {
    const grd = c.createRadialGradient(cx, cy, 0, cx, cy, 20);
    grd.addColorStop(0, `rgba(255,214,150,${0.55 * fl})`);
    grd.addColorStop(0.25, `rgba(255,170,90,${0.18 * fl})`);
    grd.addColorStop(1, 'rgba(255,150,70,0)');
    c.fillStyle = grd;
    c.fillRect(cx - 20, cy - 20, 40, 40);
    c.fillStyle = `rgba(255,236,190,${0.9 * fl})`;
    c.fillRect(cx - 0.8, cy - 2, 1.6, 3);
  });
}

// ------------------------------------------------------- 1. the classroom --

// Half a flight of steps down from the pavement to a basement door, a little
// ajar, black inside. Drawn as a section: the pit, the stair on its right, the
// door in the foot of the building at the bottom left.
function classroom(R, g) {
  const x0 = X4.classroom;
  const L = x0 - 74;
  const Rr = x0 + 96;
  const depth = 92;
  const floor = 76;
  R.paint((c) => {
    // the pit, cut into the ground and 26 deep: its far wall and lower edges
    pit(c, [[L, -4], [Rr, -4], [Rr, depth], [L, depth]], 26, '#1d2130', '#03040a');
    // the foot of the building, the back wall of the pit: stone courses
    c.fillStyle = '#12141d';
    c.fillRect(L + 14, -2, Rr - L - 14, floor + 2);
    c.fillStyle = 'rgba(80,88,112,0.22)';
    for (let y = 8; y < floor; y += 18) c.fillRect(L + 14, y, Rr - L - 14, 1.4);
    // the landing and the solid under the stair
    c.fillStyle = '#3a3e50';
    c.fillRect(L, floor, Rr - L, depth - floor + 4);
    c.fillStyle = '#6a7088';
    c.fillRect(L, floor, x0 + 14 - L, 3);
    // the stair: five treads, going down to the left
    const n = 5;
    const run = 16;
    const rise = floor / n;
    const st = [[Rr, -4], [Rr - run, -4]];
    for (let i = 0; i < n; i++) {
      const yy = (i + 1) * rise;
      st.push([Rr - run * (i + 1), yy], [Rr - run * (i + 2), yy]);
    }
    st.pop();
    st.push([Rr - run * (n + 1) + run, depth + 4], [Rr, depth + 4]);
    c.fillStyle = '#585d72';
    poly(c, st);
    c.fill();
    for (let i = 0; i < n; i++) {
      const x = Rr - run * (i + 1);
      const y = i * rise;
      c.fillStyle = `rgb(${118 - i * 7},${124 - i * 7},${150 - i * 8})`;
      c.fillRect(x, y, run, 3); // the lit tread
      c.fillStyle = 'rgba(0,0,0,0.38)';
      c.fillRect(x, y + 3, 2.4, rise - 3); // the riser in shade
    }
    // the door: a stone frame 14 deep, the leaf a little open, black beyond
    const dx = L + 12;
    const dw = 62;
    const dh = 106;
    extrudeRect(c, dx - 6, floor - dh - 7, dw + 12, dh + 7, 14, { top: '#8f93a4', side: '#262935' });
    c.fillStyle = '#7a7e8e';
    c.fillRect(dx - 6, floor - dh - 7, dw + 12, dh + 7);
    c.fillStyle = '#020307';
    c.fillRect(dx, floor - dh, dw, dh);
    // the leaf, hinged on the left, swung in a hand's breadth: a wedge of black beside it
    c.fillStyle = '#3e4a64';
    poly(c, [[dx, floor - dh], [dx + 40, floor - dh + 5], [dx + 40, floor - 4], [dx, floor]]);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(dx + 5, floor - dh + 12, 28, 34);
    c.fillRect(dx + 5, floor - dh + 52, 28, 34);
    c.fillStyle = '#9aa0b4';
    c.fillRect(dx + 34, floor - 52, 3, 8); // the handle
    // dust and grit on the landing, a drift of leaves against the door
    c.fillStyle = 'rgba(20,22,30,0.7)';
    c.beginPath();
    c.ellipse(x0 - 20, floor - 1, 30, 3, 0, 0, Math.PI * 2);
    c.fill();
    // the kerb stones round the pit, 16 deep
    extrudeRect(c, L - 8, -6, 8, 12, 16, { color: '#6d7080' });
    extrudeRect(c, Rr, -6, 10, 12, 16, { color: '#6d7080' });
    c.fillStyle = '#6d7080';
    c.fillRect(L - 8, -6, 8, 12);
    c.fillRect(Rr, -6, 10, 12);
  });
  // the iron handrail along the stair, and its posts
  R.cast((c) => {
    c.strokeStyle = '#2a2d3a';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(Rr - 2, -52);
    c.lineTo(Rr - run0(), 38);
    c.stroke();
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const px = Rr - 2 - (i * (run0() - 2)) / 3;
      const py = -52 + (i * 90) / 3;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px, py + 48);
      c.stroke();
    }
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(170,190,245,0.34)';
    c.fillRect(L - 8, -6, 8, 1.4);
    c.fillRect(Rr, -6, 10, 1.4);
    // the moon on the lit treads, and a pale thread on the door's lintel
    c.fillStyle = 'rgba(176,196,250,0.16)';
    for (let i = 0; i < 5; i++) c.fillRect(Rr - 16 * (i + 1), (i * floor) / 5, 16, 1.6);
    c.fillStyle = 'rgba(176,196,250,0.22)';
    c.fillRect(L + 6, floor - 105, 74, 1.4);
  });
  // faded chalk squares on the road: a child's hopscotch
  R.paint((c) => {
    c.strokeStyle = 'rgba(210,210,200,0.22)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) c.strokeRect(x0 + 170 + i * 22, 28, 20, 9);
  });
}
const run0 = () => 80;

// ------------------------------------------------------------- 2. the arch --

const ARCH_W = 240;
function archWall(R, g) {
  const cx = X4.arch;
  const x0 = cx - ARCH_W / 2;
  const x1 = cx + ARCH_W / 2;
  const top = -236;
  const hw = 56;
  const spring = -118;
  const rise = 74;
  const outline = [[x0, 0], [x0, top + 14], [x0 + 24, top + 14], [x0 + 24, top], [x0 + 60, top], [x0 + 60, top + 14], [x0 + 100, top + 14], [x0 + 100, top + 4], [x0 + 128, top + 12], [x1 - 70, top + 20], [x1 - 70, top], [x1 - 30, top], [x1 - 30, top + 14], [x1, top + 14], [x1, 0]];
  // the wall is 28 deep between the two buildings: its coping and far side
  R.cast((c) => {
    extrudePoly(c, outline, 28, { top: '#c8c6bc', side: '#2a2c36' });
    const face = new Path2D();
    face.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) face.lineTo(x, y);
    face.closePath();
    // the arch opening, cut out of the face (even-odd)
    const hole = new Path2D();
    hole.moveTo(cx - hw, 0);
    hole.lineTo(cx - hw, spring);
    hole.bezierCurveTo(cx - hw, spring - rise * 0.62, cx - hw * 0.28, spring - rise * 0.88, cx, spring - rise);
    hole.bezierCurveTo(cx + hw * 0.28, spring - rise * 0.88, cx + hw, spring - rise * 0.62, cx + hw, spring);
    hole.lineTo(cx + hw, 0);
    hole.closePath();
    const both = new Path2D();
    both.addPath(face);
    both.addPath(hole);
    c.save();
    c.clip(both, 'evenodd');
    // ablaq: courses of pale limestone and black basalt
    for (let y = 0, i = 0; y > top - 30; y -= 20, i++) {
      c.fillStyle = i % 2 ? '#3a3b42' : '#aaa69a';
      c.fillRect(x0, y - 20, ARCH_W, 20);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(x0, y - 1.2, ARCH_W, 1.2);
      // the joints, staggered
      const r = rng(900 + i);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      for (let x = x0 + r() * 40; x < x1; x += 36 + r() * 26) c.fillRect(x, y - 20, 1.2, 20);
    }
    // soot and damp
    const sg = c.createLinearGradient(0, top, 0, 0);
    sg.addColorStop(0, 'rgba(8,8,14,0.0)');
    sg.addColorStop(1, 'rgba(8,8,14,0.34)');
    c.fillStyle = sg;
    c.fillRect(x0, top - 20, ARCH_W, -top + 20);
    c.restore();
    c.strokeStyle = '#d3d0c4';
    c.lineWidth = 7;
    c.beginPath();
    archPath(c, cx, spring, hw + 7, rise + 9);
    c.stroke();
    c.strokeStyle = '#2a2b32';
    c.lineWidth = 3;
    c.setLineDash([14, 14]);
    c.beginPath();
    archPath(c, cx, spring, hw + 7, rise + 9);
    c.stroke();
    c.setLineDash([]);
    // a long crack from the crown, and a missing course-end at the right
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(cx + 6, spring - rise - 14);
    c.lineTo(cx + 12, spring - rise - 34);
    c.lineTo(cx + 5, spring - rise - 58);
    c.lineTo(cx + 14, spring - rise - 80);
    c.stroke();
  });
  R.surface((c) => {
    c.rect(x0, top, ARCH_W, -top);
  }, 'limestone', { scale: 0.8, seed: 7, alpha: 0.5 });
  // through the arch: only dark, and a hint of open ground, and one olive
  R.paint((c) => {
    c.save();
    c.beginPath();
    archPath(c, cx, spring, hw, rise);
    c.lineTo(cx + hw, 4);
    c.lineTo(cx - hw, 4);
    c.closePath();
    c.clip();
    // the passage is 28 deep: the near reveal is the wall's thickness, seen
    // down the left jamb and along the floor
    c.fillStyle = '#05060b';
    c.fillRect(cx - hw, spring - rise, hw * 2, rise - spring + 4);
    const jam = c.createLinearGradient(cx - hw, 0, cx - hw + 26, 0);
    jam.addColorStop(0, '#2a2e3e');
    jam.addColorStop(1, '#05060b');
    c.fillStyle = jam;
    c.fillRect(cx - hw, spring - rise, 26, rise - spring + 4);
    // beyond: a far pale patch of ground, and a dark tree against faint sky
    const far = c.createLinearGradient(0, spring - rise, 0, 0);
    far.addColorStop(0, '#06070d');
    far.addColorStop(0.55, '#0a0d18');
    far.addColorStop(0.82, '#171d30');
    far.addColorStop(1, '#2a3350');
    c.fillStyle = far;
    c.fillRect(cx - hw + 20, spring - rise, hw * 2 - 20, rise - spring + 4);
    c.fillStyle = '#05060a';
    c.beginPath();
    c.ellipse(cx + 18, -52, 18, 14, 0, 0, Math.PI * 2);
    c.ellipse(cx + 32, -44, 12, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(cx + 16, -44, 3, 44);
    c.restore();
  });
  R.glow((c) => {
    // the moon on the paving through the arch, and along the coping and ring
    c.fillStyle = 'rgba(160,180,240,0.1)';
    c.fillRect(cx - hw + 24, -10, hw * 2 - 24, 12);
    c.strokeStyle = 'rgba(200,214,250,0.32)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0, top + 14);
    c.lineTo(x0 + 24, top + 14);
    c.lineTo(x0 + 24, top);
    c.lineTo(x0 + 60, top);
    c.stroke();
    c.strokeStyle = 'rgba(200,214,250,0.2)';
    c.beginPath();
    archPath(c, cx, spring, hw + 10, rise + 12);
    c.stroke();
  });
}

// ------------------------------------------------------------- 3. the shop --

function shopFront(R, g) {
  const t = g.time;
  const x0 = 2176;
  const x1 = 2444;
  const S = SHOP;
  R.cast((c) => {
    // the shopfront is a slab 12 proud of the wall; the window is cut into it
    slab(c, x0, -168, x1 - x0, 168, 12, '#77746c');
    // fascia board, its sign long since sun-faded
    slab(c, x0 + 4, -166, x1 - x0 - 8, 26, 8, '#34424c', '#6f7c88', '#20262c');
    // stall riser under the window
    slab(c, x0, -36, x1 - x0, 36, 10, '#68665f');
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = -30; y < 0; y += 12) c.fillRect(x0, y, x1 - x0, 1.4);
    // pilaster
    slab(c, x0, -140, 54, 104, 10, '#85827a');
    // the window frame, 14 deep, in steel
    extrudeRect(c, S.x - 6, S.y - 6, S.w + 12, S.h + 12, 14, { top: '#8b92a2', side: '#22252f' });
    c.fillStyle = '#4c515f';
    c.fillRect(S.x - 6, S.y - 6, S.w + 12, S.h + 12);
    // the door: shut, its steel plate dented, the padlock on
    slab(c, 2384, -134, 54, 134, 8, '#3a3d48', '#6a6e7c', '#1c1e26');
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(2388, -128, 46, 3);
    c.fillStyle = '#9a9fb0';
    c.fillRect(2392, -70, 6, 10);
    c.fillStyle = '#12131a';
    c.fillRect(2393, -62, 4, 6);
  });
  R.paint((c) => {
    // the sign, a shadow of lettering
    c.fillStyle = 'rgba(180,170,140,0.22)';
    c.font = '20px "Aref Ruqaa", "Noto Naskh Arabic", serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('دكّان', (x0 + x1) / 2 - 30, -146);
    // the window, set back: the reveal, then the empty dark room
    pit(c, [[S.x, S.y], [S.x + S.w, S.y], [S.x + S.w, S.y + S.h], [S.x, S.y + S.h]], 16, '#2a2e3c', '#0a0c13');
    // empty shelves, one fallen, a shoebox
    c.fillStyle = 'rgba(70,76,96,0.7)';
    c.fillRect(S.x + 10, S.y + 30, S.w - 20, 3);
    c.fillRect(S.x + 10, S.y + 62, S.w - 20, 3);
    c.save();
    c.translate(S.x + 70, S.y + 70);
    c.rotate(0.18);
    c.fillRect(0, 0, 44, 3);
    c.restore();
    c.fillStyle = 'rgba(60,66,84,0.9)';
    c.fillRect(S.x + 22, S.y + S.h - 12, 18, 12);
    // the sill and a skin of dust
    c.fillStyle = '#5a5e6a';
    c.fillRect(S.x - 8, S.y + S.h + 4, S.w + 16, 5);
  });
  // the glass: faintly reflective, cracked, a corner gone
  const gl = [[S.x, S.y], [S.x + S.w - 40, S.y], [S.x + S.w - 24, S.y + 14], [S.x + S.w - 34, S.y + 24], [S.x + S.w - 10, S.y + 34], [S.x + S.w, S.y + 30], [S.x + S.w, S.y + S.h], [S.x, S.y + S.h]];
  R.glow((c) => {
    c.save();
    poly(c, gl);
    c.clip();
    // the sheen: a slow diagonal of the street's pale light
    const sh = Math.sin(t * 0.25) * 3;
    const gr = c.createLinearGradient(S.x, S.y, S.x + S.w * 0.8, S.y + S.h);
    gr.addColorStop(0, 'rgba(170,190,240,0.17)');
    gr.addColorStop(0.5, 'rgba(150,170,225,0.05)');
    gr.addColorStop(1, 'rgba(140,160,215,0.12)');
    c.fillStyle = gr;
    c.fillRect(S.x, S.y, S.w, S.h);
    c.fillStyle = 'rgba(200,214,255,0.1)';
    poly(c, [[S.x + 22 + sh, S.y], [S.x + 44 + sh, S.y], [S.x + 4 + sh, S.y + S.h], [S.x - 18 + sh, S.y + S.h]]);
    c.fill();
    // the cracks: a star from an impact, and two long runs
    const r = rng(77);
    const ix = S.x + S.w * 0.4;
    const iy = S.y + S.h * 0.46;
    c.strokeStyle = 'rgba(214,226,255,0.55)';
    c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4;
      const len = 40 + r() * 80;
      let px = ix;
      let py = iy;
      c.beginPath();
      c.moveTo(px, py);
      for (let k = 1; k <= 5; k++) {
        px += Math.cos(a + (r() - 0.5) * 0.4) * (len / 5);
        py += Math.sin(a + (r() - 0.5) * 0.4) * (len / 5);
        c.lineTo(px, py);
      }
      c.stroke();
    }
    // the rings round the impact
    c.strokeStyle = 'rgba(214,226,255,0.28)';
    for (const rr of [9, 20]) {
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const q = rr * (0.8 + r() * 0.4);
        const px = ix + Math.cos(a) * q;
        const py = iy + Math.sin(a) * q * 0.8;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
    // a long diagonal run from the missing corner to the lower left
    c.strokeStyle = 'rgba(214,226,255,0.6)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(S.x + S.w - 34, S.y + 24);
    c.lineTo(S.x + S.w * 0.7, S.y + S.h * 0.4);
    c.lineTo(S.x + S.w * 0.48, S.y + S.h * 0.58);
    c.lineTo(S.x + S.w * 0.2, S.y + S.h * 0.8);
    c.lineTo(S.x + 6, S.y + S.h - 2);
    c.stroke();
    c.restore();
    // the missing corner's broken edge: bright shards
    c.strokeStyle = 'rgba(230,238,255,0.7)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(S.x + S.w - 40, S.y);
    c.lineTo(S.x + S.w - 24, S.y + 14);
    c.lineTo(S.x + S.w - 34, S.y + 24);
    c.lineTo(S.x + S.w - 10, S.y + 34);
    c.lineTo(S.x + S.w, S.y + 30);
    c.stroke();
    // splinters on the sill
    c.fillStyle = 'rgba(210,224,255,0.4)';
    for (let i = 0; i < 6; i++) c.fillRect(S.x + S.w - 60 + i * 9, S.y + S.h + 2, 3, 1.4);
  });
}

// ---------------------------------------------------------- 4. the shutter --

function shutterDoor(R, g) {
  const x0 = X4.shutter;
  const w = 106;
  const top = -156;
  R.cast((c) => {
    // the stone surround, 16 deep, and its two worn steps
    slab(c, x0 - w / 2 - 14, top - 16, w + 28, -top + 16, 16, '#aaa59a', '#c6c2b6', '#2a2c36');
    slab(c, x0 - w / 2 - 22, -7, w + 44, 7, 22, '#8e8b84', '#b4b0a4', '#26282f');
    slab(c, x0 - w / 2 - 12, -14, w + 24, 7, 14, '#97948c', '#bcb8ac', '#26282f');
    // the shutter well, dark, set into the surround
    pit(c, [[x0 - w / 2, top], [x0 + w / 2, top], [x0 + w / 2, -6], [x0 - w / 2, -6]], 14, '#2a2d3a', '#05060a');
  });
  R.cast((c) => {
    // the rolled steel shutter: corrugated, down to the step
    const sx = x0 - w / 2 + 3;
    const sw = w - 6;
    c.fillStyle = '#6e7381';
    c.fillRect(sx, top + 14, sw, -top - 20);
    for (let y = top + 18; y < -8; y += 5.5) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(sx, y, sw, 1.8);
      c.fillStyle = 'rgba(190,200,230,0.14)';
      c.fillRect(sx, y + 2, sw, 1);
    }
    // dents and rust: a long streak from the box, one kicked-in dent
    c.fillStyle = 'rgba(110,62,34,0.35)';
    c.fillRect(x0 - 28, top + 18, 5, 90);
    c.fillRect(x0 + 18, top + 20, 3, 60);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.ellipse(x0 + 12, -60, 20, 11, -0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(210,220,250,0.1)';
    c.beginPath();
    c.ellipse(x0 + 9, -64, 14, 5, -0.4, 0, Math.PI * 2);
    c.fill();
    // the bottom bar and its lock
    c.fillStyle = '#41454f';
    c.fillRect(sx, -13, sw, 7);
    c.fillStyle = '#a9aebf';
    c.fillRect(x0 - 2, -12, 4, 5);
    // the roller box across the top, 12 deep
    extrudeRect(c, x0 - w / 2 - 6, top - 2, w + 12, 20, 12, { top: '#9094a2', side: '#23262f' });
    c.fillStyle = '#585c6a';
    c.fillRect(x0 - w / 2 - 6, top - 2, w + 12, 20);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x0 - w / 2 - 6, top + 12, w + 12, 4);
    // the guide rails either side
    c.fillStyle = '#3e424e';
    c.fillRect(x0 - w / 2, top + 16, 5, -top - 22);
    c.fillRect(x0 + w / 2 - 5, top + 16, 5, -top - 22);
  });
  // where the Eid wreath hung: a nail, a ghost ring on the plaster, one dry leaf
  const nx = x0;
  const ny = -214;
  R.paint((c) => {
    c.strokeStyle = 'rgba(224,216,196,0.24)';
    c.lineWidth = 7;
    c.beginPath();
    c.ellipse(nx, ny + 24, 21, 24, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(30,26,22,0.18)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(nx + 2, ny + 26, 25, 27, 0, 0, Math.PI * 2);
    c.stroke();
  });
  R.cast((c) => {
    c.fillStyle = '#26262c';
    c.fillRect(nx - 1.2, ny - 1, 2.4, 9); // the nail, from the side, a little bent
    c.fillRect(nx - 3, ny - 3, 6, 3);
    // a thread of red ribbon still tied to it, stirring
    c.strokeStyle = '#7a3a3e';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(nx, ny + 6);
    c.quadraticCurveTo(nx + 3 + Math.sin(g.time * 1.3) * 1.5, ny + 22, nx + 1, ny + 40);
    c.stroke();
    // a single dry leaf caught on the surround's ledge
    c.fillStyle = '#4a4538';
    c.beginPath();
    c.ellipse(nx + 38, top - 17, 6, 2.6, 0.5, 0, Math.PI * 2);
    c.fill();
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(220,230,255,0.5)';
    c.fillRect(nx - 3, ny - 3, 6, 1.2); // the nail's head catches the moon
    c.fillStyle = 'rgba(200,214,250,0.3)';
    c.fillRect(x0 - w / 2 - 14, top - 16, w + 28, 1.4);
    c.fillRect(x0 - w / 2 - 22, -7, w + 44, 1.2);
  });
}

// ----------------------------------------------------------- 5. the mosque --

const MOS = { x0: 3500, x1: 3960, top: -244 };

// The minaret and the dome, on a layer a little further off than the street:
// drawn before the buildings so the mosque's wall stands in front of them.
function minaretFar(R, g) {
  const d = 0.93;
  const anchor = X4.minaret;
  const dx = (d - 1) * anchor;
  const cx = X4.minaret + dx;
  R.layer(d);
  const body = '#8b8d96';
  // the outline, base to broken crown: wide shaft, a balcony, a narrower stage, a jagged top
  const sh = [[cx - 34, 70], [cx - 34, -330], [cx - 24, -334], [cx - 24, -432], [cx - 20, -476], [cx - 12, -462], [cx - 8, -500], [cx + 2, -486], [cx + 8, -520], [cx + 14, -470], [cx + 24, -452], [cx + 24, -334], [cx + 34, -330], [cx + 34, 70]];
  const bal = [[cx - 54, -330], [cx + 54, -330], [cx + 54, -346], [cx - 54, -346]];
  R.cast((c) => {
    extrudePoly(c, sh, 18, { top: '#cfd2de', side: '#2a2d3a' });
    extrudePoly(c, bal, 22, { top: '#cfd2de', side: '#2a2d3a' });
    c.fillStyle = body;
    poly(c, sh);
    c.fill();
    // ablaq bands, pale and slate, up the shaft
    c.save();
    poly(c, sh);
    c.clip();
    for (let y = 60, i = 0; y > -520; y -= 24, i++) {
      c.fillStyle = i % 2 ? 'rgba(20,22,34,0.34)' : 'rgba(210,214,230,0.1)';
      c.fillRect(cx - 40, y - 24, 80, 24);
    }
    // the shaft's left in moonlight, its right in shade
    const lg = c.createLinearGradient(cx - 34, 0, cx + 34, 0);
    lg.addColorStop(0, 'rgba(210,222,255,0.2)');
    lg.addColorStop(0.35, 'rgba(210,222,255,0)');
    lg.addColorStop(1, 'rgba(6,8,16,0.4)');
    c.fillStyle = lg;
    c.fillRect(cx - 40, -540, 80, 620);
    // arched slits, the muezzin's stair
    c.fillStyle = '#0a0b12';
    for (const y of [-120, -190, -260, -390]) {
      c.beginPath();
      c.moveTo(cx - 4, y + 22);
      c.lineTo(cx - 4, y + 6);
      c.quadraticCurveTo(cx, y - 4, cx + 4, y + 6);
      c.lineTo(cx + 4, y + 22);
      c.fill();
    }
    c.restore();
    c.fillStyle = body;
    poly(c, bal);
    c.fill();
    // the balcony: a rail of small balusters and a corbelled underside
    c.fillStyle = '#15171f';
    for (let x = cx - 50; x < cx + 52; x += 8) c.fillRect(x, -346, 2, 16);
    c.fillStyle = '#797b86';
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(cx - 54 + i * 13.5, -330);
      c.lineTo(cx - 40.5 + i * 13.5, -330);
      c.lineTo(cx - 47 + i * 13.5, -320);
      c.fill();
    }
    // the broken crown: the inside of the shaft showing, a hollow
    c.fillStyle = '#12141c';
    poly(c, [[cx - 10, -432], [cx + 12, -430], [cx + 8, -470], [cx + 2, -486], [cx - 6, -470]]);
    c.fill();
    // twisted rebar standing out of the break
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(cx - 4, -472);
    c.quadraticCurveTo(cx - 12, -496, cx - 5, -512);
    c.moveTo(cx + 9, -490);
    c.quadraticCurveTo(cx + 20, -510, cx + 12, -532);
    c.stroke();
    // the great crack: from under the balcony, down the shaft, wandering
    c.strokeStyle = '#0b0c12';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + 2, -318);
    c.lineTo(cx - 6, -270);
    c.lineTo(cx + 5, -226);
    c.lineTo(cx - 3, -170);
    c.lineTo(cx + 8, -118);
    c.lineTo(cx + 1, -70);
    c.stroke();
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(cx - 6, -270);
    c.lineTo(cx - 24, -250);
    c.moveTo(cx - 3, -170);
    c.lineTo(cx + 16, -150);
    c.stroke();
    // the dome beside it, grey in the moon, a finial bent
    const dcx = X4.minaret + 150 + dx;
    c.fillStyle = '#7c7f8a';
    c.beginPath();
    c.arc(dcx, -230, 92, Math.PI, 0);
    c.lineTo(dcx + 92, -200);
    c.lineTo(dcx - 92, -200);
    c.fill();
    c.fillStyle = '#6d707b';
    c.fillRect(dcx - 70, -240, 140, 54);
    c.fillStyle = '#4a4c56';
    c.fillRect(dcx - 3, -332, 6, 14);
    c.fillRect(dcx + 3, -340, 10, 3);
  });
  R.surface((c) => poly(c, sh), 'limestone', { scale: 1, seed: 9, alpha: 0.5 });
  R.glow((c) => {
    // the moon silvers the west face of the shaft, the balcony and the broken crown
    c.strokeStyle = 'rgba(205,220,255,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 34, 60);
    c.lineTo(cx - 34, -330);
    c.moveTo(cx - 24, -334);
    c.lineTo(cx - 24, -432);
    c.lineTo(cx - 20, -476);
    c.lineTo(cx - 12, -462);
    c.lineTo(cx - 8, -500);
    c.lineTo(cx + 2, -486);
    c.lineTo(cx + 8, -520);
    c.stroke();
    c.strokeStyle = 'rgba(205,220,255,0.4)';
    c.beginPath();
    c.moveTo(cx - 54, -346);
    c.lineTo(cx + 54, -346);
    c.stroke();
    const dcx = X4.minaret + 150 + dx;
    const dg = c.createRadialGradient(dcx - 40, -280, 4, dcx - 40, -280, 100);
    dg.addColorStop(0, 'rgba(190,206,250,0.26)');
    dg.addColorStop(1, 'rgba(190,206,250,0)');
    c.fillStyle = dg;
    c.beginPath();
    c.arc(dcx, -230, 92, Math.PI, 0);
    c.fill();
    // dust hanging round the broken top
    const t = g.time;
    c.fillStyle = 'rgba(190,204,240,0.1)';
    for (let i = 0; i < 6; i++) c.fillRect(cx - 20 + ((i * 17 + t * 4) % 50), -540 - ((i * 13) % 20), 1.6, 1.6);
  });
  R.layer(1);
}

// The mosque's street wall: ablaq courses, a pointed door, narrow windows,
// stepped merlons. The door is shut; one leaf stands a hand's breadth open.
function mosqueWall(R, g) {
  const { x0, x1, top } = MOS;
  const dx = 3790;
  const merl = [];
  merl.push([x0, 0], [x0, top + 24]);
  for (let x = x0; x < x1; x += 30) {
    const broken = x > 3880 && x < 3920;
    merl.push([x, top + 24], [x, top + (broken ? 18 : 2)], [x + 14, top + (broken ? 18 : 2)], [x + 14, top + 24]);
  }
  merl.push([x1, top + 24], [x1, 0]);
  const dHW = 40;
  const dSpring = -118;
  const dRise = 66;
  R.cast((c) => {
    extrudePoly(c, merl, 26, { top: '#c8c6bc', side: '#2a2c36' });
    const face = new Path2D();
    face.moveTo(merl[0][0], merl[0][1]);
    for (const [x, y] of merl.slice(1)) face.lineTo(x, y);
    face.closePath();
    c.save();
    c.clip(face);
    for (let y = 0, i = 0; y > top - 10; y -= 26, i++) {
      c.fillStyle = i % 2 ? '#3d3e45' : '#b0ab9d';
      c.fillRect(x0, y - 26, x1 - x0, 26);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(x0, y - 1.2, x1 - x0, 1.2);
      const r = rng(950 + i);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      for (let x = x0 + r() * 40; x < x1; x += 44 + r() * 30) c.fillRect(x, y - 26, 1.2, 26);
    }
    const sg = c.createLinearGradient(0, top, 0, 0);
    sg.addColorStop(0, 'rgba(8,8,14,0)');
    sg.addColorStop(1, 'rgba(8,8,14,0.3)');
    c.fillStyle = sg;
    c.fillRect(x0, top, x1 - x0, -top);
    // shell-pocks across the upper wall
    const r = rng(33);
    c.fillStyle = 'rgba(10,10,16,0.5)';
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      c.arc(x0 + r() * (x1 - x0), top + 30 + r() * 120, 1.5 + r() * 3.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // narrow windows with pointed heads: black, barred, their sills proud
    for (const wx of [3545, 3615, 3860, 3925]) {
      extrudePath2(c, wx);
    }
    // the door: a pointed surround of voussoirs, 18 deep
    extrudePoly(c, [[dx - dHW - 12, 0], [dx - dHW - 12, dSpring - dRise * 0.3], [dx, dSpring - dRise - 14], [dx + dHW + 12, dSpring - dRise * 0.3], [dx + dHW + 12, 0]], 18, { top: '#d3d0c4', side: '#2a2c36' });
    c.fillStyle = '#c9c5b8';
    c.beginPath();
    archPath(c, dx, dSpring, dHW + 12, dRise + 14);
    c.lineTo(dx + dHW + 12, 0);
    c.lineTo(dx - dHW - 12, 0);
    c.fill();
    c.fillStyle = '#04050a';
    c.beginPath();
    archPath(c, dx, dSpring, dHW, dRise);
    c.lineTo(dx + dHW, 0);
    c.lineTo(dx - dHW, 0);
    c.fill();
    // the doors: left leaf shut, the right a hand's breadth open
    c.fillStyle = '#4a3a30';
    c.beginPath();
    c.moveTo(dx - dHW, 0);
    c.lineTo(dx - dHW, dSpring);
    c.bezierCurveTo(dx - dHW, dSpring - dRise * 0.62, dx - dHW * 0.28, dSpring - dRise * 0.88, dx - 4, dSpring - dRise + 2);
    c.lineTo(dx - 4, 0);
    c.fill();
    c.fillStyle = '#3a2d26';
    c.beginPath();
    c.moveTo(dx + 6, 0);
    c.lineTo(dx + 6, dSpring - dRise + 1);
    c.bezierCurveTo(dx + dHW * 0.28, dSpring - dRise * 0.88, dx + dHW, dSpring - dRise * 0.62, dx + dHW, dSpring);
    c.lineTo(dx + dHW, 0);
    c.fill();
    // studs and boards
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let x = dx - dHW + 10; x < dx + dHW; x += 12) if (Math.abs(x - dx) > 6) c.fillRect(x, dSpring - 40, 1.4, 118);
    c.fillStyle = '#7e6a3c';
    for (let y = -30; y > -100; y -= 18) {
      c.fillRect(dx - 24, y, 3, 3);
      c.fillRect(dx + 20, y, 3, 3);
    }
    // the stone step
    extrudeRect(c, dx - dHW - 20, -7, 2 * dHW + 40, 7, 16, { top: '#bab6aa', side: '#26282f' });
    c.fillStyle = '#8f8c84';
    c.fillRect(dx - dHW - 20, -7, 2 * dHW + 40, 7);
  });
  R.surface((c) => c.rect(x0, top, x1 - x0, -top), 'limestone', { scale: 0.9, seed: 5, alpha: 0.45 });
  R.glow((c) => {
    c.strokeStyle = 'rgba(205,218,252,0.34)';
    c.lineWidth = 1.4;
    c.beginPath();
    for (let x = x0; x < x1; x += 30) {
      const broken = x > 3880 && x < 3920;
      c.moveTo(x, top + (broken ? 18 : 2));
      c.lineTo(x + 14, top + (broken ? 18 : 2));
    }
    c.stroke();
    c.strokeStyle = 'rgba(205,218,252,0.22)';
    c.beginPath();
    archPath(c, dx, dSpring, dHW + 13, dRise + 15);
    c.stroke();
  });
}

// A narrow pointed window in the mosque wall (cast layer context).
function extrudePath2(c, wx) {
  const y0 = -90;
  const y1 = -176;
  extrudePoly(c, [[wx - 10, y0], [wx - 10, y1 + 10], [wx, y1 - 6], [wx + 10, y1 + 10], [wx + 10, y0]], 12, { top: '#8a8c98', side: '#1e2029' });
  c.fillStyle = '#0a0b11';
  c.beginPath();
  c.moveTo(wx - 8, y0);
  c.lineTo(wx - 8, y1 + 10);
  c.quadraticCurveTo(wx, y1 - 8, wx + 8, y1 + 10);
  c.lineTo(wx + 8, y0);
  c.fill();
  c.strokeStyle = '#2d303c';
  c.lineWidth = 1.4;
  c.beginPath();
  for (let y = y0 - 8; y > y1 + 14; y -= 12) {
    c.moveTo(wx - 8, y);
    c.lineTo(wx + 8, y);
  }
  c.moveTo(wx, y0);
  c.lineTo(wx, y1 + 8);
  c.stroke();
  c.fillStyle = '#9a9ca8';
  c.fillRect(wx - 13, y0, 26, 5);
}

// ---------------------------------------------------------- 6. the portrait --

// A ground-floor room with its front wall blown out, in section.
function portraitRoom(R, g) {
  const t = g.time;
  const x0 = 4215;
  const x1 = 4605;
  const top = -138;
  const w = x1 - x0;
  const bw = '#5a606e';
  R.paint((c) => {
    // the back wall, then the dado, soot over the door's line, long water stains
    c.fillStyle = bw;
    c.fillRect(x0, top, w, -top);
    c.fillStyle = 'rgba(8,10,18,0.3)';
    c.fillRect(x0, -50, w, 50);
    c.fillStyle = 'rgba(8,10,18,0.4)';
    c.fillRect(x0, -53, w, 3); // the dado rail
    const sg = c.createRadialGradient(x0 + 120, top, 6, x0 + 120, top, 170);
    sg.addColorStop(0, 'rgba(6,6,10,0.65)');
    sg.addColorStop(1, 'rgba(6,6,10,0)');
    c.fillStyle = sg;
    c.fillRect(x0, top, w, -top);
    const r = rng(54);
    for (let i = 0; i < 24; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '20,24,34' : '110,116,130'},0.13)`;
      c.fillRect(x0 + r() * w, top + r() * 100, 8 + r() * 30, 30 + r() * 60);
    }
    // a door in the back wall, blown off its hinges: a black frame
    c.fillStyle = '#0a0b10';
    c.fillRect(x0 + 34, -112, 54, 112);
    c.fillStyle = '#383c48';
    c.fillRect(x0 + 28, -118, 66, 6);
    c.fillRect(x0 + 28, -118, 6, 118);
    // the room is in the dark of the slab above it: a settling gradient
    const dk = c.createLinearGradient(0, top, 0, 0);
    dk.addColorStop(0, 'rgba(3,4,10,0.32)');
    dk.addColorStop(1, 'rgba(3,4,10,0.08)');
    c.fillStyle = dk;
    c.fillRect(x0, top, w, -top);
    // plaster fallen from the wall, bullet pocks scattered
    c.fillStyle = 'rgba(8,8,14,0.55)';
    for (let i = 0; i < 18; i++) {
      c.beginPath();
      c.arc(x0 + 160 + r() * 200, top + 14 + r() * 90, 1.3 + r() * 2.2, 0, Math.PI * 2);
      c.fill();
    }
  });
  R.surface((c) => c.rect(x0, top, w, -top), 'plaster', { scale: 1.3, seed: 12, alpha: 0.6 });

  // the floor above, cut: a slab 18 thick, sagging at the broken right end
  R.cast((c) => {
    const sp = [[x0 - 14, top - 8], [x1 - 150, top - 8], [x1 - 70, top + 6], [x1 + 8, top + 26], [x1 - 10, top + 34], [x1 - 62, top + 26], [x1 - 160, top + 12], [x0 - 14, top + 12]];
    extrudePoly(c, sp, 18, { top: '#9094a2', side: '#2e313b' });
    c.fillStyle = '#6a6e7a';
    poly(c, sp);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x0 - 14, top + 6, 160, 4);
    // rebar hanging from the break
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.8;
    c.beginPath();
    const r = rng(8);
    for (let i = 0; i < 6; i++) {
      const sx = x1 - 70 + i * 12;
      c.moveTo(sx, top + 24 + i * 2);
      c.quadraticCurveTo(sx + (r() - 0.5) * 18, top + 52, sx + (r() - 0.5) * 30, top + 66 + r() * 34);
    }
    c.stroke();
    // the piers either side: the left whole to the slab, the right broken short
    const pl = [[x0 - 14, 0], [x0 - 14, top - 8], [x0 + 16, top - 8], [x0 + 16, 0]];
    const pr = [[x1 - 18, 0], [x1 - 18, -76], [x1 - 6, -92], [x1 + 4, -70], [x1 + 14, -84], [x1 + 14, 0]];
    extrudePoly(c, pl, 22, { top: '#9a9cac', side: '#30323c' });
    extrudePoly(c, pr, 22, { top: '#9a9cac', side: '#30323c' });
    c.fillStyle = '#70727c';
    poly(c, pl);
    c.fill();
    poly(c, pr);
    c.fill();
  });
  R.surface((c) => {
    c.rect(x0 - 14, top - 8, 30, -top + 8);
    c.rect(x1 - 18, -92, 32, 92);
  }, 'plaster', { scale: 1.2, seed: 4, alpha: 0.8 });

  // what the room still holds, black against the grey
  R.cast((c) => {
    const dark = '#14161e';
    c.fillStyle = dark;
    // a desk on its side, a drawer open
    c.fillRect(x0 + 230, -64, 8, 64);
    c.fillRect(x0 + 238, -64, 82, 6);
    c.fillRect(x0 + 312, -64, 8, 64);
    c.fillStyle = '#23262f';
    c.fillRect(x0 + 242, -58, 66, 54);
    // a chair upturned
    c.fillStyle = dark;
    c.fillRect(x0 + 330, -34, 30, 4);
    c.fillRect(x0 + 332, -30, 3, 30);
    c.fillRect(x0 + 355, -30, 3, 30);
    c.fillRect(x0 + 330, -34, 3, -40);
    // a steel filing cabinet, drawers hanging
    c.fillRect(x0 + 122, -86, 44, 86);
    c.fillStyle = '#2c303c';
    for (let i = 0; i < 3; i++) c.fillRect(x0 + 126, -82 + i * 28, 36, 24);
    c.fillStyle = dark;
    c.fillRect(x0 + 122, -34, 44, 3);
    // the ceiling lamp, hanging by its flex, turning a little
    const sw = Math.sin(t * 0.6) * 2.5;
    c.strokeStyle = dark;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0 + 260, top + 12);
    c.lineTo(x0 + 260 + sw, top + 56);
    c.stroke();
    c.beginPath();
    c.moveTo(x0 + 248 + sw, top + 70);
    c.lineTo(x0 + 272 + sw, top + 70);
    c.lineTo(x0 + 267 + sw, top + 54);
    c.lineTo(x0 + 253 + sw, top + 54);
    c.fill();
    // papers across the floor
    c.fillStyle = 'rgba(150,154,168,0.55)';
    const r = rng(15);
    for (let i = 0; i < 16; i++) c.fillRect(x0 + 40 + r() * 330, -2 - r() * 4, 6 + r() * 12, 1.6);
  });

  // ---- the portrait on the back wall
  const P = PORTRAIT;
  const cx = P.x + P.w / 2;
  R.cast((c) => {
    // the hanging wire to its nail
    c.strokeStyle = '#1a1814';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(P.x + 8, P.y + 4);
    c.lineTo(cx, P.y - 14);
    c.lineTo(P.x + P.w - 8, P.y + 4);
    c.stroke();
    c.fillStyle = '#1a1814';
    c.fillRect(cx - 1.5, P.y - 16, 3, 5);
    // the frame, 8 deep, gilt gone brown
    extrudeRect(c, P.x, P.y, P.w, P.h, 8, { top: '#8a7440', side: '#1c170c' });
    c.fillStyle = '#6a5a30';
    c.fillRect(P.x, P.y, P.w, P.h);
    c.fillStyle = '#3e3419';
    c.fillRect(P.x + 4, P.y + 4, P.w - 8, P.h - 8);
    // the print: stained, ecru gone to tea
    const pg = c.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h);
    pg.addColorStop(0, '#6e6650');
    pg.addColorStop(1, '#40392a');
    c.fillStyle = pg;
    c.fillRect(P.x + 7, P.y + 7, P.w - 14, P.h - 14);
    // a head and shoulders, nothing more: a dark shape only
    c.fillStyle = '#0f0e0b';
    c.beginPath();
    c.ellipse(cx, P.y + P.h * 0.37, P.w * 0.16, P.h * 0.17, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(P.x + 9, P.y + P.h - 7);
    c.lineTo(P.x + 9, P.y + P.h * 0.78);
    c.quadraticCurveTo(P.x + P.w * 0.2, P.y + P.h * 0.62, cx - 6, P.y + P.h * 0.56);
    c.lineTo(cx + 6, P.y + P.h * 0.56);
    c.quadraticCurveTo(P.x + P.w * 0.8, P.y + P.h * 0.62, P.x + P.w - 9, P.y + P.h * 0.78);
    c.lineTo(P.x + P.w - 9, P.y + P.h - 7);
    c.fill();
    // water: long brown tide-lines running down the print, and over the wall below
    c.fillStyle = 'rgba(30,22,10,0.35)';
    for (let i = 0; i < 5; i++) c.fillRect(P.x + 9 + i * 9, P.y + 8, 2 + (i % 2) * 2, 30 + i * 8);
    // the burn: it has eaten the lower right and a bite out of the frame, leaving
    // the wall bare, a charred, ragged edge
    const burn = [[P.x + P.w + 6, P.y - 2], [P.x + P.w * 0.78, P.y + P.h * 0.2], [P.x + P.w * 0.88, P.y + P.h * 0.34], [P.x + P.w * 0.56, P.y + P.h * 0.5], [P.x + P.w * 0.66, P.y + P.h * 0.64], [P.x + P.w * 0.36, P.y + P.h * 0.78], [P.x + P.w * 0.44, P.y + P.h * 0.9], [P.x + P.w * 0.2, P.y + P.h + 6], [P.x + P.w + 6, P.y + P.h + 6]];
    c.save();
    poly(c, burn);
    c.fillStyle = bw;
    c.fill();
    c.restore();
    // soot stain over the wall where the flames licked up
    const so = c.createRadialGradient(P.x + P.w * 0.8, P.y + P.h * 0.3, 2, P.x + P.w * 0.8, P.y + P.h * 0.3, 52);
    so.addColorStop(0, 'rgba(4,4,6,0.8)');
    so.addColorStop(1, 'rgba(4,4,6,0)');
    c.fillStyle = so;
    c.fillRect(P.x + 10, P.y - 36, P.w + 40, 90);
    // the scorched edge: charcoal, then a thin ember-brown line inside it
    c.strokeStyle = '#0c0a08';
    c.lineWidth = 3.2;
    c.lineJoin = 'round';
    c.beginPath();
    burn.slice(0, 8).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    c.strokeStyle = 'rgba(110,56,22,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    burn.slice(1, 8).forEach(([x, y], i) => (i ? c.lineTo(x - 2, y - 1) : c.moveTo(x - 2, y - 1)));
    c.stroke();
    // water trails down the bare wall below
    c.fillStyle = 'rgba(14,16,24,0.4)';
    c.fillRect(P.x + 12, P.y + P.h, 3, 22);
    c.fillRect(P.x + 26, P.y + P.h * 0.9, 2, 36);
    c.fillStyle = 'rgba(14,16,24,0.25)';
    c.fillRect(P.x + 4, P.y + P.h, 7, 30);
  });
  R.glow((c) => {
    // the gilt on the frame's upper-left edge, catching what light there is
    const wash = c.createRadialGradient(cx - 6, P.y + P.h * 0.4, 6, cx - 6, P.y + P.h * 0.4, 70);
    wash.addColorStop(0, 'rgba(150,164,215,0.13)');
    wash.addColorStop(1, 'rgba(150,164,215,0)');
    c.fillStyle = wash;
    c.fillRect(cx - 80, P.y - 40, 160, P.h + 80);
    c.fillStyle = 'rgba(170,150,96,0.16)';
    c.fillRect(P.x + 7, P.y + 7, P.w * 0.5, P.h * 0.3);
    c.strokeStyle = 'rgba(224,200,130,0.5)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(P.x, P.y + P.h * 0.62);
    c.lineTo(P.x, P.y);
    c.lineTo(P.x + P.w * 0.76, P.y);
    c.stroke();
    // the moon's last slant into the room, low from the west
    const sl = c.createLinearGradient(x0, -30, x0 + 320, -6);
    sl.addColorStop(0, 'rgba(180,198,250,0.12)');
    sl.addColorStop(1, 'rgba(180,198,250,0)');
    c.fillStyle = sl;
    c.fillRect(x0, -22, 320, 22);
    const r = rng(77);
    for (let i = 0; i < 14; i++) {
      const x = x0 + 40 + r() * (w - 80) + Math.sin(t * 0.4 + i) * 8;
      const y = top + 20 + r() * 110 + Math.sin(t * 0.3 + i * 1.7) * 6;
      c.fillStyle = `rgba(210,222,255,${0.12 + 0.1 * Math.sin(t * 1.2 + i)})`;
      c.fillRect(x, y, 1.5, 1.5);
    }
  });
  // the front wall, come down in the street
  T.rubble(R, x0 - 40, 230, 66, { seed: 74, color: '#8c8b90' });
  T.rubble(R, x1 - 130, 200, 58, { seed: 75, color: '#86868c' });
}

// ------------------------------------------------------------- 7. the tower --

function towerDoor(R, g) {
  const x0 = X4.tower;
  const dw = 62;
  const dh = 128;
  const top = -(6 * 134);
  R.cast((c) => {
    // the surround: 16 deep, with a lintel and a worn step
    slab(c, x0 - dw / 2 - 16, -dh - 20, dw + 32, dh + 20, 16, '#aaa69c', '#c6c2b6', '#2a2c36');
    slab(c, x0 - dw / 2 - 24, -7, dw + 48, 7, 20, '#8e8b84', '#b4b0a4', '#26282f');
    // the open doorway: a black stairwell
    pit(c, [[x0 - dw / 2, -dh], [x0 + dw / 2, -dh], [x0 + dw / 2, -7], [x0 - dw / 2, -7]], 18, '#1c2030', '#020308');
    // the leaf, swung out against the wall on the right: a green steel door
    extrudePoly(c, [[x0 + dw / 2, -dh], [x0 + dw / 2 + 26, -dh + 7], [x0 + dw / 2 + 26, -2], [x0 + dw / 2, -7]], 6, { color: '#33423e' });
    c.fillStyle = '#33423e';
    poly(c, [[x0 + dw / 2, -dh], [x0 + dw / 2 + 26, -dh + 7], [x0 + dw / 2 + 26, -2], [x0 + dw / 2, -7]]);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x0 + dw / 2 + 4, -dh + 14, 18, 40);
    c.fillRect(x0 + dw / 2 + 4, -dh + 62, 18, 40);
    // a transom light above, a small fan of dark glass
    c.fillStyle = '#05060a';
    c.beginPath();
    c.moveTo(x0 - dw / 2 + 4, -dh - 6);
    c.quadraticCurveTo(x0, -dh - 24, x0 + dw / 2 - 4, -dh - 6);
    c.closePath();
    c.fill();
    // the first stair inside: a hint of a banister, just visible
    c.fillStyle = '#0a0b12';
    for (let i = 0; i < 3; i++) c.fillRect(x0 - dw / 2 + 6 + i * 4, -30 - i * 12, 3, 30 + i * 12);
  });
  R.glow((c) => {
    // the pale threshold, the moon across the step
    c.fillStyle = 'rgba(176,196,250,0.18)';
    c.fillRect(x0 - dw / 2, -7, dw, 3);
    c.fillStyle = 'rgba(200,214,250,0.3)';
    c.fillRect(x0 - dw / 2 - 16, -dh - 20, dw + 32, 1.4);
    c.fillRect(x0 - dw / 2 - 24, -7, dw + 48, 1.2);
  });
  // the roof: a water tank, a stair-head box, an aerial or two
  R.cast((c) => {
    const rx = 4825 + 150;
    slab(c, rx + 230, top - 54, 76, 54, 14, '#8a8780', '#bab6aa', '#2a2c36');
    c.fillStyle = '#42454f';
    c.fillRect(rx + 250, top - 40, 16, 40);
    c.fillStyle = '#4a4e5a';
    c.beginPath();
    c.ellipse(rx + 60, top - 22, 28, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(rx + 32, top - 24, 56, 22);
    c.fillStyle = '#3a3d48';
    c.fillRect(rx + 34, top - 2, 52, 4);
    c.strokeStyle = '#25272f';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(rx + 120, top);
    c.lineTo(rx + 120, top - 80);
    c.moveTo(rx + 104, top - 62);
    c.lineTo(rx + 136, top - 62);
    c.moveTo(rx + 108, top - 74);
    c.lineTo(rx + 132, top - 74);
    c.stroke();
  });
  R.glow((c) => {
    c.strokeStyle = 'rgba(205,218,252,0.28)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(4825 + 150 + 230, top - 54);
    c.lineTo(4825 + 150 + 306, top - 54);
    c.stroke();
  });
}

// ----------------------------------------------------- the street's things --

function streetDebris(R, near) {
  const piles = [
    [-300, 130, 34, 161, '#8a8a90'],
    [1010, 120, 30, 162, '#898990'],
    [1730, 90, 24, 163, '#8c8c92'],
    [2480, 110, 28, 164, '#8a8a90'],
    [3290, 120, 30, 165, '#8c8c94'],
    [3990, 100, 26, 166, '#898990'],
    [4690, 140, 34, 167, '#8c8c92'],
    [5420, 150, 34, 168, '#898990'],
  ];
  for (const [x, w, h, seed, col] of piles) if (near(x, x + w)) T.rubble(R, x, w, h, { seed, color: col });
  const bits = [[240, 'chair'], [1180, 'can'], [1960, 'bottle'], [2690, 'chair'], [3420, 'bottle'], [4120, 'can'], [4830, 'bottle'], [5260, 'chair']];
  R.cast((c) => {
    for (const [x, kind] of bits) {
      if (!near(x - 30, x + 30)) continue;
      c.fillStyle = '#4a4d5c';
      if (kind === 'chair') {
        c.save();
        c.translate(x, 0);
        c.rotate(-0.3);
        c.fillRect(-14, -4, 28, 4);
        c.fillRect(-14, -26, 4, 24);
        c.fillRect(-14, -4, 3, 4);
        c.restore();
        c.fillRect(x + 6, -14, 3, 14);
      } else if (kind === 'can') {
        c.fillRect(x - 6, -6, 12, 6);
      } else {
        c.fillRect(x - 7, -30, 14, 30);
        c.fillRect(x - 3, -35, 6, 5);
      }
    }
  });
}

// The moon on the tarmac and the paving, low in the west now: a longer, paler
// sheen along the kerb, and damp patches where the dust has settled.
function roadSheen(R) {
  const cx = R.cam.x;
  R.glow((c) => {
    const g1 = c.createLinearGradient(0, -6, 0, 120);
    g1.addColorStop(0, 'rgba(150,170,225,0.2)');
    g1.addColorStop(0.3, 'rgba(130,150,210,0.08)');
    g1.addColorStop(1, 'rgba(110,130,190,0)');
    c.fillStyle = g1;
    c.fillRect(cx - 1600, -6, 3200, 126);
    const r = rng(23);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(cx / 3200) * 3200 - 3200 + r() * 9600;
      if (Math.abs(x - cx) > 1500) continue;
      c.fillStyle = `rgba(160,180,235,${0.04 + r() * 0.07})`;
      c.beginPath();
      c.ellipse(x, 24 + r() * 70, 50 + r() * 110, 3 + r() * 5, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// ------------------------------------------------------------ the draw --

export function drawStreet(R, g) {
  const t = g.time;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1500 && x0 < cx + 1500;

  // the sky: the moon low in the west, and Damascus's glow on the far horizon
  nightSky(R, g, { moonUv: MOON_UV });
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gx = R.W * 1.02;
    const gy = R.H * 0.68;
    const grd = c.createRadialGradient(gx, gy, 0, gx, gy, R.W * 0.42);
    grd.addColorStop(0, 'rgba(255,170,96,0.22)');
    grd.addColorStop(0.4, 'rgba(255,140,80,0.07)');
    grd.addColorStop(1, 'rgba(255,130,70,0)');
    c.fillStyle = grd;
    c.fillRect(R.W * 0.5, 0, R.W * 0.5, R.H);
    c.restore();
  });
  T.skyline(R, { depth: 0.3, y: 40, color: '#1b2034', seed: 63, haze: ['#5c6c9c', 0.2], minarets: [1300, 4300] });

  // the mosque's minaret and dome stand behind the street's line
  if (near(X4.minaret - 150, X4.minaret + 300)) minaretFar(R, g);

  // ---- the street's buildings
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);

  // ---- the landmarks, on the buildings' faces
  if (near(X4.arch - 140, X4.arch + 140)) archWall(R, g);
  if (near(X4.shop - 140, X4.shop + 140)) shopFront(R, g);
  if (near(X4.shutter - 80, X4.shutter + 80)) shutterDoor(R, g);
  if (near(MOS.x0, MOS.x1)) mosqueWall(R, g);
  if (near(4215, 4605)) portraitRoom(R, g);
  if (near(X4.tower - 150, X4.tower + 250)) towerDoor(R, g);

  // a candle or two, in the windows of people who have not left
  if (near(-480, 0)) candle(R, blockOf(603), 2, 1, t, 2);
  if (near(1620, 1920)) candle(R, blockOf(608), 1, 2, t, 5);
  if (near(2725, 3275)) candle(R, blockOf(612), 1, 4, t, 1);
  if (near(4825, 5375)) candle(R, blockOf(617), 3, 1, t, 3);

  // ---- the ground
  T.street(R, -1200, X4.end + 1200);
  roadSheen(R);
  if (near(X4.classroom - 120, X4.classroom + 300)) classroom(R, g);
  streetDebris(R, near);
  T.cables(R, cx, { seed: 175, from: -400, to: X4.end + 400 });

  // the scene's own props
  g.act?.drawProps?.(R, g);

  // ---- the people
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, SHEAR, SQUASH);
  }

  // ---- in front of everyone
  g.effects?.draw(R);
  T.foreground(R, cx, { from: -1000, to: X4.end + 600 });
}
