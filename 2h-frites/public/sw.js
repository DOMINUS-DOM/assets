const CACHE_NAME = '2h-frites-v3';
const API_CACHE = '2h-api-v1';
const OFFLINE_QUEUE_KEY = '2h-offline-queue';

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
];

// API routes to cache (stale-while-revalidate)
const CACHEABLE_API = [
  '/api/menu',
  '/api/settings',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // POST to /api/orders — queue offline if network fails
  if (url.pathname === '/api/orders' && event.request.method === 'POST') {
    event.respondWith(handleOrderPost(event.request));
    return;
  }

  // Cacheable API routes: stale-while-revalidate
  if (CACHEABLE_API.some((path) => url.pathname === path) && event.request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Other API routes: network-first with timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(event.request, 5000));
    return;
  }

  // Static/pages: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/') || new Response('Offline', { status: 503 });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ─── Strategies ───

// Stale-while-revalidate: serve from cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await networkPromise) || new Response('{}', {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Network-first with timeout: try network, fall back to cache
async function networkFirstWithTimeout(request, timeout) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.open(API_CACHE).then((c) => c.match(request));
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle order POST: try network, queue if offline
async function handleOrderPost(request) {
  try {
    const response = await fetch(request.clone());
    // If online and success, also try to flush any queued orders
    if (response.ok) {
      flushOfflineQueue();
    }
    return response;
  } catch {
    // Offline: queue the order for later
    const body = await request.json();
    await queueOfflineOrder(body);
    return new Response(JSON.stringify({
      orderNumber: `OFFLINE-${Date.now()}`,
      offline: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Queue an order in IndexedDB/localStorage
async function queueOfflineOrder(orderData) {
  try {
    // Use a simple approach with the Cache API to store pending orders
    const cache = await caches.open('2h-offline-orders');
    const key = `order-${Date.now()}`;
    await cache.put(
      new Request(`/offline/${key}`),
      new Response(JSON.stringify(orderData), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (e) {
    console.error('[SW] Failed to queue offline order:', e);
  }
}

// Flush queued orders when back online
async function flushOfflineQueue() {
  try {
    const cache = await caches.open('2h-offline-orders');
    const keys = await cache.keys();

    for (const request of keys) {
      try {
        const response = await cache.match(request);
        if (!response) continue;
        const orderData = await response.json();

        const result = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        if (result.ok) {
          await cache.delete(request);
          // Notify clients
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({ type: 'OFFLINE_ORDER_SYNCED', url: request.url });
          });
        }
      } catch {
        // Still offline for this order, keep it queued
      }
    }
  } catch (e) {
    console.error('[SW] Failed to flush offline queue:', e);
  }
}

// Listen for online event to flush queue
self.addEventListener('message', (event) => {
  if (event.data === 'FLUSH_OFFLINE_QUEUE') {
    flushOfflineQueue();
  }
});
