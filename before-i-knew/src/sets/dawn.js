// Act 4, Dawn (الفجر): the town at the end of the night.
//
// One look and one sky for everything outdoors, driven by k:
//   k = 0    4:05, pre-dawn. Deep indigo to grey-blue, everything drained, no
//            hard shadows, the faintest edge of colour from the east.
//   k = 1    ~5:05, sunrise. A low gold sun on the right horizon (east),
//            long shadows to the LEFT, colour returned.
// Damascus is to the west (screen left): its lights go out, street by street.
//
// Scenes drawn here:
//   drawDawnStreet  the eastern quarter's street, from the tall building's door
//                   to the junction of Act One and its three roads
//   drawEdgeRoad    Ending 1: the last houses, the orchards, the road into the sun
//   drawFarmEdge    Ending 3: where the town thins into farms, the tunnel building
//
// World units: ground at y = 0, up is negative, 1 unit is about a centimetre.

import { lerp, rng, smooth, clamp, mixc } from '../engine/util.js';
import * as T from './town.js';
import { horizon } from './horizon.js';
import { deepScenery } from '../engine/dof.js';
import { extrudePoly, extrudeRect, holeReveal } from './depth.js';
import { X5, END } from '../story/act4-map.js';

// ------------------------------------------------------------ small things --

