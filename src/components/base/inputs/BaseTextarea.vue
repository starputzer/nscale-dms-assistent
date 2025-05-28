<template>
  <div
    :class="[
      'base-textarea',
      `base-textarea--${size}`,
      { 'base-textarea--error': error },
      { 'base-textarea--disabled': disabled },
      { 'base-textarea--readonly': readonly },
      { 'base-textarea--focused': isFocused },
      { 'base-textarea--resizable': resizable },
    ]"
  >
    <label v-if="label" :for="id" class="base-textarea__label">
      {{ label }}
      <span v-if="required" class="base-textarea__required">*</span>
    </label>

    <div class="base-textarea__wrapper">
      <textarea
        :id="id"
        ref="textareaRef"
        v-bind="$attrs"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :rows="rows"
        :maxlength="maxlength"
        class="base-textarea__field"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      ></textarea>

      <div v-if="showCounter && maxlength" class="base-textarea__counter">
        {{ charCount }} / {{ maxlength }}
      </div>
    </div>

    <div v-if="error" class="base-textarea__error">
      {{ error }}
    </div>

    <div v-else-if="hint" class="base-textarea__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";

export default defineComponent({
  name: "BaseTextarea",

  inheritAttrs: false,

  props: {
    modelValue: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: () => `textarea-${Math.random().toString(36).substring(2, 9)}`,
    },
    label: {
      type: String,
      default: "",
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
    rows: {
      type: Number,
      default: 4,
    },
    maxlength: {
      type: Number,
      default: null,
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
    showCounter: {
      type: Boolean,
      default: false,
    },
    resizable: {
      type: Boolean,
      default: true,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["update:modelValue", "focus", "blur", "input"],

  setup(props, { emit }) {
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const isFocused = ref(false);

    const charCount = computed(() => {
      return props.modelValue ? props.modelValue.length : 0;
    });

    const onInput = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;
      emit("update:modelValue", target.value);
      emit("input", event);
    };

    const onFocus = (event: FocusEvent) => {
      isFocused.value = true;
      emit("focus", event);
    };

    const onBlur = (event: FocusEvent) => {
      isFocused.value = false;
      emit("blur", event);
    };

    onMounted(() => {
      if (props.autofocus && textareaRef.value) {
        textareaRef.value.focus();
      }
    });

    return {
      textareaRef,
      isFocused,
      charCount,
      onInput,
      onFocus,
      onBlur,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-textarea {
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
    flex-direction: column;
    width: 100%;
  }

  &__field {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-gray-300);
    background-color: var(--color-white);
    font-size: 0.9375rem;
    color: var(--color-gray-900);
    font-family: inherit;
    transition: all 0.2s ease;
    resize: vertical;

    &::placeholder {
      color: var(--color-gray-400);
    }

    &:hover:not(:disabled):not(:read-only) {
      border-color: var(--color-gray-400);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary-500);
      box-shadow: 0 0 0 2px var(--color-primary-100);
    }
  }

  &__counter {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-gray-500);
    background-color: var(--color-white);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    pointer-events: none;
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
    .base-textarea__label {
      font-size: 0.8125rem;
    }

    .base-textarea__field {
      padding: 0.375rem 0.625rem;
      font-size: 0.875rem;
    }
  }

  &--large {
    .base-textarea__label {
      font-size: 0.9375rem;
    }

    .base-textarea__field {
      padding: 0.75rem 0.875rem;
      font-size: 1rem;
    }
  }

  // States
  &--focused .base-textarea__field {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 2px var(--color-primary-100);
  }

  &--error .base-textarea__field {
    border-color: var(--color-error-500);
  }

  &--error.base-textarea--focused .base-textarea__field {
    box-shadow: 0 0 0 2px var(--color-error-100);
  }

  &--disabled {
    opacity: 0.7;

    .base-textarea__field {
      background-color: var(--color-gray-100);
      border-color: var(--color-gray-300);
      cursor: not-allowed;
    }
  }

  &--readonly .base-textarea__field {
    background-color: var(--color-gray-50);
    cursor: default;
  }

  &--resizable .base-textarea__field {
    resize: vertical;
  }

  &:not(.base-textarea--resizable) .base-textarea__field {
    resize: none;
  }
}
</style>
