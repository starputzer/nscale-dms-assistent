# Fehlerbehandlung und Fallback-System

Diese Dokumentation beschreibt das Fehlerbehandlungs- und Fallback-System des nscale DMS Assistenten. Das System besteht aus mehreren integrierten Komponenten, die zusammenarbeiten, um eine robuste Fehlerbehandlung und automatische Fallback-Mechanismen zu bieten.

**Version:** 1.0.0  
**Letzte Aktualisierung:** 08.05.2025

## Überblick

Das Fehlerbehandlungssystem besteht aus drei Hauptkomponenten:

1. **ErrorReportingService**: Ein zentraler Service zum Erfassen, Verarbeiten und Melden von Fehlern.
2. **FallbackManager**: Verwaltet Fallback-Strategien und Fehlerreaktionen für Features.
3. **useErrorReporting**: Ein Vue Composable für die einfache Integration in Komponenten.

Dieses System ist speziell für die Vue 3 SFC-Migration konzipiert und ermöglicht einen nahtlosen Übergang zwischen neuen Komponenten und Legacy-Implementierungen bei Fehlern.

## Architektur

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│  Vue Komponenten    │     │ ErrorReportingService│     │ Externe Dienste    │
│  & Composables      │     │ & FallbackManager   │     │ (Monitoring, etc.) │
│                     │     │                     │     │                     │
└─────────┬───────────┘     └─────────┬───────────┘     └──────────┬──────────┘
          │                           │                            │
          │                           │                            │
          │                           │                            │
          │                           │                            │
          ▼                           ▼                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│                          Feature-Toggle-System                                │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Hauptkomponenten

### 1. ErrorReportingService

Der `ErrorReportingService` ist eine zentrale Klasse zur Verarbeitung von Fehlern in der Anwendung. Er bietet folgende Funktionen:

- Erfassung verschiedener Fehlerarten (Komponenten, API, Store, etc.)
- Strukturierte Fehlerberichte mit Kontext-Informationen
- Deduplizierung von Fehlern, um Redundanz zu vermeiden
- Integration mit dem Fallback-System
- Privatsphäre-schutzmechanismen (PII-Redaktion)
- Remote-Fehlerberichte an externe Dienste

#### Verwendung:

```typescript
import { useErrorReporting } from '@/utils/errorReportingService';

const errorService = useErrorReporting();

// Einfacher Fehler
errorService.captureError(new Error('Ein Fehler ist aufgetreten'));

// Komponenten-Fehler
errorService.captureComponentError('UserProfile', new Error('Rendering fehlgeschlagen'));

// API-Fehler
errorService.captureApiError('/api/users', new Error('Netzwerkfehler'), {
  feature: 'userManagement',
  severity: 'high'
});
```

### 2. FallbackManager

Der `FallbackManager` ist für die Verwaltung von Fallback-Strategien und -Mechanismen zuständig. Er bietet:

- Verschiedene Fallback-Strategien (immediate, threshold, progressive, manual)
- Automatische Wiederherstellungsversuche
- Fehler-Tracking pro Feature
- Mehrstufige Fallback-Levels
- Integration mit dem Feature-Toggle-System

#### Verwendung:

```typescript
import { useFallbackManager } from '@/utils/fallbackManager';

const fallbackManager = useFallbackManager();

// Feature konfigurieren
fallbackManager.configureFeature('documentConverter', {
  strategy: 'threshold',
  errorThreshold: 3,
  autoRecovery: true
});

// Fehler melden
fallbackManager.reportError('documentConverter', {
  message: 'Konvertierung fehlgeschlagen',
  severity: 'high'
});

// Fallback manuell aktivieren
fallbackManager.activateFallback('documentConverter');
```

### 3. useErrorReporting (Composable)

Das `useErrorReporting` Composable vereinfacht die Integration des Fehlerbehandlungssystems in Vue-Komponenten. Es bietet:

- Automatisches Erfassen von Komponenten-Fehlern
- Einfache API für verschiedene Fehlertypen
- Reaktive Status-Variablen für UI-Feedback
- Integration mit dem Fallback-System
- Lokale Fehlerverwaltung pro Komponente

#### Verwendung:

```typescript
import { useErrorReporting } from '@/composables/useErrorReporting';

// In einer Vue-Komponente
setup() {
  const {
    hasError,
    currentError,
    isFallbackActive,
    reportComponentError,
    resetError,
    activateFallback
  } = useErrorReporting({
    featureFlag: 'documentConverter', 
    automaticFallback: true
  });
  
  function handleApiRequest() {
    try {
      // API-Anfrage...
    } catch (error) {
      reportComponentError(error, {
        severity: 'medium',
        context: { operation: 'loadDocument' }
      });
    }
  }
  
  return {
    hasError,
    currentError,
    isFallbackActive,
    resetError,
    handleApiRequest
  }
}
```

