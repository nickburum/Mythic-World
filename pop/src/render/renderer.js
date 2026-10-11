/**
 * POP — soap bubbles on a calm indigo stage, drawn with 2D canvas.
 *
 * Readability first: bubbles are near-opaque and each colour also carries a
 * shape (♥ ▲ ● ★ ◆), so the game works for colour-blind players and the
 * target never tints the other bubbles. The target swatch is the game's
 * character: it watches the next bubble to pop, squashes when you pop one
 * and winces when you miss.
 *
 * Performance: the backdrop and one sprite per colour are rendered once per
 * resize; a frame is a handful of drawImage calls.
 */
import { CONFIG } from '../core/pop.js';
const TAU = Math.PI * 2;
export const PALETTE = [
  { name: 'ROSE', h: 340, glyph: '♥', shape: 'heart' }, { name: 'SKY', h: 200, glyph: '▲', shape: 'tri' }, { name: 'MINT', h: 150, glyph: '●', shape: 'dot' },
  { name: 'SUN', h: 42, glyph: '★', shape: 'star' }, { name: 'GRAPE', h: 270, glyph: '◆', shape: 'diamond' },
];
const SPRITE = 128;
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function glyphPath(c, shape, x, y, s) {
  c.beginPath();
  if (shape === 'heart') { c.moveTo(x, y + s * 0.8); c.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.8); }
  else if (shape === 'tri') { c.moveTo(x, y - s * 0.9); c.lineTo(x + s * 0.95, y + s * 0.7); c.lineTo(x - s * 0.95, y + s * 0.7); c.closePath(); }
  else if (shape === 'dot') { c.arc(x, y, s * 0.72, 0, TAU); }
  else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.42 : s * 1.0; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  else { c.moveTo(x, y - s); c.lineTo(x + s * 0.75, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.75, y); c.closePath(); }
}

