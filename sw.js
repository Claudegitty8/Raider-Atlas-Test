/* Raider-Atlas: Offline-Start für die Version mit Webadresse (GitHub Pages).
   - Die Seite selbst: zuerst Netz (damit Updates sofort ankommen), nach 4 s oder ohne Netz die gespeicherte Kopie.
   - Schriften von Google: zuerst gespeicherte Kopie, sonst Netz.
   Beim Ändern der Dateiliste die Nummer in CACHE erhöhen. */
'use strict';
const CACHE = 'raider-atlas-v1';
const DATEIEN = ['./', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function merken(req, res){
  if (res && (res.ok || res.type === 'opaque')) {
    const kopie = res.clone();
    caches.open(CACHE).then(c => c.put(req, kopie)).catch(() => {});
  }
  return res;
}

function netzZuerst(req){
  return new Promise(fertig => {
    let erledigt = false;
    const ausCache = () => caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined));
    const uhr = setTimeout(() => { ausCache().then(r => { if (r && !erledigt) { erledigt = true; fertig(r); } }); }, 4000);
    fetch(req).then(res => {
      clearTimeout(uhr);
      merken(req, res);
      if (!erledigt) { erledigt = true; fertig(res); }
    }).catch(() => {
      clearTimeout(uhr);
      ausCache().then(r => { if (!erledigt) { erledigt = true; fertig(r || Response.error()); } });
    });
  });
}

function cacheZuerst(req){
  return caches.match(req).then(r => r || fetch(req).then(res => merken(req, res)));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) e.respondWith(netzZuerst(req));
  else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(cacheZuerst(req));
});
