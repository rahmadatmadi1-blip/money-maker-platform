#!/usr/bin/env node

/**
 * Database Migration dan Schema Management untuk Money Maker Platform
 * 
 * Script ini menangani:
 * 1. Database schema migrations
 * 2. Data migrations
 * 3. Index management
 * 4. Schema versioning
 * 5. Rollback capabilities
 * 6. Migration validation
 * 7. Backup before migration
 * 8. Migration history tracking
 */

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker',
    options: {
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  migrations: {
    directory: path.join(__dirname, '..', 'migrations'),
    backupDirectory: path.join(__dirname, '..', 'migration-backups'),
    collectionName: 'migrations',
    lockCollectionName: 'migration_lock',
    batchSize: 1000,
    timeout: 300000, // 5 minutes
    dryRun: false
  },
  backup: {
    enabled: true,
    compression: true,
    retention: 30, // days
    directory: path.join(__dirname, '..', 'migration-backups')
  },
  validation: {
    enabled: true,
    strictMode: false,
    validateIndexes: true,
    validateData: true
  },
  logging: {
    level: 'info',
    file: path.join(__dirname, '..', 'logs', 'migration.log')
  }
};

class MigrationManager {
  constructor(options = {}) {
    this.options = { ...CONFIG, ...options };
    this.client = null;
    this.db = null;
    this.migrationLock = null;
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

  async connect() {
    try {
      this.client = new MongoClient(this.options.database.uri, this.options.database.options);
      await this.client.connect();
      this.db = this.client.db();
      
      this.log('Connected to MongoDB', 'success');
      
      // Ensure migration collections exist
      await this.ensureMigrationCollections();
      
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.log('Disconnected from MongoDB', 'info');
    }
  }

  async ensureMigrationCollections() {
    // Create migrations collection if it doesn't exist
    const collections = await this.db.listCollections().toArray();
    const migrationCollectionExists = collections.some(col => col.name === this.options.migrations.collectionName);
    
    if (!migrationCollectionExists) {
      await this.db.createCollection(this.options.migrations.collectionName);
      await this.db.collection(this.options.migrations.collectionName).createIndex({ version: 1 }, { unique: true });
      this.log('Created migrations collection', 'success');
    }
    
    // Create migration lock collection
    const lockCollectionExists = collections.some(col => col.name === this.options.migrations.lockCollectionName);
    
    if (!lockCollectionExists) {
      await this.db.createCollection(this.options.migrations.lockCollectionName);
      this.log('Created migration lock collection', 'success');
    }
  }

  async acquireLock() {
    const lockCollection = this.db.collection(this.options.migrations.lockCollectionName);
    const lockId = 'migration_lock';
    
    try {
      const result = await lockCollection.insertOne({
        _id: lockId,
        locked: true,
        lockedAt: new Date(),
        process: process.pid
      });
      
      if (result.insertedId) {
        this.migrationLock = lockId;
        this.log('Acquired migration lock', 'success');
        return true;
      }
    } catch (error) {
      if (error.code === 11000) { // Duplicate key error
        throw new Error('Migration is already running. Please wait for it to complete.');
      }
      throw error;
    }
    
    return false;
  }

  async releaseLock() {
    if (this.migrationLock) {
      const lockCollection = this.db.collection(this.options.migrations.lockCollectionName);
      await lockCollection.deleteOne({ _id: this.migrationLock });
      this.migrationLock = null;
      this.log('Released migration lock', 'success');
    }
  }

  async getMigrationFiles() {
    try {
      await fs.access(this.options.migrations.directory);
    } catch (error) {
      await fs.mkdir(this.options.migrations.directory, { recursive: true });
      this.log('Created migrations directory', 'success');
      return [];
    }
    
    const files = await fs.readdir(this.options.migrations.directory);
    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort()
      .map(file => ({
        filename: file,
        path: path.join(this.options.migrations.directory, file),
        version: this.extractVersionFromFilename(file)
      }));
    
    return migrationFiles;
  }

  extractVersionFromFilename(filename) {
    // Extract version from filename like: 001_create_users_collection.js
    const match = filename.match(/^(\d+)_/);
    return match ? parseInt(match[1]) : 0;
  }

  async getAppliedMigrations() {
    const migrationsCollection = this.db.collection(this.options.migrations.collectionName);
    const applied = await migrationsCollection.find({}).sort({ version: 1 }).toArray();
    return applied;
  }

  async getPendingMigrations() {
    const migrationFiles = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    return migrationFiles.filter(file => !appliedVersions.has(file.version));
  }

  async loadMigration(migrationPath) {
    try {
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(migrationPath)];
      const migration = require(migrationPath);
      
      // Validate migration structure
      if (!migration.up || typeof migration.up !== 'function') {
        throw new Error('Migration must export an "up" function');
      }
      
      if (!migration.down || typeof migration.down !== 'function') {
        throw new Error('Migration must export a "down" function');
      }
      
      return migration;
    } catch (error) {
      throw new Error(`Failed to load migration ${migrationPath}: ${error.message}`);
    }
  }

