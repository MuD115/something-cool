// The three flashbacks of Act 3, and the kitchen that follows them: four
// remembered places, each far off along the flat ground (see MEM in
// story/act3v-map.js). Warm and a little faded, like old photographs, and
// whole: nothing in them is broken. People are not drawn here (the story
// spawns rig characters); these are rooms, streets, props, light.
//
// World units: ground at y = 0, up is negative, 1 unit is about a
// centimetre, a standing man is 170 tall. Same idiom as the other sets:
// paint = lit, cast = lit and shadowed, glow = light of its own, surface =
// a material laid over the colour; seeded rng so nothing shivers.
//
// Exports
//   drawEid(R, g, { t })                 EID_DOOR_X, EID_SEATS, EID_HEAD_X
//   drawProtest(R, g, { t, scatter, dumpster })   ALLEY_X0; drawDumpster(R)
//   drawSchool(R, g, { t })              SCHOOL_DESKS, TEACHER_X
//   drawKitchen(R, g, { t, door })       KITCHEN_DOOR_X
//   memoryLook(g, kind)                  'eid' | 'protest' | 'school' | 'kitchen'

import { MEM, DUMPSTER_X } from '../story/act3v-map.js';
import { rng, clamp, lerp, smooth, mixc } from '../engine/util.js';
import { extrudeRect, extrudePoly } from './depth.js';
import * as T from './town.js';

const TAU = Math.PI * 2;
const ARABIC = '"Aref Ruqaa", "Noto Naskh Arabic", serif';

// ------------------------------------------------------------ helpers --

const poly = (c, pts) => {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
};

// A filled rectangle with thickness behind it.
const slab = (c, x, y, w, h, d, col) => {
  if (d > 0) extrudeRect(c, x, y, w, h, d, { color: col });
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

const soft = (c, x, y, r, rgba, rgba1 = 'rgba(0,0,0,0)') => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba);
  g.addColorStop(1, rgba1);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
};

const ell = (c, x, y, rx, ry, col) => {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
};

// Fill the screen on the emissive layer (the sky behind a room).
const backdrop = (R, col) =>
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = col;
    c.fillRect(0, 0, R.W, R.H);
    c.restore();
  });

const textured = (R, x, y, w, h, mat, seed, alpha = 0.5, scale) => R.surface((c) => c.rect(x, y, w, h), mat, { seed, alpha, scale });

// An arched (pointed) window or door shape, as a path.
const archPath = (c, x0, x1, top, bottom, rise) => {
  const xm = (x0 + x1) / 2;
  c.moveTo(x0, bottom);
  c.lineTo(x0, top + rise);
  c.quadraticCurveTo(x0, top + rise * 0.25, xm, top);
  c.quadraticCurveTo(x1, top + rise * 0.25, x1, top + rise);
  c.lineTo(x1, bottom);
  c.closePath();
};

// Slow rising wisps of steam (additive; breathes with t).
function steam(R, x, y, t, k = 1, seed = 1) {
  R.glow((c) => {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.22 + i * 0.25 + seed * 0.13) % 1;
      const sx = x + Math.sin(t * 0.9 + i * 2 + seed) * 5 * ph + (i - 1.5) * 3;
      const sy = y - ph * 44;
      const r = 5 + ph * 11;
      soft(c, sx, sy, r, `rgba(255,248,235,${0.14 * (1 - ph) * k})`);
    }
  });
}

// A hanging flag-cloth fold wave: used for the flag and the cloth over the TV.
const wave = (t, x, k) => Math.sin(t * 1.6 + x * 0.09) * k;

// A breeze that comes and goes (0..1), and a sway angle riding on it: small,
// slow, a different phase for every tree, cloth and fringe.
const gust = (t, ph = 0) => {
  const a = Math.sin(t * 0.37 + ph) * Math.sin(t * 0.23 + 1.3 + ph * 0.5);
  return a > 0 ? Math.min(1, a * 1.6) : 0;
};
const swayAng = (t, ph, amp, period = 4) => Math.sin((t * TAU) / period + ph) * amp * (1 + 0.7 * gust(t, ph));

// =============================================================== EID ==

const E0 = MEM.eid[0];
const E_L = E0 - 640;
const E_R = E0 + 640;
const E_CEIL = -340;
const TABLE_TOP = -76;
const TX0 = E0 - 240;
const TX1 = E0 + 345;

export const EID_DOOR_X = E0 - 480;
export const EID_HEAD_X = E0 + 378;
// Nine places down the table and the father's at the head; y is the seat
// height (the top of the chair seat), for a seated figure's hips.
export const EID_SEATS = [
  ...Array.from({ length: 9 }, (_, i) => [E0 - 205 + i * 58, -46]),
  [EID_HEAD_X, -46],
];

function chair(c, x, { back = -108, col = '#5b3b26', arm = false } = {}) {
  const w = arm ? 50 : 40;
  // back, with slats
  slab(c, x - w / 2, back, w, 5, 5, col);
  slab(c, x - w / 2, back, 5, -46 - back, 4, col);
  slab(c, x + w / 2 - 5, back, 5, -46 - back, 4, col);
  c.fillStyle = T.shade(col, 0.8);
  for (let s = x - w / 2 + 12; s < x + w / 2 - 8; s += 8) c.fillRect(s, back + 6, 3, -46 - back - 8);
  if (arm) {
    c.fillStyle = col;
    c.fillRect(x - w / 2 - 4, -70, 8, 5);
    c.fillRect(x + w / 2 - 4, -70, 8, 5);
  }
  // seat and legs
  slab(c, x - w / 2 - 2, -46, w + 4, 6, 8, '#7a5230');
  c.fillStyle = col;
  c.fillRect(x - w / 2, -40, 5, 40);
  c.fillRect(x + w / 2 - 5, -40, 5, 40);
}

