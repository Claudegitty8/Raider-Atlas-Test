/* Raider-Atlas: Offline-Start für die Version mit Webadresse (GitHub Pages).
   - Die Seite selbst: zuerst Netz (ohne Browser-Zwischenspeicher, damit Updates sofort ankommen),
     nach 4 s, ohne Netz oder bei einer Fehlerseite die gespeicherte Kopie.
   - Der Name des Speichers enthält eine Prüfsumme der Seite; das Bauwerkzeug setzt sie bei jeder Version neu.
   Etappe 6: Funde P3 (Browser-Zwischenspeicher), C20 (Fehlerseiten), S4 (toter Zweig), Cache-Nummer automatisch. */
'use strict';
const PRAEFIX = 'raider-atlas-neu:';
const CACHE = PRAEFIX + '9bdd210dd559';
const DATEIEN = ['./', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN.map(d => new Request(d, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

// Nur eigene alte Speicher löschen (andere Apps unter derselben Adresse bleiben unberührt)
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PRAEFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function merken(req, res){
  if (res && res.ok) { const kopie = res.clone(); caches.open(CACHE).then(c => c.put(req, kopie)).catch(() => {}); }
  return res;
}

function netzZuerst(req){
  return new Promise(fertig => {
    let erledigt = false;
    const ausCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined));
    const uhr = setTimeout(() => { ausCache().then(r => { if (r && !erledigt) { erledigt = true; fertig(r); } }); }, 4000);
    fetch(req, { cache: 'no-cache' }).then(res => {
      clearTimeout(uhr);
      if (res.ok) { merken(req, res); if (!erledigt) { erledigt = true; fertig(res); } return; }
      ausCache().then(r => { if (!erledigt) { erledigt = true; fertig(r || res); } });   // Fehlerseite nur, wenn keine Kopie da ist
    }).catch(() => {
      clearTimeout(uhr);
      ausCache().then(r => { if (!erledigt) { erledigt = true; fertig(r || Response.error()); } });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) e.respondWith(netzZuerst(req));   // fremde Adressen fasst der Service Worker nicht an
});
