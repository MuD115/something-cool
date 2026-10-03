// Act 3, Part 3: The Night Walk (المشي بالليل), 10 pm to midnight, after
// the checkpoint or the building. script/act3.md, scenes 3C-1 to 3C-4.
//
// The game's contemplative core: no enemies, no urgency, for a long while no
// objective at all. Sami walks through a town the moon has made strange:
// past the bombed building with its rooms full of moonlight, past the vine
// from the afternoon, down an alley where the black cat is waiting on a
// wall (it yawns, and settles, and sleeps), past a basement where a wedding
// is going on (he opens the door a crack, and doesn't go in), and past a
// garden someone waters at night (he can water it).
//
// Lines come from act3w-lines.js by key; prompts and labels here are in
// Modern Standard Arabic.

import { clamp, lerp, smooth } from '../engine/util.js';
import { POSES } from '../rigs/person.js';
import { Cat } from '../rigs/cat.js';
import { writeSave } from '../engine/save.js';
import { X3, buildWalkLevel, surfaceAt, walkLook, drawWalk } from './act3w-set.js';
import { basementDoor, weddingGlimpse, nightGarden, wateringCan, waterPour } from '../sets/night-props.js';
import { LINES, WHO, CARDS } from './act3w-lines.js';

const CROUCH_LOOK = { ...POSES.crouch, head: -0.15, armN: 0.7, foreN: 1.2 };
const POCKET = { ...CROUCH_LOOK, armN: -0.15, foreN: 0.5 };
const POUR = { ...POSES.stand, torso: 0.18, head: 0.35, armN: 1.05, foreN: 1.3, armF: 0.3, foreF: 0.7 };
const CAN_X = X3.garden[1] - 30;

