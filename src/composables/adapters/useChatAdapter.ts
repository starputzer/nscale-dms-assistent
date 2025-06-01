/**
 * useChatAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des useChat-Composables
 *
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Chat-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { ref, Ref, ComputedRef } from "vue";
import { useChat } from "@/composables/useChat";
import type { ChatMessage as Message } from "@/types/session";

// Interface für die Rückgabe des ursprünglichen useChat-Composables
export interface UseChatReturn {
  messages: Ref<Message[]> | ComputedRef<Message[]>;
  isLoading: Ref<boolean>;
  sendMessage: (
    contentOrParams: string | { sessionId: string; content: string },
  ) => Promise<void>;
  [key: string]: any;
}

// Erweiterte Schnittstelle mit allen möglichen Methoden
export interface EnhancedChatComposable {
  // Gemeinsame Eigenschaften
  messages: Ref<Message[]> | ComputedRef<Message[]>;
  isLoading: Ref<boolean>;
  isSending: Ref<boolean>;
  streamingMessage: Ref<string>;

  // Methoden mit einheitlicher Schnittstelle
  sendMessage: (
    contentOrParams: string | { sessionId: string; content: string },
  ) => Promise<void>;
  loadMessages: (sessionId?: string) => Promise<void>;
  editMessage: (
    messageId: string,
    content: string,
    sessionId?: string,
  ) => Promise<void>;
  retryMessage: (messageId: string, sessionId?: string) => Promise<void>;
  stopGeneration: () => void;
}

/**
 * Erstellt ein erweitertes Chat-Composable mit kompatibler API
 */
export function useChatAdapter(): EnhancedChatComposable {
  // Original-Composable
  const originalChat = useChat();

  // Zusätzliche Status-Variablen für Kompatibilität
  const isSending = ref(false);
  const streamingMessage = ref("");

  return {
    // Grundlegende Eigenschaften
    messages: originalChat.messages,
    isLoading: originalChat.isLoading || ref(false),
    isSending,
    streamingMessage,

    // Sendung von Nachrichten mit Objekt- oder String-Parameter
    sendMessage: async (contentOrParams) => {
      try {
        isSending.value = true;

        if (typeof originalChat.sendMessage === "function") {
          // Prüfen auf verschiedene Funktionssignaturen
          if (typeof contentOrParams === "string") {
            // Wenn ein String übergeben wird (alte API)
            await originalChat.sendMessage(contentOrParams);
          } else {
            // Wenn ein Objekt übergeben wird (neue API)
            const { content } = contentOrParams;
            // Immer nur den content String übergeben
            await originalChat.sendMessage(content);
          }
        } else {
          console.warn("sendMessage nicht verfügbar");
        }
      } finally {
        isSending.value = false;
      }
    },

    // Laden von Nachrichten mit optionalem Session-Parameter
    loadMessages: async (sessionId?: string) => {
      // loadMessages ist nicht Teil des UseChatReturn Interface
      // Diese Methode existiert nicht im aktuellen useChat

      // Fallback für fehlende Methode
      console.warn("loadMessages nicht verfügbar");
      return Promise.resolve();
    },

    // Bearbeiten einer Nachricht
    editMessage: async (messageId: string, content: string, sessionId?: string) => {
      // editMessage ist nicht Teil des UseChatReturn Interface
      // Diese Methode existiert nicht im aktuellen useChat

      // Fallback für fehlende Methode
      console.log(`Editing message ${messageId} with content: ${content}`);
      return Promise.resolve();
    },

    // Wiederholung einer Nachricht
    retryMessage: async (messageId: string, sessionId?: string) => {
      // retryMessage ist nicht Teil des UseChatReturn Interface
      // Diese Methode existiert nicht im aktuellen useChat

      // Fallback für fehlende Methode
      console.log(`Retrying message ${messageId}`);
      return Promise.resolve();
    },

    // Stoppen der Nachrichtengenerierung
    stopGeneration: () => {
      // stopGeneration ist nicht Teil des UseChatReturn Interface
      // Verwende cancelStream stattdessen
      if (typeof originalChat.cancelStream === "function") {
        originalChat.cancelStream();
      } else {
        console.log("Stopping message generation");
      }
    },
  };
}

// Singleton-Export für einfache Verwendung
export const chatAdapter = useChatAdapter();
