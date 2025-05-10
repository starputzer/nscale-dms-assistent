<template>
  <div 
    class="n-toggle-wrapper"
    :class="{ 
      'n-toggle-wrapper--disabled': disabled,
      'n-toggle-wrapper--error': !!error,
      'n-toggle-wrapper--checked': modelValue
    }"
  >
    <div v-if="label || $slots.default" class="n-toggle-label-wrapper">
      <label 
        :for="toggleId" 
        class="n-toggle-label"
        :class="{ 'n-toggle-label--required': required }"
      >
        <slot>{{ label }}</slot>
      </label>

      <div class="n-toggle-control">
        <input
          :id="toggleId"
          type="checkbox"
          class="n-toggle-input"
          :checked="modelValue"
          :disabled="disabled"
          :required="required"
          :aria-invalid="!!error"
          :aria-describedby="helperId"
          @change="updateValue"
        />
        <div 
          class="n-toggle-switch"
          :style="toggleSwitchStyle"
          :data-label-on="showLabels ? labelOn : undefined"
          :data-label-off="showLabels ? labelOff : undefined"
        >
          <div 
            class="n-toggle-thumb"
            :style="toggleThumbStyle"
          ></div>
        </div>
      </div>
    </div>
    
    <div v-else class="n-toggle-standalone">
      <input
        :id="toggleId"
        type="checkbox"
        class="n-toggle-input"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="helperId"
        @change="updateValue"
      />
      <div 
        class="n-toggle-switch"
        :style="toggleSwitchStyle"
        :data-label-on="showLabels ? labelOn : undefined"
        :data-label-off="showLabels ? labelOff : undefined"
      >
        <div 
          class="n-toggle-thumb"
          :style="toggleThumbStyle"
        ></div>
      </div>
    </div>

    <div v-if="error || helperText" class="n-toggle-helper" :id="helperId">
      <span v-if="error" class="n-toggle-error">{{ error }}</span>
      <span v-else-if="helperText" class="n-toggle-helper-text">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { uniqueId } from 'lodash';

/**
 * Toggle switch component for boolean input selection
 * @displayName Toggle
 * @example
 * <Toggle v-model="isDarkMode">Dark Mode</Toggle>
 */
export interface ToggleProps {
  /** Value for v-model binding */
  modelValue: boolean;
  /** Label text (can also use default slot) */
  label?: string;
  /** Helper text displayed below the toggle */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Whether the toggle is required */
  required?: boolean;
  /** Unique ID for the toggle (auto-generated if not provided) */
  id?: string;
  /** Size of the toggle (small, medium, large) */
  size?: 'sm' | 'md' | 'lg';
  /** Color of the toggle when active */
  color?: string;
  /** Show On/Off labels */
  showLabels?: boolean;
  /** Label for the ON state */
  labelOn?: string;
  /** Label for the OFF state */
  labelOff?: string;
}

const props = withDefaults(defineProps<ToggleProps>(), {
  disabled: false,
  required: false,
  size: 'md',
  showLabels: false,
  labelOn: 'ON',
  labelOff: 'OFF'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', event: Event): void;
}>();

// Generate unique ID for the toggle
const toggleId = computed(() => props.id || uniqueId('n-toggle-'));
const helperId = computed(() => `${toggleId.value}-helper`);

// Size-based styling
const sizeConfig = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        width: '36px',
        height: '20px',
        thumbSize: '16px',
        thumbOffset: '2px',
        fontSize: '10px'
      };
    case 'lg':
      return {
        width: '56px',
        height: '30px',
        thumbSize: '26px',
        thumbOffset: '2px',
        fontSize: '12px'
      };
    case 'md':
    default:
      return {
        width: '46px',
        height: '24px',
        thumbSize: '20px',
        thumbOffset: '2px',
        fontSize: '11px'
      };
  }
});

// Computed styles for the toggle switch
const toggleSwitchStyle = computed(() => {
  return {
    '--toggle-width': sizeConfig.value.width,
    '--toggle-height': sizeConfig.value.height,
    '--toggle-font-size': sizeConfig.value.fontSize,
    '--toggle-color': props.color || 'var(--n-color-primary, #3b82f6)'
  };
});

// Computed styles for the toggle thumb
const toggleThumbStyle = computed(() => {
  return {
    '--toggle-thumb-size': sizeConfig.value.thumbSize,
    '--toggle-thumb-offset': sizeConfig.value.thumbOffset
  };
});

// Handle toggle value changes
function updateValue(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', event);
}
</script>

<style scoped>
.n-toggle-wrapper {
  display: inline-flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}

.n-toggle-label-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.n-toggle-label {
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: 500;
  color: var(--n-color-text-primary, #1e293b);
  margin-right: 1rem;
  user-select: none;
}

.n-toggle-label--required::after {
  content: "*";
  color: var(--n-color-error, #ef4444);
  margin-left: 0.25rem;
}

.n-toggle-standalone {
  display: inline-flex;
  align-items: center;
}

.n-toggle-control {
  position: relative;
  display: inline-block;
}

.n-toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
}

.n-toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: var(--toggle-width, 46px);
  height: var(--toggle-height, 24px);
  border-radius: calc(var(--toggle-height, 24px) / 2);
  background-color: var(--n-color-border, #e2e8f0);
  transition: background-color var(--n-transition, 0.2s) ease;
  cursor: pointer;
}

.n-toggle-wrapper--checked .n-toggle-switch {
  background-color: var(--toggle-color, var(--n-color-primary, #3b82f6));
}

.n-toggle-wrapper--error .n-toggle-switch {
  border: 1px solid var(--n-color-error, #ef4444);
}

.n-toggle-thumb {
  position: absolute;
  left: var(--toggle-thumb-offset, 2px);
  width: var(--toggle-thumb-size, 20px);
  height: var(--toggle-thumb-size, 20px);
  border-radius: 50%;
  background-color: var(--n-color-background-base, #ffffff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: transform var(--n-transition, 0.2s) ease;
}

.n-toggle-wrapper--checked .n-toggle-thumb {
  transform: translateX(calc(var(--toggle-width) - var(--toggle-thumb-size) - (var(--toggle-thumb-offset) * 2)));
}

.n-toggle-wrapper--disabled {
  opacity: 0.6;
}

.n-toggle-wrapper--disabled .n-toggle-label,
.n-toggle-wrapper--disabled .n-toggle-switch {
  cursor: not-allowed;
}

/* Toggle switch labels */
.n-toggle-switch[data-label-on]::before,
.n-toggle-switch[data-label-off]::after {
  position: absolute;
  font-size: var(--toggle-font-size, 11px);
  font-weight: 600;
  transition: opacity var(--n-transition, 0.2s) ease;
  white-space: nowrap;
}

.n-toggle-switch[data-label-on]::before {
  content: attr(data-label-on);
  right: calc(var(--toggle-thumb-size) + 4px);
  color: var(--n-color-background-base, #ffffff);
  opacity: 0;
}

.n-toggle-switch[data-label-off]::after {
  content: attr(data-label-off);
  left: calc(var(--toggle-thumb-size) + 4px);
  color: var(--n-color-text-secondary, #64748b);
  opacity: 1;
}

.n-toggle-wrapper--checked .n-toggle-switch[data-label-on]::before {
  opacity: 1;
}

.n-toggle-wrapper--checked .n-toggle-switch[data-label-off]::after {
  opacity: 0;
}

/* Helper text and error message */
.n-toggle-helper {
  margin-top: 0.25rem;
  font-size: var(--n-font-size-xs, 0.75rem);
  margin-left: 0.25rem;
}

.n-toggle-error {
  color: var(--n-color-error, #ef4444);
}

.n-toggle-helper-text {
  color: var(--n-color-text-secondary, #64748b);
}

/* Keyboard focus styling */
.n-toggle-input:focus-visible + .n-toggle-switch {
  outline: 2px solid var(--toggle-color, var(--n-color-primary, #3b82f6));
  outline-offset: 2px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-toggle-label {
    color: var(--n-color-text-primary, #f1f5f9);
  }
  
  .n-toggle-switch {
    background-color: var(--n-color-border, #334155);
  }
  
  .n-toggle-thumb {
    background-color: var(--n-color-background-base, #e2e8f0);
  }
  
  .n-toggle-switch[data-label-on]::before {
    color: var(--n-color-background-base, #f1f5f9);
  }
  
  .n-toggle-switch[data-label-off]::after {
    color: var(--n-color-text-secondary, #94a3b8);
  }
  
  .n-toggle-helper-text {
    color: var(--n-color-text-secondary, #94a3b8);
  }
}
</style>