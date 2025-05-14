# TypeScript-Kompatibilität Tests

Diese Testsuite überprüft die TypeScript-Kompatibilität der Bridge-Komponenten. 
Die Tests stellen sicher, dass die TypeScript-Typen korrekt definiert sind und dass 
die Bridge-Komponenten typsicher verwendet werden können.

## Testkategorien

1. **TypeSafety** - Prüft, ob die definierten Typen korrekt sind und keine Fehler enthalten
2. **EventTypes** - Stellt sicher, dass Event-Typen korrekt definiert und verwendet werden
3. **BridgeErrors** - Validiert die Fehlerbehandlung mit dem Result<T, E>-Pattern
4. **PolyfillCompatibility** - Testet die Kompatibilität mit ES2021-Polyfills

## Testausführung

Die Tests können mit dem folgenden Befehl ausgeführt werden:

```bash
npm run test:typescript
```

## Debugging

Bei TypeScript-Fehlern in Tests können die folgenden Schritte hilfreich sein:

1. Prüfen, ob die importierten Typen korrekt sind
2. Überprüfen der Methodensignaturen und Rückgabetypen
3. Stellen Sie sicher, dass generische Typen korrekt spezifiziert werden

## Hinzufügen neuer Tests

Neue TypeScript-Kompatibilitätstests sollten die folgenden Muster befolgen:

1. Immer statische Typchecks mit `AssertType` verwenden
2. Für komplexere Typen mit Union Types die `assertType`-Funktion mit Validatoren nutzen
3. Bei Event-Tests die entsprechenden Event-Typen aus der BridgeEventMap verwenden