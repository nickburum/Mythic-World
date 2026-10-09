# Sky Temple — Game Design Document

## One-liner

**Tap to stack. Land perfectly to grow.** A one-touch tower stacker where you build a temple from earth to the stars.

## Why this loop

The stacking loop has been a fixture of the App Store's free charts since 2016 and keeps resurfacing because it checks every hyper-casual box:

| Hyper-casual requirement | How Sky Temple meets it |
|---|---|
| Understood in under 3 seconds | One stone slides, you tap, it lands. No tutorial. |
| One input | Tap anywhere. Works thumb-only, one-handed, in portrait. |
| 30–60 second sessions | A run ends in a single mistake; average run ~40 s. |
| Near-miss failure | You can always see exactly how far off you were. The slice falls away. |
| "One more go" | Retry is one tap, with no load screen. The sky and stone hue reset to a new seed each run so every run looks fresh. |
| Visual progression | Hue drifts every stone; the sky passes through dawn → day → dusk → night → deep space → nebula. |
| Shareable moment | Game-over pulls the camera out to show the whole tower with the score. Native share sheet. |

## Core mechanics

### Sliding stone
- Alternates axis each turn (X, then Z) so the player's eye never settles into a rhythm.
- Linear back-and-forth motion (not sinusoidal) so timing reads consistently.
- Starts on a random side so the first-frame tap is not learnable.
- Speed: `BASE_SPEED + score × SPEED_PER_LEVEL`, capped at `MAX_SPEED` (see `src/core/config.js`).

### Drop
- **Overlap** = size of the stone below − |centre offset|.
- **Cut** when overlap > 0 but offset > tolerance: the overhang becomes a falling slice, the kept piece becomes the new footprint, and the next stone inherits it. The tower visibly narrows under pressure.
- **Perfect** when |offset| ≤ `PERFECT_TOLERANCE`: snap to exact alignment. Combo +1.
- **Regrow**: from combo 3 onward every perfect adds `GROW_AMOUNT` to the footprint, back up to full size. This is the comeback mechanic that turns a bad run into a tense one.
- **Miss** when overlap ≤ `MIN_SIZE`: run ends.

### Score & progression
- Score = stones placed.
- Milestones at 10 / 25 / 50 / 75 / 100 / 150 / 200 announce named zones ("Above the Clouds", "Mount Olympus", "Among the Stars"…) with a fanfare and gold burst.
- Best score and best streak persist locally.

## Feel ("juice") checklist

- Perfect: expanding glowing ring (double ring at combo ≥ 3), pentatonic note rising with the combo, light haptic, "PERFECT" / "×N" pop.
- Cut: thud, slice tumbles with gravity and spin.
- Grow: sparkle burst + ascending chirp.
- Miss: heavy haptic, screen shake, the whole stone tumbles, 1.1 s beat, then camera zooms out to reveal the full tower.
- Score digits scale-pop on every change.
- Camera eases up with the tower; the moving stone casts an alignment shadow onto the top face.

## Art direction

- Flat-shaded 2:1 isometric boxes with three tones (top / right / left) and a lit rim.
- HSL hue drift of 6° per stone; saturation breathes with a slow sine so long towers do not flatten.
- Marble plinth with gold band roots the tower and sells the "temple" theme.
- Soft white clouds (parallax, drifting) fade out as stars fade in.
- All art is code: nothing to export, resize or license.

## Audio

Synthesised in WebAudio: filtered noise for impacts, sine/triangle tones for feedback, a major pentatonic ladder for perfect combos so streaks turn into a melody. Mute toggle persisted.

## Retention & monetisation hooks (not yet implemented, designed for)

- **Rewarded video "Revive"**: after a miss, one revive per run restores the last stone at full footprint. Hook point: `App.onMiss` before `setState(FALLING)`.
- **Interstitials**: between runs, frequency-capped (e.g. every 3rd game over, never before 60 s of play). Hook point: `App.gameOver`.
- **Stone skins**: unlock palettes (marble, obsidian, jade, gold) with earned coins or as a no-ads IAP. Hook point: `seedHue`/`stoneColors`.
- **Daily best / streaks**: local notifications "Your temple awaits" at a quiet hour.
- **Leaderboards**: Game Center / Play Games on score; the core already exposes `score`, `bestCombo`, `perfects`.

## Tuning knobs

Everything lives in `src/core/config.js`. Suggested first A/B tests: `PERFECT_TOLERANCE` (0.07–0.10), `GROW_AFTER_COMBO` (3 vs 5), `SPEED_PER_LEVEL`.

## Store copy

**Title:** Sky Temple — Stack to the Gods
**Subtitle:** One tap. Infinite climb.
**Keywords:** stack, tower, tap, hyper casual, one tap, zen, build, temple, perfect, timing
**Description:** Tap to drop the stone. Land it perfectly and it glows. Chain perfects to rebuild your tower and climb through clouds, dusk and stars to the halls of the gods. One finger, endless height. How high can your temple rise?
