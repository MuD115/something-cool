// Act 2: The Evening (العصرية), Path B: the Witness (طريق الشاهد), 4:35 to
// 5:35 pm, from Choice C2, "Who did this?". script/act2.md, 2B-1 to 2B-3.
//
// Grief as method: Sami goes into the southern quarter to find the people
// who saw. Um Said, who went out under the sniper to cover Ahmad, gives him
// Ahmad's bag and the camera in it. A baker hands him bread made of animal
// feed. At a wall of children's drawings he holds the camera, and chooses
// (Choice E): to photograph, so that something survives, or to put it away
// and be with people. Abu Yazan finds him with the lighter and the journal.
//
// Lines come from act2w-lines.js by key; prompts and objectives here are in
// Modern Standard Arabic.

import { addNotes, drawNotes } from './notes.js';
import { POSES } from '../rigs/person.js';
import { writeSave } from '../engine/save.js';
import { lines, tween, fadeTo, actor, clearPeople, moveTo } from './kit.js';
import { populate, tickLife, restoreWorkers } from './life.js';
import { XW, UM_SAID } from './act2bc-map.js';
import { LINES, WHO, CARDS } from './act2w-lines.js';
import { drawQuarter, quarterLook, surfaceAt, drawUmSaidRoom, umSaidLook, UM_SAID_SEAT, BAG_X } from '../sets/witness.js';

const { say, line } = lines(LINES, WHO);
const OBJ = {
  find: ['ابحث عن أم سعيد', 'Find Um Said'],
  walk: ['امشِ في الحارة', 'Walk through the quarter'],
  photos: ['صوّر ما يجب أن يبقى', 'Photograph what should last'],
  people: ['اجلس مع الناس', 'Be with people'],
};
const STREET = [XW.end / 2, XW.end / 2 + 400];
const CAMERA_UP = { ...POSES.stand, armN: 1.85, foreN: 2.95, armF: 1.7, foreF: 2.9, head: 0.05 };
const EATING = { ...POSES.stand, armN: 1.4, foreN: 2.7, head: 0.1 };
// What can be photographed after the wall (E1), and where.
const SPOTS = [
  ['balcony', XW.balcony, -260],
  ['torn', XW.torn, -220],
  ['view', XW.view, -140],
];

// The woman hanging laundry on what's left of her balcony, on its slab.
const BALC_Y = -224;
function hanger(g) {
  // standing on the first-floor slab, at full size
  const w = actor(g, 'woman', XW.balcony - 40, { f: 1, pose: { ...POSES.stand, torso: 0.15, head: 0.2, armN: 0.95, foreN: 1.2, armF: 0.85, foreF: 1.1 } });
  w.scripted = true;
  w.place(XW.balcony - 40, BALC_Y);
  return w;
}

