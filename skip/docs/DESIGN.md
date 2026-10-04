# SKIP — Game Design Document

## One-liner
**Skip a stone across a sunset lake. Tap when it kisses the water.**

## Pillars
1. **Easy to feel good at.** An untapped throw still skips 5+ times and travels ~25 m. Nobody fails their first throw. Skill shows up as distance, not survival.
2. **Beautiful.** The lake does the work: layered mountains, mirrored reflections with wobble, a shimmering sun path, clouds lit from below, ripples, splashes, fireflies, and a sky that moves from golden hour to dusk to stars as you travel.
3. **One finger.** Hold to wind up, release to throw, tap to skip. Nothing else.
4. **A proper menu.** Title with live lake behind it, PLAY, LEADERBOARD, HOW TO PLAY, settings (sound, haptics), a run-over card with rank, and a Game Center status chip.

## The loop
- **Wind up**: hold anywhere; a meter fills over 1.1 s. Release throws (11–19 m/s). A bare tap throws at 55 %.
- **Skip**: the stone flies a ballistic arc. Its reflection rises to meet it, and they touch at contact — the natural timing cue. Tap:
  - within 0.11 s of contact → **PERFECT**: keep 97 % speed, +0.35 m/s per streak (capped), big bounce, chime climbing a pentatonic scale.
  - within 0.24 s → **GOOD**: ~85 % speed.
  - within 0.45 s → **DIP**: the stone is kicked down so the hop ends here; ~79–85 % speed. This is how you steer.
  - no tap → plain skip, 79 % speed, smaller bounce.
- **Motes**: glowing points on the water every 7–14 m. Landing within 0.7 m collects one: +2.6 m/s.
- **Lily pads**: from 55 m, every 18–34 m. Landing on one ends the run. The dashed landing marker shows where the current arc lands, so a pad ahead means "tap early".
- **End**: below 2.6 m/s the stone sinks on its next contact. Score = distance in metres (1 decimal).

## Why distance, not survival
A distance score makes every run "count": a casual player gets 30 m and a satisfying number, a good player gets 300 m and the night sky. It also maps directly onto a single Game Center leaderboard with a readable unit.

## Feel checklist
- Charge: rising pitch ticks, meter fills warm; release: whoosh + light haptic.
- Skip: ripple rings (more for perfect), splash droplets scaled by quality, pitched splash, PERFECT ×n pop in gold, medium haptic.
- Mote: sparkle burst, three-note chime, +SPEED pop.
- Sink: bubbles, plop, heavy haptic, then the result card rises after 0.9 s.
- Night: crickets fade in, fireflies drift above the water, the sun becomes the moon.

## Leaderboards
`src/platform/leaderboard.js`: local top‑10 everywhere; Game Center via a WKScriptMessageHandler in the iOS shell (`native/ios`). See `docs/GAMECENTER.md`.

## Store copy
**Title:** SKIP — Stone Skipping
**Subtitle:** Tap when it kisses the water
**Keywords:** skip, stone, lake, relax, zen, sunset, one tap, casual, water, leaderboard
**Description:** Hold. Release. Tap when the stone kisses the water. Chase the glowing motes, dodge the lily pads, and skip your way from golden hour into a sky full of stars. Compete for the longest throw on Game Center. One finger. One quiet lake.
