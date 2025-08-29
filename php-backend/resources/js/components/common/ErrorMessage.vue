<template>
  <div 
    v-if="shouldShow"
    class="error-message"
    :class="errorClasses"
    role="alert"
    :aria-live="ariaLive"
  >
    <!-- Icon -->
    <div v-if="showIcon" class="error-icon">
      <i :class="iconClass"></i>
    </div>
    
    <!-- Content -->
    <div class="error-content">
      <!-- Title -->
      <div v-if="title" class="error-title">
        {{ title }}
      </div>
      
      <!-- Message -->
      <div class="error-text">
        <slot>
          <span v-if="typeof message === 'string'">{{ message }}</span>
          <ul v-else-if="Array.isArray(message)" class="error-list">
            <li v-for="(msg, index) in message" :key="index">
              {{ msg }}
            </li>
          </ul>
          <div v-else-if="typeof message === 'object'">
            <div v-for="(errors, field) in message" :key="field" class="error-field">
              <strong>{{ formatFieldName(field) }}:</strong>
              <ul v-if="Array.isArray(errors)" class="error-field-list">
                <li v-for="(error, index) in errors" :key="index">
                  {{ error }}
                </li>
              </ul>
              <span v-else>{{ errors }}</span>
            </div>
          </div>
        </slot>
      </div>
      
      <!-- Actions -->
      <div v-if="showActions" class="error-actions">
        <button
          v-if="retryable"
          class="error-button retry"
          @click="handleRetry"
          :disabled="retrying"
        >
          <i v-if="retrying" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-redo"></i>
          <span>{{ retryText }}</span>
        </button>
        
        <button
          v-if="dismissible"
          class="error-button dismiss"
          @click="handleDismiss"
        >
          <i class="fas fa-times"></i>
          <span>{{ dismissText }}</span>
        </button>
        
        <button
          v-if="reportable"
          class="error-button report"
          @click="handleReport"
        >
          <i class="fas fa-bug"></i>
          <span>{{ reportText }}</span>
        </button>
      </div>
    </div>
    
    <!-- Close button -->
    <button
      v-if="closable"
      class="error-close"
      @click="handleClose"
      :aria-label="closeLabel"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ErrorMessage',
  
  props: {
    message: {
      type: [String, Array, Object],
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'error',
      validator: (value) => ['error', 'warning', 'validation'].includes(value),
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
    retryable: {
      type: Boolean,
      default: false,
    },
    reportable: {
      type: Boolean,
      default: false,
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
    retryText: {
      type: String,
      default: 'Retry',
    },
    dismissText: {
      type: String,
      default: 'Dismiss',
    },
    reportText: {
      type: String,
      default: 'Report',
    },
    closeLabel: {
      type: String,
      default: 'Close error message',
    },
  },
  
  emits: [
    'close',
    'dismiss',
    'retry',
    'report',
  ],
  
  data() {
    return {
      visible: true,
      retrying: false,
      autoHideTimer: null,
    };
  },
  
  computed: {
    shouldShow() {
      return this.visible && (this.message || this.$slots.default);
    },
    
    errorClasses() {
      return {
        [`error-${this.type}`]: true,
        [`error-${this.variant}`]: true,
        [`error-${this.size}`]: true,
        'error-with-actions': this.showActions,
        'error-closable': this.closable,
      };
    },
    
    iconClass() {
      if (this.icon) {
        return this.icon;
      }
      
      const icons = {
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        validation: 'fas fa-exclamation-circle',
      };
      
      return icons[this.type] || icons.error;
    },
    
    showActions() {
      return this.retryable || this.dismissible || this.reportable;
    },
    
    ariaLive() {
      return this.type === 'error' ? 'assertive' : 'polite';
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
    
    async handleRetry() {
      this.retrying = true;
      
      try {
        await this.$emit('retry');
      } catch (error) {
        console.error('Retry failed:', error);
      } finally {
        this.retrying = false;
      }
    },
    
    handleReport() {
      this.$emit('report', {
        message: this.message,
        title: this.title,
        type: this.type,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    },
    
    formatFieldName(field) {
      return field
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
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  line-height: 1.5;
  
  // Type variants
  &.error-error {
    &.error-filled {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }
    
    &.error-outlined {
      background-color: transparent;
      border-color: #dc2626;
      color: #dc2626;
    }
    
    &.error-minimal {
      background-color: transparent;
      border: none;
      color: #dc2626;
    }
  }
  
  &.error-warning {
    &.error-filled {
      background-color: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.2);
      color: #d97706;
    }
    
    &.error-outlined {
      background-color: transparent;
      border-color: #d97706;
      color: #d97706;
    }
    
    &.error-minimal {
      background-color: transparent;
      border: none;
      color: #d97706;
    }
  }
  
  &.error-validation {
    &.error-filled {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }
    
    &.error-outlined {
      background-color: transparent;
      border-color: #dc2626;
      color: #dc2626;
    }
    
    &.error-minimal {
      background-color: transparent;
      border: none;
      color: #dc2626;
    }
  }
  
  // Size variants
  &.error-small {
    padding: 0.75rem;
    font-size: 0.8125rem;
    
    .error-icon {
      font-size: 1rem;
    }
  }
  
  &.error-medium {
    padding: 1rem;
    font-size: 0.875rem;
    
    .error-icon {
      font-size: 1.125rem;
    }
  }
  
  &.error-large {
    padding: 1.25rem;
    font-size: 1rem;
    
    .error-icon {
      font-size: 1.25rem;
    }
  }
  
  // Layout modifiers
  &.error-closable {
    padding-right: 2.5rem;
    position: relative;
  }
}

.error-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  
  i {
    display: block;
  }
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: currentColor;
}

.error-text {
  color: currentColor;
  
  p {
    margin: 0;
  }
  
  p + p {
    margin-top: 0.5rem;
  }
}

.error-list {
  margin: 0;
  padding-left: 1.25rem;
  
  li {
    margin-bottom: 0.25rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.error-field {
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  strong {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }
}

.error-field-list {
  margin: 0;
  padding-left: 1rem;
  
  li {
    margin-bottom: 0.125rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.error-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  background-color: transparent;
  color: currentColor;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: currentColor;
    color: white;
  }
  
  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background-color: transparent;
      color: currentColor;
    }
  }
  
  i {
    font-size: 0.75rem;
  }
}

.error-close {
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
  .error-message {
    &.error-error {
      &.error-filled {
        background-color: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
        color: #f87171;
      }
    }
    
    &.error-warning {
      &.error-filled {
        background-color: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.3);
        color: #fbbf24;
      }
    }
    
    &.error-validation {
      &.error-filled {
        background-color: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
        color: #f87171;
      }
    }
  }
  
  .error-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .error-message {
    border-width: 2px;
    
    &.error-minimal {
      border: 2px solid currentColor;
    }
  }
  
  .error-button {
    border-width: 2px;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .error-button,
  .error-close {
    transition: none;
  }
}

// Mobile optimizations
@media (max-width: 640px) {
  .error-message {
    padding: 0.875rem;
    
    &.error-small {
      padding: 0.625rem;
    }
    
    &.error-large {
      padding: 1rem;
    }
  }
  
  .error-actions {
    flex-direction: column;
    
    .error-button {
      justify-content: center;
    }
  }
  
  .error-close {
    top: 0.625rem;
    right: 0.625rem;
  }
}

// Print styles
@media print {
  .error-message {
    border: 1px solid #000;
    background: none !important;
    color: #000 !important;
  }
  
  .error-actions,
  .error-close {
    display: none;
  }
}
</style>