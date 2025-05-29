import { computed, ref, shallowRef, toRefs } from "vue";
import { useSessionsStore } from "@/stores/sessions";
import { useUIStore } from "@/stores/ui";
import type { ChatSession, ChatMessage } from "@/types/session";
import {
  StreamingService,
  createStreamingConnection,
} from "@/services/api/StreamingService";

/**
 * Erweiterte Eigenschaften für den Session-Entwurfsspeicher
 */
interface SessionDrafts {
  [sessionId: string]: string;
}

/**
 * Erweiterte Chat-Funktionen mit verbessertem Streaming, Entwurfsverwaltung und mehr
 * Baut auf den Sessions-Store auf und bietet eine umfassende API für Chat-Komponenten
 *
 * Optimiert mit:
 * - storeToRefs für effiziente Pinia-Store-Zugriffe
 * - shallowRef für komplexe Objekte und Arrays
 * - Memoization wichtiger Berechnungen
 * - Selektive Reaktivität mit toRefs
 */
export function useEnhancedChat() {
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();

  // Since the store already returns refs, we can destructure them directly
  // No need for storeToRefs when the store returns refs
  const {
    isLoading,
    isStreaming,
    error,
    currentSessionId,
    currentSession,
    currentMessages,
    sortedSessions,
  } = sessionsStore;

  // Reaktiver Zustand - primitive Werte mit ref
  const inputText = ref("");
  const isEditing = ref(false);
  const editingMessageId = ref<string | null>(null);
  const isSending = ref(false);

  // Komplexe Objekte mit shallowRef für bessere Performance
  // ShallowRef erzeugt nur Reaktivität an der obersten Ebene, nicht tief im Objekt
  const sessionDrafts = shallowRef<SessionDrafts>({});
  const streamingServices = shallowRef<Map<string, StreamingService>>(
    new Map(),
  );

  // Performance-Cache für teure Berechnungen
  const computedCache = shallowRef(new Map<string, any>());

  // Derived computed properties
  // Filter-Operationen mit Memoization für bessere Performance
  const messages = computed(() => currentMessages.value);
  const sessions = computed(() => sortedSessions.value);

  // Optimierte Berechnungen mit Memoization
  const pinnedSessions = computed(() => {
    const cacheKey = `pinnedSessions:${sessions.value.length}`;
    if (computedCache.value.has(cacheKey)) {
      return computedCache.value.get(cacheKey);
    }

    const result = sessions.value.filter((s) => s.isPinned);
    computedCache.value.set(cacheKey, result);
    return result;
  });

  const recentSessions = computed(() => {
    const cacheKey = `recentSessions:${sessions.value.length}`;
    if (computedCache.value.has(cacheKey)) {
      return computedCache.value.get(cacheKey);
    }

    const result = sessions.value.filter((s) => !s.isPinned);
    computedCache.value.set(cacheKey, result);
    return result;
  });

  // Lade den gespeicherten Entwurf für die aktuelle Sitzung
  const currentDraft = computed(() => {
    if (!currentSessionId.value) return "";
    return sessionDrafts.value[currentSessionId.value] || "";
  });

  // Streaming-Nachricht für die aktuelle Sitzung - mit Memoization
  const streamingMessage = computed(() => {
    if (!isStreaming.value || !currentSessionId.value) return null;

    const cacheKey = `streamingMessage:${messages.value.length}:${isStreaming.value}`;
    if (computedCache.value.has(cacheKey)) {
      return computedCache.value.get(cacheKey);
    }

    // Suche nach der gerade streamenden Nachricht
    const result = messages.value.find((msg) => msg.isStreaming) || null;
    computedCache.value.set(cacheKey, result);
    return result;
  });

  // Cache zurücksetzen bei wichtigen Zustandsänderungen
  function resetCache() {
    computedCache.value.clear();
  }

  /**
   * Alle Sitzungen laden
   */
  const loadSessions = async (): Promise<void> => {
    try {
      await sessionsStore.synchronizeSessions();
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Laden der Sitzungen");
    }
  };

  /**
   * Nachrichten für eine bestimmte Sitzung laden
   */
  const loadMessages = async (sessionId: string): Promise<void> => {
    if (!sessionId) return;

    try {
      await sessionsStore.fetchMessages(sessionId);
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Laden der Nachrichten");
    }
  };

  /**
   * Zu einer bestimmten Sitzung wechseln
   */
  const switchToSession = async (sessionId: string): Promise<void> => {
    if (!sessionId || sessionId === currentSessionId.value) return;

    try {
      // Speichere aktuellen Entwurf
      if (currentSessionId.value && inputText.value) {
        // Selektives Update des sessionDrafts-Objekts
        const newDrafts = { ...sessionDrafts.value };
        newDrafts[currentSessionId.value] = inputText.value;
        sessionDrafts.value = newDrafts;
      }

      // Wechsle Session
      await sessionsStore.setCurrentSession(sessionId);

      // Prüfe, ob Nachrichten für diese Sitzung geladen werden müssen
      if (
        !sessionsStore.messages[sessionId] ||
        sessionsStore.messages[sessionId].length === 0
      ) {
        await loadMessages(sessionId);
      }

      // Lade gespeicherten Entwurf
      inputText.value = sessionDrafts.value[sessionId] || "";

      // Bearbeitungsmodus zurücksetzen
      isEditing.value = false;
      editingMessageId.value = null;

      // Cache zurücksetzen
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Wechseln der Sitzung");
    }
  };

  /**
   * Neue Sitzung erstellen
   */
  const createNewSession = async (title?: string): Promise<string> => {
    try {
      const result = await sessionsStore.createSession(title);
      resetCache();
      return result;
    } catch (error) {
      handleError(error as Error, "Fehler beim Erstellen einer neuen Sitzung");
      return "";
    }
  };

  /**
   * Nachricht senden mit erweiterten Optionen
   */
  const sendMessage = async (
    sessionId: string,
    content: string,
    options: { isRetry?: boolean; parentMessageId?: string } = {},
  ): Promise<string> => {
    if (!content.trim() || !sessionId) {
      return "";
    }

    isSending.value = true;

    try {
      // Nachricht an den Store übergeben
      const messageId = await sessionsStore.sendMessage({
        sessionId,
        content,
        isRetry: options.isRetry,
        parentMessageId: options.parentMessageId,
      });

      // Entwurf für diese Sitzung löschen
      const newDrafts = { ...sessionDrafts.value };
      delete newDrafts[sessionId];
      sessionDrafts.value = newDrafts;

      // Eingabefeld nur zurücksetzen, wenn es keine Bearbeitung ist
      if (sessionId === currentSessionId.value && !isEditing.value) {
        inputText.value = "";
      }

      // Bearbeitungsmodus zurücksetzen
      isEditing.value = false;
      editingMessageId.value = null;

      // Cache zurücksetzen
      resetCache();

      return messageId;
    } catch (error) {
      handleError(error as Error, "Fehler beim Senden der Nachricht");
      return "";
    } finally {
      isSending.value = false;
    }
  };

  /**
   * Nachricht erneut senden (Retry)
   */
  const retryMessage = async (
    sessionId: string,
    messageId: string,
  ): Promise<void> => {
    if (!sessionId || !messageId) return;

    try {
      // Finde die Nachricht, die wiederholt werden soll
      const sessionMessages = sessionsStore.messages[sessionId] || [];
      const messageToRetry = sessionMessages.find(
        (msg) => msg.id === messageId,
      );

      if (!messageToRetry) {
        throw new Error("Nachricht nicht gefunden");
      }

      // Bei Benutzernachricht: Diese und folgende Nachricht erneut senden
      if (messageToRetry.role === "user") {
        await sendMessage(sessionId, messageToRetry.content, { isRetry: true });
      }
      // Bei Assistentennachricht: Vorherige Benutzernachricht erneut senden
      else if (messageToRetry.role === "assistant") {
        const index = sessionMessages.findIndex((msg) => msg.id === messageId);
        if (index > 0) {
          const previousMessage = sessionMessages[index - 1];
          if (previousMessage.role === "user") {
            await sendMessage(sessionId, previousMessage.content, {
              isRetry: true,
              parentMessageId: previousMessage.id,
            });
          }
        }
      }

      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim erneuten Senden der Nachricht");
    }
  };

  /**
   * Nachricht bearbeiten
   */
  const editMessage = async (
    sessionId: string,
    messageId: string,
    newContent: string,
  ): Promise<void> => {
    if (!sessionId || !messageId || !newContent.trim()) return;

    try {
      // Nachricht im Store aktualisieren
      await sessionsStore.updateMessage(sessionId, messageId, {
        content: newContent,
      });

      // Wenn es eine Benutzernachricht ist, auch eine neue Antwort generieren
      const sessionMessages = sessionsStore.messages[sessionId] || [];
      const editedMessage = sessionMessages.find((msg) => msg.id === messageId);

      if (editedMessage?.role === "user") {
        // Finde die nächste Assistentennachricht nach dieser und entferne sie (und alle folgenden)
        const index = sessionMessages.findIndex((msg) => msg.id === messageId);
        if (index !== -1 && index < sessionMessages.length - 1) {
          const nextMessage = sessionMessages[index + 1];
          if (nextMessage.role === "assistant") {
            // Nachricht löschen und dann eine neue Antwort generieren
            await sessionsStore.deleteMessage(sessionId, nextMessage.id);

            // Neue Antwort anfordern
            await sendMessage(sessionId, newContent, {
              isRetry: true,
              parentMessageId: messageId,
            });
          }
        }
      }

      // Bearbeitungsmodus zurücksetzen
      isEditing.value = false;
      editingMessageId.value = null;
      inputText.value = "";

      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Bearbeiten der Nachricht");
    }
  };

  /**
   * Nachricht löschen
   */
  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!currentSessionId.value || !messageId) return;

    try {
      await sessionsStore.deleteMessage(currentSessionId.value, messageId);
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Löschen der Nachricht");
    }
  };

  /**
   * Streaming-Generierung stoppen
   */
  const stopGeneration = (): void => {
    sessionsStore.cancelStreaming();

    // Zusätzlich alle StreamingService-Instanzen beenden
    if (currentSessionId.value) {
      const service = streamingServices.value.get(currentSessionId.value);
      if (service) {
        service.close();

        // Optimierte Map-Aktualisierung
        const newServices = new Map(streamingServices.value);
        newServices.delete(currentSessionId.value);
        streamingServices.value = newServices;
      }
    }

    // Globales Abbrechen-Event auslösen
    window.dispatchEvent(new CustomEvent("cancel-streaming"));

    resetCache();
  };

  /**
   * Sitzung archivieren/löschen
   */
  const archiveSession = async (sessionId: string): Promise<void> => {
    try {
      await sessionsStore.archiveSession(sessionId);

      // Entwurf löschen
      const newDrafts = { ...sessionDrafts.value };
      delete newDrafts[sessionId];
      sessionDrafts.value = newDrafts;

      // Wenn die aktuelle Sitzung gelöscht wurde, zur ersten verfügbaren wechseln
      if (sessionId === currentSessionId.value && sessions.value.length > 0) {
        switchToSession(sessions.value[0].id);
      }

      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Archivieren der Sitzung");
    }
  };

  /**
   * Sitzung umbenennen
   */
  const renameSession = async (
    sessionId: string,
    newTitle: string,
  ): Promise<void> => {
    if (!sessionId || !newTitle.trim()) return;

    try {
      await sessionsStore.updateSessionTitle(sessionId, newTitle);
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Umbenennen der Sitzung");
    }
  };

  /**
   * Sitzung anheften/lösen
   */
  const togglePinSession = async (sessionId: string): Promise<void> => {
    if (!sessionId) return;

    try {
      await sessionsStore.togglePinSession(sessionId);
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Anheften/Lösen der Sitzung");
    }
  };

  /**
   * Aktuelle Sitzung neu laden
   */
  const refreshCurrentSession = async (): Promise<void> => {
    if (!currentSessionId.value) return;

    try {
      await sessionsStore.refreshSession(currentSessionId.value);
      resetCache();
    } catch (error) {
      handleError(error as Error, "Fehler beim Neuladen der Sitzung");
    }
  };

  /**
   * Ältere Nachrichten für eine Sitzung laden
   */
  const loadOlderMessages = (sessionId: string): ChatMessage[] => {
    if (!sessionId) return [];

    try {
      const result = sessionsStore.loadOlderMessages(sessionId);
      resetCache();
      return result;
    } catch (error) {
      handleError(error as Error, "Fehler beim Laden älterer Nachrichten");
      return [];
    }
  };

  /**
   * Entwurf aktualisieren
   */
  const updateDraft = (sessionId: string, content: string): void => {
    if (!sessionId) return;

    // Immutable Update des Drafts-Objekts
    const newDrafts = { ...sessionDrafts.value };
    newDrafts[sessionId] = content;
    sessionDrafts.value = newDrafts;
  };

  /**
   * In den Bearbeitungsmodus für eine Nachricht wechseln
   */
  const startEditingMessage = (messageId: string): void => {
    if (!currentSessionId.value || !messageId) return;

    const sessionMessages =
      sessionsStore.messages[currentSessionId.value] || [];
    const messageToEdit = sessionMessages.find((msg) => msg.id === messageId);

    if (messageToEdit) {
      isEditing.value = true;
      editingMessageId.value = messageId;
      inputText.value = messageToEdit.content;
    }
  };

  /**
   * Bearbeitungsmodus beenden
   */
  const cancelEditingMessage = (): void => {
    isEditing.value = false;
    editingMessageId.value = null;

    // Entwurf wiederherstellen
    if (currentSessionId.value) {
      inputText.value = sessionDrafts.value[currentSessionId.value] || "";
    } else {
      inputText.value = "";
    }
  };

  /**
   * Fehlerbehandlung
   */
  const handleError = (error: Error, message: string): void => {
    console.error(`${message}:`, error);
    uiStore.showError(message);
  };

  // Rückgabe-Objekt mit toRefs für bessere Reaktivität
  // Das verhindert, dass alle Komponenten neu gerendert werden, wenn sich nur ein Wert ändert
  const state = {
    inputText,
    isLoading,
    isStreaming,
    isEditing,
    editingMessageId,
    isSending,
    error,
    currentSessionId,
    currentSession,
    messages,
    sessions,
    pinnedSessions,
    recentSessions,
    currentDraft,
    streamingMessage,
  };

  return {
    ...toRefs(state),

    // Methoden werden nicht mit toRefs umgewandelt
    loadSessions,
    loadMessages,
    switchToSession,
    createNewSession,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    stopGeneration,
    archiveSession,
    renameSession,
    togglePinSession,
    refreshCurrentSession,
    loadOlderMessages,
    updateDraft,
    startEditingMessage,
    cancelEditingMessage,
  };
}
