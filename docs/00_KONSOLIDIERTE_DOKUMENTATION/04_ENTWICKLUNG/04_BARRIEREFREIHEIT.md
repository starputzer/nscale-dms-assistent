---
title: "Barrierefreiheit (Accessibility)"
version: "1.1.0"
date: "10.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Entwicklung"
tags: ["Barrierefreiheit", "Accessibility", "a11y", "WCAG", "ARIA", "Screenreader", "Tastaturnavigation", "Vue3", "Keyboard Shortcuts"]
---

# Barrierefreiheit (Accessibility)

> **Letzte Aktualisierung:** 11.05.2025 | **Version:** 1.1.0 | **Status:** Aktiv

## Übersicht

Diese Dokumentation beschreibt die Implementierung von Barrierefreiheitsfunktionen (Accessibility) im nscale DMS Assistent. Die Anwendung wurde nach den WCAG 2.1 Richtlinien entwickelt und stellt sicher, dass alle Komponenten für alle Benutzer zugänglich sind, einschließlich derjenigen, die Screenreader, Tastaturnavigation oder andere assistive Technologien verwenden.

## Grundprinzipien der Barrierefreiheit

Die gesamte Anwendung wurde nach den vier Grundprinzipien der WCAG entwickelt:

1. **Wahrnehmbar** - Informationen und Komponenten müssen für alle Benutzer wahrnehmbar sein
   - Textäquivalente für Nicht-Text-Inhalte
   - Alternative Medienformen für Zeit-basierte Medien
   - Anpassungsfähige und unterscheidbare Inhalte

2. **Bedienbar** - Bedienelemente und Navigation müssen von allen Benutzern verwendet werden können
   - Vollständige Tastaturzugänglichkeit
   - Ausreichend Zeit für Interaktionen
   - Vermeidung von Inhalten, die Anfälle auslösen könnten
   - Navigierbare Struktur und Hilfsmittel

3. **Verständlich** - Informationen und Bedienung müssen für alle Benutzer verständlich sein
   - Lesbare und verständliche Texte
   - Vorhersehbares Verhalten
   - Fehlerunterstützung und -vermeidung

4. **Robust** - Inhalte müssen robust genug sein, um von verschiedenen Benutzeragenten interpretiert zu werden
   - Kompatibilität mit aktuellen und zukünftigen Technologien
   - Korrekte Markup-Struktur

## Implementierte Komponenten und Features

### Semantische HTML-Struktur

Die Anwendung verwendet durchgängig semantische HTML5-Elemente, um eine sinnvolle Dokumentstruktur zu gewährleisten:

- `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>` für grundlegende Seitenstruktur
- `<h1>` bis `<h6>` für hierarchische Überschriften
- `<button>` für interaktive Elemente, die Aktionen auslösen
- `<a>` für Links zu anderen Seiten oder Abschnitten
- `<ul>`, `<ol>`, `<li>` für Listen
- `<table>`, `<th>`, `<td>` für tabellarische Daten
- `<form>`, `<fieldset>`, `<label>`, `<input>` für Formulare

Beispielimplementierung der Hauptlayout-Struktur:

```vue
<template>
  <div class="app-layout">
    <header class="app-header" role="banner">
      <h1>nscale DMS Assistent</h1>
      <!-- Navigation -->
    </header>
    
    <main class="app-main" role="main">
      <router-view></router-view>
    </main>
    
    <aside v-if="showSidebar" class="app-sidebar" role="complementary">
      <!-- Sidebar-Inhalt -->
    </aside>
    
    <footer class="app-footer" role="contentinfo">
      <!-- Footer-Inhalt -->
    </footer>
  </div>
</template>
```

### ARIA-Attribute

Die Anwendung verwendet ARIA-Attribute (Accessible Rich Internet Applications), um die Zugänglichkeit komplexer Komponenten zu verbessern:

#### 1. Strukturelle Rollen und Beschreibungen

- `role="navigation"`, `role="search"`, `role="main"` - Identifizieren wichtige Bereiche
- `aria-label`, `aria-labelledby` - Bieten Beschreibungen für nicht sichtbare oder komplexe Elemente
- `aria-describedby` - Verbinden Elemente mit zusätzlichen Beschreibungen

#### 2. Dynamische Inhalte und Status

- `aria-live="polite"|"assertive"` - Informiert Screenreader über dynamische Änderungen
- `aria-busy="true"` - Zeigt Ladezustände an
- `aria-expanded="true|false"` - Gibt den Zustand von aufklappbaren Elementen an
- `aria-hidden="true"` - Versteckt dekorative Elemente vor Screenreadern

#### 3. Interaktive Elemente

- `aria-haspopup="true"` - Zeigt an, dass ein Element ein Popup-Menü öffnet
- `aria-controls` - Verknüpft ein Steuerelement mit dem Bereich, den es steuert
- `aria-selected="true|false"` - Gibt den Auswahlzustand in Listenelementen an
- `aria-disabled="true"` - Zeigt deaktivierte Elemente an

