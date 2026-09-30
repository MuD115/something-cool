// Depth of field: things far down a street go soft, the deeper the softer.
// The thing is drawn offscreen (only the part of the screen it covers),
// blurred, and laid into the renderer's layers as if drawn normally.
//
// Two looks: 'soft' (a gaussian blur) and 'bokeh' (a disc-shaped blur, as a
// camera lens makes: light edges spread into round, even discs rather than
// fading haze). 'off' draws sharp.

const pool = [document.createElement('canvas'), document.createElement('canvas')];
const fit = (c, w, h) => {
  if (c.width < w) c.width = Math.ceil(w / 64) * 64;
  if (c.height < h) c.height = Math.ceil(h / 64) * 64;
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.filter = 'none';
  x.clearRect(0, 0, w, h);
  return x;
};

// the disc: the centre, a ring of 6 at half the radius and 12 at the edge
const DISC = [[0, 0]];
for (let i = 0; i < 6; i++) DISC.push([0.5 * Math.cos((i / 6) * Math.PI * 2), 0.5 * Math.sin((i / 6) * Math.PI * 2)]);
for (let i = 0; i < 12; i++) DISC.push([Math.cos((i / 12) * Math.PI * 2 + 0.26), Math.sin((i / 12) * Math.PI * 2 + 0.26)]);

// fn: draws the thing in world space. box: [x0, y0, x1, y1], its world
// bounds. k: 0 (sharp) … 1 (as far as it goes). opts.mode: 'bokeh' | 'soft'
// | 'off'; opts.alpha fades it; opts.cast: false for scenery that casts no
// shadow (paint); opts.mask(ctx): a world-space gradient, where the blur
// applies (drawn over the sharp version).
export function depthCast(R, fn, box, k, { mode = 'bokeh', alpha = 1, cast = true, mask = null } = {}) {
  const radius = k * R.W * 0.009;
  if (mode === 'off' || radius < 0.6) {
    if (alpha >= 0.999) {
      if (cast) R.cast(fn);
      else R.paint(fn);
      return;
    }
  }
  const m = R.layers.alb.x.getTransform();
  // the screen rectangle the thing covers, with room for the blur
  const pts = [
    [box[0], box[1]],
    [box[2], box[1]],
    [box[0], box[3]],
    [box[2], box[3]],
  ].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const pad = Math.ceil(radius + 2);
  const sx = Math.floor(Math.min(...pts.map((p) => p[0]))) - pad;
  const sy = Math.floor(Math.min(...pts.map((p) => p[1]))) - pad;
  const w = Math.ceil(Math.max(...pts.map((p) => p[0]))) + pad - sx;
  const h = Math.ceil(Math.max(...pts.map((p) => p[1]))) + pad - sy;
  if (w <= 0 || h <= 0 || w > R.W * 2 || h > R.H * 2) return;
  const [A, B] = pool;
  const a = fit(A, w, h);
  a.setTransform(m.a, m.b, m.c, m.d, m.e - sx, m.f - sy);
  fn(a);
  const b = fit(B, w, h);
  if (mode === 'off' || radius < 0.6) b.drawImage(A, 0, 0);
  else if (mode === 'soft') {
    b.filter = `blur(${radius.toFixed(2)}px)`;
    b.drawImage(A, 0, 0);
    b.filter = 'none';
  } else {
    // a disc kernel: the average of the thing shifted over a disc, kept as a
    // running mean (sample i at weight 1/(i+1)) so 8-bit colour doesn't drift
    DISC.forEach(([dx, dy], i) => {
      b.globalAlpha = 1 / (i + 1);
      b.drawImage(A, dx * radius, dy * radius);
    });
    b.globalAlpha = 1;
  }
  if (mask) {
    // blur only where the mask says (the far end); the sharp version is drawn first
    b.globalCompositeOperation = 'destination-in';
    b.setTransform(m.a, m.b, m.c, m.d, m.e - sx, m.f - sy);
    mask(b);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-over';
    if (cast) R.cast(fn);
    else R.paint(fn);
  }
  const put = (ctx, op) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.drawImage(B, 0, 0, w, h, sx, sy, w, h);
    ctx.restore();
  };
  put(R.layers.alb.x, 'source-over');
  put(R.layers.emit.x, 'destination-out');
  if (cast) put(R.layers.occ.x, 'source-over');
}

// A figure's rough world bounds, for depthCast.
export function figureBox(w) {
  const s = w.rig?.scale ?? 1;
  const x = w.rig?.x ?? w.x;
  const y = w.rig?.y ?? w.y;
  return [x - 80 * s, y - 230 * s, x + 80 * s, y + 10 * s];
}

// Scenery running away from us to a vanishing point (xc, vy): sharp at the
// near edge, softer towards the far end.
export function deepScenery(R, fn, box, xc, vy, span, mode = 'bokeh') {
  if (mode === 'off') return R.paint(fn);
  depthCast(R, fn, box, 1, {
    mode,
    cast: false,
    mask: (c) => {
      const grd = c.createRadialGradient(xc, vy, 0, xc, vy, span * 0.6);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(0.3, 'rgba(0,0,0,0.85)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grd;
      c.fillRect(box[0] - 50, box[1] - 50, box[2] - box[0] + 100, box[3] - box[1] + 100);
    },
  });
}
