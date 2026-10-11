/**
 * Game Box — the launcher. Shows the catalogue, opens a game full-screen
 * inside the box (an iframe, so each game keeps its own storage and service
 * worker), and fans box-wide settings out to every game.
 */
import { GAMES, byId, readBest, formatBest, applySettings, SCORE_KEYS, gcScore } from './games.js';
import { Cloud } from './cloud.js';
import { shareHere } from './share.js';
import { haptics } from './haptics.js';
import { Store } from './store.js';

const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const vibrate = (ms) => haptics.pulse(ms);

/** A game's best as a chip: "best 42", or "New" before the first score. */
const chip = (g, id = '') => { const v = readBest(g, k => localStorage.getItem(k)); return v ? `<span class="chip"${id ? ` id="${id}"` : ''} data-best="${g.id}">best<b>${formatBest(g, v)}</b></span>` : `<span class="chip new"${id ? ` id="${id}"` : ''} data-best="${g.id}">New</span>`; };

class Box {
  constructor() {
    this.settings = LS.get('gamebox.settings', { sound: true, haptics: true, quality: 'auto' });
    haptics.setEnabled(this.settings.haptics !== false);
    this.current = null;
    this.ui = { grid: $('grid'), hero: $('hero'), heroBtn: $('hero-btn'), heroIcon: $('hero-icon'), heroName: $('hero-name'), heroBest: $('hero-best'), heroTitle: $('hero-title'), heroTagline: $('hero-tagline'),
      soundBtn: $('toggle-sound'), soundOn: $('sound-on'), soundOff: $('sound-off'),
      player: $('player'), frame: $('frame'), loadIcon: $('load-icon'), home: document.querySelector('.home'), back: $('back'), backLabel: $('back-label'), loading: $('loading'), settings: $('settings'),
      optSound: $('opt-sound'), optHaptics: $('opt-haptics'), optQuality: $('opt-quality'), toast: $('toast') };
    this.ui.optSound.checked = this.settings.sound; this.ui.optHaptics.checked = this.settings.haptics; this.ui.optQuality.value = this.settings.quality;
    this.render();
    this.bind();
    this.cloud = new Cloud();
    this.cloud.onChange(() => { this.refreshBests(); this.toast('Scores restored from iCloud'); });
    this.cloud.init();
    this.setupNative();
    this.setupStore();
    window.__box = this;
    // deep link: #play=skip opens a game straight away (used by the native shell and challenge links)
    const m = location.hash.match(/play=([a-z-]+)/);
    if (m && byId(m[1])) this.open(m[1], location.hash.replace(/^#play=[a-z-]+&?/, '#'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cloud.push(); });
  }

  /** First launch: the simplest game (POP). Afterwards: the last game played. */
  heroGame() { return byId(LS.get('gamebox.last', null)) || GAMES[0]; }

  render() {
    const hero = this.heroGame();
    // the grid never reshuffles: every game, fixed order; the hero above is only a shortcut
    this.ui.grid.innerHTML = GAMES.map(g => `
      <button class="card" type="button" data-id="${g.id}" role="listitem" style="--accent:${g.accent}" aria-label="${g.name}: ${g.tagline}">
        <img src="${g.path}art/icon-192.png" alt="" width="64" height="64" />
        <b>${g.name}</b>
        <small>${g.tagline}</small>
        <div class="meta">${chip(g)}</div>
      </button>`).join('');
    this.refreshHero();
  }

  refreshBests() { this.render(); }

  refreshHero() {
    const g = this.heroGame();
    this.ui.heroTitle.textContent = LS.get('gamebox.last', null) ? 'Jump back in' : 'Play now · 30 seconds';
    this.ui.heroIcon.src = `${g.path}art/icon-192.png`;
    this.ui.heroName.textContent = g.name;
    this.ui.heroTagline.textContent = g.tagline;
    this.ui.heroBest.outerHTML = chip(g, 'hero-best'); this.ui.heroBest = $('hero-best');
    this.ui.heroBtn.dataset.id = g.id; this.ui.heroBtn.style.setProperty('--accent', g.accent);
  }

  bind() {
    this.ui.grid.addEventListener('click', (e) => { const card = e.target.closest('.card'); if (!card || this.opening) return; this.opening = true; card.classList.add('pressed'); vibrate(8); setTimeout(() => { this.opening = false; card.classList.remove('pressed'); this.open(card.dataset.id); }, 120); });
    this.ui.heroBtn.addEventListener('click', () => { vibrate(8); this.open(this.ui.heroBtn.dataset.id); });
    this.ui.back.addEventListener('click', () => { vibrate(8); this.close(); });
    $('open-settings').addEventListener('click', () => { vibrate(8); this.ui.settings.hidden = false; });
    this.ui.soundBtn.addEventListener('click', () => { this.ui.optSound.checked = !this.ui.optSound.checked; this.ui.optSound.dispatchEvent(new Event('change')); });
    for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', () => { this.ui.settings.hidden = true; });
    const save = () => { this.settings = { sound: this.ui.optSound.checked, haptics: this.ui.optHaptics.checked, quality: this.ui.optQuality.value }; LS.set('gamebox.settings', this.settings); haptics.setEnabled(this.settings.haptics); applySettings(this.settings, (k, v) => localStorage.setItem(k, v)); this.syncSound(); vibrate(6); };
    this.syncSound();
    this.ui.optSound.addEventListener('change', save); this.ui.optHaptics.addEventListener('change', save); this.ui.optQuality.addEventListener('change', save);
    $('replay-tutorials').addEventListener('click', () => { localStorage.removeItem('gamebox.tutorials'); this.toast('Tutorials will show again'); });
    // two taps to reset (window.confirm is a silent no-op inside WKWebView); also forgets the iCloud copy
    const reset = $('reset-scores'); let armed = 0;
    reset.addEventListener('click', () => {
      const disarm = () => { armed = 0; clearTimeout(this.resetT); reset.textContent = 'Reset all scores'; reset.classList.remove('armed'); };
      if (!armed) { armed = Date.now(); reset.textContent = 'Tap again to reset every score'; reset.classList.add('armed'); clearTimeout(this.resetT); this.resetT = setTimeout(disarm, 4000); return; }
      disarm();
      this.cloud.remove([...SCORE_KEYS, 'gamebox.gcSent']);
      localStorage.removeItem('gamebox.last');
      this.refreshBests(); this.toast('Scores reset');
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!this.ui.settings.hidden) this.ui.settings.hidden = true; else if (this.current) this.close(); } });
    window.addEventListener('hashchange', () => { const m = location.hash.match(/play=([a-z-]+)/); if (m && byId(m[1]) && (!this.current || this.current.id !== m[1])) this.open(m[1], location.hash.replace(/^#play=[a-z-]+&?/, '#')); else if (!m && this.current) this.close(false); });
    this.ui.frame.addEventListener('load', () => { this.ui.loading.classList.add('done'); this.ui.frame.style.opacity = 1; });   // cross-fade the game in
    // games inside the box hand their share requests up here, where the permissions live
    window.addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'gamebox:share') shareHere({ title: d.title, text: d.text, url: d.url }, { toast: (t) => this.toast(t) }); });
    // fade the back pill while playing; any touch near the top brings it back
    let quietT; const quiet = () => { clearTimeout(quietT); this.ui.player.classList.remove('quiet'); quietT = setTimeout(() => this.ui.player.classList.add('quiet'), 2500); };
    this.ui.player.addEventListener('pointerdown', quiet); this.quiet = quiet;
  }

  open(id, extraHash = '') {
    const g = byId(id); if (!g) return;
    if (this.current && this.current.id === id && !this.ui.player.hidden) return;   // already open (double tap)
    this.current = g;
    LS.set('gamebox.last', g.id);
    document.body.dataset.view = 'game';
    clearTimeout(this.closeT2); this.ui.player.classList.remove('closing');
    this.ui.player.hidden = false;
    this.ui.player.style.setProperty('--accent', g.accent);
    this.ui.loadIcon.src = `${g.path}art/icon-192.png`;
    this.ui.frame.title = g.name; this.ui.frame.style.opacity = 0;
    this.ui.loading.classList.remove('done');
    this.ui.backLabel.textContent = 'Games';
    const test = /[?&]testads=1/.test(location.search) ? '&testads=1' : '';
    this.ui.frame.src = `${g.path}index.html?box=1${test}${extraHash && extraHash !== '#' ? extraHash : ''}`;
    if (!location.hash.includes(`play=${g.id}`)) { history.pushState({ box: g.id }, '', `#play=${g.id}`); this.pushed = true; } else this.pushed = false;
    this.quiet();
  }

  close(pop = true) {
    const g = this.current; this.current = null;
    // a game may have changed the sound setting from its own mute button: keep the hub in step
    if (g) { try { const m = localStorage.getItem(`${g.id === 'sky-temple' ? 'skytemple' : g.id}.muted`); if (m !== null) { const on = !JSON.parse(m); if (on !== this.settings.sound) { this.settings.sound = on; this.ui.optSound.checked = on; LS.set('gamebox.settings', this.settings); applySettings(this.settings, (k, v) => localStorage.setItem(k, v)); this.syncSound(); } } } catch {} }
    try { this.ui.frame.contentWindow.postMessage({ type: 'gamebox:leaving' }, '*'); } catch {}
    const frame = this.ui.frame; clearTimeout(this.closeT);
    this.closeT = setTimeout(() => { if (!this.current) frame.src = 'about:blank'; }, 220);   // let the song fade, then stop the game loop
    // slide the game away, then hide it
    this.ui.player.classList.add('closing'); clearTimeout(this.closeT2);
    this.closeT2 = setTimeout(() => { if (!this.current) { this.ui.player.hidden = true; this.ui.player.classList.remove('closing'); } }, 240);
    document.body.dataset.view = 'home';
    this.ui.home && (this.ui.home.scrollTop = 0);
    this.refreshBests();
    this.syncScores();
    if (pop && location.hash.includes('play=')) { if (this.pushed) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
    this.pushed = false;
  }

  /** "Go ad-free" + Restore, shown only where StoreKit exists (the iOS app). */
  setupStore() {
    const store = this.store = new Store(), wrap = $('iap'), buy = $('buy-adfree'), restore = $('restore');
    const paint = () => {
      wrap.hidden = !store.available;
      buy.disabled = store.busy || store.adFree;
      buy.textContent = store.adFree ? 'Ad-free · thank you' : store.price ? `Go ad-free · ${store.price}` : 'Go ad-free';
      restore.disabled = store.busy;
    };
    store.onChange((_, justBought) => { paint(); if (justBought) this.toast('Ad-free unlocked · thank you'); });
    buy.addEventListener('click', () => { vibrate(8); store.buy(); });
    restore.addEventListener('click', () => { vibrate(8); store.restore(); this.toast('Checking your purchases…'); });
    paint(); store.load();
    // player tag (3 letters) signs challenge links in every game
    const tag = $('opt-tag'), clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    tag.value = (() => { try { return JSON.parse(localStorage.getItem('skip.name')) || ''; } catch { return ''; } })();
    tag.addEventListener('input', () => { const v = clean(tag.value); tag.value = v; if (v) localStorage.setItem('skip.name', JSON.stringify(v)); });
  }

  /** The iOS shell calls this when the app resigns active (Control Center, a call): pause the run. */
  pauseGame() { try { this.ui.frame.contentWindow.postMessage({ type: 'gamebox:pause' }, '*'); } catch {} }

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
