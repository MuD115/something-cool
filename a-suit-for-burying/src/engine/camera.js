// A 2D film camera: centre, framing width (in world units) and shake.
// Layers take a parallax depth: 1 is the action plane, <1 is further away,
// >1 is foreground that sweeps past faster than the actors.

import { noise1 } from './util.js';

export const BASE_VIEW = 1400;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = -220;
    this.view = BASE_VIEW;
    this.shake = 0;
    this.time = 0;
  }

  set({ x = this.x, y = this.y, view = this.view, shake = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.view = view;
    this.shake = shake;
  }

  // Scale and offset for a layer at the given depth.
  frame(W, H, depth = 1) {
    // The view width is framed for 2.39:1; taller frames keep the same
    // vertical coverage plus a little, rather than zooming out sideways.
    const base = Math.max(W / BASE_VIEW, (H * 2.39 * 0.62) / BASE_VIEW);
    const s = base * Math.pow(BASE_VIEW / this.view, depth);
    const sx = this.shake * 14 * noise1(this.time * 23.1);
    const sy = this.shake * 10 * noise1(this.time * 19.7 + 40);
    return {
      s,
      ox: W / 2 - this.x * depth * s + sx * depth,
      oy: H / 2 - this.y * depth * s + sy * depth,
    };
  }

  apply(ctx, W, H, depth = 1) {
    const f = this.frame(W, H, depth);
    ctx.setTransform(f.s, 0, 0, f.s, f.ox, f.oy);
  }

  // World point → texture coordinates (0…1, y down).
  toUv(x, y, W, H, depth = 1) {
    const f = this.frame(W, H, depth);
    return [(x * f.s + f.ox) / W, (y * f.s + f.oy) / H];
  }
}
