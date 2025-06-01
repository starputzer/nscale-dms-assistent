# Streaming-Debugging Guide

Dieses Dokument bietet einen detaillierten Leitfaden zur Fehlerbehebung bei Streaming-Problemen im Chat-System.

## Aktuelle Probleme

Wir haben folgende Hauptprobleme identifiziert:

1. **Strukturelle Probleme in `sessions.ts`**:
   - Die `sendMessage`-Funktion hat eine überkomplexe verschachtelte Struktur
   - Es gibt doppelte Code-Blöcke 
   - Try/Catch-Blöcke sind nicht ordnungsgemäß geschlossen

2. **Streaming-Fehler**:
   - Fehler 422 beim Streaming aufgrund von Authentifizierungsproblemen
   - EventSource unterstützt keine Authorization-Header
   - Token wird in URL statt im Header gesendet
   - Bridge-Synchronisation hat Zugriffsfehler auf undefined Werte

3. **Reaktivitätsprobleme im UI**:
   - Streaming-Nachrichten werden nicht in Echtzeit angezeigt
   - Vue 3 Reaktivität bricht bei verschachtelten Objekten
   - DOM-Updates werden nicht konsistent während des Streamings ausgelöst
   - Teilweise inkorrekte Schlüssel in v-for-Schleifen

## Debugging-Tools

### StreamingDebugPanel

Das `StreamingDebugPanel` ist die zentrale Komponente für das Debugging von Streaming-Problemen. Es bietet Echtzeit-Einblicke und Diagnosefunktionen.

#### Aktivierung

Das Panel ist standardmäßig im Entwicklungsmodus aktiv. Zugriff über:

```javascript
// Im Browser-Konsolenfenster
window.streamingDebug.showPanel(); // Panel anzeigen
window.streamingDebug.hidePanel(); // Panel ausblenden
```

#### Wichtige Funktionen

1. **Store-Analyse**: Direkter Zugriff auf Store-Daten ohne Computed Properties
2. **Streaming-Status**: Überwachung des aktuellen Streaming-Zustands
3. **Content-Tracking**: Verfolgung von Inhaltsaktualisierungen und Token-Empfang
4. **Update-Verlauf**: Chronologische Aufzeichnung aller Aktualisierungen
5. **Fehlerprotokollierung**: Erfassung von Fehlern und Warnungen

### Console-Logging

Im Code wurden umfangreiche Debug-Logging-Anweisungen implementiert, die mit konsistenten Präfixen versehen sind:

- `[MessageItem]` - Für Probleme mit einzelnen Nachrichtenelementen
- `[MessageList]` - Für Probleme mit der Nachrichtenliste
- `[REACTIVITY]` - Für Vue 3 Reaktivitätsprobleme
- `[STREAMING]` - Für Streaming-spezifische Probleme
- `[COMPUTED]` - Für Probleme mit berechneten Eigenschaften
- `[DEBUG PANEL]` - Ausgaben vom StreamingDebugPanel

## Diagnostische Schritte

### 1. Token-Handling prüfen

Die Ursache für den 422-Fehler liegt im Token-Handling:

1. **Überprüfen der Streaming-URL**:
   ```typescript
   // Problematisch: Token ist in der URL
   const url = `/api/question/stream?${params.toString()}`;
   ```

2. **Inspektion der Network-Anfragen** im Browser:
   - EventSource-Verbindung mit Token in URL
   - In meisten Browsern: keine benutzerdefinierten Header für EventSource

3. **Backend-Logs prüfen** auf 422-Fehler:
   - Fehlende Authentifizierungsheader
   - Falsche Token-Verarbeitung

### 2. Vue-Reaktivität diagnostizieren

1. **Component DevTools verwenden**:
   - Komponenten vor/während/nach dem Streaming vergleichen
   - Prüfen, ob Reaktivitätsprobleme in verschachtelten Objekten auftreten

