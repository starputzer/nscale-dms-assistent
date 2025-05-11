# Dokumentenkonverter-Modul

*Zuletzt aktualisiert: 08.05.2025*

Dieses Dokument beschreibt das Dokumentenkonverter-Modul des nscale DMS Assistant, seine Komponenten, Services und deren Verwendung.

## Übersicht

Der Dokumentenkonverter ist eine zentrale Funktionalität des nscale DMS Assistant, die es Benutzern ermöglicht, verschiedene Dokumententypen in standardisierte Formate zu konvertieren. Das Modul besteht aus mehreren Vue 3 Single File Components (SFCs), die gemeinsam eine benutzerfreundliche und robuste Oberfläche für die Dokumentenkonvertierung bieten.

## Komponenten

### 1. DocConverterContainer

Die Hauptkomponente, die alle anderen Komponenten des Dokumentenkonverters enthält und koordiniert.

### 2. FileUpload

Eine spezialisierte Komponente zum Hochladen von Dokumenten mit Drag-and-Drop-Funktionalität und Dateitypvalidierung.

### 3. ConversionProgress

Diese Komponente zeigt den Fortschritt der Dokumentenkonvertierung an, einschließlich verbleibender Zeit und aktuellem Konvertierungsschritt.

**Hauptfunktionen:**
- Anzeige des Fortschritts in Prozent mit Fortschrittsbalken
- Berechnung und Anzeige der verbleibenden Zeit
- Anzeige des aktuellen Konvertierungsschritts
- Abbrechen-Button zum Stoppen der Konvertierung
- Vollständige Barrierefreiheit durch ARIA-Attribute

**Beispielverwendung:**
```vue
<ConversionProgress
  :progress="conversionProgress"
  :remaining-time="remainingSeconds"
  :current-step="currentStep"
  :is-completed="isCompleted"
  @cancel="handleCancelConversion"
/>
```

### 4. DocumentList

Eine Komponente zur Anzeige und Verwaltung der konvertierten Dokumente mit Sortier-, Filter- und Paginierungsfunktionen.

**Hauptfunktionen:**
- Tabellarische Anzeige aller konvertierten Dokumente
- Sortierung nach verschiedenen Kriterien (Name, Datum, Größe)
- Filterung nach Dokumenttypen und Suchbegriffen
- Paginierung für große Dokumentenlisten
- Aktionen für jedes Dokument (Anzeigen, Herunterladen, Löschen)

**Beispielverwendung:**
```vue
<DocumentList
  :documents="documents"
  :loading="isLoading"
  :selected-document="selectedDocument"
  @select="handleDocumentSelect"
  @view="handleDocumentView"
  @download="handleDocumentDownload"
  @delete="handleDocumentDelete"
/>
```

### 5. ErrorDisplay

Eine spezialisierte Komponente zur Anzeige von Fehlern während des Konvertierungsprozesses, die unterschiedliche Fehlertypen behandelt und spezifische Lösungen anbietet.

**Hauptfunktionen:**
- Unterschiedliche visuelle Stile je nach Fehlertyp
- Automatische Fehlertypenerkennung
- Erweiterbare/zusammenklappbare technische Details
- Spezifische Lösungsvorschläge je nach Fehlertyp
- Aktionsbuttons für "Erneut versuchen", "Support kontaktieren" und "Einfache Version verwenden"

**Fehlertypen:**
- Netzwerkfehler
- Formatfehler
- Serverfehler
- Berechtigungsfehler

**Beispielverwendung:**
```vue
<ErrorDisplay
  :error="conversionError"
  :details="errorDetails"
  :error-type="detectedErrorType"
  @retry="handleRetry"
  @support="contactSupport"
  @fallback="useFallbackVersion"
/>
```

## Services

### DocumentConverterService

Ein Service, der die Kommunikation zwischen dem Frontend und den Backend-API-Endpunkten für den Dokumentenkonverter bereitstellt.

