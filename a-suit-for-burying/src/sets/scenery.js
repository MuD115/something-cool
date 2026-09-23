// Painted sets: every function paints through the renderer's layer API so it
// is lit, casts shadows or glows as appropriate.

import { rng, noise1, lerp } from '../engine/util.js';
import { smoothPath } from '../rigs/shapes.js';

// ---------------------------------------------------------------- sky ------

// Vertical gradient in screen space. stops: [[0…1, '#hex'], …]
export function skyGradient(R, stops) {
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, R.H);
    for (const [p, col] of stops) g.addColorStop(p, col);
    c.fillStyle = g;
    c.fillRect(0, 0, R.W, R.H);
    c.restore();
  });
}

export function stars(R, amount, seed = 3) {
  if (amount <= 0) return;
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const r = rng(seed);
    for (let i = 0; i < 260; i++) {
      const x = r() * R.W;
      const y = r() * R.H * 0.6;
      const b = r();
      c.fillStyle = `rgba(230,235,255,${amount * (0.2 + b * 0.8) * (1 - y / (R.H * 0.6))})`;
      c.fillRect(x, y, b > 0.9 ? 2 : 1.2, b > 0.9 ? 2 : 1.2);
    }
    c.restore();
  });
}

export function sun(R, x, y, radius, color, depth = 0.05) {
  R.layer(depth);
  R.sky((c) => {
    const g = c.createRadialGradient(x, y, 0, x, y, radius * 5);
    g.addColorStop(0, color);
    g.addColorStop(0.18, color);
    g.addColorStop(0.22, 'rgba(255,190,120,0.35)');
    g.addColorStop(1, 'rgba(255,140,80,0)');
    c.fillStyle = g;
    c.fillRect(x - radius * 5, y - radius * 5, radius * 10, radius * 10);
  });
  R.layer(1);
}

// Soft cloud banks drawn over the sky.
export function clouds(R, { seed = 1, y = -500, color = 'rgba(60,40,60,0.6)', count = 8, depth = 0.1, spread = 3000, t = 0, drift = 4 }) {
  R.layer(depth);
  R.sky((c) => {
    const r = rng(seed);
    c.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const cx = (r() - 0.5) * spread + ((t * drift) % spread);
      const cy = y + (r() - 0.5) * 120;
      const w = 200 + r() * 420;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const ox = (k / 5 - 0.5) * w;
        c.ellipse(cx + ox, cy - Math.sin((k / 5) * Math.PI) * 26, w * 0.22, 24 + r() * 26, 0, 0, Math.PI * 2);
      }
      c.fill();
    }
  });
  R.layer(1);
}

// ------------------------------------------------------------- terrain -----

// A ridge line of hills or mountains filling down from its crest.
export function ridge(R, { depth = 0.3, base = 0, height = 200, freq = 0.004, rough = 0.5, seed = 0, color = '#2a2230', haze = null, mesa = false, cast = false }) {
  R.layer(depth);
  const cam = R.cam;
  const span = 700 * Math.pow(cam.view / 1400, depth) + 300;
  const x0 = cam.x * depth - span;
  const x1 = cam.x * depth + span;
  const f = (x) => {
    let n = noise1(x * freq + seed) * 0.6 + noise1(x * freq * 2.3 + seed * 3) * 0.3 * rough + noise1(x * freq * 6 + seed * 7) * 0.12 * rough;
    if (mesa) n = n > 0.05 ? 0.35 + n * 0.1 : n * 0.9 - 0.2;
    return base - height * (0.55 + 0.5 * n);
  };
  const path = (c) => {
    c.beginPath();
    c.moveTo(x0, base + 3000);
    for (let x = x0; x <= x1; x += 14) c.lineTo(x, f(x));
    c.lineTo(x1, base + 3000);
    c.closePath();
  };
  const draw = (c) => {
    path(c);
    c.fillStyle = color;
    c.fill();
  };
  if (cast) R.cast(draw);
  else R.paint(draw);
  // Atmospheric haze: distant ranges scatter a little sky light back at us.
  if (haze) {
    R.glow((c) => {
      path(c);
      c.globalAlpha = haze[1];
      c.fillStyle = haze[0];
      c.fill();
    });
  }
  R.layer(1);
  return f;
}

