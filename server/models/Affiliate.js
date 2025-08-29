const mongoose = require('mongoose');

// Affiliate Program Model
const affiliateProgramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Commission structure
  commission: {
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'tiered'],
      required: true
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    tiers: [{
      minSales: Number,
      rate: Number
    }]
  },
  
  // Program details
  category: {
    type: String,
    required: true,
    enum: [
      'technology', 'education', 'health', 'finance', 'fashion',
      'travel', 'food', 'entertainment', 'business', 'lifestyle', 'other'
    ]
  },
  tags: [String],
  
  // Requirements
  requirements: {
    minFollowers: { type: Number, default: 0 },
    minTraffic: { type: Number, default: 0 },
    allowedCountries: [String],
    restrictedCountries: [String],
    websiteRequired: { type: Boolean, default: false }
  },
  
  // Terms
  cookieDuration: {
    type: Number,
    default: 30 // days
  },
  paymentTerms: {
    type: String,
    enum: ['net15', 'net30', 'net60'],
    default: 'net30'
  },
  minimumPayout: {
    type: Number,
    default: 50
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'inactive', 'pending_approval'],
    default: 'pending_approval'
  },
  
  // Statistics
  stats: {
    totalAffiliates: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 }
  },
  
  // Media
  logo: String,
  banners: [{
    size: String, // '728x90', '300x250', etc.
    url: String,
    alt: String
  }],
  
  // Contact
  contactEmail: String,
  supportUrl: String
}, {
  timestamps: true
});

// Affiliate Link Model
const affiliateLinkSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AffiliateProgram',
    required: true
  },
  
  // Link details
  originalUrl: {
    type: String,
    required: true
  },
  shortCode: {
    type: String,
    unique: true,
    required: true
  },
  customAlias: String,
  
  // Tracking
  trackingId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Statistics
  stats: {
    clicks: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    lastClickAt: Date
  },
  
  // Settings
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: Date,
  
  // Metadata
  metadata: {
    source: String,
    campaign: String,
    medium: String,
    content: String
  }
}, {
  timestamps: true
});

// Commission Model
const commissionSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AffiliateProgram',
    required: true
  },
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AffiliateLink',
    required: true
  },
  
  // Transaction details
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'orderType'
  },
  orderType: {
    type: String,
    enum: ['Order', 'ServiceOrder', 'ContentPurchase']
  },
  
  // Commission details
  orderValue: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Dates
  transactionDate: {
    type: Date,
    required: true
  },
  approvedAt: Date,
  paidAt: Date,
  
  // Notes
  notes: String,
  rejectionReason: String,
  
  // Payment details
  paymentId: String,
  paymentMethod: String
}, {
  timestamps: true
});

// Click Tracking Model
const clickTrackingSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AffiliateLink',
    required: true
  },
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Visitor information
  visitorId: String, // Unique visitor identifier
  ipAddress: String,
  userAgent: String,
  
  // Location
  country: String,
  city: String,
  
  // Referrer
  referrer: String,
  source: String,
  
  // Device info
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet']
  },
  browser: String,
  os: String,
  
  // Conversion tracking
  converted: {
    type: Boolean,
    default: false
  },
  conversionDate: Date,
  conversionValue: Number
}, {
  timestamps: true
});

// Indexes
affiliateProgramSchema.index({ merchantId: 1, status: 1 });
affiliateProgramSchema.index({ category: 1, status: 1 });
affiliateProgramSchema.index({ 'stats.conversionRate': -1 });

affiliateLinkSchema.index({ affiliateId: 1, isActive: 1 });
affiliateLinkSchema.index({ programId: 1, isActive: 1 });
affiliateLinkSchema.index({ shortCode: 1 });
affiliateLinkSchema.index({ trackingId: 1 });

commissionSchema.index({ affiliateId: 1, status: 1, createdAt: -1 });
commissionSchema.index({ programId: 1, status: 1 });
commissionSchema.index({ status: 1, transactionDate: -1 });

clickTrackingSchema.index({ linkId: 1, createdAt: -1 });
clickTrackingSchema.index({ affiliateId: 1, createdAt: -1 });
clickTrackingSchema.index({ visitorId: 1, linkId: 1 });
clickTrackingSchema.index({ converted: 1, conversionDate: -1 });

const AffiliateProgram = mongoose.model('AffiliateProgram', affiliateProgramSchema);
const AffiliateLink = mongoose.model('AffiliateLink', affiliateLinkSchema);
const Commission = mongoose.model('Commission', commissionSchema);
const ClickTracking = mongoose.model('ClickTracking', clickTrackingSchema);

module.exports = {
  AffiliateProgram,
  AffiliateLink,
  Commission,
  ClickTracking
};