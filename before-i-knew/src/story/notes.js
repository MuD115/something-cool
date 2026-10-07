// Small things in the streets that can be looked at: each is drawn where it
// is and has what Sami makes of it (first person, Damascus dialect, English
// beneath). addNotes() puts them in an act's level; drawNotes() draws them,
// from the act's drawProps hook.

const TAU = Math.PI * 2;

// a wall calendar on a door, its page stopped
function calendar(c, x, y) {
  c.fillStyle = '#e8e2d2';
  c.fillRect(x - 16, y - 22, 32, 40);
  c.fillStyle = '#a8322a';
  c.fillRect(x - 16, y - 22, 32, 9);
  c.fillStyle = 'rgba(40,30,24,0.55)';
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) c.fillRect(x - 13 + k * 4.6, y - 9 + r * 6, 2.4, 2.4);
  c.fillStyle = '#3a2e26';
  c.fillRect(x - 1, y - 25, 2, 4);
}

// a child's sandal, the strap mended with wire
function sandal(c, x, y) {
  c.fillStyle = '#6a4a32';
  c.beginPath();
  c.ellipse(x, y - 2, 13, 3.5, -0.05, 0, TAU);
  c.fill();
  c.strokeStyle = '#2e6a8a';
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(x - 2, y - 4, 6, Math.PI, TAU);
  c.stroke();
  c.strokeStyle = '#8a8e92';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - 5, y - 9);
  c.lineTo(x + 2, y - 6);
  c.stroke();
}

// the aid list pinned to a board, names crossed out
function aidList(c, x, y) {
  c.fillStyle = '#6a5038';
  c.fillRect(x - 30, y - 40, 60, 74);
  c.fillStyle = '#ece6d4';
  c.fillRect(x - 25, y - 35, 50, 64);
  c.fillStyle = 'rgba(40,34,30,0.7)';
  for (let i = 0; i < 9; i++) {
    c.fillRect(x - 21, y - 29 + i * 6.5, 30 + ((i * 7) % 12), 1.6);
    if (i % 2 === 0) {
      c.fillStyle = 'rgba(160,40,30,0.8)';
      c.fillRect(x - 23, y - 29.4 + i * 6.5, 44, 1.2);
      c.fillStyle = 'rgba(40,34,30,0.7)';
    }
  }
}

// a street sign, shot through
function sign(c, x, y) {
  c.fillStyle = '#2a5a8a';
  c.fillRect(x - 44, y - 12, 88, 26);
  c.strokeStyle = '#e8e8e8';
  c.lineWidth = 1.5;
  c.strokeRect(x - 41, y - 9, 82, 20);
  c.fillStyle = '#f0f0f0';
  c.font = '12px "IBM Plex Sans Arabic", sans-serif';
  c.textAlign = 'center';
  c.direction = 'rtl';
  c.fillText('حارة الياسمين', x, y + 6);
  c.fillStyle = '#16120f';
  for (const [dx, dy] of [[-20, -4], [14, 3], [30, -6]]) {
    c.beginPath();
    c.arc(x + dx, y + dy, 2.2, 0, TAU);
    c.fill();
  }
}

// an empty birdcage on a sill, its door open
function cage(c, x, y, t) {
  const sw = Math.sin(t * 1.4) * 0.04;
  // the chain up to a hook in the wall
  c.strokeStyle = '#4a3e30';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x, y - 40);
  c.lineTo(x, y - 74);
  c.stroke();
  c.fillStyle = '#3a3028';
  c.fillRect(x - 6, y - 78, 12, 4);
  c.save();
  c.translate(x, y - 40);
  c.rotate(sw);
  c.strokeStyle = '#c9b06a';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 6);
  for (let i = -3; i <= 3; i++) {
    c.moveTo(i * 5, 34);
    c.quadraticCurveTo(i * 4.2, 8, 0, 6);
  }
  c.moveTo(-15, 34);
  c.lineTo(15, 34);
  c.stroke();
  // the door, hanging open on its wire
  c.beginPath();
  c.moveTo(15, 34);
  c.lineTo(24, 26);
  c.lineTo(24, 16);
  c.stroke();
  c.restore();
}

// a hopscotch grid chalked on the ground
function hopscotch(c, x, y) {
  c.strokeStyle = 'rgba(236,232,220,0.7)';
  c.lineWidth = 1.6;
  const sq = 18;
  const cells = [[0, 0], [1, 0], [2, -0.5], [2, 0.5], [3, 0], [4, -0.5], [4, 0.5], [5, 0]];
  for (const [i, o] of cells) c.strokeRect(x - 54 + i * sq, y - 3 + o * 5, sq, 5);
  c.fillStyle = 'rgba(236,232,220,0.8)';
  c.fillRect(x - 36, y - 1.5, 4, 2);
}

