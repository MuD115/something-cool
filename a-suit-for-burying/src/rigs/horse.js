// A side-on horse. Legs are two-bone IK chains driven by gait cycles with
// real footfall orders: the walk is a four-beat lateral sequence, the trot
// pairs diagonals, the gallop is a transverse four-beat with a suspension
// phase. Local frame: facing right, ground at y = 0.

import { clamp, lerp, ik2, noise1 } from '../engine/util.js';
import { smoothPath, limb, shade } from './shapes.js';

// Leg order: near fore, far fore, near hind, far hind.
const GAITS = {
  stand: { freq: 0, duty: 1, lift: 0, bob: 0, pitch: 0, off: [0, 0, 0, 0] },
  walk: { freq: 0.95, duty: 0.62, lift: 15, bob: 2.5, pitch: 0.01, off: [0.25, 0.75, 0.0, 0.5] },
  trot: { freq: 1.45, duty: 0.44, lift: 26, bob: 6, pitch: 0.015, off: [0.5, 0.0, 0.0, 0.5] },
  gallop: { freq: 2.15, duty: 0.34, lift: 34, bob: 11, pitch: 0.075, off: [0.56, 0.46, 0.1, 0.0] },
  swim: { freq: 1.1, duty: 0.5, lift: 30, bob: 4, pitch: 0.03, off: [0.0, 0.5, 0.5, 0.0] },
};

const BODY_Y = -120; // body centre height
const FORE_ROOT = [60, 14];
const HIND_ROOT = [-64, 4];
const REST_X = [66, 58, -62, -70];

export const COATS = {
  dove: { coat: '#9ea2a6', dark: '#6c7075', mane: '#dcdcd8', hoof: '#2b2a28', muzzle: '#4e4f52' },
  chestnut: { coat: '#7b4125', dark: '#4f2a17', mane: '#3e1f10', hoof: '#221a14', muzzle: '#3a2216' },
};

export class Horse {
  constructor(coat = 'dove', scale = 1) {
    this.c = COATS[coat];
    this.scale = scale;
    this.x = 0;
    this.y = 0;
    this.f = 1;
    this.gait = 'stand';
    this.prevGait = 'stand';
    this.blend = 1;
    this.speed = 0;
    this.phase = 0;
    this.neck = -0.9; // radians from horizontal, negative = up
    this.head = 1.05;
    this.rear = 0; // 0…1 rearing on the hind legs
    this.buck = 0; // −1…1 extra pitch
    this.lift = 0; // extra vertical offset (swimming, jumping)
    this.ears = 0; // 0 forward … 1 pinned back
    this.saddled = false;
    this.bags = false;
    this.reins = null; // world point the reins run to, or null to hang
    this.tailVel = 0;
    this.tailAng = 0.25;
    this.time = 0;
    this.onStep = null;
    this.lastPh = [0, 0, 0, 0];
    this.pitch = 0;
    this.bob = 0;
  }

  setGait(g, speed) {
    if (g !== this.gait) {
      this.prevGait = this.gait;
      this.gait = g;
      this.blend = 0;
    }
    if (speed !== undefined) this.speed = speed;
  }

  // Advance the gait cycle and move the horse through the world.
  update(dt, move = true) {
    this.time += dt;
    const g = GAITS[this.gait];
    this.blend = Math.min(this.blend + dt / 0.45, 1);
    if (g.freq > 0) this.phase = (this.phase + dt * g.freq * Math.sign(this.speed || 1)) % 1;
    if (this.phase < 0) this.phase += 1;
    if (move) this.x += this.speed * this.f * dt;

    // Footfall events for hoof sounds.
    if (g.freq > 0 && this.onStep) {
      for (let i = 0; i < 4; i++) {
        const ph = (this.phase - g.off[i] + 1) % 1;
        if (ph < this.lastPh[i] && this.speed !== 0) this.onStep(i, this.gait);
        this.lastPh[i] = ph;
      }
    }

    // A springy tail that lags behind the body's motion.
    const target = 0.28 + Math.abs(this.speed) * 0.0012 + 0.08 * noise1(this.time * 0.7) + this.rear * 0.5;
    this.tailVel += (target - this.tailAng) * dt * 30 - this.tailVel * dt * 5;
    this.tailAng += this.tailVel * dt;
  }

