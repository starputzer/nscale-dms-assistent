/**
 * Store Helper
 *
 * Diese Datei stellt Hilfsfunktionen bereit, um einheitlichen Zugriff auf Stores zu ermöglichen,
 * unabhängig von der verwendeten API-Version (Options API oder Composition API).
 *
 * Die Implementierung verwendet Lazy Loading für alle Store-Zugriffe, um Probleme mit
 * "getActivePinia() was called but there was no active Pinia" zu vermeiden.
 */

import { useDocumentConverterStore } from "@/stores/documentConverter";
import { useSessionsStore } from "@/stores/sessions";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import type { ISessionsStore, IFeatureTogglesStore } from "@/types/stores";
import type { IDocumentConverterStore } from "@/types/documentConverterStore";
import type { SupportedFormat } from "@/types/documentConverter";

/**
 * Prüft, ob eine Methode in einem Store existiert
 * @param store Der zu prüfende Store
 * @param methodName Name der zu prüfenden Methode
 * @returns true, wenn die Methode existiert, sonst false
 */
export function hasMethod(store: any, methodName: string): boolean {
  return typeof store?.[methodName] === "function";
}

/**
 * Sicherer Zugriff auf den DocumentConverter Store mit Fehlerbehandlung
 * @returns Der DocumentConverter Store oder ein Mock-Objekt im Fehlerfall
 */
export function getSafeDocumentConverterStore(): IDocumentConverterStore {
  try {
    // Verwende unknown als Zwischentyp für korrektes Type Casting
    const store = useDocumentConverterStore();
    // Stelle sicher, dass der Store die erforderlichen Interface-Methoden implementiert
    const enhancedStore: IDocumentConverterStore = {
      // Basis-Store-Methoden
      initialize: async () => {},
      reset: () => {},
      $dispose: () => {},
      $patch: () => {},
      $subscribe: () => () => {},

      // State
      uploadedFiles: [],
      convertedDocuments: [],
      conversionProgress: 0,
      conversionStep: "",
      estimatedTimeRemaining: 0,
      isConverting: false,
      isUploading: false,
      selectedDocumentId: null,
      error: null,
      currentView: "upload",
      conversionSettings: {
        preserveFormatting: true,
        extractMetadata: true,
        extractTables: true,
      },
      lastUpdated: null,
      initialized: false,
      isLoading: false,
      useFallback: false,
      activeConversionId: null,

      // Getters
      hasDocuments: false,
      selectedDocument: null,
      conversionStatus: "idle",
      documentsByFormat: {},
      documentCounts: {
        total: 0,
        pending: 0,
        processing: 0,
        success: 0,
        error: 0,
      },
      supportedFormats: [
        "pdf",
        "docx",
        "xlsx",
        "pptx",
        "html",
        "txt",
      ] as SupportedFormat[],
      maxFileSize: 20 * 1024 * 1024,

      // Methoden
      filteredDocuments: () => [],
      uploadDocument: async () => null,
      convertDocument: async () => false,
      deleteDocument: async () => false,
      cancelConversion: async () => {},
      selectDocument: () => {},
      setView: () => {},
      updateSettings: () => {},
      setError: () => {},
      clearError: () => {},
      resetState: () => {},
      refreshDocuments: async () => {},
      setUseFallback: () => {},
      isSupportedFormat: () => false,
      downloadDocument: async () => {},
    };

    // Übernehme Werte aus dem tatsächlichen Store, falls verfügbar
    return {
      ...enhancedStore,
      ...(store as unknown as IDocumentConverterStore),
    };
  } catch (err) {
    console.warn("DocumentConverter Store nicht verfügbar", err);
    // Umfassender Mock für Fallbacks mit allen benötigten Methoden/Eigenschaften
    const mockStore: IDocumentConverterStore = {
      // Basis-Store-Methoden
      initialize: async () => {},
      reset: () => {},
      $dispose: () => {},
      $patch: () => {},
      $subscribe: () => () => {},

      // State
      uploadedFiles: [],
      convertedDocuments: [],
      conversionProgress: 0,
      conversionStep: "",
      estimatedTimeRemaining: 0,
      isConverting: false,
      isUploading: false,
      selectedDocumentId: null,
      error: null,
      currentView: "upload",
      conversionSettings: {
        preserveFormatting: true,
        extractMetadata: true,
        extractTables: true,
      },
      lastUpdated: null,
      initialized: false,
      isLoading: false,
      useFallback: false,
      activeConversionId: null,

      // Getters
      hasDocuments: false,
      selectedDocument: null,
      conversionStatus: "idle",
      documentsByFormat: {},
      documentCounts: {
        total: 0,
        pending: 0,
        processing: 0,
        success: 0,
        error: 0,
      },
      supportedFormats: [
        "pdf",
        "docx",
        "xlsx",
        "pptx",
        "html",
        "txt",
      ] as SupportedFormat[],
      maxFileSize: 20 * 1024 * 1024,

      // Methoden
      filteredDocuments: () => [],
      uploadDocument: async () => null,
      convertDocument: async () => false,
      deleteDocument: async () => false,
      cancelConversion: async () => {},
      selectDocument: () => {},
      setView: () => {},
      updateSettings: () => {},
      setError: () => {},
      clearError: () => {},
      resetState: () => {},
      refreshDocuments: async () => {},
      setUseFallback: () => {},
      isSupportedFormat: () => false,
      downloadDocument: async () => {},
    };

    return mockStore;
  }
}

