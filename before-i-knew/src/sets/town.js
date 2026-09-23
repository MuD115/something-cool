// The town: apartment blocks torn open by shelling, rubble, the sniper
// curtain, shops, the school, the corner with the dead olive tree.
// Every function paints through the renderer's layers (paint = lit backdrop,
// cast = lit and shadow-casting, glow = light sources).

import { rng, lerp, noise1 } from '../engine/util.js';
import { smoothPath } from '../rigs/shapes.js';

export const CONCRETE = ['#a99d89', '#9f9480', '#948874', '#ada390', '#91857a', '#a2977f'];

// ------------------------------------------------------------ sky & far --

export function sky(R, stops) {
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

// Distant roofline of the town, flat-topped blocks and a minaret or two.
export function skyline(R, { depth = 0.3, y = 0, color = '#8f8578', seed = 3, haze = null, x0 = -3000, x1 = 16000, minarets = [] }) {
  R.layer(depth);
  const draw = (c) => {
    const r = rng(seed);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0, y + 400);
    let x = x0;
    while (x < x1) {
      const w = 60 + r() * 140;
      const h = 60 + r() * 170;
      const broken = r() < 0.3;
      c.lineTo(x, y - h);
      if (broken) {
        c.lineTo(x + w * 0.4, y - h + 10);
        c.lineTo(x + w * 0.55, y - h * 0.65);
        c.lineTo(x + w * 0.7, y - h * 0.8);
      }
      c.lineTo(x + w, y - h);
      if (r() < 0.2) {
        c.lineTo(x + w, y - h - 14);
        c.lineTo(x + w + 6, y - h - 14);
        c.lineTo(x + w + 6, y - h);
      }
      x += w;
    }
    c.lineTo(x1, y + 400);
    c.closePath();
    c.fill();
    for (const mx of minarets) minaret(c, mx, y - 150, 0.8, color);
  };
  R.paint(draw);
  if (haze) {
    R.glow((c) => {
      c.globalAlpha = haze[1];
      const s = c.fillStyle;
      draw(proxy(c, haze[0]));
      c.fillStyle = s;
    });
  }
  R.layer(1);
}

// Replays a draw function on a context with its fills forced to one colour.
function proxy(c, color) {
  return new Proxy(c, {
    get(target, k) {
      const v = target[k];
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, k, v) {
      target[k] = k === 'fillStyle' || k === 'strokeStyle' ? color : v;
      return true;
    },
  });
}

export function minaret(c, x, y, s = 1, color = '#8f8578', cracked = true) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = color;
  c.fillRect(-12, -150, 24, 150);
  c.fillRect(-18, -120, 36, 8); // balcony
  c.fillRect(-8, -185, 16, 36);
  c.beginPath();
  c.moveTo(-10, -185);
  c.quadraticCurveTo(0, -215, 10, -185);
  c.fill();
  c.fillRect(-1, -228, 2, 16);
  if (cracked) {
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, -170);
    c.lineTo(2, -140);
    c.lineTo(-3, -110);
    c.lineTo(5, -80);
    c.stroke();
  }
  c.restore();
}

// A column of smoke or dust, rising and spreading.
export function plume(R, x, y, t, { depth = 0.3, age = 1, color = [120, 105, 90], height = 500, width = 120, alpha = 0.8 }) {
  if (age <= 0) return;
  R.layer(depth);
  R.paint((c) => {
    const r = rng(17);
    const h = height * Math.min(age, 1);
    // soft puffs: each fades to nothing at its edge, so the column has no rims
    for (let i = 0; i < 34; i++) {
      const k = i / 33;
      const py = y - k * h;
      const px = x + noise1(k * 4 + t * 0.2) * width * 0.4 * k + k * k * 80 + (r() - 0.5) * width * 0.3;
      const pr = (width * 0.45 + k * width * 1.1) * (0.7 + r() * 0.5);
      const shade = 0.75 + 0.35 * (1 - k) + r() * 0.1;
      const a = alpha * 0.55 * (1 - k * 0.6) * Math.min(1, age * 1.5);
      const rgb = `${(color[0] * shade) | 0},${(color[1] * shade) | 0},${(color[2] * shade) | 0}`;
      const grad = c.createRadialGradient(px, py, 0, px, py, pr);
      grad.addColorStop(0, `rgba(${rgb},${a})`);
      grad.addColorStop(0.55, `rgba(${rgb},${a * 0.6})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = grad;
      c.beginPath();
      c.arc(px, py, pr, 0, Math.PI * 2);
      c.fill();
    }
  });
  R.layer(1);
}

// ----------------------------------------------------------- buildings --

// A block of flats, drawn as a façade on the street's far side.
// spec: { x, w, floors, fh, color, seed, torn: 0…1 (corner torn away),
//         holes: [[fx, fy, r]], balcony: [floor, side], laundry, dishes,
//         shutters, graffiti: [text, fx, fy, size, color], sign }
export function block(R, spec, t = 0) {
  const { x, w, floors, fh = 140, color = CONCRETE[0], seed = 1 } = spec;
  const H = floors * fh;
  const top = -H;
  const torn = spec.torn || 0;
  const tornLeft = spec.tornLeft ?? rng(seed + 7)() < 0.5;

  // paint() draws twice (once per layer), so the random stream restarts here
  R.paint((c) => {
    const r = rng(seed);
    c.save();
    // outline with a torn corner
    c.beginPath();
    if (torn > 0) {
      const tw = w * (0.3 + torn * 0.4);
      const th = H * (0.25 + torn * 0.45);
      if (tornLeft) {
        c.moveTo(x, 0);
        c.lineTo(x, top + th);
        const n = 7;
        for (let i = 1; i < n; i++) c.lineTo(x + (tw * i) / n + (r() - 0.5) * 20, top + th - (th * i) / n + (r() - 0.5) * 30);
        c.lineTo(x + tw, top);
        c.lineTo(x + w, top);
        c.lineTo(x + w, 0);
      } else {
        c.moveTo(x, 0);
        c.lineTo(x, top);
        c.lineTo(x + w - tw, top);
        const n = 7;
        for (let i = 1; i < n; i++) c.lineTo(x + w - tw + (tw * i) / n + (r() - 0.5) * 20, top + (th * i) / n + (r() - 0.5) * 30);
        c.lineTo(x + w, top + th);
        c.lineTo(x + w, 0);
      }
    } else {
      c.rect(x, top, w, H);
    }
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.clip();

    // weathering and floor slabs
    c.fillStyle = 'rgba(60,50,40,0.08)';
    for (let i = 0; i < 12; i++) c.fillRect(x + r() * w, top, 2 + r() * 10, H);
    for (let f = 0; f <= floors; f++) {
      c.fillStyle = 'rgba(40,32,26,0.22)';
      c.fillRect(x, -f * fh - 6, w, 8);
    }

    // windows
    const cols = Math.max(2, Math.round(w / 110));
    const ww = Math.min(58, (w / cols) * 0.5);
    const wh = fh * 0.46;
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < cols; k++) {
        const wx = x + ((k + 0.5) * w) / cols - ww / 2;
        const wy = -f * fh - fh * 0.72;
        const kind = r();
        if (f === 0 && spec.shopFront) continue;
        if (kind < 0.12) {
          // blown out: ragged dark hole
          c.fillStyle = '#1b1612';
          c.beginPath();
          const jag = [[wx - 6, wy - 3], [wx + ww * 0.3, wy - 9], [wx + ww * 0.55, wy - 2], [wx + ww + 7, wy - 6], [wx + ww + 3, wy + wh * 0.5], [wx + ww + 8, wy + wh + 6], [wx + ww * 0.5, wy + wh + 3], [wx - 5, wy + wh + 9], [wx - 2, wy + wh * 0.4]];
          c.moveTo(...jag[0]);
          for (const q of jag.slice(1)) c.lineTo(q[0] + (r() - 0.5) * 5, q[1] + (r() - 0.5) * 5);
          c.closePath();
          c.fill();
        } else {
          c.fillStyle = kind < 0.55 ? '#211b17' : '#2b241f';
          c.fillRect(wx, wy, ww, wh);
          c.fillStyle = 'rgba(0,0,0,0.25)';
          c.fillRect(wx - 3, wy + wh, ww + 6, 4); // sill shadow
          if (kind > 0.7) {
            // closed shutter, some slats missing
            c.fillStyle = spec.shutter || '#7a6a55';
            c.fillRect(wx, wy, ww, wh * (0.4 + r() * 0.6));
            c.fillStyle = 'rgba(0,0,0,0.2)';
            for (let s = wy + 4; s < wy + wh * 0.9; s += 6) c.fillRect(wx, s, ww, 1.5);
          } else if (kind > 0.55) {
            // plastic sheet over the window, sagging
            c.fillStyle = 'rgba(180,190,200,0.35)';
            c.beginPath();
            c.moveTo(wx, wy);
            c.lineTo(wx + ww, wy);
            c.lineTo(wx + ww, wy + wh);
            c.quadraticCurveTo(wx + ww / 2, wy + wh - 10, wx, wy + wh);
            c.fill();
          }
        }
      }
    }

    // shell holes with rebar
    for (const [fx, fy, hr] of spec.holes || []) {
      const hx = x + fx * w;
      const hy = top + fy * H;
      c.fillStyle = '#16120f';
      c.beginPath();
      const pts = [];
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const rr = hr * (0.7 + r() * 0.5);
        pts.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.85]);
      }
      c.moveTo(...pts[0]);
      for (const q of pts.slice(1)) c.lineTo(...q);
      c.closePath();
      c.fill();
      // broken render ring around the hole
      c.fillStyle = 'rgba(120,108,92,0.5)';
      c.beginPath();
      c.arc(hx, hy, hr * 1.35, 0, Math.PI * 2);
      c.arc(hx, hy, hr * 1.02, 0, Math.PI * 2, true);
      c.fill();
      c.strokeStyle = '#4a3a2c';
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2;
        c.beginPath();
        c.moveTo(hx + Math.cos(a) * hr * 0.9, hy + Math.sin(a) * hr * 0.8);
        c.quadraticCurveTo(hx + Math.cos(a) * hr * 0.5, hy + Math.sin(a) * hr * 0.4 + 8, hx + Math.cos(a) * hr * 0.2, hy + Math.sin(a) * hr * 0.3 + 18);
        c.stroke();
      }
    }

    // bullet pocks in clusters
    c.fillStyle = 'rgba(40,32,26,0.55)';
    for (let k = 0; k < (spec.pocks ?? 3); k++) {
      const cx = x + r() * w;
      const cy = top + r() * H;
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.arc(cx + (r() - 0.5) * 70, cy + (r() - 0.5) * 50, 1.5 + r() * 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    // exposed interiors where the corner is torn
    if (torn > 0) {
      c.fillStyle = 'rgba(30,24,20,0.0)';
    }

    // graffiti
    for (const [text, gx, gy, size, gc, rot] of spec.graffiti || []) {
      c.save();
      c.translate(x + gx * w, gy);
      c.rotate(rot || -0.03);
      c.font = `${size}px "Aref Ruqaa", "Noto Naskh Arabic", serif`;
      c.fillStyle = gc || 'rgba(40,40,44,0.8)';
      c.textAlign = 'center';
      c.direction = 'rtl';
      c.fillText(text, 0, 0);
      c.restore();
    }
    c.restore();

    // torn edge: slab ends and dangling rebar
    if (torn > 0) {
      c.strokeStyle = '#5a4a3a';
      c.lineWidth = 2;
      for (let f = 1; f < floors; f++) {
        const sy = -f * fh;
        if (sy > top + H * (0.25 + torn * 0.45)) continue;
        const sx = tornLeft ? x + r() * w * 0.4 : x + w - r() * w * 0.4;
        c.fillStyle = color;
        c.fillRect(sx - 30, sy - 8, 60, 10);
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(sx + (i - 2) * 10, sy);
          c.quadraticCurveTo(sx + (i - 2) * 12, sy + 20, sx + (i - 2) * 14 + (r() - 0.5) * 20, sy + 30 + r() * 30);
          c.stroke();
        }
      }
    }
  });

  // balconies and laundry cast shadows onto the façade
  if (spec.balcony) {
    const [fl, side, hang] = spec.balcony;
    const by = -fl * fh - 8;
    const bx = side < 0.5 ? x + w * 0.15 : x + w * 0.55;
    R.cast((c) => {
      c.save();
      c.translate(bx, by);
      c.rotate(hang || 0);
      c.fillStyle = shade(color, 0.85);
      c.fillRect(0, 0, w * 0.3, 10);
      c.strokeStyle = '#3a3230';
      c.lineWidth = 2;
      c.strokeRect(2, -34, w * 0.3 - 4, 34);
      for (let i = 10; i < w * 0.3; i += 10) {
        c.beginPath();
        c.moveTo(i, -34);
        c.lineTo(i, 0);
        c.stroke();
      }
      if (spec.laundry) {
        c.strokeStyle = '#2a2420';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, -40);
        c.lineTo(w * 0.3, -44);
        c.stroke();
        const cols = ['#9a8a70', '#6f7e86', '#b8a79a', '#7a5a50'];
        for (let i = 0; i < 4; i++) {
          const lx = 8 + i * (w * 0.3 - 16) / 4;
          const sway = Math.sin(t * 1.3 + i) * 2;
          c.fillStyle = cols[i];
          c.beginPath();
          c.moveTo(lx, -41 - i);
          c.lineTo(lx + 16, -41 - i);
          c.lineTo(lx + 16 + sway, -14 - i);
          c.lineTo(lx + sway, -12 - i);
          c.fill();
        }
      }
      c.restore();
    });
  }
  if (spec.dishes) {
    R.cast((c) => {
      for (const [fx, fy] of spec.dishes) {
        const dx = x + fx * w;
        const dy = -fy * fh - fh * 0.3;
        c.fillStyle = '#d8d2c6';
        c.beginPath();
        c.ellipse(dx, dy, 14, 16, -0.4, -Math.PI / 2, Math.PI / 2);
        c.fill();
        c.fillRect(dx - 2, dy, 4, 18);
      }
    });
  }
  if (spec.ac) {
    R.cast((c) => {
      for (const [fx, fy] of spec.ac) {
        c.fillStyle = '#cfc8ba';
        c.fillRect(x + fx * w, -fy * fh - fh * 0.35, 38, 26);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 4; i++) c.fillRect(x + fx * w + 4, -fy * fh - fh * 0.35 + 5 + i * 5, 30, 1.5);
      }
    });
  }
}

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, ((n >> 16) & 255) * k) | 0},${Math.min(255, ((n >> 8) & 255) * k) | 0},${Math.min(255, (n & 255) * k) | 0})`;
}

// The street itself: asphalt, a pavement kerb, dust.
export function street(R, x0, x1, { color = '#6e6559', pave = '#8a8072' } = {}) {
  R.paint((c) => {
    c.fillStyle = pave;
    c.fillRect(x0, -4, x1 - x0, 8);
    c.fillStyle = color;
    c.fillRect(x0, 4, x1 - x0, 500);
    const r = rng(8);
    c.fillStyle = 'rgba(40,32,26,0.18)';
    for (let x = x0; x < x1; x += 40) {
      if (r() < 0.35) c.fillRect(x, 10 + r() * 30, 20 + r() * 60, 2);
    }
    // grit and small stones along the kerb
    c.fillStyle = 'rgba(160,150,130,0.6)';
    for (let x = x0; x < x1; x += 12) if (r() < 0.4) c.fillRect(x, 1 + r() * 4, 3, 2);
  });
}

// A heap of broken slabs. Returns nothing; collision is added separately.
export function rubble(R, x, w, h, { seed = 5, color = '#a89b86', rebar = true, cast = true } = {}) {
  const draw = (c) => {
    const r = rng(seed);
    c.fillStyle = color;
    c.beginPath();
    const pts = [[x - 10, 2]];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const k = i / n;
      pts.push([x + k * w + (r() - 0.5) * 16, -h * Math.sin(k * Math.PI) * (0.75 + r() * 0.35)]);
    }
    pts.push([x + w + 10, 2]);
    c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath();
    c.fill();
    // slab edges and chunks
    for (let i = 0; i < 7; i++) {
      const sx = x + r() * w;
      const sy = -r() * h * 0.8;
      c.save();
      c.translate(sx, sy);
      c.rotate((r() - 0.5) * 1.2);
      c.fillStyle = shade(color.startsWith('#') ? color : '#a89b86', 0.75 + r() * 0.35);
      c.fillRect(-20 - r() * 20, -6, 40 + r() * 30, 10 + r() * 6);
      c.restore();
    }
    if (rebar) {
      c.strokeStyle = '#4a3b2e';
      c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const rx = x + r() * w;
        const ry = -h * (0.4 + r() * 0.5);
        c.beginPath();
        c.moveTo(rx, ry);
        c.quadraticCurveTo(rx + (r() - 0.5) * 30, ry - 20, rx + (r() - 0.5) * 50, ry - 30 - r() * 30);
        c.stroke();
      }
    }
  };
  if (cast) R.cast(draw);
  else R.paint(draw);
}

// The sniper curtain: sheets and blankets on a wire across the gap. The
// middle section has sagged where shrapnel cut the wire.
export function sniperCurtain(R, x0, x1, t, { wireY = -250, sagFrom, sagTo, sagY = -148 }) {
  R.cast((c) => {
    c.strokeStyle = '#2a2622';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, wireY);
    c.lineTo(sagFrom, wireY + 6);
    c.quadraticCurveTo((sagFrom + sagTo) / 2, sagY - 30, sagTo, wireY + 6);
    c.lineTo(x1, wireY);
    c.stroke();
    const sheets = [
      [x0, sagFrom, '#d9d2c2', 0],
      [sagFrom, sagTo, '#8e6f5a', 1],
      [sagTo, x1, '#6d7a82', 0],
    ];
    for (const [a, b, col, sag] of sheets) {
      const sway = Math.sin(t * 1.2 + a * 0.01) * 5;
      c.fillStyle = col;
      c.beginPath();
      if (sag) {
        c.moveTo(a, wireY + 6);
        c.quadraticCurveTo((a + b) / 2, sagY - 30, b, wireY + 6);
        c.lineTo(b + sway, sagY + 6);
        c.quadraticCurveTo((a + b) / 2 + sway, sagY + 18, a + sway, sagY + 6);
      } else {
        c.moveTo(a, wireY);
        c.lineTo(b, wireY);
        c.lineTo(b + sway, wireY + 150);
        c.quadraticCurveTo((a + b) / 2 + sway, wireY + 160, a + sway, wireY + 150);
      }
      c.closePath();
      c.fill();
      // folds and a stitched seam
      c.strokeStyle = 'rgba(0,0,0,0.18)';
      c.lineWidth = 1.5;
      for (let fx = a + 14; fx < b - 6; fx += 22) {
        c.beginPath();
        c.moveTo(fx, wireY + 10);
        c.lineTo(fx + sway * 0.6, sag ? sagY : wireY + 140);
        c.stroke();
      }
    }
    // shrapnel holes let the light through
    c.fillStyle = '#1a1612';
    for (const [hx, hy] of [[x0 + 30, wireY + 60], [sagTo + 40, wireY + 40], [sagTo + 55, wireY + 90]]) {
      c.beginPath();
      c.arc(hx, hy, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// A shopfront with a dented, half-closed rolling shutter.
export function shop(R, x, { w = 220, sign = 'دكّان أبو ريّان', open = 0.45 } = {}) {
  R.paint((c) => {
    c.fillStyle = '#1b1612';
    c.fillRect(x, -150, w, 150);
    // empty shelves inside
    c.fillStyle = 'rgba(80,66,52,0.6)';
    for (let i = 0; i < 3; i++) c.fillRect(x + 10, -120 + i * 35, w - 20, 4);
    c.fillStyle = '#8c8a86';
    c.fillRect(x - 4, -160, w + 8, 12);
    // sign
    c.fillStyle = '#2f4a5a';
    c.fillRect(x + 10, -205, w - 20, 38);
    c.fillStyle = '#e8dcc0';
    c.font = '24px "Aref Ruqaa", "Noto Naskh Arabic", serif';
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillText(sign, x + w / 2, -178);
  });
  R.cast((c) => {
    const sh = 150 * (1 - open);
    c.fillStyle = '#7d7c78';
    c.beginPath();
    c.moveTo(x, -150);
    c.lineTo(x + w, -150);
    c.lineTo(x + w, -150 + sh);
    c.quadraticCurveTo(x + w * 0.55, -150 + sh + 22, x + w * 0.4, -150 + sh - 4);
    c.lineTo(x, -150 + sh + 6);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1.5;
    for (let y = -146; y < -150 + sh; y += 7) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w, y);
      c.stroke();
    }
  });
}

// A grape vine climbing a broken garden wall.
export function vine(R, x, t, { wallH = 110, lush = 1, ripe = false } = {}) {
  R.cast((c) => {
    c.fillStyle = '#b3a58f';
    c.beginPath();
    c.moveTo(x - 70, 0);
    c.lineTo(x - 70, -wallH + 20);
    c.lineTo(x - 30, -wallH);
    c.lineTo(x + 10, -wallH + 30);
    c.lineTo(x + 40, -wallH + 8);
    c.lineTo(x + 70, -wallH + 40);
    c.lineTo(x + 70, 0);
    c.fill();
  });
  R.cast((c) => {
    const r = rng(12);
    c.strokeStyle = '#5a4230';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 20, 0);
    c.bezierCurveTo(x + 10, -60, x + 40, -90, x - 20, -wallH - 20);
    c.bezierCurveTo(x - 50, -wallH - 40, x - 10, -wallH - 70, x + 30, -wallH - 60);
    c.stroke();
    for (let i = 0; i < 22 * lush; i++) {
      const k = r();
      const lx = lerp(x + 20, x - 30, k) + (r() - 0.5) * 70;
      const ly = -k * (wallH + 60) - 10 + (r() - 0.5) * 30;
      const sway = Math.sin(t * 1.4 + i) * 1.5;
      c.fillStyle = r() < 0.5 ? '#5f7a3a' : '#6d8a44';
      c.beginPath();
      c.ellipse(lx + sway, ly, 11, 9, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // small bunches of grapes
    for (let b = 0; b < 3; b++) {
      const gx = x - 10 + b * 22;
      const gy = -wallH + 6 + b * 8;
      c.fillStyle = ripe ? '#4a2a4a' : '#8ea24a';
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.arc(gx + ((i % 3) - 1) * 4, gy + Math.floor(i / 3) * 5, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
}

// The school: a three-storey block with its eastern wing collapsed, a
// basement stairwell, and ground-floor classroom windows.
export function school(R, x, t) {
  block(R, { x, w: 520, floors: 3, fh: 130, color: '#c8b999', seed: 44, torn: 0, pocks: 6, graffiti: [['مدرسة', 0.3, -330, 30, 'rgba(60,70,90,0.7)']] }, t);
  // the collapsed east wing: a slope of slabs
  rubble(R, x + 520, 380, 210, { seed: 45, color: '#b9aa8a' });
  // basement stairwell entrance: a low wall and a dark opening
  R.paint((c) => {
    c.fillStyle = '#0d0b09';
    c.fillRect(x + 380, -95, 80, 95);
    c.fillStyle = '#9d9078';
    for (let i = 0; i < 4; i++) c.fillRect(x + 384 + i * 4, -92 + i * 22, 72, 4); // steps going down, seen through
  });
  // classroom windows (for the flashback)
  R.paint((c) => {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#2a2420';
      c.fillRect(x + 40 + i * 110, -110, 80, 70);
      c.fillStyle = 'rgba(90,70,50,0.5)';
      c.fillRect(x + 50 + i * 110, -60, 60, 3); // desk tops glimpsed
    }
    c.strokeStyle = '#d9d4c8';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + 150, -110);
    c.lineTo(x + 175, -80);
    c.lineTo(x + 160, -60);
    c.stroke(); // cracked pane
  });
}

// A doorway into a ground-floor room, lit from inside.
export function roomDoor(R, x, { w = 110, h = 170, light = 'rgba(255,200,140,0.18)' } = {}) {
  R.paint((c) => {
    c.fillStyle = '#18130f';
    c.fillRect(x, -h, w, h);
  });
  R.glow((c) => {
    const g = c.createLinearGradient(x, -h, x, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, light);
    c.fillStyle = g;
    c.fillRect(x, -h, w, h);
  });
}

export function jerryCan(c, x, y, s = 1, color = '#d9b12a') {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-14, 0);
  c.lineTo(-14, -34);
  c.lineTo(-6, -40);
  c.lineTo(14, -40);
  c.lineTo(14, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.fillRect(-10, -30, 20, 2);
  c.fillRect(-10, -16, 20, 2);
  c.fillStyle = shade('#d9b12a', 0.7);
  c.fillRect(4, -46, 7, 7); // cap
  c.strokeStyle = shade('#d9b12a', 0.6);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-8, -40);
  c.lineTo(-4, -48);
  c.lineTo(2, -48);
  c.lineTo(0, -40);
  c.stroke(); // handle
  c.restore();
}

// Sorted piles of scrap: rebar, copper, aluminium.
export function scrapPiles(R, x, disturbed = 0) {
  R.cast((c) => {
    const r = rng(33);
    const piles = [
      [x, '#5a4a3e', 'rebar'],
      [x + 90, '#a86a3a', 'copper'],
      [x + 170, '#b8bcc0', 'alu'],
    ];
    for (const [px, col, kind] of piles) {
      const sc = disturbed ? 1.6 : 1;
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = kind === 'rebar' ? 3 : 2;
      for (let i = 0; i < 12; i++) {
        const ax = px + (r() - 0.5) * 50 * sc;
        const ay = -r() * 22 / sc;
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(ax + (r() - 0.5) * 40, ay - (r() - 0.2) * 10);
        c.stroke();
        if (kind !== 'rebar' && r() < 0.5) c.fillRect(ax, ay - 4, 8, 5);
      }
    }
  });
}

export function crater(R, x, w = 180) {
  R.paint((c) => {
    c.fillStyle = '#3a3129';
    c.beginPath();
    c.ellipse(x, 10, w / 2, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8a7c68';
    const r = rng(9);
    for (let i = 0; i < 14; i++) c.fillRect(x - w / 2 - 30 + r() * (w + 60), -4 - r() * 8, 6 + r() * 12, 4 + r() * 5);
  });
}

// The dead olive tree at the corner: twisted, grey, leafless.
export function deadOlive(R, x) {
  R.cast((c) => {
    c.strokeStyle = '#6a625a';
    c.lineCap = 'round';
    const branch = (bx, by, ang, len, w, d) => {
      const ex = bx + Math.cos(ang) * len;
      const ey = by + Math.sin(ang) * len;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + Math.cos(ang + 0.4) * len * 0.5, by + Math.sin(ang + 0.4) * len * 0.5, ex, ey);
      c.stroke();
      if (d < 4) {
        branch(ex, ey, ang - 0.45 - d * 0.05, len * 0.7, w * 0.62, d + 1);
        branch(ex, ey, ang + 0.5, len * 0.62, w * 0.6, d + 1);
      }
    };
    branch(x, 0, -Math.PI / 2 - 0.1, 90, 22, 0);
  });
}

export function lowWall(R, x, w, h = 70, color = '#a3967f') {
  R.cast((c) => {
    c.fillStyle = color;
    c.fillRect(x, -h, w, h);
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < w; i += 36) c.fillRect(x + i, -h, 2, h);
    c.fillRect(x, -h / 2, w, 2);
  });
}

// A Mi-8 seen side-on in the far sky, rotor a blur.
export function helicopter(c, x, y, s, t) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#1c1c20';
  c.beginPath();
  smoothPath(c, [[-60, 0], [-20, -14], [40, -14], [62, -4], [60, 8], [20, 14], [-40, 10]], true);
  c.fill();
  c.fillRect(-120, -6, 70, 6); // tail boom
  c.fillRect(-126, -20, 8, 20);
  c.fillRect(-4, -20, 8, 8);
  c.globalAlpha = 0.35;
  c.fillRect(-90, -24 + Math.sin(t * 60) * 1, 180, 3); // rotor blur
  c.globalAlpha = 1;
  c.restore();
}
