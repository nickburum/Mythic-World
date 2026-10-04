/**
 * Rasterises the icon and (with --screens) captures menu + gameplay screenshots
 * of the live game in headless Chromium, driven by the core autopilot. Any page
 * error fails the run, so it doubles as a smoke test.
 *   node tools/render-art.mjs [--screens]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {}
  for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} }
  throw new Error('playwright not found; npm i -D playwright');
}
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..');           // skip/
const REPO = resolve(ROOT, '..');                           // serve the repo so ../switcher.js resolves
const PORT = 8094, BASE = `http://127.0.0.1:${PORT}/skip/`;
const wantScreens = process.argv.includes('--screens');

async function startServer() {
  const proc = spawn('npx', ['http-server', REPO, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) return proc; } catch {} await new Promise(r => setTimeout(r, 200)); }
  proc.kill(); throw new Error('server did not start');
}
async function renderIcons(browser) {
  mkdirSync(resolve(ROOT, 'art'), { recursive: true });
  for (const size of [1024, 512, 192, 180]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:#000"><img src="${BASE}art/icon.svg" style="display:block;width:${size}px;height:${size}px"></body></html>`);
    await page.waitForFunction(() => document.images[0] && document.images[0].complete);
    await page.screenshot({ path: resolve(ROOT, `art/icon-${size}.png`) }); await page.close(); console.log(`art/icon-${size}.png`);
  }
}
async function renderScreens(browser) {
  mkdirSync(resolve(ROOT, 'art/screens'), { recursive: true });
  const errors = [], shot = async (p, name) => { await p.screenshot({ path: resolve(ROOT, `art/screens/${name}.png`) }); console.log(`art/screens/${name}.png`); };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => !!window.__skip); await page.waitForTimeout(500);
  await shot(page, 'title');
  await page.click('#open-howto'); await page.waitForTimeout(400); await shot(page, 'howto'); await page.evaluate(() => document.querySelector('#howto .close-panel').click());

  // autopilot run
  await page.evaluate(() => { const a = window.__skip; a.autopilot = true; a.start(); });
  await page.waitForFunction(() => window.__skip.state === 'flight' && window.__skip.game.skips >= 2, null, { timeout: 30000 });
  await page.waitForFunction(() => { const g = window.__skip.game; return g.stone.y > 0.25 && g.stone.vy < 0; }, null, { timeout: 30000 });
  await shot(page, 'gameplay');
  await page.waitForFunction(() => window.__skip.game.distance >= 180, null, { timeout: 120000 });
  await page.waitForFunction(() => { const g = window.__skip.game; return g.stone.y > 0.2; }, null, { timeout: 30000 });
  await shot(page, 'dusk');
  // stop tapping → the stone slows and sinks
  await page.evaluate(() => { window.__skip.autopilot = false; });
  await page.waitForFunction(() => window.__skip.state === 'sunk' && !document.getElementById('over').hidden, null, { timeout: 120000 });
  await page.waitForTimeout(500); await shot(page, 'gameover');
  // The result card's buttons must be the top-most element at their centre (nothing overlays them).
  const hit = await page.evaluate(() => { const b = document.getElementById('over-board'); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el === b || b.contains(el); });
  if (!hit) errors.push('result card button is covered by another element');
  await page.evaluate(() => document.getElementById('over-board').click());
  await page.waitForTimeout(400); await shot(page, 'leaderboard');
  const rows = await page.$$eval('#board-list li', li => li.length);
  if (rows < 1) errors.push('leaderboard has no rows after a run');
  const boardVisible = await page.evaluate(() => { const li = document.querySelector('#board-list li'); if (!li) return false; const r = li.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return li.contains(el) || el === li; });
  if (!boardVisible) errors.push('leaderboard panel is covered by another overlay');
  await page.evaluate(() => document.querySelector('#board .close-panel').click());

  // real input: press on the canvas away from the panel restarts, hold charges, release throws
  await page.waitForTimeout(700);
  await page.touchscreen.tap(40, 120);
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__skip.state);
  if (st !== 'ready' && st !== 'flight') errors.push(`touch after game over did not restart (state=${st})`);

  // switcher present
  const sw = await page.evaluate(() => !!document.querySelector('.gsw-handle'));
  if (!sw) errors.push('game switcher missing');
  await page.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('smoke test: no page errors');
}
const server = await startServer(); const browser = await chromium.launch();
try { await renderIcons(browser); if (wantScreens) await renderScreens(browser); } finally { await browser.close(); server.kill(); }
