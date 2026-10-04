/**
 * SKIP — gameplay tuning. World units are metres and seconds.
 * (Port note: ScriptableObject in Unity, a Swift struct on iOS.)
 */
export const CONFIG = Object.freeze({
  GRAVITY: 14,              // m/s², a little snappier than Earth for readable arcs
  HAND_HEIGHT: 1.1,         // throw release height above the water
  THROW_VX_MIN: 11,         // horizontal speed at zero charge
  THROW_VX_MAX: 19,         // at full charge
  THROW_VY: 3.2,            // upward speed on release
  CHARGE_TIME: 1.1,         // seconds to fill the wind-up meter
  CHARGE_IDLE: 0.55,        // charge used when the player just taps instead of holding

  /* skipping */
  EARLY_WINDOW: 0.45,       // tapping this long before natural contact dips the stone (shorter hop)
  PERFECT_WINDOW: 0.11,     // tap within this of contact = perfect
  GOOD_WINDOW: 0.24,        // … = good
  RETAIN_BASE: 0.86,        // speed kept on an untapped / poor skip
  RETAIN_PERFECT: 0.97,     // speed kept on a perfect skip
  BOUNCE_RATIO: 0.30,       // vy after a skip = vx × ratio × bounce quality
  BOUNCE_MAX: 4.2,
  BOUNCE_MIN_QUALITY: 0.70, // weakest hop, as a fraction of a perfect one
  DIP_VY: -7,               // downward kick when the player taps early
  MIN_SPEED: 2.6,           // below this the stone sinks on its next contact
  PERFECT_BOOST: 0.35,      // extra m/s per perfect in a streak (capped)
  PERFECT_BOOST_CAP: 2.0,

  /* pickups & hazards */
  MOTE_RADIUS: 0.7,         // landing within this of a mote collects it
  MOTE_BOOST: 2.6,          // m/s
  MOTE_GAP_MIN: 7,
  MOTE_GAP_MAX: 14,
  PAD_START: 55,            // lily pads appear after this distance
  PAD_GAP_MIN: 18,
  PAD_GAP_MAX: 34,
  PAD_WIDTH: 1.5,
  LOOKAHEAD: 60,            // metres of lake kept populated ahead of the stone

  /* presentation hints the core exposes */
  DAY_LENGTH: 320,          // metres from golden hour to full night

  MILESTONES: [
    { distance: 25, name: 'Nice arm' },
    { distance: 50, name: 'Across the cove' },
    { distance: 100, name: 'Past the reeds' },
    { distance: 150, name: 'Into the dusk' },
    { distance: 200, name: 'Under the stars' },
    { distance: 300, name: 'The far shore' },
  ],
});
