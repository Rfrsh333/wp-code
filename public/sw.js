const CACHE_NAME = "toptalent-hub-v4";
const STATIC_CACHE = "toptalent-static-v4";
const DYNAMIC_CACHE = "toptalent-dynamic-v4";

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

// Push notificaties
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: data.tag ?? "medewerker-notif",
    data: { url: data.url ?? "/medewerker/dashboard/" },
    actions: data.actions ?? [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "TopTalent", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/medewerker/dashboard/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes("/medewerker"));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip external resources (Google Fonts, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    console.log("[SW] Skipping external resource:", url.origin);
    return;
  }

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Skip Next.js internal requests
  if (url.pathname.startsWith("/_next/webpack-hmr") ||
      url.pathname.startsWith("/monitoring") ||
      url.pathname.startsWith("/__nextjs")) {
    return;
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
        }).catch((error) => {
          console.error("[SW] Cache put failed:", error);
        });

        return response;
      })
      .catch((error) => {
        console.log("[SW] Fetch failed, trying cache:", request.url);

        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[SW] Serving from cache:", request.url);
            return cachedResponse;
          }

          // If it's a navigation request, return cached dashboard
          if (request.mode === "navigate") {
            return caches.match("/medewerker/dashboard/").then((dashboardCache) => {
              if (dashboardCache) {
                return dashboardCache;
              }

              // Fallback offline page
              return new Response("<!DOCTYPE html><html><body><h1>Offline</h1><p>Je bent offline en deze pagina is niet gecached.</p></body></html>", {
                status: 503,
                statusText: "Service Unavailable",
                headers: new Headers({
                  "Content-Type": "text/html",
                }),
              });
            });
          }

          // Return 503 for other failed requests
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "application/json",
            }),
          });
        });
      })
  );
});
