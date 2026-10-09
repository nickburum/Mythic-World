/**
 * POP — core. Bubbles rise; pop the ones matching the target colour.
 * Pure logic on a 390 × 700 reference world; the renderer scales it.
 *
 * Rules: tap a target-colour bubble → +1 (combo grows). Tap a wrong colour
 * → lose a life. Let a target-colour bubble float off the top → lose a life.
 * Three lives. Speed and spawn rate ramp with score; the target colour
 * changes every TARGET_EVERY pops so the eye never settles.
 */
export const CONFIG = Object.freeze({
  WORLD_W: 390, WORLD_H: 700,
  COLORS: 5,                 // palette size (indices 0..4)
  LIVES: 3,
  R_MIN: 22, R_MAX: 34,
  SPEED_MIN: 70, SPEED_MAX: 110,      // px/s at score 0
  SPEED_RAMP: 1.6,                    // extra px/s per pop
  SPAWN_START: 1.05, SPAWN_MIN: 0.42, SPAWN_RAMP: 0.012,   // seconds between spawns
  TARGET_EVERY: 10,
  TARGET_SHARE: 0.45,        // chance a new bubble is the target colour
  TAP_SLOP: 14,              // extra hit radius in px (fat fingers)
  MILESTONES: [{ score: 10, name: 'Warm up' }, { score: 25, name: 'Bubbly' }, { score: 50, name: 'Fizzing' }, { score: 100, name: 'Soap master' }],
});

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class PopGame {
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
    const c = this.config;
    this.time = 0; this.score = 0; this.combo = 0; this.bestCombo = 0; this.lives = c.LIVES; this.over = false;
    this.bubbles = []; this.nextId = 1; this.spawnIn = 0.4; this.popsSinceTarget = 0; this.milestoneIdx = 0;
    this.target = Math.floor(this.random() * c.COLORS);
    this.emit('reset', this);
  }

  spawnInterval() { const c = this.config; return Math.max(c.SPAWN_MIN, c.SPAWN_START - this.score * c.SPAWN_RAMP); }
  speedFor() { const c = this.config; return c.SPEED_MIN + this.random() * (c.SPEED_MAX - c.SPEED_MIN) + this.score * c.SPEED_RAMP; }

  spawn() {
    const c = this.config;
    const r = c.R_MIN + this.random() * (c.R_MAX - c.R_MIN);
    const isTarget = this.random() < c.TARGET_SHARE;
    let color = this.target;
    if (!isTarget) { color = Math.floor(this.random() * (c.COLORS - 1)); if (color >= this.target) color++; }
    const b = { id: this.nextId++, x: r + this.random() * (c.WORLD_W - 2 * r), y: c.WORLD_H + r, r, color, vy: this.speedFor(), wob: this.random() * Math.PI * 2, wobAmp: 6 + this.random() * 10, born: this.time };
    this.bubbles.push(b);
    this.emit('spawn', b);
    return b;
  }

  update(dt) {
    if (this.over) return;
    this.time += dt;
    this.spawnIn -= dt;
    while (this.spawnIn <= 0) { this.spawn(); this.spawnIn += this.spawnInterval(); }
    for (const b of this.bubbles) { b.y -= b.vy * dt; b.wob += dt * 2.2; }
    // escaped?
    const gone = this.bubbles.filter(b => b.y + b.r < -10);
    if (gone.length) {
      this.bubbles = this.bubbles.filter(b => b.y + b.r >= -10);
      for (const b of gone) if (b.color === this.target) this.loseLife('escape', b);
    }
  }

  /** Visual x including the gentle side-to-side wobble (the hit test uses it too). */
  bubbleX(b) { return b.x + Math.sin(b.wob) * b.wobAmp; }

  /** Tap at world (x, y). Returns { hit, bubble, kind: 'pop'|'wrong'|'miss' }. */
  tap(x, y) {
    if (this.over) return { hit: false, kind: 'miss' };
    const c = this.config;
    let best = null, bestD = Infinity;
    for (const b of this.bubbles) {
      const d = Math.hypot(this.bubbleX(b) - x, b.y - y);
      if (d <= b.r + c.TAP_SLOP && d < bestD) { best = b; bestD = d; }
    }
    if (!best) { this.emit('miss', { x, y }); return { hit: false, kind: 'miss' }; }
    this.bubbles = this.bubbles.filter(b => b !== best);
    if (best.color === this.target) {
      this.score++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.popsSinceTarget++;
      this.emit('pop', { bubble: best, score: this.score, combo: this.combo });
      this.checkMilestone();
      if (this.popsSinceTarget >= c.TARGET_EVERY) this.changeTarget();
      return { hit: true, bubble: best, kind: 'pop' };
    }
    this.combo = 0;
    this.emit('wrong', { bubble: best });
    this.loseLife('wrong', best);
    return { hit: true, bubble: best, kind: 'wrong' };
  }

  /** Continue after game over: two lives back, a clear screen, score kept. */
  revive() {
    if (!this.over) return false;
    this.over = false; this.lives = 2; this.bubbles = []; this.spawnIn = 0.9; this.combo = 0;
    this.emit('revive', this);
    return true;
  }

  changeTarget() {
    const c = this.config;
    let t = Math.floor(this.random() * (c.COLORS - 1)); if (t >= this.target) t++;
    const from = this.target; this.target = t; this.popsSinceTarget = 0;
    this.emit('target', { from, to: t });
  }

  loseLife(reason, bubble) {
    this.lives--; this.combo = 0;
    this.emit('life', { reason, bubble, lives: this.lives });
    if (this.lives <= 0) { this.over = true; this.emit('gameover', { score: this.score, bestCombo: this.bestCombo, reason }); }
  }

  checkMilestone() { const ms = this.config.MILESTONES; while (this.milestoneIdx < ms.length && this.score >= ms[this.milestoneIdx].score) { this.emit('milestone', ms[this.milestoneIdx]); this.milestoneIdx++; } }
}

/** Reference autopilot: pops the highest target-colour bubble each call (returns a tap or null). */
export function autopilot(game) {
  let pick = null;
  for (const b of game.bubbles) if (b.color === game.target && b.y < game.config.WORLD_H - 20 && (!pick || b.y < pick.y)) pick = b;
  return pick ? { x: game.bubbleX(pick), y: pick.y } : null;
}
