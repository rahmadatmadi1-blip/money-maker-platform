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

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
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

module.exports = mongoose.model('User', userSchema);