// Act 2: The Evening (العصرية), Path C: Grief (طريق الحزن), 4:20 to 5:40
// pm, from Choice C3, silence. script/act2.md, 2C-1 to 2C-3.
//
// Sami sits on the kerb at the corner where he was told, and Abu Yazan sits
// with him. For a long while nothing moves but the light. Then the kerb
// becomes a lecture hall in 2009, Ahmad whispering beside him, and a
// Damascus street outside, and a Nescafé that solves the world's problems.
// Back on the kerb: the lighter, the journal, and "his mother still doesn't
// know". Choice F: go to Um Ahmad with Abu Nidal, or walk alone.
//
// Lines come from act2g-lines.js by key; prompts and objectives here are in
// Modern Standard Arabic.

import { clamp } from '../engine/util.js';
import { POSES, OUTFITS } from '../rigs/person.js';
import { writeSave } from '../engine/save.js';
import { lines, tween, fadeTo, actor, clearPeople, moveTo } from './kit.js';
import { populate, restoreWorkers } from './life.js';
import { XG, LECTURE, CAMPUS, UM_AHMAD } from './act2bc-map.js';
import { LINES, WHO, CARDS } from './act2g-lines.js';
import { drawCorner, cornerLook, drawLecture, lectureLook, LECTURE_SEATS, LECTERN_X, drawCampus, campusLook, CAFE_DOOR_X, drawUmAhmad, umAhmadLook, SEWING_X, UM_DOOR_X } from '../sets/grief.js';

const { say, line } = lines(LINES, WHO);
const OBJ = {
  follow: ['اتبع أبا نضال', 'Follow Abu Nidal'],
  cafeteria: ['إلى الكافتيريا', 'To the cafeteria'],
  alone: ['امشِ', 'Walk'],
};
const CORNER = [(XG.east + XG.end) / 2, (XG.end - XG.east) / 2 + 300];
const YOUNG = { ...OUTFITS.sami, beard: 'none', top: '#3f6f8a', sleeve: 'short', rolled: false, pouch: false, watch: false, satchel: '#5a4630' };
const YOUNG_AHMAD = { ...OUTFITS.khaled, beard: 'stubble', layer: null, top: '#d2c7ae' };
// forearms on his knees
// a floor cushion in front of Um Ahmad's sideboard, where Sami sits
const CUSHION_X = UM_AHMAD[0] - 120;
const KERB = { ...POSES.kerb, armN: 0.6, foreN: 1.45, armF: 0.5, foreF: 1.35 };

