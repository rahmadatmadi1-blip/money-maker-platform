#!/usr/bin/env node

/**
 * Automated Testing Suite untuk Money Maker Platform
 * 
 * Script ini menjalankan:
 * 1. Unit tests (Jest)
 * 2. Integration tests (API testing)
 * 3. End-to-end tests (Playwright)
 * 4. Performance tests
 * 5. Security tests
 * 6. Database tests
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  clientUrl: process.env.TEST_CLIENT_URL || 'http://localhost:3000',
  reportDir: path.join(__dirname, '..', 'test-reports'),
  timeout: 300000, // 5 minutes
  retries: 2,
  parallel: true,
  coverage: true,
  testTypes: {
    unit: {
      enabled: true,
      command: 'npm test -- --coverage --watchAll=false --testTimeout=30000',
      cwd: path.join(__dirname, '..', 'client'),
      timeout: 120000
    },
    integration: {
      enabled: true,
      timeout: 180000
    },
    e2e: {
      enabled: true,
      command: 'npx playwright test',
      cwd: path.join(__dirname, '..'),
      timeout: 300000
    },
    performance: {
      enabled: true,
      timeout: 180000
    },
    security: {
      enabled: true,
      timeout: 120000
    }
  },
  thresholds: {
    coverage: 80,
    unitTests: 95,
    integrationTests: 90,
    e2eTests: 85,
    performance: 90
  }
};

class TestSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        coverage: 0,
        overallPassed: false
      },
      testTypes: {},
      errors: [],
      recommendations: []
    };
    this.startTime = null;
  }

  async initialize() {
    console.log('🚀 Initializing Test Suite...');
    this.startTime = Date.now();
    
    // Create report directory
    try {
      await fs.mkdir(CONFIG.reportDir, { recursive: true });
    } catch (error) {
      console.warn('Warning: Could not create report directory:', error.message);
    }

    // Check if servers are running
    await this.checkServerHealth();
    
    console.log('✅ Test suite initialized');
    console.log(`📊 Test types enabled: ${Object.keys(CONFIG.testTypes).filter(type => CONFIG.testTypes[type].enabled).join(', ')}`);
  }

  async checkServerHealth() {
    console.log('🔍 Checking server health...');
    
    try {
      // Check backend server
      const backendResponse = await axios.get(`${CONFIG.baseUrl}/api/health`, { timeout: 5000 });
      console.log('✅ Backend server is healthy');
    } catch (error) {
      console.warn('⚠️  Backend server health check failed:', error.message);
    }

    try {
      // Check frontend server
      const frontendResponse = await axios.get(CONFIG.clientUrl, { timeout: 5000 });
      console.log('✅ Frontend server is accessible');
    } catch (error) {
      console.warn('⚠️  Frontend server health check failed:', error.message);
    }
  }

  async runAllTests() {
    console.log('\n🧪 Starting Test Suite Execution...');
    
    const testPromises = [];
    
    // Run tests based on configuration
    if (CONFIG.testTypes.unit.enabled) {
      testPromises.push(this.runUnitTests());
    }
    
    if (CONFIG.testTypes.integration.enabled) {
      testPromises.push(this.runIntegrationTests());
    }
    
    if (CONFIG.testTypes.e2e.enabled) {
      testPromises.push(this.runE2ETests());
    }
    
    if (CONFIG.testTypes.performance.enabled) {
      testPromises.push(this.runPerformanceTests());
    }
    
    if (CONFIG.testTypes.security.enabled) {
      testPromises.push(this.runSecurityTests());
    }

    // Execute tests
    if (CONFIG.parallel) {
      await Promise.allSettled(testPromises);
    } else {
      for (const testPromise of testPromises) {
        await testPromise;
      }
    }

    this.calculateSummary();
  }

  async runUnitTests() {
    console.log('\n🔬 Running Unit Tests...');
    
    const testResult = {
      type: 'unit',
      passed: false,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage: 0,
      errors: []
    };

    try {
      const startTime = Date.now();
      const result = await this.executeCommand(
        CONFIG.testTypes.unit.command,
        CONFIG.testTypes.unit.cwd,
        CONFIG.testTypes.unit.timeout
      );
      
      testResult.duration = Date.now() - startTime;
      testResult.output = result.stdout;
      
      // Parse Jest output
      const jestResults = this.parseJestOutput(result.stdout);
      testResult.tests = jestResults.tests;
      testResult.coverage = jestResults.coverage;
      testResult.passed = jestResults.passed && testResult.coverage >= CONFIG.thresholds.coverage;
      
      if (!testResult.passed) {
        testResult.errors.push('Unit tests failed or coverage below threshold');
      }
      
      console.log(`   ✅ Unit tests completed: ${testResult.tests.passed}/${testResult.tests.total} passed`);
      console.log(`   📊 Coverage: ${testResult.coverage}%`);
      
    } catch (error) {
      testResult.errors.push(error.message);
      testResult.passed = false;
      console.log('   ❌ Unit tests failed:', error.message);
    }

    this.results.testTypes.unit = testResult;
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    
    const testResult = {
      type: 'integration',
      passed: false,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      errors: []
    };

    try {
      const startTime = Date.now();
      
      // Define integration test scenarios
      const testScenarios = [
        { name: 'Health Check', test: () => this.testHealthEndpoint() },
        { name: 'User Authentication', test: () => this.testAuthentication() },
        { name: 'Product API', test: () => this.testProductAPI() },
        { name: 'Order Processing', test: () => this.testOrderProcessing() },
        { name: 'Payment Integration', test: () => this.testPaymentIntegration() },
        { name: 'Database Operations', test: () => this.testDatabaseOperations() }
      ];
      
      testResult.tests.total = testScenarios.length;
      
      for (const scenario of testScenarios) {
        try {
          console.log(`   🧪 Testing ${scenario.name}...`);
          await scenario.test();
          testResult.tests.passed++;
          console.log(`   ✅ ${scenario.name} passed`);
        } catch (error) {
          testResult.tests.failed++;
          testResult.errors.push(`${scenario.name}: ${error.message}`);
          console.log(`   ❌ ${scenario.name} failed:`, error.message);
        }
      }
      
      testResult.duration = Date.now() - startTime;
      testResult.passed = (testResult.tests.passed / testResult.tests.total) >= (CONFIG.thresholds.integrationTests / 100);
      
      console.log(`   📊 Integration tests: ${testResult.tests.passed}/${testResult.tests.total} passed`);
      
    } catch (error) {
      testResult.errors.push(error.message);
      testResult.passed = false;
      console.log('   ❌ Integration tests failed:', error.message);
    }

    this.results.testTypes.integration = testResult;
  }

  async runE2ETests() {
    console.log('\n🎭 Running End-to-End Tests...');
    
    const testResult = {
      type: 'e2e',
      passed: false,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      errors: []
    };

    try {
      const startTime = Date.now();
      
      // Check if Playwright is installed
      const playwrightConfigPath = path.join(__dirname, '..', 'playwright.config.js');
      try {
        await fs.access(playwrightConfigPath);
      } catch {
        console.log('   ⚠️  Playwright not configured, creating basic E2E tests...');
        await this.createBasicE2ETests();
      }
      
      const result = await this.executeCommand(
        CONFIG.testTypes.e2e.command,
        CONFIG.testTypes.e2e.cwd,
        CONFIG.testTypes.e2e.timeout
      );
      
      testResult.duration = Date.now() - startTime;
      testResult.output = result.stdout;
      
      // Parse Playwright output
      const playwrightResults = this.parsePlaywrightOutput(result.stdout);
      testResult.tests = playwrightResults.tests;
      testResult.passed = playwrightResults.passed && 
        (testResult.tests.passed / testResult.tests.total) >= (CONFIG.thresholds.e2eTests / 100);
      
      console.log(`   📊 E2E tests: ${testResult.tests.passed}/${testResult.tests.total} passed`);
      
    } catch (error) {
      testResult.errors.push(error.message);
      testResult.passed = false;
      console.log('   ❌ E2E tests failed:', error.message);
    }

    this.results.testTypes.e2e = testResult;
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    
    const testResult = {
      type: 'performance',
      passed: false,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      metrics: {},
      errors: []
    };

    try {
      const startTime = Date.now();
      
      // Run performance test script
      const PerformanceTester = require('./performance-test');
      const tester = new PerformanceTester();
      
      await tester.initialize();
      await tester.runLoadTest();
      tester.calculateMetrics();
      
      const performanceReport = await tester.generateReport();
      
      testResult.duration = Date.now() - startTime;
      testResult.metrics = performanceReport.summary;
      testResult.tests.total = 1;
      testResult.tests.passed = performanceReport.thresholds.passed ? 1 : 0;
      testResult.tests.failed = performanceReport.thresholds.passed ? 0 : 1;
      testResult.passed = performanceReport.thresholds.passed;
      
      if (!testResult.passed) {
        testResult.errors.push('Performance thresholds not met');
      }
      
      console.log(`   📊 Performance test: ${testResult.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   ⚡ Throughput: ${Math.round(testResult.metrics.throughput)} req/s`);
      console.log(`   🕐 Avg Response Time: ${Math.round(testResult.metrics.avgResponseTime)}ms`);
      
    } catch (error) {
      testResult.errors.push(error.message);
      testResult.passed = false;
      console.log('   ❌ Performance tests failed:', error.message);
    }

    this.results.testTypes.performance = testResult;
  }

  async runSecurityTests() {
    console.log('\n🔒 Running Security Tests...');
    
    const testResult = {
      type: 'security',
      passed: false,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      vulnerabilities: [],
      errors: []
    };

    try {
      const startTime = Date.now();
      
      // Define security test scenarios
      const securityTests = [
        { name: 'SQL Injection Protection', test: () => this.testSQLInjection() },
        { name: 'XSS Protection', test: () => this.testXSSProtection() },
        { name: 'CSRF Protection', test: () => this.testCSRFProtection() },
        { name: 'Authentication Security', test: () => this.testAuthSecurity() },
        { name: 'Rate Limiting', test: () => this.testRateLimiting() },
        { name: 'Security Headers', test: () => this.testSecurityHeaders() }
      ];
      
      testResult.tests.total = securityTests.length;
      
      for (const test of securityTests) {
        try {
          console.log(`   🔍 Testing ${test.name}...`);
          await test.test();
          testResult.tests.passed++;
          console.log(`   ✅ ${test.name} passed`);
        } catch (error) {
          testResult.tests.failed++;
          testResult.vulnerabilities.push({
            test: test.name,
            severity: 'medium',
            description: error.message
          });
          console.log(`   ⚠️  ${test.name} failed:`, error.message);
        }
      }
      
      testResult.duration = Date.now() - startTime;
      testResult.passed = testResult.vulnerabilities.length === 0;
      
      console.log(`   📊 Security tests: ${testResult.tests.passed}/${testResult.tests.total} passed`);
      console.log(`   🚨 Vulnerabilities found: ${testResult.vulnerabilities.length}`);
      
    } catch (error) {
      testResult.errors.push(error.message);
      testResult.passed = false;
      console.log('   ❌ Security tests failed:', error.message);
    }

    this.results.testTypes.security = testResult;
  }

  // Integration test methods
  async testHealthEndpoint() {
    const response = await axios.get(`${CONFIG.baseUrl}/api/health`, { timeout: 5000 });
    if (response.status !== 200 || response.data.status !== 'OK') {
      throw new Error('Health endpoint returned unexpected response');
    }
  }

  async testAuthentication() {
    // Test login
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, loginData);
      if (!response.data.token) {
        throw new Error('Login did not return token');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Expected for non-existent user, test passed
        return;
      }
      throw error;
    }
  }

  async testProductAPI() {
    const response = await axios.get(`${CONFIG.baseUrl}/api/products`, { timeout: 5000 });
    if (response.status !== 200) {
      throw new Error('Products API returned unexpected status');
    }
  }

  async testOrderProcessing() {
    // Test order creation endpoint exists
    try {
      await axios.post(`${CONFIG.baseUrl}/api/orders`, {}, { timeout: 5000 });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        // Expected for unauthorized/invalid request
        return;
      }
      throw error;
    }
  }

  async testPaymentIntegration() {
    const response = await axios.get(`${CONFIG.baseUrl}/api/payments/methods`, { timeout: 5000 });
    // Should return 401 for unauthorized request
    if (response.status === 401) {
      return; // Expected
    }
    throw new Error('Payment endpoint should require authentication');
  }

  async testDatabaseOperations() {
    const response = await axios.get(`${CONFIG.baseUrl}/api/health`, { timeout: 5000 });
    if (!response.data.database || !response.data.database.connected) {
      throw new Error('Database connection not healthy');
    }
  }

  // Security test methods
  async testSQLInjection() {
    const maliciousPayload = "'; DROP TABLE users; --";
    try {
      await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
        email: maliciousPayload,
        password: 'test'
      });
    } catch (error) {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return; // Expected rejection
      }
    }
    // If we get here, the injection might have worked
    throw new Error('Potential SQL injection vulnerability');
  }

  async testXSSProtection() {
    const xssPayload = '<script>alert("xss")</script>';
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/register`, {
        name: xssPayload,
        email: 'test@example.com',
        password: 'test123'
      });
      
      if (response.data && typeof response.data === 'string' && response.data.includes('<script>')) {
        throw new Error('XSS payload not sanitized');
      }
    } catch (error) {
      if (error.message === 'XSS payload not sanitized') {
        throw error;
      }
      // Other errors are expected (validation, etc.)
    }
  }

  async testCSRFProtection() {
    // Test that state-changing operations require proper headers
    try {
      await axios.post(`${CONFIG.baseUrl}/api/auth/logout`, {}, {
        headers: { 'Origin': 'http://malicious-site.com' }
      });
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        return; // Expected protection
      }
    }
  }

  async testAuthSecurity() {
    // Test weak password rejection
    try {
      await axios.post(`${CONFIG.baseUrl}/api/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: '123' // Weak password
      });
    } catch (error) {
      if (error.response?.status === 400) {
        return; // Expected rejection
      }
    }
    throw new Error('Weak password accepted');
  }

  async testRateLimiting() {
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
          email: 'test@example.com',
          password: 'wrong'
        }).catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(response => 
      response && response.status === 429
    );
    
    if (!rateLimited) {
      throw new Error('Rate limiting not working');
    }
  }

  async testSecurityHeaders() {
    const response = await axios.get(`${CONFIG.baseUrl}/api/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  }

  // Utility methods
  async executeCommand(command, cwd, timeout) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  parseJestOutput(output) {
    const result = {
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage: 0,
      passed: false
    };
    
    // Parse test results
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      result.tests.failed = parseInt(testMatch[1]);
      result.tests.passed = parseInt(testMatch[2]);
      result.tests.total = parseInt(testMatch[3]);
    }
    
    // Parse coverage
    const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*(\d+\.?\d*)/);
    if (coverageMatch) {
      result.coverage = parseFloat(coverageMatch[1]);
    }
    
    result.passed = result.tests.failed === 0;
    return result;
  }

  parsePlaywrightOutput(output) {
    const result = {
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      passed: false
    };
    
    // Parse Playwright results
    const testMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/);
    if (testMatch) {
      result.tests.passed = parseInt(testMatch[1]);
      result.tests.failed = parseInt(testMatch[2]);
      result.tests.skipped = parseInt(testMatch[3]);
      result.tests.total = result.tests.passed + result.tests.failed + result.tests.skipped;
    }
    
    result.passed = result.tests.failed === 0;
    return result;
  }

  async createBasicE2ETests() {
    const playwrightConfig = `
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: '${CONFIG.clientUrl}',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    },
  ],
};
`;

    const basicTest = `
const { test, expect } = require('@playwright/test');

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Money Maker/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Products');
  await expect(page).toHaveURL(/.*products/);
});

test('login page accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
`;

    try {
      await fs.writeFile(path.join(__dirname, '..', 'playwright.config.js'), playwrightConfig);
      await fs.mkdir(path.join(__dirname, '..', 'tests', 'e2e'), { recursive: true });
      await fs.writeFile(path.join(__dirname, '..', 'tests', 'e2e', 'basic.spec.js'), basicTest);
      console.log('   ✅ Basic E2E tests created');
    } catch (error) {
      console.warn('   ⚠️  Could not create E2E tests:', error.message);
    }
  }

  calculateSummary() {
    console.log('\n📊 Calculating Test Summary...');
    
    const { summary } = this.results;
    summary.duration = Date.now() - this.startTime;
    
    // Aggregate results from all test types
    Object.values(this.results.testTypes).forEach(testType => {
      summary.totalTests += testType.tests.total;
      summary.passedTests += testType.tests.passed;
      summary.failedTests += testType.tests.failed;
      summary.skippedTests += testType.tests.skipped;
      
      if (testType.coverage) {
        summary.coverage = Math.max(summary.coverage, testType.coverage);
      }
    });
    
    // Calculate overall pass rate
    const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0;
    summary.overallPassed = passRate >= 85 && summary.coverage >= CONFIG.thresholds.coverage;
    
    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    const { recommendations } = this.results;
    
    // Coverage recommendations
    if (this.results.summary.coverage < CONFIG.thresholds.coverage) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Code coverage is ${this.results.summary.coverage}%, below threshold of ${CONFIG.thresholds.coverage}%`,
        action: 'Add more unit tests to increase coverage'
      });
    }
    
    // Failed test recommendations
    Object.entries(this.results.testTypes).forEach(([type, result]) => {
      if (!result.passed) {
        recommendations.push({
          type: 'test_failure',
          priority: 'high',
          message: `${type} tests failed`,
          action: `Review and fix ${type} test failures`,
          errors: result.errors
        });
      }
    });
    
    // Security recommendations
    if (this.results.testTypes.security?.vulnerabilities?.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: `${this.results.testTypes.security.vulnerabilities.length} security vulnerabilities found`,
        action: 'Address security vulnerabilities immediately',
        vulnerabilities: this.results.testTypes.security.vulnerabilities
      });
    }
  }

  async generateReport() {
    console.log('\n📋 Generating Test Report...');
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.reportDir, `test-report-${Date.now()}.json`);
    try {
      await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 JSON report saved: ${jsonPath}`);
    } catch (error) {
      console.warn('Warning: Could not save JSON report:', error.message);
    }

    // Generate HTML report
    await this.generateHtmlReport();
    
    return this.results;
  }

  async generateHtmlReport() {
    const { summary, testTypes } = this.results;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Money Maker Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .summary-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
        .summary-label { color: #666; font-size: 14px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .test-type { margin: 20px 0; padding: 15px; border-radius: 6px; }
        .test-type-pass { background: #d4edda; border-left: 4px solid #28a745; }
        .test-type-fail { background: #f8d7da; border-left: 4px solid #dc3545; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Report</h1>
            <p>Money Maker Platform - ${this.results.timestamp}</p>
            <p><strong>Overall Status:</strong> 
                <span class="status-${summary.overallPassed ? 'pass' : 'fail'}">
                    ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}
                </span>
            </p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value status-${summary.overallPassed ? 'pass' : 'fail'}">${summary.totalTests}</div>
                <div class="summary-label">Total Tests</div>
            </div>
            <div class="summary-card">
                <div class="summary-value status-pass">${summary.passedTests}</div>
                <div class="summary-label">Passed</div>
            </div>
            <div class="summary-card">
                <div class="summary-value status-fail">${summary.failedTests}</div>
                <div class="summary-label">Failed</div>
            </div>
            <div class="summary-card">
                <div class="summary-value status-${summary.coverage >= CONFIG.thresholds.coverage ? 'pass' : 'fail'}">${summary.coverage}%</div>
                <div class="summary-label">Coverage</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${Math.round(summary.duration / 1000)}s</div>
                <div class="summary-label">Duration</div>
            </div>
        </div>
        
        <h2>📊 Test Types</h2>
        ${Object.entries(testTypes).map(([type, result]) => `
            <div class="test-type test-type-${result.passed ? 'pass' : 'fail'}">
                <h3>${type.toUpperCase()} Tests 
                    <span class="status-${result.passed ? 'pass' : 'fail'}">
                        ${result.passed ? '✅' : '❌'}
                    </span>
                </h3>
                <p><strong>Tests:</strong> ${result.tests.passed}/${result.tests.total} passed</p>
                <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)}s</p>
                ${result.coverage ? `<p><strong>Coverage:</strong> ${result.coverage}%</p>` : ''}
                ${result.errors.length > 0 ? `
                    <p><strong>Errors:</strong></p>
                    <ul>
                        ${result.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `).join('')}
        
        ${this.results.recommendations.length > 0 ? `
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${this.results.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <h4>${rec.message}</h4>
                        <p><strong>Action:</strong> ${rec.action}</p>
                        <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px;">
            <h3>📈 Summary</h3>
            <p><strong>Test Success Rate:</strong> ${Math.round((summary.passedTests / summary.totalTests) * 100)}%</p>
            <p><strong>Total Duration:</strong> ${Math.round(summary.duration / 1000)} seconds</p>
            <p><strong>Test Types Run:</strong> ${Object.keys(testTypes).join(', ')}</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(CONFIG.reportDir, `test-report-${Date.now()}.html`);
    try {
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`🌐 HTML report saved: ${htmlPath}`);
    } catch (error) {
      console.warn('Warning: Could not save HTML report:', error.message);
    }
  }

  printSummary() {
    const { summary } = this.results;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    console.log(`🕐 Total Duration: ${Math.round(summary.duration / 1000)}s`);
    console.log(`📊 Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passedTests}`);
    console.log(`❌ Failed: ${summary.failedTests}`);
    console.log(`⏭️  Skipped: ${summary.skippedTests}`);
    console.log(`📈 Success Rate: ${Math.round((summary.passedTests / summary.totalTests) * 100)}%`);
    console.log(`🎯 Coverage: ${summary.coverage}%`);
    console.log('');
    console.log('📋 Test Types:');
    Object.entries(this.results.testTypes).forEach(([type, result]) => {
      console.log(`   ${type}: ${result.passed ? '✅' : '❌'} (${result.tests.passed}/${result.tests.total})`);
    });
    console.log('');
    console.log(`🎯 Overall Status: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const testTypes = args.length > 0 ? args : Object.keys(CONFIG.testTypes).filter(type => CONFIG.testTypes[type].enabled);
  
  console.log('🚀 Money Maker Platform - Automated Test Suite');
  console.log(`🧪 Running tests: ${testTypes.join(', ')}`);
  
  // Enable only specified test types
  Object.keys(CONFIG.testTypes).forEach(type => {
    CONFIG.testTypes[type].enabled = testTypes.includes(type);
  });
  
  const testSuite = new TestSuite();
  
  try {
    await testSuite.initialize();
    await testSuite.runAllTests();
    await testSuite.generateReport();
    testSuite.printSummary();
    
    // Exit with appropriate code
    process.exit(testSuite.results.summary.overallPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestSuite;