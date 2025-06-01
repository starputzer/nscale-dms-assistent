<template>
  <div class="n-focus-trap">
    <!-- Initial focus sentinel -->
    <span
      ref="initialSentinel"
      tabindex="0"
      @focus="focusLastElement"
      aria-hidden="true"
    ></span>

    <!-- Content slot -->
    <slot></slot>

    <!-- Final focus sentinel -->
    <span
      ref="finalSentinel"
      tabindex="0"
      @focus="focusFirstElement"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUpdated, watch, nextTick } from "vue";

/**
 * Focus trap component for accessibility in modals and dialogs
 * @displayName FocusTrap
 * @example
 * <FocusTrap :active="isModalOpen">
 *   <div class="modal-content">
 *     <!-- Modal content with focusable elements -->
 *   </div>
 * </FocusTrap>
 */
export interface FocusTrapProps {
  /** Whether the focus trap is active */
  active: boolean;
  /** Whether to automatically focus the first focusable element when activated */
  autoFocus?: boolean;
  /** Whether to restore focus to the previously focused element when deactivated */
  restoreFocus?: boolean;
  /** CSS selector for elements that should be focusable */
  focusableSelector?: string;
}

const props = withDefaults(defineProps<FocusTrapProps>(), {
  autoFocus: true,
  restoreFocus: true,
  focusableSelector:
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
});

// References
const initialSentinel = ref<HTMLElement | null>(null);
const finalSentinel = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const previouslyFocusedElement = ref<HTMLElement | null>(null);

// Get all focusable elements in the container
function getFocusableElements(): HTMLElement[] {
  if (!container.value) return [];

  const elements = container.value.querySelectorAll<HTMLElement>(
    props.focusableSelector,
  );
  return Array.from(elements).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

// Focus the first focusable element in the container
function focusFirstElement() {
  const elements = getFocusableElements();
  if (elements.length > 0) {
    elements[0].focus();
  } else {
    // If no focusable elements, focus the container itself
    container.value?.focus();
  }
}

// Focus the last focusable element in the container
function focusLastElement() {
  const elements = getFocusableElements();
  if (elements.length > 0) {
    elements[elements.length - 1].focus();
  } else {
    // If no focusable elements, focus the container itself
    container.value?.focus();
  }
}

// Initialize focus trap on mount
onMounted(() => {
  // Store reference to the container (parent element of the slot content)
  container.value = initialSentinel.value?.parentElement || null;

  // If active, store currently focused element and focus first element
  if (props.active) {
    previouslyFocusedElement.value = document.activeElement as HTMLElement;

    if (props.autoFocus) {
      nextTick(() => {
        focusFirstElement();
      });
    }
  }
});

// Update focus trap when content changes
onUpdated(() => {
  container.value = initialSentinel.value?.parentElement || null;
});

// Watch for changes to the active prop
watch(
  () => props.active,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      // Activate: store currently focused element and focus first element
      previouslyFocusedElement.value = document.activeElement as HTMLElement;

      if (props.autoFocus) {
        nextTick(() => {
          focusFirstElement();
        });
      }
    } else if (!newValue && oldValue) {
      // Deactivate: restore focus to previously focused element
      if (props.restoreFocus && previouslyFocusedElement.value) {
        nextTick(() => {
          previouslyFocusedElement.value?.focus();
        });
      }
    }
  },
);
</script>

<style scoped>
.n-focus-trap {
  display: contents;
}

/* Hide focus sentinels visually */
.n-focus-trap > span[tabindex="0"] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
