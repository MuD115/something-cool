// Ambient life: people at the work of a siege day, each at one task on a
// loop. A worker is an ordinary walker with a pose that is a function of
// time (keyframes, eased), a tool in the hand (the rig's prop, drawn along
// the forearm), the things they're working on (drawn with them, behind) and
// the sound of the work, quieter with distance. When danger comes (shelling,
// a jet), they stop and crouch where they are until it has passed.
//
//   populate(g, [[task, x, { f, outfit, phase, scale }], …]) → walkers
//   tickLife(g)  once a frame, from the act's update (for the danger check)

import { clamp, lerp, smooth } from '../engine/util.js';
import { POSES } from '../rigs/person.js';

const TAU = Math.PI * 2;
const ST = POSES.stand;

// A looping pose from keyframes [[u, pose], …] (u from 0 to 1), eased
// between frames; keys a frame leaves out are the standing pose's.
function loop(frames) {
  const fs = frames.map(([u, p]) => [u, { ...ST, ...p }]);
  return (u) => {
    u = ((u % 1) + 1) % 1;
    let i = fs.length - 1;
    for (let k = 0; k < fs.length; k++) if (fs[k][0] <= u) i = k;
    const [ua, a] = fs[i];
    const [ub0, b] = fs[(i + 1) % fs.length];
    const ub = ub0 <= ua ? ub0 + 1 : ub0;
    const s = smooth(0, 1, clamp((u - ua) / Math.max(1e-4, ub - ua)));
    const out = {};
    for (const key in a) out[key] = typeof a[key] === 'number' ? lerp(a[key], b[key] ?? a[key], s) : a[key];
    return out;
  };
}

// down the forearm from the hand
const along = (a, d) => [Math.sin(a) * d, Math.cos(a) * d];

// ---------------------------------------------------------------- tasks --
// Each: outfit, period (s), pose(u), tool(c, hand, pose, u), scene(c, w, u)
// in world space, behind the worker, and beats: [u, sound] at which a sound
// is made.

