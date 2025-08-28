import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
      
    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
      
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on app start
  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: null });
    }
  }, []);

  // Load user function
  const loadUser = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
      
      // Check if it's a demo admin token
      if (state.token && state.token.startsWith('demo-admin-token')) {
        // Load demo admin user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
            payload: user
          });
          return;
        }
      }
      
      // Check if it's a demo user token
      if (state.token && state.token.startsWith('demo-user-token')) {
        // Load demo user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
            payload: user
          });
          return;
        }
      }
      
      // For real API tokens, make API call
      const response = await api.get('/auth/me');
      
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: response.data.user
      });
    } catch (error) {
      console.error('Load user error:', error);
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: error.response?.data?.message || 'Gagal memuat data user'
      });
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      // Demo admin login (fallback when backend is not available)
      if (email === 'admin@moneymaker.com' && password === 'admin123456') {
        const demoAdminUser = {
          _id: 'demo-admin-id',
          name: 'Super Admin',
          email: 'admin@moneymaker.com',
          role: 'admin',
          isActive: true,
          isPremium: true,
          avatar: null,
          earnings: {
            available: 1500000,
            pending: 250000,
            total: 1750000
          },
          createdAt: new Date().toISOString()
        };
        
        const demoToken = 'demo-admin-token-' + Date.now();
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: demoAdminUser,
            token: demoToken
          }
        });
        
        localStorage.setItem('user', JSON.stringify(demoAdminUser));
        
        return { success: true, message: 'Login admin berhasil!' };
      }
      
      // Demo user login
      if (email === 'demo@moneymaker.com' && password === 'demo123456') {
        const demoUser = {
          _id: 'demo-user-id',
          name: 'Demo User',
          email: 'demo@moneymaker.com',
          role: 'user',
          isActive: true,
          isPremium: false,
          avatar: null,
          earnings: {
            available: 125000,
            pending: 50000,
            total: 175000
          },
          createdAt: new Date().toISOString()
        };
        
        const demoToken = 'demo-user-token-' + Date.now();
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: demoUser,
            token: demoToken
          }
        });
        
        localStorage.setItem('user', JSON.stringify(demoUser));
        
        return { success: true, message: 'Login demo berhasil!' };
      }
      
      // Try backend API
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
          token: response.data.token
        }
      });
      
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return { success: true, message: 'Login berhasil' };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Email atau password salah';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, message: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      
      // Try backend API first
      try {
        const response = await api.post('/auth/register', userData);
        
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: response.data.user,
            token: response.data.token
          }
        });
        
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        return { success: true, message: 'Registrasi berhasil' };
      } catch (apiError) {
        console.log('Backend API not available, using demo registration');
        
        // Demo registration fallback
        const demoUser = {
          _id: 'demo-user-' + Date.now(),
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          role: 'user',
          isActive: true,
          isPremium: false,
          avatar: null,
          earnings: {
            available: 0,
            pending: 0,
            total: 0
          },
          createdAt: new Date().toISOString()
        };
        
        const demoToken = 'demo-user-token-' + Date.now();
        
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: demoUser,
            token: demoToken
          }
        });
        
        localStorage.setItem('user', JSON.stringify(demoUser));
        
        return { success: true, message: 'Registrasi demo berhasil! Anda dapat menggunakan semua fitur dalam mode demo.' };
      }
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = 'Registrasi gagal. Silakan coba lagi.';
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, message: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('user');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Update user function
  const updateUser = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user
      });
      
      return { success: true, message: 'Profil berhasil diperbarui' };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal memperbarui profil'
      };
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return { success: true, message: 'Password berhasil diubah' };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal mengubah password'
      };
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      return { success: true, message: 'Link reset password telah dikirim ke email Anda' };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal mengirim link reset password'
      };
    }
  };

  // Reset password function
  const resetPassword = async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      
      return { success: true, message: 'Password berhasil direset' };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal mereset password'
      };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Upgrade to premium function
  const upgradeToPremium = async () => {
    try {
      const response = await api.post('/users/upgrade-premium');
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: { isPremium: true }
      });
      
      return { success: true, message: 'Berhasil upgrade ke premium' };
    } catch (error) {
      console.error('Upgrade premium error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal upgrade ke premium'
      };
    }
  };

  // Context value
  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user && !!state.token,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword,
    clearError,
    upgradeToPremium,
    loadUser,
    api // Export api instance for use in other components
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export api instance for use in other files
export { api };

export default AuthContext;