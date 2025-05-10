<template>
  <nav class="n-breadcrumb" aria-label="Breadcrumb">
    <ol 
      class="n-breadcrumb__list" 
      :class="{ 
        'n-breadcrumb--collapsed': isCollapsed && itemCount > maxVisible 
      }"
    >
      <template v-for="(item, index) in processedItems" :key="index">
        <!-- When collapsed, show ellipsis for hidden items -->
        <li v-if="item.isCollapse" class="n-breadcrumb__item n-breadcrumb__item--collapse">
          <button 
            class="n-breadcrumb__collapse-btn"
            @click="toggleCollapse"
            :aria-expanded="!isCollapsed"
            aria-controls="breadcrumb-items"
          >
            <slot name="collapse-icon">
              <span class="n-breadcrumb__dots">...</span>
            </slot>
            <span class="n-breadcrumb__sr-only">
              {{ isCollapsed ? 'Show all breadcrumbs' : 'Collapse breadcrumbs' }}
            </span>
          </button>

          <!-- Hidden menu with full breadcrumb list -->
          <div v-if="showCollapseMenu" class="n-breadcrumb__collapse-menu" id="breadcrumb-items">
            <ul class="n-breadcrumb__collapse-list">
              <li 
                v-for="(hiddenItem, hiddenIndex) in hiddenItems" 
                :key="`hidden-${hiddenIndex}`" 
                class="n-breadcrumb__collapse-item"
              >
                <a 
                  v-if="hiddenItem.href" 
                  :href="hiddenItem.href" 
                  class="n-breadcrumb__collapse-link"
                  @click="handleLinkClick($event, hiddenItem, hiddenIndex + 1)"
                >
                  <component v-if="hiddenItem.icon" :is="hiddenItem.icon" class="n-breadcrumb__icon" />
                  {{ hiddenItem.text }}
                </a>
                <span v-else class="n-breadcrumb__collapse-text">
                  <component v-if="hiddenItem.icon" :is="hiddenItem.icon" class="n-breadcrumb__icon" />
                  {{ hiddenItem.text }}
                </span>
              </li>
            </ul>
          </div>
        </li>

        <!-- Regular breadcrumb item -->
        <li 
          v-else 
          class="n-breadcrumb__item"
          :class="{ 
            'n-breadcrumb__item--active': item.active || index === itemCount - 1,
            'n-breadcrumb__item--disabled': item.disabled 
          }"
        >
          <a 
            v-if="item.href && !item.active && !item.disabled" 
            :href="item.href" 
            class="n-breadcrumb__link"
            @click="handleLinkClick($event, item, index)"
          >
            <component v-if="item.icon" :is="item.icon" class="n-breadcrumb__icon" />
            {{ item.text }}
          </a>
          <span v-else class="n-breadcrumb__text" :aria-current="item.active ? 'page' : undefined">
            <component v-if="item.icon" :is="item.icon" class="n-breadcrumb__icon" />
            {{ item.text }}
          </span>
          
          <!-- Separator between items (unless last) -->
          <span 
            v-if="index < itemCount - 1 && !item.isCollapse" 
            class="n-breadcrumb__separator" 
            aria-hidden="true"
          >
            <slot name="separator">
              {{ separator }}
            </slot>
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Breadcrumb component that displays navigation paths.
 * @displayName Breadcrumb
 * @example
 * <Breadcrumb :items="[{ text: 'Home', href: '/' }, { text: 'Products', href: '/products' }, { text: 'Item', active: true }]" />
 */
export interface BreadcrumbItem {
  /** The text to display */
  text: string;
  /** Optional URL for the breadcrumb item */
  href?: string;
  /** Whether the item represents the current page */
  active?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Optional icon component */
  icon?: any;
  /** Optional data to pass when item is clicked */
  data?: any;
  /** Whether this is a special collapse item (for internal use) */
  isCollapse?: boolean;
}

export interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Character to use as separator */
  separator?: string;
  /** Maximum number of items to show before collapsing */
  maxVisible?: number;
  /** Whether to always show the first item (home) */
  alwaysShowHome?: boolean;
  /** Whether to always show the last item (current) */
  alwaysShowCurrent?: boolean;
  /** Whether to use router-link when Vue Router is available */
  useRouter?: boolean;
}

