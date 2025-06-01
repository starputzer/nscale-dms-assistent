<template>
  <div
    :class="[
      'base-input',
      `base-input--${size}`,
      { 'base-input--error': error },
      { 'base-input--disabled': disabled },
      { 'base-input--readonly': readonly },
      { 'base-input--focused': isFocused },
    ]"
  >
    <label v-if="label" :for="id" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required">*</span>
    </label>

    <div class="base-input__wrapper">
      <span v-if="$slots.prefix" class="base-input__prefix">
        <slot name="prefix"></slot>
      </span>

      <input
        :id="id"
        ref="inputRef"
        v-bind="$attrs"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        class="base-input__field"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />

      <span
        v-if="clearable && modelValue && !disabled && !readonly"
        class="base-input__clear"
        @click="onClear"
      >
        <svg
          width="16"
          height="16"
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
      </span>

      <span v-if="$slots.suffix" class="base-input__suffix">
        <slot name="suffix"></slot>
      </span>
    </div>

    <div v-if="error" class="base-input__error">
      {{ error }}
    </div>

    <div v-else-if="hint" class="base-input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";

export default defineComponent({
  name: "BaseInput",

  inheritAttrs: false,

  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    id: {
      type: String,
      default: () => `input-${Math.random().toString(36).substring(2, 9)}`,
    },
    label: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "text",
    },
    placeholder: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    required: {
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
    clearable: {
      type: Boolean,
      default: false,
    },
    autocomplete: {
      type: String,
      default: "off",
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["update:modelValue", "focus", "blur", "clear"],

  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    const isFocused = ref(false);

    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      emit("update:modelValue", target.value);
    };

    const onFocus = (event: FocusEvent) => {
      isFocused.value = true;
      emit("focus", event);
    };

    const onBlur = (event: FocusEvent) => {
      isFocused.value = false;
      emit("blur", event);
    };

    const onClear = () => {
      emit("update:modelValue", "");
      emit("clear");
      // Focus the input after clearing
      inputRef.value?.focus();
    };

    onMounted(() => {
      if (props.autofocus && inputRef.value) {
        inputRef.value.focus();
      }
    });

    return {
      inputRef,
      isFocused,
      onInput,
      onFocus,
      onBlur,
      onClear,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-input {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-family: inherit;

  &__label {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-gray-700);
  }

  &__required {
    color: var(--color-error-500);
    margin-left: 0.125rem;
  }

  &__wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--color-gray-300);
    background-color: var(--color-white);
    transition: all 0.2s ease;

    &:hover:not(.base-input--disabled .base-input__wrapper) {
      border-color: var(--color-gray-400);
    }
  }

  &__field {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.9375rem;
    color: var(--color-gray-900);
    font-family: inherit;

    &::placeholder {
      color: var(--color-gray-400);
    }
  }

  &__prefix,
  &__suffix {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    color: var(--color-gray-500);
  }

  &__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    color: var(--color-gray-400);
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-gray-600);
    }
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
    .base-input__label {
      font-size: 0.8125rem;
    }

    .base-input__field {
      padding: 0.375rem 0.625rem;
      font-size: 0.875rem;
    }
  }

  &--large {
    .base-input__label {
      font-size: 0.9375rem;
    }

    .base-input__field {
      padding: 0.75rem 0.875rem;
      font-size: 1rem;
    }
  }

  // States
  &--focused .base-input__wrapper {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 2px var(--color-primary-100);
  }

  &--error .base-input__wrapper {
    border-color: var(--color-error-500);
  }

  &--error.base-input--focused .base-input__wrapper {
    box-shadow: 0 0 0 2px var(--color-error-100);
  }

  &--disabled {
    opacity: 0.7;
    cursor: not-allowed;

    .base-input__wrapper {
      background-color: var(--color-gray-100);
      border-color: var(--color-gray-300);
    }

    .base-input__field {
      cursor: not-allowed;
    }
  }

  &--readonly .base-input__wrapper {
    background-color: var(--color-gray-50);
  }
}
</style>
