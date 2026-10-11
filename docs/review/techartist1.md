# Technical Artist 1 report

Method: Playwright headless Chromium, 390×844, deviceScaleFactor 3 (every game caps its canvas at DPR 2 → 780×1688; SKIP "medium" at 1.5 → 585×1266), CPU throttle via `Emulation.setCPUThrottlingRate`, run started through each game's hook (`__melt/__skip/__pop/__orbit/__skyTemple`), 180 rAF frames sampled after 1.5–1.8 s warm-up; Sky Temple driven by a deterministic drop script (seed 7, pattern perfect×3 + 0.15 cut). Harness: `/tmp/claude-0/-home-user-Mythic-World/b541b170-0079-5108-9be4-0ddb9d42a727/scratchpad/{perf-all,ablate,ablate2,final,st}.mjs`. Caveats: headless Chromium rasterises on the CPU, so absolute numbers overstate an iPhone GPU; the box was under load 10–16 on 4 cores from other reviewers, so treat ±5 ms as noise. Ordering and the cache deltas transfer; JS-side `frame()` cost was also instrumented and is tiny everywhere (0.5–3 ms) except SKIP, so all five games are fill-rate bound, not logic bound.

## Measurements (table: game × {1× ms, 4× ms})

| Game | 1× rAF ms | 4× rAF ms (p95) | JS/frame 1×/4× | 4× with the P0/P1 caches simulated in-page |
|---|---|---|---|---|
| MELT | 17.5 | 58.3 (88.6) | 0.6 / 1.7 | 19.9 |
| SKIP auto→medium (DPR 1.5) | 16.8 | 40.5 (77.3) | 13.5 / 26.5, max 282 | 24.1 |
| SKIP high (DPR 2) | 19.9 | 66.2 (124.8); 90.2 in first pass | 8.0 / 54.7, max 500 | 38.8 |
| POP | 17.0 | 40.2 (66.4) | 0.5 / 0.9 | 30.6 (bg cache + glow sprite); 16.7 with flat bg |
| ORBIT | 19.8 | 36.5 (74.5) | 0.6 / 1.5 | — (healthiest; no P0) |
| Sky Temple | 30.3 (20.4 in a quieter pass) | 71.7 (153); 51.1 quieter pass | 1.5 / 3.0 | 50.4 (36.0 with vignette cache alone in the quieter pass) |

Ablation deltas that drove the findings (1× unless noted): MELT no sky+vignette −4 ms (1×) / −42 ms (4×); SKIP high with layer rebuild disabled 43.3 → 19.8 ms (113 offscreen canvases allocated in a 4 s run → 0); Sky Temple vignette −15 ms (4×), shadowBlur rings −2 ms with 1 ring alive, −14 ms (33 → 19) with ~8 rings alive in a perfect streak; POP flat bg −22 ms (4×), DPR 1.5 −15 ms (4×), flat bubbles −6 ms (4×).

## Scores (1–10) per game: "frame time", "render hygiene", "fidelity per ms"

| Game | Frame time | Render hygiene | Fidelity per ms |
|---|---|---|---|
| MELT | 4 | 5 | 6 |
| SKIP | 5 | 6 | 8 |
| POP | 5 | 4 | 6 |
| ORBIT | 6 | 6 | 7 |
| Sky Temple | 3 | 4 | 5 |

Notes: SKIP is the only game with an adaptive quality ladder and an offscreen-layer architecture, but the cache thrashes (see F2) and its 100–500 ms spikes are the only visible hitches in the box. ORBIT is the only game that stays under 40 ms at 4× with no changes. Sky Temple has the lowest fidelity-per-ms because its biggest costs (vignette, sky gradient, shadowBlur) buy nothing the player notices.

## Findings (ordered by impact; max 12)

