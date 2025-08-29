const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Advanced Security Headers Middleware
 * Implements OWASP security guidelines for web applications
 */

class SecurityHeadersManager {
  constructor() {
    this.config = {
      // Content Security Policy configuration
      csp: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for React development
            "https://js.stripe.com",
            "https://www.google-analytics.com",
            "https://www.googletagmanager.com",
            "https://connect.facebook.net"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "https://www.google-analytics.com",
            "https://www.facebook.com"
          ],
          connectSrc: [
            "'self'",
            "https://api.stripe.com",
            "https://www.google-analytics.com",
            "https://graph.facebook.com",
            process.env.CLIENT_URL || "http://localhost:3000"
          ],
          frameSrc: [
            "'self'",
            "https://js.stripe.com",
            "https://www.facebook.com"
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        },
        reportOnly: process.env.NODE_ENV === 'development'
      },
      
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      
      // X-Frame-Options
      frameOptions: {
        action: 'deny' // Prevent clickjacking
      },
      
      // X-Content-Type-Options
      noSniff: true,
      
      // Referrer Policy
      referrerPolicy: {
        policy: ['strict-origin-when-cross-origin']
      },
      
      // Permissions Policy (formerly Feature Policy)
      permissionsPolicy: {
        camera: ['self'],
        microphone: ['self'],
        geolocation: ['self'],
        payment: ['self'],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: []
      }
    };
    
    this.stats = {
      blockedRequests: 0,
      cspViolations: 0,
      securityEvents: []
    };
  }
  
  /**
   * Get comprehensive security middleware
   */
  getSecurityMiddleware() {
    return helmet({
      contentSecurityPolicy: this.config.csp,
      hsts: this.config.hsts,
      frameguard: this.config.frameOptions,
      noSniff: this.config.noSniff,
      referrerPolicy: this.config.referrerPolicy,
      permissionsPolicy: this.config.permissionsPolicy,
      
      // Additional security headers
      crossOriginEmbedderPolicy: false, // Disable for compatibility
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      
      // X-Powered-By header removal
      hidePoweredBy: true,
      
      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false
      },
      
      // Expect-CT header
      expectCt: {
        maxAge: 86400,
        enforce: process.env.NODE_ENV === 'production'
      }
    });
  }
  
  /**
   * CSP Violation Reporting Endpoint
   */
  getCspReportHandler() {
    return (req, res) => {
      try {
        const report = req.body;
        this.stats.cspViolations++;
        
        // Log CSP violation
        console.warn('CSP Violation:', {
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          violation: report
        });
        
        // Store violation for analysis
        this.stats.securityEvents.push({
          type: 'csp_violation',
          timestamp: new Date(),
          data: report,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
        
        // Keep only last 1000 events
        if (this.stats.securityEvents.length > 1000) {
          this.stats.securityEvents = this.stats.securityEvents.slice(-1000);
        }
        
        res.status(204).end();
      } catch (error) {
        console.error('CSP Report Handler Error:', error);
        res.status(400).json({ error: 'Invalid CSP report' });
      }
    };
  }
  
  /**
   * Advanced Rate Limiting with different tiers
   */
  getRateLimiters() {
    return {
      // General API rate limiting
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // requests per window
        message: {
          error: 'Too many requests',
          retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          this.stats.blockedRequests++;
          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
          });
        }
      }),
      
      // Strict rate limiting for authentication
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // attempts per window
        skipSuccessfulRequests: true,
        message: {
          error: 'Too many authentication attempts',
          retryAfter: '15 minutes'
        }
      }),
      
      // Payment endpoint rate limiting
      payment: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // payments per hour
        message: {
          error: 'Payment rate limit exceeded',
          retryAfter: '1 hour'
        }
      }),
      
      // File upload rate limiting
      upload: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 100, // uploads per hour
        message: {
          error: 'Upload rate limit exceeded',
          retryAfter: '1 hour'
        }
      }),
      
      // Admin endpoints - very strict
      admin: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // requests per window
        message: {
          error: 'Admin rate limit exceeded',
          retryAfter: '15 minutes'
        }
      })
    };
  }
  
  /**
   * Security Headers Validation Middleware
   */
  getSecurityValidationMiddleware() {
    return (req, res, next) => {
      // Validate request headers for security
      const suspiciousHeaders = [
        // Only check x-forwarded-host in production
        ...(process.env.NODE_ENV === 'production' ? ['x-forwarded-host'] : []),
        'x-original-url',
        'x-rewrite-url'
      ];
      
      // Check for suspicious headers that might indicate header injection
      for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
          console.warn('Suspicious header detected:', {
            header,
            value: req.headers[header],
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
          
          this.stats.securityEvents.push({
            type: 'suspicious_header',
            timestamp: new Date(),
            header,
            value: req.headers[header],
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
        }
      }
      
      // Validate Content-Type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || (!contentType.includes('application/json') && 
            !contentType.includes('multipart/form-data') && 
            !contentType.includes('application/x-www-form-urlencoded'))) {
          return res.status(400).json({
            error: 'Invalid or missing Content-Type header'
          });
        }
      }
      
      // Add security response headers
      res.setHeader('X-Request-ID', req.id || Date.now().toString());
      res.setHeader('X-Security-Policy', 'enforced');
      
      next();
    };
  }
  
  /**
   * CORS Security Enhancement
   */
  getSecureCorsOptions() {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      // Add localhost:5000 for debugging (server self-requests)
      'http://localhost:5000',
      'http://localhost:5000/',
      // Add production domains
      'https://moneymaker.vercel.app',
      'https://www.moneymaker.com'
    ].filter(Boolean);
    
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn('CORS blocked origin:', origin);
          this.stats.blockedRequests++;
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'
      ],
      exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
      maxAge: 86400 // 24 hours
    };
  }
  
  /**
   * Input Sanitization Middleware
   */
  getInputSanitizationMiddleware() {
    return (req, res, next) => {
      // Sanitize query parameters
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            // Remove potentially dangerous characters
            req.query[key] = value
              .replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]*>/g, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '');
          }
        }
      }
      
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        this.sanitizeObject(req.body);
      }
      
      next();
    };
  }
  
  /**
   * Recursively sanitize object properties
   */
  sanitizeObject(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        obj[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value);
      }
    }
  }
  
  /**
   * Security Monitoring Middleware
   */
  getSecurityMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Monitor for suspicious patterns
      const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // XSS attempts
        /union.*select/gi, // SQL injection
        /javascript:/gi, // JavaScript injection
        /eval\(/gi, // Code injection
        /exec\(/gi // Command injection
      ];
      
      const requestData = JSON.stringify({
        url: req.url,
        query: req.query,
        body: req.body
      });
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestData)) {
          console.warn('Suspicious request pattern detected:', {
            pattern: pattern.toString(),
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
          
          this.stats.securityEvents.push({
            type: 'suspicious_pattern',
            timestamp: new Date(),
            pattern: pattern.toString(),
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
          
          // Block obviously malicious requests
          if (pattern.test(req.url) || pattern.test(JSON.stringify(req.query))) {
            return res.status(403).json({
              error: 'Request blocked for security reasons'
            });
          }
        }
      }
      
      // Log response time for monitoring
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        if (responseTime > 5000) { // Log slow requests
          console.warn('Slow request detected:', {
            url: req.url,
            method: req.method,
            responseTime,
            statusCode: res.statusCode
          });
        }
      });
      
      next();
    };
  }
  
  /**
   * Get security statistics
   */
  getStats() {
    return {
      ...this.stats,
      recentEvents: this.stats.securityEvents.slice(-10)
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      blockedRequests: 0,
      cspViolations: 0,
      securityEvents: []
    };
  }
}

module.exports = new SecurityHeadersManager();