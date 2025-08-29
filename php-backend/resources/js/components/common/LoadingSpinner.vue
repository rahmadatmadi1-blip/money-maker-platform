<template>
  <div 
    class="loading-spinner"
    :class="spinnerClasses"
    :style="spinnerStyles"
    role="status"
    :aria-label="ariaLabel"
  >
    <!-- Spinner variants -->
    <div v-if="variant === 'dots'" class="spinner-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    
    <div v-else-if="variant === 'pulse'" class="spinner-pulse">
      <div class="pulse-ring"></div>
      <div class="pulse-ring"></div>
      <div class="pulse-ring"></div>
    </div>
    
    <div v-else-if="variant === 'bars'" class="spinner-bars">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>
    
    <div v-else-if="variant === 'circle'" class="spinner-circle">
      <svg viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="31.416"
          stroke-dashoffset="31.416"
        >
          <animate
            attributeName="stroke-dasharray"
            dur="2s"
            values="0 31.416;15.708 15.708;0 31.416"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            dur="2s"
            values="0;-15.708;-31.416"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
    
    <div v-else-if="variant === 'ring'" class="spinner-ring">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    
    <!-- Default spinner -->
    <div v-else class="spinner-default">
      <div class="spinner-border"></div>
    </div>
    
    <!-- Loading text -->
    <div v-if="showText" class="loading-text">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  
  props: {
    variant: {
      type: String,
      default: 'default',
      validator: (value) => [
        'default', 'dots', 'pulse', 'bars', 'circle', 'ring'
      ].includes(value),
    },
    size: {
      type: [String, Number],
      default: 'medium',
      validator: (value) => {
        if (typeof value === 'number') return value > 0;
        return ['small', 'medium', 'large', 'extra-large'].includes(value);
      },
    },
    color: {
      type: String,
      default: 'primary',
    },
    text: {
      type: String,
      default: 'Loading...',
    },
    showText: {
      type: Boolean,
      default: false,
    },
    overlay: {
      type: Boolean,
      default: false,
    },
    centered: {
      type: Boolean,
      default: false,
    },
    inline: {
      type: Boolean,
      default: false,
    },
    speed: {
      type: String,
      default: 'normal',
      validator: (value) => ['slow', 'normal', 'fast'].includes(value),
    },
  },
  
  computed: {
    spinnerClasses() {
      return {
        [`spinner-${this.variant}`]: true,
        [`spinner-${this.sizeClass}`]: typeof this.size === 'string',
        [`spinner-${this.color}`]: true,
        [`spinner-${this.speed}`]: true,
        'spinner-overlay': this.overlay,
        'spinner-centered': this.centered,
        'spinner-inline': this.inline,
        'spinner-with-text': this.showText,
      };
    },
    
    sizeClass() {
      return typeof this.size === 'string' ? this.size : 'custom';
    },
    
    spinnerStyles() {
      const styles = {};
      
      if (typeof this.size === 'number') {
        styles['--spinner-size'] = `${this.size}px`;
      }
      
      return styles;
    },
    
    ariaLabel() {
      return this.showText ? this.text : 'Loading';
    },
  },
};
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  // Size variants
  --spinner-size-small: 16px;
  --spinner-size-medium: 24px;
  --spinner-size-large: 32px;
  --spinner-size-extra-large: 48px;
  
  // Speed variants
  --spinner-speed-slow: 2s;
  --spinner-speed-normal: 1s;
  --spinner-speed-fast: 0.5s;
  
  // Color variants
  &.spinner-primary {
    color: var(--primary);
  }
  
  &.spinner-secondary {
    color: var(--text-secondary);
  }
  
  &.spinner-success {
    color: var(--success);
  }
  
  &.spinner-warning {
    color: var(--warning);
  }
  
  &.spinner-error {
    color: var(--error);
  }
  
  &.spinner-white {
    color: white;
  }
  
  // Size classes
  &.spinner-small {
    --spinner-size: var(--spinner-size-small);
  }
  
  &.spinner-medium {
    --spinner-size: var(--spinner-size-medium);
  }
  
  &.spinner-large {
    --spinner-size: var(--spinner-size-large);
  }
  
  &.spinner-extra-large {
    --spinner-size: var(--spinner-size-extra-large);
  }
  
  &.spinner-custom {
    --spinner-size: var(--spinner-size, 24px);
  }
  
  // Speed classes
  &.spinner-slow {
    --spinner-duration: var(--spinner-speed-slow);
  }
  
  &.spinner-normal {
    --spinner-duration: var(--spinner-speed-normal);
  }
  
  &.spinner-fast {
    --spinner-duration: var(--spinner-speed-fast);
  }
  
  // Layout modifiers
  &.spinner-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 9999;
    
    .dark & {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }
  
  &.spinner-centered {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  &.spinner-inline {
    display: inline-flex;
    flex-direction: row;
    gap: 0.5rem;
  }
  
  &.spinner-with-text {
    gap: 0.75rem;
  }
}

