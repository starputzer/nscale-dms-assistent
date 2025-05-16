# Debugging des Pure Vue Mode

Diese Dokumentation bietet Anleitungen zur Fehlersuche und -behebung im Pure Vue Mode.

## Häufige Probleme und Lösungen

### 1. Weißer Bildschirm nach dem Laden

**Symptom:** Die Anwendung zeigt einen leeren, weißen Bildschirm an.

**Mögliche Ursachen und Lösungen:**

#### a) Fehlende globale Funktionen

Die Fehlermeldung `TypeError: isSourceReferencesVisible is not a function` weist darauf hin, dass eine globale Funktion fehlt, die vom Legacy-Code erwartet wird.

**Lösung:**
- Überprüfen Sie, ob der `mockServiceProvider` korrekt injiziert wird
- Überprüfen Sie die Browser-Konsole auf spezifische Fehlermeldungen
- Stellen Sie sicher, dass alle erforderlichen globalen Funktionen im `mockServiceProvider` definiert sind

#### b) Probleme mit der Dependency Injection

**Lösung:**
- Überprüfen Sie, ob alle erforderlichen Services korrekt injiziert werden
- Fügen Sie explizite Fehlerbehandlung für fehlende Services hinzu:

```typescript
const chatService = inject('chatService') || {
  // Fallback-Implementierung
  sendMessage: () => console.error('Chat-Service nicht verfügbar')
};
```

### 2. API-Endpunkte werden nicht gemockt

**Symptom:** Es werden weiterhin Anfragen an den realen Backend-Server gesendet.

**Lösungen:**
- Stellen Sie sicher, dass der URL-Parameter `mockApi=true` gesetzt ist
- Überprüfen Sie die Network-Tabelle der Browser-Developer-Tools
- Überprüfen Sie, ob der `MockChatService` korrekt initialisiert wurde
- Fügen Sie für fehlende Mock-Endpunkte neue Methoden zum Mock-Service hinzu

### 3. Source References funktionieren nicht

**Symptom:** Source-References werden nicht angezeigt oder verursachen Fehler.

**Lösungen:**
- Stellen Sie sicher, dass die Source-References-Funktionen im `window`-Objekt registriert sind
- Überprüfen Sie, ob die Source-References-Komponente die richtigen Daten erhält
- Überprüfen Sie, ob die Nachrichtenobjekte das erwartete Format haben

### 4. Bridge-Initialisierungsprobleme

**Symptom:** Fehler wie `Bridge is not defined` oder `Cannot read property of undefined`.

**Lösungen:**
- Wenn Sie im Pure Vue Mode arbeiten, sollten Bridge-bezogene Funktionen deaktiviert sein
- Überprüfen Sie, ob die bedingte Bridge-Initialisierung in `main.ts` korrekt funktioniert
- Für die Verwendung der Bridge setzen Sie den URL-Parameter `useBridge=true`

## Debugging-Werkzeuge und -Techniken

### 1. Pure Mode Indicator

Der Pure Mode Indicator zeigt den aktuellen Modus der Anwendung an:
- **PURE VUE MODE (grün):** Läuft im Pure Vue Mode mit Mock-Services
- **BRIDGE MODE (blau):** Läuft im Legacy-Bridge-Modus

Ein Klick auf den Indikator wechselt zwischen den Modi.

### 2. Konsolen-Logging

Der `mockServiceProvider` und die Mock-Services enthalten umfangreiches Logging:

```typescript
console.log('[Mock] isSourceReferencesVisible called', message);
```

### 3. Vue DevTools

Die Vue DevTools bieten nützliche Einblicke in den Zustand der Anwendung:
- Überprüfen Sie die komponentenbasierten Daten und Props
- Überprüfen Sie die Pinia-Stores
- Untersuchen Sie die Komponentenhierarchie

### 4. Network-Monitor

In der Network-Tabelle der Browser-Developer-Tools können Sie überprüfen:
- Ob API-Anfragen abgefangen werden
- Ob Anfragen an den Mock-Service weitergeleitet werden
- Ob es blockierte Anfragen gibt

## Erweiterte Debugging-Tipps

### 1. Manuelles Testing der Mock-Services

```javascript
// In der Browser-Konsole
const chatService = window.$chatService;
chatService.sendMessage('Test', '1').then(console.log);
```

### 2. State-Inspektion

```javascript
// In der Browser-Konsole
// Prüfen des Source-References-Zustands
console.log(window.__sourceReferencesComposable);
```

### 3. Manuelles Registrieren fehlender Funktionen

Falls bestimmte Funktionen fehlen, können Sie diese manuell in der Browser-Konsole definieren:

```javascript
// Notlösung für fehlende Funktionen
window.isSourceReferencesVisible = (message) => false;
```

## Häufige Fehler im Code

### 1. Inkonsistente Nachrichtenformate

Achten Sie auf Unterschiede in den Nachrichtenstrukturformaten zwischen verschiedenen Teilen der Anwendung:

```javascript
// Format 1 (Legacy)
const legacyMessage = {
  id: '123',
  text: 'Inhalt', // Beachten Sie "text" statt "content"
  is_user: true   // Beachten Sie "is_user" statt "role"
};

// Format 2 (Neu)
const newMessage = {
  id: '123',
  content: 'Inhalt',
  role: 'user'
};
```

### 2. Fehlende Types

Fügen Sie angemessene Typdeklarationen in `globals.d.ts` hinzu, um TypeScript-Fehler zu vermeiden.

### 3. Bridge-Abhängigkeiten im Code

Suchen und beheben Sie direkte Abhängigkeiten vom Bridge-System im Code:

```typescript
// Problematisch (direkte Bridge-Abhängigkeit)
const sessions = Bridge.getSessions();

// Besser (Dependency Injection)
const chatService = inject('chatService');
const sessions = chatService.getSessions();
```

## Schritte zur Behebung des "isSourceReferencesVisible is not a function"-Fehlers

1. Überprüfen Sie, ob der `mockServiceProvider` korrekt registriert ist
2. Stellen Sie sicher, dass die globale Funktion `isSourceReferencesVisible` im `window`-Objekt definiert ist
3. Überprüfen Sie, ob `window.__sourceReferencesComposable` korrekt definiert ist
4. Kontrollieren Sie, wie die Funktion vom Legacy-Code aufgerufen wird
5. Fügen Sie zusätzliche Logging-Statements hinzu, um den genauen Fehlerort zu identifizieren