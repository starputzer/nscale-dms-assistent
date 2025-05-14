# TypeScript-Richtlinien für das Projekt

Dieses Dokument beschreibt die verbindlichen TypeScript-Richtlinien für das Projekt.

## Grundprinzipien

1. **Typsicherheit priorisieren**: Wir streben danach, so viel typische Laufzeitfehler wie möglich bereits zur Kompilierzeit zu erkennen.
2. **Explizite Typen bevorzugen**: Verwende explizite Typen für bessere Dokumentation und IDE-Unterstützung.
3. **Konsistenz bewahren**: Halte dich an bestehende Muster und Konventionen.
4. **Einfachheit über Komplexität**: Komplexe Typen nur verwenden, wenn sie echten Mehrwert bieten.
5. **Inkrementelle Verbesserung**: Vorhandenen Code schrittweise verbessern, ohne die Entwicklung zu blockieren.

## Allgemeine Richtlinien

### 1. Typdeklarationen

```typescript
// ✅ GUT: Explizite Typen für Funktionen
function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// ✅ GUT: Interface für komplexe Objekte
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

// ❌ SCHLECHT: Vermeidbare implizite any-Typen
function processData(data) {
  return data.map(item => item.value);
}

// ✅ GUT: Expliziter Generic-Typ
function processData<T extends { value: any }>(data: T[]): any[] {
  return data.map(item => item.value);
}
```

### 2. Nullsicherheit

```typescript
// ✅ GUT: Explicit Null-Checks
function getUserName(user: User | null): string {
  if (!user) return 'Guest';
  return user.name;
}

// ❌ SCHLECHT: Implizite Null-Annahme
function getUserName(user: User | null): string {
  return user.name; // Potenzieller Laufzeitfehler!
}

// ✅ GUT: Optional Chaining und Nullish Coalescing
function getUserDisplayName(user?: User): string {
  return user?.displayName ?? user?.name ?? 'Guest';
}
```

### 3. Literal-Typen und Enums

```typescript
// ✅ GUT: String-Literale für begrenzte Optionen
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

// ✅ GUT: Konstanten exportieren für bessere Wiederverwendung
export const BUTTON_VARIANTS = ['primary', 'secondary', 'danger', 'ghost'] as const;
export type ButtonVariant = typeof BUTTON_VARIANTS[number];

// ❌ SCHLECHT: String für begrenzte Optionen
function createButton(variant: string): HTMLButtonElement {
  // Potenziell unsicher, da jeder String gültig ist
}

// ✅ GUT: Numerische Enums für konstante Werte
enum HttpStatusCode {
  OK = 200,
  BadRequest = 400,
  Unauthorized = 401,
  // ...
}
```

### 4. Typerweiterung und -komposition

```typescript
// ✅ GUT: Interface-Erweiterung
interface BaseUser {
  id: string;
  name: string;
}

interface AdminUser extends BaseUser {
  permissions: string[];
}

// ✅ GUT: Typ-Komposition
type UserWithSettings = User & {
  settings: UserSettings;
};

// ✅ GUT: Utility-Typen verwenden
type ReadonlyUser = Readonly<User>;
type UserUpdate = Partial<User>;
type UserFields = Pick<User, 'id' | 'name' | 'email'>;
```

### 5. Generics

```typescript
// ✅ GUT: Generische Funktionen
function cloneObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ✅ GUT: Einschränkungen für Generics
function sortByProperty<T, K extends keyof T>(items: T[], property: K): T[] {
  return [...items].sort((a, b) => a[property] > b[property] ? 1 : -1);
}

// ✅ GUT: Mehrere Typ-Parameter
function mapObject<T, U>(obj: Record<string, T>, fn: (value: T) => U): Record<string, U> {
  const result: Record<string, U> = {};
  for (const key in obj) {
    result[key] = fn(obj[key]);
  }
  return result;
}
```

## Vue 3 TypeScript-Richtlinien

### 1. Component-Typen

```typescript
// ✅ GUT: Definierte Prop-Typen
const props = defineProps({
  title: {
    type: String,
    required: true,
    validator: (value) => value.length > 0
  },
  variant: {
    type: String as PropType<ButtonVariant>,
    default: 'primary',
    validator: isOneOf(BUTTON_VARIANTS)
  },
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md'
  }
});

// ✅ GUT: Typisierte Emits
const emit = defineEmits<{
  'click': [event: MouseEvent];
  'update': [value: string, id: number];
}>();

// ✅ GUT: Typisierte Slots
defineSlots<{
  default: (props: { item: Item }) => any;
  header: () => any;
  footer: (props: { count: number }) => any;
}>();
```

