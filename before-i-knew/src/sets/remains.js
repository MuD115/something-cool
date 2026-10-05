// The endings' rooms and the photographs of the last night.
//
//   drawDawnClassroom(R, g, { k, t, date, lesson })   Ending 4: Ahmad's classroom, 4:45–5:15
//   drawRubbleRoom(R, g, { k, t })                    Ending 5: the ruined living room, 4:30–5:05
//   drawPhoto(c, i, w, h, t)                          Ending 1: the camera's eleven photographs
//   drawCameraScreen(c, x, y, w, h, i, t, opts)       the camera's back, for the review overlay
//
// Each room has a matching look (dawnClassroomLook, rubbleLook). Everything
// is in world units, ground at y = 0, up is negative, a man 170 tall.
//
// The light here is the first honest daylight of the game: no torch, no
// lighter, no fire. Gold from a window or an opening; the rest soft shade.

import { lerp, clamp, rng, smooth, mixc, hex } from '../engine/util.js';
import { extrudePoly, extrudeRect } from './depth.js';
import { END, SCHOOL, RUBBLE } from '../story/act4-map.js';
import { dawnSky } from './dawn.js';

const TAU = Math.PI * 2;
const AR = '"Aref Ruqaa", "Noto Naskh Arabic", "IBM Plex Sans Arabic", "FreeSerif", serif';
const NASKH = '"Noto Naskh Arabic", "IBM Plex Sans Arabic", "Aref Ruqaa", "FreeSerif", serif';
const SANS = '"IBM Plex Sans Arabic", "Noto Naskh Arabic", "FreeSans", sans-serif';

// ------------------------------------------------------------- helpers --

const hx2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
const mh = (a, b, k) => {
  const A = hex(a);
  const B = hex(b);
  return '#' + hx2(lerp(A[0], B[0], k)) + hx2(lerp(A[1], B[1], k)) + hx2(lerp(A[2], B[2], k));
};
const shadeHex = (a, k) => {
  const A = hex(a);
  return '#' + hx2(A[0] * k) + hx2(A[1] * k) + hx2(A[2] * k);
};
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Static detail is painted once into a canvas and placed every frame.
const BAKED = new Map();
function bake(key, w, h, k, draw) {
  let cv = BAKED.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(w * k);
  cv.height = Math.ceil(h * k);
  const c = cv.getContext('2d');
  c.scale(k, k);
  draw(c, w, h);
  BAKED.set(key, cv);
  return cv;
}

// Run `fn` in a set's local space (x measured from its centre).
const local = (R, cx, how, fn) =>
  R[how]((c) => {
    c.save();
    c.translate(cx, 0);
    fn(c);
    c.restore();
  });

const poly = (c, pts) => {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
};

// Convex hull (monotone chain), for the shaft of light.
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

// Chalk-ish text: a hair of doubling so it never looks printed.
function chalkText(c, str, x, y, { font, size, color = 'rgba(246,244,232,0.94)', rot = 0, align = 'right', wob = 0.4 } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.font = `${size}px ${font}`;
  c.textAlign = align;
  c.direction = 'rtl';
  c.fillStyle = color;
  c.fillText(str, 0, 0);
  c.globalAlpha = 0.45;
  c.fillText(str, wob, wob * 0.6);
  c.restore();
}

const fontsReady = () => {
  try {
    return !document.fonts || document.fonts.check('16px "Aref Ruqaa"');
  } catch (e) {
    return true;
  }
};

// =====================================================================
// 1. THE DAWN CLASSROOM
// =====================================================================

const SX = END.school[0];
const RM = { x0: -470, x1: 640, ceil: -270, slab: -310, street: -204, steps: 12, run: 27, rise: 17 };
const STAIR_TOP = RM.x0 - RM.steps * RM.run; // where the pavement ends and the steps begin

// The height of the walkable ground at world x: 0 in the room, rising up
// the steps to the pavement on the left (for the story to walk Sami down).
export function stepY(x) {
  const a = x - SX;
  if (a >= RM.x0) return 0;
  if (a <= STAIR_TOP) return -RM.steps * RM.rise;
  return -Math.min(RM.steps, Math.ceil((RM.x0 - a) / RM.run)) * RM.rise;
}

export const BOARD_RECT = { x: SCHOOL.board - 135, y: -250, w: 270, h: 130 };

// Twelve child-sized chairs in two arcs facing the board: [world x, seat
// height]. The first six are the near arc, from the board's end backwards (the
// front row's first chair is [0]); the next six are the far arc.
const NEAR = [102, 38, -26, -90, -154, -218];
const FAR = [70, 6, -58, -122, -186, -250];
export const CHAIRS = [...NEAR.map((a) => [SX + a, -30]), ...FAR.map((a) => [SX + a, -36])];
// which are knocked a little askew (indices into CHAIRS): shoved back, turned
const ASKEW = { 1: [0.09, 7], 4: [-0.07, -8], 8: [0.1, 6], 11: [-0.08, 9] };

// How far the gold rectangle has crept toward the desk: 30 → 292.
const patchAt = (k) => lerp(24, 284, smooth(0, 1, clamp(k)) * 0.35 + clamp(k) * 0.65);

// ----- the baked shell: the building mass, the room, the street cut-away

const CW = 2300;
const CH = 900;
const C0 = [-1100, -760];

const WALL = { wall: '#d4bb90', dado: '#6f9a88', dadoCap: '#54806f', skirt: '#6d5d49' };

function stairProfile() {
  const pts = [[STAIR_TOP, RM.street]];
  for (let i = RM.steps; i >= 1; i--) {
    const x0 = RM.x0 - i * RM.run;
    pts.push([x0, -i * RM.rise], [x0 + RM.run, -i * RM.rise]);
  }
  // the last riser meets the floor at the door
  pts.push([RM.x0, 0]);
  return pts;
}

function classShell() {
  return bake('rm-class-shell', CW, CH, 1.2, (c) => {
    c.translate(-C0[0], -C0[1]);
    const r = rng(41);
    // ---- the building: concrete mass everywhere but the open street cut
    const stairs = stairProfile();
    const mass = [[-1100, 160], [-1100, RM.street], [STAIR_TOP, RM.street], ...stairs.slice(1), [RM.x0, 0], [RM.x0, -760], [1200, -760], [1200, 160]];
    c.fillStyle = '#8d857a';
    poly(c, mass);
    c.fill();
    // the pavement's top edge, slab joints and a kerb
    c.fillStyle = '#a89e8e';
    c.fillRect(-1100, RM.street, STAIR_TOP + 1100 + 2, 14);
    c.fillStyle = 'rgba(40,32,24,0.28)';
    for (let x = -1100; x < STAIR_TOP; x += 46) c.fillRect(x, RM.street, 1.4, 14);
    c.fillStyle = 'rgba(255,240,205,0.35)';
    c.fillRect(-1100, RM.street, STAIR_TOP + 1100, 2);
    // dressed stone courses in the retaining wall under the street
    c.save();
    c.beginPath();
    c.rect(-1100, RM.street + 14, STAIR_TOP + 1100, 200);
    c.clip();
    for (let row = 0; row < 8; row++) {
      const y0 = RM.street + 14 + row * 26;
      for (let bx = -1100 - (row % 2) * 30; bx < STAIR_TOP; bx += 60) {
        const v = (r() - 0.5) * 0.14;
        c.fillStyle = v > 0 ? `rgba(255,236,200,${v})` : `rgba(30,22,16,${-v})`;
        c.fillRect(bx + 1, y0 + 1, 58, 24);
      }
      c.fillStyle = 'rgba(30,24,18,0.3)';
      c.fillRect(-1100, y0 + 25, STAIR_TOP + 1100, 1.6);
    }
    c.restore();
    // earth and old foundations under the street
    const eg = c.createLinearGradient(0, RM.street, 0, 160);
    eg.addColorStop(0, 'rgba(60,50,40,0.12)');
    eg.addColorStop(1, 'rgba(30,26,22,0.5)');
    c.fillStyle = eg;
    c.fillRect(-1100, RM.street + 14, STAIR_TOP + 1100, 160);

    // ---- the building's front above the room: the ground floor and its storeys
    const fx0 = RM.x0;
    c.fillStyle = '#a79b88';
    c.fillRect(fx0, -760, 1670, 450);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,238,200,0.07)' : 'rgba(60,48,36,0.08)';
      c.beginPath();
      c.ellipse(fx0 + r() * 1100, -760 + r() * 440, 20 + r() * 70, 10 + r() * 30, 0, 0, TAU);
      c.fill();
    }
    // storeys: shuttered windows, one with a shell hole through to the sky beyond
    for (let fl = 0; fl < 2; fl++) {
      for (let wx = fx0 + 70; wx < 1100; wx += 150) {
        const wy = -430 - fl * 150;
        c.fillStyle = '#4e4840';
        c.fillRect(wx - 3, wy - 3, 58, 78);
        c.fillStyle = fl === 1 && wx > 380 && wx < 470 ? '#c9a888' : '#2c2823';
        c.fillRect(wx, wy, 52, 72);
        c.fillStyle = 'rgba(200,185,160,0.5)';
        c.fillRect(wx - 5, wy + 72, 62, 5);
        if (r() < 0.5) {
          c.fillStyle = '#5d5a50';
          c.fillRect(wx + 4, wy + 2, 22, 68);
        }
      }
    }
    // a ragged shell hole above the left, the edge freshly pale
    c.fillStyle = '#d9a98a';
    c.beginPath();
    c.moveTo(-300, -590);
    c.lineTo(-262, -626);
    c.lineTo(-228, -604);
    c.lineTo(-206, -640);
    c.lineTo(-180, -596);
    c.lineTo(-200, -560);
    c.lineTo(-262, -548);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(30,24,18,0.5)';
    c.lineWidth = 2;
    c.stroke();
    // the cornice over the room's ceiling slab
    c.fillStyle = '#bfb39e';
    c.fillRect(fx0 - 6, RM.slab - 14, 1130, 14);

    // ---- the room: back wall in warm plaster, the green dado, skirting
    const x0 = RM.x0;
    const x1 = RM.x1;
    c.fillStyle = WALL.wall;
    c.fillRect(x0, RM.ceil, x1 - x0, -RM.ceil);
    for (let i = 0; i < 80; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,236,190,0.16)' : 'rgba(150,100,60,0.1)';
      c.beginPath();
      c.ellipse(x0 + r() * (x1 - x0), RM.ceil + r() * 160, 30 + r() * 90, 14 + r() * 36, 0, 0, TAU);
      c.fill();
    }
    c.fillStyle = WALL.dado;
    c.fillRect(x0, -108, x1 - x0, 108);
    c.fillStyle = WALL.dadoCap;
    c.fillRect(x0, -111, x1 - x0, 4);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(x0, -111, x1 - x0, 1.2);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      c.fillRect(x0 + r() * (x1 - x0), -104 + r() * 100, 8 + r() * 26, 2 + r() * 5);
    }
    c.fillStyle = WALL.skirt;
    c.fillRect(x0, -12, x1 - x0, 12);
    // damp at the foot and a stain under the pipe
    const dmp = c.createLinearGradient(0, -150, 0, 0);
    dmp.addColorStop(0, 'rgba(40,36,30,0)');
    dmp.addColorStop(1, 'rgba(40,36,30,0.12)');
    c.fillStyle = dmp;
    c.fillRect(x0, -150, x1 - x0, 150);
    const st = c.createLinearGradient(0, RM.ceil, 0, RM.ceil + 120);
    st.addColorStop(0, 'rgba(70,56,40,0.22)');
    st.addColorStop(1, 'rgba(70,56,40,0)');
    c.fillStyle = st;
    c.beginPath();
    c.ellipse(-330, RM.ceil + 4, 26, 120, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(30,22,16,0.16)';
    c.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      let cx = x0 + 120 + r() * (x1 - x0 - 240);
      let cy = RM.ceil + r() * 30;
      c.beginPath();
      c.moveTo(cx, cy);
      for (let q = 0; q < 6; q++) {
        cx += (r() - 0.5) * 20;
        cy += 12 + r() * 20;
        c.lineTo(cx, cy);
      }
      c.stroke();
    }
    // ceiling slab and its beam
    c.fillStyle = '#8f8372';
    c.fillRect(x0, RM.slab, x1 - x0, 40);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(x0, RM.slab, x1 - x0, 3);
    c.fillStyle = '#a89a82';
    c.fillRect(x0, RM.ceil, x1 - x0, 20);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x0, RM.ceil + 20, x1 - x0, 5);
    // the floor: grey cement, tiles of two tones, falling to shade toward us
    const fl = c.createLinearGradient(0, 0, 0, 100);
    fl.addColorStop(0, '#9a958d');
    fl.addColorStop(1, '#6e6a64');
    c.fillStyle = fl;
    c.fillRect(x0, 0, x1 - x0 + 460, 100);
    for (let tx = x0; tx < x1 + 400; tx += 40) {
      const odd = (Math.round((tx - x0) / 40) & 1) === 0;
      for (let row = 0; row < 5; row++) {
        if (((row & 1) === 0) === odd) {
          c.fillStyle = 'rgba(235,228,214,0.1)';
          c.beginPath();
          c.moveTo(tx + 20, row * 20 + 3);
          c.lineTo(tx + 33, row * 20 + 10);
          c.lineTo(tx + 20, row * 20 + 17);
          c.lineTo(tx + 7, row * 20 + 10);
          c.fill();
        }
      }
    }
    c.fillStyle = 'rgba(20,16,12,0.24)';
    for (let tx = x0; tx < x1 + 400; tx += 40) c.fillRect(tx, 0, 1.2, 100);
    for (let ty = 0; ty < 100; ty += 20) c.fillRect(x0, ty, x1 - x0 + 460, 1.2);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(0,0,0,0.05)';
      c.beginPath();
      c.ellipse(x0 + r() * (x1 - x0), r() * 100, 14 + r() * 40, 3 + r() * 6, 0, 0, TAU);
      c.fill();
    }
    const fd = c.createLinearGradient(0, 0, 0, 100);
    fd.addColorStop(0, 'rgba(0,0,0,0)');
    fd.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = fd;
    c.fillRect(x0, 0, x1 - x0 + 460, 100);
    const ao = c.createLinearGradient(0, -2, 0, 22);
    ao.addColorStop(0, 'rgba(0,0,0,0.28)');
    ao.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = ao;
    c.fillRect(x0, -2, x1 - x0, 24);
    // the pipe along the ceiling: it drips from its elbow at the left
    c.fillStyle = '#6e6a62';
    c.fillRect(-330, RM.ceil + 4, x1 + 330, 8);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(-330, RM.ceil + 4, x1 + 330, 2);
    c.fillStyle = '#7e7a70';
    c.fillRect(-338, RM.ceil + 1, 14, 14);
    for (const jx of [-120, 140, 380]) {
      c.fillStyle = '#58544c';
      c.fillRect(jx, RM.ceil + 2, 7, 12);
    }
    c.fillStyle = 'rgba(150,80,40,0.45)';
    c.fillRect(-336, RM.ceil + 13, 10, 5);
    // the room's own soft shade: under the ceiling, and into the corners
    const cg = c.createLinearGradient(0, RM.ceil, 0, RM.ceil + 110);
    cg.addColorStop(0, 'rgba(40,30,30,0.3)');
    cg.addColorStop(1, 'rgba(40,30,30,0)');
    c.fillStyle = cg;
    c.fillRect(x0, RM.ceil, x1 - x0, 110);
    const lg2 = c.createLinearGradient(x0, 0, x0 + 140, 0);
    lg2.addColorStop(0, 'rgba(40,30,30,0.2)');
    lg2.addColorStop(1, 'rgba(40,30,30,0)');
    c.fillStyle = lg2;
    c.fillRect(x0, RM.ceil, 140, -RM.ceil);
    // the dark under the far end, and the end wall's mass
    const rg = c.createLinearGradient(x1 - 120, 0, x1, 0);
    rg.addColorStop(0, 'rgba(20,16,12,0)');
    rg.addColorStop(1, 'rgba(20,16,12,0.35)');
    c.fillStyle = rg;
    c.fillRect(x1 - 120, RM.ceil, 120, -RM.ceil);
    c.fillStyle = '#7b7367';
    c.fillRect(x1, -760, 600, 920);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x1, RM.ceil, 6, -RM.ceil + 100);
  });
}

// ----- the board

