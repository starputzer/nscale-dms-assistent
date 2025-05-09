<template>
  <div 
    class="n-tree-container"
    :class="{
      'n-tree-container--bordered': bordered,
      'n-tree-container--loading': loading,
    }"
  >
    <!-- Loading overlay -->
    <div v-if="loading" class="n-tree-loading-overlay" aria-live="polite">
      <div class="n-tree-loading-spinner">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="n-tree-spinner-path" cx="12" cy="12" r="10" fill="none" stroke-width="3" />
        </svg>
      </div>
      <span>{{ loadingText }}</span>
    </div>
    
    <!-- Search bar -->
    <div v-if="searchable" class="n-tree-search">
      <input
        type="text"
        class="n-tree-search-input"
        :placeholder="searchPlaceholder"
        :value="searchTerm"
        @input="(e) => handleSearch(e.target.value)"
        aria-label="Search tree"
      />
    </div>
    
    <!-- Tree -->
    <div class="n-tree-wrapper">
      <div v-if="computedItems.length === 0" class="n-tree-empty">
        <slot name="empty">
          {{ emptyText }}
        </slot>
      </div>
      
      <ul v-else class="n-tree" role="tree" :aria-label="ariaLabel">
        <TreeNode
          v-for="(item, index) in computedItems"
          :key="getNodeKey(item, index)"
          :item="item"
          :level="1"
          :label-prop="labelProp"
          :children-prop="childrenProp"
          :icon-prop="iconProp"
          :is-leaf-prop="isLeafProp"
          :expanded-keys="expandedKeys"
          :selected-keys="internalSelectedKeys"
          :disabled-keys="disabledKeys"
          :selectable="selectable"
          :checkable="checkable"
          :checked-keys="checkedKeys"
          :cascadeCheck="cascadeCheck"
          :default-expand-all="defaultExpandAll"
          :leaf-icon="leafIcon"
          :branch-icon="branchIcon"
          :expand-icon="expandIcon"
          :collapse-icon="collapseIcon"
          :load-data="loadData"
          :custom-render="false"
          @toggle="handleToggle"
          @select="handleSelect"
          @check="handleCheck"
        >
          <template #icon="slotProps">
            <slot name="icon" v-bind="slotProps"></slot>
          </template>
          <template #label="slotProps">
            <slot name="label" v-bind="slotProps"></slot>
          </template>
          <template #extra="slotProps">
            <slot name="extra" v-bind="slotProps"></slot>
          </template>
        </TreeNode>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onMounted } from 'vue';
import TreeNode from './TreeNode.vue';

/**
 * Tree component for displaying hierarchical data
 * @displayName Tree
 * @example
 * <Tree 
 *   :items="treeData" 
 *   label-prop="name" 
 *   @select="handleNodeSelect"
 * />
 */
export interface TreeProps {
  /** Array of tree items */
  items: any[];
  /** Property name for the node label */
  labelProp?: string;
  /** Property name for the child nodes */
  childrenProp?: string;
  /** Property name for the node icon */
  iconProp?: string;
  /** Property name to determine if a node is a leaf node */
  isLeafProp?: string;
  /** Whether the tree has borders */
  bordered?: boolean;
  /** Whether the tree is in a loading state */
  loading?: boolean;
  /** The loading text to display */
  loadingText?: string;
  /** Text to display when there are no items */
  emptyText?: string;
  /** Whether the tree is searchable */
  searchable?: boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Keys of initially expanded nodes */
  defaultExpandedKeys?: (string | number)[];
  /** Keys of expanded nodes (controlled mode) */
  expandedKeys?: (string | number)[];
  /** Whether to expand all nodes by default */
  defaultExpandAll?: boolean;
  /** Keys of selected nodes */
  selectedKeys?: (string | number)[];
  /** Whether nodes are selectable */
  selectable?: boolean;
  /** Whether multi-selection is enabled */
  multiple?: boolean;
  /** Whether nodes have checkboxes */
  checkable?: boolean;
  /** Keys of checked nodes */
  checkedKeys?: (string | number)[];
  /** Whether to cascade check state to children and parents */
  cascadeCheck?: boolean;
  /** Keys of disabled nodes */
  disabledKeys?: (string | number)[];
  /** Icon for leaf nodes */
  leafIcon?: string | object;
  /** Icon for branch nodes */
  branchIcon?: string | object;
  /** Icon for expanded state */
  expandIcon?: string | object;
  /** Icon for collapsed state */
  collapseIcon?: string | object;
  /** ARIA label for the tree */
  ariaLabel?: string;
  /** Function for async loading of child nodes */
  loadData?: (node: any) => Promise<any[]>;
  /** Function to get a unique key for each node */
  nodeKey?: string | ((item: any) => string | number);
}

