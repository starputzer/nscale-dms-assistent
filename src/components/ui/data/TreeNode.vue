<template>
  <li
    class="n-tree-node"
    :class="{
      'n-tree-node--expanded': isExpanded,
      'n-tree-node--selected': isSelected,
      'n-tree-node--disabled': isDisabled,
      'n-tree-node--leaf': isLeaf,
    }"
    :style="{ paddingLeft: indentStyle }"
    role="treeitem"
    :aria-expanded="!isLeaf ? String(isExpanded) : undefined"
    :aria-selected="selectable ? String(isSelected) : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-level="level"
  >
    <div
      class="n-tree-node-content"
      :class="{ 'n-tree-node-content--selectable': selectable && !isDisabled }"
      @click="handleClick"
    >
      <!-- Expand/collapse icon -->
      <div
        v-if="!isLeaf"
        class="n-tree-node-expand-icon"
        @click.stop="handleToggle"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
        role="button"
        tabindex="0"
        @keydown.enter.prevent="handleToggle"
        @keydown.space.prevent="handleToggle"
      >
        <slot name="expand-icon" :expanded="isExpanded">
          <component
            :is="renderExpandIcon"
            v-if="renderExpandIcon"
            class="n-tree-node-icon"
          />
          <span
            v-else
            class="n-tree-node-arrow"
            :class="{ 'n-tree-node-arrow--expanded': isExpanded }"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
                fill="currentColor"
              />
            </svg>
          </span>
        </slot>
      </div>
      <span v-else class="n-tree-node-expand-placeholder"></span>

      <!-- Checkbox (if checkable) -->
      <div
        v-if="checkable"
        class="n-tree-node-checkbox"
        :class="{
          'n-tree-node-checkbox--checked': isChecked,
          'n-tree-node-checkbox--indeterminate': isIndeterminate,
          'n-tree-node-checkbox--disabled': isDisabled,
        }"
        @click.stop="handleCheck"
        :aria-checked="isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false'"
        role="checkbox"
        tabindex="0"
        @keydown.enter.prevent="handleCheck"
        @keydown.space.prevent="handleCheck"
      >
        <span class="n-tree-node-checkbox-inner"></span>
      </div>

      <!-- Node icon -->
      <div v-if="hasIcon" class="n-tree-node-icon-wrapper">
        <slot
          name="icon"
          :item="item"
          :level="level"
          :expanded="isExpanded"
          :leaf="isLeaf"
        >
          <component :is="nodeIcon" v-if="nodeIcon" class="n-tree-node-icon" />
          <span
            v-else-if="isLeaf"
            class="n-tree-node-icon n-tree-node-icon--leaf"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                fill="currentColor"
              />
              <path d="M14 3v5h5" fill="currentColor" />
              <path
                d="M16 13H8"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M16 17H8"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M10 9H8"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span v-else class="n-tree-node-icon n-tree-node-icon--branch">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M22 11V3h-7v3H9V3H2v8h7V8h2v10a3 3 0 0 0 3 3h1v-3h-1a1 1 0 0 1-1-1v-2h6v-4h-6V8h2v3h7z"
                fill="currentColor"
              />
            </svg>
          </span>
        </slot>
      </div>

      <!-- Node label -->
      <div class="n-tree-node-label">
        <slot
          name="label"
          :item="item"
          :level="level"
          :expanded="isExpanded"
          :selected="isSelected"
        >
          {{ getLabel }}
        </slot>
      </div>

      <!-- Extra content (actions, badges, etc.) -->
      <div v-if="$slots.extra" class="n-tree-node-extra">
        <slot
          name="extra"
          :item="item"
          :level="level"
          :expanded="isExpanded"
          :selected="isSelected"
        ></slot>
      </div>

      <!-- Loading indicator for async nodes -->
      <div v-if="loading" class="n-tree-node-loading">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          />
        </svg>
      </div>
    </div>

    <!-- Child nodes -->
    <transition
      name="n-tree-node-children"
      @enter="setMaxHeight"
      @before-leave="setMaxHeight"
    >
      <ul
        v-if="!isLeaf && isExpanded && hasChildren"
        class="n-tree-node-children"
        role="group"
      >
        <TreeNode
          v-for="(childItem, index) in childNodes"
          :key="getChildKey(childItem, index)"
          :item="childItem"
          :level="level + 1"
          :label-prop="labelProp"
          :children-prop="childrenProp"
          :icon-prop="iconProp"
          :is-leaf-prop="isLeafProp"
          :expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          :disabled-keys="disabledKeys"
          :selectable="selectable"
          :checkable="checkable"
          :checked-keys="checkedKeys"
          :cascade-check="cascadeCheck"
          :default-expand-all="defaultExpandAll"
          :leaf-icon="leafIcon"
          :branch-icon="branchIcon"
          :expand-icon="expandIcon"
          :collapse-icon="collapseIcon"
          :load-data="loadData"
          @toggle="handleChildToggle"
          @select="handleChildSelect"
          @check="handleChildCheck"
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
    </transition>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, inject } from "vue";
