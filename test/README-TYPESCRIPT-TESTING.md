# TypeScript Integration in Tests

Dieses Dokument beschreibt die empfohlenen Vorgehensweisen zur Integration von TypeScript in Tests, um die Typprüfung und Code-Qualität zu verbessern.

## Überblick

Die TypeScript-Integration in Tests bietet folgende Vorteile:

1. **Fehlerfrüherkennung**: TypeScript-Fehler werden zur Kompilierungszeit erkannt, bevor Tests ausgeführt werden
2. **Verbesserte Code-Navigation**: IDE-Unterstützung mit Auto-Vervollständigung und Go-to-Definition
3. **Bessere Dokumentation**: Typ-Definitionen dienen als selbstdokumentierende Tests
4. **Refactoring-Sicherheit**: Änderungen im Code werden automatisch in Tests geprüft
5. **Höhere Testqualität**: Typen verhindern falsche Test-Assertions

## Struktur der Test-Utilities

Die Test-Utilities wurden um folgende TypeScript-spezifische Dateien erweitert:

- `/test/utils/typescript-test-utils.ts`: Enthält typsichere Test-Utilities
- `/test/types/test-types.ts`: Enthält Test-spezifische Typdefinitionen

### Utilities für typsichere Tests

Die Datei `typescript-test-utils.ts` bietet:

```typescript
// Typsichere Komponenten-Mount-Funktion
export function typedMount<TComponent extends Component, TProps = ComponentProps<TComponent>>(
  component: TComponent,
  options?: MountingOptions<TProps>
): VueWrapper<InstanceType<TComponent>> {
  return mount(component, options as any) as VueWrapper<InstanceType<TComponent>>;
}

// Typsicherer Mock für API-Antworten
export function createMockApiResponse<T = any>(
  data: T,
  success = true,
  statusCode = 200
): APIResponse<T> {
  // Implementation...
}

// Typsicherer Result-Typ
export function createSuccessResult<T>(data: T): Result<T, APIError> {
  return { success: true, data };
}

// Typsichere Mocks für Store-Actions
export function mockStoreAction<TStore extends Record<string, any>, TAction extends keyof TStore>(
  store: TStore, 
  action: TAction,
  implementation?: (...args: any[]) => any
): MockInstance {
  // Implementation...
}
```

### Typdefinitionen für Tests

Die Datei `test-types.ts` enthält:

```typescript
// Test-Daten-Typen
export interface TestUser extends User {
  // Additional test properties...
}

// Factory-Funktionen für Test-Daten
export const createDefaultTestUser = (): TestUser => ({
  // Implementation...
});
```

## Empfehlungen für TypeScript in Tests

### 1. Verwenden von Typ-Extraktionen

Nutzen Sie die Typen aus dem Code, den Sie testen, anstatt Typen zu duplizieren:

```typescript
// Extrahieren der Typen aus dem Store
type SessionsState = ExtractState<typeof useSessionsStore>;
type SessionsGetters = ExtractGetters<typeof useSessionsStore>;
type SessionsActions = ExtractActions<typeof useSessionsStore>;
```

### 2. Typisierte Test-Fixtures

Definieren Sie Typen für Fixtures und verwenden Sie Factory-Funktionen:

```typescript
// Typisierte Factory-Funktion
const createMockSession = (overrides: Partial<MockSessionData> = {}): ChatSession => {
  const defaultSession: ChatSession = {
    // Default values...
  };
  
  return { ...defaultSession, ...overrides };
};
```

### 3. Typsichere Mocks

Verwenden Sie typsichere Mocks für externe Abhängigkeiten:

```typescript
// Typsicherer API-Response-Mock
vi.mocked(axios.get).mockResolvedValueOnce({
  data: createMockApiResponse<ChatSession[]>(createMockSessions(3))
});
```

### 4. Typ-Assertions

Überprüfen Sie Typen zur Laufzeit:

```typescript
// Objekt-Typ überprüfen
expect(typeof result).toBe('object');
expect(hasProperty(result, 'success')).toBe(true);

// Interface-Kompatibilität prüfen
const typedResult: Result<number, string> = result;
```

### 5. Generische Test-Funktionen

Schreiben Sie generische Test-Funktionen für Wiederverwendbarkeit:

```typescript
// Generische Testfunktion für verschiedene Store-Typen
function testStoreAction<T extends Record<string, any>>(
  store: T,
  actionName: keyof T,
  input: any,
  expectedOutput: any
) {
  const result = store[actionName](input);
  expect(result).toEqual(expectedOutput);
}
```

## Beispiele

### Komponententest

```typescript
import { typedMount } from '../utils/typescript-test-utils';
import Button from '@/components/ui/Button.vue';

describe('Button.vue', () => {
  it('renders with correct props', () => {
    const wrapper = typedMount(Button, {
      props: {
        variant: 'primary',
        size: 'medium'
      }
    });
    
    expect(wrapper.props().variant).toBe('primary');
  });
});
```

### Store-Test

```typescript
import { createSuccessResult, mockStoreAction } from '../utils/typescript-test-utils';
import { useAuthStore } from '@/stores/auth';

describe('AuthStore', () => {
  it('handles login success', async () => {
    const store = useAuthStore();
    
    // Typsicherer Mock
    mockStoreAction(store, 'validateToken', () => true);
    
    // Test mit typsicheren Daten
    const result = await store.login({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(result).toBe(true);
  });
});
```

### Composable-Test

