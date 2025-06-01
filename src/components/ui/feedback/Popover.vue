<template>
  <div class="n-popover-container" ref="container">
    <div
      ref="trigger"
      class="n-popover-trigger"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @focus="handleFocus"
      @blur="handleBlur"
      @click="handleClick"
    >
      <slot name="trigger"></slot>
    </div>

    <Teleport to="body">
      <Transition name="n-popover">
        <div
          v-if="isVisible"
          ref="popover"
          class="n-popover"
          :class="popoverClasses"
          :role="role"
          :tabindex="tabindex"
          :style="popoverStyle"
          @mouseenter="handlePopoverMouseEnter"
          @mouseleave="handlePopoverMouseLeave"
          @keydown.esc="hide"
        >
          <div v-if="showArrow" class="n-popover__arrow" ref="arrow"></div>
          <div class="n-popover__header" v-if="title || $slots.header">
            <slot name="header">{{ title }}</slot>
          </div>
          <div class="n-popover__content">
            <slot></slot>
          </div>
          <div class="n-popover__footer" v-if="$slots.footer">
            <slot name="footer"></slot>
          </div>
          <button
            v-if="closable"
            class="n-popover__close"
            @click="hide"
            aria-label="Close"
            type="button"
          >
            <svg
              class="n-popover__close-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";

/**
 * Popover component for displaying contextual information or content
 * @displayName Popover
 * @example
 * <Popover title="Helpful Tips" trigger="hover">
 *   <template #trigger>
 *     <button>?</button>
 *   </template>
 *   <p>This is the popover content with helpful information.</p>
 * </Popover>
 */
export interface PopoverProps {
  /** The popover title */
  title?: string;
  /** The trigger mechanism */
  trigger?: "hover" | "click" | "focus" | "manual";
  /** The placement of the popover */
  placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end"
    | "right"
    | "right-start"
    | "right-end";
  /** The theme variant */
  variant?: "light" | "dark" | "system";
  /** Whether the popover is open */
  open?: boolean;
  /** Whether the popover has an arrow */
  showArrow?: boolean;
  /** The distance in pixels from the trigger element */
  offset?: number;
  /** Whether to show a close button */
  closable?: boolean;
  /** Delay before showing the popover (milliseconds) */
  showDelay?: number;
  /** Delay before hiding the popover (milliseconds) */
  hideDelay?: number;
  /** Whether to disable the popover */
  disabled?: boolean;
  /** Whether the popover should flip to fit in viewport */
  flip?: boolean;
  /** ARIA role for the popover */
  role?: "tooltip" | "dialog" | "menu" | "alert";
  /** Tabindex for the popover */
  tabindex?: number | string;
  /** Z-index for the popover */
  zIndex?: number;
  /** Whether the popover should trigger document click listener */
  closeOnClickOutside?: boolean;
  /** Max width for the popover */
  maxWidth?: number | string;
  /** Min width for the popover */
  minWidth?: number | string;
  /** Whether to disable auto positioning */
  disableAutoPosition?: boolean;
}

const props = withDefaults(defineProps<PopoverProps>(), {
  title: "",
  trigger: "hover",
  placement: "bottom",
  variant: "light",
  open: false,
  showArrow: true,
  offset: 8,
  closable: false,
  showDelay: 200,
  hideDelay: 200,
  disabled: false,
  flip: true,
  role: "tooltip",
  tabindex: -1,
  zIndex: 1000,
  closeOnClickOutside: true,
  maxWidth: "20rem",
  minWidth: "10rem",
  disableAutoPosition: false,
});

const emit = defineEmits<{
  (e: "show"): void;
  (e: "hide"): void;
  (e: "update:open", value: boolean): void;
}>();

// Refs
const container = ref<HTMLElement | null>(null);
const trigger = ref<HTMLElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const arrow = ref<HTMLElement | null>(null);

// State
const isVisible = ref(props.open);
const showTimer = ref<NodeJS.Timeout | null>(null);
const hideTimer = ref<NodeJS.Timeout | null>(null);

