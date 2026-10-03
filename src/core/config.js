/**
 * MELT — gameplay tuning. Every feel-defining number lives here.
 * World coordinates are a fixed 390 × 700 reference canvas; the renderer scales it.
 * (Port note: ScriptableObject in Unity, a Swift struct on iOS.)
 */
export const CONFIG = Object.freeze({
  WORLD_W: 390,
  WORLD_H: 700,
  CEILING_Y: 120,          // bottom edge of the ceiling strip
  FLOOR_Y: 560,            // top edge of the floor strip
  PLAYER_X: 105,           // the droplet's fixed screen x
  PLAYER_R: 22,            // radius used for drawing and collision

  /* temperature 0..100 */
  TEMP_START: 50,
  HEAT_RATE: 60,           // per second while holding
  COOL_RATE: 56,           // per second while released
  ICE_MAX: 35,             // temp < ICE_MAX  → ice
  STEAM_MIN: 70,           // temp ≥ STEAM_MIN → steam, else water

  /* vertical motion: altitude 0 = floor, 1 = ceiling */
  FLOAT_SPEED: 5.0,        // altitude units per second toward the target
  SPIKE_SAFE_ALT: 0.6,     // need to be at least this high to clear floor spikes
  BEAM_SAFE_ALT: 0.4,      // need to be at most this high to clear ceiling beams

  /* scrolling */
  BASE_SPEED: 230,         // world px per second
  SPEED_PER_PASS: 3.2,
  MAX_SPEED: 440,

  /* spacing is a time budget, not a distance, so it stays fair as speed rises */
  TIME_SAME: 0.6,          // next obstacle needs the same state
  TIME_ADJACENT: 1.1,      // needs a neighbouring state (ice↔water, water↔steam)
  TIME_OPPOSITE: 1.75,     // needs the opposite state (ice↔steam)
  DIFFICULTY_START: 1.7,   // time budgets are multiplied by this at score 0 …
  DIFFICULTY_END: 1.0,     // … easing to this at DIFFICULTY_RAMP passes
  DIFFICULTY_RAMP: 45,
  SPAWN_X: 470,            // obstacles appear here (just off the right edge)

  OBSTACLE_W: 46,
  HAZARD_W: 64,
  GEYSER_HEAT: 26,         // instant temp change when crossing a geyser
  VENT_COOL: 26,

  /* when each thing first appears (score) */
  UNLOCK: { spikes: 0, beam: 0, glass: 4, pipe: 7, geyser: 14, vent: 19 },
  HAZARD_CHANCE: 0.45,     // chance to place a hazard in a gap once unlocked
  HAZARD_MIN_TIME: 1.2,    // only in gaps with at least this time budget
  HAZARD_RECOVERY: 0.6,    // extra seconds added to a gap that contains a hazard
  HAZARD_POS: 0.3,         // hazard sits this far into the gap, leaving room to recover

  NEAR_MISS_WINDOW: 0.32,  // phase change this close to the pass = "close call"

  MILESTONES: [
    { score: 10, name: 'Lukewarm' },
    { score: 20, name: 'Simmering' },
    { score: 35, name: 'Boiling Point' },
    { score: 50, name: 'Supercooled' },
    { score: 75, name: 'Sublime' },
    { score: 100, name: 'Supercritical' },
    { score: 150, name: 'Triple Point' },
  ],
});
