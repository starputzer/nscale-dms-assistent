---
title: "Fehlermeldungen und Benachrichtigungssystem"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["Benachrichtigungen", "Notification", "Fehlermeldung", "ErrorDisplay", "UI-Komponenten", "Toast", "Dialog", "Feedback", "Vue3"]
---

# Fehlermeldungen und Benachrichtigungssystem

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Das nscale DMS Assistent verfügt über ein umfassendes System zur Anzeige von Fehlermeldungen und Benachrichtigungen. Dieses Dokument beschreibt die verschiedenen Komponenten und Services, die für Benutzer-Feedback, Fehlermeldungen und Systembenachrichtigungen verwendet werden.

## Komponenten

### 1. Notification-Komponente

Die `Notification.vue`-Komponente ist die zentrale Benutzeroberfläche für das Anzeigen von Benachrichtigungen aller Art. Sie wurde als flexible, konfigurierbare Komponente implementiert und unterstützt verschiedene Benachrichtigungstypen und -prioritäten.

#### Funktionsumfang

- Unterstützung von 5 Benachrichtigungstypen: Info, Erfolg, Warnung, Fehler und System
- Priorisierung von Benachrichtigungen (niedrig, mittel, hoch, dringend)
- Gruppierung ähnlicher Benachrichtigungen
- Automatisches Ausblenden nach konfigurierbarer Zeit
- Detaillierte Ansicht für zusätzliche Informationen
- Aktionsbuttons für interaktive Benachrichtigungen
- Vollständiges Benachrichtigungszentrum mit Filterfunktionen
- Persistenz wichtiger Benachrichtigungen im LocalStorage
- Responsive Darstellung für alle Bildschirmgrößen
- Keyboard-Navigation und Barrierefreiheit nach WCAG-Richtlinien

#### Verwendungsbeispiel

```vue
<template>
  <Notification position="top-right" :maxVisible="5" showIcon />
</template>

<script setup>
import { Notification } from '@/components/ui';
import { notificationService } from '@/services/ui/NotificationService';
import { onMounted } from 'vue';

onMounted(() => {
  // Einfache Info-Benachrichtigung
  notificationService.info('Daten wurden erfolgreich geladen');
  
  // Detaillierte Erfolgs-Benachrichtigung
  notificationService.success('Dokument wurde erfolgreich konvertiert', {
    title: 'Konvertierung abgeschlossen',
    details: 'Die Konvertierung wurde in 2,5 Sekunden durchgeführt.',
    priority: 'medium',
    expires: 5000 // Automatisch nach 5 Sekunden ausblenden
  });
  
  // Fehler-Benachrichtigung mit Aktionen
  notificationService.error('Fehler beim Speichern des Dokuments', {
    title: 'Speicherfehler',
    details: 'Der Server konnte das Dokument nicht speichern. Fehlercode: 500',
    priority: 'high',
    persistent: true, // Bleibt bestehen bis manuell geschlossen
    actions: [
      {
        label: 'Erneut versuchen',
        handler: () => { /* Speichern erneut durchführen */ },
        closeOnClick: false, // Bleibt nach Klick bestehen
        primary: true
      },
      {
        label: 'Ignorieren',
        handler: () => { /* Fehler ignorieren */ },
        closeOnClick: true // Wird nach Klick geschlossen
      }
    ]
  });
});
</script>
```

#### Positionierung

Die Komponente unterstützt sechs verschiedene Positionierungen:

- `top-right` (Standard): Oben rechts
- `top-left`: Oben links
- `bottom-right`: Unten rechts
- `bottom-left`: Unten links
- `top-center`: Oben mittig
- `bottom-center`: Unten mittig

#### Anpassung des Erscheinungsbilds

Das Erscheinungsbild der Benachrichtigungen kann über CSS-Variablen angepasst werden, die das aktuelle Farbschema berücksichtigen:

