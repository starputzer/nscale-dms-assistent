<template>
  <div 
    class="n-select-wrapper"
    :class="{ 
      'n-select-wrapper--disabled': disabled, 
      'n-select-wrapper--error': !!error,
      'n-select-wrapper--focused': isFocused,
      'n-select-wrapper--open': isOpen
    }"
  >
    <label 
      v-if="label" 
      :for="selectId" 
      class="n-select-label"
      :class="{ 'n-select-label--required': required }"
    >
      {{ label }}
    </label>
    
    <div class="n-select-container">
      <div 
        ref="selectRef"
        class="n-select-field-wrapper"
        @click="toggleDropdown"
        @keydown="handleKeydown"
        tabindex="0"
      >
        <div v-if="prefixIcon || $slots.prefix" class="n-select-prefix">
          <component v-if="prefixIcon" :is="prefixIcon" />
          <slot v-else name="prefix"></slot>
        </div>

        <div class="n-select-value">
          <template v-if="selectedDisplay">
            {{ selectedDisplay }}
          </template>
          <template v-else>
            <span class="n-select-placeholder">{{ placeholder }}</span>
          </template>
        </div>

        <div class="n-select-suffix">
          <svg class="n-select-arrow" :class="{ 'n-select-arrow--open': isOpen }" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
      </div>

      <!-- Native select for form submission and accessibility -->
      <select
        :id="selectId"
        ref="nativeSelectRef"
        class="n-select-native"
        :value="modelValue"
        :name="name"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="helperId"
        @change="handleNativeChange"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
        <option 
          v-for="option in normalizedOptions" 
          :key="option.value" 
          :value="option.value" 
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <!-- Custom dropdown -->
      <Transition name="n-select-dropdown">
        <div 
          v-show="isOpen" 
          ref="dropdownRef"
          class="n-select-dropdown"
          :style="dropdownStyle"
          role="listbox"
          :id="`${selectId}-dropdown`"
          :aria-labelledby="label ? selectId : undefined"
        >
          <div class="n-select-options-list" ref="optionsListRef">
            <div 
              v-for="(option, index) in normalizedOptions" 
              :key="option.value"
              class="n-select-option"
              :class="{
                'n-select-option--selected': isOptionSelected(option.value),
                'n-select-option--highlighted': highlightedIndex === index,
                'n-select-option--disabled': option.disabled
              }"
              role="option"
              :id="`${selectId}-option-${index}`"
              :aria-selected="isOptionSelected(option.value)"
              :aria-disabled="option.disabled"
              @click="selectOption(option)"
              @mouseenter="() => !option.disabled && (highlightedIndex = index)"
              tabindex="-1"
            >
              <slot name="option" :option="option" :selected="isOptionSelected(option.value)">
                {{ option.label }}
              </slot>
            </div>
            
            <div v-if="normalizedOptions.length === 0" class="n-select-no-options">
              {{ noOptionsText }}
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="helperText || error" class="n-select-helper-text" :id="helperId">
        <span v-if="error" class="n-select-error-text">{{ error }}</span>
        <span v-else>{{ helperText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { uniqueId } from 'lodash';

type SelectOptionValue = string | number | boolean | null;

interface SelectOption {
  label: string;
  value: SelectOptionValue;
  disabled?: boolean;
}

/**
 * Select dropdown component for option selection
 * @displayName Select
 * @example
 * <Select v-model="selectedValue" :options="options" label="Choose an option" />
 */
export interface SelectProps {
  /** Value for v-model binding */
  modelValue: SelectOptionValue;
  /** Select options array */
  options: Array<SelectOption | string | number>;
  /** Select label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message displayed instead of helper text */
  error?: string;
  /** Prefix icon component */
  prefixIcon?: any;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select is required */
  required?: boolean;
  /** Unique ID for the select (auto-generated if not provided) */
  id?: string;
  /** Name attribute for the select form field */
  name?: string;
  /** Text to display when no options are available */
  noOptionsText?: string;
  /** Whether to close the dropdown on selection */
  closeOnSelect?: boolean;
  /** Maximum height of the dropdown */
  dropdownMaxHeight?: string;
}

const props = withDefaults(defineProps<SelectProps>(), {
  placeholder: 'Select an option',
  disabled: false,
  required: false,
  noOptionsText: 'No options available',
  closeOnSelect: true,
  dropdownMaxHeight: '300px'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectOptionValue): void;
  (e: 'change', value: SelectOptionValue): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'open'): void;
  (e: 'close'): void;
}>();

// Internal state
const selectId = computed(() => props.id || uniqueId('n-select-'));
const helperId = computed(() => `${selectId.value}-helper`);
const selectRef = ref<HTMLElement | null>(null);
const nativeSelectRef = ref<HTMLSelectElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const optionsListRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const dropdownStyle = ref<{[key: string]: string}>({});

// Normalize options to support both object and primitive option formats
const normalizedOptions = computed(() => {
  return props.options.map(option => {
    if (typeof option === 'object' && option !== null) {
      return option as SelectOption;
    } else {
      return {
        label: String(option),
        value: option as SelectOptionValue
      };
    }
  });
});

// Get display text for the selected option
const selectedDisplay = computed(() => {
  const selected = normalizedOptions.value.find(option => 
    option.value === props.modelValue
  );
  return selected ? selected.label : '';
});

// Check if an option is currently selected
function isOptionSelected(value: SelectOptionValue): boolean {
  return props.modelValue === value;
}

// Position the dropdown relative to the select field
function positionDropdown() {
  if (!selectRef.value || !dropdownRef.value) return;
  
  const selectRect = selectRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - selectRect.bottom;
  
  // Set the width to match the select field
  dropdownStyle.value.width = `${selectRect.width}px`;
  
  // Decide whether to position the dropdown below or above the select
  if (spaceBelow < 200 && selectRect.top > spaceBelow) {
    // Position above
    dropdownStyle.value.bottom = `${window.innerHeight - selectRect.top}px`;
    dropdownStyle.value.maxHeight = `${Math.min(selectRect.top - 10, parseInt(props.dropdownMaxHeight))}px`;
  } else {
    // Position below
    dropdownStyle.value.top = `${selectRect.bottom}px`;
    dropdownStyle.value.left = `${selectRect.left}px`;
    dropdownStyle.value.maxHeight = props.dropdownMaxHeight;
  }
}

// Toggle the dropdown
function toggleDropdown() {
  if (props.disabled) return;
  
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
  }
}

