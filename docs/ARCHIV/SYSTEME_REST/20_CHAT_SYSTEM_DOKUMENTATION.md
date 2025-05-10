# Chat-System mit Session-Management Dokumentation

## Überblick

Das Chat-System der nscale-assist-Anwendung bietet eine umfassende Lösung für die Verwaltung von Chat-Sessions und Nachrichten. Es ermöglicht Benutzern, mehrere Unterhaltungen zu führen, diese zu kategorisieren, zu filtern und effizient zu durchsuchen. Das System unterstützt Streaming-Antworten, virtualisiertes Rendering für optimale Performance und bietet eine responsive Benutzeroberfläche für verschiedene Geräte.

## Architektur

Das System basiert auf einer dreischichtigen Architektur:

1. **Datenschicht**: Der Pinia Store (`SessionsStore`) verwaltet den Zustand, die Persistenz und die API-Kommunikation
2. **Logikschicht**: Composables und Vue-Komponenten-Logik für Benutzerinteraktionen
3. **Darstellungsschicht**: Vue-Komponenten für die Benutzeroberfläche

### Hauptkomponenten

- **ChatView.vue**: Hauptansicht für den Chat mit Seitenleiste und Nachrichtenbereich
- **SessionList.vue**: Verwaltung und Anzeige von Chat-Sessions
- **MessageList.vue**: Virtualisierte Darstellung von Nachrichten
- **MessageInput.vue**: Eingabefeld für neue Nachrichten mit Autoresize-Funktion
- **SessionsStore**: Pinia-Store für Datenverwaltung und API-Kommunikation

## Datenfluss

1. **Session-Verwaltung**:
   - Laden von Sessions über API
   - Lokale Persistenz in localStorage/sessionStorage
   - Optimierte Speicherverwaltung für große Datensätze

2. **Nachrichten-Verwaltung**:
   - Laden von Nachrichten pro Session
   - Streamen von Antworten für Echtzeitanzeige
   - Paginierung für effiziente Anzeige langer Nachrichtenlisten

3. **Benutzerinteraktionen**:
   - Session-Erstellung, -Bearbeitung, -Archivierung und -Löschung
   - Nachrichteneingabe und -versand
   - Feedback zu Nachrichten und Quellenansicht

## Komponenten im Detail

### ChatView.vue

Die Hauptkomponente für die Chat-Funktionalität, die alle anderen Komponenten integriert.

**Eigenschaften**:
- Grid-Layout für Seitenleiste und Hauptchatbereich
- Responsive Design mit Mobile-First-Ansatz
- Dynamische Anpassung an verschiedene Bildschirmgrößen
- Session-Info-Panel für detaillierte Verwaltung
- Quellen-Modal für Referenzanzeige

**Code-Struktur**:
```
ChatView.vue
├── Template (Layout mit Grid)
│   ├── Seitenleiste (SessionList)
│   ├── Hauptbereich
│   │   ├── Header
│   │   ├── MessageList
│   │   └── MessageInput
│   ├── Session-Info-Panel
│   └── Quellen-Modal
├── Script
│   ├── State Management
│   ├── Computed Properties
│   └── Event Handler
└── Style (CSS Grid)
```

**Technische Details**:
- Verwendet CSS Grid für responsives Layout
- Sidebar kann ein-/ausgeklappt werden
- Optimiert für Mobile mit speziellen Touch-Interaktionen
- Dark Mode über CSS-Variablen
- Fokus auf Barrierefreiheit mit ARIA-Attributen

### SessionList.vue

Komponente zur Anzeige und Verwaltung von Chat-Sessions.

**Eigenschaften**:
- Suchfunktion für Sessions
- Sortierung nach verschiedenen Kriterien
- Filtern nach Tags, Kategorien oder Status
- Drag-and-Drop für benutzerdefinierte Reihenfolge
- Virtualisiertes Scrolling für große Listen

**Technische Details**:
- Verwendet `vue-draggable` für Drag-and-Drop
- `RecycleScroller` für virtualisiertes Rendern
- Kontextmenü für erweiterte Aktionen
- Unterstützt Mehrfachauswahl für Massenaktionen

### MessageList.vue

Komponente zur Anzeige von Nachrichten mit Unterstützung für lange Listen.

**Eigenschaften**:
- Virtualisiertes Rendering für optimale Performance
- Automatisches Scrollen bei neuen Nachrichten
- Unterstützung für Streaming-Nachrichten
- Skeleton-Loading für verbesserte UX

**Technische Details**:
- Dynamische Berechnung von Elementhöhen
- Optimiertes Re-Rendering nur für sichtbare Elemente
- Unterstützung für Markdown und Code-Syntaxhervorhebung
- Leistungsoptimierungen für mobile Geräte

