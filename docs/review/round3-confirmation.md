# Round 3: confirmation of the NOT YET seats

I checked commit 88616c9 in a detached worktree and changed no repo files. The worktree is removed and the main checkout is clean. Five of the six seats now vote SHIP; Artist 3 stays NOT YET.

- **Tests:** `npm test` passes 93/93.
- **Render:** `PORT=8702 npm run screens:all` exited 0, and all 6 runs reported "no page errors".
- **Evidence:** saved in the scratchpad (`/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/`):
  - scripts: `r3tools/` (sims.mjs, verify.mjs, sheets.mjs)
  - captures: `r3shots/` (verify.json, daily-*.png, skip-*.png, st-title.png)
  - store and icon contact sheets: `r3out/`

## Seat votes
- **Engineer 1: SHIP.** `AdsBridge.ensureConsent` re-runs `requestConsentInfoUpdate` on every `load` and only requests an ad when `canRequestAds` is true. If consent fails, `consentChecked` is reset and the page gets `onReady(false)`. A Settings "Privacy choices" button calls `presentPrivacyOptionsForm`, wired through `onPrivacy`. `ageBandFor` now uses `<=13` → child and `<=16` → teen, and the test covers it. I couldn't compile the Swift: there is no Xcode here.
- **Artist 1: SHIP.**
  - Both store sets have 7 frames at exact sizes, and frame 1 is Sky Temple ×12 with "Five one-tap games".
  - The SKIP store frame shows a single "PERFECT ×7".
  - The box icon is now four tiles (droplet, bubble, ring, tower) with no play button.
  - The SKIP icon is warmer and reads at 60 px on white and on #0B1020.
  - The leftovers are minor (see the checklist).
- **Artist 3: NOT YET.** In my Sky Temple title capture a cloud still sits on the tagline ("Build a temple…").
  - SKIP sink and pad deaths are no longer still frames, but only part of the spec landed. The stone never goes under. Pads don't squash.
- **Technical Artist 1: SHIP.** MELT at 4× throttle, 390×844, DPR3, 3 passes of the r2 harness: **26.0 ms** average (24.3–27.8), p95 34.4. The target was ≤36.
  - A second check with the new MELT "Ember" colour look (a CSS filter on the canvas) gave 31.5 ms against 33.1 without it, so looks cost nothing.
- **Designer 1: SHIP.** SKIP is no longer a lottery. In my own simulation, timed players go 3.7–7.5× further than a 3.5 Hz masher (296–600 m against 80 m).
  - A player who heeds the red marker reaches a median of 27.6 s, or 30.5 s with novice open water. That is borderline on the 30 s bar; the repo's own acceptance test passes.
  - MELT near-misses now pay: a heat multiplier up to ×5, a flame line in the HUD, and a coach line.
- **Designer 2: SHIP.** Opened from the Today card, both the big Play and a title tap gave "TODAY'S RUN DONE · 1-DAY STREAK", with the hub then showing "Again". I checked POP and ORBIT both ways and SKIP with Play.
  - Levels now unlock looks. The hub shows "Next: SKIP Midnight · LV 2", and equipping Midnight applied `hue-rotate(200deg)` to SKIP's canvas.

## Blocker checklist
**Engineer 1**
- B1, EEA consent bypass and no privacy path: **VERIFIED FIXED** in code (AdsBridge.swift, index.html `#privacy-wrap`, box.js `onPrivacy`/`privacyOptions`). The button only appears after a game has asked for an ad in this launch (P2).
- B2, age-band boundary: **VERIFIED FIXED.** 2013 → child and 2010 → teen in tests/shared.test.js, which passes.

**Artist 1 / Artist 3** (blockers 1–7 of round2-art)
1. Overlapping text pops: **PARTIAL.**
   - Fixed: in autoplay, Sky Temple had 0 overlap frames out of 630, and same-slot overlaps are gone in all three games. The store frames are clean.
   - Left: SKIP's "+SPEED" (no slot, at waterY−70) overlaps the PERFECT combo pop, now moved to waterY−80, in about 4% of frames. SKIP also shows "DIP" over "DIP", and POP had "FRENZY!" over a combo in 3 of 2340 frames.
2. Store frame 1 was the hub list: **VERIFIED FIXED.** It is Sky Temple ×12, and the box frame moved to slot 3.
3. POP frame clips its hero moment: **PARTIAL.** "CHAIN ×4 +20" is centred and fully in frame. The gold burst rings sit in the lower-left corner and one ring is cut by the left edge, and a bubble covers the score "31".
4. Box icon reads as a video player: **VERIFIED FIXED.** It is four 300 px glyph tiles; icon-1024 is regenerated, and `ios/bootstrap.sh` copies it into the iOS app icon.
5. SKIP icon reads as a grey saucer: **VERIFIED FIXED.** It has a sun disc, orange ripples and a dot trail, and stays legible at 60 and 40 px on both backgrounds. The 40% sun is muted.
6. SKIP streaks and deaths: **PARTIAL.**
   - Streaks: fully done. ×2 is 23.8 px in warm white, rising to about 34 px in magenta with an extra ripple at ×8; shake comes at ×5/×10, with a haptic from ×4.
   - Sink: it gets 24 bubbles, a bigger ripple, a 6 px camera dip and a HUD bump. Frames at +0, +150 and +400 ms all differ, for both a sink and a pad death.
   - Missing from the spec: the stone going under (y, alpha, rotation), the pad squash and the green droplets; pad deaths get generic sparks.
7. Sky Temple tagline and cloud undersides: **NOT FIXED / PARTIAL.** Undersides are now ellipses. The title skips clouds whose y is 0.08–0.32 h, but the tagline is at about 0.33 h, and a cloud covered "Build a temple" in my capture. No scrim was added.

**Technical Artist 1**
- MELT at 4× ≤36 ms: **VERIFIED FIXED** at 26.0 ms (the vignette is baked into the cached sky, so one full-screen blit per frame).

**Designer 1 / Designer 2** (blockers 1–6 of round2-design)
1. Daily lost by any start except the banner: **VERIFIED FIXED.**
   - POP (Play and title tap), ORBIT (Play and title tap) and SKIP (Play) all credited today's run.
   - MELT's title tap ran on the daily seed with `active=true`; it scored 2, under the new 3-point real-attempt rule, so no credit.
   - Sky Temple is checked in code only.
   - The banner is now a label with no button.
2. SKIP lily-pad lottery: **VERIFIED FIXED**, with two deviations.
   - Done: a red pulsing marker plus "DIP!", a coach line on the first 3 pads, open water to 100 m in the first 3 runs, and pads that crowd in and pair up from 500 m.
   - Windows are 0.10/0.20 s, not the specified 0.08/0.18.
   - My simulation: the masher reaches 80 m. A player tapping 30 ms late (σ 45 ms) reaches 27.6 s / 600 m. A player reacting to the DIP! text reaches 11–15 s. One who ignores the warning reaches 13 s / 296 m.
   - The DIP! text shows for only 250 ms, so players who react to it rather than to the marker get about half the run.
3. Levels give nothing: **VERIFIED FIXED.** Looks unlock at levels 2–17, the "Next:" line shows in the hub and on the result sheet, the level-up pill names the look with an Equip button (seen in store frame 7), and Settings has a Looks picker.
4. Screen-reader semantics: **VERIFIED FIXED** in code: cards are buttons inside list items, and the Today button, level strip and week dots are labelled.
5. "Show tutorials again": **VERIFIED FIXED** in code (it now also clears `gamebox.coach`).
6. MELT near-miss pays nothing: **VERIFIED FIXED.**
   - Heat builds ×1–×5 and passes score the multiplier; NEAR_MISS_WINDOW is 0.4 and there is a HUD flame line.
   - My novice simulation: a mixed-reaction novice averages 1.10 close calls per run (best heat 5); a late novice 0.60; a prompt novice 0.

## Anything newly broken by the fixes (P0/P1 only)
- **[P1, minor] SKIP text pops overlap again.** Moving the PERFECT and GOOD pops to waterY−80/−70 put them on the unslotted "+SPEED" pop (waterY−70), which prints over them in about 4% of autoplay frames. The fix is to put `+SPEED` and `DIP` in the combo slot or offset them by 40 px or more (`skip/src/main.js:361`).
- Nothing else at P0/P1. P2 notes:
  - MELT's heat multiplier inflates MELT scores against existing bests, and probably XP.
  - A rewarded ad loaded before the player withdraws consent through Privacy choices isn't thrown away.
  - SKIP's title still doesn't start on a tap.
