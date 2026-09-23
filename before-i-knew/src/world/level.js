// Level geometry and the things in it: solid boxes to stand on and bump
// into, low ceilings that force a crouch or a crawl, interactables with
// bilingual labels, and position triggers.

export class Level {
  constructor({ bounds = [0, 10000] } = {}) {
    this.bounds = bounds;
    this.solids = []; // { x0, x1, y0 (top), y1 (bottom), noClimb }
    this.ceilings = []; // { x0, x1, y (underside) }
    this.things = []; // interactables
    this.triggers = [];
  }

  solid(x0, x1, top, bottom = 400, opts = {}) {
    const b = { x0, x1, y0: top, y1: bottom, ...opts };
    this.solids.push(b);
    return b;
  }

  ceiling(x0, x1, y) {
    const c = { x0, x1, y };
    this.ceilings.push(c);
    return c;
  }

  // Highest surface at or below yFrom (feet can't pass through tops).
  groundAt(x, yFrom = -9999) {
    let g = 0;
    for (const b of this.solids) {
      if (x < b.x0 || x > b.x1) continue;
      if (b.y0 >= yFrom - 2 && b.y0 < g) g = b.y0;
    }
    if (yFrom < -9000) {
      // first placement: stand on the highest thing here
      for (const b of this.solids) if (x >= b.x0 && x <= b.x1 && b.y0 < g) g = b.y0;
    }
    return g;
  }

  ceilingAt(x, feetY) {
    let c = -99999;
    for (const k of this.ceilings) {
      if (x < k.x0 || x > k.x1) continue;
      if (k.y < feetY && k.y > c) c = k.y;
    }
    return c;
  }

  // thing: { id, x, y, range, label: [ar, en], enabled(), use() }
  add(thing) {
    this.things.push({ range: 70, y: -120, enabled: () => true, ...thing });
    return thing;
  }

  remove(id) {
    this.things = this.things.filter((t) => t.id !== id);
  }

  nearest(x) {
    let best = null;
    let bd = Infinity;
    for (const t of this.things) {
      if (!t.enabled()) continue;
      const d = Math.abs(t.x - x);
      if (d < t.range && d < bd) {
        best = t;
        bd = d;
      }
    }
    return best;
  }

  // Fires fn once when the player first passes x (or every time if !once).
  at(x, fn, once = true) {
    this.triggers.push({ x, fn, once, done: false });
  }

  check(px) {
    for (const tr of this.triggers) {
      if (tr.done) continue;
      if (px >= tr.x) {
        tr.done = tr.once;
        tr.fn();
      }
    }
  }
}

// Coroutines for story beats: generators that yield seconds to wait, or a
// predicate to wait on. Driven by game time, so the pause menu stops them.
export class Runner {
  constructor() {
    this.tasks = [];
    this.time = 0;
  }

  run(gen) {
    const task = { gen, wait: 0, until: null, done: false };
    this.tasks.push(task);
    this.step(task);
    return task;
  }

  step(task) {
    while (!task.done) {
      if (task.wait > 0 || (task.until && !task.until())) return;
      task.until = null;
      const r = task.gen.next();
      if (r.done) {
        task.done = true;
        return;
      }
      const v = r.value;
      if (typeof v === 'number') task.wait = v;
      else if (typeof v === 'function') task.until = v;
      else if (v && typeof v.next === 'function') {
        // yield another generator: run it to completion first
        const sub = this.run(v);
        task.until = () => sub.done;
      }
    }
  }

  update(dt) {
    this.time += dt;
    for (const t of this.tasks) {
      if (t.done) continue;
      if (t.wait > 0) t.wait -= dt;
      this.step(t);
    }
    this.tasks = this.tasks.filter((t) => !t.done);
  }

  clear() {
    this.tasks = [];
  }
}
