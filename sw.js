/* Game Box hub — offline cache for the launcher. Each game keeps its own worker in its folder. */
const VERSION = 'gamebox-v1';
const ASSETS = ['./', './index.html', './css/box.css', './src/box.js', './src/games.js', './manifest.webmanifest', './art/icon.svg', './art/icon-192.png', './art/icon-512.png', './art/icon-180.png',
  './melt/art/icon-192.png', './skip/art/icon-192.png', './pop/art/icon-192.png', './orbit/art/icon-192.png', './sky-temple/art/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('gamebox-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // only handle the hub's own files; games are served by their own workers
  if (/\/(melt|skip|pop|orbit|sky-temple)\//.test(url.pathname) && !url.pathname.endsWith('icon-192.png')) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {}); return res; }).catch(() => hit)));
});
