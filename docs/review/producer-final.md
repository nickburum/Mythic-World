# Producer — final vote

I changed nothing in the repo. During this run HEAD moved from a981352 to **c476ec6**, a docs-only commit that adds `docs/review/round3-artist3-final.md`. The working tree is clean.

`npm test` passed **93/93**: root 15, melt 16, skip 24, pop 14, orbit 9, sky-temple 15. I did not run the render tools.

CI (GitHub Actions) at a981352 passed all three jobs: unit tests and web build, browser smoke tests, and the iOS shell compile. The iOS compile also passed at caf72d2, the commit that changed the Swift consent code. CI on c476ec6 was still queued when I checked; it only adds a doc.

## Tally (seat → latest vote → source)
| Seat | Latest vote | Source |
|---|---|---|
| Engineer 1 | SHIP | round3-confirmation.md:13 |
| Engineer 2 | SHIP | round2-engineering.md:5 |
| Engineer 3 | SHIP | round2-engineering.md:6 |
| Artist 1 | SHIP | round3-confirmation.md:14 |
| Artist 2 | SHIP | round2-art.md:7 |
| Artist 3 | SHIP | round3-artist3-final.md:3 (replaces NOT YET at round3-artist3.md:3) |
| Designer 1 | SHIP | round3-confirmation.md:23 |
| Designer 2 | SHIP | round3-confirmation.md:27 |
| Designer 3 | SHIP | round2-design.md:7 |
| Technical Artist 1 | SHIP | round3-confirmation.md:22 |
| Technical Artist 2 | SHIP | round2-techart.md:5 |
| Technical Artist 3 | SHIP | round2-techart.md:6 |

**12 of 12 seats vote SHIP. None vote NOT YET.**

## Open P0/P1 check
No P0 was raised in rounds 2 or 3. Here is where each P1 stands:

**Fixed and checked by the seat or panel that raised it:**
- **Engineering 1–2:**
  - Consent is now required on every ad load, and Settings has a Privacy choices button.
  - The age-band boundary is fixed.
  - Both checked at round3-confirmation.md:32-33.
- **Design 1–6:**
  - The daily run can no longer be lost.
  - SKIP lily pads now warn before they end a run.
  - Levels unlock colour looks.
  - Screen readers announce the game cards as buttons.
  - "Show tutorials again" works.
  - MELT near-misses pay through a heat multiplier.
  - All checked at round3-confirmation.md:53-67.
  - Two changes differ from spec, and Designer 1 accepted both when voting SHIP. SKIP's timing windows are 0.10/0.20 s instead of 0.08/0.18. A timed player's median run is 27.6 s against the 30 s target.
- **Tech art 1:** MELT runs at 26.0 ms against the 36 ms target (round3-confirmation.md:50).
- **Art 2, 4 and 5:** frame 1 of the store set is now a game, the box icon was redrawn, and the SKIP icon was redrawn (round3-confirmation.md:39-42).
- **Art 6–7, plus Artist 3's two new round-3 P1s:** SKIP's sink and pad animation, the Sky Temple tagline, the tagline sitting on the tower, and +SPEED printing over PERFECT. All were fixed at a981352 (round3-artist3-final.md:99-119).

**Not formally closed by the seat that raised it.** None of these blocks the release:
1. **Art 3, POP store frame (PARTIAL at round3-confirmation.md:40).** One burst ring is cut off at the left edge, and a bubble covers the score "31". No later commit fixes it. Artist 1 voted SHIP and called the leftovers "minor" (:19), but neither Artist 1 nor `docs/LAUNCH.md` lists it as deferred. It is cosmetic and the main moment ("CHAIN ×4 +20") is fully in frame. **Doesn't block.** It goes on the v1.1 list.
2. **Art 1, remaining text overlaps outside SKIP.** POP's "FRENZY!" overlaps a combo pop in 3 of 2,340 frames (round3-confirmation.md:38). It is not in any store frame and Artist 1 accepted it. **Doesn't block.**
3. **Tech art 2, seeded SKIP store frame (raised by Technical Artist 3).** It is fixed in code at `tools/store-screens.mjs:42`, which uses seed 4242 and waits until at most one text pop is on screen. Artist 1 confirmed a single "PERFECT ×7" (round3-confirmation.md:16). Technical Artist 3 never re-checked it, but that seat was already SHIP and said no re-review was needed (round2-techart.md:6). **Closed.**
4. **Tech art 3, game music playing over the player's own music (raised by Technical Artist 2).** It is fixed in code: `src/extras.js:38,168`, `skip/src/main.js:125`, and the iOS app refreshes the flag on return (`GameView.swift:72`). Technical Artist 2 never re-checked it, but said it could land without another review (round2-techart.md:5). It can only be proven on a phone, and the device checklist covers it ("sound mixes with your music", CHECKLIST §E). **Doesn't block.**
5. **Three round-1 P1s that were still open in round 2:** the store frames are rendered with a fallback font instead of SF Rounded, the web-only switcher handle sits on SKIP's buttons, and the MELT logo crosses the ceiling rail at 390 px. Technical Artist 3 moved all three to v1.1 (round2-techart.md:200-207) and voted SHIP. The font item is also in LAUNCH.md's deferred list. **Deferred by the seat.**

