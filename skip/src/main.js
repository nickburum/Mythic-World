/**
 * SKIP — app controller: menus, states, input, loop, leaderboard glue.
 * Rules live in core/skip.js; the lake is drawn by render/renderer.js.
 */
import { SkipGame, autopilot } from './core/skip.js';
import { Renderer } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { Sfx } from './audio/sfx.js';
import { storage, KEYS } from './platform/storage.js';
import { haptics } from './platform/haptics.js';
import { bindPress } from './platform/input.js';
import { Leaderboard } from './platform/leaderboard.js';

const $ = (id) => document.getElementById(id);
const STATE = Object.freeze({ TITLE: 'title', READY: 'ready', FLIGHT: 'flight', SUNK: 'sunk' });
const LEADERBOARD_ID = 'com.mythicworld.skip.distance';   // must match App Store Connect
const END_DELAY = 0.9;
const RETRY_LOCKOUT = 0.6;

const END_LINES = {
  pad: 'Landed on a lily pad. Tap early to dip the stone short of them.',
  sink: 'The stone ran out of speed. Perfect taps keep it flying.',
};
const fmt = (m) => (Math.round(m * 10) / 10).toFixed(1);
const when = (ts) => { const d = new Date(ts); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

class App {
  constructor() {
    this.canvas = $('game');
    this.renderer = new Renderer(this.canvas);
    this.fx = new Effects();
    this.sfx = new Sfx();
    this.game = new SkipGame();
    this.board = new Leaderboard({ leaderboardID: LEADERBOARD_ID, store: storage, key: KEYS.BOARD });
    this.state = STATE.TITLE;
    this.time = 0; this.stateTime = 0; this.last = performance.now();
    this.holding = false; this.autopilot = false; this.autoHold = 0;
    this.trail = [];
    this.chargeTick = 0;
    this.games = storage.get(KEYS.GAMES, 0);
    this.muted = storage.get(KEYS.MUTED, false);
    this.hapticsOn = storage.get(KEYS.HAPTICS, true);
    this.sfx.setMuted(this.muted); haptics.setEnabled(this.hapticsOn);

    this.ui = {
      title: $('title'), hud: $('hud'), over: $('over'), howto: $('howto'), board: $('board'), settings: $('settings'),
      best: $('best'), distance: $('distance'), skips: $('skips'), hint: $('hint'),
      overDistance: $('over-distance'), overSkips: $('over-skips'), overPerfects: $('over-perfects'), overMotes: $('over-motes'), overRank: $('over-rank'),
      newBest: $('new-best'), endLine: $('end-line'), gcChip: $('gc-chip'), gcText: $('gc-text'), boardStatus: $('board-status'), boardList: $('board-list'), gcOpen: $('gc-open'),
      optSound: $('opt-sound'), optHaptics: $('opt-haptics'), share: $('share'),
    };
    this.ui.best.textContent = fmt(this.board.local.best());
    this.ui.optSound.checked = !this.muted; this.ui.optHaptics.checked = this.hapticsOn;
    if (!navigator.share) this.ui.share.hidden = true;

    this.bindGame(); this.bindUi();
    this.board.onChange(() => this.renderBoardStatus());
    this.board.init(); this.renderBoardStatus();
    this.renderer.follow(0, 0, true);
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    window.__skip = this;
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ───────────── wiring ───────────── */
  bindGame() {
    const g = this.game;
    g.on('throw', (e) => this.onThrow(e));
    g.on('skip', (s) => this.onSkip(s));
    g.on('mote', (e) => this.onMote(e));
    g.on('sink', (e) => this.onSink(e));
    g.on('milestone', (m) => this.onMilestone(m));
  }

  bindUi() {
    bindPress(this.canvas, { onPress: () => this.press(), onRelease: () => this.release() });
    $('play').addEventListener('click', () => { this.click(); this.start(); });
    $('retry').addEventListener('click', () => { this.click(); this.start(); });
    $('to-title').addEventListener('click', () => { this.click(); this.toTitle(); });
    $('open-howto').addEventListener('click', () => { this.click(); this.openPanel('howto'); });
    $('open-board').addEventListener('click', () => { this.click(); this.openBoard(); });
    $('over-board').addEventListener('click', () => { this.click(); this.openBoard(); });
    $('open-settings').addEventListener('click', () => { this.click(); this.openPanel('settings'); });
    this.ui.gcOpen.addEventListener('click', () => { this.click(); this.board.showNative(); });
    for (const b of document.querySelectorAll('.close-panel')) b.addEventListener('click', () => { this.click(); this.closePanels(); });
    this.ui.optSound.addEventListener('change', () => { this.muted = !this.ui.optSound.checked; storage.set(KEYS.MUTED, this.muted); this.sfx.setMuted(this.muted); this.sfx.unlock(); if (!this.muted) this.sfx.tap(); });
    this.ui.optHaptics.addEventListener('change', () => { this.hapticsOn = this.ui.optHaptics.checked; storage.set(KEYS.HAPTICS, this.hapticsOn); haptics.setEnabled(this.hapticsOn); if (this.hapticsOn) haptics.light(); });
    this.ui.share.addEventListener('click', () => this.share());
  }

  click() { this.sfx.unlock(); this.sfx.tap(); }

  /* ───────────── states & panels ───────────── */
  setState(s) {
    this.state = s; this.stateTime = 0;
    document.body.dataset.state = s;
    this.ui.title.hidden = s !== STATE.TITLE;
    this.ui.hud.hidden = !(s === STATE.READY || s === STATE.FLIGHT);
    this.ui.over.hidden = true;
  }
  openPanel(id) {
    this.closePanels();
    if (this.state === STATE.SUNK) this.ui.over.hidden = true;   // panels replace the result card while open
    this.ui[id].hidden = false; this.panel = id;
  }
  closePanels() {
    for (const id of ['howto', 'board', 'settings']) this.ui[id].hidden = true;
    this.panel = null;
    if (this.state === STATE.SUNK && this.resultsShown) this.ui.over.hidden = false;
  }

  openBoard() {
    this.renderBoardStatus();
    const top = this.board.local.top();
    const best = this.board.local.best();
    this.ui.boardList.innerHTML = top.length
      ? top.map((e, i) => `<li class="${e.score === best ? 'me' : ''}"><span class="rank">${i + 1}</span><span><span class="when">${when(e.at)}</span></span><span class="score">${fmt(e.score)} m</span></li>`).join('')
      : '<li><span class="empty">No throws yet. Your first skip goes here.</span></li>';
    this.ui.gcOpen.hidden = !this.board.nativeAvailable;
    this.openPanel('board');
  }

  renderBoardStatus() {
    const st = this.board.status;
    const text = st === 'connected' ? `Game Center · ${this.board.alias || 'signed in'}`
      : st === 'connecting' ? 'Connecting to Game Center…'
      : st === 'unavailable' ? 'Game Center unavailable · local scores'
      : 'Local scores · Game Center in the iOS app';
    this.ui.gcChip.dataset.status = st; this.ui.gcText.textContent = text;
    this.ui.boardStatus.textContent = text;
  }

  toTitle() { this.closePanels(); this.game.reset(); this.fx.clear(); this.trail.length = 0; this.renderer.follow(0, 0, true); this.setState(STATE.TITLE); }

  start() {
    this.closePanels();
    this.sfx.unlock();
    this.game.reset(); this.fx.clear(); this.trail.length = 0;
    this.renderer.follow(0, 0, true);
    this.setState(STATE.READY);
    this.ui.distance.innerHTML = `0<span class="unit">m</span>`; this.ui.skips.textContent = '0 skips';
    this.hint('HOLD ANYWHERE TO WIND UP');
    this.autoHold = 0;
  }

  hint(text) { this.ui.hint.textContent = text; this.ui.hint.style.opacity = text ? 1 : 0; }

  /* ───────────── input ───────────── */
  press() {
    this.sfx.unlock();
    if (this.state === STATE.READY) { this.holding = true; return; }
    if (this.state === STATE.FLIGHT) { this.game.tap(); return; }
    if (this.state === STATE.SUNK && this.stateTime > RETRY_LOCKOUT && !this.ui.over.hidden) { this.start(); this.holding = true; }
  }
  release() {
    if (this.state === STATE.READY && this.holding) { this.holding = false; this.game.release(); }
    this.holding = false;
  }

  /* ───────────── game events ───────────── */
  stoneScreen() { const s = this.game.stone; return [this.renderer.sx(s.x), this.renderer.sy(Math.max(0, s.y))]; }

  onThrow() {
    this.sfx.throw_(); haptics.light();
    this.setState(STATE.FLIGHT);
    this.hint('TAP WHEN IT TOUCHES THE WATER');
  }

  onSkip(s) {
    const r = this.renderer;
    this.fx.ripple(s.x, 0.6 + s.quality * 0.8, s.kind === 'perfect' ? 4 : 2);
    this.fx.splash(s.x, s.quality);
    this.sfx.skip(s.kind, s.streak);
    if (s.kind === 'perfect') haptics.medium(); else haptics.light();
    const [sx] = [r.sx(s.x)];
    if (s.kind === 'perfect') this.fx.addPop(s.streak > 1 ? `PERFECT ×${s.streak}` : 'PERFECT', sx, r.waterY - 46, { size: 22, color: 'hsl(45 100% 78%)' });
    else if (s.kind === 'good') this.fx.addPop('GOOD', sx, r.waterY - 42, { size: 18, color: '#dff3ff', life: 0.7 });
    else if (s.kind === 'early') this.fx.addPop('DIP', sx, r.waterY - 42, { size: 16, color: '#bfd3ff', life: 0.6 });
    this.ui.skips.textContent = `${this.game.skips} skip${this.game.skips === 1 ? '' : 's'}`;
    if (this.game.skips >= 3) this.hint('');
  }

  onMote(e) {
    this.fx.moteBurst(e.x); this.sfx.mote(); haptics.medium();
    this.fx.addPop('+SPEED', this.renderer.sx(e.x), this.renderer.waterY - 70, { size: 18, color: '#fff2b0', life: 0.8 });
  }

  onSink(e) {
    this.end = e;
    if (e.reason === 'pad') { this.sfx.pad(); this.fx.ripple(e.pad.x, 0.5, 2); }
    else { this.sfx.sink(); this.fx.sink(this.game.stone.x); }
    haptics.heavy();
    this.hint('');
    this.setState(STATE.SUNK);
  }

  onMilestone(m) {
    this.sfx.milestone(); haptics.medium();
    this.fx.addPop(m.name.toUpperCase(), this.renderer.w / 2, this.renderer.h * 0.28, { size: Math.min(30, this.renderer.w / 12), color: 'hsl(45 100% 78%)', life: 1.8, rise: 28 });
  }

  showResults() {
    const e = this.end, g = this.game;
    this.games += 1; storage.set(KEYS.GAMES, this.games);
    const { rank, isBest } = this.board.submit(e.distance);
    this.ui.overDistance.innerHTML = `${fmt(e.distance)}<span class="unit">m</span>`;
    this.ui.overSkips.textContent = e.skips; this.ui.overPerfects.textContent = e.perfects; this.ui.overMotes.textContent = e.motes;
    this.ui.overRank.textContent = rank ? `#${rank}` : '–';
    this.ui.newBest.hidden = !isBest || e.distance < 1;
    this.ui.endLine.textContent = END_LINES[e.reason] || '';
    this.ui.best.textContent = fmt(this.board.local.best());
    this.ui.over.hidden = false;
    this.resultsShown = true;
  }

  /* ───────────── loop ───────────── */
  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now; this.time += dt; this.stateTime += dt;
    const g = this.game, r = this.renderer;

    if (this.state === STATE.READY) {
      let hold = this.holding;
      if (this.autopilot) { this.autoHold += dt; hold = this.autoHold < 0.9; if (!hold && this.autoHold > 0.95) g.release(); }
      g.update(dt, hold);
      if (hold) { this.chargeTick += dt; if (this.chargeTick > 0.09) { this.chargeTick = 0; this.sfx.charge(g.charge); } }
    } else if (this.state === STATE.FLIGHT) {
      if (this.autopilot && autopilot(g)) g.tap();
      g.update(dt);
      this.trail.push([g.stone.x, Math.max(0, g.stone.y)]);
      if (this.trail.length > 16) this.trail.shift();
      this.ui.distance.innerHTML = `${Math.floor(g.distance)}<span class="unit">m</span>`;
    } else if (this.state === STATE.SUNK) {
      if (this.trail.length) this.trail.shift();
      if (this.stateTime >= END_DELAY && !this.resultsShown) this.showResults();
    }
    if (this.state !== STATE.SUNK) this.resultsShown = false;

    r.follow(g.stone.x, dt);
    this.fx.update(dt);
    const S = r.draw(g, this.time, this.fx, this.state === STATE.FLIGHT || this.state === STATE.SUNK ? this.trail : null, this.state === STATE.READY);
    this.sfx.setNight(S.night);
    requestAnimationFrame((t) => this.frame(t));
  }

  async share() {
    const text = `I skipped a stone ${fmt(this.game.distance)} m across the lake in SKIP 🪨💦 Can you beat me?`;
    try { await navigator.share({ title: 'SKIP', text, url: location.href }); } catch { /* cancelled */ }
  }
}

window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
