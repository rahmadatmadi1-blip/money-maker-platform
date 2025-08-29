#!/usr/bin/env node

/**
 * Backup dan Recovery System untuk Money Maker Platform
 * 
 * Script ini menangani:
 * 1. Database backup (MongoDB)
 * 2. File system backup (uploads, logs, configs)
 * 3. Automated scheduled backups
 * 4. Backup verification
 * 5. Recovery operations
 * 6. Cloud storage integration
 * 7. Backup rotation dan cleanup
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createReadStream, createWriteStream } = require('fs');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  backup: {
    baseDir: path.join(__dirname, '..', 'backups'),
    retention: {
      daily: 7,    // Keep 7 daily backups
      weekly: 4,   // Keep 4 weekly backups
      monthly: 12  // Keep 12 monthly backups
    },
    compression: true,
    encryption: {
      enabled: !!process.env.BACKUP_ENCRYPTION_KEY,
      key: process.env.BACKUP_ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm'
    },
    verification: true,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB max backup size
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker',
    name: process.env.DB_NAME || 'moneymaker',
    collections: [
      'users',
      'products', 
      'orders',
      'payments',
      'sessions',
      'logs'
    ],
    options: {
      authenticationDatabase: 'admin',
      ssl: process.env.NODE_ENV === 'production'
    }
  },
  files: {
    directories: [
      {
        name: 'uploads',
        path: path.join(__dirname, '..', 'uploads'),
        priority: 'high'
      },
      {
        name: 'logs',
        path: path.join(__dirname, '..', 'logs'),
        priority: 'medium'
      },
      {
        name: 'configs',
        path: path.join(__dirname, '..', 'config'),
        priority: 'high'
      },
      {
        name: 'certificates',
        path: path.join(__dirname, '..', 'certs'),
        priority: 'critical'
      }
    ],
    exclude: [
      'node_modules',
      '.git',
      'tmp',
      '*.tmp',
      '*.log',
      '.DS_Store'
    ]
  },
  cloud: {
    aws: {
      enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      bucket: process.env.AWS_BACKUP_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      storageClass: 'STANDARD_IA' // Infrequent Access for cost optimization
    },
    gcp: {
      enabled: !!process.env.GOOGLE_CLOUD_PROJECT,
      bucket: process.env.GCP_BACKUP_BUCKET,
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    }
  },
  schedule: {
    daily: '0 2 * * *',    // 2 AM daily
    weekly: '0 3 * * 0',   // 3 AM on Sundays
    monthly: '0 4 1 * *'   // 4 AM on 1st of month
  },
  notifications: {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_BACKUP_CHANNEL || '#backups'
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      recipients: (process.env.BACKUP_NOTIFICATION_EMAILS || '').split(',').filter(Boolean)
    }
  }
};

class BackupManager {
  constructor(options = {}) {
    this.options = {
      type: 'full', // full, database, files
      schedule: 'manual', // manual, daily, weekly, monthly
      verify: true,
      upload: true,
      cleanup: true,
      ...options
    };
    
    this.backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = null;
    this.logs = [];
    this.metrics = {
      totalSize: 0,
      filesCount: 0,
      duration: 0,
      compressionRatio: 0
    };
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

  async createBackup() {
    this.startTime = Date.now();
    
    try {
      this.log(`🚀 Starting ${this.options.type} backup (${this.backupId})`, 'info');
      
      // Create backup directory
      await this.ensureBackupDirectory();
      
      // Create backup based on type
      let backupPath;
      switch (this.options.type) {
        case 'database':
          backupPath = await this.createDatabaseBackup();
          break;
        case 'files':
          backupPath = await this.createFilesBackup();
          break;
        case 'full':
        default:
          backupPath = await this.createFullBackup();
          break;
      }
      
      // Verify backup if enabled
      if (this.options.verify) {
        await this.verifyBackup(backupPath);
      }
      
      // Upload to cloud storage if enabled
      if (this.options.upload) {
        await this.uploadBackup(backupPath);
      }
      
      // Cleanup old backups if enabled
      if (this.options.cleanup) {
        await this.cleanupOldBackups();
      }
      
      // Calculate final metrics
      this.metrics.duration = Date.now() - this.startTime;
      
      // Send success notification
      await this.sendNotification('success', backupPath);
      
      this.log(`🎉 Backup completed successfully: ${backupPath}`, 'success');
      this.log(`📊 Metrics: ${this.formatMetrics()}`, 'info');
      
      return {
        success: true,
        backupId: this.backupId,
        path: backupPath,
        metrics: this.metrics,
        logs: this.logs
      };
      
    } catch (error) {
      this.log(`💥 Backup failed: ${error.message}`, 'error');
      await this.sendNotification('failure', null, error);
      throw error;
    }
  }

  async ensureBackupDirectory() {
    const backupDir = path.join(CONFIG.backup.baseDir, this.getDatePath());
    await fs.mkdir(backupDir, { recursive: true });
    this.log(`📁 Backup directory: ${backupDir}`, 'debug');
    return backupDir;
  }

  getDatePath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return path.join(String(year), month, day);
  }

  async createDatabaseBackup() {
    this.log('🗄️ Creating database backup...', 'info');
    
    const backupDir = await this.ensureBackupDirectory();
    const dbBackupPath = path.join(backupDir, `db-${this.backupId}`);
    
    try {
      // Create database dump using mongodump
      const mongodumpCmd = this.buildMongodumpCommand(dbBackupPath);
      await this.executeCommand(mongodumpCmd, 300000); // 5 minute timeout
      
      // Compress database backup
      const compressedPath = `${dbBackupPath}.tar.gz`;
      await this.compressDirectory(dbBackupPath, compressedPath);
      
      // Remove uncompressed directory
      await this.removeDirectory(dbBackupPath);
      
      // Calculate metrics
      const stats = await fs.stat(compressedPath);
      this.metrics.totalSize += stats.size;
      this.metrics.filesCount += 1;
      
      this.log(`✅ Database backup created: ${compressedPath}`, 'success');
      return compressedPath;
      
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  buildMongodumpCommand(outputPath) {
    const uri = new URL(CONFIG.database.uri);
    let cmd = `mongodump --host ${uri.hostname}:${uri.port || 27017}`;
    
    if (uri.username && uri.password) {
      cmd += ` --username ${uri.username} --password ${uri.password}`;
    }
    
    if (CONFIG.database.options.authenticationDatabase) {
      cmd += ` --authenticationDatabase ${CONFIG.database.options.authenticationDatabase}`;
    }
    
    if (CONFIG.database.options.ssl) {
      cmd += ` --ssl`;
    }
    
    cmd += ` --db ${CONFIG.database.name} --out ${outputPath}`;
    
    // Backup specific collections if specified
    if (CONFIG.database.collections && CONFIG.database.collections.length > 0) {
      // For specific collections, we need multiple commands
      const commands = CONFIG.database.collections.map(collection => 
        `${cmd.replace('--out', `--collection ${collection} --out`)}`
      );
      return commands.join(' && ');
    }
    
    return cmd;
  }

  async createFilesBackup() {
    this.log('📁 Creating files backup...', 'info');
    
    const backupDir = await this.ensureBackupDirectory();
    const filesBackupPath = path.join(backupDir, `files-${this.backupId}.tar.gz`);
    
    try {
      // Create archive
      await this.createArchive(CONFIG.files.directories, filesBackupPath);
      
      // Calculate metrics
      const stats = await fs.stat(filesBackupPath);
      this.metrics.totalSize += stats.size;
      this.metrics.filesCount += 1;
      
      this.log(`✅ Files backup created: ${filesBackupPath}`, 'success');
      return filesBackupPath;
      
    } catch (error) {
      throw new Error(`Files backup failed: ${error.message}`);
    }
  }

  async createFullBackup() {
    this.log('🔄 Creating full backup (database + files)...', 'info');
    
    const backupDir = await this.ensureBackupDirectory();
    const fullBackupPath = path.join(backupDir, `full-${this.backupId}.tar.gz`);
    
    try {
      // Create temporary directory for full backup
      const tempDir = path.join(backupDir, `temp-${this.backupId}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Create database backup in temp directory
      const dbBackupPath = path.join(tempDir, 'database');
      const mongodumpCmd = this.buildMongodumpCommand(dbBackupPath);
      await this.executeCommand(mongodumpCmd, 300000);
      
      // Copy files to temp directory
      const filesDir = path.join(tempDir, 'files');
      await fs.mkdir(filesDir, { recursive: true });
      
      for (const dir of CONFIG.files.directories) {
        try {
          await fs.access(dir.path);
          const targetPath = path.join(filesDir, dir.name);
          await this.copyDirectory(dir.path, targetPath);
          this.log(`📂 Copied ${dir.name} directory`, 'debug');
        } catch (error) {
          this.log(`⚠️ Skipping ${dir.name}: ${error.message}`, 'warning');
        }
      }
      
      // Create metadata file
      const metadata = {
        backupId: this.backupId,
        timestamp: new Date().toISOString(),
        type: 'full',
        version: require('../package.json').version,
        environment: process.env.NODE_ENV || 'development',
        database: {
          name: CONFIG.database.name,
          collections: CONFIG.database.collections
        },
        files: CONFIG.files.directories.map(d => ({ name: d.name, path: d.path }))
      };
      
      await fs.writeFile(
        path.join(tempDir, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Compress full backup
      await this.compressDirectory(tempDir, fullBackupPath);
      
      // Remove temporary directory
      await this.removeDirectory(tempDir);
      
      // Calculate metrics
      const stats = await fs.stat(fullBackupPath);
      this.metrics.totalSize += stats.size;
      this.metrics.filesCount += 1;
      
      this.log(`✅ Full backup created: ${fullBackupPath}`, 'success');
      return fullBackupPath;
      
    } catch (error) {
      throw new Error(`Full backup failed: ${error.message}`);
    }
  }

  async createArchive(directories, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: CONFIG.backup.compression,
        gzipOptions: { level: 6 }
      });
      
      output.on('close', () => {
        this.log(`📦 Archive created: ${archive.pointer()} bytes`, 'debug');
        resolve();
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      // Add directories to archive
      directories.forEach(dir => {
        if (fs.existsSync && fs.existsSync(dir.path)) {
          archive.directory(dir.path, dir.name);
          this.log(`📂 Adding ${dir.name} to archive`, 'debug');
        } else {
          this.log(`⚠️ Directory not found: ${dir.path}`, 'warning');
        }
      });
      
      archive.finalize();
    });
  }

  async compressDirectory(inputPath, outputPath) {
    const command = `tar -czf "${outputPath}" -C "${path.dirname(inputPath)}" "${path.basename(inputPath)}"`;
    await this.executeCommand(command, 600000); // 10 minute timeout
  }

  async copyDirectory(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async removeDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      this.log(`⚠️ Could not remove directory ${dirPath}: ${error.message}`, 'warning');
    }
  }

  async verifyBackup(backupPath) {
    this.log('🔍 Verifying backup integrity...', 'info');
    
    try {
      // Check if file exists and is readable
      const stats = await fs.stat(backupPath);
      
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      if (stats.size > CONFIG.backup.maxSize) {
        this.log(`⚠️ Backup size (${this.formatBytes(stats.size)}) exceeds maximum (${this.formatBytes(CONFIG.backup.maxSize)})`, 'warning');
      }
      
      // Test archive integrity
      if (backupPath.endsWith('.tar.gz')) {
        await this.executeCommand(`tar -tzf "${backupPath}" > /dev/null`, 60000);
      }
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(backupPath);
      
      // Save verification info
      const verificationInfo = {
        backupId: this.backupId,
        path: backupPath,
        size: stats.size,
        checksum,
        verifiedAt: new Date().toISOString()
      };
      
      const verificationPath = `${backupPath}.verification.json`;
      await fs.writeFile(verificationPath, JSON.stringify(verificationInfo, null, 2));
      
      this.log(`✅ Backup verification completed (${this.formatBytes(stats.size)}, checksum: ${checksum.substr(0, 8)}...)`, 'success');
      
    } catch (error) {
      throw new Error(`Backup verification failed: ${error.message}`);
    }
  }

  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async uploadBackup(backupPath) {
    this.log('☁️ Uploading backup to cloud storage...', 'info');
    
    const uploadPromises = [];
    
    // Upload to AWS S3
    if (CONFIG.cloud.aws.enabled) {
      uploadPromises.push(this.uploadToAWS(backupPath));
    }
    
    // Upload to Google Cloud Storage
    if (CONFIG.cloud.gcp.enabled) {
      uploadPromises.push(this.uploadToGCP(backupPath));
    }
    
    if (uploadPromises.length === 0) {
      this.log('⚠️ No cloud storage configured, skipping upload', 'warning');
      return;
    }
    
    try {
      const results = await Promise.allSettled(uploadPromises);
      
      results.forEach((result, index) => {
        const provider = index === 0 ? 'AWS' : 'GCP';
        if (result.status === 'fulfilled') {
          this.log(`✅ Uploaded to ${provider}`, 'success');
        } else {
          this.log(`❌ Failed to upload to ${provider}: ${result.reason.message}`, 'error');
        }
      });
      
    } catch (error) {
      this.log(`⚠️ Cloud upload error: ${error.message}`, 'warning');
    }
  }

  async uploadToAWS(backupPath) {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: CONFIG.cloud.aws.region
    });
    
    const fileName = path.basename(backupPath);
    const key = `${this.getDatePath()}/${fileName}`;
    
    const uploadParams = {
      Bucket: CONFIG.cloud.aws.bucket,
      Key: key,
      Body: createReadStream(backupPath),
      StorageClass: CONFIG.cloud.aws.storageClass,
      Metadata: {
        'backup-id': this.backupId,
        'backup-type': this.options.type,
        'created-at': new Date().toISOString()
      }
    };
    
    await s3.upload(uploadParams).promise();
    this.log(`📤 Uploaded to AWS S3: s3://${CONFIG.cloud.aws.bucket}/${key}`, 'debug');
  }

  async uploadToGCP(backupPath) {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({
      projectId: CONFIG.cloud.gcp.projectId
    });
    
    const bucket = storage.bucket(CONFIG.cloud.gcp.bucket);
    const fileName = path.basename(backupPath);
    const key = `${this.getDatePath()}/${fileName}`;
    
    await bucket.upload(backupPath, {
      destination: key,
      metadata: {
        metadata: {
          'backup-id': this.backupId,
          'backup-type': this.options.type,
          'created-at': new Date().toISOString()
        }
      }
    });
    
    this.log(`📤 Uploaded to GCP Storage: gs://${CONFIG.cloud.gcp.bucket}/${key}`, 'debug');
  }

  async cleanupOldBackups() {
    this.log('🧹 Cleaning up old backups...', 'info');
    
    try {
      const backupDir = CONFIG.backup.baseDir;
      const now = new Date();
      
      // Get all backup files
      const backupFiles = await this.findBackupFiles(backupDir);
      
      // Group by type and age
      const toDelete = [];
      
      for (const file of backupFiles) {
        const age = this.getBackupAge(file.path, now);
        const shouldDelete = this.shouldDeleteBackup(file, age);
        
        if (shouldDelete) {
          toDelete.push(file);
        }
      }
      
      // Delete old backups
      for (const file of toDelete) {
        try {
          await fs.unlink(file.path);
          
          // Also delete verification file if exists
          const verificationPath = `${file.path}.verification.json`;
          try {
            await fs.unlink(verificationPath);
          } catch (error) {
            // Verification file might not exist
          }
          
          this.log(`🗑️ Deleted old backup: ${path.basename(file.path)}`, 'debug');
        } catch (error) {
          this.log(`⚠️ Could not delete ${file.path}: ${error.message}`, 'warning');
        }
      }
      
      this.log(`✅ Cleanup completed: ${toDelete.length} old backups removed`, 'success');
      
    } catch (error) {
      this.log(`⚠️ Cleanup error: ${error.message}`, 'warning');
    }
  }

  async findBackupFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findBackupFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.tar.gz')) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  getBackupAge(filePath, now) {
    const pathParts = filePath.split(path.sep);
    const dateIndex = pathParts.findIndex(part => /^\d{4}$/.test(part));
    
    if (dateIndex >= 0 && dateIndex + 2 < pathParts.length) {
      const year = parseInt(pathParts[dateIndex]);
      const month = parseInt(pathParts[dateIndex + 1]) - 1;
      const day = parseInt(pathParts[dateIndex + 2]);
      
      const backupDate = new Date(year, month, day);
      return Math.floor((now - backupDate) / (1000 * 60 * 60 * 24)); // days
    }
    
    return 0;
  }

  shouldDeleteBackup(file, ageInDays) {
    // Keep all backups less than 1 day old
    if (ageInDays < 1) return false;
    
    // Daily backups: keep for 7 days
    if (ageInDays <= 7) return false;
    
    // Weekly backups: keep one per week for 4 weeks
    if (ageInDays <= 28 && ageInDays % 7 === 0) return false;
    
    // Monthly backups: keep one per month for 12 months
    if (ageInDays <= 365 && ageInDays % 30 === 0) return false;
    
    // Delete everything else
    return true;
  }

  async sendNotification(type, backupPath = null, error = null) {
    const message = this.createNotificationMessage(type, backupPath, error);
    
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

  createNotificationMessage(type, backupPath, error) {
    const duration = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    const emoji = type === 'success' ? '✅' : '❌';
    const status = type === 'success' ? 'SUCCESS' : 'FAILED';
    
    let message = `${emoji} Backup ${status}\n`;
    message += `Type: ${this.options.type}\n`;
    message += `Schedule: ${this.options.schedule}\n`;
    message += `Duration: ${duration}s\n`;
    message += `Backup ID: ${this.backupId}\n`;
    
    if (type === 'success' && backupPath) {
      message += `Path: ${backupPath}\n`;
      message += `Size: ${this.formatBytes(this.metrics.totalSize)}\n`;
    } else if (error) {
      message += `Error: ${error.message}\n`;
    }
    
    return message;
  }

  async sendSlackNotification(message, type) {
    const color = type === 'success' ? 'good' : 'danger';
    
    const payload = {
      channel: CONFIG.notifications.slack.channel,
      username: 'Backup Bot',
      icon_emoji: ':floppy_disk:',
      attachments: [{
        color,
        title: `Money Maker Platform - ${this.options.type} Backup`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    const axios = require('axios');
    await axios.post(CONFIG.notifications.slack.webhook, payload);
  }

  async sendEmailNotification(message, type) {
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

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatMetrics() {
    return `Size: ${this.formatBytes(this.metrics.totalSize)}, Files: ${this.metrics.filesCount}, Duration: ${Math.round(this.metrics.duration / 1000)}s`;
  }
}

// Recovery Manager
class RecoveryManager {
  constructor(backupPath) {
    this.backupPath = backupPath;
    this.recoveryId = `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async restore(options = {}) {
    const { type = 'full', target = 'current', dryRun = false } = options;
    
    try {
      this.log(`🔄 Starting ${type} recovery (${this.recoveryId})`, 'info');
      
      if (dryRun) {
        this.log('🧪 DRY RUN MODE - No actual recovery will occur', 'warning');
      }
      
      // Verify backup exists and is valid
      await this.verifyBackupFile();
      
      // Extract backup
      const extractPath = await this.extractBackup();
      
      // Perform recovery based on type
      switch (type) {
        case 'database':
          await this.restoreDatabase(extractPath, dryRun);
          break;
        case 'files':
          await this.restoreFiles(extractPath, dryRun);
          break;
        case 'full':
        default:
          await this.restoreDatabase(extractPath, dryRun);
          await this.restoreFiles(extractPath, dryRun);
          break;
      }
      
      // Cleanup extraction directory
      if (!dryRun) {
        await this.cleanup(extractPath);
      }
      
      this.log(`🎉 Recovery completed successfully`, 'success');
      
      return {
        success: true,
        recoveryId: this.recoveryId,
        logs: this.logs
      };
      
    } catch (error) {
      this.log(`💥 Recovery failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async verifyBackupFile() {
    try {
      const stats = await fs.stat(this.backupPath);
      
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      this.log(`✅ Backup file verified: ${this.formatBytes(stats.size)}`, 'success');
      
    } catch (error) {
      throw new Error(`Backup verification failed: ${error.message}`);
    }
  }

  async extractBackup() {
    const extractPath = path.join(path.dirname(this.backupPath), `extract-${this.recoveryId}`);
    await fs.mkdir(extractPath, { recursive: true });
    
    this.log('📦 Extracting backup...', 'info');
    
    const command = `tar -xzf "${this.backupPath}" -C "${extractPath}"`;
    await this.executeCommand(command, 600000); // 10 minute timeout
    
    this.log(`✅ Backup extracted to: ${extractPath}`, 'success');
    return extractPath;
  }

  async restoreDatabase(extractPath, dryRun) {
    this.log('🗄️ Restoring database...', 'info');
    
    const dbPath = path.join(extractPath, 'database', CONFIG.database.name);
    
    try {
      await fs.access(dbPath);
    } catch (error) {
      // Try alternative path structure
      const altDbPath = path.join(extractPath, CONFIG.database.name);
      try {
        await fs.access(altDbPath);
        dbPath = altDbPath;
      } catch (altError) {
        throw new Error('Database backup not found in extracted files');
      }
    }
    
    if (dryRun) {
      this.log('🧪 DRY RUN: Would restore database from ' + dbPath, 'info');
      return;
    }
    
    // Build mongorestore command
    const uri = new URL(CONFIG.database.uri);
    let cmd = `mongorestore --host ${uri.hostname}:${uri.port || 27017}`;
    
    if (uri.username && uri.password) {
      cmd += ` --username ${uri.username} --password ${uri.password}`;
    }
    
    if (CONFIG.database.options.authenticationDatabase) {
      cmd += ` --authenticationDatabase ${CONFIG.database.options.authenticationDatabase}`;
    }
    
    if (CONFIG.database.options.ssl) {
      cmd += ` --ssl`;
    }
    
    cmd += ` --db ${CONFIG.database.name} --drop ${dbPath}`;
    
    await this.executeCommand(cmd, 600000); // 10 minute timeout
    
    this.log('✅ Database restored successfully', 'success');
  }

  async restoreFiles(extractPath, dryRun) {
    this.log('📁 Restoring files...', 'info');
    
    const filesPath = path.join(extractPath, 'files');
    
    try {
      await fs.access(filesPath);
    } catch (error) {
      this.log('⚠️ Files backup not found, skipping file restoration', 'warning');
      return;
    }
    
    if (dryRun) {
      this.log('🧪 DRY RUN: Would restore files from ' + filesPath, 'info');
      return;
    }
    
    // Restore each directory
    const entries = await fs.readdir(filesPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sourcePath = path.join(filesPath, entry.name);
        const targetDir = CONFIG.files.directories.find(d => d.name === entry.name);
        
        if (targetDir) {
          this.log(`📂 Restoring ${entry.name}...`, 'debug');
          
          // Backup existing directory
          const backupSuffix = `.backup-${Date.now()}`;
          try {
            await fs.rename(targetDir.path, `${targetDir.path}${backupSuffix}`);
          } catch (error) {
            // Directory might not exist
          }
          
          // Copy restored files
          await this.copyDirectory(sourcePath, targetDir.path);
          
          this.log(`✅ Restored ${entry.name}`, 'success');
        } else {
          this.log(`⚠️ Unknown directory in backup: ${entry.name}`, 'warning');
        }
      }
    }
  }

  async copyDirectory(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async cleanup(extractPath) {
    try {
      await fs.rm(extractPath, { recursive: true, force: true });
      this.log(`🧹 Cleaned up extraction directory`, 'debug');
    } catch (error) {
      this.log(`⚠️ Could not cleanup extraction directory: ${error.message}`, 'warning');
    }
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
  
  if (!command || !['backup', 'restore', 'list', 'cleanup'].includes(command)) {
    console.error('❌ Usage: node backup.js <command> [options]');
    console.error('\nCommands:');
    console.error('  backup [type]     Create backup (full, database, files)');
    console.error('  restore <path>    Restore from backup');
    console.error('  list             List available backups');
    console.error('  cleanup          Clean up old backups');
    console.error('\nOptions:');
    console.error('  --dry-run        Show what would be done without executing');
    console.error('  --no-verify      Skip backup verification');
    console.error('  --no-upload      Skip cloud upload');
    console.error('  --no-cleanup     Skip cleanup of old backups');
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'backup': {
        const type = args[1] || 'full';
        const options = {
          type,
          verify: !args.includes('--no-verify'),
          upload: !args.includes('--no-upload'),
          cleanup: !args.includes('--no-cleanup'),
          schedule: 'manual'
        };
        
        const backup = new BackupManager(options);
        const result = await backup.createBackup();
        
        console.log('\n🎉 Backup completed successfully!');
        console.log(`📋 Backup ID: ${result.backupId}`);
        console.log(`📁 Path: ${result.path}`);
        console.log(`📊 Metrics: ${backup.formatMetrics()}`);
        break;
      }
      
      case 'restore': {
        const backupPath = args[1];
        if (!backupPath) {
          console.error('❌ Please specify backup path');
          process.exit(1);
        }
        
        const options = {
          type: args[2] || 'full',
          dryRun: args.includes('--dry-run')
        };
        
        const recovery = new RecoveryManager(backupPath);
        await recovery.restore(options);
        
        console.log('\n🎉 Recovery completed successfully!');
        break;
      }
      
      case 'list': {
        // List available backups
        console.log('📋 Available backups:');
        // Implementation would list backups from backup directory
        break;
      }
      
      case 'cleanup': {
        const backup = new BackupManager({ cleanup: true });
        await backup.cleanupOldBackups();
        console.log('\n🧹 Cleanup completed!');
        break;
      }
    }
    
  } catch (error) {
    console.error('\n💥 Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BackupManager, RecoveryManager };