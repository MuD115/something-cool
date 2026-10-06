// Act 3, Scene 3F, and the dawn that opens Act 4: the stairwell of the
// six-storey building, and the roof at the top of it.
//
//   drawStairwell   MEM.stairs: a cut-away of the dark stairwell, six
//                   flights, a floor each (FLOOR_H), the roof door at the top.
//   drawRoof        MEM.roof: the flat roof; Damascus lit in the west (left),
//                   Ghouta dark in the east (right); dawn 0 to 1 lightens the
//                   right-hand horizon and puts Damascus out street by street.
//
// World units: ground at y = 0, up is negative, 1 unit is about a centimetre.

import { lerp, clamp, rng, mixc } from '../engine/util.js';
import { extrudePoly, extrudeRect, extrudePath, DEPTH } from './depth.js';
import { MEM, FLIGHTS } from '../story/act3v-map.js';

const TAU = Math.PI * 2;
const mk = (w, h) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
};
const smooth = (a, b, v) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const near = (R, x0, x1) => x1 > R.cam.x - 1600 && x0 < R.cam.x + 1600;
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ==================================================================== the stairwell ==

const SX = MEM.stairs[0];
const SW = MEM.stairs[1]; // half-width of the well
const SL = SX - SW; // inner face of the left wall
const SR = SX + SW; // inner face of the right wall
const WALL_T = 64; // thickness of the cut side walls
const LAND = 130; // landing depth along the well
const XL = SL + LAND; // the flights run between these two
const XR = SR - LAND;
// A storey at a person's scale: 222 from floor to floor (the story reads the
// stairs only through stairPath(), which follows this), so a man of 170 walks
// upright and a door 205 tall fits under the next landing. 13 treads of 17.
const FH = 222;
const STEPS = 13;
const SLAB = 34; // thickness of a flight's soffit
const FLIGHT_D = 74; // how far back a flight reaches (its width)
const TOP_Y = -FLIGHTS * FH; // the roof-door landing
const CEIL_Y = TOP_Y - 150;
const DOOR_W = 92;
const DOOR_H = 205;

// Floor n is a landing at y = -n * FLOOR_H: even floors on the left, odd on
// the right. Flight k runs from floor k up to floor k + 1.
const levelY = (n) => -n * FH;
const landCx = (n) => (n % 2 === 0 ? SL + LAND / 2 : SR - LAND / 2);
const doorCx = (n) => (n === 0 ? SX - 260 : landCx(n));
const flightEnds = (k) => (k % 2 === 0 ? [XL, levelY(k), XR, levelY(k + 1)] : [XR, levelY(k), XL, levelY(k + 1)]);

export const ROOF_DOOR = [landCx(FLIGHTS), levelY(FLIGHTS)];

// The line the story walks Sami along: in at the street door, up each flight
// (a point per tread), out across the landing, turn, and on, to the roof door.
export function stairPath() {
  const pts = [[SX - 260, 0]];
  for (let k = 0; k < FLIGHTS; k++) {
    const [xa, ya, xb, yb] = flightEnds(k);
    const tw = (xb - xa) / STEPS;
    const r = (yb - ya) / STEPS;
    pts.push([xa, ya]);
    for (let i = 0; i < STEPS; i++) pts.push([xa + (i + 0.5) * tw, ya + (i + 1) * r]);
    pts.push([xb, yb]);
    // across the landing and back to the next flight's foot
    const into = k + 1;
    const turn = xb + Math.sign(xb - xa) * (LAND - 34);
    if (into < FLIGHTS) pts.push([turn, yb], [xb, yb]);
    else pts.push([landCx(FLIGHTS), yb]);
  }
  return pts;
}

// The slits that let the moon in: one on the wall opposite each landing.
const slits = [];
// (a window on the wall opposite each landing: 74 x 107 on an 86 sill)
for (let n = 0; n <= FLIGHTS; n++) slits.push({ n, x: n % 2 === 0 ? SR - LAND / 2 : SL + LAND / 2, y: levelY(n) - 86 - 107, w: 74, h: 107 });

// Torch-lit stairwell: cold moon through the slits, little else.
export function stairLook(g) {
  const lights = [];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  const p = g.player || { x: SX, y: 0 };
  const sorted = [...slits].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  for (const s of sorted.slice(0, torch ? 2 : 3)) {
    lights.push({ x: s.x + 6, y: s.y + 18, color: [0.5, 0.62, 1.0], intensity: 0.55, radius: 0.1, rim: 0.4 });
  }
  return {
    // dark, but never black: the steps and Sami still read outside the beam
    ambient: [0.12, 0.126, 0.165],
    lights,
    groundShadow: 0.4,
    bloom: 0.85,
    exposure: 1.02,
    grain: 0.08,
    grade: { sat: 0.5, contrast: 1.12, lift: 0.012, tint: [0.93, 0.97, 1.07], shadows: [0.85, 0.95, 1.15], highs: [1.06, 1.0, 0.92] },
    fog: { density: 0.03, height: 60, color: [0.1, 0.12, 0.18] },
    time: g.time,
  };
}

// ---- the back wall, baked once: paint, peeling, stains, chalk

const WALL = { x0: SL - WALL_T - 40, x1: SR + WALL_T + 40, y0: CEIL_Y - 60, y1: 90 };
let wallBake = null;

function chalkDrawing(c, x, y) {
  c.save();
  c.translate(x, y);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(232,230,214,0.78)';
  c.lineWidth = 2.4;
  // a sun, its rays uneven
  c.beginPath();
  c.arc(62, 28, 13, 0, TAU);
  c.stroke();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2;
    c.beginPath();
    c.moveTo(62 + Math.cos(a) * 18, 28 + Math.sin(a) * 18);
    c.lineTo(62 + Math.cos(a) * (26 + (i % 3) * 3), 28 + Math.sin(a) * (26 + (i % 3) * 3));
    c.stroke();
  }
  // a house, a door, a window, smoke
  c.strokeStyle = 'rgba(230,200,170,0.75)';
  c.beginPath();
  c.rect(8, 96, 54, 46);
  c.moveTo(4, 96);
  c.lineTo(35, 66);
  c.lineTo(66, 97);
  c.moveTo(24, 142);
  c.lineTo(24, 118);
  c.lineTo(38, 118);
  c.lineTo(38, 142);
  c.moveTo(44, 106);
  c.rect(44, 106, 11, 10);
  c.stroke();
  c.strokeStyle = 'rgba(200,215,235,0.6)';
  c.beginPath();
  c.moveTo(52, 70);
  c.bezierCurveTo(56, 56, 46, 52, 52, 40);
  c.stroke();
  // four stick people holding hands, the smallest in the middle
  c.strokeStyle = 'rgba(240,236,222,0.8)';
  const fig = (fx, s) => {
    c.beginPath();
    c.arc(fx, 118 - 18 * s, 5 * s, 0, TAU);
    c.moveTo(fx, 118 - 13 * s);
    c.lineTo(fx, 140 - 6 * s);
    c.moveTo(fx, 140 - 6 * s);
    c.lineTo(fx - 6 * s, 142);
    c.moveTo(fx, 140 - 6 * s);
    c.lineTo(fx + 6 * s, 142);
    c.stroke();
  };
  fig(84, 1.15);
  fig(108, 0.8);
  fig(130, 1.1);
  c.beginPath();
  c.moveTo(84, 124);
  c.lineTo(108, 128);
  c.lineTo(130, 124);
  c.stroke();
  // a heart, off to one side
  c.strokeStyle = 'rgba(235,150,150,0.7)';
  c.beginPath();
  c.moveTo(150, 70);
  c.bezierCurveTo(138, 56, 156, 48, 150, 62);
  c.bezierCurveTo(158, 48, 176, 56, 150, 80);
  c.stroke();
  c.restore();
}

function bakeWall() {
  const { x0, x1, y0, y1 } = WALL;
  const cv = mk(x1 - x0, y1 - y0);
  const c = cv.getContext('2d');
  c.translate(-x0, -y0);
  const r = rng(404);
  // plaster, a dull cream gone grey
  const base = c.createLinearGradient(0, y0, 0, y1);
  base.addColorStop(0, '#4d4a45');
  base.addColorStop(1, '#585349');
  c.fillStyle = base;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  // mottling
  for (let i = 0; i < 520; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(20,18,14,0.07)' : 'rgba(210,200,180,0.035)';
    const w = 14 + r() * 60;
    c.beginPath();
    c.ellipse(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), w, w * (0.4 + r() * 0.6), r() * 3, 0, TAU);
    c.fill();
  }
  // the dado: dirty teal oil paint, a hand high above each floor, its top a wavering line
  for (let n = 0; n <= FLIGHTS; n++) {
    const fy = levelY(n);
    for (let n2 = 0; n2 < 2; n2++) {
      // paint covers the whole storey's wall to a height
      const top = fy - 104 - n2 * 0;
      c.fillStyle = '#34423f';
      c.beginPath();
      c.moveTo(x0, fy + 6);
      for (let x = x0; x <= x1; x += 12) c.lineTo(x, top + Math.sin(x * 0.07 + n) * 1.6 + (r() - 0.5) * 1.4);
      c.lineTo(x1, fy + 6);
      c.closePath();
      c.fill();
      break;
    }
    // a pale stripe above it
    c.fillStyle = 'rgba(200,190,160,0.12)';
    c.fillRect(x0, fy - 108, x1 - x0, 3);
    // peeling: patches where the paint has lifted and the plaster beneath shows
    for (let i = 0; i < 26; i++) {
      const px = x0 + r() * (x1 - x0);
      const py = fy - 8 - r() * 92;
      const w = 12 + r() * 46;
      const h = 8 + r() * 30;
      c.fillStyle = r() < 0.6 ? '#6d685e' : '#7a7467';
      c.beginPath();
      c.moveTo(px, py);
      for (let a = 0; a < 7; a++) {
        const ang = (a / 7) * TAU;
        c.lineTo(px + Math.cos(ang) * w * (0.55 + r() * 0.5), py + Math.sin(ang) * h * (0.55 + r() * 0.5));
      }
      c.closePath();
      c.fill();
      // the curled edge of the flake, catching light
      c.strokeStyle = 'rgba(150,175,168,0.5)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(px - w * 0.6, py + h * 0.2);
      c.quadraticCurveTo(px, py - h * 0.9, px + w * 0.6, py - h * 0.1);
      c.stroke();
    }
    // flakes on the floor line
    for (let i = 0; i < 30; i++) {
      c.fillStyle = 'rgba(80,110,104,0.55)';
      c.fillRect(x0 + r() * (x1 - x0), fy - 2 - r() * 3, 2 + r() * 4, 1.5);
    }
    // water streaks running from the ceiling line
    for (let i = 0; i < 6; i++) {
      const sx = x0 + r() * (x1 - x0);
      const g2 = c.createLinearGradient(0, fy - FH, 0, fy - 60);
      g2.addColorStop(0, 'rgba(20,18,12,0.28)');
      g2.addColorStop(1, 'rgba(20,18,12,0)');
      c.fillStyle = g2;
      c.fillRect(sx, fy - FH, 4 + r() * 10, FH - 60);
    }
  }
  // a crack and shrapnel pocks, the scars of a building that has been near things
  c.strokeStyle = 'rgba(14,12,10,0.7)';
  c.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    let cx = SX + (r() - 0.5) * 400;
    let cy = -220 - r() * (FLIGHTS * FH * 0.62);
    c.beginPath();
    c.moveTo(cx, cy);
    for (let k = 0; k < 9; k++) {
      cx += (r() - 0.5) * 14;
      cy += 8 + r() * 14;
      c.lineTo(cx, cy);
    }
    c.stroke();
  }
  c.fillStyle = 'rgba(12,10,8,0.7)';
  for (let i = 0; i < 40; i++) {
    c.beginPath();
    c.arc(SX + (r() - 0.5) * 520, -40 - r() * (FLIGHTS * FH - 140), 1.5 + r() * 2.2, 0, TAU);
    c.fill();
  }
  // the child's chalk drawing, on the wall above the fourth floor
  chalkDrawing(c, SX + 112, levelY(4) - 192);
  // tally marks beside a door, five at a time
  c.strokeStyle = 'rgba(230,228,210,0.55)';
  c.lineWidth = 1.5;
  for (let g3 = 0; g3 < 4; g3++) {
    const tx = SL + 14 + (g3 % 2) * 30;
    const ty = levelY(2) - 66 - Math.floor(g3 / 2) * 18;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(tx + i * 4, ty);
      c.lineTo(tx + i * 4 + (r() - 0.5), ty + 12);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(tx - 2, ty + 10);
    c.lineTo(tx + 17, ty + 2);
    c.stroke();
  }
  // a scrawl of marker: a family name and the floor
  c.fillStyle = 'rgba(25,60,110,0.55)';
  c.font = '700 18px sans-serif';
  c.fillText('2B', SR - 100, levelY(2) - 130);
  return { cv, x0, y0 };
}

