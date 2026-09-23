// Chapter One: "The Trunk".
//
// Each scene is data plus a small director's script: timed dialogue, title
// cards and sound cues, and a create() that stages the actors and returns
// update / camera / look / draw functions. Choices name the next scene.

import { key, smooth, clamp, lerp, noise1 } from '../engine/util.js';
import { Person, POSES, blendPose } from '../rigs/person.js';
import { Horse } from '../rigs/horse.js';
import * as S from '../sets/scenery.js';
import { drive, seatRider, walk, poseAt, hooves, actor, farmSet, FARM, SKIES, mixSky } from './staging.js';
import * as P from './props.js';

const ELI = 'Eli';
const TOBIAS = 'Tobias Quill';
const JUNE = 'June';
const ADA = 'Ada, remembered';

const P_STAND = POSES.stand;
const P_GRIEF = { ...POSES.stand, head: 0.4, torso: 0.08, armN: 0.3, foreN: 0.75, armF: 0.1, foreF: 0.4 };
const P_HATUP = { ...POSES.stand, head: 0.05, armN: 2.6, foreN: 3.1 };
const P_MOUNT = { torso: 0.12, head: -0.1, thighN: 1.45, shinN: 0.35, thighF: 0.02, shinF: 0.0, armN: 2.5, foreN: 2.8, armF: 2.3, foreF: 2.6 };
const P_CARRY = { armN: 0.4, foreN: 0.25 };
const P_BELT = { ...POSES.stand, armN: 0.25, foreN: 1.25 };
const P_PORCH = { ...POSES.stand, torso: -0.02, head: 0.05 };
const P_COUGH = { ...POSES.stand, torso: 0.38, head: 0.3, armN: 0.9, foreN: 2.0 };

const hand = (p, which = 'handN') => p.world(which);
const foreAng = (p) => -p.pose.foreN * p.f;

// Lightning: sum of quickly decaying flashes.
function flashAt(t, strikes) {
  let f = 0;
  for (const [ts, s] of strikes) {
    const d = t - ts;
    if (d >= 0 && d < 1.2) f += s * Math.exp(-d * 5) * (0.7 + 0.3 * Math.sin(d * 60));
  }
  return clamp(f, 0, 1.4);
}

const uvOf = (R, x, y, depth = 1) => R.cam.toUv(x, y, R.W, R.H, depth);

// ========================================================== 1. prologue ====

const prologue = {
  duration: 36,
  mood: 'elegy',
  ambience: { wind: 0.7, rain: 0, river: 0, fire: 0 },
  cards: [
    { t: 2, dur: 6.4, text: 'Ada Marrow married the most feared gun in the territory. Nobody in three counties could say why.' },
    { t: 9.3, dur: 6.4, text: 'She asked him for one thing. He locked the pistol in a cedar trunk, and for eleven years he kept it there.' },
    { t: 16.6, dur: 6.4, text: 'The fever took her in the winter of ’79. He buried her in the only suit he owned.' },
    { t: 23.9, dur: 5, text: 'He has not taken it off since.' },
    { t: 30.5, dur: 4.5, text: 'Chapter One · The Trunk' },
  ],
  cues: [{ t: 21, fn: ({ sound }) => sound.snort(0.35) }],
  next: 'farm',
  create({ R }) {
    const eli = new Person('suit');
    eli.x = -40;
    eli.hat = 'hand';
    eli.setPose(P_GRIEF);
    const dove = new Horse('dove');
    dove.x = -430;
    dove.neck = 0.55;
    dove.head = 0.05;
    let last = 0;
    return {
      update(t, dt) {
        if (t < 30.2) eli.setPose(P_GRIEF);
        else if (t < 31.4) poseAt(eli, t, 30.2, 31.2, P_GRIEF, P_HATUP);
        else poseAt(eli, t, 31.4, 32.6, P_HATUP, { ...P_STAND, head: -0.05 });
        eli.hat = t < 31.3 ? 'hand' : 'on';
        // Dove grazes, steps once, and lifts her head toward him.
        const up = smooth(19.5, 21.5, t) * (1 - smooth(25, 27.5, t));
        dove.neck = lerp(0.55, -0.75, up);
        dove.head = lerp(0.05, 1.0, up);
        drive(dove, key(t, [[9, -430], [11.5, -380]]), t - last || dt);
        last = t;
      },
      camera: (t) => ({
        x: key(t, [[0, -150], [36, -60]], 'sine'),
        y: key(t, [[0, -300], [36, -205]], 'sine'),
        view: key(t, [[0, 1900], [36, 1150]], 'sine'),
      }),
      look(t) {
        const sunUv = uvOf(R, 520, 70, 0.05);
        return {
          ambient: [0.22, 0.15, 0.22],
          lights: [{ uv: sunUv, color: [1.0, 0.6, 0.34], intensity: 1.35, radius: 0, rim: 1.3 }],
          god: { uv: sunUv, strength: 0.55 },
          groundShadow: 0.75,
          bloom: 0.7,
          exposure: 1.05,
        };
      },
      draw(R, t) {
        S.skyGradient(R, SKIES.sunset);
        S.sun(R, 520, 70, 34, 'rgba(255,226,170,1)');
        S.clouds(R, { seed: 2, y: -260, color: 'rgba(90,40,50,0.55)', count: 9, t, drift: 6 });
        S.ridge(R, { depth: 0.12, base: 20, height: 140, freq: 0.0025, seed: 5, color: '#4a2a3a', haze: ['#d0704a', 0.28] });
        S.ridge(R, { depth: 0.4, base: 40, height: 110, freq: 0.009, seed: 12, rough: 0.6, color: '#2a1a20', haze: ['#a04a3a', 0.1] });
        S.ground(R, 0, '#1c130f', 1, '#2a1c14');
        S.oak(R, 420, 2, { seed: 7, scale: 0.78, t });
        S.grave(R, 120, 0);
        const shear = 2.4;
        actor(R, dove, { shear, squash: 0.1 });
        actor(R, eli, { shear, squash: 0.1 });
        S.grass(R, { y: 3, x0: -1400, x1: 1200, seed: 3, color: '#2a1b12', t, density: 0.07, cast: true });
      },
    };
  },
};

// ============================================================ 2. farm =======

function farmActors() {
  const eli = new Person('suit');
  eli.x = -150;
  eli.f = -1;
  const june = new Person('dress', 0.62);
  june.x = 205;
  june.y = -8;
  june.f = -1;
  june.setPose(P_PORCH);
  const tob = new Person('vest');
  const ches = new Horse('chestnut');
  ches.saddled = true;
  ches.bags = true;
  ches.x = -1500;
  return { eli, june, tob, ches };
}

function farmLook(R, house, night = 0) {
  return {
    ambient: [lerp(0.17, 0.05, night), lerp(0.15, 0.06, night), lerp(0.26, 0.12, night)],
    lights: [
      { uv: [-0.08, 0.64], color: night ? [0.4, 0.5, 0.85] : [0.95, 0.55, 0.38], intensity: lerp(0.95, 0.35, night), radius: 0, rim: 1.0 },
      { x: house.window[0], y: house.window[1], color: [1.0, 0.64, 0.3], intensity: lerp(1.3, 1.8, night), radius: 0.2, rim: 0.7 },
    ],
    groundShadow: lerp(0.6, 0.3, night),
    bloom: 0.8,
  };
}

function drawFarm(R, t, a, opts = {}) {
  const house = farmSet(R, t, opts);
  const shear = -1.5;
  actor(R, a.ches, { shear });
  if (a.tob.visible !== false) R.cast((c) => a.tob.draw(c));
  if (a.june.visible !== false) actor(R, a.june, { shear, groundY: -8 });
  actor(R, a.eli, { shear });
  return house;
}

