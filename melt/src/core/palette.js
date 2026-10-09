/**
 * MELT — colours. Everything is derived from temperature and phase so the
 * whole screen "feels" hot or cold without a single image asset.
 */
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));

export const hsl = (h, s, l, a = 1) => {
  h = ((h % 360) + 360) % 360;
  return a >= 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
                : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a.toFixed(3)})`;
};

/** Phase identity colours, shared by the droplet, the gauge and obstacle hints. */
export const PHASE_COLORS = Object.freeze({
  ice:   { fill: '#bdf0ff', edge: '#6fc3e6', dark: '#4ea3c9', text: '#bdf0ff' },
  water: { fill: '#3aa7ff', edge: '#1f7fd6', dark: '#1a63ad', text: '#6fc0ff' },
  steam: { fill: '#f6f8ff', edge: '#d9e0f2', dark: '#b9c3dd', text: '#ffffff' },
});

/** Sky temperature for a phase (the renderer eases between them). */
export const PHASE_TEMP = Object.freeze({ ice: 8, water: 50, steam: 92 });

/** Background gradient for a temperature 0..100: icy teal → warm ember. */
export function skyForTemp(temp) {
  const t = clamp01(temp / 100);
  // cold: deep blue → teal; hot: deep maroon → ember. The hue travels the
  // long way round (teal → violet → magenta → red → orange) like a thermal map.
  const topH = lerp(214, 352, t), topS = lerp(55, 48, t), topL = lerp(20, 16, t);
  const botH = lerp(192, 384, t), botS = lerp(62, 85, t), botL = lerp(42, 50, t);
  return {
    top: hsl(topH, topS, topL),
    bottom: hsl(botH, botS, botL),
    glow: hsl(lerp(200, 388, t), 90, 72, 0.3 + 0.2 * Math.abs(t - 0.5) * 2),
  };
}

/** Obstacle colours. */
export const OBSTACLE_COLORS = Object.freeze({
  spikes: { fill: '#ff5e6c', dark: '#b33446', hint: PHASE_COLORS.steam.text },
  beam:   { fill: '#7b8cb0', dark: '#4b5a7c', hint: '#ffd36b' },
  glass:  { fill: 'rgba(200, 240, 255, 0.28)', edge: 'rgba(255,255,255,0.85)', frame: '#8fd6f0', hint: PHASE_COLORS.ice.text },
  pipe:   { fill: '#2b3b5c', dark: '#1a2640', ring: '#9fb0d1', hint: PHASE_COLORS.water.text },
  geyser: { fill: '#ff9a3c', dark: '#ffd36b', hint: '#ffb36b' },
  vent:   { fill: '#dff6ff', dark: '#9fe3ff', hint: '#bdf0ff' },
});

export const ROCK = Object.freeze({ fill: '#15203a', edge: '#2a3a5f', seam: 'rgba(255,255,255,0.06)' });
