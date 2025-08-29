// Monitoring Configuration
const path = require('path');

// Base configuration
const baseConfig = {
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    format: 'json',
    
    // Log directories
    directories: {
      logs: path.join(__dirname, '../../logs'),
      errors: path.join(__dirname, '../../logs/errors'),
      requests: path.join(__dirname, '../../logs/requests'),
      auth: path.join(__dirname, '../../logs/auth'),
      database: path.join(__dirname, '../../logs/database'),
      payments: path.join(__dirname, '../../logs/payments')
    }
  },
  
  // Error monitoring configuration
  errorMonitoring: {
    enabled: process.env.ERROR_MONITORING_ENABLED !== 'false',
    
    // Error thresholds
    thresholds: {
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.05, // 5%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000, // 1 second
      memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD) || 0.8, // 80%
      cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD) || 0.8 // 80%
    },
    
    // Alert configuration
    alerts: {
      enabled: process.env.ALERTS_ENABLED !== 'false',
      channels: {
        email: {
          enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
          recipients: process.env.ALERT_EMAIL_RECIPIENTS ? 
            process.env.ALERT_EMAIL_RECIPIENTS.split(',') : [],
          smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          }
        },
        webhook: {
          enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
          url: process.env.ALERT_WEBHOOK_URL,
          timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 5000
        },
        slack: {
          enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: process.env.SLACK_USERNAME || 'Error Monitor'
        }
      },
      
      // Alert rules
      rules: {
        criticalErrors: {
          enabled: true,
          threshold: 1, // Alert on any critical error
          timeWindow: 60000 // 1 minute
        },
        errorSpike: {
          enabled: true,
          threshold: 10, // 10 errors in time window
          timeWindow: 300000 // 5 minutes
        },
        slowRequests: {
          enabled: true,
          threshold: 5, // 5 slow requests in time window
          timeWindow: 300000 // 5 minutes
        },
        highMemoryUsage: {
          enabled: true,
          threshold: 0.9, // 90% memory usage
          timeWindow: 300000 // 5 minutes
        }
      }
    },
    
    // External services integration
    external: {
      sentry: {
        enabled: process.env.SENTRY_ENABLED === 'true',
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || '1.0.0',
        sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE) || 1.0,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1
      },
      
      datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || 'datadoghq.com'
      },
      
      newrelic: {
        enabled: process.env.NEWRELIC_ENABLED === 'true',
        licenseKey: process.env.NEWRELIC_LICENSE_KEY,
        appName: process.env.NEWRELIC_APP_NAME || 'FB Platform'
      }
    }
  },
  
  // Performance monitoring
  performance: {
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
    
    // Metrics collection
    metrics: {
      interval: parseInt(process.env.METRICS_INTERVAL) || 60000, // 1 minute
      retention: parseInt(process.env.METRICS_RETENTION) || 86400000, // 24 hours
      
      // What to collect
      collect: {
        systemMetrics: true,
        requestMetrics: true,
        databaseMetrics: true,
        customMetrics: true
      }
    },
    
    // APM (Application Performance Monitoring)
    apm: {
      enabled: process.env.APM_ENABLED === 'true',
      sampleRate: parseFloat(process.env.APM_SAMPLE_RATE) || 0.1,
      
      // Trace configuration
      tracing: {
        enabled: true,
        slowRequestThreshold: 1000, // 1 second
        captureBody: process.env.NODE_ENV === 'development'
      }
    }
  },
  
  // Health checks
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000, // 5 seconds
    
    // Services to check
    services: {
      database: {
        enabled: true,
        timeout: 3000
      },
      redis: {
        enabled: process.env.REDIS_URL ? true : false,
        timeout: 2000
      },
      external: {
        enabled: true,
        endpoints: [
          // Add external service endpoints to monitor
        ]
      }
    }
  },
  
  // Rate limiting for error reporting
  rateLimiting: {
    enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    
    // Client error reporting limits
    clientErrors: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // max 100 error reports per IP
      skipSuccessfulRequests: true
    },
    
    // API rate limits
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // max 1000 requests per IP
      skipSuccessfulRequests: false
    }
  },
  
  // Data retention policies
  retention: {
    errorLogs: process.env.ERROR_LOGS_RETENTION || '30d',
    requestLogs: process.env.REQUEST_LOGS_RETENTION || '7d',
    metrics: process.env.METRICS_RETENTION || '24h',
    traces: process.env.TRACES_RETENTION || '1h'
  }
};

