/**
 * MELT — app controller: state machine (title → playing → dying → over),
 * input, render loop and HTML overlays. Rules live in core/melt.js.
 */
import { MeltGame, autopilot } from './core/melt.js';
import { PHASE_TEMP } from './core/palette.js';
import { attachExtras } from '../../src/extras.js';
import { song, steps } from './extras-config.js';
import { CONFIG } from './core/config.js';
import { Renderer } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { Sfx } from './audio/sfx.js';
import { storage, KEYS } from './platform/storage.js';
import { haptics } from './platform/haptics.js';
import { bindTap } from './platform/input.js';

const $ = (id) => document.getElementById(id);
const STATE = Object.freeze({ TITLE: 'title', PLAYING: 'playing', DYING: 'dying', OVER: 'over' });
const DIE_TIME = 1.0;
const RETRY_LOCKOUT = 0.6;

/** What went wrong, in one line, so every death teaches. */
const DEATH_LINES = {
  'spikes:ice': 'Ice is too heavy to float over spikes.',
  'spikes:water': 'Water can\'t float. One tap for steam.',
  'spikes:steam': 'Steam needs a moment to rise. Tap earlier!',
  'beam:steam': 'Steam rises into beams. One tap drops you to ice.',
  'beam:water': 'Still sinking from steam. Tap sooner.',
  'beam:ice': 'Still sinking from steam. Tap sooner.',
  'glass:water': 'Water splashes off glass. Two taps to ice.',
  'glass:steam': 'Steam can\'t break glass. One tap to ice.',
  'pipe:ice': 'Ice doesn\'t fit the pipe. One tap to water.',
  'pipe:steam': 'Steam can\'t flow through pipes. Two taps to water.',
};

