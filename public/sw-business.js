// TopTalent Business — Service Worker
// Versie: 1.0.0 | Scope: /klant/

const CACHE_NAME = "toptalent-business-v1";
const STATIC_ASSETS = [
  "/klant/",
  "/manifest-klant.json",
  "/icons/icon-klant-192.png",
  "/icons/icon-klant-512.png",
];

// Install: cache statische assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: verwijder oude caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k.startsWith("toptalent-business-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategie:
// - /api/ routes: Network only (altijd vers data)
// - Supabase: Network only
// - Statische assets: Cache first, dan network
// - Pagina's: Network first, dan cache als fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API calls en Supabase — altijd vers
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("sentry.io")
  ) {
    return;
  }

  // Statische Next.js assets — Cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Klant portaal pagina's — Network first, cache fallback
  if (url.pathname.startsWith("/klant")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache succesvolle responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Offline fallback: custom offline page
            if (request.mode === "navigate") {
              return caches.match("/klant/").then((homepage) => {
                if (homepage) return homepage;
                return new Response(
                  '<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1e3a5f"><title>TopTalent Business - Offline</title><style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f4f8;color:#1e3a5f;text-align:center;padding:20px}.offline-card{background:#fff;border-radius:16px;padding:40px;max-width:360px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 8px}p{color:#64748b;font-size:14px;margin:0 0 20px}button{background:#1e3a5f;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer}</style></head><body><div class="offline-card"><h1>Je bent offline</h1><p>Controleer je internetverbinding en probeer het opnieuw.</p><button onclick="location.reload()">Opnieuw proberen</button></div></body></html>',
                  { status: 503, headers: { "Content-Type": "text/html" } }
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
    return;
  }

  // Iconen en andere statische bestanden — Cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});

// Luister naar berichten van client
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "LOGOUT") {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});

// Push notificaties (optioneel — voor toekomstige gebruik)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body ?? "",
    icon: "/icons/icon-klant-192.png",
    badge: "/icons/icon-klant-192.png",
    tag: data.tag ?? "business-notif",
    data: { url: data.url ?? "/klant/" },
    actions: data.actions ?? [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "TopTalent Business", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/klant/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes("/klant"));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
