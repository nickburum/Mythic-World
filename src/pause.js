/**
 * Game Box — pause on interruption. A run freezes when the page is hidden,
 * when iOS resigns the app (Control Center, a call banner — the shell posts
 * `gamebox:pause`), or when the hub asks; a tap on the overlay resumes.
 * Games read `pause.paused` and run their simulation with dt = 0 meanwhile.
 */
const IN_RUN = ['play', 'playing', 'flight', 'ready', 'falling'];
const defaultPlaying = () => IN_RUN.includes(document.body.dataset.state);

export function attachPause({ playing = defaultPlaying, onChange = () => {} } = {}) {
  const t = document.createElement('template');
  t.innerHTML = '<section class="overlay pause-screen" data-ui role="dialog" aria-modal="true" aria-label="Paused" hidden><div class="pause-card"><b>Paused</b><small>Tap to resume</small></div></section>';
  const ov = t.content.firstElementChild; document.body.appendChild(ov);
  const api = {
    paused: false,
    pause() { if (api.paused || !playing()) return; api.paused = true; ov.hidden = false; onChange(true); },
    resume() { if (!api.paused) return; api.paused = false; ov.hidden = true; onChange(false); },
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) api.pause(); });
  window.addEventListener('pagehide', () => api.pause());
  window.addEventListener('blur', () => { if (window.parent === window) api.pause(); });   // standalone only; in the box the hub decides
  window.addEventListener('message', (e) => { if (e.data && e.data.type === 'gamebox:pause') api.pause(); });
  ov.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => api.resume(), 0); });
  return api;
}
