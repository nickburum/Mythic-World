import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeValue, mergeSnapshot, SYNC_KEYS } from '../src/cloud.js';
import { Music } from '../src/music.js';
import { encodeChallenge, decodeChallenge } from '../src/challenge.js';

test('cloud merge keeps the best of both worlds', () => {
  assert.equal(mergeValue('pop.best', '12', '30'), '30');
  assert.equal(mergeValue('pop.best', '40', '30'), '40');
  assert.equal(mergeValue('pop.best', undefined, '30'), '30');
  assert.equal(mergeValue('pop.best', '7', undefined), '7');
  assert.equal(mergeValue('pop.best', undefined, undefined), undefined);
  const a = JSON.stringify([{ score: 50, at: 1 }, { score: 20, at: 2 }]), b = JSON.stringify([{ score: 80, at: 3 }, { score: 50, at: 1 }]);
  assert.deepEqual(JSON.parse(mergeValue('skip.board', a, b)).map(e => e.score), [80, 50, 20]);
  const f1 = JSON.stringify([{ tag: 'SAM', score: 50, at: 1, seed: 1 }]), f2 = JSON.stringify([{ tag: 'SAM', score: 90, at: 2, seed: 2 }, { tag: 'AMY', score: 10, at: 3, seed: 3 }]);
  assert.deepEqual(JSON.parse(mergeValue('skip.friends', f1, f2)).map(e => [e.tag, e.score]), [['SAM', 90], ['AMY', 10]]);
  assert.equal(mergeValue('skip.name', '"NIK"', '"OLD"'), '"NIK"');
  assert.deepEqual(JSON.parse(mergeValue('gamebox.tutorials', '{"pop":true}', '{"skip":true}')), { pop: true, skip: true });
});

test('snapshot merge reports what changed on each side', () => {
  const { merged, changedLocal, changedCloud } = mergeSnapshot({ 'pop.best': '5', 'orbit.best': '9' }, { 'pop.best': '8', 'melt.best': '3' });
  assert.equal(merged['pop.best'], '8'); assert.equal(merged['orbit.best'], '9'); assert.equal(merged['melt.best'], '3');
  assert.deepEqual(changedLocal.sort(), ['melt.best', 'pop.best']);
  assert.deepEqual(changedCloud.sort(), ['orbit.best']);
  assert.ok(SYNC_KEYS.includes('skytemple.best'));
});

test('music is deterministic and stays in key', () => {
  const song = { bpm: 120, root: 60, scale: 'pentMajor', progression: [[0, 2, 4], [3, 5, 0]], seed: 4 };
  const a = new Music(song), b = new Music(song);
  const seq = (m) => Array.from({ length: 64 }, (_, i) => m.notesFor(i));
  assert.deepEqual(seq(a), seq(b));
  const pent = new Set([0, 2, 4, 7, 9]);
  for (const n of seq(a)) { for (const m of [n.bass, n.lead, ...(n.pad || [])]) if (m !== null && m !== undefined) assert.ok(pent.has(((m - 60) % 12 + 12) % 12), `note ${m} out of key`); }
  assert.ok(seq(a).some(n => n.lead !== null), 'has a melody');
  assert.ok(seq(a)[0].pad && seq(a)[16].pad, 'pad on bar starts');
  assert.notDeepEqual(seq(a), seq(new Music({ ...song, seed: 5 })), 'different seed, different tune');
});

test('challenge codec is shared', () => {
  assert.deepEqual(decodeChallenge(encodeChallenge({ seed: 9, score: 12, tag: 'abc' })), { seed: 9, score: 12, tag: 'ABC' });
});

test('meta keys merge by their own rules', () => {
  assert.equal(mergeValue('gamebox.xp', '120', '340'), '340');
  assert.equal(mergeValue('gamebox.adfree', 'false', 'true'), 'true');
  const d1 = JSON.stringify({ date: '2026-10-11', game: 'pop', seed: 1, best: 5, attempts: 1, done: true, claimed: false });
  const d2 = JSON.stringify({ date: '2026-10-11', game: 'pop', seed: 1, best: 9, attempts: 3, done: true, claimed: true });
  assert.deepEqual(JSON.parse(mergeValue('gamebox.daily', d1, d2)), { date: '2026-10-11', game: 'pop', seed: 1, best: 9, attempts: 3, done: true, claimed: true });
  assert.equal(JSON.parse(mergeValue('gamebox.daily', d1, JSON.stringify({ date: '2026-10-09', best: 99 }))).best, 5, 'newer date wins');
  const s1 = JSON.stringify({ count: 3, best: 3, last: '2026-10-10', shield: 0 }), s2 = JSON.stringify({ count: 4, best: 4, last: '2026-10-11', shield: 1 });
  assert.deepEqual(JSON.parse(mergeValue('gamebox.streak', s1, s2)), { count: 4, best: 4, last: '2026-10-11', shield: 1 });
  assert.deepEqual(JSON.parse(mergeValue('gamebox.days', '["2026-10-10"]', '["2026-10-09","2026-10-10"]')), ['2026-10-09', '2026-10-10']);
  assert.deepEqual(JSON.parse(mergeValue('gamebox.unlocks', '{"skip.midnight":200}', '{"skip.midnight":100,"melt.ember":300}')), { 'skip.midnight': 100, 'melt.ember': 300 });
});

test('age bands for the one-time ad age question (COPPA)', async () => {
  const { ageBandFor } = await import('../src/ads.js');
  const now = new Date('2026-10-11');
  assert.equal(ageBandFor(2016, now), 'child');
  assert.equal(ageBandFor(2014, now), 'child', '12 this year');
  assert.equal(ageBandFor(2013, now), 'teen', '13 this year');
  assert.equal(ageBandFor(2011, now), 'teen');
  assert.equal(ageBandFor(2010, now), 'adult', '16 this year');
  assert.equal(ageBandFor(1980, now), 'adult');
});
