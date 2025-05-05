<template>
  <div :class="['input-wrapper', { 'mb-4': withMargin }]">
    <label v-if="label" :for="id" class="block text-gray-700 text-sm font-medium mb-2">
      {{ label }}
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="nscale-input w-full"
      :class="{ 'error': error }"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
    />
    <p v-if="error" class="mt-1 text-red-500 text-sm">{{ error }}</p>
    <p v-if="helpText" class="mt-1 text-gray-500 text-xs">{{ helpText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Eindeutige ID für Accessibility-Zwecke
const id = computed(() => `input-${Math.random().toString(36).substring(2, 9)}`);

// Props mit exakt denselben Eigenschaften wie im Original HTML/CSS UI
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  },
  withMargin: {
    type: Boolean,
    default: true
  }
});

// Emits für v-model
defineEmits(['update:modelValue']);
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */
/* Die Styles werden aus den bestehenden CSS-Dateien geladen */

/* Falls notwendig, spezifische Ergänzungen für Zustände */
.nscale-input.error {
  border-color: var(--nscale-danger);
}
</style>