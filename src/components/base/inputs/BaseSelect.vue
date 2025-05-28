<template>
  <div
    :class="[
      'base-select',
      `base-select--${size}`,
      { 'base-select--error': error },
      { 'base-select--disabled': disabled },
      { 'base-select--open': isOpen },
    ]"
    v-click-outside="close"
  >
    <label v-if="label" :for="id" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required">*</span>
    </label>

    <div ref="selectRef" class="base-select__wrapper" @click="toggleDropdown">
      <div class="base-select__display">
        <span v-if="selectedLabel" class="base-select__value">
          {{ selectedLabel }}
        </span>
        <span v-else class="base-select__placeholder">
          {{ placeholder }}
        </span>
      </div>

      <span class="base-select__arrow">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          :class="{ 'base-select__arrow--open': isOpen }"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </div>

    <transition name="fade">
      <div v-if="isOpen" class="base-select__dropdown">
        <div class="base-select__options">
          <div
            v-for="option in options"
            :key="option.value"
            :class="[
              'base-select__option',
              { 'base-select__option--selected': isSelected(option.value) },
            ]"
            @click="select(option.value)"
          >
            {{ option.label }}
          </div>

          <div v-if="!options.length" class="base-select__empty">
            {{ emptyText }}
          </div>
        </div>
      </div>
    </transition>

    <div v-if="error" class="base-select__error">
      {{ error }}
    </div>

    <div v-else-if="hint" class="base-select__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  PropType,
} from "vue";

export interface SelectOption {
  label: string;
  value: string | number;
}

export default defineComponent({
  name: "BaseSelect",

  directives: {
    "click-outside": {
      beforeMount(el, binding) {
        el.clickOutsideEvent = (event: MouseEvent) => {
          if (!(el === event.target || el.contains(event.target as Node))) {
            binding.value(event);
          }
        };
        document.addEventListener("click", el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener("click", el.clickOutsideEvent);
      },
    },
  },

  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    options: {
      type: Array as PropType<SelectOption[]>,
      default: () => [],
    },
    id: {
      type: String,
      default: () => `select-${Math.random().toString(36).substring(2, 9)}`,
    },
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "Select an option",
    },
    disabled: {
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
    emptyText: {
      type: String,
      default: "No options available",
    },
  },

  emits: ["update:modelValue", "change"],

  setup(props, { emit }) {
    const selectRef = ref<HTMLElement | null>(null);
    const isOpen = ref(false);

    const selectedLabel = computed(() => {
      const selected = props.options.find(
        (option) => option.value === props.modelValue,
      );
      return selected ? selected.label : "";
    });

    const isSelected = (value: string | number) => {
      return props.modelValue === value;
    };

    const toggleDropdown = () => {
      if (props.disabled) return;
      isOpen.value = !isOpen.value;
    };

    const close = () => {
      isOpen.value = false;
    };

    const select = (value: string | number) => {
      emit("update:modelValue", value);
      emit("change", value);
      close();
    };

    // Close dropdown when pressing Escape
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    onMounted(() => {
      document.addEventListener("keydown", handleKeydown);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("keydown", handleKeydown);
    });

    return {
      selectRef,
      isOpen,
      selectedLabel,
      isSelected,
      toggleDropdown,
      close,
      select,
    };
  },
});
</script>

<style lang="scss" scoped>
.base-select {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--color-gray-300);
    background-color: var(--color-white);
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(.base-select--disabled .base-select__wrapper) {
      border-color: var(--color-gray-400);
    }
  }

  &__display {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__value {
    font-size: 0.9375rem;
    color: var(--color-gray-900);
  }

  &__placeholder {
    font-size: 0.9375rem;
    color: var(--color-gray-400);
  }

  &__arrow {
    margin-left: 0.5rem;
    color: var(--color-gray-500);

    svg {
      transition: transform 0.2s ease;
    }

    &--open svg {
      transform: rotate(180deg);
    }
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    width: 100%;
    max-height: 15rem;
    overflow-y: auto;
    background-color: var(--color-white);
    border-radius: 0.375rem;
    border: 1px solid var(--color-gray-300);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  &__options {
    padding: 0.25rem 0;
  }

  &__option {
    padding: 0.625rem 0.75rem;
    font-size: 0.9375rem;
    color: var(--color-gray-800);
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--color-gray-100);
    }

    &--selected {
      background-color: var(--color-primary-50);
      color: var(--color-primary-700);
      font-weight: 500;

      &:hover {
        background-color: var(--color-primary-100);
      }
    }
  }

  &__empty {
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: var(--color-gray-500);
    text-align: center;
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
    .base-select__label {
      font-size: 0.8125rem;
    }

    .base-select__wrapper {
      padding: 0.375rem 0.625rem;
    }

    .base-select__value,
    .base-select__placeholder {
      font-size: 0.875rem;
    }

    .base-select__option {
      padding: 0.5rem 0.625rem;
      font-size: 0.875rem;
    }
  }

  &--large {
    .base-select__label {
      font-size: 0.9375rem;
    }

    .base-select__wrapper {
      padding: 0.75rem 0.875rem;
    }

    .base-select__value,
    .base-select__placeholder {
      font-size: 1rem;
    }

    .base-select__option {
      padding: 0.75rem 0.875rem;
      font-size: 1rem;
    }
  }

  // States
  &--open .base-select__wrapper {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 2px var(--color-primary-100);
  }

  &--error .base-select__wrapper {
    border-color: var(--color-error-500);
  }

  &--error.base-select--open .base-select__wrapper {
    box-shadow: 0 0 0 2px var(--color-error-100);
  }

  &--disabled {
    opacity: 0.7;
    cursor: not-allowed;

    .base-select__wrapper {
      background-color: var(--color-gray-100);
      border-color: var(--color-gray-300);
      cursor: not-allowed;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
