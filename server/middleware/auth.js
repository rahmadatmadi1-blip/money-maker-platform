const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware untuk verifikasi JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.'
      });
    }

    // Handle demo tokens
    if (token.startsWith('demo-admin-token') || token.startsWith('demo-user-token')) {
      // For demo tokens, create a mock user object
      const mockUser = {
        _id: token.startsWith('demo-admin-token') ? 'demo-admin-id' : 'demo-user-id',
        name: token.startsWith('demo-admin-token') ? 'Super Admin' : 'Demo User',
        email: token.startsWith('demo-admin-token') ? 'admin@moneymaker.com' : 'demo@moneymaker.com',
        role: token.startsWith('demo-admin-token') ? 'admin' : 'user',
        isActive: true,
        isPremium: token.startsWith('demo-admin-token') ? true : false
      };
      
      req.user = mockUser;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid. User tidak ditemukan.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token tidak valid.'
    });
  }
};

// Middleware untuk admin only
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya admin yang diizinkan.'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(403).json({
      success: false,
      message: 'Akses admin diperlukan.'
    });
  }
};

// Middleware untuk premium users
const premiumAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!req.user.isPremium && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Fitur ini hanya untuk member premium.'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Premium auth error:', error);
    res.status(403).json({
      success: false,
      message: 'Akses premium diperlukan.'
    });
  }
};

// Middleware untuk verifikasi ownership
const ownerAuth = (Model) => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params.id);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource tidak ditemukan.'
        });
      }

      if (resource.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Anda bukan pemilik resource ini.'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Owner auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifikasi kepemilikan.'
      });
    }
  };
};

module.exports = {
  auth,
  adminAuth,
  premiumAuth,
  ownerAuth
};