// a wedding invitation tucked into a doorframe
function invitation(c, x, y) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.12);
  c.fillStyle = '#efe6d2';
  c.fillRect(-11, -16, 22, 30);
  c.strokeStyle = 'rgba(190,150,70,0.8)';
  c.lineWidth = 1;
  c.strokeRect(-9, -14, 18, 26);
  c.fillStyle = 'rgba(190,150,70,0.8)';
  c.beginPath();
  c.arc(0, -6, 3.5, 0, TAU);
  c.fill();
  c.restore();
}

// a mattress propped against a window, against the sniper
function mattress(c, x, y) {
  c.fillStyle = '#8c7a68';
  c.beginPath();
  c.moveTo(x - 50, y);
  c.lineTo(x - 38, y - 190);
  c.lineTo(x + 40, y - 190);
  c.lineTo(x + 52, y);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(60,48,42,0.45)';
  c.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    c.beginPath();
    c.moveTo(x - 50 + i * 1.7, y - i * 27);
    c.lineTo(x + 52 - i * 1.7, y - i * 27);
    c.stroke();
  }
  c.fillStyle = 'rgba(70,46,34,0.3)';
  c.beginPath();
  c.ellipse(x + 8, y - 120, 18, 26, 0.3, 0, TAU);
  c.fill();
}

export const NOTES = {
  act1: [
    { id: 'n_calendar', x: 2905, y: -150, box: [40, 48], draw: calendar, line: ['رزنامة عالباب، واقفة على آذار ٢٠١٣. ما حدا قلب الورقة من وقتها.', 'A calendar on a door, stopped at March 2013. Nobody’s turned the page since.'] },
    { id: 'n_sandal', x: 4320, y: 0, box: [34, 16], draw: sandal, line: ['صندل ولد. السير مربوط بشريط.', 'A child’s sandal. The strap mended with wire.'] },
    { id: 'n_list', x: 6620, y: -150, box: [64, 80], draw: aidList, line: ['لايحة الإعاشة عالحيط. نص الأسامي مشطوبة.', 'The aid list on the wall. Half the names are crossed out.'] },
  ],
  act2r: [{ id: 'n_mattress', x: 880, y: 0, box: [100, 190], draw: mattress, line: ['فرشة مسنودة عالشبّاك، كرمال القنّاص.', 'A mattress propped against a window, against the sniper.'] }],
  act2w: [
    { id: 'n_sign', x: 700, y: -250, box: [92, 30], draw: sign, line: ['لوحة الشارع، مخزوقة. بس بعدها بتقول: حارة الياسمين.', 'The street sign, shot through. It still says Jasmine Lane.'] },
    { id: 'n_cage', x: 3300, y: -96, box: [40, 44], draw: cage, line: ['قفص عصفور عالشبّاك. فاضي، وبابو مفتوح.', 'A birdcage on the windowsill. Empty, its door open.'] },
  ],
  act3w: [{ id: 'n_invite', x: 1010, y: -130, box: [28, 36], draw: invitation, line: ['كرت عرس محشور بالباب. التاريخ: الليلة.', 'A wedding invitation tucked in a doorframe. The date: tonight.'] }],
  act4: [{ id: 'n_hop', x: 330, y: 0, box: [120, 16], draw: hopscotch, line: ['حجلة مرسومة بالطبشور. حدا لعب فيها مبارح.', 'A hopscotch grid chalked on the ground. Someone played it yesterday.'] }],
};

export function addNotes(g, act) {
  for (const n of NOTES[act] || []) {
    g.level.add({
      id: n.id,
      x: n.x,
      y: n.y - n.box[1] / 2,
      range: 110,
      look: true,
      label: ['تفحّص', 'Examine'],
      box: n.box,
      enabled: () => !g.locked && !g.a?.mem,
      use: () => g.line(null, n.line, 4.5, 'examine'),
    });
  }
}

export function drawNotes(R, g, act) {
  const cx = R.cam.x;
  const list = (NOTES[act] || []).filter((n) => Math.abs(n.x - cx) < 1600);
  if (!list.length || g.a?.mem) return;
  R.cast((c) => {
    for (const n of list) n.draw(c, n.x, n.y, g.time);
  });
}
