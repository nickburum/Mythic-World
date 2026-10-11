/**
 * Game Box — rewarded ads ("Continue by watching an ad"). The only ad unit
 * in the box: no banners, nothing on screen while you play.
 *
 * Native: the iOS shell exposes `webkit.messageHandlers.ads`
 *   JS → { type: 'load' } | { type: 'show' }
 *   native → AdsBridge.onReady(true|false), AdsBridge.onResult({ rewarded: bool })
 * Web: no ads, unless `?testads=1` (or localStorage gamebox.testAds) turns
 * on a simulated 3-second ad so the flow can be exercised in a browser.
 *
 * Age (COPPA): no ad is requested — and the native SDK is not even started —
 * until the player has answered a neutral "year you were born" question once.
 * Under 13 → child-directed treatment + G-rated ads only; 13–15 → treated as
 * under the EU age of consent; 16+ → standard non-personalised ads (we never
 * show the tracking prompt). The answer is stored as a band, never the year.
 */
const bridge = () => (typeof window !== 'undefined' && window.webkit?.messageHandlers?.ads) || null;
export const ageBandFor = (birthYear, now = new Date()) => { const age = now.getFullYear() - birthYear; return age < 13 ? 'child' : age < 16 ? 'teen' : 'adult'; };
const AGE_KEY = 'gamebox.ageBand';
const readBand = () => { try { const v = JSON.parse(localStorage.getItem(AGE_KEY)); return ['child', 'teen', 'adult'].includes(v) ? v : null; } catch { return null; } };
const adFree = () => { try { return JSON.parse(localStorage.getItem('gamebox.adfree')) === true; } catch { return false; } };
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
  /** Ad-free players continue without an ad. */
  get adFree() { return adFree(); }
  get available() { return adFree() || (this.ready && (!!bridge() || simulated())); }
  /** Native ads need the age question answered first. */
  get needsAge() { return !!bridge() && !readBand() && !adFree(); }
  get ageBand() { return readBand(); }
  setBirthYear(y) { const band = ageBandFor(Number(y)); try { localStorage.setItem(AGE_KEY, JSON.stringify(band)); } catch {} this.load(); this.changed(); return band; }
  onChange(fn) { this.listeners.push(fn); }
  changed() { for (const fn of this.listeners) fn(this); }
  post(m) { try { bridge().postMessage(m); } catch { /* web */ } }
  load() { const band = readBand(); if (bridge() && band) this.post({ type: 'load', childDirected: band === 'child', underAgeOfConsent: band !== 'adult' }); }
  /** Show a rewarded ad. Resolves true when the reward was earned. */
  show() {
    if (adFree()) return Promise.resolve(true);
    if (!this.available) return Promise.resolve(false);
    if (bridge()) return new Promise((res) => {
      const t = setTimeout(() => { if (this.pending === done) { this.pending = null; this.ready = false; this.changed(); res(false); this.load(); } }, 60000);
      const done = (ok) => { clearTimeout(t); res(ok); };
      this.pending = done; this.post({ type: 'show' });
    });
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
