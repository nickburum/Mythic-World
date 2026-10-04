/** orbit — rasterise the icon; with --screens, capture title/gameplay/result via the autopilot and smoke-test. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..'), REPO = resolve(ROOT, '..');
const PORT = 8088, BASE = `http://127.0.0.1:${PORT}/orbit/`;
const wantScreens = process.argv.includes('--screens');
async function startServer() { const proc = spawn('npx', ['http-server', REPO, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) return proc; } catch {} await new Promise(r => setTimeout(r, 200)); } proc.kill(); throw new Error('server did not start'); }
async function renderIcons(browser) {
  for (const size of [1024, 512, 192, 180]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:#000"><img src="${BASE}art/icon.svg" style="display:block;width:${size}px;height:${size}px"></body></html>`);
    await page.waitForFunction(() => document.images[0] && document.images[0].complete);
    await page.screenshot({ path: resolve(ROOT, `art/icon-${size}.png`) }); await page.close(); console.log(`art/icon-${size}.png`);
  }
}
async function renderScreens(browser) {
  mkdirSync(resolve(ROOT, 'art/screens'), { recursive: true });
  const errors = [], shot = async (p, n) => { await p.screenshot({ path: resolve(ROOT, `art/screens/${n}.png`) }); console.log(`art/screens/${n}.png`); };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(String(e))); page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); }); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => !!window.__orbit); await page.waitForTimeout(1500);
  await shot(page, 'title');
  await page.evaluate(() => { const a = window.__orbit; a.start(); a.autopilot = true; });
  await page.waitForFunction(() => window.__orbit.game.score >= 6, null, { timeout: 60000 });
  await page.waitForTimeout(300); await shot(page, 'gameplay');
  await page.evaluate(() => { window.__orbit.autopilot = false; });
  await page.waitForFunction(() => window.__orbit.state === 'over', null, { timeout: 90000 });
  await page.waitForTimeout(600); await shot(page, 'gameover');
  await page.waitForTimeout(400); await page.touchscreen.tap(40, 160); await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__orbit.state);
  if (st !== 'play') errors.push(`tap after game over did not restart (state=${st})`);
  await page.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('smoke test: no page errors');
}
const server = await startServer(); const browser = await chromium.launch();
try { await renderIcons(browser); if (wantScreens) await renderScreens(browser); } finally { await browser.close(); server.kill(); }
