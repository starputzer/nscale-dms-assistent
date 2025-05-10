# Fehlerbehandlung und Fallback-Mechanismus

*Zuletzt aktualisiert: 08.05.2025*

Dieses Dokument beschreibt den Fehlerbehandlungs- und Fallback-Mechanismus für Vue 3 Single File Components (SFCs) im nscale DMS Assistant. Der Mechanismus ermöglicht ein robustes Fehlerbehandlungskonzept, das automatisch auf Legacy-Implementierungen zurückgreift, wenn in neuen Komponenten Fehler auftreten.

## Übersicht

Der Fallback-Mechanismus besteht aus mehreren Komponenten:

1. **ErrorBoundary**: Eine generische Komponente zur Fehlerbehandlung
2. **EnhancedFeatureWrapper**: Eine Erweiterung des Feature-Toggle-Systems
3. **fallbackManager**: Ein zentraler Manager für Fallbacks in der gesamten Anwendung
4. **useLogger**: Ein Logging-Utility für strukturierte Protokollierung

Der Mechanismus bietet folgende Hauptfunktionen:

- Automatische Fehlererfassung während Rendering und Lifecycle-Hooks
- Verschiedene Fallback-Strategien (sofort, Schwellwert, progressiv, manuell)
- Klassifizierung von Fehlern nach Schweregrad und Kategorie
- Deduplizierung von Fehlern zur Vermeidung kaskadierender Fallbacks
- Mehrstufige Fallbacks statt binärer neu/legacy Optionen
- Automatische Wiederherstellungsmechanismen
- Strukturierte Fehlerprotokolle und -berichte

## Komponenten

### ErrorBoundary.vue

Die `ErrorBoundary`-Komponente ist die Kernkomponente für die Fehlerbehandlung. Sie fängt Fehler ab, die während des Renderings oder in Lifecycle-Hooks auftreten.

**Hauptfunktionen:**

- Verschiedene Slot-basierte Rendering-Modi (normal, Fehler, Fallback)
- Konfigurierbare Fallback-Strategien
- Fehler-Deduplizierung und -Klassifizierung
- Automatische Wiederholungsversuche

**Verwendung:**

```vue
<ErrorBoundary
  feature-flag="useSfcDocConverter"
  fallback-strategy="threshold"
  :error-threshold="3"
  :retry-interval="5000"
  @error="handleError"
  @fallback="handleFallback"
>
  <!-- Standard-Inhalt (normale Komponente) -->
  <YourComponent />
  
  <!-- Fehler-Zustand -->
  <template #error="{ error, retry, report }">
    <div class="error-display">
      <p>Fehler: {{ error.message }}</p>
      <button @click="retry">Erneut versuchen</button>
    </div>
  </template>
  
  <!-- Fallback-Zustand -->
  <template #fallback="{ resetFallback }">
    <div class="fallback-component">
      <LegacyComponent />
      <button @click="resetFallback">Zurücksetzen</button>
    </div>
  </template>
</ErrorBoundary>
```

### EnhancedFeatureWrapper.vue

Der `EnhancedFeatureWrapper` erweitert das bestehende Feature-Toggle-System mit dem robusten Fallback-Mechanismus.

**Hauptfunktionen:**

- Integration mit dem ErrorBoundary für fortschrittliche Fehlerbehandlung
- Unterstützung für mehrstufige Fallbacks mit Zwischenkomponenten
- Automatische Integration mit dem Feature-Toggle-System
- Benutzerdefinierte UI für Fehler- und Fallback-Zustände

**Verwendung:**

```vue
<EnhancedFeatureWrapper
  feature="useSfcDocConverter"
  :new-component="SfcDocConverter"
  :intermediate-component="SimplifiedDocConverter"
  :legacy-component="LegacyDocConverter"
  fallback-strategy="progressive"
  :use-intermediate-failover="true"
  @feature-error="handleError"
>
  <!-- Optional: Benutzerdefinierte Slots werden an Komponenten weitergeleitet -->
  <template #actions="slotProps">
    <slot name="actions" v-bind="slotProps" />
  </template>
</EnhancedFeatureWrapper>
```

### fallbackManager.ts

