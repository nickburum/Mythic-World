/**
 * Generates art/icon.svg — the MELT app icon: the water-drop hero with a
 * thermometer, on a cold-to-hot gradient. Run: node tools/make-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const S = 1024;
const cx = 560, cy = 560, R = 230;
const drop = `M ${cx} ${cy - R * 1.45}
  C ${cx + R * 0.2} ${cy - R * 0.9}, ${cx + R} ${cy - R * 0.5}, ${cx + R} ${cy + R * 0.15}
  A ${R} ${R} 0 1 1 ${cx - R} ${cy + R * 0.15}
  C ${cx - R} ${cy - R * 0.5}, ${cx - R * 0.2} ${cy - R * 0.9}, ${cx} ${cy - R * 1.45} Z`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(214 60% 22%)"/>
      <stop offset="0.5" stop-color="hsl(200 62% 40%)"/>
      <stop offset="1" stop-color="hsl(22 85% 52%)"/>
    </linearGradient>
    <linearGradient id="merc" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#9fe3ff"/><stop offset="0.5" stop-color="#3aa7ff"/><stop offset="1" stop-color="#ff8a5b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="420" fill="url(#glow)"/>

  <!-- thermometer -->
  <rect x="150" y="190" width="92" height="640" rx="46" fill="rgba(0,0,0,0.38)"/>
  <rect x="172" y="300" width="48" height="470" rx="24" fill="url(#merc)"/>
  <circle cx="196" cy="790" r="66" fill="#ff8a5b"/>
  <circle cx="176" cy="770" r="16" fill="rgba(255,255,255,0.55)"/>
  <rect x="140" y="420" width="112" height="10" rx="5" fill="rgba(255,255,255,0.75)"/>
  <rect x="140" y="580" width="112" height="10" rx="5" fill="rgba(255,255,255,0.75)"/>

  <!-- drop -->
  <path d="${drop}" fill="#1f7fd6" transform="translate(0,16)"/>
  <path d="${drop}" fill="#3aa7ff" transform="translate(${cx} ${cy}) scale(0.9) translate(${-cx} ${-cy})"/>
  <ellipse cx="${cx - R * 0.42}" cy="${cy - R * 0.05}" rx="38" ry="70" transform="rotate(-20 ${cx - R * 0.42} ${cy - R * 0.05})" fill="rgba(255,255,255,0.75)"/>

  <!-- face -->
  <ellipse cx="${cx - 40}" cy="${cy - 10}" rx="46" ry="52" fill="#fff"/>
  <ellipse cx="${cx + 120}" cy="${cy - 10}" rx="46" ry="52" fill="#fff"/>
  <circle cx="${cx - 22}" cy="${cy - 6}" r="24" fill="#1b2a44"/>
  <circle cx="${cx + 138}" cy="${cy - 6}" r="24" fill="#1b2a44"/>
  <circle cx="${cx - 14}" cy="${cy - 16}" r="8" fill="#fff"/>
  <circle cx="${cx + 146}" cy="${cy - 16}" r="8" fill="#fff"/>
  <path d="M ${cx + 10} ${cy + 80} Q ${cx + 50} ${cy + 125} ${cx + 90} ${cy + 80}" stroke="#1b2a44" stroke-width="16" stroke-linecap="round" fill="none"/>

  <!-- steam wisps -->
  <g fill="#ffffff" opacity="0.9">
    <circle cx="820" cy="250" r="34"/><circle cx="868" cy="228" r="44"/><circle cx="915" cy="252" r="30"/>
    <circle cx="760" cy="150" r="22"/><circle cx="795" cy="135" r="28"/><circle cx="828" cy="152" r="20"/>
  </g>
  <!-- ice cube -->
  <rect x="690" y="760" width="150" height="150" rx="26" fill="#6fc3e6"/>
  <rect x="704" y="774" width="122" height="122" rx="20" fill="#bdf0ff"/>
  <rect x="716" y="786" width="40" height="40" rx="10" fill="rgba(255,255,255,0.7)"/>
</svg>
`;
mkdirSync('art', { recursive: true });
writeFileSync('art/icon.svg', svg);
console.log('wrote art/icon.svg');
