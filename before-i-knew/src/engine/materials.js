// Materials: tileable surface textures, baked once at load from seeded
// noise. Each material has two maps, the same size and tiling:
//   detail – a grey detail map centred on mid-grey, laid over a base colour
//            with 'overlay' so the set's own colour survives (or, for the
//            few materials with colour of their own, a full-colour map)
//   height – relief, black low to white high; the renderer turns it into
//            surface normals so lights rake across mortar, pocks and cracks
//
// Everything is deterministic: the same seed gives the same wall on every
// visit and every machine.

import { rng, clamp, lerp } from './util.js';

let SIZE = 256;
const BAKED = new Map();

// Low quality bakes smaller maps (and the renderer skips relief anyway).
export function setMaterialSize(s) {
  if (s === SIZE) return;
  SIZE = s;
  BAKED.clear();
}

// Tileable value noise: lattice of period p, smooth interpolation, wrapped.
function lattice(p, seed) {
  const r = rng(seed);
  const g = new Float32Array(p * p);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const i0 = ((xi % p) + p) % p;
    const j0 = ((yi % p) + p) % p;
    const i1 = (i0 + 1) % p;
    const j1 = (j0 + 1) % p;
    const a = g[j0 * p + i0];
    const b = g[j0 * p + i1];
    const c = g[j1 * p + i0];
    const d = g[j1 * p + i1];
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
  };
}

// Fractal noise over the tile, in [0, 1]: octaves double the lattice so
// every octave still tiles.
function fbm(n, seed, base = 4, octaves = 5, gain = 0.5) {
  const out = new Float32Array(n * n);
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const p = base << o;
    const f = lattice(p, seed + o * 101);
    const k = p / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] += f(x * k, y * k) * amp;
    norm += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

// Stretch a field to fill [0, 1].
function normalise(a) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const s = hi > lo ? 1 / (hi - lo) : 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) * s;
  return a;
}

const wrap = (v, n) => ((v % n) + n) % n;

// Stamp a small soft dip (a pock, a chip) into a height field, wrapping.
function dip(h, n, cx, cy, rad, depth) {
  const r2 = rad * rad;
  for (let y = -Math.ceil(rad); y <= rad; y++) {
    for (let x = -Math.ceil(rad); x <= rad; x++) {
      const d2 = x * x + y * y;
      if (d2 > r2) continue;
      const i = wrap(cy + y, n) * n + wrap(cx + x, n);
      h[i] -= depth * (1 - d2 / r2);
    }
  }
}

// A wandering crack, carved as a thin groove.
function crack(h, n, r, x, y, len, depth) {
  let a = Math.PI / 2 + (r() - 0.5) * 1.2;
  for (let i = 0; i < len; i++) {
    a += (r() - 0.5) * 0.7;
    x += Math.cos(a);
    y += Math.sin(a);
    const i0 = wrap(Math.round(y), n) * n + wrap(Math.round(x), n);
    h[i0] -= depth;
    if (r() < 0.04) crack(h, n, r, x, y, len * 0.3, depth * 0.7);
  }
}

// Courses of cut stone: a height field of blocks with sunken joints, and
// each block's id (for per-stone tone).
function courses(n, r, rowH, minW, maxW, joint) {
  const h = new Float32Array(n * n);
  const id = new Float32Array(n * n);
  const rows = Math.round(n / rowH);
  const rh = n / rows;
  for (let row = 0; row < rows; row++) {
    const y0 = Math.round(row * rh);
    const y1 = Math.round((row + 1) * rh);
    // widths that sum exactly to the tile, so the courses wrap
    const ws = [];
    let sum = 0;
    while (sum < n - minW) {
      const w = Math.min(n - sum, minW + r() * (maxW - minW));
      ws.push(w);
      sum += w;
    }
    ws[ws.length - 1] += n - sum;
    const shift = Math.floor(r() * n);
    let xs = 0;
    for (const w of ws) {
      const tone = r();
      const bulge = 0.5 + r() * 0.5;
      for (let y = y0; y < y1; y++) {
        for (let x = Math.round(xs); x < Math.round(xs + w); x++) {
          const i = y * n + wrap(x + shift, n);
          const ex = Math.min(x - xs, xs + w - 1 - x);
          const ey = Math.min(y - y0, y1 - 1 - y);
          const e = Math.min(ex, ey);
          // a soft pillow of stone, dropping into the joint
          h[i] = e < joint ? 0.15 + 0.15 * (e / joint) : 0.55 + 0.25 * bulge * Math.min(1, (e - joint) / 6);
          id[i] = tone;
        }
      }
      xs += w;
    }
  }
  return { h, id };
}