import type { Component } from "vue";

export interface TreeNodeProps {
  /** The node data */
  item: any;
  /** Current nesting level */
  level: number;
  /** Property name for the node label */
  labelProp: string;
  /** Property name for the child nodes */
  childrenProp: string;
  /** Property name for the node icon */
  iconProp: string;
  /** Property name to determine if a node is a leaf node */
  isLeafProp: string;
  /** Keys of expanded nodes */
  expandedKeys: (string | number)[];
  /** Keys of selected nodes */
  selectedKeys: (string | number)[];
  /** Whether nodes are selectable */
  selectable: boolean;
  /** Whether nodes have checkboxes */
  checkable: boolean;
  /** Keys of checked nodes */
  checkedKeys: (string | number)[];
  /** Whether to cascade check state to children and parents */
  cascadeCheck: boolean;
  /** Keys of disabled nodes */
  disabledKeys: (string | number)[];
  /** Whether to expand all nodes by default */
  defaultExpandAll: boolean;
  /** Icon for leaf nodes */
  leafIcon?: string | Component;
  /** Icon for branch nodes */
  branchIcon?: string | Component;
  /** Icon for expanded state */
  expandIcon?: string | Component;
  /** Icon for collapsed state */
  collapseIcon?: string | Component;
  /** Function for async loading of child nodes */
  loadData?: (node: any) => Promise<any[]>;
  /** Whether node representation is customized */
  customRender?: boolean;
}

const props = defineProps<TreeNodeProps>();

const emit = defineEmits<{
  (e: "toggle", item: any, expanded: boolean): void;
  (e: "select", item: any, selected: boolean): void;
  (e: "check", item: any, checked: boolean): void;
}>();

// Get treeContext from provide/inject
const treeContext = inject("treeContext", {
  labelProp: props.labelProp,
  childrenProp: props.childrenProp,
  iconProp: props.iconProp,
  isLeafProp: props.isLeafProp,
  selectable: props.selectable,
  checkable: props.checkable,
  multiple: false,
  nodeKey: null,
  getNodeKey: (item: any, index: number) => index,
});

// State
const loading = ref(false);
const localChildNodes = ref<any[]>([]);

// Computed properties
const nodeKey = computed(() => {
  if (typeof treeContext.nodeKey === "function") {
    return treeContext.nodeKey(props.item);
  }

  if (treeContext.nodeKey && props.item[treeContext.nodeKey] !== undefined) {
    return props.item[treeContext.nodeKey];
  }

  // Fallback
  if (props.item.id !== undefined) return props.item.id;
  if (props.item.key !== undefined) return props.item.key;

  return props.item[props.labelProp];
});

const indentStyle = computed(() => {
  return `${(props.level - 1) * 24}px`;
});

const isExpanded = computed(() => {
  return props.expandedKeys.includes(nodeKey.value);
});

const isSelected = computed(() => {
  return props.selectedKeys.includes(nodeKey.value);
});

const isDisabled = computed(() => {
  return props.disabledKeys.includes(nodeKey.value);
});

const isLeaf = computed(() => {
  // If isLeafProp is defined and present on the item, use it
  if (props.isLeafProp && props.item[props.isLeafProp] !== undefined) {
    return Boolean(props.item[props.isLeafProp]);
  }

  // Otherwise, infer from children
  return !hasChildren.value;
});

const hasChildren = computed(() => {
  return Boolean(
    (props.item[props.childrenProp] &&
      props.item[props.childrenProp].length > 0) ||
      localChildNodes.value.length > 0,
  );
});

const childNodes = computed(() => {
  // Use locally loaded nodes if they exist, otherwise use children from item
  if (localChildNodes.value.length > 0) {
    return localChildNodes.value;
  }

  return props.item[props.childrenProp] || [];
});

const isChecked = computed(() => {
  return props.checkedKeys.includes(nodeKey.value);
});

// Simplified indeterminate state (more complex logic would be implemented for real cascading)
const isIndeterminate = computed(() => {
  // Check if any children are checked
  if (!hasChildren.value) return false;

  const allChildKeys = getAllChildKeys(props.item);
  const someChecked = allChildKeys.some((key) =>
    props.checkedKeys.includes(key),
  );
  const allChecked = allChildKeys.every((key) =>
    props.checkedKeys.includes(key),
  );

  return someChecked && !allChecked && !isChecked.value;
});

