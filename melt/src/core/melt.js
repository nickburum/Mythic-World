/**
 * MELT — core simulation. Pure logic, no DOM.
 *
 * One input: `tap()` cycles the state of matter ice → water → steam → ice.
 * The phase decides altitude (steam floats) and each obstacle lets exactly
 * one set of phases through. Hazards shove the phase one step.
 */
import { CONFIG } from './config.js';
import { seededRandom } from '../../../src/challenge.js';

export const PHASE = Object.freeze({ ICE: 'ice', WATER: 'water', STEAM: 'steam' });
export const CYCLE = ['ice', 'water', 'steam'];
const IDX = { ice: 0, water: 1, steam: 2 };

/** Forward taps needed to get from `a` to `b` around the cycle (0, 1 or 2). */
export const tapsBetween = (a, b) => ((IDX[b] - IDX[a]) % 3 + 3) % 3;
export const nextPhase = (p) => CYCLE[(IDX[p] + 1) % 3];
/** One step hotter / colder, clamped (used by hazards). */
export const hotter = (p) => CYCLE[Math.min(2, IDX[p] + 1)];
export const colder = (p) => CYCLE[Math.max(0, IDX[p] - 1)];

export const OBSTACLES = Object.freeze({
  spikes: { kind: 'obstacle', needs: ['steam'], label: 'FLOAT', pass: g => g.altitude >= g.config.SPIKE_SAFE_ALT },
  beam:   { kind: 'obstacle', needs: ['ice', 'water'], label: 'STAY LOW', pass: g => g.altitude <= g.config.BEAM_SAFE_ALT },
  glass:  { kind: 'obstacle', needs: ['ice'], label: 'ICE ONLY', pass: g => g.phase === PHASE.ICE },
  pipe:   { kind: 'obstacle', needs: ['water'], label: 'WATER ONLY', pass: g => g.phase === PHASE.WATER },
  geyser: { kind: 'hazard', needs: [], label: 'HOT', apply: g => g.setPhase(hotter(g.phase)) },
  vent:   { kind: 'hazard', needs: [], label: 'COLD', apply: g => g.setPhase(colder(g.phase)) },
});