2. **Überwachung der Store-Updates**:
   ```javascript
   // Im Browser-Konsolenfenster
   let lastMessageLength = 0;
   const interval = setInterval(() => {
     const sessionId = window.chatDiagnostics.sessionsStore.currentSessionId;
     const messages = window.chatDiagnostics.sessionsStore.messages[sessionId] || [];
     const streamingMessage = messages.find(m => m.isStreaming);
     if (streamingMessage) {
       if (streamingMessage.content.length !== lastMessageLength) {
         console.log(`Content updated: ${lastMessageLength} -> ${streamingMessage.content.length}`);
         lastMessageLength = streamingMessage.content.length;
       }
     }
   }, 500);
   // Zum Stoppen: clearInterval(interval);
   ```

3. **DOM-Updates verfolgen**:
   - MutationObserver einrichten, um Änderungen zu protokollieren
   - Prüfen, ob DOM-Updates synchron mit Store-Updates erfolgen

### 3. Implementierungsschwächen finden

1. **Verschachtelte Struktur in `sessions.ts`**:
   - In sendMessage wird die Funktion zu komplex
   - Verschachtelte try/catch-Blöcke führen zu Laufzeitfehlern

2. **Redundanter Code**:
   - Doppelte Implementierungen für Streaming vs. Nicht-Streaming
   - Inkonsistente Fehlerbehandlung

## Implementierte Fixes

### 1. Token-Handling korrigiert

```typescript
// VORHER: Token in URL - unsicher und führt zu 422-Fehler
const authParams = new URLSearchParams(params);
authParams.append('token', authToken);
const authUrl = `/api/question/stream?${authParams.toString()}`;
eventSource = new EventSource(authUrl);

// NACHHER: Token im Header für Fetch API
fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'text/event-stream',
  },
}).then(async response => {
  // Stream verarbeiten
});
```

### 2. Reaktivitätsverbesserungen

```typescript
// VORHER: Direkte Objektmutation (bricht Reaktivität)
messages.value[sessionId][messageIndex].content = newContent;
messages.value[sessionId][messageIndex].isStreaming = isStreaming;

// NACHHER: Erzwungene Reaktivität mit neuen Objektreferenzen
function updateMessageContent(sessionId: string, messageId: string, newContent: string, isStreaming: boolean = true): void {
  console.log(`[REACTIVITY] updateMessageContent called - sessionId: ${sessionId}, messageId: ${messageId}`);
  
  if (!messages.value[sessionId]) {
    console.error(`[REACTIVITY] No messages found for session ${sessionId}`);
    return;
  }
  
  const messageIndex = messages.value[sessionId].findIndex(msg => msg.id === messageId);
  if (messageIndex === -1) {
    console.error(`[REACTIVITY] Message ${messageId} not found in session ${sessionId}`);
    return;
  }
  
  console.log(`[REACTIVITY] Found message at index ${messageIndex}`);
  
  // Create a NEW array reference with a NEW object at the updated index
  const newMessages = [...messages.value[sessionId]];
  newMessages[messageIndex] = {
    ...newMessages[messageIndex],
    content: newContent,
    isStreaming: isStreaming,
    status: isStreaming ? "pending" as const : "sent" as const,
    updatedAt: new Date().toISOString()
  };
  
  // Replace the entire messages object to ensure Vue detects the change
  const newMessagesObj = { ...messages.value };
  newMessagesObj[sessionId] = newMessages;
  messages.value = newMessagesObj;
  
  // Force Vue to flush the reactivity queue
  nextTick(() => {
    console.log(`[REACTIVITY] nextTick - Message ${messageId} update complete`);
    // Verification
    nextTick(() => {
      console.log(`[REACTIVITY] Second tick - DOM should be updated`);
    });
  });
}
```

### 3. Robusteres Streaming-Handling

