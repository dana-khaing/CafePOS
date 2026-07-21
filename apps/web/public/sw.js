const CACHE_NAME = 'cafepos-shell-v2'
const APP_SHELL = ['/offline', '/manifest.webmanifest', '/icon.svg']

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const response = await fetch('/', { cache: 'no-store' })
  if (!response.ok)
    throw new Error(`Unable to cache application shell: ${response.status}`)

  const documentText = await response.clone().text()
  const assetUrls = [...documentText.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter(
      (url) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith('/_next/static/'),
    )
    .map((url) => url.href)

  await cache.put('/', response)
  await cache.addAll([...new Set(assetUrls)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApplicationShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(async () => {
          return (
            (await caches.match(event.request)) ??
            (await caches.match('/')) ??
            caches.match('/offline')
          )
        }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (
          response.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const copy = response.clone()
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
        }
        return response
      })
    }),
  )
})
