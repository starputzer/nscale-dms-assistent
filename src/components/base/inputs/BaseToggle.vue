<template>
  <div
    :class="[
      'base-toggle',
      `base-toggle--${size}`,
      { 'base-toggle--disabled': disabled },
      { 'base-toggle--error': error },
    ]"
  >
    <label class="base-toggle__label">
      <span v-if="label" class="base-toggle__text">
        {{ label }}
      </span>
      <span v-else-if="$slots.default" class="base-toggle__text">
        <slot></slot>
      </span>

      <span class="base-toggle__wrapper">
        <input
          type="checkbox"
          :id="id"
          :checked="modelValue"
          :disabled="disabled"
          class="base-toggle__input"
          @change="onChange"
        />
        <span
          :class="[
            'base-toggle__switch',
            { 'base-toggle__switch--checked': modelValue },
          ]"
        >
          <span class="base-toggle__slider"></span>
        </span>
      </span>
    </label>

    <div v-if="error" class="base-toggle__error">
      {{ error }}
    </div>

    <div v-else-if="hint" class="base-toggle__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "BaseToggle",

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    id: {
      type: String,
      default: () => `toggle-${Math.random().toString(36).substring(2, 9)}`,
    },
    label: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: "medium",
      validator: (value: string) => {
        return ["small", "medium", "large"].includes(value);
      },
    },
    error: {
      type: String,
      default: "",
    },
    hint: {
      type: String,
      default: "",
    },
  },

  emits: ["update:modelValue", "change"],

  setup(props, { emit }) {
    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      emit("update:modelValue", target.checked);
      emit("change", target.checked);
    };

    return {
      onChange,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-toggle {
  display: inline-flex;
  flex-direction: column;
  font-family: inherit;

  &__label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  &__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;
  }

  &__text {
    margin-right: 0.75rem;
    font-size: 0.9375rem;
    color: var(--color-gray-800);
  }

  &__wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  &__switch {
    position: relative;
    display: inline-block;
    width: 2.5rem;
    height: 1.25rem;
    border-radius: 1.25rem;
    background-color: var(--color-gray-300);
    transition: background-color 0.2s ease;

    &--checked {
      background-color: var(--color-primary-500);
    }
  }

  &__slider {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: var(--color-white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;

    .base-toggle__switch--checked & {
      transform: translateX(1.25rem);
    }
  }

  &__input:focus-visible + &__switch {
    box-shadow: 0 0 0 2px var(--color-primary-100);
  }

  &__error {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-error-500);
  }

  &__hint {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-gray-500);
  }

  // Sizes
  &--small {
    .base-toggle__text {
      font-size: 0.875rem;
    }

    .base-toggle__switch {
      width: 2rem;
      height: 1rem;
    }

    .base-toggle__slider {
      width: 0.75rem;
      height: 0.75rem;
    }

    .base-toggle__switch--checked .base-toggle__slider {
      transform: translateX(1rem);
    }
  }

  &--large {
    .base-toggle__text {
      font-size: 1rem;
    }

    .base-toggle__switch {
      width: 3rem;
      height: 1.5rem;
    }

    .base-toggle__slider {
      width: 1.25rem;
      height: 1.25rem;
    }

    .base-toggle__switch--checked .base-toggle__slider {
      transform: translateX(1.5rem);
    }
  }

  // States
  &--disabled {
    opacity: 0.7;

    .base-toggle__label {
      cursor: not-allowed;
    }

    .base-toggle__switch {
      background-color: var(--color-gray-200);
    }

    .base-toggle__switch--checked {
      background-color: var(--color-gray-400);
    }

    .base-toggle__text {
      color: var(--color-gray-500);
    }
  }

  &--error {
    .base-toggle__switch:not(.base-toggle__switch--checked) {
      background-color: var(--color-error-300);
    }

    .base-toggle__input:focus-visible + .base-toggle__switch {
      box-shadow: 0 0 0 2px var(--color-error-100);
    }
  }
}
</style>
