# Client-seitige Streaming-Fixes: Implementierungsleitfaden

Dieser Leitfaden beschreibt die notwendigen Änderungen auf der Client-Seite, um die Streaming-Probleme zu beheben.

## 1. Token-Übertragung korrigieren

### In `src/stores/sessions.ts`

Ersetze die EventSource-Implementierung mit der Fetch API:

```typescript
// FALSCH: Token in URL-Parameter
const authParams = new URLSearchParams(params);
authParams.append('token', authToken);
const authUrl = `/api/question/stream?${authParams.toString()}`;
eventSource = new EventSource(authUrl);

// RICHTIG: Token im Authorization-Header
fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'text/event-stream',
  },
}).then(async response => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error('No response body');
  }
  
  // Stream verarbeiten
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    
    // SSE-Format parsen
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        
        if (data === '[DONE]') {
          console.log('Found [DONE] marker');
          finishStreaming();
          return;
        }
        
        try {
          const jsonData = JSON.parse(data);
          // Daten verarbeiten...
          if (jsonData.content) {
            responseContent += jsonData.content;
          } else if (jsonData.token) {
            responseContent += jsonData.token;
          }
        } catch {
          // Kein JSON, als einfachen Text behandeln
          responseContent += data;
        }
        
        // Nachrichteninhalt aktualisieren mit neuer Funktion
        updateMessageContent(sessionId, assistantTempId, responseContent, true);
      }
    }
  }
}).catch(error => {
  console.error('Fetch fallback error:', error);
  // Fehlerbehandlung...
});
```

## 2. Reaktivitätsverbesserung implementieren

Füge eine verbesserte `updateMessageContent`-Funktion in `src/stores/sessions.ts` hinzu:

```typescript
/**
 * Aktualisiert den Inhalt einer Nachricht mit Reaktivitätsgarantie
 */
function updateMessageContent(sessionId: string, messageId: string, newContent: string, isStreaming: boolean = true): void {
  console.log(`[REACTIVITY] updateMessageContent called - sessionId: ${sessionId}, messageId: ${messageId}, content: ${newContent.length} chars`);
  
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
    // Additional verification
    const verifiedMessage = messages.value[sessionId][messageIndex];
    console.log(`[REACTIVITY] Verified content length: ${verifiedMessage.content.length}`);
    
    // Force a second tick to ensure component updates
    nextTick(() => {
      console.log(`[REACTIVITY] Second tick - DOM should be updated`);
    });
  });
}
```

## 3. Message-Rendering optimieren

### In `src/components/chat/MessageItem.vue`

Erstelle einen separaten Renderingpfad für Streaming-Nachrichten:

```html
<!-- Template-Bereich -->

<!-- Display raw content when streaming to eliminate Markdown processing issues -->
<div v-if="message.isStreaming" class="n-message-item__text n-message-item__text--streaming">
  {{ message.content }}
</div>

<!-- Normal formatted content for non-streaming messages -->
<div
  v-else
  ref="contentElement"
  class="n-message-item__text"
  v-html="formattedContent"
></div>
```

```css
/* CSS-Bereich */

/* Streaming message style */
.n-message-item__text--streaming {
  background-color: rgba(255, 255, 240, 0.9);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-left: 3px solid rgba(255, 193, 7, 0.7);
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  white-space: pre-wrap;
  color: #333;
  line-height: 1.5;
  
  /* Pulsating effect for streaming content */
  animation: pulse-border 1.5s infinite;
}

@keyframes pulse-border {
  0% { border-left-color: rgba(255, 193, 7, 0.3); }
  50% { border-left-color: rgba(255, 193, 7, 0.9); }
  100% { border-left-color: rgba(255, 193, 7, 0.3); }
}
```

### In `src/components/chat/MessageList.vue`

Deaktiviere die Virtualisierung während des Streamings für besseres Rendering:

```html
<!-- Non-virtualized list for streaming -->
<div v-if="!isVirtualized"
  class="n-message-list__simple-container"
  style="min-height: 200px;"
>
  <!-- Direct message rendering -->
  <div
    v-for="(message, index) in messages"
    :key="`msg-${message.id}-${index}`"
    class="n-message-list__message-wrapper n-message-direct"
    :data-message-id="message.id"
  >
    <MessageItem
      :message="message"
      :show-actions="showMessageActions"
      @feedback="$emit('feedback', $event)"
      @view-sources="$emit('view-sources', $event)"
      @view-explanation="$emit('view-explanation', $event)"
      @retry="$emit('retry', $event)"
      @delete="$emit('delete', $event)"
    />
  </div>
</div>
```

