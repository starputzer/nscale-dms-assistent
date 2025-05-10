---
title: "UI-Basiskomponenten"
version: "2.0.0"
date: "09.05.2025"
lastUpdate: "09.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["UI", "Komponenten", "Design-System"]
---

# UI-Basiskomponenten

> **Letzte Aktualisierung:** 09.05.2025 | **Version:** 2.0.0 | **Status:** Aktiv

## Übersicht

Dieses Dokument beschreibt die UI-Basiskomponenten des nscale DMS Assistenten und das zugehörige Design-System. Die Komponenten sind als Vue 3 Single File Components (SFCs) mit Composition API und TypeScript implementiert.

## 1. Komponentenbibliothek

Die UI-Basiskomponenten bilden das Fundament für alle Benutzeroberflächen des nscale DMS Assistenten. Sie sind modular aufgebaut, stark typisiert und folgen einheitlichen Design-Prinzipien.

### 1.1 Verfügbare Komponenten

| Komponente | Status | Beschreibung | Datei |
|------------|--------|--------------|-------|
| Button | Fertiggestellt | Interaktive Schaltfläche mit verschiedenen Varianten | src/components/ui/base/Button.vue |
| Input | Fertiggestellt | Texteingabefeld mit Validierung | src/components/ui/base/Input.vue |
| Card | Fertiggestellt | Container für inhaltliche Gruppierung | src/components/ui/base/Card.vue |
| Alert | Fertiggestellt | Benachrichtigungskomponente für Systemfeedback | src/components/ui/feedback/Alert.vue |
| Modal | Fertiggestellt | Popup-Dialog für fokussierte Interaktionen | src/components/ui/base/Modal.vue |
| Checkbox | Fertiggestellt | Mehrfachauswahl-Komponente | src/components/ui/base/Checkbox.vue |
| Radio | Fertiggestellt | Einfachauswahl-Komponente | src/components/ui/base/Radio.vue |
| Select | Fertiggestellt | Dropdown-Auswahlkomponente | src/components/ui/base/Select.vue |
| FocusTrap | Fertiggestellt | Hilfsmittel für Barrierefreiheit | src/components/ui/base/FocusTrap.vue |

## 2. Design-System

Das Design-System definiert einheitliche Designprinzipien und -elemente für konsistente Benutzeroberflächen.

### 2.1 Farben

Alle Farben sind als CSS-Variablen definiert und unterstützen Dark Mode:

```css
:root {
  /* Primärfarben */
  --nscale-primary: #0d7a40;
  --nscale-primary-light: #1c9554;
  --nscale-primary-dark: #095a30;
  
  /* Sekundärfarben */
  --nscale-secondary: #3f51b5;
  --nscale-secondary-light: #7986cb;
  --nscale-secondary-dark: #303f9f;
  
  /* Neutrale Farben */
  --nscale-text: #1a202c;
  --nscale-text-secondary: #64748b;
  --nscale-border-color: #e2e8f0;
  --nscale-body-bg: #ffffff;
  --nscale-surface-color: #f8fafc;
  
  /* Status-Farben */
  --nscale-success: #00a550;
  --nscale-error: #e74c3c;
  --nscale-warning: #f39c12;
  --nscale-info: #3498db;
}

.dark-theme {
  /* Dark-Mode-Farbvariablen */
  --nscale-text: #f8f9fa;
  --nscale-text-secondary: #ced4da;
  --nscale-border-color: #495057;
  --nscale-body-bg: #212529;
  --nscale-surface-color: #343a40;
  
  /* Angepasste Primär- und Sekundärfarben für den Dark Mode */
  --nscale-primary: #1c9554;
  --nscale-secondary: #7986cb;
}
```

### 2.2 Typografie

Einheitliche Typografie-Definitionen stellen konsistente Textdarstellung sicher:

