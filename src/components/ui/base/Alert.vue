<template>
  <Transition name="n-alert">
    <div
      v-if="isVisible"
      class="n-alert"
      :class="[`n-alert--${type}`, { 'n-alert--dismissible': dismissible }]"
      role="alert"
      aria-live="assertive"
    >
      <div class="n-alert-icon" aria-hidden="true">
        <component :is="alertIcon" v-if="alertIcon" />
        <svg
          v-else
          class="n-alert-default-icon"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            v-if="type === 'info'"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
          <path
            v-else-if="type === 'success'"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
          <path
            v-else-if="type === 'warning'"
            d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
          />
          <path
            v-else-if="type === 'error'"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
      </div>

      <div class="n-alert-content">
        <div v-if="title" class="n-alert-title">{{ title }}</div>
        <div
          class="n-alert-message"
          :class="{ 'n-alert-message--has-title': !!title }"
        >
          <slot>{{ message }}</slot>
        </div>
      </div>

      <button
        v-if="dismissible"
        type="button"
        class="n-alert-close"
        aria-label="Close alert"
        @click="closeAlert"
      >
        <svg
          class="n-alert-close-icon"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

/**
 * Alert component for displaying messages, notifications, or feedback
 * @displayName Alert
 * @example
 * <Alert type="success" title="Success" message="Operation completed successfully" />
 */
export interface AlertProps {
  /** Type of alert which affects styling */
  type?: "info" | "success" | "warning" | "error";
  /** Title displayed at the top of the alert */
  title?: string;
  /** Main message content */
  message?: string;
  /** Whether the alert can be dismissed by the user */
  dismissible?: boolean;
  /** Auto-dismiss timeout in milliseconds (0 for no auto-dismiss) */
  timeout?: number;
  /** Whether the alert is visible */
  visible?: boolean;
  /** Custom icon component to use instead of default icons */
  icon?: any;
}

const props = withDefaults(defineProps<AlertProps>(), {
  type: "info",
  dismissible: false,
  timeout: 0,
  visible: true,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:visible", value: boolean): void;
}>();

// Internal state for visibility
const isVisible = ref(props.visible);

// Watch for changes to the visible prop
watch(
  () => props.visible,
  (newValue) => {
    isVisible.value = newValue;
  },
);

// Handle alert closing
function closeAlert() {
  isVisible.value = false;
  emit("close");
  emit("update:visible", false);
}

// Select the appropriate icon based on alert type or custom icon
const alertIcon = computed(() => props.icon || null);

// Auto-close alert if timeout is provided
let timer: number | undefined;

onMounted(() => {
  if (props.timeout > 0) {
    timer = setTimeout(() => {
      closeAlert();
    }, props.timeout) as unknown as number;
  }
});

// Clean up timer if component unmounts
onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<style scoped>
.n-alert {
  display: flex;
  padding: 1rem;
  border-radius: var(--n-border-radius, 4px);
  font-family: var(
    --n-font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  border: 1px solid transparent;
}

/* Alert types */
.n-alert--info {
  background-color: var(--n-color-info-bg, #ebf8ff);
  border-color: var(--n-color-info-border, #bee3f8);
  color: var(--n-color-info-text, #2b6cb0);
}

.n-alert--success {
  background-color: var(--n-color-success-bg, #f0fff4);
  border-color: var(--n-color-success-border, #c6f6d5);
  color: var(--n-color-success-text, #2f855a);
}

.n-alert--warning {
  background-color: var(--n-color-warning-bg, #fffaf0);
  border-color: var(--n-color-warning-border, #feebc8);
  color: var(--n-color-warning-text, #c05621);
}

.n-alert--error {
  background-color: var(--n-color-danger-bg, #fff5f5);
  border-color: var(--n-color-danger-border, #fed7d7);
  color: var(--n-color-danger-text, #c53030);
}

/* Icons */
.n-alert-icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-alert-default-icon,
.n-alert-close-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

/* Content */
.n-alert-content {
  flex: 1;
  min-width: 0;
}

.n-alert-title {
  font-weight: 600;
  font-size: var(--n-font-size-md, 1rem);
  margin-bottom: 0.25rem;
}

.n-alert-message {
  font-size: var(--n-font-size-sm, 0.875rem);
}

.n-alert-message--has-title {
  opacity: 0.9;
}

/* Close button */
.n-alert-close {
  background: transparent;
  border: none;
  padding: 0.25rem;
  margin-left: 0.75rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--n-border-radius-sm, 2px);
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.n-alert-close:hover,
.n-alert-close:focus {
  opacity: 1;
  outline: none;
}

.n-alert--dismissible {
  padding-right: 2.5rem;
}

/* Animation */
.n-alert-enter-active,
.n-alert-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease,
    max-height 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.n-alert-enter-from,
.n-alert-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .n-alert--info {
    background-color: rgba(43, 108, 176, 0.2);
    border-color: rgba(43, 108, 176, 0.4);
    color: var(--n-color-info-text-dark, #90cdf4);
  }

  .n-alert--success {
    background-color: rgba(47, 133, 90, 0.2);
    border-color: rgba(47, 133, 90, 0.4);
    color: var(--n-color-success-text-dark, #9ae6b4);
  }

  .n-alert--warning {
    background-color: rgba(192, 86, 33, 0.2);
    border-color: rgba(192, 86, 33, 0.4);
    color: var(--n-color-warning-text-dark, #fbd38d);
  }

  .n-alert--error {
    background-color: rgba(197, 48, 48, 0.2);
    border-color: rgba(197, 48, 48, 0.4);
    color: var(--n-color-danger-text-dark, #feb2b2);
  }
}
</style>
