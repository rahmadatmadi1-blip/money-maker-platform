import { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';

export const usePWAFeatures = () => {
  const pwa = usePWA();
  const [cacheSize, setCacheSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get cache size on mount
  useEffect(() => {
    const fetchCacheSize = async () => {
      try {
        const size = await pwa.getCacheSize();
        setCacheSize(size);
      } catch (error) {
        console.error('Failed to get cache size:', error);
      }
    };

    fetchCacheSize();
  }, [pwa]);

  // Format cache size for display
  const formatCacheSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear all caches
  const clearAllCaches = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        pwa.clearCache('static-v1.0.0'),
        pwa.clearCache('dynamic-v1.0.0'),
        pwa.clearCache('images-v1.0.0'),
        pwa.clearCache('api-v1.0.0')
      ]);
      
      // Refresh cache size
      const newSize = await pwa.getCacheSize();
      setCacheSize(newSize);
      
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Preload important pages
  const preloadPages = () => {
    const importantUrls = [
      '/dashboard',
      '/profile',
      '/analytics',
      '/payments'
    ];
    
    pwa.preloadUrls(importantUrls);
  };

  // Send notification with default options
  const sendNotification = (title, message, options = {}) => {
    const defaultOptions = {
      body: message,
      icon: '/icon-192x192.svg',
      badge: '/badge-72x72.svg',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      ...options
    };

    return pwa.sendNotification(title, defaultOptions);
  };

  // Check if PWA features are supported
  const isSupported = {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    pushManager: 'serviceWorker' in navigator && 'PushManager' in window,
    installPrompt: 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window
  };

  // Get PWA installation status
  const getInstallationStatus = () => {
    if (pwa.isInstalled) return 'installed';
    if (isSupported.installPrompt) return 'installable';
    return 'not-supported';
  };

  return {
    ...pwa,
    cacheSize: formatCacheSize(cacheSize),
    rawCacheSize: cacheSize,
    isLoading,
    clearAllCaches,
    preloadPages,
    sendNotification,
    isSupported,
    installationStatus: getInstallationStatus()
  };
};

export default usePWAFeatures;