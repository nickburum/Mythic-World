/** MELT icon: three states on a centre axis — ice, water, steam — minimal and symmetric. */
import { writeFileSync, mkdirSync } from 'node:fs';
const S = 1024, cx = 512;
const drop = (x, y, r) => `M ${x} ${y - r * 1.45} C ${x + r * 0.2} ${y - r * 0.9}, ${x + r} ${y - r * 0.5}, ${x + r} ${y + r * 0.15} A ${r} ${r} 0 1 1 ${x - r} ${y + r * 0.15} C ${x - r} ${y - r * 0.5}, ${x - r * 0.2} ${y - r * 0.9}, ${x} ${y - r * 1.45} Z`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b52"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <line x1="${cx}" y1="150" x2="${cx}" y2="874" stroke="rgba(255,255,255,.18)" stroke-width="4"/>
  <rect x="${cx - 95}" y="160" width="190" height="190" rx="40" fill="#bdf0ff"/>
  <rect x="${cx - 60}" y="195" width="60" height="60" rx="18" fill="rgba(255,255,255,.7)"/>
  <path d="${drop(cx, 540, 118)}" fill="#3aa7ff"/>
  <ellipse cx="${cx - 48}" cy="520" rx="22" ry="40" transform="rotate(-20 ${cx - 48} 520)" fill="rgba(255,255,255,.7)"/>
  <g fill="#f6f8ff"><circle cx="${cx - 70}" cy="800" r="62"/><circle cx="${cx + 70}" cy="800" r="62"/><circle cx="${cx}" cy="760" r="78"/></g>
</svg>`;
mkdirSync('art', { recursive: true }); writeFileSync('art/icon.svg', svg); console.log('wrote art/icon.svg');