const farm = {
  duration: 34,
  mood: 'tension',
  ambience: { wind: 0.45 },
  lines: () => [
    { t: 6.5, who: JUNE, text: 'Pa. Rider coming.', dur: 3 },
    { t: 12.5, who: TOBIAS, text: 'You Eli Marrow? The Eli Marrow they tell about in Blackwater?', dur: 4.2 },
    { t: 17.2, who: ELI, text: 'I raise corn, son. Or I did, till the blight took it.', dur: 4 },
    { t: 21.6, who: TOBIAS, text: 'Two drovers carved up a laundress in Calvary Bend. The marshal fined ’em a pony apiece.', dur: 5 },
    { t: 27, who: TOBIAS, text: 'The women put up a thousand dollars for their hides. I need a man who’s done this before.', dur: 5.2 },
  ],
  cues: [{ t: 32, fn: ({ sound }) => sound.cough() }],
  choice: {
    at: 33.5,
    prompt: 'A thousand dollars. A girl with a cough that won’t quit.',
    options: [
      { label: 'Hear him out', next: 'farm-hear', cut: true, apply: (s) => (s.resolve = 'willing') },
      { label: 'Send him away', next: 'farm-refuse', cut: true, apply: (s) => (s.resolve = 'reluctant') },
    ],
  },
  create({ R, sound }) {
    const a = farmActors();
    hooves(sound, a.ches, 'dirt', 0.3);
    let house = { window: [400, -90] };
    let last = 0;
    let beat = -1;
    return {
      update(t, dt) {
        // Hammering at the fence until the rider appears.
        const ph = t * 1.3;
        const swing = t < 8 ? Math.max(0, Math.sin(ph * Math.PI * 2)) : 0;
        a.eli.setPose(blendPose({ ...P_STAND, torso: 0.12, head: 0.2, armN: 1.2 + swing * 1.2, foreN: 1.9 + swing * 1.0, armF: 0.9, foreF: 1.5 }, { ...P_STAND, head: -0.02 }, smooth(8, 9.2, t)));
        if (t < 7.8 && Math.floor(ph) !== beat) {
          beat = Math.floor(ph);
          if (beat > 0) sound.hammer();
        }
        drive(a.ches, key(t, [[3, -1500], [9, -560, 'out'], [11.5, -470, 'out']]), t - last || dt);
        last = t;
        seatRider(a.tob, a.ches, { lean: -0.04 });
        a.june.setPose(t > 31.5 && t < 33.5 ? blendPose(P_PORCH, P_COUGH, Math.sin(clamp((t - 31.5) / 2) * Math.PI)) : P_PORCH);
      },
      camera: (t) => ({ x: key(t, [[0, -170], [4, -170], [11, -330]]), y: -205, view: key(t, [[0, 1150], [11, 1420]]) }),
      look: () => farmLook(R, house),
      draw(R, t) {
        house = drawFarm(R, t, a);
        if (t < 8.3) R.paint((c) => P.hammer(c, ...hand(a.eli), foreAng(a.eli)));
      },
    };
  },
};

const farmHear = {
  duration: 20.5,
  ambience: { wind: 0.45 },
  lines: () => [
    { t: 0.6, who: ELI, text: 'I ain’t that man anymore. Ada took the meanness out of me.', dur: 4.4 },
    { t: 5.4, who: TOBIAS, text: 'Then be a rich man instead. I ride at first light, past the split rock.', dur: 5 },
    { t: 12.4, who: ELI, text: '…I’ll think on it.', dur: 3 },
  ],
  next: 'barn',
  create({ R, sound }) {
    const a = farmActors();
    a.ches.x = -470;
    hooves(sound, a.ches, 'dirt', 0.3);
    let house = { window: [400, -90] };
    let last = 0;
    return {
      update(t, dt) {
        // He looks back at June on the porch before he answers.
        const look = smooth(10.2, 11, t) * (1 - smooth(15, 16, t));
        a.eli.f = look > 0.5 ? 1 : -1;
        a.eli.setPose({ ...P_STAND, head: look > 0.5 ? 0.12 : -0.02 });
        a.ches.f = t > 14 ? -1 : 1;
        drive(a.ches, key(t, [[14, -470], [20.5, -1500, 'in']]), t - last || dt);
        last = t;
        seatRider(a.tob, a.ches);
      },
      camera: (t) => ({ x: key(t, [[0, -330], [11, -150], [16, -150], [20, -330]]), y: -205, view: key(t, [[0, 1420], [11, 1250], [20, 1420]]) }),
      look: () => farmLook(R, house),
      draw(R, t) {
        house = drawFarm(R, t, a);
      },
    };
  },
};

const farmRefuse = {
  duration: 28,
  ambience: { wind: 0.4 },
  lines: () => [
    { t: 0.6, who: ELI, text: 'Ride on. There’s nothing here for you.', dur: 3.4 },
    { t: 4.2, who: TOBIAS, text: 'Suit yourself. Split rock, first light, if you change your mind.', dur: 4.4 },
  ],
  cards: [
    { t: 15.5, dur: 4.2, text: 'That night, June’s cough got worse.' },
    { t: 22.6, dur: 5, text: 'REWARD — $1,000 — for the two drovers who cut Maggie Lowe. Inquire at Calvary Bend.' },
  ],
  cues: [
    { t: 16, fn: ({ sound }) => sound.cough() },
    { t: 18.5, fn: ({ sound }) => sound.cough() },
    { t: 12, fn: ({ sound }) => sound.setMood('elegy') },
  ],
  next: 'barn',
  create({ R, sound }) {
    const a = farmActors();
    a.ches.x = -470;
    hooves(sound, a.ches, 'dirt', 0.3);
    let house = { window: [400, -90] };
    let last = 0;
    let bill = false;
    return {
      night: 0,
      update(t, dt) {
        this.night = smooth(11, 15.5, t);
        // Tobias pins a handbill to the fence post, then leaves.
        a.ches.f = t > 9.6 ? -1 : 1;
        drive(a.ches, key(t, [[6, -470], [8, -330], [9.6, -330], [15, -1500, 'in']]), t - last || dt);
        last = t;
        const lean = smooth(8, 8.6, t) * (1 - smooth(9, 9.6, t));
        seatRider(a.tob, a.ches, { lean: lean * 0.5, arms: lean > 0.1 ? { armN: 1.2, foreN: 1.1 } : null });
        if (t > 8.8 && t < 21.5) bill = true;
        if (t >= 21.5) bill = false;
        // June goes in; Eli goes to the post and reads the bill.
        walk(a.june, t, 205, 284, 12, 13.6, P_PORCH);
        a.june.visible = t < 13.7;
        if (!walk(a.eli, t, -150, -180, 19, 20.5)) {
          const reach = smooth(20.6, 21.3, t) * (1 - smooth(21.6, 22.2, t));
          a.eli.setPose(t > 22 ? { ...P_STAND, head: 0.35, armN: 0.7, foreN: 1.5, armF: 0.6, foreF: 1.4 } : blendPose(P_STAND, { ...POSES.reach, torso: 0.1 }, reach));
        }
        if (t < 19) a.eli.f = -1;
        this.bill = bill;
      },
      camera: (t) => ({ x: key(t, [[0, -330], [12, -200], [22, -150]]), y: -205, view: key(t, [[0, 1420], [22, 1000]]) }),
      look() {
        return farmLook(R, house, this.night);
      },
      draw(R, t) {
        house = drawFarm(R, t, a, { sky: mixSky(SKIES.dusk, SKIES.night, this.night), stars: this.night, handbill: this.bill });
        if (t > 22) R.paint((c) => P.paper(c, ...hand(a.eli), 0.2));
      },
    };
  },
};

// ============================================================= 3. barn ======

function barnActors() {
  const eli = new Person('suit');
  const dove = new Horse('dove');
  dove.x = 230;
  dove.f = -1;
  const june = new Person('dress', 0.62);
  june.x = -830;
  june.visible = false;
  return { eli, dove, june };
}

function barnLook(R, lamp, moon = 0.45, extra = []) {
  return {
    ambient: [0.035, 0.034, 0.05],
    lights: [
      { x: lamp.x, y: lamp.y, color: [1.0, 0.64, 0.33], intensity: 2.7 * lamp.fl, radius: 0.5, project: 1.85, soft: 0.003, rim: 0.55 },
      { x: 685, y: -565, color: [0.35, 0.45, 0.75], intensity: moon, radius: 0.9, project: 1.3, soft: 0.006, rim: 0.6 },
      ...extra,
    ],
    bloom: 0.9,
    groundShadow: 0,
    exposure: 1.1,
  };
}

