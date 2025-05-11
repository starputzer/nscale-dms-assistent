---
title: "Feedback-Komponenten"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Mittel"
category: "Komponenten"
tags: ["UI", "Feedback", "Vue3", "SFC", "Komponenten", "Toast", "Alert", "Dialog", "Notification"]
---

# Feedback-Komponenten

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

Die Feedback-Komponenten des nscale DMS Assistenten bilden eine umfassende Sammlung von UI-Komponenten zur konsistenten Anzeige von Feedback an Benutzer. Diese Dokumentation beschreibt alle verfügbaren Feedback-Komponenten, ihre Dienste und Nutzungsweisen.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Komponenten](#komponenten)
   - [Toast](#toast)
   - [Dialog](#dialog)
   - [Notification](#notification)
   - [Alert](#alert)
   - [Banner](#banner)
   - [InlineMessage](#inlinemessage)
   - [StatusIndicator](#statusindicator)
   - [Popover](#popover)
   - [LoadingOverlay](#loadingoverlay)
   - [ProgressIndicator](#progressindicator)
3. [Dienste](#dienste)
   - [ToastService](#toastservice)
   - [DialogService](#dialogservice)
   - [NotificationService](#notificationservice)
   - [BannerService](#bannerservice)
4. [Verwendungsbeispiele](#verwendungsbeispiele)
5. [Barrierefreiheit](#barrierefreiheit)
6. [Theming](#theming)
7. [Internationalisierung](#internationalisierung)
8. [Best Practices](#best-practices)

## Übersicht

Die Feedback-Komponenten sind eine Sammlung von Vue 3-Komponenten, die mit der Composition API unter Verwendung der `<script setup>`-Syntax und TypeScript entwickelt wurden. Sie bieten eine konsistente Möglichkeit, Benutzerrückmeldungen in der gesamten Anwendung darzustellen.

Hauptmerkmale:
- Vollständig in Vue 3 entwickelt mit Composition API
- TypeScript-Unterstützung mit umfassenden Typdefinitionen
- Zentralisierte Service-Module für die Verwaltung von UI-Feedback-Komponenten
- ARIA-Attribute für Barrierefreiheit
- Unterstützung für reduzierte Bewegungspräferenzen
- i18n-Unterstützung
- Umfassendes Theming mit CSS-Variablen

## Komponenten

### Toast

`Toast.vue` zeigt temporäre, nicht-blockierende Benachrichtigungen an.

**Funktionen:**
- Verschiedene Typen (Erfolg, Fehler, Warnung, Info)
- Konfigurierbare Dauer, Position und Animation
- Optionale Aktionsschaltflächen
- Warteschlangenverwaltung für mehrere Toasts
- Barrierefreiheitsunterstützung
- Unterstützung für reduzierte Animation

**Verwendung:**
```vue
<template>
  <!-- Füge die Toast-Komponente einmal in deiner App ein -->
  <Toast />
</template>

<script setup>
import { Toast } from '@/components/ui';
import { toastService } from '@/services/ui';

// Zeige Toasts mit dem Service an
toastService.success('Vorgang erfolgreich abgeschlossen!');
toastService.error('Ein Fehler ist aufgetreten.');
toastService.warning('Bitte überprüfe deine Änderungen.');
toastService.info('Neues Update verfügbar.');

// Toast mit Aktion
toastService.info('Datei hochgeladen', {
  actions: [{
    label: 'Anzeigen',
    handler: () => { /* Handler-Code */ }
  }]
});
</script>
```

### Dialog

`Dialog.vue` bietet modale Dialoge für wichtige Nachrichten und Aktionen.

**Funktionen:**
- Verschiedene Typen (bestätigen, warnen, eingeben, benutzerdefiniert)
- Promise-basierte API
- Tastaturnavigation und Fokusverwaltung
- Anpassbare Schaltflächen und Inhalte
- Vollbildmodus
- Animations- und Übergangseffekte

**Verwendung:**
```vue
<template>
  <!-- Füge die Dialog-Komponente einmal in deiner App ein -->
  <Dialog />
</template>

<script setup>
import { Dialog } from '@/components/ui';
import { dialogService } from '@/services/ui';

// Bestätigungsdialog
const handleConfirm = async () => {
  const result = await dialogService.confirm({
    title: 'Aktion bestätigen',
    message: 'Möchtest du wirklich fortfahren?'
  });
  
  if (result) {
    // Benutzer hat bestätigt
  }
};

// Warnungsdialog
const showAlert = async () => {
  await dialogService.alert('Dies ist eine Warnmeldung');
};

// Eingabedialog
const promptUser = async () => {
  const name = await dialogService.prompt({
    title: 'Information eingeben',
    message: 'Bitte gib deinen Namen ein',
    placeholder: 'Dein Name'
  });
  
  if (name) {
    // Benutzer hat einen Wert eingegeben
  }
};

// Benutzerdefinierter Dialog
const showCustomDialog = async () => {
  const result = await dialogService.custom({
    title: 'Benutzerdefinierter Dialog',
    component: DeineBenutzerdefinierteKomponente,
    props: { /* Deine Komponentenprops */ }
  });
};
</script>
```

### Notification

`Notification.vue` zeigt beständigere Benachrichtigungen als Toasts mit erweiterten Funktionen an.

**Funktionen:**
- Verschiedene Benachrichtigungstypen und Prioritätsstufen
- Gelesen/Ungelesen-Zustände
- Gruppierungsfunktionen
- Interaktive Elemente wie Schaltflächen
- Benachrichtigungszentrale zur Anzeige aller Benachrichtigungen
- Filter- und Sortieroptionen

**Verwendung:**
```vue
<template>
  <!-- Füge die Notification-Komponente einmal in deiner App ein -->
  <Notification />
</template>

<script setup>
import { Notification } from '@/components/ui';
import { notificationService } from '@/services/ui';

// Benachrichtigungen anzeigen
notificationService.info('Neue Nachricht erhalten');
notificationService.success('Dokument erfolgreich verarbeitet');
notificationService.warning('Deine Sitzung läuft bald ab');
notificationService.error('Änderungen konnten nicht gespeichert werden');

// Benachrichtigung mit Aktionen
notificationService.info('Neue Datei wurde mit dir geteilt', {
  title: 'Dateifreigabe',
  actions: [{
    label: 'Datei anzeigen',
    handler: () => { /* Handler-Code */ }
  }]
});

// Gruppierte Benachrichtigungen
notificationService.info('Systemupdate verfügbar', {
  group: 'updates',
  priority: 'medium'
});
</script>
```

### Alert

`Alert.vue` zeigt Warnungen oder Informationen in einem hervorgehobenen Bereich an.

**Funktionen:**
- Verschiedene Varianten (Info, Erfolg, Warnung, Fehler)
- Unterstützung für Titel und benutzerdefinierte Aktionen
- Optionale Schließfunktion
- Verschiedene Stile (Umriss, gefüllt, mit Rahmen)
- Auto-Dismiss-Funktion
- Barrierefreiheitsunterstützung

**Verwendung:**
```vue
<template>
  <!-- Einfache Warnungsmeldung -->
  <Alert variant="warning">
    Diese Aktion kann nicht rückgängig gemacht werden.
  </Alert>
  
  <!-- Erfolgsalert mit Titel und Schließen-Schaltfläche -->
  <Alert 
    variant="success" 
    title="Erfolg!" 
    dismissible
  >
    Deine Änderungen wurden erfolgreich gespeichert.
  </Alert>
  
  <!-- Fehleralert mit Aktionen -->
  <Alert variant="error" title="Fehler beim Speichern">
    <template #actions>
      <button @click="retryAction">Wiederholen</button>
      <button @click="showErrorDetails">Details anzeigen</button>
    </template>
    Der Vorgang konnte nicht abgeschlossen werden.
  </Alert>
</template>

<script setup>
import { Alert } from '@/components/ui/feedback';

function retryAction() {
  // Code zum Wiederholen der Aktion
}

function showErrorDetails() {
  // Code zum Anzeigen der Fehlerdetails
}
</script>
```

### Banner

`Banner.vue` zeigt anwendungsweite Meldungen in einer hervorgehobenen Leiste an.

**Funktionen:**
- Verschiedene Varianten (Info, Erfolg, Warnung, Fehler, Neutral)
- Positionierung am oberen oder unteren Rand
- Sticky-Positionierung für sichtbare Banner während des Scrollens
- Unterstützung für Aktionsschaltflächen
- Auto-Dismiss-Funktion
- Barrierefreiheitsunterstützung

**Verwendung:**
```vue
<template>
  <!-- Füge die BannerContainer-Komponente einmal in deiner App ein -->
  <BannerContainer />
  
  <!-- Bei Bedarf einzelnes Banner direkt verwenden -->
  <Banner 
    variant="info" 
    title="Systemwartung" 
    message="Geplante Wartung am 15. Mai um 22:00 Uhr."
    :actions="[
      {
        label: 'Mehr erfahren',
        type: 'primary',
        handler: showMaintenanceDetails
      }
    ]"
  />
</template>

<script setup>
import { Banner, BannerContainer } from '@/components/ui';
import { bannerService } from '@/services/ui';

// Banner über den Service anzeigen
bannerService.info('Ein neues Update ist verfügbar.', {
  title: 'System-Update',
  actions: [
    {
      label: 'Jetzt aktualisieren',
      type: 'primary',
      handler: () => startUpdate()
    },
    {
      label: 'Später erinnern',
      type: 'secondary',
      handler: () => dismissBanner()
    }
  ]
});

function showMaintenanceDetails() {
  // Details zur Wartung anzeigen
}

function startUpdate() {
  // Update-Prozess starten
}

function dismissBanner() {
  // Banner schließen
}
</script>
```

### InlineMessage

`InlineMessage.vue` zeigt kontextbezogene Meldungen für Formularfelder oder kleine Hinweise an.

**Funktionen:**
- Verschiedene Varianten (Info, Erfolg, Warnung, Fehler)
- Verschiedene Größen (klein, mittel, groß)
- Optional mit oder ohne Symbol
- Kompakte Darstellung
- ARIA-Unterstützung für Barrierefreiheit

**Verwendung:**
```vue
<template>
  <div class="form-group">
    <label for="email">E-Mail</label>
    <input 
      type="email" 
      id="email" 
      v-model="email" 
      :class="{ 'input-error': !isEmailValid }"
    />
    <InlineMessage 
      v-if="!isEmailValid" 
      variant="error"
    >
      Bitte gib eine gültige E-Mail-Adresse ein.
    </InlineMessage>
  </div>
  
  <div class="form-group">
    <label for="password">Passwort</label>
    <input 
      type="password" 
      id="password" 
      v-model="password"
    />
    <InlineMessage 
      variant="success" 
      v-if="isPasswordStrong"
    >
      Passwortstärke: Stark
    </InlineMessage>
    <InlineMessage 
      variant="warning" 
      v-else-if="password"
    >
      Passwort sollte mindestens 8 Zeichen enthalten.
    </InlineMessage>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { InlineMessage } from '@/components/ui/feedback';

const email = ref('');
const password = ref('');

const isEmailValid = computed(() => {
  return !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
});

const isPasswordStrong = computed(() => {
  return password.value && password.value.length >= 8;
});
</script>
```

### StatusIndicator

`StatusIndicator.vue` zeigt den Status eines Systems oder Elements an.

**Funktionen:**
- Verschiedene Varianten (Erfolg, Warnung, Fehler, Info, Neutral)
- Optionale Pulsanimation für aktive Zustände
- Verschiedene Größen (klein, mittel, groß)
- Unterstützung für Status ohne Punkt (nur Text)
- ARIA-Unterstützung für Barrierefreiheit

**Verwendung:**
```vue
<template>
  <div class="system-status">
    <h3>Systemstatus</h3>
    <div class="status-group">
      <StatusIndicator 
        variant="success" 
        text="Server 1: Online" 
        pulse
      />
      <StatusIndicator 
        variant="warning" 
        text="Server 2: Hohe Auslastung"
      />
      <StatusIndicator 
        variant="error" 
        text="Server 3: Offline" 
        pulse
      />
      <StatusIndicator 
        variant="info" 
        text="Server 4: Wird aktualisiert"
      />
    </div>
  </div>
</template>

<script setup>
import { StatusIndicator } from '@/components/ui/feedback';
</script>
```

### Popover

`Popover.vue` zeigt kontextbezogene Informationen oder Inhalte beim Hover, Klick oder Fokus an.

**Funktionen:**
- Verschiedene Auslöser (Hover, Klick, Fokus, manuell)
- Flexible Positionierung (oben, unten, links, rechts, mit Varianten)
- Helles und dunkles Thema
- Unterstützung für Header, Inhalt und Footer
- Optionale Schließen-Schaltfläche
- Automatische Anpassung, um im Viewport zu bleiben
- ARIA-Unterstützung für Barrierefreiheit

**Verwendung:**
```vue
<template>
  <!-- Popover beim Hovern -->
  <Popover 
    title="Hilfreiche Tipps" 
    trigger="hover"
    placement="top"
  >
    <template #trigger>
      <button class="help-button">?</button>
    </template>
    Hier sind einige Tipps zur Verwendung dieser Funktion.
  </Popover>
  
  <!-- Popover beim Klicken -->
  <Popover 
    title="Weitere Informationen" 
    trigger="click"
    placement="right"
    closable
  >
    <template #trigger>
      <button>Mehr erfahren</button>
    </template>
    <p>Detaillierte Informationen zu diesem Thema.</p>
    <template #footer>
      <button @click="closePopover">Schließen</button>
    </template>
  </Popover>
</template>

<script setup>
import { ref } from 'vue';
import { Popover } from '@/components/ui/feedback';

function closePopover() {
  // Code zum Schließen des Popovers
}
</script>
```

### LoadingOverlay

`LoadingOverlay.vue` zeigt Ladeindikationen für Vorgänge an.

**Funktionen:**
- Vollbild- oder komponentenspezifische Ladeoverlay
- Anpassbarer Spinner und Text
- Verzögertes Erscheinen zur Vermeidung von Flackern
- Minimale Anzeigedauer
- Z-Index-Verwaltung

**Verwendung:**
```vue
<template>
  <!-- Globales Ladeoverlay -->
  <LoadingOverlay 
    v-model="isGlobalLoading" 
    fullscreen 
    text="Daten werden geladen..."
  />
  
  <!-- Komponentenspezifisches Ladeoverlay -->
  <div class="container">
    <div v-if="dataLoaded" class="content">
      <!-- Dein Inhalt -->
    </div>
    <LoadingOverlay 
      v-model="isLoading" 
      delay="300"
      text="Komponente wird geladen..."
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LoadingOverlay } from '@/components/ui';

const isGlobalLoading = ref(false);
const isLoading = ref(true);
const dataLoaded = ref(false);

// Ladeoverlay anzeigen
const fetchData = async () => {
  isLoading.value = true;
  try {
    // Daten abrufen
    dataLoaded.value = true;
  } finally {
    isLoading.value = false;
  }
};
</script>
```

### ProgressIndicator

`ProgressIndicator.vue` zeigt den Fortschritt von Vorgängen in verschiedenen Formaten an.

**Funktionen:**
- Linearer, kreisförmiger und segmentierter Fortschrittstyp
- Bestimmt und unbestimmt Zustände
- Größenvarianten (klein, mittel, groß)
- Schritt-/Phasendarstellung
- Barrierefreie Textlabels

**Verwendung:**
```vue
<template>
  <!-- Linearer Fortschritt (bestimmt) -->
  <ProgressIndicator 
    type="linear" 
    :value="progress" 
    :max="100" 
    show-label
  />
  
  <!-- Linearer Fortschritt (unbestimmt) -->
  <ProgressIndicator 
    type="linear" 
    indeterminate 
  />
  
  <!-- Kreisförmiger Fortschritt -->
  <ProgressIndicator 
    type="circular" 
    :value="progress" 
    :max="100"
    size="large"
  />
  
  <!-- Segmentierter Fortschritt (Schritte) -->
  <ProgressIndicator 
    type="segmented" 
    :value="currentStep" 
    :max="5" 
    :segments="5"
  />
</template>

<script setup>
import { ref } from 'vue';
import { ProgressIndicator } from '@/components/ui';

const progress = ref(45);
const currentStep = ref(2);
</script>
```

## Dienste

Die Feedback-Komponenten werden durch zentralisierte Dienste verwaltet, die eine einfache Programmierschnittstelle bieten.

### ToastService

`ToastService.ts` ist ein zentralisierter Dienst für die Verwaltung von Toast-Benachrichtigungen.

**Methoden:**
- `show(message, type, options)`: Zeigt einen Toast mit angegebenem Typ und Optionen an
- `success(message, options)`: Zeigt einen Erfolgs-Toast an
- `error(message, options)`: Zeigt einen Fehler-Toast an
- `warning(message, options)`: Zeigt einen Warnungs-Toast an
- `info(message, options)`: Zeigt einen Info-Toast an
- `remove(id)`: Entfernt einen bestimmten Toast
- `clear()`: Entfernt alle Toasts

**Optionen:**
```typescript
interface ToastOptions {
  duration?: number;           // Dauer in Millisekunden (0 für persistent)
  position?: ToastPosition;    // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  closable?: boolean;          // Schließen-Schaltfläche anzeigen
  actions?: ToastAction[];     // Aktionsschaltflächen
  showProgress?: boolean;      // Fortschrittsbalken anzeigen
  customClass?: string;        // Benutzerdefinierte CSS-Klasse
  group?: string;              // Gruppenkennung für ähnliche Toasts
  zIndex?: number;             // Benutzerdefinierter z-Index
}
```

### DialogService

`DialogService.ts` bietet Methoden zum Anzeigen verschiedener Arten von Dialogen.

**Methoden:**
- `confirm(options)`: Zeigt einen Bestätigungsdialog an, gibt Promise<boolean> zurück
- `alert(options)`: Zeigt einen Warnungsdialog an, gibt Promise<void> zurück
- `prompt(options)`: Zeigt einen Eingabedialog an, gibt Promise<string | null> zurück
- `info(options)`: Zeigt einen Info-Dialog an
- `warning(options)`: Zeigt einen Warnungsdialog an
- `error(options)`: Zeigt einen Fehlerdialog an
- `success(options)`: Zeigt einen Erfolgsdialog an
- `custom(options)`: Zeigt einen benutzerdefinierten Dialog an, gibt Promise<T> zurück

**Optionen:**
```typescript
interface DialogOptions {
  title?: string;              // Dialogtitel
  message?: string | VNode;    // Dialognachricht
  type?: DialogType;           // 'info', 'success', 'warning', 'error', 'confirm', 'prompt'
  confirmText?: string;        // Text für Bestätigungsschaltfläche
  cancelText?: string;         // Text für Abbrechen-Schaltfläche
  buttons?: DialogButton[];    // Benutzerdefinierte Schaltflächen
  closable?: boolean;          // Schließen-Schaltfläche anzeigen
  closeOnEsc?: boolean;        // Bei Escape-Taste schließen
  closeOnClickOutside?: boolean; // Beim Klicken außerhalb schließen
  fullscreen?: boolean;        // Vollbildmodus
  persistent?: boolean;        // Kann nicht durch Klicken außerhalb geschlossen werden
  component?: Component;       // Benutzerdefinierte Komponente für benutzerdefinierte Dialoge
  props?: Record<string, any>; // Props für benutzerdefinierte Komponente
  width?: string;              // Dialogbreite
  zIndex?: number;             // Benutzerdefinierter z-Index
}
```

### NotificationService

`NotificationService.ts` verwaltet beständigere Benachrichtigungen mit erweiterten Funktionen.

**Methoden:**
- `add(message, options)`: Fügt eine Benachrichtigung hinzu, gibt ID zurück
- `info(message, options)`: Fügt eine Info-Benachrichtigung hinzu
- `success(message, options)`: Fügt eine Erfolgs-Benachrichtigung hinzu
- `warning(message, options)`: Fügt eine Warnungs-Benachrichtigung hinzu
- `error(message, options)`: Fügt eine Fehler-Benachrichtigung hinzu
- `system(message, options)`: Fügt eine System-Benachrichtigung hinzu
- `remove(id)`: Entfernt eine Benachrichtigung nach ID
- `markAsRead(id)`: Markiert eine Benachrichtigung als gelesen
- `markAllAsRead()`: Markiert alle Benachrichtigungen als gelesen
- `clear()`: Entfernt alle Benachrichtigungen
- `getUnreadCount()`: Gibt die Anzahl ungelesener Benachrichtigungen zurück
- `getByGroup(group)`: Gibt Benachrichtigungen nach Gruppe zurück

**Optionen:**
```typescript
interface NotificationOptions {
  title?: string;              // Benachrichtigungstitel
  type?: NotificationType;     // 'info', 'success', 'warning', 'error', 'system'
  priority?: NotificationPriority; // 'high', 'medium', 'low'
  actions?: NotificationAction[]; // Aktionsschaltflächen
  group?: string;              // Gruppenkennung
  details?: string;            // Zusätzliche Details
  timestamp?: number;          // Benachrichtigungszeitstempel
  persistent?: boolean;        // Bleibt über App-Neustarts hinweg bestehen
  closable?: boolean;          // Kann geschlossen werden
  read?: boolean;              // Anfänglicher Lesestatus
  customClass?: string;        // Benutzerdefinierte CSS-Klasse
  expiration?: number;         // Automatische Ablaufzeit in Millisekunden
}
```

### BannerService

`BannerService.ts` verwaltet Anwendungs-Banner für systemweite Ankündigungen.

**Methoden:**
- `show(message, options)`: Zeigt ein Banner mit angegebenen Optionen an
- `info(message, options)`: Zeigt ein Info-Banner an
- `success(message, options)`: Zeigt ein Erfolgs-Banner an
- `warning(message, options)`: Zeigt ein Warnungs-Banner an
- `error(message, options)`: Zeigt ein Fehler-Banner an
- `neutral(message, options)`: Zeigt ein neutrales Banner an
- `hide(id)`: Versteckt ein bestimmtes Banner
- `hideAll()`: Versteckt alle Banner
- `getAll()`: Gibt alle aktiven Banner zurück
- `isVisible(id)`: Prüft, ob ein Banner sichtbar ist
- `getActiveBannerId()`: Gibt die ID des aktiven Banners zurück

**Optionen:**
```typescript
interface BannerOptions {
  title?: string;              // Bannertitel
  dismissible?: boolean;       // Ob das Banner schließbar ist
  actions?: BannerAction[];    // Aktionsschaltflächen für das Banner
  position?: 'top' | 'bottom'; // Position des Banners
  sticky?: boolean;            // Ob das Banner an seiner Position festgehalten wird
  autoDismiss?: number;        // Automatisches Ausblenden nach Zeit in ms
  showIcon?: boolean;          // Ob ein Symbol angezeigt werden soll
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral'; // Banner-Variante
  onDismiss?: () => void;      // Callback beim Schließen
  onAction?: (action: BannerAction) => void; // Callback bei Aktionen
}

interface BannerAction {
  label: string;               // Aktionstext
  type?: 'primary' | 'secondary' | 'text'; // Aktionstyp
  handler?: () => void;        // Aktions-Handler
}
```

## Verwendungsbeispiele

Vollständige Beispiele für alle Feedback-Komponenten finden sich in der Beispieldatei:

- `/examples/FeedbackComponentsExampleUpdated.vue`

Diese Datei demonstriert die Integration und Verwendung aller Feedback-Komponenten in einer Vue-Anwendung und kann als Referenz für Entwickler dienen.

## Barrierefreiheit

Alle Komponenten implementieren Barrierefreiheitsfunktionen:

- ARIA-Attribute für Screenreader
- Tastaturnavigation
- Fokusverwaltung für modale Dialoge
- Unterstützung für reduzierte Bewegungspräferenzen
- Farbkontrastkonformität
- Screenreader-Ankündigungen für dynamische Inhalte

## Theming

Die Komponenten verwenden CSS-Variablen für das Theming. Die Hauptvariablen umfassen:

```css
:root {
  /* Farben */
  --n-color-primary: #3498db;
  --n-color-success: #2ecc71;
  --n-color-warning: #f39c12;
  --n-color-error: #e74c3c;
  --n-color-info: #3498db;
  --n-color-background: #ffffff;
  --n-color-text-primary: #333333;
  --n-color-text-secondary: #666666;
  --n-color-text-tertiary: #999999;
  --n-color-border: #e0e0e0;
  
  /* Größe und Abstand */
  --n-border-radius: 0.25rem;
  --n-border-radius-sm: 0.125rem;
  --n-border-radius-lg: 0.5rem;
  
  /* Z-Index */
  --n-z-index-toast: 9000;
  --n-z-index-dialog: 9500;
  --n-z-index-loading: 9800;
  
  /* Schatten */
  --n-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --n-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --n-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Typografie */
  --n-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
}
```

## Internationalisierung

Die Komponenten unterstützen Internationalisierung durch die Vue I18n-Bibliothek. Übersetzungen werden in der Datei `src/i18n/feedback.ts` bereitgestellt.

## Best Practices

1. **Konsistente Verwendung**: Verwende die gleichen Feedback-Komponenten konsequent in der gesamten Anwendung für ein einheitliches Erlebnis.

2. **Sinnvolle Varianten**: Verwende die richtigen Varianten für die richtigen Zwecke:
   - `success`: Für erfolgreiche Aktionen
   - `error`: Für Fehler und kritische Probleme
   - `warning`: Für potenziell problematische Situationen
   - `info`: Für neutrale oder informative Nachrichten

3. **Hilfreich und präzise**: Stelle sicher, dass Feedback-Nachrichten hilfreich, präzise und handlungsorientiert sind.

4. **Berücksichtigung der Barrierefreiheit**: Beachte immer die Barrierefreiheit, insbesondere bei dynamischen Benachrichtigungen.

5. **Services vs. Direkte Komponenten**: Verwende für Anwendungsweites Feedback (Toasts, Dialoge, Benachrichtigungen, Banner) die Service-APIs statt die Komponenten direkt einzubetten.

6. **Inline vs. Global**: Für kontextbezogenes Feedback verwende InlineMessage oder Alert direkt in den Templates, für globales Feedback verwende die Services.

7. **Vermeidung von Überladung**: Vermeide zu viele gleichzeitige Feedback-Elemente, um Benutzer nicht zu überfordern.

---

*Zuletzt aktualisiert: 11.05.2025