import { Renderer } from './engine/renderer.js';
import { Sound } from './engine/audio.js';
import { Text } from './engine/text.js';
import { Input, ACTIONS, keyLabel } from './engine/input.js';
import { Settings } from './engine/settings.js';
import { Menu } from './engine/menu.js';
import { freshState, loadSave, writeSave, clearSave } from './engine/save.js';
import { Game } from './game.js';
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
const input = new Input(settings);
const sound = new Sound(settings);
const text = new Text(settings);
const game = new Game({ R, sound, text, input, settings });

// ------------------------------------------------------------ sizing ----

let quality = 1;
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = vw / vh < 1 ? 1.6 : 2.39;
  const w = Math.min(vw, vh * aspect);
  const h = w / aspect;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--u', `${Math.max(w, h * 2.39) / 100}px`);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(Math.min(1500, Math.max(640, w * dpr)) * quality);
  const py = Math.round(px / aspect);
  if (px !== R.W || py !== R.H) R.resize(px, py);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------- the title ---

// Behind the menu: the empty street at the vine, the afternoon going on.
let mode = 'title'; // 'title' | 'play' | 'end'
function titleScene() {
  game.start(ACT1, freshState());
  game.runner.clear();
  game.player.visible = false;
  for (const w of game.npcs) w.visible = false;
  game.camOverride = { x: 900, y: -300, view: 1650 };
  game.snapCamera();
  game.lock();
  text.objective(null);
  text.hideCard();
  text.clearLine();
  text.tools([], null, 0, false);
}
titleScene();

function summary(s) {
  const out = [];
  out.push(s.helped_old_man ? 'You carried the old man’s water to his daughter’s door.' : 'You walked past the old man and his water.');
  out.push(s.children_helped ? 'When the mortars came, you ran for Layla and the boy.' : 'When the mortars came, you took cover. Layla got the boy to the stairs herself.');
  out.push(
    s.path === 'retrieval'
      ? '“I need to see him.” You walked south, towards School Street.'
      : s.path === 'witness'
        ? '“Who did this?” You asked for facts, because facts can be carried.'
        : 'You said nothing. You sat on the kerb, and Abu Yazan sat with you.',
  );
  return out;
}

function startGame(state) {
  mode = 'play';
  menu.close();
  stage.classList.remove('ended');
  $('end').hidden = true;
  stage.classList.add('playing');
  sound.start().then(() => {
    game.start(ACT1, state);
    game.onEnd = showEnd;
  });
}

function newGame() {
  $('note').hidden = false;
  $('note-go').focus();
}
$('note-go').addEventListener('click', () => {
  $('note').hidden = true;
  clearSave();
  const s = freshState();
  writeSave(s);
  startGame(s);
});

function showEnd(s) {
  mode = 'end';
  text.hideCard();
  stage.classList.add('ended');
  const list = $('end-list');
  list.innerHTML = '';
  for (const line of summary(s)) {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  }
  $('end').hidden = false;
  requestAnimationFrame(() => $('end').classList.add('show'));
  $('end-again').focus();
}
$('end-again').addEventListener('click', () => {
  $('end').hidden = true;
  $('end').classList.remove('show');
  newGame();
});
$('end-menu').addEventListener('click', () => toMainMenu());

function toMainMenu() {
  mode = 'title';
  $('end').hidden = true;
  $('end').classList.remove('show');
  stage.classList.remove('playing', 'mirror', 'ended');
  game.paused = false;
  sound.resume();
  sound.setMuffle?.(0);
  sound.ringing?.(0);
  sound.ambience?.({ wind: 0.3, air: 0.4, generator: 0, crowd: 0, traffic: 0 });
  titleScene();
  menu.showMain();
}

// --------------------------------------------------------------- menus --

const saved = () => {
  const s = loadSave();
  return s && !s.completed && s.checkpoint !== 'walk' ? s : null;
};
const CHECKPOINT_NAMES = { hour: 'The Hour', school: 'The School', news: 'The Corner' };

const menu = new Menu($('menu'), {
  header: `<p class="kicker"><span class="ar" lang="ar" dir="rtl">الغوطة، آب ٢٠١٤</span><span class="en">Ghouta · August 2014</span></p>
    <h1><span class="ar" lang="ar" dir="rtl">قبل ما عرفت</span><span class="en">Before I Knew</span></h1>
    <p class="tagline">An ordinary afternoon. A friend heads home another way. Less than an hour later, the world has already changed, and you don’t know it yet.</p>`,
  main: [
    { label: 'Continue', sub: '', hidden: () => !saved(), action: () => startGame(saved()) },
    { label: 'New game', sub: 'Act One · The Afternoon', action: () => newGame() },
    { label: 'Settings', action: (m) => m.push('settings') },
    { label: 'Controls', action: (m) => m.push('controls') },
    { label: 'About', action: (m) => m.push('about') },
  ],
  pause: [
    { label: 'Resume', action: (m) => m.close() },
    { label: 'Settings', action: (m) => m.push('settings') },
    { label: 'Controls', action: (m) => m.push('controls') },
    {
      label: 'Restart from checkpoint',
      action: () => {
        const s = loadSave() || freshState();
        startGame({ ...s, completed: false });
      },
    },
    { label: 'Main menu', action: () => toMainMenu() },
  ],
  onOpen: () => {
    game.paused = true;
    sound.suspend();
  },
  onClose: () => {
    game.paused = false;
    sound.resume();
  },
  settingsStore: settings,
  settings: [
    { key: 'master', label: 'Master volume', type: 'range' },
    { key: 'music', label: 'Music', type: 'range' },
    { key: 'effects', label: 'Sound effects', type: 'range' },
    { key: 'subtitles', label: 'Subtitles', type: 'select', options: [['both', 'Arabic and English'], ['en', 'English only'], ['ar', 'Arabic only · عربي']] },
    { key: 'textSize', label: 'Text size', type: 'select', options: [[0.85, 'Small'], [1, 'Medium'], [1.2, 'Large'], [1.4, 'Extra large']] },
    { key: 'shake', label: 'Camera shake', type: 'toggle' },
    { key: 'reduceFlashes', label: 'Reduce flashes', type: 'toggle' },
    { key: 'hints', label: 'Control hints', type: 'toggle' },
  ],
  controls: {
    input,
    actions: ACTIONS,
    label: keyLabel,
    extra: 'Choices: click them, or press 1, 2 or 3. A gamepad works too. On a phone, use the on-screen buttons.',
  },
  about: `<h2 class="menu-title">About</h2>
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
];
for (const [id, action] of touchMap) {
  const b = $(id);
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
    if (fps < 34 && quality > 0.6) {
      quality -= 0.2;
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
  start: (checkpoint = 'walk', extra = {}) => startGame({ ...freshState(), checkpoint, ...extra }),
  get mode() {
    return mode;
  },
};
