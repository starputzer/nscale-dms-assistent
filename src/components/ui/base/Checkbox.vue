<template>
  <div
    class="n-checkbox-wrapper"
    :class="{
      'n-checkbox-wrapper--disabled': disabled,
      'n-checkbox-wrapper--error': !!error,
      'n-checkbox-wrapper--checked': modelValue,
    }"
  >
    <label class="n-checkbox-label">
      <input
        type="checkbox"
        class="n-checkbox-input"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="helperId"
        @change="updateValue"
      />
      <span class="n-checkbox-box">
        <svg
          v-if="modelValue"
          class="n-checkbox-icon"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </span>
      <span v-if="$slots.default" class="n-checkbox-text">
        <slot></slot>
      </span>
    </label>

    <div v-if="error || helperText" class="n-checkbox-helper" :id="helperId">
      <span v-if="error" class="n-checkbox-error">{{ error }}</span>
      <span v-else-if="helperText" class="n-checkbox-helper-text">{{
        helperText
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { uniqueId } from "lodash";

/**
 * Checkbox component for boolean input selection
 * @displayName Checkbox
 * @example
 * <Checkbox v-model="isChecked">Accept terms and conditions</Checkbox>
 */
export interface CheckboxProps {
  /** Value for v-model binding */
  modelValue: boolean;
  /** Helper text displayed below the checkbox */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Unique ID for the checkbox (auto-generated if not provided) */
  id?: string;
  /** Name of the checkbox for form submission */
  name?: string;
  /** Value attribute of the checkbox */
  value?: string;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  disabled: false,
  required: false,
  indeterminate: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", event: Event): void;
}>();

const checkboxId = computed(() => props.id || uniqueId("n-checkbox-"));
const helperId = computed(() => `${checkboxId.value}-helper`);

// Handle checkbox value changes
function updateValue(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.checked);
  emit("change", event);
}
</script>

<style scoped>
.n-checkbox-wrapper {
  display: inline-flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
  font-family: var(
    --nscale-font-family-base,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  position: relative;
}

.n-checkbox-label {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
  user-select: none;
  position: relative;
  line-height: 1.5;
}

.n-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
}

.n-checkbox-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--nscale-gray-400, #9ca3af);
  border-radius: 3px;
  background-color: var(--nscale-white, #ffffff);
  transition: all 0.2s ease;
  color: var(--nscale-white, #ffffff);
  flex-shrink: 0;
}

.n-checkbox-input:checked + .n-checkbox-box {
  background-color: var(--nscale-primary, #00a550);
  border-color: var(--nscale-primary, #00a550);
}

.n-checkbox-input:focus-visible + .n-checkbox-box {
  outline: 2px solid var(--nscale-primary-light, #e0f5ea);
  outline-offset: 2px;
}

.n-checkbox-wrapper--checked .n-checkbox-box {
  background-color: var(--nscale-primary, #00a550);
  border-color: var(--nscale-primary, #00a550);
}

.n-checkbox-wrapper--disabled .n-checkbox-label {
  cursor: not-allowed;
  color: var(--nscale-gray-400, #9ca3af);
}

.n-checkbox-wrapper--disabled .n-checkbox-box {
  background-color: var(--nscale-gray-100, #f0f2f5);
  border-color: var(--nscale-gray-300, #d1d5db);
}

.n-checkbox-wrapper--disabled.n-checkbox-wrapper--checked .n-checkbox-box {
  background-color: var(--nscale-gray-300, #d1d5db);
  border-color: var(--nscale-gray-300, #d1d5db);
}

.n-checkbox-wrapper--error .n-checkbox-box {
  border-color: var(--nscale-error, #dc2626);
}

.n-checkbox-wrapper--error.n-checkbox-wrapper--checked .n-checkbox-box {
  background-color: var(--nscale-error, #dc2626);
  border-color: var(--nscale-error, #dc2626);
}

.n-checkbox-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.n-checkbox-text {
  margin-left: 0.5rem;
  font-size: var(--nscale-font-size-base, 1rem);
  color: var(--nscale-gray-800, #1f2937);
}

.n-checkbox-helper {
  margin-left: 1.75rem;
  margin-top: 0.25rem;
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-checkbox-error {
  color: var(--nscale-error, #dc2626);
}

.n-checkbox-helper-text {
  color: var(--nscale-gray-500, #6b7280);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-checkbox-box {
    background-color: var(--nscale-gray-800, #1f2937);
    border-color: var(--nscale-gray-600, #4b5563);
  }

  .n-checkbox-text {
    color: var(--nscale-gray-200, #e2e8f0);
  }

  .n-checkbox-wrapper--disabled .n-checkbox-box {
    background-color: var(--nscale-gray-700, #374151);
    border-color: var(--nscale-gray-600, #4b5563);
  }

  .n-checkbox-wrapper--disabled .n-checkbox-text {
    color: var(--nscale-gray-500, #6b7280);
  }
}
</style>
