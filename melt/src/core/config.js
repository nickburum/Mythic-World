/**
 * MELT — gameplay tuning. World units are a fixed 390 × 700 reference canvas.
 * Control: one tap cycles the state of matter ice → water → steam → ice.
 */
export const CONFIG = Object.freeze({
  WORLD_W: 390,
  WORLD_H: 700,
  CEILING_Y: 120,
  FLOOR_Y: 560,
  PLAYER_X: 105,
  PLAYER_R: 22,

  START_PHASE: 'water',
  TAP_COOLDOWN: 0.08,       // seconds between accepted taps (debounce, not a mechanic)

  /* vertical motion: altitude 0 = floor, 1 = ceiling */
  FLOAT_SPEED: 5.0,
  SPIKE_SAFE_ALT: 0.6,
  BEAM_SAFE_ALT: 0.4,

  /* scrolling */
  BASE_SPEED: 230,
  SPEED_PER_PASS: 3.2,
  MAX_SPEED: 440,

  /* spacing is a time budget by number of taps needed */
  TIME_SAME: 0.6,           // 0 taps
  TIME_ONE: 0.95,           // 1 tap
  TIME_TWO: 1.3,            // 2 taps
  DIFFICULTY_START: 1.7,
  DIFFICULTY_END: 1.0,
  DIFFICULTY_RAMP: 45,
  SPAWN_X: 470,

  OBSTACLE_W: 46,
  HAZARD_W: 64,

  UNLOCK: { spikes: 0, beam: 0, glass: 4, pipe: 7, geyser: 14, vent: 19 },
  HAZARD_CHANCE: 0.45,
  HAZARD_MIN_TIME: 1.2,
  HAZARD_RECOVERY: 0.6,
  HAZARD_POS: 0.3,

  NEAR_MISS_WINDOW: 0.32,

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
