import React, { useState } from 'react';
import usePWAFeatures from '../../hooks/usePWAFeatures';
import './PWA.css';

const PWASettings = () => {
  const {
    isOnline,
    isInstalled,
    notificationPermission,
    requestNotificationPermission,
    cacheSize,
    clearAllCaches,
    preloadPages,
    isLoading,
    isSupported,
    installationStatus
  } = usePWAFeatures();

  const [notifications, setNotifications] = useState({
    earnings: localStorage.getItem('pwa-notifications-earnings') === 'true',
    updates: localStorage.getItem('pwa-notifications-updates') === 'true',
    marketing: localStorage.getItem('pwa-notifications-marketing') === 'true'
  });

  const handleNotificationToggle = (type) => {
    const newValue = !notifications[type];
    setNotifications(prev => ({ ...prev, [type]: newValue }));
    localStorage.setItem(`pwa-notifications-${type}`, newValue.toString());
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      // Send welcome notification
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Notifications Enabled!', {
            body: 'You\'ll now receive important updates from Money Maker Platform.',
            icon: '/icon-192x192.svg',
            badge: '/badge-72x72.svg'
          });
        });
      }
    }
  };

  const handleClearCache = async () => {
    const success = await clearAllCaches();
    if (success) {
      alert('Cache cleared successfully!');
    } else {
      alert('Failed to clear cache. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'granted': return '#27ae60';
      case 'denied': return '#e74c3c';
      case 'default': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getInstallStatusText = () => {
    switch (installationStatus) {
      case 'installed': return 'App is installed';
      case 'installable': return 'App can be installed';
      case 'not-supported': return 'Installation not supported';
      default: return 'Unknown status';
    }
  };

  return (
    <div className="pwa-settings">
      <div className="pwa-settings-header">
        <h3>Progressive Web App Settings</h3>
        <p>Manage your app experience and offline capabilities</p>
      </div>

      {/* Connection Status */}
      <div className="pwa-section">
        <h4>Connection Status</h4>
        <div className="status-item">
          <span className="status-label">Network:</span>
          <span className={`status-value ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Installation Status */}
      <div className="pwa-section">
        <h4>Installation</h4>
        <div className="status-item">
          <span className="status-label">Status:</span>
          <span className="status-value">
            {isInstalled ? '📱 Installed' : '🌐 Web Version'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Availability:</span>
          <span className="status-value">{getInstallStatusText()}</span>
        </div>
      </div>

      {/* Notifications */}
      <div className="pwa-section">
        <h4>Push Notifications</h4>
        <div className="status-item">
          <span className="status-label">Permission:</span>
          <span 
            className="status-value"
            style={{ color: getStatusColor(notificationPermission) }}
          >
            {notificationPermission.charAt(0).toUpperCase() + notificationPermission.slice(1)}
          </span>
        </div>
        
        {notificationPermission === 'default' && (
          <button 
            className="pwa-btn pwa-btn-primary"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </button>
        )}

        {notificationPermission === 'granted' && (
          <div className="notification-preferences">
            <h5>Notification Preferences</h5>
            
            <label className="notification-toggle">
              <input
                type="checkbox"
                checked={notifications.earnings}
                onChange={() => handleNotificationToggle('earnings')}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Earnings & Payment Updates</span>
            </label>

            <label className="notification-toggle">
              <input
                type="checkbox"
                checked={notifications.updates}
                onChange={() => handleNotificationToggle('updates')}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">App Updates & Features</span>
            </label>

            <label className="notification-toggle">
              <input
                type="checkbox"
                checked={notifications.marketing}
                onChange={() => handleNotificationToggle('marketing')}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Marketing & Promotions</span>
            </label>
          </div>
        )}
      </div>

      {/* Cache Management */}
      <div className="pwa-section">
        <h4>Cache Management</h4>
        <div className="status-item">
          <span className="status-label">Cache Size:</span>
          <span className="status-value">{cacheSize}</span>
        </div>
        
        <div className="cache-actions">
          <button 
            className="pwa-btn pwa-btn-secondary"
            onClick={preloadPages}
            disabled={!isOnline}
          >
            Preload Important Pages
          </button>
          
          <button 
            className="pwa-btn pwa-btn-danger"
            onClick={handleClearCache}
            disabled={isLoading}
          >
            {isLoading ? 'Clearing...' : 'Clear All Cache'}
          </button>
        </div>
      </div>

      {/* Feature Support */}
      <div className="pwa-section">
        <h4>Feature Support</h4>
        <div className="feature-support">
          <div className="feature-item">
            <span className="feature-name">Service Worker:</span>
            <span className={`feature-status ${isSupported.serviceWorker ? 'supported' : 'not-supported'}`}>
              {isSupported.serviceWorker ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          
          <div className="feature-item">
            <span className="feature-name">Push Notifications:</span>
            <span className={`feature-status ${isSupported.notifications ? 'supported' : 'not-supported'}`}>
              {isSupported.notifications ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          
          <div className="feature-item">
            <span className="feature-name">Background Sync:</span>
            <span className={`feature-status ${isSupported.backgroundSync ? 'supported' : 'not-supported'}`}>
              {isSupported.backgroundSync ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          
          <div className="feature-item">
            <span className="feature-name">Install Prompt:</span>
            <span className={`feature-status ${isSupported.installPrompt ? 'supported' : 'not-supported'}`}>
              {isSupported.installPrompt ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWASettings;