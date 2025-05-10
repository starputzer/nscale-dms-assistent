---
title: "UI-Basiskomponenten"
version: "1.4.0"
date: "09.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["UI", "Komponenten", "Design", "Vue3"]
---

# UI-Basiskomponenten

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.4.0 | **Status:** Aktiv

## Übersicht

Die UI-Basiskomponenten bilden das Fundament der nscale DMS Assistent-Benutzeroberfläche und wurden als Teil der Vue 3 SFC-Migration implementiert. Sie bieten ein konsistentes Design und Verhalten über die gesamte Anwendung hinweg. Der aktuelle Fertigstellungsgrad der UI-Basiskomponenten liegt bei ca. 90% nach der Implementierung weiterer wichtiger UI-Elemente wie Badge, Breadcrumb, ProgressBar, Tabs und Stepper.

## Implementierte Komponenten

| Komponente | Status | Implementierungsgrad | Layout-Übereinstimmung |
|------------|--------|----------------------|------------------------|
| **Button.vue** | Fertiggestellt | 95% | Hoch |
| **Input.vue** | Fertiggestellt | 90% | Hoch |
| **TextArea.vue** | Fertiggestellt | 100% | Hoch |
| **Toggle.vue** | Fertiggestellt | 100% | Hoch |
| **Tooltip.vue** | Fertiggestellt | 100% | Hoch |
| **Badge.vue** | Fertiggestellt | 100% | Hoch |
| **Breadcrumb.vue** | Fertiggestellt | 100% | Hoch |
| **ProgressBar.vue** | Fertiggestellt | 100% | Hoch |
| **Tabs.vue** | Fertiggestellt | 100% | Hoch |
| **Stepper.vue** | Fertiggestellt | 100% | Hoch |
| **Card.vue** | Fertiggestellt | 85% | Hoch |
| **Alert.vue** | Fertiggestellt | 80% | Hoch |
| **Modal.vue** | Fertiggestellt | 70% | Mittel |
| **ErrorBoundary.vue** | Fertiggestellt | 95% | N/A |
| **FeatureWrapper.vue** | Fertiggestellt | 90% | N/A |
| **Dialog.vue** | Fertiggestellt | 70% | Mittel |
| **Toast.vue** | Fertiggestellt | 80% | Mittel |
| **SettingsPanel.vue** | Fertiggestellt | 100% | Hoch |
| **AppearanceSettings.vue** | Fertiggestellt | 100% | Hoch |
| **NotificationSettings.vue** | Fertiggestellt | 100% | Hoch |
| **PrivacySettings.vue** | Fertiggestellt | 100% | Hoch |
| **AccessibilitySettings.vue** | Fertiggestellt | 100% | Hoch |

## Komponenten-Verzeichnisstruktur

```
src/components/
├── ui/                 # Allgemeine UI-Komponenten
│   ├── base/           # Grundlegende UI-Elemente
│   │   ├── Button.vue
│   │   ├── Input.vue
│   │   ├── TextArea.vue
│   │   ├── Toggle.vue
│   │   ├── Tooltip.vue
│   │   ├── Badge.vue
│   │   ├── Breadcrumb.vue
│   │   ├── ProgressBar.vue
│   │   ├── Tabs.vue
│   │   ├── Stepper.vue
│   │   ├── Card.vue
│   │   ├── Alert.vue
│   │   ├── Modal.vue
│   │   ├── FocusTrap.vue
│   │   └── index.ts    # Komponenten-Export
│   ├── examples/       # Beispiel-Implementierungen
│   │   ├── TextAreaExample.vue
│   │   ├── ToggleExample.vue
│   │   ├── TooltipExample.vue
│   │   ├── BadgeExample.vue
│   │   ├── BreadcrumbExample.vue
│   │   ├── ProgressBarExample.vue
│   │   ├── TabsExample.vue
│   │   ├── StepperExample.vue
│   │   ├── UIComponentsDemo.vue
│   │   ├── index.ts    # Beispiel-Export
│   │   └── README.md   # Dokumentation für Beispielverwendung
│   ├── feedback/       # Feedback-bezogene Komponenten
│   │   └── Alert.vue
│   ├── data/           # Daten-bezogene Komponenten
│   │   ├── Table.vue
│   │   ├── Pagination.vue
│   │   └── List.vue
│   ├── layout/         # Layout-Komponenten
│   │   ├── Container.vue
│   │   ├── Row.vue
│   │   └── Col.vue
│   ├── Dialog.vue      # Dialoge und Modals
│   ├── Toast.vue       # Toast-Benachrichtigungen
│   ├── ToastContainer.vue
│   ├── LoadingOverlay.vue
│   ├── Notification.vue
│   └── index.ts        # Haupt-Export aller UI-Komponenten
└── settings/           # Einstellungsbezogene Komponenten
    ├── SettingsPanel.vue
    ├── AppearanceSettings.vue
    ├── NotificationSettings.vue
    ├── PrivacySettings.vue
    └── AccessibilitySettings.vue
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

## Komponenten-Beispiele und Demos

Für alle UI-Komponenten wurden interaktive Beispiele erstellt, die unter `src/components/ui/examples/` zu finden sind. Diese Beispiele demonstrieren die verschiedenen Funktionen und Konfigurationsmöglichkeiten jeder Komponente.

### Verwendung der Beispielkomponenten

Die Beispiele können wie folgt verwendet werden:

```vue
<template>
  <div>
    <UIComponentsDemo />
  </div>
</template>

