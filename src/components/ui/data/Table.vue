<template>
  <div 
    class="n-table-container"
    :class="{
      'n-table-container--responsive': responsive,
      'n-table-container--scrollable': scrollable,
      'n-table-container--small': size === 'small',
      'n-table-container--large': size === 'large',
    }"
  >
    <!-- Loading overlay -->
    <div v-if="loading" class="n-table-loading-overlay" aria-live="polite">
      <div class="n-table-loading-spinner">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="n-table-spinner-path" cx="12" cy="12" r="10" fill="none" stroke-width="3" />
        </svg>
      </div>
      <span>{{ loadingText }}</span>
    </div>

    <!-- Search and actions bar -->
    <div v-if="searchable || showActionsBar || $slots.actions" class="n-table-actions">
      <div v-if="searchable" class="n-table-search">
        <input
          type="text"
          class="n-table-search-input"
          :placeholder="searchPlaceholder"
          :value="searchTerm"
          @input="(e) => handleSearch(e.target.value)"
          aria-label="Search table"
        />
      </div>
      <div v-if="$slots.actions" class="n-table-actions-slot">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Main table -->
    <div class="n-table-wrapper">
      <table
        class="n-table"
        :class="{
          'n-table--bordered': bordered,
          'n-table--hoverable': hoverable,
          'n-table--striped': striped,
          'n-table--compact': compact,
          'n-table--dense': size === 'small',
          'n-table--relaxed': size === 'large'
        }"
        :aria-busy="loading ? 'true' : 'false'"
        :aria-colcount="columns.length"
        :aria-rowcount="computedItems.length + 1"
      >
        <caption v-if="caption" class="n-table-caption">{{ caption }}</caption>
        <thead class="n-table-header">
          <tr>
            <th 
              v-for="(column, idx) in columns" 
              :key="column.key || idx"
              :class="[
                'n-table-th',
                { 
                  'n-table-th--sortable': column.sortable,
                  'n-table-th--sorted': sortKey === (column.key || idx),
                  'n-table-th--align-left': column.align === 'left',
                  'n-table-th--align-center': column.align === 'center',
                  'n-table-th--align-right': column.align === 'right'
                }
              ]"
              :style="{ width: column.width }"
              :aria-sort="getSortAriaLabel(column.key || idx)"
              @click="column.sortable ? handleSort(column.key || idx) : null"
            >
              <div class="n-table-th-content">
                <span>{{ column.label }}</span>
                <span v-if="column.sortable" class="n-table-sort-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" v-if="sortKey === (column.key || idx) && sortDir === 'asc'">
                    <path d="M7 14l5-5 5 5H7z" fill="currentColor" />
                  </svg>
                  <svg viewBox="0 0 24 24" width="16" height="16" v-else-if="sortKey === (column.key || idx) && sortDir === 'desc'">
                    <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                  </svg>
                  <svg viewBox="0 0 24 24" width="16" height="16" v-else>
                    <path d="M7 10l5 5 5-5H7z M7 14l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                </span>
              </div>
            </th>
            <th v-if="hasRowActions" class="n-table-th n-table-th--actions">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="n-table-body">
          <tr 
            v-for="(item, rowIndex) in computedItems" 
            :key="item.id || rowIndex"
            class="n-table-row"
            :class="{ 'n-table-row--clickable': rowClickable }"
            @click="rowClickable ? handleRowClick(item, rowIndex) : null"
            :aria-rowindex="rowIndex + 2"
          >
            <td 
              v-for="(column, colIndex) in columns" 
              :key="column.key || colIndex"
              class="n-table-td"
              :class="[
                { 
                  'n-table-td--align-left': column.align === 'left',
                  'n-table-td--align-center': column.align === 'center',
                  'n-table-td--align-right': column.align === 'right'
                }
              ]"
              :aria-colindex="colIndex + 1"
            >
              <slot 
                :name="`cell(${column.key || colIndex})`" 
                :value="getCellValue(item, column.key)"
                :item="item"
                :index="rowIndex"
                :column="column"
              >
                {{ formatCellValue(getCellValue(item, column.key), column.format) }}
              </slot>
            </td>
            <td v-if="hasRowActions" class="n-table-td n-table-td--actions">
              <slot 
                name="row-actions" 
                :item="item" 
                :index="rowIndex"
              ></slot>
            </td>
          </tr>
          <tr v-if="computedItems.length === 0" class="n-table-empty-row">
            <td :colspan="columns.length + (hasRowActions ? 1 : 0)" class="n-table-empty-message">
              <slot name="empty">
                {{ emptyText }}
              </slot>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="$slots.footer" class="n-table-footer">
          <tr>
            <td :colspan="columns.length + (hasRowActions ? 1 : 0)">
              <slot name="footer"></slot>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && totalItems > 0" class="n-table-pagination">
      <div class="n-table-pagination-info">
        {{ paginationInfoText }}
      </div>
      <div class="n-table-pagination-controls">
        <button
          class="n-table-pagination-button n-table-pagination-prev"
          :disabled="currentPage <= 1"
          @click="handlePageChange(currentPage - 1)"
          aria-label="Previous page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        
        <div class="n-table-pagination-pages">
          <button
            v-for="page in visiblePages"
            :key="page"
            class="n-table-pagination-page"
            :class="{ 'n-table-pagination-page--active': page === currentPage }"
            @click="handlePageChange(page)"
            :aria-current="page === currentPage ? 'page' : undefined"
          >
            {{ page }}
          </button>
        </div>
        
        <button
          class="n-table-pagination-button n-table-pagination-next"
          :disabled="currentPage >= totalPages"
          @click="handlePageChange(currentPage + 1)"
          aria-label="Next page"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      
      <div v-if="pageSizeOptions.length > 0" class="n-table-pagination-size">
        <label :id="id + '-pagesize-label'" class="n-table-pagination-size-label">Rows per page:</label>
        <select
          :aria-labelledby="id + '-pagesize-label'"
          class="n-table-pagination-size-select"
          :value="pageSize"
          @change="e => handlePageSizeChange(Number(e.target.value))"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useSlots, onMounted } from 'vue';
