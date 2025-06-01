import { computed, ref } from "vue";
import type { ChatSession, ChatMessage } from "../types/session";
import type { UseChatReturn } from "../utils/composableTypes";

/**
 * Hook für Chat-Funktionen in Komponenten
 * Emergency stub version to fix circular dependency
 *
 * @returns {UseChatReturn} Objekt mit Chat-Funktionen und reaktiven Eigenschaften
 */
export function useChat(): UseChatReturn {
  // State
  const inputText = ref("");
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const currentSessionId = ref<string | null>(null);
  const currentSession = ref<ChatSession | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const sessions = ref<ChatSession[]>([]);

  // Methods - all stubbed
  const loadSessions = async (): Promise<void> => {
    console.log("useChat: loadSessions called (stub)");
  };

  const switchToSession = async (sessionId: string): Promise<void> => {
    console.log("useChat: switchToSession called (stub)", sessionId);
    currentSessionId.value = sessionId;
  };

  const createNewSession = async (title?: string): Promise<string> => {
    console.log("useChat: createNewSession called (stub)", title);
    const id = `session-${Date.now()}`;
    currentSessionId.value = id;
    return id;
  };

  const sendMessage = async (content: string): Promise<void> => {
    console.log("useChat: sendMessage called (stub)", content);
    inputText.value = "";
  };

  const cancelStream = (): void => {
    console.log("useChat: cancelStream called (stub)");
  };

  const archiveSession = async (sessionId: string): Promise<void> => {
    console.log("useChat: archiveSession called (stub)", sessionId);
  };

  const renameSession = async (sessionId: string, newTitle: string): Promise<void> => {
    console.log("useChat: renameSession called (stub)", sessionId, newTitle);
  };

  const togglePinSession = async (sessionId: string): Promise<void> => {
    console.log("useChat: togglePinSession called (stub)", sessionId);
  };

  const deleteMessage = async (messageId: string): Promise<void> => {
    console.log("useChat: deleteMessage called (stub)", messageId);
  };

  const refreshCurrentSession = async (): Promise<void> => {
    console.log("useChat: refreshCurrentSession called (stub)");
  };

  return {
    // State
    inputText,
    isLoading: computed(() => isLoading.value),
    isStreaming: computed(() => isStreaming.value),
    error: computed(() => error.value),
    currentSessionId: computed(() => currentSessionId.value),
    currentSession: computed(() => currentSession.value),
    messages: computed(() => messages.value),
    sessions: computed(() => sessions.value),

    // Methods
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