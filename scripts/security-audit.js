#!/usr/bin/env node

/**
 * Security Audit dan Vulnerability Scanner untuk Money Maker Platform
 * 
 * Script ini menangani:
 * 1. Dependency vulnerability scanning
 * 2. Code security analysis
 * 3. Configuration security checks
 * 4. API security testing
 * 5. Authentication & authorization testing
 * 6. SSL/TLS security validation
 * 7. Database security assessment
 * 8. File permission auditing
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const axios = require('axios');

// Configuration
const CONFIG = {
  security: {
    baseDir: path.join(__dirname, '..'),
    reportDir: path.join(__dirname, '..', 'security-reports'),
    thresholds: {
      critical: 0,    // No critical vulnerabilities allowed
      high: 2,        // Max 2 high severity vulnerabilities
      medium: 10,     // Max 10 medium severity vulnerabilities
      low: 50         // Max 50 low severity vulnerabilities
    },
    scanTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    excludePatterns: [
      'node_modules',
      '.git',
      'logs',
      'tmp',
      '*.log',
      '*.tmp'
    ]
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
    testEndpoints: [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/users/profile',
      '/api/products',
      '/api/orders',
      '/api/payments',
      '/api/health'
    ],
    authToken: null,
    testCredentials: {
      email: 'security-test@example.com',
      password: 'TestPassword123!'
    }
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker',
    testQueries: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "<script>alert('xss')</script>",
      "../../../etc/passwd"
    ]
  },
  ssl: {
    domains: [
      process.env.FRONTEND_URL,
      process.env.API_URL,
      process.env.CUSTOM_DOMAIN
    ].filter(Boolean),
    minTlsVersion: 'TLSv1.2',
    requiredCiphers: [
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256'
    ]
  },
  notifications: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_SECURITY_CHANNEL || '#security'
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      recipients: (process.env.SECURITY_NOTIFICATION_EMAILS || '').split(',').filter(Boolean)
    }
  }
};

class SecurityAuditor {
  constructor(options = {}) {
    this.options = {
      scanType: 'full', // full, dependencies, code, api, ssl, database
      severity: 'all',  // all, critical, high, medium, low
      fix: false,       // Auto-fix vulnerabilities where possible
      report: true,     // Generate detailed report
      notify: true,     // Send notifications
      ...options
    };
    
    this.auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = null;
    this.results = {
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      vulnerabilities: [],
      recommendations: [],
      fixes: []
    };
    this.logs = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.logs.push(logEntry);
    
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async runSecurityAudit() {
    this.startTime = Date.now();
    
    try {
      this.log(`🔒 Starting security audit (${this.auditId})`, 'info');
      
      // Create report directory
      await this.ensureReportDirectory();
      
      // Run security scans based on type
      switch (this.options.scanType) {
        case 'dependencies':
          await this.scanDependencies();
          break;
        case 'code':
          await this.scanCode();
          break;
        case 'api':
          await this.scanAPI();
          break;
        case 'ssl':
          await this.scanSSL();
          break;
        case 'database':
          await this.scanDatabase();
          break;
        case 'full':
        default:
          await this.runFullAudit();
          break;
      }
      
      // Apply auto-fixes if enabled
      if (this.options.fix) {
        await this.applyFixes();
      }
      
      // Generate report
      if (this.options.report) {
        await this.generateReport();
      }
      
      // Send notifications
      if (this.options.notify) {
        await this.sendNotifications();
      }
      
      // Check if audit passed thresholds
      const passed = this.checkSecurityThresholds();
      
      const duration = Date.now() - this.startTime;
      this.log(`🎯 Security audit completed in ${Math.round(duration / 1000)}s`, passed ? 'success' : 'warning');
      
      return {
        success: passed,
        auditId: this.auditId,
        results: this.results,
        duration,
        logs: this.logs
      };
      
    } catch (error) {
      this.log(`💥 Security audit failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async ensureReportDirectory() {
    await fs.mkdir(CONFIG.security.reportDir, { recursive: true });
    this.log(`📁 Report directory: ${CONFIG.security.reportDir}`, 'debug');
  }

  async runFullAudit() {
    this.log('🔍 Running comprehensive security audit...', 'info');
    
    const scans = [
      { name: 'Dependencies', fn: () => this.scanDependencies() },
      { name: 'Code Security', fn: () => this.scanCode() },
      { name: 'API Security', fn: () => this.scanAPI() },
      { name: 'SSL/TLS', fn: () => this.scanSSL() },
      { name: 'Database Security', fn: () => this.scanDatabase() },
      { name: 'File Permissions', fn: () => this.scanFilePermissions() },
      { name: 'Configuration', fn: () => this.scanConfiguration() }
    ];
    
    for (const scan of scans) {
      try {
        this.log(`🔎 Running ${scan.name} scan...`, 'info');
        await scan.fn();
        this.log(`✅ ${scan.name} scan completed`, 'success');
      } catch (error) {
        this.log(`❌ ${scan.name} scan failed: ${error.message}`, 'error');
        this.addVulnerability({
          type: 'scan_error',
          severity: 'medium',
          title: `${scan.name} Scan Failed`,
          description: error.message,
          category: 'infrastructure'
        });
      }
    }
  }

  async scanDependencies() {
    this.log('📦 Scanning dependencies for vulnerabilities...', 'info');
    
    try {
      // Run npm audit
      const auditResult = await this.executeCommand('npm audit --json', CONFIG.security.scanTimeout);
      const auditData = JSON.parse(auditResult);
      
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
          this.addVulnerability({
            type: 'dependency',
            severity: vuln.severity,
            title: `${pkg}: ${vuln.title}`,
            description: vuln.overview,
            package: pkg,
            version: vuln.range,
            cve: vuln.cves,
            category: 'dependencies',
            fix: vuln.fixAvailable ? `npm update ${pkg}` : null
          });
        });
      }
      
      // Run yarn audit if yarn.lock exists
      try {
        await fs.access(path.join(CONFIG.security.baseDir, 'yarn.lock'));
        const yarnResult = await this.executeCommand('yarn audit --json', CONFIG.security.scanTimeout);
        // Process yarn audit results
      } catch (error) {
        // yarn.lock doesn't exist or yarn audit failed
      }
      
      // Check for known vulnerable packages
      await this.checkKnownVulnerablePackages();
      
    } catch (error) {
      throw new Error(`Dependency scan failed: ${error.message}`);
    }
  }

  async checkKnownVulnerablePackages() {
    const packageJsonPath = path.join(CONFIG.security.baseDir, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      // Known vulnerable packages to check
      const knownVulnerable = {
        'lodash': { versions: ['<4.17.21'], severity: 'high' },
        'moment': { versions: ['*'], severity: 'medium', reason: 'Deprecated, use date-fns or dayjs' },
        'request': { versions: ['*'], severity: 'medium', reason: 'Deprecated' },
        'node-sass': { versions: ['*'], severity: 'low', reason: 'Deprecated, use sass' }
      };
      
      Object.entries(allDeps).forEach(([pkg, version]) => {
        if (knownVulnerable[pkg]) {
          const vuln = knownVulnerable[pkg];
          this.addVulnerability({
            type: 'known_vulnerable',
            severity: vuln.severity,
            title: `Known Vulnerable Package: ${pkg}`,
            description: vuln.reason || 'Package has known security issues',
            package: pkg,
            version,
            category: 'dependencies',
            recommendation: `Consider replacing ${pkg} with a secure alternative`
          });
        }
      });
      
    } catch (error) {
      this.log(`⚠️ Could not check known vulnerable packages: ${error.message}`, 'warning');
    }
  }

  async scanCode() {
    this.log('🔍 Scanning code for security issues...', 'info');
    
    try {
      // Scan for hardcoded secrets
      await this.scanForSecrets();
      
      // Scan for SQL injection vulnerabilities
      await this.scanForSQLInjection();
      
      // Scan for XSS vulnerabilities
      await this.scanForXSS();
      
      // Scan for insecure file operations
      await this.scanForInsecureFileOps();
      
      // Scan for weak cryptography
      await this.scanForWeakCrypto();
      
      // Scan for insecure configurations
      await this.scanForInsecureConfig();
      
    } catch (error) {
      throw new Error(`Code security scan failed: ${error.message}`);
    }
  }

  async scanForSecrets() {
    const secretPatterns = [
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
      { name: 'AWS Secret Key', pattern: /[0-9a-zA-Z/+]{40}/, severity: 'critical' },
      { name: 'API Key', pattern: /api[_-]?key[\s]*[:=][\s]*['"]?[0-9a-zA-Z]{32,}['"]?/i, severity: 'high' },
      { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, severity: 'high' },
      { name: 'Database URL', pattern: /mongodb:\/\/[^\s]+/i, severity: 'medium' },
      { name: 'Password', pattern: /password[\s]*[:=][\s]*['"][^'"\s]{8,}['"]?/i, severity: 'medium' }
    ];
    
    const files = await this.getCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          secretPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'hardcoded_secret',
                severity: pattern.severity,
                title: `Hardcoded ${pattern.name} Found`,
                description: `Potential ${pattern.name.toLowerCase()} found in source code`,
                file: path.relative(CONFIG.security.baseDir, file),
                line: index + 1,
                category: 'secrets',
                recommendation: `Move ${pattern.name.toLowerCase()} to environment variables`
              });
            }
          });
        });
        
      } catch (error) {
        this.log(`⚠️ Could not scan file ${file}: ${error.message}`, 'warning');
      }
    }
  }

  async scanForSQLInjection() {
    const sqlPatterns = [
      { pattern: /\$\{[^}]*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/i, severity: 'high' },
      { pattern: /['"]\s*\+\s*.*\s*\+\s*['"].*(?:SELECT|INSERT|UPDATE|DELETE)/i, severity: 'high' },
      { pattern: /query\s*\([^)]*\$\{[^}]*\}/i, severity: 'medium' },
      { pattern: /exec\s*\([^)]*\$\{[^}]*\}/i, severity: 'high' }
    ];
    
    const files = await this.getCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          sqlPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'sql_injection',
                severity: pattern.severity,
                title: 'Potential SQL Injection',
                description: 'Code may be vulnerable to SQL injection attacks',
                file: path.relative(CONFIG.security.baseDir, file),
                line: index + 1,
                category: 'injection',
                recommendation: 'Use parameterized queries or prepared statements'
              });
            }
          });
        });
        
      } catch (error) {
        this.log(`⚠️ Could not scan file ${file}: ${error.message}`, 'warning');
      }
    }
  }

  async scanForXSS() {
    const xssPatterns = [
      { pattern: /innerHTML\s*=\s*.*\$\{[^}]*\}/i, severity: 'high' },
      { pattern: /document\.write\s*\([^)]*\$\{[^}]*\}/i, severity: 'high' },
      { pattern: /eval\s*\([^)]*\$\{[^}]*\}/i, severity: 'critical' },
      { pattern: /dangerouslySetInnerHTML/i, severity: 'medium' }
    ];
    
    const files = await this.getCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          xssPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'xss',
                severity: pattern.severity,
                title: 'Potential XSS Vulnerability',
                description: 'Code may be vulnerable to cross-site scripting attacks',
                file: path.relative(CONFIG.security.baseDir, file),
                line: index + 1,
                category: 'injection',
                recommendation: 'Sanitize user input and use safe DOM manipulation methods'
              });
            }
          });
        });
        
      } catch (error) {
        this.log(`⚠️ Could not scan file ${file}: ${error.message}`, 'warning');
      }
    }
  }

  async scanForInsecureFileOps() {
    const fileOpPatterns = [
      { pattern: /fs\.readFile\s*\([^)]*\$\{[^}]*\}/i, severity: 'medium' },
      { pattern: /fs\.writeFile\s*\([^)]*\$\{[^}]*\}/i, severity: 'medium' },
      { pattern: /path\.join\s*\([^)]*\$\{[^}]*\}/i, severity: 'low' },
      { pattern: /require\s*\([^)]*\$\{[^}]*\}/i, severity: 'high' }
    ];
    
    const files = await this.getCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          fileOpPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'insecure_file_op',
                severity: pattern.severity,
                title: 'Insecure File Operation',
                description: 'File operation may be vulnerable to path traversal attacks',
                file: path.relative(CONFIG.security.baseDir, file),
                line: index + 1,
                category: 'file_system',
                recommendation: 'Validate and sanitize file paths before use'
              });
            }
          });
        });
        
      } catch (error) {
        this.log(`⚠️ Could not scan file ${file}: ${error.message}`, 'warning');
      }
    }
  }

  async scanForWeakCrypto() {
    const cryptoPatterns = [
      { pattern: /md5/i, severity: 'medium', reason: 'MD5 is cryptographically broken' },
      { pattern: /sha1/i, severity: 'medium', reason: 'SHA1 is deprecated' },
      { pattern: /des/i, severity: 'high', reason: 'DES encryption is weak' },
      { pattern: /rc4/i, severity: 'high', reason: 'RC4 cipher is insecure' }
    ];
    
    const files = await this.getCodeFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          cryptoPatterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'weak_crypto',
                severity: pattern.severity,
                title: 'Weak Cryptographic Algorithm',
                description: pattern.reason,
                file: path.relative(CONFIG.security.baseDir, file),
                line: index + 1,
                category: 'cryptography',
                recommendation: 'Use stronger cryptographic algorithms (SHA-256, AES-256)'
              });
            }
          });
        });
        
      } catch (error) {
        this.log(`⚠️ Could not scan file ${file}: ${error.message}`, 'warning');
      }
    }
  }

  async scanForInsecureConfig() {
    // Check for insecure configurations in various config files
    const configFiles = [
      { file: '.env', patterns: [
        { pattern: /NODE_ENV\s*=\s*development/i, severity: 'medium', desc: 'Development mode in production' },
        { pattern: /DEBUG\s*=\s*true/i, severity: 'low', desc: 'Debug mode enabled' }
      ]},
      { file: 'package.json', patterns: [
        { pattern: /"private"\s*:\s*false/i, severity: 'low', desc: 'Package not marked as private' }
      ]}
    ];
    
    for (const config of configFiles) {
      try {
        const filePath = path.join(CONFIG.security.baseDir, config.file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          config.patterns.forEach(pattern => {
            if (pattern.pattern.test(line)) {
              this.addVulnerability({
                type: 'insecure_config',
                severity: pattern.severity,
                title: 'Insecure Configuration',
                description: pattern.desc,
                file: config.file,
                line: index + 1,
                category: 'configuration',
                recommendation: 'Review and secure configuration settings'
              });
            }
          });
        });
        
      } catch (error) {
        // Config file might not exist
      }
    }
  }

  async getCodeFiles() {
    const files = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    
    async function scanDirectory(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!CONFIG.security.excludePatterns.some(pattern => 
              entry.name.includes(pattern.replace('*', ''))
            )) {
              await scanDirectory(fullPath);
            }
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not be accessible
      }
    }
    
    await scanDirectory(CONFIG.security.baseDir);
    return files;
  }

  async scanAPI() {
    this.log('🌐 Testing API security...', 'info');
    
    try {
      // Test authentication endpoints
      await this.testAuthenticationSecurity();
      
      // Test authorization
      await this.testAuthorizationSecurity();
      
      // Test input validation
      await this.testInputValidation();
      
      // Test rate limiting
      await this.testRateLimiting();
      
      // Test CORS configuration
      await this.testCORSConfiguration();
      
      // Test security headers
      await this.testSecurityHeaders();
      
    } catch (error) {
      throw new Error(`API security scan failed: ${error.message}`);
    }
  }

  async testAuthenticationSecurity() {
    const authTests = [
      {
        name: 'Weak Password Policy',
        test: async () => {
          const weakPasswords = ['123456', 'password', 'admin', 'test'];
          
          for (const password of weakPasswords) {
            try {
              const response = await axios.post(`${CONFIG.api.baseUrl}/api/auth/register`, {
                email: `test-${Date.now()}@example.com`,
                password,
                name: 'Test User'
              });
              
              if (response.status === 200 || response.status === 201) {
                this.addVulnerability({
                  type: 'weak_password_policy',
                  severity: 'medium',
                  title: 'Weak Password Policy',
                  description: `System accepts weak password: ${password}`,
                  category: 'authentication',
                  recommendation: 'Implement strong password policy'
                });
              }
            } catch (error) {
              // Expected to fail with weak passwords
            }
          }
        }
      },
      {
        name: 'SQL Injection in Login',
        test: async () => {
          const injectionPayloads = CONFIG.database.testQueries;
          
          for (const payload of injectionPayloads) {
            try {
              const response = await axios.post(`${CONFIG.api.baseUrl}/api/auth/login`, {
                email: payload,
                password: payload
              });
              
              if (response.status === 200) {
                this.addVulnerability({
                  type: 'sql_injection_auth',
                  severity: 'critical',
                  title: 'SQL Injection in Authentication',
                  description: `Authentication endpoint vulnerable to SQL injection`,
                  category: 'injection',
                  recommendation: 'Use parameterized queries and input validation'
                });
              }
            } catch (error) {
              // Expected to fail with injection attempts
            }
          }
        }
      }
    ];
    
    for (const test of authTests) {
      try {
        await test.test();
      } catch (error) {
        this.log(`⚠️ Auth test '${test.name}' failed: ${error.message}`, 'warning');
      }
    }
  }

  async testAuthorizationSecurity() {
    // Test for broken access control
    const protectedEndpoints = [
      '/api/users/profile',
      '/api/admin/users',
      '/api/orders',
      '/api/payments'
    ];
    
    for (const endpoint of protectedEndpoints) {
      try {
        // Test without authentication
        const response = await axios.get(`${CONFIG.api.baseUrl}${endpoint}`);
        
        if (response.status === 200) {
          this.addVulnerability({
            type: 'broken_access_control',
            severity: 'high',
            title: 'Broken Access Control',
            description: `Protected endpoint ${endpoint} accessible without authentication`,
            category: 'authorization',
            recommendation: 'Implement proper authentication checks'
          });
        }
      } catch (error) {
        // Expected to fail without auth
      }
    }
  }

  async testInputValidation() {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>'
    ];
    
    // Test XSS in various endpoints
    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${CONFIG.api.baseUrl}/api/auth/register`, {
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: payload
        });
        
        if (response.data && response.data.toString().includes(payload)) {
          this.addVulnerability({
            type: 'xss_vulnerability',
            severity: 'high',
            title: 'Cross-Site Scripting (XSS)',
            description: 'Application reflects user input without proper sanitization',
            category: 'injection',
            recommendation: 'Implement input validation and output encoding'
          });
        }
      } catch (error) {
        // May fail due to validation
      }
    }
  }

  async testRateLimiting() {
    const endpoint = `${CONFIG.api.baseUrl}/api/auth/login`;
    const requests = [];
    
    // Send multiple requests quickly
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.post(endpoint, {
          email: 'test@example.com',
          password: 'wrongpassword'
        }).catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const successfulRequests = responses.filter(r => r && r.status !== 429).length;
    
    if (successfulRequests > 10) {
      this.addVulnerability({
        type: 'no_rate_limiting',
        severity: 'medium',
        title: 'Missing Rate Limiting',
        description: 'API endpoints do not implement rate limiting',
        category: 'configuration',
        recommendation: 'Implement rate limiting to prevent abuse'
      });
    }
  }

  async testCORSConfiguration() {
    try {
      const response = await axios.options(`${CONFIG.api.baseUrl}/api/health`);
      const corsHeader = response.headers['access-control-allow-origin'];
      
      if (corsHeader === '*') {
        this.addVulnerability({
          type: 'insecure_cors',
          severity: 'medium',
          title: 'Insecure CORS Configuration',
          description: 'CORS allows requests from any origin (*)',
          category: 'configuration',
          recommendation: 'Configure CORS to allow only trusted origins'
        });
      }
    } catch (error) {
      // CORS test failed
    }
  }

  async testSecurityHeaders() {
    try {
      const response = await axios.get(`${CONFIG.api.baseUrl}/api/health`);
      const headers = response.headers;
      
      const requiredHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': ['DENY', 'SAMEORIGIN'],
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': null // Should exist
      };
      
      Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
        if (!headers[header]) {
          this.addVulnerability({
            type: 'missing_security_header',
            severity: 'low',
            title: `Missing Security Header: ${header}`,
            description: `Security header ${header} is not set`,
            category: 'configuration',
            recommendation: `Add ${header} security header`
          });
        } else if (expectedValue && !expectedValue.includes(headers[header])) {
          this.addVulnerability({
            type: 'incorrect_security_header',
            severity: 'low',
            title: `Incorrect Security Header: ${header}`,
            description: `Security header ${header} has incorrect value`,
            category: 'configuration',
            recommendation: `Set ${header} to appropriate value`
          });
        }
      });
    } catch (error) {
      this.log(`⚠️ Could not test security headers: ${error.message}`, 'warning');
    }
  }

  async scanSSL() {
    this.log('🔒 Testing SSL/TLS security...', 'info');
    
    for (const domain of CONFIG.ssl.domains) {
      if (!domain) continue;
      
      try {
        await this.testSSLConfiguration(domain);
      } catch (error) {
        this.log(`⚠️ SSL test failed for ${domain}: ${error.message}`, 'warning');
      }
    }
  }

  async testSSLConfiguration(domain) {
    return new Promise((resolve, reject) => {
      const url = new URL(domain);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        method: 'GET',
        path: '/'
      };
      
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        const cipher = res.socket.getCipher();
        
        // Check certificate expiration
        const expiryDate = new Date(cert.valid_to);
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 30) {
          this.addVulnerability({
            type: 'ssl_expiring',
            severity: daysUntilExpiry < 7 ? 'high' : 'medium',
            title: 'SSL Certificate Expiring Soon',
            description: `SSL certificate for ${domain} expires in ${daysUntilExpiry} days`,
            category: 'ssl',
            recommendation: 'Renew SSL certificate before expiration'
          });
        }
        
        // Check cipher strength
        if (cipher && cipher.name.includes('RC4')) {
          this.addVulnerability({
            type: 'weak_ssl_cipher',
            severity: 'medium',
            title: 'Weak SSL Cipher',
            description: `Weak cipher ${cipher.name} in use`,
            category: 'ssl',
            recommendation: 'Configure stronger SSL ciphers'
          });
        }
        
        resolve();
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('SSL test timeout')));
      req.end();
    });
  }

  async scanDatabase() {
    this.log('🗄️ Testing database security...', 'info');
    
    try {
      // Test MongoDB connection security
      await this.testDatabaseConnection();
      
      // Test for default credentials
      await this.testDefaultCredentials();
      
      // Test database configuration
      await this.testDatabaseConfiguration();
      
    } catch (error) {
      throw new Error(`Database security scan failed: ${error.message}`);
    }
  }

  async testDatabaseConnection() {
    const uri = CONFIG.database.uri;
    
    // Check if database URI contains credentials
    if (uri.includes('://') && !uri.includes('@')) {
      this.addVulnerability({
        type: 'db_no_auth',
        severity: 'high',
        title: 'Database Without Authentication',
        description: 'Database connection does not use authentication',
        category: 'database',
        recommendation: 'Configure database authentication'
      });
    }
    
    // Check for unencrypted connection
    if (!uri.includes('ssl=true') && !uri.includes('tls=true')) {
      this.addVulnerability({
        type: 'db_unencrypted',
        severity: 'medium',
        title: 'Unencrypted Database Connection',
        description: 'Database connection is not encrypted',
        category: 'database',
        recommendation: 'Enable SSL/TLS for database connections'
      });
    }
  }

  async testDefaultCredentials() {
    const defaultCreds = [
      { username: 'admin', password: 'admin' },
      { username: 'root', password: 'root' },
      { username: 'admin', password: 'password' },
      { username: 'user', password: 'user' }
    ];
    
    // This would require actual database connection testing
    // Implementation depends on database type and connection method
  }

  async testDatabaseConfiguration() {
    // Check for database configuration issues
    // This would involve connecting to the database and checking settings
    // Implementation depends on database type
  }

  async scanFilePermissions() {
    this.log('📁 Checking file permissions...', 'info');
    
    const criticalFiles = [
      '.env',
      'config/database.js',
      'config/keys.js',
      'package.json',
      'server.js',
      'index.js'
    ];
    
    for (const file of criticalFiles) {
      try {
        const filePath = path.join(CONFIG.security.baseDir, file);
        const stats = await fs.stat(filePath);
        const mode = stats.mode;
        
        // Check if file is world-readable (others can read)
        if (mode & 0o004) {
          this.addVulnerability({
            type: 'file_permissions',
            severity: 'medium',
            title: 'Insecure File Permissions',
            description: `File ${file} is world-readable`,
            category: 'file_system',
            recommendation: 'Restrict file permissions to owner only'
          });
        }
        
        // Check if file is world-writable (others can write)
        if (mode & 0o002) {
          this.addVulnerability({
            type: 'file_permissions',
            severity: 'high',
            title: 'Insecure File Permissions',
            description: `File ${file} is world-writable`,
            category: 'file_system',
            recommendation: 'Remove write permissions for others'
          });
        }
        
      } catch (error) {
        // File might not exist
      }
    }
  }

  async scanConfiguration() {
    this.log('⚙️ Checking security configuration...', 'info');
    
    // Check environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'NODE_ENV'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.addVulnerability({
          type: 'missing_env_var',
          severity: 'medium',
          title: `Missing Environment Variable: ${envVar}`,
          description: `Required environment variable ${envVar} is not set`,
          category: 'configuration',
          recommendation: `Set ${envVar} environment variable`
        });
      }
    });
    
    // Check for development mode in production
    if (process.env.NODE_ENV !== 'production') {
      this.addVulnerability({
        type: 'dev_mode_production',
        severity: 'medium',
        title: 'Development Mode in Production',
        description: 'Application is not running in production mode',
        category: 'configuration',
        recommendation: 'Set NODE_ENV=production for production deployments'
      });
    }
  }

  addVulnerability(vulnerability) {
    // Add unique ID
    vulnerability.id = crypto.randomBytes(8).toString('hex');
    vulnerability.timestamp = new Date().toISOString();
    
    this.results.vulnerabilities.push(vulnerability);
    this.results.summary.total++;
    this.results.summary[vulnerability.severity]++;
    
    const emoji = {
      critical: '🚨',
      high: '🔴',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️'
    }[vulnerability.severity] || '⚠️';
    
    this.log(`${emoji} ${vulnerability.severity.toUpperCase()}: ${vulnerability.title}`, vulnerability.severity);
  }

  checkSecurityThresholds() {
    const { summary } = this.results;
    const { thresholds } = CONFIG.security;
    
    if (summary.critical > thresholds.critical) {
      this.log(`🚨 CRITICAL: ${summary.critical} critical vulnerabilities found (max: ${thresholds.critical})`, 'critical');
      return false;
    }
    
    if (summary.high > thresholds.high) {
      this.log(`🔴 HIGH: ${summary.high} high severity vulnerabilities found (max: ${thresholds.high})`, 'error');
      return false;
    }
    
    if (summary.medium > thresholds.medium) {
      this.log(`🟡 MEDIUM: ${summary.medium} medium severity vulnerabilities found (max: ${thresholds.medium})`, 'warning');
      return false;
    }
    
    if (summary.low > thresholds.low) {
      this.log(`🟢 LOW: ${summary.low} low severity vulnerabilities found (max: ${thresholds.low})`, 'warning');
      return false;
    }
    
    this.log(`✅ Security audit passed all thresholds`, 'success');
    return true;
  }

  async applyFixes() {
    this.log('🔧 Applying automatic fixes...', 'info');
    
    const fixableVulns = this.results.vulnerabilities.filter(v => v.fix);
    
    for (const vuln of fixableVulns) {
      try {
        this.log(`🔧 Fixing: ${vuln.title}`, 'info');
        
        if (vuln.fix.startsWith('npm ')) {
          await this.executeCommand(vuln.fix, 120000);
          this.results.fixes.push({
            vulnerability: vuln.id,
            fix: vuln.fix,
            status: 'applied',
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        this.log(`❌ Failed to fix ${vuln.title}: ${error.message}`, 'error');
        this.results.fixes.push({
          vulnerability: vuln.id,
          fix: vuln.fix,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.log(`🔧 Applied ${this.results.fixes.filter(f => f.status === 'applied').length} fixes`, 'success');
  }

  async generateReport() {
    this.log('📊 Generating security report...', 'info');
    
    const reportData = {
      auditId: this.auditId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      options: this.options,
      summary: this.results.summary,
      vulnerabilities: this.results.vulnerabilities,
      fixes: this.results.fixes,
      recommendations: this.generateRecommendations(),
      logs: this.logs
    };
    
    // Generate JSON report
    const jsonReportPath = path.join(CONFIG.security.reportDir, `security-audit-${this.auditId}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReportPath = path.join(CONFIG.security.reportDir, `security-audit-${this.auditId}.html`);
    await this.generateHTMLReport(reportData, htmlReportPath);
    
    this.log(`📊 Reports generated: ${jsonReportPath}, ${htmlReportPath}`, 'success');
    
    return { jsonReportPath, htmlReportPath };
  }

  generateRecommendations() {
    const recommendations = [];
    const { summary } = this.results;
    
    if (summary.critical > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Critical Vulnerabilities Immediately',
        description: 'Critical vulnerabilities pose immediate security risks and should be fixed as soon as possible.'
      });
    }
    
    if (summary.high > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Fix High Severity Issues',
        description: 'High severity vulnerabilities should be addressed in the next security update cycle.'
      });
    }
    
    // Add category-specific recommendations
    const categories = [...new Set(this.results.vulnerabilities.map(v => v.category))];
    
    categories.forEach(category => {
      const categoryVulns = this.results.vulnerabilities.filter(v => v.category === category);
      if (categoryVulns.length > 0) {
        recommendations.push({
          priority: 'medium',
          title: `Improve ${category} Security`,
          description: `${categoryVulns.length} vulnerabilities found in ${category} category. Consider implementing additional security measures.`
        });
      }
    });
    
    return recommendations;
  }

  async generateHTMLReport(data, outputPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Audit Report - ${data.auditId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.critical { border-left-color: #dc3545; }
        .metric.high { border-left-color: #fd7e14; }
        .metric.medium { border-left-color: #ffc107; }
        .metric.low { border-left-color: #28a745; }
        .vulnerability { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #6c757d; }
        .vulnerability.critical { border-left-color: #dc3545; }
        .vulnerability.high { border-left-color: #fd7e14; }
        .vulnerability.medium { border-left-color: #ffc107; }
        .vulnerability.low { border-left-color: #28a745; }
        .severity { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .severity.critical { background: #dc3545; color: white; }
        .severity.high { background: #fd7e14; color: white; }
        .severity.medium { background: #ffc107; color: black; }
        .severity.low { background: #28a745; color: white; }
        .section { margin: 30px 0; }
        .section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .recommendation { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Audit Report</h1>
            <p><strong>Audit ID:</strong> ${data.auditId}</p>
            <p><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${Math.round(data.duration / 1000)}s</p>
            <p><strong>Scan Type:</strong> ${data.options.scanType}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 Summary</h2>
                <div class="summary">
                    <div class="metric">
                        <h3>${data.summary.total}</h3>
                        <p>Total Issues</p>
                    </div>
                    <div class="metric critical">
                        <h3>${data.summary.critical}</h3>
                        <p>Critical</p>
                    </div>
                    <div class="metric high">
                        <h3>${data.summary.high}</h3>
                        <p>High</p>
                    </div>
                    <div class="metric medium">
                        <h3>${data.summary.medium}</h3>
                        <p>Medium</p>
                    </div>
                    <div class="metric low">
                        <h3>${data.summary.low}</h3>
                        <p>Low</p>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🚨 Vulnerabilities</h2>
                ${data.vulnerabilities.map(vuln => `
                    <div class="vulnerability ${vuln.severity}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="margin: 0;">${vuln.title}</h4>
                            <span class="severity ${vuln.severity}">${vuln.severity}</span>
                        </div>
                        <p><strong>Type:</strong> ${vuln.type}</p>
                        <p><strong>Category:</strong> ${vuln.category}</p>
                        <p><strong>Description:</strong> ${vuln.description}</p>
                        ${vuln.file ? `<p><strong>File:</strong> ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}</p>` : ''}
                        ${vuln.recommendation ? `<p><strong>Recommendation:</strong> ${vuln.recommendation}</p>` : ''}
                        ${vuln.fix ? `<p><strong>Fix:</strong> <code>${vuln.fix}</code></p>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="section">
                <h2>💡 Recommendations</h2>
                ${data.recommendations.map(rec => `
                    <div class="recommendation">
                        <h4>${rec.title}</h4>
                        <p>${rec.description}</p>
                    </div>
                `).join('')}
            </div>
            
            ${data.fixes.length > 0 ? `
            <div class="section">
                <h2>🔧 Applied Fixes</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Fix</th>
                            <th>Status</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.fixes.map(fix => `
                            <tr>
                                <td><code>${fix.fix}</code></td>
                                <td>${fix.status === 'applied' ? '✅ Applied' : '❌ Failed'}</td>
                                <td>${new Date(fix.timestamp).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
    
    await fs.writeFile(outputPath, html);
  }

  async sendNotifications() {
    if (this.results.summary.critical > 0 || this.results.summary.high > 0) {
      const message = this.createNotificationMessage();
      
      // Send Slack notification
      if (CONFIG.notifications.slack.enabled) {
        try {
          await this.sendSlackNotification(message);
        } catch (error) {
          this.log(`⚠️ Failed to send Slack notification: ${error.message}`, 'warning');
        }
      }
      
      // Send email notification
      if (CONFIG.notifications.email.enabled && CONFIG.notifications.email.recipients.length > 0) {
        try {
          await this.sendEmailNotification(message);
        } catch (error) {
          this.log(`⚠️ Failed to send email notification: ${error.message}`, 'warning');
        }
      }
    }
  }

  createNotificationMessage() {
    const { summary } = this.results;
    const emoji = summary.critical > 0 ? '🚨' : summary.high > 0 ? '⚠️' : '✅';
    
    let message = `${emoji} Security Audit Completed\n`;
    message += `Audit ID: ${this.auditId}\n`;
    message += `Total Issues: ${summary.total}\n`;
    
    if (summary.critical > 0) message += `🚨 Critical: ${summary.critical}\n`;
    if (summary.high > 0) message += `🔴 High: ${summary.high}\n`;
    if (summary.medium > 0) message += `🟡 Medium: ${summary.medium}\n`;
    if (summary.low > 0) message += `🟢 Low: ${summary.low}\n`;
    
    return message;
  }

  async sendSlackNotification(message) {
    const color = this.results.summary.critical > 0 ? 'danger' : 
                 this.results.summary.high > 0 ? 'warning' : 'good';
    
    const payload = {
      channel: CONFIG.notifications.slack.channel,
      username: 'Security Bot',
      icon_emoji: ':shield:',
      attachments: [{
        color,
        title: 'Money Maker Platform - Security Audit',
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(CONFIG.notifications.slack.webhook, payload);
  }

  async sendEmailNotification(message) {
    // Email notification implementation would go here
    this.log(`📧 Would send email notification to: ${CONFIG.notifications.email.recipients.join(', ')}`, 'debug');
  }

  async executeCommand(command, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: 'pipe' });
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !['audit', 'scan', 'fix'].includes(command)) {
    console.error('❌ Usage: node security-audit.js <command> [options]');
    console.error('\nCommands:');
    console.error('  audit [type]     Run security audit (full, dependencies, code, api, ssl, database)');
    console.error('  scan [type]      Alias for audit');
    console.error('  fix              Apply automatic fixes');
    console.error('\nOptions:');
    console.error('  --severity <level>  Filter by severity (critical, high, medium, low)');
    console.error('  --fix              Apply automatic fixes where possible');
    console.error('  --no-report        Skip report generation');
    console.error('  --no-notify        Skip notifications');
    process.exit(1);
  }
  
  try {
    const scanType = args[1] || 'full';
    const options = {
      scanType,
      severity: args.find(arg => arg.startsWith('--severity='))?.split('=')[1] || 'all',
      fix: args.includes('--fix'),
      report: !args.includes('--no-report'),
      notify: !args.includes('--no-notify')
    };
    
    switch (command) {
      case 'audit':
      case 'scan': {
        const auditor = new SecurityAuditor(options);
        const result = await auditor.runSecurityAudit();
        
        console.log('\n🔒 Security audit completed!');
        console.log(`📋 Audit ID: ${result.auditId}`);
        console.log(`📊 Summary: ${result.results.summary.total} total, ${result.results.summary.critical} critical, ${result.results.summary.high} high`);
        console.log(`⏱️ Duration: ${Math.round(result.duration / 1000)}s`);
        
        if (!result.success) {
          console.log('\n⚠️ Security audit failed - vulnerabilities exceed thresholds');
          process.exit(1);
        }
        break;
      }
      
      case 'fix': {
        const auditor = new SecurityAuditor({ ...options, fix: true });
        await auditor.runSecurityAudit();
        console.log('\n🔧 Security fixes applied!');
        break;
      }
    }
    
  } catch (error) {
    console.error('\n💥 Security audit failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SecurityAuditor };