// Aktualisierte sendMessage Funktion mit verbessertem Streaming

import { streamingService } from '@/services/streamingService';

// In der sessions.ts store:
async function sendMessage(sessionId: string, content: string): Promise<void> {
  try {
    if (!content.trim()) return;
    
    const timestamp = new Date().toISOString();
    const tempId = Date.now();
    
    // Füge Benutzernachricht hinzu
    const userMessage: ChatMessage = {
      id: tempId,
      sessionId,
      content,
      role: "user",
      timestamp,
      status: "sent",
    };
    
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = [];
    }
    messages.value[sessionId].push(userMessage);
    
    // Temporäre ID für Assistentennachricht
    const assistantTempId = tempId + 1;
    
    // Streaming mit dem neuen Service
    try {
      const streamingMessage: ChatMessage = {
        id: assistantTempId,
        sessionId,
        content: '',
        role: "assistant",
        timestamp: new Date().toISOString(),
        isStreaming: true,
        status: "sending",
      };
      messages.value[sessionId].push(streamingMessage);
      
      let responseContent = '';
      
      // Starte den Stream
      await streamingService.startStream({
        question: content,
        sessionId: sessionId,
        simpleLanguage: false, // oder aus den Einstellungen
        onMessage: (chunk) => {
          responseContent += chunk;
          
          // Update die Nachricht
          const msgIndex = messages.value[sessionId].findIndex(msg => msg.id === assistantTempId);
          if (msgIndex !== -1) {
            const updatedMessages = [...messages.value[sessionId]];
            updatedMessages[msgIndex] = {
              ...updatedMessages[msgIndex],
              content: responseContent,
              isStreaming: true,
              status: "sending"
            };
            messages.value = {
              ...messages.value,
              [sessionId]: updatedMessages
            };
          }
        },
        onError: (error) => {
          console.error('Streaming-Fehler:', error);
          
          // Bei Fehler: Fallback auf normale API
          fallbackToNormalAPI(sessionId, content, assistantTempId);
        },
        onComplete: () => {
          // Streaming abgeschlossen
          const msgIndex = messages.value[sessionId].findIndex(msg => msg.id === assistantTempId);
          if (msgIndex !== -1) {
            const updatedMessages = [...messages.value[sessionId]];
            updatedMessages[msgIndex] = {
              ...updatedMessages[msgIndex],
              isStreaming: false,
              status: "sent"
            };
            messages.value = {
              ...messages.value,
              [sessionId]: updatedMessages
            };
          }
          
          streaming.value = {
            isActive: false,
            progress: 100,
            currentSessionId: null,
          };
        }
      });
      
    } catch (streamError) {
      console.error('Fehler beim Streaming:', streamError);
      await fallbackToNormalAPI(sessionId, content, assistantTempId);
    }
    
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
    throw error;
  }
}

// Fallback-Funktion für die normale API
async function fallbackToNormalAPI(
  sessionId: string, 
  content: string, 
  assistantTempId: number
): Promise<void> {
  try {
    const authStore = useAuthStore();
    const response = await fetch('/api/question', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: content,
        session_id: parseInt(sessionId),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const responseContent = data.response || data.message || data.answer || "Keine Antwort vom Server";
    
    // Update die Assistentennachricht
    const msgIndex = messages.value[sessionId].findIndex(msg => msg.id === assistantTempId);
    if (msgIndex !== -1) {
      const updatedMessages = [...messages.value[sessionId]];
      updatedMessages[msgIndex] = {
        ...updatedMessages[msgIndex],
        content: responseContent,
        isStreaming: false,
        status: "sent"
      };
      messages.value = {
        ...messages.value,
        [sessionId]: updatedMessages
      };
    }
  } catch (error) {
    console.error('Fehler beim Fallback:', error);
    throw error;
  }
}