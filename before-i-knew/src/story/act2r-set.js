// Act 2 (Retrieval)'s world, left to right: the southern quarter from the
// olive-tree corner → lanes open to the western hill, and a gap in a
// collapsed wall to crawl through → the field hospital → a balcony with a
// sheet on its rail, a gutted flat and a half-collapsed building → the mouth
// of School Street, where our sandbags stop. The regime checkpoint is at the
// far end.
//
// The sun is low in the west (screen left), so each lane is a band of hard
// light across the street: where the sun gets through, so does the sniper's
// eye. Ahmad lies in School Street under the blanket Um Said put over him:
// a covered shape, far off. No detail of him is ever drawn.

import { lerp, clamp, rng, mixc } from '../engine/util.js';
import * as T from '../sets/town.js';

export const X = {
  start: 150,
  lanesCp: 900,
  lane1: [1200, 1560],
  wall1: [1170, 1590], // the low wall that covers lane 1
  lane2: [2350, 2850],
  car: [2410, 2650], // the burnt-out car that covers half of lane 2
  peek2: 2300,
  lane3: [3500, 3980],
  crawl: [3120, 3290], // the gap in a collapsed wall: prone only
  tyreMan: 3420,
  hosp: [4450, 5050], // the field hospital, in a ground-floor flat
  medic: 4700,
  sheet: 5200,
  frontCp: 5250,
  flat: 5460,
  rebar: 5640,
  ruin: [5720, 6140],
  ruinDoor: 5860,
  climb: [5960, 6100],
  guard: 6150,
  stop: 6110,
  mouth: [6200, 6700],
  end: 6260,
};

// Façades along the far side; the gaps are the lanes and School Street.
const BLOCKS = [
  { x: -420, w: 420, floors: 4, seed: 61, color: T.CONCRETE[1] },
  { x: 0, w: 380, floors: 3, seed: 62, color: T.CONCRETE[3], dishes: [[0.3, 3]], laundry: true, balcony: [2, 0.5, 0.1] },
  { x: 380, w: 420, floors: 4, seed: 63, color: T.CONCRETE[0], holes: [[0.6, 0.4, 24]] },
  { x: 800, w: 400, floors: 5, seed: 64, color: T.CONCRETE[4], torn: 0.4, tornLeft: false, graffiti: [['انتبه قنّاص', 0.5, -110, 34, 'rgba(120,30,26,0.8)']] },
  { x: 1560, w: 400, floors: 4, seed: 65, color: T.CONCRETE[2], torn: 0.55, tornLeft: true, holes: [[0.3, 0.3, 30]] },
  { x: 1960, w: 390, floors: 3, seed: 66, color: T.CONCRETE[5], dishes: [[0.7, 3]] },
  { x: 2850, w: 350, floors: 4, seed: 67, color: T.CONCRETE[1], torn: 0.7, tornLeft: true, graffiti: [['قنّاص', 0.5, -100, 36, 'rgba(120,30,26,0.8)']] },
  { x: 3200, w: 300, floors: 3, seed: 68, color: T.CONCRETE[3], holes: [[0.5, 0.5, 26]] },
  { x: 3980, w: 470, floors: 4, seed: 69, color: T.CONCRETE[0], torn: 0.35, tornLeft: false, balcony: [2, 0.3, 0.05], laundry: true },
  { x: 4450, w: 600, floors: 4, seed: 73, color: T.CONCRETE[1], holes: [[0.3, 0.7, 30]], torn: 0.3, tornLeft: false },
  { x: 5050, w: 330, floors: 3, seed: 70, color: T.CONCRETE[4], dishes: [[0.4, 3]] },
  { x: 5380, w: 340, floors: 3, seed: 71, color: T.CONCRETE[2], holes: [[0.7, 0.35, 34]] },
  { x: 6700, w: 420, floors: 4, seed: 72, color: T.CONCRETE[5], torn: 0.8, tornLeft: true },
];

export const LANES = [
  { id: 1, x0: X.lane1[0], x1: X.lane1[1], cover: [X.wall1] },
  { id: 2, x0: X.lane2[0], x1: X.lane2[1], cover: [[X.lane2[0] - 10, X.car[1] + 10]] }, // the car's bulk and its shadow
  { id: 3, x0: X.lane3[0], x1: X.lane3[1], cover: [] },
];

// ---------------------------------------------------------------- light --