function drawBarn(R, t, a, lamp, { bundle = null, doorway = true } = {}) {
  S.barnInterior(R, { t });
  if (doorway) {
    // the open door: moonlit yard beyond, framed by dark jambs
    R.glow((c) => {
      const g = c.createLinearGradient(0, -330, 0, 0);
      g.addColorStop(0, 'rgba(30,40,70,0.7)');
      g.addColorStop(0.7, 'rgba(60,78,120,0.8)');
      g.addColorStop(1, 'rgba(40,50,70,0.8)');
      c.fillStyle = g;
      c.fillRect(-940, -330, 150, 330);
    });
    R.paint((c) => {
      c.fillStyle = '#1c130c';
      c.fillRect(-952, -342, 12, 342);
      c.fillRect(-790, -342, 12, 342);
      c.fillRect(-952, -350, 174, 16);
    });
  }
  S.trunk(R, -120, 0, { open: a.lid || 0 });
  R.cast((c) => a.dove.draw(c));
  S.barnStall(R);
  if (a.june.visible) R.cast((c) => a.june.draw(c));
  R.cast((c) => a.eli.draw(c));
  if (bundle) R.cast((c) => P.bundle(c, bundle.x, bundle.y, bundle.open));
  lamp.fl = S.lantern(R, lamp.x, lamp.y, { lit: lamp.lit, t });
}

const barn = {
  duration: 29,
  mood: 'tension',
  ambience: { wind: 0.25, fire: 1 },
  lines: () => [
    { t: 16.6, who: ADA, text: 'Whatever comes, Eli, you leave it be.', dur: 5, style: 'memory' },
    { t: 22.4, who: ELI, text: 'You said you’d stay, too.', dur: 4 },
  ],
  cues: [
    { t: 12, fn: ({ sound }) => sound.creak() },
    { t: 25.5, fn: ({ sound }) => sound.snort(0.3) },
  ],
  choice: {
    at: 28.5,
    prompt: 'Her shawl. His pistol, wrapped inside it.',
    options: [
      { label: 'Take the gun', next: 'barn-take', cut: true, apply: (s) => (s.armed = true) },
      { label: 'Leave it in the trunk', next: 'barn-leave', cut: true, apply: (s) => ((s.armed = false), (s.junePacked = true)) },
    ],
  },
  create({ R, sound }) {
    const a = barnActors();
    const lamp = { x: -900, y: -120, lit: 1, fl: 1 };
    hooves(sound, a.dove, 'wood', 0.25);
    let last = 0;
    return {
      update(t, dt) {
        const e = a.eli;
        if (walk(e, t, -900, -380, 0, 6)) e.setPose(P_CARRY);
        else if (t < 8) {
          e.f = 1;
          const up = smooth(6, 7, t) * (1 - smooth(7.4, 8, t));
          e.setPose(blendPose({ ...P_STAND, ...P_CARRY }, { ...POSES.reach, armN: 2.7, foreN: 2.9, torso: -0.05 }, up));
        } else if (walk(e, t, -380, -205, 8, 10)) {
          /* walking to the trunk */
        } else {
          e.f = 1;
          const kneel = smooth(10, 11.2, t);
          const lift = smooth(14.5, 16, t);
          e.setPose(blendPose(blendPose(P_STAND, POSES.kneel, kneel), { ...POSES.kneel, armN: 0.9, foreN: 1.6, armF: 0.8, foreF: 1.5, head: 0.35 }, lift));
        }
        // Lantern: in his hand, then on the hook.
        if (t < 7.2) {
          const [hx, hy] = hand(e);
          lamp.x = hx;
          lamp.y = hy + 20;
        } else {
          lamp.x = -330;
          lamp.y = -262;
        }
        a.lid = smooth(12, 13.6, t);
        a.bundle = t > 15 ? { x: hand(e)[0] + 4, y: hand(e)[1] - 2, open: 0 } : t > 14 ? { x: -120, y: -60, open: 0 } : null;
        // Dove shifts in the stall; ears flick toward the trunk.
        drive(a.dove, key(t, [[20, 230], [21.5, 250], [26, 250], [27, 220]]), t - last || dt);
        last = t;
        a.dove.neck = -0.8 + 0.12 * noise1(t * 0.4);
        a.dove.ears = smooth(15, 16, t) * 0.6;
      },
      camera: (t) => ({ x: key(t, [[0, -520], [10, -220], [29, -140]]), y: key(t, [[0, -270], [29, -225]]), view: key(t, [[0, 1350], [29, 1020]]) }),
      look: () => barnLook(R, lamp),
      draw(R, t) {
        drawBarn(R, t, a, lamp, { bundle: a.bundle });
      },
    };
  },
};

const barnTake = {
  duration: 13.5,
  ambience: { wind: 0.25, fire: 1 },
  cues: [
    { t: 2.4, fn: ({ sound }) => sound.click() },
    { t: 6, fn: ({ sound }) => sound.snort(0.5) },
    { t: 11, fn: ({ sound }) => sound.ambience({ fire: 0 }) },
  ],
  next: 'dawn',
  create({ R, sound }) {
    const a = barnActors();
    a.lid = 1;
    const lamp = { x: -330, y: -262, lit: 1, fl: 1 };
    hooves(sound, a.dove, 'wood', 0.3);
    let last = 0;
    const kneelHold = { ...POSES.kneel, armN: 0.9, foreN: 1.6, armF: 0.8, foreF: 1.5, head: 0.35 };
    return {
      update(t, dt) {
        const e = a.eli;
        e.x = -205;
        e.f = 1;
        if (t < 3) e.setPose(kneelHold);
        else if (t < 5) poseAt(e, t, 3, 4.6, kneelHold, P_BELT);
        else if (t < 7.2) e.setPose(P_BELT);
        else if (walk(e, t, -205, -345, 7.2, 8.6)) {
          /* to the lantern */
        } else {
          e.f = 1;
          const up = smooth(8.8, 9.6, t) * (1 - smooth(10.8, 11.4, t));
          e.setPose(blendPose(P_STAND, { ...POSES.reach, armN: 2.7, foreN: 2.9, torso: -0.05 }, up));
        }
        a.bundle = t < 4.6 ? { x: hand(e)[0] + 4, y: hand(e)[1] - 2, open: smooth(0.3, 2, t) } : null;
        a.glint = t > 2.2 && t < 3.2 ? Math.sin(((t - 2.2) / 1) * Math.PI) : 0;
        lamp.lit = 1 - smooth(10.8, 11.6, t);
        // Dove backs away from what he's holding, ears pinned.
        drive(a.dove, key(t, [[5.4, 230], [6.8, 300]]), t - last || dt);
        last = t;
        a.dove.ears = smooth(5, 6, t);
        a.dove.neck = key(t, [[5, -0.8], [6, -1.15], [9, -0.85]]);
      },
      camera: (t) => ({ x: key(t, [[0, -150], [13, -210]]), y: -225, view: key(t, [[0, 1000], [4, 860], [13, 1150]]) }),
      look() {
        return barnLook(R, lamp, 0.45);
      },
      draw(R, t) {
        drawBarn(R, t, a, lamp, { bundle: a.bundle });
        if (a.glint > 0) {
          const [hx, hy] = hand(a.eli);
          R.glow((c) => {
            c.fillStyle = `rgba(255,240,210,${a.glint})`;
            c.beginPath();
            c.ellipse(hx + 10, hy - 6, 14 * a.glint, 1.6, 0, 0, Math.PI * 2);
            c.ellipse(hx + 10, hy - 6, 1.6, 10 * a.glint, 0, 0, Math.PI * 2);
            c.fill();
          });
        }
        if (t >= 4.6 && t < 7.2) R.cast((c) => P.pistol(c, ...hand(a.eli), 0.4));
      },
    };
  },
};