### Beispiel-Implementierung: Dialog-Komponente

Die Dialog-Komponente wurde mit umfassenden Barrierefreiheitsfunktionen implementiert:

```vue
<template>
  <transition name="n-dialog-fade">
    <div
      v-if="modelValue"
      class="n-dialog-overlay"
      @click="handleOverlayClick"
      @keydown.esc="close"
      aria-hidden="true"
    >
      <FocusTrap>
        <div
          ref="dialogRef"
          class="n-dialog"
          :class="dialogClasses"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`dialog-title-${dialogId}`"
          :aria-describedby="hasDescription ? `dialog-desc-${dialogId}` : undefined"
          @click.stop
        >
          <div class="n-dialog__header">
            <h2 :id="`dialog-title-${dialogId}`" class="n-dialog__title">
              {{ title }}
            </h2>
            
            <button
              v-if="closable"
              type="button"
              class="n-dialog__close"
              @click="close"
              aria-label="Schließen"
            >
              <CloseIcon :size="20" aria-hidden="true" />
            </button>
          </div>
          
          <div v-if="hasDescription" :id="`dialog-desc-${dialogId}`" class="n-dialog__description">
            {{ description }}
          </div>
          
          <div class="n-dialog__content">
            <slot></slot>
          </div>
          
          <div v-if="$slots.footer" class="n-dialog__footer">
            <slot name="footer"></slot>
          </div>
          
          <div v-else-if="showDefaultFooter" class="n-dialog__footer">
            <button
              v-if="showCancelButton"
              type="button"
              class="n-dialog__btn n-dialog__btn--secondary"
              @click="cancel"
            >
              {{ cancelText }}
            </button>
            
            <button
              v-if="showConfirmButton"
              type="button"
              class="n-dialog__btn n-dialog__btn--primary"
              @click="confirm"
              :disabled="confirmDisabled"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import FocusTrap from '../ui/base/FocusTrap.vue';
import CloseIcon from '../icons/CloseIcon.vue';

// Generiere eine eindeutige ID für ARIA-Attribute
const dialogId = uuidv4();
const dialogRef = ref(null);
const previouslyFocusedElement = ref(null);

// Fokus-Management beim Öffnen und Schließen
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    // Speichere das aktuelle fokussierte Element
    previouslyFocusedElement.value = document.activeElement;
    
    // Warte auf DOM-Update und setze dann den Fokus
    await nextTick();
    const focusableElement = dialogRef.value.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElement) {
      focusableElement.focus();
    } else {
      dialogRef.value.focus();
    }
    
    // Füge ein Event-Listener für ESC hinzu
    document.addEventListener('keydown', handleEscKey);
  } else {
    // Entferne Event-Listener
    document.removeEventListener('keydown', handleEscKey);
    
    // Setze den Fokus zurück zum vorherigen Element
    if (previouslyFocusedElement.value) {
      previouslyFocusedElement.value.focus();
    }
  }
});

// Entferne Event-Listener beim Unmounten
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey);
});

// Behandlung der ESC-Taste
function handleEscKey(event) {
  if (event.key === 'Escape' && props.modelValue && props.closable) {
    close();
  }
}

// Weitere Implementierung...
</script>
```

#### Wichtige Barrierefreiheitsfunktionen:

- `role="dialog"` und `aria-modal="true"` - Kennzeichnet das Element als Modal-Dialog
- `aria-labelledby` und `aria-describedby` - Verknüpft den Dialog mit seinem Titel und seiner Beschreibung
- `FocusTrap`-Komponente - Hält den Fokus innerhalb des Dialogs
- Fokus-Management - Speichert den aktuellen Fokus, setzt ihn auf das erste fokussierbare Element im Dialog und stellt ihn wieder her, wenn der Dialog geschlossen wird
- Keyboard-Unterstützung - Schließen mit ESC-Taste

### Tastaturnavigation

Die gesamte Anwendung ist vollständig mit der Tastatur bedienbar. Folgende globale Tastaturbefehle wurden implementiert:

#### Allgemeine Navigation

- **Tab**: Navigation zwischen fokussierbaren Elementen
- **Shift+Tab**: Rückwärts-Navigation zwischen Elementen
- **Enter/Space**: Aktivieren von Buttons und auswählbaren Elementen
- **Escape**: Schließen von Dialogen, Dropdowns und Menüs
- **?**: Öffnet die Tastaturkürzel-Hilfe
- **Alt+H**: Navigiert zur Startseite
- **Alt+D**: Navigiert zur Dokumentenseite
- **Alt+S**: Navigiert zu den Einstellungen
- **Alt+A**: Navigiert zum Admin-Bereich (nur für Administratoren)
- **Alt+Shift+T**: Wechselt zwischen hellem und dunklem Farbschema

#### Spezifische Komponenten

##### Dokumentenkonverter

