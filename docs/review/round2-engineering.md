# Engineering panel — round 2

## Seat votes
- Engineer 1: NOT YET. All 10 of my round-1 native and store findings are fixed, but two small ads-compliance gaps (EEA consent bypass with no way to change consent, and the age-band boundary) need to land in the same build as the real AdMob IDs. Neither needs an account or a device.
- Engineer 2: SHIP. Every P0/P1 fairness target is met in independent simulation (SKIP human median is 242 m against an 80 m target; ORBIT has 0 closing-wall deaths; POP and MELT fixes are tested), and what's left is P2 (Sky Temple tolerance, ORBIT and SKIP challenge determinism).
- Engineer 3: SHIP. Tests pass 91/91, all 6 smoke runs are clean, pause works in all five games, SKIP runs one loop, and the service workers are prefix-scoped and hash-stamped by a reproducible build. Remaining CI and tooling items are P2.

## Round-1 findings: verified fixed / still open (one line each)
**Engineer 1**
- [P0] Rewarded Continue dead on device: **fixed.** The watcher is retained (AdsBridge.swift) and ads.js:52 has a 60 s timeout. With a mocked bridge, load → show → onResult → revive worked and the next ad was preloaded.
- [P1] Challenge links dead from the app: **fixed.** `PUBLIC_BASE` is used whenever the origin isn't http(s) (challenge.js:73-79), and `handle(deepLink:)` accepts any host. Associated Domains is still v1.1.
- [P1] Deep-link JS injection and lost cold-start links: **fixed.** The hash is filtered to safe characters and JSON-encoded, and `CurrentValueSubject` plus `pendingLink` are flushed in `didFinish`.
- [P1] Reset was a no-op and iCloud restored the scores: **fixed.** Reset is a two-tap in-page confirm, and `cloud.remove` posted 12 `remove` messages (verified).
- [P1] Haptics only worked in SKIP: **fixed.** The shared `src/haptics.js` bridge is used by the hub and all five games.
- [P1] No recovery after a WebContent crash: **fixed.** `webViewWebContentProcessDidTerminate` reloads the page.
- [P1] Ads config not release-ready: **fixed in code.** UMP is added, the ATT key is dropped, Debug uses the test unit via `#if DEBUG`, and `fastlane release` refuses test IDs. The real AdMob IDs are still owner-side (CHECKLIST D).
- [P2] Audio dead after `'interrupted'`: **fixed.** No `=== 'suspended'` checks remain.
- [P2] iCloud clobber and hub/game sound drift: **fixed.** `push()` merges against the last cloud copy (cloud.js:181), and `close()` re-derives the sound setting.
- [P2] White launch flash and pill blur: **fixed.** There is a `LaunchBackground` colour set, and the blur is gone from `.back-pill`.

**Engineer 2**
- [P0] SKIP timing: **fixed.** There is a 0.12 s late window and Perfect/Good are 0.14/0.28 s. On 60 fresh seeds, a σ 40 ms human tapping 30 ms late has a median of 242 m; one tapping 80 ms late reaches 113 m; never tapping reaches 61 m.
- [P1] POP target-switch deaths: **fixed.** Recolour plus a grace period (pop.js:103), and a human-policy test covers it.
- [P1] ORBIT walls closing on the comet: **fixed.** `BLOCK_WARN` is 1.2 s and a wall stays in warning while the comet overlaps it. The test shows 0/50, and my own random-reversal sim also had 0 closing-wall deaths.
- [P1] SKIP tap-mashing and no speed ceiling: **fixed.** One tap per hop, `VX_MAX` 26, boost cap 1.2. Mashing every 50 ms gives a median of 29 m, worse than not tapping.
- [P1] MELT course depends on screen width: **fixed.** Generation uses a spawn counter, with a 390 vs 1024 px test.
- [P1] MELT drops the second tap of a double tap: **fixed.** A 1-deep buffer with a 0.06 s cooldown.
- [P2] ORBIT escalation invisible: **fixed.** `SPEED_RAMP` 0.03, a third wall from 30 gems, momentum up to ×8.
- [P2] POP combo decorative, speed uncapped: **fixed.** `SPEED_CAP` 190, chain pops, frenzy.
- [P2] Sky Temple perfect window shrinks with speed: **still open.** `PERFECT_TOLERANCE` is still an absolute 0.085 (sky-temple/src/core/config.js:20).
- [P2] MELT first obstacle needs a tap at 1.9 s: **fixed.** The first two obstacles are beams.
- [P2] Challenge determinism: **partly fixed.** MELT is fixed and POP has a separate target RNG. ORBIT still uses one RNG stream (orbit.js:43). SKIP still uses a variable time step: the same seed gives a different distance at 60 vs 120 Hz on 18/20 seeds.
- [P2] Fairness tests use oracle autopilots: **mostly fixed.** SKIP, POP and MELT now test human-like play. The ORBIT test never reverses, and Sky Temple has no human test.

