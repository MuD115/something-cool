// Small, continuous motion for the sets: so the street never stands still.
// Everything here is cheap (a handful of draw calls, no allocation of canvases)
// and quiet: periods of 2-8 s, amplitudes of a few units.
//
// `t` is the game's clock. Layering follows the sets: R.cast for things that
// take light and shadow, R.paint for flat shapes, R.glow for light.

const TAU = Math.PI * 2;
const fract = (v) => v - Math.floor(v);

// A wind that is mostly a breath and now and then a gust. -1 … 1, mostly small.
// On low quality (or when auto quality has had to drop the resolution) the
// purely decorative extras step out: smoke, birds in flight, the bag, drips
// and motes. Trees, cloth and wires keep moving; they cost little.
let lite = false;
export const ambientLite = () => lite;
export function setAmbientLite(v) {
  lite = !!v;
}

// ---- the wind as a field -------------------------------------------------
// Gusts are fronts: they travel along x at GUST_SPEED, so a gust passes through
// the trees, the washing and the dust one after another. gustAt is the front's
// envelope, 0 … 1 (zero most of the time); windAt adds the carried flutter.
const GUST_SPEED = 360; // world units per second, towards +x
export function gustAt(t, x = 0) {
  const u = t - x / GUST_SPEED;
  return Math.max(0, Math.sin(u * 0.21 + 1.3)) * Math.max(0, Math.sin(u * 0.53 + 0.4));
}
export function windAt(t, x = 0, ph = 0) {
  const u = t - x / GUST_SPEED;
  const g = gustAt(t, x);
  return (0.55 * Math.sin(t * 0.9 + ph + x * 0.002) + 0.3 * Math.sin(t * 1.7 + ph * 2.1) + 1.0 * g * Math.sin(u * 2.6 + ph)) * 0.8;
}
export function wind(t, ph = 0) {
  return windAt(t, 0, ph);
}

// Rotate the canvas about (px, py) by a sway of `amp` radians: trees, vines.
export function lean(c, px, py, t, ph = 0, amp = 0.02) {
  c.translate(px, py);
  c.rotate(windAt(t, px, ph) * amp);
  c.translate(-px, -py);
}

// A hanging cloth (a sheet, a shirt, a curtain, a flag): fixed along its top
// edge, its foot rippling; the ripple travels down it. (x, y) is the top left.
export function cloth(c, x, y, w, h, col, t, ph = 0, { amp = 3, sag = 3, folds = 0.1, period = 2.4 } = {}) {
  const wv = windAt(t, x + w / 2, ph);
  const off = (v) => Math.sin(t * (TAU / period) - v * 2.2 + ph) * amp * v * v + wv * amp * 1.4 * v;
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w + off(0.5), y + h * 0.5);
  c.lineTo(x + w + off(1), y + h);
  c.quadraticCurveTo(x + w / 2 + off(1) + off(0.9) * 0.2, y + h + sag, x + off(1), y + h);
  c.lineTo(x + off(0.5), y + h * 0.5);
  c.closePath();
  c.fill();
  if (folds) {
    c.fillStyle = `rgba(0,0,0,${folds})`;
    for (let i = 1; i < 4; i++) c.fillRect(x + (w * i) / 4 + off(0.6) * 0.5, y + 3, 1.4, h - 5);
  }
}

// A flag or a pennant on its pole end: base at (x, y), streaming to the right.
export function flag(c, x, y, w, h, col, t, ph = 0) {
  const wv = 0.5 + 0.5 * windAt(t, x, ph);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    c.lineTo(x + w * u, y + Math.sin(t * 5 - u * 4 + ph) * h * 0.22 * u * (0.6 + wv) + u * h * 0.1);
  }
  for (let i = n; i >= 1; i--) {
    const u = i / n;
    c.lineTo(x + w * u, y + h + Math.sin(t * 5 - u * 4 + ph) * h * 0.22 * u * (0.6 + wv) + u * h * 0.1);
  }
  c.lineTo(x, y + h);
  c.closePath();
  c.fill();
}

// A rope, wire or cable that bobs very slightly: quadratic from a to b with
// its sag breathing. Returns nothing; the caller sets the stroke style.
export function wire(c, ax, ay, bx, by, sag, t, ph = 0, amp = 1.6) {
  const s = sag + Math.sin(t * 1.3 + ph) * amp + windAt(t, (ax + bx) / 2, ph) * amp;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + s, bx, by);
  c.stroke();
}