// A door in the back wall: frame, leaf, the number, a mat. `open` 0…1 swings it.
function stairDoor(c, cx, fy, kind, open = 0) {
  const x = cx - DOOR_W / 2;
  const y = fy - DOOR_H;
  // the frame, thick and dark
  c.fillStyle = '#24211e';
  c.fillRect(x - 7, y - 7, DOOR_W + 14, DOOR_H + 7);
  // the dark of the doorway
  c.fillStyle = '#06070a';
  c.fillRect(x, y, DOOR_W, DOOR_H);
  const leaf = { wood: '#5a4331', steel: '#3b4a45', blue: '#3a4b63', brown: '#4d3a2c' }[kind] || '#4d3a2c';
  if (open > 0) {
    // the leaf swung back toward us: foreshortened, hinged at the left jamb
    const w = DOOR_W * (1 - open) * 0.9 + 8;
    c.fillStyle = leaf;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + w, y - 5 * open);
    c.lineTo(x + w, y + DOOR_H + 3 * open);
    c.lineTo(x, y + DOOR_H);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x + w * 0.2, y + 12, w * 0.6, DOOR_H * 0.38);
  } else {
    c.fillStyle = leaf;
    c.fillRect(x + 1, y + 1, DOOR_W - 2, DOOR_H - 1);
    // panels
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x + 8, y + 9, DOOR_W - 16, DOOR_H * 0.36);
    c.fillRect(x + 8, y + DOOR_H * 0.5, DOOR_W - 16, DOOR_H * 0.4);
    c.strokeStyle = 'rgba(255,240,215,0.12)';
    c.lineWidth = 1;
    c.strokeRect(x + 8, y + 9, DOOR_W - 16, DOOR_H * 0.36);
    // handle and a dull brass keyhole plate
    c.fillStyle = '#8a7a52';
    c.fillRect(x + DOOR_W - 14, y + DOOR_H * 0.52, 4, 12);
    c.fillStyle = '#17140f';
    c.fillRect(x + DOOR_W - 13, y + DOOR_H * 0.52 + 14, 2, 4);
    // the spy-hole
    c.fillStyle = '#8f8260';
    c.beginPath();
    c.arc(cx, y + 24, 2, 0, TAU);
    c.fill();
  }
  // a lintel of old plaster over it, and the number
  c.fillStyle = '#6b655a';
  c.fillRect(x - 10, y - 12, DOOR_W + 20, 5);
}

// ---- one flight, drawn as a solid in profile

function flightPoly(xa, ya, xb, yb) {
  const tw = (xb - xa) / STEPS;
  const r = (yb - ya) / STEPS;
  const pts = [[xa, ya]];
  for (let i = 0; i < STEPS; i++) {
    pts.push([xa + i * tw, ya + (i + 1) * r]);
    pts.push([xa + (i + 1) * tw, ya + (i + 1) * r]);
  }
  // the soffit, parallel to the pitch, SLAB below it
  pts.push([xb, yb + SLAB]);
  pts.push([xa, ya + SLAB]);
  return pts;
}

function drawFlight(c, k, back) {
  const [xa, ya, xb, yb] = flightEnds(k);
  const pts = flightPoly(xa, ya, xb, yb);
  const dark = back ? 0.62 : 1;
  const col = back ? '#3f3c37' : '#6a665e';
  extrudePoly(c, pts, FLIGHT_D, { color: col, topK: 1.2, sideK: 0.55 });
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
  // the stringer's cut face is a shade darker than the treads: shade the soffit band
  const tw = (xb - xa) / STEPS;
  const r = (yb - ya) / STEPS;
  c.save();
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.clip();
  const g2 = c.createLinearGradient(0, Math.min(ya, yb), 0, Math.max(ya, yb) + SLAB);
  g2.addColorStop(0, 'rgba(0,0,0,0.0)');
  g2.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g2;
  c.fillRect(Math.min(xa, xb) - 2, Math.min(ya, yb) - 20, Math.abs(xb - xa) + 4, Math.abs(yb - ya) + SLAB + 40);
  // each tread: a worn, lighter nosing, a dark riser line
  const rs = rng(900 + k * 7);
  for (let i = 0; i < STEPS; i++) {
    const tx = xa + i * tw;
    const ty = ya + (i + 1) * r;
    c.fillStyle = `rgba(235,228,210,${0.16 * dark + rs() * 0.05})`;
    const lo = Math.min(tx, tx + tw);
    c.fillRect(lo, ty, Math.abs(tw), 2.2);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(tx - 0.6, Math.min(ty, ty - r), 1.4, Math.abs(r));
    // grit and a worn dip on the tread
    if (rs() < 0.5) {
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(lo + 4, ty + 2, Math.abs(tw) - 8, 2);
    }
  }
  c.restore();
  // a few chips along the soffit
  c.fillStyle = 'rgba(8,8,8,0.55)';
  const sr = rng(77 + k);
  for (let i = 0; i < 5; i++) {
    const u = sr();
    c.fillRect(lerp(xa, xb, u) - 2, lerp(ya, yb, u) + SLAB - 6 + sr() * 3, 3 + sr() * 4, 3);
  }
}

// The handrail along a flight: balusters and a rail, dark metal with a lit top.
function handrail(c, k, back) {
  const [xa, ya, xb, yb] = flightEnds(k);
  const tw = (xb - xa) / STEPS;
  const r = (yb - ya) / STEPS;
  const hgt = 92;
  const dark = back ? 0.6 : 1;
  c.lineCap = 'round';
  // balusters, one per tread
  c.strokeStyle = `rgba(${34 * dark},${32 * dark},${30 * dark},1)`;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= STEPS; i += 1) {
    const px = xa + i * tw;
    const py = ya + i * r;
    c.moveTo(px, py);
    c.lineTo(px, py - hgt);
  }
  c.stroke();
  // the rail
  c.strokeStyle = back ? '#33302c' : '#4a4743';
  c.lineWidth = 4.5;
  c.beginPath();
  c.moveTo(xa, ya - hgt);
  c.lineTo(xb, yb - hgt);
  c.stroke();
  c.strokeStyle = back ? 'rgba(180,176,166,0.18)' : 'rgba(205,200,188,0.4)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(xa, ya - hgt - 2);
  c.lineTo(xb, yb - hgt - 2);
  c.stroke();
}

// A landing slab, thick, with its lip.
function landing(c, n) {
  const left = n % 2 === 0;
  const x = left ? SL - WALL_T : SR - LAND;
  const w = left ? LAND + WALL_T : LAND + WALL_T;
  const y = levelY(n);
  extrudeRect(c, x, y, w, 34, FLIGHT_D, { color: '#5b574f', topK: 1.2, sideK: 0.55 });
  c.fillStyle = '#5b574f';
  c.fillRect(x, y, w, 34);
  c.fillStyle = 'rgba(235,228,210,0.18)';
  c.fillRect(x, y, w, 2.5);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(x, y + 22, w, 12);
  // a rebar end showing where the slab has chipped
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(left ? x + LAND - 16 : x + 4, y + 4, 12, 8);
  c.strokeStyle = '#4a2f22';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(left ? x + LAND - 14 : x + 6, y + 8);
  c.lineTo(left ? x + LAND - 4 : x + 16, y + 8);
  c.stroke();
}

function slitWindow(c, s, t) {
  const x = s.x - s.w / 2;
  // the reveal: the wall is thick, so its sides show
  c.fillStyle = '#17161a';
  c.fillRect(x - 5, s.y - 5, s.w + 10, s.h + 10);
  const g2 = c.createLinearGradient(0, s.y, 0, s.y + s.h);
  g2.addColorStop(0, '#162040');
  g2.addColorStop(1, '#2a3d6a');
  c.fillStyle = g2;
  c.fillRect(x, s.y, s.w, s.h);
  // a star or two through it
  c.fillStyle = 'rgba(220,230,255,0.8)';
  c.fillRect(x + 6 + (s.n % 3) * 4, s.y + 12 + (s.n % 4) * 14, 1.6, 1.6);
  // a sill with a line of grime
  c.fillStyle = '#7a7467';
  c.fillRect(x - 6, s.y + s.h + 5, s.w + 12, 4);
  void t;
}

