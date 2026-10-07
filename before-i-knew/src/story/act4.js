// Act 4: Dawn (الفجر), 4 am to sunrise, 15 August 2014. script/act4.md.
//
// The shortest act. Sami gets up off the roof as the call to prayer goes
// on, goes down the six flights past other people's lives, and out into a
// street that is waking: a man with a jerrycan, a woman sweeping the half of
// her building that stands, two boys with handmade exercise books going to
// a lesson that won't happen. At the junction where he and Ahmad parted, the
// night has already decided where he goes, or he decides (Choice H, three
// roads). Then one of five endings, none of them the right one:
//
//   1 The Witness            the photographs, and the road east into the sun
//   2 The Last Farewell      the body carried home, the grave in the vines
//   3 The Tunnel             the edge of town, and the dark going on
//   4 The One Who Remains    the classroom, the boy, the date on the board
//   5 The Wolf's Hour        the rubble, the cat, the call, the light
//
// and for every one of them the same three lines after.
//
// Places of their own lie far off along the same ground (act4-map.js);
// g.a.mem names the one Sami is in, as in act3v.js. Lines come from
// act4-lines.js by key; prompts and objectives here are in Modern Standard
// Arabic.

import { addNotes, drawNotes } from './notes.js';
import { clamp, lerp } from '../engine/util.js';
import { POSES } from '../rigs/person.js';
import { Cat } from '../rigs/cat.js';
import { writeSave } from '../engine/save.js';
import { lines, tween, fadeTo, actor, clearPeople, moveTo, floorSolid, rampSolids, groundFrom } from './kit.js';
import { populate } from './life.js';
import { MEM } from './act3v-map.js';
import { X5, END, NOMANS, TUNNEL, SCHOOL, RUBBLE } from './act4-map.js';
import { LINES, WHO, CARDS, CHOICE_H } from './act4-lines.js';
import { resolveEnding, endingIsClear, applyChoiceH, ENDINGS } from './endings.js';
import { whiteCloth } from './act2r.js';
import { jerryCan } from '../sets/town.js';
import { drawRoof, roofLook, drawStairwell, stairLook, stairPath, LOOKOUTS, HUT_DOOR } from '../sets/rooftop.js';
import { dawnLook, drawDawnStreet, drawEdgeRoad, drawFarmEdge, SHADOW } from '../sets/dawn.js';
import { drawNomans, nomansLook, drawStretcher, drawCemetery, cemeteryLook, drawGrave, GRAVE_X, GATE_X, drawTunnel, tunnelLook, TUNNEL_DROP, STEPS } from '../sets/farewell.js';
import { drawDawnClassroom, dawnClassroomLook, CHAIRS, stepY, drawRubbleRoom, rubbleLook, SEAT, CAT_PATH, drawCameraScreen } from '../sets/remains.js';

const { say, line } = lines(LINES, WHO);
const OBJ = {
  down: ['انزل إلى الشارع', 'Go down to the street'],
  junction: ['امشِ إلى المفرق', 'Walk to the junction'],
  road: ['اختر طريقاً', 'Choose a road'],
  photos: ['قلّب الصور', 'Look through the photos'],
  east: ['امشِ شرقاً', 'Walk east'],
  carry: ['احملوه إلى الطرف الآخر', 'Carry him back across'],
  cross: ['امشِ إليه', 'Walk out to him'],
  chalk: ['اكتب التاريخ على اللوح', 'Write the date on the board'],
  hold: ['استمر', 'Keep going'],
};
// The ending a road leads to, when the night has already decided.
const ROAD_FOR = { 1: 'tunnels', 2: 'south', 3: 'tunnels', 4: 'classroom', 5: 'south' };
// sitting on the roof, knees up, arms on them, looking east
const SIT_EDGE = { ...POSES.sitGround, head: -0.05, armN: 0.9, foreN: 1.6, armF: 0.85, foreF: 1.55 };
const SITTING = { ...POSES.sitGround, head: 0.1 };
const KNEEL_HAND = { ...POSES.kneel, torso: 0.55, head: 0.45, armN: 0.35, foreN: 0.25 };
const CARRY_DOOR = { ...POSES.stand, torso: 0.06, armN: 0.15, foreN: 0.25, armF: 0.05, foreF: 0.2 };
const WATCH = { ...POSES.stand, armN: 1.45, foreN: 2.6, head: 0.35 };

export const ACT4 = {
  bounds: [-300, 100000],

  build(g) {
    const s = g.state;
    const L = g.level;
    const p = g.player;
    g.a = { part: 1, mem: null, k: 0, dawn: 1, photo: 0, date: 0, lesson: 0, lifted: 0, fill: 0, light: 1 };
    g.surface = (x) => (g.a.mem === 'stairs' || g.a.mem === 'tunnel' ? 'hollow' : g.a.mem === 'cemetery' || g.a.mem === 'edgeRoad' ? 'grit' : 'grit');
    for (const id of ['torch']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = 'torch';
    g.torch.charge = Math.max(g.torch.charge, 0.4);
    g.sound.life(0);
    if (!/^e[1-5]$/.test(s.checkpoint || '')) s.ending = null;

    // the street's things
    const look = (id, x, y, key, opts = {}) => L.add({ id, x, y, range: 120, look: true, label: ['تفحّص', 'Examine'], use: () => line(g, key), ...opts });
    look('morning', X5.start + 200, -140, 'morning', { box: [140, 120], enabled: () => g.a.mem === null && !g.a.atJunction });
    look('junction', X5.junction, -170, 'junction', { box: [200, 200], enabled: () => g.a.mem === null && !g.a.saidJunction, use: () => this.atJunction(g) });
    // the three roads at the junction (Choice H, or the one the night chose)
    for (const [road, label] of CHOICE_H) {
      const x = X5[road];
      L.add({ id: `road_${road}`, x, y: -120, range: 90, urgent: true, label, box: [130, 200], by: 30, enabled: () => g.a.roads?.includes(road) && !g.locked, use: () => g.runner.run(this.road(g, road)) });
    }
    // the roof: the stair door
    L.add({ id: 'downstairs', x: HUT_DOOR[0], y: -110, range: 100, urgent: true, label: ['انزل الدرج', 'Go down the stairs'], box: [90, 190], by: 20, enabled: () => g.a.mem === 'roof' && g.a.up && !g.locked, use: () => g.runner.run(this.descend(g)) });
    // Ending 2: the journal, at the graveside
    L.add({ id: 'journal', x: GRAVE_X - 80, y: -120, range: 140, urgent: true, label: ['اقرأ من دفتر أحمد', 'Read from Ahmad’s journal'], box: [80, 80], enabled: () => g.a.mem === 'cemetery' && g.a.speak && !g.locked, use: () => (g.a.read = true) });
    L.add({ id: 'grapes', x: GRAVE_X, y: -230, range: 150, look: true, label: ['تأمّل', 'Look'], box: [90, 70], enabled: () => g.a.mem === 'cemetery' && g.a.alone && !g.a.sawGrapes && !g.locked, use: () => (g.a.sawGrapes = true) });
    // Ending 4: the classroom
    look('room', SCHOOL.door + 160, -140, 'room', { box: [200, 160], enabled: () => g.a.mem === 'school' && !g.locked });
    look('board', SCHOOL.board, -200, 'board', { box: [260, 140], enabled: () => g.a.mem === 'school' && !g.locked, use: () => { line(g, 'board'); g.a.sawBoard = true; } });
    look('books', SCHOOL.desk + 150, -60, 'books', { box: [90, 90], enabled: () => g.a.mem === 'school' && !g.locked });
    L.add({ id: 'chalk', x: SCHOOL.desk, y: -90, range: 120, urgent: true, label: ['خذ الطبشورة', 'Pick up the chalk'], box: [70, 60], enabled: () => g.a.mem === 'school' && g.a.boyAsked && !g.a.chalk && !g.locked, use: () => (g.a.chalk = true) });
    // Ending 3: the wall by the tunnel mouth, and the door down
    L.add({ id: 'tunnelDoor', x: END.edge[0] + END.edge[1] - 160, y: -100, range: 100, urgent: true, label: ['انزل', 'Go down'], box: [90, 180], by: 20, enabled: () => g.a.mem === 'edge' && !g.locked, use: () => (g.a.down = true) });
    look('wall', TUNNEL.wall, -120, 'wall', { box: [120, 80], enabled: () => g.a.mem === 'tunnel' && !g.locked, use: () => { line(g, 'wall'); g.a.sawWall = true; } });

    // floors that aren't the street's: the tunnel building's room and its
    // steps down; the half-flight from the pavement to the classroom
    floorSolid(L, END.tunnel[0] - END.tunnel[1] - 200, STEPS.x0, -TUNNEL_DROP);
    rampSolids(L, STEPS.x0, -TUNNEL_DROP, STEPS.x1, 0);
    groundFrom(L, stepY, END.school[0] - 1000, SCHOOL.door + 40);

    p.f = 1;
    const cp = s.checkpoint;
    if (cp === 'street') {
      g.a.k = 0.2;
      moveTo(g, [X5.end / 2, X5.end / 2 + 300], X5.start + 80);
      g.runner.run(this.street(g, true));
    } else if (/^e[1-5]$/.test(cp || '')) {
      // straight into an ending (from the Chapters page)
      const e = +cp[1];
      s.ending = e;
      g.runner.run(
        function* () {
          g.lock();
          g.fade = 1;
          yield 0.3;
          yield* this[`ending${e}`](g);
        }.call(this),
      );
    } else g.runner.run(this.open(g));
  },

  // ============================================================== 4A ==

  // On the roof still, the call to prayer going on; a second voice behind.
  *open(g) {
    const a = g.a;
    const p = g.player;
    g.lock();
    g.fade = 1;
    a.mem = 'roof';
    a.dawn = 1;
    moveTo(g, MEM.roof, LOOKOUTS.ghouta - 60, { cam: { x: MEM.roof[0], y: -280, view: 1700 } });
    p.override = SIT_EDGE;
    g.checkpoint('roof4');
    g.sound.ambience({ wind: 0.3, air: 0.25, crowd: 0, generator: 0.03, traffic: 0 }, 2);
    g.sound.score?.mood('after', 4);
    g.text.titleCard(CARDS.open, 6);
    yield 3;
    g.sound.adhanFar(0.08);
    yield* fadeTo(g, 0, 3);
    g.sound.birds();
    yield 2.5;
    p.override = { ...POSES.kneel, head: 0.1 };
    yield 0.6;
    p.override = null;
    a.up = true;
    g.text.objective(OBJ.down);
    g.camOverride = null;
    g.lock(false);
  },

  // Down six flights. Grey light through the gaps; the torch isn't needed.
  *descend(g) {
    const a = g.a;
    const p = g.player;
    g.lock();
    g.text.objective(null);
    yield* fadeTo(g, 1, 0.8);
    a.mem = 'stairs';
    const path = stairPath().slice().reverse();
    g.level.bounds = [-1e6, 1e6];
    p.place(path[0][0], path[0][1]);
    g.camOverride = { x: path[0][0], y: path[0][1] - 140, view: 820 };
    g.snapCamera();
    g.sound.ambience({ wind: 0.1, air: 0.18 }, 0.8);
    yield* fadeTo(g, 0, 0.8);
    // he goes down at his own pace: either way on the keys carries him on
    a.path = path;
    a.along = 0;
    a.pathLen = path.slice(1).reduce((sum, q, i) => sum + Math.hypot(q[0] - path[i][0], q[1] - path[i][1]), 0);
    a.landings = [0.25, 0.55, 0.8];
    a.said = 0;
    p.scripted = true; // on the stairs: placed along the flights, not by physics
    g.gate = () => 0; // (the keys carry him along the flights instead)
    g.text.objective(null);
    g.lock(false);
    g.prompt('right', 'انزل', 'Go down');
    yield () => a.along >= a.pathLen - 1;
    a.path = null;
    g.gate = null;
    p.scripted = false;
    p.scriptedSpeed = 0;
    g.prompt(null);
    g.lock();
    p.override = null;
    yield* fadeTo(g, 1, 0.8);
    yield* this.street(g, false);
  },

  // The dawn street, as it wakes; on to the junction.
  *street(g, fromCheckpoint) {
    const a = g.a;
    const p = g.player;
    g.lock();
    g.fade = 1;
    a.mem = null;
    clearPeople(g);
    moveTo(g, [X5.end / 2, X5.end / 2 + 300], X5.start + 80);
    if (!fromCheckpoint) g.checkpoint('street');
    g.sound.ambience({ wind: 0.12, air: 0.25, crowd: 0, generator: 0.06, traffic: 0 }, 1.5);
    g.sound.life(0.25);
    // people: a man with water, a woman sweeping, two boys
    a.jerry = actor(g, 'man', X5.jerrycan - 380, { f: 1 });
    // the can on his shoulder: the near arm bent back up over it, steadying it
    a.jerry.arms = { armN: 2.15, foreN: 3.55 };
    a.jerry.rig.prop = (c, hand) => jerryCan(c, hand[0] + 4, hand[1] + 24, 0.72);
    a.sweeper = actor(g, 'woman2', X5.sweeper, { f: -1, pose: { ...POSES.stand, torso: 0.3, armN: 0.9, foreN: 0.7, armF: 0.7, foreF: 0.5 } });
    a.boys = null;
    // and the street starting its day: a bed dug, washing pegged out, a
    // window boarded, cans filled at the standpipe
    g.workers = [];
    if (!a.notesAdded) {
      a.notesAdded = true;
      addNotes(g, 'act4');
    }
    populate(g, [
      ['dig', 830, { f: 1 }],
      ['laundry', 1440, { f: -1, outfit: 'woman' }],
      ['ladder', 1990, { f: 1 }],
      ['tap', 2200, { f: 1 }],
    ]);
    yield* fadeTo(g, 0, 2);
    g.text.objective(OBJ.junction);
    g.lock(false);
    g.runner.run(g.walkNpc(a.jerry, X5.boys + 300, { speedScale: 0.95 }));
  },

  // He reaches the place where they parted.
  atJunction(g) {
    const a = g.a;
    const s = g.state;
    if (a.saidJunction) return;
    a.saidJunction = true;
    a.atJunction = true;
    g.text.objective(null);
    line(g, 'junction');
    if (endingIsClear(s)) {
      // the night has decided: one road, the one he is already on
      s.ending = resolveEnding(s);
      a.roads = [ROAD_FOR[s.ending]];
    } else {
      // three roads; the player decides (Choice H)
      a.roads = CHOICE_H.map((c) => c[0]);
      g.runner.run(
        (function* () {
          yield 8.5;
          g.text.objective(OBJ.road);
        })(),
      );
    }
    writeSave(s);
  },

  // Into one of the roads.
  *road(g, road) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    g.lock();
    g.text.objective(null);
    a.roads = [];
    if (!s.ending) {
      // Choice H: what the road means, then where it goes
      const key = CHOICE_H.find((c) => c[0] === road)[2];
      applyChoiceH(s, road);
      s.choices.push(`H${CHOICE_H.findIndex((c) => c[0] === road) + 1}`);
      yield* say(g, key);
      s.ending = resolveEnding(s);
    }
    writeSave(s);
    yield* g.walkPlayer(X5[road]);
    p.face?.('back');
    yield 0.6;
    yield* fadeTo(g, 1, 1.4);
    p.face?.('side');
    clearPeople(g);
    const e = s.ending;
    g.checkpoint(`e${e}`);
    yield* this[`ending${e}`](g);
  },

  // ===================================================== Ending 1 ==

  *ending1(g) {
    const a = g.a;
    const p = g.player;
    // a high place on the edge of the eastern quarter: sitting on its parapet
    a.mem = 'roof';
    a.dawn = 1;
    a.sun = 0.4;
    moveTo(g, MEM.roof, LOOKOUTS.ghouta, { cam: { x: LOOKOUTS.ghouta - 100, y: -230, view: 1100 } });
    p.override = SIT_EDGE;
    g.sound.ambience({ wind: 0.22, air: 0.25, generator: 0.08 }, 2);
    g.sound.birds();
    yield* fadeTo(g, 0, 2);
    // the photographs, one by one, at his own pace; the last is Ahmad's shoes
    a.photo = 0;
    a.camera = true;
    openCamera(g);
    g.text.objective(OBJ.photos);
    g.lock(false);
    g.gate = () => 0;
    g.stanceLock = 'stand';
    yield () => a.photo >= 10 && !g.locked;
    g.text.objective(null);
    g.sound.pluck(196, g.sound.t, 0.4); // a single oud string, at the shoes
    g.lock();
    yield 2.5;
    yield* say(g, 'photos');
    closeCamera(g);
    a.camera = false;
    yield 1;
    yield* say(g, 'justice');
    g.gate = null;
    g.stanceLock = null;
    g.sound.cloth(); // the camera wrapped in a cloth, into the bag
    p.override = { ...POSES.stand, armN: 0.7, foreN: 1.4, head: 0.3 };
    yield 1.2;
    p.override = null;
    yield* fadeTo(g, 1, 1.4);
    // east, through the last of the town, into the sunrise
    a.mem = 'edgeRoad';
    a.k = 0.85;
    const [c, hw] = END.edgeRoad;
    moveTo(g, END.edgeRoad, c - hw + 140);
    p.rig.prop = null;
    a.bag = true;
    g.sound.ambience({ wind: 0.2, air: 0.3, generator: 0, crowd: 0 }, 2);
    g.sound.life(0.2);
    yield* fadeTo(g, 0, 2);
    yield* say(g, 'lastSaw');
    g.text.objective(OBJ.east);
    g.gate = (m) => Math.max(0, m) * 0.7;
    g.stanceLock = 'stand';
    g.lock(false);
    g.sound.ney(220, 14, 0.12);
    // the camera pulls back as he walks into the light
    a.pull = { x0: c - hw + 140 };
    yield () => p.x > c + hw * 0.55;
    g.text.objective(null);
    yield 4;
    yield* this.closing(g, 1, 10);
  },

  // ===================================================== Ending 2 ==

  *ending2(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    const anger = s.negotiation_outcome === 'partial' && !s.dangerous_route_complete;
    const building = !!s.dangerous_route_complete && s.negotiation_outcome !== 'success';
    a.mem = 'nomans';
    a.k = 0;
    moveTo(g, END.nomans, NOMANS.edge);
    a.lifted = 0;
    // who comes: Abu Yazan, and Raed with the white cloth on a rod (not after the anger: two only)
    const abu = actor(g, 'abuyazan', NOMANS.edge - 70, { f: 1 });
    const raed = anger ? null : actor(g, 'man2', NOMANS.edge + 60, { f: 1, o: { beard: 'stubble', hair: '#1d1712' } });
    const cloth = raed || abu;
    cloth.rig.prop = (c, hand) => whiteCloth(c, hand, g.time);
    cloth.arms = { armN: 2.55, foreN: 2.75 };
    // the checkpoint watches (not on the building's way: the body is in the shadow already)
    let maher = null;
    let soldier = null;
    if (!building) {
      soldier = actor(g, 'soldier', NOMANS.checkpoint - 40, { f: -1, pose: anger ? { ...POSES.stand, armN: 1.3, foreN: 1.7 } : POSES.stand });
      actor(g, 'soldier2', NOMANS.checkpoint + 40, { f: -1 });
      maher = actor(g, 'officer', NOMANS.checkpoint + 130, { f: -1 });
    }
    g.sound.ambience({ wind: 0.12, air: 0.15, crowd: 0, generator: 0, traffic: 0 }, 1);
    g.sound.score?.mood('silence', 2);
    yield* fadeTo(g, 0, 2);
    yield* say(g, anger ? 'readyAnger' : 'ready');
    // out to him: slow, deliberate; after the anger, no stopping
    g.text.objective(OBJ.cross);
    g.stanceLock = 'stand';
    g.gate = anger ? (m) => (m > 0 ? 0.62 : 0.3) : (m) => Math.max(0, m) * 0.42;
    a.helpers = raed ? [[raed, 70], [abu, -60]] : [[abu, -60]];
    g.lock(false);
    const mid = (NOMANS.edge + NOMANS.body) / 2;
    if (!building) {
      yield () => p.x > mid;
      // a radio crackles at the checkpoint; a hand goes up; everyone stops
      g.lock();
      g.sound.squelch();
      line(g, 'crackle');
      soldier.override = { ...POSES.stand, armN: 2.5, foreN: 2.8 };
      p.vx = 0;
      yield 3.2;
      soldier.override = anger ? { ...POSES.stand, armN: 1.3, foreN: 1.7 } : null;
      yield 0.6;
      g.lock(false);
    }
    yield () => p.x > NOMANS.body - 80;
    g.lock();
    g.text.objective(null);
    p.vx = 0;
    yield 1.4;
    yield* say(g, 'shoes');
    // they lift him onto the door; the weight is real
    p.override = { ...POSES.squat };
    abu.override = { ...POSES.squat };
    g.sound.cloth();
    yield 1.6;
    a.lifted = 1;
    g.sound.groan?.();
    p.override = null;
    abu.override = null;
    p.carry = true;
    p.arms = CARRY_DOOR;
    p.f = -1;
    abu.f = -1;
    a.stretcher = { front: abu, back: p };
    yield 0.8;
    // back across; the checkpoint watches
    g.text.objective(OBJ.carry);
    g.gate = anger ? (m) => (m < 0 ? -0.62 : -0.3) : (m) => Math.min(0, m) * 0.36;
    // Sami at the front end, Abu Yazan at the back, a door's length apart;
    // Raed ahead with the cloth
    a.helpers = raed ? [[raed, 120], [abu, -172]] : [[abu, -172]];
    g.lock(false);
    if (maher) {
      yield () => p.x < mid;
      if (s.g_choice === 'dignity') maher.override = WATCH; // the minutes he sold are nearly up
    }
    yield () => p.x < NOMANS.edge + 30;
    g.lock();
    g.text.objective(null);
    g.gate = null;
    g.stanceLock = null;
    a.helpers = null;
    yield 1.2;
    yield* fadeTo(g, 1, 2);
    p.carry = false;
    p.arms = null;
    a.stretcher = null;
    clearPeople(g);
    yield* this.burial(g);
  },

  // The grave in the vines.
  *burial(g) {
    g.sound.score?.motif?.('ahmad', { vol: 0.8 });
    const a = g.a;
    const s = g.state;
    const p = g.player;
    a.mem = 'cemetery';
    a.k = 0.9;
    a.fill = 0;
    a.stones = false;
    moveTo(g, END.cemetery, GRAVE_X - 160, { cam: { x: GRAVE_X - 60, y: -200, view: 1050 } });
    const umAhmad = actor(g, 'woman', GRAVE_X + 70, { f: -1, o: { headColor: '#141214', top: '#1d1b1e', layer: { kind: 'coat', color: '#232025' } } });
    const abu = actor(g, 'abuyazan', GRAVE_X - 70, { f: 1, pose: { ...POSES.stand, armN: 0.45, foreN: 1.6, armF: 0.4, foreF: 1.6 } });
    const others = [
      actor(g, 'man2', GRAVE_X + 150, { f: -1, o: { beard: 'stubble' } }), // Raed
      actor(g, 'man3', GRAVE_X + 230, { f: -1, o: { top: '#e4ddcf' } }), // the baker, still floured
      actor(g, 'woman2', GRAVE_X - 250, { f: 1 }), // Um Said
      actor(g, 'man', GRAVE_X + 300, { f: -1 }),
    ];
    g.sound.ambience({ wind: 0.16, air: 0.2, crowd: 0, generator: 0 }, 1);
    g.sound.birds();
    yield* fadeTo(g, 0, 2.4);
    // the earth goes back in; no one speaks
    for (let i = 0; i < 6; i++) {
      g.sound.noise({ when: g.sound.t + i * 0.7, dur: 0.3, freq: 300, q: 0.6, vol: 0.18, type: 'lowpass' });
    }
    yield* tween(g, 'fill', 1, 5);
    a.stones = true;
    yield 1.2;
    yield* say(g, 'recite');
    yield 1.6;
    abu.f = -1;
    yield* say(g, 'ifYouWant');
    // the journal, if he has it: a page with a fold; otherwise, what he can say
    if (s.tools.includes('journal')) {
      a.speak = true;
      g.lock(false);
      g.gate = () => 0;
      g.stanceLock = 'stand';
      yield () => a.read;
      g.gate = null;
      g.stanceLock = null;
      g.lock();
      p.override = { ...POSES.stand, armN: 1.2, foreN: 2.2, armF: 1.1, foreF: 2.1, head: 0.35 };
      for (const k of ['poem1', 'poem2', 'poem3', 'poem4', 'poem5']) {
        yield* say(g, k);
        yield 0.5;
      }
      p.override = { ...POSES.stand, head: 0.4 };
      g.sound.birds();
      yield 2.5;
    } else {
      yield 2;
      yield* say(g, 'best');
      yield 1;
    }
    // Um Ahmad's hand on the earth, flat
    umAhmad.override = KNEEL_HAND;
    g.sound.noise({ dur: 0.6, freq: 500, q: 0.5, vol: 0.06 }); // a sound from beneath words
    yield 3.4;
    p.override = null;
    // they go, slowly; Abu Yazan takes her through the gate
    umAhmad.override = null;
    for (const w of [umAhmad, abu, ...others]) g.runner.run(g.walkNpc(w, GATE_X - 120, { speedScale: 0.4 + Math.random() * 0.1 }));
    yield 6;
    a.alone = true;
    g.camOverride = null;
    g.lock(false);
    // he stays; the grapes over the grave
    yield () => a.sawGrapes;
    g.lock();
    clearPeople(g);
    yield* say(g, 'grapes');
    p.f = GRAVE_X > p.x ? 1 : -1;
    p.override = KNEEL_HAND;
    yield 4;
    p.override = null;
    g.lock(false);
    // he walks out through the gate, towards whatever the day requires
    yield () => p.x < GATE_X + 40;
    yield* this.closing(g, 2, 10);
  },

  // ===================================================== Ending 3 ==

  *ending3(g) {
    const a = g.a;
    const p = g.player;
    a.mem = 'edge';
    a.k = 0.25;
    const [c, hw] = END.edge;
    moveTo(g, END.edge, c - hw + 120);
    g.sound.ambience({ wind: 0.34, air: 0.3, crowd: 0, generator: 0.02 }, 2);
    g.sound.dogBarkFar?.(0.6);
    yield* fadeTo(g, 0, 2);
    g.lock(false);
    yield () => a.down;
    g.lock();
    yield* fadeTo(g, 1, 1);
    // the basement, the steps, the mouth
    a.mem = 'tunnel';
    a.light = 1;
    moveTo(g, END.tunnel, TUNNEL.steps - 140, { y: -TUNNEL_DROP });
    g.level.bounds = [END.tunnel[0] - END.tunnel[1] - 200, END.tunnel[0] + END.tunnel[1]];
    g.torch.on = true;
    g.torch.charge = Math.max(g.torch.charge, 0.85); // he wound it on the way
    g.sound.ambience({ wind: 0.05, air: 0.12 }, 1);
    g.sound.buildingCreak?.(0);
    yield* fadeTo(g, 0, 1.2);
    g.lock(false);
    yield () => p.x > TUNNEL.wall - 40;
    if (!a.sawWall) {
      g.lock();
      p.vx = 0;
      p.f = 1;
      yield* say(g, 'wall');
      a.sawWall = true;
      g.lock(false);
    }
    yield () => p.x > TUNNEL.mouth - 20;
    // the threshold: the player decides nothing here
    g.lock();
    p.vx = 0;
    p.f = 1;
    g.sound.ambience({ air: 0.05, wind: 0.02 }, 3);
    yield 1.5;
    yield* say(g, 'threshold');
    yield 3;
    // in; the torch dims faster down here; he cranks it
    g.lock(false);
    a.inTunnel = true;
    g.text.objective(null);
    g.prompt('use', 'أدِر المصباح', 'Crank the torch');
    const [tc, thw] = END.tunnel;
    yield () => p.x > tc + thw - 220;
    g.lock();
    g.prompt(null);
    a.inTunnel = false;
    p.vx = 0;
    a.light = 0;
    // the entrance is gone; the crank, twice; the light winding down
    for (let i = 0; i < 2; i++) {
      g.sound.crank();
      g.torch.charge = Math.min(1, g.torch.charge + 0.12);
      yield 0.5;
    }
    yield* tween(g, 'charge', 0, 6, g.torch);
    g.torch.on = false;
    yield 1;
    yield* this.closing(g, 3, 2);
  },

  // ===================================================== Ending 4 ==

  *ending4(g) {
    const a = g.a;
    const p = g.player;
    a.mem = 'school';
    a.k = 0;
    a.date = 0;
    a.lesson = 0;
    // at the top of the half-flight, on the pavement; he goes down himself
    const top = END.school[0] - 840;
    moveTo(g, END.school, top, { y: stepY(top) });
    g.level.bounds = [END.school[0] - 900, END.school[0] + END.school[1]];
    g.sound.ambience({ wind: 0.02, air: 0.08, crowd: 0, generator: 0 }, 1);
    g.sound.life(0.1);
    g.runner.run(tween(g, 'k', 1, 150)); // the rectangle of light moves as the sun climbs
    a.drip = g.time + 2;
    yield* fadeTo(g, 0, 2);
    g.lock(false);
    // he stands in the room as long as he stands there
    const t0 = g.time;
    yield () => (a.sawBoard || g.time - t0 > 35) && !g.locked;
    yield 4;
    // small footsteps on the stairs; plastic sandals; a boy in the doorway
    g.runner.run(steps(g, 6, 0.28, 0.1));
    g.lock();
    const boy = actor(g, 'boy', SCHOOL.door + 20, { f: 1, scale: 0.66, o: { top: '#8a7c62', satchel: '#c9b78e' } });
    a.boy = boy;
    yield 1.4;
    p.f = -1;
    yield* say(g, 'where');
    yield 3.5; // the question hangs in the room
    a.boyAsked = true;
    g.text.objective(OBJ.chalk);
    g.lock(false);
    yield () => a.chalk;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(SCHOOL.board + 60);
    p.f = -1;
    p.face?.('back');
    // the date, written by his hand: hold to write
    g.text.objective(OBJ.chalk);
    g.prompt('interact', 'اضغط مطوّلاً للكتابة', 'Hold to write');
    a.writing = true;
    g.lock(false);
    g.gate = () => 0;
    g.stanceLock = 'stand';
    yield () => a.date >= 1;
    a.writing = false;
    g.prompt(null);
    g.text.objective(null);
    g.gate = null;
    g.stanceLock = null;
    g.lock();
    p.override = null;
    // the boy sits in the front row, and folds his hands
    const [sx] = CHAIRS[0];
    g.runner.run(g.walkNpc(boy, sx, { speedScale: 0.5 }));
    yield () => boy.goal === null;
    boy.override = { ...POSES.sitChair, seat: -CHAIRS[0][1] / 0.66, armN: 0.7, foreN: 1.6 };
    boy.f = 1;
    yield 2;
    // more footsteps: a girl with her little brother on her hip
    g.runner.run(steps(g, 5, 0.32, 0.08));
    const girl = actor(g, 'kid3', SCHOOL.door + 10, { f: 1, scale: 0.72, o: { robe: true, headwear: 'hijab', headColor: '#7a5a6a' } });
    girl.arms = { armN: 0.9, foreN: 2.2 };
    yield 1.6;
    boy.f = -1;
    yield* say(g, 'comeIn');
    boy.f = 1;
    g.runner.run(g.walkNpc(girl, CHAIRS[1][0], { speedScale: 0.45 }));
    yield () => girl.goal === null;
    girl.override = { ...POSES.sitChair, seat: -CHAIRS[1][1] / 0.72, armN: 0.9, foreN: 2.2 };
    yield 1;
    // and the beginning of a lesson, in a less practised hand
    p.face?.('back');
    g.runner.run(chalkSound(g, 3.5));
    yield* tween(g, 'lesson', 1, 3.5);
    p.face?.('side');
    p.f = 1;
    yield 1.5;
    // a fourth child at the door
    actor(g, 'kid2', SCHOOL.door, { f: 1, scale: 0.64 });
    g.camOverride = { x: END.school[0], y: -190, view: 1250 };
    yield 8;
    yield* this.closing(g, 4, 10);
  },

  // ===================================================== Ending 5 ==

  *ending5(g) {
    const a = g.a;
    const p = g.player;
    a.mem = 'rubble';
    a.k = 0;
    moveTo(g, END.rubble, SEAT[0], { cam: { x: END.rubble[0] + 60, y: -170, view: 1000 }, y: SEAT[1] });
    p.override = SITTING;
    p.scripted = true; // sitting on the slab, off the ground
    p.f = 1;
    g.torch.on = false;
    g.torch.charge = 0;
    g.sound.ambience({ wind: 0.12, air: 0.16, crowd: 0, generator: 0 }, 1);
    g.sound.life(0);
    yield* fadeTo(g, 0, 3);
    yield 4;
    // the cat, picking its way over the rubble; it settles near him, not touching
    const cat = new Cat();
    cat.sit = 0;
    cat.f = -1;
    cat.x = CAT_PATH[0][0];
    cat.y = CAT_PATH[0][1];
    g.cat = cat;
    yield* walkCat(g, cat, CAT_PATH, 38);
    cat.sit = 1;
    cat.speed = 0;
    cat.f = 1; // facing the opening
    // no prompt, no button, no objective: the game waits
    yield 20;
    yield* tweenObj(g, cat, 'yawn', 1, 1.1);
    yield 0.7;
    yield* tweenObj(g, cat, 'yawn', 0, 0.9);
    yield* tweenObj(g, cat, 'curl', 0.45, 2.5); // paws tucked, eyes half closed
    yield 3;
    // the call to prayer, closer than the echo before
    const dur = g.sound.azan(0.26) || 30;
    g.runner.run(tween(g, 'k', 1, dur * 0.9));
    yield dur * 0.6;
    // the town waking, sound by sound
    const wake = g.runner.run(townWaking(g));
    yield dur * 0.4;
    // the cat stretches, gives him a last look, and goes
    yield* tweenObj(g, cat, 'curl', 0, 1.2);
    cat.sit = 0;
    cat.lean = 0;
    yield 1;
    cat.f = -1;
    yield 0.8;
    cat.f = 1;
    yield* walkCat(g, cat, CAT_PATH.slice().reverse(), 44);
    cat.hidden = true;
    yield 10; // he sits; the light fills the room
    wake.done = true;
    yield* this.closing(g, 5, 15);
    p.scripted = false;
  },

  // ======================================================== the end ==

  // The last image fades; the ending's words; the epilogue; the card.
  *closing(g, e, fadeSecs) {
    const s = g.state;
    const a = g.a;
    g.lock();
    g.text.objective(null);
    g.prompt(null);
    g.gate = null;
    g.stanceLock = null;
    s.ending = e;
    s.completed = true;
    writeSave(s);
    g.sound.ambience({ crowd: 0, traffic: 0, generator: 0, wind: 0.05, air: 0.05 }, fadeSecs * 0.8);
    const t0 = g.time;
    yield () => {
      a.endFade = clamp((g.time - t0) / fadeSecs);
      return a.endFade >= 1;
    };
    g.fade = 1;
    g.sound.life(0);
    // each ending's own turn of Ahmad's theme, under the last words
    g.sound.score?.motif?.(`ending${e}`);
    yield 1.5;
    g.text.titleCard(CARDS.final[e], 7);
    yield 7.5;
    yield 1.2;
    for (const l of CARDS.epilogue) {
      g.text.titleCard(l, 4);
      yield 4.4;
    }
    yield 1.6;
    g.onEnd?.(s);
  },

  // ============================================== per-frame extras ==

  update(g, dt) {
    g.sound.zone?.('act4', g.player.x); // the sound of each stretch of street
    const a = g.a;
    const p = g.player;
    const input = g.input;
    g.lastDt = dt;
    g.cat?.update(dt);

    // down the stairwell at his own pace
    if (a.path && !g.locked) {
      const mv = (input.held('right') || input.held('left') || input.held('jump') ? 1 : 0) * 92 * dt;
      a.along = Math.min(a.pathLen - 1, a.along + mv);
      const [x, y, dir] = pointAt(a.path, a.along);
      p.x = x;
      p.y = y;
      if (dir) p.f = dir;
      p.stride = (p.stride || 0) + mv;
      p.scriptedSpeed = mv / dt;
      p.override = mv > 0 ? stairDown(a.along) : p.override;
      p.vx = 0;
      g.camOverride = { x, y: y - 140, view: 820 };
      // a life on each landing
      const k = a.along / a.pathLen;
      const key = ['pots', 'bike', 'laundry'][a.said];
      if (key && k > a.landings[a.said]) {
        a.said++;
        line(g, key);
      }
    }

    // the street: dawn comes as he walks; the boys come up out of their basement
    if (a.mem === null && !a.ended) {
      a.k = Math.max(a.k, 0.12 + 0.3 * clamp((p.x - X5.start) / (X5.junction - X5.start)));
      if (!a.boys && p.x > X5.boys - 360) {
        a.boys = [actor(g, 'boy', X5.boys, { f: 1, scale: 0.7, o: { satchel: '#c9b78e' } }), actor(g, 'kid2', X5.boys - 40, { f: 1, scale: 0.68 })];
        for (const b of a.boys) {
          b.arms = { armN: 0.9, foreN: 2.0 }; // exercise books held to the chest
          g.runner.run(g.walkNpc(b, X5.classroom + 40, { speedScale: 0.62 }));
        }
      }
      if (a.boys && !a.saidBoys && Math.abs(p.x - a.boys[0].x) < 140) {
        a.saidBoys = true;
        line(g, 'boys');
      }
      // the sweeper's broom
      if (a.sweeper && g.time > (a.nextSweep || 0)) {
        a.nextSweep = g.time + 0.7;
        a.sweepOn = !a.sweepOn;
        a.sweeper.override = { ...POSES.stand, torso: 0.3, armN: a.sweepOn ? 1.1 : 0.7, foreN: a.sweepOn ? 0.9 : 0.5, armF: a.sweepOn ? 0.9 : 0.5, foreF: 0.5 };
        if (Math.abs(p.x - X5.sweeper) < 600) g.sound.noise({ dur: 0.25, freq: 2600, q: 0.6, vol: 0.03 * (1 - Math.abs(p.x - X5.sweeper) / 600), pan: g.sound.panFor(X5.sweeper) });
      }
      // the junction, reached
      if (!a.saidJunction && p.x > X5.junction - 120) this.atJunction(g);
    }

    // helpers keep their places beside him on the crossing
    if (a.helpers) {
      for (const [w, dx] of a.helpers) {
        const want = p.x + dx * (p.f || 1);
        if (Math.abs(w.x - want) > 14) {
          w.goal = want;
          w.goalOpts = { speedScale: Math.min(1.2, Math.abs(p.vx) / 140 + 0.3) };
        } else w.f = p.f;
      }
    }

    // the photographs: left and right go through them
    if (a.camera) {
      if (!g.locked) {
        if (input.hit('right') || input.hit('interact')) a.photo = Math.min(10, a.photo + 1);
        if (input.hit('left')) a.photo = Math.max(0, a.photo - 1);
      }
      drawCamera(g);
    }

    // the edge road: the camera pulls back as he walks into the sun
    if (a.pull) {
      const k = clamp((p.x - a.pull.x0) / (END.edgeRoad[1] * 1.6));
      g.camOverride = { x: p.x + lerp(150, 520, k), y: lerp(-210, -420, k), view: lerp(1300, 3400, k) };
      a.k = lerp(0.85, 1, k);
    }

    // the tunnel: the torch dims faster; the way in falls behind
    if (a.inTunnel) {
      g.torch.charge = Math.max(0, g.torch.charge - dt * 0.05);
      a.light = clamp(1 - (p.x - TUNNEL.mouth) / 1700);
    }

    // the chalk: held, it writes
    if (a.writing) {
      if (input.held('interact') || input.held('use')) {
        a.date = Math.min(1, a.date + dt / 4.5);
        p.override = { ...POSES.stand, armN: 2.1 + Math.sin(g.time * 9) * 0.08, foreN: 2.45, head: -0.15 };
        if (g.time > (a.nextScratch || 0)) {
          a.nextScratch = g.time + 0.16;
          g.sound.noise({ dur: 0.09, freq: 3800, q: 1.3, vol: 0.05 });
        }
      } else p.override = { ...POSES.stand, armN: 1.6, foreN: 2.0, head: -0.1 };
    }
    // a drip somewhere in the classroom, steady
    if (a.mem === 'school' && g.time > (a.drip || 0)) {
      a.drip = g.time + 2.1;
      g.sound.tone(1800, 0.04, { vol: 0.02, to: 900 });
    }
  },

  drawProps() {},

  leave(g) {
    closeCamera(g);
    g.sound.setMuffle?.(0, 0.2);
  },

  useTool(g, id) {
    if (id === 'lighter') g.sound.click();
  },

  drawProps(R, g) {
    drawNotes(R, g, 'act4');
  },

  draw(R, g) {
    const a = g.a;
    const t = g.time;
    switch (a.mem) {
      case 'roof':
        drawRoof(R, g, { dawn: a.dawn, t });
        break;
      case 'stairs':
        drawStairwell(R, g, { t });
        break;
      case 'edgeRoad':
        drawEdgeRoad(R, g, { k: a.k, t });
        return;
      case 'edge':
        drawFarmEdge(R, g, { k: a.k, t });
        return;
      case 'nomans':
        drawNomans(R, g, { k: a.k, t, maher: g.state.g_choice, lifted: a.lifted });
        drawActors(R, g, [0.05, 0.1]);
        if (a.stretcher) {
          const { front, back } = a.stretcher;
          const x = (front.x + back.x) / 2;
          R.cast((c) => drawStretcher(c, x, -78, { body: true }));
        }
        return;
      case 'cemetery':
        drawCemetery(R, g, { k: a.k, t });
        drawGrave(R, GRAVE_X, { filled: a.fill, stones: a.stones });
        break;
      case 'tunnel':
        drawTunnel(R, g, { k: a.k, t, light: a.light });
        break;
      case 'school':
        drawDawnClassroom(R, g, { k: a.k, t, date: a.date, lesson: a.lesson });
        break;
      case 'rubble':
        drawRubbleRoom(R, g, { k: a.k, t });
        break;
      default:
        drawDawnStreet(R, g, { k: a.k, t });
        return;
    }
    drawActors(R, g, SHADOW(a.k));
  },

  look(g) {
    const a = g.a;
    let l;
    switch (a.mem) {
      case 'roof':
        l = roofLook(g, a.dawn);
        break;
      case 'stairs': {
        // grey light through the gaps: the stairwell, lifted
        const b = stairLook(g);
        l = { ...b, ambient: (b.ambient || [0.07, 0.075, 0.1]).map((v) => v * 2.4 + 0.04) };
        break;
      }
      case 'nomans':
        l = nomansLook(g, a.k);
        break;
      case 'cemetery':
        l = cemeteryLook(g, a.k);
        break;
      case 'tunnel':
        l = tunnelLook(g);
        break;
      case 'school':
        l = dawnClassroomLook(g, a.k);
        break;
      case 'rubble':
        l = rubbleLook(g, a.k);
        break;
      default:
        l = dawnLook(g, a.k);
    }
    return { ...l, fade: Math.max(l.fade || 0, a.endFade || 0) };
  },
};

