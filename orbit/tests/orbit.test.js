import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrbitGame, CONFIG, angDiff, autopilot } from '../src/core/orbit.js';
const DT = 1 / 60;
test('angDiff gives the signed shortest arc', () => {
  assert.ok(Math.abs(angDiff(0, 0.5) - 0.5) < 1e-9);
  assert.ok(Math.abs(angDiff(0.5, 0) + 0.5) < 1e-9);
  assert.ok(Math.abs(angDiff(0.1, Math.PI * 2 - 0.1) + 0.2) < 1e-9);
});
test('the comet orbits and a tap reverses it', () => {
  const g = new OrbitGame({ seed: 1 });
  const a0 = g.angle; g.update(0.1); assert.ok(angDiff(a0, g.angle) > 0);
  g.tap(); assert.equal(g.dir, -1); const a1 = g.angle; g.update(0.1); assert.ok(angDiff(a1, g.angle) < 0);
});
test('blockers warn before they are solid and only kill when solid', () => {
  const g = new OrbitGame({ seed: 2 });
  g.blocks = [{ id: 1, angle: g.angle, half: 0.4, age: 0, state: 'warn' }]; g.blockIn = 99; g.gemIn = 99;
  g.update(DT); assert.ok(!g.over, 'warning blocker is harmless');
  g.blocks[0].age = CONFIG.BLOCK_WARN; g.update(DT); assert.ok(!g.over, 'a warning never closes on the comet: it holds open');
  assert.equal(g.blocks[0].state, 'warn');
  g.blocks[0].state = 'solid'; g.update(DT); assert.ok(g.over, 'a solid blocker on the comet ends the run');
});
test('gems are collected on contact and score', () => {
  const g = new OrbitGame({ seed: 3 });
  g.gems = [{ id: 1, angle: g.angle + 0.3, age: 0 }]; g.blockIn = 99; g.gemIn = 99;
  let got = 0; g.on('collect', () => got++);
  for (let t = 0; t < 0.5; t += DT) g.update(DT);
  assert.equal(got, 1); assert.equal(g.score, 1); assert.equal(g.gems.length, 0);
});
test('a blocker never spawns on the comet or over another blocker', () => {
  const g = new OrbitGame({ seed: 4 });
  for (let i = 0; i < 200; i++) {
    g.blocks = []; g.angle = Math.random() * Math.PI * 2; g.dir = Math.random() < 0.5 ? 1 : -1;
    const b = g.spawnBlock(); if (!b) continue;
    assert.ok(Math.abs(angDiff(g.angle, b.angle)) > b.half + CONFIG.COMET_HALF, 'not on the comet');
    const b2 = g.spawnBlock(); if (b2) assert.ok(Math.abs(angDiff(b.angle, b2.angle)) > b.half + b2.half, 'no overlap');
  }
});
test('the autopilot survives 90 seconds on 8 seeds', () => {
  for (let seed = 10; seed < 18; seed++) {
    const g = new OrbitGame({ seed });
    let lastTap = -1;
    for (let t = 0; t < 90 && !g.over; t += DT) { if (t - lastTap > 0.25 && autopilot(g)) { g.tap(); lastTap = t; } g.update(DT); }
    assert.ok(!g.over, `seed ${seed} died at score ${g.score}`);
    assert.ok(g.score >= 20, `seed ${seed} only ${g.score}`);
  }
});

test('revive clears the ring and resumes', () => {
  const g = new OrbitGame({ seed: 9 });
  g.blocks = [{ id: 1, angle: g.angle, half: 0.4, age: CONFIG.BLOCK_WARN, state: 'solid' }]; g.blockIn = 99; g.gemIn = 99;
  g.update(DT); assert.ok(g.over);
  assert.ok(g.revive()); assert.ok(!g.over); assert.equal(g.blocks.length, 0);
  for (let t = 0; t < 1; t += DT) g.update(DT); assert.ok(!g.over);
});

test('a wall never closes on the comet: 0 deaths from closing walls (50 seeds x 60 s, comet never reverses into a solid wall)', async () => {
  const { OrbitGame } = await import('../src/core/orbit.js');
  let closeDeaths = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const g = new OrbitGame({ seed }); let died = null;
    g.on('gameover', (e) => { died = e; });
    for (let t = 0; t < 60 && !g.over; t += 1 / 60) {
      // a block that turned solid while the comet was already inside it would be a "closing wall" death
      const before = g.blocks.filter(b => b.state === 'warn').map(b => b.id);
      g.update(1 / 60);
      if (died && before.includes(died.block.id)) closeDeaths++;
    }
  }
  assert.equal(closeDeaths, 0);
});
test('momentum: gems score the multiplier, reversing resets it', async () => {
  const { OrbitGame } = await import('../src/core/orbit.js');
  const g = new OrbitGame({ seed: 3 });
  g.gems = [{ id: 1, angle: g.angle, age: 0 }]; g.update(0.0001); assert.equal(g.score, 1); assert.equal(g.mult, 2);
  g.gems = [{ id: 2, angle: g.angle, age: 0 }]; g.update(0.0001); assert.equal(g.score, 3); assert.equal(g.mult, 3);
  g.tap(); assert.equal(g.mult, 1);
  g.gems = [{ id: 3, angle: g.angle, age: 0 }]; g.update(0.0001); assert.equal(g.score, 4);
});
