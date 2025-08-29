import { useState, useEffect, useCallback, useRef } from 'react';

// CDN and Service Worker management hook
export const useCDN = () => {
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cdnEnabled, setCdnEnabled] = useState(
    process.env.REACT_APP_CDN_ENABLED === 'true'
  );
  const serviceWorkerRef = useRef(null);

  // Initialize service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      serviceWorkerRef.current = registration;
      
      console.log('Service Worker registered:', registration);
      setIsServiceWorkerReady(true);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              if (window.confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      // Get initial cache size
      getCacheSize();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  // Get cache size
  const getCacheSize = useCallback(async () => {
    if (!serviceWorkerRef.current) return;

    try {
      const messageChannel = new MessageChannel();
      
      const promise = new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            resolve(event.data.size);
          }
        };
      });

      serviceWorkerRef.current.active?.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );

      const size = await promise;
      setCacheSize(size);
      return size;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async (cacheName = null) => {
    if (!serviceWorkerRef.current) return false;

    try {
      if (cacheName) {
        serviceWorkerRef.current.active?.postMessage({
          type: 'CLEAR_CACHE',
          payload: { cacheName }
        });
      } else {
        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      await getCacheSize();
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }, [getCacheSize]);

  // Preload URLs
  const preloadUrls = useCallback(async (urls) => {
    if (!serviceWorkerRef.current || !Array.isArray(urls)) return false;

    try {
      serviceWorkerRef.current.active?.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
      return true;
    } catch (error) {
      console.error('Failed to preload URLs:', error);
      return false;
    }
  }, []);

  // Generate optimized image URL
  const getOptimizedImageUrl = useCallback((src, options = {}) => {
    if (!cdnEnabled || !src) return src;

    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      fit = 'cover'
    } = options;

    // Use Vercel Image Optimization
    if (process.env.REACT_APP_VERCEL_URL) {
      const params = new URLSearchParams();
      if (width) params.set('w', width);
      if (height) params.set('h', height);
      params.set('q', quality);
      if (format !== 'auto') params.set('f', format);
      params.set('fit', fit);

      return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
    }

    // Fallback to original URL
    return src;
  }, [cdnEnabled]);

  // Generate responsive image srcSet
  const generateSrcSet = useCallback((src, sizes = [480, 768, 1024, 1280, 1920]) => {
    if (!cdnEnabled || !src) return '';

    return sizes
      .map(size => `${getOptimizedImageUrl(src, { width: size })} ${size}w`)
      .join(', ');
  }, [cdnEnabled, getOptimizedImageUrl]);

  // Get CDN URL for static assets
  const getCDNUrl = useCallback((path) => {
    if (!cdnEnabled) return path;

    const cdnDomain = process.env.REACT_APP_CDN_DOMAIN;
    if (cdnDomain && path.startsWith('/')) {
      return `${cdnDomain}${path}`;
    }

    return path;
  }, [cdnEnabled]);

  // Warm up CDN cache
  const warmupCache = useCallback(async (urls = []) => {
    if (!cdnEnabled || !urls.length) return;

    const warmupUrls = [
      '/',
      '/static/css/main.css',
      '/static/js/bundle.js',
      '/manifest.json',
      ...urls
    ];

    try {
      await Promise.all(
        warmupUrls.map(url => 
          fetch(getCDNUrl(url), { method: 'HEAD' })
            .catch(error => console.warn(`Failed to warm up ${url}:`, error))
        )
      );
      console.log('CDN cache warmed up successfully');
    } catch (error) {
      console.error('CDN warmup failed:', error);
    }
  }, [cdnEnabled, getCDNUrl]);

  // Format cache size for display
  const formatCacheSize = useCallback((bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  return {
    // State
    isServiceWorkerReady,
    cacheSize,
    isOnline,
    cdnEnabled,
    
    // Actions
    getCacheSize,
    clearCache,
    preloadUrls,
    warmupCache,
    
    // URL generators
    getOptimizedImageUrl,
    generateSrcSet,
    getCDNUrl,
    
    // Utilities
    formatCacheSize: formatCacheSize(cacheSize),
    formatBytes: formatCacheSize
  };
};

// Hook for image optimization
export const useImageOptimization = () => {
  const { getOptimizedImageUrl, generateSrcSet, cdnEnabled } = useCDN();
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());

  // Track image loading state
  const handleImageLoad = useCallback((src) => {
    setLoadedImages(prev => new Set([...prev, src]));
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });
  }, []);

  const handleImageError = useCallback((src) => {
    setFailedImages(prev => new Set([...prev, src]));
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });
  }, []);

  // Get image props with optimization
  const getImageProps = useCallback((src, options = {}) => {
    const {
      alt = '',
      width,
      height,
      sizes = '100vw',
      priority = false,
      ...rest
    } = options;

    const optimizedSrc = getOptimizedImageUrl(src, { width, height });
    const srcSet = generateSrcSet(src);

    return {
      src: optimizedSrc,
      srcSet: srcSet || undefined,
      sizes: srcSet ? sizes : undefined,
      alt,
      loading: priority ? 'eager' : 'lazy',
      decoding: 'async',
      onLoad: () => handleImageLoad(src),
      onError: () => handleImageError(src),
      ...rest
    };
  }, [getOptimizedImageUrl, generateSrcSet, handleImageLoad, handleImageError]);

  return {
    getImageProps,
    isLoaded: (src) => loadedImages.has(src),
    hasFailed: (src) => failedImages.has(src),
    cdnEnabled
  };
};

// Hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    fcp: null, // First Contentful Paint
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    ttfb: null // Time to First Byte
  });

  useEffect(() => {
    // Observe performance metrics
    if ('PerformanceObserver' in window) {
      // First Contentful Paint & Largest Contentful Paint
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        setMetrics(prev => ({ ...prev, ttfb: navEntry.responseStart - navEntry.requestStart }));
      }

      return () => {
        paintObserver.disconnect();
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    const { fcp, lcp, fid, cls } = metrics;
    let score = 100;

    // Deduct points based on Core Web Vitals thresholds
    if (lcp > 4000) score -= 30; // Poor LCP
    else if (lcp > 2500) score -= 15; // Needs improvement

    if (fid > 300) score -= 25; // Poor FID
    else if (fid > 100) score -= 10; // Needs improvement

    if (cls > 0.25) score -= 25; // Poor CLS
    else if (cls > 0.1) score -= 10; // Needs improvement

    if (fcp > 3000) score -= 20; // Poor FCP
    else if (fcp > 1800) score -= 10; // Needs improvement

    return Math.max(0, score);
  }, [metrics]);

  return {
    metrics,
    performanceScore: getPerformanceScore(),
    isGoodPerformance: getPerformanceScore() >= 80
  };
};

export default useCDN;