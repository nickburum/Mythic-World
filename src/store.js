/**
 * Game Box — the one in-app purchase: "Go ad-free" (non-consumable).
 * Ad-free players continue a run without watching anything.
 *
 * Native (StoreKit 2, ios/GameBox/StoreBridge.swift):
 *   JS → { type: 'products' } | { type: 'buy', id } | { type: 'restore' }
 *   native → StoreBridge.onProducts([{ id, price }]), StoreBridge.onEntitlement({ adfree })
 * Web: no purchases; the buttons stay hidden.
 */
export const AD_FREE_ID = 'com.mythicworld.gamebox.adfree';
const KEY = 'gamebox.adfree';
const bridge = () => (typeof window !== 'undefined' && window.webkit?.messageHandlers?.store) || null;
export const isAdFree = () => { try { return JSON.parse(localStorage.getItem(KEY)) === true; } catch { return false; } };

export class Store {
  constructor() {
    this.price = null; this.listeners = []; this.busy = false;
    if (typeof window !== 'undefined') {
      window.StoreBridge = {
        onProducts: (list) => { const p = (list || []).find((x) => x.id === AD_FREE_ID); this.price = p ? p.price : null; this.changed(); },
        onEntitlement: ({ adfree }) => { this.busy = false; const was = isAdFree(); try { localStorage.setItem(KEY, JSON.stringify(!!adfree)); } catch {} this.changed(!was && !!adfree); },
      };
    }
  }
  get available() { return !!bridge(); }
  get adFree() { return isAdFree(); }
  onChange(fn) { this.listeners.push(fn); }
  changed(justBought = false) { for (const fn of this.listeners) fn(this, justBought); }
  post(m) { try { bridge().postMessage(m); } catch { /* web */ } }
  load() { if (this.available) this.post({ type: 'products' }); }
  buy() { if (!this.available || this.busy || this.adFree) return; this.busy = true; this.changed(); this.post({ type: 'buy', id: AD_FREE_ID }); }
  restore() { if (!this.available || this.busy) return; this.busy = true; this.changed(); this.post({ type: 'restore' }); }
}
