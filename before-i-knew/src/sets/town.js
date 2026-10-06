// The town: apartment blocks torn open by shelling, rubble, the sniper
// curtain, shops, the school, the corner with the dead olive tree.
// Every function paints through the renderer's layers (paint = lit backdrop,
// cast = lit and shadow-casting, glow = light sources).

import { rng, lerp, noise1 } from '../engine/util.js';
import { smoothPath } from '../rigs/shapes.js';
import { textureWall, heightWall, cloudCanvas } from '../engine/materials.js';
import { extrudePoly, extrudeRect, holeReveal, DEPTH } from './depth.js';

export const CONCRETE = ['#a99d89', '#9f9480', '#948874', '#ada390', '#91857a', '#a2977f'];

// ------------------------------------------------------------ sky & far --

// The wisp map in one colour (cached per colour, rounded so a slowly
// warming sky doesn't make a new one every frame).
const TINTED = new Map();
function tintedClouds(cv, col) {
  const q = col.map((v) => Math.round(v / 8) * 8);
  const key = q.join(',');
  let t = TINTED.get(key);
  if (t) return t;
  t = document.createElement('canvas');
  t.width = cv.width;
  t.height = cv.height;
  const x = t.getContext('2d');
  x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = `rgb(${q.join(',')})`;
  x.fillRect(0, 0, t.width, t.height);
  if (TINTED.size > 64) TINTED.clear();
  TINTED.set(key, t);
  return t;
}

export function sky(R, stops, { sun = [0.78, 0.16], warmth = 0, clouds = 0.5, cloudLit = null, cloudShade = null } = {}) {
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, R.H);
    for (const [p, col] of stops) g.addColorStop(p, col);
    c.fillStyle = g;
    c.fillRect(0, 0, R.W, R.H);
    // the sun's glare, warmer as the afternoon goes
    const sx = sun[0] * R.W;
    const sy = sun[1] * R.H;
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, R.W * 0.55);
    glow.addColorStop(0, `rgba(255,${238 - warmth * 40},${205 - warmth * 70},${0.35 + warmth * 0.1})`);
    glow.addColorStop(0.35, `rgba(255,${226 - warmth * 40},${190 - warmth * 70},0.1)`);
    glow.addColorStop(1, 'rgba(255,220,180,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, R.W, R.H);
    // high cloud, drifting: each band a stretched, tiled wisp map drawn
    // twice, a shaded underside and a lit top towards the sun
    if (clouds > 0) {
      const cv = cloudCanvas();
      const t = R.cam.time || 0;
      const lit = cloudLit || [255, 246 - warmth * 40, 226 - warmth * 80];
      const shd = cloudShade || [150, 140, 150];
      for (const [yk, sx, sy, spd, al] of [[0.06, 5.2, 0.55, 3, 0.55], [0.2, 3.4, 0.4, 6, 0.4]]) {
        const w = cv.width * sx;
        const h = cv.height * sy;
        const off = -((R.cam.x * 0.02 + t * spd) % w) - w;
        const y0 = R.H * yk;
        for (const [dy, col, a] of [[5, shd, 0.55], [0, lit, 1]]) {
          const tinted = tintedClouds(cv, col);
          c.save();
          c.globalAlpha = clouds * al * a;
          for (let x = off; x < R.W; x += w) c.drawImage(tinted, x, y0 + dy, w, h);
          c.restore();
        }
      }
    }
    // high thin haze streaks
    c.fillStyle = 'rgba(255,250,240,0.06)';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(R.W * (0.15 + i * 0.19), R.H * (0.12 + (i % 3) * 0.07), R.W * 0.16, R.H * 0.012, -0.04, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
}

// Distant roofline of the town, flat-topped blocks and a minaret or two.
export function skyline(R, { depth = 0.3, y = 0, color = '#8f8578', seed = 3, haze = null, x0 = -3000, x1 = 16000, minarets = [] }) {
  R.layer(depth);
  const draw = (c) => {
    const r = rng(seed);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0, y + 400);
    let x = x0;
    while (x < x1) {
      const w = 60 + r() * 140;
      const h = 60 + r() * 170;
      const broken = r() < 0.3;
      c.lineTo(x, y - h);
      if (broken) {
        c.lineTo(x + w * 0.4, y - h + 10);
        c.lineTo(x + w * 0.55, y - h * 0.65);
        c.lineTo(x + w * 0.7, y - h * 0.8);
      }
      c.lineTo(x + w, y - h);
      if (r() < 0.2) {
        c.lineTo(x + w, y - h - 14);
        c.lineTo(x + w + 6, y - h - 14);
        c.lineTo(x + w + 6, y - h);
      }
      x += w;
    }
    c.lineTo(x1, y + 400);
    c.closePath();
    c.fill();
    for (const mx of minarets) minaret(c, mx, y - 150, 0.8, color);
  };
  R.paint(draw);
  if (haze) {
    R.glow((c) => {
      c.globalAlpha = haze[1];
      const s = c.fillStyle;
      draw(proxy(c, haze[0]));
      c.fillStyle = s;
    });
  }
  R.layer(1);
}

// Replays a draw function on a context with its fills forced to one colour.
function proxy(c, color) {
  return new Proxy(c, {
    get(target, k) {
      const v = target[k];
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, k, v) {
      target[k] = k === 'fillStyle' || k === 'strokeStyle' ? color : v;
      return true;
    },
  });
}

export function minaret(c, x, y, s = 1, color = '#8f8578', cracked = true) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = color;
  c.fillRect(-12, -150, 24, 150);
  c.fillRect(-18, -120, 36, 8); // balcony
  c.fillRect(-8, -185, 16, 36);
  c.beginPath();
  c.moveTo(-10, -185);
  c.quadraticCurveTo(0, -215, 10, -185);
  c.fill();
  c.fillRect(-1, -228, 2, 16);
  if (cracked) {
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, -170);
    c.lineTo(2, -140);
    c.lineTo(-3, -110);
    c.lineTo(5, -80);
    c.stroke();
  }
  c.restore();
}