const props = withDefaults(defineProps<TreeProps>(), {
  labelProp: 'label',
  childrenProp: 'children',
  iconProp: 'icon',
  isLeafProp: 'isLeaf',
  bordered: false,
  loading: false,
  loadingText: 'Loading data...',
  emptyText: 'No data available',
  searchable: false,
  searchPlaceholder: 'Search...',
  defaultExpandedKeys: () => [],
  defaultExpandAll: false,
  selectable: true,
  multiple: false,
  checkable: false,
  cascadeCheck: true,
  disabledKeys: () => [],
  ariaLabel: 'Tree',
});

const emit = defineEmits<{
  (e: 'update:expandedKeys', keys: (string | number)[]): void;
  (e: 'update:selectedKeys', keys: (string | number)[]): void;
  (e: 'update:checkedKeys', keys: (string | number)[]): void;
  (e: 'expand', item: any, expanded: boolean): void;
  (e: 'select', item: any, selected: boolean): void;
  (e: 'check', item: any, checked: boolean): void;
  (e: 'search', term: string): void;
}>();

// State
const searchTerm = ref('');
const internalExpandedKeys = ref<(string | number)[]>([...props.defaultExpandedKeys]);
const internalSelectedKeys = ref<(string | number)[]>([]);

// Provide context values to tree nodes
provide('treeContext', {
  labelProp: props.labelProp,
  childrenProp: props.childrenProp,
  iconProp: props.iconProp,
  isLeafProp: props.isLeafProp,
  selectable: props.selectable,
  checkable: props.checkable,
  multiple: props.multiple,
  nodeKey: props.nodeKey,
  getNodeKey,
});

// Computed properties
const computedItems = computed(() => {
  let items = [...props.items];
  
  // Filter items by search term
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    items = filterTreeByTerm(items, term);
    
    // Auto-expand parent nodes of matches when searching
    if (items.length > 0) {
      const expandedParentKeys = collectParentKeys(props.items, items);
      internalExpandedKeys.value = [...new Set([
        ...internalExpandedKeys.value,
        ...expandedParentKeys
      ])];
    }
  }
  
  return items;
});

// The actually used expandedKeys: controlled prop or internal state
const expandedKeys = computed(() => {
  return props.expandedKeys !== undefined ? props.expandedKeys : internalExpandedKeys.value;
});

// Methods
/**
 * Get a unique key for a node
 */
function getNodeKey(item: any, index: number): string | number {
  if (typeof props.nodeKey === 'function') {
    return props.nodeKey(item);
  }
  
  if (props.nodeKey && item[props.nodeKey] !== undefined) {
    return item[props.nodeKey];
  }
  
  // Fallback to index, but this is not recommended for expandable trees
  return index;
}

/**
 * Handle node expansion/collapse
 */