// ------------------------------------------------------------- recipes --
// Each returns { detail: Float32Array(n*n) in [0, 1] (0.5 neutral) or
// colour: Uint8ClampedArray rgba, height: Float32Array in [0, 1] }.

const RECIPES = {
  // Cut limestone in courses, the stone of old Damascus.
  limestone(n, seed) {
    const r = rng(seed);
    const { h, id } = courses(n, r, n / 8, n / 6, n / 3, 2);
    const grain = fbm(n, seed + 3, 16, 4);
    const blot = fbm(n, seed + 9, 4, 3);
    const detail = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) {
      h[i] += (grain[i] - 0.5) * 0.18;
      detail[i] = 0.5 + (id[i] - 0.5) * 0.12 + (grain[i] - 0.5) * 0.22 + (blot[i] - 0.5) * 0.16 + (h[i] < 0.32 ? -0.14 : 0);
    }
    for (let k = 0; k < n / 10; k++) dip(h, n, Math.floor(r() * n), Math.floor(r() * n), 1 + r() * 2.2, 0.25);
    return { detail, height: h };
  },

  // Ablaq: limestone with courses of black basalt, as on the old houses and
  // mosques. Full colour; the wall's own tint is ignored.
  ablaq(n, seed) {
    const r = rng(seed);
    const rows = 8;
    const { h, id } = courses(n, r, n / rows, n / 5, n / 2.6, 2);
    const grain = fbm(n, seed + 5, 16, 4);
    const colour = new Uint8ClampedArray(n * n * 4);
    const rh = n / rows;
    const dark = new Set([1, 2, 5, 6]);
    for (let y = 0; y < n; y++) {
      const basalt = dark.has(Math.floor(y / rh));
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        h[i] += (grain[i] - 0.5) * (basalt ? 0.28 : 0.16);
        const g = (grain[i] - 0.5) * 0.25 + (id[i] - 0.5) * 0.12 + (h[i] < 0.32 ? -0.25 : 0);
        const c = basalt ? [62, 58, 54] : [205, 188, 158];
        const k = 1 + g;
        colour[i * 4] = c[0] * k;
        colour[i * 4 + 1] = c[1] * k;
        colour[i * 4 + 2] = c[2] * k;
        colour[i * 4 + 3] = 255;
      }
    }
    return { colour, height: h };
  },

  // Cement render over block: blotched, patched, with flakes fallen away to
  // show the blocks beneath, and hairline cracks.
  plaster(n, seed) {
    const r = rng(seed);
    const blot = fbm(n, seed, 4, 5, 0.55);
    const fine = fbm(n, seed + 2, 32, 3);
    const flake = normalise(fbm(n, seed + 7, 4, 4, 0.6));
    const blocks = courses(n, r, n / 6, n / 4, n / 4 + 1, 1.5).h;
    const h = new Float32Array(n * n);
    const detail = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) {
      const bare = flake[i] > 0.83; // where the render has come off
      h[i] = bare ? 0.2 + blocks[i] * 0.25 : 0.62 + (fine[i] - 0.5) * 0.14 + (blot[i] - 0.5) * 0.1;
      detail[i] = bare ? 0.36 + blocks[i] * 0.1 : 0.5 + (blot[i] - 0.5) * 0.3 + (fine[i] - 0.5) * 0.12;
    }
    for (let k = 0; k < 3; k++) crack(h, n, r, r() * n, r() * n, n * 0.5, 0.35);
    for (let k = 0; k < n / 16; k++) dip(h, n, Math.floor(r() * n), Math.floor(r() * n), 1 + r() * 1.5, 0.3);
    // cracks and pocks read darker too
    for (let i = 0; i < h.length; i++) if (h[i] < 0.4 && flake[i] <= 0.83) detail[i] -= 0.12;
    return { detail, height: h };
  },

  // Poured concrete: aggregate, formwork seams, blowholes.
  concrete(n, seed) {
    const r = rng(seed);
    const grain = fbm(n, seed, 32, 3);
    const blot = fbm(n, seed + 4, 4, 4);
    const h = new Float32Array(n * n);
    const detail = new Float32Array(n * n);
    const seam = n / 4;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const s = Math.abs((y % seam) - 0.5) < 1 ? -0.18 : 0; // a board line
        h[i] = 0.55 + (grain[i] - 0.5) * 0.22 + s;
        detail[i] = 0.5 + (grain[i] - 0.5) * 0.3 + (blot[i] - 0.5) * 0.22 + s * 0.5;
      }
    }
    for (let k = 0; k < n / 3; k++) {
      const x = Math.floor(r() * n);
      const y = Math.floor(r() * n);
      dip(h, n, x, y, 0.8 + r() * 1.4, 0.3);
      detail[y * n + x] -= 0.25;
    }
    crack(h, n, r, r() * n, 0, n * 0.7, 0.3);
    return { detail, height: h };
  },

  // Corrugated sheet and shutters: ridges, dents, rust.
  rust(n, seed) {
    const r = rng(seed);
    const blot = normalise(fbm(n, seed, 4, 5, 0.6));
    const fine = fbm(n, seed + 3, 32, 3);
    const h = new Float32Array(n * n);
    const colour = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const ridge = 0.5 + 0.5 * Math.sin((y / n) * Math.PI * 2 * 24);
        h[i] = 0.35 + ridge * 0.4 + (fine[i] - 0.5) * 0.1;
        const rusty = smoothstepJS(0.45, 0.75, blot[i]);
        const paint = [118, 112, 100];
        const ox = [124, 64, 34];
        const k = 0.85 + ridge * 0.25 + (fine[i] - 0.5) * 0.3;
        colour[i * 4] = lerp(paint[0], ox[0], rusty) * k;
        colour[i * 4 + 1] = lerp(paint[1], ox[1], rusty) * k;
        colour[i * 4 + 2] = lerp(paint[2], ox[2], rusty) * k;
        colour[i * 4 + 3] = 255;
      }
    }
    for (let k = 0; k < 6; k++) dip(h, n, Math.floor(r() * n), Math.floor(r() * n), 4 + r() * 8, 0.2);
    return { colour, height: h };
  },

  // Old painted wood: grain along the board, planks, flaking paint.
  wood(n, seed) {
    const warp = fbm(n, seed, 4, 3);
    const fine = fbm(n, seed + 1, 32, 2);
    const h = new Float32Array(n * n);
    const detail = new Float32Array(n * n);
    const plank = n / 6;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const g = Math.sin((x / n) * Math.PI * 2 * 9 + warp[i] * 5);
        const edge = Math.abs((x % plank) - 0.5) < 1.2;
        h[i] = edge ? 0.15 : 0.55 + g * 0.08 + (fine[i] - 0.5) * 0.08;
        detail[i] = edge ? 0.25 : 0.5 + g * 0.1 + (fine[i] - 0.5) * 0.15;
      }
    }
    return { detail, height: h };
  },

  // Asphalt: fine stone chip, patches, cracks.
  asphalt(n, seed) {
    const r = rng(seed);
    const chip = fbm(n, seed, 64, 2);
    const blot = fbm(n, seed + 6, 4, 4);
    const h = new Float32Array(n * n);
    const detail = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) {
      h[i] = 0.5 + (chip[i] - 0.5) * 0.35;
      detail[i] = 0.5 + (chip[i] - 0.5) * 0.35 + (blot[i] - 0.5) * 0.25;
    }
    for (let k = 0; k < 4; k++) crack(h, n, r, r() * n, r() * n, n * 0.4, 0.35);
    for (let i = 0; i < h.length; i++) if (h[i] < 0.3) detail[i] -= 0.2;
    return { detail, height: h };
  },

  // Pavement slabs.
  pavers(n, seed) {
    const r = rng(seed);
    const { h, id } = courses(n, r, n / 4, n / 4, n / 4 + 1, 1.5);
    const grain = fbm(n, seed + 2, 32, 3);
    const detail = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) {
      h[i] += (grain[i] - 0.5) * 0.15;
      detail[i] = 0.5 + (id[i] - 0.5) * 0.18 + (grain[i] - 0.5) * 0.2 + (h[i] < 0.32 ? -0.18 : 0);
    }
    return { detail, height: h };
  },

  // Woven cloth, for blankets, sheets and awnings.
  cloth(n, seed) {
    const fold = fbm(n, seed, 4, 3);
    const h = new Float32Array(n * n);
    const detail = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const weave = ((x >> 1) + (y >> 1)) & 1 ? 0.04 : -0.04;
        h[i] = 0.3 + fold[i] * 0.5 + weave;
        detail[i] = 0.5 + (fold[i] - 0.5) * 0.3 + weave;
      }
    }
    return { detail, height: h };
  },
};

