// Service Worker for Money Maker Platform
// Provides advanced caching, CDN integration, and offline support

const CACHE_NAME = 'money-maker-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';
const IMAGE_CACHE = 'images-v1.0.0';
const API_CACHE = 'api-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// CDN and external resources
const CDN_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com'
];

// API endpoints to cache with different strategies
const API_CACHE_STRATEGIES = {
  '/api/auth/me': { strategy: 'staleWhileRevalidate', maxAge: 300 }, // 5 minutes
  '/api/users/profile': { strategy: 'staleWhileRevalidate', maxAge: 600 }, // 10 minutes
  '/api/analytics': { strategy: 'networkFirst', maxAge: 60 }, // 1 minute
  '/api/content': { strategy: 'cacheFirst', maxAge: 3600 }, // 1 hour
  '/api/marketplace': { strategy: 'staleWhileRevalidate', maxAge: 1800 } // 30 minutes
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isCDNRequest(request)) {
    event.respondWith(handleCDNRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with different caching strategies
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  // Find matching cache strategy
  const strategy = Object.keys(API_CACHE_STRATEGIES).find(pattern => 
    endpoint.startsWith(pattern)
  );
  
  const config = strategy ? API_CACHE_STRATEGIES[strategy] : 
    { strategy: 'networkFirst', maxAge: 60 };
  
  switch (config.strategy) {
    case 'cacheFirst':
      return cacheFirst(request, API_CACHE, config.maxAge);
    case 'networkFirst':
      return networkFirst(request, API_CACHE, config.maxAge);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, API_CACHE, config.maxAge);
    default:
      return fetch(request);
  }
}

// Handle image requests with optimized caching
async function handleImageRequest(request) {
  return cacheFirst(request, IMAGE_CACHE, 86400); // 24 hours
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  return cacheFirst(request, STATIC_CACHE, 31536000); // 1 year
}

// Handle CDN requests
async function handleCDNRequest(request) {
  return staleWhileRevalidate(request, STATIC_CACHE, 86400); // 24 hours
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  return networkFirst(request, DYNAMIC_CACHE, 3600); // 1 hour
}

// Cache-first strategy
async function cacheFirst(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    const cache = await caches.open(cacheName);
    return cache.match(request) || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Network-first strategy failed:', error);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, maxAge * 10)) { // Extended fallback
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached response if available and not too old
  if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return fetchPromise || cachedResponse || new Response('Offline', { status: 503 });
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - responseTime) > (maxAge * 1000);
}

// Check if request is for an image
function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(url.pathname);
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
         url.pathname.startsWith('/static/');
}

// Check if request is to a CDN
function isCDNRequest(request) {
  const url = new URL(request.url);
  return CDN_ORIGINS.some(origin => url.origin === origin);
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  console.log('Service Worker: Background sync triggered');
  
  // Retry failed API requests
  const cache = await caches.open('failed-requests');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
        console.log('Service Worker: Retried request successfully:', request.url);
      }
    } catch (error) {
      console.log('Service Worker: Retry failed for:', request.url);
    }
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      }));
      break;
  }
});

// Cache specific URLs
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return Promise.all(
    urls.map(url => 
      fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      }).catch(console.error)
    )
  );
}

// Clear specific cache
async function clearCache(cacheName) {
  return caches.delete(cacheName);
}

// Get total cache size
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

console.log('Service Worker: Loaded and ready');