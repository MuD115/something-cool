// Act 1's world: where everything stands, and how each place is drawn and lit.
// Left to right: Zeitoun Street → the junction → Well Street → the corner →
// the spotter's building → the open stretch → the school → the car-battery
// room → the corner with the dead olive tree.

import { lerp, clamp, rng, noise1, mixc, smooth } from '../engine/util.js';
import * as T from '../sets/town.js';
import { horizon, rgbOf } from '../sets/horizon.js';
import { Person, POSES } from '../rigs/person.js';

export const X = {
  start: 150,
  vine: 620,
  pigeon: 980,
  curtain0: 1450,
  curtain1: 1800,
  sag0: 1565,
  sag1: 1695,
  wall0: 2110,
  wall1: 2250,
  shop: 2460,
  junction: 3110,
  oldMan: 3660,
  door: 4150,
  shard: 4470,
  corner: 4930,
  cross1: 5330,
  spotter: 5700,
  heli: 6250,
  coverWall: 6380,
  collapsed: 7250,
  layla: 7380,
  scrap: 7470,
  lowWall: 7590,
  stairs: 7740,
  school: 7650,
  catWall: 7960,
  classroom: 8050,
  battery: 8620,
  newsStart: 9250,
  kerb: 9520,
  olive: 9730,
  abu: 9690,
  south: 10020,
  end: 10250,
};

// Façades along the far side of the street (depth 1, so actors' shadows
// fall on them). Gaps leave room for side streets.
const BLOCKS = [
  { x: -420, w: 400, floors: 4, seed: 1, color: T.CONCRETE[2] },
  { x: -20, w: 430, floors: 5, seed: 2, color: T.CONCRETE[0], torn: 0.5, tornLeft: false, holes: [[0.3, 0.45, 26]], balcony: [3, 0.1, 0.22], laundry: true, dishes: [[0.8, 4]] },
  { x: 410, w: 320, floors: 3, seed: 3, color: T.CONCRETE[3], ac: [[0.2, 2]] },
  { x: 730, w: 390, floors: 4, seed: 4, color: T.CONCRETE[1], dishes: [[0.25, 3], [0.7, 3]], holes: [[0.75, 0.3, 18]] },
  { x: 1120, w: 330, floors: 5, seed: 5, color: T.CONCRETE[4], torn: 0.45, tornLeft: false },
  { x: 1800, w: 370, floors: 4, seed: 6, color: T.CONCRETE[5], graffiti: [['حرية', 0.5, -230, 44, 'rgba(120,40,34,0.75)']], holes: [[0.2, 0.2, 22]] },
  { x: 2170, w: 250, floors: 3, seed: 7, color: T.CONCRETE[2], torn: 0.8, tornLeft: true },
  { x: 2420, w: 470, floors: 4, seed: 8, color: T.CONCRETE[0], shopFront: true, balcony: [2, 0.7, -0.05], laundry: true },
  { x: 3320, w: 390, floors: 4, seed: 9, color: T.CONCRETE[1], dishes: [[0.5, 4]] },
  { x: 3710, w: 290, floors: 3, seed: 10, color: T.CONCRETE[3], holes: [[0.5, 0.3, 30]] },
  { x: 4000, w: 330, floors: 4, seed: 11, color: T.CONCRETE[5], ac: [[0.7, 1]] },
  { x: 4330, w: 600, floors: 4, seed: 12, color: T.CONCRETE[4], torn: 0.6, tornLeft: false, holes: [[0.25, 0.55, 34]], graffiti: [['الشعب يريد إسقاط النظام', 0.4, -60, 30, 'rgba(30,30,40,0.7)']] },
  { x: 5330, w: 620, floors: 4, seed: 13, color: T.CONCRETE[0], torn: 0.75, tornLeft: true, dishes: [[0.85, 3]] },
  { x: 5950, w: 300, floors: 1, seed: 14, color: T.CONCRETE[2], torn: 0.9, tornLeft: true },
  { x: 6560, w: 380, floors: 1, seed: 15, color: T.CONCRETE[1], torn: 0.8, tornLeft: false },
  { x: 6940, w: 310, floors: 2, seed: 16, color: T.CONCRETE[3], holes: [[0.4, 0.5, 24]] },
  { x: 8170, w: 260, floors: 4, seed: 17, color: T.CONCRETE[5] },
  { x: 8430, w: 470, floors: 4, seed: 18, color: T.CONCRETE[2], dishes: [[0.3, 4]], balcony: [2, 0.2, 0], laundry: true },
  { x: 8900, w: 380, floors: 5, seed: 19, color: T.CONCRETE[0], torn: 0.4, tornLeft: true, holes: [[0.6, 0.6, 28]] },
  { x: 9280, w: 320, floors: 3, seed: 20, color: T.CONCRETE[4] },
  { x: 9600, w: 280, floors: 2, seed: 21, color: T.CONCRETE[1] },
  { x: 10160, w: 420, floors: 4, seed: 22, color: T.CONCRETE[3] },
];

