/** pop — rasterise the icon; with --screens, capture title/gameplay/result via the autopilot and smoke-test. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const ROOT = resolve(import.meta.dirname, '..'), REPO = resolve(ROOT, '..');
const PORT = 8089, BASE = `http://127.0.0.1:${PORT}/pop/`;
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
  await page.goto(BASE + '?testads=1'); await page.waitForFunction(() => !!window.__pop); await page.waitForTimeout(1500);
  await shot(page, 'title');
  // first play: the Play button shows the tutorial, then starts the game
  await page.click('#play'); await page.waitForTimeout(400);
  const tut = await page.evaluate(() => !!document.querySelector('.tutorial'));
  if (!tut) errors.push('tutorial did not appear on first play');
  await shot(page, 'tutorial');
  for (let i = 0; i < 3; i++) { await page.click('.tutorial .btn.primary'); await page.waitForTimeout(200); }
  const st0 = await page.evaluate(() => window.__pop.state + '|' + !document.querySelector('.tutorial'));
  if (st0 !== 'play|true') errors.push(`tutorial did not hand off to play (${st0})`);
  // second start must not show it again; a tap on the logo itself starts the game
  await page.evaluate(() => { const a = window.__pop; a.toTitle(); });
  await page.waitForTimeout(200);
  const logo = await page.$('#title .logo'); const box = await logo.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300);
  if (await page.evaluate(() => !!document.querySelector('.tutorial'))) errors.push('tutorial shown twice');
  if ((await page.evaluate(() => window.__pop.state)) !== 'play') errors.push('tapping the logo did not start the game');
  // the ? button replays the tutorial on demand
  await page.evaluate(() => window.__pop.toTitle()); await page.waitForTimeout(200);
  await page.click('.help-btn'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => !!document.querySelector('.tutorial')))) errors.push('help button did not open the tutorial');
  await page.click('.tutorial .skip-tut'); await page.waitForTimeout(200);
  await page.click('#play'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__pop.autopilot = true; });
  await page.waitForFunction(() => window.__pop.game.score >= 6, null, { timeout: 60000 });
  await page.waitForTimeout(300); await shot(page, 'gameplay');
  await page.evaluate(() => { window.__pop.autopilot = false; });
  await page.waitForFunction(() => window.__pop.state === 'over', null, { timeout: 90000 });
  await page.waitForTimeout(600); await shot(page, 'gameover');
  // continue by watching a (simulated) ad keeps the score
  const before = await page.evaluate(() => window.__pop.game.score);
  const contVisible = await page.evaluate(() => { const b = [...document.querySelectorAll('#over .btn')].find(x => /Continue/.test(x.textContent)); return b && !b.hidden; });
  if (!contVisible) errors.push('continue button not offered with test ads');
  else {
    await page.evaluate(() => [...document.querySelectorAll('#over .btn')].find(x => /Continue/.test(x.textContent)).click());
    await page.waitForTimeout(3600);
    const after = await page.evaluate(() => ({ s: window.__pop.state, score: window.__pop.game.score, lives: window.__pop.game.lives }));
    if (after.s !== 'play' || after.score !== before || after.lives !== 2) errors.push(`continue did not resume correctly ${JSON.stringify(after)} vs ${before}`);
    await page.waitForTimeout(400); await page.evaluate(() => { window.__pop.autopilot = false; });
    await page.waitForFunction(() => window.__pop.state === 'over', null, { timeout: 90000 }); await page.waitForTimeout(500);
    const again = await page.evaluate(() => { const b = [...document.querySelectorAll('#over .btn')].find(x => /Continue/.test(x.textContent)); return b && !b.hidden; });
    if (again) errors.push('continue offered twice in one run');
  }
  // challenge link: banner → accept → seeded game
  await page.goto(BASE + '?t=' + Date.now() + '#c=123456789.420.NIK'); await page.waitForFunction(() => !!window.__pop); await page.waitForTimeout(500);
  const banner = await page.evaluate(() => { const b = document.querySelector('#title .banner'); return b && !b.hidden && b.textContent; });
  if (!banner || !/NIK/.test(banner)) errors.push('challenge banner missing');
  await shot(page, 'challenge');
  await page.click('#title .banner button'); await page.waitForTimeout(300);
  const seed = await page.evaluate(() => window.__pop.seed);
  if (seed !== 123456789) errors.push(`challenge did not seed the game (${seed})`);
  await page.evaluate(() => { window.__pop.autopilot = true; });
  await page.waitForFunction(() => window.__pop.game.score >= 3, null, { timeout: 60000 });
  await page.evaluate(() => { window.__pop.autopilot = false; });
  await page.waitForFunction(() => window.__pop.state === 'over', null, { timeout: 90000 }); await page.waitForTimeout(500);
  const versus = await page.evaluate(() => { const v = document.querySelector('#over .versus'); return v && !v.hidden && v.textContent; });
  if (!versus || !/NIK/.test(versus)) errors.push('versus line missing after a challenge run');
  await shot(page, 'versus');
  // sharing standalone (no navigator.share in headless) must still surface the link
  await page.evaluate(() => { delete navigator.share; });
  await page.evaluate(() => [...document.querySelectorAll('#over .btn')].find(x => /Send result|Challenge/.test(x.textContent)).click());
  await page.waitForTimeout(500);
  const surfaced = await page.evaluate(() => !!document.querySelector('.link-sheet') || (document.getElementById('toast') && !document.getElementById('toast').hidden));
  if (!surfaced) errors.push('share produced neither a toast nor a link sheet');
  await page.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('smoke test: no page errors');
}
const server = await startServer(); const browser = await chromium.launch();
try { await renderIcons(browser); if (wantScreens) await renderScreens(browser); } finally { await browser.close(); server.kill(); }
