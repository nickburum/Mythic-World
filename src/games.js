/**
 * Game Box — the catalogue. Pure data + helpers (no DOM) so the hub, the
 * tests and the native shell agree on what is in the box.
 *
 * Each game is a self-contained folder with its own index.html. Best scores
 * are read straight from the game's own localStorage keys (same origin), so
 * the hub needs no messaging to show them.
 */
export const GAMES = [
  { id: 'melt', name: 'MELT', tagline: 'Tap to change state.', path: 'melt/', accent: '#3aa7ff', accent2: '#ff8a5b',
    best: { key: 'melt.best', kind: 'int', unit: '' }, control: 'Tap' },
  { id: 'skip', name: 'SKIP', tagline: 'Tap when the stone kisses the water.', path: 'skip/', accent: '#ffb36b', accent2: '#5b6fd6',
    best: { key: 'skip.board', kind: 'board', unit: ' m' }, control: 'Tap', leaderboardID: 'com.mythicworld.skip.distance' },
  { id: 'pop', name: 'POP', tagline: 'Pop the bubbles that match.', path: 'pop/', accent: '#ff7ab6', accent2: '#7df0ff',
    best: { key: 'pop.best', kind: 'int', unit: '' }, control: 'Tap' },
  { id: 'orbit', name: 'ORBIT', tagline: 'Tap to reverse. Dodge. Collect.', path: 'orbit/', accent: '#7df0ff', accent2: '#b98cff',
    best: { key: 'orbit.best', kind: 'int', unit: '' }, control: 'Tap' },
  { id: 'sky-temple', name: 'SKY TEMPLE', tagline: 'Stack stones to the gods.', path: 'sky-temple/', accent: '#ff9a5b', accent2: '#4ea3ff',
    best: { key: 'skytemple.best', kind: 'int', unit: '' }, control: 'Tap' },
];

export const byId = (id) => GAMES.find(g => g.id === id) || null;

/** Read a game's best score from a raw key/value store (localStorage-like `getItem`). */
export function readBest(game, getItem) {
  let raw;
  try { raw = getItem(game.best.key); } catch { return 0; }
  if (raw === null || raw === undefined) return 0;
  let v; try { v = JSON.parse(raw); } catch { v = Number(raw); }
  if (game.best.kind === 'board') return Array.isArray(v) && v.length ? Number(v[0].score) || 0 : 0;
  return Number(v) || 0;
}

export function formatBest(game, value) {
  if (!value) return '—';
  return game.best.kind === 'board' ? `${value.toFixed(1)}${game.best.unit}` : `${Math.round(value)}${game.best.unit}`;
}

/**
 * Box-wide settings written into every game's own keys so each picks them
 * up on launch. Values are JSON-encoded like the games' storage wrappers do.
 */
export const SETTING_KEYS = {
  sound: ['melt.muted', 'skip.muted', 'pop.muted', 'orbit.muted', 'skytemple.muted'],     // stored as muted = !sound
  haptics: ['skip.haptics', 'pop.haptics', 'orbit.haptics'],
  quality: ['skip.quality', 'pop.quality', 'orbit.quality'],
};

export function applySettings(settings, setItem) {
  for (const k of SETTING_KEYS.sound) setItem(k, JSON.stringify(!settings.sound));
  for (const k of SETTING_KEYS.haptics) setItem(k, JSON.stringify(!!settings.haptics));
  for (const k of SETTING_KEYS.quality) setItem(k, JSON.stringify(settings.quality || 'auto'));
}

/** Clear every game's scores (not settings). */
export const SCORE_KEYS = ['melt.best', 'melt.games', 'skip.board', 'skip.friends', 'skip.games', 'pop.best', 'pop.games', 'orbit.best', 'orbit.games', 'skytemple.best', 'skytemple.games'];