// Small things on the landings: shoes, a mat, a bucket, a sack.
function clutter(c) {
  // shoes at the second floor's door
  const sx = doorCx(2) + 46;
  c.fillStyle = '#1d1a18';
  c.beginPath();
  c.ellipse(sx, levelY(2) - 4, 10, 4, 0, 0, TAU);
  c.ellipse(sx + 18, levelY(2) - 4, 9, 4, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#6d5a49';
  c.fillRect(sx - 8, levelY(2) - 9, 9, 5);
  // a doormat on the third
  c.fillStyle = '#3b2e27';
  c.fillRect(doorCx(3) - 28, levelY(3) - 3, 56, 3);
  // a bucket on the fifth, its handle up
  const bx = doorCx(5) - 50;
  c.fillStyle = '#44505a';
  c.beginPath();
  c.moveTo(bx - 11, levelY(5) - 24);
  c.lineTo(bx + 11, levelY(5) - 24);
  c.lineTo(bx + 8, levelY(5));
  c.lineTo(bx - 8, levelY(5));
  c.closePath();
  c.fill();
  c.strokeStyle = '#2b3036';
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(bx, levelY(5) - 24, 11, Math.PI, TAU);
  c.stroke();
  // a flat sack of something against the first door
  c.fillStyle = '#6b6050';
  c.beginPath();
  c.ellipse(doorCx(1) - 52, levelY(1) - 9, 15, 9, 0, 0, TAU);
  c.fill();
  // a fallen scrap of rubble on the ground floor
  c.fillStyle = '#4a463f';
  c.beginPath();
  c.moveTo(XL + 6, 0);
  c.lineTo(XL + 20, -9);
  c.lineTo(XL + 36, -5);
  c.lineTo(XL + 42, 0);
  c.fill();
}

export function drawStairwell(R, g, { t = g?.time || 0 } = {}) {
  if (!near(R, SL, SR)) return;
  const topY = CEIL_Y;
  wallBake ||= bakeWall();

  // ---- the back wall and its doors
  R.paint((c) => {
    c.drawImage(wallBake.cv, wallBake.x0, wallBake.y0);
  });
  R.surface((c) => c.rect(SL - 4, topY, SR - SL + 8, FLIGHTS * FH + 190), 'plaster', { scale: 1.6, seed: 4, alpha: 0.45 });
  R.paint((c) => {
    const kinds = ['steel', 'wood', 'blue', 'brown', 'wood', 'steel', 'steel'];
    for (let n = 0; n <= FLIGHTS; n++) {
      if (n === 0) stairDoor(c, doorCx(0), 0, 'wood', 0.8);
      else if (n === FLIGHTS) stairDoor(c, doorCx(n), levelY(n), 'steel', 0.72);
      else stairDoor(c, doorCx(n), levelY(n), kinds[n], n === 3 ? 0.18 : 0);
    }
    for (const s of slits) slitWindow(c, s, t);
    clutter(c);
  });
  // the street, seen through the open door at the foot; the sky and a wash of cold light at the roof door
  R.glow((c) => {
    const dx0 = doorCx(0) - DOOR_W / 2;
    const gdr = c.createLinearGradient(0, -DOOR_H, 0, 0);
    gdr.addColorStop(0, 'rgba(60,80,130,0.30)');
    gdr.addColorStop(1, 'rgba(110,130,170,0.18)');
    c.fillStyle = gdr;
    c.fillRect(dx0 + 22, -DOOR_H, DOOR_W - 24, DOOR_H);
    const rx0 = ROOF_DOOR[0] - DOOR_W / 2;
    const gr = c.createLinearGradient(0, ROOF_DOOR[1] - DOOR_H, 0, ROOF_DOOR[1]);
    gr.addColorStop(0, 'rgba(90,115,190,0.55)');
    gr.addColorStop(1, 'rgba(40,55,110,0.25)');
    c.fillStyle = gr;
    c.fillRect(rx0 + 20, ROOF_DOOR[1] - DOOR_H, DOOR_W - 22, DOOR_H);
    // beams of moon from each slit, falling across the stairs
    for (const s of slits) {
      const f = 0.85 + 0.15 * Math.sin(t * 0.4 + s.n);
      const dir = s.x < SX ? 1 : -1;
      const x0 = s.x - s.w / 2;
      const y0 = s.y + s.h;
      const len = 120;
      const gb = c.createLinearGradient(x0, y0, x0 + dir * 50, y0 + len);
      gb.addColorStop(0, `rgba(120,150,255,${0.2 * f})`);
      gb.addColorStop(1, 'rgba(120,150,255,0)');
      c.fillStyle = gb;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0 + s.w, y0);
      c.lineTo(x0 + s.w + dir * 56, y0 + len);
      c.lineTo(x0 + dir * 56 + 6, y0 + len);
      c.closePath();
      c.fill();
      // the slit itself glows a little
      c.fillStyle = `rgba(110,140,230,${0.22 * f})`;
      c.fillRect(x0, s.y, s.w, s.h);
    }
  });

  // ---- the shell: the cut side walls, the foundation, the roof slab
  R.cast((c) => {
    const cutL = [[SL - WALL_T, 60], [SL - WALL_T, CEIL_Y - 44], [SL, CEIL_Y - 44], [SL, 60]];
    const cutR = [[SR, 60], [SR, CEIL_Y - 44], [SR + WALL_T, CEIL_Y - 44], [SR + WALL_T, 60]];
    for (const pts of [cutL, cutR]) {
      extrudePoly(c, pts, FLIGHT_D, { color: '#55514a', topK: 1.2, sideK: 0.55 });
      c.fillStyle = '#4b4741';
      c.beginPath();
      c.moveTo(...pts[0]);
      for (const p of pts.slice(1)) c.lineTo(...p);
      c.closePath();
      c.fill();
    }
    // the roof slab over the head of the well, and the ground slab
    extrudeRect(c, SL - WALL_T, CEIL_Y - 44, SR - SL + WALL_T * 2, 44, FLIGHT_D, { color: '#5b574f', topK: 1.2 });
    c.fillStyle = '#524e47';
    c.fillRect(SL - WALL_T, CEIL_Y - 44, SR - SL + WALL_T * 2, 44);
    c.fillStyle = 'rgba(235,228,210,0.12)';
    c.fillRect(SL - WALL_T, CEIL_Y - 44, SR - SL + WALL_T * 2, 2.5);
    extrudeRect(c, SL - WALL_T, 34, SR - SL + WALL_T * 2, 60, FLIGHT_D, { color: '#4a463f' });
    c.fillStyle = '#403c36';
    c.fillRect(SL - WALL_T, 34, SR - SL + WALL_T * 2, 60);
  });
  R.surface((c) => c.rect(SL - WALL_T, CEIL_Y - 44, WALL_T, FLIGHTS * FH + 230), 'concrete', { scale: 1.1, seed: 2, alpha: 0.6 });
  R.surface((c) => c.rect(SR, CEIL_Y - 44, WALL_T, FLIGHTS * FH + 230), 'concrete', { scale: 1.1, seed: 3, alpha: 0.6 });

  // ---- the landings and the flights; the odd (returning) flights sit behind
  R.cast((c) => {
    for (let k = 1; k < FLIGHTS; k += 2) drawFlight(c, k, true);
    for (let k = 1; k < FLIGHTS; k += 2) handrail(c, k, true);
  });
  R.cast((c) => {
    for (let n = 1; n <= FLIGHTS; n++) landing(c, n);
    for (let k = 0; k < FLIGHTS; k += 2) drawFlight(c, k, false);
    // the ground-floor slab edge to the street door
    c.fillStyle = '#6a665e';
    c.fillRect(SL, 0, LAND, 3);
  });
  R.surface(
    (c) => {
      for (let k = 0; k < FLIGHTS; k += 2) {
        const [xa, ya, xb, yb] = flightEnds(k);
        const pts = flightPoly(xa, ya, xb, yb);
        c.moveTo(...pts[0]);
        for (const p of pts.slice(1)) c.lineTo(...p);
        c.closePath();
      }
    },
    'concrete',
    { scale: 0.9, seed: 8, alpha: 0.55 },
  );
  R.paint((c) => {
    for (let k = 0; k < FLIGHTS; k += 2) handrail(c, k, false);
  });

  // ---- dust turning in the torch beam
  R.glow((c) => {
    const r = rng(12);
    for (let i = 0; i < 64; i++) {
      const bx = SL + r() * (SR - SL);
      const by = -40 - r() * (FLIGHTS * FH);
      const x = bx + Math.sin(t * 0.3 + i) * 14;
      const y = by + ((t * (3 + r() * 5)) % 40);
      c.fillStyle = `rgba(190,205,255,${0.06 + 0.1 * r() * (0.6 + 0.4 * Math.sin(t + i))})`;
      c.fillRect(x, y, 1.6, 1.6);
    }
  });
}

// ==================================================================== the roof ==

const RC = MEM.roof[0];
const RX0 = RC - MEM.roof[1];
const RX1 = RC + MEM.roof[1];
const HZ = 30; // the horizon, in screen-centred units on the far layers
const BW = 3400; // baked far-layer strips cover u = -1700 … 1700 about the roof's centre
const BU0 = -BW / 2;

export const LOOKOUTS = { damascus: RX0 + 100, ghouta: RX1 - 100 };
export const HUT_DOOR = [RX0 + 215, 0];

// A far layer at parallax depth d, drawn about the roof's centre: u is the
// offset to the right of centre, hy is a height on the screen, in units from
// its middle, so the horizon sits still however the camera moves.
const farAt = (R, d, fn) => {
  R.layer(d);
  R.far((c) => {
    c.save();
    c.translate(RC * d, -260 * d);
    fn(c);
    c.restore();
  });
};
const glowAt = (R, d, fn) => {
  R.layer(d);
  R.glow((c) => {
    c.save();
    c.translate(RC * d, -260 * d);
    fn(c);
    c.restore();
  });
};

// a hash from a cluster cell, for "street by street" switching off
const cell = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const LCOL = [
  [255, 172, 82],
  [255, 196, 124],
  [255, 238, 214],
  [172, 204, 255],
  [255, 138, 64],
  [210, 240, 200],
];
const LW = [0.34, 0.2, 0.22, 0.14, 0.07, 0.03];
function pickCol(v) {
  let s = 0;
  for (let i = 0; i < LW.length; i++) {
    s += LW[i];
    if (v < s) return LCOL[i];
  }
  return LCOL[0];
}

// Damascus's density along the horizon: lit from far left, thinning towards the dark.
const dens = (u) => smooth(-1720, -1100, u) * (1 - smooth(-760, -60, u));

// ---- the far layers' static parts, made once

const FAR = {};

// stars and the Milky Way
function bakeStars() {
  const H = 440; // hy -380 … 60
  const cv = mk(BW, H);
  const c = cv.getContext('2d');
  const r = rng(2014);
  const X = (u) => u - BU0;
  const Y = (hy) => hy + 380;
  // the Milky Way: a band that climbs from the south-east, dust lanes down its middle
  const mw = (s) => [lerp(760, -470, s) + Math.sin(s * Math.PI) * 90, lerp(60, -420, s) - Math.sin(s * Math.PI) * 30];
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 260; i++) {
    const s = r();
    const [mx, my] = mw(s);
    const w = 30 + r() * 70;
    const wid = 0.6 + 0.9 * Math.sin(s * Math.PI * 0.9 + 0.2);
    const px = mx + (r() - 0.5) * 120 * wid;
    const py = my + (r() - 0.5) * 80 * wid;
    const warm = Math.exp(-Math.pow((s - 0.35) / 0.18, 2));
    const g2 = c.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), w);
    const col = mixc([140, 165, 255], [255, 226, 190], warm * 0.8);
    g2.addColorStop(0, rgba(col, 0.03 + warm * 0.03));
    g2.addColorStop(1, rgba(col, 0));
    c.fillStyle = g2;
    c.fillRect(X(px) - w, Y(py) - w, w * 2, w * 2);
  }
  // its grain: thousands of faint stars
  for (let i = 0; i < 16000; i++) {
    const s = r();
    const [mx, my] = mw(s);
    const wid = 0.55 + 0.9 * Math.sin(s * Math.PI * 0.9 + 0.2);
    const g1 = (r() + r() + r() - 1.5) * 2;
    const px = mx + g1 * 62 * wid;
    const py = my + (r() + r() - 1) * 40 * wid;
    c.fillStyle = `rgba(215,225,255,${0.06 + r() * 0.26})`;
    c.fillRect(X(px), Y(py), 1, 1);
  }
  // dust lanes cut a dark river through it
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) {
    const s = 0.08 + r() * 0.8;
    const [mx, my] = mw(s);
    const px = mx - 14 + (r() - 0.5) * 30;
    const py = my + 8 + (r() - 0.5) * 20;
    const w = 14 + r() * 34;
    const g2 = c.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), w);
    g2.addColorStop(0, 'rgba(0,0,0,0.5)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2;
    c.fillRect(X(px) - w, Y(py) - w, w * 2, w * 2);
  }
  // the rest of the sky: stars, most faint, a few bright
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2100; i++) {
    const px = BU0 + r() * BW;
    const py = -380 + Math.pow(r(), 0.8) * 420;
    const m = Math.pow(r(), 3.2);
    const tint = r();
    const col = tint < 0.7 ? [225, 232, 255] : tint < 0.88 ? [255, 238, 210] : [255, 200, 180];
    c.fillStyle = rgba(col, 0.1 + m * 0.7);
    const sz = m > 0.55 ? 2 : m > 0.2 ? 1.5 : 1;
    c.fillRect(X(px), Y(py), sz, sz);
    if (m > 0.8) {
      const g2 = c.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), 7);
      g2.addColorStop(0, rgba(col, 0.28));
      g2.addColorStop(1, rgba(col, 0));
      c.fillStyle = g2;
      c.fillRect(X(px) - 7, Y(py) - 7, 14, 14);
    }
  }
  return cv;
}

// the stars, with the east wiped away by the dawn: made again only when dawn moves a notch
let starScratch = null;
let starKey = -1;
function starsAt(dawn) {
  FAR.stars ||= bakeStars();
  const key = Math.round(dawn * 80);
  if (key === starKey && starScratch) return starScratch;
  starKey = key;
  starScratch ||= mk(BW, 440);
  const c = starScratch.getContext('2d');
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, BW, 440);
  c.drawImage(FAR.stars, 0, 0);
  if (dawn > 0.005) {
    c.globalCompositeOperation = 'destination-out';
    const d = key / 80;
    const rad = 300 + 1500 * d;
    const g2 = c.createRadialGradient(BW / 2 + 900, HZ + 380, 0, BW / 2 + 900, HZ + 380, rad);
    g2.addColorStop(0, 'rgba(0,0,0,1)');
    g2.addColorStop(0.5, 'rgba(0,0,0,0.9)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g2;
    c.fillRect(0, 0, BW, 440);
    const all = smooth(0.62, 1.0, d) * 0.85;
    if (all > 0) {
      c.fillStyle = `rgba(0,0,0,${all})`;
      c.fillRect(0, 0, BW, 440);
    }
  }
  return starScratch;
}

// ---- the silhouettes (dark) and their candidate lights, for each distance

// every layer's strip: hy from V0 to V1
const V0 = -110;
const V1 = 180;
const stripH = V1 - V0;

function mountainSil() {
  const cv = mk(BW, stripH);
  const c = cv.getContext('2d');
  const r = rng(61);
  c.translate(-BU0, -V0);
  c.fillStyle = '#070c1a';
  c.beginPath();
  c.moveTo(BU0, 300);
  // Qasyoun: a long dark shoulder behind Damascus, high at the far left
  for (let u = BU0; u <= BU0 + BW; u += 20) {
    const k = smooth(-300, -1500, u);
    const h = k * (80 + 30 * Math.sin(u * 0.004)) + Math.sin(u * 0.021) * 3 * k + Math.sin(u * 0.09 + 1) * 1.5 * k;
    c.lineTo(u, HZ - 2 - h);
  }
  c.lineTo(BU0 + BW, 300);
  c.fill();
  // distant villages: a pale ridge line farther off on the right too, barely there
  c.fillStyle = '#090e1c';
  c.beginPath();
  c.moveTo(0, 300);
  for (let u = 0; u <= BU0 + BW; u += 14) c.lineTo(u, HZ - 1 - 2.5 * (0.5 + 0.5 * Math.sin(u * 0.013 + r())) - smooth(0, 1500, u) * 4 * Math.abs(Math.sin(u * 0.005)));
  c.lineTo(BU0 + BW, 300);
  c.fill();
  return cv;
}