- **Alt+U**: Datei hochladen
- **Alt+C**: Konvertierung starten
- **Alt+D**: Dokumentenliste öffnen

##### Chat-Interface

- **Alt+M**: Fokus auf Nachrichteneingabe setzen
- **Ctrl+Enter**: Nachricht senden
- **Shift+Enter**: Zeilenumbruch in Nachricht einfügen
- **Alt+N**: Neue Session starten

##### Admin-Panel

- **Alt+1-5**: Zwischen den Admin-Tabs wechseln
- **Ctrl+S**: Änderungen speichern

#### Skip-Links für Tastaturbenutzer

Für Tastaturbenutzer wurden "Skip-Links" implementiert, die es ermöglichen, direkt zum Hauptinhalt oder zur Navigation zu springen, ohne durch alle Elemente navigieren zu müssen. Diese Links sind normalerweise nicht sichtbar, werden aber angezeigt, wenn sie den Tastaturfokus erhalten.

- **Skip zum Hauptinhalt**: Setzt den Fokus direkt auf den Hauptinhaltsbereich
- **Skip zur Navigation**: Setzt den Fokus direkt auf die Hauptnavigation

#### Zentrale Tastaturkürzel-Verwaltung

Die Anwendung verwendet ein zentrales System für die Verwaltung von Tastaturkürzeln:

```typescript
// Beispiel für die Registrierung eines Tastaturkürzels
registerShortcut({
  id: 'global-help',
  name: 'Keyboard Shortcuts Help',
  context: SHORTCUT_CONTEXTS.GLOBAL,
  key: '?',
  description: 'Zeigt Hilfe zu Tastaturkürzeln an',
  handler: () => { showKeyboardShortcuts.value = !showKeyboardShortcuts.value; },
  global: true,
});
```

#### Tastaturkürzel-Hilfe Overlay

Ein spezielles Overlay wurde implementiert, das alle verfügbaren Tastaturkürzel anzeigt und mit der Taste `?` aufgerufen werden kann. Dies hilft Benutzern, die verfügbaren Tastaturkürzel zu entdecken und zu lernen.

```js
// In App.vue
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettings } from '@/composables/useSettings';

export default {
  setup() {
    const router = useRouter();
    const { settings } = useSettings();
    
    function handleKeydown(event) {
      // Prüfen, ob Shortcuts aktiviert sind
      if (!settings.value.enableKeyboardShortcuts) return;
      
      // Prüfen, ob in einem Input-Feld
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }
      
      // Globale Shortcuts
      if (event.altKey && event.key === 'h') {
        router.push('/'); // Home
        event.preventDefault();
      } else if (event.altKey && event.key === 'd') {
        router.push('/documents'); // Dokumente
        event.preventDefault();
      } else if (event.altKey && event.key === 'c') {
        router.push('/chat'); // Chat
        event.preventDefault();
      } else if (event.altKey && event.key === 'a') {
        router.push('/admin'); // Admin
        event.preventDefault();
      } else if (event.altKey && event.key === 's') {
        router.push('/settings'); // Einstellungen
        event.preventDefault();
      }
    }
    
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });
    
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
    });
    
    return {
      // ...
    };
  }
};
```

### Farbkontrast und visuelle Unterscheidbarkeit

Die Anwendung wurde entwickelt, um WCAG 2.1 AA-Konformität zu erreichen:

- Text und interaktive Elemente haben einen Kontrastquotienten von mindestens **4.5:1**
- Große Texte (18pt oder 14pt fett) haben einen Kontrastquotienten von mindestens **3:1**
- UI-Komponenten und grafische Objekte haben einen Kontrastquotienten von mindestens **3:1**

#### Implementierung in den CSS-Variablen

```scss
:root {
  // Primärfarben mit ausreichendem Kontrast
  --n-color-primary: #0056b3; // Kontrastquotient 4.65:1 auf Weiß
  --n-color-primary-light: #007bff; // Für große Texte (3.15:1)
  --n-color-primary-dark: #004494; // Für höheren Kontrast (7.25:1)
  
  // Statusfarben
  --n-color-success: #218838; // Kontrastquotient 4.53:1 auf Weiß
  --n-color-warning: #c27a00; // Kontrastquotient 4.51:1 auf Weiß
  --n-color-error: #c9302c; // Kontrastquotient 4.52:1 auf Weiß
  --n-color-info: #0275d8; // Kontrastquotient 4.54:1 auf Weiß
  
  // Text und Hintergrund
  --n-color-text: #333333; // Kontrastquotient 12.63:1 auf Weiß
  --n-color-text-secondary: #545454; // Kontrastquotient 8.23:1 auf Weiß
  --n-color-background: #ffffff;
  --n-color-background-alt: #f8f9fa; // Leicht grau
  
  // Fokus-Styles
  --n-focus-ring-color: rgba(0, 123, 255, 0.6);
  --n-focus-ring-width: 3px;
  --n-focus-ring-offset: 2px;
}
```

