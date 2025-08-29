<template>
  <teleport to="#modal-root">
    <transition name="modal" appear>
      <div
        v-if="isVisible"
        class="modal-overlay"
        @click="handleOverlayClick"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
      >
        <div class="modal-container" @click.stop>
          <div class="modal-content">
            <!-- Icon -->
            <div class="modal-icon" :class="iconClass">
              <i :class="iconName"></i>
            </div>

            <!-- Content -->
            <div class="modal-body">
              <h3 :id="titleId" class="modal-title">
                {{ dialog.title || defaultTitle }}
              </h3>
              
              <p :id="messageId" class="modal-message">
                {{ dialog.message || 'Are you sure you want to continue?' }}
              </p>
              
              <!-- Additional content -->
              <div v-if="dialog.content" class="modal-additional-content" v-html="dialog.content"></div>
              
              <!-- Input field for confirmation -->
              <div v-if="dialog.requireConfirmation" class="modal-confirmation">
                <label :for="inputId" class="confirmation-label">
                  {{ dialog.confirmationLabel || `Type "${dialog.confirmationText || 'CONFIRM'}" to continue:` }}
                </label>
                <input
                  :id="inputId"
                  v-model="confirmationInput"
                  type="text"
                  class="confirmation-input"
                  :placeholder="dialog.confirmationText || 'CONFIRM'"
                  @keyup.enter="handleConfirm"
                  ref="confirmationInputRef"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button
                class="modal-button secondary"
                @click="handleCancel"
                :disabled="isLoading"
              >
                {{ dialog.cancelText || 'Cancel' }}
              </button>
              
              <button
                class="modal-button"
                :class="confirmButtonClass"
                @click="handleConfirm"
                :disabled="isConfirmDisabled"
              >
                <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
                <span>{{ dialog.confirmText || defaultConfirmText }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'AppConfirmDialog',
  
  data() {
    return {
      confirmationInput: '',
      isLoading: false,
      titleId: `confirm-title-${Math.random().toString(36).substr(2, 9)}`,
      messageId: `confirm-message-${Math.random().toString(36).substr(2, 9)}`,
      inputId: `confirm-input-${Math.random().toString(36).substr(2, 9)}`,
    };
  },
  
  computed: {
    ...mapGetters('ui', {
      dialog: 'confirmDialog',
    }),
    
    isVisible() {
      return this.dialog && this.dialog.visible;
    },
    
    iconClass() {
      const type = this.dialog?.type || 'warning';
      return {
        'icon-success': type === 'success',
        'icon-warning': type === 'warning',
        'icon-error': type === 'error' || type === 'danger',
        'icon-info': type === 'info',
      };
    },
    
    iconName() {
      const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-exclamation-circle',
        danger: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
      };
      
      return icons[this.dialog?.type] || icons.warning;
    },
    
    defaultTitle() {
      const titles = {
        success: 'Success',
        warning: 'Confirm Action',
        error: 'Error',
        danger: 'Dangerous Action',
        info: 'Information',
      };
      
      return titles[this.dialog?.type] || titles.warning;
    },
    
    defaultConfirmText() {
      const texts = {
        success: 'OK',
        warning: 'Confirm',
        error: 'OK',
        danger: 'Delete',
        info: 'OK',
      };
      
      return texts[this.dialog?.type] || texts.warning;
    },
    
    confirmButtonClass() {
      const type = this.dialog?.type || 'warning';
      return {
        'primary': type === 'success' || type === 'info',
        'warning': type === 'warning',
        'danger': type === 'error' || type === 'danger',
      };
    },
    
    isConfirmDisabled() {
      if (this.isLoading) return true;
      
      if (this.dialog?.requireConfirmation) {
        const expectedText = this.dialog.confirmationText || 'CONFIRM';
        return this.confirmationInput.trim() !== expectedText;
      }
      
      return false;
    },
  },
  
  watch: {
    isVisible(newValue) {
      if (newValue) {
        this.resetDialog();
        this.$nextTick(() => {
          // Focus on confirmation input if required, otherwise focus on confirm button
          if (this.dialog?.requireConfirmation) {
            this.$refs.confirmationInputRef?.focus();
          } else {
            const confirmButton = this.$el.querySelector('.modal-button:not(.secondary)');
            confirmButton?.focus();
          }
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body scroll
        document.body.style.overflow = '';
      }
    },
  },
  
  mounted() {
    // Listen for global confirm dialog events
    this.$root.$on('confirm', this.showDialog);
    
    // Handle escape key
    document.addEventListener('keydown', this.handleKeydown);
  },
  
  beforeUnmount() {
    this.$root.$off('confirm');
    document.removeEventListener('keydown', this.handleKeydown);
    document.body.style.overflow = '';
  },
  
  methods: {
    ...mapActions('ui', {
      showConfirmDialog: 'showConfirmDialog',
      hideConfirmDialog: 'hideConfirmDialog',
    }),
    
    showDialog(options) {
      this.showConfirmDialog(options);
    },
    
    resetDialog() {
      this.confirmationInput = '';
      this.isLoading = false;
    },
    
    handleOverlayClick() {
      if (this.dialog?.closeOnOverlayClick !== false) {
        this.handleCancel();
      }
    },
    
    handleKeydown(event) {
      if (!this.isVisible) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        this.handleCancel();
      } else if (event.key === 'Enter' && !this.dialog?.requireConfirmation) {
        event.preventDefault();
        this.handleConfirm();
      }
    },
    
    async handleConfirm() {
      if (this.isConfirmDisabled) return;
      
      this.isLoading = true;
      
      try {
        if (this.dialog?.onConfirm) {
          const result = await this.dialog.onConfirm();
          
          // If onConfirm returns false, don't close the dialog
          if (result === false) {
            this.isLoading = false;
            return;
          }
        }
        
        this.hideConfirmDialog();
      } catch (error) {
        console.error('Confirm dialog error:', error);
        
        // Show error toast
        this.$root.$emit('toast:error', 
          error.message || 'An error occurred while processing your request'
        );
        
        this.isLoading = false;
      }
    },
    
    handleCancel() {
      if (this.isLoading) return;
      
      if (this.dialog?.onCancel) {
        this.dialog.onCancel();
      }
      
      this.hideConfirmDialog();
    },
  },
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content {
  padding: 1.5rem;
  text-align: center;
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    font-size: 2rem;
  }
  
  &.icon-success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success);
  }
  
  &.icon-warning {
    background-color: rgba(245, 158, 11, 0.1);
    color: var(--warning);
  }
  
  &.icon-error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--error);
  }
  
  &.icon-info {
    background-color: rgba(6, 182, 212, 0.1);
    color: var(--info);
  }
}

.modal-body {
  margin-bottom: 2rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.modal-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.modal-additional-content {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: left;
}

.modal-confirmation {
  margin-top: 1.5rem;
  text-align: left;
}

.confirmation-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.confirmation-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  
  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
}

.modal-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.secondary {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
    
    &:hover:not(:disabled) {
      background-color: var(--bg-tertiary);
    }
  }
  
  &.primary {
    background-color: var(--primary);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-dark);
    }
  }
  
  &.warning {
    background-color: var(--warning);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #d97706;
    }
  }
  
  &.danger {
    background-color: var(--error);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #dc2626;
    }
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
}

// Modal transitions
.modal-enter-active {
  transition: opacity 0.3s ease;
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(-20px);
}

// Dark mode adjustments
.dark {
  .modal-container {
    background-color: var(--bg-secondary);
  }
  
  .modal-additional-content {
    background-color: var(--bg-tertiary);
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    transition: opacity 0.2s;
  }
  
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
  
  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: none;
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .modal-container {
    border: 2px solid var(--text-primary);
  }
  
  .modal-button {
    border-width: 2px;
  }
  
  .confirmation-input {
    border-width: 2px;
  }
}

// Focus styles for accessibility
.modal-button:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.confirmation-input:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>