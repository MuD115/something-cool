// The running game: player control, NPCs, tools, interaction, choices,
// camera and checkpoints. Acts plug in their level, art and scripts.

import { Level, Runner } from './world/level.js';
import { Walker } from './world/walker.js';
import { Effects } from './sets/effects.js';
import { keyLabel } from './engine/input.js';
import { clamp, lerp, smooth } from './engine/util.js';
import { writeSave } from './engine/save.js';
import { POSES } from './rigs/person.js';
import { MOTION } from './rigs/motion.js';

export const TOOLS = {
  torch: { id: 'torch', ar: 'مصباح يدوي', en: 'Hand-crank torch' },
  mirror: { id: 'mirror', ar: 'شظية مرآة', en: 'Mirror shard' },
  walkie: { id: 'walkie', ar: 'جهاز لاسلكي', en: 'Walkie-talkie' },
  whitecloth: { id: 'whitecloth', ar: 'قماشة بيضاء', en: 'White cloth' },
  lighter: { id: 'lighter', ar: 'ولّاعة أحمد', en: 'Ahmad’s lighter' },
  journal: { id: 'journal', ar: 'دفتر أحمد', en: 'Ahmad’s journal' },
  camera: { id: 'camera', ar: 'كاميرا أحمد', en: 'Ahmad’s camera' },
};

export class Game {
  constructor({ R, sound, text, input, settings }) {
    this.R = R;
    this.sound = sound;
    this.text = text;
    this.input = input;
    this.settings = settings;
    this.time = 0;
    this.paused = false;
  }

  start(act, state) {
    // the act being left lets go of anything still running (a band playing)
    if (this.act && this.a) this.act.leave?.(this);
    this.act = act;
    this.onPart = null;
    this.state = state;
    this.level = new Level(act.bounds ? { bounds: act.bounds } : undefined);
    this.runner = new Runner();
    this.effects = new Effects();
    this.player = new Walker(this.level, 'sami');
    this.player.idles = true;
    this.player.onStep = (stance) => {
      const p = this.player;
      const surface = this.scene === 'stairwell' ? 'hollow' : this.surface?.(p.x) || 'grit';
      this.sound.step(surface, stance === 'crouch' ? 0.13 : 0.18, { crouch: stance === 'crouch' });
      // running kicks up a little dust
      if (this.scene === 'street' && Math.abs(p.vx) > 240) this.effects.puff(p.x - p.f * 8, p.y - 2, 0.12, false);
    };
    this.player.onLand = (k) => {
      this.sound.land(0.15 + k * 0.3);
      if (k > 0.25 && this.scene === 'street') this.effects.puff(this.player.x, this.player.y - 2, 0.15 + k * 0.2, false);
    };
    // distant life only out in the street, and never under a menu
    this.sound.lifeGate = () => this.scene === 'street' && !this.paused;
    this.npcs = [];
    this.passers = [];
    this.locked = false;
    // nothing from a previous run may leak into this one
    this.gate = null;
    this.autoWalk = null;
    this.fade = 0;
    this.stairKids = null;
    this.flashActors = null;
    this.cat = null;
    this.camOverride = null;
    this.stanceLock = null;
    this.onStanceLocked = null;
    this.focus = null;
    this.focusK = 0;
    this.cam = { x: 0, y: -250, view: 1500 };
    this.shake = 0;
    this.torch = { on: false, charge: 0.8, cranking: 0 };
    this.active = 'torch';
    this.picked = null;
    this.promptFor = null;
    this.scene = 'street';
    this.text.hideChoice();
    this.text.clearLine();
    this.text.prompt(null);
    this.text.hint(0, 0, '', null);
    this.promptInfo = null;
    this.anchor = null;
    this.floatAt = null;
    this.skipId = 0;
    this.text.objective(null);
    act.build(this);
    this.snapCamera();
  }

  // ------------------------------------------------------------ helpers --

  npc(outfit, x, opts = {}) {
    const w = new Walker(this.level, outfit, opts.scale || 1);
    w.place(x, opts.y);
    w.f = opts.f ?? -1;
    w.goal = null;
    // their footsteps too, quieter with distance and placed left or right
    w.onStep = (stance) => {
      if (!w.visible || w.depthK || this.scene !== 'street') return;
      const dx = Math.abs(w.x - this.player.x);
      if (dx > 700) return;
      this.sound.step(this.surface?.(w.x) || 'grit', 0.11 * (1 - dx / 700) * (w.rig.scale || 1), { crouch: stance === 'crouch', pan: this.sound.panFor(w.x) });
    };
    Object.assign(w, opts.props || {});
    this.npcs.push(w);
    return w;
  }

