<template>
  <nav class="app-navigation">
    <div class="nav-container">
      <!-- Logo and Brand -->
      <div class="nav-brand">
        <router-link to="/dashboard" class="brand-link">
          <img src="/images/logo.svg" alt="Money Maker Platform" class="brand-logo" />
          <span class="brand-text">Money Maker</span>
        </router-link>
      </div>

      <!-- Mobile Menu Toggle -->
      <button 
        class="mobile-menu-toggle md:hidden"
        @click="toggleMobileMenu"
        :aria-expanded="mobileMenuOpen"
        aria-label="Toggle navigation menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            v-if="!mobileMenuOpen"
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 6h16M4 12h16M4 18h16"
          />
          <path 
            v-else
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <!-- Desktop Navigation -->
      <div class="nav-menu hidden md:flex">
        <router-link 
          v-for="item in navigationItems" 
          :key="item.name"
          :to="item.to"
          class="nav-link"
          :class="{ 'active': isActiveRoute(item.to) }"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span>{{ item.name }}</span>
        </router-link>
      </div>

      <!-- Right Side Actions -->
      <div class="nav-actions">
        <!-- Search -->
        <button 
          class="action-button"
          @click="openSearch"
          title="Search (Ctrl+K)"
        >
          <i class="fas fa-search"></i>
        </button>

        <!-- Notifications -->
        <div class="notification-dropdown" ref="notificationDropdown">
          <button 
            class="action-button notification-button"
            @click="toggleNotifications"
            :class="{ 'active': notificationDropdownOpen }"
            title="Notifications"
          >
            <i class="fas fa-bell"></i>
            <span 
              v-if="unreadNotificationsCount > 0" 
              class="notification-badge"
            >
              {{ unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount }}
            </span>
          </button>

          <!-- Notifications Dropdown -->
          <div 
            v-if="notificationDropdownOpen" 
            class="dropdown-menu notification-menu"
          >
            <div class="dropdown-header">
              <h3>Notifications</h3>
              <button 
                v-if="unreadNotificationsCount > 0"
                @click="markAllAsRead"
                class="mark-all-read"
              >
                Mark all as read
              </button>
            </div>
            
            <div class="notification-list">
              <div 
                v-if="recentNotifications.length === 0"
                class="no-notifications"
              >
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
              </div>
              
              <div 
                v-for="notification in recentNotifications"
                :key="notification.id"
                class="notification-item"
                :class="{ 'unread': !notification.read_at }"
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-icon">
                  <i :class="getNotificationIcon(notification.type)"></i>
                </div>
                <div class="notification-content">
                  <p class="notification-title">{{ notification.title }}</p>
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
                </div>
                <button 
                  v-if="!notification.read_at"
                  @click.stop="markAsRead(notification.id)"
                  class="mark-read-button"
                  title="Mark as read"
                >
                  <i class="fas fa-check"></i>
                </button>
              </div>
            </div>
            
            <div class="dropdown-footer">
              <router-link to="/notifications" class="view-all-link">
                View all notifications
              </router-link>
            </div>
          </div>
        </div>

        <!-- Theme Toggle -->
        <button 
          class="action-button"
          @click="toggleTheme"
          :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>

        <!-- User Menu -->
        <div class="user-dropdown" ref="userDropdown">
          <button 
            class="user-button"
            @click="toggleUserMenu"
            :class="{ 'active': userDropdownOpen }"
          >
            <img 
              v-if="user.avatar"
              :src="user.avatar"
              :alt="user.name"
              class="user-avatar"
            />
            <div v-else class="user-avatar-placeholder">
              {{ userInitials }}
            </div>
            <span class="user-name hidden md:inline">{{ user.name }}</span>
            <i class="fas fa-chevron-down user-chevron"></i>
          </button>

          <!-- User Dropdown Menu -->
          <div v-if="userDropdownOpen" class="dropdown-menu user-menu">
            <div class="user-info">
              <div class="user-details">
                <p class="user-name">{{ user.name }}</p>
                <p class="user-email">{{ user.email }}</p>
              </div>
            </div>
            
            <div class="menu-divider"></div>
            
            <router-link to="/profile" class="menu-item" @click="closeUserMenu">
              <i class="fas fa-user"></i>
              <span>Profile</span>
            </router-link>
            
            <router-link to="/settings" class="menu-item" @click="closeUserMenu">
              <i class="fas fa-cog"></i>
              <span>Settings</span>
            </router-link>
            
            <router-link to="/billing" class="menu-item" @click="closeUserMenu">
              <i class="fas fa-credit-card"></i>
              <span>Billing</span>
            </router-link>
            
            <div class="menu-divider"></div>
            
            <button @click="handleLogout" class="menu-item logout-item">
              <i class="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div 
      v-if="mobileMenuOpen" 
      class="mobile-menu md:hidden"
      @click="closeMobileMenu"
    >
      <div class="mobile-menu-content" @click.stop>
        <router-link 
          v-for="item in navigationItems" 
          :key="item.name"
          :to="item.to"
          class="mobile-nav-link"
          :class="{ 'active': isActiveRoute(item.to) }"
          @click="closeMobileMenu"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span>{{ item.name }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { dateUtils } from '../../utils';

export default {
  name: 'AppNavigation',
  
  data() {
    return {
      mobileMenuOpen: false,
      notificationDropdownOpen: false,
      userDropdownOpen: false,
      
      navigationItems: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: 'fas fa-tachometer-alt',
        },
        {
          name: 'Payments',
          to: '/payments',
          icon: 'fas fa-credit-card',
        },
        {
          name: 'Analytics',
          to: '/analytics',
          icon: 'fas fa-chart-bar',
        },
        {
          name: 'Content',
          to: '/content',
          icon: 'fas fa-file-alt',
        },
        {
          name: 'Marketplace',
          to: '/marketplace',
          icon: 'fas fa-store',
        },
      ],
    };
  },
  
  computed: {
    ...mapGetters('auth', {
      user: 'user',
      isAuthenticated: 'isAuthenticated',
    }),
    
    ...mapGetters('ui', {
      theme: 'theme',
    }),
    
    ...mapGetters('notifications', {
      unreadNotificationsCount: 'unreadCount',
      recentNotifications: 'recentNotifications',
    }),
    
    isDarkMode() {
      return this.theme === 'dark';
    },
    
    userInitials() {
      if (!this.user.name) return 'U';
      return this.user.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    },
  },
  
  mounted() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.handleOutsideClick);
    
    // Load recent notifications
    this.fetchRecentNotifications();
  },
  
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  
  methods: {
    ...mapActions('auth', {
      logout: 'logout',
    }),
    
    ...mapActions('ui', {
      setTheme: 'setTheme',
      openModal: 'openModal',
    }),
    
    ...mapActions('notifications', {
      markNotificationAsRead: 'markAsRead',
      markAllNotificationsAsRead: 'markAllAsRead',
      fetchNotifications: 'fetchNotifications',
    }),
    
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    },
    
    closeMobileMenu() {
      this.mobileMenuOpen = false;
    },
    
    toggleNotifications() {
      this.notificationDropdownOpen = !this.notificationDropdownOpen;
      this.userDropdownOpen = false;
    },
    
    toggleUserMenu() {
      this.userDropdownOpen = !this.userDropdownOpen;
      this.notificationDropdownOpen = false;
    },
    
    closeUserMenu() {
      this.userDropdownOpen = false;
    },
    
    toggleTheme() {
      const newTheme = this.isDarkMode ? 'light' : 'dark';
      this.setTheme(newTheme);
      
      // Save to localStorage
      localStorage.setItem('theme', newTheme);
      
      // Apply to document
      document.documentElement.setAttribute('data-theme', newTheme);
    },
    
    openSearch() {
      this.openModal('search');
    },
    
    isActiveRoute(route) {
      return this.$route.path.startsWith(route);
    },
    
    handleOutsideClick(event) {
      // Close notification dropdown
      if (this.notificationDropdownOpen && 
          !this.$refs.notificationDropdown?.contains(event.target)) {
        this.notificationDropdownOpen = false;
      }
      
      // Close user dropdown
      if (this.userDropdownOpen && 
          !this.$refs.userDropdown?.contains(event.target)) {
        this.userDropdownOpen = false;
      }
    },
    
    async handleLogout() {
      try {
        await this.logout();
        this.$router.push('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    },
    
    async fetchRecentNotifications() {
      try {
        await this.fetchNotifications({ limit: 5 });
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    },
    
    async markAsRead(notificationId) {
      try {
        await this.markNotificationAsRead(notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    
    async markAllAsRead() {
      try {
        await this.markAllNotificationsAsRead();
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },
    
    handleNotificationClick(notification) {
      // Mark as read if unread
      if (!notification.read_at) {
        this.markAsRead(notification.id);
      }
      
      // Navigate to notification target if available
      if (notification.action_url) {
        this.$router.push(notification.action_url);
      }
      
      this.notificationDropdownOpen = false;
    },
    
    getNotificationIcon(type) {
      const icons = {
        payment: 'fas fa-credit-card',
        order: 'fas fa-shopping-cart',
        system: 'fas fa-cog',
        security: 'fas fa-shield-alt',
        marketing: 'fas fa-bullhorn',
        default: 'fas fa-bell',
      };
      
      return icons[type] || icons.default;
    },
    
    formatTime(timestamp) {
      return dateUtils.fromNow(timestamp);
    },
  },
};
</script>

<style lang="scss" scoped>
.app-navigation {
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

// Brand
.nav-brand {
  .brand-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.25rem;
    
    .brand-logo {
      width: 32px;
      height: 32px;
      margin-right: 0.5rem;
    }
    
    .brand-text {
      @media (max-width: 640px) {
        display: none;
      }
    }
  }
}

// Mobile menu toggle
.mobile-menu-toggle {
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--bg-secondary);
  }
}

// Desktop navigation
.nav-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 0.375rem;
  transition: all 0.2s;
  font-weight: 500;
  
  .nav-icon {
    margin-right: 0.5rem;
    width: 16px;
  }
  
  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-secondary);
  }
  
  &.active {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
}

// Right side actions
.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-secondary);
  }
  
  &.active {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
}

