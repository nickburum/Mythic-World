# Producer backlog — round 1

## Board scorecard
| Reviewer | Headline scores | Verdict |
|---|---|---|
| Engineer 1 (native/store) | Stability 6 · Perf 7 · Native 4 · Store-ready 4 | NOT YET (dead rewarded ad) |
| Engineer 2 (game feel, simulated) | Fun in first 30 s, by game: Sky 8, MELT 7, POP 7, ORBIT 5, SKIP 4. Fairness: SKIP 3 | NOT YET (SKIP timing, POP switch deaths) |
| Engineer 3 (QA/CI) | First session 6 · Devices 6 · Build/CI 4 | NOT YET |
| Artist 1 (icons) | Icons 4–7 (SKIP and POP 4) · Family 4 · Store appeal 4 | NOT YET (SKIP and POP icons fail at 60 px) |
| Artist 2 (in-game art) | Weakest charm scores: POP 3, ORBIT 3 · Readability 5–7 | NOT YET (MELT contrast, POP hues, no characters) |
| Artist 3 (juice) | Hub transitions 2 · Failure feedback: POP 2, ORBIT 3, SKIP 3 | NOT YET |
| Designer 1 (loops) | Best: Sky Temple 9/7/6/6 · worst: POP 6/3/3/3 | NOT YET |
| Designer 2 (meta) | D1 6 · D7 2 · D30 1 · Honesty 7 | NOT YET (no meta, no daily, no IAP) |
| Designer 3 (UX/a11y) | First fun 4 · Clarity 6 · Navigation 6 · A11y 3 | NOT YET (slideshow, score under pill, POP colour-blind) |
| Tech Artist 1 (perf) | Frame time: Sky 3, MELT 4, SKIP 5, POP 5, ORBIT 6 | NOT YET |
| Tech Artist 2 (audio) | Mix 4–6 · Music 5–7 | NOT YET |
| Tech Artist 3 (chrome/store) | Hub 6 · Chrome 5 · Small phone 5 · Store assets 3 | NOT YET |

All 12 reviewers voted NOT YET. No reviewer called a game unfixable.

## Done since review
- Rewarded ad delegate is now retained, so Continue completes on device (E1 P0). **d95059d**
- Deep links are JS-safe and survive a cold start; challenge links point at the public web build (E1 P1). **d95059d**
- The app reloads after a WebContent crash, launches on a dark screen, and uses the ambient audio session (E1, TA2). **d95059d**
- Reset works inside WKWebView and also clears the iCloud copy (E1 P1). The timer-rearm bug is fixed in the uncommitted tree (E3 P1). **d95059d** + uncommitted
- Shared haptics bridge in all five games and the hub (E1 P1). **d95059d**
- Audio resumes after iOS 'interrupted' (E1, TA2 P0). **d95059d**
- Audio mix (TA2 P0×2, most P1/P2): drums bypass the delay, master compressor, ducking, audible bass, Sky Temple chord fix, POP lead, ORBIT warning cue, softer fail sounds, new-best and game-over stings, fade on leave. **d95059d**
- Cloud push now merges, and hub sound state follows the in-game mute (E1 P2). **d95059d**
- Continue sits under Play again and is offered from the 4th run (D2, D3). **d95059d / 207eb83**
- UMP consent added, ATT key dropped, COPPA age gate before any ad (E1 P1, partial: release ad IDs are still the test IDs). **d95059d / 6783cf9**
- POP: busier opening, chain pops, recolour plus grace period on target switch, glyphs for colour-blind players, opaque bubbles on an indigo stage, swatch character, frenzy, game-over juice, speed cap (D1 P0×2, E2 P1/P2, D3 P0, A2 P0/P1, A3 P0). **398bc76**
- POP performance: background cache, bubble sprites, pixel-budgeted DPR (TA1 P1×2 for POP only). **398bc76**
- Back pill is top-left, 44 px, opacity 0.6. This also clears the score-under-pill collision (D3 P0/P1). **398bc76**
- Shared CSS: score bump, staggered result sheet, new-best pop, springy buttons, reduced-motion fallbacks (A3 P1/P2, partial: only POP triggers the bump). **398bc76**
- In-run coach marks replace the slideshow in all five games (D3 P0, MARKET brief). **207eb83**
- **Uncommitted:**
  - Pause overlay on hide, pagehide and native resign-active (E3 P1).
  - SKIP runs a single rAF loop (E3 P1).
  - Service workers are network-first, delete only their own prefix, and are hash-stamped by build-web.sh (E3 P1×2).
  - Double-tapping a card opens one game; Back returns to the hub (E3 P2).
  - Sheets scroll in landscape (E3 P2).
  - CI builds `dist`, runs smoke tests and compiles iOS (E3 P1).
  - Fastlane fixes: team, VERSIONING_SYSTEM, no `open`; generated paths gitignored (E3 P1).
