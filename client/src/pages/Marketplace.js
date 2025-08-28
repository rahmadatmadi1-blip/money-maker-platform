import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Marketplace.css';

const Marketplace = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [services, setServices] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    rating: '',
    search: ''
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    deliveryTime: '',
    features: [''],
    requirements: '',
    images: []
  });
  const [orderForm, setOrderForm] = useState({
    requirements: '',
    deadline: '',
    budget: ''
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [stats, setStats] = useState({
    totalServices: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    averageRating: 0,
    responseTime: '2 hours'
  });

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockServices = [
        {
          id: 1,
          title: 'Professional Logo Design',
          description: 'I will create a modern, professional logo for your business with unlimited revisions.',
          category: 'Design',
          price: 50,
          deliveryTime: '3 days',
          rating: 4.9,
          reviews: 127,
          seller: {
            name: 'Sarah Johnson',
            avatar: null,
            level: 'Top Rated',
            responseTime: '1 hour'
          },
          images: [],
          features: ['Logo Design', 'Source Files', 'Unlimited Revisions', 'Commercial License'],
          tags: ['logo', 'branding', 'design']
        },
        {
          id: 2,
          title: 'SEO Content Writing',
          description: 'High-quality, SEO-optimized content that ranks and converts visitors into customers.',
          category: 'Writing',
          price: 75,
          deliveryTime: '5 days',
          rating: 4.8,
          reviews: 89,
          seller: {
            name: 'Mike Chen',
            avatar: null,
            level: 'Level 2',
            responseTime: '2 hours'
          },
          images: [],
          features: ['SEO Optimized', 'Keyword Research', 'Meta Descriptions', 'Plagiarism Free'],
          tags: ['seo', 'content', 'writing']
        },
        {
          id: 3,
          title: 'Social Media Management',
          description: 'Complete social media management including content creation, posting, and engagement.',
          category: 'Marketing',
          price: 200,
          deliveryTime: '7 days',
          rating: 4.7,
          reviews: 156,
          seller: {
            name: 'Emma Davis',
            avatar: null,
            level: 'Top Rated',
            responseTime: '30 minutes'
          },
          images: [],
          features: ['Content Creation', 'Daily Posting', 'Engagement', 'Analytics Report'],
          tags: ['social media', 'marketing', 'management']
        }
      ];
      
      const mockCategories = [
        { name: 'Design', count: 1250, icon: 'fas fa-palette' },
        { name: 'Writing', count: 890, icon: 'fas fa-pen' },
        { name: 'Marketing', count: 675, icon: 'fas fa-bullhorn' },
        { name: 'Programming', count: 1100, icon: 'fas fa-code' },
        { name: 'Video', count: 450, icon: 'fas fa-video' },
        { name: 'Music', count: 320, icon: 'fas fa-music' }
      ];
      
      const mockMyServices = user ? [
        {
          id: 101,
          title: 'Web Development Services',
          category: 'Programming',
          price: 150,
          status: 'active',
          orders: 12,
          rating: 4.8,
          earnings: 1800
        }
      ] : [];
      
      const mockOrders = user ? [
        {
          id: 201,
          service: 'Professional Logo Design',
          buyer: 'John Smith',
          status: 'in_progress',
          amount: 50,
          deadline: '2024-01-25',
          createdAt: '2024-01-20'
        },
        {
          id: 202,
          service: 'SEO Content Writing',
          buyer: 'Lisa Wilson',
          status: 'completed',
          amount: 75,
          deadline: '2024-01-18',
          createdAt: '2024-01-15'
        }
      ] : [];
      
      setServices(mockServices);
      setCategories(mockCategories);
      setMyServices(mockMyServices);
      setOrders(mockOrders);
      setStats({
        totalServices: mockMyServices.length,
        activeOrders: mockOrders.filter(o => o.status === 'in_progress').length,
        completedOrders: mockOrders.filter(o => o.status === 'completed').length,
        totalEarnings: mockOrders.reduce((sum, o) => sum + (o.status === 'completed' ? o.amount : 0), 0),
        averageRating: 4.8,
        responseTime: '2 hours'
      });
      
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      addNotification('Failed to load marketplace data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredServices = services.filter(service => {
    if (filters.category && service.category !== filters.category) return false;
    if (filters.search && !service.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.rating && service.rating < parseFloat(filters.rating)) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (max && (service.price < min || service.price > max)) return false;
      if (!max && service.price < min) return false;
    }
    return true;
  });

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedService) {
        // Update existing service
        setMyServices(prev => prev.map(s => 
          s.id === selectedService.id 
            ? { ...s, ...serviceForm, id: selectedService.id }
            : s
        ));
        addNotification('Service updated successfully!', 'success');
      } else {
        // Create new service
        const newService = {
          ...serviceForm,
          id: Date.now(),
          status: 'active',
          orders: 0,
          rating: 0,
          earnings: 0
        };
        setMyServices(prev => [...prev, newService]);
        addNotification('Service created successfully!', 'success');
      }
      
      setShowServiceModal(false);
      setSelectedService(null);
      setServiceForm({
        title: '',
        description: '',
        category: '',
        price: '',
        deliveryTime: '',
        features: [''],
        requirements: '',
        images: []
      });
    } catch (error) {
      console.error('Error saving service:', error);
      addNotification('Failed to save service', 'error');
    }
  };

  const handleOrderService = async (service) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newOrder = {
        id: Date.now(),
        service: service.title,
        seller: service.seller.name,
        status: 'pending',
        amount: service.price,
        deadline: orderForm.deadline,
        requirements: orderForm.requirements,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      // In a real app, this would be sent to the backend
      addNotification(`Order placed for "${service.title}"!`, 'success');
      setShowOrderModal(false);
      setSelectedService(null);
      setOrderForm({ requirements: '', deadline: '', budget: '' });
    } catch (error) {
      console.error('Error placing order:', error);
      addNotification('Failed to place order', 'error');
    }
  };

  const addFeature = () => {
    setServiceForm(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index) => {
    setServiceForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index, value) => {
    setServiceForm(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  if (loading) {
    return (
      <div className="marketplace-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <h3>Loading Marketplace...</h3>
        <p>Please wait while we fetch the latest services and opportunities.</p>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      {/* Marketplace Header */}
      <div className="marketplace-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-store"></i>
              Digital Services Marketplace
            </h1>
            <p>Discover talented freelancers and grow your business with professional services</p>
          </div>
          
          {user && (
            <div className="header-stats">
              <div className="stat">
                <span className="stat-value">{stats.totalServices}</span>
                <span className="stat-label">My Services</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.activeOrders}</span>
                <span className="stat-label">Active Orders</span>
              </div>
              <div className="stat">
                <span className="stat-value">${stats.totalEarnings}</span>
                <span className="stat-label">Total Earnings</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marketplace Navigation */}
      <div className="marketplace-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            <i className="fas fa-search"></i>
            <span>Browse Services</span>
          </button>
          
          {user && (
            <>
              <button 
                className={`nav-tab ${activeTab === 'my-services' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-services')}
              >
                <i className="fas fa-briefcase"></i>
                <span>My Services</span>
              </button>
              
              <button 
                className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <i className="fas fa-clipboard-list"></i>
                <span>Orders</span>
                {stats.activeOrders > 0 && (
                  <span className="tab-badge">{stats.activeOrders}</span>
                )}
              </button>
            </>
          )}
        </div>
        
        {user && activeTab === 'my-services' && (
          <button 
            className="create-service-btn"
            onClick={() => {
              setSelectedService(null);
              setShowServiceModal(true);
            }}
          >
            <i className="fas fa-plus"></i>
            Create Service
          </button>
        )}
      </div>

      {/* Marketplace Content */}
      <div className="marketplace-content">
        {activeTab === 'browse' && (
          <div className="browse-section">
            {/* Categories */}
            <div className="categories-section">
              <h3>Popular Categories</h3>
              <div className="categories-grid">
                {categories.map(category => (
                  <div 
                    key={category.name}
                    className={`category-card ${filters.category === category.name ? 'active' : ''}`}
                    onClick={() => handleFilterChange('category', 
                      filters.category === category.name ? '' : category.name
                    )}
                  >
                    <div className="category-icon">
                      <i className={category.icon}></i>
                    </div>
                    <div className="category-info">
                      <h4>{category.name}</h4>
                      <span>{category.count} services</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
              <div className="filters-row">
                <div className="search-filter">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                
                <select 
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                >
                  <option value="">All Prices</option>
                  <option value="0-25">$0 - $25</option>
                  <option value="25-50">$25 - $50</option>
                  <option value="50-100">$50 - $100</option>
                  <option value="100-200">$100 - $200</option>
                  <option value="200">$200+</option>
                </select>
                
                <select 
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                >
                  <option value="">All Ratings</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                </select>
                
                {(filters.category || filters.search || filters.priceRange || filters.rating) && (
                  <button 
                    className="clear-filters-btn"
                    onClick={() => setFilters({ category: '', priceRange: '', rating: '', search: '' })}
                  >
                    <i className="fas fa-times"></i>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Services Grid */}
            <div className="services-section">
              <div className="section-header">
                <h3>Available Services ({filteredServices.length})</h3>
              </div>
              
              <div className="services-grid">
                {filteredServices.map(service => (
                  <div key={service.id} className="service-card">
                    <div className="service-image">
                      {service.images.length > 0 ? (
                        <img src={service.images[0]} alt={service.title} />
                      ) : (
                        <div className="image-placeholder">
                          <i className="fas fa-image"></i>
                        </div>
                      )}
                      <div className="service-category">{service.category}</div>
                    </div>
                    
                    <div className="service-content">
                      <div className="service-header">
                        <h4>{service.title}</h4>
                        <div className="service-rating">
                          <i className="fas fa-star"></i>
                          <span>{service.rating}</span>
                          <span className="reviews">({service.reviews})</span>
                        </div>
                      </div>
                      
                      <p className="service-description">{service.description}</p>
                      
                      <div className="service-features">
                        {service.features.slice(0, 3).map((feature, index) => (
                          <span key={index} className="feature-tag">{feature}</span>
                        ))}
                        {service.features.length > 3 && (
                          <span className="feature-more">+{service.features.length - 3} more</span>
                        )}
                      </div>
                      
                      <div className="service-seller">
                        <div className="seller-info">
                          <div className="seller-avatar">
                            {service.seller.avatar ? (
                              <img src={service.seller.avatar} alt={service.seller.name} />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <div className="seller-details">
                            <span className="seller-name">{service.seller.name}</span>
                            <span className="seller-level">{service.seller.level}</span>
                          </div>
                        </div>
                        <div className="response-time">
                          <i className="fas fa-clock"></i>
                          {service.seller.responseTime}
                        </div>
                      </div>
                      
                      <div className="service-footer">
                        <div className="service-price">
                          <span className="price-label">Starting at</span>
                          <span className="price-value">${service.price}</span>
                        </div>
                        <div className="service-delivery">
                          <i className="fas fa-truck"></i>
                          {service.deliveryTime}
                        </div>
                      </div>
                      
                      <div className="service-actions">
                        <button 
                          className="order-btn"
                          onClick={() => {
                            setSelectedService(service);
                            setShowOrderModal(true);
                          }}
                        >
                          <i className="fas fa-shopping-cart"></i>
                          Order Now
                        </button>
                        <button className="contact-btn">
                          <i className="fas fa-envelope"></i>
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredServices.length === 0 && (
                <div className="empty-state">
                  <i className="fas fa-search"></i>
                  <h3>No services found</h3>
                  <p>Try adjusting your filters or search terms to find what you're looking for.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-services' && user && (
          <div className="my-services-section">
            <div className="section-header">
              <h3>My Services ({myServices.length})</h3>
              <div className="service-stats">
                <div className="stat">
                  <span className="stat-label">Average Rating</span>
                  <span className="stat-value">
                    <i className="fas fa-star"></i>
                    {stats.averageRating}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Response Time</span>
                  <span className="stat-value">{stats.responseTime}</span>
                </div>
              </div>
            </div>
            
            {myServices.length > 0 ? (
              <div className="my-services-grid">
                {myServices.map(service => (
                  <div key={service.id} className="my-service-card">
                    <div className="service-header">
                      <h4>{service.title}</h4>
                      <div className="service-status">
                        <span className={`status-badge ${service.status}`}>
                          {service.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="service-stats">
                      <div className="stat">
                        <span className="stat-value">{service.orders}</span>
                        <span className="stat-label">Orders</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">
                          <i className="fas fa-star"></i>
                          {service.rating || 'N/A'}
                        </span>
                        <span className="stat-label">Rating</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">${service.earnings}</span>
                        <span className="stat-label">Earnings</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">${service.price}</span>
                        <span className="stat-label">Price</span>
                      </div>
                    </div>
                    
                    <div className="service-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => {
                          setSelectedService(service);
                          setServiceForm({
                            title: service.title,
                            description: service.description || '',
                            category: service.category,
                            price: service.price.toString(),
                            deliveryTime: service.deliveryTime || '',
                            features: service.features || [''],
                            requirements: service.requirements || '',
                            images: service.images || []
                          });
                          setShowServiceModal(true);
                        }}
                      >
                        <i className="fas fa-edit"></i>
                        Edit
                      </button>
                      <button className="analytics-btn">
                        <i className="fas fa-chart-line"></i>
                        Analytics
                      </button>
                      <button className="pause-btn">
                        <i className={`fas ${service.status === 'active' ? 'fa-pause' : 'fa-play'}`}></i>
                        {service.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-briefcase"></i>
                <h3>No services yet</h3>
                <p>Create your first service to start earning money on the marketplace.</p>
                <button 
                  className="create-first-service-btn"
                  onClick={() => setShowServiceModal(true)}
                >
                  <i className="fas fa-plus"></i>
                  Create Your First Service
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && user && (
          <div className="orders-section">
            <div className="section-header">
              <h3>My Orders ({orders.length})</h3>
              <div className="order-filters">
                <select>
                  <option value="">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            {orders.length > 0 ? (
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h4>{order.service}</h4>
                        <p>Order #{order.id}</p>
                      </div>
                      <div className="order-status">
                        <span className={`status-badge ${order.status}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="order-details">
                      <div className="detail">
                        <span className="label">Client:</span>
                        <span className="value">{order.buyer}</span>
                      </div>
                      <div className="detail">
                        <span className="label">Amount:</span>
                        <span className="value">${order.amount}</span>
                      </div>
                      <div className="detail">
                        <span className="label">Deadline:</span>
                        <span className="value">{order.deadline}</span>
                      </div>
                      <div className="detail">
                        <span className="label">Created:</span>
                        <span className="value">{order.createdAt}</span>
                      </div>
                    </div>
                    
                    <div className="order-actions">
                      <button className="view-btn">
                        <i className="fas fa-eye"></i>
                        View Details
                      </button>
                      {order.status === 'in_progress' && (
                        <button className="deliver-btn">
                          <i className="fas fa-upload"></i>
                          Deliver Work
                        </button>
                      )}
                      <button className="message-btn">
                        <i className="fas fa-comment"></i>
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-clipboard-list"></i>
                <h3>No orders yet</h3>
                <p>Your orders will appear here once clients start purchasing your services.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-briefcase"></i>
                {selectedService ? 'Edit Service' : 'Create New Service'}
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowServiceModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form className="service-form" onSubmit={handleServiceSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Title *</label>
                  <input
                    type="text"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="I will create a professional logo design..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your service in detail..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price ($) *</label>
                  <input
                    type="number"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="50"
                    min="5"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Delivery Time *</label>
                  <select
                    value={serviceForm.deliveryTime}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    required
                  >
                    <option value="">Select Delivery Time</option>
                    <option value="1 day">1 day</option>
                    <option value="2 days">2 days</option>
                    <option value="3 days">3 days</option>
                    <option value="5 days">5 days</option>
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Service Features</label>
                <div className="features-list">
                  {serviceForm.features.map((feature, index) => (
                    <div key={index} className="feature-input">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="Feature description"
                      />
                      {serviceForm.features.length > 1 && (
                        <button 
                          type="button"
                          className="remove-feature-btn"
                          onClick={() => removeFeature(index)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    className="add-feature-btn"
                    onClick={addFeature}
                  >
                    <i className="fas fa-plus"></i>
                    Add Feature
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label>Requirements from Buyer</label>
                <textarea
                  value={serviceForm.requirements}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="What information do you need from the buyer to get started?"
                  rows={3}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowServiceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <i className="fas fa-save"></i>
                  {selectedService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && selectedService && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-shopping-cart"></i>
                Order Service
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowOrderModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="order-summary">
              <h4>{selectedService.title}</h4>
              <div className="service-details">
                <div className="detail">
                  <span className="label">Price:</span>
                  <span className="value">${selectedService.price}</span>
                </div>
                <div className="detail">
                  <span className="label">Delivery:</span>
                  <span className="value">{selectedService.deliveryTime}</span>
                </div>
                <div className="detail">
                  <span className="label">Seller:</span>
                  <span className="value">{selectedService.seller.name}</span>
                </div>
              </div>
            </div>
            
            <form className="order-form" onSubmit={(e) => {
              e.preventDefault();
              handleOrderService(selectedService);
            }}>
              <div className="form-group">
                <label>Project Requirements *</label>
                <textarea
                  value={orderForm.requirements}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Describe your project requirements in detail..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Deadline</label>
                  <input
                    type="date"
                    value={orderForm.deadline}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, deadline: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <label>Budget ($)</label>
                  <input
                    type="number"
                    value={orderForm.budget}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder={selectedService.price.toString()}
                    min={selectedService.price}
                  />
                </div>
              </div>
              
              <div className="order-total">
                <div className="total-row">
                  <span className="label">Service Price:</span>
                  <span className="value">${selectedService.price}</span>
                </div>
                <div className="total-row">
                  <span className="label">Platform Fee (5%):</span>
                  <span className="value">${(selectedService.price * 0.05).toFixed(2)}</span>
                </div>
                <div className="total-row total">
                  <span className="label">Total:</span>
                  <span className="value">${(selectedService.price * 1.05).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="order-btn">
                  <i className="fas fa-credit-card"></i>
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;