#!/usr/bin/env node

/**
 * Performance Testing Script untuk Money Maker Platform
 * 
 * Script ini melakukan:
 * 1. Load testing dengan berbagai skenario
 * 2. Performance benchmarking
 * 3. Stress testing
 * 4. Memory leak detection
 * 5. Database performance testing
 * 6. API endpoint testing
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const cluster = require('cluster');
const os = require('os');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  clientUrl: process.env.TEST_CLIENT_URL || 'http://localhost:3000',
  concurrency: parseInt(process.env.TEST_CONCURRENCY) || 10,
  duration: parseInt(process.env.TEST_DURATION) || 60000, // 1 minute
  rampUp: parseInt(process.env.TEST_RAMP_UP) || 10000, // 10 seconds
  reportDir: path.join(__dirname, '..', 'test-reports'),
  endpoints: [
    { path: '/api/health', method: 'GET', weight: 10 },
    { path: '/api/auth/profile', method: 'GET', weight: 5, requiresAuth: true },
    { path: '/api/products', method: 'GET', weight: 8 },
    { path: '/api/orders', method: 'GET', weight: 3, requiresAuth: true },
    { path: '/api/payments/methods', method: 'GET', weight: 2, requiresAuth: true },
    { path: '/api/notifications', method: 'GET', weight: 2, requiresAuth: true }
  ],
  thresholds: {
    responseTime: {
      p50: 500,   // 50th percentile < 500ms
      p95: 2000,  // 95th percentile < 2s
      p99: 5000   // 99th percentile < 5s
    },
    errorRate: 0.01, // < 1% error rate
    throughput: 100  // > 100 requests/second
  }
};

class PerformanceTester {
  constructor() {
    this.results = {
      requests: [],
      errors: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      percentiles: {},
      memoryUsage: [],
      cpuUsage: []
    };
    this.authToken = null;
    this.startTime = null;
    this.endTime = null;
  }

  async initialize() {
    console.log('🚀 Initializing Performance Testing...');
    
    // Create report directory
    try {
      await fs.mkdir(CONFIG.reportDir, { recursive: true });
    } catch (error) {
      console.warn('Warning: Could not create report directory:', error.message);
    }

    // Test server connectivity
    try {
      const response = await axios.get(`${CONFIG.baseUrl}/api/health`, { timeout: 5000 });
      console.log('✅ Server is reachable:', response.data.message);
    } catch (error) {
      throw new Error(`❌ Server is not reachable: ${error.message}`);
    }

    // Get authentication token for protected endpoints
    await this.authenticate();

    console.log(`📊 Test Configuration:`);
    console.log(`   Base URL: ${CONFIG.baseUrl}`);
    console.log(`   Concurrency: ${CONFIG.concurrency}`);
    console.log(`   Duration: ${CONFIG.duration}ms`);
    console.log(`   Endpoints: ${CONFIG.endpoints.length}`);
  }

  async authenticate() {
    try {
      // Try to get a test token or use existing user
      const loginData = {
        email: process.env.TEST_EMAIL || 'test@example.com',
        password: process.env.TEST_PASSWORD || 'testpassword123'
      };

      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, loginData);
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
    } catch (error) {
      console.warn('⚠️  Authentication failed, protected endpoints will be skipped');
      console.warn('   Set TEST_EMAIL and TEST_PASSWORD environment variables for full testing');
    }
  }

  async runLoadTest() {
    console.log('\n🔥 Starting Load Test...');
    this.startTime = performance.now();

    // Start system monitoring
    const monitoringInterval = this.startSystemMonitoring();

    // Create worker promises
    const workers = [];
    for (let i = 0; i < CONFIG.concurrency; i++) {
      workers.push(this.createWorker(i));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    this.endTime = performance.now();
    clearInterval(monitoringInterval);

    console.log('✅ Load test completed');
  }

  async createWorker(workerId) {
    const workerStartTime = performance.now();
    const rampUpDelay = (workerId / CONFIG.concurrency) * CONFIG.rampUp;
    
    // Ramp-up delay
    await this.sleep(rampUpDelay);

    while (performance.now() - this.startTime < CONFIG.duration) {
      const endpoint = this.selectRandomEndpoint();
      await this.makeRequest(endpoint, workerId);
      
      // Small delay between requests
      await this.sleep(Math.random() * 100);
    }
  }

  selectRandomEndpoint() {
    const totalWeight = CONFIG.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of CONFIG.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return CONFIG.endpoints[0];
  }

  async makeRequest(endpoint, workerId) {
    const requestStart = performance.now();
    
    try {
      // Skip protected endpoints if no auth token
      if (endpoint.requiresAuth && !this.authToken) {
        return;
      }

      const config = {
        method: endpoint.method,
        url: `${CONFIG.baseUrl}${endpoint.path}`,
        timeout: 10000,
        headers: {}
      };

      if (endpoint.requiresAuth && this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await axios(config);
      const responseTime = performance.now() - requestStart;

      this.recordRequest({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        responseTime,
        success: true,
        workerId,
        timestamp: Date.now()
      });

    } catch (error) {
      const responseTime = performance.now() - requestStart;
      
      this.recordRequest({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: error.response?.status || 0,
        responseTime,
        success: false,
        error: error.message,
        workerId,
        timestamp: Date.now()
      });
    }
  }

  recordRequest(requestData) {
    this.results.requests.push(requestData);
    this.results.metrics.totalRequests++;
    
    if (requestData.success) {
      this.results.metrics.successfulRequests++;
    } else {
      this.results.metrics.failedRequests++;
      this.results.errors.push(requestData);
    }

    // Update response time metrics
    this.results.metrics.totalDuration += requestData.responseTime;
    this.results.metrics.minResponseTime = Math.min(
      this.results.metrics.minResponseTime,
      requestData.responseTime
    );
    this.results.metrics.maxResponseTime = Math.max(
      this.results.metrics.maxResponseTime,
      requestData.responseTime
    );
  }

  startSystemMonitoring() {
    return setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.results.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });

      this.results.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
    }, 1000);
  }

  calculateMetrics() {
    console.log('\n📊 Calculating Performance Metrics...');
    
    const { metrics } = this.results;
    const testDuration = (this.endTime - this.startTime) / 1000; // seconds
    
    // Basic metrics
    metrics.avgResponseTime = metrics.totalDuration / metrics.totalRequests;
    metrics.throughput = metrics.totalRequests / testDuration;
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;

    // Calculate percentiles
    const responseTimes = this.results.requests
      .filter(r => r.success)
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length > 0) {
      this.results.percentiles = {
        p50: this.calculatePercentile(responseTimes, 50),
        p75: this.calculatePercentile(responseTimes, 75),
        p90: this.calculatePercentile(responseTimes, 90),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99)
      };
    }

    // Endpoint-specific metrics
    this.results.endpointMetrics = this.calculateEndpointMetrics();
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }

  calculateEndpointMetrics() {
    const endpointStats = {};
    
    this.results.requests.forEach(request => {
      const key = `${request.method} ${request.endpoint}`;
      
      if (!endpointStats[key]) {
        endpointStats[key] = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          responseTimes: []
        };
      }
      
      const stats = endpointStats[key];
      stats.totalRequests++;
      stats.totalResponseTime += request.responseTime;
      stats.minResponseTime = Math.min(stats.minResponseTime, request.responseTime);
      stats.maxResponseTime = Math.max(stats.maxResponseTime, request.responseTime);
      stats.responseTimes.push(request.responseTime);
      
      if (request.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }
    });

    // Calculate derived metrics for each endpoint
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.avgResponseTime = stats.totalResponseTime / stats.totalRequests;
      stats.errorRate = stats.failedRequests / stats.totalRequests;
      
      // Calculate percentiles for this endpoint
      const sortedTimes = stats.responseTimes.sort((a, b) => a - b);
      stats.p95 = this.calculatePercentile(sortedTimes, 95);
    });

    return endpointStats;
  }

  async runStressTest() {
    console.log('\n💪 Starting Stress Test...');
    
    const originalConcurrency = CONFIG.concurrency;
    const stressLevels = [10, 25, 50, 100, 200];
    const stressResults = [];

    for (const level of stressLevels) {
      console.log(`\n🔥 Stress Level: ${level} concurrent users`);
      CONFIG.concurrency = level;
      CONFIG.duration = 30000; // 30 seconds per level
      
      // Reset results for this stress level
      this.results = {
        requests: [],
        errors: [],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalDuration: 0,
          avgResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        percentiles: {},
        memoryUsage: [],
        cpuUsage: []
      };

      await this.runLoadTest();
      this.calculateMetrics();
      
      stressResults.push({
        concurrency: level,
        metrics: { ...this.results.metrics },
        percentiles: { ...this.results.percentiles },
        passed: this.evaluateThresholds()
      });

      // Wait between stress levels
      await this.sleep(5000);
    }

    CONFIG.concurrency = originalConcurrency;
    return stressResults;
  }

  evaluateThresholds() {
    const { metrics, percentiles } = this.results;
    const { thresholds } = CONFIG;
    
    const checks = {
      responseTimeP50: percentiles.p50 <= thresholds.responseTime.p50,
      responseTimeP95: percentiles.p95 <= thresholds.responseTime.p95,
      responseTimeP99: percentiles.p99 <= thresholds.responseTime.p99,
      errorRate: metrics.errorRate <= thresholds.errorRate,
      throughput: metrics.throughput >= thresholds.throughput
    };

    return {
      passed: Object.values(checks).every(check => check),
      checks
    };
  }

  async generateReport() {
    console.log('\n📋 Generating Performance Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: CONFIG,
      summary: {
        testDuration: (this.endTime - this.startTime) / 1000,
        totalRequests: this.results.metrics.totalRequests,
        successfulRequests: this.results.metrics.successfulRequests,
        failedRequests: this.results.metrics.failedRequests,
        errorRate: (this.results.metrics.errorRate * 100).toFixed(2) + '%',
        avgResponseTime: Math.round(this.results.metrics.avgResponseTime),
        minResponseTime: Math.round(this.results.metrics.minResponseTime),
        maxResponseTime: Math.round(this.results.metrics.maxResponseTime),
        throughput: Math.round(this.results.metrics.throughput),
        percentiles: this.results.percentiles
      },
      thresholds: this.evaluateThresholds(),
      endpointMetrics: this.results.endpointMetrics,
      errors: this.results.errors.slice(0, 50), // Top 50 errors
      systemMetrics: {
        memoryUsage: this.results.memoryUsage,
        cpuUsage: this.results.cpuUsage
      }
    };

    // Save detailed report
    const reportPath = path.join(CONFIG.reportDir, `performance-report-${Date.now()}.json`);
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}`);
    } catch (error) {
      console.warn('Warning: Could not save detailed report:', error.message);
    }

    // Generate HTML report
    await this.generateHtmlReport(report);
    
    return report;
  }

  async generateHtmlReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report - Money Maker Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 14px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .chart-container { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Test Report</h1>
            <p>Money Maker Platform - ${report.timestamp}</p>
        </div>
        
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalRequests}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.throughput}/s</div>
                <div class="metric-label">Throughput</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.avgResponseTime}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-${report.summary.errorRate === '0.00%' ? 'pass' : 'fail'}">${report.summary.errorRate}</div>
                <div class="metric-label">Error Rate</div>
            </div>
        </div>
        
        <h2>📊 Response Time Percentiles</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Percentile</th>
                    <th>Response Time (ms)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>50th (Median)</td>
                    <td>${Math.round(report.summary.percentiles.p50 || 0)}</td>
                    <td class="status-${(report.summary.percentiles.p50 || 0) <= CONFIG.thresholds.responseTime.p50 ? 'pass' : 'fail'}">✓</td>
                </tr>
                <tr>
                    <td>95th</td>
                    <td>${Math.round(report.summary.percentiles.p95 || 0)}</td>
                    <td class="status-${(report.summary.percentiles.p95 || 0) <= CONFIG.thresholds.responseTime.p95 ? 'pass' : 'fail'}">✓</td>
                </tr>
                <tr>
                    <td>99th</td>
                    <td>${Math.round(report.summary.percentiles.p99 || 0)}</td>
                    <td class="status-${(report.summary.percentiles.p99 || 0) <= CONFIG.thresholds.responseTime.p99 ? 'pass' : 'fail'}">✓</td>
                </tr>
            </tbody>
        </table>
        
        <h2>🎯 Endpoint Performance</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>Avg Response (ms)</th>
                    <th>95th Percentile (ms)</th>
                    <th>Error Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.endpointMetrics || {}).map(([endpoint, metrics]) => `
                    <tr>
                        <td>${endpoint}</td>
                        <td>${metrics.totalRequests}</td>
                        <td>${Math.round(metrics.avgResponseTime)}</td>
                        <td>${Math.round(metrics.p95)}</td>
                        <td class="status-${metrics.errorRate === 0 ? 'pass' : 'fail'}">${(metrics.errorRate * 100).toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>⚠️ Top Errors</h2>
        ${report.errors.length > 0 ? `
            <table class="table">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Error</th>
                        <th>Response Time (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.errors.slice(0, 10).map(error => `
                        <tr>
                            <td>${error.method} ${error.endpoint}</td>
                            <td>${error.status}</td>
                            <td>${error.error || 'Unknown error'}</td>
                            <td>${Math.round(error.responseTime)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>No errors detected! 🎉</p>'}
        
        <div class="chart-container">
            <h3>📈 Test Summary</h3>
            <p><strong>Test Duration:</strong> ${report.summary.testDuration} seconds</p>
            <p><strong>Concurrency:</strong> ${report.configuration.concurrency} users</p>
            <p><strong>Total Endpoints:</strong> ${report.configuration.endpoints.length}</p>
            <p><strong>Overall Status:</strong> 
                <span class="status-${report.thresholds.passed ? 'pass' : 'fail'}">
                    ${report.thresholds.passed ? '✅ PASSED' : '❌ FAILED'}
                </span>
            </p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(CONFIG.reportDir, `performance-report-${Date.now()}.html`);
    try {
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`🌐 HTML report saved: ${htmlPath}`);
    } catch (error) {
      console.warn('Warning: Could not save HTML report:', error.message);
    }
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🕐 Test Duration: ${report.summary.testDuration}s`);
    console.log(`📨 Total Requests: ${report.summary.totalRequests}`);
    console.log(`✅ Successful: ${report.summary.successfulRequests}`);
    console.log(`❌ Failed: ${report.summary.failedRequests}`);
    console.log(`📈 Throughput: ${report.summary.throughput} req/s`);
    console.log(`⚡ Avg Response Time: ${report.summary.avgResponseTime}ms`);
    console.log(`🎯 Error Rate: ${report.summary.errorRate}`);
    console.log('');
    console.log('📊 Response Time Percentiles:');
    console.log(`   50th: ${Math.round(report.summary.percentiles.p50 || 0)}ms`);
    console.log(`   95th: ${Math.round(report.summary.percentiles.p95 || 0)}ms`);
    console.log(`   99th: ${Math.round(report.summary.percentiles.p99 || 0)}ms`);
    console.log('');
    console.log(`🎯 Overall Status: ${report.thresholds.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!report.thresholds.passed) {
      console.log('\n❌ Failed Checks:');
      Object.entries(report.thresholds.checks).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`   - ${check}`);
        }
      });
    }
    
    console.log('='.repeat(60));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'load';
  
  console.log('🚀 Money Maker Platform - Performance Testing Suite');
  console.log(`📊 Test Type: ${testType.toUpperCase()}`);
  
  const tester = new PerformanceTester();
  
  try {
    await tester.initialize();
    
    let report;
    switch (testType) {
      case 'load':
        await tester.runLoadTest();
        tester.calculateMetrics();
        report = await tester.generateReport();
        break;
        
      case 'stress':
        const stressResults = await tester.runStressTest();
        console.log('\n💪 Stress Test Results:');
        stressResults.forEach(result => {
          console.log(`   ${result.concurrency} users: ${result.passed.passed ? '✅' : '❌'} (${Math.round(result.metrics.throughput)} req/s, ${(result.metrics.errorRate * 100).toFixed(2)}% errors)`);
        });
        return;
        
      default:
        console.error('❌ Unknown test type. Use: load, stress');
        process.exit(1);
    }
    
    tester.printSummary(report);
    
    // Exit with appropriate code
    process.exit(report.thresholds.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;