# Pinia Store Testing-Strategie für nscale DMS Assistent

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Testwerkzeuge und Technologien](#testwerkzeuge-und-technologien)
3. [Teststruktur und Organisation](#teststruktur-und-organisation)
4. [Mocken von Abhängigkeiten](#mocken-von-abhängigkeiten)
5. [Store-spezifische Teststrategien](#store-spezifische-teststrategien)
   - [Auth-Store](#auth-store)
   - [Sessions-Store](#sessions-store)
   - [UI-Store](#ui-store)
   - [DocumentConverter-Store](#documentconverter-store)
   - [FeatureToggles-Store](#featuretoggles-store)
6. [Store-übergreifende Tests](#store-übergreifende-tests)
7. [Testabdeckung und Metriken](#testabdeckung-und-metriken)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Beispielimplementierungen](#beispielimplementierungen)

## Einführung

Diese Teststrategiedokumentation beschreibt den umfassenden Ansatz für das Testen der Pinia-Stores im nscale DMS Assistenten. Der Fokus liegt darauf, zuverlässige, wartbare und aussagekräftige Tests zu entwickeln, die sowohl die korrekte Funktionalität der einzelnen Stores als auch deren Zusammenspiel sicherstellen.

### Ziele der Teststrategie

- **Funktionale Korrektheit**: Sicherstellen, dass alle Store-Funktionen wie erwartet arbeiten
- **Robustheit**: Testen von Edge-Cases und Fehlerszenarien
- **Regressionsprävention**: Verhindern, dass neue Änderungen vorhandene Funktionalität beeinträchtigen
- **Isolierte Komponententests**: Sicherstellen, dass Stores unabhängig voneinander funktionieren
- **Interaktionstests**: Überprüfen des korrekten Zusammenspiels zwischen Stores
- **Dokumentation**: Bereitstellung praktischer Beispiele für die Store-Nutzung

## Testwerkzeuge und Technologien

### Primäre Testing-Tools

- **Vitest**: Als primäres Test-Framework für die Pinia-Stores
- **JSDOM**: Für die Simulation einer Browser-Umgebung
- **MSW (Mock Service Worker)**: Für das Mocken von HTTP-Anfragen
- **@pinia/testing**: Für vereinfachtes Testing von Pinia-Stores
- **@vue/test-utils**: Für Tests, die mit Vue-Komponenten interagieren
- **vi (Vitest Mocking)**: Für das Erstellen von Spies und Mocks

### Hilfs-Tools

- **c8/Istanbul**: Für die Messung der Testabdeckung
- **ESLint-Testing-Plugins**: Für die Sicherstellung von Testqualität
- **@testing-library/jest-dom**: Für erweiterte DOM-Assertions

## Teststruktur und Organisation

Tests werden in einer spiegelnden Verzeichnisstruktur zu den Stores organisiert, um maximale Übersichtlichkeit zu gewährleisten:

```
/test/
  /stores/
    /auth.spec.ts          # Tests für auth.ts
    /sessions.spec.ts      # Tests für sessions.ts
    /ui.spec.ts            # Tests für ui.ts
    /documentConverter.spec.ts  # Tests für documentConverter.ts
    /admin/
      /users.spec.ts       # Tests für admin/users.ts
      /feedback.spec.ts    # Tests für admin/feedback.ts
    /integration/
      /auth-sessions.spec.ts  # Tests für Store-Interaktionen
    /__mocks__/            # Gemeinsame Mocks für Tests
      /axios.ts            # Axios-Mock für alle Tests
```

### Konventionen für Testdateien

- Der Dateiname sollte dem getesteten Store entsprechen und auf `.spec.ts` enden
- Ein Test-Setup für jeden Store, der in der Testdatei definiert ist
- Konsistente Beschreibungsstruktur mit `describe` und `it`
- Sinnvolle Gruppierung von Tests nach Funktionalität

### Test-Isolation und Mockumgebung

Für die Isolation und konsistente Testbarkeit von Stores:

1. **Store-Erstellung pro Test**: Erstellen einer frischen Store-Instanz für jeden Test
2. **State-Reset**: Zurücksetzen des Zustands nach jedem Test
3. **Mock-Plugins**: Bereitstellung von Mock-Plugins für Persistenz, Router, etc.
4. **Isolierte API-Mocks**: Spezifische API-Mocks pro Test oder Testgruppe

## Mocken von Abhängigkeiten

### API-Anfragen mocken

Axios-Anfragen werden mit vi.mock gemockt:

```typescript
// auth.spec.ts
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        success: true,
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com', roles: ['user'] }
      }
    });
  });

  it('sollte bei erfolgreicher Anmeldung den Benutzer setzen', async () => {
    // Test-Implementierung
  });
});
```

### Browser-APIs mocken

Für das Testen von Stores, die mit Browser-APIs interagieren:

```typescript
// ui.spec.ts
import { vi } from 'vitest';

// localStorage mocken
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

### Store-Abhängigkeiten mocken

Für das Testen von Stores, die andere Stores nutzen:

```typescript
// sessions.spec.ts
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';

// Mock für den Auth-Store
vi.mock('../src/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    token: 'mock-token',
    user: { id: '1', email: 'test@example.com', roles: ['user'] },
    createAuthHeaders: () => ({ Authorization: 'Bearer mock-token' })
  })
}));
```

## Store-spezifische Teststrategien

### Auth-Store

**Fokus-Bereiche:**
- Login/Logout-Funktionalität
- Token-Management (inkl. Refresh)
- Berechtigungsprüfung
- Persistenz
- Migration von Legacy-Daten

**Beispiel-Testfälle:**
1. Erfolgreicher Login mit korrekten Anmeldedaten
2. Fehlerhafter Login mit falschen Anmeldedaten
3. Automatische Token-Aktualisierung bei Ablauf
4. Korrekte Berechtigungsprüfung (hasRole, isAdmin)
5. Korrekte Migration von Legacy-Daten

### Sessions-Store

**Fokus-Bereiche:**
- Session-CRUD-Operationen
- Nachrichtenverwaltung
- Streaming-Funktionalität
- Offline-Unterstützung und Synchronisation
- Performance-Optimierungen (z.B. Paginierung)

**Beispiel-Testfälle:**
1. Erstellen einer neuen Session
2. Senden einer Nachricht in eine Session
3. Streaming-Verarbeitung mit Eventhandling
4. Speichern und Laden von Offline-Nachrichten
5. Automatische Synchronisation bei Wiederverbindung

### UI-Store

**Fokus-Bereiche:**
- Theme-Umschaltung (Dark/Light Mode)
- Responsive Layouts
- Toast- und Modal-Management
- Sidebar-Konfiguration
- CSS-Variablen-Generierung

**Beispiel-Testfälle:**
1. Korrekte Umschaltung des Dark Mode
2. Responsive Layout-Anpassungen bei Größenänderungen
3. Toast-Anzeige und automatische Entfernung
4. Modal-Öffnung und -Schließung
5. Korrekte Generierung von CSS-Variablen

### DocumentConverter-Store

**Fokus-Bereiche:**
- Upload-Prozess
- Konvertierungsstatus und -fortschritt
- Fehlerbehandlung
- Ergebnisverarbeitung

**Beispiel-Testfälle:**
1. Erfolgreicher Datei-Upload
2. Fortschritts-Tracking während der Konvertierung
3. Fehlerbehandlung bei ungültigen Dateien
4. Korrekte Darstellung von Konvertierungsergebnissen
5. Batch-Verarbeitung mehrerer Dateien

### FeatureToggles-Store

**Fokus-Bereiche:**
- Umschaltung von Features
- Persistenz von Feature-Einstellungen
- Berechtigungsbasierte Feature-Zugriffssteuerung
- Fallback-Mechanismen

**Beispiel-Testfälle:**
1. Aktivieren und Deaktivieren von Features
2. Persistenz von Feature-Einstellungen
3. Berechtigungsbasierte Zugriffssteuerung
4. Fallback-Aktivierung bei Fehlern

## Store-übergreifende Tests

Für das Testen von Store-Interaktionen:

```typescript
// integration/auth-sessions.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore } from '@/stores/sessions';

describe('Auth und Sessions Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet', async () => {
    const authStore = useAuthStore();
    const sessionsStore = useSessionsStore();
    
    // Eine Session mit pendenten Nachrichten erstellen
    await sessionsStore.createSession('Test-Session');
    
    // Mocken der Synchronisierungsmethode
    const syncSpy = vi.spyOn(sessionsStore, 'syncPendingMessages');
    
    // Login-Prozess simulieren
    await authStore.login({ email: 'test@example.com', password: 'password' });
    
    // Prüfen, ob Synchronisierung aufgerufen wurde
    expect(syncSpy).toHaveBeenCalled();
  });
});
```

## Testabdeckung und Metriken

Folgende Abdeckungsziele werden angestrebt:

| Store               | Angestrebte Abdeckung | Priorität  |
|---------------------|------------------------|------------|
| Auth-Store          | 95%                    | Hoch       |
| Sessions-Store      | 90%                    | Hoch       |
| UI-Store            | 85%                    | Mittel     |
| DocumentConverter   | 90%                    | Mittel     |
| FeatureToggles      | 85%                    | Mittel     |
| Admin-Stores        | 80%                    | Niedrig    |

### Abdeckungsmessung

Mit Vitest und c8 können detaillierte Abdeckungsberichte generiert werden:

```bash
npm run test:coverage
```

## CI/CD Integration

Die Tests werden in die CI/CD-Pipeline integriert:

1. **Pre-Commit-Hook**: Ausführen von Tests für geänderte Store-Dateien
2. **Pull-Request**: Vollständige Testausführung und Abdeckungsbericht
3. **Nightly Build**: Ausführung aller Tests mit ausführlichen Berichten

## Best Practices

### Allgemeine Test-Best-Practices

1. **Arrange-Act-Assert**: Klare Struktur in jedem Test
2. **Isolierte Tests**: Keine Abhängigkeiten zwischen Tests
3. **Beschreibende Namen**: Lesbare Testbeschreibungen
4. **Mocks minimieren**: Nur notwendige Abhängigkeiten mocken
5. **Edge Cases testen**: Auch ungewöhnliche Szenarien abdecken

### Store-spezifische Best Practices

1. **State-Initialisierung**: Immer mit einem frischen Store beginnen
2. **Action-Testing**: Actions einzeln und in Kombination testen
3. **Getter-Validierung**: Getter mit verschiedenen State-Zuständen testen
4. **Reaktivität prüfen**: Sicherstellen, dass reaktive Abhängigkeiten funktionieren
5. **Cleanup**: Mocks und Spies nach jedem Test zurücksetzen

## Beispielimplementierungen

### Grundlegendes Store-Test-Setup

```typescript
// auth.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    // Frischen Pinia-Store für jeden Test erstellen
    setActivePinia(createPinia());
    
    // Axios-Mocks zurücksetzen
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();
  });

  describe('login', () => {
    it('should set user and token on successful login', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: 'mock-token',
          user: { id: '1', email: 'user@example.com', roles: ['user'] }
        }
      });
      
      const store = useAuthStore();
      
      // Act
      const result = await store.login({
        email: 'user@example.com',
        password: 'password'
      });
      
      // Assert
      expect(result).toBe(true);
      expect(store.token).toBe('mock-token');
      expect(store.user).toEqual({ id: '1', email: 'user@example.com', roles: ['user'] });
      expect(store.isAuthenticated).toBe(true);
    });

    it('should handle login failure correctly', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Invalid credentials'
        }
      });
      
      const store = useAuthStore();
      
      // Act
      const result = await store.login({
        email: 'wrong@example.com',
        password: 'wrong'
      });
      
      // Assert
      expect(result).toBe(false);
      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
      expect(store.error).toBe('Invalid credentials');
      expect(store.isAuthenticated).toBe(false);
    });
  });
});
```

### Tests für Reaktivität

```typescript
// ui.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { nextTick } from 'vue';

