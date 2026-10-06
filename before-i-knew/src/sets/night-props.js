// Night props: the basement door with a wedding behind it, and the
// courtyard garden somebody still waters.
// Same idiom as the rest of the sets: paint = lit, cast = lit and shadowed,
// glow = light that is its own, surface = a material laid over the colour.
// Shapes come from seeded rng, so nothing shivers between frames.

import { rng, clamp, lerp, smooth, noise1, mixc, rgb } from '../engine/util.js';
import { extrudePoly, extrudeRect } from './depth.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------ basement --

// Door geometry, shared by the door and by what is seen through it.
// x is the middle of the doorway; the sill is at y = +40, below the street.
const DOOR_W = 52;
const DOOR_TOP = -52;
const SILL = 40;

// The leaf is hinged on the left and swings out towards us, so it narrows
// as it opens. The crack it leaves is on the right.
function crack(x, open) {
  const o = clamp(open);
  const leafW = DOOR_W * (1 - 0.55 * o);
  const left = x - DOOR_W / 2 + leafW;
  return { left, right: x + DOOR_W / 2, leafW, w: x + DOOR_W / 2 - left };
}

// The well and its door were drawn small; they're drawn here through a
// renderer that scales every layer about the doorway's foot, so a man would
// fit the door (about 94 x 166, the lower part sunk below the street).
const DOOR_SCALE = 1.8;
function scaledR(R, x, k) {
  const wrap = (fn) => (c, ...rest) => {
    c.save();
    c.translate(x, 0);
    c.scale(k, k);
    c.translate(-x, 0);
    const v = fn(c, ...rest);
    c.restore();
    return v;
  };
  return new Proxy(R, {
    get(t, key) {
      const v = t[key];
      if (typeof v !== 'function') return v;
      return (...args) => v.apply(t, args.map((a) => (typeof a === 'function' ? wrap(a) : a)));
    },
  });
}

const flicker = (t, s = 0) => clamp(0.82 + Math.sin(t * 7.1 + s) * 0.07 + Math.sin(t * 13.7 + s * 2.1) * 0.05 + noise1(t * 5 + s) * 0.06, 0.45, 1.1);

