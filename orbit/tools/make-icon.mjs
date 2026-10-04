import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024, cx = 512, cy = 512, R = 330;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs><radialGradient id="bg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="hsl(232 45% 20%)"/><stop offset="1" stop-color="#05070f"/></radialGradient>
  <radialGradient id="star" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="rgba(185,140,255,.6)"/><stop offset="1" stop-color="rgba(185,140,255,0)"/></radialGradient>
  <radialGradient id="comet" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="rgba(125,240,255,.7)"/><stop offset="1" stop-color="rgba(125,240,255,0)"/></radialGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="110" fill="url(#star)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(125,240,255,.25)" stroke-width="22"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(125,240,255,.8)" stroke-width="5"/>
  <path d="M ${cx + R * Math.cos(0.3)} ${cy + R * Math.sin(0.3)} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(1.1)} ${cy + R * Math.sin(1.1)}" fill="none" stroke="#ff5a6e" stroke-width="54" stroke-linecap="round"/>
  <path d="M ${cx + R * Math.cos(-2.6)} ${cy + R * Math.sin(-2.6)} A ${R} ${R} 0 0 0 ${cx + R * Math.cos(-1.4)} ${cy + R * Math.sin(-1.4)}" fill="none" stroke="rgba(125,240,255,.55)" stroke-width="40" stroke-linecap="round"/>
  <circle cx="${cx + R * Math.cos(-1.4)}" cy="${cy + R * Math.sin(-1.4)}" r="95" fill="url(#comet)"/>
  <circle cx="${cx + R * Math.cos(-1.4)}" cy="${cy + R * Math.sin(-1.4)}" r="30" fill="#fff"/>
  <g transform="translate(${cx + R * Math.cos(2.2)} ${cy + R * Math.sin(2.2)}) rotate(20)"><path d="M0 -42 L30 0 L0 42 L-30 0 Z" fill="#ffe66b"/><path d="M0 -20 L14 0 L0 20 L-14 0 Z" fill="#fff8d0"/></g>
</svg>`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
