'use strict';

const CACHE_NAME = 'crono-operador-v3.0.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './operator-whatsapp-share-fix.js',
  './operator-pwa-update.js'
];

function injectScripts(html){
  const scripts = '\n<script src="operator-whatsapp-share-fix.js" defer></script>\n<script src="operator-pwa-update.js" defer></script>\n';
  if(html.includes('operator-whatsapp-share-fix.js')) return html;
  if(html.includes('</body>')) return html.replace('</body>', scripts + '</body>');
  return html + scripts;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => response.text())
        .then(html => new Response(injectScripts(html), {
          headers: {'Content-Type':'text/html; charset=UTF-8'}
        }))
        .catch(() => caches.match('./index.html').then(cached => cached ? cached.text() : '')
          .then(html => new Response(injectScripts(html), {
            headers: {'Content-Type':'text/html; charset=UTF-8'}
          })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
