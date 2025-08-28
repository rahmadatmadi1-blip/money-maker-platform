import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Auth.css';

const ForgotPassword = () => {
  const { forgotPassword, loading, error } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      await forgotPassword(email);
      setMessage('Password reset instructions have been sent to your email.');
      setIsSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
    }
  };

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <p>Processing your request...</p>
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
          <i className="fas fa-envelope"></i>
        </div>
        <div className="floating-element element-5">
          <i className="fas fa-user-shield"></i>
        </div>
        <div className="floating-element element-6">
          <i className="fas fa-fingerprint"></i>
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
            
            <h1 className="brand-title">Secure Account Recovery</h1>
            <p className="brand-subtitle">
              Don't worry! It happens to the best of us. Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <i className="fas fa-shield-check"></i>
                <span>Secure Reset Process</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-clock"></i>
                <span>Quick Recovery</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-envelope-open-text"></i>
                <span>Email Verification</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-user-lock"></i>
                <span>Account Protection</span>
              </div>
            </div>

            <div className="testimonial">
              <div className="testimonial-content">
                <p>"The password reset process was so smooth and secure. I was back to earning within minutes!"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div>
                    <span className="author-name">Sarah Johnson</span>
                    <div className="author-title">Content Creator</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="auth-form-container">
          <div className="auth-form-content">
            <div className="form-header">
              <h2 className="form-title">
                {isSubmitted ? 'Check Your Email' : 'Reset Password'}
              </h2>
              <p className="form-subtitle">
                {isSubmitted 
                  ? 'We\'ve sent password reset instructions to your email address.'
                  : 'Enter your email address and we\'ll send you a link to reset your password.'
                }
              </p>
            </div>

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                <span>{message}</span>
              </div>
            )}

            {!isSubmitted ? (
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
                      className="form-input"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={`submit-btn ${loading ? 'disabled' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="reset-success">
                <div className="success-icon">
                  <i className="fas fa-envelope-open-text"></i>
                </div>
                <div className="success-content">
                  <h3>Email Sent Successfully!</h3>
                  <p>
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <div className="email-tips">
                    <h4>Didn't receive the email?</h4>
                    <ul>
                      <li>Check your spam or junk folder</li>
                      <li>Make sure you entered the correct email address</li>
                      <li>Wait a few minutes for the email to arrive</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage('');
                      setEmail('');
                    }}
                    className="resend-btn"
                  >
                    <i className="fas fa-redo"></i>
                    Try Different Email
                  </button>
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
              
              <div className="help-text">
                <span>Need help? </span>
                <Link to="/contact" className="help-link">
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Security Notice */}
            <div className="security-notice">
              <i className="fas fa-shield-alt"></i>
              <div>
                <strong>Security Notice:</strong> For your protection, password reset links expire after 1 hour. 
                If you don't receive the email within 15 minutes, please try again or contact our support team.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;