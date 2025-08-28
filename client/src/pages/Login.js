import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      // Check user role and redirect accordingly
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData && userData.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearError();
  }, []); // Empty dependency array to run only once on mount

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await login(formData.email, formData.password, formData.rememberMe);
      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (err) {
      // Error is handled by AuthContext
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setFormData({
      email: 'demo@moneymaker.com',
      password: 'demo123456',
      rememberMe: false
    });
    
    setIsSubmitting(true);
    try {
      await login('demo@moneymaker.com', 'demo123456', false);
    } catch (err) {
      console.error('Demo login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async () => {
    setFormData({
      email: 'admin@moneymaker.com',
      password: 'admin123456',
      rememberMe: false
    });
    
    setIsSubmitting(true);
    try {
      const result = await login('admin@moneymaker.com', 'admin123456', false);
      console.log('Admin login successful:', result);
      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (err) {
      console.error('Admin login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.email && formData.password;

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-pattern"></div>
        <div className="auth-gradient"></div>
      </div>
      
      <div className="auth-content">
        {/* Left Side - Branding */}
        <div className="auth-branding">
          <div className="brand-content">
            <div className="brand-logo">
              <i className="fas fa-dollar-sign"></i>
              <span className="brand-name">Money Maker</span>
            </div>
            <h1 className="brand-title">Welcome Back!</h1>
            <p className="brand-subtitle">
              Masuk ke akun Anda dan lanjutkan perjalanan menghasilkan uang dari internet. 
              Platform terlengkap untuk semua kebutuhan monetisasi online Anda.
            </p>
            
            <div className="brand-features">
              <div className="feature-item">
                <i className="fas fa-chart-line"></i>
                <span>Real-time Analytics</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-shield-alt"></i>
                <span>Secure Payments</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-users"></i>
                <span>Active Community</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-mobile-alt"></i>
                <span>Mobile Optimized</span>
              </div>
            </div>
            
            <div className="brand-stats">
              <div className="stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat">
                <span className="stat-number">$1M+</span>
                <span className="stat-label">Total Earnings</span>
              </div>
              <div className="stat">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="auth-form-container">
          <div className="auth-form-content">
            <div className="form-header">
              <h2 className="form-title">Sign In</h2>
              <p className="form-subtitle">
                Masuk ke akun Anda untuk mengakses dashboard dan mulai menghasilkan uang.
              </p>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">Remember me</span>
                </label>
                
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>
              
              <button
                type="submit"
                className={`submit-btn ${!isFormValid || isSubmitting ? 'disabled' : ''}`}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>
            
            <div className="form-divider">
              <span>or</span>
            </div>
            
            <div className="demo-buttons">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="demo-btn"
                disabled={isSubmitting}
              >
                <i className="fas fa-play"></i>
                Try Demo Account
              </button>
              
              <button
                type="button"
                onClick={handleAdminLogin}
                className="admin-btn"
                disabled={isSubmitting}
              >
                <i className="fas fa-crown"></i>
                Login as Admin
              </button>
            </div>
            
            <div className="social-login">
              <p className="social-text">Or continue with</p>
              <div className="social-buttons">
                <button className="social-btn google">
                  <i className="fab fa-google"></i>
                  <span>Google</span>
                </button>
                <button className="social-btn facebook">
                  <i className="fab fa-facebook-f"></i>
                  <span>Facebook</span>
                </button>
                <button className="social-btn twitter">
                  <i className="fab fa-twitter"></i>
                  <span>Twitter</span>
                </button>
              </div>
            </div>
            
            <div className="form-footer">
              <p className="signup-text">
                Don't have an account?
                <Link to="/register" className="signup-link">
                  Sign up for free
                </Link>
              </p>
            </div>
            
            <div className="security-notice">
              <i className="fas fa-shield-alt"></i>
              <span>
                Your data is protected with 256-bit SSL encryption and 
                we never store your payment information.
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Elements */}
      <div className="floating-elements">
        <div className="floating-element element-1">
          <i className="fas fa-dollar-sign"></i>
        </div>
        <div className="floating-element element-2">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="floating-element element-3">
          <i className="fas fa-coins"></i>
        </div>
        <div className="floating-element element-4">
          <i className="fas fa-piggy-bank"></i>
        </div>
        <div className="floating-element element-5">
          <i className="fas fa-money-bill-wave"></i>
        </div>
      </div>
    </div>
  );
};

export default Login;