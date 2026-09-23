import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

import { vertexShader, fragmentShader } from './shader.js';
import { Drone } from './audio.js';
import { MERGER, stateAt, readouts, amplitude, phaseName, PHASE_TEXT } from './merger.js';
import { Scope } from './scope.js';
import { makeGridTexture, loadImageTexture } from './sky.js';

// ------------------------------------------------------------------ params ---

const params = {
  lensing: 1,
  doppler: 0,
  redshift: 0.3,
  discInner: 3,
  discOuter: 14,
  discTemp: 3900,
  discBrightness: 1.8,
  discOpacity: 0.95,
  discSpeed: 1,
  discDetail: 5,
  jets: 0,
  stars: 1,
  nebula: 1,
  exposure: 1,
  bloomStrength: 0.6,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  fov: 48,
  autoQuality: true,
  resolution: 0.6,
  steps: 320,
  stepScale: 0.05,
  cinematic: true,
  gwStrength: 1,
  gwGlow: 0.5,
  slowMotion: true,
};

// Camera placement: r in Schwarzschild radii, elev = angle above the disc.
const PRESETS = {
  Interstellar: {
    blurb: 'Gargantua-style: Doppler colouring switched off, as in the film.',
    cam: { r: 22, elev: 0.09 },
    p: { lensing: 1, doppler: 0, redshift: 0.3, discInner: 3, discOuter: 14, discTemp: 3900, discBrightness: 1.8, discOpacity: 0.95, discSpeed: 1, jets: 0, stars: 1, nebula: 1, exposure: 1 },
  },
  Relativistic: {
    blurb: 'Full physics: Doppler beaming and gravitational redshift. The approaching side blazes.',
    cam: { r: 20, elev: 0.2 },
    p: { lensing: 1, doppler: 1, redshift: 1, discInner: 3, discOuter: 14, discTemp: 5200, discBrightness: 1.05, discOpacity: 0.9, discSpeed: 1, jets: 0, stars: 1, nebula: 1, exposure: 1 },
  },
  'M87*': {
    blurb: 'Seen almost face-on, like the first black hole ever imaged, with its jet pointing near us.',
    cam: { r: 30, elev: 1.22 },
    p: { lensing: 1, doppler: 1, redshift: 1, discInner: 3, discOuter: 9, discTemp: 3600, discBrightness: 2.2, discOpacity: 0.7, discSpeed: 1, jets: 0.2, stars: 0.7, nebula: 0.6, exposure: 1.1 },
  },
  Quasar: {
    blurb: 'A ravenous, blue-hot disc hurling twin jets across the sky.',
    cam: { r: 36, elev: 0.33 },
    p: { lensing: 1, doppler: 1, redshift: 1, discInner: 3, discOuter: 20, discTemp: 26000, discBrightness: 1.1, discOpacity: 0.85, discSpeed: 1.6, jets: 1.3, stars: 0.8, nebula: 1.2, exposure: 0.85 },
  },
  'Lensing only': {
    blurb: 'No disc, just bent starlight. Look for the Einstein ring and the doubled sky.',
    cam: { r: 11, elev: 0.25 },
    p: { lensing: 1, doppler: 0, redshift: 0, discInner: 3, discOuter: 14, discTemp: 4600, discBrightness: 0, discOpacity: 0, discSpeed: 1, jets: 0, stars: 1.8, nebula: 1.8, exposure: 1.2 },
  },
  Newtonian: {
    blurb: 'Gravity switched off for light. This is what Einstein changed.',
    cam: { r: 22, elev: 0.09 },
    p: { lensing: 0, doppler: 0, redshift: 0, discInner: 3, discOuter: 14, discTemp: 3900, discBrightness: 1.8, discOpacity: 0.95, discSpeed: 1, jets: 0, stars: 1, nebula: 1, exposure: 1 },
  },
};

// ---------------------------------------------------------------- renderer ---

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(window.innerWidth, window.innerHeight);

const isTouch = matchMedia('(pointer: coarse)').matches;
const basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
if (isTouch) params.resolution = 0.45;

const camera = new THREE.PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
const spherical = new THREE.Spherical(22, Math.PI / 2 - 0.09, 0.6);
camera.position.setFromSpherical(spherical);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 2.6;
controls.maxDistance = 90;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.6;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;

