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
