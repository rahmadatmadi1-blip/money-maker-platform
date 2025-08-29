<template>
  <aside 
    class="app-sidebar"
    :class="{ 
      'open': sidebarOpen,
      'collapsed': sidebarCollapsed 
    }"
  >
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <img 
          v-if="!sidebarCollapsed"
          src="/images/logo.svg" 
          alt="Money Maker Platform" 
          class="brand-logo" 
        />
        <span v-if="!sidebarCollapsed" class="brand-text">
          Money Maker
        </span>
      </div>
      
      <button 
        class="sidebar-toggle"
        @click="toggleSidebar"
        :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <i class="fas fa-bars"></i>
      </button>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
      <div class="nav-section">
        <h3 v-if="!sidebarCollapsed" class="nav-section-title">Main</h3>
        
        <router-link 
          v-for="item in mainNavItems" 
          :key="item.name"
          :to="item.to"
          class="nav-item"
          :class="{ 'active': isActiveRoute(item.to) }"
          :title="sidebarCollapsed ? item.name : ''"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed" class="nav-text">{{ item.name }}</span>
          <span 
            v-if="item.badge && !sidebarCollapsed" 
            class="nav-badge"
            :class="item.badgeType"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <div class="nav-section">
        <h3 v-if="!sidebarCollapsed" class="nav-section-title">Business</h3>
        
        <router-link 
          v-for="item in businessNavItems" 
          :key="item.name"
          :to="item.to"
          class="nav-item"
          :class="{ 'active': isActiveRoute(item.to) }"
          :title="sidebarCollapsed ? item.name : ''"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed" class="nav-text">{{ item.name }}</span>
          <span 
            v-if="item.badge && !sidebarCollapsed" 
            class="nav-badge"
            :class="item.badgeType"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <div class="nav-section">
        <h3 v-if="!sidebarCollapsed" class="nav-section-title">Management</h3>
        
        <router-link 
          v-for="item in managementNavItems" 
          :key="item.name"
          :to="item.to"
          class="nav-item"
          :class="{ 'active': isActiveRoute(item.to) }"
          :title="sidebarCollapsed ? item.name : ''"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed" class="nav-text">{{ item.name }}</span>
          <span 
            v-if="item.badge && !sidebarCollapsed" 
            class="nav-badge"
            :class="item.badgeType"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <!-- Admin Section (only for admin users) -->
      <div v-if="isAdmin" class="nav-section">
        <h3 v-if="!sidebarCollapsed" class="nav-section-title">Admin</h3>
        
        <router-link 
          v-for="item in adminNavItems" 
          :key="item.name"
          :to="item.to"
          class="nav-item"
          :class="{ 'active': isActiveRoute(item.to) }"
          :title="sidebarCollapsed ? item.name : ''"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed" class="nav-text">{{ item.name }}</span>
          <span 
            v-if="item.badge && !sidebarCollapsed" 
            class="nav-badge"
            :class="item.badgeType"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </div>
    </nav>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <!-- Quick Actions -->
      <div v-if="!sidebarCollapsed" class="quick-actions">
        <button 
          class="quick-action-btn"
          @click="openCreateModal"
          title="Create new content"
        >
          <i class="fas fa-plus"></i>
          <span>Create</span>
        </button>
        
        <button 
          class="quick-action-btn"
          @click="openHelpModal"
          title="Get help"
        >
          <i class="fas fa-question-circle"></i>
          <span>Help</span>
        </button>
      </div>

      <!-- User Info -->
      <div class="sidebar-user" :class="{ 'collapsed': sidebarCollapsed }">
        <div class="user-avatar">
          <img 
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.name"
            class="avatar-image"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>
        
        <div v-if="!sidebarCollapsed" class="user-info">
          <p class="user-name">{{ user.name }}</p>
          <p class="user-role">{{ userRole }}</p>
        </div>
        
        <button 
          v-if="!sidebarCollapsed"
          class="user-menu-btn"
          @click="toggleUserMenu"
          :class="{ 'active': userMenuOpen }"
        >
          <i class="fas fa-chevron-up"></i>
        </button>
      </div>

      <!-- User Menu -->
      <div 
        v-if="userMenuOpen && !sidebarCollapsed" 
        class="user-menu"
      >
        <router-link to="/profile" class="user-menu-item">
          <i class="fas fa-user"></i>
          <span>Profile</span>
        </router-link>
        
        <router-link to="/settings" class="user-menu-item">
          <i class="fas fa-cog"></i>
          <span>Settings</span>
        </router-link>
        
        <button @click="handleLogout" class="user-menu-item logout">
          <i class="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>

    <!-- Mobile Overlay -->
    <div 
      v-if="sidebarOpen && isMobile" 
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>
  </aside>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'AppSidebar',
  
  data() {
    return {
      userMenuOpen: false,
      sidebarCollapsed: false,
      
      mainNavItems: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: 'fas fa-tachometer-alt',
        },
        {
          name: 'Analytics',
          to: '/analytics',
          icon: 'fas fa-chart-line',
        },
        {
          name: 'Notifications',
          to: '/notifications',
          icon: 'fas fa-bell',
          badge: this.unreadNotificationsCount,
          badgeType: 'primary',
        },
      ],
      
      businessNavItems: [
        {
          name: 'Payments',
          to: '/payments',
          icon: 'fas fa-credit-card',
        },
        {
          name: 'Orders',
          to: '/orders',
          icon: 'fas fa-shopping-cart',
        },
        {
          name: 'Products',
          to: '/products',
          icon: 'fas fa-box',
        },
        {
          name: 'Services',
          to: '/services',
          icon: 'fas fa-concierge-bell',
        },
        {
          name: 'Marketplace',
          to: '/marketplace',
          icon: 'fas fa-store',
        },
        {
          name: 'Affiliates',
          to: '/affiliates',
          icon: 'fas fa-users',
        },
      ],
      
      managementNavItems: [
        {
          name: 'Content',
          to: '/content',
          icon: 'fas fa-file-alt',
        },
        {
          name: 'Media Library',
          to: '/media',
          icon: 'fas fa-images',
        },
        {
          name: 'Templates',
          to: '/templates',
          icon: 'fas fa-layer-group',
        },
        {
          name: 'Reports',
          to: '/reports',
          icon: 'fas fa-chart-bar',
        },
        {
          name: 'Settings',
          to: '/settings',
          icon: 'fas fa-cog',
        },
      ],
      
      adminNavItems: [
        {
          name: 'User Management',
          to: '/admin/users',
          icon: 'fas fa-users-cog',
        },
        {
          name: 'System Logs',
          to: '/admin/logs',
          icon: 'fas fa-list-alt',
        },
        {
          name: 'System Settings',
          to: '/admin/settings',
          icon: 'fas fa-server',
        },
        {
          name: 'Maintenance',
          to: '/admin/maintenance',
          icon: 'fas fa-tools',
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
      sidebarOpen: 'sidebarOpen',
    }),
    
    ...mapGetters('notifications', {
      unreadNotificationsCount: 'unreadCount',
    }),
    
    isAdmin() {
      return this.user.role === 'admin' || this.user.role === 'super_admin';
    },
    
    userRole() {
      const roles = {
        admin: 'Administrator',
        super_admin: 'Super Admin',
        user: 'User',
        premium: 'Premium User',
      };
      
      return roles[this.user.role] || 'User';
    },
    
    userInitials() {
      if (!this.user.name) return 'U';
      return this.user.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    },
    
    isMobile() {
      return window.innerWidth < 768;
    },
  },
  
  watch: {
    unreadNotificationsCount(newCount) {
      // Update notification badge
      const notificationItem = this.mainNavItems.find(item => item.name === 'Notifications');
      if (notificationItem) {
        notificationItem.badge = newCount > 0 ? newCount : null;
      }
    },
    
    sidebarOpen(isOpen) {
      if (isOpen && this.isMobile) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    },
  },
  
  mounted() {
    // Load sidebar state from localStorage
    const collapsed = localStorage.getItem('sidebar_collapsed');
    if (collapsed !== null) {
      this.sidebarCollapsed = JSON.parse(collapsed);
    }
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize);
    
    // Close user menu when clicking outside
    document.addEventListener('click', this.handleOutsideClick);
  },
  
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('click', this.handleOutsideClick);
    document.body.style.overflow = '';
  },
  
  methods: {
    ...mapActions('auth', {
      logout: 'logout',
    }),
    
    ...mapActions('ui', {
      setSidebarOpen: 'setSidebarOpen',
      openModal: 'openModal',
    }),
    
    toggleSidebar() {
      if (this.isMobile) {
        this.setSidebarOpen(!this.sidebarOpen);
      } else {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        localStorage.setItem('sidebar_collapsed', JSON.stringify(this.sidebarCollapsed));
      }
    },
    
    closeSidebar() {
      this.setSidebarOpen(false);
    },
    
    toggleUserMenu() {
      this.userMenuOpen = !this.userMenuOpen;
    },
    
    isActiveRoute(route) {
      return this.$route.path.startsWith(route);
    },
    
    handleResize() {
      if (window.innerWidth >= 768 && this.sidebarOpen) {
        this.setSidebarOpen(false);
      }
    },
    
    handleOutsideClick(event) {
      if (this.userMenuOpen && !event.target.closest('.sidebar-user')) {
        this.userMenuOpen = false;
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
    
    openCreateModal() {
      this.openModal('create');
    },
    
    openHelpModal() {
      this.openModal('help');
    },
  },
};
</script>

<style lang="scss" scoped>
.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 250px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.3s ease, width 0.3s ease;
  
  &.open {
    transform: translateX(0);
  }
  
  &.collapsed {
    width: 64px;
    
    .nav-text,
    .nav-badge,
    .nav-section-title,
    .brand-text {
      display: none;
    }
    
    .nav-item {
      justify-content: center;
      padding: 0.75rem;
    }
    
    .sidebar-header {
      justify-content: center;
    }
  }
  
  @media (min-width: 768px) {
    position: relative;
    transform: translateX(0);
  }
}