const uniforms = {
  uTime: { value: 0 },
  uCamPos: { value: new THREE.Vector3() },
  uCamWorld: { value: new THREE.Matrix4() },
  uTanHalfFov: { value: 1 },
  uAspect: { value: 1 },
  uPixelAngle: { value: 0.001 },
  uViewShift: { value: 0 },
  uLensing: { value: 1 },
  uDoppler: { value: 0 },
  uRedshift: { value: 0 },
  uDiscInner: { value: 3 },
  uDiscOuter: { value: 14 },
  uDiscTemp: { value: 4600 },
  uDiscBrightness: { value: 2 },
  uDiscOpacity: { value: 1 },
  uDiscSpeed: { value: 1 },
  uDiscDetail: { value: 5 },
  uJets: { value: 0 },
  uStars: { value: 1 },
  uNebula: { value: 1 },
  uExposure: { value: 1 },
  uSteps: { value: 320 },
  uStepScale: { value: 0.05 },
  uBH1: { value: new THREE.Vector3() },
  uBH2: { value: new THREE.Vector3() },
  uRs1: { value: 1 },
  uRs2: { value: 0 },
  uRsDisc: { value: 1 },
  uRing: { value: 0 },
  uRingPhase: { value: 0 },
  uMini: { value: 0 },
  uMiniOuter: { value: 0 },
  uGW: { value: 0 },
  uGWGlow: { value: 0 },
  uSimT: { value: 0 },
  uChirpT: { value: MERGER.T },
  uOmega0: { value: MERGER.omega0 },
  uTm: { value: MERGER.tm },
  uPhiM: { value: MERGER.phiM },
  uAmpM: { value: MERGER.ampM },
  uRingOmega: { value: MERGER.ringOmega },
  uRingDecay: { value: MERGER.ringDecay },
  uWaveC: { value: MERGER.waveC },
  uBackdrop: { value: null },
  uBackdropOn: { value: 0 },
  uBackdropAspect: { value: 1.6 },
};

const quadScene = new THREE.Scene();
const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(quadScene, quadCamera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.55, 0.3);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let currentPixelRatio = 0;
function applyResolution() {
  const pr = basePixelRatio * params.resolution;
  if (Math.abs(pr - currentPixelRatio) < 1e-3) return;
  currentPixelRatio = pr;
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Portrait screens get a taller vertical field so the disc still fits across.
function applyFov() {
  const aspect = window.innerWidth / window.innerHeight;
  const half = THREE.MathUtils.degToRad(params.fov) / 2;
  const widen = aspect < 1 ? Math.pow(aspect, -0.75) : 1;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * widen));
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

function onResize() {
  applyFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
applyFov();
applyResolution();

// ------------------------------------------------------------------- audio ---

const drone = new Drone();
const soundBtn = document.getElementById('sound');
function toggleSound() {
  const on = drone.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
  document.body.classList.toggle('sound-on', on);
}
soundBtn.addEventListener('click', toggleSound);

// --------------------------------------------------------- presets & tween ---

const presetBar = document.getElementById('presets');
const blurbEl = document.getElementById('blurb');
let activePreset = 'Interstellar';
let tween = null;
let cinematicBase = { r: 22, elev: 0.09 };

Object.keys(PRESETS).forEach((name, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'preset';
  b.dataset.name = name;
  b.innerHTML = `<kbd>${i + 1}</kbd>${name}`;
  b.addEventListener('click', () => selectPreset(name));
  presetBar.appendChild(b);
});

function markPreset() {
  presetBar.querySelectorAll('.preset').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.name === activePreset));
  });
  blurbEl.textContent = PRESETS[activePreset].blurb;
}

function selectPreset(name, instant = false) {
  const preset = PRESETS[name];
  setMode('explore');
  activePreset = name;
  markPreset();
  try {
    history.replaceState(null, '', `#${slug(name)}`);
  } catch {
    /* sandboxed frames may refuse */
  }
  cinematicBase = { ...preset.cam };

  if (instant) {
    Object.assign(params, preset.p);
    camera.position.setFromSpherical(new THREE.Spherical(preset.cam.r, Math.PI / 2 - preset.cam.elev, 0.6));
    tween = null;
    guiRefresh();
    return;
  }

  const from = {};
  for (const k of Object.keys(preset.p)) from[k] = params[k];
  const s = new THREE.Spherical().setFromVector3(camera.position);
  tween = {
    t: 0,
    dur: 2.4,
    from,
    to: preset.p,
    camFrom: { r: s.radius, elev: Math.PI / 2 - s.phi, theta: s.theta },
    camTo: preset.cam,
  };
}

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ------------------------------------------------------------ collision ---

