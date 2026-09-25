// Act 1: The Afternoon (بعد الضهر)
// Scripted from script/act1.md. All dialogue and examine text is the
// script's own, in Damascene Arabic with its English.

import { lerp, clamp, smooth } from '../engine/util.js';
import { POSES, Person } from '../rigs/person.js';
import { Cat } from '../rigs/cat.js';
import { jerryCan } from '../sets/town.js';
import { X, drawStreet, sunLook, drawStairwell, stairLook, drawFlashback, flashLook, surfaceAt } from './act1-set.js';
import { Walker } from '../world/walker.js';
import { writeSave } from '../engine/save.js';

const SAMI = ['سامي', 'Sami'];
const AHMAD = ['أحمد', 'Ahmad'];
const OLD = ['الختيار', 'The old man'];
const SPOT = ['المرصد', 'The spotter'];
const RADIO = ['لاسلكي', 'Walkie-talkie'];
const LAYLA = ['ليلى', 'Layla'];
const ABU = ['أبو يزن', 'Abu Yazan'];
const WMAN = ['زلمة اللاسلكي', 'Walkie-talkie man'];

const LOOK = ['تفحّص', 'Examine'];

const P_FLINCH = { ...POSES.stand, torso: -0.08, head: -0.35, armN: 0.5, foreN: 1.6, armF: 0.4, foreF: 1.4 };
const P_STRUGGLE = { ...POSES.stand, torso: 0.55, head: 0.1, armN: 0.2, foreN: 0.2, armF: 0.1, foreF: 0.1 };
const P_TURNED = { ...POSES.stand, head: 0.1 };
const SPOT_SIT = { ...POSES.sitChair, head: 0.05, armN: 0.75, foreN: 2.95 };

// Pause between lines so the dialogue breathes.
const GAP = 0.45;

function* talk(g, lines) {
  for (const [who, line, style] of lines) {
    yield* g.say(who, line, null, style || '');
    yield GAP;
  }
}

export const ACT1 = {
  bounds: [-150, X.end],

  build(g) {
    const L = g.level;
    const s = g.state;
    g.a = { sunK: 0, drain: 0, talking: false };
    g.surface = surfaceAt;

    // --- geometry ---
    L.solid(X.wall0, X.wall1, -96, 400); // the collapsed wall: climb it
    L.ceiling(X.sag0, X.sag1, -150); // the sagged curtain: crouch under it

    // --- examine texts from the script ---
    L.add({ id: 'vine', x: X.vine, y: -150, range: 90, label: LOOK, use: () => g.line(null, ['دالية عنب. لسا عم تطلع من بين الحجار. ما حدا قلّها إنو في حرب.', 'A grape vine. Still growing up through the stones. No one told it there’s a war.'], 5, 'examine') });
    L.add({ id: 'curtain', x: X.curtain0 + 40, y: -220, range: 90, label: LOOK, use: () => g.line(null, ['ستارة قنّاص. شراشف مشدودة بين البنايتين. الطلقة بتفوت منها بس القنّاص ما بيشوف مين بيمشي وراها.', 'A sniper curtain. Sheets strung between the buildings. The bullet goes through, but the sniper can’t see who’s walking behind it.'], 6, 'examine') });
    L.add({ id: 'shop', x: X.shop + 110, y: -170, range: 110, label: LOOK, use: () => g.line(null, ['دكّان أبو ريّان. كان يبيع كل شي: خبز وسكّر وسجاير. هلّق ما فيه غير غبرة.', 'Abu Rayyan’s shop. It used to sell everything: bread, sugar, cigarettes. Now there’s nothing in it but dust.'], 5.5, 'examine') });
    L.add({ id: 'battery', x: X.battery + 60, y: -150, range: 90, label: LOOK, use: () => g.line(null, ['بطارية سيارة. بتشحن عشر تلفونات إذا بدها. مصدر الكهربا الوحيد لنص الحارة. الصبي اسمو فادي، عمرو خمستعش، صار المسؤول عنها لأنو هوّي الوحيد اللي بيعرف يفكّ ويركّب.', 'A car battery. It can charge ten phones if it has to. The only source of electricity for half the neighbourhood. The boy is Fadi, fifteen. He became responsible for it because he’s the only one who knows how to wire it.'], 9, 'examine') });
    L.add({ id: 'scrap', x: X.scrap + 90, y: -60, range: 70, label: LOOK, use: () => g.line(null, ['كومة حديد. نحاس. ألمنيوم. كانت بناية. هلّق هي عملة.', 'A pile of iron. Copper. Aluminium. It was a building. Now it’s currency.'], 5, 'examine') });
    L.add({ id: 'wing', x: X.collapsed + 120, y: -240, range: 80, label: LOOK, use: () => g.line(null, ['جناح المدرسة الشرقي. انهار بقصف هاون قبل شهرين. ما كان فيه حدا. الولاد كانوا بالقبو.', 'The eastern wing of the school. Collapsed from mortar fire two months ago. No one was inside. The children were in the basement.'], 6.5, 'examine') });
    L.add({
      id: 'shard',
      x: X.shard,
      y: -60,
      range: 60,
      label: ['التقط', 'Pick up'],
      enabled: () => !g.hasTool('mirror'),
      use: () => {
        g.giveTool('mirror');
        g.sound.click();
        g.runner.run(
          (function* () {
            yield* g.say(null, ['شقفة مراية. بتشوف فيها حالك، أو بتشوف فيها شو ورا الحيطان.', 'A shard of mirror. You can see yourself in it, or you can see what’s around walls.'], 5, 'examine');
            yield* g.say(null, ['شقفة مراية. بتبيّن فيها الطريق اللي ما عم تشوفها.', 'Mirror shard. It shows the road you can’t see.'], 4, 'item');
          })(),
        );
      },
    });

    // --- the player, the cast ---
    const startAt = { walk: X.start, hour: X.junction + 120, school: 6980, news: X.classroom + 80 }[s.checkpoint] ?? X.start;
    g.player.place(startAt);
    g.player.f = 1;

    if (s.checkpoint === 'walk') this.buildWalk(g);
    if (['walk', 'hour'].includes(s.checkpoint)) this.buildHour(g);
    if (['walk', 'hour', 'school'].includes(s.checkpoint)) this.buildSchool(g);
    this.buildNews(g);

    if (s.checkpoint !== 'walk') g.a.sunK = { hour: 0.2, school: 0.55, news: 0.8 }[s.checkpoint] || 0;
    if (s.checkpoint === 'hour') g.text.objective(['اتجه شرقاً نحو الأنابيب', 'Head east, to the pipes']);
    g.sound.score?.mood(s.checkpoint === 'walk' ? 'walk' : 'hour', 3);
    g.sound.life(0.7);
  },

  // ============================================================ Scene 1 ==

  buildWalk(g) {
    const L = g.level;
    const kh = g.npc('khaled', X.start + 80, { f: 1 });
    g.khaled = kh;
    g.a.khaledMode = 'follow';
    // Ahmad sets the pace: half a step ahead, loose and unhurried.
    kh.brain = (dt) => {
      const p = g.player;
      if (g.a.khaledMode === 'follow') {
        const target = Math.max(kh.x, p.x + 70);
        if (g.a.holdAhmad && kh.x >= g.a.holdAhmad) kh.update(dt, { stance: kh.stance });
        else if (target - kh.x > 8) kh.goTo(Math.min(target, g.a.holdAhmad ?? Infinity), dt, { speedScale: 0.55 });
        else kh.update(dt, {});
        // Waiting (held at the curtain or the junction, or just stopped
        // because Sami has): after a moment he turns round to face him.
        const held = g.a.holdAhmad && kh.x >= g.a.holdAhmad - 2;
        const waiting = held || target - kh.x <= 8;
        kh.waitT = waiting ? (kh.waitT || 0) + dt : 0;
        let want = 1;
        if (kh.waitT > 0.6 && p.x < kh.x - 40) want = -1;
        if (want !== kh.f && kh.onGround && !kh.mantle) {
          kh.f = want;
          kh.rig.pivot();
        }
      } else if (kh.goal !== null && kh.goal !== undefined) {
        if (kh.goTo(kh.goal, dt, kh.goalOpts || {})) kh.goal = null;
      } else if (g.a.khaledMode === 'depth') {
        // walking south, away from us down the side street
        kh.depthK = Math.min(1, (kh.depthK || 0.001) + dt * 0.06);
        const k = kh.depthK;
        const s = 1 / (1 + 3.4 * k);
        kh.rig.scale = s;
        kh.stride += dt * 90 * s;
        kh.pose(dt, 60);
        kh.rig.x = lerp(X.junction - 10, X.junction + 6, k);
        kh.rig.y = lerp(0, -70, 1 - s);
        g.a.occluder = k > 0.42 && k < 0.58 ? [X.junction + 10 - 34 * (1 - k), 34] : null;
        if (k >= 1) kh.visible = false;
      } else kh.update(dt, {});
    };
    // The player can't outwalk him.
    g.gate = (move) => {
      if (g.a.khaledMode !== 'follow' || move <= 0) return move;
      if (g.player.x > kh.x + 20) return 0;
      return g.player.x > kh.x - 60 ? move * 0.55 : move; // fall into step with him
    };

    g.runner.run(this.walk(g));

    L.at(X.pigeon, () => {
      g.sound.pigeons();
      g.a.pigeonAt = g.time;
      for (const w of [g.player, kh]) {
        w.override = P_FLINCH;
        setTimeoutGame(g, 0.4, () => (w.override = null));
      }
    });
    L.at(X.curtain0 + 50, () => {
      g.a.curtainPrompt = true;
    });
    L.at(X.junction - 140, () => {
      g.a.reachedJunction = true;
    });
  },

  *walk(g) {
    const kh = g.khaled;
    g.sound.ambience({ wind: 0.4, air: 0.5, generator: 0.6, traffic: 0, crowd: 0 });
    g.text.titleCard([['بعد الضهر', 'The Afternoon'], ['الساعة تلاتة وخمس دقايق', '3:05 PM · 14 August 2014']], 4.5);
    g.text.objective(['امشِ مع أحمد', 'Walk with Ahmad']);
    yield 5;
    g.prompt('right', 'امشِ', 'Walk');
    yield () => g.player.x > X.start + 120;
    g.prompt(null);
    // The sniper curtain runs by position, alongside the talk: crouch under the sag.
    g.a.holdAhmad = X.sag0 + 40;
    const curtain = g.runner.run(
      (function* () {
        yield () => g.player.x > X.curtain0 - 40;
        g.prompt('crouch', 'انحنِ', 'Crouch down');
        yield () => g.player.stance !== 'stand' || g.player.x > X.sag1;
        g.prompt(null);
        // from here he walks on as far as the junction, and waits there
        g.a.holdAhmad = X.junction - 60;
        g.a.curtainCleared = true;
        yield () => g.player.x > X.sag1 + 10;
        if (g.player.stance !== 'stand') g.prompt('crouch', 'قِف', 'Stand up');
        yield () => g.player.stance === 'stand';
        g.prompt(null);
      })(),
    );
    g.runner.run(ambientShots(g));

    yield* talk(g, [
      [AHMAD, ['عارف شو أكتر شي بشتاقلو؟', 'You know what I miss most?']],
      [SAMI, ['الكهربا.', 'Electricity.']],
      [AHMAD, ['لا يا زلمة. الفوتبول بعد المدرسة.', 'No, man. Football after school.']],
      [SAMI, ['من كل شي عم يصير، الفوتبول؟', 'Out of everything that’s happening, football?']],
      [AHMAD, ['إي والله. بتذكّر كنّا نرمي الشنط عالرصيف ونلعب بالشارع لحتى يعتّم؟', 'I swear. Remember we used to throw our bags on the pavement and play in the street till it got dark?']],
      [SAMI, ['لحتى يطلع أبوك يدوّر عليك.', 'Till your dad came out looking for you.']],
      [AHMAD, ['بتستاهل كل قتلة.', 'Worth every beating.']],
    ]);
    yield () => g.player.x > X.pigeon + 60;
    yield 1;
    yield* talk(g, [
      [SAMI, ['كيف الولاد اليوم؟', 'How were the kids today?']],
      [AHMAD, ['منيحين. عم يتعلّمو ماضي وحاضر ومستقبل.', 'Good. They’re learning past, present and future.']],
      [SAMI, ['بالقواعد تقصد.', 'You mean in grammar.']],
      [AHMAD, ['هيك قلت.', 'That’s what I said.']],
    ]);

    yield () => curtain.done || g.a.curtainCleared;
    yield () => kh.x > X.sag0 + 20;
    yield* talk(g, [
      [AHMAD, ['يا ريت نرجع نلعب بهالشارع متل زمان.', 'I wish we could play in this street like before.']],
      [SAMI, ['بهالشارع؟ هلّق المشي فيه صار رياضة.', 'This street? Now just walking down it is a sport.']],
    ]);
    yield () => curtain.done;

    // Rami, who asked what "abroad" means.
    yield* talk(g, [
      [AHMAD, ['بتعرف رامي؟ ابن أبو علي؟ اللي ساكنين بآخر الشارع؟', 'You know Rami? Abu Ali’s son? The ones who live at the end of the street?']],
      [SAMI, ['الصغير؟ اللي ما بيوقف حكي؟', 'The little one? Who never stops talking?']],
    ]);
    // the rubble: climb it
    const climbPrompt = g.runner.run(
      (function* () {
        yield () => g.player.x > X.wall0 - 90;
        if (g.player.x < X.wall1) g.prompt('jump', 'اقفز / تسلّق', 'Jump / Climb');
        yield () => g.player.x > X.wall0 + 20 || g.player.mantle;
        g.prompt(null);
      })(),
    );
    yield* talk(g, [
      [AHMAD, ['هاد. سألني اليوم: أستاز، شو يعني "برّا"؟', 'That’s him. He asked me today: “Teacher, what does ‘abroad’ mean?”']],
    ]);
    yield 1.2;
    yield* talk(g, [
      [AHMAD, ['يعني ما بيعرف. ما طلع من هون بحياتو. ما شاف شي غير هالحارة. "برّا" بالنسبالو كلمة مثل "تنّين": شي بيسمع فيه بس ما شافو.', 'He doesn’t know. He’s never been outside this neighbourhood in his life. He’s never seen anything else. “Abroad” is like “dragon” to him: something he’s heard of but never seen.']],
    ]);
    yield () => climbPrompt.done;

    // The parting.
    yield () => g.a.reachedJunction && kh.x >= X.junction - 70;
    yield* this.parting(g);
  },

  *parting(g) {
    const kh = g.khaled;
    const p = g.player;
    g.lock();
    g.text.objective(null);
    g.a.khaledMode = 'script';
    yield* g.walkPlayer(X.junction - 150);
    p.f = 1;
    kh.f = -1;
    kh.override = P_TURNED;
    g.camOverride = { x: X.junction - 60, y: -240, view: 1150 };
    g.a.sunK = 0.1;
    g.sound.ambience({ generator: 0.25, air: 0.4 });
    yield 0.6;
    yield* talk(g, [
      [AHMAD, ['يلا، أنا رايح من هون. بدي مرّ عند أم سعيد وعيلتا، بنتن مريضة وما في حدا يشوفها.', 'Right, I’m heading off from here. I want to check on Um Said and her family. Their daughter’s ill and there’s no one to see her.']],
      [SAMI, ['من وين رايح؟ من شارع المدرسة؟', 'Which way are you going? Through School Street?']],
      [AHMAD, ['إي، أسرع.', 'Yeah, it’s quicker.']],
    ]);
    yield 0.8; // he considers saying something
    yield* talk(g, [
      [SAMI, ['خلّي بالك ع حالك.', 'Take care of yourself.']],
      [AHMAD, ['دايماً. بشوفك بالليل إن شاء الله. عندي نكتة جديدة، مو رح تصدّقها.', 'Always. I’ll see you tonight, God willing. I’ve got a new joke. You won’t believe it.']],
      [SAMI, ['نكاتك ما بتنضحك.', 'Your jokes aren’t funny.']],
      [AHMAD, ['هاي الأحلى من كلهن. الليلة بتسمعها.', 'This one’s the best yet. Tonight, you’ll hear it.']],
      [AHMAD, ['يلا، يا هندسة.', 'See you, ya handasa.']],
    ]);
    kh.override = POSES.wave;
    yield 1.1;
    kh.override = null;
    // He walks to the mouth of the southern road, then away down it.
    yield* g.walkNpc(kh, X.junction - 10);
    g.a.khaledMode = 'depth';
    kh.face('back');
    g.camOverride = { x: X.junction - 80, y: -230, view: 1050 };
    yield () => !kh.visible;
    g.a.occluder = null;
    // The street is empty. A beat of silence, then the world again.
    g.sound.ambience({ generator: 0, air: 0.1, wind: 0.1 }, 0.5);
    yield 2.5;
    g.sound.ambience({ generator: 0.5, air: 0.5, wind: 0.35 }, 3);
    g.sound.pigeons();
    yield 1.5;
    g.camOverride = null;
    g.lock(false);
    g.checkpoint('hour');
    g.sound.score?.mood('hour', 8);
    g.text.objective(['اتجه شرقاً نحو الأنابيب', 'Head east, to the pipes']);
  },

  // ============================================================ Scene 3 ==

  buildHour(g) {
    const L = g.level;
    const s = g.state;
    const old = g.npc('oldman', X.oldMan, { f: 1 });
    old.override = P_STRUGGLE;
    g.oldMan = old;
    g.a.cansOnGround = 2;

    L.at(X.oldMan - 150, () => g.runner.run(this.oldManScene(g)));

    // the corner: look before you cross
    g.a.mirrorChecked = false;
    const prevGate = g.gate;
    g.gate = (move) => {
      if (prevGate) move = prevGate(move);
      if (!g.a.mirrorChecked && move > 0 && g.player.x > X.corner - 40) {
        if (!g.a.cornerWarned) {
          g.a.cornerWarned = true;
          g.runner.run(this.cornerWarn(g));
        }
        return 0;
      }
      return move;
    };

    // the spotter's post: a stool at a second-floor window, radio to his ear
    L.solid(X.spotter - 30, X.spotter + 90, -330, -318, { noClimb: true });
    const sp = g.npc('spotter', X.spotter + 30, { y: -330, f: -1 });
    sp.override = SPOT_SIT;
    g.spotter = sp;
    L.at(X.spotter - 220, () => g.runner.run(this.spotterScene(g)));

    L.at(X.heli, () => g.runner.run(this.jetStrike(g)));
    L.at(X.oldMan + 500, () => (g.a.sunK = Math.max(g.a.sunK, 0.3)));
  },

  *oldManScene(g) {
    const p = g.player;
    const old = g.oldMan;
    g.lock();
    yield* g.walkPlayer(X.oldMan - 110);
    p.f = 1;
    yield* g.say(null, ['غالونين مي. عشرين ليتر الواحد. من البير لهون مسافة ربع ساعة. بالحر هاد، ساعة.', 'Two water jugs. Twenty litres each. From the well to here, a fifteen-minute walk. In this heat, an hour.'], 5.5, 'examine');
    const i = yield* g.choose(null, [
      { ar: 'ساعِده', en: 'Help him' },
      { ar: 'تابع طريقك', en: 'Keep walking' },
    ]);
    g.state.choices.push(`A${i + 1}`);
    if (i === 0) {
      g.state.compassion += 1;
      g.state.helped_old_man = true;
      yield* g.walkPlayer(X.oldMan + 10);
      old.f = -1;
      old.override = { ...POSES.stand, torso: 0.1 };
      yield* g.say(OLD, ['الله يخلّيك يا ابني...', 'God bless you, son...']);
      yield GAP;
      // take one jug; he takes the other
      g.a.cansOnGround = 0;
      p.carry = true;
      p.rig.prop = (c, hand) => jerryCan(c, hand[0], hand[1] + 44, 0.95);
      old.carry = true;
      old.override = null;
      old.rig.prop = (c, hand) => jerryCan(c, hand[0], hand[1] + 44, 0.95, '#d4a82a');
      g.sound.slosh();
      yield* g.say(SAMI, ['لوين بدك توصّلهن؟', 'Where do you need to get these?']);
      yield GAP;
      yield* g.say(OLD, ['هون، ع آخر الزقاق. بنتي وولادها. ما عندهن مي من مبارح.', 'Here, at the end of the alley. My daughter and her children. They’ve had no water since yesterday.']);
      // walk together, slowly
      g.runner.run(g.walkNpc(old, X.door + 70, { speedScale: 0.6 }));
      g.runner.run(
        (function* () {
          yield 2;
          yield* g.say(OLD, ['كنت بشيل زيتون من الضيعة، شوالين عكتافي، وما كنت حسّ فيهن. هلّق غالون مي بيكسرني.', 'I used to carry olives from the village, sacks on my shoulders, and feel nothing. Now a jug of water breaks me.'], 6);
        })(),
      );
      yield* g.walkPlayer(X.door - 40);
      yield () => old.goal === null;
      p.f = 1;
      old.f = -1;
      g.sound.noise({ dur: 0.08, freq: 400, q: 2, vol: 0.3 });
      yield 0.25;
      g.sound.noise({ dur: 0.08, freq: 400, q: 2, vol: 0.3 });
      yield 1;
      g.a.doorOpen = 0.35;
      g.a.doorGlow = 0.4;
      p.carry = false;
      p.rig.prop = null;
      yield* talk(g, [
        [OLD, ['الله يحميك. شو اسمك؟', 'God protect you. What’s your name?']],
        [SAMI, ['سامي.', 'Sami.']],
        [OLD, ['الله يحمي أهلك يا سامي.', 'God protect your family, Sami.']],
      ]);
      old.face('back');
      yield 0.7;
      old.visible = false;
      g.a.doorOpen = 0;
      g.a.doorGlow = 0;
      g.sound.noise({ dur: 0.15, freq: 300, q: 1, vol: 0.3 });
    } else {
      g.state.isolation += 1;
      g.state.helped_old_man = false;
      g.lock(false);
      // No judgement. The camera lingers on him a moment, then follows Sami.
      yield () => p.x > X.oldMan + 90;
      g.camOverride = { x: X.oldMan + 120, y: -240, view: 1400 };
      yield 2.2;
      g.camOverride = null;
    }
    g.lock(false);
    writeSave(g.state);
  },

  *cornerWarn(g) {
    if (!g.hasTool('mirror')) {
      yield* g.say(null, ['المفرق مكشوف عالغرب. أحسن ما تطلع قبل ما تشوف شو في.', 'The intersection is exposed to the west. Better not to step out before you see what’s there.'], 4.5, 'examine');
      g.a.cornerWarned = false;
      return;
    }
    g.active = 'mirror';
    g.prompt('use', 'استخدم المرآة', 'Use the mirror');
    yield () => g.a.mirrorChecked;
    g.prompt(null);
  },

  *mirrorPeek(g) {
    const p = g.player;
    g.lock();
    g.prompt(null);
    p.f = 1;
    p.override = POSES.mirror;
    yield 0.5;
    const stage = document.getElementById('stage');
    stage.classList.add('mirror');
    g.camOverride = { x: (X.corner + X.cross1) / 2, y: -240, view: 900 };
    g.snapCamera();
    yield 3.8;
    stage.classList.remove('mirror');
    g.camOverride = null;
    g.snapCamera();
    p.override = null;
    g.a.mirrorChecked = true;
    g.lock(false);
  },

  *spotterScene(g) {
    const p = g.player;
    const sp = g.spotter;
    g.lock();
    yield* g.walkPlayer(X.spotter - 140);
    p.f = 1;
    sp.override = POSES.peekWindow; // he leans out over the sill to call down
    sp.f = -1;
    g.camOverride = { x: X.spotter - 60, y: -300, view: 1300 };
    yield* g.say(SPOT, ['يا زلمة! وين رايح؟ الطيران عم يضرب عالقبلي.', 'Hey, man! Where are you headed? The planes are hitting the southern quarter.'], null, 'shout');
    yield GAP;
    p.override = POSES.lookUp;
    yield* g.say(SAMI, ['رايح عالشرقي. عالأنابيب.', 'Heading to the eastern quarter. To the pipes.']);
    yield GAP;
    yield* g.say(SPOT, ['خود هاد. أحسنلك.', 'Take this. Better for you.']);
    // the walkie-talkie comes down on a rope
    g.a.rope = 0;
    const t0 = g.time;
    yield () => {
      g.a.rope = clamp((g.time - t0) / 3);
      return g.a.rope >= 1;
    };
    p.override = null;
    yield* g.walkPlayer(X.spotter - 24);
    p.f = 1;
    g.lock(false);
    g.prompt('interact', 'خذ جهاز اللاسلكي', 'Take the walkie-talkie');
    const taken = { v: false };
    g.level.add({ id: 'walkie', x: X.spotter - 10, y: -170, range: 60, label: ['خذ', 'Take'], use: () => (taken.v = true) });
    yield () => taken.v;
    g.level.remove('walkie');
    g.prompt(null);
    g.lock();
    g.giveTool('walkie');
    g.sound.squelch();
    g.a.rope = 2;
    yield* g.say(null, ['لاسلكي. بتسمع فيه تحذيرات الرصد. ما بيبعت، بس بيستقبل.', 'Walkie-talkie. You hear the spotters’ warnings. Receive only.'], 4.5, 'item');
    yield GAP;
    yield* g.say(SPOT, ['الموجة ٣. إذا سمعت "مروحي" أو "حربي"، انبطح. إذا سمعت "فيل"، الله يستر.', 'Channel 3. If you hear “mirwahi” (helicopter) or “harbi” (jet), get flat. If you hear “elephant”, God help us.'], 6);
    sp.override = SPOT_SIT;
    sp.f = -1;
    g.camOverride = null;
    g.lock(false);
  },

  // A jet, low and fast. The whine comes first; there are a few seconds to
  // get flat before it tears overhead, and then it hits another quarter.
  *jetStrike(g) {
    const p = g.player;
    g.a.heliWarn = g.time;
    g.sound.score?.mood('danger', 3);
    g.a.sunK = Math.max(g.a.sunK, 0.4);
    g.sound.radio(2.4);
    yield* g.say(RADIO, ['...حربي... حربي فوق الشرقي... حربي...', '...jet... jet over the eastern quarter... jet...'], 3.5, 'radio');
    const dur = 10;
    const over = 0.5;
    g.sound.jetPass(dur, over);
    const tOver = g.time + dur * over;
    // it crosses the sky in little more than a second, low and left to right
    g.a.jetFly = { t0: tOver - 0.7, dur: 1.4, x0: p.x * 0.35 - 1300, x1: p.x * 0.35 + 1300 };
    g.prompt('prone', 'انبطح!', 'Get down!');
    const t0 = g.time;
    yield () => p.stance === 'prone' || g.time - t0 > 4.3;
    g.prompt(null);
    g.lock();
    if (p.stance !== 'prone') {
      p.stance = 'prone'; // the body knows before the mind does
    }
    // The helplessness is the lesson: lie there and listen.
    g.camOverride = { x: p.x + 40, y: -200, view: 1250 };
    yield () => g.time >= tOver - 0.2;
    g.a.jetShadow = g.time;
    g.bump(0.35);
    yield 2;
    g.camOverride = null;
    // The strike, on another quarter.
    g.sound.strikeFar();
    g.bump(0.95);
    g.runner.run(
      (function* () {
        yield 0.7;
        g.bump(0.45); // the ground keeps shaking
        yield 0.8;
        g.bump(0.25);
      })(),
    );
    g.a.plumeAt = g.time;
    g.a.plumeX = g.cam.x * 0.3 - 420;
    yield 3;
    g.sound.radio(2.2);
    yield* g.say(RADIO, ['...ضربة حربي... عالحارة القبلية... ضربة حربي...', '...airstrike... the southern quarter... airstrike...'], 4, 'radio');
    g.lock(false);
    g.prompt('jump', 'قِف', 'Get up');
    yield () => p.stance === 'stand';
    g.prompt(null);
    g.player.rig.dust = 0.15;
    g.sound.score?.mood('hour', 10);
    writeSave(g.state);
  },

  // ======================================================= the school ====

  buildSchool(g) {
    const L = g.level;
    const kids = [];
    const mk = (outfit, x, f, pose) => {
      const k = g.npc(outfit, x, { f, scale: outfit === 'layla' ? 0.64 : 0.58 });
      k.override = pose;
      kids.push(k);
      return k;
    };
    g.layla = mk('layla', X.layla, 1, POSES.sort);
    g.boy = mk('boy', X.layla + 60, -1, POSES.sort);
    g.boy.rig.scale = 0.5;
    const runners = [mk('kid2', X.scrap + 120, -1, POSES.sort), mk('kid3', X.scrap + 210, 1, POSES.sort), mk('fadi', 7200, 1, POSES.sort)];
    runners[2].rig.scale = 0.6;
    g.kids = kids;
    g.runnerKids = runners;
    // the others play: dash between piles, calling out finds
    runners.forEach((k, i) => {
      k.play = true;
      k.brain = (dt) => {
        if (k.hide) {
          if (k.goTo(X.stairs, dt, { run: true })) enterDoor(g, k);
          return;
        }
        if (k.play) {
          if (k.goal === null || k.goal === undefined) {
            k.override = null;
            k.goal = X.scrap - 120 + ((Math.sin(g.time * 0.7 + i * 2) + 1) / 2) * 360;
          }
          if (k.goTo(k.goal, dt, { run: true, speedScale: 0.7 })) {
            k.goal = null;
          }
        } else k.update(dt, {});
      };
    });

    L.add({
      id: 'layla',
      x: X.layla,
      y: -130,
      range: 80,
      label: ['تحدّث إلى ليلى', 'Talk to Layla'],
      enabled: () => !g.a.laylaTalked && !g.a.shelling,
      use: () => {
        g.a.laylaTalked = true;
        g.runner.run(this.laylaTalk(g));
      },
    });

    // the cat (after the shelling)
    const cat = new Cat();
    cat.x = X.catWall;
    cat.y = -148;
    cat.f = -1;
    cat.hidden = true;
    g.cat = cat;
    L.add({
      id: 'cat',
      x: X.catWall,
      y: -200,
      range: 110,
      label: ['القطة', 'The cat'],
      enabled: () => !cat.hidden && !g.a.catDone,
      use: () => g.runner.run(this.catScene(g)),
    });

    L.at(6950, () => {
      g.checkpoint('school');
      g.a.sunK = Math.max(g.a.sunK, 0.55);
      g.sound.ambience({ crowd: 0.35, generator: 0.1 });
    });
    L.at(X.scrap + 150, () => g.runner.run(this.shelling(g)));
    L.at(X.classroom - 30, () => {
      if (g.a.shellingDone) g.runner.run(this.flashback(g));
      else g.a.flashbackPending = true;
    });
  },

  *laylaTalk(g) {
    g.lock();
    g.player.f = -1;
    yield* g.say(LAYLA, ['بتعرف قدّيش كيلو حديد لازم الواحد يلمّ لحتى يشتري كيس برغل؟', 'Do you know how many kilos of scrap metal you need to collect for a bag of bulgur?'], 5);
    yield GAP;
    yield* g.say(SAMI, ['كم؟', 'How many?']);
    yield GAP;
    yield* g.say(LAYLA, ['كتير.', 'A lot.']);
    g.lock(false);
  },

  *shelling(g) {
    const p = g.player;
    const s = g.state;
    g.a.shelling = true;
    g.sound.score?.mood('danger', 1.5);
    g.a.sunK = Math.max(g.a.sunK, 0.62);
    const impact = (x, dist) => {
      g.sound.mortarImpact(dist, g.sound.panFor(x));
      g.effects.blast(x, 0, dist < 1.5 ? 1 : 0.6);
      g.a.flashAt = g.time;
      g.a.flashX = x;
      g.bump(dist < 1.5 ? 0.6 : 0.3);
    };
    const kidsFreeze = () => {
      for (const k of [...g.kids]) {
        k.play = false;
        k.goal = null;
        k.override = { ...POSES.stand, head: -0.35 };
      }
    };
    g.lock();
    g.sound.mortarWhistle(1.4);
    yield 1.4;
    impact(6880, 2.2);
    kidsFreeze();
    yield 0.9;
    g.sound.mortarWhistle(1.2);
    yield 1.2;
    impact(7120, 1.4);
    g.sound.carAlarm(10);
    // most of them run for the basement stairs; Layla and the little one freeze
    for (const k of g.runnerKids) {
      k.override = null;
      k.hide = true;
    }
    g.boy.override = { ...POSES.grief, torso: 0.3 };
    g.layla.override = { ...POSES.stand, head: -0.3, armN: 0.4, foreN: 0.9 };
    // shells keep walking in, away from the children
    const barrage = g.runner.run(
      (function* () {
        const xs = [6990, 7220, 7060, 7290, 6930];
        for (const x of xs) {
          g.sound.mortarWhistle(1.1);
          yield 1.1;
          impact(x, Math.abs(x - p.x) / 300);
          yield 0.6 + Math.random() * 0.8;
          if (g.a.stopBarrage) return;
        }
      })(),
    );
    const i = yield* g.choose(null, [
      { ar: 'احمِ الأطفال', en: 'Shield the children' },
      { ar: 'احتمِ', en: 'Take cover' },
    ], { timed: 7, def: 1 });
    s.choices.push(`B${i + 1}`);

    if (i === 0) {
      s.compassion += 1;
      s.children_helped = true;
      g.lock(false);
      g.text.objective(['خذ ليلى والطفل إلى الدرج', 'Get Layla and the boy to the stairs']);
      g.prompt('run', 'اركض', 'Run');
      const grabbed = { v: false };
      g.level.add({ id: 'grab', urgent: true, x: (X.layla + g.boy.x) / 2, y: -110, range: 110, label: ['خذهما', 'Take them'], use: () => (grabbed.v = true) });
      yield () => grabbed.v;
      g.level.remove('grab');
      g.prompt(null);
      g.line(SAMI, ['يلا يلا يلا! عالدرج!', 'Go go go! To the stairs!'], 2.5, 'shout');
      // they run with him, crouched, his body between them and the sky
      for (const [k, off] of [[g.layla, -40], [g.boy, -80]]) {
        k.override = null;
        k.brain = (dt) => k.goTo(Math.min(g.player.x + off, X.stairs), dt, { run: true });
      }
      g.runner.run(
        (function* () {
          yield 1.2;
          g.sound.mortarWhistle(1);
          yield 1;
          impact(X.scrap + 40, 0.9); // lands in the open area behind them
          g.a.crater = true;
          yield 1.5;
          g.sound.mortarWhistle(1);
          yield 1;
          impact(X.stairs - 380, 0.8);
        })(),
      );
      g.text.objective(['إلى الدرج', 'To the stairs']);
      yield () => g.player.x >= X.stairs - 20;
      g.text.objective(null);
      g.lock();
      g.a.stopBarrage = true;
      yield* this.stairwell(g);
    } else {
      s.isolation += 1;
      // dive behind the nearest wall
      yield* g.walkPlayer(X.lowWall + 20, { run: true });
      p.f = -1;
      p.stance = 'prone';
      // Layla pulls the little one to the basement on her own
      g.layla.override = null;
      g.boy.override = null;
      g.layla.brain = (dt) => {
        if (g.layla.goTo(X.stairs, dt, { run: true })) enterDoor(g, g.layla);
      };
      g.boy.brain = (dt) => {
        if (g.boy.goTo(Math.min(g.layla.x - 30, X.stairs), dt, { run: true }) && !g.layla.visible) enterDoor(g, g.boy);
      };
      g.camOverride = { x: X.lowWall - 120, y: -200, view: 1300 };
      yield 2.2;
      g.sound.mortarWhistle(1);
      yield 1;
      impact(X.scrap + 40, 0.9);
      g.a.crater = true;
      yield 2.5;
      g.sound.mortarWhistle(1.2);
      yield 1.2;
      impact(6960, 2.4);
      yield () => !g.layla.visible;
      yield 2;
      g.camOverride = null;
      g.a.stopBarrage = true;
    }

    // After: ringing silence, settling rubble, dust like fog.
    yield () => barrage.done;
    g.sound.ringing(1);
    g.sound.setMuffle(0.55, 0.4);
    g.effects.fog = Math.max(g.effects.fog, 0.8);
    yield 2.5;
    g.sound.ringing(0, 3);
    g.sound.setMuffle(0, 4);
    for (const k of g.kids) k.visible = false;
    g.a.crater = true;
    g.a.shelling = false;
    g.a.shellingDone = true;
    g.sound.score?.mood('hour', 12);
    g.player.rig.dust = 0.7;
    g.player.stance = g.player.stance === 'prone' ? 'prone' : 'stand';
    g.lock(false);
    if (g.player.stance !== 'stand') {
      g.prompt('jump', 'قِف', 'Get up');
      yield () => g.player.stance === 'stand';
      g.prompt(null);
    }
    g.sound.ambience({ crowd: 0, generator: 0, air: 0.35, wind: 0.3 });
    g.cat.hidden = false;
    writeSave(g.state);
    if (g.a.flashbackPending) g.runner.run(this.flashback(g));
  },

  *stairwell(g) {
    const p = g.player;
    g.fade = 1;
    yield 0.4;
    g.scene = 'stairwell';
    g.camOverride = { x: -60, y: -300, view: 1400 };
    g.snapCamera();
    const saved = { x: p.x, f: p.f };
    const bounds = g.level.bounds;
    g.level.bounds = [-2000, bounds[1]];
    p.place(-120);
    p.f = 1;
    p.stance = 'crouch';
    const mkKid = (outfit, x, f, pose, scale) => {
      const w = new Walker(g.level, outfit, scale);
      w.place(x);
      w.f = f;
      w.override = pose;
      w.update(0.016, {});
      return w;
    };
    const eyesShut = { ...POSES.crouch, head: 0.4, torso: 0.3 };
    g.stairKids = [
      mkKid('kid2', -420, 1, { ...POSES.crouch, head: 0.2 }, 0.58),
      mkKid('kid3', -300, 1, { ...POSES.crouch, head: 0.3 }, 0.58),
      mkKid('layla', 120, -1, eyesShut, 0.64),
      mkKid('boy', 220, -1, { ...POSES.kneel, head: 0.3 }, 0.5),
    ];
    g.stairKids.forEach((w) => {
      w.stance = 'crouch';
    });
    g.sound.setMuffle(0.6, 0.3);
    g.fade = 0;
    // the torch comes to hand; wait for the player to light it (or a few seconds)
    g.active = 'torch';
    if (!g.torch.on) g.prompt('use', 'أشعل المصباح', 'Torch');
    const t0 = g.time;
    g.runner.run(
      (function* () {
        for (let i = 0; i < 2; i++) {
          yield 1.4 + i;
          g.sound.mortarImpact(2.5);
          g.effects.trickle(-100 + i * 200, -640, 3);
          g.bump(0.25);
        }
      })(),
    );
    yield 3.5;
    yield () => g.torch.on || g.time - t0 > 9;
    g.prompt(null);
    p.override = { ...POSES.crouch, armN: 0.2, foreN: 0.9, armF: 0.1, foreF: 0.8, head: 0.2 }; // hands pressed flat to his knees
    yield* g.say(LAYLA, ['شكراً.', 'Thank you.'], 3);
    yield GAP;
    yield* g.say(SAMI, ['ابقوا هون. لا تطلعوا لحتى يهدا.', 'Stay here. Don’t come out until it’s quiet.'], 4);
    yield 1.5;
    g.fade = 1;
    yield 0.5;
    g.scene = 'street';
    g.level.bounds = bounds;
    g.stairKids = null;
    p.override = null;
    p.place(saved.x + 20);
    p.f = 1;
    p.stance = 'stand';
    g.camOverride = null;
    g.snapCamera();
    g.fade = 0;
  },

  *catScene(g) {
    const cat = g.cat;
    g.a.catDone = true;
    g.lock();
    g.player.f = g.player.x < cat.x ? 1 : -1;
    g.camOverride = { x: (g.player.x + cat.x) / 2, y: -220, view: 1000 };
    yield 1;
    // one slow blink
    const t0 = g.time;
    yield () => {
      const k = (g.time - t0) / 1.4;
      cat.blink = Math.sin(clamp(k) * Math.PI);
      return k >= 1;
    };
    yield* g.say(null, ['بسّة. مو جوعانة أكتر من أي حدا هون. وعم تستنى نفس الشي: إنو يخلص.', 'A cat. No hungrier than anyone else here. Waiting for the same thing: for it to end.'], 6, 'examine');
    yield 1.2;
    // it turns, drops off the wall, and is gone into the rubble without a sound
    cat.f = 1;
    const t1 = g.time;
    yield () => {
      const k = (g.time - t1) / 1.6;
      cat.sit = 1 - clamp(k * 3);
      cat.x = X.catWall + k * 90;
      cat.y = -148 + Math.max(0, k - 0.35) * 260;
      cat.speed = 60;
      if (k >= 1) cat.hidden = true;
      return k >= 1;
    };
    g.camOverride = null;
    g.lock(false);
  },

  *flashback(g) {
    if (g.a.flashbackStarted) return;
    g.a.flashbackStarted = true;
    const p = g.player;
    g.lock();
    p.f = -1;
    g.camOverride = { x: X.classroom - 60, y: -150, view: 900 };
    yield 2.2;
    g.fade = 1;
    yield 0.8;
    // An evening in 2010. Everything whole.
    g.scene = 'flashback';
    g.a.flashFade = 0;
    g.camOverride = { x: 0, y: -210, view: 1150 };
    g.snapCamera();
    const young = (outfit, x, f) => {
      const w = new Walker(g.level, outfit);
      w.place(x);
      w.f = f;
      w.override = { ...POSES.sitGround, torso: 0.05 };
      w.update(0.016, {});
      w.brain = null;
      return w;
    };
    const ks = young('khaled', 90, -1);
    const ss = young('sami', -90, 1);
    ks.rig.o = { ...ks.rig.o, beard: 'stubble' };
    ss.rig.o = { ...ss.rig.o, beard: 'none', top: '#7a6f84' };
    g.flashActors = [ss, ks];
    g.sound.ambience({ traffic: 0.7, crowd: 0.25, wind: 0.1, air: 0, generator: 0 }, 1);
    g.sound.score?.mood('memory', 1.5);
    g.text.titleCard([['٢٠١٠', '2010']], 3);
    g.fade = 0;
    const horns = g.runner.run(
      (function* () {
        while (g.scene === 'flashback') {
          yield 3 + Math.random() * 4;
          if (g.scene !== 'flashback') return;
          if (Math.random() < 0.5) g.sound.horn();
          else g.sound.birds();
        }
      })(),
    );
    yield 2.5;
    ks.override = { ...POSES.sitGround, armN: 2.6, foreN: 2.9 }; // picks a grape
    yield 1;
    ks.override = { ...POSES.sitGround, armN: 1.4, foreN: 2.6 };
    yield* talk(g, [
      [AHMAD, ['بتعرف شو بدي أعمل لمّا خلّص تدريب المعلمين؟', 'You know what I’m going to do when I finish teacher training?']],
      [SAMI, ['شو؟', 'What?']],
      [AHMAD, ['بدي افتح مدرسة. مو مدرسة حكومية، مدرسة خاصة. ببيت. غرفة وحدة، كراسي وطبشور، وكتب كتير.', 'I’m going to open a school. Not a government school. A private one. In a house. One room, chairs, chalk, and lots of books.']],
      [SAMI, ['وبتعلّم فيها شعر.', 'And you’ll teach poetry.']],
      [AHMAD, ['بعلّم فيها كل شي. قواعد وشعر وعلوم وكيف الواحد يفكّر لحالو.', 'I’ll teach everything. Grammar and poetry and science and how to think for yourself.']],
    ]);
    ks.override = { ...POSES.sitGround };
    yield 1.2;
    yield* g.say(SAMI, ['كيف الواحد يفكّر لحالو. بهالبلد.', 'How to think for yourself. In this country.']);
    yield GAP;
    // He lowers his voice instinctively, the way everyone does.
    ks.override = { ...POSES.sitGround, torso: 0.3, head: 0.2 };
    g.sound.ambience({ traffic: 0.35, crowd: 0.1 }, 0.8);
    yield 0.8;
    yield* g.say(AHMAD, ['هلّق لا. بس مو لازم يضل هيك.', 'Not now. But it doesn’t have to stay this way.'], 4.5, 'whisper');
    yield 1;
    ss.override = { ...POSES.sitGround, head: -0.45 }; // looks up at the arbour
    g.sound.birds();
    yield 2.4;
    // The song distorts. The garden fades into dust, wind, distance.
    g.sound.setMuffle(0.85, 1.2);
    const t0 = g.time;
    yield () => {
      g.a.flashFade = clamp((g.time - t0) / 1.6);
      return g.a.flashFade >= 1;
    };
    g.fade = 1;
    g.sound.score?.cut('hour', 3);
    yield 0.4;
    g.scene = 'street';
    g.flashActors = null;
    g.a.flashFade = 0;
    horns.done = true;
    g.sound.setMuffle(0, 0.2);
    g.sound.ambience({ traffic: 0, crowd: 0, wind: 0.35, air: 0.4, generator: 0.2 }, 0.3);
    g.camOverride = { x: X.classroom - 60, y: -150, view: 900 };
    g.snapCamera();
    g.fade = 0;
    g.sound.pigeons(); // the bird is a pigeon, and it flies away
    yield 2.2;
    g.camOverride = null;
    g.sound.radio(1.2);
    g.checkpoint('news');
    g.a.sunK = Math.max(g.a.sunK, 0.8);
    g.lock(false);
  },

  // ========================================================= Scene 4 ====

  buildNews(g) {
    const L = g.level;
    const people = [
      g.npc('woman', X.kerb + 140, { f: -1 }),
      g.npc('man2', X.olive + 60, { f: -1 }),
      g.npc('woman2', X.olive + 130, { f: -1 }),
      g.npc('man', X.olive - 10, { f: 1 }),
      g.npc('man3', X.olive + 190, { f: -1 }),
    ];
    // a woman sits on the kerb, her face in her hands
    people[0].override = { ...POSES.kerb, head: 0.8, armN: 1.3, foreN: 2.7, armF: 1.2, foreF: 2.6 };
    people[1].override = { ...POSES.armsCrossed, head: 0.25 };
    people[2].override = { ...POSES.hands, head: 0.1 };
    // the man on the walkie-talkie sits on an upturned crate, radio to his ear
    people[3].override = { ...POSES.sitChair, seat: 34, head: 0.1, armN: 0.75, foreN: 2.95 };
    people[4].override = { ...POSES.handsOnHips, head: 0.3 };
    people[3].rig.prop = (c, hand) => {
      c.fillStyle = '#1c1c1e';
      c.fillRect(hand[0] - 4, hand[1] - 20, 8, 22);
    };
    g.newsPeople = people;
    g.walkieMan = people[3];
    const abu = g.npc('abuyazan', X.abu, { f: -1 });
    abu.override = { ...POSES.stand, head: 0.05 };
    g.abu = abu;
    // He isn't at the corner yet: he comes up out of the southern street,
    // towards us, a little before Sami gets there.
    abu.visible = false;
    g.a.abuArrived = false;
    L.at(X.newsStart - 350, () => g.runner.run(this.abuArrives(g)));

    L.at(X.newsStart, () => {
      g.sound.ambience({ crowd: 0.5, generator: 0, wind: 0.2, air: 0.3 }, 3);
      g.a.sunK = Math.max(g.a.sunK, 0.9);
    });
    L.at(X.kerb - 120, () => g.runner.run(this.news(g)));
  },

  *abuArrives(g) {
    const abu = g.abu;
    abu.override = null;
    abu.place(X.south);
    abu.visible = true;
    abu.rig.view = 'front';
    abu.rig.viewK = 1;
    yield* depthWalk(g, abu, X.south, 'out', 0.16);
    abu.f = -1;
    yield* g.walkNpc(abu, X.abu, { speedScale: 0.6 });
    abu.f = -1;
    abu.override = { ...POSES.stand, head: 0.05 };
    g.a.abuArrived = true;
  },

  *news(g) {
    const p = g.player;
    const abu = g.abu;
    const s = g.state;
    g.sound.score?.mood('silence', 4);
    g.sound.life(0); // the town goes quiet around the news
    g.lock();
    g.text.objective(null);
    // He lets Sami come to him: the walk toward is the last of not knowing.
    yield* g.walkPlayer(X.kerb + 30);
    yield () => g.a.abuArrived !== false;
    p.f = 1;
    g.camOverride = { x: X.kerb + 90, y: -230, view: 1050 };
    yield 0.6;
    // he comes close: close enough to put a hand on Sami's shoulder
    const reach = handOnShoulder(abu, p);
    abu.override = null;
    yield* g.walkNpc(abu, reach.x, { speedScale: 0.4 });
    abu.f = -1;
    abu.override = { ...POSES.stand, head: 0.05 };
    yield* g.say(ABU, ['سامي.', 'Sami.'], 2.5);
    yield GAP;
    yield* g.say(SAMI, ['شو في يا عمّو؟ ليش هالناس مجتمعين؟', 'What is it, uncle? Why are these people gathered?']);
    yield GAP;
    abu.override = reach.pose; // a hand on his shoulder
    yield 0.8;
    yield* g.say(ABU, ['أحمد... الله يرحمو يا ابني.', 'Ahmad... God have mercy on him, my son.'], 4.5);
    // Silence. The information enters but hasn't landed.
    g.a.drainT0 = g.time;
    g.sound.ambience({ crowd: 0.15, wind: 0.1, air: 0.1 }, 3);
    yield 2.4;
    yield* g.say(SAMI, ['شو... شو قلت؟', 'What... what did you say?']);
    yield GAP;
    yield* g.say(ABU, ['كان عم يقطع شارع المدرسة. قنّاص. ما حسّ بشي. كانت سريعة.', 'He was crossing School Street. A sniper. He didn’t feel anything. It was fast.'], 5.5);
    // his hand goes to the wall; the street goes distant, as if through water
    p.f = -1;
    p.override = { ...POSES.wallHand };
    abu.override = { ...POSES.stand, head: 0.2 }; // his hand falls away
    g.sound.setMuffle(0.7, 3);
    g.sound.ringing(0.8, 1.5);
    yield 2;
    p.f = 1;
    p.override = { ...POSES.grief, head: 0.3 };
    yield* g.say(SAMI, ['إمتى؟', 'When?'], 2.6, 'whisper');
    yield GAP;
    yield* g.say(ABU, ['من نص ساعة. ساعة بالكتير.', 'Half an hour ago. An hour at most.'], 4);
    yield 1.5;
    g.sound.ringing(0.3, 2);

    const i = yield* g.choose(null, [
      { ar: 'بدي شوفو.', en: 'I need to see him.' },
      { ar: 'مين عمل هيك؟', en: 'Who did this?' },
      { ar: '(سكوت)', en: '(Silence)' },
    ]);
    s.choices.push(`C${i + 1}`);
    g.sound.ringing(0, 2);
    if (i === 0) {
      s.grief_response = 'action';
      s.path = 'retrieval';
      s.courage += 1;
      p.override = null;
      yield* g.say(SAMI, ['بدي شوفو. وينو هلّق؟', 'I need to see him. Where is he now?']);
      yield GAP;
      yield* g.say(ABU, ['سامي، ما فيك تروح. الشارع مكشوف. القنّاص لسا هناك.', 'Sami, you can’t go. The street is exposed. The sniper is still there.']);
      yield GAP;
      g.runner.run(g.walkPlayer(X.south - 20));
      yield* g.say(SAMI, ['وينو.', 'Where is he.'], 2.4);
      g.camOverride = { x: X.south - 120, y: -230, view: 1150 };
      yield* g.say(ABU, ['شارع المدرسة، قبل المفرق. سامي... سامي! ما فيك تروح هلّق!', 'School Street, before the junction. Sami... Sami! You can’t go there now!'], 4, 'shout');
      yield () => !g.autoWalk;
      // Sami walks south. The group watches him go.
      g.a.samiDepth = 0.001;
      g.player.face('back');
      yield () => g.a.samiDepth >= 1;
    } else if (i === 1) {
      s.grief_response = 'witness';
      s.path = 'witness';
      p.override = null;
      g.runner.run(g.walkPlayer(X.olive - 90));
      g.walkieMan.f = -1;
      yield* g.say(SAMI, ['مين عمل هيك. من وين إجت الطلقة.', 'Who did this. Where did the shot come from.']);
      yield GAP;
      yield* g.say(WMAN, ['القنّاص عالتلّة الغربية. بالبناية اللي عليها العلم، بتعرفو. نفس القنّاص اللي من أسبوع.', 'The sniper on the western hill. In the building with the flag. You know it. Same sniper from last week.'], 6);
      yield GAP;
      yield* g.say(SAMI, ['في حدا شافو وهوّي واقع؟', 'Did anyone see him fall?']);
      yield GAP;
      yield* g.say(WMAN, ['أم سعيد، هيّي اللي طلعت عليه. لحقوها الشباب بعدها. بس ما قدروا يجرّوه، الشارع مكشوف.', 'Um Said. She’s the one who went to him. Some of the men followed her. But they couldn’t move him. The street is exposed.'], 6.5);
      yield GAP;
      yield* g.say(SAMI, ['يعني لسا هناك.', 'So he’s still there.']);
      // Silence from the group. That's the answer.
      yield 3.5;
    } else {
      s.grief_response = 'withdrawal';
      s.path = 'grief';
      s.isolation += 1;
      // He sits on the kerb, in the exact spot where the woman was sitting.
      const woman = g.newsPeople[0];
      woman.override = null;
      g.runner.run(g.walkNpc(woman, X.kerb + 300, { speedScale: 0.5 }));
      p.override = null;
      yield* g.walkPlayer(X.kerb + 130);
      p.f = 1;
      const t0 = g.time;
      yield () => {
        p.override = { ...POSES.kerb, head: lerp(0.3, 0.75, clamp((g.time - t0) / 2)) };
        return g.time - t0 > 2;
      };
      g.abu.override = null;
      yield* g.walkNpc(g.abu, X.kerb + 190, { speedScale: 0.4 });
      g.abu.f = -1;
      g.abu.override = { ...POSES.kerb, head: 0.2 };
      // Time passes: the light moves, a shadow extends over them.
      g.a.compress = g.time;
      yield 7;
      yield* g.say(ABU, ['بدك مي؟', 'Do you want some water?'], 3.5);
      yield 2.5; // he shakes his head, almost imperceptibly
      yield* g.say(ABU, ['أمو بعدها ما بتعرف.', 'His mother doesn’t know yet.'], 4.5);
      yield 3;
    }

    // END OF ACT 1
    s.completed = true;
    writeSave(s);
    g.fade = 1;
    g.sound.ambience({ crowd: 0, wind: 0, air: 0, generator: 0, traffic: 0 }, 2);
    yield 1.6;
    g.sound.score?.mood('after', 3);
    g.sound.ney(293.66, 12, 0.2);
    g.text.titleCard([
      ['الساعة أربعة وربع. ١٤ آب، ٢٠١٤.', 'Quarter past four. 14 August 2014.'],
      ['بقيت الشمس ساعتين بالسما.', 'Two hours of sun left in the sky.'],
    ], 7);
    yield 7.5;
    g.onEnd?.(s);
  },

  // =================================================== per-frame extras ==

  update(g, dt) {
    const a = g.a;
    // the people of the memory and the stairwell live outside the street's
    // list, so they're moved (and their poses settle) here
    for (const w of [...(g.flashActors || []), ...(g.stairKids || [])]) w.update(dt, {});
    // the news drains the colour out of the world
    if (a.drainT0) a.drain = clamp((g.time - a.drainT0) / 6);
    if (a.compress) a.sunK = lerp(0.9, 1.15, clamp((g.time - a.compress) / 12));
    // Sami walking south, away down the side street
    if (a.samiDepth) {
      const p = g.player;
      a.samiDepth = Math.min(1, a.samiDepth + dt * 0.08);
      const k = a.samiDepth;
      const s = 1 / (1 + 3.4 * k);
      p.rig.scale = s;
      p.stride += dt * 90 * s;
      p.pose(dt, 60);
      p.rig.x = lerp(X.south - 20, X.south, k);
      p.rig.y = lerp(0, -70, 1 - s);
    }
    // the cat sits and watches, and blinks now and then
    if (g.cat && !g.cat.hidden) {
      g.cat.update(dt);
      if (!g.a.catDone && Math.abs(g.player.x - g.cat.x) < 160 && !g.a.catAuto) {
        g.a.catAuto = true;
      }
    }
    if (a.curtainPrompt && g.player.x > X.sag1 + 40) a.curtainPrompt = false;
    streetLife(g, dt);
  },

  useTool(g, id) {
    if (id === 'mirror') {
      const x = g.player.x;
      if (!g.a.mirrorChecked && x > X.corner - 170 && x < X.corner + 10) {
        g.runner.run(this.mirrorPeek(g));
      } else {
        g.line(null, ['شقفة مراية. بتشوف فيها حالك.', 'A shard of mirror. You can see yourself in it.'], 3, 'examine');
      }
    } else if (id === 'walkie') {
      g.sound.squelch();
      g.line(RADIO, ['...الموجة ٣...', '...channel 3...'], 2, 'radio');
    }
  },

  draw(R, g) {
    if (g.scene === 'stairwell') drawStairwell(R, g);
    else if (g.scene === 'flashback') drawFlashback(R, g);
    else drawStreet(R, g);
  },

  look(g) {
    if (g.scene === 'stairwell') return stairLook(g);
    if (g.scene === 'flashback') return flashLook(g);
    const l = sunLook(g);
    if (g.a.compress) l.fade = 0.25 * clamp((g.time - g.a.compress) / 12); // edges darken as time passes
    return l;
  },
};