// Sidebar Header
.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  
  .brand-logo {
    width: 32px;
    height: 32px;
    margin-right: 0.5rem;
  }
  
  .brand-text {
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--text-primary);
  }
}

.sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  
  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-secondary);
  }
  
  @media (max-width: 767px) {
    display: none;
  }
}

// Navigation
.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.nav-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-secondary);
  }
  
  &.active {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
    
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
}

.nav-icon {
  width: 20px;
  margin-right: 0.75rem;
  text-align: center;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  font-weight: 500;
}

.nav-badge {
  background-color: var(--primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.primary {
    background-color: var(--primary);
  }
  
  &.success {
    background-color: var(--success);
  }
  
  &.warning {
    background-color: var(--warning);
  }
  
  &.error {
    background-color: var(--error);
  }
}

// Sidebar Footer
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  
  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
  }
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--bg-secondary);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
  
  &.collapsed {
    justify-content: center;
    padding: 0.5rem;
  }
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.user-info {
  flex: 1;
  min-width: 0;
  
  .user-name {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .user-role {
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.user-menu-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    color: var(--text-primary);
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  &.active {
    transform: rotate(180deg);
  }
}

.user-menu {
  position: absolute;
  bottom: 100%;
  left: 1rem;
  right: 1rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.user-menu-item {
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
  
  &.logout {
    color: var(--error);
    
    &:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
  }
  
  i {
    width: 16px;
    text-align: center;
  }
}

// Mobile Overlay
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  
  @media (min-width: 768px) {
    display: none;
  }
}

// Scrollbar styling for sidebar
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
  
  &:hover {
    background: var(--text-tertiary);
  }
}
</style>