// Photo mode: the story stops, the HUD steps aside, and the camera is free
// to move a little way around Sami, zoom, and take one of four looks. A
// photo is the frame as drawn, with the look baked in, saved as a PNG.

import { clamp, lerp } from './util.js';

// CSS filters, used live on the canvas and baked in when saving.
export const FILTERS = [
  ['natural', 'fNatural', 'none'],
  ['warm', 'fWarm', 'sepia(0.22) saturate(1.15) brightness(1.03)'],
  ['mono', 'fMono', 'grayscale(1) contrast(1.12)'],
  ['faded', 'fFaded', 'sepia(0.35) contrast(0.82) brightness(1.08) saturate(0.7)'],
];

export class Photo {
  constructor({ game, stage, canvas, input, t, onExit, render }) {
    Object.assign(this, { game, stage, canvas, input, t, onExit, render });
    this.active = false;
    this.el = document.getElementById('photo');
    this.onKey = (e) => this.key(e);
  }

  open() {
    const g = this.game;
    this.active = true;
    this.filter = 0;
    this.home = { ...g.cam };
    this.cam = { ...g.cam };
    this.want = { ...g.cam };
    this.stage.classList.add('photo');
    this.applyFilter();
    this.draw();
    window.addEventListener('keydown', this.onKey, true);
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.stage.classList.remove('photo');
    this.canvas.style.filter = '';
    Object.assign(this.game.cam, this.home);
    window.removeEventListener('keydown', this.onKey, true);
    this.el.hidden = true;
    this.onExit?.();
  }

  // The panel: what the keys do, and buttons for touch and mouse.
  draw() {
    const t = this.t;
    this.el.hidden = false;
    this.el.dir = document.documentElement.lang === 'ar' ? 'rtl' : 'ltr';
    this.el.innerHTML = `
      <p class="photo-help">${t('photoHelp')}</p>
      <div class="photo-btns">
        <button type="button" data-a="out" aria-label="−">−</button>
        <button type="button" data-a="in" aria-label="+">+</button>
        <button type="button" data-a="filter">${t('photoFilter')}: <span class="photo-f">${t(FILTERS[this.filter][1])}</span></button>
        <button type="button" data-a="save" class="primary">${t('photoSave')}</button>
        <button type="button" data-a="exit">${t('photoExit')}</button>
      </div>
      <p class="photo-toast" aria-live="polite"></p>`;
    for (const b of this.el.querySelectorAll('button')) b.addEventListener('click', () => this.act(b.dataset.a));
  }

  act(a) {
    if (a === 'in') this.want.view *= 0.85;
    else if (a === 'out') this.want.view /= 0.85;
    else if (a === 'filter') {
      this.filter = (this.filter + 1) % FILTERS.length;
      this.applyFilter();
      const f = this.el.querySelector('.photo-f');
      if (f) f.textContent = this.t(FILTERS[this.filter][1]);
    } else if (a === 'save') this.save();
    else if (a === 'exit') this.close();
  }

  key(e) {
    const map = { Equal: 'in', NumpadAdd: 'in', Minus: 'out', NumpadSubtract: 'out', KeyF: 'filter', Enter: 'save', NumpadEnter: 'save', Escape: 'exit', KeyP: 'exit' };
    const a = map[e.code];
    if (!a) return;
    // Enter on a focused panel button is that button's own click
    if (a === 'save' && e.target.closest?.('#photo button')) return;
    e.preventDefault();
    e.stopPropagation();
    this.act(a);
  }

  applyFilter() {
    this.canvas.style.filter = FILTERS[this.filter][2] === 'none' ? '' : FILTERS[this.filter][2];
  }

  // Held arrows (or the stick) move the camera, within reach of Sami.
  update(dt) {
    const i = this.input;
    const k = i.keys;
    const dx = (i.held('right') ? 1 : 0) - (i.held('left') ? 1 : 0);
    const dy = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
    const w = this.want;
    const p = this.game.player;
    w.x = clamp(w.x + dx * dt * w.view * 0.5, p.x - 900, p.x + 900);
    w.y = clamp(w.y + dy * dt * w.view * 0.35, -620, -90);
    w.view = clamp(w.view, 520, 2400);
    const s = 1 - Math.exp(-dt * 6);
    for (const key of ['x', 'y', 'view']) this.cam[key] = lerp(this.cam[key], w[key], s);
    Object.assign(this.game.cam, this.cam);
    this.game.shake = 0;
  }

  // Draw one frame and read it straight back (the WebGL canvas keeps no
  // copy after it's shown), through the filter, into a PNG.
  save() {
    this.render();
    const src = this.canvas;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d');
    const f = FILTERS[this.filter][2];
    if (f !== 'none') ctx.filter = f;
    ctx.drawImage(src, 0, 0);
    this.last = c;
    const toast = (msg) => {
      const el = this.el.querySelector('.photo-toast');
      if (!el) return;
      el.textContent = msg;
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => (el.textContent = ''), 2200);
    };
    c.toBlob(async (blob) => {
      if (!blob) return;
      this.lastSize = blob.size;
      const filename = `before-i-knew-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      // inside the claude.ai viewer, files go through its save prompt
      const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
      if (dl) {
        try {
          await dl.save({ filename, data: blob });
          toast(this.t('photoSaved'));
        } catch {
          /* declined, or not available here: nothing to say */
        }
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(this.t('photoSaved'));
    }, 'image/png');
  }
}
