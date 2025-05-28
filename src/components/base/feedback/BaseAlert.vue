<template>
  <div
    :class="[
      'base-alert',
      `base-alert--${type}`,
      { 'base-alert--dismissible': dismissible },
    ]"
    :role="type === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <div v-if="showIcon" class="base-alert__icon">
      <svg
        v-if="type === 'success'"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <path
          d="M8 12L11 15L16 9"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <svg
        v-else-if="type === 'error'"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <path
          d="M12 7V13"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>

      <svg
        v-else-if="type === 'warning'"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M12 8V12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>

      <svg
        v-else-if="type === 'info'"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <path
          d="M12 16V12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>
    </div>

    <div class="base-alert__content">
      <div v-if="title" class="base-alert__title">{{ title }}</div>
      <div class="base-alert__message">
        <slot>{{ message }}</slot>
      </div>
      <div v-if="$slots.action" class="base-alert__actions">
        <slot name="action"></slot>
      </div>
    </div>

    <button v-if="dismissible" class="base-alert__close" @click="onDismiss">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "BaseAlert",

  props: {
    type: {
      type: String,
      default: "info",
      validator: (value: string) => {
        return ["info", "success", "error", "warning"].includes(value);
      },
    },
    title: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
    dismissible: {
      type: Boolean,
      default: false,
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
  },

  emits: ["dismiss"],

  setup(props, { emit }) {
    const onDismiss = () => {
      emit("dismiss");
    };

    return {
      onDismiss,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-alert {
  display: flex;
  padding: 1rem;
  border-radius: 0.5rem;
  position: relative;

  &__icon {
    display: flex;
    align-items: flex-start;
    margin-right: 0.75rem;

    svg {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  &__message {
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  &__actions {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin: -0.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s ease;
    color: inherit;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 0.25rem;
    }
  }

  // Types
  &--info {
    background-color: var(--color-blue-50);
    border: 1px solid var(--color-blue-200);
    color: var(--color-blue-800);

    .base-alert__icon {
      color: var(--color-blue-500);
    }
  }

  &--success {
    background-color: var(--color-success-50);
    border: 1px solid var(--color-success-200);
    color: var(--color-success-800);

    .base-alert__icon {
      color: var(--color-success-500);
    }
  }

  &--warning {
    background-color: var(--color-warning-50);
    border: 1px solid var(--color-warning-200);
    color: var(--color-warning-800);

    .base-alert__icon {
      color: var(--color-warning-500);
    }
  }

  &--error {
    background-color: var(--color-error-50);
    border: 1px solid var(--color-error-200);
    color: var(--color-error-800);

    .base-alert__icon {
      color: var(--color-error-500);
    }
  }

  // Modifiers
  &--dismissible {
    padding-right: 2.5rem;
  }
}
</style>