function tiledFloor(R, x0, x1, y1, seed, pal) {
  R.paint((c) => {
    c.fillStyle = pal[0];
    c.fillRect(x0, 0, x1 - x0, y1);
    const s = 44;
    const r = rng(seed);
    for (let row = 0; row * 22 < y1; row++) {
      const y = row * 22;
      for (let x = Math.floor(x0 / s) * s; x < x1; x += s) {
        const i = Math.round(x / s) + row;
        const odd = i & 1;
        c.fillStyle = odd ? pal[1] : pal[0];
        c.fillRect(x, y, s, 22);
        if (odd === 0 && row < 4) {
          // an inlaid lozenge in the pale tiles
          c.fillStyle = pal[2];
          poly(c, [[x + s / 2, y + 3], [x + s / 2 + 10, y + 11], [x + s / 2, y + 19], [x + s / 2 - 10, y + 11]]);
          c.fill();
        }
        c.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`;
        c.fillRect(x, y, s, 22);
      }
    }
    // grout
    c.fillStyle = 'rgba(40,28,20,0.3)';
    for (let row = 0; row * 22 < y1; row++) c.fillRect(x0, row * 22, x1 - x0, 1);
    for (let x = Math.floor(x0 / s) * s; x < x1; x += s) c.fillRect(x, 0, 1, y1);
    const sh = c.createLinearGradient(0, 0, 0, 40);
    sh.addColorStop(0, 'rgba(30,18,10,0.35)');
    sh.addColorStop(1, 'rgba(30,18,10,0)');
    c.fillStyle = sh;
    c.fillRect(x0, 0, x1 - x0, 40);
  });
}

export function drawEid(R, g, { t = 0, door } = {}) {
  const open = clamp(door ?? g?.a?.eidDoor ?? 0); // 0 shut, 1 open
  const hush = g?.a?.hush || 0;
  backdrop(R, '#3a2a20');
  R.layer(1);

  // ---- the room: walls, ceiling, floor
  R.paint((c) => {
    c.fillStyle = '#cfb48a'; // plaster, a warm cream
    c.fillRect(E_L, E_CEIL, E_R - E_L, -E_CEIL);
    // a painted dado, darker, with a thin cream rail
    const dado = c.createLinearGradient(0, -118, 0, 0);
    dado.addColorStop(0, '#b78a62');
    dado.addColorStop(1, '#9a7050');
    c.fillStyle = dado;
    c.fillRect(E_L, -112, E_R - E_L, 112);
    c.fillStyle = '#ecd9b6';
    c.fillRect(E_L, -116, E_R - E_L, 5);
    // ceiling and a cornice
    c.fillStyle = '#5a4332';
    c.fillRect(E_L - 200, -900, E_R - E_L + 400, 900 + E_CEIL);
    c.fillStyle = '#ead7b2';
    c.fillRect(E_L, E_CEIL - 2, E_R - E_L, 14);
    c.fillStyle = 'rgba(70,45,25,0.35)';
    c.fillRect(E_L, E_CEIL + 12, E_R - E_L, 3);
    // room ends: dark, out of the light
    c.fillStyle = '#3c2c22';
    c.fillRect(E_L - 200, E_CEIL - 20, 200, 380);
    c.fillRect(E_R, E_CEIL - 20, 200, 380);
    // a faint repeat stencil frieze under the cornice
    c.fillStyle = 'rgba(150,100,60,0.28)';
    for (let x = E_L + 6; x < E_R; x += 22) {
      poly(c, [[x, E_CEIL + 20], [x + 7, E_CEIL + 27], [x, E_CEIL + 34], [x - 7, E_CEIL + 27]]);
      c.fill();
    }
  });
  textured(R, E_L, E_CEIL, E_R - E_L, -E_CEIL - 116, 'plaster', 31, 0.55);
  tiledFloor(R, E_L - 200, E_R + 200, 300, 33, ['#c9b48f', '#8c5f4a', '#3f5d66']);

  // ---- the front door at the left end, shut; light under it
  const dx = EID_DOOR_X;
  // the doorway: architrave, and beyond it (when open) a lit stair landing
  R.cast((c) => {
    extrudeRect(c, dx - 62, -222, 124, 222, 10, { color: '#e6d3ae' });
    c.fillStyle = '#e6d3ae';
    c.fillRect(dx - 62, -222, 124, 222);
    c.fillStyle = '#5b3a24';
    c.fillRect(dx - 50, -208, 100, 208);
  });
  if (open > 0.01) {
    R.paint((c) => {
      c.save();
      c.beginPath();
      c.rect(dx - 50, -208, 100, 208);
      c.clip();
      c.fillStyle = '#cdbf9f'; // the landing's back wall, stone-pale
      c.fillRect(dx - 50, -208, 100, 208);
      c.fillStyle = '#a89a7c';
      c.fillRect(dx - 50, -208, 100, 6);
      c.fillStyle = '#8c8478'; // landing floor
      c.fillRect(dx - 50, -16, 100, 16);
      // a flight of steps climbing to the right, and its rail
      for (let k = 0; k < 6; k++) {
        c.fillStyle = k % 2 ? '#b4a98e' : '#a99e83';
        c.fillRect(dx - 6 + k * 9, -16 - k * 16, 9 * (6 - k) + 6, 16);
      }
      c.strokeStyle = '#2f2b27';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(dx - 8, -50);
      c.lineTo(dx + 50, -130);
      c.stroke();
      // a stairwell window high on the wall
      c.fillStyle = '#3a342c';
      c.fillRect(dx - 36, -176, 22, 40);
      c.restore();
    });
    R.glow((c) => {
      c.save();
      c.beginPath();
      c.rect(dx - 50, -208, 100, 208);
      c.clip();
      c.globalAlpha = open;
      c.fillStyle = 'rgba(230,240,235,0.9)';
      c.fillRect(dx - 35, -175, 20, 38);
      soft(c, dx - 25, -155, 90, 'rgba(255,240,205,0.3)');
      c.restore();
      // the landing's light spilling across the floor of the room
      c.globalAlpha = open * 0.8;
      c.fillStyle = 'rgba(255,236,190,0.18)';
      poly(c, [[dx - 50, 0], [dx + 50, 0], [dx + 150, 30], [dx - 30, 30]]);
      c.fill();
    });
  }
  // the leaf, hinged at the left, narrowing as it swings into the room
  R.cast((c) => {
    const lw = lerp(100, 14, smooth(0, 1, open));
    const lx = dx - 50;
    c.fillStyle = '#5b3a24';
    c.fillRect(lx, -208, lw, 208);
    for (const [py, ph] of [[-196, 70], [-118, 70]]) {
      for (const [fx, fw] of [[0.08, 0.38], [0.54, 0.38]]) {
        c.fillStyle = '#6d4730';
        c.fillRect(lx + lw * fx, py, lw * fw, ph);
        c.fillStyle = '#4a2e1b';
        c.fillRect(lx + lw * fx + 3 * Math.min(1, lw / 60), py + 4, Math.max(0, lw * fw - 6 * Math.min(1, lw / 60)), ph - 8);
      }
    }
    c.fillStyle = '#c7a24f'; // brass handle and a small escutcheon
    c.fillRect(lx + lw - 16, -100, 9, 4);
    ell(c, lx + lw - 12, -96, 6 * Math.min(1, lw / 60), 8, '#c7a24f');
    c.fillStyle = '#1b1008';
    c.fillRect(lx + lw / 2 - 3, -160, 6, 6); // peephole
  });
  R.glow((c) => {
    const lg = c.createLinearGradient(0, -6, 0, 3);
    lg.addColorStop(0, 'rgba(255,220,160,0)');
    lg.addColorStop(1, 'rgba(255,225,170,0.5)');
    c.fillStyle = lg;
    c.globalAlpha = 1 - open;
    c.fillRect(dx - 50, -6, 100, 6);
  });
  // a mat, and the family's shoes left at the door
  R.cast((c) => {
    c.fillStyle = '#6a4a38';
    c.fillRect(dx - 50, 2, 100, 5);
    const r = rng(41);
    const cols = ['#2c2420', '#7a5a3a', '#3a4a5a', '#8a3a2a'];
    for (let i = 0; i < 6; i++) {
      const sx = dx + 62 + i * 15 + r() * 4;
      c.fillStyle = cols[i % 4];
      c.beginPath();
      c.moveTo(sx, 0);
      c.quadraticCurveTo(sx + 1, -9, sx + 10, -8);
      c.quadraticCurveTo(sx + 14, -3, sx + 14, 0);
      c.closePath();
      c.fill();
    }
  });

  // ---- wall hangings: calligraphy, photographs, a clock
  R.cast((c) => {
    // the framed calligraphy, over the head of the table
    const fx = E0 - 70;
    extrudeRect(c, fx - 56, -300, 112, 62, 4, { color: '#a67c2e' });
    c.fillStyle = '#c59a3e';
    c.fillRect(fx - 56, -300, 112, 62);
    c.fillStyle = '#16120d';
    c.fillRect(fx - 50, -294, 100, 50);
    c.fillStyle = '#e1b954';
    c.font = `26px ${ARABIC}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('ما شاء الله', fx, -264, 84);
    c.fillRect(fx - 40, -250, 80, 1.5);
    // family photographs on the left wall, in a loose cluster
    const photos = [[-390, -250, 34, 44], [-348, -262, 44, 34], [-340, -222, 32, 40], [-300, -240, 30, 38]];
    for (const [px, py, pw, ph] of photos) {
      const x = E0 + px;
      slab(c, x - pw / 2, py - ph / 2, pw, ph, 3, '#6b4528');
      c.fillStyle = '#cdbf9e';
      c.fillRect(x - pw / 2 + 3, py - ph / 2 + 3, pw - 6, ph - 6);
      c.fillStyle = '#6a5a4a';
      ell(c, x - 5, py - 4, 3.5, 4, '#6a5a4a');
      ell(c, x + 6, py - 2, 3, 3.6, '#7a6652');
      c.fillRect(x - 9, py + 1, 8, 8);
      c.fillRect(x + 3, py + 2, 7, 7);
    }
    // a round wall clock
    c.fillStyle = '#3a2a1c';
    c.beginPath();
    c.arc(E0 + 300, -270, 22, 0, TAU);
    c.fill();
    c.fillStyle = '#f0e6cc';
    c.beginPath();
    c.arc(E0 + 300, -270, 18, 0, TAU);
    c.fill();
    c.strokeStyle = '#2a1c10';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(E0 + 300, -270);
    c.lineTo(E0 + 300, -283);
    c.moveTo(E0 + 300, -270);
    c.lineTo(E0 + 310, -266);
    c.stroke();
  });

  // ---- the television on its cabinet, a cloth thrown over it
  const tvx = E0 - 372;
  R.cast((c) => {
    slab(c, tvx - 46, -50, 92, 50, 14, '#6d4a2e');
    c.fillStyle = '#573a22';
    c.fillRect(tvx - 40, -42, 36, 38);
    c.fillRect(tvx + 4, -42, 36, 38);
    c.fillStyle = '#c7a24f';
    c.fillRect(tvx - 6, -26, 3, 6);
    c.fillRect(tvx + 3, -26, 3, 6);
    // a CRT set under the cloth, and its rabbit-ear aerial
    c.fillStyle = '#26221e';
    c.fillRect(tvx - 34, -108, 68, 58);
    c.strokeStyle = '#2a2622';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(tvx - 2, -108);
    c.lineTo(tvx - 26, -156);
    c.moveTo(tvx + 2, -108);
    c.lineTo(tvx + 24, -154);
    c.stroke();
    // the cloth: cream, embroidered, bulging over the set and hanging at the sides
    const sw = wave(t, tvx, 0.6);
    c.fillStyle = '#efe1c0';
    c.beginPath();
    c.moveTo(tvx - 44, -44);
    c.quadraticCurveTo(tvx - 42, -100, tvx - 30, -112);
    c.quadraticCurveTo(tvx, -124 + sw, tvx + 30, -112);
    c.quadraticCurveTo(tvx + 44, -98, tvx + 46, -52);
    c.lineTo(tvx + 40, -46 + sw);
    c.lineTo(tvx + 30, -56);
    c.lineTo(tvx - 36, -54);
    c.lineTo(tvx - 40, -42);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(150,110,70,0.35)';
    c.lineWidth = 1.2;
    for (let k = -3; k <= 3; k++) {
      c.beginPath();
      c.moveTo(tvx + k * 11, -118 + Math.abs(k) * 2);
      c.quadraticCurveTo(tvx + k * 13, -80, tvx + k * 12.5, -54);
      c.stroke();
    }
    c.fillStyle = '#a3402f'; // a red embroidered border
    c.fillRect(tvx - 36, -58, 78, 4);
  });

  // ---- the window, afternoon light behind it
  const wx = E0 + 140;
  R.paint((c) => {
    c.fillStyle = '#e8d7b4';
    c.beginPath();
    archPath(c, wx - 74, wx + 74, -304, -138, 40);
    c.fill();
    c.fillStyle = '#1d1712';
    c.beginPath();
    archPath(c, wx - 62, wx + 62, -294, -148, 36);
    c.fill();
    c.fillStyle = '#d7c39b'; // sill
    c.fillRect(wx - 78, -142, 156, 8);
  });
  R.glow((c) => {
    c.save();
    c.beginPath();
    archPath(c, wx - 62, wx + 62, -294, -148, 36);
    c.clip();
    const sg = c.createLinearGradient(0, -294, 0, -148);
    sg.addColorStop(0, 'rgba(176,205,235,0.95)');
    sg.addColorStop(1, 'rgba(255,236,190,0.95)');
    c.fillStyle = sg;
    c.fillRect(wx - 70, -300, 140, 160);
    c.restore();
  });
  R.paint((c) => {
    // a far skyline of flat roofs and a minaret, hazed, then the glazing bars
    c.save();
    c.beginPath();
    archPath(c, wx - 62, wx + 62, -294, -148, 36);
    c.clip();
    c.fillStyle = '#c8aa8a';
    c.fillRect(wx - 60, -176, 36, 30);
    c.fillRect(wx - 20, -190, 30, 44);
    c.fillRect(wx + 18, -170, 44, 24);
    c.fillStyle = '#bd9b7c';
    c.fillRect(wx + 36, -230, 8, 70);
    poly(c, [[wx + 34, -230], [wx + 40, -246], [wx + 46, -230]]);
    c.fill();
    c.restore();
    c.fillStyle = '#e8d7b4';
    c.fillRect(wx - 2, -296, 4, 150);
    c.fillRect(wx - 64, -216, 128, 4);
    // wooden shutters folded back each side, and a sheer curtain
    c.fillStyle = '#7a5a3a';
    c.fillRect(wx - 90, -280, 14, 138);
    c.fillRect(wx + 76, -280, 14, 138);
  });
  // the sheer curtain, lifting in the draught from the window
  R.paint((c) => {
    const sw = swayAng(t, 0.6, 5, 4.6) + Math.sin(t * 2.7) * 1.2;
    c.fillStyle = 'rgba(245,235,215,0.55)';
    c.beginPath();
    c.moveTo(wx - 72, -300);
    c.lineTo(wx - 30, -300);
    c.quadraticCurveTo(wx - 24 + sw * 1.6, -230, wx - 46 + sw, -140);
    c.lineTo(wx - 72, -140);
    c.fill();
    c.fillStyle = 'rgba(245,235,215,0.4)';
    c.beginPath();
    c.moveTo(wx + 72, -300);
    c.lineTo(wx + 36, -300);
    c.quadraticCurveTo(wx + 30 - sw * 1.2, -230, wx + 50 - sw * 0.8, -140);
    c.lineTo(wx + 72, -140);
    c.fill();
  });
  // the shaft of light from the window, across the wall and floor, and dust in it
  R.glow((c) => {
    const bg = c.createLinearGradient(wx, -250, wx - 260, 0);
    bg.addColorStop(0, 'rgba(255,224,160,0.2)');
    bg.addColorStop(1, 'rgba(255,214,140,0.05)');
    c.fillStyle = bg;
    poly(c, [[wx - 60, -292], [wx + 60, -292], [wx - 90, 0], [wx - 330, 0]]);
    c.fill();
    c.fillStyle = 'rgba(255,236,190,0.22)'; // the lit patch on the floor
    poly(c, [[wx - 340, 3], [wx - 100, 3], [wx - 120, 26], [wx - 380, 26]]);
    c.fill();
    const r = rng(7);
    for (let i = 0; i < 26; i++) {
      const u = r();
      const bx = lerp(wx - 40, wx - 220, u) + Math.sin(t * 0.3 + i) * 9;
      const by = lerp(-280, -20, u) + ((t * 6 * (0.4 + r() * 0.6) + r() * 200) % 40) - 20;
      c.fillStyle = `rgba(255,240,200,${0.1 + 0.2 * Math.abs(Math.sin(t * 0.8 + i))})`;
      c.fillRect(bx, by, 2, 2);
    }
  });

  // ---- a pendant lamp over the table
  R.cast((c) => {
    c.strokeStyle = '#2a1e14';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(E0 + 30, E_CEIL + 12);
    c.lineTo(E0 + 30, -262);
    c.stroke();
    c.fillStyle = '#9a7a34';
    c.beginPath();
    c.moveTo(E0 + 14, -250);
    c.quadraticCurveTo(E0 + 18, -268, E0 + 30, -270);
    c.quadraticCurveTo(E0 + 42, -268, E0 + 46, -250);
    c.closePath();
    c.fill();
  });
  R.glow((c) => {
    soft(c, E0 + 30, -250, 120, 'rgba(255,200,120,0.34)');
    c.fillStyle = 'rgba(255,235,190,0.95)';
    c.fillRect(E0 + 20, -252, 20, 4);
  });

  // ---- the glass-fronted cabinet, right: Eid sweets, the good tea glasses
  const vx = E0 + 520;
  R.cast((c) => {
    slab(c, vx - 70, -200, 140, 200, 18, '#6a4428');
    c.fillStyle = '#4a2f1b';
    c.fillRect(vx - 62, -192, 124, 142);
    c.fillStyle = '#e0b86a'; // shelves with glasses and a tea set
    for (const sy of [-150, -108, -66]) {
      c.fillStyle = '#7a5a38';
      c.fillRect(vx - 62, sy, 124, 4);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = i % 3 === 0 ? '#e8d9b0' : 'rgba(210,150,80,0.9)';
        c.fillRect(vx - 56 + i * 13, sy - 12, 7, 12);
      }
    }
    c.fillStyle = '#5c3a22';
    c.fillRect(vx - 62, -48, 124, 48);
    c.fillStyle = '#c7a24f';
    c.fillRect(vx - 4, -30, 3, 8);
    c.fillRect(vx + 2, -30, 3, 8);
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(190,220,235,0.07)';
    c.fillRect(vx - 62, -192, 124, 142);
    c.fillStyle = 'rgba(255,240,200,0.25)';
    poly(c, [[vx - 40, -192], [vx - 22, -192], [vx - 52, -50], [vx - 62, -50]]);
    c.fill();
  });

  // ---- the long rug and the cushions the children sit on
  R.paint((c) => {
    const rx0 = TX0 - 60;
    const rx1 = TX1 + 70;
    c.fillStyle = '#7a2e26';
    poly(c, [[rx0, 4], [rx1, 4], [rx1 + 18, 36], [rx0 - 18, 36]]);
    c.fill();
    c.fillStyle = '#c9a25a';
    poly(c, [[rx0 + 6, 8], [rx1 - 6, 8], [rx1 + 6, 30], [rx0 - 6, 30]]);
    c.lineWidth = 2;
    c.strokeStyle = '#c9a25a';
    c.stroke();
    c.fillStyle = 'rgba(30,50,70,0.8)';
    for (let x = rx0 + 20; x < rx1 - 20; x += 36) {
      poly(c, [[x, 19], [x + 9, 11], [x + 18, 19], [x + 9, 27]]);
      c.fill();
    }
  });
  R.cast((c) => {
    const cols = [['#8a3a2c', '#c9a25a'], ['#35566e', '#d6c08a'], ['#6a4a6a', '#c9a25a']];
    [[-440, 66], [-340, 74], [-292, 60]].forEach(([cx, w], i) => {
      const x = E0 + cx;
      const [a, b] = cols[i % 3];
      extrudePoly(c, [[x - w / 2, 0], [x - w / 2 + 4, -14], [x + w / 2 - 4, -14], [x + w / 2, 0]], 10, { color: a });
      c.fillStyle = a;
      c.beginPath();
      c.moveTo(x - w / 2, 0);
      c.lineTo(x - w / 2 + 4, -14);
      c.quadraticCurveTo(x, -18, x + w / 2 - 4, -14);
      c.lineTo(x + w / 2, 0);
      c.closePath();
      c.fill();
      c.fillStyle = b;
      c.fillRect(x - w / 2 + 6, -9, w - 12, 2.5);
      c.fillStyle = '#2f4a5a';
      for (let k = x - w / 2 + 10; k < x + w / 2 - 10; k += 12) c.fillRect(k, -6, 5, 3);
    });
  });

  // ---- chairs, the long table, what is on it
  R.cast((c) => {
    EID_SEATS.slice(0, 9).forEach(([sx], i) => chair(c, sx, { col: i % 2 ? '#5b3b26' : '#684429' }));
    chair(c, EID_HEAD_X + 8, { back: -128, col: '#4d301d', arm: true });
  });
  R.shadow((c) => {
    c.fillStyle = '#000';
    c.fillRect(TX0, -80, TX1 - TX0, 80);
    EID_SEATS.forEach(([sx]) => c.fillRect(sx - 18, -104, 36, 104));
  }, (TX0 + TX1) / 2, 0, 1.2, 0.12);

  R.cast((c) => {
    // the white cloth over the table, with a lace and embroidery hem
    extrudeRect(c, TX0, TABLE_TOP, TX1 - TX0, 8, 22, { color: '#e8dcc0' });
    c.fillStyle = '#efe4c8';
    c.fillRect(TX0, TABLE_TOP, TX1 - TX0, 8);
    c.fillStyle = '#e8dcc0';
    c.beginPath();
    c.moveTo(TX0 - 4, TABLE_TOP + 6);
    c.lineTo(TX1 + 4, TABLE_TOP + 6);
    c.lineTo(TX1 + 2, -30);
    for (let x = TX1 + 2; x > TX0; x -= 14) c.quadraticCurveTo(x - 7, -24, x - 14, -30);
    c.lineTo(TX0 - 2, -30);
    c.closePath();
    c.fill();
    c.fillStyle = '#b45a3a';
    c.fillRect(TX0, -50, TX1 - TX0, 3);
    c.fillStyle = '#35566e';
    for (let x = TX0 + 8; x < TX1 - 4; x += 16) {
      poly(c, [[x, -45], [x + 4, -41], [x, -37], [x - 4, -41]]);
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = TX0 + 40; x < TX1; x += 58) c.fillRect(x, TABLE_TOP + 8, 2, 46); // folds
  });

  const y0 = TABLE_TOP;
  R.cast((c) => {
    const rim = '#e9e2d0';
    const plate = (x, w) => {
      ell(c, x, y0 - 2, w / 2, 4.5, rim);
      ell(c, x, y0 - 3.5, w / 2 - 5, 2.8, '#d4cdb9');
      c.fillStyle = '#35566e'; // a blue rim on every dish
      c.fillRect(x - w / 2 + 2, y0 - 3, 4, 1.5);
      c.fillRect(x + w / 2 - 6, y0 - 3, 4, 1.5);
    };
    // flatbread, stacked, with a cloth over the top
    {
      const x = E0 - 176;
      for (let i = 0; i < 9; i++) {
        ell(c, x + (i % 2) * 2, y0 - 3 - i * 2.8, 34, 4.4, i % 2 ? '#d8b66f' : '#cfa95c');
      }
      ell(c, x, y0 - 29, 30, 4, '#e0c383');
      c.fillStyle = 'rgba(120,70,30,0.45)';
      for (let k = 0; k < 6; k++) c.fillRect(x - 22 + k * 8, y0 - 30 + (k % 2), 4, 2);
    }
    // kibbeh: a pyramid of golden-brown footballs
    {
      const x = E0 - 118;
      plate(x, 78);
      const rows = [[-26, 18, 4], [-17, 9, 3], [-9, 0, 2]];
      let n = 0;
      for (let rI = 0; rI < 4; rI++) {
        const cnt = 5 - rI;
        for (let k = 0; k < cnt; k++) {
          const kx = x + (k - (cnt - 1) / 2) * 15;
          const ky = y0 - 7 - rI * 8;
          c.fillStyle = n % 2 ? '#a8641f' : '#b97a2e';
          c.beginPath();
          c.ellipse(kx, ky, 9, 5.5, 0.15, 0, TAU);
          c.fill();
          c.fillStyle = 'rgba(255,220,140,0.35)';
          c.fillRect(kx - 4, ky - 3, 5, 1.6);
          n++;
        }
      }
      void rows;
    }
    // yoghurt bowls, mint on top
    for (const bx of [E0 - 62, E0 + 2, E0 + 166]) {
      c.fillStyle = '#ece4d0';
      c.beginPath();
      c.moveTo(bx - 16, y0 - 12);
      c.quadraticCurveTo(bx - 14, y0, bx, y0);
      c.quadraticCurveTo(bx + 14, y0, bx + 16, y0 - 12);
      c.closePath();
      c.fill();
      ell(c, bx, y0 - 12, 16, 3.4, '#fbf6ea');
      c.fillStyle = '#4f7a3c';
      c.fillRect(bx - 4, y0 - 14, 3, 2);
      c.fillRect(bx + 2, y0 - 14, 3, 2);
      c.fillStyle = '#35566e';
      c.fillRect(bx - 16, y0 - 12, 32, 1.4);
    }
    // tabbouleh in a big bowl
    {
      const x = E0 - 28;
      c.fillStyle = '#d9d2bd';
      c.beginPath();
      c.moveTo(x - 30, y0 - 14);
      c.quadraticCurveTo(x - 26, y0, x, y0);
      c.quadraticCurveTo(x + 26, y0, x + 30, y0 - 14);
      c.closePath();
      c.fill();
      c.fillStyle = '#5a8a3a';
      c.beginPath();
      c.ellipse(x, y0 - 16, 29, 11, 0, Math.PI, 0);
      c.fill();
      const r = rng(5);
      for (let i = 0; i < 20; i++) {
        c.fillStyle = r() < 0.3 ? '#c43a2a' : r() < 0.5 ? '#78a64a' : '#3f6a2c';
        c.fillRect(x - 24 + r() * 48, y0 - 24 + r() * 9, 3, 2.4);
      }
      c.fillStyle = '#35566e';
      c.fillRect(x - 30, y0 - 14, 60, 1.6);
    }
    // the rice, a mound with almonds and pine nuts
    {
      const x = E0 + 70;
      plate(x, 104);
      c.fillStyle = '#efe0b8';
      c.beginPath();
      c.ellipse(x, y0 - 5, 44, 24, 0, Math.PI, 0);
      c.fill();
      const r = rng(9);
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI;
        const rr = r() * 0.9;
        c.fillStyle = r() < 0.4 ? '#cf9a46' : r() < 0.5 ? '#f7ecc6' : '#b57a2c';
        c.fillRect(x + Math.cos(a) * 42 * rr * -1, y0 - 6 - Math.sin(a) * 22 * rr, 3, 2);
      }
      c.fillStyle = 'rgba(255,255,240,0.35)';
      c.beginPath();
      c.ellipse(x - 12, y0 - 20, 14, 5, -0.3, 0, TAU);
      c.fill();
    }
    // the lamb shoulder, at the father's end, and the carving knife
    {
      const x = E0 + 292;
      plate(x, 112);
      c.fillStyle = '#7d3f1c';
      c.beginPath();
      c.moveTo(x - 38, y0 - 6);
      c.quadraticCurveTo(x - 38, y0 - 30, x - 8, y0 - 32);
      c.quadraticCurveTo(x + 34, y0 - 34, x + 42, y0 - 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#a55a28';
      c.beginPath();
      c.ellipse(x - 2, y0 - 24, 24, 7, -0.1, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,200,120,0.4)';
      c.fillRect(x - 16, y0 - 28, 18, 2);
      c.fillStyle = '#efe6d2'; // the bone
      c.fillRect(x - 54, y0 - 19, 20, 5);
      ell(c, x - 55, y0 - 16.5, 4, 4.5, '#efe6d2');
      c.fillStyle = '#4f7a3c';
      for (let k = 0; k < 6; k++) c.fillRect(x + 14 + k * 5, y0 - 5 - (k % 2) * 2, 3, 2);
      c.fillStyle = '#c9c9c4';
      c.fillRect(x + 50, y0 - 6, 24, 2.4);
      c.fillStyle = '#2a1c10';
      c.fillRect(x + 72, y0 - 7, 12, 4);
    }
    // glasses of juice, here and there, and a jug
    const glassXs = [-206, -150, -92, -34, 24, 118, 214, 256, 330];
    for (const gx of glassXs) {
      const x = E0 + gx;
      c.fillStyle = 'rgba(235,240,245,0.55)';
      c.fillRect(x - 4, y0 - 15, 8, 15);
      c.fillStyle = '#e07a22';
      c.fillRect(x - 3, y0 - 11, 6, 10);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(x - 3, y0 - 14, 1.4, 12);
    }
    c.fillStyle = 'rgba(235,240,245,0.55)';
    c.fillRect(E0 + 190, y0 - 34, 14, 34);
    c.fillStyle = '#e8892a';
    c.fillRect(E0 + 191.5, y0 - 26, 11, 25);
    c.fillStyle = 'rgba(235,240,245,0.55)';
    c.fillRect(E0 + 204, y0 - 28, 4, 3);
  });
  R.glow((c) => {
    for (const gx of [-206, -150, -92, -34, 24, 118, 214, 256, 330]) {
      c.fillStyle = 'rgba(255,150,60,0.28)';
      c.fillRect(E0 + gx - 3, y0 - 11, 6, 10);
    }
    c.fillStyle = 'rgba(255,170,70,0.3)';
    c.fillRect(E0 + 191.5, y0 - 26, 11, 25);
  });
  const sk = 1 - hush * 0.7;
  steam(R, E0 + 70, y0 - 24, t, sk, 1);
  steam(R, E0 - 118, y0 - 38, t, sk * 0.7, 2);
  steam(R, E0 + 290, y0 - 34, t, sk, 3);
}

// ============================================================ PROTEST ==

const P0 = MEM.protest[0];
export const ALLEY_X0 = P0 + 1250;
const ALLEY_W = 420;
const MOSQUE_X0 = P0 - 1800;
const MOSQUE_X1 = P0 - 1200;

function nearView(R, x, w = 1700, depth = 1) {
  return Math.abs(x - R.cam.x * depth) < w;
}

// The intact town far off: flat roofs, water tanks, domes and minarets.
function farTown(R, depth, color, seed, ground, extra = 0) {
  R.layer(depth);
  const cxd = R.cam.x * depth;
  R.paint((c) => {
    c.fillStyle = color;
    const r = rng(seed);
    const x0 = Math.floor((cxd - 1500) / 80) * 80;
    for (let x = x0, i = 0; x < cxd + 1500; x += 70 + ((i++ * 37) % 60)) {
      const rr = rng(seed + (x | 0) * 3);
      const h = 60 + rr() * 150 + extra;
      const w = 70 + rr() * 60;
      c.fillRect(x, ground - h, w, h + 400);
      if (rr() < 0.35) c.fillRect(x + 10, ground - h - 14, 24, 14); // a water tank
      if (rr() < 0.18) {
        c.beginPath();
        c.ellipse(x + w / 2, ground - h, 24, 20, 0, Math.PI, 0);
        c.fill(); // a dome
      }
      if (rr() < 0.12) T.minaret(c, x + w / 2, ground - h, 0.7 + rr() * 0.3, color, false);
    }
    void r;
  });
  R.layer(1);
}

// A blossom tree, whole, by the mosque wall.
function blossomTree(R, x, t) {
  R.cast((c) => {
    c.fillStyle = '#4a3828';
    poly(c, [[x - 7, 0], [x - 4, -90], [x + 4, -90], [x + 8, 0]]);
    c.fill();
    c.strokeStyle = '#4a3828';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, -80);
    c.quadraticCurveTo(x - 30, -110, x - 50, -140);
    c.moveTo(x, -84);
    c.quadraticCurveTo(x + 30, -112, x + 52, -134);
    c.stroke();
  });
  R.paint((c) => {
    // the crown leans a little each way about the trunk's top, with the occasional gust
    c.save();
    c.translate(x, -86);
    c.rotate(swayAng(t, x * 0.01, 0.03, 5.5));
    c.translate(-x, 86);
    const r = rng(77);
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU;
      const d = Math.sqrt(r());
      const bx = x + Math.cos(a) * 64 * d;
      const by = -140 + Math.sin(a) * 44 * d;
      c.fillStyle = ['#f3d9dc', '#f6e6e4', '#e9bfc6', '#ffffff'][(r() * 4) | 0];
      c.beginPath();
      c.arc(bx + Math.sin(t * 0.7 + i) * 1.4, by + Math.sin(t * 0.9 + i * 1.7) * 0.9, 8 + r() * 6, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#6f8f44';
    for (let i = 0; i < 10; i++) c.fillRect(x - 50 + r() * 100, -170 + r() * 70, 5, 3);
    c.restore();
  });
}

// The mosque frontage: striped (ablaq) stone, a pointed-arch door, a dome and a whole minaret.
function mosque(R, t) {
  const x0 = MOSQUE_X0;
  const x1 = MOSQUE_X1;
  const H = 300;
  R.cast((c) => {
    extrudeRect(c, x0, -H, x1 - x0, H, 36, { color: '#d9ceb0' });
    // ablaq: courses of cream and charcoal-grey
    for (let y = 0, i = 0; y < H; y += 22, i++) {
      c.fillStyle = i % 2 ? '#bfb596' : '#e1d6b8';
      c.fillRect(x0, -y - 22, x1 - x0, 22);
    }
    c.fillStyle = '#6a625a';
    for (let y = 0; y < H; y += 44) c.fillRect(x0, -y - 22, x1 - x0, 22);
    // a parapet with crenellations
    c.fillStyle = '#e1d6b8';
    c.fillRect(x0 - 6, -H - 10, x1 - x0 + 12, 12);
    for (let x = x0; x < x1; x += 28) c.fillRect(x, -H - 24, 16, 14);
  });
  R.surface((c) => c.rect(x0, -H, x1 - x0, H), 'limestone', { seed: 52, alpha: 0.5 });
  // the dome behind the parapet
  R.cast((c) => {
    const dx = x0 + 240;
    c.fillStyle = '#8f9b92';
    c.beginPath();
    c.ellipse(dx, -H - 24, 108, 92, 0, Math.PI, 0);
    c.fill();
    c.fillRect(dx - 108, -H - 24, 216, 24);
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.beginPath();
    c.ellipse(dx - 30, -H - 70, 40, 40, 0, Math.PI * 1.1, Math.PI * 1.8);
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.stroke();
    c.fillStyle = '#b9a266';
    c.fillRect(dx - 2, -H - 138, 4, 22);
    c.beginPath();
    c.arc(dx, -H - 148, 8, 0.6, TAU - 0.6);
    c.lineWidth = 3;
    c.strokeStyle = '#b9a266';
    c.stroke();
  });
  // the door: a deep pointed arch, double leaf, a muqarnas-ish hood
  const dx = x0 + 300;
  R.cast((c) => {
    c.fillStyle = '#efe6cc';
    c.beginPath();
    archPath(c, dx - 82, dx + 82, -256, 0, 70);
    c.fill();
    c.fillStyle = '#6a625a';
    c.beginPath();
    archPath(c, dx - 72, dx + 72, -244, 0, 66);
    c.fill();
    c.fillStyle = '#4e331e';
    c.beginPath();
    archPath(c, dx - 60, dx + 60, -230, 0, 60);
    c.fill();
    // the leaves, studded
    c.strokeStyle = 'rgba(15,8,2,0.6)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(dx, 0);
    c.lineTo(dx, -240);
    c.stroke();
    c.fillStyle = '#c7a24f';
    for (let y = -20; y > -150; y -= 24) for (const sx of [-48, -30, -12, 12, 30, 48]) c.fillRect(dx + sx - 1.5, y, 3, 3);
    c.fillRect(dx - 8, -96, 3, 14);
    c.fillRect(dx + 5, -96, 3, 14);
    // a stone step
    c.fillStyle = '#b3a589';
    c.fillRect(dx - 92, -8, 184, 10);
  });
  // an inscription band over the door, in gold on dark
  R.paint((c) => {
    c.fillStyle = '#2a2824';
    c.fillRect(dx - 80, -276, 160, 24);
    c.fillStyle = '#d1ac4f';
    c.font = `20px ${ARABIC}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('الله أكبر', dx, -258);
  });
  // windows, two rows, glowing green and amber glass
  const wins = [-230, -150, 150, 230].map((o) => dx + o);
  R.paint((c) => {
    for (const wxx of wins) {
      c.fillStyle = '#3a342c';
      c.beginPath();
      archPath(c, wxx - 22, wxx + 22, -230, -130, 30);
      c.fill();
    }
  });
  R.glow((c) => {
    wins.forEach((wxx, i) => {
      c.fillStyle = i % 2 ? 'rgba(80,150,110,0.5)' : 'rgba(210,160,70,0.5)';
      c.beginPath();
      archPath(c, wxx - 18, wxx + 18, -226, -134, 28);
      c.fill();
    });
  });
  // shoe racks and a stack of prayer rugs by the door
  R.cast((c) => {
    slab(c, dx + 110, -34, 80, 34, 10, '#6a4a30');
    c.fillStyle = '#2c2420';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(dx + 120 + i * 12, -38, 6, 3, 0, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#7a2e26';
    c.fillRect(dx - 190, -26, 50, 7);
    c.fillStyle = '#35566e';
    c.fillRect(dx - 188, -19, 46, 7);
    c.fillStyle = '#5a6a3e';
    c.fillRect(dx - 190, -12, 50, 7);
  });
  // the minaret: square shaft in bands, gallery, upper shaft, cap and crescent
  const mx = x1 - 10;
  R.cast((c) => {
    extrudeRect(c, mx - 24, -330, 48, 330, 20, { color: '#d6cbb0' });
    for (let y = 0, i = 0; y < 330; y += 22, i++) {
      c.fillStyle = i % 2 ? '#bfb596' : '#e1d6b8';
      c.fillRect(mx - 24, -y - 22, 48, 22);
    }
    c.fillStyle = '#6a625a';
    for (let y = 0; y < 330; y += 44) c.fillRect(mx - 24, -y - 22, 48, 22);
    // arched openings on the shaft
    c.fillStyle = '#2a2420';
    for (const y of [-80, -170, -250]) c.fillRect(mx - 4, y, 8, 22);
    // gallery
    extrudeRect(c, mx - 38, -346, 76, 16, 14, { color: '#cfc3a6' });
    c.fillStyle = '#cfc3a6';
    c.fillRect(mx - 38, -346, 76, 16);
    c.fillStyle = '#6a625a';
    for (let x = mx - 36; x < mx + 36; x += 8) c.fillRect(x, -368, 3, 22);
    c.fillRect(mx - 38, -370, 76, 4);
    // upper shaft and a pointed cap
    slab(c, mx - 15, -440, 30, 72, 10, '#d6cbb0');
    c.fillStyle = '#8f9b92';
    c.beginPath();
    c.moveTo(mx - 20, -440);
    c.quadraticCurveTo(mx - 18, -470, mx, -498);
    c.quadraticCurveTo(mx + 18, -470, mx + 20, -440);
    c.closePath();
    c.fill();
    c.fillStyle = '#b9a266';
    c.fillRect(mx - 1, -522, 2, 26);
    c.strokeStyle = '#b9a266';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(mx, -530, 7, 0.6, TAU - 0.6);
    c.stroke();
  });
  R.glow((c) => {
    // the muezzin's loudspeaker lamp is lit, and the green string lamp
    soft(c, mx, -352, 30, 'rgba(120,230,150,0.2)');
  });
}

const BUILDINGS = [
  // x offset from P0, width, storeys, colour, door kind
  [-1040, 330, 3, '#d8b58c', 'wood'],
  [-710, 360, 3, '#e0cba4', 'steel'],
  [-350, 330, 2, '#cfa98a', 'gate'],
  [-20, 380, 3, '#dcc39a', 'steel'],
  [360, 340, 3, '#c9b690', 'wood'],
  [700, 380, 2, '#d9b99c', 'steel'],
  [1080, 170, 3, '#d4c096', 'gate'],
];

const SHOPS = [
  'بقالة النور',
  'حلويات الشام',
  'صيدلية الأمل',
  'خضار وفواكه',
  'مكتبة الفجر',
  'محل ملابس',
  'أبو سعيد للأحذية',
];

// People-shaped silhouettes leaning on a balcony rail, far, hushed.
function leaner(c, x, y, k, seed) {
  c.fillStyle = k > 0.5 ? '#4b3b34' : '#5a463c';
  ell(c, x, y - 36, 7.5, 8.5, c.fillStyle);
  c.beginPath();
  c.moveTo(x - 14, y);
  c.quadraticCurveTo(x - 14, y - 28, x - 6, y - 28);
  c.lineTo(x + 6, y - 28);
  c.quadraticCurveTo(x + 14, y - 28, x + 14, y);
  c.closePath();
  c.fill();
  // forearms on the rail
  c.fillRect(x - 17, y - 3, 34, 4);
  if (seed % 3 === 0) {
    // one hand up, waving, or holding a phone to film
    c.fillRect(x + 11, y - 46, 4, 20);
    ell(c, x + 13, y - 48, 3, 3.4, c.fillStyle);
  }
}

// Storeys at a person's scale: the shops' storey (opening, shutter and sign
// band) is 270 tall, each flat above it 224; windows are 74 x 107 on an 86 sill,
// a balcony door 92 x 205, a balcony rail 92 high.
const G0 = 270;
const FH = 224;

function buildingFront(R, i, t, scatter) {
  const [ox, w, floors, col, doorKind] = BUILDINGS[i];
  const x = P0 + ox;
  if (!nearView(R, x + w / 2, 1750)) return;
  const top = -(G0 + FH * (floors - 1));
  const r = rng(300 + i);
  R.cast((c) => {
    extrudeRect(c, x, top - 10, w, -top + 10, 44, { color: col });
    c.fillStyle = col;
    c.fillRect(x, top, w, -top);
    // roof parapet
    c.fillStyle = T.shade(col, 0.92);
    c.fillRect(x - 4, top - 12, w + 8, 14);
    c.fillStyle = T.shade(col, 1.08);
    c.fillRect(x - 4, top - 12, w + 8, 3);
  });
  R.surface((c) => c.rect(x, top, w, -top), 'plaster', { seed: 90 + i, alpha: 0.45 });
  // roof clutter: a tank on a stand, a satellite dish
  R.cast((c) => {
    if (i % 2 === 0) {
      c.fillStyle = '#7a8088';
      c.fillRect(x + 40, top - 40, 40, 26);
      c.fillRect(x + 44, top - 14, 3, 14);
      c.fillRect(x + 73, top - 14, 3, 14);
    }
    c.fillStyle = '#d4d4cc';
    c.beginPath();
    c.ellipse(x + w - 50, top - 22, 14, 9, -0.6, 0, TAU);
    c.fill();
    c.fillStyle = '#555';
    c.fillRect(x + w - 51, top - 18, 2, 18);
  });

  // upper storeys: windows with shutters, balconies, a little laundry
  for (let f = 1; f < floors; f++) {
    const fy = -G0 - FH * (f - 1); // the floor level of this storey
    const cols = Math.max(1, Math.floor(w / 130));
    const pitch = w / cols;
    for (let k = 0; k < cols; k++) {
      const wx = x + pitch * (k + 0.5);
      const balcony = (k + f + i) % 2 === 0;
      if (balcony) {
        // door opening to the balcony, and its curtain stirring in the draught
        R.paint((c) => {
          c.fillStyle = '#e8dcc0';
          c.fillRect(wx - 52, fy - 212, 104, 212);
          c.fillStyle = '#2a211a';
          c.fillRect(wx - 46, fy - 205, 92, 205);
          const sw = swayAng(t, i * 1.3 + k + f * 2, 4, 3.6);
          c.fillStyle = 'rgba(210,190,150,0.5)'; // a curtain
          c.beginPath();
          c.moveTo(wx - 46, fy - 205);
          c.lineTo(wx - 16, fy - 205);
          c.quadraticCurveTo(wx - 12 + sw * 2, fy - 100, wx - 18 + sw * 1.4, fy);
          c.lineTo(wx - 46, fy);
          c.closePath();
          c.fill();
        });
        R.cast((c) => {
          extrudeRect(c, wx - 75, fy - 8, 150, 10, 26, { color: '#b8a584' });
          c.fillStyle = '#b8a584';
          c.fillRect(wx - 75, fy - 8, 150, 10);
          // the rail: iron, 92 high, with vertical bars
          c.fillStyle = '#2f2b27';
          c.fillRect(wx - 75, fy - 100, 150, 3.5);
          for (let b = wx - 72; b < wx + 75; b += 9) c.fillRect(b, fy - 100, 1.8, 92);
        });
        // people leaning out; they go in when the shots start
        const stay = r() < 0.4;
        const out = stay ? 1 : 1 - smooth(0.15, 0.5, scatter + r() * 0.2);
        if (out > 0.02) {
          R.paint((c) => {
            c.save();
            c.globalAlpha = out;
            const n = 1 + ((k + f) % 2);
            for (let p = 0; p < n; p++) {
              const sway = Math.sin(t * 1.3 + k * 2 + p * 3 + i) * 1.4;
              c.save();
              c.translate(wx - 24 + p * 48 + sway, fy - 100);
              c.scale(1.6, 1.6);
              leaner(c, 0, 0, 1, (i + k + p) | 0);
              c.restore();
            }
            c.restore();
          });
        }
        if (r() < 0.5) {
          R.paint((c) => {
            // laundry on a line off the balcony, stirring
            const ly = fy - 190;
            c.strokeStyle = '#3a3128';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(wx - 75, ly);
            c.lineTo(wx - 75 + pitch * 0.62, ly - 5 + Math.sin(t * 0.8 + k) * 0.8);
            c.stroke();
            const cl = ['#f0ece0', '#c64a3a', '#4a78a8', '#e8d28a'];
            for (let q = 0; q < 4; q++) {
              const gx = wx - 68 + q * 22;
              const sw = swayAng(t, q * 1.7 + k + i, 3.2, 2.8) + Math.sin(t * 3.1 + q * 2 + i) * 0.8;
              c.fillStyle = cl[(q + k) % 4];
              c.beginPath();
              c.moveTo(gx, ly + q * 0.4);
              c.lineTo(gx + 14, ly + q * 0.4);
              c.lineTo(gx + 14 + sw, ly + 34 + (q % 2) * 10);
              c.lineTo(gx + sw, ly + 34 + (q % 2) * 10);
              c.closePath();
              c.fill();
            }
          });
        }
      } else {
        // an arched window, 74 x 107 on an 86 sill, a shutter open
        R.paint((c) => {
          const sw = swayAng(t, i + k * 2 + f, 1.5, 4.4);
          c.fillStyle = '#e8dcc0';
          c.beginPath();
          archPath(c, wx - 43, wx + 43, fy - 200, fy - 80, 36);
          c.fill();
          c.fillStyle = '#2a211a';
          c.beginPath();
          archPath(c, wx - 37, wx + 37, fy - 193, fy - 86, 32);
          c.fill();
          c.fillStyle = '#6a8a7a';
          c.fillRect(wx + 39, fy - 190, 22, 100);
          c.fillStyle = 'rgba(0,0,0,0.18)';
          for (let y = fy - 186; y < fy - 94; y += 7) c.fillRect(wx + 39, y, 22, 1.4);
          c.fillStyle = 'rgba(210,190,150,0.45)';
          c.beginPath();
          c.moveTo(wx - 37, fy - 168);
          c.lineTo(wx - 10, fy - 168);
          c.quadraticCurveTo(wx - 8 + sw * 2, fy - 130, wx - 14 + sw * 1.5, fy - 86);
          c.lineTo(wx - 37, fy - 86);
          c.closePath();
          c.fill();
        });
      }
    }
    // a cornice between storeys
    R.paint((c) => {
      c.fillStyle = T.shade(col, 1.07);
      c.fillRect(x, fy + 2, w, 4);
    });
  }

  // the ground floor: shops and a front door
  const gcols = Math.max(2, Math.floor(w / 130));
  const doorSlot = gcols - 1;
  const gw = w / gcols;
  for (let k = 0; k < gcols; k++) {
    const sx = x + gw * k;
    if (k === doorSlot) {
      R.paint((c) => T.syrianDoor(c, sx + gw / 2, 92, 205, doorKind, 600 + i));
      continue;
    }
    shopFront(R, sx + 6, gw - 12, 500 + i * 7 + k, SHOPS[(i * 2 + k * 3) % SHOPS.length], scatter, t);
  }
}

// A shop with its shutter up on goods, lowering as the street empties.
// The opening is 230 tall, the sign band over it 34.
function shopFront(R, x, w, seed, sign, scatter, t) {
  const r = rng(seed);
  const baseOpen = 0.55 + r() * 0.4; // fraction of the opening still clear
  const stag = r() * 0.5;
  const open = baseOpen * (1 - smooth(stag * 0.7, stag * 0.7 + 0.45, scatter)) + 0.04;
  const awning = r() < 0.5;
  const goods = r();
  const H1 = 230;
  R.paint((c) => {
    c.fillStyle = '#e0cfae';
    c.fillRect(x - 5, -(H1 + 8), w + 10, H1 + 8);
    c.fillStyle = '#26190f';
    c.fillRect(x, -H1, w, H1);
    // shelves with goods in jars and boxes
    c.fillStyle = '#6a4d33';
    for (let s = 0; s < 4; s++) c.fillRect(x + 4, -198 + s * 52, w - 8, 3);
    const rr = rng(seed + 3);
    for (let s = 0; s < 4; s++) {
      for (let q = x + 8; q < x + w - 14; q += 14) {
        c.fillStyle = ['#c0453a', '#d7b24a', '#3f6a4a', '#e8e0cc', '#35566e'][(rr() * 5) | 0];
        const hh = 18 + rr() * 8;
        c.fillRect(q, -198 + s * 52 - hh, 10, hh);
      }
    }
    // a bulb inside
    c.fillStyle = '#ffe9b0';
    c.fillRect(x + w / 2 - 2, -H1, 4, 10);
    // sign board
    c.fillStyle = ['#2f4a5a', '#5a3a2a', '#3f5a3a', '#6a2e2a'][seed % 4];
    c.fillRect(x - 5, -(H1 + 42), w + 10, 34);
    c.fillStyle = '#e8dcc0';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.font = `24px ${ARABIC}`;
    const sw = c.measureText(sign).width;
    const fit = Math.min(24, (24 * (w - 6)) / Math.max(sw, 1));
    c.font = `${fit.toFixed(1)}px ${ARABIC}`;
    c.fillText(sign, x + w / 2, -(H1 + 17));
  });
  R.glow((c) => {
    const k = 1 - open;
    c.fillStyle = `rgba(255,214,140,${0.16 * (1 - k)})`;
    c.fillRect(x, -H1, w, H1 * (1 - k * 0.9));
  });
  // goods out on the pavement: crates of fruit, a bench of sweets
  R.cast((c) => {
    if (goods < 0.4) {
      for (let q = 0; q < 2; q++) {
        slab(c, x + 8 + q * 40, -22, 34, 22, 6, '#8a6a40');
        c.fillStyle = q ? '#d8892a' : '#c8402f';
        for (let b = 0; b < 5; b++) {
          c.beginPath();
          c.arc(x + 14 + q * 40 + b * 6.5, -25, 4, 0, TAU);
          c.fill();
        }
      }
    }
  });
  // the rolling shutter, lowered by `1 - open`
  const sh = H1 * (1 - open);
  R.cast((c) => {
    if (sh < 2) return;
    c.fillStyle = '#8f8d86';
    c.fillRect(x - 2, -(H1 + 4), w + 4, sh + 4);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = -H1; y < -(H1 + 4) + sh; y += 5) c.fillRect(x - 2, y, w + 4, 1.2);
    c.fillStyle = '#4a4540';
    c.fillRect(x + w / 2 - 3, -(H1 + 4) + sh - 2, 6, 6);
  });
  R.cast((c) => {
    // a striped awning, rolled in by the same hand; its fringe stirs
    if (awning) {
      const ah = 30 * open;
      const aw = w + 10;
      for (let s = 0, n = 0; s < aw; s += 18, n++) {
        const f1 = Math.sin(t * 1.9 + s * 0.12 + seed) * 2.2 * (1 + 0.8 * gust(t, seed)) * open;
        const f2 = Math.sin(t * 1.9 + (s + 18) * 0.12 + seed) * 2.2 * (1 + 0.8 * gust(t, seed)) * open;
        c.fillStyle = n % 2 ? '#f0e8d6' : '#b8473a';
        poly(c, [[x - 5 + s, -(H1 + 8)], [x - 5 + s + 18, -(H1 + 8)], [x - 9 + s + 18, -(H1 + 8) + 22 + ah + f2], [x - 9 + s, -(H1 + 8) + 22 + ah + f1]]);
        c.fill();
      }
    }
  });
}

function dumpsterShape(c, x, w, h, lid) {
  // body: wider at the top than at the base
  c.beginPath();
  c.moveTo(x - w * 0.42, 0);
  c.lineTo(x - w / 2, -h);
  c.lineTo(x + w / 2, -h);
  c.lineTo(x + w * 0.42, 0);
  c.closePath();
  void lid;
}

// The municipal dumpster in the alley mouth, wheeled, a lid ajar.
export function drawDumpster(R) {
  const x = DUMPSTER_X;
  const w = 210;
  const h = 128;
  R.cast((c) => {
    // wheels
    for (const wx of [-72, 72]) {
      c.fillStyle = '#1c1a18';
      c.beginPath();
      c.arc(x + wx, -9, 9, 0, TAU);
      c.fill();
    }
    extrudePoly(c, [[x - w * 0.42, -8], [x - w / 2, -h], [x + w / 2, -h], [x + w * 0.42, -8]], 58, { color: '#3c6a4e' });
    c.fillStyle = '#3c6a4e';
    c.beginPath();
    c.moveTo(x - w * 0.42, -8);
    c.lineTo(x - w / 2, -h);
    c.lineTo(x + w / 2, -h);
    c.lineTo(x + w * 0.42, -8);
    c.closePath();
    c.fill();
    // ribs, a lower rim and a lip at the top
    c.fillStyle = 'rgba(0,0,0,0.2)';
    for (let k = -3; k <= 3; k++) c.fillRect(x + k * 26 - 2, -h + 8, 4, h - 22);
    c.fillStyle = '#2f5540';
    c.fillRect(x - w * 0.43, -26, w * 0.86, 8);
    c.fillStyle = '#2b4d3a';
    c.fillRect(x - w / 2 - 4, -h - 6, w + 8, 10);
    c.fillStyle = 'rgba(255,255,230,0.18)';
    c.fillRect(x - w / 2 - 4, -h - 6, w + 8, 2);
    // the lid, propped open at one side, so there is a dark gap
    extrudePoly(c, [[x - w / 2 - 4, -h - 6], [x + w / 2 + 4, -h - 6], [x + w / 2 + 4, -h - 22], [x - w / 2 - 4, -h - 12]], 58, { color: '#34603f' });
    c.fillStyle = '#34603f';
    poly(c, [[x - w / 2 - 4, -h - 6], [x + w / 2 + 4, -h - 6], [x + w / 2 + 4, -h - 22], [x - w / 2 - 4, -h - 12]]);
    c.fill();
    // a bin liner spilling out, a flattened box
    c.fillStyle = '#26262a';
    c.beginPath();
    c.ellipse(x - 50, -h - 8, 22, 12, 0.2, Math.PI, 0);
    c.fill();
    c.fillStyle = '#b89a6a';
    poly(c, [[x + 20, -h - 8], [x + 60, -h - 18], [x + 64, -h - 12], [x + 24, -h - 4]]);
    c.fill();
    // a stencilled municipality mark
    c.fillStyle = '#e6e1c8';
    c.font = `18px ${ARABIC}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('بلدية', x, -52);
    // rust at the foot
    c.fillStyle = 'rgba(120,60,24,0.5)';
    c.fillRect(x - w * 0.42, -24, w * 0.84, 6);
  });
  R.surface((c) => dumpsterShape(c, x, w, h), 'rust', { seed: 71, alpha: 0.3, scale: 1.8 });
  R.shadow((c) => {
    c.fillStyle = '#000';
    dumpsterShape(c, x, w, h);
    c.fill();
  }, x, 0, 1.3, 0.12);
}

// The far crowd: soft silhouettes on a layer behind the actors' plane.
const CROWD = (() => {
  const r = rng(2011);
  const list = [];
  let x = -1100;
  while (x < 1100) {
    x += 17 + r() * 18;
    const dens = 1 - clamp((x - 200) / 900) * 0.7; // thick by the mosque, thin toward the alley
    if (r() > dens) continue;
    list.push({
      x,
      h: 112 + r() * 20,
      ph: r() * TAU,
      arm: r() < 0.4,
      arm2: r() < 0.12,
      th: r() * 0.6,
      dir: r() < 0.62 ? 1 : -1,
      tone: r(),
      back: list.length % 3 === 1,
      stray: r() < 0.06,
      sign: r() < 0.14,
      wide: r() < 0.3,
    });
  }
  return list;
})();

const mixHex = (a, b, k) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => (lerp(v, pb[i], k) | 0)).join(',')})`;
};

// A distant crowd: small, hazed toward the sky, on a far layer in a band that
// narrows with distance, so the near street stays clear for the people in it.
function farCrowd(R, t, scatter) {
  const d = 0.6;
  R.layer(d);
  const f1 = R.cam.frame(R.W, R.H, 1);
  const fd = R.cam.frame(R.W, R.H, d);
  const gy = (f1.oy - fd.oy) / fd.s - 52; // feet well up the street, behind the near pavement
  const cxd = R.cam.x * d;
  const base = P0 * d;
  R.paint((c) => {
    c.save();
    c.translate(0, gy);
    for (const back of [true, false]) {
      for (const p of CROWD) {
        if (p.back !== back) continue;
        const X = base + p.x;
        if (Math.abs(X - cxd) > 760) continue;
        const s = p.stray ? Math.min(clamp((scatter - p.th) / 0.4), 0.45) : clamp((scatter - p.th) / 0.38);
        if (s >= 0.995) continue;
        const bob = Math.abs(Math.sin(t * (2 + s * 5) + p.ph)) * (1.2 + s * 4);
        const x = X + p.dir * s * 200 + Math.sin(t * 0.8 + p.ph) * 1.5;
        const y = -bob - (back ? 9 : 0);
        c.globalAlpha = p.stray ? 0.85 - s * 0.4 : 0.88 * (1 - s * s);
        const k = (p.h / 120) * (back ? 0.5 : 0.62);
        c.save();
        c.translate(x, y);
        c.rotate(p.dir * s * 0.4);
        c.scale(k, k);
        const tone = ['#5e4a40', '#3f4448', '#6c5240', '#8a8070', '#453d3c', '#4a5240', '#7a5a52'][(p.tone * 7) | 0];
        c.fillStyle = mixHex(tone, '#bccbd6', back ? 0.62 : 0.46);
        const sh = p.wide ? 16 : 13; // half shoulder width
        // head and shoulders, a short body fading to the ground
        c.beginPath();
        c.moveTo(-sh + 2, 0);
        c.lineTo(-sh, -58);
        c.quadraticCurveTo(-sh - 3, -80, -sh + 1, -92);
        c.quadraticCurveTo(-sh + 4, -100, -5, -100);
        c.lineTo(5, -100);
        c.quadraticCurveTo(sh - 4, -100, sh - 1, -92);
        c.quadraticCurveTo(sh + 3, -80, sh, -58);
        c.lineTo(sh - 2, 0);
        c.closePath();
        c.fill();
        c.beginPath();
        c.arc(0, -110, 9.5, 0, TAU);
        c.fill();
        if (p.arm) {
          const a = Math.sin(t * 3.2 + p.ph) * 0.14;
          c.save();
          c.translate(sh - 2, -92);
          c.rotate(-0.25 + a);
          c.fillRect(-3.5, -42, 7, 44);
          c.beginPath();
          c.arc(0, -44, 5, 0, TAU);
          c.fill();
          c.restore();
        }
        if (p.arm2) {
          c.save();
          c.translate(-sh + 2, -92);
          c.rotate(0.3 - Math.sin(t * 3 + p.ph) * 0.12);
          c.fillRect(-3.5, -40, 7, 42);
          c.restore();
        }
        if (p.sign && s < 0.3) {
          // a placard on a stick, held high and swaying a little
          c.save();
          c.translate(-sh + 4, -96);
          c.rotate(-0.08 + Math.sin(t * 1.4 + p.ph) * 0.05);
          c.fillStyle = mixHex('#e8dfc8', '#bccbd6', 0.3);
          c.fillRect(-1.6, -78, 3.2, 78);
          c.fillRect(-26, -112, 52, 36);
          c.restore();
        }
        c.restore();
      }
    }
    c.restore();
  });
  R.layer(1);
}

// What the street keeps when they have run: a sandal, a dropped sign.
function leftBehind(R, scatter) {
  if (scatter < 0.45) return;
  const k = smooth(0.45, 0.8, scatter);
  R.cast((c) => {
    c.globalAlpha = k;
    const r = rng(33);
    for (let i = 0; i < 7; i++) {
      const x = P0 - 900 + i * 380 + r() * 120;
      if (!nearView(R, x, 1700)) continue;
      c.fillStyle = i % 2 ? '#3a2c24' : '#7a5a38';
      c.beginPath();
      c.ellipse(x, -2, 9, 3, r() * 0.4, 0, TAU);
      c.fill();
    }
    // a hand-lettered sheet, face down on the kerb
    c.fillStyle = '#e8dfc8';
    poly(c, [[P0 + 120, 2], [P0 + 174, 0], [P0 + 180, 5], [P0 + 126, 8]]);
    c.fill();
    c.fillStyle = '#9a8a6c';
    c.fillRect(P0 + 130, 3, 40, 1.4);
  });
}

// The alley's mouth: shaded walls drawing together toward a far, bright end.
function alley(R, t) {
  const x0 = ALLEY_X0;
  const x1 = x0 + ALLEY_W;
  const xc = (x0 + x1) / 2 + 20;
  R.paint((c) => {
    // sky above the gap
    // the left wall (the flank of the last shop), the right wall, the far end
    const fl = xc - 74;
    const fr = xc + 74;
    c.fillStyle = '#b79c7c';
    poly(c, [[x0, -420], [fl, -230], [fl, -22], [x0, 0]]);
    c.fill();
    c.fillStyle = '#9b8366';
    poly(c, [[x1, -420], [fr, -230], [fr, -22], [x1, 0]]);
    c.fill();
    c.fillStyle = '#cdb690';
    c.fillRect(fl, -230, fr - fl, 208);
    // the far end: a doorway, a window, a bright cross street
    c.fillStyle = '#4a382a';
    c.fillRect(xc - 18, -92, 30, 70);
    c.fillStyle = '#2a211a';
    c.fillRect(xc + 24, -150, 22, 32);
    c.fillStyle = '#e4d6b4';
    c.fillRect(fl, -232, fr - fl, 8);
    // the floor, climbing into the distance
    c.fillStyle = '#8c8070';
    poly(c, [[x0, 0], [x1, 0], [fr, -22], [fl, -22]]);
    c.fill();
    // shadow of the walls
    const sg = c.createLinearGradient(x0, 0, x1, 0);
    sg.addColorStop(0, 'rgba(25,18,30,0.5)');
    sg.addColorStop(0.5, 'rgba(25,18,30,0.12)');
    sg.addColorStop(1, 'rgba(25,18,30,0.55)');
    c.fillStyle = sg;
    poly(c, [[x0, -420], [fl, -230], [fl, -22], [x0, 0]]);
    c.fill();
    poly(c, [[x1, -420], [fr, -230], [fr, -22], [x1, 0]]);
    c.fill();
    c.fillStyle = 'rgba(25,18,30,0.22)';
    c.fillRect(fl, -230, fr - fl, 208);
    // pipes and cables along the wall, and a drain
    c.strokeStyle = '#4a4036';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x0 + 8, -280);
    c.lineTo(fl + 6, -200);
    c.moveTo(x1 - 8, -300);
    c.lineTo(fr - 6, -210);
    c.stroke();
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x0, -330);
    c.quadraticCurveTo(xc, -296, x1, -340);
    c.stroke();
  });
  R.glow((c) => {
    // light at the far end, pouring toward us
    soft(c, xc + 4, -120, 110, 'rgba(255,224,170,0.3)');
    c.fillStyle = 'rgba(255,230,180,0.18)';
    poly(c, [[xc - 70, -22], [xc + 70, -22], [xc + 170, 0], [xc - 150, 0]]);
    c.fill();
  });
  // washing strung across the alley, moving a little
  R.paint((c) => {
    const y = -270;
    const cl = ['#f0ece0', '#c64a3a', '#4a78a8', '#e8d28a', '#7a9a6a'];
    for (let q = 0; q < 5; q++) {
      const x = lerp(x0 + 60, x1 - 60, (q + 0.5) / 5);
      c.fillStyle = cl[q];
      const sw = Math.sin(t * 1.1 + q) * 1.5;
      c.fillRect(x + sw, y + 2 + Math.sin(q) * 3, 12, 22);
    }
  });
}

export function drawProtest(R, g, { t = 0, scatter = 0, dumpster = true, farPeople = false } = {}) {
  const sc = clamp(scatter);
  // a spring afternoon: pale high sky, warm low
  T.sky(R, [[0, '#6a9fdc'], [0.42, '#a9cdea'], [0.78, '#f6e3b4']], { sun: [0.9, 0.2], warmth: 0.3, clouds: 0.35 });
  farTown(R, 0.22, '#c4ae96', 21, 60, 40);
  farTown(R, 0.45, '#b49c82', 23, 70, 0);
  R.layer(1);

  T.street(R, P0 - 2000, P0 + 2000, { color: '#756a5c', pave: '#988d7c' });
  mosque(R, t);
  blossomTree(R, P0 - 1120, t);
  for (let i = 0; i < BUILDINGS.length; i++) buildingFront(R, i, t, sc);
  alley(R, t);
  // the last block, beyond the alley
  R.cast((c) => {
    const x = ALLEY_X0 + ALLEY_W;
    extrudeRect(c, x, -450, 500, 450, 44, { color: '#d3b794' });
    c.fillStyle = '#d3b794';
    c.fillRect(x, -450, 500, 450);
    c.fillStyle = '#c3a780';
    c.fillRect(x - 4, -462, 508, 14);
  });
  R.surface((c) => c.rect(ALLEY_X0 + ALLEY_W, -450, 500, 450), 'plaster', { seed: 99, alpha: 0.45 });
  R.paint((c) => {
    const x = ALLEY_X0 + ALLEY_W;
    // windows 74 x 107 on an 86 sill, a row to each storey; the door takes the third bay below
    for (let k = 0; k < 4; k++) {
      c.fillStyle = '#e8dcc0';
      c.beginPath();
      archPath(c, x + 20 + k * 120, x + 106 + k * 120, -(224 + 86 + 107) - 6, -(224 + 80), 36);
      c.fill();
      c.fillStyle = '#2a211a';
      c.beginPath();
      archPath(c, x + 26 + k * 120, x + 100 + k * 120, -(224 + 86 + 107), -(224 + 86), 32);
      c.fill();
      if (k === 2) continue;
      c.fillStyle = '#e8dcc0';
      c.beginPath();
      archPath(c, x + 20 + k * 120, x + 106 + k * 120, -(86 + 107) - 6, -80, 36);
      c.fill();
      c.fillStyle = '#2a211a';
      c.beginPath();
      archPath(c, x + 26 + k * 120, x + 100 + k * 120, -(86 + 107), -86, 32);
      c.fill();
    }
    T.syrianDoor(c, x + 303, 92, 205, 'steel', 777);
  });
  if (farPeople) farCrowd(R, t, sc); // (off: the story fills the street with people of its own)
  leftBehind(R, sc);
  if (dumpster) drawDumpster(R);
  // the wide pavement in front gets a little blossom blown across it
  R.glow((c) => {
    const r = rng(12);
    for (let i = 0; i < 18; i++) {
      const x = R.cam.x - 700 + ((r() * 1400 + t * 18 * (0.5 + r())) % 1400);
      const y = -20 - r() * 200 + Math.sin(t * 0.9 + i) * 10;
      c.fillStyle = 'rgba(255,235,235,0.5)';
      c.fillRect(x, y, 3, 2);
    }
  });
}

// ============================================================ SCHOOL ==

const S0 = MEM.school[0];
const S_L = S0 - 600;
const S_R = S0 + 600;
const S_H = 380;
export const TEACHER_X = S0 - 400;
// Five double desks; ten seats, a child on each side of a bench. y is the seat height.
const DESK_XS = [-190, -70, 50, 170, 290];
export const SCHOOL_DESKS = DESK_XS.flatMap((dx) => [
  [S0 + dx - 26, -32],
  [S0 + dx + 26, -32],
]);

// The 2001-era flag: red, white, black bands, two green stars on the white.
function flag(c, x, y, w, h, t, drop = 0) {
  const bands = [['#ce1126', 0], ['#f4f1ea', 1], ['#111111', 2]];
  const bh = h / 3;
  for (const [col, i] of bands) {
    c.fillStyle = col;
    c.beginPath();
    const y0 = y + i * bh;
    c.moveTo(x, y0);
    const n = 8;
    for (let k = 1; k <= n; k++) c.lineTo(x + (w * k) / n, y0 + wave(t, x + k * 14, 1.6) * (k / n) + drop * (k / n));
    for (let k = n; k >= 0; k--) c.lineTo(x + (w * k) / n, y0 + bh + wave(t, x + k * 14, 1.6) * (k / n) + drop * (k / n));
    c.closePath();
    c.fill();
  }
  // two green five-pointed stars on the white band
  c.fillStyle = '#007a3d';
  for (const sx of [0.34, 0.66]) {
    const cx = x + w * sx;
    const cy = y + bh * 1.5 + wave(t, x + w * sx, 1.6) * sx + drop * sx;
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? bh * 0.17 : bh * 0.42;
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }
}

// A double desk of old wood: a sloped top with an inkwell, a bench, iron legs.
function deskFront(c, x, k = 1, dark = 1) {
  const col = '#8a5a34';
  const lt = T.shade(col, 1.18 * dark);
  const bx = x - 50;
  // iron frame legs
  c.fillStyle = '#2c2a28';
  c.fillRect(bx + 6, -30, 4, 30);
  c.fillRect(bx + 90, -30, 4, 30);
  // bench with a back rail
  extrudeRect(c, bx, -34, 100, 6, 12, { color: '#7a4e2c' });
  c.fillStyle = '#7a4e2c';
  c.fillRect(bx, -34, 100, 6);
  // modesty board and a shelf for the satchels
  c.fillStyle = T.shade(col, 0.78 * dark);
  c.fillRect(bx + 4, -70, 92, 40);
  c.fillStyle = '#4a2f1b';
  c.fillRect(bx + 10, -48, 80, 4);
  // the top: sloped, a lighter lip
  extrudeRect(c, bx - 2, -76, 104, 8, 18, { color: '#946238' });
  c.fillStyle = lt;
  c.fillRect(bx - 2, -76, 104, 8);
  c.fillStyle = '#d6b17a';
  c.fillRect(bx - 2, -76, 104, 2);
  // ink-wells, a groove, carved initials
  c.fillStyle = '#1b1a1c';
  ell(c, bx + 18, -77, 4, 2.2, '#1b1a1c');
  ell(c, bx + 82, -77, 4, 2.2, '#1b1a1c');
  c.fillStyle = 'rgba(30,18,8,0.5)';
  c.fillRect(bx + 48, -75, 4, 3);
  void k;
}

export function drawSchool(R, g, { t = 0 } = {}) {
  backdrop(R, '#3a3a34');
  R.layer(1);
  // ---- room shell
  R.paint((c) => {
    // an institutional two-tone: pale distemper above, a green oil-painted dado
    c.fillStyle = '#ddd5b4';
    c.fillRect(S_L, -S_H, S_R - S_L, S_H);
    const dado = c.createLinearGradient(0, -130, 0, 0);
    dado.addColorStop(0, '#6d8a78');
    dado.addColorStop(1, '#587664');
    c.fillStyle = dado;
    c.fillRect(S_L, -130, S_R - S_L, 130);
    c.fillStyle = '#ece6cb';
    c.fillRect(S_L, -134, S_R - S_L, 5);
    // ceiling
    c.fillStyle = '#5f5a4c';
    c.fillRect(S_L - 200, -900, S_R - S_L + 400, 900 - S_H);
    c.fillStyle = '#c8c0a0';
    c.fillRect(S_L, -S_H - 2, S_R - S_L, 10);
    c.fillStyle = '#3c3a32';
    c.fillRect(S_L - 200, -S_H - 20, 200, S_H + 20);
    c.fillRect(S_R, -S_H - 20, 200, S_H + 20);
  });
  textured(R, S_L, -S_H, S_R - S_L, S_H - 134, 'plaster', 61, 0.5);
  R.paint((c) => {
    // floor: worn grey terrazzo flags, scuffed
    c.fillStyle = '#9b9384';
    c.fillRect(S_L - 200, 0, S_R - S_L + 400, 300);
    const r = rng(62);
    for (let x = S_L - 200; x < S_R + 200; x += 60) {
      c.fillStyle = `rgba(${r() < 0.5 ? '255,255,240' : '40,36,28'},${0.04 + r() * 0.06})`;
      c.fillRect(x, 0, 60, 300);
      c.fillStyle = 'rgba(40,36,28,0.25)';
      c.fillRect(x, 0, 1, 300);
    }
    c.fillStyle = 'rgba(40,36,28,0.3)';
    c.fillRect(S_L - 200, 14, S_R - S_L + 400, 1);
    const sh = c.createLinearGradient(0, 0, 0, 36);
    sh.addColorStop(0, 'rgba(20,16,10,0.4)');
    sh.addColorStop(1, 'rgba(20,16,10,0)');
    c.fillStyle = sh;
    c.fillRect(S_L - 200, 0, S_R - S_L + 400, 36);
  });

  // ---- the board, its tray and a lesson in chalk
  const bx0 = S0 - 330;
  const bw = 560;
  const by0 = -210;
  const bh = 118;
  R.cast((c) => {
    slab(c, bx0 - 8, by0 - 8, bw + 16, bh + 16, 8, '#6b4a2e');
    c.fillStyle = '#2d3b33';
    c.fillRect(bx0, by0, bw, bh);
    c.fillStyle = '#7a5a36'; // the chalk tray
    c.fillRect(bx0 - 8, by0 + bh + 8, bw + 16, 6);
    c.fillStyle = '#efe9d6';
    for (let k = 0; k < 4; k++) c.fillRect(bx0 + 60 + k * 9, by0 + bh + 4, 6, 4);
    c.fillStyle = '#c9c0a0'; // the duster
    c.fillRect(bx0 + bw - 70, by0 + bh + 1, 26, 7);
    c.fillStyle = '#4a3a2a';
    c.fillRect(bx0 + bw - 70, by0 + bh + 6, 26, 2);
  });
  R.paint((c) => {
    // erased smears, and the lesson: a date and a line of Arabic, a sum
    c.fillStyle = 'rgba(210,215,205,0.08)';
    for (let k = 0; k < 7; k++) c.fillRect(bx0 + 20 + k * 70, by0 + 6 + (k % 3) * 30, 90, 18);
    c.fillStyle = 'rgba(236,236,226,0.85)';
    c.textAlign = 'right';
    c.direction = 'rtl';
    c.font = `22px ${ARABIC}`;
    c.fillText('الدرس الأول: القراءة', bx0 + bw - 24, by0 + 34);
    c.font = `17px ${ARABIC}`;
    c.fillText('٢٠٠١ / ٢ / ١٢', bx0 + bw - 24, by0 + 60);
    c.textAlign = 'left';
    c.direction = 'ltr';
    c.font = '20px monospace';
    c.fillText('12 + 7 = 19', bx0 + 30, by0 + 56);
    c.fillText('8 x 6 = 48', bx0 + 30, by0 + 86);
    c.strokeStyle = 'rgba(236,236,226,0.7)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(bx0 + 240, by0 + 70);
    c.lineTo(bx0 + 300, by0 + 70);
    c.moveTo(bx0 + 240, by0 + 90);
    c.quadraticCurveTo(bx0 + 270, by0 + 110, bx0 + 300, by0 + 92);
    c.stroke();
  });

  // ---- above the board: the official portrait in its gilt frame, a flag at its side
  const px = S0 - 50;
  R.cast((c) => {
    // generic and featureless: an oval head and a pair of shoulders, nothing more
    const fx = px - 44;
    const fy = -352;
    slab(c, fx, fy, 88, 104, 5, '#9a7424');
    c.fillStyle = '#d6aa43';
    c.fillRect(fx, fy, 88, 104);
    c.fillStyle = '#a6802c';
    c.fillRect(fx + 5, fy + 5, 78, 94);
    c.fillStyle = '#e8c35c';
    c.fillRect(fx + 8, fy + 8, 72, 88);
    // gilt ornaments at the corners
    c.fillStyle = '#f3d77a';
    for (const [ox, oy] of [[0, 0], [78, 0], [0, 94], [78, 94]]) {
      ell(c, fx + 5 + ox, fy + 5 + oy, 5, 5, '#f3d77a');
    }
    const g1 = c.createLinearGradient(0, fy + 12, 0, fy + 92);
    g1.addColorStop(0, '#7c92ad');
    g1.addColorStop(1, '#4e6178');
    c.fillStyle = g1;
    c.fillRect(fx + 12, fy + 12, 64, 80);
    c.fillStyle = '#1e2430';
    ell(c, px, fy + 44, 15, 19, '#1e2430');
    c.fillRect(px - 5, fy + 58, 10, 12);
    c.beginPath();
    c.moveTo(fx + 12, fy + 92);
    c.quadraticCurveTo(fx + 14, fy + 68, px - 4, fy + 66);
    c.lineTo(px + 4, fy + 66);
    c.quadraticCurveTo(fx + 74, fy + 68, fx + 76, fy + 92);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)'; // glass glare
    poly(c, [[fx + 12, fy + 12], [fx + 38, fy + 12], [fx + 12, fy + 50]]);
    c.fill();
    // a nail and cord
    c.strokeStyle = '#3a2a18';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx + 10, fy + 4);
    c.lineTo(px, fy - 14);
    c.lineTo(fx + 78, fy + 4);
    c.stroke();
  });
  // the flag on a short pole, at the right, hanging a little
  R.cast((c) => {
    const fx = px + 66;
    c.fillStyle = '#6b4a2e';
    c.fillRect(fx - 3, -348, 4, 126);
    c.fillStyle = '#c7a24f';
    c.beginPath();
    c.moveTo(fx - 4, -348);
    c.lineTo(fx - 1, -362);
    c.lineTo(fx + 2, -348);
    c.fill();
    flag(c, fx + 1, -344, 118, 72, t, 4);
    // the pole's foot in a wall bracket
    c.fillStyle = '#3a2a18';
    c.fillRect(fx - 7, -226, 12, 5);
  });
  // opposite the flag, on the left of the portrait: a school clock and the timetable
  R.cast((c) => {
    const cx = px - 118;
    c.fillStyle = '#3a2a1c';
    c.beginPath();
    c.arc(cx, -306, 26, 0, TAU);
    c.fill();
    c.fillStyle = '#f0ead2';
    c.beginPath();
    c.arc(cx, -306, 22, 0, TAU);
    c.fill();
    c.strokeStyle = '#2a1c10';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, -306);
    c.lineTo(cx + 2, -322);
    c.moveTo(cx, -306);
    c.lineTo(cx + 12, -300);
    c.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12;
      c.fillStyle = '#2a1c10';
      c.fillRect(cx + Math.cos(a) * 19 - 1, -306 + Math.sin(a) * 19 - 1, 2, 2);
    }
  });

  // ---- windows on the right wall of the room: frosted light
  const wx0 = S0 + 300;
  R.paint((c) => {
    for (let k = 0; k < 2; k++) {
      const x = wx0 + k * 150;
      c.fillStyle = '#e8e0c4';
      c.fillRect(x - 6, -318, 112, 190);
      c.fillStyle = '#2a2a28';
      c.fillRect(x, -312, 100, 178);
    }
  });
  R.glow((c) => {
    for (let k = 0; k < 2; k++) {
      const x = wx0 + k * 150;
      const sg = c.createLinearGradient(0, -312, 0, -134);
      sg.addColorStop(0, 'rgba(190,215,235,0.95)');
      sg.addColorStop(1, 'rgba(255,238,196,0.95)');
      c.fillStyle = sg;
      c.fillRect(x, -312, 100, 178);
    }
    // a shaft of light slanting down across the desks
    const bg = c.createLinearGradient(wx0, -300, wx0 - 300, 0);
    bg.addColorStop(0, 'rgba(255,230,170,0.16)');
    bg.addColorStop(1, 'rgba(255,230,170,0.03)');
    c.fillStyle = bg;
    poly(c, [[wx0, -310], [wx0 + 100, -310], [wx0 - 130, 0], [wx0 - 420, 0]]);
    c.fill();
    const r = rng(14);
    for (let i = 0; i < 24; i++) {
      const u = r();
      const x = lerp(wx0 + 40, wx0 - 200, u) + Math.sin(t * 0.3 + i) * 8;
      const y = lerp(-290, -20, u) + ((t * 4 * (0.4 + r() * 0.6) + r() * 120) % 30);
      c.fillStyle = `rgba(255,240,205,${0.12 + 0.2 * Math.abs(Math.sin(t * 0.7 + i))})`;
      c.fillRect(x, y, 2, 2);
    }
  });
  R.paint((c) => {
    for (let k = 0; k < 2; k++) {
      const x = wx0 + k * 150;
      c.fillStyle = '#e8e0c4';
      c.fillRect(x + 48, -312, 4, 178);
      c.fillRect(x, -226, 100, 4);
      c.fillStyle = '#c9c1a4';
      c.fillRect(x - 10, -130, 120, 7);
    }
  });

  // ---- posters on the left wall, a tube light, a hook with coats
  R.cast((c) => {
    // a teacher's desk and chair by the board's left
    const tx = TEACHER_X + 130;
    void tx;
    // a letters chart: the Arabic alphabet in a grid
    const ax = S0 - 470;
    slab(c, ax - 48, -330, 96, 120, 3, '#cdb88a');
    c.fillStyle = '#f3ecd2';
    c.fillRect(ax - 44, -326, 88, 112);
    c.fillStyle = '#6a3a2a';
    c.font = `14px ${ARABIC}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    const letters = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س'];
    letters.forEach((l, i) => c.fillText(l, ax - 28 + (i % 3) * 28, -304 + Math.floor(i / 3) * 26));
    // a map of the country in outline, pinned
    const mx = S0 - 560;
    slab(c, mx - 30, -318, 60, 90, 3, '#cdb88a');
    c.fillStyle = '#d9e0c0';
    c.fillRect(mx - 26, -314, 52, 82);
    c.fillStyle = '#9a8a5a';
    poly(c, [[mx - 16, -300], [mx + 8, -306], [mx + 20, -286], [mx + 14, -262], [mx + 2, -246], [mx - 12, -250], [mx - 20, -276]]);
    c.fill();
  });
  R.glow((c) => {
    // the strip light
    c.fillStyle = 'rgba(235,240,220,0.55)';
    c.fillRect(S0 - 120, -S_H + 12, 240, 5);
    soft(c, S0, -S_H + 14, 130, 'rgba(240,240,215,0.1)');
  });
  R.cast((c) => {
    // coat hooks on the left, a few coats and a satchel
    for (let k = 0; k < 5; k++) {
      const x = S_L + 30 + k * 30;
      c.fillStyle = '#4a3a2a';
      c.fillRect(x - 1, -190, 3, 4);
      if (k !== 2) {
        c.fillStyle = ['#3a4a5a', '#6a3a2a', '#4a5a3a', '#5a4a3a'][k % 4];
        poly(c, [[x - 3, -186], [x - 11, -178], [x - 14, -130], [x - 9, -128], [x - 9, -100], [x + 12, -100], [x + 12, -128], [x + 15, -130], [x + 11, -178]]);
        c.fill();
      }
    }
  });

  // ---- the desks: a back row, dimmer and smaller, then the front row Sami sits in
  R.paint((c) => {
    c.save();
    c.translate(0, -16);
    for (const dx of DESK_XS) {
      c.save();
      c.translate(S0 + dx, 0);
      c.scale(0.85, 0.85);
      c.translate(-(S0 + dx), 0);
      deskFront(c, S0 + dx + 8, 1, 0.7);
      c.restore();
    }
    c.restore();
  });
  R.cast((c) => {
    for (const dx of DESK_XS) deskFront(c, S0 + dx, 1, 1);
    // a satchel hung on the side of one desk, a spilled pencil
    c.fillStyle = '#6a3a2a';
    c.fillRect(S0 + DESK_XS[2] + 52, -62, 20, 26);
    c.fillStyle = '#d9c17a';
    c.fillRect(S0 + DESK_XS[3] - 20, -80, 14, 2);
  });
  R.shadow((c) => {
    c.fillStyle = '#000';
    for (const dx of DESK_XS) c.fillRect(S0 + dx - 52, -76, 104, 76);
  }, S0 + 50, 0, 1.2, 0.12);
  // a teacher's table at the front left, with a book, a ruler and a cane-less stillness
  R.cast((c) => {
    const x = TEACHER_X - 120;
    slab(c, x - 50, -76, 100, 8, 16, '#6a4528');
    c.fillStyle = '#5b3a20';
    c.fillRect(x - 46, -68, 6, 68);
    c.fillRect(x + 40, -68, 6, 68);
    c.fillStyle = '#3a4a5a';
    c.fillRect(x - 30, -84, 30, 8);
    c.fillStyle = '#e8dcc0';
    c.fillRect(x - 28, -81, 26, 3);
    c.fillStyle = '#c9a25a';
    c.fillRect(x + 8, -79, 34, 3);
  });
}

