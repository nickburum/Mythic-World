# Technical art panel — round 2

## Seat votes
- Technical Artist 1: NOT YET. Four of the five games are well inside the bar and SKIP's spikes are gone, but MELT averages 37.7 ms at 4× (target ≤36). Merging MELT's two full-screen blits into one fixes it; the ablation shows about −17 ms.
- Technical Artist 2: SHIP. All three round-1 P0s are verified in code and in the render: drums skip the delay, the master has a compressor and low-pass, ducking works, and audio resumes after iOS 'interrupted'. Every mix P1 also landed. The only item left is a three-line `otherAudio` hook, which can land without another review.
- Technical Artist 3: SHIP. The store set is now complete at exact sizes, and the hub, HUDs, result sheets and settings fit cleanly at all three phone sizes. Store frame 4 (SKIP) needs one seeded re-render before upload; that doesn't need another review.

## Measurements
Method is the same as round 1: 390×844 at DPR3, `Emulation.setCPUThrottlingRate`, 1.8 s warm-up, 180 rAF samples, the game hooks, and the Sky Temple drop script (now restarts on game over).
- **Current build:** 2–7 passes per cell.
- **Baseline:** one pass of round-1 commit 4120b94 under the same conditions. The machine load was 1.5–3.3 today against 10–16 in round 1, so compare against this column, not the published one.
- **1× is vsync-bound:** every game now holds 16.6–16.8 ms at 1×.

| Game | 1× ms (r1 published) | 4× ms now | p95 4× now | 4× baseline today (p95) | 4× r1 published (p95) | JS max at 4× now |
|---|---|---|---|---|---|---|
| MELT | 16.6 (17.5) | **37.7** (34.1–41.0) | 54 | 44.3 (69.7) | 58.3 (88.6) | 18 ms |
| SKIP medium (touch default) | 16.6 (16.8) | **17.7** | 27 | 36.2 (69.6), JS max 87 | 40.5 (77.3) | 36 ms; 0 frames >50 |
| SKIP high | 16.6 (19.9) | **23.8** | 39 | 62.2 (118.7), JS max 172 | 66.2 (124.8) | 52 ms once in 7 passes; otherwise ≤40 |
| POP | 16.6 (17.0) | **21.6** | 33 | 28.8 (40.5) | 40.2 (66.4) | 13 ms |
| ORBIT | 16.7 (19.8) | **16.9** | 22 | 20.8 (29.9) | 36.5 (74.5) | 14 ms |
| Sky Temple | 16.6 (30.3) | **32.9** | 48 | 45.3 (71.6) | 71.7 (153) | 15 ms |

MELT ablation at 4× in the same run (41.0 ms): removing the vignette gives 24.3, removing the sky gives 24.4, and removing the motes gives 38.4. Each of the two stretched full-screen `drawImage` blits costs about 17 ms under CPU raster.

## Round-1 findings: verified fixed / still open

**Technical Artist 1 (rendering performance)**
- P0 MELT gradients: **partly fixed.** Sky and vignette are now cached, but they are still drawn as two full-screen blits each frame (44.3 → 37.7 ms), so the target is missed.
- P0 SKIP layer thrash: **fixed.** Canvases are reused and the rebuild threshold is 0.03. Medium went 36.2 → 17.7 ms (JS max 87 → 36); high went 62 → 24 ms.
- P0 Sky Temple sky and vignette repaint: **fixed** (45.3 → 32.9 ms).
- P1 POP backdrop gradients: **fixed** (28.8 → 21.6 ms).
- P1 Sky Temple ring `shadowBlur`: **fixed** (now layered strokes).
- P1 POP per-bubble gradients: **fixed** (sprites).
- P1 pixel budget: **fixed** in MELT, POP, ORBIT and Sky Temple (1.4 Mpx cap). The `adapt()` quality step-down is still SKIP-only.
- P2 `alpha:false` on MELT and Sky Temple: **fixed.**
- P2 back pill `backdrop-filter`: **fixed** (`css/box.css` no longer has it).
- P2 SKIP mountain gradients and `stoneColors` memo: **cut by the producer.**
- P2 text-pop sprite cache: **deferred to v1.1.**

