/**
 * Measures average frame time of the live game in headless Chromium at 4× CPU
 * throttling, per quality tier. A rough proxy for a mid-range phone; use it to
 * compare before/after when touching the renderer.
 *   node tools/perf.mjs
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
function loadPlaywright() { try { return require('playwright'); } catch {} for (const p of (process.env.NODE_PATH || '').split(':').concat(['/opt/node-tools/node_modules', '/usr/lib/node_modules'])) { try { return createRequire(resolve(p, 'x.js'))('playwright'); } catch {} } throw new Error('playwright not found'); }
const { chromium } = loadPlaywright();
const REPO = resolve(import.meta.dirname, '..', '..'); const PORT = 8091; const BASE = `http://127.0.0.1:${PORT}/skip/`;
const srv = spawn('npx', ['http-server', REPO, '-p', String(PORT), '-s', '-c-1'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
const browser = await chromium.launch();
try {
  for (const q of ['high', 'medium', 'low']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(BASE); await page.waitForFunction(() => !!window.__skip);
    await page.evaluate((q) => { const a = window.__skip; a.qualityPref = q; a.setQuality(q); a.start(); a.autopilot = true; }, q);
    await page.waitForTimeout(1500);
    const ms = await page.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const tick = () => { if (++n >= 120) res((performance.now() - t0) / n); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
    console.log(`${q.padEnd(7)} avg frame ${ms.toFixed(1)} ms  (${(1000 / ms).toFixed(0)} fps) @4× CPU throttle, DPR3 phone`);
    await page.close();
  }
} finally { await browser.close(); srv.kill(); }
