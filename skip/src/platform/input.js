/**
 * SKIP — input: press and release on the play surface. Pointer events cover
 * touch, mouse and pen; Space / Enter on desktop. Elements marked `data-ui`
 * (menus, buttons, the game switcher) never count as play input.
 */
export function bindPress(target, { onPress, onRelease }) {
  let pointerDown = false, keyDown = false, held = false;
  const sync = () => {
    const h = pointerDown || keyDown;
    if (h && !held) { held = true; onPress(); }
    else if (!h && held) { held = false; onRelease(); }
  };
  const down = (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-ui]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pointerDown = true; sync();
  };
  const up = () => { pointerDown = false; sync(); };
  target.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', up);
  const isKey = (e) => e.code === 'Space' || e.code === 'Enter';
  window.addEventListener('keydown', (e) => { if (!isKey(e) || e.repeat) return; if (e.target && e.target.closest && e.target.closest('button, input')) return; e.preventDefault(); keyDown = true; sync(); });
  window.addEventListener('keyup', (e) => { if (!isKey(e)) return; keyDown = false; sync(); });
  target.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  target.addEventListener('contextmenu', e => e.preventDefault());
}
