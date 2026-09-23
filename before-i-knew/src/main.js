import { Renderer } from './engine/renderer.js';
import { Sound } from './engine/audio.js';
import { Score } from './engine/score.js';
import { Text } from './engine/text.js';
import { Input, ACTIONS, keyLabel } from './engine/input.js';
import { Settings } from './engine/settings.js';
import { Menu } from './engine/menu.js';
import { bindI18n, t, lang } from './engine/i18n.js';
import { freshState, loadSave, writeSave, clearSave } from './engine/save.js';
import { Game, TOOLS } from './game.js';
import { ACT1 } from './story/act1.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');

let R;
try {
  R = new Renderer($('view'));
} catch (err) {
  $('nogl').hidden = false;
  throw err;
}

const settings = new Settings();
bindI18n(settings);
const input = new Input(settings);
const sound = new Sound(settings);
sound.score = new Score(sound);
const text = new Text(settings);
const game = new Game({ R, sound, text, input, settings });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ------------------------------------------------------------ sizing ----

// Graphics quality: a render-scale cap. Auto starts high and steps down if
// the frame rate struggles.
const QUALITY = { low: [0.55, 960], medium: [0.8, 1280], high: [1, 1600], auto: [1, 1500] };
let autoScale = 1;
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = vw / vh < 1 ? 1.6 : 2.39;
  const w = Math.min(vw, vh * aspect);
  const h = w / aspect;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--u', `${Math.max(w, h * 2.39) / 100}px`);
  const q = settings.get('quality') || 'auto';
  const [scale, cap] = QUALITY[q] || QUALITY.auto;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(Math.min(cap, Math.max(560, w * dpr)) * scale * (q === 'auto' ? autoScale : 1));
  const py = Math.round(px / aspect);
  if (px !== R.W || py !== R.H) R.resize(px, py);
}
window.addEventListener('resize', resize);
resize();

function applyLanguage() {
  document.body.dataset.rotate = t('rotate');
  document.documentElement.lang = lang() === 'ar' ? 'ar' : 'en-GB';
  stage.dataset.lang = lang();
}
applyLanguage();
settings.onChange((k) => {
  if (k === 'quality') {
    autoScale = 1;
    resize();
  }
  if (k === 'lang') applyLanguage();
});

// ---------------------------------------------------------- the title ---

// Behind the menu: the empty street at the vine, the afternoon going on.
let mode = 'title'; // 'title' | 'play' | 'end'
function titleScene() {
  game.start(ACT1, freshState());
  game.runner.clear();
  game.player.visible = false;
  for (const w of game.npcs) w.visible = false;
  game.camOverride = (g) => ({ x: 900 + Math.sin(g.time * 0.05) * 160, y: -300, view: 1650 });
  game.snapCamera();
  game.lock();
  game.clearHud();
  text.objective(null);
  text.hideCard();
  text.clearLine();
  text.tools([], null, 0, false);
}
titleScene();

// The end card: each choice as a moment in the afternoon.
function summary(s) {
  const ar = lang() === 'ar';
  const rows = [
    [
      ar ? '٣:٢٠' : '3:20',
      s.helped_old_man
        ? ['You carried the old man’s water to his daughter’s door.', 'شلت مي الختيار لباب بنتو.']
        : ['You walked past the old man and his water.', 'مشيت وتركت الختيار ومايتو.'],
    ],
    [
      ar ? '٣:٤٥' : '3:45',
      s.children_helped
        ? ['When the mortars came, you ran for Layla and the boy.', 'لمّا نزلت القذايف، ركضت لعند ليلى والصغير.']
        : ['When the mortars came, you took cover. Layla got the boy to the stairs herself.', 'لمّا نزلت القذايف، تخبّيت. ليلى وصّلت الصغير عالدرج لحالها.'],
    ],
    [
      ar ? '٤:١٠' : '4:10',
      s.path === 'retrieval'
        ? ['“I need to see him.” You walked south, towards School Street.', '«بدي شوفو.» مشيت عالقبلي، لشارع المدرسة.']
        : s.path === 'witness'
          ? ['“Who did this?” You asked for facts, because facts can be carried.', '«مين عمل هيك؟» سألت عن الحقيقة، لأنو الحقيقة بتنحمل.']
          : ['You said nothing. You sat on the kerb, and Abu Yazan sat with you.', 'ما قلت شي. قعدت عالرصيف، وقعد أبو يزن جنبك.'],
    ],
  ];
  return rows.map(([time, [en, arText]]) => [time, ar ? arText : en]);
}

