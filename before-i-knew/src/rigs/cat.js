// A lean black street cat with a notched left ear. Sits, blinks slowly,
// stands, walks and drops off walls. Local frame: facing right, ground at
// y = 0, drawn at real size (1 unit is about a centimetre), so at scale 1 a
// standing cat's back is ~25 up, nose to tail base ~47, tail ~28, and seated
// it is ~24 to the crown (~29 with the ears), next to a 170 man. Proportions
// follow a domestic shorthair: rounded skull, short ears about a third of the
// head's height, a short neck, a deep chest, a gently S-curved back and
// round haunches. The walk is the lateral-sequence gait seen in Muybridge's
// cat plates (hind left, fore left, hind right, fore right), with the body
// held level. Black fur is drawn near-black with a cool sheen along the spine,
// the crown and the shoulder, so the shape still reads against dark stone.

import { ik2, noise1, lerp, clamp } from '../engine/util.js';
import { smoothPath } from './shapes.js';

const FUR = '#141416';
const FAR = '#0a0a0c';
const NEAR = '#1b1c20'; // legs and head a shade off the body, so they read against it
const RIM = 'rgba(120,128,150,0.2)';
const SHEEN = 'rgba(120,128,150,0.32)';
const EYE = '#d8a824';
const STRIDE = 33; // ground covered by one full walking cycle, so the paws do not skate

// A tapered limb segment from a (width wa) to b (width wb), round at both
// ends; filled with the current fill style.
function limb(ctx, a, b, wa, wb) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  ctx.beginPath();
  ctx.moveTo(a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2);
  ctx.lineTo(b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2);
  ctx.lineTo(b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2);
  ctx.lineTo(a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(a[0], a[1], wa / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b[0], b[1], wb / 2, 0, Math.PI * 2);
  ctx.fill();
}

const mixp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const ease = (t) => clamp(t) * clamp(t) * (3 - 2 * clamp(t));
const MOUTH = '#d98a98';
const TONGUE = '#b95d70';
const TOOTH = '#f1ece4';

