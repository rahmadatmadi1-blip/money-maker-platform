const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication middleware with refresh token support
const auth = async (req, res, next) => {
  try {
    // Debug logging for payment requests
    if (req.path.includes('/local-payment/create')) {
      console.log('=== AUTH MIDDLEWARE DEBUG ===');
      console.log('Path:', req.path);
      console.log('Method:', req.method);
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('=============================');
    }
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.',
        code: 'NO_TOKEN'
      });
    }

    // Handle demo tokens
    if (token.startsWith('demo-admin-token') || token.startsWith('demo-user-token')) {
      // For demo tokens, create a mock user object with valid ObjectId
      const mockUser = {
        _id: token.startsWith('demo-admin-token') ? '507f1f77bcf86cd799439011' : '507f1f77bcf86cd799439012',
        name: token.startsWith('demo-admin-token') ? 'Super Admin' : 'Demo User',
        email: token.startsWith('demo-admin-token') ? 'admin@moneymaker.com' : 'demo@moneymaker.com',
        role: token.startsWith('demo-admin-token') ? 'admin' : 'user',
        isActive: true,
        isPremium: token.startsWith('demo-admin-token') ? true : false
      };
      
      req.user = mockUser;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if it's an access token
      if (decoded.type && decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Tipe token tidak valid.',
          code: 'INVALID_TOKEN_TYPE'
        });
      }
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid. User tidak ditemukan.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Akun terkunci sementara karena terlalu banyak percobaan login yang gagal.',
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Check if account is active
      if (user.status && user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Akun tidak aktif.',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token akses telah kedaluwarsa.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid.',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Autentikasi gagal.',
      code: 'AUTH_FAILED'
    });
  }
};

// Refresh token middleware
const refreshAuth = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token tidak ditemukan.',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      
      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Tipe refresh token tidak valid.',
          code: 'INVALID_REFRESH_TOKEN_TYPE'
        });
      }
      
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if refresh token exists in user's token list
      if (user.isRefreshTokenValid && !user.isRefreshTokenValid(refreshToken)) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token tidak valid.',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      // Check if account is active
      if (user.status && user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Akun tidak aktif.',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      req.user = user;
      req.refreshToken = refreshToken;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token telah kedaluwarsa.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token tidak valid.',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Refresh auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Validasi refresh token gagal.',
      code: 'REFRESH_AUTH_FAILED'
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
  refreshAuth,
  authRateLimit,
  adminAuth,
  premiumAuth,
  ownerAuth
};