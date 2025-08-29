/**
 * Query Performance Monitoring Middleware
 * Monitors database query performance and provides insights
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class QueryMonitor {
  constructor(options = {}) {
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold || 100, // ms
      logSlowQueries: options.logSlowQueries !== false,
      collectStats: options.collectStats !== false,
      maxSlowQueries: options.maxSlowQueries || 100,
      enableProfiling: options.enableProfiling || false,
      ...options
    };
    
    this.queryStats = new Map();
    this.slowQueries = [];
    this.totalQueries = 0;
    this.totalQueryTime = 0;
    this.startTime = Date.now();
  }

  /**
   * Initialize query monitoring
   */
  initialize() {
    if (this.options.collectStats) {
      this.setupMongooseDebug();
    }
    
    if (this.options.enableProfiling) {
      this.enableDatabaseProfiling();
    }
    
    // Periodic stats logging
    if (this.options.logSlowQueries) {
      setInterval(() => {
        this.logPerformanceStats();
      }, 60000); // Every minute
    }
  }

  /**
   * Setup Mongoose debug mode for query monitoring
   */
  setupMongooseDebug() {
    mongoose.set('debug', (collectionName, method, query, doc, options) => {
      const startTime = Date.now();
      const queryId = this.generateQueryId();
      
      // Store query start time
      this.queryStats.set(queryId, {
        collection: collectionName,
        method,
        query: this.sanitizeQuery(query),
        startTime,
        options
      });
      
      // Monitor query completion
      process.nextTick(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.recordQueryCompletion(queryId, duration);
      });
    });
  }

  /**
   * Enable MongoDB profiling
   */
  async enableDatabaseProfiling() {
    try {
      const db = mongoose.connection.db;
      
      // Set profiling level (2 = all operations)
      await db.admin().command({
        profile: 2,
        slowms: this.options.slowQueryThreshold
      });
      
      console.log('✅ Database profiling enabled');
    } catch (error) {
      console.warn('⚠️  Could not enable database profiling:', error.message);
    }
  }

  /**
   * Record query completion
   */
  recordQueryCompletion(queryId, duration) {
    const queryInfo = this.queryStats.get(queryId);
    if (!queryInfo) return;
    
    this.totalQueries++;
    this.totalQueryTime += duration;
    
    // Record slow query
    if (duration >= this.options.slowQueryThreshold) {
      const slowQuery = {
        ...queryInfo,
        duration,
        timestamp: new Date(),
        id: queryId
      };
      
      this.slowQueries.push(slowQuery);
      
      // Limit slow queries array size
      if (this.slowQueries.length > this.options.maxSlowQueries) {
        this.slowQueries.shift();
      }
      
      if (this.options.logSlowQueries) {
        console.warn(`🐌 Slow query detected: ${queryInfo.collection}.${queryInfo.method} took ${duration}ms`);
        console.warn(`   Query: ${JSON.stringify(queryInfo.query)}`);
      }
    }
    
    // Clean up
    this.queryStats.delete(queryId);
  }

  /**
   * Generate unique query ID
   */
  generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  sanitizeQuery(query) {
    const sanitized = JSON.parse(JSON.stringify(query));
    
    // Remove password fields
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
    
    // Remove other sensitive fields
    const sensitiveFields = ['token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const avgQueryTime = this.totalQueries > 0 ? this.totalQueryTime / this.totalQueries : 0;
    
    return {
      uptime,
      totalQueries: this.totalQueries,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: Math.round(avgQueryTime * 100) / 100,
      slowQueries: this.slowQueries.length,
      queriesPerSecond: Math.round((this.totalQueries / (uptime / 1000)) * 100) / 100,
      recentSlowQueries: this.slowQueries.slice(-10)
    };
  }

  /**
   * Get detailed slow query analysis
   */
  getSlowQueryAnalysis() {
    const analysis = {
      totalSlowQueries: this.slowQueries.length,
      byCollection: {},
      byMethod: {},
      averageSlowQueryTime: 0,
      slowestQuery: null
    };
    
    if (this.slowQueries.length === 0) {
      return analysis;
    }
    
    let totalSlowTime = 0;
    let slowestDuration = 0;
    
    this.slowQueries.forEach(query => {
      // By collection
      if (!analysis.byCollection[query.collection]) {
        analysis.byCollection[query.collection] = {
          count: 0,
          totalTime: 0,
          avgTime: 0
        };
      }
      analysis.byCollection[query.collection].count++;
      analysis.byCollection[query.collection].totalTime += query.duration;
      
      // By method
      if (!analysis.byMethod[query.method]) {
        analysis.byMethod[query.method] = {
          count: 0,
          totalTime: 0,
          avgTime: 0
        };
      }
      analysis.byMethod[query.method].count++;
      analysis.byMethod[query.method].totalTime += query.duration;
      
      totalSlowTime += query.duration;
      
      // Track slowest query
      if (query.duration > slowestDuration) {
        slowestDuration = query.duration;
        analysis.slowestQuery = query;
      }
    });
    
    // Calculate averages
    analysis.averageSlowQueryTime = Math.round((totalSlowTime / this.slowQueries.length) * 100) / 100;
    
    Object.values(analysis.byCollection).forEach(stats => {
      stats.avgTime = Math.round((stats.totalTime / stats.count) * 100) / 100;
    });
    
    Object.values(analysis.byMethod).forEach(stats => {
      stats.avgTime = Math.round((stats.totalTime / stats.count) * 100) / 100;
    });
    
    return analysis;
  }

  /**
   * Log performance statistics
   */
  logPerformanceStats() {
    const stats = this.getStats();
    
    if (stats.totalQueries === 0) return;
    
    console.log('\n📊 Query Performance Stats:');
    console.log(`   Total Queries: ${stats.totalQueries}`);
    console.log(`   Average Query Time: ${stats.averageQueryTime}ms`);
    console.log(`   Queries/Second: ${stats.queriesPerSecond}`);
    console.log(`   Slow Queries: ${stats.slowQueries}`);
    
    if (stats.slowQueries > 0) {
      console.log('\n🐌 Recent Slow Queries:');
      stats.recentSlowQueries.forEach((query, index) => {
        console.log(`   ${index + 1}. ${query.collection}.${query.method} - ${query.duration}ms`);
      });
    }
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(filepath) {
    try {
      const data = {
        timestamp: new Date(),
        stats: this.getStats(),
        slowQueryAnalysis: this.getSlowQueryAnalysis(),
        slowQueries: this.slowQueries,
        options: this.options
      };
      
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      console.log(`📄 Performance data exported to: ${filepath}`);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to export performance data:', error);
      throw error;
    }
  }

  /**
   * Reset statistics
   */
  reset() {
    this.queryStats.clear();
    this.slowQueries = [];
    this.totalQueries = 0;
    this.totalQueryTime = 0;
    this.startTime = Date.now();
    
    console.log('🔄 Query monitor statistics reset');
  }

  /**
   * Express middleware for query monitoring endpoint
   */
  getMiddleware() {
    return {
      // Stats endpoint
      stats: (req, res) => {
        try {
          const stats = this.getStats();
          const analysis = this.getSlowQueryAnalysis();
          
          res.json({
            success: true,
            data: {
              stats,
              analysis,
              options: this.options
            }
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Failed to get query stats',
            error: error.message
          });
        }
      },
      
      // Export endpoint
      export: async (req, res) => {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `query-performance-${timestamp}.json`;
          const filepath = path.join(process.cwd(), 'reports', filename);
          
          // Ensure reports directory exists
          await fs.mkdir(path.dirname(filepath), { recursive: true });
          
          const data = await this.exportPerformanceData(filepath);
          
          res.json({
            success: true,
            message: 'Performance data exported successfully',
            data: {
              filename,
              filepath,
              stats: data.stats
            }
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Failed to export performance data',
            error: error.message
          });
        }
      },
      
      // Reset endpoint
      reset: (req, res) => {
        try {
          this.reset();
          
          res.json({
            success: true,
            message: 'Query monitor statistics reset successfully'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Failed to reset statistics',
            error: error.message
          });
        }
      }
    };
  }

  /**
   * Health check for query performance
   */
  getHealthCheck() {
    const stats = this.getStats();
    const health = {
      status: 'healthy',
      issues: []
    };
    
    // Check average query time
    if (stats.averageQueryTime > 200) {
      health.status = 'warning';
      health.issues.push(`High average query time: ${stats.averageQueryTime}ms`);
    }
    
    // Check slow query percentage
    const slowQueryPercentage = (stats.slowQueries / stats.totalQueries) * 100;
    if (slowQueryPercentage > 10) {
      health.status = 'critical';
      health.issues.push(`High slow query percentage: ${slowQueryPercentage.toFixed(2)}%`);
    }
    
    // Check queries per second
    if (stats.queriesPerSecond > 100) {
      health.status = 'warning';
      health.issues.push(`High query rate: ${stats.queriesPerSecond} queries/second`);
    }
    
    return {
      ...health,
      stats,
      timestamp: new Date()
    };
  }
}

// Singleton instance
let queryMonitorInstance = null;

/**
 * Get or create query monitor instance
 */
function getQueryMonitor(options = {}) {
  if (!queryMonitorInstance) {
    queryMonitorInstance = new QueryMonitor(options);
    queryMonitorInstance.initialize();
  }
  return queryMonitorInstance;
}

/**
 * Express middleware factory
 */
function createQueryMonitorMiddleware(options = {}) {
  const monitor = getQueryMonitor(options);
  return monitor.getMiddleware();
}

module.exports = {
  QueryMonitor,
  getQueryMonitor,
  createQueryMonitorMiddleware
};