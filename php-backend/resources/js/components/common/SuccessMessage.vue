<template>
  <div 
    v-if="shouldShow"
    class="success-message"
    :class="successClasses"
    role="alert"
    aria-live="polite"
  >
    <!-- Icon -->
    <div v-if="showIcon" class="success-icon">
      <i :class="iconClass"></i>
    </div>
    
    <!-- Content -->
    <div class="success-content">
      <!-- Title -->
      <div v-if="title" class="success-title">
        {{ title }}
      </div>
      
      <!-- Message -->
      <div class="success-text">
        <slot>
          <span v-if="typeof message === 'string'">{{ message }}</span>
          <ul v-else-if="Array.isArray(message)" class="success-list">
            <li v-for="(msg, index) in message" :key="index">
              {{ msg }}
            </li>
          </ul>
          <div v-else-if="typeof message === 'object'">
            <div v-for="(value, key) in message" :key="key" class="success-item">
              <strong>{{ formatKey(key) }}:</strong> {{ value }}
            </div>
          </div>
        </slot>
      </div>
      
      <!-- Actions -->
      <div v-if="showActions" class="success-actions">
        <button
          v-if="actionable"
          class="success-button primary"
          @click="handleAction"
        >
          <i v-if="actionIcon" :class="actionIcon"></i>
          <span>{{ actionText }}</span>
        </button>
        
        <button
          v-if="dismissible"
          class="success-button secondary"
          @click="handleDismiss"
        >
          <i class="fas fa-times"></i>
          <span>{{ dismissText }}</span>
        </button>
      </div>
    </div>
    
    <!-- Close button -->
    <button
      v-if="closable"
      class="success-close"
      @click="handleClose"
      :aria-label="closeLabel"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'SuccessMessage',
  
  props: {
    message: {
      type: [String, Array, Object],
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: 'filled',
      validator: (value) => ['filled', 'outlined', 'minimal'].includes(value),
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value),
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: '',
    },
    closable: {
      type: Boolean,
      default: false,
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
    actionable: {
      type: Boolean,
      default: false,
    },
    actionText: {
      type: String,
      default: 'View Details',
    },
    actionIcon: {
      type: String,
      default: '',
    },
    dismissText: {
      type: String,
      default: 'Dismiss',
    },
    closeLabel: {
      type: String,
      default: 'Close success message',
    },
    autoHide: {
      type: Boolean,
      default: false,
    },
    hideDelay: {
      type: Number,
      default: 5000,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
  },
  
  emits: [
    'close',
    'dismiss',
    'action',
  ],
  
  data() {
    return {
      visible: true,
      autoHideTimer: null,
    };
  },
  
  computed: {
    shouldShow() {
      return this.visible && (this.message || this.$slots.default);
    },
    
    successClasses() {
      return {
        [`success-${this.variant}`]: true,
        [`success-${this.size}`]: true,
        'success-with-actions': this.showActions,
        'success-closable': this.closable,
      };
    },
    
    iconClass() {
      if (this.icon) {
        return this.icon;
      }
      
      return 'fas fa-check-circle';
    },
    
    showActions() {
      return this.actionable || this.dismissible;
    },
  },
  
  watch: {
    message: {
      handler(newValue) {
        if (newValue) {
          this.visible = true;
          this.setupAutoHide();
        }
      },
      immediate: true,
    },
  },
  
  mounted() {
    this.setupAutoHide();
  },
  
  beforeUnmount() {
    this.clearAutoHideTimer();
  },
  
  methods: {
    setupAutoHide() {
      if (this.autoHide && !this.persistent) {
        this.clearAutoHideTimer();
        this.autoHideTimer = setTimeout(() => {
          this.handleClose();
        }, this.hideDelay);
      }
    },
    
    clearAutoHideTimer() {
      if (this.autoHideTimer) {
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = null;
      }
    },
    
    handleClose() {
      this.visible = false;
      this.clearAutoHideTimer();
      this.$emit('close');
    },
    
    handleDismiss() {
      this.handleClose();
      this.$emit('dismiss');
    },
    
    handleAction() {
      this.$emit('action');
    },
    
    formatKey(key) {
      return key
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    // Public methods
    show() {
      this.visible = true;
      this.setupAutoHide();
    },
    
    hide() {
      this.handleClose();
    },
  },
};
</script>

<style lang="scss" scoped>
.success-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  line-height: 1.5;
  
  // Variant styles
  &.success-filled {
    background-color: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.2);
    color: #059669;
  }
  
  &.success-outlined {
    background-color: transparent;
    border-color: #059669;
    color: #059669;
  }
  
  &.success-minimal {
    background-color: transparent;
    border: none;
    color: #059669;
  }
  
  // Size variants
  &.success-small {
    padding: 0.75rem;
    font-size: 0.8125rem;
    
    .success-icon {
      font-size: 1rem;
    }
  }
  
  &.success-medium {
    padding: 1rem;
    font-size: 0.875rem;
    
    .success-icon {
      font-size: 1.125rem;
    }
  }
  
  &.success-large {
    padding: 1.25rem;
    font-size: 1rem;
    
    .success-icon {
      font-size: 1.25rem;
    }
  }
  
  // Layout modifiers
  &.success-closable {
    padding-right: 2.5rem;
    position: relative;
  }
}

.success-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  
  i {
    display: block;
  }
}

.success-content {
  flex: 1;
  min-width: 0;
}

.success-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: currentColor;
}

.success-text {
  color: currentColor;
  
  p {
    margin: 0;
  }
  
  p + p {
    margin-top: 0.5rem;
  }
}

.success-list {
  margin: 0;
  padding-left: 1.25rem;
  
  li {
    margin-bottom: 0.25rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.success-item {
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  strong {
    font-weight: 600;
    margin-right: 0.25rem;
  }
}

.success-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.success-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  
  &.primary {
    background-color: #059669;
    border-color: #059669;
    color: white;
    
    &:hover {
      background-color: #047857;
      border-color: #047857;
    }
  }
  
  &.secondary {
    background-color: transparent;
    border-color: currentColor;
    color: currentColor;
    
    &:hover {
      background-color: currentColor;
      color: white;
    }
  }
  
  i {
    font-size: 0.75rem;
  }
}

.success-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  color: currentColor;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  
  i {
    font-size: 0.875rem;
  }
}

// Dark mode adjustments
.dark {
  .success-message {
    &.success-filled {
      background-color: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    
    &.success-outlined {
      border-color: #34d399;
      color: #34d399;
    }
    
    &.success-minimal {
      color: #34d399;
    }
  }
  
  .success-button {
    &.primary {
      background-color: #34d399;
      border-color: #34d399;
      color: #064e3b;
      
      &:hover {
        background-color: #10b981;
        border-color: #10b981;
      }
    }
  }
  
  .success-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .success-message {
    border-width: 2px;
    
    &.success-minimal {
      border: 2px solid currentColor;
    }
  }
  
  .success-button {
    border-width: 2px;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .success-button,
  .success-close {
    transition: none;
  }
}

// Mobile optimizations
@media (max-width: 640px) {
  .success-message {
    padding: 0.875rem;
    
    &.success-small {
      padding: 0.625rem;
    }
    
    &.success-large {
      padding: 1rem;
    }
  }
  
  .success-actions {
    flex-direction: column;
    
    .success-button {
      justify-content: center;
    }
  }
  
  .success-close {
    top: 0.625rem;
    right: 0.625rem;
  }
}

// Print styles
@media print {
  .success-message {
    border: 1px solid #000;
    background: none !important;
    color: #000 !important;
  }
  
  .success-actions,
  .success-close {
    display: none;
  }
}
</style>