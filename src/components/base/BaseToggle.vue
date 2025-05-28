<template>
  <div class="base-toggle" :class="{ 'base-toggle--disabled': disabled }">
    <label class="base-toggle__container">
      <input
        :checked="modelValue"
        type="checkbox"
        class="base-toggle__input"
        :disabled="disabled"
        @change="onChange"
      />
      <span class="base-toggle__switch"></span>
      <span v-if="label" class="base-toggle__label">{{ label }}</span>
    </label>
    <div v-if="error" class="base-toggle__error">{{ error }}</div>
    <div v-else-if="hint" class="base-toggle__hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

interface Props {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  error: undefined,
  hint: undefined,
});

const emit = defineEmits(["update:modelValue", "change"]);

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.checked);
  emit("change", target.checked);
};
</script>

<style scoped>
.base-toggle {
  margin-bottom: 1rem;
}

.base-toggle__container {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.base-toggle__input {
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
  cursor: pointer;
}

.base-toggle__switch {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  background-color: var(--nscale-light, #f1f5f9);
  border: 1px solid var(--nscale-border, #e5e7eb);
  border-radius: 34px;
  transition: all 0.15s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.base-toggle__switch:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.base-toggle__input:checked + .base-toggle__switch {
  background-color: var(--nscale-primary, #00a550);
  border-color: var(--nscale-primary, #00a550);
}

.base-toggle__input:checked + .base-toggle__switch:before {
  transform: translateX(18px);
}

.base-toggle__input:focus + .base-toggle__switch {
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.15);
}

.base-toggle__input:disabled + .base-toggle__switch {
  opacity: 0.65;
  cursor: not-allowed;
  background-color: var(--nscale-input-disabled, #e9ecef);
}

.base-toggle__label {
  margin-left: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--nscale-text, #333333);
}

.base-toggle__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #ef4444);
}

.base-toggle__hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6b7280);
}

.base-toggle--disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.base-toggle--disabled .base-toggle__container {
  cursor: not-allowed;
}

.base-toggle--disabled .base-toggle__label {
  color: var(--nscale-text-secondary, #6b7280);
}
</style>
