/**
 * Sky Temple — juice: falling slices, perfect rings, sparks, text pops, shake.
 * Visual only. Everything is spawned from StackGame events in main.js.
 */
import { stoneColors, hsl } from '../core/palette.js';

const GRAVITY = 11;

export class Effects {
  constructor(renderer) {
    this.r = renderer;
    this.pieces = [];
    this.rings = [];
    this.sparks = [];
    this.pops = [];
    this.shake = 0;
  }

  clear() {
    this.pieces.length = 0;
    this.rings.length = 0;
    this.sparks.length = 0;
    this.pops.length = 0;
    this.shake = 0;
  }

  /* ───────────── spawners ───────────── */

  /** A slice (or a whole missed stone) tumbling off the tower. */
  addFallingPiece(block, axis, direction, seedHue) {
    this.pieces.push({
      b: { ...block },
      axis,
      vy: 0.6,
      vside: direction * (0.9 + Math.random() * 0.8),
      rot: 0,
      rotV: direction * (1.2 + Math.random() * 1.6),
      age: 0,
      life: 1.7,
      col: stoneColors(block.index, seedHue),
    });
  }

  /** Expanding glowing outline around a perfectly placed stone. */
  addRing(block, hue, count = 1) {
    for (let i = 0; i < count; i++) {
      this.rings.push({ b: block, hue, age: -i * 0.09, life: 0.6 });
    }
  }

  /** Screen-space sparks bursting from a point. */
  addSparks(px, py, hue, n = 14, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 160) * power;
      this.sparks.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        age: 0, life: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        color: hsl(hue + (Math.random() - 0.5) * 30, 85, 70),
      });
    }
  }

  /** Floating text ("PERFECT", "x5", zone names). */
  addPop(text, px, py, opts = {}) {
    this.pops.push({
      text, x: px, y: py,
      age: 0, life: opts.life ?? 0.9,
      size: opts.size ?? 26,
      color: opts.color ?? '#fff',
      rise: opts.rise ?? 60,
      weight: opts.weight ?? 800,
    });
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  /* ───────────── update ───────────── */

  update(dt, cam) {
    for (const p of this.pieces) {
      p.age += dt;
      p.vy -= GRAVITY * dt;
      p.b.y += p.vy * dt;
      p.b[p.axis] += p.vside * dt;
      p.rot += p.rotV * dt;
    }
    this.pieces = this.pieces.filter(p => p.age < p.life);

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter(r => r.age < r.life);

    for (const s of this.sparks) {
      s.age += dt;
      s.vy += 420 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.sparks = this.sparks.filter(s => s.age < s.life);

    for (const t of this.pops) t.age += dt;
    this.pops = this.pops.filter(t => t.age < t.life);

    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.shake > 0) {
      cam.shakeX = (Math.random() - 0.5) * this.shake;
      cam.shakeY = (Math.random() - 0.5) * this.shake;
    } else {
      cam.shakeX = 0;
      cam.shakeY = 0;
    }
  }

  /* ───────────── draw ───────────── */

  /** World-space effects (drawn with the tower). */
  drawWorld(cam) {
    const { ctx } = this.r;
    for (const p of this.pieces) {
      const alpha = p.age > p.life - 0.5 ? (p.life - p.age) / 0.5 : 1;
      const [cx, cy] = this.r.project(p.b.x, p.b.y + p.b.h / 2, p.b.z, cam);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p.rot * 0.35);
      ctx.translate(-cx, -cy);
      this.r.drawBlock(p.b, p.col, cam, alpha);
      ctx.restore();
    }
    for (const r of this.rings) {
      if (r.age < 0) continue;
      const t = r.age / r.life;
      const inflate = t * 0.45;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = hsl(r.hue, 90, 85);
      ctx.lineWidth = Math.max(1.5, cam.K * 0.05 * (1 - t) + 1);
      ctx.shadowColor = hsl(r.hue, 90, 75);
      ctx.shadowBlur = 12;
      this.r.topFacePath(r.b, cam, inflate);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Screen-space effects (drawn over everything). */
  drawScreen() {
    const { ctx } = this.r;
    for (const s of this.sparks) {
      const t = s.age / s.life;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.pops) {
      const k = t.age / t.life;
      const ease = 1 - Math.pow(1 - k, 3);
      const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.translate(t.x, t.y - ease * t.rise);
      ctx.scale(scale, scale);
      ctx.font = `${t.weight} ${t.size}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }
}
