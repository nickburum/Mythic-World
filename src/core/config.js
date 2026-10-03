/**
 * Sky Temple — gameplay tuning.
 * Every number that changes how the game feels lives here.
 * (Port note: this maps 1:1 to a ScriptableObject in Unity or a Swift struct.)
 */
export const CONFIG = Object.freeze({
  /** Footprint of the first stone, in world units. All later stones inherit the footprint of the stone below. */
  BLOCK_SIZE: 1.0,
  /** Height of one stone in world units. */
  BLOCK_HEIGHT: 0.32,
  /** How far (world units) a sliding stone travels past the tower centre before bouncing back. */
  SLIDE_RANGE: 1.3,
  /** Slide speed on the first stone (world units per second). */
  BASE_SPEED: 1.9,
  /** Extra speed per stone placed. */
  SPEED_PER_LEVEL: 0.03,
  /** Speed cap so late game stays fair. */
  MAX_SPEED: 4.4,
  /** Centre misalignment (world units) that still counts as a perfect drop. */
  PERFECT_TOLERANCE: 0.085,
  /** Perfect drops in a row needed before the stone starts growing back. */
  GROW_AFTER_COMBO: 3,
  /** How much a stone regrows per perfect once the combo threshold is met. */
  GROW_AMOUNT: 0.1,
  /** A stone is lost when its remaining footprint along the slide axis drops below this. */
  MIN_SIZE: 0.02,
  /** Score milestones that trigger a named "zone" announcement. */
  MILESTONES: [
    { score: 10, name: 'Above the Clouds' },
    { score: 25, name: 'Realm of Birds' },
    { score: 50, name: 'Halls of Thunder' },
    { score: 75, name: 'Mount Olympus' },
    { score: 100, name: 'Among the Stars' },
    { score: 150, name: 'Edge of the Cosmos' },
    { score: 200, name: 'Beyond the Gods' },
  ],
});