```css
--n-color-background: #ffffff;       /* Hintergrundfarbe */
--n-color-text-primary: #333333;     /* Primäre Textfarbe */
--n-color-text-secondary: #666666;   /* Sekundäre Textfarbe */
--n-color-text-tertiary: #999999;    /* Tertiäre Textfarbe */
--n-color-border: #e0e0e0;           /* Rahmenfarbe */
--n-color-primary: #3498db;          /* Primärfarbe für Aktionen */
--n-color-info: #3498db;             /* Farbe für Info-Benachrichtigungen */
--n-color-success: #2ecc71;          /* Farbe für Erfolgs-Benachrichtigungen */
--n-color-warning: #f39c12;          /* Farbe für Warnungs-Benachrichtigungen */
--n-color-error: #e74c3c;            /* Farbe für Fehler-Benachrichtigungen */
--n-color-system: #9b59b6;           /* Farbe für System-Benachrichtigungen */
--n-border-radius: 0.25rem;          /* Eckradius */
--n-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1); /* Schatten */
--n-z-index-notification: 9000;      /* Z-Index für Stapelreihenfolge */
```

### 2. ErrorDisplay-Komponente

Die `ErrorDisplay.vue` ist eine spezialisierte Komponente für die strukturierte Anzeige von Fehlermeldungen, insbesondere im Kontext des Dokumentenkonverters. Sie bietet detaillierte Fehlerinformationen und Lösungsvorschläge.

#### Funktionsumfang

- Kategorisierung von Fehlern nach Schweregrad
- Strukturierte Darstellung mit Fehlercode, Meldung und Lösungsvorschlag
- Unterstützung für erweiterte Details bei komplexen Fehlern
- Verbindung zu relevanten Hilfethemen
- Protokollierung von Fehlern für Diagnosen und Support
- Aktionsbuttons für Benutzerinteraktionen (z.B. Wiederholen, Ignorieren)

#### Verwendungsbeispiel

```vue
<template>
  <ErrorDisplay 
    :errors="conversionErrors" 
    :showRetryButton="true"
    @retry="handleRetry" />
</template>

<script setup>
import { ref } from 'vue';
import { ErrorDisplay } from '@/components/admin/document-converter';

const conversionErrors = ref([
  {
    code: 'ERR_FILE_FORMAT',
    title: 'Ungültiges Dateiformat',
    message: 'Die Datei "bericht.xyz" hat ein nicht unterstütztes Format.',
    details: 'Der Dokumentenkonverter unterstützt die Formate: DOCX, PDF, XLSX, PPTX, HTML.',
    severity: 'error',
    timestamp: new Date(),
    solutions: [
      'Konvertieren Sie die Datei in ein unterstütztes Format',
      'Wenden Sie sich an den Support für weitere Dateiformate'
    ]
  },
  {
    code: 'WARN_METADATA',
    title: 'Metadaten unvollständig',
    message: 'Einige Metadaten konnten nicht extrahiert werden.',
    severity: 'warning',
    timestamp: new Date()
  }
]);

function handleRetry() {
  // Konvertierung wiederholen
}
</script>
```

### 3. AlertDialog-Komponente

Für kritische Benachrichtigungen, die eine sofortige Benutzeraktion erfordern, wird die `AlertDialog`-Komponente verwendet. Diese basiert auf dem Dialog-System und blockiert die Benutzeroberfläche, bis eine Entscheidung getroffen wurde.

#### Verwendungsbeispiel

```vue
<script setup>
import { useDialog } from '@/composables/useDialog';

const { showAlert, showConfirm } = useDialog();

// Einfache Benachrichtigung
function showSimpleAlert() {
  showAlert('Die Änderungen wurden gespeichert.');
}

// Kritische Warnung mit Bestätigung
function showCriticalWarning() {
  showConfirm(
    'Diese Aktion kann nicht rückgängig gemacht werden. Möchten Sie fortfahren?',
    {
      title: 'Kritische Aktion',
      type: 'warning',
      confirmText: 'Fortfahren',
      cancelText: 'Abbrechen',
      icon: true
    }
  ).then(confirmed => {
    if (confirmed) {
      // Aktion ausführen
    }
  });
}
</script>
```

