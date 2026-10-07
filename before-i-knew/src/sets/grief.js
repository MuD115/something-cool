// Act 2, Path C (Grief): the four places of the afternoon.
//
//   drawCorner    the corner of Zeitoun Street where the news was given, later
//                 and emptier: the kerb, the dead olive, the street going north
//                 and east, and a low sun that sinks while he sits (k 0 → 1,
//                 4:20 → 5:15 pm)
//   drawLecture   a Damascus University lecture hall, 2009
//   drawCampus    outside it, a Damascus street in sun, a falafel cart and a man
//                 with jasmine, the cafeteria at the end of it; it dissolves
//   drawUmAhmad   her flat: neat, mended, a west window and a photograph
//
// People are not drawn here: the story spawns them as rigs. World units, the
// ground at y = 0, up is negative; 1 unit is about a centimetre.

import { clamp, lerp, smooth, rng, mixc, hex, TAU } from '../engine/util.js';
import * as T from './town.js';
import { deepScenery } from '../engine/dof.js';
import { horizon, rgbOf } from './horizon.js';
import { extrudePoly, extrudeRect } from './depth.js';
import { XG, LECTURE, CAMPUS, UM_AHMAD } from '../story/act2bc-map.js';
import * as A from './ambient.js';

const NASKH = '"Noto Naskh Arabic", "Aref Ruqaa", "IBM Plex Sans Arabic", serif';
const RUQAA = '"Aref Ruqaa", "Noto Naskh Arabic", "IBM Plex Sans Arabic", serif';

// ------------------------------------------------------------- helpers --

const hx2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
// a hex colour between two hex colours (extrudePoly wants hex)
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

// Static detail painted once into a canvas and placed every frame.
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

// A mixed wobble for hand-made lines (a scratch, a chalk stroke).
const jit = (r, a) => (r() - 0.5) * 2 * a;

// ===================================================================
// 1. THE CORNER
// ===================================================================
// Act One's corner at the end of Zeitoun Street, where the news was given:
// the same low wall, the same fallen beam propped on two blocks, the same
// crate and olive. Later, and emptier: the crowd is gone, the olive has been
// cut for firewood, and the sun sits low in the west, on the right.

const KERB_X0 = XG.kerb - 32; // the fallen beam people sit on
const KERB_X1 = XG.kerb + 142;
const KERB_TOP = -42;

// The blocks along the far side of the street. A side street opens to the
// north (right), where Um Ahmad's flat is.
const GAP = [XG.north - 150, XG.north + 140];
const BLOCKS = [
  { x: -1450, w: 430, floors: 4, seed: 31, color: T.CONCRETE[2], balcony: [2, 0.3, 0], laundry: true },
  { x: -1020, w: 420, floors: 3, seed: 32, color: T.CONCRETE[5], dishes: [[0.4, 3]] },
  { x: -200, w: 380, floors: 5, seed: 19, color: T.CONCRETE[0], torn: 0.4, tornLeft: true, holes: [[0.6, 0.6, 28]] },
  { x: 180, w: 320, floors: 3, seed: 20, color: T.CONCRETE[4] },
  { x: 500, w: 280, floors: 2, seed: 21, color: T.CONCRETE[1] },
  { x: 780, w: 300, floors: 3, seed: 23, color: T.CONCRETE[3], holes: [[0.35, 0.5, 20]], dishes: [[0.7, 3]] },
  { x: 1080, w: GAP[0] - 1080, floors: 4, seed: 24, color: T.CONCRETE[2], balcony: [3, 0.2, 0.05], laundry: true },
  { x: GAP[1], w: 420, floors: 4, seed: 22, color: T.CONCRETE[3] },
  { x: GAP[1] + 420, w: 380, floors: 3, seed: 25, color: T.CONCRETE[1], torn: 0.5, tornLeft: false },
];

const cornerSun = (k) => ({
  // the sun's disc: further down and further right as the hour goes
  sky: [lerp(0.8, 0.9, k), lerp(0.42, 0.7, k)],
  shear: A.sunAt(A.DAY.grief(k)).shear,
  squash: A.sunAt(A.DAY.grief(k)).squash,
});

export function cornerLook(g, k = 0) {
  k = clamp(k);
  const sunUv = [lerp(1.3, 1.16, k), lerp(-0.75, 0.02, k)];
  const sunCol = A.sunAt(A.DAY.grief(k)).color;
  const lights = [
    { uv: sunUv, color: sunCol, intensity: lerp(1.35, 1.1, k), radius: 0, project: 1.0, soft: 0.003, rim: 0.55 + 0.35 * k },
    // the cold sky on the shaded side
    { uv: [-0.4, -1.1], color: [0.5, 0.58, 0.8], intensity: lerp(0.24, 0.34, k), radius: 0, rim: 0.2 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  return {
    ambient: mixc([0.31, 0.3, 0.35], [0.24, 0.2, 0.27], k),
    lights,
    groundShadow: 0.85,
    god: { uv: sunUv, strength: lerp(0.22, 0.5, k) },
    bloom: lerp(0.55, 0.85, k),
    exposure: lerp(0.9, 0.84, k),
    grain: 0.05,
    grade: {
      sat: lerp(0.92, 0.6, k),
      contrast: lerp(1.05, 1.14, k),
      lift: -0.005 * k,
      tint: mixc([1.02, 0.99, 0.95], [1.05, 0.96, 0.94], k),
      shadows: mixc([0.96, 0.97, 1.05], [0.9, 0.88, 1.1], k),
      highs: mixc([1.06, 1.01, 0.93], [1.1, 0.98, 0.84], k),
    },
    // a thin haze of dust at street level, golden where the sun comes through
    fog: { density: lerp(0.08, 0.13, k), height: 150, color: mixc([0.93, 0.8, 0.6], [0.95, 0.66, 0.42], k) },
    time: g.time,
  };
}

function cornerSky(R, k, t) {
  const A = ['#7b94b4', '#c1c6bb', '#efd5a8'];
  const B = ['#434f7c', '#b08793', '#f2a55e'];
  const stops = [0, 0.5, 0.8].map((p, i) => [p, mh(A[i], B[i], k)]);
  const [sx, sy] = cornerSun(k).sky;
  T.sky(R, stops, { sun: [sx, sy], warmth: k, clouds: 0.5, cloudLit: [255, lerp(236, 190, k), lerp(200, 140, k)], cloudShade: [lerp(150, 120, k), lerp(140, 100, k), lerp(150, 130, k)] });
  // the sun itself, a soft amber disc low over the roofs on the right
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const x = sx * R.W;
    const y = sy * R.H;
    const r = R.W * lerp(0.016, 0.026, k);
    const gr = c.createRadialGradient(x, y, 0, x, y, r * 6);
    gr.addColorStop(0, `rgba(255,${lerp(246, 190, k) | 0},${lerp(210, 120, k) | 0},0.9)`);
    gr.addColorStop(0.18, `rgba(255,${lerp(224, 160, k) | 0},${lerp(160, 90, k) | 0},0.35)`);
    gr.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = gr;
    c.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
    c.restore();
  });
  void t;
}

// The street running away north, into the gap between two blocks: a road
// narrowing to the vanishing point and façades receding either side, the sun
// on the left-hand one.
function northStreet(R, k, t, mode) {
  const [x0, x1] = GAP;
  const xc = (x0 + x1) / 2;
  const vy = -70;
  const fn = (c) => {
    c.fillStyle = mh('#7a7064', '#5a5058', k * 0.5);
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 22, vy);
    c.lineTo(xc + 22, vy);
    c.lineTo(x1, 4);
    c.fill();
    const side = (edge, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 4);
      c.lineTo(edge, -520);
      c.lineTo(xc + dir * 30, vy - 150);
      c.lineTo(xc + dir * 30, vy);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(30,24,20,0.55)';
      for (let i = 0; i < 5; i++) {
        const q = i / 5;
        const wx = lerp(edge, xc + dir * 30, q + 0.08);
        const top = lerp(-470, vy - 140, q + 0.08);
        const bot = lerp(-60, vy - 10, q + 0.08);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(top, bot, f / 3 + 0.08);
          c.fillRect(wx - 6 * (1 - q), wy, 12 * (1 - q) + 2, 26 * (1 - q) + 3);
        }
      }
    };
    // the left-hand wall faces the sun (it is the sunny side); the right is in shade
    side(x0, -1, mh('#b3a58c', '#a58f84', k));
    side(x1, 1, mh('#8a7e6e', '#6e6270', k));
    T.minaret(c, xc + 10, vy + 8, 0.5, mh('#948672', '#7a6a72', k));
    // the glow of the low sun down the middle of the road
    const gl = c.createLinearGradient(0, vy, 0, 4);
    gl.addColorStop(0, `rgba(255,200,130,${0.28 + 0.2 * k})`);
    gl.addColorStop(1, 'rgba(255,200,130,0)');
    c.fillStyle = gl;
    c.beginPath();
    c.moveTo(x0 + 60, 4);
    c.lineTo(xc - 18, vy);
    c.lineTo(xc + 18, vy);
    c.lineTo(x1 - 60, 4);
    c.fill();
  };
  deepScenery(R, fn, [x0, -520, x1, 4], xc, vy, x1 - x0, mode);
  void t;
}

// The fallen beam by the kerb, propped on two blocks: where the news was
// waited for, and where Sami and Abu Yazan sit now. Its face carries what
// people scratched into it.
function kerbBeam(R, k) {
  const x0 = KERB_X0;
  const x1 = KERB_X1;
  const face = [[x0, KERB_TOP], [x1, KERB_TOP - 1], [x1 + 3, -22], [x0 - 2, -21]];
  R.cast((c) => {
    for (const bx of [x0 + 10, x1 - 36]) {
      extrudeRect(c, bx, -22, 24, 22, 12, { color: '#8e8676' });
      c.fillStyle = '#8e8676';
      c.fillRect(bx, -22, 24, 22);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(bx, -22, 24, 3);
      c.fillRect(bx + 11, -22, 1.5, 22);
    }
    extrudePoly(c, face, 24, { color: '#a39b8a' });
    c.fillStyle = '#a39b8a';
    c.beginPath();
    c.moveTo(...face[0]);
    for (const p of face.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    // the lit top edge, a darker underside
    c.fillStyle = 'rgba(255,248,230,0.2)';
    c.fillRect(x0, KERB_TOP, x1 - x0, 2);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(x0 - 2, -26, x1 - x0 + 5, 5);
    // rebar out of the broken end
    c.strokeStyle = '#4a3b2e';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x1, -35);
    c.quadraticCurveTo(x1 + 12, -39, x1 + 17, -31);
    c.moveTo(x1, -29);
    c.lineTo(x1 + 11, -23);
    c.stroke();
  });
  R.surface((c) => {
    c.moveTo(...face[0]);
    for (const p of face.slice(1)) c.lineTo(...p);
    c.closePath();
  }, 'concrete', { scale: 0.55, seed: 7, alpha: 0.7 });
  R.paint((c) => {
    const r = rng(404);
    // the crack, with a branch, and chips along the top
    c.strokeStyle = 'rgba(30,24,20,0.55)';
    c.lineWidth = 1.1;
    c.beginPath();
    let cx = x0 + 96;
    let cy = KERB_TOP;
    c.moveTo(cx, cy);
    for (let i = 0; i < 5; i++) {
      cx += jit(r, 5);
      cy += 4.5;
      c.lineTo(cx, cy);
    }
    c.moveTo(cx, cy);
    c.lineTo(cx + 9, cy + 5);
    c.stroke();
    c.fillStyle = 'rgba(60,50,40,0.5)';
    for (let i = 0; i < 9; i++) c.fillRect(x0 + 6 + r() * (x1 - x0 - 14), KERB_TOP + r() * 3, 3 + r() * 5, 2);
    // what people scratched: names, dates, tallies, a heart, and «كنا هون»
    const ink = 'rgba(52,42,32,0.62)';
    const lit = 'rgba(255,250,235,0.3)';
    const mark = (txt, x, y, size, rot = 0, font = NASKH) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.font = `${size}px ${font}`;
      c.textAlign = 'center';
      c.direction = 'rtl';
      c.fillStyle = lit;
      c.fillText(txt, 0.6, 0.9);
      c.fillStyle = ink;
      c.fillText(txt, 0, 0);
      c.restore();
    };
    mark('كنا هون', x0 + 82, -28.5, 11, -0.015, RUQAA);
    mark('أبو علي ٢٠١٢', x0 + 24, -35, 5.5, 0.04);
    mark('هدى + ن', x0 + 141, -32, 5.5, -0.05);
    mark('٣ / ٩', x0 + 130, -26, 5, 0.03);
    mark('٢٠١٣', x0 + 54, -25, 5, -0.03);
    mark('ماهر', x0 + 28, -26.5, 5.5, 0.02);
    // tally marks, in fives
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    for (let n = 0; n < 3; n++) {
      const tx = x0 + 106 + n * 11;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(tx + i * 2, -37);
        c.lineTo(tx + i * 2 + 0.4, -31.5);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(tx - 1, -32.5);
      c.lineTo(tx + 8, -35.5);
      c.stroke();
    }
    // a small heart
    c.fillStyle = 'rgba(120,52,44,0.55)';
    const hx = x0 + 70;
    const hy = -36;
    c.beginPath();
    c.moveTo(hx, hy + 4);
    c.bezierCurveTo(hx - 6, hy, hx - 3, hy - 4, hx, hy - 1.2);
    c.bezierCurveTo(hx + 3, hy - 4, hx + 6, hy, hx, hy + 4);
    c.fill();
  });
  // low sun on its top edge
  R.glow((c) => {
    c.fillStyle = `rgba(255,${lerp(220, 160, k) | 0},${lerp(160, 90, k) | 0},${0.1 + 0.1 * k})`;
    c.fillRect(x0, KERB_TOP, x1 - x0, 1.6);
  });
}

// What the people who waited left: a tea glass, cigarette ends, scraps.
function litter(R, k) {
  R.cast((c) => {
    // a tea glass on the ground by the beam, a finger of cold tea in it
    const gx = KERB_X1 + 30;
    c.fillStyle = 'rgba(210,225,230,0.5)';
    c.beginPath();
    c.moveTo(gx - 4, -10);
    c.lineTo(gx + 4, -10);
    c.lineTo(gx + 3, 0);
    c.lineTo(gx - 3, 0);
    c.fill();
    c.fillStyle = 'rgba(140,70,26,0.8)';
    c.fillRect(gx - 3, -4, 6, 4);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(gx - 3.5, -9, 1, 7);
    // a plastic bottle, on its side, by the crate
    const bx = XG.olive - 70;
    c.fillStyle = 'rgba(190,215,225,0.65)';
    c.beginPath();
    c.roundRect(bx, -9, 30, 9, 3);
    c.fill();
    c.fillStyle = '#3a6a9a';
    c.fillRect(bx + 28, -7, 5, 5);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(bx + 3, -8, 20, 1.2);
  });
  R.paint((c) => {
    const r = rng(77);
    // cigarette ends and scraps along the foot of the beam
    for (let i = 0; i < 14; i++) {
      const x = KERB_X0 - 70 + r() * (KERB_X1 - KERB_X0 + 200);
      const y = 4 + r() * 18;
      if (r() < 0.55) {
        c.fillStyle = 'rgba(232,226,208,0.9)';
        c.fillRect(x, y, 5, 1.6);
        c.fillStyle = 'rgba(200,120,50,0.9)';
        c.fillRect(x + 4, y, 1.4, 1.6);
      } else {
        c.fillStyle = r() < 0.5 ? 'rgba(226,220,204,0.7)' : 'rgba(110,90,70,0.6)';
        c.fillRect(x, y, 4 + r() * 6, 2);
      }
    }
    // a folded scrap of paper, held down by a stone on the low wall
    const sx = XG.kerb - 112;
    c.fillStyle = '#e0d6bd';
    c.fillRect(sx, -68, 14, 7);
    c.fillStyle = 'rgba(60,50,40,0.5)';
    c.fillRect(sx + 2, -66, 7, 0.9);
    c.fillRect(sx + 2, -64, 9, 0.9);
    c.fillStyle = '#8a8070';
    c.beginPath();
    c.ellipse(sx + 8, -63, 6, 3.4, 0, 0, TAU);
    c.fill();
  });
  void k;
}

