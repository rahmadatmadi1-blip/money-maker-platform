// PayPal Service untuk integrasi pembayaran
class PayPalService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  }

  // Membuat PayPal order
  async createOrder(amount, currency = 'USD', type = 'order', orderId = null) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseURL}/payments/paypal/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          currency,
          type,
          orderId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create PayPal order');
      }

      return data;
    } catch (error) {
      console.error('PayPal create order error:', error);
      throw error;
    }
  }

  // Menangkap PayPal order setelah approval
  async captureOrder(orderID, paymentId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseURL}/payments/paypal/capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderID,
          paymentId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to capture PayPal order');
      }

      return data;
    } catch (error) {
      console.error('PayPal capture order error:', error);
      throw error;
    }
  }

  // Memuat PayPal SDK script
  loadPayPalScript(clientId) {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (window.paypal) {
        resolve(window.paypal);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.async = true;
      
      script.onload = () => {
        if (window.paypal) {
          resolve(window.paypal);
        } else {
          reject(new Error('PayPal SDK failed to load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load PayPal SDK'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Membuat PayPal button dengan konfigurasi yang aman
  createPayPalButton(containerId, options = {}) {
    const {
      amount,
      currency = 'USD',
      type = 'order',
      orderId = null,
      onSuccess = () => {},
      onError = () => {},
      onCancel = () => {}
    } = options;

    return this.loadPayPalScript(process.env.REACT_APP_PAYPAL_CLIENT_ID)
      .then(paypal => {
        return paypal.Buttons({
          createOrder: async (data, actions) => {
            try {
              const orderData = await this.createOrder(amount, currency, type, orderId);
              return orderData.orderId;
            } catch (error) {
              console.error('Error creating PayPal order:', error);
              onError(error);
              throw error;
            }
          },
          
          onApprove: async (data, actions) => {
            try {
              // Capture the order
              const captureData = await this.captureOrder(data.orderID, data.paymentId);
              onSuccess(captureData);
              return captureData;
            } catch (error) {
              console.error('Error capturing PayPal order:', error);
              onError(error);
              throw error;
            }
          },
          
          onCancel: (data) => {
            console.log('PayPal payment cancelled:', data);
            onCancel(data);
          },
          
          onError: (err) => {
            console.error('PayPal button error:', err);
            onError(err);
          },
          
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal'
          }
        }).render(`#${containerId}`);
      })
      .catch(error => {
        console.error('Failed to create PayPal button:', error);
        onError(error);
        throw error;
      });
  }

  // Utility function untuk memformat mata uang
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Utility function untuk menyembunyikan email
  maskEmail(email) {
    if (!email || typeof email !== 'string') return '****@gmail.com';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return '****@gmail.com';
    
    const maskedUsername = username.length > 2 
      ? username.charAt(0) + '****' 
      : '****';
    
    return `${maskedUsername}@${domain}`;
  }

  // Validasi email PayPal
  validatePayPalEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
const paypalService = new PayPalService();
export default paypalService;