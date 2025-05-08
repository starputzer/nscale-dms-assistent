# Komponenten-Leitfaden

Dieser Leitfaden beschreibt die wichtigsten Komponenten des nscale DMS Assistant und deren Verwendung. Er dient als Referenz für Entwickler, die an dem Projekt arbeiten.

## Inhaltsverzeichnis

1. [Allgemeine Richtlinien](#allgemeine-richtlinien)
2. [Core-Komponenten](#core-komponenten)
3. [Feature-Wrapper](#feature-wrapper)
4. [Error-Boundary und Fallback-Mechanismus](#error-boundary-und-fallback-mechanismus)
5. [UI-Komponenten](#ui-komponenten)
6. [Formular-Komponenten](#formular-komponenten)

## Allgemeine Richtlinien

### Komponenten-Struktur

Alle Komponenten sollten einer einheitlichen Struktur folgen:

```vue
<template>
  <!-- HTML/Template-Teil -->
</template>

<script setup lang="ts">
// Imports
import { ... } from 'vue';
import { ... } from '@/...';

// Props definieren
interface Props {
  prop1: string;
  prop2?: number;
}

const props = withDefaults(defineProps<Props>(), {
  prop2: 0
});

// Emits definieren
const emit = defineEmits<{
  (e: 'update', value: string): void;
  (e: 'action'): void;
}>();

// Rest der Komponenten-Logik
// ...
</script>

<style scoped>
/* CSS für die Komponente */
</style>
```

### Namenskonventionen

- Komponentennamen sollten PascalCase sein (z.B. `ButtonComponent.vue`)
- SFC-basierte Komponenten sollten mit "Sfc" prefixed werden (z.B. `SfcDocConverter.vue`)
- Props und Emits sollten camelCase sein
- CSS-Klassen sollten kebab-case sein

## Core-Komponenten

### AppLayout

Die Haupt-Layout-Komponente, die die grundlegende Struktur der Anwendung definiert.

```vue
<AppLayout>
  <template #header>
    <!-- Header-Inhalt -->
  </template>
  
  <template #sidebar>
    <!-- Sidebar-Inhalt -->
  </template>
  
  <template #main>
    <!-- Hauptinhalt -->
  </template>
  
  <template #footer>
    <!-- Footer-Inhalt -->
  </template>
</AppLayout>
```

### FeatureWrapper

Komponente zur bedingten Rendering von Features basierend auf Feature-Flags.

```vue
<FeatureWrapper
  feature="useNewUIComponents"
  :fallback="LegacyComponent"
>
  <NewComponent />
</FeatureWrapper>
```

## Feature-Wrapper

### EnhancedFeatureWrapper

Erweiterte Version des FeatureWrappers mit Fallback-Mechanismus.

```vue
<EnhancedFeatureWrapper
  feature="useSfcDocConverter"
  :new-component="SfcDocConverter"
  :legacy-component="LegacyDocConverter"
  fallback-strategy="threshold"
  :error-threshold="3"
  @feature-error="handleError"
>
  <!-- Slots werden an die aktive Komponente weitergeleitet -->
</EnhancedFeatureWrapper>
```

**Props:**

- `feature`: Name des Feature-Flags (z.B. 'useSfcDocConverter')
- `newComponent`: Die neue SFC-Komponente bei aktiviertem Feature
- `legacyComponent`: Die Legacy-Komponente als Fallback
- `intermediateComponent`: Optionale intermediäre Komponente für progressive Fallbacks
- `fallbackStrategy`: Strategie für Fallback-Aktivierung ('immediate', 'threshold', 'progressive', 'manual')
- `errorThreshold`: Schwellwert für Fehleranzahl vor Fallback
- `retryInterval`: Zeitintervall für automatische Wiederholungsversuche (in ms)
- `useIntermediateFailover`: Ob die intermediäre Komponente verwendet werden soll bei Fehlern

**Events:**

- `feature-error`: Ausgelöst, wenn ein Fehler in der Komponente auftritt
- `feature-fallback`: Ausgelöst, wenn der Fallback aktiviert wird
- `feature-retry`: Ausgelöst, wenn ein Wiederholungsversuch stattfindet
- `component-mounted`: Ausgelöst, wenn eine Komponente gemountet wird

## Error-Boundary und Fallback-Mechanismus

### ErrorBoundary

Generische Komponente zur Fehlerbehandlung.

```vue
<ErrorBoundary
  feature-flag="useSfcDocConverter"
  fallback-strategy="threshold"
  :error-threshold="3"
  @error="handleError"
>
  <!-- Standard-Inhalt -->
  <YourComponent />
  
  <!-- Fehler-Zustand -->
  <template #error="{ error, retry }">
    <div class="error-display">
      <p>Fehler: {{ error.message }}</p>
      <button @click="retry">Erneut versuchen</button>
    </div>
  </template>
  
  <!-- Fallback-Zustand -->
  <template #fallback="{ resetFallback }">
    <div class="fallback">
      <p>Fallback-Komponente</p>
      <button @click="resetFallback">Zurücksetzen</button>
    </div>
  </template>
</ErrorBoundary>
```

**Props:**

- `featureFlag`: Feature-Flag, das diese Komponente steuert
- `fallbackStrategy`: Strategie für Fallback ('immediate', 'threshold', 'progressive', 'manual')
- `errorThreshold`: Schwellwert für Fehleranzahl vor Fallback
- `maxRetries`: Maximale Anzahl von Wiederholungsversuchen
- `retryInterval`: Zeitintervall für automatische Wiederholungsversuche (in ms)
- `minSeverity`: Minimaler Schweregrad für Fallback-Aktivierung

**Slots:**

- Default: Standard-Inhalt (die zu überwachende Komponente)
- `error`: Angezeigt im Fehlerzustand mit Slots-Props `error`, `retry` und `report`
- `fallback`: Angezeigt im Fallback-Zustand mit Slots-Props `error` und `resetFallback`

**Weitere Informationen:**

Für detaillierte Informationen zum Fallback-Mechanismus siehe [ERROR_HANDLING_FALLBACK.md](./ERROR_HANDLING_FALLBACK.md). Der Fallback-Mechanismus ist eine zentrale Komponente unserer Fehlerbehandlungsstrategie für die Vue 3 SFC-Migration.

## UI-Komponenten

### Button

Standard-Button-Komponente mit verschiedenen Varianten.

```vue
<Button 
  variant="primary" 
  :disabled="isLoading" 
  @click="handleClick"
>
  Button Text
</Button>
```

### Card

Container-Komponente für Inhaltsblöcke.

```vue
<Card title="Karten-Titel">
  <template #header>
    <!-- Zusätzlicher Header-Inhalt -->
  </template>
  
  <!-- Hauptinhalt -->
  <p>Karteninhalt</p>
  
  <template #footer>
    <!-- Footer-Inhalt -->
  </template>
</Card>
```

### Modal

Dialog-Komponente für modale Inhalte.

```vue
<Modal 
  :open="isModalOpen" 
  title="Modal-Titel"
  @close="closeModal"
>
  <p>Modal-Inhalt</p>
  
  <template #footer>
    <Button @click="closeModal">Schließen</Button>
    <Button variant="primary" @click="saveAndClose">Speichern</Button>
  </template>
</Modal>
```

## Formular-Komponenten

### InputField

Standardisierte Eingabefeld-Komponente.

```vue
<InputField
  v-model="username"
  label="Benutzername"
  :error="errors.username"
  helper-text="Geben Sie Ihren Benutzernamen ein"
/>
```

### SelectField

Dropdown-Auswahl-Komponente.

```vue
<SelectField
  v-model="selectedOption"
  label="Auswahl"
  :options="options"
  :error="errors.selectedOption"
/>
```

### Checkbox

Checkbox-Komponente.

```vue
<Checkbox
  v-model="isChecked"
  label="Ich akzeptiere die AGB"
/>
```

### RadioGroup

Gruppe von Radio-Buttons.

```vue
<RadioGroup
  v-model="selectedValue"
  label="Auswahl"
  :options="[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]"
/>
```