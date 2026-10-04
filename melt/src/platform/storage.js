/**
 * MELT — persistence. Fail-safe wrapper around localStorage.
 * (Port note: Unity → PlayerPrefs, iOS → UserDefaults. Same keys.)
 */
const PREFIX = 'melt.';

export const storage = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(PREFIX + key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* quota / private mode */ }
  },
};

export const KEYS = Object.freeze({ BEST: 'best', MUTED: 'muted', GAMES: 'games', CLOSE_CALLS: 'closeCalls' });