function startGame(state) {
  mode = 'play';
  menu.close();
  stage.classList.remove('ended', 'paused');
  $('end').hidden = true;
  stage.classList.add('playing');
  sound.start().then(() => {
    game.start(ACT1, state);
    game.onEnd = showEnd;
  });
}

// ----------------------------------------------------------- the sheets --

function sheetDir(el) {
  el.dir = lang() === 'ar' ? 'rtl' : 'ltr';
}

function newGame() {
  const note = $('note');
  sheetDir(note);
  note.innerHTML = `
    <p class="kicker-small">${esc(t('noteKicker'))}</p>
    <h2 id="note-h">${esc(t('noteTitle'))}</h2>
    <p>${esc(t('noteBody'))}</p>
    <p class="sheet-quiet">${esc(t('noteSound'))}</p>
    <div class="sheet-btns"><button type="button" id="note-go" class="primary">${esc(t('begin'))}</button></div>`;
  note.hidden = false;
  $('note-go').addEventListener('click', () => {
    note.hidden = true;
    clearSave();
    const s = freshState();
    writeSave(s);
    startGame(s);
  });
  $('note-go').focus();
}

function showEnd(s) {
  mode = 'end';
  text.hideCard();
  game.clearHud();
  stage.classList.add('ended');
  const end = $('end');
  sheetDir(end);
  end.innerHTML = `
    <p class="kicker-small">${esc(t('endKicker'))}</p>
    <h2 id="end-h"><span class="ar" lang="ar" dir="rtl">قبل ما عرفت</span><span class="end-en">Before I Knew</span></h2>
    <ol class="timeline">
      <li class="tl-start"><time>${lang() === 'ar' ? '٣:٠٥' : '3:05'}</time><span>${lang() === 'ar' ? 'خالد وسامي عم يمشوا بشارع الزيتون.' : 'Khaled and Sami walk down Zeitoun Street.'}</span></li>
      ${summary(s)
        .map(([time, line]) => `<li><time>${esc(time)}</time><span>${esc(line)}</span></li>`)
        .join('')}
      <li class="tl-end"><time>${lang() === 'ar' ? '٤:١٥' : '4:15'}</time><span>${lang() === 'ar' ? 'بقيت الشمس ساعتين بالسما.' : 'Two hours of sun left in the sky.'}</span></li>
    </ol>
    <p class="sheet-quiet">${esc(t('endNext'))}</p>
    <div class="sheet-btns">
      <button type="button" id="end-again" class="primary">${esc(t('again'))}</button>
      <button type="button" id="end-menu">${esc(t('mainMenu'))}</button>
    </div>`;
  end.hidden = false;
  requestAnimationFrame(() => end.classList.add('show'));
  $('end-again').addEventListener('click', () => {
    end.hidden = true;
    end.classList.remove('show');
    newGame();
  });
  $('end-menu').addEventListener('click', () => toMainMenu());
  $('end-again').focus();
}

function toMainMenu() {
  mode = 'title';
  $('end').hidden = true;
  $('end').classList.remove('show');
  stage.classList.remove('playing', 'mirror', 'ended', 'paused');
  game.paused = false;
  sound.resume();
  sound.setMuffle?.(0);
  sound.ringing?.(0);
  sound.ambience?.({ wind: 0.3, air: 0.4, generator: 0, crowd: 0, traffic: 0 });
  titleScene();
  sound.score.mood('title', 3);
  menu.showMain();
}

// --------------------------------------------------------------- menus --

const saved = () => {
  const s = loadSave();
  return s && !s.completed && s.checkpoint !== 'walk' ? s : null;
};

function continueSub() {
  const s = saved();
  if (!s) return '';
  return `${t('checkpoints')[s.checkpoint] || ''} · ${t('times')[s.checkpoint] || ''}`;
}

function pauseAside() {
  const obj = text.current;
  const tools = (game.state?.tools || []).map((id) => TOOLS[id]).filter(Boolean);
  const ar = lang() === 'ar';
  const cp = game.state?.checkpoint;
  return `
    <p class="aside-k">${esc(t('objective'))}</p>
    <p class="aside-v">${obj ? `${esc(ar ? obj[0] : obj[1])}` : '—'}</p>
    <p class="aside-k">${esc(t('carrying'))}</p>
    <p class="aside-v">${tools.length ? tools.map((x) => esc(ar ? x.ar : x.en)).join(' · ') : esc(t('nothing'))}</p>
    <p class="aside-k">${esc(t('checkpoint'))}</p>
    <p class="aside-v">${cp ? `${esc(t('checkpoints')[cp] || cp)} · ${esc(t('times')[cp] || '')}` : '—'}</p>`;
}

