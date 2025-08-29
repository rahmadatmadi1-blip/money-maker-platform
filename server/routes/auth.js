const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, refreshAuth, authRateLimit } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login, coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for registration
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration requests per hour
  message: {
    success: false,
    message: 'Terlalu banyak percobaan registrasi, coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', registerRateLimit, async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password harus diisi'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User dengan email ini sudah terdaftar'
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    // Handle referral code
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
        // Add referral bonus to referrer
        referrer.referralCount += 1;
        referrer.pendingBalance += 10; // $10 referral bonus
        await referrer.save();
      }
    }

    await user.save();

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Get device info
    const deviceInfo = {
      userAgent: req.get('User-Agent') || '',
      ip: req.ip || req.connection.remoteAddress || '',
      deviceId: req.body.deviceId || crypto.randomBytes(16).toString('hex')
    };

    // Add refresh token to user
    await user.addRefreshToken(refreshToken, deviceInfo);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Selamat datang di Money Maker Platform',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isPremium: user.isPremiumActive,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email atau password tidak valid'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Akun terkunci sementara karena terlalu banyak percobaan login yang gagal',
        lockUntil: user.lockUntil
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(400).json({
        success: false,
        message: 'Email atau password tidak valid'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts && user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Get device info
    const deviceInfo = {
      userAgent: req.get('User-Agent') || '',
      ip: req.ip || req.connection.remoteAddress || '',
      deviceId: req.body.deviceId || crypto.randomBytes(16).toString('hex')
    };

    // Add refresh token to user
    await user.addRefreshToken(refreshToken, deviceInfo);

    // Update last login
    await user.updateLastLogin();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login berhasil! Selamat datang kembali',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isPremium: user.isPremiumActive,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public (with refresh token)
router.post('/refresh', refreshAuth, async (req, res) => {
  try {
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    // Generate new tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Get device info
    const deviceInfo = {
      userAgent: req.get('User-Agent') || '',
      ip: req.ip || req.connection.remoteAddress || '',
      deviceId: req.body.deviceId || crypto.randomBytes(16).toString('hex')
    };

    // Remove old refresh token and add new one
    await user.removeRefreshToken(oldRefreshToken);
    await user.addRefreshToken(refreshToken, deviceInfo);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token berhasil diperbarui',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isPremium: user.isPremiumActive,
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (remove refresh token)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (refreshToken) {
      await req.user.removeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout berhasil'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat logout'
    });
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', auth, async (req, res) => {
  try {
    await req.user.removeAllRefreshTokens();

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout dari semua perangkat berhasil'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat logout dari semua perangkat'
    });
  }
});

// @route   GET /api/auth/sessions
// @desc    Get active sessions
// @access  Private
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = req.user.getActiveSessions();

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil sesi aktif'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email harus diisi'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'Jika email terdaftar, link reset password akan dikirim'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send email with reset token
    // For now, just return success (in production, implement email sending)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'Jika email terdaftar, link reset password akan dikirim'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token dan password baru harus diisi'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token reset password tidak valid atau sudah kedaluwarsa'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Remove all refresh tokens (force re-login)
    await user.removeAllRefreshTokens();
    
    await user.save();

    res.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isPremium: user.isPremiumActive,
        twoFactorEnabled: user.twoFactorEnabled || false,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

module.exports = router;