---
title: "Streaming-Implementierung und Fehlerbehebung - Konsolidierte Dokumentation"
version: "2.0.0"
date: "17.05.2025"
lastUpdate: "29.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Bugfix, Implementierung"
tags: ["Streaming", "API", "422 Error", "Authentication", "EventSource", "Vue3", "Reaktivität", "Debug"]
---

# Streaming-Implementierung und Fehlerbehebung - Konsolidierte Dokumentation

## Problem

Beim Aufruf des Streaming-Endpoints `/api/question/stream` tritt ein 422 (Unprocessable Entity) Error auf, obwohl eine Antwort geliefert wird. Die Fehlermeldung zeigt:

```
INFO: 127.0.0.1:45122 - "GET /api/question/stream?question=afs+sas+fa&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... HTTP/1.1" 422 Unprocessable Entity
```

## Ursachenanalyse

1. **Token in URL**: Das JWT-Token wird als URL-Parameter übertragen, was bei langen Tokens zu Problemen führt
2. **EventSource-Limitierungen**: EventSource unterstützt keine benutzerdefinierten Header für die Authentifizierung
3. **URL-Encoding**: Leerzeichen in der Frage werden nicht korrekt behandelt
4. **Parameter-Validierung**: FastAPI kann die Parameter nicht korrekt validieren

## Lösung

### 1. Neuer Streaming-Service

Erstellt einen neuen Service, der `fetch()` mit `ReadableStream` statt `EventSource` verwendet:

#### `/src/services/streamingService.ts`

```typescript
export class StreamingService {
  async startStream(options: StreamingOptions): Promise<void> {
    const authStore = useAuthStore();
    const token = authStore.token;

    // URL-Parameter ohne Token
    const params = new URLSearchParams({
      question: options.question,
      session_id: options.sessionId,
    });

    // Token im Authorization-Header
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
    });

    // Verarbeite den Stream...
  }
}
```

### 2. Verbesserter Server-Endpoint

#### `/api/server_streaming_fix.py`

```python
@app.get("/api/question/stream")
async def stream_question(
    question: str = Query(..., description="Die Frage des Benutzers"),
    session_id: str = Query(..., description="Die Session-ID"), 
    simple_language: Optional[bool] = Query(False),
    request: Request = None
):
    # Dekodiere die Frage
    decoded_question = unquote(question)
    
    # Token aus Header statt URL
    auth_header = request.headers.get("Authorization")
    
    # Bessere Fehlerbehandlung...
```

### 3. Aktualisierter Store

#### `/src/stores/sessions.streaming-fix.ts`

```typescript
async function sendMessage(sessionId: string, content: string): Promise<void> {
  // Verwende den neuen StreamingService
  await streamingService.startStream({
    question: content,
    sessionId: sessionId,
    onMessage: (chunk) => {
      // Update die UI...
    },
    onError: (error) => {
      // Fallback zur normalen API
    }
  });
}
```

## Implementierung

### Schritt 1: Service erstellen

1. Erstelle die Datei `/src/services/streamingService.ts`
2. Implementiere die `StreamingService` Klasse
3. Exportiere eine Singleton-Instanz

### Schritt 2: Store aktualisieren

1. Importiere den `streamingService`
2. Ersetze `EventSource` durch `streamingService.startStream()`
3. Implementiere Fehlerbehandlung mit Fallback

### Schritt 3: Server-Endpoint verbessern

1. Füge bessere Parameter-Validierung hinzu
2. Verwende `Query` Parameter mit Beschreibungen
3. Extrahiere Token nur aus Header
4. Implementiere besseres Error-Logging

## Vorteile der Lösung

1. **Keine URL-Längenbeschränkung**: Token im Header statt URL
2. **Bessere Kontrolle**: Abbruch-Möglichkeit für Streams
3. **Erweiterte Header**: Unterstützung für beliebige Header
4. **Fallback-Mechanismus**: Automatischer Wechsel zur normalen API
5. **Bessere Fehlerbehandlung**: Detaillierte Fehlermeldungen

## Testing

### Unit-Tests

```typescript
describe('StreamingService', () => {
  it('should handle authentication headers correctly', async () => {
    const service = new StreamingService();
    // Test implementation...
  });
});
```

### Integration-Tests

```python
def test_streaming_endpoint():
    """Test the improved streaming endpoint"""
    response = client.get(
        "/api/question/stream",
        params={"question": "test", "session_id": "1"},
        headers={"Authorization": "Bearer valid_token"}
    )
    assert response.status_code == 200
```

## Migration

### Für bestehende Implementierungen

1. **Schritt 1**: Implementiere den neuen Service parallel
2. **Schritt 2**: Teste mit Feature-Toggle
3. **Schritt 3**: Migriere schrittweise alle Clients
4. **Schritt 4**: Entferne alte EventSource-Implementierung

