# Artist 3 — round 3 re-vote (at a981352)

## Vote: SHIP
All three of my items are now fixed, and the tower problem from last round is gone. The Sky Temple tagline sits at 245–290 px on two lines, 29 px clear of the tower top (which starts at y 319 px), and no cloud comes within 245 px of it in 15 s. The SKIP pad no longer snaps at the end of its squash (largest one-frame change after 360 ms is 0.7%). +SPEED never overlapped PERFECT in 60 s of autoplay.

## Items
1. **Sky Temple tagline: VERIFIED FIXED.**
   - At 390×844 the tagline box is 245–290 px with two lines, and "grow." is back on the first line. That matches the coordinator's numbers.
   - The tower's top face starts at y 319 px (pixel scan down the centre of the screen), so there is 29 px of clearance.
   - Checked at 0.3, 3, 6, 10 and 15 s: no cloud touched the tagline or the logo, and the highest cloud top was y 535 px. The halo still shows behind the lockup.
   - `?box=1` gave identical numbers. That was a standalone load with the parameter, not a load inside the hub.
2. **SKIP sink and pad squash: VERIFIED FIXED.**
   - The sink is unchanged from last round: +0 / +12.4 / +24.8 px at +0 / +200 / +400 ms, alpha 1 / 0.667 / 0.333, rotating to 0.6 rad, gone by +700 ms.
   - The pad now hits on impact: width relative to rest is 1.00 at 0 ms, 1.13 at 16 ms, and peaks at 1.247 by 32 ms. It holds there to 112 ms, springs back to 1.00 at 240 ms, overshoots to 0.947 at 320 ms, and settles at 1.005 then 0.998 by 640–800 ms.
   - Largest one-frame width change (frames are 16 ms):

     | Phase | Largest change |
     |---|---|
     | Hold | 1.5% |
     | Spring-back | 3.7% (steady motion, not a jump) |
     | After 360 ms | 0.7% |

     There is no jump at the end of the spring any more.
   - The 14 green droplets are still there.
3. **+SPEED / DIP against PERFECT: VERIFIED FIXED.**
   - Over 3,599 frames of autoplay with 10 +SPEED pickups, +SPEED overlapped PERFECT in 0 frames (it was 35 frames last round).
   - Total overlap is 4 frames (0.11%), all from DIP. When two DIPs, or a DIP and a fading PERFECT, follow each other within 80 ms in the shared slot, the old text is retired over 80 ms and the two briefly cross.
   - The combo still escalates: the streak reached ×16, all three colour tiers showed, and the text grew to 35.2 px. No page errors.

## Anything new (P0/P1 only)
None. One P2 nit: a quick DIP→DIP repeat can briefly print over the previous one at full alpha. It happens in about 0.1% of frames; snapping the retired pop's alpha down would fix it.

I removed the worktree and stopped the server on port 8771. Results are in `/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/r3b.json` and screenshots in `.../scratchpad/shots3/`; `sky_title.png` is the title screen.