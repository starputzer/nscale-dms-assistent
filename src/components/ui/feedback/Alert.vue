<template>
  <Transition name="n-alert">
    <div 
      v-if="!dismissed" 
      class="n-alert" 
      :class="alertClasses"
      :role="dismissible ? 'alertdialog' : 'alert'"
      aria-live="polite"
      :aria-atomic="true.toString()"
    >
      <div class="n-alert__content">
        <div v-if="icon || $slots.icon" class="n-alert__icon">
          <slot name="icon">
            <component v-if="icon" :is="icon" />
            <template v-else>
              <CheckCircleIcon v-if="variant === 'success'" />
              <InfoCircleIcon v-else-if="variant === 'info'" />
              <ExclamationCircleIcon v-else-if="variant === 'warning'" />
              <XCircleIcon v-else-if="variant === 'error'" />
            </template>
          </slot>
        </div>
        
        <div class="n-alert__body">
          <div v-if="title || $slots.title" class="n-alert__title">
            <slot name="title">{{ title }}</slot>
          </div>
          
          <div class="n-alert__message">
            <slot>{{ message }}</slot>
          </div>
          
          <div v-if="$slots.actions" class="n-alert__actions">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
      
      <button 
        v-if="dismissible" 
        class="n-alert__dismiss" 
        @click="dismiss"
        aria-label="Close alert"
        type="button"
      >
        <svg class="n-alert__dismiss-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, defineComponent, h } from 'vue';

// Define the icon components
const CheckCircleIcon = defineComponent({
  setup() {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
      h('path', { d: 'M22 4L12 14.01l-3-3' })
    ]);
  }
});

const InfoCircleIcon = defineComponent({
  setup() {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('line', { x1: '12', y1: '16', x2: '12', y2: '12' }),
      h('line', { x1: '12', y1: '8', x2: '12.01', y2: '8' })
    ]);
  }
});

const ExclamationCircleIcon = defineComponent({
  setup() {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
      h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
    ]);
  }
});

const XCircleIcon = defineComponent({
  setup() {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('line', { x1: '15', y1: '9', x2: '9', y2: '15' }),
      h('line', { x1: '9', y1: '9', x2: '15', y2: '15' })
    ]);
  }
});

/**
 * Alert component for displaying informational messages to users
 * @displayName Alert
 * @example
 * <Alert variant="success" title="Success!" dismissible>
 *   Your action was completed successfully.
 * </Alert>
 */
export interface AlertProps {
  /** The alert variant that determines its appearance */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** The alert title */
  title?: string;
  /** The alert message */
  message?: string;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Custom icon component */
  icon?: any;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Whether to show a border */
  bordered?: boolean;
  /** Whether the alert should take up the full width */
  fullWidth?: boolean;
  /** Whether the alert is solid color vs outlined style */
  solid?: boolean;
  /** Whether the alert's corners are rounded */
  rounded?: boolean;
  /** Auto-dismiss duration in milliseconds (0 to disable) */
  autoDismiss?: number;
  /** Elevation/shadow level */
  elevation?: 0 | 1 | 2 | 3;
}

const props = withDefaults(defineProps<AlertProps>(), {
  variant: 'info',
  dismissible: false,
  showIcon: true,
  bordered: true,
  fullWidth: true,
  solid: false,
  rounded: true,
  autoDismiss: 0,
  elevation: 0
});

const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'click'): void;
}>();

// Internal state
const dismissed = ref(false);

// Compute class list for styling
const alertClasses = computed(() => [
  `n-alert--${props.variant}`,
  {
    'n-alert--solid': props.solid,
    'n-alert--bordered': props.bordered,
    'n-alert--full-width': props.fullWidth,
    'n-alert--rounded': props.rounded,
    'n-alert--with-icon': props.showIcon && (props.icon || true),
    'n-alert--dismissible': props.dismissible,
    [`n-alert--elevation-${props.elevation}`]: props.elevation > 0
  }
]);

