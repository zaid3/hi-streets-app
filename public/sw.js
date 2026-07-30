const CACHE_NAME = 'histreets-shell-v3'
const APP_SHELL = ['/manifest.json', '/icon.svg']

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
    fetch(request).then(response => {
      const copy = response.clone()
      if (request.url.includes('/assets/') || request.url.endsWith('/manifest.json') || request.url.endsWith('/icon.svg')) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {})
      }
      return response
    }).catch(async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      if (request.mode === 'navigate') {
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiStreets offline</title></head><body><main style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:24px"><h1>HiStreets is offline</h1><p>Reconnect to the internet and refresh to load the latest Newham map, offers and jobs.</p></main></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }

      return new Response('', { status: 503 })
    }),
  )
})
