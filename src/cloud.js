/**
 * Game Box — scores that survive deleting the app. Mirrors the games' score
 * keys to iCloud Key-Value Storage through the iOS shell's `cloud` bridge.
 *   JS → { type: 'getAll' } | { type: 'set', key, value } | { type: 'remove', key }
 *   native → CloudBridge.onSnapshot({ key: value, … })   (on request and when iCloud changes)
 * Merging is conservative: numbers keep the max, boards keep the union,
 * friends keep each tag's best, strings prefer the local value.
 * Pure functions are exported for tests; the Cloud class does the I/O.
 */
export const SYNC_KEYS = ['melt.best', 'melt.games', 'skip.board', 'skip.friends', 'skip.games', 'skip.name', 'pop.best', 'pop.games', 'orbit.best', 'orbit.games', 'skytemple.best', 'skytemple.games', 'gamebox.tutorials'];

const parse = (raw) => { if (raw === null || raw === undefined) return undefined; try { return JSON.parse(raw); } catch { return raw; } };

/** Merge one key's local and cloud raw values. Returns the merged raw string (or undefined when both absent). */
export function mergeValue(key, localRaw, cloudRaw) {
  const a = parse(localRaw), b = parse(cloudRaw);
  if (a === undefined) return cloudRaw === undefined || cloudRaw === null ? undefined : cloudRaw;
  if (b === undefined) return localRaw;
  if (typeof a === 'number' && typeof b === 'number') return JSON.stringify(Math.max(a, b));
  if (Array.isArray(a) && Array.isArray(b)) {
    if (key.endsWith('.friends')) {
      const byTag = new Map();
      for (const e of [...a, ...b]) { const cur = byTag.get(e.tag); if (!cur || e.score > cur.score) byTag.set(e.tag, e); }
      return JSON.stringify([...byTag.values()].sort((x, y) => y.score - x.score || x.at - y.at));
    }
    const seen = new Set(), out = [];
    for (const e of [...a, ...b]) { const k = JSON.stringify([e.score, e.at]); if (!seen.has(k)) { seen.add(k); out.push(e); } }
    out.sort((x, y) => y.score - x.score || x.at - y.at);
    return JSON.stringify(out.slice(0, 10));
  }
  if (typeof a === 'object' && a && typeof b === 'object' && b) return JSON.stringify({ ...b, ...a });
  return localRaw;
}

/** Merge whole snapshots: returns { merged: {key: raw}, changedLocal: [keys], changedCloud: [keys] }. */
export function mergeSnapshot(local, cloud) {
  const merged = {}, changedLocal = [], changedCloud = [];
  for (const k of SYNC_KEYS) {
    const m = mergeValue(k, local[k], cloud[k]);
    if (m === undefined) continue;
    merged[k] = m;
    if (m !== local[k]) changedLocal.push(k);
    if (m !== cloud[k]) changedCloud.push(k);
  }
  return { merged, changedLocal, changedCloud };
}

export class Cloud {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage; this.listeners = []; this.last = {};
    if (typeof window !== 'undefined') window.CloudBridge = { onSnapshot: (snap) => this.onSnapshot(snap || {}) };
  }
  get available() { return !!(typeof window !== 'undefined' && window.webkit?.messageHandlers?.cloud); }
  post(m) { try { window.webkit.messageHandlers.cloud.postMessage(m); } catch { /* web */ } }
  onChange(fn) { this.listeners.push(fn); }
  local() { const o = {}; for (const k of SYNC_KEYS) { const v = this.storage.getItem(k); if (v !== null) o[k] = v; } return o; }
  /** Ask the shell for the cloud copy; the answer arrives in onSnapshot. */
  init() { if (this.available) this.post({ type: 'getAll' }); }
  onSnapshot(cloud) {
    const { merged, changedLocal, changedCloud } = mergeSnapshot(this.local(), cloud);
    for (const k of changedLocal) this.storage.setItem(k, merged[k]);
    for (const k of changedCloud) this.post({ type: 'set', key: k, value: merged[k] });
    this.last = merged;
    if (changedLocal.length) for (const fn of this.listeners) fn(changedLocal);
  }
  /** Push local changes up (call after a game ends / on return to the hub). */
  push() {
    if (!this.available) return;
    const l = this.local();
    for (const k of SYNC_KEYS) if (l[k] !== undefined && l[k] !== this.last[k]) { this.post({ type: 'set', key: k, value: l[k] }); this.last[k] = l[k]; }
  }
}
