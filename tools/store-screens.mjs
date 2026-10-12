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
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..'); const PORT = Number(process.env.PORT) || 8086; const BASE = `http://127.0.0.1:${PORT}/`;
const SIZES = { '6.7': { w: 430, h: 932, out: '1290x2796' }, '6.5': { w: 428, h: 926, out: '1284x2778' } };
const only = process.argv.includes('--size') ? process.argv[process.argv.indexOf('--size') + 1] : null;

/** The story the listing tells, frame by frame. Every run uses a fixed seed so the set is repeatable. */
const FRAMES = [
  { name: 'sky-temple', caption: 'Five one-tap\ngames', sub: 'Stack, pop, skip, orbit, melt', setup: async (page) => { await game(page, 'sky-temple', '__skyTemple', async (f) => {
    await f.evaluate(() => window.__skyTemple.start(42));
    for (const off of [0, 0.14, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) { await f.evaluate((o) => { const a = window.__skyTemple, m = a.game.moving; m[m.axis] = a.game.top()[m.axis] + o; a.game.drop(); }, off); await f.waitForTimeout(90); }
    await f.waitForTimeout(1600); await f.evaluate(() => { const a = window.__skyTemple, m = a.game.moving; m[m.axis] = a.game.top()[m.axis]; a.game.drop(); }); await f.waitForTimeout(160); }); } },
  { name: 'pop', caption: 'Pop the ones\nthat match', sub: 'Touching bubbles pop together', setup: async (page) => { await game(page, 'pop', '__pop', async (f) => { await f.evaluate(() => { const a = window.__pop; a.start(11); a.autopilot = true; }); await f.waitForFunction(() => window.__pop.game.score >= 10, null, { timeout: 60000 });
    // stop the autopilot, let bubbles gather, then pop a real cluster of 3+ in the middle of the stage
    await f.evaluate(() => { window.__pop.autopilot = false; });
    await f.waitForFunction(() => {
      const a = window.__pop, g = a.game, T = g.target;
      if (g.over) return true;
      for (const b of g.bubbles) {
        const x = g.bubbleX(b); if (b.color !== T || x < 90 || x > 300 || b.y < 260 || b.y > 600) continue;
        const near = g.bubbles.filter(o => o !== b && o.color === T && Math.hypot(g.bubbleX(o) - x, o.y - b.y) <= 80).length;
        if (near >= 2 && g.bubbles.length >= 7) { g.tap(x, b.y); return true; }
      }
      return false;
    }, null, { timeout: 60000, polling: 16 }).catch(() => {});
    await f.waitForTimeout(110); }); } },
  { name: 'box', caption: 'A new run\nevery day', sub: 'Keep your streak, level up across all five', setup: async (page) => { await page.goto(BASE); await page.waitForFunction(() => !!window.__box); await page.waitForTimeout(700); } },
  { name: 'skip', caption: 'Skip a stone\nacross the sunset', sub: 'Tap as it meets its reflection', setup: async (page) => { await game(page, 'skip', '__skip', async (f) => { await f.evaluate(() => { const a = window.__skip; a.start(4242); a.autopilot = true; }); await f.waitForFunction(() => window.__skip.state === 'flight' && window.__skip.game.skips >= 4, null, { timeout: 60000 }); await f.waitForFunction(() => { const g = window.__skip.game; return g.stone.y > 0.25 && g.stone.vy < 0 && window.__skip.fx.pops.length <= 1; }, null, { timeout: 30000 }); }); } },
  { name: 'orbit', caption: 'One tap.\nReverse. Dodge.', sub: 'Hold your line for a bigger multiplier', setup: async (page) => { await game(page, 'orbit', '__orbit', async (f) => { await f.evaluate(() => { const a = window.__orbit; a.start(5); a.autopilot = true; }); await f.waitForFunction(() => window.__orbit.game.score >= 8 && window.__orbit.game.blocks.length >= 1, null, { timeout: 60000 }); }); } },
  { name: 'melt', caption: 'Ice. Water.\nSteam.', sub: 'Tap to change state when it counts', setup: async (page) => { await game(page, 'melt', '__melt', async (f) => { await f.evaluate(() => { const a = window.__melt; a.start(9); a.autopilot = true; }); await f.waitForFunction(() => window.__melt.game.score >= 8 && window.__melt.game.phase === 'steam', null, { timeout: 60000 }); }); } },
  { name: 'challenge', caption: 'Challenge\nyour friends', sub: 'Same run, same luck. Who wins?', setup: async (page) => { await game(page, 'pop', '__pop', async (f) => { await f.evaluate(() => { const a = window.__pop; a.extras.challenge.challenge = { seed: 7, tag: 'SAM', score: 18 }; a.start(7); a.autopilot = true; }); await f.waitForFunction(() => window.__pop.game.score >= 22, null, { timeout: 90000 }); await f.evaluate(() => { window.__pop.autopilot = false; }); await f.waitForFunction(() => window.__pop.state === 'over', null, { timeout: 90000 }); await f.waitForTimeout(1100); }); } },
];

/** A returning player: bests on every card, a tag, tutorials and coach marks already seen. */
const SEED_STORAGE = { 'pop.best': '64', 'skytemple.best': '41', 'orbit.best': '57', 'melt.best': '38', 'skip.board': JSON.stringify([{ score: 412.6, tag: 'YOU', at: 1 }]), 'skip.name': '"YOU"', 'gamebox.last': '"sky-temple"',
  'gamebox.tutorials': JSON.stringify({ melt: true, pop: true, orbit: true, 'sky-temple': true, skip: true }),
  'gamebox.coach': JSON.stringify(Object.fromEntries(['pop.rule', 'pop.chain', 'pop.switch', 'orbit.reverse', 'sky-temple.drop', 'sky-temple.cut'].map(k => [k, true]))) };
// a returning player is mid-streak and a few levels in (dates are relative to today, so the hub reads right on any day)
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dkey(d); };
Object.assign(SEED_STORAGE, { 'gamebox.xp': '980', 'gamebox.days': JSON.stringify([5, 4, 3, 2, 1, 0].map(ago)), 'gamebox.streak': JSON.stringify({ count: 6, best: 6, last: ago(0), shield: 0 }) });

