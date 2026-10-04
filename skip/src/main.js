/**
 * SKIP — app controller: classic start screen with an attract-mode demo,
 * leaderboard screen (local / friends / global), friend challenges by link,
 * adaptive graphics quality for phones, and the play loop.
 * Rules live in core/skip.js; the lake is drawn by render/renderer.js.
 */
import { SkipGame, autopilot } from './core/skip.js';
import { newSeed, cleanTag, challengeUrl, challengeFromUrl } from './core/challenge.js';
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
const END_DELAY = 0.9, RETRY_LOCKOUT = 0.6, DEMO_RESTART = 1.6;
const END_LINES = { pad: 'Landed on a lily pad. Tap early to dip the stone short of them.', sink: 'The stone ran out of speed. Perfect taps keep it flying.' };
const fmt = (m) => (Math.round(m * 10) / 10).toFixed(1);
const when = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

class App {
  constructor() {
    this.canvas = $('game');
    this.qualityPref = storage.get('quality', 'auto');
    this.quality = this.qualityPref === 'auto' ? (isTouch ? 'medium' : 'high') : this.qualityPref;
    this.renderer = new Renderer(this.canvas, this.quality);
    this.fx = new Effects();
    this.sfx = new Sfx();
    this.game = new SkipGame({ seed: newSeed() });
    this.board = new Leaderboard({ leaderboardID: LEADERBOARD_ID, store: storage, key: KEYS.BOARD });
    this.state = STATE.TITLE; this.demo = true;
    this.time = 0; this.stateTime = 0; this.last = performance.now();
    this.holding = false; this.autopilot = false; this.autoHold = 0; this.demoHold = 0;
    this.trail = []; this.chargeTick = 0;
    this.frameAcc = 0; this.frameN = 0; this.paused = false;
    this.lastHud = { d: -1, s: -1 };
    this.games = storage.get(KEYS.GAMES, 0);
    this.muted = storage.get(KEYS.MUTED, false);
    this.hapticsOn = storage.get(KEYS.HAPTICS, true);
    this.tag = cleanTag(storage.get(KEYS.NAME, 'YOU'));
    this.sfx.setMuted(this.muted); haptics.setEnabled(this.hapticsOn);
    this.challenge = null;        // incoming challenge being played
    this.incoming = null;         // challenge parsed from the URL, shown as a banner

    const ids = ['title', 'hud', 'over', 'howto', 'board', 'settings', 'challenge', 'best', 'best-tag', 'distance', 'skips', 'hud-target', 'hint',
      'over-distance', 'over-skips', 'over-perfects', 'over-motes', 'over-rank', 'new-best', 'end-line', 'versus', 'versus-text', 'gc-chip', 'gc-text',
      'board-list', 'friends-list', 'global-status', 'gc-open', 'gc-friends', 'global-web', 'opt-sound', 'opt-haptics', 'opt-quality', 'tag-input', 'tag-input-2',
      'challenge-banner', 'banner-title', 'banner-sub', 'banner-accept', 'send-challenge', 'toast', 'tap-start'];
    this.ui = Object.fromEntries(ids.map(id => [id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()), $(id)]));
    this.ui.optSound.checked = !this.muted; this.ui.optHaptics.checked = this.hapticsOn; this.ui.optQuality.value = this.qualityPref;
    this.ui.tagInput.value = this.ui.tagInput2.value = this.tag === 'YOU' ? '' : this.tag;
    this.refreshHiscore();

