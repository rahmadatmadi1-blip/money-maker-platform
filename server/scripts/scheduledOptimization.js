const cron = require('node-cron');
const DatabaseConfig = require('../config/database');
const DatabaseOptimizer = require('../utils/databaseOptimization');
require('dotenv').config();

class ScheduledOptimization {
  constructor() {
    this.dbConfig = new DatabaseConfig();
    this.optimizer = new DatabaseOptimizer();
    this.isRunning = false;
    this.jobs = new Map();
  }

  /**
   * Initialize scheduled optimization tasks
   */
  async initialize() {
    try {
      console.log('🕐 Initializing scheduled database optimization...');
      
      // Connect to database
      await this.dbConfig.connect();
      
      // Schedule optimization tasks
      this.scheduleOptimizationTasks();
      
      console.log('✅ Scheduled optimization initialized');
      this.isRunning = true;
    } catch (error) {
      console.error('❌ Failed to initialize scheduled optimization:', error);
      throw error;
    }
  }

  /**
   * Schedule all optimization tasks
   */
  scheduleOptimizationTasks() {
    // Daily maintenance at 2 AM
    const dailyMaintenance = cron.schedule('0 2 * * *', async () => {
      await this.runDailyMaintenance();
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    this.jobs.set('dailyMaintenance', dailyMaintenance);

    // Weekly deep optimization on Sundays at 3 AM
    const weeklyOptimization = cron.schedule('0 3 * * 0', async () => {
      await this.runWeeklyOptimization();
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    this.jobs.set('weeklyOptimization', weeklyOptimization);

    // Hourly performance monitoring
    const hourlyMonitoring = cron.schedule('0 * * * *', async () => {
      await this.runHourlyMonitoring();
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    this.jobs.set('hourlyMonitoring', hourlyMonitoring);

    // Monthly cleanup on 1st day at 4 AM
    const monthlyCleanup = cron.schedule('0 4 1 * *', async () => {
      await this.runMonthlyCleanup();
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    this.jobs.set('monthlyCleanup', monthlyCleanup);

    // Start all scheduled jobs
    this.startAllJobs();
  }

  /**
   * Start all scheduled jobs
   */
  startAllJobs() {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`📅 Started scheduled job: ${name}`);
    });
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped scheduled job: ${name}`);
    });
  }

  /**
   * Run daily maintenance tasks
   */
  async runDailyMaintenance() {
    console.log('🌅 Starting daily database maintenance...');
    
    try {
      const startTime = Date.now();
      
      // Generate performance report
      const report = await this.optimizer.generatePerformanceReport();
      
      // Log slow queries if any
      if (report.slowQueries && report.slowQueries.length > 0) {
        console.log(`⚠️ Found ${report.slowQueries.length} slow queries`);
        report.slowQueries.forEach(query => {
          console.log(`   - ${query.operation}: ${query.executionTime}ms`);
        });
      }
      
      // Check index usage
      if (report.indexUsage) {
        const unusedIndexes = report.indexUsage.filter(idx => idx.usage === 0);
        if (unusedIndexes.length > 0) {
          console.log(`📊 Found ${unusedIndexes.length} unused indexes`);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Daily maintenance completed in ${duration}ms`);
      
      // Save report to file if in production
      if (process.env.NODE_ENV === 'production') {
        await this.saveReport('daily', report);
      }
    } catch (error) {
      console.error('❌ Daily maintenance failed:', error);
    }
  }

  /**
   * Run weekly optimization tasks
   */
  async runWeeklyOptimization() {
    console.log('📅 Starting weekly database optimization...');
    
    try {
      const startTime = Date.now();
      
      // Create/update indexes
      await this.optimizer.createOptimizedIndexes();
      
      // Test query performance
      const queryResults = await this.optimizer.testOptimizedQueries();
      
      // Clean old data (older than 90 days)
      const cleanupResult = await this.optimizer.cleanOldData(90);
      
      // Generate comprehensive report
      const report = await this.optimizer.generatePerformanceReport();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Weekly optimization completed in ${duration}ms`);
      console.log(`🧹 Cleaned ${cleanupResult.deletedCount || 0} old records`);
      
      // Save comprehensive report
      if (process.env.NODE_ENV === 'production') {
        await this.saveReport('weekly', {
          ...report,
          queryResults,
          cleanupResult,
          duration
        });
      }
    } catch (error) {
      console.error('❌ Weekly optimization failed:', error);
    }
  }

  /**
   * Run hourly performance monitoring
   */
  async runHourlyMonitoring() {
    try {
      const stats = await this.dbConfig.getStats();
      const health = this.dbConfig.getHealthStatus();
      
      // Check for performance issues
      if (stats.avgQueryTime > 1000) { // More than 1 second
        console.log(`⚠️ High average query time detected: ${stats.avgQueryTime}ms`);
      }
      
      if (health.readyState !== 1) {
        console.log(`⚠️ Database connection issue detected: ${health.readyState}`);
      }
      
      // Log memory usage if high
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      if (memUsageMB > 500) { // More than 500MB
        console.log(`⚠️ High memory usage detected: ${memUsageMB}MB`);
      }
    } catch (error) {
      console.error('❌ Hourly monitoring failed:', error);
    }
  }

  /**
   * Run monthly cleanup tasks
   */
  async runMonthlyCleanup() {
    console.log('🗓️ Starting monthly database cleanup...');
    
    try {
      const startTime = Date.now();
      
      // Clean very old data (older than 180 days)
      const cleanupResult = await this.optimizer.cleanOldData(180);
      
      // Compact database collections
      await this.compactCollections();
      
      // Generate monthly report
      const report = await this.optimizer.generatePerformanceReport();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Monthly cleanup completed in ${duration}ms`);
      console.log(`🧹 Cleaned ${cleanupResult.deletedCount || 0} old records`);
      
      // Save monthly report
      if (process.env.NODE_ENV === 'production') {
        await this.saveReport('monthly', {
          ...report,
          cleanupResult,
          duration
        });
      }
    } catch (error) {
      console.error('❌ Monthly cleanup failed:', error);
    }
  }

  /**
   * Compact database collections
   */
  async compactCollections() {
    try {
      const db = this.dbConfig.optimizer.db;
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          await db.command({ compact: collection.name });
          console.log(`📦 Compacted collection: ${collection.name}`);
        } catch (error) {
          console.log(`⚠️ Failed to compact ${collection.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Collection compaction failed:', error);
    }
  }

  /**
   * Save optimization report to file
   */
  async saveReport(type, report) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const reportsDir = path.join(__dirname, '../reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}-optimization-${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log(`📄 Saved ${type} report: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to save ${type} report:`, error);
    }
  }

  /**
   * Get optimization status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      nextRuns: this.getNextRunTimes()
    };
  }

  /**
   * Get next run times for all jobs
   */
  getNextRunTimes() {
    const nextRuns = {};
    this.jobs.forEach((job, name) => {
      try {
        nextRuns[name] = job.nextDates(1)[0]?.toISOString() || 'Not scheduled';
      } catch (error) {
        nextRuns[name] = 'Error getting next run time';
      }
    });
    return nextRuns;
  }

  /**
   * Shutdown scheduled optimization
   */
  async shutdown() {
    console.log('🔌 Shutting down scheduled optimization...');
    
    this.stopAllJobs();
    await this.dbConfig.disconnect();
    this.isRunning = false;
    
    console.log('✅ Scheduled optimization shutdown complete');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (global.scheduledOptimization) {
    await global.scheduledOptimization.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (global.scheduledOptimization) {
    await global.scheduledOptimization.shutdown();
  }
  process.exit(0);
});

// Export for use in other modules
module.exports = ScheduledOptimization;

// Run as standalone script
if (require.main === module) {
  const optimization = new ScheduledOptimization();
  global.scheduledOptimization = optimization;
  
  optimization.initialize()
    .then(() => {
      console.log('🚀 Scheduled database optimization is running...');
      console.log('Press Ctrl+C to stop');
    })
    .catch(error => {
      console.error('❌ Failed to start scheduled optimization:', error);
      process.exit(1);
    });
}