// Short-lived things: blast flashes, dust clouds, falling debris, dust
// trickling from ceilings, and the slow fog that hangs after shelling.

import { rng } from '../engine/util.js';

export class Effects {
  constructor() {
    this.items = [];
    this.fog = 0; // 0…1 dust hanging in the air
    this.r = rng(99);
  }

  blast(x, y = 0, size = 1) {
    const r = this.r;
    this.items.push({ kind: 'flash', x, y: y - 30, t: 0, life: 0.25, size });
    for (let i = 0; i < 16; i++) {
      this.items.push({
        kind: 'dust',
        x: x + (r() - 0.5) * 60 * size,
        y: y - r() * 40,
        vx: (r() - 0.5) * 260 * size,
        vy: -100 - r() * 380 * size,
        rad: 30 + r() * 50 * size,
        t: 0,
        life: 3 + r() * 3,
        shade: 0.75 + r() * 0.3,
      });
    }
    for (let i = 0; i < 18; i++) {
      this.items.push({
        kind: 'debris',
        x,
        y: y - 20,
        vx: (r() - 0.5) * 900 * size,
        vy: -300 - r() * 700 * size,
        spin: (r() - 0.5) * 20,
        a: r() * 6,
        w: 4 + r() * 12,
        t: 0,
        life: 2.5,
      });
    }
    this.fog = Math.min(1, this.fog + 0.35 * size);
  }

  trickle(x, y, dur = 3) {
    this.items.push({ kind: 'trickle', x, y, t: 0, life: dur });
  }

  update(dt) {
    for (const it of this.items) {
      it.t += dt;
      if (it.kind === 'dust') {
        it.vx *= 1 - dt * 1.5;
        it.vy = it.vy * (1 - dt * 2) - 20 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rad += dt * 30;
      } else if (it.kind === 'debris') {
        it.vy += 2200 * dt;
        it.x += it.vx * dt;
        it.y = Math.min(it.y + it.vy * dt, 4);
        if (it.y >= 4) {
          it.vx *= 0.5;
          it.vy = 0;
          it.spin = 0;
        }
        it.a += it.spin * dt;
      }
    }
    this.items = this.items.filter((it) => it.t < it.life);
    this.fog = Math.max(0, this.fog - dt * 0.012);
  }

  draw(R) {
    R.glow((c) => {
      for (const it of this.items) {
        if (it.kind !== 'flash') continue;
        const k = 1 - it.t / it.life;
        const g = c.createRadialGradient(it.x, it.y, 0, it.x, it.y, 220 * it.size);
        g.addColorStop(0, `rgba(255,230,180,${k})`);
        g.addColorStop(0.3, `rgba(255,150,60,${k * 0.6})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = g;
        c.fillRect(it.x - 240, it.y - 240, 480, 480);
      }
    });
    R.cast((c) => {
      for (const it of this.items) {
        if (it.kind !== 'debris') continue;
        c.save();
        c.translate(it.x, it.y);
        c.rotate(it.a);
        c.fillStyle = '#6e6252';
        c.fillRect(-it.w / 2, -it.w / 3, it.w, it.w * 0.66);
        c.restore();
      }
    });
    R.paint((c) => {
      for (const it of this.items) {
        if (it.kind === 'dust') {
          const k = 1 - it.t / it.life;
          const rgb = `${(150 * it.shade) | 0},${(138 * it.shade) | 0},${(118 * it.shade) | 0}`;
          const grad = c.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.rad);
          grad.addColorStop(0, `rgba(${rgb},${0.6 * k})`);
          grad.addColorStop(0.6, `rgba(${rgb},${0.4 * k})`);
          grad.addColorStop(1, `rgba(${rgb},0)`);
          c.fillStyle = grad;
          c.beginPath();
          c.arc(it.x, it.y, it.rad, 0, Math.PI * 2);
          c.fill();
        } else if (it.kind === 'trickle') {
          const k = Math.sin((it.t / it.life) * Math.PI);
          c.fillStyle = `rgba(170,160,140,${0.5 * k})`;
          for (let i = 0; i < 8; i++) {
            const py = it.y + ((it.t * 260 + i * 37) % 220);
            c.fillRect(it.x + Math.sin(i * 3) * 4, py, 2, 6);
          }
        }
      }
    });
  }

  // Dust haze over the whole frame, in screen space.
  drawFog(R, tint = [196, 182, 156]) {
    if (this.fog <= 0.01) return;
    R.glow((c) => {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.28 * this.fog})`;
      c.fillRect(0, 0, R.W, R.H);
      c.restore();
    });
  }
}
