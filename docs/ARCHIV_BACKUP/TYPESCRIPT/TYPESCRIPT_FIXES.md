# TypeScript-Verbesserungen

Dieses Dokument beschreibt die TypeScript-Verbesserungen, die im Rahmen der Vue 3-Migration durchgeführt wurden.

## Überblick

Die TypeScript-Verbesserungen umfassen:

1. Gemeinsame Utility-Typen für die gesamte Anwendung
2. Typisierte API-Services mit einheitlicher Fehlerbehandlung
3. Verbesserte Typdefinitionen für Composables
4. Konsistente Typisierung zwischen Standard- und optimierten Stores
5. Verbesserungen an Bridge-System-Typen
6. Verbesserte Komponenten-Typen für Props und Events

## 1. Utility-Typen

Wir haben gemeinsame Utility-Typen in folgenden Dateien erstellt:

### `/src/utils/types.ts`

Basistypen wie:
- `Nullable<T>` - Typ, der null sein kann
- `Optional<T>` - Typ, der undefined sein kann
- `DeepPartial<T>` - Verschachtelte partielle Typen
- `Result<T, E>` - Ergebnistyp mit expliziter Fehlerbehandlung
- Typprüfungen wie `isString`, `isNumber`, `isObject`

```typescript
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### `/src/utils/apiTypes.ts`

API-bezogene Typen wie:
- `HTTPMethod` - HTTP-Methoden-Enum
- `StatusCode` - HTTP-Statuscodes
- `APIError` - Einheitliche API-Fehlerstruktur
- `APIRequest` und `APIResponse` - Konsistente Request/Response-Typen

```typescript
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}
```

### `/src/utils/storeTypes.ts`

Store-bezogene Typen wie:
- `ExtractState<Store>` - Extrahiert den State aus einem Store
- `ExtractGetters<Store>` - Extrahiert die Getters aus einem Store
- `ExtractActions<Store>` - Extrahiert die Actions aus einem Store
- `ReadonlyState<S>` - Schreibgeschützter State-Typ

```typescript
export type ExtractState<Store> = Store extends StoreDefinition<
  string,
  infer S,
  any,
  any
> ? S : never;
```

### `/src/utils/eventTypes.ts`

Event-bezogene Typen wie:
- `EventMap` - Typisierte Event-Map für Event-Bus
- `EventPayload` - Basisinterface für Event-Payloads
- `EventHandler<T>` - Typisierter Event-Handler
- `Subscription` - Abonnement mit Unsubscribe-Methode

```typescript
export interface EventMap {
  'system:initialized': EventPayload;
  'system:error': ErrorEvent;
  'chat:messageReceived': ChatMessageEvent;
  // weitere spezifische Events
}
```

### `/src/utils/componentTypes.ts`

Komponenten-bezogene Typen wie:
- `PropType<T>` - Typisierte Props
- `EmitFn<E>` - Typisierte Emit-Funktionen
- `Slots<S>` - Typisierte Slots
- `ComponentExpose<T>` - Typisierte Expose-Eigenschaften

```typescript
export type EmitFn<E extends Record<string, any[]>> = {
  <K extends keyof E>(event: K, ...args: E[K]): void;
};
```

### `/src/utils/composableTypes.ts`

Composable-bezogene Typen wie:
- `UseAuthReturn` - Return-Typ für useAuth composable
- `UseChatReturn` - Return-Typ für useChat composable
- `UseElementSizeReturn` - Return-Typ für useElementSize composable
- `FeatureToggleOptions` - Optionen für useFeatureToggles
- `ApiCacheOptions` - Optionen für useApiCache
- `UseApiCacheReturn` - Return-Typ für useApiCache
- `UseLocalStorageReturn` - Return-Typ für useLocalStorage
- `ClipboardOptions` - Optionen für useClipboard
- `UseClipboardReturn` - Return-Typ für useClipboard

```typescript
export interface UseAuthReturn {
  // Computed Properties
  user: ComputedRef<Nullable<User>>;
  isAuthenticated: ComputedRef<boolean>;
  // ...weitere Properties und Methoden
}
```

### Zentraler Export

Alle Utility-Typen werden in `/src/utils/typeUtils.ts` zentral exportiert:

```typescript
// Basis-Utility-Typen
export * from './types';

