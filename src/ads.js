/**
 * Game Box — rewarded ads ("Continue by watching an ad"). The only ad unit
 * in the box: no banners, nothing on screen while you play.
 *
 * Native: the iOS shell exposes `webkit.messageHandlers.ads`
 *   JS → { type: 'load' } | { type: 'show' }
 *   native → AdsBridge.onReady(true|false), AdsBridge.onResult({ rewarded: bool })
 * Web: no ads, unless `?testads=1` (or localStorage gamebox.testAds) turns
 * on a simulated 3-second ad so the flow can be exercised in a browser.
 */
const bridge = () => (typeof window !== 'undefined' && window.webkit?.messageHandlers?.ads) || null;
const simulated = () => { try { return /[?&]testads=1/.test(location.search) || localStorage.getItem('gamebox.testAds') === '1'; } catch { return false; } };

export class Ads {
  constructor() {
    this.ready = false; this.listeners = []; this.pending = null;
    if (typeof window !== 'undefined') {
      window.AdsBridge = {
        onReady: (ok) => { this.ready = !!ok; this.changed(); },
        onResult: ({ rewarded }) => { const p = this.pending; this.pending = null; this.ready = false; this.changed(); if (p) p(!!rewarded); this.load(); },
      };
    }
    if (simulated()) this.ready = true;
    this.load();
  }
  get available() { return this.ready && (!!bridge() || simulated()); }
  onChange(fn) { this.listeners.push(fn); }
  changed() { for (const fn of this.listeners) fn(this); }
  post(m) { try { bridge().postMessage(m); } catch { /* web */ } }
  load() { if (bridge()) this.post({ type: 'load' }); }
  /** Show a rewarded ad. Resolves true when the reward was earned. */
  show() {
    if (!this.available) return Promise.resolve(false);
    if (bridge()) return new Promise((res) => { this.pending = res; this.post({ type: 'show' }); });
    return this.simulate();
  }
  simulate() {
    return new Promise((res) => {
      const el = document.createElement('div');
      el.setAttribute('data-ui', '');
      el.style.cssText = 'position:fixed;inset:0;z-index:100;background:#0b1020;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:800 14px/1.4 ui-rounded,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.2em;text-transform:uppercase';
      el.innerHTML = '<div style="width:56px;height:56px;border:1px solid rgba(255,255,255,.4);border-radius:14px;display:grid;place-items:center;font-size:22px;letter-spacing:0">AD</div><div>Test ad</div><div id="ads-count" style="color:rgba(255,255,255,.6)">3</div>';
      document.body.appendChild(el);
      let n = 3; const t = setInterval(() => { n--; el.querySelector('#ads-count').textContent = n; if (n <= 0) { clearInterval(t); el.remove(); res(true); } }, 1000);
    });
  }
}
export const ads = new Ads();