// Handle dismissing the alert
function dismiss() {
  dismissed.value = true;
  emit('dismiss');
}

// Set up auto-dismiss timer if enabled
if (props.autoDismiss > 0) {
  setTimeout(() => {
    dismiss();
  }, props.autoDismiss);
}
</script>

<style>
.n-alert {
  position: relative;
  display: flex;
  width: 100%;
  padding: 0.875rem 1rem;
  box-sizing: border-box;
  font-family: var(--nscale-font-family-base, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  align-items: flex-start;
  gap: 1rem;
  transition: all 0.2s ease;
}

.n-alert__content {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 0.75rem;
}

.n-alert--rounded {
  border-radius: var(--nscale-border-radius-md, 0.375rem);
}

.n-alert--full-width {
  width: 100%;
}

.n-alert--dismissible {
  padding-right: 2.5rem;
}

.n-alert__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.n-alert__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.n-alert__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.n-alert__title {
  font-weight: 600;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  line-height: 1.5;
  margin: 0;
}

.n-alert__message {
  font-size: var(--nscale-font-size-base, 1rem);
  line-height: 1.5;
  margin: 0;
}

.n-alert__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.n-alert__dismiss {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  padding: 0;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
}

.n-alert__dismiss:hover {
  opacity: 1;
}

.n-alert__dismiss:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.n-alert__dismiss-icon {
  width: 1rem;
  height: 1rem;
}

/* Variant styling */
.n-alert--info {
  color: var(--nscale-gray-800, #1f2937);
  background-color: var(--nscale-info-light, #dbeafe);
}

.n-alert--info.n-alert--bordered {
  border-left: 3px solid var(--nscale-info, #3b82f6);
}

.n-alert--info.n-alert--solid {
  background-color: var(--nscale-info, #3b82f6);
  color: white;
}

.n-alert--success {
  color: var(--nscale-gray-800, #1f2937);
  background-color: var(--nscale-success-light, #d1fae5);
}

.n-alert--success.n-alert--bordered {
  border-left: 3px solid var(--nscale-success, #10b981);
}

.n-alert--success.n-alert--solid {
  background-color: var(--nscale-success, #10b981);
  color: white;
}

.n-alert--warning {
  color: var(--nscale-gray-800, #1f2937);
  background-color: var(--nscale-warning-light, #fef3c7);
}

.n-alert--warning.n-alert--bordered {
  border-left: 3px solid var(--nscale-warning, #f59e0b);
}

.n-alert--warning.n-alert--solid {
  background-color: var(--nscale-warning, #f59e0b);
  color: white;
}

.n-alert--error {
  color: var(--nscale-gray-800, #1f2937);
  background-color: var(--nscale-error-light, #fee2e2);
}

.n-alert--error.n-alert--bordered {
  border-left: 3px solid var(--nscale-error, #dc2626);
}

.n-alert--error.n-alert--solid {
  background-color: var(--nscale-error, #dc2626);
  color: white;
}

/* Elevation levels */
.n-alert--elevation-1 {
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

.n-alert--elevation-2 {
  box-shadow: var(--nscale-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
}

.n-alert--elevation-3 {
  box-shadow: var(--nscale-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
}

/* Transitions */
.n-alert-enter-active,
.n-alert-leave-active {
  transition: all 0.3s ease;
}

.n-alert-enter-from,
.n-alert-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .n-alert--info {
    color: var(--nscale-gray-100, #f3f4f6);
    background-color: rgba(59, 130, 246, 0.2);
  }
  
  .n-alert--success {
    color: var(--nscale-gray-100, #f3f4f6);
    background-color: rgba(16, 185, 129, 0.2);
  }
  
  .n-alert--warning {
    color: var(--nscale-gray-100, #f3f4f6);
    background-color: rgba(245, 158, 11, 0.2);
  }
  
  .n-alert--error {
    color: var(--nscale-gray-100, #f3f4f6);
    background-color: rgba(220, 38, 38, 0.2);
  }
}
</style>