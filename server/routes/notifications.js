const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { auth } = require('../middleware/auth');
const socketService = require('../services/socketService');
const router = express.Router();

// Notification Model
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'order_received', 'order_completed', 'payment_received', 'withdrawal_processed',
      'new_message', 'review_received', 'affiliate_commission', 'content_purchased',
      'service_ordered', 'system_update', 'promotion', 'reminder'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Map,
    of: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Action button
  actionUrl: String,
  actionText: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Expiry
  expiresAt: Date
}, {
  timestamps: true
});

// Email Template Model
const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: String,
  variables: [{
    name: String,
    description: String,
    required: Boolean
  }],
  category: {
    type: String,
    enum: ['transactional', 'marketing', 'system', 'notification'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Email Campaign Model
const emailCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  
  // Targeting
  targetAudience: {
    type: String,
    enum: ['all_users', 'premium_users', 'free_users', 'active_users', 'inactive_users', 'custom'],
    required: true
  },
  customFilters: {
    userRole: [String],
    registeredAfter: Date,
    registeredBefore: Date,
    lastLoginAfter: Date,
    lastLoginBefore: Date,
    minEarnings: Number,
    maxEarnings: Number
  },
  
  // Scheduling
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'],
    default: 'draft'
  },
  scheduledAt: Date,
  sentAt: Date,
  
  // Statistics
  stats: {
    totalRecipients: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 }
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
const EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema);

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Helper function to create notification
const createNotification = async (userId, type, title, message, data = {}, options = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data: new Map(Object.entries(data)),
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      priority: options.priority || 'medium',
      expiresAt: options.expiresAt
    });
    
    await notification.save();
    
    // Send real-time notification via Socket.io
    if (socketService.isUserConnected(userId)) {
      socketService.sendToUser(userId, 'new_notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: Object.fromEntries(notification.data),
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        priority: notification.priority,
        createdAt: notification.createdAt
      });
    }
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Helper function to send email
const sendEmail = async (to, subject, htmlContent, textContent = '') => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent
    };
    
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Send email error:', error);
    return { success: false, error: error.message };
  }
};

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type, isRead, priority } = req.query;

    // Validate user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Ensure userId is a valid ObjectId
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user._id);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, returning empty notifications');
      return res.json({
        success: true,
        notifications: [],
        unreadCount: 0,
        pagination: {
          current: page,
          pages: 0,
          total: 0,
          limit
        }
      });
    }

    let query = { 
      userId: userId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (priority) query.priority = priority;

    // Set timeout for database operations
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(5000);

    const total = await Notification.countDocuments(query).maxTimeMS(5000);
    const unreadCount = await Notification.countDocuments({
      userId: userId,
      isRead: false,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    }).maxTimeMS(5000);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil notifikasi'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notifikasi berhasil ditandai sebagai dibaca'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menandai notifikasi'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai sebagai dibaca'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menandai semua notifikasi'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus notifikasi'
    });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to user(s) (Admin only)
// @access  Private (Admin)
router.post('/send', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const {
      userIds,
      type,
      title,
      message,
      data,
      actionUrl,
      actionText,
      priority,
      expiresAt,
      sendEmail: shouldSendEmail
    } = req.body;

    const notifications = [];
    const emailPromises = [];

    for (const userId of userIds) {
      // Create notification
      const notification = await createNotification(
        userId,
        type,
        title,
        message,
        data,
        { actionUrl, actionText, priority, expiresAt }
      );
      
      if (notification) {
        notifications.push(notification);
      }

      // Send email if requested
      if (shouldSendEmail) {
        const User = require('../models/User');
        const user = await User.findById(userId).select('email name');
        
        if (user && user.email) {
          const emailPromise = sendEmail(
            user.email,
            title,
            `<h2>${title}</h2><p>${message}</p>${actionUrl ? `<a href="${actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${actionText || 'Lihat Detail'}</a>` : ''}`,
            message
          );
          emailPromises.push(emailPromise);
        }
      }
    }

    // Wait for all emails to be sent
    if (emailPromises.length > 0) {
      await Promise.all(emailPromises);
    }

    res.json({
      success: true,
      message: `${notifications.length} notifikasi berhasil dikirim`,
      count: notifications.length
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim notifikasi'
    });
  }
});