import { generateUniqueId } from '../../../utils/uuidUtil';

/**
 * Table component for displaying data in rows and columns
 * @displayName Table
 * @example
 * <Table 
 *   :columns="[{key: 'name', label: 'Name'}, {key: 'age', label: 'Age'}]" 
 *   :items="[{name: 'John', age: 30}, {name: 'Jane', age: 25}]"
 * />
 */
export interface TableColumn {
  /** Unique key for the column, used to access data */
  key: string;
  /** Display label for the column */
  label: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Column width (e.g., '100px', '20%') */
  width?: string;
  /** Text alignment in the column */
  align?: 'left' | 'center' | 'right';
  /** Custom formatter function or format string */
  format?: (value: any) => string | string;
}

export interface TableProps {
  /** Array of column definitions */
  columns: TableColumn[];
  /** Array of data items to display */
  items: any[];
  /** Whether the table has borders */
  bordered?: boolean;
  /** Whether to show hover state on rows */
  hoverable?: boolean;
  /** Whether to show striped rows */
  striped?: boolean;
  /** Whether the table is in a loading state */
  loading?: boolean;
  /** The loading text to display */
  loadingText?: string;
  /** Text to display when there are no items */
  emptyText?: string;
  /** Whether the table is more compact */
  compact?: boolean;
  /** Size variant for the table */
  size?: 'small' | 'medium' | 'large';
  /** Whether the table should be horizontally scrollable */
  scrollable?: boolean;
  /** Whether the table should be responsive */
  responsive?: boolean;
  /** Whether the table is searchable */
  searchable?: boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Initial search term */
  initialSearchTerm?: string;
  /** Table caption (for accessibility) */
  caption?: string;
  /** Whether rows are clickable */
  rowClickable?: boolean;
  /** Whether to show the actions bar */
  showActionsBar?: boolean;
  /** Whether to enable pagination */
  pagination?: boolean;
  /** The current page (used with pagination) */
  page?: number;
  /** Items per page (used with pagination) */
  pageSize?: number;
  /** Total number of items (used with pagination) */
  totalItems?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Unique ID for the table */
  id?: string;
}

const props = withDefaults(defineProps<TableProps>(), {
  bordered: false,
  hoverable: true,
  striped: false,
  loading: false,
  loadingText: 'Loading data...',
  emptyText: 'No data available',
  compact: false,
  size: 'medium',
  scrollable: false,
  responsive: true,
  searchable: false,
  searchPlaceholder: 'Search...',
  initialSearchTerm: '',
  rowClickable: false,
  showActionsBar: false,
  pagination: false,
  page: 1,
  pageSize: 10,
  totalItems: 0,
  pageSizeOptions: () => [10, 25, 50, 100],
  id: () => `n-table-${generateUniqueId()}`
});

