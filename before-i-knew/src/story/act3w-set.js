// Act 3, Walk: The Night Walk. About ten to midnight. Sami goes alone through
// his own town under a high three-quarter moon, and the town has turned to
// silver. Nothing is lit: Ghouta has had no electricity for a year, and the
// only glow on the horizon is Damascus, far off to the right, which has.
//
//   left to right:  the street he knows -> the bombed building with its front
//   torn off -> the vine on the low wall -> a narrow alley with the cat's wall
//   -> a residential block with a basement well -> a courtyard behind a
//   building -> the street goes on.
//
// The moon is high and to the upper left, so the shadows are short, sharp and
// black, and lie to the right. World units: ground at y = 0, up is negative.

import { lerp, clamp, rng, smooth } from '../engine/util.js';
import * as T from '../sets/town.js';
import { nightSky } from './act3r-set.js';

export const X3 = {
  start: 0,
  ruin: [380, 860], // the bombed building, its front torn open: moonlight fills its open rooms
  vine: 1150, // the grape vine from Act One, climbing a low wall through rubble
  alley: [1500, 2100], // a narrow alley between two buildings
  catWall: [1780, 1880], // a low wall inside the alley (top at y = -70) where the cat sits: decorative
  basement: 2550, // the basement door of a residential block
  garden: [3000, 3360], // a courtyard behind a building
  end: 3800,
};

// No solids: the ground is flat all the way.
export function buildWalkLevel(L) {
  void L;
}

export const surfaceAt = (x) => {
  if (x > X3.ruin[0] - 40 && x < X3.ruin[1] + 60) return 'rubble';
  if (x > X3.vine - 160 && x < X3.vine + 160) return 'rubble';
  if (x > X3.alley[0] && x < X3.alley[1]) return 'tile';
  if (x > X3.garden[0] && x < X3.garden[1]) return 'grit';
  return 'grit';
};

// The moon: high, upper left. (Screen uv, for both the sky and the light.)
const MOON_UV = [0.44, 0.11];
// (the light itself comes from well off to the upper left, so every shadow
// falls the same way across the screen)
const MOON_LIGHT_UV = [-0.3, -0.45];
// Shadows lie away from it, to the right, steeply short.
const SHEAR = -0.72;
const SQUASH = 0.17;

// ------------------------------------------------------------ the look --

