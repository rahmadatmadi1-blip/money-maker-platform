const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const session = require('express-session');
const RedisStore = require('connect-redis');
const { getQueryMonitor } = require('./middleware/queryMonitor');
const DatabaseConfig = require('./config/database');
const { redisManager } = require('./config/redis');
const cacheMiddleware = require('./middleware/cache');
const sessionService = require('./services/sessionService');
const securityHeaders = require('./middleware/securityHeaders');
const socketService = require('./services/socketService');

// Import error handling and monitoring
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  performanceMonitor,
  sanitizeInput
} = require('./middleware/errorHandler');
const healthMonitor = require('./services/healthMonitor');
const alertService = require('./services/alertService');
const errorLogger = require('./utils/errorLogger');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy for proper IP detection (fixes express-rate-limit ValidationError)
app.set('trust proxy', 1);

// Initialize database, Redis, and query monitor
const dbConfig = new DatabaseConfig();
const queryMonitor = getQueryMonitor({
  slowQueryThreshold: 100,
  enableProfiling: process.env.NODE_ENV === 'development',
  logSlowQueries: true
});

// Advanced Security Headers
app.use(securityHeaders.getSecurityMiddleware());
app.use(securityHeaders.getSecurityValidationMiddleware());
app.use(securityHeaders.getInputSanitizationMiddleware());
app.use(securityHeaders.getSecurityMonitoringMiddleware());

// Advanced Rate Limiting
const rateLimiters = securityHeaders.getRateLimiters();
app.use('/api/', rateLimiters.general);
app.use('/api/auth', rateLimiters.auth);
app.use('/api/payments', rateLimiters.payment);
app.use('/api/upload', rateLimiters.upload);
app.use('/api/admin', rateLimiters.admin);

// Secure CORS configuration
app.use(cors(securityHeaders.getSecureCorsOptions()));

// Session configuration with Redis
// Session configuration with Redis (simplified for now)
app.use(session({
  secret: process.env.SESSION_SECRET || 'money-maker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'money-maker-session'
}));

// TODO: Re-enable Redis session store after fixing compatibility
// store: new RedisStore({
//   client: redisManager.client,
//   prefix: 'money-maker:'
// }),

