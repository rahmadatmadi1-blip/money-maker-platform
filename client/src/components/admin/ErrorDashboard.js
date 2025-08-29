import React, { useState, useEffect } from 'react';
import { useErrorMonitor, useErrorReporting } from '../../utils/errorMonitor';
import './ErrorDashboard.css';

/**
 * Error Dashboard Component
 * Provides comprehensive error monitoring and analytics for administrators
 */
const ErrorDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  const errorMonitor = useErrorMonitor();
  const { reportError, getStats } = useErrorReporting();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/errors/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDashboardData(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      reportError(err, { context: 'ErrorDashboard.fetchDashboardData' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Generate test error
  const generateTestError = async () => {
    try {
      const response = await fetch('/api/errors/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'DASHBOARD_TEST_ERROR',
          message: 'Test error generated from dashboard'
        })
      });
      
      if (response.ok) {
        alert('Test error generated successfully');
        fetchDashboardData(); // Refresh data
      } else {
        throw new Error('Failed to generate test error');
      }
    } catch (err) {
      reportError(err, { context: 'ErrorDashboard.generateTestError' });
    }
  };

  // Clear error statistics
  const clearErrorStats = async () => {
    if (!window.confirm('Are you sure you want to clear all error statistics?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/errors/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        alert('Error statistics cleared successfully');
        fetchDashboardData(); // Refresh data
      } else {
        throw new Error('Failed to clear error statistics');
      }
    } catch (err) {
      reportError(err, { context: 'ErrorDashboard.clearErrorStats' });
    }
  };

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Get status color
  const getStatusColor = (errorRate) => {
    if (errorRate < 1) return '#10b981'; // Green
    if (errorRate < 5) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  if (loading && !dashboardData) {
    return (
      <div className="error-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading error dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-dashboard error">
        <div className="error-message">
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const clientStats = getStats();

  return (
    <div className="error-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>Error Monitoring Dashboard</h2>
        <div className="dashboard-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <button onClick={fetchDashboardData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon">🚨</div>
          <div className="card-content">
            <h3>Total Errors</h3>
            <div className="card-value">{formatNumber(dashboardData?.overview?.totalErrors || 0)}</div>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>24h Errors</h3>
            <div className="card-value">{formatNumber(dashboardData?.overview?.errors24h || 0)}</div>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">⚡</div>
          <div className="card-content">
            <h3>Error Rate</h3>
            <div 
              className="card-value"
              style={{ color: getStatusColor(dashboardData?.overview?.errorRate24h || 0) }}
            >
              {(dashboardData?.overview?.errorRate24h || 0).toFixed(2)}/h
            </div>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <h3>Uptime</h3>
            <div className="card-value">{formatDuration(dashboardData?.overview?.uptime || 0)}</div>
          </div>
        </div>
      </div>

      {/* Client-side Stats */}
      <div className="client-stats-section">
        <h3>Client-side Monitoring</h3>
        <div className="client-stats">
          <div className="stat-item">
            <span className="stat-label">Session ID:</span>
            <span className="stat-value">{clientStats.sessionId}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Client Errors:</span>
            <span className="stat-value">{clientStats.totalErrors}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Queued Errors:</span>
            <span className="stat-value">{clientStats.queuedErrors}</span>
          </div>
        </div>
      </div>

      {/* Top Errors */}
      <div className="top-errors-section">
        <h3>Top Error Types</h3>
        <div className="top-errors-list">
          {dashboardData?.topErrors?.map((error, index) => (
            <div key={error.type} className="error-item">
              <div className="error-rank">#{index + 1}</div>
              <div className="error-details">
                <div className="error-type">{error.type}</div>
                <div className="error-count">{error.count} occurrences</div>
              </div>
              <div className="error-bar">
                <div 
                  className="error-bar-fill"
                  style={{ 
                    width: `${(error.count / dashboardData.topErrors[0].count) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Endpoints */}
      <div className="top-endpoints-section">
        <h3>Top Error Endpoints</h3>
        <div className="top-endpoints-list">
          {dashboardData?.topEndpoints?.map((endpoint, index) => (
            <div key={endpoint.endpoint} className="endpoint-item">
              <div className="endpoint-rank">#{index + 1}</div>
              <div className="endpoint-details">
                <div className="endpoint-path">{endpoint.endpoint}</div>
                <div className="endpoint-count">{endpoint.count} errors</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="recent-errors-section">
        <h3>Recent Errors</h3>
        <div className="recent-errors-list">
          {dashboardData?.recentErrors?.map((error) => (
            <div key={error.errorId} className="recent-error-item">
              <div className="error-timestamp">
                {new Date(error.timestamp).toLocaleString()}
              </div>
              <div className="error-info">
                <div className="error-type-badge">{error.type}</div>
                <div className="error-message">{error.message}</div>
                {error.url && <div className="error-url">{error.url}</div>}
              </div>
              {error.userId && (
                <div className="error-user">User: {error.userId}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="system-health-section">
        <h3>System Health</h3>
        <div className="health-metrics">
          <div className="health-metric">
            <div className="metric-label">Memory Usage</div>
            <div className="metric-value">
              {formatBytes(dashboardData?.systemHealth?.memoryUsage?.heapUsed || 0)} / 
              {formatBytes(dashboardData?.systemHealth?.memoryUsage?.heapTotal || 0)}
            </div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill"
                style={{ 
                  width: `${((dashboardData?.systemHealth?.memoryUsage?.heapUsed || 0) / 
                           (dashboardData?.systemHealth?.memoryUsage?.heapTotal || 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="health-metric">
            <div className="metric-label">Node Version</div>
            <div className="metric-value">{dashboardData?.systemHealth?.nodeVersion}</div>
          </div>
          
          <div className="health-metric">
            <div className="metric-label">Environment</div>
            <div className="metric-value">{dashboardData?.systemHealth?.environment}</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {clientStats.performanceMetrics && Object.keys(clientStats.performanceMetrics).length > 0 && (
        <div className="performance-metrics-section">
          <h3>Performance Metrics</h3>
          <div className="performance-grid">
            {Object.entries(clientStats.performanceMetrics).map(([metric, data]) => (
              <div key={metric} className="performance-metric">
                <div className="metric-name">{metric}</div>
                <div className="metric-value">
                  {typeof data.value === 'number' ? data.value.toFixed(2) : JSON.stringify(data.value)}
                </div>
                <div className="metric-timestamp">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="admin-actions-section">
        <h3>Admin Actions</h3>
        <div className="admin-buttons">
          <button onClick={generateTestError} className="test-error-btn">
            🧪 Generate Test Error
          </button>
          <button onClick={clearErrorStats} className="clear-stats-btn">
            🗑️ Clear Statistics
          </button>
          <button 
            onClick={() => errorMonitor.clearErrors()} 
            className="clear-client-btn"
          >
            🧹 Clear Client Errors
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="last-updated">
          Last updated: {dashboardData?.timestamp ? 
            new Date(dashboardData.timestamp).toLocaleString() : 'Never'
          }
        </div>
        <div className="dashboard-info">
          Monitoring {formatNumber(dashboardData?.overview?.totalErrors || 0)} total errors
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;