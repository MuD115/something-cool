// The running game: player control, NPCs, tools, interaction, choices,
// camera and checkpoints. Acts plug in their level, art and scripts.

import { Level, Runner } from './world/level.js';
import { Walker } from './world/walker.js';
import { Effects } from './sets/effects.js';
import { keyLabel } from './engine/input.js';
import { clamp, lerp } from './engine/util.js';
import { writeSave } from './engine/save.js';

export const TOOLS = {
  torch: { id: 'torch', ar: 'كشّاف يدوي', en: 'Hand-crank torch' },
  mirror: { id: 'mirror', ar: 'شقفة مراية', en: 'Mirror shard' },
  walkie: { id: 'walkie', ar: 'لاسلكي', en: 'Walkie-talkie' },
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
    this.act = act;
    this.state = state;
    this.level = new Level(act.bounds ? { bounds: act.bounds } : undefined);
    this.runner = new Runner();
    this.effects = new Effects();
    this.player = new Walker(this.level, 'sami');
    this.player.onStep = (stance) => this.sound.step(this.surface?.(this.player.x) || 'grit', stance === 'crouch' ? 0.1 : 0.18);
    this.player.onLand = (k) => this.sound.land(0.15 + k * 0.3);
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

  *say(who, line, dur = null, style = '') {
    const d = dur ?? Math.max(2.4, 1.2 + line[1].length * 0.055);
    const id = this.text.say(who, line, d, style);
    this.sound.score?.speak(d);
    const end = this.time + d;
    // held Skip moves on once the line has been up a moment
    yield () => this.time >= end || this.skipId === id;
  }

  // Show a line without waiting for it.
  line(who, line, dur = null, style = '') {
    const d = dur ?? Math.max(2.4, 1.2 + line[1].length * 0.055);
    this.text.say(who, line, d, style);
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

  *walkNpc(w, x, opts = {}) {
    w.goal = x;
    w.goalOpts = opts;
    yield () => w.goal === null;
  }

  *walkPlayer(x, { run = false } = {}) {
    this.autoWalk = { x, run };
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
    const keys = this.input.bindings()[action] || [];
    this.text.prompt(keys.map(keyLabel).slice(0, 2).join(' / '), ar, en);
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
    return { x: p.x + p.f * 110, y: -205, view: 1300 };
  }

  // --------------------------------------------------------------- frame --

  update(dt) {
    if (this.paused) return;
    this.time += dt;
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

    // the player
    if (this.autoWalk) {
      const done = p.goTo(this.autoWalk.x, dt, { run: this.autoWalk.run });
      if (done) this.autoWalk = null;
    } else if (!this.locked && this.scene === 'street') {
      let stance;
      if (input.hit('crouch')) stance = p.stance === 'crouch' ? 'stand' : 'crouch';
      if (input.hit('prone')) stance = p.stance === 'prone' ? 'stand' : 'prone';
      if (input.hit('jump') && p.stance !== 'stand') stance = 'stand';
      const move = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      p.update(dt, { move: this.gate ? this.gate(move) : move, run: input.held('run'), jump: input.hit('jump') && p.stance === 'stand', stance });
      if (stance && p.stance !== stance && stance !== 'stand') {
        /* couldn't change stance */
      } else if (stance === 'stand' && p.stance !== 'stand') {
        this.text.say(null, ['ما في محل توقف هون.', 'No room to stand here.'], 1.6, 'examine');
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
    this.interact();
    this.level.check(p.x);
    this.runner.update(dt);
    this.effects.update(dt);
    this.act.update?.(this, dt);

    // camera
    const target = this.cameraTarget();
    const k = 1 - Math.exp(-dt * (this.camOverride ? 2.2 : 3.2));
    this.cam.x = lerp(this.cam.x, target.x, k);
    this.cam.y = lerp(this.cam.y, target.y ?? -205, k);
    this.cam.view = lerp(this.cam.view, target.view ?? 1300, k);
    this.shake = Math.max(0, this.shake - dt * 1.4);

    // prompts step aside once obeyed, or after a while
    this.updatePrompt(dt);

    // hold Skip to move through dialogue (never through a choice)
    if (input.held('skip') && !this.text.choiceOpen && !this.text.sub.hidden && performance.now() - (this.text.lineStart || 0) > 350) {
      this.skipId = this.text.lineId;
      this.text.clearLine();
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
    this.text.tools(list, this.active, this.torch.charge, this.torch.on, keyLabel(this.input.bindings().use?.[0]));
  }

  interact() {
    const p = this.player;
    const t = !this.locked && this.scene === 'street' && !this.text.choiceOpen ? this.level.nearest(p.x) : null;
    if (!t) {
      this.text.hint(0, 0, '', null);
      return;
    }
    const [u, v] = this.R.cam.toUv(t.x, t.y, this.R.W, this.R.H);
    const key = keyLabel(this.input.bindings().interact?.[0]);
    this.text.hint(u, v, key, `${t.label[1]} · ${t.label[0]}`);
    if (this.input.hit('interact')) t.use(this);
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
    R.frame((r) => this.act.draw(r, this), { ...look, time, fade });
  }
}