  // Hoof targets (local) for one gait at the current phase.
  hooves(gname) {
    const g = GAITS[gname];
    const out = [];
    const stride = g.freq > 0 ? (Math.abs(this.speed) * g.duty) / g.freq : 0;
    for (let i = 0; i < 4; i++) {
      let hx = REST_X[i];
      let hy = 0;
      if (g.freq > 0) {
        const ph = (this.phase - g.off[i] + 1) % 1;
        if (ph < g.duty) {
          hx += lerp(stride / 2, -stride / 2, ph / g.duty);
        } else {
          const s = (ph - g.duty) / (1 - g.duty);
          hx += lerp(-stride / 2, stride / 2, s);
          hy = -g.lift * Math.sin(Math.PI * s) * (i < 2 ? 1 : 0.8);
        }
      }
      out.push([hx, hy]);
    }
    return out;
  }

  solve() {
    const g = GAITS[this.gait];
    const gp = GAITS[this.prevGait];
    const b = this.blend;
    const h1 = this.hooves(this.gait);
    const h0 = this.hooves(this.prevGait);
    const hv = h1.map((h, i) => [lerp(h0[i][0], h[0], b), lerp(h0[i][1], h[1], b)]);

    const cyc = Math.sin(this.phase * Math.PI * 2 * (this.gait === 'walk' || this.gait === 'trot' ? 2 : 1));
    const bob = lerp(gp.bob, g.bob, b) * cyc + this.lift;
    const pitch = lerp(gp.pitch, g.pitch, b) * Math.sin(this.phase * Math.PI * 2 + 0.6) - this.rear * 0.78 + this.buck * 0.35;
    this.pitch = pitch;
    this.bob = bob;

    // Body frame: rotate about the hind hip so rearing stays planted.
    const piv = [HIND_ROOT[0], BODY_Y + HIND_ROOT[1]];
    const cs = Math.cos(pitch);
    const sn = Math.sin(pitch);
    const body = (x, y) => {
      const lx = x - piv[0];
      const ly = y + BODY_Y - piv[1];
      return [piv[0] + lx * cs - ly * sn, piv[1] + lx * sn + ly * cs - bob];
    };

    // Rearing tucks the forelegs up under the chest.
    const tuck = clamp(this.rear * 1.4);
    for (let i = 0; i < 2; i++) {
      const t = body(FORE_ROOT[0] + 22 + i * 6, FORE_ROOT[1] + 70);
      hv[i] = [lerp(hv[i][0], t[0], tuck), lerp(hv[i][1], t[1], tuck)];
    }
    this.frame = { body, hv, pitch };
    return this.frame;
  }

  toWorld(lx, ly) {
    return [this.x + lx * this.f * this.scale, this.y + ly * this.scale];
  }

  // Seat of the saddle in world space, plus body pitch, for a rider.
  seat() {
    const { body, pitch } = this.frame || this.solve();
    const p = body(-2, -46);
    return { x: this.toWorld(p[0], p[1])[0], y: this.toWorld(p[0], p[1])[1], pitch: pitch * this.f, f: this.f };
  }

  // Bit (for reins) in world space.
  bit() {
    return this.bitWorld || [this.x, this.y - 120];
  }

  draw(ctx) {
    const { body, hv } = this.solve();
    const c = this.c;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.f * this.scale, this.scale);