// Four concrete steps down into a narrow well beside the building, a low
// parapet at the far end, and a rail along the street edge. At night the
// well is the darkest place on the street, until the door opens.
// Call weddingGlimpse straight after this one, with the same x and open.
export function basementDoor(R0, x, { open = 0, t = 0 } = {}) {
  const R = scaledR(R0, x, DOOR_SCALE);
  const o = clamp(open);
  const g = crack(x, o);
  const fl = flicker(t);
  const xl = x - 126; // where the well begins
  const xr = x + 58; // the end wall

  // the building's foot, seen down into the well, and the earth under the steps
  R.paint((c) => {
    c.fillStyle = '#2b2824';
    c.fillRect(xl, 0, xr - xl, SILL + 6);
  });
  R.surface((c) => c.rect(xl, 0, xr - xl, SILL + 6), 'concrete', { seed: 61, alpha: 0.6 });
  // damp streaks down the wall under the rail
  R.paint((c) => {
    const r = rng(7);
    for (let i = 0; i < 6; i++) {
      const sx = xl + 70 + r() * (xr - xl - 80);
      c.fillStyle = `rgba(10,12,12,${0.18 + r() * 0.16})`;
      c.fillRect(sx, 0, 2 + r() * 3, 12 + r() * 26);
    }
  });

  // the steps: tread tops at 10, 20, 30, then the landing at the sill
  R.cast((c) => {
    // the flight is 18 deep: each tread shows its top, the end wall its far side
    extrudePoly(c, [[xl, 0], [xl, 10], [xl + 22, 10], [xl + 22, 20], [xl + 44, 20], [xl + 44, 30], [xl + 66, 30], [xl + 66, SILL], [xr, SILL], [xr, SILL + 8], [xl, SILL + 8]], 18, { top: '#7c786d', side: '#24221f' });
    c.fillStyle = '#58554e';
    c.beginPath();
    c.moveTo(xl, 0);
    c.lineTo(xl, 10);
    c.lineTo(xl + 22, 10);
    c.lineTo(xl + 22, 20);
    c.lineTo(xl + 44, 20);
    c.lineTo(xl + 44, 30);
    c.lineTo(xl + 66, 30);
    c.lineTo(xl + 66, SILL);
    c.lineTo(xr, SILL);
    c.lineTo(xr, SILL + 8);
    c.lineTo(xl, SILL + 8);
    c.closePath();
    c.fill();
  });
  R.surface(
    (c) => {
      c.moveTo(xl, 0);
      c.lineTo(xl, 10);
      c.lineTo(xl + 22, 10);
      c.lineTo(xl + 22, 20);
      c.lineTo(xl + 44, 20);
      c.lineTo(xl + 44, 30);
      c.lineTo(xl + 66, 30);
      c.lineTo(xl + 66, SILL);
      c.lineTo(xr, SILL);
      c.lineTo(xr, SILL + 8);
      c.lineTo(xl, SILL + 8);
      c.closePath();
    },
    'concrete',
    { seed: 62, scale: 1.2 }
  );
  // worn nosings, a chipped corner, leaves blown into the well
  R.paint((c) => {
    c.fillStyle = 'rgba(200,196,184,0.22)';
    for (let i = 0; i < 3; i++) c.fillRect(xl + i * 22, 10 + i * 10, 22, 1.4);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 3; i++) c.fillRect(xl + 22 + i * 22 - 1.5, 11 + i * 10, 1.5, 9);
    c.fillStyle = '#4b4a2a';
    c.beginPath();
    c.ellipse(xl + 80, SILL - 1.5, 5, 1.6, 0.2, 0, TAU);
    c.ellipse(xl + 90, SILL - 1, 3.5, 1.2, -0.3, 0, TAU);
    c.fill();
  });

  // the crack: the room's glow in it, and the light going up the steps
  if (o > 0.02) {
    const k = smooth(0, 0.7, o) * (0.9 + 0.1 * fl);
    R.glow((c) => {
      // along the well: a wedge of light lying on the landing and the steps
      const fan = c.createLinearGradient(g.left, 0, xl, 0);
      fan.addColorStop(0, `rgba(255,170,80,${0.3 * k})`);
      fan.addColorStop(0.7, `rgba(255,150,60,${0.1 * k})`);
      fan.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = fan;
      c.beginPath();
      c.moveTo(g.left, DOOR_TOP + 30);
      c.lineTo(xl, -10);
      c.lineTo(xl, 12);
      c.lineTo(xl + 22, 12);
      c.lineTo(xl + 22, 22);
      c.lineTo(xl + 44, 22);
      c.lineTo(xl + 44, 32);
      c.lineTo(xl + 66, 32);
      c.lineTo(g.left, SILL);
      c.closePath();
      c.fill();

      // up out of the well and onto the street
      const up = c.createRadialGradient(x - 30, 0, 4, x - 30, -40, 130);
      up.addColorStop(0, `rgba(255,175,90,${0.34 * k})`);
      up.addColorStop(0.5, `rgba(255,150,70,${0.12 * k})`);
      up.addColorStop(1, 'rgba(255,150,70,0)');
      c.fillStyle = up;
      c.beginPath();
      c.moveTo(xl, 0);
      c.lineTo(xl - 30, -150);
      c.lineTo(xr + 20, -150);
      c.lineTo(xr, 0);
      c.closePath();
      c.fill();

      // a pool on the paving, flattened
      c.save();
      c.translate(x - 30, 2);
      c.scale(1, 0.14);
      const pool = c.createRadialGradient(0, 0, 4, 0, 0, 170);
      pool.addColorStop(0, `rgba(255,170,80,${0.45 * k})`);
      pool.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = pool;
      c.beginPath();
      c.arc(0, 0, 170, 0, TAU);
      c.fill();
      c.restore();
    });
  }


  // the doorway: concrete lintel and jambs
  R.cast((c) => {
    c.fillStyle = '#5e5b54';
    c.fillRect(x - DOOR_W / 2 - 7, DOOR_TOP - 8, DOOR_W + 14, 8);
    c.fillRect(x - DOOR_W / 2 - 7, DOOR_TOP, 7, SILL - DOOR_TOP);
    c.fillRect(x + DOOR_W / 2, DOOR_TOP, 7, SILL - DOOR_TOP);
  });
  R.surface((c) => c.rect(x - DOOR_W / 2 - 7, DOOR_TOP - 8, DOOR_W + 14, SILL - DOOR_TOP + 8), 'concrete', { seed: 63 });

  // behind the leaf: black, then (as it opens) the lamplight on the room's walls
  R.paint((c) => {
    c.fillStyle = '#0c0907';
    c.fillRect(x - DOOR_W / 2, DOOR_TOP, DOOR_W, SILL - DOOR_TOP);
  });

  // the crack: the room's glow in it (the glimpse draws over this)
  if (o > 0.02) {
    const k = smooth(0, 0.7, o) * (0.9 + 0.1 * fl);
    R.glow((c) => {
      // the room on the other side of the gap (the glimpse draws over this)
      const gg = c.createLinearGradient(0, DOOR_TOP, 0, SILL);
      gg.addColorStop(0, `rgba(255,170,80,${0.34 * k})`);
      gg.addColorStop(1, `rgba(255,190,110,${0.5 * k})`);
      c.fillStyle = gg;
      c.fillRect(g.left, DOOR_TOP, g.w, SILL - DOOR_TOP);

    });
  }

  // the leaf: painted steel, dented, rusting from the foot
  const hx = x - DOOR_W / 2;
  const fh = 7 * o; // the free edge comes towards us, so stands taller
  const ex = hx + g.leafW;
  const leaf = (c) => {
    c.moveTo(hx, DOOR_TOP);
    c.lineTo(ex, DOOR_TOP - fh);
    c.lineTo(ex, SILL + fh * 0.2);
    c.lineTo(hx, SILL);
    c.closePath();
  };
  const u = (k) => hx + g.leafW * k; // a fraction of the way across the leaf
  R.cast((c) => {
    c.fillStyle = '#4a5c55';
    c.beginPath();
    leaf(c);
    c.fill();
  });
  R.surface(leaf, 'rust', { seed: 64, alpha: 0.55, scale: 1.1 });
  R.paint((c) => {
    const r = rng(19);
    c.save();
    c.beginPath();
    leaf(c);
    c.clip();
    // stiffening ribs, top and bottom panels
    c.strokeStyle = 'rgba(0,0,0,0.38)';
    c.lineWidth = 1.5;
    c.strokeRect(u(0.1), DOOR_TOP + 9, g.leafW * 0.8, 36);
    c.strokeRect(u(0.1), DOOR_TOP + 52, g.leafW * 0.8, 34);
    c.strokeStyle = 'rgba(190,200,190,0.18)';
    c.lineWidth = 1;
    c.strokeRect(u(0.1) + 1.2, DOOR_TOP + 10.2, g.leafW * 0.8, 36);
    c.strokeRect(u(0.1) + 1.2, DOOR_TOP + 53.2, g.leafW * 0.8, 34);
    // dents: a soft dark pool with a lit lip
    for (let i = 0; i < 5; i++) {
      const dx = u(0.15 + r() * 0.7);
      const dy = DOOR_TOP + 10 + r() * 76;
      const rw = (5 + r() * 7) * (g.leafW / DOOR_W);
      const rh = 4 + r() * 7;
      c.fillStyle = 'rgba(0,0,0,0.11)';
      c.beginPath();
      c.ellipse(dx, dy, rw, rh * 1.35, r() * 1.4 - 0.7, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(200,205,195,0.16)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(dx, dy, rw, rh * 1.35, 0, 0.3, 2.2);
      c.stroke();
    }
    // rust blooming up from the foot and round the handle
    const rg = c.createLinearGradient(0, SILL - 30, 0, SILL);
    rg.addColorStop(0, 'rgba(110,52,24,0)');
    rg.addColorStop(1, 'rgba(110,52,24,0.55)');
    c.fillStyle = rg;
    c.fillRect(hx, SILL - 30, g.leafW, 30);
    c.fillStyle = 'rgba(105,50,22,0.35)';
    c.beginPath();
    c.ellipse(u(0.8), DOOR_TOP + 46, 6 * (g.leafW / DOOR_W), 9, 0, 0, TAU);
    c.fill();
    c.restore();
    // hinges
    c.fillStyle = '#23262a';
    c.fillRect(hx - 2, DOOR_TOP + 8, 4, 8);
    c.fillRect(hx - 2, SILL - 20, 4, 8);
    // a lever handle and a bolt
    c.fillStyle = '#1d2024';
    c.fillRect(u(0.78), DOOR_TOP + 48, Math.max(3, g.leafW * 0.14), 3);
    c.fillRect(u(0.84), DOOR_TOP + 40, 2, 20);
  });

  // light that gets out around a shut door: the foot, the jambs, the head
  if (o < 0.98) {
    const k = (1 - smooth(0, 0.5, o)) * fl;
    R.glow((c) => {
      c.fillStyle = `rgba(255,170,80,${0.85 * k})`;
      c.fillRect(x - DOOR_W / 2 + 1, SILL - 2.2, DOOR_W - 2, 2.2);
      c.fillStyle = `rgba(255,170,80,${0.5 * k})`;
      c.fillRect(x - DOOR_W / 2, DOOR_TOP + 2, 1.2, SILL - DOOR_TOP - 4);
      c.fillRect(x + DOOR_W / 2 - 1.2, DOOR_TOP + 2, 1.2, SILL - DOOR_TOP - 4);
      c.fillRect(x - DOOR_W / 2 + 1, DOOR_TOP, DOOR_W - 2, 1);
      // and a little of it on the landing, where it gets out under the door
      const lg = c.createRadialGradient(x, SILL, 2, x, SILL, 46);
      lg.addColorStop(0, `rgba(255,150,60,${0.3 * k})`);
      lg.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = lg;
      c.save();
      c.translate(x, SILL);
      c.scale(1, 0.18);
      c.translate(-x, -SILL);
      c.beginPath();
      c.arc(x, SILL, 46, 0, TAU);
      c.fill();
      c.restore();
    });
  }

  // the parapet at the far end of the well, and a rail along its street edge
  R.cast((c) => {
    // the parapet is a brick-and-a-half thick (16), the coping a little proud
    extrudeRect(c, xr - 2, -34, 17, 34 + SILL + 8, 16, { color: '#625f57' });
    extrudeRect(c, xr - 4, -38, 21, 5, 18, { color: '#6e6b62' });
    c.fillStyle = '#625f57';
    c.fillRect(xr - 2, -34, 17, 34 + SILL + 8);
    c.fillStyle = '#6e6b62';
    c.fillRect(xr - 4, -38, 21, 5); // coping
  });
  R.surface((c) => c.rect(xr - 4, -38, 21, 38 + SILL + 8), 'concrete', { seed: 65 });
  R.cast((c) => {
    c.fillStyle = '#2a2e32';
    // the rail guards the steps only; it stops short of the door
    const re = x - DOOR_W / 2 - 14;
    for (let px = xl + 2; px <= re; px += 31) c.fillRect(px, -44, 3, 44);
    c.fillRect(re, -44, 3, 44);
    c.fillRect(xl, -46, re - xl + 3, 3);
    c.fillRect(xl, -26, re - xl + 3, 2);
  });
  R.paint((c) => {
    c.fillStyle = 'rgba(130,70,34,0.5)';
    for (let px = xl + 2; px <= x - DOOR_W / 2 - 14; px += 31) c.fillRect(px, -8, 3, 8);
  });
}