// API-bezogene Typen
export * from './apiTypes';

// Store-bezogene Typen
export * from './storeTypes';

// Event-bezogene Typen
export * from './eventTypes';

// Service-bezogene Typen
export * from './serviceTypes';

// Komponenten-bezogene Typen
export * from './componentTypes';

// Composable-bezogene Typen
export * from './composableTypes';
```

Dieser Ansatz ermöglicht den Import aller Typen aus einer einzigen Datei:

```typescript
import { Nullable, Result, APIResponse } from '@/utils/typeUtils';
```

Sowie Namespaced-Imports für bessere Organisation:

```typescript
import { ApiUtils, StoreUtils } from '@/utils/typeUtils';

// Verwendung mit Namespace
const response: ApiUtils.Types.APIResponse<User[]> = await api.getUsers();
```

## 2. API-Services

Für API-Services haben wir folgende Verbesserungen implementiert:

### `/src/utils/serviceTypes.ts`

Basisinterfaces für Services:

```typescript
export interface BaseService {
  name: string;
  init(): Promise<void>;
  destroy(): void;
}

export interface ApiServiceInterface extends BaseService {
  get<T = any>(url: string, params?: any): Promise<Result<T, APIError>>;
  post<T = any>(url: string, data?: any): Promise<Result<T, APIError>>;
  // ...weitere Methoden
}
```

### `/src/services/api/BaseApiService.ts`

Basisklasse für API-Services mit generischer Typenunterstützung:

```typescript
export abstract class BaseApiService<
  EntityType = any,
  CreateParams = any,
  UpdateParams = Partial<EntityType>
> {
  // Implementierung von CRUD-Operationen mit typisierten Parametern und Rückgabewerten
}
```

### `/src/services/api/ServiceAdapterFactory.ts`

Factory für typisierte Service-Instanzen:

```typescript
export class ServiceAdapterFactory {
  public static createApiServiceAdapter(
    originalService: any = apiService
  ): ApiServiceInterface {
    return new NScaleApiServiceAdapter(originalService);
  }
  
  // Weitere Factory-Methoden
}
```

### `/src/utils/apiErrorUtils.ts`

Hilfsfunktionen für konsistente Fehlerbehandlung:

```typescript
export function formatApiError(
  error: any, 
  defaultMessage = 'Ein unbekannter Fehler ist aufgetreten'
): APIError {
  // Implementierung
}

export function mapStatusCodeToMessage(statusCode: number): string {
  // Mapping von HTTP-Statuscodes zu benutzerfreundlichen Meldungen
}
```

## 3. Composables

Für Composables haben wir folgende Verbesserungen implementiert:

### `/src/composables/useAuth.ts`

```typescript
import type { UseAuthReturn } from "../utils/composableTypes";

/**
 * Hook für Authentifizierungsfunktionen in Komponenten
 * ...
 * @returns {UseAuthReturn} Objekt mit Authentifizierungsfunktionen und reaktiven Eigenschaften
 */
export function useAuth(): UseAuthReturn {
  // Implementierung...
}
```

### `/src/composables/useChat.ts`

```typescript
import type { UseChatReturn } from "../utils/composableTypes";

/**
 * Hook für Chat-Funktionen in Komponenten
 * ...
 * @returns {UseChatReturn} Objekt mit Chat-Funktionen und reaktiven Eigenschaften
 */
export function useChat(): UseChatReturn {
  // Implementierung...
}
```

### `/src/composables/useElementSize.ts`

```typescript
import type { UseElementSizeReturn } from "../utils/composableTypes";

/**
 * Composable zur reaktiven Beobachtung der Größe eines Elements
 * ...
 * @returns {UseElementSizeReturn} Objekt mit reaktiven width und height Eigenschaften
 */
export function useElementSize(elementRef: Ref<HTMLElement | null>): UseElementSizeReturn {
  // Implementierung...
}
```

### `/src/composables/useLocalStorage.ts`

```typescript
import type { UseLocalStorageReturn } from "../utils/composableTypes";

export interface LocalStorageRef<T> extends UseLocalStorageReturn<T> {
  // Erweiterte Funktionalität
}