<script setup>
import { UIComponentsDemo } from '@/components/ui/examples';
</script>
```

Alternativ können auch einzelne Beispielkomponenten importiert werden:

```vue
<template>
  <div>
    <TextAreaExample />
    <ToggleExample />
    <TooltipExample />
  </div>
</template>

<script setup>
import { TextAreaExample, ToggleExample, TooltipExample } from '@/components/ui/examples';
</script>
```

### Demo-Route hinzufügen

Um die Beispiele über eine eigene Route verfügbar zu machen, kann folgende Konfiguration zum Router hinzugefügt werden:

```typescript
// In router/index.ts
import { UIComponentsDemo } from '@/components/ui/examples';

const routes = [
  // ... bestehende Routen
  {
    path: '/ui-components-demo',
    name: 'UIComponentsDemo',
    component: UIComponentsDemo
  }
];
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

## SettingsPanel und Einstellungs-Komponenten

Das SettingsPanel bietet eine zentrale Benutzeroberfläche zur Verwaltung aller Anwendungseinstellungen. 

### SettingsPanel

Die `SettingsPanel`-Komponente ist ein Container für verschiedene Einstellungskategorien mit einer einheitlichen Navigation.

**Eigenschaften:**
- `isVisible`: Steuert die Sichtbarkeit des Panels
- `activeCategory` (intern): Aktuell ausgewählte Kategorie

**Events:**
- `close`: Wird ausgelöst, wenn das Panel geschlossen wird
- `save`: Wird ausgelöst, wenn Einstellungen gespeichert werden

**Beispiel:**
```vue
<SettingsPanel 
  :isVisible="showSettings" 
  @close="showSettings = false" 
  @save="handleSettingsSaved" 
/>
```

### AppearanceSettings

Die `AppearanceSettings`-Komponente ermöglicht die Anpassung des Erscheinungsbilds der Anwendung.

**Features:**
- Themenwahl (Hell/Dunkel und vordefinierte Designs)
- Schriftgröße und Schriftart-Einstellungen
- Zeilenhöhenanpassung
- Erstellung benutzerdefinierter Themes

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### NotificationSettings

Die `NotificationSettings`-Komponente steuert alle Benachrichtigungseinstellungen.

**Features:**
- Globales Ein-/Ausschalten von Benachrichtigungen
- Tonbenachrichtigungen
- Desktop-Benachrichtigungen mit Berechtigungsanfrage
- Einstellungen für verschiedene Benachrichtigungstypen (Session-Abschluss, Erwähnungen)
- Test-Funktion für Benachrichtigungen

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### PrivacySettings

Die `PrivacySettings`-Komponente verwaltet datenschutzbezogene Einstellungen.

**Features:**
- Datenspeicherungsoptionen (Chat-Verläufe, Einstellungen)
- Einstellungen für Analytik und Fehlerberichte
- Cookie-Management
- Funktionen zum Löschen des Chat-Verlaufs
- Datenexport-Funktionalität
- Option zum Entfernen aller gespeicherten Daten

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

### AccessibilitySettings

Die `AccessibilitySettings`-Komponente verbessert die Zugänglichkeit der Anwendung.

**Features:**
- Reduzierte Bewegungen für Animationen
- Hochkontrastmodus
- Textgrößenanpassungen
- Screenreader-Unterstützung
- Tastaturkürzel-Optionen
- Verbesserte Fokusanzeigen

**Events:**
- `apply-settings`: Wird ausgelöst, wenn Einstellungen geändert werden
- `reset`: Wird ausgelöst, wenn Einstellungen zurückgesetzt werden

## Integration des SettingsPanel

Die Einstellungskomponenten sind vollständig in das Vue 3 SFC-System integriert und nutzen:

- Pinia-Store (`useSettingsStore`) zur zentralen Verwaltung aller Einstellungen
- TypeScript-Interfaces für typsichere Einstellungsobjekte
- Lokalspeicher zur persistenten Datenspeicherung
- Reaktivität für sofortige Änderungen
- Responsive Design für alle Bildschirmgrößen
- I18n für mehrsprachige Unterstützung

## Verbindung zur SettingsView

Die `SettingsView` integriert das SettingsPanel in die Anwendung und bietet:

- Übersichtsseite mit Karten für die verschiedenen Einstellungskategorien
- Shortcuts für häufig verwendete Einstellungen
- Systeminformationen
- Toggle zum Ein-/Ausblenden des SettingsPanels

## Noch zu implementierende Komponenten

Folgende UI-Basiskomponenten müssen noch vollständig implementiert werden:

1. **Formular-Komponenten**:
   - Form (mit Validierung)

2. **Data-Display**:
   - TreeView
   - Timeline

3. **Navigation**:
   - Pagination (teilweise implementiert)

Hinweis: Alle bisher als fehlend markierten Komponenten (Badge, Breadcrumb, ProgressBar, Tabs, Stepper) wurden in der aktuellen Version implementiert und stehen nun zur Verfügung.

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
   - Implementierung der verbleibenden Komponenten (Form, TreeView, Timeline)
   - Verbesserung der teilweise implementierten Komponenten (Pagination, Table)
   - Einheitliche API für alle Komponenten

3. **Barrierefreiheit verbessern**:
   - WCAG 2.1 AA-Konformität für alle Komponenten
   - Tastaturbedienung und Screenreader-Unterstützung
   - Fokus-Management in komplexen Komponenten

4. **Dokumentation & Storybook**:
   - Interaktive Dokumentation mit Storybook
   - Weitere Anwendungsbeispiele und Integrations-Muster
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

Zuletzt aktualisiert: 10.05.2025