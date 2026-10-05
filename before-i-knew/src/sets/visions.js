// Act 3, Part 4: the three visions (الرؤى). A grieving, exhausted mind fills
// places with what it needs; none of it is supernatural. Each is a separate
// space far off along the same flat ground (see story/act3v-map.js). These
// functions draw environments, props, light and atmosphere only: the people
// in them (Ahmad, the adult "students", pedestrians, young Sami) are rig
// characters the story spawns, so there is room left for them (ground at
// y = 0, a standing man 170 units tall, 1 unit about a centimetre).
//
//   drawVisionClassroom(R, g, { empty, t })   Ahmad's basement classroom
//   drawOrchard(R, g, { wither, t })          the grape orchards of Ghouta
//   drawDamascus(R, g, { fold, t })           a Damascus street, 2010
//
// Each has a matching look (visionClassroomLook, orchardLook, damascusLook).
// Visions are warm, a touch over-saturated, with the bloom up and a faint
// soft vignette; g.a.dreamK (0..1) pushes that further.

import { lerp, clamp, rng, smooth, mixc, hex, noise1 } from '../engine/util.js';
import { extrudePoly, extrudeRect } from './depth.js';
import { textureWall } from '../engine/materials.js';
import { MEM, CAFE_X } from '../story/act3v-map.js';

const TAU = Math.PI * 2;
const AR = '"Aref Ruqaa", "Noto Naskh Arabic", "IBM Plex Sans Arabic", serif';
const NASKH = '"Noto Naskh Arabic", "Aref Ruqaa", "IBM Plex Sans Arabic", serif';

// ------------------------------------------------------------- helpers --

const hx2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
// a hex colour between two hex colours (extrudePoly wants hex)
const mh = (a, b, k) => {
  const A = hex(a);
  const B = hex(b);
  return '#' + hx2(lerp(A[0], B[0], k)) + hx2(lerp(A[1], B[1], k)) + hx2(lerp(A[2], B[2], k));
};
const shadeHex = (a, k) => {
  const A = hex(a);
  return '#' + hx2(A[0] * k) + hx2(A[1] * k) + hx2(A[2] * k);
};
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Static detail is painted once into a canvas and placed every frame.
const BAKED = new Map();
function bake(key, w, h, k, draw) {
  let cv = BAKED.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(w * k);
  cv.height = Math.ceil(h * k);
  const c = cv.getContext('2d');
  c.scale(k, k);
  draw(c, w, h);
  BAKED.set(key, cv);
  return cv;
}

// The look every vision shares: a little too warm, a little too bright, the
// edges softening; g.a.dreamK deepens it.
function dreamy(g, look) {
  const d = clamp(g.a?.dreamK ?? 0);
  look.grade.sat *= 1 + 0.22 * d;
  look.grade.contrast = (look.grade.contrast ?? 1) * (1 - 0.04 * d);
  look.bloom = (look.bloom ?? 0.6) + 0.3 * d;
  look.fade = Math.max(g.a?.endFade || 0, 0.07 * d);
  look.time = g.time;
  return look;
}

// A flame: teardrop plus halo, additive.
function flame(c, x, y, s, a) {
  if (a <= 0.01) return;
  const halo = c.createRadialGradient(x, y, 0, x, y, 46 * s);
  halo.addColorStop(0, `rgba(255,190,100,${0.55 * a})`);
  halo.addColorStop(0.35, `rgba(255,140,60,${0.18 * a})`);
  halo.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = halo;
  c.fillRect(x - 50 * s, y - 50 * s, 100 * s, 100 * s);
  c.fillStyle = `rgba(255,214,130,${0.95 * a})`;
  c.beginPath();
  c.moveTo(x, y - 12 * s);
  c.quadraticCurveTo(x + 4.5 * s, y - 3 * s, x, y + 3 * s);
  c.quadraticCurveTo(x - 4.5 * s, y - 3 * s, x, y - 12 * s);
  c.fill();
  c.fillStyle = `rgba(255,250,225,${0.9 * a})`;
  c.beginPath();
  c.ellipse(x, y - 1.5 * s, 1.6 * s, 3.6 * s, 0, 0, TAU);
  c.fill();
}

// =====================================================================
// 1. THE CLASSROOM
// =====================================================================

const CL = MEM.classroom[0];
const RX0 = CL - 470;
const RX1 = CL + 470;
const CEIL = -300;

// Where Ahmad stands to write on the board.
export const BOARD_X = CL + 190;
// Seat positions for the story's six sitters: [world x of the chair, y of
// the seat]. Two arcs of three, all facing right, toward the board.
export const DESKS = [-300, -222, -144, -52, 26, 104].map((dx) => [CL + dx, -30]);

// Each candle: x, y of the foot, height, and how far into "empty" it holds out.
const CANDLES = [
  { x: CL - 312, y: -172, h: 22, off: 0.5 },
  { x: CL - 262, y: -172, h: 28, off: 0.38 },
  { x: CL - 214, y: -172, h: 17, off: 0.46 },
  { x: DESKS[0][0] + 68, y: -52, h: 13, off: 0.22, desk: 0 },
  { x: DESKS[2][0] + 68, y: -52, h: 13, off: 0.3, desk: 2 },
  { x: DESKS[4][0] + 68, y: -52, h: 13, off: 0.26, desk: 4 },
  { x: CL + 428, y: -80, h: 19, off: 0.62 },
  { x: CL + 352, y: -106, h: 12, off: 0.34 },
  { x: CL - 352, y: -1, h: 26, off: 0.7 },
];
// how lit candle i is, 0..1 (they gutter and go out one after another)
const candleLit = (i, empty) => 1 - smooth(CANDLES[i].off, CANDLES[i].off + 0.14, empty);

// How each desk and chair comes to rest when the room is as it is: [desk
// angle, desk slide, chair angle, chair slide]. Pivot is the foot it tips on.
const WRECK = [
  [1.42, 10, -1.5, -14],
  [-1.5, -6, 0.2, 26],
  [0.36, 0, 1.46, 20],
  [1.36, 18, -0.15, 34],
  [-1.46, -14, -1.55, -22],
  [0.05, 24, 1.3, 36],
];

function shell(pal) {
  const x0 = CL - 560;
  const y0 = -380;
  return bake('cls-shell-' + pal.name, 1120, 500, 1.35, (c) => {
    c.translate(-x0, -y0);
    const r = rng(pal.name === 'warm' ? 11 : 12);
    // back wall
    c.fillStyle = pal.wall;
    c.fillRect(RX0, CEIL, RX1 - RX0, -CEIL);
    // plaster mottling
    for (let i = 0; i < 70; i++) {
      c.fillStyle = r() < 0.5 ? pal.mottleA : pal.mottleB;
      c.beginPath();
      c.ellipse(RX0 + r() * (RX1 - RX0), CEIL + r() * 190, 30 + r() * 90, 14 + r() * 40, 0, 0, TAU);
      c.fill();
    }
    // the lower wall: oil-painted dado, the way basement schools have it
    c.fillStyle = pal.dado;
    c.fillRect(RX0, -108, RX1 - RX0, 108);
    c.fillStyle = pal.dadoCap;
    c.fillRect(RX0, -111, RX1 - RX0, 4);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(RX0, -111, RX1 - RX0, 1.2);
    // scuffs and handprints on the paint
    for (let i = 0; i < 60; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
      c.fillRect(RX0 + r() * (RX1 - RX0), -104 + r() * 100, 8 + r() * 26, 2 + r() * 5);
    }
    // skirting
    c.fillStyle = pal.skirt;
    c.fillRect(RX0, -12, RX1 - RX0, 12);
    // damp creeping up from the floor, and from the ceiling
    const dmp = c.createLinearGradient(0, -150, 0, 0);
    dmp.addColorStop(0, 'rgba(40,36,30,0)');
    dmp.addColorStop(1, `rgba(40,36,30,${pal.damp})`);
    c.fillStyle = dmp;
    c.fillRect(RX0, -150, RX1 - RX0, 150);
    for (const sx of [RX0 + 140, CL + 20, RX1 - 90]) {
      const st = c.createLinearGradient(0, CEIL, 0, CEIL + 150);
      st.addColorStop(0, `rgba(50,44,34,${pal.damp * 1.1})`);
      st.addColorStop(1, 'rgba(50,44,34,0)');
      c.fillStyle = st;
      c.beginPath();
      c.ellipse(sx, CEIL + 10, 70, 150, 0, 0, TAU);
      c.fill();
    }
    // cracks (the cold room has more)
    c.strokeStyle = `rgba(20,16,12,${pal.cracks})`;
    c.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      let cx = RX0 + 80 + r() * (RX1 - RX0 - 160);
      let cy = CEIL + r() * 40;
      c.beginPath();
      c.moveTo(cx, cy);
      for (let k = 0; k < 7; k++) {
        cx += (r() - 0.5) * 22;
        cy += 14 + r() * 22;
        c.lineTo(cx, cy);
      }
      c.stroke();
    }
    // ceiling slab and its beam
    c.fillStyle = pal.ceil;
    c.fillRect(RX0 - 60, CEIL - 70, RX1 - RX0 + 120, 70);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(RX0 - 60, CEIL - 70, RX1 - RX0 + 120, 3);
    c.fillStyle = pal.beam;
    c.fillRect(RX0, CEIL, RX1 - RX0, 38);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(RX0, CEIL + 38, RX1 - RX0, 6);
    // the floor: cement tiles, a pattern of two tones
    const fl = c.createLinearGradient(0, 0, 0, 100);
    fl.addColorStop(0, pal.floorA);
    fl.addColorStop(1, pal.floorB);
    c.fillStyle = fl;
    c.fillRect(RX0 - 60, 0, RX1 - RX0 + 120, 100);
    for (let tx = RX0 - 60; tx < RX1 + 60; tx += 40) {
      const odd = (Math.round((tx - RX0) / 40) & 1) === 0;
      for (let row = 0; row < 5; row++) {
        const ty = row * 20;
        if (((row & 1) === 0) === odd) {
          c.fillStyle = pal.tile;
          c.beginPath();
          c.moveTo(tx + 20, ty + 3);
          c.lineTo(tx + 33, ty + 10);
          c.lineTo(tx + 20, ty + 17);
          c.lineTo(tx + 7, ty + 10);
          c.fill();
        }
      }
    }
    c.fillStyle = 'rgba(20,14,10,0.3)';
    for (let tx = RX0 - 60; tx < RX1 + 60; tx += 40) c.fillRect(tx, 0, 1.2, 100);
    for (let ty = 0; ty < 100; ty += 20) c.fillRect(RX0 - 60, ty, RX1 - RX0 + 120, 1.2);
    // floor falls away into dark toward the viewer
    const fd = c.createLinearGradient(0, 0, 0, 100);
    fd.addColorStop(0, 'rgba(0,0,0,0)');
    fd.addColorStop(1, 'rgba(0,0,0,0.85)');
    c.fillStyle = fd;
    c.fillRect(RX0 - 60, 0, RX1 - RX0 + 120, 100);
    // contact with the wall: a seam of shade along the foot
    const ao = c.createLinearGradient(0, -2, 0, 22);
    ao.addColorStop(0, 'rgba(0,0,0,0.32)');
    ao.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = ao;
    c.fillRect(RX0, -2, RX1 - RX0, 24);
  });
}

const PAL_WARM = {
  name: 'warm', wall: '#d7b27c', mottleA: 'rgba(255,230,170,0.16)', mottleB: 'rgba(150,100,60,0.12)',
  dado: '#6ea08e', dadoCap: '#4d7a6a', skirt: '#6a5a46', damp: 0.12, cracks: 0.16, ceil: '#8a7a68', beam: '#a08a6e',
  floorA: '#b0825a', floorB: '#7c5a40', tile: 'rgba(235,205,160,0.2)',
};
const PAL_COLD = {
  name: 'cold', wall: '#7b7d80', mottleA: 'rgba(160,170,180,0.12)', mottleB: 'rgba(30,34,40,0.2)',
  dado: '#3f4c4d', dadoCap: '#2c3636', skirt: '#37352f', damp: 0.5, cracks: 0.65, ceil: '#4c4d50', beam: '#5c5d60',
  floorA: '#55524e', floorB: '#2e2c2a', tile: 'rgba(170,175,180,0.08)',
};

// The blackboard, baked: the lesson in chalk (alive) and the same board as it
// is (smeared, cracked, nearly empty).
const BW = 232;
const BH = 132;
function board(smeared) {
  return bake('cls-board-' + (smeared ? 's' : 'a'), BW, BH, 3, (c) => {
    const r = rng(smeared ? 91 : 90);
    c.fillStyle = smeared ? '#222a29' : '#2d4a40';
    c.fillRect(0, 0, BW, BH);
    // years of wiped chalk, a pale cloud
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(230,235,225,${smeared ? 0.07 : 0.045})`;
      c.beginPath();
      c.ellipse(r() * BW, r() * BH, 20 + r() * 50, 8 + r() * 18, (r() - 0.5) * 0.6, 0, TAU);
      c.fill();
    }
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.lineCap = 'round';
    const chalk = smeared ? 'rgba(225,225,215,0.22)' : 'rgba(246,244,232,0.95)';
    c.fillStyle = chalk;
    c.strokeStyle = chalk;
    // the conjugation: wrote, writes, writer
    c.font = `30px ${NASKH}`;
    c.fillText('كتب — يكتب — كاتب', BW * 0.57, 40);
    // the table beneath: past, present, future
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(BW * 0.14, 56);
    c.lineTo(BW * 0.97, 56);
    c.moveTo(BW * 0.14, 108);
    c.lineTo(BW * 0.97, 108);
    for (const gx of [0.14, 0.4, 0.69, 0.97]) {
      c.moveTo(BW * gx, 56);
      c.lineTo(BW * gx, 108);
    }
    c.stroke();
    c.font = `20px ${NASKH}`;
    c.fillText('ماضي... حاضر... مستقبل', BW * 0.555, 86);
    // little arrows beneath each column
    c.lineWidth = 1.2;
    for (const gx of [0.27, 0.545, 0.83]) {
      c.beginPath();
      c.moveTo(BW * gx - 10, 100);
      c.lineTo(BW * gx + 10, 100);
      c.lineTo(BW * gx + 6, 97);
      c.moveTo(BW * gx + 10, 100);
      c.lineTo(BW * gx + 6, 103);
      c.stroke();
    }
    if (smeared) {
      // the wiping: broad grey arcs of chalk dust dragged across, and the
      // board cracked and chipped at its corner
      for (let i = 0; i < 9; i++) {
        c.strokeStyle = `rgba(200,205,200,${0.05 + r() * 0.08})`;
        c.lineWidth = 8 + r() * 14;
        c.beginPath();
        const y = 10 + r() * 110;
        c.moveTo(r() * 60, y);
        c.bezierCurveTo(70, y + (r() - 0.5) * 40, 150, y + (r() - 0.5) * 50, 180 + r() * 50, y + (r() - 0.5) * 30);
        c.stroke();
      }
      c.strokeStyle = 'rgba(10,12,12,0.7)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(BW, 18);
      c.lineTo(BW - 40, 30);
      c.lineTo(BW - 52, 62);
      c.lineTo(BW - 90, 76);
      c.stroke();
      c.fillStyle = '#16191a';
      c.beginPath();
      c.moveTo(0, BH);
      c.lineTo(0, BH - 34);
      c.lineTo(18, BH - 22);
      c.lineTo(30, BH);
      c.fill();
    }
  });
}

// Tools for one desk-and-chair, origin at the chair's seat centre on the
// floor: the chair faces right, the desk stands in front of it.
function chair(c, wood, dark) {
  extrudeRect(c, -17, -31, 34, 4, 9, { color: wood });
  extrudeRect(c, -17, -64, 3, 33, 6, { color: wood });
  c.fillStyle = dark;
  c.fillRect(-15, -27, 3, 27);
  c.fillRect(11, -27, 3, 27);
  c.fillStyle = wood;
  c.fillRect(-17, -31, 34, 4);
  c.fillRect(-17, -64, 3, 33);
  c.fillRect(-18, -62, 5, 17);
  c.fillRect(-18, -52, 5, 5);
  c.fillStyle = 'rgba(255,240,210,0.16)';
  c.fillRect(-17, -31, 34, 1.2);
}
function desk(c, wood, dark, showBooks, bookCols) {
  extrudeRect(c, 20, -52, 62, 5, 12, { color: wood });
  c.fillStyle = dark;
  c.fillRect(25, -47, 4, 47);
  c.fillRect(72, -47, 4, 47);
  c.fillRect(27, -26, 46, 3);
  c.fillStyle = wood;
  c.fillRect(20, -52, 62, 5);
  c.fillStyle = 'rgba(255,240,210,0.2)';
  c.fillRect(20, -52, 62, 1.2);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(20, -47, 62, 3);
  if (showBooks) {
    // exercise books, one open with a pencil across it
    c.fillStyle = bookCols[0];
    c.fillRect(28, -57, 26, 5);
    c.fillStyle = bookCols[1];
    c.fillRect(30, -61, 22, 4);
    c.fillStyle = '#efe6cf';
    c.fillRect(56, -54, 18, 2);
    c.strokeStyle = '#d9a63a';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(58, -57);
    c.lineTo(72, -55);
    c.stroke();
  }
}

export function drawVisionClassroom(R, g, { empty = 0, t = g.time } = {}) {
  empty = clamp(empty);
  const cx = CL;
  const dying = smooth(0.1, 0.5, empty); // dust, cold and decay build as it empties
  const wood = mh('#a8703f', '#5e5249', empty);
  const dark = mh('#7a4c2a', '#3c342e', empty);
  const sh = shell(PAL_WARM);
  const sc = shell(PAL_COLD);
  R.layer(1);

  // the room and its fabric, warm into cold
  R.paint((c) => {
    c.drawImage(sh, CL - 560, -380, 1120, 500);
    if (empty > 0.005) {
      c.globalAlpha = empty;
      c.drawImage(sc, CL - 560, -380, 1120, 500);
      c.globalAlpha = 1;
    }
  });
  R.surface((c) => c.rect(RX0, CEIL, RX1 - RX0, -CEIL - 111), 'plaster', { scale: 1.2, seed: 4, alpha: 0.55 });
  R.surface((c) => c.rect(RX0, 2, RX1 - RX0, 94), 'concrete', { scale: 1.0, seed: 6, alpha: 0.35 });

  // the end walls, their thickness showing, and the ceiling's lip
  R.cast((c) => {
    const wc = mh('#b99a72', '#55565a', empty);
    for (const [wx, dir] of [[RX0, -1], [RX1, 1]]) {
      const x0 = dir < 0 ? wx - 70 : wx;
      extrudeRect(c, x0, -420, 70, 520, 16, { color: wc });
      c.fillStyle = wc;
      c.fillRect(x0, -420, 70, 520);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(dir < 0 ? wx - 5 : wx, -420, 5, 520);
    }
  });

  // the doorway in the back wall, left: dark stairs rising to the street
  const dx0 = CL - 452;
  const dw = 82;
  R.paint((c) => {
    c.fillStyle = '#0b0a0d';
    c.fillRect(dx0, -200, dw, 200);
    c.save();
    c.beginPath();
    c.rect(dx0, -200, dw, 200);
    c.clip();
    // steps going up and away to the left, lit from a street that has a moon
    for (let i = 0; i < 9; i++) {
      const sx = dx0 + dw - i * 13;
      const sy = -i * 22;
      c.fillStyle = `rgb(${52 - i * 3},${60 - i * 3},${84 - i * 4})`;
      c.fillRect(sx - 40, sy - 4, 60, 4);
      c.fillStyle = `rgb(${24 - i},${28 - i},${42 - i * 2})`;
      c.fillRect(sx - 40, sy, 60, 22);
    }
    c.restore();
    // frame: lit jamb, shadowed lintel
    c.fillStyle = mh('#6a4c30', '#3a3530', empty);
    c.fillRect(dx0 - 6, -206, dw + 12, 6);
    c.fillRect(dx0 - 6, -206, 6, 206);
    c.fillRect(dx0 + dw, -206, 6, 206);
  });
  R.glow((c) => {
    const lg = c.createLinearGradient(dx0, -200, dx0 + dw, 0);
    lg.addColorStop(0, 'rgba(110,140,210,0.30)');
    lg.addColorStop(1, 'rgba(110,140,210,0)');
    c.fillStyle = lg;
    c.fillRect(dx0, -200, dw, 200);
    // a spill of cold light on the floor inside the door
    const fg = c.createLinearGradient(dx0, 0, dx0 + 140, 40);
    fg.addColorStop(0, `rgba(120,150,220,${0.08 + 0.1 * empty})`);
    fg.addColorStop(1, 'rgba(120,150,220,0)');
    c.fillStyle = fg;
    c.fillRect(dx0, 0, 150, 70);
  });

  // above the board: the alphabet frieze; drawings pinned by the window
  R.paint((c) => {
    const k = 1 - empty * 0.75;
    const letters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س'];
    c.fillStyle = mh('#e8d8b0', '#6a6a66', empty);
    c.fillRect(CL + 164, -268, 226, 22);
    c.fillStyle = mh('#7a3a2a', '#3a3a3a', empty);
    c.font = `15px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    letters.forEach((ch, i) => c.fillText(ch, CL + 376 - i * 18.5, -251));
    // children's drawings: sun, house, a tree, a cat; some torn down at the end
    const sheets = [
      [CL + 4, -246, 40, 50, '#f3ecd8', 0.03],
      [CL + 52, -240, 44, 48, '#efe2c4', -0.05],
      [CL + 102, -248, 40, 52, '#f3ecd8', 0.04],
    ];
    sheets.forEach(([sx, sy, sw, shh, col, rot], i) => {
      if (empty > 0.6 && i === 1) return; // one has fallen
      c.save();
      c.translate(sx + sw / 2, sy + shh / 2);
      c.rotate(rot + (empty > 0.55 && i === 2 ? 0.5 : 0));
      c.fillStyle = mh(col, '#8a8a86', empty);
      c.fillRect(-sw / 2, -shh / 2, sw, shh);
      c.globalAlpha = k;
      if (i === 0) {
        c.fillStyle = '#e8b830';
        c.beginPath();
        c.arc(-8, -12, 7, 0, TAU);
        c.fill();
        c.fillStyle = '#c0583a';
        c.fillRect(-10, 2, 22, 16);
        c.fillStyle = '#6a3a2a';
        c.beginPath();
        c.moveTo(-13, 2);
        c.lineTo(1, -8);
        c.lineTo(15, 2);
        c.fill();
      } else if (i === 1) {
        c.fillStyle = '#4e8a3a';
        c.beginPath();
        c.arc(0, -8, 11, 0, TAU);
        c.fill();
        c.fillStyle = '#7a5030';
        c.fillRect(-2, 2, 4, 18);
        c.fillStyle = '#c0383a';
        c.fillRect(-6, -10, 3, 3);
        c.fillRect(4, -4, 3, 3);
      } else {
        c.strokeStyle = '#3a5a9a';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 4, 9, 0, TAU);
        c.moveTo(-6, -3);
        c.lineTo(-8, -12);
        c.lineTo(-2, -6);
        c.moveTo(6, -3);
        c.lineTo(8, -12);
        c.lineTo(2, -6);
        c.stroke();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#c04040';
      c.fillRect(-1.5, -shh / 2 + 2, 3, 3);
      c.restore();
    });
  });

  // the high window, small: moon and stars beyond its bars
  const wx = CL - 104;
  const wy = -268;
  R.paint((c) => {
    c.fillStyle = '#1c2540';
    c.fillRect(wx, wy, 48, 46);
  });
  R.glow((c) => {
    const k = 0.55 + 0.4 * empty;
    c.fillStyle = `rgba(70,96,160,${0.9 * k})`;
    c.fillRect(wx, wy, 48, 46);
    c.fillStyle = `rgba(235,240,255,${0.9 * k})`;
    c.beginPath();
    c.arc(wx + 31, wy + 14, 6.5, 0, TAU);
    c.fill();
    for (const [sx, sy] of [[8, 30], [16, 12], [40, 36], [22, 40]]) c.fillRect(wx + sx, wy + sy, 1.6, 1.6);
  });
  R.cast((c) => {
    // iron bars and a deep sill
    extrudeRect(c, wx - 6, wy + 46, 60, 6, 10, { color: mh('#a99070', '#5a5a5c', empty) });
    c.fillStyle = mh('#a99070', '#5a5a5c', empty);
    c.fillRect(wx - 6, wy + 46, 60, 6);
    c.fillRect(wx - 5, wy - 6, 58, 6);
    c.fillRect(wx - 5, wy - 6, 5, 58);
    c.fillRect(wx + 48, wy - 6, 5, 58);
    c.fillStyle = '#1a1816';
    for (let i = 1; i < 5; i++) c.fillRect(wx + i * 9.6 - 1, wy, 2, 46);
  });

  // the shelf: books, a globe, a water jug, three candles
  R.cast((c) => {
    const sy = -166;
    const bx = CL - 346;
    extrudeRect(c, bx, sy, 188, 6, 14, { color: wood });
    c.fillStyle = wood;
    c.fillRect(bx, sy, 188, 6);
    c.fillStyle = dark;
    c.fillRect(bx + 14, sy + 6, 5, 20);
    c.fillRect(bx + 168, sy + 6, 5, 20);
    // books leaning at the right end, then a globe
    const cols = ['#7a2e2e', '#2e5a7a', '#8a7a3a', '#3a6a4a', '#6a4a7a', '#a05a2a'];
    for (let i = 0; i < 6; i++) {
      const bh = 26 + (i % 3) * 5;
      c.save();
      c.translate(bx + 112 + i * 10, sy);
      c.rotate(i === 5 ? 0.3 : 0);
      c.fillStyle = mh(cols[i], '#4a4a4a', empty * 0.6);
      c.fillRect(0, -bh, 9, bh);
      c.fillStyle = 'rgba(255,240,200,0.4)';
      c.fillRect(1.5, -bh + 5, 6, 1.5);
      c.restore();
    }
    c.fillStyle = mh('#3a78a8', '#3a4048', empty * 0.8);
    c.beginPath();
    c.arc(bx + 22, sy - 14, 13, 0, TAU);
    c.fill();
    c.fillStyle = mh('#7aa84a', '#4a4e44', empty * 0.8);
    c.beginPath();
    c.ellipse(bx + 18, sy - 16, 6, 8, 0.3, 0, TAU);
    c.fill();
    c.fillStyle = '#4a3a2a';
    c.fillRect(bx + 20, sy - 2, 4, 2);
    // the jug
    c.fillStyle = mh('#b9704a', '#5c4a42', empty);
    c.beginPath();
    c.ellipse(bx + 60, sy - 12, 9, 12, 0, 0, TAU);
    c.fill();
    c.fillRect(bx + 57, sy - 30, 6, 10);
    // candle stubs: wax, a wick, a saucer; flame comes with the glow below
    for (let i = 0; i < 3; i++) candleBody(c, i, empty, t);
  });

  // the dust-filled shaft of moon from the window
  R.glow((c) => {
    const a = 0.05 + 0.13 * empty;
    const bg = c.createLinearGradient(wx, wy + 40, wx + 140, 0);
    bg.addColorStop(0, `rgba(150,180,255,${a * 1.5})`);
    bg.addColorStop(1, `rgba(150,180,255,${a * 0.5})`);
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(wx, wy + 46);
    c.lineTo(wx + 48, wy + 46);
    c.lineTo(wx + 48 + 170, 4);
    c.lineTo(wx + 30, 4);
    c.closePath();
    c.fill();
    // a pool of it on the floor
    c.fillStyle = `rgba(150,180,255,${a * 0.9})`;
    c.beginPath();
    c.ellipse(wx + 110, 20, 72, 12, 0.02, 0, TAU);
    c.fill();
  });

  // the blackboard
  R.cast((c) => {
    const bx = CL + 170;
    const by = -240;
    const frame = mh('#8a5a30', '#3e3a35', empty);
    extrudeRect(c, bx - 6, by - 6, BW - 14, BH + 12, 6, { color: frame });
    c.fillStyle = frame;
    c.fillRect(bx - 6, by - 6, BW - 14, BH + 12);
    // chalk tray
    c.fillRect(bx - 8, by + BH - 2, BW - 10, 6);
  });
  R.paint((c) => {
    const bx = CL + 170;
    const by = -240;
    c.save();
    c.beginPath();
    c.rect(bx, by, BW - 20, BH);
    c.clip();
    c.drawImage(board(false), bx, by, BW, BH);
    if (empty > 0.005) {
      c.globalAlpha = smooth(0.12, 0.5, empty);
      c.drawImage(board(true), bx, by, BW, BH);
      c.globalAlpha = 1;
    }
    c.restore();
    // chalk and the duster on the tray
    c.fillStyle = '#efeadb';
    c.fillRect(bx + 120, by + BH - 5, 12, 3);
    c.fillRect(bx + 136, by + BH - 4, 8, 2);
    c.fillStyle = mh('#7a5a3a', '#4a4440', empty);
    c.fillRect(bx + 30, by + BH - 9, 22, 7);
    c.fillStyle = mh('#d8d2c0', '#7a7870', empty);
    c.fillRect(bx + 30, by + BH - 9, 22, 2);
  });

  // the teacher's desk: a jar of chalk, exercise books, a candle, a mug
  R.cast((c) => {
    const tx = CL + 392;
    const top = -78;
    extrudeRect(c, tx, top, 74, 7, 18, { color: wood });
    c.fillStyle = dark;
    c.fillRect(tx + 3, top + 7, 5, 71);
    c.fillRect(tx + 66, top + 7, 5, 71);
    c.fillStyle = wood;
    c.fillRect(tx, top, 74, 7);
    c.fillRect(tx + 8, top + 7, 58, 22); // drawers
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(tx + 8, top + 18, 58, 1.5);
    c.fillStyle = '#c9a25a';
    c.fillRect(tx + 34, top + 12, 6, 2);
    c.fillStyle = 'rgba(255,240,210,0.2)';
    c.fillRect(tx, top, 74, 1.2);
    // exercise books, three colours, squared up
    const stack = ['#2e5a7a', '#8a3a3a', '#5a7a3a'];
    stack.forEach((col, i) => {
      c.fillStyle = mh(col, '#52504c', empty * 0.7);
      c.fillRect(tx + 6, top - 5 - i * 5, 28, 5);
      c.fillStyle = '#e9e0c8';
      c.fillRect(tx + 8, top - 4 - i * 5, 25, 1.4);
    });
    // the jar of chalk
    c.fillStyle = 'rgba(190,215,220,0.55)';
    c.fillRect(tx + 42, top - 20, 14, 20);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(tx + 44, top - 18, 2, 16);
    c.fillStyle = '#f3efe0';
    for (const [dx, h, a] of [[0, 8, -0.1], [4, 12, 0.05], [8, 10, 0.12]]) {
      c.save();
      c.translate(tx + 45 + dx, top - 18);
      c.rotate(a);
      c.fillRect(0, -h, 3, h + 6);
      c.restore();
    }
    candleBody(c, 6, empty, t);
  });

  // child desks and chairs, each tipping when its time comes
  const state = DESKS.map((_, i) => smooth(0.4 + i * 0.045, 0.62 + i * 0.045, empty));
  DESKS.forEach(([sx], i) => {
    const p = state[i];
    const [da, dsl, ca, csl] = WRECK[i];
    const cols = [['#2e5a7a', '#8a3a3a'], ['#5a7a3a', '#2e5a7a'], ['#8a3a3a', '#8a7a3a']][i % 3];
    R.cast((c) => {
      // chair
      c.save();
      const pivC = ca > 0 ? sx + 14 : sx - 16;
      c.translate(pivC + csl * p, 0);
      c.rotate(ca * p);
      c.translate(-pivC, 0);
      c.translate(sx, 0);
      chair(c, wood, dark);
      c.restore();
      // desk
      c.save();
      const pivD = da > 0 ? sx + 76 : sx + 25;
      c.translate(pivD + dsl * p, 0);
      c.rotate(da * p);
      c.translate(-pivD, 0);
      c.translate(sx, 0);
      desk(c, wood, dark, p < 0.25, cols);
      c.restore();
    });
  });
  // what the fallen desks spilled: books, a pencil, a satchel
  if (empty > 0.45) {
    const k = smooth(0.45, 0.75, empty);
    R.cast((c) => {
      c.globalAlpha = k;
      const r = rng(41);
      for (let i = 0; i < 9; i++) {
        const bx = CL - 340 + r() * 520;
        c.save();
        c.translate(bx, -2 - r() * 3);
        c.rotate((r() - 0.5) * 0.5);
        c.fillStyle = ['#2e5a7a', '#8a3a3a', '#5a7a3a', '#8a7a3a'][i % 4];
        c.fillRect(0, -4, 22 + r() * 6, 4);
        if (i % 3 === 0) {
          c.fillStyle = '#d9d0b8';
          c.fillRect(2, -7, 20, 3);
        }
        c.restore();
      }
      c.fillStyle = '#4a3a2a';
      c.beginPath();
      c.moveTo(CL - 90, 0);
      c.quadraticCurveTo(CL - 92, -16, CL - 70, -16);
      c.lineTo(CL - 50, -14);
      c.lineTo(CL - 52, 0);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  // the rug the children sat on for story time: rolled and kicked aside
  R.paint((c) => {
    const rx = CL - 270;
    c.fillStyle = mh('#a43a32', '#4a3e3c', empty);
    c.beginPath();
    c.moveTo(rx, 14);
    c.lineTo(rx + 360, 14);
    c.lineTo(rx + 380, 46);
    c.lineTo(rx - 20, 46);
    c.closePath();
    c.fill();
    c.fillStyle = mh('#e0b45a', '#6a6258', empty);
    for (let i = 0; i < 12; i++) c.fillRect(rx + 12 + i * 30, 24, 14, 4);
    c.fillStyle = mh('#2a4a6a', '#2e3236', empty);
    c.fillRect(rx + 8, 18, 344, 2);
    c.fillRect(rx - 6, 41, 360, 2);
  });

  // dust, plaster fallen from the ceiling, cobwebs: the room as it is
  if (empty > 0.02) {
    R.paint((c) => {
      c.globalAlpha = dying;
      const r = rng(77);
      for (let i = 0; i < 26; i++) {
        c.fillStyle = r() < 0.5 ? '#8d8a82' : '#6c6a64';
        const fx = CL - 430 + r() * 860;
        c.beginPath();
        c.ellipse(fx, 6 + r() * 20, 2 + r() * 6, 1 + r() * 2.4, 0, 0, TAU);
        c.fill();
      }
      // a spill of plaster under the worst of the damp
      c.fillStyle = '#75736c';
      c.beginPath();
      c.moveTo(CL + 150, 8);
      c.quadraticCurveTo(CL + 190, -14, CL + 240, 8);
      c.fill();
      // cobwebs in the corners
      c.strokeStyle = 'rgba(210,214,222,0.5)';
      c.lineWidth = 0.8;
      for (const [ox, oy, dir] of [[RX0, CEIL + 38, 1], [RX1, CEIL + 38, -1]]) {
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.moveTo(ox, oy);
          const a = (i / 5) * (Math.PI / 2);
          c.lineTo(ox + dir * Math.cos(a) * 60, oy + Math.sin(a) * 60);
          c.stroke();
        }
        for (let rr = 14; rr < 60; rr += 14) {
          c.beginPath();
          for (let i = 0; i <= 5; i++) {
            const a = (i / 5) * (Math.PI / 2);
            const px = ox + dir * Math.cos(a) * rr;
            const py = oy + Math.sin(a) * rr + Math.sin(i * 1.7) * 2;
            if (i === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.stroke();
        }
      }
      c.globalAlpha = 1;
    });
  }

  // flames and halos; candle smoke as each goes out
  R.glow((c) => {
    for (let i = 0; i < CANDLES.length; i++) {
      const cd = CANDLES[i];
      const lit = candleLit(i, empty);
      let top = cd.y - cd.h * (1 - 0.35 * empty);
      if (cd.desk != null && empty > 0.45) top = cd.y + 8; // knocked over with its desk
      if (lit > 0.02) {
        const wob = 1 + (0.1 + (1 - lit) * 0.6) * Math.sin(t * 11 + i * 2.1) + 0.06 * Math.sin(t * 23 + i);
        const sway = Math.sin(t * 7 + i) * (0.6 + (1 - lit) * 2.5);
        flame(c, cd.x + sway, top - 5, (0.6 + 0.4 * lit) * wob * 0.95, lit * (0.85 + 0.15 * wob));
      } else if (empty < 0.95) {
        // the thread of smoke from a wick just put out
        const age = clamp((empty - (cd.off + 0.14)) / 0.18);
        if (age < 1) {
          c.strokeStyle = `rgba(190,190,200,${0.22 * (1 - age)})`;
          c.lineWidth = 1.2;
          c.beginPath();
          for (let k = 0; k <= 10; k++) {
            const yy = top - k * 5 * (0.4 + age);
            const xx = cd.x + Math.sin(k * 0.8 + t * 2 + i) * (1 + k * 0.5);
            if (k === 0) c.moveTo(xx, yy);
            else c.lineTo(xx, yy);
          }
          c.stroke();
        }
      }
    }
    // dust turning slowly in the moonlight (more of it when the room is empty)
    const r = rng(5);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const bx = CL - 120 + r() * 340;
      const by = -250 + r() * 240;
      const px = bx + Math.sin(t * 0.25 + i * 1.7) * 14 + t * 1.2 * (0.3 + r() * 0.5) % 40;
      const py = by + Math.cos(t * 0.21 + i) * 10 + ((t * 2 + i * 9) % 30);
      // brightest inside the shaft
      const beamX = wx + 24 + 170 * ((py - wy) / 250 + 0.1) * 0.7;
      const inBeam = Math.exp(-Math.pow((px - beamX) / 50, 2));
      const a = (0.05 + 0.5 * inBeam) * (0.4 + 0.6 * dying) * (0.5 + 0.5 * Math.sin(t * 1.3 + i));
      c.fillStyle = `rgba(190,205,255,${a})`;
      c.fillRect(px, py, 1.6, 1.6);
    }
    // under the candlelight, warm floating specks
    for (let i = 0; i < 18; i++) {
      const sx = CL - 340 + r() * 640;
      const sy = -170 + r() * 150 - ((t * 6 + i * 13) % 40);
      c.fillStyle = `rgba(255,210,140,${0.18 * (1 - empty) * (0.5 + 0.5 * Math.sin(t * 2 + i))})`;
      c.fillRect(sx + Math.sin(t * 0.5 + i) * 6, sy, 1.4, 1.4);
    }
  });
}

// A candle's body, in the paint passes (the flame is separate light).
function candleBody(c, i, empty, t) {
  const cd = CANDLES[i];
  const h = cd.h * (1 - 0.35 * empty);
  let { x, y } = cd;
  c.save();
  if (cd.desk != null && empty > 0.45) {
    // rolled off its desk
    c.translate(x - 20, 0);
    c.rotate(1.2);
    c.translate(-x, -y);
    y = y;
  }
  c.fillStyle = mh('#6a5a46', '#3e3a36', empty);
  c.beginPath();
  c.ellipse(x, y, 8, 2, 0, 0, TAU);
  c.fill();
  c.fillStyle = mh('#f1e3bd', '#9a968a', empty);
  c.fillRect(x - 3, y - h, 6, h);
  // wax run down the side
  c.fillStyle = mh('#fff3d0', '#b4b0a4', empty);
  c.fillRect(x - 3, y - h, 2, h * 0.6);
  c.beginPath();
  c.ellipse(x + 3.2, y - h * 0.4, 1.4, 4 + empty * 4, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#2a2420';
  c.fillRect(x - 0.4, y - h - 3, 0.9, 3);
  c.restore();
}

export function visionClassroomLook(g, empty = 0) {
  empty = clamp(empty);
  const t = g.time || 0;
  const lights = [];
  // the moon through the high window: cold, a point at the glass, falling
  // off across the room
  lights.push({ x: CL - 80, y: -244, color: [0.62, 0.74, 1.0], intensity: lerp(0.5, 1.1, empty), radius: 0.55, project: 1.05, soft: 0.003, rim: 0.9 });
  // candle clusters: shelf, the desks, the board and teacher's desk
  const clusters = [
    { x: CL - 262, y: -186, ids: [0, 1, 2, 8], base: 1.5 },
    { x: CL - 70, y: -80, ids: [3, 4, 5], base: 1.35 },
    { x: CL + 390, y: -100, ids: [6, 7], base: 1.5 },
  ];
  const torch = g.torchLight?.();
  const live = [];
  for (const cl of clusters) {
    let lit = 0;
    for (const i of cl.ids) lit += candleLit(i, empty) / cl.ids.length;
    live.push([cl, lit]);
  }
  for (const [cl, lit] of live) {
    if (lit < 0.02) continue;
    if (torch && lights.length >= 3 && cl.x === CL - 70) continue;
    const fl = 0.92 + 0.08 * Math.sin(t * 9 + cl.x) + 0.04 * Math.sin(t * 23 + cl.x * 0.3);
    lights.push({ x: cl.x, y: cl.y, color: [1.0, 0.62, 0.3], intensity: cl.base * lit * fl, radius: 0.3, project: 1.0, soft: 0.004, rim: 0.8 });
  }
  if (torch) lights.push(torch);
  const warm = 1 - empty;
  return dreamy(g, {
    ambient: mixc([0.2, 0.14, 0.1], [0.045, 0.055, 0.085], empty),
    lights: lights.slice(0, 4),
    groundShadow: 0.8,
    bloom: lerp(1.0, 0.7, empty),
    exposure: lerp(1.05, 1.0, empty),
    grain: lerp(0.07, 0.06, empty),
    grade: {
      sat: lerp(1.18, 0.55, empty),
      contrast: lerp(1.0, 1.12, empty),
      lift: 0.01 * warm,
      tint: mixc([1.08, 0.97, 0.84], [0.93, 0.99, 1.07], empty),
      shadows: mixc([1.0, 0.9, 0.95], [0.82, 0.92, 1.16], empty),
      highs: mixc([1.06, 1.0, 0.9], [1.04, 1.04, 1.0], empty),
    },
    // a hush of dust: warmer in the lit room, a cold mist in the empty one
    fog: { density: lerp(0.07, 0.12, empty), height: 220, color: mixc([0.55, 0.38, 0.22], [0.2, 0.26, 0.4], empty) },
  });
}

// =====================================================================
// 2. THE ORCHARD
// =====================================================================
// Ghouta's grape orchards before the war: a late-summer golden afternoon,
// rows of vine on trellises receding in depth layers, an irrigation channel
// along the path. wither 0 -> 1: the light dims, the water slows, thickens
// and stops, the grapes shrivel to raisins all at once and the leaves curl
// and brown; then it is the ruined present: cratered, a dead stump, the
// channel dry and full of rubble, under the moon.

const OC = MEM.orchard[0];

// Colours of the three states of the sky (top, mid, horizon).
const SKY_DAY = ['#6fa6dc', '#f0cf94', '#ffc979'];
const SKY_DIM = ['#4a4f84', '#a8776a', '#d49a62'];
const SKY_NIGHT = ['#08101f', '#16223d', '#2c3a58'];

function skyAt(w) {
  const a = smooth(0.0, 0.55, w);
  const b = smooth(0.45, 0.95, w);
  return [0, 1, 2].map((i) => mh(mh(SKY_DAY[i], SKY_DIM[i], a), SKY_NIGHT[i], b));
}

// One row of trellised vines, baked as a tile that repeats. h is the height
// of the posts; the geometry is the same for lush and dead so the two
// crossfade; only leaves, bunches and colours change.
function vineRow(cfg, dead) {
  const { h, sp, seed, k, near } = cfg;
  const P = sp * 10;
  const H = h + 80;
  return bake(`orc-row-${seed}-${dead ? 1 : 0}`, P, H, k, (c) => {
    c.translate(0, h + 46);
    const rg = rng(seed * 13); // geometry: identical for both states
    const rc = rng(seed * 29 + (dead ? 5 : 1)); // colour
    // earth at the foot
    const eg = c.createLinearGradient(0, 0, 0, 34);
    eg.addColorStop(0, dead ? '#8a7352' : '#b78c58');
    eg.addColorStop(1, dead ? '#6d5a42' : '#8c6a42');
    c.fillStyle = eg;
    c.fillRect(0, -2, P, 36);
    // rows of the plough, little clods
    for (let i = 0; i < P / 9; i++) {
      c.fillStyle = rc() < 0.5 ? 'rgba(60,40,24,0.25)' : 'rgba(255,230,180,0.18)';
      c.fillRect(rc() * P, 2 + rc() * 26, 3 + rc() * 8, 2);
    }
    // posts and wires
    const wires = [-h * 0.3, -h * 0.62, -h * 0.94];
    const postC = dead ? '#5a4a3a' : '#7a5836';
    for (let i = 0; i <= 10; i++) {
      const px = i * sp;
      if (near) extrudeRect(c, px - 3, -h - 6, 6, h + 6, 7, { color: postC });
      c.fillStyle = postC;
      c.fillRect(px - 3, -h - 6, 6, h + 6);
      c.fillStyle = 'rgba(255,240,200,0.25)';
      c.fillRect(px - 3, -h - 6, 1.5, h + 6);
    }
    c.strokeStyle = dead ? '#6a5c4a' : '#4a3a2a';
    c.lineWidth = near ? 1.6 : 1.2;
    for (const wy of wires) {
      c.beginPath();
      c.moveTo(0, wy);
      c.lineTo(P, wy);
      c.stroke();
    }
    const greens = dead ? ['#8a6a2a', '#6e5222', '#a07c34', '#5a4220', '#7a5a28'] : ['#4a7a28', '#5f9230', '#74a83c', '#3a6a26', '#88b448'];
    const lite = dead ? '#c19a4a' : '#b4d460';
    const grapeC = dead ? ['#34201a', '#2a1812', '#44281c'] : ['#4a1f56', '#5e2a6c', '#391a46', '#6a3478'];
    // the plants, one between each pair of posts
    for (let i = 0; i < 10; i++) {
      const px = (i + 0.5) * sp;
      // trunk and its two cordons along the wire
      c.strokeStyle = dead ? '#4a3a2c' : '#5a4230';
      c.lineWidth = Math.max(3, h * 0.03);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(px, 4);
      c.bezierCurveTo(px - 5, -h * 0.15, px + 6, -h * 0.25, px, wires[0]);
      c.stroke();
      c.lineWidth = Math.max(2, h * 0.016);
      c.beginPath();
      c.moveTo(px, wires[0]);
      c.quadraticCurveTo(px - sp * 0.3, wires[0] - 4, px - sp * 0.55, wires[1] + 6);
      c.moveTo(px, wires[0]);
      c.quadraticCurveTo(px + sp * 0.3, wires[0] - 6, px + sp * 0.55, wires[1] + 4);
      c.stroke();
      // leaves: a dark pass behind, a lit pass in front
      const n = Math.round(h * (near ? 0.62 : 0.5));
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < n; j++) {
          const lx = px + (rg() - 0.5) * sp * 1.15;
          const ly = -h * (0.2 + 0.78 * Math.pow(rg(), 0.8));
          const sz = (0.07 + rg() * 0.05) * h * (near ? 0.95 : 1);
          const ang = rg() * TAU;
          const gi = Math.floor(rc() * greens.length);
          if (dead && rc() < 0.4) continue;
          c.save();
          c.translate(lx, ly);
          c.rotate(ang);
          if (pass === 0) {
            c.fillStyle = shadeHex(greens[gi], 0.62);
            c.beginPath();
            c.ellipse(0, 0, sz * 1.05, sz * 0.8, 0, 0, TAU);
            c.fill();
          } else if (dead) {
            // curled: a narrow crescent, the edge rolled in
            c.fillStyle = greens[gi];
            c.beginPath();
            c.ellipse(0, 0, sz * 0.8, sz * 0.38, 0, 0, TAU);
            c.fill();
            c.strokeStyle = 'rgba(40,24,10,0.5)';
            c.lineWidth = 1;
            c.beginPath();
            c.arc(0, sz * 0.2, sz * 0.7, Math.PI * 1.15, Math.PI * 1.85);
            c.stroke();
          } else {
            c.fillStyle = greens[gi];
            c.beginPath();
            c.ellipse(0, 0, sz * 0.95, sz * 0.74, 0, 0, TAU);
            c.fill();
            if (rc() < 0.4) {
              c.fillStyle = lite;
              c.globalAlpha = 0.5;
              c.beginPath();
              c.ellipse(-sz * 0.2, -sz * 0.2, sz * 0.55, sz * 0.3, 0, 0, TAU);
              c.fill();
              c.globalAlpha = 1;
            }
            if (near || h > 150) {
              c.strokeStyle = 'rgba(30,60,16,0.35)';
              c.lineWidth = 0.9;
              c.beginPath();
              c.moveTo(-sz * 0.9, 0);
              c.lineTo(sz * 0.9, 0);
              c.moveTo(0, 0);
              c.lineTo(sz * 0.4, -sz * 0.5);
              c.moveTo(0, 0);
              c.lineTo(sz * 0.4, sz * 0.5);
              c.stroke();
            }
          }
          c.restore();
        }
        // between the passes, the bunches hang in the shade of the leaves
        if (pass === 0) {
          const nb = near ? 3 : 2;
          for (let b = 0; b < nb; b++) {
            const bx = px + (rg() - 0.5) * sp * 0.8;
            const by = -h * (0.34 + rg() * 0.2);
            const gr = (near ? 0.032 : 0.036) * h * (dead ? 0.5 : 1);
            const rows = dead ? 4 : 6;
            for (let ro = 0; ro < rows; ro++) {
              const cnt = Math.max(1, (dead ? 4 : 6) - ro);
              for (let q = 0; q < cnt; q++) {
                const gx = bx + (q - (cnt - 1) / 2) * gr * 1.9 + (rg() - 0.5) * 1.2;
                const gy = by + ro * gr * (dead ? 1.5 : 1.7) + (dead ? ro * ro * 0.5 : 0);
                const ci = Math.floor(rc() * grapeC.length);
                c.fillStyle = grapeC[ci];
                c.beginPath();
                c.arc(gx, gy, gr, 0, TAU);
                c.fill();
                if (!dead) {
                  c.fillStyle = 'rgba(210,190,235,0.5)'; // the bloom on the skin
                  c.beginPath();
                  c.arc(gx - gr * 0.3, gy - gr * 0.35, gr * 0.36, 0, TAU);
                  c.fill();
                }
              }
            }
            c.strokeStyle = dead ? '#3a2a1c' : '#4e6a2a';
            c.lineWidth = 1.4;
            c.beginPath();
            c.moveTo(bx, by - gr * 2);
            c.lineTo(bx, by);
            c.stroke();
          }
        }
      }
    }
    // leaves fallen at the foot
    if (dead) {
      for (let i = 0; i < 60; i++) {
        c.fillStyle = greens[Math.floor(rc() * greens.length)];
        c.beginPath();
        c.ellipse(rc() * P, 2 + rc() * 22, 4 + rc() * 4, 1.6, rc() * 3, 0, TAU);
        c.fill();
      }
    } else {
      for (let i = 0; i < P / 14; i++) {
        c.fillStyle = rc() < 0.5 ? '#5a8a2a' : '#7aa83a';
        c.beginPath();
        c.ellipse(rc() * P, 1 + rc() * 8, 2 + rc() * 4, 4 + rc() * 8, (rc() - 0.5) * 0.6, 0, TAU);
        c.fill(); // grass at the foot of the plants
      }
    }
  });
}

const ROWS = [
  { d: 0.34, h: 104, sp: 92, seed: 21, k: 0.55 },
  { d: 0.46, h: 126, sp: 100, seed: 22, k: 0.65 },
  { d: 0.58, h: 148, sp: 110, seed: 23, k: 0.75 },
  { d: 0.7, h: 168, sp: 120, seed: 24, k: 0.85 },
  { d: 0.84, h: 192, sp: 134, seed: 25, k: 1.0 },
  { d: 1.0, h: 222, sp: 150, seed: 26, k: 1.15, near: true },
];

// A heap of broken concrete, with rebar; a: alpha. Feet along y = base.
function heap(c, x, base, w, h, seed, a = 1, col = '#8d867a') {
  const r = rng(seed);
  c.save();
  c.globalAlpha = a;
  const pts = [[x - 8, base]];
  const n = 8;
  for (let i = 1; i < n; i++) {
    const kk = i / n;
    pts.push([x + kk * w + (r() - 0.5) * 12, base - h * Math.sin(kk * Math.PI) * (0.7 + r() * 0.4)]);
  }
  pts.push([x + w + 8, base]);
  extrudePoly(c, pts, 10, { color: col });
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
  for (let i = 0; i < 6; i++) {
    c.save();
    c.translate(x + r() * w, base - r() * h * 0.75);
    c.rotate((r() - 0.5) * 1.1);
    c.fillStyle = shadeHex(col, 0.7 + r() * 0.45);
    const cw = 14 + r() * 18;
    c.fillRect(-cw / 2, -4, cw, 5 + r() * 4);
    c.fillStyle = 'rgba(255,248,235,0.22)';
    c.fillRect(-cw / 2, -4, cw, 1.2);
    c.restore();
  }
  c.strokeStyle = '#4a3b2e';
  c.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const rx = x + r() * w;
    const ry = base - h * (0.4 + r() * 0.4);
    c.beginPath();
    c.moveTo(rx, ry);
    c.quadraticCurveTo(rx + (r() - 0.5) * 20, ry - 14, rx + (r() - 0.5) * 36, ry - 22 - r() * 16);
    c.stroke();
  }
  c.restore();
}

// The vine that is left: a split, blackened stump with its cordons burnt off,
// and a post snapped beside it with a rusted wire hanging.
function stump(c, x, a) {
  c.save();
  c.globalAlpha = a;
  const pts = [[x - 17, 4], [x - 13, -22], [x - 15, -48], [x - 9, -70], [x - 12, -86], [x - 3, -74], [x + 2, -96], [x + 6, -70], [x + 14, -78], [x + 11, -52], [x + 16, -26], [x + 18, 4]];
  extrudePoly(c, pts, 14, { color: '#4a4036' });
  c.fillStyle = '#463d34';
  c.beginPath();
  c.moveTo(...pts[0]);
  for (const p of pts.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
  // charred bark, split down the middle
  c.strokeStyle = 'rgba(10,8,6,0.7)';
  c.lineWidth = 1.2;
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const bx = x - 12 + r() * 24;
    c.beginPath();
    c.moveTo(bx, -r() * 70);
    c.lineTo(bx + (r() - 0.5) * 6, -r() * 70 - 14);
    c.stroke();
  }
  c.strokeStyle = 'rgba(0,0,0,0.85)';
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(x - 2, -70);
  c.lineTo(x + 1, -40);
  c.lineTo(x - 3, -10);
  c.stroke();
  // a cordon burnt to a curl of wire-thin wood
  c.strokeStyle = '#3a3128';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x + 14, -60);
  c.quadraticCurveTo(x + 50, -66, x + 66, -40);
  c.stroke();
  // the post: snapped, leaning, a wire gone slack from it
  c.save();
  c.translate(x + 120, 2);
  c.rotate(0.22);
  extrudeRect(c, -3, -112, 6, 112, 6, { color: '#5a4a3a' });
  c.fillStyle = '#5a4a3a';
  c.beginPath();
  c.moveTo(-3, 0);
  c.lineTo(-3, -112);
  c.lineTo(0, -118);
  c.lineTo(3, -106);
  c.lineTo(3, 0);
  c.fill();
  c.restore();
  c.strokeStyle = '#6b4a38';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(x + 94, -100);
  c.quadraticCurveTo(x + 60, -40, x + 30, -4);
  c.stroke();
  c.restore();
}

