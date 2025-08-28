import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, isMobile, user }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      path: '/dashboard',
      description: 'Overview & Statistics'
    },
    {
      title: 'Affiliate Marketing',
      icon: 'fas fa-link',
      path: '/affiliate',
      description: 'Manage affiliate links'
    },
    {
      title: 'E-Commerce',
      icon: 'fas fa-store',
      path: '/ecommerce',
      description: 'Products & Orders'
    },
    {
      title: 'Content Creator',
      icon: 'fas fa-edit',
      path: '/content',
      description: 'Create & monetize content'
    },
    {
      title: 'Marketplace',
      icon: 'fas fa-handshake',
      path: '/marketplace',
      description: 'Digital services'
    },
    {
      title: 'Analytics',
      icon: 'fas fa-chart-line',
      path: '/analytics',
      description: 'Performance insights'
    },
    {
      title: 'Payments',
      icon: 'fas fa-credit-card',
      path: '/payments',
      description: 'Transactions & Withdrawals'
    },
    {
      title: 'Notifications',
      icon: 'fas fa-bell',
      path: '/notifications',
      description: 'Messages & Updates'
    }
  ];

  const bottomMenuItems = [
    {
      title: 'Profile',
      icon: 'fas fa-user',
      path: '/profile',
      description: 'Account settings'
    },
    {
      title: 'Settings',
      icon: 'fas fa-cog',
      path: '/settings',
      description: 'App preferences'
    }
  ];

  // Add admin menu item if user is admin
  if (user?.role === 'admin') {
    bottomMenuItems.unshift({
      title: 'Admin Panel',
      icon: 'fas fa-shield-alt',
      path: '/admin',
      description: 'System management',
      isAdmin: true
    });
  }

  const isActiveRoute = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleItemClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isMobile ? 'sidebar-mobile' : ''}`}>
        <div className="sidebar-content">
          {/* User Info Section */}
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <div className="avatar-placeholder">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="user-details">
              <h4 className="user-name">{user?.name || 'User'}</h4>
              <p className="user-email">{user?.email}</p>
              <div className="user-stats">
                <div className="stat">
                  <span className="stat-value">${user?.totalEarnings?.toFixed(2) || '0.00'}</span>
                  <span className="stat-label">Total Earnings</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{user?.referralCount || 0}</span>
                  <span className="stat-label">Referrals</span>
                </div>
              </div>
              {user?.isPremium && (
                <div className="premium-badge">
                  <i className="fas fa-crown"></i>
                  <span>Premium Member</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h5 className="nav-section-title">Main Menu</h5>
              <ul className="nav-list">
                {menuItems.map((item) => (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${isActiveRoute(item.path) ? 'active' : ''}`}
                      onClick={handleItemClick}
                      title={item.description}
                    >
                      <div className="nav-icon">
                        <i className={item.icon}></i>
                      </div>
                      <div className="nav-content">
                        <span className="nav-title">{item.title}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                      {isActiveRoute(item.path) && (
                        <div className="nav-indicator"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Navigation */}
            <div className="nav-section nav-section-bottom">
              <h5 className="nav-section-title">Account</h5>
              <ul className="nav-list">
                {bottomMenuItems.map((item) => (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${isActiveRoute(item.path) ? 'active' : ''} ${item.isAdmin ? 'admin-link' : ''}`}
                      onClick={handleItemClick}
                      title={item.description}
                    >
                      <div className="nav-icon">
                        <i className={item.icon}></i>
                      </div>
                      <div className="nav-content">
                        <span className="nav-title">{item.title}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                      {isActiveRoute(item.path) && (
                        <div className="nav-indicator"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Quick Actions */}
          <div className="sidebar-actions">
            {!user?.isPremium && (
              <Link to="/upgrade" className="upgrade-btn" onClick={handleItemClick}>
                <i className="fas fa-crown"></i>
                <div className="upgrade-content">
                  <span className="upgrade-title">Upgrade to Premium</span>
                  <span className="upgrade-description">Unlock all features</span>
                </div>
              </Link>
            )}
            
            <div className="quick-stats">
              <div className="quick-stat">
                <i className="fas fa-eye"></i>
                <div className="stat-info">
                  <span className="stat-number">{user?.totalViews || 0}</span>
                  <span className="stat-text">Total Views</span>
                </div>
              </div>
              <div className="quick-stat">
                <i className="fas fa-mouse-pointer"></i>
                <div className="stat-info">
                  <span className="stat-number">{user?.totalClicks || 0}</span>
                  <span className="stat-text">Total Clicks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="app-version">
              <span>Money Maker v1.0</span>
            </div>
            <div className="footer-links">
              <a href="/help" className="footer-link" onClick={handleItemClick}>
                <i className="fas fa-question-circle"></i>
                Help
              </a>
              <a href="/support" className="footer-link" onClick={handleItemClick}>
                <i className="fas fa-life-ring"></i>
                Support
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;