// ------------------------------------------------------------ helpers --

// The people (and the cat), with their shadows, over the set.
function drawActors(R, g, [shear, squash] = [-0.5, 0.2]) {
  const cx = R.cam.x;
  for (const w of [...(g.npcs || []), g.player]) {
    if (!w || !w.visible || Math.abs(w.x - cx) > 2000) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, squash);
  }
  const cat = g.cat;
  if (cat && !cat.hidden && g.a.mem === 'rubble') {
    R.cast((c) => cat.draw(c));
    R.shadow((c) => cat.draw(c), cat.x, cat.y, shear, squash);
  }
  g.effects?.draw(R);
}

// A point a distance along a polyline: [x, y, facing].
function pointAt(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    if (d <= len) return [lerp(ax, bx, d / len), lerp(ay, by, d / len), bx === ax ? 0 : bx > ax ? 1 : -1];
    d -= len;
  }
  const [x, y] = pts[pts.length - 1];
  return [x, y, 0];
}
// Going down stairs: the stride by distance.
function stairDown(d) {
  const ph = d * 0.1;
  const s = Math.sin(ph);
  return { ...POSES.stand, torso: 0.1, head: 0.2, thighN: 0.35 + s * 0.35, shinN: -0.1 - Math.max(0, s) * 0.5, thighF: 0.35 - s * 0.35, shinF: -0.1 - Math.max(0, -s) * 0.5, armN: 0.15, foreN: 0.3 };
}

