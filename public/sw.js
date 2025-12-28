const ALLOWED_PROTOCOLS = ['http:', 'https:']

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return
  }
})