```typescript
// Event-Handling mit Fehlererkennung
eventSource.onmessage = (event) => {
  if (!event.data) return;
  
  if (event.data === '[DONE]') {
    console.log('Received [DONE] in onmessage');
    eventSource?.close();
    finishStreaming();
    return;
  }
  
  // Parse the data - it might be JSON or plain text
  try {
    const jsonData = JSON.parse(event.data);
    if (jsonData.content) {
      responseContent += jsonData.content;
    } else if (jsonData.token) {
      responseContent += jsonData.token;
    } else if (jsonData.text) {
      responseContent += jsonData.text;
    } else if (jsonData.choice?.delta?.content) {
      // OpenAI-style streaming
      responseContent += jsonData.choice.delta.content;
    } else if (typeof jsonData === 'string') {
      responseContent += jsonData;
    }
  } catch {
    // Not JSON, treat as plain text token
    responseContent += event.data;
  }
  
  // Use the new helper function for proper reactivity
  updateMessageContent(sessionId, assistantTempId, responseContent, true);
};

// Fallback auf Fetch API mit ReadableStream
fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'text/event-stream',
  },
}).then(async response => {
  // Stream-Verarbeitung
});
```

### 4. Optimierte UI-Komponenten

```html
<!-- MessageItem.vue: Separater Rendering-Pfad für Streaming -->
<div v-if="message.isStreaming" class="n-message-item__text n-message-item__text--streaming">
  {{ message.content }}
</div>

<!-- MessageList.vue: Deaktivierung der Virtualisierung während des Streamings -->
<div v-if="!isVirtualized"
  class="n-message-list__simple-container">
  <!-- Direkte Nachrichtenrenderung -->
  <div
    v-for="(message, index) in messages"
    :key="`msg-${message.id}-${index}`"
    class="n-message-list__message-wrapper n-message-direct"
    :data-message-id="message.id">
    <MessageItem ... />
  </div>
</div>
```

## Teststrategien für die Fixes

### Manuelle Tests

1. **Standard-Chat-Test**:
   - Senden einer normalen Nachricht
   - Überprüfen der Streaming-Anzeige
   - Bestätigen, dass die Nachricht korrekt angezeigt wird

2. **Lange Nachrichten-Test**:
   - Anfrage für einen sehr langen Text stellen
   - Überprüfen der kontinuierlichen Updates
   - Abschließenden formatierten Text prüfen

3. **Verbindungsprobleme simulieren**:
   - DevTools-Netzwerk-Drosselung aktivieren
   - Online/Offline während des Streamings umschalten
   - Wiederverbindung und Fortsetzung testen

### Automatisierte Tests

1. **Unit-Tests für Reaktivität**:
   - Die updateMessageContent-Funktion isoliert testen
   - Zustandsänderungen verifizieren

2. **Komponentenintegrationstests**:
   - MessageItem und MessageList mit simulierten Streaming-Daten testen

3. **End-to-End-Tests**:
   - Kompletten Chat-Fluss mit simuliertem Streaming testen

## Nächste Schritte

1. **Strukturelle Verbesserungen**:
   - `sendMessage`-Funktion in Module aufteilen:
     - `prepareStreamingMessage()`
     - `handleStreamingConnection()`
     - `processStreamingResponse()`
     - `finishStreamingMessage()`

2. **Testabdeckung verbessern**:
   - Gezielte Tests für Streaming-Funktionalität

3. **Dokumentation aktualisieren**:
   - Detaillierte API-Beschreibung für Streaming-Integration
   - Best Practices für das Debugging von Streaming-Problemen

## Schlussfolgerung

Die Streaming-Probleme wurden durch eine Kombination von Faktoren verursacht:

1. Authentifizierungsprobleme mit Token in der URL vs. Header
2. Einschränkungen der EventSource-API
3. Vue 3 Reaktivitätseigenschaften bei verschachtelten Objekten
4. UI-Renderingprobleme mit virtualisierten Listen

Die implementierte Lösung adressiert alle diese Probleme durch:

1. Umstellung auf Fetch API mit ReadableStream
2. Korrekte Authorization-Headers
3. Robuste Reaktivitätshandhabung in `updateMessageContent`
4. Optimierte UI-Komponenten mit separaten Renderingpfaden

Das StreamingDebugPanel bietet ein leistungsfähiges Werkzeug zur kontinuierlichen Überwachung und Diagnose.