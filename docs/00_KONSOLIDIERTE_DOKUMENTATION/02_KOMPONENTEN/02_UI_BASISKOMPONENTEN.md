---
title: "UI-Basiskomponenten"
version: "1.0.0"
date: "09.05.2025"
lastUpdate: "09.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["UI", "Komponenten", "Design", "Vue3"]
---

# UI-Basiskomponenten

> **Letzte Aktualisierung:** 09.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Die UI-Basiskomponenten bilden das Fundament der nscale DMS Assistent-Benutzeroberfläche und wurden als Teil der Vue 3 SFC-Migration implementiert. Sie bieten ein konsistentes Design und Verhalten über die gesamte Anwendung hinweg. Der aktuelle Fertigstellungsgrad der UI-Basiskomponenten liegt bei ca. 60%.

## Implementierte Komponenten

| Komponente | Status | Implementierungsgrad | Layout-Übereinstimmung |
|------------|--------|----------------------|------------------------|
| **Button.vue** | Fertiggestellt | 95% | Hoch |
| **Input.vue** | Fertiggestellt | 90% | Hoch |
| **Card.vue** | Fertiggestellt | 85% | Hoch |
| **Alert.vue** | Fertiggestellt | 80% | Hoch |
| **Modal.vue** | Fertiggestellt | 70% | Mittel |
| **ErrorBoundary.vue** | Fertiggestellt | 95% | N/A |
| **FeatureWrapper.vue** | Fertiggestellt | 90% | N/A |
| **Dialog.vue** | Fertiggestellt | 70% | Mittel |
| **Toast.vue** | Fertiggestellt | 80% | Mittel |

## Komponenten-Verzeichnisstruktur

```
src/components/ui/
├── base/             # Grundlegende UI-Elemente
│   ├── Button.vue
│   ├── Input.vue
│   ├── Card.vue
│   ├── Alert.vue
│   ├── Modal.vue
│   └── index.ts      # Komponenten-Export
├── feedback/         # Feedback-bezogene Komponenten
│   └── Alert.vue
├── data/             # Daten-bezogene Komponenten
│   ├── Table.vue
│   ├── Pagination.vue
│   └── List.vue
├── layout/           # Layout-Komponenten
│   ├── Container.vue
│   ├── Row.vue
│   └── Col.vue
├── Dialog.vue        # Dialoge und Modals
├── Toast.vue         # Toast-Benachrichtigungen
├── ToastContainer.vue
├── LoadingOverlay.vue
├── Notification.vue
└── index.ts          # Haupt-Export aller UI-Komponenten
```

## Design-System-Integration

Die UI-Komponenten basieren auf einem gemeinsamen Design-System mit CSS-Variablen, die in `src/assets/design-system.scss` definiert sind:

```scss
// src/assets/design-system.scss

// Farben
$colors: (
  'primary': (
    'base': #0064b0,
    'light': #e6f0f9,
    'dark': #004e8a,
    'contrast': #ffffff
  ),
  'secondary': (
    'base': #64748b,
    'light': #f1f5f9,
    'dark': #475569,
    'contrast': #ffffff
  ),
  'success': (
    'base': #10b981,
    'light': #ecfdf5,
    'dark': #059669,
    'contrast': #ffffff
  ),
  'error': (
    'base': #ef4444,
    'light': #fee2e2,
    'dark': #b91c1c,
    'contrast': #ffffff
  ),
  'warning': (
    'base': #f59e0b,
    'light': #fef3c7,
    'dark': #d97706,
    'contrast': #ffffff
  ),
  'info': (
    'base': #3b82f6,
    'light': #eff6ff,
    'dark': #2563eb,
    'contrast': #ffffff
  ),
  'background': (
    'base': #ffffff,
    'alt': #f8fafc,
    'dark': #1e293b
  ),
  'text': (
    'primary': #1e293b,
    'secondary': #64748b,
    'hint': #94a3b8,
    'disabled': #cbd5e1,
    'inverse': #ffffff
  ),
  'border': #e2e8f0
);

// Generiere CSS-Variablen aus Farb-Map
:root {
  @each $color-name, $variants in $colors {
    @if type-of($variants) == 'map' {
      @each $variant-name, $value in $variants {
        --n-color-#{$color-name}#{if($variant-name != 'base', '-#{$variant-name}', '')}: #{$value};
        
        // RGB-Varianten für Opacity-Manipulation
        @if type-of($value) == 'color' {
          --n-color-#{$color-name}#{if($variant-name != 'base', '-#{$variant-name}', '')}-rgb: #{red($value)}, #{green($value)}, #{blue($value)};
        }
      }
    } @else {
      --n-color-#{$color-name}: #{$variants};
      
      // RGB-Varianten für Opacity-Manipulation
      @if type-of($variants) == 'color' {
        --n-color-#{$color-name}-rgb: #{red($variants)}, #{green($variants)}, #{blue($variants)};
      }
    }
  }
  
  // Typografie
  --n-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --n-font-size-xs: 0.75rem;   // 12px
  --n-font-size-sm: 0.875rem;  // 14px
  --n-font-size-md: 1rem;      // 16px
  --n-font-size-lg: 1.125rem;  // 18px
  --n-font-size-xl: 1.25rem;   // 20px
  --n-font-size-2xl: 1.5rem;   // 24px
  --n-font-size-3xl: 1.875rem; // 30px
  
  // Abstände
  --n-spacing-xs: 0.25rem;  // 4px
  --n-spacing-sm: 0.5rem;   // 8px
  --n-spacing-md: 1rem;     // 16px
  --n-spacing-lg: 1.5rem;   // 24px
  --n-spacing-xl: 2rem;     // 32px
  --n-spacing-2xl: 3rem;    // 48px
  
  // Rundungen
  --n-border-radius-sm: 0.25rem;  // 4px
  --n-border-radius: 0.375rem;    // 6px
  --n-border-radius-lg: 0.5rem;   // 8px
  --n-border-radius-xl: 0.75rem;  // 12px
  --n-border-radius-full: 9999px; // Pill shape
  
  // Schatten
  --n-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --n-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --n-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --n-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --n-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  // Übergänge
  --n-transition-fast: 150ms;
  --n-transition: 250ms;
  --n-transition-slow: 350ms;
  --n-ease: cubic-bezier(0.4, 0, 0.2, 1);
  
  // Z-Index-Schichten
  --n-z-index-dropdown: 1000;
  --n-z-index-sticky: 1100;
  --n-z-index-fixed: 1200;
  --n-z-index-modal: 1300;
  --n-z-index-popover: 1400;
  --n-z-index-toast: 1500;
  --n-z-index-tooltip: 1600;
}

// Dark Mode Themevariablen
.theme-dark {
  --n-color-background-base: #0f172a;
  --n-color-background-alt: #1e293b;
  --n-color-text-primary: #f1f5f9;
  --n-color-text-secondary: #cbd5e1;
  --n-color-text-hint: #94a3b8;
  --n-color-border: #334155;
  
  // Anpassung von Varianten für Dark Mode
  --n-color-primary-light: rgba(0, 100, 176, 0.2);
  --n-color-error-light: rgba(239, 68, 68, 0.2);
  --n-color-success-light: rgba(16, 185, 129, 0.2);
  --n-color-warning-light: rgba(245, 158, 11, 0.2);
  --n-color-info-light: rgba(59, 130, 246, 0.2);
  
  // Schatten für Dark Mode anpassen
  --n-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  --n-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  --n-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --n-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
  --n-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}
```

## Beispiel-Komponenten

### Button.vue

