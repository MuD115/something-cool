// A human rig, seen side-on (and, when it turns, from the front or back).
// Angles are absolute, in radians: limbs hang at 0 and swing positive toward
// the way the figure faces; the torso leans positive forward. Drawn in a
// local frame with the hip at the origin.

import { clamp, lerp } from '../engine/util.js';
import { limb, shade } from './shapes.js';

// Segment lengths. Adults stand about 170 units tall.
const L = { thigh: 41, shin: 40, torso: 54, neck: 6, head: 10.4, upper: 28, fore: 26 };

// Outfits. Fields:
//   top, sleeve ('long' | 'short'), rolled (sleeves rolled to the elbow),
//   pattern ('check' | 'stripe', with patternColor), trousers, skin
//   hair colour, hairStyle ('short' | 'curly' | 'sidepart' | 'receding' |
//     'buzz' | 'bald' | 'ponytail' | 'braid')
//   beard ('none' | 'stubble' | 'short' | 'full' | 'long' | 'goatee' |
//     'chinstrap' | 'moustache' | 'thickMoustache'), beardColor
//   headwear ('hijab' | 'kufi' | 'cap' | 'beanie' | 'keffiyeh'), headColor
//   layer: { kind: 'vest' | 'sweater' | 'jacket' | 'coat', color }
//   robe (a jalabiya to the ankles), keffiyeh ('shoulders'), scarf colour
//   belt colour (pouch: true), satchel colour, glasses, watch
//   shoes colour, footwear ('shoe' | 'boot' | 'sandal'), baggy
export const OUTFITS = {
  sami: { top: '#5f6b73', sleeve: 'long', rolled: true, trousers: '#2e2f33', shoes: '#2a221b', footwear: 'boot', skin: '#b58565', hair: '#221c18', hairStyle: 'short', beard: 'stubble', belt: '#3a2c20', pouch: true, watch: true },
  khaled: { top: '#d8cfbd', sleeve: 'long', trousers: '#3e3a35', shoes: '#2a211a', skin: '#b98a6a', hair: '#2b211a', hairStyle: 'sidepart', beard: 'short', layer: { kind: 'vest', color: '#6b5a44' }, glasses: true, satchel: '#5a3f26' },
  oldman: { top: '#8d8578', robe: true, trousers: '#8d8578', shoes: '#6a5a48', footwear: 'sandal', skin: '#9c7457', hair: '#d8d2c8', hairStyle: 'bald', beard: 'long', beardColor: '#dcd6cc', headwear: 'kufi', headColor: '#e8e2d6', keffiyeh: 'shoulders' },
  abuyazan: { top: '#7d7a70', sleeve: 'long', trousers: '#34332f', shoes: '#1e1c1a', skin: '#a7795a', hair: '#8f8a82', hairStyle: 'receding', beard: 'thickMoustache', beardColor: '#8e877e', layer: { kind: 'jacket', color: '#3f403c' }, headwear: 'cap', headColor: '#4a4640' },
  spotter: { top: '#4b5245', sleeve: 'long', rolled: true, trousers: '#2d2f31', shoes: '#1d1b19', footwear: 'boot', skin: '#b78867', hair: '#1f1a16', hairStyle: 'buzz', beard: 'goatee', layer: { kind: 'vest', color: '#5b5a3e' }, headwear: 'beanie', headColor: '#2c2c2e' },
  fadi: { top: '#7a3b2c', sleeve: 'short', pattern: 'stripe', patternColor: '#c9b89a', trousers: '#3a3f4a', shoes: '#222', footwear: 'sandal', skin: '#bf9070', hair: '#2a1f18', hairStyle: 'curly', beard: 'none' },
  woman: { top: '#2f2b33', robe: true, trousers: '#2f2b33', shoes: '#1a1818', skin: '#c29374', hair: '#1a1616', beard: 'none', headwear: 'hijab', headColor: '#6a5f70', layer: { kind: 'coat', color: '#3a3540' } },
  woman2: { top: '#4a3a2e', robe: true, trousers: '#4a3a2e', shoes: '#1a1818', skin: '#bb8d6e', hair: '#1a1616', beard: 'none', headwear: 'hijab', headColor: '#2e2a28', layer: { kind: 'coat', color: '#5a4636' } },
  man: { top: '#6b5a48', sleeve: 'long', pattern: 'check', patternColor: '#8a735a', trousers: '#33312e', shoes: '#1e1c1a', skin: '#ae7f5f', hair: '#2a231d', hairStyle: 'short', beard: 'chinstrap' },
  man2: { top: '#9a9486', sleeve: 'long', trousers: '#3b3a36', shoes: '#1e1c1a', skin: '#a57656', hair: '#2a231d', hairStyle: 'receding', beard: 'full', layer: { kind: 'sweater', color: '#57504a' } },
  man3: { top: '#b7ad98', robe: true, trousers: '#b7ad98', shoes: '#5a4a3a', footwear: 'sandal', skin: '#a07252', hair: '#1f1a16', hairStyle: 'short', beard: 'full', headwear: 'keffiyeh', headColor: '#e4ddd0' },
  layla: { top: '#9a9b8c', sleeve: 'long', trousers: '#4a3b3a', shoes: '#2a2019', skin: '#c4957a', hair: '#1e1612', hairStyle: 'ponytail', beard: 'none', baggy: true, scarf: '#8a4a3a' },
  boy: { top: '#6e5a3c', sleeve: 'short', trousers: '#3a3a3e', shoes: '#2a2019', footwear: 'sandal', skin: '#c09073', hair: '#2a1f18', hairStyle: 'curly', beard: 'none' },
  kid2: { top: '#3c5a6e', sleeve: 'short', pattern: 'stripe', patternColor: '#b8c0c4', trousers: '#4a3f33', shoes: '#2a2019', skin: '#b98a6a', hair: '#1e1612', hairStyle: 'short', beard: 'none' },
  kid3: { top: '#7a6a2a', sleeve: 'short', trousers: '#3a3a3e', shoes: '#2a2019', skin: '#c7997c', hair: '#3a2a1c', hairStyle: 'braid', beard: 'none' },
};

