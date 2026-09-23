// A side-on human rig. Angles are absolute, in radians: limbs hang at 0 and
// swing positive toward the way the figure faces; the torso leans positive
// forward. Drawn in a local frame with the hip at the origin.

import { clamp, lerp } from '../engine/util.js';
import { limb, shade } from './shapes.js';

const L = { thigh: 46, shin: 45, torso: 60, neck: 7, head: 11.5, upper: 31, fore: 29 };

export const OUTFITS = {
  // Eli: black frock-coat suit, white collar, black hat.
  suit: { coat: '#18181d', trousers: '#16161a', shirt: '#cfc8b8', tie: '#0b0b0d', skin: '#a8795b', hair: '#3b3632', hat: '#121215', band: '#3a2e26', boots: '#0e0d0c', tails: true },
  // Tobias: shirtsleeves, leather vest, bandana, a wide pale hat.
  vest: { coat: '#5a3a22', trousers: '#4a3b2c', shirt: '#b3a386', tie: '#8e2a1c', skin: '#b8866a', hair: '#6b4a2a', hat: '#8a6c4a', band: '#3d2a1c', boots: '#2a1c12', sleeves: true },
  // June: a calico dress and a braid.
  dress: { coat: '#6d4a55', trousers: '#6d4a55', shirt: '#d8ccb6', skin: '#c4957a', hair: '#4a3222', boots: '#2a2019', dress: true },
};

export const POSES = {
  stand: { torso: 0.02, head: 0, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.06, foreN: 0.12, armF: -0.06, foreF: -0.02 },
  kneel: { torso: 0.12, head: 0.25, thighN: 1.45, shinN: 0.05, thighF: 0.15, shinF: -1.55, armN: 0.5, foreN: 1.1, armF: 0.35, foreF: 0.9 },
  ride: { torso: 0.08, head: 0.02, thighN: 1.0, shinN: 0.12, thighF: 1.0, shinF: 0.12, armN: 0.55, foreN: 1.35, armF: 0.5, foreF: 1.3 },
  sit: { torso: -0.35, head: 0.15, thighN: 2.1, shinN: 0.7, thighF: 1.95, shinF: 0.5, armN: -0.6, foreN: -0.3, armF: -0.7, foreF: -0.4 },
  reach: { torso: 0.18, head: 0.15, thighN: 0.1, shinN: 0.05, thighF: -0.12, shinF: -0.1, armN: 1.3, foreN: 1.5, armF: 0.9, foreF: 1.2 },
  hands: { torso: 0.06, head: 0.1, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.5, foreN: 1.25, armF: 0.45, foreF: 1.2 },
  lie: { torso: -1.45, head: -0.1, thighN: 1.5, shinN: 1.4, thighF: 1.45, shinF: 1.5, armN: -1.7, foreN: -1.5, armF: -1.3, foreF: -1.2 },
};

// A walking cycle at phase p (radians).
export function walkPose(p, stride = 1) {
  const leg = (q) => {
    const th = 0.42 * stride * Math.sin(q);
    const bend = 0.75 * stride * Math.max(0, Math.sin(q - 1.2)) + 0.05;
    return [th, th - bend];
  };
  const [tn, sn] = leg(p);
  const [tf, sf] = leg(p + Math.PI);
  return {
    torso: 0.06,
    head: 0.02,
    thighN: tn,
    shinN: sn,
    thighF: tf,
    shinF: sf,
    armN: -0.32 * stride * Math.sin(p),
    foreN: -0.32 * stride * Math.sin(p) + 0.3,
    armF: 0.32 * stride * Math.sin(p),
    foreF: 0.32 * stride * Math.sin(p) + 0.3,
  };
}

const down = (a) => [Math.sin(a), Math.cos(a)];

export class Person {
  constructor(outfit = 'suit', scale = 1) {
    this.o = OUTFITS[outfit];
    this.scale = scale;
    this.x = 0;
    this.y = 0; // ground level (when grounded) or hip position (when not)
    this.f = 1;
    this.grounded = true;
    this.hat = this.o.hat ? 'on' : 'none';
    this.pose = { ...POSES.stand };
    this.joints = {};
  }

  setPose(p) {
    Object.assign(this.pose, p);
  }

