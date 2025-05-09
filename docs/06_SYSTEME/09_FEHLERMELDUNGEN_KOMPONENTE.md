# Fehlermeldungen-Komponente (ErrorDisplay)

Die `ErrorDisplay`-Komponente ist eine Vue 3-Komponente, die für die benutzerfreundliche Anzeige von Fehlern im Dokumentenkonverter entwickelt wurde. Sie bietet verschiedene visuelle Darstellungen je nach Fehlertyp und stellt dem Benutzer Optionen zur Fehlerbehebung bereit. Mit der Integration des neuen `DocumentConverterServiceWrapper` wurde die Fehlerbehandlung grundlegend verbessert und standardisiert.

## Funktionalitäten

- Visuelle Kategorisierung von Fehlern (Netzwerk, Format, Server, Berechtigung, Validierung, Timeout, Unbekannt)
- Informative und benutzerfreundliche Fehlermeldungen mit Lösungsvorschlägen
- Kontextbezogene Hilfestellungen in Form von Aufzählungslisten
- Optionale Anzeige von technischen Details für Entwickler
- Intelligente Fehlertyperkennung durch den ServiceWrapper
- Standardisiertes Fehlerformat mit einheitlicher Struktur
- Verbesserte Aktionsoptionen (Wiederholung, Support, Fallback-Optionen)
- Vollständige Integration mit dem `DocumentConverterServiceWrapper`

## Technische Eigenschaften

- Implementiert als Vue 3 Single File Component mit Composition API
- TypeScript für Typsicherheit und klare Schnittstellen
- Berechnung relevanter Informationen aus verschiedenen Fehlertypen
- Responsive Darstellung für mobile Geräte
- ARIA-Attribute für Barrierefreiheit
- Fallback-i18n-Lösung für Mehrsprachigkeit

## Installation und Import

Die Komponente kann aus dem Verzeichnis `/src/components/admin/document-converter/` importiert werden:

```typescript
import ErrorDisplay, { ErrorType, ErrorObject } from '@/components/admin/document-converter/ErrorDisplay.vue';
```

## Props

| Name | Typ | Standard | Beschreibung |
|------|-----|----------|--------------|
| `error` | `Error \| ErrorObject \| string` | - | Der anzuzeigende Fehler (erforderlich) |
| `showDetails` | `boolean` | `false` | Ob technische Details standardmäßig angezeigt werden sollen |
| `errorType` | `'network' \| 'format' \| 'server' \| 'permission' \| 'unknown'` | `'unknown'` | Der Typ des Fehlers für visuelle Unterscheidung |
| `canRetry` | `boolean` | `true` | Ob ein Wiederholungsversuch möglich ist |
| `canContactSupport` | `boolean` | `false` | Ob die Option zum Kontaktieren des Supports angezeigt werden soll |
| `showFallbackOption` | `boolean` | `false` | Ob eine Fallback-Option angezeigt werden soll |

## Events

| Event | Beschreibung |
|-------|--------------|
| `retry` | Wird ausgelöst, wenn der "Erneut versuchen"-Button geklickt wird |
| `contact-support` | Wird ausgelöst, wenn der "Support kontaktieren"-Button geklickt wird |
| `fallback` | Wird ausgelöst, wenn der "Einfache Version verwenden"-Button geklickt wird |

## Verwendung

### Basis-Implementierung

```vue
<template>
  <ErrorDisplay 
    :error="error"
    @retry="handleRetry"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ErrorDisplay from '@/components/admin/document-converter/ErrorDisplay.vue';

const error = ref('Ein Fehler ist bei der Konvertierung aufgetreten.');

function handleRetry() {
  // Führe die Konvertierung erneut durch
}
</script>
```

### Erweiterte Nutzung mit strukturiertem Fehlerobjekt

```vue
<template>
  <ErrorDisplay 
    :error="conversionError"
    error-type="format"
    :show-details="true"
    :can-contact-support="true"
    @retry="handleRetry"
    @contact-support="openSupportForm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ErrorDisplay, { ErrorObject } from '@/components/admin/document-converter/ErrorDisplay.vue';

const conversionError = ref<ErrorObject>({
  message: 'Die Datei "Quartalsbericht.xlsx" konnte nicht konvertiert werden.',
  code: 'FILE_FORMAT_ERROR',
  type: 'format',
  details: 'Die Excel-Datei enthält nicht unterstützte Makros oder ist passwortgeschützt.',
  resolution: 'Entfernen Sie Makros und stellen Sie sicher, dass die Datei nicht passwortgeschützt ist.'
});

function handleRetry() {
  // Führe die Konvertierung erneut durch
}

function openSupportForm() {
  // Öffne das Support-Formular mit vorausgefüllten Fehlerdetails
}
</script>
```

## Fehlertypen und ihre Darstellung

Die Komponente verwendet unterschiedliche visuelle Stile für verschiedene Fehlertypen, jetzt mit erweitertem Fehlertyp-Set:

| Fehlertyp | Farbe | Icon | Beschreibung | Beispiel-Fehlercode |
|-----------|-------|------|--------------|---------------------|
| `network` | Blau | Wi-Fi | Netzwerkfehler bei der Verbindung zum Konvertierungsserver | `UPLOAD_FAILED`, `DOWNLOAD_FAILED` |
| `format` | Gelb | Datei | Probleme mit dem Dateiformat oder der Dokumentstruktur | `INVALID_FORMAT`, `UNSUPPORTED_FILE_TYPE` |
| `server` | Rot | Server | Serverfehler oder Probleme mit dem Konvertierungsdienst | `SERVER_ERROR`, `CONVERSION_FAILED` |
| `permission` | Violett | Schloss | Berechtigungsprobleme oder fehlende Zugriffrechte | `UNAUTHORIZED`, `ACCESS_DENIED` |
| `validation` | Orange | Ausrufezeichen | Validierungsfehler bei der Eingabe oder den Daten | `VALIDATION_ERROR`, `INVALID_PARAMETERS` |
| `timeout` | Blau | Uhr | Zeitüberschreitung bei API-Anfragen oder Verarbeitungen | `REQUEST_TIMEOUT`, `CONVERSION_TIMEOUT` |
| `unknown` | Grau | Ausrufezeichen | Unbekannte oder nicht kategorisierte Fehler | `GENERIC_ERROR`, `UNKNOWN_ERROR` |

### Neue Fehler-Response-Formatierung

Jeder Fehlertyp wird nun mit zusätzlichen, strukturierten Informationen angezeigt:

- **Fehlertitel**: Deutliche, typenspezifische Überschrift
- **Fehlermeldung**: Benutzerfreundliche Beschreibung des Problems
- **Lösungsvorschlag**: Kontextbezogene Anleitung zur Behebung
- **Hilfestellungen**: Aufzählungsliste mit konkreten Handlungsempfehlungen
- **Fehlercode**: Eindeutiger Code für Support-Referenz und Fehlerberichte
- **Technische Details**: Ausklappbare Entwicklerinformationen

## Automatische Fehlertyperkennung

Die Komponente versucht, den Fehlertyp automatisch zu erkennen, wenn kein expliziter Typ übergeben wird. Dies erfolgt basierend auf:

1. Der `type`-Eigenschaft bei einem `ErrorObject`
2. Der `code`-Eigenschaft bei einem `ErrorObject`
3. Schlüsselwörtern in der Fehlermeldung (z.B. "network", "format", "permission")

Wenn keine eindeutige Zuordnung möglich ist, wird der Typ `unknown` verwendet.

## Erweiterte Fehlerobjekte und ServiceWrapper-Integration

Mit der Einführung des `DocumentConverterServiceWrapper` wurde die Fehlerbehandlung standardisiert. Alle API-Fehler werden in das `ConversionError`-Format konvertiert:

```typescript
// Base Error Object
interface ErrorObject {
  message: string;            // Benutzerfreundliche Fehlermeldung
  code: string;               // Fehlercode (z.B. 'UPLOAD_FAILED')
  details?: string;           // Technische Details für Entwickler
  type: 'network' | 'format' | 'server' | 'permission' | 'validation' | 'timeout' | 'unknown';
  resolution?: string;        // Lösungsvorschlag für den Benutzer
  helpItems?: string[];       // Liste mit konkreten Hilfestellungen
}

// Extended Error Interface from ServiceWrapper
export interface ConversionError extends ErrorObject {
  documentId?: string;        // Betroffene Dokument-ID
  originalError?: Error;      // Ursprünglicher Fehler
  timestamp: Date;            // Zeitstempel des Auftretens
}
```

### Verbesserungen durch den ServiceWrapper

Der `DocumentConverterServiceWrapper` bietet folgende Vorteile bei der Fehlerbehandlung:

1. **Standardisierte Fehlerverarbeitung**: Alle API-Fehler werden in das einheitliche `ConversionError`-Format konvertiert.
2. **Intelligente Fehlertyperkennung**: Der ServiceWrapper analysiert Fehlermeldungen und bestimmt automatisch den Fehlertyp:

```typescript
// Auszug aus DocumentConverterServiceWrapper.ts
private convertError(
  error: unknown,
  code: string,
  type: 'network' | 'format' | 'server' | 'permission' | 'validation' | 'timeout' | 'unknown' = 'unknown',
  additional: Partial<ConversionError> = {}
): ConversionError {
  // ...

  // Fehlertyp intelligent ermitteln, falls nicht explizit angegeben
  if (type === 'unknown' && typeof message === 'string') {
    const messageLower = message.toLowerCase();

    if (messageLower.includes('network') ||
        messageLower.includes('netzwerk') ||
        messageLower.includes('connection')) {
      type = 'network';
    } else if (messageLower.includes('permission') ||
               messageLower.includes('unauthorized')) {
      type = 'permission';
    }
    // Weitere intelligente Erkennung...
  }

  return {
    code,
    message: additional.message || message,
    details: additional.details || details,
    type,
    timestamp: new Date(),
    resolution: additional.resolution,
    helpItems: additional.helpItems,
    documentId: additional.documentId,
    originalError: error instanceof Error ? error : undefined
  };
}
```

## Lösungsvorschläge