export function ground(R, y, color, depth = 1, top = null) {
  R.layer(depth);
  R.paint((c) => {
    c.fillStyle = color;
    c.fillRect(R.cam.x * depth - 6000, y, 12000, 4000);
    if (top) {
      c.fillStyle = top;
      c.fillRect(R.cam.x * depth - 6000, y, 12000, 5);
    }
  });
  R.layer(1);
}

// Dry grass tufts along the ground line.
export function grass(R, { y = 0, x0 = -2000, x1 = 2000, seed = 5, color = '#3a2a1a', density = 0.06, height = 26, t = 0, wind = 1, cast = false }) {
  const draw = (c) => {
    const r = rng(seed);
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    for (let x = x0; x < x1; x += 1 / density) {
      const gx = x + r() * 12;
      const h = height * (0.4 + r());
      const sway = Math.sin(t * 1.3 + gx * 0.02) * 4 * wind;
      for (let k = -1; k <= 1; k++) {
        c.moveTo(gx + k * 3, y + 2);
        c.quadraticCurveTo(gx + k * 4 + sway * 0.5, y - h * 0.5, gx + k * 7 + sway, y - h * (0.8 + r() * 0.3));
      }
    }
    c.stroke();
  };
  if (cast) R.cast(draw);
  else R.paint(draw);
}

// --------------------------------------------------------------- props -----

const treeCache = new Map();

function buildTree(seed) {
  const r = rng(seed);
  const segs = [];
  const leaves = [];
  const grow = (x, y, ang, len, w, depth) => {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    segs.push([x, y, x2, y2, w, w * 0.72, depth]);
    if (depth >= 6 || len < 18) {
      for (let i = 0; i < 3; i++) leaves.push([x2 + (r() - 0.5) * 40, y2 + (r() - 0.5) * 30, 26 + r() * 30, r() * 6]);
      return;
    }
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = depth === 0 ? 0.9 : 0.75;
      const a = ang + (i / (n - 1 || 1) - 0.5) * spread * 2 + (r() - 0.5) * 0.5;
      grow(x2, y2, a, len * (0.68 + r() * 0.18), w * 0.66, depth + 1);
    }
  };
  grow(0, 0, -Math.PI / 2 + 0.08, 150, 34, 0);
  return { segs, leaves };
}

