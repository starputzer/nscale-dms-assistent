import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ChatSession, 
  ChatMessage, 
  StreamingStatus,
  SendMessageParams
} from '../types/session';
import { useAuthStore } from './auth';

/**
 * Sessions Store zur Verwaltung von Chat-Sessions und Nachrichten
 * - Speichert alle Chat-Sessions des Benutzers
 * - Verwaltet die aktuelle aktive Session
 * - Speichert Nachrichten für jede Session
 * - Verarbeitet Nachrichten-Streaming
 */
export const useSessionsStore = defineStore('sessions', () => {
  // Referenz auf den Auth-Store für Benutzerinformationen
  const authStore = useAuthStore();
  
  // State
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<Record<string, ChatMessage[]>>({});
  const streaming = ref<StreamingStatus>({
    isActive: false,
    progress: 0,
    currentSessionId: null
  });
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const version = ref<number>(1); // Für Migrationen zwischen verschiedenen Speicherformaten
  
  // Migration von Legacy-Daten
  function migrateFromLegacyStorage() {
    try {
      const legacySessions = localStorage.getItem('chat_sessions');
      const legacyCurrentSession = localStorage.getItem('current_session_id');
      const legacyMessages = localStorage.getItem('chat_messages');
      
      // Nur migrieren, wenn Legacy-Daten existieren und noch keine neuen Daten vorhanden sind
      if (legacySessions && sessions.value.length === 0) {
        try {
          const parsedSessions = JSON.parse(legacySessions);
          sessions.value = parsedSessions.map((session: any) => ({
            ...session,
            // Sicherstellen, dass Timestamps als ISO-Strings gespeichert sind
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: session.updatedAt || new Date().toISOString()
          }));
          
          if (legacyCurrentSession) {
            currentSessionId.value = legacyCurrentSession;
          }
          
          if (legacyMessages) {
            const parsedMessages = JSON.parse(legacyMessages);
            
            // Nachrichten konvertieren
            Object.keys(parsedMessages).forEach(sessionId => {
              messages.value[sessionId] = parsedMessages[sessionId].map((msg: any) => ({
                ...msg,
                timestamp: msg.timestamp || new Date().toISOString(),
                status: msg.status || 'sent'
              }));
            });
          }
          
          console.log('Sessions und Nachrichten aus Legacy-Speicher migriert');
        } catch (e) {
          console.error('Fehler beim Parsen der Legacy-Session-Daten', e);
        }
      }
    } catch (error) {
      console.error('Fehler bei der Migration von Session-Daten:', error);
    }
  }
  
  // Initialisierung des Stores
  function initialize() {
    migrateFromLegacyStorage();
  }
  
  // Bei Store-Erstellung initialisieren
  initialize();
  
  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value) || null
  );
  
  const currentMessages = computed(() => 
    currentSessionId.value ? messages.value[currentSessionId.value] || [] : []
  );
  
  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => {
      // Gepinnte Sessions zuerst
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Dann nach Datum (neueste zuerst)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  });
  
  const isStreaming = computed(() => streaming.value.isActive);
  
  // Actions
  /**
   * Alle Sessions des angemeldeten Benutzers laden
   */
  async function fetchSessions(): Promise<void> {
    if (!authStore.isAuthenticated) return;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.get<ChatSession[]>('/api/sessions');
      sessions.value = response.data;
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Sessions';
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Nachrichten für eine bestimmte Session laden
   */
  async function fetchMessages(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.get<ChatMessage[]>(`/api/sessions/${sessionId}/messages`);
      
      // Nachrichten für diese Session speichern
      messages.value = {
        ...messages.value,
        [sessionId]: response.data
      };
    } catch (err: any) {
      console.error(`Error fetching messages for session ${sessionId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Nachrichten';
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Erstellt eine neue Chat-Session und wechselt zu ihr
   */
  async function createSession(title: string = 'Neue Unterhaltung'): Promise<string> {
    if (!authStore.isAuthenticated) {
      throw new Error('Benutzer ist nicht angemeldet');
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const now = new Date().toISOString();
      const payload = {
        title,
        userId: authStore.user?.id,
        createdAt: now,
        updatedAt: now
      };
      
      const response = await axios.post<ChatSession>('/api/sessions', payload);
      const newSession = response.data;
      
      sessions.value.push(newSession);
      messages.value[newSession.id] = [];
      
      // Zur neuen Session wechseln
      setCurrentSession(newSession.id);
      
      return newSession.id;
    } catch (err: any) {
      console.error('Error creating session:', err);
      error.value = err.response?.data?.message || 'Fehler beim Erstellen der Session';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Wechselt zur angegebenen Session und lädt ihre Nachrichten
   */
  async function setCurrentSession(sessionId: string): Promise<void> {
    if (currentSessionId.value === sessionId) return;
    
    currentSessionId.value = sessionId;
    
    // Nachrichten laden, wenn sie noch nicht im Store sind
    if (!messages.value[sessionId] || messages.value[sessionId].length === 0) {
      await fetchMessages(sessionId);
    }
  }
  
  /**
   * Aktualisiert den Titel einer Session
   */
  async function updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
    if (!sessionId) return;
    
    try {
      await axios.patch(`/api/sessions/${sessionId}`, { title: newTitle });
      
      // Update im lokalen State
      const sessionIndex = sessions.value.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          title: newTitle,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err: any) {
      console.error(`Error updating session title for ${sessionId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Aktualisieren des Titels';
    }
  }
  
  /**
   * Archiviert/löscht eine Session
   */
  async function archiveSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    try {
      await axios.delete(`/api/sessions/${sessionId}`);
      
      // Aus dem lokalen State entfernen
      sessions.value = sessions.value.filter(s => s.id !== sessionId);
      
      // Nachrichten aus dem Store entfernen
      if (messages.value[sessionId]) {
        const { [sessionId]: _, ...rest } = messages.value;
        messages.value = rest;
      }
      
      // Wenn die aktuelle Session gelöscht wurde, zur ersten verfügbaren wechseln
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = sessions.value.length > 0 ? sessions.value[0].id : null;
      }
    } catch (err: any) {
      console.error(`Error archiving session ${sessionId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Archivieren der Session';
    }
  }
  
  /**
   * Markiert eine Session als angeheftet/nicht angeheftet
   */
  async function togglePinSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    // Aktuellen Pin-Status finden
    const sessionIndex = sessions.value.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;
    
    const isPinned = !sessions.value[sessionIndex].isPinned;
    
    try {
      await axios.patch(`/api/sessions/${sessionId}`, { isPinned });
      
      // Update im lokalen State
      sessions.value[sessionIndex] = {
        ...sessions.value[sessionIndex],
        isPinned,
        updatedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.error(`Error toggling pin status for session ${sessionId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Ändern des Pin-Status';
    }
  }
  
  /**
   * Sendet eine Nachricht und verarbeitet die Antwort
   * Kann mit Streaming oder ohne verwendet werden
   */
  async function sendMessage({ sessionId, content, role = 'user' }: SendMessageParams): Promise<void> {
    if (!sessionId || !content) return;
    
    // Sicherstellen, dass die aktuelle Session gesetzt ist
    if (currentSessionId.value !== sessionId) {
      setCurrentSession(sessionId);
    }
    
    error.value = null;
    
    // Temporäre ID für die Nachricht
    const tempId = `temp-${uuidv4()}`;
    const timestamp = new Date().toISOString();
    
    // Benutzernachricht erstellen und sofort anzeigen
    const userMessage: ChatMessage = {
      id: tempId,
      sessionId,
      content,
      role,
      timestamp,
      status: 'pending'
    };
    
    // Nachricht zum lokalen State hinzufügen
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = [];
    }
    
    messages.value[sessionId].push(userMessage);
    
    // Streaming-Status setzen
    streaming.value = {
      isActive: true,
      progress: 0,
      currentSessionId: sessionId
    };
    
    try {
      // Anfrage-Payload
      const payload = {
        content,
        role
      };
      
      // Event-Source für Streaming einrichten
      const eventSource = new EventSource(`/api/sessions/${sessionId}/stream?message=${encodeURIComponent(content)}`);
      
      // Temporäre ID für die Antwortnachricht
      const assistantTempId = `temp-response-${uuidv4()}`;
      let assistantContent = '';
      
      // Anfangszustand der Antwortnachricht
      const assistantMessage: ChatMessage = {
        id: assistantTempId,
        sessionId,
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        status: 'pending'
      };
      
      // Antwortnachricht zum lokalen State hinzufügen
      messages.value[sessionId].push(assistantMessage);
      
      // Event-Handler für Streaming-Events
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'content') {
            // Inhalt zur Antwort hinzufügen
            assistantContent += data.content;
            
            // Antwortnachricht im State aktualisieren
            const index = messages.value[sessionId].findIndex(m => m.id === assistantTempId);
            if (index !== -1) {
              messages.value[sessionId][index] = {
                ...messages.value[sessionId][index],
                content: assistantContent,
                isStreaming: true
              };
            }
          } else if (data.type === 'metadata') {
            // Metadaten zur Antwort hinzufügen (z.B. Quellenangaben)
            const index = messages.value[sessionId].findIndex(m => m.id === assistantTempId);
            if (index !== -1) {
              messages.value[sessionId][index] = {
                ...messages.value[sessionId][index],
                metadata: data.metadata
              };
            }
          } else if (data.type === 'progress') {
            // Fortschritt aktualisieren
            streaming.value.progress = data.progress;
          }
        } catch (err) {
          console.error('Error parsing streaming event:', err);
        }
      };
      
      // Event-Handler für den Abschluss des Streamings
      eventSource.addEventListener('done', async (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          
          // Streaming beenden
          streaming.value = {
            isActive: false,
            progress: 100,
            currentSessionId: null
          };
          
          // Antwortnachricht mit finaler ID aktualisieren
          const index = messages.value[sessionId].findIndex(m => m.id === assistantTempId);
          if (index !== -1) {
            messages.value[sessionId][index] = {
              ...messages.value[sessionId][index],
              id: data.id || assistantTempId,
              content: data.content || assistantContent,
              isStreaming: false,
              status: 'sent',
              metadata: data.metadata || messages.value[sessionId][index].metadata
            };
          }
          
          // Session-Titel aktualisieren, falls es eine neue Session ohne Titel ist
          const session = sessions.value.find(s => s.id === sessionId);
          if (session && session.title === 'Neue Unterhaltung') {
            // Automatisch einen Titel basierend auf der ersten Benutzernachricht generieren
            const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
            await updateSessionTitle(sessionId, title);
          }
          
          // Event-Source schließen
          eventSource.close();
        } catch (err) {
          console.error('Error processing done event:', err);
          eventSource.close();
        }
      });
      
      // Event-Handler für Fehler
      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        
        // Streaming beenden
        streaming.value = {
          isActive: false,
          progress: 0,
          currentSessionId: null
        };
        
        // Fehlerstatus setzen
        const index = messages.value[sessionId].findIndex(m => m.id === assistantTempId);
        if (index !== -1) {
          messages.value[sessionId][index] = {
            ...messages.value[sessionId][index],
            isStreaming: false,
            status: 'error',
            content: assistantContent || 'Fehler beim Laden der Antwort.'
          };
        }
        
        // Event-Source schließen
        eventSource.close();
        error.value = 'Fehler bei der Kommunikation mit dem Server.';
      };
    } catch (err: any) {
      console.error('Error sending message:', err);
      error.value = err.response?.data?.message || 'Fehler beim Senden der Nachricht';
      
      // Streaming beenden
      streaming.value = {
        isActive: false,
        progress: 0,
        currentSessionId: null
      };
    }
  }
  
  /**
   * Aktuelle Streaming-Antwort abbrechen
   */
  function cancelStreaming(): void {
    if (!streaming.value.isActive) return;
    
    // Alle EventSource-Verbindungen schließen
    window.dispatchEvent(new CustomEvent('cancel-streaming'));
    
    // Streaming-Status zurücksetzen
    streaming.value = {
      isActive: false,
      progress: 0,
      currentSessionId: null
    };
    
    // Status der letzten Nachricht aktualisieren
    if (currentSessionId.value) {
      const currentSessionMessages = messages.value[currentSessionId.value] || [];
      const streamingMessageIndex = currentSessionMessages.findIndex(m => m.isStreaming);
      
      if (streamingMessageIndex !== -1) {
        messages.value[currentSessionId.value][streamingMessageIndex] = {
          ...messages.value[currentSessionId.value][streamingMessageIndex],
          isStreaming: false,
          content: messages.value[currentSessionId.value][streamingMessageIndex].content + ' [abgebrochen]'
        };
      }
    }
  }
  
  /**
   * Löscht eine Nachricht aus einer Session
   */
  async function deleteMessage(sessionId: string, messageId: string): Promise<void> {
    if (!sessionId || !messageId) return;
    
    try {
      await axios.delete(`/api/sessions/${sessionId}/messages/${messageId}`);
      
      // Aus dem lokalen State entfernen
      if (messages.value[sessionId]) {
        messages.value[sessionId] = messages.value[sessionId].filter(m => m.id !== messageId);
      }
    } catch (err: any) {
      console.error(`Error deleting message ${messageId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Löschen der Nachricht';
    }
  }
  
  /**
   * Lädt den gesamten Chat-Verlauf neu
   */
  async function refreshSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    await fetchMessages(sessionId);
  }
  
  // Öffentliche API des Stores
  return {
    // State
    sessions,
    currentSessionId,
    messages,
    streaming,
    isLoading,
    error,
    version,
    
    // Getters
    currentSession,
    currentMessages,
    sortedSessions,
    isStreaming,
    
    // Actions
    fetchSessions,
    fetchMessages,
    createSession,
    setCurrentSession,
    updateSessionTitle,
    archiveSession,
    togglePinSession,
    sendMessage,
    cancelStreaming,
    deleteMessage,
    refreshSession,
    migrateFromLegacyStorage
  };
}, {
  // Store serialization options für Persistenz
  persist: {
    enabled: true,
    strategies: [
      {
        storage: localStorage,
        paths: ['sessions', 'currentSessionId', 'version'], // Nur diese Eigenschaften persistieren
      },
    ],
  },
});