describe('UI Store Reaktivität', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should update isDarkMode computed when darkMode changes', async () => {
    // Arrange
    const store = useUIStore();
    expect(store.isDarkMode).toBe(false);
    
    // Act
    store.darkMode = true;
    await nextTick();
    
    // Assert
    expect(store.isDarkMode).toBe(true);
  });
});
```

### Tests für Store-Persistenz

```typescript
// storage-mock.ts
export const mockLocalStorage = () => {
  let store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    __getStore: () => store,
    __setStore: (newStore) => { store = { ...newStore }; }
  };
};

// settings.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { mockLocalStorage } from './__mocks__/storage-mock';

describe('Settings Store Persistenz', () => {
  const localStorageMock = mockLocalStorage();
  
  beforeEach(() => {
    // Lokalen Speicher zurücksetzen
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Pinia mit Persist-Plugin einrichten
    const pinia = createPinia();
    setActivePinia(pinia);
  });

  it('should persist settings to localStorage when they change', async () => {
    // Arrange
    const store = useSettingsStore();
    
    // Act
    store.fontSize = 16;
    store.language = 'de';
    
    // Warten auf Persistenz
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Neuen Store erstellen, um Wiederherstellung zu testen
    setActivePinia(createPinia());
    const newStore = useSettingsStore();
    
    expect(newStore.fontSize).toBe(16);
    expect(newStore.language).toBe('de');
  });
});
```