```vue
<template>
  <button
    :class="[
      'n-button',
      `n-button--${variant}`,
      `n-button--${size}`,
      {
        'n-button--block': block,
        'n-button--rounded': rounded,
        'n-button--loading': loading,
        'n-button--disabled': disabled || loading,
        'n-button--with-icon': $slots.icon || icon,
        'n-button--icon-only': ($slots.icon || icon) && !$slots.default
      }
    ]"
    :disabled="disabled || loading"
    :type="type"
    :aria-busy="loading ? 'true' : undefined"
    v-bind="$attrs"
    @click="onClick"
  >
    <span v-if="loading" class="n-button__loader">
      <SpinnerIcon size="sm" />
    </span>
    
    <span v-else-if="$slots.icon || icon" class="n-button__icon">
      <slot name="icon">
        <component :is="resolveIcon" v-if="icon" />
      </slot>
    </span>
    
    <span v-if="$slots.default" class="n-button__content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue';

// Typen
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'text' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonType = 'button' | 'submit' | 'reset';

// Props
const props = withDefaults(defineProps<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: ButtonType;
  block?: boolean;
  rounded?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string | Component;
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  block: false,
  rounded: false,
  disabled: false,
  loading: false
});

// Emits
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// Computed
const resolveIcon = computed(() => {
  if (!props.icon) return null;
  
  if (typeof props.icon === 'string') {
    // Dynamischer Import für String-Namen (erfordert Vite)
    return () => import(`@/components/icons/${props.icon}.vue`);
  }
  
  return props.icon;
});

// Methoden
function onClick(event: MouseEvent) {
  if (props.disabled || props.loading) return;
  emit('click', event);
}
</script>

<style lang="scss">
.n-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--n-font-family);
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  transition: all var(--n-transition) var(--n-ease);
  border: 1px solid transparent;
  cursor: pointer;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(var(--n-color-primary-rgb), 0.4);
  }
  
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  &--loading {
    color: transparent !important;
    
    .n-button__content {
      visibility: hidden;
    }
  }
  
  &__loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  // Varianten
  &--primary {
    background-color: var(--n-color-primary);
    color: var(--n-color-primary-contrast);
    border-color: var(--n-color-primary);
    
    &:hover, &:focus {
      background-color: var(--n-color-primary-dark);
      border-color: var(--n-color-primary-dark);
    }
  }
  
  &--secondary {
    background-color: var(--n-color-secondary);
    color: var(--n-color-secondary-contrast);
    border-color: var(--n-color-secondary);
    
    &:hover, &:focus {
      background-color: var(--n-color-secondary-dark);
      border-color: var(--n-color-secondary-dark);
    }
  }
  
  &--success {
    background-color: var(--n-color-success);
    color: var(--n-color-success-contrast);
    border-color: var(--n-color-success);
    
    &:hover, &:focus {
      background-color: var(--n-color-success-dark);
      border-color: var(--n-color-success-dark);
    }
  }
  
  &--error {
    background-color: var(--n-color-error);
    color: var(--n-color-error-contrast);
    border-color: var(--n-color-error);
    
    &:hover, &:focus {
      background-color: var(--n-color-error-dark);
      border-color: var(--n-color-error-dark);
    }
  }
  
  &--warning {
    background-color: var(--n-color-warning);
    color: var(--n-color-warning-contrast);
    border-color: var(--n-color-warning);
    
    &:hover, &:focus {
      background-color: var(--n-color-warning-dark);
      border-color: var(--n-color-warning-dark);
    }
  }
  
  &--info {
    background-color: var(--n-color-info);
    color: var(--n-color-info-contrast);
    border-color: var(--n-color-info);
    
    &:hover, &:focus {
      background-color: var(--n-color-info-dark);
      border-color: var(--n-color-info-dark);
    }
  }
  
  &--outline {
    background-color: transparent;
    color: var(--n-color-primary);
    border-color: var(--n-color-primary);
    
    &:hover, &:focus {
      background-color: var(--n-color-primary-light);
    }
  }
  
  &--text {
    background-color: transparent;
    color: var(--n-color-primary);
    border-color: transparent;
    
    &:hover, &:focus {
      background-color: var(--n-color-primary-light);
    }
  }
  
  // Größen
  &--xs {
    height: 1.5rem;
    font-size: var(--n-font-size-xs);
    padding: 0 var(--n-spacing-xs);
    border-radius: var(--n-border-radius-sm);
  }
  
  &--sm {
    height: 2rem;
    font-size: var(--n-font-size-sm);
    padding: 0 var(--n-spacing-sm);
    border-radius: var(--n-border-radius-sm);
  }
  
  &--md {
    height: 2.5rem;
    font-size: var(--n-font-size-md);
    padding: 0 var(--n-spacing-md);
    border-radius: var(--n-border-radius);
  }
  
  &--lg {
    height: 3rem;
    font-size: var(--n-font-size-lg);
    padding: 0 var(--n-spacing-lg);
    border-radius: var(--n-border-radius);
  }
  
  &--xl {
    height: 3.5rem;
    font-size: var(--n-font-size-xl);
    padding: 0 var(--n-spacing-xl);
    border-radius: var(--n-border-radius-lg);
  }
  
  // Modifikatoren
  &--block {
    display: flex;
    width: 100%;
  }
  
  &--rounded {
    border-radius: var(--n-border-radius-full);
  }
  
  &--with-icon {
    .n-button__content {
      margin-left: var(--n-spacing-xs);
    }
  }
  
  &--icon-only {
    padding: 0;
    width: calc(var(--button-height, 2.5rem) - var(--n-spacing-xs));
    
    &.n-button--xs {
      width: 1.5rem;
    }
    
    &.n-button--sm {
      width: 2rem;
    }
    
    &.n-button--md {
      width: 2.5rem;
    }
    
    &.n-button--lg {
      width: 3rem;
    }
    
    &.n-button--xl {
      width: 3.5rem;
    }
  }
}
</style>
```

### Input.vue

