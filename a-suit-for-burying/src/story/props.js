// Small hand props, drawn in world space at a person's hands.

export function hammer(c, x, y, ang) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = '#3a2a1a';
  c.fillRect(-2, -4, 4, 34);
  c.fillStyle = '#1a1a1c';
  c.fillRect(-9, 26, 18, 8);
  c.restore();
}

// Ada's shawl, folded around the pistol. open: 0 bundled … 1 unwrapped.
export function bundle(c, x, y, open = 0) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#4b2330';
  c.beginPath();
  c.ellipse(0, 0, 20 + open * 16, 11 - open * 4, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#6b3a44';
  c.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(i * 5 * (1 + open), 9 - open * 3);
    c.lineTo(i * 5 * (1 + open) + 1, 15);
    c.stroke();
  }
  if (open > 0.4) pistol(c, 0, -4, 0, open);
  c.restore();
}

export function pistol(c, x, y, ang = 0, alpha = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.globalAlpha *= alpha;
  c.fillStyle = '#16161a';
  c.fillRect(-4, -3, 26, 5); // barrel
  c.fillRect(-6, -5, 10, 9); // cylinder
  c.beginPath();
  c.moveTo(-6, 3);
  c.lineTo(-14, 14);
  c.lineTo(-8, 16);
  c.lineTo(-1, 4);
  c.fill(); // grip
  c.restore();
}

export function hatOnGround(c, x, y) {
  c.fillStyle = '#121215';
  c.beginPath();
  c.ellipse(x, y - 2, 19, 3.5, 0.1, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(x - 10, y - 3);
  c.lineTo(x - 8, y - 14);
  c.quadraticCurveTo(x + 1, y - 18, x + 9, y - 13);
  c.lineTo(x + 11, y - 3);
  c.fill();
}

export function paper(c, x, y, ang = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = '#cbbd98';
  c.fillRect(-9, -12, 18, 24);
  c.restore();
}

export function match(c, x, y) {
  c.fillStyle = '#2a1e14';
  c.fillRect(x - 1, y, 2, 12);
}
