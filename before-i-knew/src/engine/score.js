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

// --- Leitmotifs -----------------------------------------------------------
// Ahmad's theme: a short phrase in Bayati on D, as [freq, beats]. It climbs
// from A to D, leans on the half-flat E, rises to F, and falls home.
const THEME = [
  [N.A3, 1], [N.D4, 1.5], [N.Ed4, 0.5], [N.F4, 2],
  [N.Ed4, 0.5], [N.D4, 0.5], [N.C4, 0.5], [N.Bb3, 0.5], [N.A3, 1], [N.D4, 3],
];
const D2 = N.D3 / 2;
const A2 = N.A3 / 2;
const G2 = N.G3 / 2;
// the oud beneath it: [beat, freq, vol]
const THEME_OUD = [[0, D2, 1], [2, A2, 0.7], [3.5, D2, 0.6], [5, G2, 0.7], [7, A2, 0.7], [9, D2, 1], [11, D2 * 2, 0.5]];
const E_NAT = 329.63;
const FS4 = 369.99;
const CS4 = 277.18;
const B3 = 246.94;

const beatsOf = (list) => list.reduce((a, [, b]) => a + b, 0);

// The motif plans: each returns { tempo, ney: [[beat, freq, beats, vol, bright]],
// oud: [[beat, freq, vol, bright]] } (vol relative to the base levels below).
function plan(name) {
  const ney = [];
  const oud = [];
  const theme = (at, { f = (x) => x, v = 1, bright = 1, from = 0, to = THEME.length, harm = 0 } = {}) => {
    let b = at;
    THEME.forEach(([freq, d], i) => {
      if (i >= from && i < to) {
        ney.push([b, f(freq, i), d, v, bright]);
        if (harm) ney.push([b, f(freq, i) * 0.75, d, v * harm, bright * 0.6]);
      }
      b += d;
    });
    return b;
  };
  const themeOud = (at, v = 1, bright = 1) => THEME_OUD.forEach(([b, f, k]) => oud.push([at + b, f, k * v, bright]));
  const len = beatsOf(THEME);
  switch (name) {
    case 'ahmad':
      theme(0);
      themeOud(0);
      return { tempo: 0.85, ney, oud };
    case 'ahmad-soft': // as it surfaces in a memory: the oud leads, the ney only half-there
      theme(0, { v: 0.5, bright: 0.7 });
      themeOud(0, 0.8);
      return { tempo: 0.9, ney, oud };
    case 'ending1': // the Witness: sparse, open, ending on the fifth
      for (const [b, f, d, v] of [[0, N.A3, 4, 1], [6, N.D4, 4, 0.9], [12, N.Ed4, 2, 0.7], [14.5, N.F4, 4, 0.9], [21, N.A3, 7, 0.8]]) ney.push([b, f, d, v, 0.8]);
      oud.push([0, D2, 1, 0.7], [14, A2, 0.8, 0.7], [21, D2, 0.7, 0.6]);
      return { tempo: 1.0, ney, oud };
    case 'ending2': { // the Last Farewell: the whole theme, warm, twice, with a fourth below the second time
      theme(0, { v: 0.9 });
      themeOud(0);
      const at = len + 2;
      theme(at, { v: 1, harm: 0.55, bright: 1.2 });
      themeOud(at, 1.1, 1.2);
      for (let b = 0; b < len; b += 1) if (b % 2 === 1) oud.push([at + b, D2 * 2, 0.35, 1.2]); // a gentle second line
      for (const [i, f] of [N.D3, N.A3, N.D4].entries()) oud.push([at + len + 0.15 * i, f, 0.6, 1.4]);
      return { tempo: 0.88, ney, oud, gain: 0.65 };
    }
    case 'ending3': { // the Tunnel: fragments, low, fading into the dark
      const lo = (f) => f * 0.5;
      const frag = (at, from, to, v) => theme(at, { f: lo, v, bright: 0.45, from, to });
      frag(0, 0, 2, 0.9);
      frag(9, 3, 5, 0.65);
      frag(20, 1, 2, 0.45);
      frag(33, 8, 10, 0.3);
      ney.push([48, N.A3 * 0.5, 6, 0.18, 0.4]);
      for (const [b, v] of [[0, 0.8], [9, 0.55], [20, 0.4], [33, 0.25], [48, 0.12]]) oud.push([b, D2, v, 0.5]);
      return { tempo: 0.95, ney, oud };
    }
    case 'ending4': { // the One Who Remains: the theme, brightening into something nearly major
      const major = (p) => (f, i) => {
        if (p >= 1 && Math.abs(f - N.Ed4) < 1) return E_NAT;
        if (p >= 2) {
          if (Math.abs(f - N.F4) < 1) return FS4;
          if (Math.abs(f - N.C4) < 1) return CS4;
          if (Math.abs(f - N.Bb3) < 1) return B3;
        }
        return f;
      };
      let at = 0;
      for (let p = 0; p < 3; p++) {
        theme(at, { f: major(p), v: 0.8 + p * 0.2, bright: 0.8 + p * 0.5 });
        themeOud(at, 0.8 + p * 0.2, 0.8 + p * 0.4);
        at += len + 1.5;
      }
      // the last D rises to a held chord
      const fin = at - len - 1.5 + len - 3;
      for (const f of [N.D4, FS4, N.A3 * 2]) ney.push([fin + 3, f, 6, 0.55, 1.6]);
      for (const [i, f] of [N.D3, N.A3, N.D4, FS4].entries()) oud.push([fin + 3 + i * 0.12, f, 0.55, 1.6]);
      return { tempo: 0.85, ney, oud, gain: 0.65 };
    }
    case 'ending5': { // the Wolf's Hour: very quiet, over the pitch the azan ends on
      theme(0, { v: 0.45, bright: 0.5 });
      ney.push([0, N.D3, len + 5, 0.4, 0.3]); // the azan's D, held underneath
      oud.push([0, D2, 0.5, 0.5], [len, D2, 0.3, 0.5]);
      return { tempo: 1.1, ney, oud };
    }
  }
  return null;
}
// how loud the ney and the oud are at vol 1 (before the music setting)
const NEY_LEVEL = 0.1;
const OUD_LEVEL = 0.2;
// G flattened to G♭ for Saba (the colour of the evening)
const flat = (f) => {
  for (const k of [0.5, 1, 2]) if (Math.abs(f / (N.G3 * k) - 1) < 0.002) return f * 0.9439;
  return f;
};