// The dead olive. The trunk stands, split and hollowed; every branch has
// been sawn off for firewood, and the cut ends are pale.
function deadOliveCut(R, x, k) {
  const r = rng(61);
  // the trunk: a twisting column, two thick limbs stumped short, a hollow
  const trunk = [[-24, 0], [-21, -34], [-26, -78], [-19, -126], [-30, -168], [-21, -190], [-9, -184], [-4, -176], [4, -190], [18, -186], [22, -164], [14, -122], [20, -78], [18, -34], [26, 0]];
  const T0 = trunk.map(([px, py]) => [x + px, py]);
  // sawn stubs: [base x, base y, angle, length, width]
  const stubs = [
    [-24, -78, -2.3, 32, 8],
    [20, -96, -0.7, 38, 9],
    [-22, -128, -2.5, 22, 7],
    [-26, -170, -2.1, 30, 8],
    [18, -164, -0.9, 26, 8],
    [-3, -184, -1.6, 20, 6],
    [14, -48, -0.3, 22, 7],
  ];
  R.cast((c) => {
    // stubs behind the trunk first
    for (const [sx, sy, a, len, w] of stubs) {
      const ex = x + sx + Math.cos(a) * len;
      const ey = sy + Math.sin(a) * len;
      c.strokeStyle = '#4a443c';
      c.lineCap = 'butt';
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x + sx, sy);
      c.lineTo(ex, ey);
      c.stroke();
    }
    extrudePoly(c, T0, 14, { color: '#575048', topK: 1.1, sideK: 0.55 });
    c.fillStyle = '#575048';
    c.beginPath();
    c.moveTo(...T0[0]);
    for (const p of T0.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    // bark: long dark fissures down the trunk, a pale dry sheen
    c.strokeStyle = 'rgba(28,24,20,0.5)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const fx = x - 18 + r() * 36;
      c.beginPath();
      c.moveTo(fx, -4 - r() * 10);
      let fy = -10;
      let px = fx;
      while (fy > -170 + r() * 20) {
        fy -= 14 + r() * 18;
        px += jit(r, 3);
        c.lineTo(px, fy);
      }
      c.stroke();
    }
    c.strokeStyle = 'rgba(210,200,180,0.2)';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      const fx = x + 8 + r() * 10;
      c.moveTo(fx, -10);
      c.quadraticCurveTo(fx + jit(r, 5), -90, fx + jit(r, 4), -150 - r() * 20);
      c.stroke();
    }
    // the hollow where the heart rotted
    c.fillStyle = '#1b1612';
    c.beginPath();
    c.ellipse(x - 2, -52, 6, 17, 0.05, 0, TAU);
    c.fill();
    // the stubs' fresh-cut ends: pale wood, rings, axe and saw marks
    for (const [sx, sy, a, len, w] of stubs) {
      const ex = x + sx + Math.cos(a) * len;
      const ey = sy + Math.sin(a) * len;
      c.save();
      c.translate(ex, ey);
      c.rotate(a + Math.PI / 2);
      c.fillStyle = '#b39e72';
      c.beginPath();
      c.ellipse(0, 0, w / 2, 2.6, 0, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(120,90,50,0.6)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.ellipse(0, 0, w / 4, 1.2, 0, 0, TAU);
      c.stroke();
      c.restore();
    }
    // two thin dead twigs left on the highest limb, bare as wire
    c.strokeStyle = '#6a625a';
    c.lineCap = 'round';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x + 4, -188);
    c.quadraticCurveTo(x + 12, -220, x + 5, -246);
    c.moveTo(x + 8, -214);
    c.lineTo(x + 24, -232);
    c.stroke();
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x + 5, -246);
    c.lineTo(x - 4, -262);
    c.moveTo(x + 5, -246);
    c.lineTo(x + 13, -266);
    c.stroke();
  });
  R.surface((c) => {
    c.moveTo(...T0[0]);
    for (const p of T0.slice(1)) c.lineTo(...p);
    c.closePath();
  }, 'wood', { scale: 0.5, seed: 3, alpha: 0.6 });
  // sawdust and chips, and a few sawn billets left behind at the foot
  R.cast((c) => {
    const q = rng(9);
    for (let i = 0; i < 4; i++) {
      const lx = x + 30 + i * 22 + q() * 8;
      const lw = 14 + q() * 10;
      c.fillStyle = '#74695c';
      c.fillRect(lx, -9, lw, 9);
      c.fillStyle = '#c9b48a';
      c.beginPath();
      c.ellipse(lx + lw, -4.5, 2, 4.5, 0, 0, TAU);
      c.fill();
    }
  });
  R.paint((c) => {
    const q = rng(10);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(214,196,150,${0.35 + q() * 0.4})`;
      c.fillRect(x - 46 + q() * 130, 2 + q() * 10, 1.5 + q() * 3, 1.2);
    }
  });
  void k;
}

// ground shadows: the low sun throws them to the left, longer as it sinks
function groundShadows(R, k) {
  const { shear, squash: sq } = cornerSun(k);
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(KERB_X0 + 10, -22, 24, 22);
    c.fillRect(KERB_X1 - 36, -22, 24, 22);
    c.fillRect(KERB_X0, KERB_TOP, KERB_X1 - KERB_X0, 20);
  }, XG.kerb, 0, shear, sq);
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    // the trunk, the stubs and the thin twigs
    c.fillRect(XG.olive - 22, -190, 44, 190);
    c.fillRect(XG.olive + 2, -264, 3, 76);
    c.fillRect(XG.olive - 50, -150, 20, 6);
    c.fillRect(XG.olive + 22, -108, 28, 8);
  }, XG.olive, 0, shear, sq);
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(XG.olive - 30, -30, 40, 30);
  }, XG.olive, 0, shear, sq);
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(XG.kerb - 160, -62, 110, 62);
  }, XG.kerb - 160, 0, shear, sq);
}

// What moves on its own at the corner: smoke from a stove pipe, curtains,
// a washing line across the north street, pigeons, a scrap of paper lifting,
// a bag on the draught, a drip.
function cornerLife(R, g, k, t, near) {
  const cx = R.cam.x;
  if (near(500, 780)) {
    const [wx, wy, ww] = T.windowRect(BLOCKS[4], 0, 1);
    R.cast((c) => {
      c.fillStyle = '#4a4540';
      c.fillRect(wx + ww * 0.6, wy - 64, 6, 76);
      c.fillRect(wx + ww * 0.6 - 3, wy - 68, 12, 5);
    });
    A.smoke(R, wx + ww * 0.6 + 3, wy - 70, t, { warm: 0.4 + 0.6 * k, h: 190, w: 20, alpha: 0.3, seed: 3 });
  }
  // curtains lifting out of first-floor windows
  for (const [bi, kk, ph] of [[0, 1, 1], [3, 1, 2], [5, 2, 3], [6, 1, 4], [7, 0, 5]]) {
    const b = BLOCKS[bi];
    if (!near(b.x, b.x + b.w)) continue;
    const [wx, wy, ww, wh] = T.windowRect(b, 1, Math.min(kk, Math.max(2, Math.round(b.w / 110)) - 1));
    R.cast((c) => {
      const cols = ['#c9bfa6', '#8e6f5a', '#b9b4a6', '#7d8a8e'];
      A.cloth(c, wx + 2, wy + 4, ww * 0.34, wh * 0.9, cols[ph % 4], t, ph, { amp: 2.4, sag: 2, folds: 0.08, period: 3.1 });
      A.cloth(c, wx + ww - 6, wy + 2, 12, wh * 0.45, cols[(ph + 1) % 4], t, ph + 2, { amp: 7, sag: 2, folds: 0, period: 2.6 });
    });
  }
  // a washing line across the north street
  if (near(GAP[0], GAP[1])) {
    R.cast((c) => {
      c.strokeStyle = '#2a2420';
      c.lineWidth = 1.2;
      A.wire(c, GAP[0] + 6, -312, GAP[1] - 6, -326, 30, t, 0.6);
      for (const [u, w, h, col] of [[0.2, 38, 66, '#d9d2c2'], [0.42, 26, 44, '#6f7e86'], [0.62, 32, 62, '#a25a46'], [0.8, 40, 70, '#b9ab8e']]) {
        const lx = lerp(GAP[0] + 6, GAP[1] - 6, u);
        const ly = lerp(-312, -326, u) + 30 * 4 * u * (1 - u) * 0.5 + A.windAt(t, lx, 0.6) * 0.8;
        A.cloth(c, lx - w / 2, ly, w, h, col, t, u * 9, { amp: 4, sag: 3 });
      }
    });
  }
  // the scrap of paper on the low wall, a corner lifting under its stone
  const sx = XG.kerb - 112;
  R.paint((c) => {
    const lift = Math.max(0, Math.sin(t * 1.1 + 1)) * (0.4 + 0.6 * Math.max(0, A.windAt(t, sx, 1)));
    c.save();
    c.translate(sx + 14, -68);
    c.rotate(-lift * 0.7);
    c.fillStyle = '#e8dfc6';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-4, 0);
    c.lineTo(0, 7);
    c.fill();
    c.restore();
  });
  for (const [px, py, sd] of [[KERB_X0 + 40, KERB_TOP - 1, 1], [XG.kerb - 118, -62, 2], [XG.olive - 12, -31, 3]]) if (near(px - 20, px + 20)) A.perch(R, px, py, t, sd, { color: k > 0.5 ? '#3a3638' : '#4a4640' });
  A.flock(R, cx, t, { y: -360, n: 5, every: 55, dur: 12, seed: 4, dir: -1, color: 'rgba(60,44,46,0.75)' });
  A.bag(R, cx, t, { every: 51, dur: 17, seed: 7 });
  if (near(880, 940)) {
    R.cast((c) => {
      c.fillStyle = '#4a4d52';
      c.fillRect(884, -150, 22, 6);
      c.fillRect(882, -186, 5, 38);
    });
    A.drip(R, 906, -147, 0, t, 2);
  }
}

export function drawCorner(R, g, { k = 0, t = g.time } = {}) {
  k = clamp(k);
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1500 && x0 < cx + 1500;
  const dof = g.settings?.get?.('dof') || 'bokeh';

  cornerSky(R, k, t);
  const col = (f) => mixc(f[0], f[1], k);
  horizon(R, { haze: rgbOf(mh('#efd5a8', '#f2a55e', k)), shade: mixc([128, 118, 106], [92, 80, 90], k), cloud: mixc([255, 244, 228], [255, 206, 170], k), span: 3600, seed: 6, t, lite: g.settings?.get?.('quality') === 'low' });
  // the far town: hazed ridge and roofs, and the old minaret
  T.skyline(R, { depth: 0.3, y: 40, color: mh('#a2937d', '#6a5a62', k), seed: 9, haze: [mh('#e6c7a0', '#e2976a', k), 0.2 + 0.1 * k], x0: -2000, x1: 2200, minarets: [-120, 480] });
  T.plume(R, 300, 60, t, { depth: 0.18, age: 1, height: 360, width: 60, alpha: 0.4, color: col([[110, 100, 92], [90, 76, 80]]) });

  // the far side of the street
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  if (near(GAP[0], GAP[1])) northStreet(R, k, t, dof);
  // the sun is low and in the west: the blocks to the right of us throw
  // wide slanted shade across the façades, creeping further as it sinks
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,1)';
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (!near(b.x - 200, b.x + b.w + 200)) continue;
      const h = 110 + ((i * 97) % 5) * 50 + k * 260;
      const w = b.w * (0.3 + ((i * 31) % 4) * 0.1 + k * 0.18);
      const x1 = b.x + b.w - ((i * 53) % 3) * 40 + 40;
      c.beginPath();
      c.moveTo(x1, 10);
      c.lineTo(x1, -h);
      c.lineTo(x1 - w, -h + w * 0.5);
      c.lineTo(x1 - w - 40, 10);
      c.closePath();
      c.fill();
    }
  }, 0, 0, 0, 1);

  T.street(R, -1500, 2600, { color: mh('#6e6559', '#5a5058', k * 0.6), pave: mh('#8a8072', '#7a6e70', k * 0.6) });
  T.cables(R, cx, { seed: 23, from: -1400, to: 2500 });
  cornerLife(R, g, k, t, near);

  // --- the place itself, behind the people ---
  // the gap to the east where a building came down: open sky, and the town beyond
  if (near(-640, -180)) T.rubble(R, -620, 420, 130, { seed: 41, color: '#a89b86' });
  T.lowWall(R, XG.kerb - 160, 110, 62, '#8f8470');
  kerbBeam(R, k);
  // the crate where the man with the walkie-talkie sat
  R.cast((c) => {
    extrudeRect(c, XG.olive - 30, -30, 40, 30, 14, { color: '#6a5238' });
    c.fillStyle = '#6a5238';
    c.fillRect(XG.olive - 30, -30, 40, 30);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 3; i++) c.fillRect(XG.olive - 30, -26 + i * 9, 40, 2);
  });
  deadOliveCut(R, XG.olive, k);
  litter(R, k);
  groundShadows(R, k);

  g.act?.drawProps?.(R, g);

  // --- the people (rigs), their shadows long on the ground ---
  const { shear, squash } = cornerSun(k);
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, squash);
  }
  A.streetDust(R, cx, t, { color: mixc([214, 190, 150], [214, 150, 104], k).map(Math.round), amount: 0.9, seed: 8 });
  g.effects?.draw?.(R);

  // the sun in the dust: motes drifting in the beam
  T.motes(R, cx, t, 0.9 + 0.5 * k);
  // the last light, thrown flat across the street from the right
  R.glow((c) => {
    const gl = c.createLinearGradient(cx + 900, 0, cx - 400, 0);
    gl.addColorStop(0, `rgba(255,${lerp(190, 130, k) | 0},${lerp(110, 60, k) | 0},${0.12 + 0.12 * k})`);
    gl.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = gl;
    c.fillRect(cx - 700, -300, 1700, 300);
  });
  T.foreground(R, cx, { from: -1600, to: 2600 });
}

// ===================================================================
// 2. THE LECTURE HALL, 2009
// ===================================================================
// Damascus University, a Civil Engineering lecture. Seen side-on: the hall's
// floor steps up to the left in tiers, five rows of cheap wooden desks, the
// lectern and blackboard to the right. A cutaway, daylight through tall
// windows in the back wall, a ceiling fan turning.

const LC = LECTURE[0];
export const LECTERN_X = LC + 330; // where the professor stands; the lectern is just in front of him

// [tread height (up, as a positive number), x from, x to]
const TIERS = [
  [0, LC + 130, LC + 520],
  [32, LC - 40, LC + 130],
  [64, LC - 190, LC - 40],
  [96, LC - 320, LC - 190],
  [128, LC - 520, LC - 320],
];
// Seats: [x, y of the hip]: a hip sits 42 above its tread. Sami (0) and Ahmad
// (1) share the second row; then the rest of the hall, front to back.
export const LECTURE_SEATS = [
  [LC - 5, -74],
  [LC + 60, -74],
  [LC + 170, -42],
  [LC + 230, -42],
  [LC - 165, -106],
  [LC - 100, -106],
  [LC - 295, -138],
  [LC - 230, -138],
  [LC - 410, -170],
  [LC - 345, -170],
];

const CEIL = -332;
const BOARD = { x: LC + 192, y: -268, w: 240, h: 150 };

export function lectureLook(g) {
  const lights = [
    // the afternoon through the back wall's windows, warm, from the upper left
    { uv: [-0.35, -0.85], color: [1.0, 0.86, 0.62], intensity: 1.05, radius: 0, project: 1.0, soft: 0.004, rim: 0.5 },
    // a wash of window light on the middle of the hall
    { x: LC - 120, y: -250, color: [1.0, 0.9, 0.7], intensity: 0.5, radius: 0.5, rim: 0.3 },
    { x: LC + 330, y: -160, color: [0.95, 0.95, 0.85], intensity: 0.22, radius: 0.35, rim: 0.2 },
  ];
  return {
    ambient: [0.36, 0.33, 0.33],
    lights,
    groundShadow: 0.55,
    god: { uv: [-0.35, -0.85], strength: 0.25 },
    bloom: 0.95,
    exposure: 0.94,
    grain: 0.06,
    // a memory: a little drained, soft, the highlights creamy
    grade: { sat: 0.82, contrast: 0.98, lift: 0.015, tint: [1.05, 1.0, 0.92], shadows: [1.0, 0.96, 1.02], highs: [1.08, 1.03, 0.92] },
    fog: { density: 0.05, height: 300, color: [0.95, 0.85, 0.68] },
    time: g.time,
  };
}

// the blackboard, baked: the lecture's own chalk
function boardCanvas() {
  return bake('lec-board', BOARD.w, BOARD.h, 3.2, (c, w, h) => {
    const r = rng(2009);
    // slate, a dust of old erased lines, a wipe from the duster
    const sl = c.createLinearGradient(0, 0, w, h);
    sl.addColorStop(0, '#2f4238');
    sl.addColorStop(1, '#27382f');
    c.fillStyle = sl;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(220,226,214,0.05)';
    for (let i = 0; i < 6; i++) c.fillRect(r() * w * 0.6, r() * h, 40 + r() * 90, 14 + r() * 24);
    c.strokeStyle = 'rgba(225,230,218,0.07)';
    c.lineWidth = 7;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(r() * w * 0.4, 20 + r() * (h - 40));
      c.lineTo(w * 0.4 + r() * w * 0.5, 20 + r() * (h - 40));
      c.stroke();
    }
    const chalk = 'rgba(240,242,232,0.92)';
    const soft = 'rgba(240,242,232,0.55)';
    c.strokeStyle = chalk;
    c.fillStyle = chalk;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const line = (x0, y0, x1, y1, wd = 1.4, col = chalk) => {
      c.strokeStyle = col;
      c.lineWidth = wd;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo((x0 + x1) / 2 + jit(r, 0.5), (y0 + y1) / 2 + jit(r, 0.5));
      c.lineTo(x1, y1);
      c.stroke();
    };
    const arrow = (x0, y0, x1, y1, wd = 1.1) => {
      line(x0, y0, x1, y1, wd);
      const a = Math.atan2(y1 - y0, x1 - x0);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x1 - Math.cos(a - 0.45) * 5, y1 - Math.sin(a - 0.45) * 5);
      c.moveTo(x1, y1);
      c.lineTo(x1 - Math.cos(a + 0.45) * 5, y1 - Math.sin(a + 0.45) * 5);
      c.stroke();
    };
    const txt = (s, x, y, size, col = chalk, align = 'left', italic = true) => {
      c.fillStyle = col;
      c.font = `${italic ? 'italic ' : ''}${size}px "Liberation Serif", "Times New Roman", "DejaVu Serif", serif`;
      c.textAlign = align;
      c.direction = 'ltr';
      c.fillText(s, x, y);
    };
    // heading in Arabic: the course, and the lecture
    c.fillStyle = chalk;
    c.font = `13px ${NASKH}`;
    c.textAlign = 'right';
    c.direction = 'rtl';
    c.fillText('تحليل الإنشاءات ٢ — العزوم والإجهادات', w - 10, 17);
    line(w - 168, 21, w - 10, 20.5, 1);

    // the simply supported beam, pin left, roller right
    const bx0 = 28;
    const bx1 = 128;
    const by = 82;
    line(bx0, by, bx1, by, 2.4);
    line(bx0, by + 4, bx1, by + 4, 1);
    // pin: a triangle on a hatched ground line
    line(bx0 + 4, by + 5, bx0 - 5, by + 20, 1.3);
    line(bx0 + 4, by + 5, bx0 + 13, by + 20, 1.3);
    line(bx0 - 9, by + 20, bx0 + 17, by + 20, 1.3);
    for (let i = 0; i < 5; i++) line(bx0 - 8 + i * 6, by + 20, bx0 - 12 + i * 6, by + 25, 0.9, soft);
    // roller: a triangle on a wheel
    line(bx1 - 4, by + 5, bx1 - 12, by + 17, 1.3);
    line(bx1 - 4, by + 5, bx1 + 4, by + 17, 1.3);
    c.strokeStyle = chalk;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(bx1 - 4, by + 20.5, 3.4, 0, TAU);
    c.stroke();
    line(bx1 - 14, by + 24.5, bx1 + 6, by + 24.5, 1.2);
    // the distributed load: a line above and arrows down onto the beam
    line(bx0, 44, bx1, 44, 1.2);
    for (let i = 0; i <= 10; i++) arrow(bx0 + 2 + i * ((bx1 - bx0 - 4) / 10), 44, bx0 + 2 + i * ((bx1 - bx0 - 4) / 10), by - 3);
    txt('w', (bx0 + bx1) / 2 - 3, 38, 12);
    txt('kN/m', (bx0 + bx1) / 2 + 6, 38, 8, soft);
    // the span, with its dimension line
    arrow((bx0 + bx1) / 2, by + 36, bx0, by + 36, 0.9);
    arrow((bx0 + bx1) / 2, by + 36, bx1, by + 36, 0.9);
    line(bx0, by + 29, bx0, by + 40, 0.9);
    line(bx1, by + 29, bx1, by + 40, 0.9);
    txt('L = 6.0 m', (bx0 + bx1) / 2, by + 48, 10, chalk, 'center');
    // reactions
    arrow(bx0, by + 62, bx0, by + 28, 1);
    txt('R', bx0 - 11, by + 56, 10);
    txt('A', bx0 - 5, by + 59, 7, soft);
    arrow(bx1 - 4, by + 62, bx1 - 4, by + 29, 1);
    txt('R', bx1 + 3, by + 56, 10);
    txt('B', bx1 + 9, by + 59, 7, soft);

    // the formulas, right: the bending moment, the stress, the deflection
    const fx = 150;
    txt('M', fx, 44, 13);
    txt('max', fx + 9, 47, 7, soft);
    txt('=  w L² / 8', fx + 20, 44, 13);
    c.strokeStyle = chalk;
    c.lineWidth = 1.1;
    c.strokeRect(fx - 4, 31, 96, 18);
    txt('σ  =  M · y / I', fx, 70, 13);
    txt('δ  =  5 w L⁴ / 384 E I', fx, 94, 12);
    // a half-hearted tick beside it, and the underlined note
    line(fx - 3, 100, fx + 84, 100, 1, soft);
    txt('Σ F = 0     Σ M = 0', fx, 115, 11, soft);
    // the moment diagram's little parabola, under the beam on the left
    c.strokeStyle = soft;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(bx0, 126);
    c.quadraticCurveTo((bx0 + bx1) / 2, 160, bx1, 126);
    c.stroke();
    line(bx0, 126, bx1, 126, 1, soft);
    txt('M', bx1 + 6, 130, 9, soft);
    // and a column, with P, for next week: the buckling load
    line(205, 126, 205, 142, 1.8);
    arrow(205, 114, 205, 125, 1);
    txt('P', 210, 120, 10);
    txt('cr', 215, 122, 6, soft);
    txt('= π² E I / L²', 212, 138, 8, soft);
    // a coffee ring? no: a small slip of the lecturer's, crossed out
    line(w - 76, 133, w - 22, 128, 1, 'rgba(240,242,232,0.35)');
    line(w - 76, 128, w - 22, 133, 1, 'rgba(240,242,232,0.35)');
  });
}

// side-on bench-desk: top slab, a book shelf below, end legs
function bench(c, x0, x1, floor, seed) {
  const top = -floor - 74;
  const w = x1 - x0;
  const wood = '#a8703f';
  const dark = '#7a4c2a';
  const r = rng(seed);
  // legs and the shelf: the thickness of a bench that runs back into the room
    c.fillStyle = dark;
  c.fillRect(x0 + 4, top + 5, 4, 70 - 5);
  c.fillRect(x1 - 8, top + 5, 4, 70 - 5);
  extrudeRect(c, x0 + 4, -floor - 30, w - 8, 4, 10, { color: dark });
  c.fillStyle = dark;
  c.fillRect(x0 + 4, -floor - 30, w - 8, 4);
  // the top: a worn slab, lit edge, carved initials and a ring
  extrudeRect(c, x0, top, w, 5, 16, { color: wood, topK: 1.18, sideK: 0.58 });
  c.fillStyle = wood;
  c.fillRect(x0, top, w, 5);
  c.fillStyle = 'rgba(255,236,190,0.35)';
  c.fillRect(x0, top, w, 1.4);
  c.fillStyle = 'rgba(40,24,10,0.3)';
  c.fillRect(x0, top + 4, w, 1);
  // things left on it, near the far end
  const items = Math.floor(w / 45);
  for (let i = 0; i < items; i++) {
    const ix = x0 + 30 + i * 45 + jit(r, 4);
    if (ix > x1 - 12) continue;
    const kind = r();
    if (kind < 0.45) {
      // an open notebook
      c.fillStyle = '#efe6d0';
      c.beginPath();
      c.moveTo(ix - 11, top);
      c.lineTo(ix - 8, top - 3);
      c.lineTo(ix + 8, top - 3);
      c.lineTo(ix + 11, top);
      c.fill();
      c.fillStyle = 'rgba(60,70,110,0.5)';
      c.fillRect(ix - 8, top - 1.6, 14, 0.7);
    } else if (kind < 0.7) {
      c.fillStyle = '#3a5a8a';
      c.fillRect(ix - 8, top - 3.5, 16, 3.5); // a closed textbook
      c.fillStyle = '#e8dcc0';
      c.fillRect(ix - 7, top - 2.4, 14, 0.9);
    } else if (kind < 0.85) {
      c.fillStyle = 'rgba(190,215,225,0.7)';
      c.fillRect(ix - 3, top - 15, 6, 15); // a water bottle
      c.fillStyle = '#2a6a9a';
      c.fillRect(ix - 2, top - 17, 4, 2);
    }
  }
  // scratches in the front edge
  c.strokeStyle = 'rgba(40,24,10,0.5)';
  c.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) {
    const sx = x0 + 6 + r() * (w - 14);
    c.beginPath();
    c.moveTo(sx, top + 1);
    c.lineTo(sx + 3 + r() * 5, top + 3);
    c.stroke();
  }
}

// a student's wooden chair, side-on, facing right
function chair(c, x, floor) {
  const sy = -floor - 38;
  const wood = '#8f5a30';
  c.fillStyle = wood;
  // legs
  c.fillRect(x - 16, sy, 3, 38);
  c.fillRect(x + 12, sy, 3, 38);
  // seat
  extrudeRect(c, x - 18, sy - 3, 36, 4, 12, { color: wood, topK: 1.15, sideK: 0.6 });
  c.fillRect(x - 18, sy - 3, 36, 4);
  // back
  extrudePoly(c, [[x - 20, sy - 3], [x - 24, sy - 46], [x - 19, sy - 46], [x - 15, sy - 3]], 8, { color: wood });
  c.beginPath();
  c.moveTo(x - 20, sy - 3);
  c.lineTo(x - 24, sy - 46);
  c.lineTo(x - 19, sy - 46);
  c.lineTo(x - 15, sy - 3);
  c.fill();
}

function ceilingFan(R, x, t, phase, depthY = CEIL + 44) {
  R.cast((c) => {
    // downrod, motor housing, a canopy against the ceiling
    c.fillStyle = '#6a6458';
    c.fillRect(x - 1.6, CEIL + 3, 3.2, depthY - CEIL - 10);
    c.fillStyle = '#4a463e';
    c.beginPath();
    c.roundRect(x - 12, depthY - 8, 24, 11, 3);
    c.fill();
    c.fillRect(x - 6, CEIL + 3, 12, 5);
    // blades: seen from the side, they swing from long and flat to end-on
    const spin = t * 9 + phase;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * TAU) / 3;
      const bx = Math.cos(a) * 64;
      const zz = Math.sin(a);
      const by = depthY - 3 + zz * 3.6;
      c.fillStyle = zz > 0 ? '#59523f' : '#6e6650';
      c.beginPath();
      c.ellipse(x + bx / 2 + Math.sign(bx) * 6, by, Math.abs(bx) / 2 - 2, 2.1, 0, 0, TAU);
      c.fill();
    }
  });
  // the blur of the turning blades, soft
  R.paint((c) => {
    c.fillStyle = 'rgba(40,36,28,0.14)';
    c.beginPath();
    c.ellipse(x, depthY - 3, 68, 4.4, 0, 0, TAU);
    c.fill();
  });
}

export function drawLecture(R, g, { t = g.time } = {}) {
  const cx = R.cam.x;
  const x0 = LC - 560;
  const x1 = LC + 560;

  // ---- the back wall: dado, plaster, soffit -------------------------------
  R.paint((c) => {
    // plaster above, cream, warmer near the windows
    const wl = c.createLinearGradient(0, CEIL, 0, 0);
    wl.addColorStop(0, '#d9cbaa');
    wl.addColorStop(1, '#e3d4b2');
    c.fillStyle = wl;
    c.fillRect(x0, CEIL, x1 - x0, -CEIL + 40);
    // the painted dado: oil paint, a worn institutional green
    c.fillStyle = '#6f8a74';
    c.fillRect(x0, -104, x1 - x0, 144);
    c.fillStyle = '#85a088';
    c.fillRect(x0, -106, x1 - x0, 3);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x0, -102, x1 - x0, 2);
    // the soffit: a deep concrete beam along the top, its underside in shade
    c.fillStyle = '#c1b392';
    c.fillRect(x0, CEIL - 30, x1 - x0, 30);
    c.fillStyle = '#9d9072';
    c.fillRect(x0, CEIL - 3, x1 - x0, 3);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x0, CEIL, x1 - x0, 14);
    // stains and damp at the corners, a clock
    const r = rng(5);
    c.fillStyle = 'rgba(110,90,60,0.08)';
    for (let i = 0; i < 14; i++) c.fillRect(x0 + r() * (x1 - x0), CEIL + r() * 80, 20 + r() * 60, 30 + r() * 80);
  });
  R.surface((c) => c.rect(x0, CEIL, x1 - x0, -CEIL), 'plaster', { scale: 1.3, seed: 11, alpha: 0.45 });

  // ---- windows: tall, steel-framed, the day outside -------------------------
  const wins = [-440, -310, -180, -50];
  R.paint((c) => {
    for (const wx of wins) {
      const wx0 = LC + wx;
      const wy0 = -318;
      const ww = 96;
      const wh = 190;
      // outside: sky, a tree, the roof of the next block, a minaret
      const sk = c.createLinearGradient(0, wy0, 0, wy0 + wh);
      sk.addColorStop(0, '#9fc6e8');
      sk.addColorStop(1, '#f1ecd6');
      c.fillStyle = sk;
      c.fillRect(wx0, wy0, ww, wh);
      c.save();
      c.beginPath();
      c.rect(wx0, wy0, ww, wh);
      c.clip();
      c.fillStyle = '#d6c9ae';
      c.fillRect(wx0, wy0 + wh - 52, ww, 52);
      c.fillStyle = '#c3b595';
      c.fillRect(wx0 + 10, wy0 + wh - 74, 40, 24);
      if (wx === -310 || wx === -50) T.minaret(c, wx0 + 70, wy0 + wh - 34, 0.28, '#b8aa8c', false);
      const q = rng(wx + 900);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = ['#3f6f2a', '#528a34', '#2e5a22'][i % 3];
        c.beginPath();
        c.arc(wx0 + 14 + q() * (ww - 20), wy0 + wh - 28 - q() * 26, 11 + q() * 9, 0, TAU);
        c.fill();
      }
      c.restore();
      // the frame: steel, painted, with a hopper vent
      c.strokeStyle = '#5e6a5e';
      c.lineWidth = 4.5;
      c.strokeRect(wx0, wy0, ww, wh);
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(wx0 + ww / 2, wy0);
      c.lineTo(wx0 + ww / 2, wy0 + wh);
      c.moveTo(wx0, wy0 + 56);
      c.lineTo(wx0 + ww, wy0 + 56);
      c.moveTo(wx0, wy0 + 126);
      c.lineTo(wx0 + ww, wy0 + 126);
      c.stroke();
      // a deep stone sill
      c.fillStyle = '#cdbf9e';
      c.fillRect(wx0 - 6, wy0 + wh, ww + 12, 7);
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.fillRect(wx0 - 6, wy0 + wh + 5, ww + 12, 2);
    }
  });
  // the daylight itself: panes glowing, slant shafts falling through the room
  R.glow((c) => {
    for (const wx of wins) {
      const wx0 = LC + wx;
      const gl = c.createLinearGradient(0, -318, 0, -128);
      gl.addColorStop(0, 'rgba(255,248,225,0.4)');
      gl.addColorStop(1, 'rgba(255,238,200,0.18)');
      c.fillStyle = gl;
      c.fillRect(wx0, -318, 96, 190);
      // a shaft down and to the right, long and soft, dust turning in it
      const sh = c.createLinearGradient(wx0, -318, wx0 + 150, -40);
      sh.addColorStop(0, 'rgba(255,230,170,0.16)');
      sh.addColorStop(1, 'rgba(255,230,170,0)');
      c.fillStyle = sh;
      c.beginPath();
      c.moveTo(wx0 + 4, -316);
      c.lineTo(wx0 + 92, -316);
      c.lineTo(wx0 + 230, -40);
      c.lineTo(wx0 + 130, -40);
      c.closePath();
      c.fill();
    }
  });

  // ---- the board, its frame and tray; a clock; a notice ---------------------
  const B = BOARD;
  R.cast((c) => {
    extrudeRect(c, B.x - 8, B.y - 8, B.w + 16, B.h + 16, 8, { color: '#6a4a2c' });
    c.fillStyle = '#6a4a2c';
    c.fillRect(B.x - 8, B.y - 8, B.w + 16, B.h + 16);
  });
  R.paint((c) => {
    c.drawImage(boardCanvas(), B.x, B.y, B.w, B.h);
    // the tray: chalk, a duster
    c.fillStyle = '#7a5a36';
    c.fillRect(B.x - 10, B.y + B.h + 4, B.w + 20, 5);
    c.fillStyle = '#e8e4d8';
    c.fillRect(B.x + 30, B.y + B.h + 1, 14, 3);
    c.fillRect(B.x + 50, B.y + B.h + 2.5, 8, 1.6);
    c.fillStyle = '#4a4036';
    c.fillRect(B.x + B.w - 70, B.y + B.h - 3, 22, 7);
    c.fillStyle = '#c4b89c';
    c.fillRect(B.x + B.w - 70, B.y + B.h - 3, 22, 2);
  });
  R.surface((c) => c.rect(B.x, B.y, B.w, B.h), 'plaster', { scale: 0.9, seed: 3, alpha: 0.18 });
  // a round wall clock above it
  R.cast((c) => {
    const kx = B.x + B.w * 0.5;
    const ky = CEIL + 40;
    c.fillStyle = '#2e2a24';
    c.beginPath();
    c.arc(kx, ky, 17, 0, TAU);
    c.fill();
    c.fillStyle = '#f1ead8';
    c.beginPath();
    c.arc(kx, ky, 14.5, 0, TAU);
    c.fill();
    c.strokeStyle = '#2e2a24';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(kx, ky);
    c.lineTo(kx - 2, ky - 8);
    c.moveTo(kx, ky);
    c.lineTo(kx + 8, ky + 4);
    c.stroke();
    c.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.beginPath();
      c.moveTo(kx + Math.cos(a) * 12, ky + Math.sin(a) * 12);
      c.lineTo(kx + Math.cos(a) * 14, ky + Math.sin(a) * 14);
      c.stroke();
    }
  });
  // notices pinned between the windows and the board
  R.paint((c) => {
    c.fillStyle = '#b89a62';
    c.fillRect(LC + 110, -250, 80, 56);
    for (const [nx, ny, nw, nh, col, rot] of [[LC + 116, -244, 26, 20, '#f2ecd8', -0.04], [LC + 146, -242, 22, 28, '#e8dcb8', 0.05], [LC + 160, -246, 26, 18, '#f4f0e0', 0.02], [LC + 120, -220, 34, 20, '#efe4c4', 0.03]]) {
      c.save();
      c.translate(nx + nw / 2, ny + nh / 2);
      c.rotate(rot);
      c.fillStyle = col;
      c.fillRect(-nw / 2, -nh / 2, nw, nh);
      c.fillStyle = 'rgba(50,60,90,0.45)';
      for (let i = 0; i < 3; i++) c.fillRect(-nw / 2 + 3, -nh / 2 + 4 + i * 5, nw - 8 - i * 3, 0.9);
      c.fillStyle = '#b02a22';
      c.beginPath();
      c.arc(0, -nh / 2 + 2, 1.5, 0, TAU);
      c.fill();
      c.restore();
    }
  });

  // ---- the hall's tiered floor, cut away at the front ---------------------
  const cut = [[x0, 70]];
  for (const [h, a, b] of [...TIERS].reverse()) cut.push([a, -h], [b, -h]);
  cut.push([x1, 70]);
  R.cast((c) => {
    extrudePoly(c, cut, 20, { color: '#84795f', topK: 1.1, sideK: 0.6 });
    c.fillStyle = '#84795f';
    c.beginPath();
    c.moveTo(...cut[0]);
    for (const p of cut.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    const dg = c.createLinearGradient(0, -130, 0, 70);
    dg.addColorStop(0, 'rgba(0,0,0,0)');
    dg.addColorStop(1, 'rgba(20,14,8,0.5)');
    c.fillStyle = dg;
    c.beginPath();
    c.moveTo(...cut[0]);
    for (const p of cut.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    // the tread: a worn honey parquet along each step, nosing lit
    for (const [h, a, b] of TIERS) {
      c.fillStyle = '#a98a5a';
      c.fillRect(a, -h, b - a, 4);
      c.fillStyle = 'rgba(255,236,190,0.35)';
      c.fillRect(a, -h, b - a, 1.2);
      c.fillStyle = 'rgba(40,26,10,0.35)';
      for (let x = Math.ceil(a / 26) * 26; x < b; x += 26) c.fillRect(x, -h, 1, 4);
    }
    // risers: a darker face under each nosing, scuffed by shoes
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (const [h, a] of TIERS.slice(1)) c.fillRect(a, -h + 4, 5, 28);
  });
  R.surface((c) => {
    c.moveTo(...cut[0]);
    for (const p of cut.slice(1)) c.lineTo(...p);
    c.closePath();
  }, 'concrete', { scale: 1.1, seed: 4, alpha: 0.5 });

  // ---- chairs and bench-desks, back row first ------------------------------
  const SEAT_ROWS = [[8, 9], [6, 7], [4, 5], [0, 1], [2, 3]]; // seats of the tiers, from the back to the front
  R.cast((c) => {
    TIERS.slice().reverse().forEach(([h, a, b], i) => {
      const [s0, s1] = SEAT_ROWS[i];
      const sx = [LECTURE_SEATS[s0][0], LECTURE_SEATS[s1][0]].sort((p, q) => p - q);
      if (!(sx[1] > cx - 800 && sx[0] < cx + 800)) return;
      chair(c, sx[0], h);
      chair(c, sx[1], h);
      // bags dropped by the chair legs
      const q = rng(300 + i);
      for (const bx of [sx[0], sx[1]]) {
        if (q() < 0.55) continue;
        const bw = 20 + q() * 8;
        const bh = 14 + q() * 7;
        const col = ['#5a4630', '#3a4a5a', '#6a3a30', '#4a5a40'][Math.floor(q() * 4)];
        c.fillStyle = col;
        c.beginPath();
        c.roundRect(bx - 38 - bw / 2, -h - bh, bw, bh, 4);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(bx - 38 - bw / 2, -h - bh * 0.55, bw, 1.4);
        c.strokeStyle = shadeHex(col, 0.7);
        c.lineWidth = 1.6;
        c.beginPath();
        c.arc(bx - 38, -h - bh, bw * 0.28, Math.PI, 0);
        c.stroke();
      }
      bench(c, sx[0] + 16, Math.min(sx[1] + 76, b - 4), h, 70 + i);
    });
  });

  // ---- the lectern ---------------------------------------------------------
  const lx = LECTERN_X + 36;
  R.cast((c) => {
    // a plain wooden lectern: a column of panels and a sloping top
    extrudeRect(c, lx + 6, -100, 46, 100, 22, { color: '#8a5a32' });
    c.fillStyle = '#8a5a32';
    c.fillRect(lx + 6, -100, 46, 100);
    c.fillStyle = '#74492a';
    c.fillRect(lx + 12, -90, 34, 70);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(lx + 12, -90, 34, 3);
    c.fillStyle = 'rgba(255,230,180,0.18)';
    c.fillRect(lx + 12, -22, 34, 2);
    const top = [[lx - 4, -104], [lx + 66, -122], [lx + 66, -116], [lx - 4, -98]];
    extrudePoly(c, top, 24, { color: '#9a6a3a', topK: 1.2, sideK: 0.58 });
    c.fillStyle = '#9a6a3a';
    c.beginPath();
    c.moveTo(...top[0]);
    for (const p of top.slice(1)) c.lineTo(...p);
    c.fill();
    c.fillStyle = 'rgba(255,236,190,0.35)';
    c.beginPath();
    c.moveTo(lx - 4, -104);
    c.lineTo(lx + 66, -122);
    c.lineTo(lx + 66, -120.5);
    c.lineTo(lx - 4, -102.5);
    c.fill();
    // his notes on it, a lip to hold them
    c.save();
    c.translate(lx + 28, -113);
    c.rotate(-0.25);
    c.fillStyle = '#efe6d0';
    c.fillRect(-22, -4, 40, 3);
    c.fillStyle = 'rgba(60,60,90,0.4)';
    c.fillRect(-18, -3.4, 30, 0.7);
    c.restore();
    // a glass of tea and a mobile phone's worth of small life
    c.fillStyle = 'rgba(210,225,230,0.55)';
    c.fillRect(lx + 52, -135, 8, 12);
    c.fillStyle = 'rgba(140,70,26,0.85)';
    c.fillRect(lx + 52.5, -130, 7, 6);
    c.fillStyle = '#c8c4b8';
    c.fillRect(lx + 50, -123.5, 12, 1.2);
  });

  // ---- the fans ------------------------------------------------------------
  ceilingFan(R, LC - 60, t, 0);
  ceilingFan(R, LC + 330, t, 2.1);
  // tube-light fixtures hung from the soffit, off at midday
  R.cast((c) => {
    for (const fx of [LC - 250, LC + 160]) {
      c.fillStyle = '#5a564c';
      c.fillRect(fx - 40, CEIL + 22, 80, 4);
      c.fillStyle = '#e8e4d4';
      c.fillRect(fx - 36, CEIL + 25, 72, 3);
      c.fillStyle = '#4a463e';
      c.fillRect(fx - 20, CEIL + 4, 1.4, 18);
      c.fillRect(fx + 20, CEIL + 4, 1.4, 18);
    }
  });

  // dust turning in the daylight; the air of a room full of people
  T.motes(R, cx, t, 0.9);
  R.glow((c) => {
    const gl = c.createRadialGradient(LC - 150, -240, 0, LC - 150, -240, 420);
    gl.addColorStop(0, 'rgba(255,236,190,0.16)');
    gl.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = gl;
    c.fillRect(LC - 600, -420, 1200, 480);
  });

  g.act?.drawProps?.(R, g);

  // ---- people (rigs) --------------------------------------------------------
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || Math.abs(w.x - cx) > 900) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, -0.5, 0.12);
  }
  g.effects?.draw?.(R);
}

// ===================================================================
// 3. THE CAMPUS STREET, 2009
// ===================================================================
// Outside the faculty: a Damascus street in the sun. The university gate and
// railings at the left, a falafel cart, a man with jasmine garlands, shops,
// orange trees, taxis and microbuses going by, and at the right end the
// cafeteria. `dissolve` 0 → 1: the light turns amber and drains, the
// traffic slows, and everything contracts towards the cafeteria door and
// comes apart into dust.

const CC = CAMPUS[0];
export const CAFE_DOOR_X = CC + 960;
const GATE_X = CC - 1040; // the middle of the gate, where they step out
const CART_X = CC - 440; // the falafel cart's left end (the vendor stands at its right)
const RACK_X = CC + 205; // the jasmine seller's rack

const SHOPS = [
  { w: 250, floors: 3, kind: 'books', sign: 'مكتبة ومصوّرات الجامعة', sc: '#1d3a63', tc: '#fff3c9', wall: '#e4cfa6', awn: ['#2f6f9a', '#f3e6c8'] },
  { w: 230, floors: 4, kind: 'clothes', sign: 'ألبسة الأناقة', sc: '#6b2438', tc: '#ffe9a8', wall: '#dcbf9a' },
  { w: 250, floors: 3, kind: 'sweets', sign: 'حلويات الشام', sc: '#7a1e2c', tc: '#ffe9a8', wall: '#ecd5a8', awn: ['#c0392b', '#f3e6c8'] },
  { w: 230, floors: 4, kind: 'fruit', sign: 'خضار وفواكه الغوطة', sc: '#1f6a3a', tc: '#fff7c4', wall: '#d9c8a2', awn: ['#2e7d32', '#f3e6c8'] },
  { w: 250, floors: 3, kind: 'phones', sign: 'الأمل للاتصالات', sc: '#12263f', tc: '#9ae0ff', wall: '#e9d9b6' },
  { w: 210, floors: 4, kind: 'pharmacy', sign: 'صيدلية النور', sc: '#0f5a3a', tc: '#ffffff', wall: '#efe0bd' },
];
const SHOPS_X0 = CC - 750;
const SHOP_GF = 272; // a shop's ground floor with its sign band, at people's scale (was 178)
const SHOP_FL = 160; // and a storey above it (was 112)
const shopX = (i) => SHOPS_X0 + SHOPS.slice(0, i).reduce((a, s) => a + s.w, 0);
const CAFE = { x: CC + 690, w: 520, floors: 2 };
const CAFE_H = 410; // the cafeteria's wall: a ground floor 262 tall (door 205) and offices over it (was 250)

// the traffic's own clock: it slows when the memory goes
const SLOW = { t: -1, acc: 0 };
function trafficTime(t, d) {
  if (SLOW.t < 0 || t < SLOW.t || t - SLOW.t > 1) SLOW.acc = t;
  else SLOW.acc += (t - SLOW.t) * (1 - 0.88 * smooth(0.05, 0.9, d));
  SLOW.t = t;
  return SLOW.acc;
}

export function campusLook(g, d = 0) {
  d = clamp(d);
  const dim = smooth(0.1, 0.95, d);
  const sunCol = mixc([1.0, 0.9, 0.7], [1.0, 0.55, 0.22], smooth(0, 0.8, d));
  const lights = [
    { uv: [-0.5, lerp(-0.75, -0.2, d)], color: sunCol, intensity: lerp(1.5, 0.35, dim), radius: 0, project: 1.0, soft: 0.003, rim: lerp(1.0, 0.5, d) },
    { uv: [1.3, 0.35], color: [1.0, 0.7, 0.4], intensity: lerp(0.25, 0.1, d), radius: 0, rim: 0.3 },
  ];
  return {
    ambient: mixc(mixc([0.42, 0.4, 0.4], [0.3, 0.22, 0.17], smooth(0, 0.6, d)), [0.05, 0.03, 0.02], smooth(0.5, 1, d)),
    lights,
    god: { uv: [-0.5, lerp(-0.75, -0.2, d)], strength: lerp(0.3, 0.5, d) },
    groundShadow: 0.6,
    bloom: lerp(1.1, 1.0, d),
    exposure: lerp(1.0, 0.82, dim),
    grain: lerp(0.06, 0.1, d),
    // a memory: saturated in the sun, then the colour goes out of it
    grade: {
      sat: lerp(1.1, 0.12, smooth(0.15, 0.95, d)),
      contrast: lerp(1.06, 1.2, d),
      lift: 0.005 * (1 - d),
      tint: mixc([1.03, 1.0, 0.94], [1.12, 0.92, 0.72], d),
      shadows: mixc([0.96, 0.96, 1.06], [1.0, 0.8, 0.7], d),
      highs: mixc([1.05, 1.01, 0.93], [1.1, 0.88, 0.6], d),
    },
    // road dust in the golden air; at the end the air is all dust
    fog: { density: lerp(0.03, 0.5, smooth(0.2, 1, d)), height: lerp(120, 520, d), color: mixc([0.92, 0.78, 0.55], [0.5, 0.28, 0.1], d) },
    time: g.time,
  };
}

// ---- the street furniture, each baked or drawn once per frame ---------------

// an orange tree, pruned round, its trunk whitewashed to the knee
function orangeTree(seed) {
  return bake('camp-tree-' + seed, 300, 330, 0.9, (c) => {
    c.translate(150, 322);
    const rg = rng(seed * 31 + 5);
    extrudeRect(c, -14, -150, 28, 150, 7, { color: '#5e4630' });
    c.fillStyle = '#5e4630';
    c.fillRect(-14, -150, 28, 150);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(4, -150, 10, 150);
    c.fillStyle = 'rgba(255,226,180,0.4)'; // the sun on its left side
    c.fillRect(-14, -150, 5, 150);
    c.fillStyle = '#ece6d6';
    c.fillRect(-14, -48, 28, 48);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(4, -48, 10, 48);
    c.strokeStyle = '#5e4630';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(0, -140);
    c.lineTo(-34, -190);
    c.moveTo(0, -140);
    c.lineTo(30, -196);
    c.stroke();
    const greens = ['#3a6a26', '#4a7e30', '#5e9438', '#2e5a22'];
    const clumps = [];
    for (let i = 0; i < 34; i++) {
      const a = rg() * TAU;
      const rr = Math.sqrt(rg());
      clumps.push([Math.cos(a) * 106 * rr, -228 + Math.sin(a) * 66 * rr, 24 + rg() * 20]);
    }
    for (const [x, y, r] of clumps) {
      c.fillStyle = shadeHex(greens[Math.floor(rg() * 4)], 0.6);
      c.beginPath();
      c.arc(x + 3, y + 6, r, 0, TAU);
      c.fill();
    }
    for (const [x, y, r] of clumps) {
      c.fillStyle = greens[Math.floor(rg() * 4)];
      c.beginPath();
      c.arc(x, y, r * 0.88, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(214,238,130,0.3)';
      c.beginPath();
      c.arc(x - r * 0.25, y - r * 0.3, r * 0.5, 0, TAU);
      c.fill();
    }
    for (let i = 0; i < 9; i++) {
      const [x, y] = clumps[Math.floor(rg() * clumps.length)];
      c.fillStyle = '#f08a1c';
      c.beginPath();
      c.arc(x + jit(rg, 10), y + 8 + rg() * 12, 4.2, 0, TAU);
      c.fill();
    }
  });
}

function lampPost(c, x) {
  c.fillStyle = '#3a3a3e';
  c.fillRect(x - 3.5, -290, 7, 290);
  c.fillRect(x - 8, -10, 16, 10);
  c.beginPath();
  c.moveTo(x - 3, -290);
  c.quadraticCurveTo(x - 3, -320, x + 28, -318);
  c.lineTo(x + 48, -316);
  c.lineTo(x + 48, -310);
  c.lineTo(x + 28, -312);
  c.quadraticCurveTo(x + 4, -312, x + 4, -290);
  c.fill();
  c.fillStyle = '#4a4a50';
  c.fillRect(x + 40, -314, 20, 8);
  c.fillStyle = '#d8d8d0';
  c.fillRect(x + 44, -307, 14, 3);
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.fillRect(x - 3.5, -290, 2, 290);
}

// a shop's face, baked: upper floors, balcony and A/C, the ground-floor opening
function shopFace(spec, idx) {
  const GF = SHOP_GF; // an opening 210 tall
  const FL = SHOP_FL;
  const H = GF + spec.floors * FL + 30;
  const PAD = 24;
  return bake('camp-shop-' + idx, spec.w + PAD * 2, H + 30, 1.1, (c) => {
    c.translate(PAD, H + 10);
    const w = spec.w;
    const r = rng(idx * 17 + 4);
    const top = -(GF + spec.floors * FL);
    // the wall: plaster, pilasters, stains, a lit cornice
    extrudeRect(c, 0, top, w, -top, 18, { color: spec.wall });
    c.fillStyle = spec.wall;
    c.fillRect(0, top, w, -top);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(0, top, 8, -top);
    c.fillStyle = 'rgba(80,56,30,0.12)';
    c.fillRect(w - 8, top, 8, -top);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(120,90,50,0.07)';
      c.fillRect(r() * w, top + r() * (-top), 20 + r() * 50, 12 + r() * 40);
    }
    extrudeRect(c, -6, top - 10, w + 12, 12, 14, { color: shadeHex(spec.wall, 0.92) });
    c.fillStyle = shadeHex(spec.wall, 0.96);
    c.fillRect(-6, top - 10, w + 12, 12);
    c.fillStyle = 'rgba(255,250,235,0.5)';
    c.fillRect(-6, top - 10, w + 12, 2);
    // the parapet, a water tank and a dish
    c.fillStyle = shadeHex(spec.wall, 0.9);
    c.fillRect(0, top - 22, w, 12);
    if (idx % 2 === 0) {
      c.fillStyle = '#4a4440';
      c.fillRect(w * 0.7, top - 52, 30, 30);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(w * 0.7, top - 52, 3, 30);
    } else {
      c.fillStyle = '#d8d6d0';
      c.beginPath();
      c.ellipse(w * 0.3, top - 40, 14, 11, -0.5, 0, TAU);
      c.fill();
      c.strokeStyle = '#6a6a6a';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(w * 0.3 - 2, top - 34);
      c.lineTo(w * 0.3 - 6, top - 22);
      c.stroke();
    }
    // the upper floors: shuttered windows (46 x 96, the sill 52 up), a balcony
    // or two with a 92 rail, an air conditioner
    for (let f = 0; f < spec.floors; f++) {
      const fl = -(GF + f * FL); // this storey's floor line
      const fy = fl - 148; // the window's top
      const n = Math.max(2, Math.round(w / 78));
      for (let i = 0; i < n; i++) {
        const wx = 16 + (i * (w - 32)) / n + (w - 32) / n / 2 - 23;
        const open = r() < 0.5;
        c.fillStyle = shadeHex(spec.wall, 0.8);
        c.fillRect(wx - 5, fy - 4, 56, 108); // surround
        c.fillStyle = '#2a2420';
        c.fillRect(wx, fy, 46, 96);
        // the glass, a sky reflection
        const gg = c.createLinearGradient(wx, fy, wx + 46, fy + 96);
        gg.addColorStop(0, 'rgba(190,215,235,0.7)');
        gg.addColorStop(1, 'rgba(120,150,170,0.4)');
        c.fillStyle = gg;
        c.fillRect(wx + 2, fy + 2, 42, 92);
        c.fillStyle = '#2a2420';
        c.fillRect(wx + 22, fy + 2, 2, 92);
        // wooden shutters, half-open
        c.fillStyle = ['#5a7a5a', '#6a4a30', '#4a6a7a', '#7a5a38'][(idx + i + f) % 4];
        if (open) {
          c.fillRect(wx - 17, fy, 15, 96);
          c.fillRect(wx + 48, fy, 15, 96);
          c.fillStyle = 'rgba(0,0,0,0.2)';
          for (let sy = fy + 4; sy < fy + 94; sy += 6) {
            c.fillRect(wx - 17, sy, 15, 1);
            c.fillRect(wx + 48, sy, 15, 1);
          }
        } else {
          c.fillRect(wx + 2, fy + 2, 42, 36);
          c.fillStyle = 'rgba(0,0,0,0.2)';
          for (let sy = fy + 5; sy < fy + 38; sy += 5) c.fillRect(wx + 2, sy, 42, 1);
        }
        // a curtain behind it
        if (!open && r() < 0.6) {
          c.fillStyle = 'rgba(240,230,205,0.75)';
          c.fillRect(wx + 3, fy + 42, 17, 50);
        }
      }
      if (f === 0 && spec.floors > 2) {
        // a balcony: slab, iron rail 92 high, laundry or a pot of basil
        const bx = w * 0.18;
        const bw = w * 0.5;
        const by = fl;
        extrudeRect(c, bx, by, bw, 8, 20, { color: shadeHex(spec.wall, 0.95) });
        c.fillStyle = shadeHex(spec.wall, 0.95);
        c.fillRect(bx, by, bw, 8);
        c.strokeStyle = '#1e1e22';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(bx, by - 92);
        c.lineTo(bx + bw, by - 92);
        for (let x = bx + 3; x < bx + bw; x += 9) {
          c.moveTo(x, by - 92);
          c.lineTo(x, by);
        }
        c.stroke();
        if (idx % 3 !== 0) {
          c.fillStyle = '#a0603a';
          c.fillRect(bx + 8, by - 20, 18, 20);
          c.fillStyle = '#3f7a2e';
          c.beginPath();
          c.arc(bx + 17, by - 30, 12, 0, TAU);
          c.fill();
        }
      }
      if (f === 1 && idx % 2 === 1) {
        // a split air conditioner bracketed on the wall
        c.fillStyle = '#e6e4de';
        c.fillRect(w - 46, fy + 40, 36, 20);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        c.fillRect(w - 46, fy + 56, 36, 4);
      }
    }
    // ----- the ground floor: a 210 opening, goods, sign, awning
    const ox = 14;
    const ow = w - 28;
    const OP = 210;
    c.fillStyle = '#1c1612';
    c.fillRect(ox, -OP, ow, OP);
    c.save();
    c.scale(1.4, 1.4); // goods were drawn for a 150 opening
    goods(c, spec.kind, ox / 1.4, ow / 1.4, r);
    c.restore();
    // the pulled-up shutter above the opening, and the shopfront frame
    c.fillStyle = '#8c8a86';
    c.fillRect(ox - 4, -OP - 10, ow + 8, 12);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = -OP - 8; y < -OP; y += 3) c.fillRect(ox - 4, y, ow + 8, 0.8);
    // the sign: a lit board with the shop's name
    c.fillStyle = spec.sc;
    c.fillRect(ox, -OP - 52, ow, 42);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.5;
    c.strokeRect(ox + 3, -OP - 49, ow - 6, 36);
    c.fillStyle = spec.tc;
    c.font = `${spec.sign.length > 14 ? 21 : 26}px ${RUQAA}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText(spec.sign, ox + ow / 2, -OP - 22);
    // the awning: striped, scalloped (its fringe is stirred on the live layer)
    if (spec.awn) {
      const [a1, a2] = spec.awn;
      const aw = ow + 20;
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? a2 : a1;
        c.beginPath();
        const sx0 = ox - 10 + (i * aw) / 12;
        c.moveTo(sx0, -OP);
        c.lineTo(sx0 + aw / 12, -OP);
        c.lineTo(sx0 + aw / 12 + 2, -OP + 44);
        c.quadraticCurveTo(sx0 + aw / 24 + 1, -OP + 52, sx0 - 1, -OP + 44);
        c.closePath();
        c.fill();
      }
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.fillRect(ox - 10, -OP, aw, 9);
    }
    // the step, and a worn threshold
    c.fillStyle = '#b3a589';
    c.fillRect(ox - 8, -4, ow + 16, 6);
  });
}