// Handle visibility toggle
watch(
  () => props.open,
  (value) => {
    isVisible.value = value;
  },
);

// Computed styles
const popoverClasses = computed(() => [
  `n-popover--${props.variant}`,
  {
    "n-popover--with-arrow": props.showArrow,
    "n-popover--with-title": !!props.title,
    "n-popover--closable": props.closable,
  },
]);

const popoverStyle = computed(() => ({
  zIndex: props.zIndex,
  maxWidth:
    typeof props.maxWidth === "number" ? `${props.maxWidth}px` : props.maxWidth,
  minWidth:
    typeof props.minWidth === "number" ? `${props.minWidth}px` : props.minWidth,
}));

// Helper functions for positioning
function getPlacement() {
  return props.placement;
}

function updatePosition() {
  if (!trigger.value || !popover.value) return;

  const placement = getPlacement();
  const triggerRect = trigger.value.getBoundingClientRect();
  const popoverRect = popover.value.getBoundingClientRect();
  const arrowSize = 10; // Arrow size in pixels

  let left = 0;
  let top = 0;

  // Calculate position based on placement
  switch (placement) {
    case "top":
      left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
      top = triggerRect.top - popoverRect.height - props.offset;
      if (arrow.value) {
        arrow.value.style.left = "50%";
        arrow.value.style.top = "100%";
        arrow.value.style.transform = "translateX(-50%) rotate(45deg)";
      }
      break;
    case "top-start":
      left = triggerRect.left;
      top = triggerRect.top - popoverRect.height - props.offset;
      if (arrow.value) {
        arrow.value.style.left = "20px";
        arrow.value.style.top = "100%";
        arrow.value.style.transform = "translateX(-50%) rotate(45deg)";
      }
      break;
    case "top-end":
      left = triggerRect.right - popoverRect.width;
      top = triggerRect.top - popoverRect.height - props.offset;
      if (arrow.value) {
        arrow.value.style.right = "20px";
        arrow.value.style.top = "100%";
        arrow.value.style.transform = "translateX(50%) rotate(45deg)";
      }
      break;
    case "bottom":
      left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
      top = triggerRect.bottom + props.offset;
      if (arrow.value) {
        arrow.value.style.left = "50%";
        arrow.value.style.bottom = "100%";
        arrow.value.style.transform = "translateX(-50%) rotate(45deg)";
      }
      break;
    case "bottom-start":
      left = triggerRect.left;
      top = triggerRect.bottom + props.offset;
      if (arrow.value) {
        arrow.value.style.left = "20px";
        arrow.value.style.bottom = "100%";
        arrow.value.style.transform = "translateX(-50%) rotate(45deg)";
      }
      break;
    case "bottom-end":
      left = triggerRect.right - popoverRect.width;
      top = triggerRect.bottom + props.offset;
      if (arrow.value) {
        arrow.value.style.right = "20px";
        arrow.value.style.bottom = "100%";
        arrow.value.style.transform = "translateX(50%) rotate(45deg)";
      }
      break;
    case "left":
      left = triggerRect.left - popoverRect.width - props.offset;
      top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
      if (arrow.value) {
        arrow.value.style.top = "50%";
        arrow.value.style.right = "-5px";
        arrow.value.style.transform = "translateY(-50%) rotate(45deg)";
      }
      break;
    case "left-start":
      left = triggerRect.left - popoverRect.width - props.offset;
      top = triggerRect.top;
      if (arrow.value) {
        arrow.value.style.top = "20px";
        arrow.value.style.right = "-5px";
        arrow.value.style.transform = "translateY(-50%) rotate(45deg)";
      }
      break;
    case "left-end":
      left = triggerRect.left - popoverRect.width - props.offset;
      top = triggerRect.bottom - popoverRect.height;
      if (arrow.value) {
        arrow.value.style.bottom = "20px";
        arrow.value.style.right = "-5px";
        arrow.value.style.transform = "translateY(50%) rotate(45deg)";
      }
      break;
    case "right":
      left = triggerRect.right + props.offset;
      top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
      if (arrow.value) {
        arrow.value.style.top = "50%";
        arrow.value.style.left = "-5px";
        arrow.value.style.transform = "translateY(-50%) rotate(45deg)";
      }
      break;
    case "right-start":
      left = triggerRect.right + props.offset;
      top = triggerRect.top;
      if (arrow.value) {
        arrow.value.style.top = "20px";
        arrow.value.style.left = "-5px";
        arrow.value.style.transform = "translateY(-50%) rotate(45deg)";
      }
      break;
    case "right-end":
      left = triggerRect.right + props.offset;
      top = triggerRect.bottom - popoverRect.height;
      if (arrow.value) {
        arrow.value.style.bottom = "20px";
        arrow.value.style.left = "-5px";
        arrow.value.style.transform = "translateY(50%) rotate(45deg)";
      }
      break;
  }

  // Adjust for viewport boundaries if flip is enabled
  if (props.flip && !props.disableAutoPosition) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (left < 0) {
      left = 0;
    } else if (left + popoverRect.width > viewportWidth) {
      left = viewportWidth - popoverRect.width;
    }

    // Adjust vertical position
    if (top < 0) {
      // Flip from top to bottom
      if (placement.startsWith("top")) {
        top = triggerRect.bottom + props.offset;
        if (arrow.value) {
          arrow.value.style.top = "auto";
          arrow.value.style.bottom = "100%";
        }
      } else {
        top = 0;
      }
    } else if (top + popoverRect.height > viewportHeight) {
      // Flip from bottom to top
      if (placement.startsWith("bottom")) {
        top = triggerRect.top - popoverRect.height - props.offset;
        if (arrow.value) {
          arrow.value.style.bottom = "auto";
          arrow.value.style.top = "100%";
        }
      } else {
        top = viewportHeight - popoverRect.height;
      }
    }
  }

  // Apply position
  if (popover.value) {
    popover.value.style.left = `${left + window.scrollX}px`;
    popover.value.style.top = `${top + window.scrollY}px`;
  }
}

// Event handlers
function handleMouseEnter() {
  if (props.disabled || props.trigger !== "hover") return;
  clearTimeout(hideTimer.value as NodeJS.Timeout);
  showTimer.value = setTimeout(() => {
    show();
  }, props.showDelay);
}

function handleMouseLeave() {
  if (props.disabled || props.trigger !== "hover") return;
  clearTimeout(showTimer.value as NodeJS.Timeout);
  hideTimer.value = setTimeout(() => {
    hide();
  }, props.hideDelay);
}

function handlePopoverMouseEnter() {
  if (props.disabled || props.trigger !== "hover") return;
  clearTimeout(hideTimer.value as NodeJS.Timeout);
}

function handlePopoverMouseLeave() {
  if (props.disabled || props.trigger !== "hover") return;
  hideTimer.value = setTimeout(() => {
    hide();
  }, props.hideDelay);
}

function handleClick() {
  if (props.disabled || props.trigger !== "click") return;
  isVisible.value ? hide() : show();
}

function handleFocus() {
  if (props.disabled || props.trigger !== "focus") return;
  show();
}

function handleBlur() {
  if (props.disabled || props.trigger !== "focus") return;
  hide();
}

function handleClickOutside(event: Event) {
  if (
    !props.closeOnClickOutside ||
    !isVisible.value ||
    props.disabled ||
    !popover.value ||
    !trigger.value
  )
    return;

  if (
    !popover.value.contains(event.target as Node) &&
    !trigger.value.contains(event.target as Node)
  ) {
    hide();
  }
}

// Public methods
function show() {
  if (props.disabled || isVisible.value) return;
  isVisible.value = true;
  emit("update:open", true);
  emit("show");

  nextTick(() => {
    updatePosition();
  });
}

function hide() {
  if (!isVisible.value) return;
  isVisible.value = false;
  emit("update:open", false);
  emit("hide");
}

// Lifecycle hooks
onMounted(() => {
  // Add click outside listener
  if (props.closeOnClickOutside) {
    document.addEventListener("click", handleClickOutside);
  }

  // Add resize and scroll listeners
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition);

  // Initial visibility
  if (props.open) {
    nextTick(() => {
      updatePosition();
    });
  }
});