// k: 0 at 4:30 pm (gold) … 1 at 7:00 pm (the sun gone behind the hill).
export function eveLook(g) {
  const k = g.a.duskK || 0;
  const fog = g.effects.fog;
  const sunUv = [-0.42, lerp(-0.08, 0.32, k)];
  const col = k < 0.5 ? mixc([1.0, 0.7, 0.42], [1.0, 0.52, 0.28], k * 2) : mixc([1.0, 0.52, 0.28], [0.85, 0.42, 0.42], (k - 0.5) * 2);
  const lights = [
    { uv: sunUv, color: col, intensity: lerp(1.15, 0.35, k) * (1 - fog * 0.4), radius: 0, rim: lerp(1.1, 0.7, k) },
    { uv: [0.6, -1.2], color: mixc([0.55, 0.6, 0.8], [0.45, 0.42, 0.75], k), intensity: lerp(0.25, 0.42, k), radius: 0, rim: 0.2 },
  ];
  const torch = g.torchLight();
  if (torch) lights.push(torch);
  if (g.a.tyreGlow) lights.push({ x: tyreX(), y: -70, color: [1, 0.55, 0.25], intensity: g.a.tyreGlow * (0.8 + 0.2 * Math.sin(g.time * 9)), radius: 0.12, rim: 0.5 });
  if (g.a.flameAt && g.time - g.a.flameAt < 2.5) {
    const [hx, hy] = g.player.rig.world('handN');
    lights.push({ x: hx, y: hy - 12, color: [1, 0.72, 0.4], intensity: 0.9 * (0.9 + 0.1 * Math.sin(g.time * 23)), radius: 0.1, rim: 0.6 });
  }
  if (g.a.shotAt && g.time - g.a.shotAt < 0.12) lights.push({ x: g.a.shotX, y: g.a.shotY, color: [1, 0.9, 0.7], intensity: 1.2, radius: 0.06, rim: 0.4 });
  return {
    ambient: mixc([0.27, 0.23, 0.28], [0.17, 0.16, 0.27], k),
    lights,
    groundShadow: lerp(0.8, 0.45, k) * (1 - fog * 0.6),
    god: k < 0.8 ? { uv: sunUv, strength: 0.18 + 0.2 * fog } : null,
    bloom: 0.6,
    exposure: lerp(0.86, 0.8, k),
    grain: 0.05,
    grade: { sat: lerp(0.95, 0.72, k), contrast: lerp(1.08, 1.02, k), lift: 0.005 * k, tint: [1, lerp(0.99, 0.95, k), lerp(0.96, 1.04, k)] },
    fade: g.a.endFade || 0,
  };
}

export const shearFor = (g) => -(2.2 + 1.4 * (g.a.duskK || 0)); // long shadows, thrown east

function skyStops(k) {
  const a = [[0, '#56688e'], [0.45, '#b99b86'], [0.75, '#e8b27a']];
  const b = [[0, '#2b2d52'], [0.45, '#77577a'], [0.75, '#d67e58']];
  return a.map(([p, ca], i) => {
    const A = [1, 3, 5].map((j) => parseInt(ca.slice(j, j + 2), 16));
    const B = [1, 3, 5].map((j) => parseInt(b[i][1].slice(j, j + 2), 16));
    return [p, `rgb(${A.map((v, j) => Math.round(lerp(v, B[j], k))).join(',')})`];
  });
}

// -------------------------------------------------------------- the lanes --

// Looking down a lane towards the western hill: receding walls, and at the
// end, the hill and the building with the flag. `watch` 0…1 lights a glint
// in the sniper's window.
function laneGap(R, x0, x1, { watch = 0, t = 0, seed = 1 } = {}) {
  const xc = (x0 + x1) / 2;
  const vy = -90;
  R.paint((c) => {
    const r = rng(seed);
    // the hill, low in the west, and the sky above it is the sun's
    c.fillStyle = '#6b5f5a';
    c.beginPath();
    c.moveTo(x0, vy - 60);
    c.quadraticCurveTo(xc - 40, vy - 150, xc + 60, vy - 118);
    c.lineTo(x1, vy - 90);
    c.lineTo(x1, vy + 10);
    c.lineTo(x0, vy + 10);
    c.fill();
    // the sniper's building on it, with its flag
    const bx = xc - 36 + (r() - 0.5) * 30;
    c.fillStyle = '#4e4648';
    c.fillRect(bx, vy - 176, 58, 70);
    c.fillStyle = '#24201f';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(bx + 8 + i * 17, vy - 166 + j * 26, 8, 12);
    c.fillStyle = '#3a3334';
    c.fillRect(bx + 50, vy - 212, 2, 38);
    c.fillStyle = '#5e3a38';
    c.beginPath();
    c.moveTo(bx + 52, vy - 212);
    c.quadraticCurveTo(bx + 62, vy - 214 + Math.sin(t * 3) * 2, bx + 72, vy - 208);
    c.lineTo(bx + 72, vy - 198);
    c.quadraticCurveTo(bx + 62, vy - 202 + Math.sin(t * 3 + 1) * 2, bx + 52, vy - 200);
    c.fill();
    // road narrowing to the hill
    c.fillStyle = '#7a6a5c';
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 18, vy + 6);
    c.lineTo(xc + 18, vy + 6);
    c.lineTo(x1, 4);
    c.fill();
    // receding walls either side, their inner faces in shade
    const side = (edge, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 4);
      c.lineTo(edge, -560);
      c.lineTo(xc + dir * 60, vy - 220);
      c.lineTo(xc + dir * 60, vy + 6);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(24,18,16,0.5)';
      for (let i = 0; i < 4; i++) {
        const k = i / 4 + 0.1;
        const wx = lerp(edge, xc + dir * 60, k);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(lerp(-500, vy - 200, k), lerp(-70, vy - 10, k), f / 3 + 0.1);
          c.fillRect(wx - 6 * (1 - k), wy, 12 * (1 - k) + 2, 24 * (1 - k) + 3);
        }
      }
    };
    side(x0, -1, '#6f6358');
    side(x1, 1, '#83766a');
    // the window glint: a scope catching the sun
    c.bx = bx;
  });
  const bx = xc - 36 + (rng(seed)() - 0.5) * 30;
  if (watch > 0.02)
    R.glow((c) => {
      const gx = bx + 25 + 4;
      const gy = vy - 166 + 26 + 6;
      const tw = 0.6 + 0.4 * Math.sin(t * 7);
      const grd = c.createRadialGradient(gx, gy, 0, gx, gy, 14);
      grd.addColorStop(0, `rgba(255,245,215,${0.95 * watch * tw})`);
      grd.addColorStop(1, 'rgba(255,220,160,0)');
      c.fillStyle = grd;
      c.fillRect(gx - 16, gy - 16, 32, 32);
      c.fillStyle = `rgba(255,250,230,${0.5 * watch * tw})`;
      c.fillRect(gx - 12, gy - 0.5, 24, 1);
      c.fillRect(gx - 0.5, gy - 8, 1, 16);
    });
}

