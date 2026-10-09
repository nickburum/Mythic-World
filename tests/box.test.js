import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, byId, readBest, formatBest, applySettings, SETTING_KEYS, gcScore } from '../src/games.js';

const store = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };

test('the box holds five distinct games with their own folders', () => {
  assert.equal(GAMES.length, 5);
  assert.equal(new Set(GAMES.map(g => g.id)).size, 5);
  assert.equal(new Set(GAMES.map(g => g.path)).size, 5);
  for (const g of GAMES) assert.match(g.path, /\/$/);
  assert.equal(byId('skip').name, 'SKIP');
  assert.equal(byId('nope'), null);
});

test('best scores read from each game\'s own storage format', () => {
  const s = store();
  assert.equal(readBest(byId('melt'), s.getItem), 0);
  s.setItem('melt.best', '42');
  assert.equal(readBest(byId('melt'), s.getItem), 42);
  s.setItem('skip.board', JSON.stringify([{ score: 123.4, at: 1 }, { score: 50, at: 2 }]));
  assert.equal(readBest(byId('skip'), s.getItem), 123.4);
  s.setItem('skip.board', 'garbage');
  assert.equal(readBest(byId('skip'), s.getItem), 0);
  assert.equal(formatBest(byId('skip'), 123.4), '123.4 m');
  assert.equal(formatBest(byId('melt'), 42), '42');
  assert.equal(formatBest(byId('melt'), 0), '—');
});

test('box settings fan out to every game in its own encoding', () => {
  const s = store();
  applySettings({ sound: false, haptics: true, quality: 'low' }, s.setItem);
  for (const k of SETTING_KEYS.sound) assert.equal(s.getItem(k), 'true', `${k} muted`);
  for (const k of SETTING_KEYS.haptics) assert.equal(s.getItem(k), 'true');
  for (const k of SETTING_KEYS.quality) assert.equal(s.getItem(k), '"low"');
  applySettings({ sound: true, haptics: false }, s.setItem);
  assert.equal(s.getItem('melt.muted'), 'false');
  assert.equal(s.getItem('skip.quality'), '"auto"');
});

test('every game has a Game Center leaderboard and integer scores', () => {
  for (const g of GAMES) assert.match(g.leaderboardID, /^com\.mythicworld\./);
  assert.equal(gcScore(byId('skip'), 123.45), 1235);
  assert.equal(gcScore(byId('pop'), 42), 42);
});
