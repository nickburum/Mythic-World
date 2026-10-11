/**
 * POP — core. Bubbles rise; pop the ones matching the target colour.
 * Pure logic on a 390 × 700 reference world; the renderer scales it.
 *
 * Rules: tap a target-colour bubble → +1 (combo grows). Tap a wrong colour
 * → lose a life. Let a target-colour bubble float off the top → lose a life.
 * Three lives. Speed and spawn rate ramp with score; the target colour
 * changes every TARGET_EVERY pops so the eye never settles.
 *
 * Fairness: when the target changes, new-target bubbles already in the top
 * half switch to the old colour and escapes are forgiven for a short grace,
 * so nobody loses a life to a colour they could not have reacted to.
 * Chains: every 5 in a row is worth more per pop; 10 in a row starts a
 * 3-second FRENZY where every bubble is the target colour.
 * Chain pop: popping a target bubble also pops every target bubble touching
 * it (within CHAIN_RADIUS), recursively; link n scores n. Same-colour
 * bubbles drift together as they rise, so waiting builds bigger chains —
 * at the risk of letting one escape.
 */
export const CONFIG = Object.freeze({
  WORLD_W: 390, WORLD_H: 700,
  COLORS: 5,                 // palette size (indices 0..4)
  LIVES: 3,
  R_MIN: 22, R_MAX: 34,
  SPEED_MIN: 70, SPEED_MAX: 110,      // px/s at score 0
  SPEED_RAMP: 1.6,                    // extra px/s per pop
  SPEED_CAP: 190,                     // base rise speed never exceeds this
  SWITCH_GRACE: 0.8,                  // seconds of forgiven escapes after a target change
  FRENZY_AT: 10, FRENZY_TIME: 3,      // combo that starts a frenzy, and how long it lasts
  SPAWN_START: 0.6, SPAWN_MIN: 0.38, SPAWN_RAMP: 0.006,    // seconds between spawns
  TARGET_EVERY_START: 6, TARGET_EVERY: 12,   // pops per colour: quick changes early, longer later
  TARGET_SHARE_START: 0.65, TARGET_SHARE: 0.40, TARGET_SHARE_RAMP: 30,   // eases from busy to picky over the first 30 points
  CHAIN_RADIUS: 80,          // target bubbles this close to a popped one pop with it
  CLUSTER_RADIUS: 120, CLUSTER_PULL: 20,   // same colours drift together (px, px/s)
  TAP_SLOP: 14,              // extra hit radius in px (fat fingers)
  MILESTONES: [{ score: 10, name: 'Warm up' }, { score: 25, name: 'Bubbly' }, { score: 50, name: 'Fizzing' }, { score: 100, name: 'Soap master' }],
});

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class PopGame {
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.random = opts.random || (opts.seed !== undefined ? mulberry32(opts.seed) : Math.random);
    // a second stream for target picks, so the spawn sequence never depends on when the player pops
    this.randomTarget = opts.random || (opts.seed !== undefined ? mulberry32((opts.seed ^ 0x9E3779B9) >>> 0) : Math.random);
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
    this.graceUntil = 0; this.frenzyUntil = 0; this.pendingSwitch = false;
    this.target = Math.floor(this.randomTarget() * c.COLORS);
    this.emit('reset', this);
  }

  spawnInterval() { const c = this.config; return Math.max(c.SPAWN_MIN, c.SPAWN_START - this.score * c.SPAWN_RAMP); }
  speedFor() { const c = this.config; return Math.min(c.SPEED_CAP, c.SPEED_MIN + this.random() * (c.SPEED_MAX - c.SPEED_MIN) + this.score * c.SPEED_RAMP); }
  /** Pops per colour: 6 at first, one more per colour change, up to TARGET_EVERY. */
  targetEvery() { const c = this.config; return Math.min(c.TARGET_EVERY, (c.TARGET_EVERY_START ?? c.TARGET_EVERY) + (this.switches || 0)); }
  get frenzy() { return this.time < this.frenzyUntil; }
  /** Points for the next pop: 1, then +1 for every 5 in a row (max 4). */
  pointsFor(combo) { return 1 + Math.min(3, Math.floor((combo - 1) / 5)); }

  spawn() {
    const c = this.config;
    const r = c.R_MIN + this.random() * (c.R_MAX - c.R_MIN);
    const k = Math.min(1, this.score / c.TARGET_SHARE_RAMP), share = c.TARGET_SHARE_START + (c.TARGET_SHARE - c.TARGET_SHARE_START) * k;
    const isTarget = this.random() < share;
    let color = this.target;
    if (!isTarget && !this.frenzy) { color = Math.floor(this.random() * (c.COLORS - 1)); if (color >= this.target) color++; }
    const b = { id: this.nextId++, x: r + this.random() * (c.WORLD_W - 2 * r), y: c.WORLD_H + r, r, color, vy: this.speedFor(), wob: this.random() * Math.PI * 2, wobAmp: 6 + this.random() * 10, born: this.time };
    this.bubbles.push(b);
    this.emit('spawn', b);
    return b;
  }

  update(dt) {
    if (this.over) return;
    this.time += dt;
    if (this.pendingSwitch && !this.frenzy) { this.pendingSwitch = false; this.emit('frenzyEnd', {}); this.changeTarget(); }
    this.spawnIn -= dt;
    while (this.spawnIn <= 0) { this.spawn(); this.spawnIn += this.spawnInterval(); }
    const c = this.config;
    // same colours drift toward each other, so clusters form for chain pops
    for (const b of this.bubbles) {
      let near = null, nd = c.CLUSTER_RADIUS;
      for (const o of this.bubbles) if (o !== b && o.color === b.color) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < nd) { nd = d; near = o; } }
      if (near && nd > b.r + near.r) { b.x += Math.sign(near.x - b.x) * Math.min(Math.abs(near.x - b.x), c.CLUSTER_PULL * dt); b.vy += (near.vy - b.vy) * Math.min(1, dt * 0.8); }
      b.x = Math.max(b.r, Math.min(c.WORLD_W - b.r, b.x));
    }
    for (const b of this.bubbles) { b.y -= b.vy * dt; b.wob += dt * 2.2; }
    // escaped?
    const gone = this.bubbles.filter(b => b.y + b.r < -10);
    if (gone.length) {
      this.bubbles = this.bubbles.filter(b => b.y + b.r >= -10);
      const forgiven = this.time < this.graceUntil || this.frenzy;
      for (const b of gone) if (b.color === this.target && !forgiven) this.loseLife('escape', b);
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
    if (best.color === this.target) {
      // flood out from the tapped bubble through touching target bubbles
      const chain = [best], seen = new Set([best]);
      for (let i = 0; i < chain.length; i++) {
        const a = chain[i], ax = this.bubbleX(a);
        for (const o of this.bubbles) if (!seen.has(o) && o.color === this.target && Math.hypot(this.bubbleX(o) - ax, o.y - a.y) <= c.CHAIN_RADIUS) { seen.add(o); chain.push(o); }
      }
      this.bubbles = this.bubbles.filter(b => !seen.has(b));
      this.combo++; const mult = this.pointsFor(this.combo); let pts = 0;
      chain.forEach((b, i) => { pts += (i + 1) * mult; });
      this.score += pts; this.bestCombo = Math.max(this.bestCombo, this.combo); this.popsSinceTarget++;
      this.bestChain = Math.max(this.bestChain || 0, chain.length);
      this.emit('pop', { bubble: best, score: this.score, combo: this.combo, points: pts, chain });
      this.checkMilestone();
      if (!this.frenzy && this.combo % c.FRENZY_AT === 0) {
        this.frenzyUntil = this.time + c.FRENZY_TIME; this.pendingSwitch = true;
        for (const b of this.bubbles) b.color = this.target;
        this.emit('frenzy', { combo: this.combo, until: this.frenzyUntil });
      } else if (!this.frenzy && !this.pendingSwitch && this.popsSinceTarget >= this.targetEvery()) this.changeTarget();
      return { hit: true, bubble: best, kind: 'pop', chain: chain.length };
    }
    this.bubbles = this.bubbles.filter(b => b !== best);
    this.combo = 0;
    this.emit('wrong', { bubble: best });
    this.loseLife('wrong', best);
    return { hit: true, bubble: best, kind: 'wrong' };
  }

  /** Continue after game over: two lives back, a clear screen, score kept. */
  revive() {
    if (!this.over) return false;
    this.over = false; this.lives = 2; this.bubbles = []; this.spawnIn = 0.9; this.combo = 0; this.frenzyUntil = 0; this.graceUntil = this.time + 1;
    this.emit('revive', this);
    return true;
  }

  changeTarget() {
    const c = this.config;
    let t = Math.floor(this.randomTarget() * (c.COLORS - 1)); if (t >= this.target) t++;
    const from = this.target; this.target = t; this.popsSinceTarget = 0; this.switches = (this.switches || 0) + 1;
    // nobody can react to a colour that is already nearly gone: recolour the top half, forgive escapes briefly
    for (const b of this.bubbles) if (b.color === t && b.y < c.WORLD_H * 0.5) b.color = from;
    this.graceUntil = this.time + c.SWITCH_GRACE;
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
