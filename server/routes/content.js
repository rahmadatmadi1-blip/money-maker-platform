const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Content Model
const contentSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  type: {
    type: String,
    enum: ['article', 'video', 'podcast', 'course', 'ebook', 'template'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  tags: [String],
  
  // Media files
  featuredImage: {
    url: String,
    alt: String
  },
  media: [{
    type: String, // 'image', 'video', 'audio', 'document'
    url: String,
    name: String,
    size: Number,
    duration: Number // for video/audio
  }],
  
  // Monetization
  monetization: {
    type: {
      type: String,
      enum: ['free', 'premium', 'paid', 'subscription'],
      default: 'free'
    },
    price: {
      type: Number,
      default: 0
    },
    subscriptionTier: {
      type: String,
      enum: ['basic', 'premium', 'pro']
    }
  },
  
  // SEO
  slug: {
    type: String,
    unique: true
  },
  metaTitle: String,
  metaDescription: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'pending_review'],
    default: 'draft'
  },
  publishedAt: Date,
  
  // Engagement
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  
  // Revenue tracking
  revenue: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  },
  
  // Content settings
  allowComments: {
    type: Boolean,
    default: true
  },
  isFeature: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  analytics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    avgTimeSpent: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Comment Model
const commentSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isReported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Content Purchase Model
const contentPurchaseSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'credits'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  },
  accessExpiresAt: Date
}, {
  timestamps: true
});

const Content = mongoose.model('Content', contentSchema);
const Comment = mongoose.model('Comment', commentSchema);
const ContentPurchase = mongoose.model('ContentPurchase', contentPurchaseSchema);

// @route   POST /api/content
// @desc    Create new content
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      type,
      category,
      subcategory,
      tags,
      featuredImage,
      media,
      monetization,
      metaTitle,
      metaDescription,
      allowComments
    } = req.body;

    // Generate slug
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const newContent = new Content({
      authorId: req.user._id,
      title,
      content,
      excerpt,
      type,
      category,
      subcategory,
      tags,
      featuredImage,
      media,
      monetization,
      slug,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      allowComments
    });

    await newContent.save();

    res.status(201).json({
      success: true,
      message: 'Konten berhasil dibuat',
      content: newContent
    });

  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat konten'
    });
  }
});

// @route   GET /api/content
// @desc    Get contents with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const {
      type,
      category,
      search,
      authorId,
      monetization,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    // Build query
    let query = { status: 'published' };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (authorId) query.authorId = authorId;
    if (monetization) query['monetization.type'] = monetization;
    if (featured === 'true') query.isFeature = true;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort options
    let sort = {};
    if (sortBy === 'popular') {
      sort = { views: -1, likes: -1 };
    } else if (sortBy === 'revenue') {
      sort = { revenue: -1 };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const contents = await Content.find(query)
      .populate('authorId', 'name avatar socialMedia')
      .select('-content') // Exclude full content for list view
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Content.countDocuments(query);

    res.json({
      success: true,
      contents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get contents error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil konten'
    });
  }
});

// @route   GET /api/content/:id
// @desc    Get single content
// @access  Public/Private (based on monetization)
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('authorId', 'name avatar email socialMedia');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan'
      });
    }

    // Check access for paid content
    if (content.monetization.type === 'paid' || content.monetization.type === 'premium') {
      // Check if user has purchased or is the author
      const token = req.header('Authorization')?.replace('Bearer ', '');
      let hasAccess = false;
      
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.user.id;
          
          // Check if user is the author
          if (content.authorId._id.toString() === userId) {
            hasAccess = true;
          } else {
            // Check if user has purchased
            const purchase = await ContentPurchase.findOne({
              buyerId: userId,
              contentId: content._id,
              status: 'completed'
            });
            
            if (purchase) {
              // Check if access hasn't expired
              if (!purchase.accessExpiresAt || purchase.accessExpiresAt > new Date()) {
                hasAccess = true;
              }
            }
          }
        } catch (err) {
          // Invalid token, continue without access
        }
      }
      
      if (!hasAccess) {
        // Return limited content
        const limitedContent = {
          ...content.toObject(),
          content: content.excerpt || content.content.substring(0, 300) + '...',
          isPurchaseRequired: true
        };
        
        return res.json({
          success: true,
          content: limitedContent
        });
      }
    }

    // Increment views
    content.views += 1;
    content.analytics.impressions += 1;
    await content.save();

    res.json({
      success: true,
      content
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil konten'
    });
  }
});

// @route   PUT /api/content/:id
// @desc    Update content
// @access  Private (Author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const content = await Content.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan atau Anda bukan penulisnya'
      });
    }

    // Update fields
    const updateFields = [
      'title', 'content', 'excerpt', 'type', 'category', 'subcategory',
      'tags', 'featuredImage', 'media', 'monetization', 'metaTitle',
      'metaDescription', 'status', 'allowComments', 'isFeature'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        content[field] = req.body[field];
      }
    });

    // Update published date if status changes to published
    if (req.body.status === 'published' && content.status !== 'published') {
      content.publishedAt = new Date();
    }

    await content.save();

    res.json({
      success: true,
      message: 'Konten berhasil diperbarui',
      content
    });

  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui konten'
    });
  }
});

