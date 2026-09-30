// Motion capture → the game's rig.
//
// Reads BVH files from the CMU Graphics Lab Motion Capture Database (the
// BVH conversion by Bruce Hahne), runs forward kinematics, projects the
// skeleton onto the plane the camera sees (the body's own sagittal plane)
// and turns each limb into the absolute angles the 2D rig uses
// (src/rigs/person.js: thighs, shins, arms, forearms from straight down,
// torso from straight up, head relative to the torso). Loops are cut to one
// clean stride and closed; one-shots keep their timing. The result is
// written to src/rigs/mocap-data.js.
//
// The data: "The data used in this project was obtained from
// mocap.cs.cmu.edu. The database was created with funding from NSF
// EIA-0196217." It is free for research and commercial use.
//
// Usage:
//   node tools/mocap.mjs report <dir> <id>     print a timeline to pick ranges
//   node tools/mocap.mjs build <dir>           write src/rigs/mocap-data.js
// <dir> holds the .bvh files (download them from
// https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/NNN/NN_NN.bvh).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'src', 'rigs', 'mocap-data.js');

// ------------------------------------------------------------------ BVH --

function parseBVH(text) {
  const tok = text.split(/\s+/).filter(Boolean);
  let i = 0;
  const joints = [];
  const stack = [];
  let channelCount = 0;
  while (tok[i] !== 'MOTION') {
    const t = tok[i++];
    if (t === 'ROOT' || t === 'JOINT') {
      const j = { name: tok[i++], parent: stack.length ? stack[stack.length - 1] : -1, offset: [0, 0, 0], channels: [], start: 0 };
      joints.push(j);
      stack.push(joints.length - 1);
    } else if (t === 'End') {
      i++; // 'Site'
      // skip the end site block
      while (tok[i] !== '}') i++;
      i++;
    } else if (t === 'OFFSET') {
      const j = joints[stack[stack.length - 1]];
      j.offset = [+tok[i++], +tok[i++], +tok[i++]];
    } else if (t === 'CHANNELS') {
      const j = joints[stack[stack.length - 1]];
      const n = +tok[i++];
      j.start = channelCount;
      for (let k = 0; k < n; k++) j.channels.push(tok[i++]);
      channelCount += n;
    } else if (t === '}') {
      stack.pop();
    }
  }
  i++; // MOTION
  i++; // Frames:
  const frames = +tok[i++];
  i += 2; // Frame Time:
  const dt = +tok[i++];
  const data = new Float32Array(frames * channelCount);
  for (let k = 0; k < data.length; k++) data[k] = +tok[i++];
  return { joints, frames, dt, data, channelCount };
}

// 3×4 matrices as flat arrays [r00 r01 r02 tx; r10 ...].
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mul(a, b) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + (c === 3 ? a[r * 4 + 3] : 0);
    }
  }
  return o;
}
function rot(axis, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (axis === 'X') return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
  if (axis === 'Y') return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
}

// World positions of every joint, every frame: pos[f][jointName] = [x,y,z].
function forward(bvh) {
  const { joints, frames, data, channelCount } = bvh;
  const out = [];
  for (let f = 0; f < frames; f++) {
    const base = f * channelCount;
    const world = [];
    const pos = {};
    for (let ji = 0; ji < joints.length; ji++) {
      const j = joints[ji];
      let local = ident();
      let tx = j.offset[0];
      let ty = j.offset[1];
      let tz = j.offset[2];
      const rots = [];
      j.channels.forEach((ch, k) => {
        const v = data[base + j.start + k];
        if (ch === 'Xposition') tx += v;
        else if (ch === 'Yposition') ty += v;
        else if (ch === 'Zposition') tz += v;
        else rots.push(rot(ch[0], v));
      });
      local[3] = tx;
      local[7] = ty;
      local[11] = tz;
      for (const r of rots) local = mul(local, r);
      const w = j.parent < 0 ? local : mul(world[j.parent], local);
      world.push(w);
      pos[j.name] = [w[3], w[7], w[11]];
    }
    out.push(pos);
  }
  return out;
}

// ----------------------------------------------------- to the 2D rig ----

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

// The direction the body faces, flattened: across the hips (left to right)
// crossed with up. With the camera on the figure's right when it faces +x
// on screen, the right side is the near one.
function facing(p) {
  const across = sub(p.LeftUpLeg, p.RightUpLeg);
  // forward = across × up (y up)
  const f = [-across[2], 0, across[0]];
  const l = Math.hypot(f[0], f[2]) || 1;
  return [f[0] / l, 0, f[2] / l];
}

// Project onto the plane: x along facing, y up.
const plane = (p, f) => [p[0] * f[0] + p[2] * f[2], p[1]];

// Absolute limb angle, rig convention: 0 hangs straight down, positive
// swings forward.
const limbA = (a, b) => Math.atan2(b[0] - a[0], -(b[1] - a[1]));
// Torso and head: 0 straight up, positive leans forward.
const upA = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);