    const farCoat = shade(c.coat, 0.66);
    const legs = [
      { root: FORE_ROOT, fore: true },
      { root: FORE_ROOT, fore: true },
      { root: HIND_ROOT, fore: false },
      { root: HIND_ROOT, fore: false },
    ];
    const drawLeg = (i, near) => {
      const L = legs[i];
      const r = body(L.root[0] + (near ? 0 : -6), L.root[1]);
      const hoof = hv[i];
      const fet = [hoof[0] + (L.fore ? -3 : -4), hoof[1] - 13];
      const a = L.fore ? 54 : 58;
      const bl = L.fore ? 52 : 52;
      const bend = L.fore ? -1 : 1; // knees forward, hocks back
      const j = ik2(r[0], r[1], fet[0], fet[1], a, bl, bend);
      const col = near ? c.coat : farCoat;
      const low = near ? c.dark : shade(c.dark, 0.7);
      limb(ctx, j.jx, j.jy, j.ex, j.ey, 13, 9.5, col);
      limb(ctx, r[0], r[1] - 8, j.jx, j.jy, L.fore ? 26 : 36, 14, col);
      limb(ctx, j.ex, j.ey, hoof[0] + 3, hoof[1] - 4, 10, 9, low);
      ctx.beginPath();
      ctx.moveTo(hoof[0] - 5, hoof[1] - 7);
      ctx.lineTo(hoof[0] + 8, hoof[1] - 7);
      ctx.lineTo(hoof[0] + 10, hoof[1]);
      ctx.lineTo(hoof[0] - 5, hoof[1]);
      ctx.closePath();
      ctx.fillStyle = near ? c.hoof : shade(c.hoof, 0.7);
      ctx.fill();
    };

