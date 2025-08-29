const mongoose = require('mongoose');

// User Analytics Model
const userAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Date tracking
  date: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  
  // Revenue metrics
  revenue: {
    total: { type: Number, default: 0 },
    affiliate: { type: Number, default: 0 },
    ecommerce: { type: Number, default: 0 },
    marketplace: { type: Number, default: 0 },
    content: { type: Number, default: 0 },
    subscription: { type: Number, default: 0 }
  },
  
  // Transaction metrics
  transactions: {
    count: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    avgValue: { type: Number, default: 0 }
  },
  
  // Affiliate metrics
  affiliate: {
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    commissions: { type: Number, default: 0 },
    activeLinks: { type: Number, default: 0 }
  },
  
  // E-commerce metrics
  ecommerce: {
    orders: { type: Number, default: 0 },
    products: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 }
  },
  
  // Marketplace metrics
  marketplace: {
    services: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    completedServices: { type: Number, default: 0 },
    avgServiceValue: { type: Number, default: 0 }
  },
  
  // Content metrics
  content: {
    published: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  
  // User engagement
  engagement: {
    logins: { type: Number, default: 0 },
    sessionDuration: { type: Number, default: 0 }, // in minutes
    pageViews: { type: Number, default: 0 },
    actions: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Platform Analytics Model
const platformAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  
  // User metrics
  users: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    premium: { type: Number, default: 0 },
    churnRate: { type: Number, default: 0 }
  },
  
  // Revenue metrics
  revenue: {
    total: { type: Number, default: 0 },
    recurring: { type: Number, default: 0 },
    oneTime: { type: Number, default: 0 },
    mrr: { type: Number, default: 0 }, // Monthly Recurring Revenue
    arr: { type: Number, default: 0 }  // Annual Recurring Revenue
  },
  
  // Transaction metrics
  transactions: {
    count: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  },
  
  // Platform metrics by category
  categories: {
    affiliate: {
      revenue: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 },
      activePrograms: { type: Number, default: 0 },
      totalClicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 }
    },
    ecommerce: {
      revenue: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 }
    },
    marketplace: {
      revenue: { type: Number, default: 0 },
      services: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 },
      providers: { type: Number, default: 0 }
    },
    content: {
      revenue: { type: Number, default: 0 },
      published: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      creators: { type: Number, default: 0 }
    }
  },
  
  // Geographic data
  geography: [{
    country: String,
    users: Number,
    revenue: Number,
    transactions: Number
  }],
  
  // Device/Platform data
  devices: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  
  // Traffic sources
  traffic: {
    organic: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
    referral: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Real-time Analytics Model
const realtimeAnalyticsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours TTL
  },
  
  // Current active users
  activeUsers: {
    total: { type: Number, default: 0 },
    anonymous: { type: Number, default: 0 },
    authenticated: { type: Number, default: 0 }
  },
  
  // Real-time events
  events: {
    pageViews: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    signups: { type: Number, default: 0 },
    logins: { type: Number, default: 0 }
  },
  
  // Current revenue (last hour)
  revenue: {
    total: { type: Number, default: 0 },
    affiliate: { type: Number, default: 0 },
    ecommerce: { type: Number, default: 0 },
    marketplace: { type: Number, default: 0 },
    content: { type: Number, default: 0 }
  },
  
  // Top pages
  topPages: [{
    path: String,
    views: Number,
    uniqueViews: Number
  }],
  
  // Top referrers
  topReferrers: [{
    domain: String,
    visits: Number
  }]
}, {
  timestamps: true
});

// Event Tracking Model
const eventTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: String,
  
  // Event details
  event: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  label: String,
  value: Number,
  
  // Context
  page: {
    url: String,
    title: String,
    referrer: String
  },
  
  // User context
  user: {
    isAuthenticated: Boolean,
    role: String,
    isPremium: Boolean
  },
  
  // Technical context
  technical: {
    userAgent: String,
    ip: String,
    country: String,
    city: String,
    device: String,
    browser: String,
    os: String
  },
  
  // Custom properties
  properties: mongoose.Schema.Types.Mixed,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
userAnalyticsSchema.index({ userId: 1, date: -1, period: 1 });
userAnalyticsSchema.index({ date: -1, period: 1 });
userAnalyticsSchema.index({ userId: 1, period: 1, createdAt: -1 });

platformAnalyticsSchema.index({ date: -1, period: 1 });
platformAnalyticsSchema.index({ period: 1, createdAt: -1 });

realtimeAnalyticsSchema.index({ timestamp: -1 });

eventTrackingSchema.index({ userId: 1, timestamp: -1 });
eventTrackingSchema.index({ event: 1, category: 1, timestamp: -1 });
eventTrackingSchema.index({ sessionId: 1, timestamp: -1 });
eventTrackingSchema.index({ timestamp: -1 });
eventTrackingSchema.index({ 'user.isAuthenticated': 1, timestamp: -1 });

const UserAnalytics = mongoose.model('UserAnalytics', userAnalyticsSchema);
const PlatformAnalytics = mongoose.model('PlatformAnalytics', platformAnalyticsSchema);
const RealtimeAnalytics = mongoose.model('RealtimeAnalytics', realtimeAnalyticsSchema);
const EventTracking = mongoose.model('EventTracking', eventTrackingSchema);

module.exports = {
  UserAnalytics,
  PlatformAnalytics,
  RealtimeAnalytics,
  EventTracking
};