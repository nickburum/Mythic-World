/**
 * SKIP — leaderboards.
 *
 * Two layers:
 *  • LocalBoard   — a top-10 kept in storage. Works everywhere, instantly.
 *  • Leaderboard  — wraps LocalBoard and, when the page runs inside the iOS
 *    shell (native/ios), talks to Game Center through a WKScriptMessageHandler
 *    named `gameCenter`. The shell calls back into `window.GameCenterBridge`.
 *
 * Bridge protocol (JS → native, `postMessage(object)`):
 *   { type: 'authenticate' }
 *   { type: 'submit', leaderboardID, score }     score is an integer (metres × 10)
 *   { type: 'show', leaderboardID }
 * Native → JS:
 *   GameCenterBridge.onAuth({ authenticated: bool, alias: string })
 *   GameCenterBridge.onSubmitted({ ok: bool, error?: string })
 *
 * Game Center scores are integers, so distance is sent in decimetres and the
 * leaderboard in App Store Connect is formatted "Fixed point, 1 decimal".
 */

export class LocalBoard {
  constructor(store, key = 'board', size = 10) {
    this.store = store; this.key = key; this.size = size;
    this.entries = store.get(key, []);
  }
  /** @returns {{score:number, at:number}[]} sorted desc */
  top(n = this.size) { return this.entries.slice(0, n); }
  best() { return this.entries.length ? this.entries[0].score : 0; }
  /** 1-based rank the score would hold, or null if it misses the board. */
  rankOf(score) {
    const i = this.entries.findIndex(e => e.score === score);
    return i >= 0 ? i + 1 : null;
  }
  add(score, at = Date.now()) {
    this.entries.push({ score, at });
    this.entries.sort((a, b) => b.score - a.score || a.at - b.at);
    this.entries = this.entries.slice(0, this.size);
    this.store.set(this.key, this.entries);
    return this.rankOf(score);
  }
}

export class Leaderboard {
  /**
   * @param {{ leaderboardID: string, store: {get:Function,set:Function}, key?: string }} opts
   */
  constructor({ leaderboardID, store, key = 'board' }) {
    this.leaderboardID = leaderboardID;
    this.local = new LocalBoard(store, key);
    this.status = this.nativeAvailable ? 'connecting' : 'local';
    this.alias = '';
    this.listeners = [];
    if (typeof window !== 'undefined') {
      window.GameCenterBridge = {
        onAuth: ({ authenticated, alias }) => { this.status = authenticated ? 'connected' : 'unavailable'; this.alias = alias || ''; this.changed(); },
        onSubmitted: ({ ok, error }) => { this.lastSubmit = { ok, error }; this.changed(); },
      };
    }
  }

  get nativeAvailable() {
    return typeof window !== 'undefined' && !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.gameCenter);
  }

  onChange(fn) { this.listeners.push(fn); }
  changed() { for (const fn of this.listeners) fn(this); }

  post(msg) { try { window.webkit.messageHandlers.gameCenter.postMessage(msg); } catch { /* not in shell */ } }

  /** Ask the native shell to sign the player in (no-op on the web). */
  init() {
    if (this.nativeAvailable) this.post({ type: 'authenticate' });
    return this.status;
  }

  /**
   * Record a finished run. Always lands on the local board; also submitted to
   * Game Center when the shell is present.
   * @param {number} distance metres
   * @returns {{ rank: number|null, isBest: boolean }}
   */
  submit(distance) {
    const score = Math.round(distance * 10) / 10;
    const wasBest = this.local.best();
    const rank = this.local.add(score);
    if (this.nativeAvailable) this.post({ type: 'submit', leaderboardID: this.leaderboardID, score: Math.round(distance * 10) });
    return { rank, isBest: score > wasBest };
  }

  /** Open the native Game Center sheet; returns false when unavailable (caller shows the local list). */
  showNative() {
    if (!this.nativeAvailable) return false;
    this.post({ type: 'show', leaderboardID: this.leaderboardID });
    return true;
  }
}
