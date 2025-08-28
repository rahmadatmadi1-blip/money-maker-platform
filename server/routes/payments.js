const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const router = express.Router();

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
    enum: ['stripe', 'paypal', 'bank_transfer', 'ewallet'],
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
  }
}, {
  timestamps: true
});

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

const Payment = mongoose.model('Payment', paymentSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// @route   POST /api/payments/create-payment-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId, type = 'order' } = req.body;

    // Validate amount
    if (!amount || amount < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah minimum adalah $0.50'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        userId: req.user._id.toString(),
        orderId: orderId || '',
        type
      }
    });

    // Save payment record
    const payment = new Payment({
      userId: req.user._id,
      orderId,
      type,
      amount,
      currency,
      method: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      description: `Payment for ${type}`,
      status: 'pending'
    });

    await payment.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat payment intent'
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

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update payment record
      const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntent.id
      });
      
      if (payment && payment.status === 'pending') {
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();
        
        // Process the payment based on type
        if (payment.type === 'order' && payment.orderId) {
          const Order = require('../models/Order');
          const order = await Order.findById(payment.orderId);
          if (order) {
            order.paymentStatus = 'paid';
            order.status = 'processing';
            order.paidAt = new Date();
            await order.save();
          }
        }
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      const failedPaymentRecord = await Payment.findOne({
        stripePaymentIntentId: failedPayment.id
      });
      
      if (failedPaymentRecord) {
        failedPaymentRecord.status = 'failed';
        failedPaymentRecord.errorMessage = failedPayment.last_payment_error?.message || 'Payment failed';
        await failedPaymentRecord.save();
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

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
router.post('/withdraw', auth, async (req, res) => {
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

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId: req.user._id,
      amount,
      method,
      paymentDetails,
      userNotes
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
    console.error('Withdrawal request error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat permintaan penarikan'
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