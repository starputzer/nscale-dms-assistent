<template>
  <span
    class="n-badge"
    :class="[
      `n-badge--${variant}`,
      `n-badge--${size}`,
      `n-badge--${position}`,
      {
        'n-badge--dot': dot,
        'n-badge--pill': pill,
        'n-badge--standalone': !$slots.default,
        'n-badge--animated': animated && value !== prevValue,
        'n-badge--hidden': hidden,
      },
    ]"
    :data-content="formattedValue"
    :data-max="max"
    :aria-label="dot ? undefined : ariaLabel"
    role="status"
    v-bind="$attrs"
  >
    <span v-if="!dot && showValue" class="n-badge__content">
      {{ formattedValue }}
    </span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";

/**
 * Badge component for displaying notifications, counts, or status indicators.
 * @displayName Badge
 * @example
 * <Badge>New</Badge>
 * <Badge :value="count" max="99">Notifications</Badge>
 * <Badge dot position="top-right" variant="danger">Item with status</Badge>
 */
export interface BadgeProps {
  /** Badge variant/color */
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  /** Badge size */
  size?: "small" | "medium" | "large";
  /** Value to display. If a number is provided it will be capped by max */
  value?: string | number;
  /** Maximum value to display, when value is a number that exceeds max, it will show '{max}+' */
  max?: number;
  /** Whether to display as a dot (no text) */
  dot?: boolean;
  /** Whether to use rounded pill shape */
  pill?: boolean;
  /** Whether to hide the badge */
  hidden?: boolean;
  /** Whether to animate when value changes */
  animated?: boolean;
  /** Position when used as an overlay on another element */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Whether to show the value (not applicable for dot variant) */
  showValue?: boolean;
}

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: "default",
  size: "medium",
  value: "",
  max: 99,
  dot: false,
  pill: false,
  hidden: false,
  animated: true,
  position: "top-right",
  showValue: true,
});

// Store previous value for animation
const prevValue = ref<string | number>(props.value);

// Watch for value changes to update prevValue for animation
watch(
  () => props.value,
  (newValue, oldValue) => {
    // Only animate if values are different
    if (newValue !== oldValue) {
      prevValue.value = oldValue;
      // After animation reset previous value
      setTimeout(() => {
        prevValue.value = newValue;
      }, 300); // Animation duration
    }
  },
);

onMounted(() => {
  prevValue.value = props.value;
});

// Format the value, respecting max limit
const formattedValue = computed(() => {
  if (typeof props.value === "number") {
    if (props.value > props.max) {
      return `${props.max}+`;
    }
    return props.value.toString();
  }
  return props.value;
});
</script>

<style scoped>
.n-badge {
  /* Base styles */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(
    --n-font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  font-weight: 500;
  box-sizing: border-box;
  transition: all 0.2s ease;
  line-height: 1;
}

/* When badge is used as an overlay on another element */
.n-badge:not(.n-badge--standalone) {
  vertical-align: middle;
}

/* Badge content */
.n-badge__content {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

/* Animation when value changes */
.n-badge--animated .n-badge__content {
  animation: n-badge-pulse 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Position variants - Only applied when badge is not standalone */
.n-badge--top-right:not(.n-badge--standalone)::after {
  content: attr(data-content);
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  z-index: 1;
}

.n-badge--top-left:not(.n-badge--standalone)::after {
  content: attr(data-content);
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.n-badge--bottom-right:not(.n-badge--standalone)::after {
  content: attr(data-content);
  position: absolute;
  bottom: 0;
  right: 0;
  transform: translate(50%, 50%);
  z-index: 1;
}

.n-badge--bottom-left:not(.n-badge--standalone)::after {
  content: attr(data-content);
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translate(-50%, 50%);
  z-index: 1;
}

/* Generated badges (positioned ones) */
.n-badge:not(.n-badge--standalone)::after {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 9999px;
  background-color: currentColor;
  color: white;
  box-shadow: 0 0 0 2px var(--n-color-background, white);
}

/* Dot variant */
.n-badge--dot:not(.n-badge--standalone)::after {
  content: "";
  min-width: 8px;
  min-height: 8px;
  padding: 0;
}

/* Standalone mode */
.n-badge--standalone {
  vertical-align: baseline;
  line-height: 1;
}

/* Size variants for standalone badges */
.n-badge--standalone.n-badge--small {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.n-badge--standalone.n-badge--medium {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.325rem;
}

.n-badge--standalone.n-badge--large {
  font-size: 1rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
}

/* Size variants for positioned badges */
.n-badge--small:not(.n-badge--standalone)::after {
  font-size: 0.6rem;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
}

.n-badge--medium:not(.n-badge--standalone)::after {
  font-size: 0.7rem;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
}

.n-badge--large:not(.n-badge--standalone)::after {
  font-size: 0.8rem;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
}

/* Dot size variants */
.n-badge--dot.n-badge--small:not(.n-badge--standalone)::after {
  min-width: 6px;
  min-height: 6px;
}

.n-badge--dot.n-badge--medium:not(.n-badge--standalone)::after {
  min-width: 8px;
  min-height: 8px;
}

.n-badge--dot.n-badge--large:not(.n-badge--standalone)::after {
  min-width: 10px;
  min-height: 10px;
}

/* Pill variant for standalone badges */
.n-badge--standalone.n-badge--pill {
  border-radius: 9999px;
}

/* Variant colors for standalone badges */
.n-badge--standalone.n-badge--default {
  background-color: var(--n-color-gray-500, #718096);
  color: var(--n-color-white, #ffffff);
}

.n-badge--standalone.n-badge--primary {
  background-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
}

.n-badge--standalone.n-badge--success {
  background-color: var(--n-color-success, #48bb78);
  color: var(--n-color-white, #ffffff);
}

.n-badge--standalone.n-badge--warning {
  background-color: var(--n-color-warning, #ed8936);
  color: var(--n-color-white, #ffffff);
}

.n-badge--standalone.n-badge--error {
  background-color: var(--n-color-error, #e53e3e);
  color: var(--n-color-white, #ffffff);
}

.n-badge--standalone.n-badge--info {
  background-color: var(--n-color-info, #3182ce);
  color: var(--n-color-white, #ffffff);
}

/* Variant colors for positioned badges */
.n-badge--default:not(.n-badge--standalone)::after {
  color: var(--n-color-gray-500, #718096);
}

.n-badge--primary:not(.n-badge--standalone)::after {
  color: var(--n-color-primary, #0066cc);
}

.n-badge--success:not(.n-badge--standalone)::after {
  color: var(--n-color-success, #48bb78);
}

.n-badge--warning:not(.n-badge--standalone)::after {
  color: var(--n-color-warning, #ed8936);
}

.n-badge--error:not(.n-badge--standalone)::after {
  color: var(--n-color-error, #e53e3e);
}

.n-badge--info:not(.n-badge--standalone)::after {
  color: var(--n-color-info, #3182ce);
}

/* Hide the badge */
.n-badge--hidden:not(.n-badge--standalone)::after,
.n-badge--standalone.n-badge--hidden {
  display: none;
}

/* Animation keyframes */
@keyframes n-badge-pulse {
  0% {
    opacity: 1;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-badge:not(.n-badge--standalone)::after {
    box-shadow: 0 0 0 2px var(--n-color-background-dark, #1a202c);
  }

  .n-badge--standalone.n-badge--default {
    background-color: var(--n-color-gray-600, #4a5568);
  }
}
</style>