function chalkBoardBase() {
  return bake('rm-board', BOARD_RECT.w, BOARD_RECT.h, 3, (c, w, h) => {
    const r = rng(90);
    c.fillStyle = '#2c4a3f';
    c.fillRect(0, 0, w, h);
    const lg = c.createLinearGradient(0, 0, w, h);
    lg.addColorStop(0, 'rgba(255,255,255,0.04)');
    lg.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = lg;
    c.fillRect(0, 0, w, h);
    // years of wiped chalk, a pale cloud, and the ghost of old lessons
    for (let i = 0; i < 34; i++) {
      c.fillStyle = `rgba(232,236,226,${0.035 + r() * 0.03})`;
      c.beginPath();
      c.ellipse(r() * w, r() * h, 20 + r() * 50, 7 + r() * 14, (r() - 0.5) * 0.5, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(232,236,226,0.05)';
    c.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      const y = 14 + r() * 110;
      c.moveTo(r() * 40, y);
      c.lineTo(100 + r() * 150, y + (r() - 0.5) * 4);
      c.stroke();
    }
  });
}

// What Ahmad wrote, then Sami: both live, in chalk.
function boardWriting(c, date, lesson, t) {
  const font = fontsReady();
  // --- Ahmad's: neat, upright
  c.lineCap = 'round';
  chalkText(c, 'كتب — يكتب — كاتب', 100, 47, { font: NASKH, size: 21, align: 'center' });
  c.strokeStyle = 'rgba(246,244,232,0.8)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(14, 54);
  c.lineTo(186, 54);
  c.stroke();
  // the small table beneath: past, present, the one who does it
  c.lineWidth = 1.1;
  c.strokeStyle = 'rgba(246,244,232,0.6)';
  c.beginPath();
  c.rect(14, 62, 172, 22);
  c.moveTo(71, 62);
  c.lineTo(71, 84);
  c.moveTo(129, 62);
  c.lineTo(129, 84);
  c.stroke();
  for (const [cx, str] of [[157, 'ماضي'], [100, 'مضارع'], [43, 'فاعل']]) chalkText(c, str, cx, 78, { font: NASKH, size: 12, align: 'center', color: 'rgba(246,244,232,0.82)' });
  // the exercise: boxed, a little smaller
  c.strokeStyle = 'rgba(246,244,232,0.55)';
  c.lineWidth = 1.2;
  c.beginPath();
  if (c.roundRect) c.roundRect(14, 94, 172, 26, 5);
  else c.rect(14, 94, 172, 26);
  c.stroke();
  chalkText(c, 'اكتب جملة عن يومك.', 100, 112, { font: NASKH, size: 14, align: 'center' });
  // a little star in the corner of the box, the way he marked good sentences
  c.fillStyle = 'rgba(240,120,110,0.85)';
  star(c, 176, 103, 3.4);

  // --- Sami's: the date, upper right, stroke by stroke from the right
  const right = BOARD_RECT.w - 12;
  const words = [
    ['١٥', 0],
    ['آب', 0.01],
    ['٢٠١٤', -0.015],
  ];
  c.font = `17px ${AR}`;
  let total = 0;
  const widths = words.map(([s]) => {
    const w = c.measureText(s).width;
    total += w + 6;
    return w;
  });
  total -= 6;
  if (date > 0) {
    const edge = right - total * clamp(date);
    c.save();
    c.beginPath();
    c.rect(edge, 0, right - edge + 4, 42);
    c.clip();
    let x = right;
    words.forEach(([s, rot], i) => {
      chalkText(c, s, x, 22 + (i === 1 ? -1.2 : i === 2 ? 1.2 : 0), { font: AR, size: 17, rot: rot * 1.8, wob: 0.9 });
      x -= widths[i] + 6;
    });
    c.restore();
    // the chalk's dust, falling from the leading edge while he writes
    if (date < 0.995) {
      for (let i = 0; i < 6; i++) {
        const u = (t * 1.3 + i * 0.37) % 1;
        c.fillStyle = `rgba(250,248,238,${0.5 * (1 - u)})`;
        c.fillRect(edge + Math.sin(i * 2.1) * 3, 17 + u * 24, 1.3, 1.3);
      }
    }
    if (date > 0.995) {
      // underlined once, a little unevenly
      c.strokeStyle = 'rgba(246,244,232,0.82)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(right + 2, 29);
      c.quadraticCurveTo(right - total * 0.5, 31.5, right - total - 2, 28);
      c.stroke();
    }
  }
  // the beginning of a lesson: «اليوم:» and a line waiting to be filled
  if (lesson > 0) {
    c.font = `15px ${AR}`;
    const w1 = c.measureText('اليوم:').width;
    const lineLen = 62;
    const tot = Math.max(w1, lineLen);
    const edge = right - tot * clamp(lesson);
    c.save();
    c.beginPath();
    c.rect(edge - 2, 44, right - edge + 6, 70);
    c.clip();
    chalkText(c, 'اليوم:', right, 64, { font: AR, size: 15, rot: -0.02, wob: 0.9 });
    c.strokeStyle = 'rgba(246,244,232,0.85)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(right, 84);
    c.bezierCurveTo(right - 18, 82, right - 40, 86.5, right - lineLen, 83.5);
    c.moveTo(right - 2, 100);
    c.bezierCurveTo(right - 16, 98.5, right - 34, 102, right - lineLen * 0.8, 100);
    c.stroke();
    c.restore();
    if (lesson < 0.995) {
      for (let i = 0; i < 5; i++) {
        const u = (t * 1.1 + i * 0.41) % 1;
        c.fillStyle = `rgba(250,248,238,${0.5 * (1 - u)})`;
        c.fillRect(edge + Math.cos(i * 1.7) * 3, 62 + u * 30, 1.3, 1.3);
      }
    }
  }
  return font;
}

function star(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? s * 0.45 : s;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

// ----- the poster of the alphabet, hand-drawn

function drawPoster(c, x, y, w, h) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.012);
  // card, with a pinned corner and a curl
  c.fillStyle = '#efe4c6';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(120,90,50,0.1)';
  c.fillRect(0, h - 6, w, 6);
  c.strokeStyle = '#b8523a';
  c.lineWidth = 2;
  c.strokeRect(4, 4, w - 8, h - 8);
  chalkText(c, 'الحروف', w / 2, 18, { font: AR, size: 13, color: '#8a3a2a', align: 'center', wob: 0 });
  // six tiles, three across, right to left: ا ب ت / ث ج ح
  const tw = (w - 16) / 3;
  const th = (h - 30) / 2;
  const tiles = [
    ['ا', '#c83a30', (cx, cy) => apple(c, cx, cy)],
    ['ب', '#2a6aa8', (cx, cy) => house(c, cx, cy)],
    ['ت', '#8a5a2a', (cx, cy) => dates(c, cx, cy)],
    ['ث', '#c8741e', (cx, cy) => fox(c, cx, cy)],
    ['ج', '#6a8a3a', (cx, cy) => mountain(c, cx, cy)],
    ['ح', '#3a8a8a', (cx, cy) => fish(c, cx, cy)],
  ];
  tiles.forEach(([ch, col, art], i) => {
    const col_ = i % 3;
    const row = Math.floor(i / 3);
    const tx = w - 8 - (col_ + 1) * tw;
    const ty = 24 + row * th;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(tx + 2, ty + 2, tw - 4, th - 4);
    c.save();
    c.font = `bold 22px ${AR}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = col;
    c.fillText(ch, tx + tw - 14, ty + 22);
    c.restore();
    art(tx + tw * 0.36, ty + th * 0.55);
  });
  c.restore();
}
function apple(c, x, y) {
  c.fillStyle = '#d8402e';
  c.beginPath();
  c.arc(x - 3, y, 8, 0, TAU);
  c.arc(x + 4, y, 8, 0, TAU);
  c.fill();
  c.strokeStyle = '#5a3a1a';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x, y - 7);
  c.lineTo(x + 1, y - 12);
  c.stroke();
  c.fillStyle = '#4e8a3a';
  c.beginPath();
  c.ellipse(x + 6, y - 11, 5, 2.5, -0.4, 0, TAU);
  c.fill();
}
function house(c, x, y) {
  c.fillStyle = '#e8c070';
  c.fillRect(x - 11, y - 5, 22, 15);
  c.fillStyle = '#b8523a';
  c.beginPath();
  c.moveTo(x - 14, y - 4);
  c.lineTo(x, y - 15);
  c.lineTo(x + 14, y - 4);
  c.fill();
  c.fillStyle = '#6a4a2a';
  c.fillRect(x - 3, y + 2, 6, 8);
  c.fillStyle = '#7ab0d8';
  c.fillRect(x + 5, y - 2, 4, 4);
}
function dates(c, x, y) {
  c.strokeStyle = '#4e7a2e';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x - 10, y - 11);
  c.quadraticCurveTo(x, y - 14, x + 10, y - 9);
  c.stroke();
  c.fillStyle = '#8a4a1e';
  for (const [dx, dy] of [[-7, -6], [0, -4], [7, -5], [-3, 2], [4, 3]]) {
    c.beginPath();
    c.ellipse(x + dx, y + dy, 3.2, 5, 0.2, 0, TAU);
    c.fill();
  }
}
function fox(c, x, y) {
  c.fillStyle = '#d6792a';
  c.beginPath();
  c.moveTo(x - 13, y + 8);
  c.quadraticCurveTo(x - 14, y - 4, x - 5, y - 6);
  c.lineTo(x - 4, y - 14);
  c.lineTo(x, y - 8);
  c.lineTo(x + 5, y - 14);
  c.lineTo(x + 6, y - 5);
  c.quadraticCurveTo(x + 11, y, x + 6, y + 8);
  c.closePath();
  c.fill();
  c.fillStyle = '#f6ecd6';
  c.beginPath();
  c.moveTo(x - 4, y + 8);
  c.lineTo(x + 1, y);
  c.lineTo(x + 6, y + 8);
  c.fill();
  c.fillStyle = '#3a2a1a';
  c.fillRect(x - 3, y - 3, 1.8, 1.8);
  c.fillRect(x + 2, y - 3, 1.8, 1.8);
  c.fillRect(x, y + 1, 1.8, 1.8);
}
function mountain(c, x, y) {
  c.fillStyle = '#7a8a5a';
  c.beginPath();
  c.moveTo(x - 15, y + 9);
  c.lineTo(x - 3, y - 12);
  c.lineTo(x + 4, y - 3);
  c.lineTo(x + 9, y - 9);
  c.lineTo(x + 16, y + 9);
  c.fill();
  c.fillStyle = '#f2ecdc';
  c.beginPath();
  c.moveTo(x - 7, y - 4);
  c.lineTo(x - 3, y - 12);
  c.lineTo(x + 1, y - 6);
  c.fill();
}
function fish(c, x, y) {
  c.fillStyle = '#3a90b0';
  c.beginPath();
  c.ellipse(x - 2, y, 11, 6, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(x + 8, y);
  c.lineTo(x + 16, y - 6);
  c.lineTo(x + 16, y + 6);
  c.fill();
  c.fillStyle = '#fff';
  c.fillRect(x - 8, y - 2, 2, 2);
}

// ----- the little furniture

// A child's chair, origin at the foot of its seat's centre; faces right.
function kidChair(c, wood, dark, s = 1) {
  c.save();
  c.scale(s, s);
  extrudeRect(c, -15, -30, 30, 4, 8, { color: wood });
  extrudeRect(c, -15, -58, 3, 28, 5, { color: wood });
  c.fillStyle = dark;
  c.fillRect(-13, -26, 3, 26);
  c.fillRect(10, -26, 3, 26);
  c.fillRect(-12, -14, 24, 2);
  c.fillStyle = wood;
  c.fillRect(-15, -30, 30, 4);
  c.fillRect(-15, -58, 3, 28);
  c.fillRect(-16, -56, 5, 14);
  c.fillRect(-16, -48, 5, 4);
  c.fillStyle = 'rgba(255,240,210,0.2)';
  c.fillRect(-15, -30, 30, 1.2);
  c.fillRect(-15, -58, 1.2, 28);
  c.restore();
}

function crate(c, x, y, w, h, wood) {
  extrudeRect(c, x, y, w, h, 10, { color: wood });
  c.fillStyle = wood;
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (const fy of [y + h / 3, y + (2 * h) / 3]) c.fillRect(x, fy, w, 1.4);
  c.fillRect(x + 4, y, 3, h);
  c.fillRect(x + w - 7, y, 3, h);
  c.fillStyle = 'rgba(255,240,210,0.18)';
  c.fillRect(x, y, w, 1.4);
}

// A stack of exercise books, each with a label in a child's hand.
function bookStack(c, x, y, n, seed, tilt = 0) {
  const r = rng(seed);
  const cols = ['#2e5a7a', '#8a3a3a', '#5a7a3a', '#8a7a3a', '#6a4a7a', '#a05a2a'];
  for (let i = 0; i < n; i++) {
    const off = (r() - 0.5) * 7 + (i * tilt);
    const col = cols[Math.floor(r() * cols.length)];
    c.fillStyle = col;
    c.fillRect(x + off, y - (i + 1) * 5.5, 30, 5.5);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(x + off, y - (i + 1) * 5.5, 30, 1);
    c.fillStyle = '#e9e0c8';
    c.fillRect(x + off + 2, y - (i + 1) * 5.5 + 1.5, 26, 3);
    c.fillStyle = 'rgba(60,40,30,0.65)';
    c.fillRect(x + off + 18 + r() * 5, y - (i + 1) * 5.5 + 2.4, 6 + r() * 2, 1.1);
    c.fillRect(x + off + 5, y - (i + 1) * 5.5 + 2.4, 7 + r() * 3, 1.1);
  }
}

// ----- the classroom itself

export function drawDawnClassroom(R, g, { k = 0, t = g.time || 0, date = 0, lesson = 0 } = {}) {
  k = clamp(k);
  const px = patchAt(k);
  const wood = '#a8723f';
  const dark = '#6e4524';
  R.layer(1);

  // the dawn street, up at the left: a sky just going gold
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const sg = c.createLinearGradient(0, 0, 0, R.H);
    sg.addColorStop(0, mh('#4a5c92', '#5c6ea2', k));
    sg.addColorStop(0.45, mh('#b88a9c', '#d99c94', k));
    sg.addColorStop(1, mh('#f0a878', '#ffc98a', k));
    c.fillStyle = sg;
    c.fillRect(0, 0, R.W, R.H);
    // the sun not yet up, but its glare low on the left
    const gl = c.createRadialGradient(0, R.H * 0.8, 0, 0, R.H * 0.8, R.W * 0.45);
    gl.addColorStop(0, `rgba(255,214,140,${0.55 + 0.3 * k})`);
    gl.addColorStop(1, 'rgba(255,200,130,0)');
    c.fillStyle = gl;
    c.fillRect(0, 0, R.W, R.H);
    c.restore();
  });

  // across the street: a damaged building, warm where the sun has found it
  local(R, SX, 'paint', (c) => {
    const r = rng(9);
    // a farther block
    c.fillStyle = '#c0a58b';
    c.fillRect(-1180, -560, 170, 360);
    c.fillStyle = '#a58b78';
    for (let i = 0; i < 6; i++) c.fillRect(-1166 + (i % 3) * 52, -520 + Math.floor(i / 3) * 110, 30, 62);
    // the near block, opposite, its top torn
    const pts = [[-1100, -204], [-1100, -690], [-1020, -702], [-996, -640], [-960, -660], [-930, -600], [-905, -616], [-880, -540], [-880, -204]];
    extrudePoly(c, pts, 16, { color: '#c9a98a' });
    c.fillStyle = '#d3b08e';
    poly(c, pts);
    c.fill();
    const lit = c.createLinearGradient(-1100, 0, -880, 0);
    lit.addColorStop(0, 'rgba(255,214,150,0.34)');
    lit.addColorStop(1, 'rgba(255,214,150,0)');
    c.fillStyle = lit;
    poly(c, pts);
    c.fill();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = -1076 + col * 62;
        const wy = -626 + row * 126;
        if (row === 0 && col === 2) continue;
        c.fillStyle = '#3a342d';
        c.fillRect(wx, wy, 34, 66);
        c.fillStyle = 'rgba(255,220,170,0.4)';
        c.fillRect(wx, wy + 66, 34, 3);
        if ((row + col) % 2 === 0) {
          c.fillStyle = '#7a6f60';
          c.fillRect(wx + 3, wy + 3, 14, 60);
        }
      }
    }
    // a shell hole, with the pale of fresh plaster around it
    c.fillStyle = '#e8c4a0';
    c.beginPath();
    c.ellipse(-960, -420, 26, 20, 0.3, 0, TAU);
    c.fill();
    c.fillStyle = '#6c5848';
    c.beginPath();
    c.ellipse(-960, -420, 19, 14, 0.3, 0, TAU);
    c.fill();
    // a satellite dish and a water tank
    c.fillStyle = '#8c8a86';
    c.beginPath();
    c.ellipse(-1050, -690, 9, 7, -0.6, 0, TAU);
    c.fill();
    c.fillStyle = '#2a4a6a';
    c.fillRect(-982, -722, 20, 18);
  });

  // the room and building, baked
  const shell = classShell();
  R.paint((c) => c.drawImage(shell, SX + C0[0], C0[1], CW, CH));
  R.surface((c) => c.rect(SX + RM.x0, RM.ceil, RM.x1 - RM.x0, -RM.ceil - 111), 'plaster', { scale: 1.2, seed: 4, alpha: 0.5 });
  R.surface((c) => c.rect(SX + RM.x0, 2, RM.x1 - RM.x0, 94), 'concrete', { scale: 1.0, seed: 6, alpha: 0.4 });
  R.surface((c) => c.rect(SX + RM.x0, -760, 1100, 450), 'concrete', { scale: 1.3, seed: 9, alpha: 0.45 });
  R.surface((c) => c.rect(SX + C0[0], RM.street + 14, STAIR_TOP - C0[0], 140), 'concrete', { scale: 1.1, seed: 5, alpha: 0.35 });

  // the steps down from the pavement: a half-flight of worn concrete, a rail
  local(R, SX, 'cast', (c) => {
    const pts = stairProfile();
    const solid = [...pts, [RM.x0, 40], [STAIR_TOP, 40]];
    extrudePoly(c, solid, 14, { color: '#8a8071' });
    c.fillStyle = '#7a7164';
    poly(c, solid);
    c.fill();
    // the well goes down into shade as it nears the door
    const sgd = c.createLinearGradient(STAIR_TOP, RM.street, RM.x0, 0);
    sgd.addColorStop(0, 'rgba(255,214,150,0.16)');
    sgd.addColorStop(1, 'rgba(20,14,10,0.34)');
    c.fillStyle = sgd;
    poly(c, solid);
    c.fill();
    // the treads, lit from the left; the risers, in shade
    for (let i = 1; i <= RM.steps; i++) {
      const x0 = RM.x0 - i * RM.run;
      c.fillStyle = '#a89c88';
      c.fillRect(x0, -i * RM.rise, RM.run, 5);
      c.fillStyle = 'rgba(255,240,205,0.4)';
      c.fillRect(x0, -i * RM.rise, RM.run, 1.6);
      c.fillStyle = 'rgba(30,24,18,0.32)';
      c.fillRect(x0 + RM.run - 2, -i * RM.rise + 5, 2.4, RM.rise - 5);
      c.fillStyle = 'rgba(30,24,18,0.12)';
      c.fillRect(x0, -i * RM.rise + 5, RM.run, RM.rise - 5);
      // a worn dip in the middle of each tread, and dust at its edge
      c.fillStyle = 'rgba(70,58,44,0.2)';
      c.fillRect(x0 + 6, -i * RM.rise + 1, RM.run - 14, 3);
    }
    // the iron rail up the slope, on posts
    c.strokeStyle = '#2f2c28';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(RM.x0 - 4, -78);
    c.lineTo(STAIR_TOP + 4, RM.street - 86);
    c.stroke();
    c.lineWidth = 2;
    for (let i = 1; i <= RM.steps; i += 3) {
      const px_ = RM.x0 - i * RM.run + RM.run / 2;
      const ry = -78 + ((RM.street - 86 + 78) * (RM.x0 - 4 - px_)) / (RM.x0 - 4 - STAIR_TOP - 4);
      c.beginPath();
      c.moveTo(px_, -i * RM.rise);
      c.lineTo(px_, ry);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,225,170,0.45)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(RM.x0 - 4, -79.2);
    c.lineTo(STAIR_TOP + 4, RM.street - 87.2);
    c.stroke();
    // a tin of basil on the pavement's edge: somebody's morning habit
    const bx = STAIR_TOP - 34;
    c.fillStyle = '#b4623a';
    c.fillRect(bx - 11, RM.street - 20, 22, 20);
    c.fillStyle = 'rgba(255,230,190,0.3)';
    c.fillRect(bx - 11, RM.street - 20, 22, 2);
    c.fillStyle = '#4e7a32';
    for (const [dx, dy, rr] of [[-6, -26, 7], [4, -30, 8], [9, -24, 6], [-1, -36, 6]]) {
      c.beginPath();
      c.ellipse(bx + dx, RM.street + dy, rr, rr * 0.7, dx * 0.1, 0, TAU);
      c.fill();
    }
  });

  // the washing line, from the building opposite to the room's front
  local(R, SX, 'paint', (c) => {
    const x0 = -880;
    const y0 = -470;
    const x1 = RM.x0;
    const y1 = -392;
    c.strokeStyle = '#3a342d';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 26, x1, y1);
    c.stroke();
    const at = (u) => {
      const x = lerp(x0, x1, u);
      const y = lerp(y0, y1, u) + 26 * 4 * u * (1 - u) * 0.5 * 1;
      return [x, y];
    };
    const cloths = [
      [0.18, 34, 52, '#e9e2d0'],
      [0.4, 26, 36, '#d97a5a'],
      [0.58, 22, 44, '#5a8aa8'],
      [0.76, 30, 30, '#efe6cc'],
    ];
    cloths.forEach(([u, w, h, col], i) => {
      const [x, y] = at(u);
      const sw = Math.sin(t * 1.5 + i * 1.9) * 2.5;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x - w / 2, y);
      c.lineTo(x + w / 2, y);
      c.lineTo(x + w / 2 + sw, y + h);
      c.quadraticCurveTo(x + sw * 0.5, y + h + 4, x - w / 2 + sw * 1.2, y + h);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,230,180,0.35)';
      c.fillRect(x - w / 2, y, w * 0.4, h * 0.9);
      c.fillStyle = '#6a5a48';
      c.fillRect(x - w / 2 + 4, y - 2, 3, 5);
      c.fillRect(x + w / 2 - 7, y - 2, 3, 5);
    });
  });

  // ---- the open door, at the foot of the steps: ajar, never locked
  local(R, SX, 'cast', (c) => {
    const dx = RM.x0 - 2;
    // the frame
    c.fillStyle = '#6a4a30';
    c.fillRect(dx - 3, -206, 10, 206);
    c.fillRect(dx - 3, -208, 70, 8);
    c.fillStyle = 'rgba(255,230,180,0.3)';
    c.fillRect(dx - 3, -208, 70, 1.5);
    // the leaf, swung back, seen almost edge-on: a hint of panel and a brass handle
    c.fillStyle = '#7a8a86';
    c.beginPath();
    c.moveTo(dx - 12, -196);
    c.lineTo(dx - 2, -200);
    c.lineTo(dx - 2, 0);
    c.lineTo(dx - 12, -2);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(dx - 12, -128, 10, 2);
    c.fillStyle = '#c8a050';
    c.fillRect(dx - 10, -98, 3, 9);
  });

  // ---- the window: high, small, at the pavement; bars and a deep sill
  const wx0 = SCHOOL.window - SX - 32;
  const wy0 = -256;
  const ww = 64;
  const wh = 50;
  const wcx0 = wx0 + ww / 2;
  local(R, SX, 'paint', (c) => {
    c.fillStyle = '#54463a';
    c.fillRect(wx0, wy0, ww, wh);
  });
  local(R, SX, 'glow', (c) => {
    const g2 = c.createLinearGradient(0, wy0, 0, wy0 + wh);
    g2.addColorStop(0, rgba(mixc([150, 160, 205], [255, 196, 120], k), 1));
    g2.addColorStop(1, rgba(mixc([225, 170, 140], [255, 222, 150], k), 1));
    c.fillStyle = g2;
    c.fillRect(wx0, wy0, ww, wh);
    // the paving stones of the street outside, and a bar of low sun
    c.fillStyle = 'rgba(90,60,40,0.4)';
    c.fillRect(wx0, wy0 + wh - 8, ww, 8);
    // a warm wash on the plaster around the window
    const wg = c.createRadialGradient(wcx0, wy0 + 20, 6, wcx0, wy0 + 20, 190);
    wg.addColorStop(0, `rgba(255,190,110,${0.2 * (0.5 + k * 0.5)})`);
    wg.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = wg;
    c.fillRect(wcx0 - 190, wy0 - 40, 380, 260);
  });
  local(R, SX, 'cast', (c) => {
    const frame = '#b7a58a';
    extrudeRect(c, wx0 - 7, wy0 + wh, ww + 14, 8, 14, { color: frame });
    c.fillStyle = frame;
    c.fillRect(wx0 - 7, wy0 + wh, ww + 14, 8);
    c.fillRect(wx0 - 5, wy0 - 6, ww + 10, 6);
    c.fillRect(wx0 - 5, wy0 - 6, 5, wh + 8);
    c.fillRect(wx0 + ww, wy0 - 6, 5, wh + 8);
    c.fillStyle = '#35302b';
    for (let i = 1; i < 5; i++) c.fillRect(wx0 + (i * ww) / 5 - 1.2, wy0, 2.4, wh);
    c.fillRect(wx0, wy0 + wh * 0.55, ww, 2);
  });

  // ---- left wall: children's drawings, pinned, and the pail under the drip
  local(R, SX, 'paint', (c) => {
    const sheets = [
      [-428, -214, 34, 44, '#f3ecd8', 0.04],
      [-386, -206, 40, 46, '#efe2c4', -0.05],
      [-338, -216, 36, 44, '#f3ecd8', 0.03],
    ];
    sheets.forEach(([sx, sy, sw, sh, col, rot], i) => {
      c.save();
      c.translate(sx + sw / 2, sy + sh / 2);
      c.rotate(rot);
      c.fillStyle = col;
      c.fillRect(-sw / 2, -sh / 2, sw, sh);
      c.fillStyle = 'rgba(80,60,40,0.12)';
      c.fillRect(-sw / 2, sh / 2 - 3, sw, 3);
      if (i === 0) {
        c.fillStyle = '#e8b830';
        c.beginPath();
        c.arc(-6, -10, 6, 0, TAU);
        c.fill();
        c.fillStyle = '#c0583a';
        c.fillRect(-9, 3, 18, 12);
        c.fillStyle = '#6a3a2a';
        c.beginPath();
        c.moveTo(-11, 3);
        c.lineTo(0, -6);
        c.lineTo(11, 3);
        c.fill();
      } else if (i === 1) {
        c.fillStyle = '#4e8a3a';
        c.beginPath();
        c.arc(0, -8, 10, 0, TAU);
        c.fill();
        c.fillStyle = '#7a5030';
        c.fillRect(-2, 0, 4, 16);
        c.fillStyle = '#c04040';
        for (const [dx, dy] of [[-5, -10], [4, -4], [-1, -13]]) c.fillRect(dx, dy, 3, 3);
      } else {
        c.strokeStyle = '#3a5a9a';
        c.lineWidth = 1.8;
        c.beginPath();
        c.arc(0, 4, 8, 0, TAU);
        c.moveTo(-5, -2);
        c.lineTo(-7, -11);
        c.lineTo(-2, -5);
        c.moveTo(5, -2);
        c.lineTo(7, -11);
        c.lineTo(2, -5);
        c.stroke();
      }
      c.fillStyle = '#c04040';
      c.fillRect(-1.5, -sh / 2 + 2, 3, 3);
      c.restore();
    });
  });

  // the alphabet poster
  local(R, SX, 'paint', (c) => drawPoster(c, 276, -236, 140, 100));

  // ---- the blackboard: slate in a wooden frame, a tray, chalk, a duster
  const B = BOARD_RECT;
  local(R, SX, 'cast', (c) => {
    const frame = '#8a5a30';
    const bx = B.x - SX;
    extrudeRect(c, bx - 7, B.y - 7, B.w + 14, B.h + 14, 6, { color: frame });
    c.fillStyle = frame;
    c.fillRect(bx - 7, B.y - 7, B.w + 14, B.h + 14);
    c.fillStyle = 'rgba(255,225,170,0.22)';
    c.fillRect(bx - 7, B.y - 7, B.w + 14, 1.5);
    // the chalk tray
    extrudeRect(c, bx - 9, B.y + B.h + 4, B.w + 18, 6, 12, { color: frame });
    c.fillStyle = shadeHex(frame, 0.9);
    c.fillRect(bx - 9, B.y + B.h + 4, B.w + 18, 6);
  });
  local(R, SX, 'paint', (c) => {
    const bx = B.x - SX;
    c.drawImage(chalkBoardBase(), bx, B.y, B.w, B.h);
    c.save();
    c.translate(bx, B.y);
    c.beginPath();
    c.rect(0, 0, B.w, B.h);
    c.clip();
    boardWriting(c, date, lesson, t);
    c.restore();
    // chalk on the tray, and the duster
    c.fillStyle = '#efeadb';
    c.fillRect(bx + 168, B.y + B.h + 1, 11, 3);
    c.fillRect(bx + 184, B.y + B.h + 2, 7, 2);
    c.fillStyle = '#7a5a3a';
    c.fillRect(bx + 40, B.y + B.h - 6, 24, 10);
    c.fillStyle = '#d8d2c0';
    c.fillRect(bx + 40, B.y + B.h - 6, 24, 3);
  });
  R.surface((c) => c.rect(B.x, B.y, B.w, B.h), 'cloth', { scale: 0.5, seed: 2, alpha: 0.12 });

  // ---- the stack of the children's exercise books, against the wall
  local(R, SX, 'cast', (c) => {
    crate(c, 474, -36, 78, 36, '#9a6a3c');
    bookStack(c, 480, -36, 7, 2, 0.4);
    bookStack(c, 515, -36, 5, 7, -0.5);
    // one slid half off, a pencil laid beside it
    c.fillStyle = '#d9a63a';
    c.fillRect(506, -40.6, 12, 1.8);
  });

  // ---- the chairs: two arcs, four a little askew
  const far = CHAIRS.slice(6);
  const near = CHAIRS.slice(0, 6);
  const tones = ['#a8723f', '#9a653a', '#b57b46', '#8e5d34'];
  [far, near].forEach((row, ri) => {
    row.forEach(([cxw], i) => {
      const idx = ri * 6 + i;
      const [rot, sl] = ASKEW[idx] || [0, 0];
      const wd = tones[idx % 4];
      local(R, SX, 'cast', (c) => {
        c.save();
        c.translate(cxw - SX + sl, ri === 0 ? -12 : 0);
        c.rotate(rot);
        kidChair(c, ri === 0 ? mh(wd, '#4a3a3a', 0.4) : wd, ri === 0 ? '#4a2c18' : dark, ri === 0 ? 0.9 : 1);
        c.restore();
      });
    });
    if (ri === 0) {
      // shade the far arc a little, for depth
      local(R, SX, 'paint', (c) => {
        c.fillStyle = 'rgba(30,26,34,0.0)';
      });
    }
  });
  // their shadows on the floor
  for (const [cxw] of CHAIRS) {
    R.shadow((c) => c.fillRect(cxw - 16, -30, 32, 30), cxw, 0, 1.4, 0.14);
  }

  // ---- the teacher's chair and desk: scarred wood, an open exercise book
  local(R, SX, 'cast', (c) => {
    // his chair, pushed back as a man stands up to go
    c.save();
    c.translate(206, 0);
    c.scale(1.28, 1.28);
    kidChair(c, '#8e5d34', '#5a3818', 1);
    c.restore();
    const tx = 240;
    const top = -76;
    const tw = 120;
    extrudeRect(c, tx, top, tw, 7, 22, { color: wood });
    c.fillStyle = dark;
    c.fillRect(tx + 5, top + 7, 6, 76);
    c.fillRect(tx + tw - 11, top + 7, 6, 76);
    c.fillStyle = wood;
    c.fillRect(tx, top, tw, 7);
    c.fillRect(tx + 11, top + 7, tw - 22, 24);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(tx + 11, top + 19, tw - 22, 1.6);
    c.fillStyle = '#c9a25a';
    c.fillRect(tx + tw / 2 - 4, top + 14, 8, 2.4);
    // the top's scars: knife nicks, a ring of old tea, a long scratch
    c.fillStyle = 'rgba(40,24,12,0.35)';
    for (const [sx, w_] of [[14, 20], [48, 12], [78, 24], [100, 9]]) c.fillRect(tx + sx, top + 2.4, w_, 0.9);
    c.fillStyle = 'rgba(255,240,210,0.24)';
    c.fillRect(tx, top, tw, 1.3);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(tx + 11, top + 31, tw - 22, 3);
    // the top face, seen as a thin lit band at the back
    c.fillStyle = 'rgba(255,224,170,0.1)';
    c.fillRect(tx + 6, top - 2, tw, 2);
  });
  // the things on the desk
  local(R, SX, 'cast', (c) => {
    const top = -76;
    // the open exercise book: two leaves, a marked page, a red tick and a star
    const bx = 250;
    c.fillStyle = '#4a6a8a';
    c.beginPath();
    c.moveTo(bx - 1, top);
    c.lineTo(bx + 41, top);
    c.lineTo(bx + 39, top - 1.6);
    c.lineTo(bx + 1, top - 1.6);
    c.closePath();
    c.fill();
    c.fillStyle = '#f2ead4';
    c.beginPath();
    c.moveTo(bx + 1, top - 1.6);
    c.quadraticCurveTo(bx + 10, top - 6.5, bx + 20, top - 3);
    c.quadraticCurveTo(bx + 30, top - 6.5, bx + 39, top - 1.6);
    c.lineTo(bx + 39, top - 1);
    c.lineTo(bx + 1, top - 1);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(bx + 19.4, top - 3.4, 1.2, 2.4);
    c.strokeStyle = 'rgba(150,170,200,0.7)';
    c.lineWidth = 0.5;
    for (const lx of [4, 8, 25, 29, 33]) {
      c.beginPath();
      c.moveTo(bx + lx, top - 2.4);
      c.lineTo(bx + lx + 4, top - 2.4);
      c.stroke();
    }
    c.strokeStyle = '#c8403a';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(bx + 24, top - 4.4);
    c.lineTo(bx + 26, top - 3.2);
    c.lineTo(bx + 31, top - 5.6);
    c.stroke();
    // the glass of water, half full
    const gx = 304;
    c.fillStyle = 'rgba(205,225,235,0.34)';
    c.beginPath();
    c.moveTo(gx - 6, top - 16);
    c.lineTo(gx + 6, top - 16);
    c.lineTo(gx + 5, top);
    c.lineTo(gx - 5, top);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,170,205,0.55)';
    c.beginPath();
    c.moveTo(gx - 5.6, top - 8);
    c.lineTo(gx + 5.6, top - 8);
    c.lineTo(gx + 5, top);
    c.lineTo(gx - 5, top);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(gx - 4.4, top - 14, 1.6, 12);
    c.fillRect(gx - 5.6, top - 8.6, 11.2, 1);
    // the pencil cup, three pencils worn short
    const cx = 326;
    c.fillStyle = '#7a8a8e';
    c.fillRect(cx - 6, top - 14, 12, 14);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(cx - 5, top - 14, 2, 14);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(cx - 6, top - 5, 12, 1.2);
    for (const [dx, h, a, col] of [[-3, 8, -0.22, '#d9a63a'], [0, 10, 0.04, '#c84a3a'], [3, 7, 0.28, '#d9a63a']]) {
      c.save();
      c.translate(cx + dx, top - 13);
      c.rotate(a);
      c.fillStyle = col;
      c.fillRect(-1.3, -h, 2.6, h + 3);
      c.fillStyle = '#e8c9a0';
      c.beginPath();
      c.moveTo(-1.3, -h);
      c.lineTo(0, -h - 2.6);
      c.lineTo(1.3, -h);
      c.fill();
      c.fillStyle = '#3a3030';
      c.fillRect(-0.4, -h - 2.6, 0.8, 1.2);
      c.restore();
    }
    // the jar of chalk
    const jx = 346;
    c.fillStyle = 'rgba(190,215,220,0.5)';
    c.fillRect(jx - 7, top - 20, 14, 20);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillRect(jx - 5, top - 18, 2, 16);
    c.fillStyle = '#f3efe0';
    for (const [dx, h, a] of [[-3, 8, -0.1], [0, 12, 0.05], [3, 10, 0.14]]) {
      c.save();
      c.translate(jx + dx, top - 18);
      c.rotate(a);
      c.fillRect(-1.5, -h, 3, h + 6);
      c.restore();
    }
    c.fillStyle = 'rgba(120,130,130,0.5)';
    c.fillRect(jx - 7, top - 21, 14, 2);
  });

  // ---- the gold rectangle and the shaft that makes it
  const sun = 0.55 + 0.45 * smooth(0, 0.6, k);
  const wcx = SCHOOL.window - SX;
  const pf0 = px - 26; // far edge of the patch (against the wall), near edge shifted
  const patch = [
    [pf0 + 14, 6],
    [pf0 + 150, 6],
    [pf0 + 186, 82],
    [pf0 + 34, 82],
  ];
  const shaftPts = hull([[wcx - 32, -256], [wcx + 32, -256], [wcx - 32, -206], [wcx + 32, -206], ...patch]);
  R.glow((c) => {
    c.save();
    c.translate(SX, 0);
    // the shaft in the dusty air
    c.save();
    poly(c, shaftPts);
    c.clip();
    const sg = c.createLinearGradient(wcx, -230, px + 60, 40);
    sg.addColorStop(0, `rgba(255,214,140,${0.2 * sun})`);
    sg.addColorStop(1, `rgba(255,200,120,${0.06 * sun})`);
    c.fillStyle = sg;
    c.fillRect(wcx - 80, -270, 700, 360);
    c.restore();
    // the pool of light on the floor, edges soft
    c.save();
    c.filter = 'blur(2.4px)';
    c.fillStyle = `rgba(255,198,105,${0.4 * sun})`;
    poly(c, patch);
    c.fill();
    c.fillStyle = `rgba(255,236,170,${0.3 * sun})`;
    poly(c, [[patch[0][0] + 10, 12], [patch[1][0] - 10, 12], [patch[2][0] - 14, 66], [patch[3][0] + 14, 66]]);
    c.fill();
    c.restore();
    // the window's own bars, thrown in shadow across the patch
    c.fillStyle = 'rgba(40,24,10,0.12)';
    for (let i = 1; i < 5; i++) {
      const ux = lerp(patch[0][0], patch[1][0], i / 5);
      const lx = lerp(patch[3][0], patch[2][0], i / 5);
      c.beginPath();
      c.moveTo(ux - 1.2, 6);
      c.lineTo(ux + 1.2, 6);
      c.lineTo(lx + 1.4, 74);
      c.lineTo(lx - 1.4, 74);
      c.fill();
    }
    // by the end the light has reached the desk: the top, the glass, the pencils
    const reach = smooth(0.74, 1, k);
    if (reach > 0.01) {
      const tx = 240;
      const top = -76;
      c.fillStyle = `rgba(255,214,130,${0.5 * reach})`;
      poly(c, [[tx + 8, top], [tx + 118, top], [tx + 130, top - 4], [tx + 20, top - 4]]);
      c.fill();
      const lg = c.createRadialGradient(318, top - 14, 2, 318, top - 14, 70);
      lg.addColorStop(0, `rgba(255,220,150,${0.42 * reach})`);
      lg.addColorStop(1, 'rgba(255,200,110,0)');
      c.fillStyle = lg;
      c.fillRect(250, top - 80, 140, 100);
      // a spark through the water
      c.fillStyle = `rgba(255,248,215,${0.8 * reach})`;
      c.fillRect(302.5, top - 6, 2.4, 2.4);
      c.fillStyle = `rgba(255,236,170,${0.5 * reach})`;
      c.fillRect(300, top - 5, 7, 1);
      // the leg of the desk and the floor beneath it warm too
      c.fillStyle = `rgba(255,205,115,${0.24 * reach})`;
      poly(c, [[236, 2], [370, 2], [392, 60], [262, 60]]);
      c.fill();
    }
    c.restore();
  });

  // the dust turning in the shaft
  R.glow((c) => {
    c.save();
    c.translate(SX, 0);
    const r = rng(77);
    for (let i = 0; i < 46; i++) {
      const u = r();
      const s0 = r();
      const sp = 0.012 + r() * 0.02;
      const s = (s0 + t * sp) % 1;
      const wxp = lerp(wcx - 30, wcx + 30, u);
      const wyp = lerp(-254, -208, u * 0.6 + 0.2);
      const fxp = lerp(patch[0][0] + 6, patch[1][0] - 6, u);
      const fyp = lerp(8, 70, u);
      const x = lerp(wxp, fxp, s) + Math.sin(t * 0.6 + i * 3.1) * 5;
      const y = lerp(wyp, fyp, s) + Math.sin(t * 0.8 + i * 1.7) * 4;
      const a = (0.25 + 0.45 * Math.sin(Math.PI * s)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i)) * sun;
      c.fillStyle = `rgba(255,236,190,${a})`;
      c.fillRect(x, y, 1.8, 1.8);
    }
    // the drip from the pipe's elbow: swells, falls, rings the pail
    const per = 2.6;
    const ph = (t % per) / per;
    const dx = -331;
    if (ph < 0.22) {
      const sw = ph / 0.22;
      c.fillStyle = `rgba(210,225,235,${0.7 * sw})`;
      c.beginPath();
      c.ellipse(dx, RM.ceil + 14 + sw * 3, 1.4 + sw, 1.8 + sw * 2, 0, 0, TAU);
      c.fill();
    } else if (ph < 0.4) {
      const u = (ph - 0.22) / 0.18;
      const y = lerp(RM.ceil + 17, -22, u * u);
      c.fillStyle = 'rgba(215,230,240,0.85)';
      c.beginPath();
      c.ellipse(dx, y, 1.3, 2.4, 0, 0, TAU);
      c.fill();
    } else if (ph < 0.62) {
      const u = (ph - 0.4) / 0.22;
      c.strokeStyle = `rgba(215,230,240,${0.6 * (1 - u)})`;
      c.lineWidth = 0.9;
      c.beginPath();
      c.ellipse(dx, -22, 2 + u * 8, 0.8 + u * 1.6, 0, 0, TAU);
      c.stroke();
    }
    c.restore();
  });
  // the pail under the drip
  local(R, SX, 'cast', (c) => {
    const px_ = -331;
    c.fillStyle = '#7e8688';
    c.beginPath();
    c.moveTo(px_ - 15, -24);
    c.lineTo(px_ + 15, -24);
    c.lineTo(px_ + 12, 0);
    c.lineTo(px_ - 12, 0);
    c.closePath();
    c.fill();
    c.fillStyle = '#4a5254';
    c.fillRect(px_ - 15, -25, 30, 3);
    c.fillStyle = '#5e7a86';
    c.fillRect(px_ - 13, -23, 26, 2.6);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(px_ - 13, -22, 3, 20);
    c.strokeStyle = '#4a5254';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(px_, -24, 14, Math.PI, TAU);
    c.stroke();
  });
}

// Light: the first daylight of the game. A warm gold from the high window
// and from the street at the left; the rest gentle shade, a room and not a
// siege.
export function dawnClassroomLook(g, k = 0) {
  k = clamp(k);
  const t = g.time || 0;
  const px = SX + patchAt(k) + 60;
  const sun = 0.55 + 0.45 * smooth(0, 0.6, k);
  const lights = [
    // through the window: gold, falling across the room
    { x: SCHOOL.window, y: -232, color: [1.0, 0.78, 0.48], intensity: 1.15 * sun, radius: 0.5, project: 1.05, soft: 0.003, rim: 0.9 },
    // the street's low sun, down the steps from the left
    { x: SX - 1000, y: -420, color: [1.0, 0.8, 0.55], intensity: 0.8, radius: 0.55, project: 1.0, soft: 0.004, rim: 0.7 },
    // the pool of gold on the floor, warming what it touches
    { x: px, y: -34, color: [1.0, 0.76, 0.42], intensity: 0.5 + 0.7 * smooth(0.6, 1, k), radius: 0.2, project: 0.9, soft: 0.004, rim: 0.5 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: [0.27, 0.26, 0.31],
    lights: lights.slice(0, 4),
    groundShadow: 0.6,
    bloom: 0.7,
    exposure: 1.0,
    grain: 0.05,
    time: t,
    grade: {
      sat: 1.06,
      contrast: 1.0,
      lift: 0.02,
      tint: [1.05, 0.99, 0.91],
      shadows: [0.95, 0.95, 1.05],
      highs: [1.06, 1.0, 0.9],
    },
    god: { x: SCHOOL.window, y: -232, strength: 0.1 + 0.08 * sun },
    fog: { density: 0.025, height: 200, color: [0.6, 0.48, 0.34] },
  };
}

// =====================================================================
// 2. THE RUBBLE ROOM
// =====================================================================


const RX = END.rubble[0];
const SLAB = { x0: -192, x1: 30, top: -38 };
// where Sami sits (his hip), against the standing wall behind him
export const SEAT = [RX - 135, -40];

// The settled ground, the fallen façade's ramp at the right, the pile
// inside: one polyline, so the cat and the drawing agree where the surface is.
// ceiling slab: its lower edge sags toward the opening; the tip is at 215
const ceilY = (a) => -268 + 74 * smooth(-380, 215, a);
const RAMP_A = [322, -86];
const RAMP_B = [566, -4];
const SURF = [
  [566, -4], [520, -20], [470, -37], [420, -53], [370, -70], [322, -86],
  [300, -78], [272, -64], [246, -52], [222, -54], [196, -38], [150, -27], [108, -23], [66, -27], [30, -37],
];
// the cat's way: in from the street, up the fallen façade, down over the
// pile, onto the slab beside Sami
export const CAT_PATH = [
  [640, 0], [600, 0], ...SURF.map(([a, y]) => [RX + a, y]), [RX - 40, -39],
].map(([x, y]) => [x, y]);


function raggedLine(r, x0, y0, x1, y1, n, amp) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([lerp(x0, x1, u) + (i && i < n ? (r() - 0.5) * amp * 0.5 : 0), lerp(y0, y1, u) + (i && i < n ? (r() - 0.5) * amp : 0)]);
  }
  return pts;
}

const BEAM_TAN = 0.28;
const beamU = (a) => ceilY(215) + (215 - a) * BEAM_TAN; // y of the upper edge at a
const beamL = (a) => -80 + (330 - a) * BEAM_TAN; // the pile's top edge
const inBeam = (a, y) => a < 330 && y > beamU(a) && y < beamL(a);

function leaf(c, x, y, s, rot, col) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = col;
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62;
    const l = i === 2 ? 1 : i % 2 ? 0.72 : 0.86;
    c.moveTo(0, 0);
    c.quadraticCurveTo(Math.cos(a - 0.3) * s * l * 0.7, Math.sin(a - 0.3) * s * l * 0.7, Math.cos(a) * s * l, Math.sin(a) * s * l);
    c.quadraticCurveTo(Math.cos(a + 0.3) * s * l * 0.7, Math.sin(a + 0.3) * s * l * 0.7, 0, 0);
  }
  c.fill();
  c.restore();
}

function roomShell() {
  return bake('rb-shell', 2400, 700, 1.1, (c) => {
    c.translate(1200, 400);
    const r = rng(23);
    // the floor, settled: dust that has become dirt over grey concrete
    const fg = c.createLinearGradient(0, 0, 0, 110);
    fg.addColorStop(0, '#7b7265');
    fg.addColorStop(1, '#4a443b');
    c.fillStyle = fg;
    c.fillRect(-1200, 0, 2400, 300);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(40,30,22,0.14)' : 'rgba(210,190,150,0.1)';
      c.beginPath();
      c.ellipse(-1100 + r() * 2200, r() * 100, 10 + r() * 50, 2 + r() * 8, 0, 0, TAU);
      c.fill();
    }
    // old tiles showing through the dirt, cracked
    c.strokeStyle = 'rgba(20,14,10,0.3)';
    c.lineWidth = 1;
    for (let x = -600; x < 330; x += 44) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x - 10, 100);
      c.stroke();
    }
    // weeds in the dirt
    for (let i = 0; i < 70; i++) {
      const x = -900 + r() * 1800;
      const y = 6 + r() * 70;
      c.strokeStyle = r() < 0.5 ? '#6f8a3e' : '#8aa04a';
      c.lineWidth = 1.2;
      for (let q = 0; q < 3; q++) {
        c.beginPath();
        c.moveTo(x + q * 2, y);
        c.lineTo(x + q * 2 + (r() - 0.5) * 6, y - 5 - r() * 7);
        c.stroke();
      }
    }
    const fd = c.createLinearGradient(0, 0, 0, 110);
    fd.addColorStop(0, 'rgba(0,0,0,0)');
    fd.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.fillStyle = fd;
    c.fillRect(-1200, 0, 2400, 110);

    // the building to the left: cut concrete mass, dark
    c.fillStyle = '#6d695f';
    c.fillRect(-1200, -400, 640, 400);
    // the back wall: a ragged right edge where the façade tore away
    const edge = [[330, -250], [316, -214], [338, -176], [322, -140], [346, -104], [326, -66], [344, -30], [332, 0]];
    c.beginPath();
    c.moveTo(-600, 0);
    c.lineTo(-600, -330);
    c.lineTo(-110, -330);
    for (let a = -110; a <= 215; a += 25) c.lineTo(a, ceilY(a) - 28);
    c.lineTo(236, -224);
    c.lineTo(250, -214);
    for (const p of edge.slice(1)) c.lineTo(p[0], p[1]);
    c.closePath();
    // plaster: a pale pistachio paint, flaking
    c.fillStyle = '#b9bfa8';
    c.fill();
    c.save();
    c.clip();
    for (let i = 0; i < 90; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,248,220,0.1)' : 'rgba(80,70,50,0.1)';
      c.beginPath();
      c.ellipse(-600 + r() * 930, -300 + r() * 300, 20 + r() * 70, 10 + r() * 30, 0, 0, TAU);
      c.fill();
    }
    // the dado: a darker green, peeling to bare block in patches
    c.fillStyle = '#8c9e90';
    c.fillRect(-600, -96, 940, 96);
    c.fillStyle = '#6f8074';
    c.fillRect(-600, -99, 940, 4);
    // bare patches: concrete block and, in one place, red brick
    const patches = [[-470, -240, 90, 130, 0], [-120, -200, 70, 110, 1], [190, -190, 110, 150, 0], [-330, -90, 80, 80, 1], [60, -60, 70, 60, 0]];
    for (const [px, py, pw, ph, brick] of patches) {
      c.save();
      c.beginPath();
      c.moveTo(px, py + ph * 0.2);
      for (let i = 0; i <= 8; i++) c.lineTo(px + (pw * i) / 8, py + (i % 2 ? 0 : ph * 0.12) + r() * 8);
      for (let i = 8; i >= 0; i--) c.lineTo(px + (pw * i) / 8 + (r() - 0.5) * 6, py + ph + (i % 2 ? 0 : 10) * r());
      c.closePath();
      c.clip();
      c.fillStyle = brick ? '#a4685a' : '#8d897f';
      c.fillRect(px - 10, py - 10, pw + 20, ph + 30);
      c.fillStyle = 'rgba(40,30,22,0.35)';
      const bh = brick ? 9 : 16;
      for (let y = py; y < py + ph + 20; y += bh) {
        c.fillRect(px - 10, y, pw + 20, 1.2);
        for (let x = px - 10 + ((Math.round((y - py) / bh) % 2) * (brick ? 12 : 20)); x < px + pw + 10; x += brick ? 24 : 40) c.fillRect(x, y, 1.2, bh);
      }
      c.restore();
      c.strokeStyle = 'rgba(40,36,28,0.4)';
      c.lineWidth = 1;
      c.strokeRect(px, py, 0, 0);
    }
    // the ghosts of things that hung here: pale rectangles on soot
    for (const [gx, gy, gw, gh] of [[-60, -190, 46, 34], [-10, -178, 24, 24]]) {
      c.fillStyle = 'rgba(80,70,52,0.22)';
      c.fillRect(gx - 3, gy - 3, gw + 6, gh + 6);
      c.fillStyle = 'rgba(235,238,215,0.5)';
      c.fillRect(gx, gy, gw, gh);
      c.fillStyle = '#4a4036';
      c.fillRect(gx + gw / 2 - 1, gy - 6, 2, 4);
    }
    // soot streaks above and damp below
    for (const sx of [-380, -90, 140, 260]) {
      const sg = c.createLinearGradient(0, -280, 0, -80);
      sg.addColorStop(0, 'rgba(30,26,22,0.4)');
      sg.addColorStop(1, 'rgba(30,26,22,0)');
      c.fillStyle = sg;
      c.beginPath();
      c.ellipse(sx, -280, 36, 120, 0, 0, TAU);
      c.fill();
    }
    const dg = c.createLinearGradient(0, -90, 0, 0);
    dg.addColorStop(0, 'rgba(50,44,36,0)');
    dg.addColorStop(1, 'rgba(50,44,36,0.4)');
    c.fillStyle = dg;
    c.fillRect(-600, -90, 940, 90);
    // an electric socket and its torn cable
    c.fillStyle = '#e8e2cf';
    c.fillRect(-150, -62, 14, 14);
    c.fillStyle = '#4a4338';
    c.fillRect(-146, -57, 2, 2);
    c.fillRect(-141, -57, 2, 2);
    c.strokeStyle = '#2a2824';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-143, -62);
    c.bezierCurveTo(-140, -110, -170, -130, -160, -190);
    c.stroke();
    // cracks, the main one to the vine: floor to ceiling, widening upward
    c.strokeStyle = 'rgba(14,10,8,0.7)';
    c.lineWidth = 1.5;
    let cx = 98;
    let cy = 0;
    c.beginPath();
    c.moveTo(cx, cy);
    for (let i = 0; i < 10; i++) {
      cx += (r() - 0.45) * 14;
      cy -= 22 + r() * 8;
      c.lineTo(cx, cy);
    }
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(94, 0);
    c.lineTo(100, -26);
    c.lineTo(93, -50);
    c.lineTo(104, -34);
    c.fill();
    c.restore();
    // the dark where the wall meets the floor
    const ao = c.createLinearGradient(0, -2, 0, 22);
    ao.addColorStop(0, 'rgba(0,0,0,0.3)');
    ao.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = ao;
    c.fillRect(-600, -2, 940, 24);
  });
}

export function drawRubbleRoom(R, g, { k = 0, t = g.time || 0 } = {}) {
  k = clamp(k);
  const sun = smooth(0.35, 1, k);
  R.layer(1);

  // the sky from the east, the far country, the town's roofs
  // (the far layers are built for the street's camera range; keep them in it)
  const camX = R.cam.x;
  R.cam.x = 900 + (camX - RX) * 0.5;
  dawnSky(R, g, k, { sunX: 0.72, sunY: 0.27 });
  R.cam.x = camX;
  R.layer(1);

  // the baked room: floor, back wall
  const shell = roomShell();
  R.paint((c) => c.drawImage(shell, RX - 1200, -400, 2400, 700));
  R.surface((c) => {
    c.moveTo(RX - 600, 0);
    c.lineTo(RX - 600, -330);
    c.lineTo(RX - 110, -330);
    c.lineTo(RX + 240, -230);
    c.lineTo(RX + 334, -60);
    c.lineTo(RX + 334, 0);
  }, 'concrete', { scale: 1.1, seed: 12, alpha: 0.4 });
  R.surface((c) => c.rect(RX - 1200, 0, 2400, 100), 'concrete', { scale: 1.0, seed: 3, alpha: 0.3 });

  const L = (how, fn) => local(R, RX, how, fn);
  const rr = rng(5);

  // ---- the pancaked floors above, and the ceiling slab, rebar hanging
  L('cast', (c) => {
    const r = rng(61);
    // a slab as a polygon: its underside follows the sag at `lift` above the
    // ceiling's top, a thickness, and a broken end at xe
    const upper = (lift, th, xe, col, seed) => {
      const q = rng(seed);
      const top = [];
      const bot = [];
      for (let a = -700; a <= xe; a += 25) {
        const b0 = ceilY(Math.min(a, 215)) - 38 - lift;
        bot.push([a, b0]);
        top.push([a, b0 - th * (1 - 0.35 * smooth(-700, xe, a)) + Math.sin(a * 0.05 + seed) * 2]);
      }
      const tipTop = top[top.length - 1];
      const tipBot = bot[bot.length - 1];
      const tip = raggedLine(q, tipTop[0] + 6, tipTop[1], tipBot[0] - 4, tipBot[1], 5, 12);
      const pts = [...top, ...tip, ...bot.reverse()];
      extrudePoly(c, pts, 8, { color: col });
      c.fillStyle = col;
      poly(c, pts);
      c.fill();
      const sh = c.createLinearGradient(0, tipTop[1] - 40, 0, tipBot[1]);
      sh.addColorStop(0, 'rgba(255,250,235,0.1)');
      sh.addColorStop(1, 'rgba(20,16,12,0.25)');
      c.fillStyle = sh;
      poly(c, pts);
      c.fill();
      c.strokeStyle = 'rgba(255,250,235,0.3)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(top[0][0], top[0][1]);
      for (const p of top) c.lineTo(p[0], p[1]);
      c.stroke();
      // hairline cracks
      c.strokeStyle = 'rgba(14,10,8,0.4)';
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = lerp(-640, xe - 40, q());
        const y = ceilY(Math.min(a, 215)) - 38 - lift - th * 0.5;
        c.beginPath();
        c.moveTo(a, y - th * 0.4);
        c.lineTo(a + 6, y);
        c.lineTo(a - 2, y + th * 0.4);
        c.stroke();
      }
      return pts;
    };
    // crushed debris packed between the floors: dark, with lumps and steel
    const debris = (xe, y0, th) => {
      c.fillStyle = '#4c473f';
      c.beginPath();
      c.moveTo(-700, ceilY(-700) - 38);
      for (let a = -700; a <= xe; a += 25) c.lineTo(a, ceilY(Math.min(a, 215)) - 38 - y0);
      for (let a = xe; a >= -700; a -= 25) c.lineTo(a, ceilY(Math.min(a, 215)) - 38 - y0 + th);
      c.fill();
      for (let i = 0; i < 26; i++) {
        const a = lerp(-690, xe, r());
        const y = ceilY(Math.min(a, 215)) - 38 - y0 + th * r();
        const dv = 84 + r() * 30 | 0;
        c.fillStyle = `rgb(${dv + 6},${dv},${dv - 8})`;
        c.fillRect(a, y, 6 + r() * 14, 3 + r() * 6);
      }
    };
    debris(60, 56, 48);
    // the upper floor, then the one above it, ends broken at different places
    upper(10, 34, 70, '#8f8b82', 3);
    debris(-120, 112, 22);
    upper(60, 36, -130, '#9a968c', 5);
    // a ragged heap of the roof's wreck on top, against the sky
    const heap = [[-700, -470], [-600, -462], [-540, -440], [-470, -446], [-420, -420], [-350, -418], [-300, -392], [-230, -384], [-160, -352], [-130, -330], [-420, -330], [-700, -330]];
    extrudePoly(c, heap, 8, { color: '#8a857b' });
    c.fillStyle = '#8a857b';
    poly(c, heap);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.14)';
    c.fillRect(-700, -470, 100, 2);
    for (let i = 0; i < 14; i++) {
      const a = lerp(-690, -170, r());
      const y = lerp(-440, -350, r() * 0.9 + 0.1);
      c.save();
      c.translate(a, y);
      c.rotate((r() - 0.5) * 0.8);
      const gv = 120 + r() * 26 | 0;
      c.fillStyle = `rgb(${gv + 6},${gv},${gv - 10})`;
      c.fillRect(0, 0, 18 + r() * 28, 8 + r() * 10);
      c.restore();
    }
    // the ground-floor ceiling: the one the room has
    const top = [];
    const bot = [];
    for (let a = -640; a <= 190; a += 20) {
      top.push([a, ceilY(a) - 38]);
      bot.push([a, ceilY(a)]);
    }
    const tip = raggedLine(r, 215, ceilY(215), 232, ceilY(215) - 38, 6, 10);
    const slab = [...top, [212, ceilY(212) - 38], ...tip.reverse(), [215, ceilY(215)], ...bot.reverse()];
    extrudePoly(c, slab, 14, { color: '#a29d92' });
    c.fillStyle = '#a29d92';
    poly(c, slab);
    c.fill();
    // underside in shade, its lip pale
    const ug = c.createLinearGradient(0, -300, 0, -190);
    ug.addColorStop(0, 'rgba(20,16,12,0.3)');
    ug.addColorStop(1, 'rgba(20,16,12,0)');
    c.fillStyle = ug;
    poly(c, slab);
    c.fill();
    c.strokeStyle = 'rgba(255,250,235,0.3)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(top[0][0], top[0][1]);
    for (const p of top) c.lineTo(p[0], p[1]);
    c.stroke();
    // cracks in the slab
    c.strokeStyle = 'rgba(14,10,8,0.5)';
    c.lineWidth = 1.2;
    for (const sx of [-380, -120, 40]) {
      c.beginPath();
      c.moveTo(sx, ceilY(sx));
      c.lineTo(sx + 8, ceilY(sx) - 12);
      c.lineTo(sx - 3, ceilY(sx) - 26);
      c.stroke();
    }
    // a hanging chunk of the ceiling, still tied by its steel
    const hx = -20;
    c.save();
    c.translate(hx, ceilY(hx) + 4);
    c.rotate(0.07);
    c.fillStyle = '#8f8a80';
    poly(c, [[0, 0], [46, 2], [40, 24], [22, 34], [4, 22]]);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.18)';
    c.fillRect(0, 0, 46, 2);
    c.restore();
  });

  // the rebar: hanging from the slab's underside like roots, swaying a hair
  L('cast', (c) => {
    const r = rng(88);
    c.lineCap = 'round';
    const bars = [];
    for (let i = 0; i < 26; i++) {
      const a = i < 20 ? lerp(-420, 212, r()) : lerp(150, 214, r());
      bars.push([a, ceilY(a) + 1, 14 + r() * (i > 17 ? 80 : 46), (r() - 0.5) * 24, i]);
    }
    for (const [a, y0, len, bend, i] of bars) {
      const sw = Math.sin(t * 0.7 + i * 1.3) * 1.4;
      c.strokeStyle = i % 3 ? '#4a3626' : '#6a4a30';
      c.lineWidth = i % 4 ? 1.7 : 2.4;
      c.beginPath();
      c.moveTo(a, y0);
      c.bezierCurveTo(a + bend * 0.3, y0 + len * 0.4, a + bend + sw, y0 + len * 0.7, a + bend * 1.2 + sw * 2, y0 + len);
      c.stroke();
      // a curl at the end
      c.beginPath();
      c.arc(a + bend * 1.2 + sw * 2 + 2, y0 + len, 2.4, Math.PI, Math.PI * 2.8);
      c.stroke();
    }
    // a few crossed tie-wires
    c.strokeStyle = 'rgba(40,30,22,0.8)';
    c.lineWidth = 1;
    for (const a of [-300, 60, 170]) {
      c.beginPath();
      c.moveTo(a, ceilY(a) + 2);
      c.lineTo(a + 24, ceilY(a) + 14);
      c.moveTo(a + 6, ceilY(a) + 2);
      c.lineTo(a - 14, ceilY(a) + 12);
      c.stroke();
    }
  });

  // a torn curtain at the edge, stirring in the first air of the day
  L('paint', (c) => {
    const x = 222;
    const y = ceilY(215) + 2;
    const sw = Math.sin(t * 0.9) * 5 + Math.sin(t * 2.1) * 1.6;
    c.fillStyle = '#6f9a98';
    c.beginPath();
    c.moveTo(x - 24, y);
    c.lineTo(x + 6, y);
    c.quadraticCurveTo(x + 10 + sw, y + 40, x + 4 + sw * 1.6, y + 78);
    c.lineTo(x - 2 + sw * 1.4, y + 92);
    c.lineTo(x - 8 + sw * 1.2, y + 70);
    c.lineTo(x - 14 + sw, y + 98);
    c.quadraticCurveTo(x - 22, y + 44, x - 24, y);
    c.fill();
    c.fillStyle = 'rgba(255,255,235,0.2)';
    c.fillRect(x - 18, y, 8, 40);
    c.fillStyle = '#4a4036';
    c.fillRect(x - 28, y - 3, 38, 3);
  });

  // ---- the standing wall Sami sits against: a partition's end, with its face
  L('cast', (c) => {
    const x0 = -232;
    const w = 36;
    const top = ceilY(-214) + 2;
    const pts = [[x0, 0], [x0, top + 6], [x0 + 10, top - 4], [x0 + 22, top + 8], [x0 + w, top], [x0 + w, 0]];
    extrudePoly(c, pts, 74, { color: '#9a9488' });
    c.fillStyle = '#a6a095';
    poly(c, pts);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.16)';
    c.fillRect(x0, top + 4, w, 2);
    // the cut of the block: courses and a scrap of old paper
    c.fillStyle = 'rgba(40,34,26,0.3)';
    for (let y = -20; y > top; y -= 20) c.fillRect(x0, y, w, 1.2);
    c.fillStyle = '#cfae7a';
    c.fillRect(x0 + 4, -168, 14, 46);
    c.fillStyle = 'rgba(120,70,40,0.5)';
    for (const yy of [-160, -148, -136]) c.fillRect(x0 + 6, yy, 10, 3);
    // a light switch left at hand height
    c.fillStyle = '#e8e2cf';
    c.fillRect(x0 + 24, -110, 8, 12);
  });

  // ---- the interior pile, the fallen façade's ramp, lumps of concrete
  const surfPts = SURF.map(([a, y]) => [a, y]);
  L('cast', (c) => {
    const r = rng(14);
    const heapPoly = [...surfPts, [30, 2], [560, 6], [572, 8]];
    extrudePoly(c, heapPoly, 16, { color: '#9d978b' });
    c.fillStyle = '#948e82';
    poly(c, heapPoly);
    c.fill();
    // broken slabs stacked in the pile, each with its lit top and shaded edge
    const chunks = [[255, -62, 62, 18, -0.4], [200, -44, 56, 16, 0.12], [150, -30, 50, 14, -0.1], [95, -26, 46, 14, 0.15], [300, -84, 44, 14, 0.4], [60, -30, 34, 10, 0.2]];
    for (const [cx, cy, cw, ch, ro] of chunks) {
      c.save();
      c.translate(cx, cy);
      c.rotate(ro);
      extrudeRect(c, -cw / 2, 0, cw, ch, 8, { color: '#a8a296' });
      c.fillStyle = `rgb(${160 + r() * 20 | 0},${154 + r() * 18 | 0},${142 + r() * 16 | 0})`;
      c.fillRect(-cw / 2, 0, cw, ch);
      c.fillStyle = 'rgba(255,250,235,0.3)';
      c.fillRect(-cw / 2, 0, cw, 1.6);
      c.fillStyle = 'rgba(30,24,18,0.3)';
      c.fillRect(cw / 2 - 2, 0, 2, ch);
      c.restore();
    }
    // the fallen façade: a thick slab lying outward, a ramp
    c.save();
    c.translate(RAMP_A[0], RAMP_A[1]);
    const phi = Math.atan2(RAMP_B[1] - RAMP_A[1], RAMP_B[0] - RAMP_A[0]);
    c.rotate(phi);
    const len = Math.hypot(RAMP_B[0] - RAMP_A[0], RAMP_B[1] - RAMP_A[1]) + 18;
    const rp = [[-6, 0], [len, 0], [len + 6, 14], [len - 4, 26], [-2, 26]];
    extrudePoly(c, rp, 22, { color: '#b0aa9e' });
    c.fillStyle = '#b0aa9e';
    poly(c, rp);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.35)';
    c.fillRect(-6, 0, len, 2);
    // the window frames set into it, seen edge-on: dark notches
    c.fillStyle = 'rgba(30,24,20,0.5)';
    for (const wx of [46, 150]) c.fillRect(wx, 0, 36, 8);
    c.fillStyle = '#7a5a40';
    c.fillRect(48, 0, 3, 8);
    // the balcony's railing, bent, sticking out at the far end
    c.strokeStyle = '#2a2824';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(len - 40, 0);
    c.lineTo(len - 40, -26);
    c.lineTo(len + 2, -34);
    c.moveTo(len - 20, 0);
    c.lineTo(len - 20, -30);
    c.stroke();
    c.restore();
  });
  R.surface((c) => {
    c.moveTo(RX + 30, -37);
    for (const [a, y] of SURF.slice().reverse()) c.lineTo(RX + a, y);
    c.lineTo(RX + 572, 8);
    c.lineTo(RX + 30, 2);
  }, 'concrete', { scale: 0.9, seed: 8, alpha: 0.55 });

  // ---- the slab he sits on: leaning on two lumps, against the standing wall
  L('cast', (c) => {
    const r = rng(33);
    // two blocks under it
    for (const [bx, bw, bh] of [[-170, 40, 18], [-6, 44, 14]]) {
      c.fillStyle = '#8b857a';
      c.fillRect(bx, -bh, bw, bh);
      c.fillStyle = 'rgba(255,250,235,0.2)';
      c.fillRect(bx, -bh, bw, 1.4);
    }
    const sl = [[SLAB.x0, -41], [SLAB.x1, SLAB.top + 4], [SLAB.x1 + 8, SLAB.top + 16], [SLAB.x1 - 2, SLAB.top + 28], [SLAB.x0 + 6, -14]];
    extrudePoly(c, sl, 26, { color: '#aaa498' });
    c.fillStyle = '#aaa498';
    poly(c, sl);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.38)';
    c.beginPath();
    c.moveTo(SLAB.x0, -41);
    c.lineTo(SLAB.x1, SLAB.top + 4);
    c.lineTo(SLAB.x1, SLAB.top + 7);
    c.lineTo(SLAB.x0, -38);
    c.fill();
    // the cut end, with steel stubs
    c.strokeStyle = '#4a3626';
    c.lineWidth = 2;
    for (const dy of [8, 16, 23]) {
      c.beginPath();
      c.moveTo(SLAB.x1 + 4, SLAB.top + dy);
      c.lineTo(SLAB.x1 + 14 + r() * 8, SLAB.top + dy + (r() - 0.5) * 10);
      c.stroke();
    }
    // old dirt and chips on the top
    c.fillStyle = 'rgba(70,56,40,0.28)';
    for (let i = 0; i < 14; i++) c.fillRect(SLAB.x0 + 8 + r() * 200, -39 + r() * 3, 3 + r() * 9, 1.4);
    // sitting-worn: a polished patch
    c.fillStyle = 'rgba(255,248,230,0.12)';
    c.fillRect(-170, -40, 56, 2);
  });
  R.surface((c) => {
    c.moveTo(RX + SLAB.x0, -41);
    c.lineTo(RX + SLAB.x1, SLAB.top + 4);
    c.lineTo(RX + SLAB.x1, SLAB.top + 28);
    c.lineTo(RX + SLAB.x0, -14);
  }, 'concrete', { scale: 0.7, seed: 21, alpha: 0.6 });

  // ---- the living room, what is left of it
  // rug: pushed under the debris, a corner curled over
  L('cast', (c) => {
    const rug = [[-408, 8], [-262, 8], [-246, 46], [-420, 46]];
    c.fillStyle = '#7d2f2b';
    poly(c, rug);
    c.fill();
    c.fillStyle = '#233a5a';
    poly(c, [[-396, 14], [-268, 14], [-257, 40], [-406, 40]]);
    c.fill();
    c.fillStyle = '#c99a4a';
    c.lineWidth = 1.2;
    c.strokeStyle = '#c99a4a';
    for (let i = 0; i < 4; i++) {
      const x = -380 + i * 34;
      c.beginPath();
      c.moveTo(x, 27);
      c.lineTo(x + 12, 19);
      c.lineTo(x + 24, 27);
      c.lineTo(x + 12, 36);
      c.closePath();
      c.stroke();
    }
    // fringe, and the grit lying on it
    c.strokeStyle = '#d8c9a4';
    c.lineWidth = 0.9;
    for (let x = -408; x < -262; x += 5) {
      c.beginPath();
      c.moveTo(x, 8);
      c.lineTo(x - 0.5, 4);
      c.stroke();
    }
    c.fillStyle = 'rgba(150,130,100,0.35)';
    poly(c, rug);
    c.fill();
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(190,175,150,0.2)';
      c.fillRect(-420 + Math.sin(i * 12.9) * 100 + 100, 8 + ((i * 7) % 38), 6 + (i % 5) * 3, 2);
    }
    // the curled corner
    c.fillStyle = '#6a2824';
    c.beginPath();
    c.ellipse(-254, 38, 14, 6, -0.4, 0, TAU);
    c.fill();
  });
  // the sofa: ochre, torn, its left arm slumped and one end down on a broken leg
  L('cast', (c) => {
    const x = -566;
    c.save();
    c.translate(x, 0);
    c.rotate(0.035);
    const col = '#a56f3c';
    // front-on: back, seat, two arms, little legs
    extrudeRect(c, 0, -86, 214, 78, 10, { color: col });
    c.fillStyle = '#9a6535';
    c.fillRect(0, -86, 214, 78);
    // back cushions
    c.fillStyle = '#b98449';
    c.beginPath();
    c.roundRect(26, -86, 78, 44, [10, 10, 2, 2]);
    c.fill();
    c.save();
    c.translate(112, -44);
    c.rotate(-0.1);
    c.beginPath();
    c.roundRect(0, -42, 76, 42, [10, 10, 2, 2]);
    c.fill();
    c.restore();
    // seat cushions
    c.fillStyle = '#c0894c';
    c.fillRect(24, -44, 82, 18);
    c.fillRect(108, -46, 84, 20);
    c.fillStyle = 'rgba(255,240,200,0.3)';
    c.fillRect(24, -44, 82, 1.6);
    c.fillRect(108, -46, 84, 1.6);
    // arms: the left collapsed to a slump, the right upright
    c.fillStyle = '#8c5a2e';
    poly(c, [[0, -8], [0, -48], [8, -58], [24, -52], [26, -8]]);
    c.fill();
    c.fillRect(192, -76, 22, 68);
    c.fillStyle = 'rgba(255,240,200,0.25)';
    c.fillRect(192, -76, 22, 2);
    // the base rail
    c.fillStyle = '#6a4220';
    c.fillRect(0, -14, 214, 8);
    // pattern: faded cream flowers
    c.fillStyle = 'rgba(240,222,180,0.4)';
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.arc(40 + (i % 6) * 28, -68 + Math.floor(i / 6) * 8 + ((i * 5) % 4), 2.4, 0, TAU);
      c.fill();
    }
    // the tear: foam and a spring
    c.fillStyle = '#e0d6bc';
    c.beginPath();
    c.moveTo(4, -50);
    c.lineTo(10, -64);
    c.lineTo(15, -54);
    c.lineTo(20, -66);
    c.lineTo(24, -50);
    c.fill();
    c.strokeStyle = '#4a4036';
    c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i < 5; i++) c.arc(150 + i * 0.4, -56 + i * 2, 4 + i * 0.3, 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(70, -30);
    c.lineTo(80, -40);
    c.lineTo(90, -32);
    c.stroke();
    // legs
    c.fillStyle = '#3e2818';
    c.fillRect(10, -6, 10, 8);
    c.fillRect(196, -6, 10, 4);
    // dust settled on every top
    c.fillStyle = 'rgba(200,190,170,0.3)';
    c.fillRect(0, -86, 214, 78);
    c.fillStyle = 'rgba(255,250,235,0.2)';
    c.fillRect(0, -86, 214, 2);
    c.restore();
    // a lump of ceiling that fell across the left end
    c.fillStyle = '#8f8a80';
    poly(c, [[-596, 0], [-580, -36], [-548, -60], [-524, -32], [-506, 0]]);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.22)';
    c.beginPath();
    c.moveTo(-580, -36);
    c.lineTo(-548, -60);
    c.lineTo(-544, -57);
    c.lineTo(-576, -33);
    c.fill();
    c.strokeStyle = '#4a3626';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-554, -59);
    c.quadraticCurveTo(-548, -82, -536, -88);
    c.stroke();
  });
  // the framed photograph, face down: leaning on a lump of plaster, we see its back
  L('cast', (c) => {
    c.fillStyle = '#9a9488';
    poly(c, [[-282, 0], [-276, -17], [-262, -24], [-250, -10], [-246, 0]]);
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.25)';
    c.fillRect(-276, -17, 12, 1.6);
    c.save();
    c.translate(-308, 3);
    c.rotate(-0.62);
    c.fillStyle = '#b8924a';
    c.fillRect(0, -36, 30, 36);
    c.fillStyle = '#7a5a2e';
    c.fillRect(0, -36, 30, 3);
    c.fillStyle = '#a28660';
    c.fillRect(3, -33, 24, 30);
    c.fillStyle = 'rgba(40,28,16,0.3)';
    c.fillRect(3, -33, 24, 1.4);
    c.strokeStyle = '#3a2c1e';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(8, -30);
    c.lineTo(15, -37);
    c.lineTo(22, -30);
    c.stroke();
    c.fillStyle = '#2a2420';
    c.fillRect(11, -16, 8, 6);
    c.restore();
    // glass, splintered, lying in the dirt
    c.fillStyle = 'rgba(220,235,240,0.5)';
    poly(c, [[-300, 6], [-290, 4], [-284, 8], [-294, 10]]);
    c.fill();
    poly(c, [[-330, 10], [-322, 8], [-320, 12]]);
    c.fill();
  });

  // ---- the vine: out of the crack in the wall, up and over the pile's edge
  const vr = rng(19);
  const stems = [
    [[98, -22], [96, -64], [112, -100], [92, -142], [104, -188]],
    [[98, -22], [118, -44], [150, -52], [186, -60], [214, -88]],
    [[96, -80], [70, -100], [58, -132], [74, -164]],
    [[106, -112], [136, -128], [158, -150], [150, -184]],
  ];
  const leaves = [];
  for (let s = 0; s < stems.length; s++) {
    const st = stems[s];
    for (let i = 0; i < 16; i++) {
      const u = (i + 1) / 17;
      const seg = Math.min(st.length - 2, Math.floor(u * (st.length - 1)));
      const lu = u * (st.length - 1) - seg;
      const x = lerp(st[seg][0], st[seg + 1][0], lu) + (vr() - 0.5) * 20;
      const y = lerp(st[seg][1], st[seg + 1][1], lu) + (vr() - 0.5) * 18;
      leaves.push([x, y, 11 + vr() * 8, vr() * TAU, s + i]);
    }
  }
  L('cast', (c) => {
    c.lineCap = 'round';
    c.strokeStyle = '#5a4a30';
    c.lineWidth = 2.6;
    for (const st of stems) {
      c.beginPath();
      c.moveTo(st[0][0], st[0][1]);
      for (let i = 1; i < st.length; i++) c.quadraticCurveTo(st[i - 1][0] + (st[i][0] - st[i - 1][0]) * 0.2 + 8, st[i - 1][1] + (st[i][1] - st[i - 1][1]) * 0.6, st[i][0], st[i][1]);
      c.stroke();
    }
    c.lineWidth = 0.9;
    c.strokeStyle = '#7a9a40';
    for (const [x, y, s, , i] of leaves) {
      if (i % 3) continue;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + 10, y + 6, x + 12, y - 8, x + 4, y - 12);
      c.stroke();
    }
    leaves.forEach(([x, y, s, rot, i]) => {
      const sw = Math.sin(t * 1.1 + i) * 0.1;
      leaf(c, x, y, s, rot + sw, i % 2 ? '#5b7a34' : '#6a8a3c');
    });
    // small green grapes among the leaves
    c.fillStyle = '#9ab04a';
    for (const [gx, gy] of [[88, -120], [124, -62]]) {
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.arc(gx + ((i % 3) - 1) * 3.6, gy + Math.floor(i / 3) * 4, 2.6, 0, TAU);
        c.fill();
      }
    }
  });

  // weeds and a few sprouts on the pile: dust has become dirt
  L('paint', (c) => {
    const r = rng(44);
    for (let i = 0; i < 46; i++) {
      const a = lerp(40, 480, r());
      let y = 0;
      for (let q = 0; q < SURF.length - 1; q++) {
        const [a0, y0] = SURF[q];
        const [a1, y1] = SURF[q + 1];
        if (a <= Math.max(a0, a1) && a >= Math.min(a0, a1)) y = lerp(y0, y1, (a - a0) / (a1 - a0));
      }
      c.strokeStyle = r() < 0.5 ? '#6f8a3e' : '#92a850';
      c.lineWidth = 1.2;
      for (let q = 0; q < 3; q++) {
        c.beginPath();
        c.moveTo(a + q * 2, y + 1);
        c.lineTo(a + q * 2 + (r() - 0.5) * 7 + Math.sin(t + i) * 0.8, y - 4 - r() * 8);
        c.stroke();
      }
    }
  });

  // dust in the air all through the room: always a little, in the light a lot
  const lit = sun;
  R.glow((c) => {
    c.save();
    c.translate(RX, 0);
    // the beam: from the opening between the ceiling's tip and the pile's top
    // edge, falling leftward to the wall
    if (lit > 0.01) {
      const bx0 = -190;
      const poly_ = [[330, beamU(330)], [bx0, beamU(bx0)], [bx0, Math.min(0, beamL(bx0))], [330, Math.min(0, beamL(330))]];
      c.save();
      poly(c, poly_);
      c.clip();
      const bg = c.createLinearGradient(330, -130, bx0, -10);
      bg.addColorStop(0, `rgba(255,214,130,${0.26 * lit})`);
      bg.addColorStop(1, `rgba(255,190,110,${0.16 * lit})`);
      c.fillStyle = bg;
      c.fillRect(bx0, -340, 540, 400);
      c.restore();
      // striations in the shaft, drifting
      c.save();
      poly(c, poly_);
      c.clip();
      for (let i = 0; i < 5; i++) {
        const off = Math.sin(t * 0.2 + i * 1.9) * 8 + i * 22 - 40;
        c.fillStyle = `rgba(255,224,160,${0.05 * lit})`;
        c.beginPath();
        c.moveTo(330, beamU(330) + off + 10);
        c.lineTo(bx0, beamU(bx0) + off + 10);
        c.lineTo(bx0, beamU(bx0) + off + 20);
        c.lineTo(330, beamU(330) + off + 24);
        c.fill();
      }
      c.restore();
      // where it lands on the back wall: a band that keeps the shape of the opening
      c.save();
      c.beginPath();
      c.rect(bx0 + 2, -320, 520, 320);
      c.clip();
      const wp = [[326, beamU(326)], [bx0, beamU(bx0)], [bx0, 0], [60, 0], [326, beamL(326) > 0 ? 0 : beamL(326)]];
      // upper edge soft: two passes
      const wg = c.createLinearGradient(330, 0, bx0, 0);
      wg.addColorStop(0, `rgba(255,190,100,${0.2 * lit})`);
      wg.addColorStop(1, `rgba(255,180,90,${0.28 * lit})`);
      c.fillStyle = wg;
      c.filter = 'blur(2px)';
      poly(c, wp);
      c.fill();
      c.restore();
      // the lit leaves
      for (const [x, y, s, , i] of leaves) {
        if (!inBeam(x, y)) continue;
        c.fillStyle = `rgba(215,240,110,${0.07 * lit})`;
        c.beginPath();
        c.ellipse(x, y - s * 0.4, s * 0.55, s * 0.7, 0, 0, TAU);
        c.fill();
      }
      // a rim of gold on the ramp and the pile where the sun lands
      c.strokeStyle = `rgba(255,222,150,${0.55 * lit})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(SURF[0][0], SURF[0][1] - 1);
      for (const p of SURF) c.lineTo(p[0], p[1] - 1);
      c.stroke();
    }
    // motes
    const mr = rng(91);
    for (let i = 0; i < 90; i++) {
      const u = mr();
      const v = mr();
      const sp = 0.4 + mr() * 0.8;
      const x = lerp(-180, 330, (u + t * 0.004 * sp) % 1);
      const yTop = beamU(x);
      const yBot = Math.min(-4, beamL(x));
      const y = lerp(yTop, yBot, v) + Math.sin(t * 0.7 * sp + i) * 5;
      const inside = y > yTop && y < yBot;
      const a = (inside ? 0.7 * lit : 0.1) * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 2.3));
      if (a < 0.02) continue;
      c.fillStyle = `rgba(255,238,195,${a})`;
      c.fillRect(x, y, 1.7, 1.7);
    }
    c.restore();
  });
}

// Light: pre-dawn cool, then the sun through the opening, a diagonal gold.
export function rubbleLook(g, k = 0) {
  k = clamp(k);
  const sun = smooth(0.4, 1, k);
  const t = g.time || 0;
  const lights = [
    // the sun, far to the right, low: it rakes across rubble and wall
    { x: RX + 1500, y: -110 + 60 * (1 - sun), color: [1.0, 0.72, 0.4], intensity: 1.15 * sun, radius: 0, project: 1.04, soft: 0.004, rim: 1.0 },
    // the sky's own cool light from the opening
    { x: RX + 420, y: -240, color: mixc([0.4, 0.5, 0.9], [0.7, 0.72, 0.85], k), intensity: 0.5, radius: 0.8, project: 0.6, soft: 0.006, rim: 0.4 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: mixc([0.13, 0.15, 0.26], [0.19, 0.2, 0.28], smooth(0, 1, k)),
    lights: lights.slice(0, 4),
    groundShadow: 0.65,
    bloom: lerp(0.45, 0.6, k),
    exposure: 1.0,
    grain: 0.06,
    time: t,
    grade: {
      sat: lerp(0.8, 1.05, k),
      contrast: 1.04,
      lift: 0.01,
      tint: mixc([0.94, 0.98, 1.08], [1.06, 0.99, 0.9], k),
      shadows: [0.9, 0.95, 1.1],
      highs: [1.06, 1.0, 0.9],
    },
    god: sun > 0.05 ? { x: RX + 420, y: -80, strength: 0.08 * sun } : null,
    fog: { density: lerp(0.08, 0.03, k), height: 160, color: mixc([0.25, 0.3, 0.45], [0.62, 0.5, 0.38], k) },
  };
}

// =====================================================================
// 3. THE PHOTOGRAPHS
// =====================================================================
//
// Eleven small paintings, in a flat, tender hand: no faces, no people in
// detail, each readable at a glance. All are drawn on a 400 x 300 plan and
// scaled to cover the area they are given. The still part is painted once
// and kept; what moves (smoke, dust, stars) is drawn over it every frame.

const PW = 400;
const PH = 300;

const grad = (c, x0, y0, x1, y1, stops) => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [p, col] of stops) g.addColorStop(p, col);
  return g;
};
const rad = (c, x, y, r0, r1, stops) => {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  for (const [p, col] of stops) g.addColorStop(p, col);
  return g;
};
const skyFill = (c, stops) => {
  c.fillStyle = grad(c, 0, 0, 0, PH, stops);
  c.fillRect(0, 0, PW, PH);
};
const halo = (c, x, y, r, col, a) => {
  c.fillStyle = rad(c, x, y, 0, r, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]);
  c.fillRect(x - r, y - r, r * 2, r * 2);
};
const blobPath = (c, pts) => {
  c.beginPath();
  c.moveTo((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
};

// A person as a silhouette: no face, just the shape of one. (x, y) at the
// feet; h the height; pose 'stand' | 'crouch' | 'back' (seen from behind).
function figure(c, x, y, h, col, { pose = 'stand', scarf = false, face = 1, rim = null } = {}) {
  c.save();
  c.translate(x, y);
  c.fillStyle = col;
  if (pose === 'crouch') {
    const u = h / 60;
    c.beginPath();
    c.ellipse(face * 4 * u, -48 * u, 7 * u, 8 * u, 0, 0, TAU); // head
    c.fill();
    c.beginPath();
    c.moveTo(-8 * u, -2 * u);
    c.quadraticCurveTo(-12 * u, -30 * u, -2 * u, -40 * u);
    c.quadraticCurveTo(face * 12 * u, -42 * u, face * 16 * u, -28 * u);
    c.lineTo(face * 22 * u, -4 * u);
    c.lineTo(face * 6 * u, 0);
    c.lineTo(-8 * u, 0);
    c.closePath();
    c.fill();
    // arm reaching to the ground
    c.strokeStyle = col;
    c.lineWidth = 4 * u;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(face * 8 * u, -34 * u);
    c.lineTo(face * 22 * u, -14 * u);
    c.stroke();
  } else {
    const u = h / 100;
    // legs
    c.beginPath();
    c.moveTo(-9 * u, 0);
    c.lineTo(-8 * u, -46 * u);
    c.lineTo(9 * u, -46 * u);
    c.lineTo(9 * u, 0);
    c.lineTo(2 * u, 0);
    c.lineTo(0, -34 * u);
    c.lineTo(-3 * u, 0);
    c.closePath();
    c.fill();
    // torso, a coat or a long dress
    c.beginPath();
    c.moveTo(-14 * u, -44 * u);
    c.quadraticCurveTo(-17 * u, -72 * u, -9 * u, -80 * u);
    c.lineTo(9 * u, -80 * u);
    c.quadraticCurveTo(17 * u, -72 * u, 14 * u, -44 * u);
    c.closePath();
    c.fill();
    if (scarf) {
      c.beginPath();
      c.moveTo(-15 * u, -56 * u);
      c.quadraticCurveTo(-20 * u, -84 * u, 0, -96 * u);
      c.quadraticCurveTo(20 * u, -84 * u, 15 * u, -56 * u);
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.ellipse(0, -88 * u, 8 * u, 9.5 * u, 0, 0, TAU);
    c.fill();
    // arms
    c.strokeStyle = col;
    c.lineWidth = 5 * u;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-13 * u, -72 * u);
    c.lineTo(-16 * u, -44 * u);
    c.moveTo(13 * u, -72 * u);
    c.lineTo(15 * u, -44 * u);
    c.stroke();
  }
  if (rim) {
    c.fillStyle = rim;
    c.globalAlpha = 0.5;
    c.fillRect(-14 * (h / 100), -90 * (h / 100), 2, 80 * (h / 100));
  }
  c.restore();
}

// A leather shoe, side-on, toe to the right (flip to turn it).
function shoe(c, x, y, s, { flip = false, col = '#5e3a20', dust = 0.35, light = 'rgba(255,214,150,0.55)' } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(flip ? -s : s, s);
  // the upper
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(0, -4);
  c.lineTo(2, -26);
  c.quadraticCurveTo(6, -34, 16, -32); // the collar
  c.quadraticCurveTo(22, -30, 26, -24); // the tongue
  c.quadraticCurveTo(40, -24, 52, -17); // the vamp
  c.quadraticCurveTo(66, -12, 68, -5); // the toe cap
  c.lineTo(68, -3);
  c.lineTo(0, -3);
  c.closePath();
  c.fill();
  // heel counter, a shade darker
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath();
  c.moveTo(0, -4);
  c.lineTo(2, -26);
  c.quadraticCurveTo(8, -30, 14, -28);
  c.lineTo(12, -4);
  c.fill();
  // the sole and heel
  c.fillStyle = '#241812';
  c.fillRect(-1, -4, 70, 4.4);
  c.fillRect(-1, -2, 17, 6);
  c.fillStyle = 'rgba(255,220,170,0.25)';
  c.fillRect(0, -4.4, 68, 0.9);
  // lit top edge
  c.strokeStyle = light;
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(2, -26);
  c.quadraticCurveTo(6, -34, 16, -32);
  c.quadraticCurveTo(22, -30, 26, -24);
  c.quadraticCurveTo(40, -24, 52, -17);
  c.quadraticCurveTo(64, -12, 68, -6);
  c.stroke();
  // laces: three pale bars
  c.fillStyle = 'rgba(230,214,176,0.85)';
  for (const lx of [27, 33, 39]) {
    c.save();
    c.translate(lx, -23);
    c.rotate(0.16);
    c.fillRect(0, 0, 4.2, 1.5);
    c.restore();
  }
  // cracks across the vamp: dark lines with a pale lip
  c.lineWidth = 0.9;
  for (const [cx, cy, l] of [[44, -18, 8], [50, -15, 7], [36, -20, 6], [58, -11, 6]]) {
    c.strokeStyle = 'rgba(20,10,4,0.75)';
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + l * 0.4, cy + l * 0.5);
    c.lineTo(cx + l * 0.2, cy + l);
    c.stroke();
    c.strokeStyle = 'rgba(255,225,180,0.28)';
    c.beginPath();
    c.moveTo(cx + 1, cy);
    c.lineTo(cx + l * 0.4 + 1, cy + l * 0.5);
    c.lineTo(cx + l * 0.2 + 1, cy + l);
    c.stroke();
  }
  // the grey of dust, settled on every top and caught in the cracks
  c.fillStyle = `rgba(190,176,152,${dust})`;
  c.beginPath();
  c.moveTo(2, -26);
  c.quadraticCurveTo(6, -34, 16, -32);
  c.quadraticCurveTo(22, -30, 26, -24);
  c.quadraticCurveTo(40, -24, 52, -17);
  c.quadraticCurveTo(66, -12, 68, -6);
  c.quadraticCurveTo(40, -20, 2, -22);
  c.closePath();
  c.fill();
  const r = rng(Math.round(x * 3 + y));
  c.fillStyle = `rgba(200,186,160,${dust + 0.1})`;
  for (let i = 0; i < 14; i++) c.fillRect(2 + r() * 64, -3 - r() * 22, 1.2, 1.2);
  c.restore();
}

function rubbleLump(c, x, y, w, h, col, seed = 1) {
  const r = rng(seed);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + w * 0.1, y - h * (0.6 + r() * 0.3));
  c.lineTo(x + w * 0.4, y - h);
  c.lineTo(x + w * 0.75, y - h * (0.7 + r() * 0.3));
  c.lineTo(x + w, y);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,248,232,0.2)';
  c.beginPath();
  c.moveTo(x + w * 0.1, y - h * 0.6);
  c.lineTo(x + w * 0.4, y - h);
  c.lineTo(x + w * 0.5, y - h * 0.8);
  c.closePath();
  c.fill();
}

