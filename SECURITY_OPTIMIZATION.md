# Panduan Security Optimization & SSL Setup

## 🔒 Implementasi Security Headers dan SSL Configuration

### 1. **Security Headers Implementation**

#### A. Update Express Server dengan Security Middleware
```javascript
// Di server/index.js atau server.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Payment endpoint rate limiting (more strict)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: 'Too many payment requests, please try again later.'
});
app.use('/api/payments', paymentLimiter);

// Data sanitization
app.use(mongoSanitize()); // Against NoSQL query injection
app.use(xss()); // Against XSS attacks
app.use(hpp()); // Against HTTP Parameter Pollution
```

#### B. Install Required Security Packages
```bash
npm install helmet express-rate-limit express-mongo-sanitize xss-clean hpp
```

### 2. **Frontend Security Headers (Vercel)**

#### A. Update vercel.json dengan Security Headers
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/(.*)\\/$",
      "destination": "/$1",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. **Environment Variables Security**

#### A. Secure Environment Variables Management
```bash
# Railway Environment Variables (Backend)
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
EMAIL_PASS=your-secure-app-password

# Vercel Environment Variables (Frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_ENVIRONMENT=production
```

#### B. Environment Variables Validation
```javascript
// Di server/config/validateEnv.js
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// JWT Secret validation
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}
```

### 4. **Database Security**

#### A. MongoDB Security Best Practices
```javascript
// Di server/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Security options
      authSource: 'admin',
      ssl: true,
      sslValidate: true,
      // Connection pool settings
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};
```

#### B. User Input Validation
```javascript
// Di server/middleware/validation.js
const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number and special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must be 2-50 characters and contain only letters')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};
```

### 5. **Payment Security**

#### A. Stripe Webhook Security
```javascript
// Di server/routes/payments.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Webhook endpoint dengan signature verification
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      // Handle failed payment
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

#### B. Payment Amount Validation
```javascript
// Minimum payment validation
const validatePaymentAmount = (req, res, next) => {
  const { amount } = req.body;
  
  if (!amount || amount < 50) { // $0.50 minimum
    return res.status(400).json({
      success: false,
      message: 'Minimum payment amount is $0.50'
    });
  }
  
  if (amount > 100000) { // $1000 maximum per transaction
    return res.status(400).json({
      success: false,
      message: 'Maximum payment amount is $1000 per transaction'
    });
  }
  
  next();
};
```

### 6. **Authentication Security**

#### A. JWT Security Enhancement
```javascript
// Di server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    
    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return res.status(401).json({ message: 'User recently changed password. Please log in again' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
```

### 7. **Logging & Monitoring**

#### A. Security Event Logging
```javascript
// Di server/middleware/securityLogger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console()
  ]
});

const logSecurityEvent = (eventType, req, additionalInfo = {}) => {
  securityLogger.info({
    eventType,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    ...additionalInfo
  });
};

module.exports = { logSecurityEvent };
```

### 8. **SSL/TLS Configuration**

#### A. HTTPS Enforcement
```javascript
// Di server/middleware/httpsRedirect.js
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};

module.exports = enforceHTTPS;
```

---

## 🚀 Implementation Commands

```bash
# 1. Install security packages
npm install helmet express-rate-limit express-mongo-sanitize xss-clean hpp express-validator winston

# 2. Update server configuration
git add server/
git commit -m "feat: implement comprehensive security headers and middleware"

# 3. Update vercel.json
git add vercel.json
git commit -m "feat: add security headers to Vercel configuration"

# 4. Push changes
git push origin main
```

## 🔍 Security Testing

```bash
# Test security headers
curl -I https://your-domain.com

# Test rate limiting
for i in {1..20}; do curl https://your-domain.com/api/auth/login; done

# SSL/TLS test
ssllabs.com/ssltest/ # Test your domain
```

---

**⚠️ Security Checklist**:
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Input validation active
- [ ] Webhook signature verification
- [ ] HTTPS enforcement
- [ ] Environment variables secured
- [ ] Database connection secured
- [ ] Logging system active
- [ ] SSL certificate valid
- [ ] Security testing completed