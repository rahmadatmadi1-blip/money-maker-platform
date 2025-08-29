import io from 'socket.io-client';
import { toast } from 'react-toastify';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server via Socket.io');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Show connection success toast
      toast.success('Terhubung ke server real-time', {
        position: 'bottom-right',
        autoClose: 3000
      });
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Socket connection confirmed:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      this.isConnected = false;
      this.handleReconnection();
    });

    // Real-time notifications
    this.socket.on('new_notification', (data) => {
      this.handleNewNotification(data);
    });

    this.socket.on('earnings_updated', (data) => {
      this.handleEarningsUpdate(data);
    });

    this.socket.on('new_order', (data) => {
      this.handleNewOrder(data);
    });

    this.socket.on('order_status_updated', (data) => {
      this.handleOrderStatusUpdate(data);
    });

    this.socket.on('payment_received', (data) => {
      this.handlePaymentReceived(data);
    });

    this.socket.on('withdrawal_processed', (data) => {
      this.handleWithdrawalProcessed(data);
    });

    this.socket.on('affiliate_commission', (data) => {
      this.handleAffiliateCommission(data);
    });

    this.socket.on('content_purchased', (data) => {
      this.handleContentPurchased(data);
    });

    this.socket.on('service_ordered', (data) => {
      this.handleServiceOrdered(data);
    });

    this.socket.on('review_received', (data) => {
      this.handleReviewReceived(data);
    });

    this.socket.on('system_announcement', (data) => {
      this.handleSystemAnnouncement(data);
    });

    // Real-time analytics
    this.socket.on('analytics_updated', (data) => {
      this.handleAnalyticsUpdate(data);
    });

    this.socket.on('link_visitors_updated', (data) => {
      this.handleLinkVisitorsUpdate(data);
    });

    // Chat and messaging
    this.socket.on('new_message', (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on('typing_start', (data) => {
      this.handleTypingStart(data);
    });

    this.socket.on('typing_stop', (data) => {
      this.handleTypingStop(data);
    });

    this.socket.on('user_status_changed', (data) => {
      this.handleUserStatusChanged(data);
    });
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      toast.error('Koneksi terputus. Silakan refresh halaman.', {
        position: 'top-center',
        autoClose: false
      });
    }
  }

  // Notification handlers
  handleNewNotification(data) {
    console.log('📢 New notification:', data);
    
    // Show toast notification
    const toastOptions = {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true
    };

    switch (data.priority) {
      case 'urgent':
        toast.error(data.message, toastOptions);
        break;
      case 'high':
        toast.warning(data.message, toastOptions);
        break;
      default:
        toast.info(data.message, toastOptions);
    }

    // Trigger custom listeners
    this.emit('notification', data);
    
    // Play notification sound
    this.playNotificationSound(data.priority);
    
    // Update notification badge
    this.updateNotificationBadge();
  }

  handleEarningsUpdate(data) {
    console.log('💰 Earnings updated:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 4000
    });
    
    this.emit('earnings_updated', data);
  }

  handleNewOrder(data) {
    console.log('🛒 New order:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 6000
    });
    
    this.emit('new_order', data);
    this.playNotificationSound('high');
  }

  handleOrderStatusUpdate(data) {
    console.log('📦 Order status updated:', data);
    
    toast.info(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('order_status_updated', data);
  }

  handlePaymentReceived(data) {
    console.log('💳 Payment received:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('payment_received', data);
    this.playNotificationSound('high');
  }

  handleWithdrawalProcessed(data) {
    console.log('🏦 Withdrawal processed:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('withdrawal_processed', data);
  }

  handleAffiliateCommission(data) {
    console.log('🤝 Affiliate commission:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('affiliate_commission', data);
    this.playNotificationSound('medium');
  }

  handleContentPurchased(data) {
    console.log('📚 Content purchased:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('content_purchased', data);
  }

  handleServiceOrdered(data) {
    console.log('🛠️ Service ordered:', data);
    
    toast.success(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('service_ordered', data);
  }

  handleReviewReceived(data) {
    console.log('⭐ Review received:', data);
    
    toast.info(data.message, {
      position: 'top-right',
      autoClose: 5000
    });
    
    this.emit('review_received', data);
  }

  handleSystemAnnouncement(data) {
    console.log('📢 System announcement:', data);
    
    const toastType = data.type === 'urgent' ? 'error' : data.type === 'warning' ? 'warning' : 'info';
    
    toast[toastType](data.message, {
      position: 'top-center',
      autoClose: data.type === 'urgent' ? false : 8000
    });
    
    this.emit('system_announcement', data);
  }

  handleAnalyticsUpdate(data) {
    console.log('📊 Analytics updated:', data);
    this.emit('analytics_updated', data);
  }

  handleLinkVisitorsUpdate(data) {
    console.log('👥 Link visitors updated:', data);
    this.emit('link_visitors_updated', data);
  }

  handleNewMessage(data) {
    console.log('💬 New message:', data);
    
    toast.info(`Pesan baru dari ${data.senderName}`, {
      position: 'bottom-right',
      autoClose: 4000
    });
    
    this.emit('new_message', data);
    this.playNotificationSound('low');
  }

  handleTypingStart(data) {
    this.emit('typing_start', data);
  }

  handleTypingStop(data) {
    this.emit('typing_stop', data);
  }

  handleUserStatusChanged(data) {
    this.emit('user_status_changed', data);
  }

  // Utility methods
  playNotificationSound(priority = 'medium') {
    try {
      const audio = new Audio();
      
      switch (priority) {
        case 'urgent':
        case 'high':
          audio.src = '/sounds/notification-high.mp3';
          break;
        case 'medium':
          audio.src = '/sounds/notification-medium.mp3';
          break;
        default:
          audio.src = '/sounds/notification-low.mp3';
      }
      
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    } catch (error) {
      console.log('Notification sound not available:', error);
    }
  }

  updateNotificationBadge() {
    // Update notification badge in UI
    this.emit('update_notification_badge');
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event listener:', error);
        }
      });
    }
  }

  // Socket.io methods
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot send:', event, data);
    }
  }

  // Specific methods for sending data
  updateStatus(status) {
    this.send('update_status', { status });
  }

  startTyping(conversationId, recipientId) {
    this.send('typing_start', { conversationId, recipientId });
  }

  stopTyping(conversationId, recipientId) {
    this.send('typing_stop', { conversationId, recipientId });
  }

  sendMessage(recipientId, message, conversationId, type = 'text') {
    this.send('send_message', {
      recipientId,
      message,
      conversationId,
      type
    });
  }

  subscribeToOrderUpdates(orderId) {
    this.send('subscribe_order_updates', orderId);
  }

  unsubscribeFromOrderUpdates(orderId) {
    this.send('unsubscribe_order_updates', orderId);
  }

  trackLinkView(linkId, action) {
    this.send('track_link_view', { linkId, action });
  }

  // Connection management
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;