// A column of smoke or dust, rising and spreading.
export function plume(R, x, y, t, { depth = 0.3, age = 1, color = [120, 105, 90], height = 500, width = 120, alpha = 0.8 }) {
  if (age <= 0) return;
  R.layer(depth);
  R.paint((c) => {
    const r = rng(17);
    const h = height * Math.min(age, 1);
    // soft puffs: each fades to nothing at its edge, so the column has no rims
    for (let i = 0; i < 34; i++) {
      const k = i / 33;
      const py = y - k * h;
      const px = x + noise1(k * 4 + t * 0.2) * width * 0.4 * k + k * k * 80 + (r() - 0.5) * width * 0.3;
      const pr = (width * 0.45 + k * width * 1.1) * (0.7 + r() * 0.5);
      const shade = 0.75 + 0.35 * (1 - k) + r() * 0.1;
      const a = alpha * 0.55 * (1 - k * 0.6) * Math.min(1, age * 1.5);
      const rgb = `${(color[0] * shade) | 0},${(color[1] * shade) | 0},${(color[2] * shade) | 0}`;
      const grad = c.createRadialGradient(px, py, 0, px, py, pr);
      grad.addColorStop(0, `rgba(${rgb},${a})`);
      grad.addColorStop(0.55, `rgba(${rgb},${a * 0.6})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = grad;
      c.beginPath();
      c.arc(px, py, pr, 0, Math.PI * 2);
      c.fill();
    }
  });
  R.layer(1);
}

// ----------------------------------------------------------- buildings --

// A block of flats, drawn as a façade on the street's far side.
// spec: { x, w, floors, fh, color, seed, torn: 0…1 (corner torn away),
//         holes: [[fx, fy, r]], balcony: [floor, side], laundry, dishes,
//         shutters, graffiti: [text, fx, fy, size, color], sign }
// Render texture for a façade: patched repairs, blotches and hairline
// cracks. Drawn once per building into its own canvas, then reused.
const WEATHER = new Map();
function weathering(w, H, seed) {
  const key = `${w}x${H}:${seed}`;
  let cv = WEATHER.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(H);
  const c = cv.getContext('2d');
  const r = rng(seed * 31 + 7);
    for (let i = 0; i < Math.round(w / 45); i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,248,235,0.07)' : 'rgba(70,58,44,0.07)';
      c.fillRect(r() * w, r() * H, 20 + r() * 70, 14 + r() * 50);
    }
    // blotchy render texture
    for (let i = 0; i < Math.round((w * H) / 900); i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '255,250,240' : '60,48,36'},${0.03 + r() * 0.04})`;
      c.beginPath();
      c.arc(r() * w, r() * H, 2 + r() * 7, 0, Math.PI * 2);
      c.fill();
    }
    // hairline cracks
    c.strokeStyle = 'rgba(50,40,32,0.28)';
    c.lineWidth = 0.9;
    for (let i = 0; i < Math.max(2, Math.round(w / 140)); i++) {
      let cx0 = r() * w;
      let cy0 = r() * H;
      c.beginPath();
      c.moveTo(cx0, cy0);
      for (let k = 0; k < 5; k++) {
        cx0 += (r() - 0.5) * 22;
        cy0 += 8 + r() * 16;
        c.lineTo(cx0, cy0);
      }
      c.stroke();
    }
  WEATHER.set(key, cv);
  return cv;
}

// ------------------------------------------------------------ façades --
// How thick a block's outer wall is (world units): enough to read as
// masonry where it's been torn open.
const WALL = 24;
const hexOf = (c) => (c && c[0] === '#' && c.length === 7 ? c : '#8f857a');

// A torn edge seen in section: the broken block-work and concrete core
// between the face and the back of the wall, rough, with the dark of the
// hollow cores and the pale of fresh breaks.
function brokenSection(c, pts, d, seed) {
  const r = rng(seed * 3 + 1);
  const vx = DEPTH.x * d;
  const vy = DEPTH.y * d;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    // only the ragged edges (the straight walls are smooth render)
    if (Math.abs(bx - ax) < 1 || Math.abs(by - ay) < 1) continue;
    const len = Math.hypot(bx - ax, by - ay);
    for (let k = 0; k < len / 9; k++) {
      const t = r();
      const px = ax + (bx - ax) * t + vx * r();
      const py = ay + (by - ay) * t + vy * r();
      c.fillStyle = r() < 0.5 ? 'rgba(25,20,16,0.5)' : 'rgba(230,220,200,0.18)';
      c.fillRect(px - 2, py - 1.5, 3 + r() * 5, 2 + r() * 3);
    }
  }
}

// A building's face is drawn once, at a little over screen resolution, into
// two canvases: its colour (with the wall's material and all its windows,
// doors, holes and weathering) and its relief (the material's height, with
// windows and holes sunk in and the floor slabs standing proud).
const FACADES = new Map();
let FACADE_RES = 1.25;
// High quality bakes façades sharper (they hold up close in); the cache
// starts again at the new resolution.
export function setFacadeRes(k) {
  if (k === FACADE_RES) return;
  FACADE_RES = k;
  FACADES.clear();
}
function facade(spec, H, draw, mat, matSeed) {
  const key = JSON.stringify(spec) + mat;
  let F = FACADES.get(key);
  if (F) return F;
  const pad = 40;
  const x0 = spec.x - pad;
  const y0 = -H - pad;
  const w = spec.w + pad * 2;
  const h = H + pad * 2;
  const k = Math.min(FACADE_RES, 2048 / w, 2048 / h);
  const mk = () => {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k);
    cv.height = Math.ceil(h * k);
    const c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    return [cv, c];
  };
  const [alb, ca] = mk();
  const recess = [];
  draw(ca, recess);
  // relief: the material everywhere the wall is, then the openings sunk in
  const [hgt, ch] = mk();
  ch.drawImage(alb, x0, y0, w, h);
  ch.globalCompositeOperation = 'source-in';
  ch.fillStyle = 'rgb(128,128,128)';
  ch.fillRect(x0, y0, w, h);
  ch.globalCompositeOperation = 'source-atop';
  ch.beginPath();
  ch.rect(x0, y0, w, h);
  heightWall(ch, mat, { seed: matSeed });
  const fh = storeyH(spec);
  for (let f = 0; f <= spec.floors; f++) {
    // the slab edge stands out of the wall
    ch.fillStyle = 'rgb(225,225,225)';
    ch.fillRect(spec.x, -f * fh - 6, spec.w, 8);
  }
  for (const q of recess) {
    ch.fillStyle = 'rgb(18,18,18)';
    if (q.rect) {
      const [rx, ry, rw, rh] = q.rect;
      ch.fillRect(rx, ry, rw, rh);
      if (q.sill) {
        ch.fillStyle = 'rgb(235,235,235)';
        ch.fillRect(rx - 5, ry + rh - 1, rw + 10, 4);
      }
    } else if (q.poly) {
      if (q.ring) {
        // the render blown back from the hole
        const [hx, hy, hr] = q.ring;
        ch.fillStyle = 'rgb(70,70,70)';
        ch.beginPath();
        ch.arc(hx, hy, hr * 1.35, 0, Math.PI * 2);
        ch.fill();
        ch.fillStyle = 'rgb(18,18,18)';
      }
      ch.beginPath();
      ch.moveTo(...q.poly[0]);
      for (const p of q.poly.slice(1)) ch.lineTo(...p);
      ch.closePath();
      ch.fill();
    }
  }
  F = { alb, hgt, x0, y0, w, h };
  FACADES.set(key, F);
  return F;
}

// What stands on a flat roof in Ghouta: black water tanks, solar water
// heaters tilted to the south, an aerial, a dish.
function roofTop(R, spec, H, t) {
  const r = rng(spec.seed * 13 + 5);
  const { x, w } = spec;
  const top = -H;
  const items = [];
  const n = Math.max(1, Math.round(w / 170));
  for (let i = 0; i < n; i++) {
    const kind = r();
    const ix = x + 20 + ((i + 0.5) / n) * (w - 40) + (r() - 0.5) * 30;
    items.push([kind, ix, r()]);
  }
  R.paint((c) => {
    // the parapet
    c.fillStyle = shade(spec.color || CONCRETE[0], 0.82);
    c.fillRect(x - 4, top - 12, w + 8, 12);
    for (const [kind, ix, v] of items) {
      if (kind < 0.55) {
        // a black plastic water tank on a steel stand
        const tw = 34 + v * 10;
        const th = 30 + v * 8;
        c.fillStyle = '#2a2a2c';
        c.fillRect(ix - tw / 2 + 3, top - 20, 3, 8);
        c.fillRect(ix + tw / 2 - 6, top - 20, 3, 8);
        c.fillStyle = '#1d1d1f';
        c.beginPath();
        c.moveTo(ix - tw / 2, top - 20);
        c.lineTo(ix - tw / 2 + 2, top - 20 - th);
        c.quadraticCurveTo(ix, top - 26 - th, ix + tw / 2 - 2, top - 20 - th);
        c.lineTo(ix + tw / 2, top - 20);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.08)';
        for (let k = 1; k < 4; k++) c.fillRect(ix - tw / 2 + 1, top - 20 - (th * k) / 4, tw - 2, 1.5);
        if (v < 0.35) {
          // a shrapnel hole, and the stain where it bled dry
          c.fillStyle = '#0c0c0d';
          c.beginPath();
          c.arc(ix + tw * 0.15, top - 20 - th * 0.4, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      } else if (kind < 0.85) {
        // a solar water heater: tilted panel, tank on top
        c.save();
        c.translate(ix, top - 12);
        c.fillStyle = '#3c3a38';
        c.fillRect(-26, -4, 3, 4);
        c.fillRect(18, -26, 3, 26);
        c.fillStyle = '#20303c';
        c.beginPath();
        c.moveTo(-28, -4);
        c.lineTo(20, -30);
        c.lineTo(24, -24);
        c.lineTo(-24, 2);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(200,210,220,0.25)';
        c.lineWidth = 1;
        for (let k = 1; k < 5; k++) {
          c.beginPath();
          c.moveTo(-28 + k * 9.6, -4 - k * 5.2);
          c.lineTo(-24 + k * 9.6, 2 - k * 5.2);
          c.stroke();
        }
        c.fillStyle = '#b8b2a6';
        c.beginPath();
        c.ellipse(14, -38, 17, 7, -0.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      } else {
        // an aerial, bent
        c.strokeStyle = '#4a4440';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(ix, top - 12);
        c.lineTo(ix + 2, top - 70);
        c.stroke();
        c.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) {
          c.beginPath();
          c.moveTo(ix - 12 + k * 2, top - 50 - k * 6);
          c.lineTo(ix + 14 - k * 2, top - 52 - k * 6 + (k === 2 ? 6 : 0));
          c.stroke();
        }
      }
    }
  });
}

// Storeys to the people's scale (Sami is 170): a spec's nominal storey of
// about 140 is drawn 1.6 times as tall, so a door is a head above a man and
// a window sits at a real sill and head height. Lit-window overlays use
// windowRect() so they land on the same openings.
export const STOREY = 1.6;
export const storeyH = (spec) => (spec.fh ?? 140) * STOREY;
export const DOOR_H = 205;
const SILL = 86;
const windowCols = (spec) => Math.max(2, Math.round(spec.w / 110));
export function windowRect(spec, f, k) {
  const fh = storeyH(spec);
  const cols = windowCols(spec);
  const ww = Math.min(74, (spec.w / cols) * 0.66);
  const wh = Math.min(112, fh * 0.48);
  return [spec.x + ((k + 0.5) * spec.w) / cols - ww / 2, -f * fh - SILL - wh, ww, wh];
}

export function block(R, spec, t = 0) {
  const { x, w, floors, color = CONCRETE[0], seed = 1 } = spec;
  const fh = storeyH(spec);
  const H = floors * fh;
  const top = -H;
  const torn = spec.torn || 0;
  const tornLeft = spec.tornLeft ?? rng(seed + 7)() < 0.5;

  const mat = spec.mat || ['plaster', 'plaster', 'plaster', 'concrete', 'concrete', 'limestone'][seed % 6];
  const matSeed = 1 + (seed % 3);
  const F = facade(spec, H, (c, recess) => {
      const r = rng(seed);
      c.save();
      // outline with a torn corner
      let pts;
      if (torn > 0) {
        const tw = w * (0.3 + torn * 0.4);
        const th = H * (0.25 + torn * 0.45);
        const n = 7;
        if (tornLeft) {
          pts = [[x, 0], [x, top + th]];
          for (let i = 1; i < n; i++) pts.push([x + (tw * i) / n + (r() - 0.5) * 20, top + th - (th * i) / n + (r() - 0.5) * 30]);
          pts.push([x + tw, top], [x + w, top], [x + w, 0]);
        } else {
          pts = [[x, 0], [x, top], [x + w - tw, top]];
          for (let i = 1; i < n; i++) pts.push([x + w - tw + (tw * i) / n + (r() - 0.5) * 20, top + (th * i) / n + (r() - 0.5) * 30]);
          pts.push([x + w, top + th], [x + w, 0]);
        }
      } else pts = [[x, top], [x + w, top], [x + w, 0], [x, 0]];
      // the wall's thickness behind it: the parapet's top, the end wall, and
      // where it was torn, the broken section through the block-work
      extrudePoly(c, pts, WALL, { color: hexOf(color) });
      if (torn > 0) brokenSection(c, pts, WALL, seed);
      c.beginPath();
      c.moveTo(...pts[0]);
      for (const q of pts.slice(1)) c.lineTo(...q);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      c.clip();
      // flats re-rendered in other colours over the years, one patch each
      for (let i = 0; i < Math.round(w / 160); i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(255,244,225,0.10)' : 'rgba(120,96,80,0.10)';
        const pf = Math.floor(r() * floors);
        c.fillRect(x + r() * w * 0.8, -pf * fh - fh, w * (0.15 + r() * 0.25), fh);
      }
      // the wall's material, over its colour
      textureWall(c, mat, { seed: matSeed });
      // bleached by sun at the top, dirtier towards the street
      const bleach = c.createLinearGradient(0, top, 0, 0);
      bleach.addColorStop(0, 'rgba(255,248,236,0.10)');
      bleach.addColorStop(0.6, 'rgba(255,248,236,0)');
      bleach.addColorStop(1, 'rgba(50,38,28,0.14)');
      c.fillStyle = bleach;
      c.fillRect(x, top, w, H);

      // weathering: sun-bleached and dirty render, patched repairs, cracks
      c.fillStyle = 'rgba(60,50,40,0.08)';
      for (let i = 0; i < 12; i++) c.fillRect(x + r() * w, top, 2 + r() * 10, H);
      // (the fine texture is drawn once per building and reused every frame)
      c.drawImage(weathering(w, H, seed), x, top);
      for (let f = 0; f <= floors; f++) {
        const sy = -f * fh - 6;
        c.fillStyle = 'rgba(40,32,26,0.22)';
        c.fillRect(x, sy, w, 8);
        c.fillStyle = 'rgba(255,246,230,0.16)';
        c.fillRect(x, sy, w, 1.5);
        const under = c.createLinearGradient(0, sy + 8, 0, sy + 22);
        under.addColorStop(0, 'rgba(30,22,16,0.22)');
        under.addColorStop(1, 'rgba(30,22,16,0)');
        c.fillStyle = under;
        c.fillRect(x, sy + 8, w, 14);
      }

      // windows (and on the ground floor, a door or two)
      const cols = windowCols(spec);
      const doorCols = spec.shopFront || spec.noDoors ? new Map() : pickDoors(cols, seed);
      for (let f = 0; f < floors; f++) {
        for (let k = 0; k < cols; k++) {
          const [wx, wy, ww, wh] = windowRect(spec, f, k);
          const kind = r();
          if (f === 0 && spec.shopFront) continue;
          if (f === 0 && doorCols.has(k)) {
            const dw = Math.min(92, (w / cols) * 0.8);
            const dh = Math.min(DOOR_H, fh * 0.92);
            syrianDoor(c, x + ((k + 0.5) * w) / cols, dw, dh, doorCols.get(k), seed * 7 + k);
            recess.push({ rect: [x + ((k + 0.5) * w) / cols - dw / 2, -dh, dw, dh], door: true });
            continue;
          }
          if (kind < 0.12) {
            // blown out: ragged dark hole
            c.fillStyle = '#1b1612';
            c.beginPath();
            const jag = [[wx - 6, wy - 3], [wx + ww * 0.3, wy - 9], [wx + ww * 0.55, wy - 2], [wx + ww + 7, wy - 6], [wx + ww + 3, wy + wh * 0.5], [wx + ww + 8, wy + wh + 6], [wx + ww * 0.5, wy + wh + 3], [wx - 5, wy + wh + 9], [wx - 2, wy + wh * 0.4]];
            c.moveTo(...jag[0]);
            const poly = [jag[0]];
            for (const q of jag.slice(1)) {
              const pt = [q[0] + (r() - 0.5) * 5, q[1] + (r() - 0.5) * 5];
              poly.push(pt);
              c.lineTo(...pt);
            }
            c.closePath();
            c.fill();
            recess.push({ poly });
          } else {
            c.fillStyle = kind < 0.55 ? '#211b17' : '#2b241f';
            c.fillRect(wx, wy, ww, wh);
            recess.push({ rect: [wx, wy, ww, wh], sill: true });
            // the depth of the wall: a lit jamb, a shadowed one, the lintel's shade
            c.fillStyle = 'rgba(190,176,152,0.55)';
            c.fillRect(wx, wy, 4, wh);
            c.fillStyle = 'rgba(12,9,7,0.5)';
            c.fillRect(wx + ww - 5, wy, 5, wh);
            c.fillRect(wx, wy, ww, 6);
            // a pale frame and a stone sill
            c.strokeStyle = 'rgba(235,225,205,0.28)';
            c.lineWidth = 2;
            c.strokeRect(wx - 1, wy - 1, ww + 2, wh + 2);
            c.fillStyle = 'rgba(0,0,0,0.25)';
            c.fillRect(wx - 3, wy + wh, ww + 6, 4); // sill shadow
            c.fillStyle = 'rgba(230,220,200,0.35)';
            c.fillRect(wx - 5, wy + wh - 1, ww + 10, 3);
            // rain has run down from the sill for years
            const st = c.createLinearGradient(0, wy + wh, 0, wy + wh + 50);
            st.addColorStop(0, 'rgba(60,50,40,0.16)');
            st.addColorStop(1, 'rgba(60,50,40,0)');
            c.fillStyle = st;
            c.fillRect(wx + ww * 0.15, wy + wh + 2, ww * 0.7, 50);
            const extra = r();
            if (kind <= 0.55 && extra < 0.3) {
              // a curtain still hanging, drawn half across
              c.fillStyle = ['#7a5a48', '#5a6a6e', '#8a7a5a', '#6a4a5a'][Math.floor(r() * 4)];
              c.globalAlpha = 0.8;
              c.fillRect(wx + 2, wy + 2, ww * (0.3 + r() * 0.3), wh - 4);
              c.globalAlpha = 1;
            } else if (kind <= 0.55 && extra < 0.5) {
              // the last of the glass, catching the sky
              c.fillStyle = 'rgba(160,180,200,0.18)';
              c.beginPath();
              c.moveTo(wx, wy);
              c.lineTo(wx + ww * 0.6, wy);
              c.lineTo(wx, wy + wh * 0.7);
              c.fill();
            } else if (f === 0 && extra < 0.75) {
              // ground-floor grille
              c.strokeStyle = 'rgba(30,26,22,0.8)';
              c.lineWidth = 1.5;
              c.beginPath();
              for (let gx = wx + 6; gx < wx + ww; gx += 8) {
                c.moveTo(gx, wy);
                c.lineTo(gx, wy + wh);
              }
              c.stroke();
            }
            if (kind > 0.7) {
              // closed shutter, some slats missing
              c.fillStyle = spec.shutter || '#7a6a55';
              c.fillRect(wx, wy, ww, wh * (0.4 + r() * 0.6));
              c.fillStyle = 'rgba(0,0,0,0.2)';
              for (let s = wy + 4; s < wy + wh * 0.9; s += 6) c.fillRect(wx, s, ww, 1.5);
            } else if (kind > 0.55) {
              // plastic sheet over the window, sagging
              c.fillStyle = 'rgba(180,190,200,0.35)';
              c.beginPath();
              c.moveTo(wx, wy);
              c.lineTo(wx + ww, wy);
              c.lineTo(wx + ww, wy + wh);
              c.quadraticCurveTo(wx + ww / 2, wy + wh - 10, wx, wy + wh);
              c.fill();
            }
          }
        }
      }

      // shell holes with rebar
      for (const [fx, fy, hr] of spec.holes || []) {
        const hx = x + fx * w;
        const hy = top + fy * H;
        c.fillStyle = '#16120f';
        c.beginPath();
        const pts = [];
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          const rr = hr * (0.7 + r() * 0.5);
          pts.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.85]);
        }
        c.moveTo(...pts[0]);
        for (const q of pts.slice(1)) c.lineTo(...q);
        c.closePath();
        c.fill();
        recess.push({ poly: pts, ring: [hx, hy, hr] });
        // through the hole, the thickness of the wall it was punched through
        holeReveal(c, pts, WALL, shade(hexOf(color), 0.62));
        // broken render ring around the hole
        c.fillStyle = 'rgba(120,108,92,0.5)';
        c.beginPath();
        c.arc(hx, hy, hr * 1.35, 0, Math.PI * 2);
        c.arc(hx, hy, hr * 1.02, 0, Math.PI * 2, true);
        c.fill();
        c.strokeStyle = '#4a3a2c';
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = r() * Math.PI * 2;
          c.beginPath();
          c.moveTo(hx + Math.cos(a) * hr * 0.9, hy + Math.sin(a) * hr * 0.8);
          c.quadraticCurveTo(hx + Math.cos(a) * hr * 0.5, hy + Math.sin(a) * hr * 0.4 + 8, hx + Math.cos(a) * hr * 0.2, hy + Math.sin(a) * hr * 0.3 + 18);
          c.stroke();
        }
      }

      // bullet pocks in clusters
      c.fillStyle = 'rgba(40,32,26,0.55)';
      for (let k = 0; k < (spec.pocks ?? 3); k++) {
        const cx = x + r() * w;
        const cy = top + r() * H;
        for (let i = 0; i < 14; i++) {
          c.beginPath();
          c.arc(cx + (r() - 0.5) * 70, cy + (r() - 0.5) * 50, 1.5 + r() * 2, 0, Math.PI * 2);
          c.fill();
        }
      }

      // exposed interiors where the corner is torn
      if (torn > 0) {
        c.fillStyle = 'rgba(30,24,20,0.0)';
      }

      // the base of the wall: grime, splash, and the dark where it meets the street
      const ao = c.createLinearGradient(0, -60, 0, 0);
      ao.addColorStop(0, 'rgba(30,24,18,0)');
      ao.addColorStop(1, 'rgba(30,24,18,0.38)');
      c.fillStyle = ao;
      c.fillRect(x, -60, w, 60);

      // graffiti
      for (const [text, gx, gy, size, gc, rot] of spec.graffiti || []) {
        c.save();
        c.translate(x + gx * w, gy);
        c.rotate(rot || -0.03);
        c.font = `${size}px "Aref Ruqaa", "IBM Plex Sans Arabic", serif`;
        c.fillStyle = gc || 'rgba(40,40,44,0.8)';
        c.textAlign = 'center';
        c.direction = 'rtl';
        c.fillText(text, 0, 0);
        c.restore();
      }
      c.restore();

      // torn edge: slab ends and dangling rebar
      if (torn > 0) {
        c.strokeStyle = '#5a4a3a';
        c.lineWidth = 2;
        for (let f = 1; f < floors; f++) {
          const sy = -f * fh;
          if (sy > top + H * (0.25 + torn * 0.45)) continue;
          const sx = tornLeft ? x + r() * w * 0.4 : x + w - r() * w * 0.4;
          extrudeRect(c, sx - 30, sy - 8, 60, 10, WALL * 0.8, { color: hexOf(color) });
          c.fillStyle = color;
          c.fillRect(sx - 30, sy - 8, 60, 10);
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.moveTo(sx + (i - 2) * 10, sy);
            c.quadraticCurveTo(sx + (i - 2) * 12, sy + 20, sx + (i - 2) * 14 + (r() - 0.5) * 20, sy + 30 + r() * 30);
            c.stroke();
          }
        }
      }
  }, mat, matSeed);
  // the façade is baked once; each frame just places it
  R.paint((c) => c.drawImage(F.alb, F.x0, F.y0, F.w, F.h));
  R.height((h) => h.drawImage(F.hgt, F.x0, F.y0, F.w, F.h));
  if (!spec.noRoof && !torn) roofTop(R, spec, H, t);

  // balconies and laundry cast shadows onto the façade
  if (spec.balcony) {
    // on the first floor, where the street sees it; built to a person's
    // scale: a rail at hand height, washing a person could wear
    const [fl, side, hang] = spec.balcony;
    const by = -Math.min(fl, 1) * fh - 8;
    const bw = Math.max(150, w * 0.32);
    const bx = side < 0.5 ? x + w * 0.12 : x + w - bw - w * 0.12;
    R.cast((c) => {
      c.save();
      c.translate(bx, by);
      c.rotate((hang || 0) * 0.5);
      c.fillStyle = shade(color, 0.85);
      c.fillRect(-6, 0, bw + 12, 14);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(-6, 12, bw + 12, 3);
      c.strokeStyle = '#3a3230';
      c.lineWidth = 3;
      c.strokeRect(2, -92, bw - 4, 92);
      c.lineWidth = 2;
      for (let i = 12; i < bw - 4; i += 13) {
        c.beginPath();
        c.moveTo(i, -92);
        c.lineTo(i, 0);
        c.stroke();
      }
      if (!spec.laundry || spec.plants) {
        // someone still waters these
        for (let i = 0; i < 3; i++) {
          const px = 14 + (i * (bw - 44)) / 2;
          const sw = Math.sin(t * 1.1 + i * 1.7 + x * 0.01) * 0.06;
          c.fillStyle = '#8a5a3a';
          c.fillRect(px, -18, 18, 18);
          c.save();
          c.translate(px + 9, -18);
          c.rotate(sw);
          c.fillStyle = ['#5e7a3a', '#6e8a44', '#4e6a32'][i];
          c.beginPath();
          c.arc(0, -10, 12, 0, Math.PI * 2);
          c.arc(-7, -18, 7, 0, Math.PI * 2);
          c.arc(7, -20, 7, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      if (spec.laundry) {
        // a line strung above the rail, and the washing moving on it
        const ly = -128;
        c.strokeStyle = '#2a2420';
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(0, ly);
        c.quadraticCurveTo(bw / 2, ly + 8, bw, ly - 2);
        c.stroke();
        const cols = ['#9a8a70', '#6f7e86', '#b8a79a', '#7a5a50', '#c9c2b2'];
        const n = Math.max(3, Math.floor(bw / 44));
        for (let i = 0; i < n; i++) {
          const lx = 8 + (i * (bw - 40)) / n;
          const gw = 26 + ((i * 7) % 12);
          const gh = 44 + ((i * 13) % 26);
          const gy = ly + 4 + 8 * Math.sin((Math.PI * (lx + gw / 2)) / bw);
          const sway = Math.sin(t * 1.6 + i * 1.3 + x * 0.003) * 4 + Math.sin(t * 3.7 + i) * 1.5;
          c.fillStyle = cols[(i + seed) % cols.length];
          c.beginPath();
          c.moveTo(lx, gy);
          c.lineTo(lx + gw, gy);
          c.quadraticCurveTo(lx + gw + sway * 0.6, gy + gh * 0.6, lx + gw + sway, gy + gh);
          c.lineTo(lx + sway, gy + gh + 2);
          c.quadraticCurveTo(lx + sway * 0.5, gy + gh * 0.5, lx, gy);
          c.fill();
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(lx + gw * 0.55 + sway * 0.5, gy + 2, 3, gh - 4);
          c.fillStyle = '#d8d0c0';
          c.fillRect(lx + 3, gy - 3, 3, 6);
          c.fillRect(lx + gw - 6, gy - 3, 3, 6);
        }
      }
      c.restore();
    });
  }
  if (spec.dishes) {
    R.cast((c) => {
      for (const [fx, fy] of spec.dishes) {
        const dx = x + fx * w;
        const dy = -fy * fh - fh * 0.3;
        c.fillStyle = '#d8d2c6';
        c.beginPath();
        c.ellipse(dx, dy, 14, 16, -0.4, -Math.PI / 2, Math.PI / 2);
        c.fill();
        c.fillRect(dx - 2, dy, 4, 18);
      }
    });
  }
  if (spec.ac) {
    R.cast((c) => {
      for (const [fx, fy] of spec.ac) {
        c.fillStyle = '#cfc8ba';
        c.fillRect(x + fx * w, -fy * fh - fh * 0.35, 38, 26);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 4; i++) c.fillRect(x + fx * w + 4, -fy * fh - fh * 0.35 + 5 + i * 5, 30, 1.5);
      }
    });
  }
}

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0})`;
}

// The street itself: asphalt, a pavement kerb, dust.
export function street(R, x0, x1, { color = '#6e6559', pave = '#8a8072' } = {}) {
  const seen = (x) => Math.abs(x - R.cam.x) < 1500;
  R.paint((c) => {
    // the pavement: worn slabs with dark joints
    c.fillStyle = pave;
    c.fillRect(x0, -4, x1 - x0, 8);
    const r = rng(8);
    c.fillStyle = 'rgba(40,32,26,0.35)';
    for (let x = x0; x < x1; x += 46 + r() * 20) if (seen(x)) c.fillRect(x, -4, 1.5, 8); // (a cheap stream: fine to run it all)
    // the kerb stone, lit on top
    c.fillStyle = '#9d9383';
    c.fillRect(x0, 3, x1 - x0, 5);
    c.fillStyle = 'rgba(255,250,235,0.18)';
    c.fillRect(x0, 3, x1 - x0, 1.2);
    // asphalt
    c.fillStyle = color;
    c.fillRect(x0, 8, x1 - x0, 500);
    const road = c.createLinearGradient(0, 8, 0, 120);
    road.addColorStop(0, 'rgba(0,0,0,0.18)');
    road.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = road;
    c.fillRect(x0, 8, x1 - x0, 112);
  });
  // the road's surface and the pavement slabs, with their relief (only what
  // the camera can see)
  const vx0 = Math.max(x0, R.cam.x - 1600);
  const vx1 = Math.min(x1, R.cam.x + 1600);
  if (vx1 > vx0) {
    R.surface((c) => c.rect(vx0, 8, vx1 - vx0, 500), 'asphalt', { scale: 1.1, seed: 2 });
    R.surface((c) => c.rect(vx0, -4, vx1 - vx0, 7), 'pavers', { scale: 0.5, seed: 1, alpha: 0.8 });
  }
  R.paint((c) => {
    // patches of newer tarmac, and cracks (each strip seeded by its own x,
    // so what's drawn doesn't depend on what's on screen)
    for (let x = x0; x < x1; x += 60) {
      if (!seen(x)) continue;
      const q = rng(Math.floor(x) * 13 + 5);
      if (q() < 0.12) {
        c.fillStyle = 'rgba(30,28,26,0.22)';
        c.fillRect(x, 16 + q() * 50, 50 + q() * 120, 12 + q() * 20);
      }
      if (q() < 0.3) {
        c.strokeStyle = 'rgba(30,24,20,0.35)';
        c.lineWidth = 1;
        c.beginPath();
        let cx = x;
        let cy = 14 + q() * 60;
        c.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) {
          cx += 10 + q() * 20;
          cy += (q() - 0.5) * 10;
          c.lineTo(cx, cy);
        }
        c.stroke();
      }
      // grit, stones and litter along the kerb
      for (let gx = x; gx < x + 60; gx += 11) {
        if (q() < 0.4) {
          c.fillStyle = `rgba(${150 + q() * 40},${140 + q() * 30},${120 + q() * 30},0.7)`;
          c.fillRect(gx, 8 + q() * 10, 2 + q() * 3, 2);
        }
        if (q() < 0.02) {
          c.fillStyle = q() < 0.5 ? 'rgba(220,215,200,0.6)' : 'rgba(80,110,140,0.5)';
          c.fillRect(gx, 10 + q() * 30, 6 + q() * 6, 3); // a scrap of paper or plastic
        }
      }
    }
  });
}

// Wooden electricity poles along the street, some leaning after years of
// blasts, with cables strung between them. Every cable ends somewhere: at
// the next pole, at a bracket where it goes into a building, or snapped and
// hanging to the ground. Cast, so they throw shadows.
export function cables(R, camX, { seed = 11, y = -330, from = -600, to = 11000 } = {}) {
  // the poles first: where they stand, how they lean, where the arm is
  const r = rng(seed);
  const poles = [];
  for (let x = from + r() * 200; x < to; x += 620 + r() * 420) {
    const lean = r() < 0.35 ? (r() - 0.5) * 0.22 : (r() - 0.5) * 0.04;
    const h = 430 + r() * 50;
    poles.push({ x, lean, h, top: [x + Math.sin(lean) * h, -Math.cos(lean) * h] });
  }
  // what each span between neighbours does
  const spans = poles.slice(0, -1).map((p, i) => ({ a: p, b: poles[i + 1], kind: r(), wires: 2 + Math.floor(r() * 2), sag: 30 + r() * 40, k: r() }));
  const armY = (p, n) => [p.top[0] + Math.sin(p.lean) * (14 + n * 12), p.top[1] + Math.cos(p.lean) * (14 + n * 12)];
  const vis = (x0, x1) => x1 > camX - 1700 && x0 < camX + 1700;

  R.cast((c) => {
    c.lineCap = 'round';
    for (const s of spans) {
      if (!vis(s.a.x, s.b.x)) continue;
      c.strokeStyle = 'rgba(26,22,20,0.9)';
      c.lineWidth = 1.4;
      for (let n = 0; n < s.wires; n++) {
        const [ax, ay] = armY(s.a, n);
        const [bx, by] = armY(s.b, n);
        const sag = s.sag + n * 6;
        if (s.kind < 0.6) {
          // strung between the two poles
          c.beginPath();
          c.moveTo(ax, ay);
          c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + sag, bx, by);
          c.stroke();
        } else if (s.kind < 0.8) {
          // off the pole and into the building: a bracket on the wall and a hole
          const wx = ax + (bx - ax) * (0.3 + s.k * 0.4) + n * 18;
          const wy = -230 - s.k * 120 + n * 10;
          c.beginPath();
          c.moveTo(ax, ay);
          c.quadraticCurveTo((ax + wx) / 2, Math.max(ay, wy) + sag * 0.6, wx, wy);
          c.stroke();
          c.fillStyle = '#1c1714';
          c.fillRect(wx - 2, wy - 2, 5, 5);
          c.fillStyle = 'rgba(60,50,42,0.9)';
          c.fillRect(wx - 5, wy + 3, 11, 2.5);
        } else {
          // snapped: one wire hangs from one pole down to the ground; the
          // rest are cut short and dangle, and the far pole keeps a stub
          const [px, py, dir] = s.k < 0.5 ? [ax, ay, 1] : [bx, by, -1];
          const [qx, qy] = s.k < 0.5 ? [bx, by] : [ax, ay];
          c.beginPath();
          if (n === 0) {
            const len = Math.abs(bx - ax) * (0.16 + s.k * 0.12);
            c.moveTo(px, py);
            c.bezierCurveTo(px + dir * len * 0.5, py + 40, px + dir * len * 0.9, py * 0.35, px + dir * len, -2);
            // the last of it lying along the ground
            c.lineTo(px + dir * (len + 30), 0);
          } else {
            const drop = 50 + n * 22 + s.k * 30;
            c.moveTo(px, py);
            c.quadraticCurveTo(px + dir * 22, py + drop * 0.5, px + dir * (14 + n * 6), py + drop);
          }
          // the cut end left on the other pole
          c.moveTo(qx, qy);
          c.quadraticCurveTo(qx - dir * 10, qy + 14 + n * 6, qx - dir * (6 + n * 3), qy + 26 + n * 10);
          c.stroke();
        }
      }
    }
    // the poles, over their own wires' ends
    for (const p of poles) {
      if (!vis(p.x - 60, p.x + 60)) continue;
      c.save();
      c.translate(p.x, 0);
      c.rotate(p.lean);
      // a tarred wooden pole, thicker at the foot
      const g = c.createLinearGradient(-6, 0, 6, 0);
      g.addColorStop(0, '#3a2c20');
      g.addColorStop(0.45, '#5a4532');
      g.addColorStop(1, '#2e241b');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-6.5, 2);
      c.lineTo(-4.5, -p.h);
      c.lineTo(4.5, -p.h);
      c.lineTo(6.5, 2);
      c.fill();
      // grain and old nails, a blackened band where it was burned
      c.strokeStyle = 'rgba(20,14,10,0.35)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(-1.5, 0);
      c.lineTo(-1, -p.h);
      c.moveTo(2, 0);
      c.lineTo(1.6, -p.h);
      c.stroke();
      c.fillStyle = 'rgba(15,10,8,0.55)';
      c.fillRect(-6, -60, 12, 16);
      // cross-arms with insulators
      c.fillStyle = '#3e3024';
      for (let n = 0; n < 2; n++) {
        const yy = -p.h + 12 + n * 12;
        c.fillRect(-24, yy, 48, 5);
        c.fillStyle = '#c8c2b4';
        for (const ix of [-20, 18]) c.fillRect(ix, yy - 5, 3, 5);
        c.fillStyle = '#3e3024';
      }
      // a transformer box on some, and posters stapled on
      if (Math.abs(p.lean) < 0.05 && ((p.x | 0) % 3 === 0)) {
        c.fillStyle = '#5e6364';
        c.fillRect(6, -p.h * 0.62, 18, 26);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(6, -p.h * 0.62 + 22, 18, 4);
      }
      c.fillStyle = 'rgba(225,215,195,0.55)';
      c.fillRect(-5, -150, 10, 14);
      c.restore();
    }
  });
}

// Silhouettes very close to the camera, sweeping past faster than the street:
// a lamp post, twisted rebar, a rubble edge, a hanging wire.
export function foreground(R, camX, { from = -1000, to = 15000 } = {}) {
  R.layer(1.32);
  R.paint((c) => {
    const r = rng(77);
    for (let x = from; x < to; x += 900 + r() * 700) {
      const kind = r();
      const k1 = r();
      const k2 = r();
      if (Math.abs(x - camX * 1.32) > 1700) continue;
      c.fillStyle = 'rgba(20,16,13,0.92)';
      c.strokeStyle = 'rgba(20,16,13,0.92)';
      if (kind < 0.3) {
        // nothing here: keep the foreground sparse
      } else if (kind < 0.6) {
        // a rubble edge with rebar
        c.beginPath();
        c.moveTo(x - 40, 60);
        c.lineTo(x, 10);
        c.lineTo(x + 60, 20);
        c.lineTo(x + 90, -10);
        c.lineTo(x + 150, 25);
        c.lineTo(x + 190, 60);
        c.closePath();
        c.fill();
        c.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(x + 40 + i * 22, 10);
          c.quadraticCurveTo(x + 50 + i * 20, -40, x + 30 + i * 30 + k1 * 30, -70 - k2 * 40 - i * 6);
          c.stroke();
        }
      } else if (kind < 0.8) {
        // a wire hanging into frame from above
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, -900);
        c.quadraticCurveTo(x + 30, -560, x + 10, -460 - k1 * 60);
        c.stroke();
      }
    }
  });
  R.layer(1);
}

// Dust motes turning slowly in the sunlight.
export function motes(R, camX, t, strength = 1) {
  if (strength <= 0) return;
  R.glow((c) => {
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const bx = r() * 2600 - 1300;
      const by = -40 - r() * 520;
      const sp = 6 + r() * 10;
      const x = camX + ((((bx + t * sp) % 2600) + 2600) % 2600) - 1300 + Math.sin(t * 0.7 + i) * 12;
      const y = by + Math.sin(t * 0.5 + i * 1.7) * 18;
      const a = (0.07 + r() * 0.12) * strength * (0.6 + 0.4 * Math.sin(t * 1.3 + i));
      c.fillStyle = `rgba(255,236,200,${a})`;
      c.fillRect(x, y, 2, 2);
    }
  });
}

// A heap of broken slabs. Returns nothing; collision is added separately.
export function rubble(R, x, w, h, { seed = 5, color = '#a89b86', rebar = true, cast = true } = {}) {
  const draw = (c) => {
    const r = rng(seed);
    c.fillStyle = color;
    c.beginPath();
    const pts = [[x - 10, 2]];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      pts.push([x + k * w + (r() - 0.5) * 16, -h * Math.sin(k * Math.PI) * (0.75 + r() * 0.35)]);
    }
    pts.push([x + w + 10, 2]);
    // the heap goes back as far as it goes across, near enough
    extrudePoly(c, pts, 14, { color: hexOf(color) });
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    // slab edges and chunks
    for (let i = 0; i < 7; i++) {
      const sx = x + r() * w;
      const sy = -r() * h * 0.8;
      c.save();
      c.translate(sx, sy);
      c.rotate((r() - 0.5) * 1.2);
      const cc = shade(color.startsWith('#') ? color : '#a89b86', 0.75 + r() * 0.35);
      const cw = 40 + r() * 30;
      const cx0 = -20 - r() * 20;
      const ch = 10 + r() * 6;
      extrudeRect(c, cx0, -6, cw, ch, 8, { top: 'rgba(255,248,235,0.22)', side: 'rgba(0,0,0,0.35)' });
      c.fillStyle = cc;
      c.fillRect(cx0, -6, cw, ch);
      c.restore();
    }
    if (rebar) {
      c.strokeStyle = '#4a3b2e';
      c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const rx = x + r() * w;
        const ry = -h * (0.4 + r() * 0.5);
        c.beginPath();
        c.moveTo(rx, ry);
        c.quadraticCurveTo(rx + (r() - 0.5) * 30, ry - 20, rx + (r() - 0.5) * 50, ry - 30 - r() * 30);
        c.stroke();
      }
    }
  };
  if (cast) R.cast(draw);
  else R.paint(draw);
  // the broken concrete's grain and relief over the whole heap
  const q = rng(seed);
  const pts = [[x - 10, 2]];
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    pts.push([x + k * w + (q() - 0.5) * 16, -h * Math.sin(k * Math.PI) * (0.75 + q() * 0.35)]);
  }
  pts.push([x + w + 10, 2]);
  R.surface((c) => {
    c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath();
  }, 'concrete', { scale: 0.8, seed: 3, alpha: 0.9 });
}

// The sniper curtain: sheets and blankets on a wire across the gap. The
// middle section has sagged where shrapnel cut the wire.
export function sniperCurtain(R, x0, x1, t, { wireY = -250, sagFrom, sagTo, sagY = -148 }) {
  R.cast((c) => {
    c.strokeStyle = '#2a2622';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, wireY);
    c.lineTo(sagFrom, wireY + 6);
    c.quadraticCurveTo((sagFrom + sagTo) / 2, sagY - 30, sagTo, wireY + 6);
    c.lineTo(x1, wireY);
    c.stroke();
    const sheets = [
      [x0, sagFrom, '#d9d2c2', 0],
      [sagFrom, sagTo, '#8e6f5a', 1],
      [sagTo, x1, '#6d7a82', 0],
    ];
    for (const [a, b, col, sag] of sheets) {
      const sway = Math.sin(t * 1.2 + a * 0.01) * 5;
      c.fillStyle = col;
      c.beginPath();
      if (sag) {
        c.moveTo(a, wireY + 6);
        c.quadraticCurveTo((a + b) / 2, sagY - 30, b, wireY + 6);
        c.lineTo(b + sway, sagY + 6);
        c.quadraticCurveTo((a + b) / 2 + sway, sagY + 18, a + sway, sagY + 6);
      } else {
        c.moveTo(a, wireY);
        c.lineTo(b, wireY);
        c.lineTo(b + sway, wireY + 150);
        c.quadraticCurveTo((a + b) / 2 + sway, wireY + 160, a + sway, wireY + 150);
      }
      c.closePath();
      c.fill();
      // folds and a stitched seam
      c.strokeStyle = 'rgba(0,0,0,0.18)';
      c.lineWidth = 1.5;
      for (let fx = a + 14; fx < b - 6; fx += 22) {
        c.beginPath();
        c.moveTo(fx, wireY + 10);
        c.lineTo(fx + sway * 0.6, sag ? sagY : wireY + 140);
        c.stroke();
      }
    }
    // shrapnel holes let the light through
    c.fillStyle = '#1a1612';
    for (const [hx, hy] of [[x0 + 30, wireY + 60], [sagTo + 40, wireY + 40], [sagTo + 55, wireY + 90]]) {
      c.beginPath();
      c.arc(hx, hy, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// A shopfront with a dented, half-closed rolling shutter.
export function shop(R, x, { w = 220, sign = 'دكّان أبو ريّان', open = 0.45 } = {}) {
  R.paint((c) => {
    c.fillStyle = '#1b1612';
    c.fillRect(x, -150, w, 150);
    // empty shelves inside
    c.fillStyle = 'rgba(80,66,52,0.6)';
    for (let i = 0; i < 3; i++) c.fillRect(x + 10, -120 + i * 35, w - 20, 4);
    c.fillStyle = '#8c8a86';
    c.fillRect(x - 4, -160, w + 8, 12);
    // sign
    c.fillStyle = '#2f4a5a';
    c.fillRect(x + 10, -205, w - 20, 38);
    c.fillStyle = '#e8dcc0';
    c.font = '24px "Aref Ruqaa", "Noto Naskh Arabic", serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText(sign, x + w / 2, -178);
  });
  R.cast((c) => {
    const sh = 150 * (1 - open);
    c.fillStyle = '#7d7c78';
    c.beginPath();
    c.moveTo(x, -150);
    c.lineTo(x + w, -150);
    c.lineTo(x + w, -150 + sh);
    c.quadraticCurveTo(x + w * 0.55, -150 + sh + 22, x + w * 0.4, -150 + sh - 4);
    c.lineTo(x, -150 + sh + 6);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1.5;
    for (let y = -146; y < -150 + sh; y += 7) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w, y);
      c.stroke();
    }
  });
}

// A grape vine climbing a broken garden wall.
export function vine(R, x, t, { wallH = 110, lush = 1, ripe = false } = {}) {
  // a broken garden wall of dressed stone: ragged where blocks fell off
  // the top, with its thickness showing, courses, and a damp foot
  const pts = [
    [x - 72, 0],
    [x - 72, -wallH + 22],
    [x - 58, -wallH + 22],
    [x - 58, -wallH + 4],
    [x - 30, -wallH],
    [x - 14, -wallH + 6],
    [x - 6, -wallH + 30],
    [x + 18, -wallH + 30],
    [x + 22, -wallH + 10],
    [x + 44, -wallH + 10],
    [x + 48, -wallH + 40],
    [x + 72, -wallH + 44],
    [x + 72, 0],
  ];
  R.cast((c) => {
    extrudePoly(c, pts, 18, { color: '#b3a58f' });
    c.save();
    c.beginPath();
    c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fillStyle = '#b3a58f';
    c.fill();
    c.clip();
    // courses of stone, each block a shade apart
    const r = rng(31);
    for (let row = 0; row * 22 < wallH + 4; row++) {
      const y0 = -22 - row * 22;
      for (let bx = x - 72 - (row % 2) * 18; bx < x + 72; bx += 36) {
        const v = (r() - 0.5) * 0.12;
        c.fillStyle = v > 0 ? `rgba(255,248,230,${v})` : `rgba(40,30,20,${-v})`;
        c.fillRect(bx + 1, y0 + 1, 34, 20);
      }
      c.fillStyle = 'rgba(70,58,44,0.35)';
      c.fillRect(x - 72, y0 + 21, 144, 1.5);
    }
    for (let row = 0; row * 22 < wallH + 4; row++) {
      for (let bx = x - 72 - (row % 2) * 18; bx < x + 72; bx += 36) c.fillRect(bx, -22 - row * 22, 1.5, 22);
    }
    // damp at the foot
    const dg = c.createLinearGradient(0, 0, 0, -30);
    dg.addColorStop(0, 'rgba(50,40,30,0.35)');
    dg.addColorStop(1, 'rgba(50,40,30,0)');
    c.fillStyle = dg;
    c.fillRect(x - 72, -30, 144, 30);
    c.restore();
  });
  R.cast((c) => {
    const r = rng(12);
    c.strokeStyle = '#5a4230';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 20, 0);
    c.bezierCurveTo(x + 10, -60, x + 40, -90, x - 20, -wallH - 20);
    c.bezierCurveTo(x - 50, -wallH - 40, x - 10, -wallH - 70, x + 30, -wallH - 60);
    c.stroke();
    for (let i = 0; i < 22 * lush; i++) {
      const k = r();
      const lx = lerp(x + 20, x - 30, k) + (r() - 0.5) * 70;
      const ly = -k * (wallH + 60) - 10 + (r() - 0.5) * 30;
      const sway = Math.sin(t * 1.4 + i) * 1.5;
      c.fillStyle = r() < 0.5 ? '#5f7a3a' : '#6d8a44';
      c.beginPath();
      c.ellipse(lx + sway, ly, 11, 9, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // small bunches of grapes
    for (let b = 0; b < 3; b++) {
      const gx = x - 10 + b * 22;
      const gy = -wallH + 6 + b * 8;
      c.fillStyle = ripe ? '#4a2a4a' : '#8ea24a';
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.arc(gx + ((i % 3) - 1) * 4, gy + Math.floor(i / 3) * 5, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
}

// The school: a three-storey block with its eastern wing collapsed, a
// basement stairwell, and ground-floor classroom windows.
export function school(R, x, t) {
  block(R, { x, w: 520, floors: 3, fh: 130, color: '#c8b999', seed: 44, torn: 0, pocks: 6, graffiti: [['مدرسة', 0.3, -330, 30, 'rgba(60,70,90,0.7)']] }, t);
  // the collapsed east wing: a slope of slabs
  rubble(R, x + 520, 380, 210, { seed: 45, color: '#b9aa8a' });
  // basement stairwell entrance: a low wall and a dark opening
  R.paint((c) => {
    c.fillStyle = '#0d0b09';
    c.fillRect(x + 380, -95, 80, 95);
    c.fillStyle = '#9d9078';
    for (let i = 0; i < 4; i++) c.fillRect(x + 384 + i * 4, -92 + i * 22, 72, 4); // steps going down, seen through
  });
  // classroom windows (for the flashback)
  R.paint((c) => {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#2a2420';
      c.fillRect(x + 40 + i * 110, -110, 80, 70);
      c.fillStyle = 'rgba(90,70,50,0.5)';
      c.fillRect(x + 50 + i * 110, -60, 60, 3); // desk tops glimpsed
    }
    c.strokeStyle = '#d9d4c8';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + 150, -110);
    c.lineTo(x + 175, -80);
    c.lineTo(x + 160, -60);
    c.stroke(); // cracked pane
  });
}

// A doorway into a ground-floor room, lit from inside.
export function roomDoor(R, x, { w = 110, h = 170, light = 'rgba(255,200,140,0.18)' } = {}) {
  R.paint((c) => {
    c.fillStyle = '#18130f';
    c.fillRect(x, -h, w, h);
  });
  R.glow((c) => {
    const g = c.createLinearGradient(x, -h, x, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, light);
    c.fillStyle = g;
    c.fillRect(x, -h, w, h);
  });
}

export function jerryCan(c, x, y, s = 1, color = '#d9b12a') {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-14, 0);
  c.lineTo(-14, -34);
  c.lineTo(-6, -40);
  c.lineTo(14, -40);
  c.lineTo(14, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.fillRect(-10, -30, 20, 2);
  c.fillRect(-10, -16, 20, 2);
  c.fillStyle = shade('#d9b12a', 0.7);
  c.fillRect(4, -46, 7, 7); // cap
  c.strokeStyle = shade('#d9b12a', 0.6);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-8, -40);
  c.lineTo(-4, -48);
  c.lineTo(2, -48);
  c.lineTo(0, -40);
  c.stroke(); // handle
  c.restore();
}

// Sorted piles of scrap: rebar, copper, aluminium.
export function scrapPiles(R, x, disturbed = 0) {
  R.cast((c) => {
    const r = rng(33);
    const piles = [
      [x, '#5a4a3e', 'rebar'],
      [x + 90, '#a86a3a', 'copper'],
      [x + 170, '#b8bcc0', 'alu'],
    ];
    for (const [px, col, kind] of piles) {
      const sc = disturbed ? 1.6 : 1;
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = kind === 'rebar' ? 3 : 2;
      for (let i = 0; i < 12; i++) {
        const ax = px + (r() - 0.5) * 50 * sc;
        const ay = -r() * 22 / sc;
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(ax + (r() - 0.5) * 40, ay - (r() - 0.2) * 10);
        c.stroke();
        if (kind !== 'rebar' && r() < 0.5) c.fillRect(ax, ay - 4, 8, 5);
      }
    }
  });
}

export function crater(R, x, w = 180) {
  R.paint((c) => {
    c.fillStyle = '#3a3129';
    c.beginPath();
    c.ellipse(x, 10, w / 2, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8a7c68';
    const r = rng(9);
    for (let i = 0; i < 14; i++) c.fillRect(x - w / 2 - 30 + r() * (w + 60), -4 - r() * 8, 6 + r() * 12, 4 + r() * 5);
  });
}

// The dead olive tree at the corner: twisted, grey, leafless.
export function deadOlive(R, x) {
  R.cast((c) => {
    c.strokeStyle = '#6a625a';
    c.lineCap = 'round';
    const branch = (bx, by, ang, len, w, d) => {
      const ex = bx + Math.cos(ang) * len;
      const ey = by + Math.sin(ang) * len;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + Math.cos(ang + 0.4) * len * 0.5, by + Math.sin(ang + 0.4) * len * 0.5, ex, ey);
      c.stroke();
      if (d < 4) {
        branch(ex, ey, ang - 0.45 - d * 0.05, len * 0.7, w * 0.62, d + 1);
        branch(ex, ey, ang + 0.5, len * 0.62, w * 0.6, d + 1);
      }
    };
    branch(x, 0, -Math.PI / 2 - 0.1, 90, 22, 0);
  });
}

export function lowWall(R, x, w, h = 70, color = '#a3967f') {
  R.cast((c) => {
    extrudeRect(c, x, -h, w, h, 16, { color: hexOf(color) });
    c.fillStyle = color;
    c.fillRect(x, -h, w, h);
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < w; i += 36) c.fillRect(x + i, -h, 2, h);
    c.fillRect(x, -h / 2, w, 2);
  });
}

// A Mi-8 seen side-on in the far sky, rotor a blur.
// A fighter jet in side profile, facing right: pointed nose, bubble canopy,
// swept delta wing, twin fins, and the shimmer of the exhaust.
export function jet(c, x, y, s, t) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // exhaust heat haze
  const hz = c.createLinearGradient(-150, 0, -58, 0);
  hz.addColorStop(0, 'rgba(255,220,180,0)');
  hz.addColorStop(1, 'rgba(255,200,150,0.22)');
  c.fillStyle = hz;
  c.beginPath();
  c.ellipse(-100, 1, 48, 5 + Math.sin(t * 40) * 0.8, 0, 0, Math.PI * 2);
  c.fill();
  // far wing (darker, behind)
  c.fillStyle = '#23252a';
  c.beginPath();
  c.moveTo(-6, -2);
  c.lineTo(-40, -12);
  c.lineTo(-52, -12);
  c.lineTo(-30, -2);
  c.closePath();
  c.fill();
  // fuselage
  c.fillStyle = '#2d3036';
  c.beginPath();
  c.moveTo(78, 1);
  c.quadraticCurveTo(58, -5, 30, -6);
  c.lineTo(-50, -5);
  c.lineTo(-62, -3);
  c.lineTo(-62, 4);
  c.lineTo(-48, 6);
  c.lineTo(30, 6);
  c.quadraticCurveTo(58, 5, 78, 1);
  c.closePath();
  c.fill();
  // intake
  c.fillStyle = '#1d1f23';
  c.fillRect(8, 1, 20, 5);
  // canopy
  c.fillStyle = '#5b6470';
  c.beginPath();
  c.moveTo(46, -5);
  c.quadraticCurveTo(36, -13, 20, -9);
  c.lineTo(18, -5);
  c.closePath();
  c.fill();
  // near wing, swept back
  c.fillStyle = '#383b42';
  c.beginPath();
  c.moveTo(14, 3);
  c.lineTo(-34, 16);
  c.lineTo(-48, 16);
  c.lineTo(-40, 3);
  c.closePath();
  c.fill();
  // twin fins
  c.fillStyle = '#2a2d33';
  c.beginPath();
  c.moveTo(-40, -5);
  c.lineTo(-58, -26);
  c.lineTo(-66, -26);
  c.lineTo(-60, -4);
  c.closePath();
  c.fill();
  c.fillStyle = '#212328';
  c.beginPath();
  c.moveTo(-44, -5);
  c.lineTo(-54, -20);
  c.lineTo(-60, -20);
  c.lineTo(-58, -4);
  c.closePath();
  c.fill();
  // tailplane
  c.fillStyle = '#34373e';
  c.beginPath();
  c.moveTo(-46, 3);
  c.lineTo(-64, 10);
  c.lineTo(-68, 10);
  c.lineTo(-62, 2);
  c.closePath();
  c.fill();
  // nozzle glow
  c.fillStyle = 'rgba(255,170,90,0.5)';
  c.beginPath();
  c.ellipse(-63, 0.5, 2, 3.4, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// The same jet seen from below, as a shadow on the ground: a swept delta
// with its fins and tailplane. Moving right.
export function jetShadowShape(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(80, 0);
  c.quadraticCurveTo(60, -7, 26, -8);
  c.lineTo(-10, -12);
  c.lineTo(-40, -70); // wing tip
  c.lineTo(-56, -70);
  c.lineTo(-44, -12);
  c.lineTo(-56, -10);
  c.lineTo(-72, -32); // tailplane
  c.lineTo(-82, -32);
  c.lineTo(-76, -8);
  c.lineTo(-78, 0);
  c.lineTo(-76, 8);
  c.lineTo(-82, 32);
  c.lineTo(-72, 32);
  c.lineTo(-56, 10);
  c.lineTo(-44, 12);
  c.lineTo(-56, 70);
  c.lineTo(-40, 70);
  c.lineTo(-10, 12);
  c.lineTo(26, 8);
  c.quadraticCurveTo(60, 7, 80, 0);
  c.closePath();
  c.fill();
  c.restore();
}

// ------------------------------------------------------------- doors --

// Which ground-floor bays are doors, and of what kind: one on a narrow
// block, two on a wide one; the same every time for the same building.
const DOOR_KINDS = ['steel', 'wood', 'shutter', 'gate', 'steel', 'shutter'];
function pickDoors(cols, seed) {
  const r = rng(seed * 13 + 5);
  const doors = new Map();
  const n = cols >= 4 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * cols);
    doors.set(k, DOOR_KINDS[Math.floor(r() * DOOR_KINDS.length)]);
  }
  return doors;
}

// A Syrian street door, centred on x, standing on the ground (y = 0).
//   steel: painted sheet steel, double leaf, raised panels, a small grille
//          at head height (the common block entrance), paint flaking;
//   wood: an old Damascene door, planked, iron studs in rows, under a
//         pointed stone arch with a stone step;
//   shutter: a rolling steel shop shutter, ribbed, often half raised;
//   gate: a wrought-iron door with a geometric grille over dark glass.
export function syrianDoor(c, x, w, h, kind, seed = 1) {
  const r = rng(seed);
  const x0 = x - w / 2;
  const top = -h;
  // a stone surround and step, for all of them
  c.fillStyle = 'rgba(220,208,186,0.55)';
  c.fillRect(x0 - 7, top - 7, w + 14, h + 7);
  c.fillStyle = '#b3a589';
  c.fillRect(x0 - 12, -6, w + 24, 8);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(x0 - 12, -7, w + 24, 1.5);
  const paint = ['#3f6b5a', '#35566e', '#6a4a3a', '#5a6a3e', '#7a3f38', '#44505a'][Math.floor(r() * 6)];
  if (kind === 'wood') {
    // pointed (Damascene) arch
    const archH = w * 0.45;
    c.fillStyle = '#c9bb9d';
    c.beginPath();
    c.moveTo(x0 - 7, top + archH);
    c.quadraticCurveTo(x0 - 7, top - 6, x, top - archH * 0.5);
    c.quadraticCurveTo(x0 + w + 7, top - 6, x0 + w + 7, top + archH);
    c.fill();
    c.fillStyle = '#4a3322';
    c.beginPath();
    c.moveTo(x0, 0);
    c.lineTo(x0, top + archH);
    c.quadraticCurveTo(x0, top + 2, x, top - archH * 0.35);
    c.quadraticCurveTo(x0 + w, top + 2, x0 + w, top + archH);
    c.lineTo(x0 + w, 0);
    c.fill();
    // planks
    c.strokeStyle = 'rgba(20,12,6,0.45)';
    c.lineWidth = 1;
    for (let px = x0 + w / 6; px < x0 + w; px += w / 6) {
      c.beginPath();
      c.moveTo(px, 0);
      c.lineTo(px, top + archH * 0.4);
      c.stroke();
    }
    // the two leaves, and iron studs in rows
    c.strokeStyle = 'rgba(15,10,5,0.7)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, top + archH * 0.1);
    c.stroke();
    c.fillStyle = '#1a1511';
    for (let sy = top + archH + 8; sy < -10; sy += h / 7) {
      for (let sx = x0 + 6; sx < x0 + w - 3; sx += w / 5) {
        c.beginPath();
        c.arc(sx, sy, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    // a ring knocker
    c.strokeStyle = '#1a1511';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x + w * 0.2, top + h * 0.5, 3.5, 0, Math.PI * 2);
    c.stroke();
    return;
  }
  if (kind === 'shutter') {
    // the dark shop behind, then the shutter rolled part way down
    c.fillStyle = '#16120f';
    c.fillRect(x0 - 4, top, w + 8, h);
    const down = 0.35 + r() * 0.65;
    c.fillStyle = ['#8a8a84', '#7d8a8e', '#9a8f7a'][Math.floor(r() * 3)];
    c.fillRect(x0 - 4, top, w + 8, h * down);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let sy = top + 3; sy < top + h * down; sy += 4.5) c.fillRect(x0 - 4, sy, w + 8, 1.2);
    // the box it rolls into, a dent, a padlock at the bottom rail
    c.fillStyle = '#6a6862';
    c.fillRect(x0 - 8, top - 10, w + 16, 12);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(x0 + w * (0.3 + r() * 0.4), top + h * down * 0.6, 7, 4, 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#4a4540';
    c.fillRect(x - 3, top + h * down - 4, 6, 7);
    return;
  }
  if (kind === 'gate') {
    c.fillStyle = '#141414';
    c.fillRect(x0, top, w, h);
    c.fillStyle = 'rgba(120,140,150,0.18)';
    c.fillRect(x0 + 3, top + 3, w - 6, h * 0.62);
    // geometric grille: a lattice of diamonds over the glass
    c.strokeStyle = '#2a2826';
    c.lineWidth = 2;
    c.strokeRect(x0 + 2, top + 2, w - 4, h - 4);
    c.lineWidth = 1.3;
    c.beginPath();
    const step = w / 4;
    for (let d = -h; d < w + h; d += step) {
      c.moveTo(x0 + d, top);
      c.lineTo(x0 + d + h * 0.62, top + h * 0.62);
      c.moveTo(x0 + d, top + h * 0.62);
      c.lineTo(x0 + d + h * 0.62, top);
    }
    c.save();
    c.beginPath();
    c.rect(x0 + 2, top + 2, w - 4, h * 0.62);
    c.clip();
    c.stroke();
    c.restore();
    c.fillStyle = '#2a2826';
    c.fillRect(x0 + 2, top + h * 0.62, w - 4, h * 0.38 - 2);
    c.fillStyle = '#3a3632';
    c.fillRect(x0 + 5, top + h * 0.66, w - 10, h * 0.3);
    return;
  }
  // steel: double leaf, raised panels, a grille window, flaking paint
  c.fillStyle = paint;
  c.fillRect(x0, top, w, h);
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x, top);
  c.lineTo(x, 0);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 1;
  for (const lx of [x0 + 4, x + 4]) {
    const pw = w / 2 - 8;
    c.strokeRect(lx, top + h * 0.34, pw, h * 0.26);
    c.strokeRect(lx, top + h * 0.66, pw, h * 0.28);
  }
  // the small grille at head height
  c.fillStyle = '#15120f';
  c.fillRect(x0 + 6, top + 8, w - 12, h * 0.2);
  c.strokeStyle = 'rgba(0,0,0,0.8)';
  c.lineWidth = 1.2;
  c.beginPath();
  for (let gx = x0 + 10; gx < x0 + w - 6; gx += 5) {
    c.moveTo(gx, top + 8);
    c.lineTo(gx, top + 8 + h * 0.2);
  }
  c.stroke();
  // flaking paint and rust at the bottom
  c.fillStyle = 'rgba(150,90,50,0.45)';
  for (let i = 0; i < 6; i++) c.fillRect(x0 + r() * (w - 6), -8 - r() * h * 0.35, 2 + r() * 5, 1.5 + r() * 3);
  // handle
  c.fillStyle = '#c9b48a';
  c.fillRect(x + 3, top + h * 0.55, 6, 2);
}
