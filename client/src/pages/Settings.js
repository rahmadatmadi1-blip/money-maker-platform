import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      theme: 'light',
      compactMode: false
    },
    notifications: {
      email: {
        earnings: true,
        withdrawals: true,
        marketing: false,
        system: true,
        security: true,
        weekly_summary: true
      },
      push: {
        earnings: true,
        withdrawals: true,
        marketing: false,
        system: false,
        security: true,
        weekly_summary: false
      },
      sms: {
        earnings: false,
        withdrawals: true,
        marketing: false,
        system: false,
        security: true,
        weekly_summary: false
      }
    },
    privacy: {
      profileVisibility: 'public',
      showEarnings: false,
      showActivity: true,
      allowMessages: true,
      dataCollection: true,
      analytics: true
    },
    security: {
      twoFactorAuth: false,
      loginNotifications: true,
      sessionTimeout: 30,
      passwordExpiry: 90,
      ipWhitelist: [],
      apiAccess: false
    },
    integrations: {
      googleAnalytics: {
        enabled: false,
        trackingId: ''
      },
      facebook: {
        enabled: false,
        pixelId: ''
      },
      zapier: {
        enabled: false,
        webhookUrl: ''
      },
      slack: {
        enabled: false,
        webhookUrl: ''
      }
    },
    advanced: {
      apiKey: 'sk_live_' + Math.random().toString(36).substr(2, 32),
      webhookUrl: '',
      customDomain: '',
      whiteLabel: false,
      customCss: '',
      debugMode: false
    }
  });

  useEffect(() => {
    // Simulate loading settings
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleNestedSettingChange = (section, subsection, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [key]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your settings have been successfully updated.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      // Reset to default settings
      setSettings({
        general: {
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          theme: 'light',
          compactMode: false
        },
        notifications: {
          email: {
            earnings: true,
            withdrawals: true,
            marketing: false,
            system: true,
            security: true,
            weekly_summary: true
          },
          push: {
            earnings: true,
            withdrawals: true,
            marketing: false,
            system: false,
            security: true,
            weekly_summary: false
          },
          sms: {
            earnings: false,
            withdrawals: true,
            marketing: false,
            system: false,
            security: true,
            weekly_summary: false
          }
        },
        privacy: {
          profileVisibility: 'public',
          showEarnings: false,
          showActivity: true,
          allowMessages: true,
          dataCollection: true,
          analytics: true
        },
        security: {
          twoFactorAuth: false,
          loginNotifications: true,
          sessionTimeout: 30,
          passwordExpiry: 90,
          ipWhitelist: [],
          apiAccess: false
        },
        integrations: {
          googleAnalytics: {
            enabled: false,
            trackingId: ''
          },
          facebook: {
            enabled: false,
            pixelId: ''
          },
          zapier: {
            enabled: false,
            webhookUrl: ''
          },
          slack: {
            enabled: false,
            webhookUrl: ''
          }
        },
        advanced: {
          apiKey: 'sk_live_' + Math.random().toString(36).substr(2, 32),
          webhookUrl: '',
          customDomain: '',
          whiteLabel: false,
          customCss: '',
          debugMode: false
        }
      });
      
      addNotification({
        type: 'info',
        title: 'Settings Reset',
        message: 'All settings have been reset to default values.'
      });
    }
  };

  const generateNewApiKey = () => {
    const newApiKey = 'sk_live_' + Math.random().toString(36).substr(2, 32);
    handleSettingChange('advanced', 'apiKey', newApiKey);
    
    addNotification({
      type: 'success',
      title: 'API Key Generated',
      message: 'A new API key has been generated. Make sure to update your integrations.'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({
        type: 'success',
        title: 'Copied',
        message: 'Text copied to clipboard.'
      });
    });
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner">
          <i className="fas fa-cog"></i>
        </div>
        <h3>Loading Settings</h3>
        <p>Please wait while we load your preferences...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              <i className="fas fa-cog"></i>
              Settings
            </h1>
            <p>Customize your platform experience and preferences</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn secondary"
              onClick={handleResetSettings}
            >
              <i className="fas fa-undo"></i>
              Reset to Default
            </button>
            <button 
              className="action-btn primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="settings-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <i className="fas fa-sliders-h"></i>
            General
          </button>
          <button 
            className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <i className="fas fa-bell"></i>
            Notifications
          </button>
          <button 
            className={`nav-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <i className="fas fa-shield-alt"></i>
            Privacy
          </button>
          <button 
            className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="fas fa-lock"></i>
            Security
          </button>
          <button 
            className={`nav-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <i className="fas fa-plug"></i>
            Integrations
          </button>
          <button 
            className={`nav-tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <i className="fas fa-code"></i>
            Advanced
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>General Settings</h3>
              <p>Configure your basic platform preferences</p>
            </div>

            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-header">
                  <h4>Language & Region</h4>
                  <p>Set your preferred language and regional settings</p>
                </div>
                <div className="setting-content">
                  <div className="form-group">
                    <label>Language</label>
                    <select 
                      value={settings.general.language}
                      onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <select 
                      value={settings.general.timezone}
                      onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select 
                      value={settings.general.currency}
                      onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date Format</label>
                    <select 
                      value={settings.general.dateFormat}
                      onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD MMM YYYY">DD MMM YYYY</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <h4>Display Preferences</h4>
                  <p>Customize how the platform looks and feels</p>
                </div>
                <div className="setting-content">
                  <div className="form-group">
                    <label>Theme</label>
                    <select 
                      value={settings.general.theme}
                      onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Compact Mode</span>
                      <span className="toggle-description">Reduce spacing and padding for a more compact interface</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.general.compactMode}
                        onChange={(e) => handleSettingChange('general', 'compactMode', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>Notification Settings</h3>
              <p>Control how and when you receive notifications</p>
            </div>

            <div className="notification-channels">
              {Object.entries(settings.notifications).map(([channel, channelSettings]) => (
                <div key={channel} className="channel-card">
                  <div className="channel-header">
                    <h4>
                      <i className={`fas fa-${
                        channel === 'email' ? 'envelope' : 
                        channel === 'push' ? 'mobile-alt' : 'sms'
                      }`}></i>
                      {channel.charAt(0).toUpperCase() + channel.slice(1)} Notifications
                    </h4>
                    <p>
                      {channel === 'email' && 'Receive notifications via email'}
                      {channel === 'push' && 'Receive push notifications in your browser'}
                      {channel === 'sms' && 'Receive SMS notifications on your phone'}
                    </p>
                  </div>
                  <div className="channel-settings">
                    {Object.entries(channelSettings).map(([type, enabled]) => (
                      <div key={type} className="notification-setting">
                        <div className="setting-info">
                          <span className="setting-label">
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="setting-description">
                            {type === 'earnings' && 'New commissions and revenue updates'}
                            {type === 'withdrawals' && 'Payment processing and withdrawal status'}
                            {type === 'marketing' && 'New campaigns and promotional offers'}
                            {type === 'system' && 'Platform updates and maintenance notices'}
                            {type === 'security' && 'Security alerts and login notifications'}
                            {type === 'weekly_summary' && 'Weekly performance summary reports'}
                          </span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleNestedSettingChange('notifications', channel, type, e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        {activeTab === 'privacy' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>Privacy Settings</h3>
              <p>Control your privacy and data sharing preferences</p>
            </div>

            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-header">
                  <h4>Profile Visibility</h4>
                  <p>Control who can see your profile and activity</p>
                </div>
                <div className="setting-content">
                  <div className="form-group">
                    <label>Profile Visibility</label>
                    <select 
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Show Earnings</span>
                      <span className="toggle-description">Display your earnings on your public profile</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showEarnings}
                        onChange={(e) => handleSettingChange('privacy', 'showEarnings', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Show Activity</span>
                      <span className="toggle-description">Display your recent activity on your profile</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showActivity}
                        onChange={(e) => handleSettingChange('privacy', 'showActivity', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Allow Messages</span>
                      <span className="toggle-description">Allow other users to send you messages</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.privacy.allowMessages}
                        onChange={(e) => handleSettingChange('privacy', 'allowMessages', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <h4>Data & Analytics</h4>
                  <p>Control how your data is collected and used</p>
                </div>
                <div className="setting-content">
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Data Collection</span>
                      <span className="toggle-description">Allow collection of usage data to improve the platform</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.privacy.dataCollection}
                        onChange={(e) => handleSettingChange('privacy', 'dataCollection', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Analytics</span>
                      <span className="toggle-description">Enable analytics tracking for performance insights</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.privacy.analytics}
                        onChange={(e) => handleSettingChange('privacy', 'analytics', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>Security Settings</h3>
              <p>Enhance your account security and access controls</p>
            </div>

            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-header">
                  <h4>Authentication</h4>
                  <p>Manage your login and authentication preferences</p>
                </div>
                <div className="setting-content">
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Two-Factor Authentication</span>
                      <span className="toggle-description">Add an extra layer of security to your account</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Login Notifications</span>
                      <span className="toggle-description">Get notified when someone logs into your account</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.security.loginNotifications}
                        onChange={(e) => handleSettingChange('security', 'loginNotifications', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Session Timeout (minutes)</label>
                    <select 
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={480}>8 hours</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Password Expiry (days)</label>
                    <select 
                      value={settings.security.passwordExpiry}
                      onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>1 year</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <h4>API Access</h4>
                  <p>Manage API access and developer settings</p>
                </div>
                <div className="setting-content">
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">API Access</span>
                      <span className="toggle-description">Enable API access for third-party integrations</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.security.apiAccess}
                        onChange={(e) => handleSettingChange('security', 'apiAccess', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Settings */}
        {activeTab === 'integrations' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>Integrations</h3>
              <p>Connect with third-party services and tools</p>
            </div>

            <div className="integrations-grid">
              {Object.entries(settings.integrations).map(([service, config]) => (
                <div key={service} className="integration-card">
                  <div className="integration-header">
                    <div className="integration-info">
                      <h4>
                        <i className={`fab fa-${
                          service === 'googleAnalytics' ? 'google' :
                          service === 'facebook' ? 'facebook' :
                          service === 'zapier' ? 'zapier' :
                          service === 'slack' ? 'slack' : 'plug'
                        }`}></i>
                        {service === 'googleAnalytics' ? 'Google Analytics' :
                         service === 'facebook' ? 'Facebook Pixel' :
                         service.charAt(0).toUpperCase() + service.slice(1)}
                      </h4>
                      <p>
                        {service === 'googleAnalytics' && 'Track website analytics and user behavior'}
                        {service === 'facebook' && 'Track conversions and optimize ad campaigns'}
                        {service === 'zapier' && 'Automate workflows with 3000+ apps'}
                        {service === 'slack' && 'Get notifications in your Slack workspace'}
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleNestedSettingChange('integrations', service, 'enabled', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  {config.enabled && (
                    <div className="integration-config">
                      {service === 'googleAnalytics' && (
                        <div className="form-group">
                          <label>Tracking ID</label>
                          <input
                            type="text"
                            placeholder="GA-XXXXXXXXX-X"
                            value={config.trackingId}
                            onChange={(e) => handleNestedSettingChange('integrations', service, 'trackingId', e.target.value)}
                          />
                        </div>
                      )}
                      {service === 'facebook' && (
                        <div className="form-group">
                          <label>Pixel ID</label>
                          <input
                            type="text"
                            placeholder="123456789012345"
                            value={config.pixelId}
                            onChange={(e) => handleNestedSettingChange('integrations', service, 'pixelId', e.target.value)}
                          />
                        </div>
                      )}
                      {(service === 'zapier' || service === 'slack') && (
                        <div className="form-group">
                          <label>Webhook URL</label>
                          <input
                            type="url"
                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                            value={config.webhookUrl}
                            onChange={(e) => handleNestedSettingChange('integrations', service, 'webhookUrl', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {activeTab === 'advanced' && (
          <div className="settings-section">
            <div className="section-header">
              <h3>Advanced Settings</h3>
              <p>Developer tools and advanced configuration options</p>
            </div>

            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-header">
                  <h4>API Configuration</h4>
                  <p>Manage your API keys and webhook settings</p>
                </div>
                <div className="setting-content">
                  <div className="form-group">
                    <label>API Key</label>
                    <div className="input-group">
                      <input
                        type="text"
                        value={settings.advanced.apiKey}
                        readOnly
                        className="monospace"
                      />
                      <button 
                        type="button" 
                        className="btn secondary"
                        onClick={() => copyToClipboard(settings.advanced.apiKey)}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                      <button 
                        type="button" 
                        className="btn primary"
                        onClick={generateNewApiKey}
                      >
                        <i className="fas fa-sync"></i>
                        Generate New
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://your-domain.com/webhook"
                      value={settings.advanced.webhookUrl}
                      onChange={(e) => handleSettingChange('advanced', 'webhookUrl', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <h4>White Label</h4>
                  <p>Customize the platform branding and appearance</p>
                </div>
                <div className="setting-content">
                  <div className="form-group">
                    <label>Custom Domain</label>
                    <input
                      type="text"
                      placeholder="your-domain.com"
                      value={settings.advanced.customDomain}
                      onChange={(e) => handleSettingChange('advanced', 'customDomain', e.target.value)}
                    />
                  </div>
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">White Label Mode</span>
                      <span className="toggle-description">Remove platform branding and use your own</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.advanced.whiteLabel}
                        onChange={(e) => handleSettingChange('advanced', 'whiteLabel', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Custom CSS</label>
                    <textarea
                      rows={6}
                      placeholder="/* Add your custom CSS here */"
                      value={settings.advanced.customCss}
                      onChange={(e) => handleSettingChange('advanced', 'customCss', e.target.value)}
                      className="monospace"
                    />
                  </div>
                </div>
              </div>

              <div className="setting-card">
                <div className="setting-header">
                  <h4>Developer Options</h4>
                  <p>Tools and options for developers and advanced users</p>
                </div>
                <div className="setting-content">
                  <div className="toggle-setting">
                    <div className="toggle-info">
                      <span className="toggle-label">Debug Mode</span>
                      <span className="toggle-description">Enable debug logging and developer tools</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.advanced.debugMode}
                        onChange={(e) => handleSettingChange('advanced', 'debugMode', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;