// The cat along a path of [x, y] points.
function* walkCat(g, cat, path, speed) {
  let i = 0;
  cat.speed = speed;
  yield () => {
    const dt = g.lastDt || 1 / 60;
    let left = speed * dt;
    while (left > 0 && i < path.length - 1) {
      const [bx, by] = path[i + 1];
      const dx = bx - cat.x;
      const dy = by - cat.y;
      const d = Math.hypot(dx, dy);
      if (d <= left) {
        cat.x = bx;
        cat.y = by;
        left -= d;
        i++;
      } else {
        cat.x += (dx / d) * left;
        cat.y += (dy / d) * left;
        left = 0;
      }
      if (Math.abs(dx) > 0.5) cat.f = dx > 0 ? 1 : -1;
    }
    return i >= path.length - 1;
  };
  cat.speed = 0;
}
function* tweenObj(g, obj, key, to, dur) {
  yield* tween(g, key, to, dur, obj);
}

// Small footsteps on concrete stairs.
function* steps(g, n, gap, vol) {
  for (let i = 0; i < n; i++) {
    g.sound.step('hollow', vol);
    yield gap;
  }
}

// Chalk on a board, for a while.
function* chalkSound(g, dur) {
  const t0 = g.time;
  while (g.time - t0 < dur) {
    g.sound.noise({ dur: 0.08, freq: 3800, q: 1.3, vol: 0.045 });
    yield 0.14 + Math.random() * 0.08;
  }
}