export class Renderer {
  constructor(canvasEl) { this.canvas = canvasEl; this.ctx = canvasEl.getContext('2d', { alpha: false }); this.sprites = PALETTE.map((p, i) => this.makeSprite(i)); this.face = { squash: 0, wince: 0, look: [0, 0] }; this.resize(); }
  resize() {
    // pixel budget: never more than ~1.4 Mpx of backing store
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1.4e6 / Math.max(1, window.innerWidth * window.innerHeight)));
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.scale = Math.max(this.w / CONFIG.WORLD_W, this.h / CONFIG.WORLD_H);   // cover
    this.ox = (this.w - CONFIG.WORLD_W * this.scale) / 2; this.oy = (this.h - CONFIG.WORLD_H * this.scale) / 2;
    this.bg = this.makeBackdrop(); this.glows = {};
  }
  makeBackdrop() {
    const cv = canvas(Math.max(1, Math.round(this.w * this.dpr)), Math.max(1, Math.round(this.h * this.dpr))), c = cv.getContext('2d'), W = cv.width, H = cv.height;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'hsl(232 38% 20%)'); g.addColorStop(1, 'hsl(262 42% 34%)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // HUD scrim: the score and the swatch always sit on calm dark
    const s = c.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.6); s.addColorStop(0, 'rgba(0,0,0,0.32)'); s.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = s; c.fillRect(0, 0, W, H * 0.5);
    return cv;
  }
  glowFor(h) { if (this.glows[h]) return this.glows[h]; const cv = canvas(256, 256), c = cv.getContext('2d'), g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, `hsl(${h} 80% 62% / 0.30)`); g.addColorStop(1, `hsl(${h} 80% 62% / 0)`); c.fillStyle = g; c.fillRect(0, 0, 256, 256); return (this.glows[h] = cv); }
  makeSprite(i) {
    const p = PALETTE[i], h = p.h, cv = canvas(SPRITE, SPRITE), c = cv.getContext('2d'), R = SPRITE / 2 - 3, x = SPRITE / 2, y = SPRITE / 2;
    const g = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
    g.addColorStop(0, `hsl(${h} 90% 90% / 0.92)`); g.addColorStop(0.55, `hsl(${h} 82% 66% / 0.92)`); g.addColorStop(1, `hsl(${h} 88% 50% / 0.97)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
    c.lineWidth = R * 0.09; c.strokeStyle = `hsl(${h} 95% 86%)`; c.beginPath(); c.arc(x, y, R - c.lineWidth / 2, 0, TAU); c.stroke();
    // shape code (colour-blind safe): white glyph with a soft dark edge
    glyphPath(c, p.shape, x, y + R * 0.05, R * 0.34); c.fillStyle = 'rgba(255,255,255,0.92)'; c.strokeStyle = `hsl(${h} 70% 28% / 0.55)`; c.lineWidth = R * 0.05; c.lineJoin = 'round'; c.stroke(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x - R * 0.42, y - R * 0.46, R * 0.2, R * 0.11, -0.7, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x + R * 0.38, y + R * 0.44, R * 0.08, 0, TAU); c.fill();
    return cv;
  }
  toWorld(sx, sy) { return [(sx - this.ox) / this.scale, (sy - this.oy) / this.scale]; }
  toScreen(x, y) { return [this.ox + x * this.scale, this.oy + y * this.scale]; }
  begin() { const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.translate(this.ox, this.oy); c.scale(this.scale, this.scale); }
  drawBg(targetHue, time, flash = 0) {
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.bg, 0, 0);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const gx = this.w * (0.5 + Math.sin(time * 0.2) * 0.2), gy = this.h * 0.38, gr = this.w * 0.95;
    c.drawImage(this.glowFor(targetHue), gx - gr, gy - gr, gr * 2, gr * 2);
    if (flash > 0) { c.fillStyle = `hsl(${targetHue} 90% 70% / ${0.14 * flash})`; c.fillRect(0, 0, this.w, this.h); }
  }
  bubble(b, x, colorOverride, squash = 0) {
    const c = this.ctx, r = b.r, y = b.y, sp = this.sprites[colorOverride ?? b.color];
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x, y + r * 0.95, r * 0.7, r * 0.18, 0, 0, TAU); c.fill();   // contact shadow
    const sx = 1 + squash * 0.15, sy = 1 - squash * 0.15;
    c.drawImage(sp, x - r * sx * (SPRITE / (SPRITE - 6)), y - r * sy * (SPRITE / (SPRITE - 6)), 2 * r * sx * (SPRITE / (SPRITE - 6)), 2 * r * sy * (SPRITE / (SPRITE - 6)));
  }
  drawBubbles(game) { this.begin(); for (const b of game.bubbles) this.bubble(b, game.bubbleX(b)); }
  /** The target swatch is the character: eyes follow the next bubble to pop. */
  drawTarget(game, pulse, dt = 1 / 60) {
    const c = this.ctx; this.begin();
    const f = this.face, x = CONFIG.WORLD_W / 2, y = 215, r = 26 + pulse * 6;
    f.squash = Math.max(0, f.squash - dt * 8); f.wince = Math.max(0, f.wince - dt * 2.5);
    let tx = 0, ty = 1, best = null;
    for (const b of game.bubbles) if (b.color === game.target && (!best || b.y < best.y)) best = b;
    if (best) { const dx = game.bubbleX(best) - x, dy = best.y - y, d = Math.hypot(dx, dy) || 1; tx = dx / d; ty = dy / d; }
    f.look[0] += (tx - f.look[0]) * Math.min(1, dt * 10); f.look[1] += (ty - f.look[1]) * Math.min(1, dt * 10);
    const shake = f.wince > 0 ? Math.sin(f.wince * 60) * 6 * f.wince : 0;
    c.fillStyle = `hsl(${PALETTE[game.target].h} 90% 60% / 0.25)`; c.beginPath(); c.arc(x + shake, y, r + 14, 0, TAU); c.fill();
    this.bubble({ r, y, color: game.target }, x + shake, undefined, f.squash);
    // eyes
    const er = r * 0.17, ey = y - r * 0.12, gap = r * 0.36;
    for (const s of [-1, 1]) {
      const ex = x + shake + s * gap;
      c.fillStyle = '#fff'; c.beginPath(); if (f.wince > 0.3) { c.ellipse(ex, ey, er, er * 0.25, 0, 0, TAU); } else c.arc(ex, ey, er, 0, TAU); c.fill();
      if (f.wince <= 0.3) { c.fillStyle = '#0f1628'; c.beginPath(); c.arc(ex + f.look[0] * er * 0.45, ey + f.look[1] * er * 0.45, er * 0.55, 0, TAU); c.fill(); }
    }
    c.strokeStyle = '#0f1628'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
    if (f.wince > 0.3) { c.moveTo(x + shake - r * 0.18, y + r * 0.3); c.lineTo(x + shake + r * 0.18, y + r * 0.26); } else c.arc(x + shake, y + r * 0.16, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  }
  /** Game-over vignette. */
  drawVignette(k) { if (k <= 0) return; const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75); g.addColorStop(0, 'rgba(255,90,110,0)'); g.addColorStop(1, `rgba(255,90,110,${0.35 * k})`); c.fillStyle = g; c.fillRect(0, 0, this.w, this.h); }
}
