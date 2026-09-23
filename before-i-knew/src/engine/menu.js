// Game menus: a main menu, an Esc pause menu, and the pages they share
// (settings, controls, about, and any custom pages such as the dialogue
// log). Pure DOM, keyboard- and pad-navigable, styled by the host page
// through the .menu* classes. Labels go through opts.t (the i18n table) and
// are read again on every render, so switching language redraws in place.
//
// new Menu(root, {
//   t(key) → string, dir() → 'ltr' | 'rtl',
//   header() → html shown above the main menu,
//   main: [{ label() , sub(), action, hidden() }],
//   pause: [{ label(), action }], pauseAside() → html,
//   settings: [{ group } | { key, label, type, options: [[value, labelKey]] }],
//   controls: { input, actions, label }, about() → html,
//   pages: { name: (panel, menu) => void },
//   onOpen, onClose
// })

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const val = (v) => (typeof v === 'function' ? v() : v);

export class Menu {
  constructor(root, opts) {
    this.root = root;
    this.o = opts;
    this.t = opts.t || ((k) => k);
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
    const focusIdx = this.keepFocus ? [...this.root.querySelectorAll('button, input, select')].indexOf(document.activeElement) : -1;
    this.root.hidden = false;
    this.root.dataset.page = page;
    this.root.dataset.mode = this.mode;
    this.root.dir = this.o.dir?.() || 'ltr';
    this.root.lang = this.root.dir === 'rtl' ? 'ar' : 'en';
    this.root.innerHTML = '';
    const panel = el('div', `menu-panel page-${page}`);
    this.root.appendChild(panel);
    const build = { main: this.pageMain, pause: this.pagePause, settings: this.pageSettings, controls: this.pageControls, about: this.pageAbout }[page];
    if (build) build.call(this, panel);
    else this.o.pages?.[page]?.(panel, this);
    requestAnimationFrame(() => {
      const items = [...panel.querySelectorAll('button, input, select')];
      (items[focusIdx] || items[0])?.focus({ preventScroll: true });
      this.keepFocus = false;
    });
  }

  list(panel, items) {
    const ul = el('div', 'menu-list');
    let n = 0;
    for (const it of items) {
      if (it.hidden?.()) continue;
      n++;
      const b = el('button', 'menu-btn');
      b.type = 'button';
      const sub = val(it.sub);
      b.innerHTML = `<span class="menu-btn-n">${String(n).padStart(2, '0')}</span><span class="menu-btn-text"><span class="menu-btn-label"></span>${sub ? '<span class="menu-btn-sub"></span>' : ''}</span>`;
      b.querySelector('.menu-btn-label').textContent = val(it.label);
      if (sub) b.querySelector('.menu-btn-sub').textContent = sub;
      b.addEventListener('click', () => it.action(this));
      ul.appendChild(b);
    }
    panel.appendChild(ul);
  }

  heading(panel, title, sub) {
    panel.appendChild(el('h2', 'menu-title', title));
    if (sub) panel.appendChild(el('p', 'menu-sub', sub));
  }

  backButton(panel) {
    const b = el('button', 'menu-back', `<span aria-hidden="true" class="menu-back-arrow"></span>${this.t('back')}`);
    b.type = 'button';
    b.addEventListener('click', () => this.back());
    panel.appendChild(b);
  }

  pageMain(panel) {
    if (this.o.header) panel.appendChild(el('div', 'menu-header', val(this.o.header)));
    this.list(panel, this.o.main);
  }

  pagePause(panel) {
    const cols = el('div', 'menu-cols');
    const left = el('div', 'menu-col');
    this.heading(left, this.t('paused'));
    this.list(left, this.o.pause);
    cols.appendChild(left);
    if (this.o.pauseAside) cols.appendChild(el('aside', 'menu-aside', val(this.o.pauseAside)));
    panel.appendChild(cols);
  }

  pageAbout(panel) {
    panel.appendChild(el('div', 'menu-about', val(this.o.about)));
    this.backButton(panel);
  }

  pageSettings(panel) {
    this.heading(panel, this.t('settings'));
    const s = this.o.settingsStore;
    const form = el('div', 'menu-form');
    for (const f of this.o.settings) {
      if (f.group) {
        form.appendChild(el('h3', 'menu-group', this.t(f.group)));
        continue;
      }
      const row = el('label', `menu-row type-${f.type}`);
      const id = `set-${f.key}`;
      row.htmlFor = id;
      row.appendChild(el('span', 'menu-row-label', this.t(f.label)));
      let input;
      if (f.type === 'range') {
        input = el('input');
        input.type = 'range';
        input.min = f.min ?? 0;
        input.max = f.max ?? 1;
        input.step = f.step ?? 0.05;
        input.value = s.get(f.key);
        input.style.setProperty('--fill', `${(s.get(f.key) / (f.max ?? 1)) * 100}%`);
        const out = el('output', 'menu-row-value', fmt(f, s.get(f.key)));
        input.addEventListener('input', () => {
          s.set(f.key, +input.value);
          out.textContent = fmt(f, +input.value);
          input.style.setProperty('--fill', `${(+input.value / (f.max ?? 1)) * 100}%`);
        });
        row.appendChild(input);
        row.appendChild(out);
      } else if (f.type === 'select') {
        input = el('select');
        for (const [v, label] of f.options) {
          const o = el('option', '', this.t(label));
          o.value = v;
          input.appendChild(o);
        }
        input.value = String(s.get(f.key));
        input.addEventListener('change', () => {
          s.set(f.key, isNaN(+input.value) ? input.value : +input.value);
          if (f.redraw) {
            this.keepFocus = true;
            this.render();
          }
        });
        row.appendChild(input);
      } else {
        input = el('input');
        input.type = 'checkbox';
        input.setAttribute('role', 'switch');
        input.checked = !!s.get(f.key);
        input.addEventListener('change', () => s.set(f.key, input.checked));
        row.appendChild(input);
      }
      input.id = id;
      form.appendChild(row);
    }
    panel.appendChild(form);
    const foot = el('div', 'menu-foot');
    const reset = el('button', 'menu-link', this.t('restore'));
    reset.type = 'button';
    reset.addEventListener('click', () => {
      const keys = s.get('keys');
      const lang = s.get('lang');
      s.reset();
      s.set('keys', keys);
      s.set('lang', lang);
      this.render();
    });
    this.backButton(foot);
    foot.appendChild(reset);
    panel.appendChild(foot);
  }

  pageControls(panel) {
    const c = this.o.controls;
    this.heading(panel, this.t('controls'), this.t('rebindHelp'));
    const table = el('div', 'menu-keys');
    const input = c.input;
    const b = input.bindings();
    const ar = this.root.dir === 'rtl';
    for (const [a, en, arLabel] of c.actions) {
      const row = el('div', 'menu-key-row');
      row.appendChild(el('span', 'menu-row-label', ar ? arLabel : en));
      const keys = el('span', 'menu-key-slots');
      for (let slot = 0; slot < 2; slot++) {
        const k = el('button', 'menu-key');
        k.type = 'button';
        k.textContent = c.label(b[a]?.[slot]);
        k.addEventListener('click', () => {
          k.textContent = this.t('pressKey');
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
    panel.appendChild(table);
    panel.appendChild(el('p', 'menu-sub', this.t('controlsExtra')));
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
