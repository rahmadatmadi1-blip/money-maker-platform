import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Affiliate.css';

const Affiliate = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [affiliateData, setAffiliateData] = useState({
    totalEarnings: 0,
    totalClicks: 0,
    totalConversions: 0,
    conversionRate: 0,
    pendingCommission: 0
  });
  const [affiliateLinks, setAffiliateLinks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [newLinkForm, setNewLinkForm] = useState({
    productId: '',
    customAlias: '',
    description: ''
  });

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Check if it's a demo token or if API is not available, use demo data
      if (!token || token.startsWith('demo-admin-token') || token.startsWith('demo-user-token')) {
        // Demo affiliate data
        const demoStats = {
          totalEarnings: 1250.75,
          totalClicks: 3847,
          totalConversions: 156,
          conversionRate: 4.05,
          pendingCommission: 325.50
        };
        
        const demoLinks = [
          {
            id: 1,
            alias: 'tech-gadgets-2024',
            originalUrl: 'https://example.com/products/tech',
            affiliateUrl: 'https://yoursite.com/aff/tech-gadgets-2024',
            clicks: 1247,
            conversions: 45,
            earnings: 567.25,
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            alias: 'online-courses',
            originalUrl: 'https://example.com/courses',
            affiliateUrl: 'https://yoursite.com/aff/online-courses',
            clicks: 892,
            conversions: 32,
            earnings: 384.50,
            status: 'active',
            createdAt: '2024-01-15T00:00:00Z'
          }
        ];
        
        const demoPrograms = [
          {
            id: 1,
            name: 'Tech Affiliate Program',
            description: 'Promote the latest tech gadgets and earn up to 15% commission',
            commission: 15,
            category: 'Technology',
            status: 'active'
          },
          {
            id: 2,
            name: 'Online Learning Platform',
            description: 'Earn 25% commission on course sales',
            commission: 25,
            category: 'Education',
            status: 'active'
          }
        ];
        
        setAffiliateData(demoStats);
        setAffiliateLinks(demoLinks);
        setPrograms(demoPrograms);
        setLoading(false);
        return;
      }
      
      // Try to fetch from real API
      try {
        // Fetch affiliate statistics
        const statsResponse = await fetch('/api/affiliate/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const statsData = await statsResponse.json();
        setAffiliateData(statsData);
        
        // Fetch affiliate links
        const linksResponse = await fetch('/api/affiliate/links', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const linksData = await linksResponse.json();
        setAffiliateLinks(linksData.links || []);
        
        // Fetch available programs
        const programsResponse = await fetch('/api/affiliate/programs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const programsData = await programsResponse.json();
        setPrograms(programsData.programs || []);
        
      } catch (apiError) {
        console.log('API not available, using demo data');
        
        // Fallback to demo data if API fails
        const demoStats = {
          totalEarnings: 1250.75,
          totalClicks: 3847,
          totalConversions: 156,
          conversionRate: 4.05,
          pendingCommission: 325.50
        };
        
        const demoLinks = [
          {
            id: 1,
            alias: 'tech-gadgets-2024',
            originalUrl: 'https://example.com/products/tech',
            affiliateUrl: 'https://yoursite.com/aff/tech-gadgets-2024',
            clicks: 1247,
            conversions: 45,
            earnings: 567.25,
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];
        
        const demoPrograms = [
          {
            id: 1,
            name: 'Tech Affiliate Program',
            description: 'Promote the latest tech gadgets and earn up to 15% commission',
            commission: 15,
            category: 'Technology',
            status: 'active'
          }
        ];
        
        setAffiliateData(demoStats);
        setAffiliateLinks(demoLinks);
        setPrograms(demoPrograms);
      }
      
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      addNotification('Error loading affiliate data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/affiliate/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newLinkForm)
      });
      
      if (response.ok) {
        addNotification('Affiliate link created successfully!', 'success');
        setNewLinkForm({ productId: '', customAlias: '', description: '' });
        fetchAffiliateData();
      }
    } catch (error) {
      console.error('Error creating affiliate link:', error);
      addNotification('Error creating affiliate link', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addNotification('Link copied to clipboard!', 'success');
  };

  const handleJoinProgram = async (programId) => {
    try {
      const response = await fetch(`/api/affiliate/programs/${programId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addNotification('Successfully joined affiliate program!', 'success');
        fetchAffiliateData();
      }
    } catch (error) {
      console.error('Error joining program:', error);
      addNotification('Error joining program', 'error');
    }
  };

  if (loading) {
    return (
      <div className="affiliate-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="affiliate-page">
      <div className="affiliate-header">
        <h1>Affiliate Marketing</h1>
        <p>Earn commissions by promoting products and services</p>
      </div>

      <div className="affiliate-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          My Links
        </button>
        <button 
          className={`tab ${activeTab === 'programs' ? 'active' : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          Programs
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="affiliate-body">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon earnings-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Earnings</h3>
                  <div className="stat-value">${affiliateData.totalEarnings.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon clicks-icon">👆</div>
                <div className="stat-info">
                  <h3>Total Clicks</h3>
                  <div className="stat-value">{affiliateData.totalClicks}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon conversions-icon">🎯</div>
                <div className="stat-info">
                  <h3>Conversions</h3>
                  <div className="stat-value">{affiliateData.totalConversions}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon rate-icon">📊</div>
                <div className="stat-info">
                  <h3>Conversion Rate</h3>
                  <div className="stat-value">{affiliateData.conversionRate.toFixed(2)}%</div>
                </div>
              </div>
            </div>
            
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('links')}
                >
                  <div className="action-icon">🔗</div>
                  <div className="action-text">
                    <h4>Create New Link</h4>
                    <p>Generate affiliate links for products</p>
                  </div>
                </button>
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('programs')}
                >
                  <div className="action-icon">📋</div>
                  <div className="action-text">
                    <h4>Browse Programs</h4>
                    <p>Find new affiliate opportunities</p>
                  </div>
                </button>
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('analytics')}
                >
                  <div className="action-icon">📈</div>
                  <div className="action-text">
                    <h4>View Analytics</h4>
                    <p>Track your performance</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="links-tab">
            <div className="create-link-section">
              <h3>Create New Affiliate Link</h3>
              <form onSubmit={handleCreateLink} className="link-form">
                <div className="form-group">
                  <label htmlFor="productId">Product/Service</label>
                  <select
                    id="productId"
                    value={newLinkForm.productId}
                    onChange={(e) => setNewLinkForm({...newLinkForm, productId: e.target.value})}
                    required
                  >
                    <option value="">Select a product...</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.name} - {program.commission}% commission
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="customAlias">Custom Alias (optional)</label>
                  <input
                    type="text"
                    id="customAlias"
                    value={newLinkForm.customAlias}
                    onChange={(e) => setNewLinkForm({...newLinkForm, customAlias: e.target.value})}
                    placeholder="my-special-offer"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <input
                    type="text"
                    id="description"
                    value={newLinkForm.description}
                    onChange={(e) => setNewLinkForm({...newLinkForm, description: e.target.value})}
                    placeholder="Describe this affiliate link..."
                  />
                </div>
                
                <button type="submit" className="create-btn">
                  Create Affiliate Link
                </button>
              </form>
            </div>
            
            <div className="links-list">
              <h3>Your Affiliate Links</h3>
              {affiliateLinks.length === 0 ? (
                <div className="empty-state">
                  <p>No affiliate links created yet. Create your first link above!</p>
                </div>
              ) : (
                <div className="links-grid">
                  {affiliateLinks.map(link => (
                    <div key={link.id} className="link-card">
                      <div className="link-info">
                        <h4>{link.description || link.product?.name}</h4>
                        <p className="link-url">{link.shortUrl}</p>
                        <div className="link-stats">
                          <span>Clicks: {link.clicks}</span>
                          <span>Conversions: {link.conversions}</span>
                          <span>Earnings: ${link.earnings?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <div className="link-actions">
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(link.shortUrl)}
                        >
                          Copy Link
                        </button>
                        <button className="edit-btn">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="programs-tab">
            <div className="programs-header">
              <h3>Available Affiliate Programs</h3>
              <p>Join programs to start earning commissions</p>
            </div>
            
            <div className="programs-grid">
              {programs.map(program => (
                <div key={program.id} className="program-card">
                  <div className="program-header">
                    <h4>{program.name}</h4>
                    <div className="commission-badge">
                      {program.commission}% Commission
                    </div>
                  </div>
                  
                  <div className="program-info">
                    <p>{program.description}</p>
                    <div className="program-stats">
                      <div className="stat">
                        <span className="label">Cookie Duration:</span>
                        <span className="value">{program.cookieDuration} days</span>
                      </div>
                      <div className="stat">
                        <span className="label">Avg. Order Value:</span>
                        <span className="value">${program.avgOrderValue}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Conversion Rate:</span>
                        <span className="value">{program.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="program-actions">
                    {program.isJoined ? (
                      <button className="joined-btn" disabled>
                        ✓ Joined
                      </button>
                    ) : (
                      <button 
                        className="join-btn"
                        onClick={() => handleJoinProgram(program.id)}
                      >
                        Join Program
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="analytics-header">
              <h3>Performance Analytics</h3>
              <div className="date-filter">
                <select>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Top Performing Links</h4>
                <div className="top-links">
                  {affiliateLinks
                    .sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
                    .slice(0, 5)
                    .map(link => (
                      <div key={link.id} className="top-link-item">
                        <div className="link-name">{link.description || 'Untitled Link'}</div>
                        <div className="link-earnings">${link.earnings?.toFixed(2) || '0.00'}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div className="analytics-card">
                <h4>Conversion Funnel</h4>
                <div className="funnel">
                  <div className="funnel-step">
                    <span className="step-label">Clicks</span>
                    <span className="step-value">{affiliateData.totalClicks}</span>
                  </div>
                  <div className="funnel-step">
                    <span className="step-label">Conversions</span>
                    <span className="step-value">{affiliateData.totalConversions}</span>
                  </div>
                  <div className="funnel-step">
                    <span className="step-label">Earnings</span>
                    <span className="step-value">${affiliateData.totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Affiliate;