```css
:root {
  /* Schriftfamilien */
  --nscale-font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --nscale-font-family-mono: 'Courier New', monospace;
  
  /* Schriftgrößen */
  --nscale-font-size-xs: 0.75rem;   /* 12px */
  --nscale-font-size-sm: 0.875rem;  /* 14px */
  --nscale-font-size-md: 1rem;      /* 16px */
  --nscale-font-size-lg: 1.125rem;  /* 18px */
  --nscale-font-size-xl: 1.25rem;   /* 20px */
  --nscale-font-size-2xl: 1.5rem;   /* 24px */
  --nscale-font-size-3xl: 1.875rem; /* 30px */
  
  /* Schriftstärken */
  --nscale-font-weight-light: 300;
  --nscale-font-weight-normal: 400;
  --nscale-font-weight-medium: 500;
  --nscale-font-weight-semibold: 600;
  --nscale-font-weight-bold: 700;
  
  /* Zeilenhöhen */
  --nscale-line-height-tight: 1.25;
  --nscale-line-height-normal: 1.5;
  --nscale-line-height-relaxed: 1.75;
}
```

### 2.3 Abstände und Layout

Einheitliche Abstände sorgen für konsistente Layoutstruktur:

```css
:root {
  /* Abstände */
  --nscale-space-1: 0.25rem;  /* 4px */
  --nscale-space-2: 0.5rem;   /* 8px */
  --nscale-space-3: 0.75rem;  /* 12px */
  --nscale-space-4: 1rem;     /* 16px */
  --nscale-space-5: 1.25rem;  /* 20px */
  --nscale-space-6: 1.5rem;   /* 24px */
  --nscale-space-8: 2rem;     /* 32px */
  --nscale-space-10: 2.5rem;  /* 40px */
  --nscale-space-12: 3rem;    /* 48px */
  --nscale-space-16: 4rem;    /* 64px */
  
  /* Schatten */
  --nscale-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --nscale-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --nscale-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  /* Ränder */
  --nscale-border-radius-sm: 0.125rem; /* 2px */
  --nscale-border-radius-md: 0.375rem; /* 6px */
  --nscale-border-radius-lg: 0.5rem;   /* 8px */
  --nscale-border-width: 1px;
}
```

### 2.4 Responsive Breakpoints

Die Anwendung verwendet folgende Breakpoints für responsive Designs:

```css
/* Responsive Breakpoints */
:root {
  --breakpoint-sm: 640px;  /* Small screens: smartphones portrait */
  --breakpoint-md: 768px;  /* Medium screens: tablets, smartphones landscape */
  --breakpoint-lg: 1024px; /* Large screens: small laptops */
  --breakpoint-xl: 1280px; /* Extra large screens: laptops, desktops */
  --breakpoint-2xl: 1536px; /* 2X large screens: large desktops */
}
```

## 3. Komponenten-Details

### 3.1 Button-Komponente

Die Button-Komponente unterstützt verschiedene Varianten, Größen und Zustände.

#### Implementierungsdetails

