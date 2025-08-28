import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, changePassword, loading, error } = useAuth();
  const { addNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    website: '',
    location: '',
    timezone: '',
    avatar: null
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyReports: true,
    theme: 'light',
    language: 'en',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY'
  });
  
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        website: user.website || '',
        location: user.location || '',
        timezone: user.timezone || 'UTC',
        avatar: user.avatar || null
      });
      
      setPreferences({
        emailNotifications: user.preferences?.emailNotifications ?? true,
        pushNotifications: user.preferences?.pushNotifications ?? true,
        marketingEmails: user.preferences?.marketingEmails ?? false,
        weeklyReports: user.preferences?.weeklyReports ?? true,
        theme: user.preferences?.theme || 'light',
        language: user.preferences?.language || 'en',
        currency: user.preferences?.currency || 'USD',
        dateFormat: user.preferences?.dateFormat || 'MM/DD/YYYY'
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await updateProfile({ ...profileData, preferences });
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.'
      });
      setIsEditing(false);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New passwords do not match.'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully.'
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Password Change Failed',
        message: 'Failed to change password. Please check your current password.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswordFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: 'fas fa-user' },
    { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
    { id: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
    { id: 'activity', label: 'Activity Log', icon: 'fas fa-history' }
  ];

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profileData.avatar ? (
                <img src={profileData.avatar} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
              {isEditing && (
                <div className="avatar-upload">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="avatar-upload-btn">
                    <i className="fas fa-camera"></i>
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="profile-email">{user?.email}</p>
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-value">${user?.totalEarnings?.toFixed(2) || '0.00'}</span>
                <span className="stat-label">Total Earnings</span>
              </div>
              <div className="stat">
                <span className="stat-value">{user?.totalReferrals || 0}</span>
                <span className="stat-label">Referrals</span>
              </div>
              <div className="stat">
                <span className="stat-value">{user?.isPremium ? 'Premium' : 'Free'}</span>
                <span className="stat-label">Plan</span>
              </div>
            </div>
          </div>
          
          <div className="profile-actions">
            {!isEditing ? (
              <button 
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                <i className="fas fa-edit"></i>
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn"
                  onClick={handleProfileSubmit}
                  disabled={isSaving}
                >
                  <i className="fas fa-save"></i>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    if (user) {
                      setProfileData({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        bio: user.bio || '',
                        website: user.website || '',
                        location: user.location || '',
                        timezone: user.timezone || 'UTC',
                        avatar: user.avatar || null
                      });
                    }
                  }}
                >
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="profile-tab-content">
          {activeTab === 'profile' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Profile Information</h3>
                <p>Update your personal information and contact details.</p>
              </div>
              
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    rows="4"
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="website">Website</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={profileData.website}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={profileData.location}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={profileData.timezone}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Security Settings</h3>
                <p>Manage your password and security preferences.</p>
              </div>
              
              <div className="security-section">
                <h4>Change Password</h4>
                <form onSubmit={handlePasswordSubmit} className="password-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswordFields.current ? 'text' : 'password'}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        <i className={`fas ${showPasswordFields.current ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswordFields.new ? 'text' : 'password'}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        <i className={`fas ${showPasswordFields.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="password-input">
                      <input
                        type={showPasswordFields.confirm ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        <i className={`fas ${showPasswordFields.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="change-password-btn"
                    disabled={isSaving}
                  >
                    <i className="fas fa-key"></i>
                    {isSaving ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
              
              <div className="security-section">
                <h4>Two-Factor Authentication</h4>
                <div className="security-option">
                  <div className="option-info">
                    <h5>SMS Authentication</h5>
                    <p>Receive verification codes via SMS</p>
                  </div>
                  <button className="setup-btn">
                    <i className="fas fa-mobile-alt"></i>
                    Setup
                  </button>
                </div>
                
                <div className="security-option">
                  <div className="option-info">
                    <h5>Authenticator App</h5>
                    <p>Use an authenticator app for verification</p>
                  </div>
                  <button className="setup-btn">
                    <i className="fas fa-qrcode"></i>
                    Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Preferences</h3>
                <p>Customize your experience and notification settings.</p>
              </div>
              
              <div className="preferences-section">
                <h4>Notifications</h4>
                <div className="preference-group">
                  <div className="preference-item">
                    <div className="preference-info">
                      <h5>Email Notifications</h5>
                      <p>Receive important updates via email</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={preferences.emailNotifications}
                        onChange={handlePreferenceChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="preference-item">
                    <div className="preference-info">
                      <h5>Push Notifications</h5>
                      <p>Receive real-time notifications in your browser</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="pushNotifications"
                        checked={preferences.pushNotifications}
                        onChange={handlePreferenceChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="preference-item">
                    <div className="preference-info">
                      <h5>Marketing Emails</h5>
                      <p>Receive promotional offers and updates</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="marketingEmails"
                        checked={preferences.marketingEmails}
                        onChange={handlePreferenceChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="preference-item">
                    <div className="preference-info">
                      <h5>Weekly Reports</h5>
                      <p>Receive weekly performance summaries</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="weeklyReports"
                        checked={preferences.weeklyReports}
                        onChange={handlePreferenceChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="preferences-section">
                <h4>Display & Language</h4>
                <div className="preference-group">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="theme">Theme</label>
                      <select
                        id="theme"
                        name="theme"
                        value={preferences.theme}
                        onChange={handlePreferenceChange}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="language">Language</label>
                      <select
                        id="language"
                        name="language"
                        value={preferences.language}
                        onChange={handlePreferenceChange}
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="currency">Currency</label>
                      <select
                        id="currency"
                        name="currency"
                        value={preferences.currency}
                        onChange={handlePreferenceChange}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="AUD">AUD (A$)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="dateFormat">Date Format</label>
                      <select
                        id="dateFormat"
                        name="dateFormat"
                        value={preferences.dateFormat}
                        onChange={handlePreferenceChange}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="preferences-actions">
                <button 
                  className="save-preferences-btn"
                  onClick={handleProfileSubmit}
                  disabled={isSaving}
                >
                  <i className="fas fa-save"></i>
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-panel">
              <div className="panel-header">
                <h3>Activity Log</h3>
                <p>View your recent account activity and login history.</p>
              </div>
              
              <div className="activity-section">
                <div className="activity-filters">
                  <select className="filter-select">
                    <option value="all">All Activities</option>
                    <option value="login">Login Events</option>
                    <option value="profile">Profile Changes</option>
                    <option value="security">Security Events</option>
                    <option value="earnings">Earnings</option>
                  </select>
                  
                  <select className="filter-select">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon login">
                      <i className="fas fa-sign-in-alt"></i>
                    </div>
                    <div className="activity-content">
                      <h5>Successful Login</h5>
                      <p>Logged in from Chrome on Windows</p>
                      <span className="activity-time">2 hours ago</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <div className="activity-icon profile">
                      <i className="fas fa-user-edit"></i>
                    </div>
                    <div className="activity-content">
                      <h5>Profile Updated</h5>
                      <p>Updated bio and contact information</p>
                      <span className="activity-time">1 day ago</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <div className="activity-icon earnings">
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div className="activity-content">
                      <h5>Earnings Received</h5>
                      <p>Commission from affiliate link click</p>
                      <span className="activity-time">2 days ago</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <div className="activity-icon security">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className="activity-content">
                      <h5>Password Changed</h5>
                      <p>Password was successfully updated</p>
                      <span className="activity-time">1 week ago</span>
                    </div>
                  </div>
                </div>
                
                <div className="activity-pagination">
                  <button className="pagination-btn" disabled>
                    <i className="fas fa-chevron-left"></i>
                    Previous
                  </button>
                  <span className="pagination-info">Page 1 of 3</span>
                  <button className="pagination-btn">
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;