export class MeltGame {
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.seed = opts.seed ?? null;
    this.random = opts.random || (this.seed !== null ? seededRandom(this.seed) : Math.random);
    this.listeners = {};
    this.reset();
  }
  /** Start over on a seeded course (same obstacles for everyone with the seed). */
  resetWithSeed(seed) { this.seed = seed >>> 0; this.random = seededRandom(this.seed); this.reset(); }
  /** Continue after a death: clear the road ahead and keep the score. */
  revive() {
    if (!this.over) return false;
    const c = this.config;
    this.obstacles = this.obstacles.filter(o => o.x > c.PLAYER_X + 320);
    this.over = false; this.deathPhase = null; this.lastPhaseChange = this.time;
    this.emit('revive', this);
    return true;
  }
  on(e, fn) { (this.listeners[e] ||= []).push(fn); return () => this.off(e, fn); }
  off(e, fn) { const l = this.listeners[e]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  emit(e, p) { const l = this.listeners[e]; if (!l) return; for (const fn of [...l]) fn(p); }

  reset() {
    const c = this.config;
    this.phase = c.START_PHASE;
    this.altitude = 0;
    this.speed = c.BASE_SPEED;
    this.distance = 0; this.score = 0; this.closeCalls = 0; this.time = 0;
    this.lastPhaseChange = -10; this.lastTap = -10;
    this.over = false; this.deathPhase = null; this.milestoneIdx = 0; this.nextId = 1;
    this.obstacles = []; this.lastObstacle = null; this.prevObstacleType = null; this.pendingType = null;
    this.spawnX = this.spawnX || c.SPAWN_X;
    this.nextSpawnX = this.spawnX + 80;
    this.seen = {};
    this.fillAhead();
    this.emit('reset', this);
  }

  difficulty() { const c = this.config; const t = Math.min(1, this.score / c.DIFFICULTY_RAMP); return c.DIFFICULTY_START + (c.DIFFICULTY_END - c.DIFFICULTY_START) * t; }
  speedForScore(score) { const c = this.config; return Math.min(c.MAX_SPEED, c.BASE_SPEED + score * c.SPEED_PER_PASS); }

  setPhase(p) {
    if (p === this.phase) return;
    const from = this.phase; this.phase = p; this.lastPhaseChange = this.time;
    this.emit('phase', { from, to: p });
  }

  /** The one input. Returns the new phase, or null when debounced / over. */
  tap() {
    if (this.over) return null;
    if (this.time - this.lastTap < this.config.TAP_COOLDOWN) return null;
    this.lastTap = this.time;
    this.setPhase(nextPhase(this.phase));
    return this.phase;
  }

  unlockedTypes(kind) { return Object.keys(OBSTACLES).filter(t => OBSTACLES[t].kind === kind && this.score >= this.config.UNLOCK[t]); }

  /** Time budget (seconds) for `n` taps. */
  timeBudgetForTaps(n) { const c = this.config; const base = n === 0 ? c.TIME_SAME : n === 1 ? c.TIME_ONE : c.TIME_TWO; return base * this.difficulty(); }

  /**
   * Gap after obstacle `o` for the chosen next type: budget for the worst
   * phase the player may legitimately be in leaving `o` against the best
   * phase that passes the next one (fewest taps), so no valid choice is punished.
   */
  gapAfter(o, nextType) {
    const from = OBSTACLES[o.type].needs, to = OBSTACLES[nextType].needs;
    let worst = 0;
    for (const p of from) { let best = 2; for (const q of to) best = Math.min(best, tapsBetween(p, q)); worst = Math.max(worst, best); }
    return this.timeBudgetForTaps(worst) * this.speedForScore(this.score);
  }

  chooseNext(o) {
    const types = this.unlockedTypes('obstacle');
    const pool = types.length > 1 && o && o.type === this.prevObstacleType ? types.filter(t => t !== o.type) : types;
    return pool[Math.floor(this.random() * pool.length)];
  }

  spawn(type, x) {
    const c = this.config, def = OBSTACLES[type];
    this.seen[type] = (this.seen[type] || 0) + 1;
    const o = { id: this.nextId++, type, kind: def.kind, x, w: def.kind === 'hazard' ? c.HAZARD_W : c.OBSTACLE_W, passed: false, applied: false, hint: this.seen[type] <= 3 };
    this.obstacles.push(o); this.emit('spawn', o); return o;
  }

  fillAhead() {
    const c = this.config;
    while (this.nextSpawnX <= this.spawnX + this.speed * 0.5 + 60) {
      const type = this.pendingType || this.chooseNext(null);
      const x = Math.max(this.nextSpawnX, this.spawnX);
      const o = this.spawn(type, x);
      this.prevObstacleType = this.lastObstacle ? this.lastObstacle.type : null;
      this.lastObstacle = o;
      this.pendingType = this.chooseNext(o);
      const speed = this.speedForScore(this.score);
      let gap = this.gapAfter(o, this.pendingType);
      const hazards = this.unlockedTypes('hazard');
      if (hazards.length && gap / speed >= c.HAZARD_MIN_TIME && this.random() < c.HAZARD_CHANCE) {
        gap += c.HAZARD_RECOVERY * speed;
        const hType = hazards[Math.floor(this.random() * hazards.length)];
        this.spawn(hType, x + o.w + gap * c.HAZARD_POS - c.HAZARD_W / 2);
      }
      this.nextSpawnX = x + o.w + gap;
    }
  }

  update(dt) {
    if (this.over) return;
    const c = this.config;
    this.time += dt;
    const targetAlt = this.phase === PHASE.STEAM ? 1 : 0;
    const step = c.FLOAT_SPEED * dt;
    if (Math.abs(targetAlt - this.altitude) <= step) this.altitude = targetAlt; else this.altitude += Math.sign(targetAlt - this.altitude) * step;

    this.speed = this.speedForScore(this.score);
    const dx = this.speed * dt;
    this.distance += dx;
    for (const o of this.obstacles) o.x -= dx;
    this.nextSpawnX -= dx;

    const left = c.PLAYER_X - c.PLAYER_R * 0.7, right = c.PLAYER_X + c.PLAYER_R * 0.7;
    for (const o of this.obstacles) {
      if (o.passed) continue;
      const overlapping = o.x < right && o.x + o.w > left;
      if (o.kind === 'hazard') {
        if (overlapping && !o.applied) { o.applied = true; OBSTACLES[o.type].apply(this); this.emit('hazard', o); }
        if (o.x + o.w < left) o.passed = true;
        continue;
      }
      if (overlapping && !OBSTACLES[o.type].pass(this)) { this.die(o); return; }
      if (o.x + o.w < left) {
        o.passed = true; this.score += 1;
        const closeCall = this.time - this.lastPhaseChange <= c.NEAR_MISS_WINDOW + (o.w + c.PLAYER_R * 1.4) / this.speed;
        if (closeCall) { this.closeCalls += 1; this.emit('nearmiss', o); }
        this.emit('pass', { obstacle: o, score: this.score, closeCall });
        this.checkMilestone();
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -200);
    this.fillAhead();
  }

  die(obstacle) { this.over = true; this.deathPhase = this.phase; this.emit('die', { obstacle, phase: this.phase, score: this.score }); this.emit('gameover', this); }
  checkMilestone() { const ms = this.config.MILESTONES; while (this.milestoneIdx < ms.length && this.score >= ms[this.milestoneIdx].score) { this.emit('milestone', ms[this.milestoneIdx]); this.milestoneIdx += 1; } }
  setViewWidth(worldW) { this.spawnX = Math.max(this.config.SPAWN_X, worldW + 80); }

  nextObstacle() {
    const c = this.config; let best = null;
    for (const o of this.obstacles) { if (o.kind !== 'obstacle' || o.passed || o.x + o.w < c.PLAYER_X - c.PLAYER_R) continue; if (!best || o.x < best.x) best = o; }
    return best;
  }
}

/**
 * Reference autopilot: returns true when it wants to tap this frame. Taps
 * toward the phase that passes the next obstacle with the fewest taps, once
 * the obstacle is within reach. Tests wrap it in a reaction delay.
 */
export function autopilot(game) {
  const o = game.nextObstacle(); if (!o) return false;
  const c = game.config;
  const timeToReach = (o.x - c.PLAYER_X) / game.speed;
  if (timeToReach > 1.4) return false;
  const needs = OBSTACLES[o.type].needs;
  let best = 3; for (const n of needs) best = Math.min(best, tapsBetween(game.phase, n));
  return best > 0;
}
