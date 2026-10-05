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