// A line by key, as a script step; and the same said in passing.
function* say(g, key) {
  const L = LINES[key];
  const step = g.say(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
  const first = step.next();
  markDraft(g, L);
  yield first.value;
}
function line(g, key) {
  const L = LINES[key];
  g.line(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
  markDraft(g, L);
}
function markDraft(g, L) {
  const last = g.text.log[g.text.log.length - 1];
  if (last && last.line[1] === L.en) last.draft = !!L.draft;
}

// Ease a value on g.a from where it is to `to` over `dur` seconds.
function* tween(g, key, to, dur) {
  const a = g.a;
  const from = a[key] || 0;
  const t0 = g.time;
  yield () => {
    const k = clamp((g.time - t0) / dur);
    a[key] = lerp(from, to, smooth(0, 1, k));
    return k >= 1;
  };
}

export const ACT3W = {
  bounds: [-300, X3.end + 200],

  build(g) {
    const s = g.state;
    const L = g.level;
    const p = g.player;
    g.a = { part: 3, nextChirp: 0, nextShot: 18, nextDog: 9, nextCreak: 5, nextNey: 12, doorOpen: 0, doorGlow: 0, wet: 0, canTaken: false };
    g.surface = surfaceAt;
    for (const id of ['torch']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = 'torch';
    g.torch.charge = 0.5;
    g.sound.ambience({ wind: 0.16, air: 0.24, crowd: 0, generator: 0, traffic: 0 }, 3);
    g.sound.life(0.15);
    g.sound.score?.mood('after', 3);
    buildWalkLevel(L);

    // what he can stop and look at
    const look = (id, x, y, key, box) => L.add({ id, x, y, range: 110, look: true, label: ['تفحّص', 'Examine'], use: () => line(g, key), ...box });
    look('ruin', (X3.ruin[0] + X3.ruin[1]) / 2, -150, 'ruin', { box: [300, 200], by: 60 });
    look('vine', X3.vine, -110, 'vine', { box: [90, 150], by: 40 });
    look('garden', (X3.garden[0] + X3.garden[1]) / 2 - 40, -40, 'garden', { box: [260, 80], by: 10 });
    L.add({ id: 'door', x: X3.basement, y: -10, range: 90, label: ['افتح الباب قليلاً', 'Open the door a crack'], box: [70, 120], by: 30, enabled: () => !g.a.doorDone, use: () => g.runner.run(this.wedding(g)) });
    L.add({ id: 'can', x: CAN_X, y: -20, range: 80, label: ['اسقِ الحديقة', 'Water the garden'], box: [40, 40], by: 6, enabled: () => !g.a.wateredDone && !g.locked, use: () => g.runner.run(this.water(g)) });

    // the black cat, on the low wall in the alley, as if it had been waiting
    const cat = new Cat();
    cat.x = (X3.catWall[0] + X3.catWall[1]) / 2;
    cat.y = -70;
    cat.f = -1;
    cat.sit = 1;
    g.cat = cat;

    const cp = s.checkpoint;
    if (cp === 'wedding') p.place(X3.basement - 320);
    else if (cp === 'garden') {
      p.place(X3.garden[0] - 220);
      g.a.catDone = true;
      cat.curl = 1;
    } else p.place(X3.start + 60);
    if (cp === 'wedding') {
      g.a.catDone = true;
      cat.curl = 1;
    }
    p.f = 1;
    g.runner.run(this.walk(g));
  },

  // In from black, and then nothing asked of him for a long while.
  *walk(g) {
    const a = g.a;
    g.fade = 1;
    g.lock();
    if (g.state.checkpoint === 'moon' || !g.state.checkpoint) {
      g.checkpoint('moon');
      g.text.titleCard(CARDS.open, 6);
      yield 2.5;
    } else yield 0.6;
    const t0 = g.time;
    yield () => {
      g.fade = 1 - clamp((g.time - t0) / 2.5);
      return g.fade <= 0;
    };
    g.lock(false);
    yield 9;
    if (!a.saidQuiet) {
      a.saidQuiet = true;
      line(g, 'quiet');
    }
  },

  // 3C-2: the cat on the wall. He stops; it looks at him; he crouches and
  // finds nothing in his pocket; it yawns, every tooth, and settles, and
  // closes its eyes. He gets up slowly and walks on.
  *catScene(g) {
    const a = g.a;
    const p = g.player;
    const cat = g.cat;
    a.catDone = true;
    g.lock();
    yield* g.walkPlayer(X3.catWall[0] - 70);
    p.f = 1;
    cat.headTurn = 0.3;
    yield 0.8;
    yield* say(g, 'cat_seen');
    p.override = CROUCH_LOOK;
    yield 1;
    p.override = POCKET;
    g.sound.cloth();
    yield 0.9;
    yield* say(g, 'cat_pocket');
    p.override = CROUCH_LOOK;
    yield 1.2;
    // the yawn: a creature doing a creature thing
    yield* tweenObj(g, cat, 'yawn', 1, 0.7);
    yield 0.35;
    yield* tweenObj(g, cat, 'yawn', 0, 0.6);
    yield 0.4;
    g.sound.purr?.(6, g.sound.panFor(cat.x));
    yield* tweenObj(g, cat, 'curl', 1, 2.2);
    yield 2.2;
    // up, slowly, and on
    p.override = null;
    yield 0.8;
    g.lock(false);
  },

  // 3C-3: the basement door. Music under the street; he opens the door a
  // crack: a wedding, thirty people, a bride in a dress made from curtains.
  // He watches, and shakes his head, gently, and closes it again.
  *wedding(g) {
    const a = g.a;
    const p = g.player;
    a.doorDone = true;
    g.state.wedding_seen = true;
    g.lock();
    yield* g.walkPlayer(X3.basement - 46);
    p.f = 1;
    yield* say(g, 'door');
    yield 0.3;
    g.sound.noise({ dur: 0.5, freq: 260, q: 0.8, vol: 0.18 }); // the steel door scraping
    g.camOverride = { x: X3.basement + 20, y: -70, view: 620 };
    yield* tween(g, 'doorOpen', 1, 1.1);
    a.wedding?.set(1, 0.05);
    yield 4.5;
    // she smiles, and waves him in; he shakes his head, gently
    const t0 = p.time;
    p.override = (t) => ({ ...POSES.stand, head: 0.12 + 0.22 * Math.sin((t - t0) * 7) * Math.max(0, 1 - (t - t0) / 1.4) });
    yield 1.6;
    p.override = null;
    yield 0.6;
    g.sound.noise({ dur: 0.45, freq: 230, q: 0.8, vol: 0.16 });
    yield* tween(g, 'doorOpen', 0, 0.9);
    a.wedding?.set(0.55, 0.9);
    g.camOverride = null;
    yield 1.4;
    g.lock(false);
  },

  // 3C-4: the watering can, half full. He waters someone else's garden.
  *water(g) {
    const a = g.a;
    const p = g.player;
    const s = g.state;
    g.lock();
    yield* g.walkPlayer(CAN_X - 34);
    p.f = 1;
    yield* g.reach(CAN_X, -10, () => {
      a.canTaken = true;
    });
    // the can in his near hand, tipped to pour
    let tilt = 0;
    p.rig.prop = (c, hand) => wateringCan(c, hand[0] + 6, hand[1] + 8, { tilt, s: 0.9 });
    // carried low at his side between the beds, tipped over each one
    p.arms = { armN: 0.35, foreN: 0.75 };
    const beds = [X3.garden[1] - 80, X3.garden[1] - 170, X3.garden[0] + 150, X3.garden[0] + 70];
    for (const bx of beds) {
      p.override = null;
      yield* g.walkPlayer(bx + 26);
      p.f = -1;
      p.override = POUR;
      const t0 = g.time;
      g.sound.slosh?.();
      yield () => {
        const k = clamp((g.time - t0) / 1.6);
        tilt = 0.9 * Math.sin(k * Math.PI);
        const [hx, hy] = p.rig.world('handN');
        a.pour = { x: hx - 22, y: hy + 4, k: Math.sin(k * Math.PI) };
        a.wet = Math.min(1, a.wet + g.lastDt * 0.16);
        return k >= 1;
      };
      a.pour = null;
    }
    tilt = 0;
    p.override = null;
    yield* g.walkPlayer(CAN_X - 34);
    p.arms = null;
    p.f = 1;
    yield* g.reach(CAN_X, -10, () => {
      a.canTaken = false;
      p.rig.prop = null;
    });
    a.wetT = g.time;
    a.wateredDone = true;
    s.watered_garden = true;
    s.compassion = (s.compassion || 0) + 1;
    yield* say(g, 'watered');
    g.lock(false);
  },

  *finish(g) {
    const s = g.state;
    const a = g.a;
    s.completed = true;
    writeSave(s);
    g.lock();
    const t0 = g.time;
    yield () => {
      a.endFade = clamp((g.time - t0) / 2.5);
      return a.endFade >= 1;
    };
    g.fade = 1;
    a.wedding?.stop();
    a.wedding = null;
    g.sound.ambience({ crowd: 0, wind: 0.05, air: 0.1, generator: 0, traffic: 0 }, 2);
    yield 1;
    g.sound.ney(196, 10, 0.14);
    g.text.titleCard(CARDS.close, 6);
    yield 6.5;
    g.onEnd?.(s);
  },

  // ============================================== per-frame extras ==

  update(g, dt) {
    const a = g.a;
    const p = g.player;
    g.lastDt = dt;
    g.cat?.update(dt);
    const snd = g.sound;
    // crickets, dominant
    if (g.time > a.nextChirp) {
      a.nextChirp = g.time + 0.2 + Math.random() * 0.6;
      const f = 4300 + Math.random() * 700;
      const pan = Math.random() * 2 - 1;
      for (let i = 0; i < 3; i++) snd.tone(f, 0.028, { when: snd.t + i * 0.055, vol: 0.012, pan });
    }
    // a single shot, far off, almost ceremonial in the quiet; a dog; the
    // buildings settling; and now and then a breath of ney
    if (g.time > a.nextShot) {
      a.nextShot = g.time + 26 + Math.random() * 30;
      snd.distantShot?.();
    }
    if (g.time > a.nextDog) {
      a.nextDog = g.time + 20 + Math.random() * 25;
      (snd.dogBarkFar || snd.dogFar)?.call(snd, Math.random() * 2 - 1);
    }
    if (g.time > a.nextCreak) {
      a.nextCreak = g.time + 9 + Math.random() * 12;
      (snd.buildingCreak || snd.tinCreak)?.call(snd, Math.random() * 2 - 1);
    }
    if (g.time > a.nextNey) {
      a.nextNey = g.time + 24 + Math.random() * 20;
      snd.ney([196, 220, 233.08, 293.66][Math.floor(Math.random() * 4)], 6, 0.07);
    }

    // the wedding, heard through a door and a floor, nearer as he comes
    const dW = Math.abs(p.x - X3.basement);
    if (dW < 1100 && !a.wedding && !a.endFade) a.wedding = snd.wedding?.() || null;
    if (a.wedding && !a.doorOpen) a.wedding.set(clamp(1 - dW / 1100) * 0.7, 0.9);
    a.doorGlow = 0.18 + 0.7 * (a.doorOpen || 0);
    if (a.wedding && dW > 1300) {
      a.wedding.stop();
      a.wedding = null;
    }

    if (g.locked) return;
    if (!a.catDone && p.x > X3.catWall[0] - 170 && p.x < X3.catWall[1]) g.runner.run(this.catScene(g));
    if (!a.saidMusic && dW < 520 && p.x < X3.basement) {
      a.saidMusic = true;
      line(g, 'music');
    }
    if (!a.cpWedding && p.x > X3.basement - 280 && g.state.checkpoint === 'moon') {
      a.cpWedding = true;
      g.checkpoint('wedding');
    }
    if (!a.cpGarden && p.x > X3.garden[0] - 180 && g.state.checkpoint !== 'garden') {
      a.cpGarden = true;
      g.checkpoint('garden');
    }
    if (!a.finishing && p.x > X3.end - 120) {
      a.finishing = true;
      g.runner.run(this.finish(g));
    }
  },

  // The door, the wedding through it, the garden and its can, the water.
  drawProps(R, g) {
    const a = g.a;
    const t = g.time;
    const cx = R.cam.x;
    if (Math.abs(cx - X3.basement) < 1500) {
      if (a.doorOpen > 0.01) weddingGlimpse(R, X3.basement, { open: a.doorOpen, t });
      basementDoor(R, X3.basement, { open: a.doorOpen || 0, t });
    }
    if (Math.abs(cx - (X3.garden[0] + X3.garden[1]) / 2) < 1600) {
      const dry = a.wetT ? 1 - clamp((t - a.wetT) / 600) * 0.3 : 1; // it stays wet a long while
      nightGarden(R, X3.garden[0], X3.garden[1], { wet: (a.wet || 0) * dry, t });
      if (!a.canTaken) R.cast((c) => wateringCan(c, CAN_X, 0));
      if (a.pour) waterPour(R, a.pour.x, a.pour.y, a.pour.k, t);
    }
  },

  // Leaving the act (to the menu, or another act): the band stops.
  leave(g) {
    g.a?.wedding?.stop();
    if (g.a) g.a.wedding = null;
  },

  useTool(g, id) {
    if (id === 'lighter') g.sound.click();
  },

  draw(R, g) {
    drawWalk(R, g);
  },

  look(g) {
    return walkLook(g);
  },
};

// Ease a property of any object (the cat's yawn, its curl).
function* tweenObj(g, obj, key, to, dur) {
  const from = obj[key] || 0;
  const t0 = g.time;
  yield () => {
    const k = clamp((g.time - t0) / dur);
    obj[key] = lerp(from, to, smooth(0, 1, k));
    return k >= 1;
  };
}
