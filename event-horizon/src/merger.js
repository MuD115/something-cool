// Timeline of a binary black hole merger, modelled on GW150914 (the first
// gravitational-wave detection) but with equal masses.
//
// Units: the binary's total Schwarzschild radius is 1, which for 65 solar
// masses is 192 km. The inspiral follows the Newtonian quadrupole chirp,
// a(t) = a0 · (1 − t/T)^(1/4), whose orbital phase has a closed form. The
// same formulas run in the shader, so the wave field, the holes, the strain
// trace and the audio all stay in lock-step, including while scrubbing.

const KM_PER_UNIT = 192; // r_s of 65 M☉
const GM = 65 * 1.32712e20; // m³/s²
const C = 299792458;
const GM_KM = KM_PER_UNIT / 2; // GM/c² in km

export const MERGER = (() => {
  const a0 = 7; // starting separation
  const am = 1.1; // separation at which a common horizon forms
  const T = 32; // chirp timescale (seconds of playback)
  const omegaFinal = 2 * Math.PI * 1.7; // last orbit ≈ 1.7 Hz on screen
  const omega0 = omegaFinal / Math.pow(a0 / am, 1.5);
  const tm = T * (1 - Math.pow(am / a0, 4));
  const phiM = omega0 * T * 1.6 * (1 - Math.pow(1 - tm / T, 0.625));
  return {
    a0,
    am,
    T,
    omega0,
    tm,
    phiM,
    ampM: a0 / am,
    rsEach: 0.5,
    rsFinal: 0.95, // ~5% of the mass leaves as gravitational waves
    ringOmega: 2 * omegaFinal,
    ringDecay: 0.7,
    waveC: 5,
    discStart: 2, // seconds after merger when gas starts to flood in
    discDuration: 11,
    end: tm + 16,
  };
})();

const M = MERGER;

export function separation(t) {
  if (t >= M.tm) return 0;
  return M.a0 * Math.pow(1 - Math.max(t, 0) / M.T, 0.25);
}

export function phase(t) {
  if (t < 0) return M.omega0 * t;
  if (t < M.tm) return M.omega0 * M.T * 1.6 * (1 - Math.pow(1 - t / M.T, 0.625));
  return M.phiM + 0.5 * M.ringOmega * (t - M.tm);
}

export function amplitude(t) {
  if (t < 0) return 1;
  if (t < M.tm) return Math.pow(1 - t / M.T, -0.25);
  return M.ampM * Math.exp(-(t - M.tm) / M.ringDecay);
}

// Strain a distant observer on the orbital axis would record.
export function strain(t) {
  return amplitude(t) * Math.cos(2 * phase(t));
}

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Everything the renderer needs at time t.
export function stateAt(t) {
  const s = {
    t,
    merged: t >= M.tm,
    bh1: [0, 0, 0],
    bh2: [0, 0, 0],
    rs1: M.rsFinal,
    rs2: 0,
    ring: 0,
    ringPhase: 0,
    mini: 0,
    miniOuter: 0,
    discInner: 14,
    discOuter: 16,
    discAmount: 0,
  };

  if (!s.merged) {
    const a = separation(t);
    const phi = phase(t);
    const x = (a / 2) * Math.cos(phi);
    const z = (a / 2) * Math.sin(phi);
    s.bh1 = [x, 0, z];
    s.bh2 = [-x, 0, -z];
    s.rs1 = s.rs2 = M.rsEach;
    s.a = a;
    // Tidal truncation: each mini disc is cut off at ~0.42 of the separation,
    // so they are torn apart as the holes close in.
    s.miniOuter = 0.42 * a;
    s.mini = smooth(1.75, 2.6, s.miniOuter);
  } else {
    const dtm = t - M.tm;
    s.ring = 0.14 * Math.exp(-dtm / M.ringDecay);
    s.ringPhase = M.ringOmega * dtm;
    const k = smooth(M.discStart, M.discStart + M.discDuration, dtm);
    s.discAmount = k;
    s.discInner = 14 - (14 - 3 * M.rsFinal) * k;
    s.discOuter = 16 + (14 - 16) * k;
  }
  return s;
}

// Physical readouts in GW150914 units.
export function readouts(t) {
  const a = separation(t);
  if (a > 0) {
    const aKm = a * KM_PER_UNIT;
    const aM = aKm * 1000;
    const fGw = Math.sqrt(GM / (aM * aM * aM)) / Math.PI;
    const v = Math.min(Math.sqrt(GM_KM / aKm), 0.99);
    // Time left to coalescence for equal masses: (5/64) a⁴ / M³, geometric units.
    const tcKm = (5 / 64) * Math.pow(aKm, 4) / Math.pow(GM_KM, 3);
    return { aKm, fGw, v, realLeft: (tcKm * 1000) / C };
  }
  const fMerge = Math.sqrt(GM / Math.pow(M.am * KM_PER_UNIT * 1000, 3)) / Math.PI;
  return { aKm: 0, fGw: fMerge, v: 0, realLeft: 0 };
}

export function phaseName(t) {
  if (t < M.tm - 2.5) return 'inspiral';
  if (t < M.tm) return 'merger';
  if (t < M.tm + M.discStart + 1) return 'ringdown';
  return 'disc';
}

export const PHASE_TEXT = {
  inspiral:
    'Two black holes of 32 Suns each circle one another. Each bends the other’s light, and every orbit sheds energy as gravitational waves.',
  merger:
    'The orbit collapses. The holes now circle each other over a hundred times a second at over half the speed of light, and their gas discs have been torn apart.',
  ringdown:
    'A single horizon forms, rings like a struck bell, then settles. Three Suns’ worth of mass has just left as gravitational waves.',
  disc: 'Gas floods back into the emptied space and a new accretion disc lights up around one heavier black hole.',
};
