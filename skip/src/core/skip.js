/**
 * SKIP — core simulation. Pure logic: no DOM, no canvas, no audio.
 *
 * Phases: 'ready' (wind-up) → 'flight' (skipping) → 'sunk' (run over).
 * Drive it with `update(dt, holding)` while ready and `tap()` in flight.
 */
import { CONFIG } from './config.js';
import { seededRandom } from './challenge.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class SkipGame {
  /** @param {{ config?: Partial<typeof CONFIG>, random?: () => number, seed?: number }} [opts] */
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.seed = opts.seed ?? null;
    this.random = opts.random || (this.seed !== null ? seededRandom(this.seed) : Math.random);
    this.listeners = {};
    this.reset();
  }

  /** Start over on a specific seeded lake (same motes and pads for everyone with the seed). */
  resetWithSeed(seed) {
    this.seed = seed >>> 0;
    this.random = seededRandom(this.seed);
    this.reset();
  }

  /* ───────────── events ───────────── */
  /** 'throw', 'skip', 'mote', 'pad', 'sink', 'milestone', 'reset' */
  on(e, fn) { (this.listeners[e] ||= []).push(fn); return () => this.off(e, fn); }
  off(e, fn) { const l = this.listeners[e]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  emit(e, p) { const l = this.listeners[e]; if (!l) return; for (const fn of [...l]) fn(p); }

  /* ───────────── lifecycle ───────────── */
  reset() {
    const c = this.config;
    this.phase = 'ready';
    this.time = 0;
    this.charge = 0;
    this.holding = false;
    this.stone = { x: 0, y: c.HAND_HEIGHT, vx: 0, vy: 0, spin: 0 };
    this.skips = 0;
    this.perfects = 0;
    this.goods = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.motesCollected = 0;
    this.distance = 0;
    this.endReason = null;
    this.tapAt = -10;          // time of the last in-window tap
    this.tapLead = null;       // how early that tap was relative to natural contact
    this.motes = [];
    this.pads = [];
    this.nextMoteX = 9 + this.random() * 5;
    this.nextPadX = c.PAD_START + this.random() * 10;
    this.milestoneIdx = 0;
    this.lastSkip = null;      // { x, quality, kind } of the most recent contact
    this.populate();
    this.emit('reset', this);
  }

  /* ───────────── world ───────────── */
  populate() {
    const c = this.config;
    const ahead = this.stone.x + c.LOOKAHEAD;
    while (this.nextMoteX < ahead) {
      this.motes.push({ x: this.nextMoteX, taken: false, seed: this.random() });
      this.nextMoteX += c.MOTE_GAP_MIN + this.random() * (c.MOTE_GAP_MAX - c.MOTE_GAP_MIN);
    }
    while (this.nextPadX < ahead) {
      const x = this.nextPadX;
      // never put a pad right on top of a mote
      if (!this.motes.some(m => Math.abs(m.x - x) < c.PAD_WIDTH + c.MOTE_RADIUS)) {
        this.pads.push({ x, w: c.PAD_WIDTH, flower: this.random() < 0.4, seed: this.random() });
      }
      this.nextPadX += c.PAD_GAP_MIN + this.random() * (c.PAD_GAP_MAX - c.PAD_GAP_MIN);
    }
    const behind = this.stone.x - 30;
    this.motes = this.motes.filter(m => m.x > behind);
    this.pads = this.pads.filter(p => p.x > behind);
  }

  /** Seconds until the stone would hit the water on its current arc (Infinity if rising forever). */
  timeToContact() {
    const s = this.stone, g = this.config.GRAVITY;
    if (s.y <= 0 && s.vy <= 0) return 0;
    // y + vy t − ½ g t² = 0  →  t = (vy + sqrt(vy² + 2 g y)) / g
    const disc = s.vy * s.vy + 2 * g * s.y;
    if (disc < 0) return Infinity;
    return (s.vy + Math.sqrt(disc)) / g;
  }

  /** Where the stone would land on its current arc. */
  predictedLandingX() {
    return this.stone.x + this.stone.vx * this.timeToContact();
  }

  /* ───────────── input ───────────── */

  /** Press-and-release wind-up is driven through update(dt, holding). Tap = release while ready, or skip in flight. */
  tap() {
    if (this.phase === 'flight') return this.skipTap();
    return null;
  }

  /** Called when the finger lifts while winding up. */
  release() {
    if (this.phase !== 'ready') return;
    const c = this.config;
    const charge = this.charge > 0.02 ? this.charge : c.CHARGE_IDLE;
    this.throwStone(charge);
  }

  throwStone(charge) {
    const c = this.config;
    charge = clamp(charge, 0, 1);
    this.stone.vx = c.THROW_VX_MIN + (c.THROW_VX_MAX - c.THROW_VX_MIN) * charge;
    this.stone.vy = c.THROW_VY;
    this.stone.y = c.HAND_HEIGHT;
    this.stone.spin = 0;
    this.phase = 'flight';
    this.emit('throw', { charge, vx: this.stone.vx });
  }

  skipTap() {
    const c = this.config;
    const ttc = this.timeToContact();
    if (ttc > c.EARLY_WINDOW) return { accepted: false, lead: ttc };
    this.tapAt = this.time;
    this.tapLead = ttc;
    // Dip: bring the stone down now so the hop ends here.
    if (ttc > c.PERFECT_WINDOW && this.stone.y > 0) this.stone.vy = Math.min(this.stone.vy, c.DIP_VY);
    return { accepted: true, lead: ttc };
  }

  /* ───────────── simulation ───────────── */

  update(dt, holding = false) {
    if (this.phase === 'sunk') return;
    this.time += dt;
    const c = this.config;

    if (this.phase === 'ready') {
      this.holding = holding;
      if (holding) this.charge = clamp(this.charge + dt / c.CHARGE_TIME, 0, 1);
      return;
    }

    const s = this.stone;
    s.vy -= c.GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.spin += s.vx * dt * 2.2;
    this.distance = Math.max(this.distance, s.x);

    if (s.y <= 0 && s.vy < 0) {
      s.y = 0;
      this.contact();
    }
    this.populate();
    this.checkMilestone();
  }

  /** The stone meets the water. */
  contact() {
    const c = this.config;
    const s = this.stone;

    // lily pad?
    const pad = this.pads.find(p => Math.abs(p.x - s.x) <= p.w / 2);
    if (pad) {
      this.end('pad', pad);
      return;
    }

    // out of speed?
    if (s.vx < c.MIN_SPEED) {
      this.end('sink');
      return;
    }

    // skip quality from the tap timing
    const sinceTap = this.time - this.tapAt;
    let quality = 0, kind = 'plain';
    if (sinceTap <= c.EARLY_WINDOW + 0.05 && this.tapLead !== null) {
      const lead = this.tapLead;
      if (lead <= c.PERFECT_WINDOW) { quality = 1; kind = 'perfect'; }
      else if (lead <= c.GOOD_WINDOW) { quality = 1 - (lead - c.PERFECT_WINDOW) / (c.GOOD_WINDOW - c.PERFECT_WINDOW) * 0.5; kind = 'good'; }
      else { quality = 0.5 * (1 - (lead - c.GOOD_WINDOW) / (c.EARLY_WINDOW - c.GOOD_WINDOW)); kind = 'early'; }
    }
    quality = clamp(quality, 0, 1);
    this.tapAt = -10; this.tapLead = null;

    if (kind === 'perfect') { this.perfects++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
    else { if (kind === 'good') this.goods++; this.streak = 0; }

    const retain = c.RETAIN_BASE + (c.RETAIN_PERFECT - c.RETAIN_BASE) * quality;
    s.vx *= retain;
    if (kind === 'perfect') s.vx += Math.min(c.PERFECT_BOOST_CAP, c.PERFECT_BOOST * this.streak);

    // mote?
    let mote = null;
    for (const m of this.motes) {
      if (!m.taken && Math.abs(m.x - s.x) <= c.MOTE_RADIUS) { m.taken = true; mote = m; break; }
    }
    if (mote) { this.motesCollected++; s.vx += c.MOTE_BOOST; this.emit('mote', { mote, x: s.x }); }

    const bounceQ = c.BOUNCE_MIN_QUALITY + (1 - c.BOUNCE_MIN_QUALITY) * quality;
    s.vy = Math.min(c.BOUNCE_MAX, s.vx * c.BOUNCE_RATIO) * bounceQ;
    s.y = 0.001;
    this.skips++;
    this.lastSkip = { x: s.x, quality, kind, speed: s.vx, streak: this.streak };
    this.emit('skip', this.lastSkip);
  }

  /** Continue after sinking: the stone is back in the air with a fresh throw's speed, pads just ahead are cleared. */
  revive() {
    if (this.phase !== 'sunk') return false;
    const c = this.config, s = this.stone;
    this.pads = this.pads.filter(p => p.x > s.x + 28);
    s.vx = c.THROW_VX_MIN + (c.THROW_VX_MAX - c.THROW_VX_MIN) * 0.5; s.vy = c.THROW_VY; s.y = c.HAND_HEIGHT * 0.5;
    this.phase = 'flight'; this.endReason = null; this.tapAt = -10; this.tapLead = null;
    this.emit('revive', this);
    return true;
  }

  end(reason, pad = null) {
    this.phase = 'sunk';
    this.endReason = reason;
    this.stone.vx = 0; this.stone.vy = 0; this.stone.y = 0;
    this.emit('sink', { reason, pad, distance: this.distance, skips: this.skips, perfects: this.perfects, motes: this.motesCollected, bestStreak: this.bestStreak });
  }

  checkMilestone() {
    const ms = this.config.MILESTONES;
    while (this.milestoneIdx < ms.length && this.distance >= ms[this.milestoneIdx].distance) {
      this.emit('milestone', ms[this.milestoneIdx]);
      this.milestoneIdx++;
    }
  }

  /** 0 = golden hour, 1 = deep night. */
  dayPhase() {
    return clamp(this.distance / this.config.DAY_LENGTH, 0, 1);
  }
}

/**
 * Reference autopilot for tests and screenshots. Returns true when it wants
 * to tap this frame: a perfect tap at contact, or an early dip when the
 * natural landing would hit a lily pad (or when a mote is reachable sooner).
 */
export function autopilot(game) {
  if (game.phase !== 'flight') return false;
  const c = game.config;
  const ttc = game.timeToContact();
  if (ttc > c.EARLY_WINDOW) return false;
  const landing = game.predictedLandingX();
  const onPad = game.pads.some(p => Math.abs(p.x - landing) <= p.w / 2 + 0.3);
  if (onPad) return true;                     // dip now, land short of the pad
  return ttc <= c.PERFECT_WINDOW * 0.5;       // otherwise wait for the perfect moment
}
