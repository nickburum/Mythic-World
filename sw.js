/* Game Box hub — offline cache for the launcher. Each game keeps its own worker in its folder. */
const VERSION = 'gamebox-v4';
const ASSETS = ['./', './index.html', './css/box.css', './src/box.js', './src/games.js', './src/cloud.js', './src/share.js', './src/haptics.js', './manifest.webmanifest', './art/icon.svg', './art/icon-192.png', './art/icon-512.png', './art/icon-180.png',
  './melt/art/icon-192.png', './skip/art/icon-192.png', './pop/art/icon-192.png', './orbit/art/icon-192.png', './sky-temple/art/icon-192.png'];
// Code and pages: network first (a deploy reaches returning players at once), cache as the offline fallback.
// Images: cache first. Only this worker's own old caches are deleted — never another game's.
const PREFIX = VERSION.replace(/-v[^-]*$/, '-');
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => console.warn('precache miss', a))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // only the hub's own files; games are served by their own workers
  if (/\/(melt|skip|pop|orbit|sky-temple)\//.test(url.pathname) && !url.pathname.endsWith('icon-192.png')) return;
  const put = (res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {}); } return res; };
  if (/\.(png|jpe?g|webp|svg|ico)$/.test(url.pathname)) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put))); return; }
  e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
