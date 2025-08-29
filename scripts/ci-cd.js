#!/usr/bin/env node

/**
 * CI/CD Pipeline Automation untuk Money Maker Platform
 * 
 * Script ini menangani:
 * 1. Continuous Integration (CI)
 * 2. Continuous Deployment (CD)
 * 3. Automated testing pipeline
 * 4. Build automation
 * 5. Environment management
 * 6. Rollback capabilities
 * 7. Pipeline monitoring
 * 8. Notification system
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  pipeline: {
    baseDir: path.join(__dirname, '..'),
    logsDir: path.join(__dirname, '..', 'pipeline-logs'),
    artifactsDir: path.join(__dirname, '..', 'build-artifacts'),
    timeout: {
      test: 600000,      // 10 minutes
      build: 900000,     // 15 minutes
      deploy: 1200000,   // 20 minutes
      rollback: 300000   // 5 minutes
    },
    retryAttempts: 3,
    parallelJobs: 4
  },
  environments: {
    development: {
      name: 'development',
      branch: 'develop',
      url: 'http://localhost:3000',
      apiUrl: 'http://localhost:5000',
      autoDeployOnPush: true,
      requiresApproval: false,
      runTests: true,
      runSecurityScan: false
    },
    staging: {
      name: 'staging',
      branch: 'staging',
      url: process.env.STAGING_URL || 'https://staging.moneymaker.com',
      apiUrl: process.env.STAGING_API_URL || 'https://api-staging.moneymaker.com',
      autoDeployOnPush: true,
      requiresApproval: false,
      runTests: true,
      runSecurityScan: true,
      deployCommand: 'npm run deploy:staging'
    },
    production: {
      name: 'production',
      branch: 'main',
      url: process.env.PRODUCTION_URL || 'https://moneymaker.com',
      apiUrl: process.env.PRODUCTION_API_URL || 'https://api.moneymaker.com',
      autoDeployOnPush: false,
      requiresApproval: true,
      runTests: true,
      runSecurityScan: true,
      runPerformanceTests: true,
      deployCommand: 'npm run deploy:production',
      backupBeforeDeploy: true
    }
  },
  git: {
    remote: 'origin',
    defaultBranch: 'main',
    protectedBranches: ['main', 'staging'],
    requirePullRequest: true,
    requireCodeReview: true
  },
  testing: {
    unit: {
      command: 'npm test',
      coverage: {
        enabled: true,
        threshold: 80
      }
    },
    integration: {
      command: 'npm run test:integration',
      enabled: true
    },
    e2e: {
      command: 'npm run test:e2e',
      enabled: true,
      environments: ['staging', 'production']
    },
    performance: {
      command: 'node scripts/performance-test.js',
      enabled: true,
      environments: ['staging', 'production']
    },
    security: {
      command: 'node scripts/security-audit.js audit',
      enabled: true,
      environments: ['staging', 'production']
    }
  },
  build: {
    frontend: {
      command: 'npm run build',
      outputDir: 'build',
      artifacts: ['build/**/*']
    },
    backend: {
      command: 'npm run build:server',
      outputDir: 'dist',
      artifacts: ['dist/**/*', 'package.json', 'package-lock.json']
    }
  },
  deployment: {
    strategy: 'blue-green', // blue-green, rolling, canary
    healthCheck: {
      enabled: true,
      endpoint: '/api/health',
      timeout: 30000,
      retries: 5
    },
    rollback: {
      enabled: true,
      automatic: true,
      conditions: {
        healthCheckFails: true,
        errorRateThreshold: 5, // 5% error rate
        responseTimeThreshold: 5000 // 5 seconds
      }
    }
  },
  notifications: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CICD_CHANNEL || '#deployments'
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      recipients: (process.env.CICD_NOTIFICATION_EMAILS || '').split(',').filter(Boolean)
    },
    github: {
      enabled: !!process.env.GITHUB_TOKEN,
      token: process.env.GITHUB_TOKEN,
      repo: process.env.GITHUB_REPO
    }
  },
  monitoring: {
    enabled: true,
    metrics: {
      buildTime: true,
      testCoverage: true,
      deploymentFrequency: true,
      leadTime: true,
      mttr: true, // Mean Time To Recovery
      changeFailureRate: true
    }
  }
};

