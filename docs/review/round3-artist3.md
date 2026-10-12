# Artist 3 — round 3 re-vote

## Vote: NOT YET
SKIP's sink and pad motion are fixed, but the Sky Temple fix opened a new problem. The new halo padding (`#title .title-block { padding: 18px 32px }`) pushes the tagline 41 px lower, from 245–290 px to 263–331 px at 390×844. That puts "temple to the" on top of the near-white top face of the tower, which peaks at about y 320 px. White text on cream stone is hard to read. The padding also narrows the text block, so the word "grow." now sits alone on its own line. With the padding removed, the tagline sits on two lines and clears the tower. The tagline is still covered, just by the tower now instead of a cloud.

## Items
1. **Sky Temple tagline: PARTIAL.** Clouds are fixed: I tracked every cloud shape drawn at 0.3, 3, 6, 10, 14 and 20 s and none touched the tagline (56,263–334,331) or the logo. On the title screen no cloud is drawn above y 535 px. But the same commit made the tower cover the tagline instead (see the vote above), and that shows on every frame from load.
2. **SKIP sink and pad squash: VERIFIED FIXED.** I froze the clock and measured each frame:
   - **Water sink:** the stone drops 0 / +12.4 / +24.8 px at +0 / +200 / +400 ms and is gone by +700 ms. That is 37.1 px over 600 ms; the code scales 40 px by the screen's ppm (37.14), so it matches the spec. Alpha goes 1 → 0.667 → 0.333, and the rotation adds 0.2 rad every 200 ms, reaching 0.6 rad. The shadow and reflection are hidden while it sinks, and the screenshots show it slipping under.
   - **Pad landing:** pad width/height scale is 1.000/1.000 at +0 ms, 1.125/0.875 at +60, peaks at 1.25/0.75 at +120 (1.214/0.786 at +150 as it springs back), then overshoots to 0.903/1.097 at +300.
   - **Droplets:** 14 green droplets, all still live at +140 ms, and visible in the capture.
   - **Two P2 nits:** the squash eases in over 120 ms instead of hitting on the impact frame, so the landing reads soft. At 360 ms it jumps from 0.899/1.100 straight to 1.0/1.0 in one frame, a visible ~10% twitch.
3. **+SPEED / DIP vs PERFECT overlap: PARTIAL, but acceptable.** Over 60 s of real autoplay (3,591 frames), 35 frames had two text boxes overlapping. That is 0.97%, down from about 4%. Every one was "+SPEED" against "PERFECT ×N", and DIP never overlapped anything. In each case PERFECT was already fading (alpha 0.11–0.23) for about 3 frames, after rising 40 px into the +SPEED slot. The two slots are only 55 px apart, so the claim that they "never print over" PERFECT isn't strictly true. It is a faint ghost, though, and doesn't block on its own. Combo escalation still works: the streak reached ×26, all three colour tiers showed, and the text grew to 35.2 px. No page errors.

## Anything new (P0/P1 only)
- **P1, Sky Temple title (caused by this commit):** the tagline now sits on the tower top and wraps "grow." onto its own line (details under the vote). Suggested fix: drop the vertical padding, or move the halo onto a `::before` pseudo-element so it doesn't change the layout. Then check the tagline is back on two lines and ends above about y 300 px.

The worktree is removed and the server stopped. Results are in `/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/r3a3cap.json` and screenshots in `.../scratchpad/shots2/`; the two to compare are `sky_tag_fcf81ba.png` and `sky_tag_nopad.png`.