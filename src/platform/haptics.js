/**
 * Sky Temple — haptics. Uses the Vibration API where available (Android
 * browsers / PWAs). iOS Safari has no web haptics; the native port should
 * map these three calls to UIImpactFeedbackGenerator light/medium/heavy.
 */
const can = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptics = {
  light() { if (can()) navigator.vibrate(8); },
  medium() { if (can()) navigator.vibrate(18); },
  heavy() { if (can()) navigator.vibrate([30, 40, 50]); },
};
