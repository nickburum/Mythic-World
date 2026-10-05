/**
 * ORBIT — core. A comet circles a ring. Tap to reverse direction.
 * Blockers appear on the ring (with a warning before they solidify); gems
 * appear too. Reverse to dodge blockers and sweep up gems. Score = gems.
 *
 * Fairness: a blocker only spawns ahead of the comet (in its direction of
 * travel) and only when the opposite side is clear, so reversing is always
 * a valid escape when the warning shows. Angles are radians, CCW positive.
 */
export const CONFIG = Object.freeze({
  SPEED_START: 1.9,          // rad/s
  SPEED_RAMP: 0.012,         // per gem
  SPEED_MAX: 3.4,
  COMET_HALF: 0.11,          // comet half-width on the ring (rad)
  BLOCK_HALF_MIN: 0.22, BLOCK_HALF_MAX: 0.42,
  BLOCK_WARN: 0.9,           // seconds of warning before a blocker is solid
  BLOCK_LIFE: 3.2,           // solid seconds before it fades
  BLOCK_AHEAD_MIN: 1.6, BLOCK_AHEAD_MAX: 2.6,   // spawn this far ahead (rad)
  BLOCK_GAP_START: 2.4, BLOCK_GAP_MIN: 1.15, BLOCK_GAP_RAMP: 0.025,  // seconds between spawns
  MAX_BLOCKS: 2,
  GEM_GAP: 1.3,
  GEM_HALF: 0.16,
  MILESTONES: [{ score: 10, name: 'In orbit' }, { score: 25, name: 'Slingshot' }, { score: 50, name: 'Escape velocity' }, { score: 100, name: 'Event horizon' }],
});
const TAU = Math.PI * 2;
const norm = (a) => ((a % TAU) + TAU) % TAU;
/** Signed shortest angular distance from a to b in (-π, π]. */
export const angDiff = (a, b) => { let d = norm(b - a); if (d > Math.PI) d -= TAU; return d; };
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class OrbitGame {
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.random = opts.random || (opts.seed !== undefined ? mulberry32(opts.seed) : Math.random);
    this.listeners = {};
    this.reset();
  }
  on(e, fn) { (this.listeners[e] ||= []).push(fn); return () => this.off(e, fn); }
  off(e, fn) { const l = this.listeners[e]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  emit(e, p) { const l = this.listeners[e]; if (!l) return; for (const fn of [...l]) fn(p); }

  reset() {
    this.time = 0; this.angle = -Math.PI / 2; this.dir = 1; this.score = 0; this.over = false; this.reversals = 0;
    this.blocks = []; this.gems = []; this.nextId = 1; this.blockIn = 1.2; this.gemIn = 0.6; this.milestoneIdx = 0;
    this.emit('reset', this);
  }
  speed() { const c = this.config; return Math.min(c.SPEED_MAX, c.SPEED_START + this.score * c.SPEED_RAMP); }
  blockGap() { const c = this.config; return Math.max(c.BLOCK_GAP_MIN, c.BLOCK_GAP_START - this.score * c.BLOCK_GAP_RAMP); }

  /** Tap: reverse. */
  tap() { if (this.over) return; this.dir *= -1; this.reversals++; this.emit('reverse', { dir: this.dir }); }

  /** Is the arc [a ± half] free of other blockers and the comet itself? */
  clear(a, half) {
    for (const b of this.blocks) if (Math.abs(angDiff(a, b.angle)) < half + b.half + 0.25) return false;
    if (Math.abs(angDiff(a, this.angle)) < half + this.config.COMET_HALF + 0.3) return false;
    return true;
  }

  spawnBlock() {
    const c = this.config;
    if (this.blocks.length >= c.MAX_BLOCKS) return null;
    const ahead = c.BLOCK_AHEAD_MIN + this.random() * (c.BLOCK_AHEAD_MAX - c.BLOCK_AHEAD_MIN);
    const a = norm(this.angle + this.dir * ahead);
    const half = c.BLOCK_HALF_MIN + this.random() * (c.BLOCK_HALF_MAX - c.BLOCK_HALF_MIN);
    // the escape route (behind the comet) must be clear of solid blockers for at least ~110°
    const behind = norm(this.angle - this.dir * 1.0);
    const escapeFree = this.blocks.every(b => Math.abs(angDiff(behind, b.angle)) > b.half + 0.9);
    if (!this.clear(a, half) || !escapeFree) return null;
    const b = { id: this.nextId++, angle: a, half, age: 0, state: 'warn' };
    this.blocks.push(b); this.emit('block', b); return b;
  }

  spawnGem() {
    const c = this.config;
    for (let tries = 0; tries < 8; tries++) {
      const a = this.random() * TAU;
      if (this.blocks.every(b => Math.abs(angDiff(a, b.angle)) > b.half + c.GEM_HALF + 0.2) && this.gems.every(g => Math.abs(angDiff(a, g.angle)) > 0.5) && Math.abs(angDiff(a, this.angle)) > 0.4) {
        const g = { id: this.nextId++, angle: a, age: 0 }; this.gems.push(g); this.emit('gem', g); return g;
      }
    }
    return null;
  }

  update(dt) {
    if (this.over) return;
    const c = this.config;
    this.time += dt;
    this.angle = norm(this.angle + this.dir * this.speed() * dt);
    // blockers
    for (const b of this.blocks) {
      b.age += dt;
      if (b.state === 'warn' && b.age >= c.BLOCK_WARN) { b.state = 'solid'; this.emit('solid', b); }
      if (b.state === 'solid' && b.age >= c.BLOCK_WARN + c.BLOCK_LIFE) b.state = 'gone';
    }
    this.blocks = this.blocks.filter(b => b.state !== 'gone');
    this.blockIn -= dt; if (this.blockIn <= 0) { this.spawnBlock(); this.blockIn = this.blockGap(); }
    this.gemIn -= dt; if (this.gemIn <= 0 && this.gems.length < 3) { this.spawnGem(); this.gemIn = c.GEM_GAP; }
    for (const g of this.gems) g.age += dt;
    // collisions
    for (const b of this.blocks) {
      if (b.state === 'solid' && Math.abs(angDiff(this.angle, b.angle)) < b.half + c.COMET_HALF) { this.over = true; this.emit('gameover', { score: this.score, block: b }); return; }
    }
    const got = this.gems.filter(g => Math.abs(angDiff(this.angle, g.angle)) < c.GEM_HALF + c.COMET_HALF);
    if (got.length) {
      this.gems = this.gems.filter(g => !got.includes(g));
      for (const g of got) { this.score++; this.emit('collect', { gem: g, score: this.score }); }
      this.checkMilestone();
    }
  }
  /** Continue after a crash: the ring is cleared, score kept. */
  revive() {
    if (!this.over) return false;
    this.over = false; this.blocks = []; this.blockIn = 1.6;
    this.emit('revive', this);
    return true;
  }
  checkMilestone() { const ms = this.config.MILESTONES; while (this.milestoneIdx < ms.length && this.score >= ms[this.milestoneIdx].score) { this.emit('milestone', ms[this.milestoneIdx]); this.milestoneIdx++; } }

  /** Nearest blocker ahead in the direction of travel: { block, dist } or null. */
  ahead() {
    let best = null;
    for (const b of this.blocks) { const d = norm(this.dir * angDiff(this.angle, b.angle)); if (!best || d < best.dist) best = { block: b, dist: d }; }
    return best;
  }
}

/** Reference autopilot: reverse when a blocker lies within ~0.6 rad ahead and the way back is clear. */
export function autopilot(game) {
  const a = game.ahead(); if (!a) return false;
  if (a.dist - a.block.half > 0.6) return false;
  const back = game.blocks.filter(b => b !== a.block).map(b => norm(-game.dir * angDiff(game.angle, b.angle)) - b.half);
  return back.every(d => d > 0.8);
}
