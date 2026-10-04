/**
 * Rasterises the hub icon and (with --screens) screenshots the Game Box:
 * the launcher, a game opened inside the box, and the settings sheet.
 * Fails on page errors, so it doubles as a smoke test for the box + iframes.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..'); const PORT = 8090; const BASE = `http://127.0.0.1:${PORT}/`;
const wantScreens = process.argv.includes('--screens');
async function startServer() { const proc = spawn('npx', ['http-server', ROOT, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) return proc; } catch {} await new Promise(r => setTimeout(r, 200)); } proc.kill(); throw new Error('server did not start'); }
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
  const errors = []; const shot = async (p, n) => { await p.screenshot({ path: resolve(ROOT, `art/screens/${n}.png`) }); console.log(`art/screens/${n}.png`); };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => !!window.__box); await page.waitForTimeout(600);
  await shot(page, 'home');
  // open SKIP inside the box
  await page.click('.card[data-id="skip"]'); await page.waitForTimeout(300);
  const frame = page.frames().find(f => f.url().includes('/skip/'));
  if (!frame) errors.push('game iframe did not load');
  else { await frame.waitForFunction(() => !!window.__skip, null, { timeout: 15000 }); await page.waitForTimeout(2500); }
  await shot(page, 'in-box');
  const embedded = frame ? await frame.evaluate(() => !document.querySelector('.gsw-handle')) : false;
  if (!embedded) errors.push('switcher should hide inside the box');
  await page.click('#back'); await page.waitForTimeout(300);
  const home = await page.evaluate(() => document.body.dataset.view === 'home' && !!document.getElementById('hero') && !document.getElementById('hero').hidden);
  if (!home) errors.push('back did not return home with a hero card');
  await shot(page, 'home-hero');
  await page.click('#open-settings'); await page.waitForTimeout(400); await shot(page, 'settings');
  await page.click('.sheet .btn.primary');
  // every game opens
  for (const id of ['melt', 'pop', 'orbit', 'sky-temple']) {
    await page.click(`.card[data-id="${id}"]`); await page.waitForTimeout(300);
    const f = page.frames().find(fr => fr.url().includes(`/${id}/`));
    if (!f) { errors.push(`${id} did not open`); continue; }
    try { await f.waitForFunction(() => document.readyState === 'complete' && !!document.querySelector('canvas'), null, { timeout: 15000 }); } catch { errors.push(`${id} did not render a canvas`); }
    if (id === 'pop') { await page.waitForTimeout(800); await shot(page, 'in-box-pop'); }
    await page.click('#back'); await page.waitForTimeout(250);
  }
  await page.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('smoke test: no page errors');
}
const server = await startServer(); const browser = await chromium.launch();
try { await renderIcons(browser); if (wantScreens) await renderScreens(browser); } finally { await browser.close(); server.kill(); }