/**
 * Sicherer Zugriff auf den Sessions Store mit Fehlerbehandlung
 * @returns Der Sessions Store oder ein Mock-Objekt im Fehlerfall
 */
export function getSafeSessionsStore(): ISessionsStore {
  try {
    // Verwende unknown als Zwischentyp für korrektes Type Casting
    const store = useSessionsStore();

    // Stelle sicher, dass der Store die erforderlichen Interface-Methoden implementiert
    // und erstelle einen erweiterten Store, der das ISessionsStore Interface korrekt implementiert
    const enhancedStore: ISessionsStore = {
      // IBaseStore Methoden
      initialize: async () => {},
      reset: () => {},
      $dispose: () => {},
      $patch: () => {},
      $subscribe: () => () => {},

      // State properties
      sessions: [],
      currentSessionId: null,
      currentSession: null,
      messages: {},
      streaming: { isActive: false, progress: 0, currentSessionId: null },
      isLoading: false,
      error: null,
      version: 1,
      pendingMessages: {},
      syncStatus: {
        lastSyncTime: 0,
        isSyncing: false,
        error: null,
        pendingSessionIds: new Set(),
      },
      availableTags: [],
      availableCategories: [],
      selectedSessionIds: [],
      isStreaming: false,

      // Getters
      currentMessages: [],
      sortedSessions: [],
      currentPendingMessages: [],
      allCurrentMessages: [],
      getSessionsByTag: () => [],
      getSessionsByCategory: () => [],
      archivedSessions: [],
      activeSessions: [],

      // Action methods
      synchronizeSessions: async () => {},
      fetchMessages: async () => [],
      createSession: async (title?: string) => "mock-session-id",
      setCurrentSession: async () => {},
      updateSessionTitle: async () => {},
      archiveSession: async () => {},
      togglePinSession: async () => {},
      sendMessage: async () => {},
      cancelStreaming: () => {},
      deleteMessage: async () => {},
      refreshSession: async () => {},
      migrateFromLegacyStorage: () => {},
      syncPendingMessages: async () => {},
      exportData: () => "{}",
      importData: () => true,
      cleanupStorage: () => {},
      loadOlderMessages: () => [],
      addTagToSession: async () => {},
      removeTagFromSession: async () => {},
      setCategoryForSession: async () => {},
      removeCategoryFromSession: async () => {},
      toggleArchiveSession: async () => {},
      updateSessionPreview: () => {},
      selectSession: () => {},
      deselectSession: () => {},
      toggleSessionSelection: () => {},
      clearSessionSelection: () => {},
      archiveMultipleSessions: async () => {},
      deleteMultipleSessions: async () => {},
      addTagToMultipleSessions: async () => {},
      setCategoryForMultipleSessions: async () => {},
      updateStreamedMessage: () => {},
    };

    // Übernehme alle Properties des vorhandenen Stores in den erweiterten Store
    return {
      ...enhancedStore,
      ...(store as unknown as ISessionsStore),
    };
  } catch (err) {
    console.warn("Sessions Store nicht verfügbar", err);
    // Vollständiger Mock der das ISessionsStore Interface implementiert
    const mockStore: ISessionsStore = {
      // IBaseStore Methoden
      initialize: async () => {},
      reset: () => {},
      $dispose: () => {},
      $patch: () => {},
      $subscribe: () => () => {},

      // State properties
      sessions: [],
      currentSessionId: null,
      currentSession: null,
      messages: {},
      streaming: { isActive: false, progress: 0, currentSessionId: null },
      isLoading: false,
      error: null,
      version: 1,
      pendingMessages: {},
      syncStatus: {
        lastSyncTime: 0,
        isSyncing: false,
        error: null,
        pendingSessionIds: new Set(),
      },
      availableTags: [],
      availableCategories: [],
      selectedSessionIds: [],
      isStreaming: false,

      // Getters
      currentMessages: [],
      sortedSessions: [],
      currentPendingMessages: [],
      allCurrentMessages: [],
      getSessionsByTag: () => [],
      getSessionsByCategory: () => [],
      archivedSessions: [],
      activeSessions: [],

      // Action methods
      synchronizeSessions: async () => {},
      fetchMessages: async () => [],
      createSession: async (title?: string) => "mock-session-id",
      setCurrentSession: async () => {},
      updateSessionTitle: async () => {},
      archiveSession: async () => {},
      togglePinSession: async () => {},
      sendMessage: async () => {},
      cancelStreaming: () => {},
      deleteMessage: async () => {},
      refreshSession: async () => {},
      migrateFromLegacyStorage: () => {},
      syncPendingMessages: async () => {},
      exportData: () => "{}",
      importData: () => true,
      cleanupStorage: () => {},
      loadOlderMessages: () => [],
      addTagToSession: async () => {},
      removeTagFromSession: async () => {},
      setCategoryForSession: async () => {},
      removeCategoryFromSession: async () => {},
      toggleArchiveSession: async () => {},
      updateSessionPreview: () => {},
      selectSession: () => {},
      deselectSession: () => {},
      toggleSessionSelection: () => {},
      clearSessionSelection: () => {},
      archiveMultipleSessions: async () => {},
      deleteMultipleSessions: async () => {},
      addTagToMultipleSessions: async () => {},
      setCategoryForMultipleSessions: async () => {},
      updateStreamedMessage: () => {},
    };

    return mockStore;
  }
}

