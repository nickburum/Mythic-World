# MELT — Game Design Document

## One-liner

**Hold to heat. Release to cool. Be the right state of matter.**
A one-finger endless runner where the only control is your temperature, and your temperature decides whether you are ice, water or steam.

## Why it is new

Hyper-casual verbs are almost always spatial: tap to jump, hold to fly, swipe to switch lane, tap to drop. MELT's verb is **thermal**. The finger never moves the character; it moves a thermometer, and the character's form, altitude and abilities all fall out of that one continuous value:

| Phase | Temperature | Where it is | Gets through |
|---|---|---|---|
| Ice | below 35° | on the floor | glass panes (smashes them) |
| Water | 35° – 70° | on the floor | pipes (flows through) |
| Steam | 70° and up | floats to the ceiling | floor spikes (floats over) |

Ceiling beams block steam and let anything on the floor pass. Geysers and cold vents shove your temperature by 26° without warning.

The depth comes from the thermometer being continuous and the rates asymmetric-ish (heat 60°/s, cool 56°/s): an expert hovers just under a threshold to flip states instantly, a beginner swings wildly between extremes. Phase changes also take a beat to *act* (steam needs 0.12 s to rise), so the skill is anticipation, which is exactly the "near-miss" feel hyper-casual lives on.

## Hyper-casual checklist

| Requirement | MELT |
|---|---|
| Understood in 3 seconds | Title screen legend: three chips, three verbs. First obstacles carry a label (FLOAT / STAY LOW / ICE ONLY / WATER ONLY) and the icon of the state that passes. |
| One input | Hold anywhere. Thumb-only, one-handed, portrait. |
| 30–60 s sessions | One mistake ends the run. |
| Near-miss failure | Every death line says exactly what state you were and what you needed ("Water can't float. Heat up to steam!"). |
| "One more go" | One tap retry, no load. Each death teaches a rule. |
| Visual progression | Background tints from icy teal to ember as you heat; new obstacle types unlock at scores 4, 7, 14, 19; named milestones at 10/20/35/50/75/100/150. |
| Shareable | Score + close-call count on the end card, native share sheet. |

## Fairness engine (the important bit)

Obstacle spacing is a **time budget, not a distance**, so it stays fair as speed ramps:

- Same state needed → 0.6 s · Adjacent state (ice↔water, water↔steam) → 1.1 s · Opposite (ice↔steam) → 1.75 s.
- Budgets are multiplied by a difficulty factor easing from 1.7 at score 0 to 1.0 at score 45.
- After an obstacle that accepts several states (a beam), the gap is sized for the **worst** state the player may legitimately be in, so no valid choice is ever punished.
- A hazard may only sit in a gap of at least 1.2 s, is placed 30 % in, and grows that gap by 0.6 s so the shove is a surprise but never a trap.
- `tests/melt.test.js` proves it: a reference autopilot with a 0.25 s reaction delay must survive 120 obstacles on 20 random seeds. Tune anything in `config.js` and the test tells you if you broke fairness.

## Feel

- Phase change: colour burst in the new state's colour (shards for ice, drops for water, puffs for steam), squash-and-stretch punch, signature sound (crack / bloop / whoosh), light haptic.
- Holding: ember wisps rise from the droplet and a heat hiss plays; cooling throws off frost sparkles.
- Close call (phase changed within 0.32 s of passing): gold pop, chime, medium haptic.
- Death: shatter, splat or disperse by phase; screen shake; one-line lesson on the end card.
- The droplet has a face: worried as ice, smiling as water, sleepy as steam.

## Retention & monetisation hooks (designed for, not built)

- **Rewarded revive**: one per run, restores you in the state the obstacle needed. Hook: `App.onDie`.
- **Skins**: alternative droplets (lava / mercury / honey) that recolour `PHASE_COLORS`.
- **Daily temperature**: a seeded daily course (`MeltGame({ random })` already takes a seeded PRNG) with a shared leaderboard.
- **Interstitials**: every 3rd run, never before 60 s of play. Hook: `App.gameOver`.

## Store copy

**Title:** MELT — Ice, Water, Steam
**Subtitle:** Hold to heat. Release to cool.
**Keywords:** melt, ice, steam, water, physics, runner, one tap, hyper casual, temperature, science
**Description:** Your finger is a flame. Hold to heat your little drop into steam and float over spikes. Let go to cool into water and flow through pipes. Freeze solid to smash glass. Every obstacle needs a different state of matter, and every second counts. One finger. Three forms. How far can you run?