```typescript
// Script-Bereich - Computed Property anpassen
const isVirtualized = computed(
  () => props.virtualized && props.messages.length > 20 && !props.isStreaming
);
```

## 4. StreamingDebugPanel aktivieren

Integriere das StreamingDebugPanel in die ChatView-Komponente für die Entwicklungsumgebung:

```html
<!-- In src/views/ChatView.vue -->
<template>
  <div class="n-chat-view">
    <!-- Bestehender Code -->
    
    <!-- Streaming Debug Panel for Development -->
    <StreamingDebugPanel v-if="import.meta.env.DEV" />
  </div>
</template>

<script setup>
import StreamingDebugPanel from "@/components/debug/StreamingDebugPanel.vue";
// Bestehende Imports
</script>
```

## 5. Debug-Informationen hinzufügen

Um das Debugging zu erleichtern, füge temporäre Debug-Overlays hinzu:

```html
<!-- In MessageItem.vue -->
<div style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.7); color: #0f0; padding: 2px 4px; font-size: 8px; border-radius: 2px; z-index: 999;">
  [{{ message.role }}] ID: {{ message.id.substring(0,8) }} | Len: {{ message.content.length }} | Stream: {{ message.isStreaming }}
</div>

<!-- In MessageList.vue -->
<div style="position: fixed; top: 60px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 10px; z-index: 9999; font-size: 12px; max-width: 300px;">
  <h4 style="margin: 0 0 10px 0;">MessageList Debug</h4>
  <div>Props messages: {{ messages.length }}</div>
  <div>isLoading: {{ isLoading }}</div>
  <div>isStreaming: {{ isStreaming }}</div>
  <div>isVirtualized: {{ isVirtualized }}</div>
  <div>Messages:</div>
  <div v-for="(msg, idx) in messages.slice(0, 5)" :key="`debug-${idx}`" style="margin-left: 10px; font-size: 11px;">
    {{ idx }}: [{{ msg.role }}] {{ msg.content.substring(0, 30) }}... ({{ msg.id }})
  </div>
  <div v-if="messages.length > 5">... and {{ messages.length - 5 }} more</div>
</div>
```

## 6. Leistungsoptimierungen (optional)

Für bessere Leistung bei langen Streaming-Nachrichten kannst du die Update-Häufigkeit optimieren:

```typescript
// In updateMessageContent oder im Verarbeitungs-Loop
// Aktualisierung throtteln, um die Rendering-Last zu reduzieren
const now = Date.now();
if (!lastUpdateTime || 
    responseContent.length - lastContentLength > 50 || // Mindestens 50 neue Zeichen
    now - lastUpdateTime > 100) { // Oder 100ms seit letztem Update
  updateMessageContent(sessionId, assistantTempId, responseContent, true);
  lastContentLength = responseContent.length;
  lastUpdateTime = now;
}
```

## Testen

Nachdem du die Änderungen implementiert hast, teste folgende Szenarien:

1. **Basis-Funktionalität**: Sende eine Nachricht und überprüfe, ob die Antwort gestreamt wird
2. **Langer Inhalt**: Teste mit einer Anfrage, die eine lange Antwort generiert
3. **Netzwerkunterbrechung**: Unterbreche die Netzwerkverbindung während des Streamings
4. **Browser-Kompatibilität**: Teste in Chrome, Firefox, Safari und Edge
5. **Mobile Geräte**: Überprüfe die Funktionalität auf mobilen Geräten

## Fehlerbehebung

Wenn Probleme auftreten:

1. Aktiviere das `StreamingDebugPanel` und überprüfe:
   - Wird der Inhalt im Store aktualisiert?
   - Werden DOM-Updates ausgelöst?
   - Werden die richtigen Nachrichtenformate empfangen?

2. Überprüfe die Netzwerk-Anfragen in den Browser-DevTools:
   - Werden die Authorization-Header korrekt gesendet?
   - Erfolgt die SSE-Kommunikation fehlerfrei?

3. Konsole-Logs überprüfen nach:
   - `[REACTIVITY]` Präfix für Reaktivitätsprobleme
   - `[STREAMING]` Präfix für Streaming-Verbindungsprobleme
   - `[MessageItem]` und `[MessageList]` für UI-Renderingprobleme