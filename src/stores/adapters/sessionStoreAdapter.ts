/**
 * SessionStoreAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des Sessions-Stores
 *
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { useSessionsStore } from "../sessions";
import type { ChatSession, ChatMessage } from "@/types/session";
import type { ISessionsStore } from "@/types/stores";

// Store-Interface mit zurückkompatiblen Methoden
export interface SessionStoreWithCompat extends ISessionsStore {
  // Ältere API-Methoden, die in neueren Versionen anders heißen oder fehlen
  deleteSession(sessionId: string): Promise<void>;
  renameSession(sessionId: string, newTitle: string): Promise<void>;
  setCurrentSession(sessionId: string): Promise<void>;
  createSession(title?: string): Promise<string | ChatSession>;
  updateSession(sessionId: string, data: Partial<ChatSession>): Promise<void>;
  togglePinSession(sessionId: string, isPinned?: boolean): Promise<void>;
}

/**
 * Erstellt einen Sessions-Store mit kompatiblen Methoden
 * für verschiedene Versionen der API
 */
export function useSessionsStoreCompat(): SessionStoreWithCompat {
  const store = useSessionsStore();

  // Erweitere den Store mit kompatiblen Methoden
  return {
    ...store,

    // deleteSession kann archiveSession sein
    deleteSession: async (sessionId: string): Promise<void> => {
      if (typeof store.deleteSession === "function") {
        return store.deleteSession(sessionId);
      }
      return store.archiveSession(sessionId);
    },

    // renameSession kann updateSessionTitle sein
    renameSession: async (
      sessionId: string,
      newTitle: string,
    ): Promise<void> => {
      if (typeof store.renameSession === "function") {
        return store.renameSession(sessionId, newTitle);
      }
      return store.updateSessionTitle(sessionId, newTitle);
    },

    // createSession kann unterschiedliche Rückgabetypen haben
    createSession: async (title?: string): Promise<string | ChatSession> => {
      if (typeof store.createSession === "function") {
        return store.createSession(title);
      }
      return store.createNewSession(title);
    },

    // updateSession kann fehlen
    updateSession: async (
      sessionId: string,
      data: Partial<ChatSession>,
    ): Promise<void> => {
      if (typeof store.updateSession === "function") {
        return store.updateSession(sessionId, data);
      }
      // Fallback: Einzelne Update-Operationen für jedes Feld
      const updates: Promise<void>[] = [];

      if (data.title !== undefined) {
        updates.push(store.updateSessionTitle(sessionId, data.title));
      }

      if (data.isPinned !== undefined) {
        updates.push(store.togglePinSession(sessionId));
      }

      if (data.isArchived !== undefined) {
        updates.push(store.toggleArchiveSession(sessionId, data.isArchived));
      }

      await Promise.all(updates);
    },

    // setCurrentSession ist loadSession in älteren Versionen
    setCurrentSession: async (sessionId: string): Promise<void> => {
      if (typeof store.setCurrentSession === "function") {
        return store.setCurrentSession(sessionId);
      }

      if (typeof store.loadSession === "function") {
        return store.loadSession(sessionId);
      }

      // Notfall-Fallback
      console.warn(
        "Keine passende setCurrentSession/loadSession Methode gefunden",
      );
      store.currentSessionId = sessionId;
    },

    // togglePinSession kann unterschiedliche Parameter haben
    togglePinSession: async (
      sessionId: string,
      isPinned?: boolean,
    ): Promise<void> => {
      if (typeof store.togglePinSession === "function") {
        if (isPinned !== undefined) {
          return store.togglePinSession(sessionId, isPinned);
        }
        return store.togglePinSession(sessionId);
      }
      return Promise.reject(new Error("togglePinSession nicht verfügbar"));
    },
  };
}

// Cached store instance
let cachedStore: SessionStoreWithCompat | null = null;

// Factory function to get the store instance
export function getSessionStoreCompat(): SessionStoreWithCompat {
  if (!cachedStore) {
    cachedStore = useSessionsStoreCompat();
  }
  return cachedStore;
}
