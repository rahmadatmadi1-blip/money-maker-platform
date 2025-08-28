import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './HelpCenter.css';

const HelpCenter = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium',
    category: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState([]);

  // Mock FAQ data
  const faqData = {
    'getting-started': [
      {
        id: 'gs-1',
        title: 'How to set up your account',
        content: `<p>Setting up your account is easy! Follow these steps:</p>
          <ol>
            <li>Complete your profile information in the <strong>Profile</strong> section</li>
            <li>Set up your payment methods in the <strong>Payments</strong> section</li>
            <li>Configure your notification preferences in <strong>Settings</strong></li>
            <li>Create your first affiliate link in the <strong>Dashboard</strong></li>
          </ol>
          <p>For more detailed instructions, check out our <a href="#">complete setup guide</a>.</p>`
      },
      {
        id: 'gs-2',
        title: 'Platform overview and key features',
        content: `<p>Our platform offers a comprehensive suite of tools to help you monetize your online presence:</p>
          <ul>
            <li><strong>Affiliate Marketing:</strong> Create and track custom affiliate links</li>
            <li><strong>Digital Products:</strong> Sell your own digital products with our e-commerce tools</li>
            <li><strong>Services Marketplace:</strong> Offer your services to clients worldwide</li>
            <li><strong>Content Monetization:</strong> Monetize your blog, videos, and social media content</li>
            <li><strong>Analytics:</strong> Track your performance with detailed analytics</li>
          </ul>
          <p>Explore each section through the main navigation menu to discover all available features.</p>`
      },
      {
        id: 'gs-3',
        title: 'Creating your first affiliate link',
        content: `<p>To create your first affiliate link:</p>
          <ol>
            <li>Go to the <strong>Dashboard</strong> and click on "Create Link"</li>
            <li>Enter the destination URL you want to promote</li>
            <li>Choose a campaign name to organize your links</li>
            <li>Select tracking parameters (optional)</li>
            <li>Click "Generate Link"</li>
            <li>Copy your new affiliate link and start sharing!</li>
          </ol>
          <p>Your link performance will be tracked automatically in the Analytics section.</p>`
      },
      {
        id: 'gs-4',
        title: 'Understanding your dashboard',
        content: `<p>Your dashboard provides a quick overview of your performance and key metrics:</p>
          <ul>
            <li><strong>Revenue Summary:</strong> Your current earnings, pending payments, and available balance</li>
            <li><strong>Performance Metrics:</strong> Clicks, conversions, and conversion rate</li>
            <li><strong>Quick Actions:</strong> Shortcuts to common tasks like creating links or withdrawing funds</li>
            <li><strong>Recent Activity:</strong> Latest clicks, sales, and commissions</li>
            <li><strong>Top Performers:</strong> Your best-performing links and products</li>
          </ul>
          <p>Customize your dashboard view in the <strong>Settings</strong> section under "Display Preferences."</p>`
      }
    ],
    'affiliate-marketing': [
      {
        id: 'am-1',
        title: 'How affiliate commissions work',
        content: `<p>Affiliate commissions are earned when someone makes a purchase through your unique affiliate link. Here's how it works:</p>
          <ol>
            <li>You share your affiliate link with your audience</li>
            <li>A visitor clicks on your link (tracked by our system)</li>
            <li>The visitor makes a purchase on the merchant's website</li>
            <li>The merchant confirms the sale and commission</li>
            <li>The commission is added to your account</li>
          </ol>
          <p>Commission rates vary by merchant and product. You can view specific commission rates in the Marketplace section.</p>`
      },
      {
        id: 'am-2',
        title: 'Tracking link performance',
        content: `<p>Our platform provides detailed tracking for all your affiliate links:</p>
          <ul>
            <li><strong>Clicks:</strong> Number of times your link was clicked</li>
            <li><strong>Unique Visitors:</strong> Number of individual people who clicked your link</li>
            <li><strong>Conversions:</strong> Number of sales or actions completed</li>
            <li><strong>Conversion Rate:</strong> Percentage of clicks that resulted in a conversion</li>
            <li><strong>Revenue:</strong> Total earnings from conversions</li>
            <li><strong>EPC (Earnings Per Click):</strong> Average earnings per click</li>
          </ul>
          <p>Access detailed reports in the <strong>Analytics</strong> section, where you can filter by date range, campaign, or specific links.</p>`
      },
      {
        id: 'am-3',
        title: 'Best practices for affiliate marketing',
        content: `<p>Follow these best practices to maximize your affiliate marketing success:</p>
          <ul>
            <li><strong>Know Your Audience:</strong> Promote products that are relevant to your audience's interests and needs</li>
            <li><strong>Be Transparent:</strong> Always disclose your affiliate relationships to maintain trust</li>
            <li><strong>Create Valuable Content:</strong> Focus on helping your audience solve problems rather than just selling</li>
            <li><strong>Test Different Approaches:</strong> Try various content formats, call-to-actions, and placements</li>
            <li><strong>Track and Optimize:</strong> Use our analytics to identify what's working and improve your strategy</li>
            <li><strong>Build Relationships:</strong> Connect with merchants to negotiate better rates or exclusive deals</li>
          </ul>
          <p>Check out our <a href="#">Affiliate Marketing Guide</a> for more detailed strategies and tips.</p>`
      }
    ],
    'payments': [
      {
        id: 'pm-1',
        title: 'Payment methods and withdrawal options',
        content: `<p>We offer several payment methods for withdrawing your earnings:</p>
          <ul>
            <li><strong>PayPal:</strong> Fast processing with 2-3 business days for funds to arrive</li>
            <li><strong>Bank Transfer:</strong> Direct deposit to your bank account (3-5 business days)</li>
            <li><strong>Wise (formerly TransferWise):</strong> Good for international payments with competitive rates</li>
            <li><strong>Cryptocurrency:</strong> Withdraw in Bitcoin, Ethereum, or USDC</li>
            <li><strong>Payoneer:</strong> Alternative for regions where PayPal isn't available</li>
          </ul>
          <p>Set up your preferred payment methods in the <strong>Payments</strong> section under "Payment Methods."</p>`
      },
      {
        id: 'pm-2',
        title: 'Understanding payment schedules',
        content: `<p>Our payment schedule works as follows:</p>
          <ul>
            <li><strong>Earning Period:</strong> Commissions are tracked throughout the month</li>
            <li><strong>Pending Period:</strong> Earnings have a 30-day pending period to allow for returns/refunds</li>
            <li><strong>Available Balance:</strong> After the pending period, earnings move to your available balance</li>
            <li><strong>Withdrawal Requests:</strong> You can request withdrawals once your available balance meets the minimum threshold</li>
            <li><strong>Processing Time:</strong> Withdrawals are processed within 1-3 business days</li>
          </ul>
          <p>The minimum withdrawal amount is $50 for most payment methods. You can view your current balance and pending earnings in the Payments section.</p>`
      },
      {
        id: 'pm-3',
        title: 'Tax information and reporting',
        content: `<p>Important tax information for affiliates:</p>
          <ul>
            <li>You're responsible for reporting income earned through our platform on your tax returns</li>
            <li>For US affiliates earning over $600 annually, we'll issue a 1099-MISC form</li>
            <li>International affiliates should consult local tax laws regarding reporting requirements</li>
            <li>You can update your tax information in the <strong>Settings</strong> section under "Tax Information"</li>
            <li>We provide annual earnings statements that you can download for your records</li>
          </ul>
          <p>Please consult with a tax professional for advice specific to your situation.</p>`
      }
    ],
    'technical-support': [
      {
        id: 'ts-1',
        title: 'Troubleshooting tracking issues',
        content: `<p>If you're experiencing tracking issues with your affiliate links, try these solutions:</p>
          <ol>
            <li><strong>Check Link Format:</strong> Ensure your affiliate link is correctly formatted</li>
            <li><strong>Browser Testing:</strong> Test your link in different browsers and devices</li>
            <li><strong>Clear Cache:</strong> Clear your browser cache and cookies before testing</li>
            <li><strong>Ad Blockers:</strong> Disable ad blockers which may interfere with tracking</li>
            <li><strong>Redirect Issues:</strong> Check if the destination site has changed its URL structure</li>
            <li><strong>Tracking Parameters:</strong> Verify that UTM parameters are correctly applied</li>
          </ol>
          <p>If problems persist, please contact our support team with specific examples of the issues you're experiencing.</p>`
      },
      {
        id: 'ts-2',
        title: 'Account security best practices',
        content: `<p>Protect your account with these security best practices:</p>
          <ul>
            <li><strong>Strong Password:</strong> Use a unique, complex password with at least 12 characters</li>
            <li><strong>Two-Factor Authentication:</strong> Enable 2FA in your security settings</li>
            <li><strong>Regular Monitoring:</strong> Check your account activity regularly for suspicious actions</li>
            <li><strong>Secure Devices:</strong> Only access your account from trusted devices and networks</li>
            <li><strong>Phishing Awareness:</strong> Be cautious of emails requesting your login credentials</li>
            <li><strong>Session Management:</strong> Log out when using shared computers</li>
          </ul>
          <p>If you suspect unauthorized access to your account, change your password immediately and contact support.</p>`
      },
      {
        id: 'ts-3',
        title: 'API integration guide',
        content: `<p>Our API allows you to integrate our platform with your own systems:</p>
          <ol>
            <li><strong>Generate API Key:</strong> Create your API key in the Settings section under "Advanced"</li>
            <li><strong>Read Documentation:</strong> Review our <a href="#">API documentation</a> for endpoints and parameters</li>
            <li><strong>Authentication:</strong> Use your API key in the header of all requests</li>
            <li><strong>Rate Limits:</strong> Note that API calls are limited to 100 requests per minute</li>
            <li><strong>Webhooks:</strong> Set up webhooks to receive real-time notifications of events</li>
          </ol>
          <p>Common API use cases include automated link creation, performance data retrieval, and commission tracking integration.</p>`
      }
    ],
    'policies': [
      {
        id: 'po-1',
        title: 'Terms of Service',
        content: `<p>Our Terms of Service outline the rules and guidelines for using our platform. Key points include:</p>
          <ul>
            <li>Prohibited promotional methods (spam, misleading claims, etc.)</li>
            <li>Content guidelines and restrictions</li>
            <li>Account termination conditions</li>
            <li>Payment terms and commission structures</li>
            <li>Intellectual property rights</li>
            <li>Limitation of liability</li>
          </ul>
          <p>Read the <a href="#">full Terms of Service</a> for complete details.</p>`
      },
      {
        id: 'po-2',
        title: 'Privacy Policy',
        content: `<p>Our Privacy Policy explains how we collect, use, and protect your personal information:</p>
          <ul>
            <li>Types of data we collect and why</li>
            <li>How we use cookies and tracking technologies</li>
            <li>Data sharing with third parties</li>
            <li>Your rights regarding your personal data</li>
            <li>Data retention periods</li>
            <li>Security measures to protect your information</li>
          </ul>
          <p>View the <a href="#">complete Privacy Policy</a> for more information.</p>`
      },
      {
        id: 'po-3',
        title: 'Affiliate Program Guidelines',
        content: `<p>Our Affiliate Program Guidelines establish the standards for participation:</p>
          <ul>
            <li>Acceptable promotional methods and channels</li>
            <li>Prohibited activities (bid on branded terms, cookie stuffing, etc.)</li>
            <li>Commission structure and payment terms</li>
            <li>Approval process for affiliates</li>
            <li>Compliance with FTC disclosure requirements</li>
            <li>Program changes and termination conditions</li>
          </ul>
          <p>Review the <a href="#">full Affiliate Program Guidelines</a> to ensure compliance.</p>`
      }
    ]
  };

  // Mock popular articles
  const popularArticles = [
    { id: 'gs-1', title: 'How to set up your account', category: 'getting-started' },
    { id: 'pm-1', title: 'Payment methods and withdrawal options', category: 'payments' },
    { id: 'am-3', title: 'Best practices for affiliate marketing', category: 'affiliate-marketing' },
    { id: 'ts-2', title: 'Account security best practices', category: 'technical-support' }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // In a real app, this would search through articles
    // For now, just show a notification
    addNotification({
      type: 'info',
      title: 'Search Results',
      message: `Showing results for "${searchQuery}"`
    });
  };

  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        title: 'Support Request Sent',
        message: 'We\'ve received your request and will respond shortly.'
      });
      
      // Reset form
      setContactForm({
        subject: '',
        message: '',
        priority: 'medium',
        category: 'general'
      });
      
      setShowContactForm(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Request Failed',
        message: 'Failed to send your request. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArticle = (articleId) => {
    setExpandedArticles(prev => {
      if (prev.includes(articleId)) {
        return prev.filter(id => id !== articleId);
      } else {
        return [...prev, articleId];
      }
    });
  };

  const filteredArticles = searchQuery.trim() !== '' 
    ? Object.values(faqData).flat().filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqData[activeCategory] || [];

  if (loading) {
    return (
      <div className="help-center-loading">
        <div className="loading-spinner">
          <i className="fas fa-question-circle"></i>
        </div>
        <h3>Loading Help Center</h3>
        <p>Please wait while we gather resources for you...</p>
      </div>
    );
  }

  return (
    <div className="help-center-container">
      {/* Header */}
      <div className="help-center-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-question-circle"></i>
              Help Center
            </h1>
            <p>Find answers, guides, and support for all your questions</p>
          </div>
          <div className="search-container">
            <form onSubmit={handleSearch}>
              <div className="search-input">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Search for help articles..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="search-btn">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="help-center-content">
        <div className="help-center-layout">
          {/* Sidebar */}
          <div className="help-sidebar">
            <div className="sidebar-section">
              <h3>Help Categories</h3>
              <ul className="category-list">
                <li>
                  <button 
                    className={activeCategory === 'getting-started' ? 'active' : ''}
                    onClick={() => {
                      setActiveCategory('getting-started');
                      setSearchQuery('');
                    }}
                  >
                    <i className="fas fa-rocket"></i>
                    Getting Started
                  </button>
                </li>
                <li>
                  <button 
                    className={activeCategory === 'affiliate-marketing' ? 'active' : ''}
                    onClick={() => {
                      setActiveCategory('affiliate-marketing');
                      setSearchQuery('');
                    }}
                  >
                    <i className="fas fa-link"></i>
                    Affiliate Marketing
                  </button>
                </li>
                <li>
                  <button 
                    className={activeCategory === 'payments' ? 'active' : ''}
                    onClick={() => {
                      setActiveCategory('payments');
                      setSearchQuery('');
                    }}
                  >
                    <i className="fas fa-credit-card"></i>
                    Payments & Withdrawals
                  </button>
                </li>
                <li>
                  <button 
                    className={activeCategory === 'technical-support' ? 'active' : ''}
                    onClick={() => {
                      setActiveCategory('technical-support');
                      setSearchQuery('');
                    }}
                  >
                    <i className="fas fa-tools"></i>
                    Technical Support
                  </button>
                </li>
                <li>
                  <button 
                    className={activeCategory === 'policies' ? 'active' : ''}
                    onClick={() => {
                      setActiveCategory('policies');
                      setSearchQuery('');
                    }}
                  >
                    <i className="fas fa-file-alt"></i>
                    Policies & Guidelines
                  </button>
                </li>
              </ul>
            </div>

            <div className="sidebar-section">
              <h3>Popular Articles</h3>
              <ul className="popular-articles">
                {popularArticles.map(article => (
                  <li key={article.id}>
                    <button 
                      onClick={() => {
                        setActiveCategory(article.category);
                        setSearchQuery('');
                        setTimeout(() => {
                          const element = document.getElementById(article.id);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                            if (!expandedArticles.includes(article.id)) {
                              toggleArticle(article.id);
                            }
                          }
                        }, 100);
                      }}
                    >
                      <i className="fas fa-star"></i>
                      {article.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-section contact-support">
              <h3>Need More Help?</h3>
              <p>Can't find what you're looking for? Our support team is here to help.</p>
              <button 
                className="contact-btn"
                onClick={() => setShowContactForm(!showContactForm)}
              >
                <i className="fas fa-envelope"></i>
                Contact Support
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="help-main-content">
            {searchQuery.trim() !== '' ? (
              <div className="search-results">
                <h2>Search Results for "{searchQuery}"</h2>
                {filteredArticles.length > 0 ? (
                  <div className="faq-list">
                    {filteredArticles.map(article => (
                      <div 
                        key={article.id} 
                        id={article.id}
                        className={`faq-item ${expandedArticles.includes(article.id) ? 'expanded' : ''}`}
                      >
                        <div 
                          className="faq-question"
                          onClick={() => toggleArticle(article.id)}
                        >
                          <h3>{article.title}</h3>
                          <span className="toggle-icon">
                            <i className={`fas fa-chevron-${expandedArticles.includes(article.id) ? 'up' : 'down'}`}></i>
                          </span>
                        </div>
                        {expandedArticles.includes(article.id) && (
                          <div 
                            className="faq-answer"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">
                    <i className="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>We couldn't find any articles matching your search. Try different keywords or browse the categories.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="category-content">
                <h2>
                  {activeCategory === 'getting-started' && 'Getting Started'}
                  {activeCategory === 'affiliate-marketing' && 'Affiliate Marketing'}
                  {activeCategory === 'payments' && 'Payments & Withdrawals'}
                  {activeCategory === 'technical-support' && 'Technical Support'}
                  {activeCategory === 'policies' && 'Policies & Guidelines'}
                </h2>
                <p className="category-description">
                  {activeCategory === 'getting-started' && 'Learn the basics of setting up and using our platform.'}
                  {activeCategory === 'affiliate-marketing' && 'Everything you need to know about affiliate marketing strategies and best practices.'}
                  {activeCategory === 'payments' && 'Information about payment methods, schedules, and tax considerations.'}
                  {activeCategory === 'technical-support' && 'Solutions for common technical issues and security best practices.'}
                  {activeCategory === 'policies' && 'Important policies, terms, and guidelines for using our platform.'}
                </p>

                <div className="faq-list">
                  {faqData[activeCategory]?.map(article => (
                    <div 
                      key={article.id} 
                      id={article.id}
                      className={`faq-item ${expandedArticles.includes(article.id) ? 'expanded' : ''}`}
                    >
                      <div 
                        className="faq-question"
                        onClick={() => toggleArticle(article.id)}
                      >
                        <h3>{article.title}</h3>
                        <span className="toggle-icon">
                          <i className={`fas fa-chevron-${expandedArticles.includes(article.id) ? 'up' : 'down'}`}></i>
                        </span>
                      </div>
                      {expandedArticles.includes(article.id) && (
                        <div 
                          className="faq-answer"
                          dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="contact-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Contact Support</h2>
              <button 
                className="close-btn"
                onClick={() => setShowContactForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleContactFormChange}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={contactForm.category}
                    onChange={handleContactFormChange}
                    required
                  >
                    <option value="general">General Question</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="account">Account Management</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={contactForm.priority}
                    onChange={handleContactFormChange}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactFormChange}
                  placeholder="Please describe your issue in detail"
                  rows={6}
                  required
                ></textarea>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowContactForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Sending...
                    </>
                  ) : (
                    <>Send Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;