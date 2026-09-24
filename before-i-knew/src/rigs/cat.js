// A lean black street cat with a notched left ear. Sits, blinks slowly,
// stands, walks and drops off walls. Local frame: facing right, ground at
// y = 0. Black fur is drawn near-black with a cool sheen along the spine, the
// crown and the shoulder, so the shape still reads against dark stone.

import { ik2, noise1, lerp, clamp } from '../engine/util.js';
import { smoothPath } from './shapes.js';

const FUR = '#141416';
const FAR = '#0a0a0c';
const SHEEN = 'rgba(120,128,150,0.32)';
const EYE = '#c2c83c';

const mixp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

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
    this.headTurn = 0; // kept for the scene scripts
    this.hidden = false;
  }

  update(dt) {
    this.time += dt;
    if (this.speed > 1) this.phase = (this.phase + dt * this.speed * 0.014) % 1;
  }

  // Key points of the body, blended between standing and sitting: an
  // outline (tail root, rump, back, withers, neck, chest, belly, thigh,
  // haunch), the head, and where the legs join.
  shape() {
    const s = this.sit;
    const breathe = Math.sin(this.time * 1.9) * 0.6;
    const walking = this.speed > 1 && s < 0.5;
    const bob = walking ? Math.sin(this.phase * Math.PI * 4) * 1.2 : 0;
    const STAND = [[-34, -34], [-28, -41], [-6, -38], [14, -42], [22, -45], [30, -29], [21, -16], [-2, -20], [-17, -19], [-33, -23]];
    const SIT = [[-26, -6], [-27, -22], [-15, -38], [2, -50], [9, -55], [19, -37], [17, -14], [7, -5], [-6, -2], [-24, 0]];
    const outline = STAND.map((q, k) => [lerp(q[0], SIT[k][0], s), lerp(q[1] + bob, SIT[k][1] + (k >= 2 && k <= 5 ? breathe * 0.4 : 0), s)]);
    return {
      s,
      walking,
      outline,
      head: mixp([35, -52 + bob], [17, -69 + breathe * 0.3], s),
      shoulder: mixp([20, -30 + bob], [12, -28], s),
      hip: mixp([-24, -30 + bob], [-14, -12], s),
      breathe,
    };
  }

  draw(ctx) {
    if (this.hidden) return;
    const b = this.shape();
    const { s } = b;
    const O = b.outline;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.f * 0.9, 0.9);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.tail(ctx, b);
    // far legs first, darker
    this.frontLeg(ctx, b, 0.5, false);
    this.hindLeg(ctx, b, 0.0, false);

    // body: deep chest, tucked waist, round haunch
    ctx.beginPath();
    smoothPath(ctx, O, true);
    ctx.fillStyle = FUR;
    ctx.fill();
    // sheen along the spine and over the shoulder
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(O[1][0] + 1, O[1][1] + 1.5);
    ctx.quadraticCurveTo(O[2][0], O[2][1] + 1, O[3][0] - 1, O[3][1] + 1.5);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.shoulder[0] - 2, b.shoulder[1] - 2, 7, -2.6, -1.0);
    ctx.stroke();

    // near legs
    this.hindLeg(ctx, b, 0.5, true);
    this.frontLeg(ctx, b, 0.0, true);
    // sitting: the haunch as a round mass over the folded hind leg
    if (s > 0.05) {
      ctx.globalAlpha = s;
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.ellipse(-14, -12, 13, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SHEEN;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-14, -12, 11, -2.7, -1.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // neck into head
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.moveTo(O[3][0] - 2, O[3][1] + 2);
    ctx.quadraticCurveTo(b.head[0] - 8, b.head[1] - 2, b.head[0] - 4, b.head[1] + 2);
    ctx.lineTo(b.head[0] + 4, b.head[1] + 10);
    ctx.quadraticCurveTo(O[5][0] + 2, O[5][1] - 8, O[5][0], O[5][1] + 2);
    ctx.closePath();
    ctx.fill();
    this.headDraw(ctx, b.head);
    ctx.restore();
  }

  headDraw(ctx, h) {
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(noise1(this.time * 0.3) * 0.05);
    ctx.scale(1.2, 1.2);
    // far ear, then the skull, muzzle and chin
    ctx.fillStyle = FAR;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(-7, -18);
    ctx.lineTo(0, -8);
    ctx.fill();
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.quadraticCurveTo(-10, -9, -1, -9);
    ctx.quadraticCurveTo(6, -9, 9, -3); // brow
    ctx.lineTo(13, 1); // nose bridge
    ctx.quadraticCurveTo(14, 3, 12.5, 4.5); // nose
    ctx.quadraticCurveTo(10, 5.5, 9, 7); // mouth
    ctx.quadraticCurveTo(6, 9, 1, 8); // chin
    ctx.quadraticCurveTo(-6, 8, -9, 2); // jaw
    ctx.fill();
    // near ear, tall, with a notch out of its tip (the left ear)
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.lineTo(0, -19);
    ctx.lineTo(1.5, -16);
    ctx.lineTo(3, -18);
    ctx.lineTo(6, -7);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,58,62,0.5)'; // inner ear, a little warmth
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(1.5, -14);
    ctx.lineTo(4, -8);
    ctx.fill();
    // sheen on the crown and the bridge of the nose
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.quadraticCurveTo(-1, -9.5, 7, -6);
    ctx.moveTo(9.5, -2);
    ctx.lineTo(12.5, 1);
    ctx.stroke();
    // eye: yellow-green almond with a slit pupil; lids close on a blink
    const open = 1 - clamp(this.blink);
    ctx.fillStyle = EYE;
    ctx.beginPath();
    ctx.ellipse(5.5, -2.5, 2.8, 2.1 * open + 0.15, -0.15, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.3) {
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.ellipse(6, -2.5, 0.55, 1.7 * open, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // whiskers
    ctx.strokeStyle = 'rgba(200,200,205,0.45)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (const [dy, len, a] of [[3.5, 14, -0.12], [5, 15, 0.05], [6.2, 12, 0.22]]) {
      ctx.moveTo(10, dy);
      ctx.quadraticCurveTo(10 + len * 0.6, dy + a * 6 - 1, 10 + len, dy + a * len);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Front leg: shoulder, elbow (pointing back), wrist, paw.
  frontLeg(ctx, b, off, near) {
    const s = b.s;
    const top = [b.shoulder[0] + (near ? 1 : -3), b.shoulder[1]];
    let paw;
    let lift = 0;
    if (b.walking) {
      const ph = (this.phase + off) % 1;
      const swing = ph < 0.4;
      const k = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      paw = [top[0] + (swing ? lerp(-9, 11, k) : lerp(11, -9, k)), 0];
      lift = swing ? Math.sin(k * Math.PI) * 7 : 0;
    } else paw = [lerp(top[0] + 2, near ? 14 : 18, s), 0];
    paw[1] -= lift;
    const j = ik2(top[0], top[1], paw[0], paw[1] - 3, 15, 16, -1);
    const col = near ? FUR : FAR;
    ctx.strokeStyle = col;
    ctx.lineWidth = near ? 8 : 7;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(j.jx, j.jy);
    ctx.stroke();
    ctx.lineWidth = near ? 5 : 4.5;
    ctx.beginPath();
    ctx.moveTo(j.jx, j.jy);
    ctx.lineTo(j.ex, j.ey);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(j.ex + 2, j.ey + 1.5, 3.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (near) {
      ctx.strokeStyle = SHEEN;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(top[0] + 2, top[1]);
      ctx.lineTo(j.jx + 2, j.jy);
      ctx.stroke();
    }
  }

  // Hind leg, digitigrade: hip, knee (forward), hock (back), paw.
  hindLeg(ctx, b, off, near) {
    const s = b.s;
    const hip = [b.hip[0] + (near ? 2 : -2), b.hip[1]];
    const col = near ? FUR : FAR;
    let paw;
    let lift = 0;
    if (b.walking) {
      const ph = (this.phase + off + 0.25) % 1;
      const swing = ph < 0.4;
      const k = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      paw = [hip[0] + (swing ? lerp(-10, 12, k) : lerp(12, -10, k)), 0];
      lift = swing ? Math.sin(k * Math.PI) * 7 : 0;
    } else paw = [lerp(hip[0] + 2, hip[0] + 16, s), 0];
    paw[1] -= lift;
    // sitting folds the leg flat: hock on the ground behind the paw
    const hock = [paw[0] - lerp(7, 16, s), paw[1] - lerp(12, 3, s)];
    const j = ik2(hip[0], hip[1], hock[0], hock[1], 17, 16, 1);
    ctx.strokeStyle = col;
    ctx.lineWidth = near ? 12 : 10;
    ctx.beginPath();
    ctx.moveTo(hip[0], hip[1]);
    ctx.lineTo(j.jx, j.jy);
    ctx.stroke();
    ctx.lineWidth = near ? 5.4 : 4.8;
    ctx.beginPath();
    ctx.moveTo(j.jx, j.jy);
    ctx.lineTo(hock[0], hock[1]);
    ctx.lineTo(paw[0], paw[1] - 2);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(paw[0] + 1.5, paw[1] - 1, 4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail: curled round the paws when sitting; up and swaying in a slow S
  // when walking.
  tail(ctx, b) {
    const s = b.s;
    const r = b.outline[0];
    const sway = noise1(this.time * 0.7) * 6;
    const flick = Math.max(0, noise1(this.time * 2.3 + 4)) * 5;
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(r[0] + 2, r[1]);
    if (s > 0.5) {
      // out behind the haunch and round the front of the paws
      ctx.bezierCurveTo(r[0] - 14, r[1] + 4, -20, 1, 2, -1.5);
      ctx.quadraticCurveTo(20 + sway * 0.5, -2, 27 + flick, -7 - flick * 0.4);
    } else {
      ctx.bezierCurveTo(r[0] - 16, r[1] + 2, r[0] - 26 + sway, r[1] - 22, r[0] - 16 + sway, r[1] - 40 - flick);
    }
    ctx.stroke();
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Eye position in world space, for a glint.
  eye() {
    const h = this.shape().head;
    return [this.x + (h[0] + 6.6) * this.f * 0.9, this.y + (h[1] - 3) * 0.9];
  }
}
