// Service Worker - Basit cache stratejisi
const CACHE_NAME = 'personel-ys-v1'
const urlsToCache = [
  '/',
  '/mobile',
  '/mobile/leaves',
  '/mobile/attendance',
  '/mobile/profile'
]

// Install event - Cache oluştur
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı')
        return cache.addAll(urlsToCache)
      })
  )
})

// Activate event - Eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // API istekleri için her zaman network kullan
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Response'u clone et ve cache'e ekle
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
      .catch(() => {
        // Network hatası durumunda cache'den döndür
        return caches.match(event.request)
      })
  )
})