function windowsGrid(c, x, y, cols, rows, w, h, gx, gy, col, broken = 0.2, seed = 1) {
  const r = rng(seed);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      c.fillStyle = col;
      c.fillRect(x + i * gx, y + j * gy, w, h);
      if (r() < broken) {
        c.fillStyle = 'rgba(255,255,255,0.12)';
        c.fillRect(x + i * gx, y + j * gy, w * 0.5, h);
      }
    }
  }
}

// ---------------------------------------------------------------- 0 crater
function photo0(c) {
  skyFill(c, [[0, '#cfc6b4'], [0.55, '#e6dcc4'], [1, '#d6c9ac']]);
  halo(c, 270, 90, 190, '255,244,210', 0.5);
  // broken buildings far off, in dust
  c.fillStyle = '#b9ae9a';
  poly(c, [[0, 170], [0, 60], [40, 52], [58, 90], [86, 84], [110, 130], [150, 124], [168, 170]]);
  c.fill();
  c.fillStyle = '#c4b9a4';
  poly(c, [[236, 170], [250, 96], [290, 88], [300, 120], [338, 104], [360, 140], [400, 130], [400, 170]]);
  c.fill();
  windowsGrid(c, 10, 76, 3, 2, 14, 18, 24, 32, 'rgba(70,60,50,0.55)', 0.4, 3);
  windowsGrid(c, 264, 110, 4, 1, 12, 16, 22, 30, 'rgba(70,60,50,0.5)', 0.3, 4);
  // a floor hanging by its steel
  c.strokeStyle = '#6a5a48';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(168, 150);
  c.lineTo(180, 176);
  c.moveTo(176, 148);
  c.lineTo(194, 170);
  c.stroke();
  c.fillStyle = '#a89c88';
  poly(c, [[110, 130], [170, 124], [190, 146], [112, 150]]);
  c.fill();
  // dust hanging in the air between
  c.fillStyle = grad(c, 0, 120, 0, 190, [[0, 'rgba(225,214,190,0)'], [1, 'rgba(225,214,190,0.8)']]);
  c.fillRect(0, 120, PW, 70);
  // the street, grey with ash, the crater's rim in front
  c.fillStyle = grad(c, 0, 165, 0, PH, [[0, '#b3a78f'], [1, '#85796a']]);
  c.fillRect(0, 165, PW, 135);
  // the crater: a dark bowl, torn asphalt curling at the rim
  c.fillStyle = '#4e463d';
  c.beginPath();
  c.ellipse(190, 232, 150, 44, 0, 0, TAU);
  c.fill();
  c.fillStyle = rad(c, 190, 238, 10, 130, [[0, '#2a241f'], [0.7, '#4a4238'], [1, '#6a5f50']]);
  c.beginPath();
  c.ellipse(190, 236, 128, 34, 0, 0, TAU);
  c.fill();
  // rim lumps
  const r = rng(8);
  for (let i = 0; i < 20; i++) {
    const a = r() * TAU;
    const rx = 190 + Math.cos(a) * (140 + r() * 20);
    const ry = 232 + Math.sin(a) * (40 + r() * 8);
    rubbleLump(c, rx - 10, ry + 4, 18 + r() * 24, 8 + r() * 14, `rgb(${150 + r() * 40 | 0},${140 + r() * 36 | 0},${122 + r() * 30 | 0})`, i + 3);
  }
  // inside: a tilted slab, rebar, a bent bicycle wheel
  c.fillStyle = '#7c7164';
  poly(c, [[120, 238], [168, 228], [180, 244], [130, 252]]);
  c.fill();
  c.strokeStyle = '#2e2620';
  c.lineWidth = 1.6;
  for (const [x0, y0, dx, dy] of [[170, 232, 16, -24], [176, 234, 28, -16], [150, 236, 6, -20]]) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x0 + dx * 0.4, y0 + dy * 0.2, x0 + dx, y0 + dy);
    c.stroke();
  }
  // the single shoe, on the near lip, in the light: a child's, small and brown
  c.fillStyle = 'rgba(40,30,22,0.3)';
  c.beginPath();
  c.ellipse(296, 282, 40, 5, 0, 0, TAU);
  c.fill();
  shoe(c, 262, 280, 1.0, { col: '#7a4a28', dust: 0.5 });
  // a little more grit over everything, and a pale light on the lip
  halo(c, 296, 266, 70, '255,236,190', 0.25);
}
function dyn0(c, t) {
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    const x = (r() * PW + t * (3 + r() * 5)) % PW;
    const y = 90 + ((r() * 160 + Math.sin(t * 0.4 + i) * 6) % 160);
    c.fillStyle = `rgba(240,228,200,${0.25 + 0.2 * Math.sin(t + i)})`;
    c.fillRect(x, y, 1.6, 1.6);
  }
}