const TASKS = {
  // turning over a bed of earth for vegetables, a spade
  dig: {
    outfit: 'man',
    period: 2.6,
    pose: loop([
      [0, { torso: 0.18, armN: 0.75, foreN: 0.95, armF: 0.45, foreF: 0.75, thighN: 0.35, shinN: -0.1 }],
      [0.3, { torso: 0.42, head: 0.2, armN: 0.4, foreN: 0.35, armF: 0.3, foreF: 0.3, thighN: 0.55, shinN: -0.35, thighF: -0.1 }],
      [0.55, { torso: 0.5, head: 0.3, armN: 0.75, foreN: 0.6, armF: 0.55, foreF: 0.5, thighN: 0.6, shinN: -0.4 }],
      [0.8, { torso: 0.1, head: 0.05, armN: 1.25, foreN: 1.45, armF: 0.95, foreF: 1.2, thighN: 0.25 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN + 0.35;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#6a4a2c';
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(h[0] - dx * 40, h[1] - dy * 40);
      c.lineTo(h[0] + dx * 62, h[1] + dy * 62);
      c.stroke();
      c.fillStyle = '#5a5e62';
      c.save();
      c.translate(h[0] + dx * 62, h[1] + dy * 62);
      c.rotate(-a);
      c.beginPath();
      c.moveTo(-9, 0);
      c.lineTo(9, 0);
      c.lineTo(7, 24);
      c.quadraticCurveTo(0, 30, -7, 24);
      c.closePath();
      c.fill();
      c.restore();
      c.fillStyle = '#3a2a1c';
      c.fillRect(h[0] - dx * 40 - 7, h[1] - dy * 40 - 2, 14, 4);
    },
    scene(c, w) {
      const f = w.f;
      const x0 = w.x + f * 30;
      // the turned bed, dark and wet, and the dry ground beyond it
      c.fillStyle = '#4a3828';
      c.beginPath();
      c.moveTo(x0 - f * 40, 0);
      c.quadraticCurveTo(x0 + f * 60, -16, x0 + f * 170, -2);
      c.lineTo(x0 + f * 170, 2);
      c.lineTo(x0 - f * 40, 2);
      c.fill();
      c.fillStyle = '#5c4632';
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.ellipse(x0 + f * (i * 26), -6 - (i % 2) * 3, 10, 5, 0, 0, TAU);
        c.fill();
      }
      // a row of seedlings planted already
      for (let i = 0; i < 5; i++) {
        const sx = x0 + f * (190 + i * 22);
        c.strokeStyle = '#4e6a2e';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(sx, 0);
        c.lineTo(sx, -10);
        c.stroke();
        c.fillStyle = '#6e8a3a';
        c.beginPath();
        c.ellipse(sx - 4, -11, 5, 2.4, -0.5, 0, TAU);
        c.ellipse(sx + 4, -12, 5, 2.4, 0.5, 0, TAU);
        c.fill();
      }
    },
    beats: [[0.3, 'dig']],
  },

  // nailing a new frame together for a blown-out window, on two crates
  hammer: {
    outfit: 'man3',
    period: 0.9,
    pose: loop([
      [0, { torso: 0.32, head: 0.35, armN: 2.3, foreN: 3.1, armF: 0.9, foreF: 1.35 }],
      [0.45, { torso: 0.38, head: 0.4, armN: 1.05, foreN: 1.55, armF: 0.9, foreF: 1.35 }],
      [0.55, { torso: 0.38, head: 0.4, armN: 1.0, foreN: 1.5, armF: 0.9, foreF: 1.35 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#7a5a36';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(h[0] - dx * 4, h[1] - dy * 4);
      c.lineTo(h[0] + dx * 26, h[1] + dy * 26);
      c.stroke();
      c.save();
      c.translate(h[0] + dx * 26, h[1] + dy * 26);
      c.rotate(-a);
      c.fillStyle = '#3c3e42';
      c.fillRect(-9, -3, 18, 7);
      c.restore();
    },
    scene(c, w) {
      const f = w.f;
      const x0 = w.x + f * 62;
      // two crates and a window frame across them, glazing bars and all
      c.fillStyle = '#8a6a42';
      for (const cx of [x0 - 34, x0 + 34]) {
        c.fillRect(cx - 18, -44, 36, 44);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        c.fillRect(cx - 18, -30, 36, 2);
        c.fillRect(cx - 18, -16, 36, 2);
        c.fillStyle = '#8a6a42';
      }
      c.strokeStyle = '#c9b48a';
      c.lineWidth = 5;
      c.strokeRect(x0 - 64, -58, 128, 14);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0, -58);
      c.lineTo(x0, -44);
      c.stroke();
      // the plastic sheet that will go in it, rolled at his feet
      c.fillStyle = 'rgba(200,208,214,0.75)';
      c.fillRect(w.x - f * 30 - 22, -12, 44, 12);
    },
    beats: [[0.47, 'tap']],
  },

  // sweeping glass and grit off the front step, a palm-leaf broom
  sweep: {
    outfit: 'woman2',
    period: 1.3,
    pose: loop([
      [0, { torso: 0.32, head: 0.3, armN: 0.95, foreN: 0.75, armF: 0.6, foreF: 0.4, thighN: 0.2 }],
      [0.5, { torso: 0.24, head: 0.25, armN: 0.45, foreN: 0.3, armF: 0.2, foreF: 0.05, thighN: 0.05 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN + 0.45;
      const [dx, dy] = along(a, 1);
      const end = [h[0] + dx * 74, h[1] + dy * 74];
      c.strokeStyle = '#7a6040';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(h[0] - dx * 12, h[1] - dy * 12);
      c.lineTo(end[0], end[1]);
      c.stroke();
      c.strokeStyle = '#b8964e';
      c.lineWidth = 1.4;
      c.beginPath();
      for (let i = -4; i <= 4; i++) {
        c.moveTo(end[0], end[1]);
        c.lineTo(end[0] + i * 3 + dx * 10, end[1] + 22);
      }
      c.stroke();
    },
    scene(c, w, u) {
      // the dust she raises, drifting
      const f = w.f;
      for (let i = 0; i < 5; i++) {
        const k = (u + i / 5) % 1;
        c.fillStyle = `rgba(190,170,140,${0.22 * (1 - k)})`;
        c.beginPath();
        c.arc(w.x + f * (52 + k * 40), -4 - k * 26, 5 + k * 9, 0, TAU);
        c.fill();
      }
    },
    beats: [[0.0, 'swish'], [0.5, 'swish']],
  },

  // beating the dust out of a rug hung over a line
  rug: {
    outfit: 'woman',
    period: 1.1,
    pose: loop([
      [0, { torso: -0.08, head: -0.1, armN: 2.6, foreN: 3.2, armF: 0.2, foreF: 0.4 }],
      [0.4, { torso: 0.2, head: 0.05, armN: 1.4, foreN: 1.75, armF: 0.2, foreF: 0.4 }],
      [0.5, { torso: 0.22, head: 0.05, armN: 1.35, foreN: 1.7, armF: 0.2, foreF: 0.4 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#a07a44';
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(h[0], h[1]);
      c.lineTo(h[0] + dx * 30, h[1] + dy * 30);
      c.stroke();
      c.save();
      c.translate(h[0] + dx * 40, h[1] + dy * 40);
      c.rotate(-a);
      c.beginPath();
      c.ellipse(0, 0, 9, 12, 0, 0, TAU);
      c.stroke();
      c.restore();
    },
    scene(c, w, u) {
      const f = w.f;
      const x0 = w.x + f * 70;
      // a line between a pole and a nail in the wall, and the rug over it
      c.strokeStyle = '#3a3028';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0 - 90, -150);
      c.lineTo(x0 + 90, -152);
      c.stroke();
      c.fillStyle = '#4a3a30';
      c.fillRect(x0 + 88, -160, 5, 160);
      const hit = Math.max(0, 1 - Math.abs(u - 0.45) * 8);
      const sw = Math.sin(u * TAU) * 2 + hit * 5 * f;
      c.fillStyle = '#8a2e2a';
      c.beginPath();
      c.moveTo(x0 - 50, -150);
      c.lineTo(x0 + 50, -151);
      c.lineTo(x0 + 52 + sw, -62);
      c.lineTo(x0 - 48 + sw, -60);
      c.fill();
      c.strokeStyle = 'rgba(232,196,120,0.6)';
      c.lineWidth = 2;
      c.strokeRect(x0 - 40 + sw * 0.5, -140, 80, 66);
      c.fillStyle = 'rgba(232,196,120,0.5)';
      for (let i = 0; i < 5; i++) c.fillRect(x0 - 46 + i * 22 + sw, -60, 2, 8);
      // the dust it gives up
      if (hit > 0) {
        c.fillStyle = `rgba(200,180,150,${0.35 * hit})`;
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.arc(x0 + (i - 3) * 14, -110 + (i % 3) * 14, 8 + (1 - hit) * 14, 0, TAU);
          c.fill();
        }
      }
    },
    beats: [[0.45, 'thump']],
  },

  // sawing a plank for firewood on a trestle
  saw: {
    outfit: 'man2',
    period: 0.8,
    pose: loop([
      [0, { torso: 0.42, head: 0.3, armN: 0.75, foreN: 1.25, armF: 1.15, foreF: 1.55, thighN: 0.3 }],
      [0.5, { torso: 0.48, head: 0.32, armN: 1.2, foreN: 1.75, armF: 1.15, foreF: 1.55, thighN: 0.3 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN;
      const [dx, dy] = along(a, 1);
      c.fillStyle = '#9a9ea2';
      c.save();
      c.translate(h[0], h[1]);
      c.rotate(-a + Math.PI / 2);
      c.beginPath();
      c.moveTo(4, -3);
      c.lineTo(60, -1);
      c.lineTo(60, 7);
      c.lineTo(4, 10);
      c.fill();
      c.fillStyle = '#6a4a2c';
      c.fillRect(-8, -5, 13, 16);
      c.restore();
      void dx;
      void dy;
    },
    scene(c, w, u) {
      const f = w.f;
      const x0 = w.x + f * 62;
      c.fillStyle = '#6a4e30';
      for (const lx of [x0 - 36, x0 + 36]) {
        c.beginPath();
        c.moveTo(lx - 12, 0);
        c.lineTo(lx, -48);
        c.lineTo(lx + 12, 0);
        c.lineTo(lx + 8, 0);
        c.lineTo(lx, -40);
        c.lineTo(lx - 8, 0);
        c.fill();
      }
      c.fillStyle = '#b08a5a';
      c.fillRect(x0 - 80, -54, 160, 9);
      // sawdust falling and a little heap of it
      c.fillStyle = 'rgba(222,196,150,0.8)';
      for (let i = 0; i < 6; i++) {
        const k = (u * 2 + i / 6) % 1;
        c.fillRect(x0 - f * 8 + Math.sin(i * 3) * 4, -45 + k * 44, 2, 2);
      }
      c.beginPath();
      c.ellipse(x0 - f * 8, 0, 14, 4, 0, Math.PI, TAU);
      c.fill();
      // the cut logs stacked beside it
      c.fillStyle = '#8a6a44';
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(x0 + f * 110 + (i % 2) * 12, -8 - Math.floor(i / 2) * 14, 9, 8, 0, 0, TAU);
        c.fill();
      }
    },
    beats: [[0.1, 'rasp'], [0.6, 'rasp']],
  },

  // whitewashing over the shell scars with a brush on a pole
  whitewash: {
    outfit: 'fadi',
    period: 1.6,
    pose: loop([
      [0, { torso: -0.12, head: -0.35, armN: 2.5, foreN: 2.9, armF: 2.2, foreF: 2.7 }],
      [0.5, { torso: -0.04, head: -0.15, armN: 1.9, foreN: 2.3, armF: 1.7, foreF: 2.15 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN - 0.15;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#8a6a44';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(h[0] - dx * 20, h[1] - dy * 20);
      c.lineTo(h[0] + dx * 90, h[1] + dy * 90);
      c.stroke();
      c.fillStyle = '#ece8dc';
      c.save();
      c.translate(h[0] + dx * 92, h[1] + dy * 92);
      c.rotate(-a);
      c.fillRect(-10, 0, 20, 10);
      c.restore();
    },
    scene(c, w, u) {
      const f = w.f;
      // the fresh white over the old wall, growing upward, and the bucket
      const x0 = w.x + f * 70;
      const k = 0.5 + 0.5 * Math.sin(u * TAU);
      // brushed bands, each a little uneven, the top edge ragged and wet
      for (let i = 0; i < 7; i++) {
        const bx = x0 - 66 + i * 19;
        const top = -222 - ((i * 37) % 26) - (i === 3 ? k * 24 : 0);
        c.fillStyle = `rgba(242,238,228,${0.42 + ((i * 13) % 5) * 0.03})`;
        c.beginPath();
        c.moveTo(bx, -4);
        c.lineTo(bx, top + 6);
        c.quadraticCurveTo(bx + 10, top - 4, bx + 20, top + 4);
        c.lineTo(bx + 20, -4);
        c.fill();
      }
      c.fillStyle = 'rgba(255,255,250,0.25)';
      c.fillRect(x0 - 8, -240 + k * 40, 22, 30);
      c.fillStyle = '#c9c3b6';
      c.fillRect(w.x - f * 34 - 12, -26, 24, 26);
      c.fillStyle = '#f2efe6';
      c.fillRect(w.x - f * 34 - 10, -26, 20, 5);
    },
    beats: [],
  },

  // stirring a pot over a fire of broken furniture
  cook: {
    outfit: 'woman',
    period: 2.2,
    pose: loop([
      [0, { torso: 0.4, head: 0.4, thighN: 2.0, shinN: -0.7, thighF: 1.9, shinF: -0.85, armN: 1.1, foreN: 1.3, armF: 0.7, foreF: 1.2, seat: 26 }],
      [0.5, { torso: 0.46, head: 0.45, thighN: 2.0, shinN: -0.7, thighF: 1.9, shinF: -0.85, armN: 1.35, foreN: 1.75, armF: 0.7, foreF: 1.2, seat: 26 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN + 0.3;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#8a6a44';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(h[0], h[1]);
      c.lineTo(h[0] + dx * 34, h[1] + dy * 34);
      c.stroke();
    },
    scene(c, w, u, t) {
      const f = w.f;
      const x0 = w.x + f * 58;
      // a low stool under her
      c.fillStyle = '#6a4e30';
      c.fillRect(w.x - 14, -26, 28, 5);
      c.fillRect(w.x - 12, -26, 3, 26);
      c.fillRect(w.x + 9, -26, 3, 26);
      // three stones, the fire, the pot, the steam
      c.fillStyle = '#7a7268';
      for (const sx of [-22, 0, 22]) {
        c.beginPath();
        c.ellipse(x0 + sx, -7, 9, 7, 0, 0, TAU);
        c.fill();
      }
      const fl = 0.7 + 0.3 * Math.sin(t * 13) * Math.sin(t * 5.3);
      c.fillStyle = `rgba(255,${150 + 40 * fl},60,0.9)`;
      c.beginPath();
      c.moveTo(x0 - 14, -6);
      c.quadraticCurveTo(x0 - 4, -26 * fl, x0, -14);
      c.quadraticCurveTo(x0 + 6, -30 * fl, x0 + 14, -6);
      c.fill();
      c.fillStyle = '#2e2a28';
      c.beginPath();
      c.moveTo(x0 - 24, -40);
      c.lineTo(x0 + 24, -40);
      c.lineTo(x0 + 20, -16);
      c.quadraticCurveTo(x0, -10, x0 - 20, -16);
      c.closePath();
      c.fill();
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.3 + i / 4) % 1;
        c.fillStyle = `rgba(220,220,220,${0.18 * (1 - k)})`;
        c.beginPath();
        c.arc(x0 + Math.sin(k * 6 + i) * 8, -44 - k * 70, 6 + k * 14, 0, TAU);
        c.fill();
      }
      void u;
    },
    beats: [],
  },

  // watering a row of herbs in tins with a can
  water: {
    outfit: 'oldman',
    period: 3.4,
    pose: loop([
      [0, { torso: 0.2, head: 0.3, armN: 0.75, foreN: 1.05 }],
      [0.4, { torso: 0.28, head: 0.4, armN: 0.95, foreN: 1.35 }],
      [0.7, { torso: 0.28, head: 0.4, armN: 0.95, foreN: 1.35 }],
    ]),
    tool(c, h, p, u) {
      const tilt = (p.foreN - 1.05) * 1.6;
      c.save();
      c.translate(h[0] + 4, h[1] + 6);
      c.rotate(tilt);
      c.fillStyle = '#7a8a8e';
      c.fillRect(-12, 0, 24, 22);
      c.strokeStyle = '#7a8a8e';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(12, 6);
      c.lineTo(32, -4);
      c.stroke();
      c.restore();
      if (tilt > 0.3) {
        // water from the rose
        c.strokeStyle = 'rgba(190,220,240,0.6)';
        c.lineWidth = 1;
        const sx = h[0] + 4 + Math.cos(tilt) * 32 + Math.sin(tilt) * 4;
        const sy = h[1] + 6 + Math.sin(tilt) * 32 - 4;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(sx + i * 2, sy);
          c.lineTo(sx + i * 3 + 4, sy + 40 + ((u * 50 + i * 7) % 8));
          c.stroke();
        }
      }
    },
    scene(c, w) {
      const f = w.f;
      for (let i = 0; i < 4; i++) {
        const tx = w.x + f * (46 + i * 26);
        c.fillStyle = ['#a88a5a', '#8a8a88', '#b07a4a', '#9a9a8a'][i];
        c.fillRect(tx - 9, -18, 18, 18);
        c.fillStyle = ['#5e8a3a', '#4e7a32', '#6e9a44', '#557e36'][i];
        c.beginPath();
        c.arc(tx, -24, 10, 0, TAU);
        c.arc(tx - 6, -30, 6, 0, TAU);
        c.arc(tx + 6, -31, 6, 0, TAU);
        c.fill();
      }
    },
    beats: [],
  },

  // a boy kicking a ball against a wall, again and again
  ball: {
    outfit: 'boy',
    scale: 0.62,
    period: 1.6,
    pose: loop([
      [0, { torso: 0.05, armN: 0.3, foreN: 0.4, armF: -0.3, foreF: -0.1 }],
      [0.25, { torso: -0.05, thighN: -0.45, shinN: -0.6, armN: -0.3, foreN: 0.1, armF: 0.4, foreF: 0.6 }],
      [0.35, { torso: 0.1, thighN: 0.9, shinN: 0.6, armN: -0.4, foreN: -0.1, armF: 0.6, foreF: 0.8 }],
      [0.55, { torso: 0.05, thighN: 0.1, armN: 0.2, foreN: 0.3 }],
    ]),
    scene(c, w, u) {
      const f = w.f;
      // out to the wall and back along the ground
      const wallX = w.x + f * 150;
      let bx;
      let by;
      if (u < 0.33) {
        bx = w.x + f * 26;
        by = -8;
      } else if (u < 0.6) {
        const k = (u - 0.33) / 0.27;
        bx = lerp(w.x + f * 26, wallX - f * 10, k);
        by = -8 - Math.sin(k * Math.PI) * 30;
      } else {
        const k = (u - 0.6) / 0.4;
        bx = lerp(wallX - f * 10, w.x + f * 26, k);
        by = -8 - Math.abs(Math.sin(k * Math.PI * 2)) * 10 * (1 - k);
      }
      c.fillStyle = '#e8e0cc';
      c.beginPath();
      c.arc(bx, by, 8, 0, TAU);
      c.fill();
      c.strokeStyle = '#3a3a3a';
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(bx, by, 8, u * 12, u * 12 + 2);
      c.stroke();
    },
    beats: [[0.33, 'kick'], [0.6, 'kick']],
  },

  // smoking on a doorstep, watching the street
  smoke: {
    outfit: 'abuyazan',
    period: 7,
    pose: loop([
      [0, { ...POSES.sitChair, seat: 34, torso: 0.1, head: 0.1, armN: 0.5, foreN: 1.4, armF: 0.3, foreF: 1.2 }],
      [0.35, { ...POSES.sitChair, seat: 34, torso: 0.1, head: 0.1, armN: 0.5, foreN: 1.4, armF: 0.3, foreF: 1.2 }],
      [0.45, { ...POSES.sitChair, seat: 34, torso: 0.06, head: 0.0, armN: 0.55, foreN: 2.9, armF: 0.3, foreF: 1.2 }],
      [0.55, { ...POSES.sitChair, seat: 34, torso: 0.06, head: -0.05, armN: 0.55, foreN: 2.9, armF: 0.3, foreF: 1.2 }],
      [0.65, { ...POSES.sitChair, seat: 34, torso: 0.1, head: 0.1, armN: 0.5, foreN: 1.4, armF: 0.3, foreF: 1.2 }],
    ]),
    tool(c, h, p, u, t) {
      c.fillStyle = '#eee8dc';
      c.fillRect(h[0] + 2, h[1] - 1, 9, 2);
      const glow = u > 0.45 && u < 0.56 ? 1 : 0.45;
      c.fillStyle = `rgba(255,120,40,${glow})`;
      c.fillRect(h[0] + 10, h[1] - 1, 2, 2);
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.25 + i / 3) % 1;
        c.fillStyle = `rgba(210,210,210,${0.2 * (1 - k)})`;
        c.beginPath();
        c.arc(h[0] + 12 + Math.sin(k * 5 + i) * 6, h[1] - 6 - k * 50, 3 + k * 8, 0, TAU);
        c.fill();
      }
    },
    scene(c, w) {
      // the step he sits on
      c.fillStyle = '#a89c86';
      c.fillRect(w.x - 30, -34, 60, 34);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(w.x - 30, -34, 60, 4);
    },
    beats: [],
  },

  // mending a shirt on a stool, needle in and out
  sew: {
    outfit: 'woman2',
    period: 1.8,
    pose: loop([
      [0, { ...POSES.sitChair, seat: 40, torso: 0.3, head: 0.5, armN: 0.7, foreN: 1.5, armF: 0.6, foreF: 1.6 }],
      [0.5, { ...POSES.sitChair, seat: 40, torso: 0.3, head: 0.5, armN: 1.0, foreN: 2.3, armF: 0.6, foreF: 1.6 }],
    ]),
    tool(c, h) {
      c.strokeStyle = 'rgba(240,240,240,0.8)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(h[0], h[1]);
      c.lineTo(h[0] + 10, h[1] + 14);
      c.stroke();
    },
    scene(c, w) {
      const f = w.f;
      c.fillStyle = '#6a4e30';
      c.fillRect(w.x - 16, -40, 32, 5);
      c.fillRect(w.x - 14, -40, 3, 40);
      c.fillRect(w.x + 11, -40, 3, 40);
      // the shirt across her knees, and a basket of more
      c.fillStyle = '#d8d4c8';
      c.fillRect(w.x + f * 4, -48, f * 34, 8);
      c.fillStyle = '#9a7a4a';
      c.fillRect(w.x - f * 46 - 14, -22, 28, 22);
      c.fillStyle = '#7a8aa0';
      c.fillRect(w.x - f * 46 - 12, -28, 24, 7);
    },
    beats: [],
  },

  // fixing a bicycle turned upside down, the wheel spinning
  bike: {
    outfit: 'fadi',
    period: 2.4,
    pose: loop([
      [0, { ...POSES.squat, armN: 1.2, foreN: 1.4, armF: 1.0, foreF: 1.2 }],
      [0.5, { ...POSES.squat, armN: 1.45, foreN: 1.9, armF: 1.0, foreF: 1.2 }],
    ]),
    scene(c, w, u, t) {
      const f = w.f;
      const x0 = w.x + f * 104;
      const wr = 30;
      const spin = t * 5;
      c.strokeStyle = '#2a2a2e';
      c.lineWidth = 2.5;
      for (const wx of [x0 - 40, x0 + 40]) {
        c.beginPath();
        c.arc(wx, -wr - 22, wr, 0, TAU);
        c.stroke();
        c.lineWidth = 0.8;
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (wx > x0 ? spin : 0) + (i / 8) * Math.PI;
          c.moveTo(wx + Math.cos(a) * wr, -wr - 22 + Math.sin(a) * wr);
          c.lineTo(wx - Math.cos(a) * wr, -wr - 22 - Math.sin(a) * wr);
        }
        c.stroke();
        c.lineWidth = 2.5;
      }
      // the frame, upside down on its saddle and bars
      c.strokeStyle = '#7a2a24';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x0 - 40, -52);
      c.lineTo(x0 - 8, -18);
      c.lineTo(x0 + 24, -18);
      c.lineTo(x0 + 40, -52);
      c.moveTo(x0 - 8, -18);
      c.lineTo(x0 + 8, -52);
      c.lineTo(x0 + 40, -52);
      c.stroke();
      c.fillStyle = '#2a2420';
      c.fillRect(x0 - 16, -18, 18, 6);
      c.fillRect(x0 + 20, -18, 14, 18);
      void u;
    },
    beats: [],
  },

  // pegging out washing on a line strung across a doorway
  laundry: {
    outfit: 'layla',
    period: 3.2,
    pose: loop([
      [0, { torso: 0.35, head: 0.4, armN: 0.9, foreN: 1.3, armF: 0.8, foreF: 1.2 }],
      [0.3, { torso: -0.06, head: -0.25, armN: 2.5, foreN: 3.0, armF: 2.4, foreF: 2.9 }],
      [0.65, { torso: -0.08, head: -0.3, armN: 2.6, foreN: 3.1, armF: 2.5, foreF: 3.0 }],
    ]),
    scene(c, w, u, t) {
      const f = w.f;
      const a = w.x - f * 120;
      const b = w.x + f * 160;
      const ly = -196;
      c.strokeStyle = '#2a2420';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(a, ly);
      c.quadraticCurveTo((a + b) / 2, ly + 14, b, ly);
      c.stroke();
      c.fillStyle = '#4a3a30';
      c.fillRect(b - 2, ly - 4, 5, -ly + 4);
      const cols = ['#c9c2b2', '#6f7e86', '#a85a48', '#e0d8c4', '#7a8a5a'];
      for (let i = 0; i < 5; i++) {
        const k = (i + 0.5) / 5;
        const lx = a + (b - a) * k;
        const gy = ly + 14 * 4 * k * (1 - k) * 0.9;
        const sway = Math.sin(t * 1.8 + i * 1.4) * 5 + Math.sin(t * 4.1 + i) * 1.5;
        const gw = 30 + (i % 2) * 14;
        const gh = 50 + (i % 3) * 16;
        c.fillStyle = cols[i];
        c.beginPath();
        c.moveTo(lx - gw / 2, gy);
        c.lineTo(lx + gw / 2, gy);
        c.lineTo(lx + gw / 2 + sway, gy + gh);
        c.lineTo(lx - gw / 2 + sway, gy + gh + 2);
        c.fill();
      }
      // the basket at her feet
      c.fillStyle = '#9a7a4a';
      c.fillRect(w.x + f * 26 - 18, -24, 36, 24);
      c.fillStyle = '#d8d0c0';
      c.fillRect(w.x + f * 26 - 15, -30, 30, 7);
      void u;
    },
    beats: [],
  },

  // up a ladder, nailing plastic sheeting over a blown-out window
  ladder: {
    outfit: 'man2',
    period: 1.0,
    lift: 96,
    pose: loop([
      [0, { torso: 0.06, head: -0.3, armN: 2.5, foreN: 3.3, armF: 1.9, foreF: 2.3 }],
      [0.45, { torso: 0.1, head: -0.2, armN: 1.7, foreN: 2.4, armF: 1.9, foreF: 2.3 }],
      [0.55, { torso: 0.1, head: -0.2, armN: 1.65, foreN: 2.35, armF: 1.9, foreF: 2.3 }],
    ]),
    tool(c, h, p) {
      const a = p.foreN;
      const [dx, dy] = along(a, 1);
      c.strokeStyle = '#7a5a36';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(h[0] - dx * 4, h[1] - dy * 4);
      c.lineTo(h[0] + dx * 24, h[1] + dy * 24);
      c.stroke();
      c.save();
      c.translate(h[0] + dx * 24, h[1] + dy * 24);
      c.rotate(-a);
      c.fillStyle = '#3c3e42';
      c.fillRect(-8, -3, 16, 7);
      c.restore();
    },
    scene(c, w, u, t) {
      const f = w.f;
      // the ladder against the wall, the sheet over the window above it
      c.strokeStyle = '#8a6a40';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(w.x - f * 26, 0);
      c.lineTo(w.x + f * 24, -330);
      c.moveTo(w.x - f * 2, 0);
      c.lineTo(w.x + f * 48, -330);
      c.stroke();
      c.lineWidth = 3;
      for (let i = 1; i < 11; i++) {
        const k = i / 11;
        c.beginPath();
        c.moveTo(w.x - f * 26 + f * 50 * k, -330 * k);
        c.lineTo(w.x - f * 2 + f * 50 * k, -330 * k);
        c.stroke();
      }
      const sx = w.x + f * 70;
      const sw = Math.sin(t * 1.5) * 4;
      c.fillStyle = 'rgba(196,206,214,0.7)';
      c.beginPath();
      c.moveTo(sx - 46, -330);
      c.lineTo(sx + 46, -330);
      c.lineTo(sx + 46 + sw, -206);
      c.quadraticCurveTo(sx + sw * 0.5, -214, sx - 46 + sw, -206);
      c.fill();
      c.fillStyle = '#6a4e30';
      c.fillRect(sx - 48, -334, 96, 6);
      void u;
    },
    beats: [[0.47, 'tap']],
  },

  // filling jerrycans at a standpipe, one after another
  tap: {
    outfit: 'kid2',
    scale: 0.78,
    period: 5,
    pose: loop([
      [0, { ...POSES.squat, armN: 1.2, foreN: 1.3 }],
      [0.6, { ...POSES.squat, armN: 1.25, foreN: 1.35 }],
      [0.75, { torso: 0.3, armN: 0.4, foreN: 0.5 }],
      [0.9, { ...POSES.squat, armN: 1.1, foreN: 1.2 }],
    ]),
    scene(c, w, u, t) {
      const f = w.f;
      const px = w.x + f * 58;
      c.fillStyle = '#5a5e62';
      c.fillRect(px - 4, -86, 8, 86);
      c.fillRect(px - 4, -86, f * 22, 7);
      // the cans: full ones lined up, one filling under the spout
      for (let i = 0; i < 3; i++) {
        const cx = w.x - f * (40 + i * 34);
        c.fillStyle = ['#d9b12a', '#3a6a8a', '#d9b12a'][i];
        c.fillRect(cx - 12, -36, 24, 36);
      }
      const fx = px + f * 18;
      c.fillStyle = '#c9c2b2';
      c.fillRect(fx - 13, -38, 26, 38);
      if (u < 0.65) {
        c.strokeStyle = 'rgba(190,220,240,0.7)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(fx, -78);
        c.lineTo(fx + Math.sin(t * 20) * 0.6, -38);
        c.stroke();
      }
    },
    beats: [],
  },

  // pulling the cord of a generator that won't start, and again
  generator: {
    outfit: 'man',
    period: 3,
    pose: loop([
      [0, { torso: 0.6, head: 0.4, thighN: 0.5, shinN: -0.2, armN: 1.0, foreN: 1.1, armF: 0.8, foreF: 1.0 }],
      [0.12, { torso: 0.15, head: 0.1, thighN: 0.3, armN: -0.6, foreN: 0.2, armF: 0.8, foreF: 1.0 }],
      [0.4, { torso: 0.3, head: 0.3, armN: 0.3, foreN: 0.5, armF: 0.4, foreF: 0.6 }],
      [0.85, { torso: 0.6, head: 0.4, thighN: 0.5, shinN: -0.2, armN: 1.0, foreN: 1.1, armF: 0.8, foreF: 1.0 }],
    ]),
    scene(c, w, u, t) {
      const f = w.f;
      const gx = w.x + f * 60;
      c.fillStyle = '#b8402a';
      c.fillRect(gx - 34, -46, 68, 40);
      c.strokeStyle = '#2a2a2e';
      c.lineWidth = 3;
      c.strokeRect(gx - 38, -50, 76, 50);
      c.fillStyle = '#3a3a3e';
      c.fillRect(gx - 10, -40, 20, 26);
      // a cough of smoke after each pull
      const k = (u - 0.12) / 0.4;
      if (k > 0 && k < 1) {
        c.fillStyle = `rgba(80,80,84,${0.4 * (1 - k)})`;
        c.beginPath();
        c.arc(gx + f * 40, -40 - k * 40, 6 + k * 16, 0, TAU);
        c.fill();
      }
      void t;
    },
    beats: [[0.12, 'thump']],
  },

  // kneading dough in a tin basin on the doorstep
  knead: {
    outfit: 'woman',
    period: 1.4,
    pose: loop([
      [0, { ...POSES.kneel, torso: 0.45, head: 0.4, armN: 1.0, foreN: 1.2, armF: 0.9, foreF: 1.1 }],
      [0.5, { ...POSES.kneel, torso: 0.6, head: 0.5, armN: 1.2, foreN: 1.0, armF: 1.1, foreF: 0.9 }],
    ]),
    scene(c, w) {
      const f = w.f;
      const bx = w.x + f * 46;
      c.fillStyle = '#9aa0a4';
      c.beginPath();
      c.moveTo(bx - 30, -22);
      c.lineTo(bx + 30, -22);
      c.lineTo(bx + 22, 0);
      c.lineTo(bx - 22, 0);
      c.fill();
      c.fillStyle = '#e8dcc0';
      c.beginPath();
      c.ellipse(bx, -22, 22, 7, 0, Math.PI, TAU);
      c.fill();
    },
    beats: [],
  },

  // two neighbours at a doorway, talking with their hands
  chat: {
    outfit: 'man3',
    period: 4.5,
    pose: loop([
      [0, { torso: 0.04, head: 0.05, armN: 0.1, foreN: 0.3 }],
      [0.2, { torso: 0.08, head: 0.12, armN: 0.7, foreN: 1.6, armF: 0.2, foreF: 0.5 }],
      [0.35, { torso: 0.02, head: -0.05, armN: 0.9, foreN: 2.0, armF: 0.2, foreF: 0.5 }],
      [0.55, { torso: 0.04, head: 0.08, armN: 0.1, foreN: 0.3 }],
      [0.8, { torso: 0.0, head: 0.15, armN: -0.1, foreN: 0.15, armF: 0.05, foreF: 0.2 }],
    ]),
    beats: [],
  },

  // carrying cinder blocks from a pile to a wall going up, and back
  carry: {
    outfit: 'man2',
    walk: 200,
    period: 1,
    pose: null,
    tool(c, h, p, u, t, w) {
      if (!w.loaded) return;
      c.fillStyle = '#9c968a';
      c.fillRect(h[0] - 18, h[1] - 30, 36, 18);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(h[0] - 10, h[1] - 26, 7, 10);
      c.fillRect(h[0] + 3, h[1] - 26, 7, 10);
    },
    scene(c, w) {
      const [a, b] = w.span;
      // the pile, and the new wall, a course higher than yesterday
      c.fillStyle = '#9c968a';
      for (let i = 0; i < 6; i++) c.fillRect(a - 30 + (i % 3) * 22, -18 - Math.floor(i / 3) * 18, 20, 16);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) c.fillRect(b - 10 + i * 30 + (row % 2) * 15, -18 - row * 18, 28, 16);
    },
    beats: [],
  },
};

// ---------------------------------------------------------------- sounds --
function workSound(g, kind, x) {
  const dx = Math.abs(x - g.player.x);
  if (dx > 900 || !g.sound) return;
  const v = 1 - dx / 900;
  const pan = g.sound.panFor?.(x);
  const S = {
    dig: { dur: 0.18, freq: 420, q: 0.9, vol: 0.09, type: 'lowpass' },
    tap: { dur: 0.04, freq: 2200, q: 3, vol: 0.12 },
    swish: { dur: 0.3, freq: 2600, q: 0.6, vol: 0.025 },
    thump: { dur: 0.1, freq: 260, q: 1.2, vol: 0.12, type: 'lowpass' },
    rasp: { dur: 0.32, freq: 1800, q: 2.2, vol: 0.05 },
    kick: { dur: 0.05, freq: 600, q: 1.4, vol: 0.06, type: 'lowpass' },
  }[kind];
  if (S) g.sound.noise({ ...S, vol: S.vol * v, pan });
}

// ---------------------------------------------------------------- public --
export function populate(g, list) {
  const out = [];
  for (const [kind, x, o = {}] of list) {
    const T = TASKS[kind];
    if (!T) continue;
    const w = g.npc(o.outfit || T.outfit, x, { f: o.f ?? 1, scale: o.scale ?? T.scale ?? 1 });
    if (T.lift) {
      // standing up on something (a ladder's rung): held there, no gravity
      w.scripted = true;
      w.place(x, -T.lift);
    }
    if (o.look) w.rig.o = { ...w.rig.o, ...o.look };
    const ph = o.phase ?? Math.random();
    const period = (o.period ?? T.period) * (0.9 + Math.random() * 0.2);
    w.work = { kind, ph, period, prevU: 0, x0: x };
    if (T.walk) {
      // to and fro between a pile and the work, loaded one way
      w.span = o.f === -1 ? [x - T.walk, x] : [x, x + T.walk];
      w.span = [Math.min(...w.span), Math.max(...w.span)];
      w.loaded = false;
      w.brain = (dt) => {
        if (w.cower) return w.update(dt, { stance: 'crouch' });
        const [a, b] = w.span;
        const to = w.loaded ? b : a;
        if (w.goTo(to, dt, { speedScale: w.loaded ? 0.45 : 0.6 })) w.loaded = !w.loaded;
        w.override = w.loaded ? { ...ST, armN: 2.6, foreN: 3.4, armF: 2.5, foreF: 3.3, torso: 0.08 } : null;
      };
    } else {
      w.override = (t) => {
        if (w.cower) return { ...POSES.crouch, head: 0.1, armN: 2.4, foreN: 3.6, armF: 2.3, foreF: 3.5 };
        const u = (t / w.work.period + w.work.ph) % 1;
        // the sound of the work at its moments
        for (const [bu, snd] of T.beats || []) {
          const crossed = w.work.prevU <= bu ? u >= bu : u >= bu && u < w.work.prevU;
          if (crossed && u - w.work.prevU < 0.5) workSound(g, snd, w.x);
        }
        w.work.prevU = u;
        return T.pose(u);
      };
    }
    if (T.tool) {
      w.rig.prop = (c, hN) => {
        if (w.cower) return;
        const u = (w.time / w.work.period + w.work.ph) % 1;
        T.tool(c, hN, w.rig.pose || ST, u, w.time, w);
      };
    }
    if (T.scene) {
      const draw = w.draw.bind(w);
      w.draw = (c) => {
        const u = (w.time / w.work.period + w.work.ph) % 1;
        T.scene(c, w, w.cower ? 0 : u, w.time);
        draw(c);
      };
    }
    out.push(w);
  }
  g.workers = [...(g.workers || []), ...out];
  return out;
}

// Once a frame: in danger, everyone at work drops to a crouch where they are.
export function tickLife(g, danger) {
  for (const w of g.workers || []) w.cower = !!danger;
}

export const WORK = Object.keys(TASKS);
