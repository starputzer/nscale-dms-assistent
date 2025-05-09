# Pinia Store Testing Guide für nscale DMS Assistent

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Testumgebung einrichten](#testumgebung-einrichten)
3. [Grundlagen des Pinia-Store-Testings](#grundlagen-des-pinia-store-testings)
4. [Mocking-Strategien](#mocking-strategien)
5. [Store-spezifische Testansätze](#store-spezifische-testansätze)
6. [Testen von Store-Interaktionen](#testen-von-store-interaktionen)
7. [Testabdeckung und Best Practices](#testabdeckung-und-best-practices)
8. [Testausführung und Integration in CI/CD](#testausführung-und-integration-in-cicd)
9. [Beispiele und Codeauszüge](#beispiele-und-codeauszüge)
10. [Fehlerbehebung und häufige Probleme](#fehlerbehebung-und-häufige-probleme)

## Einführung

Diese Dokumentation bietet einen ausführlichen Leitfaden zum Testen von Pinia-Stores im nscale DMS Assistenten. Pinia-Stores sind ein zentraler Bestandteil der Vue 3-basierten Architektur und erfordern gründliche Tests, um die korrekte Funktionalität und Robustheit der Anwendung zu gewährleisten.

### Warum Pinia-Stores testen?

- **Zentrale Zustandsverwaltung**: Stores enthalten kritische Geschäftslogik und Anwendungszustände
- **Komponenten-übergreifende Funktionalität**: Fehler in Stores können weitreichende Auswirkungen haben
- **Komplexe Asynchronität**: Stores verwalten asynchrone Operationen und API-Kommunikation
- **Persistenz**: Stores sind verantwortlich für die Datenpersistenz und -migration

### Ziele der Store-Tests

- Verifizierung der korrekten Store-Initialisierung
- Überprüfung des reaktiven Verhaltens von State, Getters und Actions
- Validierung der Fehlerbehandlung und Edge Cases
- Sicherstellung der korrekten Interaktionen zwischen Stores

## Testumgebung einrichten

### Benötigte Abhängigkeiten

Für das Testen von Pinia-Stores werden folgende Werkzeuge verwendet:

```json
// Relevante Teile aus package.json
{
  "devDependencies": {
    "vitest": "^0.34.6",
    "jsdom": "^22.1.0",
    "@vue/test-utils": "^2.4.1"
  }
}
```

### Ordnerstruktur

Tests für Pinia-Stores sind wie folgt organisiert:

```
/test/
  /stores/
    /__setup__/          # Gemeinsame Test-Setups und Hilfsfunktionen
      testSetup.ts       # Zentrale Test-Konfiguration
    /integration/        # Tests für Store-Interaktionen
      store-interactions.spec.ts
    auth.spec.ts         # Tests für den Auth-Store
    sessions.spec.ts     # Tests für den Sessions-Store
    ui.spec.ts           # Tests für den UI-Store
    documentConverter.spec.ts  # Tests für den DocumentConverter-Store
    # ... weitere Store-Tests
```

### Test-Setup-Datei

Eine gemeinsame Setup-Datei sorgt für konsistente Testumgebungen:

```typescript
// /test/stores/__setup__/testSetup.ts
import { beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import axios from 'axios';

// Mock für Axios
vi.mock('axios');

// Mock für localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); })
  };
};

// Vor jedem Test ausgeführte Funktion
beforeEach(() => {
  // Pinia für jeden Test zurücksetzen
  setActivePinia(createPinia());
  
  // Mocks zurücksetzen
  vi.clearAllMocks();
  
  // localStorage und sessionStorage mocken
  vi.stubGlobal('localStorage', mockLocalStorage());
  vi.stubGlobal('sessionStorage', mockLocalStorage());
});
```

## Grundlagen des Pinia-Store-Testings

### Store-Initialisierung für Tests

In jedem Test sollte ein frischer Store initialisiert werden, um isolierte Tests zu ermöglichen:

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Pinia für jeden Test neu initialisieren
    setActivePinia(createPinia());
  });
  
  it('sollte mit Standardwerten initialisiert werden', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });
});
```

### Testen des State

Prüfe, ob der State korrekt initialisiert wird und auf Aktionen reagiert:

```typescript
it('sollte den Benutzer nach erfolgreichem Login setzen', async () => {
  // Arrange
  const store = useAuthStore();
  vi.mocked(axios.post).mockResolvedValueOnce({
    data: {
      success: true,
      token: 'mock-token',
      user: { id: '1', email: 'test@example.com' }
    }
  });
  
  // Act
  await store.login({ email: 'test@example.com', password: 'password' });
  
  // Assert
  expect(store.user).toEqual({ id: '1', email: 'test@example.com' });
  expect(store.token).toBe('mock-token');
});
```

### Testen von Getters

Reaktive Getter sollten auf State-Änderungen reagieren:

```typescript
it('sollte isAuthenticated korrekt berechnen', async () => {
  // Arrange
  const store = useAuthStore();
  expect(store.isAuthenticated).toBe(false);
  
  // Act
  store.token = 'mock-token';
  store.user = { id: '1', email: 'test@example.com' };
  
  // Assert
  expect(store.isAuthenticated).toBe(true);
});
```

### Testen von Actions

Tests für Actions sollten sowohl erfolgreiche als auch fehlerhafte Durchläufe abdecken:

```typescript
it('sollte bei fehlgeschlagenem Login einen Fehler setzen', async () => {
  // Arrange
  const store = useAuthStore();
  vi.mocked(axios.post).mockResolvedValueOnce({
    data: {
      success: false,
      message: 'Ungültige Anmeldedaten'
    }
  });
  
  // Act
  const result = await store.login({ email: 'test@example.com', password: 'password' });
  
  // Assert
  expect(result).toBe(false);
  expect(store.error).toBe('Ungültige Anmeldedaten');
  expect(store.isAuthenticated).toBe(false);
});
```

## Mocking-Strategien

### API-Anfragen mocken

Axios-Anfragen werden mit vi.mock gemockt:

```typescript
// auth.spec.ts
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
  });

  it('sollte einen Benutzer anmelden', async () => {
    // Mock für POST-Anfrage
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        success: true,
        token: 'mock-token',
        user: { id: '1', name: 'Test User' }
      }
    });
    
    // Test-Implementierung...
  });
});
```

### Browser-APIs mocken

Für Tests, die mit localStorage oder anderen Browser-APIs interagieren:

```typescript
// Mocks für Browser-APIs
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

