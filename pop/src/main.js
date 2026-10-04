/** POP — controller: title, play, result sheet; haptics; procedural sound. */
import { PopGame, CONFIG, autopilot } from './core/pop.js';
import { Renderer, PALETTE } from './render/renderer.js';
import { Effects } from './render/effects.js';

const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem('pop.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pop.' + k, JSON.stringify(v)); } catch {} } };
const vib = (p, on) => { if (on && navigator.vibrate) navigator.vibrate(p); };

class Sfx {
  constructor() { this.ctx = null; this.muted = false; }
  unlock() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.g = this.ctx.createGain(); this.g.gain.value = this.muted ? 0 : 0.5; this.g.connect(this.ctx.destination); } if (this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.g) this.g.gain.value = m ? 0 : 0.5; }
  tone(f, to, type, dur, vol, delay = 0) { if (!this.ctx || this.muted) return; const t0 = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g).connect(this.g); o.start(t0); o.stop(t0 + dur + 0.02); }
  pop(combo) { const f = 520 * Math.pow(2, ([0, 2, 4, 7, 9, 12, 14, 16][Math.min(combo, 7)]) / 12); this.tone(f, f * 1.5, 'sine', 0.12, 0.25); this.tone(f * 2, f * 2, 'triangle', 0.08, 0.08, 0.02); }
  wrong() { this.tone(220, 110, 'sawtooth', 0.25, 0.2); }
  escape() { this.tone(300, 150, 'sine', 0.3, 0.2); }
  target() { [660, 880, 1100].forEach((f, i) => this.tone(f, f, 'triangle', 0.25, 0.14, i * 0.06)); }
  over() { this.tone(330, 80, 'sine', 0.6, 0.3); }
  tap() { this.tone(880, 660, 'sine', 0.08, 0.12); }
}