### MessageInput.vue

Komponente für die Nachrichteneingabe mit erweiterten Funktionen.

**Eigenschaften**:
- Auto-Resize basierend auf Inhalt
- Streaming-Statusanzeige
- Entwurfsspeicherung zwischen Sitzungen
- Vorlagensystem für häufig verwendete Nachrichten

**Technische Details**:
- Verwendet ResizeObserver API für genaue Größenanpassung
- Verzögerte Eingabeverarbeitung für optimale Performance
- Barrierefreiheit mit Tastaturunterstützung
- Feedback-Anzeigen für Benutzerinteraktion

### SessionsStore

Pinia-Store für die Verwaltung des Chat-Zustands.

**Funktionen**:
- Session-CRUD-Operationen
- Nachrichten-Verwaltung und -Streaming
- Optimierte Persistenz für große Datensätze
- Tag- und Kategorieverwaltung

**Technische Details**:
- Optimistisches UI-Update vor Serverantwort
- Fehlerbehandlung mit Rollback
- Selektive Persistierung für bessere Performance
- Offline-Unterstützung mit Synchronisierung

## API-Integration

Der Store kommuniziert mit dem Backend über folgende Endpunkte:

- `GET /api/sessions`: Laden aller Sessions
- `POST /api/sessions`: Erstellen einer neuen Session
- `PATCH /api/sessions/:id`: Aktualisieren einer Session
- `DELETE /api/sessions/:id`: Löschen einer Session
- `GET /api/sessions/:id/messages`: Laden der Nachrichten einer Session
- `POST /api/sessions/:id/messages`: Senden einer neuen Nachricht
- `GET /api/sessions/:id/stream`: Stream-Endpunkt für Echtzeit-Antworten

## Optimierungen

1. **Performance**:
   - Virtualisiertes Rendering für Listen
   - Effiziente DOM-Updates
   - Lazy-Loading von Nachrichten
   - Optimierte Speichernutzung

2. **UX/UI**:
   - Sofortiges Feedback bei Aktionen
   - Streaming-Anzeige für Echtzeitantworten
   - Skeleton-Loading für verbesserte Ladezeiten
   - Responsive Design für alle Geräte

3. **Barrierefreiheit**:
   - ARIA-Attributtekonform für Screenreader
   - Tastaturnavigation
   - Einstellungen für reduzierte Bewegung
   - Dark Mode Unterstützung

## Beispiel-Workflow

1. Benutzer öffnet die Chat-Ansicht
2. SessionsStore lädt Sessions vom Server
3. Benutzer wählt eine Session oder erstellt eine neue
4. SessionsStore lädt Nachrichten für die ausgewählte Session
5. Benutzer sendet eine Nachricht
6. MessageInput deaktiviert sich während des Streams
7. SessionsStore verarbeitet die Streaming-Antwort
8. MessageList zeigt die eingehende Antwort in Echtzeit an
9. Benutzer kann die Antwort bewerten oder Quellen anzeigen

## Erweiterungen und Anpassungen

Das System wurde für einfache Erweiterbarkeit konzipiert:

- Neue Nachrichtentypen können mit minimalen Änderungen hinzugefügt werden
- Das Tag- und Kategoriesystem kann erweitert werden
- Weitere Aktionen für Sessions können einfach integriert werden
- Die Oberfläche kann durch CSS-Variablen angepasst werden

## Code-Beispiele

### Session auswählen

```javascript
// In ChatView.vue
async function handleSessionSelect(sessionId) {
  // Zur gewählten Session navigieren und Nachrichten laden
  await sessionsStore.setCurrentSession(sessionId);
  
  // URL aktualisieren, um die Session-ID zu reflektieren
  router.push(`/chat/${sessionId}`);
}
```

### Nachricht senden

```javascript
// In ChatView.vue
async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !currentSessionId.value) return;

  try {
    // Eingabefeld zurücksetzen
    messageInput.value = '';

    // Nachricht senden
    await sessionsStore.sendMessage({
      sessionId: currentSessionId.value,
      content
    });

    // Zum Ende der Nachrichtenliste scrollen
    nextTick(() => {
      messageListRef.value?.scrollToBottom();
    });
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    uiStore.showError('Fehler beim Senden der Nachricht');
  }
}
```

### Session-Filter anwenden

```javascript
// In SessionList.vue
function setFilter(type, value) {
  if (currentFilter.value.type === type && currentFilter.value.value === value) {
    // Wenn der gleiche Filter nochmal geklickt wird, zurücksetzen
    resetFilter();
  } else {
    currentFilter.value = { type, value };
  }
  showFilterOptions.value = false;
}
```