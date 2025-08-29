<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="[
            `toast-${toast.type}`,
            { 'toast-dismissible': toast.dismissible !== false }
          ]"
          @click="handleToastClick(toast)"
        >
          <!-- Toast Icon -->
          <div class="toast-icon">
            <i :class="getToastIcon(toast.type)"></i>
          </div>

          <!-- Toast Content -->
          <div class="toast-content">
            <h4 v-if="toast.title" class="toast-title">
              {{ toast.title }}
            </h4>
            <p class="toast-message">
              {{ toast.message }}
            </p>
            <div v-if="toast.actions" class="toast-actions">
              <button
                v-for="action in toast.actions"
                :key="action.text"
                class="toast-action"
                @click.stop="handleActionClick(action, toast)"
              >
                {{ action.text }}
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div
            v-if="toast.duration && toast.duration > 0"
            class="toast-progress"
            :style="{ animationDuration: `${toast.duration}ms` }"
          ></div>

          <!-- Close Button -->
          <button
            v-if="toast.dismissible !== false"
            class="toast-close"
            @click.stop="removeToast(toast.id)"
            aria-label="Close notification"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'AppToast',
  
  data() {
    return {
      toasts: [],
      toastId: 0,
    };
  },
  
  computed: {
    ...mapGetters('ui', {
      uiToasts: 'toasts',
    }),
  },
  
  watch: {
    uiToasts: {
      handler(newToasts) {
        // Sync with Vuex store
        newToasts.forEach(toast => {
          if (!this.toasts.find(t => t.id === toast.id)) {
            this.addToast(toast);
          }
        });
      },
      deep: true,
      immediate: true,
    },
  },
  
  mounted() {
    // Listen for global toast events
    this.$root.$on('toast', this.showToast);
    this.$root.$on('toast:success', (message, options = {}) => {
      this.showToast({ ...options, message, type: 'success' });
    });
    this.$root.$on('toast:error', (message, options = {}) => {
      this.showToast({ ...options, message, type: 'error' });
    });
    this.$root.$on('toast:warning', (message, options = {}) => {
      this.showToast({ ...options, message, type: 'warning' });
    });
    this.$root.$on('toast:info', (message, options = {}) => {
      this.showToast({ ...options, message, type: 'info' });
    });
  },
  
  beforeUnmount() {
    // Clean up event listeners
    this.$root.$off('toast');
    this.$root.$off('toast:success');
    this.$root.$off('toast:error');
    this.$root.$off('toast:warning');
    this.$root.$off('toast:info');
    
    // Clear all timeouts
    this.toasts.forEach(toast => {
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
    });
  },
  
  methods: {
    ...mapActions('ui', {
      removeUiToast: 'removeToast',
    }),
    
    showToast(options) {
      const toast = {
        id: this.generateToastId(),
        type: options.type || 'info',
        title: options.title,
        message: options.message || '',
        duration: options.duration !== undefined ? options.duration : this.getDefaultDuration(options.type),
        dismissible: options.dismissible !== false,
        actions: options.actions,
        onClick: options.onClick,
        ...options,
      };
      
      this.addToast(toast);
    },
    
    addToast(toast) {
      // Ensure toast has an ID
      if (!toast.id) {
        toast.id = this.generateToastId();
      }
      
      // Add to local toasts array
      this.toasts.push(toast);
      
      // Auto-remove after duration
      if (toast.duration && toast.duration > 0) {
        toast.timeoutId = setTimeout(() => {
          this.removeToast(toast.id);
        }, toast.duration);
      }
      
      // Limit number of toasts
      if (this.toasts.length > 5) {
        const oldestToast = this.toasts[0];
        this.removeToast(oldestToast.id);
      }
    },
    
    removeToast(toastId) {
      const index = this.toasts.findIndex(t => t.id === toastId);
      if (index > -1) {
        const toast = this.toasts[index];
        
        // Clear timeout if exists
        if (toast.timeoutId) {
          clearTimeout(toast.timeoutId);
        }
        
        // Remove from local array
        this.toasts.splice(index, 1);
        
        // Remove from Vuex store if exists
        this.removeUiToast(toastId);
      }
    },
    
    handleToastClick(toast) {
      if (toast.onClick) {
        toast.onClick(toast);
      }
      
      // Auto-dismiss on click if dismissible
      if (toast.dismissible !== false) {
        this.removeToast(toast.id);
      }
    },
    
    handleActionClick(action, toast) {
      if (action.handler) {
        action.handler(toast);
      }
      
      // Remove toast after action unless specified otherwise
      if (action.keepToast !== true) {
        this.removeToast(toast.id);
      }
    },
    
    generateToastId() {
      return `toast_${++this.toastId}_${Date.now()}`;
    },
    
    getDefaultDuration(type) {
      const durations = {
        success: 4000,
        info: 5000,
        warning: 6000,
        error: 8000,
      };
      
      return durations[type] || 5000;
    },
    
    getToastIcon(type) {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
      };
      
      return icons[type] || icons.info;
    },
  },
};
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
  
  @media (max-width: 640px) {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 320px;
  max-width: 480px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  cursor: pointer;
  overflow: hidden;
  
  @media (max-width: 640px) {
    min-width: auto;
    max-width: none;
  }
  
  // Toast types
  &.toast-success {
    border-left: 4px solid var(--success);
    
    .toast-icon {
      color: var(--success);
    }
  }
  
  &.toast-error {
    border-left: 4px solid var(--error);
    
    .toast-icon {
      color: var(--error);
    }
  }
  
  &.toast-warning {
    border-left: 4px solid var(--warning);
    
    .toast-icon {
      color: var(--warning);
    }
  }
  
  &.toast-info {
    border-left: 4px solid var(--info);
    
    .toast-icon {
      color: var(--info);
    }
  }
  
  &.toast-dismissible:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.125rem;
  
  i {
    font-size: 1.125rem;
  }
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.toast-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  word-wrap: break-word;
}

.toast-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.toast-action {
  padding: 0.375rem 0.75rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-secondary);
    border-color: var(--text-tertiary);
  }
  
  &:first-child {
    background-color: var(--primary);
    border-color: var(--primary);
    color: white;
    
    &:hover {
      background-color: var(--primary-dark);
      border-color: var(--primary-dark);
    }
  }
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: currentColor;
  opacity: 0.3;
  animation: toast-progress linear forwards;
  transform-origin: left;
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    color: var(--text-secondary);
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  i {
    font-size: 0.875rem;
  }
}

// Toast transitions
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}

// Dark mode adjustments
.dark {
  .toast {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
  }
  
  .toast-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition: none;
  }
  
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s;
  }
  
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
  
  .toast-progress {
    animation: none;
    display: none;
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .toast {
    border-width: 2px;
  }
  
  .toast-success {
    border-left-width: 6px;
  }
  
  .toast-error {
    border-left-width: 6px;
  }
  
  .toast-warning {
    border-left-width: 6px;
  }
  
  .toast-info {
    border-left-width: 6px;
  }
}

// Print styles
@media print {
  .toast-container {
    display: none;
  }
}
</style>