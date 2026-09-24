// On-screen text: bilingual subtitles, examine notes, radio chatter, choices,
// control prompts, title cards, the tool bar and the objective. Arabic is set
// right-to-left above its English; settings choose which languages show.

import { lang } from './i18n.js';

const $ = (id) => document.getElementById(id);

// Interface text (prompts, hints, the objective, tool and speaker names)
// shows in the menu language only; dialogue follows the subtitles setting.
// pair: [arabic, english]. Returns a span in the right script and direction.
function uiSpan(pair) {
  const ar = lang() === 'ar';
  const el = document.createElement('span');
  el.className = `ui ${ar ? 'ar' : 'en'}`;
  el.lang = ar ? 'ar' : 'en';
  el.dir = ar ? 'rtl' : 'ltr';
  el.textContent = pair[ar ? 0 : 1];
  return el;
}

export class Text {
  constructor(settings) {
    this.settings = settings;
    this.sub = $('sub');
    this.card = $('card');
    this.choiceEl = $('choice');
    this.promptEl = $('prompt');
    this.hintEl = $('hint');
    this.objEl = $('objective');
    this.toolsEl = $('tools');
    this.lineTimer = 0;
    this.lineId = 0;
    this.queue = [];
    this.log = []; // every line said this session: { who, line, style }
    this.apply();
    settings.onChange((k) => {
      this.apply();
      if (k === 'lang') this.relang();
    });
  }

  // The menu language changed mid-game: redraw what's showing.
  relang() {
    if (this.promptArgs && !this.promptEl.hidden) this.prompt(...this.promptArgs);
    if (this.current) {
      const fresh = this.objEl.classList.contains('fresh');
      this.objective(this.current);
      if (!fresh) this.objEl.classList.remove('fresh');
    }
    this.toolsKey = null;
    if (this.toolsArgs) this.tools(...this.toolsArgs);
    this.hintEl.dataset.label = '';
  }

  apply() {
    const stage = $('stage');
    stage.dataset.subs = this.settings.get('subtitles');
    stage.style.setProperty('--text-scale', this.settings.get('textSize'));
    stage.dataset.hints = this.settings.get('hints') ? 'on' : 'off';
    stage.dataset.backing = this.settings.get('backing') || 'light';
  }

  // who: [arabic, english] | null; line: [arabic, english]; style: '' | 'examine' | 'radio' | 'thought'
  say(who, line, dur = 4, style = '') {
    const id = ++this.lineId;
    this.lineStart = performance.now();
    const last = this.log[this.log.length - 1];
    if (!last || last.line[1] !== line[1]) {
      this.log.push({ who, line, style });
      if (this.log.length > 400) this.log.shift();
    }
    this.sub.dataset.style = style;
    this.sub.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'sub-box';
    this.sub.appendChild(box);
    if (who) {
      const w = document.createElement('div');
      w.className = 'who';
      w.appendChild(uiSpan(who));
      box.appendChild(w);
    }
    const ar = document.createElement('p');
    ar.className = 'ar';
    ar.lang = 'ar';
    ar.dir = 'rtl';
    ar.textContent = line[0];
    const en = document.createElement('p');
    en.className = 'en';
    en.textContent = line[1];
    box.append(ar, en);
    this.sub.hidden = false;
    this.lineUntil = performance.now() + dur * 1000;
    clearTimeout(this.lineTimer);
    this.lineTimer = setTimeout(() => {
      if (this.lineId === id) this.sub.hidden = true;
    }, dur * 1000);
    return id;
  }

  clearLine() {
    this.lineId++;
    this.sub.hidden = true;
  }