/** Store frames show the game, not the box's chrome. */
const HIDE_CHROME = '.back-pill, .corner-btn, .help-btn, .gsw-handle, .gsw, .coach, #toast { display: none !important; }';

async function game(page, id, hook, play) {
  await page.goto(BASE); await page.waitForFunction(() => !!window.__box);
  await page.evaluate((id) => window.__box.open(id), id);
  await page.waitForTimeout(500);
  const frame = page.frames().find(fr => fr.url().includes(`/${id}/`));
  await frame.waitForFunction((h) => !!window[h], hook, { timeout: 15000 });
  await frame.addStyleTag({ content: HIDE_CHROME }).catch(() => {});
  await page.waitForTimeout(300);
  await play(frame);
}

async function startServer() { const proc = spawn('npx', ['http-server', ROOT, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' }); for (let i = 0; i < 150; i++) { try { if ((await fetch(BASE)).ok) return proc; } catch {} await new Promise(r => setTimeout(r, 200)); } proc.kill(); throw new Error('server did not start'); }

const composer = (png, caption, sub, W, H) => `<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0b1020;font-family:ui-rounded,-apple-system,'SF Pro Rounded','Segoe UI',Roboto,Arial,sans-serif;color:#fff">
<div style="position:absolute;inset:0;background:radial-gradient(90% 55% at 50% 0%, #1b2a55 0%, #0b1020 70%)"></div>
<div style="position:absolute;left:0;right:0;top:${Math.round(H * 0.05)}px;text-align:center;padding:0 ${Math.round(W * 0.08)}px">
  <div style="font-size:${Math.round(W * 0.085)}px;font-weight:900;line-height:1.05;letter-spacing:-0.01em;white-space:pre-line;text-wrap:balance">${caption}</div>
  <div style="margin-top:${Math.round(W * 0.025)}px;font-size:${Math.round(W * 0.036)}px;font-weight:600;color:rgba(255,255,255,.66);letter-spacing:.02em">${sub}</div>
</div>
<div style="position:absolute;left:50%;top:${Math.round(H * 0.22)}px;transform:translateX(-50%);height:${Math.round(H * 0.74)}px;width:${Math.round(H * 0.74 * W / H)}px;border-radius:${Math.round(W * 0.09)}px;border:${Math.round(W * 0.012)}px solid rgba(255,255,255,.14);box-shadow:0 ${Math.round(W * 0.05)}px ${Math.round(W * 0.12)}px rgba(0,0,0,.55);overflow:hidden;background:#000">
  <img src="data:image/png;base64,${png}" style="display:block;width:100%;height:auto">
</div>
</body></html>`;

const server = await startServer(); const browser = await chromium.launch();
try {
  for (const [label, size] of Object.entries(SIZES)) {
    if (only && only !== label) continue;
    const dir = resolve(ROOT, 'store/screens', size.out); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });   // no stale frames
    for (let i = 0; i < FRAMES.length; i++) {
      const f = FRAMES[i];
      const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await page.addInitScript((seed) => { try { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } } catch {} }, SEED_STORAGE);
      await page.addInitScript((css) => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, HIDE_CHROME);
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
