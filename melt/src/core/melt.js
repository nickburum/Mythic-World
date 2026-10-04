/**
 * MELT — core simulation.
 *
 * Pure logic, no DOM, no canvas, no audio. Drive it with `update(dt, holding)`
 * and read state; it reports what happened through events.
 *
 * The one input is `holding` (finger down = heating). Temperature decides
 * the phase (ice / water / steam), the phase decides altitude (steam
 * floats), and each obstacle lets exactly one set of phases through.
 */
import { CONFIG } from './config.js';

export const PHASE = Object.freeze({ ICE: 'ice', WATER: 'water', STEAM: 'steam' });
const PHASE_INDEX = { ice: 0, water: 1, steam: 2 };

/**
 * Obstacle catalogue. `pass(game)` returns true when the droplet gets through.
 * `needs` lists phases that pass (used for spacing and for hint icons).
 */
export const OBSTACLES = Object.freeze({
  spikes: { kind: 'obstacle', needs: ['steam'], label: 'FLOAT', pass: g => g.altitude >= g.config.SPIKE_SAFE_ALT },
  beam:   { kind: 'obstacle', needs: ['ice', 'water'], label: 'STAY LOW', pass: g => g.altitude <= g.config.BEAM_SAFE_ALT },
  glass:  { kind: 'obstacle', needs: ['ice'], label: 'ICE ONLY', pass: g => g.phase === PHASE.ICE },
  pipe:   { kind: 'obstacle', needs: ['water'], label: 'WATER ONLY', pass: g => g.phase === PHASE.WATER },
  geyser: { kind: 'hazard', needs: [], label: 'HOT!', apply: g => g.changeTemp(g.config.GEYSER_HEAT) },
  vent:   { kind: 'hazard', needs: [], label: 'COLD!', apply: g => g.changeTemp(-g.config.VENT_COOL) },
});

/** Smallest number of phase steps between two requirement sets (0, 1 or 2). */
export function phaseDistance(needsA, needsB) {
  let best = 2;
  for (const a of needsA) for (const b of needsB) best = Math.min(best, Math.abs(PHASE_INDEX[a] - PHASE_INDEX[b]));
  return best;
}

export function phaseForTemp(temp, c = CONFIG) {
  if (temp < c.ICE_MAX) return PHASE.ICE;
  if (temp >= c.STEAM_MIN) return PHASE.STEAM;
  return PHASE.WATER;
}