const props = withDefaults(defineProps<BreadcrumbProps>(), {
  separator: '/',
  maxVisible: 3,
  alwaysShowHome: true,
  alwaysShowCurrent: true,
  useRouter: true
});

// Optional Vue Router integration
const router = useRouter();

// State for collapse functionality
const isCollapsed = ref(true);
const showCollapseMenu = ref(false);

// Calculate how many items we have
const itemCount = computed(() => props.items.length);

// Calculate which items to hide when collapsed
const hiddenItems = computed(() => {
  if (!isCollapsed.value || itemCount.value <= props.maxVisible) {
    return [];
  }

  // Determine which items to hide when collapsed
  const visibleCount = props.maxVisible;
  const startIndex = props.alwaysShowHome ? 1 : 0;
  const endIndex = itemCount.value - (props.alwaysShowCurrent ? 1 : 0);
  
  // How many items we need to hide
  const itemsToHide = itemCount.value - visibleCount;
  
  if (itemsToHide <= 0) {
    return [];
  }
  
  // If we only hide one or two items, it's better to just show all
  if (itemsToHide <= 2 && itemCount.value > 4) {
    return [];
  }
  
  // Calculate range to hide - we want to hide items in the middle
  const hideStartIndex = startIndex;
  const hideEndIndex = Math.min(endIndex, itemCount.value - (visibleCount - (props.alwaysShowHome ? 1 : 0) - (props.alwaysShowCurrent ? 1 : 0)));
  
  return props.items.slice(hideStartIndex, hideEndIndex);
});

// Create processed items list with collapse item inserted if needed
const processedItems = computed(() => {
  if (itemCount.value <= props.maxVisible || !isCollapsed.value) {
    return props.items;
  }
  
  const result = [...props.items];
  
  // Only insert collapse item if we have items to hide
  if (hiddenItems.value.length > 0) {
    // Where to insert the collapse item
    const insertIndex = props.alwaysShowHome ? 1 : 0;
    
    // Remove hidden items
    result.splice(insertIndex, hiddenItems.value.length);
    
    // Insert collapse item
    result.splice(insertIndex, 0, {
      text: '...',
      isCollapse: true
    });
  }
  
  return result;
});

// Methods
function toggleCollapse() {
  if (isCollapsed.value && hiddenItems.value.length > 0) {
    showCollapseMenu.value = !showCollapseMenu.value;
  } else {
    isCollapsed.value = !isCollapsed.value;
  }
}

// Close collapse menu when clicking outside
function closeCollapseMenu(event: MouseEvent) {
  if (showCollapseMenu.value) {
    const target = event.target as Node;
    const breadcrumb = document.querySelector('.n-breadcrumb');
    if (breadcrumb && !breadcrumb.contains(target)) {
      showCollapseMenu.value = false;
    }
  }
}

// Handle breadcrumb link clicks
function handleLinkClick(event: MouseEvent, item: BreadcrumbItem, index: number) {
  // Prevent default browser navigation when using Vue Router
  if (props.useRouter && item.href && router) {
    event.preventDefault();
    router.push(item.href);
    showCollapseMenu.value = false;
  }
  
  // Emit click event with item and index
  emit('click', item, index, event);
}

// Add and remove click event listener for closing collapse menu
watch(showCollapseMenu, (isVisible) => {
  if (isVisible) {
    document.addEventListener('click', closeCollapseMenu);
  } else {
    document.removeEventListener('click', closeCollapseMenu);
  }
});

// Clean up event listener
onBeforeUnmount(() => {
  document.removeEventListener('click', closeCollapseMenu);
});

// Emit events
const emit = defineEmits<{
  /** Emitted when a breadcrumb item is clicked */
  (e: 'click', item: BreadcrumbItem, index: number, event: MouseEvent): void;
}>();
</script>