  titleCard(lines, dur = 5) {
    this.card.innerHTML = '';
    for (const [ar, en] of lines) {
      const p = document.createElement('p');
      p.innerHTML = `<span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>`;
      p.querySelector('.ar').textContent = ar;
      p.querySelector('.en').textContent = en;
      this.card.appendChild(p);
    }
    this.card.classList.add('show');
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => this.card.classList.remove('show'), dur * 1000);
  }

  hideCard() {
    this.card.classList.remove('show');
  }

  // options: [{ ar, en, note }]; returns via onPick(i)
  choice(prompt, options, onPick) {
    const el = this.choiceEl;
    el.innerHTML = '';
    if (prompt) {
      const p = document.createElement('p');
      p.className = 'choice-prompt';
      p.innerHTML = `<span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>`;
      p.querySelector('.ar').textContent = prompt[0];
      p.querySelector('.en').textContent = prompt[1];
      el.appendChild(p);
    }
    const row = document.createElement('div');
    row.className = 'choice-opts';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="opt-text"><span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>${o.note ? '<span class="note"></span>' : ''}</span>`;
      b.querySelector('.ar').textContent = o.ar;
      b.querySelector('.en').textContent = o.en;
      if (o.note) b.querySelector('.note').textContent = o.note;
      b.addEventListener('click', () => onPick(i));
      row.appendChild(b);
    });
    el.appendChild(row);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    this.choiceOpen = true;
  }

  pick(i) {
    this.choiceEl.querySelectorAll('.opt').forEach((b, k) => b.classList.add(k === i ? 'picked' : 'faded'));
    setTimeout(() => this.hideChoice(), 500);
  }

  hideChoice() {
    this.choiceEl.classList.remove('show');
    this.choiceEl.hidden = true;
    this.choiceOpen = false;
  }

  // Big centred control prompt, e.g. "[C] انحني / Crouch down".
  prompt(keys, ar, en) {
    if (!keys) {
      this.promptEl.hidden = true;
      return;
    }
    this.promptArgs = [keys, ar, en];
    this.promptEl.innerHTML = '<kbd></kbd>';
    this.promptEl.querySelector('kbd').textContent = keys;
    this.promptEl.appendChild(uiSpan([ar, en]));
    this.promptEl.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    this.promptEl.hidden = false;
  }

  // The small interaction hint that floats above the thing you can use.
  // label: [arabic, english]
  hint(x, y, key, label) {
    const h = this.hintEl;
    if (!label) {
      h.hidden = true;
      h.dataset.label = '';
      return;
    }
    const id = `${key}|${label[0]}|${label[1]}|${lang()}`;
    if (h.dataset.label !== id) {
      h.dataset.label = id;
      h.innerHTML = '<kbd></kbd>';
      h.querySelector('kbd').textContent = key;
      h.appendChild(uiSpan(label));
      h.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    }
    h.style.left = `${x * 100}%`;
    h.style.top = `${y * 100}%`;
    h.hidden = false;
  }

  // The current objective shows in full when it changes, then folds down to
  // a small marker (the pause menu always shows it).
  objective(line) {
    this.current = line;
    clearTimeout(this.objTimer);
    if (!line) {
      this.objEl.hidden = true;
      return;
    }
    this.objEl.innerHTML = `<span class="obj-mark" aria-hidden="true"></span><span class="obj-text"></span>`;
    this.objEl.querySelector('.obj-text').appendChild(uiSpan(line));
    this.objEl.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    this.objEl.hidden = false;
    this.objEl.classList.add('fresh');
    this.objTimer = setTimeout(() => this.objEl.classList.remove('fresh'), 8000);
  }

  // tools: [{ id, ar, en }], active id, torch charge 0…1, torch on, use key
  tools(list, active, charge, on, useKey = 'F') {
    this.toolsArgs = [list, active, charge, on, useKey];
    const key = JSON.stringify([list.map((t) => t.id), active, on, Math.round(charge * 40), useKey, lang()]);
    if (key === this.toolsKey) return;
    this.toolsKey = key;
    this.toolsEl.innerHTML = '';
    for (const t of list) {
      const d = document.createElement('div');
      d.className = `tool${t.id === active ? ' active' : ''}${t.id === 'torch' && on ? ' lit' : ''}`;
      const ring =
        t.id === 'torch'
          ? `<svg class="tool-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" class="ring-bg"/><circle cx="20" cy="20" r="17" class="ring-fg" pathLength="100" stroke-dasharray="${(charge * 100).toFixed(1)} 100"/></svg>`
          : '';
      d.innerHTML = `<span class="tool-badge">${ring}<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[t.id] || ''}</svg></span><span class="tool-name"></span>${t.id === active ? '<kbd class="tool-key"></kbd>' : ''}`;
      d.querySelector('.tool-name').appendChild(uiSpan([t.ar, t.en]));
      if (t.id === active) d.querySelector('.tool-key').textContent = useKey;
      this.toolsEl.appendChild(d);
    }
    this.toolsEl.hidden = list.length === 0;
    this.toolsEl.dir = lang() === 'ar' ? 'rtl' : 'ltr';
  }
}

// Line icons for the tools, drawn on a 24-unit grid.
const ICONS = {
  torch:
    '<path d="M4 9.5h7l6-3.5v12l-6-3.5H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 14.5v3.5h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M19.5 9l2-1.5M19.5 12h2.5M19.5 15l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" class="beam"/>',
  mirror:
    '<path d="M6 21 9.5 3.5l9 4.5-5.5 13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.5 8.5l4 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>',
  walkie:
    '<path d="M9 2.5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="6.5" y="7.5" width="11" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 11.5h5M9.5 14h5M9.5 16.5h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  lighter:
    '<rect x="7" y="9" width="10" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 12.5h10" stroke="currentColor" stroke-width="1.2"/><path d="M12 7.5c-1.6-1.4-1-3.4.4-5 .3 1.4 1.8 2.3 1.2 4-.3.8-1 1.1-1.6 1z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" class="beam"/>',
  journal:
    '<path d="M6 3.5h11.5v17H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 3.5v17M11 8h4.5M11 11h4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  whitecloth:
    '<path d="M5 22V2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 3.5c3-1.2 5 1 8 0s4.5-.8 6 0v8c-1.5-.8-3-1-6 0s-5-1.2-8 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
};