// @route   GET /api/notifications/templates
// @desc    Get email templates
// @access  Private (Admin)
router.get('/templates', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const { category } = req.query;
    let query = { isActive: true };
    if (category) query.category = category;

    const templates = await EmailTemplate.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil template email'
    });
  }
});

// @route   POST /api/notifications/templates
// @desc    Create email template
// @access  Private (Admin)
router.post('/templates', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const {
      name,
      subject,
      htmlContent,
      textContent,
      variables,
      category
    } = req.body;

    const template = new EmailTemplate({
      name,
      subject,
      htmlContent,
      textContent,
      variables,
      category
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template email berhasil dibuat',
      template
    });

  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat template email'
    });
  }
});

// @route   GET /api/notifications/campaigns
// @desc    Get email campaigns
// @access  Private (Admin)
router.get('/campaigns', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    let query = {};
    if (status) query.status = status;

    const campaigns = await EmailCampaign.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await EmailCampaign.countDocuments(query);

    res.json({
      success: true,
      campaigns,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil kampanye email'
    });
  }
});

// @route   POST /api/notifications/campaigns
// @desc    Create email campaign
// @access  Private (Admin)
router.post('/campaigns', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const {
      name,
      subject,
      content,
      targetAudience,
      customFilters,
      scheduledAt
    } = req.body;

    const campaign = new EmailCampaign({
      name,
      subject,
      content,
      targetAudience,
      customFilters,
      scheduledAt,
      createdBy: req.user._id,
      status: scheduledAt ? 'scheduled' : 'draft'
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Kampanye email berhasil dibuat',
      campaign
    });

  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat kampanye email'
    });
  }
});

// @route   POST /api/notifications/campaigns/:id/send
// @desc    Send email campaign
// @access  Private (Admin)
router.post('/campaigns/:id/send', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const campaign = await EmailCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Kampanye tidak ditemukan'
      });
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Kampanye sudah dikirim'
      });
    }

    // Build user query based on target audience
    const User = require('../models/User');
    let userQuery = {};
    
    switch (campaign.targetAudience) {
      case 'premium_users':
        userQuery.isPremium = true;
        break;
      case 'free_users':
        userQuery.isPremium = false;
        break;
      case 'active_users':
        userQuery.lastLogin = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'inactive_users':
        userQuery.lastLogin = { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'custom':
        if (campaign.customFilters.userRole?.length) {
          userQuery.role = { $in: campaign.customFilters.userRole };
        }
        if (campaign.customFilters.registeredAfter) {
          userQuery.createdAt = { $gte: campaign.customFilters.registeredAfter };
        }
        if (campaign.customFilters.registeredBefore) {
          userQuery.createdAt = { ...userQuery.createdAt, $lte: campaign.customFilters.registeredBefore };
        }
        // Add more custom filters as needed
        break;
    }

    const users = await User.find(userQuery).select('email name');
    
    campaign.status = 'sending';
    campaign.stats.totalRecipients = users.length;
    await campaign.save();

    // Send emails in batches
    const batchSize = 50;
    let sent = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const emailPromises = batch.map(user => 
        sendEmail(user.email, campaign.subject, campaign.content)
      );
      
      const results = await Promise.allSettled(emailPromises);
      sent += results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    }

    // Update campaign stats
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.stats.sent = sent;
    campaign.stats.delivered = sent; // Simplified - in real app, track delivery status
    await campaign.save();

    res.json({
      success: true,
      message: `Kampanye berhasil dikirim ke ${sent} dari ${users.length} penerima`,
      stats: {
        totalRecipients: users.length,
        sent
      }
    });

  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim kampanye email'
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {
      total: await Notification.countDocuments({ userId: req.user._id }),
      unread: await Notification.countDocuments({ userId: req.user._id, isRead: false }),
      byType: await Notification.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      byPriority: await Notification.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik notifikasi'
    });
  }
});

// Export helper functions for use in other routes
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.sendEmail = sendEmail;