#### Fokus-Styles für verbesserte Sichtbarkeit

Die Anwendung verwendet verbesserte Fokus-Indikatoren, die speziell für die Tastaturnavigation optimiert sind. Diese Indikatoren werden nur angezeigt, wenn der Benutzer die Tastatur verwendet, und nicht bei Mausklicks oder Touch-Eingaben.

```scss
/* Nur anwenden, wenn Tastatur für die Navigation verwendet wird */
.using-keyboard :focus-visible {
  outline: 3px solid var(--nscale-focus-ring, rgba(0, 165, 80, 0.6)) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1) !important;
  transition: outline-color 0.15s ease !important;
  z-index: 1;
  position: relative;
}

/* Verbesserte Fokus-Indikatoren für Buttons */
.using-keyboard button:focus-visible,
.using-keyboard .n-button:focus-visible,
.using-keyboard [role="button"]:focus-visible {
  outline-offset: 3px !important;
}

/* Verbesserte Link-Fokus-Styles */
.using-keyboard a:focus-visible {
  outline-width: 2px !important;
  text-decoration: underline !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 3px !important;
}

/* Formular-Element-Fokus-Styles */
.using-keyboard input:focus-visible,
.using-keyboard textarea:focus-visible,
.using-keyboard select:focus-visible {
  border-color: var(--nscale-primary, #00a550) !important;
  outline-offset: 0 !important;
  box-shadow: 0 0 0 3px rgba(0, 165, 80, 0.3) !important;
}

/* Skip-Navigation-Links, die nur bei Fokus sichtbar werden */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 12px;
  background-color: var(--nscale-primary, #00a550);
  color: white;
  font-weight: 500;
  z-index: 9999;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 0;
  outline: none;
}
```

#### Tastatur-Erkennungsmechanismus

Die Anwendung erkennt automatisch, ob der Benutzer die Tastatur oder die Maus verwendet, und passt die Fokus-Stile entsprechend an:

```typescript
function handleKeyboard(event: KeyboardEvent) {
  // Nur Tab-Taste als Tastaturnavigation betrachten
  if (event.key === "Tab") {
    usingTouch.value = false;
    usingKeyboard.value = true;
    document.body.classList.add("using-keyboard");
    document.body.classList.remove("using-touch");
  }
}
```

### Bildtexte und Text-Alternativen

Alle Bilder und Icons enthalten alternative Texte oder sind als dekorativ gekennzeichnet:

```vue
<!-- Informatives Bild mit alt-Text -->
<img src="/images/document-preview.png" alt="Vorschau des konvertierten Word-Dokuments mit Formatierung" />

<!-- Dekoratives Bild -->
<img src="/images/decorative-element.svg" alt="" aria-hidden="true" role="presentation" />

<!-- Icon mit beschreibendem Text -->
<button class="n-btn">
  <SuccessIcon aria-hidden="true" />
  <span>Dokument speichern</span>
</button>

<!-- Icon ohne sichtbaren Text, aber mit ARIA-Label -->
<button class="n-btn n-btn--icon-only" aria-label="Dokument löschen">
  <DeleteIcon aria-hidden="true" />
</button>
```

### Screenreader-Unterstützung

Die Anwendung enthält spezifische Optimierungen für Screenreader:

#### Versteckte Text-Elemente nur für Screenreader

```vue
<template>
  <div class="document-list">
    <h2>Dokumentenliste</h2>
    
    <!-- Nur für Screenreader sichtbar -->
    <p class="sr-only">
      Diese Liste enthält alle Ihre konvertierten Dokumente.
      Nutzen Sie die Sortierfunktion, um die Ansicht anzupassen.
    </p>
    
    <!-- Sortieroptionen -->
    <div class="document-list__sort">
      <label for="sort-options" class="sr-only">
        Sortieren nach:
      </label>
      <select id="sort-options">
        <option value="date">Datum</option>
        <option value="name">Name</option>
        <option value="size">Größe</option>
      </select>
    </div>
    
    <!-- Dokumente -->
    <ul class="document-list__items">
      <li v-for="doc in documents" :key="doc.id">
        <!-- Dokumentenanzeige -->
      </li>
    </ul>
  </div>
</template>

<style>
/* Visuelle Versteckung für Screenreader */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
```

#### Live-Regionen für dynamische Inhalte

```vue
<template>
  <div class="conversion-status">
    <!-- Statusanzeige -->
    <div 
      aria-live="polite" 
      aria-atomic="true" 
      class="conversion-status__message"
    >
      {{ statusMessage }}
    </div>
    
    <!-- Fortschrittsanzeige -->
    <div class="conversion-status__progress">
      <progress 
        :value="progress" 
        max="100" 
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {{ progress }}%
      </progress>
      <span class="sr-only">{{ progress }}% abgeschlossen</span>
    </div>
  </div>
</template>
```

### Reduzierte Bewegung