const barnLeave = {
  duration: 15.5,
  ambience: { wind: 0.25, fire: 1 },
  lines: () => [{ t: 6.2, who: ELI, text: 'All right, Ada. All right.', dur: 3.4 }],
  cues: [
    { t: 3.4, fn: ({ sound }) => sound.creak() },
    { t: 4.4, fn: ({ sound }) => sound.fall() },
  ],
  next: 'dawn',
  create({ R }) {
    const a = barnActors();
    a.lid = 1;
    const lamp = { x: -330, y: -262, lit: 1, fl: 1 };
    const kneelHold = { ...POSES.kneel, armN: 0.9, foreN: 1.6, armF: 0.8, foreF: 1.5, head: 0.35 };
    return {
      update(t) {
        const e = a.eli;
        if (t < 5) {
          e.x = -205;
          e.f = 1;
          const down = smooth(1.6, 2.8, t);
          e.setPose(blendPose(kneelHold, POSES.kneel, down));
        } else if (t < 7) {
          poseAt(e, t, 5, 6.5, POSES.kneel, P_STAND);
        } else if (walk(e, t, -205, -345, 7.4, 8.6)) {
          /* to the lantern */
        } else if (t < 10) {
          e.f = 1;
          const up = smooth(8.8, 9.4, t) * (1 - smooth(9.6, 10, t));
          e.setPose(blendPose(P_STAND, { ...POSES.reach, armN: 2.7, foreN: 2.9 }, up));
        } else if (walk(e, t, -345, 1100, 10, 15.5)) e.setPose(P_CARRY);
        a.bundle = t < 2.8 ? { x: lerp(hand(e)[0] + 4, -120, smooth(1.6, 2.8, t)), y: lerp(hand(e)[1] - 2, -60, smooth(1.6, 2.8, t)), open: 0 } : null;
        a.lid = 1 - smooth(3.4, 4.4, t);
        if (t > 9.6) {
          const [hx, hy] = hand(e);
          lamp.x = hx;
          lamp.y = hy + 20;
        }
        // June has been watching from the doorway.
        a.june.visible = t > 11.5;
        walk(a.june, t, -840, -700, 13.2, 15.2);
        if (t < 13.2) a.june.f = 1;
      },
      camera: (t) => ({ x: key(t, [[0, -150], [10, -250], [15.5, -560]]), y: -225, view: key(t, [[0, 1000], [15.5, 1250]]) }),
      look(t) {
        // Moonlight through the open door rims June's silhouette.
        const door = { x: -865, y: -170, color: [0.45, 0.55, 0.85], intensity: 0.9 * smooth(10, 13, t), radius: 0.35, rim: 1.6 };
        return barnLook(R, lamp, 0.45 + smooth(10, 14, t) * 0.25, [door]);
      },
      draw(R, t) {
        drawBarn(R, t, a, lamp, { bundle: a.bundle });
      },
    };
  },
};

// ============================================================ 4. dawn =======

function dawnActors() {
  const eli = new Person('suit');
  const dove = new Horse('dove');
  dove.saddled = true;
  dove.bags = true;
  dove.x = -60;
  dove.f = -1;
  const june = new Person('dress', 0.62);
  june.x = 205;
  june.y = -8;
  june.f = -1;
  june.setPose(P_PORCH);
  return { eli, dove, june };
}

function dawnLook(R, house) {
  return {
    ambient: [0.25, 0.24, 0.33],
    lights: [
      { uv: [-0.06, 0.66], color: [1.0, 0.7, 0.52], intensity: 1.05, radius: 0, rim: 1.1 },
      { x: house.window[0], y: house.window[1], color: [1.0, 0.64, 0.3], intensity: 0.5, radius: 0.18, rim: 0.3 },
    ],
    groundShadow: 0.6,
    bloom: 0.7,
  };
}

function drawDawn(R, t, a, extra) {
  const house = farmSet(R, t, { sky: SKIES.dawn, lit: 0.35 });
  // hitching post
  R.cast((c) => {
    c.fillStyle = '#3b2d20';
    c.fillRect(-262, -100, 9, 102);
    c.fillRect(-275, -104, 36, 7);
  });
  const shear = -1.6;
  actor(R, a.june, { shear, groundY: -8 });
  actor(R, a.dove, { shear });
  actor(R, a.eli, { shear });
  if (a.hatX !== undefined) R.cast((c) => P.hatOnGround(c, a.hatX, 4));
  extra?.(R);
  // morning mist hanging over the ground
  R.layer(0.8);
  R.glow((c) => {
    const g = c.createLinearGradient(0, -120, 0, 40);
    g.addColorStop(0, 'rgba(210,200,220,0)');
    g.addColorStop(0.7, 'rgba(210,200,220,0.13)');
    g.addColorStop(1, 'rgba(210,200,220,0.05)');
    c.fillStyle = g;
    c.fillRect(-3000, -120, 6000, 160);
  });
  R.layer(1);
  return house;
}

const dawn = {
  duration: 28,
  mood: 'tension',
  ambience: { wind: 0.3 },
  lines: () => [
    { t: 18.6, who: JUNE, text: 'She never let anybody up easy but Ma.', dur: 4 },
    { t: 23, who: ELI, text: 'I know it, June. I know it.', dur: 3.6 },
  ],
  cues: [
    { t: 8.6, fn: ({ sound }) => sound.snort(0.5) },
    { t: 9.4, fn: ({ sound }) => sound.fall() },
    { t: 15.4, fn: ({ sound }) => sound.neigh(0.3) },
    { t: 16.5, fn: ({ sound }) => sound.fall() },
  ],
  choice: {
    at: 27.5,
    prompt: 'Dove won’t have him.',
    options: [
      { label: 'Speak to her softly', next: 'mount-soft', cut: true, apply: (s) => (s.trust = 'high') },
      { label: 'Force her', next: 'mount-force', cut: true, apply: (s) => (s.trust = 'low') },
    ],
  },
  create({ R, sound }) {
    const a = dawnActors();
    hooves(sound, a.dove, 'mud', 0.35);
    let house = { window: [420, -90] };
    let last = 0;
    return {
      update(t, dt) {
        const e = a.eli;
        const d = a.dove;
        drive(d, key(t, [[8.5, -60], [9.7, -150, 'out'], [15.3, -150], [16.6, -70, 'out']]), t - last || dt);
        last = t;
        d.rear = key(t, [[15.2, 0], [15.7, 0.45, 'out'], [17.4, 0]]);
        d.ears = smooth(7.5, 8.2, t) * (1 - smooth(20, 22, t));
        e.hat = (t > 9.1 && t < 12.2) || t > 16.2 ? 'off' : 'on';
        a.hatX = (t > 9.1 && t < 12.2) ? e.x + 34 : t > 16.2 ? -205 : undefined;

        if (walk(e, t, 290, -10, 0, 6)) return;
        if (t < 8.6) {
          e.f = -1;
          poseAt(e, t, 6.6, 8, P_STAND, P_MOUNT);
        } else if (t < 10.4) {
          e.f = -1;
          e.x = lerp(-10, 20, smooth(8.6, 9.4, t));
          poseAt(e, t, 8.6, 9.4, P_MOUNT, POSES.sit);
        } else if (t < 12.6) {
          poseAt(e, t, 10.6, 12.4, POSES.sit, P_STAND);
        } else if (walk(e, t, 20, -100, 12.6, 14)) {
          /* back to the stirrup */
        } else if (t < 15.4) {
          e.f = -1;
          poseAt(e, t, 14, 15.2, P_STAND, P_MOUNT);
        } else {
          e.f = -1;
          e.x = lerp(-100, -150, smooth(15.4, 16.4, t));
          poseAt(e, t, 15.4, 16.4, P_MOUNT, POSES.sit);
          if (t > 22.5) e.setPose({ ...POSES.sit, head: 0.4, torso: 0.1 });
        }
      },
      camera: (t) => ({ x: key(t, [[0, 60], [7, -40], [28, -60]]), y: -210, view: key(t, [[0, 1250], [28, 1080]]) }),
      look: () => dawnLook(R, house),
      draw(R, t) {
        house = drawDawn(R, t, a);
      },
    };
  },
};

