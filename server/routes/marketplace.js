const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Service Model
const serviceSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 150
  },
  category: {
    type: String,
    required: true,
    enum: [
      'web_development', 'mobile_development', 'design', 'writing',
      'marketing', 'seo', 'social_media', 'video_editing', 'photography',
      'translation', 'data_entry', 'virtual_assistant', 'consulting',
      'tutoring', 'music', 'voice_over', 'animation', 'other'
    ]
  },
  subcategory: String,
  tags: [String],
  
  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'package'],
      required: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: 5
    },
    packages: [{
      name: String,
      description: String,
      price: Number,
      deliveryTime: Number, // in days
      revisions: Number,
      features: [String]
    }]
  },
  
  // Service details
  deliveryTime: {
    type: Number,
    required: true,
    min: 1 // minimum 1 day
  },
  revisions: {
    type: Number,
    default: 1
  },
  
  // Media
  images: [{
    url: String,
    alt: String
  }],
  video: {
    url: String,
    thumbnail: String
  },
  portfolio: [{
    title: String,
    description: String,
    image: String,
    url: String
  }],
  
  // Requirements
  requirements: [{
    question: String,
    type: String, // 'text', 'file', 'choice'
    required: Boolean,
    options: [String] // for choice type
  }],
  
  // SEO
  slug: {
    type: String,
    unique: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'inactive'],
    default: 'draft'
  },
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  orders: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  
  // Rating
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  // Features
  isFeatured: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Service Order Model
const serviceOrderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  
  // Order details
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  packageType: String, // 'basic', 'standard', 'premium' or custom
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Requirements responses
  requirements: [{
    question: String,
    answer: String,
    files: [String]
  }],
  
  // Timeline
  deliveryDate: {
    type: Date,
    required: true
  },
  revisionsRemaining: {
    type: Number,
    default: 1
  },
  
  // Status
  status: {
    type: String,
    enum: [
      'pending', 'in_progress', 'delivered', 'revision_requested',
      'completed', 'cancelled', 'disputed'
    ],
    default: 'pending'
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'released', 'refunded'],
    default: 'pending'
  },
  
  // Communication
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    files: [String],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Deliverables
  deliverables: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Review
  review: {
    rating: Number,
    comment: String,
    reviewedAt: Date
  },
  
  // Timestamps
  startedAt: Date,
  deliveredAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

const Service = mongoose.model('Service', serviceSchema);
const ServiceOrder = mongoose.model('ServiceOrder', serviceOrderSchema);

// @route   POST /api/marketplace/services
// @desc    Create new service
// @access  Private
router.post('/services', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      subcategory,
      tags,
      pricing,
      deliveryTime,
      revisions,
      images,
      video,
      portfolio,
      requirements
    } = req.body;

    // Generate slug
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const service = new Service({
      providerId: req.user._id,
      title,
      description,
      shortDescription,
      category,
      subcategory,
      tags,
      pricing,
      deliveryTime,
      revisions,
      images,
      video,
      portfolio,
      requirements,
      slug
    });

    await service.save();

    res.status(201).json({
      success: true,
      message: 'Service berhasil dibuat',
      service
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat service'
    });
  }
});

// @route   GET /api/marketplace/services
// @desc    Get services with filters
// @access  Public
router.get('/services', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const {
      category,
      search,
      minPrice,
      maxPrice,
      deliveryTime,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    // Build query
    let query = { status: 'active' };
    
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }
    
    if (deliveryTime) {
      query.deliveryTime = { $lte: parseInt(deliveryTime) };
    }
    
    if (rating) {
      query['rating.average'] = { $gte: parseFloat(rating) };
    }

    // Sort options
    let sort = {};
    if (sortBy === 'popular') {
      sort = { orders: -1, views: -1 };
    } else if (sortBy === 'rating') {
      sort = { 'rating.average': -1, 'rating.count': -1 };
    } else if (sortBy === 'price_low') {
      sort = { 'pricing.basePrice': 1 };
    } else if (sortBy === 'price_high') {
      sort = { 'pricing.basePrice': -1 };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const services = await Service.find(query)
      .populate('providerId', 'name avatar rating totalOrders')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Service.countDocuments(query);

    res.json({
      success: true,
      services,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil services'
    });
  }
});

