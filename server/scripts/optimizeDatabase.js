#!/usr/bin/env node

/**
 * Database Optimization Script
 * Runs database optimization tasks including indexing and cleanup
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { DatabaseOptimizer } = require('../utils/databaseOptimization');

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class DatabaseOptimizationRunner {
  constructor() {
    this.optimizer = new DatabaseOptimizer();
  }

  async connectDatabase() {
    try {
      log('🔌 Connecting to MongoDB...', 'cyan');
      
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneymaker';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      log('✅ Connected to MongoDB successfully', 'green');
      
      // Log connection details
      const db = mongoose.connection.db;
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();
      
      log(`📊 Database: ${db.databaseName}`, 'blue');
      log(`🏷️  MongoDB Version: ${serverStatus.version}`, 'blue');
      log(`💾 Storage Engine: ${serverStatus.storageEngine.name}`, 'blue');
      
    } catch (error) {
      log(`❌ Database connection failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async runOptimization(options = {}) {
    const {
      createIndexes = true,
      cleanup = true,
      monitoring = true,
      generateReport = true
    } = options;

    try {
      log('\n🚀 Starting Database Optimization...', 'magenta');
      log('='.repeat(50), 'magenta');

      // Step 1: Create Indexes
      if (createIndexes) {
        log('\n📋 Step 1: Creating Optimized Indexes', 'cyan');
        await this.optimizer.optimizeDatabase();
      }

      // Step 2: Cleanup Old Data
      if (cleanup) {
        log('\n🧹 Step 2: Cleaning Up Old Data', 'cyan');
        const cleanupResults = await this.optimizer.cleanupOldData();
        log(`✅ Cleanup completed: ${JSON.stringify(cleanupResults)}`, 'green');
      }

      // Step 3: Start Monitoring
      if (monitoring) {
        log('\n📊 Step 3: Starting Performance Monitoring', 'cyan');
        this.optimizer.startQueryMonitoring();
        log('✅ Query monitoring activated', 'green');
      }

      // Step 4: Generate Report
      if (generateReport) {
        log('\n📈 Step 4: Generating Performance Report', 'cyan');
        const report = await this.optimizer.generatePerformanceReport();
        await this.saveReport(report);
        this.displayReport(report);
      }

      log('\n🎉 Database optimization completed successfully!', 'green');
      
    } catch (error) {
      log(`❌ Optimization failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async saveReport(report) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const reportsDir = path.join(__dirname, '..', 'reports');
      
      // Create reports directory if it doesn't exist
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `db-performance-${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      log(`📄 Report saved to: ${filepath}`, 'blue');
      
    } catch (error) {
      log(`⚠️  Could not save report: ${error.message}`, 'yellow');
    }
  }

  displayReport(report) {
    log('\n📊 Performance Report Summary', 'magenta');
    log('='.repeat(30), 'magenta');
    
    // Database stats
    log(`\n💾 Database Statistics:`, 'cyan');
    log(`  Collections: ${report.database.collections}`, 'blue');
    log(`  Total Objects: ${report.database.objects.toLocaleString()}`, 'blue');
    log(`  Data Size: ${this.formatBytes(report.database.dataSize)}`, 'blue');
    log(`  Storage Size: ${this.formatBytes(report.database.storageSize)}`, 'blue');
    log(`  Index Size: ${this.formatBytes(report.database.indexSize)}`, 'blue');
    
    // Collection stats
    log(`\n📋 Collection Statistics:`, 'cyan');
    Object.entries(report.collections).forEach(([name, stats]) => {
      log(`  ${name}:`, 'blue');
      log(`    Documents: ${stats.count.toLocaleString()}`, 'blue');
      log(`    Size: ${this.formatBytes(stats.size)}`, 'blue');
      log(`    Indexes: ${stats.indexCount}`, 'blue');
      log(`    Index Size: ${this.formatBytes(stats.totalIndexSize)}`, 'blue');
    });
    
    // Performance stats
    log(`\n⚡ Performance Statistics:`, 'cyan');
    log(`  Slow Queries: ${report.performance.slowQueries}`, 'blue');
    log(`  Avg Query Time: ${report.performance.avgQueryTime}ms`, 'blue');
    
    // Recommendations
    if (report.recommendations.length > 0) {
      log(`\n💡 Recommendations:`, 'yellow');
      report.recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'blue';
        log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`, priorityColor);
      });
    } else {
      log(`\n✅ No recommendations - database is well optimized!`, 'green');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async testQueries() {
    log('\n🧪 Testing Optimized Queries...', 'cyan');
    
    const { UserQueries } = require('../utils/databaseOptimization');
    
    try {
      // Test various query patterns
      const tests = [
        {
          name: 'Find Active Users',
          query: () => UserQueries.findActiveUsers(1, 10)
        },
        {
          name: 'Search Users',
          query: () => UserQueries.searchUsers('test', 1, 5)
        },
        {
          name: 'Get Premium Users',
          query: () => UserQueries.getPremiumUsers(1, 5)
        },
        {
          name: 'Get User Analytics',
          query: () => UserQueries.getUserAnalytics()
        },
        {
          name: 'Get Top Earners',
          query: () => UserQueries.getTopEarners(5)
        }
      ];
      
      for (const test of tests) {
        const startTime = Date.now();
        try {
          await test.query();
          const duration = Date.now() - startTime;
          const status = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';
          log(`  ${status} ${test.name}: ${duration}ms`, duration < 100 ? 'green' : duration < 500 ? 'yellow' : 'red');
        } catch (error) {
          log(`  ❌ ${test.name}: Failed - ${error.message}`, 'red');
        }
      }
      
    } catch (error) {
      log(`❌ Query testing failed: ${error.message}`, 'red');
    }
  }

  async showIndexes() {
    log('\n📋 Current Database Indexes:', 'cyan');
    
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const indexes = await db.collection(collection.name).indexes();
        log(`\n  ${collection.name}:`, 'blue');
        
        indexes.forEach(index => {
          const keyStr = Object.entries(index.key)
            .map(([field, direction]) => `${field}: ${direction}`)
            .join(', ');
          log(`    - ${index.name}: { ${keyStr} }`, 'blue');
          
          if (index.unique) log(`      (unique)`, 'yellow');
          if (index.sparse) log(`      (sparse)`, 'yellow');
          if (index.expireAfterSeconds) log(`      (TTL: ${index.expireAfterSeconds}s)`, 'yellow');
        });
      }
      
    } catch (error) {
      log(`❌ Could not retrieve indexes: ${error.message}`, 'red');
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      log('\n👋 Disconnected from MongoDB', 'cyan');
    } catch (error) {
      log(`⚠️  Disconnect error: ${error.message}`, 'yellow');
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const runner = new DatabaseOptimizationRunner();
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Database Optimization Tool

Usage:
  node optimizeDatabase.js [options]

Options:
  --help, -h           Show this help message
  --indexes-only       Only create indexes
  --cleanup-only       Only run cleanup
  --test-queries       Test query performance
  --show-indexes       Show current indexes
  --no-report          Skip report generation
  --no-monitoring      Skip monitoring setup

Examples:
  node optimizeDatabase.js                    # Full optimization
  node optimizeDatabase.js --indexes-only     # Create indexes only
  node optimizeDatabase.js --test-queries     # Test query performance
  node optimizeDatabase.js --show-indexes     # Show current indexes
`);
      process.exit(0);
    }
    
    await runner.connectDatabase();
    
    if (args.includes('--show-indexes')) {
      await runner.showIndexes();
    } else if (args.includes('--test-queries')) {
      await runner.testQueries();
    } else {
      const options = {
        createIndexes: !args.includes('--cleanup-only'),
        cleanup: !args.includes('--indexes-only'),
        monitoring: !args.includes('--no-monitoring'),
        generateReport: !args.includes('--no-report')
      };
      
      await runner.runOptimization(options);
      
      if (args.includes('--test-queries')) {
        await runner.testQueries();
      }
    }
    
  } catch (error) {
    log(`\n💥 Script failed: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseOptimizationRunner;