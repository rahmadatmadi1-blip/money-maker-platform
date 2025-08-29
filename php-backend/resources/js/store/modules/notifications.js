import axios from 'axios';

const state = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    pagination: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    },
    settings: {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        marketing_emails: true,
    },
};

const mutations = {
    SET_NOTIFICATIONS(state, { data, pagination }) {
        state.notifications = data;
        state.pagination = pagination;
    },
    
    ADD_NOTIFICATION(state, notification) {
        state.notifications.unshift(notification);
        if (!notification.is_read) {
            state.unreadCount++;
        }
    },
    
    UPDATE_NOTIFICATION(state, updatedNotification) {
        const index = state.notifications.findIndex(n => n.id === updatedNotification.id);
        if (index !== -1) {
            const oldNotification = state.notifications[index];
            state.notifications.splice(index, 1, updatedNotification);
            
            // Update unread count
            if (!oldNotification.is_read && updatedNotification.is_read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            } else if (oldNotification.is_read && !updatedNotification.is_read) {
                state.unreadCount++;
            }
        }
    },
    
    REMOVE_NOTIFICATION(state, id) {
        const index = state.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            const notification = state.notifications[index];
            state.notifications.splice(index, 1);
            
            if (!notification.is_read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        }
    },
    
    SET_UNREAD_COUNT(state, count) {
        state.unreadCount = count;
    },
    
    MARK_ALL_AS_READ(state) {
        state.notifications.forEach(notification => {
            notification.is_read = true;
            notification.read_at = new Date().toISOString();
        });
        state.unreadCount = 0;
    },
    
    SET_SETTINGS(state, settings) {
        state.settings = { ...state.settings, ...settings };
    },
    
    SET_LOADING(state, loading) {
        state.loading = loading;
    },
};

const actions = {
    async fetchNotifications({ commit }, { page = 1, per_page = 10, filters = {} } = {}) {
        try {
            commit('SET_LOADING', true);
            
            const params = {
                page,
                per_page,
                ...filters,
            };
            
            const response = await axios.get('/notifications', { params });
            
            if (response.data.success) {
                commit('SET_NOTIFICATIONS', {
                    data: response.data.data.data,
                    pagination: {
                        current_page: response.data.data.current_page,
                        last_page: response.data.data.last_page,
                        per_page: response.data.data.per_page,
                        total: response.data.data.total,
                    },
                });
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch notifications');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch notifications';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async fetchUnreadCount({ commit }) {
        try {
            const response = await axios.get('/notifications/unread-count');
            
            if (response.data.success) {
                commit('SET_UNREAD_COUNT', response.data.data.count);
                return response.data.data.count;
            } else {
                throw new Error(response.data.message || 'Failed to fetch unread count');
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            return 0;
        }
    },
    
    async markAsRead({ commit }, id) {
        try {
            const response = await axios.put(`/notifications/${id}/read`);
            
            if (response.data.success) {
                commit('UPDATE_NOTIFICATION', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to mark notification as read');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to mark notification as read';
            throw new Error(message);
        }
    },
    
    async markAllAsRead({ commit }) {
        try {
            const response = await axios.put('/notifications/mark-all-read');
            
            if (response.data.success) {
                commit('MARK_ALL_AS_READ');
                return true;
            } else {
                throw new Error(response.data.message || 'Failed to mark all notifications as read');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to mark all notifications as read';
            throw new Error(message);
        }
    },
    
    async deleteNotification({ commit }, id) {
        try {
            const response = await axios.delete(`/notifications/${id}`);
            
            if (response.data.success) {
                commit('REMOVE_NOTIFICATION', id);
                return true;
            } else {
                throw new Error(response.data.message || 'Failed to delete notification');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to delete notification';
            throw new Error(message);
        }
    },
    
    async fetchSettings({ commit }) {
        try {
            const response = await axios.get('/notifications/settings');
            
            if (response.data.success) {
                commit('SET_SETTINGS', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch notification settings');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch notification settings';
            throw new Error(message);
        }
    },
    
    async updateSettings({ commit }, settings) {
        try {
            const response = await axios.put('/notifications/settings', settings);
            
            if (response.data.success) {
                commit('SET_SETTINGS', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to update notification settings');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update notification settings';
            throw new Error(message);
        }
    },
    
    // Real-time notification handling
    addRealTimeNotification({ commit }, notification) {
        commit('ADD_NOTIFICATION', notification);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192x192.svg',
                tag: notification.id,
            });
        }
    },
    
    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    },
    
    // Initialize real-time notifications
    initializeRealTime({ dispatch }) {
        // Request permission for browser notifications
        dispatch('requestNotificationPermission');
        
        // Set up periodic unread count refresh
        setInterval(() => {
            dispatch('fetchUnreadCount');
        }, 30000); // Every 30 seconds
    },
};

const getters = {
    notifications: (state) => state.notifications,
    unreadCount: (state) => state.unreadCount,
    loading: (state) => state.loading,
    pagination: (state) => state.pagination,
    settings: (state) => state.settings,
    
    unreadNotifications: (state) => {
        return state.notifications.filter(notification => !notification.is_read);
    },
    
    readNotifications: (state) => {
        return state.notifications.filter(notification => notification.is_read);
    },
    
    getNotificationById: (state) => (id) => {
        return state.notifications.find(notification => notification.id === id);
    },
    
    getNotificationsByType: (state) => (type) => {
        return state.notifications.filter(notification => notification.type === type);
    },
    
    hasUnreadNotifications: (state) => {
        return state.unreadCount > 0;
    },
    
    totalNotifications: (state) => state.pagination.total,
    
    hasNextPage: (state) => {
        return state.pagination.current_page < state.pagination.last_page;
    },
    
    hasPrevPage: (state) => {
        return state.pagination.current_page > 1;
    },
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters,
};