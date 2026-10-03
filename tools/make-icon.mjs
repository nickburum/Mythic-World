/**
 * Generates art/icon.svg — the app icon — from the same isometric projection
 * and palette the game uses, so the icon always matches the in-game look.
 * Run: node tools/make-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { stoneColors } from '../src/core/palette.js';

const S = 1024;              // canvas
const K = 150;               // px per world unit
const CX = S / 2, CY = 640;  // screen anchor for world (0, 0, 0)
const SEED_HUE = 10;         // warm coral stones pop against the blue sky

const P = (x, y, z) => [CX + (x - z) * K, CY + (x + z) * K * 0.5 - y * K];
const poly = (pts, fill, extra = '') =>
  `<polygon points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;

function block(b, col, extra = '') {
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, y0 = b.y, y1 = b.y + b.h;
  const tA = P(x0, y1, z0), tB = P(x1, y1, z0), tC = P(x1, y1, z1), tD = P(x0, y1, z1);
  const bB = P(x1, y0, z0), bC = P(x1, y0, z1), bD = P(x0, y0, z1);
  return [
    poly([tB, tC, bC, bB], col.right, extra),
    poly([tD, tC, bC, bD], col.left, extra),
    poly([tA, tB, tC, tD], col.top, extra),
    `<polyline points="${[tB, tC, tD].map(p => p.join(',')).join(' ')}" fill="none" stroke="${col.edge}" stroke-width="4" stroke-linejoin="round"/>`,
  ].join('\n');
}

const H = 0.34;
const marble = { top: 'hsl(40 20% 93%)', right: 'hsl(40 18% 78%)', left: 'hsl(40 16% 66%)', edge: 'hsl(45 90% 70% / 0.9)' };
const stones = [
  { x: 0, z: 0, w: 1.0, d: 1.0, y: 0 * H, h: H },
  { x: 0.05, z: 0, w: 0.9, d: 1.0, y: 1 * H, h: H },
  { x: 0.05, z: -0.06, w: 0.9, d: 0.88, y: 2 * H, h: H },
  { x: 0.05, z: -0.06, w: 0.9, d: 0.88, y: 3 * H, h: H },
];

let body = '';
// plinth
body += block({ x: 0, z: 0, w: 1.0, d: 1.0, y: -3, h: 3 }, marble);
// gold band
const band = { x: 0, z: 0, w: 1.0, d: 1.0, y: -0.26, h: 0.12 };
body += block(band, { top: 'hsl(45 85% 60%)', right: 'hsl(45 85% 58%)', left: 'hsl(45 80% 46%)', edge: 'none' }).split('\n').slice(0, 2).join('\n');
stones.forEach((b, i) => { body += block(b, stoneColors(i + 1, SEED_HUE)); });

// glow ring around top stone
const top = stones[stones.length - 1];
const inf = 0.12;
const ring = [P(top.x - top.w / 2 - inf, top.y + top.h, top.z - top.d / 2 - inf), P(top.x + top.w / 2 + inf, top.y + top.h, top.z - top.d / 2 - inf),
  P(top.x + top.w / 2 + inf, top.y + top.h, top.z + top.d / 2 + inf), P(top.x - top.w / 2 - inf, top.y + top.h, top.z + top.d / 2 + inf)];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(208 72% 56%)"/>
      <stop offset="0.65" stop-color="hsl(200 70% 72%)"/>
      <stop offset="1" stop-color="hsl(28 90% 84%)"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff6d6" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff6d6" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <clipPath id="rounded"><rect width="${S}" height="${S}" rx="0"/></clipPath>
  </defs>
  <g clip-path="url(#rounded)">
    <rect width="${S}" height="${S}" fill="url(#sky)"/>
    <circle cx="760" cy="240" r="260" fill="url(#sun)"/>
    <g fill="#ffffff" opacity="0.95">
      <ellipse cx="200" cy="330" rx="120" ry="52"/><circle cx="150" cy="300" r="62"/><circle cx="235" cy="285" r="78"/>
      <ellipse cx="860" cy="470" rx="110" ry="46"/><circle cx="820" cy="440" r="56"/><circle cx="895" cy="432" r="66"/>
      <ellipse cx="300" cy="880" rx="190" ry="70"/><circle cx="240" cy="840" r="80"/><circle cx="350" cy="820" r="100"/>
      <ellipse cx="800" cy="920" rx="170" ry="60"/><circle cx="760" cy="880" r="72"/><circle cx="860" cy="870" r="86"/>
    </g>
    <polygon points="${ring.map(p => p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-width="22" opacity="0.8" filter="url(#glow)"/>
${body}
    <polygon points="${ring.map(p => p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-width="7" opacity="0.95" stroke-linejoin="round"/>
  </g>
</svg>
`;
mkdirSync('art', { recursive: true });
writeFileSync('art/icon.svg', svg);
console.log('wrote art/icon.svg');
