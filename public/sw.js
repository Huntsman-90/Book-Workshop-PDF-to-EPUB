/**
 * Service Worker for «Книжная мастерская: PDF в EPUB 3»
 * Version: 1.0.0
 * 
 * Provides app shell caching, standalone PWA installability,
 * and reliable offline navigation fallback without caching large OCR models
 * or user documents.
 */

const CACHE_NAME = 'book-workshop-shell-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

// Install: precache app shell and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: cleanup old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('book-workshop-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for navigation, cache-first/stale-while-revalidate for assets
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests with http/https schemes
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Do NOT cache large OCR traineddata models or heavy CDN binaries
  if (url.pathname.endsWith('.traineddata') || url.pathname.endsWith('.traineddata.gz')) {
    return;
  }

  // Handle navigation requests (HTML): Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If valid response, update cache
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then(fallback => {
            return fallback || caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images)
  const isStaticAsset =
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Fetch updated version in background (stale-while-revalidate)
          fetch(request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
              }
            })
            .catch(() => {
              // Ignore background fetch failure when offline
            });
          return cachedResponse;
        }

        return fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});
