const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama harus diisi'],
    trim: true,
    maxlength: [50, 'Nama tidak boleh lebih dari 50 karakter']
  },
  email: {
    type: String,
    required: [true, 'Email harus diisi'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Format email tidak valid']
  },
  password: {
    type: String,
    required: [true, 'Password harus diisi'],
    minlength: [6, 'Password minimal 6 karakter'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'premium', 'affiliate', 'vendor', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150x150?text=User'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Indonesia' }
  },
  
  // Premium membership
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiry: {
    type: Date
  },
  
  // Affiliate info
  affiliateId: {
    type: String,
    unique: true,
    sparse: true
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Revenue tracking
  totalEarnings: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  
  // Payment info
  paymentMethods: [{
    type: {
      type: String,
      enum: ['bank', 'paypal', 'crypto', 'ewallet']
    },
    details: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false }
  }],
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    currency: { type: String, default: 'IDR' },
    language: { type: String, default: 'id' },
    timezone: { type: String, default: 'Asia/Jakarta' }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // JWT Refresh Token
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      deviceId: String
    }
  }],
  
  // Security settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Social media links
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String,
    tiktok: String,
    website: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ 'refreshTokens.token': 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ verificationToken: 1 });

// Generate referral code before saving
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate JWT access token (short-lived)
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

// Generate JWT refresh token (long-lived)
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

// Legacy method for backward compatibility
userSchema.methods.generateAuthToken = function() {
  return this.generateAccessToken();
};

// Compare password
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate referral code
userSchema.methods.generateReferralCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if premium is active
userSchema.virtual('isPremiumActive').get(function() {
  return this.isPremium && this.premiumExpiry && this.premiumExpiry > new Date();
});

// Get total referrals count
userSchema.virtual('referralCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'referredBy',
  count: true
});

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Add earnings
userSchema.methods.addEarnings = function(amount, type = 'available') {
  if (type === 'available') {
    this.availableBalance += amount;
  } else if (type === 'pending') {
    this.pendingBalance += amount;
  }
  this.totalEarnings += amount;
  return this.save();
};

// Convert pending to available
userSchema.methods.confirmEarnings = function(amount) {
  if (this.pendingBalance >= amount) {
    this.pendingBalance -= amount;
    this.availableBalance += amount;
    return this.save();
  }
  throw new Error('Insufficient pending balance');
};

// Add refresh token to user
userSchema.methods.addRefreshToken = async function(refreshToken, deviceInfo = {}) {
  // Remove old tokens (keep only last 5 devices)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }
  
  this.refreshTokens.push({
    token: refreshToken,
    deviceInfo: {
      userAgent: deviceInfo.userAgent || '',
      ip: deviceInfo.ip || '',
      deviceId: deviceInfo.deviceId || ''
    }
  });
  
  return this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = async function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(tokenObj => tokenObj.token !== refreshToken);
  return this.save();
};

// Remove all refresh tokens (logout from all devices)
userSchema.methods.removeAllRefreshTokens = async function() {
  this.refreshTokens = [];
  return this.save();
};

// Check if refresh token is valid
userSchema.methods.isRefreshTokenValid = function(refreshToken) {
  return this.refreshTokens.some(tokenObj => tokenObj.token === refreshToken);
};

// Account lockout methods
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Generate secure password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Verify password reset token
userSchema.methods.verifyPasswordResetToken = function(token) {
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  return this.resetPasswordToken === hashedToken && this.resetPasswordExpire > Date.now();
};

// Clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = async function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(tokenObj => {
    const tokenAge = (now - tokenObj.createdAt) / 1000; // in seconds
    return tokenAge < 604800; // 7 days
  });
  
  if (this.isModified('refreshTokens')) {
    return this.save();
  }
};

// Get active sessions info
userSchema.methods.getActiveSessions = function() {
  return this.refreshTokens.map(tokenObj => ({
    deviceInfo: tokenObj.deviceInfo,
    createdAt: tokenObj.createdAt,
    isExpired: (new Date() - tokenObj.createAt) / 1000 > 604800
  }));
};

module.exports = mongoose.model('User', userSchema);