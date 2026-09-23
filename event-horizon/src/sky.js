// Backdrops hung behind the black hole: a calibration grid, or any image the
// viewer drops in, so they can watch their own picture bend into an
// Einstein ring.

import * as THREE from 'three';

export function makeGridTexture() {
  const w = 1600;
  const h = 1000;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');

  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#16233f');
  bg.addColorStop(0.5, '#2a1830');
  bg.addColorStop(1, '#3b2414');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // Checker tint so each cell is individually traceable through the lens.
  const cell = 50;
  for (let y = 0; y < h / cell; y++) {
    for (let x = 0; x < w / cell; x++) {
      if ((x + y) % 2) continue;
      g.fillStyle = 'rgba(255,255,255,0.045)';
      g.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  g.lineWidth = 2;
  for (let x = 0; x <= w; x += cell) {
    g.strokeStyle = x % (cell * 4) === 0 ? 'rgba(143,176,255,0.85)' : 'rgba(143,176,255,0.3)';
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y <= h; y += cell) {
    g.strokeStyle = y % (cell * 4) === 0 ? 'rgba(255,180,90,0.85)' : 'rgba(255,180,90,0.3)';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }

  g.fillStyle = '#ece6da';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'italic 500 150px "Bodoni Moda", Didot, Georgia, serif';
  g.fillText('Event Horizon', w / 2, h / 2 - 170);
  g.font = '500 44px "IBM Plex Mono", ui-monospace, monospace';
  g.fillText('EVERY LINE HERE IS STRAIGHT', w / 2, h / 2 + 190);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: w / h };
}

export function loadImageTexture(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('That file isn’t an image. Try a JPEG, PNG or WebP.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      resolve({ texture: tex, aspect: img.naturalWidth / img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image couldn’t be read. Try a JPEG, PNG or WebP.'));
    };
    img.src = url;
  });
}
