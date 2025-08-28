import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Content.css';

const Content = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [contents, setContents] = useState([]);
  const [contentForm, setContentForm] = useState({
    title: '',
    type: 'article',
    content: '',
    tags: '',
    monetization: {
      enabled: false,
      price: 0,
      type: 'one-time'
    }
  });

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);
      // API call to fetch user's content
      const response = await fetch('/api/content', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setContents(data.contents || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
      addNotification('Error loading content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...contentForm,
          tags: contentForm.tags.split(',').map(tag => tag.trim())
        })
      });
      
      if (response.ok) {
        addNotification('Content created successfully!', 'success');
        setContentForm({
          title: '',
          type: 'article',
          content: '',
          tags: '',
          monetization: {
            enabled: false,
            price: 0,
            type: 'one-time'
          }
        });
        fetchContents();
      }
    } catch (error) {
      console.error('Error creating content:', error);
      addNotification('Error creating content', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('monetization.')) {
      const field = name.split('.')[1];
      setContentForm(prev => ({
        ...prev,
        monetization: {
          ...prev.monetization,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setContentForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="content-header">
        <h1>Content Management</h1>
        <p>Create and manage your monetizable content</p>
      </div>

      <div className="content-tabs">
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Content
        </button>
        <button 
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Content
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Content Analytics
        </button>
      </div>

      <div className="content-body">
        {activeTab === 'create' && (
          <div className="create-content">
            <form onSubmit={handleSubmit} className="content-form">
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={contentForm.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Content Type</label>
                <select
                  id="type"
                  name="type"
                  value={contentForm.type}
                  onChange={handleInputChange}
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="course">Course</option>
                  <option value="ebook">E-book</option>
                  <option value="template">Template</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="content">Content</label>
                <textarea
                  id="content"
                  name="content"
                  value={contentForm.content}
                  onChange={handleInputChange}
                  rows="10"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={contentForm.tags}
                  onChange={handleInputChange}
                  placeholder="marketing, business, tutorial"
                />
              </div>

              <div className="monetization-section">
                <h3>Monetization Settings</h3>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="monetization.enabled"
                      checked={contentForm.monetization.enabled}
                      onChange={handleInputChange}
                    />
                    Enable Monetization
                  </label>
                </div>

                {contentForm.monetization.enabled && (
                  <>
                    <div className="form-group">
                      <label htmlFor="price">Price ($)</label>
                      <input
                        type="number"
                        id="price"
                        name="monetization.price"
                        value={contentForm.monetization.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="monetization-type">Monetization Type</label>
                      <select
                        id="monetization-type"
                        name="monetization.type"
                        value={contentForm.monetization.type}
                        onChange={handleInputChange}
                      >
                        <option value="one-time">One-time Purchase</option>
                        <option value="subscription">Subscription</option>
                        <option value="pay-per-view">Pay Per View</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <button type="submit" className="submit-btn">
                Create Content
              </button>
            </form>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="manage-content">
            <div className="content-list">
              {contents.length === 0 ? (
                <div className="empty-state">
                  <p>No content created yet. Start by creating your first content!</p>
                </div>
              ) : (
                contents.map(content => (
                  <div key={content.id} className="content-item">
                    <div className="content-info">
                      <h3>{content.title}</h3>
                      <p className="content-type">{content.type}</p>
                      <p className="content-stats">
                        Views: {content.views || 0} | 
                        Revenue: ${content.revenue || 0}
                      </p>
                    </div>
                    <div className="content-actions">
                      <button className="edit-btn">Edit</button>
                      <button className="delete-btn">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="content-analytics">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Total Content</h3>
                <div className="metric">{contents.length}</div>
              </div>
              <div className="analytics-card">
                <h3>Total Views</h3>
                <div className="metric">
                  {contents.reduce((sum, content) => sum + (content.views || 0), 0)}
                </div>
              </div>
              <div className="analytics-card">
                <h3>Total Revenue</h3>
                <div className="metric">
                  ${contents.reduce((sum, content) => sum + (content.revenue || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="analytics-card">
                <h3>Avg. Revenue per Content</h3>
                <div className="metric">
                  ${contents.length > 0 ? 
                    (contents.reduce((sum, content) => sum + (content.revenue || 0), 0) / contents.length).toFixed(2) : 
                    '0.00'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Content;