// Actions, not keys: gameplay asks "is jump pressed?" and the keyboard,
// a gamepad or on-screen touch buttons can all answer. Keyboard bindings
// are rebindable and persisted through settings.

export const ACTIONS = [
  ['left', 'Move left', 'روح عاليسار'],
  ['right', 'Move right', 'روح عاليمين'],
  ['run', 'Run (hold)', 'اركض'],
  ['jump', 'Jump / climb', 'نطّ / اطلع'],
  ['crouch', 'Crouch (toggle)', 'وطّي'],
  ['prone', 'Go prone (toggle)', 'انبطح'],
  ['interact', 'Interact / examine', 'استعمل / اتفرّج'],
  ['tool', 'Next tool', 'الغرض الجاي'],
  ['use', 'Use tool (hold to crank the torch)', 'استعمل الغرض'],
  ['skip', 'Skip line (hold)', 'فوّت الحكي (ضل ضاغط)'],
  ['menu', 'Menu', 'القائمة'],
];

export const DEFAULT_KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  crouch: ['KeyC', 'ArrowDown'],
  prone: ['KeyZ'],
  interact: ['KeyE', 'Enter'],
  tool: ['KeyQ', 'Tab'],
  use: ['KeyF'],
  skip: ['KeyX', 'Backspace'],
  menu: ['Escape', 'KeyP'],
};

// Standard gamepad mapping.
const PAD = { jump: 0, prone: 1, interact: 2, tool: 3, use: 5, crouch: 4, menu: 9, run: 7, skip: 6 };

export function keyLabel(code) {
  if (!code) return '—';
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ShiftLeft', 'Shift')
    .replace('ShiftRight', 'R-Shift')
    .replace('Escape', 'Esc');
}

export class Input {
  constructor(settings) {
    this.settings = settings;
    this.down = new Set(); // action names currently held
    this.pressed = new Set(); // pressed this frame
    this.keys = new Set();
    this.touch = new Set();
    this.padPrev = {};
    this.listeners = [];
    this.capture = null; // rebinding: next key goes here

    window.addEventListener('keydown', (e) => {
      if (this.capture) {
        e.preventDefault();
        const fn = this.capture;
        this.capture = null;
        fn(e.code);
        return;
      }
      if (e.target.closest?.('input, select, textarea')) return;
      const acts = this.actionsFor(e.code);
      if (acts.length) {
        if (!e.target.closest?.('button') || !['interact', 'jump'].some((a) => acts.includes(a))) e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(e.code);
      for (const a of acts) this.pressed.add(a);
      for (const fn of this.listeners) fn(e);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  bindings() {
    return this.settings.get('keys');
  }

  actionsFor(code) {
    const b = this.bindings();
    return Object.keys(b).filter((a) => b[a].includes(code));
  }

  onKey(fn) {
    this.listeners.push(fn);
  }

  rebind(action, slot, code) {
    const b = structuredClone(this.bindings());
    // a key can only do one thing
    for (const a in b) b[a] = b[a].map((c) => (c === code ? null : c));
    b[action][slot] = code;
    for (const a in b) b[a] = b[a].filter(Boolean);
    this.settings.set('keys', b);
  }

  // Touch buttons call these.
  touchDown(a) {
    if (!this.touch.has(a)) this.pressed.add(a);
    this.touch.add(a);
  }
  touchUp(a) {
    this.touch.delete(a);
  }

  // Poll once per frame, before gameplay reads it.
  poll() {
    const b = this.bindings();
    this.down.clear();
    for (const a in b) if (b[a].some((c) => this.keys.has(c))) this.down.add(a);
    for (const a of this.touch) this.down.add(a);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] || 0;
      if (ax < -0.4 || pad.buttons[14]?.pressed) this.down.add('left');
      if (ax > 0.4 || pad.buttons[15]?.pressed) this.down.add('right');
      if (Math.abs(ax) > 0.9) this.down.add('run');
      for (const a in PAD) {
        const on = !!pad.buttons[PAD[a]]?.pressed;
        if (on) this.down.add(a);
        if (on && !this.padPrev[a]) this.pressed.add(a);
        this.padPrev[a] = on;
      }
      if (pad.buttons[13]?.pressed && !this.padPrev.dpadDown) this.pressed.add('crouch');
      this.padPrev.dpadDown = !!pad.buttons[13]?.pressed;
    }
  }

  // Anything at all held or pressed this frame (for idle detection).
  busy() {
    return this.down.size > 0 || this.pressed.size > 0;
  }

  held(a) {
    return this.down.has(a);
  }

  hit(a) {
    return this.pressed.has(a);
  }

  endFrame() {
    this.pressed.clear();
  }
}