// farther Damascus: dense low blocks, towers with red lamps
function citySil(spec) {
  const cv = mk(BW, stripH);
  const c = cv.getContext('2d');
  const r = rng(spec.seed);
  c.translate(-BU0, -V0);
  c.fillStyle = spec.color;
  const blocks = [];
  let u = BU0;
  while (u < BU0 + BW) {
    const w = spec.w0 + r() * spec.w1;
    const d = dens(u + 40);
    const h = spec.h0 + r() * spec.h1 * (0.35 + d);
    // the city's skirts: low and ragged at its eastern edge
    const hh = d > 0.02 ? h : spec.h0 * 0.4 * r();
    if (d > 0.01) blocks.push({ x: u, w, h: hh, top: spec.base - hh });
    u += w + r() * 2;
  }
  for (const b of blocks) {
    c.fillRect(b.x, b.top, b.w, 200);
  }
  // a few towers
  const towers = [];
  for (let i = 0; i < spec.towers; i++) {
    const tu = lerp(-1500, -300, r());
    const tw = 6 + r() * 8;
    const th = spec.base - spec.th0 - r() * spec.th1;
    c.fillRect(tu, th, tw, 200);
    c.fillRect(tu + tw / 2 - 0.6, th - 8 - r() * 8, 1.2, 12);
    towers.push({ x: tu + tw / 2, y: th - 10 });
  }
  return { cv, blocks, towers };
}

// Ghouta's near ring: dark blocks across the whole horizon, taller to the right, with a minaret or two
function ghoutaSil() {
  const cv = mk(BW, stripH);
  const c = cv.getContext('2d');
  const edge = mk(BW, stripH);
  const e = edge.getContext('2d');
  const r = rng(88);
  for (const x of [c, e]) x.translate(-BU0, -V0);
  const tops = [];
  let u = BU0;
  while (u < BU0 + BW) {
    const w = 26 + r() * 58;
    const left = smooth(-200, -900, u); // lower, flatter in the west, so Damascus shows over it
    const h = lerp(26 + r() * 40, 8 + r() * 14, left);
    const gap = r() < 0.18 ? 4 + r() * 12 : 0;
    const top = 112 - h - (u > 150 ? r() * 8 : 0);
    tops.push({ x: u, w, top });
    c.fillStyle = r() < 0.5 ? '#04060d' : '#050810';
    c.fillRect(u, top, w, 260);
    // roofline edge, brighter towards the east (where the dawn comes from)
    const ea = clamp((u + 500) / 1700);
    e.fillStyle = `rgba(190,205,235,${0.2 + ea * 0.75})`;
    e.fillRect(u, top, w, 1.4);
    e.fillStyle = `rgba(190,205,235,${(0.1 + ea * 0.5)})`;
    e.fillRect(u + w - 1.2, top, 1.2, 10 + r() * 14);
    // a water tank, a parapet, a dish
    if (r() < 0.4) {
      c.fillRect(u + w * 0.2, top - 4, 6, 4);
      e.fillStyle = `rgba(190,205,235,${0.15 + ea * 0.6})`;
      e.fillRect(u + w * 0.2, top - 4, 6, 1);
    }
    if (r() < 0.12) {
      c.fillRect(u + w * 0.6, top - 9, 1.2, 9);
      c.fillRect(u + w * 0.6 - 3, top - 10, 7, 1.4);
    }
    u += w + gap;
  }
  // minarets: thin, with a gallery and a point; the tallest on the right
  for (const [mu, mh] of [[-70, 44], [330, 66], [790, 52], [1230, 60], [-980, 40]]) {
    const top = 112 - mh;
    const ea = clamp((mu + 500) / 1700);
    c.fillStyle = '#04060d';
    c.fillRect(mu - 2.2, top, 4.4, 120);
    c.fillRect(mu - 3.8, top + 12, 7.6, 3);
    c.beginPath();
    c.moveTo(mu - 2.8, top);
    c.lineTo(mu, top - 12);
    c.lineTo(mu + 2.8, top);
    c.fill();
    e.fillStyle = `rgba(190,205,235,${0.25 + ea * 0.65})`;
    e.fillRect(mu + 1.4, top, 0.9, 40);
    e.fillRect(mu - 3.8, top + 12, 7.6, 1);
  }
  // a dome near the middle
  c.beginPath();
  c.arc(560, 82, 13, Math.PI, TAU);
  c.fill();
  c.fillRect(547, 82, 26, 40);
  e.strokeStyle = 'rgba(190,205,235,0.5)';
  e.lineWidth = 1.2;
  e.beginPath();
  e.arc(560, 82, 13, Math.PI * 1.1, Math.PI * 1.75);
  e.stroke();
  return { cv, edge };
}

// ---- Damascus's lights: made once as lists, drawn into a canvas per notch of dawn

function genLights(spec) {
  const r = rng(spec.seed);
  const out = [];
  for (let i = 0; i < spec.n; i++) {
    // sample the density along the horizon
    let u;
    for (let tries = 0; tries < 12; tries++) {
      u = lerp(-1720, -40, r());
      if (r() < dens(u)) break;
    }
    const ky = Math.pow(r(), spec.pow);
    const hy = spec.y0 + (spec.y1 - spec.y0) * ky;
    if (spec.keep && !spec.keep(u, hy, r)) continue;
    const col = pickCol(r());
    const off = 0.08 + 1.02 * (0.78 * cell(Math.floor(u / spec.cu), Math.floor(hy / spec.cv)) + 0.22 * r());
    out.push({ u, hy, s: spec.s0 + r() * spec.s1, a: spec.a0 + r() * spec.a1, col, off, ph: r() * 6.28, tw: r() < 0.25 });
  }
  return out;
}

function drawLights(c, list, dawn, extra = 0) {
  for (const L of list) {
    if (dawn >= L.off) continue;
    // a light going out dims for a moment first
    const fade = clamp((L.off - dawn) / 0.06);
    c.fillStyle = rgba(L.col, L.a * fade);
    c.fillRect(L.u - BU0, L.hy - V0, L.s + extra, L.s + extra);
  }
}

// light bakes: cached per notch of dawn, the last few kept
function lightBake(layer, list, dawn, { blur = [2.5, 8], boost = 1 } = {}) {
  const key = Math.round(dawn * 36);
  const cache = (layer.cache ||= new Map());
  let b = cache.get(key);
  if (b) {
    cache.delete(key);
    cache.set(key, b);
    return b;
  }
  const d = key / 36;
  const cv = mk(BW, stripH);
  const c = cv.getContext('2d');
  drawLights(c, list, d);
  const copy = mk(BW, stripH);
  copy.getContext('2d').drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'lighter';
  try {
    c.filter = `blur(${blur[0]}px)`;
    c.globalAlpha = 0.9 * boost;
    c.drawImage(copy, 0, 0);
    c.filter = `blur(${blur[1]}px)`;
    c.globalAlpha = 0.8 * boost;
    c.drawImage(copy, 0, 0);
  } catch {
    // (no canvas filters: the bloom pass will do)
  }
  cache.set(key, cv);
  if (cache.size > 4) cache.delete(cache.keys().next().value);
  return cv;
}

// highways and their cars
const ROADS = [
  // an elevated freeway running north to south, across the line of sight
  { pts: [[-1700, 61], [-1300, 58], [-900, 63], [-520, 59], [-260, 64], [-80, 62]], dir: 1, n: 34, v: 0.011 },
  // an avenue running at us, towards the dark
  { pts: [[-1380, 36], [-1000, 56], [-700, 74], [-480, 92], [-330, 112]], dir: -1, n: 22, v: 0.016 },
  // a ring road, low, close
  { pts: [[-1500, 100], [-1100, 98], [-780, 103], [-460, 99], [-260, 104]], dir: 1, n: 16, v: 0.01 },
];
function roadPoint(rd, s) {
  const p = rd.pts;
  const n = p.length - 1;
  const f = clamp(s) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  return [lerp(p[i][0], p[i + 1][0], k), lerp(p[i][1], p[i + 1][1], k)];
}
function roadLights(rd, seed) {
  // streetlamps every few units along it: sodium orange, in the same list so they die by cluster
  const r = rng(seed);
  const out = [];
  let len = 0;
  for (let i = 0; i < rd.pts.length - 1; i++) len += Math.hypot(rd.pts[i + 1][0] - rd.pts[i][0], rd.pts[i + 1][1] - rd.pts[i][1]);
  const n = Math.floor(len / 9);
  for (let i = 0; i < n; i++) {
    const [u, hy] = roadPoint(rd, i / n);
    const off = 0.1 + 1.0 * (0.8 * cell(Math.floor(u / 140), seed) + 0.2 * r());
    out.push({ u, hy: hy - 3, s: 1.5, a: 0.8, col: [255, 178, 90], off, ph: 0, tw: false });
  }
  return out;
}

function farStatic() {
  if (FAR.ready) return;
  FAR.ready = true;
  FAR.ridge = mountainSil();
  FAR.ridgeLights = genLights({ seed: 17, n: 240, y0: -34, y1: HZ - 3, pow: 1.4, s0: 0.9, s1: 0.8, a0: 0.28, a1: 0.35, cu: 60, cv: 20,
    keep: (u, hy) => hy > HZ - 2 - smooth(-300, -1500, u) * 70 * 0.9 });
  FAR.cityA = citySil({ seed: 5, color: '#0a1022', w0: 6, w1: 14, h0: 4, h1: 26, base: HZ + 8, towers: 7, th0: 16, th1: 26 });
  FAR.cityALights = genLights({ seed: 23, n: 4200, y0: HZ - 18, y1: HZ + 32, pow: 1.2, s0: 0.9, s1: 0.8, a0: 0.45, a1: 0.5, cu: 50, cv: 12 });
  FAR.cityB = citySil({ seed: 9, color: '#070b19', w0: 10, w1: 30, h0: 14, h1: 46, base: 104, towers: 10, th0: 62, th1: 36 });
  const rl = [];
  ROADS.forEach((rd, i) => rl.push(...roadLights(rd, 31 + i)));
  FAR.roadLights = rl;
  // lit windows on the nearer blocks of Damascus: orange, white, blue, in grids
  const r = rng(77);
  const win = [];
  for (const b of FAR.cityB.blocks) {
    if (b.w < 8) continue;
    const dd = dens(b.x);
    for (let wx = b.x + 2; wx < b.x + b.w - 2; wx += 3.6) {
      for (let wy = b.top + 3; wy < b.top + b.h && wy < 112; wy += 4.2) {
        if (r() > 0.2 + dd * 0.36) continue;
        const colr = pickCol(r());
        const off = 0.06 + 1.04 * (0.8 * cell(Math.floor(b.x / 40), Math.floor(wy / 30)) + 0.2 * r());
        win.push({ u: wx, hy: wy, s: 1.7, a: 0.5 + r() * 0.5, col: colr, off, ph: 0, tw: false });
      }
    }
  }
  // the green neon of lit minarets: a few, here and there in the city
  const mr = rng(303);
  for (let i = 0; i < 11; i++) {
    const mu = lerp(-1560, -260, mr());
    const top = 100 - 22 - mr() * 26;
    const off = 0.15 + 0.9 * mr();
    for (let y = top; y < top + 22; y += 2) win.push({ u: mu, hy: y, s: 1.5, a: 0.85, col: [96, 255, 150], off, ph: 0, tw: false });
    win.push({ u: mu - 1, hy: top - 3, s: 3, a: 0.9, col: [150, 255, 190], off, ph: 0, tw: false });
  }
  FAR.windows = win;
  FAR.cityBLights = [...win, ...rl];
  FAR.ghouta = ghoutaSil();
  // a very faint scatter of wide, far-off lights over the whole western plain: Damascus's suburbs
  FAR.plainLights = genLights({ seed: 41, n: 700, y0: HZ - 2, y1: HZ + 8, pow: 1.0, s0: 0.8, s1: 0.6, a0: 0.25, a1: 0.3, cu: 80, cv: 10 });
  // the twinklers: a few city lights that scintillate
  const tw = [];
  const rr = rng(101);
  for (let i = 0; i < 140; i++) {
    const u = lerp(-1650, -120, Math.pow(rr(), 0.8));
    if (rr() > dens(u) + 0.2) continue;
    tw.push({ u, hy: HZ + 2 + rr() * 60, ph: rr() * 6.28, sp: 1 + rr() * 3, col: pickCol(rr()), off: 0.1 + rr() * 1.0 });
  }
  FAR.twinkle = tw;
  // the cars
  FAR.cars = [];
  const cr = rng(222);
  ROADS.forEach((rd, ri) => {
    for (let i = 0; i < rd.n; i++) {
      FAR.cars.push({ ri, s0: cr(), sp: rd.v * (0.7 + cr() * 0.7), lane: cr() < 0.5 ? 0 : 1, off: cr() * 0.95, white: cr() < 0.5 });
    }
  });
}

