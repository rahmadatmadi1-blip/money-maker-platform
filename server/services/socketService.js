const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('🔌 Socket.IO service initialized');
    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    console.log(`👤 User ${userId} connected via socket ${socket.id}`);
    
    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    // Join user to their personal room
    socket.join(`user_${userId}`);
    
    // Join user to role-based rooms
    if (socket.user.role === 'admin') {
      socket.join('admin_room');
    }
    if (socket.user.isPremium) {
      socket.join('premium_users');
    }

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to real-time notifications',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // Handle user status update
    socket.on('update_status', (data) => {
      this.handleStatusUpdate(socket, data);
    });

    // Handle typing indicators for messages
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Handle real-time chat messages
    socket.on('send_message', (data) => {
      this.handleMessage(socket, data);
    });

    // Handle order updates subscription
    socket.on('subscribe_order_updates', (orderId) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('unsubscribe_order_updates', (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    // Handle affiliate link tracking
    socket.on('track_link_view', (data) => {
      this.handleLinkTracking(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      console.log(`👤 User ${userId} disconnected from socket ${socket.id}`);
      
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
    }
  }

  handleStatusUpdate(socket, data) {
    const { status } = data;
    
    // Broadcast status update to relevant users
    socket.broadcast.emit('user_status_changed', {
      userId: socket.userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  handleTypingStart(socket, data) {
    const { conversationId, recipientId } = data;
    
    if (recipientId) {
      this.sendToUser(recipientId, 'typing_start', {
        userId: socket.userId,
        conversationId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleTypingStop(socket, data) {
    const { conversationId, recipientId } = data;
    
    if (recipientId) {
      this.sendToUser(recipientId, 'typing_stop', {
        userId: socket.userId,
        conversationId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleMessage(socket, data) {
    const { recipientId, message, conversationId, type = 'text' } = data;
    
    // Send message to recipient
    this.sendToUser(recipientId, 'new_message', {
      senderId: socket.userId,
      senderName: socket.user.name,
      message,
      conversationId,
      type,
      timestamp: new Date().toISOString()
    });
  }

  handleLinkTracking(socket, data) {
    const { linkId, action } = data;
    
    // Emit to link owner for real-time analytics
    this.io.emit('link_activity', {
      linkId,
      action,
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  }

  // Public methods for sending notifications
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    
    if (socketId) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    
    return false;
  }

  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Notification methods
  notifyEarningsUpdate(userId, earningsData) {
    this.sendToUser(userId, 'earnings_updated', {
      type: 'earnings',
      data: earningsData,
      message: `Penghasilan Anda telah diperbarui: +Rp ${earningsData.amount.toLocaleString('id-ID')}`
    });
  }

  notifyNewOrder(sellerId, orderData) {
    this.sendToUser(sellerId, 'new_order', {
      type: 'order',
      data: orderData,
      message: `Pesanan baru diterima: ${orderData.productName}`,
      actionUrl: `/orders/${orderData.orderId}`
    });
  }

  notifyOrderStatusUpdate(buyerId, orderData) {
    this.sendToUser(buyerId, 'order_status_updated', {
      type: 'order_update',
      data: orderData,
      message: `Status pesanan diperbarui: ${orderData.status}`,
      actionUrl: `/orders/${orderData.orderId}`
    });
  }

  notifyPaymentReceived(userId, paymentData) {
    this.sendToUser(userId, 'payment_received', {
      type: 'payment',
      data: paymentData,
      message: `Pembayaran diterima: Rp ${paymentData.amount.toLocaleString('id-ID')}`,
      actionUrl: '/payments'
    });
  }

  notifyWithdrawalProcessed(userId, withdrawalData) {
    this.sendToUser(userId, 'withdrawal_processed', {
      type: 'withdrawal',
      data: withdrawalData,
      message: `Penarikan diproses: Rp ${withdrawalData.amount.toLocaleString('id-ID')}`,
      actionUrl: '/withdrawals'
    });
  }

  notifyAffiliateCommission(userId, commissionData) {
    this.sendToUser(userId, 'affiliate_commission', {
      type: 'commission',
      data: commissionData,
      message: `Komisi affiliate: +Rp ${commissionData.amount.toLocaleString('id-ID')}`,
      actionUrl: '/affiliate/stats'
    });
  }

  notifyContentPurchased(authorId, purchaseData) {
    this.sendToUser(authorId, 'content_purchased', {
      type: 'content_sale',
      data: purchaseData,
      message: `Konten Anda dibeli: ${purchaseData.contentTitle}`,
      actionUrl: `/content/${purchaseData.contentId}`
    });
  }

  notifyServiceOrdered(providerId, serviceOrderData) {
    this.sendToUser(providerId, 'service_ordered', {
      type: 'service_order',
      data: serviceOrderData,
      message: `Layanan baru dipesan: ${serviceOrderData.serviceTitle}`,
      actionUrl: `/marketplace/orders/${serviceOrderData.orderId}`
    });
  }

  notifyReviewReceived(userId, reviewData) {
    this.sendToUser(userId, 'review_received', {
      type: 'review',
      data: reviewData,
      message: `Review baru: ${reviewData.rating} bintang`,
      actionUrl: reviewData.itemUrl
    });
  }

  // Admin notifications
  notifyAdmins(event, data) {
    this.sendToRoom('admin_room', event, data);
  }

  // Premium user notifications
  notifyPremiumUsers(event, data) {
    this.sendToRoom('premium_users', event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // System announcements
  systemAnnouncement(message, type = 'info') {
    this.broadcast('system_announcement', {
      type,
      message,
      priority: type === 'urgent' ? 'high' : 'medium'
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get user connection status
  isUserConnected(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Real-time analytics updates
  updateAnalytics(userId, analyticsData) {
    this.sendToUser(userId, 'analytics_updated', {
      type: 'analytics',
      data: analyticsData
    });
  }

  // Live visitor count for affiliate links
  updateLinkVisitors(linkId, visitorCount) {
    this.io.emit('link_visitors_updated', {
      linkId,
      visitorCount,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time order tracking
  updateOrderTracking(orderId, trackingData) {
    this.sendToRoom(`order_${orderId}`, 'order_tracking_updated', {
      orderId,
      tracking: trackingData
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;