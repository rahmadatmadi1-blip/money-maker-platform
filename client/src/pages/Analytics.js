import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Analytics.css';

const Analytics = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalRevenue: 0,
      totalClicks: 0,
      totalViews: 0,
      conversionRate: 0,
      averageOrderValue: 0,
      activeLinks: 0
    },
    revenue: {
      current: 0,
      previous: 0,
      growth: 0,
      chart: []
    },
    traffic: {
      totalViews: 0,
      uniqueVisitors: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      chart: []
    },
    conversions: {
      totalConversions: 0,
      conversionRate: 0,
      topPerformers: [],
      chart: []
    },
    affiliate: {
      totalCommissions: 0,
      activeLinks: 0,
      topProducts: [],
      clickThroughRate: 0
    },
    ecommerce: {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topProducts: []
    },
    content: {
      totalViews: 0,
      engagement: 0,
      topContent: [],
      socialShares: 0
    }
  });
  const [goals, setGoals] = useState([
    {
      id: 1,
      title: 'Monthly Revenue Target',
      target: 5000,
      current: 3250,
      type: 'revenue',
      deadline: '2024-01-31'
    },
    {
      id: 2,
      title: 'Affiliate Conversions',
      target: 100,
      current: 67,
      type: 'conversions',
      deadline: '2024-01-31'
    },
    {
      id: 3,
      title: 'Content Views',
      target: 10000,
      current: 8500,
      type: 'views',
      deadline: '2024-01-31'
    }
  ]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock analytics data based on time range
      const mockData = {
        overview: {
          totalRevenue: timeRange === '7d' ? 1250 : timeRange === '30d' ? 4800 : 15600,
          totalClicks: timeRange === '7d' ? 2340 : timeRange === '30d' ? 9800 : 32400,
          totalViews: timeRange === '7d' ? 8900 : timeRange === '30d' ? 35600 : 125000,
          conversionRate: timeRange === '7d' ? 3.2 : timeRange === '30d' ? 2.8 : 3.5,
          averageOrderValue: timeRange === '7d' ? 85 : timeRange === '30d' ? 92 : 88,
          activeLinks: 24
        },
        revenue: {
          current: timeRange === '7d' ? 1250 : timeRange === '30d' ? 4800 : 15600,
          previous: timeRange === '7d' ? 980 : timeRange === '30d' ? 4200 : 13800,
          growth: timeRange === '7d' ? 27.6 : timeRange === '30d' ? 14.3 : 13.0,
          chart: generateChartData('revenue', timeRange)
        },
        traffic: {
          totalViews: timeRange === '7d' ? 8900 : timeRange === '30d' ? 35600 : 125000,
          uniqueVisitors: timeRange === '7d' ? 3200 : timeRange === '30d' ? 12800 : 45000,
          bounceRate: 42.5,
          avgSessionDuration: 185,
          chart: generateChartData('traffic', timeRange)
        },
        conversions: {
          totalConversions: timeRange === '7d' ? 75 : timeRange === '30d' ? 274 : 890,
          conversionRate: timeRange === '7d' ? 3.2 : timeRange === '30d' ? 2.8 : 3.5,
          topPerformers: [
            { name: 'Tech Gadgets Affiliate', conversions: 45, revenue: 675 },
            { name: 'Fashion E-commerce', conversions: 32, revenue: 480 },
            { name: 'Digital Course Sales', conversions: 28, revenue: 420 }
          ],
          chart: generateChartData('conversions', timeRange)
        },
        affiliate: {
          totalCommissions: timeRange === '7d' ? 680 : timeRange === '30d' ? 2400 : 8900,
          activeLinks: 24,
          topProducts: [
            { name: 'Wireless Headphones', clicks: 450, conversions: 23, commission: 230 },
            { name: 'Smartphone Case', clicks: 320, conversions: 18, commission: 180 },
            { name: 'Laptop Stand', clicks: 280, conversions: 15, commission: 150 }
          ],
          clickThroughRate: 4.2
        },
        ecommerce: {
          totalSales: timeRange === '7d' ? 2100 : timeRange === '30d' ? 8900 : 28500,
          totalOrders: timeRange === '7d' ? 28 : timeRange === '30d' ? 115 : 380,
          averageOrderValue: timeRange === '7d' ? 75 : timeRange === '30d' ? 77 : 75,
          topProducts: [
            { name: 'Premium Course Bundle', sales: 12, revenue: 1200 },
            { name: 'Digital Marketing Guide', sales: 8, revenue: 400 },
            { name: 'SEO Tools Package', sales: 6, revenue: 300 }
          ]
        },
        content: {
          totalViews: timeRange === '7d' ? 12500 : timeRange === '30d' ? 48000 : 165000,
          engagement: 6.8,
          topContent: [
            { title: 'How to Make Money Online', views: 2400, engagement: 8.2 },
            { title: 'Affiliate Marketing Guide', views: 1800, engagement: 7.5 },
            { title: 'E-commerce Success Tips', views: 1500, engagement: 6.9 }
          ],
          socialShares: timeRange === '7d' ? 340 : timeRange === '30d' ? 1200 : 4500
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      addNotification('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (type, range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      let value;
      switch (type) {
        case 'revenue':
          value = Math.floor(Math.random() * 200) + 50;
          break;
        case 'traffic':
          value = Math.floor(Math.random() * 500) + 100;
          break;
        case 'conversions':
          value = Math.floor(Math.random() * 20) + 5;
          break;
        default:
          value = Math.floor(Math.random() * 100);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: value
      });
    }
    
    return data;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num) => {
    return `${num.toFixed(1)}%`;
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return 'fas fa-arrow-up';
    if (growth < 0) return 'fas fa-arrow-down';
    return 'fas fa-minus';
  };

  const getGrowthClass = (growth) => {
    if (growth > 0) return 'positive';
    if (growth < 0) return 'negative';
    return 'neutral';
  };

  const calculateGoalProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <h3>Loading Analytics...</h3>
        <p>Analyzing your performance data and generating insights.</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Analytics Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-chart-line"></i>
              Analytics Dashboard
            </h1>
            <p>Track your performance, analyze trends, and optimize your monetization strategy</p>
          </div>
          
          <div className="time-range-selector">
            <button 
              className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button 
              className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
            <button 
              className={`range-btn ${timeRange === '90d' ? 'active' : ''}`}
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Navigation */}
      <div className="analytics-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Overview</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            <i className="fas fa-dollar-sign"></i>
            <span>Revenue</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'traffic' ? 'active' : ''}`}
            onClick={() => setActiveTab('traffic')}
          >
            <i className="fas fa-users"></i>
            <span>Traffic</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'conversions' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversions')}
          >
            <i className="fas fa-bullseye"></i>
            <span>Conversions</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'affiliate' ? 'active' : ''}`}
            onClick={() => setActiveTab('affiliate')}
          >
            <i className="fas fa-handshake"></i>
            <span>Affiliate</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'ecommerce' ? 'active' : ''}`}
            onClick={() => setActiveTab('ecommerce')}
          >
            <i className="fas fa-shopping-cart"></i>
            <span>E-commerce</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <i className="fas fa-file-alt"></i>
            <span>Content</span>
          </button>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon revenue">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="metric-content">
                  <h3>Total Revenue</h3>
                  <div className="metric-value">{formatCurrency(analyticsData.overview.totalRevenue)}</div>
                  <div className="metric-growth positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+{analyticsData.revenue.growth}% vs last period</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon traffic">
                  <i className="fas fa-eye"></i>
                </div>
                <div className="metric-content">
                  <h3>Total Views</h3>
                  <div className="metric-value">{formatNumber(analyticsData.overview.totalViews)}</div>
                  <div className="metric-growth positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+12.5% vs last period</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon clicks">
                  <i className="fas fa-mouse-pointer"></i>
                </div>
                <div className="metric-content">
                  <h3>Total Clicks</h3>
                  <div className="metric-value">{formatNumber(analyticsData.overview.totalClicks)}</div>
                  <div className="metric-growth positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+8.3% vs last period</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon conversion">
                  <i className="fas fa-bullseye"></i>
                </div>
                <div className="metric-content">
                  <h3>Conversion Rate</h3>
                  <div className="metric-value">{formatPercentage(analyticsData.overview.conversionRate)}</div>
                  <div className="metric-growth positive">
                    <i className="fas fa-arrow-up"></i>
                    <span>+0.4% vs last period</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon aov">
                  <i className="fas fa-shopping-bag"></i>
                </div>
                <div className="metric-content">
                  <h3>Avg Order Value</h3>
                  <div className="metric-value">{formatCurrency(analyticsData.overview.averageOrderValue)}</div>
                  <div className="metric-growth negative">
                    <i className="fas fa-arrow-down"></i>
                    <span>-2.1% vs last period</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon links">
                  <i className="fas fa-link"></i>
                </div>
                <div className="metric-content">
                  <h3>Active Links</h3>
                  <div className="metric-value">{analyticsData.overview.activeLinks}</div>
                  <div className="metric-growth neutral">
                    <i className="fas fa-minus"></i>
                    <span>No change</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals Progress */}
            <div className="goals-section">
              <h3>Goals Progress</h3>
              <div className="goals-grid">
                {goals.map(goal => {
                  const progress = calculateGoalProgress(goal.current, goal.target);
                  return (
                    <div key={goal.id} className="goal-card">
                      <div className="goal-header">
                        <h4>{goal.title}</h4>
                        <span className="goal-deadline">{goal.deadline}</span>
                      </div>
                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="progress-text">
                          <span className="current">{formatNumber(goal.current)}</span>
                          <span className="target">/ {formatNumber(goal.target)}</span>
                          <span className="percentage">({progress.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Insights */}
            <div className="insights-section">
              <h3>Quick Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon positive">
                    <i className="fas fa-trending-up"></i>
                  </div>
                  <div className="insight-content">
                    <h4>Revenue Growth</h4>
                    <p>Your revenue has increased by {analyticsData.revenue.growth}% compared to the previous period. Keep up the great work!</p>
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-icon warning">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="insight-content">
                    <h4>Conversion Opportunity</h4>
                    <p>Your traffic is growing but conversion rate could be improved. Consider A/B testing your landing pages.</p>
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-icon info">
                    <i className="fas fa-lightbulb"></i>
                  </div>
                  <div className="insight-content">
                    <h4>Top Performer</h4>
                    <p>Tech Gadgets Affiliate is your best performing link. Consider promoting similar products.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="revenue-section">
            <div className="section-header">
              <h3>Revenue Analytics</h3>
              <div className="revenue-summary">
                <div className="summary-item">
                  <span className="label">Current Period</span>
                  <span className="value">{formatCurrency(analyticsData.revenue.current)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Previous Period</span>
                  <span className="value">{formatCurrency(analyticsData.revenue.previous)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Growth</span>
                  <span className={`value ${getGrowthClass(analyticsData.revenue.growth)}`}>
                    <i className={getGrowthIcon(analyticsData.revenue.growth)}></i>
                    {formatPercentage(analyticsData.revenue.growth)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h4>Revenue Trend</h4>
              </div>
              <div className="chart-placeholder">
                <div className="chart-bars">
                  {analyticsData.revenue.chart.map((item, index) => (
                    <div 
                      key={index}
                      className="chart-bar"
                      style={{ height: `${(item.value / Math.max(...analyticsData.revenue.chart.map(d => d.value))) * 100}%` }}
                      title={`${item.date}: ${formatCurrency(item.value)}`}
                    ></div>
                  ))}
                </div>
                <div className="chart-labels">
                  {analyticsData.revenue.chart.filter((_, index) => index % Math.ceil(analyticsData.revenue.chart.length / 7) === 0).map((item, index) => (
                    <span key={index} className="chart-label">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="revenue-breakdown">
              <h4>Revenue Sources</h4>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <div className="breakdown-icon affiliate">
                    <i className="fas fa-handshake"></i>
                  </div>
                  <div className="breakdown-content">
                    <h5>Affiliate Commissions</h5>
                    <div className="breakdown-value">{formatCurrency(analyticsData.affiliate.totalCommissions)}</div>
                    <div className="breakdown-percentage">45% of total</div>
                  </div>
                </div>
                
                <div className="breakdown-item">
                  <div className="breakdown-icon ecommerce">
                    <i className="fas fa-shopping-cart"></i>
                  </div>
                  <div className="breakdown-content">
                    <h5>E-commerce Sales</h5>
                    <div className="breakdown-value">{formatCurrency(analyticsData.ecommerce.totalSales)}</div>
                    <div className="breakdown-percentage">35% of total</div>
                  </div>
                </div>
                
                <div className="breakdown-item">
                  <div className="breakdown-icon services">
                    <i className="fas fa-briefcase"></i>
                  </div>
                  <div className="breakdown-content">
                    <h5>Service Sales</h5>
                    <div className="breakdown-value">{formatCurrency(850)}</div>
                    <div className="breakdown-percentage">20% of total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="traffic-section">
            <div className="traffic-metrics">
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-eye"></i>
                </div>
                <div className="metric-content">
                  <h4>Total Views</h4>
                  <div className="metric-value">{formatNumber(analyticsData.traffic.totalViews)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="metric-content">
                  <h4>Unique Visitors</h4>
                  <div className="metric-value">{formatNumber(analyticsData.traffic.uniqueVisitors)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="metric-content">
                  <h4>Bounce Rate</h4>
                  <div className="metric-value">{formatPercentage(analyticsData.traffic.bounceRate)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="metric-content">
                  <h4>Avg Session</h4>
                  <div className="metric-value">{Math.floor(analyticsData.traffic.avgSessionDuration / 60)}m {analyticsData.traffic.avgSessionDuration % 60}s</div>
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h4>Traffic Trend</h4>
              </div>
              <div className="chart-placeholder">
                <div className="chart-line">
                  {analyticsData.traffic.chart.map((item, index) => (
                    <div 
                      key={index}
                      className="chart-point"
                      style={{ 
                        left: `${(index / (analyticsData.traffic.chart.length - 1)) * 100}%`,
                        bottom: `${(item.value / Math.max(...analyticsData.traffic.chart.map(d => d.value))) * 80 + 10}%`
                      }}
                      title={`${item.date}: ${formatNumber(item.value)} views`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversions' && (
          <div className="conversions-section">
            <div className="conversions-overview">
              <div className="overview-stats">
                <div className="stat">
                  <h4>Total Conversions</h4>
                  <div className="stat-value">{formatNumber(analyticsData.conversions.totalConversions)}</div>
                </div>
                <div className="stat">
                  <h4>Conversion Rate</h4>
                  <div className="stat-value">{formatPercentage(analyticsData.conversions.conversionRate)}</div>
                </div>
              </div>
            </div>
            
            <div className="top-performers">
              <h4>Top Performing Links</h4>
              <div className="performers-list">
                {analyticsData.conversions.topPerformers.map((performer, index) => (
                  <div key={index} className="performer-item">
                    <div className="performer-rank">#{index + 1}</div>
                    <div className="performer-info">
                      <h5>{performer.name}</h5>
                      <div className="performer-stats">
                        <span>{performer.conversions} conversions</span>
                        <span>{formatCurrency(performer.revenue)} revenue</span>
                      </div>
                    </div>
                    <div className="performer-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${(performer.conversions / Math.max(...analyticsData.conversions.topPerformers.map(p => p.conversions))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'affiliate' && (
          <div className="affiliate-section">
            <div className="affiliate-overview">
              <div className="overview-metrics">
                <div className="metric">
                  <h4>Total Commissions</h4>
                  <div className="metric-value">{formatCurrency(analyticsData.affiliate.totalCommissions)}</div>
                </div>
                <div className="metric">
                  <h4>Active Links</h4>
                  <div className="metric-value">{analyticsData.affiliate.activeLinks}</div>
                </div>
                <div className="metric">
                  <h4>Click-Through Rate</h4>
                  <div className="metric-value">{formatPercentage(analyticsData.affiliate.clickThroughRate)}</div>
                </div>
              </div>
            </div>
            
            <div className="top-products">
              <h4>Top Affiliate Products</h4>
              <div className="products-table">
                <div className="table-header">
                  <div className="header-cell">Product</div>
                  <div className="header-cell">Clicks</div>
                  <div className="header-cell">Conversions</div>
                  <div className="header-cell">Commission</div>
                </div>
                {analyticsData.affiliate.topProducts.map((product, index) => (
                  <div key={index} className="table-row">
                    <div className="table-cell">
                      <div className="product-info">
                        <h5>{product.name}</h5>
                      </div>
                    </div>
                    <div className="table-cell">{formatNumber(product.clicks)}</div>
                    <div className="table-cell">{product.conversions}</div>
                    <div className="table-cell">{formatCurrency(product.commission)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ecommerce' && (
          <div className="ecommerce-section">
            <div className="ecommerce-metrics">
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="metric-content">
                  <h4>Total Sales</h4>
                  <div className="metric-value">{formatCurrency(analyticsData.ecommerce.totalSales)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-shopping-bag"></i>
                </div>
                <div className="metric-content">
                  <h4>Total Orders</h4>
                  <div className="metric-value">{formatNumber(analyticsData.ecommerce.totalOrders)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="metric-content">
                  <h4>Avg Order Value</h4>
                  <div className="metric-value">{formatCurrency(analyticsData.ecommerce.averageOrderValue)}</div>
                </div>
              </div>
            </div>
            
            <div className="top-products">
              <h4>Best Selling Products</h4>
              <div className="products-grid">
                {analyticsData.ecommerce.topProducts.map((product, index) => (
                  <div key={index} className="product-card">
                    <div className="product-rank">#{index + 1}</div>
                    <div className="product-info">
                      <h5>{product.name}</h5>
                      <div className="product-stats">
                        <span>{product.sales} sales</span>
                        <span>{formatCurrency(product.revenue)} revenue</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="content-section">
            <div className="content-metrics">
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-eye"></i>
                </div>
                <div className="metric-content">
                  <h4>Total Views</h4>
                  <div className="metric-value">{formatNumber(analyticsData.content.totalViews)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-heart"></i>
                </div>
                <div className="metric-content">
                  <h4>Engagement Rate</h4>
                  <div className="metric-value">{formatPercentage(analyticsData.content.engagement)}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">
                  <i className="fas fa-share"></i>
                </div>
                <div className="metric-content">
                  <h4>Social Shares</h4>
                  <div className="metric-value">{formatNumber(analyticsData.content.socialShares)}</div>
                </div>
              </div>
            </div>
            
            <div className="top-content">
              <h4>Top Performing Content</h4>
              <div className="content-list">
                {analyticsData.content.topContent.map((content, index) => (
                  <div key={index} className="content-item">
                    <div className="content-rank">#{index + 1}</div>
                    <div className="content-info">
                      <h5>{content.title}</h5>
                      <div className="content-stats">
                        <span><i className="fas fa-eye"></i> {formatNumber(content.views)} views</span>
                        <span><i className="fas fa-heart"></i> {formatPercentage(content.engagement)} engagement</span>
                      </div>
                    </div>
                    <div className="content-actions">
                      <button className="action-btn">
                        <i className="fas fa-external-link-alt"></i>
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;