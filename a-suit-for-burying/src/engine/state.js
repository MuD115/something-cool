// The player's story so far. Chapter 1 writes it; later chapters read it.

const KEY = 'a-suit-for-burying:v1';

export function freshState() {
  return {
    chapter: 1,
    resolve: null, // 'willing' | 'reluctant'
    armed: null, // true | false
    junePacked: false,
    trust: null, // 'high' | 'low'
    river: null, // 'carried' | 'struggled' | 'thrown'
    choices: [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...freshState(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode or blocked storage: the story still plays */
  }
}
