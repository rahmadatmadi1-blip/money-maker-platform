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
        :aria-describedby="contentId"
      >
        <div 
          class="modal-container"
          :class="modalClasses"
          @click.stop
        >
          <!-- Header -->
          <div v-if="showHeader" class="modal-header">
            <div class="modal-title-section">
              <div v-if="icon" class="modal-icon">
                <i :class="icon"></i>
              </div>
              <h2 :id="titleId" class="modal-title">
                <slot name="title">{{ title }}</slot>
              </h2>
            </div>
            
            <button
              v-if="closable"
              class="modal-close"
              @click="handleClose"
              :aria-label="closeLabel"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Body -->
          <div 
            :id="contentId"
            class="modal-body"
            :class="bodyClasses"
          >
            <slot></slot>
          </div>
          
          <!-- Footer -->
          <div v-if="showFooter" class="modal-footer">
            <slot name="footer">
              <div class="modal-actions">
                <button
                  v-if="showCancel"
                  class="modal-button secondary"
                  @click="handleCancel"
                  :disabled="loading"
                >
                  {{ cancelText }}
                </button>
                
                <button
                  v-if="showConfirm"
                  class="modal-button primary"
                  @click="handleConfirm"
                  :disabled="loading || confirmDisabled"
                >
                  <i v-if="loading" class="fas fa-spinner fa-spin"></i>
                  <span>{{ confirmText }}</span>
                </button>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: 'AppModal',
  
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large', 'extra-large', 'full'].includes(value),
    },
    closable: {
      type: Boolean,
      default: true,
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true,
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    showFooter: {
      type: Boolean,
      default: false,
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
    showConfirm: {
      type: Boolean,
      default: true,
    },
    cancelText: {
      type: String,
      default: 'Cancel',
    },
    confirmText: {
      type: String,
      default: 'Confirm',
    },
    confirmDisabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    closeLabel: {
      type: String,
      default: 'Close modal',
    },
    scrollable: {
      type: Boolean,
      default: true,
    },
    centered: {
      type: Boolean,
      default: true,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
  },
  
  emits: [
    'update:visible',
    'close',
    'cancel',
    'confirm',
    'opened',
    'closed',
  ],
  
  data() {
    return {
      titleId: `modal-title-${Math.random().toString(36).substr(2, 9)}`,
      contentId: `modal-content-${Math.random().toString(36).substr(2, 9)}`,
      previousActiveElement: null,
    };
  },
  
  computed: {
    isVisible() {
      return this.visible;
    },
    
    modalClasses() {
      return {
        [`modal-${this.size}`]: true,
        'modal-scrollable': this.scrollable,
        'modal-centered': this.centered,
      };
    },
    
    bodyClasses() {
      return {
        'modal-body-no-header': !this.showHeader,
        'modal-body-no-footer': !this.showFooter,
      };
    },
  },
  
  watch: {
    isVisible: {
      handler(newValue) {
        if (newValue) {
          this.onOpen();
        } else {
          this.onClose();
        }
      },
      immediate: true,
    },
  },
  
  mounted() {
    document.addEventListener('keydown', this.handleKeydown);
  },
  
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.restoreBodyScroll();
    this.restoreFocus();
  },
  
  methods: {
    onOpen() {
      if (!this.isVisible) return;
      
      // Store current active element
      this.previousActiveElement = document.activeElement;
      
      // Prevent body scroll
      this.preventBodyScroll();
      
      // Focus management
      this.$nextTick(() => {
        this.setInitialFocus();
      });
      
      this.$emit('opened');
    },
    
    onClose() {
      if (this.isVisible) return;
      
      // Restore body scroll
      this.restoreBodyScroll();
      
      // Restore focus
      this.restoreFocus();
      
      this.$emit('closed');
    },
    
    preventBodyScroll() {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
    },
    
    restoreBodyScroll() {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    },
    
    getScrollbarWidth() {
      const scrollDiv = document.createElement('div');
      scrollDiv.style.cssText = 'width: 100px; height: 100px; overflow: scroll; position: absolute; top: -9999px;';
      document.body.appendChild(scrollDiv);
      const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    },
    
    setInitialFocus() {
      // Focus on the first focusable element in the modal
      const focusableElements = this.$el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },
    
    restoreFocus() {
      if (this.previousActiveElement && this.previousActiveElement.focus) {
        this.previousActiveElement.focus();
      }
    },
    
    handleOverlayClick() {
      if (this.closeOnOverlayClick && !this.persistent) {
        this.handleClose();
      }
    },
    
    handleKeydown(event) {
      if (!this.isVisible) return;
      
      if (event.key === 'Escape' && this.closeOnEscape && !this.persistent) {
        event.preventDefault();
        this.handleClose();
      } else if (event.key === 'Tab') {
        this.handleTabKey(event);
      }
    },
    
    handleTabKey(event) {
      const focusableElements = this.$el.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    
    handleClose() {
      if (this.loading && this.persistent) return;
      
      this.$emit('update:visible', false);
      this.$emit('close');
    },
    
    handleCancel() {
      if (this.loading) return;
      
      this.$emit('cancel');
      
      if (!this.persistent) {
        this.handleClose();
      }
    },
    
    handleConfirm() {
      if (this.loading || this.confirmDisabled) return;
      
      this.$emit('confirm');
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
  z-index: 9999;
  padding: 1rem;
  
  &.modal-centered {
    align-items: center;
  }
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  
  &.modal-scrollable {
    overflow: hidden;
  }
  
  // Size variants
  &.modal-small {
    max-width: 400px;
  }
  
  &.modal-medium {
    max-width: 600px;
  }
  
  &.modal-large {
    max-width: 800px;
  }
  
  &.modal-extra-large {
    max-width: 1200px;
  }
  
  &.modal-full {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.modal-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  
  i {
    font-size: 1.25rem;
  }
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  
  i {
    font-size: 1rem;
  }
}

.modal-body {
  flex: 1;
  padding: 0 1.5rem;
  overflow-y: auto;
  
  &.modal-body-no-header {
    padding-top: 1.5rem;
  }
  
  &.modal-body-no-footer {
    padding-bottom: 1.5rem;
  }
}

.modal-footer {
  padding: 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid var(--border-color);
  margin-top: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  
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
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
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
  
  .modal-header {
    border-bottom-color: var(--border-color-dark);
  }
  
  .modal-footer {
    border-top-color: var(--border-color-dark);
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
}

// Mobile optimizations
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .modal-container {
    border-radius: 0.5rem;
    
    &.modal-full {
      max-width: 100vw;
      max-height: 100vh;
      border-radius: 0;
    }
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

// Print styles
@media print {
  .modal-overlay {
    position: static;
    background: none;
    padding: 0;
  }
  
  .modal-container {
    box-shadow: none;
    border: 1px solid #000;
    max-width: none;
    max-height: none;
  }
  
  .modal-close {
    display: none;
  }
}
</style>