  hasTool(id) {
    return this.state.tools.includes(id);
  }

  giveTool(id) {
    if (!this.hasTool(id)) this.state.tools.push(id);
    this.active = id;
  }

  checkpoint(id) {
    this.state.checkpoint = id;
    writeSave(this.state);
    this.onCheckpoint?.(id, this.state);
  }

  lock(on = true) {
    this.locked = on;
    if (on) this.text.hint(0, 0, '', null);
  }

  // Everything transient off the screen (menus, scene changes, the end).
  clearHud() {
    this.text.prompt(null);
    this.text.hint(0, 0, '', null);
    this.promptVisible = false;
  }

  // Generators for scripts --------------------------------------------------

  // How long a line stays up: long enough to read the longer of its two
  // languages (Arabic reads a little slower per letter).
  readTime(line) {
    const k = this.settings.get('readSpeed') || 1;
    return Math.max(2.4, 1.2 + Math.max(line[1].length * 0.055, line[0].length * 0.065)) * k;
  }

  // A scripted duration is stretched or shortened by the reading-time
  // setting too, never below what the line needs at that setting.
  dur(line, dur) {
    const k = this.settings.get('readSpeed') || 1;
    return dur == null ? this.readTime(line) : Math.max(dur * k, k < 1 ? this.readTime(line) : 0);
  }

  // Examine and item text floats over the thing Sami last reached for (or
  // over Sami himself); everything else is a subtitle.
  show(who, line, d, style) {
    if (!who && (style === 'examine' || style === 'item')) {
      const a = this.anchor;
      this.floatAt = a && this.time - this.anchorAt < 12 && Math.abs(a.x + (a.bx || 0) - this.player.x) < 320 ? a : null;
      return this.text.float(line, d, style);
    }
    return this.text.say(who, line, d, style);
  }

  // Where the floating caption sits, in world space: above the thing, or
  // above Sami's head.
  floatPoint() {
    const a = this.floatAt;
    if (a) {
      const h = (a.box || [90, 90])[1];
      return [a.x + (a.bx || 0), a.y + (a.by || 0) - h / 2 - 14];
    }
    const p = this.player;
    return [p.x, p.y - 200];
  }

  *say(who, line, dur = null, style = '') {
    const d = this.dur(line, dur);
    const id = this.show(who, line, d, style);
    this.sound.score?.speak(d);
    const end = this.time + d;
    // held Skip moves on once the line has been up a moment
    yield () => this.time >= end || this.skipId === id;
  }

  // Show a line without waiting for it.
  line(who, line, dur = null, style = '') {
    const d = this.dur(line, dur);
    this.show(who, line, d, style);
    this.sound.score?.speak(d);
  }

  *choose(prompt, options, { timed = 0, def = 0 } = {}) {
    this.picked = null;
    this.sound.sting();
    this.text.choice(prompt, options, (i) => this.pick(i));
    this.choiceStart = this.time;
    this.choiceTimed = timed;
    this.choiceDefault = def;
    yield () => this.picked !== null;
    return this.picked;
  }

  pick(i) {
    if (!this.text.choiceOpen || this.picked !== null) return;
    this.picked = i;
    this.sound.click();
    this.text.pick(i);
  }

  // Reach for something at (x, y) and take it: a squat for things on the
  // ground, a reach for things at hand height, arms up for things above.
  // onGrab runs at the moment the hand gets there.
  *reach(x, y, onGrab) {
    const p = this.player;
    const was = this.locked;
    this.lock();
    const f = x >= p.x ? 1 : -1;
    if (f !== p.f) p.rig.pivot?.();
    p.f = f;
    if (y > -70) {
      // low: the captured bend and lift (CMU mocap), down to it, hand to
      // it, and up, the thing coming up with him
      const clip = MOTION.pickup;
      const t0 = p.time;
      const span = [0.25, 2.65];
      const dur = 1.25;
      p.override = (t) => clip.time(span[0] + clamp((t - t0) / dur) * (span[1] - span[0]));
      yield dur * 0.46;
      onGrab?.();
      this.sound.cloth();
      yield dur * 0.54;
      p.override = null;
      yield 0.15;
    } else {
      p.override = y < -190 ? { ...POSES.reachUp, head: -0.45, armF: 0.35, foreF: 0.55 } : { ...POSES.stand, torso: 0.18, head: 0.15, armN: 1.45, foreN: 1.5 };
      yield 0.42;
      onGrab?.();
      this.sound.cloth();
      yield 0.16;
      p.override = null;
      yield 0.3;
    }
    if (!was) this.lock(false);
  }