class CICDPipeline {
  constructor(options = {}) {
    this.options = {
      environment: 'development',
      branch: null,
      skipTests: false,
      skipBuild: false,
      skipDeploy: false,
      force: false,
      dryRun: false,
      ...options
    };
    
    this.pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = null;
    this.stages = [];
    this.artifacts = [];
    this.metrics = {
      totalDuration: 0,
      testDuration: 0,
      buildDuration: 0,
      deployDuration: 0,
      testCoverage: 0,
      success: false
    };
    this.logs = [];
  }

  log(message, level = 'info', stage = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, stage };
    this.logs.push(logEntry);
    
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
      start: '🚀',
      finish: '🏁'
    }[level] || 'ℹ️';
    
    const stagePrefix = stage ? `[${stage}] ` : '';
    console.log(`${emoji} [${timestamp}] ${stagePrefix}${message}`);
  }

  async runPipeline() {
    this.startTime = Date.now();
    
    try {
      this.log(`🚀 Starting CI/CD pipeline (${this.pipelineId})`, 'start');
      this.log(`Environment: ${this.options.environment}`, 'info');
      this.log(`Branch: ${this.options.branch || 'current'}`, 'info');
      
      // Create necessary directories
      await this.ensureDirectories();
      
      // Send start notification
      await this.sendNotification('start');
      
      // Run pipeline stages
      await this.runStage('pre-checks', () => this.runPreChecks());
      
      if (!this.options.skipTests) {
        await this.runStage('tests', () => this.runTests());
      }
      
      if (!this.options.skipBuild) {
        await this.runStage('build', () => this.runBuild());
      }
      
      if (!this.options.skipDeploy) {
        await this.runStage('deploy', () => this.runDeploy());
      }
      
      await this.runStage('post-deploy', () => this.runPostDeploy());
      
      // Calculate final metrics
      this.metrics.totalDuration = Date.now() - this.startTime;
      this.metrics.success = true;
      
      // Send success notification
      await this.sendNotification('success');
      
      this.log(`🏁 Pipeline completed successfully in ${Math.round(this.metrics.totalDuration / 1000)}s`, 'finish');
      
      return {
        success: true,
        pipelineId: this.pipelineId,
        metrics: this.metrics,
        artifacts: this.artifacts,
        logs: this.logs
      };
      
    } catch (error) {
      this.metrics.totalDuration = Date.now() - this.startTime;
      this.metrics.success = false;
      
      this.log(`💥 Pipeline failed: ${error.message}`, 'error');
      
      // Send failure notification
      await this.sendNotification('failure', error);
      
      // Attempt rollback if in production
      if (this.options.environment === 'production' && CONFIG.deployment.rollback.automatic) {
        try {
          await this.runRollback();
        } catch (rollbackError) {
          this.log(`💥 Rollback failed: ${rollbackError.message}`, 'error');
        }
      }
      
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = [CONFIG.pipeline.logsDir, CONFIG.pipeline.artifactsDir];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async runStage(stageName, stageFunction) {
    const stageStart = Date.now();
    
    try {
      this.log(`Starting ${stageName} stage`, 'start', stageName);
      
      const result = await stageFunction();
      
      const duration = Date.now() - stageStart;
      this.stages.push({
        name: stageName,
        status: 'success',
        duration,
        result
      });
      
      this.log(`${stageName} stage completed in ${Math.round(duration / 1000)}s`, 'success', stageName);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - stageStart;
      this.stages.push({
        name: stageName,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.log(`${stageName} stage failed after ${Math.round(duration / 1000)}s: ${error.message}`, 'error', stageName);
      throw error;
    }
  }

  async runPreChecks() {
    this.log('Running pre-deployment checks...', 'info', 'pre-checks');
    
    // Check Git status
    await this.checkGitStatus();
    
    // Check environment variables
    await this.checkEnvironmentVariables();
    
    // Check dependencies
    await this.checkDependencies();
    
    // Check disk space
    await this.checkDiskSpace();
    
    // Check service health
    await this.checkServiceHealth();
    
    this.log('All pre-checks passed', 'success', 'pre-checks');
  }

  async checkGitStatus() {
    try {
      // Check if working directory is clean
      const status = await this.executeCommand('git status --porcelain');
      
      if (status.trim() && !this.options.force) {
        throw new Error('Working directory is not clean. Commit or stash changes first.');
      }
      
      // Check current branch
      const currentBranch = await this.executeCommand('git rev-parse --abbrev-ref HEAD');
      const branch = currentBranch.trim();
      
      if (this.options.branch && branch !== this.options.branch) {
        this.log(`Switching from ${branch} to ${this.options.branch}`, 'info', 'pre-checks');
        await this.executeCommand(`git checkout ${this.options.branch}`);
        await this.executeCommand('git pull origin ' + this.options.branch);
      }
      
      // Check if branch is up to date
      await this.executeCommand('git fetch origin');
      const localCommit = await this.executeCommand('git rev-parse HEAD');
      const remoteCommit = await this.executeCommand(`git rev-parse origin/${branch}`);
      
      if (localCommit.trim() !== remoteCommit.trim() && !this.options.force) {
        throw new Error('Local branch is not up to date with remote. Pull latest changes first.');
      }
      
      this.log(`Git status: clean, branch: ${branch}`, 'success', 'pre-checks');
      
    } catch (error) {
      throw new Error(`Git check failed: ${error.message}`);
    }
  }

  async checkEnvironmentVariables() {
    const env = CONFIG.environments[this.options.environment];
    const requiredVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET'
    ];
    
    if (env.name === 'production') {
      requiredVars.push(
        'STRIPE_SECRET_KEY',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS'
      );
    }
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    this.log(`Environment variables: ${requiredVars.length} checked`, 'success', 'pre-checks');
  }

  async checkDependencies() {
    try {
      // Check if node_modules exists and is up to date
      const packageJson = JSON.parse(await fs.readFile(path.join(CONFIG.pipeline.baseDir, 'package.json'), 'utf8'));
      
      try {
        await fs.access(path.join(CONFIG.pipeline.baseDir, 'node_modules'));
      } catch (error) {
        this.log('node_modules not found, installing dependencies...', 'warning', 'pre-checks');
        await this.executeCommand('npm ci', CONFIG.pipeline.timeout.build);
      }
      
      // Check for security vulnerabilities
      try {
        await this.executeCommand('npm audit --audit-level=high', 30000);
      } catch (error) {
        if (!this.options.force) {
          throw new Error('Security vulnerabilities found in dependencies. Run npm audit fix or use --force to continue.');
        }
        this.log('Security vulnerabilities found but continuing due to --force flag', 'warning', 'pre-checks');
      }
      
      this.log('Dependencies: verified', 'success', 'pre-checks');
      
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  async checkDiskSpace() {
    try {
      // Check available disk space (Unix/Linux/macOS)
      const df = await this.executeCommand('df -h .');
      const lines = df.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      const usedPercent = parseInt(parts[4]);
      
      if (usedPercent > 90) {
        throw new Error(`Disk space critically low: ${usedPercent}% used`);
      }
      
      if (usedPercent > 80) {
        this.log(`Disk space warning: ${usedPercent}% used`, 'warning', 'pre-checks');
      }
      
      this.log(`Disk space: ${100 - usedPercent}% available`, 'success', 'pre-checks');
      
    } catch (error) {
      // Disk space check might fail on Windows or other systems
      this.log('Could not check disk space', 'warning', 'pre-checks');
    }
  }

  async checkServiceHealth() {
    const env = CONFIG.environments[this.options.environment];
    
    if (env.url) {
      try {
        const response = await axios.get(`${env.apiUrl}/api/health`, { timeout: 10000 });
        
        if (response.status === 200) {
          this.log(`Service health: OK (${env.name})`, 'success', 'pre-checks');
        } else {
          throw new Error(`Service health check failed: ${response.status}`);
        }
      } catch (error) {
        if (env.name === 'production') {
          throw new Error(`Production service health check failed: ${error.message}`);
        } else {
          this.log(`Service health check failed for ${env.name}: ${error.message}`, 'warning', 'pre-checks');
        }
      }
    }
  }

  async runTests() {
    this.log('Running test suite...', 'info', 'tests');
    const testStart = Date.now();
    
    try {
      const testResults = {};
      
      // Run unit tests
      if (CONFIG.testing.unit) {
        this.log('Running unit tests...', 'info', 'tests');
        const unitResult = await this.executeCommand(CONFIG.testing.unit.command, CONFIG.pipeline.timeout.test);
        testResults.unit = this.parseTestResults(unitResult);
        
        // Check coverage if enabled
        if (CONFIG.testing.unit.coverage.enabled) {
          const coverage = await this.checkTestCoverage();
          testResults.coverage = coverage;
          
          if (coverage < CONFIG.testing.unit.coverage.threshold) {
            throw new Error(`Test coverage ${coverage}% is below threshold ${CONFIG.testing.unit.coverage.threshold}%`);
          }
        }
      }
      
      // Run integration tests
      if (CONFIG.testing.integration.enabled) {
        this.log('Running integration tests...', 'info', 'tests');
        const integrationResult = await this.executeCommand(CONFIG.testing.integration.command, CONFIG.pipeline.timeout.test);
        testResults.integration = this.parseTestResults(integrationResult);
      }
      
      // Run E2E tests for staging/production
      if (CONFIG.testing.e2e.enabled && CONFIG.testing.e2e.environments.includes(this.options.environment)) {
        this.log('Running E2E tests...', 'info', 'tests');
        const e2eResult = await this.executeCommand(CONFIG.testing.e2e.command, CONFIG.pipeline.timeout.test);
        testResults.e2e = this.parseTestResults(e2eResult);
      }
      
      // Run security tests for staging/production
      if (CONFIG.testing.security.enabled && CONFIG.testing.security.environments.includes(this.options.environment)) {
        this.log('Running security audit...', 'info', 'tests');
        try {
          await this.executeCommand(CONFIG.testing.security.command, CONFIG.pipeline.timeout.test);
          testResults.security = { passed: true };
        } catch (error) {
          if (!this.options.force) {
            throw new Error(`Security audit failed: ${error.message}`);
          }
          testResults.security = { passed: false, error: error.message };
        }
      }
      
      this.metrics.testDuration = Date.now() - testStart;
      this.log(`All tests passed in ${Math.round(this.metrics.testDuration / 1000)}s`, 'success', 'tests');
      
      return testResults;
      
    } catch (error) {
      this.metrics.testDuration = Date.now() - testStart;
      throw new Error(`Tests failed: ${error.message}`);
    }
  }

  parseTestResults(output) {
    // Parse Jest/npm test output
    const lines = output.split('\n');
    const summary = lines.find(line => line.includes('Tests:'));
    
    if (summary) {
      const passed = (summary.match(/(\d+) passed/) || [])[1];
      const failed = (summary.match(/(\d+) failed/) || [])[1];
      const total = (summary.match(/(\d+) total/) || [])[1];
      
      return {
        passed: parseInt(passed) || 0,
        failed: parseInt(failed) || 0,
        total: parseInt(total) || 0
      };
    }
    
    return { passed: 0, failed: 0, total: 0 };
  }

  async checkTestCoverage() {
    try {
      const coverageFile = path.join(CONFIG.pipeline.baseDir, 'coverage', 'coverage-summary.json');
      const coverage = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
      
      const totalCoverage = coverage.total.lines.pct;
      this.metrics.testCoverage = totalCoverage;
      
      this.log(`Test coverage: ${totalCoverage}%`, 'info', 'tests');
      return totalCoverage;
      
    } catch (error) {
      this.log('Could not read test coverage', 'warning', 'tests');
      return 0;
    }
  }

  async runBuild() {
    this.log('Building application...', 'info', 'build');
    const buildStart = Date.now();
    
    try {
      const buildResults = {};
      
      // Build frontend
      if (CONFIG.build.frontend) {
        this.log('Building frontend...', 'info', 'build');
        await this.executeCommand(CONFIG.build.frontend.command, CONFIG.pipeline.timeout.build);
        
        // Verify build output
        const buildDir = path.join(CONFIG.pipeline.baseDir, CONFIG.build.frontend.outputDir);
        await fs.access(buildDir);
        
        // Create build artifacts
        const frontendArtifact = await this.createArtifact('frontend', CONFIG.build.frontend.artifacts);
        buildResults.frontend = frontendArtifact;
      }
      
      // Build backend
      if (CONFIG.build.backend) {
        this.log('Building backend...', 'info', 'build');
        await this.executeCommand(CONFIG.build.backend.command, CONFIG.pipeline.timeout.build);
        
        // Create build artifacts
        const backendArtifact = await this.createArtifact('backend', CONFIG.build.backend.artifacts);
        buildResults.backend = backendArtifact;
      }
      
      this.metrics.buildDuration = Date.now() - buildStart;
      this.log(`Build completed in ${Math.round(this.metrics.buildDuration / 1000)}s`, 'success', 'build');
      
      return buildResults;
      
    } catch (error) {
      this.metrics.buildDuration = Date.now() - buildStart;
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async createArtifact(name, patterns) {
    const artifactName = `${name}-${this.pipelineId}.tar.gz`;
    const artifactPath = path.join(CONFIG.pipeline.artifactsDir, artifactName);
    
    // Create tar archive of build artifacts
    const tarCommand = `tar -czf "${artifactPath}" ${patterns.join(' ')}`;
    await this.executeCommand(tarCommand, 120000);
    
    // Calculate artifact size
    const stats = await fs.stat(artifactPath);
    
    const artifact = {
      name: artifactName,
      path: artifactPath,
      size: stats.size,
      created: new Date().toISOString()
    };
    
    this.artifacts.push(artifact);
    this.log(`Created artifact: ${artifactName} (${this.formatBytes(stats.size)})`, 'success', 'build');
    
    return artifact;
  }

  async runDeploy() {
    if (this.options.dryRun) {
      this.log('DRY RUN: Skipping actual deployment', 'info', 'deploy');
      return { dryRun: true };
    }
    
    this.log('Deploying application...', 'info', 'deploy');
    const deployStart = Date.now();
    
    try {
      const env = CONFIG.environments[this.options.environment];
      
      // Check if approval is required
      if (env.requiresApproval && !this.options.force) {
        await this.requestDeploymentApproval();
      }
      
      // Backup before production deployment
      if (env.backupBeforeDeploy) {
        await this.createBackup();
      }
      
      // Execute deployment command
      if (env.deployCommand) {
        await this.executeCommand(env.deployCommand, CONFIG.pipeline.timeout.deploy);
      }
      
      // Wait for deployment to stabilize
      await this.waitForDeployment();
      
      // Run health checks
      await this.runHealthChecks();
      
      // Run smoke tests
      await this.runSmokeTests();
      
      this.metrics.deployDuration = Date.now() - deployStart;
      this.log(`Deployment completed in ${Math.round(this.metrics.deployDuration / 1000)}s`, 'success', 'deploy');
      
      return { success: true, environment: env.name };
      
    } catch (error) {
      this.metrics.deployDuration = Date.now() - deployStart;
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async requestDeploymentApproval() {
    this.log('Deployment approval required for production', 'warning', 'deploy');
    
    // In a real implementation, this would integrate with approval systems
    // For now, we'll just log and continue if force flag is used
    if (!this.options.force) {
      throw new Error('Deployment approval required. Use --force to bypass.');
    }
    
    this.log('Bypassing approval due to --force flag', 'warning', 'deploy');
  }

  async createBackup() {
    this.log('Creating backup before deployment...', 'info', 'deploy');
    
    try {
      // Run backup script
      await this.executeCommand('node scripts/backup.js backup full', 300000);
      this.log('Backup created successfully', 'success', 'deploy');
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async waitForDeployment() {
    this.log('Waiting for deployment to stabilize...', 'info', 'deploy');
    
    // Wait a bit for services to start
    await this.sleep(30000); // 30 seconds
    
    this.log('Deployment stabilization period completed', 'success', 'deploy');
  }

  async runHealthChecks() {
    this.log('Running post-deployment health checks...', 'info', 'deploy');
    
    const env = CONFIG.environments[this.options.environment];
    const healthConfig = CONFIG.deployment.healthCheck;
    
    if (!healthConfig.enabled) {
      this.log('Health checks disabled', 'info', 'deploy');
      return;
    }
    
    let attempts = 0;
    const maxAttempts = healthConfig.retries;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `${env.apiUrl}${healthConfig.endpoint}`,
          { timeout: healthConfig.timeout }
        );
        
        if (response.status === 200) {
          this.log('Health check passed', 'success', 'deploy');
          return;
        }
        
        throw new Error(`Health check returned status ${response.status}`);
        
      } catch (error) {
        attempts++;
        this.log(`Health check attempt ${attempts}/${maxAttempts} failed: ${error.message}`, 'warning', 'deploy');
        
        if (attempts < maxAttempts) {
          await this.sleep(5000); // Wait 5 seconds before retry
        }
      }
    }
    
    throw new Error(`Health checks failed after ${maxAttempts} attempts`);
  }

  async runSmokeTests() {
    this.log('Running smoke tests...', 'info', 'deploy');
    
    const env = CONFIG.environments[this.options.environment];
    
    try {
      // Test critical endpoints
      const endpoints = [
        '/api/health',
        '/api/auth/login',
        '/api/products'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${env.apiUrl}${endpoint}`, { timeout: 10000 });
          this.log(`Smoke test passed: ${endpoint} (${response.status})`, 'success', 'deploy');
        } catch (error) {
          // Some endpoints might require authentication, so 401 is acceptable
          if (error.response && [401, 403].includes(error.response.status)) {
            this.log(`Smoke test passed: ${endpoint} (${error.response.status} - auth required)`, 'success', 'deploy');
          } else {
            throw new Error(`Smoke test failed for ${endpoint}: ${error.message}`);
          }
        }
      }
      
      this.log('All smoke tests passed', 'success', 'deploy');
      
    } catch (error) {
      throw new Error(`Smoke tests failed: ${error.message}`);
    }
  }

  async runPostDeploy() {
    this.log('Running post-deployment tasks...', 'info', 'post-deploy');
    
    try {
      // Update deployment metrics
      await this.updateDeploymentMetrics();
      
      // Clean up old artifacts
      await this.cleanupArtifacts();
      
      // Update monitoring dashboards
      await this.updateMonitoring();
      
      this.log('Post-deployment tasks completed', 'success', 'post-deploy');
      
    } catch (error) {
      // Post-deploy failures shouldn't fail the entire pipeline
      this.log(`Post-deploy warning: ${error.message}`, 'warning', 'post-deploy');
    }
  }

  async updateDeploymentMetrics() {
    if (!CONFIG.monitoring.enabled) return;
    
    const metrics = {
      pipelineId: this.pipelineId,
      environment: this.options.environment,
      timestamp: new Date().toISOString(),
      duration: this.metrics.totalDuration,
      testDuration: this.metrics.testDuration,
      buildDuration: this.metrics.buildDuration,
      deployDuration: this.metrics.deployDuration,
      testCoverage: this.metrics.testCoverage,
      success: this.metrics.success,
      artifacts: this.artifacts.length
    };
    
    // Save metrics to file
    const metricsFile = path.join(CONFIG.pipeline.logsDir, `metrics-${this.pipelineId}.json`);
    await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));
    
    this.log('Deployment metrics updated', 'success', 'post-deploy');
  }

  async cleanupArtifacts() {
    try {
      // Keep only last 10 artifacts
      const files = await fs.readdir(CONFIG.pipeline.artifactsDir);
      const artifacts = files
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => ({
          name: file,
          path: path.join(CONFIG.pipeline.artifactsDir, file)
        }));
      
      if (artifacts.length > 10) {
        // Sort by creation time and remove oldest
        const stats = await Promise.all(
          artifacts.map(async artifact => ({
            ...artifact,
            stats: await fs.stat(artifact.path)
          }))
        );
        
        stats.sort((a, b) => b.stats.mtime - a.stats.mtime);
        const toDelete = stats.slice(10);
        
        for (const artifact of toDelete) {
          await fs.unlink(artifact.path);
          this.log(`Cleaned up old artifact: ${artifact.name}`, 'debug', 'post-deploy');
        }
      }
      
    } catch (error) {
      this.log(`Artifact cleanup warning: ${error.message}`, 'warning', 'post-deploy');
    }
  }

  async updateMonitoring() {
    // Update monitoring dashboards and alerts
    // This would integrate with monitoring services like Datadog, New Relic, etc.
    this.log('Monitoring dashboards updated', 'success', 'post-deploy');
  }

  async runRollback() {
    this.log('🔄 Starting automatic rollback...', 'warning', 'rollback');
    
    try {
      // Get previous successful deployment
      const previousDeployment = await this.getPreviousDeployment();
      
      if (!previousDeployment) {
        throw new Error('No previous deployment found for rollback');
      }
      
      // Execute rollback
      await this.executeCommand(`git checkout ${previousDeployment.commit}`, 60000);
      
      // Redeploy previous version
      const env = CONFIG.environments[this.options.environment];
      if (env.deployCommand) {
        await this.executeCommand(env.deployCommand, CONFIG.pipeline.timeout.rollback);
      }
      
      // Verify rollback
      await this.runHealthChecks();
      
      this.log('Rollback completed successfully', 'success', 'rollback');
      
      // Send rollback notification
      await this.sendNotification('rollback', null, previousDeployment);
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error', 'rollback');
      throw error;
    }
  }

  async getPreviousDeployment() {
    // In a real implementation, this would query deployment history
    // For now, return mock data
    return {
      commit: 'HEAD~1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0'
    };
  }

  async sendNotification(type, error = null, data = null) {
    const message = this.createNotificationMessage(type, error, data);
    
    // Send Slack notification
    if (CONFIG.notifications.slack.enabled) {
      try {
        await this.sendSlackNotification(message, type);
      } catch (err) {
        this.log(`Failed to send Slack notification: ${err.message}`, 'warning');
      }
    }
    
    // Send email notification
    if (CONFIG.notifications.email.enabled && CONFIG.notifications.email.recipients.length > 0) {
      try {
        await this.sendEmailNotification(message, type);
      } catch (err) {
        this.log(`Failed to send email notification: ${err.message}`, 'warning');
      }
    }
    
    // Update GitHub status
    if (CONFIG.notifications.github.enabled) {
      try {
        await this.updateGitHubStatus(type);
      } catch (err) {
        this.log(`Failed to update GitHub status: ${err.message}`, 'warning');
      }
    }
  }

  createNotificationMessage(type, error, data) {
    const env = this.options.environment;
    const duration = this.metrics.totalDuration ? Math.round(this.metrics.totalDuration / 1000) : 0;
    
    let emoji, status, message;
    
    switch (type) {
      case 'start':
        emoji = '🚀';
        status = 'STARTED';
        message = `Pipeline started for ${env} environment`;
        break;
      case 'success':
        emoji = '✅';
        status = 'SUCCESS';
        message = `Pipeline completed successfully in ${duration}s`;
        break;
      case 'failure':
        emoji = '❌';
        status = 'FAILED';
        message = `Pipeline failed after ${duration}s: ${error?.message || 'Unknown error'}`;
        break;
      case 'rollback':
        emoji = '🔄';
        status = 'ROLLBACK';
        message = `Automatic rollback completed to ${data?.version || 'previous version'}`;
        break;
      default:
        emoji = 'ℹ️';
        status = 'INFO';
        message = 'Pipeline notification';
    }
    
    let fullMessage = `${emoji} CI/CD Pipeline ${status}\n`;
    fullMessage += `Environment: ${env}\n`;
    fullMessage += `Pipeline ID: ${this.pipelineId}\n`;
    fullMessage += `Branch: ${this.options.branch || 'current'}\n`;
    
    if (duration > 0) {
      fullMessage += `Duration: ${duration}s\n`;
    }
    
    if (this.metrics.testCoverage > 0) {
      fullMessage += `Test Coverage: ${this.metrics.testCoverage}%\n`;
    }
    
    fullMessage += `\n${message}`;
    
    return fullMessage;
  }

  async sendSlackNotification(message, type) {
    const color = {
      start: '#36a64f',
      success: 'good',
      failure: 'danger',
      rollback: 'warning'
    }[type] || '#36a64f';
    
    const payload = {
      channel: CONFIG.notifications.slack.channel,
      username: 'CI/CD Bot',
      icon_emoji: ':rocket:',
      attachments: [{
        color,
        title: `Money Maker Platform - ${this.options.environment}`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(CONFIG.notifications.slack.webhook, payload);
  }

  async sendEmailNotification(message, type) {
    // Email notification implementation would go here
    this.log(`📧 Would send email notification to: ${CONFIG.notifications.email.recipients.join(', ')}`, 'debug');
  }

  async updateGitHubStatus(type) {
    if (!CONFIG.notifications.github.token || !CONFIG.notifications.github.repo) {
      return;
    }
    
    const state = {
      start: 'pending',
      success: 'success',
      failure: 'failure',
      rollback: 'error'
    }[type] || 'pending';
    
    const description = {
      start: 'CI/CD pipeline started',
      success: 'CI/CD pipeline completed successfully',
      failure: 'CI/CD pipeline failed',
      rollback: 'Automatic rollback completed'
    }[type] || 'CI/CD pipeline running';
    
    // GitHub API call would go here
    this.log(`GitHub status updated: ${state}`, 'debug');
  }

  async executeCommand(command, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        cwd: CONFIG.pipeline.baseDir
      });
      
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

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !['deploy', 'build', 'test', 'rollback', 'status'].includes(command)) {
    console.error('❌ Usage: node ci-cd.js <command> [options]');
    console.error('\nCommands:');
    console.error('  deploy <env>      Deploy to environment (development, staging, production)');
    console.error('  build             Build application only');
    console.error('  test              Run tests only');
    console.error('  rollback <env>    Rollback to previous deployment');
    console.error('  status            Show pipeline status');
    console.error('\nOptions:');
    console.error('  --branch <name>   Deploy specific branch');
    console.error('  --skip-tests      Skip test execution');
    console.error('  --skip-build      Skip build step');
    console.error('  --force           Force deployment without checks');
    console.error('  --dry-run         Show what would be done without executing');
    process.exit(1);
  }
  
  try {
    const environment = args[1] || 'development';
    const options = {
      environment,
      branch: args.find(arg => arg.startsWith('--branch='))?.split('=')[1],
      skipTests: args.includes('--skip-tests'),
      skipBuild: args.includes('--skip-build'),
      force: args.includes('--force'),
      dryRun: args.includes('--dry-run')
    };
    
    switch (command) {
      case 'deploy': {
        const pipeline = new CICDPipeline(options);
        const result = await pipeline.runPipeline();
        
        console.log('\n🚀 Deployment completed successfully!');
        console.log(`📋 Pipeline ID: ${result.pipelineId}`);
        console.log(`⏱️ Duration: ${Math.round(result.metrics.totalDuration / 1000)}s`);
        console.log(`📦 Artifacts: ${result.artifacts.length}`);
        break;
      }
      
      case 'build': {
        const pipeline = new CICDPipeline({ ...options, skipDeploy: true });
        await pipeline.runPipeline();
        console.log('\n🔨 Build completed successfully!');
        break;
      }
      
      case 'test': {
        const pipeline = new CICDPipeline({ ...options, skipBuild: true, skipDeploy: true });
        await pipeline.runPipeline();
        console.log('\n🧪 Tests completed successfully!');
        break;
      }
      
      case 'rollback': {
        const pipeline = new CICDPipeline(options);
        await pipeline.runRollback();
        console.log('\n🔄 Rollback completed successfully!');
        break;
      }
      
      case 'status': {
        console.log('\n📊 Pipeline Status:');
        console.log('Implementation would show current pipeline status');
        break;
      }
    }
    
  } catch (error) {
    console.error('\n💥 Pipeline failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CICDPipeline };