import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { title: 'Dashboard', path: '/dashboard' },
      { title: 'Affiliate Marketing', path: '/affiliate' },
      { title: 'E-Commerce', path: '/ecommerce' },
      { title: 'Content Creator', path: '/content' },
      { title: 'Marketplace', path: '/marketplace' }
    ],
    tools: [
      { title: 'Analytics', path: '/analytics' },
      { title: 'Payments', path: '/payments' },
      { title: 'Notifications', path: '/notifications' },
      { title: 'Settings', path: '/settings' }
    ],
    support: [
      { title: 'Help Center', path: '/help' },
      { title: 'Contact Support', path: '/support' },
      { title: 'Documentation', path: '/docs' },
      { title: 'API Reference', path: '/api-docs' }
    ],
    legal: [
      { title: 'Privacy Policy', path: '/privacy' },
      { title: 'Terms of Service', path: '/terms' },
      { title: 'Cookie Policy', path: '/cookies' },
      { title: 'GDPR', path: '/gdpr' }
    ]
  };

  const socialLinks = [
    {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      url: 'https://facebook.com/moneymaker',
      color: '#1877f2'
    },
    {
      name: 'Twitter',
      icon: 'fab fa-twitter',
      url: 'https://twitter.com/moneymaker',
      color: '#1da1f2'
    },
    {
      name: 'Instagram',
      icon: 'fab fa-instagram',
      url: 'https://instagram.com/moneymaker',
      color: '#e4405f'
    },
    {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      url: 'https://linkedin.com/company/moneymaker',
      color: '#0077b5'
    },
    {
      name: 'YouTube',
      icon: 'fab fa-youtube',
      url: 'https://youtube.com/moneymaker',
      color: '#ff0000'
    },
    {
      name: 'Discord',
      icon: 'fab fa-discord',
      url: 'https://discord.gg/moneymaker',
      color: '#5865f2'
    }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="brand-logo">
              <i className="fas fa-dollar-sign"></i>
              <span className="brand-name">Money Maker</span>
            </div>
            <p className="brand-description">
              Platform terlengkap untuk menghasilkan uang dari internet. 
              Mulai dari affiliate marketing, e-commerce, content creation, 
              hingga digital services marketplace.
            </p>
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
                <span className="stat-number">50K+</span>
                <span className="stat-label">Transactions</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          <div className="footer-links">
            <div className="link-group">
              <h4 className="link-title">Platform</h4>
              <ul className="link-list">
                {footerLinks.platform.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h4 className="link-title">Tools</h4>
              <ul className="link-list">
                {footerLinks.tools.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h4 className="link-title">Support</h4>
              <ul className="link-list">
                {footerLinks.support.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h4 className="link-title">Legal</h4>
              <ul className="link-list">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="footer-newsletter">
            <h4 className="newsletter-title">Stay Updated</h4>
            <p className="newsletter-description">
              Dapatkan tips terbaru tentang cara menghasilkan uang online 
              dan update fitur platform langsung ke email Anda.
            </p>
            <form className="newsletter-form">
              <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="newsletter-input"
                  required
                />
                <button type="submit" className="newsletter-btn">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
            <p className="newsletter-note">
              Kami menghormati privasi Anda. Unsubscribe kapan saja.
            </p>
          </div>
        </div>

        {/* Social Media & Bottom Section */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            {/* Social Media */}
            <div className="social-section">
              <h5 className="social-title">Follow Us</h5>
              <div className="social-links">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                    style={{ '--social-color': social.color }}
                    title={social.name}
                  >
                    <i className={social.icon}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* App Download */}
            <div className="app-download">
              <h5 className="download-title">Download Our App</h5>
              <div className="download-buttons">
                <a href="#" className="download-btn">
                  <i className="fab fa-apple"></i>
                  <div className="download-text">
                    <span className="download-label">Download on the</span>
                    <span className="download-store">App Store</span>
                  </div>
                </a>
                <a href="#" className="download-btn">
                  <i className="fab fa-google-play"></i>
                  <div className="download-text">
                    <span className="download-label">Get it on</span>
                    <span className="download-store">Google Play</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Contact Info */}
            <div className="contact-info">
              <h5 className="contact-title">Contact</h5>
              <div className="contact-details">
                <div className="contact-item">
                  <i className="fas fa-envelope"></i>
                  <span>support@moneymaker.com</span>
                </div>
                <div className="contact-item">
                  <i className="fas fa-phone"></i>
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="contact-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>San Francisco, CA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          <div className="copyright-content">
            <div className="copyright-text">
              <p>
                © {currentYear} Money Maker Platform. All rights reserved. 
                Made with <i className="fas fa-heart heart-icon"></i> for entrepreneurs.
              </p>
            </div>
            <div className="copyright-links">
              <Link to="/sitemap" className="copyright-link">Sitemap</Link>
              <Link to="/accessibility" className="copyright-link">Accessibility</Link>
              <Link to="/security" className="copyright-link">Security</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button 
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Back to top"
      >
        <i className="fas fa-chevron-up"></i>
      </button>
    </footer>
  );
};

export default Footer;