# Fehlermeldungen-Komponente (ErrorDisplay)

Die `ErrorDisplay`-Komponente ist eine Vue 3-Komponente, die für die benutzerfreundliche Anzeige von Fehlern im Dokumentenkonverter entwickelt wurde. Sie bietet verschiedene visuelle Darstellungen je nach Fehlertyp und stellt dem Benutzer Optionen zur Fehlerbehebung bereit.

## Funktionalitäten

- Visuelle Kategorisierung von Fehlern (Netzwerk, Format, Server, Berechtigung, Unbekannt)
- Informative und benutzerfreundliche Fehlermeldungen
- Optionale Anzeige von technischen Details für Entwickler
- Automatische Erkennung des Fehlertyps basierend auf der Fehlermeldung
- Lösungsvorschläge für verschiedene Fehlertypen
- Aktionsknöpfe für Wiederholungsversuche und Support
- Unterstützung für strukturierte Fehlerobjekte

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

Die Komponente verwendet unterschiedliche visuelle Stile für verschiedene Fehlertypen:

| Fehlertyp | Farbe | Icon | Beschreibung |
|-----------|-------|------|--------------|
| `network` | Blau | Wi-Fi | Netzwerkfehler bei der Verbindung zum Konvertierungsserver |
| `format` | Gelb | Datei | Probleme mit dem Dateiformat oder der Dokumentstruktur |
| `server` | Rot | Server | Serverfehler oder Probleme mit dem Konvertierungsdienst |
| `permission` | Violett | Schloss | Berechtigungsprobleme oder fehlende Zugriffrechte |
| `unknown` | Grau | Ausrufezeichen | Unbekannte oder nicht kategorisierte Fehler |

## Automatische Fehlertyperkennung

Die Komponente versucht, den Fehlertyp automatisch zu erkennen, wenn kein expliziter Typ übergeben wird. Dies erfolgt basierend auf:

1. Der `type`-Eigenschaft bei einem `ErrorObject`
2. Der `code`-Eigenschaft bei einem `ErrorObject`
3. Schlüsselwörtern in der Fehlermeldung (z.B. "network", "format", "permission")

Wenn keine eindeutige Zuordnung möglich ist, wird der Typ `unknown` verwendet.

## Erweiterte Fehlerobjekte

Für eine bessere Fehlerdarstellung kann das `ErrorObject`-Interface verwendet werden:

```typescript
interface ErrorObject {
  message: string;       // Benutzerfreundliche Fehlermeldung
  code?: string;         // Fehlercode (z.B. 'FILE_FORMAT_ERROR')
  details?: string;      // Technische Details für Entwickler
  type?: ErrorType;      // Fehlertyp für visuelle Kategorisierung
  stack?: string;        // Stack-Trace (wenn verfügbar)
  resolution?: string;   // Lösungsvorschlag für den Benutzer
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

## Erweiterungen

Für zukünftige Versionen könnten folgende Erweiterungen betrachtet werden:
- Integration mit einem Fehlerprotokollierungssystem
- Automatisches Senden von Fehlerberichten
- Erweiterung um zusätzliche Fehlertypen für spezifische Anwendungsfälle
- Progressive Offenlegung von Details (z.B. zuerst Benutzerhinweise, dann technische Details)
- Anbindung an ein Hilfesystem mit kontextbezogenen Artikeln