  // Local joint positions (hip at origin, facing right).
  solve() {
    const p = this.pose;
    const j = {};
    const kN = down(p.thighN);
    const kF = down(p.thighF);
    j.kneeN = [kN[0] * L.thigh, kN[1] * L.thigh];
    j.kneeF = [kF[0] * L.thigh, kF[1] * L.thigh];
    const sN = down(p.shinN);
    const sF = down(p.shinF);
    j.footN = [j.kneeN[0] + sN[0] * L.shin, j.kneeN[1] + sN[1] * L.shin];
    j.footF = [j.kneeF[0] + sF[0] * L.shin, j.kneeF[1] + sF[1] * L.shin];
    const up = [Math.sin(p.torso), -Math.cos(p.torso)];
    j.neck = [up[0] * L.torso, up[1] * L.torso];
    j.shoulder = [up[0] * (L.torso - 7), up[1] * (L.torso - 7)];
    const ha = p.torso + p.head;
    j.head = [j.neck[0] + Math.sin(ha) * (L.neck + L.head), j.neck[1] - Math.cos(ha) * (L.neck + L.head)];
    const aN = down(p.armN);
    const aF = down(p.armF);
    j.elbowN = [j.shoulder[0] + aN[0] * L.upper, j.shoulder[1] + aN[1] * L.upper];
    j.elbowF = [j.shoulder[0] + aF[0] * L.upper, j.shoulder[1] + aF[1] * L.upper];
    const fN = down(p.foreN);
    const fF = down(p.foreF);
    j.handN = [j.elbowN[0] + fN[0] * L.fore, j.elbowN[1] + fN[1] * L.fore];
    j.handF = [j.elbowF[0] + fF[0] * L.fore, j.elbowF[1] + fF[1] * L.fore];
    this.local = j;
    return j;
  }

  // Hip position in the world, standing on this.y if grounded.
  hip() {
    const j = this.local || this.solve();
    if (!this.grounded) return [this.x, this.y];
    const low = Math.max(j.footN[1], j.footF[1]) + 5;
    return [this.x, this.y - low * this.scale];
  }

  toWorld(pt) {
    const [hx, hy] = this.hip();
    return [hx + pt[0] * this.f * this.scale, hy + pt[1] * this.scale];
  }

  // Positions of named joints in world space, for props and attachments.
  world(name) {
    this.solve();
    return this.toWorld(this.local[name]);
  }

