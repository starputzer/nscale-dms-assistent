<template>
  <div class="base-switch" :class="{ 'base-switch--disabled': disabled }">
    <div v-if="label" class="base-switch__label">
      {{ label }}
    </div>
    <div class="base-switch__container">
      <template v-if="options && Array.isArray(options)">
        <!-- Button Group Mode -->
        <div class="base-switch__button-group">
          <button
            v-for="option in options"
            :key="getOptionValue(option)"
            class="base-switch__button"
            :class="{ 'base-switch__button--active': isActive(option) }"
            type="button"
            :disabled="disabled || getOptionDisabled(option)"
            @click="handleOptionClick(option)"
          >
            <i
              v-if="getOptionIcon(option)"
              :class="['base-switch__button-icon', getOptionIcon(option)]"
            ></i>
            {{ getOptionLabel(option) }}
          </button>
        </div>
      </template>
      <template v-else>
        <!-- Toggle Switch Mode -->
        <div
          class="base-switch__toggle"
          :class="{ 'base-switch__toggle--active': modelValue }"
          @click="toggleValue"
        >
          <div class="base-switch__toggle-indicator"></div>
        </div>
      </template>
    </div>
    <div v-if="error" class="base-switch__error">{{ error }}</div>
    <div v-else-if="hint" class="base-switch__hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

type Option = string | number | boolean | { [key: string]: any };

interface Props {
  modelValue: any;
  options?: Option[];
  label?: string;
  valueKey?: string;
  labelKey?: string;
  iconKey?: string;
  disabledKey?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  options: undefined,
  label: undefined,
  valueKey: "value",
  labelKey: "label",
  iconKey: "icon",
  disabledKey: "disabled",
  disabled: false,
  error: undefined,
  hint: undefined,
});

const emit = defineEmits(["update:modelValue"]);

const getOptionValue = (option: Option): any => {
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

const getOptionIcon = (option: Option): string | undefined => {
  if (
    typeof option === "object" &&
    option !== null &&
    props.iconKey in option
  ) {
    return option[props.iconKey];
  }
  return undefined;
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

const isActive = (option: Option): boolean => {
  return getOptionValue(option) === props.modelValue;
};

const handleOptionClick = (option: Option): void => {
  if (props.disabled || getOptionDisabled(option)) return;

  const value = getOptionValue(option);
  emit("update:modelValue", value);
};

const toggleValue = (): void => {
  if (props.disabled) return;

  emit("update:modelValue", !props.modelValue);
};
</script>

<style scoped>
.base-switch {
  margin-bottom: 1rem;
  width: 100%;
}

.base-switch__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-switch__container {
  display: flex;
  align-items: center;
}

/* Button Group Mode */
.base-switch__button-group {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
}

.base-switch__button {
  padding: 0.5rem 1rem;
  background-color: var(--nscale-light, #f8f9fa);
  border: 1px solid var(--nscale-border, #ced4da);
  color: var(--nscale-text-secondary, #6c757d);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.base-switch__button:not(:last-child) {
  border-right: none;
}

.base-switch__button:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.base-switch__button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.base-switch__button--active {
  background-color: var(--nscale-primary, #0078d4);
  border-color: var(--nscale-primary, #0078d4);
  color: white;
}

.base-switch__button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background-color: var(--nscale-input-disabled, #e9ecef);
}

.base-switch__button-icon {
  margin-right: 0.5rem;
}

/* Toggle Switch Mode */
.base-switch__toggle {
  position: relative;
  width: 38px;
  height: 20px;
  border-radius: 10px;
  background-color: var(--nscale-light, #f8f9fa);
  border: 1px solid var(--nscale-border, #ced4da);
  cursor: pointer;
  transition: all 0.2s ease;
}

.base-switch__toggle--active {
  background-color: var(--nscale-primary, #0078d4);
  border-color: var(--nscale-primary, #0078d4);
}

.base-switch__toggle-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: white;
  transition: transform 0.2s ease;
}

.base-switch__toggle--active .base-switch__toggle-indicator {
  transform: translateX(18px);
}

.base-switch__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #dc3545);
}

.base-switch__hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-switch--disabled .base-switch__label,
.base-switch--disabled .base-switch__toggle,
.base-switch--disabled .base-switch__button-group {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
