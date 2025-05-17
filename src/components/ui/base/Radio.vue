<template>
  <div
    class="n-radio-wrapper"
    :class="{
      'n-radio-wrapper--disabled': disabled,
      'n-radio-wrapper--error': !!error,
      'n-radio-wrapper--checked': isChecked,
    }"
  >
    <label class="n-radio-label">
      <input
        type="radio"
        class="n-radio-input"
        :value="value"
        :checked="isChecked"
        :name="name"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="helperId"
        @change="updateValue"
      />
      <span class="n-radio-circle">
        <span v-if="isChecked" class="n-radio-dot"></span>
      </span>
      <span v-if="$slots.default" class="n-radio-text">
        <slot></slot>
      </span>
    </label>

    <div v-if="error || helperText" class="n-radio-helper" :id="helperId">
      <span v-if="error" class="n-radio-error">{{ error }}</span>
      <span v-else-if="helperText" class="n-radio-helper-text">{{
        helperText
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { uniqueId } from "lodash";

/**
 * Radio button component for option selection within a group
 * @displayName Radio
 * @example
 * <Radio v-model="selectedOption" value="option1">Option 1</Radio>
 * <Radio v-model="selectedOption" value="option2">Option 2</Radio>
 */
export interface RadioProps {
  /** Value for v-model binding */
  modelValue: any;
  /** The value associated with this radio option */
  value: any;
  /** Helper text displayed below the radio */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Whether the radio is disabled */
  disabled?: boolean;
  /** Whether the radio is required */
  required?: boolean;
  /** Unique ID for the radio (auto-generated if not provided) */
  id?: string;
  /** Name of the radio group for form submission */
  name?: string;
}

const props = withDefaults(defineProps<RadioProps>(), {
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: any): void;
  (e: "change", event: Event): void;
}>();

const radioId = computed(() => props.id || uniqueId("n-radio-"));
const helperId = computed(() => `${radioId.value}-helper`);
const isChecked = computed(() => props.modelValue === props.value);

// Handle radio value changes
function updateValue(event: Event) {
  if (props.disabled) return;
  emit("update:modelValue", props.value);
  emit("change", event);
}
</script>

<style scoped>
.n-radio-wrapper {
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

.n-radio-label {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
  user-select: none;
  position: relative;
  line-height: 1.5;
}

.n-radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
}

.n-radio-circle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--nscale-gray-400, #9ca3af);
  border-radius: 50%;
  background-color: var(--nscale-white, #ffffff);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.n-radio-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--nscale-primary, #00a550);
  transition: all 0.2s ease;
}

.n-radio-input:checked + .n-radio-circle {
  border-color: var(--nscale-primary, #00a550);
}

.n-radio-input:focus-visible + .n-radio-circle {
  outline: 2px solid var(--nscale-primary-light, #e0f5ea);
  outline-offset: 2px;
}

.n-radio-wrapper--checked .n-radio-circle {
  border-color: var(--nscale-primary, #00a550);
}

.n-radio-wrapper--disabled .n-radio-label {
  cursor: not-allowed;
  color: var(--nscale-gray-400, #9ca3af);
}

.n-radio-wrapper--disabled .n-radio-circle {
  background-color: var(--nscale-gray-100, #f0f2f5);
  border-color: var(--nscale-gray-300, #d1d5db);
}

.n-radio-wrapper--disabled.n-radio-wrapper--checked .n-radio-dot {
  background-color: var(--nscale-gray-400, #9ca3af);
}

.n-radio-wrapper--error .n-radio-circle {
  border-color: var(--nscale-error, #dc2626);
}

.n-radio-wrapper--error.n-radio-wrapper--checked .n-radio-dot {
  background-color: var(--nscale-error, #dc2626);
}

.n-radio-text {
  margin-left: 0.5rem;
  font-size: var(--nscale-font-size-base, 1rem);
  color: var(--nscale-gray-800, #1f2937);
}

.n-radio-helper {
  margin-left: 1.75rem;
  margin-top: 0.25rem;
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-radio-error {
  color: var(--nscale-error, #dc2626);
}

.n-radio-helper-text {
  color: var(--nscale-gray-500, #6b7280);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-radio-circle {
    background-color: var(--nscale-gray-800, #1f2937);
    border-color: var(--nscale-gray-600, #4b5563);
  }

  .n-radio-text {
    color: var(--nscale-gray-200, #e2e8f0);
  }

  .n-radio-wrapper--disabled .n-radio-circle {
    background-color: var(--nscale-gray-700, #374151);
    border-color: var(--nscale-gray-600, #4b5563);
  }

  .n-radio-wrapper--disabled .n-radio-text {
    color: var(--nscale-gray-500, #6b7280);
  }
}
</style>
