/**
 * Composable für die Integration von Chat-Funktionalität mit der Bridge
 *
 * Dieses Composable ermöglicht eine nahtlose Kommunikation zwischen der
 * Vue 3-basierten Chat-Oberfläche und der Vanilla JS-Implementierung
 * über die Enhanced Bridge.
 */

import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  getCurrentInstance,
} from "vue";
import { useBridge } from "@/bridge/enhanced";
import { useChat } from "@/composables/useChat";
// Import sessions store
import { useSessionsStore } from "@/stores/sessions";
import type { Message, Session } from "@/types/session";

/**
 * Composable für die Bridge-Chat-Integration
 */
export function useBridgeChat() {
  // Bridge API
  const bridge = useBridge();

  // Session-Store
  const sessionStore = useSessionsStore();

  // Standard-Chat-Composable
  const { messages, isLoading, isStreaming, sendMessage } = useChat();

  // Lokale Refs für fehlende Werte
  const isSending = ref(false);
  const streamingMessage = ref(null);

  // Synchronisierungsstatus
  const isSyncing = ref(false);
  const lastSyncTime = ref(Date.now());

  // Stub-Implementierungen für fehlende Funktionen
  const loadMessages = async () => {
    // Implementierung folgt
  };

  const editMessage = async (messageId: string, newContent: string) => {
    // Implementierung folgt
  };

  const retryMessage = async (messageId: string) => {
    // Implementierung folgt
  };

  const stopGeneration = async () => {
    // Implementierung folgt
  };

  // Prüfen, ob wir innerhalb einer Vue-Komponente sind
  const instance = getCurrentInstance();

  // Bridge-Events immer registrieren, damit das Composable auch außerhalb von Komponenten funktioniert
  // Von Vanilla JS
  bridge.on("vanillaChat:sendMessage", handleVanillaSendMessage);
  bridge.on("vanillaChat:editMessage", handleVanillaEditMessage);
  bridge.on("vanillaChat:retryMessage", handleVanillaRetryMessage);
  bridge.on("vanillaChat:loadSession", handleVanillaLoadSession);
  bridge.on("vanillaChat:createSession", handleVanillaCreateSession);
  bridge.on("vanillaChat:deleteSession", handleVanillaDeleteSession);
  bridge.on("vanillaChat:stopGeneration", handleVanillaStopGeneration);

  // Initialen Status senden
  syncToVanilla();

  // Lifecycle-Hooks nur innerhalb einer Komponente registrieren
  if (instance) {
    // Nach dem Komponenten-Mount
    onMounted(() => {
      // Nichts zusätzlich zu tun, da Events bereits registriert sind
    });

    // Cleanup beim Komponenten-Unmount
    onUnmounted(() => {
      bridge.off("vanillaChat:sendMessage", handleVanillaSendMessage);
      bridge.off("vanillaChat:editMessage", handleVanillaEditMessage);
      bridge.off("vanillaChat:retryMessage", handleVanillaRetryMessage);
      bridge.off("vanillaChat:loadSession", handleVanillaLoadSession);
      bridge.off("vanillaChat:createSession", handleVanillaCreateSession);
      bridge.off("vanillaChat:deleteSession", handleVanillaDeleteSession);
      bridge.off("vanillaChat:stopGeneration", handleVanillaStopGeneration);
    });
  }

  // Änderungen an Nachrichten beobachten und zur Vanilla-Seite synchronisieren
  watch(
    messages,
    () => {
      if (!isSyncing.value) {
        syncToVanilla();
      }
    },
    { deep: true },
  );

  /**
   * Nachricht von Vanilla-Seite senden
   */
  async function handleVanillaSendMessage(data: {
    content: string;
    sessionId: string;
  }) {
    try {
      await sendMessage(data.sessionId, data.content);
    } catch (error) {
      console.error("Fehler beim Senden der Nachricht von Vanilla JS:", error);
      bridge.emit("vueChat:error", {
        action: "sendMessage",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Nachricht von Vanilla-Seite bearbeiten
   */
  async function handleVanillaEditMessage(data: {
    messageId: string;
    content: string;
    sessionId: string;
  }) {
    try {
      await editMessage(data.sessionId, data.messageId, data.content);
    } catch (error) {
      console.error(
        "Fehler beim Bearbeiten der Nachricht von Vanilla JS:",
        error,
      );
      bridge.emit("vueChat:error", {
        action: "editMessage",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Nachricht von Vanilla-Seite erneut senden
   */
  async function handleVanillaRetryMessage(data: {
    messageId: string;
    sessionId: string;
  }) {
    try {
      await retryMessage(data.sessionId, data.messageId);
    } catch (error) {
      console.error(
        "Fehler beim erneuten Senden der Nachricht von Vanilla JS:",
        error,
      );
      bridge.emit("vueChat:error", {
        action: "retryMessage",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Session von Vanilla-Seite laden
   */
  async function handleVanillaLoadSession(data: { sessionId: string }) {
    try {
      await loadMessages(data.sessionId);
      sessionStore.setActiveSession(data.sessionId);
    } catch (error) {
      console.error("Fehler beim Laden der Session von Vanilla JS:", error);
      bridge.emit("vueChat:error", {
        action: "loadSession",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Neue Session von Vanilla-Seite erstellen
   */
  async function handleVanillaCreateSession() {
    try {
      const session = await sessionStore.createSession();
      bridge.emit("vueChat:sessionCreated", { sessionId: session.id });
      return session;
    } catch (error) {
      console.error(
        "Fehler beim Erstellen einer Session von Vanilla JS:",
        error,
      );
      bridge.emit("vueChat:error", {
        action: "createSession",
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Session von Vanilla-Seite löschen
   */
  async function handleVanillaDeleteSession(data: { sessionId: string }) {
    try {
      await sessionStore.deleteSession(data.sessionId);
      bridge.emit("vueChat:sessionDeleted", { sessionId: data.sessionId });
    } catch (error) {
      console.error("Fehler beim Löschen der Session von Vanilla JS:", error);
      bridge.emit("vueChat:error", {
        action: "deleteSession",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Generierung von Vanilla-Seite stoppen
   */
  function handleVanillaStopGeneration() {
    try {
      stopGeneration();
      bridge.emit("vueChat:generationStopped", {});
    } catch (error) {
      console.error(
        "Fehler beim Stoppen der Generierung von Vanilla JS:",
        error,
      );
      bridge.emit("vueChat:error", {
        action: "stopGeneration",
        error: (error as Error).message,
      });
    }
  }

  /**
   * Status zur Vanilla-Seite synchronisieren
   */
  function syncToVanilla() {
    isSyncing.value = true;
    lastSyncTime.value = Date.now();

    try {
      // Nachrichten synchronisieren
      bridge.emit("vueChat:messagesUpdated", {
        messages: messages.value,
        timestamp: lastSyncTime.value,
      });

      // Status synchronisieren
      bridge.emit("vueChat:statusUpdated", {
        isLoading: isLoading.value,
        isSending: isSending.value,
        hasStreamingMessage: !!streamingMessage.value,
        timestamp: lastSyncTime.value,
      });

      // Sessions synchronisieren
      bridge.emit("vueChat:sessionsUpdated", {
        sessions: sessionStore.sessions || [],
        activeSessionId:
          sessionStore.currentSession?.id || sessionStore.currentSessionId,
        timestamp: lastSyncTime.value,
      });
    } catch (error) {
      console.error(
        "Fehler bei der Synchronisierung zur Vanilla-Seite:",
        error,
      );
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Bridge-Verbindung zu Vanilla JS testen
   */
  function testBridgeConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 500);

      bridge.emit("vueChat:pingVanilla", { timestamp: Date.now() });

      const handler = () => {
        clearTimeout(timeout);
        bridge.off("vanillaChat:pong", handler);
        resolve(true);
      };

      bridge.on("vanillaChat:pong", handler);
    });
  }

  return {
    // Original-Chat-Funktionalität
    messages,
    isLoading,
    isSending,
    streamingMessage,
    sendMessage,
    loadMessages,
    editMessage,
    retryMessage,
    stopGeneration,

    // Bridge-spezifische Funktionalität
    isSyncing,
    lastSyncTime,
    syncToVanilla,
    testBridgeConnection,
  };
}

export default useBridgeChat;
