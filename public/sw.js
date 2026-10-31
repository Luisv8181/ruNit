// ruNit service worker: the app keeps working at courts with no signal.
// Pages: network first, fall back to the last copy. Static assets: cache first. OpenStreetMap: never cached here
// (the app keeps its own 24-hour court cache). Everything a player does is saved on the phone by the app itself.
const VERSION = "runit-v1";
const SHELL = ["/", "/courts", "/courts/globe", "/create", "/community", "/my-game", "/my-game/passport", "/opportunities", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html") || url.pathname.startsWith("/_next/data")) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))));
  }
});
