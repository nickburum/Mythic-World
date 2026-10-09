/**
 * Sky Temple — input. One verb: "tap".
 * Pointer events cover touch, mouse and pen; Space/Enter for desktop testing.
 * Elements marked `data-ui` (buttons, panels) do not count as game taps.
 */
export function bindTap(target, onTap) {
  const handler = (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-ui]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    onTap(e);
  };
  target.addEventListener('pointerdown', handler, { passive: false });

  const key = (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
      e.preventDefault();
      onTap(e);
    }
  };
  window.addEventListener('keydown', key);

  // Block iOS double-tap zoom and long-press callouts over the canvas.
  target.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  target.addEventListener('contextmenu', e => e.preventDefault());

  return () => {
    target.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', key);
  };
}
