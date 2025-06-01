# Test-Strategie für nScale DMS Assistent

Dieses Dokument beschreibt die umfassende Test-Strategie für den nScale DMS Assistenten, einschließlich Testtypen, -umfang, -werkzeuge und bewährter Methoden, die während des gesamten Entwicklungsprozesses zu befolgen sind.

## 1. Übersicht

Die Test-Strategie des nScale DMS Assistenten ist darauf ausgerichtet, die Qualität, Zuverlässigkeit und Robustheit der Anwendung durch eine Kombination verschiedener Testebenen zu gewährleisten. Unsere Strategie berücksichtigt sowohl die aktuelle Vanilla-JavaScript-Implementierung als auch die laufende Migration zu Vue 3 Single-File-Components (SFC).

### Ziele

- Sicherstellen der funktionalen Korrektheit aller Komponenten
- Erhalt der Stabilität während der Migration zu Vue 3 SFC
- Erleichterung der kontinuierlichen Integration und Bereitstellung
- Verbesserung der Code-Qualität und Wartbarkeit
- Vermeidung von Regressionen bei neuen Funktionen oder Bugfixes

## 2. Testebenen

### 2.1 Unit-Tests

Unit-Tests konzentrieren sich auf die Überprüfung der kleinsten testbaren Teile der Anwendung in Isolation.

#### Vanilla JavaScript

- **Framework:** Vitest mit JSDOM
- **Fokus:** Funktionen und Module in chat.js, app.js, document-converter-service etc.
- **Mocking:** Externe Abhängigkeiten wie axios, EventSource, localStorage
- **Organisation:** Modulare Struktur im Verzeichnis `test/vanilla/`

#### Vue 3 Komponenten

- **Framework:** Vitest mit Vue Test Utils
- **Fokus:** Vue-Komponenten, Komposition-APIs, Pinia-Stores
- **Mocking:** Externe Services, APIs und Store-Zustände
- **Organisation:** Komponententests innerhalb der `test/components/` Struktur

### 2.2 Integrationstests

Integrationstests überprüfen die Interaktion zwischen verschiedenen Modulen oder Komponenten.

- **Bereich:** Interactions zwischen Services, Komponenten und Stores
- **Beispiele:**
  - Dokumentenkonverter-Workflow-Tests
  - Streaming-Chat-zu-Session-Interaktionen
  - Feature-Toggle-System mit UI-Rendering

### 2.3 End-to-End-Tests (E2E)

E2E-Tests simulieren reale Benutzerinteraktionen mit der Anwendung.

- **Framework:** Cypress oder Playwright (noch zu implementieren)
- **Bereich:** Vollständige Benutzerflüsse wie Anmeldung, Chat-Unterhaltungen, Dokumentkonvertierung
- **Priorität:** Kritische Geschäftsprozesse und häufig verwendete Funktionen

### 2.4 Visuelle Regressionstests

- **Ziel:** Erkennung unbeabsichtigter UI-Änderungen
- **Werkzeug:** Storybook mit Chromatic oder ähnliches (geplant)
- **Bereich:** UI-Komponenten und Layouts

## 3. Testpraktiken

### 3.1 Test-Driven Development (TDD)

Für neue Komponenten und Funktionen wird empfohlen, einen testgetriebenen Ansatz zu verfolgen:

1. Schreiben der Tests vor der Implementierung
2. Implementieren der minimalen Funktionalität, um die Tests zu bestehen
3. Refactoring des Codes bei Beibehaltung der bestandenen Tests

### 3.2 Mocking-Strategien

- **API-Mocks:** Konsistente Simulation von Backend-Endpunkten
- **Service-Mocks:** Ersatz realer Services durch Testdoubles
- **DOM-Mocks:** Simulation von Browserfunktionen über JSDOM
- **Event-Mocks:** Nachbildung von Benutzerinteraktionen und Systemereignissen

### 3.3 Code-Qualität

Tests sollten zur Sicherstellung der Codequalität beitragen:

- **Linting:** ESLint-Regeln für Tests
- **Abdeckungsmessung:** Verwendung von c8/Istanbul für Abdeckungsberichte
- **Refactoring:** Tests als Sicherheitsnetz für Code-Verbesserungen

## 4. Testumgebungen

### 4.1 Lokale Entwicklung

- `npm run test`: Ausführen aller Tests
- `npm run test:watch`: Kontinuierliche Testausführung während der Entwicklung
- `npm run test:vanilla`: Nur Vanilla-JS-Tests ausführen
- `npm run test:coverage`: Generieren von Abdeckungsberichten