// -------------------------------------------------- 1 Layla and the children
function photo1(c) {
  skyFill(c, [[0, '#f0c98f'], [0.5, '#f4d9a6'], [1, '#e2b87a']]);
  halo(c, -20, 60, 330, '255,214,140', 0.7);
  // a long wall behind, warm, patched, with a doorway
  c.fillStyle = '#cfa97a';
  c.fillRect(0, 70, PW, 120);
  c.fillStyle = 'rgba(255,230,180,0.35)';
  c.fillRect(0, 70, PW, 8);
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(120,80,50,0.15)' : 'rgba(255,240,200,0.12)';
    c.fillRect(r() * PW, 80 + r() * 100, 18 + r() * 40, 8 + r() * 14);
  }
  c.fillStyle = '#7a5a40';
  c.fillRect(300, 100, 46, 90);
  c.fillStyle = '#4a3626';
  c.fillRect(304, 106, 38, 84);
  // the ground, dusty gold, long shadows to the right
  c.fillStyle = grad(c, 0, 188, 0, PH, [[0, '#c79a62'], [1, '#9a7448']]);
  c.fillRect(0, 188, PW, 112);
  // heaps of scrap: sheets, pipes, a wheel rim, a pan
  const heaps = [[40, 240, 110], [200, 250, 90], [310, 242, 80]];
  heaps.forEach(([hx, hy, hw], hi) => {
    const q = rng(hi + 20);
    for (let i = 0; i < 16; i++) {
      c.save();
      c.translate(hx + q() * hw, hy - q() * 18);
      c.rotate((q() - 0.5) * 1.2);
      const cl = ['#7e7a74', '#9b6a46', '#5e5a56', '#b08254', '#8c8a86'][Math.floor(q() * 5)];
      c.fillStyle = cl;
      c.fillRect(0, 0, 14 + q() * 26, 3 + q() * 7);
      c.fillStyle = 'rgba(255,230,180,0.4)';
      c.fillRect(0, 0, 10 + q() * 12, 1.2);
      c.restore();
    }
  });
  c.strokeStyle = '#6a625a';
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(256, 224, 11, 0, TAU);
  c.stroke();
  // a basket for the sorted metal
  c.fillStyle = '#8a5a30';
  c.fillRect(150, 238, 30, 18);
  c.fillStyle = '#b8864e';
  c.fillRect(150, 238, 30, 3);
  // shadows
  c.fillStyle = 'rgba(90,50,30,0.25)';
  for (const [sx, sy, sw] of [[110, 262, 70], [230, 268, 50], [300, 270, 60]]) {
    c.beginPath();
    c.ellipse(sx + 30, sy, sw, 6, 0, 0, TAU);
    c.fill();
  }
  // Layla, standing, scarf; three children crouched at the heaps. Silhouettes
  // in warm brown, lit on the left edge.
  const dark = '#4a2e22';
  figure(c, 86, 262, 112, dark, { scarf: true, rim: '#ffd9a0' });
  figure(c, 150, 270, 58, dark, { pose: 'crouch', face: 1 });
  figure(c, 214, 272, 52, dark, { pose: 'crouch', face: -1 });
  figure(c, 284, 270, 50, dark, { pose: 'crouch', face: 1 });
  // she holds a sheet of metal that catches the sun
  c.fillStyle = '#d9c49a';
  poly(c, [[100, 206], [128, 200], [134, 228], [104, 232]]);
  c.fill();
  c.fillStyle = 'rgba(255,248,220,0.7)';
  poly(c, [[100, 206], [114, 203], [116, 230], [104, 232]]);
  c.fill();
}
function dyn1(c, t) {
  const r = rng(3);
  for (let i = 0; i < 30; i++) {
    const x = (r() * PW + t * (2 + r() * 3)) % PW;
    const y = 110 + r() * 150 + Math.sin(t * 0.5 + i) * 5;
    c.fillStyle = `rgba(255,236,190,${0.2 + 0.25 * Math.sin(t * 1.2 + i)})`;
    c.fillRect(x, y, 1.5, 1.5);
  }
}

