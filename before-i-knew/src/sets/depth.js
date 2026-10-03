// Depth for flat shapes. The world is drawn side-on, so a wall is a flat
// face; to give it a thickness we show, behind its outline, the faces a
// viewer a little below and to the left would see: the tops of things, and
// their right-hand sides. One oblique direction for the whole game, so every
// wall, slab and heap agrees about where "back" is.

// One unit of thickness goes this far on screen: back, up and to the right.
export const DEPTH = { x: 0.55, y: -0.4 };

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shadeRgb = ([r, g, b], k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;

// The thickness of a polygon (points [[x, y], …], either winding), `d`
// world units deep, drawn behind it: call before filling the face itself.
// Each edge whose outward side faces back along the depth direction gets a
// quad, shaded by which way it faces: tops lighter (the sky lights them),
// right-hand sides darker. `color` is the face colour (hex); or give `top`
// and `side` colours directly.
export function extrudePoly(c, pts, d, { color = '#8a8072', top = null, side = null, topK = 1.12, sideK = 0.6 } = {}) {
  const n = pts.length;
  if (n < 2 || d <= 0) return;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const s = area >= 0 ? 1 : -1;
  const vx = DEPTH.x * d;
  const vy = DEPTH.y * d;
  const base = color ? hexRgb(color) : null;
  const vl = Math.hypot(DEPTH.x, DEPTH.y);
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    const ex = bx - ax;
    const ey = by - ay;
    const len = Math.hypot(ex, ey);
    if (len < 0.01) continue;
    // outward normal (screen y down)
    const nx = (s * ey) / len;
    const ny = (-s * ex) / len;
    if ((nx * DEPTH.x + ny * DEPTH.y) / vl <= 0.02) continue;
    // how much this face looks up (a top) rather than right (a side)
    const up = Math.max(0, -ny);
    c.fillStyle = base ? shadeRgb(base, sideK + (topK - sideK) * up) : up > 0.5 ? top || side : side || top;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.lineTo(bx + vx, by + vy);
    c.lineTo(ax + vx, ay + vy);
    c.closePath();
    c.fill();
  }
}

// A rectangle's thickness (x, y top-left, w, h).
export function extrudeRect(c, x, y, w, h, d, opts) {
  extrudePoly(
    c,
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    d,
    opts,
  );
}

// Any path's thickness, for shapes that aren't polygons (arcs, curves):
// the path stamped a few times back along the depth direction, darker,
// with its far rim lit. path(c) builds the path. Cheaper to call with few
// steps; fine for small things.
export function extrudePath(c, path, d, { side = 'rgba(0,0,0,0.55)', top = null, steps = 3, rule = 'nonzero' } = {}) {
  c.save();
  c.fillStyle = side;
  for (let i = steps; i >= 1; i--) {
    const k = (d * i) / steps;
    c.save();
    c.translate(DEPTH.x * k, DEPTH.y * k);
    c.beginPath();
    path(c);
    c.fill(rule);
    c.restore();
  }
  if (top) {
    c.translate(DEPTH.x * d, DEPTH.y * d);
    c.beginPath();
    path(c);
    c.strokeStyle = top;
    c.lineWidth = 1.5;
    c.stroke();
  }
  c.restore();
}

// Inside a hole in a wall `d` thick: the reveal, the wall's own thickness
// seen through the hole's lower-left edges. Clipped to the hole; call after
// filling the hole dark.
export function holeReveal(c, pts, d, color = '#6a6256') {
  c.save();
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.clip();
  // the far opening, shifted back: what isn't covered by it is the reveal
  c.fillStyle = color;
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.translate(DEPTH.x * d, DEPTH.y * d);
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
  c.restore();
}
