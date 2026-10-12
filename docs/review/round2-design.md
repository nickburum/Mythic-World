# Design panel — round 2
Build reviewed: c52850f, in a detached worktree that has since been removed. I changed no repo files; the uncommitted changes in the main tree belong to other people. I played in headless Chromium at 390×844 and 375×667 with touch emulation and real taps. The bots read game state but tapped with human-like delays. The clock rolled over during the session, so I saw two dailies: POP on 2026-10-11 and MELT on 2026-10-12. Scripts and screenshots are in `/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/r2des-run/` (s1–s6.cjs, shots/sheet.png, shots/sheet2.png).

## Seat votes
- Designer 1: NOT YET — POP and ORBIT are now real loops, but SKIP is a lily-pad lottery: all 5 real runs ended on a pad within 4–13 s, and blind mashing (156 m) went further than timed play (124–141 m).
- Designer 2: NOT YET — the daily, XP and streak layer works, but most players will tap the screen or the big PLAY on the game's title, which starts a normal run and quietly drops the daily. Levels also unlock nothing, so D7 still has little to pull on.
- Designer 3: SHIP — two taps to live play, coach marks instead of a slideshow, score clear of the back pill, POP glyphs, dialogs, live regions and reduced motion all hold up; the a11y items left are one-line fixes listed below.

## Round-1 findings: verified fixed / still open (one line each)
**Designer 1 (core loops)**
- POP's first 30 s mostly waiting — FIXED: 59 taps in a 23 s run, frenzy fired, a colour switch arrived early.
- POP chain pop and risk — FIXED: best combo ×17–19; waiting for clusters works; the "Touching bubbles pop together" coach mark fires.
- ORBIT gems decorative — FIXED: the momentum multiplier reached ×5, and score now tracks play (32, 36, 89) rather than survival time.
- MELT close-call reward never fires — STILL OPEN: 0 close calls in 6 runs, and there is no heat multiplier.
- SKIP late-run escalation — STILL OPEN: PAD_GAP is still 18–34 m and DAY_LENGTH 320, though runs now end too early to reach it.
- SKIP pad deaths not signalled — STILL OPEN: 5 of 5 runs ended on a pad; the only teaching is the line on the result sheet after death.
- Sky Temple offering stones — DEFERRED to v1.1; streaks now escalate (×22 seen).
- "How close" line on game over — FIXED in POP, Sky Temple, MELT and ORBIT ("So close · 17 short of your best"); still missing in SKIP.
- MELT control copy — FIXED: "Tap to change state. Ice, water, steam."
- MELT harsh first runs — FIXED: the first two obstacles are beams, and the first hazard arrives at 4.4 s with an in-world "FLOAT" label.
- SKIP title doesn't start on a tap — STILL OPEN: the seven-item menu is unchanged.
- POP target shown only as a small word — FIXED: the HUD reads "POP ♥ ROSE" and every bubble has a glyph.

**Designer 2 (meta, retention, monetisation)**
- Persistence and meta — FIXED: XP, levels and the run counter are stored, and the new keys are in cloud SYNC_KEYS.
- Daily — FIXED: Today card, shared seed, streak and seven dots; retries replay the same seed. There is a new trap, blocker 1.
- IAP — FIXED in the UI: "Go ad-free · price" with "No subscription" copy and Restore, shown in the iOS app only.
- Continue as the primary button — FIXED: an outline button under Play again, offered from the 4th run, once per run. The 3-second test ad and the revive worked.
- SKIP bypasses attachExtras — PARTIAL: SKIP now awards XP and counts the daily, but keeps its own title, settings and Continue, and has no "short of your best" line.
- Next unlock always visible — STILL OPEN: `UNLOCKS` in meta.js is never shown or granted.
- Player tag editable only in SKIP — FIXED: it is in hub Settings; "nb!" is cleaned to "NB".
- Double-XP rewarded ad — CUT by the producer; I agree.

**Designer 3 (UX, onboarding, accessibility)**
- Pre-game slideshow — FIXED: Today → Play → banner Play puts you in live play at tap 2; POP and ORBIT coach marks appear when they matter.
- Score drawn under the back pill — FIXED: the pill is top-left, 44 px.
- POP unplayable with colour-blindness — FIXED: glyphs on the bubbles and in the HUD.
- First-launch hero was MELT — CHANGED: the Today card now leads and rotates daily, so on 2026-10-12 a new player's first game is MELT (polish 1).
- SKIP title menu — STILL OPEN.
- Back pill too small and faded — FIXED (44 px, opacity 0.6). New issue: on SKIP's leaderboard it sits on top of that screen's own back arrow.
- Hub reshuffles on return — FIXED: fixed grid order, "New" chips, scrollTop reset to 0.
- Type and contrast — PARTIAL: `--ink-3` is now .55, but labels are 11 px (not 12) and type is still px-only, so Dynamic Type is ignored.
- Screen-reader semantics — MOSTLY FIXED: dialogs take focus, toasts and coach marks are live regions, mute buttons report their state, the iframe is titled. Blocker 4 is new.
- Duplicate Share button — STILL OPEN on MELT and Sky Temple.
- Accepting a challenge on an unplayed game shows the slideshow — FIXED.
- Reduced motion — FIXED: POP and Sky Temple shakes are gated, and the hub player, loader and sheets don't animate.

