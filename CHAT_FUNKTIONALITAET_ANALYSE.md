---
title: "Chat-Funktionalitäts-Analyse und Reparaturplan"
version: "1.0.0"
date: "2025-05-29"
lastUpdate: "2025-05-29"
author: "Claude"
status: "Analyse abgeschlossen"
priority: "Kritisch"
category: "Bugfix"
tags: ["Chat", "Streaming", "MOTD", "Feedback", "Sources"]
---

# Chat-Funktionalitäts-Analyse und Reparaturplan

## Executive Summary

Die Analyse zeigt, dass die meisten Features bereits implementiert sind, aber nicht korrekt integriert oder aktiviert wurden:

- ✅ **Streaming**: Implementiert aber möglicherweise deaktiviert
- ❌ **MOTD**: Komponente existiert, aber nicht in Chat integriert
- ❌ **Feedback**: UI vorhanden, aber API-Integration fehlt
- ⚠️ **Quellen**: UI vorhanden, benötigt Backend-Daten

## 1. Text-Streaming Analyse

### Status: Implementiert aber möglicherweise deaktiviert

#### Aktuelle Implementierung
- **Backend**: Voll funktionsfähig mit SSE (Server-Sent Events)
- **Frontend**: Streaming-Code in `stores/sessions.ts` vorhanden
- **Problem**: `streamingEnabled = true` aber möglicherweise wird Non-Streaming-Fallback verwendet

#### Code-Lokation
```typescript
// src/stores/sessions.ts - Zeile 935
const streamingEnabled = true; // Wieder aktivieren
```

#### Streaming-Flow
1. Frontend sendet GET Request an `/api/question/stream`
2. Backend streamt Tokens via SSE
3. Frontend parsed SSE-Daten und updated Message incrementell
4. Stream endet mit `[DONE]` Signal

### Diagnose-Schritte
1. Browser Network-Tab prüfen: Wird `/api/question/stream` aufgerufen?
2. Console-Logs: Gibt es Fehler beim SSE-Parsing?
3. Message-State: Wird `isStreaming: true` gesetzt?

## 2. MOTD-System Analyse

### Status: Komponenten vorhanden, aber nicht integriert

#### Vorhandene Komponenten
- **Store**: `src/stores/admin/motd.ts` - Vollständig implementiert
- **UI**: `src/components/ui/Motd.vue` - Popup-Style Komponente
- **Problem**: Nicht in MessageList integriert

#### Benötigte Integration
```vue
<!-- In src/components/chat/MessageList.vue -->
<template>
  <div class="message-list">
    <!-- Bei leerem Chat -->
    <div v-if="messages.length === 0">
      <MOTDDisplay v-if="!hasUserSentMessage" />
      <!-- Existing welcome screen -->
    </div>
  </div>
</template>
```

## 3. Feedback-System Analyse

### Status: UI vorhanden, API-Integration fehlt

#### Vorhandene Implementierung
- **UI**: Feedback-Buttons in `MessageItem.vue` (Zeilen 67-96)
- **Events**: Component emittiert `feedback` Events korrekt
- **Problem**: Keine Handler-Methode in sessions.ts

#### Benötigte API-Integration
```typescript
// In src/stores/sessions.ts hinzufügen
async sendFeedback(messageId: string, feedback: 'positive' | 'negative') {
  try {
    const response = await api.post('/api/feedback', {
      message_id: messageId,
      session_id: this.activeSessionId,
      feedback_type: feedback
    });
    
    // Update local message state
    const message = this.findMessage(messageId);
    if (message) {
      message.userFeedback = feedback;
    }
  } catch (error) {
    console.error('Feedback submission failed:', error);
  }
}
```

## 4. Quellen-System Analyse

### Status: UI vorhanden, benötigt Backend-Daten

#### Vorhandene Implementierung
- **UI**: Quellen-Button in `MessageItem.vue` (Zeilen 99-109)
- **Modal**: `SourceReferencesModal.vue` existiert
- **Composable**: `useSourceReferences` für State-Management
- **Problem**: Backend muss `metadata.sourceReferences` liefern

#### Backend-Integration prüfen
```typescript
// Message-Struktur sollte enthalten:
interface Message {
  id: string;
  content: string;
  metadata?: {
    sourceReferences?: Array<{
      title: string;
      snippet: string;
      source: string;
    }>;
  };
}
```

## Konkrete Reparatur-Schritte

### Fix 1: Streaming aktivieren und debuggen
1. Console-Logs in `sendMessage` aktivieren
2. Network-Tab auf streaming-Endpoint prüfen
3. SSE-Parsing debuggen
4. Fallback-Logik überprüfen

### Fix 2: MOTD integrieren
1. MOTD-Store in MessageList importieren
2. Conditional Rendering für leere Chats
3. Hide-Logic nach erster Message
4. MOTD-Content vom Admin-Panel laden

### Fix 3: Feedback-API implementieren
1. `sendFeedback` Methode zu sessions.ts hinzufügen
2. Event-Handler in ChatContainer verbinden
3. Visual Feedback für gesendetes Feedback
4. Persistierung prüfen

### Fix 4: Quellen-Daten sicherstellen
1. Backend-Response auf sourceReferences prüfen
2. Message-Metadata korrekt mappen
3. Modal-Funktionalität testen
4. Quellen-Anzeige validieren

## Test-Strategie

### Streaming-Tests
- [ ] Network-Tab zeigt SSE-Stream
- [ ] Text erscheint Token-für-Token
- [ ] Keine JavaScript-Errors
- [ ] Stream endet sauber

### MOTD-Tests
- [ ] MOTD erscheint bei leerem Chat
- [ ] MOTD verschwindet nach erster Message
- [ ] MOTD-Content ist aktuell
- [ ] Keine Layout-Probleme

### Feedback-Tests
- [ ] Buttons reagieren auf Clicks
- [ ] API-Call wird gesendet
- [ ] Visual Feedback erscheint
- [ ] State bleibt nach Reload

### Quellen-Tests
- [ ] Button nur bei vorhandenen Quellen
- [ ] Modal öffnet sich korrekt
- [ ] Quellen werden angezeigt
- [ ] Modal schließt sauber

## Prioritäten

1. **Streaming** (Kritisch) - Kern-Funktionalität
2. **Feedback** (Hoch) - User-Experience
3. **MOTD** (Mittel) - Informativ
4. **Quellen** (Mittel) - Transparenz

---

*Nächster Schritt: Implementierung der Fixes in der angegebenen Reihenfolge*