  *walkNpc(w, x, opts = {}) {
    // (a goal past the level's edge could never be reached: keep it inside)
    const [b0, b1] = this.level.bounds;
    w.goal = Math.min(b1 - 16, Math.max(b0 + 16, x));
    w.goalOpts = opts;
    yield () => w.goal === null;
  }

  *walkPlayer(x, { run = false } = {}) {
    const [b0, b1] = this.level.bounds;
    this.autoWalk = { x: Math.min(b1 - 16, Math.max(b0 + 16, x)), run };
    yield () => !this.autoWalk;
  }

  // A control prompt shows until it's obeyed or for 7 s, then steps aside.
  // The script may still be waiting on it; if the player stands idle for 5 s
  // it comes back.
  prompt(keysAction, ar, en) {
    if (!keysAction) {
      this.promptFor = null;
      this.promptInfo = null;
      this.text.prompt(null);
      return;
    }
    this.promptFor = keysAction;
    this.promptInfo = { action: keysAction, ar, en };
    this.showPrompt();
  }

  showPrompt() {
    const { action, ar, en } = this.promptInfo;
    const keys = this.input.device === 'keys' || !this.input.device ? (this.input.bindings()[action] || []).map(keyLabel).slice(0, 2).join(' / ') : this.input.label(action);
    this.text.prompt(keys, ar, en);
    this.promptAt = this.time;
    this.promptVisible = true;
    this.idleT = 0;
  }

  updatePrompt(dt) {
    if (!this.promptInfo) return;
    const input = this.input;
    this.idleT = input.busy() ? 0 : (this.idleT || 0) + dt;
    if (this.promptVisible) {
      if (input.hit(this.promptFor) || this.time - this.promptAt > 7) {
        this.text.prompt(null);
        this.promptVisible = false;
        this.idleT = 0;
      }
    } else if (this.idleT > 5 && !this.locked) this.showPrompt();
  }

  bump(amount) {
    if (this.settings.get('shake')) this.shake = Math.max(this.shake, amount);
  }

  snapCamera() {
    const t = this.cameraTarget();
    Object.assign(this.cam, t);
  }

  cameraTarget() {
    if (this.camOverride) return typeof this.camOverride === 'function' ? this.camOverride(this) : this.camOverride;
    const p = this.player;
    const cam = this.act.camera?.(this) || { x: p.x + p.f * 110, y: -205, view: 1300 };
    // near something to interact with, the camera leans towards it and closes in
    const f = this.focus;
    const k = f && this.settings.get('focusCam') !== false ? smooth(0, 1, this.focusK) : 0;
    if (k > 0) {
      const fx = f.x + (f.bx || 0);
      const fy = f.y + (f.by || 0);
      cam.x = lerp(cam.x, (p.x + fx) / 2, 0.8 * k);
      cam.y = lerp(cam.y, clamp((fy - 205) / 2, -290, -160), 0.5 * k);
      cam.view = lerp(cam.view, 1040, k);
    }
    return cam;
  }

  // The nearest thing to interact with, within reach or nearly: the camera
  // leans towards it and it gets a thin outline, so it isn't missed.
  updateFocus(dt) {
    const p = this.player;
    let best = null;
    if (this.scene === 'street' && !this.locked && !this.text.choiceOpen && !this.autoWalk) {
      for (const t of this.level.things) {
        if (!t.enabled()) continue;
        if (t.y < p.y - 260 || t.y > p.y + 60) continue; // another floor
        const d = Math.abs(t.x - p.x);
        const r = t.range * 1.9;
        if (d < r && (!best || d < best.d)) best = { t, d, r };
      }
    }
    const want = best ? clamp((best.r - best.d) / (best.r * 0.55)) : 0;
    if (best) this.focus = best.t;
    this.focusK = lerp(this.focusK, want, 1 - Math.exp(-dt * 2.4));
    if (!best && this.focusK < 0.01) this.focus = null;
  }