// ---------------------------------------------------------------- light --

export function sunLook(g) {
  const k = g.a.sunK;
  const drain = g.a.drain || 0;
  const fog = g.effects.fog;
  const col = mixc([1.0, 0.96, 0.9], [1.0, 0.7, 0.42], k);
  const sunUv = [-0.28 - 0.1 * k, -0.95 + 0.85 * k];
  const lights = [
    { uv: sunUv, color: col, intensity: (1.25 - 0.2 * k) * (1 - fog * 0.45), radius: 0, rim: 0.55 + 0.6 * k },
    { uv: [0.5, -1.2], color: [0.55, 0.62, 0.78], intensity: 0.25 + fog * 0.3, radius: 0, rim: 0.2 },
  ];
  const torch = g.torchLight();
  if (torch) lights.push(torch);
  if (g.a.doorGlow) lights.push({ x: X.door + 30, y: -90, color: [1, 0.72, 0.45], intensity: g.a.doorGlow, radius: 0.15, rim: 0.6 });
  if (g.a.flashAt && g.time - g.a.flashAt < 0.4) {
    const f = 1 - (g.time - g.a.flashAt) / 0.4;
    lights.push({ x: g.a.flashX, y: -60, color: [1, 0.8, 0.55], intensity: 3 * f, radius: 0.5, rim: 1.2 });
  }
  return {
    ambient: mixc([0.3, 0.31, 0.38], [0.27, 0.23, 0.28], k).map((v) => v * (1 - drain * 0.35)),
    lights,
    groundShadow: 0.75 * (1 - fog * 0.6),
    god: fog > 0.15 ? { uv: sunUv, strength: 0.35 * fog } : null,
    bloom: 0.55,
    exposure: 0.86 - drain * 0.1,
    grain: 0.045,
    grade: { sat: lerp(0.9, 0.18, drain), contrast: lerp(1.07, 0.92, drain), lift: -0.01 * drain, tint: [1, 1 - 0.02 * drain, 1 - 0.04 * drain] },
  };
}

export const shearFor = (g) => 0.3 + 1.7 * g.a.sunK;

// ---------------------------------------------------------------- sky ----

function skyStops(k) {
  const a = [[0, '#6f8fb4'], [0.45, '#a9bccb'], [0.75, '#d9d3c4']];
  const b = [[0, '#56688e'], [0.45, '#b99b86'], [0.75, '#e8b27a']];
  return a.map(([p, ca], i) => {
    const A = [1, 3, 5].map((j) => parseInt(ca.slice(j, j + 2), 16));
    const B = [1, 3, 5].map((j) => parseInt(b[i][1].slice(j, j + 2), 16));
    return [p, `rgb(${A.map((v, j) => Math.round(lerp(v, B[j], k))).join(',')})`];
  });
}

// ------------------------------------------------------------ side street --

// A street running away from us, into the gap between two blocks.
function sideStreet(R, x0, x1, { minaret = false, t = 0, curtainWindow = false } = {}) {
  const xc = (x0 + x1) / 2;
  const vy = -70;
  R.paint((c) => {
    // road narrowing to the vanishing point
    c.fillStyle = '#7a7064';
    c.beginPath();
    c.moveTo(x0, 4);
    c.lineTo(xc - 22, vy);
    c.lineTo(xc + 22, vy);
    c.lineTo(x1, 4);
    c.fill();
    // receding façades either side
    const side = (edge, dir, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(edge, 4);
      c.lineTo(edge, -520);
      c.lineTo(xc + dir * 30, vy - 150);
      c.lineTo(xc + dir * 30, vy);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(30,24,20,0.55)';
      for (let i = 0; i < 5; i++) {
        const k = i / 5;
        const wx = lerp(edge, xc + dir * 30, k + 0.08);
        const top = lerp(-470, vy - 140, k + 0.08);
        const bot = lerp(-60, vy - 10, k + 0.08);
        for (let f = 0; f < 3; f++) {
          const wy = lerp(top, bot, f / 3 + 0.08);
          c.fillRect(wx - 6 * (1 - k), wy, 12 * (1 - k) + 2, 26 * (1 - k) + 3);
        }
      }
    };
    side(x0, -1, '#9d917d');
    side(x1, 1, '#8c806e');
    if (minaret) T.minaret(c, xc + 8, vy + 10, 0.55, '#8a7e6c');
    if (curtainWindow) {
      // a window across the far street, a curtain lifting in it
      c.fillStyle = '#b4a893';
      c.fillRect(xc - 70, vy - 170, 140, 170);
      c.fillStyle = '#231d19';
      c.fillRect(xc - 25, vy - 130, 50, 44);
      c.fillStyle = '#c9c0b0';
      const lift = 0.5 + 0.5 * Math.sin(t * 2.1);
      c.beginPath();
      c.moveTo(xc - 25, vy - 130);
      c.lineTo(xc + 5, vy - 130);
      c.quadraticCurveTo(xc + 5 + lift * 10, vy - 105, xc - 5 + lift * 18, vy - 86);
      c.lineTo(xc - 25, vy - 86);
      c.fill();
    }
  });
}

