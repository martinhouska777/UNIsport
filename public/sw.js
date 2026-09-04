// Minimal PWA service worker: it makes the app installable and it delivers Web
// Push. What it deliberately does NOT do is cache pages.
//
// It used to cache every GET, pages included, and serve them back whenever the
// network hiccupped. That sounds like offline support and is actually a trap: a
// page saved from an OLDER BUILD points at /_next/static chunk files that the
// new build does not have, so the app loads a shell whose JavaScript is gone —
// a black screen that never finishes loading, and one that survives a reload
// because the same bad page comes straight back out of the cache. A phone kept
// on a home screen hits this after any deploy.
//
// So the cache now holds only Next's HASHED build assets and the icons. A
// hashed file is safe to keep forever (change the file, change the name), and
// nothing else is worth a blank app. Pages always come from the network.
const CACHE = "unisport-v2";

/* Same-origin, and only the two kinds of file that are safe to keep. */
function cacheable(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Throw away everything the old worker kept, including the pages that
      // caused the black screen. This is what heals a phone that is already
      // stuck: the new worker takes over and the bad copies go.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Everything else — pages, API calls, the auth callback — is left entirely
  // alone, which means it behaves exactly as it would with no worker at all.
  if (!cacheable(url)) return;

  event.respondWith(
    (async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })(),
  );
});

// ---- Web Push -------------------------------------------------------------
// The server delivers a JSON payload { title, body, url, icon }. We show it as
// an OS notification; tapping it focuses an open app window or opens `url`.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data && event.data.text ? event.data.text() : "" };
  }

  const title = payload.title || "UNIsport";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an already-open tab if we have one; otherwise open a new one.
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