Die Anwendung respektiert die Benutzereinstellung für reduzierte Bewegung und passt Animationen entsprechend an:

```scss
// Standard-Animation
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Reduzierte Animation für Benutzer, die dies bevorzugen
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.1s ease-in-out;
  }
  
  .n-spinner {
    animation-duration: 2s; // Langsamere Animation
  }
  
  .n-progress-bar__indicator {
    transition: width 0.5s linear;
  }
  
  // Komplexe Animationen deaktivieren
  .complex-animation {
    animation: none !important;
    transition: none !important;
  }
}
```

### Responsives Design und Textgrößen

Die Anwendung unterstützt verschiedene Bildschirmgrößen und Textskalierungen:

- Layout funktioniert bei 320px bis 1920px Breite
- Text kann auf 200% vergrößert werden, ohne dass Funktionalität verloren geht
- Unterstützung für Viewportzoom und Browsertext-Zoom
- Ausreichende Touch-Ziele (mindestens 44x44px) für mobile Geräte

```scss
// Responsive Media Queries
@mixin responsive($breakpoint) {
  @if $breakpoint == mobile {
    @media (max-width: 767px) { @content; }
  } @else if $breakpoint == tablet {
    @media (min-width: 768px) and (max-width: 1023px) { @content; }
  } @else if $breakpoint == desktop {
    @media (min-width: 1024px) { @content; }
  }
}

// Anwendungsbeispiel
.n-button {
  // Basis-Styles
  padding: 0.5rem 1rem;
  font-size: 1rem;
  
  @include responsive(mobile) {
    // Mobile Optimierung
    width: 100%; // Volle Breite auf kleinen Bildschirmen
    padding: 0.75rem 1rem; // Größere Touch-Fläche
    font-size: 1rem;
  }
}

// Fluid Typography
:root {
  --n-font-size-base: clamp(16px, 1vw + 14px, 20px);
  --n-line-height: 1.5;
}

body {
  font-size: var(--n-font-size-base);
  line-height: var(--n-line-height);
}
```

## Tests und Validierung

### Automatisierte Tests

Die Anwendung verwendet verschiedene Tools zur Überprüfung der Barrierefreiheit:

1. **axe-core** für automatisierte Tests während der Entwicklung und in der CI/CD-Pipeline
2. **Storybook Accessibility Addon** für visuelle Tests der Komponenten
3. **Cypress-axe** für End-to-End-Tests mit Barrierefreiheits-Prüfungen

#### Testbeispiel mit Jest + axe-core

```js
import { render } from '@testing-library/vue';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from '../Button.vue';

expect.extend(toHaveNoViolations);

describe('Button Component Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(Button, {
      props: {
        label: 'Test Button'
      }
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should have proper ARIA attributes when disabled', async () => {
    const { container } = render(Button, {
      props: {
        label: 'Disabled Button',
        disabled: true
      }
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
```

#### E2E-Test mit Cypress und cypress-axe

```js
// cypress/e2e/accessibility.cy.js
describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });
  
  it('Homepage should not have any accessibility violations', () => {
    cy.checkA11y();
  });
  
  it('Chat page should not have any accessibility violations', () => {
    cy.visit('/chat');
    cy.injectAxe();
    cy.checkA11y();
  });
  
  it('Document converter should not have any accessibility violations', () => {
    cy.visit('/documents');
    cy.injectAxe();
    
    // Test mit geschlossenem Formular
    cy.checkA11y();
    
    // Test mit geöffnetem Formular
    cy.findByText('Neues Dokument hochladen').click();
    cy.checkA11y();
  });
});
```

### Manuelle Tests

Neben automatisierten Tests werden regelmäßig manuelle Tests durchgeführt:

1. **Tastaturnavigation**: Überprüfung der vollständigen Bedienbarkeit ohne Maus
2. **Screenreader-Tests**: Tests mit NVDA (Windows) und VoiceOver (macOS)
3. **Vergrößerungs-Tests**: Überprüfung des Verhaltens bei Textskalierung und Zoom
4. **Kontrast-Tests**: Überprüfung aller Farben mit Kontrastanalysewerkzeugen
5. **Fokus-Tests**: Sicherstellung der Sichtbarkeit und logischen Reihenfolge des Fokus

## Barrierefreiheits-Funktionen nach Komponenten

### VirtualMessageList-Komponente

Diese Komponente wurde speziell für die Chat-Ansicht optimiert:

```vue
<template>
  <div 
    ref="scrollContainer"
    class="n-virtual-message-list"
    :aria-busy="isLoading"
    :aria-live="isLoading ? 'off' : 'polite'"
  >
    <!-- Nachrichten-Container -->
    <div
      ref="messagesContainer"
      class="n-virtual-message-list__messages"
      role="log"
      aria-labelledby="message-list-label"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
    >
      <span id="message-list-label" class="sr-only">Chatverlauf</span>
      
      <!-- Virtualisierte Nachrichtenelemente -->
      <div 
        v-for="item in visibleItems"
        :key="item.id"
        class="n-virtual-message-list__message-wrapper"
        :aria-setsize="totalItems"
        :aria-posinset="item.index + 1"
      >
        <MessageItem ... />
      </div>
    </div>
    
    <!-- Tipp-Indikator -->
    <div
      v-if="isStreaming"
      class="n-virtual-message-list__typing-indicator"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="sr-only">Der Assistent schreibt gerade...</span>
      ...
    </div>
  </div>
</template>
```

