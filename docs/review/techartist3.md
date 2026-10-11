# Technical Artist 3 report

Reviewed commit d95059d in a private worktree, which I removed at the end. I served it on port 8231 and rendered with Playwright at 375×667, 390×844 (simulated 47/34px safe areas plus a Dynamic Island and home-indicator overlay), 430×932 (59/34px) and 844×390. That gave 81 shots of the hub, hub settings, each game in the box (title, in-play, result sheet) plus SKIP settings and how-to, and SKIP and POP standalone at 375×667 and 844×390, with DOM metrics for wrapping, off-screen content and back-pill overlap. I also read the committed store/screens/1290x2796 PNGs.

Shots: /tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/ta3-shots/ (metrics in report.json; render script in scratchpad/ta3-render.mjs).

Skipped as already reported: the MELT/Sky Temple score under the pill, the pill's size, fade and position, px-only type and contrast, hub reshuffle and scroll at 375×667, the SKIP title's affordance count, the hard cut into games, result-sheet stagger, button spring, and 60px icons.

## Scores (1–10)
- "hub craft": **6**
- "game chrome craft": **5**
- "small-phone fit": **5**
- "store-asset readiness": **3**

## Findings (ordered by impact; max 14)

- **[P0] The store pipeline cannot produce a complete, repeatable upload set.**
  - Only `store/screens/1290x2796` exists. The 1284×2778 set that `store/CHECKLIST.md` requires was never generated.
  - Sky Temple has no frame, so the "five games" listing shows four.
  - Runs use autopilot and are not deterministic: no fixed seed except the challenge frame.
  - The server is `npx http-server` on a hard-coded port 8086.
  - Change in `tools/store-screens.mjs`:
    - add `{ name:'sky-temple', caption:'Stack stones\nto the gods', … a.start(42) }`
    - pass a fixed seed to every `a.start(<seed>)`
    - spawn `node_modules/.bin/http-server` (or a local static server) on `process.env.PORT||8086`
    - run both `SIZES` by default, and commit `1284x2778/`
    - add a CI check that both folders hold N PNGs at exactly 1290×2796 and 1284×2778.

- **[P1] The store frames are cropped and show in-app chrome.**
  - The phone frame starts at `top: H*0.265` and is `H*0.86` tall, so 12.5% of it runs off the bottom. In 6-challenge the PLAY AGAIN button is cut through and MENU is gone; in 1-box the bottom row is empty.
  - Every game frame shows the box's "‹ GAMES" pill and the mute button.
  - The hub frame shows "best —" on every card.
  - Change in the `composer()` and `game()` helpers:
    - frame wrapper: `top: H*0.22; height: H*0.74; width: calc(H*0.74 * w/h)` so the whole device fits, or crop deliberately to the top 70% and capture result sheets with `#over .panel` scrolled into the visible band
    - before capture: `await page.addStyleTag({content:'.back-pill{display:none}'})` and `await frame.addStyleTag({content:'.corner-btn{display:none}'})`
    - seed `localStorage` with bests through `addInitScript`.

- **[P1] Store screens and smoke renders use a fallback font, not the in-game face.**
  - `--font` starts with `ui-rounded` / "SF Pro Rounded", but the Linux renderer has only DejaVu and Chromium's bundled sans. The committed PNGs are set in a Helvetica-like fallback, while players on iOS see SF Rounded.
  - Captions also wrap unevenly ("Skip a stone / across a sunset / lake" is three lines with a one-word last line), so the gap between caption and frame changes from frame to frame.
  - Change:
    - generate store screens on macOS, or self-host a rounded webfont (e.g. `art/fonts/Nunito-Black.woff2`) and put it first in `--font` in both `css/box.css` and `css/game-ui.css`
    - composer caption div: add `text-wrap: balance; max-height: 2lh;`
    - drop the caption size from `W*0.095` to `W*0.085`
    - rewrite the SKIP caption as two lines.

- **[P1] SKIP's in-run distance is unstyled body text, about 16–18px tall.**
  - `#distance.distance` has no rule in `skip/css/style.css`, and `.score` (56–92px) only matches `#score` in the other games.
  - Measured 28×18px at 390×844 ("50 m"), against a 70px-tall score in POP and ORBIT. The App Store frame 2 shows it.
  - Change: add `skip/css/style.css: .distance { font-size: clamp(56px,18vw,92px); font-weight: 900; line-height: 1; text-shadow: 0 6px 30px rgba(0,0,0,.35); } .distance .unit { font-size: .4em; }`, or give the element `class="score distance"`.

- **[P1] "HOW TO PLAY" wraps to two lines at 375 and 390 wide; it fits only at 430.**
  - In `.btn-row .btn` it measured 159px and 166px wide, and the 14px type with .22em tracking plus 18px padding doesn't fit.
  - Change: `skip/css/style.css` (or `css/game-ui.css`) `.btn-row .btn { white-space: nowrap; padding-inline: 12px; letter-spacing: .14em; font-size: 13px; }`, or relabel the button "Rules".
  - Also set `.btn-row { gap: 12px }` so it matches the panel's 12px gap instead of 10px.

- **[P1] Standalone, the switcher handle covers SKIP's menu buttons.**
  - `.gsw-handle` is fixed at `right: 0; top: 50%`, 34×96px. At 375×667 it covers the right ends of LEADERBOARD and CHALLENGE A FRIEND (x 341–375, y 286–382).
  - It also ignores `safe-area-inset-right`.
  - Change in `switcher.js`: `.gsw-handle { top: auto; bottom: calc(env(safe-area-inset-bottom,0px) + 120px); transform: none; right: env(safe-area-inset-right,0px); width: 28px; height: 72px; }`, with the open state `transform: translateX(-280px)`.