// Notifications
.notification-dropdown {
  position: relative;
}

.notification-button {
  .notification-badge {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--error);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    min-width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(25%, -25%);
  }
}

// User menu
.user-dropdown {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &.active {
    background-color: var(--bg-secondary);
  }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-name {
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chevron {
  font-size: 0.75rem;
  transition: transform 0.2s;
  
  .user-button.active & {
    transform: rotate(180deg);
  }
}

// Dropdown menus
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 200px;
  margin-top: 0.5rem;
}

.notification-menu {
  width: 320px;
  max-height: 400px;
  overflow: hidden;
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .mark-all-read {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    font-size: 0.875rem;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.notification-list {
  max-height: 240px;
  overflow-y: auto;
}

.no-notifications {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  
  i {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }
  
  p {
    font-size: 0.875rem;
  }
}

.notification-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &.unread {
    background-color: rgba(59, 130, 246, 0.05);
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: var(--primary);
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
  
  .notification-title {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .notification-message {
    color: var(--text-secondary);
    font-size: 0.8125rem;
    line-height: 1.4;
    margin-bottom: 0.25rem;
  }
  
  .notification-time {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }
}

.mark-read-button {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
}

.dropdown-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
  
  .view-all-link {
    display: block;
    text-align: center;
    color: var(--primary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

// User menu specific styles
.user-menu {
  width: 240px;
}

.user-info {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  
  .user-details {
    .user-name {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    
    .user-email {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: background-color 0.2s;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  i {
    width: 16px;
    color: var(--text-secondary);
  }
}

.logout-item {
  color: var(--error);
  
  i {
    color: var(--error);
  }
  
  &:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 0.5rem 0;
}

// Mobile menu
.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.mobile-menu-content {
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  padding: 1rem;
  text-decoration: none;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
  
  .nav-icon {
    margin-right: 0.75rem;
    width: 20px;
  }
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  &.active {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
  
  &:last-child {
    border-bottom: none;
  }
}
</style>