// Smoke from a chimney or a stove pipe: a column of soft puffs drifting up and
// leaning with the wind. warm = 0 (thin grey, daytime) … 1 (evening, warmer).
export function smoke(R, x, y, t, { warm = 0, h = 150, w = 16, alpha = 0.3, seed = 0 } = {}) {
  if (lite) return;
  R.paint((c) => {
    const lean = windAt(t, x, seed) * 22 + 10;
    for (let i = 0; i < 14; i++) {
      const u = fract(t / 8 + i / 14 + seed * 0.37); // age 0…1
      const px = x + lean * u * u * 2 + Math.sin(t * 0.8 + i * 1.9 + seed) * 5 * u;
      const py = y - h * u;
      const r = 3 + w * 1.15 * u;
      const a = alpha * 0.55 * Math.sin(Math.min(1, u * 1.2) * Math.PI) * (1 - u * 0.35);
      c.fillStyle = warm > 0 ? `rgba(${Math.round(150 + 60 * warm)},${Math.round(144 + 22 * warm)},${Math.round(140 - 20 * warm)},${a})` : `rgba(150,148,146,${a})`;
      c.beginPath();
      c.arc(px, py, r, 0, TAU);
      c.fill();
    }
  });
}

const flapAt = (t, i) => Math.sin(t * 17 + i * 2.1);

// A pigeon in flight, seen side-on, centred on (x, y), flying to the right (d = 1) or left.
function flyingBird(c, x, y, s, d, t, i) {
  const f = flapAt(t, i);
  c.beginPath();
  c.moveTo(x - 7 * s * d, y);
  c.quadraticCurveTo(x - 2 * s * d, y - 6 * s * f - 2 * s, x + 1 * s * d, y - 1 * s);
  c.quadraticCurveTo(x + 4 * s * d, y - 6 * s * f - 2 * s, x + 9 * s * d, y);
  c.lineTo(x + 3 * s * d, y + 2 * s);
  c.lineTo(x - 3 * s * d, y + 2 * s);
  c.closePath();
  c.fill();
}

// Pigeons crossing the sky now and then: a small flock every `every` seconds,
// taking `dur` to cross the view. Drawn on a far layer so they feel high.
export function flock(R, camX, t, { y = -330, n = 4, every = 53, dur = 11, seed = 0, color = 'rgba(52,48,50,0.75)', layer = 0.55, dir = 1 } = {}) {
  if (lite) return;
  const u = ((t + seed * 17) % every) / dur;
  if (u > 1) return;
  R.layer(layer);
  R.paint((c) => {
    c.fillStyle = color;
    const x0 = camX * layer - 900;
    for (let i = 0; i < n; i++) {
      const x = dir > 0 ? x0 + u * 1800 + i * 26 - Math.abs(i - n / 2) * 6 : x0 + 1800 - u * 1800 + i * 26;
      const yy = y - u * 40 + Math.sin(t * 1.1 + i) * 8 + (i % 2) * 14;
      flyingBird(c, x, yy, 1, dir, t, i);
    }
  });
  R.layer(1);
}

// A pigeon sitting on a parapet or a wire: now and then it hops, turns or pecks.
export function perch(R, x, y, t, seed = 0, { s = 1.6, color = '#4a4640' } = {}) {
  R.cast((c) => {
    const u = ((t + seed * 3.3) % 9) / 9;
    const hop = u > 0.62 && u < 0.69 ? Math.sin(((u - 0.62) / 0.07) * Math.PI) * 6 * s : 0;
    const peck = u > 0.2 && u < 0.3 ? Math.sin(((u - 0.2) / 0.1) * Math.PI) * 0.7 : 0;
    const face = ((t + seed) % 21 > 13 ? -1 : 1);
    c.save();
    c.translate(x, y - hop);
    c.scale(face, 1);
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(0, -5 * s, 6 * s, 4.2 * s, -0.2, 0, TAU); // body
    c.fill();
    c.beginPath();
    c.moveTo(-5 * s, -5 * s);
    c.lineTo(-11 * s, -3 * s); // the tail
    c.lineTo(-5 * s, -2 * s);
    c.fill();
    c.save();
    c.translate(5 * s, -8 * s);
    c.rotate(peck);
    c.beginPath();
    c.arc(2 * s, -1 * s, 2.4 * s, 0, TAU); // the head
    c.fill();
    c.fillStyle = '#d8b878';
    c.fillRect(4 * s, -1.6 * s, 2.4 * s, 1.2 * s);
    c.restore();
    c.strokeStyle = '#3a2a28';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-1 * s, -1 * s);
    c.lineTo(-1 * s, 0);
    c.moveTo(2 * s, -1 * s);
    c.lineTo(2 * s, 0);
    c.stroke();
    c.restore();
  });
}

