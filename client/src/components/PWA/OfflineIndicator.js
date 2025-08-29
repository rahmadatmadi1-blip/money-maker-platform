import React from 'react';
import { usePWA } from '../../contexts/PWAContext';
import './PWA.css';

const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        <span className="offline-icon">📡</span>
        <span className="offline-text">You're offline</span>
        <span className="offline-subtext">Some features may be limited</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;