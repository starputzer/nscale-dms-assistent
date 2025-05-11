<template>
  <div
    class="n-inline-message"
    :class="messageClasses"
    :role="role"
    aria-live="polite"
  >
    <div v-if="showIcon" class="n-inline-message__icon">
      <slot name="icon">
        <CheckCircleIcon v-if="variant === 'success'" />
        <InfoCircleIcon v-else-if="variant === 'info'" />
        <ExclamationCircleIcon v-else-if="variant === 'warning'" />
        <XCircleIcon v-else-if="variant === 'error'" />
      </slot>
    </div>

    <div class="n-inline-message__content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from "vue";

// Define the icon components
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

/**
 * InlineMessage component for displaying form field validation or contextual messages
 * @displayName InlineMessage
 * @example
 * <InlineMessage variant="error">
 *   Please enter a valid email address
 * </InlineMessage>
 */
export interface InlineMessageProps {
  /** The message variant that determines its appearance */
  variant?: "info" | "success" | "warning" | "error";
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Sets the aria role for the message */
  role?: "status" | "alert" | "note";
  /** Size of the message */
  size?: "small" | "medium" | "large";
}

const props = withDefaults(defineProps<InlineMessageProps>(), {
  variant: "info",
  showIcon: true,
  role: "status",
  size: "medium",
});

// Computed properties
const messageClasses = computed(() => [
  `n-inline-message--${props.variant}`,
  `n-inline-message--${props.size}`,
  {
    "n-inline-message--with-icon": props.showIcon,
  },
]);
</script>

<style>
.n-inline-message {
  display: flex;
  align-items: flex-start;
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
  padding: 0.5rem 0;
  box-sizing: border-box;
}

.n-inline-message__icon {
  display: flex;
  flex-shrink: 0;
}

.n-inline-message__icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.n-inline-message__content {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  line-height: 1.5;
}

/* Size variations */
.n-inline-message--small .n-inline-message__content {
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-inline-message--small .n-inline-message__icon svg {
  width: 1rem;
  height: 1rem;
}

.n-inline-message--large .n-inline-message__content {
  font-size: var(--nscale-font-size-base, 1rem);
}

.n-inline-message--large .n-inline-message__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

/* Variant styling */
.n-inline-message--info {
  color: var(--nscale-info-dark, #1e40af);
}

.n-inline-message--success {
  color: var(--nscale-success-dark, #065f46);
}

.n-inline-message--warning {
  color: var(--nscale-warning-dark, #92400e);
}

.n-inline-message--error {
  color: var(--nscale-error-dark, #991b1b);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .n-inline-message--info {
    color: var(--nscale-info-light, #bfdbfe);
  }

  .n-inline-message--success {
    color: var(--nscale-success-light, #a7f3d0);
  }

  .n-inline-message--warning {
    color: var(--nscale-warning-light, #fde68a);
  }

  .n-inline-message--error {
    color: var(--nscale-error-light, #fecaca);
  }
}
</style>