// ------------------------------------------------------- 2 the field hospital
function photo2(c) {
  c.fillStyle = '#5c7a72';
  c.fillRect(0, 0, PW, PH);
  // the wall: teal paint, a darker dado, peeling, a damp bloom
  c.fillStyle = '#6d8d83';
  c.fillRect(0, 0, PW, 190);
  c.fillStyle = '#41594f';
  c.fillRect(0, 150, PW, 60);
  c.fillStyle = '#2f443c';
  c.fillRect(0, 148, PW, 3);
  const r = rng(9);
  for (let i = 0; i < 34; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(220,210,170,0.1)' : 'rgba(30,40,34,0.1)';
    c.beginPath();
    c.ellipse(r() * PW, r() * 190, 8 + r() * 16, 4 + r() * 8, 0, 0, TAU);
    c.fill();
  }
  // floor, wet-dark
  c.fillStyle = grad(c, 0, 200, 0, PH, [[0, '#3a3a36'], [1, '#26261f']]);
  c.fillRect(0, 200, PW, 100);
  // bare bulb: a pool of warm light high on the left
  halo(c, 110, 40, 210, '255,214,150', 0.55);
  c.strokeStyle = '#1e1c18';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(110, 0);
  c.lineTo(110, 34);
  c.stroke();
  c.fillStyle = '#fff1c4';
  c.beginPath();
  c.arc(110, 40, 6, 0, TAU);
  c.fill();
  // the red crescent on the door at the right
  c.fillStyle = '#d8d0b8';
  c.fillRect(300, 70, 70, 130);
  c.fillStyle = '#8a8470';
  c.fillRect(296, 66, 78, 5);
  c.fillStyle = '#c0332a';
  c.beginPath();
  c.arc(335, 112, 20, 0, TAU);
  c.fill();
  c.fillStyle = '#d8d0b8';
  c.beginPath();
  c.arc(343, 112, 17, 0, TAU);
  c.fill();
  c.fillStyle = '#c0332a';
  c.beginPath();
  c.arc(338, 112, 7, 0, TAU);
  c.fill();
  // a cot with a sheet, a drip stand
  c.fillStyle = '#3a3a3a';
  c.fillRect(214, 190, 4, 40);
  c.fillRect(300, 190, 4, 40);
  c.fillStyle = '#d6d2c4';
  c.fillRect(204, 176, 112, 18);
  c.fillStyle = '#aaa698';
  c.fillRect(204, 190, 112, 5);
  c.fillStyle = '#e4e0d2';
  c.fillRect(204, 172, 40, 6);
  c.strokeStyle = '#2a2a28';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(34, 220);
  c.lineTo(34, 92);
  c.moveTo(24, 220);
  c.lineTo(44, 220);
  c.moveTo(34, 96);
  c.lineTo(50, 96);
  c.stroke();
  c.fillStyle = 'rgba(210,225,230,0.8)';
  c.beginPath();
  c.roundRect(44, 96, 14, 26, 4);
  c.fill();
  c.fillStyle = 'rgba(150,190,210,0.7)';
  c.fillRect(46, 106, 10, 14);
  // the medic: leaning on the wall, a long white coat gone grey, in profile
  c.save();
  c.translate(150, 250);
  c.fillStyle = '#d4cfbd';
  c.beginPath(); // the coat
  c.moveTo(-18, -92);
  c.quadraticCurveTo(-26, -50, -22, -4);
  c.lineTo(22, -4);
  c.quadraticCurveTo(24, -52, 14, -92);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.beginPath();
  c.moveTo(6, -92);
  c.quadraticCurveTo(16, -50, 22, -4);
  c.lineTo(8, -4);
  c.quadraticCurveTo(8, -50, 0, -92);
  c.fill();
  c.fillStyle = '#2e2a26'; // trousers and shoes
  c.fillRect(-14, -6, 11, 10);
  c.fillRect(2, -6, 12, 10);
  c.fillStyle = '#c9a58a'; // the head, in profile, a cap, no features
  c.beginPath();
  c.ellipse(-2, -106, 10, 12, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#3d5a6a';
  c.beginPath();
  c.moveTo(-13, -110);
  c.quadraticCurveTo(-4, -124, 10, -112);
  c.lineTo(14, -108);
  c.lineTo(-13, -106);
  c.fill();
  // the arm raised to the mouth
  c.strokeStyle = '#d4cfbd';
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(8, -84);
  c.lineTo(20, -66);
  c.lineTo(14, -96);
  c.stroke();
  c.restore();
  // a stain on the coat, a smear of old rust-brown, only a smear
  c.fillStyle = 'rgba(110,70,50,0.35)';
  c.beginPath();
  c.ellipse(158, 196, 8, 5, 0.3, 0, TAU);
  c.fill();
}
function dyn2(c, t) {
  // the cigarette's ember and its smoke
  const ex = 164;
  const ey = 150;
  c.fillStyle = '#e8e2d0';
  c.fillRect(ex - 6, ey - 1, 8, 2.2);
  c.fillStyle = `rgba(255,${120 + 40 * Math.sin(t * 3)},40,0.95)`;
  c.fillRect(ex + 1, ey - 1, 2.6, 2.2);
  for (let i = 0; i < 14; i++) {
    const u = (t * 0.3 + i / 14) % 1;
    const x = ex + 4 + Math.sin(u * 7 + i) * (4 + u * 10) + u * 6;
    const y = ey - u * 70;
    c.fillStyle = `rgba(215,215,210,${0.34 * (1 - u)})`;
    c.beginPath();
    c.arc(x, y, 2 + u * 7, 0, TAU);
    c.fill();
  }
  halo(c, ex + 2, ey, 14, '255,150,60', 0.3);
}

// -------------------------------------------------------- 3 the baker's hands
function photo3(c) {
  skyFill(c, [[0, '#6a3a1e'], [0.5, '#a65a24'], [1, '#4a2a16']]);
  // the oven's mouth, out of focus, glowing
  halo(c, 300, 70, 190, '255,170,70', 0.8);
  c.fillStyle = 'rgba(40,20,10,0.55)';
  c.fillRect(0, 0, 130, 130);
  // flour sacks, blurred, with a stencil that is only a smudge
  c.save();
  c.filter = 'blur(2px)';
  c.fillStyle = '#9a8a6a';
  poly(c, [[20, 120], [34, 40], [96, 38], [112, 120]]);
  c.fill();
  c.fillStyle = 'rgba(40,30,20,0.55)';
  c.fillRect(44, 66, 46, 8);
  c.fillRect(52, 82, 30, 6);
  c.restore();
  // the board
  c.fillStyle = '#7a5230';
  c.fillRect(0, 196, PW, 104);
  c.fillStyle = grad(c, 0, 196, 0, 300, [[0, 'rgba(255,200,140,0.35)'], [1, 'rgba(0,0,0,0.3)']]);
  c.fillRect(0, 196, PW, 104);
  c.strokeStyle = 'rgba(40,20,10,0.35)';
  c.lineWidth = 1;
  for (let y = 210; y < 300; y += 14) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(PW, y + 2);
    c.stroke();
  }
  // flour on the board, a drift
  c.fillStyle = 'rgba(224,214,190,0.55)';
  c.beginPath();
  c.ellipse(200, 252, 190, 34, 0, 0, TAU);
  c.fill();
  // the dough: a soft pale mass, a fold in it
  c.fillStyle = '#d8c49a';
  blobPath(c, [[110, 238], [118, 190], [170, 168], [236, 166], [292, 190], [300, 236], [250, 262], [160, 262]]);
  c.fill();
  c.fillStyle = 'rgba(255,248,224,0.35)';
  blobPath(c, [[140, 214], [160, 186], [220, 176], [260, 192], [210, 200], [160, 224]]);
  c.fill();
  c.fillStyle = 'rgba(120,90,50,0.3)';
  blobPath(c, [[130, 240], [170, 232], [250, 238], [286, 232], [260, 258], [170, 258]]);
  c.fill();
  c.strokeStyle = 'rgba(120,90,50,0.45)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(160, 212);
  c.quadraticCurveTo(200, 232, 248, 206);
  c.stroke();
  // the hands: grey with feed-flour, the knuckles lit by the oven. One
  // pushes in from the left, one folds in from the right.
  const hand = (hx, hy, dir, rot, sc) => {
    c.save();
    c.translate(hx, hy);
    c.scale(dir * sc, sc);
    c.rotate(rot);
    // the sleeve, rolled, flour-streaked
    c.fillStyle = '#5e4a3a';
    c.fillRect(-90, -24, 78, 48);
    c.fillStyle = '#6e5844';
    c.fillRect(-26, -26, 16, 52);
    c.fillStyle = 'rgba(230,220,200,0.35)';
    c.fillRect(-80, -10, 50, 3);
    c.fillRect(-60, 8, 30, 2);
    // the forearm and the palm
    c.fillStyle = '#8e8780';
    c.fillRect(-12, -16, 24, 32);
    c.beginPath();
    c.roundRect(4, -21, 50, 42, 14);
    c.fill();
    // four fingers, a little curled, then the thumb
    const fl = [44, 52, 48, 38];
    fl.forEach((len, i) => {
      const fy = -15 + i * 10;
      c.lineCap = 'round';
      c.strokeStyle = '#8e8780';
      c.lineWidth = 10 - i * 0.4;
      c.beginPath();
      c.moveTo(46, fy);
      c.quadraticCurveTo(46 + len * 0.6, fy - 2, 46 + len, fy + 2 + i);
      c.stroke();
      c.strokeStyle = 'rgba(255,214,150,0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(48, fy - 3.4);
      c.quadraticCurveTo(46 + len * 0.6, fy - 5, 46 + len - 4, fy - 1 + i);
      c.stroke();
      // knuckle crease
      c.strokeStyle = 'rgba(50,46,40,0.22)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(46 + len * 0.45, fy - 4);
      c.lineTo(46 + len * 0.45, fy + 3);
      c.stroke();
      // flour caught at the tip
      c.fillStyle = 'rgba(236,230,215,0.4)';
      c.beginPath();
      c.arc(46 + len - 1, fy + 1 + i, 2, 0, TAU);
      c.fill();
    });
    c.strokeStyle = '#8e8780';
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(14, 18);
    c.quadraticCurveTo(34, 34, 56, 32);
    c.stroke();
    c.strokeStyle = 'rgba(255,214,150,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(16, 13);
    c.quadraticCurveTo(34, 28, 54, 27);
    c.stroke();
    // the back of the hand: tendons, flour dusting
    c.strokeStyle = 'rgba(60,54,48,0.4)';
    c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(10, -14 + i * 9);
      c.lineTo(44, -14 + i * 9);
      c.stroke();
    }
    c.fillStyle = 'rgba(236,230,215,0.5)';
    for (let i = 0; i < 16; i++) c.fillRect(8 + ((i * 37) % 40), -18 + ((i * 53) % 36), 1.8, 1.6);
    c.restore();
  };
  hand(40, 232, 1, 0.0, 1.55);
  hand(370, 196, -1, -0.18, 1.45);
  // the flour on skin: pale smears and the creases of age
  c.strokeStyle = 'rgba(230,222,205,0.55)';
  c.lineWidth = 1;
  for (const [x0, y0] of [[80, 220], [100, 232], [260, 140], [280, 160]]) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x0 + 18, y0 + 3);
    c.stroke();
  }
  // a ring on the left hand, plain
}
function dyn3(c, t) {
  const r = rng(77);
  for (let i = 0; i < 46; i++) {
    const u = (t * (0.05 + r() * 0.06) + r()) % 1;
    const x = 80 + r() * 260 + Math.sin(t * 0.7 + i) * 6;
    const y = 270 - u * 200;
    c.fillStyle = `rgba(250,240,215,${0.5 * Math.sin(u * Math.PI)})`;
    c.fillRect(x, y, 1.7, 1.7);
  }
}

