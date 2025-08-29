import React from 'react';
import { usePWA } from '../../contexts/PWAContext';
import './PWA.css';

const UpdateNotification = () => {
  const { updateAvailable, updateApp } = usePWA();

  if (!updateAvailable) return null;

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-info">
          <span className="update-icon">🔄</span>
          <div className="update-text">
            <h4>New Version Available!</h4>
            <p>Update now to get the latest features and improvements.</p>
          </div>
        </div>
        <div className="update-actions">
          <button 
            className="update-btn update-btn-primary"
            onClick={updateApp}
          >
            Update Now
          </button>
          <button 
            className="update-btn update-btn-secondary"
            onClick={() => window.location.reload()}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;