const KEYS = ['torso', 'head', 'thighN', 'shinN', 'thighF', 'shinF', 'armN', 'foreN', 'armF', 'foreF'];

function toRig(frames, fixedFacing = null) {
  // one facing for the whole clip (the mean), so turning in place doesn't
  // flip the projection; clips that walk use their direction of travel
  let F = fixedFacing;
  if (!F) {
    let sx = 0;
    let sz = 0;
    for (const p of frames) {
      const f = facing(p);
      sx += f[0];
      sz += f[2];
    }
    const l = Math.hypot(sx, sz) || 1;
    F = [sx / l, 0, sz / l];
  }
  const legLen = len(sub(frames[0].RightLeg, frames[0].RightUpLeg)) + len(sub(frames[0].RightFoot, frames[0].RightLeg));
  let ground = Infinity;
  for (const p of frames) ground = Math.min(ground, p.LeftToeBase[1], p.RightToeBase[1], p.LeftFoot[1], p.RightFoot[1]);
  return frames.map((p) => {
    const P = (n) => plane(p[n], F);
    const hips = P('Hips');
    const pelvis = plane(mid(p.LeftUpLeg, p.RightUpLeg), F);
    const neck = P('Neck');
    const head = P('Head');
    const torso = upA(pelvis, neck);
    const r = {
      torso,
      head: upA(neck, head) - torso,
      thighN: limbA(P('RightUpLeg'), P('RightLeg')),
      shinN: limbA(P('RightLeg'), P('RightFoot')),
      thighF: limbA(P('LeftUpLeg'), P('LeftLeg')),
      shinF: limbA(P('LeftLeg'), P('LeftFoot')),
      armN: limbA(P('RightArm'), P('RightForeArm')),
      foreN: limbA(P('RightForeArm'), P('RightHand')),
      armF: limbA(P('LeftArm'), P('LeftForeArm')),
      foreF: limbA(P('LeftForeArm'), P('LeftHand')),
    };
    r._x = hips[0] / legLen;
    r._y = (hips[1] - ground) / legLen;
    return r;
  });
}

// Keep angles continuous (no jumps of 2π between frames).
function unwrap(seq) {
  for (const k of KEYS) {
    for (let i = 1; i < seq.length; i++) {
      let d = seq[i][k] - seq[i - 1][k];
      while (d > Math.PI) {
        seq[i][k] -= 2 * Math.PI;
        d -= 2 * Math.PI;
      }
      while (d < -Math.PI) {
        seq[i][k] += 2 * Math.PI;
        d += 2 * Math.PI;
      }
    }
  }
  return seq;
}

// Light smoothing (the capture has marker jitter).
function smoothSeq(seq, r = 2) {
  return seq.map((_, i) => {
    const o = {};
    for (const k of [...KEYS, '_x', '_y']) {
      let s = 0;
      let n = 0;
      for (let d = -r; d <= r; d++) {
        const q = seq[Math.min(seq.length - 1, Math.max(0, i + d))];
        const w = r + 1 - Math.abs(d);
        s += q[k] * w;
        n += w;
      }
      o[k] = s / n;
    }
    return o;
  });
}

function sample(seq, t) {
  const i = Math.min(seq.length - 2, Math.max(0, Math.floor(t)));
  const u = Math.min(1, Math.max(0, t - i));
  const o = {};
  for (const k of Object.keys(seq[0])) o[k] = seq[i][k] + (seq[i + 1][k] - seq[i][k]) * u;
  return o;
}

// One stride of a loop: from one forward-most swing of the near thigh to
// the next, found near the given time, resampled to n samples and closed.
function cycle(seq, fps, at, n = 32) {
  const c = Math.round(at * fps);
  const peaks = [];
  for (let i = 2; i < seq.length - 2; i++) {
    const v = seq[i].thighN;
    if (v > seq[i - 1].thighN && v >= seq[i + 1].thighN && v > seq[i - 2].thighN && v >= seq[i + 2].thighN) peaks.push(i);
  }
  // the pair of peaks around the chosen time, a plausible stride apart
  let best = null;
  for (let k = 0; k < peaks.length - 1; k++) {
    const a = peaks[k];
    const b = peaks[k + 1];
    const T = (b - a) / fps;
    if (T < 0.45 || T > 2.2) continue;
    const d = Math.abs((a + b) / 2 - c);
    if (!best || d < best.d) best = { a, b, d };
  }
  if (!best) throw new Error('no cycle found');
  const { a, b } = best;
  const out = [];
  for (let s = 0; s < n; s++) out.push(sample(seq, a + ((b - a) * s) / n));
  // close the loop: spread the mismatch between end and start over the cycle
  const end = sample(seq, b);
  for (const k of KEYS) {
    const err = end[k] - out[0][k];
    out.forEach((q, s) => (q[k] -= (err * s) / n));
  }
  const stride = Math.abs(end._x - out[0]._x);
  return { frames: out, period: (b - a) / fps, stride };
}

