// A light generative score in maqam Bayati on D: a deep sub-bass that swells
// slowly, a soft pad in open fifths, and now and then an oud or qanun phrase
// or a breath of ney. The story sets a mood; the score eases into it.
//
// All of it runs through the Sound's music bus, so the Music volume setting
// applies. It steps back under speech and blasts (duck / speak).

import { BAYATI as N } from './audio.js';

// Bass roots (Hz): D1, A1, G1, Bb1, C2.
const ROOTS = [36.71, 55.0, 49.0, 58.27, 65.41];
// Pad voicings: open fifths and fourths over Bayati's degrees.
const CHORDS = [
  [N.D3 / 2, N.A3 / 2, N.D3],
  [N.G3 / 2, N.D3, N.G3],
  [N.Bb3 / 2, N.F3, N.Bb3],
  [N.C4 / 2, N.G3, N.C4],
  [N.D3 / 2, N.A3 / 2, N.F3],
];
// Melody notes for plucks, low to high, with the half-flat second.
const SCALE = [N.D3, N.Eb3, N.F3, N.G3, N.A3, N.Bb3, N.C4, N.D4, N.Ed4, N.F4, N.G4];
// Which chord goes with which root.
const CHORD_FOR_ROOT = [0, 4, 1, 2, 3];

export const MOODS = {
  off: { bass: 0, pad: 0, pluck: 0, ney: 0, pulse: 0, cutoff: 600, reg: 0 },
  title: { bass: 0.5, pad: 0.3, pluck: 0.18, ney: 0.04, pulse: 0, cutoff: 900, reg: 0 },
  walk: { bass: 0.55, pad: 0.34, pluck: 0.3, ney: 0.05, pulse: 0, cutoff: 1150, reg: 1 },
  hour: { bass: 0.7, pad: 0.22, pluck: 0.13, ney: 0.07, pulse: 0, cutoff: 760, reg: 0 },
  danger: { bass: 0.85, pad: 0, pluck: 0, ney: 0, pulse: 0.9, cutoff: 500, reg: 0 },
  memory: { bass: 0.45, pad: 0.42, pluck: 0.7, ney: 0, pulse: 0, cutoff: 1500, reg: 2 },
  silence: { bass: 0, pad: 0, pluck: 0, ney: 0, pulse: 0, cutoff: 500, reg: 0 },
  dusk: { bass: 0.6, pad: 0.3, pluck: 0.08, ney: 0.1, pulse: 0, cutoff: 700, reg: 0 },
  tense: { bass: 0.75, pad: 0.06, pluck: 0, ney: 0, pulse: 0.4, cutoff: 540, reg: 0 },
  after: { bass: 0.62, pad: 0.12, pluck: 0, ney: 0, pulse: 0, cutoff: 600, reg: 0 },
};

const BEAT = 0.75; // seconds

export class Score {
  constructor(sound) {
    this.sound = sound;
    this.name = 'off';
    this.m = { ...MOODS.off };
    this.started = false;
    this.log = []; // for testing: [time, mood]
  }

  start() {
    const s = this.sound;
    if (this.started || !s.ctx) return;
    this.started = true;
    const ctx = s.ctx;
    const w = ctx.currentTime;

    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1;
    this.out.connect(this.duckGain).connect(s.music);
    s.onDuck = (amount, time) => this.duck(amount, time);

    // --- deep bass: a sine with its 2nd and 3rd harmonics, so small
    // speakers still carry the note
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0;
    const bf = ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.value = 220;
    this.bassGain.connect(bf).connect(this.out);
    this.bassOsc = [];
    for (const [mult, v] of [[1, 0.9], [2, 0.32], [3, 0.1]]) {
      const o = ctx.createOscillator();
      o.frequency.value = ROOTS[0] * mult;
      const g = ctx.createGain();
      g.gain.value = v;
      o.connect(g).connect(this.bassGain);
      o.start(w);
      this.bassOsc.push([o, mult]);
    }
    // a slow breath in the bass
    this.swell = ctx.createGain();
    this.swell.gain.value = 1;
    this.bassGain.disconnect();
    this.bassGain.connect(this.swell).connect(bf);

    // --- pad: three voices of detuned triangles through a drifting lowpass
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 0.6;
    this.padGain.connect(this.padFilter).connect(this.out);
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.05;
    const dg = ctx.createGain();
    dg.gain.value = 180;
    drift.connect(dg).connect(this.padFilter.frequency);
    drift.start(w);
    this.voices = CHORDS[0].map((f) => {
      const pair = [-4, 4].map((cents) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = cents;
        o.start(w);
        return o;
      });
      const g = ctx.createGain();
      g.gain.value = 0.32;
      for (const o of pair) o.connect(g);
      g.connect(this.padGain);
      return pair;
    });

    this.pulseGain = ctx.createGain();
    this.pulseGain.gain.value = 1;
    this.pulseGain.connect(this.out);

