const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Product Model
const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['digital', 'physical', 'course', 'ebook', 'software', 'template', 'service']
  },
  subcategory: String,
  images: [{
    url: String,
    alt: String
  }],
  files: [{
    name: String,
    url: String,
    size: Number,
    type: String
  }],
  tags: [String],
  features: [String],
  requirements: [String],
  
  // Inventory
  stock: {
    type: Number,
    default: 0
  },
  isUnlimited: {
    type: Boolean,
    default: false
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'sold_out'],
    default: 'draft'
  },
  
  // SEO
  slug: {
    type: String,
    unique: true
  },
  metaTitle: String,
  metaDescription: String,
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  
  // Reviews
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  // Pricing options
  pricingTiers: [{
    name: String,
    price: Number,
    features: [String],
    isPopular: { type: Boolean, default: false }
  }],
  
  // Digital product settings
  downloadLimit: {
    type: Number,
    default: -1 // -1 = unlimited
  },
  expiryDays: {
    type: Number,
    default: -1 // -1 = no expiry
  }
}, {
  timestamps: true
});

// Order Model
const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Order details
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'ewallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Delivery (for digital products)
  downloadLinks: [{
    name: String,
    url: String,
    expiresAt: Date,
    downloadCount: { type: Number, default: 0 }
  }],
  
  // Shipping (for physical products)
  shippingAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  trackingNumber: String,
  
  // Timestamps
  paidAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  
  // Notes
  buyerNotes: String,
  sellerNotes: String
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// @route   POST /api/ecommerce/products
// @desc    Create new product
// @access  Private
router.post('/products', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      images,
      files,
      tags,
      features,
      requirements,
      stock,
      isUnlimited,
      pricingTiers,
      downloadLimit,
      expiryDays
    } = req.body;

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const product = new Product({
      sellerId: req.user._id,
      name,
      description,
      price,
      originalPrice,
      category,
      subcategory,
      images,
      files,
      tags,
      features,
      requirements,
      stock,
      isUnlimited,
      slug: `${slug}-${Date.now()}`,
      pricingTiers,
      downloadLimit,
      expiryDays
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Produk berhasil dibuat',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat produk'
    });
  }
});

// @route   GET /api/ecommerce/products
// @desc    Get products (with filters)
// @access  Public
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      sellerId
    } = req.query;

    // Build query
    let query = { status: 'active' };
    
    if (category) query.category = category;
    if (sellerId) query.sellerId = sellerId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Sort options
    let sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('sellerId', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil produk'
    });
  }
});

// @route   GET /api/ecommerce/products/:id
// @desc    Get single product
// @access  Public
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'name avatar email socialMedia');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil produk'
    });
  }
});

// @route   PUT /api/ecommerce/products/:id
// @desc    Update product
// @access  Private
router.put('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan atau Anda bukan pemiliknya'
      });
    }

    // Update fields
    const updateFields = [
      'name', 'description', 'price', 'originalPrice', 'category',
      'subcategory', 'images', 'files', 'tags', 'features', 'requirements',
      'stock', 'isUnlimited', 'status', 'pricingTiers', 'downloadLimit', 'expiryDays'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    res.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      product
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui produk'
    });
  }
});

// @route   DELETE /api/ecommerce/products/:id
// @desc    Delete product
// @access  Private
router.delete('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan atau Anda bukan pemiliknya'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Produk berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus produk'
    });
  }
});

// @route   POST /api/ecommerce/orders
// @desc    Create new order
// @access  Private
router.post('/orders', auth, async (req, res) => {
  try {
    const {
      productId,
      quantity,
      paymentMethod,
      shippingAddress,
      buyerNotes
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    // Check stock
    if (!product.isUnlimited && product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stok tidak mencukupi'
      });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const totalAmount = product.price * quantity;

    const order = new Order({
      buyerId: req.user._id,
      sellerId: product.sellerId,
      productId,
      orderNumber,
      quantity,
      unitPrice: product.price,
      totalAmount,
      paymentMethod,
      shippingAddress,
      buyerNotes
    });

    await order.save();

    // Update product stock
    if (!product.isUnlimited) {
      product.stock -= quantity;
      if (product.stock === 0) {
        product.status = 'sold_out';
      }
      await product.save();
    }

    res.status(201).json({
      success: true,
      message: 'Order berhasil dibuat',
      order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat order'
    });
  }
});

// @route   GET /api/ecommerce/orders
// @desc    Get user's orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type = 'buyer', status } = req.query;

    // Build query based on user type (buyer or seller)
    let query = {};
    if (type === 'buyer') {
      query.buyerId = req.user._id;
    } else if (type === 'seller') {
      query.sellerId = req.user._id;
    }
    
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('productId', 'name images category')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

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

// @route   GET /api/ecommerce/orders/:id
// @desc    Get single order
// @access  Private
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
    })
    .populate('productId')
    .populate('buyerId', 'name email phone')
    .populate('sellerId', 'name email phone');

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

// @route   PUT /api/ecommerce/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    const { status, trackingNumber, sellerNotes } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan atau Anda bukan penjualnya'
      });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (sellerNotes) order.sellerNotes = sellerNotes;
    
    // Set timestamps
    if (status === 'processing' && !order.paidAt) {
      order.paidAt = new Date();
    }
    if (status === 'completed' && !order.deliveredAt) {
      order.deliveredAt = new Date();
      
      // Update product sales and seller earnings
      const product = await Product.findById(order.productId);
      if (product) {
        product.sales += order.quantity;
        product.revenue += order.totalAmount;
        await product.save();
      }
      
      // Add earnings to seller
      const User = require('../models/User');
      const seller = await User.findById(order.sellerId);
      if (seller) {
        await seller.addEarnings(order.totalAmount * 0.9, 'available'); // 90% to seller, 10% platform fee
      }
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

// @route   GET /api/ecommerce/stats
// @desc    Get ecommerce statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { type = 'seller' } = req.query;
    
    if (type === 'seller') {
      // Seller statistics
      const products = await Product.find({ sellerId: req.user._id });
      const orders = await Order.find({ sellerId: req.user._id, status: 'completed' });
      
      const stats = {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'active').length,
        totalSales: orders.reduce((sum, order) => sum + order.quantity, 0),
        totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
        topProducts: products
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(p => ({
            id: p._id,
            name: p.name,
            sales: p.sales,
            revenue: p.revenue,
            views: p.views
          }))
      };
      
      res.json({
        success: true,
        stats
      });
    } else {
      // Buyer statistics
      const orders = await Order.find({ buyerId: req.user._id });
      
      const stats = {
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        totalSpent: orders.filter(o => o.status === 'completed').reduce((sum, order) => sum + order.totalAmount, 0),
        avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0
      };
      
      res.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    console.error('Get ecommerce stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik ecommerce'
    });
  }
});

module.exports = router;