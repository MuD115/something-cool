// Act 3, Retrieval: The Night (الليل), from 8 pm. Parts 1 and 2 of
// script/act3.md: whichever way Sami chose at the end of Act Two.
//
//   Part 1, the white cloth (d_choice 'cloth'): the torch, sixty metres of
//   open ground under a raised sheet, the checkpoint, and Officer Maher, who
//   sells what he controls. Choice G: dignity, anger or a deal.
//
//   Part 2, the back route (d_choice 'back'): up through the ruined
//   building in the dark, out onto its balconies, down its drainpipe, and on
//   his belly across the moonlit street to the blanket, to pull it back into
//   the shadow.
//
// Lines come from act3r-lines.js by key. Prompts, objectives and choice
// labels here are in Modern Standard Arabic.

import { lerp, clamp } from '../engine/util.js';
import { POSES, crawlPose, stairPose } from '../rigs/person.js';
import { Shroud } from '../rigs/ragdoll.js';
import { writeSave } from '../engine/save.js';
import { X1, X2, floorY, nightLook, surfaceAt, drawApproach, drawBuilding, buildBuilding } from './act3r-set.js';
import { LINES, WHO, CARDS } from './act3r-lines.js';
import { whiteCloth } from './act2r.js';

const GAP = 0.45;
const RAISED = { armN: 2.55, foreN: 2.75 };
const HANDS_UP = { armN: 2.6, foreN: 2.95, armF: 2.5, foreF: 2.9 };
const SIT = { ...POSES.sitChair, head: 0.1, armN: 0.3, foreN: 1.35, armF: 0.25, foreF: 1.3 };
const SIT_LEAN = { ...SIT, torso: 0.2, head: 0.2, armN: 0.9, foreN: 1.7 };
const DOUBLED = { ...POSES.sitChair, torso: 0.75, head: 0.5, armN: 0.3, foreN: 1.9, armF: 0.35, foreF: 1.8 };
const RIFLE = { ...POSES.stand, armN: 0.7, foreN: 1.55, armF: 0.55, foreF: 1.4 };

const OBJ = {
  crank: ['أدِر مقبض المصباح لترى الأرض', 'Crank the torch to see the ground'],
  cross: ['امشِ إلى الحاجز والقماشة مرفوعة', 'Walk to the checkpoint, the cloth raised'],
  up: ['اصعد عبر المبنى', 'Climb up through the building'],
  hole: ['اخرج من الفتحة في الجدار', 'Go out through the hole in the wall'],
  down: ['انزل إلى الزقاق', 'Get down to the alley'],
  crawl: ['ازحف إلى أحمد', 'Crawl to Ahmad'],
};

// A line by key, as a script step: shows it, tags placeholders in the log.
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
function* talk(g, keys) {
  for (const k of keys) {
    yield* say(g, k);
    yield GAP;
  }
}

// A soldier's rifle, held low across the body.
function rifle(c, hand) {
  const [hx, hy] = hand;
  c.save();
  c.translate(hx, hy);
  c.rotate(-0.35);
  c.fillStyle = '#1d1c1a';
  c.fillRect(-34, -4, 70, 6); // body and barrel
  c.fillRect(36, -3, 18, 3);
  c.fillRect(-2, 2, 6, 12); // magazine, curved
  c.fillStyle = '#4a3322';
  c.fillRect(-48, -3, 16, 8); // stock
  c.restore();
}

