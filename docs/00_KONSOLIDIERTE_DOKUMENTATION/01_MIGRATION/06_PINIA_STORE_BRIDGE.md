# Pinia Store Bridge für Vue 3 Migration

## Überblick

Dieses Dokument beschreibt den Ansatz zur Migration der Pinia Stores in der Vue 3 SFC-Migration des nscale DMS Assistenten. Es erläutert, wie mit verschiedenen Store API-Stilen (Options API vs. Composition API) umgegangen werden kann, um einen reibungslosen Übergang zu gewährleisten.

## Hintergrund

Während der Migration von Vue 2 auf Vue 3 und der Umstellung von Vuex auf Pinia wurden verschiedene Stile für Store-Definitionen verwendet. Dies führt zu Inkonsistenzen beim Zugriff auf Store-Methoden und -Eigenschaften.

**Hauptprobleme:**

1. Unterschiedliche API-Stile:
   - Options API: `defineStore('name', { state: {}, actions: {} })`
   - Composition API: `defineStore('name', () => { const state = ref(); function action() {} return { state, action } })`

2. Unterschiedliche Methodennamen für ähnliche Funktionalitäten:
   - z.B. `setActiveSession` vs. `setCurrentSession`
   - z.B. `deleteSession` vs. `archiveSession`

3. TypeScript-Fehler durch fehlende Typdefinitionen oder falsche Importe.

## Lösung: Store Helper Utilities

Es wurde ein Store Helper Utility-Modul erstellt, um diese Probleme zu beheben. Dieses Modul stellt eine einheitliche API für den Zugriff auf Store-Funktionalitäten bereit, unabhängig vom verwendeten API-Stil.

### Funktionsweise

1. **Dynamische Methodenerkennung**:
   ```typescript
   function hasMethod(store: any, methodName: string): boolean {
     return typeof store[methodName] === 'function';
   }
   ```

2. **Einheitliche API für jeden Store**:
   ```typescript
   export const documentConverterHelper = {
     setUseFallback(value: boolean): void {
       const store = useDocumentConverterStore();
       if (hasMethod(store, 'setUseFallback')) {
         store.setUseFallback(value);
       } else {
         store.$patch({ useFallback: value });
       }
     },
     // weitere Methoden...
   };
   ```

3. **Fallback-Mechanismen**:
   - Prüfung auf primäre Methode
   - Prüfung auf alternative Methode mit ähnlicher Funktion
   - Direktes Patchen des Store-Zustands als letzter Ausweg

### Vorteile

- **Zukunftssicher**: Funktioniert sowohl mit alten als auch neuen Store-Definitionen
- **Typsicherheit**: TypeScript-Unterstützung für alle Helper-Funktionen
- **Vereinfachte Migration**: Komponenten können schrittweise aktualisiert werden
- **Konsistente API**: Einheitliche Benennung und Verwendung von Store-Funktionen

## Store-Typen und Migrationsstatus

### Document Converter Store

- **API-Stil**: Options API
- **Wichtige Methoden**:
  - `setUseFallback`
  - `clearError`
  - `setView`
  - `refreshDocuments`

### Sessions Store

- **API-Stil**: Composition API
- **Wichtige Methoden**:
  - `setCurrentSession`
  - `createSession`
  - `archiveSession` (statt `deleteSession`)
  - `updateSessionTitle` (statt `renameSession`)
  - `synchronizeSessions` (statt `fetchSessions`)

### Feature Toggles Store

- **API-Stil**: Composition API
- **Wichtige Methoden**:
  - `isEnabled` (statt `isFeatureEnabled`)

## Migration der Komponenten

Bei der Migration von Komponenten sollte folgender Ansatz verfolgt werden:

1. **Store Helper importieren**:
   ```typescript
   import { documentConverterHelper } from '@/utils/storeHelper';
   ```

2. **Store-Zugriff durch Helper ersetzen**:
   ```typescript
   // Vorher:
   documentConverterStore.setUseFallback(false);
   
   // Nachher:
   documentConverterHelper.setUseFallback(false);
   ```

3. **Typdefinitionen aktualisieren**:
   - Type-Aliase für Rückwärtskompatibilität verwenden:
   ```typescript
   export type Session = ChatSession;
   export type Message = ChatMessage;
   ```

## Best Practices

1. **Direkte $patch-Aufrufe vermeiden**:
   - Immer die Helper-Methoden verwenden, um Zustandsänderungen zu verfolgen

2. **Typ-Kompatibilität prüfen**:
   - Immer sicherstellen, dass die verwendeten Typen konsistent sind

3. **Fallback-Verhalten dokumentieren**:
   - Kommentieren, welches Verhalten der Fallback hat, falls es vom Standard abweicht

4. **Feature-Flags für graduelle Migration verwenden**:
   - Mit Feature-Flags kann zwischen altem und neuem Store-Zugriff gewechselt werden

## Anhang

### Store-Strukturvergleich

```typescript
// Options API (DocumentConverterStore)
export const useDocumentConverterStore = defineStore("documentConverter", {
  state: () => ({ /* ... */ }),
  getters: { /* ... */ },
  actions: {
    setUseFallback(value: boolean) { /* ... */ },
    // ...
  }
});

// Composition API (SessionsStore)
export const useSessionsStore = defineStore("sessions", () => {
  // State
  const sessions = ref<ChatSession[]>([]);
  // ...
  
  // Actions
  function setCurrentSession(sessionId: string) { /* ... */ }
  // ...
  
  return {
    sessions,
    setCurrentSession,
    // ...
  };
});
```

### Migrationsbeispiele

Beispiel für die Migration einer Komponente:

```typescript
// Vor der Migration
import { useDocumentConverterStore } from '@/stores/documentConverter';

const documentConverterStore = useDocumentConverterStore();
documentConverterStore.setUseFallback(false);
documentConverterStore.clearError();
documentConverterStore.setView("upload");

// Nach der Migration
import { documentConverterHelper } from '@/utils/storeHelper';

documentConverterHelper.setUseFallback(false);
documentConverterHelper.clearError();
documentConverterHelper.setView("upload");
```

## Zusammenfassung

Die Store Helper Utilities bieten eine flexible und robuste Lösung für die Migration von Pinia Stores, die mit verschiedenen API-Stilen definiert wurden. Sie ermöglichen einen schrittweisen Übergang und reduzieren TypeScript-Fehler, während sie eine einheitliche API für Komponentenentwickler bereitstellen.

Diese Methodik trägt wesentlich zur erfolgreichen Durchführung der Vue 3 SFC-Migration bei, insbesondere für komplexe Komponenten wie den Document Converter und den Enhanced Chat.