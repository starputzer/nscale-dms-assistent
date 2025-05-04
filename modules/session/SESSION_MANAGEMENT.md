# Sitzungsverwaltung

## Übersicht

Das Sitzungsverwaltungssystem des nscale DMS Assistent ist verantwortlich für die Organisation und Speicherung von Chat-Verläufen, Nutzerpräferenzen und Benutzerinteraktionen. Es besteht aus zwei Hauptkomponenten: dem serverseitigen `ChatHistoryManager` und dem clientseitigen `sessionStore` für die Vue.js-Implementierung.

## Serverkomponente: ChatHistoryManager

Der `ChatHistoryManager` ist die zentrale Komponente zur Verwaltung von Chat-Sitzungen auf dem Server:

### Funktionen

1. **Sitzungserstellung und -verwaltung**:
   - Erstellen neuer Chat-Sitzungen
   - Zuordnung von Sitzungen zu Benutzern
   - Automatische Generierung von Sitzungstiteln

2. **Nachrichtenspeicherung**:
   - Persistente Speicherung aller Nachrichten
   - Zuordnung zu Sitzungen
   - Erfassung von Metadaten (Zeitstempel, Typ, etc.)

3. **Abfrage und Filterung**:
   - Abrufen aller Sitzungen eines Benutzers
   - Abrufen aller Nachrichten einer Sitzung
   - Filterung nach verschiedenen Kriterien

### Datenmodell

```
+----------------+       +----------------+
| Sessions       |<----->| Messages       |
+----------------+       +----------------+
| id             |       | id             |
| user_id        |       | session_id     |
| title          |       | role           |
| created_at     |       | content        |
| updated_at     |       | created_at     |
| is_active      |       | has_feedback   |
+----------------+       +----------------+
```

### Hauptmethoden

```python
def create_session(self, user_id: int, title: Optional[str] = None) -> int:
    """Erstellt eine neue Chat-Sitzung für einen Benutzer"""
    # Erstellt eine neue Sitzung mit einem Titel
    # Gibt die ID der neuen Sitzung zurück

def add_message(self, session_id: int, role: str, content: str) -> int:
    """Fügt eine Nachricht zu einer Sitzung hinzu"""
    # Speichert eine neue Nachricht in der Datenbank
    # Aktualisiert updated_at der Sitzung
    # Gibt die ID der neuen Nachricht zurück

def get_session_messages(self, session_id: int) -> List[Dict[str, Any]]:
    """Gibt alle Nachrichten einer Sitzung zurück"""
    # Lädt alle Nachrichten einer Sitzung
    # Sortiert nach Erstellungszeitpunkt

def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
    """Gibt alle Sitzungen eines Benutzers zurück"""
    # Lädt alle Sitzungen eines Benutzers
    # Sortiert nach letzter Aktualisierung
```

## Clientkomponente: sessionStore

Der `sessionStore` ist ein Pinia-Store, der die clientseitige Sitzungsverwaltung in der Vue.js-Implementierung übernimmt:

### Funktionen

1. **Datensynchronisation**:
   - Abrufen von Sitzungen vom Server
   - Lokale Speicherung und Verwaltung
   - Regelmäßige Aktualisierung

2. **Sitzungsinteraktionen**:
   - Erstellen neuer Sitzungen
   - Umbenennen von Sitzungen
   - Löschen von Sitzungen

3. **Nachrichtenverwaltung**:
   - Anzeige von Nachrichtenverläufen
   - Hinzufügen neuer Nachrichten
   - Streaming-Unterstützung für Echtzeit-Antworten

### Store-Struktur

```javascript
// Zustandsverwaltung
const state = () => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  error: null,
  messages: {},
  pollingInterval: null
})

// Getters
const getters = {
  currentSession: (state) => state.sessions.find(s => s.id === state.currentSessionId),
  currentMessages: (state) => state.messages[state.currentSessionId] || [],
  // ...
}

// Aktionen
const actions = {
  async fetchSessions() { /* Lädt alle Sitzungen vom Server */ },
  async createSession(title) { /* Erstellt eine neue Sitzung */ },
  async deleteSession(sessionId) { /* Löscht eine Sitzung */ },
  async sendMessage(message) { /* Sendet eine Nachricht und empfängt Antwort */ },
  // ...
}
```

## API-Endpunkte

Die Kommunikation zwischen Client und Server erfolgt über folgende API-Endpunkte:

| Endpunkt | Methode | Funktion | Beschreibung |
|----------|---------|----------|-------------|
| `/api/sessions` | GET | `get_sessions` | Gibt alle Sitzungen des Benutzers zurück |
| `/api/sessions` | POST | `create_session` | Erstellt eine neue Sitzung |
| `/api/sessions/{session_id}` | GET | `get_session` | Gibt Details einer Sitzung zurück |
| `/api/sessions/{session_id}/messages` | GET | `get_session_messages` | Gibt alle Nachrichten einer Sitzung zurück |
| `/api/sessions/{session_id}/rename` | POST | `rename_session` | Benennt eine Sitzung um |
| `/api/sessions/{session_id}` | DELETE | `delete_session` | Löscht eine Sitzung |
| `/api/chat` | POST | `chat` | Sendet eine Nachricht und erhält eine Antwort |

## Titelgenerierung

Eine besondere Funktion des Sitzungsmanagements ist die automatische Generierung von Titeln für neue Sitzungen:

