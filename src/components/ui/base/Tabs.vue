<template>
  <div
    class="n-tabs"
    :class="[
      `n-tabs--${variant}`,
      {
        'n-tabs--vertical': vertical,
        'n-tabs--stretch': stretch,
        'n-tabs--animated': animated,
      },
    ]"
  >
    <!-- Tab headers -->
    <div
      class="n-tabs__nav"
      role="tablist"
      :aria-orientation="vertical ? 'vertical' : 'horizontal'"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        :id="`${tabsId}-tab-${index}`"
        class="n-tabs__tab"
        :class="{
          'n-tabs__tab--active': activeIndex === index,
          'n-tabs__tab--disabled': tab.disabled,
        }"
        role="tab"
        :aria-selected="activeIndex === index ? 'true' : 'false'"
        :aria-controls="`${tabsId}-panel-${index}`"
        :tabindex="activeIndex === index ? 0 : -1"
        @click="!tab.disabled && selectTab(index)"
        @keydown.space.prevent="!tab.disabled && selectTab(index)"
        @keydown.enter.prevent="!tab.disabled && selectTab(index)"
        @keydown.right.prevent="!vertical && focusNextTab(index)"
        @keydown.left.prevent="!vertical && focusPrevTab(index)"
        @keydown.down.prevent="vertical && focusNextTab(index)"
        @keydown.up.prevent="vertical && focusPrevTab(index)"
        @keydown.home.prevent="focusFirstTab"
        @keydown.end.prevent="focusLastTab"
      >
        <div class="n-tabs__tab-inner">
          <component
            v-if="tab.icon"
            :is="tab.icon"
            class="n-tabs__tab-icon"
            :class="{ 'n-tabs__tab-icon--only': !tab.label }"
          />
          <span v-if="tab.label" class="n-tabs__tab-label">{{
            tab.label
          }}</span>
          <span v-if="tab.badge" class="n-tabs__tab-badge">
            <Badge :value="tab.badge" size="small" />
          </span>
        </div>
        <div
          v-if="showIndicator"
          class="n-tabs__indicator"
          :style="indicatorStyles"
        ></div>
      </button>
    </div>

    <!-- Tab panels -->
    <div class="n-tabs__content">
      <div
        v-for="(tab, index) in tabs"
        :key="`content-${index}`"
        :id="`${tabsId}-panel-${index}`"
        class="n-tabs__panel"
        :class="{
          'n-tabs__panel--active': activeIndex === index,
        }"
        role="tabpanel"
        :aria-labelledby="`${tabsId}-tab-${index}`"
        :tabindex="0"
        v-show="activeIndex === index || !lazy"
      >
        <component
          :is="tab.component"
          v-if="tab.component && (!lazy || activeIndex === index)"
          v-bind="tab.props || {}"
        />
        <slot
          v-else-if="$slots[`tab-${index}`]"
          :name="`tab-${index}`"
          :tab="tab"
          :index="index"
        />
        <slot v-else-if="$slots.default" :tab="tab" :index="index" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, useSlots, watch, nextTick } from "vue";
import { Badge } from "./";

/**
 * Tab item interface
 */
export interface TabItem {
  /** Label text for the tab */
  label?: string;
  /** Icon component to display */
  icon?: any;
  /** Tooltip text */
  tooltip?: string;
  /** Badge value to display */
  badge?: string | number;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Optional component to render in tab panel */
  component?: any;
  /** Props to pass to the component */
  props?: Record<string, any>;
  /** Optional ID for the tab */
  id?: string;
}

/**
 * Tabs component that organizes content into multiple panels.
 * @displayName Tabs
 * @example
 * <Tabs :tabs="[{ label: 'Tab 1' }, { label: 'Tab 2' }]" />
 * <Tabs :tabs="tabs" v-model="activeTab" />
 */
export interface TabsProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Active tab index (for v-model binding) */
  modelValue?: number;
  /** Default active tab index when not using v-model */
  defaultTab?: number;
  /** Variant style */
  variant?: "default" | "pills" | "underline" | "minimal";
  /** Whether to show tabs vertically */
  vertical?: boolean;
  /** Whether to stretch tabs to full width */
  stretch?: boolean;
  /** Whether to animate tab transitions */
  animated?: boolean;
  /** Whether to lazy load tab content */
  lazy?: boolean;
  /** Whether to show tab indicator */
  showIndicator?: boolean;
  /** Custom ID prefix for ARIA attributes */
  id?: string;
}

const props = withDefaults(defineProps<TabsProps>(), {
  modelValue: undefined,
  defaultTab: 0,
  variant: "default",
  vertical: false,
  stretch: false,
  animated: true,
  lazy: true,
  showIndicator: true,
  id: undefined,
});