// Default spinner
.spinner-default {
  width: var(--spinner-size);
  height: var(--spinner-size);
}

.spinner-border {
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin var(--spinner-duration) linear infinite;
}

// Dots spinner
.spinner-dots {
  display: flex;
  gap: 4px;
  
  .dot {
    width: calc(var(--spinner-size) / 4);
    height: calc(var(--spinner-size) / 4);
    background-color: currentColor;
    border-radius: 50%;
    animation: dots var(--spinner-duration) ease-in-out infinite;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.1s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.2s;
    }
  }
}

// Pulse spinner
.spinner-pulse {
  position: relative;
  width: var(--spinner-size);
  height: var(--spinner-size);
  
  .pulse-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 2px solid currentColor;
    border-radius: 50%;
    animation: pulse var(--spinner-duration) ease-out infinite;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.6s;
    }
  }
}

// Bars spinner
.spinner-bars {
  display: flex;
  gap: 2px;
  align-items: center;
  
  .bar {
    width: calc(var(--spinner-size) / 8);
    height: var(--spinner-size);
    background-color: currentColor;
    border-radius: 1px;
    animation: bars var(--spinner-duration) ease-in-out infinite;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.1s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(4) {
      animation-delay: 0.3s;
    }
    
    &:nth-child(5) {
      animation-delay: 0.4s;
    }
  }
}

// Circle spinner
.spinner-circle {
  width: var(--spinner-size);
  height: var(--spinner-size);
  
  svg {
    width: 100%;
    height: 100%;
    animation: rotate var(--spinner-duration) linear infinite;
  }
}

// Ring spinner
.spinner-ring {
  position: relative;
  width: var(--spinner-size);
  height: var(--spinner-size);
  
  div {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: calc(var(--spinner-size) / 8) solid transparent;
    border-radius: 50%;
    animation: ring var(--spinner-duration) cubic-bezier(0.5, 0, 0.5, 1) infinite;
    
    &:nth-child(1) {
      border-color: currentColor transparent transparent transparent;
      animation-delay: -0.45s;
    }
    
    &:nth-child(2) {
      border-color: transparent currentColor transparent transparent;
      animation-delay: -0.3s;
    }
    
    &:nth-child(3) {
      border-color: transparent transparent currentColor transparent;
      animation-delay: -0.15s;
    }
    
    &:nth-child(4) {
      border-color: transparent transparent transparent currentColor;
    }
  }
}

// Loading text
.loading-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-align: center;
  
  .spinner-inline & {
    font-size: inherit;
    margin: 0;
  }
}

// Animations
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dots {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes bars {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation-duration: 2s;
  }
  
  .spinner-border,
  .spinner-dots .dot,
  .spinner-pulse .pulse-ring,
  .spinner-bars .bar,
  .spinner-circle svg,
  .spinner-ring div {
    animation-duration: 2s;
  }
}

// High contrast mode
@media (prefers-contrast: high) {
  .loading-spinner {
    &.spinner-primary {
      color: #0066cc;
    }
    
    &.spinner-secondary {
      color: #666666;
    }
  }
  
  .dark .loading-spinner {
    &.spinner-primary {
      color: #66b3ff;
    }
    
    &.spinner-secondary {
      color: #cccccc;
    }
  }
}

// Print styles
@media print {
  .loading-spinner {
    display: none;
  }
}
</style>