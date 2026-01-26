
const CACHE_NAME = 'tap-football-v2026-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './types.ts',
  './services/geminiService.ts',
  './services/audioService.ts',
  './data/localQuestions.ts',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3',
  'https://esm.sh/framer-motion@^11.11.11',
  'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=2000',
  'https://cdn-icons-png.flaticon.com/512/53/53283.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching all assets for Play Store compliance');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset immediately for speed
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