// Standing hip → saddle, as one continuous mount.
function mountOnto(e, d, t, t0, t1) {
  const k = smooth(t0, t1, t);
  const s = d.seat();
  e.grounded = true;
  const [sx, sy] = e.hip();
  e.grounded = false;
  e.f = d.f;
  e.x = lerp(sx, s.x, k);
  e.y = lerp(sy, s.y + 2, k) - Math.sin(k * Math.PI) * 30;
  e.setPose(blendPose(P_MOUNT, POSES.ride, smooth(t0 + (t1 - t0) * 0.4, t1, t)));
}

const mountSoft = {
  duration: 21,
  mood: 'elegy',
  lines: () => [
    { t: 5.6, who: ELI, text: 'I know I ain’t her. I know what I was.', dur: 4.4 },
    { t: 10.4, who: ELI, text: 'Carry me to Calvary Bend and back. I won’t ask you twice.', dur: 5 },
  ],
  cues: [{ t: 7, fn: ({ sound }) => sound.snort(0.25) }],
  next: 'ride',
  create({ R, sound }) {
    const a = dawnActors();
    a.dove.x = -70;
    hooves(sound, a.dove, 'mud', 0.35);
    let house = { window: [420, -90] };
    let last = 0;
    return {
      update(t, dt) {
        const e = a.eli;
        const d = a.dove;
        const tenderness = smooth(5, 7.5, t) * (1 - smooth(14.5, 15.5, t));
        d.neck = lerp(-0.85, 0.05, tenderness);
        d.head = lerp(1.05, 0.7, tenderness);
        d.ears = 0;
        e.hat = t < 2.4 ? 'off' : 'on';
        a.hatX = t < 2.4 ? -205 : undefined;
        if (t < 2.5) {
          e.x = -150;
          e.f = -1;
          poseAt(e, t, 0.2, 2.4, POSES.sit, P_STAND);
        } else if (walk(e, t, -150, -270, 2.5, 4.3)) {
          /* to her head */
        } else if (t < 15) {
          e.f = 1;
          e.setPose(blendPose(P_STAND, { ...POSES.hands, armN: 1.2, foreN: 1.7, head: 0.1 }, tenderness));
        } else if (walk(e, t, -270, -30, 15, 16.4)) {
          /* round to the stirrup */
        } else if (t < 18.3) {
          e.f = -1;
          mountOnto(e, d, t, 16.5, 18.2);
        }
        drive(d, key(t, [[18.4, -70], [21, -330, 'in']]), t - last || dt);
        last = t;
        if (t >= 18.3) seatRider(e, d);
        a.june.setPose(t > 18.2 ? blendPose(P_PORCH, { ...P_PORCH, armN: 2.8, foreN: 3.0 }, smooth(18.2, 19, t)) : P_PORCH);
      },
      camera: (t) => ({ x: key(t, [[0, -120], [14, -180], [21, -200]]), y: -215, view: key(t, [[0, 1080], [8, 900], [15, 900], [21, 1200]]) }),
      look: () => dawnLook(R, house),
      draw(R, t) {
        house = drawDawn(R, t, a);
      },
    };
  },
};

const mountForce = {
  duration: 18.5,
  mood: 'tension',
  lines: () => [
    { t: 4.6, who: JUNE, text: 'Pa!', dur: 2 },
    { t: 13.4, who: ELI, text: 'Git.', dur: 2 },
  ],
  cues: [
    { t: 3.8, fn: ({ sound }) => sound.snort(0.6) },
    { t: 4.2, fn: ({ sound }) => sound.neigh(0.35) },
    { t: 10.5, fn: ({ sound }) => sound.neigh(0.25) },
  ],
  next: 'ride',
  create({ R, sound }) {
    const a = dawnActors();
    a.dove.x = -70;
    hooves(sound, a.dove, 'mud', 0.4);
    let house = { window: [420, -90] };
    let last = 0;
    return {
      update(t, dt) {
        const e = a.eli;
        const d = a.dove;
        d.ears = smooth(3.4, 3.9, t);
        d.neck = key(t, [[3.5, -0.85], [3.9, -1.3], [7, -1.0], [14, -0.9]]);
        d.rear = key(t, [[3.9, 0], [4.8, 0.78, 'out'], [6.4, 0.2], [6.9, 0]]);
        d.buck = t > 10 && t < 13.5 ? 0.55 * Math.sin((t - 10) * 8) * (1 - smooth(12.5, 13.5, t)) : 0;
        d.lift = t > 10 && t < 13.5 ? Math.abs(Math.sin((t - 10) * 8)) * 14 * (1 - smooth(12.5, 13.5, t)) : 0;
        e.hat = t < 2.2 ? 'off' : 'on';
        a.hatX = t < 2.2 ? -205 : undefined;
        if (t < 2.2) {
          e.x = -150;
          e.f = -1;
          poseAt(e, t, 0.1, 2, POSES.sit, P_STAND);
        } else if (walk(e, t, -150, -250, 2.2, 3.3)) {
          /* grabs for the reins */
        } else if (t < 7) {
          e.f = 1;
          const yank = smooth(3.4, 3.8, t) * (1 - smooth(4.4, 5, t));
          e.x = lerp(-250, -290, smooth(4.2, 5, t));
          e.setPose(blendPose({ ...POSES.reach, armN: 1.5, foreN: 1.6 }, { ...P_STAND, torso: -0.2, armN: 0.9, foreN: 0.6 }, yank));
          d.reins = t < 5 ? hand(e) : null;
        } else if (walk(e, t, -290, -30, 7, 8.6)) {
          d.reins = null;
        } else if (t < 10) {
          mountOnto(e, d, t, 8.6, 10);
        }
        drive(d, key(t, [[14.5, -70], [18.5, -800, 'in']]), t - last || dt);
        last = t;
        if (t >= 10) seatRider(e, d, { lean: t < 13.5 ? -0.25 * Math.sin((t - 10) * 8) : 0.05 });
      },
      camera: (t) => ({
        x: key(t, [[0, -120], [6, -170], [18, -300]]),
        y: -215,
        view: key(t, [[0, 1080], [18.5, 1250]]),
        shake: t > 4 && t < 6 ? 0.35 : t > 10 && t < 13 ? 0.25 : 0,
      }),
      look: () => dawnLook(R, house),
      draw(R, t) {
        house = drawDawn(R, t, a);
      },
    };
  },
};

// ============================================================= 5. ride ======