<style scoped>
.n-breadcrumb {
  /* Base styles */
  display: block;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: var(--n-font-size-sm, 0.875rem);
  line-height: 1.5;
  color: var(--n-color-text-primary, #1a202c);
}

.n-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.n-breadcrumb__item {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
}

.n-breadcrumb__link {
  display: inline-flex;
  align-items: center;
  color: var(--n-color-primary, #0066cc);
  text-decoration: none;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.n-breadcrumb__link:hover {
  text-decoration: underline;
  color: var(--n-color-primary-dark, #0052a3);
  background-color: var(--n-color-gray-100, #f7fafc);
}

.n-breadcrumb__text {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem;
}

.n-breadcrumb__item--active .n-breadcrumb__text {
  font-weight: 600;
  color: var(--n-color-text-primary, #1a202c);
}

.n-breadcrumb__item--disabled .n-breadcrumb__text {
  color: var(--n-color-text-disabled, #a0aec0);
  cursor: not-allowed;
}

.n-breadcrumb__separator {
  margin: 0 0.5rem;
  color: var(--n-color-text-secondary, #718096);
  user-select: none;
}

.n-breadcrumb__icon {
  margin-right: 0.25rem;
  width: 1em;
  height: 1em;
}

/* Collapse functionality */
.n-breadcrumb__item--collapse {
  position: relative;
}

.n-breadcrumb__collapse-btn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: var(--n-color-primary, #0066cc);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.n-breadcrumb__collapse-btn:hover {
  background-color: var(--n-color-gray-100, #f7fafc);
  color: var(--n-color-primary-dark, #0052a3);
}

.n-breadcrumb__dots {
  font-weight: bold;
  letter-spacing: 1px;
}

.n-breadcrumb__sr-only {
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

.n-breadcrumb__collapse-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: var(--n-z-index-dropdown, 1000);
  margin-top: 0.25rem;
  min-width: 150px;
  background-color: var(--n-color-white, #ffffff);
  border: 1px solid var(--n-color-border, #e2e8f0);
  border-radius: 0.25rem;
  box-shadow: var(--n-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
  padding: 0.5rem 0;
}

.n-breadcrumb__collapse-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.n-breadcrumb__collapse-item {
  display: block;
  margin: 0;
  padding: 0;
}

.n-breadcrumb__collapse-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: var(--n-color-text-primary, #1a202c);
  text-decoration: none;
  transition: all 0.15s ease;
}

.n-breadcrumb__collapse-link:hover {
  background-color: var(--n-color-gray-100, #f7fafc);
  color: var(--n-color-primary, #0066cc);
}

.n-breadcrumb__collapse-text {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: var(--n-color-text-secondary, #718096);
}

/* Responsive styles */
@media (max-width: 640px) {
  .n-breadcrumb--responsive .n-breadcrumb__item:not(:first-child):not(:last-child):not(.n-breadcrumb__item--collapse) {
    display: none;
  }
  
  .n-breadcrumb--responsive .n-breadcrumb__separator {
    margin: 0 0.25rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-breadcrumb {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
  
  .n-breadcrumb__link {
    color: var(--n-color-primary-light, #4299e1);
  }
  
  .n-breadcrumb__link:hover {
    color: var(--n-color-primary-light, #4299e1);
    background-color: var(--n-color-gray-700, #2d3748);
  }
  
  .n-breadcrumb__item--active .n-breadcrumb__text {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
  
  .n-breadcrumb__item--disabled .n-breadcrumb__text {
    color: var(--n-color-text-disabled-dark, #718096);
  }
  
  .n-breadcrumb__separator {
    color: var(--n-color-text-secondary-dark, #a0aec0);
  }
  
  .n-breadcrumb__collapse-btn {
    color: var(--n-color-primary-light, #4299e1);
  }
  
  .n-breadcrumb__collapse-btn:hover {
    background-color: var(--n-color-gray-700, #2d3748);
    color: var(--n-color-primary-light, #4299e1);
  }
  
  .n-breadcrumb__collapse-menu {
    background-color: var(--n-color-gray-800, #1a202c);
    border-color: var(--n-color-gray-700, #2d3748);
  }
  
  .n-breadcrumb__collapse-link {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
  
  .n-breadcrumb__collapse-link:hover {
    background-color: var(--n-color-gray-700, #2d3748);
    color: var(--n-color-primary-light, #4299e1);
  }
  
  .n-breadcrumb__collapse-text {
    color: var(--n-color-text-secondary-dark, #a0aec0);
  }
}
</style>