const BEAT = 0.75; // seconds

export class Score {
  constructor(sound) {
    this.sound = sound;
    this.name = 'off';
    this.m = { ...MOODS.off };
    this.started = false;
    this.log = []; // for testing: [time, mood]
    this.saba = 0; // 1 once the evening moods have bent Bayati's G towards Saba's G♭
    this.chordI = 0;
    this.hushUntil = 0; // while a motif plays, no stray plucks or ney
    this.memoryDue = 0;
    this.motifLog = [];
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
    const saba = name === 'after' || name === 'silence' ? 1 : 0;
    if (name === 'memory') this.memoryDue = (this.sound.t || 0) + 12 + Math.random() * 8;
    this.apply(fade);
    if (saba !== this.saba) {
      this.saba = saba;
      this.retune(this.sound.t, 5);
    }
  }

  // Re-pitch the bass and pad for the current root, bending G to G♭ (Saba)
  // when the evening moods are on.
  retune(w, tc = 1.4) {
    if (!this.started) return;
    const bend = (f) => (this.saba ? flat(f) : f);
    const root = bend(ROOTS[this.rootI]);
    for (const [o, mult] of this.bassOsc) o.frequency.setTargetAtTime(root * mult, w, tc * 0.5);
    const chord = CHORDS[this.chordI];
    this.voices.forEach((pair, i) => pair.forEach((o) => o.frequency.setTargetAtTime(bend(chord[i]), w, tc)));
  }

