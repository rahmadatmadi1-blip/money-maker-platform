import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useDebounce, useApiCache } from '../hooks/usePerformance';
import { withOptimizations } from '../components/Common/withPerformance';
import PayPalButton from '../components/PayPalButton';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import './Payments.css';

const Payments = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  
  const [paymentData, setPaymentData] = useState({
    balance: {
      available: 0,
      pending: 0,
      total: 0,
      lastUpdated: new Date().toISOString()
    },
    transactions: [],
    withdrawals: [],
    paymentMethods: [],
    earnings: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      allTime: 0
    },
    stats: {
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      successfulTransactions: 0,
      failedTransactions: 0
    }
  });
  
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'paypal',
    email: '',
    accountNumber: '',
    bankName: '',
    accountName: '',
    routingNumber: '',
    swiftCode: ''
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock payment data
      const mockData = {
        balance: {
          available: 2847.50,
          pending: 456.25,
          total: 3303.75,
          lastUpdated: new Date().toISOString()
        },
        transactions: [
          {
            id: 'txn_001',
            type: 'earning',
            amount: 125.00,
            description: 'Affiliate Commission - Tech Gadgets',
            status: 'completed',
            date: '2024-01-15T10:30:00Z',
            reference: 'REF123456'
          },
          {
            id: 'txn_002',
            type: 'withdrawal',
            amount: -500.00,
            description: 'Withdrawal to PayPal',
            status: 'completed',
            date: '2024-01-14T15:45:00Z',
            reference: 'WD789012'
          },
          {
            id: 'txn_003',
            type: 'earning',
            amount: 89.50,
            description: 'E-commerce Sale - Digital Course',
            status: 'completed',
            date: '2024-01-14T09:20:00Z',
            reference: 'REF345678'
          },
          {
            id: 'txn_004',
            type: 'earning',
            amount: 67.25,
            description: 'Content Monetization',
            status: 'pending',
            date: '2024-01-13T14:15:00Z',
            reference: 'REF567890'
          },
          {
            id: 'txn_005',
            type: 'earning',
            amount: 234.75,
            description: 'Service Sale - Consulting',
            status: 'completed',
            date: '2024-01-12T11:30:00Z',
            reference: 'REF234567'
          }
        ],
        withdrawals: [
          {
            id: 'wd_001',
            amount: 500.00,
            method: 'PayPal',
            status: 'completed',
            requestDate: '2024-01-14T10:00:00Z',
            processedDate: '2024-01-14T15:45:00Z',
            reference: 'WD789012'
          },
          {
            id: 'wd_002',
            amount: 750.00,
            method: 'Bank Transfer',
            status: 'processing',
            requestDate: '2024-01-13T16:30:00Z',
            processedDate: null,
            reference: 'WD890123'
          },
          {
            id: 'wd_003',
            amount: 300.00,
            method: 'PayPal',
            status: 'completed',
            requestDate: '2024-01-10T09:15:00Z',
            processedDate: '2024-01-10T14:20:00Z',
            reference: 'WD901234'
          }
        ],
        paymentMethods: [
          {
            id: 'pm_001',
            type: 'paypal',
            email: '****@gmail.com', // Email disembunyikan untuk keamanan
            maskedEmail: 'r****@gmail.com',
            isDefault: true,
            isVerified: true,
            addedDate: '2024-01-01T00:00:00Z'
          },
          {
            id: 'pm_002',
            type: 'bank',
            bankName: 'Chase Bank',
            accountNumber: '****1234',
            accountName: 'John Doe',
            isDefault: false,
            isVerified: true,
            addedDate: '2024-01-05T00:00:00Z'
          }
        ],
        earnings: {
          today: 125.00,
          thisWeek: 456.75,
          thisMonth: 1847.50,
          allTime: 12456.75
        },
        stats: {
          totalWithdrawn: 8950.00,
          pendingWithdrawals: 750.00,
          successfulTransactions: 156,
          failedTransactions: 3
        }
      };
      
      setPaymentData(mockData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      addNotification('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        addNotification('Please enter a valid withdrawal amount', 'error');
        return;
      }
      
      if (parseFloat(withdrawAmount) > paymentData.balance.available) {
        addNotification('Insufficient available balance', 'error');
        return;
      }
      
      if (!selectedPaymentMethod) {
        addNotification('Please select a payment method', 'error');
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update balance and add withdrawal record
      const newWithdrawal = {
        id: `wd_${Date.now()}`,
        amount: parseFloat(withdrawAmount),
        method: selectedPaymentMethod,
        status: 'processing',
        requestDate: new Date().toISOString(),
        processedDate: null,
        reference: `WD${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };
      
      setPaymentData(prev => ({
        ...prev,
        balance: {
          ...prev.balance,
          available: prev.balance.available - parseFloat(withdrawAmount),
          pending: prev.balance.pending + parseFloat(withdrawAmount)
        },
        withdrawals: [newWithdrawal, ...prev.withdrawals],
        stats: {
          ...prev.stats,
          pendingWithdrawals: prev.stats.pendingWithdrawals + parseFloat(withdrawAmount)
        }
      }));
      
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedPaymentMethod('');
      addNotification('Withdrawal request submitted successfully', 'success');
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      addNotification('Failed to process withdrawal', 'error');
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      if (newPaymentMethod.type === 'paypal' && !newPaymentMethod.email) {
        addNotification('Please enter PayPal email', 'error');
        return;
      }
      
      if (newPaymentMethod.type === 'bank' && (!newPaymentMethod.accountNumber || !newPaymentMethod.bankName)) {
        addNotification('Please fill in all bank details', 'error');
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMethod = {
        id: `pm_${Date.now()}`,
        ...newPaymentMethod,
        isDefault: paymentData.paymentMethods.length === 0,
        isVerified: false,
        addedDate: new Date().toISOString()
      };
      
      setPaymentData(prev => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, newMethod]
      }));
      
      setShowPaymentMethodModal(false);
      setNewPaymentMethod({
        type: 'paypal',
        email: '',
        accountNumber: '',
        bankName: '',
        accountName: '',
        routingNumber: '',
        swiftCode: ''
      });
      
      addNotification('Payment method added successfully', 'success');
    } catch (error) {
      console.error('Error adding payment method:', error);
      addNotification('Failed to add payment method', 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle';
      case 'pending':
        return 'fas fa-clock';
      case 'processing':
        return 'fas fa-spinner';
      case 'failed':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-question-circle';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earning':
        return 'fas fa-arrow-down';
      case 'withdrawal':
        return 'fas fa-arrow-up';
      default:
        return 'fas fa-exchange-alt';
    }
  };

  const getTransactionClass = (type) => {
    switch (type) {
      case 'earning':
        return 'earning';
      case 'withdrawal':
        return 'withdrawal';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="payments-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <h3>Loading Payment Data...</h3>
        <p>Fetching your financial information and transaction history.</p>
      </div>
    );
  }

  return (
    <div className="payments-container">
      {/* Payments Header */}
      <div className="payments-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-credit-card"></i>
              Payments & Earnings
            </h1>
            <p>Manage your earnings, withdrawals, and payment methods</p>
          </div>
          
          <div className="header-actions">
            <button 
              className="action-btn primary"
              onClick={() => setShowWithdrawModal(true)}
              disabled={paymentData.balance.available <= 0}
            >
              <i className="fas fa-money-bill-wave"></i>
              Withdraw Funds
            </button>
            
            <button 
              className="action-btn secondary"
              onClick={() => setShowPaymentMethodModal(true)}
            >
              <i className="fas fa-plus"></i>
              Add Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="balance-overview">
        <div className="balance-cards">
          <div className="balance-card main">
            <div className="balance-icon">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="balance-content">
              <h3>Available Balance</h3>
              <div className="balance-amount">{formatCurrency(paymentData.balance.available)}</div>
              <div className="balance-note">Ready for withdrawal</div>
            </div>
          </div>
          
          <div className="balance-card">
            <div className="balance-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="balance-content">
              <h3>Pending Balance</h3>
              <div className="balance-amount">{formatCurrency(paymentData.balance.pending)}</div>
              <div className="balance-note">Processing earnings</div>
            </div>
          </div>
          
          <div className="balance-card">
            <div className="balance-icon total">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="balance-content">
              <h3>Total Balance</h3>
              <div className="balance-amount">{formatCurrency(paymentData.balance.total)}</div>
              <div className="balance-note">Combined balance</div>
            </div>
          </div>
        </div>
        
        <div className="earnings-summary">
          <h4>Earnings Summary</h4>
          <div className="earnings-grid">
            <div className="earning-item">
              <span className="earning-label">Today</span>
              <span className="earning-value">{formatCurrency(paymentData.earnings.today)}</span>
            </div>
            <div className="earning-item">
              <span className="earning-label">This Week</span>
              <span className="earning-value">{formatCurrency(paymentData.earnings.thisWeek)}</span>
            </div>
            <div className="earning-item">
              <span className="earning-label">This Month</span>
              <span className="earning-value">{formatCurrency(paymentData.earnings.thisMonth)}</span>
            </div>
            <div className="earning-item">
              <span className="earning-label">All Time</span>
              <span className="earning-value">{formatCurrency(paymentData.earnings.allTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Navigation */}
      <div className="payments-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Overview</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <i className="fas fa-list"></i>
            <span>Transactions</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            <i className="fas fa-money-bill-wave"></i>
            <span>Withdrawals</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveTab('deposit')}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Deposit</span>
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'methods' ? 'active' : ''}`}
            onClick={() => setActiveTab('methods')}
          >
            <i className="fas fa-credit-card"></i>
            <span>Payment Methods</span>
          </button>
        </div>
      </div>

      {/* Payments Content */}
      <div className="payments-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon withdrawn">
                  <i className="fas fa-arrow-up"></i>
                </div>
                <div className="stat-content">
                  <h4>Total Withdrawn</h4>
                  <div className="stat-value">{formatCurrency(paymentData.stats.totalWithdrawn)}</div>
                  <div className="stat-note">Lifetime withdrawals</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon pending">
                  <i className="fas fa-hourglass-half"></i>
                </div>
                <div className="stat-content">
                  <h4>Pending Withdrawals</h4>
                  <div className="stat-value">{formatCurrency(paymentData.stats.pendingWithdrawals)}</div>
                  <div className="stat-note">Being processed</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon success">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-content">
                  <h4>Successful Transactions</h4>
                  <div className="stat-value">{paymentData.stats.successfulTransactions}</div>
                  <div className="stat-note">Completed transactions</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon failed">
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="stat-content">
                  <h4>Failed Transactions</h4>
                  <div className="stat-value">{paymentData.stats.failedTransactions}</div>
                  <div className="stat-note">Requires attention</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <div className="section-header">
                <h3>Recent Activity</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setActiveTab('transactions')}
                >
                  View All
                </button>
              </div>
              
              <div className="activity-list">
                {paymentData.transactions.slice(0, 5).map(transaction => (
                  <div key={transaction.id} className="activity-item">
                    <div className={`activity-icon ${getTransactionClass(transaction.type)}`}>
                      <i className={getTransactionIcon(transaction.type)}></i>
                    </div>
                    <div className="activity-content">
                      <h5>{transaction.description}</h5>
                      <div className="activity-meta">
                        <span className="activity-date">{formatDate(transaction.date)}</span>
                        <span className="activity-reference">Ref: {transaction.reference}</span>
                      </div>
                    </div>
                    <div className="activity-amount">
                      <span className={`amount ${getTransactionClass(transaction.type)}`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                      </span>
                      <div className={`activity-status ${getStatusClass(transaction.status)}`}>
                        <i className={getStatusIcon(transaction.status)}></i>
                        <span>{transaction.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-section">
            <div className="section-header">
              <h3>Transaction History</h3>
              <div className="filters">
                <select className="filter-select">
                  <option value="all">All Transactions</option>
                  <option value="earning">Earnings Only</option>
                  <option value="withdrawal">Withdrawals Only</option>
                </select>
                <select className="filter-select">
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>
            
            <div className="transactions-table">
              <div className="table-header">
                <div className="header-cell">Transaction</div>
                <div className="header-cell">Amount</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Date</div>
                <div className="header-cell">Reference</div>
              </div>
              
              {paymentData.transactions.map(transaction => (
                <div key={transaction.id} className="table-row">
                  <div className="table-cell">
                    <div className="transaction-info">
                      <div className={`transaction-icon ${getTransactionClass(transaction.type)}`}>
                        <i className={getTransactionIcon(transaction.type)}></i>
                      </div>
                      <div className="transaction-details">
                        <h5>{transaction.description}</h5>
                        <span className="transaction-type">{transaction.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="table-cell">
                    <span className={`amount ${getTransactionClass(transaction.type)}`}>
                      {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  
                  <div className="table-cell">
                    <div className={`status-badge ${getStatusClass(transaction.status)}`}>
                      <i className={getStatusIcon(transaction.status)}></i>
                      <span>{transaction.status}</span>
                    </div>
                  </div>
                  
                  <div className="table-cell">
                    <span className="date">{formatDate(transaction.date)}</span>
                  </div>
                  
                  <div className="table-cell">
                    <span className="reference">{transaction.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="withdrawals-section">
            <div className="section-header">
              <h3>Withdrawal History</h3>
              <button 
                className="action-btn primary"
                onClick={() => setShowWithdrawModal(true)}
                disabled={paymentData.balance.available <= 0}
              >
                <i className="fas fa-plus"></i>
                New Withdrawal
              </button>
            </div>
            
            <div className="withdrawals-grid">
              {paymentData.withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="withdrawal-card">
                  <div className="withdrawal-header">
                    <div className="withdrawal-amount">
                      {formatCurrency(withdrawal.amount)}
                    </div>
                    <div className={`withdrawal-status ${getStatusClass(withdrawal.status)}`}>
                      <i className={getStatusIcon(withdrawal.status)}></i>
                      <span>{withdrawal.status}</span>
                    </div>
                  </div>
                  
                  <div className="withdrawal-details">
                    <div className="detail-item">
                      <span className="detail-label">Method:</span>
                      <span className="detail-value">{withdrawal.method}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Requested:</span>
                      <span className="detail-value">{formatDate(withdrawal.requestDate)}</span>
                    </div>
                    {withdrawal.processedDate && (
                      <div className="detail-item">
                        <span className="detail-label">Processed:</span>
                        <span className="detail-value">{formatDate(withdrawal.processedDate)}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="detail-label">Reference:</span>
                      <span className="detail-value">{withdrawal.reference}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="deposit-section">
            <div className="section-header">
              <h3>Add Funds</h3>
              <p className="section-description">Choose your preferred payment method to add funds</p>
            </div>
            
            <div className="deposit-content">
              <div className="deposit-form">
                <div className="form-group">
                  <label>Deposit Amount</label>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">Rp</span>
                    <input
                     type="number"
                     min="50000"
                     max="50000000"
                     step="1000"
                     placeholder="0"
                     className="amount-input"
                     value={depositAmount}
                     onChange={(e) => setDepositAmount(e.target.value)}
                   />
                  </div>
                  <div className="amount-suggestions">
                     <button type="button" onClick={() => setDepositAmount('50000')}>Rp 50K</button>
                     <button type="button" onClick={() => setDepositAmount('100000')}>Rp 100K</button>
                     <button type="button" onClick={() => setDepositAmount('250000')}>Rp 250K</button>
                     <button type="button" onClick={() => setDepositAmount('500000')}>Rp 500K</button>
                     <button type="button" onClick={() => setDepositAmount('1000000')}>Rp 1M</button>
                   </div>
                </div>
                
                {depositAmount && parseFloat(depositAmount) >= 50000 && (
                  <PaymentMethodSelector
                    amount={parseFloat(depositAmount)}
                    onPaymentSuccess={(data) => {
                      console.log('Payment successful:', data);
                      addNotification(`Pembayaran berhasil! Dana ${data.method === 'paypal' ? 'akan segera tersedia' : 'sedang diverifikasi'}.`, 'success');
                      setDepositAmount('');
                      fetchPaymentData();
                    }}
                    onPaymentError={(error) => {
                      console.error('Payment failed:', error);
                      addNotification('Pembayaran gagal. Silakan coba lagi.', 'error');
                    }}
                  />
                )}
                
                <div className="deposit-info">
                  <div className="info-item">
                    <i className="fas fa-info-circle"></i>
                    <span>Minimum deposit: Rp 50.000</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>PayPal: Instant | Transfer: 1-24 jam verifikasi</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-shield-alt"></i>
                    <span>Semua metode pembayaran aman dan terenkripsi</span>
                  </div>
                </div>
              </div>
              
              <div className="deposit-benefits">
                <h4>Why Add Funds?</h4>
                <ul>
                  <li><i className="fas fa-check"></i> Instant access to premium features</li>
                  <li><i className="fas fa-check"></i> Higher earning potential</li>
                  <li><i className="fas fa-check"></i> Priority customer support</li>
                  <li><i className="fas fa-check"></i> Advanced analytics and tools</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'methods' && (
          <div className="methods-section">
            <div className="section-header">
              <h3>Payment Methods</h3>
              <button 
                className="action-btn primary"
                onClick={() => setShowPaymentMethodModal(true)}
              >
                <i className="fas fa-plus"></i>
                Add Method
              </button>
            </div>
            
            <div className="methods-grid">
              {paymentData.paymentMethods.map(method => (
                <div key={method.id} className="method-card">
                  <div className="method-header">
                    <div className="method-icon">
                      <i className={method.type === 'paypal' ? 'fab fa-paypal' : 'fas fa-university'}></i>
                    </div>
                    <div className="method-info">
                      <h4>{method.type === 'paypal' ? 'PayPal' : 'Bank Account'}</h4>
                      <p>{method.type === 'paypal' ? (method.maskedEmail || method.email) : `${method.bankName} - ${method.accountNumber}`}</p>
                    </div>
                    <div className="method-badges">
                      {method.isDefault && (
                        <span className="badge default">Default</span>
                      )}
                      {method.isVerified ? (
                        <span className="badge verified">Verified</span>
                      ) : (
                        <span className="badge unverified">Unverified</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="method-actions">
                    {!method.isDefault && (
                      <button className="method-btn secondary">
                        Set as Default
                      </button>
                    )}
                    {!method.isVerified && (
                      <button className="method-btn primary">
                        Verify
                      </button>
                    )}
                    <button className="method-btn danger">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              
              {paymentData.paymentMethods.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-credit-card"></i>
                  </div>
                  <h4>No Payment Methods</h4>
                  <p>Add a payment method to start receiving withdrawals</p>
                  <button 
                    className="action-btn primary"
                    onClick={() => setShowPaymentMethodModal(true)}
                  >
                    Add Payment Method
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdraw Funds</h3>
              <button 
                className="modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="balance-info">
                <div className="info-item">
                  <span className="info-label">Available Balance:</span>
                  <span className="info-value">{formatCurrency(paymentData.balance.available)}</span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Withdrawal Amount</label>
                <div className="amount-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    max={paymentData.balance.available}
                    step="0.01"
                  />
                </div>
                <div className="quick-amounts">
                  <button 
                    className="quick-amount"
                    onClick={() => setWithdrawAmount((paymentData.balance.available * 0.25).toFixed(2))}
                  >
                    25%
                  </button>
                  <button 
                    className="quick-amount"
                    onClick={() => setWithdrawAmount((paymentData.balance.available * 0.5).toFixed(2))}
                  >
                    50%
                  </button>
                  <button 
                    className="quick-amount"
                    onClick={() => setWithdrawAmount((paymentData.balance.available * 0.75).toFixed(2))}
                  >
                    75%
                  </button>
                  <button 
                    className="quick-amount"
                    onClick={() => setWithdrawAmount(paymentData.balance.available.toFixed(2))}
                  >
                    All
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                >
                  <option value="">Select payment method</option>
                  {paymentData.paymentMethods.filter(method => method.isVerified).map(method => (
                    <option key={method.id} value={method.type === 'paypal' ? 'PayPal' : 'Bank Transfer'}>
                      {method.type === 'paypal' ? `PayPal - ${method.maskedEmail || method.email}` : `${method.bankName} - ${method.accountNumber}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="withdrawal-note">
                <i className="fas fa-info-circle"></i>
                <p>Withdrawals typically take 1-3 business days to process. You'll receive an email confirmation once your withdrawal is complete.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn secondary"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn primary"
                onClick={handleWithdraw}
                disabled={!withdrawAmount || !selectedPaymentMethod}
              >
                <i className="fas fa-money-bill-wave"></i>
                Withdraw {withdrawAmount && formatCurrency(parseFloat(withdrawAmount))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentMethodModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentMethodModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Payment Method</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPaymentMethodModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="method-type-selector">
                <button 
                  className={`type-btn ${newPaymentMethod.type === 'paypal' ? 'active' : ''}`}
                  onClick={() => setNewPaymentMethod(prev => ({ ...prev, type: 'paypal' }))}
                >
                  <i className="fab fa-paypal"></i>
                  <span>PayPal</span>
                </button>
                <button 
                  className={`type-btn ${newPaymentMethod.type === 'bank' ? 'active' : ''}`}
                  onClick={() => setNewPaymentMethod(prev => ({ ...prev, type: 'bank' }))}
                >
                  <i className="fas fa-university"></i>
                  <span>Bank Account</span>
                </button>
              </div>
              
              {newPaymentMethod.type === 'paypal' ? (
                <div className="form-group">
                  <label>PayPal Email</label>
                  <input
                    type="email"
                    value={newPaymentMethod.email}
                    onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your-email@example.com"
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={newPaymentMethod.bankName}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="Chase Bank"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Account Name</label>
                    <input
                      type="text"
                      value={newPaymentMethod.accountName}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={newPaymentMethod.accountNumber}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="1234567890"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Routing Number</label>
                    <input
                      type="text"
                      value={newPaymentMethod.routingNumber}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, routingNumber: e.target.value }))}
                      placeholder="021000021"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn secondary"
                onClick={() => setShowPaymentMethodModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn primary"
                onClick={handleAddPaymentMethod}
              >
                <i className="fas fa-plus"></i>
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize the Payments component to prevent unnecessary re-renders
const MemoizedPayments = React.memo(Payments);

// Apply performance optimizations
export default withOptimizations(MemoizedPayments);