- Not done: `src/meta.js` is tested but **nothing imports it** (D2, E3 P2).

## Backlog (ordered)
Impact/Effort/Confidence = I (1–5) / E (S ≤1 h, M ≤4 h, L >4 h) / C (1–3).

### Sprint A (must ship)
1. **[P0] Commit and CI-verify the uncommitted tree** — Lead eng — 5/S/3 — the 22 modified files, `src/pause.js`, `.github/workflows/deploy.yml` — The branch is committed, all three CI jobs are green, and Pages serves `dist/` (not `ios/`, `docs/` or `tools/`).
2. **[P0] Wire "Go ad-free" and Restore Purchases, or pull the IAP** — Eng — 5/M/2 — new `src/store.js`, `src/box.js`, `index.html` settings sheet, `src/ads.js`, `src/extras.js` — `StoreBridge.swift` has no JS caller, yet `store/METADATA.md:75` promises "Restore Purchases is in Settings", which is a Guideline 2.1/3.1.1 rejection. Acceptance: in sandbox, Buy sets `gamebox.adfree` and the Continue ad offer disappears; Restore after reinstall brings it back.
3. **[P0] Release AdMob IDs** — Eng + Producer (AdMob account) — 5/S/3 — `ios/project.yml:66-67` — Release Info.plist has non-test `GADApplicationIdentifier` and `GADRewardedUnitID`; Debug keeps Google's test IDs.
4. **[P0] Real-iPhone TestFlight pass** — QA/Eng — 5/M/3 — whole app — A checklist is signed off on a physical iPhone: rewarded Continue, UMP form, age gate, IAP sandbox, cold-start challenge link, pause from Control Center, audio after a call, haptics in all five games, no white launch flash.
5. **[P0] SKIP timing fairness** — Eng — 5/M/2 — `skip/src/core/skip.js`, `config.js`, tests — Changes:
   - add a late-tap window of 0.10 s
   - widen Perfect to 0.14 s and Good to 0.28 s
   - one tap per hop
   - cap `VX_MAX` at 26
   - `PERFECT_BOOST_CAP` 1.2
   - hint copy

   Acceptance: a σ 40 ms human sim reaches a median of ≥80 m (currently 63 m); 50 ms tap-mashing never earns a Perfect.
6. **[P0] ORBIT: a wall never closes on the comet** — Eng — 4/S/3 — `orbit/src/core/orbit.js`, `orbit/src/main.js` — Changes: keep a blocker in `warn` while the comet overlaps it; `BLOCK_WARN` 1.2 s; first block at 2.5 s; warning cue plays when the block spawns. Acceptance: test shows 0 deaths from closing walls over 50 seeds × 60 s.
7. **[P0] MELT first-run fairness** — Eng — 4/S/3 — `melt/src/core/melt.js`, `config.js` — Changes: first two obstacles are `beam`; a 1-deep tap buffer replaces dropping the second tap (cooldown 0.06 s). Acceptance: no first-run spike wall before 4 s, and a double-tap 70 ms apart applies both taps (tests).
8. **[P0] Store screenshot set** — Tech Art — 5/M/3 — `tools/store-screens.mjs`, `store/screens/` — Acceptance:
   - add a Sky Temple frame; fixed seeds; both 1290×2796 and 1284×2778 committed
   - device frame fully in view
   - pill and mute hidden; seeded bests shown
   - rendered on macOS (SF Rounded)
   - CI checks the PNG counts and sizes.