const emit = defineEmits<{
  (e: 'row-click', item: any, index: number): void;
  (e: 'sort', key: string, direction: 'asc' | 'desc'): void;
  (e: 'search', term: string): void;
  (e: 'page-change', page: number): void;
  (e: 'page-size-change', pageSize: number): void;
  (e: 'update:page', page: number): void;
  (e: 'update:pageSize', pageSize: number): void;
}>();

const slots = useSlots();

// State
const searchTerm = ref(props.initialSearchTerm);
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const currentPage = ref(props.page);
const currentPageSize = ref(props.pageSize);

// Computed values
const hasRowActions = computed(() => !!slots['row-actions']);

const totalPages = computed(() => {
  if (!props.pagination || props.totalItems <= 0) return 0;
  return Math.ceil(props.totalItems / currentPageSize.value);
});

const visiblePages = computed(() => {
  if (!props.pagination || totalPages.value <= 0) return [];
  
  // For small number of pages, show all
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  }
  
  // For larger number of pages, use ellipsis
  const pages = [];
  const currentPageValue = currentPage.value;
  
  pages.push(1);
  
  if (currentPageValue > 3) {
    pages.push('...');
  }
  
  // Show pages around current page
  const start = Math.max(2, currentPageValue - 1);
  const end = Math.min(totalPages.value - 1, currentPageValue + 1);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (currentPageValue < totalPages.value - 2) {
    pages.push('...');
  }
  
  pages.push(totalPages.value);
  
  return pages;
});

const paginationInfoText = computed(() => {
  if (!props.pagination || props.totalItems <= 0) return '';
  
  const start = (currentPage.value - 1) * currentPageSize.value + 1;
  const end = Math.min(start + currentPageSize.value - 1, props.totalItems);
  
  return `${start}-${end} of ${props.totalItems}`;
});

const computedItems = computed(() => {
  let items = [...props.items];
  
  // Apply search if needed
  if (props.searchable && searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    items = items.filter(item => {
      return props.columns.some(column => {
        const value = getCellValue(item, column.key);
        return value != null && String(value).toLowerCase().includes(term);
      });
    });
  }
  
  // Apply sorting if needed
  if (sortKey.value) {
    items = [...items].sort((a, b) => {
      const aValue = getCellValue(a, sortKey.value);
      const bValue = getCellValue(b, sortKey.value);
      
      // Handle nullish values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDir.value === 'asc' ? -1 : 1;
      if (bValue == null) return sortDir.value === 'asc' ? 1 : -1;
      
      // Compare based on value type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDir.value === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Numeric comparison
      return sortDir.value === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (bValue > aValue ? 1 : -1);
    });
  }
  
  // Apply pagination if needed
  if (props.pagination && !props.totalItems) {
    const start = (currentPage.value - 1) * currentPageSize.value;
    const end = start + currentPageSize.value;
    items = items.slice(start, end);
  }
  
  return items;
});

// Methods
function getCellValue(item: any, key: string | null): any {
  if (key === null) return null;
  
  // Handle nested paths with dot notation
  if (key.includes('.')) {
    return key.split('.').reduce((obj, path) => {
      return obj && obj[path] !== undefined ? obj[path] : null;
    }, item);
  }
  
  return item[key];
}