// The band of low sun through a lane, across our street and the pavement.
function laneLight(R, x0, x1, k) {
  R.glow((c) => {
    const w = x1 - x0;
    const grd = c.createLinearGradient(0, -300, 0, 40);
    grd.addColorStop(0, 'rgba(255,170,90,0)');
    grd.addColorStop(0.7, `rgba(255,180,100,${0.1 * (1 - k * 0.6)})`);
    grd.addColorStop(1, `rgba(255,190,110,${0.18 * (1 - k * 0.6)})`);
    c.fillStyle = grd;
    c.beginPath();
    c.moveTo(x0 + 10, -300);
    c.lineTo(x1 - 10, -300);
    c.lineTo(x1 + w * 0.25, 40);
    c.lineTo(x0 + w * 0.25, 40);
    c.fill();
  });
}

// Torn sheets that were a sniper curtain here once.
function tornCurtain(R, x0, x1, t) {
  R.cast((c) => {
    c.strokeStyle = '#2a2622';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, -300);
    c.quadraticCurveTo((x0 + x1) / 2, -270, x1, -305);
    c.stroke();
    const rags = [[x0 + 10, 50, 120, '#cfc6b4'], [x0 + 70, 26, 60, '#8e6f5a'], [x1 - 60, 44, 90, '#6d7a82']];
    for (const [rx, w, h, col] of rags) {
      const sway = Math.sin(t * 1.4 + rx) * 4;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(rx, -298);
      c.lineTo(rx + w, -296);
      c.lineTo(rx + w * 0.8 + sway, -296 + h);
      c.lineTo(rx + w * 0.55 + sway, -296 + h * 0.7);
      c.lineTo(rx + w * 0.3 + sway, -296 + h * 0.9);
      c.lineTo(rx + sway, -296 + h * 0.6);
      c.closePath();
      c.fill();
    }
  });
}

// ------------------------------------------------------------ new props --

