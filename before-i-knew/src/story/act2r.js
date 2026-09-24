// Act 2, Retrieval: The Evening (العصرية), from 4:30 pm.
// Scripted from script/act2.md, Path A. From the olive-tree corner south
// through the southern quarter (sniper lanes, a crawl through a collapsed
// wall), past the field hospital, to the sandbags at School Street. There
// Sami chooses how he'll reach Ahmad, and Abu Yazan catches him up.
//
// Every line comes from act2r-lines.js by key. Prompts, objectives and
// choice labels here are in Modern Standard Arabic.

import { lerp, clamp } from '../engine/util.js';
import { POSES } from '../rigs/person.js';
import { writeSave } from '../engine/save.js';
import { X, LANES, drawStreet, eveLook, surfaceAt } from './act2r-set.js';
import { LINES, WHO, CARDS } from './act2r-lines.js';

const P_FLINCH = { ...POSES.stand, torso: 0.35, head: -0.35, armN: 1.4, foreN: 2.2, armF: 1.2, foreF: 2.0, thighN: 0.5, shinN: -0.4 };
const P_RAISE = { ...POSES.stand, head: -0.1, armN: 2.55, foreN: 2.75 };
const P_SMOKE = { ...POSES.leanWall, head: 0.12, armN: 0.95, foreN: 2.55 };
const GAP = 0.45;

const OBJ = {
  south: ['اتجه جنوباً إلى شارع المدرسة', 'Head south, to School Street'],
  lane1: ['اعبر الممر منحنياً خلف الجدار', 'Cross the lane, low behind the wall'],
  lane2: ['انتظر حتى يبتعد القنّاص عن النافذة، ثم اعبر', 'Wait until the sniper leaves the window, then cross'],
  lane3: ['اعبر عندما يغطّي الدخان الممر', 'Cross when the smoke covers the lane'],
  crawl: ['ازحف عبر الفتحة في الجدار', 'Crawl through the gap in the wall'],
  on: ['تابع إلى نهاية الشارع', 'Go on to the end of the street'],
  sheet: ['خذ الشرشف عن الدرابزين', 'Take the sheet from the balcony rail'],
  rod: ['ابحث عن قضيب معدني', 'Find a metal rod'],
  back: ['عُد إلى المتراس', 'Go back to the sandbags'],
  raise: ['ارفع القماشة البيضاء', 'Raise the white cloth'],
  ruin: ['ادخل المبنى نصف المنهار', 'Go into the half-collapsed building'],
};

