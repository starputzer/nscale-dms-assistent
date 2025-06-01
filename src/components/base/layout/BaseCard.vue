<template>
  <div
    :class="[
      'base-card',
      `base-card--${variant}`,
      { 'base-card--bordered': bordered },
      { 'base-card--shadow': shadow },
      { 'base-card--hover': hover },
      { 'base-card--clickable': clickable },
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable ? $emit('click', $event) : null"
    @keydown.enter="clickable ? $emit('click', $event) : null"
    @keydown.space="clickable ? $emit('click', $event) : null"
  >
    <div v-if="$slots.header || title" class="base-card__header">
      <slot name="header">
        <h3 v-if="title" class="base-card__title">{{ title }}</h3>
      </slot>
    </div>

    <div :class="['base-card__body', { 'base-card__body--padded': padded }]">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="base-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "BaseCard",

  props: {
    title: {
      type: String,
      default: "",
    },
    padded: {
      type: Boolean,
      default: true,
    },
    bordered: {
      type: Boolean,
      default: true,
    },
    shadow: {
      type: Boolean,
      default: false,
    },
    hover: {
      type: Boolean,
      default: false,
    },
    clickable: {
      type: Boolean,
      default: false,
    },
    variant: {
      type: String,
      default: "default",
      validator: (value: string) => {
        return [
          "default",
          "primary",
          "secondary",
          "info",
          "success",
          "warning",
          "danger",
        ].includes(value);
      },
    },
  },

  emits: ["click"],
});
</script>

<style lang="scss" scoped>
.base-card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-white);
  border-radius: 0.5rem;
  overflow: hidden;

  &__header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-gray-200);
  }

  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-gray-900);
  }

  &__body {
    flex: 1;

    &--padded {
      padding: 1.25rem;
    }
  }

  &__footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-gray-200);
    background-color: var(--color-gray-50);
  }

  // Variants
  &--default {
    background-color: var(--color-white);
  }

  &--primary {
    background-color: var(--color-primary-50);
    border-color: var(--color-primary-200);

    .base-card__header {
      background-color: var(--color-primary-100);
      border-bottom-color: var(--color-primary-200);
    }

    .base-card__title {
      color: var(--color-primary-900);
    }

    .base-card__footer {
      background-color: var(--color-primary-50);
      border-top-color: var(--color-primary-200);
    }
  }

  &--secondary {
    background-color: var(--color-gray-50);
    border-color: var(--color-gray-200);

    .base-card__header {
      background-color: var(--color-gray-100);
      border-bottom-color: var(--color-gray-200);
    }
  }

  &--info {
    background-color: var(--color-blue-50);
    border-color: var(--color-blue-200);

    .base-card__header {
      background-color: var(--color-blue-100);
      border-bottom-color: var(--color-blue-200);
    }

    .base-card__title {
      color: var(--color-blue-900);
    }

    .base-card__footer {
      background-color: var(--color-blue-50);
      border-top-color: var(--color-blue-200);
    }
  }

  &--success {
    background-color: var(--color-success-50);
    border-color: var(--color-success-200);

    .base-card__header {
      background-color: var(--color-success-100);
      border-bottom-color: var(--color-success-200);
    }

    .base-card__title {
      color: var(--color-success-900);
    }

    .base-card__footer {
      background-color: var(--color-success-50);
      border-top-color: var(--color-success-200);
    }
  }

  &--warning {
    background-color: var(--color-warning-50);
    border-color: var(--color-warning-200);

    .base-card__header {
      background-color: var(--color-warning-100);
      border-bottom-color: var(--color-warning-200);
    }

    .base-card__title {
      color: var(--color-warning-900);
    }

    .base-card__footer {
      background-color: var(--color-warning-50);
      border-top-color: var(--color-warning-200);
    }
  }

  &--danger {
    background-color: var(--color-error-50);
    border-color: var(--color-error-200);

    .base-card__header {
      background-color: var(--color-error-100);
      border-bottom-color: var(--color-error-200);
    }

    .base-card__title {
      color: var(--color-error-900);
    }

    .base-card__footer {
      background-color: var(--color-error-50);
      border-top-color: var(--color-error-200);
    }
  }

  // Modifiers
  &--bordered {
    border: 1px solid var(--color-gray-200);
  }

  &--shadow {
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  &--hover {
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
  }

  &--clickable {
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-300);
      outline-offset: 2px;
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