// --------------------------------------------------------------- wedding --

// A figure in side-on silhouette at the scale of the crack, standing on
// the floor at (px, fy). Arms are given as hand positions.
function body(c, px, fy, h, { col, skin = '#c99a74', w = 0.17, skirt = 0, bob = 0, hands = null, face = 1 }) {
  const y0 = fy - bob;
  const headR = h * 0.085;
  const shY = y0 - h * 0.8;
  const hipY = y0 - h * 0.4;
  c.fillStyle = col;
  c.beginPath();
  if (skirt) {
    c.moveTo(px - h * 0.07, shY);
    c.lineTo(px + h * 0.07, shY);
    c.lineTo(px + h * 0.09, hipY - h * 0.05);
    c.lineTo(px + h * skirt, y0);
    c.lineTo(px - h * skirt, y0);
    c.lineTo(px - h * 0.09, hipY - h * 0.05);
  } else {
    c.moveTo(px - h * w * 0.5, shY);
    c.lineTo(px + h * w * 0.5, shY);
    c.lineTo(px + h * w * 0.42, hipY);
    c.lineTo(px + h * 0.1, y0);
    c.lineTo(px - h * 0.1, y0);
    c.lineTo(px - h * w * 0.42, hipY);
  }
  c.closePath();
  c.fill();
  c.fillStyle = skin;
  c.beginPath();
  c.arc(px + face * h * 0.01, shY - headR * 1.15, headR, 0, TAU);
  c.fill();
  if (hands) {
    c.strokeStyle = col;
    c.lineWidth = Math.max(1.4, h * 0.045);
    c.lineCap = 'round';
    for (const [hx, hy, sx] of hands) {
      c.beginPath();
      c.moveTo(px + sx * h * w * 0.5, shY + 2);
      c.lineTo(hx, hy);
      c.stroke();
    }
    c.fillStyle = skin;
    for (const [hx, hy] of hands) {
      c.beginPath();
      c.arc(hx, hy, Math.max(1.1, h * 0.03), 0, TAU);
      c.fill();
    }
  }
  return { shY, headR, hipY };
}

