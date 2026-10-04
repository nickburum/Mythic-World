/** ORBIT — glowing ring, comet with a trail, gems and blockers, deep space. */
import { CONFIG } from '../core/orbit.js';
const TAU = Math.PI * 2;
export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.stars = Array.from({ length: 120 }, (_, i) => ({ x: (i * 0.618) % 1, y: ((i * 0.3819) + 0.17) % 1, r: 0.5 + (i % 3) * 0.5, tw: i })); this.resize(); }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.cx = this.w / 2; this.cy = this.h * 0.52; this.R = Math.min(this.w, this.h) * 0.33;
  }
  pt(a, r = this.R) { return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r]; }
  draw(game, time, trail, fx) {
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const danger = game.blocks.some(b => b.state === 'solid') ? 1 : 0;
    const g = c.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, `hsl(${230 + game.score * 0.8} 45% ${16 + danger * 2}%)`); g.addColorStop(1, '#05070f');
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = '#fff';
    for (const s of this.stars) { c.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + s.tw); c.beginPath(); c.arc(s.x * this.w, s.y * this.h, s.r, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    // ring
    c.lineWidth = 6; c.strokeStyle = 'rgba(125,240,255,0.18)'; c.beginPath(); c.arc(this.cx, this.cy, this.R, 0, TAU); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(125,240,255,0.6)'; c.beginPath(); c.arc(this.cx, this.cy, this.R, 0, TAU); c.stroke();
    // centre star
    const cg = c.createRadialGradient(this.cx, this.cy, 2, this.cx, this.cy, this.R * 0.28);
    cg.addColorStop(0, 'rgba(255,255,255,0.9)'); cg.addColorStop(0.3, 'rgba(185,140,255,0.5)'); cg.addColorStop(1, 'rgba(185,140,255,0)');
    c.fillStyle = cg; c.beginPath(); c.arc(this.cx, this.cy, this.R * 0.28, 0, TAU); c.fill();
    // blockers
    for (const b of game.blocks) {
      const warn = b.state === 'warn'; const k = warn ? b.age / CONFIG.BLOCK_WARN : 1;
      c.lineCap = 'round'; c.lineWidth = warn ? 6 + 10 * k : 16;
      c.strokeStyle = warn ? `rgba(255,90,110,${(0.25 + 0.5 * Math.abs(Math.sin(time * 14))).toFixed(2)})` : '#ff5a6e';
      c.beginPath(); c.arc(this.cx, this.cy, this.R, b.angle - b.half, b.angle + b.half); c.stroke();
      if (!warn) { c.lineWidth = 4; c.strokeStyle = '#ffd1d8'; c.beginPath(); c.arc(this.cx, this.cy, this.R, b.angle - b.half + 0.05, b.angle + b.half - 0.05); c.stroke(); }
    }
    // gems
    for (const gm of game.gems) {
      const [x, y] = this.pt(gm.angle); const s = 9 + Math.sin(time * 5 + gm.id) * 2;
      c.save(); c.translate(x, y); c.rotate(time * 2);
      c.fillStyle = 'rgba(255,230,120,0.35)'; c.beginPath(); c.arc(0, 0, s * 2.2, 0, TAU); c.fill();
      c.fillStyle = '#ffe66b'; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, s); c.lineTo(-s * 0.7, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff8d0'; c.beginPath(); c.moveTo(0, -s * 0.5); c.lineTo(s * 0.3, 0); c.lineTo(0, s * 0.5); c.lineTo(-s * 0.3, 0); c.closePath(); c.fill();
      c.restore();
    }
    // trail + comet
    if (trail) { c.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { const k = i / trail.length; const [x0, y0] = this.pt(trail[i - 1]), [x1, y1] = this.pt(trail[i]); c.strokeStyle = `rgba(125,240,255,${(k * 0.6).toFixed(2)})`; c.lineWidth = 2 + k * 10; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } }
    const [px, py] = this.pt(game.angle);
    const pg = c.createRadialGradient(px, py, 2, px, py, 30); pg.addColorStop(0, 'rgba(255,255,255,0.9)'); pg.addColorStop(0.4, 'rgba(125,240,255,0.6)'); pg.addColorStop(1, 'rgba(125,240,255,0)');
    c.fillStyle = pg; c.beginPath(); c.arc(px, py, 30, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 9, 0, TAU); c.fill();
    fx.draw(c);
  }
}
