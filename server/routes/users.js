const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .select('-password')
      .populate('referredBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('referredBy', 'name email')
      .populate('referralCount');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      isActive,
      isPremium,
      premiumExpiry
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof isPremium === 'boolean') user.isPremium = isPremium;
    if (premiumExpiry) user.premiumExpiry = premiumExpiry;

    await user.save();

    res.json({
      success: true,
      message: 'User berhasil diperbarui',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus user admin'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus user'
    });
  }
});

// @route   GET /api/users/referrals/my
// @desc    Get user's referrals
// @access  Private
router.get('/referrals/my', auth, async (req, res) => {
  try {
    const referrals = await User.find({ referredBy: req.user._id })
      .select('name email createdAt totalEarnings')
      .sort({ createdAt: -1 });

    const totalReferrals = referrals.length;
    const totalReferralEarnings = referrals.reduce((sum, ref) => sum + ref.totalEarnings, 0);

    res.json({
      success: true,
      referrals,
      stats: {
        totalReferrals,
        totalReferralEarnings,
        referralCode: req.user.referralCode
      }
    });

  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data referral'
    });
  }
});

// @route   POST /api/users/upgrade-premium
// @desc    Upgrade to premium membership
// @access  Private
router.post('/upgrade-premium', auth, async (req, res) => {
  try {
    const { duration } = req.body; // 'monthly' or 'yearly'
    
    const user = await User.findById(req.user._id);
    
    // Calculate premium expiry
    const now = new Date();
    let premiumExpiry;
    
    if (duration === 'monthly') {
      premiumExpiry = new Date(now.setMonth(now.getMonth() + 1));
    } else if (duration === 'yearly') {
      premiumExpiry = new Date(now.setFullYear(now.getFullYear() + 1));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Durasi premium tidak valid'
      });
    }

    user.isPremium = true;
    user.premiumExpiry = premiumExpiry;
    user.role = 'premium';
    
    await user.save();

    res.json({
      success: true,
      message: 'Berhasil upgrade ke premium membership',
      user
    });

  } catch (error) {
    console.error('Upgrade premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat upgrade premium'
    });
  }
});

// @route   GET /api/users/stats/dashboard
// @desc    Get user dashboard stats
// @access  Private
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('referralCount');

    const referrals = await User.find({ referredBy: req.user._id });
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(ref => ref.isActive).length;

    const stats = {
      totalEarnings: user.totalEarnings,
      availableBalance: user.availableBalance,
      pendingBalance: user.pendingBalance,
      totalReferrals,
      activeReferrals,
      isPremium: user.isPremiumActive,
      premiumExpiry: user.premiumExpiry,
      memberSince: user.createdAt,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik dashboard'
    });
  }
});

// @route   POST /api/users/payment-method
// @desc    Add payment method
// @access  Private
router.post('/payment-method', auth, async (req, res) => {
  try {
    const { type, details, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    // If this is set as default, remove default from others
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    user.paymentMethods.push({
      type,
      details,
      isDefault: isDefault || user.paymentMethods.length === 0
    });

    await user.save();

    res.json({
      success: true,
      message: 'Metode pembayaran berhasil ditambahkan',
      paymentMethods: user.paymentMethods
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan metode pembayaran'
    });
  }
});

module.exports = router;