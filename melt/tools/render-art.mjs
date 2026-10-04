/**
 * Rasterises the SVG icon to PNG and (with --screens) captures store-style
 * screenshots of the live game in headless Chromium, driven by the core's
 * autopilot. Doubles as a smoke test: any page error fails the run.
 *
 *   node tools/render-art.mjs            # icons only
 *   node tools/render-art.mjs --screens  # icons + screenshots
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch {}
  for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) {
    try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {}
  }
  throw new Error('playwright not found; npm i -D playwright');
}
const { chromium } = loadPlaywright();

const ROOT = resolve(import.meta.dirname, '..');            // melt/
const REPO = resolve(ROOT, '..');                             // serve the repo so ../switcher.js resolves
const PORT = 8097;
const BASE = `http://127.0.0.1:${PORT}/melt/`;
const wantScreens = process.argv.includes('--screens');

async function startServer() {
  const proc = spawn('npx', ['http-server', REPO, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE); if (r.ok) return proc; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error('server did not start');
}

async function renderIcons(browser) {
  mkdirSync(resolve(ROOT, 'art'), { recursive: true });
  for (const size of [1024, 512, 192, 180]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:#000"><img src="${BASE}art/icon.svg" style="display:block;width:${size}px;height:${size}px"></body></html>`);
    await page.waitForFunction(() => document.images[0] && document.images[0].complete);
    await page.screenshot({ path: resolve(ROOT, `art/icon-${size}.png`) });
    await page.close();
    console.log(`art/icon-${size}.png`);
  }
}

async function renderScreens(browser) {
  mkdirSync(resolve(ROOT, 'art/screens'), { recursive: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__melt);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/title.png') });
  console.log('art/screens/title.png');

  // Autopilot run for the gameplay shots.
  await page.evaluate(() => { const a = window.__melt; a.autopilot = true; a.start(); });
  await page.waitForFunction(() => window.__melt.game.score >= 6, null, { timeout: 60000 });
  await page.waitForFunction(() => window.__melt.game.phase === 'steam', null, { timeout: 60000 });
  await page.screenshot({ path: resolve(ROOT, 'art/screens/gameplay.png') });
  console.log('art/screens/gameplay.png');

  await page.waitForFunction(() => window.__melt.game.score >= 16 && window.__melt.game.phase === 'ice', null, { timeout: 90000 });
  await page.screenshot({ path: resolve(ROOT, 'art/screens/ice.png') });
  console.log('art/screens/ice.png');

  // Let go of the autopilot and hold forever → steam into a beam → game over.
  await page.evaluate(() => { const a = window.__melt; a.autopilot = false; a.holding = true; });
  await page.waitForFunction(() => window.__melt.state === 'over', null, { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/gameover.png') });
  console.log('art/screens/gameover.png');

  // Real input path: a touch away from the panel restarts and heats while held.
  await page.evaluate(() => { window.__melt.holding = false; });
  await page.waitForTimeout(300);
  await page.touchscreen.tap(40, 120);
  await page.waitForTimeout(100);
  const state = await page.evaluate(() => window.__melt.state);
  if (state !== 'playing') errors.push(`touch did not restart game (state=${state})`);

  // Game switcher: handle opens the drawer, links resolve, the other game loads.
  await page.click('.gsw-handle');
  await page.waitForTimeout(400);
  const drawerOpen = await page.evaluate(() => document.body.classList.contains('gsw-open'));
  if (!drawerOpen) errors.push('switcher drawer did not open');
  await page.screenshot({ path: resolve(ROOT, 'art/screens/switcher.png') });
  console.log('art/screens/switcher.png');
  const hrefs = await page.$$eval('.gsw-card', as => as.map(a => a.href));
  for (const h of hrefs) { const r = await fetch(h); if (!r.ok) errors.push(`switcher link ${h} → ${r.status}`); }
  await page.click('.gsw-card[href*="sky-temple"]');
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  const other = await page.evaluate(() => window.__gameSwitcher && window.__gameSwitcher.current);
  if (other !== 'sky-temple') errors.push(`switching did not land on sky-temple (got ${other})`);

  await page.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; }
  else console.log('smoke test: no page errors');
}

const server = await startServer();
const browser = await chromium.launch();
try {
  await renderIcons(browser);
  if (wantScreens) await renderScreens(browser);
} finally {
  await browser.close();
  server.kill();
}