// A drip from a pipe's mouth at (x, y): a bead swells, falls, and splashes a
// dark spot on `ground`. Period about 2.2 s.
export function drip(R, x, y, ground, t, seed = 0) {
  if (lite) return;
  const per = 2.2 + (seed % 3) * 0.3;
  const u = ((t + seed * 1.7) % per) / per;
  R.cast((c) => {
    c.fillStyle = 'rgba(110,130,150,0.8)';
    if (u < 0.55) {
      c.beginPath();
      c.ellipse(x, y + 1 + u * 3, 1.2 + u * 1.6, 1.6 + u * 2.4, 0, 0, TAU);
      c.fill();
    } else {
      const v = (u - 0.55) / 0.45;
      const fy = y + 3 + (ground - y - 3) * v * v;
      if (v < 0.97) {
        c.beginPath();
        c.ellipse(x, fy, 1.1, 2.4, 0, 0, TAU);
        c.fill();
      }
    }
  });
  if (u > 0.97 || u < 0.12) {
    R.paint((c) => {
      const k = u > 0.5 ? 0 : u / 0.12;
      c.fillStyle = `rgba(40,34,30,${0.35 * (1 - k)})`;
      c.beginPath();
      c.ellipse(x, ground, 3 + k * 7, 1 + k * 1.4, 0, 0, TAU);
      c.fill();
    });
  }
}

// A plastic bag tumbling down the street on the draught, every so often.
export function bag(R, camX, t, { every = 47, dur = 15, seed = 0, y = 0 } = {}) {
  if (lite) return;
  const u = ((t + seed * 9) % every) / dur;
  if (u > 1) return;
  const x = camX - 700 + u * 1400;
  const hop = Math.abs(Math.sin(t * 3.3 + seed)) * 26 * (0.4 + 0.6 * Math.sin(u * Math.PI));
  const by = y - 12 - hop;
  R.paint((c) => {
    c.save();
    c.translate(x, by);
    c.rotate(t * 4.2 + seed);
    const sq = 0.7 + 0.3 * Math.sin(t * 9);
    c.scale(1, sq);
    c.fillStyle = 'rgba(232,230,222,0.78)';
    c.beginPath();
    c.moveTo(-7, -2);
    c.quadraticCurveTo(-2, -9, 6, -5);
    c.quadraticCurveTo(10, 0, 4, 6);
    c.quadraticCurveTo(-4, 8, -7, -2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-2, -4, 3, 4);
    c.restore();
  });
}

// A few warm drifting motes in a patch of sun (a doorway, a shaft): x0…x1,
// from y0 up to y1. Brief and soft.
export function sunMotes(R, x0, x1, y0, y1, t, { n = 12, seed = 0, color = '255,230,180' } = {}) {
  if (lite) return;
  R.glow((c) => {
    for (let i = 0; i < n; i++) {
      const a = fract(Math.sin((i + 1) * 91.7 + seed * 13.1) * 437.5);
      const b = fract(Math.sin((i + 1) * 31.3 + seed * 7.7) * 937.1);
      const x = x0 + (x1 - x0) * fract(a + t * (0.004 + a * 0.006)) + Math.sin(t * 0.6 + i * 2) * 6;
      const y = y0 + (y1 - y0) * b + Math.sin(t * 0.45 + i * 1.3) * 9;
      c.fillStyle = `rgba(${color},${0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.7))})`;
      c.fillRect(x, y, 1.8, 1.8);
    }
  });
}

// A cat's tail, curling and uncurling from (x, y) (the base), facing d.
export function tail(c, x, y, t, d = 1, ph = 0, len = 20) {
  c.strokeStyle = '#2a2420';
  c.lineWidth = 3;
  c.lineCap = 'round';
  const k = Math.sin(t * 1.6 + ph);
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x - d * len * 0.6, y - 2 + k * 4, x - d * len * 0.8, y - len * 0.6 + k * 6);
  c.stroke();
}

