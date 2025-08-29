<template>
  <div id="app" :class="{ 'dark': isDarkMode }">
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Loading...</p>
      </div>
    </div>

    <!-- Main App Content -->
    <div v-else class="app-container">
      <!-- Navigation -->
      <AppNavigation v-if="isAuthenticated" />
      
      <!-- Main Content -->
      <main class="main-content" :class="{ 'with-sidebar': isAuthenticated && sidebarOpen }">
        <!-- Breadcrumbs -->
        <AppBreadcrumbs v-if="isAuthenticated && breadcrumbs.length > 0" />
        
        <!-- Router View -->
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
      
      <!-- Sidebar -->
      <AppSidebar v-if="isAuthenticated" />
    </div>

    <!-- Global Modals -->
    <div id="modal-root"></div>
    
    <!-- Toast Notifications -->
    <AppToast />
    
    <!-- Confirmation Dialog -->
    <AppConfirmDialog />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import AppNavigation from './layout/AppNavigation.vue';
import AppSidebar from './layout/AppSidebar.vue';
import AppBreadcrumbs from './layout/AppBreadcrumbs.vue';
import AppToast from './common/AppToast.vue';
import AppConfirmDialog from './common/AppConfirmDialog.vue';

export default {
  name: 'App',
  
  components: {
    AppNavigation,
    AppSidebar,
    AppBreadcrumbs,
    AppToast,
    AppConfirmDialog,
  },
  
  computed: {
    ...mapGetters('auth', {
      isAuthenticated: 'isAuthenticated',
      user: 'user',
    }),
    
    ...mapGetters('ui', {
      sidebarOpen: 'sidebarOpen',
      theme: 'theme',
      breadcrumbs: 'breadcrumbs',
      isLoading: 'isGlobalLoading',
    }),
    
    isDarkMode() {
      return this.theme === 'dark';
    },
  },
  
  watch: {
    // Watch for route changes to update breadcrumbs
    '$route'(to) {
      this.updateBreadcrumbs(to);
      this.updatePageTitle(to);
    },
    
    // Watch for authentication changes
    isAuthenticated(newVal) {
      if (!newVal) {
        this.clearUserData();
      }
    },
  },
  
  async created() {
    // Initialize app
    await this.initializeApp();
    
    // Set up global event listeners
    this.setupEventListeners();
    
    // Initialize theme
    this.initializeTheme();
  },
  
  beforeUnmount() {
    // Clean up event listeners
    this.cleanupEventListeners();
  },
  
  methods: {
    ...mapActions('auth', {
      loadUser: 'loadUser',
      refreshToken: 'refreshToken',
    }),
    
    ...mapActions('ui', {
      setBreadcrumbs: 'setBreadcrumbs',
      setTheme: 'setTheme',
      showToast: 'showToast',
    }),
    
    async initializeApp() {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('auth_token');
        if (token) {
          await this.loadUser();
        }
        
        // Load user preferences
        this.loadUserPreferences();
        
        // Initialize notifications if authenticated
        if (this.isAuthenticated) {
          await this.$store.dispatch('notifications/fetchNotifications');
          this.$store.dispatch('notifications/initializeRealTimeNotifications');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        this.showToast({
          type: 'error',
          message: 'Failed to initialize application',
        });
      }
    },
    
    setupEventListeners() {
      // Handle online/offline status
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Handle visibility change
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Handle keyboard shortcuts
      document.addEventListener('keydown', this.handleKeyboardShortcuts);
      
      // Handle token refresh
      this.setupTokenRefresh();
    },
    
    cleanupEventListeners() {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.removeEventListener('keydown', this.handleKeyboardShortcuts);
      
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
      }
    },
    
    handleOnline() {
      this.showToast({
        type: 'success',
        message: 'Connection restored',
      });
    },
    
    handleOffline() {
      this.showToast({
        type: 'warning',
        message: 'Connection lost. Some features may not work.',
      });
    },
    
    handleVisibilityChange() {
      if (!document.hidden && this.isAuthenticated) {
        // Refresh data when user returns to the app
        this.$store.dispatch('notifications/fetchUnreadCount');
      }
    },
    
    handleKeyboardShortcuts(event) {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            // Open search modal
            this.$store.dispatch('ui/openModal', 'search');
            break;
          case '/':
            event.preventDefault();
            // Toggle sidebar
            this.$store.dispatch('ui/toggleSidebar');
            break;
        }
      }
      
      // Escape key to close modals
      if (event.key === 'Escape') {
        this.$store.dispatch('ui/closeAllModals');
      }
    },
    
    setupTokenRefresh() {
      if (this.isAuthenticated) {
        // Refresh token every 50 minutes (tokens expire in 60 minutes)
        this.tokenRefreshInterval = setInterval(async () => {
          try {
            await this.refreshToken();
          } catch (error) {
            console.error('Token refresh failed:', error);
            // Redirect to login if refresh fails
            this.$router.push('/login');
          }
        }, 50 * 60 * 1000);
      }
    },
    
    updateBreadcrumbs(route) {
      const breadcrumbs = [];
      
      // Generate breadcrumbs based on route meta
      if (route.meta && route.meta.breadcrumbs) {
        breadcrumbs.push(...route.meta.breadcrumbs);
      } else {
        // Auto-generate breadcrumbs from route path
        const pathSegments = route.path.split('/').filter(segment => segment);
        pathSegments.forEach((segment, index) => {
          const path = '/' + pathSegments.slice(0, index + 1).join('/');
          breadcrumbs.push({
            text: this.formatBreadcrumbText(segment),
            to: path,
          });
        });
      }
      
      this.setBreadcrumbs(breadcrumbs);
    },
    
    updatePageTitle(route) {
      const title = route.meta?.title || this.formatBreadcrumbText(route.name);
      document.title = title ? `${title} - Money Maker Platform` : 'Money Maker Platform';
    },
    
    formatBreadcrumbText(text) {
      return text
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    },
    
    initializeTheme() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      this.setTheme(savedTheme);
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', savedTheme);
    },
    
    loadUserPreferences() {
      try {
        const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
        
        // Apply saved preferences
        if (preferences.theme) {
          this.setTheme(preferences.theme);
        }
        
        if (preferences.sidebarOpen !== undefined) {
          this.$store.dispatch('ui/setSidebarOpen', preferences.sidebarOpen);
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    },
    
    clearUserData() {
      // Clear sensitive data when user logs out
      this.$store.dispatch('notifications/clearNotifications');
      this.$store.dispatch('payments/clearPayments');
    },
  },
};
</script>

<style lang="scss">
// Global styles
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// CSS Variables for theming
:root {
  // Light theme
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --border-color: #e2e8f0;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  // Colors
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --secondary: #64748b;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
}

// Dark theme
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --border-color: #334155;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  display: flex;
  flex: 1;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 1rem;
  transition: margin-left 0.3s ease;
  
  &.with-sidebar {
    margin-left: 250px;
    
    @media (max-width: 768px) {
      margin-left: 0;
    }
  }
}

// Loading overlay
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  
  .dark & {
    background-color: rgba(15, 23, 42, 0.9);
  }
}

.loading-spinner {
  text-align: center;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  .loading-text {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Page transitions
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Utility classes
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Scrollbar styling
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  
  &:hover {
    background: var(--text-tertiary);
  }
}

// Focus styles
.focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

// Print styles
@media print {
  .no-print {
    display: none !important;
  }
}
</style>