import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { apiService } from "@/services/api/ApiService";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { safeParseSSEData } from "@/utils/sse-parser";
import type {
  ChatSession,
  ChatMessage,
  StreamingStatus,
  SendMessageParams,
  SessionTag,
  SessionCategory,
} from "../types/session";
import type { SessionsStoreReturn } from "../types/stores";
import { useAuthStore } from "./auth";
import { batchRequestService } from "@/services/api/BatchRequestService";
import {
  processBatchResponse,
  extractBatchResponseData,
  validateSessionsResponse,
} from "./sessionsResponseFix";

/**
 * Sessions Store zur Verwaltung von Chat-Sessions und Nachrichten
 * - Speichert alle Chat-Sessions des Benutzers
 * - Verwaltet die aktuelle aktive Session
 * - Speichert Nachrichten für jede Session
 * - Verarbeitet Nachrichten-Streaming
 * - Optimierte Persistenz für große Datensätze
 * - Automatische Synchronisation mit Server
 */
export const useSessionsStore = defineStore(
  "sessions",
  (): SessionsStoreReturn => {
    // Referenz auf den Auth-Store für Benutzerinformationen
    const authStore = useAuthStore();

    // State
    const sessions = ref<ChatSession[]>([]);
    const currentSessionId = ref<string | null>(null);
    const messages = ref<Record<string, ChatMessage[]>>({});
    const streaming = ref<StreamingStatus>({
      isActive: false,
      progress: 0,
      currentSessionId: null,
    });
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const version = ref<number>(2); // Für Migrationen zwischen verschiedenen Speicherformaten
    const pendingMessages = ref<Record<string, ChatMessage[]>>({});
    const syncStatus = ref<{
      lastSyncTime: number;
      isSyncing: boolean;
      error: string | null;
      pendingSessionIds?: Set<string>; // Added for compatibility with optimized store
    }>({
      lastSyncTime: 0,
      isSyncing: false,
      error: null,
      pendingSessionIds: new Set(), // Initialize for API compatibility
    });

    // Verfügbare Tags und Kategorien
    const availableTags = ref<SessionTag[]>([
      { id: "important", name: "Wichtig", color: "#F56565" },
      { id: "work", name: "Arbeit", color: "#3182CE" },
      { id: "personal", name: "Persönlich", color: "#48BB78" },
      { id: "research", name: "Recherche", color: "#9F7AEA" },
      { id: "followup", name: "Nachverfolgen", color: "#ED8936" },
      { id: "draft", name: "Entwurf", color: "#A0AEC0" },
    ]);

    const availableCategories = ref<SessionCategory[]>([
      { id: "general", name: "Allgemein", color: "#718096" },
      { id: "support", name: "Support", color: "#3182CE" },
      { id: "documentation", name: "Dokumentation", color: "#48BB78" },
      { id: "training", name: "Training", color: "#9F7AEA" },
      { id: "project", name: "Projekt", color: "#ED8936" },
      { id: "archive", name: "Archiv", color: "#A0AEC0" },
    ]);

    // Ausgewählte Sessions (für Multi-Select)
    const selectedSessionIds = ref<string[]>([]);

    // Migration von Legacy-Daten
    function migrateFromLegacyStorage() {
      try {
        const legacySessions = localStorage.getItem("chat_sessions");
        const legacyCurrentSession = localStorage.getItem("current_session_id");
        const legacyMessages = localStorage.getItem("chat_messages");

        // Nur migrieren, wenn Legacy-Daten existieren und noch keine neuen Daten vorhanden sind
        if (legacySessions && sessions.value.length === 0) {
          try {
            const parsedSessions = JSON.parse(legacySessions);
            sessions.value = parsedSessions.map((session: any) => ({
              ...session,
              // Sicherstellen, dass Timestamps als ISO-Strings gespeichert sind
              createdAt: session.createdAt || new Date().toISOString(),
              updatedAt: session.updatedAt || new Date().toISOString(),
            }));

            if (legacyCurrentSession) {
              currentSessionId.value = legacyCurrentSession;
            }

            if (legacyMessages) {
              const parsedMessages = JSON.parse(legacyMessages);

              // Nachrichten konvertieren
              Object.keys(parsedMessages).forEach((sessionId: any) => {
                messages.value[sessionId] = parsedMessages[sessionId].map(
                  (msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp || new Date().toISOString(),
                    status: msg.status || "sent",
                  }),
                );
              });
            }
          } catch (e) {
            console.error("Fehler beim Parsen der Legacy-Session-Daten", e);
          }
        }
      } catch (error) {
        console.error("Fehler bei der Migration von Session-Daten:", error);
      }
    }

    // Initialisierung des Stores
    async function initialize(): Promise<void> {
      // Don't clear sessions - we need to preserve them!
      // sessions.value = [];
      // currentSessionId.value = null;
      // messages.value = {};

      migrateFromLegacyStorage();

      // Only sync sessions if user is authenticated
      if (authStore.isAuthenticated) {
        await synchronizeSessions();
      }

      // Polling-Intervall für Synchronisation mit dem Server
      let syncInterval: number | null = null;

      // Nur synchronisieren, wenn der Benutzer angemeldet ist
      const unwatchAuth = watch(
        () => authStore.isAuthenticated,
        (isAuthenticated: boolean) => {
          if (isAuthenticated) {
            // Initial sync when becoming authenticated
            synchronizeSessions();
            // Temporarily disable periodic sync
            /*
            if (syncInterval === null) {
              syncInterval = window.setInterval(() => {
                synchronizeSessions();
              }, 60000); // Alle 60 Sekunden synchronisieren
            }
            */
          } else {
            // Intervall beenden, wenn der Benutzer abgemeldet ist
            if (syncInterval !== null) {
              clearInterval(syncInterval);
              syncInterval = null;
            }
          }
        },
        { immediate: false }, // Don't trigger on initialization
      );

      // Cleanup-Funktion
      const cleanup = () => {
        if (syncInterval !== null) {
          clearInterval(syncInterval);
        }
        unwatchAuth();
      };

      // Return void instead of the cleanup function result
      return;
    }

    // Getters
    const currentSession = computed(
      () => sessions.value.find((s) => s.id === currentSessionId.value) || null,
    );

    const currentMessages = computed(() =>
      currentSessionId.value
        ? messages.value[currentSessionId.value] || []
        : [],
    );

    const sortedSessions = computed(() => {
      return [...sessions.value].sort((a, b) => {
        // Sicherheitsprüfung
        if (!a || !b) return 0;

        // Archivierte Sessions zuletzt
        const aArchived = a.isArchived || false;
        const bArchived = b.isArchived || false;
        if (!aArchived && bArchived) return -1;
        if (aArchived && !bArchived) return 1;

        // Gepinnte Sessions zuerst (innerhalb ihrer Gruppe)
        const aPinned = a.isPinned || false;
        const bPinned = b.isPinned || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        // Dann nach Datum (neueste zuerst)
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });

    // Sessions mit Tags filtern
    const getSessionsByTag = computed(() => (tagId: string) => {
      return sessions.value.filter((session: any) =>
        session.tags?.some((tag: any) => tag.id === tagId),
      );
    });

    // Sessions nach Kategorie filtern
    const getSessionsByCategory = computed(() => (categoryId: string) => {
      return sessions.value.filter(
        (session) => session.category?.id === categoryId,
      );
    });

    // Archivierte Sessions
    const archivedSessions = computed(() => {
      return sessions.value.filter((session: any) => session.isArchived);
    });

    // Aktive (nicht-archivierte) Sessions
    const activeSessions = computed(() => {
      return sessions.value.filter((session: any) => !session.isArchived);
    });

    const isStreaming = computed(() => streaming.value.isActive);

    // Aktuelle ausstehende Nachrichten für die aktuelle Session
    const currentPendingMessages = computed(() =>
      currentSessionId.value
        ? pendingMessages.value[currentSessionId.value] || []
        : [],
    );

    // Alle Nachrichten der aktuellen Session (inklusive ausstehende)
    const allCurrentMessages = computed(() => {
      console.log('[SessionsStore] Computing allCurrentMessages for session:', currentSessionId.value);
      if (!currentSessionId.value) return [];
      const sessionMessages = messages.value[currentSessionId.value] || [];
      console.log('[SessionsStore] Session messages count:', sessionMessages.length, 
        sessionMessages.map(m => ({ id: m.id.substring(0, 8), content: m.content.substring(0, 30) + '...', isStreaming: m.isStreaming })));
      const pendingSessionMessages =
        pendingMessages.value[currentSessionId.value] || [];

      const result = [...sessionMessages, ...pendingSessionMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      console.log('[SessionsStore] Total messages after merge:', result.length);
      return result;
    });

    // Actions
    /**
     * Alle Sessions des angemeldeten Benutzers laden und mit lokalem State synchronisieren
     *
     * Optimierte Version mit API-Batching und selektiver Synchronisation:
     * - Nur notwendige Daten werden vom Server geladen
     * - Mehrere verwandte API-Anfragen werden in einem Batch zusammengefasst
     * - Intelligente Erkennung von Änderungen minimiert unnötige Updates
     */
    async function synchronizeSessions(): Promise<void> {
      // Early exit if not authenticated - prevent any API calls
      if (!authStore.isAuthenticated || !authStore.token) {
        return;
      }

      if (syncStatus.value.isSyncing) {
        return;
      }

      syncStatus.value.isSyncing = true;
      error.value = null;

      try {
        // Check if auth headers are available
        if (!authStore.createAuthHeaders) {
          console.error("Auth store method createAuthHeaders not available");
          // Don't throw, just return to allow app to continue
          return;
        }

        const authHeaders = authStore.createAuthHeaders();
        if (!authHeaders || Object.keys(authHeaders).length === 0) {
          console.warn("No auth headers available, skipping sync");
          return;
        }

        // Direkte API-Aufrufe statt Batch-API (temporär)
        let sessionsData = null;
        let statsData = null;
        
        try {
          // Lade Sessions direkt
          const sessionsResponse = await axios.get("/api/sessions", {
            headers: authHeaders,
            params: {
              since: syncStatus.value.lastSyncTime,
            },
          });
          
          sessionsData = sessionsResponse.data;
          console.log("Sessions loaded directly:", sessionsData);
          
          // Optional: Lade Stats separat (wenn benötigt)
          try {
            const statsResponse = await axios.get("/api/sessions/stats", {
              headers: authHeaders,
            });
            statsData = statsResponse.data;
          } catch (statsError) {
            // Stats sind optional
            console.warn("Could not load session stats:", statsError);
          }
        } catch (error: any) {
          console.error("Failed to load sessions:", error);
          sessions.value = [];
          return;
        }

        // Validate and extract sessions
        const { valid, sessions: serverSessions } =
          validateSessionsResponse(sessionsData);

        if (!valid) {
          console.warn("Invalid sessions response format:", sessionsData);
          sessions.value = [];
          return;
        }

        // Optimierte Sessions-Verarbeitung mit Map für schnelleren Zugriff
        if (serverSessions && serverSessions.length > 0) {
          // Lokale Sessions für schnellen Lookup in Map konvertieren
          const localSessionsMap = new Map(
            sessions.value.map((session: any) => [session.id, session]),
          );

          // Neue oder aktualisierte Sessions verarbeiten
          const updatedSessions: ChatSession[] = [];

          // Effizienter Algorithmus für große Datensätze
          serverSessions.forEach((serverSession: any) => {
            const localSession = localSessionsMap.get(serverSession.id);

            if (localSession) {
              // Session existiert lokal - prüfen, ob Update nötig ist
              const localUpdatedAt = new Date(localSession.updatedAt).getTime();
              const serverUpdatedAt = new Date(
                serverSession.updatedAt,
              ).getTime();

              if (serverUpdatedAt > localUpdatedAt) {
                // Server hat neuere Version - Update mit Erhaltung lokaler Eigenschaften
                updatedSessions.push({
                  ...localSession,
                  ...serverSession,
                  // Lokale Eigenschaften beibehalten, die nicht vom Server kommen
                  // isLocal: localSession.isLocal, // isLocal existiert nicht in ChatSession
                });

                // Aus der Map entfernen, um später schnell zu erkennen,
                // welche Sessions nur lokal existieren
                localSessionsMap.delete(serverSession.id);
              } else {
                // Lokale Version ist aktuell - unverändert beibehalten
                updatedSessions.push(localSession);
                localSessionsMap.delete(serverSession.id);
              }
            } else {
              // Neue Session vom Server - direkt hinzufügen
              updatedSessions.push(serverSession);
            }
          });

          // Lokale Sessions hinzufügen, die nicht vom Server kamen
          // (nur solche, die als isLocal markiert sind - andere wurden gelöscht)
          localSessionsMap.forEach((session: any) => {
            // if ((session as any).isLocal) { // isLocal check entfernt
            updatedSessions.push(session);
            // }
          });

          // Sessions aktualisieren
          sessions.value = updatedSessions;
        }

        syncStatus.value.lastSyncTime = Date.now();
        syncStatus.value.error = null;

        // Statistik-Informationen verarbeiten, wenn vorhanden
        if (statsData && typeof statsData === "object") {
          // Hier könnten Statistikdaten für UI-Updates verwendet werden
        }
      } catch (err: any) {
        console.error("Error synchronizing sessions - Details:", {
          fullError: err,
          errorMessage: err?.message,
          errorResponse: err?.response,
          errorData: err?.data,
          errorStack: err?.stack,
          errorType: err?.constructor?.name,
          isNetworkError: err?.code === "ECONNABORTED",
          status: err?.response?.status,
        });
        syncStatus.value.error =
          err.response?.data?.message ||
          err.message ||
          "Fehler bei der Synchronisation";
      } finally {
        syncStatus.value.isSyncing = false;
      }
    }

    /**
     * Nachrichten für eine bestimmte Session laden
     *
     * Optimierte Version mit API-Batching und Cache-Control
     */
    async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
      if (!sessionId || !authStore.isAuthenticated) return [];

      isLoading.value = true;
      error.value = null;

      try {
        // Check if auth headers are available
        if (!authStore.createAuthHeaders) {
          console.error("Auth store method createAuthHeaders not available");
          throw new Error("Authentication methods not available");
        }

        const authHeaders = authStore.createAuthHeaders();
        if (!authHeaders || Object.keys(authHeaders).length === 0) {
          console.warn("No auth headers available, skipping message fetch");
          return [];
        }

        // Direct API call instead of batch request
        // The batch service seems to have issues with the server response format
        const response = await axios.get(
          `/api/sessions/${sessionId}/messages`,
          {
            headers: authHeaders,
          },
        );

        // Extract messages from response
        let validMessages: ChatMessage[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            validMessages = response.data;
          } else if (
            response.data.messages &&
            Array.isArray(response.data.messages)
          ) {
            validMessages = response.data.messages;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            validMessages = response.data.data;
          }
        }

        messages.value = {
          ...messages.value,
          [sessionId]: validMessages,
        };

        return validMessages;
      } catch (err: any) {
        console.error(
          `Error fetching messages for session ${sessionId} - Details:`,
          {
            fullError: err,
            errorMessage: err?.message,
            errorResponse: err?.response,
            errorData: err?.data,
            errorStack: err?.stack,
            errorType: err?.constructor?.name,
            isNetworkError: err?.code === "ECONNABORTED",
            status: err?.response?.status,
          },
        );
        error.value =
          err.response?.data?.message ||
          err.message ||
          "Fehler beim Laden der Nachrichten";
        return [];
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Erstellt eine neue Chat-Session und wechselt zu ihr
     */
    async function createSession(
      title: string = "Neue Unterhaltung",
    ): Promise<string> {
      isLoading.value = true;
      error.value = null;

      try {
        const now = new Date().toISOString();
        // Force unique ID generation
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const sessionId = `${timestamp}-${random}`; // Always unique!

        // Lokale Session erstellen, um sofortige UI-Aktualisierung zu ermöglichen
        const newSession: ChatSession = {
          id: sessionId,
          title,
          userId: authStore.user?.id || "anonymous",
          createdAt: now,
          updatedAt: now,
          // isLocal: true, // isLocal existiert nicht in ChatSession
        };

        sessions.value.push(newSession);
        messages.value[sessionId] = [];

        // Zur neuen Session wechseln
        await setCurrentSession(sessionId);

        // Mit dem Server synchronisieren, wenn angemeldet
        if (authStore.isAuthenticated) {
          try {
            const payload = {
              id: sessionId, // Gleiche ID verwenden, um Client und Server zu synchronisieren
              title,
              userId: authStore.user?.id,
              createdAt: now,
              updatedAt: now,
            };

            await axios.post<ChatSession>("/api/sessions", payload, {
              headers: authStore.createAuthHeaders(),
            });

            // Lokale Markierung entfernen
            const index = sessions.value.findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              // delete sessions.value[index].isLocal; // isLocal existiert nicht in ChatSession
            }

            return sessionId;
          } catch (apiError) {
            console.error("Error saving session to server:", apiError);
            // Session bleibt als lokal markiert
          }
        }

        return sessionId;
      } catch (err: any) {
        console.error("Error creating session:", err);
        error.value =
          err.response?.data?.message || "Fehler beim Erstellen der Session";
        throw err;
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Wechselt zur angegebenen Session und lädt ihre Nachrichten
     */
    async function setCurrentSession(sessionId: string): Promise<void> {
      if (currentSessionId.value === sessionId) return;

      // Important: Set the new session ID first to prevent race conditions
      const previousSessionId = currentSessionId.value;
      currentSessionId.value = sessionId;

      // Cancel any ongoing streaming for the previous session
      if (previousSessionId && streaming.value.isStreaming) {
        cancelStreaming();
      }

      // Nachrichten laden, wenn sie noch nicht im Store sind
      if (
        !messages.value[sessionId] ||
        messages.value[sessionId].length === 0
      ) {
        await fetchMessages(sessionId);
      }
    }

    /**
     * Aktualisiert den Titel einer Session
     */
    async function updateSessionTitle(
      sessionId: string,
      newTitle: string,
    ): Promise<void> {
      if (!sessionId) return;

      // Optimistische Aktualisierung im lokalen State
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          title: newTitle,
          updatedAt: new Date().toISOString(),
        };
      }

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            { title: newTitle },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(`Error updating session title for ${sessionId}:`, err);
          error.value =
            err.response?.data?.message ||
            "Fehler beim Aktualisieren des Titels";

          // Bei Fehler lokale Änderung rückgängig machen
          if (sessionIndex !== -1) {
            const oldTitle = sessions.value[sessionIndex].title;
            sessions.value[sessionIndex] = {
              ...sessions.value[sessionIndex],
              title: oldTitle,
            };
          }
        }
      }
    }

    /**
     * Archiviert/löscht eine Session
     */
    async function archiveSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Optimistische Löschung im lokalen State
      const sessionsBefore = [...sessions.value];
      const messagesBackup = { ...messages.value };

      sessions.value = sessions.value.filter((s: any) => s.id !== sessionId);

      // Nachrichten aus dem Store entfernen
      if (messages.value[sessionId]) {
        const { [sessionId]: _, ...rest } = messages.value;
        messages.value = rest;
      }

      // Wenn die aktuelle Session gelöscht wurde, zur ersten verfügbaren wechseln
      if (currentSessionId.value === sessionId) {
        currentSessionId.value =
          sessions.value.length > 0 ? sessions.value[0].id : null;
      }

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.delete(`/api/sessions/${sessionId}`, {
            headers: authStore.createAuthHeaders(),
          });
        } catch (err: any) {
          console.error(`Error archiving session ${sessionId}:`, err);
          error.value =
            err.response?.data?.message ||
            "Fehler beim Archivieren der Session";

          // Bei Fehler lokale Änderung rückgängig machen
          sessions.value = sessionsBefore;
          messages.value = messagesBackup;
        }
      }
    }

    /**
     * Markiert eine Session als angeheftet/nicht angeheftet
     */
    async function togglePinSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Aktuellen Pin-Status finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      const isPinned = !sessions.value[sessionIndex].isPinned;

      // Optimistische Aktualisierung im lokalen State
      sessions.value[sessionIndex] = {
        ...sessions.value[sessionIndex],
        isPinned,
        updatedAt: new Date().toISOString(),
      };

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            { isPinned },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(
            `Error toggling pin status for session ${sessionId}:`,
            err,
          );
          error.value =
            err.response?.data?.message || "Fehler beim Ändern des Pin-Status";

          // Bei Fehler lokale Änderung rückgängig machen
          sessions.value[sessionIndex] = {
            ...sessions.value[sessionIndex],
            isPinned: !isPinned,
          };
        }
      }
    }

    /**
     * Synchronisiert lokale ausstehende Nachrichten mit dem Server
     */
    async function syncPendingMessages(): Promise<void> {
      if (!authStore.isAuthenticated) return;

      // Alle Sessions mit ausstehenden Nachrichten durchgehen
      for (const sessionId in pendingMessages.value) {
        const pendingForSession = pendingMessages.value[sessionId];

        if (pendingForSession && pendingForSession.length > 0) {
          for (const message of pendingForSession) {
            try {
              // Nachricht an den Server senden
              const response = await apiService.post<ChatMessage>(
                `/sessions/${sessionId}/messages`,
                {
                  content: message.content,
                  role: message.role,
                },
              );

              // Nachricht aus den ausstehenden entfernen
              pendingMessages.value[sessionId] = pendingMessages.value[
                sessionId
              ].filter((m: any) => m.id !== message.id);

              // Nachricht mit Server-generierter ID zu normalen Nachrichten hinzufügen
              if (!messages.value[sessionId]) {
                messages.value[sessionId] = [];
              }

              messages.value[sessionId].push({
                ...message,
                id: response.data.id || message.id,
                status: "sent",
              });
            } catch (err) {
              console.error(
                `Error syncing pending message ${message.id}:`,
                err,
              );
            }
          }
        }
      }
    }

    /**
     * Sendet eine Nachricht und verarbeitet die Antwort
     * Kann mit Streaming oder ohne verwendet werden
     */
    async function sendMessage({
      sessionId,
      content,
      role = "user",
    }: SendMessageParams): Promise<void> {
      if (!sessionId || !content) return;

      // Sicherstellen, dass die aktuelle Session gesetzt ist
      if (currentSessionId.value !== sessionId) {
        setCurrentSession(sessionId);
      }

      error.value = null;

      // Temporäre ID für die Nachricht
      const tempId = `temp-${uuidv4()}`;
      const timestamp = new Date().toISOString();

      // Benutzernachricht erstellen und sofort anzeigen
      const userMessage: ChatMessage = {
        id: tempId,
        sessionId,
        content,
        role,
        timestamp,
        status: "pending",
      };

      // Nachricht zum lokalen State hinzufügen
      if (!messages.value[sessionId]) {
        messages.value[sessionId] = [];
      }

      messages.value[sessionId].push({
        ...userMessage,
        status: "sent", // Status sofort auf "sent" setzen
      });

      // Sitzung aktualisieren
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          updatedAt: timestamp,
        };
      }

      // Check if this is the first message in the session and update title
      const isFirstMessage = messages.value[sessionId].length === 1;
      const currentSession = sessions.value.find((s) => s.id === sessionId);
      const needsTitleUpdate =
        isFirstMessage && currentSession?.title === "Neue Unterhaltung";

      // Streaming-Status setzen
      streaming.value = {
        isActive: true,
        progress: 0,
        currentSessionId: sessionId,
      };

      // Falls nicht angemeldet, Nachricht zur ausstehenden Liste hinzufügen
      if (!authStore.isAuthenticated) {
        if (!pendingMessages.value[sessionId]) {
          pendingMessages.value[sessionId] = [];
        }

        pendingMessages.value[sessionId].push({
          ...userMessage,
          status: "pending",
        });

        // Fallback-Antwort erstellen
        const assistantMessage: ChatMessage = {
          id: `assistant-${uuidv4()}`,
          sessionId,
          content:
            "Sie sind nicht angemeldet. Diese Nachricht wird gespeichert und gesendet, sobald Sie sich anmelden.",
          role: "assistant",
          timestamp: new Date().toISOString(),
          status: "sent",
        };

        messages.value[sessionId].push(assistantMessage);

        // Streaming beenden
        streaming.value = {
          isActive: false,
          progress: 100,
          currentSessionId: null,
        };

        return;
      }

      try {
        const authToken = authStore.token;
        const streamingEnabled = true; // Streaming aktiviert

        if (streamingEnabled) {
          // Streaming mit EventSource

          // Erstelle eine initiale Assistant-Nachricht für Streaming
          const assistantTempId = `temp-response-${uuidv4()}`;
          // Declare responseContent here so finishStreaming can access it
          let responseContent = "";
          
          const streamingMessage: ChatMessage = {
            id: assistantTempId,
            sessionId,
            content: "",
            role: "assistant",
            timestamp: new Date().toISOString(),
            isStreaming: true,
            status: "pending" as const,
          };
          messages.value[sessionId].push(streamingMessage);

          const finishStreaming = async () => {
            const finalMsgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (finalMsgIndex !== -1) {
              // Create a completely new message object for proper reactivity
              const sanitizedContent = responseContent.includes("data:") ? "Fehler beim Verarbeiten der Antwort" : responseContent;
              const updatedMessage = {
                ...messages.value[sessionId][finalMsgIndex],
                content: sanitizedContent,
                isStreaming: false,
                status: "sent",
              };
              
              // Create new array with the updated message
              const newMessages = [...messages.value[sessionId]];
              newMessages[finalMsgIndex] = updatedMessage;
              
              // Force complete reactivity update
              messages.value = Object.assign({}, messages.value, {
                [sessionId]: newMessages
              });
            }

            streaming.value = {
              isActive: false,
              progress: 100,
              currentSessionId: null,
            };

            // Update session title if this was the first message
            if (needsTitleUpdate) {
              await updateSessionTitle(sessionId);
            }
          };

          // URL-Parameter für Streaming
          const params = new URLSearchParams();
          params.append("question", content);
          // session_id ist immer erforderlich
          params.append("session_id", sessionId || "new");
          // NICHT token in die URL - sollte im Header sein!
          // params.append('token', authToken); // Token als URL-Parameter

          // Verwende den neuen API-Endpoint aus der Config
          const url = `/api/question/stream?${params.toString()}`;
          console.log("Streaming URL:", url);
          console.log("Auth token present:", !!authToken);

          // Ersetze EventSource durch fetch mit Headers
          try {
            const response = await fetch(url, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${authToken}`,
                Accept: "text/event-stream",
              },
            });

            console.log("Streaming response status:", response.status);
            console.log("Streaming response headers:", {
              contentType: response.headers.get("content-type"),
              cacheControl: response.headers.get("cache-control"),
              xAccelBuffering: response.headers.get("x-accel-buffering"),
            });

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
              throw new Error("No response body");
            }

            // Debug: Log if responseContent already has data
            if (responseContent) {
              console.warn("WARNING: responseContent already has data before streaming:", responseContent);
              responseContent = ""; // Reset it
            }

            // Stream verarbeiten
            let chunkCount = 0;
            let buffer = ""; // Buffer für unvollständige Zeilen
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log("Stream reading done, total chunks:", chunkCount);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              chunkCount++;
              console.log(
                `Chunk ${chunkCount} received, length: ${chunk.length}, content:`,
                chunk.substring(0, 100),
              );

              // Safety check: If chunk contains multiple "data:" lines, it might be the entire response
              if (chunk.split("data:").length > 10) {
                console.error("ERROR: Received what appears to be the entire SSE response in one chunk!");
                console.error("First 500 chars:", chunk.substring(0, 500));
                // Don't process this as it's likely an error
                continue;
              }

              // Buffer mit neuem Chunk kombinieren
              buffer += chunk;

              // SSE-Format parsen - nur vollständige Zeilen verarbeiten
              const lines = buffer.split("\n");
              // Letzte (möglicherweise unvollständige) Zeile im Buffer behalten
              buffer = lines.pop() || "";
              
              console.log("Lines in chunk:", lines.length, lines);

              for (const line of lines) {
                if (line.trim() === "") continue; // Leere Zeilen überspringen
                
                // Additional debugging to catch the exact issue
                if (!line.startsWith("data: ") && !line.startsWith("event: ") && line.includes("data:")) {
                  console.error("WARNING: Line contains 'data:' but doesn't start with it:", line);
                  console.error("This might be malformed SSE data");
                }
                
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  console.log("Processing SSE line:", line);
                  console.log("Data after removing 'data: ' prefix:", data);

                  if (data === "[DONE]") {
                    console.log("Received [DONE] signal");
                    finishStreaming();
                    return;
                  }

                  try {
                    // Safety check: ensure we're not trying to parse SSE-formatted data
                    if (data.startsWith("data:")) {
                      console.error("ERROR: Attempting to parse SSE-formatted data. This should not happen!");
                      console.error("Full line:", line);
                      console.error("Data after slice:", data);
                      continue;
                    }
                    
                    // Backend sendet JSON im Format: {"response": "token"}
                    const parsed = safeParseSSEData(data);
                    if (parsed && parsed.response) {
                      responseContent += parsed.response;
                    } else if (parsed && parsed.error) {
                      console.error(
                        "Streaming error from backend:",
                        parsed.error,
                      );
                    }
                  } catch (e) {
                    // Log the parsing error but don't append raw data
                    console.error("Failed to parse SSE data:", e, "Raw data:", data);
                    // Check if this might be nested SSE data
                    if (data.includes("data:")) {
                      console.error("WARNING: Data contains 'data:' which suggests nested SSE formatting");
                    }
                    // Do NOT append raw data as it includes SSE formatting
                    // The backend should always send valid JSON
                  }

                  // Update the message with proper reactivity
                  const msgIndex = messages.value[sessionId].findIndex(
                    (msg) => msg.id === assistantTempId,
                  );
                  if (msgIndex !== -1) {
                    // Create a completely new message object for proper reactivity
                    const sanitizedContent = responseContent.includes("data:") ? "" : responseContent;
                    const updatedMessage = {
                      ...messages.value[sessionId][msgIndex],
                      content: sanitizedContent,
                      isStreaming: true,
                      status: "pending",
                    };
                    
                    // Create new array with the updated message
                    const newMessages = [...messages.value[sessionId]];
                    newMessages[msgIndex] = updatedMessage;
                    
                    // Force Vue to detect the change by creating a completely new object
                    // This ensures the computed properties depending on messages will update
                    messages.value = Object.assign({}, messages.value, {
                      [sessionId]: newMessages
                    });
                  }
                } else if (line.startsWith("event: ")) {
                  const event = line.slice(7);
                  console.log("Parsed event:", event);

                  if (event === "done") {
                    console.log("Received done event");
                    finishStreaming();
                    return;
                  }
                }
              }
            }

            finishStreaming();
          } catch (error) {
            console.error("Streaming error:", error);

            // Fallback auf nicht-streaming API

            // Wenn noch kein Content, versuche die non-streaming API
            if (!responseContent || responseContent.includes("data:")) {
              // Reset responseContent if it contains raw SSE data
              responseContent = "";
              const requestData: any = {
                question: content,
              };

              if (/^\d+$/.test(sessionId)) {
                requestData.session_id = parseInt(sessionId);
              }

              const fallbackResponse = await axios.post(
                "/api/question",
                requestData,
                {
                  headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                  },
                },
              );

              const assistantMessage: ChatMessage = {
                id: assistantTempId,
                sessionId,
                content:
                  fallbackResponse.data.response ||
                  fallbackResponse.data.message ||
                  fallbackResponse.data.answer ||
                  "Keine Antwort vom Server",
                role: "assistant",
                timestamp: new Date().toISOString(),
                status: "sent",
              };

              // Update message with proper reactivity
              const msgIndex = messages.value[sessionId].findIndex(
                (msg) => msg.id === assistantTempId,
              );
              if (msgIndex !== -1) {
                // Create new array with the updated message
                const newMessages = [...messages.value[sessionId]];
                newMessages[msgIndex] = assistantMessage;
                
                // Force complete reactivity update
                messages.value = Object.assign({}, messages.value, {
                  [sessionId]: newMessages
                });
              }
            }

            finishStreaming();
          }
        } else {
          // Nicht-Streaming-Version verwenden

          const assistantTempId = `temp-response-${uuidv4()}`; // Diese Variable fehlte
          const requestData: any = {
            question: content,
          };

          if (/^\d+$/.test(sessionId)) {
            requestData.session_id = parseInt(sessionId);
          }

          // Erstelle eine initiale Assistant-Nachricht
          const initialAssistantMessage: ChatMessage = {
            id: assistantTempId,
            sessionId,
            content: "...", // Lade-Indikator
            role: "assistant",
            timestamp: new Date().toISOString(),
            isStreaming: false,
            status: "pending",
          };
          messages.value[sessionId].push(initialAssistantMessage);

          try {
            const response = await axios.post("/api/question", requestData, {
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            });

            const assistantMessage: ChatMessage = {
              id: assistantTempId,
              sessionId,
              content:
                response.data.response ||
                response.data.message ||
                response.data.answer ||
                "Keine Antwort vom Server",
              role: "assistant",
              timestamp: new Date().toISOString(),
              isStreaming: false,
              status: "sent",
            };

            // Update the existing message with proper reactivity
            const msgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (msgIndex !== -1) {
              // Create new array with the updated message
              const newMessages = [...messages.value[sessionId]];
              newMessages[msgIndex] = assistantMessage;
              
              // Mark user message as sent in the same update
              const userMessageIndex = newMessages.findIndex(
                (m) => m.id === tempId,
              );
              if (userMessageIndex !== -1) {
                newMessages[userMessageIndex] = {
                  ...newMessages[userMessageIndex],
                  status: "sent"
                };
              }
              
              // Force complete reactivity update
              messages.value = Object.assign({}, messages.value, {
                [sessionId]: newMessages
              });
            }
          } catch (err) {
            console.error("Fallback error:", err);
            const msgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (msgIndex !== -1) {
              // Create a completely new message object for proper reactivity
              const errorMessage = {
                ...messages.value[sessionId][msgIndex],
                content: "Fehler bei der Kommunikation mit dem Server",
                isStreaming: false,
                status: "error" as const
              };
              
              // Create new array with the updated message
              const newMessages = [...messages.value[sessionId]];
              newMessages[msgIndex] = errorMessage;
              
              // Force complete reactivity update
              messages.value = Object.assign({}, messages.value, {
                [sessionId]: newMessages
              });
            }
          }

          streaming.value = {
            isActive: false,
            progress: 100,
            currentSessionId: null,
          };

          // Mark user message as sent
          const userMessageIndex = messages.value[sessionId].findIndex(
            (m) => m.id === tempId,
          );
          if (userMessageIndex !== -1) {
            messages.value[sessionId][userMessageIndex].status = "sent";
          }

          // Update session title if this was the first message
          if (needsTitleUpdate) {
            await updateSessionTitle(sessionId);
          }
        }

        // End of streaming vs non-streaming logic
      } catch (err: any) {
        console.error("Error sending message:", err);
        error.value =
          err.response?.data?.message || "Fehler beim Senden der Nachricht";

        // Streaming beenden
        streaming.value = {
          isActive: false,
          progress: 0,
          currentSessionId: null,
        };
      }
    }

    /**
     * Aktuelle Streaming-Antwort abbrechen
     */
    function cancelStreaming(): void {
      if (!streaming.value.isActive) return;

      // Alle EventSource-Verbindungen schließen
      window.dispatchEvent(new CustomEvent("cancel-streaming"));

      // Streaming-Status zurücksetzen
      streaming.value = {
        isActive: false,
        progress: 0,
        currentSessionId: null,
      };

      // Status der letzten Nachricht aktualisieren
      if (currentSessionId.value) {
        const currentSessionMessages =
          messages.value[currentSessionId.value] || [];
        const streamingMessageIndex = currentSessionMessages.findIndex(
          (m) => m.isStreaming,
        );

        if (streamingMessageIndex !== -1) {
          messages.value[currentSessionId.value][streamingMessageIndex] = {
            ...messages.value[currentSessionId.value][streamingMessageIndex],
            isStreaming: false,
            content:
              messages.value[currentSessionId.value][streamingMessageIndex]
                .content + " [abgebrochen]",
            status: "error",
          };
        }
      }
    }

    /**
     * Löscht eine Nachricht aus einer Session
     */
    async function deleteMessage(
      sessionId: string,
      messageId: string,
    ): Promise<void> {
      if (!sessionId || !messageId) return;

      // Optimistische Löschung im lokalen State
      const messagesBackup = [...(messages.value[sessionId] || [])];

      if (messages.value[sessionId]) {
        messages.value[sessionId] = messages.value[sessionId].filter(
          (m) => m.id !== messageId,
        );
      }

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.delete(
            `/api/sessions/${sessionId}/messages/${messageId}`,
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(`Error deleting message ${messageId}:`, err);
          error.value =
            err.response?.data?.message || "Fehler beim Löschen der Nachricht";

          // Bei Fehler lokale Änderung rückgängig machen
          messages.value[sessionId] = messagesBackup;
        }
      }
    }

    /**
     * Lädt den gesamten Chat-Verlauf neu
     */
    async function refreshSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      await fetchMessages(sessionId);
    }

    /**
     * Exportiert alle Sessions und Nachrichten als JSON
     */
    function exportData(): string {
      const exportData = {
        sessions: sessions.value,
        messages: messages.value,
        version: version.value,
        exportDate: new Date().toISOString(),
      };

      return JSON.stringify(exportData);
    }

    /**
     * Importiert Sessions und Nachrichten aus einer JSON-Datei
     */
    function importData(jsonData: string): boolean {
      try {
        const data = JSON.parse(jsonData);

        if (data.sessions && Array.isArray(data.sessions)) {
          sessions.value = data.sessions;
        }

        if (data.messages && typeof data.messages === "object") {
          messages.value = data.messages;
        }

        if (data.version) {
          version.value = data.version;
        }

        return true;
      } catch (err) {
        console.error("Error importing data:", err);
        error.value =
          "Fehler beim Importieren der Daten. Das Format ist ungültig.";
        return false;
      }
    }

    /**
     * Bereinigt den Storage, indem ältere Nachrichten in den sessionStorage verschoben werden
     */
    function cleanupStorage() {
      // Nachrichten-Limit pro Session
      const messageLimit = 50;

      // Für jede Session
      Object.keys(messages.value).forEach((sessionId: any) => {
        const sessionMessages = messages.value[sessionId];

        // Wenn mehr Nachrichten als das Limit
        if (sessionMessages.length > messageLimit) {
          // Die neuesten Nachrichten behalten
          const recentMessages = sessionMessages.slice(-messageLimit);
          // Die älteren Nachrichten in den sessionStorage auslagern
          const olderMessages = sessionMessages.slice(0, -messageLimit);

          // Im localStorage nur die neuesten Nachrichten behalten
          messages.value[sessionId] = recentMessages;

          // Ältere Nachrichten in den sessionStorage verschieben
          try {
            const existingOlder = JSON.parse(
              sessionStorage.getItem(`session_${sessionId}_older_messages`) ||
                "[]",
            );
            sessionStorage.setItem(
              `session_${sessionId}_older_messages`,
              JSON.stringify([...existingOlder, ...olderMessages]),
            );
          } catch (e) {
            console.error(
              `Error storing older messages for session ${sessionId}:`,
              e,
            );
          }
        }
      });
    }

    /**
     * Lädt ältere Nachrichten aus dem sessionStorage
     */
    function loadOlderMessages(sessionId: string): ChatMessage[] {
      if (!sessionId) return [];

      try {
        const olderMessages = JSON.parse(
          sessionStorage.getItem(`session_${sessionId}_older_messages`) || "[]",
        );

        // Zu den aktuellen Nachrichten hinzufügen
        if (olderMessages.length > 0) {
          if (!messages.value[sessionId]) {
            messages.value[sessionId] = [];
          }

          // Zusammenführen und nach Zeitstempel sortieren
          messages.value[sessionId] = [
            ...olderMessages,
            ...messages.value[sessionId],
          ].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

          // Aus dem sessionStorage entfernen, da sie jetzt im Hauptspeicher sind
          sessionStorage.removeItem(`session_${sessionId}_older_messages`);
        }

        return olderMessages;
      } catch (e) {
        console.error(
          `Error loading older messages for session ${sessionId}:`,
          e,
        );
        return [];
      }
    }

    // Watch für automatische Synchronisation pendenter Nachrichten
    watch(
      () => authStore.isAuthenticated,
      (isAuthenticated: boolean) => {
        if (isAuthenticated) {
          // Wenn der Benutzer angemeldet ist, ausstehende Nachrichten synchronisieren
          syncPendingMessages();
        }
      },
    );

    // Bei Store-Erstellung initialisieren
    // Commented out to prevent API calls before authentication
    // The initialize will be called from the app after authentication
    // const cleanup = initialize();

    /**
     * Sendet Feedback für eine Nachricht
     */
    async function sendFeedback(
      messageId: string,
      feedbackType: "positive" | "negative",
      feedbackText?: string,
    ): Promise<void> {
      try {
        // Finde die Nachricht
        let foundMessage: ChatMessage | null = null;
        let foundSessionId: string | null = null;

        for (const [sessionId, sessionMessages] of Object.entries(
          messages.value,
        )) {
          const message = sessionMessages.find((m) => m.id === messageId);
          if (message) {
            foundMessage = message;
            foundSessionId = sessionId;
            break;
          }
        }

        if (!foundMessage || !foundSessionId) {
          console.error("Message not found for feedback:", messageId);
          return;
        }

        // Sende Feedback an Backend
        await axios.post(
          "/api/feedback",
          {
            message_id: messageId,
            session_id: foundSessionId,
            feedback_type: feedbackType,
            feedback_text: feedbackText || "",
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
              "Content-Type": "application/json",
            },
          },
        );

        // Update lokale Message mit Feedback
        const messageIndex = messages.value[foundSessionId].findIndex(
          (m) => m.id === messageId,
        );
        if (messageIndex !== -1) {
          messages.value[foundSessionId][messageIndex] = {
            ...messages.value[foundSessionId][messageIndex],
            userFeedback: feedbackType,
          };
        }
      } catch (error) {
        console.error("Failed to send feedback:", error);
        // Optional: Show error toast to user
      }
    }

    /**
     * Fügt einen Tag zu einer Session hinzu
     */
    async function addTagToSession(
      sessionId: string,
      tagId: string,
    ): Promise<void> {
      if (!sessionId || !tagId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Tag finden
      const tag = availableTags.value.find((t) => t.id === tagId);
      if (!tag) return;

      // Optimistische Aktualisierung im lokalen State
      if (!sessions.value[sessionIndex].tags) {
        sessions.value[sessionIndex].tags = [];
      }

      // Überprüfen, ob der Tag bereits vorhanden ist
      if (!sessions.value[sessionIndex].tags!.some((t) => t.id === tagId)) {
        sessions.value[sessionIndex].tags!.push(tag);
        sessions.value[sessionIndex].updatedAt = new Date().toISOString();
      }

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            {
              tags: sessions.value[sessionIndex].tags,
            },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(`Error adding tag to session ${sessionId}:`, err);
          error.value =
            err.response?.data?.message || "Fehler beim Hinzufügen des Tags";
        }
      }
    }

    /**
     * Entfernt einen Tag von einer Session
     */
    async function removeTagFromSession(
      sessionId: string,
      tagId: string,
    ): Promise<void> {
      if (!sessionId || !tagId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1 || !sessions.value[sessionIndex].tags) return;

      // Tag entfernen
      sessions.value[sessionIndex].tags = sessions.value[
        sessionIndex
      ].tags!.filter((t: any) => t.id !== tagId);
      sessions.value[sessionIndex].updatedAt = new Date().toISOString();

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            {
              tags: sessions.value[sessionIndex].tags,
            },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(`Error removing tag from session ${sessionId}:`, err);
          error.value =
            err.response?.data?.message || "Fehler beim Entfernen des Tags";
        }
      }
    }

    /**
     * Setzt die Kategorie einer Session
     */
    async function setCategoryForSession(
      sessionId: string,
      categoryId: string,
    ): Promise<void> {
      if (!sessionId || !categoryId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Kategorie finden
      const category = availableCategories.value.find(
        (c) => c.id === categoryId,
      );
      if (!category) return;

      // Optimistische Aktualisierung im lokalen State
      sessions.value[sessionIndex].category = category;
      sessions.value[sessionIndex].updatedAt = new Date().toISOString();

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            {
              category: sessions.value[sessionIndex].category,
            },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(
            `Error setting category for session ${sessionId}:`,
            err,
          );
          error.value =
            err.response?.data?.message || "Fehler beim Setzen der Kategorie";
        }
      }
    }

    /**
     * Entfernt die Kategorie einer Session
     */
    async function removeCategoryFromSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Optimistische Aktualisierung im lokalen State
      sessions.value[sessionIndex].category = undefined;
      sessions.value[sessionIndex].updatedAt = new Date().toISOString();

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            {
              category: null,
            },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(
            `Error removing category from session ${sessionId}:`,
            err,
          );
          error.value =
            err.response?.data?.message ||
            "Fehler beim Entfernen der Kategorie";
        }
      }
    }

    /**
     * Archiviert/dearchiviert eine Session
     */
    async function toggleArchiveSession(
      sessionId: string,
      archive: boolean = true,
    ): Promise<void> {
      if (!sessionId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Optimistische Aktualisierung im lokalen State
      sessions.value[sessionIndex].isArchived = archive;
      sessions.value[sessionIndex].updatedAt = new Date().toISOString();

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.patch(
            `/api/sessions/${sessionId}`,
            {
              isArchived: archive,
            },
            {
              headers: authStore.createAuthHeaders(),
            },
          );
        } catch (err: any) {
          console.error(
            `Error ${archive ? "archiving" : "unarchiving"} session ${sessionId}:`,
            err,
          );
          error.value =
            err.response?.data?.message ||
            `Fehler beim ${archive ? "Archivieren" : "Dearchivieren"} der Session`;

          // Bei Fehler lokale Änderung rückgängig machen
          sessions.value[sessionIndex].isArchived = !archive;
        }
      }
    }

    /**
     * Aktualisiert die Vorschau einer Session
     */
    function updateSessionPreview(
      sessionId: string,
      previewText: string,
      messageCount: number,
    ): void {
      if (!sessionId) return;

      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      sessions.value[sessionIndex].preview = previewText;
      sessions.value[sessionIndex].messageCount = messageCount;
    }

    /**
     * Wählt eine Session zur Massenbearbeitung aus
     */
    function selectSession(sessionId: string): void {
      if (!sessionId) return;

      if (!selectedSessionIds.value.includes(sessionId)) {
        selectedSessionIds.value.push(sessionId);
      }
    }

    /**
     * Entfernt eine Session aus der Massenbearbeitungsauswahl
     */
    function deselectSession(sessionId: string): void {
      if (!sessionId) return;

      selectedSessionIds.value = selectedSessionIds.value.filter(
        (id) => id !== sessionId,
      );
    }

    /**
     * Schaltet den Auswahlstatus einer Session um
     */
    function toggleSessionSelection(sessionId: string): void {
      if (!sessionId) return;

      if (selectedSessionIds.value.includes(sessionId)) {
        deselectSession(sessionId);
      } else {
        selectSession(sessionId);
      }
    }

    /**
     * Löscht den Massenauswahlstatus zurück
     */
    function clearSessionSelection(): void {
      selectedSessionIds.value = [];
    }

    /**
     * Massenoperation: Mehrere Sessions archivieren
     */
    async function archiveMultipleSessions(
      sessionIds: string[],
    ): Promise<void> {
      if (!sessionIds.length) return;

      for (const sessionId of sessionIds) {
        await toggleArchiveSession(sessionId, true);
      }

      clearSessionSelection();
    }

    /**
     * Massenoperation: Mehrere Sessions löschen
     */
    async function deleteMultipleSessions(sessionIds: string[]): Promise<void> {
      if (!sessionIds.length) return;

      for (const sessionId of sessionIds) {
        await archiveSession(sessionId);
      }

      clearSessionSelection();
    }

    /**
     * Massenoperation: Allen ausgewählten Sessions einen Tag hinzufügen
     */
    async function addTagToMultipleSessions(
      sessionIds: string[],
      tagId: string,
    ): Promise<void> {
      if (!sessionIds.length || !tagId) return;

      for (const sessionId of sessionIds) {
        await addTagToSession(sessionId, tagId);
      }
    }

    /**
     * Massenoperation: Allen ausgewählten Sessions eine Kategorie zuweisen
     */
    async function setCategoryForMultipleSessions(
      sessionIds: string[],
      categoryId: string,
    ): Promise<void> {
      if (!sessionIds.length || !categoryId) return;

      for (const sessionId of sessionIds) {
        await setCategoryForSession(sessionId, categoryId);
      }
    }

    /**
     * Löscht eine Session endgültig
     */
    async function deleteSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Optimistische Löschung im lokalen State
      const sessionsBefore = [...sessions.value];
      const messagesBackup = { ...messages.value };

      sessions.value = sessions.value.filter((s: any) => s.id !== sessionId);

      // Nachrichten aus dem Store entfernen
      if (messages.value[sessionId]) {
        const { [sessionId]: _, ...rest } = messages.value;
        messages.value = rest;
      }

      // Wenn die aktuelle Session gelöscht wurde, zur ersten verfügbaren wechseln
      if (currentSessionId.value === sessionId) {
        currentSessionId.value =
          sessions.value.length > 0 ? sessions.value[0].id : null;
      }

      // Mit dem Server synchronisieren, wenn angemeldet
      if (authStore.isAuthenticated) {
        try {
          await axios.delete(`/api/sessions/${sessionId}`, {
            headers: authStore.createAuthHeaders(),
          });
        } catch (err: any) {
          console.error(`Error deleting session ${sessionId}:`, err);
          error.value =
            err.response?.data?.message || "Fehler beim Löschen der Session";

          // Bei Fehler lokale Änderung rückgängig machen
          sessions.value = sessionsBefore;
          messages.value = messagesBackup;
          throw err; // Re-throw the error so the caller can handle it
        }
      }
    }

    /**
     * Löscht die aktuelle Session (setzt currentSessionId auf null)
     */
    function clearCurrentSession(): void {
      currentSessionId.value = null;
    }

    /**
     * Reset the entire store state
     * Used when logging out to clear all user-specific data
     */
    function reset(): void {
      console.log("[SessionsStore] Resetting store state");
      
      // Clear all sessions and messages
      sessions.value = [];
      messages.value = {};
      pendingMessages.value = {};
      
      // Clear current session
      currentSessionId.value = null;
      
      // Clear streaming state
      streaming.value = {};
      
      // Reset sync status
      syncStatus.value = {
        lastSyncTime: 0,
        isSyncing: false,
        pendingSyncCount: 0,
      };
      
      // Clear selections
      selectedSessionIds.value = [];
      
      // Clear tags and categories
      availableTags.value = [];
      availableCategories.value = [];
      
      // Clear error state
      error.value = null;
      isLoading.value = false;
      
      // Clear persisted data from localStorage
      try {
        localStorage.removeItem('nscale-sessions');
        // Also remove any legacy storage keys
        localStorage.removeItem('sessions');
        localStorage.removeItem('chatMessages');
        localStorage.removeItem('currentSessionId');
      } catch (e) {
        console.error("[SessionsStore] Error clearing localStorage:", e);
      }
      
      console.log("[SessionsStore] Store state reset complete");
    }

    // Öffentliche API des Stores
    /**
     * Update session title based on first message
     */
    async function updateSessionTitle(sessionId: string): Promise<void> {
      try {
        const response = await axios.post(
          `/api/session/${sessionId}/update-title`,
          {},
          {
            headers: authStore.createAuthHeaders(),
          },
        );

        if (response.data && response.data.new_title) {
          // Update local session title
          const sessionIdx = sessions.value.findIndex(
            (s) => s.id === sessionId,
          );
          if (sessionIdx !== -1) {
            sessions.value[sessionIdx] = {
              ...sessions.value[sessionIdx],
              title: response.data.new_title,
            };
          }
        }
      } catch (error) {
        // Silently fail - the API endpoint seems to have issues with our session ID format
      }
    }

    return {
      // State - return refs directly, not their values
      sessions,
      currentSessionId,
      messages,
      streaming,
      isLoading,
      error,
      version,
      pendingMessages,
      syncStatus,
      availableTags,
      availableCategories,
      selectedSessionIds,

      // Getters - return computed refs directly
      currentSession,
      currentMessages,
      sortedSessions,
      isStreaming,
      currentPendingMessages,
      allCurrentMessages,
      getSessionsByTag,
      getSessionsByCategory,
      archivedSessions,
      activeSessions,

      // Actions
      initialize,
      synchronizeSessions,
      fetchMessages,
      createSession,
      setCurrentSession,
      clearCurrentSession,
      reset,
      updateSessionTitle,
      archiveSession,
      deleteSession,
      togglePinSession,
      sendMessage,
      cancelStreaming,
      deleteMessage,
      refreshSession,
      migrateFromLegacyStorage,
      syncPendingMessages,
      exportData,
      importData,
      cleanupStorage,
      loadOlderMessages,
      sendFeedback,

      // Neue Actions für Tagging und Kategorisierung
      addTagToSession,
      removeTagFromSession,
      setCategoryForSession,
      removeCategoryFromSession,
      toggleArchiveSession,
      updateSessionPreview,

      // Auswahloperationen
      selectSession,
      deselectSession,
      toggleSessionSelection,
      clearSessionSelection,

      // Massenoperationen
      archiveMultipleSessions,
      deleteMultipleSessions,
      addTagToMultipleSessions,
      setCategoryForMultipleSessions,
    };
  },
  {
    // @ts-ignore
    persist: {
      enabled: true,
      strategies: [
        {
          key: 'nscale-sessions',
          storage: localStorage,
          // Only persist certain fields, not all session data
          paths: ['currentSessionId', 'syncStatus.lastSyncTime']
        }
      ]
    },
  },
);
