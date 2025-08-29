import axios from 'axios';

const state = {
    user: null,
    token: localStorage.getItem('jwt_token'),
    isAuthenticated: false,
    loading: false,
};

const mutations = {
    SET_USER(state, user) {
        state.user = user;
        state.isAuthenticated = !!user;
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    },
    
    SET_TOKEN(state, token) {
        state.token = token;
        if (token) {
            localStorage.setItem('jwt_token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('jwt_token');
            delete axios.defaults.headers.common['Authorization'];
        }
    },
    
    SET_LOADING(state, loading) {
        state.loading = loading;
    },
    
    LOGOUT(state) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    },
};

const actions = {
    async login({ commit }, credentials) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/auth/login', credentials);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                commit('SET_TOKEN', token);
                commit('SET_USER', user);
                
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async register({ commit }, userData) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/auth/register', userData);
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                
                commit('SET_TOKEN', token);
                commit('SET_USER', user);
                
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Registration failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async logout({ commit }) {
        try {
            await axios.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            commit('LOGOUT');
        }
    },
    
    async loadUser({ commit, state }) {
        if (!state.token) {
            throw new Error('No token available');
        }
        
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.get('/auth/profile');
            
            if (response.data.success) {
                commit('SET_USER', response.data.data);
                return response.data.data;
            } else {
                throw new Error('Failed to load user');
            }
        } catch (error) {
            commit('LOGOUT');
            throw error;
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async updateProfile({ commit }, profileData) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.put('/auth/profile', profileData);
            
            if (response.data.success) {
                commit('SET_USER', response.data.data);
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data.message || 'Profile update failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Profile update failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async changePassword({ commit }, passwordData) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.put('/auth/change-password', passwordData);
            
            if (response.data.success) {
                return { success: true, message: response.data.message };
            } else {
                throw new Error(response.data.message || 'Password change failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Password change failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async forgotPassword({ commit }, email) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/auth/forgot-password', { email });
            
            if (response.data.success) {
                return { success: true, message: response.data.message };
            } else {
                throw new Error(response.data.message || 'Failed to send reset email');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to send reset email';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async resetPassword({ commit }, resetData) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/auth/reset-password', resetData);
            
            if (response.data.success) {
                return { success: true, message: response.data.message };
            } else {
                throw new Error(response.data.message || 'Password reset failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Password reset failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async refreshToken({ commit, state }) {
        if (!state.token) {
            throw new Error('No token to refresh');
        }
        
        try {
            const response = await axios.post('/auth/refresh');
            
            if (response.data.success) {
                const { token } = response.data.data;
                commit('SET_TOKEN', token);
                return token;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            commit('LOGOUT');
            throw error;
        }
    },
    
    initializeAuth({ commit }) {
        const token = localStorage.getItem('jwt_token');
        const user = localStorage.getItem('user');
        
        if (token) {
            commit('SET_TOKEN', token);
        }
        
        if (user) {
            try {
                commit('SET_USER', JSON.parse(user));
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                localStorage.removeItem('user');
            }
        }
    },
};

const getters = {
    user: (state) => state.user,
    token: (state) => state.token,
    isAuthenticated: (state) => state.isAuthenticated,
    loading: (state) => state.loading,
    userName: (state) => state.user?.name || '',
    userEmail: (state) => state.user?.email || '',
    userAvatar: (state) => state.user?.avatar || null,
    userRole: (state) => state.user?.role || 'user',
    isPremium: (state) => state.user?.is_premium || false,
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters,
};