/**
 * Game Box — the launcher. Shows the catalogue, opens a game full-screen
 * inside the box (an iframe, so each game keeps its own storage and service
 * worker), and fans box-wide settings out to every game.
 */
import { GAMES, byId, readBest, formatBest, applySettings, SCORE_KEYS, gcScore } from './games.js';
import { Cloud } from './cloud.js';
import { shareHere } from './share.js';

const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const vibrate = (ms) => { try { if (LS.get('gamebox.settings', { haptics: true }).haptics && navigator.vibrate) navigator.vibrate(ms); } catch {} };

class Box {
  constructor() {
    this.settings = LS.get('gamebox.settings', { sound: true, haptics: true, quality: 'auto' });
    this.current = null;
    this.ui = { grid: $('grid'), hero: $('hero'), heroBtn: $('hero-btn'), heroIcon: $('hero-icon'), heroName: $('hero-name'), heroBest: $('hero-best'), heroTitle: $('hero-title'), heroTagline: $('hero-tagline'),
      soundBtn: $('toggle-sound'), soundOn: $('sound-on'), soundOff: $('sound-off'),
      player: $('player'), frame: $('frame'), back: $('back'), backLabel: $('back-label'), loading: $('loading'), settings: $('settings'),
      optSound: $('opt-sound'), optHaptics: $('opt-haptics'), optQuality: $('opt-quality'), toast: $('toast') };
    this.ui.optSound.checked = this.settings.sound; this.ui.optHaptics.checked = this.settings.haptics; this.ui.optQuality.value = this.settings.quality;
    this.render();
    this.bind();
    this.cloud = new Cloud();
    this.cloud.onChange(() => { this.refreshBests(); this.toast('Scores restored from iCloud'); });
    this.cloud.init();
    this.setupNative();
    window.__box = this;
    // deep link: #play=skip opens a game straight away (used by the native shell and challenge links)
    const m = location.hash.match(/play=([a-z-]+)/);
    if (m && byId(m[1])) this.open(m[1], location.hash.replace(/^#play=[a-z-]+&?/, '#'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cloud.push(); });
  }

  heroGame() { return byId(LS.get('gamebox.last', null)) || GAMES[0]; }

  render() {
    const hero = this.heroGame();
    this.ui.grid.innerHTML = GAMES.filter(g => g.id !== hero.id).map(g => `
      <button class="card" type="button" data-id="${g.id}" role="listitem" style="--accent:${g.accent}">
        <img src="${g.path}art/icon-192.png" alt="" width="64" height="64" />
        <b>${g.name}</b>
        <small>${g.tagline}</small>
        <div class="meta"><span class="chip" data-best="${g.id}">best<b>${formatBest(g, readBest(g, k => localStorage.getItem(k)))}</b></span></div>
      </button>`).join('');
    this.refreshHero();
  }

  refreshBests() { this.render(); }

  refreshHero() {
    const g = this.heroGame();
    this.ui.heroTitle.textContent = LS.get('gamebox.last', null) ? 'Jump back in' : 'Start here';
    this.ui.heroIcon.src = `${g.path}art/icon-192.png`;
    this.ui.heroName.textContent = g.name;
    this.ui.heroTagline.textContent = g.tagline;
    this.ui.heroBest.innerHTML = `best<b>${formatBest(g, readBest(g, k => localStorage.getItem(k)))}</b>`;
    this.ui.heroBtn.dataset.id = g.id;
  }

  bind() {
    this.ui.grid.addEventListener('click', (e) => { const card = e.target.closest('.card'); if (card) { card.classList.add('pressed'); vibrate(8); setTimeout(() => this.open(card.dataset.id), 120); } });
    this.ui.heroBtn.addEventListener('click', () => { vibrate(8); this.open(this.ui.heroBtn.dataset.id); });
    this.ui.back.addEventListener('click', () => { vibrate(8); this.close(); });
    $('open-settings').addEventListener('click', () => { vibrate(8); this.ui.settings.hidden = false; });
    this.ui.soundBtn.addEventListener('click', () => { this.ui.optSound.checked = !this.ui.optSound.checked; this.ui.optSound.dispatchEvent(new Event('change')); });
    for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', () => { this.ui.settings.hidden = true; });
    const save = () => { this.settings = { sound: this.ui.optSound.checked, haptics: this.ui.optHaptics.checked, quality: this.ui.optQuality.value }; LS.set('gamebox.settings', this.settings); applySettings(this.settings, (k, v) => localStorage.setItem(k, v)); this.syncSound(); vibrate(6); };
    this.syncSound();
    this.ui.optSound.addEventListener('change', save); this.ui.optHaptics.addEventListener('change', save); this.ui.optQuality.addEventListener('change', save);
    $('replay-tutorials').addEventListener('click', () => { localStorage.removeItem('gamebox.tutorials'); this.toast('Tutorials will show again'); });
    $('reset-scores').addEventListener('click', () => {
      if (!confirm('Reset every best score in the box?')) return;
      for (const k of SCORE_KEYS) localStorage.removeItem(k);
      localStorage.removeItem('gamebox.last');
      this.refreshBests(); this.toast('Scores reset');
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!this.ui.settings.hidden) this.ui.settings.hidden = true; else if (this.current) this.close(); } });
    window.addEventListener('hashchange', () => { const m = location.hash.match(/play=([a-z-]+)/); if (m && byId(m[1]) && (!this.current || this.current.id !== m[1])) this.open(m[1]); else if (!m && this.current) this.close(false); });
    this.ui.frame.addEventListener('load', () => { this.ui.loading.classList.add('done'); });
    // games inside the box hand their share requests up here, where the permissions live
    window.addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'gamebox:share') shareHere({ title: d.title, text: d.text, url: d.url }, { toast: (t) => this.toast(t) }); });
    // fade the back pill while playing; any touch near the top brings it back
    let quietT; const quiet = () => { clearTimeout(quietT); this.ui.player.classList.remove('quiet'); quietT = setTimeout(() => this.ui.player.classList.add('quiet'), 2500); };
    this.ui.player.addEventListener('pointerdown', quiet); this.quiet = quiet;
  }

  open(id, extraHash = '') {
    const g = byId(id); if (!g) return;
    this.current = g;
    LS.set('gamebox.last', g.id);
    document.body.dataset.view = 'game';
    this.ui.player.hidden = false;
    this.ui.loading.classList.remove('done');
    this.ui.backLabel.textContent = 'Games';
    const test = /[?&]testads=1/.test(location.search) ? '&testads=1' : '';
    this.ui.frame.src = `${g.path}index.html?box=1${test}${extraHash && extraHash !== '#' ? extraHash : ''}`;
    if (!location.hash.includes(`play=${g.id}`)) history.pushState(null, '', `#play=${g.id}`);
    this.quiet();
  }

  close(pop = true) {
    this.current = null;
    this.ui.frame.src = 'about:blank';           // stops audio and the game loop
    this.ui.player.hidden = true;
    document.body.dataset.view = 'home';
    this.refreshBests();
    this.syncScores();
    if (pop && location.hash.includes('play=')) history.replaceState(null, '', location.pathname + location.search);
  }

  syncSound() { const on = this.ui.optSound.checked; this.ui.soundOn.hidden = !on; this.ui.soundOff.hidden = on; }

  /** Native callbacks land in this (main) frame; forward them to the running game, and own Game Center for the box. */
  setupNative() {
    const fwd = (obj, fn) => (...args) => { try { const w = this.ui.frame.contentWindow; if (w && w[obj] && w[obj][fn]) w[obj][fn](...args); } catch {} };
    window.AdsBridge = { onReady: fwd('AdsBridge', 'onReady'), onResult: fwd('AdsBridge', 'onResult') };
    window.GameCenterBridge = {
      onAuth: (e) => { this.gc = e; fwd('GameCenterBridge', 'onAuth')(e); },
      onSubmitted: fwd('GameCenterBridge', 'onSubmitted'),
    };
    const gcb = window.webkit?.messageHandlers?.gameCenter;
    if (gcb) { try { gcb.postMessage({ type: 'authenticate' }); } catch {} }
  }
  /** After a game: push scores to iCloud and submit new bests to Game Center. */
  syncScores() {
    this.cloud.push();
    const gcb = window.webkit?.messageHandlers?.gameCenter; if (!gcb || !this.gc?.authenticated) return;
    const sent = LS.get('gamebox.gcSent', {});
    for (const g of GAMES) {
      if (!g.leaderboardID) continue;
      const best = readBest(g, k => localStorage.getItem(k)); const score = gcScore(g, best);
      if (score > 0 && score !== sent[g.id]) { try { gcb.postMessage({ type: 'submit', leaderboardID: g.leaderboardID, score }); sent[g.id] = score; } catch {} }
    }
    LS.set('gamebox.gcSent', sent);
  }

  toast(text, ms = 2000) { const t = this.ui.toast; t.textContent = text; t.hidden = false; clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, ms); }
}

window.addEventListener('DOMContentLoaded', () => new Box());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
