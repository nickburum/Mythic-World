/**
 * MELT — juice: steam wisps, frost sparkles, drips, death bursts, text pops,
 * screen shake. World-space particles are drawn inside renderer.begin().
 */
import { CONFIG } from '../core/config.js';
import { PHASE_COLORS } from '../core/palette.js';

const TAU = Math.PI * 2;

export class Effects {
  constructor(renderer) {
    this.r = renderer;
    this.parts = [];   // world-space particles
    this.pops = [];    // screen-space text
    this.shake = 0;
  }

  clear() { this.parts.length = 0; this.pops.length = 0; this.shake = 0; }

  /* ───────────── spawners ───────────── */

  particle(p) {
    this.parts.push({ age: 0, life: 0.6, size: 3, g: 0, drag: 1, alpha: 1, shape: 'dot', rot: 0, rotV: 0, ...p });
  }

  /** Continuous ambient per frame: heat wisps when holding, frost when cooling. */
  ambient(x, y, holding, phase, dt) {
    if (Math.random() > dt * (holding ? 26 : 10)) return;
    const R = CONFIG.PLAYER_R;
    if (holding) {
      this.particle({ x: x + (Math.random() - 0.5) * R * 1.4, y: y - R * 0.6, vx: -40 + Math.random() * 20, vy: -70 - Math.random() * 50, life: 0.5 + Math.random() * 0.3, size: 3 + Math.random() * 3, color: phase === 'steam' ? 'rgba(255,255,255,0.9)' : 'rgba(255,170,110,0.9)', shape: 'puff' });
    } else {
      this.particle({ x: x + (Math.random() - 0.5) * R * 1.8, y: y + (Math.random() - 0.5) * R * 1.8, vx: -30, vy: 20 + Math.random() * 30, life: 0.5, size: 1.5 + Math.random() * 1.5, color: 'rgba(200,240,255,0.95)', shape: 'spark' });
    }
  }

  /** Phase change burst. */
  phaseBurst(x, y, to) {
    const col = PHASE_COLORS[to].fill;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.3;
      const sp = 90 + Math.random() * 90;
      this.particle({ x, y, vx: Math.cos(a) * sp - 40, vy: Math.sin(a) * sp, life: 0.45 + Math.random() * 0.25, size: to === 'steam' ? 5 + Math.random() * 5 : 2.5 + Math.random() * 2.5, color: col, shape: to === 'steam' ? 'puff' : to === 'ice' ? 'shard' : 'dot', g: to === 'water' ? 500 : to === 'ice' ? 300 : -80, rotV: (Math.random() - 0.5) * 10 });
    }
  }

  /** Hazard contact: flames or snow. */
  hazardBurst(x, y, kind) {
    for (let i = 0; i < 14; i++) {
      const hot = kind === 'geyser';
      this.particle({ x: x + (Math.random() - 0.5) * 30, y, vx: -60 + Math.random() * 60, vy: hot ? -120 - Math.random() * 100 : 60 + Math.random() * 60, life: 0.6, size: hot ? 5 + Math.random() * 5 : 2 + Math.random() * 2, color: hot ? (Math.random() < 0.5 ? '#ff9a3c' : '#ffd36b') : '#dff6ff', shape: hot ? 'puff' : 'spark' });
    }
  }

  /** Death: shatter / splat / disperse depending on phase. */
  deathBurst(x, y, phase) {
    const col = PHASE_COLORS[phase].fill;
    const n = phase === 'steam' ? 26 : 34;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = phase === 'steam' ? 60 + Math.random() * 90 : 120 + Math.random() * 260;
      this.particle({
        x, y, vx: Math.cos(a) * sp - 60, vy: Math.sin(a) * sp - (phase === 'water' ? 120 : 0),
        life: phase === 'steam' ? 1.2 : 1.0, size: phase === 'steam' ? 8 + Math.random() * 10 : 3 + Math.random() * 5,
        color: col, shape: phase === 'ice' ? 'shard' : phase === 'water' ? 'dot' : 'puff',
        g: phase === 'steam' ? -60 : 700, drag: phase === 'steam' ? 0.9 : 1, rotV: (Math.random() - 0.5) * 14,
      });
    }
    this.shake = phase === 'ice' ? 16 : 10;
  }

  addPop(text, sx, sy, opts = {}) {
    this.pops.push({ text, x: sx, y: sy, age: 0, life: opts.life ?? 0.9, size: opts.size ?? 26, color: opts.color ?? '#fff', rise: opts.rise ?? 50, weight: opts.weight ?? 900 });
  }

  /* ───────────── update / draw ───────────── */

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.g * dt;
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.rotV * dt;
      if (p.y > CONFIG.FLOOR_Y - 2 && p.g > 0 && p.shape !== 'puff') { p.y = CONFIG.FLOOR_Y - 2; p.vy *= -0.3; p.vx *= 0.7; }
    }
    this.parts = this.parts.filter(p => p.age < p.life);
    for (const t of this.pops) t.age += dt;
    this.pops = this.pops.filter(t => t.age < t.life);
    this.shake = Math.max(0, this.shake - dt * 36);
  }

  shakeOffset() {
    return this.shake > 0 ? [(Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake] : [0, 0];
  }

  /** World-space particles (inside renderer.begin()). */
  drawWorld() {
    const { ctx } = this.r;
    for (const p of this.parts) {
      const t = p.age / p.life;
      ctx.globalAlpha = (1 - t) * p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'puff') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + t), 0, TAU); ctx.fill();
      } else if (p.shape === 'shard') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(-p.size, p.size * 0.6); ctx.lineTo(0, -p.size); ctx.lineTo(p.size, p.size * 0.6); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Screen-space text pops (after renderer.end()). */
  drawScreen() {
    const { ctx } = this.r;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.pops) {
      const k = t.age / t.life;
      const ease = 1 - Math.pow(1 - k, 3);
      const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.translate(t.x, t.y - ease * t.rise);
      ctx.scale(scale, scale);
      ctx.font = `${t.weight} ${t.size}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`;
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