/**
 * Sicherer Zugriff auf den FeatureToggles Store mit Fehlerbehandlung
 * @returns Der FeatureToggles Store oder ein Mock-Objekt im Fehlerfall
 */
export function getSafeFeatureTogglesStore(): IFeatureTogglesStore {
  try {
    // Verwende unknown als Zwischentyp für korrektes Type Casting
    const store = useFeatureTogglesStore();
    // Überprüfe, ob der Store die benötigten Eigenschaften und Methoden hat
    if (
      store &&
      typeof store.isEnabled === "function" &&
      typeof store.enableFeature === "function" &&
      typeof store.disableFeature === "function"
    ) {
      // Sicherstellen, dass der Store die erforderlichen Interface-Methoden implementiert
      // Falls nicht vorhanden, werden diese durch den Fallback unten ergänzt
      const enhancedStore: IFeatureTogglesStore = {
        // IBaseStore Methoden
        initialize: store.initialize || (async () => {}),
        reset: store.reset || (() => {}),
        $dispose: store.$dispose || (() => {}),
        $patch: store.$patch || (() => {}),
        $subscribe: store.$subscribe || (() => () => {}),

        // State - Falls nicht vorhanden, leeres Objekt verwenden
        features: store.features || ({} as Record<string, boolean>),

        // Methoden - Im Store vorhandene Methoden verwenden, sonst Fallbacks
        isEnabled: store.isEnabled || (() => false),
        enableFeature: store.enableFeature || (() => {}),
        disableFeature: store.disableFeature || (() => {}),
        toggleFeature: store.toggleFeature || (() => false),
        enableLegacyMode: store.enableLegacyMode || (() => {}),
        disableLegacyMode: store.disableLegacyMode || (() => {}),
        enableMigratedMode: store.enableMigratedMode || (() => {}),
        isMigrated: store.isMigrated || (() => false),
      };

      return enhancedStore;
    }

    // Vollständiger Fallback, wenn der Store nicht korrekt geladen werden kann
    throw new Error("FeatureToggles Store fehlt Interface-Implementierung");
  } catch (err) {
    console.warn("FeatureToggles Store nicht verfügbar", err);
    // Erweiterter Mock für Fallbacks mit allen benötigten Methoden/Eigenschaften
    const mockStore: IFeatureTogglesStore = {
      // IBaseStore Methoden
      initialize: async () => {},
      reset: () => {},
      $dispose: () => {},
      $patch: () => {},
      $subscribe: () => () => {},

      // State
      features: {} as Record<string, boolean>,

      // Methoden
      isEnabled: () => false,
      enableFeature: () => {},
      disableFeature: () => {},
      toggleFeature: () => false,
      enableLegacyMode: () => {},
      disableLegacyMode: () => {},
      enableMigratedMode: () => {},
      isMigrated: () => false,
    };

    return mockStore;
  }
}

