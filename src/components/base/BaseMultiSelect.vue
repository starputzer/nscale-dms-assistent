<template>
  <div
    class="base-multi-select"
    :class="{ 'base-multi-select--disabled': disabled }"
  >
    <div v-if="label" class="base-multi-select__label">
      {{ label }}
      <span v-if="required" class="base-multi-select__required">*</span>
    </div>
    <div
      class="base-multi-select__container"
      :class="{
        'base-multi-select__container--focus': isOpen,
        'base-multi-select__container--with-values': modelValue.length > 0,
      }"
      @click="toggleDropdown"
    >
      <div class="base-multi-select__selection">
        <div
          v-if="modelValue.length === 0 && placeholder"
          class="base-multi-select__placeholder"
        >
          {{ placeholder }}
        </div>
        <div v-else class="base-multi-select__tags">
          <div
            v-for="(value, index) in displayValues"
            :key="getValueKey(value)"
            class="base-multi-select__tag"
          >
            <span class="base-multi-select__tag-text">{{
              getLabel(value)
            }}</span>
            <button
              type="button"
              class="base-multi-select__tag-remove"
              @click.stop="removeValue(index)"
              aria-label="Remove item"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div
            v-if="modelValue.length > maxDisplayTags"
            class="base-multi-select__tag base-multi-select__tag--more"
          >
            +{{ modelValue.length - maxDisplayTags }}
          </div>
        </div>
      </div>
      <div class="base-multi-select__actions">
        <button
          v-if="modelValue.length > 0"
          type="button"
          class="base-multi-select__clear"
          @click.stop="clearValues"
          aria-label="Clear all"
        >
          <i class="fas fa-times-circle"></i>
        </button>
        <i
          class="base-multi-select__arrow fas"
          :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
        ></i>
      </div>
    </div>

    <Transition name="dropdown">
      <div v-if="isOpen" class="base-multi-select__dropdown">
        <div class="base-multi-select__search-container" v-if="searchable">
          <input
            ref="searchInput"
            type="text"
            class="base-multi-select__search"
            :placeholder="searchPlaceholder"
            v-model="searchQuery"
            @click.stop
            @keydown.esc="closeDropdown"
          />
        </div>

        <div
          v-if="allOptions.length === 0"
          class="base-multi-select__no-options"
        >
          {{ noOptionsText }}
        </div>

        <div v-else class="base-multi-select__options">
          <div
            v-for="option in filteredOptions"
            :key="getValueKey(option)"
            class="base-multi-select__option"
            :class="{
              'base-multi-select__option--selected': isSelected(option),
              'base-multi-select__option--disabled': isOptionDisabled(option),
            }"
            @click.stop="toggleOption(option)"
          >
            <div class="base-multi-select__checkbox">
              <input
                type="checkbox"
                :checked="isSelected(option)"
                :disabled="isOptionDisabled(option)"
                @click.stop
              />
              <span class="base-multi-select__checkbox-icon"></span>
            </div>
            <span class="base-multi-select__option-label">{{
              getLabel(option)
            }}</span>
          </div>
        </div>

        <div
          v-if="allowCreate && searchQuery && !hasExactMatch"
          class="base-multi-select__create"
        >
          <button
            type="button"
            class="base-multi-select__create-btn"
            @click.stop="createOption"
          >
            <i class="fas fa-plus"></i> {{ createText }} "{{ searchQuery }}"
          </button>
        </div>
      </div>
    </Transition>

    <div v-if="error" class="base-multi-select__error">{{ error }}</div>
    <div v-else-if="help" class="base-multi-select__help">{{ help }}</div>
  </div>
</template>

