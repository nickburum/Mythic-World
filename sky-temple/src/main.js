/**
 * Sky Temple — app controller.
 * Owns the state machine (title → playing → falling → over), the camera,
 * the render loop and the HTML overlays. Gameplay rules live in core/stack.js.
 */
import { StackGame } from './core/stack.js';
import { stoneColors } from './core/palette.js';
import { Renderer } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { Sfx } from './audio/sfx.js';
import { storage, KEYS } from './platform/storage.js';
import { haptics } from './platform/haptics.js';
import { bindTap } from './platform/input.js';

const $ = (id) => document.getElementById(id);

const STATE = Object.freeze({ TITLE: 'title', PLAYING: 'playing', FALLING: 'falling', OVER: 'over' });
const FALL_TIME = 1.1;          // seconds between a miss and the game-over panel
const RETRY_LOCKOUT = 0.5;      // ignore taps right after game over so a frantic tap does not restart
const TOP_ANCHOR = 0.44;        // the tower top sits at this fraction of screen height while playing

class App {
  constructor() {
    this.canvas = $('game');
    this.renderer = new Renderer(this.canvas);
    this.fx = new Effects(this.renderer);
    this.sfx = new Sfx();
    this.game = new StackGame();
    this.state = STATE.TITLE;
    this.seedHue = 205;
    this.time = 0;
    this.stateTime = 0;
    this.last = performance.now();
    this.best = storage.get(KEYS.BEST, 0);
    this.games = storage.get(KEYS.GAMES, 0);
    this.muted = storage.get(KEYS.MUTED, false);
    this.sfx.setMuted(this.muted);

    const K = this.renderer.baseScale();
    this.cam = { focusY: 0, anchor: TOP_ANCHOR, K, shakeX: 0, shakeY: 0 };
    this.camTarget = { focusY: this.game.towerHeight(), anchor: TOP_ANCHOR, K };
    this.cam.focusY = this.camTarget.focusY;
    this.scoreScale = 1;

    this.ui = {
      title: $('title'), hud: $('hud'), over: $('over'),
      score: $('score'), best: $('best'), overScore: $('over-score'), overBest: $('over-best'),
      newBest: $('new-best'), retry: $('retry'), share: $('share'), mute: $('mute'),
      overCombo: $('over-combo'),
    };
    this.ui.best.textContent = this.best;
    this.applyMuteIcon();

    this.bindGame();
    this.bindUi();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => this.onResize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });

    // test hook (used by tools/render-art.mjs to script screenshots)
    window.__skyTemple = this;

    requestAnimationFrame((t) => this.frame(t));
  }

  /* ───────────── wiring ───────────── */

  bindGame() {
    const g = this.game;
    g.on('perfect', (r) => this.onPerfect(r));
    g.on('cut', (r) => this.onCut(r));
    g.on('miss', (r) => this.onMiss(r));
    g.on('milestone', (m) => this.onMilestone(m));
    g.on('place', () => this.onPlace());
  }

  bindUi() {
    bindTap(this.canvas, () => this.tap());
    this.ui.retry.addEventListener('click', () => { this.sfx.unlock(); this.sfx.tap(); this.start(); });
    this.ui.share.addEventListener('click', () => this.share());
    this.ui.mute.addEventListener('click', () => this.toggleMute());
    if (!navigator.share) this.ui.share.hidden = true;
  }

  onResize() {
    this.renderer.resize();
    this.updateCameraTarget(true);
  }

  /* ───────────── state machine ───────────── */

  setState(s) {
    this.state = s;
    this.stateTime = 0;
    document.body.dataset.state = s;
    this.ui.title.hidden = s !== STATE.TITLE;
    this.ui.hud.hidden = !(s === STATE.PLAYING || s === STATE.FALLING);
    this.ui.over.hidden = s !== STATE.OVER;
  }

  tap() {
    this.sfx.unlock();
    switch (this.state) {
      case STATE.TITLE:
        this.start();
        break;
      case STATE.PLAYING:
        this.game.drop();
        break;
      case STATE.OVER:
        if (this.stateTime > RETRY_LOCKOUT) { this.sfx.tap(); this.start(); }
        break;
      default:
        break;
    }
  }

  start() {
    this.seedHue = Math.floor(Math.random() * 360);
    this.game.reset();
    this.fx.clear();
    this.setState(STATE.PLAYING);
    this.updateScore(0);
    this.updateCameraTarget(true);
    this.cam.K = this.camTarget.K;
    this.cam.focusY = this.camTarget.focusY;
    this.cam.anchor = this.camTarget.anchor;
  }

  gameOver() {
    this.games += 1;
    storage.set(KEYS.GAMES, this.games);
    const score = this.game.score;
    const isBest = score > this.best;
    if (isBest) {
      this.best = score;
      storage.set(KEYS.BEST, score);
    }
    this.ui.overScore.textContent = score;
    this.ui.overBest.textContent = this.best;
    this.ui.best.textContent = this.best;
    this.ui.newBest.hidden = !isBest || score === 0;
    this.ui.overCombo.textContent = this.game.bestCombo >= 3 ? `Best streak ×${this.game.bestCombo}` : '';
    this.setState(STATE.OVER);
  }

  /* ───────────── game events ───────────── */

  onPlace() {
    this.updateScore(this.game.score);
    this.updateCameraTarget();
  }

  onPerfect(r) {
    const hue = stoneColors(r.block.index, this.seedHue).hue;
    this.sfx.perfect(r.combo);
    haptics.light();
    this.fx.addRing(r.block, hue, r.combo >= 3 ? 2 : 1);
    const [px, py] = this.renderer.project(r.block.x, r.block.y + r.block.h, r.block.z, this.cam);
    if (r.combo >= 2) {
      this.fx.addPop(`×${r.combo}`, px, py - 40, { size: 30, color: '#fff' });
    } else {
      this.fx.addPop('PERFECT', px, py - 40, { size: 24, color: '#fff' });
    }
    if (r.grew) {
      this.sfx.grow();
      this.fx.addSparks(px, py, hue, 22, 1.2);
    }
  }

  onCut(r) {
    this.sfx.place();
    haptics.light();
    this.fx.addFallingPiece(r.cut, r.axis, Math.sign(r.delta) || 1, this.seedHue);
  }

  onMiss(r) {
    this.sfx.miss();
    haptics.heavy();
    this.fx.addShake(14);
    this.fx.addFallingPiece(r.block, r.axis, Math.sign(r.delta) || 1, this.seedHue);
    this.setState(STATE.FALLING);
    this.updateCameraTarget();
  }

  onMilestone(m) {
    this.sfx.milestone();
    haptics.medium();
    this.fx.addPop(m.name.toUpperCase(), this.renderer.w / 2, this.renderer.h * 0.3, {
      size: Math.min(34, this.renderer.w / 11), color: 'hsl(45 100% 75%)', life: 1.8, rise: 30, weight: 900,
    });
    const [px, py] = this.renderer.project(0, this.game.towerHeight(), 0, this.cam);
    this.fx.addSparks(px, py, 45, 30, 1.4);
  }

  updateScore(n) {
    this.ui.score.textContent = n;
    this.scoreScale = 1.35;
  }

  /* ───────────── camera ───────────── */

  updateCameraTarget(snap = false) {
    const baseK = this.renderer.baseScale();
    const T = this.game.towerHeight();
    if (this.state === STATE.FALLING || this.state === STATE.OVER) {
      // zoom out to show the whole tower
      const fitK = (this.renderer.h * 0.6) / Math.max(T + 0.5, 1);
      this.camTarget = { focusY: T / 2, anchor: 0.5, K: Math.min(baseK, fitK) };
    } else {
      this.camTarget = { focusY: T, anchor: TOP_ANCHOR, K: baseK };
    }
    if (snap) {
      this.cam.focusY = this.camTarget.focusY;
      this.cam.anchor = this.camTarget.anchor;
      this.cam.K = this.camTarget.K;
    }
  }

  tickCamera(dt) {
    const k = 1 - Math.pow(0.001, dt); // ~exponential smoothing, frame-rate independent
    this.cam.focusY += (this.camTarget.focusY - this.cam.focusY) * k * 0.9;
    this.cam.anchor += (this.camTarget.anchor - this.cam.anchor) * k * 0.7;
    this.cam.K += (this.camTarget.K - this.cam.K) * k * 0.7;
  }

  /* ───────────── loop ───────────── */

  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.stateTime += dt;

    if (this.state === STATE.PLAYING) this.game.update(dt);
    if (this.state === STATE.FALLING && this.stateTime >= FALL_TIME) this.gameOver();

    this.tickCamera(dt);
    this.fx.update(dt, this.cam);
    this.scoreScale += (1 - this.scoreScale) * Math.min(1, dt * 12);
    this.ui.score.style.transform = `scale(${this.scoreScale.toFixed(3)})`;

    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  draw() {
    const r = this.renderer;
    const g = this.game;
    const heightStones = g.blocks.length - 1;
    const sky = r.drawSky(heightStones);
    r.drawStars(sky.night, this.cam, this.time);
    r.drawClouds(this.cam, this.time, sky.night);
    r.drawTower(g, this.cam, this.seedHue);
    this.fx.drawWorld(this.cam);
    if (this.state === STATE.PLAYING) r.drawMoving(g, this.cam, this.seedHue);
    r.drawVignette();
    this.fx.drawScreen();
  }

  /* ───────────── misc UI ───────────── */

  toggleMute() {
    this.muted = !this.muted;
    storage.set(KEYS.MUTED, this.muted);
    this.sfx.setMuted(this.muted);
    this.sfx.unlock();
    this.applyMuteIcon();
    if (!this.muted) this.sfx.tap();
  }

  applyMuteIcon() {
    this.ui.mute.classList.toggle('muted', this.muted);
    this.ui.mute.setAttribute('aria-label', this.muted ? 'Unmute' : 'Mute');
  }

  async share() {
    const text = `I stacked ${this.game.score} stones in Sky Temple ⛩️ Can you beat me?`;
    try {
      await navigator.share({ title: 'Sky Temple', text, url: location.href });
    } catch {
      /* user cancelled */
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new App());

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
