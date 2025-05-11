<template>
  <Transition name="n-banner">
    <div
      v-if="!dismissed && isVisible"
      class="n-banner"
      :class="bannerClasses"
      :role="'status'"
      aria-live="polite"
      :aria-atomic="true.toString()"
    >
      <div class="n-banner__content">
        <div v-if="showIcon || $slots.icon" class="n-banner__icon">
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

        <div class="n-banner__body">
          <div v-if="title || $slots.title" class="n-banner__title">
            <slot name="title">{{ title }}</slot>
          </div>

          <div class="n-banner__message">
            <slot>{{ message }}</slot>
          </div>

          <div
            v-if="$slots.actions || actions.length > 0"
            class="n-banner__actions"
          >
            <slot name="actions">
              <button
                v-for="(action, index) in actions"
                :key="index"
                class="n-banner__action"
                :class="`n-banner__action--${action.type || 'secondary'}`"
                @click="handleAction(action)"
              >
                {{ action.label }}
              </button>
            </slot>
          </div>
        </div>
      </div>

      <button
        v-if="dismissible"
        class="n-banner__dismiss"
        @click="dismiss"
        aria-label="Close banner"
        type="button"
      >
        <svg
          class="n-banner__dismiss-icon"
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
</template>

<script setup lang="ts">
import { computed, ref, defineComponent, h } from "vue";

// Define the icon components - same as Alert for consistency
const CheckCircleIcon = defineComponent({
  setup() {
    return () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
          h("path", { d: "M22 4L12 14.01l-3-3" }),
        ],
      );
  },
});

const InfoCircleIcon = defineComponent({
  setup() {
    return () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
          h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" }),
        ],
      );
  },
});

const ExclamationCircleIcon = defineComponent({
  setup() {
    return () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
          h("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" }),
        ],
      );
  },
});

const XCircleIcon = defineComponent({
  setup() {
    return () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        [
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("line", { x1: "15", y1: "9", x2: "9", y2: "15" }),
          h("line", { x1: "9", y1: "9", x2: "15", y2: "15" }),
        ],
      );
  },
});

// Define action type
interface BannerAction {
  label: string;
  type?: "primary" | "secondary" | "text";
  handler?: () => void;
}

/**
 * Banner component for displaying app-wide informational messages
 * @displayName Banner
 * @example
 * <Banner variant="info" title="System Update Available" dismissible>
 *   A new system update is available with important security fixes.
 * </Banner>
 */
export interface BannerProps {
  /** The banner variant that determines its appearance */
  variant?: "info" | "success" | "warning" | "error" | "neutral";
  /** The banner title */
  title?: string;
  /** The banner message */
  message?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Whether to show the banner */
  visible?: boolean;
  /** Custom icon component */
  icon?: any;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Position of the banner */
  position?: "top" | "bottom";
  /** Whether the banner is stuck to its position */
  sticky?: boolean;
  /** Whether the banner spans the full width */
  fullWidth?: boolean;
  /** List of actions for the banner */
  actions?: BannerAction[];
  /** Auto-dismiss duration in milliseconds (0 to disable) */
  autoDismiss?: number;
}

const props = withDefaults(defineProps<BannerProps>(), {
  variant: "info",
  dismissible: true,
  visible: true,
  showIcon: true,
  position: "top",
  sticky: false,
  fullWidth: true,
  actions: () => [],
  autoDismiss: 0,
});

const emit = defineEmits<{
  (e: "dismiss"): void;
  (e: "action", action: BannerAction): void;
  (e: "update:visible", value: boolean): void;
}>();

// Internal state
const dismissed = ref(false);
const isVisible = computed(() => props.visible);

// Compute class list for styling
const bannerClasses = computed(() => [
  `n-banner--${props.variant}`,
  `n-banner--${props.position}`,
  {
    "n-banner--sticky": props.sticky,
    "n-banner--full-width": props.fullWidth,
    "n-banner--with-icon": props.showIcon && (props.icon || true),
    "n-banner--dismissible": props.dismissible,
    "n-banner--with-actions": props.actions.length > 0 || !!this.$slots.actions,
  },
]);

// Handle dismissing the banner
function dismiss() {
  dismissed.value = true;
  emit("dismiss");
  emit("update:visible", false);
}

// Handle action click
function handleAction(action: BannerAction) {
  if (action.handler) {
    action.handler();
  }
  emit("action", action);
}