// Where to stand, and how to hold the arm, so one person's near hand rests
// on another's shoulder. Tries arm angles until the hand is at shoulder
// height, then stands at the distance that puts it there.
function handOnShoulder(who, to) {
  to.rig.solve();
  const [sx, sy] = to.rig.world('shoulder');
  const f = to.x < who.x ? -1 : 1;
  const probe = new Person('abuyazan', who.rig.scale);
  let best = null;
  for (let a = 0.9; a <= 1.9; a += 0.02) {
    const pose = { ...POSES.stand, head: 0.12, armN: a, foreN: a + 0.12 };
    probe.setPose(pose);
    probe.x = 0;
    probe.y = who.y;
    probe.f = f;
    const [hx, hy] = probe.world('handN');
    const err = Math.abs(hy - (sy - 4));
    if (!best || err < best.err) best = { err, pose, hx };
  }
  // the hand lands just on the near side of the shoulder
  return { pose: best.pose, x: sx - f * 2 - best.hx };
}

// ------------------------------------------------------ depth and doors --

// Walk into (k 0 → 1) or out of (k 1 → 0) a side street that runs away from
// the camera at x = mouth: the figure faces away or towards us and shrinks
// towards the vanishing point. Runs as a script step, after the NPC update.
function* depthWalk(g, w, mouth, dir, rate = 0.1) {
  const base = w.baseScale ?? w.rig.scale;
  w.baseScale = base;
  let k = dir === 'in' ? 0.001 : 1;
  w.face(dir === 'in' ? 'back' : 'front');
  w.x = mouth;
  const step = () => {
    const dt = g.lastDt || 1 / 60;
    k = clamp(k + (dir === 'in' ? 1 : -1) * rate * dt);
    w.pose(dt, 60);
    placeInDepth(w, mouth, k, base);
    w.stride += dt * 90 * (1 / (1 + 3.4 * k));
    w.depthK = k > 0.001 ? k : 0;
    return dir === 'in' ? k >= 1 : k <= 0;
  };
  yield step;
  w.depthK = 0;
  w.rig.scale = base;
  w.face(dir === 'in' ? 'back' : 'side');
  if (dir === 'in') w.visible = false;
}

