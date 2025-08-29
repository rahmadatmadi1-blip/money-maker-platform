const errorLogger = require('../utils/errorLogger');
const rateLimit = require('express-rate-limit');

// Rate limiter untuk error reporting
const errorReportingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // maksimal 100 error reports per IP per 15 menit
  message: {
    error: 'Too many error reports from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting untuk admin users
    return req.user && req.user.role === 'admin';
  }
});

// Middleware untuk logging semua requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end untuk capture response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log request dengan informasi lengkap
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`);
    // errorLogger.logInfo('REQUEST', {
    //   method: req.method,
    //   url: req.originalUrl,
    //   statusCode: res.statusCode,
    //   responseTime,
    //   userAgent: req.get('User-Agent'),
    //   ip: req.ip,
    //   userId: req.user ? req.user._id : null,
    //   contentLength: res.get('Content-Length'),
    //   referer: req.get('Referer')
    // });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Middleware untuk menangkap dan log errors
const errorHandler = (err, req, res, next) => {
  // Tentukan status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Tentukan error type berdasarkan error atau status code
  let errorType = 'server_error';
  if (statusCode === 400) errorType = 'validation_error';
  else if (statusCode === 401) errorType = 'authentication_error';
  else if (statusCode === 403) errorType = 'authorization_error';
  else if (statusCode === 404) errorType = 'not_found_error';
  else if (statusCode === 429) errorType = 'rate_limit_error';
  else if (statusCode >= 500) errorType = 'server_error';
  
  // Buat error context
  const errorContext = {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user ? req.user._id : null,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: {
      'content-type': req.get('Content-Type'),
      'accept': req.get('Accept'),
      'referer': req.get('Referer')
    }
  };
  
  // Log error berdasarkan type
  if (errorType === 'authentication_error' || errorType === 'authorization_error') {
    errorLogger.logAuthError(errorType, err, {
      ...errorContext,
      authType: errorType,
      token: req.get('Authorization') ? 'present' : 'missing'
    });
  } else {
    errorLogger.logError(err, errorContext, errorType);
  }
  
  // Tentukan response message
  let message = err.message || 'Internal Server Error';
  
  // Jangan expose internal error details di production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }
  
  // Response error
  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
};

// Middleware untuk menangkap 404 errors
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

// Middleware khusus untuk database errors
const databaseErrorHandler = (operation, collection) => {
  return (err, req, res, next) => {
    if (err) {
      errorLogger.logDatabaseError(operation, err, {
        operation,
        collection,
        method: req.method,
        url: req.originalUrl,
        userId: req.user ? req.user._id : null,
        query: req.query,
        body: req.body
      });
      
      // Transform MongoDB errors
      if (err.code === 11000) {
        err.statusCode = 400;
        err.message = 'Duplicate entry found';
        err.code = 'DUPLICATE_ENTRY';
      } else if (err.name === 'ValidationError') {
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
      } else if (err.name === 'CastError') {
        err.statusCode = 400;
        err.message = 'Invalid ID format';
        err.code = 'INVALID_ID';
      }
    }
    next(err);
  };
};

// Middleware khusus untuk payment errors
const paymentErrorHandler = (operation, provider = 'stripe') => {
  return (err, req, res, next) => {
    if (err) {
      errorLogger.logPaymentError(operation, err, {
        operation,
        provider,
        method: req.method,
        url: req.originalUrl,
        userId: req.user ? req.user._id : null,
        amount: req.body ? req.body.amount : null,
        currency: req.body ? req.body.currency : null,
        paymentMethodId: req.body ? req.body.paymentMethodId : null
      });
      
      // Transform Stripe errors
      if (err.type === 'StripeCardError') {
        err.statusCode = 400;
        err.code = 'CARD_ERROR';
      } else if (err.type === 'StripeInvalidRequestError') {
        err.statusCode = 400;
        err.code = 'INVALID_REQUEST';
      } else if (err.type === 'StripeAPIError') {
        err.statusCode = 502;
        err.code = 'PAYMENT_GATEWAY_ERROR';
      } else if (err.type === 'StripeConnectionError') {
        err.statusCode = 503;
        err.code = 'PAYMENT_SERVICE_UNAVAILABLE';
      }
    }
    next(err);
  };
};

// Wrapper untuk async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware untuk validasi input
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError = new Error(error.details[0].message);
      validationError.statusCode = 400;
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = error.details;
      return next(validationError);
    }
    next();
  };
};

// Middleware untuk sanitasi input
const sanitizeInput = (req, res, next) => {
  // Sanitasi body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitasi query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitasi params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Helper function untuk sanitasi object
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip properties yang dimulai dengan $
    if (key.startsWith('$')) {
      continue;
    }
    
    if (typeof value === 'string') {
      // Basic XSS protection
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Middleware untuk monitoring performance
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      errorLogger.logError(new Error('Slow request detected'), {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        statusCode: res.statusCode,
        userId: req.user ? req.user._id : null
      }, 'performance_issue');
    }
  });
  
  next();
};

// Export semua middleware
module.exports = {
  errorReportingLimiter,
  requestLogger,
  errorHandler,
  notFoundHandler,
  databaseErrorHandler,
  paymentErrorHandler,
  asyncHandler,
  validateInput,
  sanitizeInput,
  performanceMonitor
};