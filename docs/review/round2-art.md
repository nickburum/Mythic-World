# Art panel — round 2

The panel votes 1 SHIP and 2 NOT YET. Most of the round-1 art work landed. What still fails is mostly the store set and SKIP: one store screenshot ships with two banners printed on top of each other, the first frame is the hub list, the box icon hasn't changed, and SKIP's combos and deaths are the same as in round 1.

## Seat votes
- Artist 1: NOT YET. Store frame 4 has "NICE ARM" and "ACROSS THE COVE" printed on top of each other. Frame 1 at search size is a list of text too small to read. The box icon, which is the only icon the store shows, is still the "four tiles and a play button" from round 1.
- Artist 2: SHIP. All five core loops now read clearly: POP bubbles keep their identity, MELT obstacles have outlines, and POP, ORBIT and MELT now have faces. What's left is overlapping text pops and a cloud covering Sky Temple's tagline; neither hides the play.
- Artist 3: NOT YET. The hub transition, the POP and ORBIT deaths, Sky Temple's combo escalation and the result sheet are now near the chart bar. SKIP is in the store set, yet its PERFECT ×13 looks the same as ×2 and a sink or lily-pad death is still 900 ms of a still frame.

## Round-1 findings: verified fixed / still open (one line each)
**Artist 1 (icons and store art)**
- Store set: FIXED. 7 frames at 1290×2796 and at 1284×2778, Sky Temple included, captions readable (new problems below).
- SKIP icon was a landscape: FIXED, now one stone on the night base. At 60 px it now fails differently (see blockers).
- POP icon was mud: FIXED. A green bubble with a face reads at 60 px and 40 px on both white and #0B1020.
- ORBIT ring vanished at 60 px: FIXED. A thick ring with a halo, a comet with a face and a red arc all read at 40 px.
- MELT icon split the eye: FIXED. One droplet with a face, the ice cube and cloud are minor.
- Box icon reads as generic: OPEN. `art/icon.svg` is unchanged: 240 px tiles around a dark disc with a play triangle.
- Sky Temple icon off-family: OPEN. It is unchanged, the only daylight icon of the six. It still reads well at 60 px.
- Icon family: PARTIAL. Four of six follow the guide.
- Hub cards monochrome: FIXED. Each card has a top rule in its game's colour.
- Dark icons sink into cards: FIXED. `.card img` has a 1 px inset ring.
- First frame per game: PARTIAL. Sky Temple ×12 is strong. The POP chain is clipped, and MELT and ORBIT are dark and empty.
- Title screens lead with text: OPEN. No title screen carries its icon's hero shape.

**Artist 2 (in-game art, readability, character)**
- MELT obstacle contrast: PARTIAL. The lane colour is capped and obstacles have outlines and cores. The spike fill #ff8a94 is still about 2:1 against the hot lane (only the core and outline reach 3:1).
- POP bubbles tinted by the target: FIXED. Bubbles are opaque and carry glyphs, so they read for colour-blind players too.
- Nobody on screen: MOSTLY FIXED. POP's swatch, ORBIT's comet and MELT's ice and steam have faces. Sky Temple has no character, and SKIP's frogs were cut.
- POP background muddy: PARTIAL. The stage is indigo now, but its centre glow takes the target's colour and turns brown-grey on SUN.
- ORBIT looked like a prototype: FIXED for the star grid and the ring. The screen is still about 70% empty navy.
- Sky Temple clouds: OPEN. The flat `rect()` underside is still at `renderer.js:155`, and a cloud still covers the title tagline ("Stack th…").
- Celebrations don't escalate: PARTIAL. Sky Temple ×5 and ×10 and POP escalate; SKIP does not.
- SKIP stone tiny and flat: OPEN.
- MELT cavern flat: OPEN.
- POP HUD has no backing: PARTIAL. A scrim was added, but bubbles still drift across the score ("17").
- Sky Temple stone hue against sky: OPEN, minor. The blue tower sits on a blue sky.

**Artist 3 (motion and juice)**
- Hub → game was a hard cut: FIXED. Frames at +180, +300 and +450 ms show the player sliding in, an icon loader and a cross-fade, with no blank navy frame.
- POP game over had no visual: FIXED. Remaining bubbles pop in sequence, with a ring and shake.
- No combo escalation anywhere: PARTIAL. Sky Temple and POP now escalate; SKIP is still fixed at 22 px.
- Score HUD never moves: PARTIAL. POP and ORBIT bump; SKIP and MELT have no `bump`.
- Result sheet doesn't celebrate: FIXED. Rows stagger in, the XP bar fills, and a "LEVEL 6!" pill and "N short of your best" appear.
- ORBIT failure flat: FIXED. Shake 14, the killing arc flashes and the comet is hidden.
- SKIP sink is 900 ms of nothing: OPEN. The frames at +0, +150 and +400 ms are identical and `onSink` hasn't changed.
- Sky Temple landing squash: OPEN. There is no `landAge` or squash in the code.
- MELT obstacle passes silent, and the 1 s death freeze: OPEN.
- Text-pop overshoot and banners, button springs: PARTIAL. The back pill springs; text pops are unchanged.