/**
 * Einheitlicher Zugriff auf den Document Converter Store
 */
export const documentConverterHelper = {
  /**
   * Setzt den Fallback-Modus für den Document Converter
   * @param value true, um Fallback zu aktivieren, false zum Deaktivieren
   */
  setUseFallback(value: boolean): void {
    const store = getSafeDocumentConverterStore();
    if (hasMethod(store, "setUseFallback")) {
      store.setUseFallback(value);
    } else {
      store.$patch?.({ useFallback: value });
    }
  },

  /**
   * Löscht den aktuellen Fehler im Document Converter Store
   */
  clearError(): void {
    const store = getSafeDocumentConverterStore();
    if (hasMethod(store, "clearError")) {
      store.clearError();
    } else {
      store.$patch?.({ error: null });
    }
  },

  /**
   * Setzt die aktuelle Ansicht des Document Converters
   * @param view Die anzuzeigende Ansicht
   */
  setView(view: string): void {
    const store = getSafeDocumentConverterStore();
    if (hasMethod(store, "setView")) {
      store.setView(view);
    } else {
      store.$patch?.({ currentView: view });
    }
  },

  /**
   * Aktualisiert die Liste der konvertierten Dokumente
   */
  async refreshDocuments(): Promise<void> {
    const store = getSafeDocumentConverterStore();
    if (hasMethod(store, "refreshDocuments")) {
      await store.refreshDocuments();
    } else {
      // Keine direkte Fallback-Implementierung möglich,
      // müsste vom Aufrufer implementiert werden
      console.warn(
        "refreshDocuments nicht verfügbar im Document Converter Store",
      );
    }
  },
};

/**
 * Einheitlicher Zugriff auf den Sessions Store
 */
