import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PopGame, CONFIG, autopilot } from '../src/core/pop.js';

const DT = 1 / 60;
test('starts with three lives, a target colour and no bubbles', () => {
  const g = new PopGame({ seed: 1 });
  assert.equal(g.lives, 3); assert.ok(g.target >= 0 && g.target < CONFIG.COLORS); assert.equal(g.bubbles.length, 0);
});
test('bubbles spawn from the bottom and rise', () => {
  const g = new PopGame({ seed: 2 });
  for (let t = 0; t < 1.5; t += DT) g.update(DT);
  assert.ok(g.bubbles.length >= 1);
  const b = g.bubbles[0]; const y0 = b.y; g.update(DT); assert.ok(b.y < y0);
});
test('popping a target bubble scores; the wrong colour costs a life', () => {
  const g = new PopGame({ seed: 3 });
  g.bubbles = [{ id: 1, x: 100, y: 300, r: 30, color: g.target, vy: 80, wob: 0, wobAmp: 0 }, { id: 2, x: 300, y: 300, r: 30, color: (g.target + 1) % CONFIG.COLORS, vy: 80, wob: 0, wobAmp: 0 }];
  assert.equal(g.tap(100, 300).kind, 'pop'); assert.equal(g.score, 1); assert.equal(g.combo, 1);
  assert.equal(g.tap(300, 300).kind, 'wrong'); assert.equal(g.lives, 2); assert.equal(g.combo, 0);
  assert.equal(g.tap(10, 10).kind, 'miss');
});
test('fat-finger slop lets a near tap count', () => {
  const g = new PopGame({ seed: 4 });
  g.bubbles = [{ id: 1, x: 100, y: 300, r: 25, color: g.target, vy: 80, wob: 0, wobAmp: 0 }];
  assert.equal(g.tap(100 + 25 + CONFIG.TAP_SLOP - 1, 300).kind, 'pop');
});
test('a target bubble escaping the top costs a life; others do not', () => {
  const g = new PopGame({ seed: 5 });
  g.bubbles = [{ id: 1, x: 100, y: 5, r: 20, color: g.target, vy: 1000, wob: 0, wobAmp: 0 }, { id: 2, x: 200, y: 5, r: 20, color: (g.target + 1) % CONFIG.COLORS, vy: 1000, wob: 0, wobAmp: 0 }];
  g.spawnIn = 99; g.update(0.1);
  assert.equal(g.lives, 2); assert.equal(g.bubbles.length, 0);
});
test('the target colour changes every TARGET_EVERY pops and the game ends at zero lives', () => {
  const g = new PopGame({ seed: 6 });
  const targets = []; g.on('target', e => targets.push(e.to));
  for (let i = 0; i < CONFIG.TARGET_EVERY; i++) { g.bubbles = [{ id: i, x: 100, y: 300, r: 30, color: g.target, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); }
  assert.equal(targets.length, 1); assert.notEqual(targets[0], undefined);
  let over = null; g.on('gameover', e => { over = e; });
  for (let i = 0; i < 3; i++) { g.bubbles = [{ id: 99 + i, x: 100, y: 300, r: 30, color: (g.target + 1) % CONFIG.COLORS, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); }
  assert.ok(g.over); assert.equal(over.score, CONFIG.TARGET_EVERY);
});
test('a steady player (one tap every 0.2 s) survives 60 seconds and scores well', () => {
  const g = new PopGame({ seed: 7 });
  let lastTap = -1;
  for (let t = 0; t < 60; t += DT) { const tp = autopilot(g); if (tp && t - lastTap >= 0.2) { g.tap(tp.x, tp.y); lastTap = t; } g.update(DT); }
  assert.ok(!g.over, `died at ${g.score}`); assert.ok(g.score >= 20, `score ${g.score}`);
});