const WS = { t: -1, ph: 0 };

export function drawOrchard(R, g, { wither = 0, t = g.time } = {}) {
  const w = clamp(wither);
  const cam = R.cam.x;
  const dim = smooth(0, 0.62, w);
  const shr = smooth(0.44, 0.52, w); // the grapes and leaves go all at once
  const rv = smooth(0.62, 0.98, w); // the ruin settles in
  const flow = 1 - smooth(0.12, 0.5, w);
  const thick = smooth(0.08, 0.5, w);
  const lowering = smooth(0.4, 0.7, w);
  const dry = smooth(0.62, 0.9, w);
  const moonK = smooth(0.5, 1, w);
  const dtT = WS.t < 0 ? 0 : clamp(t - WS.t, 0, 0.2);
  WS.t = t;
  WS.ph += dtT * flow;
  const ph = WS.ph;

  // ---- sky ---------------------------------------------------------------
  const sk = skyAt(w);
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, R.H * 0.82);
    gr.addColorStop(0, sk[0]);
    gr.addColorStop(0.55, sk[1]);
    gr.addColorStop(1, sk[2]);
    c.fillStyle = gr;
    c.fillRect(0, 0, R.W, R.H);
    // the sun, low and enormous in the dust of late summer
    const sa = 1 - dim;
    if (sa > 0.02) {
      const sx = R.W * 0.8;
      const sy = R.H * 0.36;
      const gl = c.createRadialGradient(sx, sy, 0, sx, sy, R.W * 0.5);
      gl.addColorStop(0, `rgba(255,236,190,${0.75 * sa})`);
      gl.addColorStop(0.2, `rgba(255,206,130,${0.35 * sa})`);
      gl.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = gl;
      c.fillRect(0, 0, R.W, R.H);
      c.fillStyle = `rgba(255,250,225,${0.9 * sa})`;
      c.beginPath();
      c.arc(sx, sy, R.W * 0.02, 0, TAU);
      c.fill();
    }
    // slow clouds, lit gold on their undersides in the day, grey after
    const cl = mixc([255, 214, 150], [110, 120, 150], dim);
    for (let i = 0; i < 7; i++) {
      const cxp = ((i * 0.23 + 0.05 + t * 0.002 + cam * 0.00002) % 1.3) * R.W - R.W * 0.15;
      const cyp = R.H * (0.1 + (i % 4) * 0.09);
      c.fillStyle = rgba(cl, 0.28 * (1 - moonK * 0.7));
      c.beginPath();
      c.ellipse(cxp, cyp, R.W * (0.09 + (i % 3) * 0.03), R.H * 0.022, 0, 0, TAU);
      c.fill();
      c.beginPath();
      c.ellipse(cxp + R.W * 0.03, cyp - R.H * 0.012, R.W * 0.05, R.H * 0.018, 0, 0, TAU);
      c.fill();
    }
    // the moon and its stars, once it is the present
    if (moonK > 0.02) {
      const sr = rng(3);
      for (let i = 0; i < 70; i++) {
        const sx = sr() * R.W;
        const sy = sr() * R.H * 0.5;
        c.fillStyle = `rgba(220,230,255,${moonK * (0.25 + sr() * 0.6) * (0.7 + 0.3 * Math.sin(t * 1.2 + i))})`;
        c.fillRect(sx, sy, 1.4, 1.4);
      }
      const mx = R.W * 0.2;
      const my = R.H * 0.17;
      const mg = c.createRadialGradient(mx, my, 0, mx, my, R.W * 0.22);
      mg.addColorStop(0, `rgba(190,210,255,${0.5 * moonK})`);
      mg.addColorStop(1, 'rgba(150,180,255,0)');
      c.fillStyle = mg;
      c.fillRect(0, 0, R.W, R.H);
      c.fillStyle = `rgba(240,244,255,${0.95 * moonK})`;
      c.beginPath();
      c.arc(mx, my, R.W * 0.015, 0, TAU);
      c.fill();
    }
    c.restore();
  });

  // ---- far country: mountain, the city in its haze, hills and poplars -----
  const mt = mh(mh('#c0a090', '#6a5a66', dim), '#141c2e', moonK);
  const city = mh(mh('#d8b890', '#7a5a58', dim), '#10182a', moonK);
  const hill = mh(mh('#b09a62', '#5e5040', dim), '#10192a', moonK);
  R.layer(0.1);
  R.paint((c) => {
    const x0 = cam * 0.1 - 2200;
    c.fillStyle = mt;
    c.beginPath();
    c.moveTo(x0, 400);
    c.lineTo(x0, -120);
    for (let x = x0; x <= x0 + 4400; x += 60) {
      const k = (x + 20000) * 0.0011;
      c.lineTo(x, -150 - 90 * Math.sin(k) - 50 * Math.sin(k * 2.7 + 1) - 20 * noise1(x * 0.02));
    }
    c.lineTo(x0 + 4400, 400);
    c.closePath();
    c.fill();
  });
  R.layer(0.2);
  R.paint((c) => {
    // Damascus, far off: low blocks, domes, a minaret; broken and dark later
    const x0 = Math.floor((cam * 0.2 - 1800) / 90) * 90;
    c.fillStyle = city;
    for (let x = x0; x < x0 + 3800; x += 90) {
      const q = rng(Math.floor(x / 90) + 400);
      const bh = 22 + q() * 60;
      const bw = 60 + q() * 40;
      c.beginPath();
      c.moveTo(x, 10);
      c.lineTo(x, -bh);
      if (rv > 0.4 && q() < 0.4) {
        c.lineTo(x + bw * 0.4, -bh + 6);
        c.lineTo(x + bw * 0.6, -bh * 0.6);
      }
      c.lineTo(x + bw, -bh);
      c.lineTo(x + bw, 10);
      c.fill();
      if (q() < 0.18) {
        c.beginPath();
        c.arc(x + bw / 2, -bh, 14, Math.PI, 0);
        c.fill();
      }
      if (q() < 0.1) c.fillRect(x + bw / 2 - 2, -bh - 70, 5, 70);
    }
    c.fillRect(x0, 8, 3800, 400);
  });
  R.glow((c) => {
    // the haze that lies on the plain in the afternoon
    const a = 0.22 * (1 - dim);
    if (a > 0.01) {
      const hg = c.createLinearGradient(0, -120, 0, 20);
      hg.addColorStop(0, 'rgba(255,215,150,0)');
      hg.addColorStop(1, `rgba(255,215,150,${a})`);
      c.fillStyle = hg;
      c.fillRect(cam * 0.2 - 1900, -120, 3900, 140);
    }
  });
  R.layer(0.28);
  R.paint((c) => {
    // low hills of olive and dry grass, poplars standing on them
    const x0 = cam * 0.28 - 1900;
    c.fillStyle = hill;
    c.beginPath();
    c.moveTo(x0, 500);
    for (let x = x0; x <= x0 + 3800; x += 50) c.lineTo(x, -30 - 26 * Math.sin((x + 9000) * 0.004) - 14 * Math.sin((x + 3000) * 0.011));
    c.lineTo(x0 + 3800, 500);
    c.closePath();
    c.fill();
    const q = rng(61);
    const pop = mh(mh('#4a6a28', '#3a3a2a', dim), '#0c1420', moonK);
    for (let x = Math.floor(x0 / 150) * 150; x < x0 + 3800; x += 150) {
      const pr = rng(Math.floor(x / 150) + 600);
      if (pr() < 0.55) {
        const ph2 = 70 + pr() * 60;
        c.fillStyle = pop;
        c.beginPath();
        c.ellipse(x + pr() * 60, -34 - ph2 / 2, 7 + pr() * 4, ph2 / 2, 0, 0, TAU);
        c.fill();
      }
    }
    void q;
  });
  R.layer(1);

  // smoke over the town: only in the present
  if (rv > 0.05) {
    T_plume(R, cam * 0.28 + 520, 30, t, rv, 0.28);
    T_plume(R, cam * 0.28 - 640, 24, t, rv * 0.8, 0.28);
  }

  // ---- the rows, far to near ---------------------------------------------
  const earthA = mh(mh('#b08a56', '#7a6446', shr), '#3c3a3a', rv);
  const earthB = mh(mh('#8f6c40', '#5e4c36', shr), '#2a2a2c', rv);
  ROWS.forEach((row, ri) => {
    R.layer(row.d);
    const P = row.sp * 10;
    const cxd = cam * row.d;
    const start = Math.floor((cxd - 1000) / P) * P;
    const H = row.h + 80;
    const lushA = 1 - shr;
    const deadA = shr * (1 - rv * 0.96);
    const draw = (c) => {
      // the ground this row stands on, carried down so nothing shows through
      const eg = c.createLinearGradient(0, 0, 0, 220);
      eg.addColorStop(0, earthA);
      eg.addColorStop(1, earthB);
      c.fillStyle = eg;
      c.fillRect(cxd - 1100, 0, 2200, 300);
      if (lushA > 0.01) {
        c.globalAlpha = lushA;
        for (let x = start; x < cxd + 1000; x += P) c.drawImage(vineRow(row, false), x, -row.h - 46, P, H);
      }
      if (deadA > 0.01) {
        c.globalAlpha = deadA;
        for (let x = start; x < cxd + 1000; x += P) c.drawImage(vineRow(row, true), x, -row.h - 46, P, H);
      }
      c.globalAlpha = 1;
    };
    if (row.near) R.cast(draw);
    else R.paint(draw);
    if (rv > 0.02) {
      const ruin = (c) => {
        // the rows torn up: craters and heaps stand where they were
        const q = rng(900 + ri);
        for (let x = Math.floor((cxd - 1000) / 330) * 330; x < cxd + 1000; x += 330) {
          const qq = rng(Math.floor(x / 330) * 7 + ri * 131);
          if (qq() < 0.6) {
            const wx = x + qq() * 200;
            const rw = 70 + qq() * 90;
            // the pit, a dark ellipse in the ground, and its lip
            c.save();
            c.globalAlpha = rv;
            c.fillStyle = '#1c1a1a';
            c.beginPath();
            c.ellipse(wx, 14 + qq() * 10, rw, 13, 0, 0, TAU);
            c.fill();
            c.fillStyle = '#5a554f';
            c.beginPath();
            c.ellipse(wx, 4, rw * 1.18, 9, 0, Math.PI, TAU);
            c.ellipse(wx, 8, rw * 0.9, 6, 0, TAU, Math.PI, true);
            c.fill();
            c.restore();
          }
          if (qq() < 0.5) heap(c, x + 140 + qq() * 120, 3, 60 + qq() * 70, 14 + qq() * 18, ri * 91 + Math.floor(x), rv, '#6e6a62');
        }
        // posts that survived, leaning, their wire torn
        c.globalAlpha = rv;
        c.fillStyle = '#3a3128';
        for (let x = Math.floor((cxd - 1000) / 170) * 170; x < cxd + 1000; x += 170) {
          const pr = rng(Math.floor(x / 170) * 3 + ri * 17);
          if (pr() < 0.4) {
            c.save();
            c.translate(x + pr() * 50, 2);
            c.rotate((pr() - 0.5) * 0.7);
            c.fillRect(-2.5, -row.h * (0.4 + pr() * 0.5), 5, row.h);
            c.restore();
          }
        }
        c.globalAlpha = 1;
        void q;
      };
      if (row.near) R.cast(ruin);
      else R.paint(ruin);
    }
    // distance: the afternoon's haze lies between the rows
    const hz = (1 - row.d) * 0.4 * (1 - dim);
    if (hz > 0.01) {
      R.glow((c) => {
        const hg = c.createLinearGradient(0, -row.h - 30, 0, 90);
        hg.addColorStop(0, 'rgba(255,205,130,0)');
        hg.addColorStop(0.5, `rgba(255,205,130,${hz * 0.5})`);
        hg.addColorStop(1, `rgba(255,205,130,${hz})`);
        c.fillStyle = hg;
        c.fillRect(cxd - 1100, -row.h - 30, 2200, row.h + 130);
      });
    }
  });
  R.layer(1);

  // ---- birds: sparrows on the top wire, swifts overhead, gone at once -----
  const birdA = 1 - smooth(0.1, 0.24, w);
  if (birdA > 0.01) {
    R.cast((c) => {
      c.fillStyle = '#3a2c2a';
      for (const bx of [OC + 140, OC + 168, OC + 440, OC - 330]) {
        const hop = Math.max(0, Math.sin(t * 3 + bx)) * 1.2;
        c.beginPath();
        c.ellipse(bx, -222 - 4 - hop, 5.5, 4, -0.2, 0, TAU);
        c.fill();
        c.beginPath();
        c.moveTo(bx + 4, -226 - hop);
        c.lineTo(bx + 9, -225 - hop);
        c.lineTo(bx + 4, -223 - hop);
        c.fill();
        c.beginPath();
        c.moveTo(bx - 4, -222 - hop);
        c.lineTo(bx - 12, -219);
        c.lineTo(bx - 3, -219);
        c.fill();
      }
    });
    R.layer(0.5);
    R.paint((c) => {
      c.strokeStyle = `rgba(48,36,40,${birdA * 0.85})`;
      c.lineWidth = 1.8;
      c.lineCap = 'round';
      const flock = (fx, fy, n, sp, seed) => {
        for (let i = 0; i < n; i++) {
          const q = rng(seed + i);
          const bx = cam * 0.5 + ((fx - t * sp + i * 38 + q() * 30) % 1800) - 900;
          const by = fy + Math.sin(t * 0.7 + i) * 12 + q() * 40 - w * 600;
          const fl = Math.sin(t * 9 + i * 1.7) * 7;
          c.beginPath();
          c.moveTo(bx - 11, by - fl * 0.7);
          c.quadraticCurveTo(bx - 4, by - fl - 5, bx, by);
          c.quadraticCurveTo(bx + 4, by - fl - 5, bx + 11, by - fl * 0.7);
          c.stroke();
        }
      };
      flock(900, -330, 7, 36, 700);
      flock(200, -420, 5, 28, 800);
    });
    R.layer(1);
  }

  // ---- the path, the channel, the bank ------------------------------------
  const x0 = Math.floor((cam - 1000) / 200) * 200;
  const x1 = cam + 1000;
  const pathC = mh(mh('#cfa66a', '#8a7452', shr), '#46443f', rv);
  const bankA = mh(mh('#9a7648', '#6a563c', shr), '#2d2c2c', rv);
  const bankB = mh(mh('#72532e', '#4c3e2e', shr), '#1f1e20', rv);
  // the channel's lining of stone, in the warm and in the ruin
  const lipC = mh(mh('#cdb98e', '#8e8068', shr), '#6c675e', rv);
  const wallC = mh(mh('#8f7c58', '#665a46', shr), '#3c3a38', rv);
  R.paint((c) => {
    // the beaten path
    const pg = c.createLinearGradient(0, 0, 0, 14);
    pg.addColorStop(0, shadeHex(pathC, 0.88));
    pg.addColorStop(1, pathC);
    c.fillStyle = pg;
    c.fillRect(x0, 0, x1 - x0 + 200, 15);
    // the bank, down toward the viewer
    const bg = c.createLinearGradient(0, 50, 0, 260);
    bg.addColorStop(0, bankA);
    bg.addColorStop(1, bankB);
    c.fillStyle = bg;
    c.fillRect(x0, 50, x1 - x0 + 200, 400);
    // stones, tufts of dry grass, the dust of a path in August
    for (let x = x0; x < x1; x += 40) {
      const q = rng(Math.floor(x / 40) + 3000);
      if (q() < 0.5) {
        c.fillStyle = q() < 0.5 ? 'rgba(255,235,190,0.35)' : 'rgba(60,40,22,0.3)';
        c.fillRect(x + q() * 40, 3 + q() * 10, 2 + q() * 6, 1.6 + q() * 2);
      }
      if (q() < 0.45) {
        const gx = x + q() * 40;
        const gy = 52 + q() * 18;
        c.strokeStyle = shr > 0.5 ? '#7a6a3a' : q() < 0.5 ? '#8a9a3a' : '#a8a048';
        c.lineWidth = 1.2;
        c.beginPath();
        for (let b = -1; b <= 1; b++) {
          c.moveTo(gx, gy);
          c.lineTo(gx + b * 5, gy - 10 - q() * 6);
        }
        c.stroke();
      }
    }
    // far lip of the channel, with its thickness
    extrudeRect(c, x0, 8, x1 - x0 + 200, 8, 8, { color: lipC });
    c.fillStyle = lipC;
    c.fillRect(x0, 8, x1 - x0 + 200, 8);
    c.fillStyle = 'rgba(255,248,225,0.3)';
    c.fillRect(x0, 8, x1 - x0 + 200, 1.5);
    // the channel's far wall, in shade
    c.fillStyle = wallC;
    c.fillRect(x0, 16, x1 - x0 + 200, 11);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) c.fillRect(x, 16, 1.5, 11);
    // the bed: sand and dark pebbles (in view as the water leaves it)
    c.fillStyle = mh('#9a8660', '#4e4638', dry);
    c.fillRect(x0, 27, x1 - x0 + 200, 18);
    for (let x = x0; x < x1; x += 22) {
      const q = rng(Math.floor(x / 22) + 5000);
      c.fillStyle = q() < 0.5 ? 'rgba(50,40,30,0.5)' : 'rgba(210,190,150,0.5)';
      c.beginPath();
      c.ellipse(x + q() * 20, 30 + q() * 12, 2 + q() * 4, 1.5 + q() * 2, 0, 0, TAU);
      c.fill();
    }
    // the water: clear and cold, then thick and brown; it falls, and stops
    const top = 27 + 12 * lowering;
    const wa = (1 - smooth(0.6, 0.78, w)) * (0.62 + 0.36 * thick);
    if (wa > 0.01) {
      const wc = mixc([116, 202, 204], [96, 78, 48], thick);
      const wc2 = mixc([66, 150, 176], [64, 52, 34], thick);
      const wg = c.createLinearGradient(0, top, 0, 45);
      wg.addColorStop(0, rgba(wc, wa));
      wg.addColorStop(1, rgba(wc2, wa));
      c.fillStyle = wg;
      c.fillRect(x0, top, x1 - x0 + 200, 45 - top);
    }
    // near lip of the channel
    extrudeRect(c, x0, 44, x1 - x0 + 200, 7, 8, { color: lipC });
    c.fillStyle = shadeHex(lipC, 0.94);
    c.fillRect(x0, 44, x1 - x0 + 200, 7);
    c.fillStyle = 'rgba(255,248,225,0.28)';
    c.fillRect(x0, 44, x1 - x0 + 200, 1.4);
    // cracks in the dry mud of the bed
    if (dry > 0.05) {
      c.strokeStyle = `rgba(20,14,10,${0.5 * dry})`;
      c.lineWidth = 1;
      for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) {
        const q = rng(Math.floor(x / 60) + 7000);
        c.beginPath();
        c.moveTo(x + q() * 30, 28);
        c.lineTo(x + q() * 40 + 10, 36);
        c.lineTo(x + q() * 50, 44);
        c.stroke();
      }
    }
  });
  R.surface((c) => c.rect(x0, 52, x1 - x0, 200), 'concrete', { scale: 0.9, seed: 8, alpha: 0.18 + 0.45 * rv });
  // water in motion: ripples riding the flow, a sheen of low sun on them
  const wl = (1 - smooth(0.6, 0.78, w));
  if (wl > 0.02) {
    R.glow((c) => {
      const span = 3400;
      const base = Math.floor((cam - 1700) / span) * span;
      c.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const q = rng(i + 90);
        const px = base + ((i * 211 + ph * (60 + q() * 40)) % span);
        const py = 30 + q() * 13;
        const len = 12 + q() * 30;
        const a = (0.1 + 0.22 * q()) * (1 - dim) * (1 - thick * 0.8) * wl;
        c.strokeStyle = `rgba(255,244,214,${a})`;
        c.lineWidth = 1 + q() * 1.2;
        c.beginPath();
        c.moveTo(px, py);
        c.quadraticCurveTo(px + len / 2, py + Math.sin(ph * 2 + i) * 1.5, px + len, py);
        c.stroke();
      }
      // cool moon-glints once the light is the moon's, on what water is left
      for (let i = 0; i < 24; i++) {
        const q = rng(i + 190);
        c.fillStyle = `rgba(160,190,255,${0.16 * moonK * wl * (0.5 + 0.5 * Math.sin(t * 2 + i))})`;
        c.fillRect(base + q() * span, 30 + q() * 12, 6 + q() * 12, 1.2);
      }
    });
  }
  // water-light thrown up under the leaves: green-gold reflection on the lip
  // rubble in the channel, and the ruin's near things
  if (rv > 0.02) {
    R.cast((c) => {
      for (let x = Math.floor((cam - 1000) / 210) * 210; x < cam + 1000; x += 210) {
        const q = rng(Math.floor(x / 210) + 8200);
        if (q() < 0.8) heap(c, x + q() * 90, 48, 60 + q() * 60, 14 + q() * 18, Math.floor(x) + 11, rv, '#85807a');
      }
      stump(c, OC + 330, rv);
      heap(c, OC + 40, 4, 90, 24, 17, rv, '#77726b');
      heap(c, OC - 560, 4, 120, 30, 19, rv, '#6e6a62');
      heap(c, OC + 700, 4, 100, 22, 23, rv, '#77726b');
    });
  }
  // fallen leaves on the path and a few grapes that dropped
  if (shr > 0.5 && rv < 0.9) {
    R.paint((c) => {
      c.globalAlpha = (shr - 0.5) * 2 * (1 - rv);
      for (let x = x0; x < x1; x += 34) {
        const q = rng(Math.floor(x / 34) + 9100);
        c.fillStyle = ['#8a6a2a', '#6e5222', '#a07c34'][Math.floor(q() * 3)];
        c.beginPath();
        c.ellipse(x + q() * 30, 4 + q() * 8, 4 + q() * 3, 1.8, q() * 3, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    });
  }

  // ---- foreground: leaves at the lens, a bunch within reach ---------------
  const fgA = (1 - rv) * 1;
  if (fgA > 0.02) {
    R.layer(1.25);
    const cxf = cam * 1.25;
    R.paint((c) => {
      c.globalAlpha = fgA;
      const sp = 760;
      for (let x = Math.floor((cxf - 1100) / sp) * sp; x < cxf + 1100; x += sp) {
        const q = rng(Math.floor(x / sp) + 9500);
        const bx = x + q() * 500;
        const cols = shr > 0.5 ? ['#8a6a2a', '#6e5222', '#5a4220'] : ['#2f5a1e', '#3c6e24', '#4a8228'];
        // a cluster of big leaves hanging from above the frame
        for (let i = 0; i < 9; i++) {
          const lx = bx + (q() - 0.5) * 120;
          const ly = -250 - q() * 90;
          c.save();
          c.translate(lx, ly);
          c.rotate((q() - 0.5) * 1.4 + Math.sin(t * 0.8 + i) * 0.03);
          c.fillStyle = cols[i % 3];
          c.beginPath();
          c.ellipse(0, 40, 24, shr > 0.5 ? 20 : 44, 0, 0, TAU);
          c.fill();
          c.restore();
        }
      }
      c.globalAlpha = 1;
    });
    R.layer(1);
  }
}

// smoke columns far away (the plume helper takes its own layer)
function T_plume(R, x, y, t, a, depth) {
  R.layer(depth);
  R.paint((c) => {
    const r = rng(17);
    const h = 380 * Math.min(a * 1.4, 1);
    for (let i = 0; i < 26; i++) {
      const kk = i / 25;
      const px = x + noise1(kk * 4 + t * 0.15) * 40 * kk + kk * kk * 90 + (r() - 0.5) * 30;
      const py = y - kk * h;
      const pr = (36 + kk * 90) * (0.7 + r() * 0.5);
      const al = 0.4 * (1 - kk * 0.6) * a;
      const gr = c.createRadialGradient(px, py, 0, px, py, pr);
      gr.addColorStop(0, `rgba(36,34,40,${al})`);
      gr.addColorStop(1, 'rgba(36,34,40,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
    }
  });
  R.layer(1);
}

export function orchardLook(g, wither = 0) {
  const w = clamp(wither);
  const dim = smooth(0, 0.62, w);
  const moonK = smooth(0.5, 1, w);
  const t = g.time || 0;
  // the one light that casts the shadows: the low sun, easing into the moon
  const keyUv = [lerp(-0.34, -0.2, moonK), lerp(-0.12, -0.5, moonK)];
  const sunCol = mixc([1.0, 0.72, 0.4], [0.95, 0.5, 0.32], dim);
  const keyCol = mixc(sunCol, [0.6, 0.72, 1.0], moonK);
  const keyI = lerp(lerp(1.55, 0.7, dim), 0.8, moonK);
  const lights = [
    { uv: keyUv, color: keyCol, intensity: keyI, radius: 0, project: 1.04, soft: 0.003, rim: lerp(1.2, 0.8, moonK) },
    // golden bounce off the plain, from the right
    { uv: [1.25, 0.4], color: [1.0, 0.66, 0.34], intensity: 0.36 * (1 - dim), radius: 0, rim: 0.4 },
  ];
  const torch = g.torchLight?.();
  if (torch && w > 0.7) lights.push(torch);
  return dreamy(g, {
    ambient: mixc(mixc([0.36, 0.3, 0.24], [0.2, 0.17, 0.2], dim), [0.06, 0.075, 0.12], moonK),
    lights,
    god: { uv: [lerp(-0.34, -0.2, moonK), lerp(-0.12, -0.5, moonK)], strength: lerp(0.3, 0.06, dim) },
    groundShadow: lerp(0.6, 0.85, moonK),
    bloom: lerp(1.15, 0.7, dim),
    exposure: lerp(1.04, 0.95, dim),
    grain: 0.06,
    grade: {
      sat: lerp(1.2, 0.55, smooth(0.35, 0.95, w)),
      contrast: lerp(0.98, 1.1, dim),
      lift: 0.012 * (1 - dim),
      tint: mixc([1.1, 0.99, 0.84], [0.93, 0.99, 1.07], moonK),
      shadows: mixc([1.0, 0.9, 1.0], [0.82, 0.92, 1.16], moonK),
      highs: mixc([1.07, 1.0, 0.88], [1.04, 1.04, 1.0], moonK),
    },
    fog: { density: lerp(0.07, 0.12, dim), height: 150, color: mixc([0.9, 0.7, 0.45], [0.3, 0.38, 0.54], moonK) },
  });
}

// =====================================================================
// 3. DAMASCUS, 2010
// =====================================================================
// A street that works: shopfronts full of things under lit signs, a
// falafel stand, a bus and cars passing, trees, street lamps, and on the
// right a café with a big clear window (young Sami and young Ahmad sit
// behind it). fold 0 -> 1: everything contracts and folds inward toward the
// café window; the window becomes a damaged concrete wall in moonlight.

const DC = MEM.damascus[0];

// The café's big window, as world coordinates (x, y of the top-left corner).
// The story seats young Sami at 32% and young Ahmad at 68% of its width,
// both on chairs 42 high, at the table between them.
export const CAFE_WINDOW = { x: CAFE_X - 120, y: -218, w: 340, h: 150 };
// The falafel stand: the vendor's spot, and the counter's span.
export const FALAFEL = { x: DC - 560, counter: [DC - 530, DC - 410] };

const SHEAR = -1.5; // long shadows thrown to the right by the low sun
const FACADE_Y0 = 190; // height of a shop's ground floor, sign band included
const FLOOR_H = 118;

const SHOPS = [
  { w: 250, floors: 4, kind: 'sweets', sign: 'حلويات الشام', sc: '#7a1e2c', tc: '#ffe9a8', wall: '#ecd0a0', awn: ['#c0392b', '#f3e6c8'] },
  { w: 230, floors: 3, kind: 'clothes', sign: 'ألبسة الأناقة', sc: '#1f3f7a', tc: '#ffffff', wall: '#e3c3a2' },
  { w: 270, floors: 4, kind: 'fruit', sign: 'خضار وفواكه الغوطة', sc: '#1f6a3a', tc: '#fff7c4', wall: '#dccaa6', awn: ['#2e7d32', '#f3e6c8'] },
  { w: 240, floors: 3, kind: 'electronics', sign: 'الأمل للإلكترونيات', sc: '#12263f', tc: '#9ae0ff', wall: '#e8d5b2' },
  { w: 250, floors: 4, kind: 'pharmacy', sign: 'صيدلية النور', sc: '#0f5a3a', tc: '#ffffff', wall: '#f0e1bf' },
  { w: 260, floors: 3, kind: 'books', sign: 'مكتبة الجامعة', sc: '#4a2a1a', tc: '#ffd98a', wall: '#ddba96' },
  { w: 240, floors: 4, kind: 'spices', sign: 'بهارات القدس', sc: '#8a4a14', tc: '#fff0c0', wall: '#eacba6', awn: ['#d98a1e', '#f3e6c8'] },
  { w: 230, floors: 3, kind: 'jewel', sign: 'مجوهرات الفيحاء', sc: '#161616', tc: '#ffd24a', wall: '#e2d2b2' },
  { w: 170, floors: 4, kind: 'juice', sign: 'عصير وبوظة', sc: '#a02a4a', tc: '#fff', wall: '#ecd6b4', awn: ['#d63a5a', '#f3e6c8'] },
  // (the café stands here, between)
  { w: 280, floors: 3, kind: 'clothes', sign: 'بيت الأزياء', sc: '#5a2a6a', tc: '#ffe6ff', wall: '#e5c9a6' },
  { w: 290, floors: 4, kind: 'electronics', sign: 'اتصالات الشرق', sc: '#7a1010', tc: '#fff', wall: '#ddc4a2' },
];
const SHOP_X0 = DC - 1620;
const CAFE_X0 = CAFE_X - 300;
const CAFE_W = 630;
// where each shop starts (the café takes its own place after the ninth)
const shopX = (i) => {
  if (i >= 9) return CAFE_X0 + CAFE_W + SHOPS.slice(9, i).reduce((s, q) => s + q.w, 0);
  return SHOP_X0 + SHOPS.slice(0, i).reduce((s, q) => s + q.w, 0);
};
const shopH = (s) => FACADE_Y0 + s.floors * FLOOR_H + 20;

// ---- shop interiors: what's for sale, per kind --------------------------
function goods(c, gl, kind, w, rg) {
  const x0 = 16;
  const x1 = w - 16;
  const iw = x1 - x0;
  const top = -166;
  const bot = -4;
  const ig = c.createLinearGradient(0, top, 0, bot);
  const tones = { sweets: ['#7a4a30', '#a87848'], clothes: ['#6a5448', '#9a826c'], fruit: ['#5a4a30', '#8a7440'], electronics: ['#1c2430', '#34404e'], pharmacy: ['#c8d4d0', '#e8eeea'], books: ['#4a3020', '#6e4c30'], spices: ['#6a4020', '#a06a30'], jewel: ['#2a1a16', '#4a2e22'], juice: ['#8a5a30', '#c08a48'] }[kind];
  ig.addColorStop(0, tones[0]);
  ig.addColorStop(1, tones[1]);
  c.fillStyle = ig;
  c.fillRect(x0, top, iw, bot - top);
  const shelf = (y, col = '#3a2a1c') => {
    c.fillStyle = col;
    c.fillRect(x0, y, iw, 3);
    c.fillStyle = 'rgba(255,235,190,0.22)';
    c.fillRect(x0, y, iw, 1);
  };
  const glowRect = (x, y, ww, hh, col) => {
    gl.fillStyle = col;
    gl.fillRect(x, y, ww, hh);
  };
  if (kind === 'sweets') {
    for (const sy of [-128, -90]) {
      shelf(sy);
      for (let x = x0 + 8; x < x1 - 20; x += 26) {
        c.fillStyle = ['#f0a8b8', '#f4ecd8', '#9ac08a', '#e8c868'][Math.floor(rg() * 4)];
        c.fillRect(x, sy - 22, 21, 22);
        c.fillStyle = '#c04a5a';
        c.fillRect(x + 9, sy - 22, 3, 22);
      }
    }
    shelf(-148);
    c.fillStyle = '#d8c090';
    for (let x = x0 + 10; x < x1 - 14; x += 34) c.fillRect(x, -168 + 5, 26, 10 + rg() * 6);
    // the glass case, trays of baklava
    c.fillStyle = '#e8e2d4';
    c.fillRect(x0, -62, iw, 58);
    c.fillStyle = 'rgba(190,225,235,0.5)';
    c.fillRect(x0 + 4, -58, iw - 8, 38);
    for (let x = x0 + 8; x < x1 - 20; x += 40) {
      c.fillStyle = '#e8b04a';
      c.fillRect(x, -44, 34, 10);
      c.fillStyle = '#6a9a3a';
      for (let i = 0; i < 5; i++) c.fillRect(x + 3 + i * 7, -43, 3, 3);
      c.fillStyle = '#c8872a';
      c.fillRect(x, -34, 34, 3);
    }
    glowRect(x0, top, iw, 12, 'rgba(255,214,150,0.45)');
  } else if (kind === 'clothes') {
    c.strokeStyle = '#3a2a1c';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x0, -128);
    c.lineTo(x1, -128);
    c.stroke();
    const cols = ['#c0402a', '#2a5a8a', '#e0c040', '#4a8a4a', '#8a3a7a', '#f0f0e8', '#2a2a30', '#d07040'];
    for (let x = x0 + 10; x < x1 - 14; x += 19) {
      const col = cols[Math.floor(rg() * cols.length)];
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x, -127);
      c.lineTo(x + 16, -127);
      c.lineTo(x + 18, -84 + rg() * 8);
      c.lineTo(x - 2, -84 + rg() * 8);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(x + 2, -125, 4, 38);
    }
    // two mannequins with their dresses, a stack of jeans
    for (const mx of [x0 + iw * 0.3, x0 + iw * 0.72]) {
      c.fillStyle = '#d9c8b4';
      c.beginPath();
      c.arc(mx, -64, 7, 0, TAU);
      c.fill();
      c.fillStyle = cols[Math.floor(rg() * cols.length)];
      c.beginPath();
      c.moveTo(mx - 10, -56);
      c.lineTo(mx + 10, -56);
      c.lineTo(mx + 22, -6);
      c.lineTo(mx - 22, -6);
      c.closePath();
      c.fill();
    }
    shelf(-44);
    c.fillStyle = '#3a5a8a';
    c.fillRect(x1 - 52, -62, 40, 18);
    c.fillStyle = '#2e4a74';
    c.fillRect(x1 - 52, -44, 40, 4);
    glowRect(x0, top, iw, 10, 'rgba(255,236,200,0.4)');
  } else if (kind === 'fruit') {
    shelf(-120);
    shelf(-78);
    for (let x = x0 + 8; x < x1 - 20; x += 22) {
      c.fillStyle = ['#8a6a30', '#d6c080', '#4a6a2a', '#a04a2a'][Math.floor(rg() * 4)];
      c.fillRect(x, -146, 17, 26);
      c.fillStyle = '#d6c080';
      c.fillRect(x + 3, -140, 11, 7);
    }
    // crates out front, heaped
    const prod = [['#f08a1c', 4.4], ['#d0321e', 4], ['#f0d83a', 4.2], ['#4a8a2a', 3.6], ['#8a2a4a', 3.2], ['#c8481e', 4.2]];
    for (let i = 0; i < 5; i++) {
      const bx = x0 + 6 + i * ((iw - 40) / 4.4);
      c.fillStyle = '#8a6a3a';
      c.fillRect(bx, -22, 44, 20);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      for (let s = 0; s < 3; s++) c.fillRect(bx, -19 + s * 6, 44, 1.4);
      const [pc, pr] = prod[i % prod.length];
      for (let q = 0; q < 14; q++) {
        c.fillStyle = shadeHex(pc, 0.85 + rg() * 0.3);
        c.beginPath();
        c.arc(bx + 5 + (q % 7) * 5.6 + rg() * 2, -24 - Math.floor(q / 7) * 6 + (q % 2) * 2, pr, 0, TAU);
        c.fill();
      }
      // a second crate stacked on some
      if (i % 2 === 0) {
        c.fillStyle = '#9a7a44';
        c.fillRect(bx + 2, -44, 40, 20);
        for (let q = 0; q < 12; q++) {
          c.fillStyle = shadeHex(prod[(i + 2) % prod.length][0], 0.85 + rg() * 0.3);
          c.beginPath();
          c.arc(bx + 7 + (q % 6) * 6, -46 - Math.floor(q / 6) * 5, 3.8, 0, TAU);
          c.fill();
        }
      }
    }
    // a hand-lettered price board
    c.fillStyle = '#2a2a2a';
    c.fillRect(x1 - 38, -96, 30, 22);
    c.fillStyle = '#f0f0e0';
    c.font = `10px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('٥٠ ل.س', x1 - 23, -81);
  } else if (kind === 'electronics') {
    for (const [i, tw] of [60, 46, 54, 40].entries()) {
      const tx = x0 + 10 + i * (iw / 4.2);
      const ty = -128 + (i % 2) * 44;
      c.fillStyle = '#0c0c10';
      c.fillRect(tx, ty, tw, tw * 0.6);
      c.fillStyle = '#1a1a22';
      c.fillRect(tx + 3, ty + 3, tw - 6, tw * 0.6 - 6);
      glowRect(tx + 3, ty + 3, tw - 6, tw * 0.6 - 6, ['rgba(90,170,240,0.8)', 'rgba(240,170,70,0.7)', 'rgba(110,220,150,0.7)', 'rgba(200,110,230,0.65)'][i]);
    }
    shelf(-92);
    shelf(-46);
    // phones in the case, boxes stacked
    for (let x = x0 + 8; x < x1 - 40; x += 13) {
      c.fillStyle = '#1a1a1e';
      c.fillRect(x, -62, 8, 15);
      glowRect(x + 1, -61, 6, 6, 'rgba(120,190,255,0.5)');
    }
    for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#f0f0e8', '#d84a2a', '#2a6ad8'][i % 3];
      c.fillRect(x1 - 70 + (i % 3) * 22, -22 - Math.floor(i / 3) * 18, 20, 16);
    }
    glowRect(x0, top, iw, 8, 'rgba(180,220,255,0.45)');
  } else if (kind === 'pharmacy') {
    for (const sy of [-132, -98, -64]) {
      shelf(sy, '#b4bcb8');
      for (let x = x0 + 6; x < x1 - 14; x += 14) {
        c.fillStyle = ['#ffffff', '#cfe6f4', '#cfeccf', '#f4e4cf'][Math.floor(rg() * 4)];
        c.fillRect(x, sy - 20, 11, 20);
        c.fillStyle = ['#2a7ab8', '#2a9a5a', '#c0402a'][Math.floor(rg() * 3)];
        c.fillRect(x, sy - 12, 11, 4);
      }
    }
    c.fillStyle = '#e4e8e6';
    c.fillRect(x0, -40, iw, 36);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(x0, -40, iw, 3);
    glowRect(x0, top, iw, iw > 0 ? 160 : 0, 'rgba(240,250,245,0.22)');
  } else if (kind === 'books') {
    for (const sy of [-140, -108, -76, -44]) {
      shelf(sy);
      let x = x0 + 4;
      while (x < x1 - 8) {
        const bw = 5 + rg() * 7;
        const bh = 16 + rg() * 14;
        c.fillStyle = ['#7a2e2e', '#2e5a7a', '#8a7a3a', '#3a6a4a', '#6a4a7a', '#a05a2a', '#d8cfb4', '#2a2a30'][Math.floor(rg() * 8)];
        c.fillRect(x, sy - bh, bw, bh);
        x += bw + 0.6;
      }
    }
    c.fillStyle = '#d9a63a';
    c.fillRect(x0 + iw * 0.45, -22, 40, 18);
    c.fillStyle = '#efe8d4';
    c.fillRect(x0 + iw * 0.45 + 3, -26, 34, 6);
    glowRect(x0, top, iw, 8, 'rgba(255,220,160,0.4)');
  } else if (kind === 'spices') {
    const sp = [['#c23a1a', 'paprika'], ['#e0a010'], ['#8a5a2a'], ['#8a2a3a'], ['#5a8a3a'], ['#d8c8a0'], ['#a04a1a']];
    for (let i = 0; i < 6; i++) {
      const bx = x0 + 8 + i * ((iw - 20) / 6);
      c.fillStyle = '#b89a62';
      c.beginPath();
      c.moveTo(bx, -4);
      c.lineTo(bx + 28, -4);
      c.lineTo(bx + 26, -34);
      c.lineTo(bx + 2, -34);
      c.closePath();
      c.fill();
      c.fillStyle = sp[i % sp.length][0];
      c.beginPath();
      c.ellipse(bx + 14, -35, 13, 9, 0, Math.PI, TAU);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.16)';
      for (let s = 0; s < 3; s++) c.fillRect(bx + 3, -26 + s * 8, 22, 1.2);
    }
    shelf(-124);
    shelf(-82);
    for (let x = x0 + 8; x < x1 - 14; x += 18) {
      c.fillStyle = sp[Math.floor(rg() * sp.length)][0];
      c.fillRect(x, -108, 13, 24);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(x + 1, -106, 3, 20);
    }
    // strings of dried red peppers hanging from the lintel
    for (const hx of [x0 + 24, x0 + iw * 0.5, x1 - 30]) {
      c.strokeStyle = '#5a4a2a';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(hx, top);
      c.lineTo(hx, top + 56);
      c.stroke();
      for (let i = 0; i < 7; i++) {
        c.fillStyle = '#b02a1a';
        c.beginPath();
        c.ellipse(hx + (i % 2 ? 3 : -3), top + 8 + i * 7, 3, 5.5, 0, 0, TAU);
        c.fill();
      }
    }
  } else if (kind === 'jewel') {
    c.fillStyle = '#d8c070';
    for (const bx of [x0 + iw * 0.25, x0 + iw * 0.5, x0 + iw * 0.75]) {
      c.fillStyle = '#4a3a30';
      c.beginPath();
      c.arc(bx, -96, 12, 0, TAU);
      c.fill();
      c.fillRect(bx - 8, -88, 16, 30);
      c.strokeStyle = '#f2d060';
      c.lineWidth = 2.2;
      c.beginPath();
      c.arc(bx, -92, 14, 0.2, Math.PI - 0.2);
      c.stroke();
      c.beginPath();
      c.arc(bx, -88, 10, 0.3, Math.PI - 0.3);
      c.stroke();
    }
    c.fillStyle = 'rgba(190,225,235,0.28)';
    c.fillRect(x0, -50, iw, 46);
    for (let x = x0 + 8; x < x1 - 8; x += 12) {
      c.fillStyle = '#f2d060';
      c.fillRect(x, -36, 8, 3);
      c.fillStyle = '#fff6c0';
      c.fillRect(x + 2, -34, 2, 2);
    }
    for (let i = 0; i < 28; i++) glowRect(x0 + 8 + rg() * (iw - 16), -150 + rg() * 140, 2, 2, 'rgba(255,230,140,0.9)');
    glowRect(x0, top, iw, 9, 'rgba(255,220,150,0.5)');
  } else if (kind === 'juice') {
    // a pyramid of oranges and pomegranates, the juicer, glasses in a row
    for (let row = 0; row < 5; row++) {
      for (let q = 0; q < 6 - row; q++) {
        c.fillStyle = row % 2 ? '#c0302a' : '#f08a1c';
        c.beginPath();
        c.arc(x0 + 20 + row * 7 + q * 14, -50 - row * 11, 7, 0, TAU);
        c.fill();
      }
    }
    c.fillStyle = '#c8ccd0';
    c.fillRect(x1 - 52, -78, 36, 38);
    c.fillStyle = '#e04a2a';
    c.fillRect(x1 - 46, -60, 24, 14);
    shelf(-102);
    for (let x = x0 + 8; x < x1 - 14; x += 14) {
      c.fillStyle = 'rgba(210,235,240,0.7)';
      c.fillRect(x, -122, 9, 20);
      c.fillStyle = ['#f08a1c', '#c0302a', '#e8d84a'][Math.floor(rg() * 3)];
      c.fillRect(x + 1, -112, 7, 10);
    }
    c.fillStyle = '#e8e0cc';
    c.fillRect(x0, -22, iw, 18);
    glowRect(x0, top, iw, 10, 'rgba(255,220,160,0.4)');
  }
  // the roller shutter's housing above the opening
  c.fillStyle = '#8a8c8a';
  c.fillRect(x0 - 4, top - 6, iw + 8, 8);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = top - 4; y < top + 2; y += 3) c.fillRect(x0 - 4, y, iw + 8, 0.8);
  // warm light spilling out of the open front
  const sg = gl.createLinearGradient(0, top, 0, bot);
  sg.addColorStop(0, kind === 'electronics' ? 'rgba(160,200,255,0.12)' : 'rgba(255,200,130,0.1)');
  sg.addColorStop(1, 'rgba(255,200,130,0.28)');
  gl.fillStyle = sg;
  gl.fillRect(x0, top, iw, bot - top);
}

// A shop with its flats above: the facade and its glow, baked together.
function shopFacade(spec, idx) {
  const { w, floors } = spec;
  const H = shopH(spec);
  const PAD = 34;
  const TOP = 70; // roof clutter above the parapet
  const key = 'dam-shop-' + idx;
  const mk = (suffix, drawFn) => bake(key + suffix, w + PAD * 2, H + TOP + 20, 1, (c) => {
    c.translate(PAD, H + TOP);
    drawFn(c);
  });
  // (the albedo and its light are drawn from one pass: the second canvas is
  // made by replaying the same seeded draw into its own context)
  const run = (c, gl) => {
    const rg = rng(idx * 77 + 5);
    const wall = spec.wall;
    // the wall, its thickness, its parapet cornice
    extrudeRect(c, 0, -H, w, H, 22, { color: wall });
    c.fillStyle = wall;
    c.fillRect(0, -H, w, H);
    c.save();
    c.beginPath();
    c.rect(0, -H, w, H);
    c.clip();
    textureWall(c, 'plaster', { seed: 1 + (idx % 3) });
    // sun-bleached high up, dirtier near the pavement; vertical streaks
    const bl = c.createLinearGradient(0, -H, 0, 0);
    bl.addColorStop(0, 'rgba(255,248,232,0.16)');
    bl.addColorStop(0.7, 'rgba(255,248,232,0)');
    bl.addColorStop(1, 'rgba(70,50,30,0.2)');
    c.fillStyle = bl;
    c.fillRect(0, -H, w, H);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = 'rgba(80,60,40,0.06)';
      c.fillRect(rg() * w, -H, 2 + rg() * 8, H);
    }
    // the ground floor: dressed stone pilasters either side, cornice above
    c.fillStyle = shadeHex(wall, 0.92);
    c.fillRect(0, -FACADE_Y0, w, FACADE_Y0);
    for (const px of [0, w - 16]) {
      c.fillStyle = shadeHex(wall, 0.84);
      c.fillRect(px, -FACADE_Y0, 16, FACADE_Y0);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = -FACADE_Y0; y < 0; y += 22) c.fillRect(px, y, 16, 1.2);
    }
    c.restore();
    // shop opening and what's in it
    goods(c, gl, spec.kind, w, rg);
    // the fascia sign
    c.fillStyle = spec.sc;
    c.fillRect(8, -FACADE_Y0 + 4, w - 16, 28);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.2;
    c.strokeRect(11, -FACADE_Y0 + 7, w - 22, 22);
    c.fillStyle = spec.tc;
    c.textAlign = 'center';
    c.direction = 'rtl';
    let fs = 22;
    c.font = `${fs}px ${AR}`;
    while (c.measureText(spec.sign).width > w - 40 && fs > 12) {
      fs -= 1;
      c.font = `${fs}px ${AR}`;
    }
    c.fillText(spec.sign, w / 2, -FACADE_Y0 + 25);
    // the same sign, lit
    gl.fillStyle = spec.sc;
    gl.globalAlpha = 0.6;
    gl.fillRect(8, -FACADE_Y0 + 4, w - 16, 28);
    gl.globalAlpha = 1;
    gl.fillStyle = spec.tc;
    gl.textAlign = 'center';
    gl.direction = 'rtl';
    gl.font = `${fs}px ${AR}`;
    gl.shadowColor = spec.tc;
    gl.shadowBlur = 8;
    gl.fillText(spec.sign, w / 2, -FACADE_Y0 + 25);
    gl.shadowBlur = 0;
    if (spec.kind === 'pharmacy') {
      // the green cross, lit
      for (const [cc, ox] of [[c, 0], [gl, 0]]) {
        cc.fillStyle = cc === gl ? 'rgba(80,255,150,0.85)' : '#2ad070';
        cc.fillRect(w - 52 + ox, -FACADE_Y0 - 36, 12, 34);
        cc.fillRect(w - 63 + ox, -FACADE_Y0 - 25, 34, 12);
      }
    }
    // cornice between floors, balconies, windows
    let balconyDone = false;
    for (let f = 0; f <= floors; f++) {
      const fy = -(FACADE_Y0 + f * FLOOR_H);
      c.fillStyle = shadeHex(wall, 0.8);
      c.fillRect(-4, fy - 4, w + 8, 8);
      c.fillStyle = 'rgba(255,248,225,0.4)';
      c.fillRect(-4, fy - 4, w + 8, 1.5);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(-4, fy + 4, w + 8, 3);
      if (f === floors) break;
      const cols = Math.max(2, Math.round(w / 82));
      for (let k = 0; k < cols; k++) {
        const wx = ((k + 0.5) * w) / cols - 17;
        const wy = fy - 96;
        const kind = rg();
        // the opening, its deep reveal, a stone sill
        c.fillStyle = '#26201a';
        c.fillRect(wx, wy, 34, 66);
        if (kind < 0.35) {
          // glass: the sky in it, a curtain half drawn
          const sg = c.createLinearGradient(wx, wy, wx + 34, wy + 66);
          sg.addColorStop(0, '#bcd8ec');
          sg.addColorStop(1, '#f2d8a8');
          c.fillStyle = sg;
          c.fillRect(wx + 2, wy + 2, 30, 62);
          c.fillStyle = ['#d8c8a8', '#c07a6a', '#7a9ab0'][Math.floor(rg() * 3)];
          c.fillRect(wx + 2, wy + 2, 8 + rg() * 10, 62);
        } else if (kind < 0.7) {
          // wooden shutters, slats open, a lamp inside
          c.fillStyle = ['#4a7a4a', '#7a5a38', '#3a5a7a'][Math.floor(rg() * 3)];
          c.fillRect(wx, wy, 17, 66);
          c.fillRect(wx + 17, wy, 17, 66);
          c.fillStyle = 'rgba(0,0,0,0.25)';
          for (let y = wy + 3; y < wy + 64; y += 5) {
            c.fillRect(wx, y, 17, 1.4);
            c.fillRect(wx + 17, y, 17, 1.4);
          }
        } else {
          // an open window, a lit room, a plant on the sill
          c.fillStyle = '#6a4a30';
          c.fillRect(wx + 2, wy + 2, 30, 62);
          c.fillStyle = '#e8b868';
          c.fillRect(wx + 4, wy + 4, 26, 58);
          gl.fillStyle = 'rgba(255,190,110,0.28)';
          gl.fillRect(wx + 4, wy + 4, 26, 58);
          c.fillStyle = '#5a8a3a';
          c.beginPath();
          c.arc(wx + 24, wy + 58, 6, 0, TAU);
          c.fill();
        }
        c.fillStyle = shadeHex(wall, 1.06);
        c.fillRect(wx - 4, wy + 66, 42, 4);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(wx - 4, wy + 70, 42, 3);
        // lintel arch shade
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(wx, wy, 34, 5);
        // an air-conditioner on a bracket on some
        if (rg() < 0.18) {
          c.fillStyle = '#d8d4c8';
          c.fillRect(wx + 36, wy + 36, 26, 20);
          c.fillStyle = 'rgba(0,0,0,0.3)';
          for (let i = 0; i < 4; i++) c.fillRect(wx + 39, wy + 40 + i * 4, 20, 1.2);
        }
      }
      // a balcony with wrought iron, plants, a line of washing
      if (!balconyDone && f >= 1 && rg() < 0.7) {
        balconyDone = true;
        const bx = w * (0.15 + rg() * 0.4);
        const bw = w * 0.34;
        extrudeRect(c, bx, fy - 8, bw, 8, 12, { color: wall });
        c.fillStyle = shadeHex(wall, 0.9);
        c.fillRect(bx, fy - 8, bw, 8);
        c.strokeStyle = '#2a2622';
        c.lineWidth = 1.6;
        c.strokeRect(bx + 2, fy - 44, bw - 4, 36);
        for (let i = bx + 10; i < bx + bw - 4; i += 9) {
          c.beginPath();
          c.moveTo(i, fy - 44);
          c.lineTo(i, fy - 8);
          c.stroke();
        }
        for (let i = 0; i < 3; i++) {
          const px = bx + 12 + i * ((bw - 24) / 2);
          c.fillStyle = '#9a5a3a';
          c.fillRect(px - 5, fy - 20, 10, 12);
          c.fillStyle = ['#5a8a3a', '#6aa04a', '#7aa84a'][i];
          c.beginPath();
          c.arc(px, fy - 24, 8, 0, TAU);
          c.arc(px - 5, fy - 30, 5, 0, TAU);
          c.arc(px + 5, fy - 31, 5, 0, TAU);
          c.fill();
        }
        if (rg() < 0.6) {
          c.strokeStyle = '#2a2420';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(bx, fy - 62);
          c.lineTo(bx + bw, fy - 66);
          c.stroke();
          const cols = ['#e8e0d0', '#6a8aa8', '#c8584a', '#e8c850'];
          for (let i = 0; i < 4; i++) {
            c.fillStyle = cols[i];
            const lx = bx + 8 + i * (bw / 4.2);
            c.fillRect(lx, fy - 64 + i * 0.5, 14, 22);
          }
        }
      }
    }
    // the parapet and roof: water tank, dish, the aerial
    const roofY = -H;
    c.fillStyle = shadeHex(wall, 0.78);
    c.fillRect(-6, roofY - 8, w + 12, 12);
    c.fillStyle = 'rgba(255,248,225,0.45)';
    c.fillRect(-6, roofY - 8, w + 12, 1.5);
    const rr = rg();
    if (rr < 0.5) {
      c.fillStyle = '#26262a';
      c.fillRect(w * 0.2 - 22, roofY - 52, 44, 44);
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(w * 0.2 - 18, roofY - 50, 6, 40);
      c.fillStyle = '#4a4a4e';
      c.fillRect(w * 0.2 - 22, roofY - 12, 44, 4);
    }
    c.fillStyle = '#e0dcd0';
    c.beginPath();
    c.ellipse(w * 0.72, roofY - 22, 13, 16, -0.45, -Math.PI / 2, Math.PI / 2);
    c.fill();
    c.fillRect(w * 0.72 - 1.5, roofY - 22, 3, 14);
    c.strokeStyle = '#3a3630';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(w * 0.5, roofY - 8);
    c.lineTo(w * 0.5, roofY - 46);
    c.moveTo(w * 0.5 - 12, roofY - 36);
    c.lineTo(w * 0.5 + 12, roofY - 36);
    c.moveTo(w * 0.5 - 8, roofY - 28);
    c.lineTo(w * 0.5 + 8, roofY - 28);
    c.stroke();
  };
  const alb = mk('-a', (c) => {
    // a throw-away glow context just to satisfy the shared draw
    const dummy = document.createElement('canvas').getContext('2d');
    run(c, dummy);
  });
  const glow = mk('-g', (gl) => {
    const dummy = document.createElement('canvas');
    dummy.width = 4;
    dummy.height = 4;
    run(dummy.getContext('2d'), gl);
  });
  return { alb, glow, w, H, PAD, TOP };
}

// ---- the café -------------------------------------------------------------
function cafeFacade() {
  const W = CAFE_W;
  const H = 380;
  const PAD = 40;
  const TOP = 60;
  const ox = CAFE_X - 300; // world x of the facade's left edge
  const wall = '#e9d2a8';
  const win = CAFE_WINDOW;
  const draw = (c, gl) => {
    c.save();
    c.translate(PAD - 0, H + TOP);
    gl.save();
    gl.translate(PAD, H + TOP);
    const wx = win.x - ox; // window, in facade coordinates
    const wy = win.y;
    const ww = win.w;
    const wh = win.h;
    const rg = rng(404);
    extrudeRect(c, 0, -H, W, H, 24, { color: wall });
    c.fillStyle = wall;
    c.fillRect(0, -H, W, H);
    c.save();
    c.beginPath();
    c.rect(0, -H, W, H);
    c.clip();
    textureWall(c, 'plaster', { seed: 2 });
    const bl = c.createLinearGradient(0, -H, 0, 0);
    bl.addColorStop(0, 'rgba(255,248,232,0.16)');
    bl.addColorStop(1, 'rgba(70,50,30,0.16)');
    c.fillStyle = bl;
    c.fillRect(0, -H, W, H);
    c.restore();
    // a stone plinth the glass stands on, tiled in green and cream
    c.fillStyle = '#6a8a7a';
    c.fillRect(0, -66, W, 66);
    c.fillStyle = '#e8e0c8';
    for (let x = 0; x < W; x += 28) for (let y = -66; y < 0; y += 28) if (((x + y) / 28) % 2 === 0) c.fillRect(x + 8, y + 8, 12, 12);
    c.fillStyle = '#4a6a5a';
    c.fillRect(0, -68, W, 3);
    // the interior behind the glass: back wall, shelves of glasses, the espresso machine
    c.fillStyle = '#3a2418';
    c.fillRect(wx, wy, ww, wh);
    const bg = c.createLinearGradient(wx, wy, wx, wy + wh);
    bg.addColorStop(0, '#9a6a3c');
    bg.addColorStop(1, '#c69458');
    c.fillStyle = bg;
    c.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
    // the floor inside, a little below the sill: tiles
    c.fillStyle = '#6a3e28';
    c.fillRect(wx + 4, wy + wh - 22, ww - 8, 18);
    c.fillStyle = 'rgba(255,230,180,0.3)';
    for (let x = wx + 4; x < wx + ww - 8; x += 26) c.fillRect(x, wy + wh - 22, 12, 18);
    // shelves along the back wall, glasses and tin pots catching the light
    for (const sy of [wy + 36, wy + 70]) {
      c.fillStyle = '#3a2418';
      c.fillRect(wx + 8, sy, ww - 16, 4);
      for (let x = wx + 14; x < wx + ww - 24; x += 12 + rg() * 8) {
        c.fillStyle = rg() < 0.5 ? 'rgba(240,235,215,0.85)' : '#c8a060';
        c.fillRect(x, sy - 14, 6 + rg() * 3, 14);
      }
    }
    // the machine
    c.fillStyle = '#b8b4a8';
    c.fillRect(wx + ww - 82, wy + 62, 62, 40);
    c.fillStyle = '#e8e4d8';
    c.fillRect(wx + ww - 82, wy + 62, 62, 6);
    c.fillStyle = '#2a2a2a';
    c.fillRect(wx + ww - 70, wy + 82, 6, 12);
    c.fillRect(wx + ww - 52, wy + 82, 6, 12);
    // a framed photograph of the old city, a menu board in chalk
    c.fillStyle = '#4a2e1c';
    c.fillRect(wx + 30, wy + 10, 52, 40);
    c.fillStyle = '#d8c090';
    c.fillRect(wx + 34, wy + 14, 44, 32);
    c.fillStyle = '#8a6a4a';
    c.beginPath();
    c.arc(wx + 56, wy + 34, 12, Math.PI, 0);
    c.fill();
    c.fillRect(wx + 44, wy + 34, 24, 10);
    c.fillStyle = '#2a3a30';
    c.fillRect(wx + 120, wy + 8, 70, 40);
    c.fillStyle = 'rgba(240,240,225,0.85)';
    c.font = `11px ${NASKH}`;
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText('قهوة · شاي · نرجيلة', wx + 155, wy + 24);
    c.fillText('عصير ليمون', wx + 155, wy + 38);
    // the table and its two chairs: a round marble top, a pedestal
    const tx = CAFE_X + 50 - ox;
    const ty = -72;
    c.fillStyle = '#3a2a22';
    c.fillRect(tx - 3, ty, 6, 72);
    c.fillRect(tx - 18, -4, 36, 4);
    extrudeRect(c, tx - 36, ty - 4, 72, 5, 8, { color: '#d8d0c0' });
    c.fillStyle = '#e8e2d2';
    c.fillRect(tx - 36, ty - 4, 72, 5);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(tx - 36, ty - 4, 72, 1.2);
    // two small coffee cups and a sugar bowl, a glass of water
    c.fillStyle = '#f0ede4';
    for (const cxp of [tx - 22, tx + 6]) {
      c.fillRect(cxp, ty - 14, 11, 9);
      c.fillStyle = '#3a2418';
      c.fillRect(cxp + 1.5, ty - 14, 8, 2);
      c.fillStyle = '#f0ede4';
      c.fillRect(cxp - 2, ty - 5, 15, 2);
    }
    c.fillStyle = '#c8d8d8';
    c.fillRect(tx + 22, ty - 18, 7, 14);
    c.fillStyle = '#f0ede4';
    c.fillRect(tx - 6, ty - 15, 10, 10);
    c.fillStyle = '#d9a63a';
    c.fillRect(tx - 6, ty - 17, 10, 2);
    for (const [sx, dir] of [[CAFE_X - 11 - ox, 1], [CAFE_X + 111 - ox, -1]]) {
      // bentwood chair, its back behind the sitter
      c.fillStyle = '#3a2418';
      c.fillRect(sx - 17, -42, 34, 4);
      c.fillRect(sx - 15, -38, 3, 38);
      c.fillRect(sx + 12, -38, 3, 38);
      c.fillRect(sx - dir * 17 - 1.5, -86, 3, 46);
      c.beginPath();
      c.arc(sx - dir * 16, -86, 7, 0, TAU);
      c.strokeStyle = '#3a2418';
      c.lineWidth = 2;
      c.stroke();
    }
    // the window's frame: slim, dark aluminium, a lit pane
    c.strokeStyle = '#2a2e32';
    c.lineWidth = 6;
    c.strokeRect(wx, wy, ww, wh);
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(wx + 2, wy + 12);
    c.lineTo(wx + ww - 2, wy + 12);
    c.stroke();
    // the glass door to the left, a brass handle
    const dx = -210 + 300;
    c.fillStyle = '#22262a';
    c.fillRect(dx - 4, -196, 68, 196);
    c.fillStyle = '#c8885a';
    c.fillRect(dx, -192, 60, 192);
    const dg = c.createLinearGradient(dx, -192, dx + 60, 0);
    dg.addColorStop(0, '#d8c090');
    dg.addColorStop(1, '#a87a50');
    c.fillStyle = dg;
    c.fillRect(dx + 4, -188, 52, 150);
    c.fillStyle = '#3a2a1a';
    c.fillRect(dx + 4, -34, 52, 34);
    c.fillStyle = '#d9b44a';
    c.fillRect(dx + 48, -100, 3, 24);
    // upper floor: three windows with louvred shutters, flowers on the sills
    const f2 = -260;
    c.fillStyle = shadeHex(wall, 0.8);
    c.fillRect(-4, f2 - 4, W + 8, 8);
    c.fillStyle = 'rgba(255,248,225,0.4)';
    c.fillRect(-4, f2 - 4, W + 8, 1.5);
    for (let k = 0; k < 4; k++) {
      const fx = 60 + k * 150;
      c.fillStyle = '#2a2018';
      c.fillRect(fx, f2 - 112, 46, 78);
      c.fillStyle = k % 2 ? '#4a7a4a' : '#7a5a38';
      c.fillRect(fx, f2 - 112, 23, 78);
      c.fillRect(fx + 23, f2 - 112, 23, 78);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = f2 - 108; y < f2 - 38; y += 6) {
        c.fillRect(fx, y, 23, 1.4);
        c.fillRect(fx + 23, y, 23, 1.4);
      }
      c.fillStyle = shadeHex(wall, 1.06);
      c.fillRect(fx - 5, f2 - 34, 56, 5);
      for (let q = 0; q < 4; q++) {
        c.fillStyle = ['#d8486a', '#e8c040', '#d86a2a', '#f0f0e8'][q];
        c.beginPath();
        c.arc(fx + 6 + q * 11, f2 - 40, 4, 0, TAU);
        c.fill();
      }
    }
    // the parapet, tank, a dish
    c.fillStyle = shadeHex(wall, 0.78);
    c.fillRect(-6, -H - 8, W + 12, 12);
    c.fillStyle = 'rgba(255,248,225,0.45)';
    c.fillRect(-6, -H - 8, W + 12, 1.5);
    c.fillStyle = '#26262a';
    c.fillRect(W * 0.62, -H - 50, 44, 42);
    c.fillStyle = '#e0dcd0';
    c.beginPath();
    c.ellipse(W * 0.2, -H - 20, 13, 16, -0.45, -Math.PI / 2, Math.PI / 2);
    c.fill();
    // ---- light: the sign, the pendant lamps, the interior ----
    // the fascia sign: a deep green box, jasmine-white lettering, lit
    for (const cc of [c, gl]) {
      cc.save();
      cc.fillStyle = cc === gl ? 'rgba(20,110,70,0.65)' : '#16543a';
      cc.fillRect(wx + 30, -256, 280, 30);
      cc.strokeStyle = 'rgba(255,255,255,0.5)';
      cc.lineWidth = 1.4;
      cc.strokeRect(wx + 34, -252, 272, 22);
      cc.fillStyle = cc === gl ? 'rgba(255,250,225,0.95)' : '#fff8dc';
      cc.font = `22px ${AR}`;
      cc.textAlign = 'center';
      cc.direction = 'rtl';
      if (cc === gl) {
        cc.shadowColor = 'rgba(255,240,180,0.9)';
        cc.shadowBlur = 10;
      }
      cc.fillText('مقهى الياسمين', wx + 170, -233);
      cc.restore();
    }
    // interior glow: warm, through the glass
    const ig = gl.createLinearGradient(wx, wy, wx, wy + wh);
    ig.addColorStop(0, 'rgba(255,196,110,0.5)');
    ig.addColorStop(1, 'rgba(255,170,90,0.42)');
    gl.fillStyle = ig;
    gl.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
    for (const lx of [wx + 70, wx + 170, wx + 270]) {
      // pendant lamps
      c.strokeStyle = '#2a2018';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(lx, wy + 4);
      c.lineTo(lx, wy + 22);
      c.stroke();
      c.fillStyle = '#d8a850';
      c.beginPath();
      c.arc(lx, wy + 28, 8, Math.PI, 0);
      c.fill();
      const rg2 = gl.createRadialGradient(lx, wy + 30, 0, lx, wy + 30, 60);
      rg2.addColorStop(0, 'rgba(255,220,150,0.8)');
      rg2.addColorStop(1, 'rgba(255,190,100,0)');
      gl.fillStyle = rg2;
      gl.fillRect(lx - 60, wy - 30, 120, 120);
    }
    // the door's glass and a bracket lamp by it
    gl.fillStyle = 'rgba(255,200,130,0.25)';
    gl.fillRect(dx + 4, -188, 52, 150);
    gl.restore();
    c.restore();
  };
  const alb = bake('dam-cafe-a', W + PAD * 2, H + TOP + 20, 1, (c) => {
    const d2 = document.createElement('canvas');
    d2.width = 4;
    d2.height = 4;
    c.save();
    draw(c, d2.getContext('2d'));
    c.restore();
  });
  const glow = bake('dam-cafe-g', W + PAD * 2, H + TOP + 20, 1, (gl) => {
    const d2 = document.createElement('canvas');
    d2.width = W + PAD * 2;
    d2.height = H + TOP + 20;
    draw(d2.getContext('2d'), gl);
  });
  return { alb, glow, W, H, PAD, TOP, ox };
}

// ---- trees ------------------------------------------------------------------
function treeCanvas(seed) {
  return bake('dam-tree-' + seed, 340, 400, 0.9, (c) => {
    c.translate(170, 390);
    const rg = rng(seed * 31);
    // trunk, forking into limbs
    extrudeRect(c, -11, -170, 22, 170, 8, { color: '#6a5038' });
    c.fillStyle = '#6a5038';
    c.beginPath();
    c.moveTo(-11, 0);
    c.lineTo(-9, -150);
    c.lineTo(-50, -230);
    c.lineTo(-40, -236);
    c.lineTo(-4, -190);
    c.lineTo(8, -240);
    c.lineTo(18, -236);
    c.lineTo(9, -150);
    c.lineTo(12, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,240,200,0.18)';
    c.fillRect(-11, -170, 3, 170);
    // whitewashed to the knee, as city trees are
    c.fillStyle = '#e8e2d2';
    c.fillRect(-11, -48, 22, 48);
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(2, -48, 9, 48);
    // the canopy: layered clumps, the lit tops warm
    const greens = ['#3a6a26', '#4a7e30', '#5e9438', '#2e5a22'];
    const clumps = [];
    for (let i = 0; i < 38; i++) {
      const a = rg() * TAU;
      const rr = Math.sqrt(rg());
      clumps.push([Math.cos(a) * 128 * rr, -270 + Math.sin(a) * 84 * rr, 26 + rg() * 24]);
    }
    for (const [x, y, r] of clumps) {
      c.fillStyle = shadeHex(greens[Math.floor(rg() * 4)], 0.62);
      c.beginPath();
      c.arc(x + 4, y + 7, r, 0, TAU);
      c.fill();
    }
    for (const [x, y, r] of clumps) {
      c.fillStyle = greens[Math.floor(rg() * 4)];
      c.beginPath();
      c.arc(x, y, r * 0.88, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(210,235,120,0.28)';
      c.beginPath();
      c.arc(x - r * 0.25, y - r * 0.3, r * 0.5, 0, TAU);
      c.fill();
    }
    // a few oranges: this is Damascus
    for (let i = 0; i < 8; i++) {
      const [x, y] = clumps[Math.floor(rg() * clumps.length)];
      c.fillStyle = '#f08a1c';
      c.beginPath();
      c.arc(x + (rg() - 0.5) * 20, y + 10 + rg() * 14, 4.5, 0, TAU);
      c.fill();
    }
  });
}

// ---- cars and the bus -----------------------------------------------------
function car(c, x, yb, dir, col, t, taxi) {
  c.save();
  c.translate(x, yb);
  c.scale(dir, 1);
  const body = [[-215, -26], [-218, -62], [-196, -74], [-130, -80], [-92, -128], [-30, -141], [48, -141], [98, -122], [128, -80], [196, -70], [216, -52], [214, -28]];
  extrudePoly(c, body, 16, { color: col });
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(...body[0]);
  for (const p of body.slice(1)) c.lineTo(...p);
  c.closePath();
  c.fill();
  // glass
  const gg = c.createLinearGradient(-90, -140, 100, -80);
  gg.addColorStop(0, '#9ec4d8');
  gg.addColorStop(1, '#5a7a8a');
  c.fillStyle = gg;
  c.beginPath();
  c.moveTo(-84, -82);
  c.lineTo(-52, -128);
  c.lineTo(-20, -133);
  c.lineTo(-20, -82);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-10, -82);
  c.lineTo(-10, -133);
  c.lineTo(46, -133);
  c.lineTo(88, -82);
  c.closePath();
  c.fill();
  c.fillStyle = shadeHex(col, 0.7);
  c.fillRect(-16, -138, 5, 58);
  // sills, door line, handle, bumpers
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(-196, -36, 392, 5);
  c.fillRect(-14, -80, 1.5, 46);
  c.fillStyle = shadeHex(col, 1.3);
  c.fillRect(-36, -70, 14, 3);
  c.fillStyle = '#2a2a2e';
  c.fillRect(-222, -34, 10, 8);
  c.fillRect(208, -34, 10, 8);
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(-190, -70, 380, 1.6);
  // lamps
  c.fillStyle = '#f8f0d0';
  c.fillRect(196, -66, 18, 9);
  c.fillStyle = '#c02a2a';
  c.fillRect(-220, -66, 6, 12);
  if (taxi) {
    c.fillStyle = '#f0f0e8';
    c.fillRect(-18, -150, 40, 10);
    c.fillStyle = '#222';
    c.font = '8px sans-serif';
    c.textAlign = 'center';
    c.fillText('TAXI', 2, -142);
    c.fillStyle = '#2a2a2a';
    for (let i = -190; i < 190; i += 20) c.fillRect(i, -52, 10, 8);
  }
  // wheels
  for (const wx of [-132, 132]) {
    c.fillStyle = '#18181a';
    c.beginPath();
    c.arc(wx, -29, 30, 0, TAU);
    c.fill();
    c.fillStyle = '#b8bcc0';
    c.beginPath();
    c.arc(wx, -29, 16, 0, TAU);
    c.fill();
    c.strokeStyle = '#6a6e72';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = t * 12 + (i / 5) * TAU;
      c.moveTo(wx, -29);
      c.lineTo(wx + Math.cos(a) * 14, -29 + Math.sin(a) * 14);
    }
    c.stroke();
  }
  c.restore();
}

function bus(c, x, yb, dir, t) {
  c.save();
  c.translate(x, yb);
  c.scale(dir, 1);
  const L = 520;
  const Ht = 300;
  extrudeRect(c, -L, -Ht, 2 * L, Ht - 22, 18, { color: '#e8e4d8' });
  c.fillStyle = '#ece8dc';
  c.fillRect(-L, -Ht, 2 * L, Ht - 22);
  // the green band along the flank, and the roof's edge
  c.fillStyle = '#2e8a4a';
  c.fillRect(-L, -92, 2 * L, 40);
  c.fillStyle = '#e8c63a';
  c.fillRect(-L, -52, 2 * L, 6);
  c.fillStyle = '#d4d0c4';
  c.fillRect(-L, -Ht, 2 * L, 12);
  // the windows, with the people in them as shapes
  const wg = c.createLinearGradient(0, -Ht + 30, 0, -112);
  wg.addColorStop(0, '#9ec4d8');
  wg.addColorStop(1, '#4a6a7a');
  for (let k = 0; k < 8; k++) {
    const wx = -L + 56 + k * 120;
    c.fillStyle = wg;
    c.fillRect(wx, -Ht + 34, 104, 106);
    c.fillStyle = 'rgba(30,26,24,0.8)';
    const q = rng(k * 5 + 1);
    if (q() < 0.8) {
      c.beginPath();
      c.arc(wx + 32 + q() * 30, -128, 12, 0, TAU);
      c.fill();
      c.fillRect(wx + 18 + q() * 30, -116, 28, 26);
    }
    if (q() < 0.5) {
      c.beginPath();
      c.arc(wx + 80, -132, 11, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.moveTo(wx + 10, -Ht + 34);
    c.lineTo(wx + 46, -Ht + 34);
    c.lineTo(wx + 16, -112);
    c.lineTo(wx + 4, -112);
    c.fill();
  }
  // front: the destination board, the lamps; the door
  c.fillStyle = '#12161a';
  c.fillRect(L - 112, -Ht + 10, 92, 20);
  c.fillStyle = '#ffb030';
  c.font = `13px ${NASKH}`;
  c.textAlign = 'center';
  c.direction = 'rtl';
  c.fillText('باب توما — المزة', L - 66, -Ht + 25);
  c.fillStyle = '#2a2e32';
  c.fillRect(L - 270, -Ht + 34, 8, 150);
  c.fillRect(L - 262, -Ht + 34, 60, 150);
  c.fillStyle = 'rgba(158,196,216,0.8)';
  c.fillRect(L - 258, -Ht + 40, 24, 140);
  c.fillRect(L - 230, -Ht + 40, 24, 140);
  c.fillStyle = '#f8f0d0';
  c.fillRect(L - 8, -90, 8, 14);
  c.fillStyle = '#c02a2a';
  c.fillRect(-L, -90, 6, 14);
  // wheels, dual at the back
  for (const wx of [-L + 150, -L + 220, L - 170]) {
    c.fillStyle = '#16161a';
    c.beginPath();
    c.arc(wx, -48, 50, 0, TAU);
    c.fill();
    c.fillStyle = '#b8bcc0';
    c.beginPath();
    c.arc(wx, -48, 26, 0, TAU);
    c.fill();
    c.strokeStyle = '#6a6e72';
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = t * 7 + (i / 6) * TAU;
      c.moveTo(wx, -48);
      c.lineTo(wx + Math.cos(a) * 24, -48 + Math.sin(a) * 24);
    }
    c.stroke();
  }
  c.restore();
}

// where the traffic is at time t: [x, lane base y, dir, kind, colour]
function traffic(t) {
  const out = [];
  const span = 4600;
  const wrap = (v) => ((v % span) + span) % span;
  // the bus: every thirty-odd seconds, rightwards, on the near lane
  out.push({ kind: 'bus', x: DC - 2300 + wrap(t * 150 + 2200), y: 64, dir: 1 });
  const cars = [
    { sp: 120, off: 400, y: 50, dir: 1, col: '#e8c020', taxi: true },
    { sp: 96, off: 2600, y: 50, dir: 1, col: '#c8ccd0' },
    { sp: 140, off: 1300, y: 66, dir: -1, col: '#3a5a9a' },
    { sp: 110, off: 3600, y: 66, dir: -1, col: '#e8e4dc' },
    { sp: 128, off: 2000, y: 50, dir: -1, col: '#e8c020', taxi: true },
  ];
  for (const q of cars) {
    const p = wrap(t * q.sp + q.off);
    out.push({ kind: 'car', x: q.dir > 0 ? DC - 2300 + p : DC + 2300 - p, y: q.y, dir: q.dir, col: q.col, taxi: q.taxi });
  }
  return out;
}

// ---- street furniture -------------------------------------------------------
function lamp(c, x, flick) {
  c.fillStyle = '#3a3a3e';
  c.fillRect(x - 4, -300, 8, 300);
  c.fillRect(x - 9, -10, 18, 10);
  c.beginPath();
  c.moveTo(x - 3, -300);
  c.quadraticCurveTo(x - 3, -332, x + 30, -330);
  c.lineTo(x + 52, -328);
  c.lineTo(x + 52, -322);
  c.lineTo(x + 30, -324);
  c.quadraticCurveTo(x + 4, -324, x + 4, -300);
  c.fill();
  c.fillStyle = '#4a4a50';
  c.fillRect(x + 44, -326, 22, 8);
  c.fillStyle = flick ? '#fff2c0' : '#d8d8d0';
  c.fillRect(x + 48, -319, 14, 3);
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.fillRect(x - 4, -300, 2, 300);
}

function falafelStand(c, t) {
  const x = FALAFEL.x;
  const cx0 = FALAFEL.counter[0];
  const cw = FALAFEL.counter[1] - FALAFEL.counter[0];
  // striped umbrella over the whole stand
  c.fillStyle = '#6a5a48';
  c.fillRect(cx0 + cw / 2 - 3, -196, 6, 196);
  c.beginPath();
  c.moveTo(cx0 - 34, -168);
  c.quadraticCurveTo(cx0 + cw / 2, -236, cx0 + cw + 34, -168);
  c.closePath();
  const stripes = 9;
  for (let i = 0; i < stripes; i++) {
    c.fillStyle = i % 2 ? '#f3e6c8' : '#c0392b';
    c.beginPath();
    const a0 = cx0 - 34 + (i * (cw + 68)) / stripes;
    const a1 = cx0 - 34 + ((i + 1) * (cw + 68)) / stripes;
    c.moveTo(a0, -168);
    c.quadraticCurveTo((a0 + cx0 + cw / 2) / 2, -214, cx0 + cw / 2, -228);
    c.quadraticCurveTo((a1 + cx0 + cw / 2) / 2, -214, a1, -168);
    c.closePath();
    c.fill();
  }
  // the cart: tiled flanks, a glass case, a fryer, a board of prices
  extrudeRect(c, cx0, -96, cw, 92, 16, { color: '#3e6a9a' });
  c.fillStyle = '#3e6a9a';
  c.fillRect(cx0, -96, cw, 92);
  c.fillStyle = 'rgba(255,255,255,0.2)';
  for (let ix = cx0 + 4; ix < cx0 + cw - 8; ix += 20) for (let iy = -90; iy < -10; iy += 20) c.fillRect(ix, iy, 16, 16);
  c.fillStyle = '#c8ccd0';
  c.fillRect(cx0 - 4, -100, cw + 8, 6);
  // case with falafel
  c.fillStyle = 'rgba(200,230,240,0.55)';
  c.fillRect(cx0 + 8, -140, 66, 40);
  c.fillStyle = '#c8872a';
  for (let i = 0; i < 12; i++) {
    c.beginPath();
    c.arc(cx0 + 18 + (i % 6) * 9.5, -108 - Math.floor(i / 6) * 9, 4.4, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#e8d8a8';
  c.fillRect(cx0 + 12, -138, 56, 5);
  // fryer pan
  c.fillStyle = '#2a2a2e';
  c.beginPath();
  c.ellipse(cx0 + cw - 30, -104, 24, 6, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#c8872a';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.arc(cx0 + cw - 44 + i * 8, -105 + Math.sin(t * 3 + i) * 1.2, 3.6, 0, TAU);
    c.fill();
  }
  // price board
  c.fillStyle = '#20242a';
  c.fillRect(cx0 + 84, -150, 54, 40);
  c.fillStyle = '#f0f0e0';
  c.font = `13px ${NASKH}`;
  c.textAlign = 'center';
  c.direction = 'rtl';
  c.fillText('فلافل ساخن', cx0 + 111, -132);
  c.fillText('٢٥ ل.س', cx0 + 111, -116);
  // wheels
  c.fillStyle = '#18181a';
  for (const wx of [cx0 + 14, cx0 + cw - 14]) {
    c.beginPath();
    c.arc(wx, -14, 14, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#e8c63a';
  c.fillRect(x - 6, -2, 0, 0);
}

// the contraction toward the café, applied to a context before drawing
function fold(c, k, accordion = 0, px = 0) {
  if (k <= 0) return;
  const e = k * k * (3 - 2 * k);
  c.translate(CAFE_X, 0);
  c.scale(lerp(1, 0.07, e), lerp(1, 0.55, e));
  c.translate(-CAFE_X, 0);
  if (accordion) {
    // each building tilts alternately, like the pages of a folded paper
    c.translate(px, 0);
    c.transform(1, accordion * 0.28 * Math.sin(e * Math.PI), 0, 1, 0, 0);
    c.translate(-px, 0);
  }
}

export function drawDamascus(R, g, { fold: fk = 0, t = g.time } = {}) {
  const k = clamp(fk);
  const cam = R.cam.x;
  const e = k * k * (3 - 2 * k);
  const dim = smooth(0.08, 0.85, k);
  const moonK = smooth(0.45, 1, k);
  const sceneA = 1 - smooth(0.74, 0.97, k);
  const wallA = smooth(0.5, 0.95, k);
  const near = (x0, x1) => k > 0.02 || (x1 > cam - 1700 && x0 < cam + 1700);

  // ---- sky and far city --------------------------------------------------
  const sd = [mh('#8ab6e0', '#06101e', moonK), mh('#f5d49a', '#14203a', moonK), mh('#ffcf8a', '#2c3a58', moonK)];
  const sd2 = [mh(sd[0], '#4a4a6a', dim * 0.5 * (1 - moonK)), mh(sd[1], '#8a6a6a', dim * 0.5 * (1 - moonK)), mh(sd[2], '#a07058', dim * 0.5 * (1 - moonK))];
  R.sky((c) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, R.H * 0.8);
    gr.addColorStop(0, sd2[0]);
    gr.addColorStop(0.55, sd2[1]);
    gr.addColorStop(1, sd2[2]);
    c.fillStyle = gr;
    c.fillRect(0, 0, R.W, R.H);
    const sa = 1 - dim;
    if (sa > 0.02) {
      const sx = R.W * 0.12;
      const sy = R.H * 0.28;
      const gl = c.createRadialGradient(sx, sy, 0, sx, sy, R.W * 0.5);
      gl.addColorStop(0, `rgba(255,236,190,${0.6 * sa})`);
      gl.addColorStop(0.25, `rgba(255,208,140,${0.25 * sa})`);
      gl.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = gl;
      c.fillRect(0, 0, R.W, R.H);
    }
    for (let i = 0; i < 6; i++) {
      const cxp = ((i * 0.27 + 0.1 + t * 0.0025 + cam * 0.00002) % 1.3) * R.W - R.W * 0.15;
      c.fillStyle = `rgba(255,228,180,${0.28 * (1 - moonK)})`;
      c.beginPath();
      c.ellipse(cxp, R.H * (0.1 + (i % 4) * 0.08), R.W * 0.09, R.H * 0.02, 0, 0, TAU);
      c.fill();
    }
    if (moonK > 0.02) {
      const sr = rng(8);
      for (let i = 0; i < 60; i++) {
        c.fillStyle = `rgba(220,230,255,${moonK * (0.2 + sr() * 0.6)})`;
        c.fillRect(sr() * R.W, sr() * R.H * 0.45, 1.4, 1.4);
      }
      const mx = R.W * 0.18;
      const my = R.H * 0.16;
      const mg = c.createRadialGradient(mx, my, 0, mx, my, R.W * 0.2);
      mg.addColorStop(0, `rgba(190,210,255,${0.45 * moonK})`);
      mg.addColorStop(1, 'rgba(150,180,255,0)');
      c.fillStyle = mg;
      c.fillRect(0, 0, R.W, R.H);
      c.fillStyle = `rgba(240,244,255,${0.95 * moonK})`;
      c.beginPath();
      c.arc(mx, my, R.W * 0.014, 0, TAU);
      c.fill();
    }
    c.restore();
  });
  // Qasioun, white with its flats climbing the slope; the old city's domes;
  // by the end, the same line in ruin and dark
  const mtn = mh(mh('#cbb09c', '#6a5a66', dim * 0.6), '#121a2c', moonK);
  const old = mh(mh('#dcc29c', '#7a5a58', dim * 0.6), '#0e1626', moonK);
  R.layer(0.12);
  R.paint((c) => {
    const x0 = cam * 0.12 - 2200;
    c.fillStyle = mtn;
    c.beginPath();
    c.moveTo(x0, 400);
    for (let x = x0; x <= x0 + 4400; x += 60) {
      const kk = (x + 20000) * 0.0009;
      c.lineTo(x, -170 - 100 * Math.sin(kk) - 46 * Math.sin(kk * 2.3 + 1) - 18 * noise1(x * 0.02));
    }
    c.lineTo(x0 + 4400, 400);
    c.closePath();
    c.fill();
    // flats on the slope
    c.fillStyle = mh(mtn, '#ffffff', 0.18 * (1 - moonK));
    const q = rng(33);
    for (let i = 0; i < 90; i++) c.fillRect(x0 + q() * 4400, -120 - q() * 70, 5 + q() * 8, 4 + q() * 6);
  });
  R.layer(0.26);
  R.paint((c) => {
    const x0 = Math.floor((cam * 0.26 - 1900) / 80) * 80;
    c.fillStyle = old;
    for (let x = x0; x < x0 + 3900; x += 80) {
      const q = rng(Math.floor(x / 80) + 2400);
      const bh = 40 + q() * 90;
      const bw = 56 + q() * 40;
      c.beginPath();
      c.moveTo(x, 20);
      c.lineTo(x, -bh);
      if (moonK > 0.3 && q() < 0.4) {
        c.lineTo(x + bw * 0.4, -bh + 8);
        c.lineTo(x + bw * 0.6, -bh * 0.6);
      }
      c.lineTo(x + bw, -bh);
      c.lineTo(x + bw, 20);
      c.fill();
      if (q() < 0.2) {
        c.beginPath();
        c.arc(x + bw / 2, -bh, 15, Math.PI, 0);
        c.fill();
      }
      if (q() < 0.12) c.fillRect(x + bw / 2 - 2, -bh - 80, 5, 80);
    }
    c.fillRect(x0, 18, 3900, 400);
  });
  R.glow((c) => {
    const a = 0.22 * (1 - dim);
    if (a > 0.01) {
      const hg = c.createLinearGradient(0, -140, 0, 20);
      hg.addColorStop(0, 'rgba(255,215,150,0)');
      hg.addColorStop(1, `rgba(255,215,150,${a})`);
      c.fillStyle = hg;
      c.fillRect(cam * 0.26 - 1950, -140, 3900, 160);
    }
  });
  R.layer(1);

  // ---- the ground: road, pavement; contracts with the rest -----------------
  const baseRoad = mh('#6a6460', '#2e2f33', moonK);
  const basePave = mh('#b8a68a', '#4a4a4e', moonK);
  R.paint((c) => {
    // base ground that never contracts, so the folding street leaves the
    // night's road behind it
    c.fillStyle = mh(basePave, '#3c3c40', e);
    c.fillRect(cam - 1700, -4, 3400, 12);
    c.fillStyle = mh(baseRoad, '#2a2b2e', e);
    c.fillRect(cam - 1700, 8, 3400, 520);
  });
  if (sceneA > 0.01) {
    R.paint((c) => {
      c.save();
      c.globalAlpha = sceneA;
      fold(c, k);
      const x0 = cam - 1700 - (k > 0 ? 3000 : 0);
      const x1 = cam + 1700 + (k > 0 ? 3000 : 0);
      c.fillStyle = mh('#c2ac88', '#4a4a4e', moonK);
      c.fillRect(x0, -4, x1 - x0, 8);
      // paving slabs
      c.fillStyle = 'rgba(70,50,30,0.3)';
      for (let x = Math.floor(x0 / 52) * 52; x < x1; x += 52) c.fillRect(x, -4, 1.4, 8);
      // the kerb, lit on its top edge
      c.fillStyle = mh('#d8ccb4', '#6a6a70', moonK);
      c.fillRect(x0, 3, x1 - x0, 5);
      c.fillStyle = 'rgba(255,250,235,0.35)';
      c.fillRect(x0, 3, x1 - x0, 1.2);
      // the road: asphalt, a worn dashed line down its middle
      c.fillStyle = baseRoad;
      c.fillRect(x0, 8, x1 - x0, 500);
      const rd = c.createLinearGradient(0, 8, 0, 90);
      rd.addColorStop(0, 'rgba(0,0,0,0.2)');
      rd.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rd;
      c.fillRect(x0, 8, x1 - x0, 82);
      c.fillStyle = 'rgba(240,232,200,0.55)';
      for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) c.fillRect(x, 57, 64, 3);
      c.restore();
    });
    R.surface((c) => c.rect(Math.max(cam - 1600, DC - 1700), 8, 3200, 500), 'asphalt', { scale: 1.1, seed: 2, alpha: 0.4 * sceneA * (1 - e) });
  }

  // ---- the buildings -------------------------------------------------------
  if (sceneA > 0.01) {
    SHOPS.forEach((s, i) => {
      const x = shopX(i);
      if (!near(x, x + s.w)) return;
      const F = shopFacade(s, i);
      R.paint((c) => {
        c.save();
        c.globalAlpha = sceneA;
        // accordion fold: buildings tip in alternate directions about their near edge
        fold(c, k, i % 2 ? -1 : 1, x + (x < CAFE_X ? s.w : 0));
        c.drawImage(F.alb, x - F.PAD, -F.H - F.TOP, F.w + F.PAD * 2, F.H + F.TOP + 20);
        c.restore();
      });
    });
    if (near(CAFE_X0, CAFE_X0 + CAFE_W)) {
      const C = cafeFacade();
      R.paint((c) => {
        c.save();
        c.globalAlpha = sceneA;
        fold(c, k, 1, CAFE_X);
        c.drawImage(C.alb, CAFE_X0 - C.PAD, -C.H - C.TOP, C.W + C.PAD * 2, C.H + C.TOP + 20);
        c.restore();
      });
    }
  }
  // the light in the signs, windows and the café; none of it survives the fold
  if (sceneA > 0.01) {
    R.glow((c) => {
      c.save();
      c.globalAlpha = sceneA * (1 - moonK) * (0.9 + 0.1 * Math.sin(t * 20 + 1) * (k > 0.3 ? 1 : 0.2));
      fold(c, k);
      SHOPS.forEach((s, i) => {
        const x = shopX(i);
        if (!near(x, x + s.w)) return;
        const F = shopFacade(s, i);
        c.drawImage(F.glow, x - F.PAD, -F.H - F.TOP, F.w + F.PAD * 2, F.H + F.TOP + 20);
      });
      const C = cafeFacade();
      c.drawImage(C.glow, CAFE_X0 - C.PAD, -C.H - C.TOP, C.W + C.PAD * 2, C.H + C.TOP + 20);
      c.restore();
    });
  }

  // ---- things in the street (cast: they throw shadows) ---------------------
  if (sceneA > 0.01) {
    // trees along the kerb
    const trees = [DC - 1400, DC - 960, DC - 200, DC + 330, DC + 1250];
    trees.forEach((tx, i) => {
      if (!near(tx - 200, tx + 200)) return;
      const cv = treeCanvas(i + 1);
      R.cast((c) => {
        c.save();
        c.globalAlpha = sceneA;
        fold(c, k);
        c.drawImage(cv, tx - 170, -390, 340, 400);
        c.restore();
      });
      R.shadow(
        (c) => {
          c.fillStyle = 'rgba(0,0,0,0.5)';
          c.fillRect(tx - 10, -170, 20, 170);
          c.beginPath();
          c.ellipse(tx, -270, 120, 70, 0, 0, TAU);
          c.fill();
        },
        tx,
        0,
        SHEAR,
        0.2,
      );
    });
    // street lamps, and cables strung between
    const lamps = [DC - 1180, DC - 700, DC - 40, DC + 440, DC + 1180];
    R.cast((c) => {
      c.save();
      c.globalAlpha = sceneA;
      fold(c, k);
      for (const lx of lamps) if (near(lx - 80, lx + 80)) lamp(c, lx, k > 0.2 && Math.sin(t * 17 + lx) > 0.2);
      c.strokeStyle = 'rgba(30,26,24,0.8)';
      c.lineWidth = 1.2;
      for (let i = 0; i < lamps.length - 1; i++) {
        const a = lamps[i] + 52;
        const b = lamps[i + 1] - 2;
        c.beginPath();
        c.moveTo(a, -328);
        c.quadraticCurveTo((a + b) / 2, -300, b, -330);
        c.stroke();
      }
      c.restore();
    });
    // the falafel stand
    if (near(FALAFEL.x - 100, FALAFEL.x + 200)) {
      R.cast((c) => {
        c.save();
        c.globalAlpha = sceneA;
        fold(c, k);
        falafelStand(c, t);
        c.restore();
      });
      R.shadow(
        (c) => {
          c.fillStyle = 'rgba(0,0,0,0.45)';
          c.fillRect(FALAFEL.counter[0], -100, FALAFEL.counter[1] - FALAFEL.counter[0], 100);
          c.beginPath();
          c.ellipse(FALAFEL.counter[0] + 60, -190, 90, 24, 0, 0, TAU);
          c.fill();
        },
        FALAFEL.counter[0],
        0,
        SHEAR,
        0.2,
      );
      R.glow((c) => {
        c.save();
        c.globalAlpha = sceneA * (1 - moonK);
        fold(c, k);
        // the fryer's heat and steam, a bulb under the umbrella
        const hx = FALAFEL.counter[1] - 30;
        for (let i = 0; i < 7; i++) {
          const ph = (t * 0.4 + i / 7) % 1;
          c.fillStyle = `rgba(255,255,245,${0.16 * (1 - ph)})`;
          c.beginPath();
          c.arc(hx + Math.sin(ph * 5 + i) * 8, -112 - ph * 80, 5 + ph * 12, 0, TAU);
          c.fill();
        }
        const bg = c.createRadialGradient(FALAFEL.counter[0] + 60, -168, 0, FALAFEL.counter[0] + 60, -168, 70);
        bg.addColorStop(0, 'rgba(255,214,140,0.35)');
        bg.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = bg;
        c.fillRect(FALAFEL.counter[0] - 20, -240, 160, 150);
        c.restore();
      });
    }
    // the traffic, in front of the pavement
    for (const v of traffic(t)) {
      const half = v.kind === 'bus' ? 540 : 230;
      if (!near(v.x - half, v.x + half)) continue;
      R.cast((c) => {
        c.save();
        c.globalAlpha = sceneA;
        fold(c, k);
        if (v.kind === 'bus') bus(c, v.x, v.y, v.dir, t);
        else car(c, v.x, v.y, v.dir, v.col, t, v.taxi);
        c.restore();
      });
      R.shadow(
        (c) => {
          c.fillStyle = 'rgba(0,0,0,0.5)';
          const L = v.kind === 'bus' ? 520 : 215;
          c.fillRect(v.x - L, v.y - (v.kind === 'bus' ? 280 : 130), L * 2, v.kind === 'bus' ? 280 : 130);
        },
        v.x,
        v.y,
        SHEAR,
        0.14,
      );
    }
  }

  // ---- the glass: reflections of the street, the light inside -------------
  if (sceneA > 0.01) {
    R.glow((c) => {
      c.save();
      c.globalAlpha = sceneA * (1 - moonK);
      fold(c, k);
      const w = CAFE_WINDOW;
      c.beginPath();
      c.rect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
      c.clip();
      // sky and the opposite buildings, faint on the glass
      const rg = c.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
      rg.addColorStop(0, 'rgba(180,215,255,0.22)');
      rg.addColorStop(0.5, 'rgba(180,215,255,0.04)');
      rg.addColorStop(1, 'rgba(255,230,190,0.12)');
      c.fillStyle = rg;
      c.fillRect(w.x, w.y, w.w, w.h);
      // two slanting streaks of glare
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.moveTo(w.x + 40, w.y);
      c.lineTo(w.x + 90, w.y);
      c.lineTo(w.x + 30, w.y + w.h);
      c.lineTo(w.x - 20, w.y + w.h);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.07)';
      c.beginPath();
      c.moveTo(w.x + 110, w.y);
      c.lineTo(w.x + 124, w.y);
      c.lineTo(w.x + 64, w.y + w.h);
      c.lineTo(w.x + 50, w.y + w.h);
      c.fill();
      c.restore();
    });
    // steam off the two cups; a shaft of afternoon light through the glass
    R.glow((c) => {
      c.save();
      c.globalAlpha = sceneA * (1 - moonK);
      fold(c, k);
      for (const cxp of [CAFE_X + 34, CAFE_X + 62]) {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.5 + i / 6 + cxp * 0.01) % 1;
          c.fillStyle = `rgba(255,250,240,${0.22 * (1 - ph)})`;
          c.beginPath();
          c.arc(cxp + 5 + Math.sin(ph * 6 + i) * 4, -90 - ph * 36, 2 + ph * 6, 0, TAU);
          c.fill();
        }
      }
      const w = CAFE_WINDOW;
      const sh = c.createLinearGradient(w.x, w.y, w.x + 150, w.y + w.h);
      sh.addColorStop(0, 'rgba(255,214,140,0.2)');
      sh.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = sh;
      c.beginPath();
      c.moveTo(w.x + 4, w.y + 4);
      c.lineTo(w.x + 90, w.y + 4);
      c.lineTo(w.x + 230, w.y + w.h - 8);
      c.lineTo(w.x + 120, w.y + w.h - 8);
      c.fill();
      // motes in it
      for (let i = 0; i < 20; i++) {
        const q = rng(i + 300);
        c.fillStyle = `rgba(255,236,190,${0.5 * (0.5 + 0.5 * Math.sin(t * 1.4 + i))})`;
        c.fillRect(w.x + 20 + q() * 250 + Math.sin(t * 0.4 + i) * 6, w.y + 16 + q() * 120 - ((t * 5 + i * 9) % 20), 1.5, 1.5);
      }
      c.restore();
    });
  }

  // ---- the wall it becomes -------------------------------------------------
  if (wallA > 0.01) {
    const wx0 = CAFE_X - 720;
    const ww = 1440;
    const grow = lerp(0.9, 1, wallA);
    R.cast((c) => {
      c.save();
      c.globalAlpha = wallA;
      c.translate(CAFE_X, 0);
      c.scale(grow, 1);
      c.translate(-CAFE_X, 0);
      const wc = '#6c6e72';
      extrudeRect(c, wx0, -560, ww, 560, 30, { color: wc });
      c.fillStyle = wc;
      c.fillRect(wx0, -560, ww, 560);
      // shuttered-out plaster panels, scarred
      const q = rng(515);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 40; i++) c.fillRect(wx0 + q() * ww, -560 + q() * 560, 30 + q() * 90, 14 + q() * 50);
      c.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 0; i < 40; i++) c.fillRect(wx0 + q() * ww, -560 + q() * 560, 30 + q() * 90, 14 + q() * 50);
      // the window, filled in with grey block-work: a different grain, a seam
      const w = CAFE_WINDOW;
      c.fillStyle = '#54565a';
      c.fillRect(w.x, w.y, w.w, w.h);
      c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.lineWidth = 1.2;
      for (let y = w.y; y < w.y + w.h; y += 16) {
        c.beginPath();
        c.moveTo(w.x, y);
        c.lineTo(w.x + w.w, y);
        c.stroke();
        for (let x = w.x + ((y / 16) % 2 ? 12 : 0); x < w.x + w.w; x += 34) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 16);
          c.stroke();
        }
      }
      c.strokeStyle = '#2a2c2e';
      c.lineWidth = 5;
      c.strokeRect(w.x, w.y, w.w, w.h);
      // the plinth of tile at the foot, half of it gone
      c.fillStyle = '#3e4a46';
      c.fillRect(wx0, -66, ww, 66);
      c.fillStyle = 'rgba(210,214,200,0.2)';
      for (let x = wx0; x < wx0 + ww; x += 28) for (let y = -66; y < 0; y += 28) if (((x + y) / 28) % 2 === 0 && q() < 0.7) c.fillRect(x + 8, y + 8, 12, 12);
      // a shell hole high on the right, rebar bent out of it
      const hx = CAFE_X + 330;
      const hy = -300;
      c.fillStyle = '#121214';
      c.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const rr = 56 * (0.7 + q() * 0.5);
        const px = hx + Math.cos(a) * rr;
        const py = hy + Math.sin(a) * rr * 0.85;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.fill();
      c.fillStyle = 'rgba(120,118,112,0.5)';
      c.beginPath();
      c.arc(hx, hy, 76, 0, TAU);
      c.arc(hx, hy, 58, 0, TAU, true);
      c.fill();
      c.strokeStyle = '#4a3b2e';
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(hx + (q() - 0.5) * 60, hy + (q() - 0.5) * 40);
        c.quadraticCurveTo(hx + (q() - 0.5) * 100, hy + 20, hx + (q() - 0.5) * 130, hy + 50 + q() * 40);
        c.stroke();
      }
      // scorching above, bullet pocks in clusters, cracks
      const sg = c.createLinearGradient(0, hy - 60, 0, hy - 220);
      sg.addColorStop(0, 'rgba(10,10,12,0.45)');
      sg.addColorStop(1, 'rgba(10,10,12,0)');
      c.fillStyle = sg;
      c.beginPath();
      c.ellipse(hx, hy - 120, 70, 120, 0, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(20,20,24,0.65)';
      for (let cl = 0; cl < 6; cl++) {
        const px = wx0 + 60 + q() * (ww - 120);
        const py = -60 - q() * 380;
        for (let i = 0; i < 16; i++) {
          c.beginPath();
          c.arc(px + (q() - 0.5) * 80, py + (q() - 0.5) * 60, 1.6 + q() * 2.2, 0, TAU);
          c.fill();
        }
      }
      c.strokeStyle = 'rgba(14,14,16,0.7)';
      c.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        let px = wx0 + 80 + q() * (ww - 160);
        let py = -520 + q() * 80;
        c.beginPath();
        c.moveTo(px, py);
        for (let s = 0; s < 8; s++) {
          px += (q() - 0.5) * 30;
          py += 24 + q() * 34;
          c.lineTo(px, py);
        }
        c.stroke();
      }
      c.restore();
    });
    R.surface((c) => c.rect(wx0, -560, ww, 560), 'concrete', { scale: 1.2, seed: 5, alpha: 0.8 * wallA });
    // rubble heaped at its foot
    R.cast((c) => {
      for (const [hxp, hw, hh, sd] of [[CAFE_X - 640, 160, 34, 3], [CAFE_X + 480, 200, 40, 4], [CAFE_X - 40, 120, 18, 5]]) heap(c, hxp, 4, hw, hh, sd, wallA, '#76736d');
    });
  }
}

export function damascusLook(g, foldK = 0) {
  const k = clamp(foldK);
  const dim = smooth(0.08, 0.85, k);
  const moonK = smooth(0.45, 1, k);
  const t = g.time || 0;
  const keyUv = [lerp(-0.4, -0.2, moonK), lerp(-0.1, -0.5, moonK)];
  const sunCol = mixc([1.0, 0.76, 0.46], [0.92, 0.55, 0.36], dim);
  const keyCol = mixc(sunCol, [0.6, 0.72, 1.0], moonK);
  const lights = [
    { uv: keyUv, color: keyCol, intensity: lerp(lerp(1.5, 0.8, dim), 0.8, moonK), radius: 0, project: 1.04, soft: 0.003, rim: lerp(1.2, 0.8, moonK) },
    // the café's glow thrown out onto the people at its glass
    { x: CAFE_X + 50, y: -130, color: [1.0, 0.7, 0.38], intensity: 0.9 * (1 - smooth(0.2, 0.7, k)), radius: 0.3, rim: 0.5 },
    { uv: [1.25, 0.4], color: [1.0, 0.66, 0.34], intensity: 0.3 * (1 - dim), radius: 0, rim: 0.3 },
  ];
  const torch = g.torchLight?.();
  if (torch && k > 0.8) lights.push(torch);
  return dreamy(g, {
    ambient: mixc(mixc([0.4, 0.33, 0.28], [0.22, 0.19, 0.22], dim), [0.06, 0.075, 0.12], moonK),
    lights,
    god: { uv: keyUv, strength: lerp(0.3, 0.05, dim) },
    groundShadow: lerp(0.6, 0.9, moonK),
    bloom: lerp(1.15, 0.7, dim),
    exposure: lerp(1.05, 0.96, dim),
    grain: 0.06,
    grade: {
      sat: lerp(1.2, 0.55, smooth(0.35, 0.95, k)),
      contrast: lerp(0.98, 1.1, dim),
      lift: 0.012 * (1 - dim),
      tint: mixc([1.1, 0.99, 0.85], [0.93, 0.99, 1.07], moonK),
      shadows: mixc([1.0, 0.9, 1.0], [0.82, 0.92, 1.16], moonK),
      highs: mixc([1.07, 1.0, 0.88], [1.04, 1.04, 1.0], moonK),
    },
    // road dust hanging in the golden air, then the cold mist of the night street
    fog: { density: lerp(0.07, 0.12, dim), height: 130, color: mixc([0.9, 0.7, 0.45], [0.3, 0.38, 0.54], moonK) },
  });
}
