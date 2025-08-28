import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Turn Your Skills Into <span className="highlight">Passive Income</span>
          </h1>
          <p className="hero-subtitle">
            The all-in-one platform for content creators, affiliates, and entrepreneurs 
            to monetize their expertise and build sustainable online businesses.
          </p>
          <div className="hero-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="cta-button primary">
                  Start Earning Today
                </Link>
                <Link to="/login" className="cta-button secondary">
                  Sign In
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="cta-button primary">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">$2.5M+</div>
              <div className="stat-label">Total Earnings</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Multiple Revenue Streams</h3>
              <p>Affiliate marketing, digital products, services, and subscription-based content all in one platform.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Advanced Analytics</h3>
              <p>Track your performance with detailed analytics, conversion rates, and revenue insights.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Easy Setup</h3>
              <p>Get started in minutes with our intuitive interface and step-by-step guidance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Payments</h3>
              <p>Integrated payment processing with multiple gateways and automatic payouts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Marketing Tools</h3>
              <p>Built-in email marketing, social media integration, and conversion optimization.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Optimized</h3>
              <p>Manage your business on the go with our fully responsive mobile interface.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Sign Up & Setup</h3>
              <p>Create your account and set up your profile in less than 5 minutes.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Choose Your Path</h3>
              <p>Select from affiliate marketing, content creation, e-commerce, or services.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Start Earning</h3>
              <p>Launch your campaigns and start generating revenue immediately.</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Scale & Optimize</h3>
              <p>Use our analytics to optimize performance and scale your income.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What Our Users Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"This platform transformed my side hustle into a full-time business. I'm now earning 6 figures annually!"</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">S</div>
                <div className="author-info">
                  <div className="author-name">Sarah Johnson</div>
                  <div className="author-title">Content Creator</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"The affiliate tools are incredible. I've increased my conversion rates by 300% since joining."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">M</div>
                <div className="author-info">
                  <div className="author-name">Mike Chen</div>
                  <div className="author-title">Affiliate Marketer</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Finally, a platform that handles everything - payments, analytics, marketing. It's a game-changer!"</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">E</div>
                <div className="author-info">
                  <div className="author-name">Emily Rodriguez</div>
                  <div className="author-title">Digital Entrepreneur</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Journey?</h2>
            <p>Join thousands of successful entrepreneurs who are already earning with our platform.</p>
            {!isAuthenticated ? (
              <Link to="/register" className="cta-button primary large">
                Get Started Free
              </Link>
            ) : (
              <Link to="/dashboard" className="cta-button primary large">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;