```vue
<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    :type="type"
    :aria-busy="loading"
    v-bind="$attrs"
    @click="handleClick"
  >
    <div class="n-button__content">
      <span v-if="loading" class="n-button__spinner" aria-hidden="true"></span>
      <span 
        :class="{ 'n-button__content-shifted': loading && loadingPosition === 'left' }"
      >
        <slot></slot>
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type LoadingPosition = 'left' | 'center';

interface Props {
  /** Button-Variante */
  variant?: ButtonVariant;
  /** Button-Größe */
  size?: ButtonSize;
  /** Button-Typ */
  type?: ButtonType;
  /** Gibt an, ob der Button deaktiviert ist */
  disabled?: boolean;
  /** Gibt an, ob der Button einen Ladezustand anzeigt */
  loading?: boolean;
  /** Position des Ladeindikators */
  loadingPosition?: LoadingPosition;
  /** Button wurde ausgelöst */
  onClick?: () => void;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  loadingPosition: 'left'
});

// Emit-Definition
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// Berechnete CSS-Klassen basierend auf Props
const buttonClasses = computed(() => [
  'n-button',
  `n-button--${props.variant}`,
  `n-button--${props.size}`,
  {
    'n-button--disabled': props.disabled,
    'n-button--loading': props.loading
  }
]);

// Event-Handler für den Klick
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault();
    return;
  }
  
  emit('click', event);
  
  if (props.onClick) {
    props.onClick();
  }
};
</script>

<style scoped>
.n-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--nscale-font-family);
  font-weight: var(--nscale-font-weight-medium);
  border-radius: var(--nscale-border-radius-md);
  transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  overflow: hidden;
  text-decoration: none;
  position: relative;
  border: var(--nscale-border-width) solid transparent;
}

/* Varianten */
.n-button--primary {
  background-color: var(--nscale-primary);
  color: white;
}

.n-button--primary:hover:not(.n-button--disabled) {
  background-color: var(--nscale-primary-dark);
}

.n-button--secondary {
  background-color: var(--nscale-secondary);
  color: white;
}

.n-button--secondary:hover:not(.n-button--disabled) {
  background-color: var(--nscale-secondary-dark);
}

.n-button--tertiary {
  background-color: transparent;
  border-color: var(--nscale-border-color);
  color: var(--nscale-text);
}

.n-button--tertiary:hover:not(.n-button--disabled) {
  background-color: var(--nscale-surface-color);
}

.n-button--danger {
  background-color: var(--nscale-error);
  color: white;
}

.n-button--danger:hover:not(.n-button--disabled) {
  background-color: #c0392b;
}

.n-button--text {
  background-color: transparent;
  color: var(--nscale-primary);
  padding-left: 0;
  padding-right: 0;
}

.n-button--text:hover:not(.n-button--disabled) {
  color: var(--nscale-primary-dark);
  text-decoration: underline;
}

/* Größen */
.n-button--sm {
  padding: var(--nscale-space-1) var(--nscale-space-2);
  font-size: var(--nscale-font-size-sm);
}

.n-button--md {
  padding: var(--nscale-space-2) var(--nscale-space-4);
  font-size: var(--nscale-font-size-md);
}

.n-button--lg {
  padding: var(--nscale-space-3) var(--nscale-space-6);
  font-size: var(--nscale-font-size-lg);
}

/* Zustände */
.n-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.n-button--loading {
  position: relative;
}

.n-button__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--nscale-space-2);
}

.n-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: button-spinner 0.7s linear infinite;
}

.n-button__content-shifted {
  transform: translateX(var(--nscale-space-2));
}

@keyframes button-spinner {
  to { transform: rotate(360deg); }
}
</style>
```

#### Verwendungsbeispiel

```vue
<template>
  <div class="button-demo">
    <!-- Varianten -->
    <n-button>Standard Primärbutton</n-button>
    <n-button variant="secondary">Sekundärbutton</n-button>
    <n-button variant="tertiary">Tertiärbutton</n-button>
    <n-button variant="danger">Gefahrenbutton</n-button>
    <n-button variant="text">Textbutton</n-button>
    
    <!-- Größen -->
    <n-button size="sm">Kleiner Button</n-button>
    <n-button>Standardgröße</n-button>
    <n-button size="lg">Großer Button</n-button>
    
    <!-- Zustände -->
    <n-button disabled>Deaktivierter Button</n-button>
    <n-button loading>Ladender Button</n-button>
    
    <!-- Mit Icon -->
    <n-button>
      <i class="fas fa-save"></i> Speichern
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton } from '@/components/ui/base';
</script>
```

### 3.2 Input-Komponente

Die Input-Komponente unterstützt verschiedene Eingabetypen, Validierung und States.

#### Implementierungsdetails

