import { computed, ref, watch, shallowRef } from 'vue';
import { useSessionsStore } from '@/stores/sessions.optimized';
import type { ChatSession, ChatMessage } from '@/types/session';
import { chatStorageService } from '@/services/storage/ChatStorageService';

/**
 * Optimierte Version des useChat-Composables
 * - Verwendet die optimierte Version des Sessions-Stores
 * - Implementiert Batching für Streaming-Updates
 * - Verbesserte Performance durch selektive Reaktivität
 * - Intelligente Speicherverwaltung für große Datensätze
 * - Unterstützt optimierte Offline-Funktionalität
 */
export function useOptimizedChat() {
  // Optimierten Store verwenden
  const sessionsStore = useSessionsStore();
  
  // Lokaler Zustand mit minimaler Reaktivität
  const inputText = ref('');
  const textChunks = ref<string[]>([]);
  const batchedContent = shallowRef('');
  
  // Streaming-Batch-Verarbeitung
  let streamBatchTimer: number | null = null;
  const batchInterval = 100; // Aktualisierungsintervall in ms
  
  // Computed Properties für reaktive Daten
  const isLoading = computed(() => sessionsStore.isLoading);
  const isStreaming = computed(() => sessionsStore.isStreaming);
  const error = computed(() => sessionsStore.error);
  const currentSessionId = computed(() => sessionsStore.currentSessionId);
  const currentSession = computed(() => sessionsStore.currentSession);
  const messages = computed(() => sessionsStore.currentMessages);
  const sessions = computed(() => sessionsStore.sortedSessions);
  
  /**
   * Lädt ältere Nachrichten aus dem Storage-Service
   */
  const loadOlderMessages = async (sessionId?: string): Promise<ChatMessage[]> => {
    const targetSessionId = sessionId || currentSessionId.value;
    if (!targetSessionId) return [];
    
    // Prüfen, ob Speicher-Service Daten für diese Session hat
    if (chatStorageService.hasStoredSession(targetSessionId)) {
      // Nachrichten aus dem Speicher-Service laden
      const olderMessages = chatStorageService.loadSessionMessages(targetSessionId);
      
      if (olderMessages.length > 0) {
        // Wenn Nachrichten geladen wurden, aktuelle Nachrichten aus dem Store abrufen
        const currentMessages = messages.value;
        
        // Sammlung aller Nachrichten erstellen und nach Zeitstempel sortieren
        const allMessages = [...olderMessages, ...currentMessages].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Mit dem Store synchronisieren
        await refreshCurrentSession();
        
        // Geladene Nachrichten zurückgeben
        return olderMessages;
      }
    }
    
    // Fallback auf die Store-Methode, wenn keine gespeicherten Nachrichten gefunden wurden
    return sessionsStore.loadOlderMessages(targetSessionId);
  };
  
  /**
   * Alle Sitzungen laden
   */
  const loadSessions = async (): Promise<void> => {
    await sessionsStore.synchronizeSessions();
  };
  
  /**
   * Zu einer bestimmten Sitzung wechseln
   */
  const switchToSession = async (sessionId: string): Promise<void> => {
    clearBatchedUpdates();
    await sessionsStore.setCurrentSession(sessionId);
  };
  
  /**
   * Neue Sitzung erstellen
   */
  const createNewSession = async (title?: string): Promise<string> => {
    clearBatchedUpdates();
    return await sessionsStore.createSession(title);
  };
  
  /**
   * Verarbeitet Nachrichten-Chunks in Batches
   */
  const processBatchedUpdates = (): void => {
    if (textChunks.value.length === 0) {
      return;
    }
    
    const combinedContent = textChunks.value.join('');
    batchedContent.value = combinedContent;
    textChunks.value = [];
  };
  
  /**
   * Löscht alle ausstehenden Batch-Updates
   */
  const clearBatchedUpdates = (): void => {
    textChunks.value = [];
    batchedContent.value = '';
    
    if (streamBatchTimer !== null) {
      window.clearInterval(streamBatchTimer);
      streamBatchTimer = null;
    }
  };
  
  /**
   * Nachricht senden mit optimiertem Streaming
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;
    
    // Streaming-Batch-Timer starten, falls noch nicht vorhanden
    if (streamBatchTimer === null) {
      streamBatchTimer = window.setInterval(processBatchedUpdates, batchInterval);
    }
    
    // Eingabefeld zurücksetzen
    inputText.value = '';
    textChunks.value = [];
    batchedContent.value = '';
    
    // Wenn keine aktive Session vorhanden ist, neue erstellen
    if (!currentSessionId.value) {
      const newSessionId = await createNewSession();
      await sessionsStore.setCurrentSession(newSessionId);
    }
    
    try {
      // Nachricht senden
      await sessionsStore.sendMessage({
        sessionId: currentSessionId.value!,
        content
      });
    } catch (err) {
      // Fehlerbehandlung
      console.error('Error sending message:', err);
      
      // Batch-Timer stoppen bei Fehler
      clearBatchedUpdates();
    }
  };
  
  /**
   * Streaming abbrechen
   */
  const cancelStream = (): void => {
    clearBatchedUpdates();
    sessionsStore.cancelStreaming();
  };
  
  /**
   * Session archivieren/löschen
   */
  const archiveSession = async (sessionId: string): Promise<void> => {
    await sessionsStore.archiveSession(sessionId);
    
    // Gespeicherte Daten für diese Session ebenfalls löschen
    chatStorageService.clearSessionStorage(sessionId);
  };
  
  /**
   * Session-Titel ändern
   */
  const renameSession = async (sessionId: string, newTitle: string): Promise<void> => {
    await sessionsStore.updateSessionTitle(sessionId, newTitle);
  };
  
  /**
   * Session anheften/lösen
   */
  const togglePinSession = async (sessionId: string): Promise<void> => {
    await sessionsStore.togglePinSession(sessionId);
  };
  
  /**
   * Nachricht löschen
   */
  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!currentSessionId.value) return;
    
    await sessionsStore.deleteMessage(currentSessionId.value, messageId);
  };
  
  /**
   * Nachricht wiederholen
   */
  const retryMessage = async (messageId: string): Promise<void> => {
    if (!currentSessionId.value) return;
    
    // Die zu wiederholende Nachricht finden
    const messageToRetry = messages.value.find(m => m.id === messageId);
    
    if (messageToRetry && messageToRetry.role === 'user') {
      // Die nächste Nachricht (Antwort) finden, falls vorhanden
      const messageIndex = messages.value.findIndex(m => m.id === messageId);
      
      if (messageIndex !== -1 && messageIndex + 1 < messages.value.length) {
        // Antwort löschen
        const responseMessage = messages.value[messageIndex + 1];
        if (responseMessage && responseMessage.role === 'assistant') {
          await sessionsStore.deleteMessage(currentSessionId.value, responseMessage.id);
        }
      }
      
      // Nachricht erneut senden
      await sendMessage(messageToRetry.content);
    }
  };
  
  /**
   * Aktuelle Session neu laden
   */
  const refreshCurrentSession = async (): Promise<void> => {
    if (currentSessionId.value) {
      await sessionsStore.refreshSession(currentSessionId.value);
    }
  };
  
  /**
   * Speichert ältere Nachrichten der aktuellen Session
   */
  const storeOlderMessages = (): void => {
    if (!currentSessionId.value || messages.value.length <= 0) return;
    
    // Älteren Nachrichten in den Speicher-Service auslagern
    chatStorageService.storeSessionMessages(currentSessionId.value, messages.value);
  };
  
  /**
   * Löscht abgelaufene oder unnötige Nachrichten aus dem Speicher
   */
  const cleanupStorage = async (): Promise<void> => {
    // Speicher-Optimierung durchführen
    const stats = chatStorageService.getStorageStats();
    
    // Wenn mehr als 80% des Speichers belegt sind, alte Session löschen
    if (stats.usedPercentage > 80) {
      chatStorageService.cleanupOldSessions(14); // Sessions älter als 14 Tage löschen
    }
  };
  
  // Watch für automatische Speicherbereinigung bei vielen Nachrichten
  watch(() => messages.value.length, (newLength) => {
    // Wenn die aktuelle Session viele Nachrichten hat, ältere auslagern
    if (newLength > 80) {
      storeOlderMessages();
    }
  });
  
  return {
    // Zustand
    inputText,
    batchedContent,
    isLoading,
    isStreaming,
    error,
    currentSessionId,
    currentSession,
    messages,
    sessions,
    
    // Methoden
    loadSessions,
    switchToSession,
    createNewSession,
    sendMessage,
    cancelStream,
    archiveSession,
    renameSession,
    togglePinSession,
    deleteMessage,
    retryMessage,
    refreshCurrentSession,
    loadOlderMessages,
    storeOlderMessages,
    cleanupStorage
  };
}