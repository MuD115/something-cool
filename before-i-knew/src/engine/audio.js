// Procedural sound for a besieged town. Nothing is sampled.
//
// Buses: ambience + effects → world (lowpass "muffle" for shock and grief)
//        music (ney and oud) → master, beside the world bus
// Settings drive master / music / effects volumes.

const LIFE = ['dogFar', 'dogFar', 'childrenFar', 'tinCreak', 'rubbleSettle', 'doorFar', 'motorbikeFar'];

export const BAYATI = {
  // D Bayati with its half-flat second (E↓), in Hz.
  D3: 146.83, Eb3: 151.1, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, C4: 261.63, D4: 293.66, Ed4: 318.0, F4: 349.23, G4: 392.0,
};

export class Sound {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.loops = {};
  }

  start() {
    if (this.ctx) return this.ctx.resume();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    // a limiter after it, so big blasts stay full without clipping
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -2;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.002;
    lim.release.value = 0.12;
    this.master.connect(comp).connect(lim).connect(ctx.destination);

    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 18000;
    this.muffle.Q.value = 0.4;
    this.world = ctx.createGain();
    this.world.connect(this.muffle).connect(this.master);

    this.fx = ctx.createGain();
    this.amb = ctx.createGain();
    this.fx.connect(this.world);
    this.amb.connect(this.world);

    // A street between concrete walls: hard early slaps off the facing
    // buildings (different on each side), then a tail that darkens as it
    // dies away.
    this.verb = ctx.createConvolver();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 2.4);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const n = Math.random() * 2 - 1;
        const cut = 0.55 - 0.45 * k; // one-pole lowpass closing over the tail
        lp += cut * (n - lp);
        d[i] = lp * Math.pow(1 - k, 3.2) * (i < 600 ? i / 600 : 1) * 0.8;
      }
      const slaps = ch ? [0.043, 0.071, 0.118, 0.19] : [0.052, 0.088, 0.131, 0.21];
      slaps.forEach((tt, j) => {
        const at = Math.floor(tt * sr);
        for (let i = 0; i < 90; i++) d[at + i] += (Math.random() * 2 - 1) * 0.55 * Math.pow(0.72, j) * (1 - i / 90);
      });
    }
    this.verb.buffer = ir;
    this.verbIn = ctx.createGain();
    this.verbIn.gain.value = 0.35;
    this.verbIn.connect(this.verb).connect(this.world);
    this.fx.connect(this.verbIn);

    this.music = ctx.createGain();
    this.music.connect(this.master);
    const mverb = ctx.createGain();
    mverb.gain.value = 0.5;
    this.music.connect(mverb).connect(this.verb);

    // Tinnitus, for after the blasts and the news.
    this.ring = ctx.createOscillator();
    this.ring.frequency.value = 4100;
    this.ringGain = ctx.createGain();
    this.ringGain.gain.value = 0;
    this.ring.connect(this.ringGain).connect(this.master);
    this.ring.start();

    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // brown noise for rumbles
    const bb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const bd = bb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bd.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      bd[i] = last * 3.5;
    }
    this.brownBuf = bb;

    this.buildBeds();
    this.applyVolumes();
    this.score?.start();
    this.settings.onChange(() => this.applyVolumes());
    return Promise.resolve();
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    this.master.gain.setTargetAtTime(s.get('master'), this.t, 0.05);
    this.music.gain.setTargetAtTime(s.get('music') * 0.6, this.t, 0.05);
    this.fx.gain.setTargetAtTime(s.get('effects'), this.t, 0.05);
    this.amb.gain.setTargetAtTime(s.get('effects') * 0.9, this.t, 0.05);
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  // ---------------------------------------------------------------- beds --

  noiseSrc(buf = this.noiseBuf) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(0, Math.random() * 3);
    return s;
  }

  buildBeds() {
    const ctx = this.ctx;
    // source → filter → mod (anything that wobbles, around 1) → level g.
    // Modulators only ever touch `mod`, never the level, so a bed at level 0
    // is truly silent. (A modulator wired into the level gain adds to it and
    // leaks: that was the pulsing "helicopter" under everything.)
    const bed = (src, type, freq, q) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const mod = ctx.createGain();
      mod.gain.value = 1;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(mod).connect(g).connect(this.amb);
      return { g, f, mod };
    };
    this.beds = {
      wind: bed(this.noiseSrc(), 'bandpass', 500, 0.5),
      air: bed(this.noiseSrc(this.brownBuf), 'lowpass', 180, 0.5),
      traffic: bed(this.noiseSrc(this.brownBuf), 'lowpass', 420, 0.7),
      crowd: bed(this.noiseSrc(), 'bandpass', 700, 1.4),
    };
    // Gusts through broken windows.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg).connect(this.beds.wind.f.frequency);
    lfo.start();
    // Gusts: the wind swells and falls on a slow, uneven cycle, and on the
    // strong ones a thin whistle comes through the broken windows.
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.11;
    const gust2 = ctx.createOscillator();
    gust2.frequency.value = 0.043;
    const gg = ctx.createGain();
    gg.gain.value = 0.35;
    gust.connect(gg);
    gust2.connect(gg);
    gg.connect(this.beds.wind.mod.gain);
    gust.start();
    gust2.start();
    const whistle = ctx.createBiquadFilter();
    whistle.type = 'bandpass';
    whistle.frequency.value = 1750;
    whistle.Q.value = 14;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    const wlfo = ctx.createGain();
    wlfo.gain.value = 0.22;
    const rect = ctx.createWaveShaper(); // only the peaks of the gusts
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.max(0, (i / 255) * 2 - 1.3) * 3;
    rect.curve = curve;
    gust.connect(rect).connect(wlfo).connect(wg.gain);
    this.noiseSrc().connect(whistle).connect(wg).connect(this.beds.wind.mod);
    // Murmuring voices: syllable-rate amplitude flutter.
    const syl = ctx.createOscillator();
    syl.frequency.value = 3.3;
    const sg = ctx.createGain();
    sg.gain.value = 0.4;
    syl.connect(sg).connect(this.beds.crowd.mod.gain);
    syl.start();

    // A generator in a basement: a steady low hum through walls, sagging
    // slowly under load. (No fast modulation: that reads as rotor blades.)
    const gen = ctx.createGain();
    gen.gain.value = 0;
    const gf = ctx.createBiquadFilter();
    gf.type = 'lowpass';
    gf.frequency.value = 180;
    gf.Q.value = 0.3;
    const gv = ctx.createGain();
    gv.gain.value = 1;
    gv.connect(gf).connect(gen).connect(this.amb);
    for (const [f, type, v] of [[50, 'triangle', 0.14], [100, 'sine', 0.06], [150, 'sine', 0.025]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = v;
      o.connect(og).connect(gv);
      o.start();
    }
    for (const [rate, depth] of [[0.23, 0.12], [0.071, 0.1]]) {
      const sag = ctx.createOscillator();
      sag.frequency.value = rate;
      const sg2 = ctx.createGain();
      sg2.gain.value = depth;
      sag.connect(sg2).connect(gv.gain);
      sag.start();
    }
    this.beds.generator = { g: gen };
  }

  // Distant life: now and then, something far off in the town. level 0…1
  // sets how often; the game's lifeGate says when it's allowed (the street,
  // not paused, not in a memory).
  life(level) {
    this.lifeLevel = level;
    if (this.lifeTimer || !this.ctx) return;
    this.lifeTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || !(this.lifeLevel > 0)) return;
      if (this.lifeGate && !this.lifeGate()) return;
      if (Math.random() > this.lifeLevel * 0.16) return;
      const pick = LIFE[Math.floor(Math.random() * LIFE.length)];
      this[pick]((Math.random() * 2 - 1) * 0.85);
    }, 1000);
  }

  dogFar(pan) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const w = this.t + i * (0.32 + Math.random() * 0.15);
      this.noise({ when: w, dur: 0.14, freq: 700 + Math.random() * 120, q: 3, vol: 0.05, dest: this.amb, pan, sweep: 520 });
      this.tone(420 + Math.random() * 60, 0.12, { when: w, type: 'sawtooth', vol: 0.006, to: 300, dest: this.amb, pan });
    }
  }

  childrenFar(pan) {
    // voices too far to make out: syllables of filtered breath
    let w = this.t;
    const n = 6 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const f = 1100 + Math.random() * 900;
      this.noise({ when: w, dur: 0.08 + Math.random() * 0.12, freq: f, q: 5, vol: 0.012 + Math.random() * 0.01, dest: this.amb, pan, sweep: f * (0.8 + Math.random() * 0.4) });
      w += 0.1 + Math.random() * 0.18;
    }
  }

  tinCreak(pan) {
    this.tone(170 + Math.random() * 40, 0.9, { type: 'sawtooth', vol: 0.006, to: 240, attack: 0.2, dest: this.amb, pan });
    this.noise({ dur: 0.9, freq: 2400, q: 6, vol: 0.012, attack: 0.3, dest: this.amb, pan, sweep: 2900 });
  }

  rubbleSettle(pan) {
    this.noise({ dur: 0.6, freq: 260, type: 'lowpass', vol: 0.05, attack: 0.05, buf: this.brownBuf, dest: this.amb, pan });
    for (let i = 0; i < 5; i++) this.noise({ when: this.t + 0.1 + Math.random() * 0.8, dur: 0.04, freq: 1500 + Math.random() * 2000, q: 3, vol: 0.025, dest: this.amb, pan });
  }

  doorFar(pan) {
    this.noise({ dur: 0.25, freq: 420, type: 'lowpass', vol: 0.07, dest: this.amb, pan });
    this.tone(95, 0.2, { vol: 0.05, to: 60, dest: this.amb, pan });
  }

  motorbikeFar(pan) {
    // a two-stroke somewhere across town, passing: its pitch rises and falls
    const ctx = this.ctx;
    const w = this.t;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(62, w);
    o.frequency.linearRampToValueAtTime(96, w + 2.2);
    o.frequency.linearRampToValueAtTime(70, w + 4.5);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, w);
    g.gain.exponentialRampToValueAtTime(0.018, w + 2);
    g.gain.exponentialRampToValueAtTime(0.0001, w + 4.6);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(f).connect(g);
    if (p) {
      p.pan.setValueAtTime(pan, w);
      p.pan.linearRampToValueAtTime(-pan, w + 4.5);
      g.connect(p).connect(this.amb);
    } else g.connect(this.amb);
    o.start(w);
    o.stop(w + 4.7);
  }

  ambience(levels, time = 1.2) {
    if (!this.ctx) return;
    const scale = { wind: 0.3, air: 0.35, traffic: 0.5, crowd: 0.12, generator: 0.12 };
    for (const k in levels) this.beds[k]?.g.gain.setTargetAtTime((levels[k] || 0) * scale[k], this.t, time / 3);
  }

  // Grief and shock close the world in: 0 = clear, 1 = underwater.
  setMuffle(amount, time = 1.2) {
    if (!this.ctx) return;
    const f = 18000 * Math.pow(350 / 18000, amount);
    this.muffle.frequency.setTargetAtTime(f, this.t, time / 3);
  }

  ringing(level, time = 0.3) {
    if (!this.ctx) return;
    this.ringGain.gain.setTargetAtTime(level * 0.03, this.t, time);
  }

  // ------------------------------------------------------------- one-shots --

  // A stereo position for a world x, relative to where the camera looks.
  panFor(x) {
    return Math.max(-1, Math.min(1, (x - (this.listenerX ?? x)) / 900));
  }

  // Route through a panner when a position is given.
  out(dest, pan) {
    if (pan == null || !this.ctx.createStereoPanner) return dest;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    return p;
  }

  noise({ when = this.t, dur = 0.2, freq = 800, q = 1, type = 'bandpass', vol = 0.5, attack = 0.005, buf, dest = this.fx, sweep, pan }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf || this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, when);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, when + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(this.out(dest, pan));
    src.start(when, Math.random() * 3);
    src.stop(when + dur + 0.05);
  }

  tone(freq, dur, { when = this.t, type = 'sine', vol = 0.3, to, dest = this.fx, attack = 0.005, pan } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (to) o.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.out(dest, pan));
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  // A footstep in two parts: the heel's thud and the toe's scuff a moment
  // later, coloured by what's underfoot. Crouched steps are soft, rolled
  // and close, with a whisper of cloth.
  step(surface = 'grit', vol = 0.18, { pan, crouch = false } = {}) {
    if (!this.ctx) return;
    const v = vol * (0.75 + Math.random() * 0.45);
    const w = this.t;
    const o = { pan };
    if (surface === 'wood' || surface === 'hollow') {
      this.tone(150 + Math.random() * 20, 0.08, { when: w, vol: v * 0.9, to: 80, ...o });
      this.noise({ when: w + 0.05, dur: 0.05, freq: 1800, q: 1, vol: v * 0.35, ...o });
      return;
    }
    const soft = crouch ? 0.55 : 1;
    // heel: low thump through the sole
    this.tone(95 + Math.random() * 25, 0.07, { when: w, vol: v * 0.55 * soft, to: 55, ...o });
    this.noise({ when: w, dur: 0.05, freq: 900, q: 0.8, vol: v * 0.5 * soft, ...o });
    // toe: the grit crunch
    const crunch = surface === 'rubble' ? 1500 : 2800;
    this.noise({ when: w + (crouch ? 0.09 : 0.055), dur: crouch ? 0.11 : 0.07, freq: crunch + Math.random() * 500, q: 0.9, vol: v * 0.8 * soft, ...o });
    if (surface === 'rubble' && Math.random() < 0.5) {
      // a loose stone knocked
      this.noise({ when: w + 0.08 + Math.random() * 0.06, dur: 0.04, freq: 2600 + Math.random() * 1500, q: 4, vol: v * 0.45, ...o });
    }
    if (crouch) this.noise({ when: w + 0.02, dur: 0.22, freq: 2200, q: 0.5, vol: v * 0.12, attack: 0.06, ...o });
  }

  land(vol = 0.35) {
    this.tone(110, 0.15, { vol, to: 50 });
    this.noise({ dur: 0.2, freq: 1200, q: 0.7, vol: vol * 0.6 });
  }

  cloth() {
    this.noise({ dur: 0.35, freq: 1800, q: 0.5, vol: 0.08, attack: 0.08 });
  }

  pigeons() {
    for (let i = 0; i < 9; i++) this.noise({ when: this.t + i * 0.06 + Math.random() * 0.03, dur: 0.06, freq: 900 + Math.random() * 500, q: 1.5, vol: 0.12 });
  }

  // Gunfire somewhere off: a single shot or a short burst, each report
  // followed by its slap echo off the buildings. Further away is duller.
  distantShot() {
    if (!this.ctx) return;
    const dist = 0.5 + Math.random() * 0.5; // 0.5 near … 1 far
    const pan = (Math.random() * 2 - 1) * 0.8;
    const burst = Math.random() < 0.35 ? 3 + Math.floor(Math.random() * 5) : 1;
    const gap = 0.09 + Math.random() * 0.05;
    const echo = 0.3 + Math.random() * 0.6;
    const bright = 3600 - dist * 2400;
    for (let i = 0; i < burst; i++) {
      const w = this.t + i * gap * (0.85 + Math.random() * 0.3);
      const v = (0.16 - dist * 0.07) * (0.8 + Math.random() * 0.3);
      this.noise({ when: w, dur: 0.07, freq: bright, q: 0.6, vol: v, pan });
      this.noise({ when: w + 0.01, dur: 0.9, freq: 260, type: 'lowpass', vol: v * 0.7, buf: this.brownBuf, pan });
      this.noise({ when: w + echo, dur: 0.12, freq: bright * 0.6, q: 0.8, vol: v * 0.35, pan: -pan * 0.6 });
    }
  }

  slosh() {
    this.noise({ dur: 0.4, freq: 600, q: 2, vol: 0.08, attack: 0.1, sweep: 300 });
  }

  squelch() {
    this.noise({ dur: 0.12, freq: 2200, q: 0.8, vol: 0.12 });
  }

  // Walkie-talkie static under a message of the given length.
  radio(dur = 2) {
    if (!this.ctx) return;
    this.squelch();
    const n = Math.floor(dur * 5);
    for (let i = 0; i < n; i++) this.noise({ when: this.t + 0.1 + i * 0.2, dur: 0.18, freq: 1600 + Math.random() * 900, q: 3, vol: 0.05 + Math.random() * 0.05 });
    this.noise({ when: this.t + dur, dur: 0.1, freq: 2400, q: 0.8, vol: 0.1 });
  }

  // A fighter jet passing low: a thin whine arrives first, then the tearing
  // roar with a Doppler drop as it goes over, a rumble that lingers, and the
  // air itself thumping as it passes. Pans across the stereo field.
  jetPass(dur = 9, over = 0.42) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.t;
    const tO = w + dur * over; // overhead
    const out = ctx.createGain();
    out.gain.value = 1;
    let dest = this.fx;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.9, w);
      pan.pan.linearRampToValueAtTime(0, tO);
      pan.pan.linearRampToValueAtTime(0.9, w + dur);
      pan.connect(this.fx);
      dest = pan;
    }
    out.connect(dest);
    this.duck(0.9, dur);
    // turbine whine: loud on approach, gone when it has passed
    const whine = ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(2300, w);
    whine.frequency.exponentialRampToValueAtTime(2700, tO - 0.2);
    whine.frequency.exponentialRampToValueAtTime(900, tO + 0.8);
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.Q.value = 14;
    wf.frequency.setValueAtTime(2300, w);
    wf.frequency.exponentialRampToValueAtTime(2700, tO - 0.2);
    wf.frequency.exponentialRampToValueAtTime(900, tO + 0.8);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, w);
    wg.gain.exponentialRampToValueAtTime(0.05, tO - 0.3);
    wg.gain.exponentialRampToValueAtTime(0.0001, tO + 1.4);
    whine.connect(wf).connect(wg).connect(out);
    whine.start(w);
    whine.stop(w + dur);
    // the roar: broadband noise swept down through the pass
    const roar = this.noiseSrc();
    const rf = ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.Q.value = 0.6;
    rf.frequency.setValueAtTime(2600, w);
    rf.frequency.exponentialRampToValueAtTime(1500, tO);
    rf.frequency.exponentialRampToValueAtTime(380, w + dur);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, w);
    rg.gain.exponentialRampToValueAtTime(0.12, tO - 1.2);
    rg.gain.exponentialRampToValueAtTime(0.75, tO + 0.15);
    rg.gain.exponentialRampToValueAtTime(0.25, tO + 2.2);
    rg.gain.exponentialRampToValueAtTime(0.0001, w + dur);
    roar.connect(rf).connect(rg).connect(out);
    roar.stop(w + dur);
    // the rumble that stays behind it
    const rum = this.noiseSrc(this.brownBuf);
    const uf = ctx.createBiquadFilter();
    uf.type = 'lowpass';
    uf.frequency.value = 140;
    const ug = ctx.createGain();
    ug.gain.setValueAtTime(0.0001, w);
    ug.gain.exponentialRampToValueAtTime(0.9, tO + 0.4);
    ug.gain.exponentialRampToValueAtTime(0.0001, w + dur);
    rum.connect(uf).connect(ug).connect(out);
    rum.stop(w + dur);
    // the thump of air as it goes over
    this.tone(48, 1.6, { when: tO, vol: 0.7, to: 28, attack: 0.05 });
  }

  // A missile strike beyond the rooftops: sharper than a barrel, shorter tail.
  strikeFar(delay = 0) {
    const w = this.t + delay;
    const brown = this.brownBuf;
    this.duck(1, 6);
    // the crack of it, off the buildings
    this.noise({ when: w, dur: 0.3, freq: 2400, type: 'lowpass', vol: 0.8, q: 0.3 });
    this.noise({ when: w, dur: 0.16, freq: 520, q: 0.5, vol: 0.7 });
    // the blast body, and a sub-bass punch felt in the chest
    this.noise({ when: w + 0.02, dur: 3.4, freq: 150, type: 'lowpass', vol: 1.5, q: 0.6, buf: brown, attack: 0.006 });
    this.tone(64, 1.7, { when: w, vol: 1.0, to: 26, attack: 0.008 });
    this.tone(40, 3.4, { when: w + 0.04, vol: 0.95, to: 22, attack: 0.02 });
    this.tone(30, 5, { when: w + 0.12, vol: 0.6, to: 19, attack: 0.25 }); // the ground shaking
    // its echo off the far blocks, then the long rolling rumble
    this.noise({ when: w + 0.42, dur: 2.4, freq: 240, type: 'lowpass', vol: 0.7, q: 0.5, buf: brown, attack: 0.02 });
    this.tone(48, 2, { when: w + 0.42, vol: 0.45, to: 28, attack: 0.02 });
    this.noise({ when: w + 0.5, dur: 7, freq: 85, type: 'lowpass', vol: 1.1, q: 0.5, buf: brown, attack: 0.4 });
    // debris and glass coming down for a long time after
    for (let i = 0; i < 16; i++) this.noise({ when: w + 0.5 + Math.random() * 3.5, dur: 0.05 + Math.random() * 0.05, freq: 1400 + Math.random() * 2400, q: 2, vol: 0.05 + Math.random() * 0.04 });
  }

  // Music steps back for blasts and speech: amount 0…1 of the music gain.
  duck(amount = 0.6, time = 2.5) {
    this.onDuck?.(amount, time);
  }

  // A barrel bomb somewhere else: the ground feels it before the ears do.
  barrelFar(delay = 0) {
    const w = this.t + delay;
    this.duck(0.95, 5);
    this.noise({ when: w, dur: 3.5, freq: 90, type: 'lowpass', vol: 1.0, q: 0.5, attack: 0.03, buf: this.brownBuf });
    this.noise({ when: w + 0.08, dur: 2.5, freq: 400, type: 'lowpass', vol: 0.35, q: 0.4, attack: 0.1 });
    this.tone(48, 1.8, { when: w, vol: 0.5, to: 28 });
  }

  // An incoming mortar: a thin falling whistle with air in it, dropping in
  // pitch as it comes down (Doppler), louder at the end.
  mortarWhistle(dur = 1.3, pan) {
    if (!this.ctx) return;
    const w = this.t;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1350, w);
    o.frequency.exponentialRampToValueAtTime(480, w + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, w);
    g.gain.exponentialRampToValueAtTime(0.03, w + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.11, w + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, w + dur + 0.02);
    o.connect(g).connect(this.out(this.fx, pan));
    o.start(w);
    o.stop(w + dur + 0.05);
    this.noise({ when: w, dur, freq: 1350, q: 9, vol: 0.05, attack: dur * 0.8, sweep: 500, pan });
  }

  mortarImpact(dist = 1, pan) {
    const v = 1 / Math.max(dist, 0.6);
    const o = { pan };
    this.duck(0.85, 3);
    this.noise({ dur: 0.2, freq: 2600, type: 'highpass', vol: 0.45 * v, q: 0.4, ...o });
    this.noise({ dur: 2.2, freq: 170, type: 'lowpass', vol: 1.0 * v, q: 0.5, buf: this.brownBuf, attack: 0.008, ...o });
    this.tone(72, 0.7, { vol: 0.6 * v, to: 32, ...o });
    this.tone(44, 1.4, { vol: 0.35 * v, to: 24, attack: 0.02 });
    // the slap off the buildings across the street, from the other side
    this.noise({ when: this.t + 0.18, dur: 0.5, freq: 900, q: 0.6, vol: 0.18 * v, pan: pan == null ? null : -pan * 0.7 });
    // a shower of grit, then pieces coming down for a while
    this.noise({ when: this.t + 0.15, dur: 1.4, freq: 3200, q: 0.5, vol: 0.05 * v, attack: 0.2, ...o });
    for (let i = 0; i < 14; i++) this.noise({ when: this.t + 0.3 + Math.random() * 1.8, dur: 0.05, freq: 1600 + Math.random() * 2400, q: 2, vol: 0.07 * v * Math.random(), ...o });
  }

  carAlarm(dur = 9) {
    if (!this.ctx) return;
    const w = this.t;
    for (let i = 0; i < dur * 2; i++) {
      this.tone(i % 2 ? 900 : 1150, 0.45, { when: w + i * 0.5, type: 'square', vol: 0.02 * (1 - i / (dur * 2)) });
    }
  }

  // The ney: breath, a wandering pitch and slow vibrato.
  ney(freq, dur, vol = 0.22, { when = this.t, dest = this.music } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = when;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, w);
    g.gain.linearRampToValueAtTime(vol, w + Math.min(2.5, dur * 0.3));
    g.gain.setValueAtTime(vol, w + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, w + dur);
    g.connect(dest);
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, w);
    vg.gain.linearRampToValueAtTime(freq * 0.008, w + dur * 0.5);
    vib.connect(vg).connect(o.frequency);
    const h = ctx.createOscillator();
    h.frequency.value = freq * 2;
    const hg = ctx.createGain();
    hg.gain.value = 0.18;
    h.connect(hg).connect(g);
    o.connect(g);
    // breath
    const b = this.noiseSrc();
    const bf = ctx.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.value = freq * 2;
    bf.Q.value = 3;
    const bg = ctx.createGain();
    bg.gain.value = 0.35;
    b.connect(bf).connect(bg).connect(g);
    for (const n of [o, vib, h]) {
      n.start(w);
      n.stop(w + dur);
    }
    b.stop(w + dur);
  }

  // Karplus–Strong oud pluck, cached per pitch.
  pluck(freq, when = this.t, vol = 0.35, dest = this.music, bright = 1900) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.plucks ||= new Map();
    let buf = this.plucks.get(freq);
    if (!buf) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 2.2);
      buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      const N = Math.round(sr / freq);
      for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
      for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1]) * 0.4975;
      this.plucks.set(freq, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = bright;
    src.connect(tone).connect(g).connect(dest);
    src.start(when);
  }

  // A slow phrase in maqam Bayati for the flashback. Returns a stop function.
  oudPhrase() {
    const N = BAYATI;
    const seq = [
      [N.D4, 0.5], [N.Ed4, 0.5], [N.F4, 1], [N.Ed4, 0.5], [N.D4, 1.5], [N.C4, 0.5], [N.Bb3, 0.5], [N.A3, 1], [N.G3, 1],
      [N.A3, 0.5], [N.Bb3, 0.5], [N.C4, 1], [N.Bb3, 0.5], [N.A3, 0.5], [N.G3, 1], [N.Eb3 * 1.94, 0.5], [N.D4, 2],
    ];
    let t = this.t + 0.3;
    const beat = 0.62;
    for (let rep = 0; rep < 3; rep++) {
      for (const [f, b] of seq) {
        this.pluck(f, t, 0.3);
        if (b >= 1) this.pluck(f, t + beat * 0.5, 0.12); // the oud's tremolo on long notes
        t += b * beat;
      }
    }
  }

  // Cut the music bus sharply (the flashback ends).
  cutMusic() {
    if (!this.ctx) return;
    const w = this.t;
    this.music.gain.cancelScheduledValues(w);
    this.music.gain.setValueAtTime(0, w);
    this.music.gain.setTargetAtTime(this.settings.get('music') * 0.6, w + 1.5, 0.3);
  }

  birds() {
    for (let i = 0; i < 5; i++) {
      const w = this.t + i * 0.13;
      this.tone(3200 + Math.random() * 600, 0.08, { when: w, vol: 0.03, to: 4200 });
    }
  }

  horn() {
    this.tone(420, 0.35, { type: 'square', vol: 0.015 });
    this.tone(530, 0.35, { type: 'square', vol: 0.012 });
  }

  // A sniper's warning shot, close: the supersonic crack arrives before the
  // report from the hill, then the round slaps into the wall ahead.
  sniperCrack() {
    if (!this.ctx) return;
    this.noise({ dur: 0.035, freq: 5200, q: 0.5, type: 'highpass', vol: 0.55 });
    this.noise({ when: this.t + 0.012, dur: 0.06, freq: 1400, q: 0.8, vol: 0.35 });
    // the chip of stone and the grit that follows it
    this.noise({ when: this.t + 0.03, dur: 0.12, freq: 900, q: 1.2, vol: 0.3 });
    for (let i = 0; i < 6; i++) this.noise({ when: this.t + 0.08 + i * 0.05 + Math.random() * 0.03, dur: 0.05, freq: 2600 + Math.random() * 1500, q: 2, vol: 0.05 });
    // the report, a beat later, rolling off the buildings
    this.noise({ when: this.t + 0.45, dur: 1.6, freq: 260, type: 'lowpass', vol: 0.22, buf: this.brownBuf });
    this.noise({ when: this.t + 0.45, dur: 0.12, freq: 1100, q: 0.7, vol: 0.1 });
    this.duck(0.5, 1.5);
  }

  // Swifts at dusk: thin screaming calls, a small party of them wheeling past.
  swifts() {
    if (!this.ctx) return;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const w = this.t + i * (0.09 + Math.random() * 0.12);
      const f = 5200 + Math.random() * 1400;
      this.tone(f, 0.16 + Math.random() * 0.1, { when: w, type: 'sawtooth', vol: 0.006, to: f * 0.82 });
      this.tone(f * 1.01, 0.14, { when: w + 0.01, vol: 0.012, to: f * 0.8 });
    }
  }

  // Someone pulls the starter cord on a generator, twice; the second catches.
  generatorStart(level = 0.5) {
    if (!this.ctx) return;
    for (const d of [0, 1.3]) {
      this.noise({ when: this.t + d, dur: 0.5, freq: 160, q: 1, vol: 0.12, attack: 0.02, sweep: 420 });
      this.tone(38, 0.5, { when: this.t + d, type: 'triangle', vol: 0.06, to: 62 });
    }
    setTimeout(() => this.ambience({ generator: level }, 2.5), 1500);
  }

  // The call to the sunset prayer from a minaret across town: a single voice,
  // long melismatic lines in Bayati, softened by distance and walls.
  adhanFar(vol = 0.1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = vol;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    const dl = ctx.createDelay(1);
    dl.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    out.connect(lp).connect(this.amb);
    lp.connect(dl).connect(fb).connect(dl);
    dl.connect(this.amb);
    const N = BAYATI;
    // phrase: (notes, each [freq, beats])
    const phrases = [
      [[N.A3, 3], [N.Bb3, 0.6], [N.A3, 0.6], [N.G3, 0.8], [N.A3, 4]],
      [[N.A3, 1], [N.C4, 2.5], [N.Bb3, 0.6], [N.A3, 0.6], [N.G3, 0.6], [N.F3, 1], [N.G3, 3.5]],
      [[N.D4, 2.5], [N.C4, 0.7], [N.Bb3, 0.7], [N.A3, 0.7], [N.G3, 1], [N.A3, 4.5]],
    ];
    let w = this.t + 0.5;
    for (const ph of phrases) {
      for (const [f, b] of ph) {
        const d = b * 0.42;
        this.ney(f, d + 0.25, 0.9, { when: w, dest: out });
        w += d;
      }
      w += 2.2; // breath
    }
    setTimeout(() => out.disconnect(), (w - this.t + 4) * 1000);
    return w - this.t;
  }

  // A building settling: a deep groan of stressed concrete, then grit falling.
  groan() {
    if (!this.ctx) return;
    this.tone(46, 3.2, { type: 'sawtooth', vol: 0.05, to: 38, attack: 0.8 });
    this.noise({ dur: 3.2, freq: 120, type: 'lowpass', vol: 0.25, attack: 0.9, buf: this.brownBuf });
    this.noise({ when: this.t + 1.6, dur: 2.2, freq: 3000, q: 0.6, vol: 0.05, attack: 0.3 });
    for (let i = 0; i < 5; i++) this.noise({ when: this.t + 2 + i * 0.22, dur: 0.06, freq: 1200 + Math.random() * 800, q: 1.5, vol: 0.08 });
  }

  // A soft, woody tick.
  click() {
    this.noise({ dur: 0.025, freq: 2200, q: 3, vol: 0.12 });
    this.tone(620, 0.04, { vol: 0.04, to: 420 });
  }

  // A soft two-note cue when a choice appears.
  sting() {
    this.pluck(BAYATI.D3 * 2, this.t, 0.13, this.music, 1500);
    this.pluck(BAYATI.A3, this.t + 0.12, 0.1, this.music, 1400);
  }

  crank() {
    this.noise({ dur: 0.06, freq: 2600, q: 6, vol: 0.05 });
  }
}
