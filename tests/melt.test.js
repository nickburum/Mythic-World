import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeltGame, PHASE, OBSTACLES, phaseForTemp, phaseDistance, autopilot } from '../src/core/melt.js';
import { CONFIG } from '../src/core/config.js';

const DT = 1 / 60;

/** Deterministic PRNG so failures reproduce. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Run until the given time passes, holding or not. */
function run(g, seconds, holding) {
  for (let t = 0; t < seconds; t += DT) g.update(DT, holding);
}

/** Replace the generated course with a single obstacle at `x`. */
function placeOnly(g, type, x) {
  g.obstacles = [];
  g.nextSpawnX = 1e9; // stop generation
  g.lastObstacle = null;
  return g.spawn(type, x);
}

test('starts as water, grounded, at the configured temperature', () => {
  const g = new MeltGame({ random: rng(1) });
  assert.equal(g.temp, CONFIG.TEMP_START);
  assert.equal(g.phase, PHASE.WATER);
  assert.equal(g.altitude, 0);
  assert.equal(g.score, 0);
  assert.ok(g.obstacles.length >= 1, 'course is pre-populated');
});

test('phase thresholds', () => {
  assert.equal(phaseForTemp(0), PHASE.ICE);
  assert.equal(phaseForTemp(CONFIG.ICE_MAX - 0.01), PHASE.ICE);
  assert.equal(phaseForTemp(CONFIG.ICE_MAX), PHASE.WATER);
  assert.equal(phaseForTemp(CONFIG.STEAM_MIN - 0.01), PHASE.WATER);
  assert.equal(phaseForTemp(CONFIG.STEAM_MIN), PHASE.STEAM);
  assert.equal(phaseForTemp(100), PHASE.STEAM);
});

test('holding heats to steam and floats up; releasing cools to ice and sinks', () => {
  const g = new MeltGame({ random: rng(2) });
  placeOnly(g, 'spikes', 5000);
  const changes = [];
  g.on('phase', e => changes.push(e.to));
  run(g, 1.0, true);
  assert.equal(g.phase, PHASE.STEAM);
  assert.ok(g.temp > CONFIG.STEAM_MIN);
  run(g, 0.5, true);
  assert.equal(g.altitude, 1);
  run(g, 2.0, false);
  assert.equal(g.phase, PHASE.ICE);
  assert.equal(g.altitude, 0);
  assert.equal(g.temp, 0, 'temperature clamps at 0');
  assert.deepEqual(changes, ['steam', 'water', 'ice']);
});

test('heating from the start reaches steam in a human-scale time', () => {
  const g = new MeltGame({ random: rng(3) });
  placeOnly(g, 'spikes', 5000);
  let t = 0;
  while (g.phase !== PHASE.STEAM) { g.update(DT, true); t += DT; }
  assert.ok(t > 0.2 && t < 0.6, `took ${t.toFixed(2)}s`);
});

test('spikes kill a grounded droplet and let steam pass', () => {
  const die = new MeltGame({ random: rng(4) });
  placeOnly(die, 'spikes', CONFIG.PLAYER_X + 60);
  let dead = null;
  die.on('die', e => { dead = e; });
  run(die, 1.5, false);
  assert.ok(die.over);
  assert.equal(dead.obstacle.type, 'spikes');

  const live = new MeltGame({ random: rng(4) });
  placeOnly(live, 'spikes', CONFIG.PLAYER_X + 400);
  run(live, 2.0, true); // heat to steam, float, then cross
  assert.ok(!live.over);
  assert.equal(live.score, 1);
});

test('beam kills steam and lets ice or water pass', () => {
  const g = new MeltGame({ random: rng(5) });
  placeOnly(g, 'beam', CONFIG.PLAYER_X + 400);
  run(g, 2.0, true);
  assert.ok(g.over);

  const w = new MeltGame({ random: rng(5) });
  placeOnly(w, 'beam', CONFIG.PLAYER_X + 200);
  // hover in the water band
  for (let t = 0; t < 2; t += DT) w.update(DT, w.temp < 50);
  assert.ok(!w.over);
  assert.equal(w.score, 1);
});

test('glass needs ice, pipe needs water', () => {
  const g1 = new MeltGame({ random: rng(6) });
  placeOnly(g1, 'glass', CONFIG.PLAYER_X + 500);
  run(g1, 2.5, false); // cools to ice before arriving
  assert.ok(!g1.over);
  assert.equal(g1.score, 1);

  const g2 = new MeltGame({ random: rng(6) });
  placeOnly(g2, 'glass', CONFIG.PLAYER_X + 200);
  for (let t = 0; t < 2; t += DT) g2.update(DT, g2.temp < 50); // stays water
  assert.ok(g2.over, 'water splats on glass');

  const p1 = new MeltGame({ random: rng(7) });
  placeOnly(p1, 'pipe', CONFIG.PLAYER_X + 200);
  for (let t = 0; t < 2; t += DT) p1.update(DT, p1.temp < 50);
  assert.ok(!p1.over);

  const p2 = new MeltGame({ random: rng(7) });
  placeOnly(p2, 'pipe', CONFIG.PLAYER_X + 500);
  run(p2, 2.5, false); // ice
  assert.ok(p2.over, 'ice is too rigid for the pipe');
});

test('hazards shove the temperature once and never kill', () => {
  const g = new MeltGame({ random: rng(8) });
  placeOnly(g, 'geyser', CONFIG.PLAYER_X + 120);
  let hits = 0;
  const before = g.temp;
  g.on('hazard', () => { hits++; assert.ok(g.temp > before + 20, 'geyser heated us'); });
  for (let t = 0; t < 1.5; t += DT) g.update(DT, g.temp < before); // try to hold temperature
  assert.equal(hits, 1);
  assert.ok(!g.over);

  const v = new MeltGame({ random: rng(8) });
  placeOnly(v, 'vent', CONFIG.PLAYER_X + 120);
  v.on('hazard', () => { assert.ok(v.temp < CONFIG.TEMP_START); });
  run(v, 0.4, true);
});