### 2. Composables

```typescript
// ✅ GUT: Typisierter Return-Wert von Composables
interface UseCounterReturn {
  count: Ref<number>;
  increment: () => void;
  decrement: () => void;
  reset: (value?: number) => void;
}

export function useCounter(initialValue = 0): UseCounterReturn {
  const count = ref(initialValue);

  function increment() {
    count.value++;
  }

  function decrement() {
    count.value--;
  }

  function reset(value = 0) {
    count.value = value;
  }

  return {
    count,
    increment,
    decrement,
    reset
  };
}
```

### 3. Store-Typen (Pinia)

```typescript
// ✅ GUT: Explicit State-Interface
interface CounterState {
  count: number;
  lastUpdated: Date | null;
}

// ✅ GUT: Typisierter Store
export const useCounterStore = defineStore('counter', {
  state: (): CounterState => ({
    count: 0,
    lastUpdated: null
  }),
  getters: {
    doubleCount(): number {
      return this.count * 2;
    }
  },
  actions: {
    increment() {
      this.count++;
      this.lastUpdated = new Date();
    }
  }
});

// ✅ GUT: Store-Typ mit Utilities extrahieren
type CounterStoreState = ExtractState<typeof useCounterStore>;
type CounterStoreGetters = ExtractGetters<typeof useCounterStore>;
type CounterStoreActions = ExtractActions<typeof useCounterStore>;
```

## API und asynchrone Operationen

### 1. API-Typen

```typescript
// ✅ GUT: Klar definierte Request-/Response-Typen
interface GetUsersRequest {
  page?: number;
  limit?: number;
  filter?: string;
}

interface GetUsersResponse {
  users: User[];
  totalCount: number;
  page: number;
  totalPages: number;
}

// ✅ GUT: API-Methoden mit Typen
async function getUsers(params: GetUsersRequest): Promise<Result<GetUsersResponse, APIError>> {
  try {
    const response = await api.get<GetUsersResponse>('/users', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: formatApiError(error) };
  }
}
```

### 2. Fehlerbehandlung

```typescript
// ✅ GUT: Result-Pattern für explizite Fehlerbehandlung
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ✅ GUT: Typengenaue Fehlerbehandlung
async function processUserData(userId: string): Promise<Result<ProcessedData, APIError>> {
  const userResult = await getUser(userId);
  
  if (!userResult.success) {
    return { success: false, error: userResult.error };
  }
  
  const user = userResult.data;
  // Verarbeite Daten...
  
  return { 
    success: true, 
    data: {
      // Verarbeitete Daten
    } 
  };
}

// ✅ GUT: Verwendung des Result-Patterns im Client-Code
const result = await processUserData(userId);
if (result.success) {
  showUserData(result.data);
} else {
  showError(result.error.message);
}
```

## Tests

### 1. Test-Typen

```typescript
// ✅ GUT: Typisierte Test-Hilfsfunktionen
function renderComponent<T extends Component>(
  component: T,
  props?: ComponentProps<T>
) {
  return mount(component, { props });
}

// ✅ GUT: Typisierte Mock-Daten
interface TestUser extends User {
  testId: string;
}

function createTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    testId: 'test-123',
    ...overrides
  };
}
```

### 2. Test-Assertions

```typescript
// ✅ GUT: Typsichere Assertions
it('sollte die korrekten Benutzerdaten anzeigen', () => {
  const user = createTestUser();
  const wrapper = renderComponent(UserProfile, { user });
  
  expect(wrapper.find('[data-testid="user-name"]').text()).toBe(user.name);
  expect(wrapper.find('[data-testid="user-email"]').text()).toBe(user.email);
});
```

## Formatierung und Stil

### 1. Import-Stil

```typescript
// ✅ GUT: Typen mit type/interface-Import
import type { User, UserSettings } from '@/types';
import { formatDate, formatCurrency } from '@/utils/formatters';

// ✅ GUT: Namespaced Imports für verwandte Funktionalität
import * as UserAPI from '@/api/user';
import * as DateUtils from '@/utils/date';
```