vi.stubGlobal('localStorage', localStorageMock);

it('sollte Daten im localStorage speichern', async () => {
  // Arrange
  const store = useSettingsStore();
  
  // Act
  store.setTheme('dark');
  
  // Assert - Automatische Persistenz prüfen
  expect(localStorageMock.setItem).toHaveBeenCalledWith(
    expect.stringContaining('settings'), 
    expect.stringContaining('dark')
  );
});
```

### Datum und Zeit mocken

Um konsistente Zeitstempel in Tests zu gewährleisten:

```typescript
// Test-Setup
const mockDate = (isoDate: string) => {
  const date = new Date(isoDate);
  vi.spyOn(global.Date, 'now').mockReturnValue(date.getTime());
  return date;
};

it('sollte den Token-Ablaufzeitpunkt korrekt berechnen', () => {
  // Arrange
  const store = useAuthStore();
  mockDate('2023-01-01T12:00:00Z');
  
  // Act
  store.expiresAt = Date.now() + 3600 * 1000; // 1 Stunde
  
  // Assert
  expect(store.tokenExpiresIn).toBe(3600);
});
```

### Store-Abhängigkeiten mocken

Für das Testen von Stores, die andere Stores verwenden:

```typescript
// sessions.spec.ts
import { useAuthStore } from '@/stores/auth';

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    token: 'mock-token',
    user: { id: '1', email: 'test@example.com' },
    createAuthHeaders: () => ({ Authorization: 'Bearer mock-token' })
  }))
}));
```

## Store-spezifische Testansätze

### Auth-Store

Beim Testen des Auth-Stores sind folgende Aspekte besonders wichtig:

1. **Login/Logout-Funktionalität**
2. **Token-Management**
3. **Berechtigungsprüfung**
4. **Persistenz**

```typescript
// auth.spec.ts
describe('Auth Store', () => {
  describe('Login', () => {
    // Tests für Login-Funktionalität
  });
  
  describe('Token Management', () => {
    it('sollte abgelaufene Tokens erkennen', () => {
      // Test-Implementierung
    });
    
    it('sollte einen Token automatisch aktualisieren', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Berechtigungsprüfung', () => {
    it('sollte Rollen korrekt prüfen', () => {
      // Test-Implementierung
    });
  });
});
```

### Sessions-Store

Der Sessions-Store erfordert Tests für:

1. **Session-CRUD-Operationen**
2. **Nachrichtenverwaltung**
3. **Streaming-Funktionalität**
4. **Offline-Unterstützung**

```typescript
// sessions.spec.ts
describe('Sessions Store', () => {
  describe('Session-Verwaltung', () => {
    it('sollte eine neue Session erstellen', async () => {
      // Test-Implementierung
    });
    
    it('sollte eine Session aktualisieren', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Nachrichtenverwaltung', () => {
    it('sollte Nachrichten senden und empfangen', async () => {
      // Test-Implementierung
    });
    
    it('sollte mit Streaming-Antworten umgehen können', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Offline-Unterstützung', () => {
    it('sollte pendente Nachrichten speichern', async () => {
      // Test-Implementierung
    });
    
    it('sollte pendente Nachrichten synchronisieren', async () => {
      // Test-Implementierung
    });
  });
});
```

### UI-Store

UI-Store-Tests konzentrieren sich auf:

1. **Theme-Umschaltung**
2. **Sidebar-Konfiguration**
3. **Modal- und Toast-Verwaltung**
4. **Responsive Layout-Anpassungen**

```typescript
// ui.spec.ts
describe('UI Store', () => {
  describe('Theme', () => {
    it('sollte zwischen Light und Dark Mode wechseln', () => {
      // Test-Implementierung
    });
  });
  
  describe('Sidebar', () => {
    it('sollte die Sidebar öffnen und schließen', () => {
      // Test-Implementierung
    });
  });
  
  describe('Notifications', () => {
    it('sollte Toasts anzeigen und entfernen', () => {
      // Test-Implementierung
    });
  });
});
```

### DocumentConverter-Store

Der DocumentConverter-Store fokussiert sich auf:

1. **Upload-Prozess**
2. **Konvertierungsprozess**
3. **Fehlerbehandlung**
4. **Filterfunktionen**

```typescript
// documentConverter.spec.ts
describe('DocumentConverter Store', () => {
  describe('Upload', () => {
    it('sollte ein Dokument hochladen', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Konvertierung', () => {
    it('sollte ein Dokument konvertieren', async () => {
      // Test-Implementierung
    });
    
    it('sollte die Konvertierung abbrechen können', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Filterung', () => {
    it('sollte Dokumente nach Format filtern', () => {
      // Test-Implementierung
    });
  });
});
```

## Testen von Store-Interaktionen

### Grundlagen

Store-Interaktionstests prüfen das Zusammenspiel mehrerer Stores:

```typescript
// integration/store-interactions.spec.ts
describe('Store Interaktionen', () => {
  it('sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet', async () => {
    // Arrange
    const authStore = useAuthStore();
    const sessionsStore = useSessionsStore();
    
    // Synchronisations-Spy
    const syncSpy = vi.spyOn(sessionsStore, 'syncPendingMessages');
    
    // Act - Login durchführen
    await authStore.login({ email: 'test@example.com', password: 'password' });
    
    // Assert - Überprüfen, ob die Synchronisation aufgerufen wurde
    expect(syncSpy).toHaveBeenCalled();
  });
});
```

### Komplexe Workflows

Teste komplexe Abläufe über mehrere Stores hinweg:

```typescript
it('sollte den vollständigen Login-Workflow durchführen', async () => {
  // Arrange
  const authStore = useAuthStore();
  const uiStore = useUIStore();
  const sessionsStore = useSessionsStore();
  
  // Mocks für alle beteiligten API-Aufrufe
  
  // Act - Vollständigen Workflow ausführen
  // 1. Login
  await authStore.login({ email: 'test@example.com', password: 'password' });
  
  // 2. UI-Einstellungen anwenden
  if (authStore.user?.settings?.darkMode) {
    uiStore.enableDarkMode();
  }
  
  // 3. Sessions synchronisieren
  await sessionsStore.synchronizeSessions();
  
  // Assert - Überprüfen des Endzustands
  expect(authStore.isAuthenticated).toBe(true);
  expect(uiStore.darkMode).toBe(true);
  expect(sessionsStore.sessions.length).toBeGreaterThan(0);
});
```

### Aktionsverkettung

Tests für verkettete Aktionen über mehrere Stores:

```typescript
it('sollte bei API-Fehler einen Toast anzeigen', async () => {
  // Arrange
  const authStore = useAuthStore();
  const uiStore = useUIStore();
  
  // Mock für fehlgeschlagenen API-Aufruf
  vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
  
  // Spy auf UI-Toast-Methode
  const showErrorSpy = vi.spyOn(uiStore, 'showError');
  
  // Act
  try {
    await authStore.login({ email: 'test@example.com', password: 'password' });
  } catch (error) {
    // Fehlerbehandlung
    uiStore.showError('Login fehlgeschlagen: Netzwerkfehler');
  }
  
  // Assert
  expect(showErrorSpy).toHaveBeenCalledWith('Login fehlgeschlagen: Netzwerkfehler');
});
```

## Testabdeckung und Best Practices

### Empfohlene Testabdeckung

Angestrebte Testabdeckung für verschiedene Store-Typen:

| Store-Typ | Minimale Abdeckung | Ziel-Abdeckung | Priorität |
|-----------|-------------------|---------------|-----------|
| Auth      | 85%               | 95%           | Hoch      |
| Sessions  | 80%               | 90%           | Hoch      |
| UI        | 70%               | 85%           | Mittel    |
| DocumentConverter | 75% | 90% | Mittel |
| Admin-Stores | 70% | 80% | Niedrig |

### Best Practices

1. **Isolierte Tests**: Jeder Test sollte unabhängig von anderen Tests sein
2. **Arrange-Act-Assert**: Klare Struktur in jedem Test
3. **Mocks auf ein Minimum beschränken**: Nur notwendige Abhängigkeiten mocken
4. **Edge Cases testen**: Auch ungewöhnliche Szenarien abdecken
5. **Beschreibende Namen**: Aussagekräftige Test-Beschreibungen verwenden

### Anti-Patterns vermeiden

1. **Übermäßiges Mocken**: Zu viele Mocks können die Aussagekraft der Tests verringern
2. **Test-Abhängigkeiten**: Tests sollten nicht voneinander abhängen
3. **Globaler Zustand**: Vermeiden von globalen Test-Fixtures
4. **Zu wenig Assertions**: Zu oberflächliche Tests ohne aussagekräftige Überprüfungen
5. **Zu komplexe Tests**: Tests sollten einzelne Funktionalitäten prüfen, nicht komplette Workflows

## Testausführung und Integration in CI/CD

### Testausführung

Tests können wie folgt ausgeführt werden:

```bash
# Alle Tests ausführen
npm run test

# Nur Store-Tests ausführen
npm run test -- -t "stores"

# Tests im Watch-Modus ausführen
npm run test:watch

# Testabdeckung messen
npm run test:coverage
```

### CI/CD-Integration

In der CI/CD-Pipeline sollten Tests automatisch ausgeführt werden:

```yaml
# Beispiel für GitHub Actions
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run test
      - run: npm run test:coverage
      # Optional: Abdeckungsbericht hochladen
      - uses: codecov/codecov-action@v2
```

## Beispiele und Codeauszüge

### Vollständige Beispiele

#### Auth-Store-Test

```typescript
// Beispiel für Auth-Store-Test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(axios.post).mockReset();
  });

  describe('Login', () => {
    it('sollte bei erfolgreicher Anmeldung den Benutzer setzen', async () => {
      // Arrange
      const store = useAuthStore();
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: 'mock-token',
          user: { id: '1', email: 'test@example.com', roles: ['user'] }
        }
      });
      
      // Act
      const result = await store.login({ 
        email: 'test@example.com', 
        password: 'password' 
      });
      
      // Assert
      expect(result).toBe(true);
      expect(store.token).toBe('mock-token');
      expect(store.user).toEqual({ id: '1', email: 'test@example.com', roles: ['user'] });
      expect(store.isAuthenticated).toBe(true);
    });
  });
});
```

#### UI-Store-Test

```typescript
// Beispiel für UI-Store-Test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '@/stores/ui';

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('document', {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        },
        setAttribute: vi.fn()
      }
    });
  });

  describe('Dark Mode', () => {
    it('sollte den Dark Mode umschalten', () => {
      // Arrange
      const store = useUIStore();
      expect(store.darkMode).toBe(false);
      
      // Act
      store.toggleDarkMode();
      
      // Assert
      expect(store.darkMode).toBe(true);
      expect(store.isDarkMode).toBe(true);
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });
});
```

#### Store-Interaktionstest

```typescript
// Beispiel für Store-Interaktionstest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore } from '@/stores/sessions';

