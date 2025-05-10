<template>
  <div 
    class="n-progress-bar" 
    :class="[
      `n-progress-bar--${size}`,
      `n-progress-bar--${variant}`,
      {
        'n-progress-bar--striped': striped,
        'n-progress-bar--animated': animated,
        'n-progress-bar--rounded': rounded,
        'n-progress-bar--labeled': showLabel
      }
    ]"
    :aria-valuenow="value"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="ariaValueText"
    role="progressbar"
    v-bind="$attrs"
  >
    <div 
      class="n-progress-bar__track"
      :style="{ height: trackHeight }"
      :class="{ 'n-progress-bar__track--indeterminate': indeterminate }"
    >
      <div 
        class="n-progress-bar__fill"
        :style="{ width: progressWidth }"
        :class="{ 'n-progress-bar__fill--indeterminate': indeterminate }"
      ></div>
    </div>
    
    <transition name="n-progress-bar-label">
      <div 
        v-if="showLabel && !indeterminate" 
        class="n-progress-bar__label"
        :class="{
          'n-progress-bar__label--inside': labelPosition === 'inside' && value >= labelThreshold,
          'n-progress-bar__label--outside': labelPosition === 'outside'
        }"
      >
        <slot name="label">
          {{ formattedValue }}
        </slot>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * ProgressBar component that displays progress status.
 * @displayName ProgressBar
 * @example
 * <ProgressBar :value="75" />
 * <ProgressBar :value="33" variant="success" size="large" showLabel />
 * <ProgressBar indeterminate />
 */
export interface ProgressBarProps {
  /** Current progress value */
  value?: number;
  /** Minimum value (usually 0) */
  min?: number;
  /** Maximum value (usually 100) */
  max?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Whether to show striped effect */
  striped?: boolean;
  /** Whether to animate the stripes */
  animated?: boolean;
  /** Whether to use rounded corners */
  rounded?: boolean;
  /** Whether to show a label with the progress */
  showLabel?: boolean;
  /** Position of the label */
  labelPosition?: 'inside' | 'outside';
  /** Threshold value for showing label inside (when labelPosition is 'inside') */
  labelThreshold?: number;
  /** Custom format for the label */
  format?: (value: number, min: number, max: number) => string;
  /** Whether the progress is indeterminate */
  indeterminate?: boolean;
  /** Custom track height (CSS value) */
  trackHeight?: string;
  /** Custom accessible text description */
  ariaValueText?: string;
}

const props = withDefaults(defineProps<ProgressBarProps>(), {
  value: 0,
  min: 0,
  max: 100,
  size: 'medium',
  variant: 'primary',
  striped: false,
  animated: false,
  rounded: true,
  showLabel: false,
  labelPosition: 'inside',
  labelThreshold: 30,
  indeterminate: false,
  trackHeight: ''
});

// Compute normalized progress width as percentage
const progressWidth = computed(() => {
  if (props.indeterminate) return '100%';
  
  // Clamp value between min and max
  const clampedValue = Math.max(props.min, Math.min(props.max, props.value));
  
  // Calculate percentage
  const range = props.max - props.min;
  if (range <= 0) return '0%';
  
  const percentage = ((clampedValue - props.min) / range) * 100;
  return `${percentage}%`;
});

// Format the percentage or value for display
const formattedValue = computed(() => {
  if (props.format) {
    return props.format(props.value, props.min, props.max);
  }
  
  // Default formatting as percentage
  const range = props.max - props.min;
  if (range <= 0) return '0%';
  
  const percentage = Math.round(((props.value - props.min) / range) * 100);
  return `${percentage}%`;
});

// ARIA accessible text
const ariaValueText = computed(() => {
  if (props.ariaValueText) {
    return props.ariaValueText;
  }
  return props.indeterminate ? 'Loading...' : formattedValue.value;
});
</script>

<style scoped>
.n-progress-bar {
  /* Base styles */
  position: relative;
  width: 100%;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: var(--n-font-size-sm, 0.875rem);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
}

.n-progress-bar__track {
  background-color: var(--n-color-gray-200, #e2e8f0);
  border-radius: var(--n-border-radius, 0.25rem);
  overflow: hidden;
  position: relative;
}

/* Default track heights by size */
.n-progress-bar--small .n-progress-bar__track {
  height: 0.5rem;
}

.n-progress-bar--medium .n-progress-bar__track {
  height: 0.75rem;
}

.n-progress-bar--large .n-progress-bar__track {
  height: 1rem;
}

/* Override with custom height if specified */
.n-progress-bar__track[style*="height"] {
  height: var(--custom-height);
}

.n-progress-bar__fill {
  background-color: var(--n-color-primary, #0066cc);
  height: 100%;
  border-radius: var(--n-border-radius, 0.25rem);
  transition: width 0.2s ease;
}

/* Variant colors */
.n-progress-bar--primary .n-progress-bar__fill {
  background-color: var(--n-color-primary, #0066cc);
}

.n-progress-bar--secondary .n-progress-bar__fill {
  background-color: var(--n-color-secondary, #718096);
}

.n-progress-bar--success .n-progress-bar__fill {
  background-color: var(--n-color-success, #48bb78);
}

.n-progress-bar--warning .n-progress-bar__fill {
  background-color: var(--n-color-warning, #ed8936);
}

.n-progress-bar--error .n-progress-bar__fill {
  background-color: var(--n-color-error, #e53e3e);
}

.n-progress-bar--info .n-progress-bar__fill {
  background-color: var(--n-color-info, #3182ce);
}

/* Striped effect */
.n-progress-bar--striped .n-progress-bar__fill {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
}

/* Animated effect */
.n-progress-bar--animated .n-progress-bar__fill {
  animation: n-progress-bar-stripes 1s linear infinite;
}

/* Indeterminate state */
.n-progress-bar__fill--indeterminate {
  width: 50% !important;
  animation: n-progress-bar-indeterminate 2s ease infinite;
}

/* Label styles */
.n-progress-bar__label {
  font-size: var(--n-font-size-xs, 0.75rem);
  font-weight: 600;
  transition: all 0.2s ease;
}

/* Label positioning */
.n-progress-bar__label--inside {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
  color: var(--n-color-white, #ffffff);
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.n-progress-bar__label--outside {
  margin-top: 0.25rem;
  color: var(--n-color-text-primary, #1a202c);
  text-align: right;
}

/* Rounded corners */
.n-progress-bar--rounded .n-progress-bar__track,
.n-progress-bar--rounded .n-progress-bar__fill {
  border-radius: 9999px;
}

/* Animation keyframes */
@keyframes n-progress-bar-stripes {
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
}

@keyframes n-progress-bar-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Label transition */
.n-progress-bar-label-enter-active,
.n-progress-bar-label-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.n-progress-bar-label-enter-from,
.n-progress-bar-label-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-progress-bar__track {
    background-color: var(--n-color-gray-700, #4a5568);
  }
  
  .n-progress-bar__label--outside {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
}
</style>