const getLabel = computed(() => {
  return props.item[props.labelProp];
});

const hasIcon = computed(() => {
  return Boolean(
    props.item[props.iconProp] || props.leafIcon || props.branchIcon,
  );
});

const nodeIcon = computed(() => {
  // Return custom icon if provided in the item
  if (props.item[props.iconProp]) {
    return props.item[props.iconProp];
  }

  // Return appropriate predefined icon based on node type
  if (isLeaf.value && props.leafIcon) {
    return props.leafIcon;
  }

  if (!isLeaf.value && props.branchIcon) {
    return props.branchIcon;
  }

  return null;
});

const renderExpandIcon = computed(() => {
  if (isExpanded.value && props.expandIcon) {
    return props.expandIcon;
  }

  if (!isExpanded.value && props.collapseIcon) {
    return props.collapseIcon;
  }

  return null;
});

// Methods
function getChildKey(item: any, index: number): string | number {
  return treeContext.getNodeKey(item, index);
}

function getAllChildKeys(item: any): (string | number)[] {
  const keys: (string | number)[] = [];

  function collectKeys(node: any): void {
    if (!node[props.childrenProp] || !node[props.childrenProp].length) return;

    for (const child of node[props.childrenProp]) {
      const childKey = getChildKey(child, 0);
      keys.push(childKey);
      collectKeys(child);
    }
  }

  collectKeys(item);
  return keys;
}

function handleToggle(e?: Event): void {
  if (isDisabled.value || isLeaf.value) return;

  // Toggle node expansion
  const willExpand = !isExpanded.value;

  if (willExpand && props.loadData && !hasChildren.value) {
    // Async load children if needed
    loading.value = true;
    props
      .loadData(props.item)
      .then((children) => {
        localChildNodes.value = children;
        loading.value = false;
        emit("toggle", props.item, true);
      })
      .catch(() => {
        loading.value = false;
      });
  } else {
    emit("toggle", props.item, willExpand);
  }
}

function handleClick(e: MouseEvent): void {
  if (isDisabled.value) return;

  if (props.selectable) {
    emit("select", props.item, !isSelected.value);
  }
}

function handleCheck(e?: Event): void {
  if (isDisabled.value) return;

  emit("check", props.item, !isChecked.value);
}

function handleChildToggle(childItem: any, expanded: boolean): void {
  emit("toggle", childItem, expanded);
}

function handleChildSelect(childItem: any, selected: boolean): void {
  emit("select", childItem, selected);
}

function handleChildCheck(childItem: any, checked: boolean): void {
  emit("check", childItem, checked);
}

// Animation helpers
function setMaxHeight(el: HTMLElement): void {
  // Set initial max-height for enter/leave animations
  el.style.maxHeight = `${el.scrollHeight}px`;

  // Reset max-height to auto after animation completes
  // (for when children change after expansion)
  const onEnd = (): void => {
    el.style.maxHeight = "none";
    el.removeEventListener("transitionend", onEnd);
  };

  el.addEventListener("transitionend", onEnd);
}
</script>

<style scoped>
.n-tree-node {
  position: relative;
  line-height: 1.5;
  list-style: none;
  white-space: nowrap;
  outline: none;
}

.n-tree-node-content {
  display: flex;
  align-items: center;
  height: var(--n-tree-node-height);
  padding-right: var(--nscale-space-2);
  cursor: default;
  transition: all var(--nscale-transition-quick);
  border-radius: var(--nscale-border-radius-sm);
}

.n-tree-node-content--selectable {
  cursor: pointer;
}

.n-tree-node-content:hover {
  background-color: var(--n-tree-node-hover-bg);
}

.n-tree-node--selected > .n-tree-node-content {
  background-color: var(--n-tree-node-selected-bg);
  color: var(--n-tree-node-selected-color);
  font-weight: var(--nscale-font-weight-medium);
}

.n-tree-node--disabled > .n-tree-node-content {
  color: var(--nscale-gray-400);
  cursor: not-allowed;
}

.n-tree-node--disabled > .n-tree-node-content:hover {
  background-color: transparent;
}

/* Expand/collapse control */
.n-tree-node-expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--n-tree-node-height);
  height: var(--n-tree-node-height);
  line-height: var(--n-tree-node-height);
  cursor: pointer;
  transition: transform var(--nscale-transition-quick);
  flex-shrink: 0;
}

.n-tree-node-expand-placeholder {
  width: var(--n-tree-node-height);
  height: var(--n-tree-node-height);
  flex-shrink: 0;
}