## Services

### NotificationService

Der `NotificationService` ist der zentrale Dienst zur Verwaltung von Benachrichtigungen. Er implementiert eine reactive API für die Verwendung in der gesamten Anwendung.

#### Features

- Typisierte API für verschiedene Benachrichtigungstypen
- Statusverwaltung für Benachrichtigungen (gelesen, ungelesen)
- Persistenz für wichtige Benachrichtigungen
- Gruppierung und Priorisierung
- Automatisches Entfernen abgelaufener Benachrichtigungen
- Begrenzung der maximalen Benachrichtigungsanzahl

#### API

```typescript
// Hinzufügen verschiedener Nachrichtentypen
notificationService.info(message, options);
notificationService.success(message, options);
notificationService.warning(message, options);
notificationService.error(message, options);
notificationService.system(message, options);

// Allgemeine Methode mit vollständiger Kontrolle
notificationService.add(message, {
  title: string;             // Titel
  type: NotificationType;    // 'info' | 'success' | 'warning' | 'error' | 'system'
  priority: NotificationPriority; // 'low' | 'medium' | 'high' | 'urgent'
  details: string;           // Detaillierte Informationen
  persistent: boolean;       // Bleibt bestehen bis manuell geschlossen
  expires: number;           // Automatische Ausblendung nach X Millisekunden
  actions: NotificationAction[]; // Aktionsbuttons
  groupId: string;           // Gruppierung ähnlicher Benachrichtigungen
  storeOffline: boolean;     // Im LocalStorage speichern
  onClose: Function;         // Callback beim Schließen
  onRead: Function;          // Callback beim Lesen
});

// Benachrichtigungen verwalten
notificationService.remove(id);            // Entfernt eine Benachrichtigung
notificationService.markAsRead(id);        // Markiert als gelesen
notificationService.markAsUnread(id);      // Markiert als ungelesen
notificationService.markAllAsRead();       // Markiert alle als gelesen
notificationService.markGroupAsRead(groupId); // Markiert Gruppe als gelesen
notificationService.clear();               // Entfernt alle Benachrichtigungen
notificationService.clearGroup(groupId);   // Entfernt alle in einer Gruppe

// Status abfragen
notificationService.notifications;         // Alle Benachrichtigungen
notificationService.groups;                // Alle Benachrichtigungsgruppen
notificationService.unreadCount;           // Anzahl ungelesener Benachrichtigungen
notificationService.count;                 // Gesamtanzahl der Benachrichtigungen
```

### DialogService

Der `DialogService` verwaltet alle Dialoge der Anwendung, einschließlich Benachrichtigungs- und Bestätigungsdialoge.

```typescript
// Import
import { dialogService } from '@/services/ui/DialogService';

// Informationsdialog
dialogService.alert('Nachricht', {
  title: 'Titel',
  type: 'info' // 'info', 'success', 'warning', 'error'
});

// Bestätigungsdialog
dialogService.confirm('Möchten Sie fortfahren?', {
  title: 'Bestätigung erforderlich',
  type: 'warning',
  confirmText: 'Ja, fortfahren',
  cancelText: 'Nein, abbrechen'
}).then(result => {
  if (result) {
    // Bestätigt
  } else {
    // Abgebrochen
  }
});
```

### Integration mit ErrorReportingService

Der `ErrorReportingService` ist für die zentrale Fehlerbehandlung zuständig und integriert sich eng mit dem Benachrichtigungssystem:

```typescript
import { errorReportingService } from '@/utils/errorReportingService';

// Fehler protokollieren und anzeigen
errorReportingService.reportError(error, {
  context: 'Dokumentenkonverter',
  showNotification: true, // Zeigt automatisch eine Benachrichtigung an
  severity: 'error',
  user: currentUser.value?.username
});
```

## Fehlerkategorien

Das System unterstützt verschiedene Fehlerkategorien, die unterschiedlich behandelt werden:

1. **Validierungsfehler**: Fehler bei der Benutzereingabe, werden direkt im Kontext des Eingabefelds angezeigt
2. **Anwendungsfehler**: Fehler während der Ausführung von Funktionen, werden als Benachrichtigungen oder ErrorDisplay angezeigt
3. **Netzwerkfehler**: Fehler bei der Kommunikation mit dem Server, werden als Benachrichtigungen mit Wiederholungsoption angezeigt
4. **Systemfehler**: Kritische Fehler, die den Betrieb der Anwendung beeinträchtigen, werden als Dialoge angezeigt und protokolliert
5. **Warnungen**: Nicht kritische Probleme, die Benutzeraufmerksamkeit erfordern, werden als Warnungsbenachrichtigungen angezeigt

## Beispiele typischer Implementierungen

### Fehlerbehandlung in API-Calls

```typescript
import { notificationService } from '@/services/ui/NotificationService';
import { ApiService } from '@/services/api/ApiService';

async function loadDocuments() {
  try {
    const documents = await ApiService.get('/documents');
    return documents;
  } catch (error) {
    // Fehlertyp analysieren
    if (error.status === 401) {
      notificationService.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', {
        title: 'Authentifizierungsfehler',
        priority: 'high',
        actions: [{
          label: 'Anmelden',
          handler: () => router.push('/login'),
          primary: true
        }]
      });
    } else if (error.status === 404) {
      notificationService.warning('Keine Dokumente gefunden.', {
        title: 'Leere Dokumentenliste'
      });
    } else {
      notificationService.error(`Fehler beim Laden der Dokumente: ${error.message}`, {
        title: 'Ladefehler',
        details: JSON.stringify(error, null, 2),
        actions: [{
          label: 'Erneut versuchen',
          handler: () => loadDocuments(),
          primary: true
        }]
      });
    }
    return [];
  }
}
```

### Validierungsfehler in Formularen

