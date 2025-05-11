<template>
  <div
    class="n-tag"
    :class="[
      `n-tag--${variant}`,
      `n-tag--${size}`,
      {
        'n-tag--closable': closable,
        'n-tag--clickable': clickable && !disabled,
        'n-tag--disabled': disabled,
        'n-tag--rounded': rounded,
      },
    ]"
    :style="customStyle"
    :tabindex="clickable && !disabled ? 0 : undefined"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
    role="button"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <span v-if="$slots.icon || icon" class="n-tag-icon">
      <slot name="icon">
        <component :is="icon" v-if="icon" />
      </slot>
    </span>

    <span class="n-tag-content">
      <slot>{{ content }}</slot>
    </span>

    <button
      v-if="closable && !disabled"
      class="n-tag-close-btn"
      @click.stop="handleClose"
      aria-label="Close"
      type="button"
    >
      <svg viewBox="0 0 24 24" width="1em" height="1em">
        <path
          d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";

/**
 * Tag component for displaying tag labels
 * @displayName Tag
 * @example
 * <Tag>Default Tag</Tag>
 * <Tag variant="success" closable>Success Tag</Tag>
 */
export interface TagProps {
  /** Tag variant */
  variant?: "default" | "primary" | "success" | "info" | "warning" | "error";
  /** Size of the tag */
  size?: "small" | "medium" | "large";
  /** Whether the tag can be closed/removed */
  closable?: boolean;
  /** Whether the tag is clickable */
  clickable?: boolean;
  /** Whether the tag is disabled */
  disabled?: boolean;
  /** Tag content */
  content?: string;
  /** Whether the tag has fully rounded corners */
  rounded?: boolean;
  /** Icon component for the tag */
  icon?: Component;
  /** Background color */
  color?: string;
  /** Text color */
  textColor?: string;
}

const props = withDefaults(defineProps<TagProps>(), {
  variant: "default",
  size: "medium",
  closable: false,
  clickable: false,
  disabled: false,
  rounded: false,
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "close", event: MouseEvent): void;
}>();

// Computed properties
const customStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.color) {
    style.backgroundColor = props.color;

    // Auto-generate a contrasting text color if textColor is not specified
    if (!props.textColor) {
      // Simple contrast determination based on background brightness
      const isLight = isLightColor(props.color);
      style.color = isLight ? "#000000" : "#ffffff";
    }
  }

  if (props.textColor) {
    style.color = props.textColor;
  }

  return style;
});

// Methods
/**
 * Determines if a color is light or dark to ensure proper contrast
 */
function isLightColor(color: string): boolean {
  let r, g, b;

  // Handle hex colors
  if (color.startsWith("#")) {
    const hex = color.substring(1);

    // Convert 3-char hex to 6-char
    const expandedHex =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;

    r = parseInt(expandedHex.substring(0, 2), 16);
    g = parseInt(expandedHex.substring(2, 4), 16);
    b = parseInt(expandedHex.substring(4, 6), 16);
  }
  // Handle rgb/rgba colors
  else if (color.startsWith("rgb")) {
    const rgbValues = color.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      r = parseInt(rgbValues[0]);
      g = parseInt(rgbValues[1]);
      b = parseInt(rgbValues[2]);
    } else {
      // Default to assuming it's a light color if parsing fails
      return true;
    }
  }
  // Handle named colors and other formats by assuming they're light
  else {
    return true;
  }

  // Calculate perceived brightness using the formula
  // (299*R + 587*G + 114*B) / 1000
  const brightness = (299 * r + 587 * g + 114 * b) / 1000;

  // If brightness is greater than 128, color is considered light
  return brightness > 128;
}

/**
 * Handle tag click event
 */
function handleClick(event: MouseEvent | KeyboardEvent): void {
  if (props.disabled) return;

  if (props.clickable) {
    emit("click", event);
  }
}

/**
 * Handle close button click
 */
function handleClose(event: MouseEvent): void {
  if (props.disabled) return;

  emit("close", event);
}
</script>