// ============================================================ KITCHEN ==

const K0 = MEM.kitchen[0];
const K_L = K0 - 400;
const K_R = K0 + 400;
const K_H = 300;
export const KITCHEN_DOOR_X = K0 - 230;

export function drawKitchen(R, g, { t = 0, door } = {}) {
  const shut = clamp(door ?? g?.a?.kitchenDoor ?? 0); // 0 open, 1 closed
  backdrop(R, '#3a2f26');
  R.layer(1);
  R.paint((c) => {
    c.fillStyle = '#d2bd88'; // pale yellow plaster
    c.fillRect(K_L, -K_H, K_R - K_L, K_H);
    c.fillStyle = '#5a4838';
    c.fillRect(K_L - 200, -900, K_R - K_L + 400, 900 - K_H);
    c.fillStyle = '#ead9a8';
    c.fillRect(K_L, -K_H - 2, K_R - K_L, 10);
    c.fillStyle = '#3a2c22';
    c.fillRect(K_L - 200, -K_H - 20, 200, K_H + 20);
    c.fillRect(K_R, -K_H - 20, 200, K_H + 20);
    // wall tiles to the height of the counter backsplash: cream squares, a blue border band
    const th = 140;
    c.fillStyle = '#ece3cc';
    c.fillRect(K_L, -th, K_R - K_L, th);
    c.strokeStyle = 'rgba(100,90,70,0.3)';
    c.lineWidth = 1;
    for (let x = K_L; x < K_R; x += 20) {
      c.beginPath();
      c.moveTo(x, -th);
      c.lineTo(x, 0);
      c.stroke();
    }
    for (let y = -th; y < 0; y += 20) {
      c.beginPath();
      c.moveTo(K_L, y);
      c.lineTo(K_R, y);
      c.stroke();
    }
    c.fillStyle = '#35566e';
    c.fillRect(K_L, -th, K_R - K_L, 8);
    for (let x = K_L + 10; x < K_R; x += 40) {
      c.fillStyle = '#5a82a0';
      poly(c, [[x, -th + 30], [x + 8, -th + 38], [x, -th + 46], [x - 8, -th + 38]]);
      c.fill();
    }
    // floor: chequered lino
    for (let x = K_L - 200, i = 0; x < K_R + 200; x += 36, i++) {
      for (let row = 0; row < 8; row++) {
        c.fillStyle = (i + row) % 2 ? '#a89476' : '#82705a';
        c.fillRect(x, row * 20, 36, 20);
      }
    }
    const sh = c.createLinearGradient(0, 0, 0, 34);
    sh.addColorStop(0, 'rgba(20,12,6,0.4)');
    sh.addColorStop(1, 'rgba(20,12,6,0)');
    c.fillStyle = sh;
    c.fillRect(K_L - 200, 0, K_R - K_L + 400, 34);
  });
  textured(R, K_L, -K_H, K_R - K_L, K_H - 140, 'plaster', 81, 0.5);

  // ---- the door, left, hinged on its left: open to a dim hall, or shut
  const dx = KITCHEN_DOOR_X;
  const dw = 92;
  const dh = 205;
  R.paint((c) => {
    c.fillStyle = '#efe0b8';
    c.fillRect(dx - dw / 2 - 8, -dh - 8, dw + 16, dh + 8); // architrave
    c.fillStyle = '#2a211a'; // the hall beyond
    c.fillRect(dx - dw / 2, -dh, dw, dh);
    const hg = c.createLinearGradient(dx - dw / 2, 0, dx + dw / 2, 0);
    hg.addColorStop(0, 'rgba(70,52,38,0.0)');
    hg.addColorStop(1, 'rgba(120,90,60,0.5)');
    c.fillStyle = hg;
    c.fillRect(dx - dw / 2, -dh, dw, dh);
    c.fillStyle = '#7a6046';
    c.fillRect(dx - dw / 2, -26, dw, 26); // hall floor
    c.fillStyle = 'rgba(200,160,110,0.28)';
    c.fillRect(dx - 8, -dh + 20, 36, 150); // light from a far hall window
  });
  R.cast((c) => {
    // the leaf, narrowing as it swings toward us
    const lw = lerp(dw * 0.14, dw, smooth(0, 1, shut));
    const lx = dx - dw / 2;
    if (shut > 0.001) {
      extrudeRect(c, lx, -dh, lw, dh, lerp(10, 4, shut), { color: '#a07a4c' });
    }
    c.fillStyle = '#8c6a44';
    c.fillRect(lx, -dh, lw, dh);
    c.fillStyle = '#765634';
    c.fillRect(lx + lw * 0.1, -dh + 12, lw * 0.8, 74);
    c.fillRect(lx + lw * 0.1, -dh + 98, lw * 0.8, 92);
    c.fillStyle = '#c7a24f'; // handle
    c.fillRect(lx + lw - 12, -100, 8, 4);
    // hinges
    c.fillStyle = '#4a3a2a';
    c.fillRect(lx, -170, 3, 12);
    c.fillRect(lx, -40, 3, 12);
  });
  // a coat on the hook behind the door, and a kitchen calendar
  R.cast((c) => {
    c.fillStyle = '#f0e8d0';
    c.fillRect(dx + 80, -230, 44, 56);
    c.fillStyle = '#b4382e';
    c.fillRect(dx + 80, -230, 44, 12);
    c.fillStyle = '#4a3a2a';
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) c.fillRect(dx + 86 + k * 9, -208 + j * 8, 5, 4);
  });

  // ---- window with the afternoon in it, above the sink and gas ring
  const wx = K0 + 140;
  R.paint((c) => {
    c.fillStyle = '#efe0b8';
    c.fillRect(wx - 70, -270, 140, 120);
    c.fillStyle = '#25201a';
    c.fillRect(wx - 62, -262, 124, 104);
  });
  R.glow((c) => {
    const sg = c.createLinearGradient(0, -262, 0, -158);
    sg.addColorStop(0, 'rgba(190,215,238,0.95)');
    sg.addColorStop(1, 'rgba(255,238,196,0.95)');
    c.fillStyle = sg;
    c.fillRect(wx - 62, -262, 124, 104);
    // the beam across the room
    const bg = c.createLinearGradient(wx, -250, wx - 250, 0);
    bg.addColorStop(0, 'rgba(255,225,160,0.22)');
    bg.addColorStop(1, 'rgba(255,215,140,0.04)');
    c.fillStyle = bg;
    poly(c, [[wx - 60, -258], [wx + 60, -258], [wx - 60, 0], [wx - 300, 0]]);
    c.fill();
    const r = rng(19);
    for (let i = 0; i < 20; i++) {
      const u = r();
      const x = lerp(wx - 20, wx - 180, u) + Math.sin(t * 0.3 + i) * 7;
      const y = lerp(-250, -20, u) + ((t * 5 * (0.4 + r() * 0.6) + r() * 100) % 30);
      c.fillStyle = `rgba(255,240,200,${0.12 + 0.2 * Math.abs(Math.sin(t * 0.7 + i))})`;
      c.fillRect(x, y, 2, 2);
    }
  });
  R.paint((c) => {
    c.fillStyle = '#efe0b8';
    c.fillRect(wx - 2, -262, 4, 104);
    c.fillRect(wx - 62, -214, 124, 4);
    // a gingham half-curtain and a pot of mint on the sill
    const hem = (x) => 18 + Math.sin(t * 1.7 + x * 0.12) * 1.8 * (1 + 0.8 * gust(t, 2));
    c.fillStyle = 'rgba(190,60,50,0.72)';
    c.beginPath();
    c.moveTo(wx - 62, -262);
    c.lineTo(wx + 62, -262);
    for (let x = wx + 62; x >= wx - 62; x -= 8) c.lineTo(x, -262 + hem(x));
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = wx - 62; x < wx + 62; x += 8) c.fillRect(x, -262, 4, hem(x) - 1);
    c.fillStyle = '#d9cba4';
    c.fillRect(wx - 76, -154, 152, 7);
    c.fillStyle = '#9a5a3a';
    c.fillRect(wx + 30, -170, 18, 16);
    c.fillStyle = '#5a8a3a';
    ell(c, wx + 39, -176, 12, 8, '#5a8a3a');
  });

  // ---- the counter, the gas ring, the kettle
  const cx = K0 + 140;
  R.cast((c) => {
    slab(c, cx - 110, -90, 220, 10, 24, '#6b6458');
    c.fillStyle = '#e8dfc4';
    c.fillRect(cx - 108, -80, 216, 80);
    c.fillStyle = '#c9bf9e';
    c.fillRect(cx - 108, -80, 108, 80);
    c.fillStyle = '#b3a984';
    c.fillRect(cx - 2, -80, 3, 80);
    c.fillStyle = '#8a8472';
    c.fillRect(cx - 80, -56, 5, 14);
    c.fillRect(cx + 74, -56, 5, 14);
    // the sink: a steel basin to the left, a tap
    c.fillStyle = '#9a9d9c';
    c.fillRect(cx - 100, -94, 56, 5);
    c.fillStyle = '#6a6e70';
    c.fillRect(cx - 86, -128, 4, 38);
    c.fillRect(cx - 86, -128, 20, 4);
    // the two-burner gas ring, on its stand
    slab(c, cx + 20, -102, 76, 12, 14, '#2b2927');
    for (const bxx of [cx + 40, cx + 76]) {
      ell(c, bxx, -103, 11, 3, '#4a4642');
      ell(c, bxx, -103, 5, 1.5, '#1a1816');
    }
    c.fillStyle = '#1a1816';
    c.fillRect(cx + 30, -90, 4, 4);
    c.fillRect(cx + 82, -90, 4, 4);
    // the kettle, dented steel with a black handle, on the near burner
    const kx = cx + 40;
    c.fillStyle = '#b9bcbc';
    c.beginPath();
    c.moveTo(kx - 18, -104);
    c.quadraticCurveTo(kx - 20, -130, kx - 8, -138);
    c.lineTo(kx + 8, -138);
    c.quadraticCurveTo(kx + 20, -130, kx + 18, -104);
    c.closePath();
    c.fill();
    c.fillStyle = '#d9dcdc';
    c.fillRect(kx - 12, -134, 5, 26);
    c.fillStyle = '#a6a9a9';
    c.beginPath();
    c.moveTo(kx + 16, -118);
    c.quadraticCurveTo(kx + 30, -134, kx + 36, -142);
    c.lineTo(kx + 38, -139);
    c.quadraticCurveTo(kx + 30, -124, kx + 17, -108);
    c.closePath();
    c.fill();
    c.fillStyle = '#1e1a16';
    c.fillRect(kx - 10, -142, 20, 5);
    c.strokeStyle = '#1e1a16';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(kx - 16, -128);
    c.quadraticCurveTo(kx - 38, -146, kx - 14, -142);
    c.stroke();
    // a second pot with a lid on the far burner, and a tea glass
    c.fillStyle = '#7a7c7a';
    c.fillRect(cx + 66, -124, 24, 20);
    c.fillStyle = '#5a5c5a';
    c.fillRect(cx + 64, -127, 28, 4);
    // a shelf with jars and a row of pans
    slab(c, cx - 100, -196, 120, 5, 10, '#6b4a2e');
    const jc = ['#c8402f', '#d7b24a', '#6a8a3a', '#e8e0cc', '#8a5a2a'];
    for (let k = 0; k < 7; k++) {
      c.fillStyle = jc[k % 5];
      c.fillRect(cx - 94 + k * 16, -218, 11, 22);
      c.fillStyle = '#c9c0a0';
      c.fillRect(cx - 94 + k * 16, -221, 11, 3);
    }
    c.strokeStyle = '#3a342e';
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(cx - 80 + k * 40, -250);
      c.lineTo(cx - 80 + k * 40, -238);
      c.stroke();
      ell(c, cx - 80 + k * 40, -226, 13, 11, '#8a8480');
    }
  });
  R.glow((c) => {
    // the burner's blue flame, ringed and small
    const fl = 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 6.3);
    for (let k = -4; k <= 4; k++) {
      c.fillStyle = `rgba(110,170,255,${0.7 * fl})`;
      c.fillRect(cx + 40 + k * 3 - 1, -106, 2, 4 + (k & 1));
    }
    soft(c, cx + 40, -102, 26, 'rgba(120,170,255,0.25)');
  });
  steam(R, cx + 80, -138, t, 0.9, 5);
  // gas cylinder beside the counter, the orange kind
  R.cast((c) => {
    const gx = cx + 142;
    c.fillStyle = '#d96a1c';
    c.beginPath();
    c.moveTo(gx - 17, 0);
    c.lineTo(gx - 17, -62);
    c.quadraticCurveTo(gx - 17, -78, gx, -78);
    c.quadraticCurveTo(gx + 17, -78, gx + 17, -62);
    c.lineTo(gx + 17, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(gx - 12, -70, 4, 60);
    c.fillStyle = '#3a3330';
    c.fillRect(gx - 5, -88, 10, 10);
    c.fillRect(gx - 17, -4, 34, 4);
    c.strokeStyle = '#1e1a16';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(gx - 3, -88);
    c.quadraticCurveTo(gx - 60, -110, gx - 100, -98);
    c.stroke(); // the rubber hose, running to the ring
  });
  // the old refrigerator at the far right
  R.cast((c) => {
    const fx = K0 + 330;
    slab(c, fx - 40, -168, 80, 168, 20, '#ece8dc');
    c.fillStyle = '#bdb9ab';
    c.fillRect(fx - 40, -104, 80, 3);
    c.fillStyle = '#8a8680';
    c.fillRect(fx + 28, -150, 4, 34);
    c.fillRect(fx + 28, -92, 4, 40);
    c.fillStyle = '#c0392b'; // a magnet-held shopping list
    c.fillRect(fx - 20, -140, 22, 28);
    c.fillStyle = '#fff';
    c.fillRect(fx - 18, -138, 18, 24);
  });

  // ---- a small table with two chairs, glasses, a plate of bread
  const tx = K0 - 100;
  R.cast((c) => {
    // chairs
    for (const [cxx, back] of [[tx - 54, -100], [tx + 54, -100]]) {
      slab(c, cxx - 17, back, 34, 4, 4, '#6a4528');
      c.fillStyle = '#6a4528';
      c.fillRect(cxx - 17, back, 4, -42 - back);
      c.fillRect(cxx + 13, back, 4, -42 - back);
      slab(c, cxx - 19, -44, 38, 5, 8, '#7a5230');
      c.fillRect(cxx - 17, -39, 4, 39);
      c.fillRect(cxx + 13, -39, 4, 39);
    }
    // table with a wipe-clean cloth, a check pattern
    slab(c, tx - 50, -74, 100, 6, 18, '#e8dcc0');
    c.fillStyle = '#c0453a';
    for (let x = tx - 50; x < tx + 50; x += 10) c.fillRect(x, -74, 5, 6);
    c.fillStyle = '#6a4528';
    c.fillRect(tx - 44, -68, 5, 68);
    c.fillRect(tx + 39, -68, 5, 68);
    // bread, two tea glasses with saucers, a sugar bowl
    ell(c, tx - 18, -77, 18, 3.5, '#e9e2d0');
    for (let i = 0; i < 3; i++) ell(c, tx - 18, -80 - i * 3, 15, 3.4, i % 2 ? '#d8b66f' : '#cfa95c');
    for (const gx of [tx + 14, tx + 34]) {
      ell(c, gx, -75, 9, 2, '#e9e2d0');
      c.fillStyle = 'rgba(235,240,245,0.5)';
      c.fillRect(gx - 4, -90, 8, 14);
      c.fillStyle = '#9a4a1a';
      c.fillRect(gx - 3, -86, 6, 10);
    }
  });
  R.glow((c) => {
    for (const gx of [tx + 14, tx + 34]) {
      c.fillStyle = 'rgba(255,150,60,0.3)';
      c.fillRect(gx - 3, -86, 6, 10);
    }
  });
  R.shadow((c) => {
    c.fillStyle = '#000';
    c.fillRect(tx - 72, -100, 144, 100);
    c.fillRect(cx - 108, -100, 216, 100);
  }, K0, 0, 1.2, 0.12);
}

