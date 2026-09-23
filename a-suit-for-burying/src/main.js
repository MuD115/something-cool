import { Renderer } from './engine/renderer.js';
import { Director } from './engine/director.js';
import { Sound } from './engine/audio.js';
import { UI } from './engine/ui.js';
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

// --------------------------------------------------------- title card -----

// The title sits over a living frame of the prologue.
const titleEnv = { state, sound: { snort() {}, hoof() {} }, R, director };
let titleScene = CHAPTER_1.scenes.prologue.create(titleEnv);
let started = false;

function begin() {
  if (started) return;
  started = true;
  sound.start().then(() => sound.setMood('elegy'));
  $('title').classList.add('gone');
  $('hud').hidden = false;
  setTimeout(() => ($('title').hidden = true), 1400);
  director.start(CHAPTER_1.first);
}
$('begin').addEventListener('click', begin);

function restart() {
  state = freshState();
  director.state = state;
  $('end').hidden = true;
  $('end').classList.remove('show');
  ui.clearText();
  ui.hideChoice();
  director.paused = false;
  updatePause();
  director.start(CHAPTER_1.first);
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
$('again').addEventListener('click', restart);

// Returning players: the title mentions their last ending.
const saved = loadState();
if (saved && saved.river) {
  $('saved').hidden = false;
  $('saved').textContent = `Last time: ${summary(saved)[1]}`;
}

// ------------------------------------------------------------- controls ---

const pauseBtn = $('btn-pause');
const muteBtn = $('btn-mute');
function updatePause() {
  pauseBtn.textContent = director.paused ? 'Resume' : 'Pause';
  pauseBtn.setAttribute('aria-pressed', String(director.paused));
  stage.classList.toggle('paused', director.paused);
}
function togglePause() {
  if (!started) return;
  director.paused = !director.paused;
  if (sound.ctx) director.paused ? sound.ctx.suspend() : sound.ctx.resume();
  updatePause();
}
function toggleMute() {
  sound.setMute(!sound.muted);
  muteBtn.textContent = sound.muted ? 'Sound off' : 'Sound on';
  muteBtn.setAttribute('aria-pressed', String(!sound.muted));
}
pauseBtn.addEventListener('click', togglePause);
muteBtn.addEventListener('click', toggleMute);
$('btn-restart').addEventListener('click', restart);

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (!started && (k === 'enter' || k === ' ')) {
    e.preventDefault();
    begin();
  } else if (k === '1' || k === '2') director.choose(+k - 1);
  else if (k === ' ') {
    if (e.target.closest('button')) return;
    e.preventDefault();
    togglePause();
  } else if (k === 'm') toggleMute();
  else if (k === 'f') {
    const el = document.documentElement;
    (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {});
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && !director.paused) togglePause();
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
  begin,
  jump: (id) => {
    if (!started) begin();
    director.start(id, { cut: true });
  },
  choose: (i) => director.choose(i),
};