// A line by key, as a script step: shows it, tags placeholders in the log.
function* say(g, key) {
  const L = LINES[key];
  const step = g.say(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
  const first = step.next();
  markDraft(g, L);
  yield first.value;
}

// The same, without waiting for it.
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

export const ACT2R = {
  bounds: [-150, X.mouth[1] + 60],

  build(g) {
    const L = g.level;
    const s = g.state;
    const cp = s.checkpoint;
    g.a = { duskK: { lanes: 0.12, front: 0.62 }[cp] || 0, watch2: 1, watch3: 1, smoke: 0, tyreGlow: 1, expose: 0, laneState: null, t2: 0, t3: 0 };
    g.surface = surfaceAt;
    s.lane_retries ||= 0;
    for (const id of ['torch', 'mirror', 'walkie']) if (!s.tools.includes(id)) s.tools.push(id);
    s.tools = s.tools.filter((id) => id !== 'whitecloth');
    g.active = 'mirror';

    const startAt = { south: X.start, lanes: X.lanesCp + 20, front: X.frontCp + 40 }[cp] ?? X.start;
    g.player.place(startAt);
    g.player.f = 1;

    // --- the people on the way ---
    const tyreMan = g.npc('man', X.tyreMan, { f: 1 });
    tyreMan.override = { ...POSES.squat, head: 0.1 };
    // the medic, out for a cigarette against the wall of his hospital
    const medic = g.npc('medic', X.medic, { f: -1 });
    medic.override = P_SMOKE;
    medic.rig.prop = (c, hand) => cigarette(c, hand, g.time);
    // a local man, unarmed, watching from behind the sandbags
    const guard = g.npc('spotter', X.guard, { f: 1 });
    guard.override = { ...POSES.kneel, head: -0.15 };
    const abu = g.npc('abuyazan', X.stop - 700, { f: 1 });
    abu.visible = false;
    Object.assign(g, { tyreMan, medic, guard, abu });

    // --- the collapsed wall: only a crawl gets under it ---
    L.ceiling(X.crawl[0], X.crawl[1], -58);

    // --- examine points ---
    const look = (id, x, y, key, range = 90) => L.add({ id, x, y, range, label: ['تفحّص', 'Examine'], use: () => line(g, key) });
    look('wall1', X.wall1[0] - 40, -120, 'lane1_wall');
    look('car', X.car[0] - 30, -110, 'lane2_car');
    look('crawl', X.crawl[0] - 50, -80, 'crawl', 70);
    look('smoke', X.lane3[0] - 60, -160, 'lane3_smoke');
    look('hospital', X.hosp[0] + 300, -130, 'hospital', 110);

    // --- the way south ---
    // (only what's still ahead of a restarted checkpoint)
    const ahead = (x, fn) => x > startAt && L.at(x, fn);
    LANES.forEach((lane) => ahead(lane.x0 - 260, () => g.runner.run(this.laneIntro(g, lane))));
    ahead(X.crawl[0] - 180, () => g.runner.run(this.crawl(g)));
    ahead(X.lanesCp, () => g.checkpoint('lanes'));
    ahead(X.medic - 260, () => g.runner.run(this.hospital(g)));
    ahead(X.frontCp, () => g.checkpoint('front'));
    ahead(X.stop - 170, () => g.runner.run(this.frontline(g)));

    // our sandbags: no one goes past them
    g.gate = (move) => (move > 0 && g.player.x >= X.stop && !g.a.stepOut ? 0 : move);

    g.sound.ambience({ wind: 0.35, air: 0.45, generator: 0, crowd: 0, traffic: 0 }, 2);
    g.sound.score?.mood('dusk', 4);
    g.runner.run(this.opening(g));
    g.runner.run(ambient(g));
  },

  *opening(g) {
    const cp = g.state.checkpoint;
    if (cp === 'south') {
      g.text.titleCard(CARDS.open, 6);
      yield 6.5;
      g.text.objective(OBJ.south);
      g.prompt('right', 'امشِ', 'Walk');
      yield () => g.player.x > X.start + 120;
      g.prompt(null);
      yield 4;
      g.sound.radio(3);
      line(g, 'radio_west');
    } else {
      g.text.objective(cp === 'front' ? OBJ.on : OBJ.south);
    }
  },

  // ============================================================ the lanes ==

  *laneIntro(g, lane) {
    const p = g.player;
    g.sound.score?.mood('tense', 3);
    if (lane.id === 1) {
      g.text.objective(OBJ.lane1);
      g.prompt('crouch', 'انحنِ', 'Crouch down');
      yield* say(g, 'lane_intro');
      yield GAP;
      line(g, 'lane_light');
    } else if (lane.id === 2) {
      g.a.t2 = g.time; // his watch starts now: at the window first
      yield* say(g, 'lane2_car');
      yield GAP;
      line(g, 'lane2_hint');
      g.text.objective(OBJ.lane2);
      g.a.radio2 = true;
    } else {
      g.a.t3 = g.time;
      g.tyreMan.f = 1;
      yield* say(g, 'lane3_tyre');
      g.text.objective(OBJ.lane3);
    }
    yield () => p.x > lane.x1 + 20;
    if (lane.id === 2) g.a.radio2 = false;
    if (g.promptInfo?.en === 'Crouch down') g.prompt(null);
    g.text.objective(lane.id === 3 ? OBJ.on : OBJ.south);
    // stand again, unless the next thing along wants him low
    if (p.stance === 'crouch' && !g.promptInfo) {
      g.prompt('crouch', 'قِف', 'Stand up');
      yield () => p.stance === 'stand' || g.promptInfo?.en !== 'Stand up';
      if (g.promptInfo?.en === 'Stand up') g.prompt(null);
    }
    if (lane.id === 3) g.sound.score?.mood('dusk', 6);
  },

  // A warning shot: the round cracks into the wall ahead of him, and he
  // throws himself back to where the lane began.
  *warningShot(g, lane) {
    const p = g.player;
    const a = g.a;
    a.shotBusy = true;
    g.lock();
    const hx = p.f > 0 ? Math.min(p.x + 120, lane.x1 + 10) : Math.max(p.x - 120, lane.x0 - 10);
    const hy = -150 - Math.random() * 40;
    g.sound.sniperCrack();
    g.effects.puff(hx, hy);
    Object.assign(a, { shotAt: g.time, shotX: hx, shotY: hy });
    g.bump(0.25);
    p.override = P_FLINCH;
    yield 0.4;
    g.fade = 0.55;
    yield 0.2;
    p.override = null;
    p.place(lane.x0 - 70);
    p.f = 1;
    p.stance = 'crouch';
    g.fade = 0;
    g.state.lane_retries += 1;
    a.expose = 0;
    g.lock(false);
    a.shotBusy = false;
    const n = g.state.lane_retries;
    line(g, n === 1 ? 'warn_1' : n === 2 ? 'warn_2' : 'warn_3');
  },

  *lanePeek(g) {
    const p = g.player;
    g.lock();
    p.f = 1;
    p.override = POSES.mirror;
    yield 0.4;
    const stage = document.getElementById('stage');
    stage.classList.add('mirror');
    g.camOverride = { x: (X.lane2[0] + X.lane2[1]) / 2, y: -250, view: 820 };
    g.snapCamera();
    line(g, g.a.watch2 > 0.5 ? 'mirror_lane' : 'mirror_away');
    yield 3.2;
    stage.classList.remove('mirror');
    g.camOverride = null;
    g.snapCamera();
    p.override = null;
    g.lock(false);
  },

  // ============================================================ the crawl ==

  *crawl(g) {
    const p = g.player;
    g.text.objective(OBJ.crawl);
    g.prompt('prone', 'انبطح', 'Go prone');
    yield () => p.x > X.crawl[0] - 20 || p.stance === 'prone';
    yield () => p.x > X.crawl[1] + 20;
    if (g.promptInfo?.en === 'Go prone') g.prompt(null);
    g.text.objective(OBJ.south);
    if (p.stance !== 'stand') {
      g.prompt('prone', 'قِف', 'Stand up');
      yield () => p.stance === 'stand';
      g.prompt(null);
    }
  },

  // =================================================== the field hospital ==

  *hospital(g) {
    const p = g.player;
    const m = g.medic;
    g.lock();
    yield* g.walkPlayer(X.medic - 110);
    p.f = 1;
    yield 0.6;
    m.f = -1;
    yield* talk(g, ['medic_1', 'medic_2', 'medic_3']);
    // he drops the cigarette and steps on it
    m.rig.prop = null;
    m.override = { ...POSES.stand, head: 0.2 };
    yield 0.6;
    yield* talk(g, ['medic_4', 'medic_5', 'medic_6']);
    g.lock(false);
    g.text.objective(OBJ.on);
    // He watches Sami walk past, and lights another.
    yield () => p.x > X.medic + 60;
    yield 1.5;
    m.override = P_SMOKE;
    m.rig.prop = (c, hand) => cigarette(c, hand, g.time);
  },

  // ===================================================== the frontline ==

  *frontline(g) {
    const p = g.player;
    const gd = g.guard;
    g.sound.score?.mood('silence', 3);
    g.sound.ambience({ wind: 0.12, air: 0.15, generator: 0 }, 3);
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(X.stop - 30);
    p.f = 1;
    p.override = { ...POSES.crouch, head: 0.05 };
    // School Street, open to the checkpoint. The shape in the middle of it.
    g.camOverride = { x: (X.mouth[0] + X.mouth[1]) / 2 - 60, y: -190, view: 980 };
    yield 1.5;
    g.sound.birds();
    yield* say(g, 'shape');
    yield 1.2;
    gd.f = -1;
    gd.override = { ...POSES.crouch, head: 0.1 };
    g.camOverride = { x: X.stop + 60, y: -220, view: 1050 };
    yield* talk(g, ['man_1', 'man_2', 'man_3', 'man_4']);
    g.camOverride = { x: (X.mouth[0] + X.mouth[1]) / 2 - 60, y: -190, view: 980 };
    yield 2;
    p.override = null;
    yield* this.choiceD(g);
  },

  *choiceD(g) {
    const s = g.state;
    const gd = g.guard;
    const i = yield* g.choose(null, [
      { ar: 'خذ القماشة البيضاء', en: 'Take the white cloth' },
      { ar: 'هناك طريق آخر', en: 'There’s another way' },
    ]);
    g.camOverride = null;
    s.choices = s.choices.filter((c) => !c.startsWith('D'));
    s.choices.push(`D${i + 1}`);
    s.courage += 1;
    if (i === 0) {
      s.d_choice = 'cloth';
      yield* this.cloth(g);
    } else {
      s.d_choice = 'back';
      yield* talk(g, ['back_1', 'back_2']);
      gd.f = 1;
      gd.override = { ...POSES.kneel, head: -0.15 };
      yield* this.gift(g);
      yield* this.backWay(g);
    }
  },

  // D1: the sheet from the balcony rail, a curtain rail from the rubble.
  *cloth(g) {
    const L = g.level;
    const a = g.a;
    const p = g.player;
    const gd = g.guard;
    gd.f = 1;
    gd.override = { ...POSES.kneel, head: -0.15 };
    g.lock(false);
    g.text.objective(OBJ.sheet);
    L.add({ id: 'sheet', x: X.sheet, y: -150, range: 90, urgent: true, label: ['خذ', 'Take'], enabled: () => !a.hasSheet, use: () => (a.pull = true) });
    yield () => a.pull;
    g.lock();
    p.f = 1;
    p.override = POSES.reachUp;
    yield 0.6;
    a.hasSheet = true;
    g.sound.noise({ dur: 0.45, freq: 2400, q: 0.6, vol: 0.12 }); // it tears at one edge
    p.override = null;
    yield* say(g, 'sheet');
    g.lock(false);
    g.text.objective(OBJ.rod);
    a.rebarGlint = true;
    L.add({ id: 'rail', x: X.rebar, y: -60, range: 80, urgent: true, label: ['التقط', 'Pick up'], enabled: () => a.hasSheet && !a.hasRod, use: () => (a.hasRod = true) });
    yield () => a.hasRod;
    a.rebarGlint = false;
    g.lock();
    g.sound.click();
    yield* say(g, 'rail');
    g.giveTool('whitecloth');
    g.sound.cloth();
    yield* say(g, 'cloth_item');
    g.lock(false);
    g.text.objective(OBJ.back);
    yield () => p.x > X.stop - 220;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(X.stop - 30);
    p.f = 1;
    gd.f = -1;
    gd.override = { ...POSES.crouch, head: 0.1 };
    yield* talk(g, ['cloth_1', 'cloth_2', 'cloth_3', 'cloth_4']);
    gd.f = 1;
    gd.override = { ...POSES.kneel, head: -0.15 };
    yield* this.gift(g);
    g.lock(false);
    g.active = 'whitecloth';
    a.clothReady = true;
    g.text.objective(OBJ.raise);
    g.prompt('use', 'ارفع القماشة', 'Raise the cloth');
    yield () => a.raised;
    g.prompt(null);
    yield* this.clothEnd(g);
  },

  // Sami raises the cloth and steps out past the sandbags, into School Street.
  *clothEnd(g) {
    const p = g.player;
    const a = g.a;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(X.stop - 10);
    p.f = 1;
    p.override = P_RAISE;
    p.rig.prop = (c, hand) => whiteCloth(c, hand, g.time);
    g.sound.cloth();
    yield 1.6;
    a.duskEnd = g.time;
    a.stepOut = true;
    g.camOverride = { x: X.stop + 160, y: -230, view: 1150 };
    const xc = (X.mouth[0] + X.mouth[1]) / 2;
    yield* g.walkPlayer(xc);
    p.override = P_RAISE;
    yield* intoDepth(g, p, xc, 0.07, 0.3);
    yield* this.finish(g);
  },

  // D2: into the half-collapsed building beside the street.
  *backWay(g) {
    const L = g.level;
    const a = g.a;
    const p = g.player;
    g.lock(false);
    g.text.objective(OBJ.ruin);
    L.add({ id: 'ruinDoor', x: X.ruinDoor, y: -120, range: 80, urgent: true, label: ['ادخل', 'Go in'], enabled: () => !a.enter, use: () => (a.enter = true) });
    yield () => a.enter;
    g.lock();
    g.text.objective(null);
    yield* g.walkPlayer(X.ruinDoor);
    a.duskEnd = g.time;
    p.face('back');
    yield 0.5;
    p.visible = false;
    yield 1;
    g.sound.groan();
    g.bump(0.2);
    g.effects.trickle(X.ruinDoor + 10, -170, 3);
    yield 3;
    yield* this.finish(g);
  },

  // 2A-3: Abu Yazan has followed him south, slowly, and catches him up.
  *gift(g) {
    const p = g.player;
    const abu = g.abu;
    const s = g.state;
    abu.place(X.stop - 700);
    abu.visible = true;
    abu.f = 1;
    yield 0.8;
    yield* say(g, 'abu_1');
    p.f = -1;
    g.camOverride = { x: X.stop - 200, y: -230, view: 1150 };
    yield* g.walkNpc(abu, X.stop - 130, { speedScale: 0.45 });
    abu.f = 1;
    abu.override = { ...POSES.stand, torso: 0.12, head: 0.1 }; // breathing hard
    yield* talk(g, ['abu_2', 'abu_3']);
    abu.override = { ...POSES.stand, armN: 1.1, foreN: 1.3 };
    yield 0.6;
    g.giveTool('lighter');
    g.sound.click();
    abu.override = { ...POSES.stand, head: 0.05 };
    yield* say(g, 'lighter');
    yield GAP;
    abu.override = { ...POSES.stand, armN: 1.25, foreN: 1.45 }; // a hand on his arm
    yield* say(g, 'abu_4');
    g.giveTool('journal');
    s.journal = true;
    g.sound.cloth();
    yield* say(g, 'journal');
    yield GAP;
    abu.override = null;
    yield* say(g, 'abu_5');
    // He walks away, back north. Sami watches him go, then turns south.
    g.runner.run(
      (function* () {
        yield* g.walkNpc(abu, X.stop - 1100, { speedScale: 0.4 });
        abu.visible = false;
      })(),
    );
    yield 3;
    g.sound.noise({ dur: 1.6, freq: 500, q: 0.5, vol: 0.06, attack: 0.5 }); // a beat of wind
    yield 1.2;
    p.f = 1;
    g.camOverride = null;
  },

  // ========================================================== the end ==

  *finish(g) {
    const s = g.state;
    s.completed = true;
    s.checkpoint = 'south';
    writeSave(s);
    const t0 = g.time;
    yield () => {
      g.a.endFade = clamp((g.time - t0) / 1.8);
      return g.a.endFade >= 1;
    };
    g.fade = 1;
    g.sound.ambience({ crowd: 0, wind: 0, air: 0, generator: 0, traffic: 0 }, 2);
    yield 1.2;
    g.sound.score?.mood('after', 3);
    g.sound.ney(220, 10, 0.18); // the ney, lower than before, carrying on
    g.text.titleCard(CARDS.close, 7);
    yield 7.5;
    g.onEnd?.(s);
  },

  // =================================================== per-frame extras ==

  update(g, dt) {
    const a = g.a;
    const p = g.player;
    // the light goes as he goes south
    const k = clamp((p.x - X.start) / (X.stop - X.start)) * 0.5;
    a.duskK = a.duskEnd ? lerp(a.duskK, 0.8, 1 - Math.exp(-dt * 0.35)) : Math.max(a.duskK, k);

    // lane 2: at the window 6.5 s, away 3.5 s
    const c2 = a.t2 ? (g.time - a.t2) % 10 : 0;
    const w2 = c2 < 6.5 ? 1 : 0;
    if (a.radio2 && (w2 > 0.5) !== (a.watch2 > 0.5)) {
      g.sound.radio(1.6);
      line(g, w2 ? 'radio_watch' : 'radio_away');
    }
    a.watch2 = w2;
    // lane 3: the smoke thickens and thins on an 11 s cycle
    const c3 = a.t3 ? (g.time - a.t3) % 11 : 6;
    a.smoke = lerp(a.smoke, c3 < 5.5 ? 1 : 0, 1 - Math.exp(-dt * 1.2));
    a.watch3 = a.smoke < 0.55 ? 1 : 0;

    // exposure in a lane
    const lane = LANES.find((L) => p.x > L.x0 && p.x < L.x1);
    if (lane && !g.locked && g.scene === 'street') {
      const watching = lane.id === 1 ? true : lane.id === 2 ? a.watch2 > 0.5 : a.watch3 > 0.5;
      const covered = p.stance !== 'stand' && lane.cover.some(([c0, c1]) => p.x > c0 && p.x < c1);
      const safe = p.stance === 'prone' || covered || !watching;
      a.laneState = { id: lane.id, watching, safe };
      a.expose = safe ? Math.max(0, a.expose - dt * 2) : a.expose + dt;
      if (a.expose > 0.4 && !a.shotBusy) {
        a.expose = 0;
        g.runner.run(this.warningShot(g, lane));
      }
    } else {
      a.laneState = lane ? a.laneState : null;
      a.expose = 0;
    }
  },

  useTool(g, id) {
    const a = g.a;
    const x = g.player.x;
    if (id === 'mirror') {
      if (a.radio2 && x > X.peek2 - 250 && x < X.car[1]) g.runner.run(this.lanePeek(g));
      else line(g, 'mirror_plain');
    } else if (id === 'walkie') {
      g.sound.squelch();
      if (a.radio2) line(g, a.watch2 > 0.5 ? 'radio_watch' : 'radio_away');
      else line(g, 'radio_plain');
    } else if (id === 'whitecloth') {
      if (a.clothReady && x > X.stop - 220) a.raised = true;
      else line(g, 'cloth_wrong');
    } else if (id === 'lighter') {
      g.sound.click();
      a.flameAt = g.time;
      line(g, 'lighter_use');
    } else if (id === 'journal') {
      line(g, 'journal');
    }
  },

  draw(R, g) {
    drawStreet(R, g);
  },

  look(g) {
    return eveLook(g);
  },
};

// A cigarette between two fingers, its tip glowing as he draws on it.
function cigarette(c, hand, t) {
  const [hx, hy] = hand;
  c.fillStyle = '#e8e2d4';
  c.fillRect(hx - 1, hy - 7, 2, 8);
  c.fillStyle = `rgba(255,${120 + 60 * Math.max(0, Math.sin(t * 0.8))},60,0.95)`;
  c.fillRect(hx - 1.2, hy - 8.5, 2.4, 2);
}

// A bedsheet wrapped round a curtain rail, held high.
function whiteCloth(c, hand, t) {
  const [hx, hy] = hand;
  c.strokeStyle = '#4a3b2e';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(hx, hy + 30);
  c.lineTo(hx + 4, hy - 150);
  c.stroke();
  c.fillStyle = '#ece8de';
  c.beginPath();
  c.moveTo(hx + 4, hy - 148);
  for (let i = 0; i <= 6; i++) c.lineTo(hx + 4 + i * 14, hy - 148 + Math.sin(t * 5 + i * 0.9) * 4 * (i / 6));
  for (let i = 6; i >= 0; i--) c.lineTo(hx + 4 + i * 14, hy - 92 + Math.sin(t * 5 + i * 0.9 + 0.6) * 5 * (i / 6));
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(hx + 30, hy - 146);
  c.lineTo(hx + 34, hy - 94);
  c.stroke();
}

// Walk away from us into a street that runs into depth, up to depth kMax.
function* intoDepth(g, w, mouth, rate, kMax) {
  const base = w.rig.scale;
  let k = 0.001;
  w.face('back');
  yield () => {
    const dt = g.lastDt || 1 / 60;
    k = Math.min(kMax, k + rate * dt);
    const s = 1 / (1 + 3.4 * k);
    w.rig.scale = base * s;
    w.rig.x = mouth;
    w.rig.y = lerp(0, -86, 1 - s);
    w.stride += dt * 90 * s;
    w.pose(dt, 60);
    w.depthK = k;
    return k >= kMax;
  };
}

// Distant shots now and then, and swifts over the roofs.
function* ambient(g) {
  let nextShot = g.time + 6;
  let nextSwifts = g.time + 4;
  for (;;) {
    g.lastDt = 1 / 60;
    yield 0.5;
    if (g.time > nextShot) {
      nextShot = g.time + 5 + Math.random() * 7;
      if (!g.a.duskEnd) g.sound.distantShot();
    }
    if (g.time > nextSwifts && (g.a.duskK || 0) < 0.9) {
      nextSwifts = g.time + 14 + Math.random() * 12;
      g.a.swiftsAt = g.time;
      g.sound.swifts();
    }
  }
}