// A lone oak. It casts shadows and breaks sunlight into shafts.
export function oak(R, x, y, { seed = 7, scale = 1, t = 0, leafColor = '#1e1a16', barkColor = '#221b15', bare = false } = {}) {
  if (!treeCache.has(seed)) treeCache.set(seed, buildTree(seed));
  const tree = treeCache.get(seed);
  R.cast((c) => {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.lineCap = 'round';
    for (const [x0, y0, x1, y1, w0, w1, d] of tree.segs) {
      const sway = d > 2 ? Math.sin(t * 0.9 + d) * (d - 2) * 0.8 : 0;
      c.strokeStyle = barkColor;
      c.lineWidth = (w0 + w1) / 2;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1 + sway, y1);
      c.stroke();
    }
    if (!bare) {
      c.fillStyle = leafColor;
      for (const [lx, ly, lr, ph] of tree.leaves) {
        const sway = Math.sin(t * 0.8 + ph) * 3;
        c.beginPath();
        c.ellipse(lx + sway, ly, lr, lr * 0.72, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    // roots flare
    c.fillStyle = barkColor;
    c.beginPath();
    c.moveTo(-40, 2);
    c.quadraticCurveTo(-14, -8, -16, -40);
    c.lineTo(16, -40);
    c.quadraticCurveTo(14, -8, 44, 2);
    c.closePath();
    c.fill();
    c.restore();
  });
}

export function grave(R, x, y, { tilt = -0.05 } = {}) {
  R.paint((c) => {
    c.fillStyle = '#2a1f17';
    c.beginPath();
    c.ellipse(x + 50, y + 2, 70, 12, 0, Math.PI, 0);
    c.fill();
  });
  R.cast((c) => {
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.fillStyle = '#4a3a2a';
    c.fillRect(-5, -92, 10, 94);
    c.fillRect(-26, -72, 52, 9);
    c.restore();
  });
  // a few wildflowers laid at the foot
  R.paint((c) => {
    c.fillStyle = '#8a7a58';
    for (let i = 0; i < 5; i++) c.fillRect(x + 14 + i * 6, y - 3 - (i % 2) * 2, 3, 3);
  });
}

export function fence(R, x0, x1, y, { broken = [], color = '#3b2d20' } = {}) {
  R.cast((c) => {
    c.fillStyle = color;
    for (let x = x0, i = 0; x <= x1; x += 110, i++) {
      const lean = broken.includes(i) ? 0.25 : 0.02 * Math.sin(i * 7);
      c.save();
      c.translate(x, y);
      c.rotate(lean);
      c.fillRect(-4, -82, 8, 84);
      c.restore();
    }
    for (const ry of [-70, -40]) {
      c.save();
      c.fillRect(x0, y + ry, x1 - x0, 5);
      c.restore();
    }
  });
}

export function cornField(R, x0, x1, y, { seed = 11, t = 0, color = '#5a4a2a' } = {}) {
  R.cast((c) => {
    const r = rng(seed);
    c.strokeStyle = color;
    c.lineCap = 'round';
    for (let x = x0; x < x1; x += 26 + r() * 10) {
      const h = 70 + r() * 50;
      const lean = (r() - 0.5) * 0.4 + Math.sin(t + x * 0.01) * 0.04;
      const tx = x + Math.sin(lean) * h;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(tx, y - h);
      c.stroke();
      c.lineWidth = 1.8;
      for (let k = 1; k < 4; k++) {
        const px = lerp(x, tx, k / 4);
        const py = y - (h * k) / 4;
        const s = k % 2 ? 1 : -1;
        c.beginPath();
        c.moveTo(px, py);
        c.quadraticCurveTo(px + s * 18, py - 6, px + s * 26, py + 10 + r() * 8);
        c.stroke();
      }
    }
  });
}

export function farmhouse(R, x, y, { lit = 1, t = 0 } = {}) {
  const W = 300;
  const H = 170;
  R.cast((c) => {
    c.fillStyle = '#3a2e24';
    c.fillRect(x, y - H, W, H);
    // boards
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2;
    for (let yy = y - H + 14; yy < y; yy += 14) {
      c.beginPath();
      c.moveTo(x, yy);
      c.lineTo(x + W, yy);
      c.stroke();
    }
    // roof
    c.fillStyle = '#2a211b';
    c.beginPath();
    c.moveTo(x - 30, y - H + 4);
    c.lineTo(x + W / 2, y - H - 110);
    c.lineTo(x + W + 30, y - H + 4);
    c.closePath();
    c.fill();
    c.fillRect(x + W * 0.7, y - H - 90, 24, 70); // chimney
    // porch roof and posts
    c.fillStyle = '#2f251d';
    c.fillRect(x - 70, y - 118, 90, 10);
    c.fillRect(x - 66, y - 110, 6, 110);
    // door
    c.fillStyle = '#211913';
    c.fillRect(x + 22, y - 104, 44, 104);
    // step
    c.fillStyle = '#2d241c';
    c.fillRect(x - 70, y - 8, 140, 8);
    // window frame
    c.fillStyle = '#1a1411';
    c.fillRect(x + 150, y - 118, 66, 56);
  });
  if (lit > 0) {
    const fl = 0.85 + 0.15 * noise1(t * 6);
    R.glow((c) => {
      c.fillStyle = `rgba(255,${150 + 40 * fl},${70},${lit * fl})`;
      c.fillRect(x + 155, y - 113, 26, 20);
      c.fillRect(x + 185, y - 113, 26, 20);
      c.fillRect(x + 155, y - 89, 26, 22);
      c.fillRect(x + 185, y - 89, 26, 22);
    });
  }
  return { window: [x + 183, y - 90], door: [x + 44, y] };
}

export function signpost(R, x, y, lines) {
  R.cast((c) => {
    c.fillStyle = '#3a2b1e';
    c.fillRect(x - 6, y - 200, 12, 202);
    c.save();
    c.translate(x, y - 170);
    c.rotate(-0.04);
    c.fillStyle = '#6a5a44';
    c.fillRect(-130, -46, 260, 92);
    c.restore();
  });
  R.paint((c) => {
    c.save();
    c.translate(x, y - 170);
    c.rotate(-0.04);
    c.fillStyle = '#1c140e';
    c.textAlign = 'center';
    lines.forEach((ln, i) => {
      c.font = i === 0 ? '24px "IM Fell English SC", Georgia, serif' : '12.5px "Special Elite", "Courier New", monospace';
      c.fillText(ln, 0, -18 + i * 19 + (i > 0 ? 6 : 0));
    });
    c.restore();
  });
}

export function splitRock(R, x, y, scale = 1) {
  R.cast((c) => {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.fillStyle = '#4a3528';
    c.beginPath();
    smoothPath(c, [[-160, 0], [-150, -90], [-90, -170], [-24, -186], [-10, -60], [-20, 0]], true, 0.6);
    c.fill();
    c.beginPath();
    smoothPath(c, [[10, 0], [4, -70], [22, -176], [90, -160], [150, -80], [170, 0]], true, 0.6);
    c.fill();
    c.restore();
  });
}

// Scrub and rocks sweeping past in the foreground (depth > 1).
export function foreground(R, { depth = 1.6, y = 60, seed = 21, color = '#0e0a08', count = 14, spread = 5000 }) {
  R.layer(depth);
  R.paint((c) => {
    const r = rng(seed);
    c.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * spread;
      const w = 60 + r() * 160;
      const h = 30 + r() * 90;
      c.beginPath();
      if (r() > 0.5) {
        smoothPath(c, [[x - w / 2, y + 100], [x - w * 0.4, y - h * 0.6], [x, y - h], [x + w * 0.4, y - h * 0.5], [x + w / 2, y + 100]], true, 0.8);
      } else {
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI + (k / 8) * Math.PI;
          c.moveTo(x, y + 20);
          c.lineTo(x + Math.cos(a) * h * 1.2, y + Math.sin(a) * h * 1.1);
        }
        c.strokeStyle = color;
        c.lineWidth = 3;
        c.stroke();
        continue;
      }
      c.fill();
    }
  });
  R.layer(1);
}

