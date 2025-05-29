# Document Converter Export Fix

## Problem

Bei der Initialisierung der Anwendung traten zwei kritische Fehler auf:

1. Erster Fehler:
```
main.ts:169 Failed to initialize application: SyntaxError: The requested module '/src/services/api/AdminDocConverterService.ts?t=1747598746227' does not provide an export named 'IAdminDocConverterService' (at adminServices.ts:22:3)
```

2. Zweiter Fehler nach Behebung des ersten:
```
main.ts:169 Failed to initialize application: SyntaxError: The requested module '/src/services/api/DocumentConverterService.ts' does not provide an export named 'documentConverterService' (at documentConverter.ts:3:10)
```

## Ursache

Es gab Probleme bei den Exporten zweier Service-Dateien:

1. In `AdminDocConverterService.ts` war das Interface `IAdminDocConverterService` falsch exportiert. Es wurde als regulärer Export anstatt als Typ-Export deklariert.

2. In `DocumentConverterService.ts` wurde die Service-Instanz `documentConverterService` nicht als benannter Export bereitgestellt, sondern nur als Default-Export.

3. Zusätzlich gab es ein Problem mit dem Typen `SupportedFormat`, der nur innerhalb der DocumentConverterService-Klasse definiert war, aber an anderer Stelle benötigt wurde.

## Lösung

### 1. AdminDocConverterService.ts

Wir haben den Export des Interfaces als Typ-Export umgestellt:

```typescript
// Vorher
export { IAdminDocConverterService };

// Nachher
export type { IAdminDocConverterService };
```

### 2. DocumentConverterService.ts

Die Service-Instanz wurde als benannter Export hinzugefügt:

```typescript
// Vorher
export {
  IDocumentConverterService,
  DocumentConverterService,
  MockDocumentConverterService,
};
export default documentConverterService;

// Nachher
export type { IDocumentConverterService };
export {
  DocumentConverterService,
  MockDocumentConverterService,
  documentConverterService
};
export default documentConverterService;
```

### 3. SupportedFormat Type

Der Typ wurde in die zentrale Typdefinitionsdatei verschoben:

```typescript
// In src/types/documentConverter.ts hinzugefügt:
export type SupportedFormat = "pdf" | "docx" | "xlsx" | "pptx" | "html" | "txt";
```

Die DocumentConverterService-Klasse wurde entsprechend angepasst, um diesen Typ zu verwenden.

## Vorteile dieser Änderungen

1. **Konsistente Typenhandhabung**: TypeScript-Interfaces werden nun durchgehend als Typen exportiert, was den Best Practices entspricht.

2. **Verbesserte Modularität**: Services können nun sowohl über benannte Importe als auch über Default-Importe importiert werden, was Flexibilität bietet.

3. **Zentrale Typendefinitionen**: Wiederverwendbare Typen wie `SupportedFormat` sind jetzt zentral definiert und stehen dem gesamten Projekt zur Verfügung.

## Empfehlungen für die Zukunft

1. **TypeScript Interface-Exporte**: Interfaces sollten immer mit `export type` exportiert werden, nicht mit `export`.

2. **Service-Export-Konvention**: Für Services sollte eine einheitliche Export-Konvention eingehalten werden:
   ```typescript
   // Typen exportieren
   export type { IServiceInterface };
   
   // Klassen und Instanzen exportieren
   export { ServiceClass, serviceInstance };
   
   // Optionaler Default-Export für Convenience
   export default serviceInstance;
   ```

3. **Zentrale Typendefinitionen**: Wiederverwendbare Typen sollten in zentralen Typendefinitionsdateien definiert werden, nicht in Service-Klassen.

Diese Konventionen sollten im Entwicklerhandbuch dokumentiert werden, um zukünftige Probleme zu vermeiden.