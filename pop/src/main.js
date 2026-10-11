/** POP — controller: title, play, result sheet; haptics; procedural sound. */
import { PopGame, CONFIG, autopilot } from './core/pop.js';
import { Renderer, PALETTE } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { attachExtras } from '../../src/extras.js';
import { song, steps } from './extras-config.js';
import { haptics } from '../../src/haptics.js';

const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem('pop.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pop.' + k, JSON.stringify(v)); } catch {} } };
const vib = (p, on) => { if (on) haptics.pulse(p); };

class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.onSound = null; }
  unlock() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.g = this.ctx.createGain(); this.g.gain.value = this.muted ? 0 : 0.7; this.g.connect(this.ctx.destination); } if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }
  setMuted(m) { this.muted = m; if (this.g) this.g.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.03); }
  tone(f, to, type, dur, vol, delay = 0, cutoff = 4000) { if (!this.ctx || this.muted) return; if (this.onSound && vol >= 0.1) this.onSound(); const t0 = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; o.type = type; o.frequency.setValueAtTime(f, t0); if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(lp).connect(g).connect(this.g); o.start(t0); o.stop(t0 + dur + 0.02); }
  noise(dur, vol, cutoff, delay = 0) { if (!this.ctx || this.muted) return; const c = this.ctx, t0 = c.currentTime + delay, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); src.connect(f).connect(g).connect(this.g); src.start(t0); }
  newBest() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, f, 'triangle', 0.5, 0.16, i * 0.09)); }
  milestone() { [659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, f, 'triangle', 0.35, 0.14, i * 0.07)); }
  pop(combo) { const f = 520 * Math.pow(2, ([0, 2, 4, 7, 9, 12, 14, 16][Math.min(combo, 7)]) / 12); this.tone(f, f * 1.5, 'sine', 0.12, 0.25); this.tone(f * 2, f * 2, 'triangle', 0.08, 0.08, 0.02); }
  wrong() { this.tone(220, 70, 'triangle', 0.3, 0.25, 0, 1500); this.noise(0.2, 0.2, 600); }
  escape() { this.tone(300, 150, 'sine', 0.3, 0.2); }
  target() { [660, 880, 1100].forEach((f, i) => this.tone(f, f, 'triangle', 0.25, 0.14, i * 0.06)); }
  over() { this.tone(330, 80, 'sine', 0.6, 0.3); this.noise(0.3, 0.25, 600, 0.05); }
  tap() { this.tone(880, 660, 'sine', 0.08, 0.12); }
}

