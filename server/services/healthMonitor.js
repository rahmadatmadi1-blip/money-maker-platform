const os = require('os');
const mongoose = require('mongoose');
const axios = require('axios');
const { getHealthCheckConfig, getErrorMonitoringConfig } = require('../config/monitoring');
const alertService = require('./alertService');
const errorLogger = require('../utils/errorLogger');

class HealthMonitor {
  constructor() {
    this.config = getHealthCheckConfig();
    this.errorConfig = getErrorMonitoringConfig();
    this.healthStatus = {
      overall: 'healthy',
      services: {},
      metrics: {},
      lastCheck: null,
      uptime: process.uptime()
    };
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.alertThresholds = this.errorConfig.thresholds;
  }

  // Start health monitoring
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    errorLogger.logInfo('Health monitoring started', { interval: this.config.interval });

    // Initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);
  }

  // Stop health monitoring
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logInfo('Health monitoring stopped');
  }

  // Perform comprehensive health check
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      
      // Check service health
      const serviceHealth = await this.checkServices();
      
      // Update health status
      this.healthStatus = {
        overall: this.calculateOverallHealth(systemMetrics, serviceHealth),
        services: serviceHealth,
        metrics: systemMetrics,
        lastCheck: new Date().toISOString(),
        uptime: process.uptime(),
        checkDuration: Date.now() - startTime
      };

      // Check for alerts
      await this.checkAlertConditions(systemMetrics, serviceHealth);

    } catch (error) {
      errorLogger.logError('HEALTH_CHECK_ERROR', error, { service: 'HealthMonitor', action: 'performHealthCheck' });
      
      this.healthStatus.overall = 'unhealthy';
      this.healthStatus.lastCheck = new Date().toISOString();
      
      await alertService.criticalError('Health check failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Collect system metrics
  async collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // CPU usage calculation
    const cpuUsage = await this.getCPUUsage();
    
    // Disk usage (if available)
    const diskUsage = await this.getDiskUsage();

    return {
      memory: {
        process: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
          usage: memoryUsage.heapUsed / memoryUsage.heapTotal
        },
        system: {
          total: systemMemory.total,
          free: systemMemory.free,
          used: systemMemory.used,
          usage: systemMemory.used / systemMemory.total
        }
      },
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      disk: diskUsage,
      network: {
        interfaces: this.getNetworkInterfaces()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get CPU usage percentage
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();
        
        const elapsedTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const totalCPUTime = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
        
        const cpuPercent = (totalCPUTime / elapsedTime) * 100;
        resolve(Math.min(cpuPercent, 100)); // Cap at 100%
      }, 100);
    });
  }

  // Get disk usage (basic implementation)
  async getDiskUsage() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(process.cwd());
      
      // This is a simplified implementation
      // In production, you might want to use a more comprehensive disk monitoring library
      return {
        available: true,
        path: process.cwd(),
        // Note: Getting actual disk usage requires platform-specific commands
        // This is a placeholder implementation
        usage: 0.5 // 50% as placeholder
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  // Get network interfaces info
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = {};
    
    for (const [name, addresses] of Object.entries(interfaces)) {
      result[name] = addresses.map(addr => ({
        address: addr.address,
        family: addr.family,
        internal: addr.internal
      }));
    }
    
    return result;
  }

  // Check health of various services
  async checkServices() {
    const services = {};
    
    // Check database
    if (this.config.services.database.enabled) {
      services.database = await this.checkDatabase();
    }
    
    // Check Redis (if configured)
    if (this.config.services.redis.enabled) {
      services.redis = await this.checkRedis();
    }
    
    // Check external services
    if (this.config.services.external.enabled) {
      services.external = await this.checkExternalServices();
    }
    
    return services;
  }

  // Check database connectivity
  async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Check MongoDB connection
      if (mongoose.connection.readyState === 1) {
        // Perform a simple query to test connectivity
        await mongoose.connection.db.admin().ping();
        
        const responseTime = Date.now() - startTime;
        
        return {
          status: 'healthy',
          responseTime,
          connection: 'connected',
          readyState: mongoose.connection.readyState
        };
      } else {
        return {
          status: 'unhealthy',
          connection: 'disconnected',
          readyState: mongoose.connection.readyState,
          error: 'Database not connected'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connection: 'error'
      };
    }
  }

  // Check Redis connectivity
  async checkRedis() {
    try {
      // This is a placeholder - implement based on your Redis setup
      // const redis = require('redis');
      // const client = redis.createClient(process.env.REDIS_URL);
      
      return {
        status: 'healthy',
        note: 'Redis check not implemented'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Check external services
  async checkExternalServices() {
    const results = {};
    
    for (const endpoint of this.config.services.external.endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(endpoint, {
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as "healthy" but not 5xx
        });
        
        const responseTime = Date.now() - startTime;
        
        results[endpoint] = {
          status: response.status < 400 ? 'healthy' : 'degraded',
          statusCode: response.status,
          responseTime
        };
      } catch (error) {
        results[endpoint] = {
          status: 'unhealthy',
          error: error.message,
          code: error.code
        };
      }
    }
    
    return results;
  }

  // Calculate overall health status
  calculateOverallHealth(metrics, services) {
    const issues = [];
    
    // Check memory usage
    if (metrics.memory.system.usage > this.alertThresholds.memoryUsage) {
      issues.push('high_memory_usage');
    }
    
    // Check CPU usage
    if (metrics.cpu.usage > this.alertThresholds.cpuUsage * 100) {
      issues.push('high_cpu_usage');
    }
    
    // Check service health
    for (const [serviceName, serviceHealth] of Object.entries(services)) {
      if (serviceHealth.status === 'unhealthy') {
        issues.push(`${serviceName}_unhealthy`);
      }
    }
    
    // Determine overall status
    if (issues.length === 0) {
      return 'healthy';
    } else if (issues.some(issue => issue.includes('unhealthy'))) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  // Check for alert conditions
  async checkAlertConditions(metrics, services) {
    // Memory usage alert
    if (metrics.memory.system.usage > this.alertThresholds.memoryUsage) {
      await alertService.highMemoryUsage(metrics.memory.system.usage, {
        processMemory: metrics.memory.process,
        systemMemory: metrics.memory.system
      });
    }
    
    // CPU usage alert
    if (metrics.cpu.usage > this.alertThresholds.cpuUsage * 100) {
      await alertService.sendAlert('high_cpu_usage', 'high', 
        `High CPU usage detected: ${metrics.cpu.usage.toFixed(2)}%`, 
        {
          cpuUsage: metrics.cpu.usage,
          loadAverage: metrics.cpu.loadAverage,
          cores: metrics.cpu.cores
        }
      );
    }
    
    // Service health alerts
    for (const [serviceName, serviceHealth] of Object.entries(services)) {
      if (serviceHealth.status === 'unhealthy') {
        await alertService.serviceDown(serviceName, serviceHealth);
      } else if (serviceHealth.status === 'degraded') {
        await alertService.sendAlert('service_degraded', 'medium', 
          `Service is degraded: ${serviceName}`, 
          { serviceName, ...serviceHealth }
        );
      }
    }
  }

  // Get current health status
  getHealthStatus() {
    return {
      ...this.healthStatus,
      monitoring: this.isMonitoring
    };
  }

  // Get health summary for API responses
  getHealthSummary() {
    const status = this.getHealthStatus();
    
    return {
      status: status.overall || 'unknown',
      uptime: status.uptime || process.uptime(),
      lastCheck: status.lastCheck || new Date().toISOString(),
      services: status.services ? Object.keys(status.services).reduce((acc, key) => {
        acc[key] = status.services[key]?.status || 'unknown';
        return acc;
      }, {}) : {},
      memory: {
        usage: status.metrics?.memory?.system?.usage || 0,
        processUsage: status.metrics?.memory?.process?.usage || 0
      },
      cpu: {
        usage: status.metrics?.cpu?.usage || 0
      }
    };
  }

  // Force a health check
  async forceHealthCheck() {
    await this.performHealthCheck();
    return this.getHealthStatus();
  }

  // Get health history (if implemented with storage)
  getHealthHistory(hours = 24) {
    // This would require implementing storage for historical data
    // For now, return current status
    return {
      current: this.getHealthStatus(),
      history: [],
      note: 'Historical data not implemented'
    };
  }

  // Test health monitoring
  async testHealthMonitoring() {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    try {
      // Test system metrics collection
      testResults.tests.systemMetrics = {
        status: 'success',
        data: await this.collectSystemMetrics()
      };
    } catch (error) {
      testResults.tests.systemMetrics = {
        status: 'failed',
        error: error.message
      };
    }
    
    try {
      // Test service checks
      testResults.tests.serviceChecks = {
        status: 'success',
        data: await this.checkServices()
      };
    } catch (error) {
      testResults.tests.serviceChecks = {
        status: 'failed',
        error: error.message
      };
    }
    
    return testResults;
  }
}

// Create singleton instance
const healthMonitor = new HealthMonitor();

// Auto-start monitoring if enabled
if (healthMonitor.config.enabled) {
  // Start monitoring after a short delay to allow app initialization
  setTimeout(() => {
    healthMonitor.start();
  }, 5000);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  healthMonitor.stop();
});

process.on('SIGINT', () => {
  healthMonitor.stop();
});

module.exports = healthMonitor;