    this.next = w + 0.2;
    this.beat = 0;
    this.rootI = 0;
    this.timer = setInterval(() => this.schedule(), 100);
    this.apply(3);
  }

  // Ease into a mood over `fade` seconds.
  mood(name, fade = 4) {
    if (!MOODS[name]) return;
    this.name = name;
    this.m = { ...MOODS[name] };
    this.log.push([+(this.sound.t || 0).toFixed(2), name]);
    this.apply(fade);
  }

  apply(fade) {
    if (!this.started) return;
    const t = this.sound.t;
    const k = Math.max(0.05, fade / 3);
    this.bassGain.gain.setTargetAtTime(this.m.bass * 0.45, t, k);
    this.padGain.gain.setTargetAtTime(this.m.pad * 1.1, t, k);
    this.padFilter.frequency.setTargetAtTime(this.m.cutoff, t, k);
  }

  // Cut to silence at once (the flashback ends), then ease into `then`.
  cut(then = 'hour', after = 2.5) {
    if (!this.started) return;
    const t = this.sound.t;
    for (const g of [this.bassGain.gain, this.padGain.gain]) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
    }
    this.m = { ...MOODS.silence };
    this.name = 'silence';
    clearTimeout(this.cutTimer);
    this.cutTimer = setTimeout(() => this.mood(then, 6), after * 1000);
  }

  // Step back: amount 0…1 of the level, for `time` seconds.
  duck(amount = 0.6, time = 2.5) {
    if (!this.started) return;
    const t = this.sound.t;
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(1 - amount, t, 0.05);
    g.setTargetAtTime(1, t + time, time / 3);
  }

  // Under dialogue the score sits about 4 dB lower.
  speak(dur) {
    if (!this.started) return;
    const t = this.sound.t;
    const g = this.duckGain.gain;
    if (g.value < 0.6) return; // a blast duck is stronger; leave it
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.62, t, 0.15);
    g.setTargetAtTime(1, t + dur, 0.8);
  }

  schedule() {
    const s = this.sound;
    if (!s.ctx || s.ctx.state !== 'running') return;
    const now = s.t;
    if (this.next < now - 1) this.next = now + 0.05; // after a pause
    while (this.next < now + 0.35) {
      this.step(this.next, this.beat);
      this.next += BEAT;
      this.beat++;
    }
  }

  step(w, beat) {
    const s = this.sound;
    const m = this.m;
    const bar = Math.floor(beat / 4);
    const inBar = beat % 4;

    // harmony moves every 4 bars (12 s), sometimes staying put
    if (inBar === 0 && bar % 4 === 0 && beat > 0 && Math.random() < 0.75) {
      this.rootI = [0, 0, 1, 2, 3, 4, 0, 2][Math.floor(Math.random() * 8)];
      const root = ROOTS[this.rootI];
      for (const [o, mult] of this.bassOsc) o.frequency.setTargetAtTime(root * mult, w, 0.6);
      const chord = CHORDS[CHORD_FOR_ROOT[this.rootI]];
      this.voices.forEach((pair, i) => pair.forEach((o) => o.frequency.setTargetAtTime(chord[i], w, 1.4)));
    }
    // the bass breathes over 8 beats
    if (inBar === 0 && bar % 2 === 0) {
      const g = this.swell.gain;
      g.setTargetAtTime(1, w, 1.2);
      g.setTargetAtTime(0.55, w + BEAT * 4, 1.6);
    }
    // danger: a low pulse, like a held heartbeat
    if (m.pulse > 0 && (inBar === 0 || inBar === 2)) {
      const ctx = s.ctx;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(52, w);
      o.frequency.exponentialRampToValueAtTime(36, w + 0.35);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, w);
      g.gain.exponentialRampToValueAtTime(0.5 * m.pulse * (inBar === 0 ? 1 : 0.6), w + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, w + 0.5);
      o.connect(g).connect(this.pulseGain);
      o.start(w);
      o.stop(w + 0.55);
    }
    // plucks: short phrases that start on the chord and step through the maqam
    if (m.pluck > 0 && !this.phrase && Math.random() < m.pluck * 0.18) {
      const len = 3 + Math.floor(Math.random() * 4);
      let i = 2 + m.reg * 2 + Math.floor(Math.random() * 3);
      const notes = [];
      for (let n = 0; n < len; n++) {
        notes.push(SCALE[Math.max(0, Math.min(SCALE.length - 1, i))]);
        i += Math.random() < 0.6 ? -1 : 1;
      }
      notes.push(SCALE[m.reg >= 1 ? 7 : 0]); // resolve to D
      this.phrase = { notes, i: 0 };
    }
    if (this.phrase) {
      const { notes } = this.phrase;
      const f = notes[this.phrase.i++];
      const qanun = m.reg === 0 && Math.random() < 0.3;
      s.pluck(qanun ? f * 2 : f, w, qanun ? 0.1 : 0.2, this.out, qanun ? 3200 : 1700);
      if (Math.random() < 0.35) s.pluck(qanun ? f * 2 : f, w + BEAT / 2, 0.07, this.out, 1500);
      if (this.phrase.i >= notes.length) this.phrase = null;
    }
    // a breath of ney, rarely
    if (m.ney > 0 && inBar === 0 && Math.random() < m.ney) {
      const f = [N.A3, N.D4, N.F4, N.G3][Math.floor(Math.random() * 4)];
      s.ney(f, 6 + Math.random() * 4, 0.09, { when: w, dest: this.out });
    }
  }
}
