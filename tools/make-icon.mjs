/**
 * Generates art/icon.svg — the Game Box icon (the one the App Store shows):
 * four glossy game tiles in a 2×2 block, each stamped with its game's
 * silhouette (droplet, bubble, ring, tower). No play button, no disc.
 * Style guide: docs/review/artist1.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024, T = 300, GAP = 64, X0 = (S - (2 * T + GAP)) / 2;
const at = (i) => ({ x: X0 + (i % 2) * (T + GAP), y: X0 + Math.floor(i / 2) * (T + GAP) });
const tiles = [
  { c1: '#5ab8ff', c2: '#1a63ad', mark: (cx, cy) => `<path d="M${cx} ${cy - 92} C ${cx + 34} ${cy - 40} ${cx + 82} ${cy - 6} ${cx + 82} ${cy + 40} C ${cx + 82} ${cy + 86} ${cx + 44} ${cy + 106} ${cx} ${cy + 106} C ${cx - 44} ${cy + 106} ${cx - 82} ${cy + 86} ${cx - 82} ${cy + 40} C ${cx - 82} ${cy - 6} ${cx - 34} ${cy - 40} ${cx} ${cy - 92} Z" fill="#fff" fill-opacity=".72"/>` },   // MELT droplet
  { c1: '#ff7ab0', c2: '#c22a6c', mark: (cx, cy) => `<circle cx="${cx}" cy="${cy + 6}" r="84" fill="#fff" fill-opacity=".72"/><ellipse cx="${cx - 30}" cy="${cy - 28}" rx="22" ry="13" transform="rotate(-40 ${cx - 30} ${cy - 28})" fill="#c22a6c" fill-opacity=".5"/>` },   // POP bubble
  { c1: '#8ff3ff', c2: '#2e8fb8', mark: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="78" fill="none" stroke="#fff" stroke-opacity=".78" stroke-width="30"/><circle cx="${cx + 55}" cy="${cy - 55}" r="26" fill="#fff"/>` },   // ORBIT ring + comet
  { c1: '#ffb07a', c2: '#d4602e', mark: (cx, cy) => [0, 1, 2, 3].map(k => `<rect x="${cx - 70 + k * 6}" y="${cy + 70 - k * 44}" width="${140 - k * 12}" height="36" rx="8" fill="#fff" fill-opacity="${0.6 + k * 0.08}"/>`).join('') },   // SKY TEMPLE tower
];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2b52"/><stop offset="1" stop-color="#0b1020"/></linearGradient>
    <radialGradient id="glow" cx="512" cy="512" r="440" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7df0ff" stop-opacity=".18"/><stop offset="1" stop-color="#7df0ff" stop-opacity="0"/></radialGradient>
    ${tiles.map((t, i) => `<linearGradient id="t${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>`).join('\n    ')}
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="440" fill="url(#glow)"/>
  ${tiles.map((t, i) => { const { x, y } = at(i), cx = x + T / 2, cy = y + T / 2; return `<g><rect x="${x}" y="${y + 10}" width="${T}" height="${T}" rx="66" fill="#000" fill-opacity=".28"/><rect x="${x}" y="${y}" width="${T}" height="${T}" rx="66" fill="url(#t${i})"/><rect x="${x + 6}" y="${y + 6}" width="${T - 12}" height="${T - 12}" rx="60" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="10"/><rect x="${x + 28}" y="${y + 26}" width="78" height="56" rx="22" fill="#fff" fill-opacity=".38"/>${t.mark(cx, cy)}</g>`; }).join('\n  ')}
</svg>
`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
