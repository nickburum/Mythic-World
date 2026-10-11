/**
 * App Store screenshots, generated from the live game.
 * Captures each frame at phone size ×3 (so 430×932 → 1290×2796 exactly and
 * 428×926 → 1284×2778), then composes a caption band on top in the box's
 * design language. Output: store/screens/<size>/<n>-<name>.png
 *
 *   node tools/store-screens.mjs            # both sizes
 *   node tools/store-screens.mjs --size 6.7 # one size
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..'); const PORT = 8086; const BASE = `http://127.0.0.1:${PORT}/`;
const SIZES = { '6.7': { w: 430, h: 932, out: '1290x2796' }, '6.5': { w: 428, h: 926, out: '1284x2778' } };
const only = process.argv.includes('--size') ? process.argv[process.argv.indexOf('--size') + 1] : null;

/** The story the listing tells, frame by frame. */
const FRAMES = [
  { name: 'box', caption: 'Five games.\nOne finger.', sub: 'Pick one and play in seconds', setup: async (page) => { await page.goto(BASE); await page.waitForFunction(() => !!window.__box); await page.waitForTimeout(600); } },
  { name: 'skip', caption: 'Skip a stone\nacross a sunset lake', sub: 'Tap when it kisses the water', setup: async (page) => { await game(page, 'skip', '__skip', async (f) => { await f.evaluate(() => { const a = window.__skip; a.start(); a.autopilot = true; }); await f.waitForFunction(() => window.__skip.state === 'flight' && window.__skip.game.skips >= 3, null, { timeout: 60000 }); await f.waitForFunction(() => { const g = window.__skip.game; return g.stone.y > 0.25 && g.stone.vy < 0; }, null, { timeout: 30000 }); }); } },
  { name: 'melt', caption: 'Tap to change state', sub: 'Ice, water or steam, when it counts', setup: async (page) => { await game(page, 'melt', '__melt', async (f) => { await f.evaluate(() => { const a = window.__melt; a.start(); a.autopilot = true; }); await f.waitForFunction(() => window.__melt.game.score >= 8 && window.__melt.game.phase === 'steam', null, { timeout: 60000 }); }); } },
  { name: 'pop', caption: 'Pop the bubbles\nthat match', sub: 'Three lives, one colour', setup: async (page) => { await game(page, 'pop', '__pop', async (f) => { await f.evaluate(() => { const a = window.__pop; a.start(); a.autopilot = true; }); await f.waitForFunction(() => window.__pop.game.score >= 7 && window.__pop.game.bubbles.length >= 3, null, { timeout: 60000 }); }); } },
  { name: 'orbit', caption: 'One tap.\nReverse. Dodge.', sub: 'Collect every gem on the ring', setup: async (page) => { await game(page, 'orbit', '__orbit', async (f) => { await f.evaluate(() => { const a = window.__orbit; a.start(); a.autopilot = true; }); await f.waitForFunction(() => window.__orbit.game.score >= 6, null, { timeout: 60000 }); }); } },
  { name: 'challenge', caption: 'Challenge\nyour friends', sub: 'Same run, same luck. Who wins?', setup: async (page) => { await game(page, 'pop', '__pop', async (f) => { await f.evaluate(() => { const a = window.__pop; a.extras.challenge.challenge = { seed: 7, tag: 'SAM', score: 18 }; a.start(7); a.autopilot = true; }); await f.waitForFunction(() => window.__pop.game.score >= 20, null, { timeout: 90000 }); await f.evaluate(() => { window.__pop.autopilot = false; }); await f.waitForFunction(() => window.__pop.state === 'over', null, { timeout: 90000 }); await f.waitForTimeout(900); }); } },
];

async function game(page, id, hook, play) {
  await page.goto(BASE); await page.waitForFunction(() => !!window.__box);
  await page.evaluate((id) => window.__box.open(id), id);
  await page.waitForTimeout(400);
  const frame = page.frames().find(fr => fr.url().includes(`/${id}/`));
  await frame.waitForFunction((h) => !!window[h], hook, { timeout: 15000 });
  await page.waitForTimeout(300);
  await play(frame);
}

async function startServer() { const proc = spawn('npx', ['http-server', ROOT, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) return proc; } catch {} await new Promise(r => setTimeout(r, 200)); } proc.kill(); throw new Error('server did not start'); }

const composer = (png, caption, sub, W, H) => `<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0b1020;font-family:ui-rounded,-apple-system,'SF Pro Rounded','Segoe UI',Roboto,Arial,sans-serif;color:#fff">
<div style="position:absolute;inset:0;background:radial-gradient(90% 55% at 50% 0%, #1b2a55 0%, #0b1020 70%)"></div>
<div style="position:absolute;left:0;right:0;top:${Math.round(H * 0.055)}px;text-align:center;padding:0 ${Math.round(W * 0.08)}px">
  <div style="font-size:${Math.round(W * 0.095)}px;font-weight:900;line-height:1.05;letter-spacing:-0.01em;white-space:pre-line">${caption}</div>
  <div style="margin-top:${Math.round(W * 0.025)}px;font-size:${Math.round(W * 0.036)}px;font-weight:600;color:rgba(255,255,255,.66);letter-spacing:.02em">${sub}</div>
</div>
<div style="position:absolute;left:50%;top:${Math.round(H * 0.265)}px;transform:translateX(-50%);width:${Math.round(W * 0.86)}px;height:${Math.round(H * 0.86)}px;border-radius:${Math.round(W * 0.09)}px;border:${Math.round(W * 0.012)}px solid rgba(255,255,255,.14);box-shadow:0 ${Math.round(W * 0.05)}px ${Math.round(W * 0.12)}px rgba(0,0,0,.55);overflow:hidden;background:#000">
  <img src="data:image/png;base64,${png}" style="display:block;width:100%;height:auto">
</div>
</body></html>`;

const server = await startServer(); const browser = await chromium.launch();
try {
  for (const [label, size] of Object.entries(SIZES)) {
    if (only && only !== label) continue;
    const dir = resolve(ROOT, 'store/screens', size.out); mkdirSync(dir, { recursive: true });
    for (let i = 0; i < FRAMES.length; i++) {
      const f = FRAMES[i];
      const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await f.setup(page);
      const shot = await page.screenshot({ type: 'png' });
      await page.close();
      const W = size.w * 3, H = size.h * 3;
      const comp = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      await comp.setContent(composer(shot.toString('base64'), f.caption, f.sub, W, H));
      await comp.waitForFunction(() => document.images[0] && document.images[0].complete);
      const out = resolve(dir, `${i + 1}-${f.name}.png`);
      await comp.screenshot({ path: out });
      await comp.close();
      console.log(`${size.out}/${i + 1}-${f.name}.png`);
    }
  }
} finally { await browser.close(); server.kill(); }