describe('Store Interaktionen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sollte Sessions nach erfolgreichem Login synchronisieren', async () => {
    // Arrange
    const authStore = useAuthStore();
    const sessionsStore = useSessionsStore();
    
    // Login-Mock
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        success: true,
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com' }
      }
    });
    
    // Sessions-Sync-Spy
    const syncSpy = vi.spyOn(sessionsStore, 'synchronizeSessions');
    syncSpy.mockResolvedValue();
    
    // Act
    await authStore.login({ email: 'test@example.com', password: 'password' });
    
    // Sessions manuell synchronisieren (in einer realen Anwendung könnte dies
    // durch einen watch-Effekt automatisch geschehen)
    if (authStore.isAuthenticated) {
      await sessionsStore.synchronizeSessions();
    }
    
    // Assert
    expect(authStore.isAuthenticated).toBe(true);
    expect(syncSpy).toHaveBeenCalled();
  });
});
```

## Fehlerbehebung und häufige Probleme

### Häufige Testprobleme und Lösungen

1. **Reaktivität in Tests funktioniert nicht**
   - Problem: Änderungen an reaktiven Werten werden nicht erkannt
   - Lösung: `await nextTick()` verwenden, um auf Vue-Reaktivitätsupdates zu warten

2. **Asynchrone Tests schlagen fehl**
   - Problem: Tests beenden sich, bevor asynchrone Operationen abgeschlossen sind
   - Lösung: Immer `async/await` für asynchrone Tests verwenden und alle Promises auflösen

3. **Mocks werden nicht zurückgesetzt**
   - Problem: Mock-Daten bleiben zwischen Tests bestehen
   - Lösung: `vi.mocked(fn).mockReset()` in `beforeEach()` verwenden

4. **Store-Zustand bleibt zwischen Tests bestehen**
   - Problem: Store-Änderungen beeinflussen nachfolgende Tests
   - Lösung: `setActivePinia(createPinia())` in jedem Test aufrufen

5. **Fehlende Testabdeckung für computed-Werte**
   - Problem: Computed-Eigenschaften werden nicht vollständig getestet
   - Lösung: Verschiedene State-Kombinationen erstellen und jede berechnete Eigenschaft testen

### Debugging von Store-Tests

Tipps zum Debuggen von Store-Tests:

```typescript
// Debug-Ausgaben in Tests hinzufügen
it('sollte einen komplexen Zustand korrekt verwalten', async () => {
  const store = useComplexStore();
  
  // Debug-Ausgabe vor der Aktion
  console.log('Vor der Aktion:', store.$state);
  
  await store.complexAction();
  
  // Debug-Ausgabe nach der Aktion
  console.log('Nach der Aktion:', store.$state);
  
  expect(store.result).toBe(expected);
});
```

Nutze `vi.spyOn()` für tieferes Debugging:

```typescript
// Funktion überwachen, die intern aufgerufen wird
const processDataSpy = vi.spyOn(helpers, 'processData');

await store.action();

// Überprüfen, wie die Funktion aufgerufen wurde
console.log('processData wurde aufgerufen mit:', processDataSpy.mock.calls);
```

## Zusammenfassung

Das Testen von Pinia-Stores ist ein entscheidender Bestandteil der Qualitätssicherung im nscale DMS Assistenten. Durch gut strukturierte, gründliche Tests können wir die Zuverlässigkeit und Wartbarkeit unserer Stores gewährleisten, insbesondere während der Migration von Vanilla JavaScript zu Vue 3 SFC.

Folge diesen Richtlinien, um hochwertige Tests zu erstellen, die zur langfristigen Stabilität und Codequalität des Projekts beitragen.

---

Erstellt: Mai 2025  
Letzte Aktualisierung: Mai 2025  
Autor: Claude Code