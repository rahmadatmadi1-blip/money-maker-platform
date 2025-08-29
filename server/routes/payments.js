const express = require('express');
const { body, validationResult } = require('express-validator');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { PaymentEncryption, encryptionMiddleware } = require('../utils/encryption');
const PaymentValidator = require('../utils/paymentValidation');
const router = express.Router();

// PayPal Configuration
const Environment = process.env.PAYPAL_MODE === 'production' 
  ? paypal.core.LiveEnvironment 
  : paypal.core.SandboxEnvironment;

const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
);

// In-memory storage for development without MongoDB
let inMemoryPayments = [];
let paymentIdCounter = 1;

// Payment Model
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  type: {
    type: String,
    enum: ['order', 'premium_upgrade', 'withdrawal', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  method: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'ewallet', 'bri_transfer', 'jago_transfer', 'dana', 'ovo', 'credit_card', 'jago_credit_card'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment gateway data
  stripePaymentIntentId: String,
  stripeChargeId: String,
  paypalOrderId: String,
  
  // Transaction details
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  
  // Timestamps
  processedAt: Date,
  completedAt: Date,
  
  // Error handling
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Refund information
  refundAmount: {
    type: Number,
    default: 0
  },
  stripeRefundId: String,
  refundedAt: Date
}, {
  timestamps: true
});

// @route   GET /api/payments/balance
// @desc    Get user's balance from Stripe Connect account
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user.stripeConnectAccountId) {
      return res.json({
        success: true,
        balance: {
          available: [],
          pending: [],
          hasConnectAccount: false
        }
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeConnectAccountId
    });

    // Get recent transactions
    const transactions = await stripe.balanceTransactions.list({
      limit: 10
    }, {
      stripeAccount: user.stripeConnectAccountId
    });

    res.json({
      success: true,
      balance: {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency
        })),
        hasConnectAccount: true
      },
      recentTransactions: transactions.data.map(t => ({
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency,
        type: t.type,
        description: t.description,
        created: new Date(t.created * 1000)
      }))
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil saldo'
    });
  }
});

// @route   GET /api/payments/analytics
// @desc    Get payment analytics for seller
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
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
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const analytics = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          completed: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'completed'] }, '$totalAmount', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'pending'] }, '$totalAmount', 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'failed'] }, '$totalAmount', 0]
            }
          },
          totalTransactions: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get method breakdown
    const methodBreakdown = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get overall summary
    const summary = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          totalRefunded: { $sum: '$refundAmount' },
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageTransactionValue: {
            $avg: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null]
            }
          }
        }
      }
    ]);

    const summaryData = summary[0] || {
      totalRevenue: 0,
      totalRefunded: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      averageTransactionValue: 0
    };

    res.json({
      success: true,
      period,
      summary: {
        ...summaryData,
        successRate: summaryData.totalTransactions > 0 
          ? (summaryData.successfulTransactions / summaryData.totalTransactions * 100).toFixed(2)
          : 0,
        netRevenue: summaryData.totalRevenue - summaryData.totalRefunded
      },
      dailyData: analytics,
      methodBreakdown
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data analytics'
    });
  }
});

// @route   POST /api/payments/create-subscription
// @desc    Create Stripe subscription for premium features
// @access  Private
router.post('/create-subscription', auth, async (req, res) => {
  try {
    const { priceId, paymentMethodId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Price ID diperlukan'
      });
    }

    // Get or create Stripe customer
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Attach payment method to customer if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId.toString()
      }
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat subscription'
    });
  }
});

// @route   POST /api/payments/cancel-subscription
// @desc    Cancel user subscription
// @access  Private
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID diperlukan'
      });
    }

    // Verify subscription belongs to user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Tidak diizinkan untuk membatalkan subscription ini'
      });
    }

    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000)
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membatalkan subscription'
    });
  }
});

// @route   GET /api/payments/subscriptions
// @desc    Get user's active subscriptions
// @access  Private
router.get('/subscriptions', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      return res.json({
        success: true,
        subscriptions: []
      });
    }

    // Get subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      expand: ['data.default_payment_method']
    });

    const formattedSubscriptions = subscriptions.data.map(sub => ({
      id: sub.id,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      items: sub.items.data.map(item => ({
        id: item.id,
        priceId: item.price.id,
        productId: item.price.product,
        amount: item.price.unit_amount / 100,
        currency: item.price.currency,
        interval: item.price.recurring.interval
      })),
      defaultPaymentMethod: sub.default_payment_method ? {
        id: sub.default_payment_method.id,
        type: sub.default_payment_method.type,
        last4: sub.default_payment_method.card?.last4,
        brand: sub.default_payment_method.card?.brand
      } : null
    }));

    res.json({
      success: true,
      subscriptions: formattedSubscriptions
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data subscription'
    });
  }
});