// What the crack shows: a basement full of people, the lamp turned low, a
// wedding. Drawn small and warm and clipped to the gap, so it reads as a
// handful of heads, two clapping hands, a white shape in the middle.
export function weddingGlimpse(R0, x, { open = 0, t = 0 } = {}) {
  const R = scaledR(R0, x, DOOR_SCALE);
  const k = smooth(0.03, 0.55, open);
  if (k <= 0.01) return;
  const g = crack(x, open);
  const fl = flicker(t, 2);
  const Rr = g.right; // the cast is placed from the right-hand jamb
  const fy = SILL - 1;

  const clip = (c) => {
    c.beginPath();
    c.rect(g.left, DOOR_TOP, g.w, SILL - DOOR_TOP);
    c.clip();
  };

  R.paint((c) => {
    c.save();
    clip(c);
    c.globalAlpha = k;
    // back wall, plaster gone amber, a paler floor
    const wl = c.createLinearGradient(0, DOOR_TOP, 0, SILL);
    wl.addColorStop(0, '#2a1a10');
    wl.addColorStop(0.55, '#7a4a28');
    wl.addColorStop(1, '#5c3820');
    c.fillStyle = wl;
    c.fillRect(g.left - 2, DOOR_TOP, g.w + 4, SILL - DOOR_TOP);
    c.fillStyle = '#6a4a30';
    c.fillRect(g.left - 2, fy - 2, g.w + 4, 6);

    // paper bunting strung across the top
    const cols = ['#c8503a', '#e0b44a', '#4a8a6a', '#e8dcc0', '#4a6aa8'];
    c.strokeStyle = 'rgba(30,20,14,0.7)';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(Rr + 2, DOOR_TOP + 5);
    c.quadraticCurveTo(Rr - 14, DOOR_TOP + 15, Rr - 30, DOOR_TOP + 6);
    c.stroke();
    for (let i = 0; i < 6; i++) {
      const bx = Rr - 2 - i * 5;
      const by = DOOR_TOP + 6 + Math.sin(i * 0.52 + 0.3) * 5.4;
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(bx - 2, by);
      c.lineTo(bx + 2, by);
      c.lineTo(bx, by + 5);
      c.fill();
    }

    // a shelf with the battery lamp on it, upper left of the gap
    c.fillStyle = '#2c1c12';
    c.fillRect(Rr - 36, DOOR_TOP + 26, 22, 2);
    c.fillStyle = '#d8d0b8';
    c.fillRect(Rr - 27, DOOR_TOP + 19, 5, 7);
    c.fillStyle = '#fff2cc';
    c.fillRect(Rr - 26, DOOR_TOP + 16, 3, 3);

    // the room is deeper than the door: draw the people a little smaller,
    // so the whole party fits the width of the crack
    c.save();
    c.translate(Rr, fy);
    c.scale(0.8, 0.8);
    c.translate(-Rr, -fy);

    // back row: older men and women, clapping, mostly dark against the wall
    const back = [
      [Rr - 34, 84, '#241812', 0.0],
      [Rr - 22, 78, '#3a2218', 1.7],
      [Rr - 10, 86, '#2a1c28', 3.1],
      [Rr + 1, 80, '#30241a', 4.4],
    ];
    for (const [px, h, col, ph] of back) {
      const clap = 0.5 + 0.5 * Math.sin(t * 9 + ph);
      const hy = fy - h * 0.55;
      body(c, px, fy, h, {
        col,
        skin: '#8a6244',
        hands: [
          [px - 1.2 - clap * 4.5, hy, -1],
          [px + 1.2 + clap * 4.5, hy - 0.4, 1],
        ],
      });
    }

    // the groom, left of her: a borrowed suit, shoulders up, grinning, one hand at his collar
    {
      const gx = Rr - 22;
      const gh = 76;
      const nerve = Math.sin(t * 5.3) * 0.5;
      const m = body(c, gx, fy, gh, {
        col: '#26262e',
        skin: '#c49270',
        w: 0.2,
        hands: [
          [gx + 1.5, fy - gh * 0.78 + nerve, 1],
          [gx - 6, fy - gh * 0.5, -1],
        ],
      });
      c.fillStyle = '#e8e2d0'; // shirt front
      c.beginPath();
      c.moveTo(gx - 2, m.shY);
      c.lineTo(gx + 2, m.shY);
      c.lineTo(gx, m.shY + 11);
      c.fill();
      c.strokeStyle = '#2a1410'; // the grin, too big for his face
      c.lineWidth = 0.9;
      c.beginPath();
      c.arc(gx + 1, m.shY - m.headR * 1.0, m.headR * 0.55, 0.25, Math.PI - 0.25);
      c.stroke();
      c.fillStyle = '#17110d'; // hair
      c.beginPath();
      c.arc(gx + 0.5, m.shY - m.headR * 1.3, m.headR * 1.05, Math.PI, TAU);
      c.fill();
    }

    // the bride: curtain lace, cut down and sewn. White, a little yellow in the lamplight.
    {
      const bx = Rr - 8;
      const bh = 80;
      const sway = Math.sin(t * 3.2) * 0.6;
      const m = body(c, bx, fy, bh, {
        col: '#cbbfa2',
        skin: '#d3a582',
        skirt: 0.17,
        hands: [
          [bx + 5, fy - bh * 0.5, 1],
          [bx - 5, fy - bh * 0.5, -1],
        ],
      });
      // lace: scalloped hem and a scatter of small ringlets in the skirt
      c.strokeStyle = 'rgba(150,126,92,0.65)';
      c.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.arc(bx - bh * 0.17 + 2.5 + i * 4.8, fy - 0.5, 2.6, Math.PI, TAU, true);
        c.stroke();
      }
      const rr = rng(23);
      for (let i = 0; i < 16; i++) {
        const ry = fy - 6 - rr() * 26;
        const spread = (fy - ry) / 36 + 0.4;
        const rx = bx + (rr() - 0.5) * bh * 0.3 * spread;
        c.beginPath();
        c.arc(rx, ry, 1.1 + rr() * 0.8, 0, TAU);
        c.stroke();
      }
      // the curtain-hook gathers at the waist
      c.fillStyle = 'rgba(150,126,92,0.5)';
      c.fillRect(bx - 7, fy - bh * 0.43, 14, 1.5);
      // veil: a net curtain over the hair, falling to the shoulder
      c.fillStyle = 'rgba(222,214,196,0.7)';
      c.beginPath();
      c.moveTo(bx - m.headR - 0.5, m.shY - m.headR * 1.4);
      c.quadraticCurveTo(bx + m.headR + 2, m.shY - m.headR * 3.0, bx + m.headR + 3 + sway, m.shY + 8);
      c.lineTo(bx - m.headR - 3 + sway, m.shY + 8);
      c.closePath();
      c.fill();
      c.fillStyle = '#17110d';
      c.beginPath();
      c.arc(bx, m.shY - m.headR * 1.35, m.headR * 1.0, Math.PI, TAU);
      c.fill();
      // a bunch of paper flowers in her hands
      c.fillStyle = '#c85a6a';
      c.beginPath();
      c.arc(bx + 0.5, fy - bh * 0.5, 2.6, 0, TAU);
      c.fill();
      c.fillStyle = '#e8c6a0';
      c.beginPath();
      c.arc(bx - 1.5, fy - bh * 0.52, 1.4, 0, TAU);
      c.fill();
    }

    // children dancing in front, bobbing with the beat; arms flung up
    const kids = [
      [Rr - 15, 36, '#4a6a8a', 0.4],
      [Rr + 1, 40, '#9a4a3a', 2.2],
      [Rr + 10, 34, '#c8a040', 4.1],
    ];
    for (const [px, h, col, ph] of kids) {
      const beat = Math.abs(Math.sin(t * 6.4 + ph));
      const bob = beat * 4.5;
      const up = 0.5 + 0.5 * Math.sin(t * 6.4 + ph + 1);
      const topY = fy - bob - h * 0.8;
      body(c, px, fy, h, {
        col,
        skin: '#c8966c',
        w: 0.3,
        bob,
        hands: [
          [px - 6, topY - 2 - up * 5, -1],
          [px + 6, topY - 1 - (1 - up) * 5, 1],
        ],
      });
    }

    // the oud player: an old man in the left-hand corner, in front, on a stool, head bent
    // over it, the neck pointing out at the party
    {
      c.save();
      c.translate(Rr - 33, fy);
      c.scale(-1, 1);
      c.fillStyle = '#1e1610';
      c.fillRect(-6, -14, 12, 2); // stool
      c.fillRect(-5, -14, 1.5, 14);
      c.fillRect(3.5, -14, 1.5, 14);
      c.fillStyle = '#3b2a1c'; // his robe, an old man's grey-brown
      c.beginPath();
      c.moveTo(-5, -40);
      c.lineTo(4, -40);
      c.lineTo(7, -15);
      c.lineTo(-8, -15);
      c.fill();
      c.fillStyle = '#9a7050';
      c.beginPath();
      c.arc(-0.5, -46, 4, 0, TAU);
      c.fill();
      c.fillStyle = '#d9d2c2'; // white hair, a white headcloth
      c.beginPath();
      c.arc(-0.5, -48, 4.1, Math.PI, TAU);
      c.fill();
      // the oud: round-backed, neck up and out
      c.fillStyle = '#8a5428';
      c.beginPath();
      c.ellipse(1, -27, 8.5, 6.5, -0.45, 0, TAU);
      c.fill();
      c.strokeStyle = '#5a3a1c';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-5, -31);
      c.lineTo(-19, -44);
      c.stroke();
      c.fillStyle = '#251a12';
      c.fillRect(-22, -48, 5, 3); // pegbox
      c.fillStyle = '#1a100a';
      c.beginPath();
      c.arc(1.5, -27, 1.8, 0, TAU);
      c.fill();
      // right arm picking, a quick small motion
      const pick = Math.sin(t * 15) * 2.2;
      c.strokeStyle = '#3b2a1c';
      c.lineWidth = 2.4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(3, -38);
      c.lineTo(4.5, -29 + pick);
      c.stroke();
      c.beginPath();
      c.moveTo(-3, -38);
      c.lineTo(-11, -39);
      c.stroke();
      c.restore();
    }

    c.restore();

    // the floor, its candles on an upturned crate
    c.fillStyle = '#2a1c12';
    c.fillRect(Rr - 39, fy - 7, 12, 8);
    c.fillStyle = '#e8dcc0';
    c.fillRect(Rr - 37, fy - 12, 2, 5);
    c.fillRect(Rr - 32, fy - 11, 2, 4);
    c.restore();
  });

  // lamplight: the battery lamp's cold-white heart, the candles, a wash over everyone
  R.glow((c) => {
    c.save();
    clip(c);
    c.globalAlpha = k;
    const lx = Rr - 24.5;
    const ly = DOOR_TOP + 17;
    const lg = c.createRadialGradient(lx, ly, 1, lx, ly, 34);
    lg.addColorStop(0, 'rgba(255,240,205,0.5)');
    lg.addColorStop(0.3, 'rgba(255,205,140,0.3)');
    lg.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = lg;
    c.fillRect(g.left - 4, DOOR_TOP, g.w + 8, 70);
    // candles
    for (const [cx, cy, s] of [
      [Rr - 36, fy - 13, 0],
      [Rr - 31, fy - 12, 2],
    ]) {
      const f = flicker(t * 1.4, s + 5);
      const cg = c.createRadialGradient(cx, cy, 0.5, cx, cy, 14 * f);
      cg.addColorStop(0, 'rgba(255,210,120,0.8)');
      cg.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = cg;
      c.fillRect(cx - 16, cy - 16, 32, 32);
    }
    // a wash across the whole room so the figures are lit from one side
    c.fillStyle = `rgba(255,170,85,${0.09 * fl})`;
    c.fillRect(g.left - 2, DOOR_TOP, g.w + 4, SILL - DOOR_TOP);
    // and her dress catches it
    c.fillStyle = `rgba(255,225,170,${0.07 * fl})`;
    c.beginPath();
    c.ellipse(Rr - 6.5, fy - 18, 8, 22, 0, 0, TAU);
    c.fill();
    c.restore();
  });
}

