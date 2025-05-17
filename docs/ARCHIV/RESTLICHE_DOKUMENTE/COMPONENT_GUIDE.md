# Komponenten-Leitfaden

Dieser Leitfaden beschreibt die wichtigsten Komponenten des nscale DMS Assistant und deren Verwendung. Er dient als Referenz für Entwickler, die an dem Projekt arbeiten.

## Inhaltsverzeichnis

1. [Allgemeine Richtlinien](#allgemeine-richtlinien)
2. [Core-Komponenten](#core-komponenten)
3. [Layout-Komponenten](#layout-komponenten)
4. [Feature-Wrapper](#feature-wrapper)
5. [Error-Boundary und Fallback-Mechanismus](#error-boundary-und-fallback-mechanismus)
6. [UI-Komponenten](#ui-komponenten)
7. [Formular-Komponenten](#formular-komponenten)

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

## Layout-Komponenten

Die folgenden Komponenten sind Teil des Vue 3 SFC Layout-Systems, das für den nscale DMS Assistenten entwickelt wurde. Diese Komponenten bieten eine flexible und wiederverwendbare Struktur für verschiedene Teile der Anwendung.

### MainLayout

Hauptlayout-Komponente mit Header, Sidebar, Content und Footer Bereichen.

```vue
<MainLayout
  title="nscale DMS Assistent"
  :sidebar-items="sidebarItems"
  :sidebar-collapsed="sidebarCollapsed"
  :theme="currentTheme"
  @update:sidebar-collapsed="sidebarCollapsed = $event"
>
  <template #header>
    <!-- Eigener Header-Inhalt oder Header-Komponente -->
  </template>
  
  <template #sidebar>
    <!-- Eigener Sidebar-Inhalt oder Sidebar-Komponente -->
  </template>
  
  <!-- Hauptinhalt -->
  <YourContent />
  
  <template #footer>
    <!-- Footer-Inhalt -->
  </template>
</MainLayout>
```

**Props:**
- `title`: Titel der Anwendung
- `showHeader`: Ob der Header angezeigt werden soll
- `showSidebar`: Ob die Sidebar angezeigt werden soll
- `showFooter`: Ob der Footer angezeigt werden soll
- `sidebarItems`: Navigationselemente für die Sidebar
- `sidebarCollapsed`: Ob die Sidebar eingeklappt ist
- `theme`: Theme der Anwendung ('light', 'dark', 'system')
- `stickyHeader`: Ob der Header fixiert bleiben soll beim Scrollen

### Header

Flexible Header-Komponente mit Logo, Titel und Aktionselementen.

```vue
<Header
  title="Mein Titel"
  :logo="logoUrl"
  :user="currentUser"
  @toggle-sidebar="toggleSidebar"
>
  <template #logo>
    <!-- Benutzerdefiniertes Logo -->
  </template>
  
  <template #center>
    <!-- Zentrale Elemente (z.B. Suchfeld) -->
  </template>
  
  <template #right>
    <!-- Rechte Elemente (z.B. Benutzermenü, Benachrichtigungen) -->
  </template>
</Header>
```

**Props:**
- `title`: Titel des Headers
- `logo`: Logo-URL
- `logoAlt`: Alt-Text für das Logo
- `fixed`: Ob der Header fixiert sein soll
- `bordered`: Ob der Header einen Rahmen haben soll
- `elevated`: Ob der Header erhöht (mit Schatten) sein soll
- `size`: Größe des Headers ('small', 'medium', 'large')
- `height`: Benutzerdefinierte Höhe in Pixeln
- `showTitle`: Ob der Titel angezeigt werden soll
- `showToggleButton`: Ob der Toggle-Button für die Sidebar angezeigt werden soll
- `user`: Benutzerinformationen (name, avatar, email)

### Sidebar

Zusammenklappbare Seitenleiste mit Navigation und verschachtelten Menüs.

```vue
<Sidebar
  :collapsed="sidebarCollapsed"
  :items="navigationItems"
  :mini="true"
  @collapse="handleCollapse"
  @item-click="handleItemClick"
>
  <template #header>
    <!-- Benutzerdefinierter Header-Bereich -->
  </template>
  
  <template #footer>
    <!-- Benutzerdefinierter Footer-Bereich -->
  </template>
</Sidebar>
```

**Props:**
- `title`: Titel der Sidebar
- `collapsed`: Ob die Sidebar eingeklappt ist
- `items`: Navigationselemente der Sidebar
- `mini`: Ob die Sidebar im Mini-Modus (nur Icons) angezeigt werden soll, wenn eingeklappt
- `defaultExpanded`: Standardmäßig ausgefahrene Elemente (nach ID)
- `collapseOnItemClick`: Ob die Sidebar nach Klick auf ein Element eingeklappt werden soll

### TabPanel

Tab-Komponente mit horizontaler oder vertikaler Ausrichtung, Drag & Drop und dynamischer Tab-Verwaltung.

```vue
<TabPanel
  :tabs="documentTabs"
  :active-id="activeTabId"
  closable
  addable
  draggable
  @update:active-id="activeTabId = $event"
  @close="handleCloseTab"
  @add="handleAddTab"
  @reorder="handleReorderTabs"
>
  <template #tab="{ tab, index }">
    <!-- Benutzerdefiniertes Tab-Layout -->
  </template>
  
  <!-- Inhalte für jeden Tab -->
  <template #tab-id-1>Inhalt für Tab 1</template>
  <template #tab-id-2>Inhalt für Tab 2</template>
</TabPanel>
```

**Props:**
- `tabs`: Die Tabs des TabPanels
- `activeId`: Die ID des aktiven Tabs
- `orientation`: Die Ausrichtung der Tabs ('horizontal', 'vertical')
- `closable`: Ob Tabs geschlossen werden können
- `addable`: Ob ein "Tab hinzufügen"-Button angezeigt werden soll
- `draggable`: Ob Tabs per Drag & Drop verschoben werden können
- `lazy`: Ob Inhalte nur bei Aktivierung geladen werden sollen
- `bordered`: Ob die Tabs einen Rahmen haben sollen
- `elevated`: Ob die Tabs erhöht (mit Schatten) sein sollen
- `size`: Größe der Tabs ('small', 'medium', 'large')
- `scrollable`: Ob die Tabs scrollbar sein sollen, wenn sie nicht alle angezeigt werden können

### SplitPane

Teilbarer Bereich mit anpassbarer Trennlinie.

```vue
<SplitPane
  :initial-split="30"
  :min-first="20"
  :max-first="80"
  orientation="horizontal"
  @update:split="handleSplitUpdate"
>
  <template #first>
    <!-- Inhalt des ersten Bereichs -->
  </template>
  
  <template #second>
    <!-- Inhalt des zweiten Bereichs -->
  </template>
  
  <template #separator>
    <!-- Benutzerdefinierter Separator (optional) -->
  </template>
</SplitPane>
```

**Props:**
- `orientation`: Die Ausrichtung der Teilung ('horizontal', 'vertical')
- `initialSplit`: Der initiale Split-Wert in Prozent (0-100)
- `minFirst`: Minimale Größe der ersten Seite in Prozent
- `maxFirst`: Maximale Größe der ersten Seite in Prozent
- `minSecond`: Minimale Größe der zweiten Seite in Prozent
- `maxSecond`: Maximale Größe der zweiten Seite in Prozent
- `resizable`: Ob die Größe per Drag angepasst werden kann
- `separatorWidth`: Die Breite des Separators in Pixeln
- `storageKey`: Der Speicherort für die Benutzerpräferenz
- `bordered`: Ob der SplitPane einen Rahmen haben soll

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

Die folgenden Komponenten sind Teil des Basis-UI-Komponenten-Systems. Für eine detaillierte Dokumentation dieser Komponenten siehe [10_BASIS_UI_KOMPONENTEN.md](./06_SYSTEME/10_BASIS_UI_KOMPONENTEN.md).

### Button

Standard-Button-Komponente mit verschiedenen Varianten, Größen und Zuständen.

```vue
<Button 
  variant="primary"
  size="medium"
  :loading="isLoading" 
  :disabled="isDisabled"
  :iconLeft="IconComponent"
  @click="handleClick"
>
  Button Text
</Button>
```

### Input

Eingabefeld-Komponente für verschiedene Eingabetypen mit Validierung und zusätzlichen Funktionen.

```vue
<Input
  v-model="username"
  label="Benutzername"
  placeholder="Geben Sie Ihren Benutzernamen ein"
  :error="errors.username"
  helperText="Ihr Benutzername sollte eindeutig sein"
  required
/>
```

### Card

Container-Komponente für Inhaltsblöcke mit verschiedenen Erscheinungsvarianten.

```vue
<Card 
  title="Karten-Titel"
  variant="elevated"
  :interactive="true"
>
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

### Alert

Komponente für Benachrichtigungen und Meldungen.

```vue
<Alert
  type="warning"
  title="Achtung"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  :dismissible="true"
  @close="hideAlert"
/>
```

### Modal

Dialog-Komponente für modale Inhalte mit Fokus-Management und Zugänglichkeitsoptionen.

```vue
<Modal 
  :open="isModalOpen" 
  title="Modal-Titel"
  size="medium"
  :closeOnBackdrop="true"
  :closeOnEscape="true"
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