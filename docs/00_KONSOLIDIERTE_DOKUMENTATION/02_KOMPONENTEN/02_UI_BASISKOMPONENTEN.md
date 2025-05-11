---
title: "UI-Basiskomponenten"
version: "1.4.0"
date: "05.05.2025"
lastUpdate: "11.05.2025"
author: "nscale Entwicklungsteam"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["UI", "Layout", "Components", "Vue3", "Frontend"]
---

# UI-Basiskomponenten

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.4.0 | **Status:** Aktiv

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Verzeichnisstruktur](#verzeichnisstruktur)
3. [Implementierte Komponenten](#implementierte-komponenten)
   - [Button](#button)
   - [Input](#input)
   - [Select](#select)
   - [Checkbox](#checkbox)
   - [Radio](#radio)
   - [Card](#card)
   - [Alert](#alert)
   - [Modal](#modal)
   - [Badge](#badge)
   - [Breadcrumb](#breadcrumb)
   - [ProgressBar](#progressbar)
   - [Tabs](#tabs)
   - [Stepper](#stepper)
   - [FocusTrap](#focustrap)
4. [Noch zu implementierende Komponenten](#noch-zu-implementierende-komponenten)
5. [CSS Variablen und Theming](#css-variablen-und-theming)
6. [Barrierefreiheit](#barrierefreiheit)
7. [Nutzung und Integration](#nutzung-und-integration)
8. [Testabdeckung](#testabdeckung)
9. [Beispiele](#beispiele)

## Übersicht

Die UI-Basiskomponenten des nscale DMS Assistenten bilden die Grundlage für die gesamte Benutzeroberfläche der Anwendung. Diese Komponenten wurden mit Vue 3, TypeScript und Composition API entwickelt und folgen den Prinzipien eines konsistenten Designs, hoher Barrierefreiheit und optimaler Performance.

Derzeit liegt der Implementierungsgrad der UI-Basiskomponenten bei ca. 95%.

## Verzeichnisstruktur

Die UI-Basiskomponenten sind in folgender Verzeichnisstruktur organisiert:

```
/src/components/ui/
  /base/                  # Basiskomponenten
    /Button.vue           # Button-Komponente
    /Input.vue            # Input-Komponente
    /Card.vue             # Card-Komponente
    /...                  # Weitere Basiskomponenten
    /index.ts             # Export aller Basiskomponenten
  
  /data/                  # Datenorientierte Komponenten
    /Table.vue            # Tabellen-Komponente
    /List.vue             # Listen-Komponente
    /Tree.vue             # Baum-Komponente
    /...                  # Weitere Datenkomponenten
    /index.ts             # Export aller Datenkomponenten
  
  /feedback/              # Feedback-Komponenten
    /Toast.vue            # Toast-Benachrichtigung
    /Alert.vue            # Alert-Komponente
    /...                  # Weitere Feedback-Komponenten
    /index.ts             # Export aller Feedback-Komponenten
  
  /layout/                # Layout-Komponenten
    /Container.vue        # Container-Komponente
    /Row.vue              # Zeilen-Komponente
    /Col.vue              # Spalten-Komponente
    /index.ts             # Export aller Layout-Komponenten
  
  /index.ts               # Haupt-Export aller UI-Komponenten
```

## Implementierte Komponenten

### Button

Die `Button`-Komponente ist eine flexible Schaltfläche mit verschiedenen Varianten und Größen.

**Features:**
- Verschiedene Varianten: `primary`, `secondary`, `outlined`, `ghost`, `link`
- Verschiedene Größen: `small`, `medium`, `large`
- Zustände: `disabled`, `loading`
- Icon-Support (links oder rechts)
- Block-Modus (volle Breite)

**Beispiel:**
```vue
<Button variant="primary" size="medium" :disabled="false" @click="handleClick">
  Speichern
</Button>

<Button variant="outlined" icon="edit" icon-position="left">
  Bearbeiten
</Button>
```

### Input

Die `Input`-Komponente ist ein erweiterbares Text-Eingabefeld.

**Features:**
- Verschiedene Typen: `text`, `password`, `email`, `number`, `search`, `tel`, `url`
- Validierungsunterstützung mit Fehlermeldungen
- Zustände: `disabled`, `readonly`, `focused`
- Icons und Aktionen (links oder rechts)
- Auto-Resize für Textarea

**Beispiel:**
```vue
<Input
  v-model="username"
  type="text"
  label="Benutzername"
  placeholder="Geben Sie Ihren Benutzernamen ein"
  :error="usernameError"
/>

<Input
  v-model="password"
  type="password"
  label="Passwort"
  :show-password-toggle="true"
/>
```

### Select

Die `Select`-Komponente ermöglicht die Auswahl aus einer Liste von Optionen.

**Features:**
- Einzelauswahl und Mehrfachauswahl
- Gruppen-Support
- Durchsuchbare Optionen
- Benutzerdefinierte Option-Rendering
- Virtualisierte Liste für große Datensätze

**Beispiel:**
```vue
<Select
  v-model="selectedOption"
  :options="options"
  label="Kategorie"
  placeholder="Wählen Sie eine Kategorie"
/>

<Select
  v-model="selectedOptions"
  :options="options"
  label="Kategorien"
  multiple
  searchable
/>
```

### Checkbox

Die `Checkbox`-Komponente ist ein Kontrollkästchen für Ja/Nein-Auswahlen.

**Features:**
- Einzelne Checkbox oder Checkbox-Gruppe
- Indeterminate-Zustand
- Custom-Labels
- Verschiedene Größen
- Validierung für Gruppen

**Beispiel:**
```vue
<Checkbox v-model="accepted" label="Ich akzeptiere die Nutzungsbedingungen" />

<Checkbox
  v-model="notification"
  :disabled="!accepted"
  label="Benachrichtigungen aktivieren"
/>
```

### Radio

Die `Radio`-Komponente bietet eine Auswahl aus mehreren Optionen.

**Features:**
- Radio-Gruppe
- Verschiedene Größen und Stile
- Custom-Labels
- Verschiedene Layouts (horizontal, vertikal)

**Beispiel:**
```vue
<RadioGroup v-model="selectedOption" name="options" label="Optionen">
  <Radio value="option1" label="Option 1" />
  <Radio value="option2" label="Option 2" />
  <Radio value="option3" label="Option 3" :disabled="true" />
</RadioGroup>
```

### Card

Die `Card`-Komponente ist ein Container für verwandte Inhalte.

**Features:**
- Header, Body und Footer
- Verschiedene Varianten: default, outlined, elevated
- Anpassbare Innenabstände
- Hover-Effekte
- Aktionsbuttons

**Beispiel:**
```vue
<Card title="Benutzerdetails" variant="elevated">
  <template #header-actions>
    <Button variant="ghost" icon="edit" size="small" />
  </template>
  
  <div class="user-info">
    <p><strong>Name:</strong> {{ user.name }}</p>
    <p><strong>Email:</strong> {{ user.email }}</p>
  </div>
  
  <template #footer>
    <Button variant="primary">Speichern</Button>
    <Button variant="outlined">Abbrechen</Button>
  </template>
</Card>
```

### Alert

Die `Alert`-Komponente zeigt wichtige Meldungen an.

**Features:**
- Verschiedene Varianten: `info`, `success`, `warning`, `error`
- Schließbar oder permanent
- Icon-Support
- Aktionen (Buttons)
- Automatisches Schließen nach Zeit

**Beispiel:**
```vue
<Alert variant="success" title="Erfolg!" :closable="true">
  Die Daten wurden erfolgreich gespeichert.
</Alert>

<Alert variant="error" title="Fehler" :closable="false">
  <template #default>
    <p>Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>
  </template>
  <template #actions>
    <Button variant="ghost" size="small">Details anzeigen</Button>
  </template>
</Alert>
```

### Modal

Die `Modal`-Komponente zeigt Inhalte in einem modalen Dialog an.

**Features:**
- Verschiedene Größen
- Schließbar durch Overlay, Escape-Taste oder Close-Button
- Fokus-Management
- Blockierende und nicht-blockierende Modi
- Animation beim Öffnen/Schließen

**Beispiel:**
```vue
<Modal
  v-model:open="isModalOpen"
  title="Bestätigen"
  size="medium"
  :close-on-overlay-click="true"
>
  <p>Möchten Sie diese Aktion wirklich ausführen?</p>
  
  <template #footer>
    <Button variant="primary" @click="confirm">Bestätigen</Button>
    <Button variant="outlined" @click="isModalOpen = false">Abbrechen</Button>
  </template>
</Modal>
```

### Badge

Die `Badge`-Komponente ist ein Indikator, der über Elementen angezeigt wird, um Zahlen, Status oder Kennzeichnungen darzustellen.

**Features:**
- Verschiedene Varianten: `default`, `primary`, `success`, `warning`, `error`, `info`
- Unterschiedliche Größen: `small`, `medium`, `large`
- Numerische Anzeige mit Überlauf-Handling (z.B. "99+")
- Punkt-Variante für einfache Statusanzeige
- Positionierungsoptionen für Overlay-Nutzung

**Beispiel:**
```vue
<Badge value="5" variant="primary">
  <Button>Nachrichten</Button>
</Badge>

<Badge value="100" variant="error" max="99">
  <Icon name="notification" />
</Badge>

<Badge dot variant="success" position="top-right">
  <Avatar :src="user.avatar" />
</Badge>
```

### Breadcrumb

Die `Breadcrumb`-Komponente zeigt einen Navigationspfad an, um dem Benutzer zu helfen, seinen Standort innerhalb der Anwendung zu verstehen.

**Features:**
- Basis-Navigationspfad-Anzeige
- Anpassbare Trennzeichen
- Kollabierbare Elemente für lange Pfade
- Icon-Unterstützung
- Integration mit Vue Router
- Barrierefreiheitsattribute

**Beispiel:**
```vue
<Breadcrumb
  :items="[
    { text: 'Home', href: '/' },
    { text: 'Dokumente', href: '/documents' },
    { text: 'Finanzberichte', href: '/documents/financial' },
    { text: 'Jahresbericht 2024', active: true }
  ]"
  separator="/"
  :max-visible="3"
/>
```

### ProgressBar

Die `ProgressBar`-Komponente stellt einen Fortschrittsbalken dar, der den Status einer laufenden Operation visualisiert.

**Features:**
- Verschiedene Farbvarianten
- Größenoptionen
- Gestreifte und animierte Optionen
- Beschriftungspositionierung
- Unbestimmter Zustand für unbekannte Fortschrittsdauer
- Barrierefreiheitsattribute

**Beispiel:**
```vue
<ProgressBar 
  :value="65" 
  variant="primary" 
  size="medium" 
  label-position="top"
/>

<ProgressBar 
  :value="30" 
  variant="warning" 
  striped 
  animated
/>

<ProgressBar 
  indeterminate 
  variant="info" 
  size="small"
/>
```

### Tabs

Die `Tabs`-Komponente organisiert Inhalte in separaten, aber zusammenhängenden Ansichten, zwischen denen Benutzer wechseln können.

**Features:**
- Verschiedene Tab-Varianten (default, pills, underline, minimal)
- Icon- und Badge-Unterstützung
- Vertikale Layout-Option
- Lazy-Loading von Tab-Inhalten
- Tastatur-Navigation
- ARIA-Attribute für Barrierefreiheit

**Beispiel:**
```vue
<Tabs :tabs="[
    { id: 'tab1', label: 'Profil' },
    { id: 'tab2', label: 'Einstellungen', icon: 'settings' },
    { id: 'tab3', label: 'Benachrichtigungen', badge: '5', badgeType: 'error' }
  ]" 
  v-model="activeTab"
>
  <template #tab1>
    <h3>Profil-Informationen</h3>
    <p>Hier können Sie Ihre Profilinformationen einsehen und bearbeiten.</p>
  </template>
  
  <template #tab2>
    <h3>Einstellungen</h3>
    <p>Verwalten Sie Ihre Anwendungseinstellungen.</p>
  </template>
  
  <template #tab3>
    <h3>Benachrichtigungen</h3>
    <p>Sehen Sie Ihre ungelesenen Benachrichtigungen.</p>
  </template>
</Tabs>
```

### Stepper

Die `Stepper`-Komponente visualisiert einen mehrstufigen Prozess und hilft Benutzern, den Fortschritt durch eine Sequenz von Schritten zu verfolgen.

**Features:**
- Verschiedene Varianten (filled, outlined, minimal)
- Größenoptionen
- Vertikales Layout
- Abgeschlossene Schritte-Tracking
- Interaktive und nicht-interaktive Modi
- Navigationssteuerung

**Beispiel:**
```vue
<Stepper 
  :steps="[
    { title: 'Persönliche Daten', description: 'Geben Sie Ihre persönlichen Informationen ein' },
    { title: 'Kontaktdetails', description: 'Fügen Sie Ihre Kontaktinformationen hinzu' },
    { title: 'Zusammenfassung', description: 'Überprüfen Sie Ihre Daten' },
    { title: 'Abschluss', description: 'Bestätigen Sie die Eingabe' }
  ]"
  v-model="currentStep"
  :completed-steps="[0]"
/>
```

### FocusTrap

Die `FocusTrap`-Komponente fängt und beschränkt den Tastaturfokus innerhalb eines bestimmten Bereichs, was für modale Dialoge und andere fokussierende UI-Elemente wichtig ist.

**Features:**
- Automatisches Fokus-Management
- Verhinderung von Fokusverlusten
- Unterstützung für initiales Fokus-Element
- Rückgabe des Fokus nach dem Schließen
- Barrierefreiheitsunterstützung

**Beispiel:**
```vue
<FocusTrap :active="isModalOpen" :initial-focus="() => $refs.confirmButton">
  <div class="modal-content">
    <h2>Bestätigen</h2>
    <p>Möchten Sie fortfahren?</p>
    <Button ref="confirmButton">Bestätigen</Button>
    <Button>Abbrechen</Button>
  </div>
</FocusTrap>
```

## Noch zu implementierende Komponenten

Die folgenden Komponenten sind für zukünftige Implementierungen geplant:

1. **Form** - Ein Formular-Container mit Validierung und Feldgruppen
2. **TreeView** - Eine hierarchische Baumansicht für verschachtelte Daten
3. **Timeline** - Eine Zeitleisten-Komponente für zeitbezogene Datendarstellung

## CSS Variablen und Theming

Alle UI-Komponenten verwenden CSS-Variablen für ein konsistentes Theming. Dies ermöglicht sowohl helle als auch dunkle Farbschemata sowie benutzerdefinierte Farbpaletten.

### Basis-CSS-Variablen

```css
:root {
  /* Farben */
  --n-primary-color: #3182ce;
  --n-secondary-color: #805ad5;
  --n-error-color: #e53e3e;
  --n-warning-color: #dd6b20;
  --n-success-color: #38a169;
  --n-info-color: #3182ce;
  
  /* Hintergrund und Text */
  --n-background-color: #ffffff;
  --n-text-color: #1a202c;
  --n-text-color-secondary: #718096;
  
  /* Rahmen */
  --n-border-color: #e2e8f0;
  --n-border-radius: 4px;
  --n-border-width: 1px;
  
  /* Abstände */
  --n-spacing-xs: 0.25rem;
  --n-spacing-sm: 0.5rem;
  --n-spacing-md: 1rem;
  --n-spacing-lg: 1.5rem;
  --n-spacing-xl: 2rem;
  
  /* Schattierungen */
  --n-shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --n-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --n-shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* Übergänge */
  --n-transition-speed: 0.2s;
  --n-transition-timing: ease;
}

/* Dunkles Theme */
[data-theme="dark"] {
  --n-background-color: #1a202c;
  --n-text-color: #f7fafc;
  --n-text-color-secondary: #a0aec0;
  --n-border-color: #2d3748;
  
  /* Angepasste Farben für dunkles Theme */
  --n-primary-color: #63b3ed;
  --n-secondary-color: #b794f4;
  --n-error-color: #fc8181;
  --n-warning-color: #f6ad55;
  --n-success-color: #68d391;
  --n-info-color: #63b3ed;
  
  /* Angepasste Schattierungen für dunkles Theme */
  --n-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --n-shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  --n-shadow-lg: 0 10px 15px rgba(0,0,0,0.4);
}
```

### Komponenten-spezifische Variablen

Jede Komponente hat auch spezifische CSS-Variablen, die von den Basis-Variablen abgeleitet werden, aber auch überschrieben werden können:

```css
.n-button {
  --n-button-bg-primary: var(--n-primary-color);
  --n-button-text-primary: #ffffff;
  --n-button-border-radius: var(--n-border-radius);
  --n-button-padding-x: var(--n-spacing-md);
  --n-button-padding-y: var(--n-spacing-sm);
  /* ... weitere Button-spezifische Variablen ... */
}

.n-input {
  --n-input-border-color: var(--n-border-color);
  --n-input-focus-color: var(--n-primary-color);
  --n-input-error-color: var(--n-error-color);
  --n-input-padding-x: var(--n-spacing-sm);
  --n-input-padding-y: var(--n-spacing-sm);
  /* ... weitere Input-spezifische Variablen ... */
}

/* ... weitere komponenten-spezifische Variablen ... */
```

## Barrierefreiheit

Alle UI-Komponenten sind mit Barrierefreiheit im Fokus entwickelt worden. Die wichtigsten Barrierefreiheitsmerkmale umfassen:

1. **Semantisches HTML**: Verwendung der korrekten HTML-Elemente für ihre beabsichtigte Zwecke.
2. **ARIA-Attribute**: Angemessene Verwendung von ARIA-Attributen, um Komponenten für Screenreader zugänglich zu machen.
3. **Tastaturnavigation**: Alle interaktiven Elemente sind mit der Tastatur bedienbar.
4. **Farbkontrast**: Ausreichender Kontrast zwischen Text und Hintergrund gemäß WCAG 2.1 AA.
5. **Fokus-Management**: Sichtbare Fokusindikatoren und logische Fokusreihenfolge.
6. **Dynamische Inhalte**: Screenreader-Ankündigungen für dynamische Inhaltsänderungen.

## Nutzung und Integration

Die UI-Komponenten können über den zentralen Index-Export importiert werden:

```typescript
// Import aller UI-Komponenten
import { Button, Input, Card, Alert, Modal } from '@/components/ui';

// Import einer einzelnen Komponente
import { Button } from '@/components/ui/base';
```

Alle Komponenten unterstützen Vue's `v-model` für bidirektionales Binding und emittieren konsistente Events.

## Testabdeckung

Alle UI-Komponenten haben Unit-Tests mit einer Testabdeckung von mindestens 85%. Die Tests prüfen:

1. Korrekte Rendering
2. Event-Emitting
3. Prop-Validierung
4. Slot-Funktionalität
5. Zustandsänderungen
6. Edge-Cases

## Beispiele

Beispielanwendungen für die Verwendung der UI-Komponenten finden Sie im `/examples`-Verzeichnis. Diese Beispiele demonstrieren:

1. Basis-Komponenten-Nutzung
2. Komponenten-Kombinationen
3. Formular-Validierung
4. Responsive Layouts
5. Theming und Anpassung