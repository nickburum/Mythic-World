/**
 * Rasterises the SVG icon to PNG and (with --screens) captures store-style
 * screenshots of the live game in headless Chromium. Also acts as a smoke
 * test: any uncaught page error fails the run.
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

const ROOT = resolve(import.meta.dirname, '..');            // sky-temple/
const REPO = resolve(ROOT, '..');
const PORT = 8099;
const BASE = `http://127.0.0.1:${PORT}/sky-temple/`;
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
    await page.screenshot({ path: resolve(ROOT, `art/icon-${size}.png`), omitBackground: false });
    await page.close();
    console.log(`art/icon-${size}.png`);
  }
}

async function renderScreens(browser) {
  mkdirSync(resolve(ROOT, 'art/screens'), { recursive: true });
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction(() => !!window.__skyTemple);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/title.png') });
  console.log('art/screens/title.png');

  // Scripted run: start, then place a mix of perfect and slightly-off stones at a human pace.
  await page.evaluate(() => window.__skyTemple.start());
  const offsets = [0, 0.18, 0, 0, 0, 0.12, -0.15, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, -0.08, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0];
  for (const off of offsets) {
    await page.evaluate((o) => {
      const app = window.__skyTemple;
      const m = app.game.moving;
      m[m.axis] = app.game.top()[m.axis] + o;
      app.game.drop();
    }, off);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(2000);
  await page.waitForTimeout(650);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/gameplay.png') });
  console.log('art/screens/gameplay.png');

  // Perfect moment
  await page.evaluate(() => {
    const app = window.__skyTemple;
    const m = app.game.moving;
    m[m.axis] = app.game.top()[m.axis];
    app.game.drop();
  });
  await page.waitForTimeout(140);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/perfect.png') });
  console.log('art/screens/perfect.png');

  // Miss → game over
  await page.evaluate(() => {
    const app = window.__skyTemple;
    const m = app.game.moving;
    m[m.axis] = app.game.top()[m.axis] + 1.2;
    app.game.drop();
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: resolve(ROOT, 'art/screens/gameover.png') });
  console.log('art/screens/gameover.png');

  // Real input path: a tap on the canvas should restart.
  await page.waitForTimeout(600);
  await page.touchscreen.tap(40, 120);
  await page.waitForTimeout(100);
  const state = await page.evaluate(() => window.__skyTemple.state);
  if (state !== 'playing') errors.push(`tap did not restart game (state=${state})`);
  await page.touchscreen.tap(40, 120);
  const score = await page.evaluate(() => window.__skyTemple.game.score + window.__skyTemple.game.blocks.length);
  if (score < 1) errors.push('tap did not drop a stone');

  await page.close();
  if (errors.length) {
    console.error('Page errors:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('smoke test: no page errors');
  }
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
