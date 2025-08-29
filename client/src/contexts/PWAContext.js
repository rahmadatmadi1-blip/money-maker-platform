import React, { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext();

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone === true) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const sendNotification = (title, options = {}) => {
    if (notificationPermission === 'granted' && registration) {
      registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        ...options
      });
    }
  };

  const updateApp = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const clearCache = async (cacheName) => {
    if ('serviceWorker' in navigator && registration) {
      registration.active.postMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName }
      });
    }
  };

  const getCacheSize = () => {
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator && registration) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            resolve(event.data.size);
          }
        };
        
        registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      } else {
        resolve(0);
      }
    });
  };

  const preloadUrls = (urls) => {
    if ('serviceWorker' in navigator && registration) {
      registration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
    }
  };

  const value = {
    isOnline,
    isInstalled,
    updateAvailable,
    notificationPermission,
    requestNotificationPermission,
    sendNotification,
    updateApp,
    clearCache,
    getCacheSize,
    preloadUrls
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAContext;