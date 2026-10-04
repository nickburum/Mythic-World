import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SkipGame, autopilot } from '../src/core/skip.js';
import { CONFIG } from '../src/core/config.js';
import { LocalBoard } from '../src/platform/leaderboard.js';

const DT = 1 / 120;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Throw with a given charge and fly with a tap policy until the run ends or time runs out. */
function play(g, charge, policy, maxT = 120) {
  g.throwStone(charge);
  let t = 0;
  while (g.phase === 'flight' && t < maxT) {
    if (policy(g)) g.tap();
    g.update(DT);
    t += DT;
  }
  return g;
}
const never = () => false;
const perfect = (g) => g.timeToContact() <= CONFIG.PERFECT_WINDOW * 0.5;

test('wind-up charges while holding and throws on release', () => {
  const g = new SkipGame({ random: rng(1) });
  assert.equal(g.phase, 'ready');
  for (let t = 0; t < 0.5; t += DT) g.update(DT, true);
  assert.ok(g.charge > 0.4 && g.charge < 0.5);
  let thrown = null;
  g.on('throw', e => { thrown = e; });
  g.release();
  assert.equal(g.phase, 'flight');
  assert.ok(thrown.vx > CONFIG.THROW_VX_MIN && thrown.vx < CONFIG.THROW_VX_MAX);
});

test('a bare tap (no hold) still throws with the idle charge', () => {
  const g = new SkipGame({ random: rng(2) });
  g.release();
  assert.equal(g.phase, 'flight');
  const expected = CONFIG.THROW_VX_MIN + (CONFIG.THROW_VX_MAX - CONFIG.THROW_VX_MIN) * CONFIG.CHARGE_IDLE;
  assert.ok(Math.abs(g.stone.vx - expected) < 1e-9);
});

test('timeToContact solves the arc', () => {
  const g = new SkipGame({ random: rng(3) });
  g.throwStone(0.5);
  const ttc = g.timeToContact();
  for (let t = 0; t < ttc - DT; t += DT) g.update(DT);
  assert.ok(g.stone.y > 0, 'still airborne just before predicted contact');
  g.update(DT * 2);
  assert.ok(g.skips === 1 || g.stone.y <= 0.01, 'contact happened at the predicted time');
});

test('an untapped throw still skips several times before sinking — it is not hard', () => {
  const g = new SkipGame({ random: rng(4), config: { PAD_START: 1e9 } });
  let sink = null;
  g.on('sink', e => { sink = e; });
  play(g, 0.6, never);
  assert.equal(g.phase, 'sunk');
  assert.equal(sink.reason, 'sink');
  assert.ok(g.skips >= 5, `only ${g.skips} skips`);
  assert.ok(g.distance >= 25, `only ${g.distance.toFixed(1)} m`);
});

test('perfect taps keep far more speed than no taps', () => {
  const a = new SkipGame({ random: rng(5), config: { PAD_START: 1e9, MOTE_GAP_MIN: 1e6, MOTE_GAP_MAX: 1e6 } });
  const b = new SkipGame({ random: rng(5), config: { PAD_START: 1e9, MOTE_GAP_MIN: 1e6, MOTE_GAP_MAX: 1e6 } });
  play(a, 0.6, never);
  play(b, 0.6, perfect, 400);
  assert.ok(b.perfects >= 10, `perfects ${b.perfects}`);
  assert.ok(b.distance > a.distance * 2.5, `${b.distance.toFixed(0)} vs ${a.distance.toFixed(0)}`);
});

test('skip events report quality kinds', () => {
  const g = new SkipGame({ random: rng(6), config: { PAD_START: 1e9 } });
  const kinds = [];
  g.on('skip', s => kinds.push(s.kind));
  play(g, 0.6, perfect, 10);
  assert.ok(kinds.includes('perfect'));
  const g2 = new SkipGame({ random: rng(6), config: { PAD_START: 1e9 } });
  const kinds2 = [];
  g2.on('skip', s => kinds2.push(s.kind));
  play(g2, 0.6, never, 10);
  assert.ok(kinds2.every(k => k === 'plain'));
});