## New blockers (only P0/P1, max 8)
1. [P1] **Text pops print on top of each other in three games, and one of them is in a store frame.**
   - Where it shows: "NICE ARM" under "ACROSS THE COVE" in `store/screens/*/4-skip.png`. In play: SKIP "PERFECT ×7" under "×8"; Sky Temple "ABOVE THE CLOUDS" through "×10" and "PERFECT" over "×3"; POP "NOW ★ SUN", "WARM UP" and the chain pop on one line.
   - Files: `addPop` in `skip/`, `sky-temple/` and `pop/src/render/effects.js`; `onMilestone`, `onSkip`, `onPerfect` and `onTarget` in each `main.js`.
   - Change:
     - Add `opts.slot` with two values, 'banner' and 'combo'. A new pop sets any live pop in the same slot to `life = age + 0.08`.
     - Pin banners to y = h·0.20 and keep combo pops at least 60 px below them.
     - In POP, put the target-change pop at y = 300 world.
     - In `tools/store-screens.mjs`, wait until `fx.pops.length <= 1` before capturing SKIP.
2. [P1] **Store frame 1 is the hub list.** At search-thumbnail width (118 px) it is about 20 lines of 9 px text, while every chart-topper leads with one vivid play moment.
   - File: the `FRAMES` order in `tools/store-screens.mjs`.
   - Change: lead with the Sky Temple ×10 frame captioned "Five one-tap games". POP goes second. Move the box frame to slot 3, the "breadth" slot in MARKET's order.
3. [P1] **POP's store frame clips its own hero moment.** The ×8 chain burst is half off the bottom-right corner, the screen holds 6 bubbles on mostly empty mauve, and in play "×9 +2" is clipped at the left edge.
   - Files: `pop/src/render/effects.js` `addPop`/`draw`, and the `pop` setup in `tools/store-screens.mjs`.
   - Change:
     - Clamp pop x to [w·0.18, w·0.82] and y to at least 140.
     - Capture 120 ms after the first chain of ×4 or more whose centre lies in the middle 60% of the screen, with at least 8 bubbles alive.
4. [P1] **The box icon still reads as a video player.** It is the only icon the App Store shows.
   - Files: `art/icon.svg`, `tools/make-icon.mjs`.
   - Change (round-1 spec):
     - Delete the r150 disc and the play triangle.
     - Make the four tiles 300 px with a 64 px gutter (a 664 px block, centred) and rx 66.
     - Stamp each tile with its game's silhouette in white at 70%: droplet, bubble, ring, tower.
     - Keep the gloss squares.
5. [P1] **The SKIP icon at 60 px reads as a grey flying saucer.** The hero is a desaturated grey on navy, and the only warm colour is five 8 px dots. My round-1 spec under-coloured it.
   - File: `skip/art/icon.svg`.
   - Change:
     - Stone gradient #C9D2DC → #5A6474, with a 26 px rim in #EEF3F8.
     - Replace the #FFF0C0 glow with a #FF9A5B sun disc, r 210 at 40%, behind the stone's top-right.
     - Two ripple ellipses, 30 px stroke in #FFB27A, at 85% and 45% opacity.
     - A trail of four 36 px #FFB27A dots.
6. [P1] **SKIP combos and deaths are unchanged since round 1, and SKIP is a store frame.**
   - Files: `onSkip` and `onSink` in `skip/src/main.js`; `skip/src/render/effects.js`.
   - Change:
     - PERFECT pop size = 22·min(1.6, 1 + 0.08·(streak − 1)).
     - Colour from ×4 is hsl(45 100% 75%); from ×8 it is hsl(300 100% 82%) and adds a second ripple.
     - Add `shake` (decay 40/s) to Effects: 4 at ×5, 7 at ×10.
     - On a sink, the stone goes under over 600 ms (y +40, alpha 1→0, rotate 0.6 rad), with 24 bubbles and a 6 px camera dip for 200 ms.
     - On a pad landing, squash the pad to scale(1.25, .75) for 120 ms and spring it back over 240 ms, with 14 #9be58a droplets and shake 6.
     - Bump the distance HUD 1.2× on both.
7. [P1] **Sky Temple's title tagline is behind a cloud, and clouds keep a hard straight underside.**
   - File: `drawClouds` in `sky-temple/src/render/renderer.js`, line 155.
   - Change:
     - Replace `ctx.rect` with `ellipse(px, py, half, r·0.35)`.
     - In the title state, skip clouds whose y falls in [0.08h, 0.30h], or draw a radial scrim rgba(11,16,32,.28) at r 0.5w behind `.title-block`.

## Polish for v1.1 (max 5 one-liners)
- MELT: on the hot lane (t > 0.7) make the spike fill #ffd1d6 with an #ff5e6c core, or cap the lane L at 36. During the 1 s DYING state keep scrolling at 25%. Use the dead bottom quarter of the screen by moving the state dial up 60 px.
- ORBIT and MELT store frames are the darkest and emptiest: add ORBIT nebula wisps and a parallax layer, colour the comet trail by momentum, and add MELT's far-cavern parallax.
- POP: cap the stage's centre glow at hsl(h 70% 60% / .10) so SUN rounds don't go brown, and keep bubbles out of the HUD band (y < 120).
- Icon family: move the Sky Temple icon to the night base (#0B1020 → #2A2F6B) while keeping the coral stones. Put each icon's hero at 40% width above its title lockup.
- Juice: add the Sky Temple landing squash (scale 1.08/.86 → 1 over 180 ms, plus dust puffs). Give MELT passes an outline flash and a +1. Add back-out overshoot (1.18) to every text pop, and the HUD bump to SKIP and MELT.

I captured 390×844 frames at the review commit (c52850f): hub fresh and returning, settings, hub → ORBIT transition at +60 to +1100 ms, and title, play, combo, death (+0, +150, +400 ms) and result for all five games. I also rendered icons at 512, 60 and 40 px on white and on #0B1020, and contact sheets of both store sizes. Frames are in `/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/r2cap/` (`sheet-*.png`) and `.../scratchpad/r2out/`. I didn't change the repo and removed the review worktree; the other round-2 worktrees are still in place.