<script setup lang="ts">
import {
  defineProps,
  defineEmits,
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";

type Option = string | number | boolean | { [key: string]: any };

interface Props {
  modelValue: any[];
  options: Option[];
  label?: string;
  placeholder?: string;
  valueKey?: string;
  labelKey?: string;
  disabledKey?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  allowCreate?: boolean;
  createText?: string;
  noOptionsText?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  help?: string;
  maxDisplayTags?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  options: () => [],
  label: undefined,
  placeholder: "Bitte auswählen...",
  valueKey: "value",
  labelKey: "label",
  disabledKey: "disabled",
  searchable: true,
  searchPlaceholder: "Suchen...",
  allowCreate: false,
  createText: "Erstellen:",
  noOptionsText: "Keine Optionen verfügbar",
  disabled: false,
  required: false,
  error: undefined,
  help: undefined,
  maxDisplayTags: 3,
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const searchQuery = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

const displayValues = computed(() => {
  return props.modelValue.slice(0, props.maxDisplayTags);
});

const allOptions = computed(() => {
  return [...props.options];
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return allOptions.value;
  }

  const query = searchQuery.value.toLowerCase();
  return allOptions.value.filter((option) => {
    const label = getLabel(option).toLowerCase();
    return label.includes(query);
  });
});

const hasExactMatch = computed(() => {
  if (!searchQuery.value) return false;

  return allOptions.value.some((option) => {
    const label = getLabel(option).toLowerCase();
    return label === searchQuery.value.toLowerCase();
  });
});

function toggleDropdown() {
  if (props.disabled) return;

  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    searchQuery.value = "";
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  }
}

function closeDropdown() {
  isOpen.value = false;
}

