/**
 * Sky Temple — persistence. Thin, fail-safe wrapper around localStorage.
 * (Port note: Unity → PlayerPrefs, iOS → UserDefaults. Same three keys.)
 */
const PREFIX = 'skytemple.';

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* private mode / quota: ignore */
    }
  },
};

export const KEYS = Object.freeze({
  BEST: 'best',
  MUTED: 'muted',
  GAMES: 'games',
  TOTAL_PERFECTS: 'perfects',
});