test('phaseDistance measures the state change between requirements', () => {
  assert.equal(phaseDistance(['steam'], ['ice']), 2);
  assert.equal(phaseDistance(['steam'], ['ice', 'water']), 1);
  assert.equal(phaseDistance(['water'], ['ice', 'water']), 0);
  assert.equal(phaseDistance(['ice'], ['ice']), 0);
});

test('gaps are sized to the phase change the player will actually make', () => {
  const g = new MeltGame({ random: rng(9) });
  g.score = 100; // everything unlocked, difficulty at minimum
  // glass (ice) → beam (ice|water, arrive as ice) → spikes (steam) must get the opposite-change budget
  g.obstacles = []; g.lastObstacle = null; g.prevObstacleType = null; g.pendingType = 'glass';
  g.nextSpawnX = CONFIG.SPAWN_X;
  g.random = () => 0; // chooseNext picks the first pool entry deterministically
  g.fillAhead();
  const glass = g.obstacles[0];
  assert.equal(glass.type, 'glass');
  assert.equal(glass.arrivePhase, 'ice');
  assert.equal(g.arrivePhase('beam', 'ice'), 'ice');
  assert.equal(g.arrivePhase('beam', 'steam'), 'water');
  const speed = g.speedForScore(100);
  const beam = { type: 'beam' };
  // leaving a beam you may be ice or water: budget for whichever is worse for the next obstacle
  assert.ok(Math.abs(g.gapAfter(beam, 'spikes') - CONFIG.TIME_OPPOSITE * CONFIG.DIFFICULTY_END * speed) < 1e-6);
  assert.ok(Math.abs(g.gapAfter(beam, 'glass') - CONFIG.TIME_ADJACENT * CONFIG.DIFFICULTY_END * speed) < 1e-6);
  assert.ok(Math.abs(g.gapAfter(beam, 'pipe') - CONFIG.TIME_ADJACENT * CONFIG.DIFFICULTY_END * speed) < 1e-6);
  assert.ok(Math.abs(g.gapAfter(beam, 'beam') - CONFIG.TIME_SAME * CONFIG.DIFFICULTY_END * speed) < 1e-6);
  assert.ok(Math.abs(g.gapAfter({ type: 'glass' }, 'beam') - CONFIG.TIME_SAME * CONFIG.DIFFICULTY_END * speed) < 1e-6);
  assert.ok(Math.abs(g.gapAfter({ type: 'spikes' }, 'glass') - CONFIG.TIME_OPPOSITE * CONFIG.DIFFICULTY_END * speed) < 1e-6);
});

test('types unlock with score', () => {
  const g = new MeltGame({ random: rng(10) });
  assert.deepEqual(g.unlockedTypes('obstacle').sort(), ['beam', 'spikes']);
  assert.deepEqual(g.unlockedTypes('hazard'), []);
  g.score = 30;
  assert.deepEqual(g.unlockedTypes('obstacle').sort(), ['beam', 'glass', 'pipe', 'spikes']);
  assert.deepEqual(g.unlockedTypes('hazard').sort(), ['geyser', 'vent']);
});

test('speed ramps and caps', () => {
  const g = new MeltGame();
  assert.equal(g.speedForScore(0), CONFIG.BASE_SPEED);
  assert.ok(g.speedForScore(20) > CONFIG.BASE_SPEED);
  assert.equal(g.speedForScore(10000), CONFIG.MAX_SPEED);
});

test('milestones fire once in order; close calls are detected', () => {
  const g = new MeltGame({ random: rng(11) });
  const hit = [];
  g.on('milestone', m => hit.push(m.score));
  let near = 0;
  g.on('nearmiss', () => near++);
  // autopilot with a tight reaction keeps changing phase late → close calls happen
  const queue = [];
  while (g.score < 21 && !g.over) {
    queue.push(autopilot(g));
    const delayed = queue.length > 12 ? queue.shift() : false; // 0.2 s reaction
    g.update(DT, delayed);
  }
  assert.ok(!g.over, 'died early in the milestone run');
  assert.deepEqual(hit, [10, 20]);
  assert.equal(near, g.closeCalls);
});

test('every generated course is beatable by a player with 0.25 s reaction (20 seeds × 120 passes)', () => {
  for (let seed = 100; seed < 120; seed++) {
    const g = new MeltGame({ random: rng(seed) });
    const queue = [];
    let steps = 0;
    while (g.score < 120 && !g.over && steps < 60 * 400) {
      queue.push(autopilot(g));
      const delayed = queue.length > 15 ? queue.shift() : false;
      g.update(DT, delayed);
      steps++;
    }
    assert.ok(!g.over, `seed ${seed} died at score ${g.score} on ${g.deathPhase}`);
    assert.equal(g.score, 120, `seed ${seed} stalled at ${g.score}`);
  }
});

test('a careless player who never releases dies within a few obstacles', () => {
  const g = new MeltGame({ random: rng(12) });
  run(g, 30, true);
  assert.ok(g.over);
  assert.ok(g.score < 8);
});

test('reset restores a fresh run', () => {
  const g = new MeltGame({ random: rng(13) });
  run(g, 30, true);
  assert.ok(g.over);
  g.reset();
  assert.ok(!g.over);
  assert.equal(g.score, 0);
  assert.equal(g.phase, PHASE.WATER);
});