export const sessionsHelper = {
  /**
   * Wechselt zur angegebenen Session
   * @param sessionId Die ID der Session, zu der gewechselt werden soll
   */
  async setCurrentSession(sessionId: string): Promise<void> {
    const store = getSafeSessionsStore();
    if (hasMethod(store, "setCurrentSession")) {
      await store.setCurrentSession(sessionId);
    } else {
      store.$patch?.({ currentSessionId: sessionId });
    }
  },

  /**
   * Erstellt eine neue Chat-Session
   * @param title Optionaler Titel für die neue Session
   * @returns Die ID der neu erstellten Session
   */
  async createSession(title?: string): Promise<string> {
    const store = getSafeSessionsStore();
    if (hasMethod(store, "createSession")) {
      // Hier wird der title-Parameter explizit an die createSession-Methode übergeben
      return await store.createSession(title);
    }

    throw new Error("Fehler beim Erstellen einer neuen Session");
  },

  /**
   * Löscht/archiviert eine Session
   * @param sessionId Die ID der zu löschenden Session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const store = getSafeSessionsStore();
    if (hasMethod(store, "archiveSession")) {
      await store.archiveSession(sessionId);
    } else {
      console.warn("Keine Methode zum Löschen von Sessions verfügbar");
    }
  },

  /**
   * Benennt eine Session um
   * @param sessionId Die ID der umzubenennenden Session
   * @param newTitle Der neue Titel für die Session
   */
  async renameSession(sessionId: string, newTitle: string): Promise<void> {
    const store = getSafeSessionsStore();
    if (hasMethod(store, "updateSessionTitle")) {
      await store.updateSessionTitle(sessionId, newTitle);
    } else {
      // Fallback-Implementierung
      const sessions = store.sessions;
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        // Direkte Mutation vermeiden, stattdessen neues Array erstellen
        const updatedSessions = [...sessions];
        updatedSessions[sessionIndex] = {
          ...updatedSessions[sessionIndex],
          title: newTitle,
          updatedAt: new Date().toISOString(),
        };
        store.$patch?.({ sessions: updatedSessions });
      }
    }
  },

  /**
   * Aktualisiert eine Session-Eigenschaft
   * @param sessionId Die ID der zu aktualisierenden Session
   * @param update Die zu aktualisierenden Eigenschaften
   */
  async updateSession(
    sessionId: string,
    update: Record<string, any>,
  ): Promise<void> {
    const store = getSafeSessionsStore();

    // Fallback für isPinned-Update
    if ("isPinned" in update && hasMethod(store, "togglePinSession")) {
      const sessions = store.sessions;
      const session = sessions.find((s) => s.id === sessionId);
      if (session && session.isPinned !== update.isPinned) {
        await store.togglePinSession(sessionId);
      }
    } else {
      // Generischer Fallback
      const sessions = store.sessions;
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        const updatedSessions = [...sessions];
        updatedSessions[sessionIndex] = {
          ...updatedSessions[sessionIndex],
          ...update,
          updatedAt: new Date().toISOString(),
        };
        store.$patch?.({ sessions: updatedSessions });
      }
    }
  },

  /**
   * Synchronisiert Sessions mit dem Server
   */
  async syncSessions(): Promise<void> {
    const store = getSafeSessionsStore();
    if (hasMethod(store, "synchronizeSessions")) {
      await store.synchronizeSessions();
    } else {
      console.warn("Keine Methode zur Session-Synchronisation verfügbar");
    }
  },
};

/**
 * Einheitlicher Zugriff auf den Feature Toggles Store
 */
export const featureTogglesHelper = {
  /**
   * Prüft, ob ein Feature aktiviert ist
   * @param featureName Name des zu prüfenden Features
   * @returns true, wenn das Feature aktiviert ist, sonst false
   */
  isFeatureEnabled(featureName: string): boolean {
    const store = getSafeFeatureTogglesStore();
    if (hasMethod(store, "isEnabled")) {
      return store.isEnabled(featureName);
    } else {
      return false;
    }
  },
};