// the light of the east, by dawn
const EAST = [
  [0, [14, 24, 66]],
  [0.3, [30, 42, 96]],
  [0.55, [64, 82, 128]],
  [0.8, [118, 138, 168]],
  [1, [172, 172, 176]],
];
function east(d) {
  for (let i = 1; i < EAST.length; i++) {
    if (d <= EAST[i][0]) {
      const k = (d - EAST[i - 1][0]) / (EAST[i][0] - EAST[i - 1][0]);
      return mixc(EAST[i - 1][1], EAST[i][1], k);
    }
  }
  return EAST[EAST.length - 1][1];
}

// the moon, low and large in the west: a waning gibbous, rusty near the horizon
function moonAt(c, u, hy, dawn) {
  const r = 17;
  const a = 1 - smooth(0.8, 1.0, dawn);
  const halo = c.createRadialGradient(u, hy, r * 0.8, u, hy, r * 11);
  halo.addColorStop(0, rgba([255, 226, 190], 0.22 * a));
  halo.addColorStop(1, rgba([255, 226, 190], 0));
  c.fillStyle = halo;
  c.fillRect(u - r * 11, hy - r * 11, r * 22, r * 22);
  c.fillStyle = rgba([252, 232, 205], a);
  c.beginPath();
  c.arc(u, hy, r, 0, TAU);
  c.fill();
  c.save();
  c.beginPath();
  c.arc(u, hy, r, 0, TAU);
  c.clip();
  // the shadowed side, to the right
  c.fillStyle = 'rgba(14,18,34,0.93)';
  c.beginPath();
  c.arc(u + r * 1.28, hy - r * 0.1, r * 0.98, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(190,160,130,0.35)';
  c.beginPath();
  c.arc(u - r * 0.35, hy - r * 0.25, r * 0.22, 0, TAU);
  c.arc(u - r * 0.5, hy + r * 0.35, r * 0.15, 0, TAU);
  c.arc(u + r * 0.05, hy + r * 0.1, r * 0.1, 0, TAU);
  c.fill();
  c.restore();
}

// ---- the far view, everything past the parapet

function farView(R, dawn, t) {
  farStatic();
  const lowQ = false;
  void lowQ;
  const dim = 1 - 0.25 * dawn; // what remains burns a little lower
  const E = east(dawn);
  const dk = smooth(0, 0.5, dawn);

  // ---- sky: deep blue, the sky gradient, the dawn growing out of the east, the dome over Damascus
  farAt(R, 0.02, (c) => {
    const top = mixc([2, 4, 12], [14, 22, 52], dawn);
    const mid = mixc([6, 10, 26], [34, 46, 92], dawn);
    const low = mixc([14, 22, 46], [88, 108, 150], dawn * 0.9);
    const g2 = c.createLinearGradient(0, -330, 0, HZ);
    g2.addColorStop(0, rgba(top));
    g2.addColorStop(0.55, rgba(mid));
    g2.addColorStop(1, rgba(low));
    c.fillStyle = g2;
    c.fillRect(-1800, -520, 3600, HZ + 520);
  });
  // the stars, over the sky
  farAt(R, 0.02, (c) => {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.drawImage(starsAt(dawn), BU0, -380);
    c.restore();
    // the brightest few, twinkling
    c.save();
    c.globalCompositeOperation = 'lighter';
    const r = rng(404);
    const fade = 1 - smooth(0.55, 0.95, dawn);
    for (let i = 0; i < 70; i++) {
      const u = lerp(-900, 900, r());
      const hy = lerp(-320, 10, Math.pow(r(), 0.9));
      const ph = r() * 6.28;
      const sp = 0.7 + r() * 2.2;
      const eastK = 1 - smooth(0.0, 1.0, dawn * 1.4 * (0.5 + 0.5 * (u + 900) / 1800) + (hy > -100 ? dawn * 0.4 : 0) - 0.2 * (1 - (u + 900) / 1800));
      const a = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * sp + ph))) * fade * clamp(eastK);
      c.fillStyle = `rgba(235,240,255,${a})`;
      c.fillRect(u, hy, 1.6, 1.6);
    }
    // a meteor, now and then
    const per = 23;
    const m = (t % per) / 1.1;
    if (m < 1 && dawn < 0.6) {
      const n = Math.floor(t / per);
      const rm = rng(n * 17 + 3);
      const mu = lerp(-500, 400, rm());
      const mh = lerp(-300, -140, rm());
      const x1 = mu + m * 120;
      const y1 = mh + m * 50;
      const gl = c.createLinearGradient(x1 - 60, y1 - 25, x1, y1);
      gl.addColorStop(0, 'rgba(220,235,255,0)');
      gl.addColorStop(1, `rgba(240,245,255,${0.7 * (1 - m)})`);
      c.strokeStyle = gl;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(x1 - 60 * (1 - m * 0.4), y1 - 25 * (1 - m * 0.4));
      c.lineTo(x1, y1);
      c.stroke();
    }
    c.restore();
  });
  // the glow of the dawn, its breadth and its band
  farAt(R, 0.02, (c) => {
    c.save();
    if (dawn > 0.002) {
      const a = Math.pow(dawn, 0.75);
      const cx = 960;
      // broad: the whole eastern sky going from black-blue to something
      c.save();
      c.translate(cx, HZ + 20);
      c.scale(2.0, 1);
      const g2 = c.createRadialGradient(0, 0, 0, 0, 0, 480);
      g2.addColorStop(0, rgba(E, 0.85 * a));
      g2.addColorStop(0.35, rgba(E, 0.5 * a));
      g2.addColorStop(1, rgba(E, 0));
      c.fillStyle = g2;
      c.fillRect(-500, -500, 1000, 520);
      c.restore();
      // the first colour: a low band hugging the horizon, hot at the lip
      const am = smooth(0.52, 1.0, dawn);
      if (am > 0) {
        c.save();
        c.translate(cx + 60, HZ + 4);
        c.scale(2.6, 1);
        const g3 = c.createRadialGradient(0, 0, 0, 0, 0, 220);
        g3.addColorStop(0, `rgba(255,176,98,${0.65 * am})`);
        g3.addColorStop(0.3, `rgba(244,150,100,${0.4 * am})`);
        g3.addColorStop(0.7, `rgba(200,120,120,${0.12 * am})`);
        g3.addColorStop(1, 'rgba(180,110,130,0)');
        c.fillStyle = g3;
        c.fillRect(-300, -230, 600, 232);
        c.restore();
      }
    }
    // Damascus's dome: an orange-white bell over the lit city, thinning as it sleeps
    const gl = 1 - 0.65 * dawn;
    c.save();
    c.translate(-690, HZ + 18);
    c.scale(1.9, 0.85);
    const g4 = c.createRadialGradient(0, 0, 0, 0, 0, 440);
    g4.addColorStop(0, `rgba(255,172,96,${0.44 * gl})`);
    g4.addColorStop(0.28, `rgba(255,150,86,${0.22 * gl})`);
    g4.addColorStop(0.6, `rgba(160,120,150,${0.08 * gl})`);
    g4.addColorStop(1, 'rgba(120,120,180,0)');
    c.fillStyle = g4;
    c.fillRect(-460, -460, 920, 480);
    c.restore();
    // and its dust: a flat yellow haze on the horizon
    const hz = c.createLinearGradient(0, HZ - 36, 0, HZ + 4);
    hz.addColorStop(0, 'rgba(255,170,100,0)');
    hz.addColorStop(1, `rgba(255,170,100,${0.2 * gl})`);
    c.fillStyle = hz;
    c.fillRect(-1700, HZ - 36, 1360, 42);
    c.restore();
  });
  // the moon
  farAt(R, 0.03, (c) => moonAt(c, -450, -34 + 66 * dawn, dawn));

  // ---- the land: dark plain below the horizon; Qasyoun's long shoulder behind Damascus
  farAt(R, 0.03, (c) => {
    const g2 = c.createLinearGradient(0, HZ, 0, 420);
    g2.addColorStop(0, rgba(mixc([6, 9, 20], [26, 34, 56], dk * 0.7)));
    g2.addColorStop(1, '#020309');
    c.fillStyle = g2;
    c.fillRect(-1800, HZ - 1, 3600, 500);
  });
  farAt(R, 0.04, (c) => {
    c.drawImage(FAR.ridge, BU0, V0);
  });
  glowAt(R, 0.04, (c) => {
    c.globalAlpha = dim;
    c.drawImage(lightBake({ cache: FAR.ridgeCache || (FAR.ridgeCache = new Map()) }, FAR.ridgeLights, dawn, { boost: 0.8 }), BU0, V0);
  });

  // ---- Damascus: far carpet, blocks and towers, the avenues, the highways
  glowAt(R, 0.06, (c) => {
    c.globalAlpha = dim;
    c.drawImage(lightBake({ cache: FAR.plainCache || (FAR.plainCache = new Map()) }, FAR.plainLights, dawn, { boost: 0.7 }), BU0, V0);
  });
  farAt(R, 0.08, (c) => {
    c.drawImage(FAR.cityA.cv, BU0, V0);
  });
  glowAt(R, 0.08, (c) => {
    c.globalAlpha = dim;
    c.drawImage(lightBake({ cache: FAR.cityACache || (FAR.cityACache = new Map()) }, FAR.cityALights, dawn, { blur: [2, 7], boost: 1.15 }), BU0, V0);
    // aircraft lamps on the towers
    for (const tw of FAR.cityA.towers) {
      const on = (Math.sin(t * 1.6 + tw.x) > 0.55 ? 1 : 0.15) * (1 - smooth(0.7, 1, dawn));
      c.fillStyle = `rgba(255,60,50,${0.9 * on})`;
      c.fillRect(tw.x, tw.y, 2, 2);
    }
  });
  // the haze of the dawn lifts the far layers more than the near
  hazeOver(R, 0.08, dawn, 0.34, E);
  farAt(R, 0.14, (c) => {
    c.drawImage(FAR.cityB.cv, BU0, V0);
  });
  glowAt(R, 0.14, (c) => {
    c.globalAlpha = dim;
    c.drawImage(lightBake({ cache: FAR.cityBCache || (FAR.cityBCache = new Map()) }, FAR.cityBLights, dawn, { blur: [1.8, 6], boost: 1.0 }), BU0, V0);
    for (const tw of FAR.cityB.towers) {
      const on = (Math.sin(t * 1.3 + tw.x * 0.3) > 0.5 ? 1 : 0.15) * (1 - smooth(0.7, 1, dawn));
      c.fillStyle = `rgba(255,60,50,${0.95 * on})`;
      c.fillRect(tw.x - 1, tw.y, 2.4, 2.4);
    }
    // scintillation
    const A = 0.5 * (1 - smooth(0.5, 0.95, dawn));
    for (const L of FAR.twinkle) {
      if (dawn > L.off) continue;
      const a = A * (0.5 + 0.5 * Math.sin(t * L.sp + L.ph));
      c.fillStyle = rgba(L.col, a);
      c.fillRect(L.u, L.hy, 2, 2);
    }
    // the cars
    const k = 1 - smooth(0.35, 0.95, dawn);
    for (const car of FAR.cars) {
      if (car.off > k) continue;
      const rd = ROADS[car.ri];
      let s = (car.s0 + t * car.sp * rd.dir) % 1;
      if (s < 0) s += 1;
      const [u, hy] = roadPoint(rd, s);
      const dir = Math.sign(rd.dir * (car.lane ? -1 : 1));
      // headlights toward us, tail lamps away: white or red
      const head = (car.lane ? 1 : 0) ^ (rd.dir < 0 ? 1 : 0);
      const col = head ? [255, 246, 220] : [255, 70, 52];
      c.fillStyle = rgba(col, head ? 0.95 : 0.8);
      c.fillRect(u + dir * 0, hy + (car.lane ? 1.4 : -0.6), head ? 2.2 : 1.8, 1.5);
      if (head) {
        c.fillStyle = 'rgba(255,240,210,0.25)';
        c.fillRect(u - 2, hy - 0.5 + (car.lane ? 1.4 : 0), 7, 2.4);
      }
    }
  });
  hazeOver(R, 0.14, dawn, 0.2, E);

  // ---- Ghouta's near ring
  farAt(R, 0.22, (c) => {
    c.drawImage(FAR.ghouta.cv, BU0, V0);
    // the dawn finds the edges of things
    const ea = smooth(0.08, 0.7, dawn);
    if (ea > 0) {
      c.save();
      c.globalAlpha = ea;
      c.drawImage(FAR.ghouta.edge, BU0, V0);
      c.restore();
    }
  });
  hazeOver(R, 0.22, dawn, 0.12, E);
  // isolated lights of the dark: a candle, a generator, lamps far off
  glowAt(R, 0.22, (c) => {
    const lit = 1 - smooth(0.82, 1.0, dawn);
    const pts = [
      // [u, hy, kind]
      [292, 90, 'candle'],
      [598, 76, 'gen'],
      [1032, 88, 'candle'],
      [-58, 96, 'candle'],
      [1380, 90, 'far'],
      [780, 46, 'far'],
      [1160, 34, 'far'],
    ];
    for (const [u, hy, kind] of pts) {
      if (kind === 'gen') {
        // a generator for a hospital: steady, cold, faintly pulsing
        const p = 0.93 + 0.07 * Math.sin(t * 11) + 0.04 * Math.sin(t * 2.3);
        const g2 = c.createRadialGradient(u, hy, 0, u, hy, 22);
        g2.addColorStop(0, `rgba(255,236,190,${0.8 * p * lit})`);
        g2.addColorStop(0.2, `rgba(255,214,150,${0.3 * p * lit})`);
        g2.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = g2;
        c.fillRect(u - 22, hy - 22, 44, 44);
        c.fillStyle = `rgba(255,248,226,${0.95 * lit})`;
        c.fillRect(u - 1.4, hy - 1.4, 3, 3);
      } else if (kind === 'far') {
        c.fillStyle = `rgba(255,214,150,${0.5 * lit})`;
        c.fillRect(u, hy, 1.8, 1.8);
      } else {
        const f = 0.72 + 0.28 * Math.sin(t * 7.3 + u) * Math.sin(t * 2.1 + u * 0.3);
        const g2 = c.createRadialGradient(u, hy, 0, u, hy, 14);
        g2.addColorStop(0, `rgba(255,170,80,${0.75 * f * lit})`);
        g2.addColorStop(1, 'rgba(255,150,70,0)');
        c.fillStyle = g2;
        c.fillRect(u - 14, hy - 14, 28, 28);
        c.fillStyle = `rgba(255,222,160,${f * lit})`;
        c.fillRect(u - 1.5, hy - 1.5, 3.2, 3.2);
      }
    }
  });
  // low mist in the dark country: lies just above the ring, thickening towards the dawn
  farAt(R, 0.22, (c) => {
    const a = 0.1 + 0.2 * smooth(0.25, 1, dawn);
    const g2 = c.createLinearGradient(0, 60, 0, 130);
    g2.addColorStop(0, rgba(E, 0));
    g2.addColorStop(1, rgba(mixc([20, 28, 52], E, 0.5), a));
    c.fillStyle = g2;
    c.fillRect(-1700, 60, 3400, 70);
  });
}

