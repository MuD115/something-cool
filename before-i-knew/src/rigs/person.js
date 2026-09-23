// A side-on human rig. Angles are absolute, in radians: limbs hang at 0 and
// swing positive toward the way the figure faces; the torso leans positive
// forward. Drawn in a local frame with the hip at the origin.

import { clamp, lerp } from '../engine/util.js';
import { limb, shade } from './shapes.js';

const L = { thigh: 46, shin: 45, torso: 60, neck: 7, head: 11.5, upper: 31, fore: 29 };

// Outfits. Fields:
//   top, sleeve ('long' | 'short'), trousers, shoes, skin, hair, beard
//   ('none' | 'stubble' | 'full' | 'moustache'), headwear ('hijab' | 'kufi'),
//   robe (long garment to the ankles), satchel, braid, ponytail.
export const OUTFITS = {
  sami: { top: '#5f6b73', sleeve: 'long', trousers: '#2e2f33', shoes: '#1d1b19', skin: '#b58565', hair: '#221c18', beard: 'stubble' },
  khaled: { top: '#c9bca2', sleeve: 'long', trousers: '#3e3a35', shoes: '#2a211a', skin: '#b98a6a', hair: '#2b211a', beard: 'full', satchel: '#5a3f26' },
  oldman: { top: '#8d8578', robe: true, trousers: '#8d8578', shoes: '#2a241e', skin: '#9c7457', hair: '#d8d2c8', beard: 'full', beardColor: '#dcd6cc', headwear: 'kufi', headColor: '#e8e2d6' },
  abuyazan: { top: '#4b4e4a', sleeve: 'long', trousers: '#34332f', shoes: '#1e1c1a', skin: '#a7795a', hair: '#9a948c', beard: 'moustache', beardColor: '#8e877e' },
  spotter: { top: '#3f4a3a', sleeve: 'short', trousers: '#2d2f31', shoes: '#1d1b19', skin: '#b78867', hair: '#1f1a16', beard: 'stubble' },
  fadi: { top: '#7a3b2c', sleeve: 'short', trousers: '#3a3f4a', shoes: '#222', skin: '#bf9070', hair: '#2a1f18', beard: 'none' },
  woman: { top: '#2f2b33', robe: true, trousers: '#2f2b33', shoes: '#1a1818', skin: '#c29374', hair: '#1a1616', beard: 'none', headwear: 'hijab', headColor: '#6a5f70' },
  woman2: { top: '#4a3a2e', robe: true, trousers: '#4a3a2e', shoes: '#1a1818', skin: '#bb8d6e', hair: '#1a1616', beard: 'none', headwear: 'hijab', headColor: '#2e2a28' },
  man: { top: '#6b5a48', sleeve: 'long', trousers: '#33312e', shoes: '#1e1c1a', skin: '#ae7f5f', hair: '#2a231d', beard: 'full' },
  layla: { top: '#9a9b8c', sleeve: 'long', trousers: '#4a3b3a', shoes: '#2a2019', skin: '#c4957a', hair: '#1e1612', beard: 'none', ponytail: true, baggy: true },
  boy: { top: '#6e5a3c', sleeve: 'short', trousers: '#3a3a3e', shoes: '#2a2019', skin: '#c09073', hair: '#2a1f18', beard: 'none' },
  kid2: { top: '#3c5a6e', sleeve: 'short', trousers: '#4a3f33', shoes: '#2a2019', skin: '#b98a6a', hair: '#1e1612', beard: 'none' },
  kid3: { top: '#7a6a2a', sleeve: 'short', trousers: '#3a3a3e', shoes: '#2a2019', skin: '#c7997c', hair: '#3a2a1c', beard: 'none', braid: true },
};

