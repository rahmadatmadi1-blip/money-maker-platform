const express = require('express');
const router = express.Router();
const DatabaseConfig = require('../config/database');
const { DatabaseOptimizer } = require('../utils/databaseOptimization');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Initialize database components
const dbConfig = new DatabaseConfig();
const optimizer = new DatabaseOptimizer();

// Middleware to check admin access
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

// Get database statistics
router.get('/db/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await dbConfig.getStats();
    const healthStatus = dbConfig.getHealthStatus();
    
    res.json({
      success: true,
      data: {
        health: healthStatus,
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message
    });
  }
});

// Run database maintenance
router.post('/db/maintenance', auth, requireAdmin, async (req, res) => {
  try {
    console.log(`🔧 Database maintenance initiated by admin: ${req.user.email}`);
    
    const report = await dbConfig.runMaintenance();
    
    res.json({
      success: true,
      message: 'Database maintenance completed successfully',
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database maintenance failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database maintenance failed',
      error: error.message
    });
  }
});

// Create database indexes
router.post('/db/indexes', auth, requireAdmin, async (req, res) => {
  try {
    console.log(`📊 Index creation initiated by admin: ${req.user.email}`);
    
    await optimizer.createOptimizedIndexes();
    
    res.json({
      success: true,
      message: 'Database indexes created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create database indexes',
      error: error.message
    });
  }
});

// Get performance report
router.get('/db/performance', auth, requireAdmin, async (req, res) => {
  try {
    const report = await optimizer.generatePerformanceReport();
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

// Clean old data
router.post('/db/cleanup', auth, requireAdmin, async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;
    
    console.log(`🧹 Data cleanup initiated by admin: ${req.user.email} (${daysOld} days old)`);
    
    const result = await optimizer.cleanOldData(daysOld);
    
    res.json({
      success: true,
      message: 'Data cleanup completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Data cleanup failed',
      error: error.message
    });
  }
});

// Test optimized queries
router.post('/db/test-queries', auth, requireAdmin, async (req, res) => {
  try {
    console.log(`🧪 Query testing initiated by admin: ${req.user.email}`);
    
    const results = await optimizer.testOptimizedQueries();
    
    res.json({
      success: true,
      message: 'Query testing completed',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Query testing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Query testing failed',
      error: error.message
    });
  }
});

// Get system information
router.get('/system/info', auth, requireAdmin, async (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      database: dbConfig.getHealthStatus(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system information',
      error: error.message
    });
  }
});

// Get user statistics
router.get('/users/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          premiumUsers: {
            $sum: {
              $cond: [{ $eq: ['$membershipStatus', 'premium'] }, 1, 0]
            }
          },
          totalEarnings: { $sum: '$earnings.total' },
          avgEarnings: { $avg: '$earnings.total' }
        }
      }
    ]);
    
    const recentUsers = await User.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).countDocuments();
    
    res.json({
      success: true,
      data: {
        ...stats[0],
        recentUsers,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    });
  }
});

module.exports = router;