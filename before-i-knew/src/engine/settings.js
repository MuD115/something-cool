// Player settings, persisted per browser. Every read and write is guarded:
// private windows and sandboxed frames may refuse storage, and the game must
// still run on defaults.

import { DEFAULT_KEYS } from './input.js';

const KEY = 'before-i-knew:settings:v1';

export const DEFAULTS = {
  master: 0.9,
  music: 0.7,
  effects: 0.9,
  subtitles: 'both', // 'both' | 'en' | 'ar'
  textSize: 1,
  shake: true,
  reduceFlashes: false,
  hints: true,
  lang: 'en', // menu language: 'en' | 'ar'
  backing: 'off', // subtitle backing: 'off' | 'light' | 'dark'
  quality: 'auto', // 'auto' | 'low' | 'medium' | 'high'
  keys: DEFAULT_KEYS,
  version: 2,
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
    // older saves: subtitles now default to no backing
    if ((this.values.version || 1) < 2) {
      this.values.backing = 'off';
      this.values.version = 2;
    }
    // new actions added after a save still get their default keys
    if (defaults.keys) this.values.keys = { ...defaults.keys, ...this.values.keys };
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
