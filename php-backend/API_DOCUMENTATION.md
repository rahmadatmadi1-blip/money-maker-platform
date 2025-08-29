# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
All protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data
  "errors": {} // Validation errors (if any)
}
```

## Authentication Endpoints

### Register
```
POST /auth/register
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Profile
```
GET /auth/profile
```
**Headers:** `Authorization: Bearer <token>`

### Update Profile
```
PUT /auth/profile
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com"
}
```

### Change Password
```
PUT /auth/change-password
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword",
  "new_password_confirmation": "newpassword"
}
```

### Refresh Token
```
POST /auth/refresh
```
**Headers:** `Authorization: Bearer <token>`

### Logout
```
POST /auth/logout
```
**Headers:** `Authorization: Bearer <token>`

## Payment Endpoints

### Get Payment Methods
```
GET /payments/methods
```
**Headers:** `Authorization: Bearer <token>`

### Get User Payments
```
GET /payments
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `type`: order|service|content
- `status`: pending|completed|failed|cancelled
- `method`: stripe|paypal|bank_transfer|ewallet
- `limit`: number (default: 20)
- `offset`: number (default: 0)

### Get Payment Details
```
GET /payments/{id}
```
**Headers:** `Authorization: Bearer <token>`

### Process Order Payment
```
POST /payments/order
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "order_id": 1,
  "payment_method": "stripe",
  "amount": 100.00,
  "currency": "USD",
  "payment_details": {
    "card_token": "tok_visa" // for Stripe
  }
}
```

### Process Service Payment
```
POST /payments/service
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "service_order_id": 1,
  "payment_method": "paypal",
  "amount": 50.00,
  "currency": "USD"
}
```

### Process Content Payment
```
POST /payments/content
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "content_purchase_id": 1,
  "payment_method": "stripe",
  "amount": 25.00,
  "currency": "USD"
}
```

### Confirm Manual Payment
```
POST /payments/{id}/confirm
```
**Headers:** `Authorization: Bearer <token>`
**Body (multipart/form-data):**
- `proof_image`: file (required)
- `notes`: string (optional)

### Payment Statistics
```
GET /payments/statistics
```
**Headers:** `Authorization: Bearer <token>`

## Notification Endpoints

### Get Notifications
```
GET /notifications
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `type`: payment_success|payment_failed|order_status|etc.
- `is_read`: true|false
- `limit`: number (default: 20)
- `offset`: number (default: 0)

### Get Notification Details
```
GET /notifications/{id}
```
**Headers:** `Authorization: Bearer <token>`

### Mark Notification as Read
```
PUT /notifications/{id}/read
```
**Headers:** `Authorization: Bearer <token>`

### Mark All Notifications as Read
```
PUT /notifications/mark-all-read
```
**Headers:** `Authorization: Bearer <token>`

### Delete Notification
```
DELETE /notifications/{id}
```
**Headers:** `Authorization: Bearer <token>`

### Get Unread Count
```
GET /notifications/unread-count
```
**Headers:** `Authorization: Bearer <token>`

### Get Notification Settings
```
GET /notifications/settings
```
**Headers:** `Authorization: Bearer <token>`

### Update Notification Settings
```
PUT /notifications/settings
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "email_notifications": true,
  "push_notifications": true,
  "notification_types": ["payment_success", "order_status"]
}
```

## Webhook Endpoints (Public)

### Stripe Webhook
```
POST /webhooks/stripe
```
**Headers:** `Stripe-Signature: <signature>`

### PayPal Webhook
```
POST /webhooks/paypal
```
**Headers:** `PAYPAL-TRANSMISSION-ID: <id>`

## Error Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Common Error Responses

### Validation Error (422)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

## Frontend Integration Examples

### JavaScript/React Example

```javascript
// API Client Setup
const API_BASE_URL = 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('jwt_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Auth methods
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem('jwt_token', this.token);
    }
    
    return response;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Payment methods
  async getPaymentMethods() {
    return this.request('/payments/methods');
  }

  async processPayment(paymentData) {
    return this.request('/payments/order', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Notification methods
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications?${query}`);
  }

  async markNotificationAsRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }
}

// Usage
const api = new ApiClient();

// Login
api.login('user@example.com', 'password')
  .then(response => {
    console.log('Login successful:', response);
  })
  .catch(error => {
    console.error('Login failed:', error.message);
  });

// Get notifications
api.getNotifications({ limit: 10, is_read: false })
  .then(response => {
    console.log('Notifications:', response.data.notifications);
  });
```

### Environment Variables for Frontend

```env
# .env file for React app
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_PAYPAL_CLIENT_ID=...
```

## Testing

You can test the API endpoints using tools like:
- Postman
- curl
- Insomnia
- Thunder Client (VS Code extension)

### Example curl commands:

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get profile (replace TOKEN with actual JWT token)
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# Get payment methods
curl -X GET http://localhost:8000/api/payments/methods \
  -H "Authorization: Bearer TOKEN"
```