  // A thin, softly breathing outline round the thing in focus, following its
  // shape: a silhouette (sil: draws the thing, e.g. the cat), a traced
  // outline (points about the box centre), or else its rounded box. Drawn
  // offscreen, then anyone standing in front of it is cut out of it, so it
  // never crosses a person.
  drawOutline(R) {
    const t = this.focus;
    const k = this.focusK;
    if (!t || k < 0.02 || this.scene !== 'street' || this.settings.get('outlines') === false || !t.enabled()) return;
    const { W, H } = R;
    const oc = (this.olc ||= document.createElement('canvas'));
    if (oc.width !== W || oc.height !== H) {
      oc.width = W;
      oc.height = H;
    }
    const c = oc.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    R.layer(1);
    const m = R.layers.emit.x.getTransform();
    const flash = this.usedAt && this.time - this.usedAt < 0.4 ? 1 + 1.2 * (1 - (this.time - this.usedAt) / 0.4) : 1;
    const a = Math.min(1.6, k * (0.8 + 0.2 * Math.sin(this.time * 3)) * flash);
    const cx = t.x + (t.bx || 0);
    const cy = t.y + (t.by || 0);
    if (t.sil) {
      // a silhouette's edge: the shape, spread a few pixels, less the shape
      const mc = (this.olm ||= document.createElement('canvas'));
      if (mc.width !== W || mc.height !== H) {
        mc.width = W;
        mc.height = H;
      }
      const x = mc.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, W, H);
      x.setTransform(m);
      t.sil(x);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#fff';
      x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-over';
      const r = Math.max(1.5, W / 700);
      c.globalAlpha = 0.55 * a;
      for (let q = 0; q < 12; q++) {
        const ang = (q / 12) * Math.PI * 2;
        c.drawImage(mc, Math.cos(ang) * r, Math.sin(ang) * r);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'destination-out';
      c.drawImage(mc, 0, 0);
      c.globalCompositeOperation = 'source-over';
    } else {
      c.setTransform(m);
      c.beginPath();
      if (t.outline) {
        const pts = t.outline;
        c.moveTo(cx + pts[0][0], cy + pts[0][1]);
        for (let q = 1; q < pts.length; q++) c.lineTo(cx + pts[q][0], cy + pts[q][1]);
        c.closePath();
      } else {
        const [w, h] = t.box || [90, 90];
        c.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(14, w / 4, h / 4));
      }
      c.lineJoin = 'round';
      c.strokeStyle = `rgba(255, 244, 214, ${0.1 * a})`;
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = `rgba(255, 246, 222, ${0.55 * a})`;
      c.lineWidth = 1.6;
      c.stroke();
    }
    // cut out everyone standing in front
    c.setTransform(m);
    c.globalCompositeOperation = 'destination-out';
    const who = [this.player, ...this.npcs];
    for (const w of who) if (w.visible !== false && !w.depthK && Math.abs(w.x - cx) < 600) w.draw(c);
    if (this.cat && !this.cat.hidden && !t.sil) this.cat.draw(c);
    c.globalCompositeOperation = 'source-over';
    R.glow((e) => {
      e.save();
      e.setTransform(1, 0, 0, 1, 0, 0);
      e.drawImage(oc, 0, 0);
      e.restore();
    });
  }

  // --------------------------------------------------------------- frame --

  update(dt) {
    if (this.paused) return;
    this.time += dt;
    this.text.tick(dt);
    this.player.fallsHard = this.settings.get('physics');
    const input = this.input;
    const p = this.player;

    // choices by number key
    if (this.text.choiceOpen) {
      for (let i = 0; i < 3; i++) {
        if (input.keys.has(`Digit${i + 1}`) || input.keys.has(`Numpad${i + 1}`)) this.pick(i);
      }
      if (this.choiceTimed && this.picked === null) {
        const left = this.choiceTimed - (this.time - this.choiceStart);
        this.text.choiceEl.style.setProperty('--left', String(clamp(left / this.choiceTimed)));
        this.text.choiceEl.dataset.timed = 'on';
        if (left <= 0) this.pick(this.choiceDefault);
      } else this.text.choiceEl.dataset.timed = '';
    }

    // looking at what he's examining: the head goes to it (and a lean, if it's low)
    const la = this.lookAt;
    if (la && this.time < la.until && Math.abs(p.vx) < 20 && !p.override) {
      p.gaze = clamp((la.y + 150) / 260, -0.55, 0.5);
      p.gazeLean = la.y > -70 ? 0.2 : 0;
    } else {
      p.gaze = 0;
      p.gazeLean = 0;
      if (la && this.time >= la.until) this.lookAt = null;
    }

    // the player
    if (this.autoWalk) {
      const done = p.goTo(this.autoWalk.x, dt, { run: this.autoWalk.run });
      if (done) this.autoWalk = null;
    } else if (!this.locked && this.scene === 'street') {
      let stance;
      let told = true;
      // some moments won't let him drop or run (walking out under a white cloth)
      if (this.stanceLock) {
        if (input.hit('crouch') || input.hit('prone') || (input.held('run') && Math.abs(p.vx) > 1)) this.onStanceLocked?.();
      } else if (this.settings.get('crouchMode') === 'hold') {
        // held: down while the key is, up (when there's room) once it's let go
        const want = input.held('prone') ? 'prone' : input.held('crouch') ? 'crouch' : 'stand';
        told = want !== this.heldWant;
        this.heldWant = want;
        if (want !== p.stance && (want !== 'stand' || !p.override)) stance = want;
      } else {
        if (input.hit('crouch')) stance = p.stance === 'crouch' ? 'stand' : 'crouch';
        if (input.hit('prone')) stance = p.stance === 'prone' ? 'stand' : 'prone';
        if (input.hit('jump') && p.stance !== 'stand') stance = 'stand';
      }
      const move = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      if (this.stanceLock) stance = p.stance !== this.stanceLock ? this.stanceLock : undefined;
      p.update(dt, { move: this.gate ? this.gate(move) : move, run: input.held('run') && !this.stanceLock, jump: input.hit('jump') && p.stance === 'stand' && !this.stanceLock, stance });
      if (stance && p.stance !== stance && stance !== 'stand') {
        /* couldn't change stance */
      } else if (stance === 'stand' && p.stance !== 'stand' && told && !p.override && this.level.ceilingAt(p.x, p.y) > p.y - 165) {
        // (only when something overhead is what stops him)
        this.line(null, ['لا مجال للوقوف هنا.', 'No room to stand here.'], 1.6, 'examine');
      }
    } else {
      p.update(dt, {});
    }

    // NPCs (the street's people wait while we're in the stairwell or a memory)
    if (this.scene === 'street') for (const w of this.npcs) {
      if (w.brain) w.brain(dt, this);
      else if (w.goal !== null && w.goal !== undefined) {
        if (w.goTo(w.goal, dt, w.goalOpts || {})) w.goal = null;
      } else w.update(dt, {});
    }

    this.tools(dt);
    this.updateFocus(dt);
    this.interact();
    this.level.check(p.x);
    this.runner.update(dt);
    this.effects.update(dt);
    this.act.update?.(this, dt);

    // camera (and where sounds are placed from)
    const target = this.cameraTarget();
    this.sound.listenerX = this.cam.x;
    const k = 1 - Math.exp(-dt * (this.camOverride ? 2.2 : 3.2));
    this.cam.x = lerp(this.cam.x, target.x, k);
    this.cam.y = lerp(this.cam.y, target.y ?? -205, k);
    this.cam.view = lerp(this.cam.view, target.view ?? 1300, k);
    this.shake = Math.max(0, this.shake - dt * 1.4);
    // the floating caption follows its thing
    if (!this.text.floatEl.hidden) {
      const [fx, fy] = this.floatPoint();
      const [u, v] = this.R.cam.toUv(fx, fy, this.R.W, this.R.H);
      this.text.placeFloat(u, v);
    }

    // prompts step aside once obeyed, or after a while
    this.updatePrompt(dt);

    // Skip: one press moves on to the next line (never past a choice), and
    // holding it keeps going, a line at a time
    if (!this.text.choiceOpen && this.text.lineUp()) {
      const up = this.text.clock - (this.text.lineStart || 0);
      if ((input.hit('skip') && up > 0.15) || (input.held('skip') && up > 0.55)) {
        this.skipId = this.text.lineId;
        this.text.clearLine();
      }
    }
  }

  tools(dt) {
    const input = this.input;
    const list = this.state.tools.map((id) => TOOLS[id]);
    if (!this.locked || this.scene !== 'street') {
      if (input.hit('tool') && list.length > 1) {
        const i = this.state.tools.indexOf(this.active);
        this.active = this.state.tools[(i + 1) % this.state.tools.length];
        this.sound.click();
      }
      if (this.active === 'torch') {
        if (input.held('use')) {
          this.torch.cranking += dt;
          if (this.torch.cranking > 0.25) {
            this.torch.charge = Math.min(1, this.torch.charge + dt * 0.35);
            if (Math.floor(this.time * 9) !== this.lastCrank) {
              this.lastCrank = Math.floor(this.time * 9);
              this.sound.crank();
            }
          }
        } else {
          if (this.torch.cranking > 0 && this.torch.cranking <= 0.25) {
            this.torch.on = !this.torch.on;
            this.sound.click();
          }
          this.torch.cranking = 0;
        }
      } else if (input.hit('use')) this.act.useTool?.(this, this.active);
    }
    if (this.torch.on) {
      this.torch.charge = Math.max(0, this.torch.charge - dt * 0.03);
      if (this.torch.charge <= 0) this.torch.on = false;
    }
    this.text.tools(list, this.active, this.torch.charge, this.torch.on, this.input.label('use'));
    // on a fully black screen (a title card, the last words) the tools step out too
    this.text.toolsEl.classList.toggle('dark', this.fade > 0.98);
  }

  interact() {
    const p = this.player;
    let t = !this.locked && this.scene === 'street' && !this.text.choiceOpen ? this.level.nearest(p.x, p.y) : null;
    // (no hint for a thing while what Sami made of it is still floating over it)
    if (t && t === this.floatAt && !this.text.floatEl.hidden) t = null;
    if (!t) {
      this.text.hint(0, 0, '', null);
      return;
    }
    const [u, v] = this.R.cam.toUv(t.x, t.y, this.R.W, this.R.H);
    const key = this.input.label('interact');
    this.text.hint(u, v, key, t.label);
    if (this.input.hit('interact')) {
      this.anchor = t;
      this.anchorAt = this.time;
      // a response in the body and the world: he turns to it, the outline
      // brightens, a soft tick
      this.usedAt = this.time;
      this.sound.tone(1650, 0.035, { vol: 0.03 });
      if (t.look) {
        const tx = t.x + (t.bx || 0);
        const f = tx >= p.x ? 1 : -1;
        if (f !== p.f && Math.abs(tx - p.x) > 12) {
          p.rig.pivot?.();
          p.f = f;
        }
        this.lookAt = { x: tx, y: t.y + (t.by || 0), until: this.time + 4 };
      } else {
        // someone to talk to turns to face him, if they're standing still
        for (const w of this.npcs) {
          if (w.goal != null || w.hidden || Math.abs(w.x - t.x) > 70 || Math.abs(w.y - p.y) > 40) continue;
          const f = p.x >= w.x ? 1 : -1;
          if (f !== w.f && Math.abs(p.x - w.x) > 12) {
            w.rig.pivot?.();
            w.f = f;
          }
        }
      }
      t.use(this);
      // an examine point: remember it, and what Sami made of it
      if (t.look) this.onNotice?.(t.id, t.lookText || this.text.log[this.text.log.length - 1]?.line);
    }
  }

  // Torch as a light source, for the act's look().
  torchLight() {
    if (!this.torch.on) return null;
    const p = this.player;
    const [hx, hy] = p.rig.world('handN');
    return {
      x: hx + p.f * 6,
      y: hy - 4,
      color: [1.0, 0.93, 0.78],
      intensity: 2.2 * (0.35 + 0.65 * this.torch.charge) * (0.94 + 0.06 * Math.sin(this.time * 31)),
      radius: 0.55,
      cone: 0.42,
      dir: p.f > 0 ? 0.12 : Math.PI - 0.12,
      rim: 1.1,
    };
  }

  render(time) {
    const R = this.R;
    R.cam.time = time;
    R.cam.set({ x: this.cam.x, y: this.cam.y, view: this.cam.view, shake: this.shake });
    const look = this.act.look(this);
    const fade = Math.max(look.fade || 0, this.fade || 0);
    // the HUD steps out of full blackouts (title cards over black)
    const black = fade > 0.85;
    if (black !== this.blackout) {
      this.blackout = black;
      document.getElementById('stage')?.classList.toggle('blackout', black);
    }
    if (this.settings.get('reduceFlashes') && look.flash) look.flash = look.flash.map((v) => v * 0.25);
    R.frame((r) => {
      this.act.draw(r, this);
      this.drawOutline(r);
    }, { ...look, time, fade });
  }
}