**Hauptmethoden:**
- `uploadDocument`: Lädt Dateien zum Server mit Fortschrittsüberwachung
- `convertDocument`: Konvertiert hochgeladene Dokumente mit Fortschrittsüberwachung
- `getDocuments`: Ruft alle verfügbaren Dokumente ab
- `getDocument`: Ruft ein spezifisches Dokument ab
- `deleteDocument`: Löscht ein Dokument
- `downloadDocument`: Lädt ein konvertiertes Dokument herunter
- `getConversionStatus`: Prüft den Status einer laufenden Konvertierung
- `cancelConversion`: Bricht eine laufende Konvertierung ab

**Fehlerbehandlung:**
- Standardisierte Fehlerformate mit aussagekräftigen Codes und Meldungen
- Integration mit dem vorhandenen RetryHandler für Wiederholungsversuche
- Erkennung von Rate-Limiting durch Integration mit dem RateLimitHandler
- Timeout-Handling für lang andauernde Operationen

**Fortschrittsüberwachung:**
- Bei Uploads mit prozentualer Fortschrittsanzeige
- Bei Konvertierungen mit Schritt, Fortschritt und Zeitabschätzung
- Polling-Mechanismus für Fortschrittsupdates während der Konvertierung

**Mockimplementierung:**
Für Entwicklungs- und Testzwecke steht eine MockDocumentConverterService-Klasse zur Verfügung, die alle Funktionen ohne tatsächliche Backend-Kommunikation simuliert.

## Integration mit dem Fallback-Mechanismus

Der Dokumentenkonverter ist vollständig in den [Fallback-Mechanismus](./ERROR_HANDLING_FALLBACK.md) des nscale DMS Assistant integriert. Dies wird durch drei Hauptkomponenten erreicht:

1. **EnhancedFeatureWrapper**: Wrapping der Dokumentenkonverter-SFC-Komponenten mit dem Feature-Flag `useSfcDocConverter`.
2. **ErrorBoundary**: Integration in jede Unterkomponente des Dokumentenkonverters für granulare Fehlerbehandlung.
3. **Intermediäre Komponenten**: Vereinfachte Versionen der Dokumentenkonverter-Komponenten für einen progressiven Fallback-Mechanismus.

Bei Fehlern in einer SFC-Komponente wird automatisch entweder die intermediäre Version oder die Legacy-Implementierung verwendet, um einen kontinuierlichen Betrieb zu gewährleisten.

## Testing

Alle Komponenten des Dokumentenkonverters sind umfassend mit Unit-Tests abgedeckt. Die Tests prüfen:

- Korrektes Rendering der UI-Elemente
- Benutzereingaben und -interaktionen
- Korrekte Verarbeitung von Props und Events
- Edge Cases und Fehlerszenarien
- Integration mit dem Store und anderen Services

Testdateien:
- `ErrorDisplay.spec.ts`
- `ConversionProgress.spec.ts`
- `FileUpload.spec.ts`
- `DocumentList.spec.ts`
- `DocConverterContainer.spec.ts`

## Best Practices

Bei der Verwendung des Dokumentenkonverters sollten folgende Best Practices beachtet werden:

1. **Fehlerbehandlung**: Alle Fehler während der Dokumentenkonvertierung sollten mit der ErrorDisplay-Komponente angezeigt werden.
2. **Fortschrittsüberwachung**: Bei lang andauernden Operationen sollte immer die ConversionProgress-Komponente verwendet werden.
3. **Typsicherheit**: Alle Interaktionen mit dem Dokumentenkonverter sollten die definierten TypeScript-Typen verwenden.
4. **Barrierefreiheit**: Alle Komponenten bieten umfassende ARIA-Attribute und sollten unverändert verwendet werden.
5. **Internationalisierung**: Alle Texte sollten über die i18n-Funktionalität lokalisiert werden.

## Zukünftige Erweiterungen

Geplante Erweiterungen für das Dokumentenkonverter-Modul:

1. Unterstützung für weitere Dokumentformate
2. Verbesserte Metadatenextraktion aus konvertierten Dokumenten
3. Batch-Konvertierung mehrerer Dokumente
4. Integration mit Dokumentvorlagen
5. Erweiterte Anpassungsoptionen für den Konvertierungsprozess