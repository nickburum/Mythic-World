/**
 * MELT — haptics via the Vibration API where available. iOS Safari has no
 * web haptics; the native shell maps these to UIImpactFeedbackGenerator.
 */
const can = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
export const haptics = {
  light() { if (can()) navigator.vibrate(8); },
  medium() { if (can()) navigator.vibrate(18); },
  heavy() { if (can()) navigator.vibrate([30, 40, 50]); },
};
