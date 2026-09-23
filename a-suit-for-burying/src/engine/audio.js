// Procedural sound: wind, rain and river beds, foley (hooves, falls,
// thunder, snorts) and a sparse Western score played on a Karplus–Strong
// plucked string over a low drone. Nothing is sampled; it's all synthesis.

const NOTE = {
  E2: 82.41, G2: 98.0, A2: 110.0, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0,
  A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88,
};

// Score patterns: arrays of [note or null, beats]. Tempo in beats per minute.
const MOODS = {
  none: null,
  elegy: {
    bpm: 58,
    drone: 0.05,
    notes: [['E3', 1], ['B3', 1], ['E4', 1], ['G4', 2], ['Fs4', 1], ['E4', 1], ['B3', 2], [null, 1], ['D4', 1], ['B3', 1], ['A3', 1], ['G3', 2], ['E3', 3], [null, 2]],
  },
  tension: {
    bpm: 50,
    drone: 0.08,
    notes: [['E2', 2], [null, 2], ['F3', 1], ['E3', 3], [null, 2], ['B2', 2], [null, 4]],
  },
  ride: {
    bpm: 150,
    drone: 0.07,
    notes: [['E3', 0.5], ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['D4', 0.5], ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['E3', 0.5], ['E3', 0.5], ['G3', 0.5], ['E3', 0.5], ['A3', 0.5], ['G3', 0.5], ['D3', 0.5], ['E3', 0.5]],
  },
  storm: {
    bpm: 70,
    drone: 0.12,
    notes: [['E2', 1], [null, 1], ['E2', 1], ['F3', 1], [null, 4]],
  },
  resolve: {
    bpm: 52,
    drone: 0.05,
    notes: [['G3', 1], ['B3', 1], ['D4', 1], ['G4', 3], ['Fs4', 1], ['D4', 1], ['E4', 3], [null, 1], ['B3', 1], ['G3', 1], ['E3', 4], [null, 2]],
  },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.mood = 'none';
    this.plucks = new Map();
  }

  start() {
    if (this.ctx) return this.ctx.resume();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // A long synthetic hall for the score and distant thunder.
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb.buffer = ir;
    this.verbIn = ctx.createGain();
    this.verbIn.gain.value = 0.5;
    this.verbIn.connect(this.verb).connect(this.master);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.sfx.connect(this.verbIn);

    this.music = ctx.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.music.connect(this.verbIn);

    // White noise, shared by the ambience beds.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    const bed = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = nb;
      src.loop = true;
      src.playbackRate.value = 0.5 + Math.random() * 0.5;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      return { g, f };
    };
    this.beds = {
      wind: bed('bandpass', 420, 0.6),
      rain: bed('highpass', 1800, 0.4),
      river: bed('lowpass', 520, 0.8),
      fire: bed('bandpass', 2400, 3),
    };
    // Wind gusts: slow modulation of the band.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = 220;
    lfo.connect(lg).connect(this.beds.wind.f.frequency);
    lfo.start();

    // Drone for the score.
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    const df = ctx.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 260;
    this.droneGain.connect(df).connect(this.music);
    for (const [fr, type] of [[41.2, 'sawtooth'], [41.5, 'sawtooth'], [82.4, 'triangle']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.connect(this.droneGain);
      o.start();
    }

    this.step = 0;
    this.nextNote = ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 90);
    return Promise.resolve();
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMute(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.t, 0.1);
  }

  // Ambience levels, 0…1, eased.
  ambience(levels, time = 1.5) {
    if (!this.ctx) return;
    const scale = { wind: 0.35, rain: 0.22, river: 0.5, fire: 0.05 };
    for (const k in levels) {
      if (this.beds[k]) this.beds[k].g.gain.setTargetAtTime(levels[k] * scale[k], this.t, time / 3);
    }
  }

  setMood(m) {
    if (!this.ctx || this.mood === m) return;
    this.mood = m;
    this.step = 0;
    this.nextNote = Math.max(this.nextNote, this.t + 0.4);
    const mood = MOODS[m];
    this.droneGain.gain.setTargetAtTime(mood ? mood.drone : 0, this.t, 1.2);
  }

  schedule() {
    const mood = MOODS[this.mood];
    if (!mood) return;
    while (this.nextNote < this.t + 0.3) {
      const [n, beats] = mood.notes[this.step % mood.notes.length];
      if (n) this.pluck(NOTE[n], this.nextNote, this.mood === 'ride' ? 0.32 : 0.42);
      this.nextNote += (beats * 60) / mood.bpm;
      this.step++;
    }
  }

  // Karplus–Strong plucked string, rendered once per pitch and cached.
  pluck(freq, when = this.t, vol = 0.4) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    let buf = this.plucks.get(freq);
    if (!buf) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 3);
      buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      const N = Math.round(sr / freq);
      for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin((i / N) * Math.PI));
      for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1 < i ? i - N + 1 : i - N]) * 0.4985;
      this.plucks.set(freq, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    src.connect(tone).connect(g).connect(this.music);
    src.start(when);
  }

  noiseHit({ when = this.t, dur = 0.2, freq = 800, q = 1, type = 'bandpass', vol = 0.5, attack = 0.005, dest = this.sfx }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 3);
    src.stop(when + dur + 0.05);
  }

  thump(freq0, freq1, dur, vol, when = this.t) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(freq0, when);
    o.frequency.exponentialRampToValueAtTime(freq1, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.sfx);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  // ---- foley ----

  hoof(surface = 'dirt', vol = 0.5) {
    const v = vol * (0.8 + Math.random() * 0.4);
    if (surface === 'water') {
      this.noiseHit({ dur: 0.25, freq: 900, q: 0.7, vol: v * 0.5 });
      return;
    }
    this.thump(170 + Math.random() * 40, 55, 0.09, v * 0.9);
    this.noiseHit({ dur: surface === 'mud' ? 0.12 : 0.05, freq: surface === 'mud' ? 400 : 1800, q: 1.2, vol: v * (surface === 'wood' ? 0.9 : 0.5) });
  }

  fall() {
    this.thump(120, 38, 0.35, 0.9);
    this.noiseHit({ dur: 0.4, freq: 300, q: 0.6, vol: 0.6, type: 'lowpass' });
  }

  splash(vol = 0.7) {
    this.noiseHit({ dur: 0.9, freq: 1200, q: 0.5, vol, attack: 0.02 });
    this.noiseHit({ dur: 0.6, freq: 300, q: 0.6, vol: vol * 0.6, type: 'lowpass' });
  }

  thunder(strength = 1, delay = 0) {
    const w = this.t + delay;
    this.noiseHit({ when: w, dur: 0.25, freq: 2500, type: 'highpass', vol: 0.5 * strength, q: 0.3 });
    this.noiseHit({ when: w + 0.05, dur: 4.5, freq: 120, type: 'lowpass', vol: 1.0 * strength, q: 0.4, attack: 0.2 });
    this.noiseHit({ when: w + 0.6, dur: 3, freq: 70, type: 'lowpass', vol: 0.8 * strength, q: 0.4, attack: 0.4 });
  }

  snort(vol = 0.5) {
    this.noiseHit({ dur: 0.35, freq: 700, q: 2.5, vol, attack: 0.03 });
    this.noiseHit({ when: this.t + 0.12, dur: 0.3, freq: 500, q: 2, vol: vol * 0.6, attack: 0.02 });
  }

  // A distressed horse: a harsh, falling squeal.
  neigh(vol = 0.35) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const w = this.t;
    o.frequency.setValueAtTime(680, w);
    o.frequency.linearRampToValueAtTime(920, w + 0.18);
    o.frequency.exponentialRampToValueAtTime(380, w + 1.1);
    const vib = ctx.createOscillator();
    vib.frequency.value = 22;
    const vg = ctx.createGain();
    vg.gain.value = 40;
    vib.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1400;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, w);
    g.gain.linearRampToValueAtTime(vol, w + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, w + 1.2);
    o.connect(f).connect(g).connect(this.sfx);
    o.start(w);
    vib.start(w);
    o.stop(w + 1.3);
    vib.stop(w + 1.3);
  }

  hammer() {
    this.thump(420, 180, 0.06, 0.4);
    this.noiseHit({ dur: 0.05, freq: 2600, q: 2, vol: 0.3 });
  }

  creak() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(90, this.t);
    o.frequency.linearRampToValueAtTime(140, this.t + 0.6);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.linearRampToValueAtTime(0.12, this.t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + 0.7);
    o.connect(f).connect(g).connect(this.sfx);
    o.start();
    o.stop(this.t + 0.75);
  }

  cough() {
    this.noiseHit({ dur: 0.18, freq: 900, q: 1.5, vol: 0.18, attack: 0.01 });
    this.noiseHit({ when: this.t + 0.28, dur: 0.16, freq: 850, q: 1.5, vol: 0.14, attack: 0.01 });
  }

  match() {
    this.noiseHit({ dur: 0.25, freq: 3000, q: 1, vol: 0.25, type: 'highpass' });
  }

  click() {
    this.noiseHit({ dur: 0.03, freq: 3200, q: 4, vol: 0.35 });
    this.thump(900, 400, 0.03, 0.2);
  }

  // Short chord cue when a choice appears.
  sting() {
    [NOTE.E3, NOTE.B3, NOTE.G4].forEach((f, i) => this.pluck(f, this.t + i * 0.06, 0.3));
  }
}
