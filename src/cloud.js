/**
 * Game Box — scores that survive deleting the app. Mirrors the games' score
 * keys to iCloud Key-Value Storage through the iOS shell's `cloud` bridge.
 *   JS → { type: 'getAll' } | { type: 'set', key, value } | { type: 'remove', key }
 *   native → CloudBridge.onSnapshot({ key: value, … })   (on request and when iCloud changes)
 * Merging is conservative: numbers keep the max, boards keep the union,
 * friends keep each tag's best, strings prefer the local value.
 * Pure functions are exported for tests; the Cloud class does the I/O.
 */
export const SYNC_KEYS = ['melt.best', 'melt.games', 'skip.board', 'skip.friends', 'skip.games', 'skip.name', 'pop.best', 'pop.games', 'orbit.best', 'orbit.games', 'skytemple.best', 'skytemple.games', 'gamebox.tutorials',
  'gamebox.xp', 'gamebox.runs', 'gamebox.daily', 'gamebox.days', 'gamebox.streak', 'gamebox.unlocks', 'gamebox.themes', 'gamebox.adfree', 'gamebox.tag'];

const parse = (raw) => { if (raw === null || raw === undefined) return undefined; try { return JSON.parse(raw); } catch { return raw; } };

/** Merge one key's local and cloud raw values. Returns the merged raw string (or undefined when both absent). */
export function mergeValue(key, localRaw, cloudRaw) {
  const a = parse(localRaw), b = parse(cloudRaw);
  if (a === undefined) return cloudRaw === undefined || cloudRaw === null ? undefined : cloudRaw;
  if (b === undefined) return localRaw;
  if (typeof a === 'number' && typeof b === 'number') return JSON.stringify(Math.max(a, b));
  if (typeof a === 'boolean' || typeof b === 'boolean') return JSON.stringify(!!a || !!b);
  if (key === 'gamebox.daily' && a && b) { if (a.date !== b.date) return a.date > b.date ? localRaw : cloudRaw; return JSON.stringify({ ...b, ...a, best: Math.max(a.best || 0, b.best || 0), attempts: Math.max(a.attempts || 0, b.attempts || 0), done: !!(a.done || b.done), claimed: !!(a.claimed || b.claimed) }); }
  if (key === 'gamebox.streak' && a && b) { if ((a.last || '') !== (b.last || '')) { const w = (a.last || '') > (b.last || '') ? a : b, l = w === a ? b : a; return JSON.stringify({ ...w, best: Math.max(a.best || 0, b.best || 0), shield: Math.max(a.shield || 0, b.shield || 0, l.shield || 0) }); } return JSON.stringify({ ...a, count: Math.max(a.count || 0, b.count || 0), best: Math.max(a.best || 0, b.best || 0), shield: Math.max(a.shield || 0, b.shield || 0) }); }
  if (key === 'gamebox.days' && Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...new Set([...a, ...b])].sort().slice(-90));
  if (key === 'gamebox.unlocks' && a && b) { const o = { ...b }; for (const k in a) o[k] = o[k] ? Math.min(o[k], a[k]) : a[k]; return JSON.stringify(o); }
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
    for (const k of SYNC_KEYS) {
      if (l[k] === undefined || l[k] === this.last[k]) continue;
      // never let a stale in-memory value in a game undo a merge: merge against the last cloud copy first
      const v = this.last[k] === undefined ? l[k] : mergeValue(k, l[k], this.last[k]);
      if (v !== l[k]) this.storage.setItem(k, v);
      this.post({ type: 'set', key: k, value: v }); this.last[k] = v;
    }
  }
  /** Forget keys everywhere (reset scores): local, our mirror, and iCloud. */
  remove(keys) {
    for (const k of keys) { this.storage.removeItem(k); delete this.last[k]; if (this.available) this.post({ type: 'remove', key: k }); }
  }
}
