#!/usr/bin/env node

/**
 * Deployment Automation Script untuk Money Maker Platform
 * 
 * Script ini menangani:
 * 1. Pre-deployment checks
 * 2. Build process
 * 3. Testing
 * 4. Environment-specific deployment
 * 5. Post-deployment verification
 * 6. Rollback capabilities
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  environments: {
    development: {
      name: 'Development',
      url: 'http://localhost:3000',
      apiUrl: 'http://localhost:5000',
      branch: 'develop',
      requiresTests: false,
      requiresApproval: false,
      buildCommand: 'npm run build:dev',
      deployCommand: null // Local development
    },
    staging: {
      name: 'Staging',
      url: process.env.STAGING_URL || 'https://staging.moneymaker.com',
      apiUrl: process.env.STAGING_API_URL || 'https://api-staging.moneymaker.com',
      branch: 'staging',
      requiresTests: true,
      requiresApproval: false,
      buildCommand: 'npm run build:staging',
      deployCommand: 'npm run deploy:staging',
      healthCheck: '/api/health',
      rollbackCommand: 'npm run rollback:staging'
    },
    production: {
      name: 'Production',
      url: process.env.PRODUCTION_URL || 'https://moneymaker.com',
      apiUrl: process.env.PRODUCTION_API_URL || 'https://api.moneymaker.com',
      branch: 'main',
      requiresTests: true,
      requiresApproval: true,
      buildCommand: 'npm run build:production',
      deployCommand: 'npm run deploy:production',
      healthCheck: '/api/health',
      rollbackCommand: 'npm run rollback:production',
      backupCommand: 'npm run backup:production'
    }
  },
  checks: {
    git: true,
    dependencies: true,
    environment: true,
    tests: true,
    security: true,
    performance: false // Optional for faster deployments
  },
  timeouts: {
    build: 600000, // 10 minutes
    test: 300000,  // 5 minutes
    deploy: 900000, // 15 minutes
    healthCheck: 30000 // 30 seconds
  },
  retries: {
    healthCheck: 3,
    deploy: 1
  },
  notifications: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#deployments'
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      recipients: (process.env.DEPLOY_NOTIFICATION_EMAILS || '').split(',')
    }
  }
};

class DeploymentManager {
  constructor(environment, options = {}) {
    this.environment = environment;
    this.config = CONFIG.environments[environment];
    this.options = {
      skipTests: options.skipTests || false,
      skipApproval: options.skipApproval || false,
      dryRun: options.dryRun || false,
      force: options.force || false,
      ...options
    };
    
    this.deploymentId = `deploy-${environment}-${Date.now()}`;
    this.startTime = null;
    this.logs = [];
    this.status = 'pending';
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
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
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async deploy() {
    this.startTime = Date.now();
    this.status = 'running';
    
    try {
      this.log(`🚀 Starting deployment to ${this.config.name}`, 'info');
      this.log(`📋 Deployment ID: ${this.deploymentId}`, 'info');
      
      if (this.options.dryRun) {
        this.log('🧪 DRY RUN MODE - No actual deployment will occur', 'warning');
      }
      
      // Pre-deployment checks
      await this.runPreDeploymentChecks();
      
      // Request approval if required
      if (this.config.requiresApproval && !this.options.skipApproval) {
        await this.requestApproval();
      }
      
      // Backup (production only)
      if (this.environment === 'production' && this.config.backupCommand) {
        await this.createBackup();
      }
      
      // Build application
      await this.buildApplication();
      
      // Run tests if required
      if (this.config.requiresTests && !this.options.skipTests) {
        await this.runTests();
      }
      
      // Deploy application
      if (!this.options.dryRun) {
        await this.deployApplication();
        
        // Post-deployment verification
        await this.verifyDeployment();
        
        // Send success notifications
        await this.sendNotification('success');
      }
      
      this.status = 'success';
      this.log(`🎉 Deployment to ${this.config.name} completed successfully!`, 'success');
      
    } catch (error) {
      this.status = 'failed';
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      
      // Send failure notifications
      await this.sendNotification('failure', error);
      
      // Attempt rollback if not dry run
      if (!this.options.dryRun && this.config.rollbackCommand) {
        await this.attemptRollback();
      }
      
      throw error;
    } finally {
      await this.generateDeploymentReport();
    }
  }

  async runPreDeploymentChecks() {
    this.log('🔍 Running pre-deployment checks...', 'info');
    
    const checks = [
      { name: 'Git Status', check: () => this.checkGitStatus(), enabled: CONFIG.checks.git },
      { name: 'Dependencies', check: () => this.checkDependencies(), enabled: CONFIG.checks.dependencies },
      { name: 'Environment Variables', check: () => this.checkEnvironmentVariables(), enabled: CONFIG.checks.environment },
      { name: 'Security Scan', check: () => this.runSecurityScan(), enabled: CONFIG.checks.security }
    ];
    
    for (const check of checks) {
      if (check.enabled) {
        this.log(`   🔍 Checking ${check.name}...`, 'debug');
        try {
          await check.check();
          this.log(`   ✅ ${check.name} passed`, 'success');
        } catch (error) {
          if (this.options.force) {
            this.log(`   ⚠️ ${check.name} failed but continuing due to --force: ${error.message}`, 'warning');
          } else {
            throw new Error(`Pre-deployment check failed: ${check.name} - ${error.message}`);
          }
        }
      }
    }
    
    this.log('✅ All pre-deployment checks passed', 'success');
  }

  async checkGitStatus() {
    // Check if we're on the correct branch
    const currentBranch = await this.executeCommand('git rev-parse --abbrev-ref HEAD');
    if (currentBranch.trim() !== this.config.branch && !this.options.force) {
      throw new Error(`Expected branch '${this.config.branch}', but on '${currentBranch.trim()}'`);
    }
    
    // Check for uncommitted changes
    const status = await this.executeCommand('git status --porcelain');
    if (status.trim() && !this.options.force) {
      throw new Error('Uncommitted changes detected. Commit or stash changes before deployment.');
    }
    
    // Check if branch is up to date with remote
    try {
      await this.executeCommand('git fetch origin');
      const behind = await this.executeCommand(`git rev-list --count HEAD..origin/${this.config.branch}`);
      if (parseInt(behind.trim()) > 0 && !this.options.force) {
        throw new Error(`Branch is ${behind.trim()} commits behind origin/${this.config.branch}. Pull latest changes.`);
      }
    } catch (error) {
      this.log('⚠️ Could not check remote status (possibly no remote configured)', 'warning');
    }
  }

  async checkDependencies() {
    // Check if package-lock.json is up to date
    const packageStats = await fs.stat('package.json');
    try {
      const lockStats = await fs.stat('package-lock.json');
      if (packageStats.mtime > lockStats.mtime) {
        throw new Error('package.json is newer than package-lock.json. Run npm install.');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('package-lock.json not found. Run npm install.');
      }
      throw error;
    }
    
    // Check for security vulnerabilities
    try {
      await this.executeCommand('npm audit --audit-level high', null, 30000);
    } catch (error) {
      if (!this.options.force) {
        throw new Error('Security vulnerabilities found. Run npm audit fix or use --force to ignore.');
      }
    }
  }

  async checkEnvironmentVariables() {
    const requiredVars = {
      development: ['NODE_ENV'],
      staging: ['NODE_ENV', 'MONGODB_URI', 'JWT_SECRET'],
      production: ['NODE_ENV', 'MONGODB_URI', 'JWT_SECRET', 'STRIPE_SECRET_KEY']
    };
    
    const required = requiredVars[this.environment] || [];
    const missing = required.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async runSecurityScan() {
    // Basic security checks
    const securityChecks = [
      {
        name: 'Check for hardcoded secrets',
        command: 'grep -r "password\|secret\|key" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git . || true'
      },
      {
        name: 'Check for TODO/FIXME comments',
        command: 'grep -r "TODO\|FIXME\|XXX" --include="*.js" --exclude-dir=node_modules --exclude-dir=.git . || true'
      }
    ];
    
    for (const check of securityChecks) {
      try {
        const result = await this.executeCommand(check.command);
        if (result.trim()) {
          this.log(`⚠️ ${check.name}: Found potential issues`, 'warning');
          // Don't fail deployment for these warnings
        }
      } catch (error) {
        // Security scan failures are warnings, not errors
        this.log(`⚠️ ${check.name} failed: ${error.message}`, 'warning');
      }
    }
  }

  async requestApproval() {
    this.log('⏳ Deployment requires approval...', 'warning');
    
    if (process.env.CI) {
      // In CI environment, check for approval environment variable
      if (!process.env.DEPLOYMENT_APPROVED) {
        throw new Error('Deployment not approved. Set DEPLOYMENT_APPROVED=true to proceed.');
      }
      this.log('✅ Deployment approved via environment variable', 'success');
    } else {
      // Interactive approval
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question(`Deploy to ${this.config.name}? (yes/no): `, resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        throw new Error('Deployment cancelled by user');
      }
      
      this.log('✅ Deployment approved by user', 'success');
    }
  }

  async createBackup() {
    this.log('💾 Creating backup...', 'info');
    
    try {
      await this.executeCommand(this.config.backupCommand, null, CONFIG.timeouts.deploy);
      this.log('✅ Backup created successfully', 'success');
    } catch (error) {
      if (this.options.force) {
        this.log(`⚠️ Backup failed but continuing due to --force: ${error.message}`, 'warning');
      } else {
        throw new Error(`Backup failed: ${error.message}`);
      }
    }
  }

  async buildApplication() {
    this.log('🔨 Building application...', 'info');
    
    try {
      // Build client
      this.log('   📦 Building client...', 'debug');
      await this.executeCommand(this.config.buildCommand, './client', CONFIG.timeouts.build);
      
      // Verify build output
      const buildPath = path.join('./client/build');
      try {
        await fs.access(buildPath);
        const buildFiles = await fs.readdir(buildPath);
        if (buildFiles.length === 0) {
          throw new Error('Build directory is empty');
        }
        this.log(`   ✅ Client build completed (${buildFiles.length} files)`, 'success');
      } catch (error) {
        throw new Error(`Build verification failed: ${error.message}`);
      }
      
      // Install server dependencies if needed
      this.log('   📦 Installing server dependencies...', 'debug');
      await this.executeCommand('npm ci --only=production', './server', 60000);
      
      this.log('✅ Application build completed', 'success');
      
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async runTests() {
    this.log('🧪 Running tests...', 'info');
    
    try {
      // Run test suite
      const TestSuite = require('./test-suite');
      const testSuite = new TestSuite();
      
      await testSuite.initialize();
      await testSuite.runAllTests();
      
      if (!testSuite.results.summary.overallPassed) {
        throw new Error('Test suite failed');
      }
      
      this.log(`✅ All tests passed (${testSuite.results.summary.passedTests}/${testSuite.results.summary.totalTests})`, 'success');
      
    } catch (error) {
      if (this.options.force) {
        this.log(`⚠️ Tests failed but continuing due to --force: ${error.message}`, 'warning');
      } else {
        throw new Error(`Tests failed: ${error.message}`);
      }
    }
  }

  async deployApplication() {
    this.log('🚀 Deploying application...', 'info');
    
    if (!this.config.deployCommand) {
      this.log('⚠️ No deploy command configured for this environment', 'warning');
      return;
    }
    
    try {
      await this.executeCommand(this.config.deployCommand, null, CONFIG.timeouts.deploy);
      this.log('✅ Application deployed successfully', 'success');
      
      // Wait a moment for deployment to stabilize
      await this.sleep(5000);
      
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async verifyDeployment() {
    this.log('🔍 Verifying deployment...', 'info');
    
    const verificationChecks = [
      { name: 'Health Check', check: () => this.performHealthCheck() },
      { name: 'API Endpoints', check: () => this.verifyApiEndpoints() },
      { name: 'Frontend Loading', check: () => this.verifyFrontend() }
    ];
    
    for (const check of verificationChecks) {
      this.log(`   🔍 ${check.name}...`, 'debug');
      
      let retries = CONFIG.retries.healthCheck;
      let lastError;
      
      while (retries > 0) {
        try {
          await check.check();
          this.log(`   ✅ ${check.name} passed`, 'success');
          break;
        } catch (error) {
          lastError = error;
          retries--;
          
          if (retries > 0) {
            this.log(`   ⚠️ ${check.name} failed, retrying... (${retries} attempts left)`, 'warning');
            await this.sleep(5000);
          }
        }
      }
      
      if (retries === 0) {
        throw new Error(`${check.name} failed after all retries: ${lastError.message}`);
      }
    }
    
    this.log('✅ Deployment verification completed', 'success');
  }

  async performHealthCheck() {
    if (!this.config.healthCheck) {
      return; // Skip if no health check configured
    }
    
    const healthUrl = `${this.config.apiUrl}${this.config.healthCheck}`;
    const response = await axios.get(healthUrl, { 
      timeout: CONFIG.timeouts.healthCheck,
      validateStatus: status => status === 200
    });
    
    if (!response.data || response.data.status !== 'OK') {
      throw new Error('Health check returned unexpected response');
    }
  }

  async verifyApiEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/products',
      '/api/auth/me' // This should return 401 for unauthenticated requests
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.config.apiUrl}${endpoint}`, {
          timeout: CONFIG.timeouts.healthCheck,
          validateStatus: status => status < 500 // Accept 4xx errors
        });
        
        if (response.status >= 500) {
          throw new Error(`Endpoint ${endpoint} returned server error: ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          throw new Error(`Cannot connect to API endpoint ${endpoint}`);
        }
        throw error;
      }
    }
  }

  async verifyFrontend() {
    try {
      const response = await axios.get(this.config.url, {
        timeout: CONFIG.timeouts.healthCheck,
        validateStatus: status => status === 200
      });
      
      if (!response.data.includes('<title>') || !response.data.includes('Money Maker')) {
        throw new Error('Frontend does not appear to be loading correctly');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Cannot connect to frontend');
      }
      throw error;
    }
  }

  async attemptRollback() {
    this.log('🔄 Attempting rollback...', 'warning');
    
    try {
      await this.executeCommand(this.config.rollbackCommand, null, CONFIG.timeouts.deploy);
      this.log('✅ Rollback completed successfully', 'success');
      
      // Verify rollback
      await this.sleep(10000); // Wait for rollback to take effect
      await this.performHealthCheck();
      
    } catch (error) {
      this.log(`❌ Rollback failed: ${error.message}`, 'error');
      this.log('🚨 Manual intervention required!', 'error');
    }
  }

  async sendNotification(type, error = null) {
    const message = this.createNotificationMessage(type, error);
    
    // Send Slack notification
    if (CONFIG.notifications.slack.enabled) {
      try {
        await this.sendSlackNotification(message, type);
      } catch (err) {
        this.log(`⚠️ Failed to send Slack notification: ${err.message}`, 'warning');
      }
    }
    
    // Send email notification
    if (CONFIG.notifications.email.enabled && CONFIG.notifications.email.recipients.length > 0) {
      try {
        await this.sendEmailNotification(message, type);
      } catch (err) {
        this.log(`⚠️ Failed to send email notification: ${err.message}`, 'warning');
      }
    }
  }

  createNotificationMessage(type, error) {
    const duration = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    const emoji = type === 'success' ? '🎉' : '💥';
    const status = type === 'success' ? 'SUCCESS' : 'FAILED';
    
    let message = `${emoji} Deployment ${status}\n`;
    message += `Environment: ${this.config.name}\n`;
    message += `Branch: ${this.config.branch}\n`;
    message += `Duration: ${duration}s\n`;
    message += `Deployment ID: ${this.deploymentId}\n`;
    
    if (type === 'success') {
      message += `URL: ${this.config.url}\n`;
    } else if (error) {
      message += `Error: ${error.message}\n`;
    }
    
    return message;
  }

  async sendSlackNotification(message, type) {
    const color = type === 'success' ? 'good' : 'danger';
    
    const payload = {
      channel: CONFIG.notifications.slack.channel,
      username: 'Deployment Bot',
      icon_emoji: ':rocket:',
      attachments: [{
        color,
        title: `Money Maker Platform - ${this.config.name} Deployment`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(CONFIG.notifications.slack.webhook, payload);
  }

  async sendEmailNotification(message, type) {
    // Email notification implementation would go here
    // For now, just log that we would send an email
    this.log(`📧 Would send email notification to: ${CONFIG.notifications.email.recipients.join(', ')}`, 'debug');
  }

  async generateDeploymentReport() {
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    
    const report = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      status: this.status,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      options: this.options,
      logs: this.logs,
      config: this.config
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'deployment-reports', `${this.deploymentId}.json`);
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`📋 Deployment report saved: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`⚠️ Could not save deployment report: ${error.message}`, 'warning');
    }
    
    return report;
  }

  async executeCommand(command, cwd = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const options = { shell: true };
      if (cwd) options.cwd = cwd;
      
      const child = spawn(command, [], options);
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0];
  
  if (!environment || !CONFIG.environments[environment]) {
    console.error('❌ Usage: node deploy.js <environment> [options]');
    console.error('Available environments:', Object.keys(CONFIG.environments).join(', '));
    console.error('\nOptions:');
    console.error('  --skip-tests     Skip running tests');
    console.error('  --skip-approval  Skip approval prompt');
    console.error('  --dry-run        Perform all checks but skip actual deployment');
    console.error('  --force          Ignore non-critical failures');
    process.exit(1);
  }
  
  const options = {
    skipTests: args.includes('--skip-tests'),
    skipApproval: args.includes('--skip-approval'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  };
  
  const deployer = new DeploymentManager(environment, options);
  
  try {
    await deployer.deploy();
    console.log('\n🎉 Deployment completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DeploymentManager;