```vue
<template>
  <form @submit.prevent="submitForm">
    <div class="form-group">
      <label for="filename">Dateiname</label>
      <input id="filename" v-model="filename" />
      <div v-if="errors.filename" class="error-message">
        {{ errors.filename }}
      </div>
    </div>
    
    <button type="submit" :disabled="isSubmitting">Speichern</button>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { notificationService } from '@/services/ui/NotificationService';

const filename = ref('');
const errors = reactive({});
const isSubmitting = ref(false);

function validateForm() {
  errors.filename = '';
  let isValid = true;
  
  if (!filename.value.trim()) {
    errors.filename = 'Bitte geben Sie einen Dateinamen ein';
    isValid = false;
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(filename.value)) {
    errors.filename = 'Der Dateiname enthält ungültige Zeichen';
    isValid = false;
  }
  
  return isValid;
}

async function submitForm() {
  if (!validateForm()) {
    notificationService.warning('Das Formular enthält Fehler. Bitte korrigieren Sie die markierten Felder.');
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    // Formular absenden
    await saveDocument({ filename: filename.value });
    
    notificationService.success('Dokument wurde erfolgreich gespeichert.', {
      title: 'Speicherung erfolgreich'
    });
    
    // Formular zurücksetzen
    filename.value = '';
  } catch (error) {
    notificationService.error(`Fehler beim Speichern: ${error.message}`, {
      title: 'Speicherfehler'
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

## Barrierefreiheit (Accessibility)

Das Benachrichtigungssystem wurde mit Fokus auf Barrierefreiheit entwickelt:

- Benachrichtigungen verwenden `role="status"` oder `role="alert"` je nach Wichtigkeit
- Systembenachrichtigungen verwenden `aria-live="assertive"` für sofortige Ankündigung
- Weniger wichtige Benachrichtigungen verwenden `aria-live="polite"`
- Alle Benachrichtigungen haben eindeutige Aria-Label und -Descriptions
- Keyboard-Navigation ermöglicht die Interaktion ohne Maus
- Farbkontraste erfüllen die WCAG AA-Standards
- Animationen können mit der `prefers-reduced-motion`-Einstellung deaktiviert werden

## Best Practices

### Wann welchen Benachrichtigungstyp verwenden

1. **Info (blau)**: Neutrale Informationen und Statusmeldungen
   - *Beispiel*: "Die Dokumente wurden erfolgreich geladen."

2. **Erfolg (grün)**: Positive Bestätigungen über erfolgreich abgeschlossene Aktionen
   - *Beispiel*: "Das Dokument wurde erfolgreich gespeichert."

3. **Warnung (gelb/orange)**: Nicht-kritische Probleme, die Aufmerksamkeit erfordern
   - *Beispiel*: "Ihre Sitzung läuft in 5 Minuten ab."

4. **Fehler (rot)**: Fehler, die die Ausführung einer Aktion verhindert haben
   - *Beispiel*: "Das Dokument konnte nicht gespeichert werden."

5. **System (lila)**: Wichtige Systemmeldungen und Wartungshinweise
   - *Beispiel*: "Die Anwendung wird in 10 Minuten für Wartungsarbeiten neu gestartet."

### Häufige Fehlerszenarien und deren Behandlung

| Szenario | Empfohlene Behandlung |
|----------|------------------------|
| Netzwerkfehler | Fehlerbenachrichtigung mit Wiederholungsoption und Offline-Modus-Aktivierung |
| Authentifizierungsfehler | Fehlerbenachrichtigung mit Link zur Anmeldeseite und automatische Weiterleitung |
| Validierungsfehler | Inline-Fehlermeldungen bei den betroffenen Feldern und zusammenfassende Warnung |
| Berechtigungsfehler | Fehlerbenachrichtigung mit Information über fehlende Berechtigungen und Kontaktmöglichkeit |
| Zeitüberschreitung | Warnung mit automatischer Wiederholung und Fallback-Optionen |
| Datenverlust | Kritischer Dialog mit Wiederherstellungsoptionen |

## Migration von Legacy-Code

Bei der Migration von Legacy-Code zum neuen Benachrichtigungssystem sollten folgende Schritte befolgt werden:

1. Identifizieren aller bestehenden Fehlermeldungen und Benachrichtigungen im Legacy-Code
2. Kategorisieren nach Typ (Info, Erfolg, Warnung, Fehler, System)
3. Erstellen eines Mapping-Plans mit alten und neuen Implementierungen
4. Schrittweise Migration mit Fokus auf kritische Fehlermeldungen zuerst
5. Validierung der korrekten Anzeige und Interaktion in verschiedenen Kontexten
6. Dokumentation der migrierten Fehlermeldungen für Referenz und Wartung

## Erweiterbarkeit

Das Benachrichtigungssystem ist für zukünftige Erweiterungen konzipiert:

- **Notification Channels**: Erweiterung um zusätzliche Kanäle wie E-Mail oder Push-Benachrichtigungen
- **Filter und Management**: Erweiterte Filteroptionen und Verwaltungsmöglichkeiten für Benachrichtigungen
- **Analytik**: Erfassung von Metriken zur Fehleranalyse und Benutzerinteraktion
- **Kontext-basierte Anpassung**: Intelligente Anpassung der Benachrichtigungen basierend auf Benutzerverhalten und Anwendungskontext

## Zusammenfassung

Das Fehlermeldungs- und Benachrichtigungssystem der nscale DMS Assistent-Anwendung bietet eine umfassende Infrastruktur für die Benutzerinteraktion. Durch die Verwendung typisierter Services, barrierefreier Komponenten und kontextbezogener Fehlermeldungen wird eine konsistente und benutzerfreundliche Erfahrung sichergestellt.

Die klare Trennung zwischen Komponenten und Services ermöglicht eine flexible Verwendung in verschiedenen Kontexten der Anwendung, während die einheitliche Darstellung für ein konsistentes Erscheinungsbild sorgt. Die Integration mit dem ErrorReportingService gewährleistet zudem eine zuverlässige Fehlerprotokollierung für eine verbesserte Fehlerdiagnose und Support.