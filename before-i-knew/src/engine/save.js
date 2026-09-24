// Story state (the bible's state variables) and the last checkpoint.

const KEY = 'before-i-knew:save:v1';

export function freshState() {
  return {
    act: 'act1', // 'act1' | 'act2r' (Act Two, Retrieval)
    checkpoint: 'walk',
    compassion: 0,
    courage: 0,
    isolation: 0,
    grief_response: null, // 'action' | 'witness' | 'withdrawal'
    path: null, // 'retrieval' | 'witness' | 'grief'
    children_helped: false,
    helped_old_man: null,
    tools: ['torch'],
    choices: [],
    completed: false,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...freshState(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* the story still plays */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
