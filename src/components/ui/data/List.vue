<template>
  <div 
    class="n-list-container"
    :class="{
      'n-list-container--bordered': bordered,
      'n-list-container--loading': loading,
    }"
  >
    <!-- Loading overlay -->
    <div v-if="loading" class="n-list-loading-overlay" aria-live="polite">
      <div class="n-list-loading-spinner">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="n-list-spinner-path" cx="12" cy="12" r="10" fill="none" stroke-width="3" />
        </svg>
      </div>
      <span>{{ loadingText }}</span>
    </div>
    
    <!-- Header slot -->
    <div v-if="$slots.header" class="n-list-header">
      <slot name="header"></slot>
    </div>
    
    <!-- Search and actions bar -->
    <div v-if="searchable || $slots.actions" class="n-list-actions">
      <div v-if="searchable" class="n-list-search">
        <input
          type="text"
          class="n-list-search-input"
          :placeholder="searchPlaceholder"
          :value="searchTerm"
          @input="(e) => handleSearch(e.target.value)"
          aria-label="Search list"
        />
      </div>
      <div v-if="$slots.actions" class="n-list-actions-slot">
        <slot name="actions"></slot>
      </div>
    </div>
    
    <!-- List -->
    <ul 
      class="n-list"
      :class="{
        'n-list--bordered': bordered,
        'n-list--hover': hoverable,
        'n-list--compact': size === 'small',
        'n-list--default': size === 'medium',
        'n-list--large': size === 'large',
        'n-list--vertical': layout === 'vertical',
        'n-list--horizontal': layout === 'horizontal',
        'n-list--grid': layout === 'grid'
      }"
      role="list"
      :aria-busy="loading ? 'true' : 'false'"
    >
      <template v-if="computedItems.length > 0">
        <li 
          v-for="(item, index) in computedItems" 
          :key="getItemKey(item, index)"
          class="n-list-item"
          :class="{
            'n-list-item--clickable': itemClickable,
            'n-list-item--active': isItemActive(item, index)
          }"
          @click="itemClickable ? handleItemClick(item, index) : null"
        >
          <!-- Default item rendering -->
          <slot 
            name="item" 
            :item="item" 
            :index="index"
            :active="isItemActive(item, index)"
          >
            <div class="n-list-item-content">
              <!-- Item prefix (icon, avatar, etc.) -->
              <div v-if="$slots.prefix" class="n-list-item-prefix">
                <slot name="prefix" :item="item" :index="index"></slot>
              </div>
              
              <!-- Main item content -->
              <div class="n-list-item-main">
                <!-- Title -->
                <div class="n-list-item-title">
                  <slot name="title" :item="item" :index="index">
                    {{ getItemProp(item, titleProp) }}
                  </slot>
                </div>
                
                <!-- Description -->
                <div v-if="descriptionProp && getItemProp(item, descriptionProp)" class="n-list-item-description">
                  <slot name="description" :item="item" :index="index">
                    {{ getItemProp(item, descriptionProp) }}
                  </slot>
                </div>
              </div>
              
              <!-- Item suffix (actions, badges, etc.) -->
              <div v-if="$slots.suffix" class="n-list-item-suffix">
                <slot name="suffix" :item="item" :index="index"></slot>
              </div>
            </div>
          </slot>
        </li>
      </template>
      
      <!-- Empty state -->
      <li v-if="computedItems.length === 0" class="n-list-empty" role="status">
        <slot name="empty">
          <div class="n-list-empty-content">
            {{ emptyText }}
          </div>
        </slot>
      </li>
    </ul>
    
    <!-- Footer slot -->
    <div v-if="$slots.footer" class="n-list-footer">
      <slot name="footer"></slot>
    </div>
    
    <!-- Pagination -->
    <div v-if="pagination && totalItems > 0" class="n-list-pagination">
      <Pagination
        :model-value="currentPage"
        :total-items="totalItems"
        :page-size="pageSize"
        :page-size-options="pageSizeOptions"
        :size="size === 'large' ? 'medium' : (size === 'small' ? 'small' : 'small')"
        @update:model-value="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Pagination from './Pagination.vue';

/**
 * List component for displaying collections of content
 * @displayName List
 * @example
 * <List 
 *   :items="[{title: 'Item 1', description: 'Description 1'}, {title: 'Item 2'}]"
 *   title-prop="title"
 *   description-prop="description"
 * />
 */
export interface ListProps {
  /** Array of data items to display */
  items: any[];
  /** Which property to use as the title */
  titleProp?: string;
  /** Which property to use as the description */
  descriptionProp?: string;
  /** Function to get a unique key for each item */
  keyProp?: string | ((item: any, index: number) => string | number);
  /** List layout orientation */
  layout?: 'vertical' | 'horizontal' | 'grid';
  /** Whether the list has borders */
  bordered?: boolean;
  /** Whether to show hover state on items */
  hoverable?: boolean;
  /** Whether the list is in a loading state */
  loading?: boolean;
  /** The loading text to display */
  loadingText?: string;
  /** Text to display when there are no items */
  emptyText?: string;
  /** Size variant for the list */
  size?: 'small' | 'medium' | 'large';
  /** Whether the list items are clickable */
  itemClickable?: boolean;
  /** Currently active item by index or key */
  activeItem?: number | string | ((item: any) => boolean);
  /** Whether the list is searchable */
  searchable?: boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Initial search term */
  initialSearchTerm?: string;
  /** Function to filter items based on search term */
  filterFn?: (item: any, searchTerm: string) => boolean;
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
}

