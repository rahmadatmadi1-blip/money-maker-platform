const state = {
    sidebarOpen: false,
    theme: localStorage.getItem('theme') || 'light',
    breadcrumbs: [],
    notifications: [],
    modals: {},
    loading: {
        global: false,
        components: {},
    },
};

const mutations = {
    TOGGLE_SIDEBAR(state) {
        state.sidebarOpen = !state.sidebarOpen;
    },
    
    SET_SIDEBAR(state, isOpen) {
        state.sidebarOpen = isOpen;
    },
    
    SET_THEME(state, theme) {
        state.theme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    },
    
    SET_BREADCRUMBS(state, breadcrumbs) {
        state.breadcrumbs = breadcrumbs;
    },
    
    ADD_NOTIFICATION(state, notification) {
        const id = Date.now() + Math.random();
        state.notifications.push({
            id,
            ...notification,
            timestamp: new Date(),
        });
    },
    
    REMOVE_NOTIFICATION(state, id) {
        state.notifications = state.notifications.filter(n => n.id !== id);
    },
    
    CLEAR_NOTIFICATIONS(state) {
        state.notifications = [];
    },
    
    SET_MODAL(state, { name, isOpen, data = null }) {
        state.modals = {
            ...state.modals,
            [name]: {
                isOpen,
                data,
            },
        };
    },
    
    SET_GLOBAL_LOADING(state, loading) {
        state.loading.global = loading;
    },
    
    SET_COMPONENT_LOADING(state, { component, loading }) {
        state.loading.components = {
            ...state.loading.components,
            [component]: loading,
        };
    },
};

const actions = {
    toggleSidebar({ commit }) {
        commit('TOGGLE_SIDEBAR');
    },
    
    setSidebar({ commit }, isOpen) {
        commit('SET_SIDEBAR', isOpen);
    },
    
    setTheme({ commit }, theme) {
        commit('SET_THEME', theme);
    },
    
    toggleTheme({ commit, state }) {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        commit('SET_THEME', newTheme);
    },
    
    updateBreadcrumbs({ commit }, route) {
        const breadcrumbs = [];
        
        // Generate breadcrumbs based on route
        const pathSegments = route.path.split('/').filter(segment => segment);
        
        // Add home
        breadcrumbs.push({
            name: 'Home',
            path: '/',
            active: false,
        });
        
        // Add route segments
        let currentPath = '';
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === pathSegments.length - 1;
            
            breadcrumbs.push({
                name: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
                path: currentPath,
                active: isLast,
            });
        });
        
        commit('SET_BREADCRUMBS', breadcrumbs);
    },
    
    showNotification({ commit }, notification) {
        commit('ADD_NOTIFICATION', notification);
        
        // Auto remove after timeout
        if (notification.timeout !== false) {
            const timeout = notification.timeout || 5000;
            setTimeout(() => {
                commit('REMOVE_NOTIFICATION', notification.id);
            }, timeout);
        }
    },
    
    removeNotification({ commit }, id) {
        commit('REMOVE_NOTIFICATION', id);
    },
    
    clearNotifications({ commit }) {
        commit('CLEAR_NOTIFICATIONS');
    },
    
    showSuccess({ dispatch }, message) {
        dispatch('showNotification', {
            type: 'success',
            title: 'Success',
            message,
        });
    },
    
    showError({ dispatch }, message) {
        dispatch('showNotification', {
            type: 'error',
            title: 'Error',
            message,
            timeout: 8000,
        });
    },
    
    showWarning({ dispatch }, message) {
        dispatch('showNotification', {
            type: 'warning',
            title: 'Warning',
            message,
        });
    },
    
    showInfo({ dispatch }, message) {
        dispatch('showNotification', {
            type: 'info',
            title: 'Info',
            message,
        });
    },
    
    openModal({ commit }, { name, data = null }) {
        commit('SET_MODAL', { name, isOpen: true, data });
    },
    
    closeModal({ commit }, name) {
        commit('SET_MODAL', { name, isOpen: false, data: null });
    },
    
    setGlobalLoading({ commit }, loading) {
        commit('SET_GLOBAL_LOADING', loading);
    },
    
    setComponentLoading({ commit }, { component, loading }) {
        commit('SET_COMPONENT_LOADING', { component, loading });
    },
};

const getters = {
    sidebarOpen: (state) => state.sidebarOpen,
    theme: (state) => state.theme,
    isDarkTheme: (state) => state.theme === 'dark',
    breadcrumbs: (state) => state.breadcrumbs,
    notifications: (state) => state.notifications,
    notificationCount: (state) => state.notifications.length,
    
    modal: (state) => (name) => {
        return state.modals[name] || { isOpen: false, data: null };
    },
    
    isModalOpen: (state) => (name) => {
        return state.modals[name]?.isOpen || false;
    },
    
    modalData: (state) => (name) => {
        return state.modals[name]?.data || null;
    },
    
    globalLoading: (state) => state.loading.global,
    
    componentLoading: (state) => (component) => {
        return state.loading.components[component] || false;
    },
    
    isLoading: (state) => {
        return state.loading.global || Object.values(state.loading.components).some(loading => loading);
    },
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters,
};