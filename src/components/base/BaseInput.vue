<template>
  <div class="base-input" :class="{ 'base-input--disabled': disabled }">
    <div v-if="label" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required">*</span>
    </div>
    <div
      class="base-input__container"
      :class="{ 'base-input__container--focus': focused }"
    >
      <i
        v-if="prependIcon"
        :class="['base-input__icon base-input__icon--prepend', prependIcon]"
      ></i>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :readonly="readonly"
        class="base-input__field"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <i
        v-if="appendIcon"
        :class="['base-input__icon base-input__icon--append', appendIcon]"
      ></i>
    </div>
    <div v-if="error" class="base-input__error">{{ error }}</div>
    <div v-else-if="hint" class="base-input__hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from "vue";

interface Props {
  modelValue: string | number;
  label?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  prependIcon?: string;
  appendIcon?: string;
  min?: number;
  max?: number;
  step?: number | string;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  label: undefined,
  placeholder: "",
  type: "text",
  disabled: false,
  required: false,
  error: undefined,
  hint: undefined,
  prependIcon: undefined,
  appendIcon: undefined,
  min: undefined,
  max: undefined,
  step: undefined,
  readonly: false,
});

const emit = defineEmits(["update:modelValue"]);

const focused = ref(false);

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  let value;
  if (props.type === "number") {
    value = target.value === "" ? "" : Number(target.value);
  } else {
    value = target.value;
  }

  emit("update:modelValue", value);
};
</script>

<style scoped>
.base-input {
  margin-bottom: 1rem;
  width: 100%;
}

.base-input__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-input__required {
  color: var(--nscale-danger, #dc3545);
  margin-left: 2px;
}

.base-input__container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.base-input__container--focus {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-input__field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  font-size: 14px;
  background: transparent;
  outline: none;
}

.base-input__field:disabled {
  background-color: var(--nscale-input-disabled, #e9ecef);
  cursor: not-allowed;
}

.base-input__icon {
  padding: 0 0.75rem;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-input__icon--prepend {
  border-right: 1px solid var(--nscale-border, #ced4da);
}

.base-input__icon--append {
  border-left: 1px solid var(--nscale-border, #ced4da);
}

.base-input__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #dc3545);
}

.base-input__hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-input--disabled .base-input__label,
.base-input--disabled .base-input__container {
  opacity: 0.75;
  cursor: not-allowed;
}

.base-input--disabled .base-input__container {
  background-color: var(--nscale-input-disabled, #e9ecef);
}
</style>