export const POSES = {
  stand: { torso: 0.02, head: 0, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.06, foreN: 0.12, armF: -0.06, foreF: -0.02 },
  crouch: { torso: 0.5, head: -0.38, thighN: 1.3, shinN: -0.45, thighF: 1.1, shinF: -0.6, armN: 0.7, foreN: 1.2, armF: 0.5, foreF: 1.0 },
  prone: { torso: 1.52, head: -0.95, thighN: -1.48, shinN: -1.56, thighF: -1.5, shinF: -1.58, armN: 1.05, foreN: 1.95, armF: 0.95, foreF: 1.85 },
  kneel: { torso: 0.12, head: 0.25, thighN: 1.45, shinN: 0.05, thighF: 0.15, shinF: -1.55, armN: 0.5, foreN: 1.1, armF: 0.35, foreF: 0.9 },
  kerb: { torso: 0.32, head: 0.55, thighN: 1.5, shinN: 0.12, thighF: 1.42, shinF: 0.05, armN: 0.95, foreN: 1.75, armF: 0.85, foreF: 1.65 },
  sitGround: { torso: -0.05, head: 0.05, thighN: 1.55, shinN: 2.7, thighF: 1.45, shinF: 2.6, armN: 0.5, foreN: 1.4, armF: 0.4, foreF: 1.3 },
  jump: { torso: 0.15, head: -0.1, thighN: 1.0, shinN: 0.1, thighF: 0.4, shinF: -0.4, armN: 1.6, foreN: 2.0, armF: 1.2, foreF: 1.6 },
  reachUp: { torso: 0.08, head: -0.35, thighN: 0.1, shinN: 0.05, thighF: -0.1, shinF: -0.1, armN: 2.8, foreN: 3.0, armF: 2.6, foreF: 2.9 },
  hands: { torso: 0.06, head: 0.1, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.5, foreN: 1.25, armF: 0.45, foreF: 1.2 },
  carry: { torso: -0.06, head: 0.05, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.02, foreN: 0.02, armF: -0.5, foreF: -0.3 },
  wave: { torso: 0.02, head: 0, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 2.3, foreN: 2.9, armF: -0.06, foreF: -0.02 },
  binoculars: { torso: 0.05, head: -0.2, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 1.3, foreN: 2.4, armF: 1.2, foreF: 2.35 },
  shield: { torso: 0.75, head: -0.2, thighN: 1.1, shinN: -0.3, thighF: 0.8, shinF: -0.5, armN: 1.4, foreN: 1.1, armF: 1.3, foreF: 1.0 },
  grief: { torso: 0.1, head: 0.45, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.35, foreN: 0.5, armF: 0.1, foreF: 0.2 },
  wallHand: { torso: 0.08, head: 0.3, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 1.35, foreN: 1.4, armF: 0.1, foreF: 0.2 },
  mirror: { torso: 0.1, head: -0.05, thighN: 0.25, shinN: -0.2, thighF: -0.1, shinF: -0.1, armN: 1.55, foreN: 1.6, armF: 0.2, foreF: 0.4 },
  lookUp: { torso: -0.05, head: -0.55, thighN: 0.06, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.06, foreN: 0.12, armF: -0.06, foreF: -0.02 },
  hug: { torso: 0.25, head: 0.2, thighN: 0.9, shinN: -0.6, thighF: 0.6, shinF: -0.9, armN: 1.3, foreN: 1.9, armF: 1.2, foreF: 1.85 },
  sort: { torso: 0.9, head: -0.1, thighN: 1.4, shinN: -0.5, thighF: 1.2, shinF: -0.6, armN: 1.3, foreN: 1.3, armF: 0.9, foreF: 1.0 },
};

// A walking cycle at phase p (radians).
export function walkPose(p, stride = 1, run = 0) {
  const leg = (q) => {
    const th = (0.42 + run * 0.25) * stride * Math.sin(q);
    const bend = (0.75 + run * 0.6) * stride * Math.max(0, Math.sin(q - 1.2)) + 0.05;
    return [th, th - bend];
  };
  const [tn, sn] = leg(p);
  const [tf, sf] = leg(p + Math.PI);
  const sw = (0.32 + run * 0.4) * stride;
  return {
    torso: 0.06 + run * 0.2,
    head: 0.02 - run * 0.15,
    thighN: tn,
    shinN: sn,
    thighF: tf,
    shinF: sf,
    armN: -sw * Math.sin(p),
    foreN: -sw * Math.sin(p) + 0.3 + run * 1.2,
    armF: sw * Math.sin(p),
    foreF: sw * Math.sin(p) + 0.3 + run * 1.2,
  };
}

export function crouchWalkPose(p) {
  const c = POSES.crouch;
  const s = Math.sin(p);
  return { ...c, thighN: c.thighN + 0.35 * s, shinN: c.shinN - 0.2 * Math.max(0, -s), thighF: c.thighF - 0.35 * s, shinF: c.shinF - 0.2 * Math.max(0, s), armN: c.armN - 0.25 * s, armF: c.armF + 0.25 * s };
}