// Two modes share one renderer: 'collision' plays the binary merger
// timeline, 'explore' is the single black hole with its presets.
let mode = 'explore';
const merger = { t: 0, playing: false, scrubbing: false, phase: '' };
const MERGER_LOOK = { lensing: 1, doppler: 0.6, redshift: 1, jets: 0, stars: 1, nebula: 1, exposure: 1 };

const modeTabs = document.querySelectorAll('[data-mode]');
const playBtn = document.getElementById('btn-play');
const timeEl = document.getElementById('m-time');
const exploreCta = document.getElementById('btn-explore-final');

function setMode(next) {
  if (mode === next) return;
  mode = next;
  document.body.dataset.mode = mode;
  modeTabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  if (mode === 'explore') {
    drone.chirp(0, 0);
    merger.playing = false;
  }
}

function startCollision({ play = true, t = 0 } = {}) {
  setMode('collision');
  tween = null;
  Object.assign(params, MERGER_LOOK);
  merger.t = t;
  merger.playing = play;
  merger.phase = '';
  params.cinematic = !reducedMotion;
  try {
    history.replaceState(null, '', '#collision');
  } catch {
    /* sandboxed frames may refuse */
  }
  guiRefresh();
  updatePlayButton();
}

function updatePlayButton() {
  const atEnd = merger.t >= MERGER.end - 0.01;
  const label = merger.playing ? 'Pause' : atEnd ? 'Replay' : 'Play';
  playBtn.querySelector('span').textContent = label;
  playBtn.setAttribute('aria-pressed', String(merger.playing));
  exploreCta.hidden = !(atEnd || merger.t > MERGER.tm + MERGER.discStart + MERGER.discDuration * 0.6);
}

function togglePlay() {
  if (mode !== 'collision') return startCollision();
  if (merger.t >= MERGER.end - 0.01) merger.t = 0;
  merger.playing = !merger.playing;
  updatePlayButton();
}

const scope = new Scope(document.getElementById('scope'), (t, active) => {
  if (mode !== 'collision') startCollision({ play: false, t });
  merger.t = t;
  merger.scrubbing = active;
  if (active) merger.playing = false;
  updatePlayButton();
});

// Playback slows around the merger so its last, fastest orbits stay visible.
function playbackRate(t) {
  if (!params.slowMotion) return 1;
  const d = Math.abs(t - (MERGER.tm - 0.3));
  return 0.28 + 0.72 * THREE.MathUtils.smoothstep(d, 0.4, 3.2);
}

function updateCollision(dt) {
  if (merger.playing) {
    merger.t += dt * playbackRate(merger.t);
    if (merger.t >= MERGER.end) {
      merger.t = MERGER.end;
      merger.playing = false;
    }
    updatePlayButton();
  }
  const t = merger.t;

  const name = phaseName(t);
  if (name !== merger.phase) {
    merger.phase = name;
    blurbEl.textContent = PHASE_TEXT[name];
  }

  // Scripted camera: close in on the pair, then pull back for the new disc.
  if (params.cinematic) {
    const k = THREE.MathUtils.smoothstep(t, MERGER.tm + 1, MERGER.tm + 10);
    const target = new THREE.Spherical(
      THREE.MathUtils.lerp(19.5, 21, k),
      Math.PI / 2 - THREE.MathUtils.lerp(0.5, 0.11, k),
      0,
    );
    const cur = new THREE.Spherical().setFromVector3(camera.position);
    const e = 1 - Math.exp(-dt * 1.2);
    cur.radius += (target.radius - cur.radius) * e;
    cur.phi += (target.phi - cur.phi) * e;
    cur.theta += dt * 0.03;
    camera.position.setFromSpherical(cur);
  }

  // The chirp: real gravitational-wave pitch, loudness following the strain.
  const audible = merger.playing || merger.scrubbing;
  const level = audible ? Math.min(Math.pow(amplitude(t) / MERGER.ampM, 0.8), 1) : 0;
  drone.chirp(readouts(t).fGw, level);

  scope.draw(t);
  timeEl.textContent = `${t.toFixed(1)} s`;
}

modeTabs.forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.mode === 'collision') startCollision();
    else selectPreset(activePreset);
  }),
);
playBtn.addEventListener('click', togglePlay);
document.getElementById('btn-restart').addEventListener('click', () => startCollision());
exploreCta.addEventListener('click', () => selectPreset('Interstellar'));

// ------------------------------------------------------------------- sky ---

const skyBtns = document.querySelectorAll('[data-sky]');
const skyFile = document.getElementById('sky-file');
const toast = document.getElementById('toast');
let grid = null;
let toastTimer = 0;

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 3800);
}

function setSky(kind, tex) {
  if (kind === 'stars') {
    uniforms.uBackdropOn.value = 0;
  } else {
    if (uniforms.uBackdrop.value && uniforms.uBackdrop.value !== grid?.texture && uniforms.uBackdrop.value !== tex?.texture) {
      uniforms.uBackdrop.value.dispose();
    }
    const src = kind === 'grid' ? (grid ??= makeGridTexture()) : tex;
    uniforms.uBackdrop.value = src.texture;
    uniforms.uBackdropAspect.value = src.aspect;
    uniforms.uBackdropOn.value = 1;
  }
  skyBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sky === kind)));
}

async function useImage(file) {
  try {
    setSky('image', await loadImageTexture(file));
    showToast('Your image now hangs behind the black hole. Move closer to bend it into a ring.');
  } catch (err) {
    showToast(err.message);
  }
}

