import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import './Navbar.css';

const Navbar = ({ onToggleSidebar, isMobile }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left side */}
        <div className="navbar-left">
          {user && (
            <button 
              className="sidebar-toggle"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <i className="fas fa-bars"></i>
            </button>
          )}
          
          <Link to="/" className="navbar-brand">
            <i className="fas fa-dollar-sign brand-icon"></i>
            <span className="brand-text">Money Maker</span>
          </Link>
        </div>

        {/* Center - Search (only on desktop) */}
        {!isMobile && user && (
          <div className="navbar-center">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input 
                type="text" 
                placeholder="Cari produk, layanan, atau konten..."
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <>
              {/* Quick Stats */}
              <div className="quick-stats">
                <div className="stat-item">
                  <span className="stat-value">${user.totalEarnings?.toFixed(2) || '0.00'}</span>
                  <span className="stat-label">Total</span>
                </div>
                {user.isPremium && (
                  <div className="premium-badge">
                    <i className="fas fa-crown"></i>
                    <span>Premium</span>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="notification-container" ref={notificationRef}>
                <button 
                  className="notification-btn"
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  <i className="fas fa-bell"></i>
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <h4>Notifikasi</h4>
                      <Link 
                        to="/notifications" 
                        className="view-all-link"
                        onClick={() => setShowNotifications(false)}
                      >
                        Lihat Semua
                      </Link>
                    </div>
                    <div className="notification-list">
                      {unreadCount === 0 ? (
                        <div className="no-notifications">
                          <i className="fas fa-bell-slash"></i>
                          <p>Tidak ada notifikasi baru</p>
                        </div>
                      ) : (
                        <div className="notification-preview">
                          <p>Anda memiliki {unreadCount} notifikasi baru</p>
                          <Link 
                            to="/notifications" 
                            className="btn btn-sm btn-primary"
                            onClick={() => setShowNotifications(false)}
                          >
                            Lihat Detail
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="user-menu-container" ref={userMenuRef}>
                <button 
                  className="user-menu-btn"
                  onClick={toggleUserMenu}
                  aria-label="User menu"
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                  </div>
                  <i className="fas fa-chevron-down dropdown-arrow"></i>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-avatar-large">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <span className={`role-badge ${user.role}`}>{user.role}</span>
                      </div>
                    </div>
                    
                    <div className="user-dropdown-menu">
                      <Link 
                        to="/dashboard" 
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-tachometer-alt"></i>
                        Dashboard
                      </Link>
                      
                      <Link 
                        to="/profile" 
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-user"></i>
                        Profil
                      </Link>
                      
                      <Link 
                        to="/analytics" 
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-chart-line"></i>
                        Analytics
                      </Link>
                      
                      <Link 
                        to="/payments" 
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-credit-card"></i>
                        Pembayaran
                      </Link>
                      
                      <Link 
                        to="/settings" 
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fas fa-cog"></i>
                        Pengaturan
                      </Link>
                      
                      {user.role === 'admin' && (
                        <>
                          <div className="dropdown-divider"></div>
                          <Link 
                            to="/admin" 
                            className="dropdown-item admin-item"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <i className="fas fa-shield-alt"></i>
                            Admin Panel
                          </Link>
                        </>
                      )}
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        className="dropdown-item logout-item"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline">
                Masuk
              </Link>
              <Link to="/register" className="btn btn-primary">
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;