<template>
  <div
    ref="tooltipContainer"
    class="n-tooltip-container"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <slot></slot>

    <Transition
      :name="transition ? 'n-tooltip-fade' : ''"
      @before-enter="updatePosition"
    >
      <div
        v-show="isVisible"
        ref="tooltipElement"
        class="n-tooltip"
        :class="[
          `n-tooltip--${position}`,
          {
            'n-tooltip--has-arrow': arrow,
            'n-tooltip--interactive': interactive,
            [`n-tooltip--${variant}`]: variant,
          },
        ]"
        :style="tooltipStyle"
        role="tooltip"
        :aria-hidden="!isVisible"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        <div v-if="html" class="n-tooltip-content" v-html="html"></div>
        <div v-else class="n-tooltip-content">{{ content }}</div>
        <div v-if="arrow" class="n-tooltip-arrow" :style="arrowStyle"></div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";

/**
 * Tooltip component for displaying hints and help text
 * @displayName Tooltip
 * @example
 * <Tooltip content="This is a tooltip">
 *   <Button>Hover me</Button>
 * </Tooltip>
 */
export interface TooltipProps {
  /** Tooltip content as plain text */
  content?: string;
  /** Tooltip content as HTML (overrides content prop) */
  html?: string;
  /** Tooltip position */
  position?:
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end";
  /** Show arrow */
  arrow?: boolean;
  /** Tooltip trigger method */
  trigger?: "hover" | "focus" | "click" | "manual";
  /** Initial visibility state (for manual trigger) */
  modelValue?: boolean;
  /** Delay before showing tooltip (in ms) */
  delay?: number;
  /** Delay before hiding tooltip (in ms) */
  hideDelay?: number;
  /** Max width of tooltip (in px) */
  maxWidth?: number;
  /** Whether the tooltip can be interacted with */
  interactive?: boolean;
  /** Offset from the target element (in px) */
  offset?: number;
  /** Enable animation */
  transition?: boolean;
  /** Z-index of the tooltip */
  zIndex?: number;
  /** Visual variant */
  variant?:
    | "default"
    | "light"
    | "dark"
    | "info"
    | "success"
    | "warning"
    | "error";
}

const props = withDefaults(defineProps<TooltipProps>(), {
  content: "",
  position: "top",
  arrow: true,
  trigger: "hover",
  modelValue: false,
  delay: 200,
  hideDelay: 100,
  maxWidth: 300,
  interactive: false,
  offset: 8,
  transition: true,
  zIndex: 1000,
  variant: "default",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "show"): void;
  (e: "hide"): void;
}>();

// Internal state
const isVisible = ref(props.modelValue);
const tooltipContainer = ref<HTMLElement | null>(null);
const tooltipElement = ref<HTMLElement | null>(null);
const showTimeoutId = ref<number | null>(null);
const hideTimeoutId = ref<number | null>(null);
const isHoveringTooltip = ref(false);

// Computed styles for the tooltip
const tooltipStyle = computed(() => {
  return {
    maxWidth: `${props.maxWidth}px`,
    zIndex: props.zIndex,
  };
});

// Computed styles for the arrow
const arrowStyle = computed(() => {
  return {};
});

// Visibility control functions
function showTooltip() {
  clearTimeout(hideTimeoutId.value!);

  if (isVisible.value) return;

  if (props.delay > 0) {
    showTimeoutId.value = window.setTimeout(() => {
      isVisible.value = true;
      emit("update:modelValue", true);
      emit("show");
    }, props.delay);
  } else {
    isVisible.value = true;
    emit("update:modelValue", true);
    emit("show");
  }
}

function hideTooltip() {
  clearTimeout(showTimeoutId.value!);

  if (!isVisible.value) return;

  // If interactive and hovering the tooltip, don't hide
  if (props.interactive && isHoveringTooltip.value) return;

  if (props.hideDelay > 0) {
    hideTimeoutId.value = window.setTimeout(() => {
      isVisible.value = false;
      emit("update:modelValue", false);
      emit("hide");
    }, props.hideDelay);
  } else {
    isVisible.value = false;
    emit("update:modelValue", false);
    emit("hide");
  }
}