function goods(c, kind, ox, ow, r) {
  if (kind === 'books') {
    // shelves of textbooks, a photocopier, a stack of paper reams
    c.fillStyle = '#3a2a1e';
    for (let i = 0; i < 4; i++) c.fillRect(ox + ow * 0.38, -128 + i * 32, ow * 0.58, 3);
    for (let s = 0; s < 4; s++) {
      let bx = ox + ow * 0.38 + 4;
      while (bx < ox + ow * 0.96 - 6) {
        const bw = 4 + r() * 5;
        c.fillStyle = ['#a03a30', '#2e5a8a', '#d8c070', '#3a7a4a', '#e0d8c4', '#6a3a6a'][Math.floor(r() * 6)];
        c.fillRect(bx, -128 + s * 32 - 22 - r() * 6, bw, 22 + r() * 6);
        bx += bw + 0.6;
      }
    }
    c.fillStyle = '#c8c8c4';
    c.fillRect(ox + 8, -62, ow * 0.28, 38);
    c.fillStyle = '#8a8a88';
    c.fillRect(ox + 8, -66, ow * 0.28, 5);
    c.fillStyle = '#3a6a9a';
    c.fillRect(ox + 14, -50, 24, 5);
    c.fillStyle = '#d8d4c8';
    c.fillRect(ox + 8, -24, ow * 0.28, 24);
    c.fillStyle = '#f4f0e4';
    for (let i = 0; i < 4; i++) c.fillRect(ox + 12, -22 + i * 5, ow * 0.28 - 8, 3.4);
    c.fillStyle = '#f2ecd8';
    c.font = `11px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('تصوير ورقة ٢ ل.س', ox + 8 + (ow * 0.28) / 2, -100);
  } else if (kind === 'clothes') {
    // a rail of garments, two mannequins in the window
    c.strokeStyle = '#b8b8b8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ox + 6, -122);
    c.lineTo(ox + ow - 6, -122);
    c.stroke();
    for (let i = 0; i < 12; i++) {
      c.fillStyle = ['#b03a4a', '#2e5a8a', '#e8e0d0', '#3a7a5a', '#d8a838', '#6a3a7a'][i % 6];
      c.fillRect(ox + 10 + i * ((ow - 24) / 12), -120, 12, 44 + r() * 24);
    }
    for (const mx of [ox + ow * 0.3, ox + ow * 0.7]) {
      c.fillStyle = '#d8c8b0';
      c.beginPath();
      c.arc(mx, -104, 6, 0, TAU);
      c.fill();
      c.fillStyle = mx < ox + ow / 2 ? '#a83a52' : '#2e6a8a';
      c.beginPath();
      c.moveTo(mx - 8, -96);
      c.lineTo(mx + 8, -96);
      c.lineTo(mx + 14, -30);
      c.lineTo(mx - 14, -30);
      c.closePath();
      c.fill();
      c.fillStyle = '#9a8a72';
      c.fillRect(mx - 1.5, -30, 3, 30);
    }
  } else if (kind === 'sweets') {
    // glass cabinet, trays of baklava, pink boxes
    c.fillStyle = 'rgba(190,220,230,0.2)';
    c.fillRect(ox + 8, -90, ow - 16, 68);
    for (let t = 0; t < 3; t++) {
      c.fillStyle = '#d8d6d0';
      c.fillRect(ox + 10, -84 + t * 24, ow - 20, 3);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = ['#c8872a', '#b8d878', '#d89a3a', '#e8c868'][(i + t) % 4];
        c.fillRect(ox + 14 + i * ((ow - 30) / 9), -98 + t * 24 + 8, (ow - 30) / 9 - 4, 11);
      }
    }
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? '#e8b8c8' : '#f4dde4';
      c.fillRect(ox + ow * 0.64 + i * 0, -122 + i * 0, 0, 0);
    }
    c.fillStyle = '#e8a8bc';
    c.fillRect(ox + ow - 52, -122, 36, 22);
    c.fillStyle = '#f4dde4';
    c.fillRect(ox + ow - 48, -142, 28, 20);
  } else if (kind === 'fruit') {
    // crates stepping down to the pavement: oranges, apples, grapes, tomatoes
    const cols = ['#f08a1c', '#c8302a', '#9ab83a', '#d84a30', '#7a3a7a', '#f0c030'];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) {
        const cx0 = ox + 10 + i * ((ow - 20) / 4);
        c.fillStyle = '#8a6a44';
        c.fillRect(cx0, -40 - row * 36, (ow - 20) / 4 - 4, 30);
        c.fillStyle = cols[(row * 4 + i) % cols.length];
        for (let k = 0; k < 10; k++) {
          c.beginPath();
          c.arc(cx0 + 5 + k * ((ow - 20) / 4 - 14) / 9, -42 - row * 36, 4.2, 0, TAU);
          c.fill();
        }
      }
    }
  } else if (kind === 'phones') {
    // bright cases of handsets, top-up cards, a flashing board
    c.fillStyle = '#12263f';
    c.fillRect(ox + 6, -134, ow - 12, 100);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = '#d8d8d8';
      c.fillRect(ox + 12 + (i % 6) * ((ow - 28) / 6), -126 + Math.floor(i / 6) * 38, 11, 22);
      c.fillStyle = '#6ab8e8';
      c.fillRect(ox + 13.5 + (i % 6) * ((ow - 28) / 6), -123 + Math.floor(i / 6) * 38, 8, 12);
    }
    c.fillStyle = '#e8c030';
    c.fillRect(ox + 8, -50, ow - 16, 16);
    c.fillStyle = '#12263f';
    c.font = `11px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('تعبئة رصيد · بطاقات', ox + ow / 2, -38);
  } else {
    // a pharmacy: white shelves of boxes and a green cross
    c.fillStyle = '#e8e6e0';
    for (let i = 0; i < 4; i++) c.fillRect(ox + 6, -130 + i * 32, ow - 12, 3);
    for (let s = 0; s < 4; s++) {
      let bx = ox + 8;
      while (bx < ox + ow - 14) {
        const bw = 6 + r() * 7;
        c.fillStyle = ['#e8f0f0', '#2e8a5a', '#d8d4c0', '#4a7aa8', '#e8b8a0'][Math.floor(r() * 5)];
        c.fillRect(bx, -130 + s * 32 - 18 - r() * 6, bw, 18 + r() * 6);
        bx += bw + 1;
      }
    }
    c.fillStyle = '#1f9a52';
    c.fillRect(ox + ow / 2 - 5, -146, 10, 3);
  }
}

