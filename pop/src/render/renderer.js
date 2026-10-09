/** POP — iridescent soap bubbles on a soft gradient, drawn with 2D canvas. */
import { CONFIG } from '../core/pop.js';
const TAU = Math.PI * 2;
export const PALETTE = [
  { name: 'ROSE', h: 340 }, { name: 'SKY', h: 200 }, { name: 'MINT', h: 150 }, { name: 'SUN', h: 42 }, { name: 'GRAPE', h: 270 },
];
export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.resize(); }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.scale = Math.max(this.w / CONFIG.WORLD_W, this.h / CONFIG.WORLD_H);   // cover
    this.ox = (this.w - CONFIG.WORLD_W * this.scale) / 2; this.oy = (this.h - CONFIG.WORLD_H * this.scale) / 2;
    this.bg = null;
  }
  toWorld(sx, sy) { return [(sx - this.ox) / this.scale, (sy - this.oy) / this.scale]; }
  toScreen(x, y) { return [this.ox + x * this.scale, this.oy + y * this.scale]; }
  begin() { const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.translate(this.ox, this.oy); c.scale(this.scale, this.scale); }
  drawBg(targetHue, time) {
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, `hsl(${targetHue} 45% 14%)`); g.addColorStop(1, `hsl(${(targetHue + 40) % 360} 50% 24%)`);
    c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    // soft drifting glow
    const rg = c.createRadialGradient(this.w * (0.5 + Math.sin(time * 0.2) * 0.2), this.h * 0.35, 10, this.w * 0.5, this.h * 0.4, this.w * 0.9);
    rg.addColorStop(0, `hsl(${targetHue} 80% 60% / 0.22)`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, 0, this.w, this.h);
  }
  bubble(b, x, hueOverride) {
    const c = this.ctx, h = hueOverride ?? PALETTE[b.color].h, r = b.r, y = b.y;
    // body
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, `hsl(${h} 90% 92% / 0.55)`); g.addColorStop(0.6, `hsl(${h} 85% 70% / 0.45)`); g.addColorStop(1, `hsl(${h} 90% 55% / 0.75)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    // iridescent rim
    c.lineWidth = Math.max(1.5, r * 0.09);
    const rim = c.createLinearGradient(x - r, y - r, x + r, y + r);
    rim.addColorStop(0, `hsl(${(h + 120) % 360} 90% 75% / 0.9)`); rim.addColorStop(0.5, `hsl(${h} 90% 85% / 0.9)`); rim.addColorStop(1, `hsl(${(h + 240) % 360} 90% 75% / 0.9)`);
    c.strokeStyle = rim; c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, TAU); c.stroke();
    // highlights
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.7, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x + r * 0.35, y + r * 0.4, r * 0.1, 0, TAU); c.fill();
  }
  drawBubbles(game) { this.begin(); for (const b of game.bubbles) this.bubble(b, game.bubbleX(b)); }
  /** Target swatch in the HUD area (world coords). */
  drawTarget(game, pulse) {
    const c = this.ctx; this.begin();
    const h = PALETTE[game.target].h, x = CONFIG.WORLD_W / 2, y = 215, r = 26 + pulse * 6;
    c.fillStyle = `hsl(${h} 90% 60% / 0.25)`; c.beginPath(); c.arc(x, y, r + 14, 0, TAU); c.fill();
    this.bubble({ r, y, color: game.target }, x);
  }
}