skyBtns.forEach((b) => {
  if (b.dataset.sky !== 'image') b.addEventListener('click', () => setSky(b.dataset.sky));
});
skyFile.addEventListener('change', () => {
  if (skyFile.files[0]) useImage(skyFile.files[0]);
  skyFile.value = '';
});
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('dropping');
});
window.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('dropping');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dropping');
  const file = e.dataTransfer?.files?.[0];
  if (file) useImage(file);
});
// Redraw the grid once the webfonts have arrived.
document.fonts?.ready.then(() => {
  if (!grid) return;
  const wasShowing = uniforms.uBackdrop.value === grid.texture;
  grid.texture.dispose();
  grid = makeGridTexture();
  if (wasShowing) setSky('grid');
});

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function updateTween(dt) {
  if (!tween) return;
  tween.t = Math.min(tween.t + dt / tween.dur, 1);
  const e = ease(tween.t);
  for (const k of Object.keys(tween.to)) {
    params[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * e;
  }
  const r = tween.camFrom.r + (tween.camTo.r - tween.camFrom.r) * e;
  const elev = tween.camFrom.elev + (tween.camTo.elev - tween.camFrom.elev) * e;
  const theta = tween.camFrom.theta + 0.5 * e; // a gentle sweep while travelling
  camera.position.setFromSpherical(new THREE.Spherical(r, Math.PI / 2 - elev, theta));
  guiRefresh();
  if (tween.t >= 1) tween = null;
}

// --------------------------------------------------------------------- GUI ---

const gui = new GUI({ title: 'Controls', container: document.getElementById('gui-slot') });
gui.close();

const fPhys = gui.addFolder('Physics');
fPhys.add(params, 'lensing', 0, 1.5, 0.01).name('Light bending');
fPhys.add(params, 'doppler', 0, 1, 0.01).name('Doppler beaming');
fPhys.add(params, 'redshift', 0, 1, 0.01).name('Gravitational redshift');

const fDisc = gui.addFolder('Accretion disc');
fDisc.add(params, 'discInner', 1.5, 8, 0.01).name('Inner edge (rₛ)');
fDisc.add(params, 'discOuter', 4, 30, 0.1).name('Outer edge (rₛ)');
fDisc.add(params, 'discTemp', 1500, 30000, 10).name('Peak temp (K)');
fDisc.add(params, 'discBrightness', 0, 6, 0.01).name('Brightness');
fDisc.add(params, 'discOpacity', 0, 2, 0.01).name('Opacity');
fDisc.add(params, 'discSpeed', 0, 5, 0.01).name('Orbital speed');
fDisc.add(params, 'discDetail', 1, 6, 1).name('Turbulence detail');

const fSky = gui.addFolder('Jets & sky');
fSky.add(params, 'jets', 0, 2, 0.01).name('Relativistic jets');
fSky.add(params, 'stars', 0, 3, 0.01).name('Stars');
fSky.add(params, 'nebula', 0, 3, 0.01).name('Nebula');

const fGW = gui.addFolder('Collision');
fGW.add(params, 'gwStrength', 0, 3, 0.01).name('Wave lensing (×10²⁰)');
fGW.add(params, 'gwGlow', 0, 2, 0.01).name('Show wave crests');
fGW.add(params, 'slowMotion').name('Slow-mo at merger');

const fCam = gui.addFolder('Camera');
fCam.add(params, 'cinematic').name('Cinematic drift');
fCam.add(params, 'fov', 20, 100, 1).name('Field of view').onChange(applyFov);

const fRender = gui.addFolder('Rendering');
fRender.add(params, 'autoQuality').name('Adaptive resolution');
fRender.add(params, 'resolution', 0.25, 1.5, 0.05).name('Resolution scale').onChange(() => {
  params.autoQuality = false;
  guiRefresh();
});
fRender.add(params, 'steps', 60, 720, 10).name('Ray steps');
fRender.add(params, 'stepScale', 0.02, 0.15, 0.005).name('Step size');
fRender.add(params, 'exposure', 0.2, 3, 0.01).name('Exposure');
fRender.add(params, 'bloomStrength', 0, 3, 0.01).name('Bloom strength');
fRender.add(params, 'bloomRadius', 0, 1, 0.01).name('Bloom radius');
fRender.add(params, 'bloomThreshold', 0, 2, 0.01).name('Bloom threshold');
fRender.close();

[fPhys, fDisc, fSky, fGW, fCam].forEach((f) => f.close());

const cineBtn = document.getElementById('btn-cine');
function guiRefresh() {
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
  cineBtn.setAttribute('aria-pressed', String(params.cinematic));
}

// Cinematic drift yields to the user the moment they grab the camera.
controls.addEventListener('start', () => {
  if (params.cinematic) {
    params.cinematic = false;
    guiRefresh();
  }
  tween = null;
});

// --------------------------------------------------------------- telemetry ---

const tel = {
  r: document.getElementById('t-r'),
  au: document.getElementById('t-au'),
  clock: document.getElementById('t-clock'),
  esc: document.getElementById('t-esc'),
  orbit: document.getElementById('t-orbit'),
  zone: document.getElementById('t-zone'),
  perf: document.getElementById('t-perf'),
};
const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

function zoneFor(r) {
  if (r < 1.5) return 'Inside the photon sphere. Every way out bends back in';
  if (r < 1.53) return 'On the photon sphere. Light itself orbits here';
  if (r < 3) return 'Inside the ISCO. No stable orbits; matter plunges';
  if (r < 6) return 'Inner disc. Gas moving at a third of lightspeed';
  return 'Deep space. Spacetime gently curved';
}

const mtel = {
  sep: document.getElementById('m-sep'),
  freq: document.getElementById('m-freq'),
  speed: document.getElementById('m-speed'),
  left: document.getElementById('m-left'),
  mass: document.getElementById('m-mass'),
};

function updateCollisionTelemetry() {
  const t = merger.t;
  const r = readouts(t);
  if (t < MERGER.tm) {
    mtel.sep.textContent = `${nf.format(r.aKm)} km`;
    mtel.freq.textContent = `${r.fGw.toFixed(0)} Hz`;
    mtel.speed.textContent = `${r.v.toFixed(2)} c`;
    mtel.left.textContent = r.realLeft > 0.01 ? `${r.realLeft.toFixed(2)} s` : `${(r.realLeft * 1000).toFixed(1)} ms`;
    mtel.mass.textContent = '2 × 32.5 M☉';
  } else {
    mtel.sep.textContent = 'one horizon';
    mtel.freq.textContent = t < MERGER.tm + 3 ? `${r.fGw.toFixed(0)} Hz, fading` : 'silent';
    mtel.speed.textContent = '–';
    mtel.left.textContent = 'merged';
    mtel.mass.textContent = '61.8 M☉, 3.2 M☉ radiated';
  }
}

let fps = 60;
function updateTelemetry() {
  if (mode === 'collision') updateCollisionTelemetry();
  const r = camera.position.length();
  const dil = 1 / Math.sqrt(Math.max(1 - 1 / r, 1e-6));
  tel.r.textContent = `${r.toFixed(2)} rₛ`;
  tel.au.textContent = `${nf.format(r * 128)} AU`;
  tel.clock.textContent = `1 h here = ${dil.toFixed(3)} h far away`;
  tel.esc.textContent = `${Math.min(Math.sqrt(1 / r), 1).toFixed(3)} c`;
  tel.orbit.textContent = r > 1.5 ? `${Math.min(Math.sqrt(0.5 / (r - 1)), 1).toFixed(3)} c${r < 3 ? ' (unstable)' : ''}` : 'none possible';
  tel.zone.textContent = zoneFor(r);
  const w = Math.round(window.innerWidth * currentPixelRatio);
  const h = Math.round(window.innerHeight * currentPixelRatio);
  tel.perf.textContent = `${Math.round(fps)} fps · ${w}×${h} · ${Math.round(params.steps)} steps`;
}

// ---------------------------------------------------------------- keyboard ---

const ui = document.getElementById('ui');
const showBtn = document.getElementById('btn-show');
function toggleUI() {
  const hidden = ui.classList.toggle('hidden');
  showBtn.hidden = !hidden;
}
showBtn.addEventListener('click', toggleUI);

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    /* not available in this frame */
  }
}

const shotDialog = document.getElementById('shot');
const shotImg = shotDialog.querySelector('img');
function screenshot() {
  // Render one full-resolution frame, read it back while the drawing buffer
  // is still intact, then drop back to the adaptive resolution.
  const saved = params.resolution;
  params.resolution = Math.max(saved, 1 / basePixelRatio * Math.min(window.devicePixelRatio || 1, 2));
  render(0);
  shotImg.src = renderer.domElement.toDataURL('image/png');
  params.resolution = saved;
  shotDialog.hidden = false;
}
shotDialog.addEventListener('click', (e) => {
  if (e.target === shotDialog || e.target.closest('[data-close]')) shotDialog.hidden = true;
});

document.getElementById('btn-shot').addEventListener('click', screenshot);
document.getElementById('btn-hide').addEventListener('click', toggleUI);
cineBtn.addEventListener('click', () => {
  params.cinematic = !params.cinematic;
  guiRefresh();
});

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  const names = Object.keys(PRESETS);
  if (/^[1-9]$/.test(k) && names[+k - 1]) selectPreset(names[+k - 1]);
  else if (k === '0') startCollision();
  else if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === 'r') startCollision();
  else if (k === 'h') toggleUI();
  else if (k === 'c') { params.cinematic = !params.cinematic; guiRefresh(); }
  else if (k === 'm') toggleSound();
  else if (k === 'p') screenshot();
  else if (k === 'f') toggleFullscreen();
  else if (k === 'escape') shotDialog.hidden = true;
});

// -------------------------------------------------------------------- loop ---

const timer = new THREE.Timer();
timer.connect(document);
let simTime = 0;
let cineTime = 0;
let frames = 0;
let fpsTimer = 0;
let telTimer = 0;
let upgradeCooldown = 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) params.cinematic = false;

function syncUniforms() {
  const u = uniforms;
  u.uTime.value = simTime;
  u.uCamPos.value.copy(camera.position);
  u.uCamWorld.value.copy(camera.matrixWorld);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  u.uTanHalfFov.value = tanHalf;
  u.uAspect.value = camera.aspect;
  u.uPixelAngle.value = (2 * tanHalf) / (window.innerHeight * currentPixelRatio);
  u.uLensing.value = params.lensing;
  u.uDoppler.value = params.doppler;
  u.uRedshift.value = params.redshift;
  u.uDiscInner.value = params.discInner;
  u.uDiscOuter.value = Math.max(params.discOuter, params.discInner + 0.5);
  u.uDiscTemp.value = params.discTemp;
  u.uDiscBrightness.value = params.discBrightness;
  u.uDiscOpacity.value = params.discOpacity;
  u.uDiscSpeed.value = params.discSpeed;
  u.uDiscDetail.value = Math.round(params.discDetail);
  u.uJets.value = params.jets;
  u.uStars.value = params.stars;
  u.uNebula.value = params.nebula;
  u.uExposure.value = params.exposure;
  u.uSteps.value = Math.round(params.steps);
  u.uStepScale.value = params.stepScale;

  // Lift the collision above the timeline; ease back when exploring.
  const shiftTarget = mode === 'collision' && !ui.classList.contains('hidden') ? (camera.aspect < 1 ? -0.3 : -0.24) : 0;
  u.uViewShift.value += (shiftTarget - u.uViewShift.value) * 0.05;

  if (mode === 'collision') {
    const st = stateAt(merger.t);
    u.uBH1.value.fromArray(st.bh1);
    u.uBH2.value.fromArray(st.bh2);
    u.uRs1.value = st.rs1;
    u.uRs2.value = st.rs2;
    u.uRsDisc.value = st.merged ? MERGER.rsFinal : 1;
    u.uRing.value = st.ring;
    u.uRingPhase.value = st.ringPhase;
    u.uMini.value = st.mini;
    u.uMiniOuter.value = st.miniOuter;
    u.uDiscInner.value = st.discInner;
    u.uDiscOuter.value = st.discOuter;
    u.uDiscTemp.value = 3900;
    u.uDiscBrightness.value = 1.8 * st.discAmount;
    u.uDiscOpacity.value = 0.95 * st.discAmount;
    u.uDiscSpeed.value = 1;
    u.uGW.value = params.gwStrength * 0.05;
    u.uGWGlow.value = params.gwGlow;
    u.uSimT.value = merger.t;
  } else {
    u.uBH1.value.set(0, 0, 0);
    u.uRs1.value = 1;
    u.uRs2.value = 0;
    u.uRsDisc.value = 1;
    u.uRing.value = 0;
    u.uMini.value = 0;
    u.uGW.value = 0;
    u.uGWGlow.value = 0;
  }
  bloom.strength = params.bloomStrength;
  bloom.radius = params.bloomRadius;
  bloom.threshold = params.bloomThreshold;
}