9. **[P0] SKIP and POP icons pass the 60 px test** — Artist — 5/M/2 — `skip/art/`, `pop/art/`, per Artist 1's style guide — At 60 px on white and on #0B1020, three reviewers name the hero shape in one second.
10. **[P0] Frame-time fixes** — Tech Art — 4/M/3 — Changes:
    - `melt/src/render/renderer.js`: cache sky and vignette
    - `skip/src/render/renderer.js` `ensureLayers`: reuse canvases, threshold 0.03
    - `sky-temple/src/render/renderer.js`: cache vignette and sky; ringless `shadowBlur` in `effects.js`
    - `alpha:false` and the POP DPR budget formula in MELT and Sky Temple

    Acceptance: under 4× CPU throttle each game is ≤36 ms average, and SKIP has no JS spike >50 ms.
11. **[P1] Fix MELT control copy** — Designer — 3/S/3 — `melt/index.html:14`, `melt/docs/DESIGN.md:62-64` — "Hold to heat" appears nowhere; the copy reads "Tap to change state: ice, water, steam."
12. **[P1] First-launch hero and stable hub** — Eng — 4/S/3 — `src/box.js heroGame()`, `src/games.js` — The first-launch hero is POP or Sky Temple; grid order never changes after a run; `scrollTop` is 0 on close; "New" replaces `best —`.
13. **[P1] MELT obstacle contrast** — Artist — 4/M/2 — `melt/src/core/palette.js`, `melt/src/render/renderer.js` — Cap sky saturation and lightness; outline and rim every obstacle. Spikes, geyser and glass reach ≥3:1 against the sky at every temperature (screenshot check).

### Sprint B (should ship)
14. **[P1] Meta MVP: wire `src/meta.js`** — Eng + Designer — 5/L/2 — `src/extras.js onOver`, `src/box.js`, `index.html` — Changes: +XP line and bar on the result sheet; hub strip showing LV, bar and next unlock; a Today card with a seeded daily run and streak dots. Acceptance: XP persists through a relaunch, and the daily seed is identical on two devices on the same date. Without this, Designer 2's D7 score of 2 stands.
15. **[P1] Accessibility basics** — Eng — 4/M/3 — `src/extras.js`, `src/share.js`, `index.html`, `css/*.css` — Changes:
    - dialogs get `role=dialog` and move focus
    - `aria-live` on the toast; `frame.title = g.name`
    - mute buttons use `aria-pressed`; lives are labelled
    - `--ink-3` ≥0.55 and labels ≥12 px
    - remove `user-scalable=no`
    - reduced motion gates the shakes

    Acceptance: VoiceOver can complete one run and return to the hub.
16. **[P1] Hub → game transition** — Tech Art — 4/M/3 — `src/box.js`, `css/box.css` — The player slides in over a dimmed home, a game-icon loader replaces the spinner, the iframe cross-fades in, and Back reverses the motion. No frame is blank navy for more than 100 ms.
17. **[P1] Failure and success juice in SKIP, ORBIT and Sky Temple, plus score bump in SKIP/ORBIT/MELT** — Tech Art — 4/M/3 — `orbit/src/main.js` (shake, flash, hit-stop), `skip/src/main.js onSink`, `sky-temple/src/main.js onPlace/onPerfect` (landing squash, combo size and colour ramp) — Every death has shake or flash within 100 ms, and combos ×5 and up look different from ×2.
18. **[P1] Risk scoring** — Designer + Eng — 4/M/2 — ORBIT momentum multiplier (`orbit.js`), MELT heat multiplier with `NEAR_MISS_WINDOW` 0.4, SKIP red "DIP!" marker on pad landings plus late-run pad density — In simulation, a gem-chaser outscores a dodger by ≥30%, and MELT close calls fire in ≥1 per novice run on average.
19. **[P1] "How close" line on game over** — Designer — 3/S/3 — `src/extras.js` — The result sheet shows "N short of your best" or the next milestone, with a run-versus-best bar.
20. **[P1] SKIP title and HUD** — Eng — 3/M/3 — `skip/index.html`, `skip/css/style.css`, `switcher.js` — A tap on the lake starts a run; the menu becomes Play plus icon buttons; the distance uses the `.score` style; "How to play" stays on one line at 375 px; the switcher handle no longer covers buttons.
21. **[P1] Challenge determinism** — Eng — 3/M/2 — Changes: MELT spawns from a counter instead of view width; ORBIT and POP use two RNG streams; SKIP runs a fixed 1/120 s step. Acceptance: the same seed gives the same obstacle sequence at 390 and 1024 px. Until this lands, soften "Same run, same luck".
22. **[P2] CSS defects** — Eng — 2/S/3 — `css/box.css .hero-text > b`, MELT `.title-block` offset, Sky Temple `--surface` and `.combo:empty`, remove the duplicate `#share` in MELT/Sky Temple.
23. **[P2] Icon family pass for ORBIT, Box, MELT and Sky Temple** — Artist — 3/L/2 — All six icons follow Artist 1's 10-line guide.
24. **[P2] Human-policy fairness tests and Sky Temple tolerance scaled to speed** — Eng — 3/M/3 — `tests/`, `sky-temple/src/core/` — A σ 50 ms jitter sim reaches ≥15 floors on 20 seeds.