  draw(ctx) {
    const j = this.solve();
    const [hx, hy] = this.hip();
    const o = this.o;
    const p = this.pose;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(this.f * this.scale, this.scale);

    const far = (c) => shade(c, 0.62);

    // far arm, far leg
    this.arm(ctx, j.shoulder, j.elbowF, j.handF, far(o.sleeves ? o.shirt : o.coat), far(o.skin));
    this.leg(ctx, j.kneeF, j.footF, p.shinF, far(o.trousers), far(o.boots));

    // coat tails / skirt behind the near leg
    if (o.dress) {
      const hem = 44;
      const sw = clamp((p.thighN - p.thighF) * 0.5, -0.4, 0.8);
      ctx.beginPath();
      ctx.moveTo(-11, -4);
      ctx.lineTo(12, -4);
      ctx.lineTo(18 + sw * 30 + Math.max(p.thighN, p.thighF) * 18, hem);
      ctx.lineTo(-18 + Math.min(p.thighN, p.thighF) * 18, hem + 2);
      ctx.closePath();
      ctx.fillStyle = o.coat;
      ctx.fill();
    }
    this.leg(ctx, j.kneeN, j.footN, p.shinN, o.trousers, o.boots, o.dress);

    // torso
    const up = [Math.sin(p.torso), -Math.cos(p.torso)];
    const side = [Math.cos(p.torso), Math.sin(p.torso)];
    const at = (d, s) => [up[0] * d + side[0] * s, up[1] * d + side[1] * s];
    ctx.beginPath();
    const pts = [at(-4, -13), at(-2, 13), at(L.torso - 16, 14), at(L.torso - 2, 10), at(L.torso, -3), at(L.torso - 6, -12), at(20, -14)];
    ctx.moveTo(...pts[0]);
    for (const q of pts.slice(1)) ctx.lineTo(...q);
    ctx.closePath();
    ctx.fillStyle = o.dress ? o.coat : o.sleeves ? o.coat : o.coat;
    ctx.fill();

    if (o.tails) {
      // frock-coat tails, swinging with the legs
      const k = Math.max(p.thighN, p.thighF) * 0.5 + Math.min(p.thighN, p.thighF) * 0.5;
      const tail = down(clamp(k * 0.7 - p.torso * 0.5, -1.4, 1.4));
      ctx.beginPath();
      ctx.moveTo(...at(2, -13));
      ctx.lineTo(...at(2, 12));
      ctx.lineTo(12 + tail[0] * 40, tail[1] * 40);
      ctx.lineTo(-14 + tail[0] * 36 - 4, tail[1] * 38);
      ctx.closePath();
      ctx.fillStyle = shade(o.coat, 0.85);
      ctx.fill();
    }

    if (!o.dress) {
      // collar, shirt front and tie
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 1, 6));
      ctx.lineTo(...at(L.torso - 20, 12));
      ctx.lineTo(...at(L.torso - 2, 11));
      ctx.closePath();
      ctx.fillStyle = o.shirt;
      ctx.fill();
      ctx.strokeStyle = o.tie;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 2, 9.5));
      ctx.lineTo(...at(L.torso - 17, 11.5));
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 1, 7));
      ctx.lineTo(...at(L.torso - 8, 12));
      ctx.lineTo(...at(L.torso - 1, 11));
      ctx.fillStyle = o.shirt;
      ctx.fill();
    }

    // head
    const ha = p.torso + p.head;
    const [hdx, hdy] = j.head;
    limb(ctx, j.neck[0], j.neck[1] + 2, hdx - Math.sin(ha) * 6, hdy + Math.cos(ha) * 6, 9, 8, o.skin);
    ctx.save();
    ctx.translate(hdx, hdy);
    ctx.rotate(ha);
    ctx.beginPath();
    ctx.ellipse(0, 0, L.head * 0.92, L.head * 1.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = o.skin;
    ctx.fill();
    // nose and jaw
    ctx.beginPath();
    ctx.moveTo(9, -3);
    ctx.lineTo(14.5, 3);
    ctx.lineTo(9.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.quadraticCurveTo(4, 15, 10, 8);
    ctx.lineTo(4, 4);
    ctx.fill();
    // hair
    ctx.beginPath();
    ctx.ellipse(-3, -5, L.head * 0.85, L.head * 0.72, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = o.hair;
    ctx.fill();
    if (o.dress) {
      // braid
      ctx.strokeStyle = o.hair;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, 2);
      ctx.quadraticCurveTo(-15, 14, -11, 26);
      ctx.stroke();
    } else {
      // beard shadow
      ctx.beginPath();
      ctx.moveTo(-4, 6);
      ctx.quadraticCurveTo(4, 14, 11, 7);
      ctx.lineTo(8, 11);
      ctx.quadraticCurveTo(2, 16, -3, 10);
      ctx.fillStyle = shade(o.hair, 0.9);
      ctx.fill();
    }
    if (this.hat === 'on') this.hatShape(ctx, 0, -9, 0.08);
    ctx.restore();

    // near arm on top
    const handProp = this.prop;
    this.arm(ctx, j.shoulder, j.elbowN, j.handN, o.sleeves ? o.shirt : o.coat, o.skin);
    if (this.hat === 'hand') {
      ctx.save();
      ctx.translate(j.handN[0] + 3, j.handN[1] + 6);
      ctx.rotate(-1.35);
      this.hatShape(ctx, 0, 0, 0);
      ctx.restore();
    }
    if (handProp) handProp(ctx, j.handN, j.handF);
    ctx.restore();
  }

  hatShape(ctx, x, y, tilt) {
    const o = this.o;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = o.hat;
    ctx.beginPath();
    ctx.ellipse(1, 0, 19, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-8, -12);
    ctx.quadraticCurveTo(1, -16, 10, -12);
    ctx.lineTo(11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.band;
    ctx.fillRect(-8.5, -4, 19.5, 3);
    ctx.restore();
  }

  leg(ctx, knee, foot, shinA, cloth, boot, bare) {
    limb(ctx, 0, 0, knee[0], knee[1], bare ? 8 : 16, bare ? 7 : 13, bare ? this.o.skin : cloth);
    limb(ctx, knee[0], knee[1], foot[0], foot[1], bare ? 7 : 13, bare ? 6 : 11, bare ? this.o.skin : cloth);
    // boot: toe points forward, perpendicular to the shin (kept a little flatter)
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.rotate(-shinA * 0.8);
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.lineTo(13, -3);
    ctx.quadraticCurveTo(17, 2, 13, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fillStyle = boot;
    ctx.fill();
    ctx.restore();
  }

  arm(ctx, s, e, h, cloth, skin) {
    limb(ctx, s[0], s[1], e[0], e[1], 11, 10, cloth);
    limb(ctx, e[0], e[1], h[0], h[1], 10, 8, cloth);
    ctx.beginPath();
    ctx.arc(h[0], h[1], 4.6, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
  }
}

// Interpolate two poses.
export function blendPose(a, b, t) {
  const out = {};
  for (const k in a) out[k] = lerp(a[k], b[k] ?? a[k], t);
  return out;
}
