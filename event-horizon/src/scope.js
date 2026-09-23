// A LIGO-style strain trace of the whole merger with a draggable playhead.

import { MERGER, strain } from './merger.js';

const MARKS = [
  { t: 0, label: 'Inspiral' },
  { t: MERGER.tm - 2.5, label: 'Merger' },
  { t: MERGER.tm, label: 'Ringdown' },
  { t: MERGER.tm + MERGER.discStart + 1, label: 'New disc' },
];

// The time axis is piecewise linear: the long, slow inspiral is compressed
// and the brief merger stretched, like LIGO's zoomed plots of GW150914.
const KNOTS_T = [0, MERGER.tm - 2.5, MERGER.tm, MERGER.tm + 3, MERGER.end];
const KNOTS_X = [0, 0.5, 0.72, 0.82, 1];

function interp(v, from, to) {
  for (let i = 1; i < from.length; i++) {
    if (v <= from[i] || i === from.length - 1) {
      const k = (v - from[i - 1]) / (from[i] - from[i - 1]);
      return to[i - 1] + (to[i] - to[i - 1]) * Math.min(Math.max(k, 0), 1);
    }
  }
  return to[to.length - 1];
}
const tToX = (t) => interp(t, KNOTS_T, KNOTS_X);
const xToT = (x) => interp(x, KNOTS_X, KNOTS_T);

export class Scope {
  constructor(canvas, onScrub) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onScrub = onScrub;
    this.t = 0;
    this.trace = null;
    this.dragging = false;

    const toTime = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      return xToT(x);
    };
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
      this.onScrub(toTime(e), true);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.dragging) this.onScrub(toTime(e), true);
    });
    const end = () => {
      if (this.dragging) this.onScrub(this.t, false);
      this.dragging = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowRight') this.onScrub(Math.min(this.t + step, MERGER.end), false);
      else if (e.key === 'ArrowLeft') this.onScrub(Math.max(this.t - step, 0), false);
      else return;
      e.preventDefault();
    });

    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (w === this.canvas.width && h === this.canvas.height && this.trace) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.dpr = dpr;
    this.buildTrace();
    this.draw(this.t);
  }

  buildTrace() {
    const { width: w, height: h } = this.canvas;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    const dpr = this.dpr;
    const mid = h * 0.46;
    const amp = h * 0.36 / MERGER.ampM;

    // phase dividers
    g.font = `${10 * dpr}px "IBM Plex Mono", ui-monospace, monospace`;
    g.textBaseline = 'bottom';
    for (const m of MARKS) {
      const x = tToX(m.t) * w;
      g.fillStyle = 'rgba(236, 230, 218, 0.12)';
      g.fillRect(Math.round(x), 0, dpr, h);
      g.fillStyle = 'rgba(236, 230, 218, 0.42)';
      g.fillText(m.label.toUpperCase(), x + 5 * dpr, h - 2 * dpr);
    }
    g.fillStyle = 'rgba(236, 230, 218, 0.08)';
    g.fillRect(0, Math.round(mid), w, dpr);

    // waveform: sample densely so the fast final cycles stay crisp
    g.lineWidth = 1.25 * dpr;
    g.lineJoin = 'round';
    g.strokeStyle = '#8fb0ff';
    g.beginPath();
    const n = w * 4;
    for (let i = 0; i <= n; i++) {
      const t = xToT(i / n);
      const y = mid - strain(t) * amp;
      if (i === 0) g.moveTo(0, y);
      else g.lineTo((i / n) * w, y);
    }
    g.stroke();
    this.trace = off;
  }

  draw(t) {
    this.t = t;
    if (!this.trace) return;
    const { ctx } = this;
    const { width: w, height: h } = this.canvas;
    const x = tToX(t) * w;
    ctx.clearRect(0, 0, w, h);
    // the future dimmed, the past lit
    ctx.globalAlpha = 0.28;
    ctx.drawImage(this.trace, 0, 0);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, x, h);
    ctx.clip();
    ctx.drawImage(this.trace, 0, 0);
    ctx.restore();
    ctx.fillStyle = '#ffb45a';
    ctx.fillRect(Math.round(x - this.dpr), 0, 2 * this.dpr, h);
    this.canvas.setAttribute('aria-valuenow', t.toFixed(1));
  }
}
