import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { apiService } from "@/services/api/ApiService";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
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
  validateMessagesResponse,
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
              Object.keys(parsedMessages).forEach((sessionId) => {
                messages.value[sessionId] = parsedMessages[sessionId].map(
                  (msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp || new Date().toISOString(),
                    status: msg.status || "sent",
                  }),
                );
              });
            }

            console.log(
              "Sessions und Nachrichten aus Legacy-Speicher migriert",
            );
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

            if (syncInterval === null) {
              syncInterval = window.setInterval(() => {
                synchronizeSessions();
              }, 60000); // Alle 60 Sekunden synchronisieren
            }
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

      return cleanup();
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
      return sessions.value.filter((session) =>
        session.tags?.some((tag) => tag.id === tagId),
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
      return sessions.value.filter((session) => session.isArchived);
    });

    // Aktive (nicht-archivierte) Sessions
    const activeSessions = computed(() => {
      return sessions.value.filter((session) => !session.isArchived);
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
      if (!currentSessionId.value) return [];
      const sessionMessages = messages.value[currentSessionId.value] || [];
      const pendingSessionMessages =
        pendingMessages.value[currentSessionId.value] || [];

      return [...sessionMessages, ...pendingSessionMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
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
      console.log("=== synchronizeSessions called ===");
      console.log("Auth status:", authStore.isAuthenticated);
      console.log("Auth token:", !!authStore.token);
      console.log("Sync status:", syncStatus.value.isSyncing);

      // Early exit if not authenticated - prevent any API calls
      if (!authStore.isAuthenticated || !authStore.token) {
        console.log("Not authenticated, skipping session sync");
        return;
      }

      if (syncStatus.value.isSyncing) {
        console.log("Already syncing, skipping");
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

        // Server unterstützt jetzt Batch-API!
        const requests = [
          {
            id: "sessions_sync",
            endpoint: "/api/sessions",
            method: "GET" as const,
            params: {
              since: syncStatus.value.lastSyncTime,
            },
            headers: authHeaders,
          },
          {
            id: "sessions_stats",
            endpoint: "/api/sessions/stats",
            method: "GET" as const,
            headers: authHeaders,
          },
        ];

        // Batch-Request verwenden
        console.log(
          "About to execute batch request for sessions with:",
          requests,
        );
        let rawResponses;
        try {
          rawResponses = await batchRequestService.executeBatch(requests);
          console.log(
            "Batch request successful, got raw responses:",
            rawResponses,
          );
        } catch (batchError: any) {
          console.error("Batch request failed:", {
            error: batchError,
            message: batchError?.message,
            stack: batchError?.stack,
          });
          // Don't throw - allow app to continue with empty sessions
          sessions.value = [];
          return;
        }

        // Process batch response with new fix
        let responses;
        try {
          responses = processBatchResponse(rawResponses, "synchronizeSessions");
        } catch (processError) {
          console.error("Error processing batch response:", processError);
          sessions.value = [];
          return;
        }

        // Extract data from responses
        const sessionsData = extractBatchResponseData(responses, 0, "sessions");
        const statsData = extractBatchResponseData(responses, 1, "stats");

        // Validate and extract sessions
        const { valid, sessions: serverSessions } =
          validateSessionsResponse(sessionsData);

        if (!valid) {
          console.warn("Invalid sessions response format:", sessionsData);
          sessions.value = [];
          return;
        }

        console.log(`Processing ${serverSessions.length} sessions from server`);

        // Optimierte Sessions-Verarbeitung mit Map für schnelleren Zugriff
        if (serverSessions && serverSessions.length > 0) {
          // Lokale Sessions für schnellen Lookup in Map konvertieren
          const localSessionsMap = new Map(
            sessions.value.map((session) => [session.id, session]),
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
          localSessionsMap.forEach((session) => {
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
          console.log("Session statistics:", statsData);
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
      console.log("=== fetchMessages called ===");
      console.log("Session ID:", sessionId);
      console.log("Auth status:", authStore.isAuthenticated);

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

        // Server unterstützt jetzt Batch-API!
        // Nur Messages-Endpoint verwenden, da Metadata-Endpoint nicht unterstützt wird
        const requests = [
          {
            id: `messages_${sessionId}`,
            endpoint: `/api/sessions/${sessionId}/messages`,
            method: "GET" as const,
            headers: authHeaders,
            // Cache-Kontrolle für optimale Performance
            meta: {
              cacheTTL: 60000, // 1 Minute Cache-Lebensdauer
            },
          },
        ];

        // Batch-Request verwenden
        console.log(
          "About to execute batch request for messages with:",
          requests,
        );
        let rawResponses;
        try {
          rawResponses = await batchRequestService.executeBatch(requests);
          console.log(
            "Batch request successful, got raw responses:",
            rawResponses,
          );
        } catch (batchError: any) {
          console.error("Batch request failed:", {
            error: batchError,
            message: batchError?.message,
            stack: batchError?.stack,
          });
          throw batchError;
        }

        // Process batch response with new fix
        const responses = processBatchResponse(rawResponses, "fetchMessages");

        // Extract data from responses (nur noch eine Antwort)
        const messagesData = extractBatchResponseData(responses, 0, "messages");

        // Validate and extract messages
        const { valid, messages: validMessages } =
          validateMessagesResponse(messagesData);

        if (!valid) {
          console.warn("Invalid messages response format:", messagesData);
        }

        console.log(
          `Processing ${validMessages.length} messages for session ${sessionId}`,
        );

        messages.value = {
          ...messages.value,
          [sessionId]: validMessages,
        };

        // Metadata-Verarbeitung entfernt, da der Endpoint nicht vom Server unterstützt wird

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
        const sessionId = uuidv4();

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
        setCurrentSession(sessionId);

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

      currentSessionId.value = sessionId;

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

      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

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
              const response = await apiService.post(
                `/sessions/${sessionId}/messages`,
                {
                  content: message.content,
                  role: message.role,
                },
              );

              // Nachricht aus den ausstehenden entfernen
              pendingMessages.value[sessionId] = pendingMessages.value[
                sessionId
              ].filter((m) => m.id !== message.id);

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
        const streamingEnabled = true; // Wieder aktivieren

        if (streamingEnabled) {
          // Streaming mit EventSource
          console.log("=== STREAMING DEBUG START ===");
          console.log("Using streaming endpoint for message:", content);

          // Erstelle eine initiale Assistant-Nachricht für Streaming
          const assistantTempId = `temp-response-${uuidv4()}`;
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

          const finishStreaming = () => {
            const finalMsgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (finalMsgIndex !== -1) {
              const updatedMessages = [...messages.value[sessionId]];
              updatedMessages[finalMsgIndex] = {
                ...updatedMessages[finalMsgIndex],
                isStreaming: false,
                status: "sent",
              };
              messages.value = {
                ...messages.value,
                [sessionId]: updatedMessages,
              };
            }

            streaming.value = {
              isActive: false,
              progress: 100,
              currentSessionId: null,
            };
          };

          // URL-Parameter für Streaming
          const params = new URLSearchParams();
          params.append("question", content);
          // session_id ist immer erforderlich
          params.append("session_id", sessionId || "new");
          // NICHT token in die URL - sollte im Header sein!
          // params.append('token', authToken); // Token als URL-Parameter

          const url = `/api/question/stream?${params.toString()}`;
          console.log("Streaming URL:", url);

          // Ersetze EventSource durch fetch mit Headers
          let responseContent = "";
          try {
            const response = await fetch(url, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${authToken}`,
                Accept: "text/event-stream",
              },
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

            // Stream verarbeiten
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });

              // SSE-Format parsen
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    finishStreaming();
                    return;
                  }

                  responseContent += data;
                  console.log("Current response content:", responseContent);

                  // Update the message
                  const msgIndex = messages.value[sessionId].findIndex(
                    (msg) => msg.id === assistantTempId,
                  );
                  if (msgIndex !== -1) {
                    const updatedMessages = [...messages.value[sessionId]];
                    updatedMessages[msgIndex] = {
                      ...updatedMessages[msgIndex],
                      content: responseContent,
                      isStreaming: true,
                      status: "pending",
                    };
                    messages.value = {
                      ...messages.value,
                      [sessionId]: updatedMessages,
                    };
                  }
                }
              }
            }

            finishStreaming();
          } catch (error) {
            console.error("Streaming error:", error);

            // Fallback auf nicht-streaming API
            console.log("Falling back to non-streaming API");

            // Wenn noch kein Content, versuche die non-streaming API
            if (!responseContent) {
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

              // Update message
              const msgIndex = messages.value[sessionId].findIndex(
                (msg) => msg.id === assistantTempId,
              );
              if (msgIndex !== -1) {
                const updatedMessages = [...messages.value[sessionId]];
                updatedMessages[msgIndex] = assistantMessage;
                messages.value = {
                  ...messages.value,
                  [sessionId]: updatedMessages,
                };
              }
            }

            finishStreaming();
          }
        } else {
          // Nicht-Streaming-Version verwenden
          console.log("Using non-streaming endpoint for message:", content);

          const assistantTempId = `temp-response-${uuidv4()}`; // Diese Variable fehlte
          const requestData: any = {
            question: content,
          };

          if (/^\d+$/.test(sessionId)) {
            requestData.session_id = parseInt(sessionId);
          }

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

            // Update the existing message
            const msgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (msgIndex !== -1) {
              messages.value[sessionId][msgIndex] = assistantMessage;
            }

            // Mark user message as sent
            const userMessageIndex = messages.value[sessionId].findIndex(
              (m) => m.id === tempId,
            );
            if (userMessageIndex !== -1) {
              messages.value[sessionId][userMessageIndex].status = "sent";
            }
          } catch (err) {
            console.error("Fallback error:", err);
            const msgIndex = messages.value[sessionId].findIndex(
              (msg) => msg.id === assistantTempId,
            );
            if (msgIndex !== -1) {
              messages.value[sessionId][msgIndex].content =
                "Fehler bei der Kommunikation mit dem Server";
              messages.value[sessionId][msgIndex].isStreaming = false;
              messages.value[sessionId][msgIndex].status = "error";
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
      Object.keys(messages.value).forEach((sessionId) => {
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
      ].tags!.filter((t) => t.id !== tagId);
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

      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

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

    // Öffentliche API des Stores
    return {
      // State
      sessions: sessions.value,
      currentSessionId: currentSessionId.value,
      messages: messages.value,
      streaming: streaming.value,
      isLoading: isLoading.value,
      error: error.value,
      version: version.value,
      pendingMessages: pendingMessages.value,
      syncStatus: syncStatus.value,
      availableTags: availableTags.value,
      availableCategories: availableCategories.value,
      selectedSessionIds: selectedSessionIds.value,

      // Getters
      currentSession: currentSession.value,
      currentMessages: currentMessages.value,
      sortedSessions: sortedSessions.value,
      isStreaming: isStreaming.value,
      currentPendingMessages: currentPendingMessages.value,
      allCurrentMessages: allCurrentMessages.value,
      getSessionsByTag: getSessionsByTag.value,
      getSessionsByCategory: getSessionsByCategory.value,
      archivedSessions: archivedSessions.value,
      activeSessions: activeSessions.value,

      // Actions
      initialize,
      synchronizeSessions,
      fetchMessages,
      createSession,
      setCurrentSession,
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
    persist: true,
  },
);
