/* js/storage.js — Persistent player legacy storage
   Uses localStorage for GitHub Pages (no backend needed).
   Each realm stores its own legend list.
   Future: swap this module for a real backend without touching anything else. */

const Storage = (() => {
  const KEY = "mythicworld_legacies_v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(legacies) {
    try {
      localStorage.setItem(KEY, JSON.stringify(legacies));
    } catch (e) {
      console.warn("Storage full or unavailable:", e);
    }
  }

  function addLegacy(legacy) {
    const all = load();
    // Cap at 200 total to avoid localStorage overflow
    if (all.length >= 200) all.shift();
    all.push({
      ...legacy,
      id: Date.now() + Math.random().toString(36).slice(2),
      date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })
    });
    save(all);
    return all;
  }

  function getLegacies(realm) {
    return load().filter(l => l.realm === realm);
  }

  function getAllLegacies() {
    return load();
  }

  function count() {
    return load().length;
  }

  return { load, addLegacy, getLegacies, getAllLegacies, count };
})();
