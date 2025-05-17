# Streaming-Fehler Fix - Zusammenfassung

## Problem
1. Fehler 422: Token wurde in der URL statt im Header gesendet  
2. EventSource unterstützt keine Authorization-Header
3. Bridge-Synchronisation hatte Zugriffsfehler auf undefined Werte

## Durchgeführte Fixes

### Backend (`api/server.py`)
1. Query-Parameter mit `Query()` explizit deklariert
2. URL-Decodierung mit `urllib.parse.unquote_plus()` hinzugefügt
3. Bessere Parametervalidierung implementiert

### Frontend (`src/stores/sessions.ts`)
1. Token aus URL-Parametern entfernt
2. EventSource durch fetch mit ReadableStream ersetzt
3. Authorization Header korrigiert implementiert

### Bridge (`src/composables/useBridgeChat.ts`)
1. Zugriff auf `sessions` korrigiert (nicht `sessions.value`)
2. `currentSession` statt `activeSession` verwendet
3. Fallback auf `currentSessionId` hinzugefügt

## Änderungen im Detail

### Token-Handling
```typescript
// VORHER: Token in URL
params.append('token', authToken);

// NACHHER: Token im Header
headers: {
  'Authorization': `Bearer ${authToken}`,
  'Accept': 'text/event-stream',
}
```

### Streaming-Implementierung
```typescript
// VORHER: EventSource (keine Header-Unterstützung)
const eventSource = new EventSource(url);

// NACHHER: fetch mit ReadableStream
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'text/event-stream',
  },
});
```

## Status

✅ Backend-Parameter korrigiert  
✅ Token-Handling korrigiert  
✅ Streaming auf fetch umgestellt  
✅ Bridge-Fehler behoben  
⏳ Server-Neustart erforderlich  
⏳ Vollständiges Testing ausstehend

## Nächste Schritte

1. Server neustarten
2. Streaming-Funktionalität testen
3. Server-Logs überwachen
4. SSE-Format-Parsing verifizieren