## Fallback-Strategien

Das System unterstützt verschiedene Strategien für die Aktivierung von Fallbacks:

1. **Immediate**: Aktiviert Fallback sofort bei jedem Fehler.
2. **Threshold**: Aktiviert Fallback nach Erreichen eines Schwellenwerts von Fehlern.
3. **Progressive**: Fallback-Entscheidung basierend auf Fehler-Schweregrad und -Anzahl.
4. **Manual**: Fallbacks werden nur manuell aktiviert, nicht automatisch.

## Fehlertypen und Schweregrade

Fehler können mit verschiedenen Attributen kategorisiert werden:

### Fehlerquellen (ErrorSource)
- `component`: Fehler in einer UI-Komponente
- `store`: Fehler in einem Zustandsspeicher
- `api`: Fehler bei API-Anfragen
- `network`: Netzwerk-bezogene Fehler
- `render`: Fehler beim Rendern
- `lifecycle`: Fehler in Komponenten-Lebenszyklen
- `user`: Durch Benutzeraktionen ausgelöste Fehler
- `system`: Systemfehler
- `unknown`: Nicht kategorisierbare Fehler

### Schweregrade (Severity)
- `low`: Geringe Auswirkung, keine Funktionsbeeinträchtigung
- `medium`: Mittlere Auswirkung, eingeschränkte Funktionalität
- `high`: Erhebliche Auswirkung, kritische Funktionen betroffen
- `critical`: Schwerwiegende Auswirkung, Systemfehler

## Integration mit dem Feature-Toggle-System

Das Fehlerbehandlungssystem ist tief in das Feature-Toggle-System integriert, um einen reibungslosen Übergang zwischen neuen SFC-Komponenten und Legacy-Implementierungen zu ermöglichen:

1. Fehler werden erfasst und analysiert
2. Basierend auf Strategie und Schweregrad wird eine Fallback-Entscheidung getroffen
3. Bei Bedarf wird der entsprechende Feature-Toggle umgeschaltet
4. Die Anwendung rendert automatisch die Fallback-Implementierung
5. Automatische Wiederherstellungsversuche werden nach konfigurierbaren Zeiträumen durchgeführt

## Beispiele

### Einfache Fehlererfassung

```vue
<script setup>
import { useErrorReporting } from '@/composables';

const { reportComponentError } = useErrorReporting({
  featureFlag: 'documentList'
});

function loadDocuments() {
  try {
    // Dokumente laden...
  } catch (error) {
    reportComponentError(error, {
      severity: 'medium',
      context: { operation: 'loadDocuments' }
    });
  }
}
</script>
```

### Mit Error Boundary

```vue
<template>
  <ErrorBoundary :feature-flag="featureFlag">
    <DocumentList />
    
    <template #fallback="{ error, resetFallback }">
      <div class="fallback-view">
        <p>Alternative Dokumentansicht</p>
        <button @click="resetFallback">Zurücksetzen</button>
      </div>
    </template>
    
    <template #error="{ error, retry }">
      <div class="error-message">
        <p>Fehler beim Laden der Dokumente</p>
        <button @click="retry">Erneut versuchen</button>
      </div>
    </template>
  </ErrorBoundary>
</template>
```

### Automatische Fallback-Aktivierung

```typescript
const docConverter = useDocumentConverter();
const { reportApiError } = useErrorReporting({
  featureFlag: 'documentConverter',
  automaticFallback: true
});

async function convertDocument(file) {
  try {
    await docConverter.convert(file);
  } catch (error) {
    // Dies führt automatisch zur Fallback-Aktivierung (wenn Schwellenwert erreicht)
    reportApiError('/api/convert', error, {
      severity: 'high',
      context: { fileType: file.type, fileSize: file.size }
    });
  }
}
```

## Best Practices

### 1. Verwenden Sie spezifische Fehlertypen

```typescript
// Gut
reportApiError('/api/documents', error, { severity: 'high' });

// Weniger gut
reportError(error);
```

### 2. Kontextinformationen hinzufügen

```typescript
// Gut
reportComponentError(error, {
  context: {
    userId: user.id,
    action: 'documentUpload',
    fileType: file.type,
    fileCount: files.length
  }
});

// Weniger gut
reportComponentError(error);
```