Der `fallbackManager` ist ein Singleton-Service, der Fallbacks für die gesamte Anwendung koordiniert.

**Hauptfunktionen:**

- Zentrale Verwaltung von Fallback-Zuständen
- Featurespezifische Konfigurationen
- Automatische Wiederherstellungsmechanismen
- Fehler-Tracking, -Aggregation und -Deduplizierung
- Event-Historie für Audit und Debugging

**Verwendung:**

```typescript
import { useFallbackManager } from '@/utils/fallbackManager';

// Fallback-Manager mit Event-Handler initialisieren
const fallbackManager = useFallbackManager({
  onEvent: (event) => {
    console.log(`[FallbackManager] Event: ${event.type} für ${event.feature}`);
  }
});

// Features konfigurieren
fallbackManager.configureFeature('useSfcDocConverter', {
  strategy: 'threshold',
  errorThreshold: 3,
  autoRecovery: true,
  recoveryTimeout: 10000 // 10 Sekunden
});

// Fehler melden
fallbackManager.reportError('useSfcDocConverter', {
  message: 'Ein Fehler ist aufgetreten',
  severity: 'medium',
  error: new Error('Testfehler')
});

// Fallback aktivieren/deaktivieren
fallbackManager.activateFallback('useSfcDocConverter');
fallbackManager.deactivateFallback('useSfcDocConverter', true);

// Status abfragen
const status = fallbackManager.getStatus('useSfcDocConverter');
const allStatus = fallbackManager.getAllStatus();
```

### useLogger.ts

Der `useLogger` ist ein Composable für strukturierte Protokollierung mit verschiedenen Log-Levels.

**Hauptfunktionen:**

- Verschiedene Log-Levels (debug, info, warn, error)
- Komponent- und Zeitstempel-Kontext
- Remote-Logging-Fähigkeiten
- In-Memory-Logspeicherung und -Abruf
- Farbcodierte Konsolenausgabe

**Verwendung:**

```typescript
import { useLogger } from '@/composables/useLogger';

// Logger initialisieren
const logger = useLogger({
  level: 'debug',
  includeComponent: true,
  includeTimestamp: true
});

// Logs auf verschiedenen Levels
logger.debug('Debug-Nachricht', { context: 'Zusätzliche Daten' });
logger.info('Info-Nachricht');
logger.warn('Warnung');
logger.error('Fehlermeldung', { error: new Error('Fehlerobjekt') });

// Logs abrufen
const logs = logger.getLogs();
```

## Fallback-Strategien

Der Mechanismus unterstützt vier verschiedene Fallback-Strategien:

1. **Immediate**: Sofortiger Fallback beim ersten Fehler
2. **Threshold**: Fallback nach Erreichen eines Fehlerschwellwerts
3. **Progressive**: Schrittweiser Fallback basierend auf Fehleranzahl und -schweregrad
4. **Manual**: Nur manueller Fallback durch Benutzeraktion oder API

## Error-Severity-Levels

Fehler werden nach Schweregrad klassifiziert:

1. **Low**: Geringfügige Fehler, die die Funktionalität nicht beeinträchtigen
2. **Medium**: Fehler, die einige Funktionen beeinträchtigen, aber die Kernfunktionalität nicht blockieren
3. **High**: Schwerwiegende Fehler, die wichtige Funktionen beeinträchtigen
4. **Critical**: Kritische Fehler, die die Anwendung unbenutzbar machen

## Integration mit Feature-Toggles

Der Fallback-Mechanismus ist vollständig in das bestehende Feature-Toggle-System integriert:

- Wenn ein Fallback aktiviert wird, wird das entsprechende Feature im Feature-Toggle-Store deaktiviert
- Fehler werden für jedes Feature protokolliert und nachverfolgt
- Der Fallback-Status wird über Sitzungen hinweg persistent gespeichert

## Demo-Komponente

Die Anwendung enthält eine umfassende Demo-Komponente, die verschiedene Aspekte des Fallback-Mechanismus demonstriert:

- Einfache Fallbacks mit automatischer Aktivierung
- Mehrstufige Fallbacks mit Zwischenkomponenten
- Direkte Verwendung der ErrorBoundary
- Status-Überwachung und -Steuerung
- Event-Historie

