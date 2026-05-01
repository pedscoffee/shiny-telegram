const CACHE_PREFIX = "clinical-smart-phrase";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(CACHE_PREFIX))
              .map((key) => caches.delete(key))
          )
        ),
      self.registration.unregister()
    ])
  );
  event.waitUntil(self.clients.claim());
});