// Set up auto-dismiss timer if enabled
if (props.autoDismiss > 0) {
  setTimeout(() => {
    dismiss();
  }, props.autoDismiss);
}
</script>

<style>
.n-banner {
  position: relative;
  display: flex;
  width: 100%;
  padding: 1rem;
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
  align-items: flex-start;
  gap: 1rem;
  transition: all 0.2s ease;
  z-index: var(--nscale-z-index-banner, 900);
  border-bottom: 1px solid var(--nscale-color-border, #e5e7eb);
}

.n-banner--bottom {
  border-top: 1px solid var(--nscale-color-border, #e5e7eb);
  border-bottom: none;
}

.n-banner--sticky {
  position: sticky;
  left: 0;
}

.n-banner--top.n-banner--sticky {
  top: 0;
}

.n-banner--bottom.n-banner--sticky {
  bottom: 0;
}

.n-banner__content {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 0.75rem;
}

.n-banner--full-width {
  width: 100%;
}

.n-banner--dismissible {
  padding-right: 2.5rem;
}

.n-banner__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.n-banner__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.n-banner__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.n-banner__title {
  font-weight: 600;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  line-height: 1.5;
  margin: 0;
}

.n-banner__message {
  font-size: var(--nscale-font-size-base, 1rem);
  line-height: 1.5;
  margin: 0;
}

.n-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.n-banner__action {
  padding: 0.375rem 0.75rem;
  border-radius: var(--nscale-border-radius-md, 0.375rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.n-banner__action--primary {
  background-color: var(--nscale-color-primary, #3b82f6);
  color: white;
}

.n-banner__action--primary:hover {
  background-color: var(--nscale-color-primary-dark, #2563eb);
}

.n-banner__action--secondary {
  background-color: transparent;
  border-color: currentColor;
}

.n-banner__action--secondary:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.n-banner__action--text {
  background-color: transparent;
  text-decoration: underline;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.n-banner__action--text:hover {
  background-color: transparent;
  text-decoration: none;
}

.n-banner__dismiss {
  position: absolute;
  top: 1rem;
  right: 1rem;
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

.n-banner__dismiss:hover {
  opacity: 1;
}

.n-banner__dismiss:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.n-banner__dismiss-icon {
  width: 1rem;
  height: 1rem;
}

/* Variant styling */
.n-banner--info {
  color: var(--nscale-info-dark, #1e40af);
  background-color: var(--nscale-info-light, #dbeafe);
}

.n-banner--success {
  color: var(--nscale-success-dark, #065f46);
  background-color: var(--nscale-success-light, #d1fae5);
}

.n-banner--warning {
  color: var(--nscale-warning-dark, #92400e);
  background-color: var(--nscale-warning-light, #fef3c7);
}

.n-banner--error {
  color: var(--nscale-error-dark, #991b1b);
  background-color: var(--nscale-error-light, #fee2e2);
}

.n-banner--neutral {
  color: var(--nscale-gray-700, #374151);
  background-color: var(--nscale-gray-100, #f3f4f6);
}

/* Transitions */
.n-banner-enter-active,
.n-banner-leave-active {
  transition: all 0.3s ease;
}

.n-banner-enter-from,
.n-banner-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.n-banner--bottom.n-banner-enter-from,
.n-banner--bottom.n-banner-leave-to {
  transform: translateY(100%);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .n-banner {
    border-color: var(--nscale-color-border-dark, #374151);
  }

  .n-banner--info {
    color: var(--nscale-info-light, #bfdbfe);
    background-color: rgba(59, 130, 246, 0.2);
  }

  .n-banner--success {
    color: var(--nscale-success-light, #a7f3d0);
    background-color: rgba(16, 185, 129, 0.2);
  }

  .n-banner--warning {
    color: var(--nscale-warning-light, #fde68a);
    background-color: rgba(245, 158, 11, 0.2);
  }

  .n-banner--error {
    color: var(--nscale-error-light, #fecaca);
    background-color: rgba(220, 38, 38, 0.2);
  }

  .n-banner--neutral {
    color: var(--nscale-gray-300, #d1d5db);
    background-color: rgba(55, 65, 81, 0.3);
  }

  .n-banner__action--secondary {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .n-banner__action--secondary:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .n-banner__content {
    flex-direction: column;
  }

  .n-banner__actions {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .n-banner__action {
    width: 100%;
    text-align: center;
  }
}
</style>