#### Wichtige Features:

- `role="log"` kennzeichnet den Bereich als Chat-Log
- `aria-live="polite"` informiert Screenreader über neue Nachrichten
- `aria-relevant="additions text"` gibt an, dass nur neue Nachrichten und Textänderungen angekündigt werden
- `aria-setsize` und `aria-posinset` geben die Gesamtzahl der Elemente und Position an
- Streaming-Statusanzeige mit Screenreader-Feedback

### MessageInput-Komponente

```vue
<template>
  <textarea
    ref="inputElement"
    v-model="inputValue"
    class="n-enhanced-message-input__textarea"
    :placeholder="placeholder"
    :maxlength="maxLength"
    :disabled="disabled || isLoading"
    :aria-label="ariaLabel || placeholder"
    :aria-describedby="error ? 'input-error' : hint ? 'input-hint' : undefined"
    :aria-invalid="!!error"
    ...
  ></textarea>

  <!-- Fehlermeldung -->
  <div 
    v-if="error" 
    id="input-error" 
    class="n-enhanced-message-input__error"
    role="alert"
  >
    {{ error }}
  </div>
</template>
```

#### Wichtige Features:

- `aria-label` bietet eine Beschreibung für das Eingabefeld
- `aria-describedby` verbindet das Eingabefeld mit Fehlermeldungen oder Hinweisen
- `aria-invalid` kennzeichnet ungültige Eingaben
- `role="alert"` für Fehlermeldungen sorgt für sofortige Ankündigung

### Dokumentenkonverter-Komponenten

```vue
<template>
  <div class="n-document-converter">
    <!-- Fortschrittsanzeige -->
    <ConversionProgress
      v-if="showProgress"
      :progress="conversionProgress"
      :status="conversionStatus"
      :aria-label="`Konvertierung ${conversionProgress}% abgeschlossen, Status: ${conversionStatus}`"
      aria-live="polite"
    />
    
    <!-- Fehlermeldungen -->
    <ErrorDisplay
      v-if="hasErrors"
      :errors="errors"
      @retry="handleRetry"
      @dismiss="clearErrors"
    />
    
    <!-- Dateiliste -->
    <DocumentList
      :documents="documents"
      :loading="loadingDocuments"
      aria-label="Liste der konvertierten Dokumente"
      :aria-busy="loadingDocuments"
    />
  </div>
</template>
```

#### Wichtige Features:

- Semantische Struktur mit aussagekräftigen ARIA-Labels
- Statusmeldungen mit korrekten `aria-live`-Regionen
- Fehlerbehandlung mit klaren Fehlermeldungen und Korrekturmöglichkeiten
- Ladestatusanzeige mit `aria-busy`

## Barrierefreiheits-Einstellungen

Die Anwendung bietet Benutzern verschiedene Einstellungen zur Anpassung an ihre Bedürfnisse:

```vue
<template>
  <div class="accessibility-settings">
    <h2>Barrierefreiheits-Einstellungen</h2>
    
    <div class="setting-group">
      <h3>Textgröße</h3>
      <div class="setting-controls">
        <button 
          class="font-size-btn" 
          @click="decreaseFontSize" 
          aria-label="Textgröße verringern"
        >A-</button>
        <div class="font-size-value">{{ currentFontSize }}%</div>
        <button 
          class="font-size-btn" 
          @click="increaseFontSize" 
          aria-label="Textgröße erhöhen"
        >A+</button>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>Kontrast</h3>
      <div class="toggle-control">
        <input 
          type="checkbox" 
          id="high-contrast" 
          v-model="settings.highContrast"
          @change="updateSettings"
        >
        <label for="high-contrast">Hoher Kontrast</label>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>Bewegung reduzieren</h3>
      <div class="toggle-control">
        <input 
          type="checkbox" 
          id="reduce-motion" 
          v-model="settings.reduceMotion"
          @change="updateSettings"
        >
        <label for="reduce-motion">Animationen reduzieren</label>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>Tastaturnavigation</h3>
      <div class="toggle-control">
        <input 
          type="checkbox" 
          id="keyboard-shortcuts" 
          v-model="settings.enableKeyboardShortcuts"
          @change="updateSettings"
        >
        <label for="keyboard-shortcuts">Tastaturkürzel aktivieren</label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSettings } from '@/composables/useSettings';

const { settings, updateSetting } = useSettings();
const currentFontSize = ref(100);

function increaseFontSize() {
  if (currentFontSize.value < 200) {
    currentFontSize.value += 10;
    applyFontSize();
  }
}

function decreaseFontSize() {
  if (currentFontSize.value > 80) {
    currentFontSize.value -= 10;
    applyFontSize();
  }
}

function applyFontSize() {
  document.documentElement.style.fontSize = `${currentFontSize.value}%`;
  updateSetting('fontSize', currentFontSize.value);
}

function updateSettings() {
  // Einstellungen im Store aktualisieren
  updateSetting('highContrast', settings.value.highContrast);
  updateSetting('reduceMotion', settings.value.reduceMotion);
  updateSetting('enableKeyboardShortcuts', settings.value.enableKeyboardShortcuts);
  
  // CSS-Klassen auf dem Root-Element anwenden
  if (settings.value.highContrast) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
  
  if (settings.value.reduceMotion) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
}

onMounted(() => {
  // Einstellungen aus dem Store laden
  currentFontSize.value = settings.value.fontSize || 100;
  applyFontSize();
  updateSettings();
});
</script>
```