const ride = {
  duration: 21,
  mood: 'ride',
  ambience: { wind: 0.8 },
  lines: (s) => [
    { t: 8.6, who: TOBIAS, text: 'Knew you’d come! Knew it!', dur: 3 },
    { t: 12.2, who: ELI, text: 'Save your breath for the ride.', dur: 3.4 },
    s.trust === 'low'
      ? { t: 16.2, who: TOBIAS, text: 'That mare hates you, old man.', dur: 3.6 }
      : { t: 16.2, who: TOBIAS, text: 'She runs like she’s glad of you.', dur: 3.6 },
  ],
  next: 'river',
  create({ R, sound, state }) {
    const eli = new Person('suit');
    const tob = new Person('vest');
    const dove = new Horse('dove');
    const ches = new Horse('chestnut');
    for (const h of [dove, ches]) {
      h.saddled = true;
      h.bags = true;
      h.f = -1;
    }
    hooves(sound, dove, 'dirt', 0.22);
    hooves(sound, ches, 'dirt', 0.14);
    const low = state.trust === 'low';
    const SPEED = 520;
    let last = 0;
    return {
      update(t, dt) {
        drive(dove, -SPEED * t, t - last || dt);
        drive(ches, dove.x + key(t, [[0, 900], [6, 900], [10.5, 230, 'out'], [21, 200]]) + 20 * Math.sin(t * 0.7), t - last || dt);
        last = t;
        // A mare with no trust in her rider fights the bit.
        dove.neck = -0.75 + (low ? 0.18 * Math.sin(t * 3.1) : 0.03 * Math.sin(t * 2));
        dove.ears = low ? 0.6 : 0;
        seatRider(eli, dove);
        seatRider(tob, ches);
      },
      camera: (t) => ({ x: -SPEED * t - 140 + 60 * Math.sin(t * 0.3), y: -200, view: key(t, [[0, 1500], [21, 1300]]) }),
      look() {
        const sunUv = uvOf(R, 640, 30, 0.05);
        return {
          ambient: [0.3, 0.23, 0.26],
          lights: [{ uv: [1.08, 0.6], color: [1.0, 0.66, 0.42], intensity: 1.25, radius: 0, rim: 1.5 }],
          god: { uv: sunUv, strength: 0.35 },
          groundShadow: 0.7,
          bloom: 0.8,
        };
      },
      draw(R, t) {
        S.skyGradient(R, SKIES.golden);
        S.sun(R, 640, 30, 30, 'rgba(255,230,180,1)');
        S.clouds(R, { seed: 9, y: -300, color: 'rgba(120,70,70,0.4)', count: 10, t, drift: 10 });
        S.ridge(R, { depth: 0.12, base: 10, height: 150, freq: 0.004, seed: 31, color: '#6a3f3a', mesa: true, haze: ['#e09a68', 0.3] });
        S.ridge(R, { depth: 0.35, base: 30, height: 80, freq: 0.006, seed: 17, rough: 0.4, color: '#40262a', haze: ['#c07050', 0.12] });
        R.layer(0.6);
        S.splitRock(R, -2650, 40, 1.1);
        R.layer(1);
        S.ground(R, 0, '#3a2518', 1, '#4a3020');
        const shear = 2.2;
        actor(R, ches, { shear });
        R.cast((c) => tob.draw(c));
        actor(R, dove, { shear });
        R.cast((c) => eli.draw(c));
        // Grass in fixed 1000-unit tiles so each tuft keeps its place as we pass.
        for (let k = Math.floor((dove.x - 1500) / 1000); k <= Math.floor((dove.x + 1500) / 1000); k++) {
          S.grass(R, { y: 3, x0: k * 1000, x1: (k + 1) * 1000, seed: (k & 1023) + 2000, color: '#2e1d12', t, density: 0.04, cast: true });
        }
        S.foreground(R, { depth: 1.7, y: 90, seed: 23, color: '#120c09', count: 70, spread: 44000 });
      },
    };
  },
};

// ============================================================ 6. river ======

const WATER = 0;
const BED = 72;
const BANK_L = -640;
const BANK_R = 620;

function riverActors() {
  const eli = new Person('suit');
  const tob = new Person('vest');
  const dove = new Horse('dove');
  const ches = new Horse('chestnut');
  dove.saddled = ches.saddled = true;
  dove.bags = ches.bags = true;
  dove.f = -1;
  dove.y = BED;
  ches.x = -1120;
  ches.y = -40;
  ches.f = 1;
  return { eli, tob, dove, ches };
}

// Ground height along the river crossing: banks either side, bed between.
const bedAt = (x) => (x < BANK_L ? lerp(BED, -40, smooth(BANK_L, BANK_L - 130, x)) : x > BANK_R ? lerp(BED, -40, smooth(BANK_R, BANK_R + 130, x)) : BED);

function drawRiver(R, t, a, flash, strikeX, extra) {
  S.skyGradient(R, SKIES.storm);
  S.clouds(R, { seed: 13, y: -380, color: `rgba(${20 + flash * 90},${24 + flash * 100},${38 + flash * 130},0.9)`, count: 14, t, drift: 18 });
  S.ridge(R, { depth: 0.25, base: -20, height: 110, freq: 0.004, seed: 44, color: '#0b0d12' });
  // banks
  R.paint((c) => {
    c.fillStyle = '#15120f';
    c.beginPath();
    c.moveTo(-3000, 400);
    c.lineTo(-3000, -40);
    c.lineTo(BANK_L - 130, -40);
    c.quadraticCurveTo(BANK_L - 40, -38, BANK_L, 20);
    c.lineTo(BANK_R, 20);
    c.quadraticCurveTo(BANK_R + 40, -38, BANK_R + 130, -40);
    c.lineTo(3000, -40);
    c.lineTo(3000, 400);
    c.fill();
  });
  S.oak(R, -1420, -38, { seed: 19, scale: 0.9, t: t * 2, bare: true, barkColor: '#141210' });
  S.lightningBolt(R, strikeX * 0.4, -40 * 0.4, 7, flash);
  R.cast((c) => a.ches.draw(c));
  R.cast((c) => a.tob.draw(c));
  R.cast((c) => a.dove.draw(c));
  if (a.eli.visible !== false) R.cast((c) => a.eli.draw(c));
  extra?.(R);
  S.river(R, WATER, t, { flash, x0: BANK_L - 40, x1: BANK_R + 40, rush: 1.4 });
  if (a.dove.y > 20) S.foam(R, a.dove.x, WATER, 170, t, 1);
  if (a.eli.inWater) S.foam(R, a.eli.x, WATER, 60, t, 1.2);
  S.rain(R, t, 1, 0.3);
}

function riverLook(flash, R, strikeX) {
  return {
    ambient: [0.035, 0.045, 0.08],
    flash: [0.45 * flash, 0.55 * flash, 0.85 * flash],
    lights: [
      { x: strikeX, y: -200, color: [0.7, 0.8, 1.0], intensity: 2.5 * flash, radius: 0.6, rim: 1.6 },
      { uv: [0.5, -0.4], color: [0.3, 0.38, 0.6], intensity: 0.28, radius: 0, rim: 0.7 },
    ],
    groundShadow: 0,
    bloom: 1.0,
    grain: 0.07,
  };
}

const RIVER_STRIKES = [[2.2, 0.35], [7.6, 1.2], [7.8, 0.6], [11.6, 0.45]];

const riverScene = {
  duration: 13.3,
  mood: 'storm',
  ambience: { wind: 0.8, rain: 1, river: 1, fire: 0 },
  lines: () => [{ t: 3, who: TOBIAS, text: 'Keep her head up! Current’s fast!', dur: 3.4, style: 'shout' }],
  cues: [
    { t: 2.2, fn: ({ sound }) => sound.thunder(0.5, 1.3) },
    { t: 7.6, fn: ({ sound }) => sound.thunder(1.2, 0) },
    { t: 7.9, fn: ({ sound }) => sound.neigh(0.4) },
    { t: 8.4, fn: ({ sound }) => sound.splash(0.7) },
    { t: 11.6, fn: ({ sound }) => sound.thunder(0.6, 0.4) },
  ],
  choice: {
    at: 8.3,
    timed: 5,
    default: 0,
    prompt: 'Lightning. Dove panics in the flood.',
    options: [
      { label: 'Hold the reins', cut: true, next: (s) => (s.trust === 'high' ? 'river-struggle' : 'river-thrown'), apply: (s) => (s.riverChoice = 'hold') },
      { label: 'Let go. Trust her.', cut: true, next: (s) => (s.trust === 'high' ? 'river-carried' : 'river-thrown'), apply: (s) => (s.riverChoice = 'letgo') },
    ],
  },
  create({ R, sound }) {
    const a = riverActors();
    hooves(sound, a.dove, 'water', 0.4);
    let last = 0;
    return {
      update(t, dt) {
        a.flash = flashAt(t, RIVER_STRIKES);
        drive(a.dove, key(t, [[0, 700], [7.6, 150], [13.3, 130]], 'linear'), t - last || dt);
        last = t;
        a.dove.y = bedAt(a.dove.x);
        a.dove.rear = t > 7.7 ? 0.5 + 0.25 * Math.sin((t - 7.7) * 5) : 0;
        a.dove.ears = t > 7.6 ? 1 : 0.2;
        a.dove.neck = t > 7.6 ? -1.2 : -0.9;
        seatRider(a.eli, a.dove, { lean: t > 7.7 ? -0.3 : 0.05, arms: t > 7.7 ? { armN: 0.6, foreN: 1.6 } : null });
        a.ches.setGait('stand');
        a.ches.update(dt, false);
        seatRider(a.tob, a.ches, { arms: t > 3 && t < 6 ? { armN: 2.3, foreN: 2.6 } : null });
      },
      camera: (t) => ({ x: key(t, [[0, 350], [8, 40]]), y: -150, view: key(t, [[0, 1500], [8, 1250]]), shake: a.flash > 0.8 ? 0.6 : 0.1 }),
      look: () => riverLook(a.flash, R, -300),
      draw(R, t) {
        drawRiver(R, t, a, a.flash, -300);
      },
    };
  },
};

