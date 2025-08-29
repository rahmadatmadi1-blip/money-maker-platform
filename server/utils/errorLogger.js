const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * Comprehensive Error Logging System
 * Handles different types of errors with structured logging
 */
class ErrorLogger {
  constructor() {
    this.initializeLogger();
    this.errorStats = {
      total: 0,
      byType: {},
      byEndpoint: {},
      byUser: {},
      recent: []
    };
    this.setupErrorHandlers();
  }

  initializeLogger() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Configure Winston logger with multiple transports
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.prettyPrint()
      ),
      defaultMeta: {
        service: 'money-maker-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // Error log file (daily rotation)
        new DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true
        }),

        // Combined log file (daily rotation)
        new DailyRotateFile({
          filename: path.join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true
        }),

        // Critical errors (separate file)
        new winston.transports.File({
          filename: path.join(logsDir, 'critical.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],

      // Handle exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'exceptions.log')
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'rejections.log')
        })
      ]
    });
  }

  setupErrorHandlers() {
    // Global uncaught exception handler
    process.on('uncaughtException', (error) => {
      this.logCriticalError('UNCAUGHT_EXCEPTION', error, {
        fatal: true,
        source: 'process'
      });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Global unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      this.logCriticalError('UNHANDLED_REJECTION', reason, {
        promise: promise.toString(),
        source: 'promise'
      });
    });

    // Memory usage monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Log warning if memory usage is high
      if (memUsageMB.heapUsed > 500) {
        this.logWarning('HIGH_MEMORY_USAGE', {
          memoryUsage: memUsageMB,
          threshold: '500MB'
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Log different types of errors with context
   */
  logError(type, error, context = {}) {
    const errorData = this.formatError(type, error, context);
    
    if (!this.logger) {
      console.error(`ERROR: ${type}`, error, context);
      return;
    }
    
    this.logger.error(errorData);
    this.updateErrorStats(errorData);
    
    // Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorData);
    }

    return errorData.errorId;
  }

  logCriticalError(type, error, context = {}) {
    const errorData = this.formatError(type, error, { ...context, critical: true });
    
    this.logger.error('CRITICAL ERROR', errorData);
    this.updateErrorStats(errorData);
    
    // Immediate notification for critical errors
    if (process.env.NODE_ENV === 'production') {
      this.sendCriticalAlert(errorData);
    }

    return errorData.errorId;
  }

  logWarning(type, context = {}) {
    const warningData = {
      type,
      level: 'warning',
      timestamp: new Date().toISOString(),
      context,
      warningId: this.generateId()
    };

    this.logger.warn(warningData);
    return warningData.warningId;
  }

  logInfo(message, context = {}) {
    if (!this.logger) {
      console.log(`INFO: ${message}`, context);
      return;
    }
    this.logger.info({
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Format error with comprehensive information
   */
  formatError(type, error, context = {}) {
    const errorId = this.generateId();
    const timestamp = new Date().toISOString();

    const errorData = {
      errorId,
      type,
      timestamp,
      level: context.critical ? 'critical' : 'error',
      message: error.message || error,
      stack: error.stack,
      name: error.name,
      code: error.code,
      context: {
        ...context,
        userAgent: context.req?.get('User-Agent'),
        ip: context.req?.ip || context.req?.connection?.remoteAddress,
        method: context.req?.method,
        url: context.req?.originalUrl,
        userId: context.req?.user?.id,
        sessionId: context.req?.sessionID,
        requestId: context.req?.id
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    // Add database connection info if available
    if (context.dbError) {
      errorData.database = {
        connectionState: context.dbState,
        operation: context.dbOperation,
        collection: context.collection
      };
    }

    // Add API specific info
    if (context.apiError) {
      errorData.api = {
        endpoint: context.endpoint,
        statusCode: context.statusCode,
        responseTime: context.responseTime,
        requestBody: this.sanitizeData(context.requestBody),
        queryParams: context.queryParams
      };
    }

    return errorData;
  }

  /**
   * Update error statistics
   */
  updateErrorStats(errorData) {
    this.errorStats.total++;
    
    // Count by type
    this.errorStats.byType[errorData.type] = 
      (this.errorStats.byType[errorData.type] || 0) + 1;
    
    // Count by endpoint
    if (errorData.context.url) {
      this.errorStats.byEndpoint[errorData.context.url] = 
        (this.errorStats.byEndpoint[errorData.context.url] || 0) + 1;
    }
    
    // Count by user
    if (errorData.context.userId) {
      this.errorStats.byUser[errorData.context.userId] = 
        (this.errorStats.byUser[errorData.context.userId] || 0) + 1;
    }
    
    // Keep recent errors (last 100)
    this.errorStats.recent.unshift({
      errorId: errorData.errorId,
      type: errorData.type,
      timestamp: errorData.timestamp,
      message: errorData.message,
      url: errorData.context.url,
      userId: errorData.context.userId
    });
    
    if (this.errorStats.recent.length > 100) {
      this.errorStats.recent = this.errorStats.recent.slice(0, 100);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search errors by criteria
   */
  async searchErrors(criteria = {}) {
    // This would typically query a database or log aggregation service
    // For now, return recent errors filtered by criteria
    let results = [...this.errorStats.recent];

    if (criteria.type) {
      results = results.filter(error => error.type === criteria.type);
    }

    if (criteria.userId) {
      results = results.filter(error => error.userId === criteria.userId);
    }

    if (criteria.startDate) {
      results = results.filter(error => 
        new Date(error.timestamp) >= new Date(criteria.startDate)
      );
    }

    if (criteria.endDate) {
      results = results.filter(error => 
        new Date(error.timestamp) <= new Date(criteria.endDate)
      );
    }

    return results.slice(0, criteria.limit || 50);
  }

  /**
   * Send error to external monitoring service
   */
  async sendToExternalService(errorData) {
    try {
      // Example: Send to Sentry, LogRocket, or custom service
      if (process.env.SENTRY_DSN) {
        // Sentry integration would go here
      }

      if (process.env.WEBHOOK_ERROR_URL) {
        const fetch = require('node-fetch');
        await fetch(process.env.WEBHOOK_ERROR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`
          },
          body: JSON.stringify({
            service: 'money-maker-api',
            error: errorData,
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (webhookError) {
      this.logger.error('Failed to send error to external service', {
        originalError: errorData.errorId,
        webhookError: webhookError.message
      });
    }
  }

  /**
   * Send critical alert
   */
  async sendCriticalAlert(errorData) {
    try {
      // Send immediate notification (email, Slack, SMS, etc.)
      if (process.env.CRITICAL_ALERT_WEBHOOK) {
        const fetch = require('node-fetch');
        await fetch(process.env.CRITICAL_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 CRITICAL ERROR in Money Maker API`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Error Type', value: errorData.type, short: true },
                { title: 'Error ID', value: errorData.errorId, short: true },
                { title: 'Message', value: errorData.message, short: false },
                { title: 'URL', value: errorData.context.url, short: true },
                { title: 'User ID', value: errorData.context.userId, short: true }
              ],
              ts: Math.floor(Date.now() / 1000)
            }]
          })
        });
      }
    } catch (alertError) {
      this.logger.error('Failed to send critical alert', {
        originalError: errorData.errorId,
        alertError: alertError.message
      });
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'ssn', 'creditCard', 'cvv'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate unique error ID
   */
  generateId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Express middleware for error logging
   */
  middleware() {
    return (error, req, res, next) => {
      const errorId = this.logError('EXPRESS_ERROR', error, {
        req,
        apiError: true,
        endpoint: req.originalUrl,
        statusCode: error.statusCode || 500,
        requestBody: req.body,
        queryParams: req.query
      });

      // Add error ID to response for tracking
      res.locals.errorId = errorId;
      
      next(error);
    };
  }

  /**
   * Request logging middleware
   */
  requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Generate request ID
      req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log request
      this.logInfo('HTTP_REQUEST', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id
      });

      // Log response
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        this.logInfo('HTTP_RESPONSE', {
          requestId: req.id,
          statusCode: res.statusCode,
          responseTime,
          contentLength: res.get('Content-Length')
        });

        // Log slow requests
        if (responseTime > 5000) {
          this.logWarning('SLOW_REQUEST', {
            requestId: req.id,
            url: req.originalUrl,
            responseTime,
            threshold: '5000ms'
          });
        }
      });

      next();
    };
  }

  /**
   * Database error logger
   */
  logDatabaseError(operation, error, context = {}) {
    return this.logError('DATABASE_ERROR', error, {
      ...context,
      dbError: true,
      dbOperation: operation,
      dbState: 'disconnected' // This would be actual connection state
    });
  }

  /**
   * Authentication error logger
   */
  logAuthError(type, error, context = {}) {
    return this.logError('AUTH_ERROR', error, {
      ...context,
      authType: type,
      securityEvent: true
    });
  }

  /**
   * Payment error logger
   */
  logPaymentError(operation, error, context = {}) {
    return this.logError('PAYMENT_ERROR', error, {
      ...context,
      paymentOperation: operation,
      financialEvent: true,
      // Sanitize payment data
      paymentData: this.sanitizeData(context.paymentData)
    });
  }

  /**
   * Generate error report
   */
  async generateErrorReport(period = '24h') {
    const now = new Date();
    let startDate;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const errors = await this.searchErrors({ startDate });
    
    const report = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalErrors: errors.length,
      errorsByType: {},
      errorsByHour: {},
      topErrors: [],
      criticalErrors: errors.filter(e => e.level === 'critical'),
      recommendations: []
    };

    // Group errors by type
    errors.forEach(error => {
      report.errorsByType[error.type] = 
        (report.errorsByType[error.type] || 0) + 1;
    });

    // Group errors by hour
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      report.errorsByHour[hour] = (report.errorsByHour[hour] || 0) + 1;
    });

    // Top errors
    report.topErrors = Object.entries(report.errorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    // Generate recommendations
    if (report.totalErrors > 100) {
      report.recommendations.push('High error rate detected. Consider investigating top error types.');
    }

    if (report.criticalErrors.length > 0) {
      report.recommendations.push(`${report.criticalErrors.length} critical errors found. Immediate attention required.`);
    }

    return report;
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

module.exports = errorLogger;