onBeforeUnmount(() => {
  // Clean up event listeners
  if (props.closeOnClickOutside) {
    document.removeEventListener("click", handleClickOutside);
  }
  window.removeEventListener("resize", updatePosition);
  window.removeEventListener("scroll", updatePosition);

  // Clear any pending timers
  if (showTimer.value) clearTimeout(showTimer.value);
  if (hideTimer.value) clearTimeout(hideTimer.value);
});

// Watch for visibility changes
watch(isVisible, (value) => {
  if (value) {
    nextTick(() => {
      updatePosition();
    });
  }
});

// Expose methods to parent
defineExpose({
  show,
  hide,
  updatePosition,
});
</script>

<style>
.n-popover-container {
  display: inline-block;
  position: relative;
}

.n-popover-trigger {
  display: inline-block;
}

.n-popover {
  position: fixed;
  z-index: var(--nscale-z-index-popover, 1000);
  padding: 0.75rem 1rem;
  border-radius: var(--nscale-border-radius-md, 0.375rem);
  box-shadow: var(
    --nscale-shadow-lg,
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05)
  );
  max-width: var(--nscale-popover-max-width, 20rem);
  border: 1px solid var(--nscale-color-border, #e5e7eb);
  box-sizing: border-box;
  font-family: var(
    --nscale-font-family-base,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  font-size: var(--nscale-font-size-sm, 0.875rem);
  line-height: 1.5;
}

.n-popover--light {
  background-color: var(--nscale-color-white, #ffffff);
  color: var(--nscale-color-text, #374151);
}

.n-popover--dark {
  background-color: var(--nscale-color-gray-800, #1f2937);
  color: var(--nscale-color-gray-100, #f3f4f6);
  border-color: var(--nscale-color-gray-700, #374151);
}

/* System theme follows the OS preference */
@media (prefers-color-scheme: dark) {
  .n-popover--system {
    background-color: var(--nscale-color-gray-800, #1f2937);
    color: var(--nscale-color-gray-100, #f3f4f6);
    border-color: var(--nscale-color-gray-700, #374151);
  }
}

.n-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
}

.n-popover--light .n-popover__arrow {
  background-color: var(--nscale-color-white, #ffffff);
  border: 1px solid var(--nscale-color-border, #e5e7eb);
  border-top: none;
  border-left: none;
}

.n-popover--dark .n-popover__arrow {
  background-color: var(--nscale-color-gray-800, #1f2937);
  border: 1px solid var(--nscale-color-gray-700, #374151);
  border-top: none;
  border-left: none;
}

@media (prefers-color-scheme: dark) {
  .n-popover--system .n-popover__arrow {
    background-color: var(--nscale-color-gray-800, #1f2937);
    border: 1px solid var(--nscale-color-gray-700, #374151);
    border-top: none;
    border-left: none;
  }
}

.n-popover__header {
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nscale-color-border, #e5e7eb);
}

.n-popover--dark .n-popover__header {
  border-bottom-color: var(--nscale-color-gray-700, #374151);
}

@media (prefers-color-scheme: dark) {
  .n-popover--system .n-popover__header {
    border-bottom-color: var(--nscale-color-gray-700, #374151);
  }
}

.n-popover__content {
  margin-bottom: 0.25rem;
}

.n-popover__footer {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--nscale-color-border, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.n-popover--dark .n-popover__footer {
  border-top-color: var(--nscale-color-gray-700, #374151);
}

@media (prefers-color-scheme: dark) {
  .n-popover--system .n-popover__footer {
    border-top-color: var(--nscale-color-gray-700, #374151);
  }
}

.n-popover__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  padding: 0;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
}

.n-popover__close:hover {
  opacity: 1;
}

.n-popover__close-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.n-popover--closable {
  padding-right: 2rem;
}

/* Transitions */
.n-popover-enter-active,
.n-popover-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.n-popover-enter-from,
.n-popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
