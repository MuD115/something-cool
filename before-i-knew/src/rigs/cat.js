// A thin tabby with a torn left ear. Sits, blinks slowly, stands, walks and
// drops off walls. Local frame: facing right, ground at y = 0.

import { ik2, noise1, lerp, clamp } from '../engine/util.js';
import { smoothPath, limb } from './shapes.js';

const COAT = '#6e5d4a';
const DARK = '#3e3328';

export class Cat {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.f = 1;
    this.sit = 1; // 1 sitting … 0 standing
    this.speed = 0;
    this.phase = 0;
    this.blink = 0;
    this.time = 0;
    this.headTurn = 0; // 0 profile … 1 facing the camera
    this.hidden = false;
  }

  update(dt) {
    this.time += dt;
    if (this.speed > 1) this.phase = (this.phase + dt * this.speed * 0.012) % 1;
  }

  draw(ctx) {
    if (this.hidden) return;
    const s = this.sit;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.f * 0.9, 0.9);

    const rump = [lerp(-26, -18, s), lerp(-30, -14, s)];
    const chest = [lerp(24, 10, s), lerp(-32, -42, s)];

    // tail: curls round the feet when sitting, sweeps when walking
    ctx.strokeStyle = COAT;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rump[0] - 4, rump[1]);
    const sway = noise1(this.time * 0.8) * 8;
    if (s > 0.5) ctx.bezierCurveTo(-38, 0, 0, 6, 22 + sway, 0);
    else ctx.bezierCurveTo(-48, -40 + sway, -58, -54, -52 + sway, -64);
    ctx.stroke();

    // legs
    const legs = [
      [chest[0] - 4, chest[1] + 8, 0.0, true],
      [chest[0] + 2, chest[1] + 8, 0.5, false],
      [rump[0] + 2, rump[1] + 4, 0.25, true],
      [rump[0] - 4, rump[1] + 4, 0.75, false],
    ];
    const drawLeg = ([hx, hy, off, near]) => {
      const ph = (this.phase + off) % 1;
      const walking = this.speed > 1 && s < 0.5;
      let fx = hx + (walking ? Math.sin(ph * Math.PI * 2) * 9 : 0);
      let fy = walking ? -Math.max(0, Math.sin(ph * Math.PI * 2)) * 6 : 0;
      if (s > 0.5 && hx < 0) {
        // haunches folded
        fx = hx + 14;
        fy = 0;
      }
      const j = ik2(hx, hy, fx, fy, 16, 16, hx > 0 ? -1 : 1);
      const col = near ? COAT : DARK;
      limb(ctx, hx, hy, j.jx, j.jy, near ? 7 : 6, 5, col);
      limb(ctx, j.jx, j.jy, j.ex, j.ey, 5, 4, col);
    };
    drawLeg(legs[1]);
    drawLeg(legs[3]);

    // body: thin, ribs showing
    ctx.beginPath();
    smoothPath(ctx, [
      [rump[0] - 8, rump[1] - 2],
      [lerp(rump[0], chest[0], 0.5), lerp(rump[1], chest[1], 0.5) - 8],
      [chest[0] + 6, chest[1] - 4],
      [chest[0] + 8, chest[1] + 8],
      [lerp(rump[0], chest[0], 0.5), lerp(rump[1], chest[1], 0.5) + 6],
      [rump[0] - 4, rump[1] + 10],
    ], true);
    ctx.fillStyle = COAT;
    ctx.fill();
    // tabby stripes and ribs
    ctx.strokeStyle = 'rgba(40,30,22,0.55)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.16;
      const bx = lerp(rump[0], chest[0], t);
      const by = lerp(rump[1], chest[1], t);
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 7);
      ctx.quadraticCurveTo(bx + 1, by, bx - 1, by + 6);
      ctx.stroke();
    }

    drawLeg(legs[0]);
    drawLeg(legs[2]);

    // head
    const hx = chest[0] + 10;
    const hy = chest[1] - 12;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COAT;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(13, 3);
    ctx.lineTo(6, 6);
    ctx.fill();
    // ears: right intact, left torn at the tip
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-5, -15);
    ctx.lineTo(1, -7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, -7);
    ctx.lineTo(4, -13);
    ctx.lineTo(6, -12);
    ctx.lineTo(7, -5);
    ctx.fill();
    // amber eye, closing on a slow blink
    const open = 1 - clamp(this.blink);
    ctx.fillStyle = '#d19a2e';
    ctx.beginPath();
    ctx.ellipse(4, -1.5, 2.4, 2 * open + 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // Eye position in world space, for a faint glint.
  eye() {
    const s = this.sit;
    const cx = lerp(24, 10, s) + 14;
    const cy = lerp(-32, -42, s) - 13.5;
    return [this.x + cx * this.f * 0.9, this.y + cy * 0.9];
  }
}
