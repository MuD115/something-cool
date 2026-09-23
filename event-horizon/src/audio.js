// A procedural ambient drone. Pitch and brightness follow the camera's
// proximity to the horizon, so diving in audibly "tightens" the sound.
// During a merger a second voice plays the gravitational-wave chirp at the
// frequency the waves would really have, as LIGO's detectors heard it.

export class Drone {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  start() {
    if (!this.ctx) this.build();
    this.ctx.resume();
    this.enabled = true;
    this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 1.2);
  }

  stop() {
    if (!this.ctx) return;
    this.enabled = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  toggle() {
    if (this.enabled) this.stop();
    else this.start();
    return this.enabled;
  }

  build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    // Simple feedback-delay "space".
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.73;
    const fb = ctx.createGain();
    fb.gain.value = 0.45;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.master);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 6;
    this.filter.connect(this.master);
    this.filter.connect(delay);

    // Detuned low oscillators: a root, a fifth and an octave.
    this.oscs = [];
    const voices = [
      [55, 'sawtooth', 0.16],
      [55.4, 'sawtooth', 0.16],
      [82.4, 'triangle', 0.1],
      [110.3, 'sine', 0.08],
    ];
    for (const [f, type, g] of voices) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.value = g;
      o.connect(gain).connect(this.filter);
      o.start();
      this.oscs.push({ o, base: f });
    }

    // Slow LFO breathing on the filter.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(this.filter.frequency);
    lfo.start();

    // Filtered noise: the hiss of infalling gas.
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 300;
    this.noiseFilter.Q.value = 0.8;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.25;
    noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
    noise.start();

    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 1;
    // Re-route drone sources through a bus so the chirp can duck them.
    this.filter.disconnect();
    this.filter.connect(this.droneBus);
    this.noiseGain.disconnect();
    this.noiseGain.connect(this.droneBus);
    this.droneBus.connect(this.master);
    this.droneBus.connect(delay);

    // Chirp voice: fundamental plus a soft second harmonic.
    this.chirpGain = ctx.createGain();
    this.chirpGain.gain.value = 0;
    this.chirpGain.connect(this.master);
    this.chirpGain.connect(delay);
    this.chirpOscs = [
      [1, 'sine', 0.9],
      [2, 'sine', 0.35],
      [3, 'triangle', 0.12],
    ].map(([mult, type, g]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 40 * mult;
      const gain = ctx.createGain();
      gain.gain.value = g;
      o.connect(gain).connect(this.chirpGain);
      o.start();
      return { o, mult };
    });
  }

  // freq in Hz; level 0…1. Pass level 0 to silence the chirp.
  chirp(freq, level) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    for (const { o, mult } of this.chirpOscs) {
      o.frequency.setTargetAtTime(freq * mult, t, 0.015);
    }
    this.chirpGain.gain.setTargetAtTime(level * 0.5, t, 0.03);
    this.droneBus.gain.setTargetAtTime(level > 0 ? 0.35 : 1, t, 0.5);
  }

  // r: camera distance in Schwarzschild radii.
  update(r) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const near = Math.min(Math.max((30 - r) / 26, 0), 1); // 0 far … 1 close
    const dilation = 1 / Math.sqrt(Math.max(1 - 1 / r, 0.02));
    this.filter.frequency.setTargetAtTime(260 + near * near * 1500, t, 0.3);
    this.noiseFilter.frequency.setTargetAtTime(220 + near * 900, t, 0.3);
    this.noiseGain.gain.setTargetAtTime(0.15 + near * 0.45, t, 0.3);
    // Clocks slow near the hole, so the drone sinks in pitch.
    for (const { o, base } of this.oscs) {
      o.frequency.setTargetAtTime(base / dilation, t, 0.4);
    }
  }
}