```python
async def generate_title(self, session_id: int, first_message: str) -> str:
    """Generiert einen Titel für eine Sitzung basierend auf der ersten Nachricht"""
    # Kurze Zusammenfassung der ersten Nachricht erstellen
    # Maximale Länge von 50 Zeichen
    # Spezialzeichen entfernen
    return title
```

## Integration mit Feedback-System

Das Sitzungsmanagement ist mit dem Feedback-System verbunden, um Benutzerrückmeldungen zu Antworten zu erfassen:

```python
def add_feedback(self, message_id: int, feedback_type: str, comment: Optional[str] = None) -> bool:
    """Fügt Feedback zu einer Nachricht hinzu"""
    # Speichert Feedback (positiv/negativ)
    # Aktualisiert has_feedback-Flag der Nachricht
    # Optional: Speichert einen Kommentar
```

## Mobile Synchronisation

Die Sitzungsverwaltung unterstützt die Synchronisation zwischen verschiedenen Geräten:

1. **Regelmäßiges Polling**: Der Client fragt in regelmäßigen Abständen nach Änderungen
2. **Optimierte Übertragung**: Nur neue oder geänderte Daten werden übertragen
3. **Konflikterkennung**: Mechanismen zur Erkennung und Auflösung von Konflikten

```javascript
// Im Vue.js sessionStore
startPolling() {
  this.pollingInterval = setInterval(async () => {
    await this.checkForUpdates();
  }, 30000); // Alle 30 Sekunden prüfen
},

async checkForUpdates() {
  // Zeitstempel der letzten Aktualisierung senden
  // Nur neue oder geänderte Sitzungen und Nachrichten empfangen
}
```

## Optimierungen

Das Sitzungsmanagement enthält mehrere Optimierungen für Leistung und Benutzererfahrung:

1. **Lazy Loading**:
   - Nachrichten werden nur für die aktive Sitzung geladen
   - Pagination für Sitzungen mit vielen Nachrichten

2. **Caching**:
   - Clientseitiges Caching von Sitzungen und Nachrichten
   - Vermeidung redundanter Serveranfragen

3. **Batch-Operationen**:
   - Gruppierung mehrerer Operationen zu einer Serveranfrage
   - Reduzierung der Netzwerklast

## Vue.js Komponenten

Das Frontend verwendet folgende Vue-Komponenten für die Sitzungsverwaltung:

1. **SessionList.vue**:
   - Zeigt eine Liste aller Sitzungen an
   - Ermöglicht Filtern und Sortieren
   - Kontextmenü für Aktionen (Umbenennen, Löschen)

2. **ChatInterface.vue**:
   - Zeigt den Nachrichtenverlauf an
   - Eingabefeld für neue Nachrichten
   - Streaming-Darstellung von Antworten

3. **SessionControls.vue**:
   - Buttons zum Erstellen neuer Sitzungen
   - Filteroptionen
   - Exportfunktionalität

## Implementierungsbeispiele

### Serverseitige Implementation

```python
# In der server.py API
@app.post("/api/sessions")
async def create_session(request: SessionCreateRequest, current_user: dict = Depends(get_current_user)):
    """Erstellt eine neue Chat-Session"""
    session_id = chat_history.create_session(current_user['user_id'], request.title)
    
    # Erste Systemanweisung hinzufügen
    chat_history.add_message(
        session_id=session_id,
        role="system",
        content="Ich bin ein Assistent für das nscale DMS-System."
    )
    
    return {"session_id": session_id}
```

### Clientseitige Implementation

```javascript
// Im Vue.js sessionStore
export default defineStore('session', {
  state: () => ({
    sessions: [],
    currentSessionId: null,
    // ...
  }),
  
  actions: {
    async createSession(title = null) {
      this.isLoading = true;
      
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({ title })
        });
        
        if (!response.ok) throw new Error('Fehler beim Erstellen der Sitzung');
        
        const data = await response.json();
        const newSessionId = data.session_id;
        
        // Neue Sitzung sofort zur Liste hinzufügen
        this.sessions.unshift({
          id: newSessionId,
          title: title || 'Neue Unterhaltung',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Zur neuen Sitzung wechseln
        this.setCurrentSession(newSessionId);
        
        return newSessionId;
      } catch (error) {
        this.error = error.message;
        console.error('Fehler beim Erstellen der Sitzung:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
```

## Sicherheitsaspekte

1. **Zugriffssteuerung**:
   - Sitzungen sind an Benutzer gebunden
   - Benutzer können nur ihre eigenen Sitzungen sehen
   - Admin-Zugriff für Support-Zwecke

2. **Datenschutz**:
   - Möglichkeit zum Löschen von Sitzungen und Nachrichten
   - Automatische Bereinigung inaktiver Sitzungen (optional)
   - Konformität mit Datenschutzrichtlinien

3. **Validierung**:
   - Serverseitige Validierung aller Eingaben
   - Schutz vor Injection-Angriffen
   - Rate-Limiting für API-Endpunkte

## Zukünftige Erweiterungen

1. **Erweiterte Metadaten**:
   - Tagging-System für Sitzungen
   - Kategorisierung nach Themen
   - Wichtigkeitsmarkierungen

2. **Erweiterte Exportoptionen**:
   - Export in verschiedene Formate (PDF, Markdown, etc.)
   - Teilexport bestimmter Nachrichten
   - Anonymisierte Exporte für Analysen

3. **Kollaborationsfunktionen**:
   - Gemeinsame Sitzungen für mehrere Benutzer
   - Echtzeit-Kollaboration
   - Berechtigungsmanagement für geteilte Sitzungen

---

Aktualisiert: 04.05.2025