## Scores now (1–10)
- First-session fun: **7** (was 4). Two taps, then POP chains and frenzy; SKIP runs of 4–13 s pull it down.
- Clarity: **7**. Coach marks, in-world MELT labels and death lines are good; two PLAY buttons on daily titles hurt.
- D1 hook: **7**. +XP, level-up, "short of your best" and the streak pill on the result sheet.
- D7 hook: **4** (was 2). A streak and daily exist, but levels unlock nothing, the daily has no comparison, and an idle run keeps the streak.
- Honesty of monetisation: **8**. Opt-in only, never the primary button, from the 4th run, one-time "No subscription" IAP with Restore. Small leak: a continued run is credited twice.
- Accessibility: **6** (was 3).

## New blockers (only P0/P1, max 8)
1. **[P1] The Today card's daily is easy to lose.**
   - Where: `src/extras.js` (`readIncoming`, the `titleTap` handler, `onStart`, where a start with no seed sets `daily.active=false`) and `start()` in POP, MELT, ORBIT and Sky Temple.
   - What happens: from the Today card, the title shows a banner PLAY *and* a big PLAY or "Tap to play". Any tap except the small banner button starts a normal random run and hides the banner. That run gets no daily XP and no streak, and the Today card still says "Play". I reproduced this in POP and saw the same title layout on MELT.
   - Spec: while the page was opened with `#d=`, every start in that visit is the daily, the way SKIP already does it: `currentSeed()` returns `daily.seed` and `onStart` sets `active`. Turn the banner into a label ("Today's run · same for everyone") with no second button.
   - Acceptance: Today → tap anywhere → the result sheet shows "Today's run done".
2. **[P1] SKIP is a lily-pad lottery, and timing barely matters.**
   - Where: `skip/src/core/config.js`, `skip.js` `judge`/`skipTap`, and the landing marker in `skip/src/render/renderer.js`.
   - What happens: 5 of 5 runs ended on a pad at 56–156 m in 4–13 s. Timed taps judged perfect 85–100% of the time with PERFECT_WINDOW 0.14. Mashing at about 3.5 taps/s beat careful play.
   - Spec:
     - When `predictedLandingX()` is on a pad, turn the landing marker red and pulse "DIP!" from 0.45 s out. Show a coach mark on the first 3 pads of the player's lifetime.
     - Set Perfect to 0.08 s and Good to 0.18 s; keep LATE_WINDOW at 0.12.
     - Judge one tap per hop. Ignore taps outside ±Good unless they fall in the dip window.
     - No pads before 100 m in a player's first 3 runs.
   - Acceptance: a σ40 ms human sim has a median run of 30 s or more, and goes at least 2× as far as a 3.5 Hz masher.
3. **[P1] Levels give nothing.** I saw LV 2, 3 and 4 fanfares within about 10 runs, with no reward and no "next".
   - Where: `src/meta.js` `UNLOCKS`/`nextUnlock` (unused), `index.html #level`, `progress.js xpBlock`.
   - Spec: ship 5 unlocks in v1, one palette swap per game at L3, L5, L7, L9 and L11, using each game's existing palette file. Show "Next: <name> · LV n" in the hub level strip and under the XP bar. The level-up pill names the unlock and has an "Equip" button.
   - If the swaps can't make v1, show the "Next" line with a v1.1 date, or drop the "LEVEL N!" pill.
4. **[P1] Screen readers don't announce the game cards as buttons.**
   - Where: `src/box.js render()`, `<button class="card" role="listitem">`.
   - Spec:
     - Put the role on a wrapper: `<div role="listitem"><button class="card">`.
     - Name the Today button: `aria-label="Play today's MELT run"`.
     - Make the week dots `role="img"` with `aria-label="2 of 7 days played this week"`.
     - Give `#level` a readable label, e.g. "Level 3, 72 of 200 XP".
5. **[P1] "Show tutorials again" does nothing.**
   - Where: `src/box.js:103`.
   - What happens: it only clears `gamebox.tutorials`, but coach marks are stored in `gamebox.coach`. Verified: POP's "Tap the … bubbles" coach mark did not come back.
   - Spec: also remove `gamebox.coach`, and reset SKIP's hint flags.
6. **[P1] MELT's near-miss still pays nothing.**
   - Where: `melt/src/core/melt.js`, `config.js`.
   - What happens: 0 close calls in 6 runs; tapping early is always safe and always best.
   - Spec: round-1 heat multiplier. Each close call adds +1, up to ×5; passes score the multiplier; a state change more than 0.8 s before an obstacle takes 1 off; flame meter in the HUD; NEAR_MISS_WINDOW 0.4.
   - Acceptance: at least 1 close call per novice run on average in simulation.

## Polish for v1.1 (max 5 one-liners)
- First launch with `gamebox.runs==0`: show a "Start here · POP · 30 s" card above Today, so new installs on MELT or SKIP days don't open on the hardest game.
- Daily credit needs a real attempt (at least 1 tap and score ≥ 3): an idle 5 s MELT run scored 2 and showed "Today's run done · 1-day streak". Also credit XP once per run: a continued run calls `awardRun` twice.
- Remove the duplicate Share button from MELT and Sky Temple, add `closeLine` to SKIP's result sheet, and cut SKIP's title down to Play plus an icon row (drop its in-game Settings).
- "Reset all scores" leaves XP, level and streak: either rename it "Reset best scores" or add "Reset progress". Also move the hub back pill clear of SKIP's leaderboard back arrow.
- Raise labels to at least 12 px and size type in rem off `-apple-system-body`, so iOS Dynamic Type works.