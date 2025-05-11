# A/B-Testing-System

Das A/B-Testing-System ermöglicht kontrollierte Experimente mit verschiedenen Implementierungen kritischer Funktionen, um datengestützte Entscheidungen über UI-Änderungen und Funktionsverbesserungen zu treffen.

## Architektur

Das A/B-Testing-System baut auf dem bestehenden Feature-Flag-System auf und erweitert es um folgende Komponenten:

1. **Test-Definitionen**: Zentrale Konfiguration von Tests mit Varianten und zugehörigen Feature-Flags
2. **Zuweisungslogik**: Konsistente Zuteilung von Benutzern zu Testvarianten
3. **Telemetrie**: Erfassung relevanter Metriken für jeden Test
4. **Persistenz**: Beibehaltung der Varianten-Zuweisung über mehrere Sitzungen

```
┌─────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                 │     │                   │     │                   │
│  Feature-Flags  │────▶│  A/B-Test-System  │────▶│  Telemetrie-API   │
│                 │     │                   │     │                   │
└─────────────────┘     └───────────────────┘     └───────────────────┘
                               │    ▲
                               │    │
                               ▼    │
                        ┌─────────────────┐
                        │                 │
                        │  UI-Komponenten │
                        │                 │
                        └─────────────────┘
```

## Implementierte Tests

Das System unterstützt aktuell folgende A/B-Tests:

### 1. Chat-Interface (Test-ID: `chat-interface-v2`)

Vergleicht die klassische Chat-Oberfläche mit der optimierten Vue 3 SFC-Version.

**Varianten:**
- **Control**: Klassisches Chat-Interface ohne Vue 3 SFC-Komponenten
- **Variant**: Optimiertes Chat-Interface mit Vue 3 SFC-Komponenten

**Erfasste Metriken:**
- `messageResponseTime`: Zeit zwischen Absenden der Frage und vollständigem Empfang der Antwort
- `userSatisfaction`: Basierend auf Feedback (1 für positives Feedback, 0 für negatives)
- `sessionDuration`: Dauer der Chat-Sitzung in Sekunden

### 2. Dokumentenkonverter (Test-ID: `doc-converter-batch-v2`)

Vergleicht den klassischen Dokumentenkonverter mit der optimierten Batch-Verarbeitung.

**Varianten:**
- **Control**: Klassischer Dokumentenkonverter
- **Variant**: Optimierter Dokumentenkonverter mit Batch-Verarbeitung

**Erfasste Metriken:**
- `conversionSpeed`: Zeit für den Abschluss der Konversion
- `conversionSuccess`: Erfolgsrate der Konversionen
- `userSatisfaction`: Basierend auf Feedback nach der Konversion

### 3. Admin-Bereich (Test-ID: `admin-panel-v2`)

Testet den neu gestalteten Admin-Bereich mit verbesserten Analysen.

**Varianten:**
- **Control**: Klassischer Admin-Bereich
- **Variant**: Optimierter Admin-Bereich mit SFC-Komponenten

**Erfasste Metriken:**
- `taskCompletionTime`: Zeit für typische Admin-Aufgaben
- `navigationEfficiency`: Anzahl der Klicks für bestimmte Aufgaben
- `userSatisfaction`: Explizites Feedback von Administratoren

## Verwendung des A/B-Testing-Systems

### Initialisierung

Das A/B-Testing-System wird automatisch beim Start der Anwendung initialisiert:

```javascript
// In app.js
import { initializeABTests } from './ab-testing.js';

// In onMounted-Funktion
initializeABTests();
```

### Überprüfen der aktuellen Testvariante

```javascript
import { getUserTestVariant } from './ab-testing.js';

// Variante für einen bestimmten Test abrufen
const variant = getUserTestVariant('chat-interface-v2');
if (variant === 'variant') {
  // Code für die Variante ausführen
} else {
  // Code für die Kontrollgruppe ausführen
}
```

### Erfassen von Metriken

```javascript
import { trackTestMetric } from './ab-testing.js';

// Eine Metrik für einen Test erfassen
trackTestMetric('chat-interface-v2', 'messageResponseTime', responseTimeInMs, {
  messageLength: message.length,
  additionalData: 'Weitere Informationen'
});
```

## Technische Details

### Nutzerzuweisung

- Benutzer werden zufällig, aber dauerhaft einer Testvariante zugewiesen
- Die Zuweisung erfolgt basierend auf einer Benutzer-ID oder Session-ID
- Zuweisungen werden im localStorage gespeichert, um Konsistenz zu gewährleisten

### Berechtigungsprüfung

Für jeden Test kann eine Berechtigungsprüfung definiert werden:

```javascript
eligibilityCheck: () => {
  // Nur für Administratoren verfügbar
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
}
```

### Telemetrie

Telemetriedaten werden wie folgt strukturiert:

```javascript
{
  eventType: 'ab_test_metric',
  testId: 'chat-interface-v2',
  variant: 'variant',
  metricName: 'messageResponseTime',
  value: 1250,          // Gemessener Wert
  userId: 'user123',    // Anonymisierte Benutzer-ID
  timestamp: '2025-05-11T15:30:00.000Z',
  additionalData: { ... } // Weitere Metadaten
}
```

## Best Practices

1. **Test-Design**:
   - Klar definierte Hypothesen formulieren
   - Eine Änderung pro Test
   - Aussagekräftige Metriken wählen

2. **Implementierung**:
   - Testvarianten vollständig implementieren
   - Konsistente Metriken erfassen
   - Testen, ob die Varianten korrekt angezeigt werden

3. **Auswertung**:
   - Ausreichend Daten sammeln (mindestens 2 Wochen)
   - Statistische Signifikanz prüfen
   - Qualitative Nutzerfeedbacks einbeziehen

## Beispiel: Chat-Interface A/B-Test

Der Chat-Interface-Test vergleicht die Leistung und Benutzerzufriedenheit zwischen dem klassischen und dem Vue 3 SFC-basierten Chat-Interface:

```javascript
// Test-Definition
'chat-interface-v2': {
  id: 'chat-interface-v2',
  description: 'Verbesserte Chat-Oberfläche mit optimierter Nachrichtenanzeige',
  variants: ['control', 'variant'],
  featureFlags: {
    control: { useSfcChat: false, useEnhancedChat: false },
    variant: { useSfcChat: true, useEnhancedChat: true }
  },
  eligibilityCheck: () => true, // Alle Benutzer sind berechtigt
  metrics: ['messageResponseTime', 'userSatisfaction', 'sessionDuration']
}
```

**Implementierung der Metrik-Erfassung:**

```javascript
// Im Chat-Modul
const sendQuestionStream = async () => {
  // A/B Test: Startzeit messen
  const chatVariant = getUserTestVariant('chat-interface-v2');
  const startTime = Date.now();
  
  // [...Chat-Logik...]
  
  // Nach Abschluss des Streams
  if (chatVariant) {
    const responseTime = Date.now() - startTime;
    trackTestMetric('chat-interface-v2', 'messageResponseTime', responseTime, {
      messageLength: response.length
    });
  }
};
```

## Roadmap

1. **Erweiterte Analyse**:
   - Dashboard für Echtzeit-Auswertung der Testergebnisse
   - Export von Ergebnissen zur detaillierten Analyse

2. **Segmentierung**:
   - Differenzierung nach Benutzergruppen
   - Zielgerichtete Tests für bestimmte Benutzergruppen

3. **Automatisierung**:
   - Automatische Auswertung der Tests
   - Empfehlungen basierend auf Testergebnissen