export function crawlPose(p) {
  const c = POSES.prone;
  const s = Math.sin(p);
  return { ...c, thighN: c.thighN + 0.3 * s, shinN: c.shinN + 0.45 * Math.max(0, s), thighF: c.thighF - 0.3 * s, shinF: c.shinF + 0.45 * Math.max(0, -s), armN: c.armN + 0.3 * s, foreN: c.foreN + 0.2 * s, armF: c.armF - 0.3 * s, foreF: c.foreF - 0.2 * s };
}

const down = (a) => [Math.sin(a), Math.cos(a)];

export class Person {
  constructor(outfit = 'sami', scale = 1) {
    this.o = OUTFITS[outfit];
    this.scale = scale;
    this.x = 0;
    this.y = 0; // ground level (when grounded) or hip position (when not)
    this.f = 1;
    this.grounded = true;
    this.pose = { ...POSES.stand };
    this.prop = null;
    this.dust = 0; // 0…1 grey dust after shelling
  }

  setPose(p) {
    this.pose = { ...POSES.stand, ...p };
  }

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

  // Height of the hip above the ground for the current pose.
  hipHeight() {
    const j = this.local || this.solve();
    // Lowest of feet, knees and the torso itself, so poses blend smoothly
    // from standing to kneeling to lying flat.
    return Math.max(j.footN[1], j.footF[1], j.kneeN[1] + 8, j.kneeF[1] + 8, 12) + 5;
  }

  hip() {
    const j = this.local || this.solve();
    if (!this.grounded) return [this.x, this.y];
    return [this.x, this.y - this.hipHeight() * this.scale];
  }

  toWorld(pt) {
    const [hx, hy] = this.hip();
    return [hx + pt[0] * this.f * this.scale, hy + pt[1] * this.scale];
  }

  world(name) {
    this.solve();
    return this.toWorld(this.local[name]);
  }

  // Top of the head in world space (for collision with low ceilings).
  top() {
    const j = this.solve();
    const [, hy] = this.hip();
    return hy + (j.head[1] - L.head) * this.scale;
  }

  draw(ctx) {
    const j = this.solve();
    const [hx, hy] = this.hip();
    const o = this.o;
    const p = this.pose;
    const dusty = (c) => (this.dust > 0 ? mixHex(c, '#8a857c', this.dust * 0.55) : c);
    const top = dusty(o.top);
    const trousers = dusty(o.trousers);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(this.f * this.scale, this.scale);

    const far = (c) => shade(c, 0.62);
    const armCloth = o.sleeve === 'short' ? o.skin : top;

    if (o.satchel) {
      // bag hangs behind the hip on the far side
      ctx.fillStyle = shade(o.satchel, 0.8);
      ctx.fillRect(-20, -6, 18, 22);
    }
    this.arm(ctx, j.shoulder, j.elbowF, j.handF, far(top), far(armCloth), far(o.skin), o.sleeve === 'short');
    this.leg(ctx, j.kneeF, j.footF, p.shinF, far(trousers), far(o.shoes));

    if (o.robe) {
      // a jalabiya or long coat: a skirt from the hip that follows the legs
      const kn = j.kneeN;
      const kf = j.kneeF;
      const fn = j.footN;
      const ff = j.footF;
      ctx.beginPath();
      ctx.moveTo(-13, -4);
      ctx.lineTo(13, -4);
      ctx.lineTo(Math.max(kn[0], kf[0]) + 10, Math.max(kn[1], kf[1]));
      ctx.lineTo(Math.max(fn[0], ff[0]) + 6, Math.max(fn[1], ff[1]) - 6);
      ctx.lineTo(Math.min(fn[0], ff[0]) - 8, Math.max(fn[1], ff[1]) - 4);
      ctx.lineTo(Math.min(kn[0], kf[0]) - 12, Math.max(kn[1], kf[1]));
      ctx.closePath();
      ctx.fillStyle = top;
      ctx.fill();
    }
    this.leg(ctx, j.kneeN, j.footN, p.shinN, o.robe ? top : trousers, o.shoes);

    // torso
    const up = [Math.sin(p.torso), -Math.cos(p.torso)];
    const side = [Math.cos(p.torso), Math.sin(p.torso)];
    const at = (d, s) => [up[0] * d + side[0] * s, up[1] * d + side[1] * s];
    const w = o.baggy ? 16 : 13;
    ctx.beginPath();
    const pts = [at(o.baggy ? -12 : -4, -w), at(o.baggy ? -12 : -2, w), at(L.torso - 16, w + 1), at(L.torso - 2, 10), at(L.torso, -3), at(L.torso - 6, -12), at(20, -w - 1)];
    ctx.moveTo(...pts[0]);
    for (const q of pts.slice(1)) ctx.lineTo(...q);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.fill();
    // collar shadow and a button line give the shirt some form
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(...at(L.torso - 3, 9));
    ctx.lineTo(...at(4, 10));
    ctx.stroke();

    if (o.satchel) {
      ctx.strokeStyle = shade(o.satchel, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 4, -10));
      ctx.lineTo(...at(6, 12));
      ctx.stroke();
    }