// the cafeteria: a long low front with an awning, a big window, the door
function cafeFace() {
  const w = CAFE.w;
  const H = CAFE_H;
  return bake('camp-cafe', w + 60, H + 40, 1.1, (c) => {
    c.translate(30, H + 10);
    // the wall: pale stone and a green dado
    extrudeRect(c, 0, -H, w, H, 24, { color: '#e0cfa6' });
    c.fillStyle = '#e0cfa6';
    c.fillRect(0, -H, w, H);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = -H + 10; y < -215; y += 22) c.fillRect(0, y, w, 1.2);
    extrudeRect(c, -8, -H - 10, w + 16, 14, 16, { color: '#cdb98c' });
    c.fillStyle = '#d4c094';
    c.fillRect(-8, -H - 10, w + 16, 14);
    c.fillStyle = 'rgba(255,250,235,0.5)';
    c.fillRect(-8, -H - 10, w + 16, 2);
    // upper windows of the faculty offices above
    for (let i = 0; i < 4; i++) {
      const wx = 38 + i * 116;
      c.fillStyle = '#2a2420';
      c.fillRect(wx, -H + 24, 66, 100);
      const gg = c.createLinearGradient(wx, -H + 24, wx + 66, -H + 124);
      gg.addColorStop(0, 'rgba(190,215,235,0.75)');
      gg.addColorStop(1, 'rgba(120,150,170,0.4)');
      c.fillStyle = gg;
      c.fillRect(wx + 2, -H + 26, 62, 96);
      c.fillStyle = '#2a2420';
      c.fillRect(wx + 32, -H + 26, 2, 96);
      c.fillStyle = '#cdb98c';
      c.fillRect(wx - 5, -H + 124, 76, 6);
    }
    // the ground floor: glass front, left; the doorway, centre
    const doorX = CAFE_DOOR_X - CAFE.x;
    c.fillStyle = '#1c1612';
    c.fillRect(30, -215, doorX - 80, 215);
    c.fillRect(doorX + 60, -215, w - doorX - 78, 215);
    // the room inside: warm, tables, a counter and the coffee machine, a glow
    const wg = c.createLinearGradient(0, -215, 0, 0);
    wg.addColorStop(0, '#5a3e22');
    wg.addColorStop(1, '#8a5e30');
    c.fillStyle = wg;
    c.fillRect(36, -209, doorX - 92, 209);
    c.fillStyle = '#3a2a1c';
    c.fillRect(46, -90, 120, 90);
    c.fillStyle = '#d8d0b8';
    c.fillRect(46, -95, 120, 6);
    c.fillStyle = '#9a9a9c';
    c.fillRect(68, -142, 30, 47);
    c.fillStyle = '#2a2a2e';
    c.fillRect(73, -132, 20, 7);
    // the right-hand room: shelves of tins and glasses, the cash desk
    const rx = doorX + 66;
    const rw = w - doorX - 88;
    const rg2 = c.createLinearGradient(0, -209, 0, 0);
    rg2.addColorStop(0, '#4a3220');
    rg2.addColorStop(1, '#7a5230');
    c.fillStyle = rg2;
    c.fillRect(rx, -209, rw, 209);
    c.fillStyle = '#2e2218';
    for (let i = 0; i < 3; i++) c.fillRect(rx + 6, -190 + i * 38, rw - 12, 3);
    for (let i = 0; i < 3; i++) for (let k2 = 0; k2 < 9; k2++) {
      c.fillStyle = ['#c8a050', '#e8e0c8', '#a05030', '#6a8a9a'][(i + k2) % 4];
      c.fillRect(rx + 10 + k2 * ((rw - 24) / 9), -190 + i * 38 - 17, 8, 17);
    }
    // students inside as shapes
    c.fillStyle = 'rgba(30,22,16,0.8)';
    for (const px of [200, 262, 318]) {
      c.beginPath();
      c.arc(px, -128, 11, 0, TAU);
      c.fill();
      c.fillRect(px - 12, -116, 24, 62);
    }
    c.fillStyle = '#8a6a44';
    for (const px of [186, 300]) c.fillRect(px, -60, 70, 4);
    // the glass's frame and the shine on it
    c.strokeStyle = '#3a3a3e';
    c.lineWidth = 4;
    c.strokeRect(34, -211, doorX - 90, 211);
    c.beginPath();
    c.moveTo((34 + doorX - 56) / 2, -211);
    c.lineTo((34 + doorX - 44) / 2, 0);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.beginPath();
    c.moveTo(60, -211);
    c.lineTo(110, -211);
    c.lineTo(60, 0);
    c.lineTo(20, 0);
    c.fill();
    // the doorway: deep, lit warm, a coir mat
    c.fillStyle = '#1c1612';
    c.fillRect(doorX - 50, -205, 100, 205);
    const dg = c.createLinearGradient(0, -205, 0, 0);
    dg.addColorStop(0, '#9a6a34');
    dg.addColorStop(1, '#d09a54');
    c.fillStyle = dg;
    c.fillRect(doorX - 44, -199, 88, 199);
    c.fillStyle = 'rgba(40,26,14,0.5)';
    c.fillRect(doorX - 44, -199, 10, 199);
    c.strokeStyle = '#3a2a1c';
    c.lineWidth = 5;
    c.strokeRect(doorX - 50, -205, 100, 205);
    c.fillStyle = '#6a5a44';
    c.fillRect(doorX - 38, -3, 76, 3);
    // the sign: big, green, the faculty's name; and a red board for the coffee
    c.fillStyle = '#1d5a3c';
    c.fillRect(24, -268, w - 220, 44);
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.lineWidth = 1.5;
    c.strokeRect(28, -264, w - 228, 36);
    c.fillStyle = '#f6efd0';
    c.font = `24px ${RUQAA}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('كافتيريا كلية الهندسة', 24 + (w - 220) / 2, -237);
    c.fillStyle = '#b02a22';
    c.fillRect(w - 176, -268, 150, 44);
    c.fillStyle = '#fff';
    c.font = `15px ${NASKH}`;
    c.fillText('نسكافيه · شاي · عصير', w - 101, -239);
    // the awning, green and cream, scalloped, over the whole front
    const n = 26;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#f3e6c8' : '#2e7d4a';
      const x0 = -6 + (i * (w + 12)) / n;
      c.beginPath();
      c.moveTo(x0, -215);
      c.lineTo(x0 + (w + 12) / n, -215);
      c.lineTo(x0 + (w + 12) / n + 3, -178);
      c.quadraticCurveTo(x0 + (w + 12) / (2 * n) + 1.5, -170, x0, -178);
      c.closePath();
      c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(-6, -215, w + 12, 9);
    // the menu board by the door, chalk prices
    c.fillStyle = '#26302c';
    c.fillRect(doorX + 64, -170, 60, 84);
    c.fillStyle = 'rgba(240,242,232,0.9)';
    c.font = `10px ${NASKH}`;
    c.textAlign = 'right';
    c.fillText('نسكافيه ٣٥', doorX + 118, -146);
    c.fillText('شاي ٢٠', doorX + 118, -126);
    c.fillText('عصير ٣٠', doorX + 118, -106);
    c.fillStyle = '#b3a589';
    c.fillRect(20, -4, w - 10, 6);
  });
}

// ---- the falafel cart --------------------------------------------------------
function falafelCart(R, x, t, wp) {
  const w = 120;
  R.cast(
    wp((c) => {
      // striped umbrella over it
      c.fillStyle = '#6a5a48';
      c.fillRect(x + w / 2 - 2.5, -192, 5, 192);
      const stripes = 9;
      for (let i = 0; i < stripes; i++) {
        c.fillStyle = i % 2 ? '#f3e6c8' : '#c0392b';
        const a0 = x - 26 + (i * (w + 52)) / stripes;
        const a1 = x - 26 + ((i + 1) * (w + 52)) / stripes;
        c.beginPath();
        c.moveTo(a0, -164);
        c.quadraticCurveTo((a0 + x + w / 2) / 2, -208, x + w / 2, -222);
        c.quadraticCurveTo((a1 + x + w / 2) / 2, -208, a1, -164);
        c.closePath();
        c.fill();
      }
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.beginPath();
      c.moveTo(x - 26, -164);
      c.lineTo(x + w + 26, -164);
      c.lineTo(x + w + 22, -158);
      c.lineTo(x - 22, -158);
      c.fill();
      // the cart: a painted wooden body on bicycle wheels, tiled front
      extrudeRect(c, x, -92, w, 74, 18, { color: '#4a82b4' });
      c.fillStyle = '#4a82b4';
      c.fillRect(x, -92, w, 74);
      c.fillStyle = 'rgba(255,255,255,0.22)';
      for (let ix = x + 4; ix < x + w - 8; ix += 20) for (let iy = -86; iy < -22; iy += 20) c.fillRect(ix, iy, 16, 16);
      c.fillStyle = '#c8ccd0';
      c.fillRect(x - 4, -96, w + 8, 6);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(x - 4, -96, w + 8, 1.5);
      // a glass case of falafel balls and a stack of bread
      c.fillStyle = 'rgba(200,230,240,0.5)';
      c.beginPath();
      c.moveTo(x + 6, -96);
      c.lineTo(x + 6, -134);
      c.lineTo(x + 70, -134);
      c.lineTo(x + 76, -96);
      c.fill();
      c.fillStyle = '#c8872a';
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.arc(x + 15 + (i % 7) * 8.4, -104 - Math.floor(i / 7) * 9, 4.2, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#e8d8a8';
      c.fillRect(x + 10, -132, 60, 3);
      c.fillStyle = '#e8d8b8';
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(x + w - 26, -102 - i * 4.5, 15, 3.4, 0, 0, TAU);
        c.fill();
      }
      // the fryer: a wide pan with spitting oil
      c.fillStyle = '#2a2a2e';
      c.beginPath();
      c.ellipse(x + 96, -98, 22, 5.5, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#c8872a';
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.arc(x + 82 + i * 7, -99 + Math.sin(t * 3.2 + i) * 1.3, 3.4, 0, TAU);
        c.fill();
      }
      // a price board and the gas bottle underneath
      c.fillStyle = '#20242a';
      c.fillRect(x + 80, -150, 40, 30);
      c.fillStyle = '#f0f0e0';
      c.font = `12px ${NASKH}`;
      c.textAlign = 'center';
      c.direction = 'rtl';
      c.fillText('فلافل ساخن', x + 100, -136);
      c.fillText('٢٥ ل.س', x + 100, -123);
      c.fillStyle = '#c4382c';
      c.beginPath();
      c.roundRect(x + 8, -18, 18, 34, 4);
      c.fill();
      // wheels
      c.fillStyle = '#18181a';
      for (const wx of [x + 16, x + w - 16]) {
        c.beginPath();
        c.arc(wx, -14, 14, 0, TAU);
        c.fill();
        c.fillStyle = '#9a9ea2';
        c.beginPath();
        c.arc(wx, -14, 4, 0, TAU);
        c.fill();
        c.fillStyle = '#18181a';
      }
      // handle
      c.strokeStyle = '#3a3a3e';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, -70);
      c.lineTo(x - 18, -52);
      c.stroke();
    }, 1.3),
  );
  R.shadow(
    (c) => {
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(x, -96, w, 96);
      c.beginPath();
      c.ellipse(x + w / 2, -180, 70, 20, 0, 0, TAU);
      c.fill();
    },
    x,
    0,
    -0.9,
    0.16,
  );
  // heat and steam off the oil; a warm bulb under the umbrella
  R.glow(
    wp((c) => {
      const hx = x + 98;
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.4 + i / 8) % 1;
        c.fillStyle = `rgba(255,255,245,${0.2 * (1 - ph)})`;
        c.beginPath();
        c.arc(hx + Math.sin(ph * 5 + i) * 9, -108 - ph * 90, 5 + ph * 13, 0, TAU);
        c.fill();
      }
      const bg = c.createRadialGradient(x + 50, -150, 0, x + 50, -150, 70);
      bg.addColorStop(0, 'rgba(255,214,140,0.3)');
      bg.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = bg;
      c.fillRect(x - 20, -230, 160, 150);
    }, 1.3),
  );
}

// ---- the jasmine seller's rack ---------------------------------------------------
function jasmineRack(R, x, t, wp) {
  R.cast(
    wp((c) => {
      // a tripod of canes, a crossbar, garlands hanging in loops
      c.strokeStyle = '#7a5a38';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x + 10, 0);
      c.lineTo(x + 38, -128);
      c.moveTo(x + 66, 0);
      c.lineTo(x + 38, -128);
      c.moveTo(x + 38, 0);
      c.lineTo(x + 38, -132);
      c.stroke();
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + 0, -112);
      c.lineTo(x + 80, -112);
      c.stroke();
      // garlands: strings of white buds with green leaves, sagging between pegs
      const r = rng(55);
      for (let i = 0; i < 10; i++) {
        const gx = x + 6 + i * 7.4;
        const len = 46 + r() * 34;
        const sway = Math.sin(t * 0.9 + i * 0.7) * 1.5;
        c.strokeStyle = '#4a7a30';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(gx, -112);
        c.quadraticCurveTo(gx + 4 + sway, -112 + len * 0.5, gx + sway, -112 + len);
        c.stroke();
        for (let k = 0; k < 13; k++) {
          const q = k / 12;
          const bx = gx + (4 + sway) * 2 * q * (1 - q) + sway * q * q;
          const by = -112 + len * q;
          c.fillStyle = k % 3 === 2 ? '#fff6dc' : '#fffdf4';
          c.beginPath();
          c.ellipse(bx + (k % 2 ? 2.2 : -2.2), by, 3.6, 2.3, 0.6, 0, TAU);
          c.fill();
        }
      }
      // the water bucket with loose strings, a stool
      c.fillStyle = '#5a7a9a';
      c.beginPath();
      c.moveTo(x + 84, 0);
      c.lineTo(x + 120, 0);
      c.lineTo(x + 116, -38);
      c.lineTo(x + 88, -38);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x + 84, -22, 36, 2);
      c.fillStyle = '#fffdf4';
      for (let i = 0; i < 16; i++) {
        c.beginPath();
        c.ellipse(x + 90 + (i % 8) * 3.4, -40 - Math.floor(i / 8) * 3, 2.6, 1.8, 0.4, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#3f7a2e';
      for (let i = 0; i < 6; i++) c.fillRect(x + 90 + i * 5, -44, 3, 3);
    }, 0.4),
  );
  R.shadow(
    (c) => {
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.fillRect(x + 36, -130, 4, 130);
      c.fillRect(x + 84, -38, 36, 38);
    },
    x,
    0,
    -0.9,
    0.15,
  );
  // the glimmer of the blossom, and a scent as a faint drift of petals
  R.glow(
    wp((c) => {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.3 + i / 6) % 1;
        c.fillStyle = `rgba(255,252,230,${0.5 * Math.sin(ph * Math.PI)})`;
        c.fillRect(x + 40 + Math.sin(ph * 4 + i * 2) * 26, -90 + ph * 90, 1.6, 1.6);
      }
    }, 0.4),
  );
}

// ---- the gate ----------------------------------------------------------------------
function uniGate(R, wp) {
  const gx0 = GATE_X - 92;
  const gx1 = GATE_X + 92;
  R.cast(
    wp((c) => {
      // railings: black iron with gilded spear points, between stone dwarf walls
      const rail = (x0, x1) => {
        c.fillStyle = '#b8a984';
        c.fillRect(x0, -34, x1 - x0, 34);
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.fillRect(x0, -34, x1 - x0, 2);
        c.fillStyle = '#1e1e22';
        c.fillRect(x0, -126, x1 - x0, 3);
        c.fillRect(x0, -42, x1 - x0, 3);
        for (let x = x0 + 4; x < x1; x += 11) {
          c.fillRect(x, -130, 2.6, 96);
          c.fillStyle = '#c8a24a';
          c.beginPath();
          c.moveTo(x - 1.5, -130);
          c.lineTo(x + 1.3, -142);
          c.lineTo(x + 4.1, -130);
          c.fill();
          c.fillStyle = '#1e1e22';
        }
      };
      rail(CC - 1400, gx0);
      rail(gx1, CC - 780);
      // the piers: Damascene ablaq courses, a capital, a lamp on top
      for (const px of [gx0 - 22, gx1 - 14]) {
        extrudeRect(c, px, -240, 36, 240, 14, { color: '#d8cdb0' });
        for (let i = 0; i < 12; i++) {
          c.fillStyle = i % 2 ? '#2e2a28' : '#e8dfc8';
          c.fillRect(px, -240 + i * 20, 36, 20);
        }
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(px, -240, 4, 240);
        c.fillStyle = '#d0c4a4';
        c.fillRect(px - 5, -252, 46, 14);
        c.fillStyle = 'rgba(255,250,235,0.5)';
        c.fillRect(px - 5, -252, 46, 2);
        c.fillStyle = '#e4dcc4';
        c.beginPath();
        c.arc(px + 18, -268, 12, 0, TAU);
        c.fill();
      }
      // the arch of iron over the opening, and the lettering in gilt
      c.strokeStyle = '#1e1e22';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(gx0 + 14, -240);
      c.quadraticCurveTo(GATE_X, -312, gx1 - 14, -240);
      c.stroke();
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(gx0 + 14, -226);
      c.quadraticCurveTo(GATE_X, -294, gx1 - 14, -226);
      c.stroke();
      c.fillStyle = '#0f0f12';
      c.fillRect(GATE_X - 62, -268, 124, 30);
      c.fillStyle = '#d8b64a';
      c.font = `22px ${RUQAA}`;
      c.textAlign = 'center';
      c.direction = 'rtl';
      c.fillText('جامعة دمشق', GATE_X, -245);
      // the gate leaves, swung open back against the piers
      c.fillStyle = '#1e1e22';
      for (const [lx, dir] of [[gx0 + 14, 1], [gx1 - 14, -1]]) {
        for (let i = 0; i < 4; i++) c.fillRect(lx + dir * i * 5 - (dir < 0 ? 2.6 : 0), -205 + i * 1.5, 2.6, 205 - i * 1.5);
      }
    }, 0.0),
  );
  R.shadow(
    (c) => {
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(gx0 - 22, -250, 36, 250);
      c.fillRect(gx1 - 14, -250, 36, 250);
    },
    gx0,
    0,
    -0.9,
    0.15,
  );
}

// the faculty beyond the railings: a long pale building, an arcade, palms
function facultyBehind(R, wp, cam, t = 0) {
  const d = 0.9;
  R.layer(d);
  R.paint(
    wp((c) => {
      const bx = (CC - 1330) * d + 20;
      const bw = 560;
      c.fillStyle = '#dccfae';
      c.fillRect(bx, -330, bw, 330);
      c.fillStyle = '#cdbe98';
      c.fillRect(bx - 6, -338, bw + 12, 12);
      // an arcade of pointed arches along the ground floor
      for (let i = 0; i < 7; i++) {
        const ax = bx + 30 + i * 76;
        c.fillStyle = '#4a4034';
        c.beginPath();
        c.moveTo(ax, 0);
        c.lineTo(ax, -92);
        c.quadraticCurveTo(ax + 20, -128, ax + 40, -92);
        c.lineTo(ax + 40, 0);
        c.fill();
        c.fillStyle = '#cbbd98';
        c.fillRect(ax + 40, -92, 36, 92);
      }
      for (let f = 0; f < 2; f++) for (let i = 0; i < 9; i++) {
        c.fillStyle = '#3a2f26';
        c.fillRect(bx + 24 + i * 60, -270 + f * 100, 26, 56);
        c.fillStyle = 'rgba(190,215,235,0.5)';
        c.fillRect(bx + 26 + i * 60, -268 + f * 100, 22, 52);
      }
      // palms
      for (const px of [bx + 590, bx + 650]) {
        c.strokeStyle = '#6a5a3e';
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(px, 0);
        c.quadraticCurveTo(px + 8, -140, px + 2, -250);
        c.stroke();
        c.strokeStyle = '#4a7a30';
        c.lineWidth = 3;
        c.save();
        A.lean(c, px + 2, -250, t, px * 0.01, 0.05);
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI + (i / 8) * Math.PI + Math.sin(t * 1.5 + i * 0.9 + px) * 0.04;
          c.beginPath();
          c.moveTo(px + 2, -250);
          c.quadraticCurveTo(px + 2 + Math.cos(a) * 30, -250 + Math.sin(a) * 30 - 8, px + 2 + Math.cos(a) * 58, -250 + Math.sin(a) * 40 + 24);
          c.stroke();
        }
        c.restore();
      }
    }, 0.9),
  );
  R.layer(1);
  void cam;
}

// ---- traffic ------------------------------------------------------------------------
function vehicle(c, x, yb, dir, v, tt) {
  c.save();
  c.translate(x, yb);
  c.scale(dir, 1);
  if (v.kind === 'van') {
    // a white microbus with a green band, the Damascus service van
    const L = 150;
    const body = [[-L, -24], [-L, -92], [-L + 14, -112], [L - 52, -116], [L - 10, -62], [L, -40], [L, -22]];
    extrudePoly(c, body, 14, { color: '#ece8dc' });
    c.fillStyle = '#ece8dc';
    c.beginPath();
    c.moveTo(...body[0]);
    for (const p of body.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    c.fillStyle = '#2e8a4a';
    c.fillRect(-L, -60, 2 * L, 14);
    c.fillStyle = '#e8c63a';
    c.fillRect(-L, -46, 2 * L, 3);
    c.fillStyle = '#7fa2b6';
    for (let i = 0; i < 4; i++) c.fillRect(-L + 18 + i * 56, -102, 48, 34);
    c.beginPath();
    c.moveTo(L - 100, -102);
    c.lineTo(L - 56, -108);
    c.lineTo(L - 14, -66);
    c.lineTo(L - 100, -66);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(-L + 20, -102, 12, 34);
    c.fillStyle = '#f8f0d0';
    c.fillRect(L - 6, -44, 8, 8);
    c.fillStyle = '#c02a2a';
    c.fillRect(-L, -44, 5, 8);
    c.fillStyle = '#12161a';
    c.fillRect(L - 130, -116, 56, 10);
    c.fillStyle = '#ffb030';
    c.font = `8px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('باب توما — المزة', L - 102, -108);
    for (const wx of [-L + 52, L - 56]) wheel(c, wx, -22, 22, tt);
  } else {
    const body = [[-96, -18], [-98, -42], [-86, -52], [-56, -56], [-38, -88], [-12, -96], [24, -96], [48, -82], [60, -56], [90, -50], [98, -36], [96, -20]];
    extrudePoly(c, body, 12, { color: v.col });
    c.fillStyle = v.col;
    c.beginPath();
    c.moveTo(...body[0]);
    for (const p of body.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    const gg = c.createLinearGradient(-40, -96, 50, -56);
    gg.addColorStop(0, '#a8cce0');
    gg.addColorStop(1, '#5a7a8a');
    c.fillStyle = gg;
    c.beginPath();
    c.moveTo(-36, -58);
    c.lineTo(-24, -86);
    c.lineTo(-6, -90);
    c.lineTo(-6, -58);
    c.fill();
    c.beginPath();
    c.moveTo(2, -58);
    c.lineTo(2, -90);
    c.lineTo(24, -90);
    c.lineTo(44, -58);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(-90, -50, 180, 1.4);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(-90, -28, 180, 3);
    c.fillStyle = '#f8f0d0';
    c.fillRect(90, -46, 8, 6);
    c.fillStyle = '#c02a2a';
    c.fillRect(-98, -46, 4, 8);
    if (v.taxi) {
      c.fillStyle = '#f0f0e8';
      c.fillRect(-8, -104, 26, 8);
      c.fillStyle = '#222';
      c.fillRect(-90, -33, 180, 4);
    }
    for (const wx of [-58, 58]) wheel(c, wx, -18, 17, tt);
  }
  c.restore();
}
function wheel(c, wx, wy, r, tt) {
  c.fillStyle = '#18181a';
  c.beginPath();
  c.arc(wx, wy, r, 0, TAU);
  c.fill();
  c.fillStyle = '#b8bcc0';
  c.beginPath();
  c.arc(wx, wy, r * 0.55, 0, TAU);
  c.fill();
  c.strokeStyle = '#6a6e72';
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = tt * 10 + (i / 5) * TAU;
    c.moveTo(wx, wy);
    c.lineTo(wx + Math.cos(a) * r * 0.5, wy + Math.sin(a) * r * 0.5);
  }
  c.stroke();
}
function trafficAt(tt) {
  const span = 5200;
  const wrap = (v) => ((v % span) + span) % span;
  const defs = [
    { sp: 150, off: 300, y: 40, dir: 1, kind: 'van' },
    { sp: 118, off: 2800, y: 38, dir: 1, kind: 'car', col: '#e8c020', taxi: true },
    { sp: 100, off: 1500, y: 52, dir: -1, kind: 'car', col: '#3a5a9a' },
    { sp: 135, off: 4100, y: 52, dir: -1, kind: 'van' },
    { sp: 112, off: 3500, y: 39, dir: 1, kind: 'car', col: '#c8ccd0' },
    { sp: 126, off: 600, y: 54, dir: -1, kind: 'car', col: '#e8c020', taxi: true },
  ];
  return defs.map((q) => ({ ...q, x: q.dir > 0 ? CC - 2600 + wrap(tt * q.sp + q.off) : CC + 2600 - wrap(tt * q.sp + q.off) }));
}