function logPage(panel, m) {
  const h = document.createElement('h2');
  h.className = 'menu-title';
  h.textContent = t('log');
  panel.appendChild(h);
  const box = document.createElement('div');
  box.className = 'menu-log';
  box.tabIndex = 0;
  const subs = settings.get('subtitles');
  if (!text.log.length) box.innerHTML = `<p class="menu-sub">${esc(t('logEmpty'))}</p>`;
  for (const e of text.log) {
    const row = document.createElement('div');
    row.className = `log-row style-${e.style || 'plain'}`;
    const who = e.who ? `<span class="log-who"><span class="ar" lang="ar" dir="rtl">${esc(e.who[0])}</span> <span class="en">${esc(e.who[1])}</span></span>` : '';
    row.innerHTML = `${who}<span class="log-lines">${subs !== 'en' ? `<span class="ar" lang="ar" dir="rtl">${esc(e.line[0])}</span>` : ''}${subs !== 'ar' ? `<span class="en" dir="ltr">${esc(e.line[1])}</span>` : ''}</span>`;
    box.appendChild(row);
  }
  panel.appendChild(box);
  requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
  m.backButton(panel);
}

const menu = new Menu($('menu'), {
  t,
  dir: () => (lang() === 'ar' ? 'rtl' : 'ltr'),
  header: () => `<p class="kicker"><span class="kicker-rule" aria-hidden="true"></span><span>${esc(t('kickerDate'))}</span></p>
    <h1><span class="ar" lang="ar" dir="rtl">قبل ما عرفت</span><span class="en" lang="en">Before I Knew</span></h1>
    <p class="tagline">${esc(t('tagline'))}</p>`,
  main: [
    { label: () => t('continue'), sub: continueSub, hidden: () => !saved(), action: () => startGame(saved()) },
    { label: () => t('newGame'), sub: () => t('newGameSub'), action: () => newGame() },
    { label: () => t('settings'), action: (m) => m.push('settings') },
    { label: () => t('controls'), action: (m) => m.push('controls') },
    { label: () => t('about'), action: (m) => m.push('about') },
  ],
  pause: [
    { label: () => t('resume'), action: (m) => m.close() },
    { label: () => t('log'), action: (m) => m.push('log') },
    { label: () => t('settings'), action: (m) => m.push('settings') },
    { label: () => t('controls'), action: (m) => m.push('controls') },
    {
      label: () => t('restart'),
      action: () => {
        const s = loadSave() || freshState();
        startGame({ ...s, completed: false });
      },
    },
    { label: () => t('mainMenu'), action: () => toMainMenu() },
  ],
  pauseAside,
  pages: { log: logPage },
  onOpen: () => {
    game.paused = true;
    stage.classList.add('paused');
    sound.suspend();
  },
  onClose: () => {
    game.paused = false;
    stage.classList.remove('paused');
    sound.resume();
  },
  settingsStore: settings,
  settings: [
    { group: 'gSound' },
    { key: 'master', label: 'master', type: 'range' },
    { key: 'music', label: 'music', type: 'range' },
    { key: 'effects', label: 'effects', type: 'range' },
    { group: 'gText' },
    { key: 'lang', label: 'lang', type: 'select', options: [['en', 'English'], ['ar', 'عربي']], redraw: true },
    { key: 'subtitles', label: 'subtitles', type: 'select', options: [['both', 'subsBoth'], ['en', 'subsEn'], ['ar', 'subsAr']] },
    { key: 'textSize', label: 'textSize', type: 'select', options: [[0.85, 'small'], [1, 'medium'], [1.2, 'large'], [1.4, 'xlarge']] },
    { key: 'backing', label: 'backing', type: 'select', options: [['off', 'off'], ['light', 'light'], ['dark', 'dark']] },
    { group: 'gDisplay' },
    { key: 'quality', label: 'quality', type: 'select', options: [['auto', 'auto'], ['low', 'low'], ['medium', 'medium'], ['high', 'high']] },
    { key: 'shake', label: 'shake', type: 'toggle' },
    { key: 'reduceFlashes', label: 'reduceFlashes', type: 'toggle' },
    { group: 'gPlay' },
    { key: 'hints', label: 'hints', type: 'toggle' },
  ],
  controls: { input, actions: ACTIONS, label: keyLabel },
  about: () =>
    lang() === 'ar'
      ? `<h2 class="menu-title">عن القصة</h2>
    <p><strong>قبل ما عرفت</strong> قصة تفاعلية بتصير ببلدة محاصرة بالغوطة، جنب الشام، بآب ٢٠١٤. سامي عمرو ٢٧ سنة. بيمشي مع أعزّ صحابو، خالد، وبيفترقوا عالمفرق. وبأقل من ساعة، بيعرف إنو خالد استشهد.</p>
    <p>هاد الفصل الأول: المشوار، والفراق، وساعة ما كنّا عم نعرف. خياراتك بتحدّد مين بيكون سامي لمّا يوصلو الخبر، ولوين بتروح الليلة.</p>
    <h3>تنبيه</h3>
    <p>الحياة تحت الحصار: قصف، قنّاص، جوع، موت صديق، وحزن. العنف بينسمع وبينفهم، بس ما بينشاف. مناسبة لعمر ١٦ وفوق.</p>
    <p class="menu-sub">قصة متخيّلة مبنية على شهادات موثّقة عن حياة الحصار. كل شي فيها مرسوم ومركّب بالكود، بلا صور ولا تسجيلات.</p>`
      : `<h2 class="menu-title">About</h2>
    <p><strong>Before I Knew · قبل ما عرفت</strong> is an interactive story set in a besieged town in Ghouta, outside Damascus, in August 2014. Sami is 27. He walks with his closest friend, Khaled, and they part at a junction. Less than an hour later, he learns that Khaled has been killed.</p>
    <p>This is Act One: the walk, the parting, and the hour of not knowing. Your choices shape who Sami is when the news reaches him, and which way the night goes.</p>
    <h3>Content note</h3>
    <p>Life under military siege: shelling, sniper fire, hunger, the death of a friend, grief. Violence is heard and implied, never shown. Recommended for ages 16 and over.</p>
    <p class="menu-sub">A work of fiction drawing on documented accounts of siege life. Everything is drawn and synthesised in code. There are no images or recordings.</p>`,
});
menu.showMain();

