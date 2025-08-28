// API Service for handling HTTP requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Set auth token in localStorage
  setAuthToken(token) {
    localStorage.setItem('token', token);
  }

  // Remove auth token from localStorage
  removeAuthToken() {
    localStorage.removeItem('token');
  }

  // Get default headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.includeAuth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Upload file
  async upload(endpoint, formData) {
    const token = this.getAuthToken();
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      includeAuth: false, // We're manually adding auth header
    });
  }

  // Authentication methods
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeAuthToken();
    }
  }

  async refreshToken() {
    const response = await this.post('/auth/refresh');
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  async forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token, password) {
    return this.post('/auth/reset-password', { token, password });
  }

  // User methods
  async getCurrentUser() {
    return this.get('/users/me');
  }

  async updateProfile(userData) {
    return this.put('/users/profile', userData);
  }

  async changePassword(passwordData) {
    return this.put('/users/change-password', passwordData);
  }

  // Dashboard methods
  async getDashboardData(timeRange = '7d') {
    return this.get('/analytics/dashboard', { timeRange });
  }

  async getAnalytics(params = {}) {
    return this.get('/analytics', params);
  }

  // Affiliate methods
  async getAffiliateLinks() {
    return this.get('/affiliate/links');
  }

  async createAffiliateLink(linkData) {
    return this.post('/affiliate/links', linkData);
  }

  async getAffiliateStats(params = {}) {
    return this.get('/affiliate/stats', params);
  }

  // E-commerce methods
  async getProducts(params = {}) {
    return this.get('/ecommerce/products', params);
  }

  async createProduct(productData) {
    return this.post('/ecommerce/products', productData);
  }

  async updateProduct(id, productData) {
    return this.put(`/ecommerce/products/${id}`, productData);
  }

  async deleteProduct(id) {
    return this.delete(`/ecommerce/products/${id}`);
  }

  // Payment methods
  async getPayments(params = {}) {
    return this.get('/payments', params);
  }

  async createWithdrawal(withdrawalData) {
    return this.post('/payments/withdraw', withdrawalData);
  }

  async getPaymentMethods() {
    return this.get('/payments/methods');
  }

  async addPaymentMethod(methodData) {
    return this.post('/payments/methods', methodData);
  }

  // Notification methods
  async getNotifications(params = {}) {
    return this.get('/notifications', params);
  }

  async markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.patch('/notifications/read-all');
  }

  async deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  // Settings methods
  async getSettings() {
    return this.get('/users/settings');
  }

  async updateSettings(settings) {
    return this.put('/users/settings', settings);
  }

  // Marketplace methods
  async getMarketplaceItems(params = {}) {
    return this.get('/marketplace', params);
  }

  async createMarketplaceItem(itemData) {
    return this.post('/marketplace', itemData);
  }

  async updateMarketplaceItem(id, itemData) {
    return this.put(`/marketplace/${id}`, itemData);
  }

  async deleteMarketplaceItem(id) {
    return this.delete(`/marketplace/${id}`);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Export the class for testing or custom instances
export { ApiService };