const CACHE_NAME = 'histreets-shell-v1'
const APP_SHELL = ['/', '/manifest.json', '/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone()
      if (request.url.includes('/assets/') || request.url.endsWith('/manifest.json')) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {})
      }
      return response
    }).catch(() => caches.match('/')))
  )
})
