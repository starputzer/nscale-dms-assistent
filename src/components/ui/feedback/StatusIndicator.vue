<template>
  <div
    class="n-status-indicator"
    :class="indicatorClasses"
    role="status"
    :aria-label="ariaLabel"
  >
    <div class="n-status-indicator__dot" v-if="variant !== 'none'"></div>
    <div class="n-status-indicator__text" v-if="showText || $slots.default">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Status indicator component for displaying system or element status
 * @displayName StatusIndicator
 * @example
 * <StatusIndicator variant="success" text="Online" />
 */
export interface StatusIndicatorProps {
  /** The indicator variant that determines its appearance */
  variant: "success" | "warning" | "error" | "info" | "neutral" | "none";
  /** The indicator text */
  text?: string;
  /** Whether to show the text */
  showText?: boolean;
  /** Whether the indicator pulse animates */
  pulse?: boolean;
  /** The size of the indicator */
  size?: "small" | "medium" | "large";
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

const props = withDefaults(defineProps<StatusIndicatorProps>(), {
  text: "",
  showText: true,
  pulse: false,
  size: "medium",
  ariaLabel: "",
});

// Computed properties
const indicatorClasses = computed(() => [
  `n-status-indicator--${props.variant}`,
  `n-status-indicator--${props.size}`,
  {
    "n-status-indicator--pulse": props.pulse,
    "n-status-indicator--with-text": props.showText || !!props.text,
  },
]);
</script>

<style>
.n-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(
    --nscale-font-family-base,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
}

.n-status-indicator__dot {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.n-status-indicator__text {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: 500;
  line-height: 1.5;
}

/* Size variants */
.n-status-indicator--small .n-status-indicator__dot {
  width: 0.5rem;
  height: 0.5rem;
}

.n-status-indicator--small .n-status-indicator__text {
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-status-indicator--large .n-status-indicator__dot {
  width: 1rem;
  height: 1rem;
}

.n-status-indicator--large .n-status-indicator__text {
  font-size: var(--nscale-font-size-base, 1rem);
}

/* Status variants */
.n-status-indicator--success .n-status-indicator__dot {
  background-color: var(--nscale-success, #10b981);
}

.n-status-indicator--success .n-status-indicator__text {
  color: var(--nscale-success-dark, #065f46);
}

.n-status-indicator--warning .n-status-indicator__dot {
  background-color: var(--nscale-warning, #f59e0b);
}

.n-status-indicator--warning .n-status-indicator__text {
  color: var(--nscale-warning-dark, #92400e);
}

.n-status-indicator--error .n-status-indicator__dot {
  background-color: var(--nscale-error, #dc2626);
}

.n-status-indicator--error .n-status-indicator__text {
  color: var(--nscale-error-dark, #991b1b);
}

.n-status-indicator--info .n-status-indicator__dot {
  background-color: var(--nscale-info, #3b82f6);
}

.n-status-indicator--info .n-status-indicator__text {
  color: var(--nscale-info-dark, #1e40af);
}

.n-status-indicator--neutral .n-status-indicator__dot {
  background-color: var(--nscale-gray-400, #9ca3af);
}

.n-status-indicator--neutral .n-status-indicator__text {
  color: var(--nscale-gray-700, #374151);
}

/* Pulse animation */
.n-status-indicator--pulse .n-status-indicator__dot {
  position: relative;
}

.n-status-indicator--pulse .n-status-indicator__dot::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  animation: pulse 2s infinite ease-in-out;
  opacity: 0.7;
}

.n-status-indicator--success.n-status-indicator--pulse
  .n-status-indicator__dot::before {
  background-color: var(--nscale-success, #10b981);
}

.n-status-indicator--warning.n-status-indicator--pulse
  .n-status-indicator__dot::before {
  background-color: var(--nscale-warning, #f59e0b);
}

.n-status-indicator--error.n-status-indicator--pulse
  .n-status-indicator__dot::before {
  background-color: var(--nscale-error, #dc2626);
}

.n-status-indicator--info.n-status-indicator--pulse
  .n-status-indicator__dot::before {
  background-color: var(--nscale-info, #3b82f6);
}

.n-status-indicator--neutral.n-status-indicator--pulse
  .n-status-indicator__dot::before {
  background-color: var(--nscale-gray-400, #9ca3af);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .n-status-indicator--pulse .n-status-indicator__dot::before {
    animation: none;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .n-status-indicator--success .n-status-indicator__text {
    color: var(--nscale-success-light, #a7f3d0);
  }

  .n-status-indicator--warning .n-status-indicator__text {
    color: var(--nscale-warning-light, #fde68a);
  }

  .n-status-indicator--error .n-status-indicator__text {
    color: var(--nscale-error-light, #fecaca);
  }

  .n-status-indicator--info .n-status-indicator__text {
    color: var(--nscale-info-light, #bfdbfe);
  }

  .n-status-indicator--neutral .n-status-indicator__text {
    color: var(--nscale-gray-300, #d1d5db);
  }
}
</style>
