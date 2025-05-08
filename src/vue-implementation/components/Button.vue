<template>
  <button 
    class="btn" 
    :class="[
      `btn-${variant}`, 
      { 'btn-icon-only': !$slots.default }
    ]"
    v-bind="$attrs"
  >
    <Icon 
      v-if="icon" 
      :name="icon" 
      :size="iconSize" 
      :color="iconColor || undefined"
      :stroke-width="iconStrokeWidth"
      :fill="iconFill"
      class="btn-icon"
    />
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonVariant, IconName } from '../types';
import Icon from './Icon.vue';

const props = defineProps({
  variant: {
    type: String as () => ButtonVariant,
    default: 'primary'
  },
  icon: {
    type: String as () => IconName | undefined,
    default: undefined
  },
  iconSize: {
    type: Number,
    default: 18
  },
  iconColor: {
    type: String,
    default: ''
  },
  iconStrokeWidth: {
    type: Number,
    default: 2
  },
  iconFill: {
    type: Boolean,
    default: false
  }
});

const iconColor = computed(() => {
  if (props.iconColor) return props.iconColor;
  return undefined; // Verwende die Standardfarbe des Buttons
});
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25rem;
  padding: 0.5rem 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: #2e7d32; /* nscale Brand-Grün */
  color: white;
  border-color: #2e7d32;
}

.btn-primary:hover {
  background-color: #276829;
  border-color: #276829;
}

.btn-secondary {
  background-color: white;
  color: #333;
  border-color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #f5f5f5;
  border-color: #d0d0d0;
}

.btn-icon {
  margin-right: 0.5rem;
}

.btn-icon-only {
  padding: 0.5rem;
}

.btn-icon-only .btn-icon {
  margin-right: 0;
}
</style>