export class Cat {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.f = 1;
    this.scale = 1; // 1 is real size
    this.sit = 1; // 1 sitting … 0 standing
    this.speed = 0;
    this.phase = 0;
    this.blink = 0;
    this.time = 0;
    this.headTurn = 0; // kept for the scene scripts
    this.lean = 0; // 0 … 1: leaning its head into a hand
    this.yawn = 0; // 0 … 1: a wide yawn, at its widest at 1
    this.curl = 0; // 0 … 1: from sitting down into a sleeping loaf
    this.hidden = false;
  }

  // True whenever the lids are shut, so scripts can skip the eye glint.
  get eyesClosed() {
    return this.blink >= 0.5 || this.yawn > 0.3 || this.curl > 0.6;
  }

  update(dt) {
    this.time += dt;
    // one cycle per STRIDE of ground covered, so the feet keep up with the body
    if (this.speed > 1) this.phase = (this.phase + (dt * this.speed) / STRIDE) % 1;
  }

  // Key points of the body in the cat's own frame at real size, blended
  // between standing and sitting: an outline (tail root, rump, back, withers,
  // neck, chest, belly, thigh, haunch, rear), the head, and where the legs join.
  pose() {
    const s = this.sit;
    const breathe = Math.sin(this.time * 1.9) * 0.3;
    const walking = this.speed > 1 && s < 0.5;
    const bob = walking ? Math.sin(this.phase * Math.PI * 4) * 0.35 : 0; // the body stays level
    // tail root, rump, back, withers, neck, breast, sternum, waist, stifle, buttock
    const STAND = [[-17, -22.5], [-14, -25.5], [-3, -24.2], [9, -25], [14, -23], [16, -17], [9, -11.8], [-3, -14.2], [-9, -12], [-18, -17.5]];
    // seated: the chest upright under the head, the back one smooth curve down to the haunch
    const SIT = [[-14, -2.5], [-14, -7.5], [-7.5, -13], [2, -17.5], [6.5, -17.5], [10.2, -12.5], [9.8, -4], [0, -1], [-9, -0.8], [-13.5, -1.5]];
    // leaning into a hand, standing: the back and rump rise to meet it
    const arch = [0, 1.6, 2.2, 1.2, 0, 0, 0, 0, 0, 0.6];
    // curled up: a low loaf, back rounded, chest and belly on the ground
    const LOAF = [[-17, -3], [-18, -8], [-8, -12.5], [4, -13.5], [10, -12], [15, -7], [14, -2.5], [5, -0.5], [-8, -0.5], [-16, -1]];
    const ce = ease(this.curl);
    const yw = ease(this.yawn);
    const outline = STAND.map((q, k) => [lerp(q[0], SIT[k][0], s), lerp(q[1] + bob - arch[k] * this.lean, SIT[k][1] + (k >= 2 && k <= 5 ? breathe * 0.4 : 0), s)]);
    if (ce > 0) {
      for (let k = 0; k < outline.length; k++) {
        outline[k] = mixp(outline[k], LOAF[k], ce);
        // the slow breath lifts the whole back of the loaf
        if (k >= 1 && k <= 5) outline[k][1] += breathe * 1.3 * ce;
      }
    }
    let head = mixp([21.5 + this.lean * 1.4, -27.5 + bob - this.lean * 0.8], [10.5 + this.lean * 1.6, -21.5 + breathe * 0.3 + this.lean * 1.2], s);
    head = mixp(head, [19, -6.5 + breathe * 0.4], ce); // chin down, resting on the paws
    head = [head[0] - 1.2 * yw, head[1] - 0.3 * yw]; // tipped back on the neck
    return {
      s,
      ce,
      yw,
      walking,
      outline,
      head,
      shoulder: mixp(mixp([11, -19 + bob], [8, -11], s), [11, -5], ce),
      hip: mixp(mixp([-11, -19 + bob], [-8, -7], s), [-10, -4], ce),
      breathe,
    };
  }

  // The same, in the world's units: scaled by this.scale (still the cat's own
  // frame, before the mirror and the offset).
  shape() {
    const b = this.pose();
    const k = this.scale;
    const sc = (p) => [p[0] * k, p[1] * k];
    return { ...b, outline: b.outline.map(sc), head: sc(b.head), shoulder: sc(b.shoulder), hip: sc(b.hip), breathe: b.breathe * k };
  }

  headAngle() {
    const yw = ease(this.yawn);
    const ce = ease(this.curl);
    return noise1(this.time * 0.3) * 0.05 * (1 - this.lean) * (1 - ce) - this.lean * 0.32 - yw * 0.42 + ce * 0.42;
  }

  draw(ctx) {
    if (this.hidden) return;
    const b = this.pose();
    const { s } = b;
    const O = b.outline;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.f * this.scale, this.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // sitting or curled, the tail lies in front of the body, so it is drawn later
    const wrapped = b.ce > 0.4 || s > 0.5;
    if (!wrapped) this.tail(ctx, b);
    // far legs first, darker; curling tucks them away
    const tucked = b.ce > 0.55;
    if (!tucked) {
      this.frontLeg(ctx, b, 0.75, false);
      this.hindLeg(ctx, b, 0.5, false);
    }

    // body: deep chest, tucked waist, round haunch
    ctx.beginPath();
    smoothPath(ctx, O, true);
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // sheen along the spine and over the shoulder
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(O[1][0] + 0.5, O[1][1] + 0.8);
    ctx.quadraticCurveTo(O[2][0], O[2][1] + 0.5, O[3][0] - 0.5, O[3][1] + 0.8);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(b.shoulder[0] - 1, b.shoulder[1] - 1, 4, -2.6, -1.0);
    ctx.stroke();

    // near legs
    if (!tucked) {
      this.hindLeg(ctx, b, 0.0, true);
      this.frontLeg(ctx, b, 0.25, true);
    }
    // sitting: the haunch as a round mass over the folded hind leg
    if (s > 0.05) {
      const hy = lerp(-6.8, -4.6, b.ce);
      // grows in as it sits, rather than fading (a see-through haunch shows grey)
      const g = ease(s);
      const rx = lerp(7.6, 9, b.ce) * g;
      const ry = lerp(6.8, 4.6, b.ce) * g;
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.ellipse(-8.5, hy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SHEEN;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      if (ry > 1.5) ctx.arc(-8.5, hy, ry - 1.2, -2.7, -1.1);
      ctx.stroke();
    }

    // neck into head: short, thick, the chest rising straight under the chin
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.moveTo(O[3][0] - 3, O[3][1] + 1.5);
    ctx.quadraticCurveTo(lerp(O[3][0], b.head[0], 0.6), O[3][1] + 1.8, b.head[0] - 4.4, b.head[1] - 0.5);
    ctx.lineTo(b.head[0] + 0.5, b.head[1] + 4.5);
    ctx.quadraticCurveTo(O[5][0] + 0.5, O[5][1] - 4, O[5][0], O[5][1] + 1);
    ctx.closePath();
    ctx.fill();

    if (wrapped) {
      this.tail(ctx, b);
      // front paws folded under the chest, just a hint of them
      const pw = clamp((b.ce - 0.4) * 2);
      if (pw > 0) {
        ctx.fillStyle = FAR;
        ctx.beginPath();
        ctx.ellipse(18, -1.4, 3.4 * pw, 1.5 * pw, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = FUR;
        ctx.beginPath();
        ctx.ellipse(14, -1.6, 3.6 * pw, 1.7 * pw, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.headDraw(ctx, b.head);
    ctx.restore();
  }

  headDraw(ctx, h) {
    const yw = ease(this.yawn);
    const ce = ease(this.curl);
    ctx.save();
    ctx.translate(h[0], h[1]);
    // a yawn tips the nose up; sleep drops it onto the paws
    ctx.rotate(this.headAngle());
    // ears lie back a little in a yawn, and slacken in sleep
    const back = Math.max(yw * 0.55, ce * 0.22);
    // far ear, then the lower jaw, the skull and muzzle
    ctx.save();
    ctx.translate(1, -3.8);
    ctx.rotate(-back);
    ctx.translate(-1, 3.8);
    ctx.fillStyle = FAR;
    ctx.beginPath();
    ctx.moveTo(-0.4, -4.8);
    ctx.lineTo(3.2, -8.9);
    ctx.lineTo(5, -2.6);
    ctx.fill();
    ctx.restore();
    if (yw > 0.01) {
      // the jaw swings down on a hinge under the cheek; pale pink inside
      const a = yw * 0.8;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const hx = -2.5;
      const hy = 2;
      const jaw = (x, y) => [hx + (x - hx) * ca - (y - hy) * sa, hy + (x - hx) * sa + (y - hy) * ca];
      const lip = jaw(6, 2.6);
      const chin = jaw(4.8, 5);
      const c1 = jaw(0.5, 5.4);
      const c2 = jaw(-3.5, 4.2);
      ctx.fillStyle = NEAR;
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy - 0.5);
      ctx.lineTo(lip[0], lip[1]);
      ctx.quadraticCurveTo(chin[0] + 0.8, chin[1] - 0.5, chin[0], chin[1]);
      ctx.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = MOUTH;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 0.4);
      ctx.lineTo(6, 2.3);
      ctx.lineTo(lip[0] - 0.2, lip[1] - 0.2);
      ctx.lineTo(hx + 0.5, hy + 1);
      ctx.closePath();
      ctx.fill();
      // tongue, curled up from the floor of the mouth
      const t0 = jaw(-0.5, 3.1);
      const t1 = jaw(2.5, 2.8);
      const t2 = jaw(4.6, 2.7);
      ctx.fillStyle = TONGUE;
      ctx.beginPath();
      ctx.moveTo(t0[0], t0[1]);
      ctx.quadraticCurveTo(t1[0], t1[1] - 1.2 * yw, t2[0], t2[1]);
      ctx.lineTo(t2[0] - 0.5, t2[1] + 0.5);
      ctx.lineTo(t0[0], t0[1] + 0.6);
      ctx.fill();
      // lower fang
      const f0 = jaw(4.1, 3);
      const f1 = jaw(4.6, 1.4);
      const f2 = jaw(5.1, 3);
      ctx.fillStyle = TOOTH;
      ctx.beginPath();
      ctx.moveTo(f0[0], f0[1]);
      ctx.lineTo(f1[0], f1[1]);
      ctx.lineTo(f2[0], f2[1]);
      ctx.fill();
    }
    // skull: rounded, a short blunt muzzle, a little ruff at the cheek
    ctx.fillStyle = NEAR;
    ctx.beginPath();
    ctx.moveTo(-5, 2.8);
    ctx.quadraticCurveTo(-6, -1.8, -3.2, -4.4); // back of the skull
    ctx.quadraticCurveTo(0.8, -5.6, 4, -3.8); // crown to brow
    ctx.lineTo(5.5, -1.8); // stop
    ctx.lineTo(7.3, -0.1); // nose bridge
    ctx.quadraticCurveTo(7.9, 0.7, 7.2, 1.4); // nose
    ctx.quadraticCurveTo(6.9, 1.9, 6.1, 2.1); // mouth
    // in a yawn the skull ends at the upper lip and the jaw hangs below
    ctx.quadraticCurveTo(lerp(5.6, 4.6, yw), lerp(3.6, 2.4, yw), lerp(4.2, 0.5, yw), lerp(4.3, 2.1, yw)); // chin
    ctx.quadraticCurveTo(lerp(-0.5, -2.5, yw), lerp(5.8, 3, yw), -5, 2.8); // jaw and cheek
    ctx.fill();
    if (yw > 0.01) {
      // upper fang
      ctx.fillStyle = TOOTH;
      ctx.beginPath();
      ctx.moveTo(4.1, 2.3);
      ctx.lineTo(4.5, 4.3);
      ctx.lineTo(4.95, 2.3);
      ctx.fill();
      // a few small teeth along the lip
      for (const tx of [2.7, 1.5, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(tx - 0.4, 2.8);
        ctx.lineTo(tx, 3.7);
        ctx.lineTo(tx + 0.4, 2.8);
        ctx.fill();
      }
      ctx.fillStyle = NEAR;
    }
    // near ear, short and triangular, with a notch out of its tip (the left ear)
    ctx.save();
    ctx.translate(-2, -4);
    ctx.rotate(-back);
    ctx.translate(2, 4);
    ctx.beginPath();
    ctx.moveTo(-5.4, -2.4);
    ctx.lineTo(-4.6, -8.6);
    ctx.lineTo(-3.5, -7.2);
    ctx.lineTo(-2.4, -9.1);
    ctx.lineTo(1.4, -4.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,58,62,0.5)'; // inner ear, a little warmth
    ctx.beginPath();
    ctx.moveTo(-4.1, -3.4);
    ctx.lineTo(-3.5, -6.4);
    ctx.lineTo(-0.6, -4);
    ctx.fill();
    ctx.restore();
    // sheen on the crown and the bridge of the nose
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.8, -3.6);
    ctx.quadraticCurveTo(0, -5, 3.6, -3.4);
    ctx.moveTo(5.6, -1.4);
    ctx.lineTo(7, 0);
    ctx.stroke();
    // eye: yellow-amber almond with a slit pupil; lids close on a blink
    const squeeze = clamp(this.yawn * 3.3);
    const drowse = clamp((this.curl - 0.3) / 0.3);
    const open = 1 - Math.max(clamp(this.blink), squeeze, drowse);
    if (open < 0.12 && (squeeze > 0.9 || drowse > 0.9)) {
      // shut tight: a pale curved lid line, hard-creased in a yawn, a soft
      // downward crescent in sleep
      const up = squeeze >= drowse ? -1 : 1;
      ctx.strokeStyle = 'rgba(170,178,198,0.75)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(1.4, -0.5);
      ctx.quadraticCurveTo(2.9, -0.5 + 1.4 * up, 4.4, -0.5);
      ctx.stroke();
      if (up < 0) {
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(1.5, -1.8);
        ctx.lineTo(2.6, -1.4);
        ctx.moveTo(2.3, -2.7);
        ctx.lineTo(3.2, -2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = EYE;
      ctx.beginPath();
      ctx.ellipse(2.9, -0.5, 1.55, 1.2 * open + 0.1, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (open > 0.3) {
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.ellipse(3.1, -0.5, 0.3, 0.95 * open, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // whiskers
    ctx.strokeStyle = 'rgba(200,200,205,0.45)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    for (const [dy, len, a] of [[1.2, 8, -0.12], [1.9, 8.5, 0.05], [2.5, 7, 0.22]]) {
      ctx.moveTo(6.2, dy);
      ctx.quadraticCurveTo(6.2 + len * 0.6, dy + a * 3 - 0.5, 6.2 + len, dy + a * len);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Front leg: shoulder, elbow (pointing back), wrist, paw. Straight, set
  // under the shoulder; in the walk it swings from the shoulder, the paw
  // lifting only a little. Drawn as tapered solid limbs in the body's own
  // colour, growing out of it, so the cat reads as one silhouette.
  frontLeg(ctx, b, off, near) {
    const s = b.s;
    const top = [b.shoulder[0] + (near ? 0.5 : -1.2), b.shoulder[1]];
    let paw;
    let lift = 0;
    if (b.walking) {
      const ph = (this.phase + off) % 1;
      const swing = ph < 0.4;
      const k = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      paw = [top[0] + (swing ? lerp(-7, 8, k) : lerp(8, -7, k)), 0];
      lift = swing ? Math.sin(k * Math.PI) * 3 : 0;
    } else paw = [lerp(top[0] - 0.5, near ? 10.2 : 12.8, s), 0];
    paw[1] -= lift;
    const j = ik2(top[0], top[1], paw[0], paw[1] - 1.3, lerp(8.5, 5, s), lerp(10, 5.4, s), 1);
    const col = near ? FUR : FAR;
    ctx.fillStyle = col;
    limb(ctx, top, [j.jx, j.jy], lerp(7, 4.4, s), 4.2);
    limb(ctx, [j.jx, j.jy], [j.ex, j.ey], 3.9, 2.7);
    ctx.beginPath();
    ctx.ellipse(j.ex + 0.8, j.ey + 0.6, 2.2, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (near) {
      // a thin sheen down the front of the leg, so it reads against the chest
      ctx.strokeStyle = SHEEN;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(j.jx + 1.6, j.jy - 1);
      ctx.lineTo(j.ex + 1.1, j.ey - 0.4);
      ctx.stroke();
    }
  }

  // Hind leg, digitigrade: hip, knee (forward), hock (back), paw. A heavy
  // thigh tapering to a slim shank and a long foot standing on its toes.
  hindLeg(ctx, b, off, near) {
    const s = b.s;
    const hip = [b.hip[0] + (near ? 1 : -1), b.hip[1]];
    const col = near ? FUR : FAR;
    let paw;
    let lift = 0;
    if (b.walking) {
      const ph = (this.phase + off) % 1;
      const swing = ph < 0.4;
      const k = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      paw = [hip[0] + 1 + (swing ? lerp(-8, 8, k) : lerp(8, -8, k)), 0];
      lift = swing ? Math.sin(k * Math.PI) * 3.2 : 0;
    } else paw = [lerp(hip[0] + 1, hip[0] + 10, s), 0];
    paw[1] -= lift;
    // sitting folds the leg flat: hock on the ground behind the paw
    const hock = [paw[0] - lerp(2.6, 7, s), paw[1] - lerp(7, 1.4, s)];
    const j = ik2(hip[0], hip[1], hock[0], hock[1], lerp(8.2, 6, s), lerp(8, 6, s), -1);
    ctx.fillStyle = col;
    limb(ctx, hip, [j.jx, j.jy], lerp(11, 6, s), lerp(5.2, 3.4, s));
    limb(ctx, [j.jx, j.jy], hock, 3.8, 2.4);
    limb(ctx, hock, [paw[0], paw[1] - 1.1], 2.2, 2);
    ctx.beginPath();
    ctx.ellipse(paw[0] + 1, paw[1] - 0.9, lerp(2.3, 4, s), 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail: curled round the paws when sitting; held low with an upturned tip
  // and a slow sway when walking.
  tail(ctx, b) {
    const s = b.s;
    const r = b.outline[0];
    const sway = noise1(this.time * 0.7) * 3;
    const flick = Math.max(0, noise1(this.time * 2.3 + 4)) * 2.5;
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 2.9;
    ctx.beginPath();
    ctx.moveTo(r[0] + 1, r[1]);
    if (s > 0.5) {
      // out behind the haunch and round the front of the paws; curled up,
      // it hugs the ground right round the body and tucks under the chin
      const ce = b.ce;
      const curl = this.lean * 4;
      ctx.bezierCurveTo(r[0] - 3, r[1] + 1.5, lerp(-19, -22, ce), lerp(-1.4, -2, ce), lerp(-12, -14, ce), lerp(-1.6, -1.5, ce));
      ctx.quadraticCurveTo(lerp(8 + sway * 0.3, -2, ce), lerp(-0.6, -1.2, ce), lerp(14.5 + flick * 0.4 - curl * 0.3, 11, ce), lerp(-3.4 - flick * 0.4 - curl, -1.8, ce));
    } else {
      ctx.bezierCurveTo(r[0] - 8, r[1] + 2, r[0] - 15 + sway, r[1] - 3, r[0] - 15 + sway, r[1] - 12 - flick);
    }
    ctx.stroke();
    ctx.strokeStyle = SHEEN;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // Eye position in world space, for a glint.
  eye() {
    const h = this.pose().head;
    const a = this.headAngle();
    const ex = 3;
    const ey = -0.5;
    const lx = h[0] + ex * Math.cos(a) - ey * Math.sin(a);
    const ly = h[1] + ex * Math.sin(a) + ey * Math.cos(a);
    return [this.x + lx * this.f * this.scale, this.y + ly * this.scale];
  }
}