**Technical Artist 2 (audio)**
- P0 drums through the delay, no limiter: **fixed.** Drums go `drumOut` → master. The master runs through a compressor (−18 dB, knee 12, ratio 4, 3 ms / 150 ms) and a 6.5 kHz low-pass. Drum volume is 0.3.
- P0 music masking SFX: **fixed.** `Music.volume` is 0.35 and the SFX masters are 0.7. `duck(−6 dB, 120 ms, 250 ms)` is wired through `sfx.onSound` in all five games.
- P0 iOS 'interrupted': **fixed.**
  - Every `unlock()` now checks `!== 'running'`, and `statechange` plus `visibilitychange` call resume.
  - WKWebView `mediaTypesRequiringUserActionForPlayback = []` covers the gesture problem in the app.
  - The suggested `touchend` unlock was not added; that only matters in web Safari.
- P1 AVAudioSession: **partly fixed.** The session is `.ambient` with `mixWithOthers`, and `__gameBoxNative.otherAudio` is injected, but no JS reads it (see New blockers).
- P1 bass below speaker range: **fixed.**
  - A +8va triangle voice (×0.5, low-pass 1200 Hz) now sounds at 165 Hz in ORBIT, 196 Hz in Sky Temple and 220 Hz in MELT.
  - Sky Temple's bass is now a triangle.
  - ORBIT's saw bass has a 700 Hz low-pass at volume 0.10.
- P1 Sky Temple diminished chord: **fixed.** The render gives G A D Bm G D A Bm, with offbeat-only hats at volume 0.2.
- P1 POP lead: **fixed as specified.** It is now a triangle at 2.5 kHz with a nearest-tone walk, and non-chord tones fell from 21/73 to 7/100. It now sits too low, though (see Polish).
- P1 ORBIT warn/crash: **fixed.**
  - Warn is a triangle 740→880 Hz at 0.22 plus a 1.2 kHz tick.
  - Crash, POP `wrong()` and Sky Temple `miss()` are triangles through a 1500 Hz low-pass plus noise through a 600 Hz low-pass.
- P2 obvious loops: **fixed.** There are 8-chord progressions (15–27 s), `patternB`, fills and voice-led pads.
- P2 MELT heat bed and mute clicks: **fixed.** The bed was removed, and every `setMuted` now uses `setTargetAtTime`.
- P2 missing SFX moments: **mostly fixed.** New-best and game-over stings, POP and ORBIT milestones, and a fade on leave are in. `Music.setTempo` exists but ORBIT never calls it.
- P2 hats: **fixed.** One shared buffer, 6 kHz bandpass, 25 ms, swung ghost hats.

**Technical Artist 3 (UI, device fit, store assets)**
- P0 store pipeline: **fixed.**
  - 7 frames at exactly 1290×2796 and 1284×2778, with Sky Temple included and the port taken from `PORT`.
  - The SKIP frame still calls `a.start()` with no seed.
  - There is still no CI check of frame counts and sizes.
- P1 cropped frames and in-app chrome: **fixed.** The whole device is in view, the chrome is hidden, and seeded bests show.
- P1 fallback font: **open.** The frames are still rendered on Linux, and `store/CHECKLIST.md` has no macOS step. Caption balance and size are fixed.
- P1 SKIP distance style: **fixed** (the HUD score is now large).
- P1 "HOW TO PLAY" wrap: **fixed** at 375, 390 and 430.
- P1 switcher handle over SKIP buttons: **open.** `switcher.js` is unchanged; this only affects the standalone web build.
- P1 hero chip selector leak: **fixed** (`.hero-text > b`).
- P1 MELT logo on the ceiling rail: **open.** `.in-box .title-block` is still `11vh`, and the rail cuts through the logo at 390.
- P2 Sky Temple grey result sheet: **open** (no `--surface` override).
- P2 `--ink-dim` undefined: **open** in POP and ORBIT `.sub`.
- P2 tokens and spacing refactor, landscape layouts: **cut by the producer.**

