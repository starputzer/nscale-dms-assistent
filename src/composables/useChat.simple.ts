import { computed, ref } from "vue";
import type { ChatSession, ChatMessage } from "../types/session";
import type { UseChatReturn } from "../utils/composableTypes";

/**
 * Hook für Chat-Funktionen in Komponenten
 * Kapselt den Zugriff auf den Sessions-Store und bietet eine vereinfachte API
 *
 * @returns {UseChatReturn} Objekt mit Chat-Funktionen und reaktiven Eigenschaften
 */
export function useChat(): UseChatReturn {
  // Direct store import to fix build issues
  // @ts-ignore - Circular dependency workaround
  const sessionsStore = (window as any).__sessionsStore || null;

  // Lokaler Zustand für Benutzereingaben
  const inputText = ref("");

  // Computed Properties für reaktive Daten
  const isLoading = computed(() => sessionsStore?.isLoading || false);
  const isStreaming = computed(() => sessionsStore?.isStreaming || false);
  const error = computed(() => sessionsStore?.error || null);
  const currentSessionId = computed(() => sessionsStore?.currentSessionId || null);
  const currentSession = computed(() => sessionsStore?.currentSession || null);
  const messages = computed(() => sessionsStore?.currentMessages || []);
  const sessions = computed(() => sessionsStore?.sortedSessions || []);

  /**
   * Alle Sitzungen laden
   */
  const loadSessions = async (): Promise<void> => {
    if (sessionsStore?.synchronizeSessions) {
      await sessionsStore.synchronizeSessions();
    }
  };

  /**
   * Zu einer bestimmten Sitzung wechseln
   */
  const switchToSession = async (sessionId: string): Promise<void> => {
    if (sessionsStore?.setCurrentSession) {
      await sessionsStore.setCurrentSession(sessionId);
    }
  };

  /**
   * Neue Sitzung erstellen
   */
  const createNewSession = async (title?: string): Promise<string> => {
    if (sessionsStore?.createSession) {
      return await sessionsStore.createSession(title);
    }
    return "";
  };

  /**
   * Nachricht senden
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    // Wenn keine aktive Session vorhanden ist, neue erstellen
    if (!currentSessionId.value && sessionsStore) {
      const newSessionId = await createNewSession();
      await sessionsStore.setCurrentSession(newSessionId);
    }

    // Nachricht senden
    if (sessionsStore?.sendMessage) {
      await sessionsStore.sendMessage({
        sessionId: currentSessionId.value!,
        content,
      });
    }

    // Eingabefeld zurücksetzen
    inputText.value = "";
  };

  /**
   * Streaming abbrechen
   */
  const cancelStream = (): void => {
    if (sessionsStore?.cancelStreaming) {
      sessionsStore.cancelStreaming();
    }
  };

  /**
   * Session archivieren/löschen
   */
  const archiveSession = async (sessionId: string): Promise<void> => {
    if (sessionsStore?.archiveSession) {
      await sessionsStore.archiveSession(sessionId);
    }
  };

  /**
   * Session-Titel ändern
   */
  const renameSession = async (
    sessionId: string,
    newTitle: string,
  ): Promise<void> => {
    if (sessionsStore?.updateSessionTitle) {
      await sessionsStore.updateSessionTitle(sessionId, newTitle);
    }
  };

  /**
   * Session anheften/lösen
   */
  const togglePinSession = async (sessionId: string): Promise<void> => {
    if (sessionsStore?.togglePinSession) {
      await sessionsStore.togglePinSession(sessionId);
    }
  };

  /**
   * Nachricht löschen
   */
  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!currentSessionId.value || !sessionsStore) return;

    if (sessionsStore.deleteMessage) {
      await sessionsStore.deleteMessage(currentSessionId.value, messageId);
    }
  };

  /**
   * Aktuelle Session neu laden
   */
  const refreshCurrentSession = async (): Promise<void> => {
    if (currentSessionId.value && sessionsStore?.refreshSession) {
      await sessionsStore.refreshSession(currentSessionId.value);
    }
  };

  return {
    // Zustand
    inputText,
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
    refreshCurrentSession,
  };
}