input.onKey((e) => {
  const acts = input.actionsFor(e.code);
  if (!acts.includes('menu')) return;
  if (!$('note').hidden) {
    $('note').hidden = true;
    return;
  }
  if (mode === 'play') menu.toggle();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !menu.open) menu.showPause();
});

// ------------------------------------------------------- touch controls --

const touchMap = [
  ['t-left', 'left'],
  ['t-right', 'right'],
  ['t-jump', 'jump'],
  ['t-crouch', 'crouch'],
  ['t-prone', 'prone'],
  ['t-use', 'interact'],
  ['t-tool', 'tool'],
  ['t-light', 'use'],
  ['t-skip', 'skip'],
];
for (const [id, action] of touchMap) {
  const b = $(id);
  if (!b) continue;
  const down = (e) => {
    e.preventDefault();
    input.touchDown(action);
    b.classList.add('down');
  };
  const up = () => {
    input.touchUp(action);
    b.classList.remove('down');
  };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
}
$('t-menu').addEventListener('click', () => mode === 'play' && menu.toggle());

// ------------------------------------------------------------------ loop --

let last = performance.now();
let time = 0;
let frames = 0;
let fpsT = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  time += dt;
  input.poll();
  if (mode === 'title') {
    game.time += dt;
    game.effects.update(dt);
    Object.assign(game.cam, game.cameraTarget());
    game.render(time);
  } else {
    // (testing can run several steps per frame and skip drawing)
    const steps = window.game?.speed || 1;
    if (!menu.open) for (let i = 0; i < steps; i++) game.update(dt);
    if (!window.game?.noRender) game.render(time);
  }
  input.endFrame();

  frames++;
  fpsT += dt;
  if (fpsT > 2) {
    const fps = frames / fpsT;
    frames = 0;
    fpsT = 0;
    if (settings.get('quality') === 'auto' && fps < 34 && autoScale > 0.6) {
      autoScale -= 0.2;
      resize();
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug and testing hook.
window.game = {
  speed: 1,
  game,
  menu,
  input,
  settings,
  text,
  start: (checkpoint = 'walk', extra = {}) => startGame({ ...freshState(), checkpoint, ...extra }),
  get mode() {
    return mode;
  },
};