// ============================================================== LOOKS ==

// Each memory has its own light; all share the old-photograph grade. g.a.memK
// (0..1) drains it to grey and lifts the blacks; g.a.hush (0..1) stills the
// room: a little darker, flatter, the warmth held back.
export function memoryLook(g, kind) {
  const k = clamp(g.a?.memK || 0);
  const hush = clamp(g.a?.hush || 0);
  const t = g.time || 0;
  const cam = g.cam || { x: 0 };
  let ambient;
  let lights;
  let god = null;
  let fog = null;
  let sat;
  let tint;
  let bloom = 0.9;
  let shadows;
  let highs;
  if (kind === 'eid') {
    ambient = [0.3, 0.23, 0.2];
    lights = [
      { uv: [1.05, 0.15], color: [1.0, 0.76, 0.48], intensity: 0.95, radius: 0, project: 1.0, rim: 1.0 },
      { x: MEM.eid[0] + 30, y: -250, color: [1.0, 0.8, 0.52], intensity: 0.45 * (0.96 + 0.04 * Math.sin(t * 9)), radius: 0.7, rim: 0.4 },
    ];
    god = { uv: [0.88, 0.2], strength: 0.18 };
    sat = 1.0;
    tint = [1.07, 0.98, 0.86];
    shadows = [1.0, 0.94, 0.92];
    highs = [1.08, 1.0, 0.88];
  } else if (kind === 'protest') {
    ambient = [0.42, 0.37, 0.34];
    lights = [{ uv: [1.1, 0.0], color: [1.0, 0.82, 0.6], intensity: 1.35, radius: 0, project: 0.7, rim: 1.0 }];
    god = { uv: [0.92, 0.1], strength: 0.2 };
    fog = { density: 0.1, height: 150, color: [0.85, 0.75, 0.62] };
    sat = 1.04;
    tint = [1.05, 0.99, 0.9];
    shadows = [0.96, 0.96, 1.04];
    highs = [1.06, 1.0, 0.9];
  } else if (kind === 'school') {
    ambient = [0.42, 0.39, 0.34];
    lights = [
      { uv: [1.02, 0.1], color: [1.0, 0.88, 0.68], intensity: 0.95, radius: 0, project: 0, rim: 0.7 },
      { x: MEM.school[0], y: -360, color: [0.92, 0.95, 0.86], intensity: 0.4, radius: 0.8, rim: 0.2 },
    ];
    god = { uv: [0.84, 0.15], strength: 0.12 };
    sat = 0.92;
    tint = [1.04, 1.0, 0.9];
    shadows = [0.96, 0.98, 1.0];
    highs = [1.04, 1.02, 0.92];
    bloom = 0.8;
  } else {
    // kitchen: low afternoon, the warmest of them, closer
    ambient = [0.34, 0.27, 0.23];
    lights = [
      { uv: [0.88, 0.1], color: [1.0, 0.74, 0.44], intensity: 1.0, radius: 0, project: 0.1, rim: 0.9 },
      { x: MEM.kitchen[0] + 180, y: -104, color: [0.5, 0.65, 1.0], intensity: 0.28, radius: 0.18, rim: 0.2 },
    ];
    god = { uv: [0.8, 0.2], strength: 0.15 };
    sat = 1.0;
    tint = [1.08, 0.97, 0.84];
    shadows = [1.0, 0.93, 0.9];
    highs = [1.08, 0.99, 0.86];
  }
  void cam;
  // the silence: lights held low, colour held back
  const dim = 1 - hush * 0.18;
  ambient = ambient.map((v) => v * dim);
  lights = lights.map((l) => ({ ...l, intensity: l.intensity * (1 - hush * 0.22) }));
  // the memory letting go: grey and lifted
  const look = {
    ambient: mixc(ambient, [0.36, 0.36, 0.38], k),
    lights: lights.map((l) => ({ ...l, intensity: l.intensity * (1 - k * 0.3) })),
    god: god ? { ...god, strength: god.strength * (1 - k * 0.6) } : null,
    groundShadow: lerp(0.5, 0.25, k),
    bloom: lerp(bloom, 0.5, k),
    grain: 0.085 + k * 0.04,
    grade: {
      sat: lerp(sat - hush * 0.1, 0.06, k),
      contrast: lerp(0.97, 0.9, k) - hush * 0.07,
      lift: 0.02 + k * 0.1 + hush * 0.012,
      tint: mixc(tint, [1, 1, 1], k * 0.8),
      shadows: mixc(shadows, [1, 1, 1], k),
      highs: mixc(highs, [1, 1, 1], k),
    },
    time: g.time,
    fade: g.a?.endFade || 0,
  };
  if (fog) look.fog = { ...fog, density: fog.density * (1 - k * 0.5) };
  return look;
}
