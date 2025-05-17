<template>
  <div
    class="n-input-wrapper"
    :class="{
      'n-input-wrapper--disabled': disabled,
      'n-input-wrapper--error': !!error,
      'n-input-wrapper--focused': isFocused,
    }"
  >
    <label
      v-if="label"
      :for="inputId"
      class="n-input-label"
      :class="{ 'n-input-label--required': required }"
    >
      {{ label }}
    </label>

    <div class="n-input-container">
      <div class="n-input-field-wrapper">
        <div v-if="prefixIcon || $slots.prefix" class="n-input-prefix">
          <component v-if="prefixIcon" :is="prefixIcon" />
          <slot v-else name="prefix"></slot>
        </div>

        <input
          :id="inputId"
          ref="inputRef"
          :type="showPassword ? 'text' : type"
          class="n-input-field"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :required="required"
          :maxlength="maxlength"
          :min="min"
          :max="max"
          :step="step"
          :autocomplete="autocomplete"
          :aria-invalid="!!error"
          :aria-describedby="ariaDescribedby"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />

        <div
          v-if="suffixIcon || $slots.suffix || isPasswordToggle"
          class="n-input-suffix"
        >
          <button
            v-if="isPasswordToggle"
            type="button"
            class="n-input-password-toggle"
            tabindex="-1"
            aria-label="Toggle password visibility"
            @click.prevent="togglePasswordVisibility"
          >
            <svg
              v-if="showPassword"
              class="n-input-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
              />
            </svg>
            <svg
              v-else
              class="n-input-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
              />
            </svg>
          </button>
          <component v-else-if="suffixIcon" :is="suffixIcon" />
          <slot v-else name="suffix"></slot>
        </div>
      </div>

      <div
        v-if="helperText || error || $slots.helper"
        class="n-input-helper-text"
        :id="helperId"
      >
        <slot name="helper">
          <span v-if="error" class="n-input-error-text">{{ error }}</span>
          <span v-else-if="helperText">{{ helperText }}</span>
        </slot>
      </div>

      <div
        v-if="maxlength && showCharacterCount"
        class="n-input-character-count"
      >
        {{ characterCount }} / {{ maxlength }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { uniqueId } from "lodash";

/**
 * Input component that supports various types, states, and decorations
 * @displayName Input
 * @example
 * <Input v-model="text" label="Username" placeholder="Enter your username" />
 */
export interface InputProps {
  /** Value for v-model binding */
  modelValue: string | number;
  /** Input type (text, password, number, email, etc) */
  type?: string;
  /** Input label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Prefix icon component */
  prefixIcon?: any;
  /** Suffix icon component */
  suffixIcon?: any;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Maximum length of input (for text input) */
  maxlength?: number;
  /** Minimum value (for number input) */
  min?: number | string;
  /** Maximum value (for number input) */
  max?: number | string;
  /** Step value (for number input) */
  step?: number | string;
  /** Custom autocomplete attribute */
  autocomplete?: string;
  /** Whether to display character count (requires maxlength) */
  showCharacterCount?: boolean;
  /** Autofocus the input on mount */
  autofocus?: boolean;
  /** Unique ID for the input (auto-generated if not provided) */
  id?: string;
}

const props = withDefaults(defineProps<InputProps>(), {
  type: "text",
  placeholder: "",
  disabled: false,
  required: false,
  autocomplete: "off",
  showCharacterCount: false,
  autofocus: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
  (e: "focus", event: FocusEvent): void;
  (e: "blur", event: FocusEvent): void;
  (e: "input", event: Event): void;
  (e: "keydown", event: KeyboardEvent): void;
}>();

// Internal state
const inputId = computed(() => props.id || uniqueId("n-input-"));
const helperId = computed(() => `${inputId.value}-helper`);
const ariaDescribedby = computed(() =>
  props.helperText || props.error ? helperId.value : undefined,
);
const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);
const showPassword = ref(false);

// Calculate character count for text inputs
const characterCount = computed(() => {
  if (typeof props.modelValue === "string") {
    return props.modelValue.length;
  }
  return String(props.modelValue || "").length;
});

// Determine if this is a password input that can toggle visibility
const isPasswordToggle = computed(() => props.type === "password");

// Event handlers
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  let value: string | number = target.value;

  // Convert to number for number inputs
  if (props.type === "number" && value !== "") {
    value = Number(value);
  }

  emit("update:modelValue", value);
  emit("input", event);
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true;
  emit("focus", event);
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false;
  emit("blur", event);
}

