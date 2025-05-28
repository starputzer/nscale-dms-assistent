<template>
  <div
    :class="[
      'base-checkbox',
      `base-checkbox--${size}`,
      { 'base-checkbox--disabled': disabled },
      { 'base-checkbox--error': error },
    ]"
  >
    <label class="base-checkbox__label">
      <input
        type="checkbox"
        :id="id"
        :value="value"
        :checked="modelValue"
        :disabled="disabled"
        class="base-checkbox__input"
        @change="onChange"
      />
      <span class="base-checkbox__checkmark">
        <svg
          v-if="modelValue"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 13L9 17L19 7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span v-if="label" class="base-checkbox__text">
        {{ label }}
      </span>
      <span v-else-if="$slots.default" class="base-checkbox__text">
        <slot></slot>
      </span>
    </label>

    <div v-if="error" class="base-checkbox__error">
      {{ error }}
    </div>

    <div v-else-if="hint" class="base-checkbox__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "BaseCheckbox",

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    id: {
      type: String,
      default: () => `checkbox-${Math.random().toString(36).substring(2, 9)}`,
    },
    label: {
      type: String,
      default: "",
    },
    value: {
      type: [String, Number, Boolean],
      default: true,
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
.base-checkbox {
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

  &__checkmark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    border: 1px solid var(--color-gray-400);
    background-color: var(--color-white);
    transition: all 0.2s ease;
    color: var(--color-white);

    svg {
      width: 1rem;
      height: 1rem;
    }
  }

  &__input:checked + &__checkmark {
    background-color: var(--color-primary-500);
    border-color: var(--color-primary-500);
  }

  &__input:focus-visible + &__checkmark {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 2px var(--color-primary-100);
  }

  &__input:hover:not(:disabled) + &__checkmark {
    border-color: var(--color-primary-400);
  }

  &__text {
    margin-left: 0.5rem;
    font-size: 0.9375rem;
    color: var(--color-gray-800);
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
    .base-checkbox__checkmark {
      width: 1rem;
      height: 1rem;

      svg {
        width: 0.875rem;
        height: 0.875rem;
      }
    }

    .base-checkbox__text {
      font-size: 0.875rem;
    }
  }

  &--large {
    .base-checkbox__checkmark {
      width: 1.5rem;
      height: 1.5rem;

      svg {
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    .base-checkbox__text {
      font-size: 1rem;
    }
  }

  // States
  &--disabled {
    opacity: 0.7;

    .base-checkbox__label {
      cursor: not-allowed;
    }

    .base-checkbox__checkmark {
      background-color: var(--color-gray-100);
      border-color: var(--color-gray-300);
    }

    .base-checkbox__text {
      color: var(--color-gray-500);
    }
  }

  &--error {
    .base-checkbox__checkmark {
      border-color: var(--color-error-500);
    }

    .base-checkbox__input:focus-visible + .base-checkbox__checkmark {
      box-shadow: 0 0 0 2px var(--color-error-100);
    }
  }
}
</style>