function formatCellValue(value: any, format?: ((value: any) => string) | string): string {
  if (value == null) return '';
  
  if (typeof format === 'function') {
    return format(value);
  }
  
  if (typeof format === 'string') {
    // Simple date formatting for ISO strings
    if (format.includes('date') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    // Number formatting
    if (format.includes('number') && typeof value === 'number') {
      try {
        return value.toLocaleString();
      } catch (e) {
        return String(value);
      }
    }
  }
  
  return String(value);
}

function handleSort(key: string): void {
  if (sortKey.value === key) {
    // Toggle direction
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New sort key
    sortKey.value = key;
    sortDir.value = 'asc';
  }
  
  emit('sort', key, sortDir.value);
}

function getSortAriaLabel(key: string): string {
  if (sortKey.value !== key) return 'none';
  return sortDir.value === 'asc' ? 'ascending' : 'descending';
}

function handleSearch(term: string): void {
  searchTerm.value = term;
  emit('search', term);
  
  // Reset to first page when searching
  if (props.pagination) {
    handlePageChange(1);
  }
}

function handleRowClick(item: any, index: number): void {
  if (props.rowClickable) {
    emit('row-click', item, index);
  }
}

function handlePageChange(page: number): void {
  if (page < 1 || page > totalPages.value) return;
  
  currentPage.value = page;
  emit('page-change', page);
  emit('update:page', page);
}

function handlePageSizeChange(size: number): void {
  currentPageSize.value = size;
  
  // Reset to first page when changing page size
  currentPage.value = 1;
  
  emit('page-size-change', size);
  emit('update:pageSize', size);
  emit('update:page', 1);
}

// Watchers
watch(() => props.page, (newPage) => {
  currentPage.value = newPage;
});

watch(() => props.pageSize, (newSize) => {
  currentPageSize.value = newSize;
});

// Lifecycle
onMounted(() => {
  // Initialize with first sortable column if available
  if (props.columns.some(col => col.sortable)) {
    const firstSortableColumn = props.columns.find(col => col.sortable);
    if (firstSortableColumn) {
      sortKey.value = firstSortableColumn.key;
    }
  }
});
</script>

<style scoped>
.n-table-container {
  --n-table-border-color: var(--nscale-gray-200);
  --n-table-hover-bg: var(--nscale-gray-50);
  --n-table-stripe-bg: var(--nscale-gray-50);
  --n-table-header-bg: var(--nscale-gray-100);
  --n-table-header-text: var(--nscale-gray-800);
  --n-table-body-text: var(--nscale-gray-800);
  --n-table-loading-bg: rgba(255, 255, 255, 0.7);
  --n-table-loading-text: var(--nscale-gray-600);
  --n-table-pagination-active-bg: var(--nscale-primary);
  --n-table-pagination-active-text: var(--nscale-white);
  --n-table-pagination-hover-bg: var(--nscale-gray-100);
  
  width: 100%;
  position: relative;
  margin-bottom: var(--nscale-space-6);
  border-radius: var(--nscale-border-radius-md);
  overflow: hidden;
  background-color: var(--nscale-white);
  box-shadow: var(--nscale-shadow-sm);
}

/* Table wrapper */
.n-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

/* Responsive table */
.n-table-container--responsive {
  @media (max-width: 768px) {
    .n-table {
      display: block;
    }
    
    .n-table-header {
      display: none;
    }
    
    .n-table-body {
      display: block;
    }
    
    .n-table-row {
      display: block;
      margin-bottom: var(--nscale-space-4);
      border: 1px solid var(--n-table-border-color);
      border-radius: var(--nscale-border-radius-md);
      padding: var(--nscale-space-2);
    }
    
    .n-table-td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: right;
      padding: var(--nscale-space-2) var(--nscale-space-3);
      border: none;
      border-bottom: 1px solid var(--n-table-border-color);
    }
    
    .n-table-td:before {
      content: attr(data-label);
      font-weight: var(--nscale-font-weight-semibold);
      margin-right: var(--nscale-space-4);
      text-align: left;
    }
    
    .n-table-td:last-child {
      border-bottom: none;
    }
    
    .n-table-td--actions {
      justify-content: flex-end;
    }
    
    .n-table-td--actions:before {
      display: none;
    }
  }
}

/* Main table styles */
.n-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0;
  color: var(--n-table-body-text);
}

.n-table--bordered {
  border: 1px solid var(--n-table-border-color);
}

.n-table--bordered .n-table-th,
.n-table--bordered .n-table-td {
  border: 1px solid var(--n-table-border-color);
}

.n-table-caption {
  padding: var(--nscale-space-3);
  font-style: italic;
  text-align: left;
  caption-side: top;
}

/* Header styles */
.n-table-header {
  background-color: var(--n-table-header-bg);
}

.n-table-th {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  font-weight: var(--nscale-font-weight-semibold);
  color: var(--n-table-header-text);
  text-align: left;
  border-bottom: 2px solid var(--n-table-border-color);
  transition: background-color var(--nscale-transition-quick);
  white-space: nowrap;
}

.n-table-th-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nscale-space-2);
}

.n-table-th--sortable {
  cursor: pointer;
}

.n-table-th--sortable:hover {
  background-color: var(--n-table-hover-bg);
}

.n-table-th--sorted {
  background-color: rgba(0, 0, 0, 0.03);
}

.n-table-sort-icon {
  display: inline-flex;
  align-items: center;
  opacity: 0.5;
}

.n-table-th--sorted .n-table-sort-icon {
  opacity: 1;
}

/* Alignment styles */
.n-table-th--align-left,
.n-table-td--align-left {
  text-align: left;
}

.n-table-th--align-center,
.n-table-td--align-center {
  text-align: center;
}

.n-table-th--align-right,
.n-table-td--align-right {
  text-align: right;
}

/* Body styles */
.n-table-td {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-bottom: 1px solid var(--n-table-border-color);
  transition: background-color var(--nscale-transition-quick);
}

