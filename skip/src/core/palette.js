/**
 * SKIP — colours. The whole scene is keyed to `dayPhase` (0 golden hour → 1
 * deep night). Every colour is a blend between keyframes; no image assets.
 */
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const hsl = (h, s, l, a = 1) => { h = ((h % 360) + 360) % 360; return a >= 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)` : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a.toFixed(3)})`; };

const mixHsl = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Keyframes: golden hour, dusk, night. Each entry is HSL. */
const KEY = [
  { // golden hour
    skyTop: [222, 60, 48], skyMid: [28, 90, 72], skyBot: [18, 95, 62],
    sun: [38, 100, 80], sunGlow: [28, 100, 65],
    mountFar: [262, 30, 62], mountNear: [258, 28, 40],
    water: [24, 70, 52], deep: [222, 55, 24], shimmer: [40, 100, 85],
    stars: 0, fog: [30, 80, 80],
  },
  { // dusk — hues written as negatives so every blend travels through red/magenta/violet, never green
    skyTop: [252, 55, 22], skyMid: [-40, 55, 48], skyBot: [22, 90, 58],
    sun: [20, 100, 72], sunGlow: [-20, 90, 55],
    mountFar: [262, 35, 36], mountNear: [258, 35, 20],
    water: [-60, 40, 32], deep: [250, 55, 12], shimmer: [20, 100, 80],
    stars: 0.5, fog: [-60, 50, 50],
  },
  { // night
    skyTop: [232, 60, 7], skyMid: [-132, 55, 16], skyBot: [-145, 50, 24],
    sun: [45, 30, 92], sunGlow: [-150, 60, 70],       // the moon
    mountFar: [232, 35, 18], mountNear: [232, 35, 9],
    water: [-138, 55, 16], deep: [230, 60, 5], shimmer: [-160, 60, 90],
    stars: 1, fog: [-138, 40, 25],
  },
];

/** Blend the keyframes for a day phase. Returns an object of CSS colours plus `stars` 0..1 and `night` 0..1. */
export function scene(phase) {
  const t = clamp01(phase) * (KEY.length - 1);
  const i = Math.min(KEY.length - 2, Math.floor(t));
  const f = t - i;
  const a = KEY[i], b = KEY[i + 1];
  const out = {};
  for (const k of Object.keys(a)) {
    if (Array.isArray(a[k])) { const c = mixHsl(a[k], b[k], f); out[k] = hsl(c[0], c[1], c[2]); out[k + 'Hsl'] = c; }
    else out[k] = lerp(a[k], b[k], f);
  }
  out.night = clamp01((phase - 0.45) / 0.55);
  return out;
}

export const STONE = { light: '#8c96a3', mid: '#5f6975', dark: '#3f4752', rim: 'rgba(255,255,255,0.55)' };
export const MOTE = { core: '#fff6c8', glow: 'rgba(255, 220, 120, 0.55)' };
export const PAD = { fill: '#3f8f5a', dark: '#2e6b43', light: '#62b47a', flower: '#ff9ac4', flowerCore: '#fff0a8' };