function placeInDepth(w, mouth, k, base) {
  const s = 1 / (1 + 3.4 * k);
  w.rig.scale = base * s;
  w.rig.x = lerp(mouth - 10, mouth + 6, k);
  w.rig.y = lerp(0, -70, 1 - s);
}

// Someone reaching a doorway turns their back and goes in.
function enterDoor(g, w) {
  if (w.entering) return;
  w.entering = true;
  w.face('back');
  setTimeoutGame(g, 0.45, () => (w.visible = false));
}

// ------------------------------------------------------------ street life --

// Now and then, in the calm stretches, someone crosses the mouth of a side
// street: out of it towards us, or along the street and into it.
const MOUTHS = [3105, 5130, 10020];
const PASSERS = [
  { outfit: 'man', can: true },
  { outfit: 'woman' },
  { outfit: 'woman2' },
  { outfit: 'fadi', scale: 0.86 },
  { outfit: 'man2' },
  { outfit: 'man3' },
  { outfit: 'boy', scale: 0.62 },
  { outfit: 'abuyazan' },
];

function streetLife(g, dt) {
  const a = g.a;
  g.lastDt = dt;
  g.passers ||= [];
  const calm =
    g.scene === 'street' &&
    !g.locked &&
    !a.shelling &&
    !(a.jetFly && g.time < a.jetFly.t0 + 14) &&
    !(a.heliWarn && g.time < a.heliWarn + 12) &&
    !a.drainT0 &&
    g.player.x < X.newsStart - 250;
  a.nextPasser ??= g.time + 5;
  if (calm && g.time > a.nextPasser && g.passers.length < 2) {
    a.nextPasser = g.time + 9 + Math.random() * 9;
    const mouth = MOUTHS.find((m) => Math.abs(m - g.cam.x) < 650 && Math.abs(m - g.player.x) > 120);
    if (mouth) {
      const kind = PASSERS[Math.floor(Math.random() * PASSERS.length)];
      const w = new Walker(g.level, kind.outfit, kind.scale || 1);
      if (kind.can) w.rig.prop = (c, hand) => jerryCan(c, hand[0], hand[1] + 44, 0.95);
      const side = Math.random() < 0.5 ? -1 : 1;
      w.passer = { mouth, dir: Math.random() < 0.5 ? 'out' : 'in', side, phase: 'start' };
      if (w.passer.dir === 'in') {
        w.place(mouth + side * 900);
        w.f = -side;
      } else {
        w.place(mouth);
        w.rig.view = 'front';
      }
      g.passers.push(w);
    } else a.nextPasser = g.time + 3;
  }
  for (const w of g.passers) {
    const ps = w.passer;
    if (ps.phase === 'start') {
      ps.phase = ps.dir === 'out' ? 'depth' : 'along';
      if (ps.dir === 'out') ps.k = 1;
    }
    if (ps.phase === 'depth') {
      w.update(dt, {});
      w.pose(dt, 60);
      ps.k = clamp(ps.k + (ps.dir === 'in' ? 1 : -1) * 0.1 * dt);
      w.depth = ps.k;
      placeInDepth(w, ps.mouth, ps.k, w.baseScale ?? (w.baseScale = w.rig.scale));
      w.stride += dt * 90 * (1 / (1 + 3.4 * ps.k));
      if (ps.dir === 'out' && ps.k <= 0) {
        w.depth = 0;
        w.rig.scale = w.baseScale;
        w.face('side');
        w.f = ps.side;
        ps.phase = 'away';
      } else if (ps.dir === 'in' && ps.k >= 1) ps.done = true;
    } else if (ps.phase === 'along') {
      if (w.goTo(ps.mouth, dt, { speedScale: 0.6 })) {
        w.face('back');
        ps.phase = 'depth';
        ps.k = 0;
        w.baseScale = w.rig.scale;
      }
    } else if (ps.phase === 'away') {
      w.goTo(ps.mouth + ps.side * 1000, dt, { speedScale: 0.6 });
      if (Math.abs(w.x - ps.mouth) > 950) ps.done = true;
    }
  }
  g.passers = g.passers.filter((w) => !w.passer.done);
  if (!calm && (a.shelling || a.drainT0)) g.passers.length = 0;
}

// A few single shots far to the south, irregular, all afternoon.
function* ambientShots(g) {
  for (;;) {
    yield 6 + Math.random() * 9;
    if (g.scene === 'street' && !g.a.shelling) g.sound.distantShot();
  }
}

function setTimeoutGame(g, sec, fn) {
  g.runner.run(
    (function* () {
      yield sec;
      fn();
    })(),
  );
}