export const ACT2W = {
  bounds: [-300, 50000],

  build(g) {
    const s = g.state;
    const L = g.level;
    const p = g.player;
    g.a = { part: 'witness', mem: null, k: 0, photos: [] };
    g.surface = (x) => (g.a.mem ? 'tile' : surfaceAt(x));
    addNotes(g, 'act2w');
    // the quarter in the evening: people at what's left of the day's work
    populate(g, [
      ['knead', 830, { f: 1 }],
      ['chat', 1460, { f: -1 }],
      ['generator', 2230, { f: 1 }],
      ['laundry', 3700, { f: 1 }],
      ['tap', 4260, { f: -1 }],
    ]);
    for (const id of ['torch', 'mirror', 'walkie']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = s.tools.includes('camera') ? 'camera' : 'torch';
    g.level.bounds = [STREET[0] - STREET[1], STREET[0] + STREET[1]];
    g.sound.ambience({ wind: 0.12, air: 0.3, crowd: 0.04, generator: 0.05, traffic: 0 }, 2);
    g.sound.life(0.2);
    g.sound.score?.mood('after', 3);
    s.photos ||= [];

    const look = (id, x, y, key, opts = {}) => L.add({ id, x, y, range: 120, look: true, label: ['تفحّص', 'Examine'], use: () => line(g, key), enabled: () => !g.a.mem && !g.locked, ...opts });
    L.add({ id: 'door', x: XW.umSaid, y: -110, range: 90, urgent: true, label: ['اطرق الباب', 'Knock'], box: [90, 190], by: 20, enabled: () => !g.a.mem && !g.a.metUmSaid && !g.locked, use: () => g.runner.run(this.umSaid(g)) });
    L.add({ id: 'bag', x: BAG_X, y: -40, range: 140, urgent: true, label: ['انظر في الشنطة', 'Look in the bag'], box: [60, 50], enabled: () => g.a.mem === 'umSaid' && g.a.bagOut && !g.a.bagSeen && !g.locked, use: () => (g.a.bagSeen = true) });
    look('oven', XW.bakery - 60, -80, 'oven', { box: [120, 110] });
    L.add({ id: 'bread', x: XW.bakery + 70, y: -110, range: 110, urgent: true, label: ['خذ الخبز', 'Take the bread'], box: [60, 60], enabled: () => !g.a.mem && g.a.bakerOffers && !g.a.ate && !g.locked, use: () => g.runner.run(this.bread(g)) });
    L.add({ id: 'wall', x: XW.wall, y: -60, range: 110, urgent: true, label: ['اجلس على الجدار', 'Sit on the wall'], box: [160, 80], enabled: () => !g.a.mem && g.a.ate && !g.a.sat && !g.locked, use: () => g.runner.run(this.wall(g)) });
    for (const [id, x, y] of SPOTS) {
      L.add({ id: `photo_${id}`, x, y, range: 170, urgent: true, label: ['صوّر', 'Photograph'], box: [140, 140], enabled: () => g.state.e_choice === 'camera' && !g.a.photos.includes(id) && !g.locked && !g.a.mem, use: () => g.runner.run(this.photo(g, id)) });
    }
    L.add({ id: 'sitWith', x: XW.balcony + 40, y: -80, range: 110, urgent: true, label: ['اجلس معها', 'Sit with her'], box: [80, 120], enabled: () => g.state.e_choice === 'people' && !g.a.satWith && !g.locked, use: () => g.runner.run(this.sitWith(g)) });
    L.add({ id: 'sack', x: XW.torn, y: -50, range: 110, urgent: true, label: ['ساعده', 'Help him'], box: [80, 80], enabled: () => g.state.e_choice === 'people' && g.a.satWith && !g.a.carried && !g.locked, use: () => g.runner.run(this.carry(g)) });

    // people: the woman who points the way; Abu Firas at his oven
    g.a.woman = actor(g, 'woman2', XW.woman, { f: -1, pose: { ...POSES.leanWall, head: 0.1 } });
    g.a.baker = actor(g, 'man3', XW.bakery + 110, { f: -1, o: { top: '#d8d0c0', beard: 'long', beardColor: '#cfc8bc' }, pose: { ...POSES.stand, torso: 0.25, armN: 0.9, foreN: 1.1 } });
    if (s.e_choice !== 'people') g.a.hanger = hanger(g);

    const cp = s.checkpoint;
    p.f = 1;
    if (cp === 'wallW') {
      g.a.metUmSaid = g.a.ate = true;
      p.place(XW.wall - 300);
    } else p.place(XW.start + 60);
    g.runner.run(this.open(g, cp !== 'wallW'));
  },

  *open(g, first) {
    g.lock();
    g.fade = 1;
    if (first) {
      g.checkpoint('quarterW');
      g.text.titleCard(CARDS.open, 5);
      yield 2.4;
    } else yield 0.5;
    yield* fadeTo(g, 0, 2.2);
    g.lock(false);
    if (first) {
      yield 3;
      line(g, 'quiet');
    } else g.text.objective(OBJ.walk);
  },

  // 2B-1a: Um Said, just inside her door.
  *umSaid(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    a.metUmSaid = true;
    g.lock();
    g.text.objective(null);
    p.f = 1;
    g.sound.noise({ dur: 0.08, freq: 200, q: 1.4, vol: 0.4, type: 'lowpass' });
    yield* say(g, 'umSaid');
    yield* fadeTo(g, 1, 0.8);
    clearPeople(g);
    a.mem = 'umSaid';
    a.back = p.x;
    const [c] = UM_SAID;
    moveTo(g, UM_SAID, c - 260, { cam: { x: c, y: -150, view: 820 } });
    const her = actor(g, 'woman2', UM_SAID_SEAT[0], { f: -1, o: { top: '#3d3530', headColor: '#2a2420' }, pose: { ...POSES.sitChair, seat: -UM_SAID_SEAT[1], head: 0.1 } });
    g.sound.ambience({ wind: 0, air: 0.08, crowd: 0, generator: 0.02 }, 0.8);
    yield* fadeTo(g, 0, 0.8);
    yield* say(g, 'comeIn');
    yield* g.walkPlayer(UM_SAID_SEAT[0] - 120);
    p.f = 1;
    yield* say(g, 'wentOut');
    yield* say(g, 'yes');
    yield* say(g, 'why');
    yield* say(g, 'wrong');
    yield 0.8;
    yield* say(g, 'whatSaw');
    yield* say(g, 'saw');
    yield 1.2;
    yield* say(g, 'bag');
    her.override = { ...POSES.sitChair, seat: -UM_SAID_SEAT[1], torso: 0.3, armN: 1.3, foreN: 1.1 };
    a.bagOut = true;
    g.lock(false);
    g.gate = () => 0;
    yield () => a.bagSeen;
    g.gate = null;
    g.lock();
    p.override = { ...POSES.crouch, head: 0.3, armN: 1.0, foreN: 1.2 };
    yield* say(g, 'bagLook');
    yield* say(g, 'takeIt');
    g.giveTool('camera');
    g.sound.cloth();
    yield* say(g, 'camera');
    p.override = null;
    her.override = { ...POSES.sitChair, seat: -UM_SAID_SEAT[1], head: 0.15 };
    yield 0.6;
    yield* say(g, 'mother');
    yield* say(g, 'dontKnow');
    her.override = { ...POSES.stand };
    yield* say(g, 'tellHer');
    s.um_ahmad_visited = false; // (pending: it can change later)
    yield 1;
    yield* fadeTo(g, 1, 0.9);
    clearPeople(g);
    a.mem = null;
    moveTo(g, STREET, XW.umSaid + 60);
    restoreWorkers(g);
    g.a.woman = null;
    g.a.hanger = hanger(g);
    g.a.baker = actor(g, 'man3', XW.bakery + 110, { f: -1, o: { top: '#d8d0c0', beard: 'long', beardColor: '#cfc8bc' }, pose: { ...POSES.stand, torso: 0.25, armN: 0.9, foreN: 1.1 } });
    g.sound.ambience({ wind: 0.12, air: 0.3, crowd: 0.04 }, 0.8);
    a.k = 0.3;
    yield* fadeTo(g, 0, 0.9);
    g.text.objective(OBJ.walk);
    g.lock(false);
  },

  // 2B-1b: bread from animal feed, handed over a wall.
  *bread(g) {
    const a = g.a;
    const p = g.player;
    a.ate = true;
    g.lock();
    g.text.objective(null);
    p.f = 1;
    a.baker.f = -1;
    a.baker.override = { ...POSES.stand, armN: 1.35, foreN: 1.45 };
    yield* say(g, 'eat');
    p.override = { ...POSES.stand, armN: 1.3, foreN: 1.4 };
    yield 0.6;
    yield* say(g, 'thanks');
    a.baker.override = { ...POSES.stand, torso: 0.25, armN: 0.9, foreN: 1.1 };
    a.grinding = true; // the hand mill, turning
    p.override = EATING;
    yield* say(g, 'price');
    p.override = { ...POSES.stand, head: 0.2 };
    yield 1.2;
    p.override = EATING;
    yield* say(g, 'fills');
    yield 1;
    p.override = null;
    g.checkpoint('wallW');
    g.text.objective(OBJ.walk);
    g.lock(false);
  },

  // 2B-2: the wall of drawings; the camera; Choice E.
  *wall(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    a.sat = true;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(XW.wall - 20);
    p.f = 1;
    p.override = { ...POSES.sitLedge, seat: 46, head: 0.25, armN: 0.9, foreN: 1.9 };
    g.runner.run(tween(g, 'k', 0.65, 20));
    yield 1;
    yield* say(g, 'graffiti');
    yield* say(g, 'scroll');
    yield 1;
    const i = yield* g.choose(null, [
      { ar: 'صوّر', en: 'Use the camera' },
      { ar: 'الناس أهم', en: 'The people matter more' },
    ]);
    s.choices.push(`E${i + 1}`);
    if (i === 0) {
      s.e_choice = 'camera';
      s.documented = true;
      // the first photograph: the wall itself
      p.override = { ...POSES.sitLedge, seat: 46, armN: 1.85, foreN: 2.95, armF: 1.7, foreF: 2.9, head: 0.05 };
      yield 0.8;
      shutter(g);
      s.photos.push('wall');
      a.photos.push('wall');
      yield 1.4;
      g.text.objective(OBJ.photos);
    } else {
      s.e_choice = 'people';
      s.documented = false;
      s.compassion = (s.compassion || 0) + 1;
      g.sound.cloth(); // the camera into the bag, the zip
      g.sound.noise({ dur: 0.35, freq: 3000, q: 0.8, vol: 0.06 });
      g.active = 'torch';
      yield 1.4;
      g.text.objective(OBJ.people);
      // someone to sit with, someone to help: the woman from the balcony
      // has come down to the ledge below it
      if (a.hanger) {
        a.hanger.visible = false;
        g.npcs = g.npcs.filter((w) => w !== a.hanger);
        a.hanger = null;
      }
      a.sitter = actor(g, 'woman', XW.balcony + 90, { f: -1, pose: { ...POSES.sitLedge, seat: 44, head: 0.2 } });
      a.carrier = actor(g, 'man3', XW.torn + 60, { f: -1, o: { top: '#d8d0c0', beard: 'long', beardColor: '#cfc8bc' }, pose: { ...POSES.squat, armN: 1.3, foreN: 1.3 } });
    }
    writeSave(s);
    p.override = null;
    g.lock(false);
  },

  // E1: a photograph.
  *photo(g, id) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    g.lock();
    p.vx = 0;
    const spot = SPOTS.find((q) => q[0] === id);
    p.f = spot[1] >= p.x ? 1 : -1;
    p.override = CAMERA_UP;
    yield 0.7;
    shutter(g);
    a.photos.push(id);
    s.photos.push(id);
    yield 0.9;
    p.override = null;
    if (SPOTS.every((q) => a.photos.includes(q[0]))) g.text.objective(null);
    g.lock(false);
  },

  // E2: sitting with someone, listening.
  *sitWith(g) {
    const a = g.a;
    const p = g.player;
    a.satWith = true;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(XW.balcony + 30);
    p.f = 1;
    p.override = { ...POSES.sitLedge, seat: 44, head: 0.25, armN: 0.5, foreN: 1.0 };
    yield 1.5;
    yield* say(g, 'son');
    yield 4; // he listens; she goes on; the shadows lengthen
    g.runner.run(tween(g, 'k', 0.8, 8));
    yield 3;
    p.override = null;
    g.lock(false);
  },
  // E2: a sack of flour, carried between them.
  *carry(g) {
    const a = g.a;
    const p = g.player;
    a.carried = true;
    g.lock();
    yield* say(g, 'carry');
    p.override = { ...POSES.squat };
    a.carrier.override = { ...POSES.squat };
    yield 1;
    p.override = null;
    a.carrier.override = null;
    p.carry = true;
    a.carrier.arms = { armN: 0.8, foreN: 1.4 };
    yield* g.walkPlayer(XW.torn + 260);
    g.runner.run(g.walkNpc(a.carrier, XW.torn + 320));
    yield 1;
    p.carry = false;
    a.carrier.arms = null;
    g.lock(false);
  },

  // 2B-3: Abu Yazan, with the lighter and the journal.
  *lighter(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    a.gotLighter = true;
    g.lock();
    g.text.objective(null);
    p.vx = 0;
    const abu = actor(g, 'abuyazan', XW.alley + 260, { f: -1 });
    g.runner.run(g.walkNpc(abu, p.x + 70, { speedScale: 0.6 }));
    yield* say(g, 'sami');
    yield () => abu.goal === null;
    abu.f = -1;
    p.f = 1;
    yield* say(g, 'uncle');
    abu.override = { ...POSES.stand, armN: 1.2, foreN: 1.4 };
    yield* say(g, 'gave');
    g.giveTool('lighter');
    g.giveTool('journal');
    s.ahmad_journal = true;
    g.sound.cloth();
    yield* say(g, 'lighter');
    abu.override = null;
    yield 1;
    yield* say(g, 'stillDoesnt');
    yield 3; // Sami doesn't answer; Abu Yazan doesn't press
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
      a.endFade = Math.min(1, (g.time - t0) / 2.5);
      return a.endFade >= 1;
    };
    g.fade = 1;
    g.sound.ney(196, 10, 0.16);
    g.text.titleCard(CARDS.close, 6);
    yield 6.5;
    g.onEnd?.(s);
  },

  update(g, dt) {
    const a = g.a;
    const p = g.player;
    g.lastDt = dt;
    tickLife(g, false);
    // she pegs out the washing: reach to the line, a pause, again
    if (a.hanger) {
      const r = 0.5 + 0.5 * Math.sin(g.time * 1.3);
      a.hanger.override = { ...POSES.stand, torso: 0.12 + 0.08 * r, head: 0.2, armN: 0.7 + 0.45 * r, foreN: 1.0 + 0.35 * r, armF: 0.6 + 0.4 * r, foreF: 0.95 + 0.3 * r };
    }
    if (a.mem || g.locked) return;
    a.k = Math.max(a.k, Math.min(0.9, (p.x - XW.start) / (XW.end - XW.start) * 0.85));
    if (a.woman && !a.saidWay && Math.abs(p.x - XW.woman) < 170) {
      a.saidWay = true;
      a.woman.f = p.x < a.woman.x ? -1 : 1;
      line(g, 'directions');
      g.text.objective(OBJ.find);
    }
    if (a.metUmSaid && !a.bakerOffers && Math.abs(p.x - (XW.bakery + 70)) < 200) {
      a.bakerOffers = true;
      a.baker.f = -1;
      a.baker.override = { ...POSES.stand, armN: 1.35, foreN: 1.45 }; // a piece of bread, held out
    }
    if (a.grinding && g.time > (a.nextGrind || 0) && Math.abs(p.x - XW.bakery) < 700) {
      a.nextGrind = g.time + 0.9;
      g.sound.noise({ dur: 0.7, freq: 260, q: 0.7, vol: 0.06, type: 'lowpass', pan: g.sound.panFor(XW.bakery) });
    }
    // the street goes no further than the wall until he has sat there
    if (!a.sat && p.x > XW.wall + 160) {
      p.x = XW.wall + 160;
      p.vx = Math.min(0, p.vx);
    }
    if (a.sat && !a.gotLighter && p.x > XW.alley - 60) g.runner.run(this.lighter(g));
  },

  useTool(g, id) {
    if (id === 'camera') {
      if (g.state.e_choice === 'camera') shutter(g);
      else line(g, 'scroll');
    } else if (id === 'lighter') g.sound.click();
  },

  drawProps(R, g) {
    drawNotes(R, g, 'act2w');
  },

  draw(R, g) {
    if (g.a.mem === 'umSaid') return drawUmSaidRoom(R, g, { t: g.time, bag: g.a.bagOut ? 1 : 0 });
    drawQuarter(R, g, { k: g.a.k, t: g.time });
  },

  look(g) {
    const l = g.a.mem === 'umSaid' ? umSaidLook(g) : quarterLook(g, g.a.k);
    return { ...l, fade: Math.max(l.fade || 0, g.a.endFade || 0) };
  },
};

// The camera's shutter: small, precise, mechanical; a soft flash of white.
function shutter(g) {
  g.sound.noise({ dur: 0.03, freq: 5200, q: 1.5, vol: 0.16 });
  g.sound.noise({ when: g.sound.t + 0.07, dur: 0.04, freq: 3400, q: 1.5, vol: 0.12 });
  g.a.flashAt = g.time;
}