### 3. Fallback-Features sinnvoll definieren

Feature-Flags sollten auf einer angemessenen Granularitätsebene definiert werden:

```typescript
// Gut - Spezifisch genug
useErrorReporting({ featureFlag: 'documentConverterUpload' });
useErrorReporting({ featureFlag: 'documentConverterList' });

// Zu allgemein
useErrorReporting({ featureFlag: 'documentConverter' });

// Zu spezifisch
useErrorReporting({ featureFlag: 'documentConverterUploadButton' });
```

### 4. Fehlerbehandlung in Composables kapseln

Schreiben Sie eigene domänenspezifische Composables, die das Fehlerbehandlungssystem integrieren:

```typescript
export function useDocumentUpload() {
  const { reportApiError } = useErrorReporting({
    featureFlag: 'documentUpload'
  });
  
  async function uploadDocument(file) {
    try {
      // Implementierung...
    } catch (error) {
      reportApiError('/api/upload', error);
      throw error; // Weitergeben oder behandeln
    }
  }
  
  return {
    uploadDocument
  };
}
```

## Wie man das System erweitert

### Hinzufügen neuer Fehlertypen

Um neue Fehlertypen zu unterstützen, erweitern Sie die `ErrorSource`-Typdefinition in `errorReportingService.ts`:

```typescript
export type ErrorSource = 
  'component' | 'store' | 'api' | 'network' | 'render' | 
  'lifecycle' | 'user' | 'system' | 'unknown' | 'newType';
```

### Erweitern des Fehlerberichtsformats

Um zusätzliche Felder im Fehlerbericht zu unterstützen, erweitern Sie das `ErrorReport`-Interface:

```typescript
export interface ErrorReport {
  // Bestehende Felder...
  
  // Neue Felder
  performance?: {
    timing: number;
    memory: number;
  };
}
```

### Hinzufügen einer benutzerdefinierten Fallback-Strategie

Erweitern Sie den `FallbackManager` mit einer neuen Strategie:

1. Fügen Sie den neuen Strategietyp hinzu:
```typescript
export type FallbackStrategy = 'immediate' | 'threshold' | 'progressive' | 'manual' | 'custom';
```

2. Implementieren Sie die Logik in `shouldActivateFallback`:
```typescript
private shouldActivateFallback(feature: string, error: FallbackError): boolean {
  // Bestehender Code...
  
  switch (config.strategy) {
    // Bestehende Fälle...
    
    case 'custom':
      // Benutzerdefinierte Logik
      return this.customStrategyLogic(feature, error, config);
      
    default:
      return false;
  }
}

private customStrategyLogic(feature: string, error: FallbackError, config: FeatureFallbackConfig): boolean {
  // Implementierung...
}
```

## Fehlerbehebung

### Problem: Fallbacks werden zu häufig aktiviert

**Lösung:** Passen Sie die Schwellenwerte an oder ändern Sie die Strategie:

```typescript
fallbackManager.configureFeature('documentConverter', {
  strategy: 'threshold',
  errorThreshold: 5,  // Höherer Wert
  minSeverity: 'high' // Nur schwerwiegende Fehler
});
```

### Problem: Fehler werden nicht korrekt kategorisiert

**Lösung:** Manuell Schweregrad und Quelle angeben:

```typescript
reportError(error, {
  source: {
    type: 'api',
    name: 'documentService'
  },
  severity: 'high',
  context: { /* relevante Details */ }
});
```

### Problem: Fallbacks schalten nicht automatisch zurück

**Lösung:** Überprüfen und anpassen der Wiederherstellungseinstellungen:

```typescript
fallbackManager.configureFeature('documentConverter', {
  autoRecovery: true,
  recoveryTimeout: 1800000, // 30 Minuten
  maxRecoveryAttempts: 3
});
```

## Zusammenfassung

Das Fehlerbehandlungs- und Fallback-System ist ein zentraler Bestandteil der Vue 3 SFC-Migration des nscale DMS Assistenten. Es bietet:

1. **Robuste Fehlererfassung** über verschiedene Komponenten und Systemteile
2. **Automatische Fallback-Mechanismen** mit konfigurierbaren Strategien
3. **Nahtlose Integration** mit dem Feature-Toggle-System
4. **Benutzerfreundliche API** durch Vue Composables
5. **Erweiterbarkeit** für zukünftige Anforderungen

Dieses System stellt sicher, dass die Anwendung auch während der Migration stabil bleibt und ein Fallback auf bewährte Implementierungen ermöglicht wird, wenn in neuen Komponenten Probleme auftreten.