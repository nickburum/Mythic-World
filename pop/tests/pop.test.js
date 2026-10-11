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
test('the first target colour changes after TARGET_EVERY_START pops and the game ends at zero lives', () => {
  const g = new PopGame({ seed: 6 });
  const targets = []; g.on('target', e => targets.push(e.to));
  // break the chain once so no frenzy starts, then pop TARGET_EVERY targets
  for (let i = 0; i < CONFIG.TARGET_EVERY_START; i++) { g.bubbles = [{ id: i, x: 100, y: 300, r: 30, color: g.target, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); if (i === 4) g.combo = 0; }
  assert.equal(targets.length, 1); assert.notEqual(targets[0], undefined);
  let over = null; g.on('gameover', e => { over = e; });
  const scored = g.score;
  for (let i = 0; i < 3; i++) { g.bubbles = [{ id: 99 + i, x: 100, y: 300, r: 30, color: (g.target + 1) % CONFIG.COLORS, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); }
  assert.ok(g.over); assert.equal(over.score, scored);
});
test('a steady player (one tap every 0.2 s) survives 60 seconds and scores well', () => {
  const g = new PopGame({ seed: 7 });
  let lastTap = -1;
  for (let t = 0; t < 60; t += DT) { const tp = autopilot(g); if (tp && t - lastTap >= 0.2) { g.tap(tp.x, tp.y); lastTap = t; } g.update(DT); }
  assert.ok(!g.over, `died at ${g.score}`); assert.ok(g.score >= 20, `score ${g.score}`);
});

test('revive gives two lives and a clear screen', () => {
  const g = new PopGame({ seed: 8 });
  for (let i = 0; i < 3; i++) { g.bubbles = [{ id: i, x: 100, y: 300, r: 30, color: (g.target + 1) % CONFIG.COLORS, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); }
  assert.ok(g.over); assert.ok(g.revive()); assert.ok(!g.over); assert.equal(g.lives, 2); assert.equal(g.bubbles.length, 0); assert.equal(g.revive(), false);
});

test('chains are worth more: 1 point, then 2 from the 6th in a row', () => {
  const g = new PopGame({ seed: 9 });
  const pts = [];
  for (let i = 0; i < 7; i++) { g.bubbles = [{ id: i, x: 100, y: 300, r: 30, color: g.target, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); pts.push(g.score); }
  assert.deepEqual(pts, [1, 2, 3, 4, 5, 7, 9]);
});
test('ten in a row starts a frenzy: every bubble is the target, then the target switches', () => {
  const g = new PopGame({ seed: 10, config: { TARGET_EVERY_START: 99, TARGET_EVERY: 99 } });
  let frenzy = null, switched = 0; g.on('frenzy', e => { frenzy = e; }); g.on('target', () => switched++);
  for (let i = 0; i < 10; i++) { g.bubbles = [{ id: i, x: 100, y: 300, r: 30, color: g.target, vy: 80, wob: 0, wobAmp: 0 }, { id: 50 + i, x: 300, y: 600, r: 30, color: (g.target + 1) % CONFIG.COLORS, vy: 80, wob: 0, wobAmp: 0 }]; g.tap(100, 300); }
  assert.ok(frenzy && g.frenzy); assert.ok(g.bubbles.every(b => b.color === g.target)); assert.equal(switched, 0);
  for (let t = 0; t < CONFIG.FRENZY_TIME + 0.2; t += DT) g.update(DT);
  assert.ok(!g.frenzy); assert.equal(switched, 1); assert.equal(g.lives, 3, 'escapes during a frenzy are free');
});
test('a target switch never costs a life to a bubble already near the top', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const g = new PopGame({ seed });
    for (let t = 0; t < 4; t += DT) g.update(DT);
    let lost = 0; g.on('life', () => lost++);
    g.changeTarget();
    for (let t = 0; t < 1; t += DT) g.update(DT);
    assert.equal(lost, 0, `seed ${seed}`);
  }
});
test('a human-like player (0.3 s reaction, one tap per 0.25 s) survives 45 s on most seeds', () => {
  let survived = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = new PopGame({ seed }); let lastTap = -1, seen = new Map();
    for (let t = 0; t < 45 && !g.over; t += DT) {
      for (const b of g.bubbles) if (!seen.has(b.id)) seen.set(b.id, t);
      if (t - lastTap >= 0.25) { let pick = null; for (const b of g.bubbles) if (b.color === g.target && t - seen.get(b.id) >= 0.3 && (!pick || b.y < pick.y)) pick = b; if (pick) { g.tap(g.bubbleX(pick), pick.y); lastTap = t; } }
      g.update(DT);
    }
    if (!g.over) survived++;
  }
  assert.ok(survived >= 14, `survived ${survived}/20`);
});

test('chain pop: touching target bubbles pop together, link n scores n', () => {
  const g = new PopGame({ seed: 11 });
  const T = g.target, O = (T + 1) % CONFIG.COLORS;
  g.bubbles = [
    { id: 1, x: 100, y: 300, r: 28, color: T, vy: 80, wob: 0, wobAmp: 0 },
    { id: 2, x: 160, y: 310, r: 28, color: T, vy: 80, wob: 0, wobAmp: 0 },   // touches 1
    { id: 3, x: 220, y: 300, r: 28, color: T, vy: 80, wob: 0, wobAmp: 0 },   // touches 2 only
    { id: 4, x: 160, y: 250, r: 28, color: O, vy: 80, wob: 0, wobAmp: 0 },   // other colour: stays
    { id: 5, x: 360, y: 600, r: 28, color: T, vy: 80, wob: 0, wobAmp: 0 },   // far: stays
  ];
  const res = g.tap(100, 300);
  assert.equal(res.chain, 3); assert.equal(g.score, 1 + 2 + 3);
  assert.deepEqual(g.bubbles.map(b => b.id).sort(), [4, 5]);
});
test('the opening is busy: a quick player has a target to pop most of the time', () => {
  const g = new PopGame({ seed: 12 }); let withTarget = 0, frames = 0;
  for (let t = 0; t < 20; t += DT) { g.update(DT); if (t > 1.5) { frames++; if (g.bubbles.some(b => b.color === g.target && b.y < CONFIG.WORLD_H)) withTarget++; } }
  assert.ok(withTarget / frames > 0.85, `${Math.round(100 * withTarget / frames)}% of frames`);
});