    // tail (behind everything)
    const tr = body(-88, -28);
    ctx.save();
    ctx.translate(tr[0], tr[1]);
    ctx.rotate(-this.frame.pitch * 0.3);
    ctx.strokeStyle = c.mane;
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const sw = this.tailAng + k * 0.05 + 0.04 * noise1(this.time * 1.6 + k * 3);
      ctx.lineWidth = 7 - k * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const len = 88 + k * 4;
      ctx.bezierCurveTo(-18, 8, -Math.sin(sw) * len * 0.8 - 10, Math.cos(sw) * len * 0.45, -Math.sin(sw) * len * 0.7 - 6, Math.cos(sw) * len);
      ctx.stroke();
    }
    ctx.restore();

    drawLeg(1, false);
    drawLeg(3, false);

    // body
    const pts = [
      [88, 0], [85, -26], [58, -44], [18, -35], [-24, -39], [-66, -42], [-90, -28],
      [-96, -4], [-88, 20], [-70, 32], [-38, 34], [-6, 42], [38, 40], [64, 30], [82, 18],
    ].map(([x, y]) => body(x, y));
    ctx.beginPath();
    smoothPath(ctx, pts, true);
    ctx.fillStyle = c.coat;
    ctx.fill();

    // neck and head
    const nb1 = body(44, -40);
    const nb2 = body(88, -8);
    const na = this.neck + this.frame.pitch;
    const poll = [lerp(nb1[0], nb2[0], 0.35) + Math.cos(na) * 78, lerp(nb1[1], nb2[1], 0.35) + Math.sin(na) * 78];
    const perp = [-Math.sin(na), Math.cos(na)];
    ctx.beginPath();
    smoothPath(ctx, [
      nb1,
      [lerp(nb1[0], poll[0], 0.55) - perp[0] * 10, lerp(nb1[1], poll[1], 0.55) - perp[1] * 10],
      [poll[0] - perp[0] * 7, poll[1] - perp[1] * 7],
      [poll[0] + perp[0] * 16, poll[1] + perp[1] * 16],
      [lerp(nb2[0], poll[0], 0.5) + perp[0] * 12, lerp(nb2[1], poll[1], 0.5) + perp[1] * 12],
      nb2,
      body(40, -8),
    ], true);
    ctx.fill();

    // mane along the crest
    ctx.strokeStyle = c.mane;
    ctx.lineWidth = 3;
    for (let k = 0; k <= 9; k++) {
      const t = k / 9;
      const px = lerp(nb1[0] + 4, poll[0], t) - perp[0] * (8 - t * 2);
      const py = lerp(nb1[1] - 2, poll[1], t) - perp[1] * (8 - t * 2);
      const sway = 0.3 * noise1(this.time * 2 + k) + Math.min(Math.abs(this.speed) * 0.002, 0.5);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px - 6 - sway * 10, py + 6, px - 10 - sway * 16, py + 16);
      ctx.stroke();
    }

    const ha = na + this.head + 0.95;
    ctx.save();
    ctx.translate(poll[0], poll[1]);
    ctx.rotate(ha);
    ctx.beginPath();
    smoothPath(ctx, [[-2, -9], [22, -10], [48, -6], [62, -2], [65, 6], [60, 13], [46, 13], [22, 17], [2, 14]], true);
    ctx.fillStyle = c.coat;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(56, 6, 9, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.muzzle;
    ctx.fill();
    // ears
    const ep = this.ears;
    ctx.fillStyle = c.coat;
    ctx.beginPath();
    ctx.moveTo(1, -8);
    ctx.lineTo(-4 - ep * 16, -26 + ep * 14);
    ctx.lineTo(9, -10);
    ctx.fill();
    // forelock and eye
    ctx.strokeStyle = c.mane;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.quadraticCurveTo(10, -4, 14, 4);
    ctx.stroke();
    ctx.fillStyle = '#0c0b0a';
    ctx.beginPath();
    ctx.ellipse(21, -3, 3, 2.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    if (this.saddled) {
      // bridle
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, -9);
      ctx.lineTo(18, 16);
      ctx.moveTo(46, -6);
      ctx.lineTo(56, 12);
      ctx.moveTo(8, 4);
      ctx.lineTo(50, 2);
      ctx.stroke();
    }
    const bitL = [56, 11];
    ctx.restore();
    const bx = poll[0] + Math.cos(ha) * bitL[0] - Math.sin(ha) * bitL[1];
    const by = poll[1] + Math.sin(ha) * bitL[0] + Math.cos(ha) * bitL[1];
    this.bitWorld = this.toWorld(bx, by);

    if (this.saddled) {
      // blanket, saddle, cinch, horn
      const s = (x, y) => body(x, y);
      ctx.fillStyle = '#6a2a22';
      ctx.beginPath();
      smoothPath(ctx, [s(30, -38), s(-36, -40), s(-40, -8), s(28, -6)], true);
      ctx.fill();
      ctx.fillStyle = '#4a2c18';
      ctx.beginPath();
      smoothPath(ctx, [s(26, -40), s(16, -54), s(-6, -46), s(-26, -52), s(-32, -40), s(-30, -22), s(22, -20)], true);
      ctx.fill();
      ctx.strokeStyle = '#2e1b0e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(...s(4, -24));
      ctx.lineTo(...s(8, 40));
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...s(-4, -30));
      ctx.lineTo(...s(-2, 12));
      ctx.stroke();
      ctx.fillStyle = '#1c120a';
      ctx.fillRect(...s(-3, 10), 6, 7); // stirrup
      if (this.bags) {
        ctx.fillStyle = '#3c2616';
        ctx.beginPath();
        smoothPath(ctx, [s(-30, -38), s(-54, -36), s(-58, -8), s(-34, -6)], true);
        ctx.fill();
      }
      ctx.fillStyle = '#3a2412';
      ctx.beginPath();
      const hn = s(22, -52);
      ctx.arc(hn[0], hn[1], 4, 0, Math.PI * 2);
      ctx.fill();
    }

    drawLeg(0, true);
    drawLeg(2, true);
    ctx.restore();

    // reins, in world space
    if (this.saddled) {
      const [bxw, byw] = this.bitWorld;
      ctx.strokeStyle = '#1e140c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bxw, byw);
      if (this.reins) {
        const [rx, ry] = this.reins;
        ctx.quadraticCurveTo((bxw + rx) / 2, Math.max(byw, ry) + 14, rx, ry);
      } else {
        const w = this.toWorld(...body(30, -30));
        ctx.quadraticCurveTo((bxw + w[0]) / 2, Math.max(byw, w[1]) + 30, w[0], w[1]);
      }
      ctx.stroke();
    }
  }
}