function handleToggle(item: any, expanded: boolean): void {
  const key = getItemKey(item);
  
  if (props.expandedKeys === undefined) {
    // In uncontrolled mode, manage expanded keys internally
    if (expanded) {
      internalExpandedKeys.value = [...internalExpandedKeys.value, key];
    } else {
      internalExpandedKeys.value = internalExpandedKeys.value.filter(k => k !== key);
    }
  }
  
  emit('update:expandedKeys', props.expandedKeys !== undefined ? 
    (expanded ? 
      [...props.expandedKeys, key] : 
      props.expandedKeys.filter(k => k !== key)) 
    : internalExpandedKeys.value);
  emit('expand', item, expanded);
}

/**
 * Handle node selection
 */
function handleSelect(item: any, selected: boolean): void {
  const key = getItemKey(item);
  
  if (props.selectedKeys === undefined) {
    // In uncontrolled mode, manage selected keys internally
    if (props.multiple) {
      if (selected) {
        internalSelectedKeys.value = [...internalSelectedKeys.value, key];
      } else {
        internalSelectedKeys.value = internalSelectedKeys.value.filter(k => k !== key);
      }
    } else {
      internalSelectedKeys.value = selected ? [key] : [];
    }
  }
  
  emit('update:selectedKeys', props.selectedKeys !== undefined ? 
    (props.multiple ? 
      (selected ? 
        [...props.selectedKeys, key] : 
        props.selectedKeys.filter(k => k !== key)) 
      : (selected ? [key] : [])) 
    : internalSelectedKeys.value);
  emit('select', item, selected);
}

/**
 * Handle node checkbox state change
 */
function handleCheck(item: any, checked: boolean): void {
  const key = getItemKey(item);
  
  let newCheckedKeys = [...(props.checkedKeys || [])];
  
  if (props.cascadeCheck) {
    // Handle cascaded checking - collecting all affected keys
    const { checkedKeys, indeterminateKeys } = calculateCheckedKeys(
      props.items,
      key,
      checked,
      [...newCheckedKeys]
    );
    newCheckedKeys = checkedKeys;
  } else {
    // Simple add/remove without cascading
    if (checked) {
      newCheckedKeys.push(key);
    } else {
      newCheckedKeys = newCheckedKeys.filter(k => k !== key);
    }
  }
  
  emit('update:checkedKeys', newCheckedKeys);
  emit('check', item, checked);
}

/**
 * Handle search term changes
 */
function handleSearch(term: string): void {
  searchTerm.value = term;
  emit('search', term);
}

/**
 * Get an item key using the nodeKey configuration
 */
function getItemKey(item: any): string | number {
  if (typeof props.nodeKey === 'function') {
    return props.nodeKey(item);
  }
  
  if (props.nodeKey && item[props.nodeKey] !== undefined) {
    return item[props.nodeKey];
  }
  
  // Fallback using item properties
  if (item.id !== undefined) return item.id;
  if (item.key !== undefined) return item.key;
  if (item[props.labelProp]) return item[props.labelProp];
  
  // This is problematic but a last resort
  return JSON.stringify(item);
}

/**
 * Filter tree data based on search term
 */
function filterTreeByTerm(items: any[], term: string): any[] {
  const results: any[] = [];
  
  for (const item of items) {
    const newItem = { ...item };
    
    // Check if current node matches
    const label = String(newItem[props.labelProp] || '');
    const matches = label.toLowerCase().includes(term);
    
    // Check if any children match
    let matchingChildren: any[] = [];
    if (newItem[props.childrenProp] && newItem[props.childrenProp].length) {
      matchingChildren = filterTreeByTerm(newItem[props.childrenProp], term);
    }
    
    // Include node if it matches or has matching children
    if (matches || matchingChildren.length > 0) {
      if (matchingChildren.length > 0) {
        newItem[props.childrenProp] = matchingChildren;
      }
      results.push(newItem);
    }
  }
  
  return results;
}

/**
 * Collect parent node keys of matched items
 */