### 2. Dokumentationsstil

```typescript
/**
 * Ein Nutzer im System
 * @interface User
 */
interface User {
  /** Eindeutige ID des Nutzers */
  id: string;
  /** Vollständiger Name des Nutzers */
  name: string;
  /** E-Mail-Adresse des Nutzers (muss einzigartig sein) */
  email: string;
  /** Wann der Nutzer erstellt wurde */
  createdAt: Date;
}

/**
 * Formatiert ein Datum in ein lesbarfreundliches Format
 * @param date - Das zu formatierende Datum
 * @param format - Optionales Format (Standard: 'DD.MM.YYYY')
 * @returns Formatierte Datumszeichenfolge
 */
function formatDate(date: Date, format = 'DD.MM.YYYY'): string {
  // Implementierung...
}
```

## Best Practices

### Inkrementelle Typverbesserung

1. **Problemstellen identifizieren**: Nutze den "typecheck:strict"-Befehl, um problematische Bereiche zu finden.
2. **Kritische Pfade priorisieren**: Beginne mit Code, der häufig geändert wird oder geschäftskritisch ist.
3. **Inkrementell verbessern**: Verbessere die Typisierung schrittweise, um den Entwicklungsfluss nicht zu unterbrechen.
4. **Automatisierte Tests**: Stelle sicher, dass Typverbesserungen mit Tests abgedeckt sind.

### Refactoring-Strategien

1. **Extract-Interface-Pattern**: Extrahiere Interfaces aus vorhandenen Implementierungen.
2. **Type Guards einführen**: Verwende Type Guards, um komplexe Typprüfungen zu vereinfachen.
3. **Literal-Typen für Konstanten**: Ersetze allgemeine String-Parameter durch Literal-Typen, wo möglich.
4. **Generische Funktionen**: Mache vorhandene Funktionen generisch, wenn sie mit verschiedenen Datentypen arbeiten.

## Fallstricke und Lösungen

### 1. Type Assertion vermeiden

```typescript
// ❌ SCHLECHT: Übermäßige Type Assertions
const userData = someData as User;

// ✅ GUT: Typ-Guards verwenden
function isUser(data: any): data is User {
  return data && 
         typeof data.id === 'string' && 
         typeof data.name === 'string' && 
         typeof data.email === 'string';
}

if (isUser(someData)) {
  // someData ist jetzt typisiert als User
}
```

### 2. any vermeiden

```typescript
// ❌ SCHLECHT: Vermeidbare any-Typen
function processData(data: any): any {
  // ...
}

// ✅ GUT: Generics oder spezifische Typen verwenden
function processData<T>(data: T): ProcessedResult<T> {
  // ...
}

// ✅ Alternative: unknown verwenden, wenn der Typ wirklich unsicher ist
function processUnknownData(data: unknown): string {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  if (typeof data === 'number') {
    return data.toString();
  }
  return String(data);
}
```

### 3. Index-Zugriff absichern

```typescript
// ❌ SCHLECHT: Unsicherer Index-Zugriff
const firstItem = items[0];  // Kann undefined sein, wenn items leer ist

// ✅ GUT: Sicherer Zugriff
const firstItem = items.length > 0 ? items[0] : undefined;

// ✅ ODER: Optional Chaining (mit noUncheckedIndexedAccess)
const firstName = items[0]?.name;
```

## Richtlinien für die Migration zu strikteren Typprüfungen

Siehe das separate Dokument [TYPESCRIPT_STRICTER_TYPES.md](./TYPESCRIPT_STRICTER_TYPES.md) für detaillierte Anweisungen zur Migration zu strikteren TypeScript-Einstellungen.

## Referenzen und Ressourcen

1. [Offizielle TypeScript-Dokumentation](https://www.typescriptlang.org/docs/)
2. [Vue 3 TypeScript Support](https://vuejs.org/guide/typescript/overview.html)
3. [Pinia mit TypeScript](https://pinia.vuejs.org/cookbook/usage-with-typescript.html)
4. Interne Ressourcen:
   - [TYPESCRIPT_FIXES.md](/TYPESCRIPT_FIXES.md)
   - [TYPESCRIPT_STRICTER_TYPES.md](/docs/TYPESCRIPT_STRICTER_TYPES.md)
   - [README-TYPESCRIPT-TESTING.md](/test/README-TYPESCRIPT-TESTING.md)