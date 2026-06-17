const CACHE = 'drama-games-v7';

/* App-shell files: change often, must always prefer the network so a normal
   reload picks up new content without needing a cache-version bump. */
const CORE_PATHS = ['/', '/index.html', '/app.js', '/games-data.js', '/sw.js'];

/* Rarely change — fine to serve from cache first for speed/offline. */
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg',
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;700&family=Barlow:wght@400;600&display=swap'
];

const ALL_ASSETS = [...CORE_PATHS, ...STATIC_ASSETS];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ALL_ASSETS.map(url =>
        fetch(url, { cache: 'reload' }).then(res => {
          if (res.ok) return c.put(url, res);
        }).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isCoreRequest(req) {
  if (req.mode === 'navigate') return true;
  const path = new URL(req.url).pathname;
  return CORE_PATHS.includes(path);
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (isCoreRequest(e.request)) {
    /* Network-first: always try to get the latest version; fall back to
       the cached copy (or cached index.html) only when offline.
       cache: 'no-store' forces a true bypass of the HTTP cache so a
       host's Cache-Control headers can't make this look like cache-first. */
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match('/index.html'))
      )
    );
    return;
  }

  /* Cache-first for static assets that rarely change. */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