export class MeltGame {
  /** @param {{ config?: Partial<typeof CONFIG>, random?: () => number }} [opts] */
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.random = opts.random || Math.random;
    this.listeners = {};
    this.reset();
  }

  /* ───────────── events ───────────── */

  /** Events: 'phase', 'pass', 'nearmiss', 'hazard', 'die', 'gameover', 'milestone', 'spawn', 'reset'. */
  on(event, fn) { (this.listeners[event] ||= []).push(fn); return () => this.off(event, fn); }
  off(event, fn) { const l = this.listeners[event]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  emit(event, payload) { const l = this.listeners[event]; if (!l) return; for (const fn of [...l]) fn(payload); }

  /* ───────────── lifecycle ───────────── */

  reset() {
    const c = this.config;
    this.temp = c.TEMP_START;
    this.phase = phaseForTemp(this.temp, c);
    this.altitude = 0;
    this.holding = false;
    this.speed = c.BASE_SPEED;
    this.distance = 0;
    this.score = 0;
    this.closeCalls = 0;
    this.time = 0;
    this.lastPhaseChange = -10;
    this.over = false;
    this.deathPhase = null;
    this.milestoneIdx = 0;
    this.nextId = 1;
    /** @type {Array<{id:number,type:string,x:number,w:number,passed:boolean,applied:boolean,hint:boolean}>} */
    this.obstacles = [];
    this.lastObstacle = null;     // last blocking obstacle spawned (for spacing)
    this.prevObstacleType = null;
    this.pendingType = null;      // type of the obstacle that will spawn next
    this.spawnX = this.spawnX || c.SPAWN_X;   // renderer may push this right on wide screens
    this.nextSpawnX = this.spawnX + 80;
    this.seen = {};               // how many of each type spawned (for hints)
    this.fillAhead();
    this.emit('reset', this);
  }

  /* ───────────── helpers ───────────── */

  /** Current difficulty multiplier on time budgets (1.7 → 1.0). */
  difficulty() {
    const c = this.config;
    const t = Math.min(1, this.score / c.DIFFICULTY_RAMP);
    return c.DIFFICULTY_START + (c.DIFFICULTY_END - c.DIFFICULTY_START) * t;
  }

  speedForScore(score) {
    const c = this.config;
    return Math.min(c.MAX_SPEED, c.BASE_SPEED + score * c.SPEED_PER_PASS);
  }

  changeTemp(delta) {
    this.temp = Math.max(0, Math.min(100, this.temp + delta));
    this.syncPhase();
  }

  syncPhase() {
    const p = phaseForTemp(this.temp, this.config);
    if (p !== this.phase) {
      const from = this.phase;
      this.phase = p;
      this.lastPhaseChange = this.time;
      this.emit('phase', { from, to: p, temp: this.temp });
    }
  }

  /** Obstacle types available at the current score. */
  unlockedTypes(kind) {
    return Object.keys(OBSTACLES).filter(t => OBSTACLES[t].kind === kind && this.score >= this.config.UNLOCK[t]);
  }

  /**
   * The phase a player will most likely be in when reaching an obstacle of
   * `type`, given the phase they were in at the previous one: the accepted
   * phase closest to where they already are.
   */
  arrivePhase(type, fromPhase) {
    const needs = OBSTACLES[type].needs;
    let best = needs[0];
    for (const n of needs) {
      if (Math.abs(PHASE_INDEX[n] - PHASE_INDEX[fromPhase]) < Math.abs(PHASE_INDEX[best] - PHASE_INDEX[fromPhase])) best = n;
    }
    return best;
  }

  /** Time budget (seconds) for a phase change of `d` steps (0, 1 or 2). */
  timeBudgetForDistance(d) {
    const c = this.config;
    const base = d === 0 ? c.TIME_SAME : d === 1 ? c.TIME_ADJACENT : c.TIME_OPPOSITE;
    return base * this.difficulty();
  }

  spawn(type, x) {
    const c = this.config;
    const def = OBSTACLES[type];
    this.seen[type] = (this.seen[type] || 0) + 1;
    const o = {
      id: this.nextId++,
      type,
      kind: def.kind,
      x,
      w: def.kind === 'hazard' ? c.HAZARD_W : c.OBSTACLE_W,
      passed: false,
      applied: false,
      hint: this.seen[type] <= 3,   // label the first few of each type
    };
    this.obstacles.push(o);
    this.emit('spawn', o);
    return o;
  }

  /**
   * Gap (world px) to leave after obstacle `o` for the already-chosen next
   * type. Budgets for the worst state the player may legitimately be in when
   * leaving `o` (a beam accepts ice *or* water) against the best state that
   * gets through the next one, so no valid choice can ever be punished.
   */
  gapAfter(o, nextType) {
    const from = OBSTACLES[o.type].needs, to = OBSTACLES[nextType].needs;
    let worst = 0;
    for (const p of from) {
      let best = 2;
      for (const q of to) best = Math.min(best, Math.abs(PHASE_INDEX[p] - PHASE_INDEX[q]));
      worst = Math.max(worst, best);
    }
    return this.timeBudgetForDistance(worst) * this.speedForScore(this.score);
  }

  /** Choose the obstacle that will follow `o`, avoiding three in a row. */
  chooseNext(o) {
    const types = this.unlockedTypes('obstacle');
    const prev = this.prevObstacleType;
    const pool = types.length > 1 && o && o.type === prev ? types.filter(t => t !== o.type) : types;
    return pool[Math.floor(this.random() * pool.length)];
  }

  /* ───────────── simulation ───────────── */

  /**
   * @param {number} dt seconds
   * @param {boolean} holding finger down → heating
   */
  update(dt, holding) {
    if (this.over) return;
    const c = this.config;
    this.time += dt;
    this.holding = !!holding;

    // temperature → phase
    this.temp += (this.holding ? c.HEAT_RATE : -c.COOL_RATE) * dt;
    this.temp = Math.max(0, Math.min(100, this.temp));
    this.syncPhase();

    // phase → altitude
    const targetAlt = this.phase === PHASE.STEAM ? 1 : 0;
    const step = c.FLOAT_SPEED * dt;
    if (Math.abs(targetAlt - this.altitude) <= step) this.altitude = targetAlt;
    else this.altitude += Math.sign(targetAlt - this.altitude) * step;

    // scroll
    this.speed = this.speedForScore(this.score);
    const dx = this.speed * dt;
    this.distance += dx;
    for (const o of this.obstacles) o.x -= dx;
    this.nextSpawnX -= dx;

    // collisions, hazards, passes
    const left = c.PLAYER_X - c.PLAYER_R * 0.7;
    const right = c.PLAYER_X + c.PLAYER_R * 0.7;
    for (const o of this.obstacles) {
      if (o.passed) continue;
      const overlapping = o.x < right && o.x + o.w > left;
      if (o.kind === 'hazard') {
        if (overlapping && !o.applied) {
          o.applied = true;
          OBSTACLES[o.type].apply(this);
          this.emit('hazard', o);
        }
        if (o.x + o.w < left) o.passed = true;
        continue;
      }
      if (overlapping && !OBSTACLES[o.type].pass(this)) {
        this.die(o);
        return;
      }
      if (o.x + o.w < left) {
        o.passed = true;
        this.score += 1;
        const closeCall = this.time - this.lastPhaseChange <= c.NEAR_MISS_WINDOW + (o.w + c.PLAYER_R * 1.4) / this.speed;
        if (closeCall) { this.closeCalls += 1; this.emit('nearmiss', o); }
        this.emit('pass', { obstacle: o, score: this.score, closeCall });
        this.checkMilestone();
      }
    }

    // cull & refill
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -200);
    this.fillAhead();
  }

  /**
   * Keep the road ahead populated. The type of the *next* obstacle is decided
   * when the current one spawns, so the gap between them is always sized to
   * the phase change the player will actually need.
   */
  fillAhead() {
    const c = this.config;
    while (this.nextSpawnX <= this.spawnX + this.speed * 0.5 + 60) {
      const type = this.pendingType || this.chooseNext(null);
      const x = Math.max(this.nextSpawnX, this.spawnX);
      const o = this.spawn(type, x);
      o.arrivePhase = this.arrivePhase(type, this.lastObstacle ? this.lastObstacle.arrivePhase : PHASE.WATER);
      this.prevObstacleType = this.lastObstacle ? this.lastObstacle.type : null;
      this.lastObstacle = o;
      this.pendingType = this.chooseNext(o);
      const speed = this.speedForScore(this.score);
      let gap = this.gapAfter(o, this.pendingType);
      // Maybe drop a temperature hazard into this gap. The gap grows by a
      // recovery allowance so the shove is a surprise, never an unfair one.
      const hazards = this.unlockedTypes('hazard');
      if (hazards.length && gap / speed >= c.HAZARD_MIN_TIME && this.random() < c.HAZARD_CHANCE) {
        gap += c.HAZARD_RECOVERY * speed;
        const hType = hazards[Math.floor(this.random() * hazards.length)];
        this.spawn(hType, x + o.w + gap * c.HAZARD_POS - c.HAZARD_W / 2);
      }
      this.nextSpawnX = x + o.w + gap;
    }
  }

  die(obstacle) {
    this.over = true;
    this.deathPhase = this.phase;
    this.emit('die', { obstacle, phase: this.phase, score: this.score });
    this.emit('gameover', this);
  }

  checkMilestone() {
    const ms = this.config.MILESTONES;
    while (this.milestoneIdx < ms.length && this.score >= ms[this.milestoneIdx].score) {
      this.emit('milestone', ms[this.milestoneIdx]);
      this.milestoneIdx += 1;
    }
  }

  /** Widen the spawn line for wide viewports so obstacles never pop in on screen. */
  setViewWidth(worldW) {
    this.spawnX = Math.max(this.config.SPAWN_X, worldW + 80);
  }

  /** Next blocking obstacle ahead of the player (for HUD hints / autopilot). */
  nextObstacle() {
    const c = this.config;
    let best = null;
    for (const o of this.obstacles) {
      if (o.kind !== 'obstacle' || o.passed || o.x + o.w < c.PLAYER_X - c.PLAYER_R) continue;
      if (!best || o.x < best.x) best = o;
    }
    return best;
  }
}

/**
 * Reference autopilot: heats or cools toward the phase the next obstacle
 * needs. Tests wrap it in a reaction delay to prove every generated course
 * is beatable by a human; the art tool uses it to script screenshots.
 * Returns `holding`.
 */
export function autopilot(game) {
  const c = game.config;
  const o = game.nextObstacle();
  if (!o) return game.temp < c.TEMP_START;
  const timeToReach = (o.x - c.PLAYER_X) / game.speed;
  if (timeToReach > 3) return game.temp < 52; // idle in the middle of the water band
  const needs = OBSTACLES[o.type].needs;
  // target the nearest acceptable phase, aiming at the middle of its band
  const centres = { ice: c.ICE_MAX / 2, water: (c.ICE_MAX + c.STEAM_MIN) / 2, steam: (c.STEAM_MIN + 100) / 2 };
  let target = centres[needs[0]];
  for (const n of needs) if (Math.abs(centres[n] - game.temp) < Math.abs(target - game.temp)) target = centres[n];
  return game.temp < target - 1;
}
