import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StackGame } from '../src/core/stack.js';
import { CONFIG } from '../src/core/config.js';
import { stoneColors, skyColors, stoneHue } from '../src/core/palette.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/** Build a game with deterministic direction and place the moving block at an exact offset. */
function gameAt(offset, opts = {}) {
  const g = new StackGame({ random: () => 0.25, ...opts });
  const m = g.moving;
  m[m.axis] = g.top()[m.axis] + offset;
  return g;
}

test('starts with a base stone and a sliding stone on the far side', () => {
  const g = new StackGame({ random: () => 0.25 });
  assert.equal(g.blocks.length, 1);
  assert.equal(g.score, 0);
  assert.ok(g.moving);
  assert.equal(g.moving.axis, 'x');
  assert.equal(g.moving.dir, 1);
  assert.ok(close(g.moving.x, -CONFIG.SLIDE_RANGE));
  assert.ok(close(g.moving.y, CONFIG.BLOCK_HEIGHT));
});

test('update slides the stone and bounces at the range limits', () => {
  const g = new StackGame({ random: () => 0.25 });
  const start = g.moving.x;
  g.update(0.1);
  assert.ok(g.moving.x > start);
  // Run long enough to guarantee at least one bounce; must stay inside range.
  for (let i = 0; i < 200; i++) {
    g.update(0.05);
    assert.ok(Math.abs(g.moving.x) <= CONFIG.SLIDE_RANGE + 1e-9);
  }
});

test('perfect drop snaps to the stone below and counts a combo', () => {
  const g = gameAt(CONFIG.PERFECT_TOLERANCE * 0.5);
  const events = [];
  g.on('perfect', r => events.push(r));
  const r = g.drop();
  assert.equal(r.type, 'perfect');
  assert.equal(r.cut, null);
  assert.equal(g.score, 1);
  assert.equal(g.combo, 1);
  assert.equal(events.length, 1);
  const top = g.top();
  assert.ok(close(top.x, 0));
  assert.ok(close(top.w, CONFIG.BLOCK_SIZE));
  assert.ok(top.perfect);
  // Next moving stone alternates axis and sits on top.
  assert.equal(g.moving.axis, 'z');
  assert.ok(close(g.moving.y, 2 * CONFIG.BLOCK_HEIGHT));
});

test('cut drop keeps the overlap and sheds a slice of exactly |delta|', () => {
  const delta = 0.3;
  const g = gameAt(delta);
  const r = g.drop();
  assert.equal(r.type, 'cut');
  assert.ok(close(r.block.w, CONFIG.BLOCK_SIZE - delta));
  assert.ok(close(r.block.x, delta / 2));
  assert.ok(r.cut);
  assert.ok(close(r.cut.w, delta));
  // The slice must start exactly where the kept piece ends.
  const keptRight = r.block.x + r.block.w / 2;
  const cutLeft = r.cut.x - r.cut.w / 2;
  assert.ok(close(keptRight, cutLeft));
  assert.equal(g.combo, 0);
  // Footprint along the other axis is untouched.
  assert.ok(close(r.block.d, CONFIG.BLOCK_SIZE));
});

test('negative delta cuts the other side', () => {
  const g = gameAt(-0.4);
  const r = g.drop();
  assert.equal(r.type, 'cut');
  assert.ok(close(r.block.x, -0.2));
  assert.ok(r.cut.x < r.block.x);
  const keptLeft = r.block.x - r.block.w / 2;
  const cutRight = r.cut.x + r.cut.w / 2;
  assert.ok(close(keptLeft, cutRight));
});

test('the moving stone inherits the shrunken footprint', () => {
  const g = gameAt(0.3);
  g.drop();
  assert.ok(close(g.moving.w, 0.7));
  assert.ok(close(g.moving.d, 1.0));
});

test('missing the tower ends the game', () => {
  const g = gameAt(CONFIG.BLOCK_SIZE + 0.01);
  let over = false;
  g.on('gameover', () => { over = true; });
  const r = g.drop();
  assert.equal(r.type, 'miss');
  assert.ok(g.over);
  assert.ok(over);
  assert.equal(g.moving, null);
  assert.equal(g.score, 0);
  assert.equal(g.drop(), null);
  g.update(1);
});

test('a near-total miss still counts as a miss below MIN_SIZE', () => {
  const g = gameAt(CONFIG.BLOCK_SIZE - CONFIG.MIN_SIZE / 2);
  assert.equal(g.drop().type, 'miss');
});

test('perfect streak regrows the stone up to the base size', () => {
  const g = gameAt(0.4);
  g.drop(); // w = 0.6
  let grewCount = 0;
  for (let i = 0; i < 12; i++) {
    const m = g.moving;
    m[m.axis] = g.top()[m.axis]; // dead centre
    const r = g.drop();
    assert.equal(r.type, 'perfect');
    if (r.grew) grewCount++;
  }
  assert.ok(grewCount > 0);
  assert.ok(close(g.top().w, CONFIG.BLOCK_SIZE));
  assert.ok(g.top().w <= CONFIG.BLOCK_SIZE + 1e-9);
  assert.equal(g.combo, 12);
  assert.equal(g.bestCombo, 12);
});

test('speed ramps with score and is capped', () => {
  const g = new StackGame();
  assert.ok(close(g.speedForScore(0), CONFIG.BASE_SPEED));
  assert.ok(g.speedForScore(10) > g.speedForScore(0));
  assert.ok(close(g.speedForScore(100000), CONFIG.MAX_SPEED));
});

test('milestones fire once, in order', () => {
  const g = new StackGame({ random: () => 0.25 });
  const hit = [];
  g.on('milestone', m => hit.push(m.score));
  for (let i = 0; i < 30; i++) {
    const m = g.moving;
    m[m.axis] = g.top()[m.axis];
    g.drop();
  }
  assert.deepEqual(hit, [10, 25]);
});

test('reset returns to a fresh game', () => {
  const g = gameAt(0.3);
  g.drop();
  g.reset();
  assert.equal(g.score, 0);
  assert.equal(g.blocks.length, 1);
  assert.ok(!g.over);
});

test('palette produces valid CSS colours and drifting hues', () => {
  const a = stoneColors(0), b = stoneColors(1);
  assert.match(a.top, /^hsl\(/);
  assert.notEqual(stoneHue(0), stoneHue(1));
  assert.notEqual(a.top, b.top);
  const sky0 = skyColors(0), sky200 = skyColors(200);
  assert.equal(sky0.night, 0);
  assert.equal(sky200.night, 1);
  assert.match(sky200.top, /^hsl\(/);
});

test('drop results report the slide axis', () => {
  const g = gameAt(0.3);
  assert.equal(g.drop().axis, 'x');
  const m = g.moving; m[m.axis] = g.top()[m.axis] + 0.3;
  assert.equal(g.drop().axis, 'z');
});