```typescript
import { ref } from 'vue';
import { useElementSize } from '@/composables/useElementSize';
import { UseElementSizeReturn } from '@/utils/composableTypes';

describe('useElementSize', () => {
  it('returns correct interface', () => {
    const el = ref(null);
    const result = useElementSize(el);
    
    // Prüfen, ob die Rückgabe dem Interface entspricht
    const expected: UseElementSizeReturn = {
      width: expect.any(Object),
      height: expect.any(Object),
      updateSize: expect.any(Function)
    };
    
    expect(result).toMatchObject(expected);
  });
});
```

## Best Practices

1. **Typen zuerst definieren**: Definieren Sie Typen vor der Implementierung von Tests
2. **Verwendung von Factory-Funktionen**: Erstellen Sie Factory-Funktionen für Test-Daten
3. **Generische Test-Utilities**: Schreiben Sie wiederverwendbare, generische Test-Utilities
4. **Importieren Sie Typen aus dem Code**: Verwenden Sie `import type` für Typdefinitionen
5. **Deklarieren Sie Erwartungen explizit**: Nutzen Sie explizite Typdeklarationen für erwartete Werte
6. **Typ-Extraktionen nutzen**: Verwenden Sie Typ-Extraktionen, um Duplikationen zu vermeiden
7. **Vermeiden Sie `any`**: Minimieren Sie die Verwendung von `any` in Tests
8. **Auto-Mockend**: Erstellen Sie automatisch typsichere Mocks aus Schnittstellen
9. **Verwenden Sie Namespaces für Übersichtlichkeit**: Gruppieren Sie zusammengehörige Test-Utilities
10. **Dokumentieren Sie Typen**: Fügen Sie JSDoc-Kommentare zu Test-Typen hinzu

## Migration bestehender Tests

Für die Migration bestehender Tests zu TypeScript:

1. Ändern Sie die Dateierweiterung von `.js` zu `.ts`
2. Beheben Sie alle TypeScript-Fehler
3. Ersetzen Sie untypisierte Mocks durch typisierte Varianten
4. Fügen Sie Typdeklarationen zu Test-Fixtures hinzu
5. Verwenden Sie typsichere Assertions
6. Aktualisieren Sie Test-Helpers, um Typen zu unterstützen

## Typische Test-Szenarien

### API-Mocks

```typescript
import { createMockApiResponse, createSuccessResult } from '../utils/typescript-test-utils';

// Mock für API-GET-Anfrage
vi.mocked(axios.get).mockResolvedValueOnce({
  data: createMockApiResponse<User[]>([
    { id: '1', name: 'Test User', email: 'test@example.com' }
  ])
});

// Mock für Result-Rückgabe
const mockResult = createSuccessResult<number>(42);
```

### Komponenten-Props

```typescript
import { ComponentProps } from '../utils/typescript-test-utils';
import Button from '@/components/ui/Button.vue';

// Extrahieren der Prop-Typen aus der Komponente
type ButtonProps = ComponentProps<typeof Button>;

// Typsichere Props für Tests
const validProps: ButtonProps = {
  variant: 'primary',
  size: 'medium'
};
```

### Event-Handling

```typescript
import { typedMount } from '../utils/typescript-test-utils';
import Button from '@/components/ui/Button.vue';

// Typsicherer Event-Test
it('emits click event', async () => {
  const wrapper = typedMount(Button);
  
  await wrapper.trigger('click');
  
  // Typsichere Prüfung auf emit-Ereignisse
  expect(wrapper.emitted()).toHaveProperty('click');
  expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent);
});
```

## Häufig gestellte Fragen

### Wie kann ich interne Komponenten-Eigenschaften testen?

Verwenden Sie Typ-Assertions für den Zugriff auf private Eigenschaften:

```typescript
// Zugriff auf private Komponenten-Eigenschaften
const store = useSessionsStore();
const privateSymbol = Object.getOwnPropertySymbols(store)
  .find(sym => sym.description === 'privateProperty');

if (privateSymbol) {
  // Typsichere Assertion
  const value = store[privateSymbol] as number;
  expect(value).toBe(42);
}
```

### Wie teste ich asynchrone Funktionen?

Verwenden Sie typsichere async/await-Muster:

```typescript
// Typsicherer asynchroner Test
it('loads data asynchronously', async () => {
  const store = useDataStore();
  
  // Mock mit Typannotationen
  vi.mocked(axios.get).mockResolvedValueOnce({
    data: createMockApiResponse<DataType[]>([])
  });
  
  // Typsicherer asynchroner Aufruf
  const result = await store.loadData();
  
  // Typsichere Assertion
  expect(result.success).toBe(true);
  expect(Array.isArray(result.data)).toBe(true);
});
```

### Wie teste ich Vue-Komponenten mit TypeScript?

Verwenden Sie die `typedMount`-Funktion:

```typescript
import { typedMount } from '../utils/typescript-test-utils';
import MyComponent from '@/components/MyComponent.vue';

it('renders correctly', () => {
  // Typsicheres Mounting
  const wrapper = typedMount(MyComponent, {
    props: {
      message: 'Hello',
      count: 42
    }
  });
  
  // Typsichere Assertions
  expect(wrapper.props().message).toBe('Hello');
  expect(wrapper.props().count).toBe(42);
  
  // Typsicherer Zugriff auf emits
  expect(wrapper.emitted()).not.toHaveProperty('click');
});
```

## Fazit

Die Integration von TypeScript in Tests verbessert die Codequalität, reduziert Fehler und verbessert die Entwicklererfahrung. Durch die Verwendung typsicherer Utilities und die Befolgung der Best Practices können Tests robuster, wartbarer und selbstdokumentierender werden.