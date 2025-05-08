<template>
  <div 
    class="n-card" 
    :class="[
      `n-card--${variant}`,
      `n-card--${size}`,
      { 'n-card--interactive': interactive }
    ]"
    :tabindex="interactive ? 0 : undefined"
    @click="handleClick"
    @keydown.enter="handleKeyDown"
    @keydown.space="handleKeyDown"
  >
    <div v-if="hasHeader" class="n-card-header">
      <div v-if="title || $slots.title" class="n-card-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div v-if="$slots.headerActions" class="n-card-header-actions">
        <slot name="headerActions"></slot>
      </div>
      <slot name="header"></slot>
    </div>
    
    <div class="n-card-body" :style="bodyStyles">
      <slot></slot>
    </div>
    
    <div v-if="$slots.footer" class="n-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Card component that serves as a container for various content types
 * @displayName Card
 * @example
 * <Card title="Card Title">
 *   <p>Card content goes here</p>
 *   <template #footer>
 *     <Button>Action</Button>
 *   </template>
 * </Card>
 */
export interface CardProps {
  /** The title of the card */
  title?: string;
  /** Appearance variant of the card */
  variant?: 'default' | 'elevated' | 'bordered' | 'flat';
  /** Size variant affecting padding and content density */
  size?: 'small' | 'medium' | 'large';
  /** Whether the card can be interacted with (adds hover effects and focus) */
  interactive?: boolean;
  /** Custom padding for the card body */
  padding?: string;
  /** Maximum width of the card */
  maxWidth?: string;
  /** Minimum height of the card */
  minHeight?: string;
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  size: 'medium',
  interactive: false
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent | KeyboardEvent): void;
}>();

// Check if the card has a header (title, headerActions slot, or header slot)
const slots = defineSlots();
const hasHeader = computed(() => {
  return !!props.title || !!slots.title || !!slots.headerActions || !!slots.header;
});

// Calculate body styles based on props
const bodyStyles = computed(() => {
  const styles: Record<string, string> = {};
  
  if (props.padding) {
    styles.padding = props.padding;
  }
  
  if (props.minHeight) {
    styles.minHeight = props.minHeight;
  }
  
  return styles;
});

// Handle click event for interactive cards
function handleClick(event: MouseEvent) {
  if (props.interactive) {
    emit('click', event);
  }
}

// Handle keyboard events for interactive cards (accessibility)
function handleKeyDown(event: KeyboardEvent) {
  if (props.interactive && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    emit('click', event);
  }
}
</script>

<style scoped>
.n-card {
  background-color: var(--n-color-white, #ffffff);
  border-radius: var(--n-border-radius, 4px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  position: relative;
  max-width: v-bind('props.maxWidth');
}

/* Variant styles */
.n-card--default {
  border: 1px solid var(--n-color-gray-200, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.n-card--elevated {
  border: 1px solid var(--n-color-gray-100, #f7fafc);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.n-card--bordered {
  border: 1px solid var(--n-color-gray-300, #e2e8f0);
  box-shadow: none;
}

.n-card--flat {
  border: none;
  box-shadow: none;
}

/* Size variations */
.n-card--small .n-card-body {
  padding: 0.75rem;
}

.n-card--medium .n-card-body {
  padding: 1.25rem;
}

.n-card--large .n-card-body {
  padding: 1.75rem;
}

/* Header styling */
.n-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--n-color-gray-200, #e2e8f0);
  padding: 1rem;
  gap: 0.5rem;
}

.n-card--small .n-card-header {
  padding: 0.5rem 0.75rem;
}

.n-card--large .n-card-header {
  padding: 1.25rem 1.75rem;
}

.n-card-title {
  font-size: var(--n-font-size-lg, 1.125rem);
  font-weight: 600;
  color: var(--n-color-gray-900, #1a202c);
  flex: 1;
}

.n-card--small .n-card-title {
  font-size: var(--n-font-size-md, 1rem);
}

.n-card-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Footer styling */
.n-card-footer {
  border-top: 1px solid var(--n-color-gray-200, #e2e8f0);
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.n-card--small .n-card-footer {
  padding: 0.5rem 0.75rem;
}

.n-card--large .n-card-footer {
  padding: 1.25rem 1.75rem;
}

/* Interactive card styles */
.n-card--interactive {
  cursor: pointer;
  user-select: none;
}

.n-card--interactive:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.n-card--interactive:active {
  transform: translateY(1px);
}

.n-card--interactive:focus-visible {
  outline: 2px solid var(--n-color-primary, #0066cc);
  outline-offset: 2px;
}

/* Interactive variants specifics */
.n-card--interactive.n-card--default:hover,
.n-card--interactive.n-card--bordered:hover {
  border-color: var(--n-color-primary-light, #4299e1);
}

.n-card--interactive.n-card--flat:hover {
  background-color: var(--n-color-gray-50, #f9fafb);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-card {
    background-color: var(--n-color-gray-800, #2d3748);
  }

  .n-card--default {
    border-color: var(--n-color-gray-700, #4a5568);
  }

  .n-card--elevated {
    border-color: var(--n-color-gray-700, #4a5568);
  }

  .n-card--bordered {
    border-color: var(--n-color-gray-600, #718096);
  }

  .n-card-header {
    border-bottom-color: var(--n-color-gray-700, #4a5568);
  }

  .n-card-footer {
    border-top-color: var(--n-color-gray-700, #4a5568);
  }

  .n-card-title {
    color: var(--n-color-gray-100, #f7fafc);
  }

  .n-card--interactive.n-card--default:hover,
  .n-card--interactive.n-card--bordered:hover {
    border-color: var(--n-color-primary, #0066cc);
  }

  .n-card--interactive.n-card--flat:hover {
    background-color: var(--n-color-gray-700, #4a5568);
  }
}
</style>