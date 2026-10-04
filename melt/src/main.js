/**
 * MELT — app controller: state machine (title → playing → dying → over),
 * input, render loop and HTML overlays. Rules live in core/melt.js.
 */
import { MeltGame, autopilot } from './core/melt.js';
import { CONFIG } from './core/config.js';
import { Renderer } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { Sfx } from './audio/sfx.js';
import { storage, KEYS } from './platform/storage.js';
import { haptics } from './platform/haptics.js';
import { bindHold } from './platform/input.js';

const $ = (id) => document.getElementById(id);
const STATE = Object.freeze({ TITLE: 'title', PLAYING: 'playing', DYING: 'dying', OVER: 'over' });
const DIE_TIME = 1.0;
const RETRY_LOCKOUT = 0.6;

/** What went wrong, in one line, so every death teaches. */
const DEATH_LINES = {
  'spikes:ice': 'Ice is too heavy to float over spikes.',
  'spikes:water': 'Water can\'t float. Heat up to steam!',
  'spikes:steam': 'Steam needs a moment to rise. Heat earlier!',
  'beam:steam': 'Steam rises into beams. Cool down to stay low.',
  'beam:water': 'Still sinking from steam. Cool down sooner!',
  'beam:ice': 'Still sinking from steam. Cool down sooner!',
  'glass:water': 'Water splashes off glass. Only ice breaks it.',
  'glass:steam': 'Steam can\'t break glass. Freeze solid!',
  'pipe:ice': 'Ice doesn\'t fit the pipe. Melt into water.',
  'pipe:steam': 'Steam can\'t flow through pipes. Cool to water.',
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
    this.holding = false;
    this.autopilot = false;        // test/screenshot hook
    this.shownTemp = this.game.temp;
    this.morphAge = 10;
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
    bindHold(this.canvas, { onPress: () => this.press(), onRelease: () => this.release() });
    this.ui.retry.addEventListener('click', () => { this.sfx.unlock(); this.sfx.tap(); this.start(); });
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
    this.sfx.unlock();
    if (this.state === STATE.TITLE) this.start();
    else if (this.state === STATE.OVER && this.stateTime > RETRY_LOCKOUT) { this.sfx.tap(); this.start(); }
    this.holding = true;
  }

  release() { this.holding = false; }

  start() {
    this.game.reset();
    this.game.setViewWidth(this.renderer.viewWorldW());
    this.fx.clear();
    this.shownTemp = this.game.temp;
    this.morphAge = 10;
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
      const hold = this.autopilot ? autopilot(g) : this.holding;
      g.update(dt, hold);
      const [x, y] = this.playerPos();
      this.fx.ambient(x, y, hold, g.phase, dt);
      this.sfx.setHeat(hold ? 1 : 0);
    } else {
      this.sfx.setHeat(0);
    }
    if (this.state === STATE.DYING && this.stateTime >= DIE_TIME) this.gameOver();

    this.shownTemp += (g.temp - this.shownTemp) * Math.min(1, dt * 6);
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
      r.drawPlayer({ phase: g.phase, altitude: g.altitude, holding: this.holding, time: this.time, morph: Math.min(1, this.morphAge / 0.35), temp: g.temp });
    }
    this.fx.drawWorld();
    if (this.state !== STATE.TITLE) r.drawGauge(g.temp, this.state === STATE.PLAYING && (this.autopilot ? autopilot(g) : this.holding));
    r.end();
    r.drawVignette();
    this.fx.drawScreen();
  }

  /* ───────────── misc UI ───────────── */

  toggleMute() {
    this.muted = !this.muted; storage.set(KEYS.MUTED, this.muted);
    this.sfx.setMuted(this.muted); this.sfx.unlock(); this.applyMuteIcon();
    if (!this.muted) this.sfx.tap();
  }
  applyMuteIcon() {
    this.ui.mute.textContent = this.muted ? '🔇' : '🔊';
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
