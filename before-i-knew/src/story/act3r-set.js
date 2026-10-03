// Act 3, Retrieval: The Night. Two places, one per route:
//
//   Part 1 (the white cloth): the last wall of our side, then sixty metres of
//   open, moonlit ground to the regime checkpoint: sandbags, a battery lamp,
//   a camp table, a flag. Right is west, towards the checkpoint; the moon is
//   low in the east, behind Sami.
//
//   Part 2 (the back route): the six-storey building beside School Street,
//   seen in section, floor by floor, dark but for the torch and the moon
//   through the holes; then its outside wall, a balcony, a drainpipe, the
//   alley and the street where the blanket lies.
//
// World units: ground at y = 0, up is negative.

import { lerp, clamp, rng, mixc } from '../engine/util.js';
import * as T from '../sets/town.js';
import { horizon } from '../sets/horizon.js';
import { sandbags } from './act2r-set.js';

// ------------------------------------------------------------- Part 1 --

export const X1 = {
  start: 40,
  wall: [60, 150], // the last wall of our side
  open: 170, // where the open ground begins
  blanket: 560, // the shape in the street, off to the side
  shout: 900,
  stop: 980,
  bags: [1400, 1580],
  lamp: 1600,
  table: 1700,
  maher: 1768,
  seat: 1632, // the chair across the table from him
  flag: 1840,
  end: 2100,
};

// ------------------------------------------------------------- Part 2 --

export const FH = 200; // floor to floor
export const floorY = (n) => -(n - 1) * FH; // floor 1 is the ground
export const X2 = {
  b0: 0,
  b1: 1100, // the building's outer walls
  door: 50,
  stairs1: [820, 1040], // F1 → F2 (in the stairwell, behind)
  table: 420,
  drawing: 300,
  stove: 640,
  stairs2: [40, 300], // F2 → F3 (in the stairwell, behind): the slab across them
  slab: [150, 210],
  wardrobe: [470, 580],
  lowceil: [660, 820],
  mound: [900, 1000], // rubble under the missing stairs, F3 → F4
  f4edge: 900, // where the fourth floor stops (over the mound's edge)
  heights: 480,
  stairs4: [30, 250], // F4 → F5 (in the stairwell, behind): one step gives way
  hole: 1000, // the hole in the outside wall, fifth floor
  balc5: [1100, 1170],
  balc4: [1100, 1260],
  pipe: 1250,
  alley: [1100, 1420],
  arch: [1330, 1420], // the fallen arch into the street: crawl
  street: 1420,
  blanket: 1640,
  shade: 1360, // where the buildings' shadow ends
  lamp: 2150,
};

// ------------------------------------------------------------ the sky --

const NIGHT = [[0, '#05070f'], [0.45, '#0d1426'], [0.8, '#1b2440']];

function stars(R, t) {
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const r = rng(7);
    for (let i = 0; i < 160; i++) {
      const x = r() * R.W;
      const y = r() * R.H * 0.62;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + r() * 1.4) + i);
      c.fillStyle = `rgba(230,236,255,${(0.15 + r() * 0.55) * tw})`;
      const s = r() < 0.08 ? 1.6 : 1;
      c.fillRect(x, y, s, s);
    }
    c.restore();
  });
}

