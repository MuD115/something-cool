// Staging helpers shared by the chapter's scenes: moving actors, seating
// riders, hoof sounds, and the recurring farm set.

import { clamp, lerp, smooth } from '../engine/util.js';
import { POSES, walkPose, blendPose } from '../rigs/person.js';
import * as S from '../sets/scenery.js';

// Drive a horse to a scripted x position, deriving its gait from the speed.
export function drive(horse, x, dt) {
  const v = dt > 0 ? (x - horse.x) / dt : 0;
  const sp = Math.abs(v);
  const g = sp < 6 ? 'stand' : sp < 120 ? 'walk' : sp < 280 ? 'trot' : 'gallop';
  if (horse.gait !== 'swim') horse.setGait(g);
  horse.speed = sp;
  horse.x = x;
  horse.update(dt, false);
}

// Seat a person on a horse, leaning with the gait.
export function seatRider(p, horse, { lean = 0, arms = null } = {}) {
  const s = horse.seat();
  p.grounded = false;
  p.f = horse.f;
  p.x = s.x;
  p.y = s.y + 2;
  const gallop = horse.gait === 'gallop';
  p.setPose({
    ...POSES.ride,
    torso: POSES.ride.torso + (gallop ? 0.32 : 0) - s.pitch * p.f * 0.8 + lean + (gallop ? 0.05 * Math.sin(horse.phase * Math.PI * 2) : 0),
    ...(arms || {}),
  });
}

// Walk a person from x0 to x1 between t0 and t1 (holding pose outside it).
export function walk(p, t, x0, x1, t0, t1, base = POSES.stand) {
  const k = clamp((t - t0) / (t1 - t0));
  p.grounded = true;
  p.x = lerp(x0, x1, k);
  if (x1 !== x0 && k > 0 && k < 1) {
    p.f = x1 > x0 ? 1 : -1;
    const stepIn = smooth(0, 0.08, k) * (1 - smooth(0.92, 1, k));
    p.setPose(blendPose(base, walkPose((Math.abs(p.x - x0) / 88) * Math.PI * 2 * 0.5), stepIn));
    return true;
  }
  return false;
}

// Blend between two poses over a time window.
export function poseAt(p, t, t0, t1, from, to) {
  p.setPose(blendPose(from, to, smooth(t0, t1, t)));
}

export function hooves(sound, horse, surface = 'dirt', vol = 0.35) {
  horse.onStep = () => sound.hoof(surface, vol);
}

// Draw an actor with its ground shadow.
export function actor(R, a, { shear = 0, squash = 0.14, groundY = 0, shadow = true } = {}) {
  R.cast((c) => a.draw(c));
  if (shadow) R.shadow((c) => a.draw(c), a.x, groundY, shear, squash);
}

// ---------------------------------------------------------------- farm -----

export const FARM = { houseX: 240, fenceX0: -760, fenceX1: 120, postX: -210 };

export const SKIES = {
  dusk: [[0, '#1c1a31'], [0.35, '#4d2f4c'], [0.6, '#b8623f'], [0.72, '#e39352']],
  night: [[0, '#05060c'], [0.4, '#0b1020'], [0.72, '#1a2236']],
  dawn: [[0, '#2c3150'], [0.35, '#6a5a78'], [0.6, '#d48a72'], [0.72, '#f2c089']],
  sunset: [[0, '#2a1d3a'], [0.3, '#6e3346'], [0.55, '#d0603c'], [0.7, '#f4a650']],
  golden: [[0, '#3c4a72'], [0.35, '#8c6a6a'], [0.6, '#e09a58'], [0.72, '#f8cc86']],
  storm: [[0, '#04050a'], [0.5, '#0a0d16'], [0.75, '#121826']],
};

// Blend two sky gradients (same stop positions).
export function mixSky(a, b, k) {
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return a.map(([p, ca], i) => {
    const A = hx(ca);
    const B = hx(b[Math.min(i, b.length - 1)][1]);
    const c = A.map((v, j) => Math.round(lerp(v, B[j], k)).toString(16).padStart(2, '0'));
    return [p, `#${c.join('')}`];
  });
}

// The Marrow farm: failing corn, a split-rail fence, the house.
export function farmSet(R, t, { sky = SKIES.dusk, lit = 1, stars = 0, handbill = false } = {}) {
  S.skyGradient(R, sky);
  S.stars(R, stars);
  S.clouds(R, { seed: 4, y: -430, color: 'rgba(40,24,40,0.45)', count: 7, t, drift: 3 });
  S.ridge(R, { depth: 0.18, base: -6, height: 150, freq: 0.003, seed: 2, color: '#3a2c40', haze: ['#7a4a5a', 0.18] });
  S.ridge(R, { depth: 0.45, base: 12, height: 70, freq: 0.006, seed: 9, rough: 0.3, color: '#2a1f26' });
  S.ground(R, 0, '#241a14', 1, '#2e2219');
  S.cornField(R, -1100, -260, -18, { t, color: '#5d4a2c' });
  const house = S.farmhouse(R, FARM.houseX, 0, { lit, t });
  S.fence(R, FARM.fenceX0, FARM.fenceX1, 6, { broken: [2] });
  if (handbill) {
    R.paint((c) => {
      c.save();
      c.translate(FARM.postX - 11, -64);
      c.rotate(0.06);
      c.fillStyle = '#c9bb96';
      c.fillRect(0, 0, 22, 28);
      c.fillStyle = '#3a2e22';
      for (let i = 0; i < 5; i++) c.fillRect(3, 4 + i * 5, 16 - (i % 2) * 5, 1.5);
      c.restore();
    });
  }
  S.grass(R, { y: 2, x0: -1600, x1: 1400, seed: 8, color: '#3a2b1a', t, density: 0.05 });
  return house;
}

