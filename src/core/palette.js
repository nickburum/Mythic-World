/**
 * Sky Temple — procedural colour system.
 * No image assets anywhere in the game: every colour is derived from the
 * stone index (tower height), so the palette drifts continuously as you climb.
 */

/** Clamp helper. */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** HSL → CSS string. */
export const hsl = (h, s, l, a = 1) => {
  h = ((h % 360) + 360) % 360;
  return a >= 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
                : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a.toFixed(3)})`;
};

/** HSL → [r,g,b] 0..255 (used where canvas needs numeric colour). */
export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

/**
 * Hue for the stone at `index`. Slow drift so neighbouring stones are
 * related, with a full rainbow cycle every ~60 stones.
 */
export function stoneHue(index, seedHue = 205) {
  return (seedHue + index * 6) % 360;
}

/**
 * Three shades for an isometric stone: lit top, mid right face, dark left face.
 * @returns {{top:string,right:string,left:string,edge:string,hue:number}}
 */
export function stoneColors(index, seedHue = 205) {
  const h = stoneHue(index, seedHue);
  // Saturation breathes a little so long towers do not look flat.
  const s = 58 + 8 * Math.sin(index * 0.35);
  return {
    hue: h,
    top: hsl(h, s, 64),
    right: hsl(h, s, 50),
    left: hsl(h, s, 40),
    edge: hsl(h, s + 10, 80, 0.55),
  };
}

/** Sky bands: [heightInStones, topHue, topSat, topLight, bottomHue, bottomSat, bottomLight]. */
const SKY = [
  { at: 0,   top: [205, 70, 72], bottom: [28, 90, 86] },   // dawn: blue to peach
  { at: 20,  top: [212, 72, 60], bottom: [195, 65, 82] },  // clear day
  { at: 45,  top: [265, 55, 42], bottom: [370, 85, 70] },  // dusk: violet to orange (370 = 10°, routed via purple)
  { at: 75,  top: [240, 55, 14], bottom: [260, 45, 32] },  // night
  { at: 110, top: [250, 60, 6],  bottom: [280, 55, 18] },  // deep space
  { at: 180, top: [300, 70, 8],  bottom: [330, 70, 24] },  // cosmic nebula
];

/**
 * Sky gradient colours for a tower `height` (in stones, can be fractional).
 * @returns {{top:string,bottom:string,night:number}} night = 0..1 how dark the sky is
 */
export function skyColors(height) {
  let i = 0;
  while (i < SKY.length - 2 && height >= SKY[i + 1].at) i++;
  const a = SKY[i], b = SKY[i + 1];
  const t = clamp((height - a.at) / (b.at - a.at), 0, 1);
  const mix = (p, q) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
  const top = mix(a.top, b.top), bottom = mix(a.bottom, b.bottom);
  const night = clamp((height - 40) / 50, 0, 1);
  return {
    top: hsl(top[0], top[1], top[2]),
    bottom: hsl(bottom[0], bottom[1], bottom[2]),
    night,
  };
}