// Open the dropdown
function openDropdown() {
  if (props.disabled || isOpen.value) return;
  
  isOpen.value = true;
  positionDropdown();
  highlightSelectedOption();
  emit('open');
  
  nextTick(() => {
    if (optionsListRef.value && highlightedIndex.value !== -1) {
      const highlightedOption = optionsListRef.value.children[highlightedIndex.value] as HTMLElement;
      if (highlightedOption) {
        highlightedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  });
  
  // Add click outside handler
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('resize', handleResize);
}

// Close the dropdown
function closeDropdown() {
  if (!isOpen.value) return;
  
  isOpen.value = false;
  emit('close');
  
  // Remove event listeners
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('resize', handleResize);
}

// Highlight the currently selected option
function highlightSelectedOption() {
  const selectedIndex = normalizedOptions.value.findIndex(option => 
    option.value === props.modelValue
  );
  
  highlightedIndex.value = selectedIndex !== -1 ? selectedIndex : 0;
}

// Handle option selection
function selectOption(option: SelectOption) {
  if (props.disabled || option.disabled) return;
  
  emit('update:modelValue', option.value);
  emit('change', option.value);
  
  if (props.closeOnSelect) {
    closeDropdown();
  }
  
  // Focus the select element
  nativeSelectRef.value?.focus();
}

// Handle focus events
function handleFocus(event: FocusEvent) {
  isFocused.value = true;
  emit('focus', event);
}

// Handle blur events
function handleBlur(event: FocusEvent) {
  isFocused.value = false;
  emit('blur', event);
}

// Handle changes to the native select (for accessibility)
function handleNativeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  let value: SelectOptionValue = target.value;
  
  // Handle type conversion to match the expected value type
  const selectedOption = normalizedOptions.value.find(option => 
    String(option.value) === String(value)
  );
  
  if (selectedOption) {
    value = selectedOption.value;
  }
  
  emit('update:modelValue', value);
  emit('change', value);
}

// Handle keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (isOpen.value) {
        if (highlightedIndex.value >= 0 && highlightedIndex.value < normalizedOptions.value.length) {
          const option = normalizedOptions.value[highlightedIndex.value];
          if (!option.disabled) {
            selectOption(option);
          }
        }
      } else {
        openDropdown();
      }
      break;
      
    case 'ArrowDown':
      event.preventDefault();
      if (isOpen.value) {
        let nextIndex = highlightedIndex.value + 1;
        while (
          nextIndex < normalizedOptions.value.length && 
          normalizedOptions.value[nextIndex].disabled
        ) {
          nextIndex++;
        }
        
        if (nextIndex < normalizedOptions.value.length) {
          highlightedIndex.value = nextIndex;
          scrollOptionIntoView(nextIndex);
        }
      } else {
        openDropdown();
      }
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      if (isOpen.value) {
        let prevIndex = highlightedIndex.value - 1;
        while (
          prevIndex >= 0 && 
          normalizedOptions.value[prevIndex].disabled
        ) {
          prevIndex--;
        }
        
        if (prevIndex >= 0) {
          highlightedIndex.value = prevIndex;
          scrollOptionIntoView(prevIndex);
        }
      } else {
        openDropdown();
      }
      break;
      
    case 'Escape':
      event.preventDefault();
      closeDropdown();
      break;
      
    case 'Tab':
      closeDropdown();
      break;
  }
}

// Handle click outside the select to close the dropdown
function handleClickOutside(event: MouseEvent) {
  if (
    isOpen.value &&
    selectRef.value &&
    dropdownRef.value &&
    !selectRef.value.contains(event.target as Node) &&
    !dropdownRef.value.contains(event.target as Node)
  ) {
    closeDropdown();
  }
}