### Kompatibilität

Der Fix ist rückwärtskompatibel:
- Alte Clients können weiter EventSource verwenden
- Neue Clients nutzen den verbesserten Service
- Server unterstützt beide Methoden

## Monitoring

### Zu überwachende Metriken

1. **422 Error Rate**: Sollte nach Implementierung sinken
2. **Stream-Erfolgsrate**: Prozentsatz erfolgreicher Streams
3. **Fallback-Rate**: Wie oft wird zur normalen API gewechselt
4. **Response-Zeit**: Latenz der ersten Antwort

### Logging

```python
logger.info(f"Stream started: question='{question[:50]}...', session={session_id}")
logger.error(f"Stream error: {error}", exc_info=True)
```

## Bekannte Einschränkungen

1. **Browser-Kompatibilität**: ReadableStream wird nicht von allen alten Browsern unterstützt
2. **Proxy-Konfiguration**: Reverse-Proxies müssen SSE unterstützen
3. **Timeout-Handling**: Lange Streams können von Proxies unterbrochen werden

## Referenzen

- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [FastAPI: Query Parameters](https://fastapi.tiangolo.com/tutorial/query-params/)
- [Server-Sent Events Spezifikation](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

*Fix implementiert als Antwort auf Issue #422*

## Erweiterte Dokumentation - Konsolidiert aus allen Streaming-Dateien

### Vollständige Problemübersicht

Die Streaming-Funktionalität hatte mehrere zusammenhängende Probleme:

1. **Backend Error 422**: Token wurde in der URL statt im Header gesendet
2. **EventSource-Limitierungen**: Keine Unterstützung für Authorization-Header
3. **Vue 3 Reaktivitätsprobleme**: Streaming-Updates wurden nicht in der UI angezeigt
4. **Bridge-Synchronisationsfehler**: Zugriff auf undefined Werte
5. **Coroutine-Fehler im Backend**: Fehlende `stream_answer_chunks` Methode in der RAG-Engine
6. **Strukturelle Probleme**: Überkomplexe verschachtelte Struktur in `sessions.ts`

### Detaillierte Lösungsimplementierung

#### Backend-Verbesserungen

1. **Streaming-Integrationsmodul** (`api/streaming_integration.py`):
   ```python
   # Neues Modul für Streaming-Endpunkte
   # Zentralisierte Initialisierung der Abhängigkeiten
   # Verbesserte Streaming-Endpunkte (/api/v1/question/stream)
   # Korrekte HTTP-Streaming-Response-Header
   ```

2. **RAG Engine Erweiterungen** (`modules/rag/engine.py`):
   ```python
   async def stream_answer_chunks(self, question: str, session_id: str):
       """Asynchroner Generator für StreamingResponse"""
       # JSON-formatierte Stream-Chunks
       # Verbesserte Fehlerbehandlung
       # Yield chunks im SSE-Format
   ```

3. **Parameter-Validierung**:
   ```python
   from urllib.parse import unquote_plus
   
   @app.get("/api/question/stream")
   async def stream_question(
       question: str = Query(..., description="Die Frage des Benutzers"),
       session_id: str = Query(..., description="Die Session-ID"), 
       simple_language: Optional[bool] = Query(False),
       request: Request = None
   ):
       # URL-decode die Frage
       decoded_question = unquote_plus(question)
       
       # Token aus Header extrahieren
       auth_header = request.headers.get("Authorization")
   ```

#### Frontend-Optimierungen

1. **Reaktivitäts-Verbesserungen**:
   ```typescript
   function updateMessageContent(sessionId: string, messageId: string, newContent: string, isStreaming: boolean = true): void {
     // Neue Array-Referenz erstellen
     const newMessages = [...messages.value[sessionId]];
     newMessages[messageIndex] = {
       ...newMessages[messageIndex],
       content: newContent,
       isStreaming: isStreaming,
       status: isStreaming ? "pending" as const : "sent" as const,
       updatedAt: new Date().toISOString()
     };
     
     // Gesamtes messages-Objekt ersetzen
     const newMessagesObj = { ...messages.value };
     newMessagesObj[sessionId] = newMessages;
     messages.value = newMessagesObj;
     
     // Vue Reaktivität erzwingen
     nextTick(() => {
       console.log(`[REACTIVITY] Message ${messageId} update complete`);
     });
   }
   ```

2. **UI-Komponenten-Optimierungen**:
   
   **MessageItem.vue**:
   ```vue
   <!-- Separater Rendering-Pfad für Streaming -->
   <div v-if="message.isStreaming" class="n-message-item__text n-message-item__text--streaming">
     {{ message.content }}
   </div>
   
   <div v-else class="n-message-item__text" v-html="formattedContent"></div>
   ```
   
   **MessageList.vue**:
   ```typescript
   // Virtualisierung während Streaming deaktivieren
   const isVirtualized = computed(
     () => props.virtualized && props.messages.length > 20 && !props.isStreaming
   );
   ```

### Debugging und Diagnose

#### StreamingDebugPanel

Ein umfassendes Debugging-Tool wurde implementiert:

```typescript
// Aktivierung im Browser
window.streamingDebug.showPanel();
window.streamingDebug.hidePanel();
```

Features:
- Store-Analyse ohne Computed Properties
- Streaming-Status-Überwachung
- Content-Tracking in Echtzeit
- Update-Verlauf
- Fehlerprotokollierung

#### Console-Logging-Konventionen

Konsistente Präfixe für Debug-Ausgaben:
- `[MessageItem]` - Nachrichtenelement-Probleme
- `[MessageList]` - Nachrichtenlisten-Probleme
- `[REACTIVITY]` - Vue 3 Reaktivitätsprobleme
- `[STREAMING]` - Streaming-spezifische Probleme
- `[DEBUG PANEL]` - StreamingDebugPanel-Ausgaben

### Implementierungsplan

#### Phase 1: Backend-Aktivierung (1-2 Stunden)
1. Sichern des aktuellen Codes
2. Aktivieren des verbesserten Endpoints
3. Überprüfen der Backend-Logs

#### Phase 2: Frontend-Token-Anpassung (2-3 Stunden)
1. Token aus URL entfernen
2. Fetch API mit Authorization-Header implementieren
3. Fallback-Mechanismen hinzufügen

#### Phase 3: Reaktivitätsverbesserungen (3-4 Stunden)
1. `updateMessageContent`-Funktion implementieren
2. MessageItem.vue für Streaming optimieren
3. Virtualisierung während Streaming deaktivieren

#### Phase 4: Tests und Diagnose (2-3 Stunden)
1. StreamingDebugPanel aktivieren
2. Verschiedene Nachrichtentypen testen
3. Performance mit langen Antworten prüfen

#### Phase 5: Dokumentation (2 Stunden)
1. Dokumentation aktualisieren
2. Debugging-Leitfäden erstellen
3. Support-Team schulen

### Performance-Optimierungen

```typescript
// Update-Häufigkeit throtteln
const now = Date.now();
if (!lastUpdateTime || 
    responseContent.length - lastContentLength > 50 || 
    now - lastUpdateTime > 100) {
  updateMessageContent(sessionId, assistantTempId, responseContent, true);
  lastContentLength = responseContent.length;
  lastUpdateTime = now;
}
```

### Backend-Architektur

Die verbesserte Streaming-Architektur nutzt:
1. Separates Integrationsmodul für Abhängigkeiten
2. HTTP/1.1 Chunked Transfer für Kompatibilität
3. Hierarchische API-Versionen (/api/v1/...)
4. Asynchrone Generatoren für effizientes Streaming
5. JSON-formatierte Chunks für einfache Client-Verarbeitung

### Teststrategien

#### Manuelle Tests
1. Standard-Chat-Test mit normalen Nachrichten
2. Lange Nachrichten für kontinuierliche Updates
3. Verbindungsprobleme simulieren

#### Automatisierte Tests
1. Unit-Tests für `updateMessageContent`
2. Komponentenintegrationstests
3. End-to-End-Tests mit simuliertem Streaming

### Bekannte Einschränkungen und Lösungen

1. **Browser-Kompatibilität**: 
   - ReadableStream nicht in allen alten Browsern
   - Fallback auf EventSource implementiert

2. **Proxy-Konfiguration**: 
   - Reverse-Proxies müssen SSE unterstützen
   - Timeout-Einstellungen anpassen

3. **Mobile Geräte**:
   - Touch-Events berücksichtigen
   - Optimierte Renderingpfade

### Messbare Erfolgskriterien

- 422 Error Rate: Sollte auf 0 sinken
- Stream-Erfolgsrate: >95% erfolgreiche Streams
- Fallback-Rate: <5% Wechsel zur normalen API
- Response-Zeit: <200ms für erste Antwort

### Rollback-Plan

Bei Problemen:
1. Vorherige Version des Streaming-Endpoints wiederherstellen
2. Frontend-Implementierung zurücksetzen
3. StreamingDebugPanel deaktivieren
4. Benutzer informieren

### Nächste Schritte

1. **Strukturelle Verbesserungen**:
   - `sendMessage` in Module aufteilen
   - Redundanten Code entfernen
   
2. **Erweiterte Features**:
   - Stream-Fortschrittsanzeige
   - Pause/Resume-Funktionalität
   
3. **Monitoring**:
   - Metriken für Streaming-Performance
   - Automatische Fehlerberichte

---

*Konsolidierte Dokumentation erstellt am 29.05.2025 - Vereint alle Streaming-bezogenen Dokumentationen*