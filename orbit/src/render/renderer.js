/**
 * ORBIT — glowing ring, a comet with a face, gems and blockers in deep space.
 * The starfield + nebula is painted once per resize; a frame is the ring,
 * the pieces and a few glows. The comet looks where it is going, squashes
 * when it turns, and the ring pulses on every tenth gem.
 */
import { CONFIG } from '../core/orbit.js';
const TAU = Math.PI * 2;
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    const r = mulberry32(7);
    this.stars = Array.from({ length: 140 }, () => ({ x: r(), y: r(), r: [0.6, 1.1, 1.8][Math.floor(r() * 3)], tint: r() < 0.3 ? '#cfe4ff' : '#ffffff', tw: r() * TAU }));
    this.face = { squash: 0, flash: 0, pulse: 0, star: 0 };
    this.resize();
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1.4e6 / Math.max(1, window.innerWidth * window.innerHeight)));
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.cx = this.w / 2; this.cy = this.h * 0.52; this.R = Math.min(this.w, this.h) * 0.33;
    this.bg = this.paintSky();
  }
  paintSky() {
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(this.w * this.dpr)); cv.height = Math.max(1, Math.round(this.h * this.dpr));
    const c = cv.getContext('2d'); c.scale(this.dpr, this.dpr);
    const g = c.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, 'hsl(232 45% 17%)'); g.addColorStop(1, '#05070f'); c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    for (const [x, y, r, col] of [[0.3, 0.25, 0.6, 'hsl(270 70% 40% / 0.25)'], [0.8, 0.8, 0.5, 'hsl(190 70% 40% / 0.18)']]) {
      const n = c.createRadialGradient(this.w * x, this.h * y, 0, this.w * x, this.h * y, this.w * r); n.addColorStop(0, col); n.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = n; c.fillRect(0, 0, this.w, this.h);
    }
    // decorative inner ring
    c.setLineDash([3, 9]); c.lineWidth = 1; c.strokeStyle = 'rgba(125,240,255,0.08)'; c.beginPath(); c.arc(this.cx, this.cy, this.R * 0.55, 0, TAU); c.stroke(); c.setLineDash([]);
    return cv;
  }
  pt(a, r = this.R) { return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r]; }
  draw(game, time, trail, fx, dt = 1 / 60) {
    const c = this.ctx, f = this.face;
    f.squash = Math.max(0, f.squash - dt * 8); f.flash = Math.max(0, f.flash - dt * 4); f.pulse = Math.max(0, f.pulse - dt * 5); f.star = Math.max(0, f.star - dt * 5.5);
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.bg, 0, 0);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (fx.shake > 0) c.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
    // stars twinkle and drift a little
    for (const s of this.stars) { c.globalAlpha = 0.3 + 0.35 * Math.sin(time * 1.5 + s.tw); c.fillStyle = s.tint; c.beginPath(); c.arc(((s.x + time * 0.002) % 1) * this.w, s.y * this.h, s.r, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    if (game.blocks.some(b => b.state === 'solid')) { c.fillStyle = 'rgba(255,60,90,0.04)'; c.fillRect(-20, -20, this.w + 40, this.h + 40); }
    // ring: halo, glow, line (pulses on milestones of ten)
    const R = this.R * (1 + f.pulse * 0.04);
    c.lineWidth = 26; c.strokeStyle = 'rgba(125,240,255,0.06)'; c.beginPath(); c.arc(this.cx, this.cy, R, 0, TAU); c.stroke();
    c.lineWidth = 12; c.strokeStyle = `rgba(125,240,255,${0.16 + f.pulse * 0.3})`; c.stroke();
    c.lineWidth = 2.5 + f.pulse * 2; c.strokeStyle = 'rgba(170,245,255,0.95)'; c.stroke();
    // centre star: breathes, flares on a gem
    const sr = this.R * (0.28 + 0.03 * Math.sin(time * 7.5)) * (1 + f.star * 0.25);
    const cg = c.createRadialGradient(this.cx, this.cy, 2, this.cx, this.cy, sr);
    cg.addColorStop(0, 'rgba(255,255,255,0.9)'); cg.addColorStop(0.3, 'rgba(185,140,255,0.5)'); cg.addColorStop(1, 'rgba(185,140,255,0)');
    c.fillStyle = cg; c.beginPath(); c.arc(this.cx, this.cy, sr, 0, TAU); c.fill();
    // blockers
    for (const b of game.blocks) {
      const warn = b.state === 'warn'; const k = warn ? Math.min(1, b.age / CONFIG.BLOCK_WARN) : 1;
      const killing = f.flash > 0 && b === this.killer;
      c.lineCap = 'round'; c.lineWidth = warn ? 6 + 10 * k : 16 * (killing ? 1 + f.flash * 0.6 : 1);
      c.strokeStyle = killing ? `rgb(255,${Math.round(90 + 165 * f.flash)},${Math.round(110 + 145 * f.flash)})` : warn ? (b.held ? 'rgba(255,230,120,0.75)' : `rgba(255,90,110,${(0.25 + 0.5 * Math.abs(Math.sin(time * 14))).toFixed(2)})`) : '#ff5a6e';
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
    // trail + comet (hidden for a beat after a crash)
    if (trail) { c.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { const k = i / trail.length; const [x0, y0] = this.pt(trail[i - 1]), [x1, y1] = this.pt(trail[i]); c.strokeStyle = `rgba(125,240,255,${(k * 0.6).toFixed(2)})`; c.lineWidth = 2 + k * 10; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } }
    if (!this.hideComet) {
      const [px, py] = this.pt(game.angle);
      const pg = c.createRadialGradient(px, py, 2, px, py, 30); pg.addColorStop(0, 'rgba(255,255,255,0.9)'); pg.addColorStop(0.4, 'rgba(125,240,255,0.6)'); pg.addColorStop(1, 'rgba(125,240,255,0)');
      c.fillStyle = pg; c.beginPath(); c.arc(px, py, 30, 0, TAU); c.fill();
      // the comet's face: squash along the direction of travel when it turns, eyes look ahead
      const tang = game.angle + game.dir * Math.PI / 2;
      c.save(); c.translate(px, py); c.rotate(tang); c.scale(1 + f.squash * 0.35, 1 - f.squash * 0.25);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
      c.fillStyle = '#1b2a44';
      for (const s of [-1, 1]) { c.beginPath(); c.arc(3.5, s * 3.4, 2.1, 0, TAU); c.fill(); }
      c.restore();
    }
    fx.draw(c);
  }
}