// atmospheric haze: a veil in the colour of the eastern sky, thicker the farther the layer, fading
// out upwards from the horizon (an eased vertical ramp, so it has no visible top)
function hazeOver(R, d, dawn, k, E) {
  const a = k * (0.1 + 0.9 * smooth(0, 0.9, dawn));
  farAt(R, d, (c) => {
    const g2 = c.createLinearGradient(0, HZ - 90, 0, HZ + 12);
    for (let i = 0; i <= 8; i++) g2.addColorStop(i / 8, rgba(E, a * Math.pow(i / 8, 2.2)));
    c.fillStyle = g2;
    c.fillRect(-1700, HZ - 90, 3400, 102);
    c.fillStyle = rgba(E, a);
    c.fillRect(-1700, HZ + 11, 3400, 130);
  });
}

// ---- the near field: the roof and what stands on it

const C = {
  slab: '#4b4843',
  slabTop: '#58544d',
  wall: '#66625a',
  wallDark: '#3d3a35',
  hut: '#5a5750',
  black: '#0d0e11',
};
const PD = 110; // depth of the roof slab, front to back
const PVX = DEPTH.x * PD;
const PVY = DEPTH.y * PD; // -44
const PAR_H = 105; // parapet height

function slab(R) {
  const x0 = RX0 - 64;
  const x1 = RX1 + 64;
  R.cast((c) => {
    // the slab seen with its top surface (the floor of the roof), and its front edge
    extrudeRect(c, x0, 0, x1 - x0, 40, PD, { color: C.slabTop, topK: 1.0, sideK: 0.6 });
    c.fillStyle = C.slab;
    c.fillRect(x0, 0, x1 - x0, 40);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x0, 22, x1 - x0, 18);
    c.fillStyle = 'rgba(220,214,196,0.12)';
    c.fillRect(x0, 0, x1 - x0, 2.2);
  });
  R.surface((c) => c.rect(x0, 0, x1 - x0, 40), 'concrete', { scale: 1.2, seed: 6, alpha: 0.7 });
  // the roof's floor: a parallelogram of old screed, drawn over the extruded top
  const floor = (c) => {
    c.moveTo(x0, 0);
    c.lineTo(x1, 0);
    c.lineTo(x1 + PVX, PVY);
    c.lineTo(x0 + PVX, PVY);
    c.closePath();
  };
  R.paint((c) => {
    c.beginPath();
    floor(c);
    const g2 = c.createLinearGradient(0, 0, 0, PVY);
    g2.addColorStop(0, '#5c5851');
    g2.addColorStop(1, '#4a4741');
    c.fillStyle = g2;
    c.fill();
    // joints in the screed, expansion cracks, patches of old bitumen and dust
    const r = rng(55);
    c.strokeStyle = 'rgba(15,14,12,0.4)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = x0; x < x1; x += 60 + r() * 40) {
      if (!near(R, x, x + 5)) continue;
      c.moveTo(x, 0);
      c.lineTo(x + PVX * 0.98, PVY);
    }
    c.stroke();
    for (let i = 0; i < 40; i++) {
      const x = x0 + r() * (x1 - x0);
      if (!near(R, x, x + 1)) continue;
      const f = r();
      c.fillStyle = r() < 0.5 ? 'rgba(10,10,12,0.2)' : 'rgba(200,190,170,0.08)';
      c.beginPath();
      c.ellipse(x + PVX * f, PVY * f - 1, 18 + r() * 40, 2 + r() * 4, 0, 0, TAU);
      c.fill();
    }
  });
  R.surface(floor, 'concrete', { scale: 1.0, seed: 9, alpha: 0.5 });
}

function parapets(R) {
  const x0 = RX0 - 64;
  const x1 = RX1 + 64;
  // the back parapet: its inner face, a long wall behind everything; the coping on top
  R.cast((c) => {
    const bx0 = x0 + PVX;
    const bx1 = x1 + PVX;
    extrudeRect(c, bx0, PVY - PAR_H, bx1 - bx0, 18, 26, { color: '#76726a', topK: 1.1 });
    c.fillStyle = C.wall;
    c.fillRect(bx0, PVY - PAR_H + 12, bx1 - bx0, PAR_H - 12);
    // the coping, a slightly proud slab
    c.fillStyle = '#7b776e';
    c.fillRect(bx0 - 4, PVY - PAR_H - 2, bx1 - bx0 + 8, 13);
    c.fillStyle = 'rgba(235,230,210,0.22)';
    c.fillRect(bx0 - 4, PVY - PAR_H - 2, bx1 - bx0 + 8, 2);
    // a darker footing where it meets the floor, and the water stains below the coping
    const g2 = c.createLinearGradient(0, PVY - 30, 0, PVY);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = g2;
    c.fillRect(bx0, PVY - 30, bx1 - bx0, 30);
    const r = rng(121);
    for (let x = bx0; x < bx1; x += 24) {
      if (!near(R, x, x + 30)) continue;
      const hh = 10 + r() * 38;
      const g3 = c.createLinearGradient(0, PVY - PAR_H + 12, 0, PVY - PAR_H + 12 + hh);
      g3.addColorStop(0, 'rgba(10,10,10,0.3)');
      g3.addColorStop(1, 'rgba(10,10,10,0)');
      c.fillStyle = g3;
      c.fillRect(x + r() * 12, PVY - PAR_H + 12, 2 + r() * 5, hh);
    }
    // scuppers: dark slots at the foot, a rust bloom beneath each
    for (let x = bx0 + 130; x < bx1 - 60; x += 340) {
      if (!near(R, x, x + 30)) continue;
      c.fillStyle = '#0a0a0c';
      c.fillRect(x, PVY - 9, 26, 7);
    }
  });
  R.surface((c) => c.rect(RX0 - 64 + PVX, PVY - PAR_H + 12, x1 - x0, PAR_H - 12), 'plaster', { scale: 1.6, seed: 12, alpha: 0.6 });
  // the end walls: a left one with its inner face visible; a right one showing its top and cap
  R.cast((c) => {
    for (const [ex, left] of [[RX0 - 64, true], [RX1, false]]) {
      extrudeRect(c, ex, -PAR_H, 64, PAR_H, PD, { color: '#73706a', topK: 1.1, sideK: 0.62 });
      c.fillStyle = C.wall;
      c.fillRect(ex, -PAR_H, 64, PAR_H);
      c.fillStyle = '#7b776e';
      c.fillRect(ex - 3, -PAR_H - 3, 70, 12);
      c.fillStyle = 'rgba(235,230,210,0.22)';
      c.fillRect(ex - 3, -PAR_H - 3, 70, 2);
      // chipped corner
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(ex + (left ? 0 : 40), -PAR_H + 12, 24, PAR_H - 12);
    }
  });
  R.surface((c) => { c.rect(RX0 - 64, -PAR_H, 64, PAR_H); c.rect(RX1, -PAR_H, 64, PAR_H); }, 'plaster', { scale: 1.4, seed: 15, alpha: 0.6 });
  // rebar stubs standing out of the right-hand parapet: a floor that was never built
  R.cast((c) => {
    c.strokeStyle = '#2a211b';
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const bx = RX1 + 10 + i * 14;
      c.beginPath();
      c.moveTo(bx, -PAR_H - 2);
      c.lineTo(bx + (i % 2 ? 3 : -2), -PAR_H - 46 - (i % 3) * 14);
      c.lineTo(bx + (i % 2 ? 11 : 6), -PAR_H - 58 - (i % 3) * 14);
      c.stroke();
    }
    c.strokeStyle = 'rgba(190,150,110,0.25)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(RX1 + 10, -PAR_H - 4);
    c.lineTo(RX1 + 8, -PAR_H - 46);
    c.stroke();
  });
}

// (the time of the frame being drawn: for the few movements inside static helpers)
let T_NOW = 0;

// The stair-head hut, its door at the left end.
function hut(R) {
  const x = RX0 + 150;
  const w = 330;
  const h = 238;
  R.cast((c) => {
    extrudeRect(c, x, -h, w, h, 70, { color: '#615e56', topK: 1.1, sideK: 0.58 });
    c.fillStyle = C.hut;
    c.fillRect(x, -h, w, h);
    // the roof slab overhangs, with a drip edge and its own thickness
    extrudeRect(c, x - 16, -h - 20, w + 32, 20, 80, { color: '#6c6860', topK: 1.1, sideK: 0.6 });
    c.fillStyle = '#6c6860';
    c.fillRect(x - 16, -h - 20, w + 32, 20);
    c.fillStyle = 'rgba(235,230,210,0.22)';
    c.fillRect(x - 16, -h - 20, w + 32, 2);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x - 16, -h - 4, w + 32, 4);
    // blockwork: courses of rendered concrete block showing through the render
    c.fillStyle = 'rgba(0,0,0,0.1)';
    for (let yy = -h + 22; yy < 0; yy += 22) c.fillRect(x, yy, w, 1);
    // water stains down from the slab
    const r = rng(310);
    for (let i = 0; i < 9; i++) {
      const sx = x + 14 + r() * (w - 28);
      const hh = 24 + r() * 90;
      const g2 = c.createLinearGradient(0, -h, 0, -h + hh);
      g2.addColorStop(0, 'rgba(8,8,8,0.35)');
      g2.addColorStop(1, 'rgba(8,8,8,0)');
      c.fillStyle = g2;
      c.fillRect(sx, -h, 3 + r() * 8, hh);
    }
    // the base: dirt splash
    const g3 = c.createLinearGradient(0, -34, 0, 0);
    g3.addColorStop(0, 'rgba(0,0,0,0)');
    g3.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = g3;
    c.fillRect(x, -34, w, 34);
    // a vent grille high up, a conduit and a meter box
    c.fillStyle = '#17191c';
    c.fillRect(x + w - 80, -h + 36, 36, 22);
    c.fillStyle = 'rgba(160,160,150,0.25)';
    for (let i = 0; i < 6; i++) c.fillRect(x + w - 78, -h + 39 + i * 3.2, 32, 1);
    c.fillStyle = '#3a3c3c';
    c.fillRect(x + w - 150, -140, 28, 40);
    c.strokeStyle = '#26262a';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + w - 136, -140);
    c.lineTo(x + w - 136, -h - 6);
    c.stroke();
  });
  R.surface((c) => c.rect(x, -h, w, h), 'concrete', { scale: 1.3, seed: 21, alpha: 0.55 });
  // the door, at the left end: dark doorway, its leaf swung out against the wall
  const [dx] = HUT_DOOR;
  R.cast((c) => {
    // a door a man walks through: 92 wide, 205 tall
    c.fillStyle = '#22201d';
    c.fillRect(dx - 52, -212, 104, 212);
    c.fillStyle = '#04050a';
    c.fillRect(dx - 46, -205, 92, 205);
    // the leaf: a steel door, a faded green, open to a narrow edge-on slice against the left jamb
    c.fillStyle = '#34493f';
    c.beginPath();
    c.moveTo(dx - 46, -205);
    c.lineTo(dx - 20, -211);
    c.lineTo(dx - 20, 4);
    c.lineTo(dx - 46, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(dx - 41, -186, 16, 70);
    c.fillRect(dx - 41, -104, 16, 80);
    c.fillStyle = '#8a7e5a';
    c.fillRect(dx - 24, -104, 2.8, 12);
    // the step: a concrete sill, worn
    c.fillStyle = '#6c685f';
    c.fillRect(dx - 58, -5, 116, 5);
    // a lintel
    c.fillStyle = '#6c685f';
    c.fillRect(dx - 58, -222, 116, 10);
  });
  // a cold breath of the stairwell's own blue through the door
  R.glow((c) => {
    const gg = c.createLinearGradient(0, -205, 0, 0);
    gg.addColorStop(0, 'rgba(50,70,130,0.20)');
    gg.addColorStop(1, 'rgba(30,45,90,0.05)');
    c.fillStyle = gg;
    c.fillRect(dx - 18, -205, 64, 205);
  });
  // the aerial on the hut roof, a TV mast, bent
  R.cast((c) => {
    const mx = x + 70;
    c.strokeStyle = '#2a2a2c';
    c.lineWidth = 2.4;
    // the mast hardly moves, but its crossbars shiver a little
    const sh = Math.sin(T_NOW * 0.9) * 0.8 + Math.sin(T_NOW * 2.7) * 0.3;
    c.beginPath();
    c.moveTo(mx, -h - 20);
    c.lineTo(mx - 2 + sh * 0.4, -h - 120);
    c.stroke();
    c.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(mx - 14 + i * 1.5 + sh * (0.1 + i * 0.1), -h - 60 - i * 15);
      c.lineTo(mx + 15 - i * 1.5 + sh * (0.1 + i * 0.1), -h - 62 - i * 15);
      c.stroke();
    }
  });
}

