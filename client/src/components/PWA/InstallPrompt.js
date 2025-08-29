import React, { useState, useEffect } from 'react';
import { usePWA } from '../../contexts/PWAContext';
import './PWA.css';

const InstallPrompt = () => {
  const { isInstalled } = usePWA();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt if not dismissed and not installed
      if (!localStorage.getItem('pwa-install-dismissed') && !isInstalled) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="install-prompt">
      <div className="install-content">
        <div className="install-info">
          <span className="install-icon">📱</span>
          <div className="install-text">
            <h4>Install Money Maker</h4>
            <p>Get the full app experience with offline access and push notifications.</p>
          </div>
        </div>
        <div className="install-actions">
          <button 
            className="install-btn install-btn-primary"
            onClick={handleInstall}
          >
            Install
          </button>
          <button 
            className="install-btn install-btn-secondary"
            onClick={handleDismiss}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;