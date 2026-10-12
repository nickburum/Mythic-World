/**
 * Game Box — level rewards. Every level from 2 to 17 unlocks a look for one
 * game (meta.js UNLOCKS). A look is a colour grade applied to the game's
 * canvas: it never changes gameplay, and POP's looks keep hues intact (its
 * colours are the rules). Equipped looks: gamebox.themes { game: theme }.
 */
import { UNLOCKS, level, nextUnlock } from './meta.js';
import { GAMES } from './games.js';

export const LOOKS = {
  skip: { midnight: 'hue-rotate(200deg) brightness(.85)', dawn: 'hue-rotate(-25deg) saturate(1.2)', aurora: 'hue-rotate(110deg) saturate(1.3)' },
  melt: { ember: 'hue-rotate(150deg) saturate(1.2)', neon: 'saturate(1.6) contrast(1.1)', mono: 'grayscale(1) contrast(1.15)' },
  pop: { candy: 'saturate(1.35) brightness(1.05)', ink: 'contrast(1.18) brightness(.9)', sunlit: 'brightness(1.12) saturate(1.15)' },
  orbit: { solar: 'hue-rotate(160deg)', nebula: 'hue-rotate(80deg) saturate(1.3)', retro: 'sepia(.6) saturate(1.4)' },
  'sky-temple': { dusk: 'hue-rotate(-30deg) saturate(1.1) brightness(.92)', jade: 'hue-rotate(120deg)', marble: 'saturate(.35) brightness(1.08)' },
  box: { ivory: 'hue-rotate(200deg) saturate(1.4)' },
};
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const gameName = (id) => id === 'box' ? 'Game Box' : (GAMES.find(g => g.id === id) || { name: id }).name;

export const playerLevel = () => level(LS.get('gamebox.xp', 0) || 0).level;
/** Looks a game has unlocked at the player's level (always including 'default'). */
export const looksFor = (game, L = playerLevel()) => ['default', ...UNLOCKS.filter(u => u.game === game && u.level <= L).map(u => u.theme)];
export const equipped = (game) => (LS.get('gamebox.themes', {}) || {})[game] || 'default';
export function equip(game, theme) { const all = LS.get('gamebox.themes', {}) || {}; all[game] = theme; LS.set('gamebox.themes', all); applyLook(game); }
/** Apply the equipped look to this page's game canvas (or the hub backdrop for 'box'). */
export function applyLook(game) {
  const t = equipped(game), f = (LOOKS[game] || {})[t] || '';
  const el = game === 'box' ? document.querySelector('.bg') : document.getElementById('game');
  if (el) el.style.filter = f;
}
/** Unlocks earned between two levels (for the level-up pill). */
export const unlocksBetween = (from, to) => UNLOCKS.filter(u => u.level > from && u.level <= to).map(u => ({ ...u, gameName: gameName(u.game) }));
export function nextLine(L = playerLevel()) { const n = nextUnlock(L); return n ? `Next: ${gameName(n.game)} ${n.name} · LV ${n.level}` : 'Every look unlocked'; }
export { gameName };