```vue
<template>
  <div :class="['n-input-container', {'n-input--error': hasError}]">
    <label v-if="label" :for="inputId" class="n-input__label">
      {{ label }}
      <span v-if="required" class="n-input__required">*</span>
    </label>
    
    <div class="n-input__wrapper">
      <input
        :id="inputId"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? errorId : undefined"
        v-bind="$attrs"
        class="n-input"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <!-- Slot for icons or buttons -->
      <div v-if="$slots.append" class="n-input__append">
        <slot name="append" />
      </div>
    </div>
    
    <div 
      v-if="hasError" 
      :id="errorId" 
      class="n-input__error"
      role="alert"
    >
      {{ error }}
    </div>
    
    <div v-if="hint && !hasError" class="n-input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { uniqueId } from '@/utils/uuidUtil';

export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date';

interface Props {
  /** Aktueller Wert des Inputs (v-model) */
  modelValue: string | number;
  /** Typ des Inputs */
  type?: InputType;
  /** Label für den Input */
  label?: string;
  /** Platzhaltertext */
  placeholder?: string;
  /** Hinweistext unter dem Input */
  hint?: string;
  /** Fehlermeldung */
  error?: string;
  /** Gibt an, ob der Input deaktiviert ist */
  disabled?: boolean;
  /** Gibt an, ob der Input schreibgeschützt ist */
  readonly?: boolean;
  /** Gibt an, ob der Input erforderlich ist */
  required?: boolean;
  /** Gibt an, ob der Input automatisch fokussiert werden soll */
  autofocus?: boolean;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  label: undefined,
  placeholder: '',
  hint: undefined,
  error: undefined,
  disabled: false,
  readonly: false,
  required: false,
  autofocus: false
});

// Emit-Definition
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();

// Eindeutige IDs für Accessibility
const inputId = uniqueId('input-');
const errorId = uniqueId('input-error-');
const inputRef = ref<HTMLInputElement | null>(null);

// Berechnete Eigenschaften
const hasError = computed(() => !!props.error);

// Event-Handler
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value: string | number = target.value;
  
  // Für number-Input in eine Zahl konvertieren
  if (props.type === 'number' && value !== '') {
    value = Number(value);
  }
  
  emit('update:modelValue', value);
};

const handleBlur = (event: FocusEvent) => {
  emit('blur', event);
};

const handleFocus = (event: FocusEvent) => {
  emit('focus', event);
};

// Autofokus
onMounted(() => {
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus();
  }
});
</script>

<style scoped>
.n-input-container {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--nscale-space-4);
}

.n-input__label {
  font-size: var(--nscale-font-size-sm);
  font-weight: var(--nscale-font-weight-medium);
  color: var(--nscale-text);
  margin-bottom: var(--nscale-space-1);
}

.n-input__required {
  color: var(--nscale-error);
  margin-left: var(--nscale-space-1);
}

.n-input__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.n-input {
  width: 100%;
  font-family: var(--nscale-font-family);
  font-size: var(--nscale-font-size-md);
  color: var(--nscale-text);
  padding: var(--nscale-space-2) var(--nscale-space-3);
  border: var(--nscale-border-width) solid var(--nscale-border-color);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-body-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.n-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(13, 122, 64, 0.2);
}

.n-input:disabled {
  background-color: var(--nscale-surface-color);
  cursor: not-allowed;
  opacity: 0.7;
}

.n-input--error .n-input {
  border-color: var(--nscale-error);
}

.n-input--error .n-input:focus {
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.n-input__append {
  position: absolute;
  right: var(--nscale-space-3);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.n-input__error {
  font-size: var(--nscale-font-size-sm);
  color: var(--nscale-error);
  margin-top: var(--nscale-space-1);
}

.n-input__hint {
  font-size: var(--nscale-font-size-sm);
  color: var(--nscale-text-secondary);
  margin-top: var(--nscale-space-1);
}
</style>
```

#### Verwendungsbeispiel

