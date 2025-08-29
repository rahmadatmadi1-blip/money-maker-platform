<template>
  <nav 
    v-if="shouldShow"
    class="pagination"
    :class="paginationClasses"
    role="navigation"
    :aria-label="ariaLabel"
  >
    <!-- Info section -->
    <div v-if="showInfo" class="pagination-info">
      <span class="pagination-text">
        Showing {{ startItem }} to {{ endItem }} of {{ totalItems }} {{ itemName }}
      </span>
    </div>
    
    <!-- Navigation -->
    <div class="pagination-nav">
      <!-- First page -->
      <button
        v-if="showFirstLast"
        class="pagination-button"
        :class="{ disabled: isFirstPage }"
        :disabled="isFirstPage"
        @click="goToPage(1)"
        :aria-label="'Go to first page'"
      >
        <i class="fas fa-angle-double-left"></i>
        <span v-if="showLabels" class="pagination-label">First</span>
      </button>
      
      <!-- Previous page -->
      <button
        class="pagination-button"
        :class="{ disabled: isFirstPage }"
        :disabled="isFirstPage"
        @click="goToPrevious"
        :aria-label="'Go to previous page'"
      >
        <i class="fas fa-angle-left"></i>
        <span v-if="showLabels" class="pagination-label">Previous</span>
      </button>
      
      <!-- Page numbers -->
      <div v-if="showNumbers" class="pagination-numbers">
        <!-- First page if not in visible range -->
        <button
          v-if="showFirstEllipsis"
          class="pagination-number"
          @click="goToPage(1)"
          :aria-label="'Go to page 1'"
        >
          1
        </button>
        
        <!-- First ellipsis -->
        <span v-if="showFirstEllipsis" class="pagination-ellipsis">
          <i class="fas fa-ellipsis-h"></i>
        </span>
        
        <!-- Visible page numbers -->
        <button
          v-for="page in visiblePages"
          :key="page"
          class="pagination-number"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
          :aria-label="`Go to page ${page}`"
          :aria-current="page === currentPage ? 'page' : null"
        >
          {{ page }}
        </button>
        
        <!-- Last ellipsis -->
        <span v-if="showLastEllipsis" class="pagination-ellipsis">
          <i class="fas fa-ellipsis-h"></i>
        </span>
        
        <!-- Last page if not in visible range -->
        <button
          v-if="showLastEllipsis"
          class="pagination-number"
          @click="goToPage(totalPages)"
          :aria-label="`Go to page ${totalPages}`"
        >
          {{ totalPages }}
        </button>
      </div>
      
      <!-- Page input -->
      <div v-if="showPageInput" class="pagination-input">
        <label class="pagination-input-label">
          Page
          <input
            v-model.number="pageInput"
            type="number"
            :min="1"
            :max="totalPages"
            class="pagination-input-field"
            @keyup.enter="goToInputPage"
            @blur="goToInputPage"
          />
        </label>
        <span class="pagination-input-total">of {{ totalPages }}</span>
      </div>
      
      <!-- Next page -->
      <button
        class="pagination-button"
        :class="{ disabled: isLastPage }"
        :disabled="isLastPage"
        @click="goToNext"
        :aria-label="'Go to next page'"
      >
        <span v-if="showLabels" class="pagination-label">Next</span>
        <i class="fas fa-angle-right"></i>
      </button>
      
      <!-- Last page -->
      <button
        v-if="showFirstLast"
        class="pagination-button"
        :class="{ disabled: isLastPage }"
        :disabled="isLastPage"
        @click="goToPage(totalPages)"
        :aria-label="'Go to last page'"
      >
        <span v-if="showLabels" class="pagination-label">Last</span>
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
    
    <!-- Per page selector -->
    <div v-if="showPerPageSelector" class="pagination-per-page">
      <label class="pagination-per-page-label">
        Show
        <select
          v-model="selectedPerPage"
          class="pagination-per-page-select"
          @change="handlePerPageChange"
        >
          <option
            v-for="option in perPageOptions"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>
        per page
      </label>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'Pagination',
  
  props: {
    currentPage: {
      type: Number,
      default: 1,
    },
    totalItems: {
      type: Number,
      required: true,
    },
    perPage: {
      type: Number,
      default: 10,
    },
    maxVisiblePages: {
      type: Number,
      default: 5,
    },
    showInfo: {
      type: Boolean,
      default: true,
    },
    showNumbers: {
      type: Boolean,
      default: true,
    },
    showFirstLast: {
      type: Boolean,
      default: true,
    },
    showLabels: {
      type: Boolean,
      default: false,
    },
    showPageInput: {
      type: Boolean,
      default: false,
    },
    showPerPageSelector: {
      type: Boolean,
      default: false,
    },
    perPageOptions: {
      type: Array,
      default: () => [10, 25, 50, 100],
    },
    itemName: {
      type: String,
      default: 'items',
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value),
    },
    variant: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'minimal', 'rounded'].includes(value),
    },
    alignment: {
      type: String,
      default: 'center',
      validator: (value) => ['left', 'center', 'right', 'between'].includes(value),
    },
    ariaLabel: {
      type: String,
      default: 'Pagination navigation',
    },
  },
  
  emits: [
    'page-change',
    'per-page-change',
  ],
  
  data() {
    return {
      pageInput: this.currentPage,
      selectedPerPage: this.perPage,
    };
  },
  
  computed: {
    totalPages() {
      return Math.ceil(this.totalItems / this.perPage);
    },
    
    isFirstPage() {
      return this.currentPage <= 1;
    },
    
    isLastPage() {
      return this.currentPage >= this.totalPages;
    },
    
    startItem() {
      return (this.currentPage - 1) * this.perPage + 1;
    },
    
    endItem() {
      return Math.min(this.currentPage * this.perPage, this.totalItems);
    },
    
    shouldShow() {
      return this.totalPages > 1 || this.showPerPageSelector;
    },
    
    visiblePages() {
      const pages = [];
      const half = Math.floor(this.maxVisiblePages / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);
      
      // Adjust start if we're near the end
      if (end - start + 1 < this.maxVisiblePages) {
        start = Math.max(1, end - this.maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    },
    
    showFirstEllipsis() {
      return this.visiblePages[0] > 2;
    },
    
    showLastEllipsis() {
      return this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1;
    },
    
    paginationClasses() {
      return {
        [`pagination-${this.size}`]: true,
        [`pagination-${this.variant}`]: true,
        [`pagination-${this.alignment}`]: true,
      };
    },
  },
  
  watch: {
    currentPage(newValue) {
      this.pageInput = newValue;
    },
    
    perPage(newValue) {
      this.selectedPerPage = newValue;
    },
  },
  
  methods: {
    goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage) {
        return;
      }
      
      this.$emit('page-change', page);
    },
    
    goToPrevious() {
      this.goToPage(this.currentPage - 1);
    },
    
    goToNext() {
      this.goToPage(this.currentPage + 1);
    },
    
    goToInputPage() {
      const page = parseInt(this.pageInput);
      if (isNaN(page)) {
        this.pageInput = this.currentPage;
        return;
      }
      
      const clampedPage = Math.max(1, Math.min(this.totalPages, page));
      this.pageInput = clampedPage;
      this.goToPage(clampedPage);
    },
    
    handlePerPageChange() {
      this.$emit('per-page-change', this.selectedPerPage);
    },
  },
};
</script>