class App {
  constructor() {
    this.canvas = $('game'); this.r = new Renderer(this.canvas); this.fx = new Effects(); this.sfx = new Sfx();
    this.game = new PopGame(); this.state = 'title'; this.time = 0; this.stateTime = 0; this.last = performance.now();
    this.best = LS.get('best', 0); this.games = LS.get('games', 0); this.muted = LS.get('muted', false); this.haptics = LS.get('haptics', true);
    this.sfx.setMuted(this.muted); this.autopilot = false; this.pulse = 0; this.lastHud = {}; this.hitStop = 0; this.vignette = 0; this.flash = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ui = { title: $('title'), hud: $('hud'), over: $('over'), score: $('score'), lives: $('lives'), target: $('target-name'), best: $('best'), overScore: $('over-score'), overBest: $('over-best'), overCombo: $('over-combo'), newBest: $('new-best'), mute: $('mute') };
    this.ui.best.textContent = this.best; this.ui.mute.classList.toggle('muted', this.muted);
    this.bindGame();
    this.canvas.addEventListener('pointerdown', (e) => this.press(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    $('play').addEventListener('click', () => { this.click(); this.extras.beforeStart(() => this.start()); });
    $('retry').addEventListener('click', () => { this.click(); this.start(); });
    $('to-title').addEventListener('click', () => { this.click(); this.toTitle(); });
    this.ui.mute.addEventListener('click', () => { this.muted = !this.muted; LS.set('muted', this.muted); this.sfx.setMuted(this.muted); this.sfx.unlock(); this.extras.setMuted(this.muted); this.extras.unlock(); this.ui.mute.classList.toggle('muted', this.muted); });
    window.addEventListener('resize', () => this.r.resize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    this.extras = attachExtras({ id: 'pop', name: 'POP', song, steps, unit: '', over: '#over', retry: '#retry', title: '#title',
      start: (seed) => this.start(seed), score: () => this.game.score, seed: () => this.seed, revive: () => this.revive(), audioContext: () => this.sfx.ctx, sfx: this.sfx,
      titleTap: () => { if (this.state === 'title') { this.click(); this.extras.beforeStart(() => this.start()); } } });
    this.extras.setMuted(this.muted);
    window.__pop = this;
    requestAnimationFrame((t) => this.frame(t));
  }
  bindGame() {
    const g = this.game;
    g.on('pop', (e) => this.onPop(e)); g.on('wrong', (e) => this.onWrong(e)); g.on('life', (e) => this.onLife(e)); g.on('target', () => this.onTarget()); g.on('gameover', (e) => this.onOver(e));
    g.on('milestone', (m) => { this.sfx.milestone(); this.fx.pop(m.name.toUpperCase(), CONFIG.WORLD_W / 2, 330, { size: 30, color: 'hsl(45 100% 78%)', life: 1.6, rise: 24 }); this.fx.burst(CONFIG.WORLD_W / 2, 330, 30, 45, 24); });
    g.on('frenzy', () => this.onFrenzy()); g.on('frenzyEnd', () => { this.ui.hud.classList.remove('frenzy'); });
  }
  click() { this.sfx.unlock(); this.extras.unlock(); this.sfx.tap(); }
  setState(s) { this.state = s; this.stateTime = 0; document.body.dataset.state = s; this.ui.title.hidden = s !== 'title'; this.ui.hud.hidden = s !== 'play'; this.ui.over.hidden = s !== 'over'; }
  toTitle() { this.game.reset(); this.fx.clear(); this.setState('title'); this.extras.onTitle(); }
  start(seed) {
    seed = seed ?? this.extras.currentSeed(); this.extras.onStart(seed);
    this.seed = seed === undefined ? this.extras.newSeed() : seed;
    this.sfx.unlock(); this.extras.unlock();
    this.game = new PopGame({ seed: this.seed }); this.bindGame(); this.fx.clear(); this.setState('play'); this.hud(true);
    const p = PALETTE[this.game.target]; this.extras.coach('rule', `Tap the ${p.glyph} ${p.name} bubbles`);
  }
  revive() { if (!this.game.revive()) return false; this.fx.clear(); this.setState('play'); this.hud(true); return true; }
  press(e) {
    if (e.target.closest && e.target.closest('[data-ui]')) return;
    e.preventDefault(); this.sfx.unlock();
    if (this.state === 'title') { this.extras.beforeStart(() => this.start()); return; }
    if (this.state === 'over') { if (this.stateTime > 0.6) this.start(); return; }
    const [x, y] = this.r.toWorld(e.clientX, e.clientY);
    const res = this.game.tap(x, y);
    if (res.kind === 'miss') { this.fx.rings.push({ x, y, r: 10, age: 0, life: 0.25, hue: 0 }); }
  }
  /** Escalation: bigger, brighter, more particles the longer the chain. */
  onPop(e) {
    const b = e.bubble, x = this.game.bubbleX(b), h = PALETTE[b.color].h, k = e.combo, chain = e.chain || [b];
    this.extras.coachDone('rule'); if (chain.length > 1) this.extras.coachDone('chain'); else if (this.game.score >= 4) this.extras.coach('chain', 'Touching bubbles pop together', { ms: 3500 });
    this.fx.burst(x, b.y, b.r, h, Math.min(40, 12 + 4 * k), k >= 6 ? 2 : 1);
    this.sfx.pop(k); vib(k >= 4 || chain.length > 1 ? 18 : 8, this.haptics); this.r.face.squash = 1; this.bump();
    // chain: each linked bubble bursts a beat later, climbing the scale
    const g = this.game;
    chain.slice(1).forEach((o, i) => { const ox = g.bubbleX(o); setTimeout(() => { this.fx.burst(ox, o.y, o.r, h, 14, 1); this.sfx.pop(k + i + 1); }, 60 * (i + 1)); });
    if (chain.length > 1) {
      this.fx.pop(`CHAIN ×${chain.length}  +${e.points}`, CONFIG.WORLD_W / 2, 330, { size: 24 * Math.min(1.6, 1 + 0.12 * chain.length), color: chain.length >= 4 ? 'hsl(300 100% 82%)' : 'hsl(45 100% 75%)', life: 1.1, rise: 26 });
      if (chain.length >= 4) { this.flash = 0.7; this.fx.shower(x, b.y, 24, [h, h, 'w']); if (!this.reduced) this.fx.shake = 6; }
    } else if (k >= 3) {
      const size = 22 * Math.min(1.6, 1 + 0.08 * (k - 1)), color = k >= 6 ? 'hsl(300 100% 82%)' : k >= 4 ? 'hsl(45 100% 75%)' : '#fff';
      this.fx.pop(e.points > 1 ? `×${k}  +${e.points}` : `×${k}`, x, b.y - 20, { size, color });
    }
    if (!this.reduced && (k === 5 || k % 10 === 0)) { this.fx.shake = k >= 10 ? 7 : 4; this.hitStop = 0.06; }
  }
  onFrenzy() {
    this.sfx.milestone(); vib([20, 20, 40], this.haptics); this.flash = 1; this.ui.hud.classList.add('frenzy');
    this.fx.pop('FRENZY!', CONFIG.WORLD_W / 2, 330, { size: 40, color: 'hsl(300 100% 85%)', life: 1.4, rise: 30 });
    this.fx.shower(CONFIG.WORLD_W / 2, 330, 40, [340, 200, 150, 42, 270, 'w']);
  }
  onWrong(e) { const b = e.bubble; this.fx.burst(this.game.bubbleX(b), b.y, b.r, PALETTE[b.color].h, 8); this.fx.pop('WRONG', this.clampX(this.game.bubbleX(b)), b.y - 20, { size: 20, color: '#ff8a8a' }); this.sfx.wrong(); vib([20, 30, 20], this.haptics); if (!this.reduced) this.fx.shake = 10; this.r.face.wince = 1; this.loseDot(); }
  onLife(e) { if (e.reason === 'escape') { this.sfx.escape(); vib(30, this.haptics); this.r.face.wince = 1; this.loseDot(); this.fx.pop('MISSED', this.clampX(this.game.bubbleX(e.bubble)), 90, { size: 20, color: '#ff8a8a' }); } }
  clampX(x) { return Math.max(70, Math.min(CONFIG.WORLD_W - 70, x)); }
  onTarget() { this.sfx.target(); vib(15, this.haptics); this.pulse = 1; const p = PALETTE[this.game.target]; this.extras.coach('switch', `New colour: ${p.glyph} ${p.name}`, { ms: 2200 }); this.fx.pop(`NOW ${p.glyph} ${p.name}`, CONFIG.WORLD_W / 2, 300, { size: 26, color: `hsl(${p.h} 90% 80%)`, life: 1.3, rise: 20 }); }
  bump() { const el = this.ui.score; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  loseDot() { const el = this.ui.lives; el.classList.remove('lose'); void el.offsetWidth; el.classList.add('lose'); }
  onOver(e) {
    this.sfx.over(); vib([40, 40, 60], this.haptics); this.games++; LS.set('games', this.games);
    // the failure is a moment: freeze, flush red, pop every bubble left one by one
    this.hitStop = 0.09; this.vignette = 1; if (!this.reduced) this.fx.shake = 12; this.r.face.wince = 1.6;
    const left = [...this.game.bubbles].sort((a, b) => a.y - b.y); this.game.bubbles = [];
    left.forEach((b, i) => setTimeout(() => this.fx.burst(this.game.bubbleX(b), b.y, b.r, PALETTE[b.color].h, 10), 90 + i * 40));
    const isBest = e.score > this.best; if (isBest) { this.best = e.score; LS.set('best', this.best); }
    this.ui.overScore.textContent = e.score; this.ui.overBest.textContent = this.best; this.ui.best.textContent = this.best; this.ui.overCombo.textContent = `best combo ×${e.bestCombo}`; this.ui.newBest.hidden = !isBest || e.score === 0;
    setTimeout(() => { this.setState('over'); this.extras.onOver(e.score, { isBest }); }, 700);
  }
  hud(force) {
    const g = this.game;
    if (force || this.lastHud.s !== g.score) { this.ui.score.textContent = g.score; this.lastHud.s = g.score; }
    if (force || this.lastHud.l !== g.lives) { this.ui.lives.textContent = '●'.repeat(Math.max(0, g.lives)) + '○'.repeat(Math.max(0, CONFIG.LIVES - g.lives)); this.ui.lives.setAttribute('aria-label', `Lives: ${Math.max(0, g.lives)} of ${CONFIG.LIVES}`); this.lastHud.l = g.lives; }
    if (force || this.lastHud.t !== g.target) { const p = PALETTE[g.target]; this.ui.target.textContent = `${p.glyph} ${p.name}`; this.ui.target.style.color = `hsl(${p.h} 90% 78%)`; this.lastHud.t = g.target; }
  }
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.time += dt; this.stateTime += dt;
    const g = this.game;
    const frozen = this.hitStop > 0; this.hitStop = Math.max(0, this.hitStop - dt);
    this.vignette = Math.max(0, this.vignette - dt / 0.6); this.flash = Math.max(0, this.flash - dt / 0.15);
    if (frozen) { /* hit-stop: the world holds for a beat, effects keep moving */ }
    else if (this.state === 'play') { if (this.autopilot) { const tp = autopilot(g); if (tp && Math.random() < 0.3) g.tap(tp.x, tp.y); } g.update(dt); this.hud(); }
    else if (this.state === 'title') { if (this.stateTime > 0.5 && g.bubbles.length < 6 && Math.random() < dt * 1.5) g.spawn(); for (const b of g.bubbles) { b.y -= b.vy * 0.5 * dt; b.wob += dt * 2; } g.bubbles = g.bubbles.filter(b => b.y > -60); }
    this.pulse = Math.max(0, this.pulse - dt * 2); this.fx.update(dt);
    const hue = PALETTE[g.target].h;
    this.r.drawBg(hue, this.time, this.flash);
    this.r.begin(); if (this.fx.shake > 0) this.r.ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);
    for (const b of g.bubbles) this.r.bubble(b, g.bubbleX(b));
    if (this.state === 'play' || (this.state === 'over' && this.stateTime < 0.1)) this.r.drawTarget(g, this.pulse, dt);
    this.r.begin(); this.fx.draw(this.r.ctx);
    this.r.drawVignette(this.vignette);
    requestAnimationFrame((t) => this.frame(t));
  }
}
window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