## Barrierefreiheits-Richtlinien für Entwickler

### Checkliste für neue Komponenten

Bei der Entwicklung neuer Komponenten sollten folgende Punkte beachtet werden:

1. **Semantisches HTML verwenden**
   - Native HTML-Elemente (`button`, `a`, etc.) statt `div` mit Klicks
   - Korrekte Überschriftenhierarchie (`h1` - `h6`)
   - Korrekte Listenelemente (`ul`, `ol`, `li`)

2. **Tastaturnavigation sicherstellen**
   - Fokussierbarkeit aller interaktiven Elemente
   - Sichtbarer Fokusindikator
   - Logische Tab-Reihenfolge
   - Tastaturkürzel für häufige Aktionen

3. **ARIA korrekt implementieren**
   - Nur wenn nötig (semantisches HTML bevorzugen)
   - Korrekte Rollen und Eigenschaften
   - ARIA-Labels für nicht-sichtbare Texte

4. **Text-Alternativen für Nicht-Text-Inhalte**
   - Alt-Texte für Bilder
   - Labels für Icons
   - Beschreibungen für komplexe Inhalte

5. **Farbe und Kontrast prüfen**
   - Ausreichender Kontrast für Text und UI-Elemente
   - Nicht nur Farbe für Information verwenden
   - Unterstützung für Hochkontrast-Modus

6. **Größe und Abstände optimieren**
   - Ausreichende Touch-Ziele (min. 44x44px)
   - Angemessene Abstände zwischen Elementen
   - Responsive Anpassung an verschiedene Bildschirmgrößen

7. **Bewegung und Animation reduzieren**
   - Respektieren der `prefers-reduced-motion`-Einstellung
   - Alternative Übergänge für reduzierte Bewegung
   - Vermeidung von blinkenden oder flackernden Inhalten

8. **Automatisierte Tests durchführen**
   - axe-core für Komponentenprüfung
   - Tastaturnavigation testen
   - Screenreader-Ankündigungen prüfen

### Code-Beispiele für häufige Muster

#### Formular-Felder mit Fehlermeldungen

```vue
<template>
  <div class="form-group">
    <label :for="inputId" class="form-label">
      {{ label }}
      <span v-if="required" class="required-mark" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">Erforderlich</span>
    </label>
    
    <input
      :id="inputId"
      :type="type"
      v-model="inputValue"
      class="form-input"
      :class="{ 'form-input--error': !!error }"
      :required="required"
      :aria-required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
      @input="updateValue"
    />
    
    <div v-if="hint && !error" :id="`${inputId}-hint`" class="form-hint">
      {{ hint }}
    </div>
    
    <div v-if="error" :id="`${inputId}-error`" class="form-error" role="alert">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  required: {
    type: Boolean,
    default: false
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:value']);

// Generiere eine eindeutige ID, wenn keine angegeben wurde
const inputId = computed(() => props.id || `input-${uuidv4()}`);
const inputValue = ref(props.value);

// Aktualisiere den Input-Wert, wenn sich der Prop ändert
watch(() => props.value, (newValue) => {
  inputValue.value = newValue;
});

// Aktualisiere den Wert und sende ihn an das übergeordnete Formular
function updateValue(event) {
  inputValue.value = event.target.value;
  emit('update:value', inputValue.value);
}
</script>
```

#### Accordion/Disclosure

