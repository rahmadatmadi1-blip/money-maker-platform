import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import socketService from '../services/socketService';
import {
  selectSocket,
  setConnectionStatus,
  resetConnection,
  addNotification,
  updateEarnings,
  addOrder,
  updateOrderStatus,
  updateAnalytics,
  updateLinkVisitors,
  addMessage,
  addTypingUser,
  removeTypingUser,
  updateUserStatus,
  selectNotifications,
  selectUnreadCount,
  selectEarnings,
  selectRecentEarnings,
  selectOrders,
  selectOrderStats,
  selectAnalytics,
  selectLinkVisitors,
  selectMessages,
  selectOnlineUsers,
  selectTypingUsers,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications
} from '../store/socketSlice';

export const useSocket = () => {
  const { user, token } = useSelector(state => state.auth);
  const { isConnected, connectionStatus } = useSelector(selectSocket);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  // Initialize socket connection
  useEffect(() => {
    if (user && token) {
      console.log('🔌 Initializing socket connection...');
      
      try {
        socketRef.current = socketService.connect(token);
        
        // Listen for connection status changes
        const handleConnect = () => {
          dispatch(setConnectionStatus({ 
            status: 'connected', 
            socketId: socketRef.current?.id 
          }));
        };
        
        const handleDisconnect = () => {
          dispatch(setConnectionStatus({ status: 'disconnected' }));
        };
        
        const handleConnecting = () => {
          dispatch(setConnectionStatus({ status: 'connecting' }));
        };
        
        const handleReconnecting = () => {
          dispatch(setConnectionStatus({ status: 'reconnecting' }));
        };
        
        // Socket event handlers for real-time updates
        const handleNotification = (data) => {
          dispatch(addNotification(data));
        };
        
        const handleEarningsUpdate = (data) => {
          dispatch(updateEarnings(data.earnings));
        };
        
        const handleNewOrder = (data) => {
          dispatch(addNewOrder(data.order));
        };
        
        const handleOrderStatusUpdate = (data) => {
          dispatch(updateOrderStatus(data));
        };
        
        const handleAnalyticsUpdate = (data) => {
          dispatch(updateAnalytics(data));
        };
        
        const handleLinkVisitorsUpdate = (data) => {
          dispatch(updateLinkVisitors(data));
        };
        
        const handleNewMessage = (data) => {
          dispatch(addMessage(data));
        };
        
        const handleTypingStart = (data) => {
          dispatch(addTypingUser(data.userId));
        };
        
        const handleTypingStop = (data) => {
          dispatch(removeTypingUser(data.userId));
        };
        
        const handleUserStatusChanged = (data) => {
          if (data.status === 'online') {
            dispatch(addOnlineUser(data.userId));
          } else {
            dispatch(removeOnlineUser(data.userId));
          }
        };
        
        // Add socket event listeners
        socketService.on('connect', handleConnect);
        socketService.on('disconnect', handleDisconnect);
        socketService.on('connecting', handleConnecting);
        socketService.on('reconnecting', handleReconnecting);
        
        // Real-time event listeners
        socketService.on('notification', handleNotification);
        socketService.on('earnings_updated', handleEarningsUpdate);
        socketService.on('new_order', handleNewOrder);
        socketService.on('order_status_updated', handleOrderStatusUpdate);
        socketService.on('analytics_updated', handleAnalyticsUpdate);
        socketService.on('link_visitors_updated', handleLinkVisitorsUpdate);
        socketService.on('new_message', handleNewMessage);
        socketService.on('typing_start', handleTypingStart);
        socketService.on('typing_stop', handleTypingStop);
        socketService.on('user_status_changed', handleUserStatusChanged);
        
        // Store listeners for cleanup
        const listeners = {
          connect: handleConnect,
          disconnect: handleDisconnect,
          connecting: handleConnecting,
          reconnecting: handleReconnecting,
          notification: handleNotification,
          earnings_updated: handleEarningsUpdate,
          new_order: handleNewOrder,
          order_status_updated: handleOrderStatusUpdate,
          analytics_updated: handleAnalyticsUpdate,
          link_visitors_updated: handleLinkVisitorsUpdate,
          new_message: handleNewMessage,
          typing_start: handleTypingStart,
          typing_stop: handleTypingStop,
          user_status_changed: handleUserStatusChanged
        };
        
        Object.entries(listeners).forEach(([event, handler]) => {
          listenersRef.current.set(event, handler);
        });
        
      } catch (error) {
        console.error('❌ Failed to initialize socket:', error);
        dispatch(setConnectionStatus({ status: 'error' }));
      }
    }
    
    return () => {
      // Cleanup listeners
      listenersRef.current.forEach((listener, event) => {
        socketService.off(event, listener);
      });
      listenersRef.current.clear();
    };
  }, [user, token, dispatch]);

  // Cleanup on unmount or user logout
  useEffect(() => {
    return () => {
      if (!user || !token) {
        console.log('🔌 Disconnecting socket...');
        socketService.disconnect();
        dispatch(resetConnection());
      }
    };
  }, [user, token, dispatch]);

  // Socket event subscription helper
  const subscribe = useCallback((event, callback) => {
    if (socketService) {
      socketService.on(event, callback);
      
      // Return unsubscribe function
      return () => {
        socketService.off(event, callback);
      };
    }
    return () => {};
  }, []);

  // Socket event emission helper
  const emit = useCallback((event, data) => {
    if (socketService && isConnected) {
      socketService.send(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit:', event);
    }
  }, [isConnected]);

  // Specific socket methods
  const updateStatus = useCallback((status) => {
    socketService.updateStatus(status);
  }, []);

  const sendMessage = useCallback((recipientId, message, conversationId, type = 'text') => {
    socketService.sendMessage(recipientId, message, conversationId, type);
  }, []);

  const startTyping = useCallback((conversationId, recipientId) => {
    socketService.startTyping(conversationId, recipientId);
  }, []);

  const stopTyping = useCallback((conversationId, recipientId) => {
    socketService.stopTyping(conversationId, recipientId);
  }, []);

  const subscribeToOrderUpdates = useCallback((orderId) => {
    socketService.subscribeToOrderUpdates(orderId);
  }, []);

  const unsubscribeFromOrderUpdates = useCallback((orderId) => {
    socketService.unsubscribeFromOrderUpdates(orderId);
  }, []);

  const trackLinkView = useCallback((linkId, action) => {
    socketService.trackLinkView(linkId, action);
  }, []);

  return {
    isConnected,
    connectionStatus,
    socket: socketRef.current,
    subscribe,
    emit,
    updateStatus,
    sendMessage,
    startTyping,
    stopTyping,
    subscribeToOrderUpdates,
    unsubscribeFromOrderUpdates,
    trackLinkView
  };
};

// Hook for real-time notifications
export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);

  const markAsRead = useCallback((notificationId) => {
    dispatch(markNotificationAsRead(notificationId));
  }, [dispatch]);

  const markAllAsRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  const clearNotifications = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};

// Hook for real-time earnings
export const useEarnings = () => {
  const earnings = useSelector(selectEarnings);
  const recentEarnings = useSelector(selectRecentEarnings);

  return {
    earnings,
    recentEarnings
  };
};

// Hook for real-time orders
export const useOrders = () => {
  const orders = useSelector(selectOrders);
  const orderStats = useSelector(selectOrderStats);

  return {
    orders,
    orderStats
  };
};

// Hook for real-time analytics
export const useAnalytics = () => {
  const analytics = useSelector(selectAnalytics);
  const linkVisitors = useSelector(selectLinkVisitors);

  return {
    analytics,
    linkVisitors
  };
};

// Hook for real-time chat
export const useChat = () => {
  const dispatch = useDispatch();
  const messages = useSelector(selectMessages);
  const onlineUsers = useSelector(selectOnlineUsers);
  const typingUsers = useSelector(selectTypingUsers);
  const { emit } = useSocket();

  const sendMessage = useCallback((message) => {
    emit('send_message', message);
  }, [emit]);

  const startTyping = useCallback(() => {
    emit('typing_start');
  }, [emit]);

  const stopTyping = useCallback(() => {
    emit('typing_stop');
  }, [emit]);

  return {
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping
  };
};

export default useSocket;