// The moon, three-quarters full, and its halo. uv on screen.
function moon(R, u, v) {
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const x = u * R.W;
    const y = v * R.H;
    const r = R.H * 0.035;
    const halo = c.createRadialGradient(x, y, r, x, y, r * 9);
    halo.addColorStop(0, 'rgba(200,215,255,0.22)');
    halo.addColorStop(1, 'rgba(200,215,255,0)');
    c.fillStyle = halo;
    c.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
    c.fillStyle = '#eef0f6';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    // the dark quarter, only ever on the moon itself
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = 'rgba(12,16,30,0.92)';
    c.beginPath();
    c.arc(x - r * 1.35, y - r * 0.1, r * 0.95, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.fillStyle = 'rgba(160,170,190,0.25)';
    c.beginPath();
    c.arc(x + r * 0.3, y - r * 0.25, r * 0.22, 0, Math.PI * 2);
    c.arc(x + r * 0.05, y + r * 0.35, r * 0.15, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
}

export function nightSky(R, g, { moonUv = [0.12, 0.26] } = {}) {
  T.sky(R, NIGHT, { sun: moonUv, warmth: 0, clouds: 0.35, cloudLit: [70, 80, 110], cloudShade: [14, 16, 26] });
  stars(R, g.time);
  moon(R, moonUv[0], moonUv[1]);
  horizon(R, {
    haze: [36, 44, 70],
    shade: [22, 26, 40],
    cloud: [70, 80, 110],
    span: 6000,
    seed: 31,
    t: g.time,
    lights: 1, // Damascus, lit, to the west
    lite: g.settings.get('quality') === 'low',
  });
}

// ------------------------------------------------------------ the look --

export function nightLook(g) {
  const a = g.a;
  const lights = [
    // the moon: cool, low in the east
    { uv: a.part === 2 ? [-0.3, -0.4] : [0.12, 0.26], color: [0.62, 0.7, 0.95], intensity: a.inside ? 0.12 : 0.55, radius: 0, rim: 0.9 },
  ];
  const torch = g.torchLight();
  if (torch) lights.push(torch);
  if (a.part === 1) {
    // the battery lamp on the sandbags
    const fl = 0.92 + 0.08 * Math.sin(g.time * 13) * Math.sin(g.time * 3.1);
    lights.push({ x: X1.lamp + (a.lampAtTable ? 100 : 0), y: a.lampAtTable ? -112 : -150, color: [1, 0.82, 0.52], intensity: 1.6 * fl, radius: 0.16, rim: 0.8 });
  } else {
    // moonlight falling through the holes in the building
    for (const [x, y] of MOON_HOLES) lights.push({ x, y: y + 60, color: [0.6, 0.68, 0.95], intensity: 0.5, radius: 0.1, rim: 0.3 });
    lights.push({ x: X2.lamp, y: -140, color: [1, 0.82, 0.52], intensity: 0.5, radius: 0.1, rim: 0.4 });
  }
  if (a.shotAt && g.time - a.shotAt < 0.12) lights.push({ x: a.shotX, y: a.shotY, color: [1, 0.9, 0.7], intensity: 1.2, radius: 0.06, rim: 0.4 });
  return {
    ambient: a.inside ? [0.075, 0.08, 0.11] : [0.09, 0.105, 0.16],
    lights: lights.slice(0, 8),
    groundShadow: 0.55,
    bloom: 0.7,
    exposure: 0.98,
    grain: 0.07,
    grade: { sat: 0.62, contrast: 1.1, lift: 0.01, tint: [0.92, 0.97, 1.08], shadows: [0.9, 0.97, 1.12], highs: [1.06, 1.0, 0.92] },
    // cold mist lying in the street, thicker in the open
    fog: a.inside ? { density: 0.08, height: 90, color: [0.2, 0.24, 0.34] } : { density: 0.22, height: 110, color: [0.3, 0.36, 0.5] },
    fade: Math.max(a.endFade || 0, a.blackout || 0),
    flash: a.hitAt && g.time - a.hitAt < 0.15 ? [0.3, 0.05, 0.02] : null,
  };
}

export const surfaceAt = (x) => (x > 170 && x < 1400 ? 'rubble' : 'grit');

// ======================================================= Part 1: draw ==

export function drawApproach(R, g) {
  const a = g.a;
  const t = g.time;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1400 && x0 < cx + 1400;
  nightSky(R, g);
  T.skyline(R, { depth: 0.3, y: 30, color: '#141826', seed: 41 });

  // our side: the last buildings, dark, to the left
  T.block(R, { x: -900, w: 820, floors: 4, fh: 140, color: '#3a3c44', seed: 301, torn: 0.3, tornLeft: false, noDoors: true }, t);
  // across the open ground: the regime side, the checkpoint in front of it
  T.block(R, { x: 1500, w: 700, floors: 5, fh: 140, color: '#34363f', seed: 302, torn: 0.2 }, t);
  T.block(R, { x: 2200, w: 600, floors: 3, fh: 140, color: '#30323a', seed: 303, torn: 0.5 }, t);

  // the open ground: broken tarmac, glass, a crater's edge
  R.paint((c) => {
    c.fillStyle = '#2d2c2e';
    c.fillRect(-1000, -6, 4000, 30);
    const r = rng(11);
    for (let i = 0; i < 140; i++) {
      const x = X1.open + r() * (X1.bags[0] - X1.open);
      c.fillStyle = r() < 0.2 ? 'rgba(200,210,230,0.35)' : 'rgba(80,76,72,0.8)';
      c.fillRect(x, -3 - r() * 3, 2 + r() * 6, 2 + r() * 3);
    }
    // the crater
    c.fillStyle = '#1c1b1d';
    c.beginPath();
    c.ellipse(430, -2, 70, 7, 0, 0, Math.PI * 2);
    c.fill();
  });
  // the shape under the blanket, out in the street, where Sami won't look
  if (near(X1.blanket - 80, X1.blanket + 80)) blanketShape(R, X1.blanket, -14, 0.8);

  // the last wall of our side
  if (near(X1.wall[0], X1.wall[1])) T.lowWall(R, X1.wall[0], X1.wall[1] - X1.wall[0], 120, '#57554f');
  // the checkpoint: sandbags, the lamp, the table, a flag
  if (near(X1.bags[0] - 200, X1.flag + 200)) checkpoint(R, g, t);
  T.cables(R, cx, { seed: 61, from: -900, to: 2800, y: -380 });

  // the people
  const shear = -1.2;
  for (const w of [...g.npcs, g.player]) {
    if (!w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, 0.1);
  }
  if (near(X1.bags[0], X1.bags[1])) sandbags(R, X1.bags[0], X1.bags[1] - X1.bags[0], 4, { color: '#5e5646' });
  g.effects.draw(R);
}

function checkpoint(R, g, t) {
  const a = g.a;
  // a flagpole, the flag hanging in the still air
  R.cast((c) => {
    c.fillStyle = '#2a2a2a';
    c.fillRect(X1.flag, -330, 4, 334);
    const sway = Math.sin(t * 0.8) * 3;
    c.fillStyle = '#8d2a2a';
    c.fillRect(X1.flag + 4, -328, 70 + sway, 16);
    c.fillStyle = '#e8e4dc';
    c.fillRect(X1.flag + 4, -312, 70 + sway, 16);
    c.fillStyle = '#1b1b1b';
    c.fillRect(X1.flag + 4, -296, 70 + sway, 16);
    // the regime's flag: two green stars on the white
    c.fillStyle = '#2f7a3a';
    for (const sx of [0.34, 0.66]) {
      const px = X1.flag + 4 + (70 + sway) * sx;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 5.6;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        c.lineTo(px + Math.cos(ang) * r, -304 + Math.sin(ang) * r);
      }
      c.fill();
    }
  });
  // the camp table, two folding chairs, the radio, the thermos, glasses
  R.cast((c) => {
    c.fillStyle = '#4a4638';
    c.fillRect(X1.table - 50, -82, 100, 6);
    c.fillRect(X1.table - 44, -76, 4, 76);
    c.fillRect(X1.table + 40, -76, 4, 76);
    for (const [cx, f] of [[X1.seat, 1], [X1.maher + 10, -1]]) {
      c.fillStyle = '#3a3a3c';
      c.fillRect(cx - 18, -44, 36, 4);
      c.fillRect(cx - 16, -40, 3, 40);
      c.fillRect(cx + 13, -40, 3, 40);
      c.fillRect(cx - f * 18, -96, 3, 56);
    }
    // radio
    c.fillStyle = '#2c2e27';
    c.fillRect(X1.table + 14, -104, 30, 22);
    c.fillStyle = '#6e7560';
    c.fillRect(X1.table + 30, -128, 2, 24);
    // thermos and two tea glasses
    c.fillStyle = '#7a2a24';
    c.fillRect(X1.table - 30, -112, 12, 30);
    c.fillStyle = 'rgba(200,120,60,0.8)';
    c.fillRect(X1.table - 12, -92, 6, 10);
    c.fillRect(X1.table + 2, -92, 6, 10);
    // what they took from Sami, on the table
    if (a.onTable) {
      c.fillStyle = '#2a2d31';
      c.fillRect(X1.table - 4, -90, 10, 8); // walkie
      if (a.lighterOnTable) {
        c.fillStyle = '#b9b3a4';
        c.fillRect(X1.table + 8, -87, 5, 5); // the lighter
      }
    }
  });
  // the battery lamp: on the sandbags, then on the table
  const lx = a.lampAtTable ? X1.table : X1.lamp;
  const ly = a.lampAtTable ? -90 : -128;
  R.cast((c) => {
    c.fillStyle = '#2e2e2c';
    c.fillRect(lx - 7, ly - 16, 14, 16);
  });
  R.glow((c) => {
    const grd = c.createRadialGradient(lx, ly - 18, 0, lx, ly - 18, 60);
    grd.addColorStop(0, 'rgba(255,220,160,0.9)');
    grd.addColorStop(0.2, 'rgba(255,200,130,0.3)');
    grd.addColorStop(1, 'rgba(255,190,120,0)');
    c.fillStyle = grd;
    c.fillRect(lx - 60, ly - 78, 120, 120);
  });
}

// A shape under a dark blanket on the ground. Nothing else is shown.
// The blanket over the weight beneath it (a Shroud): its outline, the
// cloth's grain and relief, a fold or two where it gathers, and the moon on
// its top.
function bodyBlanket(R, body, moonlit) {
  R.cast((c) => {
    c.beginPath();
    body.drape(c);
    c.fillStyle = '#3a342c';
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1.2;
    c.beginPath();
    for (const i of [1, 3, 5]) {
      const [x, y] = body.p[i];
      c.moveTo(x - 4, y - 8);
      c.quadraticCurveTo(x + 3, y, x - 2, y + 9);
    }
    c.stroke();
  });
  R.surface((c) => body.drape(c), 'cloth', { scale: 0.5, seed: 2, alpha: 0.7 });
  if (moonlit)
    R.glow((c) => {
      c.strokeStyle = 'rgba(190,205,250,0.5)';
      c.lineWidth = 2;
      c.beginPath();
      body.p.forEach(([x, y], i) => {
        const ty = y - [9, 13, 12, 11, 9, 7, 6][i] + 2;
        if (i === 0) c.moveTo(x, ty);
        else c.lineTo(x, ty);
      });
      c.stroke();
    });
}

export function blanketShape(R, x, y, s = 1, moonlit = false) {
  if (moonlit) {
    // the moon along its top: the only way to see it from far off
    R.glow((c) => {
      c.save();
      c.translate(x, y);
      c.scale(s, s);
      c.strokeStyle = 'rgba(190,205,250,0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-66, -12);
      c.quadraticCurveTo(-40, -20, -10, -23);
      c.quadraticCurveTo(30, -22, 60, -13);
      c.stroke();
      c.restore();
    });
  }
  R.cast((c) => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = '#3a342c';
    c.beginPath();
    c.moveTo(-70, 0);
    c.quadraticCurveTo(-66, -16, -40, -18);
    c.quadraticCurveTo(-10, -24, 18, -19);
    c.quadraticCurveTo(46, -22, 62, -12);
    c.quadraticCurveTo(72, -6, 70, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(-30, -17);
    c.quadraticCurveTo(-24, -8, -30, 0);
    c.moveTo(20, -18);
    c.quadraticCurveTo(28, -9, 22, 0);
    c.stroke();
    c.restore();
  });
}

// ======================================================= Part 2: draw ==

// Holes in the building's back wall, where the moon comes in: [x, y] centres.
const MOON_HOLES = [
  [260, floorY(2) - 120],
  [640, floorY(3) - 110],
  [900, floorY(4) - 130],
  [420, floorY(5) - 120],
];

export function drawBuilding(R, g) {
  const a = g.a;
  const t = g.time;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1500 && x0 < cx + 1500;
  nightSky(R, g, { moonUv: [0.9, 0.18] });
  T.skyline(R, { depth: 0.3, y: 40, color: '#141826', seed: 42 });

  // across the street: the regime side, dark, and the checkpoint lamp
  T.block(R, { x: 1800, w: 900, floors: 5, fh: 150, color: '#2e3038', seed: 311, torn: 0.3 }, t);
  R.glow((c) => {
    const grd = c.createRadialGradient(X2.lamp, -150, 0, X2.lamp, -150, 50);
    grd.addColorStop(0, 'rgba(255,215,150,0.9)');
    grd.addColorStop(1, 'rgba(255,200,130,0)');
    c.fillStyle = grd;
    c.fillRect(X2.lamp - 50, -200, 100, 100);
  });

  // the back wall of each floor, with the moon's holes cut through it
  R.paint((c) => {
    c.beginPath();
    c.rect(X2.b0, floorY(6) - 20, X2.b1 - X2.b0, -floorY(6) + 20);
    for (const [hx, hy] of MOON_HOLES) {
      c.moveTo(hx + 50, hy);
      c.ellipse(hx, hy, 50, 34, 0.2, 0, Math.PI * 2);
    }
    c.fillStyle = '#34322f';
    c.fill('evenodd');
    // stained plaster, a tide line of damp, soot around the holes
    const r = rng(5);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? '90,84,76' : '15,12,10'},0.25)`;
      c.fillRect(X2.b0 + r() * (X2.b1 - X2.b0), floorY(6) + r() * -floorY(6), 20 + r() * 60, 10 + r() * 40);
    }
    // the tide line: damp that rose a hand's height off every floor
    for (let f = 1; f <= 5; f++) {
      const td = c.createLinearGradient(0, floorY(f) - 60, 0, floorY(f));
      td.addColorStop(0, 'rgba(20,18,15,0)');
      td.addColorStop(0.8, 'rgba(20,18,15,0.35)');
      td.addColorStop(1, 'rgba(20,18,15,0.1)');
      c.fillStyle = td;
      c.fillRect(X2.b0, floorY(f) - 60, X2.b1 - X2.b0, 60);
    }
  });
  // plaster, where it hasn't fallen, and the blocks where it has
  R.surface((c) => {
    c.rect(X2.b0, floorY(6) - 20, X2.b1 - X2.b0, -floorY(6) + 20);
    for (const [hx, hy] of MOON_HOLES) {
      c.moveTo(hx + 50, hy);
      c.ellipse(hx, hy, 50, 34, 0.2, 0, Math.PI * 2);
    }
  }, 'plaster', { scale: 1.2, seed: 3, rule: 'evenodd' });

  // the flights in the stairwell, behind
  if (near(X2.stairs1[0], X2.stairs1[1])) stairFlight(R, X2.stairs1[0], floorY(1), X2.stairs1[1], floorY(2));
  if (near(X2.stairs2[0], X2.stairs2[1])) stairFlight(R, X2.stairs2[0], floorY(2), X2.stairs2[1], floorY(3), { slab: !a.slabCrossed });
  if (near(X2.stairs4[0], X2.stairs4[1])) stairFlight(R, X2.stairs4[0], floorY(4), X2.stairs4[1], floorY(5), { broken: a.stepGone ? 4 : -1 });

  // furniture and what the rooms still hold
  if (near(X2.table - 100, X2.table + 100)) diningTable(R, X2.table, floorY(2));
  if (near(X2.drawing - 50, X2.drawing + 50)) childsDrawing(R, X2.drawing, floorY(2) - 120);
  if (near(X2.stove - 60, X2.stove + 60)) tinStove(R, X2.stove, floorY(2));
  if (near(X2.wardrobe[0], X2.wardrobe[1])) wardrobe(R, X2.wardrobe[0], floorY(3));
  if (near(X2.heights - 60, X2.heights + 60)) doorFrame(R, X2.heights, floorY(4));

  // floors, stairs, the slab, the fallen ceiling, the mound
  R.cast((c) => {
    for (const s of g.level.solids) {
      if (!near(s.x0, s.x1) || s.hidden) continue;
      if (s.kind === 'step') {
        c.fillStyle = '#5b5750';
        c.fillRect(s.x0, s.y0, s.x1 - s.x0, 8);
        c.fillStyle = '#403d38';
        c.fillRect(s.x0, s.y0 + 8, s.x1 - s.x0, Math.min(s.y1 - s.y0, 200) - 8);
      } else if (s.kind === 'floor') {
        c.fillStyle = '#6a655c';
        c.fillRect(s.x0, s.y0, s.x1 - s.x0, 16);
        // floor tiles along the top edge, the slab's section below
        c.fillStyle = 'rgba(200,190,170,0.18)';
        for (let tx = s.x0; tx < s.x1; tx += 30) c.fillRect(tx + 1, s.y0, 28, 3);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(s.x0, s.y0 + 12, s.x1 - s.x0, 4);
        // broken ends show their rebar
        c.strokeStyle = '#3b2f28';
        c.lineWidth = 1.5;
        for (const ex of [s.x0, s.x1]) {
          if (s.raw?.includes(ex)) {
            c.beginPath();
            for (let i = 0; i < 4; i++) {
              c.moveTo(ex, s.y0 + 3 + i * 3);
              c.lineTo(ex + (ex === s.x0 ? -1 : 1) * (10 + i * 5), s.y0 + 8 + i * 5);
            }
            c.stroke();
          }
        }
      } else if (s.kind === 'slab') {
        c.fillStyle = '#6f6a61';
        c.save();
        c.translate((s.x0 + s.x1) / 2, s.y0 + 20);
        c.rotate(-0.25 + (a.slabShift || 0) * 0.04);
        c.fillRect(-70, -18, 140, 26);
        c.strokeStyle = '#3b2f28';
        c.lineWidth = 1.5;
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          c.moveTo(-60 + i * 30, 8);
          c.lineTo(-64 + i * 30, 24);
        }
        c.stroke();
        c.restore();
      } else if (s.kind === 'mound') {
        T.rubble(R, s.x0 - 10, s.x1 - s.x0 + 20, 70, { seed: 5, color: '#5d5850', cast: false });
      } else if (s.kind === 'balcony') {
        c.fillStyle = '#5f5a52';
        c.fillRect(s.x0, s.y0, s.x1 - s.x0, 12);
        c.strokeStyle = '#2a2724';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(s.x0, s.y0 - 36);
        c.lineTo(s.x1, s.y0 - 36);
        for (let bx = s.x0 + 6; bx < s.x1; bx += 10) {
          c.moveTo(bx, s.y0);
          c.lineTo(bx, s.y0 - 36);
        }
        c.stroke();
      }
    }
    // the dropped ceiling on the third floor, and the wardrobe's bulk
    for (const k of g.level.ceilings) {
      if (!near(k.x0, k.x1)) continue;
      c.fillStyle = '#5a554d';
      c.beginPath();
      c.moveTo(k.x0 - 10, k.y - 40);
      c.lineTo(k.x1 + 10, k.y - 50);
      c.lineTo(k.x1, k.y);
      c.lineTo(k.x0, k.y + 2);
      c.fill();
    }
  });

  // the outside wall on the right, with the hole on the fifth floor, and the
  // drainpipe down it
  R.cast((c) => {
    c.fillStyle = '#4a4740';
    c.beginPath();
    c.rect(X2.b1 - 18, floorY(6), 18, -floorY(6));
    c.rect(X2.b1 - 18, floorY(5) - 150, 18, 150); // (cut below: the hole)
    c.fill();
    c.fillStyle = '#34322f';
    c.fillRect(X2.b0, floorY(6), 16, -floorY(6));
    c.fillStyle = '#3c3a38';
    c.fillRect(X2.pipe - 3, floorY(4) - 20, 6, -floorY(4) + 20);
    for (let y = floorY(4); y < 0; y += 60) c.fillRect(X2.pipe - 5, y, 10, 3);
  });
  // (the hole itself: sky shows through where the wall isn't)
  R.paint((c) => {
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.ellipse(X2.b1 - 9, floorY(5) - 80, 20, 70, 0, 0, Math.PI * 2);
    c.fill();
  });

  // moonlight falling through the holes, in shafts, with dust in it
  R.glow((c) => {
    for (const [hx, hy] of MOON_HOLES) {
      const n = Math.round(-hy / FH);
      const floor = floorY(n + 1 > 5 ? 5 : n + 1) + 0;
      const fy = Math.min(floorY(Math.ceil(-hy / FH)), floor);
      const grd = c.createLinearGradient(hx, hy, hx + 80, fy);
      grd.addColorStop(0, 'rgba(150,170,230,0.16)');
      grd.addColorStop(1, 'rgba(150,170,230,0.03)');
      c.fillStyle = grd;
      c.beginPath();
      c.moveTo(hx - 40, hy);
      c.lineTo(hx + 40, hy);
      c.lineTo(hx + 150, hy + 150);
      c.lineTo(hx + 30, hy + 150);
      c.fill();
      // the hole's broken edge, catching the moon
      c.strokeStyle = 'rgba(190,205,245,0.28)';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const rr = 1 + 0.18 * Math.sin(i * 2.7 + hx);
        c.lineTo(hx + Math.cos(ang) * 50 * rr, hy + Math.sin(ang) * 34 * rr);
      }
      c.stroke();
    }
  });

  // outside: the alley, the fallen arch, the street, the blanket
  R.paint((c) => {
    c.fillStyle = '#2b2a2c';
    c.fillRect(X2.b1, -6, 1600, 30);
    // the moonlit street, pale, beyond the buildings' shadow
    c.fillStyle = '#6a6e7c';
    c.fillRect(X2.shade, -6, 1400, 8);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(X2.b1, -6, X2.shade - X2.b1, 10);
  });
  R.glow((c) => {
    c.fillStyle = 'rgba(160,175,220,0.22)';
    c.fillRect(X2.shade, -34, 1400, 36);
  });
  if (a.body) bodyBlanket(R, a.body, !a.inside);
  else blanketShape(R, a.blanketX ?? X2.blanket, 0, 1, !a.inside);

  // the people
  for (const w of [...g.npcs, g.player]) {
    if (!w.visible || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
  }
  // the arch, in front of him as he crawls under it
  R.cast((c) => {
    c.fillStyle = '#4e4a43';
    c.beginPath();
    c.moveTo(X2.arch[0] - 20, -150);
    c.quadraticCurveTo((X2.arch[0] + X2.arch[1]) / 2, -40, X2.arch[1] + 20, -60);
    c.lineTo(X2.arch[1] + 20, -150);
    c.fill();
  });
  // the front edges of the floors, over everything inside
  R.cast((c) => {
    for (let n = 2; n <= 6; n++) {
      c.fillStyle = 'rgba(40,38,34,0.9)';
      c.fillRect(X2.b0, floorY(n) + 14, 16, 4);
    }
  });
  g.effects.draw(R);
}

function diningTable(R, x, fy) {
  R.cast((c) => {
    c.fillStyle = '#4a3a2c';
    c.fillRect(x - 60, fy - 70, 120, 6);
    c.fillRect(x - 54, fy - 64, 4, 64);
    c.fillRect(x + 50, fy - 64, 4, 64);
    // plates under dust, a jug, a chair pushed back
    c.fillStyle = '#b8b2a4';
    for (const px of [-40, -12, 16, 40]) {
      c.beginPath();
      c.ellipse(x + px, fy - 72, 9, 2.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#6a7a8a';
    c.fillRect(x + 2, fy - 86, 8, 14);
    c.fillStyle = '#3e3024';
    c.fillRect(x + 72, fy - 40, 30, 4);
    c.fillRect(x + 98, fy - 90, 4, 90);
    c.fillStyle = 'rgba(200,190,170,0.18)';
    c.fillRect(x - 60, fy - 76, 120, 4); // plaster dust
  });
}

// A stove cut from a paraffin tin, its pipe out through the wall,
// and the wall above it black: under the siege, plastic was the fuel.
function tinStove(R, x, fy) {
  R.paint((c) => {
    const g = c.createRadialGradient(x, fy - 120, 6, x, fy - 110, 90);
    g.addColorStop(0, 'rgba(8,7,6,0.75)');
    g.addColorStop(1, 'rgba(8,7,6,0)');
    c.fillStyle = g;
    c.fillRect(x - 90, fy - 210, 180, 190);
  });
  R.cast((c) => {
    c.fillStyle = '#3c3a36';
    c.fillRect(x - 16, fy - 34, 32, 34); // the tin
    c.fillStyle = '#2a2826';
    c.fillRect(x - 16, fy - 34, 32, 4);
    c.fillRect(x - 10, fy - 16, 12, 8); // the fire door
    c.fillStyle = '#4a4640';
    c.fillRect(x + 4, fy - 150, 6, 118); // the pipe, up
    c.fillRect(x + 4, fy - 150, 60, 6); // and out
    c.fillStyle = '#1c1a18';
    c.fillRect(x - 24, fy - 4, 12, 4); // a melted bottle beside it
  });
}

function childsDrawing(R, x, y) {
  R.paint((c) => {
    c.fillStyle = '#d8d2c2';
    c.fillRect(x - 24, y - 18, 48, 36);
    c.strokeStyle = '#3a6ac0';
    c.lineWidth = 1.5;
    c.strokeRect(x - 14, y - 2, 16, 12); // the house
    c.beginPath();
    c.moveTo(x - 16, y - 2);
    c.lineTo(x - 6, y - 10);
    c.lineTo(x + 4, y - 2);
    c.stroke();
    c.fillStyle = '#e8b830';
    c.beginPath();
    c.arc(x + 14, y - 10, 4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#c03a3a';
    for (let i = 0; i < 4; i++) {
      const px = x + 6 + i * 4;
      c.beginPath();
      c.moveTo(px, y + 2);
      c.lineTo(px, y + 10);
      c.stroke();
    }
  });
}

function wardrobe(R, x0, fy) {
  R.cast((c) => {
    // on its side, propped on the tilted floor: there's a crawl space under it
    c.fillStyle = '#5a4432';
    c.fillRect(x0 - 10, fy - 174, 130, 44);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x0 + 50, fy - 174, 2, 44);
    c.fillStyle = '#3e2e22';
    c.fillRect(x0 - 6, fy - 130, 8, 130); // a broken shelf holding it up
  });
}

function doorFrame(R, x, fy) {
  R.cast((c) => {
    c.fillStyle = '#6a5a48';
    c.fillRect(x - 36, fy - 180, 6, 180);
    c.fillRect(x + 30, fy - 180, 6, 180);
    c.fillRect(x - 36, fy - 186, 72, 8);
    // pencil marks up the frame, each with a year
    c.fillStyle = '#20180f';
    [[-70, 2009], [-86, 2010], [-100, 2011]].forEach(([h]) => c.fillRect(x + 30, fy + h, 10, 1.5));
  });
}

// The solids and ceilings of the building, as the level needs them. The
// flights of stairs stand in the stairwell, behind the floors, and are
// climbed as a moment of their own; the floors run wall to wall, except the
// fourth, which stops short where the stairs to it fell (a jump and a climb
// from the rubble below).
export function buildBuilding(L) {
  const floor = (n, x0, x1, raw = []) => {
    Object.assign(L.solid(x0, x1, floorY(n), floorY(n) + 16), { kind: 'floor', raw });
    L.ceiling(x0, x1, floorY(n) + 16);
  };
  floor(2, 16, X2.b1 - 18);
  floor(3, 16, X2.b1 - 18);
  floor(4, 16, X2.f4edge, [X2.f4edge]);
  floor(5, 16, X2.b1 - 18);
  L.ceiling(16, X2.b1, floorY(6) + 16); // the roof
  // the left wall, the whole height
  L.solid(-40, 16, floorY(6), 0, { noClimb: true, hidden: true });
  // the wardrobe: a crawl space under it (a ceiling)
  L.ceiling(X2.wardrobe[0], X2.wardrobe[1], floorY(3) - 130);
  // the fallen ceiling: belly only
  L.ceiling(X2.lowceil[0], X2.lowceil[1], floorY(3) - 58);
  // the rubble mound under the missing stairs to floor 4
  Object.assign(L.solid(X2.mound[0], X2.mound[1], floorY(3) - 60, floorY(3)), { kind: 'mound' });
  // outside: the fifth-floor balcony (broken short), the fourth's, a rail
  Object.assign(L.solid(X2.balc5[0], X2.balc5[1], floorY(5), floorY(5) + 12), { kind: 'balcony' });
  Object.assign(L.solid(X2.balc4[0], X2.balc4[1], floorY(4), floorY(4) + 12), { kind: 'balcony' });
  L.solid(X2.balc4[1], X2.balc4[1] + 6, floorY(5), floorY(4), { noClimb: true, hidden: true });
  // the outside wall below the hole (floors 1 to 4)
  L.solid(X2.b1 - 18, X2.b1, floorY(5) + 16, 0, { noClimb: true, hidden: true });
  // the fallen arch into the street: crawl
  L.ceiling(X2.arch[0], X2.arch[1], -58);
}

// A flight of stairs in the stairwell, behind the floors: (xa, ya) foot to
// (xb, yb) head. `broken`: which step is missing.
export function stairFlight(R, xa, ya, xb, yb, { broken = -1, slab = false, t = 0 } = {}) {
  R.paint((c) => {
    const n = 10;
    for (let k = 0; k < n; k++) {
      if (k === broken) continue;
      const sx = lerp(xa, xb, k / n);
      const sy = lerp(ya, yb, (k + 1) / n);
      const sw = (xb - xa) / n;
      c.fillStyle = '#4c4943';
      c.fillRect(Math.min(sx, sx + sw), sy, Math.abs(sw) + 1, 6);
      c.fillStyle = '#3a3733';
      c.fillRect(Math.min(sx, sx + sw), sy + 6, Math.abs(sw) + 1, (ya - yb) / n);
    }
    // the rail, bent
    c.strokeStyle = '#2a2622';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(xa, ya - 90);
    c.lineTo(xb, yb - 90);
    c.stroke();
  });
  if (slab) {
    R.cast((c) => {
      c.save();
      c.translate(lerp(xa, xb, 0.5), lerp(ya, yb, 0.5) - 20);
      c.rotate(-0.28);
      c.fillStyle = '#6f6a61';
      c.fillRect(-80, -20, 160, 28);
      c.strokeStyle = '#3b2f28';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        c.moveTo(-70 + i * 28, 8);
        c.lineTo(-74 + i * 28, 24);
      }
      c.stroke();
      c.restore();
    });
  }
}
