/**
 * MELT — input. One verb with two edges: press (start heating) and release
 * (start cooling). Pointer events cover touch, mouse and pen; Space / Enter /
 * ArrowUp on desktop. Elements marked `data-ui` do not count as game input.
 */
export function bindHold(target, { onPress, onRelease }) {
  let pointerDown = false;
  let keyDown = false;
  const update = () => {
    const held = pointerDown || keyDown;
    if (held && !state.held) { state.held = true; onPress(); }
    else if (!held && state.held) { state.held = false; onRelease(); }
  };
  const state = { held: false };

  const down = (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-ui]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    pointerDown = true;
    update();
  };
  const up = () => { pointerDown = false; update(); };
  target.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', up);

  const isKey = (e) => e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp';
  const kd = (e) => { if (!isKey(e) || e.repeat) return; e.preventDefault(); keyDown = true; update(); };
  const ku = (e) => { if (!isKey(e)) return; keyDown = false; update(); };
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  target.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  target.addEventListener('contextmenu', e => e.preventDefault());

  return state;
}
