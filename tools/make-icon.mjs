/** Generates art/icon.svg — the Game Box icon: five game tiles in a box. */
import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024;
const tiles = [
  { x: 192, y: 192, c1: '#3aa7ff', c2: '#1a63ad' },  // melt
  { x: 592, y: 192, c1: '#ffb36b', c2: '#c0592a' },  // skip
  { x: 192, y: 592, c1: '#ff7ab6', c2: '#b4347b' },  // pop
  { x: 592, y: 592, c1: '#7df0ff', c2: '#2e7fa8' },  // orbit
];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2b52"/><stop offset="1" stop-color="#0b1020"/></linearGradient>
    ${tiles.map((t, i) => `<linearGradient id="t${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>`).join('\n')}
    <linearGradient id="t4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a5b"/><stop offset="1" stop-color="#4ea3ff"/></linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  ${tiles.map((t, i) => `<rect x="${t.x}" y="${t.y}" width="240" height="240" rx="56" fill="url(#t${i})"/><rect x="${t.x + 22}" y="${t.y + 22}" width="70" height="70" rx="22" fill="rgba(255,255,255,.45)"/>`).join('\n')}
  <circle cx="512" cy="512" r="150" fill="#0f1628" stroke="rgba(255,255,255,.25)" stroke-width="10"/>
  <rect x="392" y="392" width="240" height="240" rx="120" fill="url(#t4)"/>
  <path d="M478 450 L580 512 L478 574 Z" fill="#fff"/>
</svg>
`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
