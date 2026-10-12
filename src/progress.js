/**
 * Game Box — box-wide progress, on top of the pure rules in meta.js:
 * XP and level from every run in every game, and a daily run (one game, one
 * seed, the same for everyone that day) that keeps a streak.
 *
 * Storage (all synced to iCloud by cloud.js): gamebox.xp, gamebox.runs,
 * gamebox.daily { date, game, seed, best, attempts, done }, gamebox.streak
 * { count, best, last, shield }, gamebox.days [date keys].
 */
import { level, runXp, dailyFor, dateKey, advanceStreak, streakAlive, daysBetween } from './meta.js';

const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

/** Everything the hub needs to draw the progress strip and the Today card. */
export function readProgress(now = new Date()) {
  const xp = LS.get('gamebox.xp', 0) || 0, today = dateKey(now), d = dailyFor(today), saved = LS.get('gamebox.daily', null);
  const streak = LS.get('gamebox.streak', null), days = LS.get('gamebox.days', []) || [];
  const done = !!(saved && saved.date === today && saved.done);
  const week = Array.from({ length: 7 }, (_, i) => { const dt = new Date(now); dt.setDate(dt.getDate() - (6 - i)); const k = dateKey(dt); return { key: k, played: days.includes(k), today: k === today }; });
  return { xp, lvl: level(xp), today, daily: { ...d, done, best: saved && saved.date === today ? saved.best || 0 : 0 }, streak: streak && streakAlive(streak, today) ? streak.count : 0, shield: !!(streak && streak.shield), week };
}

/** Is this page a link to today's run for `gameId`? (#d=YYYY-MM-DD) → { date, seed } or null. */
export function dailyFromHref(gameId, href, now = new Date()) {
  let key = null;
  try { const u = new URL(href); key = new URLSearchParams(u.hash.replace(/^#/, '')).get('d') || u.searchParams.get('d'); } catch { return null; }
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key) || key !== dateKey(now)) return null;
  const d = dailyFor(key);
  return d.game === gameId ? { date: d.date, seed: d.seed } : null;
}

/**
 * Credit a finished run. `daily` is { date, seed } when the run was today's daily.
 * Returns the award for the result sheet: { total, base, best, daily, weekend, before, after, leveledUp, streak, firstDaily }.
 */
export function awardRun(gameId, { score = 0, distance, isBest = false, daily = null, stats = {}, continued = false } = {}, now = new Date()) {
  let dailyInfo = null, streakCount = 0;
  if (daily && daily.date === dateKey(now)) {
    const saved = LS.get('gamebox.daily', null);
    const first = !(saved && saved.date === daily.date && saved.done);
    const primary = distance !== undefined ? distance : score;
    if (primary > 0) {
      let st = LS.get('gamebox.streak', null);
      if (first) { st = advanceStreak(st, daily.date); delete st.changed; delete st.shieldSpent; LS.set('gamebox.streak', st); const days = LS.get('gamebox.days', []) || []; if (!days.includes(daily.date)) { days.push(daily.date); LS.set('gamebox.days', days.sort().slice(-90)); } }
      streakCount = (st && st.count) || 1;
      LS.set('gamebox.daily', { date: daily.date, game: gameId, seed: daily.seed, best: Math.max(primary, (saved && saved.date === daily.date && saved.best) || 0), attempts: ((saved && saved.date === daily.date && saved.attempts) || 0) + 1, done: true, claimed: true });
      dailyInfo = { first, streak: streakCount };
    }
  }
  const award = runXp(gameId, { score, distance, isBest, daily: dailyInfo, ...stats }, now);
  const xp0 = LS.get('gamebox.xp', 0) || 0, before = level(xp0), after = level(xp0 + award.total);
  if (award.total > 0) LS.set('gamebox.xp', xp0 + award.total);
  if (!continued) LS.set('gamebox.runs', (LS.get('gamebox.runs', 0) || 0) + 1);
  return { ...award, before, after, leveledUp: after.level > before.level, streak: streakCount, firstDaily: !!(dailyInfo && dailyInfo.first) };
}

/** The result-sheet block: "+86 XP", a level bar, level-up and daily lines. */
export function xpBlock(award) {
  const el = document.createElement('div'); el.className = 'xp-block';
  if (!award || award.total <= 0) { el.hidden = true; return el; }
  const L = award.after, pct = L.need ? Math.round(100 * L.into / L.need) : 100;
  const parts = [award.base && `${award.base} run`, award.best && `${award.best} best`, award.daily && `${award.daily} daily`, award.weekend && `${award.weekend} weekend`].filter(Boolean).join(' · ');
  el.innerHTML = `<div class="xp-top"><b class="xp-gain">+${award.total} XP</b><span class="xp-lv">LV ${L.level}</span></div>
    <div class="xp-bar" role="progressbar" aria-label="Level ${L.level} progress" aria-valuemin="0" aria-valuemax="${L.need}" aria-valuenow="${L.into}"><i style="--to:${pct}%"></i></div>
    <small class="xp-parts">${parts}</small>
    ${award.leveledUp ? `<div class="level-up">Level ${L.level}!</div>` : ''}
    ${award.firstDaily ? `<div class="daily-done">Today's run done · ${award.streak}-day streak</div>` : ''}`;
  return el;
}

/** "3 short of your best" — the one-more-run line. */
export function closeLine(score, best, unit = '') {
  if (!best || score >= best || score <= 0) return '';
  const gap = best - score, fmt = unit ? (Math.round(gap * 10) / 10).toFixed(1) + unit : String(Math.round(gap));
  return gap / best <= 0.25 ? `So close · ${fmt} short of your best` : `${fmt} short of your best`;
}
export { daysBetween };
