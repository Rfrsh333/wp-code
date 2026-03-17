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
  self.skipWaiting();
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
          // Offline fallback: geef gecachede versie
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Ultieme fallback: geef de cached homepage
            return caches.match("/klant/");
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