**Engineer 3**
- [P1] SKIP adds a game loop per app switch: **fixed.** 60 frames/s after 3 hide/show cycles.
- [P1] No pause on interruption: **fixed.** In all five games, hide, pagehide and `gamebox:pause` show the overlay and freeze game time, and hub `pauseGame()` forwarding works. The resume tap does not leak into the game.
- [P1] Reset re-arm wipes scores: **fixed.** `disarm()` clears the timer and the armed state.
- [P1] Service-worker versions bumped by hand: **fixed.** Network-first, hash-stamped by build-web.sh; the build is byte-reproducible (1.9 MB, 109 files).
- [P1] Workers delete other games' caches: **fixed.** Each worker deletes only its own prefix.
- [P1] CI doesn't run the shipping build: **fixed.** It builds `dist`, runs every smoke test, compiles iOS, and Pages serves `dist`. The iOS job is still `continue-on-error`.
- [P1] TestFlight lane: **mostly fixed.** `VERSIONING_SYSTEM`, team required, no `open`, generated paths gitignored. **Still open (P2):** no committed `Package.resolved`, so SPM dependencies float.
- [P2] Double tap opens the game twice: **fixed.**
- [P2] Landscape sheets off-screen: fixed in the diff; I did not re-measure.
- [P2] Smoke tools can test the wrong copy: **partly fixed.** They honour `PORT` now, but there is still no per-run token check and each run still rewrites the committed PNGs.
- [P2] `meta.js` not wired: **fixed.** XP, level, daily and streak work end to end (verified on a date whose daily game is ORBIT).
- [P2] Browser Back needs two presses: **fixed.** `close()` calls `history.back()` when `open()` pushed the entry.

## New blockers (only P0/P1, max 8)
- **[P1] EEA consent isn't enforced after an unfinished consent flow, and players can't change consent later.**
  - Where: ios/GameBox/AdsBridge.swift:58-80 (`startIfNeeded` / `load()`).
  - Repro: if the UMP form fails or the message isn't published, `canRequestAds` is false. The first `load()` returns without calling `then`, but `started = true` stays set. The next game opened posts `load` again, so `startIfNeeded {}` calls `then` at once and `GADRewardedAd.load` runs with no consent. There is also no privacy-options entry anywhere (no `privacyOptions` in ios/, src/ or index.html).
  - Fix:
    - In `load()`, guard on `UMPConsentInformation.sharedInstance.canRequestAds` for non-child bands.
    - Re-run `requestConsentInfoUpdate` instead of trusting `started`.
    - When `privacyOptionsRequirementStatus == .required`, add a "Privacy choices" button in Settings that calls `UMPConsentForm.presentPrivacyOptionsForm(from:)` through the `ads` bridge.
- **[P1] A child can be classed as a teen at the age gate.**
  - Where: src/ads.js:18 (`ageBandFor`).
  - Repro: the gate asks only for the birth year, and `age = thisYear - birthYear`. In 2026, picking 2013 gives 13, so the band is `teen` (not child-directed, PG ads), but anyone born after today's date in 2013 is still 12.
  - Fix: `age <= 13 ? 'child' : age <= 16 ? 'teen' : 'adult'`, or also ask for the birth month. Verified for comparison: picking now − 12 correctly gives `child` and `childDirected: true`.

## Polish for v1.1 (max 5 one-liners)
- **Continue double-credits XP:** `extras.onOver` calls `awardRun` on every death (src/extras.js:170). One continued ORBIT run of 23 points earned +49 then +94 XP, counted 2 runs and gave "+25 best" twice. Fix: credit only the score gained since the last award in a run.
- **A refund never removes ad-free:** `gamebox.adfree` is in `SYNC_KEYS` and merges as boolean OR (src/cloud.js:113/123). Verified: after StoreKit sends `onEntitlement({adfree:false})`, the next `push()` sets it back to `true`. Fix: drop it from `SYNC_KEYS` and let StoreKit be the only source.
- **Challenge determinism and Sky Temple timing:** SKIP fixed step (1/120 s), a second RNG stream in ORBIT, Sky Temple tolerance `max(0.085, speed*0.035)`, and human-policy tests for ORBIT (with reversals) and Sky Temple.
- **CI and caching:** make the iOS job required for release branches (not `continue-on-error`); commit `Package.resolved`; remove `./src/render/effects.js` from orbit/sw.js ASSETS (a precache miss); add a ~3 s timeout to network-first fetches so a weak connection falls back to the cache.
- **Daily and store edge cases:** Restore gives no "nothing to restore" feedback; the Today card doesn't refresh across midnight while the hub is open; a daily run that ends after midnight loses its daily credit (src/progress.js:38).

**Still needs the owner's accounts or a physical iPhone (in store/CHECKLIST.md, not blocking):**
- Real AdMob IDs and a published GDPR message.
- The App Store Connect IAP record (product ID `com.mythicworld.gamebox.adfree` while the bundle is `com.nickburum.gamebox`; allowed, just confirm it is intended).
- A TestFlight device pass. Add one check to it: the hub viewport now allows zoom (3ed3b78), and in WKWebView the top-level viewport governs the game iframes while `scrollView.isScrollEnabled = false`. Confirm that a stray pinch or double tap on game overlays (title, result sheet, pause) can't leave the game stuck zoomed. My Chromium pinch emulation couldn't show this either way.

**How this was checked:**
- `npm test`: 91/91 pass. `PORT=8600 npm run screens:all`: all 6 runs report no page errors.
- Two web builds were byte-identical, and every worker is stamped `<prefix>-vN.50eb2792`.
- Scratchpad scripts: independent SKIP and ORBIT sims, a daily rotation over 4 years (never the same game two days running, even spread), and Playwright QA of pause, XP, the mocked ads/store/cloud bridges, the daily run and reset.

The r2eng worktree is removed. I modified no repo files. The main checkout shows modified `art/icon*` files and other reviewers' r2des/r2ta worktrees; neither is mine.