export function useLocalStorage<T>(
  key: string,
  initialValue?: T | (() => T),
  options: LocalStorageOptions<T> = {},
): LocalStorageRef<T> {
  // Implementierung...
}
```

## 4. Bridge-System

Verbesserte Typisierung für das Bridge-System:

- Typisierte Event-Bus-Schnittstellen
- Fehlerbehandlung mit Null-Checks
- Konsistente Typen zwischen Legacy- und modernem Code

## 5. Stores

Für Stores haben wir folgende Verbesserungen implementiert:

- Gemeinsame Interfaces für Standard- und optimierte Stores
- Konsistente Typisierung durch gemeinsame Typdefinitionen
- Readonly-Typen für optimierte Stores

## 6. Komponenten

Für Komponenten haben wir folgende Verbesserungen implementiert:

### Verbesserte Prop-Validierung und Event-Typen

Die Validierung von Komponenten-Props und Event-Typen wurde erheblich verbessert:

- Erweiterte PropType-Definitionen mit besserer Typsicherheit
- Typsichere Emit-Funktionen mit Array-Typisierung für Parameter
- Slot-Typen für bessere Template-Typsicherheit
- V-Model-Typen für einfachere Integration
- Hilfsfunktionen für Prop-Definitionen: `propOptions<T>`, `requiredProp`, `withDefaultProp`

```typescript
// PropType mit verbesserter Typisierung
export type PropType<T> = {
  type: PropConstructor<T> | PropConstructor<T>[] | null;
  required?: boolean;
  default?: T | (() => T);
  validator?(value: unknown): boolean;
};

// EmitFn mit stärkerer Typisierung für Events
export type EmitFn<Events extends Record<string, any[]>> = {
  <E extends keyof Events>(event: E, ...args: Events[E]): void;
};

// VModel-Typen für einfachere Integration
export interface VModelType<T> {
  modelValue: T;
  'onUpdate:modelValue': (value: T) => void;
}

export type VModelProps<T> = {
  modelValue?: T;
};

export type VModelEmits<T> = {
  'update:modelValue': [T];
};
```

### Prop-Validatoren

Eine umfangreiche Sammlung von Prop-Validatoren wurde in `propValidators.ts` implementiert:

```typescript
// Validiert, dass ein Wert einer der erlaubten Werte ist
export function isOneOf<T>(allowedValues: readonly T[]): (value: unknown) => boolean {
  return (value: unknown) => allowedValues.includes(value as T);
}

// Kombiniert mehrere Validatoren mit UND-Logik
export function and(validators: ((value: unknown) => boolean)[]): (value: unknown) => boolean {
  return (value: unknown) => validators.every(validator => validator(value));
}

// E-Mail-Validator
export function isEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value);
}
```

### Beispiel-Komponenten

Musterimplementierungen für stark typisierte Komponenten wurden erstellt:

1. **TypedButton.vue**: Beispiel für eine Komponente mit erweiterten Prop-Validierungen und typisierten Events
2. **TypedInput.vue**: Beispiel für eine Komponente mit v-model-Integration und umfassender Validierung

Diese Beispiel-Komponenten zeigen:
- Verwendung von Literal-Typen für Varianten und Größen
- Integration von Validator-Funktionen
- Typsichere Event-Emitter
- Integration mit v-model
- Dokumentation durch JSDoc-Kommentare

### Typverbesserungen für Vue 3-Funktionalitäten

- Verbesserte Typen für `defineProps`, `defineEmits` und `defineSlots`
- Unterstützung für benannte v-model-Bindungen
- Typsichere Slot-Funktionen und Prop-Definitionen
- Bessere Integration mit TypeScript-Compiler für automatische Typüberprüfung

## 7. Test-Framework TypeScript-Integration

Die Integration von TypeScript in das Test-Framework wurde erfolgreich umgesetzt:

### Typsichere Test-Utilities

Wir haben eine `typescript-test-utils.ts`-Datei erstellt, die typsichere Test-Utilities bereitstellt:

```typescript
// Typsichere Mount-Funktion für Komponententests
export function typedMount<
  TComponent extends Component,
  TProps = ComponentProps<TComponent>