// ----------------------------------------------------------- the garden --

const LEAF = ['#2d4a2a', '#385a30', '#2a4326', '#42663a'];

const GARDENS = new Map();

// Everything that doesn't move, worked out once per extent.
function planGarden(x0, x1) {
  const key = x0 + '|' + x1;
  let p = GARDENS.get(key);
  if (p) return p;
  const r = rng(Math.abs(Math.floor(x0 * 7 + x1)) + 3);
  const L = x1 - x0;
  const ix0 = x0 + 64;
  const ix1 = x1 - 64;
  const at = (f) => lerp(ix0, ix1, f);
  p = { ix0, ix1, tomatoes: [], aub: [], clods: [], furrows: [] };

  // tomatoes on cane stakes
  [
    [0.27, 122],
    [0.39, 140],
    [0.5, 108],
  ].forEach(([f, h], n) => {
    const px = at(f) + (r() - 0.5) * 8;
    const lean = (r() - 0.5) * 8;
    const leaves = [];
    for (let y = 14; y < h; y += 7 + r() * 5) {
      const side = r() < 0.5 ? -1 : 1;
      leaves.push({ y, dx: side * (6 + r() * 11), a: side * (0.3 + r() * 0.8), s: 6 + r() * 5, col: LEAF[Math.floor(r() * 4)] });
      if (r() < 0.5) leaves.push({ y: y + 2, dx: -side * (4 + r() * 8), a: -side * (0.3 + r() * 0.7), s: 5 + r() * 4, col: LEAF[Math.floor(r() * 4)] });
    }
    const fruit = [];
    const trusses = 3;
    for (let i = 0; i < trusses; i++) {
      const y = h * (0.25 + i * 0.22) + r() * 6;
      const side = i % 2 ? 1 : -1;
      const nf = 2 + Math.floor(r() * 3);
      for (let j = 0; j < nf; j++) {
        const ripe = r();
        fruit.push({ y: y + j * 5 + r() * 3, dx: side * (8 + (j % 2) * 4 + r() * 3), r: 4 + r() * 1.6, col: ripe < 0.5 ? '#8f2a22' : ripe < 0.8 ? '#b24a22' : '#6f8a36' });
      }
    }
    p.tomatoes.push({ x: px, h, lean, leaves, fruit, ph: n * 1.9 });
  });

  // the mint, in a recycled tin on a brick
  p.mint = { x: at(0.09), leaves: [] };
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 13;
    p.mint.leaves.push({ dx: Math.cos(a) * d, y: 4 + r() * 24 * (1 - d / 22), a: r() * Math.PI, s: 3.4 + r() * 2.4, col: r() < 0.5 ? '#4f7a3c' : '#62904a' });
  }

  // aubergines, small and glossy
  [0.62, 0.7].forEach((f, n) => {
    const px = at(f) + (r() - 0.5) * 6;
    const h = 44 + r() * 8;
    const leaves = [];
    for (let y = 8; y < h; y += 6 + r() * 3) {
      const side = r() < 0.5 ? -1 : 1;
      leaves.push({ y, dx: side * (4 + r() * 8), a: side * (0.2 + r() * 0.6), s: 6 + r() * 3.5 });
    }
    p.aub.push({ x: px, h, leaves, fruit: [{ dx: -6, y: h * 0.45, len: 14 }, { dx: 5, y: h * 0.32, len: 11 }, ...(n ? [] : [{ dx: 0, y: h * 0.58, len: 9 }])], ph: n * 2.3 });
  });

  // the courgette, sprawled across the soil to the right of the aubergines
  const cx = at(0.9) - 4;
  p.cg = { x: cx, pts: [], leaves: [], flowers: [], fruit: { x: cx - 44, a: -0.04 } };
  for (let i = 0; i <= 10; i++) p.cg.pts.push([cx - 62 + i * 11.5, -3 - Math.sin(i * 0.9) * 2.2]);
  for (let i = 0; i < 6; i++) p.cg.leaves.push({ x: cx - 58 + i * 19 + (r() - 0.5) * 10, up: 8 + r() * 12, s: 12 + r() * 6, a: (r() - 0.5) * 0.5, ph: r() * 6 });
  p.cg.flowers = [
    { x: cx - 18, up: 17 },
    { x: cx + 20, up: 13 },
  ];

  // soil: clods and fine furrows
  for (let i = 0; i < 70; i++) p.clods.push({ x: lerp(ix0 - 6, ix1 + 6, r()), y: -1 - r() * 7, w: 1.4 + r() * 3, d: r() });
  for (let i = 0; i < 4; i++) p.furrows.push(lerp(ix0, ix1, (i + 0.5) / 4));
  p.L = L;
  if (GARDENS.size > 12) GARDENS.clear();
  GARDENS.set(key, p);
  return p;
}

function leafAt(c, x, y, rx, ry, a) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, a, 0, TAU);
  c.fill();
}