<style lang="scss" scoped>
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  
  // Alignment variants
  &.pagination-left {
    justify-content: flex-start;
  }
  
  &.pagination-center {
    justify-content: center;
  }
  
  &.pagination-right {
    justify-content: flex-end;
  }
  
  &.pagination-between {
    justify-content: space-between;
  }
  
  // Size variants
  &.pagination-small {
    font-size: 0.8125rem;
    gap: 0.75rem;
  }
  
  &.pagination-medium {
    font-size: 0.875rem;
    gap: 1rem;
  }
  
  &.pagination-large {
    font-size: 1rem;
    gap: 1.25rem;
  }
}

.pagination-info {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.pagination-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(.disabled) {
    background-color: var(--bg-secondary);
    border-color: var(--primary);
  }
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--border-color);
    }
  }
  
  i {
    font-size: 0.875em;
  }
  
  .pagination-small & {
    padding: 0.375rem 0.5rem;
    
    i {
      font-size: 0.8125em;
    }
  }
  
  .pagination-large & {
    padding: 0.625rem 1rem;
    
    i {
      font-size: 1em;
    }
  }
  
  // Variant styles
  .pagination-rounded & {
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    justify-content: center;
    
    .pagination-label {
      display: none;
    }
    
    .pagination-small & {
      width: 2rem;
      height: 2rem;
    }
    
    .pagination-large & {
      width: 3rem;
      height: 3rem;
    }
  }
  
  .pagination-minimal & {
    border: none;
    background: none;
    
    &:hover:not(.disabled) {
      background-color: var(--bg-secondary);
    }
  }
}

