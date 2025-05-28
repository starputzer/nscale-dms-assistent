<template>
  <div
    :class="[
      'base-loader',
      `base-loader--${size}`,
      `base-loader--${type}`,
      { 'base-loader--inline': inline },
    ]"
    :aria-label="ariaLabel"
    role="status"
  >
    <div v-if="type === 'spinner'" class="base-loader__spinner">
      <svg viewBox="0 0 50 50">
        <circle
          class="base-loader__circle"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke-width="5"
          stroke-linecap="round"
        ></circle>
      </svg>
    </div>

    <div v-else-if="type === 'dots'" class="base-loader__dots">
      <div class="base-loader__dot"></div>
      <div class="base-loader__dot"></div>
      <div class="base-loader__dot"></div>
    </div>

    <div v-else-if="type === 'pulse'" class="base-loader__pulse">
      <div class="base-loader__pulse-dot"></div>
    </div>

    <div v-if="label" class="base-loader__label">
      {{ label }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "BaseLoader",

  props: {
    type: {
      type: String,
      default: "spinner",
      validator: (value: string) => {
        return ["spinner", "dots", "pulse"].includes(value);
      },
    },
    size: {
      type: String,
      default: "medium",
      validator: (value: string) => {
        return ["small", "medium", "large"].includes(value);
      },
    },
    label: {
      type: String,
      default: "",
    },
    inline: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    const ariaLabel = computed(() => {
      return props.label || "Loading, please wait";
    });

    return {
      ariaLabel,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  &__label {
    margin-top: 0.75rem;
    font-size: 0.9375rem;
    color: var(--color-gray-700);
    text-align: center;
  }

  // Spinner
  &__spinner {
    display: inline-flex;

    svg {
      animation: rotate 2s linear infinite;
    }

    .base-loader__circle {
      stroke: currentColor;
      stroke-dasharray: 150, 200;
      stroke-dashoffset: -10;
      animation: dash 1.5s ease-in-out infinite;
    }
  }

  // Dots
  &__dots {
    display: inline-flex;
    align-items: center;
  }

  &__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: currentColor;
    margin: 0 0.25rem;
    opacity: 0.6;

    &:nth-child(1) {
      animation: scale 0.75s ease-in-out infinite;
    }

    &:nth-child(2) {
      animation: scale 0.75s ease-in-out 0.25s infinite;
    }

    &:nth-child(3) {
      animation: scale 0.75s ease-in-out 0.5s infinite;
    }
  }

  // Pulse
  &__pulse {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  &__pulse-dot {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.6;

    &::before,
    &::after {
      content: "";
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: currentColor;
      opacity: 0.6;
      transform: scale(0);
      animation: pulse 2s ease-out infinite;
    }

    &::after {
      animation-delay: 1s;
    }
  }

  // Sizes
  &--small {
    .base-loader__spinner svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .base-loader__dot {
      width: 0.375rem;
      height: 0.375rem;
    }

    .base-loader__pulse-dot {
      width: 0.75rem;
      height: 0.75rem;
    }

    .base-loader__label {
      font-size: 0.875rem;
    }
  }

  &--medium {
    .base-loader__spinner svg {
      width: 2.5rem;
      height: 2.5rem;
    }

    .base-loader__dot {
      width: 0.5rem;
      height: 0.5rem;
    }

    .base-loader__pulse-dot {
      width: 1rem;
      height: 1rem;
    }
  }

  &--large {
    .base-loader__spinner svg {
      width: 3.5rem;
      height: 3.5rem;
    }

    .base-loader__dot {
      width: 0.625rem;
      height: 0.625rem;
    }

    .base-loader__pulse-dot {
      width: 1.25rem;
      height: 1.25rem;
    }

    .base-loader__label {
      font-size: 1rem;
    }
  }

  // Modifiers
  &--inline {
    display: inline-flex;
    flex-direction: row;
    padding: 0;

    .base-loader__label {
      margin-top: 0;
      margin-left: 0.5rem;
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
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -125px;
  }
}

@keyframes scale {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
</style>
