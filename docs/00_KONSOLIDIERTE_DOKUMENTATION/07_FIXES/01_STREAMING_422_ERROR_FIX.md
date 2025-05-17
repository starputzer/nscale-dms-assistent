---
title: "Fix für 422 Error beim Streaming-Endpoint"
version: "1.0.0"
date: "17.05.2025"
lastUpdate: "17.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Bugfix"
tags: ["Streaming", "API", "422 Error", "Authentication", "EventSource"]
---

# Fix für 422 Error beim Streaming-Endpoint

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