<template>
  <div class="base-textarea" :class="{ 'base-textarea--disabled': disabled }">
    <div v-if="label" class="base-textarea__label">
      {{ label }}
      <span v-if="required" class="base-textarea__required">*</span>
    </div>
    <div
      class="base-textarea__container"
      :class="{ 'base-textarea__container--focus': focused }"
    >
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :rows="rows"
        :disabled="disabled"
        :required="required"
        :maxlength="maxlength"
        :readonly="readonly"
        class="base-textarea__field"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      ></textarea>
    </div>
    <div v-if="error" class="base-textarea__error">{{ error }}</div>
    <div v-else-if="hint" class="base-textarea__hint">{{ hint }}</div>
    <div v-if="maxlength" class="base-textarea__counter">
      {{ computedCharCount }} / {{ maxlength }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, computed } from "vue";

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  maxlength?: number;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  label: undefined,
  placeholder: "",
  rows: 3,
  disabled: false,
  required: false,
  error: undefined,
  hint: undefined,
  maxlength: undefined,
  readonly: false,
});

const emit = defineEmits(["update:modelValue"]);

const focused = ref(false);

const computedCharCount = computed(() => {
  return props.modelValue ? props.modelValue.length : 0;
});

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
};
</script>

<style scoped>
.base-textarea {
  margin-bottom: 1rem;
  width: 100%;
}

.base-textarea__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-textarea__required {
  color: var(--nscale-danger, #dc3545);
  margin-left: 2px;
}

.base-textarea__container {
  display: flex;
  position: relative;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.base-textarea__container--focus {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-textarea__field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  font-size: 14px;
  background: transparent;
  resize: vertical;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
}

.base-textarea__field:disabled {
  background-color: var(--nscale-input-disabled, #e9ecef);
  cursor: not-allowed;
}

.base-textarea__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #dc3545);
}

.base-textarea__hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-textarea__counter {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
  text-align: right;
}

.base-textarea--disabled .base-textarea__label,
.base-textarea--disabled .base-textarea__container {
  opacity: 0.75;
  cursor: not-allowed;
}

.base-textarea--disabled .base-textarea__container {
  background-color: var(--nscale-input-disabled, #e9ecef);
}
</style>
