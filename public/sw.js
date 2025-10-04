/**
 * Service Worker for BookMarked PDF caching
 * Implements intelligent caching strategy for PDF documents
 */

const CACHE_NAME = 'bookmarked-pdfs-v1';
const PDF_CACHE = 'pdfs-v1';
const STATIC_CACHE = 'static-v1';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit

// Cache strategies (for future use)
// const CACHE_STRATEGIES = {
//   PDF: 'cache-first',
//   STATIC: 'stale-while-revalidate',
//   API: 'network-first'
// };

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // Cache only static resources that actually exist
      const resourcesToCache = [
        // Only cache static assets, not Next.js routes
        '/favicon.ico'
      ];
      
      return Promise.allSettled(
        resourcesToCache.map(url => 
          cache.add(url).catch(error => {
            console.warn(`Failed to cache ${url}:`, error);
            return null; // Continue with other resources
          })
        )
      );
    }).then(() => {
      console.log('Service Worker installed');
      return self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker installation failed:', error);
      // Still skip waiting to activate the service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== PDF_CACHE && 
              cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Handle PDF requests
  if (url.pathname.includes('/api/pdf-proxy') || 
      request.headers.get('accept')?.includes('application/pdf')) {
    event.respondWith(handlePDFRequest(request));
    return;
  }
  
  // Handle static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Default: network first
  event.respondWith(fetch(request));
});

/**
 * Handle PDF requests with network-first strategy to avoid corruption
 */
async function handlePDFRequest(request) {
  // Don't cache HEAD requests - they're just for checking if file exists
  if (request.method === 'HEAD') {
    return fetch(request);
  }
  
  // For PDFs, use network-first to avoid serving corrupted cached data
  try {
    console.log('PDF network request:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache successful responses that are not range requests
      const isRangeRequest = request.headers.get('range');
      
      if (!isRangeRequest && request.method === 'GET') {
        const cache = await caches.open(PDF_CACHE);
        
        // Clone the response for caching
        const responseToCache = networkResponse.clone();
        
        // Add cache timestamp and validation headers
        const headers = new Headers(responseToCache.headers);
        headers.set('sw-cache-date', new Date().toISOString());
        headers.set('sw-cache-version', 'v2'); // Version to invalidate old caches
        
        const cachedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        });
        
        // Cache the response
        await cache.put(request, cachedResponse);
        
        // Clean up cache if it's getting too large
        await cleanupCache(cache);
      }
      
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.error('PDF network fetch failed:', error);
    
    // Only fall back to cache if it's a recent, valid cache entry
    const cache = await caches.open(PDF_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      const cacheVersion = cachedResponse.headers.get('sw-cache-version');
      
      // Only use cache if it's recent (30 minutes) and version 2
      if (cacheDate && cacheVersion === 'v2') {
        const cacheTime = new Date(cacheDate).getTime();
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        if (now - cacheTime < maxAge) {
          console.log('Returning recent PDF cache');
          return cachedResponse;
        }
      }
    }
    
    throw error;
  }
}

/**
 * Handle static asset requests with stale-while-revalidate
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network for updates
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Network failed, return cached if available
    return cachedResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return networkPromise;
}

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      // Cache successful GET API responses for a short time
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Clean up cache when it gets too large
 */
async function cleanupCache(cache) {
  try {
    const requests = await cache.keys();
    if (requests.length === 0) return;
    
    // Calculate total cache size (rough estimate)
    let totalSize = 0;
    const requestSizes = [];
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : 1024 * 1024; // Default 1MB
        totalSize += size;
        requestSizes.push({ request, size });
      }
    }
    
    // If cache is too large, remove oldest entries
    if (totalSize > MAX_CACHE_SIZE) {
      console.log(`Cache size: ${totalSize} bytes, cleaning up...`);
      
      // Sort by size (remove largest first)
      requestSizes.sort((a, b) => b.size - a.size);
      
      // Remove entries until we're under the limit
      let removedSize = 0;
      for (const { request } of requestSizes) {
        await cache.delete(request);
        removedSize += requestSizes.find(r => r.request === request)?.size || 0;
        
        if (totalSize - removedSize < MAX_CACHE_SIZE * 0.8) {
          break; // Stop when we're at 80% of max size
        }
      }
      
      console.log(`Removed ${removedSize} bytes from cache`);
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

/**
 * Handle background sync for prefetching
 */
self.addEventListener('sync', event => {
  if (event.tag === 'prefetch-pdf') {
    event.waitUntil(prefetchPDF());
  }
});

/**
 * Prefetch PDF content in background
 */
async function prefetchPDF() {
  try {
    // Get the current reading progress from IndexedDB
    const progress = await getReadingProgress();
    if (!progress) return;
    
    const { currentPage } = progress;
    
    // Prefetch next few pages
    for (let i = 1; i <= 3; i++) {
      const pageUrl = `/api/pdf-proxy?url=${encodeURIComponent(progress.fileUrl)}&page=${currentPage + i}`;
      const request = new Request(pageUrl);
      
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(PDF_CACHE);
          await cache.put(request, response);
          console.log(`Prefetched page ${currentPage + i}`);
        }
      } catch (error) {
        console.error(`Failed to prefetch page ${currentPage + i}:`, error);
      }
    }
  } catch (error) {
    console.error('Background prefetch failed:', error);
  }
}

/**
 * Get reading progress from IndexedDB
 */
async function getReadingProgress() {
  try {
    // This would need to be implemented with IndexedDB
    // For now, return null
    return null;
  } catch (error) {
    console.error('Failed to get reading progress:', error);
    return null;
  }
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_PDF':
      cachePDF(data.url, data.blob);
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Cache PDF blob
 */
async function cachePDF(url, blob) {
  try {
    const cache = await caches.open(PDF_CACHE);
    const response = new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'sw-cache-date': new Date().toISOString()
      }
    });
    
    await cache.put(url, response);
    console.log('PDF cached:', url);
  } catch (error) {
    console.error('Failed to cache PDF:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}