/* Row hover effect */
.n-table--hoverable .n-table-row:hover .n-table-td {
  background-color: var(--n-table-hover-bg);
}

/* Striped rows */
.n-table--striped .n-table-row:nth-child(even) .n-table-td {
  background-color: var(--n-table-stripe-bg);
}

/* Clickable rows */
.n-table-row--clickable {
  cursor: pointer;
}

/* Size variants */
.n-table--dense .n-table-th,
.n-table--dense .n-table-td {
  padding: var(--nscale-space-2) var(--nscale-space-3);
  font-size: var(--nscale-font-size-sm);
}

.n-table--relaxed .n-table-th,
.n-table--relaxed .n-table-td {
  padding: var(--nscale-space-4) var(--nscale-space-6);
  font-size: var(--nscale-font-size-lg);
}

/* Compact mode */
.n-table--compact {
  font-size: var(--nscale-font-size-sm);
}

.n-table--compact .n-table-th,
.n-table--compact .n-table-td {
  padding: var(--nscale-space-2) var(--nscale-space-3);
}

/* Empty state */
.n-table-empty-message {
  padding: var(--nscale-space-6);
  text-align: center;
  color: var(--nscale-gray-500);
  font-style: italic;
}

/* Loading overlay */
.n-table-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--n-table-loading-bg);
  z-index: 1;
  color: var(--n-table-loading-text);
}

.n-table-loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: var(--nscale-space-3);
}

.n-table-spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: table-spinner-dash 1.5s ease-in-out infinite;
}

@keyframes table-spinner-dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* Search and actions bar */
.n-table-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-bottom: 1px solid var(--n-table-border-color);
}

.n-table-search {
  flex: 1;
  max-width: 300px;
}

.n-table-search-input {
  width: 100%;
  padding: var(--nscale-space-2) var(--nscale-space-3);
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
}

.n-table-search-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

.n-table-actions-slot {
  display: flex;
  gap: var(--nscale-space-2);
}

/* Pagination */
.n-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-top: 1px solid var(--n-table-border-color);
  background-color: var(--n-table-header-bg);
  font-size: var(--nscale-font-size-sm);
}

.n-table-pagination-info {
  color: var(--nscale-gray-600);
}

.n-table-pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
}

.n-table-pagination-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--n-table-border-color);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  cursor: pointer;
  transition: all var(--nscale-transition-quick);
}

.n-table-pagination-button:hover:not(:disabled) {
  background-color: var(--n-table-pagination-hover-bg);
}

.n-table-pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.n-table-pagination-pages {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1);
}

.n-table-pagination-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--nscale-space-2);
  border: 1px solid var(--n-table-border-color);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
  cursor: pointer;
  transition: all var(--nscale-transition-quick);
}

.n-table-pagination-page:hover:not(.n-table-pagination-page--active) {
  background-color: var(--n-table-pagination-hover-bg);
}

.n-table-pagination-page--active {
  background-color: var(--n-table-pagination-active-bg);
  border-color: var(--n-table-pagination-active-bg);
  color: var(--n-table-pagination-active-text);
  cursor: default;
}

.n-table-pagination-size {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
}

.n-table-pagination-size-label {
  color: var(--nscale-gray-600);
  white-space: nowrap;
}

.n-table-pagination-size-select {
  padding: var(--nscale-space-1) var(--nscale-space-2);
  border: 1px solid var(--n-table-border-color);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-white);
}

/* Screen reader only helper */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Dark theme support */
.theme-dark {
  --n-table-border-color: var(--nscale-gray-700);
  --n-table-hover-bg: var(--nscale-gray-700);
  --n-table-stripe-bg: var(--nscale-gray-800);
  --n-table-header-bg: var(--nscale-gray-800);
  --n-table-header-text: var(--nscale-gray-100);
  --n-table-body-text: var(--nscale-gray-100);
  --n-table-loading-bg: rgba(17, 24, 39, 0.7);
  --n-table-loading-text: var(--nscale-gray-300);
  --n-table-pagination-hover-bg: var(--nscale-gray-700);
}

/* High contrast theme */
.theme-contrast {
  --n-table-border-color: var(--nscale-primary);
  --n-table-header-bg: var(--nscale-black);
  --n-table-header-text: var(--nscale-primary);
  --n-table-body-text: var(--nscale-white);
  --n-table-hover-bg: var(--nscale-gray-900);
  --n-table-stripe-bg: var(--nscale-gray-900);
  --n-table-pagination-active-bg: var(--nscale-primary);
  --n-table-pagination-active-text: var(--nscale-black);
}
</style>