const props = withDefaults(defineProps<ListProps>(), {
  titleProp: 'title',
  layout: 'vertical',
  bordered: false,
  hoverable: true,
  loading: false,
  loadingText: 'Loading data...',
  emptyText: 'No data available',
  size: 'medium',
  itemClickable: false,
  searchable: false,
  searchPlaceholder: 'Search...',
  initialSearchTerm: '',
  pagination: false,
  page: 1,
  pageSize: 10,
  totalItems: 0,
  pageSizeOptions: () => [10, 25, 50, 100]
});

const emit = defineEmits<{
  (e: 'item-click', item: any, index: number): void;
  (e: 'search', term: string): void;
  (e: 'page-change', page: number): void;
  (e: 'page-size-change', pageSize: number): void;
  (e: 'update:page', page: number): void;
  (e: 'update:activeItem', value: number | string | null): void;
}>();

// State
const searchTerm = ref(props.initialSearchTerm);
const currentPage = ref(props.page);
const internalPageSize = ref(props.pageSize);

// Computed values
const computedItems = computed(() => {
  let items = [...props.items];
  
  // Apply search if needed
  if (props.searchable && searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    
    if (props.filterFn) {
      // Use custom filter function if provided
      items = items.filter(item => props.filterFn!(item, term));
    } else {
      // Default filtering logic
      items = items.filter(item => {
        const title = getItemProp(item, props.titleProp);
        const description = props.descriptionProp ? getItemProp(item, props.descriptionProp) : null;
        
        return (
          (title && String(title).toLowerCase().includes(term)) || 
          (description && String(description).toLowerCase().includes(term))
        );
      });
    }
  }
  
  // Apply pagination if needed
  if (props.pagination && !props.totalItems) {
    const start = (currentPage.value - 1) * internalPageSize.value;
    const end = start + internalPageSize.value;
    items = items.slice(start, end);
  }
  
  return items;
});

// Methods
function getItemProp(item: any, prop?: string): any {
  if (!prop) return null;
  
  // Handle nested paths with dot notation
  if (prop.includes('.')) {
    return prop.split('.').reduce((obj, path) => {
      return obj && obj[path] !== undefined ? obj[path] : null;
    }, item);
  }
  
  return item[prop];
}

function getItemKey(item: any, index: number): string | number {
  if (typeof props.keyProp === 'function') {
    return props.keyProp(item, index);
  }
  
  if (props.keyProp && item[props.keyProp] !== undefined) {
    return item[props.keyProp];
  }
  
  // Fall back to index if no key is specified or found
  return index;
}

function isItemActive(item: any, index: number): boolean {
  if (props.activeItem === undefined) return false;
  
  if (typeof props.activeItem === 'function') {
    return props.activeItem(item);
  }
  
  if (typeof props.activeItem === 'number') {
    return index === props.activeItem;
  }
  
  // If activeItem is a string, compare with the item's key
  const itemKey = getItemKey(item, index);
  return String(itemKey) === String(props.activeItem);
}

function handleItemClick(item: any, index: number): void {
  emit('item-click', item, index);
  
  // Update active item if it's being tracked with v-model
  const itemKey = getItemKey(item, index);
  emit('update:activeItem', typeof props.activeItem === 'number' ? index : itemKey);
}

function handleSearch(term: string): void {
  searchTerm.value = term;
  emit('search', term);
  
  // Reset to first page when searching
  if (props.pagination) {
    handlePageChange(1);
  }
}

function handlePageChange(page: number): void {
  currentPage.value = page;
  emit('page-change', page);
  emit('update:page', page);
}

function handlePageSizeChange(size: number): void {
  internalPageSize.value = size;
  
  // Reset to first page when changing page size
  currentPage.value = 1;
  
  emit('page-size-change', size);
  emit('page-change', 1);
  emit('update:page', 1);
}

// Watchers
watch(() => props.page, (newPage) => {
  currentPage.value = newPage;
});

watch(() => props.pageSize, (newSize) => {
  internalPageSize.value = newSize;
});
</script>

<style scoped>
.n-list-container {
  --n-list-border-color: var(--nscale-gray-200);
  --n-list-hover-bg: var(--nscale-gray-50);
  --n-list-active-bg: var(--nscale-primary-light);
  --n-list-active-border: var(--nscale-primary);
  --n-list-loading-bg: rgba(255, 255, 255, 0.7);
  --n-list-loading-text: var(--nscale-gray-600);
  
  width: 100%;
  position: relative;
  background-color: var(--nscale-white);
  border-radius: var(--nscale-border-radius-md);
}