// ---------------------------------------------------------------- barn -----

export function barnInterior(R, { t = 0, doorOpen = 1, moon = 0.6 } = {}) {
  // back wall of vertical planks, with gaps letting in moonlight
  R.paint((c) => {
    const r = rng(41);
    for (let x = -1400; x < 1400; x += 44) {
      const v = 0.8 + r() * 0.35;
      c.fillStyle = `rgb(${(92 * v) | 0},${(66 * v) | 0},${(44 * v) | 0})`;
      c.fillRect(x, -760, 42, 760);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(x + 12 + r() * 16, -700 + r() * 500, 3, 18 + r() * 30); // knots
    }
    // floor
    c.fillStyle = '#2b2016';
    c.fillRect(-1400, 0, 2800, 600);
    c.fillStyle = '#3a2c1f';
    c.fillRect(-1400, 0, 2800, 6);
    // hay pile
    c.fillStyle = '#7a6036';
    c.beginPath();
    smoothPath(c, [[520, 2], [560, -70], [640, -110], [760, -96], [860, -40], [900, 2]], true, 0.8);
    c.fill();
  });
  // a small high window to the night
  R.glow((c) => {
    c.fillStyle = `rgba(90,120,170,${moon})`;
    c.fillRect(640, -600, 90, 70);
  });
  R.paint((c) => {
    c.fillStyle = '#1a120c';
    c.fillRect(682, -600, 6, 70);
    c.fillRect(640, -568, 90, 6);
  });
  // posts, beam, stall and tack on pegs: all cast shadows onto the wall
  R.cast((c) => {
    c.fillStyle = '#2e2117';
    for (const px of [-640, -40, 560]) c.fillRect(px - 16, -760, 32, 762);
    c.fillRect(-1400, -430, 2800, 26);
  });
  // coiled rope and a hanging bridle: too thin to cast well, so just painted
  R.paint((c) => {
    c.strokeStyle = '#3a2a1c';
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(-400, -300, 30, 38, 0, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(300, -330);
    c.quadraticCurveTo(290, -250, 320, -230);
    c.stroke();
  });
}

// Stall boards stand in front of the horse, so they're drawn after it.
export function barnStall(R) {
  R.cast((c) => {
    c.fillStyle = '#3d2c1e';
    c.fillRect(40, -130, 360, 14);
    c.fillRect(40, -80, 360, 14);
    c.fillRect(392, -150, 16, 152);
  });
}

export function trunk(R, x, y, { open = 0 } = {}) {
  R.cast((c) => {
    c.fillStyle = '#3e2a1a';
    c.fillRect(x - 70, y - 64, 140, 64);
    c.fillStyle = '#26190f';
    c.fillRect(x - 70, y - 40, 140, 5);
    c.fillStyle = '#6a5436';
    c.fillRect(x - 6, y - 60, 12, 10); // clasp
    // lid hinged at the back edge
    c.save();
    c.translate(x - 70, y - 64);
    c.rotate(-open * 1.9);
    c.fillStyle = '#4a321f';
    c.fillRect(0, -16, 140, 16);
    c.restore();
  });
  if (open > 0.3) {
    R.paint((c) => {
      c.fillStyle = '#140d08';
      c.fillRect(x - 64, y - 64, 128, 6);
    });
  }
}

export function lantern(R, x, y, { lit = 1, t = 0 } = {}) {
  const fl = lit * (0.82 + 0.1 * noise1(t * 9) + 0.08 * noise1(t * 23));
  R.cast((c) => {
    c.strokeStyle = '#1a140e';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y - 22, 8, Math.PI, 0);
    c.stroke();
    c.fillStyle = '#231a12';
    c.fillRect(x - 11, y - 16, 22, 5);
    c.fillRect(x - 11, y + 14, 22, 5);
    c.fillRect(x - 11, y - 12, 2, 26);
    c.fillRect(x + 9, y - 12, 2, 26);
  });
  if (lit > 0) {
    R.glow((c) => {
      const g = c.createRadialGradient(x, y + 2, 0, x, y + 2, 14);
      g.addColorStop(0, `rgba(255,240,200,${fl})`);
      g.addColorStop(0.5, `rgba(255,170,70,${fl * 0.8})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g;
      c.fillRect(x - 14, y - 12, 28, 28);
    });
  }
  return fl;
}

// ----------------------------------------------------------- weather -------

export function rain(R, t, amount = 1, wind = 0.25) {
  if (amount <= 0) return;
  R.glow((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const r = rng(77);
    c.strokeStyle = `rgba(170,190,215,${0.16 * amount})`;
    c.lineWidth = 1.2;
    c.beginPath();
    const n = (500 * amount) | 0;
    for (let i = 0; i < n; i++) {
      const sp = 900 + r() * 500;
      const x0 = r() * (R.W + 200) - 100;
      const y = ((r() * R.H + t * sp) % (R.H + 60)) - 30;
      const x = (x0 + t * sp * wind) % (R.W + 200) - 100;
      c.moveTo(x, y);
      c.lineTo(x - 18 * wind * 2, y - 26);
    }
    c.stroke();
    c.restore();
  });
}

// A jagged bolt from the clouds to (x, y). Returns nothing; add a flash too.
export function lightningBolt(R, x, y, seed, strength) {
  if (strength <= 0.02) return;
  R.layer(0.4);
  R.glow((c) => {
    const r = rng(seed);
    const pts = [[x + (r() - 0.5) * 200, y - 900]];
    for (let i = 1; i <= 14; i++) pts.push([lerp(pts[0][0], x, i / 14) + (r() - 0.5) * 70, lerp(pts[0][1], y, i / 14)]);
    c.lineCap = 'round';
    for (const [w, a] of [[16, 0.15], [6, 0.5], [2.5, 1]]) {
      c.strokeStyle = `rgba(210,225,255,${a * strength})`;
      c.lineWidth = w;
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.stroke();
    }
  });
  R.layer(1);
}

// A flooded river: dark water with moving highlights, drawn over whatever
// stands in it so legs and bodies disappear below the surface.
export function river(R, y, t, { flash = 0, x0 = -3000, x1 = 3000, rush = 1 } = {}) {
  R.cover((c) => {
    c.fillStyle = '#0d1418';
    c.fillRect(x0, y, x1 - x0, 1200);
  });
  R.glow((c) => {
    const r = rng(90);
    c.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const row = r();
      const yy = y + 4 + row * row * 260;
      const speed = 90 * rush * (1 + r());
      const len = 30 + r() * 90;
      const xx = x0 + ((r() * (x1 - x0) + t * speed) % (x1 - x0));
      const a = (0.1 + 0.25 * r()) * (1 - row * 0.7) + flash * 0.4;
      c.strokeStyle = `rgba(${140 + flash * 100},${170 + flash * 70},${200 + flash * 55},${a})`;
      c.lineWidth = 1.5 + (1 - row) * 1.5;
      c.beginPath();
      c.moveTo(xx, yy + Math.sin(t * 3 + i) * 2);
      c.lineTo(xx + len, yy + Math.sin(t * 3 + i + 1) * 2);
      c.stroke();
    }
  });
}

// Foam boiling around something standing in the current.
export function foam(R, x, y, w, t, amount = 1) {
  R.glow((c) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      const px = x + Math.cos(a) * w * 0.5 + Math.sin(t * 5 + i) * 6;
      c.fillStyle = `rgba(190,205,215,${0.18 * amount})`;
      c.beginPath();
      c.ellipse(px, y + Math.sin(t * 7 + i * 2) * 3, 16, 5, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

export function townLights(R, x, y, t, depth = 0.35) {
  R.layer(depth);
  R.paint((c) => {
    const r = rng(55);
    c.fillStyle = '#0c0b10';
    for (let i = 0; i < 22; i++) {
      const bx = x + i * 38 + r() * 10;
      const h = 30 + r() * 50;
      c.fillRect(bx, y - h, 30 + r() * 14, h + 40);
    }
    c.fillRect(x + 260, y - 120, 12, 90); // church steeple
    c.beginPath();
    c.moveTo(x + 252, y - 118);
    c.lineTo(x + 266, y - 150);
    c.lineTo(x + 280, y - 118);
    c.fill();
  });
  R.glow((c) => {
    const r2 = rng(56);
    for (let i = 0; i < 30; i++) {
      const fl = 0.7 + 0.3 * noise1(t * 2 + i * 5);
      c.fillStyle = `rgba(255,${150 + r2() * 60},70,${0.8 * fl})`;
      c.fillRect(x + r2() * 860, y - 10 - r2() * 60, 4, 5);
    }
  });
  R.layer(1);
}