// @route   POST /api/payments/add-payment-method
// @desc    Add payment method to customer
// @access  Private
router.post('/add-payment-method', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Method ID diperlukan'
      });
    }

    // Get or create Stripe customer
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    res.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        } : null
      }
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan payment method'
    });
  }
});

// @route   GET /api/payments/payment-methods
// @desc    Get customer's payment methods
// @access  Private
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      return res.json({
        success: true,
        paymentMethods: []
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      } : null,
      created: new Date(pm.created * 1000)
    }));

    res.json({
      success: true,
      paymentMethods: formattedMethods
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil payment methods'
    });
  }
});

// @route   DELETE /api/payments/payment-method/:id
// @desc    Remove payment method
// @access  Private
router.delete('/payment-method/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    // Verify payment method belongs to user
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan'
      });
    }

    // Get payment method to verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Tidak diizinkan untuk menghapus payment method ini'
      });
    }

    // Detach payment method
    await stripe.paymentMethods.detach(id);

    res.json({
      success: true,
      message: 'Payment method berhasil dihapus'
    });

  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus payment method'
    });
  }
});

// @route   POST /api/payments/set-default-payment-method
// @desc    Set default payment method for customer
// @access  Private
router.post('/set-default-payment-method', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Method ID diperlukan'
      });
    }

    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan'
      });
    }

    // Verify payment method belongs to user
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Payment method tidak valid'
      });
    }

    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({
      success: true,
      message: 'Default payment method berhasil diatur'
    });

  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengatur default payment method'
    });
  }
});

module.exports = router;

// Add encryption middleware to payment schema
paymentSchema.pre('save', encryptionMiddleware.preSave);
paymentSchema.post('find', encryptionMiddleware.postFind);
paymentSchema.post('findOne', encryptionMiddleware.postFind);
paymentSchema.post('findOneAndUpdate', encryptionMiddleware.postFind);

// Withdrawal Model
const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 10 // Minimum withdrawal $10
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'stripe'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending'
  },
  
  // Payment details
  paymentDetails: {
    // Bank transfer
    bankName: String,
    accountNumber: String,
    accountName: String,
    routingNumber: String,
    
    // PayPal
    paypalEmail: String,
    
    // Stripe
    stripeAccountId: String
  },
  
  // Processing info
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  completedAt: Date,
  
  // Notes
  adminNotes: String,
  userNotes: String,
  
  // Transaction reference
  transactionId: String
}, {
  timestamps: true
});

// Add encryption middleware to withdrawal schema
withdrawalSchema.pre('save', encryptionMiddleware.preSave);
withdrawalSchema.post('find', encryptionMiddleware.postFind);
withdrawalSchema.post('findOne', encryptionMiddleware.postFind);
withdrawalSchema.post('findOneAndUpdate', encryptionMiddleware.postFind);

const Payment = mongoose.model('Payment', paymentSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// Security validation middleware
const validatePaymentSecurity = (req, res, next) => {
  // Check if encryption key is properly configured
  if (!PaymentEncryption.validateEncryptionKey()) {
    console.error('Payment encryption key is not properly configured');
    return res.status(500).json({ error: 'Payment security not properly configured' });
  }
  
  // Sanitize request data for logging
  req.sanitizedBody = PaymentEncryption.sanitizeForLogging(req.body);
  
  next();
};

// Rate limiting for sensitive payment operations
const paymentRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 payment attempts per windowMs
  message: 'Too many payment attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
};

// @route   POST /api/payments/create-payment-intent
// @desc    Create Stripe payment intent with enhanced features
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId, type = 'order', connectedAccountId, applicationFeeAmount } = req.body;
    const userId = req.user._id || req.user.id;

    // Validate amount
    if (!amount || amount < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least $0.50'
      });
    }

    // Validate currency
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'idr'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency'
      });
    }

    // Prepare payment intent options
    const paymentIntentOptions = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId.toString(),
        orderId: orderId?.toString() || '',
        type,
        timestamp: new Date().toISOString()
      }
    };

    // Add Stripe Connect support for marketplace payments
    if (connectedAccountId && type === 'marketplace_order') {
      paymentIntentOptions.transfer_data = {
        destination: connectedAccountId,
      };
      
      if (applicationFeeAmount) {
        paymentIntentOptions.application_fee_amount = Math.round(applicationFeeAmount * 100);
      }
    }

    // Create payment intent with retry mechanism
    let paymentIntent;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
        break;
      } catch (stripeError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw stripeError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    // Save payment record with enhanced data
    const payment = new Payment({
      userId,
      orderId,
      type,
      amount,
      currency: currency.toLowerCase(),
      method: 'stripe',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      description: `Payment for ${type}`,
      metadata: new Map([
        ['connectedAccountId', connectedAccountId || ''],
        ['applicationFeeAmount', applicationFeeAmount || 0],
        ['retryCount', retryCount],
        ['createdAt', new Date().toISOString()],
        ['userAgent', req.get('User-Agent') || ''],
        ['ipAddress', req.ip || '']
      ])
    });

    await payment.save();

    // Log successful payment intent creation
    console.log('Payment intent created:', {
      paymentId: payment._id,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      currency,
      userId,
      type
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Create payment intent error:', {
      error: error.message,
      code: error.code,
      type: error.type,
      userId: req.user?._id || req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Return appropriate error message based on error type
    let errorMessage = 'Terjadi kesalahan saat membuat payment intent';
    let statusCode = 500;
    
    if (error.type === 'StripeCardError') {
      errorMessage = 'Kartu tidak valid atau ditolak';
      statusCode = 400;
    } else if (error.type === 'StripeRateLimitError') {
      errorMessage = 'Terlalu banyak permintaan, coba lagi nanti';
      statusCode = 429;
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Permintaan tidak valid';
      statusCode = 400;
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Kesalahan server Stripe, coba lagi nanti';
      statusCode = 502;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: error.code || 'unknown_error'
    });
  }
});

