import { computed, ref } from "vue";
import { useSessionsStore } from "../stores/sessions";
import type { ChatSession, ChatMessage } from "../types/session";
import type { UseChatReturn } from "../utils/composableTypes";

/**
 * Hook für Chat-Funktionen in Komponenten
 * Kapselt den Zugriff auf den Sessions-Store und bietet eine vereinfachte API
 *
 * @returns {UseChatReturn} Objekt mit Chat-Funktionen und reaktiven Eigenschaften
 */
export function useChat(): UseChatReturn {
  const sessionsStore = useSessionsStore();

  // Lokaler Zustand für Benutzereingaben
  const inputText = ref("");

  // Computed Properties für reaktive Daten
  const isLoading = computed(() => sessionsStore.isLoading);
  const isStreaming = computed(() => sessionsStore.isStreaming);
  const error = computed(() => sessionsStore.error);
  const currentSessionId = computed(() => sessionsStore.currentSessionId);
  const currentSession = computed(() => sessionsStore.currentSession);
  const messages = computed(() => sessionsStore.currentMessages);
  const sessions = computed(() => sessionsStore.sortedSessions);

  /**
   * Alle Sitzungen laden
   */
  const loadSessions = async (): Promise<void> => {
    await sessionsStore.fetchSessions();
  };

  /**
   * Zu einer bestimmten Sitzung wechseln
   */
  const switchToSession = async (sessionId: string): Promise<void> => {
    await sessionsStore.setCurrentSession(sessionId);
  };

  /**
   * Neue Sitzung erstellen
   */
  const createNewSession = async (title?: string): Promise<string> => {
    return await sessionsStore.createSession(title);
  };

  /**
   * Nachricht senden
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    // Wenn keine aktive Session vorhanden ist, neue erstellen
    if (!currentSessionId.value) {
      const newSessionId = await createNewSession();
      await sessionsStore.setCurrentSession(newSessionId);
    }

    // Nachricht senden
    await sessionsStore.sendMessage({
      sessionId: currentSessionId.value!,
      content,
    });

    // Eingabefeld zurücksetzen
    inputText.value = "";
  };

  /**
   * Streaming abbrechen
   */
  const cancelStream = (): void => {
    sessionsStore.cancelStreaming();
  };

  /**
   * Session archivieren/löschen
   */
  const archiveSession = async (sessionId: string): Promise<void> => {
    await sessionsStore.archiveSession(sessionId);
  };

  /**
   * Session-Titel ändern
   */
  const renameSession = async (
    sessionId: string,
    newTitle: string,
  ): Promise<void> => {
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
   * Aktuelle Session neu laden
   */
  const refreshCurrentSession = async (): Promise<void> => {
    if (currentSessionId.value) {
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
