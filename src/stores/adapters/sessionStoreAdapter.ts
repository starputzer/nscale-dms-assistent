/**
 * SessionStoreAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des Sessions-Stores
 *
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { useSessionsStore } from "../sessions";
import type { ChatSession } from "@/types/session";
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

  // Erstelle ein kompatibles Store-Objekt
  // Wir können nicht einfach den Store spreaden, da Pinia Stores reactive sind
  return {
    // State properties
    get sessions() { return store.sessions; },
    get currentSessionId() { return store.currentSessionId; },
    get messages() { return store.messages; },
    get streaming() { return store.streaming; },
    get isLoading() { return store.isLoading; },
    get error() { return store.error; },
    get version() { return store.version; },
    get pendingMessages() { return store.pendingMessages; },
    get syncStatus() { return store.syncStatus; },
    get availableTags() { return store.availableTags; },
    get availableCategories() { return store.availableCategories; },
    get selectedSessionIds() { return store.selectedSessionIds; },
    
    // Computed properties
    get currentSession() { return store.currentSession; },
    get currentMessages() { return store.currentMessages; },
    get sortedSessions() { return store.sortedSessions; },
    get isStreaming() { return store.isStreaming; },
    get currentPendingMessages() { return store.currentPendingMessages; },
    get allCurrentMessages() { return store.allCurrentMessages; },
    get getSessionsByTag() { return store.getSessionsByTag; },
    get getSessionsByCategory() { return store.getSessionsByCategory; },
    get archivedSessions() { return store.archivedSessions; },
    get activeSessions() { return store.activeSessions; },
    
    // Methods from original store
    initialize: store.initialize,
    synchronizeSessions: store.synchronizeSessions,
    fetchMessages: store.fetchMessages,
    createSession: store.createSession,
    setCurrentSession: store.setCurrentSession,
    clearCurrentSession: store.clearCurrentSession,
    updateSessionTitle: store.updateSessionTitle,
    archiveSession: store.archiveSession,
    deleteSession: store.deleteSession,
    togglePinSession: store.togglePinSession,
    sendMessage: store.sendMessage,
    cancelStreaming: store.cancelStreaming,
    deleteMessage: store.deleteMessage,
    refreshSession: store.refreshSession,
    migrateFromLegacyStorage: store.migrateFromLegacyStorage,
    syncPendingMessages: store.syncPendingMessages,
    exportData: store.exportData,
    importData: store.importData,
    cleanupStorage: store.cleanupStorage,
    loadOlderMessages: store.loadOlderMessages,
    sendFeedback: store.sendFeedback,
    addTagToSession: store.addTagToSession,
    removeTagFromSession: store.removeTagFromSession,
    setCategoryForSession: store.setCategoryForSession,
    removeCategoryFromSession: store.removeCategoryFromSession,
    toggleArchiveSession: store.toggleArchiveSession,
    updateSessionPreview: store.updateSessionPreview,
    selectSession: store.selectSession,
    deselectSession: store.deselectSession,
    toggleSessionSelection: store.toggleSessionSelection,
    clearSessionSelection: store.clearSessionSelection,
    archiveMultipleSessions: store.archiveMultipleSessions,
    deleteMultipleSessions: store.deleteMultipleSessions,
    addTagToMultipleSessions: store.addTagToMultipleSessions,
    setCategoryForMultipleSessions: store.setCategoryForMultipleSessions,

    // Additional compatibility methods
    // renameSession ist nur ein Alias für updateSessionTitle
    renameSession: async (
      sessionId: string,
      newTitle: string,
    ): Promise<void> => {
      return store.updateSessionTitle(sessionId, newTitle);
    },

    // updateSession kann fehlen
    updateSession: async (
      sessionId: string,
      data: Partial<ChatSession>,
    ): Promise<void> => {
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