// @route   DELETE /api/content/:id
// @desc    Delete content
// @access  Private (Author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const content = await Content.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan atau Anda bukan penulisnya'
      });
    }

    await Content.findByIdAndDelete(req.params.id);
    
    // Delete related comments
    await Comment.deleteMany({ contentId: req.params.id });

    res.json({
      success: true,
      message: 'Konten berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus konten'
    });
  }
});

// @route   POST /api/content/:id/purchase
// @desc    Purchase paid content
// @access  Private
router.post('/:id/purchase', auth, async (req, res) => {
  try {
    const { paymentMethod = 'stripe' } = req.body;
    
    const content = await Content.findById(req.params.id)
      .populate('authorId', 'name');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan'
      });
    }

    // Check if content is purchasable
    if (content.monetization.type !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Konten ini tidak dapat dibeli'
      });
    }

    // Check if user already purchased
    const existingPurchase = await ContentPurchase.findOne({
      buyerId: req.user._id,
      contentId: content._id,
      status: 'completed'
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah membeli konten ini'
      });
    }

    // Create purchase record
    const purchase = new ContentPurchase({
      buyerId: req.user._id,
      contentId: content._id,
      authorId: content.authorId._id,
      amount: content.monetization.price,
      paymentMethod,
      status: 'completed' // Simplified for demo
    });

    await purchase.save();

    // Update content stats
    content.purchases += 1;
    content.revenue += content.monetization.price;
    await content.save();

    // Add earnings to author
    const User = require('../models/User');
    const author = await User.findById(content.authorId._id);
    if (author) {
      const authorEarnings = content.monetization.price * 0.8; // 80% to author, 20% platform fee
      await author.addEarnings(authorEarnings, 'available');
    }

    res.status(201).json({
      success: true,
      message: 'Konten berhasil dibeli',
      purchase
    });

  } catch (error) {
    console.error('Purchase content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membeli konten'
    });
  }
});

// @route   POST /api/content/:id/like
// @desc    Like/unlike content
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan'
      });
    }

    // Simple like increment (in real app, you'd track individual likes)
    content.likes += 1;
    content.analytics.clicks += 1;
    await content.save();

    res.json({
      success: true,
      message: 'Konten berhasil dilike',
      likes: content.likes
    });

  } catch (error) {
    console.error('Like content error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat like konten'
    });
  }
});

// @route   GET /api/content/:id/comments
// @desc    Get content comments
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      contentId: req.params.id,
      isApproved: true,
      parentId: null // Only top-level comments
    })
    .populate('authorId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Get replies for each comment
    for (let comment of comments) {
      const replies = await Comment.find({
        parentId: comment._id,
        isApproved: true
      })
      .populate('authorId', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(5); // Limit replies
      
      comment.replies = replies;
    }

    const total = await Comment.countDocuments({
      contentId: req.params.id,
      isApproved: true,
      parentId: null
    });

    res.json({
      success: true,
      comments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil komentar'
    });
  }
});

// @route   POST /api/content/:id/comments
// @desc    Add comment to content
// @access  Private
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content: commentContent, parentId } = req.body;
    
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Konten tidak ditemukan'
      });
    }

    if (!content.allowComments) {
      return res.status(400).json({
        success: false,
        message: 'Komentar tidak diizinkan untuk konten ini'
      });
    }

    const comment = new Comment({
      contentId: req.params.id,
      authorId: req.user._id,
      parentId,
      content: commentContent
    });

    await comment.save();
    
    // Update content comment count
    content.comments += 1;
    await content.save();

    await comment.populate('authorId', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan',
      comment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan komentar'
    });
  }
});

// @route   GET /api/content/my/contents
// @desc    Get user's contents
// @access  Private
router.get('/my/contents', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, type } = req.query;

    let query = { authorId: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    const contents = await Content.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Content.countDocuments(query);

    // Get stats
    const stats = {
      total: await Content.countDocuments({ authorId: req.user._id }),
      published: await Content.countDocuments({ authorId: req.user._id, status: 'published' }),
      draft: await Content.countDocuments({ authorId: req.user._id, status: 'draft' }),
      totalViews: await Content.aggregate([
        { $match: { authorId: req.user._id } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]).then(result => result[0]?.total || 0),
      totalRevenue: await Content.aggregate([
        { $match: { authorId: req.user._id } },
        { $group: { _id: null, total: { $sum: '$revenue' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      success: true,
      contents,
      stats,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get my contents error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil konten Anda'
    });
  }
});

module.exports = router;