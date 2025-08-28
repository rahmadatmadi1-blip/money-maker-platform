import React, { useState, useContext, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Auth.css';

const ResetPassword = () => {
  const { resetPassword, loading, error } = useContext(AuthContext);
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const calculatePasswordStrength = (password) => {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Uppercase letter');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Number');

    if (/[^\w\s]/.test(password)) score += 1;
    else feedback.push('Special character');

    const strengthLevels = [
      { text: 'Very Weak', color: '#ef4444' },
      { text: 'Weak', color: '#f97316' },
      { text: 'Fair', color: '#eab308' },
      { text: 'Good', color: '#22c55e' },
      { text: 'Strong', color: '#10b981' }
    ];

    return {
      score,
      ...strengthLevels[score] || strengthLevels[0],
      feedback
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation errors
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Calculate password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await resetPassword(token, formData.password);
      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
    }
  };

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <p>Resetting your password...</p>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Background */}
      <div className="auth-background">
        <div className="auth-pattern"></div>
        <div className="auth-gradient"></div>
      </div>

      {/* Floating Elements */}
      <div className="floating-elements">
        <div className="floating-element element-1">
          <i className="fas fa-lock"></i>
        </div>
        <div className="floating-element element-2">
          <i className="fas fa-key"></i>
        </div>
        <div className="floating-element element-3">
          <i className="fas fa-shield-alt"></i>
        </div>
        <div className="floating-element element-4">
          <i className="fas fa-user-shield"></i>
        </div>
        <div className="floating-element element-5">
          <i className="fas fa-fingerprint"></i>
        </div>
        <div className="floating-element element-6">
          <i className="fas fa-check-circle"></i>
        </div>
      </div>

      <div className="auth-content">
        {/* Branding Section */}
        <div className="auth-branding">
          <div className="brand-content">
            <div className="brand-logo">
              <i className="fas fa-rocket"></i>
              <span className="brand-name">FlexiBoost</span>
            </div>
            
            <h1 className="brand-title">
              {isSuccess ? 'Password Updated!' : 'Create New Password'}
            </h1>
            <p className="brand-subtitle">
              {isSuccess 
                ? 'Your password has been successfully updated. You can now log in with your new password.'
                : 'Your new password must be different from previously used passwords and meet our security requirements.'
              }
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <i className="fas fa-shield-check"></i>
                <span>Secure Encryption</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-lock"></i>
                <span>Password Protection</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-user-check"></i>
                <span>Account Security</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-history"></i>
                <span>Login History</span>
              </div>
            </div>

            <div className="brand-benefits">
              <div className="benefit-item">
                <i className="fas fa-check-circle"></i>
                <div className="benefit-content">
                  <h4>Strong Password Requirements</h4>
                  <p>We enforce strong password policies to keep your account secure</p>
                </div>
              </div>
              <div className="benefit-item">
                <i className="fas fa-eye-slash"></i>
                <div className="benefit-content">
                  <h4>Privacy Protection</h4>
                  <p>Your password is encrypted and never stored in plain text</p>
                </div>
              </div>
              <div className="benefit-item">
                <i className="fas fa-clock"></i>
                <div className="benefit-content">
                  <h4>Session Management</h4>
                  <p>Automatic logout from all devices for added security</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="auth-form-container">
          <div className="auth-form-content">
            {!isSuccess ? (
              <>
                <div className="form-header">
                  <h2 className="form-title">Reset Your Password</h2>
                  <p className="form-subtitle">
                    Enter your new password below. Make sure it's strong and secure.
                  </p>
                </div>

                {error && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      New Password
                    </label>
                    <div className="input-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        className={`form-input ${validationErrors.password ? 'error' : ''}`}
                        placeholder="Enter your new password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
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
                              width: `${(passwordStrength.score / 5) * 100}%`,
                              backgroundColor: passwordStrength.color 
                            }}
                          ></div>
                        </div>
                        <span 
                          className="strength-text" 
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.text}
                        </span>
                      </div>
                    )}
                    {validationErrors.password && (
                      <div className="field-error">{validationErrors.password}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm New Password
                    </label>
                    <div className="input-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        className={`form-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                        placeholder="Confirm your new password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <div className="field-success">
                        <i className="fas fa-check"></i>
                        Passwords match
                      </div>
                    )}
                    {validationErrors.confirmPassword && (
                      <div className="field-error">{validationErrors.confirmPassword}</div>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="password-requirements">
                    <h4>Password Requirements:</h4>
                    <ul>
                      <li className={formData.password.length >= 8 ? 'valid' : ''}>
                        <i className={`fas ${formData.password.length >= 8 ? 'fa-check' : 'fa-times'}`}></i>
                        At least 8 characters long
                      </li>
                      <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                        <i className={`fas ${/[a-z]/.test(formData.password) ? 'fa-check' : 'fa-times'}`}></i>
                        One lowercase letter
                      </li>
                      <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                        <i className={`fas ${/[A-Z]/.test(formData.password) ? 'fa-check' : 'fa-times'}`}></i>
                        One uppercase letter
                      </li>
                      <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                        <i className={`fas ${/\d/.test(formData.password) ? 'fa-check' : 'fa-times'}`}></i>
                        One number
                      </li>
                      <li className={/[^\w\s]/.test(formData.password) ? 'valid' : ''}>
                        <i className={`fas ${/[^\w\s]/.test(formData.password) ? 'fa-check' : 'fa-times'}`}></i>
                        One special character
                      </li>
                    </ul>
                  </div>

                  <button 
                    type="submit" 
                    className={`submit-btn ${loading || passwordStrength.score < 3 ? 'disabled' : ''}`}
                    disabled={loading || passwordStrength.score < 3}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Update Password
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="reset-success">
                <div className="success-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="success-content">
                  <h3>Password Successfully Updated!</h3>
                  <p>
                    Your password has been changed successfully. For security reasons, 
                    you have been logged out from all devices.
                  </p>
                  <div className="success-actions">
                    <Link to="/login" className="login-btn">
                      <i className="fas fa-sign-in-alt"></i>
                      Go to Login
                    </Link>
                  </div>
                  <div className="auto-redirect">
                    <i className="fas fa-clock"></i>
                    You will be redirected to login in 3 seconds...
                  </div>
                </div>
              </div>
            )}

            <div className="form-footer">
              <div className="back-to-login">
                <Link to="/login" className="back-link">
                  <i className="fas fa-arrow-left"></i>
                  Back to Login
                </Link>
              </div>
            </div>

            {/* Security Notice */}
            <div className="security-notice">
              <i className="fas fa-shield-alt"></i>
              <div>
                <strong>Security Notice:</strong> After updating your password, you will be logged out 
                from all devices for security. Please log in again with your new password.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;