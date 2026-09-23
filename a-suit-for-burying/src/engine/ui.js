// DOM overlays: subtitles, title cards, choices and the end card.

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.sub = $('sub');
    this.subWho = $('sub-who');
    this.subText = $('sub-text');
    this.cardEl = $('card');
    this.choiceEl = $('choice');
    this.promptEl = $('choice-prompt');
    this.optsEl = $('choice-opts');
    this.timerEl = $('choice-timer');
    this.timers = [];
    this.typing = null;
  }

  clearText() {
    this.sub.hidden = true;
    this.cardEl.classList.remove('show');
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  // Dialogue with a typewriter reveal.
  line(who, text, dur, style) {
    clearInterval(this.typing);
    this.sub.hidden = false;
    this.sub.dataset.style = style || '';
    this.subWho.textContent = who || '';
    this.subWho.hidden = !who;
    this.subText.textContent = '';
    let i = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) this.subText.textContent = text;
    else {
      this.typing = setInterval(() => {
        i += 2;
        this.subText.textContent = text.slice(0, i);
        if (i >= text.length) clearInterval(this.typing);
      }, 22);
    }
    const lineId = (this.lineId = (this.lineId || 0) + 1);
    const id = setTimeout(() => {
      if (this.lineId === lineId) this.sub.hidden = true;
    }, dur * 1000);
    this.timers.push(id);
  }

  card(text, dur) {
    this.cardEl.textContent = text;
    this.cardEl.classList.add('show');
    const id = setTimeout(() => this.cardEl.classList.remove('show'), dur * 1000);
    this.timers.push(id);
  }

  showChoice(prompt, labels, timed, onPick) {
    this.promptEl.textContent = prompt;
    this.optsEl.innerHTML = '';
    labels.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML = `<kbd>${i + 1}</kbd><span></span>`;
      b.querySelector('span').textContent = label;
      b.addEventListener('click', () => onPick(i));
      this.optsEl.appendChild(b);
    });
    this.timerEl.hidden = !timed;
    this.timerEl.style.setProperty('--left', '1');
    this.choiceEl.hidden = false;
    requestAnimationFrame(() => this.choiceEl.classList.add('show'));
    this.optsEl.querySelector('button')?.focus({ preventScroll: true });
  }

  choiceTimer(frac) {
    this.timerEl.style.setProperty('--left', String(Math.max(frac, 0)));
  }

  pickChoice(i) {
    this.optsEl.querySelectorAll('.opt').forEach((b, k) => b.classList.add(k === i ? 'picked' : 'faded'));
  }

  hideChoice() {
    this.choiceEl.classList.remove('show');
    this.choiceEl.hidden = true;
  }
}