// Request logging and performance monitoring
app.use(requestLogger);
app.use(performanceMonitor);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug logging for payments (after body parsing)
app.use('/api/payments', (req, res, next) => {
  console.log('=== PAYMENT REQUEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('============================');
  next();
});

// Data sanitization middleware
app.use(sanitizeInput); // Custom input sanitization
app.use(mongoSanitize()); // Against NoSQL query injection
app.use(hpp()); // Against HTTP Parameter Pollution

// Static files
app.use('/uploads', express.static('uploads'));

// Database connection (Redis temporarily disabled)
dbConfig.connect()
.then(() => {
  // Initialize Socket.io
  socketService.initialize(server);
  console.log('🔌 Socket.io initialized successfully');
  
  // Start query monitoring
  queryMonitor.initialize();
  console.log('🚀 Database optimization started');
  console.log('📊 Query monitoring initialized');
})
.catch(err => {
  console.error('❌ Database connection failed:', err);
  // Don't exit in development mode, continue without database
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// TODO: Re-enable Redis after fixing connection issues
// redisManager.initialize()
// .then(() => {
//   console.log('📊 Cache system initialized');
// })
// .catch(err => {
//   console.error('❌ Redis connection failed:', err);
// });

// Query monitoring middleware (disabled temporarily)
// app.use(queryMonitor.getMiddleware());

// Cache middleware (disabled temporarily)
// app.use(cacheMiddleware.responseCache());
// app.use('/api', cacheMiddleware.apiCache());

// Database monitoring endpoints (disabled temporarily)
// app.use('/api/db-monitor', queryMonitor.getRouter());

// Cache monitoring endpoints (disabled temporarily - Redis not available)
// app.get('/api/cache/stats', async (req, res) => {
//   try {
//     const stats = await redisManager.getStats();
//     const cacheStats = cacheMiddleware.getStats();
//     res.json({
//       success: true,
//       data: {
//         redis: stats,
//         cache: cacheStats
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// app.post('/api/cache/clear', async (req, res) => {
//   try {
//     const { pattern } = req.body;
//     await redisManager.invalidatePattern(pattern || '*');
//     res.json({
//       success: true,
//       message: 'Cache cleared successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// Security monitoring endpoints
app.post('/api/security/csp-report', securityHeaders.getCspReportHandler());

app.get('/api/security/stats', (req, res) => {
  try {
    const stats = securityHeaders.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/security/reset-stats', (req, res) => {
  try {
    securityHeaders.resetStats();
    res.json({
      success: true,
      message: 'Security statistics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/affiliate', require('./routes/affiliate'));
app.use('/api/ecommerce', require('./routes/ecommerce'));
app.use('/api/content', require('./routes/content'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/errors', require('./routes/errors'));

// Health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = dbConfig.getHealthStatus();
    let dbStats = null;
    try {
      dbStats = dbHealth.connected ? await dbConfig.getStats() : null;
    } catch (dbError) {
      console.error('DB stats error:', dbError.message);
      dbStats = { error: 'Database stats unavailable' };
    }
    
    const redisHealth = redisManager.getHealthStatus();
    let redisStats = null;
    try {
      redisStats = redisHealth.connected ? await redisManager.getStats() : null;
    } catch (redisError) {
      console.error('Redis stats error:', redisError.message);
      redisStats = { error: 'Redis stats unavailable' };
    }
    
    let systemHealth = null;
    try {
      systemHealth = healthMonitor.getHealthSummary();
    } catch (healthError) {
      console.error('Health monitor error:', healthError.message);
      systemHealth = { status: 'unknown', error: 'Health monitor unavailable' };
    }
    
    // Safely get cache stats
    let cacheStats = null;
    try {
      cacheStats = typeof cacheMiddleware.getStats === 'function' ? cacheMiddleware.getStats() : null;
    } catch (err) {
      cacheStats = { error: 'Cache stats unavailable' };
    }
    
    // Safely get security stats
    let securityStats = null;
    try {
      securityStats = typeof securityHeaders.getStats === 'function' ? securityHeaders.getStats() : null;
    } catch (err) {
      securityStats = { error: 'Security stats unavailable' };
    }
    
    res.json({
      status: systemHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
      message: 'Money Maker Platform API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        ...dbHealth,
        stats: dbStats
      },
      redis: {
        ...redisHealth,
        stats: redisStats
      },
      cache: cacheStats,
      security: securityStats,
      system: systemHealth,
      monitoring: {
        errorMonitoring: true,
        healthMonitoring: healthMonitor.isMonitoring,
        alerting: true,
        caching: redisHealth.connected,
        securityHeaders: true
      }
    });
  } catch (error) {
    errorLogger.logError(error, { endpoint: '/api/health' });
    res.status(503).json({
      status: 'ERROR',
      message: 'Service health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check for monitoring systems
app.get('/api/health/detailed', async (req, res) => {
  try {
    const healthStatus = await healthMonitor.forceHealthCheck();
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    errorLogger.logError(error, { endpoint: '/api/health/detailed' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: '💰 Welcome to Money Maker Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
    status: 'Active'
  });
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize monitoring services
const initializeMonitoring = async () => {
  try {
    // Start health monitoring
    await healthMonitor.startMonitoring();
    errorLogger.logInfo('Health monitoring started successfully');
    
    // Initialize alert service
    await alertService.initialize();
    errorLogger.logInfo('Alert service initialized successfully');
    
    // Test alert system (only in development)
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        alertService.sendAlert('info', 'System Started', {
          message: 'Money Maker Platform server started successfully',
          environment: process.env.NODE_ENV,
          port: PORT
        });
      }, 5000);
    }
  } catch (error) {
    errorLogger.logError(error, { context: 'monitoring_initialization' });
  }
};

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.io ready for real-time notifications`);
  console.log(`💰 Money Maker Platform is ready to generate revenue!`);
  
  // Log server startup
  errorLogger.logInfo('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage()
  });
  
  // Initialize monitoring
  await initializeMonitoring();
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  errorLogger.logInfo('SIGTERM received, shutting down gracefully');
  await healthMonitor.stopMonitoring();
  await redisManager.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  errorLogger.logInfo('SIGINT received, shutting down gracefully');
  await healthMonitor.stopMonitoring();
  await redisManager.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  errorLogger.logError(error, { context: 'uncaught_exception' });
  alertService.sendAlert('critical', 'Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorLogger.logError(new Error(`Unhandled Rejection: ${reason}`), { 
    context: 'unhandled_rejection',
    promise: promise.toString()
  });
  alertService.sendAlert('critical', 'Unhandled Promise Rejection', {
    reason: reason.toString(),
    promise: promise.toString()
  });
});

module.exports = app;