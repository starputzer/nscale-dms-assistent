# Admin API Export Fix

## Problem

Bei der Integration der Admin-API-Services wurde ein kritischer Fehler festgestellt:

```
main.ts:169 Failed to initialize application: SyntaxError: The requested module '/src/services/api/AdminDocConverterService.ts?t=1747598746227' does not provide an export named 'IAdminDocConverterService' (at adminServices.ts:22:3)
```

## Ursache

Das Problem wurde durch eine Inkonsistenz im Export von TypeScript-Interfaces und -Klassen verursacht:

1. In einigen Dateien wurden Interfaces als reguläre Werte exportiert, obwohl sie in TypeScript als Typen behandelt werden sollten.
   
2. Die Importe erwarteten teilweise benannte Exporte, während andere Default-Exporte erwarteten.

3. Es gab keine konsistente Strategie für den Export von Interfaces und Service-Instanzen.

## Lösung

Die Lösung bestand in einer Standardisierung der Exporte in allen Admin-API-Service-Dateien:

1. Interfaces werden jetzt mit `export type { InterfaceName }` exportiert, was der empfohlenen TypeScript-Methode entspricht.

2. Service-Instanzen werden als benannte Exporte exportiert: `export { serviceInstance }`.

3. Zusätzlich wird jede Service-Instanz auch als Default-Export angeboten: `export default serviceInstance`.

Diese Änderungen wurden in allen Admin-Service-Dateien umgesetzt:
- AdminDocConverterService.ts
- AdminSystemService.ts
- AdminUsersService.ts
- AdminFeedbackService.ts
- AdminMotdService.ts
- AdminFeatureTogglesService.ts

Die zentrale Exportdatei `adminServices.ts` wurde ebenfalls aktualisiert, um die Interfaces als Typen zu importieren:

```typescript
// Interfaces als Typen importieren
import type { IAdminDocConverterService } from "./AdminDocConverterService";

// Service-Instanzen als benannte Importe
import adminDocConverterService from "./AdminDocConverterService";

// Re-Export der Interfaces als Typen
export type {
  IAdminDocConverterService,
  // weitere Interfaces...
};

// Re-Export der Service-Instanzen
export {
  adminDocConverterService,
  // weitere Services...
};
```

## Vorteile dieser Änderung

1. **Typensicherheit**: Die strikte Trennung zwischen Werten und Typen verbessert die Typensicherheit.

2. **Konsistenz**: Alle Services folgen jetzt dem gleichen Export-Muster.

3. **Flexibilität**: Entwickler können sowohl benannte Importe als auch Default-Importe nutzen.

4. **Zukunftssicherheit**: Diese Struktur entspricht den TypeScript-Best-Practices und ist zukunftssicher.

## Empfehlungen für zukünftige Entwicklung

1. Interfaces immer mit `export type` exportieren, nicht mit `export`.

2. Konsistente Export-Strategien über das gesamte Projekt hinweg verwenden.

3. Für Services mit einem zentralen Singleton-Objekt sowohl benannte als auch Default-Exporte anbieten.

4. Diese Exportstrategie in der Projektdokumentation dokumentieren, um die Konsistenz zu verbessern.