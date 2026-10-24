/**
 * Namma Karnataka Service Worker (PWA Offline Cache Engine)
 * Version: v1.0.0
 * Provides robust offline browsing of the curated destination catalogue
 * and cached trip itineraries without leaking sensitive user data.
 */

const STATIC_CACHE_NAME = 'namma-karnataka-static-v1';
const API_CACHE_NAME = 'namma-karnataka-api-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/images/icon-192.svg',
  '/images/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Explicit security rule: never intercept or cache requests bearing Authorization headers
  if (request.headers.has('Authorization')) {
    return;
  }

  // 1. API Calls Strategy (Network-first with Cache Fallback for public destinations and transit)
  if (url.pathname.startsWith('/api/v1/destinations') || url.pathname.startsWith('/api/v1/transit')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // For destination catalogue list endpoint, return empty list envelope
            if (url.pathname === '/api/v1/destinations') {
              return new Response(
                JSON.stringify({
                  items: [],
                  total: 0,
                  limit: 10,
                  offset: 0,
                  has_more: false,
                  offline_fallback: true
                }),
                {
                  headers: { 'Content-Type': 'application/json', 'X-Offline-Fallback': 'true' }
                }
              );
            }
            // For detail or comparison endpoints that have no cache match, return 503 Service Unavailable
            return new Response(
              JSON.stringify({
                detail: 'Resource not available in offline cache',
                offline_fallback: true
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json', 'X-Offline-Fallback': 'true' }
              }
            );
          });
        })
    );
    return;
  }

  // 2. Static Asset Strategy (Cache-first with Network Fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Cache newly loaded static scripts, styles, and assets
        if (
          url.pathname.startsWith('/assets/') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.png')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to offline index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
