import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isAuthenticated, loading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: searchParams.get('ref') || '',
    agreeToTerms: false,
    subscribeNewsletter: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    // Calculate password strength
    const calculateStrength = (password) => {
      let strength = 0;
      if (password.length >= 8) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;
      return strength;
    };
    
    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 3) {
      alert('Please choose a stronger password');
      return;
    }
    
    if (!formData.agreeToTerms) {
      alert('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        referralCode: formData.referralCode,
        subscribeNewsletter: formData.subscribeNewsletter
      });
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
      case 5:
        return 'Strong';
      default:
        return 'Weak';
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return '#ef4444';
      case 2:
        return '#f59e0b';
      case 3:
        return '#10b981';
      case 4:
      case 5:
        return '#059669';
      default:
        return '#ef4444';
    }
  };

  const isFormValid = 
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    passwordStrength >= 3 &&
    formData.agreeToTerms;

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
            <h1 className="brand-title">Join Money Maker!</h1>
            <p className="brand-subtitle">
              Bergabunglah dengan ribuan orang yang sudah menghasilkan uang dari internet. 
              Mulai perjalanan monetisasi online Anda hari ini dengan platform terlengkap.
            </p>
            
            <div className="brand-benefits">
              <div className="benefit-item">
                <i className="fas fa-check-circle"></i>
                <div className="benefit-content">
                  <h4>Free to Start</h4>
                  <p>Mulai gratis tanpa biaya pendaftaran</p>
                </div>
              </div>
              <div className="benefit-item">
                <i className="fas fa-check-circle"></i>
                <div className="benefit-content">
                  <h4>Multiple Income Streams</h4>
                  <p>Affiliate, E-commerce, Content, Services</p>
                </div>
              </div>
              <div className="benefit-item">
                <i className="fas fa-check-circle"></i>
                <div className="benefit-content">
                  <h4>Real-time Tracking</h4>
                  <p>Monitor earnings dan performance secara real-time</p>
                </div>
              </div>
              <div className="benefit-item">
                <i className="fas fa-check-circle"></i>
                <div className="benefit-content">
                  <h4>Secure Payments</h4>
                  <p>Pembayaran aman dengan multiple payment methods</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial">
              <div className="testimonial-content">
                <p>"Money Maker Platform membantu saya meningkatkan income hingga 300% dalam 6 bulan!"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="author-info">
                    <span className="author-name">Sarah Johnson</span>
                    <span className="author-title">Content Creator</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Register Form */}
        <div className="auth-form-container">
          <div className="auth-form-content">
            <div className="form-header">
              <h2 className="form-title">Create Account</h2>
              <p className="form-subtitle">
                Daftar sekarang dan mulai menghasilkan uang dari berbagai sumber income online.
              </p>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    First Name
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-user input-icon"></i>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="First name"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    Last Name
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-user input-icon"></i>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Last name"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>
              
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
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill"
                        style={{ 
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }}
                      ></div>
                    </div>
                    <span 
                      className="strength-text"
                      style={{ color: getPasswordStrengthColor() }}
                    >
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`form-input ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'error'
                        : ''
                    }`}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span className="field-error">Passwords do not match</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="referralCode" className="form-label">
                  Referral Code (Optional)
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-gift input-icon"></i>
                  <input
                    type="text"
                    id="referralCode"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter referral code"
                    autoComplete="off"
                  />
                </div>
                {formData.referralCode && (
                  <span className="field-success">
                    <i className="fas fa-check"></i>
                    You'll receive bonus rewards!
                  </span>
                )}
              </div>
              
              <div className="form-checkboxes">
                <label className="checkbox-label required">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="checkbox-input"
                    required
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    I agree to the 
                    <Link to="/terms" target="_blank" className="link">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank" className="link">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="subscribeNewsletter"
                    checked={formData.subscribeNewsletter}
                    onChange={handleChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    Subscribe to newsletter for tips and updates
                  </span>
                </label>
              </div>
              
              <button
                type="submit"
                className={`submit-btn ${!isFormValid || isSubmitting ? 'disabled' : ''}`}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    Create Account
                  </>
                )}
              </button>
            </form>
            
            <div className="form-divider">
              <span>or</span>
            </div>
            
            <div className="social-login">
              <p className="social-text">Sign up with</p>
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
              <p className="signin-text">
                Already have an account?
                <Link to="/login" className="signin-link">
                  Sign in here
                </Link>
              </p>
            </div>
            
            <div className="security-notice">
              <i className="fas fa-shield-alt"></i>
              <span>
                Your account is protected with advanced security measures. 
                We never share your personal information.
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
        <div className="floating-element element-6">
          <i className="fas fa-credit-card"></i>
        </div>
      </div>
    </div>
  );
};

export default Register;