// -------------------------------------------------- 4 the corner, an old man
function photo4(c) {
  skyFill(c, [[0, '#4a5a86'], [0.4, '#c98f8a'], [0.7, '#f2b27a'], [1, '#caa078']]);
  // buildings at the corner, far
  c.fillStyle = '#6a6070';
  poly(c, [[0, 130], [0, 60], [90, 54], [100, 84], [150, 80], [160, 130]]);
  c.fill();
  c.fillStyle = '#585064';
  poly(c, [[250, 140], [260, 30], [400, 24], [400, 140]]);
  c.fill();
  windowsGrid(c, 14, 70, 4, 2, 12, 16, 34, 28, 'rgba(255,200,130,0.5)', 0.5, 2);
  windowsGrid(c, 280, 50, 5, 3, 14, 18, 24, 30, 'rgba(255,196,120,0.4)', 0.5, 7);
  // street, dusky
  c.fillStyle = grad(c, 0, 140, 0, PH, [[0, '#7a6e70'], [1, '#403a40']]);
  c.fillRect(0, 140, PW, 160);
  // the wall of the corner at the right, a paper pinned to it: the news
  c.fillStyle = '#9a8a86';
  c.fillRect(300, 90, 100, 210);
  c.fillStyle = '#e8e0cc';
  c.fillRect(326, 130, 30, 40);
  c.fillStyle = 'rgba(60,50,40,0.5)';
  for (let y = 138; y < 166; y += 6) c.fillRect(331, y, 20, 1.6);
  // the gathering: a dozen figures, small, backs and sides, heads bowed
  const dark = '#2c2630';
  const xs = [178, 202, 224, 246, 266, 288];
  xs.forEach((x, i) => figure(c, x, 214 + (i % 2) * 4, 58 + (i % 3) * 4, i % 2 ? '#34303c' : dark, { scarf: i === 2 || i === 4 }));
  figure(c, 160, 220, 40, dark, { pose: 'crouch' });
  // the glow at their feet from a lamp out of frame
  halo(c, 230, 226, 110, '255,190,120', 0.22);
  // the old man, front and near, his back to us: a grey jacket, a white cap
  c.save();
  c.translate(92, 316);
  c.fillStyle = '#5e5a5e';
  c.beginPath();
  c.moveTo(-68, 0);
  c.quadraticCurveTo(-80, -120, -50, -176);
  c.quadraticCurveTo(0, -200, 50, -176);
  c.quadraticCurveTo(80, -120, 68, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath();
  c.moveTo(0, -190);
  c.quadraticCurveTo(10, -90, 4, 0);
  c.lineTo(68, 0);
  c.quadraticCurveTo(80, -120, 50, -176);
  c.fill();
  c.fillStyle = 'rgba(255,200,140,0.22)';
  c.beginPath();
  c.moveTo(-50, -176);
  c.quadraticCurveTo(-80, -120, -68, 0);
  c.lineTo(-58, 0);
  c.quadraticCurveTo(-70, -120, -42, -172);
  c.fill();
  // collar, neck, grey hair, the white cap
  c.fillStyle = '#4a464a';
  c.fillRect(-22, -192, 44, 12);
  c.fillStyle = '#b08a70';
  c.fillRect(-12, -208, 24, 20);
  c.fillStyle = '#a8a4a0';
  c.beginPath();
  c.ellipse(0, -224, 22, 22, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#f0ead6';
  c.beginPath();
  c.ellipse(0, -234, 20, 14, 0, Math.PI, TAU);
  c.fill();
  c.fillRect(-20, -234, 40, 4);
  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(i * 5, -246);
    c.lineTo(i * 4, -236);
    c.stroke();
  }
  // hands clasped behind him
  c.fillStyle = '#b08a70';
  c.beginPath();
  c.ellipse(0, -52, 16, 9, 0, 0, TAU);
  c.fill();
  c.restore();
}
function dyn4(c, t) {
  const r = rng(4);
  for (let i = 0; i < 24; i++) {
    c.fillStyle = `rgba(255,200,140,${0.15 + 0.15 * Math.sin(t * 0.8 + i)})`;
    c.fillRect((r() * PW + t * 3) % PW, 160 + r() * 100, 1.4, 1.4);
  }
}

// ----------------------------------------------- 5 the empty street, last light
function photo5(c) {
  skyFill(c, [[0, '#6c6a8e'], [0.35, '#e0a48a'], [0.55, '#ffc07a'], [1, '#ffb066']]);
  const vx = 232;
  const vy = 158;
  halo(c, vx + 20, vy - 8, 150, '255,222,150', 0.8);
  // the sun low in the gap at the end of the street, half down
  c.fillStyle = '#fff2c4';
  c.beginPath();
  c.arc(vx + 20, vy - 4, 10, Math.PI, TAU);
  c.fill();
  // the buildings on both sides, in perspective, dark against the light
  c.fillStyle = '#4a3e48';
  poly(c, [[0, 0], [0, 300], [vx - 50, vy + 14], [vx - 50, vy - 56], [150, 10], [130, 0]]);
  c.fill();
  c.fillStyle = '#5a4a50';
  poly(c, [[400, 0], [400, 300], [vx + 62, vy + 14], [vx + 62, vy - 40], [330, 20], [350, 0]]);
  c.fill();
  // far end buildings, lit at their edges
  c.fillStyle = '#6a5660';
  c.fillRect(vx - 50, vy - 56, 40, 70);
  c.fillRect(vx + 24, vy - 30, 38, 44);
  c.fillStyle = 'rgba(255,214,150,0.5)';
  c.fillRect(vx - 12, vy - 56, 2, 70);
  c.fillRect(vx + 24, vy - 30, 2, 44);
  // windows going down the perspective, dark
  for (const side of [-1, 1]) {
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        const u = i / 4;
        const w0 = lerp(26, 6, u);
        const x = side < 0 ? lerp(14, vx - 66, u * 0.92) : lerp(386, vx + 76, u * 0.92) - w0;
        const y = lerp(30 + j * 82 - u * 10, vy - 40 + j * 14, u);
        c.fillStyle = 'rgba(22,14,20,0.75)';
        c.fillRect(x, y, w0, lerp(46, 9, u));
      }
    }
  }
  // the road and the pavements, going away to the light
  c.fillStyle = grad(c, 0, vy, 0, PH, [[0, '#d09a6a'], [1, '#6a5048']]);
  poly(c, [[0, 300], [vx - 50, vy + 14], [vx + 62, vy + 14], [400, 300]]);
  c.fill();
  // lane of light and long blue shadows from the buildings across the road
  c.fillStyle = 'rgba(70,60,110,0.45)';
  poly(c, [[0, 300], [0, 250], [vx - 50, vy + 14], [vx - 20, vy + 20], [120, 300]]);
  c.fill();
  c.fillStyle = 'rgba(70,60,110,0.35)';
  poly(c, [[400, 300], [400, 252], [vx + 62, vy + 14], [vx + 30, vy + 20], [290, 300]]);
  c.fill();
  c.fillStyle = 'rgba(255,214,150,0.4)';
  poly(c, [[170, 300], [vx - 10, vy + 14], [vx + 28, vy + 14], [250, 300]]);
  c.fill();
  // the curtain of the sniper's lane: sheets on a wire across the street
  c.strokeStyle = '#2a2430';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(64, 72);
  c.quadraticCurveTo(vx, 96, 372, 66);
  c.stroke();
  const sheets = [[110, '#cfc0aa'], [150, '#b0b4b6'], [190, '#d9ccb0'], [292, '#bcae9a'], [330, '#a8aab0']];
  sheets.forEach(([sx, col], i) => {
    const sy = 76 + Math.sin(sx * 0.02) * 8 + (i % 2) * 3;
    c.fillStyle = col;
    c.fillRect(sx, sy + 4, 26, 44 - (i % 3) * 6);
    c.fillStyle = 'rgba(255,214,150,0.4)';
    c.fillRect(sx, sy + 4, 6, 44 - (i % 3) * 6);
  });
  // a crack of dust-light down the middle of the road, and nothing else
  c.strokeStyle = 'rgba(40,30,30,0.25)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(vx + 4, vy + 16);
  c.lineTo(vx - 30, 300);
  c.stroke();
}
function dyn5(c, t) {
  const r = rng(9);
  for (let i = 0; i < 34; i++) {
    c.fillStyle = `rgba(255,224,170,${0.2 + 0.2 * Math.sin(t * 0.9 + i)})`;
    c.fillRect((r() * PW + t * 2) % PW, 120 + r() * 130, 1.5, 1.5);
  }
}