.n-list-container--bordered {
  border: 1px solid var(--n-list-border-color);
}

/* List */
.n-list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}

/* Vertical list (default) */
.n-list--vertical {
  display: flex;
  flex-direction: column;
}

/* Horizontal list */
.n-list--horizontal {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  gap: var(--nscale-space-4);
  padding: var(--nscale-space-2);
}

.n-list--horizontal .n-list-item {
  flex: 0 0 auto;
  margin-right: 0;
  min-width: 200px;
}

/* Grid list */
.n-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--nscale-space-4);
  padding: var(--nscale-space-2);
}

/* List items */
.n-list-item {
  position: relative;
  border-bottom: 1px solid var(--n-list-border-color);
  transition: background-color var(--nscale-transition-quick);
}

.n-list-item:last-child {
  border-bottom: none;
}

.n-list--bordered .n-list-item {
  border-bottom: 1px solid var(--n-list-border-color);
}

.n-list--hover .n-list-item:hover {
  background-color: var(--n-list-hover-bg);
}

.n-list-item--clickable {
  cursor: pointer;
}

.n-list-item--active {
  background-color: var(--n-list-active-bg);
  border-left: 3px solid var(--n-list-active-border);
}

/* Item content */
.n-list-item-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.n-list-item-prefix {
  flex-shrink: 0;
  margin-right: var(--nscale-space-3);
}

.n-list-item-main {
  flex: 1;
  min-width: 0; /* Helps with text overflow */
}

.n-list-item-suffix {
  flex-shrink: 0;
  margin-left: var(--nscale-space-3);
}

.n-list-item-title {
  font-weight: var(--nscale-font-weight-medium);
  color: var(--nscale-gray-800);
  margin-bottom: var(--nscale-space-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-list-item-description {
  color: var(--nscale-gray-600);
  font-size: var(--nscale-font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Size variants */
.n-list--small .n-list-item {
  padding: var(--nscale-space-2) var(--nscale-space-3);
  font-size: var(--nscale-font-size-sm);
}

.n-list--default .n-list-item {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  font-size: var(--nscale-font-size-base);
}

.n-list--large .n-list-item {
  padding: var(--nscale-space-4) var(--nscale-space-6);
  font-size: var(--nscale-font-size-lg);
}

/* Empty state */
.n-list-empty {
  padding: var(--nscale-space-6);
  text-align: center;
  color: var(--nscale-gray-500);
  font-style: italic;
}

/* Loading overlay */
.n-list-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--n-list-loading-bg);
  z-index: 1;
  color: var(--n-list-loading-text);
}

.n-list-loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: var(--nscale-space-3);
  animation: spin 1s linear infinite;
}

.n-list-spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: list-spinner-dash 1.5s ease-in-out infinite;
}

@keyframes list-spinner-dash {
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Header and footer */
.n-list-header,
.n-list-footer {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-bottom: 1px solid var(--n-list-border-color);
}

.n-list-footer {
  border-top: 1px solid var(--n-list-border-color);
  border-bottom: none;
}

/* Search and actions */
.n-list-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-bottom: 1px solid var(--n-list-border-color);
}

.n-list-search {
  flex: 1;
  max-width: 300px;
}

.n-list-search-input {
  width: 100%;
  padding: var(--nscale-space-2) var(--nscale-space-3);
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
}

.n-list-search-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

.n-list-actions-slot {
  display: flex;
  gap: var(--nscale-space-2);
}

/* Pagination */
.n-list-pagination {
  padding: var(--nscale-space-3) var(--nscale-space-4);
  border-top: 1px solid var(--n-list-border-color);
}

/* Dark theme support */
.theme-dark {
  --n-list-border-color: var(--nscale-gray-700);
  --n-list-hover-bg: var(--nscale-gray-700);
  --n-list-active-bg: rgba(0, 165, 80, 0.2);
  --n-list-loading-bg: rgba(17, 24, 39, 0.7);
  --n-list-loading-text: var(--nscale-gray-300);
}

.theme-dark .n-list-item-title {
  color: var(--nscale-gray-200);
}

.theme-dark .n-list-item-description {
  color: var(--nscale-gray-400);
}

.theme-dark .n-list-empty {
  color: var(--nscale-gray-400);
}

/* High contrast theme */
.theme-contrast {
  --n-list-border-color: var(--nscale-primary);
  --n-list-hover-bg: var(--nscale-gray-900);
  --n-list-active-bg: var(--nscale-gray-900);
  --n-list-active-border: var(--nscale-primary);
  --n-list-loading-bg: rgba(0, 0, 0, 0.7);
  --n-list-loading-text: var(--nscale-primary);
}

.theme-contrast .n-list-item-title {
  color: var(--nscale-white);
}

.theme-contrast .n-list-item-description {
  color: var(--nscale-gray-300);
}

.theme-contrast .n-list-empty {
  color: var(--nscale-white);
}
</style>