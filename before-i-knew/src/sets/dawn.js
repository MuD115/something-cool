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
  // out in the open country there is no wall behind anyone for a shadow to fall on
  const open = (g.player?.x ?? 0) > 50000;
  const lights = [
    // the sun: from the east, low; at first a cool nothing, then gold. (Its
    // shadows are only as strong as it is, so they come up with it.)
    {
      uv: [lerp(0.96, 1.34, lit), lerp(0.0, 0.66, lit)],
      color: mixc([0.58, 0.66, 0.92], [1.0, 0.72, 0.4], warm),
      intensity: lerp(0.2, 1.4, lit),
      radius: 0,
      project: open ? 0 : 1.07,
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
    ambient: mixc([0.26, 0.28, 0.37], [0.26, 0.245, 0.31], lit),
    lights: lights.slice(0, 4),
    groundShadow: lerp(0.4, 1.0, lit),
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
    const B = [[0, '#34568c'], [0.3, '#5c82b2'], [0.55, '#a5b8cc'], [0.74, '#e8b894'], [0.88, '#f6a566'], [1, '#f4b678']];
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
      const pp = opts.hy ? Math.min(p / opts.hy, 1) : p;
      const a = ramp(A, pp);
      const b = ramp(B, pp);
      gr.addColorStop(p, rgbA(a.map((v, j) => lerp(v, b[j], kk))));
    }
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    // the band of colour along the eastern horizon: a faint mauve at first,
    // amber, then gold. A wide, flat ellipse centred low on the right.
    const bx = W * 0.9;
    const by = H * (opts.hy ?? 0.86);
    c.save();
    c.translate(bx, by);
    c.scale(1, 0.46);
    const band = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.78);
    const bc = mixc([186, 120, 120], [255, 148, 62], smooth(0, 0.7, k));
    band.addColorStop(0, rgbA(bc, lerp(0.2, opts.open ? 0.6 : 0.85, kk)));
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
    c.fillRect(W * 0.3, H * ((opts.hy ?? 0.86) - 0.06), W * 0.7, H * 0.1);
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
      // the glow round it, kept in proportion for a big low sun so the disc
      // keeps its edge
      const hr = Math.min(sr * 11, H * 0.5);
      const ha = sr > H * 0.06 ? 0.3 : 0.5;
      const halo = c.createRadialGradient(sx, sy, sr * 1.02, sx, sy, hr);
      halo.addColorStop(0, `rgba(255,196,110,${ha * up})`);
      halo.addColorStop(0.2, `rgba(255,160,80,${ha * 0.4 * up})`);
      halo.addColorStop(1, 'rgba(255,140,70,0)');
      c.fillStyle = halo;
      c.fillRect(sx - hr, sy - hr, hr * 2, hr * 2);
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

  if (opts.open) {
    // open country: no town on the skyline, only a few streaks of cirrus
    R.sky((c) => {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      const r = rng(5);
      const hy = (opts.hy ?? 0.55) * H;
      for (let i = 0; i < 9; i++) {
        const cxn = r() * W;
        const cyn = hy - H * (0.08 + r() * 0.3);
        const wd = W * (0.12 + r() * 0.2);
        const lit = smooth(0, 1, k) * (0.3 + 0.7 * (cxn / W));
        const col = mixc([70, 80, 120], [255, 182, 130], lit);
        c.fillStyle = rgbA(col, lerp(0.16, 0.34, k));
        c.beginPath();
        c.ellipse(cxn + Math.sin(t * 0.02 + i) * 8, cyn, wd, H * 0.008 + r() * H * 0.01, -0.03, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    });
    R.layer(1);
    return;
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
  const [wx, wy, ww, wh] = T.windowRect(spec, floor, col);
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
      // windows in perspective: each a quad between two storey lines, so the
      // rows recede with the wall instead of stepping down it
      const r = rng(seed * 11 + (dir > 0 ? 3 : 1));
      const xv = xc + dir * 34;
      const fu = (u) => u * u * 0.9 + u * 0.1; // spacing: closer together as they go
      const lineY = (n, tt) => lerp(-n * 130 + 4, vy - n * 26, tt);
      for (let i = 0; i < 6; i++) {
        const ta = fu((i + 0.28) / 6.6);
        const tb = fu((i + 0.66) / 6.6);
        const xa = lerp(edge, xv, ta);
        const xb = lerp(edge, xv, tb);
        for (let f = 0; f < 4; f++) {
          if (r() < 0.14) continue;
          const y = (tt, frac) => lerp(lineY(f + 1, tt), lineY(f, tt), frac);
          c.fillStyle = r() < 0.5 ? 'rgba(52,44,38,0.9)' : 'rgba(64,54,46,0.85)';
          c.beginPath();
          c.moveTo(xa, y(ta, 0.3));
          c.lineTo(xb, y(tb, 0.3));
          c.lineTo(xb, y(tb, 0.74));
          c.lineTo(xa, y(ta, 0.74));
          c.closePath();
          c.fill();
          // a pale sill under it
          c.strokeStyle = 'rgba(220,210,190,0.35)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(xa, y(ta, 0.76));
          c.lineTo(xb, y(tb, 0.76));
          c.stroke();
        }
        // a door at the foot of some
        if (i % 2 === 0) {
          const y = (tt, frac) => lerp(lineY(1, tt), lineY(0, tt), frac);
          c.fillStyle = 'rgba(70,56,44,0.9)';
          c.beginPath();
          c.moveTo(xa, y(ta, 0.45));
          c.lineTo(xb, y(tb, 0.45));
          c.lineTo(xb, y(tb, 1));
          c.lineTo(xa, y(ta, 1));
          c.closePath();
          c.fill();
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


// ====================================================== open country ==
// The edge of town: the camera pulls back here (the view grows to 3400 wide),
// so everything is placed by where it lands on the screen, not by fixed
// numbers, and drawn as far as the view reaches.

const baseScale = (R) => Math.max(R.W / 1400, (R.H * 2.39 * 0.62) / 1400);
// half the width of the view, in a layer's own units
const halfW = (R, d) => R.W / 2 / (baseScale(R) * Math.pow(1400 / R.cam.view, d)) + 260;
// the layer's y for a screen y
const layerY = (R, d, sy) => {
  const f = R.cam.frame(R.W, R.H, d);
  return (sy - f.oy) / f.s;
};
const screenY = (R, d, y) => {
  const f = R.cam.frame(R.W, R.H, d);
  return f.oy + y * f.s;
};
const layerX = (R, d, sx) => {
  const f = R.cam.frame(R.W, R.H, d);
  return (sx - f.ox) / f.s;
};
function cells(R, d, step, fn) {
  const c0 = R.cam.x * d;
  const hw = halfW(R, d);
  for (let i = Math.floor((c0 - hw) / step); i <= Math.ceil((c0 + hw) / step); i++) fn(i, i * step);
}
const hazeOf = (k) => mixc([112, 120, 156], [250, 196, 150], smooth(0, 1, k));
const toward = (hex, h, f) => rgbA(mixc(hexRgb(hex), h, f));

// The horizon on the screen, from the eye: where land meets sky.
const horizonY = (R) => screenY(R, 1, Math.min(-60, R.cam.y * 0.84));

// The far plain: furrowed fields, hedgerows of poplar, a farm or two, hazed.
function farPlain(R, k, o = {}) {
  const d = 0.45;
  const hf = o.haze ?? 0.5;
  const hz = layerY(R, d, horizonY(R));
  const c0 = R.cam.x * d;
  const hw = halfW(R, d);
  const h = hazeOf(k);
  const seed = o.seed || 1;
  const fields = o.fields || ['#6c7550', '#7d7a52', '#5f6c48', '#857f58', '#6a7048'];
  R.layer(d);
  R.paint((c) => {
    c.fillStyle = toward(fields[0], h, hf);
    c.fillRect(c0 - hw, hz, 2 * hw, 400);
    // fields in rows that recede: each row's boundaries run to the vanishing
    // point, nearer rows wider and less hazed
    {
      const vpx = c0 + hw * 0.8;
      const rows = [0, 3, 8, 16, 28, 46, 74, 116, 400];
      for (let j = 0; j < rows.length - 1; j++) {
        const ya = hz + rows[j];
        const yb = hz + rows[j + 1];
        const span = 90 + j * j * 26;
        const near = j / (rows.length - 2);
        const at = (x, y) => vpx + (x - vpx) * ((y - hz) / Math.max(1, yb - hz));
        // the cells under the screen (a far row's tails, squeezed to the
        // vanishing point, are slivers and can go)
        const i0 = Math.floor((c0 - hw * 1.25) / span);
        const i1 = Math.ceil((c0 + hw * 1.25) / span);
        for (let i = i0; i <= i1; i++) {
          const r = rng(i * 977 + j * 131 + seed);
          c.fillStyle = toward(fields[Math.floor(r() * fields.length)], h, hf - 0.02 - 0.1 * near);
          const xa = i * span;
          const xb = xa + span + 1;
          c.beginPath();
          c.moveTo(xa, yb);
          c.lineTo(xb, yb);
          c.lineTo(at(xb, ya), ya);
          c.lineTo(at(xa, ya), ya);
          c.fill();
        }
      }
    }
    // furrows running away to the sun
    const vx = c0 + hw * 0.8;
    c.lineWidth = 1.1;
    for (let j = 0; j < 9; j++) {
      const y0 = hz + 14 + j * j * 1.6 + j * 6;
      c.strokeStyle = rgbA(mixc(h, [255, 226, 170], smooth(0.2, 1, k) * 0.5), o.furrow ?? 0.17);
      c.beginPath();
      c.moveTo(c0 - hw, y0 + 30 + j * 4);
      c.lineTo(vx, hz);
      c.stroke();
    }
    // trees: poplars in rows, round orchard trees, a dark mass of cypress
    const tcol = (hex, f) => toward(hex, h, f);
    cells(R, d, 70, (i, x) => {
      const r = rng(i * 31 + seed + 5);
      const v = r();
      if (v < (o.bare ?? 0.35)) return;
      if (v < 0.62) {
        const ph = 50 + r() * 70;
        c.fillStyle = tcol('#3f4e34', 0.45);
        for (let n = 0; n < 1 + Math.floor(r() * 3); n++) {
          c.beginPath();
          c.ellipse(x + n * 13, hz + 3 - ph * 0.5, 4.5 + r() * 2, ph * 0.5 * (0.8 + n * 0.1), 0, 0, Math.PI * 2);
          c.fill();
        }
      } else if (v < 0.88) {
        c.fillStyle = tcol('#4c5c38', 0.42);
        const rad = 11 + r() * 12;
        for (let n = 0; n < 3; n++) {
          c.beginPath();
          c.arc(x + n * 16, hz - rad * 0.7 - r() * 4, rad * (0.8 + r() * 0.3), 0, Math.PI * 2);
          c.fill();
        }
      } else {
        // a farm: a flat-roofed block and its wall
        c.fillStyle = tcol('#8a7e68', 0.4);
        c.fillRect(x, hz - 22, 44, 24);
        c.fillStyle = tcol('#6a604f', 0.4);
        c.fillRect(x - 2, hz - 24, 48, 3);
        c.fillRect(x + 8, hz - 12, 7, 10);
      }
    });
    // pylons marching off, thin
    if (o.pylons) {
      c.strokeStyle = tcol('#3a4048', 0.55);
      c.lineWidth = 1.3;
      cells(R, d, 420, (i, x) => {
        c.beginPath();
        c.moveTo(x - 7, hz + 2);
        c.lineTo(x, hz - 52);
        c.lineTo(x + 7, hz + 2);
        c.moveTo(x - 14, hz - 44);
        c.lineTo(x + 14, hz - 44);
        c.moveTo(x - 4, hz - 30);
        c.lineTo(x + 4, hz - 14);
        c.stroke();
        c.beginPath();
        c.moveTo(x - 14, hz - 44);
        c.quadraticCurveTo(x + 200, hz - 28, x + 420 - 14, hz - 44);
        c.stroke();
      });
    }
  });
  R.layer(1);
}

// Grape arbours: rows of posts and wire under a roof of vine leaves.
function arbours(R, k, t, o) {
  const d = o.d || 0.78;
  const seed = o.seed || 3;
  const base = layerY(R, d, o.baseScreenY);
  const h = hazeOf(k);
  const lit = smooth(0.3, 1, k);
  R.layer(d);
  R.paint((c) => {
    // the ground they stand on
    c.fillStyle = toward('#7b6c4c', h, 0.18);
    c.fillRect(R.cam.x * d - halfW(R, d), base, 2 * halfW(R, d), 600);
    cells(R, d, 340, (i, x) => {
      const r = rng(i * 313 + seed);
      if (x < (o.from ?? -1e9) * d) return;
      if (r() < 0.2) return;
      const w = 200 + r() * 110;
      const hh = (o.low || 104) + r() * 16;
      const x0 = x + r() * 20;
      // posts and the wire between them
      c.fillStyle = toward('#3b2f24', h, 0.2);
      for (let px = x0; px <= x0 + w; px += 64) c.fillRect(px - 1.6, base - hh, 3.2, hh);
      // the roof of leaves: a bumpy band, dark under, bright where the sun gets it
      const top = (u) => base - hh - 6 - Math.sin(u * 17 + i) * 6 - Math.sin(u * 5.3 + i * 2) * 5;
      c.fillStyle = toward('#40562a', h, 0.2);
      c.beginPath();
      c.moveTo(x0 - 6, base - hh + 24);
      for (let u = 0; u <= 1.001; u += 0.03) c.lineTo(x0 - 6 + u * (w + 12), top(u));
      c.lineTo(x0 + w + 6, base - hh + 24 + r() * 8);
      for (let u = 1; u >= 0; u -= 0.05) c.lineTo(x0 - 6 + u * (w + 12), base - hh + 24 + Math.sin(u * 23 + i) * 7);
      c.closePath();
      c.fill();
      // leaf clumps catching the light
      for (let n = 0; n < 16; n++) {
        const u = r();
        c.fillStyle = toward(r() < 0.5 ? '#5f7a38' : '#74883f', h, 0.15);
        c.beginPath();
        c.ellipse(x0 + u * w, top(u) + 7 + r() * 12, 10 + r() * 9, 6 + r() * 4, 0, 0, Math.PI * 2);
        c.fill();
      }
      // bunches hanging underneath, small and green
      for (let n = 0; n < 12; n++) {
        const bx = x0 + 6 + r() * (w - 12);
        c.fillStyle = toward(r() < 0.8 ? '#8ea24a' : '#6b5a7a', h, 0.15);
        c.beginPath();
        c.ellipse(bx, base - hh + 34 + r() * 8, 2.6, 5, 0, 0, Math.PI * 2);
        c.fill();
      }
      // the shade under the canopy
      const sh = c.createLinearGradient(0, base - hh + 22, 0, base);
      sh.addColorStop(0, 'rgba(14,16,10,0.4)');
      sh.addColorStop(1, 'rgba(14,16,10,0.0)');
      c.fillStyle = sh;
      c.fillRect(x0, base - hh + 22, w, hh - 22);
    });
  });
  // the sun through the leaves: gold edges
  if (lit > 0.05) {
    R.glow((c) => {
      cells(R, d, 340, (i, x) => {
        const r = rng(i * 313 + seed);
        if (x < (o.from ?? -1e9) * d || r() < 0.2) return;
        const w = 200 + r() * 110;
        const hh = (o.low || 104) + r() * 16;
        const x0 = x + r() * 20;
        const g2 = c.createLinearGradient(x0, 0, x0 + w, 0);
        g2.addColorStop(0, 'rgba(255,200,110,0)');
        g2.addColorStop(1, `rgba(255,200,110,${0.2 * lit})`);
        c.fillStyle = g2;
        c.fillRect(x0, base - hh - 14, w, 22);
      });
    });
  }
  R.layer(1);
}

// Grass and thistle seen against the light, very close.
function nearGrass(R, k, seed) {
  const d = 1.22;
  R.layer(d);
  const base = layerY(R, d, R.H + 6);
  R.paint((c) => {
    c.fillStyle = 'rgba(22,20,12,0.9)';
    cells(R, d, 34, (i, x) => {
      const r = rng(i * 53 + seed);
      if (r() < 0.5) return;
      const n = 3 + Math.floor(r() * 5);
      for (let b = 0; b < n; b++) {
        const bx = x + b * 4 + r() * 6;
        const hgt = 26 + r() * 60;
        c.beginPath();
        c.moveTo(bx - 2, base);
        c.quadraticCurveTo(bx + (r() - 0.3) * 14, base - hgt * 0.6, bx + (r() - 0.2) * 26, base - hgt);
        c.quadraticCurveTo(bx + 4, base - hgt * 0.5, bx + 2, base);
        c.fill();
      }
    });
  });
  R.layer(1);
}

// Dust motes and long gold light across the open ground.
function openLight(R, g, k, vx, vy) {
  const lit = smooth(0.4, 1, k);
  if (lit < 0.02) return;
  const cx = R.cam.x;
  const span = Math.max(1600, R.cam.view * 0.75);
  R.glow((c) => {
    // a low golden haze lying along the ground, thickest toward the sun
    const g1 = c.createLinearGradient(cx - span, 0, vx, 0);
    g1.addColorStop(0, 'rgba(255,196,120,0)');
    g1.addColorStop(1, `rgba(255,196,120,${0.28 * lit})`);
    c.fillStyle = g1;
    c.fillRect(cx - span, vy - 40, vx - cx + span, 40 - vy + 40);
  });
  T.motes(R, cx, g.time, (k - 0.3) * 0.9);
}

// ===================================================== the edge road ==

const EDGE_BLOCKS = [
  { x: 57200, w: 640, floors: 3, fh: 138, color: '#a2977f', seed: 801, mat: 'plaster', torn: 0.5, tornLeft: true, noDoors: true, holes: [[0.55, 0.5, 22]] },
  { x: 57840, w: 520, floors: 2, fh: 140, color: '#9f9480', seed: 802, mat: 'limestone', torn: 0.45, tornLeft: false, laundry: true, balcony: [1, 0.3, 0.03] },
  { x: 58370, w: 340, floors: 1, fh: 150, color: '#ada390', seed: 803, mat: 'concrete', noDoors: true, torn: 0.4, tornLeft: true },
];

export function drawEdgeRoad(R, g, { k = 1, t = g.time } = {}) {
  k = clamp(k);
  const cx = R.cam.x;
  const view = R.cam.view;
  const vis = Math.max(1700, view * 0.78);
  const near = (x0, x1) => x1 > cx - vis && x0 < cx + vis;
  const f1 = R.cam.frame(R.W, R.H, 1);
  const sunX = 0.9;
  const hzY = horizonY(R);
  const sunR = R.H * 0.11;
  // the sun sits on the horizon, half of it up
  dawnSky(R, g, k, { open: true, hy: hzY / R.H, sunR, sunX, sunY: (hzY - sunR * 0.5) / R.H });

  const vx = layerX(R, 1, sunX * R.W);
  const vy = (hzY - f1.oy) / f1.s;
  const A0 = -90;
  const B0 = 90;
  const lam = (x) => (vx - x) / (vx - cx);
  const yA = (x) => vy + (A0 - vy) * lam(x);
  const yB = (x) => vy + (B0 - vy) * lam(x);
  const xL = cx - vis;
  const baseScreen = f1.oy + A0 * f1.s;

  farPlain(R, k, { seed: 5, pylons: true, haze: 0.36, furrow: 0.3, bare: 0.3, fields: ['#5f6c3e', '#76733f', '#566638', '#80763f', '#64703f'] });
  // a nearer row of farms and poplars by the road
  arbours(R, k, t, { d: 0.62, seed: 9, from: 58900, baseScreenY: baseScreen - 4, low: 64 });
  arbours(R, k, t, { d: 0.8, seed: 3, from: 58750, baseScreenY: baseScreen + 2, low: 74 });

  // the verge: dry grass, thistle and dust, as far as the road's far edge
  const h = hazeOf(k);
  R.paint((c) => {
    c.fillStyle = '#6f6a40';
    c.fillRect(xL, A0, 2 * vis, 700);
    const vg = c.createLinearGradient(0, A0, 0, A0 + 160);
    vg.addColorStop(0, 'rgba(120,110,60,0.0)');
    vg.addColorStop(1, 'rgba(30,26,12,0.3)');
    c.fillStyle = vg;
    c.fillRect(xL, A0, 2 * vis, 160);
    const r = rng(41);
    for (let x = Math.floor((cx - vis) / 24) * 24; x < cx + vis; x += 24) {
      const q = rng(Math.floor(x / 24) * 7 + 1);
      if (q() < 0.25) continue;
      c.strokeStyle = q() < 0.5 ? '#55562e' : '#94854a';
      c.lineWidth = 1.2;
      c.beginPath();
      const by = A0 + 4 + q() * 30;
      c.moveTo(x, by);
      c.quadraticCurveTo(x + 3, by - 12, x + 8 + q() * 6, by - 18 - q() * 12);
      c.stroke();
    }
    void r;
    void h;
  });

  // ---- the road itself, running to the sun
  R.paint((c) => {
    const rd = c.createLinearGradient(xL, 0, vx, 0);
    rd.addColorStop(0, '#7e6f58');
    rd.addColorStop(1, '#b89a6c');
    c.fillStyle = rd;
    c.beginPath();
    c.moveTo(xL, yA(xL));
    c.lineTo(vx, vy);
    c.lineTo(xL, yB(xL));
    c.closePath();
    c.fill();
    // shoulders: a paler band of dust along both edges
    c.fillStyle = 'rgba(214,196,160,0.35)';
    for (const [t0, t1] of [[0, 0.07], [0.93, 1]]) {
      c.beginPath();
      c.moveTo(xL, yA(xL) + (yB(xL) - yA(xL)) * t0);
      c.lineTo(vx, vy);
      c.lineTo(xL, yA(xL) + (yB(xL) - yA(xL)) * t1);
      c.fill();
    }
    // wheel ruts
    for (const rt of [0.33, 0.68]) {
      c.fillStyle = 'rgba(60,46,32,0.36)';
      c.beginPath();
      c.moveTo(xL, yA(xL) + (yB(xL) - yA(xL)) * (rt - 0.045));
      c.lineTo(vx, vy);
      c.lineTo(xL, yA(xL) + (yB(xL) - yA(xL)) * (rt + 0.045));
      c.fill();
    }
    // stones, ruts' crumbs and dried mud
    for (let x = Math.floor((xL) / 40) * 40; x < vx; x += 40) {
      const q = rng(Math.floor(x / 40) * 11 + 3);
      const l = lam(x);
      if (l <= 0.05) continue;
      for (let n = 0; n < 3; n++) {
        if (q() < 0.4) continue;
        const ty = yA(x) + (yB(x) - yA(x)) * (0.05 + q() * 0.9);
        c.fillStyle = `rgba(${150 + q() * 50},${130 + q() * 30},${100 + q() * 30},0.8)`;
        c.fillRect(x + q() * 30, ty, (2 + q() * 4) * Math.min(1, l), (2 + q() * 2) * Math.min(1, l));
      }
    }
  });
  R.surface((c) => {
    c.moveTo(xL, yA(xL));
    c.lineTo(vx, vy);
    c.lineTo(xL, yB(xL));
    c.closePath();
  }, 'asphalt', { scale: 1.6, seed: 4, alpha: 0.3 });

  // potholes, in the road's own perspective
  for (let x = Math.floor(xL / 150) * 150; x < vx - 40; x += 150) {
    const q = rng(Math.floor(x / 150) * 19 + 7);
    if (q() < 0.3) continue;
    const l = lam(x);
    const sx = x + q() * 80;
    const ty = yA(sx) + (yB(sx) - yA(sx)) * (0.12 + q() * 0.76);
    const w = (30 + q() * 40) * Math.min(1.6, lam(sx)) ;
    const hh = w * 0.2;
    R.paint((c) => {
      c.fillStyle = 'rgba(40,30,22,0.78)';
      c.beginPath();
      c.ellipse(sx, ty, w, hh, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(210,190,150,0.5)';
      c.beginPath();
      c.ellipse(sx, ty - hh * 0.35, w * 0.95, hh * 0.55, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(30,22,16,0.8)';
      c.beginPath();
      c.ellipse(sx + w * 0.1, ty + hh * 0.1, w * 0.8, hh * 0.7, 0, 0, Math.PI * 2);
      c.fill();
    });
    // dew standing in it, holding the sky
    R.glow((c) => {
      c.fillStyle = k > 0.5 ? `rgba(255,214,150,${0.45 * smooth(0.4, 1, k)})` : 'rgba(140,160,215,0.2)';
      c.beginPath();
      c.ellipse(sx + w * 0.15, ty + hh * 0.15, w * 0.7, hh * 0.5, 0, 0, Math.PI * 2);
      c.fill();
    });
  }
  // the sun on the road: a path of gold to the horizon
  const lit = smooth(0.3, 1, k);
  R.glow((c) => {
    const g1 = c.createLinearGradient(cx - 200, 0, vx, 0);
    g1.addColorStop(0, 'rgba(255,200,120,0)');
    g1.addColorStop(0.7, `rgba(255,206,130,${0.08 * lit})`);
    g1.addColorStop(1, `rgba(255,236,190,${0.45 * lit})`);
    c.fillStyle = g1;
    c.beginPath();
    c.moveTo(cx - 200, yA(cx - 200));
    c.lineTo(vx, vy);
    c.lineTo(cx - 200, yB(cx - 200));
    c.fill();
    // water in the ruts, bright strips
    for (const rt of [0.33, 0.68]) {
      c.fillStyle = `rgba(255,224,170,${0.22 * lit})`;
      c.beginPath();
      c.moveTo(cx, yA(cx) + (yB(cx) - yA(cx)) * (rt - 0.012));
      c.lineTo(vx, vy);
      c.lineTo(cx, yA(cx) + (yB(cx) - yA(cx)) * (rt + 0.012));
      c.fill();
    }
  });

  // the last buildings, at the left end of the road
  for (const b of EDGE_BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  if (near(58700, 59200)) {
    // a garden wall, a gate with its leaf hanging, the first vine over it
    T.lowWall(R, 58720, 190, 96, '#a79a84');
    T.rubble(R, 58880, 150, 52, { seed: 811, color: '#a39a8c' });
    T.vine(R, 59020, t, { wallH: 90, lush: 1 });
    R.cast((c) => {
      c.fillStyle = '#4a3a2c';
      c.fillRect(58930, -130, 8, 130);
      c.save();
      c.translate(58934, -126);
      c.rotate(0.35);
      c.fillStyle = '#51463a';
      c.fillRect(0, 0, 70, 6);
      c.fillRect(0, 40, 70, 6);
      c.fillRect(0, 0, 6, 100);
      c.restore();
    });
  }

  // things beside the road: a signpost shot through, a barrel, a cart wheel
  if (near(59300, 59500)) {
    R.cast((c) => {
      c.fillStyle = '#3a342d';
      c.fillRect(59380, -150, 5, 150);
      c.save();
      c.translate(59382, -146);
      c.rotate(0.18);
      c.fillStyle = '#2a5f8a';
      c.fillRect(-36, -6, 74, 24);
      c.fillStyle = '#e9e4d4';
      c.fillRect(-32, -2, 66, 1.4);
      c.fillRect(-32, 14, 66, 1.4);
      c.fillStyle = '#1a1612';
      for (const [bx, by] of [[-14, 6], [6, 9], [18, 4], [-4, 12]]) {
        c.beginPath();
        c.arc(bx, by, 2.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    });
  }
  if (near(60400, 60600)) {
    R.cast((c) => {
      // a drum on its side, rust-red, and a cart wheel against it
      c.fillStyle = '#7a3f2c';
      c.fillRect(60450, -36, 44, 36);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(60450, -26, 44, 3);
      c.fillRect(60450, -12, 44, 3);
      c.strokeStyle = '#4a3a2c';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(60520, -26, 26, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 1.6;
      for (let a = 0; a < 6; a++) {
        c.beginPath();
        c.moveTo(60520, -26);
        c.lineTo(60520 + Math.cos(a * 1.047) * 26, -26 + Math.sin(a * 1.047) * 26);
        c.stroke();
      }
    });
  }
  T.cables(R, cx, { seed: 205, from: 58800, to: 62600 });

  g.act?.drawProps?.(R, g);
  people(R, g, k, near);
  openLight(R, g, k, vx, vy);
  g.effects?.draw?.(R);
  nearGrass(R, k, 77);
}

// ====================================================== the farm edge ==

// A building of dry-laid stone, flat-roofed, its parapet and its thickness.
function stoneBox(R, x, w, h, o = {}) {
  const col = o.color || '#a39880';
  R.cast((c) => {
    const pts = [[x, 0], [x, -h], [x + w, -h], [x + w, 0]];
    extrudePoly(c, pts, o.depth || 40, { color: col });
    c.fillStyle = col;
    c.fillRect(x, -h, w, h);
    // courses of rough stone, each block a shade apart
    const r = rng(o.seed || 1);
    c.save();
    c.beginPath();
    c.rect(x, -h, w, h);
    c.clip();
    for (let row = 0; row * 17 < h; row++) {
      const y0 = -h + row * 17;
      for (let bx = x - (row % 2) * 14; bx < x + w; bx += 28 + r() * 10) {
        const v = (r() - 0.5) * 0.2;
        c.fillStyle = v > 0 ? `rgba(255,246,226,${v})` : `rgba(40,30,20,${-v})`;
        c.fillRect(bx + 1, y0 + 1, 24, 14);
      }
      c.fillStyle = 'rgba(60,48,36,0.35)';
      c.fillRect(x, y0 + 16, w, 1.5);
    }
    const dg = c.createLinearGradient(0, 0, 0, -36);
    dg.addColorStop(0, 'rgba(50,40,30,0.35)');
    dg.addColorStop(1, 'rgba(50,40,30,0)');
    c.fillStyle = dg;
    c.fillRect(x, -36, w, 36);
    c.restore();
    // parapet, a course proud of the wall
    extrudeRect(c, x - 4, -h - 10, w + 8, 12, (o.depth || 40) + 4, { color: col });
    c.fillStyle = col;
    c.fillRect(x - 4, -h - 10, w + 8, 12);
    c.fillStyle = 'rgba(255,250,236,0.2)';
    c.fillRect(x - 4, -h - 10, w + 8, 1.6);
  });
  R.surface((c) => c.rect(x, -h, w, h), 'limestone', { scale: 0.7, seed: o.seed || 1, alpha: 0.7 });
}

function farmPlain(R, k, t, cx, vis, near) {
  const E = END.edge[0];
  const hw = END.edge[1];
  const doorX = E + hw - 160;

  // ---- the farmhouse
  if (near(E - 880, E - 380)) {
    const x = E - 840;
    // a lean-to of corrugated tin on poles, bales under it
    R.cast((c) => {
      c.fillStyle = '#4a3a2c';
      c.fillRect(x - 130, -90, 6, 90);
      c.fillRect(x - 6, -112, 6, 112);
      c.fillStyle = '#7d7f7a';
      c.beginPath();
      c.moveTo(x - 140, -92);
      c.lineTo(x + 4, -118);
      c.lineTo(x + 4, -110);
      c.lineTo(x - 140, -84);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        c.beginPath();
        c.moveTo(x - 138 + i * 12, -92 + i * 2);
        c.lineTo(x - 138 + i * 12, -84 + i * 2);
        c.stroke();
      }
      // straw bales stacked
      c.fillStyle = '#c4a85c';
      for (const [bx, by] of [[x - 120, 0], [x - 84, 0], [x - 102, -26], [x - 60, 0]]) {
        c.fillRect(bx, by - 26, 34, 26);
        c.fillStyle = 'rgba(80,60,20,0.35)';
        c.fillRect(bx, by - 14, 34, 1.4);
        c.fillStyle = '#c4a85c';
      }
    });
    stoneBox(R, x, 460, 190, { seed: 4, color: '#a69b82' });
    R.paint((c) => {
      // a doorway hung with a blanket, two barred slits
      c.fillStyle = '#17120e';
      c.fillRect(x + 90, -118, 62, 118);
      c.fillStyle = '#7a5a46';
      c.beginPath();
      c.moveTo(x + 88, -122);
      c.lineTo(x + 156, -122);
      c.lineTo(x + 150, -34);
      c.lineTo(x + 94, -28);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 6; i++) c.fillRect(x + 92, -118 + i * 14, 60, 2);
      for (const wx of [x + 250, x + 360]) {
        c.fillStyle = '#16120e';
        c.fillRect(wx, -128, 38, 44);
        c.strokeStyle = '#3a3a3a';
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 1; i < 4; i++) {
          c.moveTo(wx + i * 9.5, -128);
          c.lineTo(wx + i * 9.5, -84);
        }
        c.stroke();
      }
      // strings of dried red peppers beside the door
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = '#4a3a2c';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + 176 + i * 9, -150);
        c.lineTo(x + 176 + i * 9, -150 + 56 + i * 6);
        c.stroke();
        c.fillStyle = '#a32f1e';
        for (let n = 0; n < 6; n++) c.fillRect(x + 173 + i * 9, -146 + n * 9, 6, 8);
      }
    });
    // the ladder to the roof, and the water tank up there
    R.cast((c) => {
      c.strokeStyle = '#5a4630';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + 410, 0);
      c.lineTo(x + 440, -196);
      c.moveTo(x + 428, 0);
      c.lineTo(x + 458, -196);
      c.stroke();
      c.lineWidth = 2;
      for (let i = 1; i < 9; i++) {
        c.beginPath();
        c.moveTo(x + 410 + 2.2 * i * 1.7 - 0, -i * 22);
        c.lineTo(x + 428 + 2.2 * i * 1.7, -i * 22);
        c.stroke();
      }
      c.fillStyle = '#2f4a6a';
      c.beginPath();
      c.ellipse(x + 120, -222, 28, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(x + 92, -222, 56, 14);
      c.fillStyle = '#3a3a3a';
      c.fillRect(x + 100, -204, 4, 14);
      c.fillRect(x + 136, -204, 4, 14);
    });
  }

  // ---- the collapsed house: one corner wall still up, the roof lying in it
  if (near(E - 340, E + 60)) {
    const x = E - 340;
    T.rubble(R, x + 40, 280, 100, { seed: 91, color: '#a0957f' });
    R.cast((c) => {
      const wp = [[x, 0], [x, -212], [x + 24, -230], [x + 40, -196], [x + 66, -204], [x + 74, -150], [x + 68, 0]];
      extrudePoly(c, wp, 30, { color: '#a69b82' });
      c.fillStyle = '#a69b82';
      c.beginPath();
      wp.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.fill();
      c.fillStyle = '#17120e';
      c.fillRect(x + 20, -170, 28, 46);
      c.strokeStyle = '#4a3a2c';
      c.lineWidth = 3;
      c.strokeRect(x + 18, -172, 32, 50);
      // the roof slab slid down, one edge on the heap, rebar out of it
      const sl = [[x + 100, -120], [x + 250, -64], [x + 252, -48], [x + 100, -102]];
      extrudePoly(c, sl, 26, { top: '#b4aa98', side: '#4a4339' });
      c.fillStyle = '#948b7b';
      c.beginPath();
      sl.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.fill();
      c.strokeStyle = '#4a3b2e';
      c.lineWidth = 1.8;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        c.moveTo(x + 100 + i * 2, -118 + i * 4);
        c.quadraticCurveTo(x + 84 + i * 3, -144, x + 74 + i * 6, -166 - i * 4);
      }
      c.stroke();
    });
    // a child's chair among the stones; a goat's tether
    R.cast((c) => {
      c.fillStyle = '#7a5a46';
      c.fillRect(x + 300, -22, 18, 3);
      c.fillRect(x + 300, -44, 3, 24);
      c.fillRect(x + 300, -20, 3, 20);
      c.fillRect(x + 315, -20, 3, 20);
    });
  }

  // ---- the dry-stone wall, a well, olive crates, a tyre
  if (near(E + 60, E + 520)) {
    R.cast((c) => {
      const x0 = E + 80;
      const pts = [[x0, 0], [x0, -76], [x0 + 150, -80], [x0 + 150, 0]];
      for (const [a, b] of [[x0, x0 + 150], [x0 + 250, x0 + 440]]) {
        const p = [[a, 0], [a, -78 + (a % 7)], [a + 40, -84], [b - 20, -74], [b, -80], [b, 0]];
        extrudePoly(c, p, 24, { color: '#a69b82' });
        c.fillStyle = '#a69b82';
        c.beginPath();
        p.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.16)';
        for (let y = -62; y < 0; y += 16) c.fillRect(a, y, b - a, 1.5);
        c.fillStyle = 'rgba(255,246,226,0.1)';
        for (let bx = a + 10; bx < b; bx += 34) c.fillRect(bx, -80 + ((bx / 9) % 3) * 4, 22, 12);
      }
      void pts;
      // gate posts
      c.fillStyle = '#8f8572';
      c.fillRect(x0 + 150, -112, 16, 112);
      c.fillRect(x0 + 234, -112, 16, 112);
      // a well: ring of stone, a beam and pulley, a bucket
      const wx = E + 500;
      extrudeRect(c, wx - 30, -52, 60, 52, 22, { color: '#a69b82' });
      c.fillStyle = '#a69b82';
      c.fillRect(wx - 30, -52, 60, 52);
      c.fillStyle = '#17120e';
      c.fillRect(wx - 22, -52, 44, 10);
      c.strokeStyle = '#4a3a2c';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(wx - 28, -52);
      c.lineTo(wx - 28, -116);
      c.lineTo(wx + 28, -116);
      c.lineTo(wx + 28, -52);
      c.stroke();
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(wx, -116);
      c.lineTo(wx, -74);
      c.stroke();
      c.fillStyle = '#6a6a66';
      c.fillRect(wx - 6, -74, 12, 12);
      // olive crates in a stack, and a tyre
      c.fillStyle = '#8a6a3e';
      for (const [bx, by] of [[E + 190, 0], [E + 226, 0], [E + 208, -24]]) {
        c.fillRect(bx, by - 24, 34, 24);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(bx + 2, by - 18, 30, 2);
        c.fillRect(bx + 2, by - 8, 30, 2);
        c.fillStyle = '#8a6a3e';
      }
      c.strokeStyle = '#1e1c1a';
      c.lineWidth = 9;
      c.beginPath();
      c.ellipse(E + 40, -18, 17, 17, 0, 0, Math.PI * 2);
      c.stroke();
    });
  }

  // ---- the lone building at the right: its door leads down
  if (near(doorX - 300, doorX + 300)) {
    const bx = doorX - 190;
    const bw = 330;
    // fresh earth under a tarpaulin behind it, and a barrow
    R.cast((c) => {
      c.fillStyle = '#9a8a6c';
      c.beginPath();
      c.moveTo(bx + bw + 4, 0);
      c.quadraticCurveTo(bx + bw + 40, -50, bx + bw + 90, -46);
      c.quadraticCurveTo(bx + bw + 126, -28, bx + bw + 150, 0);
      c.fill();
      c.fillStyle = '#3d5a6a';
      c.beginPath();
      c.moveTo(bx + bw + 20, -20);
      c.quadraticCurveTo(bx + bw + 52, -52, bx + bw + 96, -40);
      c.lineTo(bx + bw + 106, -20);
      c.fill();
      c.fillStyle = '#6a6a66';
      c.fillRect(bx + bw + 130, -28, 34, 14);
      c.fillRect(bx + bw + 160, -30, 22, 3);
      c.strokeStyle = '#3a3a3a';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(bx + bw + 168, -9, 9, 0, Math.PI * 2);
      c.stroke();
    });
    // the building: raw concrete block, an unfinished upper storey's rebar
    R.cast((c) => {
      const h = 188;
      const pts = [[bx, 0], [bx, -h], [bx + bw, -h], [bx + bw, 0]];
      extrudePoly(c, pts, 44, { color: '#9a9a96' });
      c.fillStyle = '#9a9a96';
      c.fillRect(bx, -h, bw, h);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = -h + 20; y < 0; y += 20) c.fillRect(bx, y, bw, 1.5);
      for (let row = 0; row * 20 < h; row++) {
        for (let x = bx + (row % 2) * 24; x < bx + bw; x += 48) c.fillRect(x, -h + row * 20, 1.5, 20);
      }
      c.strokeStyle = '#4a3328';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const sx = bx + 14 + i * 44;
        c.moveTo(sx, -h - 8);
        c.lineTo(sx + (i % 3 - 1) * 3, -h - 52 - (i % 2) * 14);
      }
      c.stroke();
      // a sheet-tin roof flung over half of it
      c.fillStyle = '#6f736e';
      c.beginPath();
      c.moveTo(bx - 20, -h - 4);
      c.lineTo(bx + 210, -h - 30);
      c.lineTo(bx + 210, -h - 22);
      c.lineTo(bx - 20, 4 - h);
      c.fill();
    });
    R.surface((c) => c.rect(bx, -188, bw, 188), 'concrete', { scale: 1.1, seed: 6, alpha: 0.5 });
    // the door that leads down: a cut in the ground, steps, the door below
    R.paint((c) => {
      c.fillStyle = '#05060a';
      c.fillRect(doorX - 60, -4, 120, 76);
      holeReveal(c, [[doorX - 60, -4], [doorX + 60, -4], [doorX + 60, 72], [doorX - 60, 72]], 24, '#2a2c36');
      for (let i = 0; i < 5; i++) {
        c.fillStyle = `rgb(${120 - i * 12},${110 - i * 11},${96 - i * 10})`;
        c.fillRect(doorX - 56 + i * 12, 2 + i * 10, 12, 4);
      }
      // the door itself, planks, set low in the wall, ajar
      c.fillStyle = '#3a2b1f';
      c.fillRect(doorX + 8, 28, 46, 44);
      c.fillStyle = '#0a0806';
      c.fillRect(doorX + 34, 28, 20, 44);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 1; i < 4; i++) c.fillRect(doorX + 8 + i * 8, 28, 1.4, 44);
      extrudeRect(c, doorX - 66, -8, 12, 12, 18, { color: '#9a9a96' });
      extrudeRect(c, doorX + 54, -8, 12, 12, 18, { color: '#9a9a96' });
    });
    // a plank awning over the stairwell, sandbags either side
    R.cast((c) => {
      c.fillStyle = '#5a4630';
      c.fillRect(doorX - 56, -86, 4, 82);
      c.fillRect(doorX + 52, -86, 4, 82);
      c.fillRect(doorX - 66, -92, 132, 8);
      c.fillStyle = '#b8a888';
      for (const sx of [doorX - 98, doorX + 66]) {
        for (let r2 = 0; r2 < 2; r2++) {
          for (let i = 0; i < 2 - r2; i++) {
            c.beginPath();
            c.ellipse(sx + 16 + i * 30 + r2 * 15, -9 - r2 * 16, 15, 9, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    });
    // a very thin warm line under the door: someone is down there
    R.glow((c) => {
      const fl = 0.8 + 0.2 * Math.sin(t * 4.1);
      const g2 = c.createRadialGradient(doorX + 44, 62, 0, doorX + 44, 62, 40);
      g2.addColorStop(0, `rgba(255,190,110,${0.28 * fl})`);
      g2.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g2;
      c.fillRect(doorX - 10, 20, 100, 60);
    });
  }
  void cx;
  void vis;
}

export function drawFarmEdge(R, g, { k = 0.25, t = g.time } = {}) {
  k = clamp(k);
  const cx = R.cam.x;
  const vis = Math.max(1700, R.cam.view * 0.78);
  const near = (x0, x1) => x1 > cx - vis && x0 < cx + vis;
  const hzY = horizonY(R);
  dawnSky(R, g, k, { open: true, hy: hzY / R.H, sunR: R.H * 0.03 });
  const f1 = R.cam.frame(R.W, R.H, 1);

  farPlain(R, k, { seed: 12, pylons: true, bare: 0.5, furrow: 0.3, haze: 0.42, fields: ['#6a6d52', '#74714f', '#5f6648', '#7a7552', '#65694c'] });
  // the siege line: a long earth berm and a watchtower on it, far off
  {
    const d = 0.55;
    const base = layerY(R, d, hzY + 14);
    const h = hazeOf(k);
    const c0 = cx * d;
    const hw = halfW(R, d);
    R.layer(d);
    R.paint((c) => {
      c.fillStyle = toward('#6a6048', h, 0.5);
      c.beginPath();
      c.moveTo(c0 - hw, base);
      for (let x = c0 - hw; x <= c0 + hw; x += 40) c.lineTo(x, base - 12 - Math.sin(x * 0.011) * 4 - Math.sin(x * 0.037) * 2);
      c.lineTo(c0 + hw, base);
      c.fill();
      const tx = Math.round((c0 + 500) / 900) * 900 - 200;
      c.fillStyle = toward('#4a4438', h, 0.5);
      c.fillRect(tx, base - 46, 3, 36);
      c.fillRect(tx + 16, base - 46, 3, 36);
      c.fillRect(tx - 6, base - 56, 32, 12);
      c.beginPath();
      c.moveTo(tx - 9, base - 56);
      c.lineTo(tx + 9, base - 66);
      c.lineTo(tx + 29, base - 56);
      c.fill();
    });
    R.layer(1);
  }
  // olives and cypress nearer, in rows across the fields
  {
    const d = 0.75;
    const base = layerY(R, d, hzY + 40);
    const h = hazeOf(k);
    R.layer(d);
    R.paint((c) => {
      c.fillStyle = toward('#6e6a4c', h, 0.25);
      c.fillRect(cx * d - halfW(R, d), base, 2 * halfW(R, d), 600);
      cells(R, d, 90, (i, x) => {
        const r = rng(i * 41 + 17);
        const v = r();
        if (v < 0.4) return;
        if (v < 0.72) {
          // an olive: a knotted trunk and a grey-green cloud
          c.fillStyle = toward('#4a3f32', h, 0.2);
          c.fillRect(x - 2, base - 22, 5, 22);
          c.fillStyle = toward('#68735a', h, 0.22);
          for (let n = 0; n < 4; n++) {
            c.beginPath();
            c.ellipse(x + (n - 1.5) * 9, base - 30 - (n % 2) * 6, 13, 9, 0, 0, Math.PI * 2);
            c.fill();
          }
        } else {
          c.fillStyle = toward('#2f4030', h, 0.22);
          c.beginPath();
          c.ellipse(x, base - 46, 7, 48, 0, 0, Math.PI * 2);
          c.fill();
        }
      });
    });
    R.layer(1);
  }

  // the ground: dry earth, stubble, a worn track
  const groundTop = 0;
  R.paint((c) => {
    c.fillStyle = '#827656';
    c.fillRect(cx - vis, groundTop - 2, 2 * vis, 700);
    const g1 = c.createLinearGradient(0, 0, 0, 120);
    g1.addColorStop(0, 'rgba(0,0,0,0.0)');
    g1.addColorStop(1, 'rgba(0,0,0,0.2)');
    c.fillStyle = g1;
    c.fillRect(cx - vis, 0, 2 * vis, 120);
    // stubble
    for (let x = Math.floor((cx - vis) / 18) * 18; x < cx + vis; x += 18) {
      const q = rng(Math.floor(x / 18) * 13 + 2);
      if (q() < 0.35) continue;
      c.strokeStyle = q() < 0.5 ? '#a8955c' : '#6a6240';
      c.lineWidth = 1.2;
      const by = 4 + q() * 70;
      c.beginPath();
      c.moveTo(x, by);
      c.lineTo(x + (q() - 0.3) * 8, by - 8 - q() * 12);
      c.stroke();
    }
    // the track to the door: two pale lines worn in the earth
    c.fillStyle = 'rgba(214,196,156,0.35)';
    c.beginPath();
    c.moveTo(END.edge[0] - 1000, 14);
    c.lineTo(END.edge[0] + END.edge[1], 10);
    c.lineTo(END.edge[0] + END.edge[1], 24);
    c.lineTo(END.edge[0] - 1000, 34);
    c.fill();
  });
  R.surface((c) => c.rect(cx - vis, 6, 2 * vis, 700), 'asphalt', { scale: 2.0, seed: 3, alpha: 0.22 });

  farmPlain(R, k, t, cx, vis, near);

  T.cables(R, cx, { seed: 313, from: END.edge[0] - 1400, to: END.edge[0] + 1400, y: -300 });
  g.act?.drawProps?.(R, g);
  people(R, g, k, near);
  g.effects?.draw?.(R);
  nearGrass(R, k, 29);
  void f1;
}