**Small items engineering still owes.** None blocks the verdict:
- Add Engineering's pinch-zoom check to the TestFlight list in `store/CHECKLIST.md` §E. Engineering asked for it at round2-engineering.md:72 and it is missing. The check: a stray pinch or double tap on a game's title, result or pause screen must not leave the game stuck zoomed.
- The store screenshots were last rendered at 88616c9, before SKIP and Sky Temple changed in fcf81ba and a981352. Re-render them once on the final commit, ideally on a Mac (which also fixes the font), and check them by eye before upload.
- Confirm CI is green on c476ec6.

## Owner-side launch steps (not blockers to the board's verdict)
1. **Apple Developer:** Team ID, then `bash ios/bootstrap.sh --team <TEAMID> --bundle com.<you>.gamebox`, then run it on your iPhone (CHECKLIST A–B).
2. **App Store Connect** (CHECKLIST C):
   - Create the app record and the five Game Center leaderboards.
   - Fill in App Privacy (Tracking: No) and the age rating (4+).
   - Paste the metadata and upload 7 screenshots at each of the two sizes.
   - Create the non-consumable in-app purchase `com.mythicworld.gamebox.adfree`. Confirm you want this product ID even though the app's bundle ID will be `com.<you>.gamebox`.
3. **Merge the branch to `main`.** Right now the deploy job is skipped on this branch, and the privacy policy URL `https://nickburum.github.io/Mythic-World/privacy/` only goes live once Pages deploys from `main`.
4. **AdMob** (CHECKLIST D): create the app and one rewarded ad unit, paste both IDs into `ios/project.yml:65-66`, publish the GDPR message, and complete the payments profile. Those lines still hold Google's test IDs, and `fastlane release` refuses to ship them.
5. **TestFlight device pass** (CHECKLIST E), plus the pinch-zoom check above. On a real iPhone, confirm:
   - the age question appears, then the Continue ad pays out
   - the Google consent form appears in the EU/UK
   - Go ad-free buys in sandbox, and Restore brings it back
   - game music stays silent while your own music plays
   - Control Center pauses a run
   - scores and streak survive a reinstall
   - a challenge link opens the web version
   - the Today card starts the daily run
6. **Submit and day one** (CHECKLIST F–G): price Free, all territories, then tag `v1.0.0` and watch crash reports.

## v1.1 backlog (top 8, one line each, from the seats' deferred items)
1. **Consent leftovers (Engineer 1):** throw away a preloaded ad when the player withdraws consent, and show Privacy choices whenever Google's consent tool requires it, not only after a game has asked for an ad.
2. **Identical challenge replays (Engineer 2, LAUNCH.md):** SKIP on a fixed 1/120 s step and a second random-number stream in ORBIT. Also fix MELT's heat multiplier, which inflates scores against existing bests.
3. **Fairness (Engineer 2, Designer 1):** scale Sky Temple's perfect window with speed, add human-like play tests for ORBIT and Sky Temple, and keep SKIP's DIP! text up longer than 250 ms.
4. **CI and release hardening (Engineer 3):**
   - Make the iOS job required on release branches.
   - Commit `Package.resolved` so dependency versions stop floating.
   - Fix ORBIT's offline cache, which lists a file it can't find.
   - Add a ~3 s timeout before a weak connection falls back to the offline copy.
5. **Store set (Technical Artist 3, Artist 1):** render on a Mac with SF Rounded, add a CI check of screenshot counts and sizes, and re-capture POP's frame with the burst centred and the score clear.
6. **UX and accessibility (Designers 1 and 3):**
   - Dynamic Type and labels of at least 12 px.
   - SKIP's title starts on a tap, and SKIP's results show "N short of your best".
   - Remove the duplicate Share button.
   - Move the back pill clear of SKIP's leaderboard arrow.
   - A "Start here · POP" card on first launch.
   - Keep daily credit for a run that ends after midnight, refresh the Today card at midnight, and say so when Restore finds nothing.
7. **Audio (Technical Artist 2):** new-best stings in each song's own key, POP's lead line back in its proper range, ORBIT music that speeds up with the game, and a low-pass on MELT's harsh sound effects.
8. **Art and juice (Artists 1–3, Technical Artist 3):**
   - Characters for Sky Temple and SKIP.
   - Sky Temple landing squash, a flash when MELT passes an obstacle, and keep MELT's screen moving through its death.
   - Background depth layers for ORBIT and MELT.
   - The Sky Temple icon on the night background like the others.
   - Fix the MELT title offset and Sky Temple's grey result sheet.

## Producer verdict
**SHIP.** The board agrees v1.0 is ready for the App Store, pending only your account and device steps:
- All 12 seats vote SHIP, and Artist 3, the last NOT YET, moved to SHIP at a981352.
- Every P1 from rounds 2–3 is fixed and checked, or was accepted or deferred by the seat that raised it. The leftovers are cosmetic and not blocking: the POP store-frame clip and the rare FRENZY overlap.
- Tests pass 93/93, and CI at a981352 is green on every job, including the iOS compile of the new consent code.
- The legal check is clean, and the release-guard in `fastlane release` stops the test ad IDs from shipping.

Most of my own round-1 conditions are met: the SKIP, ORBIT and POP simulations, performance at or under 36 ms, a full store set, and the meta layer.

The two conditions that are not met are owner-side by nature: real AdMob IDs and a TestFlight pass on a real iPhone. No reviewer has run the rewarded ad, the consent form, the purchase or the music check on hardware. So treat CHECKLIST §E, with the pinch-zoom check added, as the gate before you press Submit.

On the engineering side, before you upload: add that check to the list, re-render the store screenshots on the final commit, and confirm CI on c476ec6.