const express = require('express');
const router = express.Router();
const errorLogger = require('../utils/errorLogger');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * Error Reporting API Routes
 * Handles client-side error reports and provides error analytics
 */

// Rate limiting for error reporting
const errorReportLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 error reports per windowMs
  message: {
    error: 'Too many error reports from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for error analytics (more restrictive)
const analyticsLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 analytics requests per windowMs
  message: {
    error: 'Too many analytics requests from this IP, please try again later.'
  }
});

/**
 * @route POST /api/errors/report
 * @desc Report client-side errors
 * @access Public (with rate limiting)
 */
router.post('/report', 
  errorReportLimit,
  [
    body('errors').isArray().withMessage('Errors must be an array'),
    body('errors.*.type').notEmpty().withMessage('Error type is required'),
    body('errors.*.message').optional().isString(),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { errors: clientErrors, sessionId, timestamp } = req.body;
      const reportedErrors = [];

      // Process each error
      for (const clientError of clientErrors) {
        const errorId = errorLogger.logError('CLIENT_ERROR', {
          message: clientError.message || 'Client-side error',
          name: clientError.type,
          stack: clientError.stack
        }, {
          req,
          clientError: true,
          sessionId,
          clientTimestamp: clientError.timestamp,
          errorData: {
            type: clientError.type,
            category: clientError.category,
            url: clientError.url,
            userAgent: clientError.userAgent,
            viewport: clientError.viewport,
            screen: clientError.screen,
            connection: clientError.connection,
            performance: clientError.performance,
            user: clientError.user,
            breadcrumbs: clientError.breadcrumbs,
            context: clientError.context
          }
        });

        reportedErrors.push({
          clientErrorId: clientError.errorId,
          serverErrorId: errorId,
          type: clientError.type
        });

        // Log performance issues separately
        if (clientError.category === 'PERFORMANCE') {
          errorLogger.logWarning('CLIENT_PERFORMANCE_ISSUE', {
            sessionId,
            performanceData: clientError,
            url: clientError.url
          });
        }

        // Log console messages separately
        if (clientError.category === 'CONSOLE') {
          errorLogger.logInfo('CLIENT_CONSOLE_MESSAGE', {
            sessionId,
            level: clientError.level,
            message: clientError.message,
            url: clientError.url
          });
        }
      }

      // Log the error report event
      errorLogger.logInfo('CLIENT_ERROR_REPORT_RECEIVED', {
        sessionId,
        errorCount: clientErrors.length,
        reportTimestamp: timestamp,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.json({
        success: true,
        message: `Received ${clientErrors.length} error reports`,
        reportedErrors,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      errorLogger.logError('ERROR_REPORT_PROCESSING_FAILED', error, {
        req,
        requestBody: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to process error report',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/errors/stats
 * @desc Get error statistics
 * @access Private (Admin only)
 */
router.get('/stats', analyticsLimit, async (req, res) => {
  try {
    // Check if user is admin (you'll need to implement this based on your auth system)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = errorLogger.getErrorStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    errorLogger.logError('ERROR_STATS_RETRIEVAL_FAILED', error, { req });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve error statistics'
    });
  }
});

/**
 * @route GET /api/errors/search
 * @desc Search errors by criteria
 * @access Private (Admin only)
 */
router.get('/search', 
  analyticsLimit,
  [
    body('type').optional().isString(),
    body('userId').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      const { type, userId, startDate, endDate, limit } = req.query;
      
      const searchCriteria = {
        ...(type && { type }),
        ...(userId && { userId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(limit && { limit: parseInt(limit) })
      };

      const errors = await errorLogger.searchErrors(searchCriteria);
      
      res.json({
        success: true,
        data: {
          errors,
          count: errors.length,
          criteria: searchCriteria
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      errorLogger.logError('ERROR_SEARCH_FAILED', error, { req });
      
      res.status(500).json({
        success: false,
        message: 'Failed to search errors'
      });
    }
  }
);

/**
 * @route GET /api/errors/report/:period
 * @desc Generate error report for specified period
 * @access Private (Admin only)
 */
router.get('/report/:period', analyticsLimit, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { period } = req.params;
    const validPeriods = ['1h', '24h', '7d', '30d'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }

    const report = await errorLogger.generateErrorReport(period);
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    errorLogger.logError('ERROR_REPORT_GENERATION_FAILED', error, { req });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate error report'
    });
  }
});

/**
 * @route POST /api/errors/test
 * @desc Test error logging (development only)
 * @access Private (Admin only)
 */
router.post('/test', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test endpoints not available in production'
      });
    }

    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { type = 'TEST_ERROR', message = 'This is a test error' } = req.body;
    
    // Generate test error
    const testError = new Error(message);
    testError.name = type;
    
    const errorId = errorLogger.logError('TEST_ERROR', testError, {
      req,
      testError: true,
      generatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Test error logged successfully',
      errorId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    errorLogger.logError('TEST_ERROR_FAILED', error, { req });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate test error'
    });
  }
});

/**
 * @route GET /api/errors/health
 * @desc Check error monitoring system health
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    const stats = errorLogger.getErrorStats();
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      errorStats: {
        total: stats.total,
        recent: stats.recent.length
      },
      timestamp: new Date().toISOString()
    };

    // Check if error rate is too high
    const recentErrors = stats.recent.filter(error => 
      new Date(error.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );
    
    if (recentErrors.length > 100) {
      health.status = 'warning';
      health.warning = 'High error rate detected';
    }

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/errors/clear
 * @desc Clear error statistics (development only)
 * @access Private (Admin only)
 */
router.delete('/clear', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Clear endpoint not available in production'
      });
    }

    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Reset error statistics
    errorLogger.errorStats = {
      total: 0,
      byType: {},
      byEndpoint: {},
      byUser: {},
      recent: []
    };
    
    errorLogger.logInfo('ERROR_STATS_CLEARED', {
      clearedBy: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Error statistics cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    errorLogger.logError('ERROR_CLEAR_FAILED', error, { req });
    
    res.status(500).json({
      success: false,
      message: 'Failed to clear error statistics'
    });
  }
});

/**
 * @route GET /api/errors/dashboard
 * @desc Get error dashboard data
 * @access Private (Admin only)
 */
router.get('/dashboard', analyticsLimit, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = errorLogger.getErrorStats();
    const report24h = await errorLogger.generateErrorReport('24h');
    const report7d = await errorLogger.generateErrorReport('7d');
    
    // Calculate trends
    const now = new Date();
    const last24h = stats.recent.filter(error => 
      new Date(error.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    const last7d = stats.recent.filter(error => 
      new Date(error.timestamp) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );

    const dashboard = {
      overview: {
        totalErrors: stats.total,
        errors24h: last24h.length,
        errors7d: last7d.length,
        errorRate24h: last24h.length / 24, // Errors per hour
        uptime: process.uptime()
      },
      trends: {
        daily: report24h,
        weekly: report7d
      },
      topErrors: Object.entries(stats.byType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count })),
      topEndpoints: Object.entries(stats.byEndpoint)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      recentErrors: stats.recent.slice(0, 20),
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    errorLogger.logError('ERROR_DASHBOARD_FAILED', error, { req });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate error dashboard'
    });
  }
});

module.exports = router;