test('an early tap dips the stone so the hop ends sooner', () => {
  const g = new SkipGame({ random: rng(7), config: { PAD_START: 1e9 } });
  g.throwStone(0.8);
  // fly until we are inside the early window but well before contact
  while (g.timeToContact() > CONFIG.EARLY_WINDOW - 0.02) g.update(DT);
  const naturalLanding = g.predictedLandingX();
  const r = g.tap();
  assert.ok(r.accepted);
  const dipped = g.predictedLandingX();
  assert.ok(dipped < naturalLanding - 0.5, `dip did not shorten the hop (${dipped.toFixed(2)} vs ${naturalLanding.toFixed(2)})`);
});

test('a tap too early is ignored', () => {
  const g = new SkipGame({ random: rng(8) });
  g.throwStone(1);
  g.update(DT);
  const r = g.tap();
  assert.equal(r.accepted, false);
  assert.ok(r.lead > CONFIG.EARLY_WINDOW);
});

test('landing on a lily pad ends the run with the pad reported', () => {
  const g = new SkipGame({ random: rng(9), config: { PAD_START: 1e9 } });
  g.throwStone(0.5);
  g.pads = [{ x: g.predictedLandingX(), w: 1.5, flower: true, seed: 0 }];
  let sink = null;
  g.on('sink', e => { sink = e; });
  while (g.phase === 'flight') g.update(DT);
  assert.equal(sink.reason, 'pad');
  assert.ok(sink.pad);
});

test('landing near a mote collects it and boosts speed', () => {
  const g = new SkipGame({ random: rng(10), config: { PAD_START: 1e9 } });
  g.throwStone(0.5);
  g.motes = [{ x: g.predictedLandingX(), taken: false, seed: 0 }];
  let got = 0;
  g.on('mote', () => got++);
  const vxBefore = g.stone.vx;
  while (g.skips === 0) g.update(DT);
  assert.equal(got, 1);
  assert.equal(g.motesCollected, 1);
  assert.ok(g.stone.vx > vxBefore * CONFIG.RETAIN_BASE + CONFIG.MOTE_BOOST - 0.01);
});

test('the lake stays populated ahead and pads never cover motes', () => {
  const g = new SkipGame({ random: rng(11), config: { PAD_START: 10 } });
  play(g, 1, perfect, 60);
  assert.ok(g.pads.length > 0);
  for (const p of g.pads) for (const m of g.motes) assert.ok(Math.abs(p.x - m.x) >= CONFIG.PAD_WIDTH + CONFIG.MOTE_RADIUS);
  assert.ok(g.motes.every(m => m.x > g.stone.x - 30));
});

test('autopilot survives pads and reaches the far shore on 10 seeds', () => {
  for (let seed = 20; seed < 30; seed++) {
    const g = new SkipGame({ random: rng(seed) });
    g.throwStone(1);
    let t = 0;
    while (g.phase === 'flight' && g.distance < 300 && t < 600) {
      if (autopilot(g)) g.tap();
      g.update(DT); t += DT;
    }
    assert.notEqual(g.endReason, 'pad', `seed ${seed} hit a pad at ${g.distance.toFixed(1)} m`);
    assert.ok(g.distance >= 300, `seed ${seed} only reached ${g.distance.toFixed(1)} m`);
  }
});

test('milestones fire in order and dayPhase runs 0→1', () => {
  const g = new SkipGame({ random: rng(12), config: { PAD_START: 1e9 } });
  const hit = [];
  g.on('milestone', m => hit.push(m.distance));
  assert.equal(g.dayPhase(), 0);
  play(g, 1, perfect, 200);
  assert.deepEqual(hit.slice(0, 2), [25, 50]);
  assert.ok(g.dayPhase() > 0);
});

test('local leaderboard keeps a sorted top 10 and reports rank', () => {
  const store = new Map();
  const mem = { get: (k, d) => store.has(k) ? store.get(k) : d, set: (k, v) => store.set(k, v) };
  const board = new LocalBoard(mem, 'test');
  for (let i = 1; i <= 15; i++) board.add(i * 10, 1000 + i);
  const top = board.top();
  assert.equal(top.length, 10);
  assert.equal(top[0].score, 150);
  assert.equal(top[9].score, 60);
  assert.equal(board.rankOf(150), 1);
  assert.equal(board.rankOf(10), null);
  assert.equal(board.best(), 150);
});