export const ACT2G = {
  bounds: [-300, 50000],

  build(g) {
    const s = g.state;
    const L = g.level;
    const p = g.player;
    g.a = { part: 'grief', mem: null, k: 0, edge: 0, dissolve: 0, light: 0 };
    g.surface = () => 'grit';
    for (const id of ['torch', 'mirror', 'walkie']) if (!s.tools.includes(id)) s.tools.push(id);
    g.active = 'torch';
    moveTo(g, CORNER, XG.kerb);
    // the street carries on, a little, far off: a woman sweeping, two men talking
    populate(g, [
      ['sweep', 1290, { f: -1, outfit: 'woman' }],
      ['chat', -270, { f: 1, outfit: 'oldman' }],
    ]);
    g.sound.ambience({ wind: 0.16, air: 0.3, crowd: 0, generator: 0.04, traffic: 0 }, 2);
    g.sound.life(0.08);
    g.sound.score?.mood('silence', 3);

    // what he can look at from where he sits
    L.add({ id: 'kerb', x: XG.kerb + 30, y: -20, range: 160, look: true, label: ['تفحّص', 'Examine'], box: [120, 40], enabled: () => !g.a.mem && g.a.looking && !g.locked, use: () => { line(g, 'kerb'); g.a.sawKerb = true; } });
    L.add({ id: 'olive', x: XG.olive, y: -200, range: 360, look: true, label: ['تفحّص', 'Examine'], box: [150, 260], by: 60, enabled: () => !g.a.mem && g.a.looking && !g.locked, use: () => { line(g, 'olive'); g.a.sawOlive = true; } });

    p.f = 1;
    const cp = s.checkpoint;
    if (cp === 'campusG') g.runner.run(this.resume(g, 'campus'));
    else if (cp === 'choiceG') g.runner.run(this.resume(g, 'kerb'));
    else g.runner.run(this.sitting(g));
  },

  // From a checkpoint: out of black, straight into the campus or back on the kerb.
  *resume(g, where) {
    const a = g.a;
    g.lock();
    g.fade = 1;
    a.back = { o: g.player.rig.o };
    if (where === 'campus') {
      g.player.rig.o = YOUNG;
      g.sound.score?.mood('memory', 1);
      yield* this.campus(g);
    } else yield* this.backToKerb(g);
  },

  // 2C-1: sitting. Thirty seconds in which he cannot act; the light moves.
  *sitting(g) {
    const a = g.a;
    const p = g.player;
    g.lock();
    g.fade = 1;
    g.checkpoint('kerbG');
    p.override = KERB;
    const abu = actor(g, 'abuyazan', XG.kerb + 105, { f: 1, pose: { ...KERB, head: 0.4 } });
    a.abu = abu;
    g.text.titleCard(CARDS.open, 5);
    yield 2.2;
    yield* fadeTo(g, 0, 3);
    g.runner.run(tween(g, 'k', 0.35, 30));
    g.runner.run(tween(g, 'edge', 0.32, 12)); // the edges darken: time compressed
    yield 9;
    g.sound.squelch();
    yield 6;
    g.sound.strikeFar?.(0);
    yield 8;
    g.sound.childrenFar?.(0.4);
    yield 7;
    // control comes back, partly: he can look about him, no more
    a.looking = true;
    g.gate = () => 0;
    g.stanceLock = 'stand';
    g.lock(false);
    const t0 = g.time;
    yield () => (a.sawKerb && a.sawOlive) || g.time - t0 > 22;
    yield 2.5;
    a.looking = false;
    yield* this.university(g);
  },

  // 2C-1a: the kerb becomes a lecture hall, 2009.
  *university(g) {
    const a = g.a;
    const p = g.player;
    g.lock();
    g.gate = null;
    g.stanceLock = null;
    g.sound.setMuffle(0.85, 2);
    yield* tween(g, 'edge', 0.8, 2);
    yield* fadeTo(g, 1, 1);
    // the hall: rows of cheap desks; a professor droning about load-bearing
    a.mem = 'lecture';
    a.back = { o: p.rig.o };
    p.rig.o = YOUNG;
    const [sx, sy] = LECTURE_SEATS[0];
    moveTo(g, LECTURE, sx, { cam: { x: LECTURE[0], y: -160, view: 900 } });
    p.override = { ...POSES.sitChair, seat: -sy, armN: 0.75, foreN: 1.7, head: 0.25 };
    const [ax, ay] = LECTURE_SEATS[1];
    const ahmad = actor(g, 'khaled', ax, { f: sx < ax ? -1 : 1, o: YOUNG_AHMAD, pose: { ...POSES.sitChair, seat: -ay, torso: 0.15, armN: 0.8, foreN: 1.7, head: 0.35 } });
    LECTURE_SEATS.slice(2, 9).forEach(([x, y], i) => actor(g, ['man', 'layla', 'man2', 'woman2', 'fadi', 'man3', 'layla'][i], x, { f: 1, o: { beard: 'none' }, pose: { ...POSES.sitChair, seat: -y, head: 0.3, armN: 0.75, foreN: 1.7 } }));
    const prof = actor(g, 'man2', LECTERN_X, { f: 1, o: { glasses: true, layer: { kind: 'jacket', color: '#3d3a36' } }, pose: { ...POSES.stand, armN: 0.7, foreN: 1.5 } });
    a.drone = true;
    g.sound.setMuffle(0, 0.6);
    g.sound.ambience({ wind: 0, air: 0.12, crowd: 0.12, traffic: 0.15, generator: 0 }, 0.8);
    g.sound.score?.mood('memory', 2);
    g.text.titleCard(CARDS.y2009, 3);
    yield* fadeTo(g, 0, 1.4);
    a.edge = 0;
    yield 2.2;
    for (const k of ['endure', 'followed', 'cafeteria']) yield* say(g, k);
    // a laugh swallowed; the professor looks over; two models of diligence
    g.sound.noise({ dur: 0.15, freq: 1300, q: 0.9, vol: 0.1 });
    prof.f = 1;
    prof.override = { ...POSES.stand, head: -0.05, armN: 0.5, foreN: 1.2 };
    p.override = { ...POSES.sitChair, seat: -sy, armN: 0.75, foreN: 1.7, head: 0.45 };
    ahmad.override = { ...POSES.sitChair, seat: -ay, torso: 0.2, armN: 0.8, foreN: 1.7, head: 0.5 };
    yield 2.4;
    prof.override = { ...POSES.stand, armN: 0.7, foreN: 1.5 };
    for (const k of ['difference', 'useful', 'why']) yield* say(g, k);
    yield 1.2;
    // the lecture ends; out into the sun
    a.drone = false;
    yield* fadeTo(g, 1, 1);
    yield* this.campus(g);
  },

  // 2C-1a, outside: a Damascus street in the sun, and the walk to the cafeteria.
  *campus(g) {
    const a = g.a;
    const p = g.player;
    g.checkpoint('campusG');
    clearPeople(g);
    a.mem = 'campus';
    const [cc, chw] = CAMPUS;
    moveTo(g, CAMPUS, cc - chw + 160);
    p.override = null;
    a.ahmad = actor(g, 'khaled', cc - chw + 230, { f: 1, o: YOUNG_AHMAD });
    // falafel, jasmine, traffic: an ordinary day
    actor(g, 'man', cc - 300, { f: -1, pose: { ...POSES.stand, armN: 0.9, foreN: 1.4 } }); // the falafel man
    actor(g, 'oldman', cc + 300, { f: -1, pose: { ...POSES.stand, armN: 1.2, foreN: 1.0 } }); // jasmine garlands
    actor(g, 'woman2', cc - 700, { f: 1 });
    actor(g, 'layla', cc + 600, { f: -1 });
    g.sound.ambience({ traffic: 0.6, crowd: 0.35, air: 0.05 }, 1);
    yield* fadeTo(g, 0, 1.2);
    a.ahmad.override = { ...POSES.stand, armN: 2.6, foreN: 2.9, armF: 2.5, foreF: 2.8 }; // stretching in the sun
    yield 1.2;
    a.ahmad.override = null;
    yield* say(g, 'nescafe');
    yield* say(g, 'always');
    // they walk together; he walks it
    a.follow = a.ahmad;
    g.text.objective(OBJ.cafeteria);
    g.gate = (m) => Math.max(0, m) * 0.6;
    g.lock(false);
    yield () => p.x > cc - 200;
    line(g, 'solves');
    yield () => p.x > CAFE_DOOR_X - 140;
    g.lock();
    g.text.objective(null);
    g.gate = null;
    a.follow = null;
    // the traffic slows and deepens; the cafeteria dissolves
    g.sound.setMuffle(0.9, 2.5);
    yield* tween(g, 'dissolve', 1, 2.6);
    yield* fadeTo(g, 1, 0.6);
    yield* this.backToKerb(g);
  },

  // Back on the kerb as the memory lets go; then the lighter.
  *backToKerb(g) {
    const a = g.a;
    const p = g.player;
    g.checkpoint('choiceG');
    clearPeople(g);
    a.mem = null;
    a.dissolve = 0;
    p.rig.o = a.back.o;
    moveTo(g, CORNER, XG.kerb);
    restoreWorkers(g);
    p.override = KERB;
    a.abu = actor(g, 'abuyazan', XG.kerb + 105, { f: 1, pose: { ...KERB, head: 0.4 } });
    a.k = 0.62;
    a.edge = 0.25;
    g.sound.setMuffle(0, 0.5);
    g.sound.ambience({ wind: 0.16, air: 0.3, crowd: 0, traffic: 0, generator: 0.04 }, 0.5);
    g.sound.score?.mood('silence', 2);
    yield* fadeTo(g, 0, 2);
    yield 2.5; // he breathes
    yield* this.lighter(g);
  },

  // 2C-2: the lighter and the journal; Abu Nidal; Choice F.
  *lighter(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    const abu = a.abu;
    abu.override = { ...POSES.kerb, head: 0.2, armN: 1.3, foreN: 1.5 };
    yield* say(g, 'gave');
    g.giveTool('lighter');
    g.giveTool('journal');
    s.ahmad_journal = true;
    g.sound.cloth();
    yield* say(g, 'lighter');
    abu.override = { ...KERB, head: 0.4 };
    yield 3; // a long pause
    yield* say(g, 'need');
    yield 2; // Sami doesn't respond
    yield* say(g, 'mother');
    yield 1;
    yield* say(g, 'beforeDark');
    // Abu Nidal at the end of the street, come because Abu Yazan sent word
    const nidal = actor(g, 'man2', XG.north + 160, { f: -1, o: { beard: 'thickMoustache', hair: '#3a332c', layer: { kind: 'jacket', color: '#4a4436' } } });
    g.runner.run(g.walkNpc(nidal, XG.kerb + 200, { speedScale: 0.55 }));
    yield () => nidal.goal === null;
    nidal.f = -1;
    yield* say(g, 'come');
    yield 0.8;
    const i = yield* g.choose(null, [
      { ar: 'روح عأم أحمد', en: 'Go to Um Ahmad' },
      { ar: 'بدي امشي لحالي', en: 'I need to walk alone' },
    ]);
    s.choices.push(`F${i + 1}`);
    p.override = null;
    p.f = 1;
    if (i === 0) {
      s.f_choice = 'umAhmad';
      s.um_ahmad_visited = true;
      yield* say(g, 'letsGo');
      g.runner.run(g.walkNpc(nidal, XG.end - 40, { speedScale: 0.55 }));
      g.text.objective(OBJ.follow);
      g.gate = (m) => Math.max(0, m) * 0.55;
      g.lock(false);
      yield () => p.x > XG.north + 100;
      g.lock();
      g.text.objective(null);
      g.gate = null;
      yield* this.umAhmad(g);
    } else {
      s.f_choice = 'alone';
      s.isolation = (s.isolation || 0) + 1;
      p.f = -1;
      p.override = { ...POSES.stand, head: 0.25 }; // he shakes his head, barely
      yield 0.6;
      yield* say(g, 'later');
      p.override = null;
      // east, away from both men; Abu Yazan watches, this time doesn't follow
      g.text.objective(OBJ.alone);
      g.gate = (m) => Math.min(0, m) * 0.6;
      g.runner.run(tween(g, 'k', 0.95, 20));
      g.lock(false);
      yield () => p.x < XG.east + 60;
      g.text.objective(null);
      g.gate = null;
      writeSave(s);
      yield* this.finish(g);
    }
  },

  // 2C-3: Um Ahmad, at her sewing machine.
  *umAhmad(g) {
    const a = g.a;
    const s = g.state;
    const p = g.player;
    yield* fadeTo(g, 1, 1.4);
    clearPeople(g);
    a.mem = 'umAhmad';
    a.light = 0;
    const [c] = UM_AHMAD;
    moveTo(g, UM_AHMAD, UM_DOOR_X + 50, { cam: { x: c, y: -150, view: 820 } });
    const um = actor(g, 'woman', SEWING_X, { f: -1, o: { headColor: '#2a2526' }, pose: { ...POSES.sitChair, head: 0.05, armN: 0.95, foreN: 1.5, armF: 0.9, foreF: 1.45 } });
    actor(g, 'man2', UM_DOOR_X - 40, { f: 1, o: { beard: 'thickMoustache', hair: '#3a332c', layer: { kind: 'jacket', color: '#4a4436' } } });
    g.sound.ambience({ wind: 0.04, air: 0.06, crowd: 0, traffic: 0, generator: 0 }, 1);
    a.clock = true;
    g.runner.run(tween(g, 'light', 1, 70)); // the gold light crosses the wall towards his photograph
    yield* fadeTo(g, 0, 1.6);
    // she nods him to the cushion by the sideboard; he sits, facing her
    yield 0.8;
    yield* g.walkPlayer(CUSHION_X);
    p.f = 1;
    a.cushion = true;
    p.override = { ...POSES.sitGround, torso: 0.08, head: 0.15, armN: 0.7, foreN: 1.5 };
    yield 1.2;
    um.override = { ...POSES.sitChair, head: -0.05, armN: 0.6, foreN: 1.4 };
    yield 1.2;
    yield* say(g, 'ahmad');
    yield 1;
    yield* say(g, 'mercy');
    // her hands close, open, close; her face does not change
    for (let i = 0; i < 2; i++) {
      um.override = { ...POSES.sitChair, head: 0, armN: 0.55, foreN: 1.15 };
      yield 0.7;
      um.override = { ...POSES.sitChair, head: 0, armN: 0.6, foreN: 1.4 };
      yield 0.7;
    }
    yield 2.5;
    for (const k of ['where', 'school', 'alone', 'yes', 'suffer', 'fast']) yield* say(g, k);
    um.override = { ...POSES.sitChair, head: 0.25, armN: 0.6, foreN: 1.4 };
    yield* say(g, 'thank');
    yield 4; // the clock
    um.override = { ...POSES.sitChair, head: 0.3, armN: 0.95, foreN: 1.5 };
    yield* say(g, 'shirt');
    um.override = { ...POSES.sitChair, head: 0.3, armN: 0.75, foreN: 1.9, armF: 0.7, foreF: 1.85 }; // the white cotton in her lap
    a.shirt = true;
    yield 3;
    um.override = { ...POSES.sitChair, head: -0.1, armN: 0.75, foreN: 1.9, armF: 0.7, foreF: 1.85 };
    yield* say(g, 'bring');
    yield 1.4;
    yield* say(g, 'willing');
    s.compassion = (s.compassion || 0) + 1;
    a.light = Math.max(a.light, 0.9);
    yield* tween(g, 'light', 1, 3); // the light reaches the photograph
    yield 4;
    a.clock = false;
    writeSave(s);
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
      a.endFade = clamp((g.time - t0) / 2.5);
      return a.endFade >= 1;
    };
    g.fade = 1;
    g.sound.ney(196, 10, 0.16);
    g.text.titleCard(CARDS.close, 6);
    yield 6.5;
    g.onEnd?.(s);
  },

  update(g, dt) {
    g.sound.zone?.('act2g', g.player.x); // the sound of each stretch of street
    const a = g.a;
    const p = g.player;
    g.lastDt = dt;
    // Ahmad beside him on the way to the cafeteria
    if (a.follow) {
      const w = a.follow;
      const want = p.x + 50;
      if (Math.abs(w.x - want) > 26 && w.goal === null) {
        w.goal = want;
        w.goalOpts = { speedScale: 0.62 };
      }
    }
    // the professor's drone, a low murmur in the hall
    if (a.drone && g.time > (a.nextDrone || 0)) {
      a.nextDrone = g.time + 0.5 + Math.random() * 0.4;
      g.sound.noise({ dur: 0.45, freq: 220 + Math.random() * 120, q: 4, vol: 0.05 });
    }
    // the wind-up clock in Um Ahmad's flat
    if (a.clock && g.time > (a.nextTick || 0)) {
      a.nextTick = g.time + 1;
      g.sound.noise({ dur: 0.02, freq: 4200, q: 3, vol: 0.05 });
    }
  },

  useTool(g, id) {
    if (id === 'lighter') g.sound.click();
  },

  drawProps(R, g) {
    if (g.a.mem !== 'umAhmad' || !g.a.cushion) return;
    R.cast((c) => {
      const x = CUSHION_X;
      c.fillStyle = '#7a2f2a';
      c.beginPath();
      c.moveTo(x - 46, 0);
      c.lineTo(x - 44, -12);
      c.quadraticCurveTo(x, -17, x + 44, -12);
      c.lineTo(x + 46, 0);
      c.fill();
      c.fillStyle = 'rgba(232,196,120,0.55)';
      for (let i = -3; i <= 3; i++) c.fillRect(x + i * 12 - 3, -9, 6, 2.4);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(x - 46, -3, 92, 3);
    });
  },

  draw(R, g) {
    const a = g.a;
    const t = g.time;
    if (a.mem === 'lecture') return drawLecture(R, g, { t });
    if (a.mem === 'campus') return drawCampus(R, g, { t, dissolve: a.dissolve });
    if (a.mem === 'umAhmad') return drawUmAhmad(R, g, { t, light: a.light, shirt: a.shirt ? 1 : 0 });
    drawCorner(R, g, { k: a.k, t });
  },

  look(g) {
    const a = g.a;
    let l;
    if (a.mem === 'lecture') l = lectureLook(g);
    else if (a.mem === 'campus') l = campusLook(g, a.dissolve);
    else if (a.mem === 'umAhmad') l = umAhmadLook(g, a.light);
    else l = cornerLook(g, a.k);
    // the screen's edges darken as time is compressed on the kerb
    return { ...l, fade: Math.max(l.fade || 0, a.endFade || 0), vignette: Math.max(l.vignette || 0, a.edge || 0) };
  },
};