// Environment-specific configurations
const environments = {
  development: {
    logging: {
      level: 'debug',
      console: true
    },
    errorMonitoring: {
      alerts: {
        enabled: false
      },
      external: {
        sentry: { enabled: false },
        datadog: { enabled: false },
        newrelic: { enabled: false }
      }
    },
    performance: {
      apm: {
        sampleRate: 1.0 // Sample all requests in development
      }
    }
  },
  
  test: {
    logging: {
      level: 'error',
      console: false
    },
    errorMonitoring: {
      enabled: false
    },
    performance: {
      enabled: false
    },
    healthCheck: {
      enabled: false
    }
  },
  
  staging: {
    logging: {
      level: 'info'
    },
    errorMonitoring: {
      alerts: {
        channels: {
          email: { enabled: false },
          webhook: { enabled: true },
          slack: { enabled: true }
        }
      }
    },
    performance: {
      apm: {
        sampleRate: 0.5
      }
    }
  },
  
  production: {
    logging: {
      level: 'warn',
      console: false
    },
    errorMonitoring: {
      alerts: {
        enabled: true
      },
      external: {
        sentry: { enabled: true },
        datadog: { enabled: true }
      }
    },
    performance: {
      apm: {
        sampleRate: 0.1,
        tracing: {
          captureBody: false
        }
      }
    }
  }
};

// Merge configurations
function mergeConfig(base, override) {
  const result = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = mergeConfig(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Get configuration for current environment
const environment = process.env.NODE_ENV || 'development';
const envConfig = environments[environment] || {};
const config = mergeConfig(baseConfig, envConfig);

// Validation
function validateConfig(config) {
  const errors = [];
  
  // Validate required fields for production
  if (environment === 'production') {
    if (config.errorMonitoring.alerts.enabled) {
      const { email, webhook, slack } = config.errorMonitoring.alerts.channels;
      
      if (email.enabled && !email.recipients.length) {
        errors.push('Email alerts enabled but no recipients configured');
      }
      
      if (webhook.enabled && !webhook.url) {
        errors.push('Webhook alerts enabled but no URL configured');
      }
      
      if (slack.enabled && !slack.webhookUrl) {
        errors.push('Slack alerts enabled but no webhook URL configured');
      }
    }
  }
  
  // Validate thresholds
  const { thresholds } = config.errorMonitoring;
  if (thresholds.errorRate < 0 || thresholds.errorRate > 1) {
    errors.push('Error rate threshold must be between 0 and 1');
  }
  
  if (thresholds.memoryUsage < 0 || thresholds.memoryUsage > 1) {
    errors.push('Memory usage threshold must be between 0 and 1');
  }
  
  if (errors.length > 0) {
    throw new Error(`Monitoring configuration errors:\n${errors.join('\n')}`);
  }
}

// Validate configuration
validateConfig(config);

// Export configuration
module.exports = {
  config,
  environment,
  
  // Helper functions
  isProduction: () => environment === 'production',
  isDevelopment: () => environment === 'development',
  isTest: () => environment === 'test',
  
  // Get specific config sections
  getLoggingConfig: () => config.logging,
  getErrorMonitoringConfig: () => config.errorMonitoring,
  getPerformanceConfig: () => config.performance,
  getHealthCheckConfig: () => config.healthCheck,
  getRateLimitingConfig: () => config.rateLimiting,
  getRetentionConfig: () => config.retention
};