// A walled courtyard behind a building. The wall stands at each end and has
// fallen low between, where the ground is tilled. Moonlight finds the wet.
export function nightGarden(R, x0, x1, { wet = 0, t = 0 } = {}) {
  const p = planGarden(x0, x1);
  const w = clamp(wet);
  const soilCol = rgb(mixc([84, 66, 48], [40, 30, 23], w));
  const soilTop = (c, x, y) => c.lineTo(x, y);

  // ---- the courtyard wall: tall stubs at both ends, broken down between ----
  const stub = (side) => (c) => {
    const a = side < 0 ? x0 : x1;
    const s = -side; // +1 for the left stub, -1 for the right one
    c.moveTo(a, 0);
    c.lineTo(a, -75);
    c.lineTo(a + s * 50, -75);
    c.lineTo(a + s * 56, -63);
    c.lineTo(a + s * 63, -66);
    c.lineTo(a + s * 66, -44);
    c.lineTo(a + s * 70, -30);
    c.lineTo(a + s * 66, -14);
    c.lineTo(a + s * 66, 0);
    c.closePath();
  };
  for (const side of [-1, 1]) {
    R.cast((c) => {
      // a wall stub 20 thick: its broken top and inner side show
      const a = side < 0 ? x0 : x1;
      const s = -side;
      extrudePoly(c, [[a, 0], [a, -75], [a + s * 50, -75], [a + s * 56, -63], [a + s * 63, -66], [a + s * 66, -44], [a + s * 70, -30], [a + s * 66, -14], [a + s * 66, 0]], 20, { color: '#6f6554' });
      c.fillStyle = '#6f6554';
      c.beginPath();
      stub(side)(c);
      c.fill();
    });
    R.surface(stub(side), 'limestone', { seed: 71 + side, scale: 1.1 });
    R.paint((c) => {
      const a = side < 0 ? x0 : x1;
      const s = -side;
      // plaster, coming away, and a coping course
      c.fillStyle = 'rgba(190,178,155,0.18)';
      c.fillRect(Math.min(a, a + s * 40), -66, 40, 40);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(Math.min(a, a + s * 40), -49, 40, 1.5);
      c.fillStyle = '#7e7462';
      c.fillRect(Math.min(a, a + s * 52), -78, 52, 4);
    });
  }
  // a footing of stones between them, so the gap has an edge
  R.paint((c) => {
    c.fillStyle = '#4f483c';
    const r = rng(41);
    for (let x = p.ix0 - 6; x < p.ix1 + 6; x += 14) {
      const sw = 10 + r() * 6;
      c.beginPath();
      c.ellipse(x + sw / 2, -2.5, sw / 2, 3 + r() * 2.5, 0, 0, TAU);
      c.fill();
    }
  });

  // ---- the bed ----
  R.paint((c) => {
    c.fillStyle = soilCol;
    c.beginPath();
    c.moveTo(p.ix0 - 8, 3);
    c.lineTo(p.ix0 - 8, -3);
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const x = lerp(p.ix0 - 8, p.ix1 + 8, i / n);
      soilTop(c, x, -9 - Math.sin(i * 1.7) * 1.8 - Math.sin(i * 0.5) * 1.6 + Math.pow(Math.abs(i / n - 0.5) * 2, 3) * 6);
    }
    c.lineTo(p.ix1 + 8, 3);
    c.closePath();
    c.fill();
    // clods: wet ones go nearly black
    for (const k of p.clods) {
      c.fillStyle = k.d < 0.5 ? rgb(mixc([60, 46, 34], [24, 18, 13], w)) : rgb(mixc([104, 84, 62], [54, 42, 33], w));
      c.beginPath();
      c.ellipse(k.x, k.y, k.w, k.w * 0.55, 0, 0, TAU);
      c.fill();
    }
  });

  // ---- mint, in an old tomato-paste tin on a brick ----
  const m = p.mint;
  R.cast((c) => {
    c.fillStyle = '#8a4a36'; // the brick
    c.fillRect(m.x - 15, -8, 30, 8);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(m.x - 15, -4, 30, 1.2);
    // the tin
    c.fillStyle = '#7d8286';
    c.fillRect(m.x - 12, -36, 24, 28);
    c.fillStyle = '#a63a2c'; // what is left of the label
    c.fillRect(m.x - 12, -30, 24, 11);
    c.fillStyle = '#e8d8b0';
    c.fillRect(m.x - 8, -27, 9, 2);
    c.fillRect(m.x - 8, -23, 14, 1.5);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(m.x - 12, -14, 24, 1.5); // rib
    c.fillStyle = '#9ba0a3';
    c.beginPath();
    c.ellipse(m.x, -36, 12, 2.6, 0, 0, TAU); // the torn rim
    c.fill();
    c.fillStyle = soilCol;
    c.beginPath();
    c.ellipse(m.x, -36, 10, 1.9, 0, 0, TAU);
    c.fill();
  });
  R.paint((c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; // a dent in the tin, and rust at the foot
    c.beginPath();
    c.ellipse(m.x + 5, -17, 4, 7, 0.2, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(120,60,28,0.5)';
    c.fillRect(m.x - 12, -12, 24, 4);
    // the mint itself, leaning over the rim
    for (let i = 0; i < m.leaves.length; i++) {
      const l = m.leaves[i];
      const sw = Math.sin(t * 1.5 + i * 0.7) * 0.9 * (l.y / 24);
      c.fillStyle = l.col;
      leafAt(c, m.x + l.dx + sw, -36 - l.y, l.s, l.s * 0.62, l.a + sw * 0.1);
    }
  });

  // ---- tomatoes on their canes ----
  const glints = []; // moonlit droplet positions for the wet pass
  p.tomatoes.forEach((tm, n) => {
    R.cast((c) => {
      // the cane, and a twist of string at each tie
      c.strokeStyle = '#8a6a3a';
      c.lineWidth = 2.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(tm.x, 0);
      c.lineTo(tm.x + tm.lean, -tm.h - 8);
      c.stroke();
    });
    R.paint((c) => {
      const sx = (y) => tm.x + tm.lean * (y / tm.h) + Math.sin(t * 1.3 + tm.ph + y * 0.04) * 1.3 * (y / tm.h);
      c.strokeStyle = '#d8cbaa';
      c.lineWidth = 0.9;
      for (let y = 22; y < tm.h; y += 28) {
        c.beginPath();
        c.moveTo(sx(y) - 3, -y - 1);
        c.lineTo(sx(y) + 3, -y + 1);
        c.stroke();
      }
      // the plant's own stem, a little away from the cane
      c.strokeStyle = '#36502a';
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(tm.x + 3, 0);
      for (let y = 10; y <= tm.h; y += 10) c.lineTo(sx(y) + 3, -y);
      c.stroke();
      for (const l of tm.leaves) {
        const bx = sx(l.y) + 3;
        c.strokeStyle = '#36502a';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(bx, -l.y);
        c.lineTo(bx + l.dx * 0.6, -l.y - 2);
        c.stroke();
        c.fillStyle = l.col;
        leafAt(c, bx + l.dx, -l.y - 2, l.s, l.s * 0.5, l.a);
        leafAt(c, bx + l.dx * 0.55, -l.y - 5, l.s * 0.7, l.s * 0.34, -l.a);
        if (w > 0.02 && glints.length < 80) glints.push([bx + l.dx - l.s * 0.3, -l.y - 3, l.s]);
      }
      for (const f of tm.fruit) {
        const fx = sx(f.y) + 3 + f.dx;
        c.strokeStyle = '#36502a';
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(sx(f.y) + 3, -f.y - 5);
        c.lineTo(fx, -f.y + f.r * 0.4);
        c.stroke();
        c.fillStyle = f.col;
        c.beginPath();
        c.arc(fx, -f.y + f.r * 0.5, f.r, 0, TAU);
        c.fill();
        c.fillStyle = '#2d4a24';
        c.fillRect(fx - 1.8, -f.y - f.r * 0.6, 3.6, 1.4);
        if (w > 0.02 && glints.length < 80) glints.push([fx - f.r * 0.35, -f.y + f.r * 0.1, f.r * 0.9]);
      }
    });
  });

  // ---- aubergines ----
  for (const ab of p.aub) {
    R.paint((c) => {
      const sx = (y) => ab.x + Math.sin(t * 1.2 + ab.ph + y * 0.05) * 0.9 * (y / ab.h);
      c.strokeStyle = '#4a5a34';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(ab.x, 0);
      for (let y = 8; y <= ab.h; y += 8) c.lineTo(sx(y), -y);
      c.stroke();
      for (const l of ab.leaves) {
        c.fillStyle = l.y % 2 < 1 ? '#506a3c' : '#425c34'; // broader, greyer leaves
        leafAt(c, sx(l.y) + l.dx, -l.y, l.s, l.s * 0.62, l.a);
        if (w > 0.02 && glints.length < 80) glints.push([sx(l.y) + l.dx - l.s * 0.3, -l.y - 1, l.s]);
      }
      for (const f of ab.fruit) {
        const fx = sx(f.y) + f.dx;
        c.fillStyle = '#3a1f4e';
        c.beginPath();
        c.moveTo(fx - 3, -f.y);
        c.quadraticCurveTo(fx - 5.2, -f.y + f.len * 0.7, fx, -f.y + f.len);
        c.quadraticCurveTo(fx + 5.2, -f.y + f.len * 0.7, fx + 3, -f.y);
        c.closePath();
        c.fill();
        c.fillStyle = '#4c6a34'; // the calyx
        c.fillRect(fx - 3.4, -f.y - 1.2, 6.8, 2.6);
        c.fillStyle = 'rgba(170,150,220,0.45)'; // a skin that shines a little even by moon
        c.fillRect(fx - 2.2, -f.y + 2.5, 1, f.len * 0.5);
      }
    });
  }

  // ---- courgette: stem along the soil, big leaves held up on stalks ----
  const cg = p.cg;
  R.paint((c) => {
    c.strokeStyle = '#4c6a36';
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.beginPath();
    cg.pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.stroke();
    // the fruit: pale, ridged, lying where it grew
    const fx = cg.fruit.x;
    c.save();
    c.translate(fx, -7);
    c.rotate(cg.fruit.a);
    c.fillStyle = '#6a8a46';
    c.beginPath();
    c.ellipse(0, 0, 17, 6.2, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(190,210,140,0.35)';
    c.fillRect(-14, -3.4, 28, 1.6);
    c.fillStyle = 'rgba(30,50,20,0.4)';
    c.fillRect(-14, 1.2, 28, 1.6);
    c.restore();
    for (const l of cg.leaves) {
      const sw = Math.sin(t * 1.1 + l.ph) * 1.1;
      const lx = l.x + sw;
      const ly = -l.up;
      c.strokeStyle = '#4c6a36';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(l.x, -3);
      c.lineTo(lx, ly + 2);
      c.stroke();
      // a broad lobed leaf, wider than tall, with pale veins
      c.fillStyle = '#3e5f32';
      leafAt(c, lx, ly - l.s * 0.1, l.s * 1.15, l.s * 0.62, l.a);
      c.fillStyle = '#4a7038';
      leafAt(c, lx - l.s * 0.5, ly - l.s * 0.12, l.s * 0.62, l.s * 0.5, l.a - 0.3);
      leafAt(c, lx + l.s * 0.5, ly - l.s * 0.12, l.s * 0.62, l.s * 0.5, l.a + 0.3);
      c.strokeStyle = 'rgba(170,200,140,0.3)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(lx, ly + 2);
      c.lineTo(lx - l.s * 0.8, ly - l.s * 0.3);
      c.moveTo(lx, ly + 2);
      c.lineTo(lx + l.s * 0.8, ly - l.s * 0.3);
      c.moveTo(lx, ly + 2);
      c.lineTo(lx, ly - l.s * 0.5);
      c.stroke();
      if (w > 0.02 && glints.length < 80) glints.push([lx - l.s * 0.4, ly - l.s * 0.3, l.s * 1.1]);
    }
    // two yellow flowers: trumpets of five points
    for (const f of cg.flowers) {
      const sw = Math.sin(t * 1.3 + f.x) * 0.7;
      c.strokeStyle = '#4c6a36';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(f.x, -3);
      c.quadraticCurveTo(f.x + sw, -f.up * 0.5, f.x + sw * 1.5, -f.up);
      c.stroke();
      c.fillStyle = '#e1ad2e';
      c.beginPath();
      const fx = f.x + sw * 1.5;
      const fy = -f.up;
      c.moveTo(fx - 2, fy + 1);
      c.lineTo(fx - 7, fy - 8);
      c.lineTo(fx - 3.5, fy - 5.5);
      c.lineTo(fx, fy - 10);
      c.lineTo(fx + 3.5, fy - 5.5);
      c.lineTo(fx + 7, fy - 8);
      c.lineTo(fx + 2, fy + 1);
      c.closePath();
      c.fill();
      c.fillStyle = '#b8801c';
      c.fillRect(fx - 1, fy - 4, 2, 4);
    }
  });
  // the flowers hold a little light of their own; wet leaves catch the moon
  R.glow((c) => {
    for (const f of cg.flowers) {
      const fx = f.x + Math.sin(t * 1.3 + f.x) * 1.05;
      const g = c.createRadialGradient(fx, -f.up - 4, 1, fx, -f.up - 4, 12);
      g.addColorStop(0, 'rgba(255,205,90,0.2)');
      g.addColorStop(1, 'rgba(255,205,90,0)');
      c.fillStyle = g;
      c.fillRect(fx - 12, -f.up - 16, 24, 24);
    }
    if (w > 0.02) {
      // pale blue sheen on leaves and fruit, dew pricks on the soil
      for (let i = 0; i < glints.length; i++) {
        const [gx, gy, s] = glints[i];
        const tw = 0.55 + 0.45 * Math.sin(t * 1.7 + i * 2.3);
        c.fillStyle = `rgba(170,200,255,${0.16 * w * tw})`;
        c.beginPath();
        c.ellipse(gx, gy, s * 0.55, s * 0.14, -0.4, 0, TAU);
        c.fill();
        c.fillStyle = `rgba(215,230,255,${0.5 * w * tw})`;
        c.fillRect(gx - 0.6, gy - 0.6, 1.2, 1.2);
      }
      const r = rng(88);
      for (let i = 0; i < 26; i++) {
        const gx = lerp(p.ix0, p.ix1, r());
        const gy = -1 - r() * 5;
        const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.4 + i * 1.7));
        c.fillStyle = `rgba(190,215,255,${0.4 * w * tw})`;
        c.fillRect(gx, gy, 1.1, 1.1);
      }
      // wet soil takes a thin line of sky along its crown
      c.fillStyle = `rgba(150,180,235,${0.08 * w})`;
      c.fillRect(p.ix0, -6, p.ix1 - p.ix0, 1.2);
    }
  });
}