// Poses. `seat` (optional) holds the hip at that height above the ground,
// for sitting on something.
export const POSES = {
  stand: { torso: 0.02, head: 0, thighN: 0.05, shinN: 0.02, thighF: -0.06, shinF: -0.06, armN: 0.05, foreN: 0.16, armF: -0.05, foreF: 0.06 },
  // a low crouch: knees forward, feet flat, back fairly straight, eyes ahead
  // ducking low: bent at the waist and knees, hips over the feet, eyes ahead
  crouch: { torso: 0.88, head: -0.62, thighN: 0.92, shinN: -0.32, thighF: 0.58, shinF: -0.56, armN: 0.55, foreN: 0.95, armF: 0.4, foreF: 0.8 },
  prone: { torso: 1.52, head: -0.95, thighN: -1.48, shinN: -1.56, thighF: -1.5, shinF: -1.58, armN: 1.05, foreN: 1.95, armF: 0.95, foreF: 1.85 },
  kneel: { torso: 0.12, head: 0.25, thighN: 1.45, shinN: 0.05, thighF: 0.15, shinF: -1.55, armN: 0.5, foreN: 1.1, armF: 0.35, foreF: 0.9 },
  kerb: { torso: 0.32, head: 0.55, thighN: 1.5, shinN: 0.12, thighF: 1.42, shinF: 0.05, armN: 0.95, foreN: 1.75, armF: 0.85, foreF: 1.65 },
  sitGround: { torso: -0.05, head: 0.05, thighN: 1.55, shinN: 2.7, thighF: 1.45, shinF: 2.6, armN: 0.5, foreN: 1.4, armF: 0.4, foreF: 1.3 },
  // on a chair, crate or stool: thighs level, shins down
  sitChair: { seat: 40, torso: -0.04, head: 0.05, thighN: 1.5, shinN: 0.12, thighF: 1.45, shinF: 0.02, armN: 0.35, foreN: 1.25, armF: 0.3, foreF: 1.15 },
  // on a ledge, legs dangling
  sitLedge: { seat: 0, torso: 0.06, head: 0.15, thighN: 1.45, shinN: 0.25, thighF: 1.4, shinF: -0.05, armN: 0.2, foreN: 0.35, armF: 0.15, foreF: 0.3 },
  squat: { torso: 0.45, head: -0.1, thighN: 2.2, shinN: -0.55, thighF: 2.05, shinF: -0.7, armN: 1.05, foreN: 1.6, armF: 0.9, foreF: 1.45 },
  leanWall: { torso: -0.1, head: 0.08, thighN: 0.28, shinN: -0.05, thighF: -0.04, shinF: -0.04, armN: -0.35, foreN: 0.2, armF: -0.4, foreF: 0.1 },
  // forearms across the chest: in profile they're foreshortened (foreNs)
  armsCrossed: { torso: 0.0, head: 0.08, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.12, foreN: 2.1, foreNs: 0.45, armF: 0.1, foreF: 2.0, foreFs: 0.45 },
  handsOnHips: { torso: 0.0, head: 0.05, thighN: 0.08, shinN: 0.02, thighF: -0.1, shinF: -0.08, armN: -0.55, foreN: 0.55, armF: -0.5, foreF: 0.6 },
  radioToEar: { torso: 0.03, head: 0.1, thighN: 0.05, shinN: 0.02, thighF: -0.07, shinF: -0.07, armN: 0.75, foreN: 2.95, armF: 0.05, foreF: 0.15 },
  // leaning out over a windowsill, forearms on the sill
  peekWindow: { seat: 40, torso: 0.7, head: -0.35, thighN: 1.5, shinN: 0.1, thighF: 1.45, shinF: 0.0, armN: 1.2, foreN: 1.62, armF: 1.1, foreF: 1.55 },
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

// A walking (or running) cycle at phase p (radians, one stride per π).
// Contact, loading, passing and push-off: the stance leg stays long, the
// swing knee folds as it comes through, arms counter-swing with soft elbows.
export function walkPose(p, stride = 1, run = 0) {
  const A = (0.44 + run * 0.3) * stride; // hip swing
  const leg = (q) => {
    const th = A * Math.sin(q);
    // knee: folds most as the leg swings through, a little on loading
    const swing = Math.max(0, Math.cos(q + 0.25));
    const load = Math.max(0, Math.sin(q - 1.35)) * 0.14;
    const bend = 0.05 + (0.95 + run * 0.85) * stride * swing * swing + load * stride;
    return [th, th - bend];
  };
  const [tn, sn] = leg(p);
  const [tf, sf] = leg(p + Math.PI);
  const sw = (0.36 + run * 0.4) * stride;
  const armN = -sw * Math.sin(p);
  const armF = sw * Math.sin(p);
  const elbow = 0.2 + run * 1.25;
  return {
    torso: 0.06 + run * 0.2 + 0.015 * Math.cos(2 * p),
    head: -0.03 - run * 0.12 - 0.012 * Math.cos(2 * p),
    thighN: tn,
    shinN: sn,
    thighF: tf,
    shinF: sf,
    armN,
    foreN: armN + elbow + 0.3 * Math.max(0, armN) * (1 + run),
    armF,
    foreF: armF + elbow + 0.3 * Math.max(0, armF) * (1 + run),
  };
}

// Crouched, moving: short shuffling steps, body steady, hands loose.
export function crouchWalkPose(p) {
  const c = POSES.crouch;
  const s = Math.sin(p);
  const lift = (x) => Math.max(0, x) * 0.28;
  const mid = (c.thighN + c.thighF) / 2;
  return {
    ...c,
    torso: c.torso + 0.03 * Math.cos(2 * p),
    thighN: mid + 0.3 * s + lift(Math.cos(p)) * 0.5,
    shinN: mid - 0.45 + 0.3 * s - lift(Math.cos(p)) * 1.4,
    thighF: mid - 0.3 * s + lift(-Math.cos(p)) * 0.5,
    shinF: mid - 0.45 - 0.3 * s - lift(-Math.cos(p)) * 1.4,
    armN: c.armN - 0.2 * s,
    armF: c.armF + 0.2 * s,
  };
}

// Elbow-and-knee crawl: opposite arm and leg reach together.
export function crawlPose(p) {
  const c = POSES.prone;
  const s = Math.sin(p);
  const reachN = Math.max(0, s);
  const reachF = Math.max(0, -s);
  return {
    ...c,
    thighN: c.thighN + 0.35 * reachF,
    shinN: c.shinN + 0.55 * reachF,
    thighF: c.thighF + 0.35 * reachN,
    shinF: c.shinF + 0.55 * reachN,
    armN: c.armN + 0.3 * reachN - 0.1,
    foreN: c.foreN + 0.2 * reachN,
    armF: c.armF + 0.3 * reachF - 0.1,
    foreF: c.foreF + 0.2 * reachF,
  };
}

const down = (a) => [Math.sin(a), Math.cos(a)];

// A limb segment as a round-capped stroke: convex at both ends, so joints
// never show a notch where two segments meet.
function seg(ctx, x0, y0, x1, y1, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export class Person {
  constructor(outfit = 'sami', scale = 1) {
    this.o = OUTFITS[outfit] || OUTFITS.man;
    this.scale = scale;
    this.x = 0;
    this.y = 0; // ground level (when grounded) or hip position (when not)
    this.f = 1;
    this.grounded = true;
    this.pose = { ...POSES.stand };
    this.prop = null;
    this.dust = 0; // 0…1 grey dust after shelling
    // Facing: 'side' (profile, the default), 'front' (towards us, out of a
    // side street) or 'back' (away from us, into one). viewK eases 0…1 as
    // the figure turns; the drawing flips through a narrow silhouette.
    this.view = 'side';
    this.viewFrom = 'side';
    this.viewK = 1;
    this.flipK = 1; // a quick pivot when turning round in profile
    this.blink = 0; // > 0 while the eyes are shut
  }

  // Turn to face a new way; the rig animates the turn.
  face(view) {
    if (view === this.view) return;
    this.viewFrom = this.viewK < 0.5 ? this.viewFrom : this.view;
    this.view = view;
    this.viewK = 0;
  }

  // Turning round (left ↔ right) in profile.
  pivot() {
    this.flipK = 0;
  }

  tick(dt) {
    if (this.viewK < 1) this.viewK = Math.min(1, this.viewK + dt * 4);
    if (this.flipK < 1) this.flipK = Math.min(1, this.flipK + dt * 7);
    if (this.blink > 0) this.blink -= dt;
    else if (Math.random() < dt * 0.3) this.blink = 0.13;
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
    const lN = L.fore * (p.foreNs ?? 1);
    const lF = L.fore * (p.foreFs ?? 1);
    j.handN = [j.elbowN[0] + fN[0] * lN, j.elbowN[1] + fN[1] * lN];
    j.handF = [j.elbowF[0] + fF[0] * lF, j.elbowF[1] + fF[1] * lF];
    this.local = j;
    return j;
  }

  // Height of the hip above the ground for the current pose.
  hipHeight() {
    const j = this.local || this.solve();
    if (this.pose.seat != null) return this.pose.seat;
    // Lowest of feet, knees and the torso itself, so poses blend smoothly
    // from standing to kneeling to lying flat.
    return Math.max(j.footN[1], j.footF[1], j.kneeN[1] + 8, j.kneeF[1] + 8, 12) + 4;
  }

  hip() {
    this.local || this.solve();
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
    // mid-turn: squeeze to a sliver, then open out into the new view
    const k = this.viewK;
    const shown = k < 0.5 ? this.viewFrom : this.view;
    let squeeze = k < 1 ? Math.max(0.12, Math.abs(Math.cos(k * Math.PI))) : 1;
    if (this.flipK < 1) squeeze *= Math.max(0.25, Math.abs(Math.cos(this.flipK * Math.PI)));
    if (squeeze < 1) {
      const [hx] = this.hip();
      ctx.save();
      ctx.translate(hx, 0);
      ctx.scale(squeeze, 1);
      ctx.translate(-hx, 0);
    }
    if (shown === 'side') this.drawSide(ctx);
    else this.drawFrontBack(ctx, shown === 'front');
    if (squeeze < 1) ctx.restore();
  }

  colours() {
    const o = this.o;
    const dusty = (c) => (this.dust > 0 && c ? mixHex(c, '#8a857c', this.dust * 0.55) : c);
    return {
      dusty,
      top: dusty(o.top),
      trousers: dusty(o.trousers),
      layer: o.layer ? dusty(o.layer.color) : null,
      hair: dusty(o.hair),
      beard: dusty(o.beardColor || o.hair),
      head: dusty(o.headColor || '#444444'),
    };
  }

  // ------------------------------------------------------------ profile --

  drawSide(ctx) {
    const j = this.solve();
    const [hx, hy] = this.hip();
    const o = this.o;
    const p = this.pose;
    const C = this.colours();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(this.f * this.scale, this.scale);

    const far = (c) => shade(c, 0.66);
    const sleeveCol = C.layer && o.layer.kind !== 'vest' ? C.layer : C.top;
    const longCoat = o.layer?.kind === 'coat';

    if (o.satchel) {
      // bag hangs behind the hip on the far side
      ctx.fillStyle = shade(o.satchel, 0.8);
      roundRect(ctx, -21, -8, 18, 21, 3);
      ctx.fill();
    }
    this.arm(ctx, j.shoulder, j.elbowF, j.handF, far(sleeveCol), o.skin, far(o.skin), false);
    this.leg(ctx, j.kneeF, j.footF, p.shinF, far(C.trousers), far(o.shoes), far(o.skin), true);

    if (o.robe || longCoat) {
      // a jalabiya or long coat: a skirt from the hip that follows the legs
      const kn = j.kneeN;
      const kf = j.kneeF;
      const fn = j.footN;
      const ff = j.footF;
      const bottom = Math.max(fn[1], ff[1]) - (o.robe ? 7 : 16);
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(12, -4);
      ctx.lineTo(Math.max(kn[0], kf[0]) + 10, Math.max(kn[1], kf[1]));
      ctx.lineTo(Math.max(fn[0], ff[0]) + 6, bottom);
      ctx.lineTo(Math.min(fn[0], ff[0]) - 8, bottom + 2);
      ctx.lineTo(Math.min(kn[0], kf[0]) - 12, Math.max(kn[1], kf[1]));
      ctx.closePath();
      ctx.fillStyle = longCoat ? C.layer : C.top;
      ctx.fill();
      // a fold or two
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.lineTo((kn[0] + fn[0]) / 2, bottom - 6);
      ctx.stroke();
    }
    this.leg(ctx, j.kneeN, j.footN, p.shinN, o.robe ? C.top : C.trousers, o.shoes, o.skin, false);

    // torso
    const up = [Math.sin(p.torso), -Math.cos(p.torso)];
    const side = [Math.cos(p.torso), Math.sin(p.torso)];
    const at = (d, s) => [up[0] * d + side[0] * s, up[1] * d + side[1] * s];
    const w = o.baggy ? 14 : 11.5;
    const torsoPath = () => {
      ctx.beginPath();
      const pts = [at(o.baggy ? -10 : -4, -w), at(o.baggy ? -10 : -2, w), at(L.torso - 15, w + 1.5), at(L.torso - 3, 9), at(L.torso, -3), at(L.torso - 6, -11), at(18, -w - 0.5)];
      ctx.moveTo(...pts[0]);
      for (const q of pts.slice(1)) ctx.lineTo(...q);
      ctx.closePath();
    };
    torsoPath();
    ctx.fillStyle = C.top;
    ctx.fill();
    ctx.save();
    torsoPath();
    ctx.clip();
    if (o.pattern) this.pattern(ctx, o, -30, -L.torso - 10, 60, L.torso + 14, p.torso);
    // form: the back of the body in shadow
    const g = ctx.createLinearGradient(...at(20, -w), ...at(20, w));
    g.addColorStop(0, 'rgba(0,0,0,0.22)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -80, 80, 100);
    // layers over the shirt
    if (o.layer) this.layerSide(ctx, o, C, at, w);
    ctx.restore();
    // collar line and placket
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(...at(L.torso - 3, 8));
    ctx.lineTo(...at(4, 9.5));
    ctx.stroke();
    if (o.belt) {
      ctx.strokeStyle = o.belt;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(...at(3, -w - 0.5));
      ctx.lineTo(...at(4, w + 0.5));
      ctx.stroke();
      ctx.fillStyle = '#9a8c6a';
      const b = at(4, w - 1);
      ctx.fillRect(b[0] - 1.5, b[1] - 2, 3, 4);
      if (o.pouch) {
        ctx.fillStyle = shade(o.belt, 1.15);
        const q = at(0, -w + 1);
        roundRect(ctx, q[0] - 5, q[1], 9, 10, 2);
        ctx.fill();
      }
    }
    if (o.satchel) {
      ctx.strokeStyle = shade(o.satchel, 0.9);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 4, -9));
      ctx.lineTo(...at(6, 11));
      ctx.stroke();
    }

    // head and neck
    const ha = p.torso + p.head;
    const [hdx, hdy] = j.head;
    limb(ctx, j.neck[0], j.neck[1] + 3, hdx - Math.sin(ha) * 4, hdy + Math.cos(ha) * 5, 8, 7.5, shade(o.skin, 0.93));
    if (o.keffiyeh === 'shoulders' || o.scarf) this.scarfSide(ctx, o, at);
    ctx.save();
    ctx.translate(hdx, hdy);
    ctx.rotate(ha);
    this.headSide(ctx, o, C);
    ctx.restore();

    this.arm(ctx, j.shoulder, j.elbowN, j.handN, sleeveCol, o.skin, o.skin, true);
    if (this.prop) this.prop(ctx, j.handN, j.handF);
    ctx.restore();
  }

  // A vest, sweater, jacket or coat over the shirt, clipped to the torso.
  layerSide(ctx, o, C, at, w) {
    const k = o.layer.kind;
    ctx.fillStyle = C.layer;
    if (k === 'vest') {
      // open at the front, cut away at the arm
      ctx.beginPath();
      const pts = [at(-6, -w - 2), at(-6, w - 2), at(L.torso - 22, w - 1), at(L.torso - 10, 3), at(L.torso - 4, -4), at(L.torso - 10, -12), at(14, -w - 2)];
      ctx.moveTo(...pts[0]);
      for (const q of pts.slice(1)) ctx.lineTo(...q);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 22, w - 1));
      ctx.lineTo(...at(-5, w - 2));
      ctx.stroke();
    } else if (k === 'sweater') {
      ctx.fillRect(-40, -80, 80, 100);
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      const hem = at(0, 0);
      ctx.fillRect(hem[0] - 30, hem[1] - 4, 60, 4);
    } else {
      // jacket or coat: covers the body, a strip of shirt at the open front
      ctx.fillRect(-40, -80, 80, 100);
      ctx.fillStyle = C.top;
      ctx.beginPath();
      const a0 = at(L.torso - 4, 6);
      const a1 = at(L.torso - 14, w + 2);
      const a2 = at(-6, w + 2);
      const a3 = at(-6, w - 3);
      ctx.moveTo(...a0);
      ctx.lineTo(...a1);
      ctx.lineTo(...a2);
      ctx.lineTo(...a3);
      ctx.closePath();
      ctx.fill();
      // lapel
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(...at(L.torso - 3, 3));
      ctx.lineTo(...at(L.torso - 18, w - 3));
      ctx.lineTo(...at(-6, w - 3));
      ctx.stroke();
    }
  }

  // Stripes or a check, drawn in torso space (clipped by the caller).
  pattern(ctx, o, x0, y0, w, h, lean) {
    ctx.save();
    ctx.rotate(lean);
    ctx.strokeStyle = o.patternColor || 'rgba(255,255,255,0.3)';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = o.pattern === 'stripe' ? 2.2 : 1;
    ctx.beginPath();
    for (let y = y0; y < y0 + h; y += o.pattern === 'stripe' ? 6 : 5) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
    }
    if (o.pattern === 'check') {
      for (let x = x0; x < x0 + w; x += 5) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + h);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // A keffiyeh over the shoulders, or a scarf: soft cloth round the neck,
  // one end down the back, one hanging in front, with a fringe.
  scarfSide(ctx, o, at) {
    const kef = o.keffiyeh === 'shoulders';
    const col = kef ? '#e6e0d3' : o.scarf;
    ctx.fillStyle = col;
    // round the neck
    ctx.beginPath();
    ctx.moveTo(...at(L.torso + 1, -7));
    ctx.quadraticCurveTo(...at(L.torso + 4, 2), ...at(L.torso, 9));
    ctx.lineTo(...at(L.torso - 7, 8));
    ctx.quadraticCurveTo(...at(L.torso - 3, 0), ...at(L.torso - 6, -8));
    ctx.closePath();
    ctx.fill();
    // the end down the back
    ctx.beginPath();
    ctx.moveTo(...at(L.torso - 1, -8));
    ctx.quadraticCurveTo(...at(L.torso - 14, -14), ...at(L.torso - 30, -12));
    ctx.lineTo(...at(L.torso - 30, -6));
    ctx.quadraticCurveTo(...at(L.torso - 14, -7), ...at(L.torso - 6, -2));
    ctx.closePath();
    ctx.fill();
    // the end hanging in front
    ctx.beginPath();
    ctx.moveTo(...at(L.torso - 4, 7));
    ctx.lineTo(...at(L.torso - 24, 10));
    ctx.lineTo(...at(L.torso - 24, 5));
    ctx.lineTo(...at(L.torso - 6, 2));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = kef ? 'rgba(120,30,30,0.45)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const [d, s0, s1] of [[L.torso - 30, -12, -6], [L.torso - 24, 5, 10]]) {
      for (let i = 0; i < 4; i++) {
        const q = at(d - 1, s0 + ((s1 - s0) * i) / 3);
        ctx.moveTo(...q);
        ctx.lineTo(q[0], q[1] + 3); // fringe
      }
    }
    if (kef) {
      ctx.moveTo(...at(L.torso - 10, -11));
      ctx.lineTo(...at(L.torso - 22, -11));
      ctx.moveTo(...at(L.torso - 12, 8));
      ctx.lineTo(...at(L.torso - 20, 8));
    }
    ctx.stroke();
  }

  // The head in profile, facing +x, centred on the skull.
  headSide(ctx, o, C) {
    const hr = L.head;
    const skin = o.skin;
    if (o.headwear === 'hijab') {
      ctx.beginPath();
      ctx.ellipse(-2, -1, hr * 1.12, hr * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.head;
      ctx.fill();
      // drape to the shoulders
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-16, 18, -6, 26);
      ctx.lineTo(8, 22);
      ctx.lineTo(5, 8);
      ctx.fill();
      // the face in its opening
      this.faceSide(ctx, hr, skin, true);
      this.eyeSide(ctx, hr, o, C);
      return;
    }
    // skull, then the face and jaw
    ctx.beginPath();
    ctx.ellipse(-hr * 0.08, -hr * 0.08, hr * 0.96, hr * 1.0, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    this.faceSide(ctx, hr, skin, false);
    // ear
    ctx.beginPath();
    ctx.ellipse(-hr * 0.22, hr * 0.12, 2.2, 3.4, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = shade(skin, 0.86);
    ctx.fill();
    this.hairSide(ctx, o, C, hr);
    this.beardSide(ctx, o, C, hr);
    this.eyeSide(ctx, hr, o, C);
    this.hatSide(ctx, o, C, hr);
    if (o.glasses) {
      ctx.strokeStyle = 'rgba(20,18,16,0.85)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(hr * 0.62, -hr * 0.1, 2.6, 2.2, 0, 0, Math.PI * 2);
      ctx.moveTo(hr * 0.36, -hr * 0.14);
      ctx.lineTo(-hr * 0.15, -hr * 0.05);
      ctx.stroke();
    }
  }

  // Brow, nose, lips and chin in profile.
  faceSide(ctx, hr, skin, veiled) {
    ctx.beginPath();
    ctx.moveTo(hr * 0.15, -hr * 0.92);
    ctx.quadraticCurveTo(hr * 0.78, -hr * 0.78, hr * 0.84, -hr * 0.3); // forehead
    ctx.lineTo(hr * 0.8, -hr * 0.12); // brow ridge
    ctx.lineTo(hr * 1.12, hr * 0.3); // nose tip
    ctx.lineTo(hr * 0.86, hr * 0.42); // under the nose
    ctx.lineTo(hr * 0.92, hr * 0.56); // upper lip
    ctx.lineTo(hr * 0.82, hr * 0.64); // mouth
    ctx.lineTo(hr * 0.88, hr * 0.76); // lower lip
    ctx.quadraticCurveTo(hr * 0.84, hr * 1.02, hr * 0.5, hr * 1.06); // chin
    ctx.quadraticCurveTo(hr * 0.02, hr * 1.02, -hr * 0.34, hr * 0.62); // jaw
    ctx.lineTo(-hr * 0.2, 0);
    ctx.closePath();
    ctx.fillStyle = skin;
    ctx.fill();
    // nostril and mouth line
    ctx.fillStyle = shade(skin, 0.7);
    ctx.fillRect(hr * 0.86, hr * 0.33, 1.2, 0.9);
    ctx.fillStyle = shade(skin, 0.62);
    ctx.fillRect(hr * 0.66, hr * 0.63, hr * 0.2, 0.8);
    if (veiled) return;
  }

  eyeSide(ctx, hr, o, C) {
    // brow and eye (blinking now and then)
    ctx.strokeStyle = shade(o.hairStyle === 'bald' || !o.hair ? '#6a5a4a' : o.hair.startsWith('#') ? o.hair : '#2a2018', 0.9);
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(hr * 0.4, -hr * 0.33);
    ctx.quadraticCurveTo(hr * 0.62, -hr * 0.4, hr * 0.8, -hr * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(22,16,12,0.85)';
    if (this.blink > 0) ctx.fillRect(hr * 0.48, -hr * 0.14, 3, 0.9);
    else {
      ctx.beginPath();
      ctx.ellipse(hr * 0.6, -hr * 0.12, 1.25, 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hairSide(ctx, o, C, hr) {
    const s = o.hairStyle || 'short';
    ctx.fillStyle = C.hair;
    if (s === 'bald') {
      // a horseshoe of hair round the back and above the ear
      ctx.beginPath();
      ctx.moveTo(-hr * 0.35, -hr * 0.25);
      ctx.quadraticCurveTo(-hr * 0.95, -hr * 0.55, -hr * 1.02, 0);
      ctx.quadraticCurveTo(-hr * 0.98, hr * 0.5, -hr * 0.68, hr * 0.62);
      ctx.lineTo(-hr * 0.42, hr * 0.3);
      ctx.quadraticCurveTo(-hr * 0.55, 0, -hr * 0.35, -hr * 0.25);
      ctx.fill();
      return;
    }
    const front = s === 'receding' ? hr * 0.05 : s === 'sidepart' ? hr * 0.62 : hr * 0.5;
    const topY = s === 'buzz' ? -hr * 1.05 : s === 'curly' ? -hr * 1.22 : s === 'sidepart' ? -hr * 1.18 : -hr * 1.13;
    if (s === 'buzz') ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(front, -hr * (s === 'receding' ? 0.95 : 0.72));
    ctx.quadraticCurveTo(hr * 0.35, topY, -hr * 0.2, topY + hr * 0.02);
    ctx.quadraticCurveTo(-hr * 0.95, topY + hr * 0.1, -hr * 1.06, -hr * 0.1);
    ctx.quadraticCurveTo(-hr * 1.02, hr * 0.42, -hr * 0.72, hr * 0.6); // nape
    ctx.lineTo(-hr * 0.46, hr * 0.28); // behind the ear
    ctx.quadraticCurveTo(-hr * 0.5, -hr * 0.2, -hr * 0.1, -hr * 0.18);
    if (s !== 'receding') {
      ctx.lineTo(hr * 0.02, hr * 0.26); // sideburn
      ctx.lineTo(hr * 0.14, hr * 0.22);
      ctx.lineTo(hr * 0.16, -hr * 0.4); // temple
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    if (s === 'curly') {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + i * 0.14);
        ctx.beginPath();
        ctx.arc(-hr * 0.2 + Math.cos(a) * hr * 0.95, -hr * 0.2 + Math.sin(a) * hr * 0.98, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (s === 'sidepart') {
      // a little lift at the front, and a lighter parting line
      ctx.strokeStyle = shade(o.hair, 1.4);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(hr * 0.3, -hr * 1.05);
      ctx.quadraticCurveTo(-hr * 0.2, -hr * 1.0, -hr * 0.7, -hr * 0.78);
      ctx.stroke();
    }
    if (s === 'ponytail' || s === 'braid') {
      ctx.strokeStyle = C.hair;
      ctx.lineCap = 'round';
      ctx.lineWidth = s === 'braid' ? 3.2 : 4.2;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.95, -hr * 0.25);
      ctx.quadraticCurveTo(-hr * 1.7, hr * 0.5, -hr * 1.35, s === 'braid' ? hr * 2.2 : hr * 1.3);
      ctx.stroke();
      ctx.fillStyle = '#8a3a3a';
      ctx.fillRect(-hr * 1.1, -hr * 0.22, 2.5, 2.5); // the hair tie
    }
  }

  beardSide(ctx, o, C, hr) {
    const b = o.beard || 'none';
    if (b === 'none') return;
    const col = C.beard;
    const jaw = (bottom, chinX = 0.84) => {
      ctx.beginPath();
      ctx.moveTo(-hr * 0.08, hr * 0.2); // from the sideburn
      ctx.lineTo(hr * 0.5, hr * 0.44); // cheek
      ctx.lineTo(hr * 0.66, hr * 0.44);
      ctx.lineTo(hr * 0.94, hr * 0.5); // round the mouth
      ctx.lineTo(hr * 0.9, hr * 0.62);
      ctx.lineTo(hr * 0.72, hr * 0.66);
      ctx.lineTo(hr * 0.9, hr * 0.74);
      ctx.quadraticCurveTo(hr * chinX + 0.1 * hr, hr * bottom, hr * 0.42, hr * (bottom + 0.06));
      ctx.quadraticCurveTo(-hr * 0.05, hr * (bottom - 0.08), -hr * 0.36, hr * 0.62);
      ctx.closePath();
    };
    if (b === 'stubble') {
      jaw(1.06);
      ctx.fillStyle = 'rgba(38,28,22,0.32)';
      ctx.fill();
      return;
    }
    ctx.fillStyle = col;
    if (b === 'short' || b === 'full') {
      jaw(b === 'full' ? 1.32 : 1.14);
      ctx.fill();
    } else if (b === 'long') {
      ctx.beginPath();
      ctx.moveTo(-hr * 0.08, hr * 0.2);
      ctx.lineTo(hr * 0.94, hr * 0.5);
      ctx.lineTo(hr * 0.92, hr * 0.62);
      ctx.lineTo(hr * 0.72, hr * 0.66);
      ctx.lineTo(hr * 0.95, hr * 0.8);
      ctx.quadraticCurveTo(hr * 0.9, hr * 1.5, hr * 0.5, hr * 1.95);
      ctx.quadraticCurveTo(hr * 0.1, hr * 1.4, -hr * 0.36, hr * 0.62);
      ctx.closePath();
      ctx.fill();
    } else if (b === 'goatee') {
      ctx.beginPath();
      ctx.moveTo(hr * 0.66, hr * 0.44);
      ctx.lineTo(hr * 0.94, hr * 0.5);
      ctx.lineTo(hr * 0.9, hr * 0.6);
      ctx.lineTo(hr * 0.74, hr * 0.64);
      ctx.lineTo(hr * 0.9, hr * 0.74);
      ctx.quadraticCurveTo(hr * 0.92, hr * 1.2, hr * 0.55, hr * 1.18);
      ctx.lineTo(hr * 0.56, hr * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (b === 'chinstrap') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-hr * 0.1, hr * 0.22);
      ctx.quadraticCurveTo(-hr * 0.05, hr * 0.95, hr * 0.5, hr * 1.1);
      ctx.quadraticCurveTo(hr * 0.84, hr * 1.02, hr * 0.86, hr * 0.8);
      ctx.stroke();
    }
    if (b === 'moustache' || b === 'thickMoustache' || b === 'full' || b === 'short' || b === 'long' || b === 'goatee') {
      ctx.fillStyle = col;
      ctx.beginPath();
      const thick = b === 'thickMoustache' ? 1.6 : 1;
      ctx.moveTo(hr * 0.6, hr * 0.44);
      ctx.lineTo(hr * 0.95, hr * 0.46);
      ctx.lineTo(hr * 0.95, hr * (0.5 + 0.1 * thick));
      ctx.lineTo(hr * 0.68, hr * (0.52 + 0.14 * thick));
      ctx.closePath();
      ctx.fill();
    }
  }

  hatSide(ctx, o, C, hr) {
    const h = o.headwear;
    if (!h) return;
    ctx.fillStyle = C.head;
    if (h === 'kufi') {
      ctx.beginPath();
      ctx.ellipse(-hr * 0.15, -hr * 0.62, hr * 0.94, hr * 0.5, -0.1, Math.PI, 0);
      ctx.fill();
    } else if (h === 'cap') {
      // flat cap: a soft crown pulled forward, a short brim
      ctx.beginPath();
      ctx.moveTo(-hr * 1.02, -hr * 0.3);
      ctx.quadraticCurveTo(-hr * 0.9, -hr * 1.2, hr * 0.2, -hr * 1.08);
      ctx.quadraticCurveTo(hr * 0.9, -hr * 0.95, hr * 1.12, -hr * 0.56);
      ctx.lineTo(hr * 0.72, -hr * 0.52);
      ctx.lineTo(-hr * 1.0, -hr * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(hr * 0.55, -hr * 0.6, hr * 0.55, 1.2);
    } else if (h === 'beanie') {
      ctx.beginPath();
      ctx.moveTo(-hr * 1.04, -hr * 0.2);
      ctx.quadraticCurveTo(-hr * 1.0, -hr * 1.22, hr * 0.1, -hr * 1.18);
      ctx.quadraticCurveTo(hr * 0.86, -hr * 1.05, hr * 0.84, -hr * 0.42);
      ctx.lineTo(-hr * 1.04, -hr * 0.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(-hr * 1.04, -hr * 0.55, hr * 1.9, 3); // the fold
    } else if (h === 'keffiyeh') {
      ctx.beginPath();
      ctx.moveTo(hr * 0.7, -hr * 0.6);
      ctx.quadraticCurveTo(hr * 0.2, -hr * 1.35, -hr * 1.0, -hr * 0.9);
      ctx.quadraticCurveTo(-hr * 1.5, hr * 0.4, -hr * 1.2, hr * 2.0);
      ctx.lineTo(-hr * 0.3, hr * 1.6);
      ctx.lineTo(-hr * 0.1, hr * 0.2);
      ctx.lineTo(hr * 0.4, -hr * 0.3);
      ctx.closePath();
      ctx.fill();
      // the band (agal) and a hint of the pattern
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hr * 0.5, -hr * 0.72);
      ctx.quadraticCurveTo(-hr * 0.2, -hr * 1.02, -hr * 0.95, -hr * 0.62);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,40,40,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-hr * (0.4 + i * 0.25), -hr * 0.6);
        ctx.lineTo(-hr * (0.6 + i * 0.25), hr * 1.4);
      }
      ctx.stroke();
    }
  }

  // ----------------------------------------------------- front and back --

  // Facing us or facing away. The same pose drives it: the side view's
  // vertical extents of knees, feet, elbows and hands foreshorten naturally.
  drawFrontBack(ctx, front) {
    const j = this.solve();
    const [hx, hy] = this.hip();
    const o = this.o;
    const p = this.pose;
    const C = this.colours();
    const sleeveCol = C.layer && o.layer.kind !== 'vest' ? C.layer : C.top;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(this.scale, this.scale);
    const wide = o.baggy ? 15 : 12.5;
    const sy = j.shoulder[1];
    const ny = j.neck[1];
    const stroke = (pts, w, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (const q of pts.slice(1)) ctx.lineTo(...q);
      ctx.stroke();
    };
    const leg = (side, knee, foot, cloth) => {
      const x0 = side * 6.5;
      const kx = x0 + side * 1.2;
      const fy = Math.max(knee[1] + 8, foot[1]);
      stroke([[x0, 0], [kx, Math.max(9, knee[1])], [x0, fy]], 12, cloth);
      if (o.footwear === 'sandal') {
        ctx.fillStyle = o.skin;
        ctx.beginPath();
        ctx.ellipse(x0, fy + 2, 5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = o.shoes;
        ctx.fillRect(x0 - 5, fy + 4, 10, 1.8);
      } else {
        ctx.fillStyle = o.shoes;
        ctx.beginPath();
        ctx.ellipse(x0, fy + 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const nFirst = j.footN[1] < j.footF[1];
    const legs = [
      [-1, j.kneeN, j.footN],
      [1, j.kneeF, j.footF],
    ];
    if (!nFirst) legs.reverse();
    for (const [side, kn, ft] of legs) leg(side, kn, ft, o.robe ? shade(o.top, 0.9) : C.trousers);
    if (o.robe || o.layer?.kind === 'coat') {
      const bottom = Math.max(j.footN[1], j.footF[1]) - (o.robe ? 6 : 16);
      ctx.beginPath();
      ctx.moveTo(-wide, -2);
      ctx.lineTo(wide, -2);
      ctx.lineTo(wide + 4, bottom);
      ctx.lineTo(-wide - 4, bottom);
      ctx.closePath();
      ctx.fillStyle = o.layer?.kind === 'coat' ? C.layer : C.top;
      ctx.fill();
    }
    const arm = (side, e, h) => {
      const sx = side * (wide + 2);
      const ex = sx + side * 3;
      const hxx = sx + side * 2.5;
      const ey = Math.max(sy + 8, e[1]);
      const hy3 = Math.max(sy + 14, h[1]);
      stroke([[sx, sy + 3], [ex, ey]], 9, shade(sleeveCol, 0.92));
      const bare = o.sleeve === 'short' || o.rolled;
      stroke([[ex, ey], [hxx, hy3]], bare ? 7 : 8.5, bare ? o.skin : shade(sleeveCol, 0.92));
      ctx.beginPath();
      ctx.ellipse(hxx, hy3 + 2, 3.8, 4.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = o.skin;
      ctx.fill();
    };
    // torso: shoulders wider than the hips
    const torso = () => {
      ctx.beginPath();
      ctx.moveTo(-wide + 1, 2);
      ctx.lineTo(wide - 1, 2);
      ctx.lineTo(wide + 2, sy + 4);
      ctx.quadraticCurveTo(wide, ny + 1, 6, ny);
      ctx.lineTo(-6, ny);
      ctx.quadraticCurveTo(-wide, ny + 1, -wide - 2, sy + 4);
      ctx.closePath();
    };
    torso();
    ctx.fillStyle = C.top;
    ctx.fill();
    ctx.save();
    torso();
    ctx.clip();
    if (o.pattern) this.pattern(ctx, o, -30, ny - 4, 60, -ny + 10, 0);
    if (o.layer) {
      ctx.fillStyle = C.layer;
      if (o.layer.kind === 'sweater') ctx.fillRect(-30, ny - 4, 60, -ny + 10);
      else if (front) {
        // open at the front: two panels either side of the shirt
        ctx.fillRect(-30, ny - 4, 30 - (o.layer.kind === 'vest' ? 4 : 5), -ny + 10);
        ctx.fillRect(o.layer.kind === 'vest' ? 4 : 5, ny - 4, 30, -ny + 10);
      } else ctx.fillRect(-30, ny - 4, 60, -ny + 10);
    }
    const g = ctx.createLinearGradient(-wide, 0, wide, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.16)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(-30, ny - 4, 60, -ny + 10);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (front) {
      ctx.moveTo(0, ny + 3);
      ctx.lineTo(0, -2);
      ctx.moveTo(-5, ny + 1);
      ctx.lineTo(0, ny + 6);
      ctx.lineTo(5, ny + 1);
    } else {
      ctx.moveTo(-wide + 4, sy + 10);
      ctx.quadraticCurveTo(0, sy + 15, wide - 4, sy + 10);
    }
    ctx.stroke();
    if (o.belt) {
      ctx.fillStyle = o.belt;
      ctx.fillRect(-wide, -3, wide * 2, 3.4);
      if (front) {
        ctx.fillStyle = '#9a8c6a';
        ctx.fillRect(-2, -3.5, 4, 4.4);
      }
    }
    arm(-1, j.elbowN, j.handN);
    arm(1, j.elbowF, j.handF);
    if (o.satchel) {
      ctx.strokeStyle = shade(o.satchel, 0.9);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-wide + 3, ny + 2);
      ctx.lineTo(wide - 2, -4);
      ctx.stroke();
      if (!front) {
        ctx.fillStyle = o.satchel;
        roundRect(ctx, wide - 11, -12, 15, 17, 3);
        ctx.fill();
      }
    }
    if (o.keffiyeh === 'shoulders' || o.scarf) {
      const kef = o.keffiyeh === 'shoulders';
      ctx.fillStyle = kef ? '#e6e0d3' : o.scarf;
      // round the neck, and the two ends hanging down the chest (or back)
      ctx.beginPath();
      ctx.moveTo(-9, ny + 1);
      ctx.quadraticCurveTo(0, ny - 3, 9, ny + 1);
      ctx.lineTo(8, ny + 6);
      ctx.quadraticCurveTo(0, ny + 3, -8, ny + 6);
      ctx.closePath();
      ctx.fill();
      for (const sx of front ? [-7, 7] : [0]) {
        ctx.beginPath();
        ctx.moveTo(sx - 3, ny + 4);
        ctx.lineTo(sx + 3, ny + 4);
        ctx.lineTo(sx + 3.5, ny + 26);
        ctx.lineTo(sx - 3.5, ny + 26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = kef ? 'rgba(120,30,30,0.45)' : 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.moveTo(sx - 3 + i * 2, ny + 26);
          ctx.lineTo(sx - 3 + i * 2, ny + 29);
        }
        if (kef) {
          ctx.moveTo(sx - 3, ny + 12);
          ctx.lineTo(sx + 3, ny + 12);
          ctx.moveTo(sx - 3, ny + 19);
          ctx.lineTo(sx + 3, ny + 19);
        }
        ctx.stroke();
      }
    }
    // neck and head
    const hr = L.head;
    const hy2 = j.head[1];
    limb(ctx, 0, ny + 2, 0, hy2 + hr * 0.6, 8, 7.5, shade(o.skin, 0.93));
    ctx.save();
    ctx.translate(0, hy2);
    ctx.rotate(Math.sin(p.head) * 0.15);
    this.headFrontBack(ctx, o, C, hr, front);
    ctx.restore();
    if (this.prop) this.prop(ctx, [-(wide + 3), j.handN[1]], [wide + 3, j.handF[1]]);
    ctx.restore();
  }

  headFrontBack(ctx, o, C, hr, front) {
    const skin = o.skin;
    if (o.headwear === 'hijab') {
      ctx.beginPath();
      ctx.ellipse(0, 1, hr * 1.12, hr * 1.28, 0, 0, Math.PI * 2);
      ctx.moveTo(-hr * 1.1, 4);
      ctx.quadraticCurveTo(-hr * 1.3, hr * 2.2, 0, hr * 2.3);
      ctx.quadraticCurveTo(hr * 1.3, hr * 2.2, hr * 1.1, 4);
      ctx.fillStyle = C.head;
      ctx.fill();
      if (front) {
        ctx.beginPath();
        ctx.ellipse(0, 1.5, hr * 0.66, hr * 0.86, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin;
        ctx.fill();
        this.drawFace(ctx, hr, o, C, true);
      }
      return;
    }
    // head with a jaw that narrows to the chin
    ctx.beginPath();
    ctx.moveTo(-hr * 0.9, -hr * 0.2);
    ctx.quadraticCurveTo(-hr * 0.95, -hr * 1.05, 0, -hr * 1.05);
    ctx.quadraticCurveTo(hr * 0.95, -hr * 1.05, hr * 0.9, -hr * 0.2);
    ctx.quadraticCurveTo(hr * 0.86, hr * 0.7, hr * 0.35, hr * 1.02);
    ctx.quadraticCurveTo(0, hr * 1.12, -hr * 0.35, hr * 1.02);
    ctx.quadraticCurveTo(-hr * 0.86, hr * 0.7, -hr * 0.9, -hr * 0.2);
    ctx.fillStyle = skin;
    ctx.fill();
    // ears
    ctx.fillStyle = shade(skin, 0.9);
    ctx.beginPath();
    ctx.ellipse(-hr * 0.92, hr * 0.05, 2, 3.2, 0, 0, Math.PI * 2);
    ctx.ellipse(hr * 0.92, hr * 0.05, 2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    const s = o.hairStyle || 'short';
    ctx.fillStyle = C.hair;
    if (!front) {
      // the back of the head
      if (s === 'bald') {
        ctx.beginPath();
        ctx.ellipse(0, hr * 0.25, hr * 0.92, hr * 0.5, 0, 0, Math.PI);
        ctx.fill();
      } else {
        if (s === 'buzz') ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(-hr * 0.92, hr * 0.35);
        ctx.quadraticCurveTo(-hr * 1.02, -hr * 1.15, 0, -hr * (s === 'curly' ? 1.22 : 1.12));
        ctx.quadraticCurveTo(hr * 1.02, -hr * 1.15, hr * 0.92, hr * 0.35);
        ctx.quadraticCurveTo(0, hr * 0.72, -hr * 0.92, hr * 0.35);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (s === 'ponytail' || s === 'braid') {
          ctx.strokeStyle = C.hair;
          ctx.lineWidth = s === 'braid' ? 3.2 : 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, hr * 0.4);
          ctx.lineTo(0, s === 'braid' ? hr * 2.3 : hr * 1.5);
          ctx.stroke();
        }
      }
    } else if (s !== 'bald') {
      // hairline across the brow
      if (s === 'buzz') ctx.globalAlpha = 0.7;
      const line = s === 'receding' ? -hr * 0.62 : -hr * 0.42;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.94, hr * 0.1);
      ctx.quadraticCurveTo(-hr * 1.02, -hr * 1.18, 0, -hr * (s === 'curly' ? 1.24 : 1.14));
      ctx.quadraticCurveTo(hr * 1.02, -hr * 1.18, hr * 0.94, hr * 0.1);
      ctx.lineTo(hr * 0.8, hr * 0.05);
      ctx.quadraticCurveTo(hr * 0.72, line, s === 'sidepart' ? hr * 0.3 : 0, line - (s === 'receding' ? hr * 0.15 : 0));
      ctx.quadraticCurveTo(-hr * 0.72, line, -hr * 0.8, hr * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // bald: hair only above the ears
      ctx.fillRect(-hr * 0.95, -hr * 0.25, hr * 0.2, hr * 0.4);
      ctx.fillRect(hr * 0.75, -hr * 0.25, hr * 0.2, hr * 0.4);
    }
    if (front) this.drawFace(ctx, hr, o, C, false);
    this.hatFrontBack(ctx, o, C, hr, front);
  }

  hatFrontBack(ctx, o, C, hr, front) {
    const h = o.headwear;
    if (!h) return;
    ctx.fillStyle = C.head;
    if (h === 'kufi') {
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.55, hr * 0.94, hr * 0.52, 0, Math.PI, 0);
      ctx.fill();
    } else if (h === 'cap' || h === 'beanie') {
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.45, hr * 1.02, hr * (h === 'cap' ? 0.62 : 0.74), 0, Math.PI, 0);
      ctx.fill();
      if (h === 'cap' && front) {
        ctx.fillStyle = shade(o.headColor || '#444444', 0.8);
        ctx.fillRect(-hr * 0.9, -hr * 0.5, hr * 1.8, 2);
      }
    } else if (h === 'keffiyeh') {
      ctx.beginPath();
      ctx.moveTo(-hr * 1.05, hr * 1.6);
      ctx.quadraticCurveTo(-hr * 1.25, -hr * 1.3, 0, -hr * 1.25);
      ctx.quadraticCurveTo(hr * 1.25, -hr * 1.3, hr * 1.05, hr * 1.6);
      if (front) {
        ctx.lineTo(hr * 0.8, hr * 0.2);
        ctx.quadraticCurveTo(hr * 0.8, -hr * 0.75, 0, -hr * 0.78);
        ctx.quadraticCurveTo(-hr * 0.8, -hr * 0.75, -hr * 0.8, hr * 0.2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -hr * 0.75, hr * 0.98, hr * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // A face towards us: brows, eyes, nose, mouth, and the beard.
  drawFace(ctx, hr, o, C, veiled) {
    const b = veiled ? 'none' : o.beard || 'none';
    const col = C.beard;
    if (b === 'stubble') {
      ctx.fillStyle = 'rgba(38,28,22,0.3)';
      ctx.beginPath();
      ctx.moveTo(-hr * 0.85, hr * 0.05);
      ctx.quadraticCurveTo(-hr * 0.8, hr * 0.95, 0, hr * 1.1);
      ctx.quadraticCurveTo(hr * 0.8, hr * 0.95, hr * 0.85, hr * 0.05);
      ctx.lineTo(hr * 0.45, hr * 0.4);
      ctx.lineTo(-hr * 0.45, hr * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (b === 'short' || b === 'full' || b === 'long') {
      const bottom = b === 'long' ? 1.9 : b === 'full' ? 1.35 : 1.18;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.88, 0);
      ctx.quadraticCurveTo(-hr * 0.85, hr * (bottom - 0.2), 0, hr * bottom);
      ctx.quadraticCurveTo(hr * 0.85, hr * (bottom - 0.2), hr * 0.88, 0);
      ctx.lineTo(hr * 0.5, hr * 0.4);
      ctx.quadraticCurveTo(0, hr * 0.32, -hr * 0.5, hr * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (b === 'goatee') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, hr * 0.85, hr * 0.28, hr * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (b === 'chinstrap') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.86, 0);
      ctx.quadraticCurveTo(-hr * 0.8, hr * 1.02, 0, hr * 1.08);
      ctx.quadraticCurveTo(hr * 0.8, hr * 1.02, hr * 0.86, 0);
      ctx.stroke();
    }
    if (['moustache', 'thickMoustache', 'full', 'short', 'long', 'goatee'].includes(b)) {
      ctx.fillStyle = col;
      const t = b === 'thickMoustache' ? 3.2 : 2.1;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.42, hr * 0.5 + t * 0.4);
      ctx.quadraticCurveTo(0, hr * 0.36, hr * 0.42, hr * 0.5 + t * 0.4);
      ctx.lineTo(hr * 0.3, hr * 0.5 + t);
      ctx.quadraticCurveTo(0, hr * 0.44 + t, -hr * 0.3, hr * 0.5 + t);
      ctx.closePath();
      ctx.fill();
    }
    // nose and mouth
    ctx.fillStyle = shade(o.skin, 0.78);
    ctx.fillRect(-0.6, -hr * 0.05, 1.2, hr * 0.3);
    ctx.fillRect(-1.8, hr * 0.26, 3.6, 1);
    ctx.fillStyle = shade(o.skin, 0.6);
    ctx.fillRect(-hr * 0.2, hr * 0.64, hr * 0.4, 0.9);
    // brows and eyes
    ctx.fillStyle = 'rgba(30,22,16,0.45)';
    ctx.fillRect(-hr * 0.55, -hr * 0.36, hr * 0.34, 0.8);
    ctx.fillRect(hr * 0.21, -hr * 0.36, hr * 0.34, 0.8);
    ctx.fillStyle = 'rgba(22,16,12,0.88)';
    if (this.blink > 0) {
      ctx.fillRect(-hr * 0.5, -hr * 0.14, hr * 0.3, 0.9);
      ctx.fillRect(hr * 0.2, -hr * 0.14, hr * 0.3, 0.9);
    } else {
      ctx.beginPath();
      ctx.ellipse(-hr * 0.34, -hr * 0.12, 1.3, 1.1, 0, 0, Math.PI * 2);
      ctx.ellipse(hr * 0.34, -hr * 0.12, 1.3, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.glasses) {
      ctx.strokeStyle = 'rgba(20,18,16,0.85)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(-hr * 0.34, -hr * 0.12, 2.8, 2.3, 0, 0, Math.PI * 2);
      ctx.moveTo(hr * 0.34 + 2.8, -hr * 0.12);
      ctx.ellipse(hr * 0.34, -hr * 0.12, 2.8, 2.3, 0, 0, Math.PI * 2);
      ctx.moveTo(-hr * 0.34 + 2.8, -hr * 0.12);
      ctx.lineTo(hr * 0.34 - 2.8, -hr * 0.12);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------- limbs --

  leg(ctx, knee, foot, shinA, cloth, shoe, skin, far) {
    const o = this.o;
    seg(ctx, 0, 0, knee[0], knee[1], 13.5, cloth);
    seg(ctx, knee[0], knee[1], foot[0], foot[1], 11, cloth);
    // a crease behind a bent knee
    const bend = Math.abs(Math.atan2(knee[0], knee[1]) - Math.atan2(foot[0] - knee[0], foot[1] - knee[1]));
    if (bend > 0.35) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(knee[0] - 3, knee[1] - 3);
      ctx.lineTo(knee[0] - 5, knee[1] + 3);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.rotate(-shinA * 0.8);
    const fw = o.footwear || 'shoe';
    if (fw === 'sandal') {
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.moveTo(-4, -3);
      ctx.lineTo(11, -1);
      ctx.quadraticCurveTo(14, 2, 11, 4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shoe;
      ctx.fillRect(-6, 4, 19, 2); // sole
      ctx.fillRect(3, -1, 2, 5); // strap
    } else {
      if (fw === 'boot') {
        ctx.fillStyle = shoe;
        ctx.fillRect(-5, -11, 10, 10); // the shaft up the ankle
      }
      ctx.fillStyle = shoe;
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(8, -3);
      ctx.quadraticCurveTo(14, -1.5, 14.5, 2.5); // toe
      ctx.lineTo(14, 4.5);
      ctx.lineTo(-6, 4.5);
      ctx.lineTo(-6, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-6, 3.4, 20, 1.3); // sole and heel line
      ctx.fillRect(-6, 1.5, 5, 2);
    }
    ctx.restore();
  }

  arm(ctx, s, e, h, cloth, skin, skinShade, near) {
    const o = this.o;
    const short = o.sleeve === 'short';
    if (short) {
      // sleeve ends above the elbow
      seg(ctx, e[0], e[1], h[0], h[1], 6.6, skinShade);
      seg(ctx, lerp(s[0], e[0], 0.5), lerp(s[1], e[1], 0.5), e[0], e[1], 7, skinShade);
      seg(ctx, s[0], s[1], lerp(s[0], e[0], 0.55), lerp(s[1], e[1], 0.55), 10, cloth);
    } else if (o.rolled) {
      seg(ctx, s[0], s[1], e[0], e[1], 9.8, cloth);
      seg(ctx, e[0], e[1], h[0], h[1], 7, skinShade);
      ctx.fillStyle = cloth; // the rolled cuff
      ctx.beginPath();
      ctx.arc(e[0], e[1], 5.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      seg(ctx, s[0], s[1], e[0], e[1], 9.8, cloth);
      seg(ctx, e[0], e[1], h[0], h[1], 8.4, cloth);
      // a fold at the elbow
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e[0] - 2, e[1] - 2);
      ctx.lineTo(e[0] + 2, e[1] + 1);
      ctx.stroke();
    }
    if (near && o.watch) {
      const wx = lerp(e[0], h[0], 0.82);
      const wy = lerp(e[1], h[1], 0.82);
      ctx.fillStyle = '#2a2622';
      ctx.beginPath();
      ctx.arc(wx, wy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // hand: a palm along the forearm, and a thumb
    const ang = Math.atan2(h[1] - e[1], h[0] - e[0]);
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(ang);
    ctx.fillStyle = skinShade;
    ctx.beginPath();
    ctx.ellipse(3, 0, 5.2, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1.5, 3, 2.6, 1.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const DEFAULTS = { foreNs: 1, foreFs: 1 };

export function blendPose(a, b, t) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'seat') continue;
    const va = a[k] ?? DEFAULTS[k] ?? b[k];
    const vb = b[k] ?? DEFAULTS[k] ?? a[k];
    out[k] = lerp(va, vb, t);
  }
  // a seat can't be half there: it arrives with the pose
  const seat = t > 0.5 ? b.seat : a.seat;
  if (seat != null) out.seat = seat;
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Mix two colours, returning hex so it can be shaded again.
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (n, s) => (n >> s) & 255;
  const m = (s) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(t)));
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}