class App {
  constructor() {
    this.canvas = $('game');
    this.renderer = new Renderer(this.canvas);
    this.fx = new Effects(this.renderer);
    this.sfx = new Sfx();
    this.game = new MeltGame();
    this.state = STATE.TITLE;
    this.time = 0; this.stateTime = 0;
    this.last = performance.now();
    this.autopilot = false;        // test/screenshot hook
    this.shownTemp = PHASE_TEMP[this.game.phase];
    this.morphAge = 10;
    this.lastAuto = 0;
    this.best = storage.get(KEYS.BEST, 0);
    this.games = storage.get(KEYS.GAMES, 0);
    this.muted = storage.get(KEYS.MUTED, false);
    this.sfx.setMuted(this.muted);
    this.scoreScale = 1;

    this.ui = {
      title: $('title'), hud: $('hud'), over: $('over'), score: $('score'), best: $('best'),
      overScore: $('over-score'), overBest: $('over-best'), overClose: $('over-close'), newBest: $('new-best'),
      deathLine: $('death-line'), retry: $('retry'), share: $('share'), mute: $('mute'),
    };
    this.ui.best.textContent = this.best;
    this.applyMuteIcon();
    this.bindGame();
    this.bindUi();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => this.onResize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    this.extras = attachExtras({ id: 'melt', name: 'MELT', song, steps, unit: '', over: '#over', retry: '#retry', title: '#title',
      start: (seed) => this.start(seed), score: () => this.game.score, seed: () => this.game.seed, revive: () => this.revive(), audioContext: () => this.sfx.ctx });
    this.extras.setMuted(this.muted);
    window.__melt = this;
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ───────────── wiring ───────────── */

  bindGame() {
    const g = this.game;
    g.on('phase', (e) => this.onPhase(e));
    g.on('pass', (e) => this.onPass(e));
    g.on('nearmiss', () => this.onCloseCall());
    g.on('hazard', (o) => this.onHazard(o));
    g.on('die', (e) => this.onDie(e));
    g.on('milestone', (m) => this.onMilestone(m));
  }

  bindUi() {
    bindTap(this.canvas, () => this.press());
    this.ui.retry.addEventListener('click', () => { this.sfx.unlock(); this.extras.unlock(); this.sfx.tap(); this.start(); });
    this.ui.share.addEventListener('click', () => this.share());
    this.ui.mute.addEventListener('click', () => this.toggleMute());
    if (!navigator.share) this.ui.share.hidden = true;
  }

  onResize() {
    this.renderer.resize();
    this.game.setViewWidth(this.renderer.viewWorldW());
  }

  /* ───────────── state machine ───────────── */

  setState(s) {
    this.state = s; this.stateTime = 0;
    document.body.dataset.state = s;
    this.ui.title.hidden = s !== STATE.TITLE;
    this.ui.hud.hidden = !(s === STATE.PLAYING || s === STATE.DYING);
    this.ui.over.hidden = s !== STATE.OVER;
  }

  press() {
    this.sfx.unlock(); this.extras.unlock();
    if (this.state === STATE.TITLE) { this.extras.beforeStart(() => this.start()); return; }
    if (this.state === STATE.OVER && this.stateTime > RETRY_LOCKOUT) { this.sfx.tap(); this.start(); return; }
    if (this.state === STATE.PLAYING) this.game.tap();
  }

  start(seed) {
    seed = seed ?? this.extras.currentSeed();
    this.extras.onStart(seed);
    if (seed !== undefined) this.game.resetWithSeed(seed); else this.game.resetWithSeed(this.extras.newSeed());
    this.game.setViewWidth(this.renderer.viewWorldW());
    this.fx.clear();
    this.shownTemp = PHASE_TEMP[this.game.phase];
    this.morphAge = 10;
    this.lastAuto = 0;
    this.setState(STATE.PLAYING);
    this.updateScore(0);
  }

  gameOver() {
    this.games += 1; storage.set(KEYS.GAMES, this.games);
    const score = this.game.score;
    const isBest = score > this.best;
    if (isBest) { this.best = score; storage.set(KEYS.BEST, score); }
    this.ui.overScore.textContent = score;
    this.ui.overBest.textContent = this.best;
    this.ui.overClose.textContent = this.game.closeCalls;
    this.ui.best.textContent = this.best;
    this.ui.newBest.hidden = !isBest || score === 0;
    const d = this.death;
    this.ui.deathLine.textContent = d ? (DEATH_LINES[`${d.obstacle.type}:${d.phase}`] || '') : '';
    this.setState(STATE.OVER);
    this.extras.onOver(score);
  }

  /** Rewarded continue: back into the run where we died. */
  revive() {
    if (!this.game.revive()) return false;
    this.fx.clear(); this.setState(STATE.PLAYING); this.ui.deathLine.textContent = '';
    return true;
  }

  /* ───────────── game events ───────────── */

  playerPos() {
    return [CONFIG.PLAYER_X, this.renderer.playerY(this.game.altitude)];
  }

  onPhase(e) {
    this.morphAge = 0;
    this.sfx.phase(e.to, e.from);
    haptics.light();
    const [x, y] = this.playerPos();
    this.fx.phaseBurst(x, y, e.to);
  }

  onPass(e) {
    this.updateScore(e.score);
    if (!e.closeCall) this.sfx.pass();
  }

  onCloseCall() {
    this.sfx.closeCall();
    haptics.medium();
    const [x, y] = this.playerPos();
    const [sx, sy] = this.renderer.toScreen(x, y);
    this.fx.addPop('CLOSE CALL!', sx + 10, sy - 50 * this.renderer.scale, { size: 22, color: 'hsl(45 100% 75%)' });
  }

  onHazard(o) {
    this.sfx.hazard(o.type);
    haptics.medium();
    const [x, y] = this.playerPos();
    this.fx.hazardBurst(x, y, o.type);
    const [sx, sy] = this.renderer.toScreen(x, y);
    this.fx.addPop(o.type === 'geyser' ? '+HOT' : '−COLD', sx, sy - 40 * this.renderer.scale, { size: 20, color: o.type === 'geyser' ? '#ffb36b' : '#bdf0ff', life: 0.7 });
  }

  onDie(e) {
    this.death = e;
    this.sfx.die(e.phase);
    haptics.heavy();
    const [x, y] = this.playerPos();
    this.fx.deathBurst(x, y, e.phase);
    this.setState(STATE.DYING);
  }

  onMilestone(m) {
    this.sfx.milestone();
    haptics.medium();
    this.fx.addPop(m.name.toUpperCase(), this.renderer.w / 2, this.renderer.h * 0.3, { size: Math.min(34, this.renderer.w / 11), color: 'hsl(45 100% 75%)', life: 1.8, rise: 30 });
  }

  updateScore(n) { this.ui.score.textContent = n; this.scoreScale = 1.3; }

  /* ───────────── loop ───────────── */

  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt; this.stateTime += dt; this.morphAge += dt;

    const g = this.game;
    if (this.state === STATE.PLAYING) {
      if (this.autopilot && this.time - this.lastAuto > 0.15 && autopilot(g)) { g.tap(); this.lastAuto = this.time; }
      g.update(dt);
      const [x, y] = this.playerPos();
      this.fx.ambient(x, y, g.phase === 'steam', g.phase, dt);
    }
    if (this.state === STATE.DYING && this.stateTime >= DIE_TIME) this.gameOver();

    this.shownTemp += (PHASE_TEMP[g.phase] - this.shownTemp) * Math.min(1, dt * 4);
    this.fx.update(dt);
    this.scoreScale += (1 - this.scoreScale) * Math.min(1, dt * 12);
    this.ui.score.style.transform = `scale(${this.scoreScale.toFixed(3)})`;

    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  draw() {
    const r = this.renderer, g = this.game;
    r.drawSky(this.shownTemp);
    r.drawMotes(g.distance, this.time, this.shownTemp);
    const [sx, sy] = this.fx.shakeOffset();
    r.begin(sx, sy);
    r.drawRock(g.distance);
    for (const o of g.obstacles) r.drawObstacle(o, this.time);
    if (this.state !== STATE.DYING && this.state !== STATE.OVER) {
      r.drawPlayer({ phase: g.phase, altitude: g.altitude, time: this.time, morph: Math.min(1, this.morphAge / 0.35) });
    }
    this.fx.drawWorld();
    if (this.state !== STATE.TITLE) r.drawGauge(g.phase, this.time);
    r.end();
    r.drawVignette();
    this.fx.drawScreen();
  }

  /* ───────────── misc UI ───────────── */

  toggleMute() {
    this.muted = !this.muted; storage.set(KEYS.MUTED, this.muted);
    this.sfx.setMuted(this.muted); this.sfx.unlock(); this.extras.setMuted(this.muted); this.extras.unlock(); this.applyMuteIcon();
    if (!this.muted) this.sfx.tap();
  }
  applyMuteIcon() {
    this.ui.mute.classList.toggle('muted', this.muted);
    this.ui.mute.setAttribute('aria-label', this.muted ? 'Unmute' : 'Mute');
  }
  async share() {
    const text = `I survived ${this.game.score} obstacles as ice, water and steam in MELT 💧 Can you beat me?`;
    try { await navigator.share({ title: 'MELT', text, url: location.href }); } catch { /* cancelled */ }
  }
}

window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
