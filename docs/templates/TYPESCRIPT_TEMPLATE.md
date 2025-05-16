---
title: "TypeScript-Dokumentation Titel"
version: "1.0.0"
date: "12.05.2025"
lastUpdate: "13.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "TypeScript"
tags: ["TypeScript", "Typdefinitionen", "Interfaces", "Types"]
---

# TypeScript-Dokumentation Titel

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsübersicht

- [1. Überblick](#1-überblick)
- [2. Typdefinitionen](#2-typdefinitionen)
- [3. Interfaces und Typen](#3-interfaces-und-typen)
- [4. Utility-Typen](#4-utility-typen)
- [5. Type Guards](#5-type-guards)
- [6. Generics](#6-generics)
- [7. Migrationsstrategien](#7-migrationsstrategien)
- [8. Best Practices](#8-best-practices)
- [9. Häufige Fehler und Lösungen](#9-häufige-fehler-und-lösungen)
- [10. Tooling und Konfiguration](#10-tooling-und-konfiguration)
- [11. Referenzen](#11-referenzen)

## 1. Überblick

### 1.1 Implementierungsstand

Aktuelle Statistiken zur TypeScript-Implementierung:

| Bereich | Konvertierungsgrad | Status |
|---------|-------------------|--------|
| Komponenten | 95% | In Bearbeitung |
| Services | 100% | Abgeschlossen |
| Stores | 100% | Abgeschlossen |
| Utils | 90% | In Bearbeitung |
| Gesamt | 96% | In Bearbeitung |

### 1.2 Ziele der TypeScript-Implementierung

- Typsicherheit für das gesamte Projekt
- Verbesserte Entwicklererfahrung durch IDE-Unterstützung
- Reduzierung von Laufzeitfehlern durch frühzeitige Fehlererkennung
- Bessere Dokumentation durch explizite Typinformationen

## 2. Typdefinitionen

### 2.1 Globale Typen

Übersicht der wichtigsten globalen Typdefinitionen im Projekt:

```typescript
// app/src/types/globals.d.ts
interface Window {
  appConfig: AppConfig;
  errorTrackingService: ErrorTrackingService;
  legacyAPI: LegacyAPI;
}

// app/src/types/env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENV: 'development' | 'staging' | 'production';
  readonly VITE_FEATURE_FLAGS: string;
}
```

### 2.2 Moduldeklarationen

```typescript
// app/src/types/modules.d.ts
declare module 'external-library' {
  export function usefulFunction(): void;
  export const importantConstant: string;
}
```

## 3. Interfaces und Typen

### 3.1 API-Typen

Zentrale Typen für API-Interaktionen:

```typescript
// app/src/types/api.ts
export interface ApiRequest<TParams = any> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: TParams;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
};
```

### 3.2 Store-Typen

Typdeklarationen für Stores:

```typescript
// app/src/types/stores.ts
export interface IBaseStore {
  id: string;
  reset: () => void;
}

export interface ISessionsStore extends IBaseStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  getActiveSession: () => ChatSession | undefined;
  // Weitere Eigenschaften und Methoden
}
```

### 3.3 Komponenten-Typen

Typdeklarationen für Komponenten:

```typescript
// app/src/types/component-types.ts
export interface BaseProps {
  className?: string;
  style?: CSSProperties;
}

export interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
}
```

## 4. Utility-Typen

### 4.1 Basis-Utility-Typen

```typescript
// app/src/utils/types.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ValueOf<T> = T[keyof T];
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;
```

### 4.2 Fortgeschrittene Utility-Typen

```typescript
// app/src/utils/typeUtils.ts
export type ExtractState<Store> = Store extends StoreDefinition<
  string,
  infer S,
  any,
  any
>
  ? S
  : never;

export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, unknown>
    ? ReadonlyDeep<T[P]>
    : T[P] extends Array<infer U>
      ? ReadonlyArray<U>
      : T[P];
};
```

## 5. Type Guards

### 5.1 Standard Type Guards

```typescript
// app/src/utils/typeUtils.ts
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

### 5.2 Komplexe Type Guards

```typescript
// app/src/utils/apiErrorUtils.ts
export function isApiError(error: unknown): error is ApiError {
  if (!isObject(error)) return false;
  
  return (
    'code' in error &&
    isString(error.code) &&
    'message' in error &&
    isString(error.message)
  );
}

// app/src/utils/eventTypes.ts
export function isValidEventPayload<T extends keyof EventMap>(
  eventName: T,
  payload: unknown
): payload is EventMap[T] {
  // Validierungslogik je nach Eventtyp
  switch (eventName) {
    case 'system:error':
      return isObject(payload) && 'message' in payload;
    // Weitere Fälle...
    default:
      return true;
  }
}
```

## 6. Generics

### 6.1 Generische Funktionen

```typescript
// app/src/utils/apiUtils.ts
export async function fetchData<T>(
  url: string,
  options?: RequestInit
): Promise<Result<T, ApiError>> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch data',
          statusCode: response.status
        }
      };
    }
    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
```

### 6.2 Generische Komponenten

```typescript
// app/src/components/List.tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}
```

## 7. Migrationsstrategien

### 7.1 Schrittweise Migration

Strategien zur schrittweisen Migration von JavaScript zu TypeScript:

1. **Zunächst .js zu .ts**: Dateien umbennen ohne Typänderungen
2. **Explizite any-Typen**: Zunächst `any` für problematische Stellen verwenden
3. **Typdefinitionen hinzufügen**: Schrittweise stärkere Typisierung einführen
4. **Strikte Prüfungen aktivieren**: Graduelle Aktivierung strikter TypeScript-Flags

### 7.2 Herausforderungen und Lösungen

| Herausforderung | Lösungsansatz |
|-----------------|---------------|
| Legacy-Code-Integration | Bridge-Pattern mit Adapter-Klassen |
| Externe Bibliotheken ohne Typen | Eigene Typ-Deklarationen in d.ts-Dateien |
| Dynamische Datenstrukturen | Generics und Union-Types |
| API-Responses | Zonale Typsicherheit mit Type Guards an API-Grenzen |

## 8. Best Practices

### 8.1 Namenskonventionen

- **Interfaces**: Mit `I` als Präfix für Hauptinterfaces (z.B. `ISessionsStore`)
- **Typen**: PascalCase ohne Präfix (z.B. `ApiResponse`)
- **Generics**: Einzelbuchstaben (T, K, V) oder aussagekräftige Namen (TData, TParams)
- **Enums**: PascalCase (z.B. `LogLevel`)

### 8.2 Strukturierungsrichtlinien

- Interfaces und Typen für zusammengehörige Konzepte in eigene Dateien auslagern
- Barrel-Exporte für vereinfachte Importe verwenden
- Einen zentralen Ort für gemeinsam genutzte Typen schaffen
- Typen nah an ihrer Verwendung definieren, wenn sie spezifisch sind

### 8.3 Null/Undefined-Behandlung

```typescript
// Bevorzugt:
function getUser(id?: string): User | undefined {
  if (!id) return undefined;
  return userMap.get(id);
}

// Verwenden:
const user = getUser(userId);
if (user) {
  // user ist hier typsicher als User
}

// Vermeiden:
function getUserUnsafe(id?: string): User {
  return userMap.get(id!)!; // Unsichere non-null assertions
}
```

## 9. Häufige Fehler und Lösungen

### 9.1 Häufigste TypeScript-Fehler

<details>
<summary>Top 5 TypeScript-Fehler im Projekt (klicken zum Erweitern)</summary>

| Fehler | Beschreibung | Häufigkeit | Lösungsansatz |
|--------|--------------|------------|---------------|
| TS2532 | Object is possibly 'undefined' | 37% | Nullchecks oder Optional Chaining |
| TS2345 | Argument of type X not assignable to parameter of type Y | 18% | Explizite Typkonvertierung oder Typanpassung |
| TS2339 | Property does not exist on type | 15% | Interfaces erweitern oder Type Guards |
| TS2322 | Type X is not assignable to type Y | 12% | Korrekte Typdefinitionen oder generische Parameter |
| TS2366 | Function lacks ending return statement | 8% | Explizite Return-Statements oder Typannotationen |

</details>

### 9.2 Lösungsstrategien

#### 9.2.1 Non-Null Assertions (!)

**Problem:**
```typescript
const firstKey = cache.keys().next().value;
cache.delete(firstKey); // firstKey könnte undefined sein
```

**Lösung:**
```typescript
const firstEntry = cache.keys().next();
if (!firstEntry.done && firstEntry.value) {
  cache.delete(firstEntry.value);
}
```

#### 9.2.2 Typzusicherungen (as)

**Problem:**
```typescript
const data = JSON.parse(response); // data: any
const user = data.user; // Untypisiert
```

**Lösung:**
```typescript
interface ResponseData {
  user: User;
  timestamp: number;
}

// Zuerst Type Guard anwenden
function isResponseData(data: unknown): data is ResponseData {
  return (
    isObject(data) &&
    'user' in data &&
    isObject(data.user) &&
    'timestamp' in data &&
    isNumber(data.timestamp)
  );
}

const rawData = JSON.parse(response);
if (isResponseData(rawData)) {
  const user = rawData.user; // Korrekt typisiert
}
```

## 10. Tooling und Konfiguration

### 10.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    
    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    
    // Linting
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    
    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 10.2 ESLint-Konfiguration

```json
{
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/consistent-type-imports": ["error", {
      "prefer": "type-imports"
    }]
  }
}
```

### 10.3 IDE-Setup

Empfohlene VS Code-Erweiterungen und -Einstellungen:

- TypeScript Vue Plugin (Volar)
- ESLint
- TypeScript Error Translator
- Import Cost
- ErrorLens

## 11. Referenzen

### 11.1 Interne Referenzen

- [TypeScript-Migrationsguide](../03_ENTWICKLUNG/TYPESCRIPT_MIGRATION_GUIDE.md)
- [Type-System-Architektur](../03_ARCHITEKTUR/TYPESCRIPT_TYPE_SYSTEM.md)

### 11.2 Externe Referenzen

- [TypeScript-Dokumentation](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Vue 3 TypeScript-Support](https://vuejs.org/guide/typescript/overview.html)

### 11.3 Ursprüngliche Dokumente

Dieses Dokument wurde aus folgenden Quellen konsolidiert:

1. app/docs/TYPESCRIPT_FIXES.md
2. app/docs/TYPESCRIPT_GUIDELINES.md
3. app/docs/TYPESCRIPT_MIGRATION_GUIDE.md
4. app/docs/TYPESCRIPT_STRICTER_TYPES.md
5. app/docs/TYPE_CONSOLIDATION_EXAMPLE.md
6. app/docs/TYPE_REDUNDANCY_MANAGEMENT.md

---

*Zuletzt aktualisiert: 13.05.2025*