- [P0] MELT paints three full-screen gradients every frame (sky linear, lane radial glow, vignette radial) although the sky only eases between three phase temperatures — `melt/src/render/renderer.js:drawSky`, `drawVignette` — build the vignette once in `resize()`; pre-render the sky for the three `PHASE_TEMP` values into three offscreen canvases on resize (or a 1×H gradient strip stretched with `drawImage`) and crossfade two of them with `globalAlpha` while `shownTemp` eases — measured 58.3 → 19.9 ms at 4× (−38 ms), 1× unchanged.
- [P0] SKIP rebuilds its "cached" sky and water layers ~10×/s during flight and allocates fresh full-resolution canvases each time — `skip/src/render/renderer.js:ensureLayers`, `layer()` — the 0.004 dayPhase threshold equals 1.28 m of distance (`DAY_LENGTH` 320), and `layer()` does `document.createElement('canvas')` per rebuild (2 × 5.3 MB at high; 113 canvases in a 4 s run), which is the source of the 280–500 ms JS spikes; reuse the two canvases with `clearRect`, raise the threshold to ~0.03 (≈10 m, imperceptible), and rebuild sky and water on alternate frames — measured 66.2 → 38.8 ms at high 4× (−27 ms), 40.5 → 24.1 at medium (−16 ms), p95 125 → 87 ms.
- [P0] Sky Temple redraws vignette and sky gradient every frame although the sky changes only when a stone lands — `sky-temple/src/render/renderer.js:drawSky`, `drawVignette` — cache the vignette on resize; cache the sky canvas keyed on integer `heightStones` (one rebuild per drop) — measured −15 ms at 4× (51 → 36) and −3 ms at 1×.
- [P1] POP paints two full-screen gradients per frame, one drifting with time — `pop/src/render/renderer.js:drawBg` (the `this.bg = null` in `resize()` is the never-implemented cache) — cache one linear backdrop per palette hue (5) and pre-render the radial glow once per hue into a 256² sprite drawn with `drawImage` at the drifting position — measured 40.2 → 30.6 ms at 4× (−10 ms); flat-bg ablation shows the ceiling at −22 ms.
- [P1] Sky Temple perfect rings stroke a path with `shadowBlur = 12` in the per-frame path, and cost grows exactly during perfect streaks (combo ≥3 spawns two rings) — `sky-temple/src/render/effects.js:drawWorld` — replace with three concentric strokes (lineWidth +0/+4/+8 at alpha 0.9/0.3/0.12) or a pre-rendered ring sprite scaled to the top face — measured −2 ms with one ring alive, −14 ms (33 → 19 at 1×) with ~8 rings alive.
- [P1] No pixel budget or adaptive DPR outside SKIP: all five cap DPR at 2 but not backing-store size (1.6 Mpx on a 6.7" iPhone, 5.6 Mpx on iPad) — every `<game>/src/render/renderer.js:resize` — add a shared `dpr = Math.min(devicePixelRatio, 2, Math.sqrt(1.4e6 / (innerWidth * innerHeight)))` and port SKIP's `adapt()` step-down (`skip/src/main.js:adapt`) into melt/pop/sky-temple — POP at DPR 1.5 measured 38.3 → 23.7 ms at 4× (−15 ms, ~40% fewer pixels).
- [P1] POP creates two gradient objects (radial body + linear rim) and ~16 `hsl()` strings per bubble per frame — `pop/src/render/renderer.js:bubble` — pre-render one 128² bubble sprite per palette hue at load (body, rim, highlights) and `drawImage` scaled to `r`; keep the live path only for the `hueOverride` target swatch — measured −6 ms at 4× (38.3 → 32.5).
- [P2] MELT and Sky Temple use alpha-enabled canvases while painting an opaque backdrop every frame — `melt/src/render/renderer.js:20`, `sky-temple/src/render/renderer.js:36` — `getContext('2d', { alpha: false })` as skip/pop/orbit already do — measured −2.5 to −3.5 ms at 4×, zero risk.
- [P2] The hub's back pill keeps `backdrop-filter: blur(10px)` live over the running game iframe even when faded to 0.35 — `css/box.css:53,56` — in `.player.quiet .back-pill` set `backdrop-filter: none; background: rgba(8,12,24,.8)`; otherwise the compositor re-blurs that region every frame of every game played inside the box (not measurable headless; est. 0.5–1.5 ms per frame on A15-class at DPR 3).
- [P2] SKIP per-frame gradients and canvas text in the live path — `skip/src/render/renderer.js:drawMountains` (two `createLinearGradient` per frame keyed on light x), `drawCharge` (font string built and `fillText` every READY frame, duplicating the DOM hint from `skip/src/main.js:hint`) — cache mountain gradients per 1/32 of light-x and drop the canvas text in favour of the existing DOM hint — est. −1 to −2 ms, and removes the double "hold to wind up" message.
- [P2] Sky Temple `drawBlock` does `save/restore` and four path builds per block and `stoneColors()` allocates four `hsl` strings per block per frame — `sky-temple/src/render/renderer.js:drawBlock`, `drawTower`; `sky-temple/src/core/palette.js:stoneColors` — memoise `stoneColors` by index (placed stones never change colour) and replace save/restore with an explicit `globalAlpha` reset — 28 visible blocks at 4× est. −5 to −10 ms (within noise under load; JS 3.0 → ~2 ms).
- [P2] Text pops rebuild a 90-character font string and `strokeText(lineWidth 5)` + `fillText` per pop per frame in all five games — `*/src/render/effects.js:drawScreen` (and `orbit/src/main.js:Fx.draw`) — rasterise each pop into a small canvas on spawn (text is static for its ≤1.8 s life) and `drawImage` with scale/alpha — est. −0.5 to −1 ms per live pop, which stacks during milestone + combo bursts.

Cheap fidelity upgrades enabled by the above: once sky/vignette are cached canvases, a soft contact shadow under the MELT droplet and Sky Temple's moving stone becomes a pre-rendered blurred ellipse sprite (one `shadowBlur` at load, never per frame); cached glow sprites replace the per-frame `'lighter'` arcs for SKIP motes/fireflies and ORBIT gems/comet with identical look at a fraction of the fill; the market brief's "soft 3D shading, glow" ask is satisfiable at ~0 ms per frame this way.

## Ship verdict
NOT YET — under 4× throttle every game except ORBIT misses 60 fps by 2–4× and SKIP hitches for 100–500 ms on every layer rebuild, but the three P0 fixes are each under 40 lines and were measured in-page to bring MELT, SKIP-medium and Sky Temple to roughly 20–36 ms at 4×, so this is a one-sprint fix, not a redesign.