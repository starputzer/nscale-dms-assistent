<template>
  <div class="base-select" :class="{ 'base-select--disabled': disabled }">
    <div v-if="label" class="base-select__label">
      {{ label }}
      <span v-if="required" class="base-select__required">*</span>
    </div>
    <div
      class="base-select__container"
      :class="{ 'base-select__container--focus': focused }"
    >
      <i
        v-if="prependIcon"
        :class="['base-select__icon base-select__icon--prepend', prependIcon]"
      ></i>
      <select
        :value="modelValue"
        class="base-select__field"
        :disabled="disabled"
        :required="required"
        @change="onChange"
        @focus="focused = true"
        @blur="focused = false"
      >
        <option v-if="placeholder" value="" disabled selected>
          {{ placeholder }}
        </option>
        <option
          v-for="option in options"
          :key="getOptionValue(option)"
          :value="getOptionValue(option)"
          :disabled="getOptionDisabled(option)"
        >
          {{ getOptionLabel(option) }}
        </option>
      </select>
      <i class="base-select__arrow fas fa-chevron-down"></i>
    </div>
    <div v-if="error" class="base-select__error">{{ error }}</div>
    <div v-else-if="hint" class="base-select__hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from "vue";

type Option = string | number | boolean | { [key: string]: any };

interface Props {
  modelValue: string | number | boolean | null | undefined;
  options: Option[];
  label?: string;
  placeholder?: string;
  valueKey?: string;
  labelKey?: string;
  disabledKey?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  prependIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  label: undefined,
  placeholder: undefined,
  valueKey: "value",
  labelKey: "label",
  disabledKey: "disabled",
  disabled: false,
  required: false,
  error: undefined,
  hint: undefined,
  prependIcon: undefined,
});

const emit = defineEmits(["update:modelValue"]);

const focused = ref(false);

const getOptionValue = (option: Option): string | number | boolean => {
  if (typeof option === "object" && option !== null) {
    return option[props.valueKey];
  }
  return option;
};

const getOptionLabel = (option: Option): string => {
  if (typeof option === "object" && option !== null) {
    return option[props.labelKey];
  }
  return String(option);
};

const getOptionDisabled = (option: Option): boolean => {
  if (
    typeof option === "object" &&
    option !== null &&
    props.disabledKey in option
  ) {
    return Boolean(option[props.disabledKey]);
  }
  return false;
};

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  let value = target.value;

  // Convert to appropriate type based on the selected option's value
  const selectedOption = props.options.find(
    (opt) => String(getOptionValue(opt)) === value,
  );

  if (selectedOption) {
    const optionValue = getOptionValue(selectedOption);
    if (typeof optionValue === "number") {
      value = Number(value);
    } else if (typeof optionValue === "boolean") {
      value = value === "true";
    }
  }

  emit("update:modelValue", value);
};
</script>

<style scoped>
.base-select {
  margin-bottom: 1rem;
  width: 100%;
}

.base-select__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-select__required {
  color: var(--nscale-danger, #dc3545);
  margin-left: 2px;
}

.base-select__container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.base-select__container--focus {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-select__field {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border: none;
  font-size: 14px;
  background: transparent;
  appearance: none;
  outline: none;
  cursor: pointer;
}

.base-select__field:disabled {
  background-color: var(--nscale-input-disabled, #e9ecef);
  cursor: not-allowed;
}

.base-select__icon {
  padding: 0 0.75rem;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-select__icon--prepend {
  border-right: 1px solid var(--nscale-border, #ced4da);
}

.base-select__arrow {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--nscale-text-secondary, #6c757d);
  pointer-events: none;
  font-size: 12px;
}

.base-select__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #dc3545);
}

.base-select__hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-select--disabled .base-select__label,
.base-select--disabled .base-select__container {
  opacity: 0.75;
  cursor: not-allowed;
}

.base-select--disabled .base-select__container {
  background-color: var(--nscale-input-disabled, #e9ecef);
}
</style>
