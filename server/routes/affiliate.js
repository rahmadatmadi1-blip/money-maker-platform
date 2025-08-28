const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Affiliate Link Model (inline for simplicity)
const mongoose = require('mongoose');

const affiliateLinkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  shortCode: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['amazon', 'shopee', 'tokopedia', 'lazada', 'custom'],
    default: 'custom'
  },
  commission: {
    rate: { type: Number, default: 0 }, // percentage
    amount: { type: Number, default: 0 } // fixed amount
  },
  clicks: {
    type: Number,
    default: 0
  },
  conversions: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: Date,
  tags: [String],
  clickHistory: [{
    ip: String,
    userAgent: String,
    referrer: String,
    country: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const AffiliateLink = mongoose.model('AffiliateLink', affiliateLinkSchema);

// @route   POST /api/affiliate/links
// @desc    Create new affiliate link
// @access  Private
router.post('/links', auth, async (req, res) => {
  try {
    const {
      originalUrl,
      title,
      description,
      category,
      commission,
      expiryDate,
      tags
    } = req.body;

    // Generate unique short code
    let shortCode;
    let isUnique = false;
    
    while (!isUnique) {
      shortCode = crypto.randomBytes(4).toString('hex');
      const existing = await AffiliateLink.findOne({ shortCode });
      if (!existing) isUnique = true;
    }

    const affiliateLink = new AffiliateLink({
      userId: req.user._id,
      originalUrl,
      shortCode,
      title,
      description,
      category,
      commission,
      expiryDate,
      tags
    });

    await affiliateLink.save();

    res.status(201).json({
      success: true,
      message: 'Affiliate link berhasil dibuat',
      link: affiliateLink,
      shortUrl: `${process.env.CLIENT_URL}/go/${shortCode}`
    });

  } catch (error) {
    console.error('Create affiliate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat affiliate link'
    });
  }
});

// @route   GET /api/affiliate/links
// @desc    Get user's affiliate links
// @access  Private
router.get('/links', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category || '';
    const search = req.query.search || '';

    // Build query
    let query = { userId: req.user._id };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const links = await AffiliateLink.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AffiliateLink.countDocuments(query);

    // Add short URLs to response
    const linksWithUrls = links.map(link => ({
      ...link.toObject(),
      shortUrl: `${process.env.CLIENT_URL}/go/${link.shortCode}`,
      conversionRate: link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(2) : 0
    }));

    res.json({
      success: true,
      links: linksWithUrls,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get affiliate links error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil affiliate links'
    });
  }
});

// @route   GET /api/affiliate/links/:id
// @desc    Get single affiliate link
// @access  Private
router.get('/links/:id', auth, async (req, res) => {
  try {
    const link = await AffiliateLink.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate link tidak ditemukan'
      });
    }

    const linkWithUrl = {
      ...link.toObject(),
      shortUrl: `${process.env.CLIENT_URL}/go/${link.shortCode}`,
      conversionRate: link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      link: linkWithUrl
    });

  } catch (error) {
    console.error('Get affiliate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil affiliate link'
    });
  }
});

// @route   PUT /api/affiliate/links/:id
// @desc    Update affiliate link
// @access  Private
router.put('/links/:id', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      commission,
      expiryDate,
      tags,
      isActive
    } = req.body;

    const link = await AffiliateLink.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate link tidak ditemukan'
      });
    }

    // Update fields
    if (title) link.title = title;
    if (description) link.description = description;
    if (category) link.category = category;
    if (commission) link.commission = commission;
    if (expiryDate) link.expiryDate = expiryDate;
    if (tags) link.tags = tags;
    if (typeof isActive === 'boolean') link.isActive = isActive;

    await link.save();

    res.json({
      success: true,
      message: 'Affiliate link berhasil diperbarui',
      link
    });

  } catch (error) {
    console.error('Update affiliate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui affiliate link'
    });
  }
});

// @route   DELETE /api/affiliate/links/:id
// @desc    Delete affiliate link
// @access  Private
router.delete('/links/:id', auth, async (req, res) => {
  try {
    const link = await AffiliateLink.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate link tidak ditemukan'
      });
    }

    await AffiliateLink.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Affiliate link berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete affiliate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus affiliate link'
    });
  }
});

// @route   GET /api/affiliate/go/:shortCode
// @desc    Redirect to original URL and track click
// @access  Public
router.get('/go/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const link = await AffiliateLink.findOne({ shortCode, isActive: true });
    
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link tidak ditemukan atau sudah tidak aktif'
      });
    }

    // Check if link is expired
    if (link.expiryDate && new Date() > link.expiryDate) {
      return res.status(410).json({
        success: false,
        message: 'Link sudah expired'
      });
    }

    // Track click
    const clickData = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      country: 'ID', // You can use IP geolocation service
      timestamp: new Date()
    };

    link.clicks += 1;
    link.clickHistory.push(clickData);
    await link.save();

    // Redirect to original URL
    res.redirect(link.originalUrl);

  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat redirect'
    });
  }
});

// @route   POST /api/affiliate/conversion/:shortCode
// @desc    Track conversion for affiliate link
// @access  Public
router.post('/conversion/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { amount, orderId } = req.body;
    
    const link = await AffiliateLink.findOne({ shortCode });
    
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate link tidak ditemukan'
      });
    }

    // Calculate commission
    let commission = 0;
    if (link.commission.rate > 0) {
      commission = (amount * link.commission.rate) / 100;
    } else if (link.commission.amount > 0) {
      commission = link.commission.amount;
    }

    // Update link stats
    link.conversions += 1;
    link.earnings += commission;
    await link.save();

    // Add earnings to user
    const user = await User.findById(link.userId);
    await user.addEarnings(commission, 'pending');

    res.json({
      success: true,
      message: 'Konversi berhasil dicatat',
      commission,
      orderId
    });

  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencatat konversi'
    });
  }
});

// @route   GET /api/affiliate/stats
// @desc    Get affiliate statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
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

    const links = await AffiliateLink.find({
      userId: req.user._id,
      createdAt: { $gte: startDate }
    });

    const stats = {
      totalLinks: links.length,
      activeLinks: links.filter(link => link.isActive).length,
      totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
      totalConversions: links.reduce((sum, link) => sum + link.conversions, 0),
      totalEarnings: links.reduce((sum, link) => sum + link.earnings, 0),
      avgConversionRate: 0,
      topPerformingLinks: links
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5)
        .map(link => ({
          id: link._id,
          title: link.title,
          clicks: link.clicks,
          conversions: link.conversions,
          earnings: link.earnings,
          conversionRate: link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(2) : 0
        }))
    };

    // Calculate average conversion rate
    const totalClicks = stats.totalClicks;
    const totalConversions = stats.totalConversions;
    stats.avgConversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      stats,
      period
    });

  } catch (error) {
    console.error('Get affiliate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik affiliate'
    });
  }
});

module.exports = router;