// --------------------------------------------------------------- scenes --

// the spotter's window (world units)
const SPOT_WIN = { x0: X.spotter - 40, x1: X.spotter + 85, top: -470, sill: -372, floor: -330 };

export function drawStreet(R, g) {
  const t = g.time;
  const a = g.a;
  const cx = R.cam.x;
  const near = (x0, x1) => x1 > cx - 1400 && x0 < cx + 1400;

  T.sky(R, skyStops(a.sunK), { warmth: clamp(a.sunK || 0) });
  const stops = skyStops(a.sunK);
  horizon(R, {
    haze: rgbOf(stops[stops.length - 1][1]),
    shade: mixc([128, 118, 106], [98, 86, 84], a.sunK || 0),
    cloud: mixc([255, 248, 236], [255, 214, 180], a.sunK || 0),
    span: 11000,
    seed: 4,
    t,
    lite: g.settings.get('quality') === 'low',
  });
  // smoke from elsewhere in Ghouta, always somewhere
  T.plume(R, 900, 60, t, { depth: 0.18, age: 1, height: 380, width: 60, alpha: 0.45, color: [90, 86, 84] });
  // the barrel bomb's dust, a district away: behind the nearer rooftops
  if (a.plumeAt) T.plume(R, a.plumeX, 60, t, { depth: 0.3, age: (g.time - a.plumeAt) / 9, height: 520, width: 150, alpha: 0.8, color: [140, 120, 98] });
  if (a.fil) T.plume(R, a.fil.x, 60, t, { depth: 0.3, age: (g.time - a.fil.t) / 9, height: 420, width: 110, alpha: 0.7 });
  T.skyline(R, { depth: 0.32, y: 40, color: '#8f8474', seed: 9, haze: ['#cfc4b2', 0.18], minarets: [1500] });

  // the jet: low, fast, gone before you find it. A thin vapour trail and a
  // shimmer of hot exhaust behind it.
  if (a.jetFly) {
    const k = (g.time - a.jetFly.t0) / a.jetFly.dur;
    if (k > -0.05 && k < 2.2) {
      R.layer(0.35);
      R.paint((c) => {
        const x = lerp(a.jetFly.x0, a.jetFly.x1, Math.min(Math.max(k, 0), 1.2));
        const y = -330 + k * 24;
        const fade = k > 1 ? Math.max(0, 1 - (k - 1) / 1.2) : 1;
        const tail = 900;
        const grad = c.createLinearGradient(x - tail, y, x - 60, y);
        grad.addColorStop(0, 'rgba(238,238,234,0)');
        grad.addColorStop(1, `rgba(238,238,234,${0.4 * fade})`);
        c.strokeStyle = grad;
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(x - tail, y + 10);
        c.lineTo(x - 60, y + 2);
        c.stroke();
        if (k < 1.2) T.jet(c, x, y, 1.5, t);
      });
      R.layer(1);
    }
  }

  // far side of the street
  for (const b of BLOCKS) if (near(b.x, b.x + b.w)) T.block(R, b, t);
  // Shadows of the blocks on our side of the street (off camera) fall
  // across the façades in slanted bands; they grow as the sun drops.
  R.shadow((c) => {
    const k = a.sunK;
    c.fillStyle = 'rgba(0,0,0,1)';
    for (let i = 0; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (!near(b.x - 200, b.x + b.w + 200)) continue;
      const h = 120 + ((i * 97) % 5) * 55 + k * 180;
      const x0 = b.x + ((i * 53) % 3) * 60 - 80;
      const w = b.w * (0.45 + ((i * 31) % 4) * 0.12);
      c.beginPath();
      c.moveTo(x0, 10);
      c.lineTo(x0, -h);
      c.lineTo(x0 + w, -h + w * 0.55);
      c.lineTo(x0 + w + 40, 10);
      c.closePath();
      c.fill();
    }
  }, 0, 0, 0, 1);
  if (near(1450, 1800)) {
    R.paint((c) => {
      c.fillStyle = '#9a8e7a';
      c.fillRect(1450, -60, 350, 64); // rubble in the gap, far off
    });
  }
  if (near(2890, 3320)) sideStreet(R, 2890, 3320, { minaret: true, t });
  if (near(4930, 5330)) sideStreet(R, 4930, 5330, { curtainWindow: true, t });
  if (near(9880, 10160)) sideStreet(R, 9880, 10160, { t });

  T.street(R, -500, 10800);
  T.cables(R, cx);

  // --- props behind the actors ---
  if (near(X.vine - 100, X.vine + 100)) T.vine(R, X.vine, t);
  if (near(X.wall0 - 60, X.wall1 + 60)) T.rubble(R, X.wall0 - 20, X.wall1 - X.wall0 + 40, 100, { seed: 21 });
  if (near(X.shop, X.shop + 240)) T.shop(R, X.shop);
  if (near(X.oldMan - 200, X.door + 200)) {
    // the daughter's door at the end of the alley
    R.paint((c) => {
      c.fillStyle = '#3a2c20';
      c.fillRect(X.door, -170, 64, 170);
      c.fillStyle = '#1a130e';
      c.fillRect(X.door + 6, -164, 52 * (1 - (a.doorOpen || 0)), 164);
    });
    if (a.doorOpen) R.glow((c) => {
      c.fillStyle = `rgba(255,190,120,${0.25 * a.doorOpen})`;
      c.fillRect(X.door + 6 + 52 * (1 - a.doorOpen), -164, 52 * a.doorOpen, 164);
    });
    if (a.cansOnGround) R.cast((c) => {
      T.jerryCan(c, X.oldMan + 30, 0);
      if (a.cansOnGround > 1) T.jerryCan(c, X.oldMan + 60, 0, 1, '#d4a82a');
    });
  }
  if (near(X.shard - 100, X.shard + 100)) {
    T.rubble(R, X.shard - 80, 170, 34, { seed: 30, rebar: false });
    if (!g.hasTool('mirror')) {
      R.cast((c) => {
        c.fillStyle = '#6b5a48';
        c.fillRect(X.shard + 20, -16, 12, 8); // a child's sandal
      });
      const tw = 0.5 + 0.5 * Math.sin(t * 5);
      R.glow((c) => {
        c.fillStyle = `rgba(255,255,240,${0.6 + tw * 0.4})`;
        c.beginPath();
        c.moveTo(X.shard - 6, -22);
        c.lineTo(X.shard + 8, -26);
        c.lineTo(X.shard + 4, -18);
        c.fill();
        c.fillStyle = `rgba(255,255,230,${0.35 * tw})`;
        c.fillRect(X.shard - 12, -23, 26, 1.5);
        c.fillRect(X.shard, -34, 1.5, 22);
      });
    }
  }
  // spotter's post: the dark room behind his window, and the rope
  if (near(X.spotter - 300, X.spotter + 300)) {
    R.paint((c) => {
      const g2 = c.createLinearGradient(0, SPOT_WIN.top, 0, SPOT_WIN.sill);
      g2.addColorStop(0, '#1d1a17');
      g2.addColorStop(1, '#2b2621');
      c.fillStyle = g2;
      c.fillRect(SPOT_WIN.x0, SPOT_WIN.top, SPOT_WIN.x1 - SPOT_WIN.x0, SPOT_WIN.sill - SPOT_WIN.top + 4);
    });
    if (a.rope !== undefined && a.rope < 1.2) {
      const ry = lerp(SPOT_WIN.sill, -150, clamp(a.rope));
      R.cast((c) => {
        c.strokeStyle = '#3a3026';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(X.spotter - 10, SPOT_WIN.sill);
        c.lineTo(X.spotter - 10 + Math.sin(t * 2) * 3, ry);
        c.stroke();
        if (!g.hasTool('walkie')) {
          c.fillStyle = '#1c1c1e';
          c.fillRect(X.spotter - 16, ry, 12, 28);
          c.fillRect(X.spotter - 13, ry - 10, 2, 10);
        }
      });
    }
  }
  if (near(6200, 6700)) {
    T.rubble(R, 6150, 200, 60, { seed: 40 });
    T.lowWall(R, X.coverWall - 60, 170, 110, '#b1a48e');
  }
  // the school and the children's scrap
  if (near(X.collapsed - 100, X.school + 600)) {
    T.rubble(R, X.collapsed, 400, 230, { seed: 50, color: '#b9aa8a' });
    T.block(R, { x: X.school, w: 520, floors: 3, fh: 130, color: '#c8b999', seed: 44, pocks: 6, graffiti: [['مدرسة', 0.45, -320, 30, 'rgba(60,70,90,0.7)']] }, t);
    R.paint((c) => {
      // the basement stairwell
      c.fillStyle = '#0c0a08';
      c.fillRect(X.stairs - 40, -110, 80, 110);
      c.fillStyle = '#8f846e';
      c.fillRect(X.stairs - 48, -118, 96, 10);
      // classroom windows on the ground floor
      for (let i = 0; i < 3; i++) {
        c.fillStyle = '#2a2420';
        c.fillRect(X.classroom - 110 + i * 110, -110, 80, 70);
        c.fillStyle = 'rgba(120,96,70,0.5)';
        c.fillRect(X.classroom - 100 + i * 110, -64, 60, 3);
        c.fillStyle = 'rgba(40,40,40,0.8)';
        c.fillRect(X.classroom - 95 + i * 110, -100, 50, 22); // a blackboard glimpsed
      }
    });
    T.scrapPiles(R, X.scrap, a.crater ? 1 : 0);
    if (a.crater) T.crater(R, X.scrap + 30, 190);
  }
  if (near(X.catWall - 80, X.catWall + 80)) {
    R.cast((c) => {
      c.fillStyle = '#a99c86';
      c.beginPath();
      c.moveTo(X.catWall - 60, 2);
      c.lineTo(X.catWall - 55, -150);
      c.lineTo(X.catWall - 10, -140);
      c.lineTo(X.catWall + 20, -155);
      c.lineTo(X.catWall + 55, -120);
      c.lineTo(X.catWall + 60, 2);
      c.fill();
    });
  }
  if (near(X.battery - 100, X.battery + 200)) {
    T.roomDoor(R, X.battery, { w: 120, h: 180, light: 'rgba(160,190,220,0.12)' });
    R.paint((c) => {
      // the table, the battery, the tangle of cables
      c.fillStyle = '#2c231b';
      c.fillRect(X.battery + 20, -70, 80, 6);
      c.fillRect(X.battery + 26, -64, 4, 64);
      c.fillRect(X.battery + 90, -64, 4, 64);
      c.fillStyle = '#16161a';
      c.fillRect(X.battery + 40, -92, 34, 22);
      c.strokeStyle = '#8a2a22';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(X.battery + 48, -92);
      c.bezierCurveTo(X.battery + 40, -110, X.battery + 20, -80, X.battery + 30, -72);
      c.stroke();
    });
    R.glow((c) => {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = `rgba(170,210,255,${0.5 + 0.3 * Math.sin(t * 2 + i)})`;
        c.fillRect(X.battery + 26 + i * 16, -76, 8, 5);
      }
    });
  }
  if (near(X.kerb - 100, X.olive + 200)) {
    T.lowWall(R, X.kerb - 20, 110, 62, '#a79a84');
    // a fallen concrete beam propped on two blocks by the kerb: where people
    // sit to wait for news (and where Sami sits, if he says nothing)
    R.cast((c) => {
      const x0 = X.kerb + 100;
      const x1 = X.kerb + 222;
      c.fillStyle = '#8e8676';
      c.fillRect(x0 + 6, -24, 22, 24);
      c.fillRect(x1 - 30, -24, 22, 24);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x0 + 6, -24, 22, 3);
      c.fillRect(x1 - 30, -24, 22, 3);
      c.fillStyle = '#a39b8a';
      c.beginPath();
      c.moveTo(x0, -40);
      c.lineTo(x1, -41);
      c.lineTo(x1 + 3, -24);
      c.lineTo(x0 - 2, -23);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,250,235,0.18)';
      c.fillRect(x0, -40, x1 - x0, 2);
      c.strokeStyle = '#4a3b2e';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x1, -34);
      c.quadraticCurveTo(x1 + 12, -38, x1 + 16, -30); // rebar out of the broken end
      c.moveTo(x1, -28);
      c.lineTo(x1 + 10, -22);
      c.stroke();
    });
    // the walkie-talkie man's upturned crate
    R.cast((c) => {
      c.fillStyle = '#6a5238';
      c.fillRect(X.olive - 30, -30, 40, 30);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 3; i++) c.fillRect(X.olive - 30, -26 + i * 9, 40, 2);
    });
    T.deadOlive(R, X.olive);
  }

  // --- the people ---
  const shear = shearFor(g);
  // contact shadows: everyone stands on the ground, not above it
  R.paint((c) => {
    for (const w of [...g.npcs, ...(g.passers || []), g.player]) {
      if (!w.visible || w.depthK || w.depth > 0 || !near(w.x - 60, w.x + 60)) continue;
      const s2 = w.rig.scale || 1;
      const lift = Math.max(0, w.rig.pose?.seat ? 0 : 0);
      const gy = w.onGround === false ? w.y + 0 : w.y;
      const grd = c.createRadialGradient(w.x, gy + 2 + lift, 0, w.x, gy + 2, 26 * s2);
      grd.addColorStop(0, 'rgba(20,14,10,0.32)');
      grd.addColorStop(1, 'rgba(20,14,10,0)');
      c.fillStyle = grd;
      c.beginPath();
      c.ellipse(w.x, gy + 2, 26 * s2, 5 * s2, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  // passers-by far down the side streets, behind everyone
  for (const w of g.passers || []) {
    if (w.depth > 0 && near(w.x - 100, w.x + 100)) R.cast((c) => w.draw(c));
  }
  for (const w of g.npcs) {
    if (!w.visible || !near(w.x - 100, w.x + 100)) continue;
    if (w.depthK) continue; // walking away down a side street: drawn below
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, 0.12);
  }
  for (const w of g.passers || []) {
    if (w.depth > 0 || !near(w.x - 100, w.x + 100)) continue;
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, shear, 0.12);
  }
  if (g.cat && !g.cat.hidden && near(g.cat.x - 50, g.cat.x + 50)) {
    R.cast((c) => g.cat.draw(c));
    // its eyes catch the light
    if (g.cat.blink < 0.5) {
      const [ex, ey] = g.cat.eye();
      R.glow((c) => {
        const grd = c.createRadialGradient(ex, ey, 0, ex, ey, 5);
        grd.addColorStop(0, 'rgba(220,230,120,0.55)');
        grd.addColorStop(1, 'rgba(220,230,120,0)');
        c.fillStyle = grd;
        c.fillRect(ex - 5, ey - 5, 10, 10);
      });
    }
  }
  const p = g.player;
  if (p.visible) {
    R.cast((c) => p.draw(c));
    R.shadow((c) => p.draw(c), p.x, p.y, shear, 0.12);
  }
  // those walking away into depth
  for (const w of g.npcs) {
    if (!w.visible || !w.depthK) continue;
    R.cast((c) => w.draw(c));
  }
  // the wall around the spotter's window, over him: only his upper body shows
  if (near(X.spotter - 300, X.spotter + 300)) {
    R.cast((c) => {
      const W = SPOT_WIN;
      c.fillStyle = '#b5a892';
      c.beginPath();
      c.rect(W.x0 - 110, W.top - 70, W.x1 - W.x0 + 220, W.floor - W.top + 82);
      c.rect(W.x1, W.top, W.x0 - W.x1, W.sill - W.top); // the opening (reverse winding)
      c.fill('evenodd');
      // plaster stains and a crack
      c.fillStyle = 'rgba(80,66,50,0.14)';
      c.fillRect(W.x0 - 90, W.sill + 6, 60, 40);
      c.strokeStyle = 'rgba(60,50,40,0.35)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(W.x1 + 30, W.top - 60);
      c.lineTo(W.x1 + 44, W.top - 20);
      c.lineTo(W.x1 + 38, W.top + 30);
      c.stroke();
      // the sill and the slab edge
      c.fillStyle = '#cfc3ab';
      c.fillRect(W.x0 - 8, W.sill, W.x1 - W.x0 + 16, 7);
      c.fillStyle = '#8f846f';
      c.fillRect(W.x0 - 110, W.floor + 6, W.x1 - W.x0 + 220, 8);
      // the frame, what's left of it
      c.strokeStyle = '#5a4a38';
      c.lineWidth = 3;
      c.strokeRect(W.x0, W.top, W.x1 - W.x0, W.sill - W.top);
    });
  }
  // a building corner the walker passes behind
  if (a.occluder) {
    R.paint((c) => {
      c.fillStyle = '#a5987f';
      c.fillRect(a.occluder[0], -300, a.occluder[1], 304);
    });
  }

  // --- in front ---
  if (near(X.curtain0, X.curtain1)) T.sniperCurtain(R, X.curtain0, X.curtain1, t, { sagFrom: X.sag0, sagTo: X.sag1, sagY: -162 });
  if (near(X.lowWall - 60, X.lowWall + 60)) T.lowWall(R, X.lowWall - 50, 100, 64, '#9e917b');
  R.layer(1.3);
  R.paint((c) => {
    const r = rng(5);
    c.fillStyle = '#2a231d';
    for (let i = 0; i < 26; i++) {
      const fx = -400 + i * 480 + r() * 200;
      const h = 20 + r() * 50;
      c.beginPath();
      c.moveTo(fx - 60, 200);
      c.lineTo(fx - 40, 60 - h);
      c.lineTo(fx + 10, 50 - h * 1.2);
      c.lineTo(fx + 50, 70 - h * 0.6);
      c.lineTo(fx + 70, 200);
      c.fill();
    }
  });
  R.layer(1);

  g.effects.draw(R);
  // the jet's shadow: a swept-wing shape, smeared by its speed, across the
  // street and up the walls in half a second
  if (a.jetShadow) {
    const k = (g.time - a.jetShadow) / 0.55;
    if (k > 0 && k < 1)
      R.shadow(
        (c) => {
          const x = lerp(cx - 1500, cx + 1500, k);
          c.fillStyle = 'rgba(0,0,0,0.85)';
          for (let i = 0; i < 5; i++) {
            c.globalAlpha = i === 0 ? 1 : 0.16; // motion smear
            T.jetShadowShape(c, x - i * 80, -230, 2.4);
          }
          c.globalAlpha = 1;
        },
        cx,
        -230,
        0,
        0.62, // cast across the street and up the walls at a low angle
      );
  }
  g.effects.drawFog(R);
  // dust turning in the sun, and silhouettes close to the lens
  T.motes(R, cx, t, a.shelling ? 0.4 : 1);
  T.foreground(R, cx);
}

// ---------------------------------------------------------- the stairwell --

export function drawStairwell(R, g) {
  const t = g.time;
  R.paint((c) => {
    c.fillStyle = '#3a342d';
    c.fillRect(-900, -700, 1800, 1400);
    // stairs down from the doorway, top left
    c.fillStyle = '#4d463d';
    for (let i = 0; i < 12; i++) c.fillRect(-620 + i * 55, -420 + i * 36, 60, 400);
    c.fillStyle = '#2b2621';
    c.fillRect(-900, 0, 1800, 400);
    // cracks and a child's chalk drawing on the wall
    c.strokeStyle = 'rgba(20,16,12,0.6)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(80, -500);
    c.lineTo(120, -380);
    c.lineTo(90, -300);
    c.stroke();
    c.strokeStyle = 'rgba(220,210,190,0.5)';
    c.beginPath();
    c.arc(300, -260, 26, 0, Math.PI * 2);
    c.moveTo(300, -234);
    c.lineTo(300, -170);
    c.moveTo(270, -210);
    c.lineTo(330, -210);
    c.stroke();
  });
  R.glow((c) => {
    // daylight from the doorway above
    const g2 = c.createLinearGradient(-700, -700, -300, -200);
    g2.addColorStop(0, 'rgba(230,215,185,0.9)');
    g2.addColorStop(1, 'rgba(230,215,185,0)');
    c.fillStyle = g2;
    c.fillRect(-900, -700, 500, 300);
  });
  for (const w of g.stairKids || []) R.cast((c) => w.draw(c));
  R.cast((c) => g.player.draw(c));
  g.effects.draw(R);
  // dust pouring through the ceiling seams
  R.paint((c) => {
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.7 + i * 0.3) % 1;
      c.fillStyle = `rgba(180,168,146,${0.35 * Math.sin(k * Math.PI)})`;
      c.fillRect(-200 + i * 170, -640, 3, 640 * k);
    }
  });
}