  // Play one of Ahmad's motifs: 'ahmad' (the theme), 'ahmad-soft', or
  // 'ending1'…'ending5'. opts.vol scales it. Returns its length in seconds
  // (0 if it cannot play). It rides the score's own bus, so speech ducks it.
  motif(name, { vol = 1 } = {}) {
    const s = this.sound;
    if (!this.started || !s.ctx || s.ctx.state !== 'running') return 0;
    if (/^[1-5]$/.test(String(name))) name = 'ending' + name;
    const p = plan(name);
    if (!p) return 0;
    vol *= p.gain ?? 1;
    const t0 = s.t + 0.25;
    let end = 0;
    for (const [b, f, d, v, bright] of p.ney) {
      const dur = d * p.tempo * 0.97;
      s.neyNote(f, dur, NEY_LEVEL * v * vol, { when: t0 + b * p.tempo, dest: this.out, bright });
      end = Math.max(end, b * p.tempo + dur + 0.3);
    }
    for (const [b, f, v, bright] of p.oud) {
      s.pluck(f, t0 + b * p.tempo, OUD_LEVEL * v * vol, this.out, 700 + 1100 * bright);
      end = Math.max(end, b * p.tempo + 2);
    }
    this.phrase = null;
    this.hushUntil = t0 + end;
    this.motifLog.push([+t0.toFixed(2), name, +end.toFixed(1)]);
    return end;
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
      this.chordI = CHORD_FOR_ROOT[this.rootI];
      this.retune(w);
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
    if (m.pluck > 0 && !this.phrase && w > this.hushUntil && Math.random() < m.pluck * 0.18) {
      const len = 3 + Math.floor(Math.random() * 4);
      let i = 2 + m.reg * 2 + Math.floor(Math.random() * 3);
      const notes = [];
      for (let n = 0; n < len; n++) {
        notes.push(this.saba ? flat(SCALE[Math.max(0, Math.min(SCALE.length - 1, i))]) : SCALE[Math.max(0, Math.min(SCALE.length - 1, i))]);
        i += Math.random() < 0.6 ? -1 : 1;
      }
      notes.push(SCALE[m.reg >= 1 ? 7 : 0]); // resolve to D
      this.phrase = { notes, i: 0 };
    }
    if (this.phrase) {
      const { notes } = this.phrase;
      const f = notes[this.phrase.i++];
      const qanun = m.reg === 0 && Math.random() < 0.3;
      s.pluck(qanun ? f * 2 : f, w, this.phrase.vol ?? (qanun ? 0.1 : 0.2), this.out, qanun ? 3200 : 1700);
      if (Math.random() < 0.35) s.pluck(qanun ? f * 2 : f, w + BEAT / 2, 0.07, this.out, 1500);
      if (this.phrase.i >= notes.length) this.phrase = null;
    }
    // a breath of ney, rarely
    if (m.ney > 0 && inBar === 0 && w > this.hushUntil && Math.random() < m.ney) {
      const f = [N.A3, N.D4, N.F4, N.G3][Math.floor(Math.random() * 4)];
      s.ney(f, 6 + Math.random() * 4, 0.09, { when: w, dest: this.out });
    }
    // in a memory, Ahmad's theme surfaces now and then, softly
    if (this.name === 'memory' && inBar === 0 && s.t > this.memoryDue && w > this.hushUntil) {
      this.motif('ahmad-soft');
      this.memoryDue = s.t + 55 + Math.random() * 35;
    }
    // in the evening moods, a lone Saba turn: F, then the G♭ that gives it away
    if (this.saba && this.name === 'after' && inBar === 0 && !this.phrase && w > this.hushUntil && Math.random() < 0.05) {
      this.phrase = { notes: [N.F4, flat(N.G4), N.F4, N.Ed4, N.D4], i: 0, vol: 0.07 };
    }
  }
}
