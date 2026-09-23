import { Renderer } from './engine/renderer.js';
import { Director } from './engine/director.js';
import { Sound } from './engine/audio.js';
import { UI } from './engine/ui.js';
import { Menu } from './engine/menu.js';
import { Settings } from './engine/settings.js';
import { freshState, loadState } from './engine/state.js';
import { CHAPTER_1, summary } from './story/chapter1.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const canvas = $('view');

let R;
try {
  R = new Renderer(canvas);
} catch (err) {
  $('nogl').hidden = false;
  throw err;
}

const settings = new Settings();
const sound = new Sound();
const ui = new UI();
let state = freshState();
const director = new Director({ R, sound, ui, scenes: CHAPTER_1.scenes, state });

// ------------------------------------------------------------ sizing -------

// Cinemascope where there's room; a taller frame on portrait phones so the
// action and the text still fit.
let quality = 1;
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = vw / vh < 1 ? 1.6 : 2.39;
  const w = Math.min(vw, vh * aspect);
  const h = w / aspect;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  // Type scales with the frame, but never below what a phone needs.
  stage.style.setProperty('--u', `${Math.max(w, h * 2.39) / 100}px`);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(Math.min(1400, Math.max(640, w * dpr)) * quality);
  const py = Math.round(px / aspect);
  if (px !== R.W || py !== R.H) R.resize(px, py);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------ settings ---

function applySettings() {
  sound.setLevels({ master: settings.get('master'), music: settings.get('music'), effects: settings.get('effects') });
  stage.classList.toggle('nosubs', !settings.get('subtitles'));
  stage.style.setProperty('--ts', String(settings.get('textSize')));
  R.cam.shakeScale = settings.get('shake') ? 1 : 0;
}
settings.onChange(applySettings);
applySettings();

// ------------------------------------------------------ the main menu -----

// The main menu sits over a living frame of the prologue.
const titleEnv = { state, sound: { snort() {}, hoof() {} }, R, director };
let titleScene = CHAPTER_1.scenes.prologue.create(titleEnv);
let started = false;

function begin() {
  started = true;
  menu.close();
  state = freshState();
  director.state = state;
  director.paused = false;
  $('end').hidden = true;
  $('end').classList.remove('show');
  ui.clearText();
  ui.hideChoice();
  sound.start().then(() => {
    sound.resume();
    sound.setLevels({ master: settings.get('master'), music: settings.get('music'), effects: settings.get('effects') });
    sound.setMood('elegy');
  });
  director.start(CHAPTER_1.first);
}

function toMainMenu() {
  started = false;
  director.paused = false;
  $('end').hidden = true;
  $('end').classList.remove('show');
  ui.clearText();
  ui.hideChoice();
  sound.suspend();
  titleScene = CHAPTER_1.scenes.prologue.create(titleEnv);
  menu.showMain();
}

director.on('end', (s) => {
  const list = $('end-list');
  list.innerHTML = '';
  for (const line of summary(s)) {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  }
  $('end').hidden = false;
  requestAnimationFrame(() => $('end').classList.add('show'));
  $('again').focus({ preventScroll: true });
});
$('again').addEventListener('click', begin);
$('end-menu').addEventListener('click', toMainMenu);

// Returning players: the menu mentions their last ending.
function lastTime() {
  const saved = loadState();
  return saved && saved.river ? `<p class="note" id="saved">Last time: ${summary(saved)[1]}</p>` : '';
}

const menu = new Menu($('menu'), {
  get header() {
    return `<p class="kicker">Chapter One &middot; The Trunk</p>
    <h1 id="title-h">A Suit for Burying</h1>
    <p class="tagline">He buried his wife in the only suit he owned. He never took it off. Now a stranger wants the man he used to be.</p>
    ${lastTime()}`;
  },
  main: [
    { label: 'Begin', sub: 'Sound on · about five minutes', action: () => begin() },
    { label: 'Settings', action: (m) => m.push('settings') },
    { label: 'Controls', action: (m) => m.push('controls') },
    { label: 'About', action: (m) => m.push('about') },
  ],
  pause: [
    { label: 'Resume', action: (m) => m.close() },
    { label: 'Settings', action: (m) => m.push('settings') },
    { label: 'Controls', action: (m) => m.push('controls') },
    { label: 'Restart chapter', action: () => begin() },
    { label: 'Main menu', action: () => toMainMenu() },
  ],
  onOpen: () => {
    director.paused = true;
    sound.suspend();
  },
  onClose: () => {
    director.paused = false;
    sound.resume();
  },
  settingsStore: settings,
  settings: [
    { key: 'master', label: 'Master volume', type: 'range' },
    { key: 'music', label: 'Music', type: 'range' },
    { key: 'effects', label: 'Sound effects', type: 'range' },
    { key: 'subtitles', label: 'Subtitles', type: 'toggle' },
    { key: 'textSize', label: 'Text size', type: 'select', options: [[0.85, 'Small'], [1, 'Medium'], [1.2, 'Large'], [1.4, 'Extra large']] },
    { key: 'shake', label: 'Camera shake', type: 'toggle' },
  ],
  controls: {
    list: [
      ['1 / 2', 'Make a choice (or click it)'],
      ['Esc / Space', 'Open or close this menu'],
      ['M', 'Sound on or off'],
      ['F', 'Full screen'],
      ['Enter', 'Begin, from the main menu'],
    ],
    extra: 'Some choices are timed. If you hesitate, the story chooses for him.',
  },
  about: `<h2 class="menu-title">About</h2>
    <p><strong>A Suit for Burying</strong> is a short interactive Western. A widower in a black suit, his late wife&rsquo;s grey mare, and a stranger who knew the man he used to be.</p>
    <p>This is Chapter One. Your choices change how it plays out, and they&rsquo;re saved for the next chapter.</p>
    <p class="menu-sub">Everything is drawn, lit and synthesised in code, in real time. There are no images or recordings.</p>`,
});
menu.showMain();

// ------------------------------------------------------------- controls ---

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape' || (k === ' ' && started && !menu.open)) {
    if (e.target.closest('button') && k === ' ') return;
    e.preventDefault();
    if (started) menu.toggle();
  } else if (menu.open) {
    return;
  } else if (k === '1' || k === '2') director.choose(+k - 1);
  else if (k === 'm') sound.setMute(!sound.muted);
  else if (k === 'f') {
    const el = document.documentElement;
    (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {});
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && !menu.open) menu.showPause();
});

// ----------------------------------------------------------------- loop ---

let lastNow = performance.now();
let time = 0;
let frames = 0;
let fpsT = 0;
function frame(now) {
  const dt = Math.min((now - lastNow) / 1000, 0.1);
  lastNow = now;
  time += dt;

  if (!started) {
    titleScene.update(12 + time * 0.2, dt);
    R.cam.time = time;
    R.cam.set({ x: -80, y: -230, view: 1350 });
    R.frame((r) => titleScene.draw(r, 12 + time), { ...titleScene.look(12), time, fade: 0.35 });
  } else {
    director.update(dt * (window.story?.speed || 1));
    director.render(time);
  }

  // Drop resolution once if the machine is struggling.
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
window.story = {
  speed: 1,
  director,
  get state() {
    return director.state;
  },
  menu,
  settings,
  begin,
  jump: (id) => {
    if (!started) begin();
    director.start(id, { cut: true });
  },
  choose: (i) => director.choose(i),
};
