// The director runs one scene at a time: it advances the scene clock, fires
// dialogue, title cards and sound cues on schedule, presents choices, and
// fades between scenes along the branch the player picks.

import { saveState } from './state.js';

const FADE = 0.9;

export class Director {
  constructor({ R, sound, ui, scenes, state }) {
    this.R = R;
    this.sound = sound;
    this.ui = ui;
    this.scenes = scenes;
    this.state = state;
    this.paused = false;
    this.scene = null;
    this.listeners = {};
  }

  on(ev, fn) {
    (this.listeners[ev] ||= []).push(fn);
  }

  emit(ev, arg) {
    for (const fn of this.listeners[ev] || []) fn(arg);
  }

  start(id, { cut = false } = {}) {
    const def = this.scenes[id];
    if (!def) throw new Error(`No scene "${id}"`);
    const env = { state: this.state, sound: this.sound, R: this.R, director: this };
    this.scene = { id, def, inst: def.create(env), env };
    this.t = 0;
    this.fired = new Set();
    this.choiceShown = false;
    this.choiceMade = false;
    this.leaving = null;
    this.fadeIn = cut ? 0 : FADE;
    this.ui.clearText();
    this.ui.hideChoice();
    if (def.mood !== undefined) this.sound.setMood(def.mood);
    if (def.ambience) this.sound.ambience(def.ambience);
    this.emit('scene', id);
  }

  // Leave the current scene for another, with a fade unless cut.
  go(next, { cut = false } = {}) {
    if (this.leaving) return;
    if (next === '@end') {
      this.leaving = { next, cut: false, t: 0 };
      return;
    }
    this.leaving = { next, cut, t: 0 };
  }

  choose(i) {
    const { def } = this.scene;
    const c = def.choice;
    if (!c || !this.choiceShown || this.choiceMade) return;
    const opt = c.options[i];
    if (!opt) return;
    this.choiceMade = true;
    opt.apply?.(this.state);
    this.state.choices.push(`${this.scene.id}:${i}`);
    saveState(this.state);
    this.sound.click();
    this.ui.pickChoice(i);
    this.emit('choice', { scene: this.scene.id, i });
    setTimeout(() => this.ui.hideChoice(), 450);
    const next = typeof opt.next === 'function' ? opt.next(this.state) : opt.next;
    this.go(next, { cut: !!opt.cut });
  }

  update(dt) {
    if (!this.scene || this.paused) return;
    const { def, inst } = this.scene;
    this.t += dt;
    const t = this.t;

    for (const [i, line] of (def.lines?.(this.state) || []).entries()) {
      if (t >= line.t && !this.fired.has(`l${i}`)) {
        this.fired.add(`l${i}`);
        this.ui.line(line.who, line.text, line.dur ?? 4, line.style);
      }
    }
    for (const [i, card] of (def.cards || []).entries()) {
      if (card.when && !card.when(this.state)) continue;
      if (t >= card.t && !this.fired.has(`c${i}`)) {
        this.fired.add(`c${i}`);
        this.ui.card(card.text, card.dur ?? 5);
      }
    }
    for (const [i, cue] of (def.cues || []).entries()) {
      if (t >= cue.t && !this.fired.has(`q${i}`)) {
        this.fired.add(`q${i}`);
        cue.fn(this.scene.env, inst);
      }
    }

    inst.update?.(t, dt);

    const c = def.choice;
    if (c && !this.choiceShown && t >= (c.at ?? def.duration)) {
      this.choiceShown = true;
      this.choiceStart = t;
      this.sound.sting();
      const prompt = typeof c.prompt === 'function' ? c.prompt(this.state) : c.prompt;
      this.ui.showChoice(prompt, c.options.map((o) => o.label), c.timed || 0, (i) => this.choose(i));
    }
    if (c && this.choiceShown && !this.choiceMade && c.timed) {
      const left = c.timed - (t - this.choiceStart);
      this.ui.choiceTimer(left / c.timed);
      if (left <= 0) this.choose(c.default ?? 0);
    }
    if (!c && !this.leaving && t >= def.duration) {
      const next = typeof def.next === 'function' ? def.next(this.state) : def.next;
      this.go(next, { cut: !!def.cutNext });
    }

    if (this.leaving) {
      this.leaving.t += dt;
      const dur = this.leaving.cut ? 0 : FADE;
      if (this.leaving.t >= dur) {
        const { next, cut } = this.leaving;
        if (next === '@end') {
          this.leaving = null;
          this.scene = null;
          this.sound.setMood('resolve');
          this.emit('end', this.state);
          return;
        }
        this.start(next, { cut });
      }
    }
  }

  fade() {
    let f = 0;
    if (this.fadeIn > 0) f = Math.max(f, 1 - this.t / this.fadeIn);
    if (this.leaving && !this.leaving.cut) f = Math.max(f, this.leaving.t / FADE);
    return Math.min(Math.max(f, 0), 1);
  }

  render(time) {
    if (!this.scene) return;
    const { inst } = this.scene;
    const t = this.t;
    const cam = inst.camera(t);
    this.R.cam.time = time;
    this.R.cam.set(cam);
    const look = inst.look(t);
    this.R.frame((R) => inst.draw(R, t), { ...look, time, fade: Math.max(look.fade || 0, this.fade()) });
  }
}