// What moves on its own on the campus street: live laundry on a balcony,
// pigeons on the gate piers and the awnings, a flock, a bag on the draught,
// dust in the sun. Gone before the dissolve takes hold.
function campusLife(R, t, near, d, cx) {
  if (d > 0.3) return;
  // washing on the books shop's balcony and the fruit shop's: a line above the 92 rail
  for (const i of [0, 3]) {
    const sp = SHOPS[i];
    const sx = shopX(i);
    if (!near(sx, sx + sp.w)) continue;
    const bx = sx + sp.w * 0.18;
    const bw = sp.w * 0.5;
    const by = -SHOP_GF;
    R.cast((c) => {
      c.strokeStyle = '#2a2420';
      c.lineWidth = 1.1;
      A.wire(c, bx, by - 98, bx + bw, by - 100, 8, t, i, 0.8);
      const cols = ['#e8e0d0', '#9ab0c8', '#d8a890', '#f0e8c8'];
      for (let k = 0; k < 4; k++) A.cloth(c, bx + 8 + k * (bw - 24) / 4, by - 96 + k * 0.4, 18, 46 + (k % 2) * 12, cols[k], t, i * 3 + k, { amp: 3, sag: 2 });
    });
  }
  for (const [px, py, sd] of [[GATE_X - 92 - 4, -252, 1], [GATE_X + 92 + 4, -252, 2], [shopX(2) + 70, -SHOP_GF + 62 - 12, 3], [shopX(3) + 150, -SHOP_GF + 62 - 12, 4]]) {
    if (near(px - 20, px + 20)) A.perch(R, px, py, t, sd, { s: 1.5, color: '#5a554e' });
  }
  A.flock(R, cx, t, { y: -420, n: 5, every: 49, dur: 11, seed: 5, color: 'rgba(70,60,60,0.7)' });
  A.bag(R, cx, t, { every: 57, dur: 18, seed: 8, y: 0 });
  A.sunMotes(R, cx - 500, cx + 500, -280, -20, t, { n: 14, seed: 6, color: '255,236,190' });
}

