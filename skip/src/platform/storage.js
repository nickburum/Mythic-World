/** SKIP — persistence. Fail-safe localStorage wrapper. (PlayerPrefs / UserDefaults on native.) */
const PREFIX = 'skip.';
export const storage = {
  get(key, fallback) { try { const raw = localStorage.getItem(PREFIX + key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ } },
};
export const KEYS = Object.freeze({ BEST: 'best', MUTED: 'muted', HAPTICS: 'haptics', GAMES: 'games', BOARD: 'board', NAME: 'name', SEEN_HOWTO: 'seenHowto' });
