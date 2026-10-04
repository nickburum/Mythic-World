/** ORBIT — controller. One tap: reverse. */
import { OrbitGame, autopilot } from './core/orbit.js';
import { Renderer } from './render/renderer.js';
const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem('orbit.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('orbit.' + k, JSON.stringify(v)); } catch {} } };
const vib = (p, on) => { if (on && navigator.vibrate) navigator.vibrate(p); };
const TAU = Math.PI * 2;
class Fx {
  constructor() { this.parts = []; this.pops = []; }
  clear() { this.parts.length = 0; this.pops.length = 0; }
  burst(x, y, color, n = 16, sp = 200) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.5 + Math.random() * 0.3, size: 2 + Math.random() * 3, color }); } }
  pop(text, x, y, opts = {}) { this.pops.push({ text, x, y, age: 0, life: opts.life ?? 0.9, size: opts.size ?? 24, color: opts.color ?? '#fff', rise: opts.rise ?? 40 }); }
  update(dt) { for (const p of this.parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; } this.parts = this.parts.filter(p => p.age < p.life); for (const t of this.pops) t.age += dt; this.pops = this.pops.filter(t => t.age < t.life); }
  draw(c) { for (const p of this.parts) { c.globalAlpha = 1 - p.age / p.life; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); } c.globalAlpha = 1; c.textAlign = 'center'; c.textBaseline = 'middle'; for (const t of this.pops) { const k = t.age / t.life, e = 1 - Math.pow(1 - k, 3); c.save(); c.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; c.translate(t.x, t.y - e * t.rise); c.font = `900 ${t.size}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`; c.lineWidth = 5; c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.strokeText(t.text, 0, 0); c.fillStyle = t.color; c.fillText(t.text, 0, 0); c.restore(); } }
}
class Sfx {
  constructor() { this.ctx = null; this.muted = false; }
  unlock() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.g = this.ctx.createGain(); this.g.gain.value = this.muted ? 0 : 0.5; this.g.connect(this.ctx.destination); } if (this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.g) this.g.gain.value = m ? 0 : 0.5; }
  tone(f, to, type, dur, vol, delay = 0) { if (!this.ctx || this.muted) return; const t0 = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g).connect(this.g); o.start(t0); o.stop(t0 + dur + 0.02); }
  reverse() { this.tone(400, 700, 'sine', 0.1, 0.18); }
  gem(n) { const f = 660 * Math.pow(2, ([0, 2, 4, 7, 9, 12, 14][Math.min(n % 7, 6)]) / 12); this.tone(f, f, 'triangle', 0.25, 0.2); this.tone(f * 2, f * 2, 'sine', 0.2, 0.08, 0.03); }
  warn() { this.tone(180, 180, 'square', 0.08, 0.05); }
  crash() { this.tone(300, 60, 'sawtooth', 0.5, 0.3); }
  tap() { this.tone(880, 660, 'sine', 0.08, 0.12); }
}
class App {
  constructor() {
    this.canvas = $('game'); this.r = new Renderer(this.canvas); this.fx = new Fx(); this.sfx = new Sfx(); this.game = new OrbitGame();
    this.state = 'title'; this.time = 0; this.stateTime = 0; this.last = performance.now(); this.trail = []; this.autopilot = false; this.lastAuto = 0; this.lastHud = -1;
    this.best = LS.get('best', 0); this.games = LS.get('games', 0); this.muted = LS.get('muted', false); this.haptics = LS.get('haptics', true); this.sfx.setMuted(this.muted);
    this.ui = { title: $('title'), hud: $('hud'), over: $('over'), score: $('score'), best: $('best'), overScore: $('over-score'), overBest: $('over-best'), newBest: $('new-best'), mute: $('mute') };
    this.ui.best.textContent = this.best; this.ui.mute.classList.toggle('muted', this.muted);
    const g = this.game;
    g.on('collect', (e) => { const [x, y] = this.r.pt(e.gem.angle); this.fx.burst(x, y, '#ffe66b'); this.sfx.gem(e.score); vib(10, this.haptics); if (this.ui.score) this.ui.score.textContent = e.score; });
    g.on('reverse', () => { this.sfx.reverse(); vib(6, this.haptics); const [x, y] = this.r.pt(g.angle); this.fx.burst(x, y, '#7df0ff', 8, 120); });
    g.on('solid', () => { this.sfx.warn(); });
    g.on('milestone', (m) => this.fx.pop(m.name.toUpperCase(), this.r.w / 2, this.r.h * 0.2, { size: 26, color: 'hsl(45 100% 78%)', life: 1.6, rise: 24 }));
    g.on('gameover', (e) => this.onOver(e));
    this.canvas.addEventListener('pointerdown', (e) => this.press(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); this.press(e); } });
    $('play').addEventListener('click', () => { this.click(); this.start(); }); $('retry').addEventListener('click', () => { this.click(); this.start(); }); $('to-title').addEventListener('click', () => { this.click(); this.toTitle(); });
    this.ui.mute.addEventListener('click', () => { this.muted = !this.muted; LS.set('muted', this.muted); this.sfx.setMuted(this.muted); this.sfx.unlock(); this.ui.mute.classList.toggle('muted', this.muted); });
    window.addEventListener('resize', () => this.r.resize()); document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    window.__orbit = this; requestAnimationFrame((t) => this.frame(t));
  }
  click() { this.sfx.unlock(); this.sfx.tap(); }
  setState(s) { this.state = s; this.stateTime = 0; document.body.dataset.state = s; this.ui.title.hidden = s !== 'title'; this.ui.hud.hidden = s !== 'play'; this.ui.over.hidden = s !== 'over'; }
  toTitle() { this.game.reset(); this.fx.clear(); this.trail.length = 0; this.setState('title'); }
  start() { this.sfx.unlock(); this.game.reset(); this.fx.clear(); this.trail.length = 0; this.setState('play'); this.ui.score.textContent = '0'; }
  press(e) { if (e.target && e.target.closest && e.target.closest('[data-ui]')) return; if (e.preventDefault) e.preventDefault(); this.sfx.unlock(); if (this.state === 'title') { this.start(); return; } if (this.state === 'over') { if (this.stateTime > 0.6) this.start(); return; } this.game.tap(); }
  onOver(e) {
    this.sfx.crash(); vib([40, 40, 60], this.haptics); const [x, y] = this.r.pt(this.game.angle); this.fx.burst(x, y, '#fff', 30, 320); this.fx.burst(x, y, '#ff5a6e', 20, 200);
    this.games++; LS.set('games', this.games); const isBest = e.score > this.best; if (isBest) { this.best = e.score; LS.set('best', this.best); }
    this.ui.overScore.textContent = e.score; this.ui.overBest.textContent = this.best; this.ui.best.textContent = this.best; this.ui.newBest.hidden = !isBest || e.score === 0;
    setTimeout(() => this.setState('over'), 700);
  }
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.time += dt; this.stateTime += dt; const g = this.game;
    if (this.state === 'play') { if (this.autopilot && this.time - this.lastAuto > 0.25 && autopilot(g)) { g.tap(); this.lastAuto = this.time; } g.update(dt); }
    else if (this.state === 'title') { g.angle = ((g.angle + 1.2 * dt) % TAU + TAU) % TAU; }
    this.trail.push(g.angle); if (this.trail.length > 14) this.trail.shift();
    this.fx.update(dt);
    this.r.draw(g, this.time, this.state === 'over' ? null : this.trail, this.fx);
    requestAnimationFrame((t) => this.frame(t));
  }
}
window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