### Later (v1.1)
- Characters for MELT reactions, ORBIT eyes, a Sky Temple monk and SKIP frogs (A2 P0, L).
- Sky Temple offering stones (D1).
- Theme and skin unlocks (D2).
- Associated Domains and universal links (E1).
- MELT cavern parallax and ORBIT nebula, ring and star fix (A2).
- Music loops and hats (TA2 P2).
- Text-pop sprite cache (TA1 P2).

## Cuts
- **Double-XP rewarded ad (D2):** a second ad surface before IAP is proven. Revisit with meta v1.1.
- **D2's full unlock ladder (L2–L40, weekend ×1.5):** v1 ships XP, level and daily only.
- **Shared tokens.css and the spacing-scale refactor (TA3 P2):** players can't see it.
- **Landscape layouts beyond scrolling sheets (E3/TA3):** the iOS app is portrait-locked.
- **Self-hosted webfont (TA3):** rendering screenshots on a Mac solves it without a new asset.
- **TA1 micro-optimisations under 2 ms (mountain gradients, `stoneColors` memo):** below measurement noise.
- **Frog characters on SKIP (A2):** SKIP is already the best-looking game; spend the art time on ORBIT.

## What the board needs to see to vote SHIP
- [ ] Sprint A items 1–13 merged and CI green, with a TestFlight build number.
- [ ] Device checklist (item 4) signed off: Continue pays out, IAP buy and restore both work, no ads before the age gate.
- [ ] Re-run sims: SKIP human median ≥80 m, ORBIT 0 closing-wall deaths, POP ≤1 escape death in 60 s.
- [ ] Perf table re-measured: every game ≤36 ms at 4× throttle.
- [ ] Store set: 6+ frames × 2 sizes, Sky Temple included, both 60 px icons passing.
- [ ] A decision on meta: either item 14 lands, or the board accepts shipping v1 without it and a v1.1 date is set.

## Producer verdict
NOT YET: the ad, audio, POP and onboarding blockers are fixed, but an IAP with no buy or restore UI, test ad IDs, an incomplete store set and a SKIP that doesn't reward human timing would each cost a rejection or the first session. Sprint A is about 3–4 engineer-days.

---
I changed no repo files. Evidence:
- `git log 4120b94..HEAD`, `git diff` and `git status` (the working tree includes `.github/workflows/deploy.yml` and the untracked `src/pause.js`).
- greps confirming:
  - `StoreBridge` has no JS caller.
  - `ios/project.yml:66-67` still holds the test AdMob IDs.
  - `tools/store-screens.mjs` has no Sky Temple frame, and only `store/screens/1290x2796` exists.
  - The SKIP, ORBIT and MELT tuning constants and the MELT/Sky Temple per-frame gradients are unchanged.
  - Nothing imports `src/meta.js`.
- `npm test` passes.