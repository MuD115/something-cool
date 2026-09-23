// Game menus: a main menu, an Esc pause menu, and the pages they share
// (settings, controls, about). Pure DOM, keyboard- and pad-navigable, styled
// by the host page through the .menu* classes.
//
// new Menu(root, {
//   main: [{ id, label, sub, action, hidden() }],   main-menu buttons
//   pause: [{ id, label, action }],                  pause-menu buttons
//   settings: [{ key, label, type, ... }],           settings schema
//   controls: { input, actions } | { list },         rebindable or static
//   about: html string,
//   header: html string shown above the main menu,
//   onOpen, onClose                                   pause hooks
// })

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

export class Menu {
  constructor(root, opts) {
    this.root = root;
    this.o = opts;
    this.stack = [];
    this.mode = null; // 'main' | 'pause' | null
    root.classList.add('menu');
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.addEventListener('keydown', (e) => this.nav(e));
  }

  get open() {
    return this.mode !== null;
  }

  showMain() {
    this.mode = 'main';
    this.stack = ['main'];
    this.render();
  }

  showPause() {
    if (this.mode) return;
    this.mode = 'pause';
    this.stack = ['pause'];
    this.o.onOpen?.();
    this.render();
  }

  close() {
    const was = this.mode;
    this.mode = null;
    this.stack = [];
    this.root.hidden = true;
    this.root.innerHTML = '';
    if (was === 'pause') this.o.onClose?.();
  }

  push(page) {
    this.stack.push(page);
    this.render();
  }

  back() {
    if (this.stack.length > 1) {
      this.stack.pop();
      this.render();
    } else if (this.mode === 'pause') this.close();
  }

  // Esc from the game or inside the menu.
  toggle() {
    if (this.mode === 'pause') this.back();
    else if (this.mode === 'main') {
      if (this.stack.length > 1) this.back();
    } else this.showPause();
  }

  render() {
    const page = this.stack[this.stack.length - 1];
    this.root.hidden = false;
    this.root.dataset.page = page;
    this.root.dataset.mode = this.mode;
    this.root.innerHTML = '';
    const panel = el('div', 'menu-panel');
    this.root.appendChild(panel);
    const build = { main: this.pageMain, pause: this.pagePause, settings: this.pageSettings, controls: this.pageControls, about: this.pageAbout }[page];
    build.call(this, panel);
    requestAnimationFrame(() => panel.querySelector('button, input, select')?.focus({ preventScroll: true }));
  }

  list(panel, items) {
    const ul = el('div', 'menu-list');
    for (const it of items) {
      if (it.hidden?.()) continue;
      const b = el('button', 'menu-btn');
      b.type = 'button';
      b.innerHTML = `<span class="menu-btn-label">${it.label}</span>${it.sub ? `<span class="menu-btn-sub">${it.sub}</span>` : ''}`;
      b.addEventListener('click', () => it.action(this));
      ul.appendChild(b);
    }
    panel.appendChild(ul);
  }

  heading(panel, title, sub) {
    panel.appendChild(el('h2', 'menu-title', title));
    if (sub) panel.appendChild(el('p', 'menu-sub', sub));
  }

  backButton(panel, label = 'Back') {
    const b = el('button', 'menu-back', `← ${label}`);
    b.type = 'button';
    b.addEventListener('click', () => this.back());
    panel.appendChild(b);
  }

  pageMain(panel) {
    if (this.o.header) panel.appendChild(el('div', 'menu-header', this.o.header));
    this.list(panel, this.o.main);
  }

  pagePause(panel) {
    this.heading(panel, this.o.pauseTitle || 'Paused');
    this.list(panel, this.o.pause);
  }

  pageAbout(panel) {
    panel.appendChild(el('div', 'menu-about', this.o.about));
    this.backButton(panel);
  }

  pageSettings(panel) {
    this.heading(panel, 'Settings');
    const s = this.o.settingsStore;
    const form = el('div', 'menu-form');
    for (const f of this.o.settings) {
      const row = el('label', 'menu-row');
      const id = `set-${f.key}`;
      row.htmlFor = id;
      row.appendChild(el('span', 'menu-row-label', f.label));
      let input;
      if (f.type === 'range') {
        input = el('input');
        input.type = 'range';
        input.min = f.min ?? 0;
        input.max = f.max ?? 1;
        input.step = f.step ?? 0.05;
        input.value = s.get(f.key);
        const out = el('output', 'menu-row-value', fmt(f, s.get(f.key)));
        input.addEventListener('input', () => {
          s.set(f.key, +input.value);
          out.textContent = fmt(f, +input.value);
        });
        row.appendChild(input);
        row.appendChild(out);
      } else if (f.type === 'select') {
        input = el('select');
        for (const [v, label] of f.options) {
          const o = el('option', '', label);
          o.value = v;
          input.appendChild(o);
        }
        input.value = String(s.get(f.key));
        input.addEventListener('change', () => s.set(f.key, isNaN(+input.value) ? input.value : +input.value));
        row.appendChild(input);
      } else {
        input = el('input');
        input.type = 'checkbox';
        input.checked = !!s.get(f.key);
        input.addEventListener('change', () => s.set(f.key, input.checked));
        row.appendChild(input);
      }
      input.id = id;
      form.appendChild(row);
    }
    panel.appendChild(form);
    const reset = el('button', 'menu-link', 'Restore defaults');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      const keys = s.get('keys');
      s.reset();
      if (keys && !this.o.resetKeys) s.set('keys', keys);
      this.render();
    });
    panel.appendChild(reset);
    this.backButton(panel);
  }

  pageControls(panel) {
    this.heading(panel, 'Controls', this.o.controls.input ? 'Select a key to change it, then press the new key.' : '');
    const c = this.o.controls;
    const table = el('div', 'menu-keys');
    if (c.input) {
      const input = c.input;
      const b = input.bindings();
      for (const [a, label, ar] of c.actions) {
        const row = el('div', 'menu-key-row');
        row.appendChild(el('span', 'menu-row-label', `${label}${ar ? ` <span class="ar" lang="ar" dir="rtl">${ar}</span>` : ''}`));
        const keys = el('span', 'menu-key-slots');
        for (let slot = 0; slot < 2; slot++) {
          const k = el('button', 'menu-key', c.label(b[a]?.[slot]));
          k.type = 'button';
          k.addEventListener('click', () => {
            k.textContent = 'Press a key…';
            k.classList.add('listening');
            input.capture = (code) => {
              if (code !== 'Escape') input.rebind(a, slot, code);
              this.render();
            };
          });
          keys.appendChild(k);
        }
        row.appendChild(keys);
        table.appendChild(row);
      }
    } else {
      for (const [keysLabel, what] of c.list) {
        const row = el('div', 'menu-key-row');
        row.appendChild(el('span', 'menu-row-label', what));
        row.appendChild(el('span', 'menu-key static', keysLabel));
        table.appendChild(row);
      }
    }
    panel.appendChild(table);
    if (c.extra) panel.appendChild(el('p', 'menu-sub', c.extra));
    this.backButton(panel);
  }

  // Arrow keys move between controls; Esc goes back.
  nav(e) {
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (e.target.closest?.('.listening')) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.mode === 'main' && this.stack.length === 1) return;
      this.back();
      return;
    }
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    if (e.target.tagName === 'SELECT') return;
    const items = [...this.root.querySelectorAll('button, input, select')];
    const i = items.indexOf(document.activeElement);
    const n = items[(i + (e.code === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    n?.focus();
    e.preventDefault();
  }
}

function fmt(f, v) {
  if (f.format) return f.format(v);
  return `${Math.round(v * 100)}%`;
}
