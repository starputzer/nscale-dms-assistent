<template>
  <div class="admin-color-picker">
    <label v-if="label" class="admin-color-picker__label">
      {{ label }}
      <span v-if="required" class="admin-color-picker__required">*</span>
    </label>
    
    <div class="admin-color-picker__container">
      <div 
        class="admin-color-picker__swatch"
        :style="{ backgroundColor: modelValue }"
        @click="openColorPicker"
      ></div>
      
      <BaseInput
        v-model="colorValue"
        :placeholder="placeholder || '#FFFFFF'"
        class="admin-color-picker__input"
        @update:model-value="updateColor"
        @blur="validateHexColor"
      />
      
      <div v-if="showPresets" class="admin-color-picker__presets">
        <div 
          v-for="(preset, index) in presetColors" 
          :key="index"
          class="admin-color-picker__preset-swatch"
          :style="{ backgroundColor: preset }"
          :title="preset"
          @click="selectPreset(preset)"
        ></div>
      </div>
      
      <input
        ref="nativeColorInput"
        type="color"
        :value="modelValue"
        class="admin-color-picker__native"
        @input="updateFromNative"
      />
    </div>
    
    <div v-if="errorMessage" class="admin-color-picker__error">
      {{ errorMessage }}
    </div>
    
    <div v-if="helpText" class="admin-color-picker__help">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BaseInput from '@/components/ui/base/Input.vue';

const props = defineProps({
  /**
   * Color value in hexadecimal format (e.g., #FFFFFF)
   */
  modelValue: {
    type: String,
    default: '#FFFFFF',
  },
  /**
   * Label for the color picker
   */
  label: {
    type: String,
    default: '',
  },
  /**
   * Placeholder text for the color input
   */
  placeholder: {
    type: String,
    default: '',
  },
  /**
   * Whether the field is required
   */
  required: {
    type: Boolean,
    default: false,
  },
  /**
   * Help text to display beneath the input
   */
  helpText: {
    type: String,
    default: '',
  },
  /**
   * Whether to show color presets
   */
  showPresets: {
    type: Boolean,
    default: true,
  },
  /**
   * Custom preset colors
   */
  presetColors: {
    type: Array as () => string[],
    default: () => [
      '#FFFFFF', // White
      '#000000', // Black
      '#3B82F6', // Primary Blue
      '#16A34A', // Success Green
      '#F59E0B', // Warning Yellow
      '#DC2626', // Danger Red
      '#6B7280', // Gray
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
    ],
  },
});

const emit = defineEmits(['update:modelValue']);

// Refs
const nativeColorInput = ref<HTMLInputElement | null>(null);
const colorValue = ref(props.modelValue);
const errorMessage = ref('');

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  if (newVal !== colorValue.value) {
    colorValue.value = newVal;
  }
});

// Computed properties
const isValidHexColor = computed(() => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(colorValue.value);
});

// Methods
function openColorPicker() {
  nativeColorInput.value?.click();
}

function updateColor(value: string) {
  if (value === '') {
    errorMessage.value = '';
    emit('update:modelValue', '#FFFFFF');
    colorValue.value = '#FFFFFF';
    return;
  }

  // Auto-add # if missing
  if (!value.startsWith('#')) {
    value = '#' + value;
    colorValue.value = value;
  }

  // Only emit for valid hex colors
  if (isValidHexColor.value) {
    errorMessage.value = '';
    emit('update:modelValue', value.toUpperCase());
  }
}

function updateFromNative(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value.toUpperCase();
  colorValue.value = value;
  errorMessage.value = '';
  emit('update:modelValue', value);
}

function validateHexColor() {
  if (colorValue.value === '') {
    colorValue.value = '#FFFFFF';
    emit('update:modelValue', '#FFFFFF');
    return;
  }

  if (!isValidHexColor.value) {
    errorMessage.value = 'Ungültiger Hexadezimal-Farbwert';
    colorValue.value = props.modelValue;
  } else {
    errorMessage.value = '';
  }
}

function selectPreset(color: string) {
  colorValue.value = color;
  emit('update:modelValue', color);
  errorMessage.value = '';
}
</script>

<style lang="scss">
.admin-color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  &__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #111827);
    margin-bottom: 0.25rem;
  }
  
  &__required {
    color: var(--danger, #dc2626);
    margin-left: 0.25rem;
  }
  
  &__container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }
  
  &__swatch {
    width: 40px;
    height: 40px;
    border-radius: 0.25rem;
    border: 1px solid var(--border-color, #e5e7eb);
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  &__input {
    flex: 1;
  }
  
  &__presets {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }
  
  &__preset-swatch {
    width: 24px;
    height: 24px;
    border-radius: 0.25rem;
    border: 1px solid var(--border-color, #e5e7eb);
    cursor: pointer;
    transition: transform 0.1s ease;
    
    &:hover {
      transform: scale(1.1);
    }
  }
  
  &__native {
    width: 0;
    height: 0;
    opacity: 0;
    position: absolute;
    pointer-events: none;
  }
  
  &__error {
    font-size: 0.75rem;
    color: var(--danger, #dc2626);
  }
  
  &__help {
    font-size: 0.75rem;
    color: var(--text-secondary, #6b7280);
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    &__container {
      flex-wrap: wrap;
    }
    
    &__swatch {
      width: 44px;
      height: 44px;
    }
    
    &__input {
      min-width: 120px;
    }
    
    &__presets {
      order: 3;
      margin-left: 0;
      margin-top: 0.5rem;
      width: 100%;
      justify-content: flex-start;
    }
    
    &__preset-swatch {
      width: 32px;
      height: 32px;
    }
  }
}
</style>