const hexRgb = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));
const mixHex = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`;
};
const rgbA = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// the same colour, in steps, so the far layers (which are cached by colour) don't churn
const quant = (k) => Math.round(clamp(k) * 10) / 10;

// The sun on the right: where it is on screen (uv), at its highest in the east.
const SUN_UV = [0.88, 0.8];

// Shadows lie to the LEFT, away from the east: shear > 0 swings the top of a
// figure to the left. Nearly nothing at k = 0, long at sunrise.
export const SHADOW = (k) => {
  const e = smooth(0.08, 1, clamp(k));
  return [lerp(0.1, 2.15, e), lerp(0.05, 0.13, e)];
};

// ------------------------------------------------------------ the look --

export function dawnLook(g, k = 0) {
  k = clamp(k);
  const a = g.a || {};
  const warm = smooth(0.2, 1, k);
  const lit = smooth(0.1, 1, k);
  const lights = [
    // the sun: from the east, low; at first a cool nothing, then gold. (Its
    // shadows are only as strong as it is, so they come up with it.)
    {
      uv: [lerp(0.96, 1.34, lit), lerp(0.0, 0.66, lit)],
      color: mixc([0.58, 0.66, 0.92], [1.0, 0.72, 0.4], warm),
      intensity: lerp(0.2, 1.4, lit),
      radius: 0,
      project: 1.07,
      soft: 0.004,
      rim: lerp(0.25, 1.05, lit),
    },
    // the open sky: a soft cool fill from above, no shadows
    { uv: [0.35, -0.7], color: mixc([0.62, 0.7, 0.95], [0.66, 0.76, 1.0], k), intensity: lerp(0.55, 0.3, lit), radius: 0, rim: 0.12 },
  ];
  const torch = g.torchLight?.();
  if (torch) lights.push(torch);
  // Damascus, far to the west: a last warm edge on what faces it
  if (lights.length < 4) lights.push({ uv: [-0.4, 0.62], color: [1, 0.66, 0.4], intensity: 0.1 * (1 - smooth(0, 0.7, k)), radius: 0, rim: 0.3 });
  return {
    ambient: mixc([0.26, 0.28, 0.37], [0.3, 0.27, 0.32], lit),
    lights: lights.slice(0, 4),
    groundShadow: lerp(0.35, 0.85, lit),
    god: k > 0.55 ? { uv: SUN_UV, strength: 0.32 * smooth(0.55, 1, k) } : null,
    bloom: lerp(0.55, 0.95, lit),
    exposure: lerp(1.02, 0.96, lit),
    grain: lerp(0.06, 0.04, lit),
    grade: {
      sat: lerp(0.4, 1.0, smooth(0, 1, k)),
      contrast: lerp(1.04, 1.1, lit),
      lift: lerp(0.012, 0, k),
      tint: mixc([0.95, 0.985, 1.06], [1.04, 1.0, 0.93], warm),
      shadows: mixc([0.9, 0.97, 1.13], [0.92, 0.96, 1.08], lit),
      highs: mixc([1.0, 1.0, 1.02], [1.08, 1.02, 0.92], warm),
    },
    // a cold mist lying in the street, going gold as the sun comes
    fog: { density: lerp(0.17, 0.1, lit), height: 95, color: mixc([0.36, 0.41, 0.55], [0.96, 0.78, 0.58], warm) },
    time: g.time,
    fade: a.endFade || 0,
  };
}

// ------------------------------------------------------------------ sky --

function stars(R, t, k) {
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const r = rng(17);
    for (let i = 0; i < 230; i++) {
      const xn = r();
      const yn = r() * 0.62;
      const base = 0.2 + r() * 0.6;
      const tw = 0.6 + 0.4 * Math.sin(t * (0.7 + r() * 1.5) + i);
      // gone first in the east (right) and low down, last overhead in the west
      const s = k * 1.3 + (xn - 0.5) * 0.5 + yn * 0.35;
      const al = (1 - smooth(0.2, 0.95, s)) * base * tw;
      if (al < 0.02) continue;
      c.fillStyle = `rgba(226,232,255,${al})`;
      const sz = base > 0.7 ? 1.7 : 1.1;
      c.fillRect(xn * R.W, yn * R.H, sz, sz);
    }
    c.restore();
  });
}

// Damascus, far off to the left: a dome of light and a scatter of lamps going
// out as the morning comes.
function damascus(R, t, k) {
  const on = 1 - smooth(0.05, 0.85, k);
  if (on <= 0.01) return;
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gx = -R.W * 0.05;
    const gy = R.H * 0.9;
    c.save();
    c.translate(gx, gy);
    c.scale(1, 0.5);
    const grd = c.createRadialGradient(0, 0, 0, 0, 0, R.W * 0.5);
    grd.addColorStop(0, `rgba(255,158,84,${0.34 * on})`);
    grd.addColorStop(0.4, `rgba(255,132,70,${0.1 * on})`);
    grd.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = grd;
    c.fillRect(-R.W * 0.5, -R.W * 0.5, R.W, R.W);
    c.restore();
    // lamps along the horizon, thinning to the right; each goes out in its own time
    const r = rng(91);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 140; i++) {
      const xn = Math.pow(r(), 1.7) * 0.5;
      const y = R.H * (0.78 + r() * 0.07) - r() * R.H * 0.03 * (1 - xn);
      const off = r();
      const flick = 0.7 + 0.3 * Math.sin(t * (1 + r() * 2) + i);
      const al = on > off ? 1 : 0;
      if (!al || on * 1.15 < off * 0.8) continue;
      c.fillStyle = `rgba(255,${180 + r() * 50},120,${0.55 * flick * Math.min(1, (on - off * 0.8) * 3)})`;
      c.fillRect(xn * R.W, y, 2, 2);
    }
    c.restore();
  });
}

// The sky for k, then the far country, then the town's rooftops.
// opts.sunR / sunY / sunX: the disc (the edge road has a huge one).
export function dawnSky(R, g, k = 0, opts = {}) {
  k = clamp(k);
  const t = g.time || 0;
  const W = R.W;
  const H = R.H;
  const kq = quant(k);

  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // the vertical gradient: bruise-indigo overhead, grey-blue, then the horizon
    const A = [[0, '#080c26'], [0.3, '#141b45'], [0.55, '#2c3963'], [0.76, '#4d5b82'], [1, '#74789a']];
    const B = [[0, '#34568c'], [0.3, '#5c82b2'], [0.55, '#a5b8cc'], [0.74, '#efc9a4'], [0.88, '#ffb878'], [1, '#ffd49a']];
    const ramp = (S, p) => {
      for (let i = 1; i < S.length; i++) {
        if (p <= S[i][0]) {
          const f = (p - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
          const a = hexRgb(S[i - 1][1]);
          const b = hexRgb(S[i][1]);
          return a.map((v, j) => lerp(v, b[j], f));
        }
      }
      return hexRgb(S[S.length - 1][1]);
    };
    const kk = smooth(0, 1, k);
    const gr = c.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 14; i++) {
      const p = i / 14;
      const a = ramp(A, p);
      const b = ramp(B, p);
      gr.addColorStop(p, rgbA(a.map((v, j) => lerp(v, b[j], kk))));
    }
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    // the band of colour along the eastern horizon: a faint mauve at first,
    // amber, then gold. A wide, flat ellipse centred low on the right.
    const bx = W * 0.9;
    const by = H * 0.86;
    c.save();
    c.translate(bx, by);
    c.scale(1, 0.46);
    const band = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.78);
    const bc = mixc([186, 120, 120], [255, 148, 62], smooth(0, 0.7, k));
    band.addColorStop(0, rgbA(bc, lerp(0.2, 0.85, kk)));
    band.addColorStop(0.35, rgbA(bc, lerp(0.09, 0.42, kk)));
    band.addColorStop(1, rgbA(bc, 0));
    c.fillStyle = band;
    c.fillRect(-W, -W, 2 * W, 2 * W);
    c.restore();
    // a thin bright seam right at the horizon
    const seam = c.createLinearGradient(W * 0.3, 0, W, 0);
    const sc = mixc([200, 150, 150], [255, 222, 160], k);
    seam.addColorStop(0, rgbA(sc, 0));
    seam.addColorStop(1, rgbA(sc, lerp(0.16, 0.55, kk)));
    c.fillStyle = seam;
    c.fillRect(W * 0.3, H * 0.8, W * 0.7, H * 0.1);
    // the cool of the west (left), still night
    const west = c.createLinearGradient(0, 0, W * 0.6, 0);
    west.addColorStop(0, `rgba(8,12,38,${lerp(0.4, 0.12, kk)})`);
    west.addColorStop(1, 'rgba(8,12,38,0)');
    c.fillStyle = west;
    c.fillRect(0, 0, W * 0.6, H * 0.85);
    c.restore();
  });

  stars(R, t, k);
  damascus(R, t, k);

  // the sun's disc, appearing late on the right horizon; the far country and
  // the rooftops cover its lower rim
  const up = smooth(0.8, 1, k);
  if (up > 0.001) {
    const sr = opts.sunR ?? H * 0.042;
    const sx = (opts.sunX ?? SUN_UV[0]) * W;
    const sy = lerp(H * 1.0, (opts.sunY ?? SUN_UV[1]) * H, up);
    R.sky((c) => {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'lighter';
      const halo = c.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 11);
      halo.addColorStop(0, `rgba(255,196,110,${0.5 * up})`);
      halo.addColorStop(0.2, `rgba(255,160,80,${0.2 * up})`);
      halo.addColorStop(1, 'rgba(255,140,70,0)');
      c.fillStyle = halo;
      c.fillRect(sx - sr * 11, sy - sr * 11, sr * 22, sr * 22);
      c.globalCompositeOperation = 'source-over';
      const disc = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
      disc.addColorStop(0, `rgba(255,252,236,${up})`);
      disc.addColorStop(0.8, `rgba(255,240,196,${up})`);
      disc.addColorStop(1, `rgba(255,214,140,${up})`);
      c.fillStyle = disc;
      c.beginPath();
      c.arc(sx, sy, sr, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
  }

  // the far country and its cirrus, hazed to the colour of the hour
  horizon(R, {
    haze: mixc([62, 70, 106], [238, 186, 142], smooth(0, 1, kq)).map(Math.round),
    shade: mixc([28, 33, 56], [128, 108, 122], smooth(0, 1, kq)).map(Math.round),
    cloud: mixc([84, 94, 136], [255, 198, 152], smooth(0, 1, kq)).map(Math.round),
    span: 6000,
    seed: 31,
    t,
    lights: 0,
    lite: g.settings?.get?.('quality') === 'low',
  });

  // the town's far rooftops: minarets, water tanks, a dish or two
  skylineWithTanks(R, k, t);
  R.layer(1);
}

const SKY_SEED = 47;
function skylineWithTanks(R, k, t) {
  const kq = quant(k);
  T.skyline(R, {
    depth: 0.3,
    y: 40,
    color: mixHex('#3a4262', '#836a6c', kq),
    seed: SKY_SEED,
    haze: [mixHex('#7e8cb8', '#ffc890', kq), lerp(0.2, 0.28, kq)],
    minarets: [-200, 210, 700, 1250, 1700, 2200, 2700],
  });
  // tanks on their stands, standing on the same roofs T.skyline drew
  const cx = R.cam.x * 0.3;
  R.layer(0.3);
  const r = rng(SKY_SEED);
  const col = mixHex('#2e3652', '#5d4c54', kq);
  R.paint((c) => {
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineWidth = 1.4;
    for (let x = -3000; x < 16000; ) {
      const w = 60 + r() * 140;
      const h = 60 + r() * 170;
      const broken = r() < 0.3;
      r();
      if (x + w > cx - 800 && x < cx + 800 && !broken) {
        const top = 40 - h;
        const tx = x + w * (0.25 + ((x * 7) % 3) * 0.2);
        if (Math.floor(x) % 3 === 0) {
          // a tank on four legs
          c.fillRect(tx - 9, top - 9, 18, 9);
          c.beginPath();
          c.moveTo(tx - 8, top - 9);
          c.lineTo(tx - 8, top - 14);
          c.lineTo(tx + 8, top - 14);
          c.lineTo(tx + 8, top - 9);
          c.fill();
          c.beginPath();
          c.moveTo(tx - 7, top);
          c.lineTo(tx - 7, top - 9);
          c.moveTo(tx + 7, top);
          c.lineTo(tx + 7, top - 9);
          c.stroke();
        } else if (Math.floor(x) % 3 === 1) {
          // a dish and a mast
          c.beginPath();
          c.ellipse(tx, top - 9, 6, 7, -0.5, -Math.PI / 2, Math.PI / 2);
          c.fill();
          c.fillRect(tx - 0.6, top - 9, 1.2, 9);
        }
      }
      x += w;
    }
  });
  void t;
  R.layer(1);
}

// ============================================================ the street ==

const BLOCKS = [
  { x: -1560, w: 430, floors: 4, fh: 138, color: '#a2977f', seed: 601, mat: 'plaster', laundry: true, balcony: [2, 0.2, 0.03] },
  { x: -1130, w: 500, floors: 3, fh: 140, color: '#9f9480', seed: 602, mat: 'concrete', torn: 0.4, tornLeft: true, holes: [[0.5, 0.4, 22]] },
  { x: -630, w: 400, floors: 4, fh: 136, color: '#ada390', seed: 603, mat: 'limestone', dishes: [[0.3, 3]], pocks: 8 },
  // the tall building he came down: six floors
  { x: -230, w: 560, floors: 6, fh: 136, color: '#aaa292', seed: 604, mat: 'concrete', noDoors: true, balcony: [3, 0.35, 0.04], laundry: true, holes: [[0.82, 0.5, 20]], dishes: [[0.62, 5]] },
  { x: 330, w: 480, floors: 3, fh: 138, color: '#a99d89', seed: 605, mat: 'plaster', balcony: [2, 0.6, 0.02], laundry: true },
  // (the woman's half-collapsed building: ruin 810..1060, the standing half from 1060)
  { x: 1060, w: 520, floors: 3, fh: 138, color: '#b3a68c', seed: 606, mat: 'limestone', noDoors: true, torn: 0.35, tornLeft: true, holes: [[0.15, 0.55, 18]] },
  // the basement of the boys' building is at 1700
  { x: 1580, w: 520, floors: 4, fh: 136, color: '#9f9480', seed: 607, mat: 'plaster', noDoors: true, pocks: 8, dishes: [[0.82, 2]], balcony: [2, 0.7, 0.03] },
  { x: 2100, w: 150, floors: 3, fh: 140, color: '#948874', seed: 608, mat: 'concrete', noDoors: true },
  // [the road south: 2250..2510]
  // the corner building, with Abu Rayyan's shop at its foot, as in Act One
  { x: 2510, w: 230, floors: 4, fh: 140, color: '#b4a88f', seed: 609, mat: 'limestone', shopFront: true, balcony: [2, 0.7, -0.04], laundry: true },
  // [the road to the classroom: 2740..2940]
  { x: 2940, w: 420, floors: 4, fh: 138, color: '#a2977f', seed: 610, mat: 'plaster', dishes: [[0.5, 4]], pocks: 4 },
  { x: 3360, w: 360, floors: 2, fh: 140, color: '#9f9480', seed: 611, mat: 'concrete', torn: 0.65, tornLeft: false, noDoors: true },
  { x: 3720, w: 520, floors: 2, fh: 134, color: '#ada390', seed: 612, mat: 'plaster', noDoors: true, torn: 0.3, tornLeft: true },
  { x: 4260, w: 460, floors: 1, fh: 140, color: '#a99d89', seed: 613, mat: 'limestone', noDoors: true },
];
const BLOCK = (seed) => BLOCKS.find((b) => b.seed === seed);

// A window with a candle or a generator lamp in it, going out with the dark.
function lamp(R, spec, floor, col, t, k, flick = 0) {
  const cols = Math.max(2, Math.round(spec.w / 110));
  const ww = Math.min(58, (spec.w / cols) * 0.5);
  const wh = spec.fh * 0.46;
  const wx = spec.x + ((col + 0.5) * spec.w) / cols - ww / 2;
  const wy = -floor * spec.fh - spec.fh * 0.72;
  const on = 1 - smooth(0.25, 0.9, k);
  if (on < 0.02) return;
  const fl = 0.82 + 0.18 * Math.sin(t * 6.1 + flick) * Math.sin(t * 2.3 + flick * 2);
  R.glow((c) => {
    const cx = wx + ww / 2;
    const cy = wy + wh * 0.6;
    const grd = c.createRadialGradient(cx, cy, 0, cx, cy, 60);
    grd.addColorStop(0, `rgba(255,208,140,${0.5 * fl * on})`);
    grd.addColorStop(0.3, `rgba(255,160,80,${0.16 * fl * on})`);
    grd.addColorStop(1, 'rgba(255,140,60,0)');
    c.fillStyle = grd;
    c.fillRect(cx - 60, cy - 60, 120, 120);
    c.fillStyle = `rgba(255,214,150,${0.28 * fl * on})`;
    c.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
  });
}

// A road going away between two façades: the perspective corridor. Lighter at
// its far end, the left wall (it faces east) catching the sun, the right wall in
// its own shade.
function sideRoad(R, g, x0, x1, k, { end = 'minaret', seed = 1, t = 0 } = {}) {
  const xc = (x0 + x1) / 2;
  const vy = -70;
  const mode = g.settings?.get?.('dof') || 'bokeh';
  const kq = quant(k);
  const haze = mixc([156, 164, 190], [255, 214, 160], smooth(0, 1, kq));
  const fn = (c) => {
    // the road, narrowing; paler where it runs away
    const rd = c.createLinearGradient(0, 4, 0, vy);
    rd.addColorStop(0, '#6c6458');
    rd.addColorStop(0.55, '#857c6f');
    rd.addColorStop(1, '#b5ab9b');
    c.fillStyle = rd;
    c.beginPath();
    c.moveTo(x0 - 6, 6);
    c.lineTo(xc - 22, vy);
    c.lineTo(xc + 22, vy);
    c.lineTo(x1 + 6, 6);
    c.fill();
    // kerbs, and the pavement either side
    c.fillStyle = '#968c7c';
    c.beginPath();
    c.moveTo(x0 - 6, 6);
    c.lineTo(xc - 22, vy);
    c.lineTo(xc - 28, vy);
    c.lineTo(x0 - 40, 6);
    c.fill();
    c.beginPath();
    c.moveTo(x1 + 6, 6);
    c.lineTo(xc + 22, vy);
    c.lineTo(xc + 28, vy);
    c.lineTo(x1 + 40, 6);
    c.fill();
    // the far cross-street's wall, and what stands at the end of the road
    c.fillStyle = '#a79b86';
    c.fillRect(xc - 34, vy - 118, 68, 118);
    if (end === 'minaret') {
      T.minaret(c, xc + 4, vy - 100, 0.5, '#a39784');
    } else {
      // a low school wall with its door, two windows and a flat roof, a lamp lit
      c.fillStyle = '#b9ad94';
      c.fillRect(xc - 40, vy - 74, 80, 74);
      c.fillStyle = '#3a2f26';
      c.beginPath();
      c.moveTo(xc - 7, vy);
      c.lineTo(xc - 7, vy - 30);
      c.quadraticCurveTo(xc, vy - 40, xc + 7, vy - 30);
      c.lineTo(xc + 7, vy);
      c.fill();
      c.fillStyle = '#2a2420';
      c.fillRect(xc - 32, vy - 58, 14, 18);
      c.fillRect(xc + 18, vy - 58, 14, 18);
    }
    // receding façades with windows in perspective
    const side = (edge, dir, col, shadeCol) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 6);
      c.lineTo(edge, -540);
      c.lineTo(xc + dir * 34, vy - 130);
      c.lineTo(xc + dir * 34, vy);
      c.closePath();
      c.fill();
      // storey lines
      c.strokeStyle = shadeCol;
      c.lineWidth = 1.4;
      for (let f = 1; f <= 4; f++) {
        const ye = -f * 130 + 4;
        const yv = vy - f * 26;
        c.beginPath();
        c.moveTo(edge, ye);
        c.lineTo(xc + dir * 34, yv);
        c.stroke();
      }
      // windows, shrinking
      const r = rng(seed * 11 + (dir > 0 ? 3 : 1));
      for (let i = 0; i < 6; i++) {
        const u = (i + 0.4) / 6.6;
        const wx = lerp(edge, xc + dir * 34, u * u * 0.9 + u * 0.1);
        const sc = 1 - u * 0.9;
        for (let f = 0; f < 4; f++) {
          const wy0 = lerp(-f * 130 - 52, vy - f * 26 - 8, u);
          if (r() < 0.12) continue;
          c.fillStyle = r() < 0.5 ? '#2a231d' : '#352c25';
          c.fillRect(wx - 7 * sc * dir - (dir > 0 ? 0 : 7 * sc), wy0 - 40 * sc, 14 * sc + 1, 40 * sc);
        }
        // a door at the foot of some
        if (i % 2 === 0) {
          c.fillStyle = '#3f3228';
          c.fillRect(wx - (dir > 0 ? 0 : 12 * sc), -62 * sc - 6 * u * 0 + lerp(0, vy + 62, u * 0) - 0, 12 * sc, 62 * sc);
        }
      }
    };
    side(x0, -1, '#b4a68c', 'rgba(60,46,34,0.28)');
    side(x1, 1, '#8c8272', 'rgba(30,24,20,0.3)');
    // a line of washing slung across, half way down
    c.strokeStyle = 'rgba(40,32,28,0.8)';
    c.lineWidth = 1.2;
    const ly = -250;
    const lx0 = lerp(x0, xc - 34, 0.32);
    const lx1 = lerp(x1, xc + 34, 0.32);
    const ly0 = lerp(ly, vy - 130, 0.32);
    c.beginPath();
    c.moveTo(lx0, ly0);
    c.quadraticCurveTo(xc, ly0 + 14, lx1, ly0 - 2);
    c.stroke();
    const cols = ['#b9ab98', '#6f7e86', '#a37560', '#d1cbbd', '#586a60'];
    for (let i = 0; i < 5; i++) {
      const u = (i + 0.7) / 5.6;
      const px = lerp(lx0, lx1, u);
      const py = lerp(ly0, ly0 - 2, u) + Math.sin(u * Math.PI) * 11;
      c.fillStyle = cols[i];
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + 10, py);
      c.lineTo(px + 9, py + 20 + (i % 2) * 6);
      c.lineTo(px + 1, py + 19);
      c.fill();
    }
    // a spill of rubble at the foot of the near right wall
    c.fillStyle = '#7a7164';
    c.beginPath();
    c.moveTo(x1 - 6, 6);
    c.lineTo(x1 - 6, -30);
    c.lineTo(x1 - 46, -16);
    c.lineTo(x1 - 84, 0);
    c.lineTo(x1 - 100, 6);
    c.fill();
    // the haze of distance: the far end is the palest, and brightest, part
    const hz = c.createRadialGradient(xc, vy - 24, 0, xc, vy - 24, (x1 - x0) * 0.95);
    hz.addColorStop(0, rgbA(haze, 0.88));
    hz.addColorStop(0.35, rgbA(haze, 0.46));
    hz.addColorStop(1, rgbA(haze, 0));
    c.fillStyle = hz;
    c.fillRect(x0 - 40, -560, x1 - x0 + 80, 580);
  };
  deepScenery(R, fn, [x0 - 40, -560, x1 + 40, 10], xc, vy, x1 - x0, mode);
  // the light at the end of it: the sun straight down the road, as it comes
  const lit = smooth(0.1, 1, k);
  R.glow((c) => {
    const grd = c.createRadialGradient(xc, vy - 30, 0, xc, vy - 30, (x1 - x0) * 0.7);
    grd.addColorStop(0, `rgba(255,214,150,${lerp(0.14, 0.5, lit)})`);
    grd.addColorStop(0.5, `rgba(255,176,110,${lerp(0.04, 0.16, lit)})`);
    grd.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = grd;
    c.fillRect(x0 - 60, -540, x1 - x0 + 120, 560);
    // the sunlit left wall: a gold wash along its length
    if (lit > 0.3) {
      const wg = c.createLinearGradient(x0, 0, xc, 0);
      wg.addColorStop(0, `rgba(255,190,110,${0.26 * lit})`);
      wg.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = wg;
      c.beginPath();
      c.moveTo(x0, 6);
      c.lineTo(x0, -540);
      c.lineTo(xc - 34, vy - 130);
      c.lineTo(xc - 34, vy);
      c.fill();
    }
    // the candle in the far window at the end of the classroom street
    if (end !== 'minaret') {
      const a = 1 - smooth(0.2, 0.9, k);
      const fl = 0.85 + 0.15 * Math.sin(t * 5.3);
      const g2 = c.createRadialGradient(xc - 25, vy - 49, 0, xc - 25, vy - 49, 22);
      g2.addColorStop(0, `rgba(255,206,130,${0.7 * a * fl})`);
      g2.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g2;
      c.fillRect(xc - 50, vy - 74, 50, 50);
    }
  });
}

// ---- the tall building's door
function towerDoor(R, g, k) {
  const x = X5.start;
  const on = 1 - smooth(0.2, 0.8, k);
  R.paint((c) => {
    // a deep stone step and surround
    extrudeRect(c, x - 62, -6, 124, 8, 18, { color: '#b3a589' });
    c.fillStyle = '#b3a589';
    c.fillRect(x - 62, -6, 124, 8);
    const top = -178;
    // the surround, the dark stairwell inside it, the door leaf folded back
    c.fillStyle = '#c4b79b';
    c.fillRect(x - 58, top - 10, 116, 188);
    c.fillStyle = '#100d0b';
    c.fillRect(x - 46, top, 92, 180);
    holeReveal(c, [[x - 46, top], [x + 46, top], [x + 46, 2], [x - 46, 2]], 20, '#5a4e40');
    // the first flight of stairs rising inside
    c.fillStyle = '#1b1612';
    for (let i = 0; i < 5; i++) c.fillRect(x - 40 + i * 12, -8 - i * 12, 12, 8 + i * 12);
    // an open door leaf, swung back against the jamb
    c.fillStyle = '#4a5a52';
    c.beginPath();
    c.moveTo(x + 46, top);
    c.lineTo(x + 76, top + 8);
    c.lineTo(x + 76, -6);
    c.lineTo(x + 46, 0);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x + 50, top + 22, 22, 56);
    // a plate with the flats' names, and a bell, long dead
    c.fillStyle = '#6b6c66';
    c.fillRect(x - 76, -126, 10, 28);
    c.fillStyle = '#d8d2c2';
    for (let i = 0; i < 4; i++) c.fillRect(x - 74, -122 + i * 6, 6, 3);
  });
  // a very faint grey glow from the stair window above, spilling out
  R.glow((c) => {
    const grd = c.createLinearGradient(x, -170, x, 0);
    grd.addColorStop(0, `rgba(150,160,190,${0.05 + 0.04 * on})`);
    grd.addColorStop(1, 'rgba(150,160,190,0)');
    c.fillStyle = grd;
    c.fillRect(x - 44, -170, 88, 170);
  });
  // a child's bicycle leaning on the wall beside it
  R.cast((c) => {
    const bx = x - 150;
    c.save();
    c.translate(bx, 0);
    c.strokeStyle = '#2d3a48';
    c.lineWidth = 2.4;
    for (const wx of [-24, 24]) {
      c.beginPath();
      c.arc(wx, -18, 17, 0, Math.PI * 2);
      c.stroke();
    }
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(-24, -18);
    c.lineTo(-6, -40);
    c.lineTo(14, -40);
    c.lineTo(24, -18);
    c.moveTo(-6, -40);
    c.lineTo(2, -18);
    c.lineTo(-24, -18);
    c.moveTo(14, -40);
    c.lineTo(8, -52);
    c.lineTo(20, -54);
    c.moveTo(-9, -44);
    c.lineTo(-1, -44);
    c.stroke();
    c.restore();
  });
}

// ---- the woman's building: half of it rubble, the other half swept
function sweeperRuin(R, g, k, t) {
  const sx = X5.sweeper;
  // the heap where the north half fell, with the stump of a stair in it
  T.rubble(R, 800, 280, 112, { seed: 71, color: '#a39a8c' });
  R.cast((c) => {
    // the stair to nowhere: five treads climbing out of the rubble
    const x0 = 905;
    for (let i = 0; i < 6; i++) {
      const y = -52 - i * 24;
      extrudeRect(c, x0 + i * 26, y, 26, 24 + i * 24, 16, { color: '#9d9484' });
      c.fillStyle = '#a0978a';
      c.fillRect(x0 + i * 26, y, 26, 24 + i * 24);
      c.fillStyle = 'rgba(255,248,230,0.2)';
      c.fillRect(x0 + i * 26, y, 26, 2);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(x0 + i * 26 + 24, y, 2, 24 + i * 24);
    }
    // its rail: a bent iron balustrade
    c.strokeStyle = '#2f2823';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0 + 8, -88);
    c.lineTo(x0 + 140, -214);
    c.moveTo(x0 + 140, -214);
    c.quadraticCurveTo(x0 + 150, -226, x0 + 142, -238);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(x0 + 30 + i * 26, -108 - i * 24);
      c.lineTo(x0 + 30 + i * 26, -76 - i * 24);
      c.stroke();
    }
    // the stub of a wall still standing at the back of the heap, wallpapered
    const wp = [[838, 0], [838, -270], [852, -290], [866, -262], [880, -276], [884, -190], [880, 0]];
    extrudePoly(c, wp, 18, { color: '#a89c88' });
    c.fillStyle = '#a89c88';
    c.beginPath();
    wp.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.fillStyle = '#b6908c'; // a child's room, pink once
    c.fillRect(840, -262, 38, 70);
    c.fillStyle = '#8fa08a'; // a kitchen, green once
    c.fillRect(840, -170, 38, 100);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = -258; y < -190; y += 12) c.fillRect(840, y, 38, 1.6);
    // a picture still on the wall
    c.fillStyle = '#4a3b2e';
    c.fillRect(852, -150, 16, 20);
    c.fillStyle = '#c8b99a';
    c.fillRect(854, -148, 12, 16);
  });
  // the floor slab of the standing half's first floor juts out over the heap,
  // drooping on its bent bars
  R.cast((c) => {
    const sy = -138;
    const pts = [[1060, sy], [980, sy + 18], [976, sy + 34], [1060, sy + 16]];
    extrudePoly(c, pts, 20, { top: '#b4aa98', side: '#4a4339' });
    c.fillStyle = '#9d9585';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.strokeStyle = '#4a3b2e';
    c.lineWidth = 1.8;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      c.moveTo(978 + i * 3, sy + 24 + i * 1.5);
      c.quadraticCurveTo(968 + i * 4, sy + 52, 960 + i * 8, sy + 78 + i * 6);
    }
    c.stroke();
    // a bed's iron head, hanging out of the broken room
    c.strokeStyle = '#2a2420';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(1062, sy - 62);
    c.lineTo(1062, sy);
    c.moveTo(1084, sy - 56);
    c.lineTo(1084, sy);
    c.moveTo(1058, sy - 64);
    c.lineTo(1090, sy - 58);
    c.stroke();
  });
  // lesser rubble up to the door, and a path trodden through it
  T.rubble(R, 1000, 90, 38, { seed: 73, color: '#a99f8e', rebar: false });

  // ---- her threshold: the step, swept clean
  const doorX = sx;
  R.paint((c) => {
    // the door: a pointed wooden arch, ajar, a lamp burning in the room behind
    c.fillStyle = '#c8bb9f';
    c.fillRect(doorX - 56, -150, 112, 150);
    c.fillStyle = '#17120e';
    c.beginPath();
    c.moveTo(doorX - 40, 0);
    c.lineTo(doorX - 40, -112);
    c.quadraticCurveTo(doorX - 40, -146, doorX, -158);
    c.quadraticCurveTo(doorX + 40, -146, doorX + 40, -112);
    c.lineTo(doorX + 40, 0);
    c.fill();
    c.fillStyle = '#5a4330'; // the leaf, opened inwards, seen edge-on
    c.fillRect(doorX + 34, -124, 8, 124);
  });
  const lampOn = 1 - smooth(0.2, 0.85, k);
  R.glow((c) => {
    const fl = 0.85 + 0.15 * Math.sin(t * 5.7) * Math.sin(t * 2.1);
    const grd = c.createLinearGradient(doorX - 38, 0, doorX + 30, 0);
    grd.addColorStop(0, `rgba(255,190,110,${0.38 * lampOn * fl})`);
    grd.addColorStop(1, `rgba(255,170,90,${0.08 * lampOn})`);
    c.fillStyle = grd;
    c.beginPath();
    c.moveTo(doorX - 38, 0);
    c.lineTo(doorX - 38, -110);
    c.quadraticCurveTo(doorX - 38, -140, doorX, -150);
    c.lineTo(doorX + 30, -140);
    c.lineTo(doorX + 30, 0);
    c.fill();
    // a pool of it on the swept step
    const sp = c.createRadialGradient(doorX - 6, -2, 0, doorX - 6, -2, 70);
    sp.addColorStop(0, `rgba(255,190,110,${0.25 * lampOn * fl})`);
    sp.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = sp;
    c.fillRect(doorX - 80, -30, 160, 40);
  });
  R.cast((c) => {
    // the stone step, scrubbed pale, with the broom's arcs fading in the dust
    extrudeRect(c, doorX - 70, -12, 140, 14, 16, { color: '#c7bba2' });
    c.fillStyle = '#cfc4ac';
    c.fillRect(doorX - 70, -12, 140, 14);
    c.fillStyle = 'rgba(255,250,236,0.35)';
    c.fillRect(doorX - 70, -12, 140, 2);
    c.strokeStyle = 'rgba(110,96,76,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      c.moveTo(doorX - 62 + i * 26, 0);
      c.quadraticCurveTo(doorX - 50 + i * 26, -8, doorX - 38 + i * 26, 0);
    }
    c.stroke();
    // the dust she has swept off it, gathered in a little drift at the kerb
    c.fillStyle = '#9a8f7c';
    c.beginPath();
    c.moveTo(doorX + 74, 3);
    c.quadraticCurveTo(doorX + 92, -14, doorX + 120, 3);
    c.fill();
    c.fillStyle = '#8a8070';
    for (let i = 0; i < 6; i++) c.fillRect(doorX + 80 + i * 6, -2 - (i % 3), 3, 3);
    // a plastic chair beside the door, and a tin of basil on the sill
    c.fillStyle = '#6f7a86';
    c.fillRect(doorX + 168, -44, 30, 4);
    c.fillRect(doorX + 168, -92, 4, 50);
    c.fillRect(doorX + 168, -44, 4, 44);
    c.fillRect(doorX + 194, -44, 4, 44);
    c.fillStyle = '#8a5a3a';
    c.fillRect(doorX - 62, -26, 14, 14);
    c.fillStyle = '#5e7a3a';
    c.beginPath();
    c.arc(doorX - 55, -32, 9, 0, Math.PI * 2);
    c.arc(doorX - 60, -38, 6, 0, Math.PI * 2);
    c.arc(doorX - 50, -38, 6, 0, Math.PI * 2);
    c.fill();
  });
  // rain barrel against the next wall, and a yellow can beside it
  R.cast((c) => {
    const bx = doorX + 330;
    c.fillStyle = '#3a5a7a';
    extrudeRect(c, bx - 20, -64, 40, 64, 14, { color: '#3a5a7a' });
    c.fillRect(bx - 20, -64, 40, 64);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(bx - 20, -44, 40, 3);
    c.fillRect(bx - 20, -22, 40, 3);
    T.jerryCan(c, bx + 42, 0, 1);
  });
}

// ---- the basement the boys come up out of
function basement(R, k) {
  const b = X5.boys;
  R.paint((c) => {
    // the well in the pavement, its far wall catching what light there is
    c.fillStyle = '#05060a';
    c.fillRect(b - 62, -5, 124, 150);
    holeReveal(c, [[b - 62, -5], [b + 62, -5], [b + 62, 145], [b - 62, 145]], 26, '#2a2c38');
    // steps going down, left to right
    for (let i = 0; i < 8; i++) {
      c.fillStyle = `rgb(${96 - i * 9},${88 - i * 8},${80 - i * 7})`;
      c.fillRect(b - 58 + i * 14, 4 + i * 16, 14, 4);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(b - 58 + i * 14, 8 + i * 16, 14, 12);
    }
    // kerb stones round it
    extrudeRect(c, b - 72, -7, 14, 14, 18, { color: '#9a8f7c' });
    extrudeRect(c, b + 58, -7, 14, 14, 18, { color: '#9a8f7c' });
    c.fillStyle = '#a79c88';
    c.fillRect(b - 72, -7, 14, 14);
    c.fillRect(b + 58, -7, 14, 14);
  });
  R.cast((c) => {
    // a rusted iron handrail, and the sheet of tin that keeps the rain out
    c.strokeStyle = '#3a2f26';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(b - 64, -50);
    c.lineTo(b - 64, -6);
    c.moveTo(b - 64, -50);
    c.lineTo(b + 60, -50);
    c.lineTo(b + 60, -6);
    c.stroke();
    c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 1; i < 6; i++) {
      c.moveTo(b - 64 + i * 20.8, -50);
      c.lineTo(b - 64 + i * 20.8, -6);
    }
    c.stroke();
    // an exercise book's torn page, caught on it
    c.fillStyle = '#d9d2c0';
    c.fillRect(b + 6, -44, 10, 12);
  });
  // the cool glow of the stairwell: a pale grey lamp far down
  const on = 1 - smooth(0.2, 0.7, k);
  R.glow((c) => {
    const g2 = c.createRadialGradient(b + 40, 100, 0, b + 40, 100, 70);
    g2.addColorStop(0, `rgba(255,196,130,${0.25 * on})`);
    g2.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = g2;
    c.fillRect(b - 62, 20, 124, 124);
  });
}

// ---- the junction, as it was in Act One, relit
function junction(R, g, k, t) {
  const kq = k;
  // Abu Rayyan's shop at the corner, its shutter down now
  T.shop(R, 2515, { w: 220, open: 0.1 });
  // the dead olive tree at the corner, and the kerb wall round it
  T.lowWall(R, 2662, 112, 40, '#a79a84');
  T.deadOlive(R, 2712);
  // a fallen concrete beam on two blocks by the kerb, where people wait for news
  R.cast((c) => {
    const x0 = 2240;
    const x1 = 2372;
    extrudeRect(c, x0 + 8, -24, 22, 24, 12, { color: '#8e8676' });
    extrudeRect(c, x1 - 30, -24, 22, 24, 12, { color: '#8e8676' });
    c.fillStyle = '#8e8676';
    c.fillRect(x0 + 8, -24, 22, 24);
    c.fillRect(x1 - 30, -24, 22, 24);
    const pts = [[x0, -40], [x1, -41], [x1 + 3, -24], [x0 - 2, -23]];
    extrudePoly(c, pts, 22, { color: '#a39b8a' });
    c.fillStyle = '#a39b8a';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.fill();
    c.fillStyle = 'rgba(255,250,235,0.18)';
    c.fillRect(x0, -40, x1 - x0, 2);
    c.strokeStyle = '#4a3b2e';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x1, -34);
    c.quadraticCurveTo(x1 + 12, -38, x1 + 16, -30);
    c.stroke();
  });
  // the street sign on its iron pole: شارع الزيتون
  R.cast((c) => {
    const px = 2528;
    c.fillStyle = '#34322e';
    c.fillRect(px - 3, -330, 6, 330);
    c.fillRect(px - 5, -8, 10, 8);
    c.fillRect(px - 3, -326, 124, 4);
    // the enamel plate, chipped, hanging from the arm on two loops
    c.fillStyle = '#1f4a78';
    c.fillRect(px + 4, -322, 112, 34);
    c.fillStyle = '#e9e4d4';
    c.fillRect(px + 7, -319, 106, 1.6);
    c.fillRect(px + 7, -292, 106, 1.6);
    c.fillStyle = '#1b3c60';
    c.fillRect(px + 100, -322, 8, 7); // a chip
    c.fillStyle = '#e9e4d4';
    c.font = 'bold 24px "Noto Naskh Arabic","Noto Sans Arabic","Aref Ruqaa",serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('شارع الزيتون', px + 60, -298);
    c.direction = 'ltr';
    c.font = '8px sans-serif';
    c.fillStyle = 'rgba(233,228,212,0.8)';
    c.fillText('ZEITOUN ST.', px + 60, -290);
  });
  // a gas cylinder and a crate by the shop
  R.cast((c) => {
    c.fillStyle = '#7a8a8e';
    c.fillRect(2742, -42, 20, 42);
    c.fillRect(2748, -50, 8, 8);
  });
  void t;
  void kq;
}

// ---- washing lines, with sparrows
function washing(R, t, k, near) {
  const lines = [
    { x0: 340, x1: 650, y0: -300, y1: -322, sag: 28, seed: 3 },
    { x0: 1620, x1: 1930, y0: -280, y1: -262, sag: 30, seed: 5 },
    { x0: 2960, x1: 3250, y0: -296, y1: -300, sag: 24, seed: 7 },
  ];
  for (const L of lines) {
    if (!near(L.x0, L.x1)) continue;
    const at = (u) => [lerp(L.x0, L.x1, u), lerp(L.y0, L.y1, u) + Math.sin(u * Math.PI) * L.sag];
    R.cast((c) => {
      c.strokeStyle = 'rgba(30,24,20,0.9)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(L.x0, L.y0);
      for (let i = 1; i <= 24; i++) c.lineTo(...at(i / 24));
      c.stroke();
      // iron hooks into the wall
      c.fillStyle = '#2a2420';
      c.fillRect(L.x0 - 4, L.y0 - 3, 8, 6);
      c.fillRect(L.x1 - 4, L.y1 - 3, 8, 6);
      const r = rng(L.seed * 17);
      const cols = ['#c8bfae', '#6f7e86', '#a37560', '#d6cfc1', '#586a60', '#8a6a7a', '#b9a47a'];
      for (let i = 0; i < 7; i++) {
        const u = 0.08 + i * 0.13 + r() * 0.04;
        const [px, py] = at(u);
        const sway = Math.sin(t * 1.4 + i * 1.7 + L.seed) * (1 + 3 * k) * 0.6;
        const small = r() < 0.4; // children's clothes
        const w = small ? 14 : 22;
        const h = small ? 22 : 38 + r() * 12;
        c.fillStyle = cols[(i + L.seed) % cols.length];
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + w, py);
        c.lineTo(px + w + sway, py + h);
        c.lineTo(px + 2 + sway, py + h - 2);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(px + 1, py, 2, h - 2);
      }
    });
    // sparrows on the line: three, one of them hopping
    const r2 = rng(L.seed * 5);
    R.cast((c) => {
      c.fillStyle = '#4a4238';
      for (let i = 0; i < 3; i++) {
        const u = 0.2 + r2() * 0.6;
        const hop = Math.max(0, Math.sin(t * 3 + i * 2 + L.seed)) > 0.96 ? -3 : 0;
        const [px, py] = at(u);
        const by = py - 4 + hop;
        c.beginPath();
        c.ellipse(px, by, 5, 3.4, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(px + 4.5, by - 2.5, 2.4, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(px - 4, by);
        c.lineTo(px - 10, by + 2);
        c.lineTo(px - 4, by + 2);
        c.fill();
        c.fillStyle = '#c9a45a';
        c.fillRect(px + 6.5, by - 2.8, 2, 1);
        c.fillStyle = '#4a4238';
      }
    });
  }
}

// Thin smoke from a stovepipe: someone has found something to cook.
function cookSmoke(R, t, k, near) {
  const px = 745;
  const py = -196;
  if (!near(px - 80, px + 80)) return;
  R.cast((c) => {
    c.fillStyle = '#3a342d';
    c.fillRect(px - 5, py, 10, 40);
    c.fillRect(px - 5, py - 6, 10, 8);
    c.fillStyle = '#4a433a';
    c.fillRect(px - 3, py - 60, 6, 60);
    c.fillRect(px - 7, py - 64, 14, 6);
  });
  R.paint((c) => {
    const a = lerp(0.3, 0.2, k);
    const col = k < 0.5 ? '176,182,200' : '216,196,176';
    for (let i = 0; i < 22; i++) {
      const u = ((i / 22 + t * 0.045) % 1);
      const y = py - 66 - u * 300;
      const x = px + Math.sin(u * 5 + t * 0.4) * 14 * u + u * u * -30;
      const r = 4 + u * 26;
      c.fillStyle = `rgba(${col},${a * (1 - u) * (u < 0.1 ? u * 10 : 1)})`;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// Long gold shafts through the gaps, once the sun is up enough to reach them.
function shafts(R, k, cx) {
  const lit = smooth(0.4, 1, k);
  if (lit < 0.02) return;
  const gaps = [[810, 1060], [2250, 2510], [2740, 2940], [-240 - 380, -230], [3360, 3560]];
  R.glow((c) => {
    for (const [a, b] of gaps) {
      if (b < cx - 1500 || a > cx + 1500) continue;
      const top = -520;
      const dx = 1000; // as far to the left as the sun is low
      const gr = c.createLinearGradient(b + 80, top, b - dx, 0);
      gr.addColorStop(0, `rgba(255,200,120,${0.0})`);
      gr.addColorStop(0.2, `rgba(255,204,128,${0.16 * lit})`);
      gr.addColorStop(1, `rgba(255,190,110,${0.04 * lit})`);
      c.fillStyle = gr;
      c.beginPath();
      c.moveTo(b + 90, top);
      c.lineTo(a + 90 + (b - a) * 0.3, top);
      c.lineTo(a - dx + (b - a) * 0.3, 0);
      c.lineTo(b - dx, 0);
      c.fill();
    }
  });
}

// The road, wet with dew, taking the colour of the sky; a sheen on the kerb.
function roadLight(R, k, cx, t) {
  const lit = smooth(0.1, 1, k);
  R.glow((c) => {
    const g1 = c.createLinearGradient(0, -6, 0, 120);
    g1.addColorStop(0, `rgba(${lerp(140, 255, lit) | 0},${lerp(156, 200, lit) | 0},${lerp(206, 140, lit) | 0},${lerp(0.14, 0.2, lit)})`);
    g1.addColorStop(0.35, `rgba(${lerp(120, 255, lit) | 0},${lerp(140, 190, lit) | 0},${lerp(200, 130, lit) | 0},${lerp(0.06, 0.1, lit)})`);
    g1.addColorStop(1, 'rgba(120,140,200,0)');
    c.fillStyle = g1;
    c.fillRect(cx - 1600, -6, 3200, 126);
    const r = rng(23);
    const base = Math.floor(cx / 3200) * 3200 - 3200;
    for (let i = 0; i < 60; i++) {
      const x = base + r() * 9600;
      const y = 22 + r() * 70;
      const w = 30 + r() * 90;
      const a = (0.05 + r() * 0.09) * (0.5 + lit);
      if (Math.abs(x - cx) > 1500) continue;
      c.fillStyle = lit > 0.5 ? `rgba(255,214,150,${a})` : `rgba(150,170,225,${a})`;
      c.beginPath();
      c.ellipse(x, y, w, 2 + r() * 4, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  void t;
}

function streetThings(R, near) {
  // heaps and scatter
  const piles = [
    [-300, 120, 34, 61, '#a39a8c'],
    [2030, 70, 26, 62, '#9d9486'],
    [2970, 80, 22, 63, '#a39a8c'],
    [3290, 130, 40, 64, '#a79d8c'],
    [3560, 180, 52, 65, '#9d9486'],
  ];
  for (const [x, w, h, seed, col] of piles) if (near(x, x + w)) T.rubble(R, x, w, h, { seed, color: col });
  // a crater at the foot of the street, and shrapnel pocks in the kerb
  if (near(3400, 3600)) T.crater(R, 3500, 170);
  // yellow cans queued for the water, a flattened can, a toppled chair
  R.cast((c) => {
    if (near(1960, 2080)) {
      T.jerryCan(c, 2000, 0, 1);
      T.jerryCan(c, 2034, 0, 1, '#c9a52a');
      T.jerryCan(c, 2062, 0, 1, '#e0bb30');
    }
    if (near(560, 700)) {
      c.fillStyle = '#6f7a86';
      c.save();
      c.translate(610, 0);
      c.rotate(-0.3);
      c.fillRect(-14, -4, 28, 4);
      c.fillRect(-14, -26, 4, 24);
      c.restore();
    }
    if (near(2160, 2200)) {
      c.fillStyle = '#7f8a8e';
      c.fillRect(2174, -6, 12, 6);
    }
  });
}

// Light on the road from the sun itself, and motes, last.
function warmth(R, g, k, cx) {
  if (k > 0.35) T.motes(R, cx, g.time, (k - 0.35) * 0.9);
}

// People and their shadows: as Act Three's walk, but the light has moved.
function people(R, g, k, near) {
  const [shear, squash] = SHADOW(k);
  const list = [...(g.npcs || []), g.player].filter((w) => w && w.visible && near(w.x - 120, w.x + 120));
  R.paint((c) => {
    for (const w of list) {
      const s2 = w.rig?.scale || 1;
      const grd = c.createRadialGradient(w.x, w.y + 2, 0, w.x, w.y + 2, 26 * s2);
      grd.addColorStop(0, `rgba(20,14,10,${lerp(0.26, 0.16, k)})`);
      grd.addColorStop(1, 'rgba(20,14,10,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.ellipse(w.x, w.y + 2, 26 * s2, 5 * s2, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  for (const w of list) {
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, squash);
  }
  if (g.cat && !g.cat.hidden && near(g.cat.x - 50, g.cat.x + 50)) {
    R.cast((c) => g.cat.draw(c));
    R.shadow((c) => g.cat.draw(c), g.cat.x, g.cat.y, shear, squash);
  }
}

export function drawDawnStreet(R, g, { k = 0, t = g.time } = {}) {
  k = clamp(k);
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1600 && x0 < cx + 1600;

  dawnSky(R, g, k);

  // a second row of buildings, further back, filling the gaps where the street
  // has lost a house; then the street's far side
  const back = [
    [880, 330, 3, 701, '#8f8574'],
    [2020, 260, 4, 702, '#8c8272'],
    [3260, 330, 3, 703, '#908676'],
    [-460, 300, 4, 704, '#8f8574'],
  ];
  const d = 0.82;
  for (const [x, w, floors, seed, color] of back) {
    if (!near(x - 200, x + w + 200)) continue;
    R.layer(d);
    T.block(R, { x: x * d, w, floors, fh: 134, color, seed, mat: 'plaster', noDoors: true, torn: seed % 2 ? 0.3 : 0 }, t);
    R.layer(1);
  }
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);

  // lamps still lit in a few windows
  if (near(330, 810)) lamp(R, BLOCK(605), 1, 0, t, k, 1);
  if (near(1580, 2100)) lamp(R, BLOCK(607), 2, 3, t, k, 4);
  if (near(2940, 3360)) lamp(R, BLOCK(610), 1, 1, t, k, 7);
  if (near(-630, -230)) lamp(R, BLOCK(603), 2, 0, t, k, 2);

  // the three roads
  if (near(X5.south - 130, X5.south + 130)) sideRoad(R, g, 2250, 2510, k, { end: 'minaret', seed: 2, t });
  if (near(X5.classroom - 100, X5.classroom + 100)) sideRoad(R, g, 2740, 2940, k, { end: 'school', seed: 3, t });

  // the details of the street
  if (near(-300, 300)) towerDoor(R, g, k);
  if (near(780, 1560)) sweeperRuin(R, g, k, t);
  if (near(X5.boys - 100, X5.boys + 100)) basement(R, k);
  if (near(2200, 2800)) junction(R, g, k, t);
  // the grape vine from Act One, bright green, the grapes small and hard
  if (near(1360, 1520)) T.vine(R, 1440, t, { wallH: 96, lush: 1 });

  // the ground
  T.street(R, -1800, 4800);
  roadLight(R, k, cx, t);
  streetThings(R, near);
  washing(R, t, k, near);
  cookSmoke(R, t, k, near);
  T.cables(R, cx, { seed: 175, from: -800, to: 4400 });
  shafts(R, k, cx);

  // the scene's own props
  g.act?.drawProps?.(R, g);

  people(R, g, k, near);

  g.effects?.draw?.(R);
  warmth(R, g, k, cx);
  T.foreground(R, cx, { from: -1600, to: 4600 });
}

// ======================================================== the edge road ==
// (Ending 1) and the farm edge (Ending 3) follow.
export function drawEdgeRoad() {}
export function drawFarmEdge() {}
