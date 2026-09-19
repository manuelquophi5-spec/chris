/* UG Attend PWA — minimal service worker for installability + light caching */
const CACHE = "ella-static-v5";
const OFFLINE_URL = "/offline.html";
// Only static, redirect-free files. "/" and "/dashboard" redirect (to /login or
// the role dashboard); browsers refuse to serve a cached *redirected* response
// to a navigation, so precaching them broke offline page loads.
const PRECACHE = [
  OFFLINE_URL,
  "/ug-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation =
    request.mode === "navigate" || request.destination === "document";

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.pathname.startsWith("/icons/")) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        if (!isNavigation) {
          // Non-document assets (JS/CSS/images): let the failure surface
          // normally instead of masking it with an unrelated cached page.
          return caches.match(request);
        }
        // Document navigation while offline: show the page they were on if
        // it happens to be cached, otherwise a real "you're offline" state —
        // never silently swap in the login page, which reads as a logout.
        return caches
          .match(request)
          .then((cached) => cached || caches.match(OFFLINE_URL));
      }),
  );
});
