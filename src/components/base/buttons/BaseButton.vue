<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--loading': loading },
      { 'base-button--block': block },
      { 'base-button--disabled': disabled || loading },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading"
    v-bind="$attrs"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__loader">
      <svg class="loader-svg" viewBox="0 0 24 24">
        <circle
          class="loader-circle"
          cx="12"
          cy="12"
          r="10"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
      </svg>
    </span>
    <span
      v-if="icon && iconPosition === 'left'"
      class="base-button__icon base-button__icon--left"
    >
      <slot name="icon">
        <component :is="icon" :size="iconSize" />
      </slot>
    </span>
    <span class="base-button__content">
      <slot></slot>
    </span>
    <span
      v-if="icon && iconPosition === 'right'"
      class="base-button__icon base-button__icon--right"
    >
      <slot name="icon">
        <component :is="icon" :size="iconSize" />
      </slot>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "BaseButton",

  inheritAttrs: false,

  props: {
    variant: {
      type: String,
      default: "primary",
      validator: (value: string) => {
        return [
          "primary",
          "secondary",
          "tertiary",
          "danger",
          "success",
          "warning",
          "text",
        ].includes(value);
      },
    },
    size: {
      type: String,
      default: "medium",
      validator: (value: string) => {
        return ["small", "medium", "large"].includes(value);
      },
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: [Object, null],
      default: null,
    },
    iconPosition: {
      type: String,
      default: "left",
      validator: (value: string) => {
        return ["left", "right"].includes(value);
      },
    },
  },

  emits: ["click"],

  setup(props, { emit }) {
    const iconSize = computed(() => {
      switch (props.size) {
        case "small":
          return 14;
        case "large":
          return 20;
        default:
          return 16;
      }
    });

    const handleClick = (event: MouseEvent) => {
      if (props.disabled || props.loading) {
        event.preventDefault();
        return;
      }
      emit("click", event);
    };

    return {
      iconSize,
      handleClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  cursor: pointer;
  outline: none;
  border: none;
  font-family: inherit;
  position: relative;
  overflow: hidden;

  &:focus-visible {
    outline: 2px solid var(--color-primary-300);
    outline-offset: 2px;
  }

  &__content {
    position: relative;
    z-index: 1;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;

    &--left {
      margin-right: 0.5rem;
    }

    &--right {
      margin-left: 0.5rem;
    }
  }

  &__loader {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    background-color: inherit;

    .loader-svg {
      width: 1.25rem;
      height: 1.25rem;
      animation: rotate 1.5s linear infinite;
    }

    .loader-circle {
      stroke: currentColor;
      stroke-dasharray: 60, 150;
      stroke-dashoffset: 0;
      animation: dash 1.5s ease-in-out infinite;
    }
  }

  // Sizes
  &--small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  &--medium {
    padding: 0.5rem 1rem;
    font-size: 0.9375rem;
  }

  &--large {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
  }

  // Block
  &--block {
    width: 100%;
    display: flex;
  }

  // Variants
  &--primary {
    background-color: var(--color-primary-500);
    color: var(--color-white);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-primary-600);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-primary-700);
    }
  }

  &--secondary {
    background-color: var(--color-gray-100);
    color: var(--color-gray-800);
    border: 1px solid var(--color-gray-300);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-gray-200);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-gray-300);
    }
  }

  &--tertiary {
    background-color: transparent;
    color: var(--color-primary-500);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-primary-50);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-primary-100);
    }
  }

  &--danger {
    background-color: var(--color-error-500);
    color: var(--color-white);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-error-600);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-error-700);
    }
  }

  &--success {
    background-color: var(--color-success-500);
    color: var(--color-white);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-success-600);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-success-700);
    }
  }

  &--warning {
    background-color: var(--color-warning-500);
    color: var(--color-gray-900);

    &:hover:not(.base-button--disabled) {
      background-color: var(--color-warning-600);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-warning-700);
    }
  }

  &--text {
    background-color: transparent;
    color: var(--color-primary-500);
    padding: 0.25rem 0.5rem;

    &:hover:not(.base-button--disabled) {
      text-decoration: underline;
      background-color: var(--color-gray-50);
    }

    &:active:not(.base-button--disabled) {
      background-color: var(--color-gray-100);
    }
  }

  // States
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  &--loading {
    color: transparent;
    pointer-events: none;

    .base-button__content {
      visibility: hidden;
    }
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
