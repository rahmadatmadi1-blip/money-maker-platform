<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb navigation">
    <div class="breadcrumb-container">
      <!-- Home Icon -->
      <router-link to="/dashboard" class="breadcrumb-home" title="Dashboard">
        <i class="fas fa-home"></i>
      </router-link>

      <!-- Breadcrumb Items -->
      <template v-for="(item, index) in breadcrumbItems" :key="index">
        <!-- Separator -->
        <span class="breadcrumb-separator">
          <i class="fas fa-chevron-right"></i>
        </span>

        <!-- Breadcrumb Item -->
        <router-link
          v-if="item.to && index < breadcrumbItems.length - 1"
          :to="item.to"
          class="breadcrumb-item"
          :title="item.text"
        >
          <i v-if="item.icon" :class="item.icon" class="breadcrumb-icon"></i>
          <span class="breadcrumb-text">{{ item.text }}</span>
        </router-link>

        <!-- Current Page (not clickable) -->
        <span
          v-else
          class="breadcrumb-item current"
          :title="item.text"
          aria-current="page"
        >
          <i v-if="item.icon" :class="item.icon" class="breadcrumb-icon"></i>
          <span class="breadcrumb-text">{{ item.text }}</span>
        </span>
      </template>
    </div>

    <!-- Page Actions -->
    <div v-if="pageActions.length > 0" class="page-actions">
      <button
        v-for="action in pageActions"
        :key="action.name"
        class="action-button"
        :class="action.variant || 'secondary'"
        @click="handleActionClick(action)"
        :disabled="action.disabled"
        :title="action.title || action.name"
      >
        <i v-if="action.icon" :class="action.icon" class="action-icon"></i>
        <span>{{ action.name }}</span>
      </button>
    </div>
  </nav>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'AppBreadcrumbs',
  
  computed: {
    ...mapGetters('ui', {
      breadcrumbs: 'breadcrumbs',
    }),
    
    breadcrumbItems() {
      // Filter out empty or invalid breadcrumbs
      return this.breadcrumbs.filter(item => item && item.text);
    },
    
    pageActions() {
      // Get page actions from route meta or component
      const routeActions = this.$route.meta?.actions || [];
      const componentActions = this.$parent?.pageActions || [];
      
      return [...routeActions, ...componentActions];
    },
  },
  
  methods: {
    handleActionClick(action) {
      if (action.disabled) return;
      
      if (action.handler) {
        // Call custom handler
        action.handler();
      } else if (action.to) {
        // Navigate to route
        this.$router.push(action.to);
      } else if (action.emit) {
        // Emit event to parent component
        this.$emit(action.emit, action.payload);
      } else if (action.modal) {
        // Open modal
        this.$store.dispatch('ui/openModal', action.modal);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-width: 0;
}

.breadcrumb-home {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 0.375rem;
  transition: all 0.2s;
  
  &:hover {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
  
  i {
    font-size: 0.875rem;
  }
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
  margin: 0 0.25rem;
  
  i {
    font-size: 0.75rem;
  }
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  font-size: 0.875rem;
  max-width: 200px;
  
  &:hover {
    color: var(--primary);
    background-color: rgba(59, 130, 246, 0.1);
  }
  
  &.current {
    color: var(--text-primary);
    font-weight: 500;
    cursor: default;
    
    &:hover {
      background-color: transparent;
    }
  }
}

.breadcrumb-icon {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.breadcrumb-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  
  &:hover:not(:disabled) {
    background-color: var(--bg-secondary);
    border-color: var(--text-tertiary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  // Button variants
  &.primary {
    background-color: var(--primary);
    border-color: var(--primary);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-dark);
      border-color: var(--primary-dark);
    }
  }
  
  &.secondary {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
    
    &:hover:not(:disabled) {
      background-color: var(--bg-tertiary);
    }
  }
  
  &.success {
    background-color: var(--success);
    border-color: var(--success);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #059669;
      border-color: #059669;
    }
  }
  
  &.warning {
    background-color: var(--warning);
    border-color: var(--warning);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #d97706;
      border-color: #d97706;
    }
  }
  
  &.error {
    background-color: var(--error);
    border-color: var(--error);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #dc2626;
      border-color: #dc2626;
    }
  }
  
  &.outline {
    background-color: transparent;
    
    &.primary {
      color: var(--primary);
      border-color: var(--primary);
      
      &:hover:not(:disabled) {
        background-color: rgba(59, 130, 246, 0.1);
      }
    }
    
    &.success {
      color: var(--success);
      border-color: var(--success);
      
      &:hover:not(:disabled) {
        background-color: rgba(16, 185, 129, 0.1);
      }
    }
    
    &.warning {
      color: var(--warning);
      border-color: var(--warning);
      
      &:hover:not(:disabled) {
        background-color: rgba(245, 158, 11, 0.1);
      }
    }
    
    &.error {
      color: var(--error);
      border-color: var(--error);
      
      &:hover:not(:disabled) {
        background-color: rgba(239, 68, 68, 0.1);
      }
    }
  }
  
  &.ghost {
    background-color: transparent;
    border-color: transparent;
    
    &:hover:not(:disabled) {
      background-color: var(--bg-secondary);
    }
  }
  
  &.sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  &.lg {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
  }
}

.action-icon {
  font-size: 0.875rem;
  
  .action-button.sm & {
    font-size: 0.75rem;
  }
  
  .action-button.lg & {
    font-size: 1rem;
  }
}

// Responsive adjustments
@media (max-width: 640px) {
  .breadcrumb-container {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    
    &::-webkit-scrollbar {
      display: none;
    }
  }
  
  .breadcrumb-item {
    max-width: 120px;
    flex-shrink: 0;
  }
  
  .page-actions {
    flex-wrap: wrap;
  }
  
  .action-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    
    .action-icon {
      font-size: 0.75rem;
    }
  }
}

// Animation for breadcrumb changes
.breadcrumb-item {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Focus styles for accessibility
.breadcrumb-home:focus,
.breadcrumb-item:focus,
.action-button:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

// Print styles
@media print {
  .page-actions {
    display: none;
  }
  
  .breadcrumbs {
    border-bottom: 1px solid #000;
  }
}
</style>