function smoothstepJS(a, b, v) {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function toCanvas(n, fill) {
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const x = c.getContext('2d');
  const img = x.createImageData(n, n);
  fill(img.data);
  x.putImageData(img, 0, 0);
  return c;
}

// The baked maps for a material: { detail|colour canvas, height canvas }.
export function bake(name, seed = 1) {
  const key = `${name}:${seed}:${SIZE}`;
  let m = BAKED.get(key);
  if (m) return m;
  const n = SIZE;
  const res = RECIPES[name](n, seed * 7919 + name.length);
  const hgt = normalise(res.height);
  m = {
    full: !!res.colour,
    tex: toCanvas(n, (d) => {
      if (res.colour) d.set(res.colour);
      else
        for (let i = 0; i < n * n; i++) {
          const v = clamp(res.detail[i]) * 255;
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
          d[i * 4 + 3] = 255;
        }
    }),
    height: toCanvas(n, (d) => {
      for (let i = 0; i < n * n; i++) {
        const v = hgt[i] * 255;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
        d[i * 4 + 3] = 255;
      }
    }),
  };
  BAKED.set(key, m);
  return m;
}

export const MATERIALS = Object.keys(RECIPES);

// How many world units one texel covers, per material: stone courses are
// cut to a person's scale, render and concrete read best a little larger.
export const MAT_SCALE = { limestone: 0.62, ablaq: 0.62, plaster: 1.5, concrete: 1.25, rust: 0.7, wood: 0.6, asphalt: 1.1, pavers: 0.9, cloth: 0.7 };

// Two passes at unrelated scales and offsets, so a big wall never shows the
// tile repeating (a second, fainter pass of a different seed breaks it up).
export function textureWall(ctx, name, { seed = 1, alpha = 1 } = {}) {
  const k = MAT_SCALE[name] || 1;
  texturePath(ctx, name, { seed, scale: k, alpha });
  if (!bake(name, seed).full) texturePath(ctx, name, { seed: seed + 11, scale: k * 1.73, ox: 97, oy: 41, alpha: alpha * 0.45 });
}
export function heightWall(ctx, name, { seed = 1 } = {}) {
  const k = MAT_SCALE[name] || 1;
  heightPath(ctx, name, { seed, scale: k });
  heightPath(ctx, name, { seed: seed + 11, scale: k * 1.73, ox: 97, oy: 41, alpha: 0.35 });
}

// Patterns are cached per material and map; a CanvasPattern can be used on
// any 2D context.
const PATTERNS = new Map();
export function pattern(ctx, name, map = 'tex', seed = 1) {
  const key = `${name}:${seed}:${SIZE}:${map}`;
  let p = PATTERNS.get(key);
  if (!p) {
    p = ctx.createPattern(bake(name, seed)[map], 'repeat');
    PATTERNS.set(key, p);
  }
  return p;
}

// Fill the current path with a material over whatever colour is already
// there: detail maps blend with 'overlay', full-colour maps replace it.
// scale: world units per texel (1 = one texel per unit).
export function texturePath(ctx, name, { alpha = 1, scale = 1, seed = 1, ox = 0, oy = 0, rule = 'nonzero' } = {}) {
  const m = bake(name, seed);
  const p = pattern(ctx, name, 'tex', seed);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (!m.full) ctx.globalCompositeOperation = 'overlay';
  p.setTransform?.(new DOMMatrix([scale, 0, 0, scale, ox, oy]));
  ctx.fillStyle = p;
  ctx.fill(rule);
  ctx.restore();
}

// The same path's relief into a height layer.
export function heightPath(ctx, name, { alpha = 1, scale = 1, seed = 1, ox = 0, oy = 0, rule = 'nonzero' } = {}) {
  const p = pattern(ctx, name, 'height', seed);
  ctx.save();
  ctx.globalAlpha *= alpha;
  p.setTransform?.(new DOMMatrix([scale, 0, 0, scale, ox, oy]));
  ctx.fillStyle = p;
  ctx.fill(rule);
  ctx.restore();
}

// Wisps of high cloud: a wide, tiling alpha map, stretched out along the
// wind, soft-edged, with holes. White; the sky tints it.
let CLOUDS = null;
export function cloudCanvas() {
  if (CLOUDS) return CLOUDS;
  const n = 256;
  const a = fbm(n, 4242, 4, 6, 0.55);
  const b = fbm(n, 999, 2, 3, 0.5);
  CLOUDS = toCanvas(n, (d) => {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const v = smoothstepJS(0.5, 0.78, a[i] * 0.75 + b[i] * 0.35);
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
        d[i * 4 + 3] = v * 255;
      }
    }
  });
  return CLOUDS;
}
