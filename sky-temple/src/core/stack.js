/**
 * Sky Temple — core game simulation.
 *
 * Pure logic: no DOM, no canvas, no audio, no timers. It is driven by
 * `update(dt)` and `drop()` and reports what happened through events.
 * This file is the thing to port first (Unity C# / Swift); everything
 * else in the project is presentation around it.
 *
 * World space: X and Z are the horizontal plane, Y is up.
 * A "block" is an axis-aligned box: centre (x, z), footprint (w, d),
 * bottom y, height h.
 */
import { CONFIG } from './config.js';

/** @typedef {'x'|'z'} Axis */

/**
 * @typedef {Object} Block
 * @property {number} x  centre on X
 * @property {number} z  centre on Z
 * @property {number} w  footprint along X
 * @property {number} d  footprint along Z
 * @property {number} y  bottom
 * @property {number} h  height
 * @property {number} index  0 = base stone
 * @property {boolean} [perfect]  placed with a perfect drop
 */

/**
 * @typedef {Object} MovingBlock
 * @property {number} x
 * @property {number} z
 * @property {number} w
 * @property {number} d
 * @property {number} y
 * @property {number} h
 * @property {number} index
 * @property {Axis} axis   axis the block slides along
 * @property {1|-1} dir
 * @property {number} speed
 */

/**
 * @typedef {Object} DropResult
 * @property {'perfect'|'cut'|'miss'} type
 * @property {Axis} axis      axis the stone was sliding along
 * @property {Block} block     the piece that stayed on the tower (for 'miss': the whole lost block)
 * @property {Block|null} cut  the piece that fell off (only for 'cut')
 * @property {number} delta    signed centre offset along the slide axis
 * @property {number} combo    perfect streak after this drop
 * @property {boolean} grew    true when the perfect drop regrew the footprint
 */

const SIZE_KEY = { x: 'w', z: 'd' };

export class StackGame {
  /**
   * @param {{ config?: Partial<typeof CONFIG>, random?: () => number }} [opts]
   */
  constructor(opts = {}) {
    this.config = { ...CONFIG, ...(opts.config || {}) };
    this.random = opts.random || Math.random;
    /** @type {Record<string, Function[]>} */
    this.listeners = {};
    this.reset();
  }

  /* ───────────── events ───────────── */

  /** Subscribe. Events: 'place', 'perfect', 'cut', 'miss', 'gameover', 'milestone', 'reset'. */
  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this.listeners[event];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  emit(event, payload) {
    const list = this.listeners[event];
    if (!list) return;
    for (const fn of [...list]) fn(payload);
  }

  /* ───────────── lifecycle ───────────── */

  reset() {
    const c = this.config;
    /** @type {Block[]} */
    this.blocks = [
      { x: 0, z: 0, w: c.BLOCK_SIZE, d: c.BLOCK_SIZE, y: 0, h: c.BLOCK_HEIGHT, index: 0, perfect: true },
    ];
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.perfects = 0;
    this.over = false;
    this.time = 0;
    this.milestoneIdx = 0;
    /** @type {MovingBlock|null} */
    this.moving = null;
    this.spawnMoving();
    this.emit('reset', this);
  }

  /** Top-most placed block. */
  top() {
    return this.blocks[this.blocks.length - 1];
  }

  /** Height of the tower in world units (top surface of the top block). */
  towerHeight() {
    const t = this.top();
    return t.y + t.h;
  }

  /** Slide speed for the current score. */
  speedForScore(score) {
    const c = this.config;
    return Math.min(c.MAX_SPEED, c.BASE_SPEED + score * c.SPEED_PER_LEVEL);
  }

  spawnMoving() {
    const c = this.config;
    const top = this.top();
    /** @type {Axis} */
    const axis = this.blocks.length % 2 === 1 ? 'x' : 'z';
    const dir = this.random() < 0.5 ? 1 : -1;
    const m = {
      x: top.x,
      z: top.z,
      w: top.w,
      d: top.d,
      y: top.y + top.h,
      h: c.BLOCK_HEIGHT,
      index: this.blocks.length,
      axis,
      dir,
      speed: this.speedForScore(this.score),
    };
    // Start on the far side, sliding towards the tower.
    m[axis] = top[axis] - dir * c.SLIDE_RANGE;
    this.moving = m;
  }

  /* ───────────── simulation ───────────── */

  /** Advance the sliding stone. @param {number} dt seconds */
  update(dt) {
    if (this.over || !this.moving) return;
    this.time += dt;
    const m = this.moving;
    const centre = this.top()[m.axis];
    const range = this.config.SLIDE_RANGE;
    let p = m[m.axis] + m.dir * m.speed * dt;
    if (p > centre + range) {
      p = centre + range - (p - (centre + range));
      m.dir = -1;
    } else if (p < centre - range) {
      p = centre - range + (centre - range - p);
      m.dir = 1;
    }
    m[m.axis] = p;
  }

  /**
   * Drop the sliding stone onto the tower.
   * @returns {DropResult|null} null when there is nothing to drop
   */
  drop() {
    if (this.over || !this.moving) return null;
    const c = this.config;
    const m = this.moving;
    const below = this.top();
    const axis = m.axis;
    const sizeKey = SIZE_KEY[axis];
    const size = below[sizeKey];
    const delta = m[axis] - below[axis];
    const overlap = size - Math.abs(delta);

    // ── miss: nothing is left on the tower ──
    if (overlap <= c.MIN_SIZE) {
      const lost = this.toBlock(m);
      this.moving = null;
      this.over = true;
      const result = { type: 'miss', axis, block: lost, cut: null, delta, combo: 0, grew: false };
      this.emit('miss', result);
      this.emit('gameover', this);
      return result;
    }

    let placed;
    let cut = null;
    let grew = false;
    let type;

    if (Math.abs(delta) <= c.PERFECT_TOLERANCE) {
      // ── perfect: snap onto the stone below ──
      type = 'perfect';
      this.combo += 1;
      this.perfects += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      placed = this.toBlock(m);
      placed[axis] = below[axis];
      placed[sizeKey] = size;
      if (this.combo >= c.GROW_AFTER_COMBO && size < c.BLOCK_SIZE) {
        placed[sizeKey] = Math.min(c.BLOCK_SIZE, size + c.GROW_AMOUNT);
        grew = true;
      }
      placed.perfect = true;
    } else {
      // ── cut: keep the overlap, shear off the rest ──
      type = 'cut';
      this.combo = 0;
      placed = this.toBlock(m);
      placed[sizeKey] = overlap;
      placed[axis] = (below[axis] + m[axis]) / 2;
      const sign = Math.sign(delta);
      cut = this.toBlock(m);
      cut[sizeKey] = Math.abs(delta);
      cut[axis] = (below[axis] + m[axis]) / 2 + sign * (size / 2);
      placed.perfect = false;
    }

    this.blocks.push(placed);
    this.score += 1;
    this.moving = null;

    const result = { type, axis, block: placed, cut, delta, combo: this.combo, grew };
    this.emit(type, result);
    this.emit('place', result);
    this.checkMilestone();
    this.spawnMoving();
    return result;
  }

  checkMilestone() {
    const ms = this.config.MILESTONES;
    while (this.milestoneIdx < ms.length && this.score >= ms[this.milestoneIdx].score) {
      this.emit('milestone', ms[this.milestoneIdx]);
      this.milestoneIdx += 1;
    }
  }

  /** Strip motion fields off a moving block. @returns {Block} */
  toBlock(m) {
    return { x: m.x, z: m.z, w: m.w, d: m.d, y: m.y, h: m.h, index: m.index };
  }
}