// A black polyethylene water tank on a steel stand.
function tank(R, x, w, h, seed) {
  const legH = 46;
  R.cast((c) => {
    // the stand
    c.strokeStyle = '#2b2d30';
    c.lineWidth = 4;
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(x + 8, 0);
    c.lineTo(x + 8, -legH);
    c.moveTo(x + w - 8, 0);
    c.lineTo(x + w - 8, -legH);
    c.moveTo(x + 8, -4);
    c.lineTo(x + w - 8, -legH + 4);
    c.moveTo(x + w - 8, -4);
    c.lineTo(x + 8, -legH + 4);
    c.stroke();
    c.fillStyle = '#26282b';
    c.fillRect(x, -legH - 4, w, 6);
    // the body, extruded as a drum, black with a faint blue sheen on the lit side
    const body = (cx) => {
      cx.moveTo(x + 2, -legH);
      cx.lineTo(x + 2, -legH - h + 20);
      cx.quadraticCurveTo(x + 2, -legH - h, x + w * 0.5, -legH - h - 4);
      cx.quadraticCurveTo(x + w - 2, -legH - h, x + w - 2, -legH - h + 20);
      cx.lineTo(x + w - 2, -legH);
      cx.closePath();
    };
    extrudePath(c, body, 22, { side: 'rgba(8,9,11,1)', top: 'rgba(70,80,100,0.5)', steps: 4 });
    c.beginPath();
    body(c);
    const g2 = c.createLinearGradient(x, 0, x + w, 0);
    g2.addColorStop(0, '#15171b');
    g2.addColorStop(0.28, '#262b33');
    g2.addColorStop(0.55, '#13151a');
    g2.addColorStop(1, '#08090b');
    c.fillStyle = g2;
    c.fill();
    // the ribs of the moulding, a lid, a vent and a float-switch cable
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 1; i < 5; i++) {
      c.moveTo(x + 2, -legH - (h * i) / 5.4);
      c.lineTo(x + w - 2, -legH - (h * i) / 5.4);
    }
    c.stroke();
    c.strokeStyle = 'rgba(120,135,165,0.18)';
    c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 1; i < 5; i++) {
      c.moveTo(x + 4, -legH - (h * i) / 5.4 - 2.2);
      c.lineTo(x + w * 0.45, -legH - (h * i) / 5.4 - 2.2);
    }
    c.stroke();
    c.fillStyle = '#16181c';
    c.fillRect(x + w * 0.5 - 10, -legH - h - 10, 20, 7);
    c.fillStyle = '#26282b';
    c.fillRect(x + w * 0.5 - 2, -legH - h - 18, 4, 9);
    void seed;
  });
}

// The pipes tying the tanks to the hut, along the floor.
function pipes(R, x0, x1) {
  R.cast((c) => {
    c.strokeStyle = '#2d2f33';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x0, -34);
    c.lineTo(x1, -34);
    c.stroke();
    c.strokeStyle = 'rgba(170,180,200,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x0, -36);
    c.lineTo(x1, -36);
    c.stroke();
    // a gate valve with a red wheel
    const vx = (x0 + x1) / 2;
    c.fillStyle = '#26282b';
    c.fillRect(vx - 6, -42, 12, 16);
    c.fillStyle = '#6b2220';
    c.fillRect(vx - 9, -50, 18, 4);
    c.fillRect(vx - 1, -50, 2, 10);
  });
}

function solar(R, x) {
  R.cast((c) => {
    // the frame
    c.strokeStyle = '#34363a';
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(x + 6, 0);
    c.lineTo(x + 6, -40);
    c.moveTo(x + 112, 0);
    c.lineTo(x + 112, -100);
    c.moveTo(x + 6, -12);
    c.lineTo(x + 112, -50);
    c.stroke();
    // the panel: a tilted glass slab on edge, with its depth
    const pts = [[x, -38], [x + 118, -102], [x + 118, -112], [x, -48]];
    extrudePoly(c, pts, 34, { color: '#2a3340', topK: 1.5, sideK: 0.7 });
    c.fillStyle = '#1e2733';
    c.beginPath();
    c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(150,175,220,0.4)';
    c.beginPath();
    c.moveTo(x + 2, -50);
    c.lineTo(x + 116, -113);
    c.lineTo(x + 116, -111);
    c.lineTo(x + 2, -48);
    c.fill();
    // the horizontal storage cylinder, on top at the back, its end cap
    c.fillStyle = '#7e8590';
    c.beginPath();
    c.roundRect(x + 36, -166, 96, 38, 17);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.beginPath();
    c.roundRect(x + 36, -148, 96, 20, [0, 0, 17, 17]);
    c.fill();
    c.fillStyle = 'rgba(235,240,255,0.3)';
    c.fillRect(x + 48, -163, 70, 2.4);
    c.strokeStyle = '#34363a';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 62, -128);
    c.lineTo(x + 62, -78);
    c.moveTo(x + 104, -128);
    c.lineTo(x + 104, -104);
    c.stroke();
  });
}

function dish(R, x) {
  R.cast((c) => {
    // the pole and its bracket
    c.strokeStyle = '#2b2d30';
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, -96);
    c.stroke();
    c.fillStyle = '#26282b';
    c.fillRect(x - 12, -4, 24, 4);
    c.save();
    c.translate(x, -98);
    c.rotate(-0.95);
    // the dish itself, side on: a shallow dark bowl, its rim catching light
    const bowl = (cx) => {
      cx.moveTo(-34, 0);
      cx.quadraticCurveTo(0, -22, 34, 0);
      cx.quadraticCurveTo(0, -9, -34, 0);
      cx.closePath();
    };
    extrudePath(c, bowl, 8, { side: 'rgba(40,44,50,1)', steps: 3 });
    c.beginPath();
    bowl(c);
    c.fillStyle = '#a2a8ae';
    c.fill();
    c.strokeStyle = 'rgba(240,244,250,0.5)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(-34, 0);
    c.quadraticCurveTo(0, -22, 34, 0);
    c.stroke();
    // the arm and the receiver
    c.strokeStyle = '#2b2d30';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -4);
    c.lineTo(8, -40);
    c.stroke();
    c.fillStyle = '#26282b';
    c.fillRect(4, -46, 8, 8);
    c.restore();
    // a cable, and a second, smaller dish on the end of it, rusting
    c.strokeStyle = '#18191b';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x + 4, -96);
    c.quadraticCurveTo(x + 24, -30, x + 62, -10);
    c.stroke();
  });
}

// The washing line: two poles, a sagging wire, and clothes that have been out a long time.
function washing(R, x0, x1, t) {
  const hh = 168;
  R.cast((c) => {
    c.strokeStyle = '#2d2f33';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x0, 0);
    c.lineTo(x0, -hh);
    c.moveTo(x1, 0);
    c.lineTo(x1, -hh + 4);
    c.stroke();
    // bases: a tyre and a cone of concrete
    c.fillStyle = '#17181a';
    c.beginPath();
    c.ellipse(x0, -6, 20, 7, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#4a4741';
    c.beginPath();
    c.moveTo(x1 - 16, 0);
    c.lineTo(x1 - 6, -14);
    c.lineTo(x1 + 6, -14);
    c.lineTo(x1 + 16, 0);
    c.fill();
  });
  // the wire, and the clothes, which the wind moves
  const wireY = (u) => -hh + 3 + Math.sin(u * Math.PI) * 14 - 4 * u;
  R.paint((c) => {
    c.strokeStyle = 'rgba(190,190,180,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const x = lerp(x0, x1, u);
      if (i === 0) c.moveTo(x, wireY(u));
      else c.lineTo(x, wireY(u));
    }
    c.stroke();
    const items = [
      { u: 0.07, w: 34, h: 52, col: '#7f8a98', kind: 'shirt' },
      { u: 0.2, w: 24, h: 38, col: '#94806e', kind: 'dress' },
      { u: 0.31, w: 30, h: 58, col: '#4d5a50', kind: 'trousers' },
      { u: 0.43, w: 50, h: 70, col: '#a6a39a', kind: 'sheet' },
      { u: 0.62, w: 26, h: 42, col: '#6c5a63', kind: 'dress' },
      { u: 0.73, w: 30, h: 50, col: '#8793a0', kind: 'shirt' },
      { u: 0.86, w: 8, h: 18, col: '#b2a186', kind: 'sock' },
      { u: 0.91, w: 8, h: 18, col: '#b2a186', kind: 'sock' },
    ];
    items.forEach((it, i) => {
      const x = lerp(x0, x1, it.u);
      const y = wireY(it.u);
      const sw = Math.sin(t * 1.5 + i * 1.3) * 3.6 + Math.sin(t * 0.6 + i) * 1.8;
      const gust = 0.6 + 0.4 * Math.sin(t * 0.37 + i * 0.5);
      c.save();
      c.translate(x, y);
      c.fillStyle = it.col;
      const w = it.w;
      const h = it.h;
      const sk = sw * gust;
      c.beginPath();
      if (it.kind === 'shirt') {
        c.moveTo(-w / 2 - 8, 6);
        c.lineTo(-w / 2, 0);
        c.lineTo(w / 2, 0);
        c.lineTo(w / 2 + 8, 6 + sk);
        c.lineTo(w / 2 + 3, 16 + sk);
        c.lineTo(w / 2 - 2, 14);
        c.lineTo(w / 2 + sk * 0.6, h);
        c.lineTo(-w / 2 + sk * 0.6, h);
        c.lineTo(-w / 2 + 2, 14);
        c.lineTo(-w / 2 - 3, 16 - sk);
        c.closePath();
      } else if (it.kind === 'trousers') {
        c.moveTo(-w / 2, 0);
        c.lineTo(w / 2, 0);
        c.lineTo(w / 2 + sk, h);
        c.lineTo(2 + sk, h);
        c.lineTo(0, 22);
        c.lineTo(-2 + sk, h);
        c.lineTo(-w / 2 + sk, h);
        c.closePath();
      } else if (it.kind === 'dress') {
        c.moveTo(-5, 0);
        c.lineTo(5, 0);
        c.lineTo(6, 12);
        c.lineTo(w / 2 + sk, h);
        c.quadraticCurveTo(sk * 1.2, h + 4, -w / 2 + sk, h);
        c.lineTo(-6, 12);
        c.closePath();
      } else if (it.kind === 'sheet') {
        c.moveTo(-w / 2, 0);
        c.lineTo(w / 2, 0);
        c.lineTo(w / 2 + sk * 1.4, h * 0.6);
        c.quadraticCurveTo(w / 4 + sk * 1.6, h + 4, w / 8 + sk, h);
        c.quadraticCurveTo(-w / 4 + sk, h - 8, -w / 2 + sk * 1.2, h * 0.9);
        c.closePath();
      } else {
        c.rect(-w / 2 + sk * 0.4, 0, w, h);
      }
      c.fill();
      // the folds: a lighter edge and a seam
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 2);
      c.lineTo(sk * 0.5, h * 0.9);
      c.stroke();
      // a peg
      c.fillStyle = '#b8b0a0';
      c.fillRect(-w * 0.3, -3, 3, 7);
      c.fillRect(w * 0.3, -3, 3, 7);
      c.restore();
    });
  });
}