  async validateMigration(migration, migrationFile) {
    if (!this.options.validation.enabled) {
      return true;
    }
    
    try {
      // Check if migration has required metadata
      if (!migration.description) {
        this.log(`Warning: Migration ${migrationFile.filename} has no description`, 'warning');
      }
      
      if (!migration.version) {
        migration.version = migrationFile.version;
      }
      
      // Validate migration in dry-run mode if possible
      if (migration.validate && typeof migration.validate === 'function') {
        await migration.validate(this.db);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Migration validation failed: ${error.message}`);
    }
  }

  async createBackup(migrationVersion) {
    if (!this.options.backup.enabled) {
      return null;
    }
    
    this.log('Creating backup before migration...', 'info');
    
    try {
      const backupName = `backup_before_migration_${migrationVersion}_${Date.now()}`;
      const backupPath = path.join(this.options.backup.directory, `${backupName}.json`);
      
      // Ensure backup directory exists
      await fs.mkdir(this.options.backup.directory, { recursive: true });
      
      // Get all collections
      const collections = await this.db.listCollections().toArray();
      const backup = {
        timestamp: new Date().toISOString(),
        version: migrationVersion,
        collections: {}
      };
      
      // Backup each collection
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }
        
        const collection = this.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        const indexes = await collection.indexes();
        
        backup.collections[collectionName] = {
          documents,
          indexes,
          count: documents.length
        };
      }
      
      // Write backup to file
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      
      // Compress if enabled
      if (this.options.backup.compression) {
        const { gzip } = require('zlib');
        const { promisify } = require('util');
        const gzipAsync = promisify(gzip);
        
        const compressed = await gzipAsync(JSON.stringify(backup));
        await fs.writeFile(`${backupPath}.gz`, compressed);
        await fs.unlink(backupPath); // Remove uncompressed version
        
        this.log(`Backup created: ${backupName}.json.gz`, 'success');
        return `${backupPath}.gz`;
      }
      
      this.log(`Backup created: ${backupName}.json`, 'success');
      return backupPath;
      
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  async runMigration(migrationFile, direction = 'up') {
    const migration = await this.loadMigration(migrationFile.path);
    await this.validateMigration(migration, migrationFile);
    
    this.log(`Running migration ${migrationFile.filename} (${direction})...`, 'info');
    
    const startTime = Date.now();
    
    try {
      // Create backup before migration
      let backupPath = null;
      if (direction === 'up') {
        backupPath = await this.createBackup(migrationFile.version);
      }
      
      // Run migration in transaction if supported
      const session = this.client.startSession();
      
      try {
        await session.withTransaction(async () => {
          if (direction === 'up') {
            await migration.up(this.db, session);
          } else {
            await migration.down(this.db, session);
          }
        });
      } finally {
        await session.endSession();
      }
      
      const duration = Date.now() - startTime;
      
      // Update migration record
      const migrationsCollection = this.db.collection(this.options.migrations.collectionName);
      
      if (direction === 'up') {
        await migrationsCollection.insertOne({
          version: migrationFile.version,
          filename: migrationFile.filename,
          description: migration.description || 'No description',
          appliedAt: new Date(),
          duration,
          backupPath,
          checksum: await this.calculateFileChecksum(migrationFile.path)
        });
      } else {
        await migrationsCollection.deleteOne({ version: migrationFile.version });
      }
      
      this.log(`Migration ${migrationFile.filename} completed in ${duration}ms`, 'success');
      
      return {
        version: migrationFile.version,
        filename: migrationFile.filename,
        direction,
        duration,
        backupPath
      };
      
    } catch (error) {
      this.log(`Migration ${migrationFile.filename} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async calculateFileChecksum(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async migrate(targetVersion = null) {
    await this.connect();
    
    try {
      await this.acquireLock();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        this.log('No pending migrations found', 'info');
        return { applied: [], skipped: 0 };
      }
      
      let migrationsToRun = pendingMigrations;
      
      // Filter by target version if specified
      if (targetVersion !== null) {
        migrationsToRun = pendingMigrations.filter(m => m.version <= targetVersion);
      }
      
      this.log(`Found ${migrationsToRun.length} migrations to apply`, 'info');
      
      const results = [];
      
      for (const migrationFile of migrationsToRun) {
        if (this.options.migrations.dryRun) {
          this.log(`DRY RUN: Would apply migration ${migrationFile.filename}`, 'info');
          continue;
        }
        
        const result = await this.runMigration(migrationFile, 'up');
        results.push(result);
      }
      
      if (this.options.migrations.dryRun) {
        this.log('DRY RUN completed - no migrations were actually applied', 'info');
      } else {
        this.log(`Successfully applied ${results.length} migrations`, 'success');
      }
      
      return {
        applied: results,
        skipped: pendingMigrations.length - migrationsToRun.length
      };
      
    } finally {
      await this.releaseLock();
      await this.disconnect();
    }
  }

  async rollback(targetVersion = null, steps = 1) {
    await this.connect();
    
    try {
      await this.acquireLock();
      
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        this.log('No migrations to rollback', 'info');
        return { rolledBack: [] };
      }
      
      let migrationsToRollback;
      
      if (targetVersion !== null) {
        // Rollback to specific version
        migrationsToRollback = appliedMigrations
          .filter(m => m.version > targetVersion)
          .sort((a, b) => b.version - a.version);
      } else {
        // Rollback specific number of steps
        migrationsToRollback = appliedMigrations
          .sort((a, b) => b.version - a.version)
          .slice(0, steps);
      }
      
      if (migrationsToRollback.length === 0) {
        this.log('No migrations to rollback', 'info');
        return { rolledBack: [] };
      }
      
      this.log(`Rolling back ${migrationsToRollback.length} migrations`, 'info');
      
      const results = [];
      
      for (const appliedMigration of migrationsToRollback) {
        // Find migration file
        const migrationFiles = await this.getMigrationFiles();
        const migrationFile = migrationFiles.find(f => f.version === appliedMigration.version);
        
        if (!migrationFile) {
          this.log(`Migration file not found for version ${appliedMigration.version}`, 'warning');
          continue;
        }
        
        if (this.options.migrations.dryRun) {
          this.log(`DRY RUN: Would rollback migration ${migrationFile.filename}`, 'info');
          continue;
        }
        
        const result = await this.runMigration(migrationFile, 'down');
        results.push(result);
      }
      
      if (this.options.migrations.dryRun) {
        this.log('DRY RUN completed - no migrations were actually rolled back', 'info');
      } else {
        this.log(`Successfully rolled back ${results.length} migrations`, 'success');
      }
      
      return { rolledBack: results };
      
    } finally {
      await this.releaseLock();
      await this.disconnect();
    }
  }

  async status() {
    await this.connect();
    
    try {
      const migrationFiles = await this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedVersions = new Set(appliedMigrations.map(m => m.version));
      
      const status = {
        total: migrationFiles.length,
        applied: appliedMigrations.length,
        pending: migrationFiles.length - appliedMigrations.length,
        migrations: []
      };
      
      for (const file of migrationFiles) {
        const isApplied = appliedVersions.has(file.version);
        const appliedMigration = appliedMigrations.find(m => m.version === file.version);
        
        status.migrations.push({
          version: file.version,
          filename: file.filename,
          status: isApplied ? 'applied' : 'pending',
          appliedAt: appliedMigration?.appliedAt || null,
          duration: appliedMigration?.duration || null
        });
      }
      
      return status;
      
    } finally {
      await this.disconnect();
    }
  }

  async createMigration(name, description = '') {
    const migrationFiles = await this.getMigrationFiles();
    const nextVersion = migrationFiles.length > 0 
      ? Math.max(...migrationFiles.map(f => f.version)) + 1 
      : 1;
    
    const paddedVersion = nextVersion.toString().padStart(3, '0');
    const filename = `${paddedVersion}_${name.toLowerCase().replace(/\s+/g, '_')}.js`;
    const filePath = path.join(this.options.migrations.directory, filename);
    
    // Ensure migrations directory exists
    await fs.mkdir(this.options.migrations.directory, { recursive: true });
    
    const template = `/**
 * Migration: ${name}
 * Description: ${description}
 * Version: ${nextVersion}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  version: ${nextVersion},
  description: '${description}',
  
  async up(db, session) {
    // Migration logic goes here
    // Example:
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    // await db.collection('products').updateMany({}, { $set: { createdAt: new Date() } });
    
    console.log('Migration ${nextVersion} (up): ${name}');
  },
  
  async down(db, session) {
    // Rollback logic goes here
    // Example:
    // await db.collection('users').dropIndex({ email: 1 });
    // await db.collection('products').updateMany({}, { $unset: { createdAt: 1 } });
    
    console.log('Migration ${nextVersion} (down): ${name}');
  },
  
  async validate(db) {
    // Optional validation logic
    // This runs before the migration to check if it's safe to proceed
    // Throw an error if validation fails
    
    return true;
  }
};
`;
    
    await fs.writeFile(filePath, template);
    
    this.log(`Created migration: ${filename}`, 'success');
    
    return {
      version: nextVersion,
      filename,
      path: filePath
    };
  }

  async cleanupBackups() {
    if (!this.options.backup.enabled) {
      return;
    }
    
    try {
      const files = await fs.readdir(this.options.backup.directory);
      const backupFiles = files.filter(file => file.startsWith('backup_before_migration_'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.backup.retention);
      
      let deletedCount = 0;
      
      for (const file of backupFiles) {
        const filePath = path.join(this.options.backup.directory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.log(`Cleaned up ${deletedCount} old backup files`, 'success');
      }
      
    } catch (error) {
      this.log(`Backup cleanup warning: ${error.message}`, 'warning');
    }
  }

  async validateDatabase() {
    await this.connect();
    
    try {
      this.log('Validating database integrity...', 'info');
      
      const collections = await this.db.listCollections().toArray();
      const issues = [];
      
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        if (collectionName.startsWith('system.')) {
          continue;
        }
        
        try {
          const collection = this.db.collection(collectionName);
          
          // Validate collection
          const result = await this.db.command({ validate: collectionName });
          
          if (!result.valid) {
            issues.push({
              collection: collectionName,
              type: 'validation',
              message: 'Collection validation failed',
              details: result
            });
          }
          
          // Check indexes
          if (this.options.validation.validateIndexes) {
            const indexes = await collection.indexes();
            
            for (const index of indexes) {
              if (index.background === true) {
                issues.push({
                  collection: collectionName,
                  type: 'index',
                  message: `Background index found: ${index.name}`,
                  severity: 'warning'
                });
              }
            }
          }
          
        } catch (error) {
          issues.push({
            collection: collectionName,
            type: 'error',
            message: error.message
          });
        }
      }
      
      if (issues.length === 0) {
        this.log('Database validation passed', 'success');
      } else {
        this.log(`Database validation found ${issues.length} issues`, 'warning');
        
        for (const issue of issues) {
          this.log(`${issue.collection}: ${issue.message}`, issue.severity || 'warning');
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
      
    } finally {
      await this.disconnect();
    }
  }

  async repairDatabase() {
    await this.connect();
    
    try {
      this.log('Repairing database...', 'info');
      
      // Run repair command
      const result = await this.db.command({ repairDatabase: 1 });
      
      if (result.ok === 1) {
        this.log('Database repair completed successfully', 'success');
      } else {
        throw new Error('Database repair failed');
      }
      
      return result;
      
    } finally {
      await this.disconnect();
    }
  }
}

// Predefined migrations for common operations
class MigrationTemplates {
  static createCollection(collectionName, options = {}) {
    return {
      async up(db) {
        await db.createCollection(collectionName, options);
        console.log(`Created collection: ${collectionName}`);
      },
      
      async down(db) {
        await db.collection(collectionName).drop();
        console.log(`Dropped collection: ${collectionName}`);
      }
    };
  }
  
  static createIndex(collectionName, indexSpec, options = {}) {
    return {
      async up(db) {
        await db.collection(collectionName).createIndex(indexSpec, options);
        console.log(`Created index on ${collectionName}:`, indexSpec);
      },
      
      async down(db) {
        await db.collection(collectionName).dropIndex(indexSpec);
        console.log(`Dropped index on ${collectionName}:`, indexSpec);
      }
    };
  }
  
  static addField(collectionName, fieldName, defaultValue, filter = {}) {
    return {
      async up(db) {
        const result = await db.collection(collectionName).updateMany(
          { ...filter, [fieldName]: { $exists: false } },
          { $set: { [fieldName]: defaultValue } }
        );
        console.log(`Added field ${fieldName} to ${result.modifiedCount} documents in ${collectionName}`);
      },
      
      async down(db) {
        const result = await db.collection(collectionName).updateMany(
          filter,
          { $unset: { [fieldName]: 1 } }
        );
        console.log(`Removed field ${fieldName} from ${result.modifiedCount} documents in ${collectionName}`);
      }
    };
  }
  
  static renameField(collectionName, oldFieldName, newFieldName, filter = {}) {
    return {
      async up(db) {
        const result = await db.collection(collectionName).updateMany(
          { ...filter, [oldFieldName]: { $exists: true } },
          { $rename: { [oldFieldName]: newFieldName } }
        );
        console.log(`Renamed field ${oldFieldName} to ${newFieldName} in ${result.modifiedCount} documents`);
      },
      
      async down(db) {
        const result = await db.collection(collectionName).updateMany(
          { ...filter, [newFieldName]: { $exists: true } },
          { $rename: { [newFieldName]: oldFieldName } }
        );
        console.log(`Renamed field ${newFieldName} back to ${oldFieldName} in ${result.modifiedCount} documents`);
      }
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !['migrate', 'rollback', 'status', 'create', 'validate', 'repair', 'cleanup'].includes(command)) {
    console.error('❌ Usage: node migration.js <command> [options]');
    console.error('\nCommands:');
    console.error('  migrate [version]     Apply pending migrations (optionally up to version)');
    console.error('  rollback [version|steps]  Rollback migrations (to version or number of steps)');
    console.error('  status                Show migration status');
    console.error('  create <name>         Create new migration file');
    console.error('  validate              Validate database integrity');
    console.error('  repair                Repair database');
    console.error('  cleanup               Clean up old backup files');
    console.error('\nOptions:');
    console.error('  --dry-run             Show what would be done without executing');
    console.error('  --no-backup           Skip backup creation');
    console.error('  --force               Force operation without confirmations');
    process.exit(1);
  }
  
  try {
    const options = {
      migrations: {
        ...CONFIG.migrations,
        dryRun: args.includes('--dry-run')
      },
      backup: {
        ...CONFIG.backup,
        enabled: !args.includes('--no-backup')
      }
    };
    
    const manager = new MigrationManager(options);
    
    switch (command) {
      case 'migrate': {
        const targetVersion = args[1] ? parseInt(args[1]) : null;
        const result = await manager.migrate(targetVersion);
        
        console.log('\n🚀 Migration completed!');
        console.log(`📊 Applied: ${result.applied.length}`);
        console.log(`⏭️ Skipped: ${result.skipped}`);
        
        if (result.applied.length > 0) {
          console.log('\n📋 Applied migrations:');
          result.applied.forEach(m => {
            console.log(`  ✅ ${m.filename} (${m.duration}ms)`);
          });
        }
        break;
      }
      
      case 'rollback': {
        const target = args[1];
        let result;
        
        if (target && !isNaN(target)) {
          const targetVersion = parseInt(target);
          if (targetVersion > 100) {
            // Assume it's a version number
            result = await manager.rollback(targetVersion);
          } else {
            // Assume it's number of steps
            result = await manager.rollback(null, targetVersion);
          }
        } else {
          result = await manager.rollback();
        }
        
        console.log('\n🔄 Rollback completed!');
        console.log(`📊 Rolled back: ${result.rolledBack.length}`);
        
        if (result.rolledBack.length > 0) {
          console.log('\n📋 Rolled back migrations:');
          result.rolledBack.forEach(m => {
            console.log(`  ↩️ ${m.filename} (${m.duration}ms)`);
          });
        }
        break;
      }
      
      case 'status': {
        const status = await manager.status();
        
        console.log('\n📊 Migration Status:');
        console.log(`Total migrations: ${status.total}`);
        console.log(`Applied: ${status.applied}`);
        console.log(`Pending: ${status.pending}`);
        
        if (status.migrations.length > 0) {
          console.log('\n📋 Migrations:');
          status.migrations.forEach(m => {
            const statusIcon = m.status === 'applied' ? '✅' : '⏳';
            const appliedInfo = m.appliedAt ? ` (${new Date(m.appliedAt).toLocaleDateString()})` : '';
            console.log(`  ${statusIcon} ${m.filename}${appliedInfo}`);
          });
        }
        break;
      }
      
      case 'create': {
        const name = args[1];
        if (!name) {
          console.error('❌ Migration name is required');
          process.exit(1);
        }
        
        const description = args.slice(2).join(' ') || '';
        const result = await manager.createMigration(name, description);
        
        console.log('\n📝 Migration created!');
        console.log(`📄 File: ${result.filename}`);
        console.log(`📍 Path: ${result.path}`);
        console.log(`🔢 Version: ${result.version}`);
        break;
      }
      
      case 'validate': {
        const result = await manager.validateDatabase();
        
        if (result.valid) {
          console.log('\n✅ Database validation passed!');
        } else {
          console.log('\n⚠️ Database validation found issues:');
          result.issues.forEach(issue => {
            console.log(`  ❌ ${issue.collection}: ${issue.message}`);
          });
        }
        break;
      }
      
      case 'repair': {
        await manager.repairDatabase();
        console.log('\n🔧 Database repair completed!');
        break;
      }
      
      case 'cleanup': {
        await manager.cleanupBackups();
        console.log('\n🧹 Backup cleanup completed!');
        break;
      }
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MigrationManager, MigrationTemplates };