// A strand of leaf-clusters swaying as if in a breeze: for vines, a bush.
// (cx, cy) the pivot; leaves are given as [dx, dy, r] relative to it.
export function leaves(c, cx, cy, list, cols, t, ph = 0, amp = 0.05) {
  c.save();
  lean(c, cx, cy, t, ph, amp);
  list.forEach(([dx, dy, r], i) => {
    const sway = Math.sin(t * 1.8 + i * 1.3 + ph) * 1.2;
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.ellipse(cx + dx + sway, cy + dy, r, r * 0.8, i, 0, TAU);
    c.fill();
  });
  c.restore();
}

// ---- the sun's day ---------------------------------------------------------
// One arc for every daytime act. p: 0 = mid-afternoon, white-gold … 0.52 =
// amber … 1 = rose, the sun nearly gone. Each act maps its own k onto it with
// DAY, so shadows, key light colour and the sky agree from one act to the next.
export const DAY = {
  one: (k) => 0.52 * clampK(k), // Act One: afternoon -> late afternoon
  two: (k) => 0.55 + 0.45 * clampK(k), // Act Two, Retrieval: 4:30 -> 7 pm
  witness: (k) => 0.55 + 0.4 * clampK(k), // 4:35 -> 5:35 pm
  grief: (k) => 0.08 + 0.72 * (clampK(k) * clampK(k) * 0.5 + clampK(k) * 0.5),
};
function clampK(k) {
  return k < 0 ? 0 : k > 1 ? 1 : k || 0;
}
const KEY = [[0, [1.0, 0.96, 0.9]], [0.3, [1.0, 0.82, 0.58]], [0.52, [1.0, 0.7, 0.42]], [0.78, [1.0, 0.52, 0.28]], [1, [0.85, 0.42, 0.42]]];
let sunP = -1;
let sunO = null;
// sunAt(p) -> { p, shear, squash, color (key light rgb 0..1), warmth 0..1,
// elev 1..0.1 (how high the sun stands), glare [x, y] for the sky disc }.
// The object is shared and memoised on p: read it, do not keep or change it.
export function sunAt(p) {
  p = clampK(p);
  if (p === sunP) return sunO;
  let i = 1;
  while (i < KEY.length - 1 && p > KEY[i][0]) i++;
  const [p0, a] = KEY[i - 1];
  const [p1, b] = KEY[i];
  const f = (p - p0) / (p1 - p0);
  const e = p * p * (3 - 2 * p);
  sunP = p;
  sunO = {
    p,
    shear: 0.3 + 3.3 * p, // shadows lengthen
    squash: 0.12 - 0.03 * p,
    color: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
    warmth: p,
    elev: 1 - 0.9 * e,
    glare: [0.78 + 0.12 * p, 0.16 + 0.46 * e],
  };
  return sunO;
}

// ---- dust in the street ----------------------------------------------------
let puffSprite = null;
function puff() {
  if (puffSprite) return puffSprite;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  puffSprite = cv;
  return cv;
}
const tinted = new Map();
function puffTint(rgb) {
  const key = rgb.map((v) => v >> 3).join(',');
  let s = tinted.get(key);
  if (s) return s;
  const src = puff();
  s = document.createElement('canvas');
  s.width = s.height = 32;
  const c = s.getContext('2d');
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = `rgb(${rgb.join(',')})`;
  c.fillRect(0, 0, 32, 32);
  if (tinted.size > 24) tinted.clear();
  tinted.set(key, s);
  return s;
}
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