    // head
    const ha = p.torso + p.head;
    const [hdx, hdy] = j.head;
    limb(ctx, j.neck[0], j.neck[1] + 2, hdx - Math.sin(ha) * 6, hdy + Math.cos(ha) * 6, 9, 8, o.skin);
    ctx.save();
    ctx.translate(hdx, hdy);
    ctx.rotate(ha);
    const hr = L.head;
    if (o.headwear === 'hijab') {
      ctx.beginPath();
      ctx.ellipse(-2, -1, hr * 1.1, hr * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = dusty(o.headColor);
      ctx.fill();
      // drape to the shoulders
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-16, 18, -6, 26);
      ctx.lineTo(8, 22);
      ctx.lineTo(4, 8);
      ctx.fill();
      // face opening
      ctx.beginPath();
      ctx.ellipse(4, 1, hr * 0.62, hr * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = o.skin;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.lineTo(13.5, 3);
      ctx.lineTo(9, 4.5);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, hr * 0.92, hr * 1.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = o.skin;
      ctx.fill();
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
      ctx.ellipse(-3, -5, hr * 0.88, hr * 0.74, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = dusty(o.hair);
      ctx.fill();
      if (o.ponytail || o.braid) {
        ctx.strokeStyle = o.hair;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, -2);
        ctx.quadraticCurveTo(-18, 6, -14, o.braid ? 22 : 12);
        ctx.stroke();
      }
      const bc = o.beardColor || shade(o.hair, 0.95);
      if (o.beard === 'full' || o.beard === 'stubble') {
        ctx.beginPath();
        ctx.moveTo(-5, 4);
        ctx.quadraticCurveTo(4, o.beard === 'full' ? 17 : 13, 11, 6);
        ctx.lineTo(9, 10);
        ctx.quadraticCurveTo(2, 16, -4, 9);
        ctx.fillStyle = o.beard === 'full' ? bc : 'rgba(40,30,25,0.45)';
        ctx.fill();
      }
      if (o.beard === 'moustache' || o.beard === 'full') {
        ctx.fillStyle = bc;
        ctx.fillRect(7, 5, 6, 2.2);
      }
      if (o.headwear === 'kufi') {
        ctx.beginPath();
        ctx.ellipse(-2, -7, hr * 0.9, hr * 0.55, -0.15, Math.PI, 0);
        ctx.fillStyle = o.headColor;
        ctx.fill();
      }
    }
    ctx.restore();

    this.arm(ctx, j.shoulder, j.elbowN, j.handN, top, armCloth, o.skin, o.sleeve === 'short');
    if (this.prop) this.prop(ctx, j.handN, j.handF);
    ctx.restore();
  }

  leg(ctx, knee, foot, shinA, cloth, shoe) {
    limb(ctx, 0, 0, knee[0], knee[1], 16, 13, cloth);
    limb(ctx, knee[0], knee[1], foot[0], foot[1], 13, 11, cloth);
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.rotate(-shinA * 0.8);
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.lineTo(13, -3);
    ctx.quadraticCurveTo(17, 2, 13, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fillStyle = shoe;
    ctx.fill();
    ctx.restore();
  }

  arm(ctx, s, e, h, cloth, foreCloth, skin, shortSleeve) {
    limb(ctx, s[0], s[1], e[0], e[1], 11, 10, cloth);
    limb(ctx, e[0], e[1], h[0], h[1], shortSleeve ? 8 : 10, shortSleeve ? 7 : 8, foreCloth);
    ctx.beginPath();
    ctx.arc(h[0], h[1], 4.6, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
  }
}

export function blendPose(a, b, t) {
  const out = {};
  for (const k in a) out[k] = lerp(a[k], b[k] ?? a[k], t);
  return out;
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (n, s) => (n >> s) & 255;
  const m = (s) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(t)));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}