<style scoped>
.n-tag {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border-radius: var(--nscale-border-radius-md);
  font-weight: var(--nscale-font-weight-medium);
  padding: 0 var(--nscale-space-2);
  margin-right: var(--nscale-space-2);
  margin-bottom: var(--nscale-space-2);
  transition: all var(--nscale-transition-quick);
  max-width: 100%;
}

/* Size variants */
.n-tag--small {
  height: 20px;
  font-size: var(--nscale-font-size-xs);
  line-height: 20px;
}

.n-tag--medium {
  height: 24px;
  font-size: var(--nscale-font-size-sm);
  line-height: 24px;
}

.n-tag--large {
  height: 32px;
  font-size: var(--nscale-font-size-base);
  line-height: 32px;
  padding: 0 var(--nscale-space-3);
}

/* Rounded style */
.n-tag--rounded {
  border-radius: 9999px;
}

/* Content */
.n-tag-content {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Icon */
.n-tag-icon {
  display: flex;
  align-items: center;
  margin-right: var(--nscale-space-1);
}

/* Close button */
.n-tag-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--nscale-space-1);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  height: 1em;
  width: 1em;
  font-size: inherit;
  color: inherit;
  opacity: 0.7;
  transition: opacity var(--nscale-transition-quick);
}

.n-tag-close-btn:hover {
  opacity: 1;
}

/* Clickable tags */
.n-tag--clickable {
  cursor: pointer;
}

.n-tag--clickable:hover {
  opacity: 0.8;
}

.n-tag--clickable:active {
  opacity: 0.6;
}

/* Disabled tags */
.n-tag--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Focus styles */
.n-tag:focus-visible {
  outline: 2px solid var(--nscale-primary-light);
  outline-offset: 1px;
}

/* Color variants */
.n-tag--default {
  background-color: var(--nscale-gray-100);
  color: var(--nscale-gray-700);
  border: 1px solid var(--nscale-gray-200);
}

.n-tag--primary {
  background-color: var(--nscale-primary-light);
  color: var(--nscale-primary-dark);
  border: 1px solid var(--nscale-primary);
}

.n-tag--success {
  background-color: var(--nscale-success-light);
  color: var(--nscale-success);
  border: 1px solid var(--nscale-success);
}

.n-tag--info {
  background-color: var(--nscale-info-light);
  color: var(--nscale-info);
  border: 1px solid var(--nscale-info);
}

.n-tag--warning {
  background-color: var(--nscale-warning-light);
  color: var(--nscale-warning);
  border: 1px solid var(--nscale-warning);
}

.n-tag--error {
  background-color: var(--nscale-error-light);
  color: var(--nscale-error);
  border: 1px solid var(--nscale-error);
}

/* Dark theme support */
.theme-dark .n-tag--default {
  background-color: var(--nscale-gray-700);
  color: var(--nscale-gray-200);
  border-color: var(--nscale-gray-600);
}

.theme-dark .n-tag--primary {
  background-color: rgba(0, 165, 80, 0.2);
  color: var(--nscale-primary-light);
  border-color: var(--nscale-primary);
}

.theme-dark .n-tag--success {
  background-color: rgba(16, 185, 129, 0.2);
  color: var(--nscale-success-light);
  border-color: var(--nscale-success);
}

.theme-dark .n-tag--info {
  background-color: rgba(59, 130, 246, 0.2);
  color: var(--nscale-info-light);
  border-color: var(--nscale-info);
}

.theme-dark .n-tag--warning {
  background-color: rgba(245, 158, 11, 0.2);
  color: var(--nscale-warning-light);
  border-color: var(--nscale-warning);
}

.theme-dark .n-tag--error {
  background-color: rgba(220, 38, 38, 0.2);
  color: var(--nscale-error-light);
  border-color: var(--nscale-error);
}

/* High contrast theme */
.theme-contrast .n-tag {
  border-width: 2px;
}

.theme-contrast .n-tag--default {
  background-color: var(--nscale-black);
  color: var(--nscale-white);
  border-color: var(--nscale-white);
}

.theme-contrast .n-tag--primary {
  background-color: var(--nscale-black);
  color: var(--nscale-primary);
  border-color: var(--nscale-primary);
}
</style>
