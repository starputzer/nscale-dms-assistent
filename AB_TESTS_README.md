# A/B-Tests für nscale DMS Assistent

## Übersicht

Dieses A/B-Testing-System ermöglicht kontrollierte Experimente, um verschiedene Implementierungen von Features zu testen und datengestützte Entscheidungen für die Weiterentwicklung der Anwendung zu treffen.

## Implementierte Tests

1. **Chat-Interface (chat-interface-v2)**
   - Vergleicht das klassische Chat-Interface mit der optimierten Vue 3 SFC-Version
   - Metrics: Antwortzeit, Nutzerzufriedenheit, Sitzungsdauer

2. **Dokumentenkonverter (doc-converter-batch-v2)**
   - Vergleicht den klassischen Dokumentenkonverter mit optimierter Batch-Verarbeitung
   - Metrics: Konversionsgeschwindigkeit, Erfolgsrate, Nutzerzufriedenheit

3. **Admin-Bereich (admin-panel-v2)**
   - Testet den neu gestalteten Admin-Bereich mit verbesserten Analysen
   - Metrics: Zeit für Aufgaben, Navigationseffizienz, Nutzerzufriedenheit

## Dateien und Komponenten

- `/frontend/js/ab-testing.js` - Kern des A/B-Testing-Systems
- `/frontend/js/utils/uuid-util.js` - Hilfsfunktionen für UUIDs
- `/frontend/vue/AdminABTestsTab.vue` - Admin-Interface für A/B-Tests
- `/docs/00_KONSOLIDIERTE_DOKUMENTATION/03_ARCHITEKTUR/09_AB_TESTING_SYSTEM.md` - Dokumentation

## Verwendung

### Für Entwickler

```javascript
// Prüfen, welcher Variante ein Benutzer zugewiesen ist
import { getUserTestVariant } from './ab-testing.js';

const variant = getUserTestVariant('chat-interface-v2');
if (variant === 'variant') {
  // Code für die Variante
} else {
  // Code für die Kontrollgruppe
}

// Metriken erfassen
import { trackTestMetric } from './ab-testing.js';

trackTestMetric('chat-interface-v2', 'messageResponseTime', responseTimeInMs, {
  additionalData: 'Weitere Informationen'
});
```

### Für Administratoren

1. Im Admin-Panel den "A/B-Tests"-Tab öffnen
2. Tests und deren Metriken einsehen
3. Varianten für den eigenen Benutzer ändern zu Testzwecken

## Implementierte Metriken

### Chat-Interface

- **messageResponseTime**: Misst die Zeit zwischen Absenden einer Frage und Empfang der vollständigen Antwort
- **userSatisfaction**: Erfasst, ob Nutzer positives oder negatives Feedback geben
- **sessionDuration**: Misst, wie lange Benutzer in einer Chat-Sitzung bleiben

### Dokumentenkonverter

- **conversionSpeed**: Misst die Zeit für die Dokumentkonversion
- **conversionSuccess**: Erfasst die Erfolgsrate von Konversionen
- **userSatisfaction**: Misst die Zufriedenheit mit dem Konversionsergebnis

### Admin-Bereich

- **taskCompletionTime**: Misst die Zeit für typische Admin-Aufgaben
- **navigationEfficiency**: Erfasst die Anzahl der Klicks für bestimmte Aufgaben
- **userSatisfaction**: Erfasst explizites Feedback von Administratoren

## Technische Details

- Benutzer werden zufällig, aber dauerhaft einer Testvariante zugewiesen
- Zuweisungen werden im localStorage gespeichert
- Telemetriedaten werden an den Server gesendet und lokal geloggt
- Jeder Test kann eine eigene Berechtigungsprüfung haben

## Best Practices

1. **Test-Design**:
   - Klare Hypothesen formulieren
   - Eine Änderung pro Test
   - Aussagekräftige Metriken wählen

2. **Implementierung**:
   - Testvarianten vollständig implementieren
   - Metriken konsistent erfassen

3. **Auswertung**:
   - Ausreichend Daten sammeln (mindestens 2 Wochen)
   - Statistische Signifikanz prüfen
   - Qualitative Feedbacks einbeziehen

## Nächste Schritte

1. Integration mit dem Backend für die Telemetriedatenerfassung
2. Erweitertes Dashboard für die Analyse der Ergebnisse
3. Automatisierte Auswertung und Empfehlungen
4. Zusätzliche Tests für weitere Komponenten der Anwendung