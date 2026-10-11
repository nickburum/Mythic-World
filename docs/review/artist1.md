# Artist 1 report
## Scores (1–10)
- Box icon: 5 · MELT: 6 · SKIP: 4 · POP: 4 · ORBIT: 5 · Sky Temple: 7
- Family consistency: 4 · Thumbnail legibility: 5 · Store appeal: 4
## Style guide (10 lines)
1. Base: every icon sits on the hub's night gradient, #1D2B52 (top-left) → #0B1020, radial-lit from the top; the game's own colour lives only in the hero. No scenes, no horizons, no landscapes.
2. One hero shape, 55–65% of canvas width, centred on the lower-centre third; nothing else larger than 20% of canvas, maximum two supporting shapes.
3. Two colours per icon, hero + accent, from the family set: MELT #3AA7FF + #BDF0FF · SKIP #FF9A5B + #8A7BC8 · POP #5EF0B0 + #FF4F9A · ORBIT #7DF0FF + #FF5A6E · Sky Temple #FF7A5B + #FFD24A · Box uses all five hero hues.
4. Shading: soft 3D, light from top-left; fills are a two-stop linear gradient from the hero hue to the same hue at −18% lightness; one white gloss ellipse (rgba(255,255,255,.45), ~22% of hero width, rotated −40°) in the hero's top-left.
5. Outline: no dark strokes; a hero gets a rim of its own hue at 85–90% lightness, 2.5% of canvas (26px at 1024), nothing else gets a stroke.
6. Glow: exactly one radial glow behind the hero, hero hue 35% → 0 opacity, radius 60% of hero width. Nothing else glows.
7. Rounding: rx = 22% of the shape's short side for all rectangles (matches the iOS superellipse); circles stay circles; never sharp corners.
8. Faces: two dot eyes #0F1628 + a smile, 10% of hero height, allowed on any hero and required on MELT.
9. Shapes are flat vector, not painterly and not isometric unless the hero is a tower; depth comes from the gradient, gloss and glow only.
10. Export gate: at 60px on white and on #0B1020 the hero must be the only thing you see; fail either, redo.
## Findings
- [P0] No App Store screenshot set at 1290×2796 / 1284×2778 with captions. (ADDRESSED: tools/store-screens.mjs)
- [P0] SKIP icon is a landscape, not an icon — delete scene; night base, one stone 580px wide tilted −18° (#8C96A3 → #3F4752, gloss), single sun glow #FFF0C0, three white ripple ellipses (stroke 26px, 80%); accent #8A7BC8.
- [P0] POP icon is mud — background #0B1020 → #123A3A; one hero bubble 600px #2BD38F 85% alpha, rim #5EF0B0 26px, gloss; two small bubbles 180px #FF4F9A and #7DF0FF; three white spark strokes 30px; sync pop/css/style.css body background to teal.
- [P1] ORBIT ring vanishes at 60px — ring stroke 44px #7DF0FF + 36px halo 30%; comet head 130px white, cyan glow 1.4×; red arc #FF5A6E 72px; shrink central star to 70px or drop; gem 90px #FFE66B.
- [P1] Box icon reads as generic folder — remove disc and ring; four tiles 300px with 64px gutter (centred 664px block), hero hues #3AA7FF/#FF9A5B/#FF4F9A/#7DF0FF with gloss, each stamped with its game silhouette in white 60%.
- [P1] MELT icon splits the eye — drop hero 55% width (#3AA7FF → #1A63AD, gloss, cyan glow), two-dot face + smile, ice cube 25% top-left, cloud 25% bottom-right, delete axis line.
- [P1] Sky Temple icon disagrees with the game — keep coral brand (#FF7A5B / #C8503A), pass seedHue 10 to first stones in game, 7 stones, plinth 15% height, gold band #FFD24A, night base (#0B1020 → #2A2F6B), two white clouds, drop sun.
- [P1] Five icons not a family — apply guide.
- [P2] Dark icons sink into hub cards — `.card img, .hero-icon { box-shadow: inset 0 0 0 1px rgba(255,255,255,.14) }`; icon gradients stop at #141C38.
- [P2] Hub cards monochrome — 3px top rule in game hue + 6% tint background.
- [P2] First App Store frame per game: MELT mid-transition; SKIP gameplay.png "One tap. Perfect skip"; POP needs screen-wide pop ring; ORBIT gem burst; Sky Temple perfect.png "Stack to the gods".
- [P2] Title screens text-first — put the icon hero at 40% width above the title lockup on every title.
## Ship verdict
NOT YET — SKIP and POP icons fail the 60px test; no store screenshot set.
