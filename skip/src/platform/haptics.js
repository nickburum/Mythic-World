/**
 * SKIP — haptics. Vibration API on the web; inside the iOS shell the
 * `haptics` message handler maps to UIImpactFeedbackGenerator.
 */
let enabled = true;
const bridge = () => (typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptics) || null;
const vib = (p) => { if (!enabled) return; const b = bridge(); if (b) { b.postMessage(typeof p === 'number' ? 'light' : 'heavy'); return; } if (navigator.vibrate) navigator.vibrate(p); };
export const haptics = {
  setEnabled(v) { enabled = !!v; },
  light() { vib(8); },
  medium() { const b = bridge(); if (b && enabled) { b.postMessage('medium'); return; } vib(18); },
  heavy() { vib([30, 40, 50]); },
};