// Event handlers
function handleMouseEnter() {
  if (props.trigger === "hover" || props.trigger === "click") {
    showTooltip();
  }
}

function handleMouseLeave() {
  if (props.trigger === "hover" || props.trigger === "click") {
    hideTooltip();
  }
}

function handleFocusIn() {
  if (props.trigger === "focus") {
    showTooltip();
  }
}

function handleFocusOut() {
  if (props.trigger === "focus") {
    hideTooltip();
  }
}

function handleTooltipMouseEnter() {
  if (props.interactive) {
    isHoveringTooltip.value = true;
  }
}

function handleTooltipMouseLeave() {
  if (props.interactive) {
    isHoveringTooltip.value = false;
    hideTooltip();
  }
}

function handleClick(event: MouseEvent) {
  if (props.trigger === "click") {
    const target = event.target as HTMLElement;
    if (tooltipContainer.value?.contains(target)) {
      isVisible.value ? hideTooltip() : showTooltip();
    } else if (isVisible.value && !tooltipElement.value?.contains(target)) {
      hideTooltip();
    }
  }
}

// Position the tooltip
function updatePosition() {
  if (!tooltipContainer.value || !tooltipElement.value) return;

  nextTick(() => {
    const container = tooltipContainer.value!;
    const tooltip = tooltipElement.value!;
    const containerRect = container.getBoundingClientRect();

    // Reset tooltip position to measure its size
    tooltip.style.top = "0px";
    tooltip.style.left = "0px";

    const tooltipRect = tooltip.getBoundingClientRect();

    // Calculate positions for each placement
    let top = 0;
    let left = 0;

    // Position tooltip based on the selected position
    switch (props.position) {
      case "top":
        top = -tooltipRect.height - props.offset;
        left = (containerRect.width - tooltipRect.width) / 2;
        break;
      case "top-start":
        top = -tooltipRect.height - props.offset;
        left = 0;
        break;
      case "top-end":
        top = -tooltipRect.height - props.offset;
        left = containerRect.width - tooltipRect.width;
        break;
      case "bottom":
        top = containerRect.height + props.offset;
        left = (containerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom-start":
        top = containerRect.height + props.offset;
        left = 0;
        break;
      case "bottom-end":
        top = containerRect.height + props.offset;
        left = containerRect.width - tooltipRect.width;
        break;
      case "left":
        top = (containerRect.height - tooltipRect.height) / 2;
        left = -tooltipRect.width - props.offset;
        break;
      case "left-start":
        top = 0;
        left = -tooltipRect.width - props.offset;
        break;
      case "left-end":
        top = containerRect.height - tooltipRect.height;
        left = -tooltipRect.width - props.offset;
        break;
      case "right":
        top = (containerRect.height - tooltipRect.height) / 2;
        left = containerRect.width + props.offset;
        break;
      case "right-start":
        top = 0;
        left = containerRect.width + props.offset;
        break;
      case "right-end":
        top = containerRect.height - tooltipRect.height;
        left = containerRect.width + props.offset;
        break;
    }

    // Set the final position
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  });
}

// Watch for changes in modelValue prop
watch(
  () => props.modelValue,
  (value) => {
    if (props.trigger === "manual") {
      isVisible.value = value;

      if (value) {
        nextTick(() => updatePosition());
        emit("show");
      } else {
        emit("hide");
      }
    }
  },
);

// Watch for changes in content or position
watch([() => props.content, () => props.html, () => props.position], () => {
  if (isVisible.value) {
    nextTick(() => updatePosition());
  }
});

// Lifecycle hooks
onMounted(() => {
  if (props.trigger === "click") {
    document.addEventListener("click", handleClick);
  }

  // Initially position tooltip if visible by default
  if (isVisible.value) {
    nextTick(() => updatePosition());
  }
});

onBeforeUnmount(() => {
  if (props.trigger === "click") {
    document.removeEventListener("click", handleClick);
  }

  // Clear any pending timeouts
  if (showTimeoutId.value) {
    clearTimeout(showTimeoutId.value);
  }

  if (hideTimeoutId.value) {
    clearTimeout(hideTimeoutId.value);
  }
});
</script>

<style scoped>
.n-tooltip-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.n-tooltip {
  position: absolute;
  background-color: var(--n-color-text-primary, #1e293b);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: var(--n-border-radius, 0.375rem);
  font-size: var(--n-font-size-xs, 0.75rem);
  line-height: 1.4;
  pointer-events: none;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  word-break: break-word;
  white-space: pre-line;
}

.n-tooltip--interactive {
  pointer-events: auto;
}

/* Variants */
.n-tooltip--light {
  background-color: var(--n-color-background-base, #ffffff);
  color: var(--n-color-text-primary, #1e293b);
  border: 1px solid var(--n-color-border, #e2e8f0);
}

.n-tooltip--dark {
  background-color: var(--n-color-background-dark, #0f172a);
  color: var(--n-color-text-primary, #f1f5f9);
}

.n-tooltip--info {
  background-color: var(--n-color-info, #3b82f6);
  color: white;
}

.n-tooltip--success {
  background-color: var(--n-color-success, #10b981);
  color: white;
}

.n-tooltip--warning {
  background-color: var(--n-color-warning, #f59e0b);
  color: white;
}

.n-tooltip--error {
  background-color: var(--n-color-error, #ef4444);
  color: white;
}

/* Arrow */
.n-tooltip--has-arrow .n-tooltip-content {
  position: relative;
}

.n-tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: inherit;
  transform: rotate(45deg);
}

.n-tooltip--top .n-tooltip-arrow {
  bottom: -4px;
  left: calc(50% - 4px);
}

.n-tooltip--top-start .n-tooltip-arrow {
  bottom: -4px;
  left: 12px;
}

.n-tooltip--top-end .n-tooltip-arrow {
  bottom: -4px;
  right: 12px;
}

.n-tooltip--bottom .n-tooltip-arrow {
  top: -4px;
  left: calc(50% - 4px);
}

.n-tooltip--bottom-start .n-tooltip-arrow {
  top: -4px;
  left: 12px;
}

.n-tooltip--bottom-end .n-tooltip-arrow {
  top: -4px;
  right: 12px;
}

.n-tooltip--left .n-tooltip-arrow {
  right: -4px;
  top: calc(50% - 4px);
}

.n-tooltip--left-start .n-tooltip-arrow {
  right: -4px;
  top: 12px;
}

.n-tooltip--left-end .n-tooltip-arrow {
  right: -4px;
  bottom: 12px;
}

.n-tooltip--right .n-tooltip-arrow {
  left: -4px;
  top: calc(50% - 4px);
}

.n-tooltip--right-start .n-tooltip-arrow {
  left: -4px;
  top: 12px;
}

.n-tooltip--right-end .n-tooltip-arrow {
  left: -4px;
  bottom: 12px;
}

/* Light variant arrow fix for border */
.n-tooltip--light .n-tooltip-arrow {
  border-color: inherit;
  border-style: solid;
  border-width: 0 1px 1px 0;
  background-color: var(--n-color-background-base, #ffffff);
}

.n-tooltip--light.n-tooltip--bottom .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--bottom-start .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--bottom-end .n-tooltip-arrow {
  border-width: 1px 0 0 1px;
}

.n-tooltip--light.n-tooltip--left .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--left-start .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--left-end .n-tooltip-arrow {
  border-width: 1px 1px 0 0;
}

.n-tooltip--light.n-tooltip--right .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--right-start .n-tooltip-arrow,
.n-tooltip--light.n-tooltip--right-end .n-tooltip-arrow {
  border-width: 0 0 1px 1px;
}

/* Transition effect */
.n-tooltip-fade-enter-active,
.n-tooltip-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.n-tooltip-fade-enter-from,
.n-tooltip-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-tooltip--light {
    background-color: var(--n-color-background-alt, #1e293b);
    color: var(--n-color-text-primary, #f1f5f9);
    border-color: var(--n-color-border, #334155);
  }

  .n-tooltip--light .n-tooltip-arrow {
    background-color: var(--n-color-background-alt, #1e293b);
  }
}
</style>
