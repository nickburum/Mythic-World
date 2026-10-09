/** Generates art/icon.svg — the SKIP app icon: a stone mid-skip over a sunset lake. */
import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024, W = 600; // water line
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(222 60% 46%)"/><stop offset=".6" stop-color="hsl(28 90% 70%)"/><stop offset="1" stop-color="hsl(18 95% 60%)"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(18 90% 60%)"/><stop offset=".3" stop-color="hsl(24 70% 50%)"/><stop offset="1" stop-color="hsl(222 55% 22%)"/></linearGradient>
    <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset="1" stop-color="#ffb36b" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${S}" height="${W}" fill="url(#sky)"/>
  <circle cx="700" cy="330" r="330" fill="url(#sun)"/>
  <circle cx="700" cy="330" r="92" fill="#fff0c0"/>
  <path d="M0 ${W} L0 470 Q120 380 240 440 Q330 480 420 400 Q520 320 640 420 Q760 500 860 430 Q950 380 1024 440 L1024 ${W} Z" fill="hsl(262 30% 58%)"/>
  <path d="M0 ${W} L0 520 Q150 470 300 520 Q420 560 560 500 Q700 440 840 510 Q940 560 1024 520 L1024 ${W} Z" fill="hsl(258 30% 36%)"/>
  <rect y="${W}" width="${S}" height="${S - W}" fill="url(#water)"/>
  <g opacity=".35"><path d="M0 ${W} L0 ${W + 70} Q150 ${W + 40} 300 ${W + 70} Q420 ${W + 100} 560 ${W + 50} Q700 ${W} 840 ${W + 60} Q940 ${W + 100} 1024 ${W + 70} L1024 ${W} Z" fill="hsl(258 30% 30%)"/></g>
  <g fill="#fff3c4" opacity=".55"><rect x="660" y="${W + 14}" width="80" height="6" rx="3"/><rect x="640" y="${W + 40}" width="120" height="6" rx="3"/><rect x="610" y="${W + 72}" width="180" height="7" rx="3"/><rect x="580" y="${W + 115}" width="240" height="8" rx="4"/><rect x="540" y="${W + 170}" width="320" height="9" rx="4"/><rect x="500" y="${W + 240}" width="400" height="10" rx="5"/></g>
  <g fill="none" stroke="#fff" stroke-opacity=".8"><ellipse cx="300" cy="${W + 6}" rx="150" ry="34" stroke-width="10"/><ellipse cx="300" cy="${W + 6}" rx="90" ry="20" stroke-width="8"/><ellipse cx="560" cy="${W + 4}" rx="60" ry="14" stroke-width="7" stroke-opacity=".5"/></g>
  <path d="M300 ${W - 10} Q380 ${W - 230} 470 ${W - 190} Q520 ${W - 170} 560 ${W - 10}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-dasharray="2 26" stroke-linecap="round"/>
  <g transform="translate(470 ${W - 190}) rotate(-18)"><ellipse cx="6" cy="8" rx="78" ry="48" fill="#3f4752"/><ellipse rx="78" ry="48" fill="#5f6975"/><ellipse cx="-20" cy="-12" rx="42" ry="22" fill="#8c96a3"/></g>
  <g transform="translate(470 ${W + 150}) rotate(18) scale(1 .6)" opacity=".35"><ellipse rx="78" ry="48" fill="#1b2a44"/></g>
</svg>
`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
