import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      earnings: true,
      withdrawals: true,
      marketing: false,
      system: true,
      security: true
    },
    push: {
      earnings: true,
      withdrawals: true,
      marketing: false,
      system: false,
      security: true
    },
    sms: {
      earnings: false,
      withdrawals: true,
      marketing: false,
      system: false,
      security: true
    }
  });

  // Mock notifications data
  const [allNotifications, setAllNotifications] = useState([
    {
      id: 1,
      type: 'earning',
      title: 'New Commission Earned',
      message: 'You earned $25.50 from affiliate sale #AS-2024-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      priority: 'high',
      category: 'earnings',
      actionUrl: '/analytics'
    },
    {
      id: 2,
      type: 'withdrawal',
      title: 'Withdrawal Processed',
      message: 'Your withdrawal of $500.00 has been successfully processed to PayPal',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: false,
      priority: 'medium',
      category: 'payments',
      actionUrl: '/payments'
    },
    {
      id: 3,
      type: 'system',
      title: 'Platform Update',
      message: 'New analytics features are now available in your dashboard',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      read: true,
      priority: 'low',
      category: 'system',
      actionUrl: '/analytics'
    },
    {
      id: 4,
      type: 'security',
      title: 'Login from New Device',
      message: 'We detected a login from a new device in New York, US',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      read: true,
      priority: 'high',
      category: 'security',
      actionUrl: '/profile'
    },
    {
      id: 5,
      type: 'marketing',
      title: 'New Campaign Available',
      message: 'High-converting tech products campaign is now live with 15% commission',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      read: false,
      priority: 'medium',
      category: 'marketing',
      actionUrl: '/affiliate'
    },
    {
      id: 6,
      type: 'earning',
      title: 'Monthly Goal Achieved',
      message: 'Congratulations! You\'ve reached your $1,000 monthly earning goal',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      priority: 'high',
      category: 'earnings',
      actionUrl: '/analytics'
    },
    {
      id: 7,
      type: 'system',
      title: 'Maintenance Scheduled',
      message: 'Platform maintenance scheduled for Sunday 2:00 AM - 4:00 AM EST',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: false,
      priority: 'medium',
      category: 'system'
    },
    {
      id: 8,
      type: 'withdrawal',
      title: 'Withdrawal Pending',
      message: 'Your withdrawal request of $250.00 is being processed',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      read: true,
      priority: 'medium',
      category: 'payments',
      actionUrl: '/payments'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getFilteredNotifications = () => {
    let filtered = allNotifications;

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (activeTab === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Filter by category
    if (filter !== 'all') {
      filtered = filtered.filter(n => n.category === filter);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      setAllNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }

    if (notification.actionUrl) {
      // Navigate to action URL
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    setAllNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setAllNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const handleDeleteNotification = (notificationId) => {
    setAllNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  };

  const handleBulkAction = (action) => {
    if (action === 'markRead') {
      setAllNotifications(prev => 
        prev.map(n => 
          selectedNotifications.includes(n.id) ? { ...n, read: true } : n
        )
      );
    } else if (action === 'delete') {
      setAllNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n.id))
      );
    }
    setSelectedNotifications([]);
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredNotifications = getFilteredNotifications();
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleSettingsChange = (channel, type, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: value
      }
    }));
  };

  const getNotificationIcon = (type) => {
    const icons = {
      earning: 'fas fa-dollar-sign',
      withdrawal: 'fas fa-credit-card',
      system: 'fas fa-cog',
      security: 'fas fa-shield-alt',
      marketing: 'fas fa-bullhorn'
    };
    return icons[type] || 'fas fa-bell';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#6b7280'
    };
    return colors[priority] || '#6b7280';
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner">
          <i className="fas fa-bell"></i>
        </div>
        <h3>Loading Notifications</h3>
        <p>Please wait while we fetch your latest notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-bell"></i>
              Notifications
            </h1>
            <p>Stay updated with your earnings, withdrawals, and platform updates</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn secondary"
              onClick={() => setShowSettings(!showSettings)}
            >
              <i className="fas fa-cog"></i>
              Settings
            </button>
            <button 
              className="action-btn primary"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <i className="fas fa-check-double"></i>
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="notifications-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <i className="fas fa-list"></i>
            All ({allNotifications.length})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            <i className="fas fa-circle"></i>
            Unread ({unreadCount})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'read' ? 'active' : ''}`}
            onClick={() => setActiveTab('read')}
          >
            <i className="fas fa-check"></i>
            Read ({allNotifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="notifications-content">
        {showSettings ? (
          <div className="settings-section">
            <div className="settings-header">
              <h3>Notification Settings</h3>
              <p>Customize how and when you receive notifications</p>
            </div>

            <div className="settings-grid">
              {Object.entries(notificationSettings).map(([channel, settings]) => (
                <div key={channel} className="settings-card">
                  <div className="settings-card-header">
                    <h4>
                      <i className={`fas fa-${
                        channel === 'email' ? 'envelope' : 
                        channel === 'push' ? 'mobile-alt' : 'sms'
                      }`}></i>
                      {channel.charAt(0).toUpperCase() + channel.slice(1)} Notifications
                    </h4>
                  </div>
                  <div className="settings-options">
                    {Object.entries(settings).map(([type, enabled]) => (
                      <div key={type} className="setting-item">
                        <div className="setting-info">
                          <span className="setting-label">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                          <span className="setting-description">
                            {type === 'earnings' && 'Commission and revenue notifications'}
                            {type === 'withdrawals' && 'Payment and withdrawal updates'}
                            {type === 'marketing' && 'New campaigns and promotions'}
                            {type === 'system' && 'Platform updates and maintenance'}
                            {type === 'security' && 'Security alerts and login notifications'}
                          </span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleSettingsChange(channel, type, e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="notifications-section">
            {/* Filters and Bulk Actions */}
            <div className="notifications-controls">
              <div className="filters">
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  <option value="earnings">Earnings</option>
                  <option value="payments">Payments</option>
                  <option value="marketing">Marketing</option>
                  <option value="system">System</option>
                  <option value="security">Security</option>
                </select>
              </div>

              {selectedNotifications.length > 0 && (
                <div className="bulk-actions">
                  <span className="selected-count">
                    {selectedNotifications.length} selected
                  </span>
                  <button 
                    className="bulk-btn"
                    onClick={() => handleBulkAction('markRead')}
                  >
                    <i className="fas fa-check"></i>
                    Mark Read
                  </button>
                  <button 
                    className="bulk-btn danger"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <i className="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
              <div className="notifications-list">
                <div className="list-header">
                  <label className="select-all">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                      onChange={handleSelectAll}
                    />
                    <span>Select All</span>
                  </label>
                </div>

                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-select">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectNotification(notification.id);
                        }}
                      />
                    </div>

                    <div className="notification-icon">
                      <i className={getNotificationIcon(notification.type)}></i>
                      {!notification.read && (
                        <div 
                          className="priority-indicator"
                          style={{ backgroundColor: getPriorityColor(notification.priority) }}
                        ></div>
                      )}
                    </div>

                    <div className="notification-content">
                      <div className="notification-header">
                        <h4>{notification.title}</h4>
                        <div className="notification-meta">
                          <span className="timestamp">{formatTimestamp(notification.timestamp)}</span>
                          <span className={`category ${notification.category}`}>
                            {notification.category}
                          </span>
                        </div>
                      </div>
                      <p className="notification-message">{notification.message}</p>
                    </div>

                    <div className="notification-actions">
                      {!notification.read && (
                        <button 
                          className="action-btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Mark as read"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button 
                        className="action-btn-small danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        title="Delete notification"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-bell-slash"></i>
                </div>
                <h4>No Notifications Found</h4>
                <p>
                  {activeTab === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : filter !== 'all'
                    ? `No notifications found in the ${filter} category.`
                    : "You don't have any notifications yet."
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;