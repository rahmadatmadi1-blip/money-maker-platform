import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './ECommerce.css';

const ECommerce = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [storeData, setStoreData] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    conversionRate: 0,
    revenue: 0
  });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    inventory: '',
    images: []
  });
  const [showProductForm, setShowProductForm] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      
      // Fetch store statistics
      const statsResponse = await fetch('/api/ecommerce/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const statsData = await statsResponse.json();
      setStoreData(statsData);
      
      // Fetch products
      const productsResponse = await fetch('/api/ecommerce/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const productsData = await productsResponse.json();
      setProducts(productsData.products || []);
      
      // Fetch orders
      const ordersResponse = await fetch('/api/ecommerce/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const ordersData = await ordersResponse.json();
      setOrders(ordersData.orders || []);
      
    } catch (error) {
      console.error('Error fetching store data:', error);
      addNotification('Error loading store data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/ecommerce/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newProduct)
      });
      
      if (response.ok) {
        addNotification('Product created successfully!', 'success');
        setNewProduct({
          name: '',
          description: '',
          price: '',
          category: '',
          inventory: '',
          images: []
        });
        setShowProductForm(false);
        fetchStoreData();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      addNotification('Error creating product', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/ecommerce/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        addNotification('Order status updated successfully!', 'success');
        fetchStoreData();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      addNotification('Error updating order status', 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/ecommerce/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          addNotification('Product deleted successfully!', 'success');
          fetchStoreData();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        addNotification('Error deleting product', 'error');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'shipped': return '#6f42c1';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="ecommerce-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading store data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ecommerce-page">
      <div className="ecommerce-header">
        <h1>E-Commerce Store</h1>
        <p>Manage your online store and track sales performance</p>
      </div>

      <div className="ecommerce-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button 
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="ecommerce-body">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon revenue-icon">💰</div>
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <div className="stat-value">${storeData.revenue?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon sales-icon">📊</div>
                <div className="stat-info">
                  <h3>Total Sales</h3>
                  <div className="stat-value">{storeData.totalSales}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon orders-icon">📦</div>
                <div className="stat-info">
                  <h3>Total Orders</h3>
                  <div className="stat-value">{storeData.totalOrders}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon products-icon">🛍️</div>
                <div className="stat-info">
                  <h3>Products</h3>
                  <div className="stat-value">{storeData.totalProducts}</div>
                </div>
              </div>
            </div>
            
            <div className="recent-activity">
              <h3>Recent Orders</h3>
              <div className="orders-list">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="order-item">
                    <div className="order-info">
                      <div className="order-id">#{order.id}</div>
                      <div className="order-customer">{order.customerName}</div>
                      <div className="order-date">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="order-amount">${order.total?.toFixed(2)}</div>
                    <div 
                      className="order-status"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button 
                  className="action-card"
                  onClick={() => {
                    setActiveTab('products');
                    setShowProductForm(true);
                  }}
                >
                  <div className="action-icon">➕</div>
                  <div className="action-text">
                    <h4>Add Product</h4>
                    <p>Create a new product listing</p>
                  </div>
                </button>
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('orders')}
                >
                  <div className="action-icon">📋</div>
                  <div className="action-text">
                    <h4>Manage Orders</h4>
                    <p>Process and track orders</p>
                  </div>
                </button>
                
                <button 
                  className="action-card"
                  onClick={() => setActiveTab('analytics')}
                >
                  <div className="action-icon">📈</div>
                  <div className="action-text">
                    <h4>View Analytics</h4>
                    <p>Track store performance</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="products-header">
              <h3>Product Management</h3>
              <button 
                className="add-product-btn"
                onClick={() => setShowProductForm(!showProductForm)}
              >
                {showProductForm ? 'Cancel' : 'Add New Product'}
              </button>
            </div>
            
            {showProductForm && (
              <div className="product-form-section">
                <h4>Create New Product</h4>
                <form onSubmit={handleCreateProduct} className="product-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="productName">Product Name</label>
                      <input
                        type="text"
                        id="productName"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="productPrice">Price ($)</label>
                      <input
                        type="number"
                        id="productPrice"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="productCategory">Category</label>
                      <select
                        id="productCategory"
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                        required
                      >
                        <option value="">Select category...</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="books">Books</option>
                        <option value="home">Home & Garden</option>
                        <option value="sports">Sports</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="productInventory">Inventory</label>
                      <input
                        type="number"
                        id="productInventory"
                        value={newProduct.inventory}
                        onChange={(e) => setNewProduct({...newProduct, inventory: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="productDescription">Description</label>
                    <textarea
                      id="productDescription"
                      rows="4"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      required
                    ></textarea>
                  </div>
                  
                  <button type="submit" className="create-product-btn">
                    Create Product
                  </button>
                </form>
              </div>
            )}
            
            <div className="products-grid">
              {products.length === 0 ? (
                <div className="empty-state">
                  <p>No products found. Create your first product!</p>
                </div>
              ) : (
                products.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="placeholder-image">📷</div>
                      )}
                    </div>
                    
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p className="product-description">{product.description}</p>
                      <div className="product-details">
                        <div className="product-price">${product.price}</div>
                        <div className="product-inventory">Stock: {product.inventory}</div>
                        <div className="product-category">{product.category}</div>
                      </div>
                    </div>
                    
                    <div className="product-actions">
                      <button className="edit-btn">Edit</button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-tab">
            <div className="orders-header">
              <h3>Order Management</h3>
              <div className="order-filters">
                <select>
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="orders-table">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders found.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>
                          <div className="customer-info">
                            <div className="customer-name">{order.customerName}</div>
                            <div className="customer-email">{order.customerEmail}</div>
                          </div>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td>{order.items?.length || 0} items</td>
                        <td>${order.total?.toFixed(2)}</td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="status-select"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button className="view-order-btn">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="analytics-header">
              <h3>Store Analytics</h3>
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
                <h4>Top Selling Products</h4>
                <div className="top-products">
                  {products
                    .sort((a, b) => (b.sales || 0) - (a.sales || 0))
                    .slice(0, 5)
                    .map(product => (
                      <div key={product.id} className="top-product-item">
                        <div className="product-name">{product.name}</div>
                        <div className="product-sales">{product.sales || 0} sold</div>
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div className="analytics-card">
                <h4>Revenue Breakdown</h4>
                <div className="revenue-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Product Sales</span>
                    <span className="breakdown-value">${(storeData.revenue * 0.8)?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Shipping</span>
                    <span className="breakdown-value">${(storeData.revenue * 0.1)?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Tax</span>
                    <span className="breakdown-value">${(storeData.revenue * 0.1)?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h4>Order Status Distribution</h4>
                <div className="status-distribution">
                  <div className="status-item">
                    <div className="status-color" style={{ backgroundColor: '#ffc107' }}></div>
                    <span>Pending: {orders.filter(o => o.status === 'pending').length}</span>
                  </div>
                  <div className="status-item">
                    <div className="status-color" style={{ backgroundColor: '#17a2b8' }}></div>
                    <span>Processing: {orders.filter(o => o.status === 'processing').length}</span>
                  </div>
                  <div className="status-item">
                    <div className="status-color" style={{ backgroundColor: '#28a745' }}></div>
                    <span>Delivered: {orders.filter(o => o.status === 'delivered').length}</span>
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

export default ECommerce;