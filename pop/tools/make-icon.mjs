import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024;
const bubble = (x, y, r, h) => `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${h} 85% 65% / 0.55)" stroke="hsl(${h} 90% 85%)" stroke-width="${r * 0.09}"/><ellipse cx="${x - r * 0.38}" cy="${y - r * 0.42}" rx="${r * 0.22}" ry="${r * 0.13}" transform="rotate(-40 ${x - r * 0.38} ${y - r * 0.42})" fill="rgba(255,255,255,.9)"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(340 45% 16%)"/><stop offset="1" stop-color="hsl(20 50% 26%)"/></linearGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  ${bubble(300, 700, 150, 200)}${bubble(720, 640, 120, 150)}${bubble(560, 360, 230, 340)}${bubble(250, 300, 110, 42)}${bubble(800, 260, 90, 270)}
  <g stroke="#fff" stroke-width="22" stroke-linecap="round" opacity=".9"><path d="M560 60 L560 130"/><path d="M820 160 L870 110"/><path d="M300 110 L250 70"/></g>
</svg>`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
