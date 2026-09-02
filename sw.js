const CACHE_NAME = "jeb-v1.1.0";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./proto.css",
  "./manifest.json",
  "./asset/Manrope.ttf",
  "./asset/icons/favicon.ico",
  "./asset/icons/192x192.png",
  "./asset/icons/512x512.png",
  "./js/main.js",
  "./js/ui.js",
  "./js/core/store.js",
  "./js/core/database.js",
  "./js/core/bootstrap.js",
  "./js/core/finance-service.js",
  "./js/core/session-service.js",
  "./js/core/entity-service.js",
  "./js/core/transaction-service.js",
  "./js/core/loan-service.js",
  "./js/core/onboarding-service.js",
  "./js/core/backup-service.js",
  "./js/core/query-service.js",
  "./js/core/calculator.js",
  "./js/core/events.js",
  "./js/core/locale.js",
  "./js/ui/formatters.js",
  "./js/helpers/dixie.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isHtml =
    event.request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html");

  if (isHtml) {
    // Network-First strategy for HTML to ensure immediate code updates
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("./index.html")),
        ),
    );
  } else {
    // Cache-First strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      }),
    );
  }
});