```vue
<template>
  <div class="input-demo">
    <!-- Einfacher Input -->
    <n-input 
      v-model="username" 
      label="Benutzername" 
      placeholder="Benutzernamen eingeben" 
      required
    />
    
    <!-- Input mit Fehler -->
    <n-input 
      v-model="email" 
      type="email" 
      label="E-Mail" 
      error="Bitte geben Sie eine gültige E-Mail ein" 
    />
    
    <!-- Passwort-Input mit sichtbarem Icon -->
    <n-input 
      v-model="password" 
      :type="passwordVisible ? 'text' : 'password'" 
      label="Passwort"
    >
      <template #append>
        <button 
          type="button" 
          class="password-toggle"
          @click="passwordVisible = !passwordVisible"
        >
          <i :class="passwordVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
        </button>
      </template>
    </n-input>
    
    <!-- Deaktivierter Input -->
    <n-input 
      v-model="readonlyValue"
      label="Nur-Lesen" 
      readonly
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NInput } from '@/components/ui/base';

const username = ref('');
const email = ref('');
const password = ref('');
const readonlyValue = ref('Nur-Lesen-Wert');
const passwordVisible = ref(false);
</script>
```

## 4. Theme-System und Dark Mode

Das Theme-System ermöglicht es, die Farben der Anwendung dynamisch zu ändern und einen Dark Mode zu unterstützen.

### 4.1 Theme-Switching-Implementierung

Das Theme-System verwendet CSS-Variablen und eine zentrale Theme-Managementfunktion:

```typescript
// src/composables/useTheme.ts
import { ref, watch, onMounted } from 'vue';
import { useStorage } from '@vueuse/core';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const storedTheme = useStorage<Theme>('nscale-theme', 'system');
  const currentTheme = ref<Theme>(storedTheme.value);
  const systemTheme = ref<'light' | 'dark'>('light');
  
  // Aktuelle Theme basierend auf System oder Benutzerauswahl
  const effectiveTheme = computed(() => {
    return currentTheme.value === 'system' ? systemTheme.value : currentTheme.value;
  });
  
  // System-Präferenz überwachen
  const updateSystemTheme = () => {
    systemTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  
  // Theme im DOM aktualisieren
  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    
    // Event auslösen, um andere Komponenten zu benachrichtigen
    window.dispatchEvent(new CustomEvent('nscale-theme-changed', { detail: { theme } }));
  };
  
  // Theme setzen
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    storedTheme.value = theme;
  };
  
  // Theme reaktiv aktualisieren
  watch(effectiveTheme, (newTheme) => {
    applyTheme(newTheme);
  });
  
  // System-Theme-Änderungen überwachen
  onMounted(() => {
    updateSystemTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateSystemTheme);
    
    // Initiales Theme anwenden
    applyTheme(effectiveTheme.value);
    
    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme);
    };
  });
  
  return {
    currentTheme,
    effectiveTheme,
    setTheme
  };
}
```

### 4.2 ThemeSwitcher-Komponente

Die ThemeSwitcher-Komponente ermöglicht Benutzern, zwischen den verfügbaren Themes zu wechseln:

```vue
<template>
  <div class="n-theme-switcher">
    <button 
      v-for="option in themeOptions" 
      :key="option.value"
      :class="[
        'n-theme-switcher__option',
        { 'n-theme-switcher__option--active': currentTheme === option.value }
      ]"
      @click="setTheme(option.value)"
      :aria-pressed="currentTheme === option.value"
    >
      <span class="n-theme-switcher__icon" aria-hidden="true">
        <i :class="option.icon"></i>
      </span>
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

const { currentTheme, setTheme } = useTheme();

const themeOptions = [
  { value: 'light', label: 'Hell', icon: 'fas fa-sun' },
  { value: 'dark', label: 'Dunkel', icon: 'fas fa-moon' },
  { value: 'system', label: 'System', icon: 'fas fa-desktop' }
];
</script>

<style scoped>
.n-theme-switcher {
  display: flex;
  border-radius: var(--nscale-border-radius-md);
  border: var(--nscale-border-width) solid var(--nscale-border-color);
  overflow: hidden;
}

.n-theme-switcher__option {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
  padding: var(--nscale-space-2) var(--nscale-space-3);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nscale-text-secondary);
  transition: background-color 0.2s, color 0.2s;
}

.n-theme-switcher__option--active {
  background-color: var(--nscale-primary);
  color: white;
}

.n-theme-switcher__option:not(.n-theme-switcher__option--active):hover {
  background-color: var(--nscale-surface-color);
  color: var(--nscale-text);
}

.n-theme-switcher__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

## 5. Barrierefreiheit (Accessibility)

Alle UI-Komponenten wurden mit Barrierefreiheitsfeatures implementiert:

### 5.1 Implementierte Accessibility-Features

- **ARIA-Attribute**: Alle Komponenten verwenden geeignete ARIA-Attribute
- **Keyboard-Navigation**: Vollständige Unterstützung für Keyboard-Navigation
- **Fokus-Management**: Visuelles Fokus-Feedback und logischer Tab-Order
- **Screenreader-Unterstützung**: Geeignete Labels und Beschreibungen für Screenreader
- **Farbkontrast**: Alle Farben erfüllen WCAG 2.1 AA-Anforderungen für Kontrast

### 5.2 Beispiel: FocusTrap-Komponente

Die FocusTrap-Komponente verhindert, dass der Fokus eine Modal-Komponente verlässt:

```vue
<template>
  <div ref="rootRef">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

interface Props {
  /** Gibt an, ob die Focus-Trap aktiv ist */
  active?: boolean;
  /** Gibt an, ob der erste focussierbare Element automatisch fokussiert werden soll */
  autoFocus?: boolean;
  /** Gibt an, ob der Fokus beim Schließen zurückgesetzt werden soll */
  restoreFocus?: boolean;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  active: true,
  autoFocus: true,
  restoreFocus: true
});

// Referenz zum Root-Element
const rootRef = ref<HTMLElement | null>(null);
// Speichert das aktive Element vor der Focus-Trap
const previouslyFocused = ref<HTMLElement | null>(null);

// Alle fokussierbaren Elemente finden
const getFocusableElements = (): HTMLElement[] => {
  if (!rootRef.value) return [];
  
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  
  return Array.from(rootRef.value.querySelectorAll(selector)) as HTMLElement[];
};

// Fokus auf das erste Element setzen
const focusFirstElement = () => {
  const elements = getFocusableElements();
  if (elements.length > 0) {
    elements[0].focus();
  } else if (rootRef.value) {
    // Wenn keine fokussierbaren Elemente vorhanden sind, setze den Fokus auf das Root-Element
    rootRef.value.setAttribute('tabindex', '-1');
    rootRef.value.focus();
  }
};

// Tab-Taste abfangen und in der Trap halten
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.active || event.key !== 'Tab') return;
  
  const elements = getFocusableElements();
  if (elements.length === 0) return;
  
  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];
  
  // Shift+Tab auf erstem Element: Zum letzten Element wechseln
  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    event.preventDefault();
  } 
  // Tab auf letztem Element: Zum ersten Element wechseln
  else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    event.preventDefault();
  }
};