// Little things: a gas cylinder, a heap of block, paint tins, a cracked plastic chair.
function clutterRoof(R) {
  R.cast((c) => {
    // a gas cylinder against the hut
    const gx = RX0 + 520;
    c.fillStyle = '#6a4a2a';
    c.beginPath();
    c.roundRect(gx - 12, -62, 24, 62, [10, 10, 2, 2]);
    c.fill();
    c.fillStyle = '#2a1e12';
    c.fillRect(gx - 12, -22, 24, 5);
    c.fillStyle = '#3a3a3a';
    c.fillRect(gx - 4, -68, 8, 7);
    c.fillStyle = 'rgba(235,225,200,0.2)';
    c.fillRect(gx - 8, -56, 3, 40);
    // a stack of concrete block
    const bx = RX0 + 1180;
    c.fillStyle = '#6a665d';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3 - i; j++) {
        c.fillRect(bx + j * 30 + i * 15, -16 - i * 16, 28, 14);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(bx + j * 30 + i * 15, -4 - i * 16, 28, 2);
        c.fillStyle = '#6a665d';
      }
    }
    // an old plastic chair, one leg short, tipped
    const cx = RX0 + 1340;
    c.strokeStyle = '#d0cfc6';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx - 14, 0);
    c.lineTo(cx - 12, -34);
    c.lineTo(cx + 14, -34);
    c.moveTo(cx + 14, -34);
    c.lineTo(cx + 15, 0);
    c.moveTo(cx - 12, -34);
    c.lineTo(cx - 18, -72);
    c.stroke();
    c.fillStyle = '#c8c7be';
    c.fillRect(cx - 17, -40, 34, 6);
    c.fillStyle = '#c8c7be';
    c.beginPath();
    c.moveTo(cx - 20, -76);
    c.lineTo(cx - 6, -78);
    c.lineTo(cx - 8, -44);
    c.lineTo(cx - 16, -44);
    c.fill();
  });
}

// A thread of smoke from (x, y): a dozen soft puffs drifting up the same curve.
function smokeThread(c, x, y, t, dawn, seed) {
  const lean = 16 * (1 - dawn) + 2;
  const tint = dawn > 0.4 ? [118, 134, 168] : [96, 108, 150];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const age = (t * 0.07 + i / n + Math.abs(seed) * 0.0123) % 1;
    const wob = Math.sin(age * 6 + seed + t * 0.3) * 8 * age * (1 - dawn * 0.7);
    const a = Math.sin(Math.min(1, age * 5) * 1.5708) * (1 - age) * (0.34 + 0.14 * dawn);
    c.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${a})`;
    c.beginPath();
    c.arc(x + wob + lean * age * age, y - age * 190, 2.5 + age * 13, 0, TAU);
    c.fill();
  }
}

// Pigeons: at dawn they come to the parapet, sit, bob, hop; now and then a few cross.
function birds(R, t, dawn) {
  const k = smooth(0.32, 0.56, dawn);
  if (k < 0.02) return;
  const perch = [RX0 + 520, RX0 + 548, RX0 + 1100, RX0 + 1128, RX0 + 1630];
  const cy = PVY - PAR_H - 2; // the coping of the back parapet
  R.cast((c) => {
    c.globalAlpha = k;
    perch.forEach((bx, i) => {
      if (!near(R, bx, bx + 30)) return;
      // every few seconds one hops a hand's breadth along, flaps once, settles
      const cyc = 6.5 + i * 1.7;
      const ph = ((t + i * 2.9) % cyc) / cyc;
      const hop = ph > 0.9 ? Math.sin(((ph - 0.9) / 0.1) * Math.PI) : 0;
      const x = bx + (ph > 0.95 ? 9 : 0) * (i % 2 ? 1 : -1);
      const y = cy - hop * 12;
      const bob = Math.max(0, Math.sin(t * 2.3 + i * 1.9)) * 1.2;
      const dir = i % 2 ? 1 : -1;
      c.fillStyle = i % 3 ? '#3a3c46' : '#4a4c58';
      c.beginPath();
      c.ellipse(x, y - 8, 9, 6.5, -0.15 * dir, 0, TAU);
      c.fill();
      c.beginPath();
      c.arc(x + dir * 8, y - 14 - bob, 3.6, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(x + dir * 11, y - 14 - bob);
      c.lineTo(x + dir * 15, y - 13 - bob);
      c.lineTo(x + dir * 11, y - 12 - bob);
      c.fill();
      c.beginPath();
      c.moveTo(x - dir * 8, y - 9);
      c.lineTo(x - dir * 17, y - 6 - hop * 6);
      c.lineTo(x - dir * 8, y - 5);
      c.fill();
      if (hop > 0.2) {
        const fl = Math.sin(t * 30) * 5;
        c.beginPath();
        c.moveTo(x - 2, y - 11);
        c.quadraticCurveTo(x - 8, y - 18 - fl, x - 14, y - 12 + fl * 0.4);
        c.quadraticCurveTo(x - 8, y - 12, x - 2, y - 9);
        c.fill();
      }
    });
    c.globalAlpha = 1;
  });
  // a small flock crossing the whole sky, high, every half minute or so
  const span = RX1 - RX0 + 1400;
  const u = ((t * 85) % (span * 1.9)) - 700;
  if (u > span) return;
  R.paint((c) => {
    c.globalAlpha = k * 0.85;
    c.strokeStyle = '#23252e';
    c.lineWidth = 1.7;
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const bx = RX0 - 400 + u - i * 34 + (i % 2) * 14;
      const by = -330 - i * 9 - (i % 3) * 14 + Math.sin(t * 0.8 + i) * 8;
      const fl = Math.sin(t * 11 + i * 1.7) * 6;
      c.beginPath();
      c.moveTo(bx - 10, by - fl * 0.7);
      c.quadraticCurveTo(bx - 4, by - fl - 4, bx, by);
      c.quadraticCurveTo(bx + 4, by - fl - 4, bx + 10, by - fl * 0.7);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
}

// The neighbouring roofs below and beside us, dark and low, seen past the ends of our roof.
function neighbours(R, t = 0, dawn = 0) {
  const d = 0.58;
  R.layer(d);
  R.paint((c) => {
    c.save();
    c.translate(RC * d, -260 * d);
    const r = rng(808);
    let u = -1700;
    while (u < 1700) {
      const w = 130 + r() * 150;
      const top = 150 + r() * 80;
      const left = smooth(-100, -900, u);
      const col = left > 0.5 ? '#1a1b21' : '#16171c';
      c.fillStyle = col;
      c.fillRect(u, top, w, 400);
      c.fillStyle = '#2a2b31';
      c.fillRect(u - 3, top - 4, w + 6, 6);
      // a parapet, a tank, a dish or a line of laundry
      const k = r();
      if (k < 0.35) {
        c.fillStyle = '#0c0d10';
        c.beginPath();
        c.roundRect(u + w * 0.3, top - 34, 30, 32, [10, 10, 0, 0]);
        c.fill();
      } else if (k < 0.55) {
        c.strokeStyle = '#0c0d10';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(u + w * 0.6, top - 4);
        c.lineTo(u + w * 0.6, top - 30);
        c.stroke();
        c.beginPath();
        c.arc(u + w * 0.6 + 6, top - 32, 9, 2.3, 5.4);
        c.stroke();
      } else if (k < 0.7) {
        c.fillStyle = '#23242a';
        c.fillRect(u + w * 0.2, top - 30, w * 0.3, 28);
      }
      // windows, all dark but for a rare candle (74 x 107 would be near: these are far, so small)
      c.fillStyle = '#0a0b0e';
      for (let wx = u + 14; wx < u + w - 20; wx += 34) for (let wy = top + 24; wy < top + 150; wy += 40) c.fillRect(wx, wy, 14, 20);
      // a stove pipe on some, and its smoke: thin and moon-silvered at night, grey-blue and straight at dawn
      if ((Math.abs(Math.floor(u)) * 7919) % 100 < 22) {
        c.fillStyle = '#0c0d10';
        c.fillRect(u + w * 0.78, top - 36, 4, 34);
        smokeThread(c, u + w * 0.78 + 2, top - 36, t, dawn, u);
      }
      u += w + 14 + r() * 40;
    }
    c.restore();
  });
  R.layer(1);
}

// ---- the roof, whole

export function drawRoof(R, g, { dawn = 0, t = g?.time || 0 } = {}) {
  dawn = clamp(dawn);
  farView(R, dawn, t);
  R.layer(1);
  if (!near(R, RX0, RX1)) return;

  // a shaped shadow, long and thin, from the low moon in the west
  const SHEAR = -1.5 + dawn * 2.4;
  const SQ = 0.13;

  T_NOW = t;
  neighbours(R, t, dawn);
  parapets(R);
  slab(R);
  hut(R);
  const tankX = RX0 + 640;
  tank(R, tankX, 98, 128, 1);
  tank(R, tankX + 122, 98, 128, 2);
  pipes(R, tankX + 98, tankX + 122);
  solar(R, RX0 + 940);
  dish(R, RX0 + 1160 + 50);
  washing(R, RX0 + 1330, RX0 + 1560, t);
  clutterRoof(R);
  birds(R, t, dawn);

  // shadows on the floor: the moon from the west, low, throws them long to the right; the dawn turns them
  const hutX = RX0 + 150;
  R.shadow((c) => {
    c.fillStyle = '#000';
    c.fillRect(hutX, -238, 330, 238);
    c.fillRect(tankX, -174, 98, 174);
    c.fillRect(tankX + 122, -174, 98, 174);
    c.fillRect(RX0 + 940, -166, 130, 150);
    c.fillRect(RX0 + 1208, -140, 6, 140);
  }, RX0 + 700, 0, SHEAR, SQ);

  // the light itself leaking from the doorway
  g.act?.drawProps?.(R, g);
  R.layer(1);
}

// The look: night, with the moon low in the west and Damascus's glow warming that side; towards
// dawn, the moon fades and a cool grey-blue light grows from the right.
export function roofLook(g, dawn = 0) {
  dawn = clamp(dawn);
  const mo = 1 - 0.85 * smooth(0.2, 1, dawn);
  const lights = [
    // the moon: cold and silvery, low in the west, raking
    { uv: [-0.45, 0.36], color: [0.74, 0.8, 1.0], intensity: 0.5 * mo, radius: 0, project: 0.9, soft: 0.0035, rim: 1.0 },
    // Damascus: a faint warm edge on whatever faces it
    { uv: [-0.7, 0.62], color: [1, 0.64, 0.34], intensity: 0.15 * (1 - 0.7 * dawn), radius: 0, rim: 0.45 },
    // the dawn: cool grey-blue from the right, then pale
    {
      uv: [1.6, 0.58],
      color: mixc([0.42, 0.55, 0.95], dawn > 0.8 ? [0.92, 0.86, 0.82] : [0.66, 0.76, 0.96], smooth(0.5, 1, dawn)),
      intensity: 0.04 + 0.78 * Math.pow(dawn, 1.25),
      radius: 0,
      rim: 0.9,
    },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  const amb = mixc([0.082, 0.098, 0.15], [0.21, 0.24, 0.32], Math.pow(dawn, 1.1));
  return {
    ambient: amb,
    lights: lights.slice(0, 4),
    groundShadow: 0.8,
    bloom: 0.95 - 0.25 * dawn,
    exposure: 1.0 + 0.04 * dawn,
    grain: 0.065,
    grade: {
      sat: 0.62 + 0.1 * dawn,
      contrast: 1.1,
      lift: 0.01,
      tint: [0.93, 0.98, 1.07],
      shadows: [0.84, 0.94, 1.15],
      highs: [1.06 + 0.04 * dawn, 1.0, 0.94 - 0.04 * dawn],
    },
    // a little mist lying on the roof, thickening with the cold of the hour
    fog: { density: 0.05 + 0.1 * dawn, height: 70, color: mixc([0.2, 0.25, 0.38], [0.5, 0.56, 0.68], dawn) },
    time: g.time,
  };
}