// Handle window resize
function handleResize() {
  if (isOpen.value) {
    positionDropdown();
  }
}

// Scroll the highlighted option into view
function scrollOptionIntoView(index: number) {
  nextTick(() => {
    if (optionsListRef.value) {
      const option = optionsListRef.value.children[index] as HTMLElement;
      if (option) {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  });
}

// Watch for model value changes to update the dropdown
watch(() => props.modelValue, () => {
  if (isOpen.value) {
    highlightSelectedOption();
  }
});

// Watch for options changes to reposition the dropdown
watch(() => props.options, () => {
  if (isOpen.value) {
    nextTick(() => positionDropdown());
  }
});

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.n-select-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1rem;
  font-family: var(--nscale-font-family-base, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  position: relative;
}

.n-select-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: 500;
  color: var(--nscale-gray-700, #4a5568);
}

.n-select-label--required::after {
  content: "*";
  color: var(--nscale-error, #dc2626);
  margin-left: 0.25rem;
}

.n-select-container {
  position: relative;
}

.n-select-field-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--nscale-white, #ffffff);
  border: 1px solid var(--nscale-gray-300, #d1d5db);
  border-radius: var(--nscale-border-radius-md, 0.375rem);
  height: 2.5rem;
  padding: 0 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  color: var(--nscale-gray-800, #1f2937);
}

.n-select-native {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: -1;
}

.n-select-wrapper--focused .n-select-field-wrapper {
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 3px var(--nscale-primary-light, rgba(0, 165, 80, 0.2));
}

.n-select-wrapper--error .n-select-field-wrapper {
  border-color: var(--nscale-error, #dc2626);
}

.n-select-wrapper--error.n-select-wrapper--focused .n-select-field-wrapper {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
}

.n-select-wrapper--disabled .n-select-field-wrapper {
  background-color: var(--nscale-gray-100, #f0f2f5);
  border-color: var(--nscale-gray-300, #d1d5db);
  color: var(--nscale-gray-500, #6b7280);
  cursor: not-allowed;
}

.n-select-prefix {
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
  color: var(--nscale-gray-500, #6b7280);
}

.n-select-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1rem;
  font-size: var(--nscale-font-size-base, 1rem);
}

.n-select-placeholder {
  color: var(--nscale-gray-400, #9ca3af);
}

.n-select-suffix {
  display: flex;
  align-items: center;
  color: var(--nscale-gray-500, #6b7280);
}

.n-select-arrow {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
  transition: transform 0.2s ease;
}

.n-select-arrow--open {
  transform: rotate(180deg);
}

.n-select-dropdown {
  position: fixed;
  z-index: var(--nscale-z-index-dropdown, 1000);
  background-color: var(--nscale-white, #ffffff);
  border: 1px solid var(--nscale-gray-200, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.375rem);
  box-shadow: var(--nscale-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  overflow: hidden;
}

.n-select-options-list {
  overflow-y: auto;
  max-height: 100%;
}

.n-select-option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: var(--nscale-font-size-base, 1rem);
  transition: background-color 0.1s ease;
}

.n-select-option:hover:not(.n-select-option--disabled) {
  background-color: var(--nscale-gray-50, #f8f9fa);
}

.n-select-option--highlighted {
  background-color: var(--nscale-gray-100, #f0f2f5);
}

.n-select-option--selected {
  color: var(--nscale-primary, #00a550);
  font-weight: 500;
}

.n-select-option--disabled {
  color: var(--nscale-gray-400, #9ca3af);
  cursor: not-allowed;
}

.n-select-no-options {
  padding: 0.75rem;
  text-align: center;
  color: var(--nscale-gray-500, #6b7280);
  font-size: var(--nscale-font-size-sm, 0.875rem);
}

.n-select-helper-text {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  margin-top: 0.375rem;
  color: var(--nscale-gray-500, #6b7280);
}

.n-select-error-text {
  color: var(--nscale-error, #dc2626);
}

/* Animation for dropdown */
.n-select-dropdown-enter-active,
.n-select-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.n-select-dropdown-enter-from,
.n-select-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-select-label {
    color: var(--nscale-gray-300, #d1d5db);
  }
  
  .n-select-field-wrapper {
    background-color: var(--nscale-gray-800, #1f2937);
    border-color: var(--nscale-gray-600, #4b5563);
    color: var(--nscale-gray-200, #e2e8f0);
  }
  
  .n-select-placeholder {
    color: var(--nscale-gray-500, #6b7280);
  }
  
  .n-select-wrapper--disabled .n-select-field-wrapper {
    background-color: var(--nscale-gray-700, #374151);
    border-color: var(--nscale-gray-600, #4b5563);
    color: var(--nscale-gray-500, #6b7280);
  }
  
  .n-select-dropdown {
    background-color: var(--nscale-gray-800, #1f2937);
    border-color: var(--nscale-gray-700, #374151);
  }
  
  .n-select-option:hover:not(.n-select-option--disabled) {
    background-color: var(--nscale-gray-700, #374151);
  }
  
  .n-select-option--highlighted {
    background-color: var(--nscale-gray-700, #374151);
  }
}
</style>