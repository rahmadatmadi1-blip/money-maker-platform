const nodemailer = require('nodemailer');
const axios = require('axios');
const { getErrorMonitoringConfig } = require('../config/monitoring');
const { logError } = require('../utils/errorLogger');

class AlertService {
  constructor() {
    this.config = getErrorMonitoringConfig();
    this.emailTransporter = null;
    this.alertHistory = new Map();
    this.initializeEmailTransporter();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    if (this.config.alerts.channels.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.alerts.channels.email.smtp.host,
          port: this.config.alerts.channels.email.smtp.port,
          secure: this.config.alerts.channels.email.smtp.secure,
          auth: this.config.alerts.channels.email.smtp.auth
        });
      } catch (error) {
        logError(error, { service: 'AlertService', action: 'initializeEmailTransporter' });
      }
    }
  }

  // Send alert based on type and severity
  async sendAlert(type, severity, message, details = {}) {
    if (!this.config.alerts.enabled) {
      return;
    }

    // Check if we should throttle this alert
    if (this.shouldThrottleAlert(type, severity)) {
      return;
    }

    const alert = {
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: 'FB Platform'
    };

    // Record alert in history
    this.recordAlert(type, severity);

    // Send to all enabled channels
    const promises = [];

    if (this.config.alerts.channels.email.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }

    if (this.config.alerts.channels.webhook.enabled) {
      promises.push(this.sendWebhookAlert(alert));
    }

    if (this.config.alerts.channels.slack.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }

    // Wait for all alerts to be sent
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logError(error, { service: 'AlertService', action: 'sendAlert', alert });
    }
  }

  // Send email alert
  async sendEmailAlert(alert) {
    if (!this.emailTransporter) {
      return;
    }

    try {
      const subject = `[${alert.severity.toUpperCase()}] ${alert.type} - ${alert.service}`;
      const html = this.generateEmailHTML(alert);

      await this.emailTransporter.sendMail({
        from: this.config.alerts.channels.email.smtp.auth.user,
        to: this.config.alerts.channels.email.recipients.join(','),
        subject,
        html
      });
    } catch (error) {
      logError(error, { service: 'AlertService', action: 'sendEmailAlert', alert });
    }
  }

  // Send webhook alert
  async sendWebhookAlert(alert) {
    try {
      await axios.post(
        this.config.alerts.channels.webhook.url,
        alert,
        {
          timeout: this.config.alerts.channels.webhook.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FB-Platform-AlertService/1.0'
          }
        }
      );
    } catch (error) {
      logError(error, { service: 'AlertService', action: 'sendWebhookAlert', alert });
    }
  }

  // Send Slack alert
  async sendSlackAlert(alert) {
    try {
      const payload = {
        channel: this.config.alerts.channels.slack.channel,
        username: this.config.alerts.channels.slack.username,
        text: alert.message,
        attachments: [
          {
            color: this.getSlackColor(alert.severity),
            fields: [
              {
                title: 'Type',
                value: alert.type,
                short: true
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Environment',
                value: alert.environment,
                short: true
              },
              {
                title: 'Timestamp',
                value: alert.timestamp,
                short: true
              }
            ],
            footer: alert.service,
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      // Add details if available
      if (Object.keys(alert.details).length > 0) {
        payload.attachments[0].fields.push({
          title: 'Details',
          value: '```' + JSON.stringify(alert.details, null, 2) + '```',
          short: false
        });
      }

      await axios.post(this.config.alerts.channels.slack.webhookUrl, payload);
    } catch (error) {
      logError(error, { service: 'AlertService', action: 'sendSlackAlert', alert });
    }
  }

  // Generate HTML for email alerts
  generateEmailHTML(alert) {
    const severityColor = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d',
      info: '#2563eb'
    }[alert.severity] || '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alert Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .detail-item { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #374151; }
          .detail-value { color: #6b7280; font-family: monospace; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">[${alert.severity.toUpperCase()}] ${alert.type}</h2>
            <p style="margin: 5px 0 0 0;">${alert.service} - ${alert.environment}</p>
          </div>
          <div class="content">
            <div class="detail-item">
              <div class="detail-label">Message:</div>
              <div class="detail-value">${alert.message}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Timestamp:</div>
              <div class="detail-value">${alert.timestamp}</div>
            </div>
            ${Object.keys(alert.details).length > 0 ? `
              <div class="detail-item">
                <div class="detail-label">Details:</div>
                <pre class="detail-value">${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This alert was generated automatically by FB Platform monitoring system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get Slack color based on severity
  getSlackColor(severity) {
    const colors = {
      critical: 'danger',
      high: '#ea580c',
      medium: 'warning',
      low: 'good',
      info: '#2563eb'
    };
    return colors[severity] || '#6b7280';
  }

  // Check if alert should be throttled
  shouldThrottleAlert(type, severity) {
    const key = `${type}-${severity}`;
    const now = Date.now();
    const history = this.alertHistory.get(key) || [];

    // Clean old entries (older than 1 hour)
    const recentHistory = history.filter(timestamp => now - timestamp < 3600000);
    this.alertHistory.set(key, recentHistory);

    // Throttling rules based on severity
    const throttleRules = {
      critical: { maxAlerts: 5, timeWindow: 300000 }, // 5 alerts per 5 minutes
      high: { maxAlerts: 3, timeWindow: 600000 },     // 3 alerts per 10 minutes
      medium: { maxAlerts: 2, timeWindow: 1800000 },  // 2 alerts per 30 minutes
      low: { maxAlerts: 1, timeWindow: 3600000 },     // 1 alert per hour
      info: { maxAlerts: 1, timeWindow: 3600000 }     // 1 alert per hour
    };

    const rule = throttleRules[severity] || throttleRules.medium;
    const recentAlertsInWindow = recentHistory.filter(
      timestamp => now - timestamp < rule.timeWindow
    );

    return recentAlertsInWindow.length >= rule.maxAlerts;
  }

  // Record alert in history
  recordAlert(type, severity) {
    const key = `${type}-${severity}`;
    const history = this.alertHistory.get(key) || [];
    history.push(Date.now());
    this.alertHistory.set(key, history);
  }

  // Predefined alert methods for common scenarios
  async criticalError(message, details = {}) {
    await this.sendAlert('critical_error', 'critical', message, details);
  }

  async highErrorRate(errorRate, details = {}) {
    await this.sendAlert('high_error_rate', 'high', 
      `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`, 
      { errorRate, ...details }
    );
  }

  async slowResponse(responseTime, details = {}) {
    await this.sendAlert('slow_response', 'medium', 
      `Slow response detected: ${responseTime}ms`, 
      { responseTime, ...details }
    );
  }

  async highMemoryUsage(memoryUsage, details = {}) {
    await this.sendAlert('high_memory_usage', 'high', 
      `High memory usage detected: ${(memoryUsage * 100).toFixed(2)}%`, 
      { memoryUsage, ...details }
    );
  }

  async databaseError(message, details = {}) {
    await this.sendAlert('database_error', 'high', message, details);
  }

  async paymentError(message, details = {}) {
    await this.sendAlert('payment_error', 'critical', message, details);
  }

  async authenticationFailure(message, details = {}) {
    await this.sendAlert('auth_failure', 'medium', message, details);
  }

  async serviceDown(serviceName, details = {}) {
    await this.sendAlert('service_down', 'critical', 
      `Service is down: ${serviceName}`, 
      { serviceName, ...details }
    );
  }

  async serviceRecovered(serviceName, details = {}) {
    await this.sendAlert('service_recovered', 'info', 
      `Service recovered: ${serviceName}`, 
      { serviceName, ...details }
    );
  }

  // Test alert functionality
  async testAlerts() {
    await this.sendAlert('test_alert', 'info', 
      'This is a test alert to verify the alerting system is working correctly.', 
      {
        testTime: new Date().toISOString(),
        channels: {
          email: this.config.alerts.channels.email.enabled,
          webhook: this.config.alerts.channels.webhook.enabled,
          slack: this.config.alerts.channels.slack.enabled
        }
      }
    );
  }

  // Get alert statistics
  getAlertStats() {
    const stats = {
      totalAlerts: 0,
      alertsByType: {},
      alertsBySeverity: {},
      recentAlerts: []
    };

    for (const [key, history] of this.alertHistory.entries()) {
      const [type, severity] = key.split('-');
      const now = Date.now();
      const recentHistory = history.filter(timestamp => now - timestamp < 86400000); // Last 24 hours

      stats.totalAlerts += recentHistory.length;
      stats.alertsByType[type] = (stats.alertsByType[type] || 0) + recentHistory.length;
      stats.alertsBySeverity[severity] = (stats.alertsBySeverity[severity] || 0) + recentHistory.length;

      recentHistory.forEach(timestamp => {
        stats.recentAlerts.push({
          type,
          severity,
          timestamp: new Date(timestamp).toISOString()
        });
      });
    }

    // Sort recent alerts by timestamp (newest first)
    stats.recentAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    stats.recentAlerts = stats.recentAlerts.slice(0, 50); // Keep only last 50

    return stats;
  }

  // Clear alert history (for testing/maintenance)
  clearAlertHistory() {
    this.alertHistory.clear();
  }
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;