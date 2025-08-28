const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get user dashboard analytics
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const user = await User.findById(userId);
    
    // Get referrals data
    const referrals = await User.find({ 
      referredBy: userId,
      createdAt: { $gte: startDate }
    });

    // Calculate earnings trend (mock data for now)
    const earningsTrend = generateEarningsTrend(startDate, now, user.totalEarnings);
    
    // Revenue breakdown
    const revenueBreakdown = {
      affiliate: Math.round(user.totalEarnings * 0.4),
      ecommerce: Math.round(user.totalEarnings * 0.3),
      services: Math.round(user.totalEarnings * 0.2),
      content: Math.round(user.totalEarnings * 0.1)
    };

    // Top performing metrics
    const metrics = {
      totalRevenue: user.totalEarnings,
      availableBalance: user.availableBalance,
      pendingBalance: user.pendingBalance,
      newReferrals: referrals.length,
      conversionRate: referrals.length > 0 ? (referrals.filter(r => r.totalEarnings > 0).length / referrals.length * 100).toFixed(2) : 0,
      avgOrderValue: user.totalEarnings > 0 ? Math.round(user.totalEarnings / Math.max(referrals.length, 1)) : 0
    };

    // Goals and targets
    const monthlyTarget = 10000000; // Rp 10 juta target
    const progress = (user.totalEarnings / monthlyTarget * 100).toFixed(2);

    res.json({
      success: true,
      analytics: {
        period,
        metrics,
        earningsTrend,
        revenueBreakdown,
        referralsData: {
          total: referrals.length,
          active: referrals.filter(r => r.isActive).length,
          earning: referrals.filter(r => r.totalEarnings > 0).length
        },
        goals: {
          monthlyTarget,
          currentProgress: progress,
          remaining: Math.max(0, monthlyTarget - user.totalEarnings)
        }
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil analytics dashboard'
    });
  }
});

// @route   GET /api/analytics/revenue
// @desc    Get detailed revenue analytics
// @access  Private
router.get('/revenue', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d', breakdown = 'daily' } = req.query;

    const user = await User.findById(userId);
    
    // Generate revenue data based on breakdown
    const revenueData = generateRevenueData(breakdown, period, user.totalEarnings);
    
    // Revenue sources
    const sources = {
      affiliate: {
        amount: Math.round(user.totalEarnings * 0.4),
        percentage: 40,
        trend: '+12%'
      },
      ecommerce: {
        amount: Math.round(user.totalEarnings * 0.3),
        percentage: 30,
        trend: '+8%'
      },
      services: {
        amount: Math.round(user.totalEarnings * 0.2),
        percentage: 20,
        trend: '+15%'
      },
      content: {
        amount: Math.round(user.totalEarnings * 0.1),
        percentage: 10,
        trend: '+5%'
      }
    };

    // Top earning activities
    const topActivities = [
      { name: 'Amazon Affiliate', earnings: Math.round(user.totalEarnings * 0.25), type: 'affiliate' },
      { name: 'Digital Products', earnings: Math.round(user.totalEarnings * 0.20), type: 'ecommerce' },
      { name: 'Consulting Services', earnings: Math.round(user.totalEarnings * 0.15), type: 'services' },
      { name: 'Course Sales', earnings: Math.round(user.totalEarnings * 0.10), type: 'content' },
      { name: 'Referral Bonus', earnings: Math.round(user.totalEarnings * 0.08), type: 'affiliate' }
    ];

    res.json({
      success: true,
      revenue: {
        total: user.totalEarnings,
        available: user.availableBalance,
        pending: user.pendingBalance,
        data: revenueData,
        sources,
        topActivities,
        period,
        breakdown
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil analytics revenue'
    });
  }
});