function getValueKey(option: Option): string {
  const value = getValue(option);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function getValue(option: Option): any {
  if (typeof option === "object" && option !== null) {
    return option[props.valueKey];
  }
  return option;
}

function getLabel(option: Option): string {
  if (typeof option === "object" && option !== null) {
    return option[props.labelKey] || String(option[props.valueKey]);
  }
  return String(option);
}

function isOptionDisabled(option: Option): boolean {
  if (
    typeof option === "object" &&
    option !== null &&
    props.disabledKey in option
  ) {
    return Boolean(option[props.disabledKey]);
  }
  return false;
}

function isSelected(option: Option): boolean {
  const value = getValue(option);

  return props.modelValue.some((selectedValue) => {
    if (
      typeof selectedValue === "object" &&
      selectedValue !== null &&
      typeof value === "object" &&
      value !== null
    ) {
      return JSON.stringify(selectedValue) === JSON.stringify(value);
    }
    return selectedValue === value;
  });
}

function toggleOption(option: Option) {
  if (props.disabled || isOptionDisabled(option)) return;

  const value = getValue(option);
  const isAlreadySelected = isSelected(option);

  let newValues;

  if (isAlreadySelected) {
    // Remove the value
    newValues = props.modelValue.filter((selectedValue) => {
      if (
        typeof selectedValue === "object" &&
        selectedValue !== null &&
        typeof value === "object" &&
        value !== null
      ) {
        return JSON.stringify(selectedValue) !== JSON.stringify(value);
      }
      return selectedValue !== value;
    });
  } else {
    // Add the value
    newValues = [...props.modelValue, value];
  }

  emit("update:modelValue", newValues);
}

function removeValue(index: number) {
  if (props.disabled) return;

  const newValues = [...props.modelValue];
  newValues.splice(index, 1);
  emit("update:modelValue", newValues);
}

function clearValues() {
  if (props.disabled) return;

  emit("update:modelValue", []);
}

function createOption() {
  if (!searchQuery.value || props.disabled) return;

  let newOption: Option;

  if (props.valueKey && props.labelKey) {
    // For object options
    newOption = {
      [props.valueKey]: searchQuery.value,
      [props.labelKey]: searchQuery.value,
    };
  } else {
    // For primitive options
    newOption = searchQuery.value;
  }

  // Add the new option
  const value = getValue(newOption);
  const newValues = [...props.modelValue, value];
  emit("update:modelValue", newValues);

  // Clear the search
  searchQuery.value = "";
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Element;
  const multiSelect = document.querySelector(".base-multi-select");

  if (isOpen.value && multiSelect && !multiSelect.contains(target)) {
    closeDropdown();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.base-multi-select {
  position: relative;
  margin-bottom: 1rem;
  width: 100%;
}

.base-multi-select__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-multi-select__required {
  color: var(--nscale-danger, #dc3545);
  margin-left: 2px;
}

.base-multi-select__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  min-height: 38px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.base-multi-select__container--focus {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-multi-select__selection {
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  min-height: 24px;
  align-items: center;
  gap: 0.25rem;
}

.base-multi-select__placeholder {
  color: var(--nscale-text-secondary, #6c757d);
  font-size: 14px;
}

.base-multi-select__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.base-multi-select__tag {
  display: flex;
  align-items: center;
  background-color: var(--nscale-primary-light, rgba(0, 120, 212, 0.1));
  color: var(--nscale-primary, #0078d4);
  padding: 2px 8px 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  max-width: 100%;
}

.base-multi-select__tag--more {
  background-color: var(--nscale-border, #ced4da);
  color: var(--nscale-text, #212529);
}

.base-multi-select__tag-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.base-multi-select__tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 10px;
  width: 16px;
  height: 16px;
  color: var(--nscale-primary, #0078d4);
  transition: color 0.2s;
}

.base-multi-select__tag-remove:hover {
  color: var(--nscale-danger, #dc3545);
}

.base-multi-select__actions {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
}

.base-multi-select__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-right: 0.5rem;
  font-size: 14px;
  color: var(--nscale-text-secondary, #6c757d);
  transition: color 0.2s;
}

.base-multi-select__clear:hover {
  color: var(--nscale-danger, #dc3545);
}

.base-multi-select__arrow {
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
  transition: transform 0.2s;
}

.base-multi-select__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.base-multi-select__search-container {
  padding: 0.5rem;
  border-bottom: 1px solid var(--nscale-border, #ced4da);
}

.base-multi-select__search {
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 14px;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 4px;
  outline: none;
}

.base-multi-select__search:focus {
  border-color: var(--nscale-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.base-multi-select__options {
  overflow-y: auto;
  max-height: 250px;
  padding: 0.25rem 0;
}

.base-multi-select__option {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.base-multi-select__option:hover:not(.base-multi-select__option--disabled) {
  background-color: var(--nscale-light, #f8f9fa);
}

.base-multi-select__option--selected {
  background-color: var(--nscale-primary-light, rgba(0, 120, 212, 0.1));
}

.base-multi-select__option--selected:hover {
  background-color: var(--nscale-primary-light, rgba(0, 120, 212, 0.15));
}

.base-multi-select__option--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.base-multi-select__checkbox {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
}

.base-multi-select__checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.base-multi-select__checkbox-icon {
  position: relative;
  height: 16px;
  width: 16px;
  background-color: white;
  border: 1px solid var(--nscale-border, #ced4da);
  border-radius: 3px;
}

.base-multi-select__option--selected .base-multi-select__checkbox-icon {
  background-color: var(--nscale-primary, #0078d4);
  border-color: var(--nscale-primary, #0078d4);
}

.base-multi-select__option--selected .base-multi-select__checkbox-icon::after {
  content: "";
  position: absolute;
  display: block;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.base-multi-select__option--disabled .base-multi-select__checkbox-icon {
  background-color: var(--nscale-input-disabled, #e9ecef);
}

.base-multi-select__option-label {
  font-size: 14px;
}

.base-multi-select__no-options {
  padding: 1rem;
  text-align: center;
  color: var(--nscale-text-secondary, #6c757d);
  font-size: 14px;
}

.base-multi-select__create {
  padding: 0.5rem;
  border-top: 1px solid var(--nscale-border, #ced4da);
}

.base-multi-select__create-btn {
  width: 100%;
  padding: 0.375rem 0.75rem;
  background-color: var(--nscale-primary-light, rgba(0, 120, 212, 0.1));
  color: var(--nscale-primary, #0078d4);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: left;
}

.base-multi-select__create-btn:hover {
  background-color: var(--nscale-primary-light, rgba(0, 120, 212, 0.2));
}

.base-multi-select__create-btn i {
  margin-right: 0.25rem;
}

.base-multi-select__error {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-danger, #dc3545);
}

.base-multi-select__help {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
}

.base-multi-select--disabled {
  opacity: 0.65;
}

.base-multi-select--disabled .base-multi-select__container {
  background-color: var(--nscale-input-disabled, #e9ecef);
  cursor: not-allowed;
}

/* Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
