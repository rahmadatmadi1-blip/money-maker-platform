#!/usr/bin/env node

/**
 * Real-time Monitoring dan Alerting System untuk Money Maker Platform
 * 
 * Script ini memantau:
 * 1. Server health dan uptime
 * 2. Database performance
 * 3. API response times
 * 4. Error rates
 * 5. Resource usage (CPU, Memory, Disk)
 * 6. User activity metrics
 * 7. Business metrics
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  monitoring: {
    interval: 30000, // 30 seconds
    healthCheckInterval: 60000, // 1 minute
    metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
    alertCooldown: 300000, // 5 minutes
  },
  targets: {
    api: {
      url: process.env.API_URL || 'http://localhost:5000',
      endpoints: [
        '/api/health',
        '/api/products',
        '/api/auth/me',
        '/api/orders',
        '/api/payments/methods'
      ],
      timeout: 10000
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
      timeout: 10000
    },
    database: {
      connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker'
    }
  },
  thresholds: {
    responseTime: {
      warning: 1000, // 1 second
      critical: 3000 // 3 seconds
    },
    errorRate: {
      warning: 5, // 5%
      critical: 10 // 10%
    },
    cpu: {
      warning: 70, // 70%
      critical: 90 // 90%
    },
    memory: {
      warning: 80, // 80%
      critical: 95 // 95%
    },
    disk: {
      warning: 80, // 80%
      critical: 95 // 95%
    },
    uptime: {
      critical: 99.0 // 99%
    }
  },
  alerts: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_MONITORING_CHANNEL || '#monitoring'
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      recipients: (process.env.MONITORING_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
    },
    webhook: {
      enabled: !!process.env.MONITORING_WEBHOOK_URL,
      url: process.env.MONITORING_WEBHOOK_URL
    }
  },
  dashboard: {
    enabled: true,
    port: process.env.MONITORING_PORT || 8080,
    updateInterval: 5000 // 5 seconds
  }
};

class MonitoringSystem {
  constructor() {
    this.metrics = {
      system: [],
      api: [],
      database: [],
      business: [],
      alerts: []
    };
    
    this.alertHistory = new Map();
    this.isRunning = false;
    this.intervals = [];
    this.startTime = Date.now();
    
    // Bind methods
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  async start() {
    console.log('🚀 Starting Money Maker Monitoring System...');
    
    this.isRunning = true;
    
    // Setup graceful shutdown
    process.on('SIGINT', this.handleShutdown);
    process.on('SIGTERM', this.handleShutdown);
    
    // Start monitoring intervals
    this.startSystemMonitoring();
    this.startApiMonitoring();
    this.startDatabaseMonitoring();
    this.startBusinessMetricsMonitoring();
    
    // Start dashboard if enabled
    if (CONFIG.dashboard.enabled) {
      await this.startDashboard();
    }
    
    // Initial health check
    await this.performInitialHealthCheck();
    
    console.log('✅ Monitoring system started successfully');
    console.log(`📊 Dashboard available at: http://localhost:${CONFIG.dashboard.port}`);
    console.log('🔍 Monitoring intervals:');
    console.log(`   - System metrics: ${CONFIG.monitoring.interval / 1000}s`);
    console.log(`   - Health checks: ${CONFIG.monitoring.healthCheckInterval / 1000}s`);
    
    // Keep the process running
    this.keepAlive();
  }

  startSystemMonitoring() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const metrics = await this.collectSystemMetrics();
        this.addMetric('system', metrics);
        await this.checkSystemThresholds(metrics);
      } catch (error) {
        console.error('❌ System monitoring error:', error.message);
      }
    }, CONFIG.monitoring.interval);
    
    this.intervals.push(interval);
  }

  startApiMonitoring() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const metrics = await this.collectApiMetrics();
        this.addMetric('api', metrics);
        await this.checkApiThresholds(metrics);
      } catch (error) {
        console.error('❌ API monitoring error:', error.message);
      }
    }, CONFIG.monitoring.healthCheckInterval);
    
    this.intervals.push(interval);
  }

  startDatabaseMonitoring() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const metrics = await this.collectDatabaseMetrics();
        this.addMetric('database', metrics);
        await this.checkDatabaseThresholds(metrics);
      } catch (error) {
        console.error('❌ Database monitoring error:', error.message);
      }
    }, CONFIG.monitoring.healthCheckInterval);
    
    this.intervals.push(interval);
  }

  startBusinessMetricsMonitoring() {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const metrics = await this.collectBusinessMetrics();
        this.addMetric('business', metrics);
      } catch (error) {
        console.error('❌ Business metrics monitoring error:', error.message);
      }
    }, CONFIG.monitoring.healthCheckInterval * 2); // Less frequent
    
    this.intervals.push(interval);
  }

  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage (simplified)
    const cpuUsage = await this.getCpuUsage();
    
    // Get disk usage
    const diskUsage = await this.getDiskUsage();
    
    const metrics = {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100
      },
      disk: diskUsage,
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
        application: (Date.now() - this.startTime) / 1000
      },
      load: os.loadavg(),
      platform: os.platform(),
      arch: os.arch()
    };
    
    return metrics;
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const cpuTime = (endUsage.user + endUsage.system); // microseconds
        
        const usage = (cpuTime / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, usage)));
      }, 100);
    });
  }

  async getDiskUsage() {
    try {
      const stats = await fs.stat('.');
      // This is a simplified disk usage check
      // In production, you might want to use a more sophisticated method
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        used: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
        free: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
        usage: 50 // 50% placeholder
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        error: error.message
      };
    }
  }

  async collectApiMetrics() {
    const metrics = {
      timestamp: Date.now(),
      endpoints: {},
      overall: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };
    
    const promises = CONFIG.targets.api.endpoints.map(async (endpoint) => {
      const startTime = performance.now();
      
      try {
        const response = await axios.get(
          `${CONFIG.targets.api.url}${endpoint}`,
          {
            timeout: CONFIG.targets.api.timeout,
            validateStatus: (status) => status < 500 // Accept 4xx as successful
          }
        );
        
        const responseTime = performance.now() - startTime;
        
        metrics.endpoints[endpoint] = {
          status: 'up',
          responseTime,
          statusCode: response.status,
          contentLength: response.headers['content-length'] || 0
        };
        
        metrics.overall.totalRequests++;
        metrics.overall.successfulRequests++;
        metrics.overall.averageResponseTime += responseTime;
        
      } catch (error) {
        const responseTime = performance.now() - startTime;
        
        metrics.endpoints[endpoint] = {
          status: 'down',
          responseTime,
          error: error.message,
          statusCode: error.response?.status || 0
        };
        
        metrics.overall.totalRequests++;
        metrics.overall.failedRequests++;
        metrics.overall.averageResponseTime += responseTime;
      }
    });
    
    await Promise.all(promises);
    
    // Calculate averages
    if (metrics.overall.totalRequests > 0) {
      metrics.overall.averageResponseTime /= metrics.overall.totalRequests;
      metrics.overall.errorRate = (metrics.overall.failedRequests / metrics.overall.totalRequests) * 100;
    }
    
    return metrics;
  }

  async collectDatabaseMetrics() {
    const metrics = {
      timestamp: Date.now(),
      connection: {
        status: 'unknown',
        responseTime: 0
      },
      operations: {
        reads: 0,
        writes: 0,
        errors: 0
      }
    };
    
    try {
      // Test database connection via health endpoint
      const startTime = performance.now();
      const response = await axios.get(
        `${CONFIG.targets.api.url}/api/health`,
        { timeout: CONFIG.targets.api.timeout }
      );
      
      const responseTime = performance.now() - startTime;
      
      if (response.data && response.data.database) {
        metrics.connection.status = response.data.database.connected ? 'connected' : 'disconnected';
        metrics.connection.responseTime = responseTime;
        
        // Extract additional database metrics if available
        if (response.data.database.metrics) {
          Object.assign(metrics.operations, response.data.database.metrics);
        }
      }
      
    } catch (error) {
      metrics.connection.status = 'error';
      metrics.connection.error = error.message;
    }
    
    return metrics;
  }

  async collectBusinessMetrics() {
    const metrics = {
      timestamp: Date.now(),
      users: {
        total: 0,
        active: 0,
        newToday: 0
      },
      orders: {
        total: 0,
        todayCount: 0,
        todayRevenue: 0,
        averageOrderValue: 0
      },
      products: {
        total: 0,
        views: 0,
        conversions: 0
      }
    };
    
    try {
      // Fetch business metrics from API
      const response = await axios.get(
        `${CONFIG.targets.api.url}/api/admin/metrics`,
        {
          timeout: CONFIG.targets.api.timeout,
          headers: {
            'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || ''}`
          }
        }
      );
      
      if (response.data) {
        Object.assign(metrics, response.data);
      }
      
    } catch (error) {
      // Business metrics are optional, don't fail monitoring
      console.warn('⚠️ Could not fetch business metrics:', error.message);
    }
    
    return metrics;
  }

  async checkSystemThresholds(metrics) {
    const alerts = [];
    
    // CPU usage check
    if (metrics.cpu.usage > CONFIG.thresholds.cpu.critical) {
      alerts.push({
        type: 'system',
        severity: 'critical',
        metric: 'cpu_usage',
        value: metrics.cpu.usage,
        threshold: CONFIG.thresholds.cpu.critical,
        message: `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`
      });
    } else if (metrics.cpu.usage > CONFIG.thresholds.cpu.warning) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        metric: 'cpu_usage',
        value: metrics.cpu.usage,
        threshold: CONFIG.thresholds.cpu.warning,
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`
      });
    }
    
    // Memory usage check
    if (metrics.memory.usage > CONFIG.thresholds.memory.critical) {
      alerts.push({
        type: 'system',
        severity: 'critical',
        metric: 'memory_usage',
        value: metrics.memory.usage,
        threshold: CONFIG.thresholds.memory.critical,
        message: `Critical memory usage: ${metrics.memory.usage.toFixed(1)}%`
      });
    } else if (metrics.memory.usage > CONFIG.thresholds.memory.warning) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        metric: 'memory_usage',
        value: metrics.memory.usage,
        threshold: CONFIG.thresholds.memory.warning,
        message: `High memory usage: ${metrics.memory.usage.toFixed(1)}%`
      });
    }
    
    // Disk usage check
    if (metrics.disk.usage > CONFIG.thresholds.disk.critical) {
      alerts.push({
        type: 'system',
        severity: 'critical',
        metric: 'disk_usage',
        value: metrics.disk.usage,
        threshold: CONFIG.thresholds.disk.critical,
        message: `Critical disk usage: ${metrics.disk.usage.toFixed(1)}%`
      });
    } else if (metrics.disk.usage > CONFIG.thresholds.disk.warning) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        metric: 'disk_usage',
        value: metrics.disk.usage,
        threshold: CONFIG.thresholds.disk.warning,
        message: `High disk usage: ${metrics.disk.usage.toFixed(1)}%`
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  async checkApiThresholds(metrics) {
    const alerts = [];
    
    // Error rate check
    if (metrics.overall.errorRate > CONFIG.thresholds.errorRate.critical) {
      alerts.push({
        type: 'api',
        severity: 'critical',
        metric: 'error_rate',
        value: metrics.overall.errorRate,
        threshold: CONFIG.thresholds.errorRate.critical,
        message: `Critical API error rate: ${metrics.overall.errorRate.toFixed(1)}%`
      });
    } else if (metrics.overall.errorRate > CONFIG.thresholds.errorRate.warning) {
      alerts.push({
        type: 'api',
        severity: 'warning',
        metric: 'error_rate',
        value: metrics.overall.errorRate,
        threshold: CONFIG.thresholds.errorRate.warning,
        message: `High API error rate: ${metrics.overall.errorRate.toFixed(1)}%`
      });
    }
    
    // Response time check
    if (metrics.overall.averageResponseTime > CONFIG.thresholds.responseTime.critical) {
      alerts.push({
        type: 'api',
        severity: 'critical',
        metric: 'response_time',
        value: metrics.overall.averageResponseTime,
        threshold: CONFIG.thresholds.responseTime.critical,
        message: `Critical API response time: ${metrics.overall.averageResponseTime.toFixed(0)}ms`
      });
    } else if (metrics.overall.averageResponseTime > CONFIG.thresholds.responseTime.warning) {
      alerts.push({
        type: 'api',
        severity: 'warning',
        metric: 'response_time',
        value: metrics.overall.averageResponseTime,
        threshold: CONFIG.thresholds.responseTime.warning,
        message: `Slow API response time: ${metrics.overall.averageResponseTime.toFixed(0)}ms`
      });
    }
    
    // Individual endpoint checks
    Object.entries(metrics.endpoints).forEach(([endpoint, data]) => {
      if (data.status === 'down') {
        alerts.push({
          type: 'api',
          severity: 'critical',
          metric: 'endpoint_down',
          endpoint,
          message: `API endpoint down: ${endpoint} - ${data.error}`
        });
      }
    });
    
    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  async checkDatabaseThresholds(metrics) {
    const alerts = [];
    
    if (metrics.connection.status === 'disconnected' || metrics.connection.status === 'error') {
      alerts.push({
        type: 'database',
        severity: 'critical',
        metric: 'connection',
        message: `Database connection failed: ${metrics.connection.error || 'Unknown error'}`
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  async processAlert(alert) {
    const alertKey = `${alert.type}_${alert.metric}_${alert.endpoint || ''}`;
    const now = Date.now();
    
    // Check cooldown period
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < CONFIG.monitoring.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }
    
    // Record alert
    this.alertHistory.set(alertKey, now);
    alert.timestamp = now;
    alert.id = `alert_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to metrics
    this.addMetric('alerts', alert);
    
    // Log alert
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Send notifications
    await this.sendAlert(alert);
  }

  async sendAlert(alert) {
    const promises = [];
    
    // Send Slack alert
    if (CONFIG.alerts.slack.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    // Send email alert
    if (CONFIG.alerts.email.enabled && CONFIG.alerts.email.recipients.length > 0) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    // Send webhook alert
    if (CONFIG.alerts.webhook.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    // Execute all notifications
    const results = await Promise.allSettled(promises);
    
    // Log notification results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('❌ Alert notification failed:', result.reason.message);
      }
    });
  }

  async sendSlackAlert(alert) {
    const color = alert.severity === 'critical' ? 'danger' : 'warning';
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    
    const payload = {
      channel: CONFIG.alerts.slack.channel,
      username: 'Monitoring Bot',
      icon_emoji: ':warning:',
      attachments: [{
        color,
        title: `${emoji} ${alert.severity.toUpperCase()} Alert`,
        text: alert.message,
        fields: [
          {
            title: 'Type',
            value: alert.type,
            short: true
          },
          {
            title: 'Metric',
            value: alert.metric,
            short: true
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toISOString(),
            short: true
          }
        ],
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };
    
    if (alert.value !== undefined && alert.threshold !== undefined) {
      payload.attachments[0].fields.push({
        title: 'Value / Threshold',
        value: `${alert.value} / ${alert.threshold}`,
        short: true
      });
    }
    
    await axios.post(CONFIG.alerts.slack.webhook, payload);
  }

  async sendEmailAlert(alert) {
    // Email implementation would go here
    console.log(`📧 Would send email alert to: ${CONFIG.alerts.email.recipients.join(', ')}`);
  }

  async sendWebhookAlert(alert) {
    await axios.post(CONFIG.alerts.webhook.url, {
      alert,
      timestamp: alert.timestamp,
      source: 'money-maker-monitoring'
    });
  }

  async performInitialHealthCheck() {
    console.log('🔍 Performing initial health check...');
    
    try {
      // Check API health
      const apiResponse = await axios.get(
        `${CONFIG.targets.api.url}/api/health`,
        { timeout: CONFIG.targets.api.timeout }
      );
      
      if (apiResponse.status === 200) {
        console.log('✅ API server is healthy');
      } else {
        console.log('⚠️ API server returned unexpected status:', apiResponse.status);
      }
      
    } catch (error) {
      console.log('❌ API server health check failed:', error.message);
    }
    
    try {
      // Check frontend
      const frontendResponse = await axios.get(
        CONFIG.targets.frontend.url,
        { timeout: CONFIG.targets.frontend.timeout }
      );
      
      if (frontendResponse.status === 200) {
        console.log('✅ Frontend server is accessible');
      } else {
        console.log('⚠️ Frontend server returned unexpected status:', frontendResponse.status);
      }
      
    } catch (error) {
      console.log('❌ Frontend server health check failed:', error.message);
    }
  }

  async startDashboard() {
    const express = require('express');
    const app = express();
    
    // Enable CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    
    // Serve static dashboard
    app.get('/', (req, res) => {
      res.send(this.generateDashboardHtml());
    });
    
    // API endpoints
    app.get('/api/metrics', (req, res) => {
      res.json({
        system: this.getRecentMetrics('system', 20),
        api: this.getRecentMetrics('api', 20),
        database: this.getRecentMetrics('database', 20),
        business: this.getRecentMetrics('business', 5),
        alerts: this.getRecentMetrics('alerts', 50)
      });
    });
    
    app.get('/api/status', (req, res) => {
      const latest = {
        system: this.getLatestMetric('system'),
        api: this.getLatestMetric('api'),
        database: this.getLatestMetric('database')
      };
      
      res.json({
        status: 'running',
        uptime: process.uptime(),
        latest,
        thresholds: CONFIG.thresholds
      });
    });
    
    app.listen(CONFIG.dashboard.port, () => {
      console.log(`📊 Monitoring dashboard started on port ${CONFIG.dashboard.port}`);
    });
  }

  generateDashboardHtml() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Money Maker - Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .card h3 { margin-bottom: 15px; color: #2c3e50; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
        .metric-value { font-weight: bold; font-size: 18px; }
        .status-good { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-critical { color: #e74c3c; }
        .progress-bar { width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .alerts { max-height: 300px; overflow-y: auto; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-critical { background: #fadbd8; border-left: 4px solid #e74c3c; }
        .alert-warning { background: #fef9e7; border-left: 4px solid #f39c12; }
        .refresh-info { text-align: center; margin: 20px 0; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 Money Maker - Monitoring Dashboard</h1>
        <p>Real-time system monitoring and alerts</p>
    </div>
    
    <div class="container">
        <div class="refresh-info">
            <p>🔄 Auto-refresh every 5 seconds | Last updated: <span id="lastUpdate">Loading...</span></p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🖥️ System Metrics</h3>
                <div id="systemMetrics">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🌐 API Health</h3>
                <div id="apiMetrics">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🗄️ Database</h3>
                <div id="databaseMetrics">Loading...</div>
            </div>
            
            <div class="card">
                <h3>📊 Business Metrics</h3>
                <div id="businessMetrics">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🚨 Recent Alerts</h3>
                <div id="alerts" class="alerts">Loading...</div>
            </div>
        </div>
    </div>
    
    <script>
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function getStatusClass(value, warning, critical) {
            if (value >= critical) return 'status-critical';
            if (value >= warning) return 'status-warning';
            return 'status-good';
        }
        
        function createProgressBar(value, max = 100) {
            const percentage = Math.min(100, (value / max) * 100);
            const colorClass = getStatusClass(percentage, 70, 90);
            return \`
                <div class="progress-bar">
                    <div class="progress-fill \${colorClass}" style="width: \${percentage}%"></div>
                </div>
            \`;
        }
        
        async function updateDashboard() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                
                // Update system metrics
                const system = data.system[data.system.length - 1];
                if (system) {
                    document.getElementById('systemMetrics').innerHTML = \`
                        <div class="metric">
                            <span>CPU Usage</span>
                            <span class="metric-value \${getStatusClass(system.cpu.usage, 70, 90)}">\${system.cpu.usage.toFixed(1)}%</span>
                        </div>
                        \${createProgressBar(system.cpu.usage)}
                        
                        <div class="metric">
                            <span>Memory Usage</span>
                            <span class="metric-value \${getStatusClass(system.memory.usage, 80, 95)}">\${system.memory.usage.toFixed(1)}%</span>
                        </div>
                        \${createProgressBar(system.memory.usage)}
                        
                        <div class="metric">
                            <span>Memory Used</span>
                            <span class="metric-value">\${formatBytes(system.memory.used)} / \${formatBytes(system.memory.total)}</span>
                        </div>
                        
                        <div class="metric">
                            <span>Uptime</span>
                            <span class="metric-value">\${Math.floor(system.uptime.application / 3600)}h \${Math.floor((system.uptime.application % 3600) / 60)}m</span>
                        </div>
                    \`;
                }
                
                // Update API metrics
                const api = data.api[data.api.length - 1];
                if (api) {
                    const endpointsList = Object.entries(api.endpoints).map(([endpoint, data]) => \`
                        <div class="metric">
                            <span>\${endpoint}</span>
                            <span class="metric-value \${data.status === 'up' ? 'status-good' : 'status-critical'}">\${data.status === 'up' ? '✅' : '❌'} \${Math.round(data.responseTime)}ms</span>
                        </div>
                    \`).join('');
                    
                    document.getElementById('apiMetrics').innerHTML = \`
                        <div class="metric">
                            <span>Error Rate</span>
                            <span class="metric-value \${getStatusClass(api.overall.errorRate, 5, 10)}">\${api.overall.errorRate.toFixed(1)}%</span>
                        </div>
                        
                        <div class="metric">
                            <span>Avg Response Time</span>
                            <span class="metric-value \${getStatusClass(api.overall.averageResponseTime, 1000, 3000)}">\${Math.round(api.overall.averageResponseTime)}ms</span>
                        </div>
                        
                        <hr style="margin: 15px 0;">
                        <h4>Endpoints</h4>
                        \${endpointsList}
                    \`;
                }
                
                // Update database metrics
                const database = data.database[data.database.length - 1];
                if (database) {
                    document.getElementById('databaseMetrics').innerHTML = \`
                        <div class="metric">
                            <span>Connection Status</span>
                            <span class="metric-value \${database.connection.status === 'connected' ? 'status-good' : 'status-critical'}">\${database.connection.status === 'connected' ? '✅ Connected' : '❌ Disconnected'}</span>
                        </div>
                        
                        <div class="metric">
                            <span>Response Time</span>
                            <span class="metric-value">\${Math.round(database.connection.responseTime || 0)}ms</span>
                        </div>
                    \`;
                }
                
                // Update business metrics
                const business = data.business[data.business.length - 1];
                if (business) {
                    document.getElementById('businessMetrics').innerHTML = \`
                        <div class="metric">
                            <span>Total Users</span>
                            <span class="metric-value">\${business.users.total}</span>
                        </div>
                        
                        <div class="metric">
                            <span>Active Users</span>
                            <span class="metric-value">\${business.users.active}</span>
                        </div>
                        
                        <div class="metric">
                            <span>Today's Orders</span>
                            <span class="metric-value">\${business.orders.todayCount}</span>
                        </div>
                        
                        <div class="metric">
                            <span>Today's Revenue</span>
                            <span class="metric-value">$\${business.orders.todayRevenue.toFixed(2)}</span>
                        </div>
                    \`;
                }
                
                // Update alerts
                const alerts = data.alerts.slice(-10).reverse();
                if (alerts.length > 0) {
                    document.getElementById('alerts').innerHTML = alerts.map(alert => \`
                        <div class="alert alert-\${alert.severity}">
                            <strong>\${alert.severity.toUpperCase()}</strong> - \${alert.message}<br>
                            <small>\${new Date(alert.timestamp).toLocaleString()}</small>
                        </div>
                    \`).join('');
                } else {
                    document.getElementById('alerts').innerHTML = '<p class="status-good">✅ No recent alerts</p>';
                }
                
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                
            } catch (error) {
                console.error('Failed to update dashboard:', error);
            }
        }
        
        // Initial load
        updateDashboard();
        
        // Auto-refresh every 5 seconds
        setInterval(updateDashboard, 5000);
    </script>
</body>
</html>`;
  }

  addMetric(type, metric) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push(metric);
    
    // Clean old metrics (keep only last 24 hours)
    const cutoff = Date.now() - CONFIG.monitoring.metricsRetention;
    this.metrics[type] = this.metrics[type].filter(m => m.timestamp > cutoff);
  }

  getRecentMetrics(type, count = 10) {
    if (!this.metrics[type]) return [];
    return this.metrics[type].slice(-count);
  }

  getLatestMetric(type) {
    if (!this.metrics[type] || this.metrics[type].length === 0) return null;
    return this.metrics[type][this.metrics[type].length - 1];
  }

  keepAlive() {
    // Keep the process running
    setInterval(() => {
      if (this.isRunning) {
        // Cleanup old alert history
        const cutoff = Date.now() - CONFIG.monitoring.alertCooldown * 2;
        for (const [key, timestamp] of this.alertHistory.entries()) {
          if (timestamp < cutoff) {
            this.alertHistory.delete(key);
          }
        }
      }
    }, 60000); // Every minute
  }

  async handleShutdown() {
    console.log('\n🛑 Shutting down monitoring system...');
    
    this.isRunning = false;
    
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    
    // Save final metrics report
    try {
      const report = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        totalMetrics: {
          system: this.metrics.system.length,
          api: this.metrics.api.length,
          database: this.metrics.database.length,
          business: this.metrics.business.length,
          alerts: this.metrics.alerts.length
        },
        recentAlerts: this.getRecentMetrics('alerts', 50)
      };
      
      const reportPath = path.join(__dirname, '..', 'monitoring-reports', `monitoring-${Date.now()}.json`);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📋 Final monitoring report saved: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save final report:', error.message);
    }
    
    console.log('✅ Monitoring system shutdown complete');
    process.exit(0);
  }
}

// CLI Interface
async function main() {
  const monitor = new MonitoringSystem();
  
  try {
    await monitor.start();
  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MonitoringSystem;