export function stairLook(g) {
  const torch = g.torchLight();
  const lights = [{ uv: [0.05, -0.1], color: [0.95, 0.88, 0.75], intensity: 0.9, radius: 0.8, project: 1.3, rim: 0.8 }];
  if (torch) lights.push(torch);
  return { ambient: [0.05, 0.05, 0.06], lights, groundShadow: 0, bloom: 0.8, grain: 0.07, grade: { sat: 0.8, contrast: 1.05, lift: 0, tint: [1, 1, 1] } };
}

// ----------------------------------------------------------- the flashback --

export function drawFlashback(R, g) {
  const t = g.time;
  T.sky(R, [[0, '#4a4f7a'], [0.4, '#c77d5c'], [0.72, '#f3b168']]);
  R.layer(0.3);
  R.paint((c) => {
    // the town, whole: rooftops, water tanks, satellite dishes, a minaret
    const r = rng(71);
    c.fillStyle = '#7c6056';
    for (let x = -1400; x < 1400; x += 90 + r() * 60) {
      const h = 80 + r() * 140;
      c.fillRect(x, -h, 80 + r() * 60, h + 300);
      if (r() < 0.5) c.fillRect(x + 20, -h - 20, 26, 20);
    }
    T.minaret(c, 300, -150, 0.9, '#7c6056', false);
  });
  R.glow((c) => {
    const r = rng(72);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(255,${190 + r() * 40},120,${0.5 + r() * 0.4})`;
      c.fillRect(-1300 + r() * 2600, -30 - r() * 160, 5, 6);
    }
  });
  R.layer(1);
  // the house wall behind the garden, a window with a television flickering
  R.paint((c) => {
    c.fillStyle = '#c9a987';
    c.fillRect(-700, -420, 1400, 424);
    c.fillStyle = '#2d241e';
    c.fillRect(260, -300, 110, 90);
    c.fillStyle = '#8c6a52';
    c.fillRect(-640, -200, 90, 204); // door
    c.fillStyle = '#6f5a48';
    c.fillRect(-700, 0, 1400, 300);
  });
  R.glow((c) => {
    const f = 0.35 + 0.25 * Math.sin(t * 13) * Math.sin(t * 5.3);
    c.fillStyle = `rgba(120,160,255,${f})`;
    c.fillRect(268, -292, 94, 74);
  });
  // the arbour: posts, beams, vines and ripe grapes
  R.cast((c) => {
    c.fillStyle = '#5a4332';
    c.fillRect(-420, -330, 12, 334);
    c.fillRect(400, -330, 12, 334);
    c.fillRect(-460, -340, 900, 10);
    const r = rng(73);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = r() < 0.5 ? '#4f6a2e' : '#62803a';
      c.beginPath();
      c.ellipse(-460 + r() * 900, -340 + (r() - 0.3) * 50, 18, 14, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    for (let b = 0; b < 9; b++) {
      const bx = -380 + b * 95 + r() * 30;
      c.fillStyle = '#4a2448';
      for (let i = 0; i < 12; i++) {
        c.beginPath();
        c.arc(bx + ((i % 3) - 1) * 6, -312 + Math.floor(i / 3) * 7, 4.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    // floor cushions along the wall, a kilim stripe on each
    for (const [cx, w] of [[-90, 120], [90, 120]]) {
      c.fillStyle = '#7a3a2c';
      c.beginPath();
      c.moveTo(cx - w / 2, 0);
      c.lineTo(cx - w / 2 + 4, -14);
      c.quadraticCurveTo(cx, -17, cx + w / 2 - 4, -14);
      c.lineTo(cx + w / 2, 0);
      c.closePath();
      c.fill();
      c.fillStyle = '#c9a25a';
      c.fillRect(cx - w / 2 + 6, -9, w - 12, 2);
      c.fillStyle = '#2f4a5a';
      for (let k = cx - w / 2 + 10; k < cx + w / 2 - 10; k += 14) c.fillRect(k, -6, 6, 3);
    }
    // low table with tea
    c.fillStyle = '#6a4a30';
    c.fillRect(-60, -44, 120, 8);
    c.fillRect(-50, -36, 6, 36);
    c.fillRect(44, -36, 6, 36);
    // a wire with a bird
    c.strokeStyle = '#2a2420';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-700, -390);
    c.quadraticCurveTo(0, -370, 700, -395);
    c.stroke();
    if (!g.a.birdGone) {
      c.fillStyle = '#2a2420';
      c.beginPath();
      c.ellipse(180, -388, 9, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(186, -392, 6, 3);
    }
  });
  R.glow((c) => {
    // tea glasses, lit amber by the sun
    for (const gx of [-30, 26]) {
      c.fillStyle = 'rgba(200,90,40,0.8)';
      c.fillRect(gx, -60, 10, 16);
    }
  });
  for (const w of g.flashActors || []) {
    R.cast((c) => w.draw(c));
    R.shadow((c) => w.draw(c), w.x, w.y, 1.6, 0.12);
  }
}

export function flashLook(g) {
  const k = g.a.flashFade || 0;
  return {
    ambient: [0.4, 0.3, 0.3],
    lights: [{ uv: [1.1, 0.35], color: [1.0, 0.66, 0.4], intensity: 1.4, radius: 0, project: 1.04, rim: 1.2 }],
    god: { uv: [1.1, 0.35], strength: 0.25 },
    groundShadow: 0.5,
    bloom: 0.9,
    grain: 0.08,
    grade: { sat: 1.12 - k * 0.9, contrast: 0.96, lift: 0.02 + k * 0.1, tint: [1.08, 0.98, 0.86] },
  };
}

export function surfaceAt(x) {
  if ((x > X.wall0 - 30 && x < X.wall1 + 30) || (x > X.shard - 80 && x < X.shard + 90)) return 'rubble';
  return 'grit';
}

export { Person, POSES };