// -------------------------------------------- 6 the moonlit vine in the ruin
function photo6(c) {
  skyFill(c, [[0, '#0c1230'], [0.6, '#1e2c58'], [1, '#34457a']]);
  const r = rng(11);
  c.fillStyle = 'rgba(220,230,255,0.7)';
  for (let i = 0; i < 60; i++) c.fillRect(r() * PW, r() * 150, 1.2, 1.2);
  // the moon and its haze
  halo(c, 70, 56, 150, '170,196,255', 0.5);
  c.fillStyle = '#eef2ff';
  c.beginPath();
  c.arc(70, 56, 16, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(160,180,230,0.35)';
  c.beginPath();
  c.arc(64, 52, 4, 0, TAU);
  c.arc(78, 62, 3, 0, TAU);
  c.fill();
  // the collapsed building: floors fallen into each other, black against the sky
  c.fillStyle = '#10142a';
  poly(c, [[110, 300], [124, 100], [190, 90], [210, 120], [260, 106], [292, 140], [340, 130], [400, 160], [400, 300]]);
  c.fill();
  c.fillStyle = '#1a2040';
  poly(c, [[110, 300], [124, 100], [190, 90], [192, 300]]);
  c.fill();
  // slabs, tilted, edges lit by the moon
  const slabs = [[[130, 130], [260, 116], [262, 126], [132, 140]], [[150, 176], [300, 150], [302, 162], [152, 188]], [[136, 226], [330, 190], [332, 202], [138, 238]]];
  for (const s of slabs) {
    c.fillStyle = '#2a3258';
    poly(c, s);
    c.fill();
    c.fillStyle = 'rgba(190,208,255,0.55)';
    c.fillRect(s[0][0], s[0][1], s[1][0] - s[0][0], 1.6);
  }
  // rebar sticking out
  c.strokeStyle = '#0a0c1a';
  c.lineWidth = 1.5;
  for (const [x, y] of [[260, 118], [300, 154], [330, 192]]) {
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 10, y - 8, x + 18, y - 6);
    c.stroke();
  }
  // the vine: out of the broken floor and along the slabs, in moon-rim
  const stem = [[150, 300], [160, 250], [190, 214], [176, 176], [214, 150], [250, 140], [300, 128]];
  c.strokeStyle = '#1a2a22';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(stem[0][0], stem[0][1]);
  for (let i = 1; i < stem.length; i++) c.quadraticCurveTo(stem[i - 1][0] + 14, stem[i - 1][1] - 10, stem[i][0], stem[i][1]);
  c.stroke();
  c.strokeStyle = 'rgba(160,200,170,0.5)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(stem[0][0] - 1, stem[0][1]);
  for (let i = 1; i < stem.length; i++) c.quadraticCurveTo(stem[i - 1][0] + 13, stem[i - 1][1] - 10, stem[i][0] - 1, stem[i][1]);
  c.stroke();
  const q = rng(21);
  for (let i = 0; i < 44; i++) {
    const u = q();
    const seg = Math.min(stem.length - 2, Math.floor(u * (stem.length - 1)));
    const lu = u * (stem.length - 1) - seg;
    const x = lerp(stem[seg][0], stem[seg + 1][0], lu) + (q() - 0.5) * 36;
    const y = lerp(stem[seg][1], stem[seg + 1][1], lu) + (q() - 0.5) * 30;
    leaf(c, x, y, 9 + q() * 9, q() * TAU, i % 3 ? '#1d3a34' : '#27504a');
    c.save();
    c.globalAlpha = 0.45;
    leaf(c, x - 1, y - 1.5, 6 + q() * 6, q() * TAU, '#9ac8b8');
    c.restore();
  }
  // bunches of grapes, hanging, pale in the moon
  for (const [gx, gy] of [[196, 192], [232, 156], [172, 232]]) {
    c.fillStyle = '#5a7a9a';
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.arc(gx + ((i % 3) - 1) * 4.4 + (i > 8 ? 0 : 0), gy + Math.floor(i / 3) * 4.6, 2.9, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(220,235,255,0.7)';
    for (let i = 0; i < 4; i++) c.fillRect(gx - 4 + i * 3, gy + 1 + (i % 2) * 5, 1.6, 1.6);
  }
  // a little ground, dark, with the moon's long light across it
  c.fillStyle = '#0a0d1a';
  c.fillRect(0, 262, PW, 38);
  c.fillStyle = grad(c, 0, 262, 0, 300, [[0, 'rgba(150,180,255,0.15)'], [1, 'rgba(150,180,255,0)']]);
  c.fillRect(0, 262, PW, 38);
}
function dyn6(c, t) {
  const r = rng(2);
  for (let i = 0; i < 30; i++) {
    c.fillStyle = `rgba(230,238,255,${0.4 + 0.6 * Math.sin(t * (0.8 + r()) + i * 3.1) * 0.5})`;
    c.fillRect(r() * PW, r() * 140, 1.6, 1.6);
  }
}

// ----------------------------------------------------- 7 the night garden
function photo7(c) {
  skyFill(c, [[0, '#0e1a2a'], [0.5, '#1c3040'], [1, '#2a4048']]);
  halo(c, 320, 40, 140, '170,200,230', 0.3);
  // the garden wall behind, with the moon's wash on it
  c.fillStyle = '#243a42';
  c.fillRect(0, 90, PW, 100);
  c.fillStyle = 'rgba(180,205,225,0.1)';
  c.fillRect(0, 90, PW, 8);
  const r = rng(13);
  for (let i = 0; i < 30; i++) {
    c.fillStyle = 'rgba(10,20,26,0.25)';
    c.fillRect(r() * PW, 100 + r() * 80, 20 + r() * 30, 3);
  }
  // soil, dark, in raised rows
  c.fillStyle = grad(c, 0, 188, 0, PH, [[0, '#2e2a22'], [1, '#1a1814']]);
  c.fillRect(0, 188, PW, 112);
  c.fillStyle = '#3a3226';
  for (const y of [214, 250]) {
    poly(c, [[0, y], [PW, y - 6], [PW, y + 18], [0, y + 24]]);
    c.fill();
  }
  // a lantern's warm pool, out of frame on the right
  halo(c, 370, 230, 190, '255,180,100', 0.28);
  // tomatoes on their canes: leaves, red fruit
  for (const bx of [60, 120, 180]) {
    c.strokeStyle = '#6a5a3a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(bx, 232);
    c.lineTo(bx + 4, 130);
    c.stroke();
    for (let i = 0; i < 12; i++) {
      c.save();
      c.translate(bx + (r() - 0.5) * 40, 150 + r() * 80);
      c.rotate((r() - 0.5) * 2);
      c.fillStyle = i % 2 ? '#2a5a3a' : '#356a44';
      c.beginPath();
      c.ellipse(0, 0, 12, 4.4, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    for (const [dx, dy] of [[-10, 190], [8, 172], [-2, 208], [14, 200]]) {
      c.fillStyle = '#b8342a';
      c.beginPath();
      c.arc(bx + dx, dy, 6, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,214,190,0.5)';
      c.fillRect(bx + dx - 3, dy - 3, 2.4, 2.4);
      c.fillStyle = '#356a44';
      c.fillRect(bx + dx - 2, dy - 8, 4, 2);
    }
  }
  // mint: a low bright mound of leaves
  for (let i = 0; i < 40; i++) {
    c.save();
    c.translate(240 + (r() - 0.5) * 60, 244 - r() * 24);
    c.rotate((r() - 0.5) * 2.4);
    c.fillStyle = i % 2 ? '#3f8a52' : '#58a867';
    c.beginPath();
    c.ellipse(0, 0, 7, 4, 0, 0, TAU);
    c.fill();
    c.restore();
  }
  // the courgette: one, struggling, in a cut-down oil drum, its big leaves
  // yellowing and drooping, one small fruit
  c.fillStyle = '#4a3a2a';
  c.fillRect(310, 232, 50, 48);
  c.fillStyle = '#7a6244';
  c.fillRect(310, 232, 50, 4);
  c.strokeStyle = '#4a7a3a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(332, 234);
  c.quadraticCurveTo(330, 200, 318, 190);
  c.moveTo(336, 234);
  c.quadraticCurveTo(346, 204, 362, 206);
  c.stroke();
  for (const [lx, ly, ro, col] of [[312, 196, 0.8, '#9aa24a'], [366, 210, -0.6, '#7a9a44'], [330, 186, 0.1, '#6a9a4a'], [346, 214, 1.2, '#c0a84a']]) {
    c.save();
    c.translate(lx, ly);
    c.rotate(ro);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-14, 8, -4, 22);
    c.quadraticCurveTo(10, 20, 14, 6);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.fillStyle = '#7a9a3a';
  c.beginPath();
  c.ellipse(340, 238, 11, 4, 0.4, 0, TAU);
  c.fill();
  // a jerrycan watering can by the beds
  c.fillStyle = '#c6a02a';
  c.fillRect(268, 262, 22, 24);
  c.fillStyle = '#8a6a1a';
  c.fillRect(272, 256, 8, 6);
  c.fillStyle = 'rgba(255,230,160,0.5)';
  c.fillRect(268, 262, 3, 24);
}
function dyn7(c, t) {
  const r = rng(14);
  for (let i = 0; i < 24; i++) {
    c.fillStyle = `rgba(210,225,245,${0.35 + 0.4 * Math.sin(t * (0.7 + r()) + i * 2.3) * 0.5})`;
    c.fillRect(r() * PW, r() * 70, 1.5, 1.5);
  }
  // a firefly or two, over the mint
  for (let i = 0; i < 3; i++) {
    const x = 220 + Math.sin(t * 0.6 + i * 2) * 50 + i * 20;
    const y = 200 + Math.sin(t * 0.9 + i * 3) * 14;
    const a = 0.5 + 0.5 * Math.sin(t * 2 + i * 4);
    halo(c, x, y, 7, '220,255,140', 0.7 * a);
  }
}

// ---------------------------------------------- 8 the cracked minaret, stars
function photo8(c) {
  skyFill(c, [[0, '#050818'], [0.6, '#10183a'], [1, '#26305c']]);
  // the Milky smear
  c.save();
  c.translate(160, 110);
  c.rotate(-0.5);
  c.scale(1, 0.32);
  c.fillStyle = rad(c, 0, 0, 0, 260, [[0, 'rgba(150,170,230,0.22)'], [1, 'rgba(150,170,230,0)']]);
  c.fillRect(-300, -300, 600, 600);
  c.restore();
  const r = rng(17);
  for (let i = 0; i < 160; i++) {
    const a = 0.3 + r() * 0.6;
    c.fillStyle = `rgba(235,240,255,${a})`;
    const s = r() < 0.1 ? 2 : 1.1;
    c.fillRect(r() * PW, r() * 250, s, s);
  }
  // the town, low and black, the mosque's dome
  c.fillStyle = '#080a18';
  poly(c, [[0, 300], [0, 240], [30, 236], [44, 250], [90, 244], [120, 230], [150, 236], [190, 220], [260, 228], [290, 240], [330, 232], [360, 244], [400, 238], [400, 300]]);
  c.fill();
  c.beginPath();
  c.arc(150, 236, 30, Math.PI, TAU);
  c.fill();
  c.fillRect(148, 188, 2, 18);
  // the minaret: tall, a balcony, its lantern top missing, and a crack down it
  const mx = 250;
  c.fillStyle = '#10142a';
  c.fillRect(mx - 14, 70, 28, 170);
  c.fillRect(mx - 20, 100, 40, 8);
  c.fillRect(mx - 10, 50, 20, 22);
  // the top, broken: a ragged stump, a leaning piece
  c.beginPath();
  c.moveTo(mx - 10, 50);
  c.lineTo(mx - 6, 40);
  c.lineTo(mx, 46);
  c.lineTo(mx + 4, 36);
  c.lineTo(mx + 10, 50);
  c.fill();
  // the starlit edge on the right, cool
  c.fillStyle = 'rgba(150,170,230,0.28)';
  c.fillRect(mx + 11, 70, 3, 170);
  c.fillRect(mx + 18, 100, 2, 8);
  // the crack, lit from within by what is behind
  c.strokeStyle = 'rgba(170,190,240,0.85)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(mx - 3, 70);
  c.lineTo(mx + 3, 96);
  c.lineTo(mx - 4, 120);
  c.lineTo(mx + 2, 150);
  c.lineTo(mx - 3, 182);
  c.lineTo(mx + 1, 212);
  c.stroke();
  c.strokeStyle = 'rgba(8,10,24,0.9)';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(mx - 3 - 1.4, 70);
  c.lineTo(mx + 3 - 1.4, 96);
  c.lineTo(mx - 4 - 1.4, 120);
  c.stroke();
  // balcony railing, in little posts
  c.fillStyle = '#070918';
  for (let i = 0; i < 6; i++) c.fillRect(mx - 18 + i * 7, 92, 1.4, 8);
  // a window with a faint light, an oil lamp somewhere
  c.fillStyle = 'rgba(255,196,110,0.8)';
  c.fillRect(mx - 3, 130, 5, 8);
}
function dyn8(c, t) {
  const r = rng(18);
  for (let i = 0; i < 40; i++) {
    const a = 0.3 + 0.5 * Math.sin(t * (0.6 + r() * 1.2) + i * 5.1) * 0.5 + 0.2;
    c.fillStyle = `rgba(245,248,255,${clamp(a, 0, 1)})`;
    c.fillRect(r() * PW, r() * 230, 1.8, 1.8);
  }
  // a slow satellite
  const sx = ((t * 5) % 500) - 50;
  c.fillStyle = 'rgba(255,255,240,0.5)';
  c.fillRect(sx, 60 + sx * 0.08, 1.4, 1.4);
}

// ------------------------------------------------- 9 «بكرا أحلى» on the wall
function photo9(c) {
  c.fillStyle = '#a9a496';
  c.fillRect(0, 0, PW, PH);
  const r = rng(19);
  // the wall: plaster in two tones, bare block and brick where it has gone
  c.fillStyle = '#bcb7a6';
  c.fillRect(0, 0, PW, 190);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,248,220,0.14)' : 'rgba(80,70,50,0.12)';
    c.beginPath();
    c.ellipse(r() * PW, r() * 280, 20 + r() * 50, 10 + r() * 24, 0, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#8f8b80';
  for (const [x, y, w, h] of [[0, 190, PW, 110]]) c.fillRect(x, y, w, h);
  c.fillStyle = '#a8a396';
  c.fillRect(0, 190, PW, 5);
  // exposed block
  c.save();
  c.beginPath();
  poly(c, [[300, 20], [340, 12], [372, 30], [380, 90], [330, 110], [296, 80]]);
  c.clip();
  c.fillStyle = '#8c887c';
  c.fillRect(280, 0, 120, 130);
  c.fillStyle = 'rgba(40,30,22,0.35)';
  for (let y = 12; y < 120; y += 18) {
    c.fillRect(280, y, 120, 1.2);
    for (let x = 280 + ((y / 18) % 2) * 20; x < 400; x += 40) c.fillRect(x, y, 1.2, 18);
  }
  c.restore();
  // morning light raking from the upper left, and the hard shadow of a lintel
  c.fillStyle = grad(c, 0, 0, 260, 200, [[0, 'rgba(255,236,180,0.35)'], [1, 'rgba(255,236,180,0)']]);
  c.fillRect(0, 0, PW, 220);
  c.fillStyle = 'rgba(40,40,60,0.18)';
  poly(c, [[0, 0], [400, 0], [400, 20], [0, 54]]);
  c.fill();
  // the writing: big, in a child's hand, in blue paint, wobbling; two words,
  // drips under the letters
  const font = `bold 72px ${AR}`;
  const words = [['بكرا', 292, 132, -0.05, '#2a5fa8'], ['أحلى', 140, 150, 0.04, '#2a5fa8']];
  c.textAlign = 'center';
  c.direction = 'rtl';
  for (const [w, x, y, ro, col] of words) {
    c.save();
    c.translate(x, y);
    c.rotate(ro);
    c.font = font;
    // the paint's pale thick edge, then the colour
    c.fillStyle = 'rgba(20,20,60,0.25)';
    c.fillText(w, 2, 3);
    c.fillStyle = col;
    c.fillText(w, 0, 0);
    c.fillStyle = 'rgba(160,200,255,0.3)';
    c.fillText(w, -1, -1.4);
    c.restore();
    // drips
    c.fillStyle = col;
    for (let i = 0; i < 4; i++) {
      const dx = x - 70 + r() * 140;
      const dl = 6 + r() * 22;
      c.fillRect(dx, y + 4, 2, dl);
      c.beginPath();
      c.arc(dx + 1, y + 4 + dl, 2, 0, TAU);
      c.fill();
    }
  }
  // a sun and a flower, smaller, in red and yellow, by the same hand
  c.fillStyle = '#e8b830';
  c.beginPath();
  c.arc(60, 56, 20, 0, TAU);
  c.fill();
  c.strokeStyle = '#e8b830';
  c.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    c.beginPath();
    c.moveTo(60 + Math.cos(a) * 26, 56 + Math.sin(a) * 26);
    c.lineTo(60 + Math.cos(a) * 38, 56 + Math.sin(a) * 38);
    c.stroke();
  }
  c.strokeStyle = '#3a8a3a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(350, 250);
  c.quadraticCurveTo(346, 214, 352, 190);
  c.stroke();
  c.fillStyle = '#d04040';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    c.beginPath();
    c.arc(352 + Math.cos(a) * 9, 182 + Math.sin(a) * 9, 6, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#e8b830';
  c.beginPath();
  c.arc(352, 182, 5, 0, TAU);
  c.fill();
  // a child's height-mark pencilled by the wall's foot, and a small hand in paint
  c.fillStyle = 'rgba(80,60,40,0.4)';
  c.fillRect(30, 232, 22, 1.6);
  c.fillRect(30, 252, 16, 1.6);
  c.fillStyle = '#d04040';
  c.beginPath();
  c.ellipse(96, 240, 9, 11, 0, 0, TAU);
  c.fill();
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.ellipse(90 + i * 4, 226, 1.8, 5, 0, 0, TAU);
    c.fill();
  }
  // the pavement's edge
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(0, 270, PW, 30);
}
function dyn9(c, t) {
  const r = rng(20);
  for (let i = 0; i < 20; i++) {
    c.fillStyle = `rgba(255,240,200,${0.2 + 0.2 * Math.sin(t + i)})`;
    c.fillRect((r() * PW + t * 4) % PW, r() * 200, 1.4, 1.4);
  }
}

// ------------------------------------------------------- 10 Ahmad's shoes
function photo10(c) {
  skyFill(c, [[0, '#7e6a82'], [0.28, '#e0a07a'], [0.46, '#ffbf78'], [1, '#d99a60']]);
  const vx = 120;
  const vy = 132;
  halo(c, vx, vy - 6, 180, '255,222,150', 0.8);
  c.fillStyle = '#fff0c0';
  c.beginPath();
  c.arc(vx, vy - 2, 9, Math.PI, TAU);
  c.fill();
  // the street's far buildings, a low dark band, windows with nothing in them
  c.fillStyle = '#4a3c48';
  poly(c, [[0, vy + 8], [0, 70], [40, 62], [60, 96], [88, 92], [100, vy + 8]]);
  c.fill();
  poly(c, [[146, vy + 8], [156, 90], [200, 84], [212, 70], [260, 76], [290, 58], [330, 66], [400, 52], [400, vy + 8]]);
  c.fill();
  c.fillStyle = 'rgba(255,200,130,0.25)';
  c.fillRect(100, vy - 24, 3, 32);
  c.fillRect(146, vy - 24, 3, 32);
  windowsGrid(c, 160, 100, 6, 1, 10, 14, 24, 0, 'rgba(14,8,12,0.7)', 0, 1);
  // the road: an empty lane, going to the light
  c.fillStyle = grad(c, 0, vy, 0, 215, [[0, '#d49860'], [1, '#8a6a56']]);
  c.fillRect(0, vy + 8, PW, 90);
  // a lane of last light
  c.fillStyle = 'rgba(255,214,150,0.45)';
  poly(c, [[vx - 10, vy + 8], [vx + 14, vy + 8], [250, 215], [60, 215]]);
  c.fill();
  // the kerb, running across the foreground, with a face and a top
  c.fillStyle = '#b8a48a';
  c.fillRect(0, 215, PW, 12);
  c.fillStyle = 'rgba(255,224,170,0.55)';
  c.fillRect(0, 215, PW, 2.4);
  c.fillStyle = 'rgba(60,40,30,0.35)';
  c.fillRect(0, 225, PW, 4);
  // the pavement: slabs, warm, in shadow toward us
  c.fillStyle = grad(c, 0, 227, 0, PH, [[0, '#a89278'], [1, '#6a5648']]);
  c.fillRect(0, 227, PW, 73);
  c.strokeStyle = 'rgba(40,28,20,0.4)';
  c.lineWidth = 1.2;
  for (let x = -40; x < PW + 40; x += 66) {
    c.beginPath();
    c.moveTo(x, 227);
    c.lineTo(x - 22, 300);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(0, 262);
  c.lineTo(PW, 262);
  c.stroke();
  // grit and a crack, a dried leaf
  const r = rng(30);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(40,28,20,0.3)' : 'rgba(230,210,170,0.25)';
    c.fillRect(r() * PW, 230 + r() * 70, 1.5, 1.5);
  }
  c.strokeStyle = 'rgba(30,20,14,0.5)';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(330, 232);
  c.lineTo(322, 252);
  c.lineTo(334, 266);
  c.lineTo(326, 292);
  c.stroke();
  // the long shadows, thrown toward us and a little to the right, from the low sun
  c.fillStyle = 'rgba(60,34,44,0.38)';
  poly(c, [[110, 270], [230, 270], [250, 300], [100, 300]]);
  c.fill();
  poly(c, [[216, 254], [330, 254], [356, 296], [226, 298]]);
  c.fill();
  // the two shoes, set neatly together, toes to the light: one behind the other
  shoe(c, 222, 254, 1.55, { col: '#4e3018', dust: 0.4 });
  shoe(c, 128, 272, 1.72, { col: '#5e3a20', dust: 0.42 });
  // the light, grazing their tops from the back
  halo(c, 220, 224, 70, '255,214,150', 0.22);
}
function dyn10(c, t) {
  const r = rng(31);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(255,226,170,${0.2 + 0.25 * Math.sin(t * 0.9 + i)})`;
    c.fillRect((r() * PW + t * 3) % PW, 120 + r() * 100, 1.5, 1.5);
  }
}

const PHOTOS = [
  [photo0, dyn0, [0.98, 0.94, 0.86], 0.3],
  [photo1, dyn1, [1.04, 0.96, 0.84], 0.24],
  [photo2, dyn2, [0.94, 1.0, 0.96], 0.4],
  [photo3, dyn3, [1.08, 0.94, 0.8], 0.4],
  [photo4, dyn4, [0.98, 0.94, 1.0], 0.38],
  [photo5, dyn5, [1.04, 0.94, 0.86], 0.34],
  [photo6, dyn6, [0.9, 0.98, 1.08], 0.42],
  [photo7, dyn7, [0.92, 1.0, 1.0], 0.42],
  [photo8, dyn8, [0.92, 0.96, 1.1], 0.34],
  [photo9, dyn9, [1.0, 0.98, 0.9], 0.26],
  [photo10, dyn10, [1.05, 0.95, 0.84], 0.4],
];

// The printed look every photograph shares: a warm tone, a soft vignette, a
// whisper of grain.
function finish(c, tint, vig, seed) {
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = `rgb(${tint.map((v) => Math.round(clamp(v * 128, 0, 255))).join(',')})`;
  c.fillRect(0, 0, PW, PH);
  c.restore();
  const v = rad(c, PW / 2, PH / 2, PH * 0.4, PW * 0.72, [[0, 'rgba(10,6,4,0)'], [1, `rgba(10,6,4,${vig})`]]);
  c.fillStyle = v;
  c.fillRect(0, 0, PW, PH);
  const r = rng(seed * 13 + 1);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    c.fillRect(r() * PW, r() * PH, 1, 1);
  }
}

const STILLS = new Map();
function still(i, s) {
  const key = `${i}|${Math.round(s * 20)}`;
  let cv = STILLS.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(PW * s);
  cv.height = Math.ceil(PH * s);
  const c = cv.getContext('2d');
  c.scale(s, s);
  const [draw, , tint, vig] = PHOTOS[i];
  draw(c);
  finish(c, tint, vig, i);
  // the Arabic photograph waits for its font before it is kept
  if (i === 9 && !fontsReady()) return cv;
  if (STILLS.size > 30) STILLS.clear();
  STILLS.set(key, cv);
  return cv;
}

// Paint photograph i (0..10) into a w x h area at (0, 0).
export function drawPhoto(c, i, w, h, t = 0) {
  i = clamp(Math.round(i), 0, 10);
  const s = Math.max(w / PW, h / PH);
  const ox = (w - PW * s) / 2;
  const oy = (h - PH * s) / 2;
  c.save();
  c.beginPath();
  c.rect(0, 0, w, h);
  c.clip();
  c.imageSmoothingEnabled = true;
  c.drawImage(still(i, Math.max(0.5, s)), ox, oy, PW * s, PH * s);
  c.translate(ox, oy);
  c.scale(s, s);
  PHOTOS[i][1](c, t);
  c.restore();
}

// The camera's back: a body, a cracked LCD showing photograph i, a few
// buttons, the frame counter.
export function drawCameraScreen(c, x, y, w, h, i, t = 0, { crack = true } = {}) {
  c.save();
  c.translate(x, y);
  const u = w / 400;
  // body
  const rr = 22 * u;
  c.fillStyle = '#26282c';
  c.beginPath();
  c.roundRect(0, 0, w, h, rr);
  c.fill();
  c.fillStyle = grad(c, 0, 0, 0, h, [[0, '#3a3d42'], [0.12, '#2a2c30'], [1, '#1c1d20']]);
  c.beginPath();
  c.roundRect(2 * u, 2 * u, w - 4 * u, h - 4 * u, rr - 2 * u);
  c.fill();
  // brushed top edge
  c.fillStyle = 'rgba(255,255,255,0.1)';
  c.fillRect(rr, 3 * u, w - 2 * rr, 2 * u);
  // the grip, at the right, ribbed
  c.fillStyle = '#17181a';
  c.beginPath();
  c.roundRect(w - 74 * u, 14 * u, 62 * u, h - 28 * u, 14 * u);
  c.fill();
  // scuffs and wear on the corners
  c.strokeStyle = 'rgba(200,200,190,0.3)';
  c.lineWidth = 1.2 * u;
  for (const [a, b, l] of [[14, 6, 12], [w / u - 40, 8, 9], [10, h / u - 14, 11]]) {
    c.beginPath();
    c.moveTo(a * u, b * u);
    c.lineTo((a + l) * u, (b + l * 0.3) * u);
    c.stroke();
  }
  // the screen's bezel and the LCD
  const sx = 24 * u;
  const sy = 24 * u;
  const sw = w - 118 * u;
  const sh = h - 48 * u;
  c.fillStyle = '#08090a';
  c.beginPath();
  c.roundRect(sx - 6 * u, sy - 6 * u, sw + 12 * u, sh + 12 * u, 8 * u);
  c.fill();
  c.save();
  c.beginPath();
  c.rect(sx, sy, sw, sh);
  c.clip();
  c.translate(sx, sy);
  drawPhoto(c, i, sw, sh, t);
  // the screen's own look: a faint scan, a cool cast, a dim at the edge
  c.fillStyle = 'rgba(120,150,180,0.06)';
  c.fillRect(0, 0, sw, sh);
  c.fillStyle = 'rgba(0,0,0,0.05)';
  for (let ly = 0; ly < sh; ly += 3) c.fillRect(0, ly, sw, 1);
  // the on-screen display: frame number and a battery
  const no = 93 + clamp(Math.round(i), 0, 10);
  const ar = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(0, sh - 20 * u, 92 * u, 20 * u);
  c.fillStyle = '#e8f0e0';
  c.font = `${12 * u}px ${SANS}`;
  c.textAlign = 'left';
  c.direction = 'ltr';
  c.fillText(`${ar(no)}/${ar(103)}`, 8 * u, sh - 6 * u);
  c.strokeStyle = '#e8f0e0';
  c.lineWidth = 1 * u;
  c.strokeRect(sw - 30 * u, 8 * u, 20 * u, 9 * u);
  c.fillStyle = '#e8f0e0';
  c.fillRect(sw - 29 * u, 9 * u, 6 * u, 7 * u);
  c.fillRect(sw - 10 * u, 10.5 * u, 2 * u, 4 * u);
  // the crack: a star from the upper right corner, with branches, and the
  // black bruise where the liquid crystal has bled
  if (crack) {
    const ox = sw * 0.93;
    const oy = sh * 0.06;
    c.fillStyle = 'rgba(8,6,16,0.5)';
    c.beginPath();
    c.ellipse(ox - 8 * u, oy + 18 * u, 16 * u, 24 * u, -0.5, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(60,20,80,0.25)';
    c.beginPath();
    c.ellipse(ox - 14 * u, oy + 30 * u, 10 * u, 18 * u, -0.4, 0, TAU);
    c.fill();
    const cr = rng(5);
    const lines = [];
    const grow = (px, py, ang, len, depth) => {
      const pts = [[px, py]];
      let x_ = px;
      let y_ = py;
      for (let n = 0; n < len; n++) {
        ang += (cr() - 0.5) * 0.7;
        x_ += Math.cos(ang) * 7 * u;
        y_ += Math.sin(ang) * 7 * u;
        pts.push([x_, y_]);
        if (depth < 1 && cr() < 0.16) grow(x_, y_, ang + (cr() < 0.5 ? 0.9 : -0.9), Math.floor(len * 0.55), depth + 1);
      }
      lines.push([pts, depth]);
    };
    grow(ox, oy, 2.4, 13, 0);
    grow(ox, oy, 1.9, 8, 0);
    grow(ox, oy, 3.0, 7, 0);
    for (const [pts, depth] of lines) {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) c.lineTo(p[0], p[1]);
      c.strokeStyle = 'rgba(10,10,14,0.8)';
      c.lineWidth = (1.8 - depth * 0.4) * u;
      c.stroke();
      c.beginPath();
      c.moveTo(pts[0][0] + 1.2 * u, pts[0][1]);
      for (const p of pts) c.lineTo(p[0] + 1.2 * u, p[1] + 0.4 * u);
      c.strokeStyle = 'rgba(235,240,255,0.65)';
      c.lineWidth = 0.8 * u;
      c.stroke();
    }
    // dead lines of pixels running out of the crack
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(ox - 52 * u, 0, 2 * u, sh);
    c.fillStyle = 'rgba(255,60,60,0.12)';
    c.fillRect(ox - 54 * u, 0, 1.4 * u, sh);
  }
  // glare
  const gg = c.createLinearGradient(0, 0, sw, sh);
  gg.addColorStop(0, 'rgba(255,255,255,0.12)');
  gg.addColorStop(0.35, 'rgba(255,255,255,0)');
  c.fillStyle = gg;
  c.fillRect(0, 0, sw, sh);
  c.restore();
  // controls on the grip: a ring with four arrows and a centre, three small keys
  const cx = w - 43 * u;
  const cy = h * 0.42;
  c.fillStyle = '#2e3034';
  c.beginPath();
  c.arc(cx, cy, 22 * u, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 1.2 * u;
  c.stroke();
  c.fillStyle = '#1a1b1e';
  c.beginPath();
  c.arc(cx, cy, 9 * u, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(220,220,210,0.7)';
  for (const [dx, dy, a] of [[0, -15, 0], [15, 0, 1], [0, 15, 2], [-15, 0, 3]]) {
    c.save();
    c.translate(cx + dx * u, cy + dy * u);
    c.rotate((a * Math.PI) / 2);
    c.beginPath();
    c.moveTo(0, -3.4 * u);
    c.lineTo(3.4 * u, 2.4 * u);
    c.lineTo(-3.4 * u, 2.4 * u);
    c.fill();
    c.restore();
  }
  const keys = [['▶', 0.16], ['MENU', 0.68], ['⌫', 0.82]];
  c.font = `${7 * u}px ${SANS}`;
  c.textAlign = 'center';
  for (const [lab, py] of keys) {
    c.fillStyle = '#2e3034';
    c.beginPath();
    c.roundRect(cx - 15 * u, h * py - 6 * u, 30 * u, 12 * u, 5 * u);
    c.fill();
    c.fillStyle = 'rgba(220,220,210,0.7)';
    c.fillText(lab, cx, h * py + 2.6 * u);
  }
  // the little lamp, glowing the green of a camera still awake
  const on = 0.6 + 0.4 * Math.sin(t * 2.4);
  c.fillStyle = `rgba(110,230,120,${on})`;
  c.beginPath();
  c.arc(w - 22 * u, 18 * u, 2.6 * u, 0, TAU);
  c.fill();
  c.restore();
}