```vue
<template>
  <div 
    :class="[
      'n-input-wrapper',
      `n-input-wrapper--${size}`,
      { 
        'n-input-wrapper--disabled': disabled,
        'n-input-wrapper--error': error,
        'n-input-wrapper--success': success,
        'n-input-wrapper--with-prefix': $slots.prefix || prefix,
        'n-input-wrapper--with-suffix': $slots.suffix || suffix
      }
    ]"
  >
    <label 
      v-if="label" 
      :for="inputId" 
      class="n-input-label"
    >
      {{ label }}
      <span v-if="required" class="n-input-required">*</span>
    </label>
    
    <div class="n-input-container">
      <div v-if="$slots.prefix || prefix" class="n-input-prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </div>
      
      <input
        :id="inputId"
        ref="inputRef"
        :class="['n-input', { 'n-input--error': error, 'n-input--success': success }]"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :readonly="readonly"
        :name="name"
        :tabindex="tabindex"
        :autocomplete="autocomplete"
        v-bind="$attrs"
        @input="updateValue"
        @blur="handleBlur"
        @focus="handleFocus"
      >
      
      <div v-if="$slots.suffix || suffix" class="n-input-suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </div>
    </div>
    
    <div v-if="$slots.hint || hint || error || success" class="n-input-hint">
      <slot name="hint">
        <span v-if="error" class="n-input-hint--error">{{ error }}</span>
        <span v-else-if="success" class="n-input-hint--success">{{ success }}</span>
        <span v-else-if="hint">{{ hint }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useId } from '@/composables/useId';

// Typen
type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
type InputSize = 'sm' | 'md' | 'lg';
type InputAutocomplete = 'on' | 'off' | 'name' | 'email' | 'username' | 'current-password' | 'new-password' | 'one-time-code' | 'tel' | 'url';

// Props
const props = withDefaults(defineProps<{
  modelValue?: string | number;
  label?: string;
  placeholder?: string;
  type?: InputType;
  size?: InputSize;
  error?: string;
  success?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  name?: string;
  tabindex?: number;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  autocomplete?: InputAutocomplete;
  id?: string;
}>(), {
  modelValue: '',
  type: 'text',
  size: 'md',
  tabindex: 0,
  autocomplete: 'off'
});

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();

// Refs
const inputRef = ref<HTMLInputElement | null>(null);
const { id: generatedId } = useId('input');

// Computed
const inputId = computed(() => props.id || generatedId.value);

// Methods
function updateValue(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function handleBlur(event: FocusEvent) {
  emit('blur', event);
}

function handleFocus(event: FocusEvent) {
  emit('focus', event);
}

// Lifecycle
onMounted(() => {
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus();
  }
});
</script>

<style lang="scss">
.n-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-family: var(--n-font-family);
  
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  // Größen
  &--sm {
    .n-input-container {
      height: 2rem;
    }
    
    .n-input, .n-input-prefix, .n-input-suffix {
      font-size: var(--n-font-size-sm);
    }
    
    .n-input-label {
      font-size: var(--n-font-size-xs);
      margin-bottom: var(--n-spacing-xs);
    }
    
    .n-input-hint {
      font-size: var(--n-font-size-xs);
      margin-top: var(--n-spacing-xs);
    }
  }
  
  &--md {
    .n-input-container {
      height: 2.5rem;
    }
    
    .n-input, .n-input-prefix, .n-input-suffix {
      font-size: var(--n-font-size-md);
    }
    
    .n-input-label {
      font-size: var(--n-font-size-sm);
      margin-bottom: var(--n-spacing-xs);
    }
    
    .n-input-hint {
      font-size: var(--n-font-size-sm);
      margin-top: var(--n-spacing-xs);
    }
  }
  
  &--lg {
    .n-input-container {
      height: 3rem;
    }
    
    .n-input, .n-input-prefix, .n-input-suffix {
      font-size: var(--n-font-size-lg);
    }
    
    .n-input-label {
      font-size: var(--n-font-size-md);
      margin-bottom: var(--n-spacing-sm);
    }
    
    .n-input-hint {
      font-size: var(--n-font-size-md);
      margin-top: var(--n-spacing-sm);
    }
  }
}

.n-input-label {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.n-input-required {
  color: var(--n-color-error);
  margin-left: 2px;
}

.n-input-container {
  position: relative;
  display: flex;
  width: 100%;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-base);
  transition: all var(--n-transition) var(--n-ease);
  
  &:focus-within {
    border-color: var(--n-color-primary);
    box-shadow: 0 0 0 3px rgba(var(--n-color-primary-rgb), 0.4);
  }
  
  .n-input-wrapper--error & {
    border-color: var(--n-color-error);
    
    &:focus-within {
      box-shadow: 0 0 0 3px rgba(var(--n-color-error-rgb), 0.4);
    }
  }
  
  .n-input-wrapper--success & {
    border-color: var(--n-color-success);
    
    &:focus-within {
      box-shadow: 0 0 0 3px rgba(var(--n-color-success-rgb), 0.4);
    }
  }
  
  .n-input-wrapper--disabled & {
    background-color: var(--n-color-background-alt);
    border-color: var(--n-color-border);
    
    &:focus-within {
      box-shadow: none;
    }
  }
}

.n-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0 var(--n-spacing-md);
  color: var(--n-color-text-primary);
  outline: none;
  width: 100%;
  height: 100%;
  
  &::placeholder {
    color: var(--n-color-text-hint);
  }
  
  &:disabled {
    cursor: not-allowed;
  }
}

.n-input-prefix, .n-input-suffix {
  display: flex;
  align-items: center;
  padding: 0 var(--n-spacing-md);
  color: var(--n-color-text-secondary);
}

.n-input-prefix {
  border-right: 1px solid var(--n-color-border);
}

.n-input-suffix {
  border-left: 1px solid var(--n-color-border);
}

.n-input-hint {
  min-height: 1.25rem;
  margin-top: var(--n-spacing-xs);
  font-size: var(--n-font-size-sm);
  color: var(--n-color-text-secondary);
  
  &--error {
    color: var(--n-color-error);
  }
  
  &--success {
    color: var(--n-color-success);
  }
}
</style>
```

## Noch zu implementierende Komponenten

Folgende UI-Basiskomponenten müssen noch vollständig implementiert werden:

1. **Formular-Komponenten**:
   - Checkbox
   - Radio
   - Select
   - TextArea
   - Toggle
   - Form (mit Validierung)
   
2. **Feedback-Komponenten**:
   - Tooltip
   - Badge
   - ProgressBar
   
3. **Navigation**:
   - Breadcrumb
   - Tabs
   - Stepper
   - Pagination (teilweise implementiert)
   
4. **Data-Display**:
   - Table (teilweise implementiert)
   - TreeView
   - Timeline

## Herausforderungen bei der UI-Komponenten-Migration

Bei der Migration der UI-Komponenten sind folgende Herausforderungen aufgetreten:

1. **Design-Inkonsistenz**: Unterschiedliche CSS-Variablen zwischen Legacy- und neuen Komponenten
2. **Theme-Wechsel-Implementierung**: Unterschiedliche Ansätze für Dark-Mode-Unterstützung
3. **Einheitliche Typdefinition**: Einheitliche TypeScript-Typen für alle Komponenten
4. **Komponentendokumentation**: Fehlende oder unvollständige Dokumentation
5. **Testabdeckung**: Geringe Testabdeckung für UI-Komponenten

## Nächste Schritte

1. **CSS-Variablen vereinheitlichen**:
   - Standardisierung der CSS-Variablen-Namen
   - Umstellung auf einheitliches Farbschema
   - Migration zu SCSS für alle Komponenten
   
2. **Vollständiges UI-Komponenten-Kit**:
   - Implementierung der fehlenden Komponenten
   - Einheitliche API für alle Komponenten
   - Vollständige TypeScript-Integration
   
3. **Barrierefreiheit verbessern**:
   - WCAG 2.1 AA-Konformität für alle Komponenten
   - Tastaturbedienung und Screenreader-Unterstützung
   - Fokus-Management in komplexen Komponenten
   
4. **Dokumentation & Storybook**:
   - Interaktive Dokumentation mit Storybook
   - Anwendungsbeispiele für alle Komponenten
   - API-Dokumentation für Entwickler

## Styleguide und Best Practices

### Namenskonventionen

- Komponentendateien: `PascalCase.vue`
- CSS-Klassen: BEM-Notation (`n-component__element--modifier`)
- Props: `camelCase`
- Events: `kebab-case`

### CSS-Variablen

- Alle CSS-Variablen beginnen mit `--n-`
- Farbvariablen: `--n-color-[name]-[variant]`
- Größenvariablen: `--n-size-[name]`
- Spacing-Variablen: `--n-spacing-[size]`

### Komponenten-Schnittstellen

- Klare Definition von Props mit TypeScript
- Verwendung von `defineProps` und `defineEmits`
- Konsistente Event-Emitter für Benutzerinteraktionen
- Slots für flexible Inhalte

---

Zuletzt aktualisiert: 09.05.2025