import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: false,
  connectionStatus: 'disconnected', // disconnected, connecting, connected, reconnecting, error
  socketId: null,
  reconnectAttempts: 0,
  notifications: [],
  unreadCount: 0,
  earnings: {
    total: 0,
    today: 0,
    thisMonth: 0,
    pending: 0
  },
  orders: {
    list: [],
    stats: {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0
    }
  },
  analytics: {
    visitors: 0,
    pageViews: 0,
    conversions: 0,
    revenue: 0
  },
  linkVisitors: {},
  onlineUsers: [],
  typingUsers: [],
  messages: []
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // Connection management
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload.status;
      state.isConnected = action.payload.status === 'connected';
      if (action.payload.socketId) {
        state.socketId = action.payload.socketId;
      }
      if (action.payload.reconnectAttempts !== undefined) {
        state.reconnectAttempts = action.payload.reconnectAttempts;
      }
    },
    
    resetConnection: (state) => {
      state.isConnected = false;
      state.connectionStatus = 'disconnected';
      state.socketId = null;
      state.reconnectAttempts = 0;
    },

    // Notifications
    addNotification: (state, action) => {
      const notification = {
        ...action.payload,
        id: action.payload.id || Date.now().toString(),
        createdAt: action.payload.createdAt || new Date().toISOString(),
        read: false
      };
      
      state.notifications.unshift(notification);
      
      // Keep only last 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
      
      state.unreadCount += 1;
    },
    
    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    
    updateNotificationBadge: (state) => {
      state.unreadCount += 1;
    },

    // Earnings
    updateEarnings: (state, action) => {
      state.earnings = {
        ...state.earnings,
        ...action.payload
      };
    },

    // Orders
    addNewOrder: (state, action) => {
      const order = action.payload;
      state.orders.list.unshift(order);
      
      // Update stats
      state.orders.stats.total += 1;
      state.orders.stats.pending += 1;
      
      // Keep only last 50 orders in memory
      if (state.orders.list.length > 50) {
        state.orders.list = state.orders.list.slice(0, 50);
      }
    },
    
    updateOrderStatus: (state, action) => {
      const { orderId, newStatus, oldStatus } = action.payload;
      
      // Update order in list
      const order = state.orders.list.find(o => o._id === orderId);
      if (order) {
        order.status = newStatus;
      }
      
      // Update stats
      if (oldStatus && state.orders.stats[oldStatus] > 0) {
        state.orders.stats[oldStatus] -= 1;
      }
      
      if (newStatus) {
        state.orders.stats[newStatus] = (state.orders.stats[newStatus] || 0) + 1;
      }
    },
    
    setOrderStats: (state, action) => {
      state.orders.stats = {
        ...state.orders.stats,
        ...action.payload
      };
    },

    // Analytics
    updateAnalytics: (state, action) => {
      state.analytics = {
        ...state.analytics,
        ...action.payload
      };
    },
    
    updateLinkVisitors: (state, action) => {
      const { linkId, visitors } = action.payload;
      state.linkVisitors[linkId] = visitors;
    },

    // Chat and messaging
    addMessage: (state, action) => {
      const message = action.payload;
      state.messages.push(message);
      
      // Keep only last 100 messages in memory
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(-100);
      }
    },
    
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    
    addTypingUser: (state, action) => {
      const userId = action.payload;
      if (!state.typingUsers.includes(userId)) {
        state.typingUsers.push(userId);
      }
    },
    
    removeTypingUser: (state, action) => {
      const userId = action.payload;
      state.typingUsers = state.typingUsers.filter(id => id !== userId);
    },
    
    addOnlineUser: (state, action) => {
      const userId = action.payload;
      if (!state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      }
    },
    
    removeOnlineUser: (state, action) => {
      const userId = action.payload;
      state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    },
    
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },

    // Reset all socket data
    resetSocketData: (state) => {
      return {
        ...initialState,
        notifications: state.notifications, // Keep notifications
        unreadCount: state.unreadCount
      };
    }
  }
});

export const {
  setConnectionStatus,
  resetConnection,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications,
  updateNotificationBadge,
  updateEarnings,
  addNewOrder,
  updateOrderStatus,
  setOrderStats,
  updateAnalytics,
  updateLinkVisitors,
  addMessage,
  setMessages,
  addTypingUser,
  removeTypingUser,
  addOnlineUser,
  removeOnlineUser,
  setOnlineUsers,
  resetSocketData
} = socketSlice.actions;

// Selectors
export const selectSocket = (state) => state.socket;
export const selectConnectionStatus = (state) => state.socket.connectionStatus;
export const selectIsConnected = (state) => state.socket.isConnected;
export const selectNotifications = (state) => state.socket.notifications;
export const selectUnreadCount = (state) => state.socket.unreadCount;
export const selectEarnings = (state) => state.socket.earnings;
export const selectOrders = (state) => state.socket.orders;
export const selectOrderStats = (state) => state.socket.orders.stats;
export const selectAnalytics = (state) => state.socket.analytics;
export const selectLinkVisitors = (state) => state.socket.linkVisitors;
export const selectMessages = (state) => state.socket.messages;
export const selectTypingUsers = (state) => state.socket.typingUsers;
export const selectOnlineUsers = (state) => state.socket.onlineUsers;

export default socketSlice.reducer;