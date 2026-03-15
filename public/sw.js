const CACHE_NAME = "toptalent-hub-v3";
const STATIC_CACHE = "toptalent-static-v3";
const DYNAMIC_CACHE = "toptalent-dynamic-v3";

const STATIC_ASSETS = [
  "/medewerker/dashboard/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-icon.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("[SW] Install failed:", error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith("/api/")) {
    return event.respondWith(fetch(request));
  }

  // Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache error responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone and cache successful responses
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[SW] Serving from cache:", request.url);
            return cachedResponse;
          }

          // If it's a navigation request, return cached dashboard
          if (request.mode === "navigate") {
            return caches.match("/medewerker/dashboard/");
          }

          return new Response("Offline - content niet beschikbaar", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain",
            }),
          });
        });
      })
  );
});
