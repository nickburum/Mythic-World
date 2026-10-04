import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeltGame, PHASE, OBSTACLES, tapsBetween, nextPhase, hotter, colder, autopilot } from '../src/core/melt.js';
import { CONFIG } from '../src/core/config.js';

const DT = 1 / 60;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function run(g, seconds) { for (let t = 0; t < seconds; t += DT) g.update(DT); }
function placeOnly(g, type, x) { g.obstacles = []; g.nextSpawnX = 1e9; g.lastObstacle = null; return g.spawn(type, x); }
/** Tap with a cooldown gap so the debounce never swallows one. */
function tapTo(g, phase) { while (g.phase !== phase) { g.tap(); g.update(CONFIG.TAP_COOLDOWN + 0.01); } }

test('starts as water, grounded', () => {
  const g = new MeltGame({ random: rng(1) });
  assert.equal(g.phase, PHASE.WATER); assert.equal(g.altitude, 0); assert.ok(g.obstacles.length >= 1);
});
test('one tap cycles ice → water → steam → ice', () => {
  assert.equal(nextPhase('ice'), 'water'); assert.equal(nextPhase('water'), 'steam'); assert.equal(nextPhase('steam'), 'ice');
  assert.equal(tapsBetween('steam', 'ice'), 1); assert.equal(tapsBetween('ice', 'steam'), 2); assert.equal(tapsBetween('water', 'water'), 0);
  const g = new MeltGame({ random: rng(2) }); placeOnly(g, 'beam', 5000);
  const seen = []; g.on('phase', e => seen.push(e.to));
  tapTo(g, 'steam'); tapTo(g, 'ice');
  assert.deepEqual(seen, ['steam', 'ice']);
});
test('taps are debounced', () => {
  const g = new MeltGame({ random: rng(3) }); placeOnly(g, 'beam', 5000);
  assert.equal(g.tap(), 'steam'); assert.equal(g.tap(), null, 'second tap within the cooldown is ignored');
  g.update(CONFIG.TAP_COOLDOWN + 0.01); assert.equal(g.tap(), 'ice');
});
test('steam floats up; anything else sinks', () => {
  const g = new MeltGame({ random: rng(4) }); placeOnly(g, 'beam', 5000);
  tapTo(g, 'steam'); run(g, 0.5); assert.equal(g.altitude, 1);
  tapTo(g, 'ice'); run(g, 0.5); assert.equal(g.altitude, 0);
});
test('spikes need steam, beam blocks steam, glass needs ice, pipe needs water', () => {
  const dead = (type, phase, x = CONFIG.PLAYER_X + 300) => { const g = new MeltGame({ random: rng(5) }); placeOnly(g, type, x); tapTo(g, phase); run(g, 2.5); return g.over; };
  assert.equal(dead('spikes', 'steam'), false); assert.equal(dead('spikes', 'water'), true); assert.equal(dead('spikes', 'ice'), true);
  assert.equal(dead('beam', 'water'), false); assert.equal(dead('beam', 'ice'), false); assert.equal(dead('beam', 'steam'), true);
  assert.equal(dead('glass', 'ice'), false); assert.equal(dead('glass', 'water'), true);
  assert.equal(dead('pipe', 'water'), false); assert.equal(dead('pipe', 'ice'), true);
});
test('hazards shove one step and never kill', () => {
  assert.equal(hotter('water'), 'steam'); assert.equal(hotter('steam'), 'steam'); assert.equal(colder('water'), 'ice'); assert.equal(colder('ice'), 'ice');
  const g = new MeltGame({ random: rng(6) }); placeOnly(g, 'geyser', CONFIG.PLAYER_X + 120);
  let hits = 0; g.on('hazard', () => hits++);
  run(g, 1.5); assert.equal(hits, 1); assert.equal(g.phase, 'steam'); assert.ok(!g.over);
});
test('gaps are budgeted for the worst legitimate phase leaving an obstacle', () => {
  const g = new MeltGame({ random: rng(7) }); g.score = 100;
  const speed = g.speedForScore(100), d = CONFIG.DIFFICULTY_END;
  // leaving a beam as ice, spikes need two taps; leaving a beam as water, one tap → budget two
  assert.ok(Math.abs(g.gapAfter({ type: 'beam' }, 'spikes') - CONFIG.TIME_TWO * d * speed) < 1e-6);
  // leaving spikes (steam), glass is one tap (steam → ice)
  assert.ok(Math.abs(g.gapAfter({ type: 'spikes' }, 'glass') - CONFIG.TIME_ONE * d * speed) < 1e-6);
  // leaving glass (ice), a beam needs nothing
  assert.ok(Math.abs(g.gapAfter({ type: 'glass' }, 'beam') - CONFIG.TIME_SAME * d * speed) < 1e-6);
  // leaving a pipe (water), glass is two taps around the cycle
  assert.ok(Math.abs(g.gapAfter({ type: 'pipe' }, 'glass') - CONFIG.TIME_TWO * d * speed) < 1e-6);
});
test('types unlock with score; speed ramps and caps', () => {
  const g = new MeltGame({ random: rng(8) });
  assert.deepEqual(g.unlockedTypes('obstacle').sort(), ['beam', 'spikes']); g.score = 30;
  assert.deepEqual(g.unlockedTypes('hazard').sort(), ['geyser', 'vent']);
  assert.equal(g.speedForScore(0), CONFIG.BASE_SPEED); assert.equal(g.speedForScore(1e6), CONFIG.MAX_SPEED);
});
test('every generated course is beatable with a 0.25 s reaction (20 seeds × 120 passes)', () => {
  for (let seed = 100; seed < 120; seed++) {
    const g = new MeltGame({ random: rng(seed) });
    const queue = []; let steps = 0, lastTap = -1;
    while (g.score < 120 && !g.over && steps < 60 * 400) {
      queue.push(autopilot(g));
      const want = queue.length > 15 ? queue.shift() : false;
      if (want && autopilot(g) && g.time - lastTap > 0.15) { g.tap(); lastTap = g.time; }
      g.update(DT); steps++;
    }
    assert.ok(!g.over, `seed ${seed} died at ${g.score} as ${g.deathPhase}`);
    assert.equal(g.score, 120, `seed ${seed} stalled at ${g.score}`);
  }
});
test('milestones fire in order; close calls are counted', () => {
  const g = new MeltGame({ random: rng(9) }); const hit = []; g.on('milestone', m => hit.push(m.score)); let near = 0; g.on('nearmiss', () => near++);
  const queue = []; let lastTap = -1;
  while (g.score < 21 && !g.over) { queue.push(autopilot(g)); const want = queue.length > 12 ? queue.shift() : false; if (want && autopilot(g) && g.time - lastTap > 0.15) { g.tap(); lastTap = g.time; } g.update(DT); }
  assert.ok(!g.over); assert.deepEqual(hit, [10, 20]); assert.equal(near, g.closeCalls);
});
test('a player who never taps dies within a few obstacles; reset restores a fresh run', () => {
  const g = new MeltGame({ random: rng(10) }); run(g, 30); assert.ok(g.over); assert.ok(g.score < 8);
  g.reset(); assert.ok(!g.over); assert.equal(g.score, 0); assert.equal(g.phase, PHASE.WATER);
});
test('obstacle catalogue is consistent', () => {
  for (const [k, v] of Object.entries(OBSTACLES)) { assert.ok(v.kind === 'obstacle' || v.kind === 'hazard', k); if (v.kind === 'obstacle') assert.ok(v.needs.length >= 1); }
});
