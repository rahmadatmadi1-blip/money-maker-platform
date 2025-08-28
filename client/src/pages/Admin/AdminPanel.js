import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    pendingPayouts: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Check if user has admin privileges
    if (user?.role !== 'admin') {
      addNotification('Access denied. Admin privileges required.', 'error');
      return;
    }
    
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      // Check if it's a demo token, use demo data
      if (token && token.startsWith('demo-admin-token')) {
        // Demo admin data
        const demoStats = {
          totalUsers: 1247,
          totalRevenue: 15750000,
          activeSubscriptions: 892,
          pendingPayouts: 2350000
        };
        
        const demoUsers = [
          {
            _id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'user',
            isActive: true,
            isPremium: true,
            createdAt: '2024-01-15T10:30:00Z',
            earnings: { total: 250000 }
          },
          {
            _id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'user',
            isActive: true,
            isPremium: false,
            createdAt: '2024-01-20T14:15:00Z',
            earnings: { total: 125000 }
          },
          {
            _id: '3',
            name: 'Demo User',
            email: 'demo@moneymaker.com',
            role: 'user',
            isActive: true,
            isPremium: false,
            createdAt: '2024-01-25T09:45:00Z',
            earnings: { total: 175000 }
          }
        ];
        
        const demoTransactions = [
          {
            _id: '1',
            user: { name: 'John Doe', email: 'john@example.com' },
            amount: 50000,
            type: 'affiliate_commission',
            status: 'completed',
            createdAt: '2024-01-28T16:20:00Z'
          },
          {
            _id: '2',
            user: { name: 'Jane Smith', email: 'jane@example.com' },
            amount: 25000,
            type: 'content_sale',
            status: 'pending',
            createdAt: '2024-01-28T14:10:00Z'
          }
        ];
        
        setStats(demoStats);
        setUsers(demoUsers);
        setTransactions(demoTransactions);
        setLoading(false);
        return;
      }
      
      // Try to fetch from real API
      try {
        // Fetch admin statistics
        const statsResponse = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const statsData = await statsResponse.json();
        setStats(statsData);
        
        // Fetch users
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
        
        // Fetch transactions
        const transactionsResponse = await fetch('/api/admin/transactions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
        
      } catch (apiError) {
        console.log('API not available, using demo data');
        
        // Fallback to demo data if API fails
        const demoStats = {
          totalUsers: 1247,
          totalRevenue: 15750000,
          activeSubscriptions: 892,
          pendingPayouts: 2350000
        };
        
        const demoUsers = [
          {
            _id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'user',
            isActive: true,
            isPremium: true,
            createdAt: '2024-01-15T10:30:00Z',
            earnings: { total: 250000 }
          },
          {
            _id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'user',
            isActive: true,
            isPremium: false,
            createdAt: '2024-01-20T14:15:00Z',
            earnings: { total: 125000 }
          }
        ];
        
        const demoTransactions = [
          {
            _id: '1',
            user: { name: 'John Doe', email: 'john@example.com' },
            amount: 50000,
            type: 'affiliate_commission',
            status: 'completed',
            createdAt: '2024-01-28T16:20:00Z'
          },
          {
            _id: '2',
            user: { name: 'Jane Smith', email: 'jane@example.com' },
            amount: 25000,
            type: 'content_sale',
            status: 'pending',
            createdAt: '2024-01-28T14:10:00Z'
          }
        ];
        
        setStats(demoStats);
        setUsers(demoUsers);
        setTransactions(demoTransactions);
      }
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
      addNotification('Error loading admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addNotification(`User ${action} successfully`, 'success');
        fetchAdminData();
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      addNotification(`Error ${action} user`, 'error');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage users, transactions, and system settings</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="admin-body">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon users-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <div className="stat-value">{stats.totalUsers}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon revenue-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon subscriptions-icon">📊</div>
                <div className="stat-info">
                  <h3>Active Subscriptions</h3>
                  <div className="stat-value">{stats.activeSubscriptions}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon payouts-icon">💳</div>
                <div className="stat-info">
                  <h3>Pending Payouts</h3>
                  <div className="stat-value">${stats.pendingPayouts.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {transactions.slice(0, 5).map(transaction => (
                  <div key={transaction.id} className="activity-item">
                    <div className="activity-info">
                      <span className="activity-user">{transaction.user?.name}</span>
                      <span className="activity-action">{transaction.type}</span>
                      <span className="activity-amount">${transaction.amount}</span>
                    </div>
                    <div className="activity-time">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <h3>User Management</h3>
              <div className="users-stats">
                <span>Total: {users.length} users</span>
              </div>
            </div>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="user-actions">
                          {user.status === 'active' ? (
                            <button 
                              className="action-btn suspend-btn"
                              onClick={() => handleUserAction(user.id, 'suspend')}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button 
                              className="action-btn activate-btn"
                              onClick={() => handleUserAction(user.id, 'activate')}
                            >
                              Activate
                            </button>
                          )}
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleUserAction(user.id, 'delete')}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <div className="transactions-header">
              <h3>Transaction History</h3>
              <div className="transactions-stats">
                <span>Total: {transactions.length} transactions</span>
              </div>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>#{transaction.id.slice(-8)}</td>
                      <td>{transaction.user?.name}</td>
                      <td>
                        <span className={`type-badge ${transaction.type}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>${transaction.amount.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="settings-section">
              <h3>System Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Platform Commission (%)</label>
                  <input type="number" defaultValue="10" min="0" max="100" />
                </div>
                
                <div className="setting-item">
                  <label>Minimum Payout Amount ($)</label>
                  <input type="number" defaultValue="50" min="1" />
                </div>
                
                <div className="setting-item">
                  <label>Auto-approve Affiliates</label>
                  <input type="checkbox" defaultChecked />
                </div>
                
                <div className="setting-item">
                  <label>Maintenance Mode</label>
                  <input type="checkbox" />
                </div>
              </div>
              
              <button className="save-settings-btn">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;