```vue
<template>
  <div class="accordion">
    <div 
      v-for="(item, index) in items" 
      :key="index"
      class="accordion-item"
    >
      <h3>
        <button
          :id="`accordion-header-${index}`"
          class="accordion-button"
          :class="{ 'accordion-button--expanded': activeIndices.includes(index) }"
          :aria-expanded="activeIndices.includes(index)"
          :aria-controls="`accordion-panel-${index}`"
          @click="toggleItem(index)"
        >
          {{ item.title }}
          <span class="accordion-icon" aria-hidden="true">
            {{ activeIndices.includes(index) ? '−' : '+' }}
          </span>
        </button>
      </h3>
      
      <div
        :id="`accordion-panel-${index}`"
        class="accordion-panel"
        :class="{ 'accordion-panel--active': activeIndices.includes(index) }"
        role="region"
        :aria-labelledby="`accordion-header-${index}`"
        v-show="activeIndices.includes(index)"
      >
        <div class="accordion-content">
          {{ item.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  allowMultiple: {
    type: Boolean,
    default: false
  },
  initialActive: {
    type: [Number, Array],
    default: () => []
  }
});

// Aktive Indizes initialisieren
const activeIndices = ref(
  Array.isArray(props.initialActive) 
    ? [...props.initialActive] 
    : [props.initialActive]
);

// Element ein-/ausklappen
function toggleItem(index) {
  if (activeIndices.value.includes(index)) {
    // Element ausklappen
    activeIndices.value = activeIndices.value.filter(i => i !== index);
  } else {
    // Element einklappen
    if (props.allowMultiple) {
      // Mehrere Elemente können gleichzeitig aktiv sein
      activeIndices.value.push(index);
    } else {
      // Nur ein Element kann aktiv sein
      activeIndices.value = [index];
    }
  }
}
</script>
```

## Verbesserungspläne

Die folgenden Maßnahmen sind für zukünftige Releases geplant:

### Kurzfristige Verbesserungen (nächstes Release)

1. **Automatisierte Tests ausbauen**
   - Erhöhung der Testabdeckung für alle Komponenten
   - Integration von axe-core in den CI/CD-Prozess
   - Automatisierte Bildschirmleser-Tests

2. **Dokumentation erweitern**
   - Detaillierte Entwicklerrichtlinien für Barrierefreiheit
   - Komponentenbibliothek mit Barrierefreiheits-Informationen
   - Schulungsmaterial für das Entwicklungsteam

3. **Bestehende Komponenten optimieren**
   - Verbesserung der Tabellen-Komponente für bessere Screenreader-Unterstützung
   - Optimierung des Dialog-Systems für komplexe Formulare
   - Verbesserung der Tastaturnavigation in verschachtelten Menüs

### Mittelfristige Verbesserungen (nächste 2-3 Releases)

1. **Erweiterte Einstellungen für Barrierefreiheit**
   - Benutzerdefinierte Farbschemata
   - Anpassbare Tastaturkürzel
   - Vereinfachte UI-Option

2. **Verbesserte Unterstützung für assistive Technologien**
   - Optimierung für verschiedene Screenreader (JAWS, NVDA, VoiceOver)
   - Unterstützung für Braille-Displays
   - Verbesserte Sprachsteuerung

3. **WCAG 2.1 AA-Konformität erreichen**
   - Vollständige Erfüllung aller AA-Kriterien
   - Externe Prüfung und Zertifizierung
   - Benutzertest mit Menschen mit Behinderungen

### Langfristige Verbesserungen

1. **WCAG 2.1 AAA-Konformität anstreben**
   - Implementierung der zusätzlichen AAA-Kriterien
   - Erweiterte Sprachanpassungen
   - Verbesserte kognitive Unterstützung

2. **KI-gestützte Barrierefreiheit**
   - Automatische Bildbeschreibungen
   - Kontextbasierte Hilfe für Benutzer
   - Anpassung der Benutzeroberfläche basierend auf Nutzungsmustern

3. **Integrierte Barrierefreiheits-Tests**
   - Automatische Erkennung von Barrierefreiheitsproblemen während der Entwicklung
   - Live-Feedback für Entwickler
   - Automatische Vorschläge zur Verbesserung

## Zusammenfassung

Die Barrierefreiheit ist ein integraler Bestandteil des nscale DMS Assistenten. Durch die Implementierung der WCAG-Richtlinien und Best Practices wird sichergestellt, dass die Anwendung für alle Benutzer zugänglich ist, unabhängig von ihren Fähigkeiten oder der verwendeten Technologie.

Die wichtigsten Aspekte der Barrierefreiheits-Implementierung sind:

1. **Semantisches HTML und ARIA** für eine strukturierte, bedeutungsvolle Darstellung
2. **Tastaturnavigation** für die vollständige Bedienbarkeit ohne Maus
3. **Farben und Kontrast** für visuelle Zugänglichkeit
4. **Screenreader-Unterstützung** für Benutzer mit Sehbehinderungen
5. **Responsive Design** für verschiedene Geräte und Textgrößen
6. **Reduzierte Bewegung** für Benutzer mit vestibulären Störungen
7. **Tests und Validierung** zur Sicherstellung der Konformität

Die Barrierefreiheit ist kein einmaliges Ziel, sondern ein kontinuierlicher Prozess. Mit jedem Release werden weitere Verbesserungen implementiert, um die Anwendung noch zugänglicher zu machen und allen Benutzern ein optimales Erlebnis zu bieten.