function range(seq, fps, t0, t1, rate = 30) {
  const out = [];
  for (let t = t0; t <= t1 + 1e-6; t += 1 / rate) out.push(sample(seq, t * fps));
  return out;
}

// ---------------------------------------------------------------- clips --

// [name, file, kind, args, note]. Times are in seconds into the take.
const CLIPS = [
  ['walk', '02_01', 'loop', { at: 1.6, torsoMean: 0.06 }, 'walk'],
  ['walkSad', '91_13', 'loop', { at: 4, torsoMean: 0.14 }, 'sad walk'],
  ['jog', '16_35', 'loop', { at: 1.2, torsoMean: 0.14 }, 'run/jog'],
  ['run', '09_01', 'loop', { at: 0.9, torsoMean: 0.24 }, 'run'],
  ['crouchWalk', '136_09', 'loop', { at: 3 }, 'walk crouched'],
  ['creep', '77_14', 'loop', { at: 3 }, 'careful creeping'],
  ['climb', '13_35', 'loop', { at: 3.3, torsoMean: 0.14 }, 'climb 3 steps'],
  ['ladder', '13_33', 'loop', { at: 4 }, 'climb ladder'],
  ['pickup', '111_17', 'once', { t0: 0.3, t1: 3.2 }, 'pick up'],
  ['squat', '77_09', 'once', { t0: 1.0, t1: 4.0 }, 'duck'],
  ['jump', '16_05', 'once', { t0: 0.6, t1: 2.2 }, 'forward jump'],
  ['idle', '40_10', 'once', { t0: 0.5, t1: 12.0 }, 'wait for bus'],
];

function load(dir, id) {
  const bvh = parseBVH(fs.readFileSync(path.join(dir, `${id}.bvh`), 'utf8'));
  const fps = Math.round(1 / bvh.dt);
  const frames = forward(bvh);
  const seq = smoothSeq(unwrap(toRig(frames)), Math.max(1, Math.round(fps / 40)));
  return { seq, fps, frames: bvh.frames };
}

const q = (v) => Math.round(v * 1000);

function build(dir) {
  const out = {};
  for (const [name, id, kind, args, note] of CLIPS) {
    const { seq, fps } = load(dir, id);
    let frames;
    let meta = {};
    if (kind === 'loop') {
      const c = cycle(seq, fps, args.at);
      frames = c.frames;
      if (args.torsoMean != null) {
        // subjects stand differently; settle each gait's lean where it reads
        const m = frames.reduce((acc, f) => acc + f.torso, 0) / frames.length;
        for (const f of frames) f.torso += args.torsoMean - m;
      }
      meta = { loop: true, period: +c.period.toFixed(3), stride: +c.stride.toFixed(3) };
    } else {
      frames = range(seq, fps, args.t0, args.t1);
      meta = { loop: false, rate: 30 };
    }
    const data = [];
    for (const f of frames) for (const k of [...KEYS, '_y']) data.push(q(f[k]));
    out[name] = { src: `CMU ${id} (${note})`, ...meta, n: frames.length, data };
    console.log(name.padEnd(12), id.padEnd(7), kind, frames.length, JSON.stringify(meta));
  }
  const js = `// Generated by tools/mocap.mjs from the CMU Graphics Lab Motion Capture
// Database (mocap.cs.cmu.edu; BVH conversion by Bruce Hahne). "The data used
// in this project was obtained from mocap.cs.cmu.edu. The database was
// created with funding from NSF EIA-0196217." Do not edit by hand.
//
// Each clip: data is n frames of [${[...KEYS, 'hipY'].join(', ')}], angles in
// milliradians, hipY in thousandths of a leg length. Loops hold one stride
// (period in seconds, stride in leg lengths); one-shots run at 'rate' fps.

export const KEYS = ${JSON.stringify(KEYS)};

export const CLIPS = ${JSON.stringify(out)};
`;
  fs.writeFileSync(OUT, js);
  console.log('wrote', OUT, (js.length / 1024).toFixed(1), 'KB');
}

function report(dir, id) {
  const { seq, fps, frames } = load(dir, id);
  console.log(id, frames, 'frames at', fps, 'fps =', (frames / fps).toFixed(1), 's');
  const deg = (v) => Math.round((v * 180) / Math.PI);
  for (let t = 0; t < frames / fps; t += 0.25) {
    const f = sample(seq, t * fps);
    console.log(t.toFixed(2).padStart(6), 'hipY', f._y.toFixed(2), 'x', f._x.toFixed(2), 'torso', deg(f.torso), 'thN', deg(f.thighN), 'shN', deg(f.shinN), 'thF', deg(f.thighF), 'armN', deg(f.armN), 'foreN', deg(f.foreN));
  }
}

const [cmd, dir, id] = process.argv.slice(2);
if (cmd === 'report') report(dir, id);
else if (cmd === 'build') build(dir);
else console.log('usage: node tools/mocap.mjs report <dir> <id> | build <dir>');