function riverAfter({ duration, lines, strikes, script, next = 'ridge', river }) {
  return {
    duration,
    ambience: { wind: 0.8, rain: 1, river: 1 },
    lines,
    cues: [{ t: 0, fn: ({ state }) => (state.river = river) }, ...(strikes || []).map(([ts, s]) => ({ t: ts, fn: ({ sound }) => sound.thunder(s * 0.8, 0.3) }))],
    next,
    create({ R, sound, state }) {
      const a = riverActors();
      a.dove.x = 130;
      hooves(sound, a.dove, 'water', 0.35);
      let last = 0;
      return {
        update(t, dt) {
          a.flash = flashAt(t, strikes || []);
          script(a, t, t - last || dt, sound, state);
          last = t;
          a.ches.setGait('stand');
          a.ches.update(dt, false);
          seatRider(a.tob, a.ches);
        },
        camera: (t) => ({ x: key(t, [[0, 40], [duration, lerp(40, a.dove.x, 0.6)]]), y: -150, view: key(t, [[0, 1250], [duration, 1350]]) }),
        look: () => riverLook(a.flash, R, -300),
        draw(R, t) {
          drawRiver(R, t, a, a.flash, -300);
        },
      };
    },
  };
}

const riverCarried = riverAfter({
  duration: 16,
  river: 'carried',
  strikes: [[6, 0.35]],
  lines: () => [
    { t: 3.2, who: ELI, text: 'That’s it. You’ve got us. You’ve got us.', dur: 3.6 },
    { t: 12.4, who: ELI, text: 'Good girl.', dur: 2.6 },
  ],
  script(a, t, dt) {
    const d = a.dove;
    d.rear = 0.5 * (1 - smooth(0, 2.2, t));
    d.ears = 1 - smooth(0.5, 2.5, t);
    d.neck = lerp(-1.2, -0.7, smooth(0, 2, t));
    if (t > 2 && t < 10.5) d.setGait('swim');
    else if (d.gait === 'swim') d.setGait('walk');
    drive(d, key(t, [[2, 130], [10.5, -760, 'linear'], [12, -840, 'out']]), dt);
    d.y = bedAt(d.x);
    d.buck = t > 12.3 && t < 13.4 ? 0.2 * Math.sin((t - 12.3) * 18) : 0;
    seatRider(a.eli, d, { lean: 0.3 * (1 - smooth(10, 11, t)), arms: t < 10.5 ? { armN: 1.1, foreN: 1.3 } : null });
  },
});

const riverStruggle = riverAfter({
  duration: 16,
  river: 'struggled',
  strikes: [[4.5, 0.5], [9, 0.3]],
  lines: () => [
    { t: 1.6, who: ELI, text: 'Easy! Easy, damn you!', dur: 3 },
    { t: 12.6, who: TOBIAS, text: 'Thought the river had you both!', dur: 3.2 },
  ],
  script(a, t, dt, sound) {
    const d = a.dove;
    const fight = 1 - smooth(6, 10, t);
    d.rear = (0.35 + 0.3 * Math.sin(t * 5.5)) * fight;
    d.ears = fight;
    if (t > 1 && t < 11) d.setGait('swim');
    else if (d.gait === 'swim') d.setGait('walk');
    drive(d, 130 - 900 * smooth(1, 11.5, t) + 20 * Math.sin(t * 4) * fight, dt);
    d.y = bedAt(d.x);
    seatRider(a.eli, d, { lean: -0.2 * fight + 0.25, arms: { armN: 0.4, foreN: 1.1 } });
  },
});

const riverThrown = riverAfter({
  duration: 23,
  river: 'thrown',
  strikes: [[3, 0.4], [13.5, 0.5]],
  lines: () => [
    { t: 7.2, who: TOBIAS, text: 'She’s going back for him!', dur: 3.2, style: 'shout' },
    { t: 19.6, who: ELI, text: 'Why’d you come back for me?', dur: 3.4 },
  ],
  script(a, t, dt, sound, state) {
    const d = a.dove;
    const e = a.eli;
    if (!a.splashed && t > 1.3) {
      a.splashed = true;
      sound.splash(0.9);
    }
    if (!a.called && t > 6) {
      a.called = true;
      sound.neigh(0.35);
    }
    // Dove: to the bank, turn back, swim to him, turn, tow him out.
    let x;
    if (t < 5) x = lerp(130, -700, smooth(0.2, 5, t));
    else if (t < 7) x = -700;
    else if (t < 11.2) x = lerp(-700, 180, smooth(7, 11.2, t));
    else if (t < 12.4) x = 180;
    else x = lerp(180, -720, smooth(12.4, 18, t));
    d.f = t < 6 || t > 12 ? -1 : 1;
    d.setGait((t > 0.5 && t < 4.4) || (t > 7.2 && t < 11) || (t > 12.6 && t < 17.2) ? 'swim' : 'walk');
    drive(d, x, dt);
    d.y = bedAt(d.x);
    d.rear = t < 0.8 ? 0.6 : 0;
    d.neck = t > 6 && t < 7.2 ? -1.25 : t > 19 ? 0.1 : -0.85;
    d.head = t > 19 ? 0.6 : 1.05;

    // Eli: thrown, then fighting the current, then hanging on, then ashore.
    e.visible = true;
    e.inWater = t > 1.3 && t < 18.2;
    const drift = 220 + 11 * (t - 1.3);
    if (t < 1.3) {
      const k = t / 1.3;
      const s = { x: 130, y: -140 };
      e.grounded = false;
      e.x = lerp(s.x, 240, k);
      e.y = lerp(s.y, 50, k) - Math.sin(k * Math.PI) * 120;
      e.setPose(POSES.lie);
      e.hat = 'off';
    } else if (t < 11.6) {
      e.grounded = false;
      e.x = drift;
      e.y = 46 + Math.sin(t * 3) * 6;
      e.f = -1;
      e.setPose({ ...POSES.stand, torso: 0.1, head: -0.3, armN: 2.3 + 0.5 * Math.sin(t * 4), foreN: 2.6 + 0.4 * Math.sin(t * 4 + 1), armF: 2.0 + 0.5 * Math.sin(t * 4 + 2), foreF: 2.4 });
    } else if (t < 18.2) {
      e.grounded = false;
      e.f = -1;
      e.x = d.x + (t < 12.4 ? 40 : 70);
      e.y = 40 + Math.sin(t * 3) * 3;
      e.setPose({ ...POSES.stand, torso: -0.2, armN: 2.6, foreN: 2.9, armF: 2.4, foreF: 2.8 });
    } else {
      e.grounded = true;
      e.y = -40;
      e.x = lerp(-640, -660, smooth(18.2, 19, t));
      e.f = -1;
      e.setPose(t < 19.5 ? blendPose(POSES.lie, POSES.sit, smooth(18.2, 19.5, t)) : { ...POSES.sit, head: -0.25 });
    }
    state.mercy = true;
  },
});

// ============================================================ 7. ridge =======

