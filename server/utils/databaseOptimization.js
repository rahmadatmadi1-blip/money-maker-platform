/**
 * Database Optimization Utilities
 * Handles indexing, query optimization, and performance monitoring for MongoDB
 */

const mongoose = require('mongoose');
const User = require('../models/User');

class DatabaseOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.indexStats = new Map();
  }

  /**
   * Create optimized indexes for User model
   */
  async createUserIndexes() {
    console.log('🔍 Creating optimized indexes for User model...');
    
    try {
      const User = mongoose.model('User');
      
      // Compound indexes for common query patterns
      await User.collection.createIndex(
        { email: 1, isActive: 1 },
        { name: 'email_active_idx', background: true }
      );
      
      await User.collection.createIndex(
        { referralCode: 1 },
        { name: 'referral_code_idx', unique: true, sparse: true, background: true }
      );
      
      await User.collection.createIndex(
        { affiliateId: 1 },
        { name: 'affiliate_id_idx', unique: true, sparse: true, background: true }
      );
      
      await User.collection.createIndex(
        { referredBy: 1, createdAt: -1 },
        { name: 'referred_by_date_idx', background: true }
      );
      
      await User.collection.createIndex(
        { role: 1, isActive: 1, isPremium: 1 },
        { name: 'role_status_premium_idx', background: true }
      );
      
      await User.collection.createIndex(
        { lastLogin: -1 },
        { name: 'last_login_idx', background: true }
      );
      
      await User.collection.createIndex(
        { 'preferences.currency': 1, 'preferences.language': 1 },
        { name: 'preferences_idx', background: true }
      );
      
      await User.collection.createIndex(
        { totalEarnings: -1 },
        { name: 'earnings_idx', background: true }
      );
      
      await User.collection.createIndex(
        { createdAt: -1 },
        { name: 'created_date_idx', background: true }
      );
      
      // Text index for search functionality
      await User.collection.createIndex(
        { name: 'text', email: 'text' },
        { name: 'user_search_idx', background: true }
      );
      
      // TTL index for verification tokens (expire after 24 hours)
      await User.collection.createIndex(
        { createdAt: 1 },
        { 
          name: 'verification_ttl_idx',
          expireAfterSeconds: 86400,
          partialFilterExpression: { verificationToken: { $exists: true } },
          background: true
        }
      );
      
      console.log('✅ User indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating User indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Payment model
   */
  async createPaymentIndexes() {
    console.log('🔍 Creating optimized indexes for Payment model...');
    
    try {
      const db = mongoose.connection.db;
      const paymentsCollection = db.collection('payments');
      
      // Compound indexes for payment queries
      await paymentsCollection.createIndex(
        { userId: 1, status: 1, createdAt: -1 },
        { name: 'user_status_date_idx', background: true }
      );
      
      await paymentsCollection.createIndex(
        { type: 1, status: 1, createdAt: -1 },
        { name: 'type_status_date_idx', background: true }
      );
      
      await paymentsCollection.createIndex(
        { stripePaymentIntentId: 1 },
        { name: 'stripe_intent_idx', sparse: true, background: true }
      );
      
      await paymentsCollection.createIndex(
        { method: 1, status: 1 },
        { name: 'method_status_idx', background: true }
      );
      
      await paymentsCollection.createIndex(
        { amount: -1, currency: 1 },
        { name: 'amount_currency_idx', background: true }
      );
      
      await paymentsCollection.createIndex(
        { orderId: 1 },
        { name: 'order_id_idx', sparse: true, background: true }
      );
      
      console.log('✅ Payment indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Payment indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Order models (ecommerce and marketplace)
   */
  async createOrderIndexes() {
    console.log('🔍 Creating optimized indexes for Order models...');
    
    try {
      const db = mongoose.connection.db;
      
      // E-commerce Orders
      const ordersCollection = db.collection('orders');
      await ordersCollection.createIndex(
        { buyerId: 1, status: 1, createdAt: -1 },
        { name: 'buyer_status_date_idx', background: true }
      );
      
      await ordersCollection.createIndex(
        { sellerId: 1, status: 1, createdAt: -1 },
        { name: 'seller_status_date_idx', background: true }
      );
      
      await ordersCollection.createIndex(
        { orderNumber: 1 },
        { name: 'order_number_idx', unique: true, background: true }
      );
      
      await ordersCollection.createIndex(
        { paymentStatus: 1, status: 1 },
        { name: 'payment_order_status_idx', background: true }
      );
      
      // Service Orders (Marketplace)
      const serviceOrdersCollection = db.collection('serviceorders');
      await serviceOrdersCollection.createIndex(
        { buyerId: 1, status: 1, createdAt: -1 },
        { name: 'service_buyer_status_date_idx', background: true }
      );
      
      await serviceOrdersCollection.createIndex(
        { providerId: 1, status: 1, createdAt: -1 },
        { name: 'provider_status_date_idx', background: true }
      );
      
      await serviceOrdersCollection.createIndex(
        { serviceId: 1, status: 1 },
        { name: 'service_status_idx', background: true }
      );
      
      await serviceOrdersCollection.createIndex(
        { deliveryDate: 1, status: 1 },
        { name: 'delivery_status_idx', background: true }
      );
      
      console.log('✅ Order indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Order indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Content and related models
   */
  async createContentIndexes() {
    console.log('🔍 Creating optimized indexes for Content models...');
    
    try {
      const db = mongoose.connection.db;
      
      // Content Collection
      const contentCollection = db.collection('contents');
      await contentCollection.createIndex(
        { authorId: 1, status: 1, createdAt: -1 },
        { name: 'author_status_date_idx', background: true }
      );
      
      await contentCollection.createIndex(
        { type: 1, category: 1, status: 1 },
        { name: 'type_category_status_idx', background: true }
      );
      
      await contentCollection.createIndex(
        { slug: 1 },
        { name: 'content_slug_idx', unique: true, background: true }
      );
      
      await contentCollection.createIndex(
        { tags: 1, status: 1 },
        { name: 'tags_status_idx', background: true }
      );
      
      await contentCollection.createIndex(
        { 'monetization.type': 1, 'monetization.price': 1 },
        { name: 'monetization_idx', background: true }
      );
      
      await contentCollection.createIndex(
        { views: -1, likes: -1 },
        { name: 'engagement_idx', background: true }
      );
      
      // Text search index for content
      await contentCollection.createIndex(
        { title: 'text', content: 'text', tags: 'text' },
        { name: 'content_text_search_idx', background: true }
      );
      
      // Comments Collection
      const commentsCollection = db.collection('comments');
      await commentsCollection.createIndex(
        { contentId: 1, createdAt: -1 },
        { name: 'content_date_idx', background: true }
      );
      
      await commentsCollection.createIndex(
        { authorId: 1, createdAt: -1 },
        { name: 'comment_author_date_idx', background: true }
      );
      
      // Content Purchases Collection
      const contentPurchasesCollection = db.collection('contentpurchases');
      await contentPurchasesCollection.createIndex(
        { buyerId: 1, status: 1, createdAt: -1 },
        { name: 'purchase_buyer_status_date_idx', background: true }
      );
      
      await contentPurchasesCollection.createIndex(
        { contentId: 1, status: 1 },
        { name: 'purchase_content_status_idx', background: true }
      );
      
      console.log('✅ Content indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Content indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Service and Product models
   */
  async createMarketplaceIndexes() {
    console.log('🔍 Creating optimized indexes for Marketplace models...');
    
    try {
      const db = mongoose.connection.db;
      
      // Services Collection
      const servicesCollection = db.collection('services');
      await servicesCollection.createIndex(
        { providerId: 1, status: 1, createdAt: -1 },
        { name: 'service_provider_status_date_idx', background: true }
      );
      
      await servicesCollection.createIndex(
        { category: 1, subcategory: 1, status: 1 },
        { name: 'service_category_status_idx', background: true }
      );
      
      await servicesCollection.createIndex(
        { 'pricing.basePrice': 1, status: 1 },
        { name: 'service_price_status_idx', background: true }
      );
      
      await servicesCollection.createIndex(
        { tags: 1, status: 1 },
        { name: 'service_tags_status_idx', background: true }
      );
      
      await servicesCollection.createIndex(
        { 'rating.average': -1, orders: -1 },
        { name: 'service_rating_orders_idx', background: true }
      );
      
      await servicesCollection.createIndex(
        { isFeatured: 1, status: 1, 'rating.average': -1 },
        { name: 'featured_services_idx', background: true }
      );
      
      // Products Collection
      const productsCollection = db.collection('products');
      await productsCollection.createIndex(
        { sellerId: 1, status: 1, createdAt: -1 },
        { name: 'product_seller_status_date_idx', background: true }
      );
      
      await productsCollection.createIndex(
        { category: 1, subcategory: 1, status: 1 },
        { name: 'product_category_status_idx', background: true }
      );
      
      await productsCollection.createIndex(
        { price: 1, status: 1 },
        { name: 'product_price_status_idx', background: true }
      );
      
      await productsCollection.createIndex(
        { tags: 1, status: 1 },
        { name: 'product_tags_status_idx', background: true }
      );
      
      await productsCollection.createIndex(
        { 'rating.average': -1, sales: -1 },
        { name: 'product_rating_sales_idx', background: true }
      );
      
      // Text search for services and products
      await servicesCollection.createIndex(
        { title: 'text', description: 'text', tags: 'text' },
        { name: 'service_text_search_idx', background: true }
      );
      
      await productsCollection.createIndex(
        { name: 'text', description: 'text', tags: 'text' },
        { name: 'product_text_search_idx', background: true }
      );
      
      console.log('✅ Marketplace indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Marketplace indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Notification models
   */
  async createNotificationIndexes() {
    console.log('🔍 Creating optimized indexes for Notification models...');
    
    try {
      const db = mongoose.connection.db;
      
      // Notifications Collection
      const notificationsCollection = db.collection('notifications');
      await notificationsCollection.createIndex(
        { userId: 1, isRead: 1, createdAt: -1 },
        { name: 'notification_user_read_date_idx', background: true }
      );
      
      await notificationsCollection.createIndex(
        { type: 1, priority: 1, createdAt: -1 },
        { name: 'notification_type_priority_date_idx', background: true }
      );
      
      await notificationsCollection.createIndex(
        { expiresAt: 1 },
        { name: 'notification_expiry_idx', expireAfterSeconds: 0, background: true }
      );
      
      // Email Templates Collection
      const emailTemplatesCollection = db.collection('emailtemplates');
      await emailTemplatesCollection.createIndex(
        { category: 1, isActive: 1 },
        { name: 'template_category_active_idx', background: true }
      );
      
      // Email Campaigns Collection
      const emailCampaignsCollection = db.collection('emailcampaigns');
      await emailCampaignsCollection.createIndex(
        { status: 1, scheduledAt: 1 },
        { name: 'campaign_status_schedule_idx', background: true }
      );
      
      await emailCampaignsCollection.createIndex(
        { createdBy: 1, status: 1, createdAt: -1 },
        { name: 'campaign_creator_status_date_idx', background: true }
      );
      
      console.log('✅ Notification indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Notification indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Withdrawal model
   */
  async createWithdrawalIndexes() {
    console.log('🔍 Creating optimized indexes for Withdrawal model...');
    
    try {
      const db = mongoose.connection.db;
      const withdrawalsCollection = db.collection('withdrawals');
      
      await withdrawalsCollection.createIndex(
        { userId: 1, status: 1, createdAt: -1 },
        { name: 'withdrawal_user_status_date_idx', background: true }
      );
      
      await withdrawalsCollection.createIndex(
        { status: 1, method: 1 },
        { name: 'withdrawal_status_method_idx', background: true }
      );
      
      await withdrawalsCollection.createIndex(
        { processedBy: 1, processedAt: -1 },
        { name: 'withdrawal_processed_idx', sparse: true, background: true }
      );
      
      console.log('✅ Withdrawal indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Withdrawal indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Affiliate models
   */
  async createAffiliateIndexes() {
    console.log('🔍 Creating optimized indexes for Affiliate models...');
    
    try {
      const db = mongoose.connection.db;
      
      // Affiliate Program indexes
      const affiliateProgramsCollection = db.collection('affiliateprograms');
      await affiliateProgramsCollection.createIndex(
        { merchantId: 1, status: 1 },
        { name: 'affiliate_merchant_status_idx', background: true }
      );
      
      await affiliateProgramsCollection.createIndex(
        { category: 1, status: 1 },
        { name: 'affiliate_category_status_idx', background: true }
      );
      
      await affiliateProgramsCollection.createIndex(
        { 'stats.conversionRate': -1 },
        { name: 'affiliate_conversion_rate_idx', background: true }
      );
      
      await affiliateProgramsCollection.createIndex(
        { status: 1, createdAt: -1 },
        { name: 'affiliate_status_date_idx', background: true }
      );
      
      // Affiliate Link indexes
      const affiliateLinksCollection = db.collection('affiliatelinks');
      await affiliateLinksCollection.createIndex(
        { affiliateId: 1, isActive: 1 },
        { name: 'link_affiliate_active_idx', background: true }
      );
      
      await affiliateLinksCollection.createIndex(
        { programId: 1, isActive: 1 },
        { name: 'link_program_active_idx', background: true }
      );
      
      await affiliateLinksCollection.createIndex(
        { shortCode: 1 },
        { name: 'link_short_code_idx', unique: true, background: true }
      );
      
      await affiliateLinksCollection.createIndex(
        { trackingId: 1 },
        { name: 'link_tracking_id_idx', unique: true, background: true }
      );
      
      await affiliateLinksCollection.createIndex(
        { affiliateId: 1, createdAt: -1 },
        { name: 'link_affiliate_date_idx', background: true }
      );
      
      // Commission indexes
      const commissionsCollection = db.collection('commissions');
      await commissionsCollection.createIndex(
        { affiliateId: 1, status: 1, createdAt: -1 },
        { name: 'commission_affiliate_status_date_idx', background: true }
      );
      
      await commissionsCollection.createIndex(
        { programId: 1, status: 1 },
        { name: 'commission_program_status_idx', background: true }
      );
      
      await commissionsCollection.createIndex(
        { status: 1, transactionDate: -1 },
        { name: 'commission_status_transaction_date_idx', background: true }
      );
      
      await commissionsCollection.createIndex(
        { orderId: 1, orderType: 1 },
        { name: 'commission_order_idx', background: true }
      );
      
      // Click Tracking indexes
      const clickTrackingCollection = db.collection('clicktrackings');
      await clickTrackingCollection.createIndex(
        { linkId: 1, createdAt: -1 },
        { name: 'click_link_date_idx', background: true }
      );
      
      await clickTrackingCollection.createIndex(
        { affiliateId: 1, createdAt: -1 },
        { name: 'click_affiliate_date_idx', background: true }
      );
      
      await clickTrackingCollection.createIndex(
        { visitorId: 1, linkId: 1 },
        { name: 'click_visitor_link_idx', background: true }
      );
      
      await clickTrackingCollection.createIndex(
        { converted: 1, conversionDate: -1 },
        { name: 'click_conversion_idx', background: true }
      );
      
      console.log('✅ Affiliate indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Affiliate indexes:', error);
      throw error;
    }
  }

  /**
   * Optimized query methods for User model
   */
  static getUserQueries() {
    return {
      // Find active users with pagination
      findActiveUsers: (page = 1, limit = 20, filters = {}) => {
        const skip = (page - 1) * limit;
        return User.find({ isActive: true, ...filters })
          .select('-password -verificationToken -resetPasswordToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(); // Use lean() for read-only operations
      },

      // Find user by email (optimized)
      findByEmail: (email) => {
        return User.findOne({ email: email.toLowerCase(), isActive: true })
          .select('+password')
          .lean();
      },

      // Find users by referral code
      findByReferralCode: (referralCode) => {
        return User.findOne({ referralCode })
          .select('_id name email referralCode')
          .lean();
      },

      // Get user earnings summary
      getUserEarnings: (userId) => {
        return User.findById(userId)
          .select('totalEarnings availableBalance pendingBalance')
          .lean();
      },

      // Get premium users
      getPremiumUsers: (page = 1, limit = 20) => {
        const skip = (page - 1) * limit;
        return User.find({ 
          isPremium: true, 
          premiumExpiry: { $gt: new Date() },
          isActive: true 
        })
          .select('-password -verificationToken')
          .sort({ premiumExpiry: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      },

      // Get user referrals with stats
      getUserReferrals: (userId, page = 1, limit = 20) => {
        const skip = (page - 1) * limit;
        return User.find({ referredBy: userId })
          .select('name email createdAt totalEarnings')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      },

      // Search users (using text index)
      searchUsers: (query, page = 1, limit = 20) => {
        const skip = (page - 1) * limit;
        return User.find(
          { $text: { $search: query }, isActive: true },
          { score: { $meta: 'textScore' } }
        )
          .select('-password -verificationToken')
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .lean();
      },

      // Get user analytics data
      getUserAnalytics: () => {
        return User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
              },
              premiumUsers: {
                $sum: { $cond: [{ $eq: ['$isPremium', true] }, 1, 0] }
              },
              totalEarnings: { $sum: '$totalEarnings' },
              avgEarnings: { $avg: '$totalEarnings' }
            }
          }
        ]);
      },

      // Get top earners
      getTopEarners: (limit = 10) => {
        return User.find({ isActive: true })
          .select('name email totalEarnings avatar')
          .sort({ totalEarnings: -1 })
          .limit(limit)
          .lean();
      }
    };
  }

  /**
   * Query performance monitoring
   */
  startQueryMonitoring() {
    console.log('📊 Starting query performance monitoring...');
    
    // Monitor slow queries
    mongoose.set('debug', (collectionName, method, query, doc, options) => {
      const startTime = Date.now();
      
      // Log slow queries (> 100ms)
      setTimeout(() => {
        const duration = Date.now() - startTime;
        if (duration > 100) {
          this.slowQueries.push({
            collection: collectionName,
            method,
            query,
            duration,
            timestamp: new Date()
          });
          
          console.warn(`🐌 Slow query detected: ${collectionName}.${method} took ${duration}ms`);
        }
      }, 0);
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        const collStats = await db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          count: collStats.count,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize,
          indexCount: collStats.nindexes,
          totalIndexSize: collStats.totalIndexSize
        };
      }
      
      return {
        database: {
          collections: stats.collections,
          objects: stats.objects,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize
        },
        collections: collectionStats,
        slowQueries: this.slowQueries.slice(-10) // Last 10 slow queries
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Analytics models
   */
  async createAnalyticsIndexes() {
    console.log('🔍 Creating optimized indexes for Analytics models...');
    
    try {
      const db = mongoose.connection.db;
      
      // User Analytics indexes
      const userAnalyticsCollection = db.collection('useranalytics');
      await userAnalyticsCollection.createIndex(
        { userId: 1, date: -1, period: 1 },
        { name: 'user_analytics_user_date_period_idx', background: true }
      );
      
      await userAnalyticsCollection.createIndex(
        { date: -1, period: 1 },
        { name: 'user_analytics_date_period_idx', background: true }
      );
      
      await userAnalyticsCollection.createIndex(
        { userId: 1, period: 1, createdAt: -1 },
        { name: 'user_analytics_user_period_date_idx', background: true }
      );
      
      // Platform Analytics indexes
      const platformAnalyticsCollection = db.collection('platformanalytics');
      await platformAnalyticsCollection.createIndex(
        { date: -1, period: 1 },
        { name: 'platform_analytics_date_period_idx', background: true }
      );
      
      await platformAnalyticsCollection.createIndex(
        { period: 1, createdAt: -1 },
        { name: 'platform_analytics_period_date_idx', background: true }
      );
      
      // Realtime Analytics indexes
      const realtimeAnalyticsCollection = db.collection('realtimeanalytics');
      await realtimeAnalyticsCollection.createIndex(
        { timestamp: -1 },
        { name: 'realtime_analytics_timestamp_idx', background: true }
      );
      
      // Event Tracking indexes
      const eventTrackingCollection = db.collection('eventtrackings');
      await eventTrackingCollection.createIndex(
        { userId: 1, timestamp: -1 },
        { name: 'event_user_timestamp_idx', background: true }
      );
      
      await eventTrackingCollection.createIndex(
        { event: 1, category: 1, timestamp: -1 },
        { name: 'event_category_timestamp_idx', background: true }
      );
      
      await eventTrackingCollection.createIndex(
        { sessionId: 1, timestamp: -1 },
        { name: 'event_session_timestamp_idx', background: true }
      );
      
      await eventTrackingCollection.createIndex(
        { timestamp: -1 },
        { name: 'event_timestamp_idx', background: true }
      );
      
      await eventTrackingCollection.createIndex(
        { 'user.isAuthenticated': 1, timestamp: -1 },
        { name: 'event_auth_timestamp_idx', background: true }
      );
      
      console.log('✅ Analytics indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating Analytics indexes:', error);
      throw error;
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase() {
    console.log('🚀 Starting comprehensive database optimization...');
    
    try {
      // Create all indexes
      await this.createUserIndexes();
      await this.createPaymentIndexes();
      await this.createOrderIndexes();
      await this.createContentIndexes();
      await this.createMarketplaceIndexes();
      await this.createNotificationIndexes();
      await this.createWithdrawalIndexes();
      await this.createAffiliateIndexes();
      await this.createAnalyticsIndexes();
      
      // Start monitoring
      this.startQueryMonitoring();
      
      // Set connection pool options
      mongoose.connection.on('connected', () => {
        console.log('✅ Comprehensive database optimization completed');
      });
      
      return true;
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    console.log('🧹 Starting database cleanup...');
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Remove old verification tokens
      const verificationCleanup = await User.updateMany(
        { 
          verificationToken: { $exists: true },
          createdAt: { $lt: thirtyDaysAgo },
          isVerified: false
        },
        { $unset: { verificationToken: 1 } }
      );
      
      // Remove old reset password tokens
      const resetTokenCleanup = await User.updateMany(
        {
          resetPasswordExpire: { $lt: new Date() }
        },
        { 
          $unset: { 
            resetPasswordToken: 1, 
            resetPasswordExpire: 1 
          } 
        }
      );
      
      console.log(`✅ Cleanup completed:`);
      console.log(`  - Verification tokens: ${verificationCleanup.modifiedCount}`);
      console.log(`  - Reset tokens: ${resetTokenCleanup.modifiedCount}`);
      
      return {
        verificationTokens: verificationCleanup.modifiedCount,
        resetTokens: resetTokenCleanup.modifiedCount
      };
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    try {
      const stats = await this.getDatabaseStats();
      const report = {
        timestamp: new Date(),
        database: stats.database,
        collections: stats.collections,
        performance: {
          slowQueries: stats.slowQueries.length,
          avgQueryTime: this.calculateAverageQueryTime(),
          indexEfficiency: this.calculateIndexEfficiency(stats)
        },
        recommendations: this.generateRecommendations(stats)
      };
      
      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Calculate average query time
   */
  calculateAverageQueryTime() {
    if (this.slowQueries.length === 0) return 0;
    
    const totalTime = this.slowQueries.reduce((sum, query) => sum + query.duration, 0);
    return Math.round(totalTime / this.slowQueries.length);
  }

  /**
   * Calculate index efficiency
   */
  calculateIndexEfficiency(stats) {
    const efficiency = {};
    
    Object.entries(stats.collections).forEach(([name, collStats]) => {
      if (collStats.count > 0) {
        efficiency[name] = {
          indexRatio: (collStats.totalIndexSize / collStats.size * 100).toFixed(2),
          avgObjSize: collStats.avgObjSize,
          indexCount: collStats.indexCount
        };
      }
    });
    
    return efficiency;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    // Check for collections without indexes
    Object.entries(stats.collections).forEach(([name, collStats]) => {
      if (collStats.indexCount <= 1 && collStats.count > 1000) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          message: `Collection '${name}' has ${collStats.count} documents but only ${collStats.indexCount} index(es). Consider adding indexes for frequently queried fields.`
        });
      }
    });
    
    // Check for slow queries
    if (this.slowQueries.length > 10) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `${this.slowQueries.length} slow queries detected. Review query patterns and consider adding indexes.`
      });
    }
    
    // Check database size
    if (stats.database.dataSize > 1000000000) { // 1GB
      recommendations.push({
        type: 'storage',
        priority: 'low',
        message: 'Database size is over 1GB. Consider implementing data archiving strategy.'
      });
    }
    
    return recommendations;
  }
}

module.exports = {
  DatabaseOptimizer,
  UserQueries: DatabaseOptimizer.getUserQueries()
};