export function drawCampus(R, g, { t = g.time, dissolve = 0 } = {}) {
  const d = clamp(dissolve);
  const cx = R.cam.x;
  const e = smooth(0, 1, d);
  const sceneA = 1 - smooth(0.55, 0.98, d);
  const dust = smooth(0.12, 1, d);
  const near = (x0, x1) => d > 0.02 || (x1 > cx - 1600 && x0 < cx + 1600);
  const wp = (fn, ph = 0) => (c) => {
    if (e < 0.001) return fn(c);
    c.save();
    const px = CAFE_DOOR_X;
    c.translate(px, -110);
    c.transform(1, 0, Math.sin(t * 1.1 + ph * 3) * 0.16 * e, 1, 0, 0);
    c.scale(1 - 0.62 * e, 1 + 0.1 * e * Math.sin(ph * 5 + t * 0.8));
    c.translate(-px, 110);
    c.globalAlpha *= sceneA;
    fn(c);
    c.restore();
  };
  const tt = trafficTime(t, d);

  // ---- sky and the far city ------------------------------------------------
  const day = ['#86b4e2', '#cfe0e6', '#f7e6bf'];
  const dusk = ['#1a0f08', '#2a1608', '#4a2810'];
  T.sky(R, day.map((c0, i) => [[0, 0.5, 0.8][i], mh(c0, dusk[i], smooth(0.2, 0.95, d))]), { sun: [0.16, lerp(0.22, 0.5, d)], warmth: d, clouds: 0.5 * (1 - smooth(0.2, 0.7, d)) });
  if (d < 0.9) {
    horizon(R, { haze: rgbOf(mh('#f7e6bf', '#4a2810', smooth(0.2, 0.95, d))), shade: mixc([150, 150, 150], [26, 14, 8], smooth(0.1, 0.9, d)), cloud: mixc([255, 252, 244], [60, 34, 16], d), span: 4000, seed: 12, t, lite: g.settings?.get?.('quality') === 'low' });
    T.skyline(R, { depth: 0.3, y: 40, color: mh('#c9bfa6', '#1e1008', smooth(0.1, 0.9, d)), seed: 14, haze: [mh('#f1e3c2', '#4a2810', d), 0.22], x0: CC * 0.3 - 1800, x1: CC * 0.3 + 1800, minarets: [CC * 0.3 - 500, CC * 0.3 + 380] });
  }

  // ---- the ground: pavement, a striped kerb, the road ----------------------------
  const x0 = cx - 1800;
  const x1 = cx + 1800;
  R.paint(
    wp((c) => {
      const px0 = d > 0.02 ? CC - 2600 : x0;
      const px1 = d > 0.02 ? CC + 2600 : x1;
      c.fillStyle = '#c8b690';
      c.fillRect(px0, -4, px1 - px0, 8);
      c.fillStyle = 'rgba(70,50,30,0.3)';
      for (let x = Math.floor(px0 / 52) * 52; x < px1; x += 52) c.fillRect(x, -4, 1.4, 8);
      // the kerb painted black and white, as every Damascus kerb is
      for (let x = Math.floor(px0 / 40) * 40; x < px1; x += 40) {
        c.fillStyle = (x / 40) % 2 ? '#2a2826' : '#ece6d4';
        c.fillRect(x, 3, 40, 5);
      }
      c.fillStyle = 'rgba(255,250,235,0.35)';
      c.fillRect(px0, 3, px1 - px0, 1.2);
      c.fillStyle = '#5c5a58';
      c.fillRect(px0, 8, px1 - px0, 500);
      const rd = c.createLinearGradient(0, 8, 0, 90);
      rd.addColorStop(0, 'rgba(0,0,0,0.2)');
      rd.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rd;
      c.fillRect(px0, 8, px1 - px0, 82);
      c.fillStyle = 'rgba(240,232,200,0.5)';
      for (let x = Math.floor(px0 / 120) * 120; x < px1; x += 120) c.fillRect(x, 56, 64, 3);
    }, 0.1),
  );
  if (d < 0.2) R.surface((c) => c.rect(Math.max(x0, CC - 2000), 8, 3600, 500), 'asphalt', { scale: 1.1, seed: 2, alpha: 0.35 * (1 - d / 0.2) });

  // ---- the university behind its railings ------------------------------------------
  if (near(CC - 1400, CC - 700)) facultyBehind(R, wp, cx, t);

  // ---- the shops, and the cafeteria ---------------------------------------------------
  SHOPS.forEach((s, i) => {
    const x = shopX(i);
    if (!near(x, x + s.w)) return;
    const F = shopFace(s, i);
    const SH = SHOP_GF + s.floors * SHOP_FL + 30;
    R.paint(wp((c) => c.drawImage(F, x - 24, -SH, s.w + 48, SH + 30), i * 0.37));
    // the awning's fringe, stirring
    if (s.awn) {
      R.cast(
        wp((c) => {
          const aw = s.w - 8;
          for (let k = 0; k < 12; k++) {
            const sx0 = x + 4 + (k * aw) / 12;
            const sw = A.windAt(t, sx0, k * 0.6 + i) * 2.6 + Math.sin(t * 2.6 + k * 1.7 + i) * 1.2;
            c.fillStyle = k % 2 ? s.awn[1] : s.awn[0];
            c.beginPath();
            c.moveTo(sx0, -160);
            c.lineTo(sx0 + aw / 12, -160);
            c.lineTo(sx0 + aw / 24 + sw, -149 + Math.abs(sw) * 0.3);
            c.closePath();
            c.fill();
          }
        }, i * 0.37),
      );
    }
  });
  if (near(CAFE.x, CAFE.x + CAFE.w)) {
    const Cf = cafeFace();
    R.paint(wp((c) => c.drawImage(Cf, CAFE.x - 30, -CAFE_H, CAFE.w + 60, CAFE_H + 40), 2.2));
    // the awning's fringe, stirring
    R.cast(
      wp((c) => {
        const n = 26;
        for (let k = 0; k < n; k++) {
          const sx0 = CAFE.x - 6 + (k * (CAFE.w + 12)) / n;
          const sw = A.windAt(t, sx0, k * 0.5) * 2.4 + Math.sin(t * 2.5 + k * 1.3) * 1.1;
          c.fillStyle = k % 2 ? '#f3e6c8' : '#2e7d4a';
          c.beginPath();
          c.moveTo(sx0, -178);
          c.lineTo(sx0 + (CAFE.w + 12) / n, -178);
          c.lineTo(sx0 + (CAFE.w + 12) / (2 * n) + sw, -168 + Math.abs(sw) * 0.3);
          c.closePath();
          c.fill();
        }
      }, 2.2),
    );
    // a lit doorway and the window, warm
    R.glow(
      wp((c) => {
        const dgl = c.createRadialGradient(CAFE_DOOR_X, -80, 0, CAFE_DOOR_X, -80, 150);
        dgl.addColorStop(0, `rgba(255,200,120,${0.3 * (1 - e * 0.4)})`);
        dgl.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = dgl;
        c.fillRect(CAFE_DOOR_X - 160, -230, 320, 240);
        const cg = c.createRadialGradient(CAFE.x + 150, -90, 0, CAFE.x + 150, -90, 170);
        cg.addColorStop(0, 'rgba(255,200,120,0.18)');
        cg.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = cg;
        c.fillRect(CAFE.x - 40, -200, 380, 220);
      }, 2.2),
    );
  }

  // ---- lamps, the gate -----------------------------------------------------------
  const lamps = [CC - 880, CC - 370, CC + 120, CC + 600];
  R.cast(wp((c) => { for (const lx of lamps) if (near(lx - 80, lx + 80)) lampPost(c, lx); }, 0.7));
  if (near(CC - 1300, CC - 700)) uniGate(R, wp);

  // ---- the falafel cart and the jasmine rack ------------------------------------------------
  if (near(CART_X - 100, CART_X + 200)) falafelCart(R, CART_X, t, wp);
  if (near(RACK_X - 50, RACK_X + 200)) jasmineRack(R, RACK_X, t, wp);

  // ---- the cafeteria's outdoor tables, plastic chairs ---------------------------------------------
  if (near(CAFE.x, CAFE.x + 320)) {
    R.cast(
      wp((c) => {
        for (const tx of [CAFE.x + 24, CAFE.x + 128]) {
          c.fillStyle = '#e8e8e4';
          c.fillRect(tx, -64, 54, 4);
          c.fillRect(tx + 26, -60, 3, 60);
          c.fillRect(tx + 12, -3, 30, 3);
          c.fillStyle = 'rgba(0,0,0,0.15)';
          c.fillRect(tx, -61, 54, 1.4);
          // a glass of tea and a Nescafé mug on it
          c.fillStyle = 'rgba(210,225,230,0.6)';
          c.fillRect(tx + 8, -75, 7, 11);
          c.fillStyle = 'rgba(140,70,26,0.85)';
          c.fillRect(tx + 8.5, -70, 6, 6);
          c.fillStyle = '#b02a22';
          c.fillRect(tx + 36, -74, 9, 10);
          for (const chx of [tx - 24, tx + 62]) {
            c.fillStyle = '#d8d6d0';
            c.fillRect(chx, -40, 22, 3);
            c.fillRect(chx + (chx < tx ? 0 : 19), -78, 3, 40);
            c.fillRect(chx + 3, -37, 2, 37);
            c.fillRect(chx + 17, -37, 2, 37);
          }
        }
      }, 3.1),
    );
  }

  // ---- the orange trees, on the pavement in front of the shops -------------------------------
  [CC - 505, CC - 22, CC + 468].forEach((tx, i) => {
    if (!near(tx - 200, tx + 200)) return;
    const cv = orangeTree(i + 1);
    R.cast(wp((c) => {
      c.save();
      A.lean(c, tx, -150, t, i * 1.7 + 0.4, 0.028); // the crown moves on its trunk
      c.drawImage(cv, tx - 120, -266, 240, 272);
      c.restore();
    }, i + 0.5));
    R.shadow(
      (c) => {
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(tx - 6, -120, 12, 120);
        c.beginPath();
        c.ellipse(tx, -184, 85, 53, 0, 0, TAU);
        c.fill();
      },
      tx,
      0,
      -0.9,
      0.2,
    );
  });
  campusLife(R, t, near, d, cx);
  g.act?.drawProps?.(R, g);

  // ---- people (rigs) -----------------------------------------------------------------------------------------
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast(wp((c) => w.draw(c), (w.x * 0.003) % 6));
    if (d < 0.6) R.shadow((c) => w.draw(c), w.x, w.y, -0.9, 0.12);
  }
  // ---- traffic, in the road in front of the pavement: nearer than the people, so drawn after them ----------------------------------------------------
  for (const v of trafficAt(tt)) {
    if (!near(v.x - 200, v.x + 200)) continue;
    R.cast(wp((c) => { c.save(); c.translate(v.x, v.y); c.scale(1.45, 1.45); vehicle(c, 0, 0, v.dir, v, tt); c.restore(); }, v.x * 0.01));
    if (d < 0.5) R.shadow((c) => {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(v.x - 130, v.y - (v.kind === 'van' ? 160 : 135), 260, v.kind === 'van' ? 160 : 135);
    }, v.x, v.y, -0.9, 0.14);
  }

  g.effects?.draw?.(R);

  // ---- light and air --------------------------------------------------------------------------------------
  if (d < 0.5) T.motes(R, cx, t, 1 - d * 2);
  R.glow((c) => {
    // sun flare in the haze from the upper left
    const gl = c.createRadialGradient(cx - 560, -330, 0, cx - 560, -330, 700);
    gl.addColorStop(0, `rgba(255,236,190,${0.18 * (1 - d)})`);
    gl.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = gl;
    c.fillRect(cx - 1300, -700, 2600, 800);
    // amber dust: it rises out of the street and turns, until it is all there is
    if (dust > 0.01) {
      const r = rng(81);
      for (let i = 0; i < 230; i++) {
        const bx = CAFE_DOOR_X + (r() - 0.5) * 2400 * (1 - 0.45 * e);
        const by = -r() * 420 + 40;
        const sp = 6 + r() * 26;
        const px = bx + Math.sin(t * 0.5 + i) * 24 + (t * sp * 0.4) % 80 * 0 - dust * 30 * Math.sin(i);
        const py = by - ((t * sp * (0.3 + dust)) % 160);
        const a = (0.1 + r() * 0.4) * dust * (0.55 + 0.45 * Math.sin(t * 1.7 + i * 0.9));
        const s = 1.4 + r() * 3.6;
        c.fillStyle = `rgba(255,${150 + r() * 60 | 0},${60 + r() * 50 | 0},${a})`;
        c.fillRect(px, py, s, s);
      }
      // the heart of it: a warm bloom where the door was
      const hg = c.createRadialGradient(CAFE_DOOR_X, -90, 0, CAFE_DOOR_X, -90, 260);
      hg.addColorStop(0, `rgba(255,170,80,${0.32 * dust * (1 - 0.5 * d)})`);
      hg.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = hg;
      c.fillRect(CAFE_DOOR_X - 300, -360, 600, 440);
    }
  });
}

// ===================================================================
// 4. UM AHMAD'S FLAT
// ===================================================================
// A second-floor flat in the northern quarter, 5:40 pm. Neat to the point of
// ritual: swept floor, mended curtains, shoes in a row. A sewing machine on
// a table; a wind-up clock; and one west window through which the last deep
// gold light crosses the wall, slowly, towards a photograph of her son.

const UC = UM_AHMAD[0];
export const UM_DOOR_X = UC - 300; // the doorway, left; he steps in just to its right
export const SEWING_X = UC + 112; // where she sits, facing the machine on her left
const ROOM = { x0: UC - 440, x1: UC + 440, ceil: -304 };
const WIN = { x: UC + 196, y: -268, w: 112, h: 186 }; // the west window
const PHOTO = { x: UC - 128, y: -226, w: 60, h: 78 }; // Ahmad, framed
const TABLE = { x0: SEWING_X - 124, x1: SEWING_X - 26, top: -72 };

