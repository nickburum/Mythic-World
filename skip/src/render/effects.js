/**
 * SKIP — juice: ripple rings on the water, splash droplets, mote sparkles,
 * sink bubbles, and text pops. World-space x is in metres; the renderer maps it.
 */
const TAU = Math.PI * 2;

export class Effects {
  constructor() { this.ripples = []; this.parts = []; this.pops = []; }
  clear() { this.ripples.length = 0; this.parts.length = 0; this.pops.length = 0; }

  ripple(x, strength = 1, count = 3) {
    for (let i = 0; i < count; i++) this.ripples.push({ x, age: -i * 0.12, life: 1.1 + strength * 0.4, strength });
  }
  splash(x, quality = 0, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 1.2 + Math.random() * (1.8 + quality * 1.6);
      this.parts.push({ x: x + (Math.random() - 0.5) * 0.3, y: 0, vx: Math.cos(a) * sp * 0.6 + 0.8, vy: -Math.sin(a) * sp, age: 0, life: 0.5 + Math.random() * 0.3, r: 1.5 + Math.random() * 2, kind: 'drop', g: 9 });
    }
    if (quality > 0.9) for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU;
      this.parts.push({ x, y: 0.05, vx: Math.cos(a) * 2, vy: Math.abs(Math.sin(a)) * 2.5 + 0.5, age: 0, life: 0.6, r: 2, kind: 'spark', g: 3 });
    }
  }
  moteBurst(x) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, sp = 1 + Math.random() * 2.5; this.parts.push({ x, y: 0.05, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + 1, age: 0, life: 0.7 + Math.random() * 0.3, r: 1.5 + Math.random() * 2, kind: 'spark', g: 2 }); }
  }
  sink(x) {
    this.ripple(x, 1.4, 4);
    for (let i = 0; i < 8; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 0.3, y: -0.05, vx: 0, vy: 0.4 + Math.random() * 0.5, age: -i * 0.08, life: 0.9, r: 1.5 + Math.random() * 2, kind: 'bubble', g: 0 });
  }
  addPop(text, sx, sy, opts = {}) {
    this.pops.push({ text, x: sx, y: sy, age: 0, life: opts.life ?? 0.9, size: opts.size ?? 24, color: opts.color ?? '#fff', rise: opts.rise ?? 40, weight: opts.weight ?? 900 });
  }

  update(dt) {
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter(r => r.age < r.life);
    for (const p of this.parts) {
      p.age += dt; if (p.age < 0) continue;
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind !== 'bubble' && p.y < 0) { p.y = 0; p.vy *= -0.2; p.vx *= 0.6; }
    }
    this.parts = this.parts.filter(p => p.age < p.life);
    for (const t of this.pops) t.age += dt;
    this.pops = this.pops.filter(t => t.age < t.life);
  }

  drawRipples(r) {
    const { ctx } = r;
    for (const rp of this.ripples) {
      if (rp.age < 0) continue;
      const t = rp.age / rp.life;
      const x = r.sx(rp.x);
      if (x < -100 || x > r.w + 100) continue;
      const rx = (6 + t * 70 * rp.strength) * (r.ppm / 40), ry = rx * 0.22;
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.8, 2.2 * (1 - t));
      ctx.beginPath(); ctx.ellipse(x, r.waterY + 1, rx, ry, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(r) {
    const { ctx } = r;
    ctx.save();
    for (const p of this.parts) {
      if (p.age < 0) continue;
      const t = p.age / p.life;
      const x = r.sx(p.x), y = p.kind === 'bubble' ? r.waterY - p.y * r.ppm * 2 : r.sy(p.y);
      if (p.kind === 'spark') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,236,170,${(1 - t).toFixed(3)})`; }
      else if (p.kind === 'bubble') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,255,255,${((1 - t) * 0.5).toFixed(3)})`; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(230,245,255,${((1 - t) * 0.9).toFixed(3)})`; }
      ctx.beginPath(); ctx.arc(x, y, p.r * (r.ppm / 40), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawScreen(r) {
    const { ctx } = r;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.pops) {
      const k = t.age / t.life, ease = 1 - Math.pow(1 - k, 3), scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      ctx.save(); ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.translate(t.x, t.y - ease * t.rise); ctx.scale(scale, scale);
      ctx.font = `${t.weight} ${t.size}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`;
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0); ctx.restore();
    }
  }
}
