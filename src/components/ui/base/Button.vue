<template>
  <button
    :class="[
      'n-button',
      `n-button--${variant}`,
      `n-button--${size}`,
      {
        'n-button--loading': loading,
        'n-button--full-width': fullWidth,
        'n-button--icon-only': isIconOnly,
      },
    ]"
    :disabled="disabled || loading"
    :type="type"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : 'false'"
    v-bind="$attrs"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
  >
    <span v-if="loading" class="n-button__loader" aria-hidden="true">
      <svg
        class="n-button__spinner"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="n-button__spinner-path"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke-width="3"
        />
      </svg>
    </span>
    <span
      v-if="iconLeft && !loading"
      class="n-button__icon n-button__icon--left"
      aria-hidden="true"
    >
      <component :is="iconLeft" />
    </span>
    <span
      class="n-button__content"
      :class="{ 'n-button__content--hidden': loading }"
    >
      <slot></slot>
    </span>
    <span
      v-if="iconRight && !loading"
      class="n-button__icon n-button__icon--right"
      aria-hidden="true"
    >
      <component :is="iconRight" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Button component that supports various styles, sizes, and states
 * @displayName Button
 * @example
 * <Button variant="primary" size="medium">Click me</Button>
 */
export interface ButtonProps {
  /** Button style variant */
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "ghost";
  /** Button size */
  size?: "small" | "medium" | "large";
  /** Button HTML type attribute */
  type?: "button" | "submit" | "reset";
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button takes full width of its container */
  fullWidth?: boolean;
  /** Icon component to display on the left side */
  iconLeft?: any;
  /** Icon component to display on the right side */
  iconRight?: any;
  /** Whether the button contains only an icon (no text) */
  iconOnly?: boolean;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "medium",
  type: "button",
  disabled: false,
  loading: false,
  fullWidth: false,
  iconOnly: false,
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
}>();

/**
 * Computed property to determine if the button has only an icon
 */
const isIconOnly = computed(() => {
  return (
    props.iconOnly || (!slots.default && (props.iconLeft || props.iconRight))
  );
});

/**
 * Get the component slots to check if there is default content
 */
const slots = defineSlots();

/**
 * Handle click events and keyboard events (for accessibility)
 */
function handleClick(event: MouseEvent | KeyboardEvent) {
  if (props.disabled || props.loading) return;

  // For keyboard events, only proceed if it's Enter or Space
  if (event instanceof KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
  }

  emit("click", event);
}
</script>

<style scoped>
.n-button {
  /* Base styles */
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
  border-radius: var(--n-border-radius, 4px);
  transition: all 0.2s ease;
  cursor: pointer;
  outline: none;
  position: relative;
  border: 1px solid transparent;
  gap: 0.5rem;
  margin: 0;
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
}

/* Size variants */
.n-button--small {
  font-size: var(--n-font-size-sm, 0.875rem);
  padding: 0.375rem 0.75rem;
  height: 2rem;
}

.n-button--medium {
  font-size: var(--n-font-size-md, 1rem);
  padding: 0.5rem 1rem;
  height: 2.5rem;
}

.n-button--large {
  font-size: var(--n-font-size-lg, 1.125rem);
  padding: 0.625rem 1.25rem;
  height: 3rem;
}

/* Icon-only buttons are square */
.n-button--icon-only.n-button--small {
  padding: 0.375rem;
  width: 2rem;
}

.n-button--icon-only.n-button--medium {
  padding: 0.5rem;
  width: 2.5rem;
}

.n-button--icon-only.n-button--large {
  padding: 0.625rem;
  width: 3rem;
}

/* Color variants */
.n-button--primary {
  background-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
  border-color: var(--n-color-primary, #0066cc);
}

.n-button--primary:hover:not(:disabled) {
  background-color: var(--n-color-primary-dark, #0052a3);
  border-color: var(--n-color-primary-dark, #0052a3);
}

.n-button--secondary {
  background-color: var(--n-color-white, #ffffff);
  color: var(--n-color-primary, #0066cc);
  border-color: var(--n-color-primary, #0066cc);
}

.n-button--secondary:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  border-color: var(--n-color-primary-dark, #0052a3);
  color: var(--n-color-primary-dark, #0052a3);
}

.n-button--tertiary {
  background-color: var(--n-color-white, #ffffff);
  color: var(--n-color-gray-700, #4a5568);
  border-color: var(--n-color-gray-300, #e2e8f0);
}

.n-button--tertiary:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  border-color: var(--n-color-gray-400, #cbd5e0);
  color: var(--n-color-gray-800, #2d3748);
}

.n-button--danger {
  background-color: var(--n-color-danger, #e53e3e);
  color: var(--n-color-white, #ffffff);
  border-color: var(--n-color-danger, #e53e3e);
}

.n-button--danger:hover:not(:disabled) {
  background-color: var(--n-color-danger-dark, #c53030);
  border-color: var(--n-color-danger-dark, #c53030);
}

.n-button--ghost {
  background-color: transparent;
  color: var(--n-color-primary, #0066cc);
  border-color: transparent;
}

.n-button--ghost:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  color: var(--n-color-primary-dark, #0052a3);
}

/* States */
.n-button:focus-visible {
  outline: 2px solid var(--n-color-primary-light, #3498db);
  outline-offset: 2px;
}

.n-button:active:not(:disabled) {
  transform: translateY(1px);
}

.n-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading state */
.n-button--loading {
  cursor: wait;
}

.n-button__loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1.25em;
  height: 1.25em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-button__spinner {
  animation: spin 1s linear infinite;
  width: 100%;
  height: 100%;
}

.n-button__spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: spinner-dash 1.5s ease-in-out infinite;
}

.n-button__content--hidden {
  visibility: hidden;
  opacity: 0;
}

/* Icons */
.n-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}

.n-button__icon--left {
  margin-right: 0.25rem;
}

.n-button__icon--right {
  margin-left: 0.25rem;
}

/* For icon-only buttons, no margins */
.n-button--icon-only .n-button__icon {
  margin: 0;
}

/* Full width */
.n-button--full-width {
  width: 100%;
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spinner-dash {
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

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-button--secondary {
    background-color: var(--n-color-gray-800, #2d3748);
    color: var(--n-color-primary-light, #4299e1);
    border-color: var(--n-color-primary-light, #4299e1);
  }

  .n-button--tertiary {
    background-color: var(--n-color-gray-800, #2d3748);
    color: var(--n-color-gray-300, #e2e8f0);
    border-color: var(--n-color-gray-600, #718096);
  }

  .n-button--ghost {
    color: var(--n-color-primary-light, #4299e1);
  }

  .n-button--ghost:hover:not(:disabled) {
    background-color: var(--n-color-gray-700, #4a5568);
    color: var(--n-color-primary-light, #4299e1);
  }
}
</style>
