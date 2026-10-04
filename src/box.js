/**
 * Game Box — the launcher. Shows the catalogue, opens a game full-screen
 * inside the box (an iframe, so each game keeps its own storage and service
 * worker), and fans box-wide settings out to every game.
 */
import { GAMES, byId, readBest, formatBest, applySettings, SCORE_KEYS } from './games.js';

const $ = (id) => document.getElementById(id);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const vibrate = (ms) => { try { if (LS.get('gamebox.settings', { haptics: true }).haptics && navigator.vibrate) navigator.vibrate(ms); } catch {} };

class Box {
  constructor() {
    this.settings = LS.get('gamebox.settings', { sound: true, haptics: true, quality: 'auto' });
    this.current = null;
    this.ui = { grid: $('grid'), hero: $('hero'), heroBtn: $('hero-btn'), heroIcon: $('hero-icon'), heroName: $('hero-name'), heroBest: $('hero-best'),
      player: $('player'), frame: $('frame'), back: $('back'), backLabel: $('back-label'), loading: $('loading'), settings: $('settings'),
      optSound: $('opt-sound'), optHaptics: $('opt-haptics'), optQuality: $('opt-quality'), toast: $('toast') };
    this.ui.optSound.checked = this.settings.sound; this.ui.optHaptics.checked = this.settings.haptics; this.ui.optQuality.value = this.settings.quality;
    this.render();
    this.bind();
    window.__box = this;
    // deep link: #play=skip opens a game straight away (used by the native shell and challenge links)
    const m = location.hash.match(/play=([a-z-]+)/);
    if (m && byId(m[1])) this.open(m[1], location.hash.replace(/^#play=[a-z-]+&?/, '#'));
  }

  render() {
    this.ui.grid.innerHTML = GAMES.map(g => `
      <button class="card" type="button" data-id="${g.id}" role="listitem" style="--accent:${g.accent}">
        <img src="${g.path}art/icon-192.png" alt="" width="56" height="56" />
        <b>${g.name}</b>
        <small>${g.tagline}</small>
        <div class="meta"><span class="chip best" data-best="${g.id}">best ${formatBest(g, readBest(g, k => localStorage.getItem(k)))}</span><span class="chip ctl">${g.control}</span></div>
      </button>`).join('');
    this.refreshHero();
  }

  refreshBests() {
    for (const g of GAMES) { const el = this.ui.grid.querySelector(`[data-best="${g.id}"]`); if (el) el.textContent = `best ${formatBest(g, readBest(g, k => localStorage.getItem(k)))}`; }
    this.refreshHero();
  }

  refreshHero() {
    const last = byId(LS.get('gamebox.last', null));
    this.ui.hero.hidden = !last;
    if (!last) return;
    this.ui.heroIcon.src = `${last.path}art/icon-192.png`;
    this.ui.heroName.textContent = last.name;
    this.ui.heroBest.textContent = `best ${formatBest(last, readBest(last, k => localStorage.getItem(k)))}`;
    this.ui.heroBtn.dataset.id = last.id;
  }

  bind() {
    this.ui.grid.addEventListener('click', (e) => { const card = e.target.closest('.card'); if (card) { card.classList.add('pressed'); vibrate(8); setTimeout(() => this.open(card.dataset.id), 120); } });
    this.ui.heroBtn.addEventListener('click', () => { vibrate(8); this.open(this.ui.heroBtn.dataset.id); });
    this.ui.back.addEventListener('click', () => { vibrate(8); this.close(); });
    $('open-settings').addEventListener('click', () => { vibrate(8); this.ui.settings.hidden = false; });
    for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', () => { this.ui.settings.hidden = true; });
    const save = () => { this.settings = { sound: this.ui.optSound.checked, haptics: this.ui.optHaptics.checked, quality: this.ui.optQuality.value }; LS.set('gamebox.settings', this.settings); applySettings(this.settings, (k, v) => localStorage.setItem(k, v)); vibrate(6); };
    this.ui.optSound.addEventListener('change', save); this.ui.optHaptics.addEventListener('change', save); this.ui.optQuality.addEventListener('change', save);
    $('reset-scores').addEventListener('click', () => {
      if (!confirm('Reset every best score in the box?')) return;
      for (const k of SCORE_KEYS) localStorage.removeItem(k);
      localStorage.removeItem('gamebox.last');
      this.refreshBests(); this.toast('Scores reset');
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!this.ui.settings.hidden) this.ui.settings.hidden = true; else if (this.current) this.close(); } });
    window.addEventListener('hashchange', () => { const m = location.hash.match(/play=([a-z-]+)/); if (m && byId(m[1]) && (!this.current || this.current.id !== m[1])) this.open(m[1]); else if (!m && this.current) this.close(false); });
    this.ui.frame.addEventListener('load', () => { this.ui.loading.classList.add('done'); });
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
    this.ui.frame.src = `${g.path}index.html?box=1${extraHash && extraHash !== '#' ? extraHash : ''}`;
    if (!location.hash.includes(`play=${g.id}`)) history.pushState(null, '', `#play=${g.id}`);
    this.quiet();
  }

  close(pop = true) {
    this.current = null;
    this.ui.frame.src = 'about:blank';           // stops audio and the game loop
    this.ui.player.hidden = true;
    document.body.dataset.view = 'home';
    this.refreshBests();
    if (pop && location.hash.includes('play=')) history.replaceState(null, '', location.pathname + location.search);
  }

  toast(text, ms = 2000) { const t = this.ui.toast; t.textContent = text; t.hidden = false; clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, ms); }
}

window.addEventListener('DOMContentLoaded', () => new Box());
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
