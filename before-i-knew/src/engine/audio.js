// Procedural sound for a besieged town. Nothing is sampled.
//
// Buses: ambience + effects → world (lowpass "muffle" for shock and grief)
//        music (ney and oud) → master, beside the world bus
// Settings drive master / music / effects volumes.

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
    comp.threshold.value = -14;
    comp.ratio.value = 3.5;
    this.master.connect(comp).connect(ctx.destination);

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

    // A long, dry-ish space: streets between concrete walls.
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5) * (i < 400 ? i / 400 : 1);
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

  noise({ when = this.t, dur = 0.2, freq = 800, q = 1, type = 'bandpass', vol = 0.5, attack = 0.005, buf, dest = this.fx, sweep }) {
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
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 3);
    src.stop(when + dur + 0.05);
  }

  tone(freq, dur, { when = this.t, type = 'sine', vol = 0.3, to, dest = this.fx, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (to) o.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  step(surface = 'grit', vol = 0.18) {
    const v = vol * (0.7 + Math.random() * 0.5);
    if (surface === 'wood') {
      this.tone(160, 0.06, { vol: v * 0.8, to: 90 });
      return;
    }
    this.noise({ dur: 0.07, freq: surface === 'rubble' ? 1400 : 2600, q: 0.9, vol: v });
    if (surface === 'rubble' && Math.random() < 0.3) this.noise({ when: this.t + 0.04, dur: 0.05, freq: 3400, q: 3, vol: v * 0.5 });
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

  distantShot() {
    this.noise({ dur: 0.08, freq: 2400, q: 0.6, vol: 0.12 });
    this.noise({ when: this.t + 0.04, dur: 1.2, freq: 300, type: 'lowpass', vol: 0.08, buf: this.brownBuf });
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
    this.tone(48, 1.4, { when: tO, vol: 0.45, to: 30, attack: 0.05 });
  }

  // A missile strike beyond the rooftops: sharper than a barrel, shorter tail.
  strikeFar(delay = 0) {
    const w = this.t + delay;
    this.duck(0.9, 3);
    this.noise({ when: w, dur: 0.12, freq: 1800, type: 'lowpass', vol: 0.25, q: 0.4 });
    this.noise({ when: w + 0.02, dur: 2.4, freq: 120, type: 'lowpass', vol: 0.8, q: 0.5, buf: this.brownBuf, attack: 0.01 });
    this.tone(55, 1.2, { when: w, vol: 0.45, to: 30 });
    this.noise({ when: w + 0.4, dur: 4, freq: 90, type: 'lowpass', vol: 0.6, q: 0.5, buf: this.brownBuf, attack: 0.3 });
    for (let i = 0; i < 8; i++) this.noise({ when: w + 0.6 + Math.random() * 2, dur: 0.05, freq: 1500 + Math.random() * 1500, q: 2, vol: 0.03 });
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

  mortarWhistle(dur = 1.3) {
    this.tone(1250, dur, { vol: 0.08, to: 520, attack: 0.3 });
  }

  mortarImpact(dist = 1) {
    const v = 1 / Math.max(dist, 0.6);
    this.duck(0.8, 2.5);
    this.noise({ dur: 0.18, freq: 2600, type: 'highpass', vol: 0.45 * v, q: 0.4 });
    this.noise({ dur: 1.8, freq: 160, type: 'lowpass', vol: 0.9 * v, q: 0.5, buf: this.brownBuf, attack: 0.01 });
    this.tone(70, 0.6, { vol: 0.5 * v, to: 35 });
    // debris patter
    for (let i = 0; i < 10; i++) this.noise({ when: this.t + 0.3 + Math.random() * 1.2, dur: 0.05, freq: 1800 + Math.random() * 2000, q: 2, vol: 0.06 * v });
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

  click() {
    this.noise({ dur: 0.03, freq: 3200, q: 4, vol: 0.25 });
  }

  // A soft two-note cue when a choice appears.
  sting() {
    this.pluck(BAYATI.D3 * 2, this.t, 0.2);
    this.pluck(BAYATI.A3, this.t + 0.08, 0.16);
  }

  crank() {
    this.noise({ dur: 0.06, freq: 2600, q: 6, vol: 0.05 });
  }
}