// Soft dust lifted from the street while a gust passes, and now and then a
// small dust devil that crosses a stretch of the road and dies away. World-
// anchored (it stays put when the camera moves); `lite` skips it entirely.
// color: dust rgb 0..255 (warmer late in the day).
export function streetDust(R, camX, t, { y = 0, color = [196, 176, 146], amount = 1, seed = 0, devils = true } = {}) {
  if (lite) return;
  const N = 14;
  const SPAN = 1900;
  const left = camX - SPAN / 2;
  // is there any gust in view? (cheap early out)
  let any = 0;
  for (let i = 0; i < 5; i++) any = Math.max(any, gustAt(t, left + (i / 4) * SPAN));
  const cyc = Math.floor((t + seed * 13) / 43);
  const du = (((t + seed * 13) % 43) / 9);
  const dev = devils && du < 1;
  if (any < 0.04 && !dev) return;
  const spr = puffTint(color);
  R.glow((c) => {
    c.save();
    if (any >= 0.04) {
      for (let i = 0; i < N; i++) {
        const a = hash(i + seed * 7);
        const b = hash(i * 3.1 + 9 + seed);
        const bx = a * SPAN + t * (8 + b * 10);
        const x0 = left + ((((bx + 0) - left) % SPAN) + SPAN) % SPAN;
        const gu = gustAt(t, x0);
        if (gu < 0.03) continue;
        const gw = Math.sin((t - x0 / GUST_SPEED) * 2.6) * 0.5 + 0.5;
        const x = x0 + gu * (90 + 120 * b);
        const py = y + 20 - b * 46 - gu * (14 + 30 * a) * (0.6 + 0.4 * gw);
        const r = 20 + 30 * b + 26 * gu;
        c.globalAlpha = Math.min(0.4, gu * amount * (0.2 + 0.25 * a));
        c.drawImage(spr, x - r, py - r * 0.55, r * 2, r * 1.1);
      }
    }
    if (dev) {
      // the dust devil: a leaning column of puffs, wide at the top, crossing ~420 units
      const x0 = camX + (hash(cyc * 1.7 + seed) - 0.5) * 900;
      const dir = hash(cyc * 2.9 + 3 + seed) > 0.5 ? 1 : -1;
      const fade = Math.sin(Math.min(1, du) * Math.PI);
      const cx = x0 + dir * du * 420;
      for (let i = 0; i < 10; i++) {
        const h = i / 9;
        const ang = t * 7 + i * 1.1;
        const rad = 10 + h * 34;
        const px = cx + Math.cos(ang) * rad + dir * h * 26;
        const py = y - 6 - h * h * 150 - h * 20;
        const r = 12 + h * 26;
        c.globalAlpha = Math.min(0.4, fade * amount * (0.45 - h * 0.25) * (0.7 + 0.3 * Math.sin(ang)));
        c.drawImage(spr, px - r, py - r * 0.8, r * 2, r * 1.6);
      }
      // dust at its foot
      c.globalAlpha = fade * 0.35 * amount;
      c.drawImage(spr, cx - 70, y - 6, 140, 34);
    }
    c.restore();
  });
}

// A thin cloud crossing the moon: 0 … 1 (1 = fully veiled), every ~70 s, ~9 s long.
export function moonVeil(t, seed = 0) {
  const u = ((t + seed * 11 + 38) % 71) / 9;
  return u > 1 ? 0 : Math.sin(u * Math.PI) ** 1.5;
}
// where that cloud is on its way across: 0 … 1 while it is there, otherwise > 1
export const moonVeilU = (t, seed = 0) => ((t + seed * 11 + 38) % 71) / 9;
// a soft tinted sprite (a puff of cloud or mist) for sky drawing: draw it stretched
export const softPuff = (rgb) => puffTint(rgb);

// Low mist lying along the street: a few wide soft banks drifting slowly, world
// anchored. density 0 … 1; lift 0 … 1 raises the banks and thins them (as the
// morning lifts it). color: rgb 0..255. Cheap: <= 16 sprite draws, 8 when lite.
export function mistBand(R, camX, t, { y = 0, density = 1, lift = 0, color = [160, 172, 204], seed = 0, span = 2400 } = {}) {
  if (density < 0.02) return;
  const spr = puffTint(color);
  const n = lite ? 8 : 16;
  const left = camX - span / 2;
  R.glow((c) => {
    c.save();
    for (let i = 0; i < n; i++) {
      const a = hash(i * 1.3 + seed * 5);
      const b = hash(i * 2.7 + 4 + seed);
      const bx = a * span + t * (4 + b * 7);
      const x = left + ((((bx - left) % span) + span) % span);
      const w = 360 + 460 * b;
      const h = 70 + 90 * a + lift * 110;
      const py = y - h * 0.3 - lift * (40 + 70 * b) - 4;
      const breathe = 0.8 + 0.2 * Math.sin(t * 0.25 + i * 1.7);
      c.globalAlpha = Math.min(0.5, density * (0.2 + 0.15 * b) * breathe * (1 - lift * 0.5));
      c.drawImage(spr, x - w / 2, py - h / 2, w, h);
    }
    c.restore();
  });
}