### 4.2 Continuous Integration

- Automatisierte Testausführung bei Pull-Requests
- Blockieren von Merges bei fehlgeschlagenen Tests
- Regelmäßige Abdeckungsberichte

## 5. Testabdeckungsziele

| Komponente | Aktuell | Ziel | Zeitrahmen |
|------------|---------|------|------------|
| Chat-Funktionalität | ~85% | 95% | Q3 2023 |
| Session-Management | ~80% | 90% | Q3 2023 |
| Dokumentenkonverter | ~75% | 90% | Q4 2023 |
| Vue-Komponenten | variiert | 85% | Q1 2024 |
| E2E-Abdeckung | 0% | 60% | Q2 2024 |

## 6. Testdokumentation

Jede Testsuite sollte angemessen dokumentiert sein:

- **Beschreibung:** Was wird getestet und warum
- **Abdeckung:** Welche Aspekte werden abgedeckt
- **Setup:** Notwendige Voraussetzungen und Mocks
- **Edge Cases:** Berücksichtigte Grenzfälle
- **Lücken:** Bekannte ungetestete Szenarien

## 7. Spezifische Testmuster

### 7.1 Async/Stream Tests

Für asynchrone und Stream-basierte Funktionalitäten:

```javascript
describe('Stream-Funktionalität', () => {
  it('verarbeitet Events korrekt', async () => {
    // Mock-Setup
    const mockEventSource = createMockEventSource();
    
    // Funktionsaufruf
    const promise = startStream(options);
    
    // Event-Simulation
    mockEventSource.emit('message', { data: 'test' });
    mockEventSource.emit('done');
    
    // Ergebnis überprüfen
    const result = await promise;
    expect(result).toEqual(expected);
  });
});
```

### 7.2 Komponententests

Für Vue-Komponententests:

```javascript
describe('MyComponent', () => {
  it('rendert korrekt mit Props', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' }
    });
    
    expect(wrapper.find('.title').text()).toBe('Test');
  });
  
  it('emittiert Event bei Klick', async () => {
    const wrapper = mount(MyComponent);
    
    await wrapper.find('button').trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
```

### 7.3 Service-Tests

Für Service-Tests:

```javascript
describe('ApiService', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });
  
  it('verarbeitet erfolgreiche Anfragen', async () => {
    axios.get.mockResolvedValue({ data: { result: 'success' } });
    
    const result = await apiService.fetchData();
    
    expect(result).toEqual({ result: 'success' });
    expect(axios.get).toHaveBeenCalledWith('/api/data');
  });
  
  it('behandelt Fehler', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));
    
    await expect(apiService.fetchData()).rejects.toThrow('Network Error');
  });
});
```

## 8. Migration und Vue 3

Während der Migration zu Vue 3 SFC sind spezielle Testüberlegungen zu beachten:

1. **Doppelte Abdeckung:** Vorübergehend sowohl Vanilla-JS als auch Vue-Komponenten testen
2. **Funktionale Äquivalenz:** Sicherstellen, dass Vue-Komponenten die gleiche Funktionalität wie ihre Vanilla-Gegenstücke bieten
3. **Komponenteninteraktionen:** Testen der Interoperabilität zwischen Vue- und Vanilla-Komponenten
4. **Feature-Toggles:** Testen von Feature-Toggle-Mechanismen zur Aktivierung neuer Komponenten

## 9. Leitfaden zur Fehlerdiagnose

- **Flaky Tests:** Tests, die unzuverlässig bestanden/fehlschlagen, identifizieren und reparieren
- **Debug-Informationen:** Ausreichende Logs und Debugging-Informationen für fehlgeschlagene Tests bereitstellen
- **Isolierung:** Probleme durch Isolierung der Testumgebung und der Abhängigkeiten eingrenzen

## 10. Kontinuierliche Verbesserung

Die Test-Strategie wird kontinuierlich verbessert:

- Regelmäßige Überprüfung der Testabdeckung
- Identifizierung von Schwachstellen und Lücken
- Updates der Test-Tools und -Frameworks
- Aufnahme neuer Testmuster und Best Practices

---

Diese Test-Strategie dient als Leitfaden für das Entwicklungsteam, um eine robuste, zuverlässige Anwendung während des gesamten Lebenszyklus des nScale DMS Assistenten zu gewährleisten, insbesondere während der kritischen Migration von Vanilla JavaScript zu Vue 3 SFC.