// ------------------------------------------------------------ the can --

// An old oil can with a spout soldered on and a handle of bent fencing wire.
// Drawn onto a plain context so the caller can put it in a hand. (x, y) is
// the middle of the base; tilt turns it about the handle, spout falling.
// The spout's tip, untilted and unscaled, is 52 right of x and 44 above y.
export function wateringCan(c, x, y, { tilt = 0, s = 1 } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.translate(0, -48);
  c.rotate(tilt);
  c.translate(0, 48);
  c.lineJoin = 'round';

  // the spout: a length of copper pipe at a slant, solder blobbed at the join
  c.strokeStyle = '#6e4a34';
  c.lineWidth = 3.6;
  c.lineCap = 'butt';
  c.beginPath();
  c.moveTo(14, -10);
  c.lineTo(50, -42);
  c.stroke();
  c.strokeStyle = 'rgba(230,170,120,0.45)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(14, -11.6);
  c.lineTo(49, -43.2);
  c.stroke();
  c.fillStyle = '#2a2420'; // the mouth
  c.beginPath();
  c.ellipse(51, -43.5, 2.6, 1.7, -0.8, 0, TAU);
  c.fill();
  c.fillStyle = '#9a9c98'; // solder
  c.beginPath();
  c.ellipse(15, -10, 5.5, 4.2, 0.3, 0, TAU);
  c.fill();

  // the body: a square oil can, shoulders rounded, bruised all over
  c.fillStyle = '#6e7a6a';
  c.beginPath();
  c.moveTo(-17, 0);
  c.lineTo(-17, -36);
  c.quadraticCurveTo(-17, -44, -9, -44);
  c.lineTo(9, -44);
  c.quadraticCurveTo(17, -44, 17, -36);
  c.lineTo(17, 0);
  c.closePath();
  c.fill();
  // top face and the filler hole
  c.fillStyle = '#88948a';
  c.beginPath();
  c.ellipse(0, -44, 11, 2.6, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#1a1a18';
  c.beginPath();
  c.ellipse(-2, -44.4, 4.4, 1.5, 0, 0, TAU);
  c.fill();
  // side shading
  const sh = c.createLinearGradient(-17, 0, 17, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.3)');
  sh.addColorStop(0.35, 'rgba(255,255,255,0.1)');
  sh.addColorStop(1, 'rgba(0,0,0,0.38)');
  c.fillStyle = sh;
  c.fillRect(-17, -44, 34, 44);
  // what's left of the oil company's band
  c.fillStyle = 'rgba(190,60,40,0.7)';
  c.fillRect(-17, -27, 34, 8);
  c.fillStyle = 'rgba(230,220,190,0.6)';
  c.fillRect(-11, -25, 12, 2);
  c.fillRect(-11, -21.5, 18, 1.4);
  // seams
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-17, -9);
  c.lineTo(17, -9);
  c.moveTo(-17, -37);
  c.lineTo(17, -37);
  c.stroke();
  // dents, rust, a scrape
  const r = rng(77);
  for (let i = 0; i < 4; i++) {
    const dx = -12 + r() * 24;
    const dy = -38 + r() * 34;
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.ellipse(dx, dy, 3 + r() * 3, 2 + r() * 3, r() * 3, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(210,215,205,0.28)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.ellipse(dx, dy, 3.4, 2.6, 0, 0.5, 2.4);
    c.stroke();
  }
  c.fillStyle = 'rgba(120,56,24,0.55)';
  for (let i = 0; i < 7; i++) c.fillRect(-16 + r() * 30, -r() * 14, 2 + r() * 4, 1.4 + r() * 3);
  c.fillRect(-17, -2.5, 34, 2.5);

  // the handle: fencing wire, bent into a loop over the top
  c.strokeStyle = '#2e2a26';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-15, -40);
  c.bezierCurveTo(-24, -62, 6, -66, 9, -46);
  c.stroke();
  c.strokeStyle = 'rgba(190,190,180,0.3)';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-15, -41);
  c.bezierCurveTo(-23, -61, 5, -65, 8, -46);
  c.stroke();
  // a rag wound round the grip, where the hand goes
  c.strokeStyle = '#b8a888';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-14, -60.5);
  c.lineTo(-1, -62.5);
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------ the pour --

