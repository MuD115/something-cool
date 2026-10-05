// Small pieces the later acts' scripts share: lines by key (marking the
// placeholders), easing a value over time, fading, people placed in a scene,
// and being moved from one place to another.

import { clamp, lerp, smooth } from '../engine/util.js';

// say(g, key) and line(g, key) for one act's LINES and WHO.
export function lines(LINES, WHO) {
  const mark = (g, L) => {
    const last = g.text.log[g.text.log.length - 1];
    if (last && last.line[1] === L.en) last.draft = !!L.draft;
  };
  return {
    *say(g, key) {
      const L = LINES[key];
      const step = g.say(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
      const first = step.next();
      mark(g, L);
      yield first.value;
      yield* step;
    },
    line(g, key) {
      const L = LINES[key];
      g.line(L.who ? WHO[L.who] : null, [L.ar, L.en], L.dur, L.style || '');
      mark(g, L);
    },
  };
}

// Ease obj[key] (g.a by default) from where it is to `to` over `dur` seconds.
export function* tween(g, key, to, dur, obj = g.a) {
  const from = obj[key] || 0;
  const t0 = g.time;
  yield () => {
    const k = clamp((g.time - t0) / dur);
    obj[key] = lerp(from, to, smooth(0, 1, k));
    return k >= 1;
  };
}
export const fadeTo = (g, to, dur) => tween(g, 'fade', to, dur, g);

// Someone in a scene: placed, posed, dressed.
export function actor(g, outfit, x, { f = 1, pose = null, scale = 1, o = null } = {}) {
  const w = g.npc(outfit, x, { f, scale });
  if (o) w.rig.o = { ...w.rig.o, ...o };
  if (pose) w.override = pose;
  w.update(0.016, {});
  return w;
}

// Clear a scene's people.
export function clearPeople(g) {
  for (const w of g.npcs) w.visible = false;
  g.npcs = [];
}

// Move Sami into a place [centre, half-width]: from black, the place's
// bounds, the camera snapped.
export function moveTo(g, place, x, { f = 1, cam = null, y = 0 } = {}) {
  const p = g.player;
  const [c, hw] = place;
  g.level.bounds = [c - hw, c + hw];
  p.override = null;
  p.arms = null;
  p.place(x, y);
  p.f = f;
  g.camOverride = cam;
  g.snapCamera();
}

// A line of text white on black, held: the endings' last words, the
// epilogue. Each card is [[ar, en], …].
export function* whiteOnBlack(g, card, hold) {
  g.text.titleCard(card, hold);
  yield hold + 0.4;
}

// Ground that isn't the street's: a floor at height y from xa to xb, and a
// ramp under a drawn flight of steps (from (xa, ya) to (xb, yb)), made of
// thin solids so the walker climbs it a little at a time.
export function floorSolid(L, xa, xb, y) {
  if (y < 0) L.solid(xa, xb, y, 0, { hidden: true });
}
export function rampSolids(L, xa, ya, xb, yb, w = 8) {
  const n = Math.max(1, Math.ceil(Math.abs(xb - xa) / w));
  for (let i = 0; i < n; i++) {
    const x0 = xa + ((xb - xa) * i) / n;
    const x1 = xa + ((xb - xa) * (i + 1)) / n;
    const y = Math.min(ya + ((yb - ya) * (i + 0.5)) / n, 0);
    if (y < -0.5) L.solid(Math.min(x0, x1), Math.max(x0, x1), y, 0, { hidden: true });
  }
}
// The same, following a height function h(x) (≤ 0) sampled every w units,
// smoothed so no single rise is too high to walk up.
export function groundFrom(L, h, xa, xb, w = 8) {
  for (let x = xa; x < xb; x += w) {
    const y = (h(x) + h(Math.min(xb, x + w))) / 2;
    if (y < -0.5) L.solid(x, x + w, y, 0, { hidden: true });
  }
}