>(
  component: TComponent,
  options?: MountingOptions<TProps>
): VueWrapper<InstanceType<TComponent>> {
  return mount(component, options as any) as VueWrapper<InstanceType<TComponent>>;
}

// Typisierter Mock für Services und APIs
export function createTypedMock<T>(implementation?: Partial<T>): T {
  return { ...implementation } as T;
}

// Typisierter Store-Mock
export function mockStore<S, G, A>(
  storeDefinition: StoreDefinition<string, S, G, A>,
  initialState: Partial<S>
): Store<string, S, G, A> {
  // Implementierung...
}
```

### Test-Typdefinitionen

Eine `test-types.ts`-Datei wurde für Test-spezifische Typdefinitionen erstellt:

```typescript
// Typdefinitionen für Testdaten
export interface TestUser extends User {
  displayName: string;
  lastLogin: string;
  preferences: {
    theme: string;
    language: string;
  };
}

// Factory-Funktionen für Testdaten
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  // Implementierung...
}

// Typen für Mock-Konfigurationen
export interface MockHttpConfig {
  status?: number;
  data?: any;
  headers?: Record<string, string>;
  delay?: number;
}
```

### Beispiel-Tests

Wir haben Beispiel-Tests erstellt, die die neuen typsicheren Test-Utilities verwenden:

1. `TypedButton.spec.ts` - Beispiel für typsicheren Komponententest
2. `useLocalStorage.enhanced.spec.ts` - Beispiel für typsicheren Composable-Test
3. `typed-sessions.spec.ts` - Beispiel für typsicheren Store-Test

Diese Beispiel-Tests demonstrieren:
- Typsicheres Mounten von Komponenten mit korrekten Props
- Typsicheres Testen von Events und Emits
- Typsicheres Testen von Store-Actions und -Mutations
- Typsicheres Mocken von Services und APIs

### Dokumentation

Eine umfassende README-Datei (`README-TYPESCRIPT-TESTING.md`) wurde erstellt, die detaillierte Anleitungen zum typsicheren Testen enthält.

## 8. Strikte TypeScript-Konfiguration

Die TypeScript-Konfiguration wurde für eine stärkere Typprüfung optimiert:

### Neue tsconfig.optimized.json

Eine erweiterte TypeScript-Konfiguration wurde in `tsconfig.optimized.json` erstellt:

```json
{
  "compilerOptions": {
    /* Enhanced Type Checking */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,

    /* Additional Checks */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    // Weitere Konfigurationen...
  }
}
```

### Neue npm-Skripte

Für die inkrementelle Umstellung wurden neue npm-Skripte hinzugefügt:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:strict": "tsc --noEmit --project tsconfig.optimized.json",
    "typecheck:report": "tsc --noEmit --project tsconfig.optimized.json > typecheck-report.txt",
    "typecheck:incremental": "node scripts/incremental-typecheck.js"
  }
}
```

### Inkrementelle Überprüfung

Ein Skript für die inkrementelle Überprüfung (`scripts/incremental-typecheck.js`) wurde erstellt, das:
- Jedes Verzeichnis in `src/` einzeln überprüft
- Fehler nach Verzeichnissen gruppiert
- Einen detaillierten Bericht erstellt
- Prioritäten für die Behebung von Fehlern vorschlägt

### Dokumentation

Eine ausführliche Dokumentation zu den strengeren Typprüfungen wurde in `docs/TYPESCRIPT_STRICTER_TYPES.md` erstellt.

## 9. Dokumentation und Richtlinien

### TypeScript-Richtlinien

Umfassende TypeScript-Richtlinien für das Projekt wurden in folgenden Dateien dokumentiert:

1. `TYPESCRIPT_FIXES.md` - Überblick über alle TypeScript-Verbesserungen
2. `docs/TYPESCRIPT_STRICTER_TYPES.md` - Details zur strengeren Typprüfung
3. `test/README-TYPESCRIPT-TESTING.md` - Anleitungen zum typsicheren Testen

Diese Dokumentation umfasst:
- Best Practices für TypeScript im Projekt
- Migration zu strengerer Typprüfung
- Umgang mit häufigen TypeScript-Problemen
- Beispiele für typsicheren Code