/**
 * SKIP — celestial mechanics for the lake. Pure functions keyed to the day
 * phase (0 golden hour → 1 deep night) so the renderer, the shadows and the
 * tests all agree on where the light is.
 *
 * Positions are fractions: x of the screen width, alt 0 = on the horizon,
 * 1 = highest point of the arc.
 */
export const SUNSET = 0.58;    // phase at which the sun's centre touches the horizon
export const MOONRISE = 0.42;  // phase at which the moon's centre clears the horizon

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Sun and moon placement for a phase, plus the dominant light. */
export function sky(phase) {
  phase = clamp01(phase);
  // The sun arcs down and to the right: high at golden hour, setting far right.
  const ts = clamp01(phase / SUNSET);
  const sun = { x: 0.6 + 0.3 * ts, alt: Math.cos(ts * Math.PI / 2), visible: phase < SUNSET + 0.08 };
  // The moon rises on the left and climbs toward upper-left-centre.
  const tm = clamp01((phase - MOONRISE) / (1 - MOONRISE));
  const moon = { x: 0.18 + 0.22 * tm, alt: Math.sin(tm * Math.PI / 2) * 0.9, visible: phase > MOONRISE - 0.05 };
  // Dominant light: the sun until it dips, then the moon, dimmer.
  const sunUp = sun.alt > 0.02 && phase < SUNSET;
  const light = sunUp
    ? { x: sun.x, alt: Math.max(sun.alt, 0.02), strength: 0.55 + 0.45 * sun.alt }
    : { x: moon.x, alt: Math.max(moon.alt, 0.05), strength: 0.25 * clamp01(moon.alt * 2) };
  return { sun, moon, light };
}

/**
 * Where a point's shadow lands on the water, in screen x.
 * The light at (lx, ly) and the point at (px, py) define a ray; it meets the
 * water plane (y = waterY) at the returned x. Returns null when the light is
 * not above the point (no shadow is cast toward the camera plane).
 */
export function shadowX(lx, ly, px, py, waterY) {
  if (py <= ly) return null;           // light below or level with the point
  if (py >= waterY) return px;         // point already on the water
  return lx + (px - lx) * (waterY - ly) / (py - ly);
}