```
/src/components/examples/FallbackExample.vue
```

## Implementierung im Dokumentenkonverter

Der Fallback-Mechanismus wird aktiv im Dokumentenkonverter-Modul eingesetzt, um eine robuste Benutzererfahrung zu gewährleisten. Die wichtigsten Komponenten des Dokumentenkonverters, die den Fallback-Mechanismus verwenden, sind:

- **DocConverterContainer**: Die Hauptkomponente verwendet EnhancedFeatureWrapper mit dem Feature-Flag `useSfcDocConverter`
- **ConversionProgress**: Zeigt den Fortschritt der Dokumentenkonvertierung mit Fehlertoleranz
- **DocumentList**: Listet konvertierte Dokumente auf und fällt auf die Legacy-Implementierung zurück, wenn Fehler auftreten
- **ErrorDisplay**: Spezialisierte Komponente zur Anzeige von Fehlern mit spezifischen Lösungsvorschlägen

Für jede dieser Komponenten existiert eine dreistufige Fallback-Hierarchie:

1. **Vue 3 SFC-Implementierung**: Vollständige Funktionalität mit modernen UI-Features
2. **Vereinfachte Zwischenversion**: Reduzierte Funktionalität, aber moderne Benutzeroberfläche
3. **Legacy-Implementierung**: Ursprüngliche Version mit grundlegender Funktionalität

Detaillierte Informationen zum Dokumentenkonverter finden Sie in der [06_DOKUMENTENKONVERTER.md](./06_DOKUMENTENKONVERTER.md) Dokumentation.

## Best Practices

Bei der Verwendung des Fallback-Mechanismus sollten folgende Best Practices beachtet werden:

1. **Fehlerbehandlung auf Komponentenebene**: Nutze ErrorBoundary für kritische Komponenten
2. **Granulare Feature-Flags**: Definiere spezifische Feature-Flags für kritische Funktionen
3. **Intermediäre Komponenten**: Implementiere vereinfachte Versionen für progressive Fallbacks
4. **Fehlerberichte**: Erfasse strukturierte Fehlerinformationen für Debugging
5. **Automatische Wiederherstellung**: Konfiguriere automatische Wiederherstellungsversuche
6. **Proaktives Monitoring**: Überwache Fallback-Aktivierungen und -Ereignisse

## Implementierungsdetails

Der Fallback-Mechanismus ist in folgenden Dateien implementiert:

- `/src/components/shared/ErrorBoundary.vue`
- `/src/components/shared/EnhancedFeatureWrapper.vue`
- `/src/utils/fallbackManager.ts`
- `/src/composables/useLogger.ts`
- `/src/components/examples/FallbackExample.vue`

Diese Dateien enthalten detaillierte JSDoc-Kommentare für alle Funktionen und Komponenten.

## Ausblick

Zukünftige Verbesserungen könnten umfassen:

- Integration mit externen Monitoring-Diensten
- Visualisierungskomponenten für Fallback-Status in Admin-Panels
- Automatische A/B-Tests zur Validierung von Fehlerbehebungen
- Machine-Learning-basierte Fehlererkennung und -vorhersage
- Erweiterte Metrik-Erfassung für Fehler- und Fallback-Analyse

## FAQ

### Wie aktiviere ich den Fallback-Mechanismus für eine Komponente?

Verwende den `EnhancedFeatureWrapper` mit deiner neuen und Legacy-Komponente.

### Wie kann ich einen Fallback manuell auslösen?

Nutze den `fallbackManager.activateFallback('featureName')`.

### Wie kann ich benutzerdefinierte Fehlerbehandlung hinzufügen?

Verwende die `error`- und `fallback`-Slots im `ErrorBoundary` oder `EnhancedFeatureWrapper`.

### Kann ich mehrstufige Fallbacks haben?

Ja, mit `EnhancedFeatureWrapper` und der Option `use-intermediate-failover` sowie einem `intermediate-component`.

### Wie kann ich den Fallback-Status überwachen?

Verwende `fallbackManager.getAllStatus()` oder `fallbackManager.getEventHistory()`.