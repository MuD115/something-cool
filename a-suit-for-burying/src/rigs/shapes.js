// Path helpers for hand-built silhouettes.

// Smooth closed (or open) curve through points, Catmull-Rom → Bézier.
export function smoothPath(ctx, pts, closed = true, tension = 1) {
  const n = pts.length;
  const p = (i) => (closed ? pts[(i + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const t = tension / 6;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * t,
      p1[1] + (p2[1] - p0[1]) * t,
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
}

export function fillSmooth(ctx, pts, color) {
  ctx.beginPath();
  smoothPath(ctx, pts, true);
  ctx.fillStyle = color;
  ctx.fill();
}

// A limb segment as a tapered capsule from (x0, y0, w0) to (x1, y1, w1).
export function limb(ctx, x0, y0, x1, y1, w0, w1, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 * 0.5, y0 + ny * w0 * 0.5);
  ctx.lineTo(x1 + nx * w1 * 0.5, y1 + ny * w1 * 0.5);
  ctx.arc(x1, y1, w1 * 0.5, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, false);
  ctx.lineTo(x0 - nx * w0 * 0.5, y0 - ny * w0 * 0.5);
  ctx.arc(x0, y0, w0 * 0.5, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function shade(hexColor, k) {
  const n = parseInt(hexColor.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k);
  const g = Math.min(255, ((n >> 8) & 255) * k);
  const b = Math.min(255, (n & 255) * k);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
