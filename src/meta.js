/**
 * Game Box — the meta: one currency (XP), levels, unlocks, the daily run
 * and the streak. Pure functions, no DOM; the hub and extras.js call these.
 * Keys live under `gamebox.*` (see cloud.js for merge rules).
 */
import { GAMES } from './games.js';

export const LEVEL_CAP = 50;
/** XP to go from level L to L+1. */
export const levelCost = (L) => Math.min(600, 100 + 50 * (L - 1));
/** Level for a total XP: { level, into, need } (need = cost of the current level). */
export function level(xp) {
  let L = 1, rest = Math.max(0, Math.floor(xp || 0));
  while (L < LEVEL_CAP && rest >= levelCost(L)) { rest -= levelCost(L); L++; }
  return { level: L, into: L >= LEVEL_CAP ? 0 : rest, need: L >= LEVEL_CAP ? 0 : levelCost(L) };
}

/** Unlock schedule: level → { game, theme, name }. Themes are palette swaps the games already support. */
export const UNLOCKS = [
  { level: 2, game: 'skip', theme: 'midnight', name: 'Midnight' }, { level: 3, game: 'melt', theme: 'ember', name: 'Ember' },
  { level: 4, game: 'pop', theme: 'candy', name: 'Candy' }, { level: 5, game: 'orbit', theme: 'solar', name: 'Solar' },
  { level: 6, game: 'sky-temple', theme: 'dusk', name: 'Dusk' }, { level: 7, game: 'skip', theme: 'dawn', name: 'Dawn' },
  { level: 8, game: 'melt', theme: 'neon', name: 'Neon' }, { level: 9, game: 'pop', theme: 'ink', name: 'Ink' },
  { level: 10, game: 'orbit', theme: 'nebula', name: 'Nebula' }, { level: 11, game: 'sky-temple', theme: 'jade', name: 'Jade' },
  { level: 12, game: 'box', theme: 'ivory', name: 'Ivory' }, { level: 13, game: 'skip', theme: 'aurora', name: 'Aurora' },
  { level: 14, game: 'melt', theme: 'mono', name: 'Mono' }, { level: 15, game: 'pop', theme: 'sunlit', name: 'Sunlit' },
  { level: 16, game: 'orbit', theme: 'retro', name: 'Retro' }, { level: 17, game: 'sky-temple', theme: 'marble', name: 'Marble' },
];
export const unlockedAt = (L) => UNLOCKS.filter(u => u.level <= L);
export const nextUnlock = (L) => UNLOCKS.find(u => u.level > L) || null;
/** Themes available for a game at level L (always includes 'default'). */
export const themesFor = (game, L) => ['default', ...UNLOCKS.filter(u => u.game === game && u.level <= L).map(u => u.theme)];

/* ───────────── XP per run ───────────── */
const BASE = {
  melt: (r) => (r.score || 0) + 2 * (r.closeCalls || 0),
  skip: (r) => Math.round((r.distance || 0) / 2) + 2 * (r.perfects || 0) + 3 * (r.motes || 0),
  pop: (r) => (r.score || 0) + (r.bestCombo || 0),
  orbit: (r) => 2 * (r.score || 0),
  'sky-temple': (r) => (r.score || 0) + (r.bestCombo || 0),
};
export const isWeekend = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;
/**
 * XP for a finished run. `r` = { score, distance?, perfects?, motes?, closeCalls?, bestCombo?, isBest?, daily?: { first: bool, streak: number } }.
 * Returns { base, best, daily, weekend, total }.
 */
export function runXp(gameId, r, now = new Date()) {
  const fn = BASE[gameId] || ((x) => x.score || 0);
  const primary = r.distance !== undefined ? r.distance : r.score;
  if (!primary || primary <= 0) return { base: 0, best: 0, daily: 0, weekend: 0, total: 0 };
  let base = Math.min(150, Math.max(0, Math.round(fn(r))));
  const weekend = isWeekend(now) ? Math.round(base * 0.5) : 0;
  const best = r.isBest ? 25 : 0;
  const daily = r.daily && r.daily.first ? 50 + 10 * Math.min(Math.max(0, (r.daily.streak || 1) - 1), 5) : 0;
  return { base, best, daily, weekend, total: base + weekend + best + daily };
}

/* ───────────── daily run ───────────── */
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayIndex = (key) => Math.floor(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 86400000);
export function fnv1a32(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function shuffled(arr, seed) { const a = arr.slice(); let s = seed >>> 0; for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Which game is today's, and its seed. Rotates through all five, never the same game two days running. */
export function dailyFor(key = dateKey()) {
  const ids = GAMES.map(g => g.id), n = ids.length, di = dayIndex(key);
  const pick = (d) => { const order = shuffled(ids, Math.floor(d / n) + 1); return order[((d % n) + n) % n]; };
  let game = pick(di);
  if (game === pick(di - 1)) game = ids[(ids.indexOf(game) + 1) % n];
  return { date: key, game, seed: fnv1a32(`${game}:${key}`) };
}
/** Days between two date keys. */
export const daysBetween = (a, b) => dayIndex(b) - dayIndex(a);
/**
 * Streak after completing the daily on `key`. s = { count, best, last, shield }.
 * Consecutive day → +1; one missed day with a shield → shield spent, +1; otherwise restart at 1.
 */
export function advanceStreak(s, key) {
  const cur = { count: 0, best: 0, last: null, shield: 0, ...(s || {}) };
  if (cur.last === key) return { ...cur, changed: false };
  let count, shieldSpent = false;
  if (!cur.last) count = 1;
  else { const gap = daysBetween(cur.last, key); if (gap === 1) count = cur.count + 1; else if (gap === 2 && cur.shield) { count = cur.count + 1; shieldSpent = true; } else count = 1; }
  let shield = shieldSpent ? 0 : cur.shield;
  if (count > 0 && count % 7 === 0) shield = 1;
  return { count, best: Math.max(cur.best, count), last: key, shield, changed: true, shieldSpent };
}
/** Is the streak still alive on `key` (today) without playing yet? */
export const streakAlive = (s, key = dateKey()) => !!(s && s.last && daysBetween(s.last, key) <= (s.shield ? 2 : 1));
