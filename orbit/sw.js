const VERSION = 'orbit-v5';
const ASSETS = ['./', './index.html', './css/style.css', '../css/game-ui.css', '../src/extras.js', '../src/share.js', '../src/music.js', '../src/haptics.js', '../src/pause.js', '../src/progress.js', '../src/themes.js', '../src/meta.js', '../src/games.js', '../src/ads.js', '../src/challenge.js', './src/extras-config.js', '../switcher.js', './src/main.js', './src/core/orbit.js', './src/render/renderer.js', './art/icon.svg', './art/icon-192.png', './art/icon-512.png', './art/icon-180.png'];
// Code and pages: network first (a deploy reaches returning players at once), cache as the offline fallback.
// Images: cache first. Only this worker's own old caches are deleted — never another game's.
const PREFIX = VERSION.replace(/-v[^-]*$/, '-');
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => console.warn('precache miss', a))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {}); } return res; };
  if (/\.(png|jpe?g|webp|svg|ico)$/.test(url.pathname)) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