Die Komponente zeigt automatisch kontextbezogene Lösungsvorschläge basierend auf dem Fehlertyp an. Diese können überschrieben werden, indem eine `resolution`-Eigenschaft im Fehlerobjekt bereitgestellt wird.

## Beispielkomponente

Eine vollständige Beispielkomponente, die alle Funktionen der `ErrorDisplay`-Komponente demonstriert, ist im Verzeichnis `/examples/document-converter/ErrorDisplayExample.vue` verfügbar.

Diese Beispielkomponente zeigt:
- Die verschiedenen Fehlertypen und ihre visuelle Darstellung
- Die Verwendung einfacher Strings, Error-Objekte und strukturierter ErrorObjects
- Die Anpassung der Anzeige von technischen Details
- Die Integration von Aktionsbuttons
- Die Verwendung von Lösungsvorschlägen

## Barrierefreiheit

Die Komponente wurde mit Fokus auf Barrierefreiheit entwickelt:
- Verwendung von `role="alert"` für Bildschirmleser
- `aria-live="assertive"` für dynamische Änderungen
- Aussagekräftige ARIA-Labels für Aktionsknöpfe
- Verbesserte Tastaturbedienung mit visuellen Fokus-Indikatoren
- Ausreichende Farbkontraste für alle Fehlertypen

## Internationalisierung

Die Komponente verwendet eine Fallback-i18n-Lösung mit einer `$t`-Funktion. In einer Umgebung mit einer i18n-Bibliothek kann diese durch die entsprechende Implementierung ersetzt werden.

## Verwendung mit dem ServiceWrapper

Die optimale Verwendung der ErrorDisplay-Komponente erfolgt nun mit dem DocumentConverterServiceWrapper:

```typescript
// In DocConverterContainer.vue
import { ref } from 'vue';
import ErrorDisplay from '@/components/admin/document-converter/ErrorDisplay.vue';
import documentConverterServiceWrapper from '@/services/api/DocumentConverterServiceWrapper';
import type { ConversionError } from '@/services/api/DocumentConverterServiceWrapper';

const error = ref<ConversionError | null>(null);

async function handleUpload(file: File) {
  try {
    // ServiceWrapper für Upload verwenden
    await documentConverterServiceWrapper.uploadDocument(file, (progress) => {
      uploadProgress.value = progress;
    });
  } catch (e) {
    // Der ServiceWrapper gibt bereits ein standardisiertes ConversionError zurück
    error.value = e as ConversionError;

    // Optional: Fehler an Monitoring-System senden
    if (error.value.code === 'UPLOAD_FAILED') {
      reportError(error.value);
    }
  }
}

function handleRetry() {
  // Fehler zurücksetzen und Aktion wiederholen
  error.value = null;
  if (lastAction.value) {
    lastAction.value();
  }
}
```

## Verbesserte Fehlerbehandlungsstrategie

Die erweiterte Fehlerbehandlung mit dem ServiceWrapper folgt diesen Prinzipien:

1. **Vorbeugende Fehlerbehandlung**:
   - Dateivalidierung vor Upload (Format, Größe, Anzahl)
   - Fortschrittsanzeige mit geschätzter Restzeit
   - Automatische Token-Aktualisierung bei Sitzungsablauf

2. **Zentrale Fehlererfassung**:
   - Standardisierte Fehlerformate durch den ServiceWrapper
   - Automatisches Logging aller Fehler mit Kontext
   - Zeitstempel und Dokument-IDs für bessere Nachverfolgbarkeit

3. **Benutzerorientierte Fehlermeldungen**:
   - Kontextbezogene Lösungsvorschläge statt technischer Details
   - Spezifische Hilfestellungen als Aufzählungsliste
   - Visuelle Unterscheidung von Fehlertypen für schnellere Orientierung

4. **Optimale Recovery-Pfade**:
   - Automatische Wiederholungsversuche bei Netzwerkproblemen
   - Fallback-Optionen bei serverseitigen Fehlern
   - Support-Kontakt bei komplexen Problemen

5. **Entwicklerfreundliche Diagnosedaten**:
   - Detaillierte technische Informationen in ausklappbaren Bereichen
   - Eindeutige Fehlercodes für Dokumentation und Support
   - Vollständige Stack-Traces während der Entwicklung

## Erweiterungen und Zukunftspläne

Auf Basis der aktuellen Verbesserungen sind folgende Erweiterungen für zukünftige Versionen geplant:

- **Fehleranalyse-Dashboard**: Aggregierte Ansicht häufiger Fehler für Administratoren
- **A/B-Testing für Fehlermeldungen**: Optimierung der Lösungsvorschläge basierend auf Erfolgsdaten
- **Proaktive Fehlerprävention**: Vorausschauende Warnungen bei erkannten Risikofaktoren
- **Kontext-sensitive Hilfe**: Direkte Verlinkung zu spezifischen Hilfeartikeln basierend auf Fehlertyp
- **Offline-Fehlerbehandlung**: Verbesserte Benutzerfreundlichkeit bei Netzwerkausfall
- **Internationalisierung der Fehlermeldungen**: Mehrsprachige Unterstützung für alle Fehlertypen