// Trap aktivieren/deaktivieren
const setupTrap = () => {
  if (props.active) {
    document.addEventListener('keydown', handleKeydown);
    
    if (props.autoFocus) {
      previouslyFocused.value = document.activeElement as HTMLElement;
      focusFirstElement();
    }
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
};

// Fokus zurücksetzen
const restorePreviousFocus = () => {
  if (props.restoreFocus && previouslyFocused.value) {
    previouslyFocused.value.focus();
  }
};

// Lifecycle-Hooks
onMounted(() => {
  setupTrap();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  restorePreviousFocus();
});

// Aktivierungszustand überwachen
watch(() => props.active, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown);
    if (props.autoFocus) {
      focusFirstElement();
    }
  } else {
    document.removeEventListener('keydown', handleKeydown);
    if (props.restoreFocus) {
      restorePreviousFocus();
    }
  }
});
</script>
```

## 6. Komponententests

Alle UI-Basiskomponenten verfügen über Unit-Tests, die die Funktionalität und API-Konsistenz sicherstellen.

### 6.1 Beispiel: Button-Komponententest

```typescript
// src/components/ui/base/__tests__/Button.spec.ts
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button.vue';

describe('Button', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Test Button'
      }
    });
    
    expect(wrapper.text()).toBe('Test Button');
    expect(wrapper.classes()).toContain('n-button');
    expect(wrapper.classes()).toContain('n-button--primary');
    expect(wrapper.classes()).toContain('n-button--md');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.attributes('disabled')).toBeUndefined();
  });
  
  it('renders with custom variant', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'secondary'
      },
      slots: {
        default: 'Secondary Button'
      }
    });
    
    expect(wrapper.classes()).toContain('n-button--secondary');
  });
  
  it('renders with custom size', () => {
    const wrapper = mount(Button, {
      props: {
        size: 'lg'
      },
      slots: {
        default: 'Large Button'
      }
    });
    
    expect(wrapper.classes()).toContain('n-button--lg');
  });
  
  it('renders as disabled', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    });
    
    expect(wrapper.classes()).toContain('n-button--disabled');
    expect(wrapper.attributes('disabled')).toBeDefined();
  });
  
  it('renders with loading state', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      },
      slots: {
        default: 'Loading Button'
      }
    });
    
    expect(wrapper.classes()).toContain('n-button--loading');
    expect(wrapper.find('.n-button__spinner').exists()).toBe(true);
    expect(wrapper.attributes('aria-busy')).toBe('true');
  });
  
  it('emits click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Clickable Button'
      }
    });
    
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')!.length).toBe(1);
  });
  
  it('does not emit click event when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    });
    
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });
  
  it('does not emit click event when loading', async () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      },
      slots: {
        default: 'Loading Button'
      }
    });
    
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });
  
  it('calls onClick prop function when clicked', async () => {
    const onClick = vi.fn();
    const wrapper = mount(Button, {
      props: {
        onClick
      },
      slots: {
        default: 'Button with onClick'
      }
    });
    
    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## 7. Bekannte Einschränkungen und weitere Entwicklung

### 7.1 Bekannte Einschränkungen

- **IE11-Support**: Die Komponenten unterstützen Internet Explorer 11 nicht, da sie moderne CSS-Features verwenden.
- **Komplexe Formulare**: Für komplexe Formulare werden noch FormGroup- und FormControl-Komponenten benötigt.
- **Datenpicker**: Die Datenpicker-Komponente ist noch in Entwicklung.
- **Internationaliserung**: Die i18n-Unterstützung muss noch vollständig implementiert werden.

### 7.2 Geplante Weiterentwicklung

1. **Erweiterte Formular-Komponenten**: 
   - Autocomplete
   - Multiselect
   - Datepicker
   - File Upload mit Drag & Drop

2. **Verbesserte Barrierefreiheit**:
   - WCAG 2.1 AA-Konformität für alle Komponenten
   - Erweiterte Screenreader-Unterstützung
   - Reduzierte Bewegung für Animationen

3. **Optimierte Mobile-Unterstützung**:
   - Touch-optimierte Varianten
   - Responsive Anpassungen für kleine Bildschirme
   - Optimierte Eingabefelder für Mobilgeräte

---

*Dieses Dokument beschreibt die aktuellsten UI-Basiskomponenten und das Design-System. Bei Fragen wenden Sie sich an das Entwicklungsteam.*