// @route   GET /api/marketplace/services/:id
// @desc    Get single service
// @access  Public
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('providerId', 'name avatar email rating totalOrders memberSince');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service tidak ditemukan'
      });
    }

    // Increment views
    service.views += 1;
    await service.save();

    // Get recent reviews
    const recentOrders = await ServiceOrder.find({
      serviceId: service._id,
      status: 'completed',
      'review.rating': { $exists: true }
    })
    .populate('buyerId', 'name avatar')
    .sort({ completedAt: -1 })
    .limit(5)
    .select('review buyerId completedAt');

    res.json({
      success: true,
      service,
      recentReviews: recentOrders
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil service'
    });
  }
});

// @route   PUT /api/marketplace/services/:id
// @desc    Update service
// @access  Private (Provider only)
router.put('/services/:id', auth, async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      providerId: req.user._id
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service tidak ditemukan atau Anda bukan penyedianya'
      });
    }

    // Update fields
    const updateFields = [
      'title', 'description', 'shortDescription', 'category', 'subcategory',
      'tags', 'pricing', 'deliveryTime', 'revisions', 'images', 'video',
      'portfolio', 'requirements', 'status'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();

    res.json({
      success: true,
      message: 'Service berhasil diperbarui',
      service
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui service'
    });
  }
});

// @route   POST /api/marketplace/services/:id/order
// @desc    Create service order
// @access  Private
router.post('/services/:id/order', auth, async (req, res) => {
  try {
    const { packageType, requirements, customAmount } = req.body;
    
    const service = await Service.findById(req.params.id)
      .populate('providerId', 'name email');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service tidak ditemukan'
      });
    }

    if (service.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Service tidak tersedia'
      });
    }

    // Calculate total amount
    let totalAmount = service.pricing.basePrice;
    let deliveryDays = service.deliveryTime;
    let revisions = service.revisions;
    
    if (packageType && service.pricing.packages) {
      const selectedPackage = service.pricing.packages.find(p => p.name.toLowerCase() === packageType.toLowerCase());
      if (selectedPackage) {
        totalAmount = selectedPackage.price;
        deliveryDays = selectedPackage.deliveryTime;
        revisions = selectedPackage.revisions;
      }
    }
    
    if (customAmount) {
      totalAmount = customAmount;
    }

    // Generate order number
    const orderNumber = `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate delivery date
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    const order = new ServiceOrder({
      buyerId: req.user._id,
      providerId: service.providerId._id,
      serviceId: service._id,
      orderNumber,
      packageType,
      totalAmount,
      requirements,
      deliveryDate,
      revisionsRemaining: revisions
    });

    await order.save();

    // Update service stats
    service.orders += 1;
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Order berhasil dibuat',
      order
    });

  } catch (error) {
    console.error('Create service order error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat order'
    });
  }
});

// @route   GET /api/marketplace/orders
// @desc    Get user's orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type = 'buyer', status } = req.query;

    // Build query based on user type
    let query = {};
    if (type === 'buyer') {
      query.buyerId = req.user._id;
    } else if (type === 'provider') {
      query.providerId = req.user._id;
    }
    
    if (status) query.status = status;

    const orders = await ServiceOrder.find(query)
      .populate('serviceId', 'title images category')
      .populate('buyerId', 'name email avatar')
      .populate('providerId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ServiceOrder.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil orders'
    });
  }
});

// @route   GET /api/marketplace/orders/:id
// @desc    Get single order
// @access  Private
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await ServiceOrder.findOne({
      _id: req.params.id,
      $or: [{ buyerId: req.user._id }, { providerId: req.user._id }]
    })
    .populate('serviceId')
    .populate('buyerId', 'name email avatar')
    .populate('providerId', 'name email avatar');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil order'
    });
  }
});

// @route   PUT /api/marketplace/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    const { status, message, deliverables } = req.body;
    
    const order = await ServiceOrder.findOne({
      _id: req.params.id,
      $or: [{ buyerId: req.user._id }, { providerId: req.user._id }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan'
      });
    }

    // Validate status transitions
    const validTransitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['delivered', 'cancelled'],
      'delivered': ['revision_requested', 'completed'],
      'revision_requested': ['in_progress', 'delivered'],
      'completed': [],
      'cancelled': [],
      'disputed': ['in_progress', 'cancelled', 'completed']
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Transisi status tidak valid'
      });
    }

    order.status = status;
    
    // Set timestamps
    if (status === 'in_progress' && !order.startedAt) {
      order.startedAt = new Date();
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (deliverables) {
        order.deliverables = deliverables;
      }
    }
    if (status === 'completed') {
      order.completedAt = new Date();
      
      // Update service stats and provider earnings
      const service = await Service.findById(order.serviceId);
      if (service) {
        service.revenue += order.totalAmount;
        await service.save();
      }
      
      // Add earnings to provider
      const User = require('../models/User');
      const provider = await User.findById(order.providerId);
      if (provider) {
        const providerEarnings = order.totalAmount * 0.8; // 80% to provider, 20% platform fee
        await provider.addEarnings(providerEarnings, 'available');
      }
    }

    // Add message if provided
    if (message) {
      order.messages.push({
        senderId: req.user._id,
        message,
        timestamp: new Date()
      });
    }

    await order.save();

    res.json({
      success: true,
      message: 'Status order berhasil diperbarui',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui status order'
    });
  }
});

// @route   POST /api/marketplace/orders/:id/review
// @desc    Add review to completed order
// @access  Private (Buyer only)
router.post('/orders/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const order = await ServiceOrder.findOne({
      _id: req.params.id,
      buyerId: req.user._id,
      status: 'completed'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan atau belum selesai'
      });
    }

    if (order.review.rating) {
      return res.status(400).json({
        success: false,
        message: 'Order sudah direview'
      });
    }

    // Add review to order
    order.review = {
      rating,
      comment,
      reviewedAt: new Date()
    };
    await order.save();

    // Update service rating
    const service = await Service.findById(order.serviceId);
    if (service) {
      const totalRating = (service.rating.average * service.rating.count) + rating;
      service.rating.count += 1;
      service.rating.average = totalRating / service.rating.count;
      await service.save();
    }

    // Update provider rating
    const User = require('../models/User');
    const provider = await User.findById(order.providerId);
    if (provider) {
      const totalRating = (provider.rating.average * provider.rating.count) + rating;
      provider.rating.count += 1;
      provider.rating.average = totalRating / provider.rating.count;
      await provider.save();
    }

    res.json({
      success: true,
      message: 'Review berhasil ditambahkan',
      review: order.review
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan review'
    });
  }
});

// @route   GET /api/marketplace/categories
// @desc    Get service categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoryMap = {
      'web_development': 'Web Development',
      'mobile_development': 'Mobile Development',
      'design': 'Design & Creative',
      'writing': 'Writing & Translation',
      'marketing': 'Digital Marketing',
      'seo': 'SEO & SEM',
      'social_media': 'Social Media',
      'video_editing': 'Video & Animation',
      'photography': 'Photography',
      'translation': 'Translation',
      'data_entry': 'Data Entry',
      'virtual_assistant': 'Virtual Assistant',
      'consulting': 'Consulting',
      'tutoring': 'Tutoring & Education',
      'music': 'Music & Audio',
      'voice_over': 'Voice Over',
      'animation': 'Animation',
      'other': 'Other'
    };

    const formattedCategories = categories.map(cat => ({
      key: cat._id,
      name: categoryMap[cat._id] || cat._id,
      count: cat.count
    }));

    res.json({
      success: true,
      categories: formattedCategories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil kategori'
    });
  }
});

// @route   GET /api/marketplace/stats
// @desc    Get marketplace statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { type = 'provider' } = req.query;
    
    if (type === 'provider') {
      // Provider statistics
      const services = await Service.find({ providerId: req.user._id });
      const orders = await ServiceOrder.find({ providerId: req.user._id });
      const completedOrders = orders.filter(o => o.status === 'completed');
      
      const stats = {
        totalServices: services.length,
        activeServices: services.filter(s => s.status === 'active').length,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalRevenue: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        avgOrderValue: completedOrders.length > 0 ? completedOrders.reduce((sum, order) => sum + order.totalAmount, 0) / completedOrders.length : 0,
        totalViews: services.reduce((sum, service) => sum + service.views, 0),
        avgRating: services.length > 0 ? services.reduce((sum, service) => sum + service.rating.average, 0) / services.length : 0
      };
      
      res.json({
        success: true,
        stats
      });
    } else {
      // Buyer statistics
      const orders = await ServiceOrder.find({ buyerId: req.user._id });
      const completedOrders = orders.filter(o => o.status === 'completed');
      
      const stats = {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalSpent: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        avgOrderValue: completedOrders.length > 0 ? completedOrders.reduce((sum, order) => sum + order.totalAmount, 0) / completedOrders.length : 0
      };
      
      res.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    console.error('Get marketplace stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik marketplace'
    });
  }
});

module.exports = router;