- **[P1] The hub's hero "best" chip is oversized because a selector leaks into it.**
  - `.hero-text b { font-size: 22px; font-weight: 900 }` also matches the `<b>` inside `#hero-best.chip`. The hero chip renders about 35px tall with a heavy 22px dash, while the grid chips are 26px.
  - Change in `css/box.css`: `.hero-text > b { font-size: 22px; font-weight: 900; letter-spacing: .1em; }`.
  - Also replace the "—" placeholder with `best 0`, or hide `.chip` when there is no score; an em dash in a pill reads as a strikethrough.

- **[P1] In the box, MELT's logo sits on the canvas's ceiling rail.**
  - `.in-box .title-block { margin-top: 11vh }` puts the logo (y 182–261 at 390×844) across the dark spiked ceiling band at about y 187, so the rail cuts through the letters.
  - Change: `melt/css/style.css: .in-box #title .title-block { margin-top: calc(var(--safe-top) + 160px) }`, which keeps the whole lockup in the purple field.
  - Better: replace the vh offsets in `css/game-ui.css` with `calc(var(--safe-top) + 56px)` so they follow the pill rather than the viewport.

- **[P2] Sky Temple's result sheet is muddy grey on the light sky and has a dead gap.**
  - The shared `--surface: rgba(10,14,28,.62)` blurred over a light background turns grey; the same sheet is navy in the other games.
  - The empty `.combo` keeps `min-height: 20px` plus 12px of gap between BEST and PLAY AGAIN.
  - Change: `sky-temple/css/style.css: :root { --surface: rgba(12,20,44,.86) }` and `.combo:empty { display: none }` (apply the same to `pop .combo`).

- **[P2] Colour and component tokens differ between the hub and the games.**
  - Values that disagree:
    - `--line` is .16 in `box.css`, .18 in `game-ui.css` and .14 in the switcher
    - `--ink-2` is .62 vs .64, and `--ink-3` is .38 vs .40
    - the hub background is `#0b1020`, its `theme-color` is `#0f1628`, and the sheet is `#111a33`.
  - Duplicated components:
    - `skip/css/style.css` re-declares `.toggle`, `.banner` and `.btn.small` from `game-ui.css`, and `.toast`/`.versus` that game-ui already defines
    - `.toast` gets z-index 20 in `box.css` and `skip/css/style.css` but 40 in `game-ui.css`.
  - Change: move `:root` tokens into a shared `css/tokens.css` imported by both, and delete the SKIP copies.

- **[P2] Spacing and label type don't follow the 4/8/12/16/24 scale.**
  - Off-scale spacing: `.home { gap: 20px }`, `.card { padding: 18px 14px 14px; gap: 10px }`, `.sheet { padding: 10px 22px … }`, `.menu .panel { padding: 14px 22px }`, `.corner-btn { right: 14px }`, `.btn-row { gap: 10px }`, `.row { gap: 36px }`.
  - Change to: `--s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px`, then `.home { gap: 24px; padding-inline: 16px }`, `.card { padding: 16px 12px 12px; gap: 8px }`, `.sheet, .menu .panel { padding: 8px 24px calc(var(--safe-bottom) + 16px) }`, `.corner-btn, .help-btn { 16px }`, `.row { gap: 32px }`.
  - The uppercase label tier uses three sizes (10, 11 and 12px) and eight tracking values (.18 to .34em). Collapse it to one `.label` style: `11px / 700 / .28em`.

- **[P2] Hub settings sheet rhythm is uneven.**
  - Rows have only a top hairline, so the Graphics row has no line beneath it.
  - The gap before the first button is 16px (note margin 10px plus sheet gap 6px), and between buttons it is 14px (`.btn` margin-top 8px plus gap 6px).
  - Change in `css/box.css`: `.sheet { gap: 12px } .sheet .btn { margin-top: 0 } .sheet .field { border-bottom: 1px solid var(--line) } .note { margin: 4px 0 }`.

- **[P2] Small typography defects.**
  - One- or two-word last lines in "Pop the bubbles that / match.", "Stack stones to the / gods." and the SKIP end-line. Fix: `text-wrap: balance` on `.card small, .tagline, .end-line, .tut-text`.
  - `--ink-dim` is undefined in POP and ORBIT, so `.sub` falls back to full white. Fix: define it in `game-ui.css`.
  - SKIP's high score shows its unit as an uppercase "M" set apart from the number by tracking. Fix: `.hiscore .unit { text-transform: none; margin-left: -6px; letter-spacing: 0 }`.

- **[P2] Landscape (web/PWA only; the iOS app is portrait-locked) breaks layouts that rely on vh.**
  - `.in-box #hud .hud-top { margin-top: 6vh }` is 23px at 390px tall, so POP, ORBIT and SKIP HUDs also sit under the pill.
  - SKIP's title `.start` runs to y 438 on a 390px screen, so How to play and Settings are off-screen.
  - Result sheets need scrolling to reach Share and Menu.
  - Change: `.in-box #hud .hud-top { margin-top: calc(var(--safe-top) + 56px) }`, plus `@media (max-height: 500px) { #title { flex-direction: row; justify-content: center; gap: 24px } .menu .panel { max-width: 420px } .big { font-size: 44px } .btn { min-height: 44px } }`.

Safe areas are handled well: overlays, sheets, toasts and the hub all pad by `env()`, and nothing collided with the island or home-indicator overlays in the 390 and 430 renders.

## Ship verdict
NOT YET. The in-app chrome is close: SKIP's unstyled HUD, the "HOW TO PLAY" wrap, the leaking hero chip and the switcher overlap are each a few lines of CSS. The App Store set is not ready to upload: 1284×2778 is missing, Sky Temple has no frame, CTAs are cropped, the box's pill and mute button appear in every game frame, and the screens use a fallback font.