export function umAhmadLook(g, light = 0) {
  const l = clamp(light);
  const gold = mixc([1.0, 0.76, 0.4], [1.0, 0.56, 0.24], l);
  const px = lerp(WIN.x + WIN.w / 2 - 10, PHOTO.x + PHOTO.w / 2, l);
  const lights = [
    // the sun through the west window: low, deep gold, from the right
    { uv: [1.45, lerp(0.2, 0.34, l)], color: gold, intensity: 0.95, radius: 0, project: 1.0, soft: 0.003, rim: 0.8 },
    // the window itself spills warm light on the room
    { x: WIN.x + WIN.w / 2, y: -170, color: gold, intensity: 0.75, radius: 0.6, rim: 0.4 },
    // and the patch of sun on the wall lights what it touches
    { x: px, y: -170, color: [1.0, 0.7, 0.36], intensity: 0.35 + 0.5 * smooth(0.55, 1, l), radius: 0.28, rim: 0.4 },
  ];
  return {
    ambient: [0.15, 0.125, 0.13],
    lights,
    groundShadow: 0.7,
    god: { uv: [1.45, 0.2], strength: 0.18 },
    bloom: lerp(0.7, 0.95, l),
    exposure: 0.92,
    grain: 0.05,
    grade: { sat: 0.88, contrast: 1.1, lift: 0.004, tint: [1.05, 0.98, 0.9], shadows: [0.94, 0.9, 1.04], highs: [1.1, 1.0, 0.82] },
    fog: { density: 0.035, height: 240, color: [0.9, 0.66, 0.4] },
    time: g.time,
  };
}

// the shirt eases in when the story calls for it
const SHIRT = { t: -1, k: 0 };
function shirtEase(t, target) {
  const dt = SHIRT.t < 0 || t < SHIRT.t || t - SHIRT.t > 1 ? 1 : t - SHIRT.t;
  SHIRT.t = t;
  SHIRT.k += clamp(target - SHIRT.k, -dt / 1.4, dt / 1.4);
  return smooth(0, 1, SHIRT.k);
}

// the portrait: a sepia photograph of a young man in a graduation gown, his
// face a few soft strokes and a smile
function photoCanvas() {
  return bake('um-photo', PHOTO.w, PHOTO.h, 3.6, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#c7ae8a');
    bg.addColorStop(1, '#9d845f');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    const vg = c.createRadialGradient(w / 2, h * 0.4, w * 0.2, w / 2, h * 0.5, w * 0.85);
    vg.addColorStop(0, 'rgba(255,240,210,0.25)');
    vg.addColorStop(1, 'rgba(40,24,10,0.5)');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
    // the gown: dark, wide shoulders, a pale shirt collar and a tie
    c.fillStyle = '#26211c';
    c.beginPath();
    c.moveTo(2, h);
    c.lineTo(5, h * 0.8);
    c.quadraticCurveTo(w * 0.22, h * 0.66, w * 0.38, h * 0.64);
    c.lineTo(w * 0.62, h * 0.64);
    c.quadraticCurveTo(w * 0.78, h * 0.66, w - 5, h * 0.8);
    c.lineTo(w - 2, h);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8dcc4';
    c.beginPath();
    c.moveTo(w * 0.4, h * 0.64);
    c.lineTo(w * 0.5, h * 0.78);
    c.lineTo(w * 0.6, h * 0.64);
    c.closePath();
    c.fill();
    c.fillStyle = '#5a3228';
    c.beginPath();
    c.moveTo(w * 0.48, h * 0.7);
    c.lineTo(w * 0.52, h * 0.7);
    c.lineTo(w * 0.53, h * 0.9);
    c.lineTo(w * 0.5, h * 0.94);
    c.lineTo(w * 0.47, h * 0.9);
    c.closePath();
    c.fill();
    // the neck and the face: an oval, warm, lit from the left
    c.fillStyle = '#d6b090';
    c.fillRect(w * 0.43, h * 0.54, w * 0.14, h * 0.12);
    const fg = c.createRadialGradient(w * 0.46, h * 0.38, 2, w * 0.5, h * 0.4, w * 0.3);
    fg.addColorStop(0, '#ecc9a4');
    fg.addColorStop(1, '#c79c78');
    c.fillStyle = fg;
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.4, w * 0.2, h * 0.19, 0, 0, TAU);
    c.fill();
    // hair, dark and thick
    c.fillStyle = '#1e1712';
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.27, w * 0.22, h * 0.12, 0, Math.PI, 0);
    c.lineTo(w * 0.7, h * 0.34);
    c.quadraticCurveTo(w * 0.68, h * 0.25, w * 0.5, h * 0.24);
    c.quadraticCurveTo(w * 0.34, h * 0.26, w * 0.3, h * 0.34);
    c.closePath();
    c.fill();
    // the mortarboard: a black flat board seen edge-on, a tassel
    c.fillStyle = '#16120f';
    c.beginPath();
    c.moveTo(w * 0.12, h * 0.2);
    c.lineTo(w * 0.88, h * 0.18);
    c.lineTo(w * 0.8, h * 0.13);
    c.lineTo(w * 0.2, h * 0.14);
    c.closePath();
    c.fill();
    c.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.06);
    c.strokeStyle = '#c8a24a';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.15);
    c.lineTo(w * 0.84, h * 0.16);
    c.lineTo(w * 0.84, h * 0.3);
    c.stroke();
    c.fillStyle = '#c8a24a';
    c.fillRect(w * 0.825, h * 0.3, 2.6, h * 0.06);
    // eyes (soft, crinkled with the smile), brows, a nose line, the smile
    c.fillStyle = '#2a1c14';
    for (const ex of [0.4, 0.6]) {
      c.beginPath();
      c.ellipse(w * ex, h * 0.385, 1.8, 1.2, 0, 0, TAU);
      c.fill();
    }
    c.strokeStyle = '#3a2418';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(w * 0.35, h * 0.35);
    c.quadraticCurveTo(w * 0.4, h * 0.335, w * 0.45, h * 0.35);
    c.moveTo(w * 0.55, h * 0.35);
    c.quadraticCurveTo(w * 0.6, h * 0.335, w * 0.65, h * 0.35);
    c.stroke();
    c.strokeStyle = 'rgba(120,80,56,0.7)';
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.38);
    c.quadraticCurveTo(w * 0.52, h * 0.44, w * 0.49, h * 0.455);
    c.stroke();
    // a small smile, the mouth closed, the way people stood for these
    c.strokeStyle = 'rgba(112,62,44,0.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(w * 0.44, h * 0.49);
    c.quadraticCurveTo(w * 0.5, h * 0.512, w * 0.56, h * 0.488);
    c.stroke();
    // the cheek and jaw in shadow on the right
    c.fillStyle = 'rgba(90,56,36,0.18)';
    c.beginPath();
    c.ellipse(w * 0.6, h * 0.44, w * 0.08, h * 0.12, 0.2, 0, TAU);
    c.fill();
    // the whole print gone to sepia
    c.save();
    c.globalCompositeOperation = 'color';
    c.fillStyle = 'rgba(150,112,72,0.6)';
    c.fillRect(0, 0, w, h);
    c.restore();
    // age: the print's faded fold and a stain at one corner
    c.fillStyle = 'rgba(255,240,210,0.1)';
    c.fillRect(0, h * 0.5, w, 1);
    c.fillStyle = 'rgba(80,50,20,0.15)';
    c.beginPath();
    c.arc(w - 2, h - 2, 9, 0, TAU);
    c.fill();
  });
}

// a mended curtain panel: lace-cream cloth, patches stitched in, a darned hem
function curtain(c, x0, x1, top, bot, sway, seed) {
  const r = rng(seed);
  const w = x1 - x0;
  c.save();
  c.beginPath();
  c.moveTo(x0, top);
  c.lineTo(x1, top);
  c.lineTo(x1 + sway, bot);
  c.lineTo(x0 + sway * 0.4, bot);
  c.closePath();
  c.clip();
  const cg = c.createLinearGradient(x0, 0, x1, 0);
  cg.addColorStop(0, '#e6dcc2');
  cg.addColorStop(0.5, '#f1e9d3');
  cg.addColorStop(1, '#ddd2b6');
  c.fillStyle = cg;
  c.fillRect(x0 - 10, top, w + 30, bot - top);
  // folds
  c.fillStyle = 'rgba(100,80,50,0.1)';
  for (let x = x0 + 5; x < x1; x += 9 + r() * 4) c.fillRect(x, top, 2.5, bot - top);
  // patches stitched on, slightly the wrong white, with running stitches
  for (let i = 0; i < 4; i++) {
    const px = x0 + 4 + r() * (w - 22);
    const py = top + 20 + r() * (bot - top - 60);
    const pw = 14 + r() * 8;
    const ph = 12 + r() * 8;
    c.fillStyle = ['#f6f1e2', '#d8ceb0', '#efe6cf', '#cfc4a6'][i % 4];
    c.fillRect(px, py, pw, ph);
    c.strokeStyle = 'rgba(90,70,50,0.55)';
    c.lineWidth = 0.8;
    c.setLineDash([2, 1.6]);
    c.strokeRect(px + 1.2, py + 1.2, pw - 2.4, ph - 2.4);
    c.setLineDash([]);
  }
  // the hem, a darned line along the bottom
  c.fillStyle = 'rgba(100,80,50,0.18)';
  c.fillRect(x0 - 10, bot - 14, w + 30, 14);
  c.strokeStyle = 'rgba(90,70,50,0.6)';
  c.lineWidth = 0.8;
  c.setLineDash([3, 2]);
  c.beginPath();
  c.moveTo(x0, bot - 8);
  c.lineTo(x1 + sway, bot - 8);
  c.stroke();
  c.setLineDash([]);
  c.restore();
}

function sewingMachine(c, x, y) {
  // x, y: the machine's base centre on the table top. Head faces left.
  c.save();
  c.translate(x, y);
  const blk = '#1d1b1c';
  const gold = '#c8a24a';
  // the base plate and the pillar
  extrudeRect(c, -48, -8, 100, 8, 14, { color: '#2a2728' });
  c.fillStyle = '#2a2728';
  c.fillRect(-48, -8, 100, 8);
  c.fillStyle = blk;
  c.beginPath();
  c.moveTo(24, -8);
  c.lineTo(24, -58);
  c.quadraticCurveTo(26, -76, 6, -76);
  c.lineTo(-52, -76);
  c.quadraticCurveTo(-60, -76, -60, -66);
  c.lineTo(-60, -52);
  c.lineTo(-44, -52);
  c.lineTo(-44, -60);
  c.lineTo(-6, -60);
  c.lineTo(-6, -8);
  c.closePath();
  c.fill();
  // the arm's top, lit
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(-50, -76, 56, 2);
  // the needle bar, the presser foot and the needle
  c.fillStyle = '#9a9ea2';
  c.fillRect(-52, -52, 4, 38);
  c.fillRect(-56, -22, 12, 4);
  c.fillStyle = '#c8ccd0';
  c.fillRect(-49.8, -14, 0.8, 14);
  // gold decals along the arm
  c.fillStyle = gold;
  c.fillRect(-34, -70, 36, 2);
  c.fillRect(-30, -66, 24, 1.2);
  c.beginPath();
  c.arc(-18, -64, 2.4, 0, TAU);
  c.fill();
  // the spool pin with a reel of white thread on top
  c.fillStyle = '#9a9ea2';
  c.fillRect(-2, -92, 2, 16);
  c.fillStyle = '#efe9d8';
  c.fillRect(-7, -98, 12, 14);
  c.fillStyle = '#b8b0a0';
  c.fillRect(-8, -99, 14, 2);
  c.fillRect(-8, -86, 14, 2);
  // the thread running down through the guides to the needle
  c.strokeStyle = 'rgba(244,240,226,0.9)';
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(-4, -98);
  c.lineTo(-28, -77);
  c.lineTo(-44, -66);
  c.lineTo(-49, -52);
  c.lineTo(-49, -16);
  c.stroke();
  // the hand wheel, at the operator's end
  c.fillStyle = blk;
  c.beginPath();
  c.arc(32, -50, 21, 0, TAU);
  c.fill();
  c.strokeStyle = '#6a6a6c';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(32, -50, 16, 0, TAU);
  c.stroke();
  c.fillStyle = '#9a9ea2';
  c.beginPath();
  c.arc(32, -50, 5, 0, TAU);
  c.fill();
  c.fillStyle = gold;
  c.fillRect(30, -66, 4, 3);
  // a bobbin cover on the bed, a drawer front
  c.fillStyle = '#3a3638';
  c.fillRect(-44, -8, 36, 5);
  c.restore();
}

