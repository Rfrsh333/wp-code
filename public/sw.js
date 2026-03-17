const CACHE_NAME = "toptalent-hub-v5";
const STATIC_CACHE = "toptalent-static-v5";
const DYNAMIC_CACHE = "toptalent-dynamic-v5";
const API_CACHE = "toptalent-api-v1";

const STATIC_ASSETS = [
  "/medewerker/dashboard/",
  "/medewerker/diensten/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-icon.png",
];

// API routes die gecached mogen worden voor offline gebruik
const CACHEABLE_API_ROUTES = [
  "/api/medewerker/diensten/lijst",
  "/api/medewerker/dashboard",
  "/api/medewerker/profiel",
  "/api/medewerker/financieel",
  "/api/medewerker/beschikbaarheid",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v5...");
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
  console.log("[SW] Activating service worker v5...");
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
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

// Luister naar logout berichten om user-specifieke caches te wissen
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "LOGOUT") {
    console.log("[SW] Logout ontvangen — API cache en dynamische cache wissen");
    event.waitUntil(
      Promise.all([
        caches.delete(API_CACHE),
        caches.delete(DYNAMIC_CACHE),
      ]).then(() => {
        console.log("[SW] User-specifieke caches gewist na logout");
      })
    );
  }
});

// Helper: check of een API route gecached mag worden
function isCacheableApi(pathname) {
  return CACHEABLE_API_ROUTES.some((route) => pathname.startsWith(route));
}

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip external resources
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal requests
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/monitoring") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  // Cacheable API routes: network first, cache fallback met offline header
  if (url.pathname.startsWith("/api/") && isCacheableApi(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            // Sla op in API cache met de volledige URL (inclusief query params)
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: geef gecachede versie terug met offline header
          return caches.match(request).then((cached) => {
            if (cached) {
              // Clone de response en voeg een header toe zodat de client weet dat het cached data is
              const headers = new Headers(cached.headers);
              headers.set("X-From-Cache", "true");
              headers.set("X-Cached-At", cached.headers.get("date") || "unknown");
              return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers,
              });
            }
            // Geen cache beschikbaar
            return new Response(
              JSON.stringify({ error: "Offline", offline: true }),
              {
                status: 503,
                headers: { "Content-Type": "application/json", "X-From-Cache": "offline" },
              }
            );
          });
        })
    );
    return;
  }

  // Overige API requests: altijd network (niet cachen)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Statische Next.js assets: cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        });
      })
    );
    return;
  }

  // Pagina's en overige: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        }).catch(() => {});
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // Navigation fallback
          if (request.mode === "navigate") {
            return caches.match("/medewerker/dashboard/").then((dashboardCache) => {
              if (dashboardCache) return dashboardCache;
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TopTalent - Offline</title><style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f2f2f7;color:#1d1d1f;text-align:center;padding:20px}.offline-card{background:#fff;border-radius:16px;padding:40px;max-width:360px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 8px}p{color:#86868b;font-size:14px;margin:0 0 20px}button{background:#F27501;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer}</style></head><body><div class="offline-card"><h1>Je bent offline</h1><p>Controleer je internetverbinding en probeer het opnieuw.</p><button onclick="location.reload()">Opnieuw proberen</button></div></body></html>',
                {
                  status: 503,
                  headers: { "Content-Type": "text/html" },
                }
              );
            });
          }

          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        });
      })
  );
});