class App {
  constructor() {
    this.canvas = $('game'); this.r = new Renderer(this.canvas); this.fx = new Effects(); this.sfx = new Sfx();
    this.game = new PopGame(); this.state = 'title'; this.time = 0; this.stateTime = 0; this.last = performance.now();
    this.best = LS.get('best', 0); this.games = LS.get('games', 0); this.muted = LS.get('muted', false); this.haptics = LS.get('haptics', true);
    this.sfx.setMuted(this.muted); this.autopilot = false; this.pulse = 0; this.lastHud = {};
    this.ui = { title: $('title'), hud: $('hud'), over: $('over'), score: $('score'), lives: $('lives'), target: $('target-name'), best: $('best'), overScore: $('over-score'), overBest: $('over-best'), overCombo: $('over-combo'), newBest: $('new-best'), mute: $('mute') };
    this.ui.best.textContent = this.best; this.ui.mute.classList.toggle('muted', this.muted);
    const g = this.game;
    g.on('pop', (e) => this.onPop(e)); g.on('wrong', (e) => this.onWrong(e)); g.on('life', (e) => this.onLife(e)); g.on('target', () => this.onTarget()); g.on('gameover', (e) => this.onOver(e)); g.on('milestone', (m) => this.fx.pop(m.name.toUpperCase(), CONFIG.WORLD_W / 2, 200, { size: 28, color: 'hsl(45 100% 78%)', life: 1.6, rise: 24 }));
    this.canvas.addEventListener('pointerdown', (e) => this.press(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    $('play').addEventListener('click', () => { this.click(); this.start(); });
    $('retry').addEventListener('click', () => { this.click(); this.start(); });
    $('to-title').addEventListener('click', () => { this.click(); this.toTitle(); });
    this.ui.mute.addEventListener('click', () => { this.muted = !this.muted; LS.set('muted', this.muted); this.sfx.setMuted(this.muted); this.sfx.unlock(); this.ui.mute.classList.toggle('muted', this.muted); });
    window.addEventListener('resize', () => this.r.resize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    window.__pop = this;
    requestAnimationFrame((t) => this.frame(t));
  }
  click() { this.sfx.unlock(); this.sfx.tap(); }
  setState(s) { this.state = s; this.stateTime = 0; document.body.dataset.state = s; this.ui.title.hidden = s !== 'title'; this.ui.hud.hidden = s !== 'play'; this.ui.over.hidden = s !== 'over'; }
  toTitle() { this.game.reset(); this.fx.clear(); this.setState('title'); }
  start() { this.sfx.unlock(); this.game.reset(); this.fx.clear(); this.setState('play'); this.hud(true); }
  press(e) {
    if (e.target.closest && e.target.closest('[data-ui]')) return;
    e.preventDefault(); this.sfx.unlock();
    if (this.state === 'title') { this.start(); return; }
    if (this.state === 'over') { if (this.stateTime > 0.6) this.start(); return; }
    const [x, y] = this.r.toWorld(e.clientX, e.clientY);
    const res = this.game.tap(x, y);
    if (res.kind === 'miss') { this.fx.rings.push({ x, y, r: 10, age: 0, life: 0.25, hue: 0 }); }
  }
  onPop(e) { const b = e.bubble; this.fx.burst(this.game.bubbleX(b), b.y, b.r, PALETTE[b.color].h); this.sfx.pop(e.combo); vib(8, this.haptics); if (e.combo >= 3) this.fx.pop(`×${e.combo}`, this.game.bubbleX(b), b.y - 20, { size: 22, color: '#fff' }); }
  onWrong(e) { const b = e.bubble; this.fx.burst(this.game.bubbleX(b), b.y, b.r, PALETTE[b.color].h, 8); this.fx.pop('WRONG', this.game.bubbleX(b), b.y - 20, { size: 20, color: '#ff8a8a' }); this.sfx.wrong(); vib([20, 30, 20], this.haptics); this.fx.shake = 10; }
  onLife(e) { if (e.reason === 'escape') { this.sfx.escape(); vib(30, this.haptics); this.fx.pop('MISSED', this.game.bubbleX(e.bubble), 40, { size: 20, color: '#ff8a8a' }); } }
  onTarget() { this.sfx.target(); vib(15, this.haptics); this.pulse = 1; this.fx.pop(`NOW: ${PALETTE[this.game.target].name}`, CONFIG.WORLD_W / 2, 150, { size: 26, color: `hsl(${PALETTE[this.game.target].h} 90% 80%)`, life: 1.3, rise: 20 }); }
  onOver(e) {
    this.sfx.over(); vib([40, 40, 60], this.haptics); this.games++; LS.set('games', this.games);
    const isBest = e.score > this.best; if (isBest) { this.best = e.score; LS.set('best', this.best); }
    this.ui.overScore.textContent = e.score; this.ui.overBest.textContent = this.best; this.ui.best.textContent = this.best; this.ui.overCombo.textContent = `best combo ×${e.bestCombo}`; this.ui.newBest.hidden = !isBest || e.score === 0;
    setTimeout(() => this.setState('over'), 700);
  }
  hud(force) {
    const g = this.game;
    if (force || this.lastHud.s !== g.score) { this.ui.score.textContent = g.score; this.lastHud.s = g.score; }
    if (force || this.lastHud.l !== g.lives) { this.ui.lives.textContent = '●'.repeat(Math.max(0, g.lives)) + '○'.repeat(Math.max(0, CONFIG.LIVES - g.lives)); this.lastHud.l = g.lives; }
    if (force || this.lastHud.t !== g.target) { const p = PALETTE[g.target]; this.ui.target.textContent = p.name; this.ui.target.style.color = `hsl(${p.h} 90% 78%)`; this.lastHud.t = g.target; }
  }
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.time += dt; this.stateTime += dt;
    const g = this.game;
    if (this.state === 'play') { if (this.autopilot) { const tp = autopilot(g); if (tp && Math.random() < 0.3) g.tap(tp.x, tp.y); } g.update(dt); this.hud(); }
    else if (this.state === 'title') { if (this.stateTime > 0.5 && g.bubbles.length < 6 && Math.random() < dt * 1.5) g.spawn(); for (const b of g.bubbles) { b.y -= b.vy * 0.5 * dt; b.wob += dt * 2; } g.bubbles = g.bubbles.filter(b => b.y > -60); }
    this.pulse = Math.max(0, this.pulse - dt * 2); this.fx.update(dt);
    const hue = PALETTE[g.target].h;
    this.r.drawBg(hue, this.time);
    this.r.begin(); if (this.fx.shake > 0) this.r.ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);
    for (const b of g.bubbles) this.r.bubble(b, g.bubbleX(b));
    if (this.state === 'play') this.r.drawTarget(g, this.pulse);
    this.r.begin(); this.fx.draw(this.r.ctx);
    requestAnimationFrame((t) => this.frame(t));
  }
}
window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