export function drawUmAhmad(R, g, { t = g.time, light = 0, shirt = 0 } = {}) {
  const l = clamp(light);
  const cx = R.cam.x;
  const { x0, x1, ceil } = ROOM;
  const sh = shirtEase(t, shirt);

  // ---- the shell: wall, dado, ceiling, floor ------------------------------
  R.paint((c) => {
    const wl = c.createLinearGradient(0, ceil, 0, 0);
    wl.addColorStop(0, '#b3a888');
    wl.addColorStop(1, '#c0b595');
    c.fillStyle = wl;
    c.fillRect(x0, ceil - 20, x1 - x0, -ceil + 60);
    // a painted dado, the colour of old mint, ruled with a pale line
    c.fillStyle = '#9fb09a';
    c.fillRect(x0, -96, x1 - x0, 96);
    c.fillStyle = '#b8c6b2';
    c.fillRect(x0, -98, x1 - x0, 3);
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(x0, -95, x1 - x0, 2);
    // the cornice
    c.fillStyle = '#e0d8c0';
    c.fillRect(x0, ceil - 20, x1 - x0, 20);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x0, ceil - 2, x1 - x0, 2);
    // the floor: swept tiles, a skirting board
    c.fillStyle = '#a99a7c';
    c.fillRect(x0, 0, x1 - x0, 80);
    c.fillStyle = '#74634a';
    c.fillRect(x0, -9, x1 - x0, 9);
    c.fillStyle = 'rgba(255,250,235,0.18)';
    c.fillRect(x0, -9, x1 - x0, 1.4);
    for (let x = x0; x < x1; x += 46) {
      c.fillStyle = 'rgba(60,44,26,0.28)';
      c.fillRect(x, 0, 1.4, 80);
      for (let y = 0; y < 80; y += 20) {
        const q = Math.sin(x * 12.9 + y * 78.2);
        c.fillStyle = q > 0 ? 'rgba(255,240,210,0.06)' : 'rgba(40,24,10,0.06)';
        c.fillRect(x + 1, y + 1, 44, 19);
      }
    }
    c.fillStyle = 'rgba(60,44,26,0.28)';
    for (let y = 18; y < 80; y += 20) c.fillRect(x0, y, x1 - x0, 1);
  });
  R.surface((c) => c.rect(x0, ceil - 20, x1 - x0, -ceil + 20 - 98), 'plaster', { scale: 1.4, seed: 8, alpha: 0.35 });

  // ---- the west window: the day outside, shutters back, curtains tied -------
  const W = WIN;
  R.paint((c) => {
    // the sky beyond: deep gold fading up into dusk, the sun low in it
    const sk = c.createLinearGradient(0, W.y, 0, W.y + W.h);
    sk.addColorStop(0, '#d9a066');
    sk.addColorStop(0.6, '#f4b866');
    sk.addColorStop(1, '#f9cf8a');
    c.fillStyle = sk;
    c.fillRect(W.x, W.y, W.w, W.h);
    c.save();
    c.beginPath();
    c.rect(W.x, W.y, W.w, W.h);
    c.clip();
    // roofs, a minaret, a water tank, black against the sun
    c.fillStyle = '#6a4a3a';
    c.fillRect(W.x, W.y + W.h - 46, W.w, 46);
    c.fillRect(W.x + 8, W.y + W.h - 62, 36, 18);
    c.fillRect(W.x + 70, W.y + W.h - 58, 26, 14);
    T.minaret(c, W.x + 92, W.y + W.h - 40, 0.5, '#6a4a3a', false);
    c.restore();
    // the frame, weathered white-painted wood; a deep sill with a pot of basil
    c.strokeStyle = '#d8d0bc';
    c.lineWidth = 7;
    c.strokeRect(W.x, W.y, W.w, W.h);
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(W.x + W.w / 2, W.y);
    c.lineTo(W.x + W.w / 2, W.y + W.h);
    c.moveTo(W.x, W.y + 64);
    c.lineTo(W.x + W.w, W.y + 64);
    c.moveTo(W.x, W.y + 126);
    c.lineTo(W.x + W.w, W.y + 126);
    c.stroke();
    c.fillStyle = '#cfc6ae';
    c.fillRect(W.x - 10, W.y + W.h, W.w + 20, 8);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(W.x - 10, W.y + W.h + 6, W.w + 20, 2);
    c.fillStyle = '#a0603a';
    c.fillRect(W.x + 14, W.y + W.h - 18, 18, 18);
    c.fillStyle = '#3f7a2e';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(W.x + 23 + (i - 3) * 3.4, W.y + W.h - 24 - (i % 3) * 3, 3.6, 5.5, (i - 3) * 0.25, 0, TAU);
      c.fill();
    }
  });
  // the window's own light, burning gold
  R.glow((c) => {
    const gl = c.createLinearGradient(0, W.y, 0, W.y + W.h);
    gl.addColorStop(0, `rgba(255,${lerp(190, 150, l) | 0},90,0.45)`);
    gl.addColorStop(1, `rgba(255,${lerp(220, 170, l) | 0},120,0.55)`);
    c.fillStyle = gl;
    c.fillRect(W.x, W.y, W.w, W.h);
    const sg = c.createRadialGradient(W.x + W.w * 0.72, W.y + W.h - 70, 0, W.x + W.w * 0.72, W.y + W.h - 70, 70);
    sg.addColorStop(0, 'rgba(255,240,200,0.8)');
    sg.addColorStop(0.3, 'rgba(255,200,120,0.35)');
    sg.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = sg;
    c.fillRect(W.x, W.y, W.w, W.h);
  });
  // curtains, tied back, one mended with a patch
  R.cast((c) => {
    curtain(c, W.x - 30, W.x + 8, W.y - 14, W.y + W.h + 6, -6 + Math.sin(t * 0.8) * 1.2, 41);
    curtain(c, W.x + W.w - 8, W.x + W.w + 30, W.y - 14, W.y + W.h + 6, 6 + Math.sin(t * 0.8 + 1) * 1.2, 42);
    // the rod, and the tie-backs
    c.fillStyle = '#5a4a38';
    c.fillRect(W.x - 40, W.y - 18, W.w + 80, 4);
    c.beginPath();
    c.arc(W.x - 40, W.y - 16, 4, 0, TAU);
    c.arc(W.x + W.w + 40, W.y - 16, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#a89868';
    c.fillRect(W.x - 30, W.y + 90, 40, 4);
    c.fillRect(W.x + W.w - 10, W.y + 90, 40, 4);
  });

  // ---- the gold light on the wall: the window's panes thrown left -----------
  const pcx = lerp(W.x + W.w * 0.5 - 24, PHOTO.x + PHOTO.w / 2, l);
  R.glow((c) => {
    const slope = 46; // the light comes in low: the panes lean
    const pw = 112;
    const top = -282;
    const bot = -62;
    const col = [255, lerp(196, 150, l), lerp(104, 66, l)];
    const a = 0.62 + 0.16 * l;
    const gl = c.createLinearGradient(pcx - pw / 2, 0, pcx + pw / 2, 0);
    gl.addColorStop(0, rgba(col, a * 0.75));
    gl.addColorStop(0.5, rgba(col, a));
    gl.addColorStop(1, rgba(col, a * 0.8));
    c.fillStyle = gl;
    // six panes with the mullions between them left dark
    for (let cc = 0; cc < 2; cc++) {
      for (let rr = 0; rr < 3; rr++) {
        const fx0 = cc * 0.5 + 0.02;
        const fx1 = cc * 0.5 + 0.48;
        const fy0 = [0, 0.34, 0.68][rr] + 0.015;
        const fy1 = [0.33, 0.67, 1][rr] - 0.01;
        const px = (fx, fy) => pcx - pw / 2 + fx * pw + (0.5 - fy) * slope;
        const py = (fy) => top + fy * (bot - top);
        c.beginPath();
        c.moveTo(px(fx0, fy0), py(fy0));
        c.lineTo(px(fx1, fy0), py(fy0));
        c.lineTo(px(fx1, fy1), py(fy1));
        c.lineTo(px(fx0, fy1), py(fy1));
        c.closePath();
        c.fill();
      }
    }
    // the haze round it, and dust turning slowly inside
    const hg = c.createRadialGradient(pcx, -170, 0, pcx, -170, 170);
    hg.addColorStop(0, rgba(col, 0.1));
    hg.addColorStop(1, rgba(col, 0));
    c.fillStyle = hg;
    c.fillRect(pcx - 190, -330, 380, 340);
    const r = rng(17);
    for (let i = 0; i < 26; i++) {
      const mx = pcx - pw / 2 + r() * pw + Math.sin(t * 0.4 + i) * 6;
      const my = top + ((r() * (bot - top) + t * (3 + r() * 4)) % (bot - top));
      c.fillStyle = `rgba(255,236,190,${0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + i))})`;
      c.fillRect(mx + (0.5 - (my - top) / (bot - top)) * slope, my, 1.6, 1.6);
    }
  });

  // ---- the door, left: an opening on to a dark stairwell ---------------------
  const dx = UM_DOOR_X;
  R.paint((c) => {
    c.fillStyle = '#10121a';
    c.fillRect(dx - 56, -214, 104, 214);
    // the stairwell beyond: cold grey, a banister and the landing's window
    const sg = c.createLinearGradient(dx - 56, 0, dx + 48, 0);
    sg.addColorStop(0, '#242a3a');
    sg.addColorStop(1, '#161a26');
    c.fillStyle = sg;
    c.fillRect(dx - 52, -208, 96, 208);
    c.fillStyle = '#3a4258';
    c.fillRect(dx - 40, -196, 32, 56);
    c.fillStyle = 'rgba(180,200,240,0.35)';
    c.fillRect(dx - 38, -194, 28, 52);
    c.strokeStyle = '#0c0e14';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(dx - 24, -194);
    c.lineTo(dx - 24, -142);
    c.moveTo(dx - 38, -168);
    c.lineTo(dx - 10, -168);
    c.stroke();
    // the stair rail going down to the left
    c.strokeStyle = '#06070c';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(dx - 52, -64);
    c.lineTo(dx + 44, -20);
    c.stroke();
    // the frame: worn painted wood, a stone threshold
    c.fillStyle = '#6a5038';
    c.fillRect(dx - 64, -224, 8, 224);
    c.fillRect(dx + 48, -224, 8, 224);
    c.fillRect(dx - 64, -224, 120, 10);
    c.fillStyle = '#b3a589';
    c.fillRect(dx - 66, -3, 124, 6);
  });
  R.glow((c) => {
    const fg = c.createLinearGradient(dx - 56, -214, dx + 48, 0);
    fg.addColorStop(0, 'rgba(110,140,210,0.18)');
    fg.addColorStop(1, 'rgba(110,140,210,0)');
    c.fillStyle = fg;
    c.fillRect(dx - 52, -208, 96, 208);
  });
  // the door leaf, swung back against the wall on the right of the opening
  R.cast((c) => {
    extrudeRect(c, dx + 56, -216, 9, 216, 10, { color: '#7a5a3a' });
    c.fillStyle = '#7a5a3a';
    c.fillRect(dx + 56, -216, 9, 216);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(dx + 60, -216, 3, 216);
    c.fillStyle = '#c8a24a';
    c.fillRect(dx + 57, -112, 3, 12);
  });
  // shoes in a row by the door, heels to the wall: a family of slippers, men's, a child's
  R.cast((c) => {
    const pairs = [[dx + 70, '#3a2a20', 26], [dx + 100, '#6a4a30', 24], [dx + 128, '#8a3a30', 16]];
    for (const [sx, col, len] of pairs) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(sx, 0);
      c.lineTo(sx, -9);
      c.quadraticCurveTo(sx + len * 0.4, -14, sx + len, -5);
      c.lineTo(sx + len, 0);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(sx + 4, -10, len * 0.5, 1.2);
      c.fillStyle = '#181412';
      c.fillRect(sx, -2, len, 2.4);
    }
  });

  // ---- a sideboard under the photograph, with the wind-up clock -------------
  const sbx0 = PHOTO.x - 40;
  const sbw = 164;
  R.cast((c) => {
    extrudeRect(c, sbx0, -88, sbw, 88, 22, { color: '#7a5030' });
    c.fillStyle = '#7a5030';
    c.fillRect(sbx0, -88, sbw, 88);
    c.fillStyle = '#6a4326';
    c.fillRect(sbx0 + 8, -80, sbw / 2 - 12, 72);
    c.fillRect(sbx0 + sbw / 2 + 4, -80, sbw / 2 - 12, 72);
    c.fillStyle = '#c8a24a';
    c.fillRect(sbx0 + sbw / 2 - 16, -48, 3, 8);
    c.fillRect(sbx0 + sbw / 2 + 12, -48, 3, 8);
    c.fillStyle = 'rgba(255,230,180,0.28)';
    c.fillRect(sbx0, -88, sbw, 2);
    // a crocheted white mat on top, edges exactly square
    c.fillStyle = '#f4efe0';
    c.fillRect(sbx0 + 10, -91, sbw - 20, 3);
    c.fillStyle = 'rgba(120,100,70,0.25)';
    for (let x = sbx0 + 12; x < sbx0 + sbw - 12; x += 4) c.fillRect(x, -89, 1.4, 1.4);
    // glasses in a row, bottoms aligned
    for (let i = 0; i < 5; i++) {
      c.fillStyle = 'rgba(215,230,235,0.6)';
      c.fillRect(sbx0 + sbw - 80 + i * 14, -108, 9, 17);
      c.fillStyle = '#c8a24a';
      c.fillRect(sbx0 + sbw - 80 + i * 14, -108, 9, 1.5);
    }
    // a vase of paper flowers
    c.fillStyle = '#3a6a8a';
    c.beginPath();
    c.moveTo(sbx0 + 24, -91);
    c.lineTo(sbx0 + 42, -91);
    c.lineTo(sbx0 + 39, -118);
    c.lineTo(sbx0 + 27, -118);
    c.closePath();
    c.fill();
    c.strokeStyle = '#3f7a2e';
    c.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(sbx0 + 33, -118);
      c.lineTo(sbx0 + 33 + (i - 2) * 6, -140 - (i % 2) * 6);
      c.stroke();
      c.fillStyle = ['#e8d8d0', '#d8605a', '#f0e8c8', '#c84a58', '#e8d8d0'][i];
      c.beginPath();
      c.arc(sbx0 + 33 + (i - 2) * 6, -142 - (i % 2) * 6, 4, 0, TAU);
      c.fill();
    }
  });
  // the wind-up alarm clock: twin bells, a cream face, a second hand that ticks
  R.cast((c) => {
    const kx = sbx0 + 100;
    const ky = -106;
    c.fillStyle = '#8a8a86';
    c.fillRect(kx - 10, -92, 3, 4);
    c.fillRect(kx + 7, -92, 3, 4);
    c.fillStyle = '#9a9a96';
    c.beginPath();
    c.arc(kx, ky, 16, 0, TAU);
    c.fill();
    c.fillStyle = '#f1ead6';
    c.beginPath();
    c.arc(kx, ky, 13.2, 0, TAU);
    c.fill();
    c.fillStyle = '#7a7a76';
    c.beginPath();
    c.arc(kx - 10, ky - 15, 6, Math.PI, 0);
    c.arc(kx + 10, ky - 15, 6, Math.PI, 0);
    c.fill();
    c.strokeStyle = '#2a2622';
    c.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.beginPath();
      c.moveTo(kx + Math.cos(a) * 10.4, ky + Math.sin(a) * 10.4);
      c.lineTo(kx + Math.cos(a) * 12.4, ky + Math.sin(a) * 12.4);
      c.stroke();
    }
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(kx, ky);
    c.lineTo(kx - 2.5, ky - 6.5); // a quarter to six, say
    c.moveTo(kx, ky);
    c.lineTo(kx + 5.5, ky + 6); 
    c.stroke();
    c.strokeStyle = '#b02a22';
    c.lineWidth = 0.7;
    const sa = Math.floor(t) * (TAU / 60) - Math.PI / 2;
    c.beginPath();
    c.moveTo(kx, ky);
    c.lineTo(kx + Math.cos(sa) * 11, ky + Math.sin(sa) * 11);
    c.stroke();
    c.fillStyle = '#2a2622';
    c.beginPath();
    c.arc(kx, ky, 1.3, 0, TAU);
    c.fill();
  });

  // ---- the photograph --------------------------------------------------------
  const P = PHOTO;
  R.cast((c) => {
    // a black wooden frame with a gold slip, a cream mount, a nail and a cord
    extrudeRect(c, P.x - 8, P.y - 8, P.w + 16, P.h + 16, 6, { color: '#241c16' });
    c.fillStyle = '#241c16';
    c.fillRect(P.x - 8, P.y - 8, P.w + 16, P.h + 16);
    c.fillStyle = '#c8a24a';
    c.fillRect(P.x - 4, P.y - 4, P.w + 8, P.h + 8);
    c.fillStyle = '#ece3cc';
    c.fillRect(P.x - 2.5, P.y - 2.5, P.w + 5, P.h + 5);
    c.strokeStyle = '#4a3a2a';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(P.x - 5, P.y - 8);
    c.lineTo(P.x + P.w / 2, P.y - 26);
    c.lineTo(P.x + P.w + 5, P.y - 8);
    c.stroke();
    c.fillStyle = '#6a6a6a';
    c.beginPath();
    c.arc(P.x + P.w / 2, P.y - 26, 1.8, 0, TAU);
    c.fill();
  });
  R.paint((c) => {
    c.drawImage(photoCanvas(), P.x, P.y, P.w, P.h);
  });
  // when the sun finds it: the glass lights, the frame gilds, a warm bloom
  const catch_ = smooth(0.78, 1, l);
  if (catch_ > 0.005) {
    R.glow((c) => {
      const gl = c.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h);
      gl.addColorStop(0, `rgba(255,214,140,${0.5 * catch_})`);
      gl.addColorStop(0.6, `rgba(255,190,110,${0.2 * catch_})`);
      gl.addColorStop(1, `rgba(255,170,90,${0.08 * catch_})`);
      c.fillStyle = gl;
      c.fillRect(P.x - 6, P.y - 6, P.w + 12, P.h + 12);
      // a glint sliding over the glass
      c.fillStyle = `rgba(255,248,226,${0.45 * catch_})`;
      c.beginPath();
      c.moveTo(P.x + 6, P.y);
      c.lineTo(P.x + 20, P.y);
      c.lineTo(P.x + 2, P.y + P.h * 0.5);
      c.lineTo(P.x, P.y + P.h * 0.5);
      c.closePath();
      c.fill();
      const bg = c.createRadialGradient(P.x + P.w / 2, P.y + P.h / 2, 0, P.x + P.w / 2, P.y + P.h / 2, 120);
      bg.addColorStop(0, `rgba(255,190,110,${0.28 * catch_})`);
      bg.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = bg;
      c.fillRect(P.x - 130, P.y - 110, P.w + 260, P.h + 220);
    });
  }
  // a framed verse over the machine, small, in gold on black
  R.cast((c) => {
    const vx = TABLE.x0 + 14;
    const vy = -236;
    c.fillStyle = '#241c16';
    c.fillRect(vx, vy, 74, 40);
    c.fillStyle = '#111';
    c.fillRect(vx + 3, vy + 3, 68, 34);
    c.fillStyle = '#d8b64a';
    c.font = `20px ${RUQAA}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('ما شاء الله', vx + 37, vy + 27);
  });

  // ---- the table, the machine and the fabric ----------------------------------
  const T0 = TABLE;
  R.cast((c) => {
    // a rug, first: the pattern square, the fringe combed
    // (drawn flat on the floor as a thin band in front)
    c.fillStyle = '#8a3a30';
    c.fillRect(UC - 230, 4, 360, 8);
    c.fillStyle = '#c8a24a';
    for (let x = UC - 224; x < UC + 124; x += 22) c.fillRect(x, 6, 10, 3);
    c.fillStyle = '#e8dcc0';
    for (let x = UC - 230; x < UC + 130; x += 3) c.fillRect(x, 12, 1, 3);
    // the table: a plain wooden table with turned legs, a drawer
    const tw = T0.x1 - T0.x0;
    extrudeRect(c, T0.x0, T0.top, tw, 7, 26, { color: '#8a5a32', topK: 1.2, sideK: 0.58 });
    c.fillStyle = '#8a5a32';
    c.fillRect(T0.x0, T0.top, tw, 7);
    c.fillStyle = 'rgba(255,230,180,0.3)';
    c.fillRect(T0.x0, T0.top, tw, 1.6);
    c.fillStyle = '#74492a';
    c.fillRect(T0.x0 + 6, T0.top + 7, tw - 12, 14);
    c.fillStyle = '#c8a24a';
    c.fillRect(T0.x0 + tw / 2 - 5, T0.top + 12, 10, 3);
    c.fillStyle = '#6a4326';
    for (const lx of [T0.x0 + 8, T0.x1 - 14]) {
      c.fillRect(lx, T0.top + 7, 6, -T0.top - 7);
      c.fillStyle = '#7a5030';
      c.fillRect(lx - 1.5, T0.top + 40, 9, 5);
      c.fillStyle = '#6a4326';
    }
    // her chair, back to the right
    c.save();
    c.translate(SEWING_X, 0);
    c.scale(-1, 1);
    chair(c, 0, 0);
    c.restore();
    sewingMachine(c, T0.x0 + 56, T0.top);
    // a stack of folded fabric at the far end: even edges, pale to deep
    const fx = T0.x0 + 2;
    const cols = ['#f1ecdd', '#c9d4d8', '#e6d4b4', '#9ab2ae', '#d7c0c0', '#f4f0e6'];
    cols.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(fx, T0.top - 6 - i * 5.2, 36, 5.2);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(fx, T0.top - 6 - i * 5.2 + 4.2, 36, 1);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(fx, T0.top - 6 - i * 5.2, 36, 0.9);
    });
    // pincushion, scissors, a yellow tape measure, spools
    c.fillStyle = '#b8403a';
    c.beginPath();
    c.ellipse(T0.x1 - 14, T0.top - 4, 8, 4.4, 0, Math.PI, 0);
    c.fill();
    c.strokeStyle = '#e8e4dc';
    c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(T0.x1 - 18 + i * 3, T0.top - 5);
      c.lineTo(T0.x1 - 20 + i * 4, T0.top - 11);
      c.stroke();
    }
    c.strokeStyle = '#2a2a2a';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(T0.x0 + 44, T0.top - 1);
    c.lineTo(T0.x0 + 56, T0.top - 8);
    c.moveTo(T0.x0 + 46, T0.top - 8);
    c.lineTo(T0.x0 + 56, T0.top - 1);
    c.stroke();
    c.fillStyle = '#e8c030';
    c.fillRect(T0.x1 - 38, T0.top - 3, 14, 3);
    for (const [sx, col] of [[T0.x1 - 52, '#e8e0d0'], [T0.x1 - 46, '#4a6a8a']]) {
      c.fillStyle = col;
      c.fillRect(sx, T0.top - 9, 5, 9);
      c.fillStyle = '#a89868';
      c.fillRect(sx - 0.5, T0.top - 9, 6, 1.2);
      c.fillRect(sx - 0.5, T0.top - 1.2, 6, 1.2);
    }
    // the shirt, half-cut: flat on the table, chalk lines and pins
    if (sh > 0.01) {
      c.save();
      c.globalAlpha = sh;
      const sx0 = T0.x0 + 40;
      c.fillStyle = '#f7f4ea';
      c.beginPath();
      c.moveTo(sx0, T0.top);
      c.lineTo(sx0 + 4, T0.top - 4);
      c.lineTo(T0.x1 - 30, T0.top - 3);
      c.lineTo(T0.x1 - 4, T0.top - 1);
      c.lineTo(T0.x1 + 2, T0.top + 6);
      c.lineTo(T0.x1 + 3, T0.top + 22);
      c.quadraticCurveTo(T0.x1 - 2, T0.top + 30, T0.x1 + 6, T0.top + 40);
      c.lineTo(T0.x1 - 9, T0.top + 36);
      c.lineTo(T0.x1 - 10, T0.top + 8);
      c.lineTo(sx0, T0.top);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(120,150,190,0.7)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(sx0 + 14, T0.top - 2.4);
      c.lineTo(T0.x1 - 16, T0.top - 2.4);
      c.stroke();
      c.fillStyle = '#c0c0c8';
      for (const px of [sx0 + 12, sx0 + 30, T0.x1 - 34]) c.fillRect(px, T0.top - 6, 1, 5);
      c.restore();
    }
  });
  g.act?.drawProps?.(R, g);

  // ---- the broom and dustpan in the corner; the single hanging bulb ------------------
  R.cast((c) => {
    const bx = ROOM.x1 - 40;
    c.strokeStyle = '#7a5a38';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx, -180);
    c.lineTo(bx + 6, -26);
    c.stroke();
    c.fillStyle = '#b8a05a';
    c.beginPath();
    c.moveTo(bx + 1, -28);
    c.lineTo(bx + 17, -28);
    c.lineTo(bx + 21, 0);
    c.lineTo(bx - 7, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(60,40,20,0.4)';
    c.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(bx + 2 + i * 3, -28);
      c.lineTo(bx - 4 + i * 5, 0);
      c.stroke();
    }
    c.fillStyle = '#4a4a4e';
    c.beginPath();
    c.moveTo(bx - 40, 0);
    c.lineTo(bx - 14, 0);
    c.lineTo(bx - 14, -6);
    c.lineTo(bx - 40, -2);
    c.fill();
  });
  R.cast((c) => {
    const lx = UC - 192;
    c.strokeStyle = '#2a2622';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(lx, ceil);
    c.lineTo(lx, ceil + 56);
    c.stroke();
    c.fillStyle = '#e8dcc0';
    c.beginPath();
    c.moveTo(lx - 20, ceil + 84);
    c.lineTo(lx - 7, ceil + 56);
    c.lineTo(lx + 7, ceil + 56);
    c.lineTo(lx + 20, ceil + 84);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,90,50,0.3)';
    c.fillRect(lx - 20, ceil + 82, 40, 2);
  });

  // ---- people (rigs) -------------------------------------------------------------------
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || Math.abs(w.x - cx) > 700) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, 0.9, 0.12);
  }
  g.effects?.draw?.(R);

  // ---- the white cotton in her lap, and the finished sleeve (over the rig) -----------------
  if (sh > 0.01) {
    R.cast((c) => {
      c.save();
      c.globalAlpha = sh;
      const lx = SEWING_X;
      // the body piece, falling from the table's edge into her lap
      c.fillStyle = '#f7f4ea';
      c.beginPath();
      c.moveTo(lx - 36, -66);
      c.quadraticCurveTo(lx - 30, -58, lx - 24, -52);
      c.lineTo(lx + 2, -50);
      c.quadraticCurveTo(lx + 10, -42, lx + 4, -30);
      c.lineTo(lx - 22, -26);
      c.quadraticCurveTo(lx - 38, -28, lx - 40, -44);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(120,110,90,0.4)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(lx - 30, -62);
      c.quadraticCurveTo(lx - 20, -44, lx - 28, -28);
      c.moveTo(lx - 12, -50);
      c.quadraticCurveTo(lx - 6, -40, lx - 12, -29);
      c.stroke();
      // the one finished sleeve: a hemmed tube with its cuff
      c.fillStyle = '#efeadc';
      c.beginPath();
      c.moveTo(lx - 20, -46);
      c.lineTo(lx + 6, -40);
      c.lineTo(lx + 4, -28);
      c.lineTo(lx - 22, -32);
      c.closePath();
      c.fill();
      c.fillStyle = '#fbf9f1';
      c.fillRect(lx + 4, -41, 5, 14);
      c.restore();
    });
  }

  // dust turning in the last of the light
  R.glow((c) => {
    const rr = rng(9);
    for (let i = 0; i < 36; i++) {
      const x = UC - 320 + rr() * 640 + Math.sin(t * 0.3 + i) * 10;
      const y = -280 + ((rr() * 260 + t * (2 + rr() * 3)) % 260);
      c.fillStyle = `rgba(255,214,150,${0.2 * (0.5 + 0.5 * Math.sin(t * 1.3 + i))})`;
      c.fillRect(x, y, 1.5, 1.5);
    }
  });
}