// @route   GET /api/analytics/performance
// @desc    Get performance metrics
// @access  Private
router.get('/performance', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const referrals = await User.find({ referredBy: userId });

    // Performance metrics
    const performance = {
      clickThroughRate: '3.2%', // Mock data
      conversionRate: referrals.length > 0 ? (referrals.filter(r => r.totalEarnings > 0).length / referrals.length * 100).toFixed(2) + '%' : '0%',
      avgSessionDuration: '4m 32s', // Mock data
      bounceRate: '45%', // Mock data
      returningVisitors: '68%', // Mock data
      
      // Traffic sources
      trafficSources: {
        organic: 45,
        social: 25,
        direct: 20,
        referral: 10
      },
      
      // Device breakdown
      devices: {
        mobile: 60,
        desktop: 35,
        tablet: 5
      },
      
      // Geographic data
      topCountries: [
        { country: 'Indonesia', percentage: 75, earnings: Math.round(user.totalEarnings * 0.75) },
        { country: 'Malaysia', percentage: 15, earnings: Math.round(user.totalEarnings * 0.15) },
        { country: 'Singapore', percentage: 10, earnings: Math.round(user.totalEarnings * 0.10) }
      ]
    };

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil performance analytics'
    });
  }
});

// @route   GET /api/analytics/admin
// @desc    Get admin analytics (Admin only)
// @access  Private/Admin
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get platform statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    
    // Revenue statistics
    const allUsers = await User.find({});
    const totalRevenue = allUsers.reduce((sum, user) => sum + user.totalEarnings, 0);
    const totalAvailable = allUsers.reduce((sum, user) => sum + user.availableBalance, 0);
    const totalPending = allUsers.reduce((sum, user) => sum + user.pendingBalance, 0);

    // User growth trend
    const userGrowth = generateUserGrowthTrend(startDate, now, newUsers);
    
    // Revenue trend
    const revenueTrend = generateEarningsTrend(startDate, now, totalRevenue);

    const adminAnalytics = {
      overview: {
        totalUsers,
        newUsers,
        activeUsers,
        premiumUsers,
        totalRevenue,
        totalAvailable,
        totalPending
      },
      trends: {
        userGrowth,
        revenueTrend
      },
      userBreakdown: {
        byRole: {
          user: await User.countDocuments({ role: 'user' }),
          premium: await User.countDocuments({ role: 'premium' }),
          affiliate: await User.countDocuments({ role: 'affiliate' }),
          vendor: await User.countDocuments({ role: 'vendor' }),
          admin: await User.countDocuments({ role: 'admin' })
        },
        byStatus: {
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          verified: await User.countDocuments({ isVerified: true }),
          unverified: await User.countDocuments({ isVerified: false })
        }
      },
      topEarners: allUsers
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10)
        .map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          earnings: user.totalEarnings,
          role: user.role
        }))
    };

    res.json({
      success: true,
      analytics: adminAnalytics
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil admin analytics'
    });
  }
});

// Helper functions
function generateEarningsTrend(startDate, endDate, totalEarnings) {
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const trend = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const earnings = Math.round((totalEarnings / days) * (0.5 + Math.random()));
    
    trend.push({
      date: date.toISOString().split('T')[0],
      earnings
    });
  }
  
  return trend;
}

function generateRevenueData(breakdown, period, totalEarnings) {
  const data = [];
  let intervals;
  
  switch (breakdown) {
    case 'hourly':
      intervals = 24;
      break;
    case 'daily':
      intervals = period === '7d' ? 7 : 30;
      break;
    case 'weekly':
      intervals = 12;
      break;
    case 'monthly':
      intervals = 12;
      break;
    default:
      intervals = 30;
  }
  
  for (let i = 0; i < intervals; i++) {
    const value = Math.round((totalEarnings / intervals) * (0.5 + Math.random()));
    data.push({
      period: i + 1,
      value
    });
  }
  
  return data;
}

function generateUserGrowthTrend(startDate, endDate, totalNew) {
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const trend = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const newUsers = Math.round((totalNew / days) * (0.5 + Math.random()));
    
    trend.push({
      date: date.toISOString().split('T')[0],
      newUsers
    });
  }
  
  return trend;
}

module.exports = router;