**New screens in this round:** nothing failed.
- The Today card, level strip, XP block, "short of your best" line, and the IAP plus player tag (checked with a mocked StoreKit bridge) fit at 375×667, 390×844 and 430×932, with no horizontal overflow and no text clipped or wrapped.
- The back pill sits top-left at 44 px and nothing overlaps it. HUD scores clear both the pill and the corner buttons at every size.
- At 375 the settings sheet scrolls (765 px of content in 650 px) to reach Done; that is acceptable.

## New blockers
1. [P1] MELT misses the 4× target: 37.7 ms average, p95 54 ms.
   - Where: `melt/src/render/renderer.js` `skyFor()` / `drawVignette()`.
   - Fix: paint the vignette's radial darkening into each cached 96×192 sky canvas inside `skyFor()`, and remove the separate `drawVignette()` call from the frame. That leaves one stretched full-screen blit instead of two; the ablation shows 41 → 24 ms.
2. [P1] Store frame 4 (SKIP) shows two overlapping text pops, "NICE ARM" on top of "ACROSS THE COVE" over the sun, and the run is not repeatable.
   - Where: `tools/store-screens.mjs`, the `skip` frame's `a.start()`.
   - Fix:
     - pass a fixed seed (`a.start(<seed>)`)
     - capture only once no text pop is alive (wait about 0.8 s after the last pop, or clear the effects' pop list just before `page.screenshot`)
     - regenerate both sizes.
3. [P1] Game music plays over the player's own Spotify or podcast. `window.__gameBoxNative.otherAudio` is injected (`ios/GameBox/GameView.swift:42-43`), but no JS reads it.
   - Where: `src/extras.js` `unlock()` and `skip/src/main.js` `unlockAudio()`.
   - Fix:
     - when `window.__gameBoxNative?.otherAudio` is true, call `music.setMuted(true)` and keep the SFX.
     - The flag is a snapshot taken when the web view is created, so also refresh it on `didBecomeActive` via `evaluateJavaScript` in `GameView.swift`.

## Polish for v1.1
- All the new-best and milestone stings are hard-coded C–E–G–C. Over SKIP's D-major and Sky Temple's G-lydian pads (both have C♯, and the pad keeps playing in 'over' mode) they clash. Derive the stings from `music.song.root` and the scale.
- POP's lead has drifted low: 34% of notes are under 262 Hz (median 330 Hz), underneath the pad. Sky Temple's lead jumps more than a fifth on 16% of notes. The cause is the `|| a - b` tie-break in `notesFor`; tie-break toward the register centre, clamp the lead to root+12…root+31, and set POP's `lead.octave` to 2.
- Make ORBIT call `music.setTempo(118 + 22*speedNorm)`, and give MELT's square-wave SFX (ice, ice crash) the 4 kHz low-pass the other games' `tone()` has.
- SKIP 'high': rebuild sky and water on alternate frames to remove the one remaining 52 ms frame. Port `adapt()` into MELT and Sky Temple.
- UI and store leftovers:
  - MELT title offset: `calc(var(--safe-top) + 160px)`
  - Sky Temple `--surface: rgba(12,20,44,.86)`
  - define `--ink-dim`
  - a sticky, blurred hub `.top`, because scrolled cards currently pass under the Dynamic Island
  - move the switcher handle off SKIP's buttons
  - a CI check of the store PNG counts and sizes
  - render the store frames on macOS (SF Rounded).

Notes: I only read and rendered; the repo is unchanged. Both of my worktrees (`r2ta` and the 4120b94 baseline `r2ta-base`) are removed. The main checkout shows modified `art/icon-*.png` files in its working tree; I did not make those changes. The harness, screenshots and contact sheets are in the scratchpad (`/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad`):
- harness: `r2ta-tools/{perf,ui,iap,song,lead,sheet}.mjs`
- screenshots: `r2ta-shots/`
- contact sheets: `r2ta-sheet-390.png`, `r2ta-sheet-375.png`, `r2ta-sheet-iap.png`, `r2ta-store-sheet.png`.