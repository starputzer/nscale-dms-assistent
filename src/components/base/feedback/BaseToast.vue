<template>
  <transition name="toast">
    <div
      v-if="visible"
      :class="[
        'base-toast',
        `base-toast--${type}`,
        { 'base-toast--with-icon': showIcon },
      ]"
      :role="type === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <div v-if="showIcon" class="base-toast__icon">
        <svg
          v-if="type === 'success'"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
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
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
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
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M12 16V12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="12" cy="8" r="1" fill="currentColor" />
        </svg>
      </div>

      <div class="base-toast__content">
        <div v-if="title" class="base-toast__title">{{ title }}</div>
        <div class="base-toast__message">{{ message }}</div>
      </div>

      <button v-if="dismissible" class="base-toast__close" @click="hide">
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

      <div v-if="progress && duration > 0" class="base-toast__progress">
        <div
          class="base-toast__progress-bar"
          :style="{ width: `${progressValue}%` }"
        ></div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";

export default defineComponent({
  name: "BaseToast",

  props: {
    visible: {
      type: Boolean,
      default: false,
    },
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
      required: true,
    },
    duration: {
      type: Number,
      default: 4000, // Milliseconds
    },
    dismissible: {
      type: Boolean,
      default: true,
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
    progress: {
      type: Boolean,
      default: true,
    },
  },

  emits: ["update:visible", "hide"],

  setup(props, { emit }) {
    const timer = ref<number | null>(null);
    const startTime = ref<number>(0);
    const remaining = ref<number>(props.duration);
    const progressValue = ref<number>(100);
    let progressInterval: number | null = null;

    const startTimer = () => {
      if (props.duration <= 0 || !props.visible) return;

      clearTimer();
      startTime.value = Date.now();
      remaining.value = props.duration;

      timer.value = window.setTimeout(() => {
        hide();
      }, props.duration);

      if (props.progress) {
        progressValue.value = 100;
        startProgressBar();
      }
    };

    const clearTimer = () => {
      if (timer.value) {
        clearTimeout(timer.value);
        timer.value = null;
      }

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    const startProgressBar = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      const updateInterval = 10; // Update every 10ms for smooth animation
      const steps = props.duration / updateInterval;
      const decrement = 100 / steps;

      progressInterval = window.setInterval(() => {
        progressValue.value = Math.max(progressValue.value - decrement, 0);
      }, updateInterval);
    };

    const pause = () => {
      if (timer.value) {
        clearTimer();
        remaining.value = remaining.value - (Date.now() - startTime.value);
      }
    };

    const resume = () => {
      if (remaining.value > 0 && props.visible) {
        startTime.value = Date.now();
        timer.value = window.setTimeout(() => {
          hide();
        }, remaining.value);

        if (props.progress) {
          const progressPercentage = (remaining.value / props.duration) * 100;
          progressValue.value = progressPercentage;
          startProgressBar();
        }
      }
    };

    const hide = () => {
      clearTimer();
      emit("update:visible", false);
      emit("hide");
    };

    watch(
      () => props.visible,
      (newVal) => {
        if (newVal) {
          startTimer();
        } else {
          clearTimer();
        }
      },
    );

    watch(
      () => props.duration,
      () => {
        if (props.visible) {
          startTimer();
        }
      },
    );

    onMounted(() => {
      if (props.visible) {
        startTimer();
      }
    });

    onBeforeUnmount(() => {
      clearTimer();
    });

    return {
      progressValue,
      hide,
      pause,
      resume,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-toast {
  display: flex;
  position: relative;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: var(--color-white);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 28rem;
  overflow: hidden;

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
    color: var(--color-gray-900);
  }

  &__message {
    font-size: 0.9375rem;
    color: var(--color-gray-700);
    line-height: 1.5;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin: -0.25rem;
    background: transparent;
    border: none;
    color: var(--color-gray-500);
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-gray-700);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-300);
      outline-offset: 2px;
      border-radius: 0.25rem;
    }
  }

  &__progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: rgba(0, 0, 0, 0.1);
  }

  &__progress-bar {
    height: 100%;
    transition: width 0.1s linear;
  }

  // Types
  &--info {
    border-left: 4px solid var(--color-blue-500);

    .base-toast__icon {
      color: var(--color-blue-500);
    }

    .base-toast__progress-bar {
      background-color: var(--color-blue-500);
    }
  }

  &--success {
    border-left: 4px solid var(--color-success-500);

    .base-toast__icon {
      color: var(--color-success-500);
    }

    .base-toast__progress-bar {
      background-color: var(--color-success-500);
    }
  }

  &--error {
    border-left: 4px solid var(--color-error-500);

    .base-toast__icon {
      color: var(--color-error-500);
    }

    .base-toast__progress-bar {
      background-color: var(--color-error-500);
    }
  }

  &--warning {
    border-left: 4px solid var(--color-warning-500);

    .base-toast__icon {
      color: var(--color-warning-500);
    }

    .base-toast__progress-bar {
      background-color: var(--color-warning-500);
    }
  }

  // Modifiers
  &--with-icon {
    padding-left: 1rem;
  }
}

// Animation
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateY(-1rem);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