// Move a walker along a path of [x, y] points at a speed, with a pose
// for the gait (the walker's own, or a function of the distance so far),
// turned the way it goes unless told which way to face.
function* along(g, w, pts, speed, pose = null, face = null) {
  const before = w.override;
  w.scripted = true;
  let seg = 0;
  let u = 0;
  let dist = 0;
  yield () => {
    const dt = g.lastDt || 1 / 60;
    let left = speed * dt;
    while (left > 0 && seg < pts.length - 1) {
      const [ax, ay] = pts[seg];
      const [bx, by] = pts[seg + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const step = Math.min(left, len * (1 - u));
      u += step / len;
      left -= step;
      dist += step;
      if (u >= 1 - 1e-6) {
        seg++;
        u = 0;
      }
    }
    const i = Math.min(seg, pts.length - 2);
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    w.x = lerp(ax, bx, seg >= pts.length - 1 ? 1 : u);
    w.y = lerp(ay, by, seg >= pts.length - 1 ? 1 : u);
    if (face) w.f = face;
    else if (bx !== ax) w.f = bx > ax ? 1 : -1;
    w.stride += speed * dt;
    w.scriptedSpeed = speed;
    w.override = pose ? pose(dist) : null;
    return seg >= pts.length - 1;
  };
  w.scripted = false;
  w.scriptedSpeed = 0;
  // the others keep the pose they held (a soldier his rifle); the player is
  // handed back his own body
  w.override = w === g.player ? null : before;
  w.vx = 0;
  w.vy = 0;
  w.onGround = true;
}

export const ACT3R = {
  bounds: [-200, 2300],

  build(g) {
    const L = g.level;
    const s = g.state;
    const part = s.d_choice === 'back' ? 2 : 1;
    g.a = { part, inside: part === 2, nextChirp: 0, nextRadio: 4 };
    g.surface = part === 2 ? (x) => (x > X2.b1 ? 'grit' : 'rubble') : surfaceAt;
    for (const id of ['torch']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = 'torch';
    g.torch.charge = 0.25;
    g.sound.ambience({ wind: 0.22, air: 0.28, crowd: 0, generator: 0, traffic: 0 }, 2);
    g.sound.life(0.25);
    g.sound.score?.mood('after', 3);
    if (part === 1) this.buildApproach(g);
    else this.buildBuilding(g);
  },

  // ------------------------------------------------------ Part 1 build --

  buildApproach(g) {
    const s = g.state;
    const p = g.player;
    if (!s.tools.includes('whitecloth')) s.tools.push('whitecloth');
    const s1 = g.npc('soldier', X1.bags[0] + 70, { f: -1 });
    const s2 = g.npc('soldier2', X1.bags[0] + 120, { f: -1 });
    for (const w of [s1, s2]) {
      w.override = RIFLE;
      w.rig.prop = (c, hand) => rifle(c, hand);
    }
    const maher = g.npc('officer', X1.maher, { f: -1 });
    maher.override = SIT;
    Object.assign(g, { s1, s2, maher });
    g.level.add({ id: 'ground', x: 300, y: -30, range: 110, look: true, box: [220, 30], bx: 110, by: 18, label: ['تفحّص', 'Examine'], use: () => line(g, 'ground') });
    if (s.checkpoint === 'table') {
      this.seat(g);
      g.runner.run(this.table(g));
    } else {
      p.place(X1.start);
      p.f = 1;
      g.runner.run(this.approach(g));
    }
  },

  // Everyone in their places at the camp table.
  seat(g) {
    const p = g.player;
    const a = g.a;
    p.place(X1.seat);
    p.f = 1;
    p.override = SIT;
    p.rig.prop = null;
    p.arms = null;
    a.lampAtTable = true;
    a.onTable = true;
    a.lighterOnTable = true;
    g.s1.place(X1.seat - 90);
    g.s1.f = 1;
    g.s2.place(X1.maher + 90);
    g.s2.f = -1;
    g.camOverride = { x: (X1.seat + X1.maher) / 2, y: -150, view: 820 };
    g.state.tools = g.state.tools.filter((id) => id !== 'walkie' && id !== 'lighter');
    g.active = 'torch';
    g.snapCamera();
  },

  *approach(g) {
    const p = g.player;
    const a = g.a;
    g.checkpoint('night');
    g.fade = 1;
    g.lock();
    g.text.titleCard(CARDS.open, 7);
    yield 1.5;
    for (let k = 1; k >= 0; k -= 0.05) {
      g.fade = k;
      yield 0.05;
    }
    yield 5;
    // the torch: first, just enough light to see the ground
    g.lock(false);
    g.active = 'torch';
    yield* say(g, 'torch_tip');
    g.text.objective(OBJ.crank);
    g.prompt('use', 'اضغط مطوّلاً لتدوير المصباح، ثم اضغط مرة لإضاءته', 'Hold to crank the torch, then tap to switch it on');
    yield () => g.torch.on && g.torch.charge > 0.4;
    g.prompt(null);
    yield 1.5;
    yield* say(g, 'ground');
    yield 1;
    g.torch.on = false;
    g.sound.click();
    yield* say(g, 'torch_off');

    // the crossing: upright, slow, the cloth above his head
    g.giveTool('whitecloth');
    p.rig.prop = (c, hand) => whiteCloth(c, hand, g.time);
    p.arms = RAISED;
    g.stanceLock = 'stand';
    let told = -9;
    g.onStanceLocked = () => {
      if (g.time - told > 6) {
        told = g.time;
        line(g, 'no_crouch');
      }
    };
    g.gate = (m) => m * 0.45;
    g.text.objective(OBJ.cross);
    g.prompt('right', 'تقدّم', 'Walk on');
    yield () => p.x > X1.open + 40;
    g.prompt(null);
    yield () => p.x > X1.shout;

    // the shout
    g.lock();
    g.text.objective(null);
    g.gate = null;
    g.sound.distantShot?.();
    yield* say(g, 'shout_1');
    yield 0.3;
    yield* say(g, 'sami_1');
    yield 0.8;
    yield* say(g, 'shout_2');
    p.arms = HANDS_UP;
    yield 3;
    // two of them come out, rifles low; one pats him down
    g.s1.override = null;
    g.s2.override = null;
    yield* g.walkNpc(g.s1, p.x + 70, { speedScale: 0.45 });
    g.s1.f = -1;
    yield* g.walkNpc(g.s2, p.x + 120, { speedScale: 0.45 });
    g.s2.f = -1;
    // the pat-down: hands down his sides, his pockets
    g.s1.override = (t) => ({ ...POSES.hands, torso: 0.45, head: 0.25, armN: 1.0 + 0.35 * Math.sin(t * 7), foreN: 1.15, armF: 0.85 + 0.35 * Math.sin(t * 7 + 1.4), foreF: 1.05 });
    g.sound.cloth();
    yield 0.7;
    g.sound.cloth();
    yield 0.8;
    g.state.tools = g.state.tools.filter((id) => id !== 'walkie' && id !== 'lighter');
    g.active = 'whitecloth';
    g.s1.override = RIFLE;
    yield* say(g, 's1_tell');
    yield 1;
    // they walk him in
    for (let k = 0; k <= 1; k += 0.05) {
      g.fade = k;
      yield 0.04;
    }
    g.stanceLock = null;
    g.onStanceLocked = null;
    this.seat(g);
    g.checkpoint('table');
    yield 0.8;
    for (let k = 1; k >= 0; k -= 0.05) {
      g.fade = k;
      yield 0.04;
    }
    g.fade = 0;
    yield* this.table(g);
  },

  // ----------------------------------------------- the checkpoint table --

  *table(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    const m = g.maher;
    g.lock();
    g.fade = 0;
    g.sound.radio(1.2);
    yield 1.2;
    yield* talk(g, ['m_1', 'sa_1', 'm_2', 'sa_2', 'm_3', 'sa_3', 'm_4', 'sa_4', 'm_5', 'sa_5', 'm_6']);
    // Beat 1: tea, and the terms
    // he pours, and drinks: the glass to his mouth
    m.override = { ...SIT, armN: 0.9, foreN: 1.8 };
    g.sound.slosh?.();
    yield 0.8;
    m.override = { ...SIT, head: -0.15, armN: 0.75, foreN: 2.85 };
    yield 1.1;
    m.override = SIT;
    yield* talk(g, ['m_7', 'sa_7', 'm_8', 'sa_8', 'm_9', 'sa_9', 'm_10', 'sa_10', 'm_11']);
    // Beat 2
    yield* talk(g, ['sa_12', 'm_12', 'sa_13', 'm_13', 'sa_14', 'm_14', 'sa_15', 'm_15']);
    // Beat 3: the price. He picks up Ahmad's lighter.
    m.override = { ...SIT_LEAN, armN: 1.2, foreN: 2.1 };
    a.lighterOnTable = false;
    g.sound.click();
    yield 0.6;
    yield* talk(g, ['m_16', 'sa_16', 'm_17']);
    m.override = SIT;
    a.lighterOnTable = true;
    yield* say(g, 'm_18');
    yield 0.6;

    const pick = yield* g.choose(['كيف يجيب سامي؟', 'How does Sami answer?'], [
      { ar: 'بكرامة', en: 'With dignity' },
      { ar: 'بغضب', en: 'With anger' },
      { ar: 'بصفقة', en: 'With a deal' },
    ]);
    s.choices = [...(s.choices || []), `G${pick + 1}`];
    if (pick === 0) {
      s.g_choice = 'dignity';
      p.override = SIT_LEAN;
      yield* say(g, 'g1_1');
      yield GAP;
      p.override = SIT;
      yield* say(g, 'g1_2');
      // the lighter goes into his pocket; Sami half rises, a hand sits him down
      a.lighterOnTable = false;
      m.override = { ...SIT, armN: 0.1, foreN: 2.4 };
      yield 0.8;
      p.override = { ...SIT, torso: -0.2, thighN: 1.2, thighF: 1.1 };
      yield* g.walkNpc(g.s1, X1.seat - 30, { speedScale: 0.5 });
      g.s1.f = 1;
      g.s1.override = { ...RIFLE, armN: 1.6, foreN: 1.7 };
      p.override = SIT;
      yield 1;
      m.override = SIT;
      yield* say(g, 'g1_3');
      g.s1.override = RIFLE;
      s.negotiation_outcome = 'success';
      s.body_retrieved = true;
      s.lighter_taken = true;
    } else if (pick === 1) {
      s.g_choice = 'anger';
      s.courage = (s.courage || 0) + 1;
      p.override = { ...SIT_LEAN, torso: 0.3, head: -0.1, armN: 1.3, foreN: 1.4 };
      yield* say(g, 'g2_1');
      // a look from Maher; the soldier steps behind Sami
      yield* g.walkNpc(g.s1, X1.seat - 34, { speedScale: 0.6 });
      g.s1.f = 1;
      yield 0.6;
      // (heard, not shown: the camera stays on the lamp)
      g.camOverride = { x: X1.table, y: -110, view: 520 };
      g.sound.tone(58, 0.35, { vol: 0.8, to: 36 });
      g.sound.noise({ dur: 0.18, freq: 500, q: 0.6, vol: 0.5 });
      g.sound.onImpact?.(0.6, 0.25);
      a.hitAt = g.time;
      g.bump(0.35);
      p.override = DOUBLED;
      yield 2.4;
      g.camOverride = { x: (X1.seat + X1.maher) / 2, y: -150, view: 820 };
      yield* say(g, 'g2_2');
      a.lighterOnTable = false;
      yield GAP;
      yield* say(g, 'g2_3');
      s.negotiation_outcome = 'partial';
      s.lighter_taken = true;
    } else {
      s.g_choice = 'deal';
      p.override = SIT_LEAN;
      yield* talk(g, ['g3_1', 'g3_2', 'g3_3', 'g3_4', 'g3_5', 'g3_6']);
      // he draws the valves on a scrap of paper
      p.override = { ...SIT_LEAN, torso: 0.35, armN: 1.2, foreN: 1.9 };
      yield 2.5;
      p.override = SIT;
      yield* say(g, 'g3_7');
      yield* say(g, 'g3_after');
      s.negotiation_outcome = 'success';
      s.body_retrieved = true;
      s.lighter_taken = false;
    }
    // they give back the walkie-talkie (and the lighter, only for the map)
    if (!s.tools.includes('walkie')) s.tools.push('walkie');
    if (!s.lighter_taken && !s.tools.includes('lighter')) s.tools.push('lighter');
    a.onTable = false;
    // he walks back into the dark, the cloth folded under his arm
    yield 1;
    p.override = null;
    g.s1.place(X1.bags[0] + 60);
    g.camOverride = null;
    const t0 = g.time;
    yield* g.walkPlayer(X1.stop - 200);
    yield () => g.time - t0 > 3;
    yield* this.finish(g);
  },

  // ------------------------------------------------------ Part 2 build --

  buildBuilding(g) {
    const s = g.state;
    const p = g.player;
    const L = g.level;
    const a = g.a;
    buildBuilding(L);
    const look = (id, x, y, key, box) => L.add({ id, x, y, range: 90, look: true, label: ['تفحّص', 'Examine'], use: () => line(g, key), ...box });
    look('table', X2.table, floorY(2) - 90, 'table', { box: [150, 90], by: 45 });
    look('drawing', X2.drawing, floorY(2) - 130, 'drawing', { box: [60, 44], by: 10 });
    look('stove', X2.stove, floorY(2) - 40, 'stove', { box: [50, 50], by: 20 });
    look('heights', X2.heights, floorY(4) - 110, 'heights', { box: [84, 196], by: 18 });
    L.add({ id: 'stairs1', x: X2.stairs1[0] + 30, y: -100, range: 70, urgent: true, label: ['اصعد الدرج', 'Climb the stairs'], box: [80, 160], by: 20, enabled: () => !a.climbing && g.player.y > -30, use: () => g.runner.run(this.flight(g, X2.stairs1, 1, 2)) });
    L.add({ id: 'stairs2', x: X2.stairs2[0] + 30, y: floorY(2) - 100, range: 70, urgent: true, label: ['اصعد الدرج', 'Climb the stairs'], box: [80, 160], by: 20, enabled: () => !a.climbing && g.player.y > floorY(3) + 50 && g.player.y < floorY(2) + 50, use: () => g.runner.run(this.climb2(g)) });
    L.add({ id: 'stairs4', x: X2.stairs4[0] + 30, y: floorY(4) - 100, range: 70, urgent: true, label: ['اصعد الدرج', 'Climb the stairs'], box: [80, 160], by: 20, enabled: () => !a.climbing && g.player.y > floorY(5) + 50 && g.player.y < floorY(4) + 50, use: () => g.runner.run(this.climb4(g)) });
    L.add({ id: 'hole', x: X2.hole, y: floorY(5) - 110, range: 90, urgent: true, label: ['انظر من الفتحة', 'Look out'], box: [60, 150], bx: 80, by: 30, enabled: () => !a.viewed && Math.abs(g.player.y - floorY(5)) < 20, use: () => g.runner.run(this.view(g)) });
    L.add({ id: 'pipe', x: X2.pipe - 10, y: floorY(4) - 60, range: 60, urgent: true, label: ['انزل على القسطل', 'Climb down the pipe'], box: [30, 120], bx: 10, by: 20, enabled: () => !a.down && Math.abs(g.player.y - floorY(4)) < 20, use: () => g.runner.run(this.pipe(g)) });
    L.add({ id: 'blanket', x: X2.blanket, y: -40, range: 80, urgent: true, label: ['أمسك أطراف الحرام', 'Take the edges of the blanket'], box: [150, 30], by: 25, enabled: () => !a.dragged && g.player.stance === 'prone', use: () => g.runner.run(this.drag(g)) });
    const cp = s.checkpoint;
    if (cp === 'floor4') p.place(X2.f4edge - 60, floorY(4));
    else if (cp === 'descent') {
      a.viewed = true;
      a.inside = false;
      a.stillGrace = 6;
      p.place(X2.balc5[0] + 20, floorY(5));
    } else p.place(X2.door + 30, 0);
    p.f = 1;
    g.runner.run(this.building(g));
  },

  camera(g) {
    if (g.a.part !== 2) return null;
    const p = g.player;
    return { x: p.x + p.f * 110, y: clamp(p.y - 205, floorY(5) - 260, -205), view: 1300 };
  },

  *building(g) {
    const a = g.a;
    const s = g.state;
    const cp = s.checkpoint;
    if (cp !== 'floor4' && cp !== 'descent') {
      g.checkpoint('building');
      g.fade = 1;
      g.lock();
      g.text.titleCard(CARDS.open, 7);
      yield 1.5;
      for (let k = 1; k >= 0; k -= 0.05) {
        g.fade = k;
        yield 0.05;
      }
      yield 5;
      g.lock(false);
      yield* say(g, 'building');
      yield* say(g, 'dark');
      g.prompt('use', 'اضغط مطوّلاً لتدوير المصباح، ثم اضغط مرة لإضاءته', 'Hold to crank the torch, then tap to switch it on');
      yield () => g.torch.on;
      g.prompt(null);
    } else g.lock(false);
    g.text.objective(a.viewed ? OBJ.down : OBJ.up);
  },

  // F1 → F2: an ordinary flight, still standing.
  *flight(g, [xa, xb], from, to) {
    const p = g.player;
    const a = g.a;
    a.climbing = true;
    g.lock();
    yield* g.walkPlayer(xa + 10);
    const stairs = (d) => stairPose(d * 0.1);
    yield* along(g, p, [[xa + 10, floorY(from)], [xb, floorY(to)]], 80, stairs);
    yield* along(g, p, [[xb, floorY(to)], [xb + 20, floorY(to)]], 90);
    p.place(xb + 20, floorY(to));
    p.f = -1;
    a.climbing = false;
    g.lock(false);
  },

  // F2 → F3: up the flight in the stairwell, over the slab across it.
  *climb2(g) {
    const p = g.player;
    const a = g.a;
    a.climbing = true;
    g.lock();
    const [xa, xb] = X2.stairs2;
    const ya = floorY(2);
    const yb = floorY(3);
    yield* g.walkPlayer(xa + 10);
    const mid = [lerp(xa, xb, 0.45), lerp(ya, yb, 0.45)];
    yield* along(g, p, [[xa + 10, ya], mid], 70, (d) => stairPose(d * 0.1));
    yield* say(g, 'slab');
    // over it, on the rebar: a mantle, the slab grinding under him
    p.override = POSES.reachUp;
    yield 0.5;
    g.sound.noise({ dur: 1.4, freq: 120, type: 'lowpass', vol: 0.5, buf: g.sound.brownBuf, attack: 0.1 });
    g.effects.trickle?.(mid[0] + 20, mid[1] - 120, 2);
    g.bump(0.2);
    a.slabShift = 1;
    yield* along(g, p, [mid, [mid[0] + 40, mid[1] - 70], [mid[0] + 80, mid[1] - 60]], 60, () => POSES.hands);
    yield* say(g, 'slab_holds');
    a.slabCrossed = true;
    yield* along(g, p, [[mid[0] + 80, mid[1] - 60], [xb, yb]], 80, (d) => stairPose(d * 0.1));
    yield* along(g, p, [[xb, yb], [xb + 30, yb]], 90);
    p.place(xb + 30, yb);
    p.override = null;
    a.climbing = false;
    g.lock(false);
  },

  // F4 → F5: the last flight; one step gives way.
  *climb4(g) {
    const p = g.player;
    const a = g.a;
    a.climbing = true;
    g.lock();
    const [xa, xb] = X2.stairs4;
    const ya = floorY(4);
    const yb = floorY(5);
    yield* g.walkPlayer(xa + 10);
    const k = 0.45;
    const mid = [lerp(xa, xb, k), lerp(ya, yb, k)];
    yield* along(g, p, [[xa + 10, ya], mid], 60, (d) => stairPose(d * 0.1));
    // the step breaks: he drops, catches the rail
    a.stepGone = true;
    g.sound.noise({ dur: 0.25, freq: 900, q: 0.8, vol: 0.5 });
    g.sound.noise({ when: g.sound.t + 0.6, dur: 0.3, freq: 300, q: 0.6, vol: 0.4 });
    g.bump(0.3);
    g.effects.puff?.(mid[0], mid[1] + 10, 0.4);
    p.override = { ...POSES.reachUp, armF: 0.3, foreF: 0.5 };
    yield* along(g, p, [mid, [mid[0], mid[1] + 16]], 120, () => ({ ...POSES.reachUp, armF: 0.3, foreF: 0.5 }));
    yield* say(g, 'step_gives');
    yield* along(g, p, [[mid[0], mid[1] + 16], [mid[0] + 20, mid[1] - 20], [xb, yb]], 60, (d) => stairPose(d * 0.1));
    yield* along(g, p, [[xb, yb], [xb + 30, yb]], 90);
    p.place(xb + 30, yb);
    p.override = null;
    a.climbing = false;
    g.lock(false);
    g.text.objective(OBJ.hole);
  },

  // The view from the fifth floor: the street, the checkpoint, the blanket.
  *view(g) {
    const a = g.a;
    a.viewed = true;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(X2.hole - 40);
    g.player.f = 1;
    g.camOverride = { x: 1560, y: -260, view: 1500 };
    g.sound.ambience({ wind: 0.45 }, 2);
    yield 2;
    yield* say(g, 'view');
    yield 1;
    g.camOverride = null;
    a.inside = false;
    g.checkpoint('descent');
    g.lock(false);
    a.stillGrace = g.time + 4;
    g.text.objective(OBJ.down);
    yield* say(g, 'balcony');
    g.prompt('crouch', 'انحنِ', 'Crouch');
  },

  // Down the drainpipe to the alley.
  *pipe(g) {
    const p = g.player;
    const a = g.a;
    a.down = true;
    g.lock();
    g.prompt(null);
    yield* g.walkPlayer(X2.pipe - 14);
    p.stance = 'stand';
    yield* say(g, 'pipe');
    const climb = (dist) => {
      const q = Math.sin(dist * 0.06);
      return { ...POSES.reachUp, torso: 0.05, armN: 2.5 + 0.3 * q, foreN: 2.9, armF: 2.5 - 0.3 * q, foreF: 2.9, thighN: 0.6 + 0.3 * q, shinN: -0.4, thighF: 0.6 - 0.3 * q, shinF: -0.4 };
    };
    const t0 = g.time;
    for (const y of [floorY(4) + 40, -380, -250, -120, -40]) {
      yield* along(g, p, [[X2.pipe - 14, p.y], [X2.pipe - 14, y]], 55, climb);
      if (g.time - t0 < 30) g.sound.noise({ dur: 0.3, freq: 700, q: 3, vol: 0.12 }); // the pipe creaks
    }
    yield* along(g, p, [[X2.pipe - 14, -40], [X2.pipe - 20, 0]], 90);
    p.place(X2.pipe - 20, 0);
    p.override = null;
    g.lock(false);
    yield* say(g, 'alley');
    g.text.objective(OBJ.crawl);
    g.prompt('prone', 'انبطح وازحف', 'Go prone, and crawl');
  },

  // Take the blanket's edges and pull him back into the shadow.
  *drag(g) {
    const p = g.player;
    const a = g.a;
    a.dragged = true;
    g.lock();
    g.prompt(null);
    g.text.objective(null);
    yield* say(g, 'blanket');
    a.blanketX = X2.blanket;
    // the weight under the blanket, head towards him
    a.body = new Shroud(g.level, X2.blanket - 62, 0, 1);
    p.f = 1;
    const x0 = p.x;
    const tx = X2.shade - 40;
    // backwards on his belly, the weight coming after him: a pull, a rest,
    // the blanket scraping on the gravel with each pull
    let stroke = -1;
    const pull = (dist) => {
      const n = Math.floor(dist / 38);
      if (n !== stroke) {
        stroke = n;
        g.sound.noise({ dur: 0.5, freq: 1300, q: 0.7, vol: 0.09, attack: 0.08 });
        g.sound.noise({ dur: 0.3, freq: 300, type: 'lowpass', vol: 0.12, buf: g.sound.brownBuf });
      }
      a.blanketX = p.x + 64;
      // his hands on its edges at the shoulders: each pull a surge, then the
      // weight comes after
      const surge = Math.max(0, Math.sin((dist / 38) * Math.PI * 2)) * 6;
      a.body.pull([p.x + 44 - surge, -16]);
      return crawlPose(-dist * 0.083);
    };
    // (facing the body the whole way: he goes backwards)
    yield* along(g, p, [[x0, 0], [tx, 0]], 24, pull, 1);
    a.body.pull(null);
    p.f = 1;
    yield 0.2;
    g.line(null, [LINES.drag.ar, LINES.drag.en], LINES.drag.dur, 'examine');
    markDraft(g, LINES.drag);
    // he sits, and rests one hand on it, where the shoulder would be
    p.override = { ...POSES.sitGround, armN: 1.35, foreN: 1.45, head: 0.35 };
    g.sound.ambience({ wind: 0.1, air: 0.15 }, 3);
    yield 6;
    const s = g.state;
    s.body_retrieved = true;
    s.dangerous_route_complete = true;
    s.courage = (s.courage || 0) + 1;
    yield* this.finish(g);
  },

  // A shot that means to kill, and misses by a hand's width: back into cover.
  *nearMiss(g, back, key) {
    const p = g.player;
    const a = g.a;
    a.shotBusy = true;
    g.lock();
    const hx = p.x + p.f * 60;
    const hy = p.y - 90 - Math.random() * 40;
    g.sound.sniperCrack();
    g.effects.puff(hx, hy);
    Object.assign(a, { shotAt: g.time, shotX: hx, shotY: hy });
    g.bump(0.25);
    if (g.settings.get('physics')) {
      // he throws himself down, away from the shot
      p.knockDown([-p.f * 300, -200], { then: null });
      yield 0.9;
    } else yield 0.5;
    g.fade = 0.5;
    yield 0.2;
    p.place(back.x, back.y);
    p.stance = back.stance;
    g.fade = 0;
    g.state.lane_retries = (g.state.lane_retries || 0) + 1;
    line(g, key);
    g.lock(false);
    a.shotBusy = false;
  },

  *finish(g) {
    const s = g.state;
    s.completed = true;
    writeSave(s);
    const t0 = g.time;
    yield () => {
      g.a.endFade = clamp((g.time - t0) / 2);
      return g.a.endFade >= 1;
    };
    g.fade = 1;
    g.sound.ambience({ crowd: 0, wind: 0.05, air: 0.1, generator: 0, traffic: 0 }, 2);
    yield 1;
    g.sound.ney(196, 10, 0.16);
    g.text.titleCard(CARDS.after, 6);
    yield 6.5;
    // and on into the night walk (Part 3), straight on
    if (g.onPart) g.onPart(s);
    else g.onEnd?.(s);
  },

  // ============================================== per-frame extras ==

  update(g, dt) {
    g.a.body?.update(dt);
    const a = g.a;
    const p = g.player;
    g.lastDt = dt;
    // crickets, loud in the silence (quieter inside)
    if (g.time > a.nextChirp && g.scene === 'street') {
      a.nextChirp = g.time + 0.25 + Math.random() * 0.7;
      const f = 4300 + Math.random() * 700;
      const pan = Math.random() * 2 - 1;
      const v = a.inside ? 0.004 : 0.011;
      for (let i = 0; i < 3; i++) g.sound.tone(f, 0.028, { when: g.sound.t + i * 0.055, vol: v, pan });
    }
    if (a.part === 1) {
      // the checkpoint's radio, now and then
      if (g.time > a.nextRadio && p.x > X1.shout - 300) {
        a.nextRadio = g.time + 7 + Math.random() * 9;
        g.sound.radio(0.8 + Math.random());
      }
      return;
    }
    // the building settles and groans
    if (a.inside && g.time > (a.nextGroan || 6)) {
      a.nextGroan = g.time + 14 + Math.random() * 14;
      g.sound.groan?.();
    }
    if (a.shotBusy || g.locked) return;
    // lines as he comes to things, once each
    const once = (k, cond) => {
      if (!a[`said_${k}`] && cond) {
        a[`said_${k}`] = true;
        line(g, k);
      }
    };
    const onFloor = (n) => Math.abs(p.y - floorY(n)) < 30;
    once('wardrobe', onFloor(3) && p.x > X2.wardrobe[0] - 120 && p.x < X2.wardrobe[0]);
    once('lowceil', onFloor(3) && p.x > X2.lowceil[0] - 110 && p.x < X2.lowceil[0]);
    if (!a.said_gap && onFloor(3) && p.x > X2.mound[0] - 60) g.prompt('jump', 'اقفز وتمسّك', 'Jump, and pull yourself up');
    once('gap', onFloor(3) && p.x > X2.mound[0] - 60);
    if (a.f4 && !a.promptCleared) {
      a.promptCleared = true;
      g.prompt(null);
    }
    // up onto the fourth floor: a piece of the edge breaks away
    if (!a.f4 && p.y <= floorY(4) + 2 && !p.mantle) {
      a.f4 = true;
      g.sound.noise({ dur: 0.3, freq: 400, q: 0.6, vol: 0.4 });
      g.sound.noise({ when: g.sound.t + 0.9, dur: 0.6, freq: 180, type: 'lowpass', vol: 0.5, buf: g.sound.brownBuf });
      g.effects.puff(X2.f4edge, floorY(4) + 10, 0.5);
      g.bump(0.2);
      g.checkpoint('floor4');
    }
    // the balconies are in the open: stay low
    const onBalcony = p.x > X2.b1 && p.y < floorY(3);
    // (standing still up there is seen too, only a little more slowly)
    if (onBalcony && p.stance === 'stand' && !g.locked && !p.down) {
      a.expose = (a.expose || 0) + dt * (Math.abs(p.vx) > 5 ? 1 : g.time > (a.stillGrace || 0) ? 0.6 : 0);
      if (a.expose > 0.8) {
        a.expose = 0;
        g.runner.run(this.nearMiss(g, { x: X2.hole - 30, y: floorY(5), stance: 'crouch' }, 'miss_1'));
      }
    } else if (!onBalcony) a.expose = 0;
    else a.expose = Math.max(0, (a.expose || 0) - dt);
    // the moonlit street: only on his belly
    if (a.down && !a.dragged && p.x > X2.shade && p.y > -5) {
      once('moon', true);
      if (p.stance !== 'prone' && !p.down) {
        a.expose2 = (a.expose2 || 0) + dt;
        if (a.expose2 > 0.5) {
          a.expose2 = 0;
          g.runner.run(this.nearMiss(g, { x: X2.shade - 30, y: 0, stance: 'prone' }, 'miss_2'));
        }
      } else a.expose2 = 0;
    }
  },

  useTool(g, id) {
    if (id === 'whitecloth') g.line(null, ['القماشة البيضا.', 'The white cloth.'], 2, 'item');
    else if (id === 'walkie') {
      g.sound.squelch();
      g.line(['لاسلكي', 'Walkie-talkie'], ['...ما في شي...', '...nothing...'], 2, 'radio');
    } else if (id === 'lighter') {
      g.sound.click();
    }
  },

  draw(R, g) {
    if (g.a.part === 1) drawApproach(R, g);
    else drawBuilding(R, g);
  },

  look(g) {
    return nightLook(g);
  },
};