const ridgeScene = {
  duration: 35,
  mood: 'tension',
  ambience: { wind: 0.5, rain: 0.45, river: 0 },
  cards: [{ t: 9.6, dur: 5, text: 'CALVARY BEND — No firearms within town limits. By order of Marshal H. Grady.' }],
  lines: (s) => {
    const out = [];
    if (s.armed) {
      out.push({ t: 15.6, who: ELI, text: 'Marshal can ask me for it himself.', dur: 4 });
      out.push({ t: 20.4, who: TOBIAS, text: 'So what do we do now?', dur: 3 });
      out.push({ t: 24, who: ELI, text: 'We wait for the town to go to sleep.', dur: 4 });
    } else {
      out.push({ t: 26, who: ELI, text: 'Oh, June.', dur: 3 });
    }
    if (s.river === 'thrown') out.push({ t: 29.6, who: ELI, text: 'Reckon I owe you twice now, girl.', dur: 3.4 });
    else if (s.river === 'carried') out.push({ t: 29.6, who: ELI, text: 'Ada’s girl. Always were.', dur: 3.4 });
    return out;
  },
  create({ R, sound, state }) {
    const eli = new Person('suit');
    const tob = new Person('vest');
    const dove = new Horse('dove');
    const ches = new Horse('chestnut');
    dove.saddled = ches.saddled = true;
    dove.bags = ches.bags = true;
    ches.x = -380;
    ches.f = 1;
    hooves(sound, dove, 'mud', 0.3);
    const armed = !!state.armed;
    let last = 0;
    const note = !armed;
    const a = { flash: 0, matchT: -1 };
    const strikes = [[12, 0.3], [21, 0.2]];
    return {
      update(t, dt) {
        a.flash = flashAt(t, strikes);
        if (Math.abs(t - 12) < dt) sound.thunder(0.35, 1.6);
        drive(dove, key(t, [[0, -1000], [5, -90, 'out']]), t - last || dt);
        last = t;
        ches.setGait('stand');
        ches.update(dt, false);
        seatRider(tob, ches);
        if (t < 5.4) seatRider(eli, dove);
        else if (t < 7) {
          // dismount: saddle to ground
          const k = smooth(5.4, 7, t);
          const s = dove.seat();
          eli.grounded = true;
          eli.x = dove.x + 60;
          eli.setPose(P_STAND);
          const [gx, gy] = eli.hip();
          eli.grounded = false;
          eli.x = lerp(s.x, gx, k);
          eli.y = lerp(s.y, gy, k) - Math.sin(k * Math.PI) * 24;
          eli.setPose(blendPose(POSES.ride, P_STAND, k));
        } else if (walk(eli, t, dove.x + 60, 70, 7.2, 9.2)) {
          /* to the sign */
        } else if (armed) {
          eli.f = 1;
          eli.setPose(t > 15 ? blendPose(P_STAND, P_BELT, smooth(15, 16, t)) : { ...P_STAND, head: -0.1 });
        } else if (t < 14) {
          eli.f = 1;
          eli.setPose({ ...P_STAND, head: -0.1 });
        } else if (walk(eli, t, 70, dove.x - 60, 14, 15.8)) {
          /* back to the saddlebag */
        } else {
          eli.f = -1;
          const reach = smooth(16, 16.6, t) * (1 - smooth(17, 17.6, t));
          eli.setPose(blendPose(t > 17.4 ? { ...POSES.hands, head: 0.35 } : P_STAND, { ...POSES.reach, armN: 1.4, foreN: 1.7 }, reach));
          if (t > 18.8 && a.matchT < 0) {
            a.matchT = t;
            sound.match();
          }
        }
      },
      camera: (t) => ({
        x: key(t, [[0, -520], [6, -150], [10, 0], [28, 0], [35, 260]]),
        y: key(t, [[0, -210], [28, -200], [35, -60]]),
        view: key(t, [[0, 1300], [10, 1100], [28, 1150], [35, 1750]]),
      }),
      look(t) {
        const matchLit = a.matchT > 0 ? clamp((t - a.matchT) * 6) * (1 - smooth(a.matchT + 7.5, a.matchT + 8.5, t)) : 0;
        const [hx, hy] = hand(eli);
        const townUv = uvOf(R, 800, 20, 0.35);
        const lights = [
          { uv: [0.15, -0.4], color: [0.4, 0.5, 0.78], intensity: 0.45, radius: 0, rim: 0.9 },
          { uv: townUv, color: [1.0, 0.58, 0.3], intensity: 0.55, radius: 0.35, rim: 0.9 },
        ];
        if (matchLit > 0) lights.unshift({ x: hx, y: hy - 12, color: [1.0, 0.65, 0.3], intensity: 2.2 * matchLit * (0.85 + 0.15 * noise1(t * 20)), radius: 0.12, rim: 1.2 });
        a.matchLit = matchLit;
        return { ambient: [0.05, 0.06, 0.1], flash: [0.3 * a.flash, 0.35 * a.flash, 0.55 * a.flash], lights, groundShadow: 0, bloom: 1.1 };
      },
      draw(R, t) {
        S.skyGradient(R, SKIES.night);
        S.clouds(R, { seed: 21, y: -380, color: `rgba(${24 + a.flash * 80},${28 + a.flash * 90},${44 + a.flash * 120},0.85)`, count: 12, t, drift: 8 });
        S.ridge(R, { depth: 0.2, base: 60, height: 120, freq: 0.004, seed: 61, color: '#0c0d14' });
        S.townLights(R, 420, 40, t, 0.35);
        // the ridge top, falling away to the town below
        R.paint((c) => {
          c.fillStyle = '#16120f';
          c.beginPath();
          c.moveTo(-3000, 600);
          c.lineTo(-3000, 0);
          c.lineTo(300, 0);
          c.quadraticCurveTo(360, 8, 390, 60);
          c.lineTo(430, 600);
          c.fill();
        });
        S.signpost(R, 150, 0, ['CALVARY BEND', 'NO FIREARMS WITHIN TOWN LIMITS.', 'BY ORDER OF', 'MARSHAL H. GRADY']);
        R.cast((c) => ches.draw(c));
        R.cast((c) => tob.draw(c));
        R.cast((c) => dove.draw(c));
        R.cast((c) => eli.draw(c));
        if (!armed && t > 17.2) {
          const [hx, hy] = hand(eli);
          R.cast((c) => P.bundle(c, hx - 6, hy + 2, smooth(19.4, 20.4, t)));
          if (note && t > 19.8) R.paint((c) => P.paper(c, hx + 16, hy - 10, -0.3));
        }
        if (a.matchLit > 0) {
          const [hx, hy] = hand(eli);
          R.glow((c) => {
            const g = c.createRadialGradient(hx, hy - 12, 0, hx, hy - 12, 10);
            g.addColorStop(0, `rgba(255,230,170,${a.matchLit})`);
            g.addColorStop(1, 'rgba(255,140,40,0)');
            c.fillStyle = g;
            c.fillRect(hx - 12, hy - 24, 24, 24);
          });
        }
        S.rain(R, t, 0.45, 0.2);
      },
    };
  },
  next: '@end',
};

// A card for the unarmed path, where June's note is read by match-light.
ridgeScene.cards.push({ t: 20.4, dur: 5.4, text: '“Pa — You promised Ma. But I want you home more. — June”', when: (s) => !s.armed });

export const CHAPTER_1 = {
  first: 'prologue',
  scenes: {
    prologue,
    farm,
    'farm-hear': farmHear,
    'farm-refuse': farmRefuse,
    barn,
    'barn-take': barnTake,
    'barn-leave': barnLeave,
    dawn,
    'mount-soft': mountSoft,
    'mount-force': mountForce,
    ride,
    river: riverScene,
    'river-carried': riverCarried,
    'river-struggle': riverStruggle,
    'river-thrown': riverThrown,
    ridge: ridgeScene,
  },
};

// What the player's choices say about their Eli, for the end card.
export function summary(s) {
  return [
    s.resolve === 'willing' ? 'You heard Tobias out, and took the money on offer.' : 'You sent Tobias away. A long night changed your mind.',
    s.armed ? 'Eli carries Ada’s pistol.' : 'You left the pistol in the trunk. June packed it for him anyway.',
    s.trust === 'high' ? 'You spoke softly, and Dove chose to carry him.' : 'You forced her. Dove carries him because she has to.',
    s.river === 'carried'
      ? 'In the flood you let go, and she brought you both across.'
      : s.river === 'struggled'
        ? 'In the flood you held on, and you both came out bruised.'
        : 'In the flood she threw him, then turned back for him.',
  ];
}
