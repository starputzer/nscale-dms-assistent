# Performance-Tests für Vue 3 Optimierungen

Dieses Verzeichnis enthält eine umfassende Test-Suite zur Messung und Überwachung der Performance-Optimierungen in unserer Vue 3-Anwendung. Die Tests vergleichen systematisch die Leistung optimierter Implementierungen mit Standardansätzen.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Test-Kategorien](#test-kategorien)
3. [Ausführung der Tests](#ausführung-der-tests)
4. [Ergebnisse verstehen](#ergebnisse-verstehen)
5. [Kontributionen](#kontributionen)

## Übersicht

Die Performance-Tests messen die Effizienz der folgenden Optimierungen:

- Spezialisierte Watcher für verschiedene Anwendungsfälle
- Verbessertes Code-Splitting und dynamisches Importieren
- API-Batching und Caching-Strategien
- Optimierte Store-Implementierungen

Die Tests verwenden Vitest als Testrunner und simulieren realistische Nutzungsszenarien mit Benchmark-Messungen für verschiedene Metriken wie Renderingzeit, Anfragenanzahl und Speichernutzung.

## Test-Kategorien

### 1. Optimierte Watcher (`watcher-performance.spec.ts`)

- Tests für adaptive Watcher mit intelligentem Debouncing
- Tests für selektive Watcher mit pfadbasierter Überwachung
- Tests für Batch-Watcher, die mehrere Datenquellen bündeln
- Tests für UI-Watcher, die für visuelle Updates optimiert sind
- Tests für Message-Streaming-Watcher
- Tests für Lazy-Computed-Watcher mit verzögerter Berechnung
- Tests für selbstoptimierende Watcher

### 2. Dynamisches Importieren (`dynamic-import-performance.spec.ts`) 

- Tests für prioritätsbasiertes Laden
- Tests für Caching von Komponentenimports
- Tests für Fehlerbehandlung und automatische Wiederholungsversuche
- Tests für netzwerkbewusstes Laden und Adaptivität
- Tests für Komponenten-Preloading und Gruppenladen
- Tests für Router-View-Optimierungen

### 3. API-Batching (`api-batching-performance.spec.ts`)

- Tests für Bündelung mehrerer API-Anfragen
- Tests für Response-Caching und Cache-Invalidierung
- Tests für Batch-Größenoptimierung und Timing
- Tests für CRUD-Client-Optimierungen
- Tests für Entity-Relations-Loading

### 4. Store-Performance (`stores/performance/sessions.perf.spec.ts`)

- Tests für Store-Initialisierungszeit
- Tests für Reaktivitätsoptimierungen
- Tests für große Datensätze
- Tests für Streaming-Performance
- Tests für CRUD-Operationen
- Tests für Cache-Invalidierung

## Ausführung der Tests

### Alle Performance-Tests

```bash
npm run test:performance
```

Dieser Befehl führt alle Performance-Tests aus und generiert einen Bericht im Verzeichnis `performance-results`.

### Einzelne Test-Kategorien

```bash
# Watcher-Performance-Tests
npm run test:watcher-perf

# Dynamisches Import-Performance-Tests
npm run test:import-perf

# API-Batching-Performance-Tests
npm run test:api-perf

# Store-Performance-Tests
npm run test:store-perf
```

## Ergebnisse verstehen

Die Testergebnisse werden in zwei Formaten gespeichert:

1. **JSON-Bericht** (`performance-report-{timestamp}.json`): Detaillierte Rohdaten für weitere Analyse.
2. **Text-Zusammenfassung** (`performance-summary-{timestamp}.txt`): Menschenlesbare Zusammenfassung mit den wichtigsten Erkenntnissen.

### Wichtige Metriken

- **Verarbeitungszeit**: Misst die für Operationen benötigte Zeit in Millisekunden.
- **Reaktivitäts-Updates**: Zählt die Anzahl der Vue-Reaktivitäts-Updates bei Datenänderungen.
- **HTTP-Anfragen**: Misst die Anzahl der gesendeten HTTP-Anfragen.
- **Speichernutzung**: Schätzt den Speicherverbrauch verschiedener Implementierungen.

### Erfolgreiche Tests

Ein Test gilt als erfolgreich, wenn die optimierte Implementierung bessere Performance zeigt als die Standardimplementierung. Die meisten Tests erwarten eine Verbesserung um mindestens 10-20%.

## Kontributionen

Bei der Erweiterung der Test-Suite beachten Sie bitte die folgenden Richtlinien:

1. **Realistische Testszenarien**: Simulieren Sie realistische Nutzungsmuster.
2. **Isolierte Tests**: Stellen Sie sicher, dass Tests unabhängig voneinander laufen können.
3. **Konsistente Messungen**: Verwenden Sie die bereitgestellten Hilfsfunktionen für konsistente Messungen.
4. **Klare Dokumentation**: Dokumentieren Sie den Zweck jedes Tests und die erwarteten Verbesserungen.

### Neue Tests hinzufügen

1. Erstellen Sie eine neue Test-Datei oder erweitern Sie eine bestehende.
2. Fügen Sie das Testskript zu `package.json` hinzu.
3. Aktualisieren Sie `performance-test-runner.ts`, um den neuen Test einzubeziehen.
4. Aktualisieren Sie diese README-Datei mit Informationen zum neuen Test.

## Weitere Informationen

Weitere Details zu den implementierten Performance-Optimierungen finden Sie in der [Performance-Optimierungsdokumentation](/docs/PERFORMANCE_OPTIMIZATIONS.md).