function updateCinematic(dt) {
  if (!params.cinematic || tween || mode !== 'explore') return;
  cineTime += dt;
  const t = cineTime;
  const target = new THREE.Spherical(
    cinematicBase.r * (1 + 0.28 * Math.sin(t * 0.045)),
    Math.PI / 2 - THREE.MathUtils.clamp(cinematicBase.elev + 0.14 * Math.sin(t * 0.032), -1.45, 1.45),
    0,
  );
  const cur = new THREE.Spherical().setFromVector3(camera.position);
  target.theta = cur.theta + dt * 0.035;
  const k = 1 - Math.exp(-dt * 0.8);
  cur.radius += (target.radius - cur.radius) * k;
  cur.phi += (target.phi - cur.phi) * k;
  cur.theta = target.theta;
  camera.position.setFromSpherical(cur);
}

function adaptQuality(dt) {
  frames++;
  fpsTimer += dt;
  if (fpsTimer < 1) return;
  fps = frames / fpsTimer;
  frames = 0;
  fpsTimer = 0;
  if (!params.autoQuality || document.hidden) return;
  upgradeCooldown = Math.max(upgradeCooldown - 1, 0);
  if (fps < 42 && params.resolution > 0.3) {
    params.resolution = Math.max(0.3, params.resolution - (fps < 25 ? 0.15 : 0.08));
    upgradeCooldown = 5;
    guiRefresh();
  } else if (fps > 56 && upgradeCooldown === 0 && params.resolution < 1) {
    params.resolution = Math.min(1, params.resolution + 0.05);
    upgradeCooldown = 2;
    guiRefresh();
  }
}

function render(dt) {
  applyResolution();
  camera.updateMatrixWorld();
  syncUniforms();
  renderer.toneMappingExposure = 1;
  composer.render(dt);
}

let firstFrame = true;
function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  simTime += dt;

  updateTween(dt);
  updateCinematic(dt);
  if (mode === 'collision') updateCollision(dt);
  controls.update(dt);
  adaptQuality(dt);

  const r = camera.position.length();
  drone.update(r);

  render(dt);

  telTimer += dt;
  if (telTimer > 0.2) {
    telTimer = 0;
    updateTelemetry();
  }

  if (firstFrame) {
    firstFrame = false;
    document.body.classList.add('ready');
  }
  requestAnimationFrame(frame);
}

// Open on the collision unless the link names a single-hole scene.
const fromHash = Object.keys(PRESETS).find((n) => `#${slug(n)}` === location.hash);
document.body.dataset.mode = mode;
if (fromHash) {
  selectPreset(fromHash, true);
  markPreset();
} else {
  camera.position.setFromSpherical(new THREE.Spherical(19.5, Math.PI / 2 - 0.5, 0.6));
  startCollision();
}
guiRefresh();
updateTelemetry();
requestAnimationFrame(frame);

// Handy for tinkering from the dev-tools console.
window.eventHorizon = { params, selectPreset, startCollision, merger, camera, setSky };