function handleKeydown(event: KeyboardEvent) {
  emit("keydown", event);
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

// Focus the input if autofocus is enabled
onMounted(() => {
  if (props.autofocus) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});
</script>

<style scoped>
.n-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1rem;
  font-family: var(
    --n-font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
}

.n-input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: 500;
  color: var(--n-color-gray-700, #4a5568);
}

.n-input-label--required::after {
  content: "*";
  color: var(--n-color-danger, #e53e3e);
  margin-left: 0.25rem;
}

.n-input-container {
  position: relative;
}

.n-input-field-wrapper {
  display: flex;
  position: relative;
  background-color: var(--n-color-white, #ffffff);
  border: 1px solid var(--n-color-gray-300, #e2e8f0);
  border-radius: var(--n-border-radius, 4px);
  transition: all 0.2s ease;
  color: var(--n-color-gray-800, #2d3748);
}

/* Focus state */
.n-input-wrapper--focused .n-input-field-wrapper {
  border-color: var(--n-color-primary, #0066cc);
  box-shadow: 0 0 0 3px
    var(--n-color-primary-transparent, rgba(0, 102, 204, 0.2));
}

/* Error state */
.n-input-wrapper--error .n-input-field-wrapper {
  border-color: var(--n-color-danger, #e53e3e);
}

.n-input-wrapper--error.n-input-wrapper--focused .n-input-field-wrapper {
  box-shadow: 0 0 0 3px
    var(--n-color-danger-transparent, rgba(229, 62, 62, 0.2));
}

/* Disabled state */
.n-input-wrapper--disabled .n-input-field-wrapper {
  background-color: var(--n-color-gray-100, #f5f5f5);
  border-color: var(--n-color-gray-300, #e2e8f0);
  color: var(--n-color-gray-500, #a0aec0);
  cursor: not-allowed;
}

.n-input-field {
  flex: 1;
  width: 100%;
  height: 2.5rem;
  padding: 0 0.75rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--n-font-size-md, 1rem);
  color: inherit;
}

.n-input-field::placeholder {
  color: var(--n-color-gray-400, #cbd5e0);
}

.n-input-field:disabled {
  cursor: not-allowed;
}

/* Prefix and suffix */
.n-input-prefix,
.n-input-suffix {
  display: flex;
  align-items: center;
  color: var(--n-color-gray-500, #a0aec0);
  padding: 0 0.5rem;
}

.n-input-wrapper--disabled .n-input-prefix,
.n-input-wrapper--disabled .n-input-suffix {
  color: var(--n-color-gray-400, #cbd5e0);
}

/* Password toggle button */
.n-input-password-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--n-color-gray-500, #a0aec0);
  cursor: pointer;
  transition: color 0.2s ease;
}

.n-input-password-toggle:hover {
  color: var(--n-color-gray-700, #4a5568);
}

.n-input-wrapper--disabled .n-input-password-toggle {
  cursor: not-allowed;
  color: var(--n-color-gray-400, #cbd5e0);
}

.n-input-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

/* Helper text and error message */
.n-input-helper-text {
  font-size: var(--n-font-size-xs, 0.75rem);
  margin-top: 0.375rem;
  color: var(--n-color-gray-500, #a0aec0);
}

.n-input-error-text {
  color: var(--n-color-danger, #e53e3e);
}

/* Character count */
.n-input-character-count {
  position: absolute;
  right: 0;
  font-size: var(--n-font-size-xs, 0.75rem);
  margin-top: 0.375rem;
  color: var(--n-color-gray-500, #a0aec0);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-input-label {
    color: var(--n-color-gray-300, #e2e8f0);
  }

  .n-input-field-wrapper {
    background-color: var(--n-color-gray-800, #2d3748);
    border-color: var(--n-color-gray-600, #718096);
    color: var(--n-color-gray-200, #e2e8f0);
  }

  .n-input-field::placeholder {
    color: var(--n-color-gray-500, #a0aec0);
  }

  .n-input-wrapper--disabled .n-input-field-wrapper {
    background-color: var(--n-color-gray-700, #4a5568);
    border-color: var(--n-color-gray-600, #718096);
    color: var(--n-color-gray-500, #a0aec0);
  }

  .n-input-password-toggle:hover {
    color: var(--n-color-gray-300, #e2e8f0);
  }
}
</style>