function collectParentKeys(allItems: any[], matchedItems: any[], path: any[] = [], result: (string | number)[] = []): (string | number)[] {
  for (const item of allItems) {
    const currentPath = [...path, item];
    const key = getItemKey(item);
    
    // Check if any matched item is a descendant of this item
    let isParentOfMatch = matchedItems.some(matchedItem => {
      // Direct match
      if (matchedItem === item) return true;
      
      // Check in children
      if (item[props.childrenProp] && item[props.childrenProp].length) {
        return matchedItem[props.childrenProp]?.some((child: any) => 
          matchedItems.includes(child)
        );
      }
      
      return false;
    });
    
    // If this is a parent of a match, add its key to result
    if (isParentOfMatch && !result.includes(key)) {
      result.push(key);
    }
    
    // Recursively check children
    if (item[props.childrenProp] && item[props.childrenProp].length) {
      collectParentKeys(item[props.childrenProp], matchedItems, currentPath, result);
    }
  }
  
  return result;
}

/**
 * Calculate checked and indeterminate keys when using cascade mode
 */
function calculateCheckedKeys(items: any[], targetKey: string | number, checked: boolean, currentCheckedKeys: (string | number)[]): { 
  checkedKeys: (string | number)[], 
  indeterminateKeys: (string | number)[] 
} {
  // Clone the current checked keys
  let newCheckedKeys = [...currentCheckedKeys];
  let indeterminateKeys: (string | number)[] = [];
  
  // Function to get all descendant keys of a node
  function getAllDescendantKeys(item: any): (string | number)[] {
    const keys: (string | number)[] = [];
    const key = getItemKey(item);
    keys.push(key);
    
    if (item[props.childrenProp] && item[props.childrenProp].length) {
      for (const child of item[props.childrenProp]) {
        keys.push(...getAllDescendantKeys(child));
      }
    }
    
    return keys;
  }
  
  // Function to find an item by its key
  function findItemByKey(items: any[], key: string | number): any | null {
    for (const item of items) {
      const itemKey = getItemKey(item);
      if (itemKey === key) return item;
      
      if (item[props.childrenProp] && item[props.childrenProp].length) {
        const found = findItemByKey(item[props.childrenProp], key);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  // Find the target item
  const targetItem = findItemByKey(items, targetKey);
  if (!targetItem) return { checkedKeys: newCheckedKeys, indeterminateKeys };
  
  // Get all descendant keys
  const descendantKeys = getAllDescendantKeys(targetItem);
  
  if (checked) {
    // Add target and all descendants to checked keys
    newCheckedKeys = [...new Set([...newCheckedKeys, ...descendantKeys])];
  } else {
    // Remove target and all descendants from checked keys
    newCheckedKeys = newCheckedKeys.filter(key => !descendantKeys.includes(key));
  }
  
  // Calculate indeterminate keys by checking parents
  function updateParentCheckedState(items: any[], parentPath: any[] = []): void {
    for (const item of items) {
      const key = getItemKey(item);
      const currentPath = [...parentPath, item];
      
      if (item[props.childrenProp] && item[props.childrenProp].length > 0) {
        updateParentCheckedState(item[props.childrenProp], currentPath);
        
        // Count checked and total children
        const childKeys = item[props.childrenProp].map((child: any) => getItemKey(child));
        const checkedChildCount = childKeys.filter(k => newCheckedKeys.includes(k)).length;
        
        if (checkedChildCount === 0) {
          // None checked - remove parent
          newCheckedKeys = newCheckedKeys.filter(k => k !== key);
          indeterminateKeys = indeterminateKeys.filter(k => k !== key);
        } else if (checkedChildCount === childKeys.length) {
          // All checked - add parent
          if (!newCheckedKeys.includes(key)) {
            newCheckedKeys.push(key);
          }
          indeterminateKeys = indeterminateKeys.filter(k => k !== key);
        } else {
          // Some checked - indeterminate
          newCheckedKeys = newCheckedKeys.filter(k => k !== key);
          if (!indeterminateKeys.includes(key)) {
            indeterminateKeys.push(key);
          }
        }
      }
    }
  }
  
  updateParentCheckedState(items);
  
  return { checkedKeys: newCheckedKeys, indeterminateKeys };
}

// Watchers
// Initialize expandedKeys for defaultExpandAll
onMounted(() => {
  if (props.defaultExpandAll) {
    const allExpandableKeys: (string | number)[] = [];
    
    function collectExpandableKeys(items: any[]): void {
      for (const item of items) {
        const key = getItemKey(item);
        
        // Only add keys for nodes that have children
        if (item[props.childrenProp] && item[props.childrenProp].length > 0) {
          allExpandableKeys.push(key);
          collectExpandableKeys(item[props.childrenProp]);
        }
      }
    }
    
    collectExpandableKeys(props.items);
    internalExpandedKeys.value = allExpandableKeys;
  }
});

// Watch for changes in selectedKeys prop
watch(() => props.selectedKeys, (newKeys) => {
  if (newKeys !== undefined) {
    internalSelectedKeys.value = [...newKeys];
  }
}, { immediate: true });
</script>

<style scoped>
.n-tree-container {
  --n-tree-border-color: var(--nscale-gray-200);
  --n-tree-node-height: 32px;
  --n-tree-indent-width: 24px;
  --n-tree-icon-size: 16px;
  --n-tree-node-hover-bg: var(--nscale-gray-50);
  --n-tree-node-selected-bg: var(--nscale-primary-light);
  --n-tree-node-selected-color: var(--nscale-gray-900);
  --n-tree-loading-bg: rgba(255, 255, 255, 0.7);
  --n-tree-loading-text: var(--nscale-gray-600);
  
  width: 100%;
  position: relative;
  font-family: var(--nscale-font-family-base);
}

.n-tree-container--bordered {
  border: 1px solid var(--n-tree-border-color);
  border-radius: var(--nscale-border-radius-md);
  overflow: hidden;
}

/* Loading overlay */
.n-tree-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--n-tree-loading-bg);
  z-index: 1;
  color: var(--n-tree-loading-text);
}

.n-tree-loading-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: var(--nscale-space-3);
  animation: tree-spinner-rotate 2s linear infinite;
}