    this.bindGame(); this.bindUi();
    this.board.onChange(() => this.renderBoardStatus());
    this.board.init(); this.renderBoardStatus();
    this.readChallengeFromUrl();
    this.renderer.follow(0, 0, true);
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.__skip = this;
    this.startDemo();
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
    $('retry').addEventListener('click', () => { this.click(); this.start(this.challenge ? this.challenge.seed : undefined); });
    $('to-title').addEventListener('click', () => { this.click(); this.toTitle(); });
    $('open-howto').addEventListener('click', () => { this.click(); this.openPanel('howto'); });
    $('open-settings').addEventListener('click', () => { this.click(); this.openPanel('settings'); });
    $('open-challenge').addEventListener('click', () => { this.click(); this.openPanel('challenge'); });
    $('challenge-play').addEventListener('click', () => { this.click(); this.saveTag(this.ui.tagInput.value); this.start(); this.toast('Play, then send your run as a challenge'); });
    $('open-board').addEventListener('click', () => { this.click(); this.openBoard('local'); });
    $('over-board').addEventListener('click', () => { this.click(); this.openBoard('local'); });
    $('friends-challenge').addEventListener('click', () => { this.click(); this.closeScreens(); this.openPanel('challenge'); });
    this.ui.bannerAccept.addEventListener('click', () => { this.click(); this.acceptChallenge(); });
    this.ui.sendChallenge.addEventListener('click', () => this.sendChallenge());
    this.ui.gcOpen.addEventListener('click', () => { this.click(); this.board.showNative('global'); });
    this.ui.gcFriends.addEventListener('click', () => { this.click(); this.board.showNative('friends'); });
    for (const b of document.querySelectorAll('.close-panel')) b.addEventListener('click', () => { this.click(); this.closePanels(); });
    for (const b of document.querySelectorAll('.close-screen')) b.addEventListener('click', () => { this.click(); this.closeScreens(); });
    for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => { this.click(); this.showTab(t.dataset.tab); });
    this.ui.optSound.addEventListener('change', () => { this.muted = !this.ui.optSound.checked; storage.set(KEYS.MUTED, this.muted); this.sfx.setMuted(this.muted); this.sfx.unlock(); if (!this.muted) this.sfx.tap(); });
    this.ui.optHaptics.addEventListener('change', () => { this.hapticsOn = this.ui.optHaptics.checked; storage.set(KEYS.HAPTICS, this.hapticsOn); haptics.setEnabled(this.hapticsOn); if (this.hapticsOn) haptics.light(); });
    this.ui.optQuality.addEventListener('change', () => { this.qualityPref = this.ui.optQuality.value; storage.set('quality', this.qualityPref); this.setQuality(this.qualityPref === 'auto' ? (isTouch ? 'medium' : 'high') : this.qualityPref); });
    for (const inp of [this.ui.tagInput, this.ui.tagInput2]) inp.addEventListener('change', () => this.saveTag(inp.value));
    // tapping the start screen outside the menu starts a run (classic)
    this.ui.title.addEventListener('pointerdown', (e) => { if (e.target === this.ui.title || e.target.closest('.title-block, .tap-start')) { this.click(); this.start(); } });
  }

  click() { this.sfx.unlock(); this.sfx.tap(); }
  toast(text, ms = 2200) { const t = this.ui.toast; t.textContent = text; t.hidden = false; clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, ms); }
  saveTag(v) { this.tag = cleanTag(v); storage.set(KEYS.NAME, this.tag); this.ui.tagInput.value = this.ui.tagInput2.value = this.tag === 'YOU' ? '' : this.tag; this.refreshHiscore(); }
  refreshHiscore() { const top = this.board.local.top(1)[0]; this.ui.best.textContent = fmt(top ? top.score : 0); this.ui.bestTag.textContent = top ? (top.tag || this.tag) : this.tag; }

  /* ───────────── quality / lifecycle ───────────── */
  setQuality(level) { this.quality = level; this.renderer.setQuality(level); this.frameAcc = 0; this.frameN = 0; }
  /** Step graphics down when frames run long (auto mode only). */
  adapt(dt) {
    if (this.qualityPref !== 'auto') return;
    this.frameAcc += dt; this.frameN++;
    if (this.frameAcc < 2) return;
    const avg = this.frameAcc / this.frameN; this.frameAcc = 0; this.frameN = 0;
    if (avg > 0.024 && this.quality === 'high') this.setQuality('medium');
    else if (avg > 0.028 && this.quality === 'medium') this.setQuality('low');
  }
  onVisibility() {
    this.paused = document.hidden;
    this.last = performance.now();
    if (!this.paused) requestAnimationFrame((t) => this.frame(t));
  }

  /* ───────────── states & screens ───────────── */
  setState(s) {
    this.state = s; this.stateTime = 0;
    document.body.dataset.state = s;
    this.ui.title.hidden = s !== STATE.TITLE;
    this.ui.hud.hidden = !(s === STATE.READY || s === STATE.FLIGHT);
    this.ui.over.hidden = true;
  }
  openPanel(id) { this.closePanels(); if (this.state === STATE.SUNK) this.ui.over.hidden = true; this.ui[id].hidden = false; this.panel = id; }
  closePanels() { for (const id of ['howto', 'settings', 'challenge']) this.ui[id].hidden = true; this.panel = null; if (this.state === STATE.SUNK && this.resultsShown) this.ui.over.hidden = false; }
  closeScreens() { this.ui.board.hidden = true; if (this.state === STATE.SUNK && this.resultsShown) this.ui.over.hidden = false; }

  openBoard(tab = 'local') {
    this.closePanels();
    if (this.state === STATE.SUNK) this.ui.over.hidden = true;
    this.renderBoardStatus(); this.renderLocal(); this.renderFriends(); this.renderGlobal();
    this.ui.board.hidden = false;
    this.showTab(tab);
  }
  showTab(tab) {
    for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === tab);
    for (const p of document.querySelectorAll('.tab-pane')) p.classList.toggle('active', p.id === `tab-${tab}`);
  }
  row(i, tag, score, at, cls = '') {
    return `<li class="${cls}"><span class="rank ${i === 0 ? 'gold' : ''}">${i + 1}</span><span class="tag">${tag}</span><span class="when">${when(at)}</span><span class="score">${fmt(score)} m</span></li>`;
  }
  renderLocal() {
    const top = this.board.local.top(), best = this.board.local.best(), last = this.lastScore;
    this.ui.boardList.innerHTML = top.length
      ? top.map((e, i) => this.row(i, e.tag || this.tag, e.score, e.at, e.score === last ? 'me' : i === 0 ? 'top' : '')).join('')
      : '<li><span class="empty">No throws yet.<br>Your first skip goes here.</span></li>';
  }
  renderFriends() {
    const f = this.board.friends.top();
    const mine = this.board.local.best();
    const rows = f.map(e => ({ tag: e.tag, score: e.score, at: e.at, me: false }));
    if (mine > 0) rows.push({ tag: this.tag, score: mine, at: Date.now(), me: true });
    rows.sort((a, b) => b.score - a.score);
    this.ui.friendsList.innerHTML = rows.length
      ? rows.map((e, i) => this.row(i, e.tag, e.score, e.at, e.me ? 'me' : '')).join('')
      : '<li><span class="empty">No friends yet.<br>Send a challenge link and their result lands here.</span></li>';
  }
  renderGlobal() {
    const native = this.board.nativeAvailable;
    this.ui.gcOpen.hidden = !native; this.ui.gcFriends.hidden = !native; this.ui.globalWeb.hidden = native;
    this.ui.globalStatus.textContent = native ? (this.board.status === 'connected' ? `Signed in as ${this.board.alias}` : 'Sign in to Game Center to see global rankings') : '';
  }
  renderBoardStatus() {
    const st = this.board.status;
    const text = st === 'connected' ? `Game Center · ${this.board.alias || 'signed in'}` : st === 'connecting' ? 'Connecting to Game Center…' : st === 'unavailable' ? 'Game Center unavailable · local scores' : 'Local scores · Game Center in the iOS app';
    this.ui.gcChip.dataset.status = st; this.ui.gcText.textContent = text;
    if (!this.ui.board.hidden) this.renderGlobal();
  }

  /* ───────────── challenges ───────────── */
  readChallengeFromUrl() {
    const c = challengeFromUrl(location.href);
    if (!c) return;
    this.incoming = c;
    if (c.reply) {
      // A friend answered our challenge: record them and tell the story.
      this.board.friends.record(c.reply.tag, c.reply.score, c.seed);
      const win = c.score > c.reply.score;
      this.ui.bannerTitle.textContent = win ? `${c.reply.tag} fell short: ${fmt(c.reply.score)} m` : `${c.reply.tag} beat you: ${fmt(c.reply.score)} m`;
      this.ui.bannerSub.textContent = `vs your ${fmt(c.score)} m · rematch on the same lake?`;
      this.ui.bannerAccept.textContent = 'Rematch';
    } else {
      this.board.friends.record(c.tag, c.score, c.seed);
      this.ui.bannerTitle.textContent = `${c.tag} challenges you`;
      this.ui.bannerSub.textContent = `${fmt(c.score)} m · same lake, same lily pads`;
      this.ui.bannerAccept.textContent = 'Accept';
    }
    this.ui.challengeBanner.hidden = false;
    history.replaceState(null, '', location.pathname + location.search);
  }
  acceptChallenge() {
    const c = this.incoming; if (!c) return;
    this.challenge = c.reply ? { seed: c.seed, tag: c.reply.tag, score: c.reply.score, mine: c.score } : { seed: c.seed, tag: c.tag, score: c.score };
    this.ui.challengeBanner.hidden = true;
    this.start(c.seed);
  }
  async sendChallenge() {
    this.click();
    const e = this.end; if (!e) return;
    const c = this.challenge
      ? { seed: this.challenge.seed, score: this.challenge.score, tag: this.challenge.tag, reply: { score: e.distance, tag: this.tag } }
      : { seed: this.game.seed, score: e.distance, tag: this.tag };
    const url = challengeUrl(location.href.split('#')[0], c);
    const text = this.challenge
      ? `I threw ${fmt(e.distance)} m on your lake in SKIP. ${e.distance > this.challenge.score ? 'Beat that!' : 'You win this one…'}`
      : `Beat my ${fmt(e.distance)} m stone skip in SKIP 🪨💦 Same lake, same lily pads:`;
    try {
      if (navigator.share) { await navigator.share({ title: 'SKIP challenge', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.toast('Challenge link copied');
    } catch { /* cancelled */ }
  }

  /* ───────────── play ───────────── */
  startDemo() {
    this.demo = true; this.autopilot = true; this.autoHold = 0; this.demoHold = 0;
    this.game.resetWithSeed(newSeed()); this.fx.clear(); this.trail.length = 0;
    this.renderer.follow(0, 0, true);
    this.gameState = 'ready';
  }
  toTitle() {
    this.closePanels(); this.closeScreens();
    this.challenge = null;
    this.setState(STATE.TITLE);
    this.startDemo();
  }
  start(seed) {
    this.closePanels(); this.closeScreens(); this.sfx.unlock();
    this.demo = false; this.autopilot = false;
    if (seed === undefined) this.challenge = null;
    this.game.resetWithSeed(seed === undefined ? newSeed() : seed);
    this.fx.clear(); this.trail.length = 0; this.renderer.follow(0, 0, true);
    this.setState(STATE.READY);
    this.lastHud = { d: -1, s: -1 }; this.updateHud(true);
    this.ui.hudTarget.hidden = !this.challenge;
    if (this.challenge) this.ui.hudTarget.textContent = `Beat ${this.challenge.tag} · ${fmt(this.challenge.score)} m`;
    this.hint('HOLD ANYWHERE TO WIND UP');
  }
  hint(text) { this.ui.hint.textContent = text; this.ui.hint.style.opacity = text ? 1 : 0; }

  press() {
    this.sfx.unlock();
    if (this.state === STATE.READY) { this.holding = true; return; }
    if (this.state === STATE.FLIGHT) { this.game.tap(); return; }
    if (this.state === STATE.SUNK && this.stateTime > RETRY_LOCKOUT && !this.ui.over.hidden) { this.start(this.challenge ? this.challenge.seed : undefined); this.holding = true; }
  }
  release() {
    if (this.state === STATE.READY && this.holding) { this.holding = false; this.game.release(); }
    this.holding = false;
  }

  /* ───────────── game events ───────────── */
  onThrow() {
    if (this.demo) return;
    this.sfx.throw_(); haptics.light();
    this.setState(STATE.FLIGHT);
    this.hint('TAP WHEN IT TOUCHES THE WATER');
  }
  onSkip(s) {
    const r = this.renderer;
    this.fx.ripple(s.x, 0.6 + s.quality * 0.8, s.kind === 'perfect' ? 4 : 2);
    this.fx.splash(s.x, s.quality);
    if (this.demo) return;
    this.sfx.skip(s.kind, s.streak);
    if (s.kind === 'perfect') haptics.medium(); else haptics.light();
    const sx = r.sx(s.x);
    if (s.kind === 'perfect') this.fx.addPop(s.streak > 1 ? `PERFECT ×${s.streak}` : 'PERFECT', sx, r.waterY - 46, { size: 22, color: 'hsl(45 100% 78%)' });
    else if (s.kind === 'good') this.fx.addPop('GOOD', sx, r.waterY - 42, { size: 18, color: '#dff3ff', life: 0.7 });
    else if (s.kind === 'early') this.fx.addPop('DIP', sx, r.waterY - 42, { size: 16, color: '#bfd3ff', life: 0.6 });
    if (this.game.skips >= 3) this.hint('');
  }
  onMote(e) {
    this.fx.moteBurst(e.x);
    if (this.demo) return;
    this.sfx.mote(); haptics.medium();
    this.fx.addPop('+SPEED', this.renderer.sx(e.x), this.renderer.waterY - 70, { size: 18, color: '#fff2b0', life: 0.8 });
  }
  onSink(e) {
    if (e.reason === 'pad') this.fx.ripple(e.pad.x, 0.5, 2); else this.fx.sink(this.game.stone.x);
    if (this.demo) { this.demoRestart = DEMO_RESTART; return; }
    this.end = e;
    if (e.reason === 'pad') this.sfx.pad(); else this.sfx.sink();
    haptics.heavy(); this.hint('');
    this.setState(STATE.SUNK);
  }
  onMilestone(m) {
    if (this.demo) return;
    this.sfx.milestone(); haptics.medium();
    this.fx.addPop(m.name.toUpperCase(), this.renderer.w / 2, this.renderer.h * 0.28, { size: Math.min(30, this.renderer.w / 12), color: 'hsl(45 100% 78%)', life: 1.8, rise: 28 });
  }

  showResults() {
    const e = this.end;
    this.games += 1; storage.set(KEYS.GAMES, this.games);
    const { rank, isBest } = this.board.submit(e.distance, this.tag);
    this.lastScore = Math.round(e.distance * 10) / 10;
    this.ui.overDistance.innerHTML = `${fmt(e.distance)}<span class="unit">m</span>`;
    this.ui.overSkips.textContent = e.skips; this.ui.overPerfects.textContent = e.perfects; this.ui.overMotes.textContent = e.motes;
    this.ui.overRank.textContent = rank ? `#${rank}` : '–';
    this.ui.newBest.hidden = !isBest || e.distance < 1;
    this.ui.endLine.textContent = END_LINES[e.reason] || '';
    if (this.challenge) {
      const diff = e.distance - this.challenge.score;
      this.ui.versusText.textContent = diff > 0 ? `You beat ${this.challenge.tag} by ${fmt(diff)} m` : diff < 0 ? `${this.challenge.tag} wins by ${fmt(-diff)} m` : `Dead heat with ${this.challenge.tag}!`;
      this.ui.versus.hidden = false;
      this.ui.sendChallenge.textContent = 'Send result';
    } else {
      this.ui.versus.hidden = true;
      this.ui.sendChallenge.textContent = 'Challenge a friend';
    }
    this.refreshHiscore();
    this.ui.over.hidden = false;
    this.resultsShown = true;
  }

  updateHud(force = false) {
    const d = Math.floor(this.game.distance), s = this.game.skips;
    if (force || d !== this.lastHud.d) { this.ui.distance.innerHTML = `${d}<span class="unit">m</span>`; this.lastHud.d = d; }
    if (force || s !== this.lastHud.s) { this.ui.skips.textContent = `${s} skip${s === 1 ? '' : 's'}`; this.lastHud.s = s; }
  }

  /* ───────────── loop ───────────── */
  frame(now) {
    if (this.paused) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now; this.time += dt; this.stateTime += dt;
    const g = this.game, r = this.renderer;

    if (this.demo) {
      // attract mode: the lake plays itself behind the start screen
      if (g.phase === 'ready') { this.demoHold += dt; g.update(dt, this.demoHold < 0.7); if (this.demoHold > 0.75) g.release(); }
      else if (g.phase === 'flight') { if (autopilot(g) && Math.random() < 0.9) g.tap(); g.update(dt); this.trail.push([g.stone.x, Math.max(0, g.stone.y)]); if (this.trail.length > 16) this.trail.shift(); }
      else { this.demoRestart -= dt; if (this.trail.length) this.trail.shift(); if (this.demoRestart <= 0) this.startDemo(); }
    } else if (this.state === STATE.READY) {
      let hold = this.holding;
      if (this.autopilot) { this.autoHold += dt; hold = this.autoHold < 0.9; if (!hold && this.autoHold > 0.95) g.release(); }
      g.update(dt, hold);
      if (hold) { this.chargeTick += dt; if (this.chargeTick > 0.09) { this.chargeTick = 0; this.sfx.charge(g.charge); } }
    } else if (this.state === STATE.FLIGHT) {
      if (this.autopilot && autopilot(g)) g.tap();
      g.update(dt);
      this.trail.push([g.stone.x, Math.max(0, g.stone.y)]); if (this.trail.length > 16) this.trail.shift();
      this.updateHud();
    } else if (this.state === STATE.SUNK) {
      if (this.trail.length) this.trail.shift();
      if (this.stateTime >= END_DELAY && !this.resultsShown) this.showResults();
    }
    if (this.state !== STATE.SUNK) this.resultsShown = false;

    r.follow(g.stone.x, dt);
    this.fx.update(dt);
    // on the title the sun drifts slowly with time so the scene is never static
    const phaseOverride = this.demo ? (Math.sin(this.time * 0.05) * 0.5 + 0.5) * 0.9 : undefined;
    const S = r.draw(g, this.time, this.fx, this.trail.length ? this.trail : null, { showCharge: this.state === STATE.READY, dt, phaseOverride });
    this.sfx.setNight(S.night);
    this.adapt(dt);
    requestAnimationFrame((t) => this.frame(t));
  }
}

window.addEventListener('DOMContentLoaded', () => new App());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
