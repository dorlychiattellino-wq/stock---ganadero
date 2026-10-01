/* Service Worker de Stock Ganadero
   Guarda la app y sus scripts en el dispositivo para que se pueda ABRIR sin señal.
   Los datos en tiempo real de Firebase (firebaseio.com) pasan directo, sin cachear. */
const CACHE = "stock-ganadero-v2";
const BASE = self.registration.scope; // carpeta de la app en GitHub Pages
// Lo que hace falta para arrancar: se guarda en la instalación, sin esperar a que se pida
const PRECACHE = [
  BASE + "StockGanadero.html",
  BASE + "manifest.json",
  BASE + "icon-192.png",
  BASE + "icon-180.png",
  BASE + "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(
      PRECACHE.map(u => fetch(u, {cache: "no-store"}).then(r => { if (r && r.ok) return c.put(u, r); }).catch(() => {}))
    )).then(() => self.skipWaiting())
  );
});

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
  const propio = u.origin === self.location.origin;
  const sdk = u.hostname === "www.gstatic.com" || u.hostname === "cdnjs.cloudflare.com";
  if (!propio && !sdk) return; // firebaseio, dolarapi y demás: directo, sin tocar

  // Responder con lo guardado si existe (abre sin señal) y actualizar la copia en paralelo.
  // La URL se guarda sin ?parámetros ni #, así la página se encuentra aunque cambie el enlace.
  const clave = new Request(u.origin + u.pathname, {method: "GET"});
  e.respondWith(
    caches.match(clave).then(guardado => {
      const red = fetch(e.request).then(res => {
        if (res && res.status === 200) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(clave, copia)); }
        return res;
      }).catch(() => guardado);
      // la página principal: primero la red si hay señal (para traer versiones nuevas), si no la copia
      if (propio && /\.html$/.test(u.pathname)) return red.then(r => r || guardado);
      return guardado || red;
    })
  );
});