export function walkLook(g) {
  const a = g.a || {};
  const lights = [
    // the moon: cold silver-blue, high; the first light also carries the
    // ground shadows
    { uv: MOON_LIGHT_UV, color: [0.64, 0.74, 1.0], intensity: 0.85, radius: 0, project: 1.07, soft: 0.0025, rim: 1.0 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  if (a.doorGlow > 0) {
    // the basement door: warm, from a stairwell, low
    lights.push({ x: X3.basement, y: -10, color: [1, 0.78, 0.5], intensity: a.doorGlow, radius: 0.18, rim: 0.6 });
  }
  // Damascus on the horizon, far right: a faint warm edge on what faces it
  lights.push({ uv: [1.35, 0.55], color: [1, 0.62, 0.34], intensity: 0.09, radius: 0, rim: 0.35 });
  return {
    ambient: [0.115, 0.13, 0.195],
    lights: lights.slice(0, 4),
    groundShadow: 0.95,
    bloom: 0.8,
    exposure: 1.0,
    grain: 0.06,
    grade: { sat: 0.55, contrast: 1.14, lift: 0.0, tint: [0.94, 0.985, 1.07], shadows: [0.8, 0.92, 1.16], highs: [1.05, 1.04, 1.0] },
    // a low mist along the street
    fog: { density: 0.13, height: 70, color: [0.3, 0.38, 0.54] },
    time: g.time,
    fade: a.endFade || 0,
  };
}

// ------------------------------------------------------------- the town --

// Residential blocks along the street. Every window dark; a candle or two.
const BLOCKS = [
  { x: -980, w: 440, floors: 3, fh: 140, color: '#b9b6b0', seed: 501, mat: 'plaster', torn: 0.35, balcony: [2, 0.2, 0.04], laundry: true },
  { x: -540, w: 420, floors: 3, fh: 136, color: '#aeacaa', seed: 502, mat: 'concrete', holes: [[0.3, 0.35, 26], [0.72, 0.58, 18]], dishes: [[0.2, 2], [0.78, 3]] },
  { x: -120, w: 500, floors: 3, fh: 140, color: '#bfbab0', seed: 503, mat: 'limestone', balcony: [3, 0.55, 0], laundry: true, tornLeft: false, torn: 0.2 },
  { x: 860, w: 640, floors: 4, fh: 134, color: '#b6b2a9', seed: 505, mat: 'plaster', torn: 0.5, tornLeft: true, holes: [[0.5, 0.3, 30]], balcony: [2, 0.7, 0.06] },
  { x: 2100, w: 340, floors: 4, fh: 134, color: '#adaba7', seed: 506, mat: 'concrete', balcony: [2, 0.3, 0.07], dishes: [[0.7, 4]] },
  { x: 2440, w: 340, floors: 3, fh: 140, color: '#bdb9b0', seed: 507, mat: 'plaster', noDoors: true, laundry: true, balcony: [2, 0.2, 0] },
  { x: 2780, w: 230, floors: 2, fh: 140, color: '#b0aeaa', seed: 508, mat: 'limestone', torn: 0.6, tornLeft: false },
  { x: 3370, w: 470, floors: 3, fh: 138, color: '#b8b3aa', seed: 509, mat: 'limestone', laundry: true, balcony: [2, 0.6, 0.03] },
  { x: 3840, w: 620, floors: 4, fh: 134, color: '#a9a7a3', seed: 510, mat: 'concrete', torn: 0.3, tornLeft: true, holes: [[0.4, 0.45, 22]] },
];
const GARDEN_WALL = { x: 3000, w: 400, floors: 3, fh: 138, color: '#9c9990', seed: 511, mat: 'plaster', noDoors: true, torn: 0.25, tornLeft: true };

// A candle in a window: a dark window cut into the façade, one tiny flame.
function candle(R, spec, f, k, t, flick = 0) {
  const cols = Math.max(2, Math.round(spec.w / 110));
  const ww = Math.min(58, (spec.w / cols) * 0.5);
  const wh = spec.fh * 0.46;
  const wx = spec.x + ((k + 0.5) * spec.w) / cols - ww / 2;
  const wy = -f * spec.fh - spec.fh * 0.72;
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

// ------------------------------------------------------------- the ruin --

const RUIN_FH = 130;

// The bombed building seen in section, its front torn off: three rooms
// stacked, the roof gone, a heap of its own front wall in the street, and the
// moon filling it.
function ruin(R, g) {
  const t = g.time;
  const [x0, x1] = X3.ruin;
  const fh = RUIN_FH;
  const topL = -3 * fh - 30; // left wall's broken top
  const topR = -2 * fh - 40; // the right wall is lower
  const room = (n) => [-n * fh, -(n - 1) * fh]; // [top, bottom] of room n (1 = ground)

  // the back wall, with the roofline broken
  const outline = (c) => {
    c.moveTo(x0, 0);
    c.lineTo(x0, topL);
    c.lineTo(x0 + 70, topL - 6);
    c.lineTo(x0 + 110, topL + 38);
    c.lineTo(x0 + 190, topL + 22);
    c.lineTo(x0 + 250, topL - 24);
    c.lineTo(x0 + 330, topL + 18);
    c.lineTo(x0 + 380, topL + 70);
    c.lineTo(x1 - 60, topR + 10);
    c.lineTo(x1, topR - 6);
    c.lineTo(x1, 0);
    c.closePath();
  };
  R.paint((c) => {
    c.beginPath();
    outline(c);
    c.fillStyle = '#5b5f6a';
    c.fill();
    c.save();
    c.beginPath();
    outline(c);
    c.clip();
    // each room has its own colour of paint, long since stained
    const paints = ['#5d6470', '#68646a', '#5a626c'];
    for (let n = 1; n <= 3; n++) {
      const [ty, by] = room(n);
      c.fillStyle = paints[n - 1];
      c.fillRect(x0, ty, x1 - x0, by - ty);
      // a darker dado rail to waist height
      c.fillStyle = 'rgba(10,12,22,0.28)';
      c.fillRect(x0, by - 52, x1 - x0, 52);
      // soot where the blast went up the wall
      const sg = c.createRadialGradient(x0 + 330 + n * 40, ty + 20, 4, x0 + 330 + n * 40, ty + 20, 150);
      sg.addColorStop(0, 'rgba(6,6,10,0.55)');
      sg.addColorStop(1, 'rgba(6,6,10,0)');
      c.fillStyle = sg;
      c.fillRect(x0, ty - 20, x1 - x0, fh + 20);
    }
    // damp
    const r = rng(41);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '20,24,34' : '120,126,140'},0.14)`;
      c.fillRect(x0 + r() * (x1 - x0), -r() * fh * 3, 14 + r() * 50, 12 + r() * 36);
    }
    c.restore();
  });
  R.surface((c) => outline(c), 'plaster', { scale: 1.3, seed: 2, alpha: 0.9 });

  // windows in the back wall: the night beyond, pale, and a curtain in each
  const openings = [
    [x0 + 120, 1, 46, 70],
    [x0 + 400, 2, 50, 74],
    [x0 + 250, 3, 46, 70],
  ];
  for (const [wx, n, ww, wh] of openings) {
    const by = room(n)[1] - 56;
    R.paint((c) => {
      c.fillStyle = '#10131f';
      c.fillRect(wx, by - wh, ww, wh);
    });
    R.glow((c) => {
      const grd = c.createLinearGradient(0, by - wh, 0, by);
      grd.addColorStop(0, 'rgba(120,140,200,0.34)');
      grd.addColorStop(1, 'rgba(90,110,170,0.14)');
      c.fillStyle = grd;
      c.fillRect(wx + 2, by - wh + 2, ww - 4, wh - 4);
    });
    R.cast((c) => {
      c.fillStyle = '#3a3e4c'; // frame
      c.fillRect(wx - 4, by - wh - 4, ww + 8, 4);
      c.fillRect(wx - 4, by, ww + 8, 5);
      c.fillRect(wx - 4, by - wh, 4, wh);
      c.fillRect(wx + ww, by - wh, 4, wh);
    });
  }

  // moonlight in the rooms: a pale wash, and a slanting shaft from each
  // opening in the front, falling on the floor and the back wall
  R.glow((c) => {
    for (let n = 1; n <= 3; n++) {
      const [ty, by] = room(n);
      const open = n === 3 ? 1 : 0.78;
      const wash = c.createRadialGradient(x0 + 160, ty + 10, 10, x0 + 220, ty + fh * 0.5, 380);
      wash.addColorStop(0, `rgba(150,172,236,${0.2 * open})`);
      wash.addColorStop(0.55, `rgba(120,142,210,${0.09 * open})`);
      wash.addColorStop(1, 'rgba(100,120,190,0)');
      c.fillStyle = wash;
      c.fillRect(x0 + 18, ty, x1 - x0 - 30, fh);
      // the shaft
      const sx = x0 + 40 + (n % 2) * 120;
      const sh = c.createLinearGradient(sx, ty, sx + 120, by);
      sh.addColorStop(0, `rgba(190,208,255,${0.2 * open})`);
      sh.addColorStop(1, `rgba(160,182,245,${0.06 * open})`);
      c.fillStyle = sh;
      c.beginPath();
      c.moveTo(sx, ty + 2);
      c.lineTo(sx + 150, ty + 2);
      c.lineTo(sx + 310, by - 2);
      c.lineTo(sx + 130, by - 2);
      c.fill();
      // the lit patch on the floor
      const fl = c.createLinearGradient(0, by - 8, 0, by);
      fl.addColorStop(0, 'rgba(190,208,255,0)');
      fl.addColorStop(1, 'rgba(190,208,255,0.18)');
      c.fillStyle = fl;
      c.fillRect(sx + 130, by - 8, 180, 8);
    }
    // dust turning in the light
    const r = rng(77);
    for (let i = 0; i < 26; i++) {
      const bx = x0 + 60 + r() * (x1 - x0 - 120);
      const by = -20 - r() * fh * 3;
      const x = bx + Math.sin(t * 0.4 + i) * 10;
      const y = by + Math.sin(t * 0.3 + i * 1.7) * 8;
      c.fillStyle = `rgba(210,222,255,${0.16 + 0.12 * Math.sin(t * 1.2 + i)})`;
      c.fillRect(x, y, 1.6, 1.6);
    }
  });

  // floors: slabs with a broken front edge and hanging rebar
  R.cast((c) => {
    const slab = (n, xa, xb, tilt) => {
      const y = -n * fh;
      c.fillStyle = '#6c707c';
      c.beginPath();
      c.moveTo(xa, y);
      c.lineTo(xb, y + tilt);
      c.lineTo(xb, y + tilt + 15);
      c.lineTo(xa, y + 15);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(xa, y + 11, xb - xa, 4);
    };
    slab(1, x0 + 18, x1 - 18, 0);
    slab(2, x0 + 18, x1 - 150, 0);
    // the end of floor two has sheared and hangs from its rebar
    c.save();
    c.translate(x1 - 150, -2 * fh);
    c.rotate(0.55);
    c.fillStyle = '#6c707c';
    c.fillRect(0, 0, 110, 15);
    c.restore();
    // the third floor is a shelf of slab with the ceiling gone
    slab(3, x0 + 18, x0 + 300, 0);
    c.strokeStyle = '#2a2420';
    c.lineWidth = 2;
    const r = rng(9);
    c.beginPath();
    for (const [xx, n] of [[x0 + 300, 3], [x1 - 150, 2], [x1 - 18, 1], [x0 + 18, 2]]) {
      for (let i = 0; i < 5; i++) {
        const sx = xx + (r() - 0.5) * 8;
        c.moveTo(sx, -n * fh + 12);
        c.quadraticCurveTo(sx + (r() - 0.5) * 20, -n * fh + 30, sx + (r() - 0.5) * 34, -n * fh + 36 + r() * 30);
      }
    }
    c.stroke();
  });
  R.surface((c) => {
    c.rect(x0 + 18, -fh, x1 - x0 - 36, 15);
    c.rect(x0 + 18, -2 * fh, x1 - x0 - 168, 15);
    c.rect(x0 + 18, -3 * fh, 282, 15);
  }, 'concrete', { scale: 1, seed: 6, alpha: 0.9 });

  // the two side walls, torn
  R.cast((c) => {
    c.fillStyle = '#70727c';
    c.beginPath();
    c.moveTo(x0 - 6, 0);
    c.lineTo(x0 - 6, topL - 40);
    c.lineTo(x0 + 10, topL - 56);
    c.lineTo(x0 + 22, topL + 6);
    c.lineTo(x0 + 18, -2 * fh - 20);
    c.lineTo(x0 + 24, -fh - 40);
    c.lineTo(x0 + 18, 0);
    c.fill();
    // the right-hand pier, shorter
    c.beginPath();
    c.moveTo(x1 - 20, 0);
    c.lineTo(x1 - 22, topR + 40);
    c.lineTo(x1 - 8, topR + 20);
    c.lineTo(x1 + 8, topR + 70);
    c.lineTo(x1 + 8, 0);
    c.fill();
    // a lintel and a wedge of front wall left hanging from the top left
    c.fillStyle = '#656873';
    c.beginPath();
    c.moveTo(x0 + 18, -2 * fh - 16);
    c.lineTo(x0 + 96, -2 * fh - 12);
    c.lineTo(x0 + 70, -2 * fh + 24);
    c.lineTo(x0 + 18, -2 * fh + 4);
    c.fill();
  });
  R.surface((c) => {
    c.rect(x0 - 6, topL - 40, 28, -topL + 40);
    c.rect(x1 - 22, topR + 20, 30, -topR - 20);
  }, 'plaster', { scale: 1.2, seed: 4, alpha: 0.8 });

  // ---- what the rooms still hold: silhouettes against the wash
  const dark = '#14161e';
  // room 1: a wardrobe with its door off, a table, a chair on its side
  R.cast((c) => {
    c.fillStyle = dark;
    c.fillRect(x0 + 48, -126, 70, 126);
    c.fillStyle = '#2b2e3a';
    c.fillRect(x0 + 52, -122, 28, 118); // the open door's inside
    c.fillStyle = dark;
    c.fillRect(x0 + 52, -122, 4, 118);
    // table
    c.fillRect(x0 + 250, -62, 86, 6);
    c.fillRect(x0 + 256, -56, 5, 56);
    c.fillRect(x0 + 325, -56, 5, 56);
    // glass and teapot
    c.fillRect(x0 + 270, -74, 8, 12);
    c.fillRect(x0 + 296, -80, 18, 18);
    c.fillRect(x0 + 312, -76, 8, 3);
    // a chair
    c.fillRect(x0 + 370, -44, 28, 4);
    c.fillRect(x0 + 372, -40, 3, 40);
    c.fillRect(x0 + 393, -40, 3, 40);
    c.fillRect(x0 + 372, -90, 3, 46);
  });
  // room 2: a bed frame, iron-barred, a hanging lamp, a picture askew
  R.cast((c) => {
    const by = room(2)[1];
    c.fillStyle = dark;
    // headboard and footboard
    c.fillRect(x0 + 70, by - 78, 5, 78);
    c.fillRect(x0 + 232, by - 52, 5, 52);
    c.fillRect(x0 + 70, by - 30, 167, 5);
    c.lineWidth = 1.6;
    c.strokeStyle = dark;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      c.moveTo(x0 + 70 + i * 9, by - 78);
      c.lineTo(x0 + 70 + i * 9, by - 30);
    }
    for (let i = 0; i < 4; i++) {
      c.moveTo(x0 + 232 - i * 9, by - 52);
      c.lineTo(x0 + 232 - i * 9, by - 30);
    }
    c.stroke();
    // a mattress half off, bare springs
    c.fillStyle = '#23262f';
    c.beginPath();
    c.moveTo(x0 + 78, by - 30);
    c.lineTo(x0 + 220, by - 30);
    c.lineTo(x0 + 232, by - 4);
    c.lineTo(x0 + 82, by - 8);
    c.fill();
    // the hanging lamp: a cord from the slab above, a shade swinging a little
    const sw = Math.sin(t * 0.7) * 3;
    c.strokeStyle = dark;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x0 + 340, room(2)[0] + 15);
    c.lineTo(x0 + 340 + sw, room(2)[0] + 60);
    c.stroke();
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(x0 + 328 + sw, room(2)[0] + 74);
    c.lineTo(x0 + 352 + sw, room(2)[0] + 74);
    c.lineTo(x0 + 346 + sw, room(2)[0] + 58);
    c.lineTo(x0 + 334 + sw, room(2)[0] + 58);
    c.fill();
    // a picture frame, slipped
    c.save();
    c.translate(x0 + 330, by - 108);
    c.rotate(-0.22);
    c.fillRect(-18, -14, 36, 28);
    c.fillStyle = '#4a5064';
    c.fillRect(-14, -10, 28, 20);
    c.restore();
    // pillow on the floor
    c.fillStyle = '#23262f';
    c.beginPath();
    c.ellipse(x0 + 300, by - 4, 22, 5, 0, 0, Math.PI * 2);
    c.fill();
  });
  // room 3: only a chair, a stool, a bucket; the sky for a ceiling
  R.cast((c) => {
    const by = room(3)[1];
    c.fillStyle = dark;
    c.fillRect(x0 + 150, by - 44, 28, 4);
    c.fillRect(x0 + 152, by - 40, 3, 40);
    c.fillRect(x0 + 173, by - 40, 3, 40);
    c.fillRect(x0 + 152, by - 92, 3, 48);
    c.fillRect(x0 + 60, by - 26, 24, 26);
    c.fillRect(x0 + 62, by - 30, 20, 4);
  });
  // curtains stirring at the back-wall windows
  for (const [wx, n, ww, wh] of openings) {
    const by = room(n)[1] - 56;
    const sway = Math.sin(t * 0.9 + wx * 0.01) * 3 + Math.sin(t * 2.3 + wx) * 0.8;
    R.cast((c) => {
      c.fillStyle = '#7f879e';
      c.globalAlpha = 0.85;
      for (const side of [-1, 1]) {
        const ax = side < 0 ? wx : wx + ww;
        c.beginPath();
        c.moveTo(ax, by - wh - 2);
        c.lineTo(ax + side * (ww * 0.42), by - wh - 2);
        c.quadraticCurveTo(ax + side * (ww * 0.3) + sway * side, by - wh * 0.4, ax + side * (ww * 0.38) + sway * 1.5, by + 10);
        c.lineTo(ax, by + 10);
        c.closePath();
        c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#242733';
      c.fillRect(wx - 8, by - wh - 5, ww + 16, 3); // the rod
    });
  }

  // the front wall, come down: a heap across the whole foot of the building,
  // slabs on end and rebar
  T.rubble(R, x0 - 30, 250, 78, { seed: 14, color: '#8e8d92' });
  T.rubble(R, x0 + 300, 220, 52, { seed: 17, color: '#86868c' });
  T.rubble(R, x1 - 170, 250, 66, { seed: 19, color: '#8a8a90' });
  // a slab standing on its edge, a door leaning on it
  R.cast((c) => {
    c.save();
    c.translate(x0 + 520, 2);
    c.rotate(-0.42);
    c.fillStyle = '#767980';
    c.fillRect(-4, -96, 60, 96);
    c.restore();
    c.fillStyle = '#5b4a3c';
    c.save();
    c.translate(x1 - 40, 2);
    c.rotate(0.32);
    c.fillRect(-6, -104, 40, 104);
    c.restore();
  });

  // moon on the broken edges
  R.glow((c) => {
    c.strokeStyle = 'rgba(190,206,250,0.35)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x0 + 70, topL - 6);
    c.lineTo(x0 + 110, topL + 38);
    c.lineTo(x0 + 190, topL + 22);
    c.lineTo(x0 + 250, topL - 24);
    c.lineTo(x0 + 330, topL + 18);
    c.lineTo(x0 + 380, topL + 70);
    c.stroke();
  });
}

// ------------------------------------------------------------ the vine --

function vineWall(R, g) {
  const t = g.time;
  const x = X3.vine;
  // rubble spilled from the wall, and from the building behind
  T.rubble(R, x - 190, 140, 38, { seed: 23, color: '#8d8c90' });
  T.vine(R, x, t, { wallH: 110, lush: 1 });
  T.rubble(R, x + 40, 150, 52, { seed: 29, color: '#929196' });
  // the vine's leaves catch the moon: silver on the tops of every leaf
  const r = rng(12);
  R.glow((c) => {
    for (let i = 0; i < 34; i++) {
      const k = r();
      const lx = lerp(x + 20, x - 30, k) + (r() - 0.5) * 80;
      const ly = -k * 170 - 10 + (r() - 0.5) * 40;
      const sway = Math.sin(t * 1.4 + i) * 1.5;
      const a = 0.16 + 0.1 * Math.sin(t * 0.9 + i * 2.1);
      c.fillStyle = `rgba(206,226,255,${a})`;
      c.beginPath();
      c.ellipse(lx + sway - 2, ly - 4, 8, 3.4, -0.35 + r() * 0.8, 0, Math.PI * 2);
      c.fill();
    }
    // the wall's coping, lit
    c.strokeStyle = 'rgba(200,214,250,0.3)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - 70, -90);
    c.lineTo(x - 30, -110);
    c.lineTo(x + 10, -80);
    c.lineTo(x + 40, -102);
    c.lineTo(x + 70, -70);
    c.stroke();
  });
}

// ---------------------------------------------------------- the alley --

const alleyK = (cx) => smooth(X3.alley[0] - 300, X3.alley[0] + 40, cx) * (1 - smooth(X3.alley[1] - 40, X3.alley[1] + 300, cx));

// The far wall at the end of the alley, in shadow; and the low wall.
function alleyBack(R, g) {
  const t = g.time;
  const [a0, a1] = X3.alley;
  T.block(R, { x: a0, w: a1 - a0, floors: 4, fh: 130, color: '#a29f9a', seed: 77, mat: 'plaster', noDoors: true, torn: 0.15, tornLeft: false }, t);
  // the alley is narrow: most of it lies in the shadow of the walls either
  // side, with a slant of moon down the far wall
  R.paint((c) => {
    const sg = c.createLinearGradient(a0, 0, a1, 0);
    sg.addColorStop(0, 'rgba(4,6,14,0.7)');
    sg.addColorStop(0.5, 'rgba(4,6,14,0.4)');
    sg.addColorStop(1, 'rgba(4,6,14,0.62)');
    c.fillStyle = sg;
    c.fillRect(a0, -560, a1 - a0, 560);
    const vg = c.createLinearGradient(0, -520, 0, 0);
    vg.addColorStop(0, 'rgba(4,6,14,0)');
    vg.addColorStop(1, 'rgba(4,6,14,0.35)');
    c.fillStyle = vg;
    c.fillRect(a0, -520, a1 - a0, 520);
  });
  // the moon's slant down the far wall, and onto the ground, with the edge of
  // the right-hand building's roof cutting it
  R.glow((c) => {
    const mx = 1700;
    const sl = c.createLinearGradient(mx, -520, mx + 300, -20);
    sl.addColorStop(0, 'rgba(176,196,250,0.0)');
    sl.addColorStop(0.35, 'rgba(176,196,250,0.24)');
    sl.addColorStop(1, 'rgba(176,196,250,0.14)');
    c.fillStyle = sl;
    c.beginPath();
    c.moveTo(mx, -520);
    c.lineTo(mx + 190, -520);
    c.lineTo(mx + 430, 0);
    c.lineTo(mx + 120, 0);
    c.fill();
    // the lit paving
    const pg = c.createLinearGradient(0, -10, 0, 20);
    pg.addColorStop(0, 'rgba(176,196,250,0.22)');
    pg.addColorStop(1, 'rgba(176,196,250,0.04)');
    c.fillStyle = pg;
    c.fillRect(mx + 110, -4, 330, 24);
  });
  // a laundry line across the back, slack, and a few stiff garments
  R.cast((c) => {
    c.strokeStyle = '#1a1b22';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(a0 + 20, -300);
    c.quadraticCurveTo((a0 + a1) / 2, -270, a1 - 20, -306);
    c.stroke();
    const cols = ['#9aa0b4', '#6f7690', '#aab0c4', '#59607a', '#8c92a8'];
    for (let i = 0; i < 6; i++) {
      const px = a0 + 110 + i * 70;
      const py = -300 + Math.sin((i / 6) * 3.1) * 26 + 6;
      const sway = Math.sin(t * 1.1 + i * 1.7) * 2;
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + 22, py);
      c.lineTo(px + 20 + sway, py + 36 + (i % 3) * 6);
      c.lineTo(px + 2 + sway, py + 34 + (i % 2) * 8);
      c.fill();
    }
  });
  // a drainpipe, a water tank, a gas cylinder by the door
  R.cast((c) => {
    c.fillStyle = '#3a3d48';
    c.fillRect(a0 + 140, -420, 7, 420);
    for (let y = -400; y < 0; y += 70) c.fillRect(a0 + 137, y, 13, 3);
    c.fillStyle = '#41444f';
    c.fillRect(a1 - 118, -22, 24, 22);
    c.beginPath();
    c.ellipse(a1 - 106, -28, 12, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2e303a';
    c.fillRect(a0 + 410, -36, 30, 36);
    c.fillRect(a0 + 414, -44, 22, 10);
  });
}

// The low wall inside the alley, where the cat sits.
function catWall(R) {
  const [w0, w1] = X3.catWall;
  R.cast((c) => {
    c.fillStyle = '#9c9a96';
    c.fillRect(w0, -70, w1 - w0, 70);
    c.fillStyle = '#b4b2ae'; // coping
    c.fillRect(w0 - 4, -76, w1 - w0 + 8, 8);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = -52; y < 0; y += 18) c.fillRect(w0, y, w1 - w0, 1.6);
    for (let i = 0; i < 4; i++) c.fillRect(w0 + 14 + i * 26 + (i % 2) * 8, -70 + (i % 2) * 18, 1.6, 18);
    // a chip out of one end
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath();
    c.moveTo(w1 - 12, -70);
    c.lineTo(w1, -64);
    c.lineTo(w1, -50);
    c.lineTo(w1 - 8, -58);
    c.fill();
  });
  R.surface((c) => c.rect(w0, -70, w1 - w0, 70), 'limestone', { scale: 0.7, seed: 3, alpha: 0.9 });
  R.glow((c) => {
    c.fillStyle = 'rgba(200,214,255,0.4)';
    c.fillRect(w0 - 4, -76, w1 - w0 + 8, 1.6);
  });
}

// The walls close in on both sides: tall, dark, near, sweeping past faster
// than the actors. The edge stays put on the screen; the wall's face (its
// windows, its pipe, its plaster) slides by, anchored to the world.
function alleyWalls(R, g) {
  const cx = R.cam.x;
  const k = alleyK(cx);
  if (k <= 0.01) return;
  const D = 1.25;
  const c1 = cx * D;
  const inner = lerp(880, 470, k);
  R.layer(D);
  for (const side of [-1, 1]) {
    const edge = c1 + side * inner;
    const outer = c1 + side * 1000;
    const xa = Math.min(edge, outer);
    const xb = Math.max(edge, outer);
    const wall = (c) => c.rect(xa, -900, xb - xa, 1200);
    R.cast((c) => {
      c.fillStyle = '#1b1d28';
      c.fillRect(xa, -900, xb - xa, 1200);
      // the face: windows shuttered and dark, a pipe, a balcony slab
      const r0 = Math.floor((xa - 100) / 280);
      const r1 = Math.floor((xb + 100) / 280);
      for (let i = r0; i <= r1; i++) {
        const q = rng(i * 7 + (side > 0 ? 301 : 101));
        const px = i * 280 + 40 + q() * 160;
        if (px + 60 < xa || px > xb) continue;
        for (let f = 0; f < 4; f++) {
          const fy = -f * 170 - 150;
          c.fillStyle = '#0d0e14';
          c.fillRect(px, fy, 46, 84);
          if (q() < 0.6) {
            c.fillStyle = '#2a2c37';
            c.fillRect(px + 2, fy + 2, 21, 80);
            c.fillRect(px + 25, fy + 2, 19, 40);
          }
          c.fillStyle = '#3a3d4a';
          c.fillRect(px - 6, fy + 84, 58, 5);
        }
        // a drainpipe
        c.fillStyle = '#16171d';
        c.fillRect(px + 140, -900, 9, 900);
        c.fillRect(px + 136, -300, 17, 4);
        c.fillRect(px + 136, -80, 17, 4);
      }
      // slab edges
      c.fillStyle = 'rgba(70,74,92,0.5)';
      for (let f = 0; f < 6; f++) c.fillRect(xa, -f * 170 - 62, xb - xa, 7);
    });
    R.surface(wall, 'plaster', { scale: 1.6, seed: 5 + (side > 0 ? 1 : 0), alpha: 0.55 });
    // the moon on the inner edge: a thread of silver, and a lit crest
    R.glow((c) => {
      c.strokeStyle = 'rgba(150,170,230,0.28)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(edge, -900);
      c.lineTo(edge, 300);
      c.stroke();
      const sg = c.createLinearGradient(edge, 0, edge - side * 80, 0);
      sg.addColorStop(0, 'rgba(140,160,225,0.07)');
      sg.addColorStop(1, 'rgba(140,160,225,0)');
      c.fillStyle = sg;
      c.fillRect(Math.min(edge, edge - side * 80), -900, 80, 1200);
    });
  }
  R.layer(1);
}

// ----------------------------------------------------- the street's things

// A dark well in the pavement where the basement stairs go down. The door
// itself is drawn by the scene.
function basementWell(R) {
  const b = X3.basement;
  R.paint((c) => {
    c.fillStyle = '#04050a';
    c.fillRect(b - 50, -5, 100, 140);
    // the stairs going down, each step a shade paler where the moon reaches
    for (let i = 0; i < 6; i++) {
      c.fillStyle = `rgba(${40 - i * 4},${46 - i * 4},${64 - i * 6},1)`;
      c.fillRect(b - 46 + i * 14, 2 + i * 14, 14, 3);
    }
    // the kerb stones either side
    c.fillStyle = '#6d7080';
    c.fillRect(b - 56, -5, 8, 12);
    c.fillRect(b + 48, -5, 8, 12);
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(170,190,245,0.3)';
    c.fillRect(b - 56, -5, 8, 1.4);
    c.fillRect(b + 48, -5, 8, 1.4);
  });
}

function streetDebris(R, near) {
  // heaps and scatter along the street: little silver hills
  const piles = [
    [-300, 130, 34, 61, '#8a8a90'],
    [1000, 90, 30, 62, '#898990'],
    [1330, 100, 26, 63, '#8c8c92'],
    [2300, 90, 26, 64, '#8a8a90'],
    [3420, 120, 40, 65, '#8c8c94'],
    [3900, 150, 30, 66, '#898990'],
  ];
  for (const [x, w, h, seed, col] of piles) if (near(x, x + w)) T.rubble(R, x, w, h, { seed, color: col });
  // a toppled plastic chair, a flattened can, an empty gas bottle
  const bits = [[560, 'chair'], [1620, 'can'], [2060, 'bottle'], [2860, 'chair'], [3150, 'bottle']];
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

// The moon on the tarmac and the paving: a pale sheen along the kerb, and
// wet-looking patches where the dust has settled.
function roadSheen(R, near) {
  const cx = R.cam.x;
  R.glow((c) => {
    const g1 = c.createLinearGradient(0, -6, 0, 120);
    g1.addColorStop(0, 'rgba(150,170,225,0.20)');
    g1.addColorStop(0.3, 'rgba(130,150,210,0.08)');
    g1.addColorStop(1, 'rgba(110,130,190,0)');
    c.fillStyle = g1;
    c.fillRect(cx - 1600, -6, 3200, 126);
    const r = rng(19);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(cx / 3200) * 3200 - 3200 + r() * 9600;
      if (Math.abs(x - cx) > 1500) continue;
      c.fillStyle = `rgba(160,180,235,${0.04 + r() * 0.07})`;
      c.beginPath();
      c.ellipse(x, 24 + r() * 70, 40 + r() * 90, 3 + r() * 5, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// ------------------------------------------------------------ the draw --

export function drawWalk(R, g) {
  const t = g.time;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1500 && x0 < cx + 1500;

  // the sky: the moon high, and Damascus's glow on the far horizon
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
  // the skyline, with a minaret or two, its crest silvered by the moon
  T.skyline(R, { depth: 0.3, y: 40, color: '#1b2034', seed: 47, haze: ['#5c6c9c', 0.2], minarets: [560, 1180] });

  // ---- the street's buildings
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  // the courtyard's back wall stands a little behind the street's line
  if (near(GARDEN_WALL.x, GARDEN_WALL.x + GARDEN_WALL.w)) {
    const d = 0.93;
    R.layer(d);
    const dx = (d - 1) * 3180;
    T.block(R, { ...GARDEN_WALL, x: GARDEN_WALL.x + dx }, t);
    // the dark mouth of the gate in it, and a mulberry showing over the top
    R.paint((c) => {
      const gx = X3.garden[0] + 150 + dx;
      c.fillStyle = '#0a0b10';
      c.beginPath();
      c.moveTo(gx - 40, 0);
      c.lineTo(gx - 40, -92);
      c.quadraticCurveTo(gx, -128, gx + 40, -92);
      c.lineTo(gx + 40, 0);
      c.fill();
    });
    R.layer(1);
  }
  if (near(X3.alley[0], X3.alley[1])) alleyBack(R, g);
  if (near(X3.ruin[0], X3.ruin[1])) ruin(R, g);

  // a candle or two, in the windows of people who have not left
  if (near(-120, 380)) candle(R, BLOCKS[2], 1, 2, t, 1);
  if (near(2440, 2780)) candle(R, BLOCKS[5], 2, 0, t, 4);

  // ---- the ground
  T.street(R, -1200, 4600);
  roadSheen(R, near);
  if (near(X3.basement - 60, X3.basement + 60)) basementWell(R);
  if (near(X3.vine - 200, X3.vine + 200)) vineWall(R, g);
  if (near(X3.catWall[0], X3.catWall[1])) catWall(R);
  streetDebris(R, near);
  T.cables(R, cx, { seed: 63, from: -400, to: 4200, y: -390 });

  // the scene's own props: the basement door, the wedding glimpse, the garden
  g.act?.drawProps?.(R, g);

  // ---- the people and the cat
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, SHEAR, SQUASH);
  }
  if (g.cat && !g.cat.hidden && near(g.cat.x - 50, g.cat.x + 50)) {
    R.cast((c) => g.cat.draw(c));
    R.shadow((c) => g.cat.draw(c), g.cat.x, g.cat.y, SHEAR, SQUASH);
    // its eyes catch the moon
    if (!g.cat.eyesClosed && g.cat.blink < 0.5) {
      const [ex, ey] = g.cat.eye();
      R.glow((c) => {
        const grd = c.createRadialGradient(ex, ey, 0, ex, ey, 5);
        grd.addColorStop(0, 'rgba(220,235,150,0.6)');
        grd.addColorStop(1, 'rgba(220,235,150,0)');
        c.fillStyle = grd;
        c.fillRect(ex - 5, ey - 5, 10, 10);
      });
    }
  }

  // ---- in front of everyone
  alleyWalls(R, g);
  g.effects?.draw(R);
  if (cx < X3.alley[0] - 180 || cx > X3.alley[1] + 320) T.foreground(R, cx, { from: -1000, to: 4400 });
}
