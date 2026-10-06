// Act 3, Parts 4 to 6: The Small Hours (الساعات الصغيرة), 1 am to dawn.
// script/act3.md, scenes 3D (the visions), 3E (the flashbacks) and 3F (the
// rooftop). Every path comes this way.
//
// Sami walks a night street he has known all his life, and the places on it
// open: the basement steps become Ahmad's classroom, full and candlelit; an
// archway opens on the orchards as they were; a shop window holds a younger
// face, and Damascus in 2010 behind it. Then older things: an Eid when a
// knock at the door stopped a room breathing; the first Friday, chanting;
// a note passed in a classroom under a portrait, and his father in the
// kitchen. Last, the tallest building's stairs, and its roof: Damascus lit
// five kilometres away, Ghouta dark all round, and the dawn call to prayer.
//
// The memories are places of their own, far off along the same ground (see
// act3v-map.js); while one is open g.a.mem names it, and Sami is moved into
// it, younger where the script makes him younger. g.scene stays 'street', so
// he can be walked and spoken to there as anywhere. Lines come from
// act3v-lines.js by key; prompts and objectives here are in Modern Standard
// Arabic.

import { clamp, lerp, smooth } from '../engine/util.js';
import { POSES, OUTFITS, Person, stairPose } from '../rigs/person.js';
import { writeSave } from '../engine/save.js';
import { along } from './act3r.js';
import { X4, MEM, CAFE_X, DUMPSTER_X } from './act3v-map.js';
import { LINES, WHO, CARDS } from './act3v-lines.js';
import { surfaceAt, streetLook, drawStreet, shopWindowRect, PORTRAIT } from './act3v-set.js';
import { drawVisionClassroom, visionClassroomLook, DESKS, BOARD_X, drawOrchard, orchardLook, drawDamascus, drawDamascusTraffic, damascusLook, CAFE_WINDOW } from '../sets/visions.js';
import { drawEid, drawProtest, drawDumpster, drawSchool, drawKitchen, memoryLook, EID_SEATS, EID_HEAD_X, EID_DOOR_X, SCHOOL_DESKS, TEACHER_X, KITCHEN_DOOR_X } from '../sets/memories.js';
import { drawStairwell, stairPath, stairLook, drawRoof, roofLook, LOOKOUTS, HUT_DOOR } from '../sets/rooftop.js';

const OBJ = {
  march: ['امشِ مع الناس', 'Walk with the crowd'],
  run: ['اركض إلى الزقاق', 'Run for the alley'],
  torch: ['سلّط المصباح على الجدار', 'Shine the torch on the wall'],
  roof: ['اصعد إلى السطح', 'Climb to the roof'],
};
// The order the night goes in, as checkpoints.
const ORDER = ['classroom', 'orchard', 'damascus', 'eid', 'protest', 'mukhabarat', 'roof'];
const STREET_BOUNDS = [-300, X4.end + 200];

// Sami at other ages: no beard, no pouch, other clothes.
const YOUNG = {
  22: { ...OUTFITS.sami, beard: 'none', top: '#3f6f8a', sleeve: 'short', rolled: false, pouch: false, watch: false, footwear: 'shoe' },
  24: { ...OUTFITS.sami, beard: 'none', top: '#6d7f8c', pouch: false, watch: false },
  15: { ...OUTFITS.sami, beard: 'none', top: '#8a6f5a', pouch: false, watch: false, belt: null },
  10: { ...OUTFITS.sami, beard: 'none', top: '#c7c2b2', sleeve: 'short', rolled: false, pouch: false, watch: false, belt: null, trousers: '#3b4256' },
};
const YOUNG_AHMAD = { ...OUTFITS.khaled, beard: 'stubble', layer: null, satchel: null, top: '#d2c7ae' };

const SIT = (seat, extra = {}) => ({ ...POSES.sitChair, seat, ...extra });
const WRITE = { ...POSES.stand, armN: 2.35, foreN: 2.7, head: -0.2 };
const REACH_GLASS = { ...POSES.stand, armN: 1.5, foreN: 1.65, head: 0.05 };

// ------------------------------------------------------------- helpers --