.n-tree-node-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: transform var(--nscale-transition-quick);
}

.n-tree-node-arrow--expanded {
  transform: rotate(90deg);
}

/* Checkbox */
.n-tree-node-checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--nscale-space-2);
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.n-tree-node-checkbox-inner {
  position: relative;
  box-sizing: border-box;
  display: block;
  width: 16px;
  height: 16px;
  border: 1px solid var(--nscale-gray-400);
  border-radius: 2px;
  background-color: var(--nscale-white);
  transition: all var(--nscale-transition-quick);
}

.n-tree-node-checkbox--checked .n-tree-node-checkbox-inner {
  border-color: var(--nscale-primary);
  background-color: var(--nscale-primary);
}

.n-tree-node-checkbox--checked .n-tree-node-checkbox-inner::after {
  position: absolute;
  content: "";
  top: 2px;
  left: 5px;
  width: 3px;
  height: 6px;
  border: 2px solid var(--nscale-white);
  border-top: 0;
  border-left: 0;
  transform: rotate(45deg);
}

.n-tree-node-checkbox--indeterminate .n-tree-node-checkbox-inner {
  border-color: var(--nscale-primary);
  background-color: var(--nscale-primary);
}

.n-tree-node-checkbox--indeterminate .n-tree-node-checkbox-inner::after {
  position: absolute;
  content: "";
  top: 7px;
  left: 3px;
  width: 8px;
  height: 2px;
  background-color: var(--nscale-white);
}

.n-tree-node-checkbox--disabled {
  cursor: not-allowed;
}

.n-tree-node-checkbox--disabled .n-tree-node-checkbox-inner {
  border-color: var(--nscale-gray-300);
  background-color: var(--nscale-gray-100);
}

.n-tree-node-checkbox--disabled.n-tree-node-checkbox--checked
  .n-tree-node-checkbox-inner,
.n-tree-node-checkbox--disabled.n-tree-node-checkbox--indeterminate
  .n-tree-node-checkbox-inner {
  background-color: var(--nscale-gray-300);
}

/* Node icon */
.n-tree-node-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--nscale-space-2);
  width: var(--n-tree-icon-size);
  height: var(--n-tree-icon-size);
  flex-shrink: 0;
}

.n-tree-node-icon {
  width: 100%;
  height: 100%;
  font-size: var(--n-tree-icon-size);
  color: var(--nscale-gray-500);
}

.n-tree-node-icon--leaf {
  color: var(--nscale-primary);
}

.n-tree-node-icon--branch {
  color: var(--nscale-gray-500);
}

/* Node label */
.n-tree-node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: var(--nscale-space-2);
}

/* Extra content */
.n-tree-node-extra {
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Loading indicator */
.n-tree-node-loading {
  margin-left: var(--nscale-space-2);
  animation: tree-node-loading-rotate 1s linear infinite;
}

@keyframes tree-node-loading-rotate {
  100% {
    transform: rotate(360deg);
  }
}

/* Child nodes */
.n-tree-node-children {
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* Transition animations */
.n-tree-node-children-enter-active,
.n-tree-node-children-leave-active {
  transition: max-height var(--nscale-transition-normal) ease-in-out;
  overflow: hidden;
}

.n-tree-node-children-enter-from,
.n-tree-node-children-leave-to {
  max-height: 0 !important;
}

/* Focus styles */
.n-tree-node-content:focus-within {
  outline: 2px solid var(--nscale-primary-light);
  outline-offset: 1px;
}

/* Dark theme support */
.theme-dark .n-tree-node-checkbox-inner {
  background-color: var(--nscale-gray-800);
  border-color: var(--nscale-gray-600);
}

.theme-dark .n-tree-node-checkbox--disabled .n-tree-node-checkbox-inner {
  background-color: var(--nscale-gray-700);
  border-color: var(--nscale-gray-600);
}

.theme-dark .n-tree-node-icon {
  color: var(--nscale-gray-400);
}

.theme-dark .n-tree-node-icon--leaf {
  color: var(--nscale-primary-light);
}

/* High contrast theme */
.theme-contrast .n-tree-node-checkbox-inner {
  border-color: var(--nscale-primary);
}

.theme-contrast .n-tree-node-checkbox--checked .n-tree-node-checkbox-inner {
  background-color: var(--nscale-primary);
}

.theme-contrast
  .n-tree-node-checkbox--checked
  .n-tree-node-checkbox-inner::after {
  border-color: var(--nscale-black);
}

.theme-contrast .n-tree-node-icon {
  color: var(--nscale-white);
}

.theme-contrast .n-tree-node-icon--leaf {
  color: var(--nscale-primary);
}
</style>
