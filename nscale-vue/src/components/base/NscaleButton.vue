<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="$emit('click', $event)"
    :type="type"
  >
    <i v-if="icon" :class="['mr-2', `fas fa-${icon}`]"></i>
    <slot></slot>
  </button>
</template>

<script setup>
import { computed } from 'vue';

// Props mit exakt denselben Klassen wie im Original HTML/CSS UI
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  icon: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  }
});

// Emits definieren
defineEmits(['click']);

// Berechne Klassen basierend auf Variante und Größe - WICHTIG: Identische Klassen wie im Original
const buttonClasses = computed(() => {
  const baseClasses = "flex items-center";
  
  // Exakte Klassennamen aus dem Original-HTML
  const variantClasses = {
    primary: "nscale-btn-primary",
    secondary: "nscale-btn-secondary",
    danger: "admin-button-danger"
  };
  
  // Größen-Klassen
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };
  
  return [
    baseClasses,
    variantClasses[props.variant],
    sizeClasses[props.size]
  ].join(' ');
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */
/* Die Styles werden aus den bestehenden CSS-Dateien geladen */
</style>