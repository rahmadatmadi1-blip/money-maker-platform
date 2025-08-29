import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useDebounce, useApiCache } from '../hooks/usePerformance';
import './Dashboard.css';

const Dashboard = React.memo(() => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { getCachedData, setCachedData } = useApiCache();
  
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    availableBalance: 0,
    pendingEarnings: 0,
    totalReferrals: 0,
    revenueGrowth: 0,
    clicksToday: 0,
    conversionsToday: 0,
    activeLinks: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  
  // Debounce time range changes to avoid excessive API calls
  const debouncedTimeRange = useDebounce(timeRange, 300);

  const fetchDashboardData = useCallback(async () => {
    // Check cache first
    const cacheKey = `dashboard-${debouncedTimeRange}-${user?.id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      setAnalytics(cachedData.analytics);
      setRecentActivities(cachedData.activities);
      setTopPerformers(cachedData.performers);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Check if it's a demo token or if API is not available, use demo data
      if (!token || token.startsWith('demo-admin-token') || token.startsWith('demo-user-token')) {
        // Demo data based on user type
        const isAdmin = token && token.startsWith('demo-admin-token');
        
        const demoAnalytics = {
          totalRevenue: isAdmin ? 1575000 : (user?.earnings?.total || 175000),
          availableBalance: isAdmin ? 750000 : (user?.earnings?.available || 125000),
          pendingEarnings: isAdmin ? 235000 : (user?.earnings?.pending || 50000),
          totalReferrals: isAdmin ? 892 : 15,
          revenueGrowth: 12.5,
          clicksToday: isAdmin ? 2847 : 156,
          conversionsToday: isAdmin ? 89 : 12,
          activeLinks: isAdmin ? 156 : 8
        };
        
        const demoActivities = [
          {
            title: 'Affiliate Commission Earned',
            time: '2 hours ago',
            amount: 25000,
            icon: 'fas fa-dollar-sign'
          },
          {
            title: 'New Referral Joined',
            time: '4 hours ago',
            amount: null,
            icon: 'fas fa-user-plus'
          },
          {
            title: 'Content Sale',
            time: '1 day ago',
            amount: 15000,
            icon: 'fas fa-shopping-cart'
          },
          {
            title: 'Withdrawal Processed',
            time: '2 days ago',
            amount: -50000,
            icon: 'fas fa-money-bill-wave'
          }
        ];
        
        const demoPerformers = [
          {
            name: 'Tech Affiliate Program',
            type: 'Affiliate Link',
            revenue: 125000,
            growth: 15.2
          },
          {
            name: 'Digital Course Sales',
            type: 'E-commerce',
            revenue: 89000,
            growth: 8.7
          },
          {
            name: 'Blog Monetization',
            type: 'Content',
            revenue: 67000,
            growth: 22.1
          }
        ];
        
        setAnalytics(demoAnalytics);
        setRecentActivities(demoActivities);
        setTopPerformers(demoPerformers);
        setLoading(false);
        return;
      }
      
      // Try to fetch from real API
      try {
        // Fetch analytics data
        const analyticsResponse = await fetch('/api/analytics/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData);
        }
        
        // Fetch recent activities
        const activitiesResponse = await fetch(`/api/analytics/activities?limit=10&timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          setRecentActivities(activitiesData);
        }
        
        // Fetch top performers
        const performersResponse = await fetch(`/api/analytics/top-performers?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (performersResponse.ok) {
          const performersData = await performersResponse.json();
          setTopPerformers(performersData);
        }
        
      } catch (apiError) {
        console.log('API not available, using demo data');
        
        // Fallback to demo data if API fails
        const demoAnalytics = {
          totalRevenue: user?.earnings?.total || 175000,
          availableBalance: user?.earnings?.available || 125000,
          pendingEarnings: user?.earnings?.pending || 50000,
          totalReferrals: 15,
          revenueGrowth: 12.5,
          clicksToday: 156,
          conversionsToday: 12,
          activeLinks: 8
        };
        
        const demoActivities = [
          {
            title: 'Affiliate Commission Earned',
            time: '2 hours ago',
            amount: 25000,
            icon: 'fas fa-dollar-sign'
          },
          {
            title: 'New Referral Joined',
            time: '4 hours ago',
            amount: null,
            icon: 'fas fa-user-plus'
          }
        ];
        
        const demoPerformers = [
          {
            name: 'Tech Affiliate Program',
            type: 'Affiliate Link',
            revenue: 125000,
            growth: 15.2
          }
        ];
        
        setAnalytics(demoAnalytics);
        setRecentActivities(demoActivities);
        setTopPerformers(demoPerformers);
        
        // Cache the demo data
        setCachedData(cacheKey, {
          analytics: demoAnalytics,
          activities: demoActivities,
          performers: demoPerformers
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedTimeRange, user?.id, getCachedData, setCachedData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoize expensive formatting functions
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  }, []);

  // Memoize greeting calculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  }, []);

  // Memoize quick actions to prevent unnecessary re-renders
  const quickActions = useMemo(() => [
    {
      title: 'Create Affiliate Link',
      description: 'Generate new affiliate marketing link',
      icon: 'fas fa-link',
      color: '#00d4ff',
      path: '/affiliate/create'
    },
    {
      title: 'Add Product',
      description: 'List new product in marketplace',
      icon: 'fas fa-plus-circle',
      color: '#00ff88',
      path: '/ecommerce/products/create'
    },
    {
      title: 'Create Content',
      description: 'Publish monetizable content',
      icon: 'fas fa-edit',
      color: '#ff6b6b',
      path: '/content/create'
    },
    {
      title: 'Offer Service',
      description: 'Add service to marketplace',
      icon: 'fas fa-briefcase',
      color: '#ffa726',
      path: '/marketplace/services/create'
    }
  ], []);

  // Memoize stat cards to prevent unnecessary recalculations
  const statCards = useMemo(() => [
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics.totalRevenue),
      change: `+${analytics.revenueGrowth}%`,
      changeType: analytics.revenueGrowth >= 0 ? 'positive' : 'negative',
      icon: 'fas fa-dollar-sign',
      color: '#00d4ff'
    },
    {
      title: 'Available Balance',
      value: formatCurrency(analytics.availableBalance),
      change: 'Ready to withdraw',
      changeType: 'neutral',
      icon: 'fas fa-wallet',
      color: '#00ff88'
    },
    {
      title: 'Pending Earnings',
      value: formatCurrency(analytics.pendingEarnings),
      change: 'Processing',
      changeType: 'neutral',
      icon: 'fas fa-clock',
      color: '#ffa726'
    },
    {
      title: 'Total Referrals',
      value: formatNumber(analytics.totalReferrals),
      change: 'Active network',
      changeType: 'positive',
      icon: 'fas fa-users',
      color: '#ff6b6b'
    }
  ], [analytics, formatCurrency, formatNumber]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="welcome-title">
              {greeting}, {user?.firstName || user?.name}! 👋
            </h1>
            <p className="welcome-subtitle">
              Selamat datang kembali di Money Maker Platform. Mari lihat performa Anda hari ini.
            </p>
          </div>
          <div className="header-actions">
            <div className="time-range-selector">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-select"
              >
                <option value="1d">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              <i className={card.icon}></i>
            </div>
            <div className="stat-content">
              <h3 className="stat-title">{card.title}</h3>
              <p className="stat-value">{card.value}</p>
              <span className={`stat-change ${card.changeType}`}>
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <div key={index} className="quick-action-card">
              <div className="action-icon" style={{ backgroundColor: action.color }}>
                <i className={action.icon}></i>
              </div>
              <div className="action-content">
                <h3 className="action-title">{action.title}</h3>
                <p className="action-description">{action.description}</p>
              </div>
              <button className="action-btn">
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Performance Overview */}
        <div className="dashboard-card performance-card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-chart-line"></i>
              Performance Overview
            </h3>
          </div>
          <div className="card-content">
            <div className="performance-metrics">
              <div className="metric">
                <div className="metric-icon">
                  <i className="fas fa-mouse-pointer"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-label">Clicks Today</span>
                  <span className="metric-value">{formatNumber(analytics.clicksToday)}</span>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon">
                  <i className="fas fa-exchange-alt"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-label">Conversions</span>
                  <span className="metric-value">{formatNumber(analytics.conversionsToday)}</span>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon">
                  <i className="fas fa-link"></i>
                </div>
                <div className="metric-info">
                  <span className="metric-label">Active Links</span>
                  <span className="metric-value">{formatNumber(analytics.activeLinks)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="dashboard-card activities-card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-history"></i>
              Recent Activities
            </h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="card-content">
            {recentActivities.length > 0 ? (
              <div className="activities-list">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <i className={activity.icon || 'fas fa-circle'}></i>
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                    <div className="activity-amount">
                      {activity.amount && formatCurrency(activity.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="dashboard-card performers-card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-trophy"></i>
              Top Performers
            </h3>
          </div>
          <div className="card-content">
            {topPerformers.length > 0 ? (
              <div className="performers-list">
                {topPerformers.map((performer, index) => (
                  <div key={index} className="performer-item">
                    <div className="performer-rank">
                      #{index + 1}
                    </div>
                    <div className="performer-info">
                      <p className="performer-name">{performer.name}</p>
                      <span className="performer-type">{performer.type}</span>
                    </div>
                    <div className="performer-stats">
                      <span className="performer-revenue">
                        {formatCurrency(performer.revenue)}
                      </span>
                      <span className="performer-growth">
                        +{performer.growth}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-chart-bar"></i>
                <p>No performance data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Preview */}
        <div className="dashboard-card notifications-card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-bell"></i>
              Recent Notifications
            </h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="card-content">
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification._id} className="notification-item">
                    <div className={`notification-dot ${notification.type}`}></div>
                    <div className="notification-content">
                      <p className="notification-title">{notification.title}</p>
                      <span className="notification-time">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-bell-slash"></i>
                <p>No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="goals-section">
        <div className="dashboard-card goals-card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-target"></i>
              Monthly Goals
            </h3>
            <button className="edit-goals-btn">
              <i className="fas fa-edit"></i>
              Edit Goals
            </button>
          </div>
          <div className="card-content">
            <div className="goals-grid">
              <div className="goal-item">
                <div className="goal-info">
                  <span className="goal-label">Revenue Target</span>
                  <span className="goal-progress">$2,500 / $5,000</span>
                </div>
                <div className="goal-bar">
                  <div className="goal-fill" style={{ width: '50%' }}></div>
                </div>
                <span className="goal-percentage">50%</span>
              </div>
              <div className="goal-item">
                <div className="goal-info">
                  <span className="goal-label">New Referrals</span>
                  <span className="goal-progress">15 / 25</span>
                </div>
                <div className="goal-bar">
                  <div className="goal-fill" style={{ width: '60%' }}></div>
                </div>
                <span className="goal-percentage">60%</span>
              </div>
              <div className="goal-item">
                <div className="goal-info">
                  <span className="goal-label">Content Published</span>
                  <span className="goal-progress">8 / 10</span>
                </div>
                <div className="goal-bar">
                  <div className="goal-fill" style={{ width: '80%' }}></div>
                </div>
                <span className="goal-percentage">80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;