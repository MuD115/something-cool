// The far distance, in layers that grow hazier and softer as they recede:
//   0.05  Mount Qasioun, the long ridge over Damascus, with its masts
//   0.10  Damascus itself: a dense low city, domes, minarets, towers, cranes
//   0.18  the nearer towns of Ghouta: broken roofs, water tanks, dishes, trees
// then air: haze lifting off the horizon, high cirrus, now and then a flock.
//
// The blurred layers are drawn once into small offscreen canvases (about half
// a pixel per world unit, with a canvas blur filter) and reused every frame,
// so the softness costs almost nothing. They're keyed by colour, which moves
// slowly with the light, and a few variants are kept.
//
// They draw into the emissive pass (R.far): unlit and already hazed, like the
// sky, so the lighting doesn't flatten them; nearer painted things cover them.

import { rng, noise1, lerp, clamp, mixc } from '../engine/util.js';
import { minaret } from './town.js';

const PX = 0.5; // canvas pixels per world unit
const LIFT = { ridge: -70, city: -60, towns: -50 };
const CACHE = new Map();
const MAX = 14;

const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const q = (c) => c.map((v) => Math.round(v / 6) * 6); // quantise, so colours cache

function cached(key, w, h, draw) {
  let e = CACHE.get(key);
  if (e) {
    CACHE.delete(key); // most recent last
    CACHE.set(key, e);
    return e;
  }
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * PX);
  cv.height = Math.ceil(h * PX);
  const c = cv.getContext('2d');
  draw(c);
  e = cv;
  CACHE.set(key, e);
  if (CACHE.size > MAX) CACHE.delete(CACHE.keys().next().value);
  return e;
}

// A layer's strip in world units: wide enough for the camera's whole travel.
const strip = (depth, span) => ({ x0: -1000, x1: 1000 + span * depth, y0: -620, y1: 160 });

function renderLayer(kind, depth, span, seed, color, blur, lite) {
  const s = strip(depth, span);
  const key = `${kind}|${seed}|${span}|${color.join(',')}|${lite ? 0 : blur}`;
  return {
    s,
    cv: cached(key, s.x1 - s.x0, s.y1 - s.y0, (c) => {
      c.scale(PX, PX);
      c.translate(-s.x0, -s.y0);
      if (!lite && blur) c.filter = `blur(${(blur * PX).toFixed(2)}px)`;
      c.fillStyle = css(color);
      c.strokeStyle = css(color);
      LAYERS[kind](c, s, rng(seed));
    }),
  };
}

const LAYERS = {
  // The ridge: long, low, rising to the west; a few masts on the summit.
  ridge(c, s, r) {
    c.beginPath();
    c.moveTo(s.x0, s.y1);
    let top = { x: 0, y: 0 };
    for (let x = s.x0; x <= s.x1; x += 12) {
      const k = (x - s.x0) / (s.x1 - s.x0);
      const rise = Math.pow(1 - k, 1.4) * 90 + 30; // higher in the west
      const y = -40 - rise - noise1(x * 0.004 + 3) * 30 - noise1(x * 0.017) * 9;
      if (y < top.y) top = { x, y };
      c.lineTo(x, y);
    }
    c.lineTo(s.x1, s.y1);
    c.closePath();
    c.fill();
    // the masts on the summit
    c.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const mx = top.x + (i - 1) * 46 + r() * 10;
      const my = top.y + 12 + Math.abs(i - 1) * 8;
      c.beginPath();
      c.moveTo(mx, my);
      c.lineTo(mx, my - 50 - r() * 30);
      c.stroke();
      c.fillRect(mx - 5, my - 30, 10, 5);
    }
  },

  // The city: dense low blocks, domes with finials, minarets, a few towers,
  // cranes left standing over buildings that were never finished.
  city(c, s, r) {
    const base = 30;
    c.beginPath();
    c.moveTo(s.x0, s.y1);
    for (let x = s.x0; x < s.x1; ) {
      const w = 14 + r() * 34;
      const h = 14 + r() * 48 + (r() < 0.06 ? 60 + r() * 60 : 0);
      c.lineTo(x, base - h);
      c.lineTo(x + w, base - h);
      x += w;
    }
    c.lineTo(s.x1, s.y1);
    c.closePath();
    c.fill();
    for (let x = s.x0 + 40; x < s.x1; x += 120 + r() * 220) {
      const kind = r();
      if (kind < 0.35) {
        // a dome on a drum, with a crescent finial
        const d = 16 + r() * 14;
        c.fillRect(x - d * 0.8, base - 50, d * 1.6, 22);
        c.beginPath();
        c.arc(x, base - 50, d, Math.PI, 0);
        c.fill();
        c.fillRect(x - 1, base - 50 - d - 10, 2, 10);
      } else if (kind < 0.75) {
        minaret(c, x, base - 30, 0.5 + r() * 0.25, c.fillStyle, false);
      } else if (kind < 0.88) {
        // a crane: mast, jib, counter-jib, the cable hanging
        const hgt = 150 + r() * 60;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, base - 20);
        c.lineTo(x, base - hgt);
        c.moveTo(x - 40, base - hgt + 6);
        c.lineTo(x + 110 + r() * 40, base - hgt + 6);
        c.stroke();
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x, base - hgt - 16);
        c.lineTo(x - 40, base - hgt + 6);
        c.moveTo(x, base - hgt - 16);
        c.lineTo(x + 100, base - hgt + 6);
        c.moveTo(x + 70, base - hgt + 6);
        c.lineTo(x + 70, base - hgt + 60);
        c.stroke();
        c.fillRect(x - 44, base - hgt + 4, 14, 10);
      } else {
        // a tower block
        c.fillRect(x, base - 120 - r() * 50, 26 + r() * 16, 140);
      }
    }
  },

  // The nearer towns: roofs with water tanks and dishes, broken tops with
  // rebar, cypress spires and olive crowns between the houses.
  towns(c, s, r) {
    const base = 40;
    const tops = [];
    c.beginPath();
    c.moveTo(s.x0, s.y1);
    for (let x = s.x0; x < s.x1; ) {
      const w = 40 + r() * 90;
      const h = 30 + r() * 80;
      const broken = r() < 0.28;
      c.lineTo(x, base - h);
      if (broken) {
        c.lineTo(x + w * 0.35, base - h + 6);
        c.lineTo(x + w * 0.5, base - h * 0.6);
        c.lineTo(x + w * 0.62, base - h * 0.75);
      }
      c.lineTo(x + w, base - h);
      tops.push([x, w, h, broken]);
      x += w;
    }
    c.lineTo(s.x1, s.y1);
    c.closePath();
    c.fill();
    for (const [x, w, h, broken] of tops) {
      const y = base - h;
      if (broken) {
        c.lineWidth = 1.2;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          const bx = x + w * (0.4 + i * 0.05);
          c.moveTo(bx, y + h * 0.3);
          c.lineTo(bx + (r() - 0.5) * 6, y + h * 0.3 - 10 - r() * 10);
        }
        c.stroke();
        continue;
      }
      if (r() < 0.55) {
        // water tank on legs
        const tx = x + 8 + r() * (w - 26);
        c.fillRect(tx, y - 16, 16, 11);
        c.fillRect(tx + 2, y - 5, 2, 5);
        c.fillRect(tx + 12, y - 5, 2, 5);
      }
      if (r() < 0.5) {
        // satellite dish
        const dx = x + 10 + r() * (w - 20);
        c.beginPath();
        c.ellipse(dx, y - 7, 5, 6, -0.5, 0, Math.PI * 2);
        c.fill();
        c.fillRect(dx - 0.5, y - 4, 1.5, 4);
      }
      if (r() < 0.35) {
        // a cypress, or an olive tree, between the houses
        const tx = x + w - 6;
        c.beginPath();
        if (r() < 0.5) c.ellipse(tx, base - h * 0.4 - 28, 7, 34, 0, 0, Math.PI * 2);
        else c.ellipse(tx, base - h * 0.35, 20, 14, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
  },

  // High cirrus: long thin streaks, soft.
  clouds(c, s, r) {
    for (let i = 0; i < 18; i++) {
      const x = s.x0 + r() * (s.x1 - s.x0);
      const y = s.y0 + 30 + r() * 150;
      const w = 120 + r() * 260;
      c.globalAlpha = 0.18 + r() * 0.25;
      c.beginPath();
      c.ellipse(x, y, w, 5 + r() * 7, -0.03 + r() * 0.06, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(x + w * 0.3, y + 6, w * 0.5, 3 + r() * 4, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  },
};

// Draw a cached layer image at its parallax depth.
// lift: raise the layer into the band of sky that shows above the street's
// roofs, through torn corners and down side streets.
function place(R, layer, depth, lift = 0) {
  R.layer(depth);
  R.far((c) => c.drawImage(layer.cv, layer.s.x0, layer.s.y0 + lift, layer.s.x1 - layer.s.x0, layer.s.y1 - layer.s.y0));
}

// A band of haze lifting off the horizon, in screen space.
function hazeBand(R, depth, y, color, alpha) {
  R.layer(depth);
  const [, v] = R.cam.toUv(0, y, R.W, R.H, depth);
  R.far((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const cy = v * R.H;
    const hgt = R.H * 0.12;
    const g = c.createLinearGradient(0, cy - hgt, 0, cy + hgt * 0.5);
    g.addColorStop(0, css(color, 0));
    g.addColorStop(0.65, css(color, alpha));
    g.addColorStop(1, css(color, alpha * 0.6));
    c.fillStyle = g;
    c.fillRect(0, cy - hgt, R.W, hgt * 1.5);
    c.restore();
  });
}

// opts: haze (rgb, the sky at the horizon), shade (rgb, the darkest far
// silhouette), cloud (rgb), span (how far the camera travels), seed, t,
// lights (0…1, windows lit in the city at dusk), lite (low quality).
export function horizon(R, { haze, shade, cloud = [255, 246, 232], span = 11000, seed = 1, t = 0, lights = 0, lite = false }) {
  const H = q(haze);
  const far = (fog) => q(mixc(shade, haze, fog));

  // the cirrus drifts slowly across the whole sky
  const cl = renderLayer('clouds', 0.03, span, seed + 5, q(cloud), 7, lite);
  R.layer(0.03);
  R.far((c) => {
    c.save();
    c.translate((t * 3) % 800, 0);
    c.globalAlpha = 0.9;
    c.drawImage(cl.cv, cl.s.x0 - 800, cl.s.y0, cl.s.x1 - cl.s.x0, cl.s.y1 - cl.s.y0);
    c.drawImage(cl.cv, cl.s.x0, cl.s.y0, cl.s.x1 - cl.s.x0, cl.s.y1 - cl.s.y0);
    c.restore();
  });

  if (!lite) {
    place(R, renderLayer('ridge', 0.05, span, seed + 1, far(0.6), 3.5, lite), 0.05, LIFT.ridge);
    hazeBand(R, 0.05, 20 + LIFT.ridge, H, 0.22);
    place(R, renderLayer('city', 0.1, span, seed + 2, far(0.42), 1.8, lite), 0.1, LIFT.city);
    if (lights > 0.02) cityLights(R, span, seed + 2, lights, t);
  }
  hazeBand(R, 0.1, 30 + LIFT.city, H, 0.14);
  place(R, renderLayer('towns', 0.18, span, seed + 3, far(0.24), 0.9, lite), 0.18, LIFT.towns);
  hazeBand(R, 0.18, 45 + LIFT.towns, H, 0.07);
  birds(R, t, seed, shade);
  R.layer(1);
}

// Generator lights coming on in the far city as the light goes.
function cityLights(R, span, seed, k, t) {
  const s = strip(0.1, span);
  R.layer(0.1);
  R.glow((c) => {
    const r = rng(seed * 7 + 3);
    for (let i = 0; i < 90; i++) {
      const x = s.x0 + r() * (s.x1 - s.x0);
      const y = 30 - 8 - r() * 40 + LIFT.city;
      const on = r() < k;
      const flick = 0.75 + 0.25 * Math.sin(t * (1 + r()) + i);
      if (!on) continue;
      c.fillStyle = `rgba(255,${190 + r() * 40},120,${0.55 * flick})`;
      c.fillRect(x, y, 2.2, 2.2);
    }
  });
}

// Now and then a loose flock crosses the distance.
function birds(R, t, seed, shade) {
  const period = 34;
  const u = (t % period) / 16;
  if (u > 1) return;
  const n = Math.floor(t / period);
  const r = rng(seed * 31 + n);
  const dir = r() < 0.5 ? 1 : -1;
  R.layer(0.25);
  const cx = R.cam.x * 0.25;
  R.far((c) => {
    c.fillStyle = css(shade, 0.7);
    for (let i = 0; i < 14; i++) {
      const bx = cx + dir * lerp(-1000, 1000, u) + (r() - 0.5) * 220 + Math.sin(t * 0.8 + i) * 10;
      const by = -330 - r() * 120 + Math.sin(t * 1.3 + i * 2) * 8;
      const flap = Math.sin(t * 9 + i * 1.7) * 2.5;
      c.beginPath();
      c.moveTo(bx - 5, by - flap);
      c.quadraticCurveTo(bx - 2, by - 1, bx, by);
      c.quadraticCurveTo(bx + 2, by - 1, bx + 5, by - flap);
      c.lineTo(bx, by + 1.2);
      c.fill();
    }
  });
  void clamp;
}

// Parse 'rgb(r,g,b)' or '#rrggbb' to [r, g, b].
export function rgbOf(str) {
  if (str.startsWith('#')) return [1, 3, 5].map((j) => parseInt(str.slice(j, j + 2), 16));
  return str.match(/[\d.]+/g).slice(0, 3).map(Number);
}