.n-tree-spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: tree-spinner-dash 1.5s ease-in-out infinite;
}

@keyframes tree-spinner-rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes tree-spinner-dash {
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

/* Search bar */
.n-tree-search {
  padding: var(--nscale-space-3);
  border-bottom: 1px solid var(--n-tree-border-color);
}

.n-tree-search-input {
  width: 100%;
  padding: var(--nscale-space-2) var(--nscale-space-3);
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
  font-size: var(--nscale-font-size-sm);
}

.n-tree-search-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

/* Tree structure */
.n-tree-wrapper {
  padding: var(--nscale-space-2) 0;
}

.n-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}

.n-tree-empty {
  padding: var(--nscale-space-6);
  text-align: center;
  color: var(--nscale-gray-500);
  font-style: italic;
}

/* Dark theme support */
.theme-dark {
  --n-tree-border-color: var(--nscale-gray-700);
  --n-tree-node-hover-bg: var(--nscale-gray-700);
  --n-tree-node-selected-bg: rgba(0, 165, 80, 0.2);
  --n-tree-node-selected-color: var(--nscale-gray-100);
  --n-tree-loading-bg: rgba(17, 24, 39, 0.7);
  --n-tree-loading-text: var(--nscale-gray-300);
}

/* High contrast theme */
.theme-contrast {
  --n-tree-border-color: var(--nscale-primary);
  --n-tree-node-hover-bg: var(--nscale-gray-900);
  --n-tree-node-selected-bg: var(--nscale-primary);
  --n-tree-node-selected-color: var(--nscale-black);
  --n-tree-loading-bg: rgba(0, 0, 0, 0.7);
  --n-tree-loading-text: var(--nscale-primary);
}
</style>