// A thin stream from the spout at (x, y) down to the soil at y = 0, and a
// splash where it lands. k is strength, 0 to 1.
export function waterPour(R, x, y, k, t) {
  const kk = clamp(k);
  if (kk < 0.02) return;
  const drop = -y; // how far it falls
  if (drop <= 2) return;
  // the stream leaves the spout a little forward and bends under gravity
  const vx = 8 + 6 * kk;
  const px = (f) => x + vx * f * f * 0.5 + vx * f * 0.5;
  const n = 14;
  const wob = (f) => Math.sin(t * 19 + f * 7) * 0.35 * kk;
  const endX = px(1);
  const wid = 1 + 1.7 * kk;

  R.paint((c) => {
    c.lineCap = 'round';
    // body of the stream: pale, a little see-through
    c.strokeStyle = `rgba(150,176,200,${0.4 + 0.3 * kk})`;
    c.lineWidth = wid;
    c.beginPath();
    c.moveTo(x, y);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      c.lineTo(px(f) + wob(f), y + drop * f);
    }
    c.stroke();
    // streaks running down it
    c.strokeStyle = `rgba(215,230,245,${0.45 * kk})`;
    c.lineWidth = Math.max(0.5, wid * 0.35);
    c.setLineDash([5, 7]);
    c.lineDashOffset = -t * 90;
    c.beginPath();
    c.moveTo(x - 0.4, y);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      c.lineTo(px(f) + wob(f) - 0.4, y + drop * f);
    }
    c.stroke();
    c.setLineDash([]);
  });

  R.paint((c) => {
    // a few drops flung off the stream and the splash at its foot
    const r = rng(5);
    for (let i = 0; i < 7; i++) {
      const ph = (t * (1.8 + r() * 0.8) + r()) % 1;
      const f = ph;
      const dx = (r() - 0.5) * 3.2 * f;
      c.fillStyle = `rgba(190,212,235,${0.55 * kk * (1 - f * 0.4)})`;
      c.beginPath();
      c.ellipse(px(f) + dx, y + drop * f, 0.8, 1.7, 0, 0, TAU);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const ph = (t * (2.6 + r() * 1.4) + r()) % 1;
      const dir = r() < 0.5 ? -1 : 1;
      const sx = endX + dir * (2 + ph * (5 + r() * 7));
      const sy = -Math.sin(ph * Math.PI) * (4 + r() * 8) * kk;
      c.fillStyle = `rgba(185,208,232,${0.7 * kk * (1 - ph)})`;
      c.beginPath();
      c.arc(sx, sy - 1, 0.9 + 0.5 * (1 - ph), 0, TAU);
      c.fill();
    }
    // the dark patch spreading under it
    c.fillStyle = `rgba(14,10,6,${0.35 * kk})`;
    c.beginPath();
    c.ellipse(endX, -0.5, 7 + 4 * kk, 1.5, 0, 0, TAU);
    c.fill();
  });

  // moonlight along the water: blue, and not much of it
  R.glow((c) => {
    c.lineCap = 'round';
    c.strokeStyle = `rgba(140,180,255,${0.1 * kk})`;
    c.lineWidth = wid + 3;
    c.beginPath();
    c.moveTo(x, y);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      c.lineTo(px(f) + wob(f), y + drop * f);
    }
    c.stroke();
    c.strokeStyle = `rgba(200,222,255,${0.22 * kk})`;
    c.lineWidth = Math.max(0.6, wid * 0.4);
    c.beginPath();
    c.moveTo(x + 0.4, y);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      c.lineTo(px(f) + wob(f) + 0.4, y + drop * f);
    }
    c.stroke();
    const flash = 0.5 + 0.5 * Math.sin(t * 23);
    const sg = c.createRadialGradient(endX, -2, 0.5, endX, -2, 11);
    sg.addColorStop(0, `rgba(190,215,255,${(0.14 + 0.1 * flash) * kk})`);
    sg.addColorStop(1, 'rgba(190,215,255,0)');
    c.fillStyle = sg;
    c.fillRect(endX - 12, -14, 24, 20);
  });
}
