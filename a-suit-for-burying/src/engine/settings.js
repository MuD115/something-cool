// Player settings, persisted per browser. Every read and write is guarded:
// private windows and sandboxed frames may refuse storage, and the story must
// still run on defaults.

const KEY = 'a-suit-for-burying:settings:v1';

export const DEFAULTS = {
  master: 1,
  music: 1,
  effects: 1,
  subtitles: true,
  textSize: 1,
  shake: true,
};

export class Settings {
  constructor(key = KEY, defaults = DEFAULTS) {
    this.key = key;
    this.defaults = defaults;
    this.values = structuredClone(defaults);
    this.listeners = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch {
      /* storage unavailable: defaults it is */
    }
  }

  get(k) {
    return this.values[k];
  }

  set(k, v) {
    this.values[k] = v;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.values));
    } catch {
      /* not persisted, still applied */
    }
    for (const fn of this.listeners) fn(k, v);
  }

  reset() {
    for (const k of Object.keys(this.defaults)) this.set(k, structuredClone(this.defaults[k]));
  }

  onChange(fn) {
    this.listeners.push(fn);
  }
}
