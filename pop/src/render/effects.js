/** POP — pop bursts, ripples and text pops in world coordinates. */
const TAU = Math.PI * 2;
export class Effects {
  constructor() { this.parts = []; this.rings = []; this.pops = []; this.shake = 0; }
  clear() { this.parts.length = 0; this.rings.length = 0; this.pops.length = 0; this.shake = 0; }
  burst(x, y, r, hue, n = 16) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 120 + Math.random() * 220; this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, age: 0, life: 0.45 + Math.random() * 0.3, size: 2 + Math.random() * 4, hue: hue + (Math.random() - 0.5) * 40 }); }
    this.rings.push({ x, y, r, age: 0, life: 0.35, hue });
  }
  pop(text, x, y, opts = {}) { this.pops.push({ text, x, y, age: 0, life: opts.life ?? 0.8, size: opts.size ?? 24, color: opts.color ?? '#fff', rise: opts.rise ?? 50 }); }
  update(dt) {
    for (const p of this.parts) { p.age += dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter(p => p.age < p.life);
    for (const r of this.rings) r.age += dt; this.rings = this.rings.filter(r => r.age < r.life);
    for (const t of this.pops) t.age += dt; this.pops = this.pops.filter(t => t.age < t.life);
    this.shake = Math.max(0, this.shake - dt * 40);
  }
  draw(ctx) {
    for (const r of this.rings) { const t = r.age / r.life; ctx.globalAlpha = 1 - t; ctx.strokeStyle = `hsl(${r.hue} 90% 80%)`; ctx.lineWidth = 3 * (1 - t) + 0.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (1 + t * 1.3), 0, TAU); ctx.stroke(); }
    for (const p of this.parts) { const t = p.age / p.life; ctx.globalAlpha = 1 - t; ctx.fillStyle = `hsl(${p.hue} 90% 75%)`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.pops) { const k = t.age / t.life, ease = 1 - Math.pow(1 - k, 3); ctx.save(); ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; ctx.translate(t.x, t.y - ease * t.rise); ctx.font = `900 ${t.size}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeText(t.text, 0, 0); ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0); ctx.restore(); }
  }
}