const slots = useSlots();

// Generate a unique ID for this tabs instance
const tabsId = computed(
  () => props.id || `n-tabs-${Math.random().toString(36).substring(2, 9)}`,
);

// Active tab state, controlled or uncontrolled
const activeIndexInternal = ref(props.defaultTab);
const activeIndex = computed({
  get: () =>
    props.modelValue !== undefined
      ? props.modelValue
      : activeIndexInternal.value,
  set: (value) => {
    if (props.modelValue !== undefined) {
      // When using v-model, emit event
      emit("update:modelValue", value);
    } else {
      // When not using v-model, update internal state
      activeIndexInternal.value = value;
    }
    emit("change", value, props.tabs[value]);
  },
});

// Indicator styles (for animated indicator)
const indicatorStyles = computed(() => {
  if (!props.showIndicator) return {};
  return {};
});

// Select a tab
function selectTab(index: number) {
  if (props.tabs[index]?.disabled) return;

  activeIndex.value = index;
  nextTick(() => {
    // Focus the selected tab for accessibility
    const tabElement = document.getElementById(`${tabsId.value}-tab-${index}`);
    if (tabElement) {
      tabElement.focus();
    }
  });
}

// Focus the next tab (for keyboard navigation)
function focusNextTab(currentIndex: number) {
  let nextIndex = currentIndex;

  do {
    nextIndex = (nextIndex + 1) % props.tabs.length;
    // Avoid infinite loop if all tabs are disabled
    if (nextIndex === currentIndex) break;
  } while (props.tabs[nextIndex]?.disabled);

  const tabElement = document.getElementById(
    `${tabsId.value}-tab-${nextIndex}`,
  );
  if (tabElement) {
    tabElement.focus();
  }
}

// Focus the previous tab (for keyboard navigation)
function focusPrevTab(currentIndex: number) {
  let prevIndex = currentIndex;

  do {
    prevIndex = (prevIndex - 1 + props.tabs.length) % props.tabs.length;
    // Avoid infinite loop if all tabs are disabled
    if (prevIndex === currentIndex) break;
  } while (props.tabs[prevIndex]?.disabled);

  const tabElement = document.getElementById(
    `${tabsId.value}-tab-${prevIndex}`,
  );
  if (tabElement) {
    tabElement.focus();
  }
}

// Focus the first tab (for keyboard navigation)
function focusFirstTab() {
  for (let i = 0; i < props.tabs.length; i++) {
    if (!props.tabs[i]?.disabled) {
      const tabElement = document.getElementById(`${tabsId.value}-tab-${i}`);
      if (tabElement) {
        tabElement.focus();
        break;
      }
    }
  }
}

// Focus the last tab (for keyboard navigation)
function focusLastTab() {
  for (let i = props.tabs.length - 1; i >= 0; i--) {
    if (!props.tabs[i]?.disabled) {
      const tabElement = document.getElementById(`${tabsId.value}-tab-${i}`);
      if (tabElement) {
        tabElement.focus();
        break;
      }
    }
  }
}

// Watch for tab changes
watch(
  () => props.tabs.length,
  (newLength, oldLength) => {
    // If active tab is removed, select first available tab
    if (activeIndex.value >= newLength) {
      selectTab(Math.max(0, newLength - 1));
    }
  },
);

// Emit events
const emit = defineEmits<{
  (e: "update:modelValue", index: number): void;
  (e: "change", index: number, tab: TabItem): void;
}>();
</script>

