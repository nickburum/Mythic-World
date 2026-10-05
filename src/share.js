/**
 * Game Box — sharing that always does something.
 * Order: inside the box → hand the request to the hub (top frame, which has
 * the permissions); native share sheet; clipboard; and finally a small sheet
 * showing the link with a Copy button. Never fails silently.
 */
const inBox = () => typeof window !== 'undefined' && window.parent !== window;

export async function shareLink({ title, text, url }, { toast } = {}) {
  if (inBox()) { try { window.parent.postMessage({ type: 'gamebox:share', title, text, url }, '*'); return 'delegated'; } catch { /* fall through */ } }
  return shareHere({ title, text, url }, { toast });
}

/** Perform the share in this frame (the hub calls this for delegated requests). */
export async function shareHere({ title, text, url }, { toast } = {}) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); if (toast) toast('Link copied'); return 'copied'; } catch { /* fall through */ }
  linkSheet({ title, text, url, toast });
  return 'sheet';
}

/** Minimal bottom sheet with the link and a Copy button (execCommand fallback works without permissions). */
export function linkSheet({ title, text, url, toast }) {
  document.querySelector('.link-sheet')?.remove();
  const wrap = document.createElement('section');
  wrap.className = 'overlay menu link-sheet'; wrap.setAttribute('data-ui', '');
  wrap.innerHTML = `<div class="panel"><div class="label">${title || 'Share'}</div><p class="tut-text">${text || ''}</p><input class="link-input" type="text" readonly value="${url}" /><button class="btn primary big" type="button">Copy link</button><button class="btn" type="button">Done</button></div>`;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('input'), [copy, done] = wrap.querySelectorAll('button');
  copy.addEventListener('click', () => { input.focus(); input.select(); input.setSelectionRange(0, 9999); let ok = false; try { ok = document.execCommand('copy'); } catch {} if (!ok) navigator.clipboard?.writeText(url).then(() => { ok = true; }).catch(() => {}); copy.textContent = 'Copied'; if (toast) toast('Link copied'); });
  done.addEventListener('click', () => wrap.remove());
  input.addEventListener('focus', () => input.select());
}
