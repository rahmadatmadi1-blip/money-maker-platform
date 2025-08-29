#!/usr/bin/env node

/**
 * Production Configuration Test Script
 * Tests all environment variables and configurations for production deployment
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ProductionConfigTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.config = {};
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(`❌ ${message}`, 'red');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`⚠️  ${message}`, 'yellow');
  }

  success(message) {
    this.passed.push(message);
    this.log(`✅ ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  // Load environment variables from .env.production
  loadEnvironmentConfig() {
    this.log('\n🔍 Loading Production Configuration...', 'cyan');
    
    const envPath = path.join(__dirname, '..', '.env.production');
    const templatePath = path.join(__dirname, '..', '.env.production.template');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(templatePath)) {
        this.warning('.env.production not found. Template available at .env.production.template');
        this.info('Run: cp .env.production.template .env.production');
      } else {
        this.error('.env.production file not found');
      }
      return false;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          this.config[key] = value;
        }
      });

      this.success(`Loaded ${Object.keys(this.config).length} environment variables`);
      return true;
    } catch (error) {
      this.error(`Failed to load .env.production: ${error.message}`);
      return false;
    }
  }

  // Test required environment variables
  testRequiredVariables() {
    this.log('\n🔧 Testing Required Environment Variables...', 'cyan');
    
    const requiredVars = {
      // Frontend
      'REACT_APP_API_URL': 'API URL for frontend',
      'REACT_APP_CLIENT_URL': 'Client URL for frontend',
      
      // Backend
      'MONGODB_URI': 'MongoDB connection string',
      'JWT_SECRET': 'JWT secret key',
      'STRIPE_SECRET_KEY': 'Stripe secret key',
      'CLIENT_URL': 'Client URL for CORS',
      
      // Email
      'SENDGRID_API_KEY': 'SendGrid API key (if using SendGrid)',
      'EMAIL_FROM': 'From email address'
    };

    Object.entries(requiredVars).forEach(([key, description]) => {
      if (this.config[key]) {
        if (this.config[key].includes('your-') || this.config[key].includes('XXXXXXXXXX')) {
          this.warning(`${key}: Contains placeholder value - ${description}`);
        } else {
          this.success(`${key}: Configured - ${description}`);
        }
      } else {
        this.error(`${key}: Missing - ${description}`);
      }
    });
  }

  // Test URL formats
  testURLFormats() {
    this.log('\n🌐 Testing URL Formats...', 'cyan');
    
    const urlVars = [
      'REACT_APP_API_URL',
      'REACT_APP_CLIENT_URL',
      'CLIENT_URL',
      'MONGODB_URI'
    ];

    urlVars.forEach(key => {
      const url = this.config[key];
      if (url) {
        try {
          new URL(url);
          this.success(`${key}: Valid URL format`);
        } catch (error) {
          this.error(`${key}: Invalid URL format - ${url}`);
        }
      }
    });
  }

  // Test security configurations
  testSecurityConfig() {
    this.log('\n🔒 Testing Security Configuration...', 'cyan');
    
    // JWT Secret strength
    const jwtSecret = this.config['JWT_SECRET'];
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        this.warning('JWT_SECRET: Should be at least 32 characters long');
      } else {
        this.success('JWT_SECRET: Adequate length');
      }
    }

    // Check for development values in production
    const devIndicators = ['localhost', '127.0.0.1', 'test', 'dev', 'development'];
    Object.entries(this.config).forEach(([key, value]) => {
      devIndicators.forEach(indicator => {
        if (value.toLowerCase().includes(indicator)) {
          this.warning(`${key}: Contains development indicator '${indicator}'`);
        }
      });
    });

    // Check HTTPS usage
    const urlKeys = ['REACT_APP_API_URL', 'REACT_APP_CLIENT_URL', 'CLIENT_URL'];
    urlKeys.forEach(key => {
      const url = this.config[key];
      if (url && !url.startsWith('https://')) {
        this.warning(`${key}: Should use HTTPS in production`);
      }
    });
  }

  // Test API connectivity
  async testAPIConnectivity() {
    this.log('\n🔌 Testing API Connectivity...', 'cyan');
    
    const apiUrl = this.config['REACT_APP_API_URL'];
    if (!apiUrl) {
      this.error('REACT_APP_API_URL not configured');
      return;
    }

    try {
      const healthUrl = `${apiUrl}/api/health`;
      await this.makeRequest(healthUrl);
      this.success('API health endpoint accessible');
    } catch (error) {
      this.warning(`API health endpoint not accessible: ${error.message}`);
      this.info('This is normal if the API is not yet deployed');
    }
  }

  // Test domain configuration
  async testDomainConfig() {
    this.log('\n🌍 Testing Domain Configuration...', 'cyan');
    
    const clientUrl = this.config['REACT_APP_CLIENT_URL'];
    if (!clientUrl) {
      this.error('REACT_APP_CLIENT_URL not configured');
      return;
    }

    try {
      const url = new URL(clientUrl);
      const domain = url.hostname;
      
      // Test DNS resolution
      try {
        execSync(`nslookup ${domain}`, { stdio: 'pipe' });
        this.success(`DNS resolution working for ${domain}`);
      } catch (error) {
        this.warning(`DNS resolution failed for ${domain}`);
      }

      // Test HTTPS accessibility
      try {
        await this.makeRequest(clientUrl);
        this.success('Domain accessible via HTTPS');
      } catch (error) {
        this.warning(`Domain not accessible: ${error.message}`);
      }
    } catch (error) {
      this.error(`Invalid client URL: ${clientUrl}`);
    }
  }

  // Test file configurations
  testFileConfigurations() {
    this.log('\n📁 Testing File Configurations...', 'cyan');
    
    const configFiles = [
      { path: 'vercel.json', description: 'Vercel configuration' },
      { path: 'package.json', description: 'Package configuration' },
      { path: 'client/package.json', description: 'Client package configuration' },
      { path: 'server/package.json', description: 'Server package configuration' }
    ];

    configFiles.forEach(({ path: filePath, description }) => {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        this.success(`${description}: Found`);
        
        // Validate JSON files
        if (filePath.endsWith('.json')) {
          try {
            JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            this.success(`${description}: Valid JSON`);
          } catch (error) {
            this.error(`${description}: Invalid JSON - ${error.message}`);
          }
        }
      } else {
        this.error(`${description}: Not found at ${filePath}`);
      }
    });
  }

  // Test build configuration
  testBuildConfig() {
    this.log('\n🏗️  Testing Build Configuration...', 'cyan');
    
    try {
      // Check if build directory exists
      const buildPath = path.join(__dirname, '..', 'client', 'build');
      if (fs.existsSync(buildPath)) {
        this.success('Build directory exists');
        
        // Check build files
        const indexPath = path.join(buildPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          this.success('Build index.html exists');
        } else {
          this.warning('Build index.html not found - run npm run build');
        }
      } else {
        this.warning('Build directory not found - run npm run build');
      }

      // Test build script
      const packagePath = path.join(__dirname, '..', 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageJson.scripts && packageJson.scripts.build) {
          this.success('Build script configured');
        } else {
          this.error('Build script not found in package.json');
        }
      }
    } catch (error) {
      this.error(`Build configuration test failed: ${error.message}`);
    }
  }

  // Helper method to make HTTP requests
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https://') ? https : http;
      const request = client.get(url, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve(response);
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });
      
      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // Generate report
  generateReport() {
    this.log('\n📊 Test Report', 'magenta');
    this.log('='.repeat(50), 'magenta');
    
    this.log(`\n✅ Passed: ${this.passed.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'yellow');
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'yellow'));
    }

    if (this.errors.length > 0) {
      this.log('\n❌ Errors:', 'red');
      this.errors.forEach(error => this.log(`  • ${error}`, 'red'));
    }

    this.log('\n📋 Next Steps:', 'cyan');
    if (this.errors.length > 0) {
      this.log('  1. Fix all errors before deploying to production', 'red');
      this.log('  2. Review and address warnings', 'yellow');
    } else if (this.warnings.length > 0) {
      this.log('  1. Review and address warnings for optimal security', 'yellow');
      this.log('  2. Configuration ready for production deployment', 'green');
    } else {
      this.log('  🎉 All tests passed! Ready for production deployment', 'green');
    }

    this.log('\n🚀 Deployment Commands:', 'cyan');
    this.log('  Frontend: npm run deploy-vercel', 'blue');
    this.log('  Backend: railway up', 'blue');
    this.log('  Full: npm run setup-production', 'blue');
  }

  // Run all tests
  async runAllTests() {
    this.log('🧪 Production Configuration Test Suite', 'magenta');
    this.log('='.repeat(50), 'magenta');
    
    // Load configuration
    if (!this.loadEnvironmentConfig()) {
      this.generateReport();
      return;
    }

    // Run tests
    this.testRequiredVariables();
    this.testURLFormats();
    this.testSecurityConfig();
    this.testFileConfigurations();
    this.testBuildConfig();
    
    // Async tests
    await this.testAPIConnectivity();
    await this.testDomainConfig();
    
    // Generate report
    this.generateReport();
    
    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new ProductionConfigTester();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Production Configuration Tester

Usage:
  node test-production-config.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Show verbose output

Examples:
  node test-production-config.js
  npm run test-env
`);
    process.exit(0);
  }
  
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionConfigTester;