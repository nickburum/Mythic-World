/**
 * Game Box — haptics for the hub and every game. Inside the iOS shell the
 * `haptics` message handler maps to UIImpactFeedbackGenerator (iOS Safari has
 * no Vibration API); on the web the Vibration API is used where it exists.
 */
let enabled = true;
const bridge = () => (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptics) || null;
const native = (kind) => { const b = bridge(); if (!b) return false; try { b.postMessage(kind); } catch {} return true; };
const web = (p) => { try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(p); } catch {} };
export const haptics = {
  setEnabled(v) { enabled = !!v; },
  get enabled() { return enabled; },
  light() { if (!enabled) return; if (!native('light')) web(8); },
  medium() { if (!enabled) return; if (!native('medium')) web(18); },
  heavy() { if (!enabled) return; if (!native('heavy')) web([30, 40, 50]); },
  /** Vibration-API style call (number or pattern) mapped onto the three levels. */
  pulse(p) { if (!enabled) return; const total = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p; if (total >= 60) this.heavy(); else if (total >= 15) this.medium(); else this.light(); },
};
