import { test } from 'node:test';
import assert from 'node:assert/strict';
import { level, levelCost, UNLOCKS, nextUnlock, themesFor, runXp, dailyFor, advanceStreak, streakAlive, dateKey, fnv1a32 } from '../src/meta.js';

test('level curve matches the spec table', () => {
  assert.equal(levelCost(1), 100); assert.equal(levelCost(11), 600); assert.equal(levelCost(30), 600);
  assert.deepEqual(level(0), { level: 1, into: 0, need: 100 });
  assert.equal(level(100).level, 2); assert.equal(level(250).level, 3); assert.equal(level(700).level, 5); assert.equal(level(1750).level, 8); assert.equal(level(2700).level, 10); assert.equal(level(8650).level, 20);
  assert.equal(level(249).level, 2); assert.equal(level(249).into, 149); assert.equal(level(249).need, 150);
  assert.equal(level(1e9).level, 50);
});
test('every level 2–17 unlocks something and next unlock is always visible', () => {
  for (let L = 2; L <= 17; L++) assert.ok(UNLOCKS.some(u => u.level === L), `level ${L}`);
  assert.equal(nextUnlock(1).level, 2); assert.equal(nextUnlock(4).game, 'orbit'); assert.equal(nextUnlock(99), null);
  assert.deepEqual(themesFor('skip', 1), ['default']); assert.deepEqual(themesFor('skip', 7), ['default', 'midnight', 'dawn']);
});
test('run XP per game, caps, bonuses and weekend', () => {
  const sat = new Date('2026-10-10T12:00:00'), wed = new Date('2026-10-07T12:00:00');
  assert.equal(runXp('melt', { score: 10, closeCalls: 2 }, wed).total, 14);
  assert.equal(runXp('skip', { distance: 100, perfects: 5, motes: 2 }, wed).base, 66);
  assert.equal(runXp('pop', { score: 20, bestCombo: 6 }, wed).base, 26);
  assert.equal(runXp('orbit', { score: 7 }, wed).base, 14);
  assert.equal(runXp('sky-temple', { score: 30, bestCombo: 9 }, wed).base, 39);
  assert.equal(runXp('pop', { score: 0 }, wed).total, 0, 'no XP for instant death');
  assert.equal(runXp('skip', { distance: 0 }, wed).total, 0);
  assert.equal(runXp('orbit', { score: 1000 }, wed).base, 150, 'cap');
  assert.equal(runXp('pop', { score: 10, isBest: true }, wed).best, 25);
  assert.equal(runXp('pop', { score: 10, daily: { first: true, streak: 1 } }, wed).daily, 50);
  assert.equal(runXp('pop', { score: 10, daily: { first: true, streak: 9 } }, wed).daily, 100);
  assert.equal(runXp('pop', { score: 10 }, sat).weekend, 5);
});
test('daily rotates games, never repeats a day, and is deterministic', () => {
  const a = dailyFor('2026-10-11'), b = dailyFor('2026-10-11');
  assert.deepEqual(a, b); assert.equal(a.seed, fnv1a32(`${a.game}:2026-10-11`));
  let prev = null; const seen = new Set();
  for (let d = 1; d <= 30; d++) { const k = `2026-10-${String(d).padStart(2, '0')}`; const g = dailyFor(k).game; assert.notEqual(g, prev, k); prev = g; seen.add(g); }
  assert.equal(seen.size, 5, 'all five games get a day');
  assert.match(dateKey(new Date('2026-03-05T10:00:00')), /^2026-03-05$/);
});
test('streak advances on consecutive days, shields one miss, earns a shield every 7', () => {
  let s = advanceStreak(null, '2026-10-01'); assert.equal(s.count, 1);
  s = advanceStreak(s, '2026-10-01'); assert.equal(s.changed, false, 'same day is idempotent');
  for (let d = 2; d <= 7; d++) s = advanceStreak(s, `2026-10-${String(d).padStart(2, '0')}`);
  assert.equal(s.count, 7); assert.equal(s.shield, 1, 'shield earned at 7');
  s = advanceStreak(s, '2026-10-09'); assert.equal(s.count, 8); assert.equal(s.shield, 0); assert.ok(s.shieldSpent);
  s = advanceStreak(s, '2026-10-12'); assert.equal(s.count, 1, 'two misses reset');
  assert.equal(s.best, 8);
  assert.ok(streakAlive({ last: '2026-10-12', shield: 0 }, '2026-10-13'));
  assert.ok(!streakAlive({ last: '2026-10-12', shield: 0 }, '2026-10-14'));
  assert.ok(streakAlive({ last: '2026-10-12', shield: 1 }, '2026-10-14'));
});
