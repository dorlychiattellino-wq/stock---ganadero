/* Service Worker de Stock Ganadero
   Guarda la app y los scripts de Firebase en el dispositivo para que
   se pueda ABRIR sin señal. Los datos en tiempo real de Firebase
   (firebaseio.com) pasan directo, sin cachear. */
const CACHE = "stock-ganadero-v1";

self.addEventListener("install", e => { self.skipWaiting(); });

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  let u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  const propio = u.origin === self.location.origin;          // la app (GitHub Pages)
  const sdk = u.hostname === "www.gstatic.com";              // scripts de Firebase
  if (!propio && !sdk) return;                               // firebaseio y demas: directo, sin tocar

  // Estrategia: responder con lo guardado si existe (abre sin señal),
  // y en paralelo actualizar la copia guardada cuando hay internet.
  e.respondWith(
    caches.match(e.request).then(guardado => {
      const red = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return res;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