export function sandbags(R, x, w, rows = 3, { color = '#9c8a68', cast = true } = {}) {
  const draw = (c) => {
    const r = rng(x | 0);
    for (let row = 0; row < rows; row++) {
      const y = -row * 22;
      const off = row % 2 ? 22 : 0;
      for (let bx = x + off; bx < x + w - 20; bx += 44) {
        const sh = 0.82 + r() * 0.3;
        c.fillStyle = T.shade(color, sh);
        c.beginPath();
        c.ellipse(bx + 22, y - 11, 24, 12, (r() - 0.5) * 0.08, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(40,30,20,0.35)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(bx + 6, y - 11);
        c.lineTo(bx + 38, y - 12);
        c.stroke();
      }
    }
  };
  if (cast) R.cast(draw);
  else R.paint(draw);
}

export function concreteBlocks(c, x, n, s = 1, color = '#8d877c') {
  for (let i = 0; i < n; i++) {
    const bx = x + i * 46 * s;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(bx, 0);
    c.lineTo(bx + 8 * s, -40 * s);
    c.lineTo(bx + 32 * s, -40 * s);
    c.lineTo(bx + 40 * s, 0);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(bx + 20 * s, -40 * s, 12 * s, 40 * s);
  }
}

// A car burnt to its shell: no glass, no tyres, rust and soot.
export function burntCar(R, x, w = 240) {
  R.cast((c) => {
    const h = 112;
    c.fillStyle = '#3b2c24';
    c.beginPath();
    c.moveTo(x, -24);
    c.lineTo(x + 8, -64);
    c.lineTo(x + w * 0.24, -70);
    c.lineTo(x + w * 0.34, -h);
    c.lineTo(x + w * 0.7, -h + 2);
    c.lineTo(x + w * 0.82, -68);
    c.lineTo(x + w - 4, -60);
    c.lineTo(x + w, -24);
    c.closePath();
    c.fill();
    // rust patches and soot
    const r = rng(x | 0);
    for (let i = 0; i < 16; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(130,64,34,0.55)' : 'rgba(20,16,14,0.6)';
      c.beginPath();
      c.ellipse(x + 10 + r() * (w - 20), -30 - r() * 60, 6 + r() * 16, 4 + r() * 8, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // empty window frames
    c.fillStyle = '#14100e';
    c.beginPath();
    c.moveTo(x + w * 0.37, -h + 8);
    c.lineTo(x + w * 0.5, -h + 8);
    c.lineTo(x + w * 0.5, -72);
    c.lineTo(x + w * 0.29, -72);
    c.fill();
    c.beginPath();
    c.moveTo(x + w * 0.53, -h + 8);
    c.lineTo(x + w * 0.67, -h + 9);
    c.lineTo(x + w * 0.77, -72);
    c.lineTo(x + w * 0.53, -72);
    c.fill();
    // wheel wells on bare rims, sitting low
    c.fillStyle = '#17120f';
    for (const wx of [x + w * 0.18, x + w * 0.8]) {
      c.beginPath();
      c.arc(wx, -18, 24, Math.PI, 0);
      c.fill();
      c.strokeStyle = '#4a3a30';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(wx, -10, 13, 0, Math.PI * 2);
      c.stroke();
    }
  });
}

// A tyre burning inside the lane, lit on purpose: its smoke blinds the hill.
function tyreX() {
  return (X.lane3[0] + X.lane3[1]) / 2 - 40;
}
function tyre(R, t, glow) {
  // a little way down the lane, towards the hill: smaller, higher
  const x = tyreX();
  const S = 0.55;
  const y = -48;
  R.cast((c) => {
    c.fillStyle = '#141110';
    c.beginPath();
    c.ellipse(x, y - 14 * S, 30 * S, 14 * S, 0, 0, Math.PI * 2);
    c.fill();
  });
  if (glow > 0)
    R.glow((c) => {
      for (let i = 0; i < 6; i++) {
        const fx = x + (-22 + i * 9) * S;
        const fh = (16 + 12 * Math.sin(t * 11 + i * 2)) * glow * S;
        c.fillStyle = `rgba(255,${130 + i * 12},50,${0.6 * glow})`;
        c.beginPath();
        c.moveTo(fx - 5 * S, y - 18 * S);
        c.quadraticCurveTo(fx, y - 18 * S - fh * 1.4, fx + 5 * S, y - 18 * S);
        c.fill();
      }
    });
}

// The smoke across lane 3, drawn in front of everyone. density 0…1.
function tyreSmoke(R, t, density) {
  if (density <= 0.02) return;
  const [x0, x1] = X.lane3;
  R.paint((c) => {
    const r = rng(33);
    for (let i = 0; i < 26; i++) {
      const k = i / 25;
      const px = lerp(x0 - 40, x1 + 80, r()) + Math.sin(t * 0.4 + i) * 30 + ((t * 18 + i * 40) % 160) - 80;
      const py = -30 - r() * 420 - k * 60;
      const pr = 70 + r() * 110;
      const a = Math.min(1, 0.9 * density * (0.6 + 0.4 * r()));
      const grd = c.createRadialGradient(px, py, 0, px, py, pr);
      grd.addColorStop(0, `rgba(58,52,50,${a})`);
      grd.addColorStop(0.6, `rgba(70,64,60,${a * 0.6})`);
      grd.addColorStop(1, 'rgba(70,64,60,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.arc(px, py, pr, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// The field hospital: a ground-floor flat with its front wall half gone and
// a tarp where the balcony door was. Inside, a camping table of supplies, a
// drip stand made from a coat rack, a small fridge, and the one light the
// generator keeps on.
function fieldHospital(R, x0, x1, t) {
  const w = x1 - x0;
  const ox = x0 + 150; // the opening
  const ow = 300;
  R.paint((c) => {
    c.fillStyle = '#2e2822';
    c.fillRect(ox, -190, ow, 190);
    c.fillStyle = '#3a332b';
    c.fillRect(ox, -30, ow, 30);
    // the table and its supplies
    c.fillStyle = '#5d5a52';
    c.fillRect(ox + 40, -78, 110, 5);
    c.fillRect(ox + 46, -73, 3, 73);
    c.fillRect(ox + 142, -73, 3, 73);
    c.fillStyle = '#cfcac0';
    c.fillRect(ox + 52, -92, 16, 14);
    c.fillRect(ox + 74, -88, 10, 10);
    c.fillStyle = '#8a3a30';
    c.fillRect(ox + 94, -90, 18, 12);
    c.fillStyle = '#d8d4ca';
    c.fillRect(ox + 118, -86, 24, 8);
    // the drip stand: a coat rack, a bag hung on a hook
    c.fillStyle = '#4a3a2c';
    c.fillRect(ox + 190, -170, 4, 170);
    c.fillRect(ox + 176, -4, 32, 4);
    c.fillRect(ox + 182, -170, 20, 3);
    c.fillStyle = 'rgba(220,230,235,0.8)';
    c.fillRect(ox + 196, -164, 12, 22);
    c.strokeStyle = 'rgba(210,220,225,0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(ox + 202, -142);
    c.quadraticCurveTo(ox + 214, -90, ox + 200, -60);
    c.stroke();
    // the fridge, and the generator's cable to the lamp
    c.fillStyle = '#b8b4aa';
    c.fillRect(ox + 238, -80, 44, 80);
    c.fillStyle = '#8c887e';
    c.fillRect(ox + 276, -60, 3, 18);
    c.strokeStyle = '#141210';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(ox + 150, -190);
    c.quadraticCurveTo(ox + 160, -176, ox + 150, -160);
    c.stroke();
  });
  R.glow((c) => {
    // the single bulb, and its pool of light
    const f = 0.92 + 0.08 * Math.sin(t * 17) * Math.sin(t * 3.1);
    const grd = c.createRadialGradient(ox + 150, -156, 0, ox + 150, -156, 170);
    grd.addColorStop(0, `rgba(255,236,190,${0.55 * f})`);
    grd.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = grd;
    c.fillRect(ox, -190, ow, 190);
    c.fillStyle = `rgba(255,245,215,${f})`;
    c.fillRect(ox + 147, -160, 6, 7);
    // a Red Crescent daubed by the door
  });
  R.cast((c) => {
    // what's left of the front wall either side of the opening
    c.fillStyle = '#a2967f';
    c.beginPath();
    c.moveTo(ox - 4, 2);
    c.lineTo(ox - 4, -190);
    c.lineTo(ox + 40, -196);
    c.lineTo(ox + 30, -150);
    c.lineTo(ox + 12, -120);
    c.lineTo(ox + 10, 2);
    c.fill();
    // the tarp, flapping in the wind
    const flap = Math.sin(t * 2.3) * 10 + Math.sin(t * 5.1) * 4;
    c.fillStyle = '#3f6a78';
    c.beginPath();
    c.moveTo(ox + ow - 110, -192);
    c.lineTo(ox + ow + 4, -192);
    c.lineTo(ox + ow + 4 + flap * 0.3, -20);
    c.quadraticCurveTo(ox + ow - 50 + flap, -12, ox + ow - 110 + flap, -40);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(ox + ow - 60, -190);
    c.lineTo(ox + ow - 58 + flap * 0.8, -30);
    c.stroke();
    // a red crescent, painted on the wall by hand
    c.fillStyle = '#a23a30';
    c.beginPath();
    c.arc(ox - 70, -150, 22, 0, Math.PI * 2);
    c.arc(ox - 62, -152, 18, 0, Math.PI * 2, true);
    c.fill();
  });
  void w;
}

// A collapsed wall across the pavement, with a gap at the bottom barely
// shoulder-width. Drawn over the player, who crawls beneath it.
function crawlWall(R) {
  const [x0, x1] = X.crawl;
  R.cast((c) => {
    const r = rng(52);
    c.fillStyle = '#958a76';
    c.beginPath();
    c.moveTo(x0 - 30, 2);
    c.lineTo(x0 - 20, -300);
    c.lineTo(x0 + 40, -340);
    c.lineTo(x1 - 20, -310);
    c.lineTo(x1 + 30, -260);
    c.lineTo(x1 + 40, 2);
    c.lineTo(x1 - 6, 2);
    // the gap: a ragged lip of concrete hanging over it
    for (let i = 0; i <= 8; i++) c.lineTo(x1 - 6 - ((x1 - x0 - 12) * i) / 8, -52 - r() * 10);
    c.lineTo(x0 + 6, 2);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 6; i++) c.fillRect(x0 + r() * (x1 - x0), -300 + r() * 220, 30 + r() * 30, 3);
    c.strokeStyle = '#3e3126';
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const rx = x0 + 10 + i * 26;
      c.beginPath();
      c.moveTo(rx, -54);
      c.quadraticCurveTo(rx + 6, -40, rx - 4, -30 - r() * 8);
      c.stroke();
    }
  });
}

// A first-floor balcony, and on its rail a sheet drying in the last sun.
function balcony(R, x, t, sheet) {
  R.cast((c) => {
    c.fillStyle = '#8a7f6c';
    c.fillRect(x - 70, -150, 140, 10);
    c.strokeStyle = '#3a312a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 70, -190);
    c.lineTo(x + 70, -190);
    for (let i = 0; i <= 14; i++) {
      c.moveTo(x - 70 + i * 10, -190);
      c.lineTo(x - 70 + i * 10, -150);
    }
    c.stroke();
    if (sheet) {
      const sway = Math.sin(t * 1.5) * 4;
      c.fillStyle = '#e6e1d4';
      c.beginPath();
      c.moveTo(x - 50, -192);
      c.lineTo(x + 40, -192);
      c.lineTo(x + 42 + sway, -96);
      c.lineTo(x + 20 + sway, -104);
      c.lineTo(x - 10 + sway, -94);
      c.lineTo(x - 48 + sway, -100);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(160,140,110,0.3)';
      c.fillRect(x + 20, -170, 16, 30); // a sun-rotted patch
    }
  });
}

// A flat burnt out from inside: soot licking up from the doorway.
function guttedFlat(R, x) {
  R.paint((c) => {
    c.fillStyle = '#0f0c0a';
    c.fillRect(x - 45, -175, 90, 175);
    const grd = c.createLinearGradient(0, -175, 0, -420);
    grd.addColorStop(0, 'rgba(18,14,12,0.85)');
    grd.addColorStop(1, 'rgba(18,14,12,0)');
    c.fillStyle = grd;
    c.beginPath();
    c.moveTo(x - 50, -175);
    c.quadraticCurveTo(x - 60, -320, x - 10, -420);
    c.quadraticCurveTo(x + 30, -320, x + 55, -175);
    c.fill();
  });
}

// The building beside School Street, half down: floors pancaked on the
// right, slabs hanging by their rebar. `cut` 0…1 opens the façade so we can
// see Sami inside.
function ruin(R, t, cut) {
  const [x0, x1] = X.ruin;
  const w = x1 - x0;
  R.paint((c) => {
    c.fillStyle = '#8f846f';
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(x0, -520);
    c.lineTo(x0 + w * 0.45, -520);
    c.lineTo(x0 + w * 0.6, -430);
    c.lineTo(x0 + w * 0.8, -300);
    c.lineTo(x1, -220);
    c.lineTo(x1, 4);
    c.closePath();
    c.fill();
    // the slabs, sagging towards the street
    c.fillStyle = '#6f6656';
    for (const [y, drop] of [[-380, 60], [-250, 90], [-130, 40]]) {
      c.beginPath();
      c.moveTo(x0 + w * 0.3, y);
      c.lineTo(x1 + 20, y + drop);
      c.lineTo(x1 + 20, y + drop + 14);
      c.lineTo(x0 + w * 0.3, y + 14);
      c.fill();
    }
    c.strokeStyle = '#3a2e24';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const rx = x1 + 16 - i * 7;
      c.beginPath();
      c.moveTo(rx, -250 + 90 + 12);
      c.quadraticCurveTo(rx + 8, -120, rx - 6, -90 + i * 4);
      c.stroke();
    }
    // windows on the standing half
    c.fillStyle = '#1c1714';
    for (let f = 0; f < 3; f++) for (let i = 0; i < 2; i++) c.fillRect(x0 + 30 + i * 70, -480 + f * 130, 40, 60);
    // the doorway
    c.fillStyle = '#0b0908';
    c.fillRect(X.ruinDoor - 36, -160, 72, 160);
  });
  if (cut > 0)
    R.paint((c) => {
      // inside: a dark room and the slab that fell into it, a ramp up to the
      // first floor
      c.globalAlpha = cut;
      c.fillStyle = '#231d18';
      c.fillRect(X.ruinDoor + 36, -250, x1 - X.ruinDoor - 36, 254);
      c.fillStyle = '#4a4034';
      c.beginPath();
      c.moveTo(X.climb[0], 0);
      c.lineTo(X.climb[0], -100);
      c.lineTo(X.climb[1], -104);
      c.lineTo(X.climb[1] + 30, -250);
      c.lineTo(X.climb[1] + 44, -250);
      c.lineTo(X.climb[1] + 10, 0);
      c.fill();
      c.globalAlpha = 1;
    });
}

// Looking down School Street from our sandbags to theirs. `peek` pushes
// the camera in. Ahmad's satchel lies halfway; nothing else of him is shown.
function schoolStreet(R, g, t) {
  const [x0, x1] = X.mouth;
  const xc = (x0 + x1) / 2;
  const vy = -86;
  const at = (k) => ({ s: 1 / (1 + 3.4 * k), x: xc, y: lerp(4, vy, 1 - 1 / (1 + 3.4 * k)) });
  R.paint((c) => {
    // far end: the checkpoint in the last of the light
    c.fillStyle = '#5a5058';
    c.fillRect(x0 + 60, vy - 140, x1 - x0 - 120, 150);
    // road, long and flat
    c.fillStyle = '#6f6356';
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 26, vy);
    c.lineTo(xc + 26, vy);
    c.lineTo(x1, 4);
    c.fill();
    // the centre line, still there
    c.strokeStyle = 'rgba(210,200,170,0.35)';
    c.lineWidth = 2;
    c.setLineDash([14, 18]);
    c.beginPath();
    c.moveTo(xc, 4);
    c.lineTo(xc, vy);
    c.stroke();
    c.setLineDash([]);
    // receding façades
    const side = (edge, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 4);
      c.lineTo(edge, -560);
      c.lineTo(xc + dir * 34, vy - 150);
      c.lineTo(xc + dir * 34, vy);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(22,18,16,0.55)';
      for (let i = 0; i < 6; i++) {
        const k = i / 6 + 0.06;
        const wx = lerp(edge, xc + dir * 34, k);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(lerp(-500, vy - 140, k), lerp(-70, vy - 10, k), f / 3 + 0.1);
          c.fillRect(wx - 6 * (1 - k), wy, 12 * (1 - k) + 2, 22 * (1 - k) + 3);
        }
      }
    };
    side(x0, -1, '#7d7064');
    side(x1, 1, '#6c6158');
    // the checkpoint: sandbags, concrete blocks, a flag, a watchtower, a soldier
    const e = at(1);
    c.save();
    c.translate(xc, vy + 2);
    const s = 0.24;
    c.scale(s, s);
    c.fillStyle = '#51483e';
    concreteBlocks(c, -150, 7, 1, '#6a645a');
    c.fillStyle = '#5e5242';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(-120 + i * 44, -54, 24, 12, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#3a3432';
    c.fillRect(120, -230, 8, 230); // the tower's legs
    c.fillRect(180, -230, 8, 230);
    c.fillRect(110, -270, 90, 44);
    c.fillStyle = '#2a2524';
    c.fillRect(-60, -300, 4, 250); // flagpole
    const wave = Math.sin(t * 2.4) * 4;
    const band = (y, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-56, -300 + y);
      c.quadraticCurveTo(-20, -304 + y + wave, 20, -300 + y);
      c.lineTo(20, -286 + y);
      c.quadraticCurveTo(-20, -290 + y + wave, -56, -286 + y);
      c.fill();
    };
    band(0, '#7a3a36');
    band(14, '#b7b0a2');
    band(28, '#2a2626');
    // a soldier behind the bags: a helmeted silhouette, still
    c.fillStyle = '#2b2a28';
    c.beginPath();
    c.arc(40, -96, 11, Math.PI, 0);
    c.fill();
    c.fillRect(30, -96, 20, 34);
    c.restore();
    void e;
  });
  // Ahmad, halfway, under the blanket Um Said put over him: a dark shape
  // at a distance, and nothing more.
  const m = at(0.3);
  R.cast((c) => {
    c.save();
    c.translate(m.x + 20 * m.s, m.y);
    c.scale(m.s * 1.25, m.s * 1.25);
    const rip = Math.sin(t * 1.3) * 1.5;
    c.fillStyle = '#4e4338';
    c.beginPath();
    c.moveTo(-70, 0);
    c.quadraticCurveTo(-66, -18, -40, -20 + rip);
    c.quadraticCurveTo(0, -26, 30, -18 + rip * 0.6);
    c.quadraticCurveTo(62, -16, 72, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(-60, -6, 128, 6);
    c.restore();
  });
}

// ---------------------------------------------------------------- scene --

export function drawStreet(R, g) {
  const t = g.time;
  const a = g.a;
  const k = a.duskK || 0;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1400 && x0 < cx + 1400;

  T.sky(R, skyStops(k), { sun: [0.08, lerp(0.42, 0.72, k)], warmth: clamp(0.8 + k * 0.4) });
  T.skyline(R, { depth: 0.15, y: 30, color: mixc([163, 154, 144], [112, 98, 118], k).map(Math.round).reduce((s, v) => s + v.toString(16).padStart(2, '0'), '#'), seed: 14, haze: ['#d8b8a0', 0.3], minarets: [900] });
  T.plume(R, 1600, 60, t, { depth: 0.18, age: 1, height: 360, width: 60, alpha: 0.4, color: [80, 74, 78] });
  T.skyline(R, { depth: 0.32, y: 40, color: mixc([143, 132, 116], [96, 84, 96], k).map(Math.round).reduce((s, v) => s + v.toString(16).padStart(2, '0'), '#'), seed: 19, haze: ['#cfae96', 0.18] });

  // swifts, screaming in loose parties over the rooftops
  if (a.swiftsAt && t - a.swiftsAt < 6) {
    R.layer(0.4);
    R.paint((c) => {
      const r = rng(Math.floor(a.swiftsAt));
      const u = (t - a.swiftsAt) / 6;
      c.fillStyle = 'rgba(30,26,34,0.85)';
      for (let i = 0; i < 7; i++) {
        const bx = cx * 0.4 - 900 + u * 1800 + r() * 260 + Math.sin(t * 3 + i) * 30;
        const by = -420 - r() * 160 + Math.sin(t * 5 + i * 2) * 20;
        const flap = Math.sin(t * 22 + i) * 0.4;
        c.beginPath();
        c.moveTo(bx - 9, by - 2 + flap * 5);
        c.quadraticCurveTo(bx - 3, by - 1, bx, by);
        c.quadraticCurveTo(bx + 3, by - 1, bx + 9, by - 2 + flap * 5);
        c.lineTo(bx, by + 2);
        c.fill();
      }
    });
    R.layer(1);
  }

  // the lanes: what you see down them, before the façades frame them
  const laneWatch = [1, a.watch2 ?? 1, a.watch3 ?? 1];
  LANES.forEach((L, i) => {
    if (near(L.x0, L.x1)) laneGap(R, L.x0, L.x1, { watch: laneWatch[i], t, seed: 70 + i });
  });
  if (near(X.lane3[0], X.lane3[1])) tyre(R, t, a.tyreGlow || 0);
  if (near(X.mouth[0] - 200, X.mouth[1])) schoolStreet(R, g, t);

  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  if (near(X.hosp[0], X.hosp[1])) fieldHospital(R, X.hosp[0], X.hosp[1], t);
  if (near(X.flat - 100, X.flat + 100)) guttedFlat(R, X.flat);
  if (near(X.sheet - 100, X.sheet + 100)) balcony(R, X.sheet, t, !a.hasSheet);
  if (near(X.ruin[0], X.ruin[1])) ruin(R, t, a.cut || 0);
  // the evening throws the shadows of our side's blocks long and east
  R.shadow((c) => {
    c.fillStyle = 'rgba(0,0,0,1)';
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (!near(b.x - 300, b.x + b.w + 300)) continue;
      const h = 240 + ((i * 97) % 5) * 50 + k * 200;
      const x0 = b.x + ((i * 53) % 3) * 50 - 60;
      const w = b.w * (0.5 + ((i * 31) % 4) * 0.1);
      c.beginPath();
      c.moveTo(x0, 10);
      c.lineTo(x0 + 40, -h);
      c.lineTo(x0 + w + 80, -h + 40);
      c.lineTo(x0 + w + 140, 10);
      c.closePath();
      c.fill();
    }
  }, 0, 0, 0, 1);

  T.street(R, -500, 7200);
  T.cables(R, cx, { seed: 23, to: 7000 });
  LANES.forEach((L) => {
    if (near(L.x0, L.x1)) laneLight(R, L.x0, L.x1, k);
  });
  if (near(X.lane1[0], X.lane1[1])) tornCurtain(R, X.lane1[0] + 20, X.lane1[1] - 20, t);
  if (near(X.rebar - 100, X.rebar + 100)) T.rubble(R, X.rebar - 70, 150, 50, { seed: 88, rebar: true });
  // our sandbags at the mouth of School Street, and a blanket on a wire
  // across it, high, so the checkpoint can't see who crosses behind
  if (near(X.mouth[0] - 200, X.mouth[1] + 200)) {
    R.cast((c) => {
      c.strokeStyle = '#2a2622';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(X.mouth[0] - 10, -330);
      c.quadraticCurveTo((X.mouth[0] + X.mouth[1]) / 2, -300, X.mouth[1] + 10, -336);
      c.stroke();
      const cols = ['#6b3f36', '#4a5260', '#8a7a5a', '#6b3f36'];
      for (let i = 0; i < 4; i++) {
        const bx = X.mouth[0] + i * 125;
        const sway = Math.sin(t * 1.1 + i) * 4;
        c.fillStyle = cols[i];
        c.beginPath();
        c.moveTo(bx, -326 + i * 2);
        c.lineTo(bx + 120, -322 + i * 2);
        c.lineTo(bx + 120 + sway, -190 - (i % 2) * 14);
        c.lineTo(bx + sway, -186);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.15)';
        c.fillRect(bx + 20, -320, 2, 130);
        c.fillRect(bx + 70, -320, 2, 130);
      }
    });
    // rubble closing our street beyond the mouth
    T.rubble(R, X.mouth[1] - 20, 260, 180, { seed: 91 });
  }
  // the curtain rail in the rubble, when D1 needs it
  if (a.rebarGlint && near(X.rebar - 50, X.rebar + 50)) {
    R.glow((c) => {
      const tw = 0.5 + 0.5 * Math.sin(t * 5);
      c.fillStyle = `rgba(255,230,200,${0.3 + 0.3 * tw})`;
      c.fillRect(X.rebar - 12, -46, 24, 1.5);
    });
  }

  // --- the people ---
  const shear = shearFor(g);
  R.paint((c) => {
    for (const w of [...g.npcs, g.player]) {
      if (!w.visible || w.depthK || !near(w.x - 60, w.x + 60)) continue;
      const s2 = w.rig.scale || 1;
      const grd = c.createRadialGradient(w.x, w.y + 2, 0, w.x, w.y + 2, 26 * s2);
      grd.addColorStop(0, 'rgba(20,14,10,0.34)');
      grd.addColorStop(1, 'rgba(20,14,10,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.ellipse(w.x, w.y + 2, 26 * s2, 5 * s2, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  for (const w of g.npcs) {
    if (!w.visible || !near(w.x - 100, w.x + 100) || w.depthK) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, 0.1);
  }
  const p = g.player;
  if (p.visible) {
    if (a.inside) {
      R.cast((c) => p.draw(c));
    } else {
      R.cast((c) => p.draw(c));
      R.shadow((c) => p.draw(c), p.x, p.y, shear, 0.1);
    }
  }
  for (const w of [p, ...g.npcs]) if (w.visible && w.depthK) R.cast((c) => w.draw(c));

  // --- in front: the cover, the smoke, the bags ---
  if (near(X.wall1[0], X.wall1[1])) T.lowWall(R, X.wall1[0], X.wall1[1] - X.wall1[0], 104, '#a3957c');
  if (near(X.car[0], X.car[1])) burntCar(R, X.car[0], X.car[1] - X.car[0]);
  if (near(X.crawl[0] - 60, X.crawl[1] + 60)) crawlWall(R);
  if (near(X.lane3[0], X.lane3[1])) tyreSmoke(R, t, a.smoke || 0);
  if (near(X.guard - 100, X.mouth[0] + 200)) sandbags(R, X.guard + 10, 150, 4);
  // the ruin's front wall comes back over Sami once he's through the door
  if (a.inside && (a.cut || 0) < 1) {
    R.paint((c) => {
      c.globalAlpha = 1 - (a.cut || 0);
      c.fillStyle = '#8f846f';
      c.fillRect(X.ruinDoor + 36, -250, X.ruin[1] - X.ruinDoor - 36, 254);
      c.globalAlpha = 1;
    });
  }

  g.effects.draw(R);
  g.effects.drawFog(R, [190, 150, 130]);
  T.motes(R, cx, t, 0.8 * (1 - k));
  T.foreground(R, cx, { to: 7000 });
}

export function surfaceAt(x) {
  if (x > X.rebar - 80 && x < X.rebar + 90) return 'rubble';
  if (x > X.ruin[0] && x < X.ruin[1]) return 'rubble';
  if (x > X.crawl[0] - 40 && x < X.crawl[1] + 40) return 'rubble';
  return 'grit';
}
