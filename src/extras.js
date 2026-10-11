/**
 * Game Box — the features every game shares, wired in one call:
 *   • music (a per-game song, following the sound setting and the game state)
 *   • in-run coaching (one coach mark at the moment it matters, once per player; the ? button
 *     opens a how-to sheet any time) — no slideshow before the first run
 *   • challenge a friend (seeded run + share link + versus line, hub-aware links)
 *   • continue by watching a rewarded ad (one per run)
 *
 * attachExtras({
 *   id, name,                     // 'pop', 'POP'
 *   song,                         // Music song description
 *   steps: [{ title, text, art }] // tutorial; art is an inline SVG string
 *   unit,                         // '' or ' m'
 *   start(seed),                  // begin a run on a seed (or random when undefined)
 *   score(),                      // current run score
 *   seed(),                       // current run seed
 *   revive(),                     // resume the run after a rewarded ad → true if it did
 *   over: '#over', retry: '#retry', title: '#title',   // selectors
 *   audioContext(),               // () => AudioContext|null (after the game unlocked audio)
 *   titleTap(),                   // called when the player taps the title screen itself (logo, hint, empty space)
 *   sfx,                          // the game's Sfx (optional): its sounds duck the music
 * })
 * Returns { music, beforeStart(cb), onOver(score, { isBest }), onStart(), onTitle(), unlock(), challenge }
 */
import { Music } from './music.js';
import { ads } from './ads.js';
import { newSeed, cleanTag, challengeLink, challengeFromUrl } from './challenge.js';
import { shareLink } from './share.js';
import { attachPause } from './pause.js';

const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const fmt = (n, unit) => (unit === ' m' ? (Math.round(n * 10) / 10).toFixed(1) : String(Math.round(n))) + unit;
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export function attachExtras(o) {
  const over = document.querySelector(o.over), title = document.querySelector(o.title), retry = document.querySelector(o.retry);
  const panel = over.querySelector('.panel') || over;
  const music = new Music(o.song);
  const pause = attachPause({ onChange: (p) => { if (music.master && music.ctx) music.master.gain.setTargetAtTime(p || music.muted ? 0 : music.volume, music.ctx.currentTime, 0.05); } });
  if (o.sfx) o.sfx.onSound = () => music.duck();
  // the hub tells us it is about to close the game: fade the song instead of cutting it
  window.addEventListener('message', (e) => { if (e.data && e.data.type === 'gamebox:leaving') music.stop(0.12); });
  const state = { challenge: null, incoming: null, usedContinue: false, lastScore: 0 };
  const tag = () => cleanTag(LS.get('skip.name', 'YOU'));     // one tag for the whole box

  /* ─── result sheet buttons ─── */
  const cont = el(`<button class="btn continue-btn" type="button" hidden>Continue · watch an ad</button>`);
  const chal = el(`<button class="btn" type="button">Challenge a friend</button>`);
  const versus = el(`<div class="versus" hidden></div>`);
  const yearNow = new Date().getFullYear();
  const age = el(`<div class="age-ask" hidden><small>One quick question so any ads suit your age</small><div class="age-row"><label><span class="sr">Year you were born</span><select aria-label="Year you were born"><option value="">Year you were born</option>${Array.from({ length: 100 }, (_, i) => `<option>${yearNow - i}</option>`).join('')}</select></label><button class="btn small" type="button" disabled>OK</button></div></div>`);
  if (!panel.querySelector('.versus')) panel.insertBefore(versus, retry);
  panel.insertBefore(cont, retry.nextSibling);        // outline, under Play again: the ad is an offer, not the main action
  panel.insertBefore(age, cont.nextSibling);
  panel.insertBefore(chal, cont.nextSibling);

  /* ─── challenge banner on the title ─── */
  const banner = el(`<div class="banner" hidden><div class="banner-text"><b></b><small></small></div><button class="btn primary small" type="button">Accept</button></div>`);
  title.insertBefore(banner, title.children[1] || null);

  function readIncoming() {
    const c = challengeFromUrl(location.href); if (!c) return;
    state.incoming = c;
    const b = banner.querySelector('b'), s = banner.querySelector('small'), btn = banner.querySelector('button');
    if (c.reply) { const win = c.score > c.reply.score; b.textContent = win ? `${c.reply.tag} fell short: ${fmt(c.reply.score, o.unit)}` : `${c.reply.tag} beat you: ${fmt(c.reply.score, o.unit)}`; s.textContent = `vs your ${fmt(c.score, o.unit)} · rematch?`; btn.textContent = 'Rematch'; }
    else { b.textContent = `${c.tag} challenges you`; s.textContent = `${fmt(c.score, o.unit)} on the same run`; btn.textContent = 'Accept'; }
    banner.hidden = false;
    history.replaceState(null, '', location.pathname + location.search);
  }
  banner.querySelector('button').addEventListener('click', () => {
    const c = state.incoming; if (!c) return;
    state.challenge = c.reply ? { seed: c.seed, tag: c.reply.tag, score: c.reply.score } : { seed: c.seed, tag: c.tag, score: c.score };
    banner.hidden = true;
    beforeStart(() => o.start(c.seed));
  });

  async function share() {
    const score = state.lastScore;
    const c = state.challenge ? { seed: state.challenge.seed, score: state.challenge.score, tag: state.challenge.tag, reply: { score, tag: tag() } } : { seed: o.seed(), score, tag: tag() };
    const url = challengeLink(o.id, c);
    const text = state.challenge ? `I scored ${fmt(score, o.unit)} on your ${o.name} run. ${score > state.challenge.score ? 'Beat that.' : 'You win this one.'}` : `Beat my ${fmt(score, o.unit)} in ${o.name}. Same run, same luck:`;
    await shareLink({ title: `${o.name} challenge`, text, url }, { toast });
  }
  chal.addEventListener('click', share);

  /* ─── continue ─── */
  cont.addEventListener('click', async () => {
    cont.disabled = true;
    const ok = await ads.show();
    cont.disabled = false;
    if (ok && o.revive()) { state.usedContinue = true; cont.hidden = true; music.setMode('play'); }
  });
  ads.onChange(() => refreshContinue());
  const runs = () => LS.get(`${o.id}.games`, 0) || 0;     // no ad offer in the first three runs: learn first, then the bridge
  function refreshContinue() {
    const offer = !state.usedContinue && typeof o.revive === 'function' && over && !over.hidden && runs() >= 3;
    age.hidden = !(offer && ads.needsAge);            // asked once, before any ad is ever requested (COPPA)
    cont.hidden = !(offer && ads.available);
  }
  const ageSel = age.querySelector('select'), ageOk = age.querySelector('button');
  ageSel.addEventListener('change', () => { ageOk.disabled = !ageSel.value; });
  ageOk.addEventListener('click', () => { if (!ageSel.value) return; ads.setBirthYear(ageSel.value); age.hidden = true; toast('Thanks · ad settings saved'); });

  /* ─── title: taps on the logo / hint / empty space start the game; a ? button replays the tutorial ─── */
  if (o.titleTap) title.addEventListener('pointerdown', (e) => { if (e.target.closest('button, input, select, a, .banner')) return; e.preventDefault(); o.titleTap(); }, { passive: false });
  const help = el(`<button class="icon-btn corner-btn help-btn" type="button" data-ui aria-label="How to play"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/></svg></button>`);
  document.body.appendChild(help);
  help.addEventListener('click', () => showTutorial(() => {}, false));

  /* ─── tutorial ─── */
  const seen = () => (LS.get('gamebox.tutorials', {}) || {})[o.id];
  function showTutorial(done, mark = true) {
    if (document.querySelector('.tutorial')) return;
    let i = 0;
    const wrap = el(`<section class="overlay menu tutorial" data-ui><div class="panel"><div class="tut-dots"></div><div class="tut-art"></div><b class="tut-title"></b><p class="tut-text"></p><button class="btn primary big" type="button">Next</button><button class="btn skip-tut" type="button">Skip</button></div></section>`);
    document.body.appendChild(wrap);
    const dots = wrap.querySelector('.tut-dots'), art = wrap.querySelector('.tut-art'), t = wrap.querySelector('.tut-title'), p = wrap.querySelector('.tut-text'), next = wrap.querySelector('.btn.primary');
    const render = () => { const s = o.steps[i]; dots.innerHTML = o.steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join(''); art.innerHTML = s.art || ''; t.textContent = s.title; p.textContent = s.text; next.textContent = i === o.steps.length - 1 ? 'Play' : 'Next'; };
    const finish = () => { if (mark) { const all = LS.get('gamebox.tutorials', {}) || {}; all[o.id] = true; LS.set('gamebox.tutorials', all); } wrap.remove(); done(); };
    next.addEventListener('click', () => { if (i < o.steps.length - 1) { i++; render(); } else finish(); });
    wrap.querySelector('.skip-tut').addEventListener('click', finish);
    render();
  }
  /** Start straight away: first-run teaching happens in the run (coach marks), never as a slideshow. */
  function beforeStart(cb) { if (!seen()) { const all = LS.get('gamebox.tutorials', {}) || {}; all[o.id] = true; LS.set('gamebox.tutorials', all); } cb(); }

  /* ─── coach marks: one line, at the moment it matters, once per player ─── */
  const coachEl = el(`<div class="coach" role="status" aria-live="polite" hidden><span class="coach-dot" aria-hidden="true"></span><b></b></div>`);
  document.body.appendChild(coachEl);
  const coachSeen = () => LS.get('gamebox.coach', {}) || {};
  let coachKey = null, coachT = 0;
  /** Show `text` once per player for this key; it stays until coachDone(key) or `ms`. Returns true when shown. */
  function coach(key, text, { ms = 6000, at = 0.64 } = {}) {
    const k = `${o.id}.${key}`; if (coachSeen()[k] || coachKey === k) return false;
    coachKey = k; coachEl.querySelector('b').textContent = text; coachEl.style.top = `${Math.round(at * 100)}%`; coachEl.hidden = false;
    clearTimeout(coachT); coachT = setTimeout(() => coachDone(key), ms); return true;
  }
  function coachDone(key) {
    const k = `${o.id}.${key}`; const all = coachSeen(); if (!all[k]) { all[k] = true; LS.set('gamebox.coach', all); }
    if (coachKey === k) { coachKey = null; coachEl.hidden = true; clearTimeout(coachT); }
  }

  /* ─── toast ─── */
  function toast(text) { let t = document.getElementById('toast'); if (!t) { t = el(`<div id="toast" class="toast" hidden></div>`); document.body.appendChild(t); } t.textContent = text; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2200); }

  /* ─── lifecycle hooks the game calls ─── */
  const api = {
    music, pause, get paused() { return pause.paused; }, challenge: state, toast, beforeStart, showTutorial: () => showTutorial(() => {}, false), share, coach, coachDone,
    unlock() { const ctx = o.audioContext(); if (ctx) { music.attach(ctx); music.start(); } },
    onTitle() { music.setMode('title'); if (coachKey) { coachEl.hidden = true; coachKey = null; } },
    onStart(seed) { state.usedContinue = false; if (seed === undefined) state.challenge = null; cont.hidden = true; versus.hidden = true; music.setMode('play'); },
    onOver(score, info = {}) {
      state.lastScore = score; music.setMode('over'); if (coachKey) { coachEl.hidden = true; coachKey = null; }
      if (info.isBest && score > 0) { if (o.sfx && o.sfx.newBest) o.sfx.newBest(); else music.stingBest(); } else music.stingOver();
      if (state.challenge) { const d = score - state.challenge.score; versus.textContent = d > 0 ? `You beat ${state.challenge.tag} by ${fmt(d, o.unit)}` : d < 0 ? `${state.challenge.tag} wins by ${fmt(-d, o.unit)}` : `Dead heat with ${state.challenge.tag}`; versus.hidden = false; chal.textContent = 'Send result'; }
      else { versus.hidden = true; chal.textContent = 'Challenge a friend'; }
      requestAnimationFrame(refreshContinue);
    },
    setMuted(m) { music.setMuted(m); },
    hudTarget() { return state.challenge ? `Beat ${state.challenge.tag} · ${fmt(state.challenge.score, o.unit)}` : ''; },
    currentSeed() { return state.challenge ? state.challenge.seed : undefined; },
    newSeed,
  };
  // box-wide sound setting is stored per game as <id>.muted; respect it at attach time
  readIncoming();
  return api;
}