.pagination-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-secondary);
    border-color: var(--primary);
  }
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  
  &.active {
    background-color: var(--primary);
    border-color: var(--primary);
    color: white;
    
    &:hover {
      background-color: var(--primary-dark);
      border-color: var(--primary-dark);
    }
  }
  
  .pagination-small & {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.375rem;
  }
  
  .pagination-large & {
    min-width: 3rem;
    height: 3rem;
    padding: 0 0.75rem;
  }
  
  // Variant styles
  .pagination-rounded & {
    border-radius: 50%;
    width: 2.5rem;
    padding: 0;
    
    .pagination-small & {
      width: 2rem;
    }
    
    .pagination-large & {
      width: 3rem;
    }
  }
  
  .pagination-minimal & {
    border: none;
    background: none;
    
    &:hover {
      background-color: var(--bg-secondary);
    }
    
    &.active {
      background-color: var(--primary);
      color: white;
    }
  }
}

.pagination-ellipsis {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  color: var(--text-tertiary);
  
  .pagination-small & {
    min-width: 2rem;
    height: 2rem;
  }
  
  .pagination-large & {
    min-width: 3rem;
    height: 3rem;
  }
}

.pagination-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.pagination-input-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.pagination-input-field {
  width: 4rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: inherit;
  text-align: center;
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-color: var(--primary);
  }
  
  .pagination-small & {
    width: 3rem;
    padding: 0.25rem 0.375rem;
  }
  
  .pagination-large & {
    width: 5rem;
    padding: 0.5rem 0.625rem;
  }
}

.pagination-input-total {
  color: var(--text-tertiary);
}

.pagination-per-page {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.pagination-per-page-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.pagination-per-page-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: inherit;
  cursor: pointer;
  
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-color: var(--primary);
  }
  
  .pagination-small & {
    padding: 0.25rem 0.375rem;
  }
  
  .pagination-large & {
    padding: 0.5rem 0.625rem;
  }
}

// Dark mode adjustments
.dark {
  .pagination-button,
  .pagination-number {
    background-color: var(--bg-secondary);
    border-color: var(--border-color-dark);
    
    &:hover:not(.disabled) {
      background-color: var(--bg-tertiary);
    }
  }
  
  .pagination-input-field,
  .pagination-per-page-select {
    background-color: var(--bg-secondary);
    border-color: var(--border-color-dark);
  }
}

// Mobile optimizations
@media (max-width: 640px) {
  .pagination {
    flex-direction: column;
    gap: 0.75rem;
    
    &.pagination-between {
      align-items: stretch;
    }
  }
  
  .pagination-nav {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .pagination-button {
    .pagination-label {
      display: none;
    }
  }
  
  .pagination-info,
  .pagination-per-page {
    text-align: center;
  }
}

// Print styles
@media print {
  .pagination {
    display: none;
  }
}
</style>