// @route   POST /api/payments/create-connect-account
// @desc    Create Stripe Connect account for sellers
// @access  Private
router.post('/create-connect-account', auth, async (req, res) => {
  try {
    const { type = 'express', country = 'US', email } = req.body;
    const userId = req.user._id || req.user.id;

    // Check if user already has a connect account
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (user.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'User already has a Stripe Connect account'
      });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type,
      country,
      email: email || user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId.toString(),
        platform: 'money-maker'
      }
    });

    // Update user with connect account ID
    user.stripeConnectAccountId = account.id;
    await user.save();

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/seller/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL}/seller/onboarding/complete`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url
    });

  } catch (error) {
    console.error('Create connect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat akun Stripe Connect'
    });
  }
});

// @route   GET /api/payments/connect-account-status
// @desc    Get Stripe Connect account status
// @access  Private
router.get('/connect-account-status', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user.stripeConnectAccountId) {
      return res.json({
        success: true,
        hasAccount: false
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    res.json({
      success: true,
      hasAccount: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements
    });

  } catch (error) {
    console.error('Get connect account status error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil status akun Stripe Connect'
    });
  }
});

// @route   POST /api/payments/confirm-payment
// @desc    Confirm payment completion
// @access  Private
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Pembayaran belum berhasil'
      });
    }

    // Update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record tidak ditemukan'
      });
    }

    payment.status = 'completed';
    payment.stripeChargeId = paymentIntent.latest_charge;
    payment.completedAt = new Date();
    await payment.save();

    // Process based on payment type
    if (payment.type === 'order' && payment.orderId) {
      // Update order status
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paidAt = new Date();
        await order.save();
      }
    } else if (payment.type === 'premium_upgrade') {
      // Upgrade user to premium
      const User = require('../models/User');
      const user = await User.findById(payment.userId);
      if (user) {
        user.isPremium = true;
        user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Pembayaran berhasil dikonfirmasi',
      payment
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengkonfirmasi pembayaran'
    });
  }
});

// @route   POST /api/payments/create-refund
// @desc    Create refund for a payment
// @access  Private
router.post('/create-refund', auth, async (req, res) => {
  try {
    const { paymentId, amount, reason = 'requested_by_customer' } = req.body;
    const userId = req.user._id || req.user.id;

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment tidak ditemukan'
      });
    }

    // Check if user owns this payment or is admin
    if (payment.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tidak diizinkan untuk refund payment ini'
      });
    }

    // Check if payment can be refunded
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Hanya payment yang completed yang bisa di-refund'
      });
    }

    // Validate refund amount
    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah refund tidak boleh lebih dari jumlah payment'
      });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason,
      metadata: {
        userId: userId.toString(),
        paymentId: paymentId.toString(),
        originalAmount: payment.amount.toString()
      }
    });

    // Update payment record
    payment.status = refundAmount === payment.amount ? 'refunded' : 'partially_refunded';
    payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
    payment.stripeRefundId = refund.id;
    payment.refundedAt = new Date();
    await payment.save();

    // Update order status if fully refunded
    if (payment.orderId && refundAmount === payment.amount) {
      const Order = require('../models/Order');
      await Order.findByIdAndUpdate(payment.orderId, {
        status: 'refunded',
        paymentStatus: 'refunded',
        refundedAt: new Date()
      });
    }

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
        reason: refund.reason
      },
      payment: {
        id: payment._id,
        status: payment.status,
        refundAmount: payment.refundAmount
      }
    });

  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat refund'
    });
  }
});

// @route   POST /api/payments/create-transfer
// @desc    Create transfer to connected account
// @access  Private (Admin only)
router.post('/create-transfer', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya admin yang dapat membuat transfer'
      });
    }

    const { amount, currency = 'usd', destination, description } = req.body;

    if (!amount || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Amount dan destination diperlukan'
      });
    }

    // Create transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      destination,
      description: description || 'Transfer from platform',
      metadata: {
        adminId: req.user._id.toString(),
        timestamp: new Date().toISOString()
      }
    });

    // Log transfer
    console.log('Transfer created:', {
      transferId: transfer.id,
      amount,
      currency,
      destination,
      adminId: req.user._id
    });

    res.json({
      success: true,
      transfer: {
        id: transfer.id,
        amount,
        currency,
        destination,
        status: transfer.object
      }
    });

  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat transfer'
    });
  }
});

// @route   POST /api/payments/create-payout
// @desc    Create payout for seller
// @access  Private
router.post('/create-payout', auth, async (req, res) => {
  try {
    const { amount, currency = 'usd', method = 'standard' } = req.body;
    const userId = req.user._id || req.user.id;

    // Get user's Stripe Connect account
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'User belum memiliki akun Stripe Connect'
      });
    }

    // Check account status
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({
        success: false,
        message: 'Akun Stripe Connect belum dapat menerima payout'
      });
    }

    // Get account balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeConnectAccountId
    });

    const availableBalance = balance.available.find(b => b.currency === currency.toLowerCase());
    if (!availableBalance || availableBalance.amount < Math.round(amount * 100)) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak mencukupi untuk payout'
      });
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      method,
      metadata: {
        userId: userId.toString(),
        requestedAt: new Date().toISOString()
      }
    }, {
      stripeAccount: user.stripeConnectAccountId
    });

    // Create withdrawal record
    const withdrawal = new Withdrawal({
      userId,
      amount,
      method: 'stripe_payout',
      status: 'pending',
      paymentDetails: {
        stripePayoutId: payout.id,
        stripeAccountId: user.stripeConnectAccountId
      },
      description: 'Payout to bank account',
      transactionId: payout.id
    });

    await withdrawal.save();

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount,
        currency,
        method,
        status: payout.status,
        arrivalDate: payout.arrival_date
      },
      withdrawalId: withdrawal._id
    });

  } catch (error) {
    console.error('Create payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat payout'
    });
  }
});

// @route   POST /api/payments/paypal/create-order
// @desc    Create PayPal order
// @access  Private
router.post('/paypal/create-order', auth, async (req, res) => {
  try {
    const { amount, currency = 'USD', orderId, type = 'order' } = req.body;

    // Validate amount
    if (!amount || amount < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah minimum adalah $0.50'
      });
    }

    // Create PayPal order request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        description: `Payment for ${type}`,
        payee: {
          email_address: process.env.PAYPAL_BUSINESS_EMAIL // Hidden from client
        }
      }],
      application_context: {
        return_url: `${process.env.CLIENT_URL}/payments/success`,
        cancel_url: `${process.env.CLIENT_URL}/payments/cancel`,
        brand_name: 'Money Maker Platform',
        user_action: 'PAY_NOW'
      }
    });

    const order = await paypalClient.execute(request);

    // Save payment record
    const payment = new Payment({
      userId: req.user._id,
      orderId: orderId || null,
      type,
      amount,
      currency: currency.toLowerCase(),
      method: 'paypal',
      status: 'pending',
      paypalOrderId: order.result.id,
      description: `PayPal payment for ${type}`,
      metadata: {
        paypalOrderId: order.result.id
      }
    });

    await payment.save();

    res.json({
      success: true,
      orderId: order.result.id,
      paymentId: payment._id,
      approvalUrl: order.result.links.find(link => link.rel === 'approve').href
    });

  } catch (error) {
    console.error('PayPal create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat PayPal order'
    });
  }
});

// @route   POST /api/payments/paypal/capture-order
// @desc    Capture PayPal order
// @access  Private
router.post('/paypal/capture-order', auth, async (req, res) => {
  try {
    const { orderID, paymentId } = req.body;

    if (!orderID || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID dan Payment ID diperlukan'
      });
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record tidak ditemukan'
      });
    }

    // Capture PayPal order
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    
    const capture = await paypalClient.execute(request);

    if (capture.result.status === 'COMPLETED') {
      // Update payment record
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.metadata.set('captureId', capture.result.purchase_units[0].payments.captures[0].id);
      await payment.save();

      // Process based on payment type
      if (payment.type === 'order' && payment.orderId) {
        const Order = require('../models/Order');
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.paymentStatus = 'paid';
          order.status = 'processing';
          order.paidAt = new Date();
          await order.save();
        }
      } else if (payment.type === 'premium_upgrade') {
        const User = require('../models/User');
        const user = await User.findById(payment.userId);
        if (user) {
          user.isPremium = true;
          user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await user.save();
        }
      }

      res.json({
        success: true,
        message: 'Pembayaran PayPal berhasil',
        payment,
        captureId: capture.result.purchase_units[0].payments.captures[0].id
      });
    } else {
      payment.status = 'failed';
      payment.errorMessage = 'PayPal capture failed';
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Pembayaran PayPal gagal'
      });
    }

  } catch (error) {
    console.error('PayPal capture order error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses pembayaran PayPal'
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks with comprehensive event processing
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', {
      error: err.message,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Log webhook event for monitoring
    console.log('Stripe webhook received:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString()
    });

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;
        
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.type, event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', {
      error: error.message,
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
    
    // Still return 200 to prevent Stripe from retrying
    res.json({ received: true, error: 'Processing failed' });
  }
});

// Webhook event handlers
async function handlePaymentIntentSucceeded(paymentIntent) {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id
  });
  
  if (!payment) {
    console.warn('Payment not found for PaymentIntent:', paymentIntent.id);
    return;
  }

  if (payment.status === 'completed') {
    console.log('Payment already processed:', payment._id);
    return;
  }

  // Update payment record
  payment.status = 'completed';
  payment.stripeChargeId = paymentIntent.latest_charge;
  payment.completedAt = new Date();
  payment.metadata.set('stripeWebhookProcessed', new Date().toISOString());
  await payment.save();

  // Process based on payment type
  await processPaymentCompletion(payment);
  
  // Send real-time notification
  await sendPaymentNotification(payment.userId, {
    type: 'payment_completed',
    paymentId: payment._id,
    amount: payment.amount,
    method: payment.method
  });

  console.log('Payment completed successfully:', {
    paymentId: payment._id,
    amount: payment.amount,
    userId: payment.userId
  });
}

async function handlePaymentIntentFailed(paymentIntent) {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id
  });
  
  if (!payment) {
    console.warn('Payment not found for failed PaymentIntent:', paymentIntent.id);
    return;
  }

  payment.status = 'failed';
  payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
  payment.metadata.set('stripeFailureReason', paymentIntent.last_payment_error?.code || 'unknown');
  payment.metadata.set('stripeWebhookProcessed', new Date().toISOString());
  await payment.save();

  // Send failure notification
  await sendPaymentNotification(payment.userId, {
    type: 'payment_failed',
    paymentId: payment._id,
    amount: payment.amount,
    error: payment.errorMessage
  });

  console.log('Payment failed:', {
    paymentId: payment._id,
    error: payment.errorMessage,
    userId: payment.userId
  });
}

async function handlePaymentIntentCanceled(paymentIntent) {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id
  });
  
  if (payment && payment.status === 'pending') {
    payment.status = 'cancelled';
    payment.metadata.set('stripeWebhookProcessed', new Date().toISOString());
    await payment.save();

    await sendPaymentNotification(payment.userId, {
      type: 'payment_cancelled',
      paymentId: payment._id,
      amount: payment.amount
    });
  }
}

async function handleChargeDispute(dispute) {
  console.warn('Charge dispute created:', {
    disputeId: dispute.id,
    chargeId: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason
  });
  
  // Find payment by charge ID
  const payment = await Payment.findOne({
    stripeChargeId: dispute.charge
  });
  
  if (payment) {
    payment.metadata.set('disputeId', dispute.id);
    payment.metadata.set('disputeReason', dispute.reason);
    payment.metadata.set('disputeCreated', new Date().toISOString());
    await payment.save();
    
    // Notify admin about dispute
    await sendAdminNotification({
      type: 'payment_dispute',
      paymentId: payment._id,
      disputeId: dispute.id,
      amount: dispute.amount,
      reason: dispute.reason
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  // Handle subscription payments
  console.log('Invoice payment succeeded:', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid
  });
}

async function handleSubscriptionEvent(eventType, subscription) {
  console.log('Subscription event:', {
    type: eventType,
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });
}

// Helper function to process payment completion
async function processPaymentCompletion(payment) {
  try {
    if (payment.type === 'order' && payment.orderId) {
      const Order = require('../models/Order');
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paidAt = new Date();
        await order.save();
        
        // Update seller earnings
        await updateSellerEarnings(order);
      }
    } else if (payment.type === 'premium_upgrade') {
      const User = require('../models/User');
      const user = await User.findById(payment.userId);
      if (user) {
        user.premiumStatus = 'active';
        user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();
      }
    }
  } catch (error) {
    console.error('Error processing payment completion:', error);
  }
}

// Helper function to update seller earnings
async function updateSellerEarnings(order) {
  try {
    const User = require('../models/User');
    const seller = await User.findById(order.sellerId);
    if (seller) {
      const platformFee = order.total * 0.05; // 5% platform fee
      const sellerEarning = order.total - platformFee;
      
      seller.totalEarnings += sellerEarning;
      seller.availableBalance += sellerEarning;
      await seller.save();
    }
  } catch (error) {
    console.error('Error updating seller earnings:', error);
  }
}

// Helper function to send real-time notifications
async function sendPaymentNotification(userId, notification) {
  try {
    // This would integrate with Socket.io for real-time notifications
    const io = require('../server').io;
    if (io) {
      io.to(`user_${userId}`).emit('payment_notification', notification);
    }
    
    // Also save to database for persistent notifications
    const Notification = require('../models/Notification');
    await Notification.create({
      userId,
      type: notification.type,
      title: getNotificationTitle(notification.type),
      message: getNotificationMessage(notification),
      data: notification,
      read: false
    });
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
}

// Helper function to send admin notifications
async function sendAdminNotification(notification) {
  try {
    const io = require('../server').io;
    if (io) {
      io.to('admin_room').emit('admin_notification', notification);
    }
    
    // Save admin notification
    const AdminNotification = require('../models/AdminNotification');
    await AdminNotification.create({
      type: notification.type,
      title: 'Payment Dispute Alert',
      message: `Payment dispute created for payment ${notification.paymentId}`,
      data: notification,
      priority: 'high',
      read: false
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

// Helper functions for notification messages
function getNotificationTitle(type) {
  const titles = {
    payment_completed: 'Payment Successful',
    payment_failed: 'Payment Failed',
    payment_cancelled: 'Payment Cancelled'
  };
  return titles[type] || 'Payment Update';
}

function getNotificationMessage(notification) {
  switch (notification.type) {
    case 'payment_completed':
      return `Your payment of $${notification.amount} has been processed successfully.`;
    case 'payment_failed':
      return `Your payment of $${notification.amount} failed: ${notification.error}`;
    case 'payment_cancelled':
      return `Your payment of $${notification.amount} has been cancelled.`;
    default:
      return 'Payment status updated.';
  }
}

// @route   GET /api/payments/history
// @desc    Get payment history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type, status } = req.query;

    let query = { userId: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat pembayaran'
    });
  }
});

// @route   POST /api/payments/withdraw
// @desc    Request withdrawal
// @access  Private
router.post('/withdraw', 
  auth, 
  validatePaymentSecurity,
  [
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount < 100000) {
          throw new Error('Minimum withdrawal amount is Rp 100,000');
        }
        if (amount > 50000000) {
          throw new Error('Maximum withdrawal amount is Rp 50,000,000');
        }
        return true;
      }),
    body('method')
      .isIn(['bank_transfer', 'e_wallet'])
      .withMessage('Invalid withdrawal method'),
    body('paymentDetails')
      .isObject()
      .withMessage('Payment details are required')
  ],
  PaymentValidator.handleValidationErrors,
  PaymentValidator.advancedSecurityValidation,
  async (req, res) => {
  try {
    const { amount, method, paymentDetails, userNotes } = req.body;

    // Validate amount
    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah minimum penarikan adalah $10'
      });
    }

    // Check user balance
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (user.earnings.available < amount) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak mencukupi'
      });
    }

    // Create withdrawal request with security enhancements
    const withdrawal = new Withdrawal({
      userId: req.user._id,
      amount,
      method,
      paymentDetails: {
        ...paymentDetails,
        // Add security metadata
        requestIP: req.ip || 'unknown',
        requestUserAgent: req.get('User-Agent') || 'unknown',
        securityToken: PaymentEncryption.generateSecureToken(16)
      },
      userNotes: userNotes ? PaymentEncryption.encrypt(userNotes) : undefined
    });

    await withdrawal.save();

    // Update user balance (move from available to pending)
    user.earnings.available -= amount;
    user.earnings.pending += amount;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Permintaan penarikan berhasil dibuat',
      withdrawal
    });

  } catch (error) {
    // Enhanced error logging for withdrawal
    console.error('Withdrawal error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      method: req.body?.method,
      amount: req.body?.amount,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      sanitizedBody: PaymentEncryption.sanitizeForLogging(req.body)
    });

    // Specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format'
      });
    }

    if (error.message.includes('Insufficient balance')) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for withdrawal'
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate withdrawal request'
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to create withdrawal request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/payments/withdrawals
// @desc    Get withdrawal history
// @access  Private
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    let query = { userId: req.user._id };
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat penarikan'
    });
  }
});

// @route   PUT /api/payments/withdrawals/:id/process
// @desc    Process withdrawal (Admin only)
// @access  Private (Admin)
router.put('/withdrawals/:id/process', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat memproses penarikan'
      });
    }

    const { status, adminNotes, transactionId } = req.body;
    
    const withdrawal = await Withdrawal.findById(req.params.id)
      .populate('userId', 'name email earnings');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Permintaan penarikan tidak ditemukan'
      });
    }

    const oldStatus = withdrawal.status;
    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    
    if (transactionId) {
      withdrawal.transactionId = transactionId;
    }
    
    if (status === 'completed') {
      withdrawal.completedAt = new Date();
      
      // Update user balance (remove from pending)
      const User = require('../models/User');
      const user = await User.findById(withdrawal.userId);
      user.earnings.pending -= withdrawal.amount;
      await user.save();
      
    } else if (status === 'rejected' && oldStatus === 'pending') {
      // Return money to available balance
      const User = require('../models/User');
      const user = await User.findById(withdrawal.userId);
      user.earnings.pending -= withdrawal.amount;
      user.earnings.available += withdrawal.amount;
      await user.save();
    }

    await withdrawal.save();

    res.json({
      success: true,
      message: 'Status penarikan berhasil diperbarui',
      withdrawal
    });

  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses penarikan'
    });
  }
});

// @route   GET /api/payments/admin/withdrawals
// @desc    Get all withdrawal requests (Admin only)
// @access  Private (Admin)
router.get('/admin/withdrawals', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, method } = req.query;

    let query = {};
    if (status) query.status = status;
    if (method) query.method = method;

    const withdrawals = await Withdrawal.find(query)
      .populate('userId', 'name email')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Withdrawal.countDocuments(query);

    // Get summary stats
    const stats = {
      pending: await Withdrawal.countDocuments({ status: 'pending' }),
      processing: await Withdrawal.countDocuments({ status: 'processing' }),
      completed: await Withdrawal.countDocuments({ status: 'completed' }),
      rejected: await Withdrawal.countDocuments({ status: 'rejected' }),
      totalAmount: await Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      success: true,
      withdrawals,
      stats,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get admin withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data penarikan'
    });
  }
});

// Indonesian Payment Methods
router.post('/local-payment/create', 
  auth, 
  validatePaymentSecurity,
  PaymentValidator.getPaymentCreationValidators(),
  PaymentValidator.handleValidationErrors,
  PaymentValidator.advancedSecurityValidation,
  async (req, res) => {
  try {
    // Debug logging
    console.log('=== LOCAL PAYMENT CREATE DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user ? { id: req.user._id || req.user.id, email: req.user.email } : 'No user');
    console.log('Headers:', req.headers);
    console.log('=====================================');
    
    const { amount, method, currency = 'IDR', paymentDetails } = req.body;
    const userId = req.user._id || req.user.id;
    
    console.log('Extracted values:', { amount, method, currency, paymentDetails, userId });

    // Validate amount (minimum 50,000 IDR)
    if (!amount || amount < 50000) {
      return res.status(400).json({ error: 'Minimum amount is Rp 50,000' });
    }

    // Validate payment method
    const validMethods = ['bri_transfer', 'jago_transfer', 'dana', 'ovo', 'credit_card', 'jago_credit_card'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Create payment record
    let payment;
    let paymentId;
    
    // Check if database is connected
    if (mongoose.connection.readyState === 1) {
      // Use MongoDB
      payment = new Payment({
        userId,
        type: 'order',
        amount,
        currency,
        method,
        description: `Deposit via ${method}`,
        status: method === 'credit_card' ? 'pending' : 'pending_verification'
      });
      await payment.save();
      paymentId = payment._id;
    } else {
      // Use in-memory storage for development
      paymentId = `payment_${paymentIdCounter++}`;
      payment = {
        _id: paymentId,
        userId,
        type: 'order',
        amount,
        currency,
        method,
        description: `Deposit via ${method}`,
        status: method === 'credit_card' ? 'pending' : 'pending_verification',
        createdAt: new Date()
      };
      inMemoryPayments.push(payment);
      console.log('💾 Payment stored in memory:', paymentId);
    }

    // Get payment details based on method
    let localPaymentDetails = {};
    
    switch (method) {
      case 'bri_transfer':
        localPaymentDetails = {
          bankName: 'Bank BRI',
          accountNumber: '109901076653502',
          accountName: 'Rahmad Atmadi',
          instructions: [
            'Transfer ke rekening BRI di atas',
            'Gunakan nominal yang tepat',
            'Simpan bukti transfer',
            'Konfirmasi pembayaran di aplikasi'
          ]
        };
        break;
      
      case 'jago_transfer':
        localPaymentDetails = {
          bankName: 'Bank Jago',
          accountNumber: '101206706732',
          accountName: 'Rahmad Atmadi',
          instructions: [
            'Transfer ke rekening Jago di atas',
            'Gunakan nominal yang tepat',
            'Simpan bukti transfer',
            'Konfirmasi pembayaran di aplikasi'
          ]
        };
        break;
      
      case 'dana':
        localPaymentDetails = {
          walletName: 'DANA',
          phoneNumber: '0895326914463',
          accountName: 'Rahmad Atmadi',
          instructions: [
            'Buka aplikasi DANA',
            'Pilih Transfer > Ke Nomor HP',
            'Masukkan nomor: 0895326914463',
            'Transfer sesuai nominal yang tertera'
          ]
        };
        break;
      
      case 'ovo':
        localPaymentDetails = {
          walletName: 'OVO',
          phoneNumber: '0895326914463',
          accountName: 'Rahmad Atmadi',
          instructions: [
            'Buka aplikasi OVO',
            'Pilih Transfer',
            'Masukkan nomor: 0895326914463',
            'Transfer sesuai nominal yang tertera'
          ]
        };
        break;
      
      case 'credit_card':
        localPaymentDetails = {
          message: 'Redirecting to secure payment gateway...',
          instructions: [
            'Anda akan diarahkan ke gateway pembayaran yang aman',
            'Masukkan detail kartu kredit/debit Anda',
            'Konfirmasi pembayaran',
            'Tunggu konfirmasi dari sistem'
          ]
        };
        break;
      
      case 'jago_credit_card':
        localPaymentDetails = {
          bankName: 'Bank Jago',
          cardType: 'Credit/Debit Card',
          accountName: 'Rahmad Atmadi',
          cardNumber: '4532 1234 5678 9012', // Sample Jago card number
          expiryDate: '12/26',
          cvv: '123',
          instructions: [
            'Gunakan kartu kredit/debit Bank Jago',
            'Nomor kartu: 4532 1234 5678 9012',
            'Tanggal kedaluwarsa: 12/26',
            'CVV: 123',
            'Nama pemegang kartu: Rahmad Atmadi',
            'Pastikan detail kartu sesuai untuk pembayaran yang aman'
          ]
        };
        break;
    }

    res.json({
      success: true,
      paymentId: paymentId,
      amount,
      currency,
      method,
      paymentDetails: localPaymentDetails,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

  } catch (error) {
    // Enhanced error logging with sanitized data
    console.error('Payment creation error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      method: req.body?.method,
      amount: req.body?.amount,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      sanitizedBody: PaymentEncryption.sanitizeForLogging(req.body)
    });

    // Specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format'
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate payment request'
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create payment',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Confirm manual payment (for bank transfer, e-wallet)
router.post('/local-payment/confirm', 
  auth, 
  validatePaymentSecurity,
  PaymentValidator.getPaymentConfirmationValidators(),
  PaymentValidator.handleValidationErrors,
  PaymentValidator.advancedSecurityValidation,
  async (req, res) => {
  try {
    const { paymentId, proofImage, notes } = req.body;
    const userId = req.user._id || req.user.id;

    const payment = await Payment.findOne({ _id: paymentId, userId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending_verification') {
      return res.status(400).json({ error: 'Payment cannot be confirmed' });
    }

    // Update payment status with encrypted proof data
    payment.status = 'processing';
    
    // Encrypt sensitive proof data
    if (proofImage) {
      payment.metadata.set('proofImage', PaymentEncryption.encrypt(proofImage));
    }
    if (notes) {
      payment.metadata.set('userNotes', PaymentEncryption.encrypt(notes));
    }
    
    // Add security audit trail
    payment.metadata.set('confirmationIP', req.ip || 'unknown');
    payment.metadata.set('confirmationUserAgent', req.get('User-Agent') || 'unknown');
    payment.metadata.set('securityToken', PaymentEncryption.generateSecureToken(16));
    
    payment.processedAt = new Date();
    
    await payment.save();

    // Here you would typically:
    // 1. Store the proof image
    // 2. Notify admin for manual verification
    // 3. Send confirmation email to user

    res.json({
      success: true,
      message: 'Payment confirmation received. We will verify your payment within 1-24 hours.',
      paymentId: payment._id,
      status: payment.status
    });

  } catch (error) {
    // Enhanced error logging for payment confirmation
    console.error('Payment confirmation error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      paymentId: req.body?.paymentId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID format'
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to confirm payment',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get payment status
router.get('/local-payment/:paymentId/status', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id || req.user.id;

    const payment = await Payment.findOne({ _id: paymentId, userId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        processedAt: payment.processedAt,
        completedAt: payment.completedAt
      }
    });

  } catch (error) {
    // Enhanced error logging for payment status
    console.error('Payment status error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      paymentId: req.params?.paymentId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Specific error handling
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID format'
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to get payment status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/payments/premium-upgrade
// @desc    Upgrade to premium membership
// @access  Private
router.post('/premium-upgrade', auth, async (req, res) => {
  try {
    const { plan = 'monthly' } = req.body;
    
    // Check if user is already premium
    if (req.user.isPremium && req.user.premiumExpiresAt > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki membership premium yang aktif'
      });
    }

    // Premium pricing
    const pricing = {
      monthly: 29.99,
      yearly: 299.99
    };

    const amount = pricing[plan];
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Plan premium tidak valid'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString(),
        type: 'premium_upgrade',
        plan
      }
    });

    // Save payment record
    const payment = new Payment({
      userId: req.user._id,
      type: 'premium_upgrade',
      amount,
      currency: 'usd',
      method: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      description: `Premium upgrade - ${plan} plan`,
      metadata: new Map([['plan', plan]])
    });

    await payment.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      amount,
      plan
    });

  } catch (error) {
    console.error('Premium upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat upgrade premium'
    });
  }
});

module.exports = router;