// The town waking, one sound after another (Ending 5): the score of it.
function* townWaking(g) {
  const snd = g.sound;
  const seq = [
    () => snd.childrenFar?.(-0.4),
    () => snd.doorFar?.(0.5),
    () => snd.noise({ dur: 0.2, freq: 1400, q: 3, vol: 0.05, pan: 0.3 }), // a pot
    () => snd.ney(330, 2.2, 0.04), // a woman singing a phrase, far off, then stopping
    () => snd.birds(),
    () => snd.generatorStart?.(0.12),
    () => snd.tone(820, 0.18, { vol: 0.04, pan: -0.6 }), // a pipe struck
    () => snd.childrenFar?.(0.6),
    () => snd.noise({ dur: 1.6, freq: 900, q: 0.4, vol: 0.03, pan: -0.2 }), // water running
  ];
  snd.life(0.35);
  for (let i = 0; ; i++) {
    seq[i % seq.length]();
    yield 2.2 + Math.random() * 1.6;
  }
}

// The camera's screen: a small canvas over the stage, in screen space.
function openCamera(g) {
  if (document.getElementById('camview')) return;
  const cv = document.createElement('canvas');
  cv.id = 'camview';
  cv.width = 640;
  cv.height = 440;
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)', width: 'min(52vw, 640px)', height: 'auto', zIndex: '4', pointerEvents: 'none', filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.55))', transition: 'opacity 0.6s', opacity: '0' });
  (document.getElementById('stage') || document.body).appendChild(cv);
  requestAnimationFrame(() => (cv.style.opacity = '1'));
  g.a.camEl = cv;
}
function drawCamera(g) {
  const cv = g.a.camEl;
  if (!cv) return;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  drawCameraScreen(c, 0, 0, cv.width, cv.height, g.a.photo, g.time, { crack: true });
}
function closeCamera(g) {
  const cv = g.a?.camEl || document.getElementById('camview');
  if (!cv) return;
  cv.style.opacity = '0';
  setTimeout(() => cv.remove(), 700);
  if (g.a) g.a.camEl = null;
}