<style scoped>
.n-tabs {
  /* Base styles */
  display: flex;
  flex-direction: column;
  font-family: var(
    --n-font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  width: 100%;
}

/* Vertical layout */
.n-tabs--vertical {
  flex-direction: row;
}

.n-tabs--vertical .n-tabs__nav {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid var(--n-color-border, #e2e8f0);
  min-width: 150px;
}

.n-tabs--vertical .n-tabs__content {
  flex: 1;
}

/* Tabs navigation */
.n-tabs__nav {
  display: flex;
  position: relative;
  border-bottom: 1px solid var(--n-color-border, #e2e8f0);
  margin-bottom: 1rem;
  overflow-x: auto;
  scrollbar-width: thin;
}

/* Hide scrollbars in webkit browsers but maintain functionality */
.n-tabs__nav::-webkit-scrollbar {
  height: 4px;
}

.n-tabs__nav::-webkit-scrollbar-thumb {
  background-color: var(--n-color-gray-300, #cbd5e0);
  border-radius: 4px;
}

/* Stretch tabs to fill space */
.n-tabs--stretch .n-tabs__nav {
  justify-content: space-between;
}

.n-tabs--stretch .n-tabs__tab {
  flex: 1;
}

/* Tab button */
.n-tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--n-color-text-secondary, #718096);
  font-weight: 500;
  font-size: var(--n-font-size-sm, 0.875rem);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  white-space: nowrap;
}

.n-tabs__tab:hover:not(.n-tabs__tab--disabled) {
  color: var(--n-color-primary, #0066cc);
}

.n-tabs__tab:focus-visible {
  outline: 2px solid var(--n-color-primary-light, #4299e1);
  outline-offset: -2px;
  z-index: 1;
}

.n-tabs__tab--active {
  color: var(--n-color-primary, #0066cc);
}

.n-tabs__tab--disabled {
  color: var(--n-color-text-disabled, #a0aec0);
  cursor: not-allowed;
}

.n-tabs__tab-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.n-tabs__tab-icon {
  width: 1em;
  height: 1em;
}

.n-tabs__tab-icon--only {
  margin: 0;
}

.n-tabs__tab-badge {
  margin-left: 0.25rem;
}

/* Style when not using animation */
.n-tabs:not(.n-tabs--animated) .n-tabs__tab--active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--n-color-primary, #0066cc);
}

/* Tab content */
.n-tabs__content {
  position: relative;
  overflow: hidden;
}

.n-tabs__panel {
  padding: 0.5rem 0;
}

.n-tabs__panel--active {
  display: block;
}

/* Indicator (only visible when animation is enabled) */
.n-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background-color: var(--n-color-primary, #0066cc);
  transition: transform 0.3s ease;
  transform-origin: 0 0;
}

.n-tabs--vertical .n-tabs__indicator {
  right: -1px;
  top: 0;
  width: 2px;
  height: auto;
}

/* Animation for tab content */
.n-tabs--animated .n-tabs__panel {
  transition: opacity 0.3s ease;
}

.n-tabs--animated .n-tabs__panel:not(.n-tabs__panel--active) {
  opacity: 0;
  height: 0;
  overflow: hidden;
  padding: 0;
}

.n-tabs--animated .n-tabs__panel--active {
  opacity: 1;
  height: auto;
}

/* Variants */

/* Pills variant */
.n-tabs--pills .n-tabs__nav {
  border-bottom: none;
  gap: 0.5rem;
}

.n-tabs--pills .n-tabs__tab {
  border-radius: var(--n-border-radius-full, 9999px);
  padding: 0.5rem 1rem;
}

.n-tabs--pills .n-tabs__tab--active {
  background-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
}

.n-tabs--pills
  .n-tabs__tab:hover:not(.n-tabs__tab--active):not(.n-tabs__tab--disabled) {
  background-color: var(--n-color-primary-light, #e6f0f9);
}

.n-tabs--pills .n-tabs__indicator {
  display: none;
}

.n-tabs--pills .n-tabs__tab--active::after {
  display: none;
}

/* Underline variant */
.n-tabs--underline .n-tabs__tab--active::after {
  height: 2px;
}

/* Minimal variant */
.n-tabs--minimal .n-tabs__nav {
  border-bottom: none;
}

.n-tabs--minimal .n-tabs__tab--active {
  font-weight: 600;
}

.n-tabs--minimal .n-tabs__tab--active::after {
  display: none;
}

.n-tabs--minimal .n-tabs__indicator {
  display: none;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-tabs__nav {
    border-bottom-color: var(--n-color-border-dark, #4a5568);
  }

  .n-tabs--vertical .n-tabs__nav {
    border-right-color: var(--n-color-border-dark, #4a5568);
  }

  .n-tabs__tab {
    color: var(--n-color-text-secondary-dark, #a0aec0);
  }

  .n-tabs__tab:hover:not(.n-tabs__tab--disabled) {
    color: var(--n-color-primary-light, #4299e1);
  }

  .n-tabs__tab--active {
    color: var(--n-color-primary-light, #4299e1);
  }

  .n-tabs__tab--disabled {
    color: var(--n-color-text-disabled-dark, #718096);
  }

  .n-tabs:not(.n-tabs--animated) .n-tabs__tab--active::after,
  .n-tabs__indicator {
    background-color: var(--n-color-primary-light, #4299e1);
  }

  .n-tabs--pills .n-tabs__tab--active {
    background-color: var(--n-color-primary, #0066cc);
    color: var(--n-color-white, #ffffff);
  }

  .n-tabs--pills
    .n-tabs__tab:hover:not(.n-tabs__tab--active):not(.n-tabs__tab--disabled) {
    background-color: var(--n-color-gray-700, #2d3748);
  }

  .n-tabs__nav::-webkit-scrollbar-thumb {
    background-color: var(--n-color-gray-600, #4a5568);
  }
}
</style>