function* say(g, key) {
  const L = LINES[key];
  const step = g.say(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
  const first = step.next();
  markDraft(g, L);
  yield first.value;
  yield* step;
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

// Ease a value on g.a (or g itself, for fade) from where it is to `to`.
function* tween(g, key, to, dur, obj = g.a) {
  const from = obj[key] || 0;
  const t0 = g.time;
  yield () => {
    const k = clamp((g.time - t0) / dur);
    obj[key] = lerp(from, to, smooth(0, 1, k));
    return k >= 1;
  };
}
const fadeTo = (g, to, dur) => tween(g, 'fade', to, dur, g);

// A few soft knocks on a wooden door.
function knock(g) {
  for (let i = 0; i < 3; i++) g.sound.noise({ when: g.sound.t + i * 0.24, dur: 0.09, freq: 180, q: 1.4, vol: 0.6, type: 'lowpass' });
}
// His own heartbeat, after a vision.
function heartbeat(g, n = 4) {
  for (let i = 0; i < n; i++) {
    const w = g.sound.t + i * 0.9;
    g.sound.tone(52, 0.12, { when: w, vol: 0.32, to: 40 });
    g.sound.tone(48, 0.1, { when: w + 0.22, vol: 0.22, to: 38 });
  }
}
// Two young men out of breath behind a dumpster.
function breaths(g, n = 6) {
  for (let i = 0; i < n; i++) g.sound.noise({ when: g.sound.t + i * 0.55, dur: 0.32, freq: 900, q: 0.7, vol: 0.12 * (1 - i / (n + 2)), attack: 0.05 });
}

// Someone in a memory: placed, posed, out of the way of the street's people.
function actor(g, outfit, x, { f = 1, pose = null, scale = 1, o = null } = {}) {
  const w = g.npc(outfit, x, { f, scale });
  if (o) w.rig.o = { ...w.rig.o, ...o };
  if (pose) w.override = pose;
  w.update(0.016, {});
  return w;
}

export const ACT3V = {
  bounds: [-300, MEM.roof[0] + MEM.roof[1] + 200],

  build(g) {
    const s = g.state;
    const L = g.level;
    const p = g.player;
    g.a = { part: 4, mem: null, done: {}, dream: 0, dreamK: 0, empty: 0, wither: 0, fold: 0, memK: 0, hush: 0, dawn: 0, scatter: 0, nextChirp: 0, nextDog: 6 };
    g.surface = (x) => (g.a.mem === 'stairs' ? 'hollow' : g.a.mem ? 'tile' : surfaceAt(x));
    for (const id of ['torch']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = 'torch';
    g.torch.charge = Math.max(g.torch.charge, 0.5);
    g.level.bounds = [...STREET_BOUNDS];
    g.sound.ambience({ wind: 0.14, air: 0.22, crowd: 0, generator: 0, traffic: 0 }, 3);
    g.sound.life(0.12);
    g.sound.score?.mood('after', 3);

    // the street's own things to look at
    const look = (id, x, y, key, box) => L.add({ id, x, y, range: 110, look: true, label: ['تفحّص', 'Examine'], enabled: () => !g.a.mem, use: () => line(g, key), ...box });
    look('stair', X4.classroom, -40, 'stair', { box: [120, 90], by: 20 });
    look('tower', X4.tower, -120, 'tower', { box: [140, 220], by: 40 });
    look('portraitLook', PORTRAIT.x + PORTRAIT.w / 2, PORTRAIT.y + PORTRAIT.h / 2, 'portrait', { box: [PORTRAIT.w + 40, PORTRAIT.h + 40], enabled: () => !g.a.mem && !g.a.done.mukhabarat });
    L.add({ id: 'climb', x: X4.tower, y: -80, range: 90, urgent: true, label: ['اصعد إلى السطح', 'Climb to the roof'], box: [90, 180], by: 10, enabled: () => !g.a.mem && g.a.done.mukhabarat && !g.a.climbing, use: () => g.runner.run(this.climb(g)) });

    // memory things (only while their memory is open)
    L.add({ id: 'grape', x: MEM.orchard[0] - 640, y: -150, range: 90, urgent: true, label: ['اقطف عنقوداً', 'Pick a bunch'], box: [60, 60], enabled: () => g.a.mem === 'orchard' && !g.a.picked && !g.locked, use: () => g.runner.run(this.pick(g)) });
    L.add({ id: 'glass', x: CAFE_X - 60, y: -120, range: 110, urgent: true, label: ['المس الزجاج', 'Touch the glass'], box: [120, 140], by: 20, enabled: () => g.a.mem === 'damascus' && g.a.seated && !g.locked, use: () => g.runner.run(this.glass(g)) });
    L.add({ id: 'note', x: 0, y: -80, range: 90, urgent: true, label: ['اقرأ الورقة', 'Read the note'], box: [50, 40], enabled: () => g.a.mem === 'school' && g.a.notePassed && !g.a.noteRead && !g.locked, use: () => (g.a.noteRead = true) });
    L.add({ id: 'damascus', x: LOOKOUTS.damascus, y: -120, range: 160, look: true, label: ['تأمّل', 'Look'], box: [160, 120], enabled: () => g.a.mem === 'roof' && !g.locked, use: () => line(g, 'damascus') });
    L.add({ id: 'ghouta', x: LOOKOUTS.ghouta, y: -120, range: 160, look: true, label: ['تأمّل', 'Look'], box: [160, 120], enabled: () => g.a.mem === 'roof' && !g.locked, use: () => line(g, 'ghouta') });

    // where the night has got to
    const cp = s.checkpoint && ORDER.includes(s.checkpoint) ? s.checkpoint : 'classroom';
    const i = ORDER.indexOf(cp);
    for (const k of ORDER.slice(0, i)) g.a.done[k === 'mukhabarat' ? 'mukhabarat' : k] = true;
    const at = { classroom: X4.start + 60, orchard: X4.classroom + 160, damascus: X4.arch + 160, eid: X4.shop + 200, protest: X4.shutter + 200, mukhabarat: X4.minaret + 200, roof: X4.portrait + 260 }[cp];
    p.place(at);
    p.f = 1;
    g.runner.run(this.open(g, cp === 'classroom'));
  },

  // In from black; the title the first time.
  *open(g, first) {
    g.fade = 1;
    g.lock();
    if (first) {
      g.checkpoint('classroom');
      g.text.titleCard(CARDS.open, 5.5);
      yield 2.5;
    } else yield 0.6;
    yield* fadeTo(g, 0, 2.5);
    g.lock(false);
  },

  // ============================================================ memory ==

  // Into a remembered (or dreamed) place: from black, moved there, younger.
  *enter(g, mem, x, { o = null, scale = 1, f = 1, cam = null } = {}) {
    const a = g.a;
    const p = g.player;
    g.lock();
    if (g.fade < 0.99) yield* fadeTo(g, 1, 0.9);
    a.back = { x: p.x, f: p.f, o: p.rig.o, scale: p.rig.scale };
    a.mem = mem;
    a.memK = 0;
    a.dream = 0;
    g.torch.on = false;
    g.sound.life(0);
    if (o) p.rig.o = o;
    p.rig.scale = scale;
    p.override = null;
    p.arms = null;
    const [c, hw] = MEM[mem];
    g.level.bounds = [c - hw, c + hw];
    p.place(x, 0);
    p.f = f;
    g.camOverride = cam;
    g.snapCamera();
  },

  // And back to the street, older again, in the dark.
  *back(g, x = null) {
    const a = g.a;
    const p = g.player;
    g.lock();
    if (g.fade < 0.99) yield* fadeTo(g, 1, 1.2);
    for (const w of g.npcs) w.visible = false;
    g.npcs = [];
    a.mem = null;
    a.memK = 0;
    a.hush = 0;
    a.dreamK = 0;
    p.rig.o = a.back.o;
    p.rig.scale = a.back.scale;
    p.override = null;
    p.arms = null;
    g.level.bounds = [...STREET_BOUNDS];
    p.place(x ?? a.back.x, 0);
    p.f = a.back.f;
    g.camOverride = null;
    g.snapCamera();
    g.sound.setMuffle(0, 0.3);
    g.sound.score?.mood('after', 3);
    g.sound.ambience({ wind: 0.14, air: 0.22, crowd: 0, generator: 0, traffic: 0 }, 0.6);
    g.sound.life(0.12);
  },

  // The street begins to shift as he walks: grey, then too bright.
  *dreamIn(g, dur = 2.4) {
    g.sound.setMuffle(0.6, dur);
    yield* tween(g, 'dream', 1, dur);
  },

  // ============================================ 3D-1: the classroom ==

  *vision1(g) {
    const a = g.a;
    const p = g.player;
    const s = g.state;
    a.done.classroom = true;
    g.lock();
    p.f = 1;
    yield* this.dreamIn(g, 2.6);
    const [c] = MEM.classroom;
    yield* this.enter(g, 'classroom', c - 330, { cam: { x: c, y: -170, view: 900 } });
    a.empty = 0;
    a.dreamK = 1;
    g.sound.setMuffle(0, 0.5);
    g.sound.score?.mood('memory', 2);
    // the students: grown people at children's desks, writing
    const who = ['man2', 'layla', 'man', 'woman2', 'man3'];
    if (s.helped_old_man === false) who.unshift('oldman'); // he's here, if Sami walked past him
    const students = DESKS.slice(0, who.length).map(([x, y], i) => actor(g, who[i], x, { f: 1, pose: SIT(-y, { torso: 0.18, head: 0.4, armN: 0.75, foreN: 1.6 }) }));
    const ahmad = actor(g, 'khaled', BOARD_X, { f: 1, pose: WRITE });
    ahmad.face?.('back');
    yield* fadeTo(g, 0, 1.6);
    yield 1.6;
    // he turns
    ahmad.face?.('side');
    ahmad.f = -1;
    ahmad.override = { ...POSES.stand, head: 0.05 };
    yield 0.8;
    yield* say(g, 'late');
    yield 0.6;
    // Sami tries to speak, and nothing comes
    p.override = { ...POSES.stand, head: -0.1, armN: 0.5, foreN: 1.0 };
    yield* say(g, 'noVoice');
    p.override = null;
    ahmad.face?.('back');
    ahmad.override = WRITE;
    yield* say(g, 'tenses');
    // he may come in as far as the back row, not walk through them
    const edge = DESKS[0][0] - 70;
    g.gate = (m) => (m > 0 && p.x >= edge ? 0 : m);
    g.lock(false);
    const t0 = g.time;
    yield () => g.time - t0 > 9 || p.x >= edge - 4;
    g.gate = null;
    g.lock();
    p.vx = 0;
    ahmad.face?.('side');
    ahmad.f = p.x < ahmad.x ? -1 : 1;
    ahmad.override = { ...POSES.stand, head: 0.12 };
    yield 1.4;
    yield* say(g, 'lesson');
    yield 1.2;
    // a blink, and the room is as it is
    g.sound.score?.cut?.('after', 1);
    yield* tween(g, 'empty', 0.5, 0.8);
    for (const w of [...students, ahmad]) w.visible = false;
    yield* tween(g, 'empty', 1, 1.4);
    a.dreamK = 0;
    g.sound.ambience({ wind: 0.05, air: 0.1, crowd: 0, generator: 0, traffic: 0 }, 0.2);
    g.torch.on = true;
    yield 1.2;
    heartbeat(g, 4);
    yield 3.4;
    g.sound.ambience({ wind: 0.14, air: 0.22 }, 2);
    yield 1;
    yield* this.back(g, X4.classroom + 60);
    g.checkpoint('orchard');
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
  },

  // ============================================== 3D-2: the orchard ==

  *vision2(g) {
    const a = g.a;
    const p = g.player;
    a.done.orchard = true;
    g.lock();
    yield* this.dreamIn(g, 1.8);
    const [c] = MEM.orchard;
    yield* this.enter(g, 'orchard', c - 1100);
    a.wither = 0;
    a.dreamK = 1;
    g.sound.setMuffle(0, 0.5);
    g.sound.score?.mood('memory', 2);
    g.sound.ambience({ wind: 0.12, air: 0.05, crowd: 0, generator: 0, traffic: 0 }, 1);
    g.sound.birds();
    // far down the rows, walking away
    const ahmad = actor(g, 'khaled', c + 420, { f: 1 });
    a.farAhmad = ahmad;
    yield* fadeTo(g, 0, 1.8);
    g.lock(false);
    // he walks on through it; the orchard dies when he is well in
    yield () => p.x > c + 150 && !g.locked;
    g.lock();
    p.vx = 0;
    a.farAhmad = null;
    g.sound.setMuffle(0.7, 3);
    yield* tween(g, 'wither', 1, 3.4);
    ahmad.visible = false;
    a.dreamK = 0;
    g.sound.setMuffle(0, 0.6);
    g.sound.ambience({ wind: 0.22, air: 0.18 }, 0.6);
    g.sound.strikeFar?.(0.8);
    yield 3;
    yield* this.back(g, X4.arch + 60);
    g.checkpoint('damascus');
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
  },

  // A bunch of grapes that isn't there.
  *pick(g) {
    const a = g.a;
    const p = g.player;
    a.picked = true;
    g.lock();
    p.vx = 0;
    p.override = { ...POSES.stand, armN: 2.1, foreN: 2.35, head: -0.25 };
    yield 0.9;
    p.override = { ...POSES.stand, armN: 2.3, foreN: 2.5, head: -0.25 };
    yield 0.5;
    yield* say(g, 'grape');
    p.override = null;
    g.lock(false);
  },

  // ============================================= 3D-3: Damascus ==

  *vision3(g) {
    const a = g.a;
    const p = g.player;
    a.done.damascus = true;
    g.lock();
    // the reflection isn't his
    const r = shopWindowRect();
    p.vx = 0;
    p.f = 1;
    yield* g.walkPlayer(r.x + r.w * 0.22);
    a.reflect = 0;
    p.face?.('back');
    yield* tween(g, 'reflect', 1, 1.6);
    yield* say(g, 'window');
    // he turns —
    p.face?.('side');
    p.f = -1;
    yield 0.3;
    yield* this.dreamIn(g, 1.2);
    a.reflect = 0;
    const [c] = MEM.damascus;
    yield* this.enter(g, 'damascus', c - 1000);
    a.fold = 0;
    a.dreamK = 1;
    g.sound.setMuffle(0.15, 0.5); // a city slightly out of tune
    g.sound.ambience({ traffic: 0.8, crowd: 0.45, wind: 0.05, air: 0, generator: 0 }, 1);
    g.sound.score?.mood('memory', 2);
    // people going about their afternoon, who don't see him
    const passers = [['man', -700], ['woman2', -300], ['man3', 200], ['woman', 650], ['man2', 1100], ['kid2', -150]].map(([o, dx], i) =>
      actor(g, o, c + dx, { f: i % 2 ? -1 : 1, scale: o.startsWith('kid') ? 0.62 : 1 }),
    );
    a.passers = passers;
    // and himself at twenty-two, crossing to the café
    const young = actor(g, 'sami', c - 760, { f: 1, o: YOUNG[22] });
    young.override = null;
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
    g.runner.run(g.walkNpc(young, CAFE_X - 150, { speedScale: 0.85 }));
    yield () => young.goal === null;
    young.visible = false;
    // through the window: the two of them at a table
    const sx = CAFE_WINDOW.x + CAFE_WINDOW.w * 0.32;
    const ax = CAFE_WINDOW.x + CAFE_WINDOW.w * 0.68;
    // inside, at a table by the window: seen through the glass, from the street
    const floor = CAFE_WINDOW.y + CAFE_WINDOW.h + 46;
    const ys = actor(g, 'sami', sx, { f: 1, o: YOUNG[22], pose: SIT(42, { armN: 0.9, foreN: 1.9 }) });
    const ya = actor(g, 'khaled', ax, { f: -1, o: YOUNG_AHMAD, pose: SIT(42, { armN: 1.6, foreN: 2.3, armF: 1.2, foreF: 2.0 }) });
    for (const w of [ys, ya]) {
      w.place(w.x, floor);
      w.scripted = true; // (held at the café's floor, not the street's)
      w.inside = true;
    }
    // Ahmad talks with his hands, as he always did; young Sami stirs his coffee
    a.cafe = { ys, ya };
    a.seated = true;
    yield () => a.touched;
    a.passers = null;
  },

  // His hand on the café window; it's cold. Damascus folds away.
  *glass(g) {
    const a = g.a;
    const p = g.player;
    g.lock();
    p.vx = 0;
    p.f = 1;
    p.override = REACH_GLASS;
    yield 0.8;
    yield* say(g, 'glass');
    g.sound.setMuffle(0.8, 2.4);
    yield* tween(g, 'fold', 0.6, 1.6);
    for (const w of g.npcs) w.visible = false;
    yield* tween(g, 'fold', 1, 1.2);
    a.dreamK = 0;
    g.sound.ambience({ traffic: 0, crowd: 0, wind: 0.14, air: 0.2 }, 0.3);
    g.sound.setMuffle(0, 0.3);
    yield 2.4;
    p.override = null;
    a.touched = true;
    yield* this.back(g, X4.shop + 80);
    g.checkpoint('eid');
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
  },

  // ================================================ 3E-1: Eid, 2008 ==

  *eid(g) {
    const a = g.a;
    const p = g.player;
    a.done.eid = true;
    g.lock();
    p.vx = 0;
    yield 0.4;
    const [c] = MEM.eid;
    const seats = EID_SEATS;
    yield* this.enter(g, 'eid', seats[1][0], { o: YOUNG[15], scale: 0.9, cam: { x: c, y: -170, view: 1000 } });
    p.override = SIT(-seats[1][1] / 0.9, { armN: 0.6, foreN: 1.5 });
    g.text.titleCard(CARDS.y2008, 3);
    g.sound.score?.mood('memory', 2);
    g.sound.ambience({ crowd: 0.55, traffic: 0.05, wind: 0, air: 0, generator: 0 }, 1);
    // fifteen people round a table for eight
    const at = (o, i, extra = {}, f = 1) => actor(g, o, seats[i][0], { f, pose: SIT(-seats[i][1], extra), ...extra.opt });
    // a meal going on: people turned to each other in pairs, eating, talking,
    // a hand in a lap, a glass raised; no two the same
    const MEAL = [
      { armN: 0.35, foreN: 1.1, head: 0.15 }, // hands in her lap
      { armN: 0.6, foreN: 2.35, head: 0.05 }, // a bite
      { armN: 0.85, foreN: 1.45, head: -0.05, torso: 0.08 }, // talking with his hands
      { armN: 0.5, foreN: 1.75, head: 0.2, torso: 0.12 }, // eating, head down
      { armN: 0.25, foreN: 0.9, head: -0.1, torso: -0.05 }, // leaning back, laughing
      { armN: 0.7, foreN: 2.5, head: 0.0 }, // a glass of juice
    ];
    const mother = at('woman', 0, { ...MEAL[0] }, -1);
    const uncle = at('man', 2, { ...MEAL[2] }, -1);
    const others = [];
    for (let i = 3; i < seats.length - 1; i++) {
      // pairs face each other: odd seats turn left, even seats right
      others.push(at(['man2', 'woman2', 'man3', 'layla', 'oldman', 'woman'][(i - 3) % 6], i, { ...MEAL[(i * 2 + 1) % MEAL.length] }, i % 2 ? -1 : 1));
    }
    const kids = [actor(g, 'boy', EID_DOOR_X + 140, { f: 1, scale: 0.6, pose: POSES.sitGround }), actor(g, 'kid3', EID_DOOR_X + 200, { f: -1, scale: 0.55, pose: POSES.sitGround })];
    const father = actor(g, 'abuyazan', EID_HEAD_X, { f: -1, o: { headwear: null, layer: { kind: 'jacket', color: '#4a4740' } }, pose: { ...POSES.stand } });
    // drawn first, so when he walks to the door he passes behind the diners
    g.npcs = [father, ...g.npcs.filter((w) => w !== father)];
    const all = [mother, uncle, ...others, ...kids, father];
    yield* fadeTo(g, 0, 1.4);
    yield 2.4;
    father.override = { ...POSES.stand, armN: 2.2, foreN: 2.4, head: -0.05 };
    yield* say(g, 'eid');
    yield* say(g, 'andYou');
    father.override = { ...POSES.stand, armN: 0.9, foreN: 1.6, torso: 0.15 }; // carving
    yield 3.2;
    // a knock at the door. The room goes silent. Instantly.
    knock(g);
    g.sound.ambience({ crowd: 0, traffic: 0, wind: 0, air: 0 }, 0.05);
    g.sound.score?.cut?.('silence', 0.1);
    for (const w of all) w.override = { ...(w.override || POSES.stand) }; // everyone stops where they are
    father.override = { ...POSES.stand, head: 0.1 };
    mother.override = SIT(-seats[0][1], { armN: 1.25, foreN: 1.35, head: 0.15 }); // her hand finds his arm
    yield* tween(g, 'hush', 1, 0.35);
    yield 3; // three seconds
    // he goes to the door
    father.face?.('side');
    father.f = -1;
    g.runner.run(g.walkNpc(father, EID_DOOR_X + 90, { speedScale: 0.6 }));
    yield () => father.goal === null;
    g.sound.cloth();
    yield* tween(g, 'eidDoor', 1, 0.7);
    const neighbour = actor(g, 'man3', EID_DOOR_X + 10, { f: 1, pose: { ...POSES.stand, armN: 1.3, foreN: 1.7 } }); // a tray of baklava
    g.camOverride = { x: EID_DOOR_X + 300, y: -170, view: 1000 };
    yield 0.5;
    yield* say(g, 'baklava');
    // the room breathes out
    yield* tween(g, 'hush', 0, 0.8);
    g.sound.ambience({ crowd: 0.55 }, 0.8);
    mother.override = SIT(-seats[0][1], { armN: 0.5, foreN: 1.4 });
    yield 2.6;
    neighbour.visible = false;
    yield* tween(g, 'eidDoor', 0, 0.6);
    yield 0.8;
    // but he remembers her hand on his arm
    g.sound.setMuffle(0.8, 2);
    yield* tween(g, 'memK', 1, 2.2);
    yield* this.back(g, X4.shutter + 80);
    g.checkpoint('protest');
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
  },

  // ======================================= 3E-2: the first protest ==

  *protest(g) {
    const a = g.a;
    const p = g.player;
    a.done.protest = true;
    g.lock();
    p.vx = 0;
    const [c, hw] = MEM.protest;
    yield* this.enter(g, 'protest', c - hw + 220, { o: YOUNG[24] });
    a.scatter = 0;
    g.text.titleCard(CARDS.y2011, 3);
    g.sound.score?.mood('tense', 2);
    g.sound.ambience({ crowd: 0.7, traffic: 0.05, wind: 0.1, air: 0, generator: 0 }, 1.5);
    const ahmad = actor(g, 'khaled', p.x + 50, { f: 1, o: YOUNG_AHMAD });
    // people pouring out of the mosque, and not going home
    const outfits = ['man', 'man2', 'man3', 'fadi', 'spotter', 'medic', 'man', 'man2', 'man3', 'boy', 'man', 'man2', 'man3', 'man', 'fadi', 'man2', 'medic', 'man3', 'man', 'spotter', 'man2', 'man'];
    const crowd = outfits.map((o, i) => {
      const w = actor(g, o, c - hw + 330 + i * 46 + (i % 3) * 13, { f: 1, scale: o === 'boy' ? 0.85 : 0.96 + (i % 4) * 0.02 });
      // some walk with a fist up, as the chant goes
      if (i % 3 === 1) w.arms = { armN: 2.7, foreN: 3.0 };
      return w;
    });
    yield* fadeTo(g, 0, 1.4);
    // the crowd begins to move, down the main street
    crowd.forEach((w, i) => g.runner.run(g.walkNpc(w, c + 300 + i * 40, { speedScale: 0.42 + (i % 4) * 0.03 })));
    a.chanting = true;
    a.nextChant = g.time + 1.2;
    yield 3.6;
    ahmad.f = -1;
    ahmad.override = { ...POSES.stand, head: 0.05 };
    yield* say(g, 'go');
    ahmad.override = null;
    ahmad.f = 1;
    // into the current: he walks with them, and Ahmad beside him
    g.text.objective(OBJ.march);
    g.gate = (m) => Math.max(0, m) * 0.6;
    g.stanceLock = 'stand';
    a.follow = ahmad;
    g.lock(false);
    yield () => p.x > c + 60;
    // gunfire. Far at first, then closer.
    g.text.objective(null);
    a.chanting = false;
    g.sound.distantShot();
    yield 0.5;
    g.sound.distantShot();
    yield 0.35;
    g.sound.sniperCrack();
    g.sound.ambience({ crowd: 0.9 }, 0.2);
    yield* tween(g, 'scatter', 0.3, 0.3);
    crowd.forEach((w, i) => {
      w.goal = null;
      w.arms = null;
      // everyone runs: back up the street, or on past, out of sight
      g.runner.run(
        (function* () {
          yield* g.walkNpc(w, i % 2 ? c - hw + 40 : c + hw - 40, { run: true, speedScale: 1 + (i % 3) * 0.1 });
          w.visible = false;
        })(),
      );
    });
    g.runner.run(tween(g, 'scatter', 1, 2.5));
    g.gate = null;
    g.stanceLock = null;
    a.follow = null;
    // round the corner and down against the dumpster's far end, out of the street's sight
    g.runner.run(g.walkNpc(ahmad, DUMPSTER_X + 234, { run: true }));
    g.text.objective(OBJ.run);
    yield () => p.x >= DUMPSTER_X + 150;
    g.lock();
    g.text.objective(null);
    yield () => ahmad.goal === null;
    g.sound.ambience({ crowd: 0.15 }, 2.5);
    g.sound.score?.cut?.('silence', 1);
    p.vx = 0;
    // his back against the metal, down on the ground; Ahmad crouched facing him
    yield* g.walkPlayer(DUMPSTER_X + 168);
    p.f = 1;
    p.override = { ...POSES.sitGround, torso: 0.02, head: -0.1 };
    ahmad.f = -1;
    ahmad.override = { ...POSES.crouch, head: 0.05 };
    breaths(g, 7);
    yield 2.4;
    ahmad.override = { ...POSES.crouch, head: -0.05, torso: 0.4 };
    yield* say(g, 'never');
    yield 2.2;
    g.sound.setMuffle(0.8, 2);
    yield* tween(g, 'memK', 1, 2.2);
    p.override = null;
    yield* this.back(g, X4.minaret + 80);
    g.checkpoint('mukhabarat');
    yield* fadeTo(g, 0, 1.6);
    g.lock(false);
  },

  // ======================================== 3E-3: the mukhabarat ==

  *mukhabarat(g) {
    const a = g.a;
    const p = g.player;
    a.done.mukhabarat = true;
    g.lock();
    p.vx = 0;
    g.text.objective(null);
    g.prompt(null);
    yield 1.2;
    const [sx, sy] = SCHOOL_DESKS[0];
    yield* this.enter(g, 'school', sx, { o: YOUNG[10], scale: 0.62, cam: { x: MEM.school[0], y: -150, view: 900 } });
    p.override = SIT(-sy / 0.62, { torso: 0.1, head: 0.2, armN: 0.7, foreN: 1.6 });
    g.text.titleCard(CARDS.y2001, 2.6);
    g.sound.score?.mood('memory', 2);
    g.sound.ambience({ crowd: 0.08, wind: 0, air: 0.05, traffic: 0.04, generator: 0 }, 1);
    const [fx, fy] = SCHOOL_DESKS[1];
    const fadi = actor(g, 'fadi', fx, { f: sx < fx ? -1 : 1, scale: 0.62, pose: SIT(-fy, { head: 0.3, armN: 0.7, foreN: 1.6 }) });
    const kids = SCHOOL_DESKS.slice(2, 7).map(([x, y], i) => actor(g, ['boy', 'kid2', 'kid3', 'boy', 'kid2'][i], x, { f: 1, scale: 0.6, pose: SIT(-y, { head: 0.35, armN: 0.7, foreN: 1.6 }) }));
    const cls = Math.sign(sx - TEACHER_X) || 1;
    const teacher = actor(g, 'man2', TEACHER_X, { f: cls, o: { glasses: true }, pose: { ...POSES.stand, armN: 0.6, foreN: 1.4 } });
    yield* fadeTo(g, 0, 1.2);
    yield 2.4;
    // Fadi passes a note under the desk
    fadi.override = SIT(-fy, { head: 0.1, armN: 0.95, foreN: 0.9 });
    const note = g.level.things.find((t) => t.id === 'note');
    note.x = sx;
    note.y = sy - 30;
    a.notePassed = true;
    g.lock(false);
    g.stanceLock = 'stand';
    g.gate = () => 0;
    yield () => a.noteRead;
    g.gate = null;
    g.stanceLock = null;
    g.lock();
    fadi.override = SIT(-fy, { head: 0.3, armN: 0.7, foreN: 1.6 });
    p.override = SIT(-sy / 0.62, { torso: 0.2, head: 0.45, armN: 1.25, foreN: 2.1 });
    yield 1;
    // a laugh he can't quite swallow
    g.sound.noise({ dur: 0.18, freq: 1400, q: 0.9, vol: 0.12 });
    yield 0.6;
    teacher.f = cls;
    g.runner.run(g.walkNpc(teacher, sx - cls * 56, { speedScale: 0.55 }));
    yield () => teacher.goal === null;
    teacher.f = cls;
    teacher.override = { ...POSES.stand, armN: 1.1, foreN: 1.3, head: 0.25 }; // takes it, reads it
    yield 1.4;
    teacher.override = { ...POSES.stand, armN: 0.9, foreN: 1.7, head: 0.2 };
    yield* say(g, 'who');
    fadi.override = SIT(-fy, { head: 0.6, armN: 0.6, foreN: 1.4 });
    g.sound.ambience({ crowd: 0, traffic: 0 }, 0.2);
    yield 2.6; // silence
    teacher.override = { ...POSES.stand, torso: 0.45, head: 0.3, armN: 0.7, foreN: 1.2 };
    yield* say(g, 'fold');
    // he folds it, and puts it in his pocket
    p.override = SIT(-sy / 0.62, { head: 0.35, armN: -0.15, foreN: 0.4 });
    yield 0.8;
    teacher.override = null;
    g.runner.run(g.walkNpc(teacher, TEACHER_X, { speedScale: 0.55 }));
    yield 2.2;
    // that afternoon: his father at the door, the kitchen door closed
    yield* fadeTo(g, 1, 1.2);
    for (const w of g.npcs) w.visible = false;
    g.npcs = [];
    a.mem = 'kitchen';
    const [kc, khw] = MEM.kitchen;
    g.level.bounds = [kc - khw, kc + khw];
    p.override = null;
    p.place(kc - 40, 0);
    p.f = 1;
    g.camOverride = { x: kc, y: -150, view: 800 };
    g.snapCamera();
    g.sound.ambience({ crowd: 0, traffic: 0.03, wind: 0, air: 0.04 }, 0.5);
    const father = actor(g, 'abuyazan', KITCHEN_DOOR_X, { f: kc - 40 > KITCHEN_DOOR_X ? 1 : -1, o: { headwear: null, hair: '#2b241e', beardColor: '#2b241e' }, pose: { ...POSES.stand } });
    a.kitchenDoor = 0;
    yield* fadeTo(g, 0, 1);
    g.sound.cloth();
    yield* tween(g, 'kitchenDoor', 1, 0.9);
    g.sound.noise({ dur: 0.12, freq: 240, q: 1.2, vol: 0.4, type: 'lowpass' }); // the door shut
    yield 1;
    g.runner.run(g.walkNpc(father, kc + 30, { speedScale: 0.5 }));
    yield () => father.goal === null;
    father.f = -1;
    father.override = { ...POSES.stand, torso: 0.25, head: 0.35 };
    yield 0.6;
    yield* say(g, 'home');
    p.override = { ...POSES.stand, head: 0.35 }; // he nods
    yield 0.5;
    p.override = { ...POSES.stand, head: 0.05 };
    yield 0.4;
    p.override = null;
    yield* say(g, 'why');
    yield 1.6;
    g.sound.setMuffle(0.8, 2);
    yield* tween(g, 'memK', 1, 2.2);
    // the ruined building again; the portrait in the torch, and then not
    yield* this.back(g, PORTRAIT.x + PORTRAIT.w / 2 - 60);
    p.f = 1;
    g.torch.on = true;
    yield* fadeTo(g, 0, 1.2);
    yield 2;
    g.torch.on = false; // he lowers the torch; the face goes into the dark
    g.sound.click();
    yield 1.4;
    g.checkpoint('roof');
    g.text.objective(OBJ.roof);
    g.lock(false);
  },

  // ===================================================== 3F: the roof ==

  *climb(g) {
    const a = g.a;
    const p = g.player;
    a.climbing = true;
    g.text.objective(null);
    g.lock();
    yield* g.walkPlayer(X4.tower);
    p.face?.('back');
    yield 0.5;
    const path = stairPath();
    yield* this.enter(g, 'stairs', path[0][0]);
    g.level.bounds = [-100000, 100000];
    p.face?.('side');
    g.torch.on = true;
    g.torch.charge = Math.max(g.torch.charge, 0.6);
    g.sound.ambience({ wind: 0.08, air: 0.12 }, 1);
    g.camOverride = { x: path[0][0], y: path[0][1] - 140, view: 800 };
    yield* fadeTo(g, 0, 0.8);
    // up, flight after flight, the torch going ahead of him
    const cam = g.runner.run(
      (function* () {
        for (;;) {
          g.camOverride = { x: p.x, y: p.y - 140, view: 800 };
          yield 0.0001; // (a number, so the runner waits a frame)
        }
      })(),
    );
    yield* along(g, p, path, 92, (d) => stairPose(d * 0.1));
    cam.done = true;
    g.sound.cloth();
    yield* fadeTo(g, 1, 0.8);
    p.override = null;
    g.torch.on = false;
    // out onto the roof
    for (const w of g.npcs) w.visible = false;
    g.npcs = [];
    a.mem = 'roof';
    const [rc, rhw] = MEM.roof;
    g.level.bounds = [rc - rhw, rc + rhw];
    p.place(HUT_DOOR[0] + 60, 0); // out of the stair-head hut's door
    p.f = 1;
    a.roofT = 0;
    a.dawn = 0;
    g.camOverride = { x: rc, y: -280, view: 1700 };
    g.snapCamera();
    g.sound.ambience({ wind: 0.38, air: 0.3, crowd: 0, generator: 0.04, traffic: 0 }, 1.5);
    g.sound.life(0);
    g.sound.score?.mood('after', 4);
    yield* fadeTo(g, 0, 2.2);
    g.lock(false);
    // no objective, no prompt, no countdown. After a while, from somewhere
    // below, a single voice: the dawn call to prayer.
    yield () => a.roofT > 15 && !g.locked;
    const dur = g.sound.azan ? g.sound.azan(0.22) : g.sound.adhanFar(0.16);
    g.runner.run(tween(g, 'dawn', 1, Math.max(40, (dur || 30) + 18)));
    yield (dur || 30) * 0.5;
    g.sound.adhanFar(0.06); // a second voice joins from another quarter, behind
    yield () => a.dawn >= 0.999 && !g.locked;
    yield* this.finish(g);
  },

  *finish(g) {
    const s = g.state;
    const a = g.a;
    s.completed = true;
    writeSave(s);
    g.lock();
    const t0 = g.time;
    yield () => {
      a.endFade = clamp((g.time - t0) / 3);
      return a.endFade >= 1;
    };
    g.fade = 1;
    yield 1;
    g.sound.ney(196, 10, 0.14);
    g.text.titleCard(CARDS.close, 6.5);
    yield 7;
    g.onEnd?.(s);
  },

  // ============================================== per-frame extras ==

  update(g, dt) {
    const a = g.a;
    const p = g.player;
    g.lastDt = dt;
    const snd = g.sound;

    // the night street: crickets, a dog
    if (!a.mem) {
      if (g.time > a.nextChirp) {
        a.nextChirp = g.time + 0.5 + Math.random() * 0.9;
        snd.tone(4200 + Math.random() * 600, 0.05, { vol: 0.012, pan: Math.random() * 2 - 1 });
      }
      if (g.time > a.nextDog) {
        a.nextDog = g.time + 30 + Math.random() * 30;
        snd.dogBarkFar?.(Math.random() * 2 - 1);
      }
    }
    if (a.mem === 'roof') a.roofT = (a.roofT || 0) + dt;

    // the protest: the chant, again and again, and Ahmad beside him
    if (a.chanting && g.time > a.nextChant) {
      a.nextChant = g.time + 3.6;
      line(g, 'chant');
    }
    if (a.follow) {
      const w = a.follow;
      const want = p.x + 46;
      if (Math.abs(w.x - want) > 30 && w.goal === null) {
        w.goal = want;
        w.goalOpts = { speedScale: 0.62 };
      }
    }
    // the orchard: he never gets closer, and never turns
    if (a.farAhmad) {
      const w = a.farAhmad;
      const [c, hw] = MEM.orchard;
      const want = Math.min(c + hw - 120, Math.max(w.x, p.x + 560));
      if (want - w.x > 20 && w.goal === null) {
        w.goal = want;
        w.goalOpts = { speedScale: p.vx > 200 ? 1.6 : 0.75, run: p.vx > 200 };
      }
      w.f = 1;
      if (!a.calledOut && p.vx > 200) {
        a.calledOut = true;
        line(g, 'ahmadFar');
      }
    }
    // the café: Ahmad's hands as he talks; young Sami stirring sugar in
    if (a.cafe && !a.touched) {
      const k = Math.sin(g.time * 2.3);
      a.cafe.ya.override = SIT(42, { armN: 1.5 + k * 0.25, foreN: 2.2 - k * 0.3, armF: 1.2 - k * 0.2, foreF: 2.0, head: 0.05 * k });
      a.cafe.ys.override = SIT(42, { armN: 0.9, foreN: 1.9 + Math.sin(g.time * 6) * 0.08, head: 0.1 });
    }
    // Damascus: people come and go
    if (a.passers) {
      const [c, hw] = MEM.damascus;
      for (const w of a.passers) {
        if (w.goal === null && w.visible) {
          w.goal = c - hw + 200 + Math.random() * (hw * 2 - 400);
          w.goalOpts = { speedScale: 0.5 + Math.random() * 0.3 };
        }
      }
    }

    // the street opens as he walks it
    if (g.locked || a.mem) return;
    const d = a.done;
    if (!d.classroom && p.x > X4.classroom - 40) g.runner.run(this.vision1(g));
    else if (d.classroom && !d.orchard && p.x > X4.arch - 30) g.runner.run(this.vision2(g));
    else if (d.orchard && !d.damascus && p.x > X4.shop - 120) g.runner.run(this.vision3(g));
    else if (d.damascus && !d.eid && p.x > X4.shutter - 20) g.runner.run(this.eid(g));
    else if (d.eid && !d.protest && p.x > X4.minaret - 20) g.runner.run(this.protest(g));
    else if (d.protest && !d.mukhabarat) {
      // the portrait: only when the torch finds it
      const near = Math.abs(p.x - (PORTRAIT.x + PORTRAIT.w / 2)) < 220;
      if (near && g.torch.on && g.torch.charge > 0.05) {
        a.litT = (a.litT || 0) + dt;
        if (a.litT > 0.7) g.runner.run(this.mukhabarat(g));
      } else a.litT = 0;
      if (near && !g.torch.on && !a.torchHint) {
        a.torchHint = true;
        g.text.objective(OBJ.torch);
        g.prompt('use', 'أشعل المصباح', 'Light the torch');
      }
      // the street goes no further until he has looked
      if (p.x > PORTRAIT.x + PORTRAIT.w + 160) {
        p.x = PORTRAIT.x + PORTRAIT.w + 160;
        p.vx = Math.min(0, p.vx);
      }
    }
  },

  // Damascus in a shop window: himself at twenty-two, faint, the wrong way round.
  drawProps(R, g) {
    const a = g.a;
    if (!a.mem && a.reflect > 0.01) {
      const r = shopWindowRect();
      if (!a.ghost) {
        a.ghost = new Person('sami', 1);
        a.ghost.o = { ...a.ghost.o, ...YOUNG[22] };
        a.ghost.setPose({ ...POSES.stand, head: 0.05 });
      }
      const gh = a.ghost;
      gh.x = r.x + r.w * 0.68;
      gh.y = r.y + r.h - 4;
      gh.f = -1;
      R.paint((c) => {
        c.save();
        c.beginPath();
        c.rect(r.x, r.y, r.w, r.h);
        c.clip();
        c.globalAlpha = 0.42 * a.reflect;
        gh.draw(c);
        c.restore();
      });
    }
  },

  leave(g) {
    g.sound.setMuffle?.(0, 0.2);
  },

  useTool(g, id) {
    if (id === 'lighter') g.sound.click();
  },

  draw(R, g) {
    const a = g.a;
    const t = g.time;
    switch (a.mem) {
      case 'classroom':
        drawVisionClassroom(R, g, { empty: a.empty || 0, t });
        break;
      case 'orchard':
        drawOrchard(R, g, { wither: a.wither || 0, t });
        break;
      case 'damascus':
        // the traffic after the people: they walk the pavement behind it
        drawDamascus(R, g, { fold: a.fold || 0, t, traffic: false });
        drawInside(R, g);
        drawActors(R, g);
        drawDamascusTraffic(R, g, { fold: a.fold || 0, t });
        return;
      case 'eid':
        drawEid(R, g, { t, door: a.eidDoor || 0 });
        break;
      case 'protest':
        // the dumpster after the people, so the two of them can hide behind it
        drawProtest(R, g, { t, scatter: a.scatter || 0, dumpster: false });
        drawActors(R, g);
        drawDumpster(R);
        return;
      case 'school':
        drawSchool(R, g, { t });
        break;
      case 'kitchen':
        drawKitchen(R, g, { t, door: a.kitchenDoor || 0 });
        break;
      case 'stairs':
        drawStairwell(R, g, { t });
        break;
      case 'roof':
        drawRoof(R, g, { dawn: a.dawn || 0, t });
        break;
      default:
        drawStreet(R, g);
        return;
    }
    drawActors(R, g);
  },

  look(g) {
    const a = g.a;
    let l;
    switch (a.mem) {
      case 'classroom':
        l = visionClassroomLook(g, a.empty || 0);
        break;
      case 'orchard':
        l = orchardLook(g, a.wither || 0);
        break;
      case 'damascus':
        l = damascusLook(g, a.fold || 0);
        break;
      case 'eid':
      case 'protest':
      case 'school':
      case 'kitchen':
        l = memoryLook(g, a.mem);
        break;
      case 'stairs':
        l = stairLook(g);
        break;
      case 'roof':
        l = roofLook(g, a.dawn || 0);
        break;
      default:
        l = streetLook(g);
    }
    if (a.mem) l = { ...l, fade: Math.max(l.fade || 0, a.endFade || 0) };
    return l;
  },
};

// The two of them in the café, seen through its window: clipped to the
// glass, then the glass's own sheen over them.
function drawInside(R, g) {
  const w = CAFE_WINDOW;
  const inside = (g.npcs || []).filter((q) => q.inside && q.visible);
  if (!inside.length) return;
  const t = g.time;
  for (const q of inside) {
    R.paint((c) => {
      c.save();
      c.beginPath();
      c.rect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
      c.clip();
      q.draw(c);
      c.restore();
    });
  }
  R.glow((c) => {
    c.save();
    c.beginPath();
    c.rect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
    c.clip();
    // the street reflected in the pane: two slanting bands of light, drifting
    for (const [u, a] of [[0.18, 0.1], [0.62, 0.07]]) {
      const x = w.x + w.w * u + Math.sin(t * 0.3 + u * 9) * 8;
      c.fillStyle = `rgba(255,240,215,${a})`;
      c.beginPath();
      c.moveTo(x, w.y);
      c.lineTo(x + 60, w.y);
      c.lineTo(x + 20, w.y + w.h);
      c.lineTo(x - 40, w.y + w.h);
      c.fill();
    }
    c.restore();
  });
}

// The people in a memory, with their shadows, over the set.
function drawActors(R, g) {
  const cx = R.cam.x;
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || w.inside || Math.abs(w.x - cx) > 1700) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, -0.5, 0.2);
  }
  g.effects?.draw(R);
}
