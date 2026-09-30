// Actions, not keys: gameplay asks "is jump pressed?" and the keyboard,
// a gamepad or on-screen touch buttons can all answer. Keyboard bindings
// are rebindable and persisted through settings.

export const ACTIONS = [
  ['left', 'Move left', 'تحرّك يساراً'],
  ['right', 'Move right', 'تحرّك يميناً'],
  ['run', 'Run (hold)', 'اركض (مع الضغط المستمر)'],
  ['jump', 'Jump / climb', 'اقفز / تسلّق'],
  ['crouch', 'Crouch (toggle)', 'انحنِ'],
  ['prone', 'Go prone (toggle)', 'انبطح'],
  ['interact', 'Interact / examine', 'تفاعل / تفحّص'],
  ['tool', 'Next tool', 'الأداة التالية'],
  ['use', 'Use tool (hold to crank the torch)', 'استخدم الأداة (اضغط مطوّلاً لشحن المصباح)'],
  ['skip', 'Next line (hold to keep skipping)', 'السطر التالي (اضغط باستمرار لمتابعة التخطّي)'],
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

// Standard gamepad mapping, and what each button is called on the pad.
const PAD = { jump: 0, prone: 1, interact: 2, tool: 3, use: 5, crouch: 4, menu: 9, run: 7, skip: 6 };
const PAD_NAMES = { jump: 'A', prone: 'B', interact: 'X', tool: 'Y', use: 'RB', crouch: 'LB', menu: 'Start', run: 'RT', skip: 'LT', left: '◀', right: '▶' };
// On a touchscreen, the on-screen button's own symbol.
const TOUCH_NAMES = { jump: '⤒', prone: '▁', crouch: '◣', interact: '✋', tool: '⇄', use: '◉', skip: '⏭', left: '◀', right: '▶', menu: '≡' };

export function keyLabel(code) {
  if (!code) return '·';
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
      this.device = 'keys';
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
    this.device = 'touch';
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
        if (on && !this.padPrev[a]) {
          this.pressed.add(a);
          this.device = 'pad';
        }
        this.padPrev[a] = on;
      }
      if (pad.buttons[13]?.pressed && !this.padPrev.dpadDown) this.pressed.add('crouch');
      this.padPrev.dpadDown = !!pad.buttons[13]?.pressed;
    }
  }

  // How an action should be shown in a prompt, for the device last used:
  // a key, a pad button, or the on-screen button's symbol.
  label(action) {
    if (this.device === 'pad') return PAD_NAMES[action] || '·';
    if (this.device === 'touch') return TOUCH_NAMES[action] || '·';
    return keyLabel(this.bindings()[action]?.[0]);
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
