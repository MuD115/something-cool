// On-screen text: bilingual subtitles, examine notes, radio chatter, choices,
// control prompts, title cards, the tool bar and the objective. Arabic is set
// right-to-left above its English; settings choose which languages show.

const $ = (id) => document.getElementById(id);

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
    this.apply();
    settings.onChange(() => this.apply());
  }

  apply() {
    const stage = $('stage');
    stage.dataset.subs = this.settings.get('subtitles');
    stage.style.setProperty('--text-scale', this.settings.get('textSize'));
    stage.dataset.hints = this.settings.get('hints') ? 'on' : 'off';
  }

  // who: [arabic, english] | null; line: [arabic, english]; style: '' | 'examine' | 'radio' | 'thought'
  say(who, line, dur = 4, style = '') {
    const id = ++this.lineId;
    this.sub.dataset.style = style;
    this.sub.innerHTML = '';
    if (who) {
      const w = document.createElement('div');
      w.className = 'who';
      w.innerHTML = `<span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>`;
      w.querySelector('.ar').textContent = who[0];
      w.querySelector('.en').textContent = who[1];
      this.sub.appendChild(w);
    }
    const ar = document.createElement('p');
    ar.className = 'ar';
    ar.lang = 'ar';
    ar.dir = 'rtl';
    ar.textContent = line[0];
    const en = document.createElement('p');
    en.className = 'en';
    en.textContent = line[1];
    this.sub.append(ar, en);
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
    this.promptEl.innerHTML = `<kbd></kbd><span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>`;
    this.promptEl.querySelector('kbd').textContent = keys;
    this.promptEl.querySelector('.ar').textContent = ar;
    this.promptEl.querySelector('.en').textContent = en;
    this.promptEl.hidden = false;
  }

  // The small interaction hint that floats above the thing you can use.
  hint(x, y, key, label) {
    const h = this.hintEl;
    if (!label) {
      h.hidden = true;
      return;
    }
    if (h.dataset.label !== label) {
      h.dataset.label = label;
      h.innerHTML = `<kbd></kbd><span></span>`;
      h.querySelector('kbd').textContent = key;
      h.querySelector('span').textContent = label;
    }
    h.style.left = `${x * 100}%`;
    h.style.top = `${y * 100}%`;
    h.hidden = false;
  }

  objective(line) {
    if (!line) {
      this.objEl.hidden = true;
      return;
    }
    this.objEl.innerHTML = `<span class="ar" lang="ar" dir="rtl"></span><span class="en"></span>`;
    this.objEl.querySelector('.ar').textContent = line[0];
    this.objEl.querySelector('.en').textContent = line[1];
    this.objEl.hidden = false;
  }

  // tools: [{ id, ar, en }], active id, torch charge 0…1, torch on
  tools(list, active, charge, on) {
    const key = JSON.stringify([list.map((t) => t.id), active, on, Math.round(charge * 20)]);
    if (key === this.toolsKey) return;
    this.toolsKey = key;
    this.toolsEl.innerHTML = '';
    for (const t of list) {
      const d = document.createElement('div');
      d.className = `tool${t.id === active ? ' active' : ''}`;
      d.innerHTML = `<span class="tool-icon" data-tool="${t.id}"></span><span class="tool-name"><span class="ar" lang="ar" dir="rtl"></span><span class="en"></span></span>`;
      d.querySelector('.ar').textContent = t.ar;
      d.querySelector('.en').textContent = t.en;
      if (t.id === 'torch') {
        const bar = document.createElement('span');
        bar.className = `charge${on ? ' on' : ''}`;
        bar.style.setProperty('--c', charge.toFixed(2));
        d.appendChild(bar);
      }
      this.toolsEl.appendChild(d);
    }
    this.toolsEl.hidden = list.length === 0;
  }
}
