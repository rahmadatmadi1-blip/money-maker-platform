<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-background">
        <div class="hero-pattern"></div>
      </div>
      
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              Welcome to <span class="brand-highlight">PaymentHub</span>
            </h1>
            <p class="hero-subtitle">
              Streamline your payment processing with our secure, fast, and reliable platform.
              Accept payments, manage transactions, and grow your business with confidence.
            </p>
            
            <div class="hero-actions">
              <router-link 
                v-if="!isAuthenticated" 
                to="/register" 
                class="btn btn-primary btn-large"
              >
                Get Started Free
                <i class="fas fa-arrow-right"></i>
              </router-link>
              
              <router-link 
                v-if="!isAuthenticated" 
                to="/login" 
                class="btn btn-secondary btn-large"
              >
                Sign In
              </router-link>
              
              <router-link 
                v-if="isAuthenticated" 
                to="/dashboard" 
                class="btn btn-primary btn-large"
              >
                Go to Dashboard
                <i class="fas fa-tachometer-alt"></i>
              </router-link>
            </div>
          </div>
          
          <div class="hero-visual">
            <div class="hero-card">
              <div class="card-header">
                <div class="card-logo">
                  <i class="fas fa-credit-card"></i>
                </div>
                <div class="card-title">Payment Dashboard</div>
              </div>
              
              <div class="card-stats">
                <div class="stat-item">
                  <div class="stat-value">$24,580</div>
                  <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">1,247</div>
                  <div class="stat-label">Transactions</div>
                </div>
              </div>
              
              <div class="card-chart">
                <div class="chart-bars">
                  <div class="bar" style="height: 60%"></div>
                  <div class="bar" style="height: 80%"></div>
                  <div class="bar" style="height: 45%"></div>
                  <div class="bar" style="height: 90%"></div>
                  <div class="bar" style="height: 70%"></div>
                  <div class="bar" style="height: 85%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Why Choose PaymentHub?</h2>
          <p class="section-subtitle">
            Everything you need to accept payments and manage your business finances
          </p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-shield-alt"></i>
            </div>
            <h3 class="feature-title">Secure & Compliant</h3>
            <p class="feature-description">
              Bank-level security with PCI DSS compliance. Your data and your customers' data are always protected.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-bolt"></i>
            </div>
            <h3 class="feature-title">Lightning Fast</h3>
            <p class="feature-description">
              Process payments in seconds with our optimized infrastructure. No delays, no downtime.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-globe"></i>
            </div>
            <h3 class="feature-title">Global Reach</h3>
            <p class="feature-description">
              Accept payments from customers worldwide with support for multiple currencies and payment methods.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <h3 class="feature-title">Advanced Analytics</h3>
            <p class="feature-description">
              Get detailed insights into your payment data with real-time reporting and analytics.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <h3 class="feature-title">Mobile Ready</h3>
            <p class="feature-description">
              Fully responsive design that works perfectly on all devices. Manage payments on the go.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-headset"></i>
            </div>
            <h3 class="feature-title">24/7 Support</h3>
            <p class="feature-description">
              Our expert support team is available around the clock to help you with any questions.
            </p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">10M+</div>
            <div class="stat-text">Transactions Processed</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">50K+</div>
            <div class="stat-text">Happy Customers</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">99.9%</div>
            <div class="stat-text">Uptime Guarantee</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">150+</div>
            <div class="stat-text">Countries Supported</div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">Ready to Get Started?</h2>
          <p class="cta-subtitle">
            Join thousands of businesses that trust PaymentHub for their payment processing needs.
          </p>
          
          <div class="cta-actions">
            <router-link 
              v-if="!isAuthenticated" 
              to="/register" 
              class="btn btn-primary btn-large"
            >
              Start Free Trial
              <i class="fas fa-rocket"></i>
            </router-link>
            
            <router-link 
              v-if="isAuthenticated" 
              to="/dashboard" 
              class="btn btn-primary btn-large"
            >
              Go to Dashboard
              <i class="fas fa-tachometer-alt"></i>
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'Home',
  
  computed: {
    ...mapGetters('auth', {
      isAuthenticated: 'isAuthenticated',
    }),
  },
  
  mounted() {
    // Set page title
    document.title = 'PaymentHub - Secure Payment Processing Platform';
    
    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Streamline your payment processing with PaymentHub. Secure, fast, and reliable payment platform for businesses of all sizes.');
    }
  },
};
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

// Hero Section
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
}

.hero-pattern {
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
  background-size: 50px 50px;
  background-position: 0 0, 25px 25px;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
}

.hero-text {
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
}

.brand-highlight {
  background: linear-gradient(45deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1.125rem;
  }
}

.hero-actions {
  display: flex;
  gap: 1rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
}

.hero-visual {
  display: flex;
  justify-content: center;
  
  @media (max-width: 768px) {
    order: -1;
  }
}

.hero-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  color: white;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.card-logo {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    font-size: 1.5rem;
  }
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.card-chart {
  height: 100px;
  display: flex;
  align-items: end;
}

.chart-bars {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  height: 100%;
  align-items: end;
}

.bar {
  flex: 1;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.6));
  border-radius: 0.25rem;
  min-height: 20%;
  animation: barGrow 1s ease-out;
}

@keyframes barGrow {
  from {
    height: 0;
  }
}

// Features Section
.features {
  padding: 6rem 0;
  background-color: var(--bg-primary);
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.section-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary);
  }
}

.feature-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: white;
  
  i {
    font-size: 1.5rem;
  }
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.feature-description {
  color: var(--text-secondary);
  line-height: 1.6;
}

// Stats Section
.stats {
  padding: 4rem 0;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.stat-card {
  text-align: center;
  color: white;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
}

.stat-text {
  font-size: 1.125rem;
  opacity: 0.9;
}

// CTA Section
.cta {
  padding: 6rem 0;
  background-color: var(--bg-secondary);
}

.cta-content {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.cta-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: center;
  }
}

// Button Styles
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &.btn-large {
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }
  
  &.btn-primary {
    background-color: var(--primary);
    color: white;
    
    &:hover {
      background-color: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
  }
  
  &.btn-secondary {
    background-color: transparent;
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }
  }
}

// Dark mode adjustments
.dark {
  .features {
    background-color: var(--bg-secondary);
  }
  
  .feature-card {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color-dark);
  }
  
  .cta {
    background-color: var(--bg-tertiary);
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .feature-card {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
  
  .btn {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
  
  .bar {
    animation: none;
  }
}
</style>