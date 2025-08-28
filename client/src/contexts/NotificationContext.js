import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null
};

// Action types
const NOTIFICATION_ACTIONS = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_FAILURE: 'FETCH_FAILURE',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  DELETE_NOTIFICATION: 'DELETE_NOTIFICATION',
  UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS'
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.FETCH_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case NOTIFICATION_ACTIONS.FETCH_SUCCESS:
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount,
        loading: false,
        error: null
      };
      
    case NOTIFICATION_ACTIONS.FETCH_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
      
    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification._id === action.payload
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
      
    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date()
        })),
        unreadCount: 0
      };
      
    case NOTIFICATION_ACTIONS.DELETE_NOTIFICATION:
      const deletedNotification = state.notifications.find(n => n._id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n._id !== action.payload),
        unreadCount: deletedNotification && !deletedNotification.isRead 
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount
      };
      
    case NOTIFICATION_ACTIONS.UPDATE_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload
      };
      
    case NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
      
    default:
      return state;
  }
};

// Create context
const NotificationContext = createContext();

// Notification Provider Component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, api } = useAuth();

  // Fetch notifications
  const fetchNotifications = async (page = 1, limit = 20, filters = {}) => {
    if (!user) return;
    
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.FETCH_START });
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await api.get(`/notifications?${params}`);
      
      dispatch({
        type: NOTIFICATION_ACTIONS.FETCH_SUCCESS,
        payload: {
          notifications: response.data.notifications,
          unreadCount: response.data.unreadCount
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Fetch notifications error:', error);
      dispatch({
        type: NOTIFICATION_ACTIONS.FETCH_FAILURE,
        payload: error.response?.data?.message || 'Gagal memuat notifikasi'
      });
      return null;
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      dispatch({
        type: NOTIFICATION_ACTIONS.MARK_AS_READ,
        payload: notificationId
      });
      
      return true;
    } catch (error) {
      console.error('Mark as read error:', error);
      toast.error('Gagal menandai notifikasi sebagai dibaca');
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });
      
      toast.success('Semua notifikasi ditandai sebagai dibaca');
      return true;
    } catch (error) {
      console.error('Mark all as read error:', error);
      toast.error('Gagal menandai semua notifikasi sebagai dibaca');
      return false;
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      dispatch({
        type: NOTIFICATION_ACTIONS.DELETE_NOTIFICATION,
        payload: notificationId
      });
      
      toast.success('Notifikasi berhasil dihapus');
      return true;
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Gagal menghapus notifikasi');
      return false;
    }
  };

  // Get notification statistics
  const getNotificationStats = async () => {
    if (!user) return null;
    
    try {
      const response = await api.get('/notifications/stats');
      return response.data.stats;
    } catch (error) {
      console.error('Get notification stats error:', error);
      return null;
    }
  };

  // Show toast notification
  const showToast = (type, message, options = {}) => {
    const toastOptions = {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  };

  // Add new notification (for real-time updates)
  const addNotification = (notification) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION,
      payload: notification
    });
    
    // Show toast for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      showToast('info', notification.title, {
        onClick: () => {
          // Navigate to notification or perform action
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }
      });
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS });
  };

  // Update unread count
  const updateUnreadCount = (count) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.UPDATE_UNREAD_COUNT,
      payload: count
    });
  };

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      clearNotifications();
    }
  }, [user]);

  // Set up real-time notifications (WebSocket or polling)
  useEffect(() => {
    if (!user) return;

    // Simple polling for notifications (in production, use WebSocket)
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get('/notifications?limit=1');
        const newUnreadCount = response.data.unreadCount;
        
        if (newUnreadCount > state.unreadCount) {
          // New notification received
          updateUnreadCount(newUnreadCount);
          
          // Optionally fetch the latest notification to show toast
          const latestNotifications = response.data.notifications;
          if (latestNotifications.length > 0 && !latestNotifications[0].isRead) {
            const latestNotification = latestNotifications[0];
            if (latestNotification.priority === 'high' || latestNotification.priority === 'urgent') {
              showToast('info', latestNotification.title);
            }
          }
        }
      } catch (error) {
        // Silently handle polling errors
        console.error('Notification polling error:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [user, state.unreadCount]);

  // Context value
  const value = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationStats,
    showToast,
    addNotification,
    clearNotifications,
    updateUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};

export default NotificationContext;