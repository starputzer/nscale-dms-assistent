import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import type {
  ChatSession,
  ChatMessage,
  StreamingStatus,
  SendMessageParams,
  SessionsState,
  SessionTag,
  SessionCategory,
} from "../types/session";
import { useAuthStore } from "./auth";
import { batchRequestService } from "@/services/api/BatchRequestService";
import {
  batchStoreQueries,
  batchOperationByIds,
} from "@/utils/apiBatchingUtils";

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
  () => {
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
    }>({
      lastSyncTime: 0,
      isSyncing: false,
      error: null,
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
      await synchronizeSessions();

      // Polling-Intervall für Synchronisation mit dem Server
      let syncInterval: number | null = null;

      // Nur synchronisieren, wenn der Benutzer angemeldet ist
      const unwatchAuth = watch(
        () => authStore.isAuthenticated,
        (isAuthenticated) => {
          if (isAuthenticated) {
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
        { immediate: true },
      );

      // Cleanup-Funktion
      return () => {
        if (syncInterval !== null) {
          clearInterval(syncInterval);
        }
        unwatchAuth();
      };
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
        // Archivierte Sessions zuletzt
        if (!a.isArchived && b.isArchived) return -1;
        if (a.isArchived && !b.isArchived) return 1;

        // Gepinnte Sessions zuerst (innerhalb ihrer Gruppe)
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

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
      if (!authStore.isAuthenticated || syncStatus.value.isSyncing) return;

      syncStatus.value.isSyncing = true;
      error.value = null;

      try {
        // Optimierte Implementierung mit Batching
        const sessionsRequest = {
          endpoint: "/api/sessions",
          method: "GET",
          params: {
            since: syncStatus.value.lastSyncTime,
          },
          headers: authStore.createAuthHeaders(),
          id: "sessions_sync",
        };

        // Statistiken zum Debuggen laden (optional)
        const statsRequest = {
          endpoint: "/api/sessions/stats",
          method: "GET",
          headers: authStore.createAuthHeaders(),
          id: "sessions_stats",
        };

        // Beide Anfragen in einem Batch senden
        const [sessionsResponse, statsResponse] = await batchStoreQueries<any>([
          sessionsRequest,
          statsRequest,
        ]);

        // Server-Sessions mit dem lokalen Zustand zusammenführen
        const serverSessions = sessionsResponse as ChatSession[];

        // Optimierte Sessions-Verarbeitung mit Map für schnelleren Zugriff
        if (serverSessions && serverSessions.length > 0) {
          // Lokale Sessions für schnellen Lookup in Map konvertieren
          const localSessionsMap = new Map(
            sessions.value.map((session) => [session.id, session]),
          );

          // Neue oder aktualisierte Sessions verarbeiten
          const updatedSessions: ChatSession[] = [];

          // Effizienter Algorithmus für große Datensätze
          serverSessions.forEach((serverSession) => {
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
                  isLocal: localSession.isLocal,
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
            if (session.isLocal) {
              updatedSessions.push(session);
            }
          });

          // Sessions aktualisieren
          sessions.value = updatedSessions;
        }

        syncStatus.value.lastSyncTime = Date.now();
        syncStatus.value.error = null;

        // Statistik-Informationen verarbeiten, wenn vorhanden
        if (statsResponse && typeof statsResponse === "object") {
          console.log("Session statistics:", statsResponse);
          // Hier könnten Statistikdaten für UI-Updates verwendet werden
        }
      } catch (err: any) {
        console.error("Error synchronizing sessions:", err);
        syncStatus.value.error =
          err.response?.data?.message || "Fehler bei der Synchronisation";
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
        // Optimierte Implementierung mit Batching
        const messagesRequest = {
          endpoint: `/api/sessions/${sessionId}/messages`,
          method: "GET",
          headers: authStore.createAuthHeaders(),
          id: `messages_${sessionId}`,
          // Cache-Kontrolle für optimale Performance
          meta: {
            cacheTTL: 60000, // 1 Minute Cache-Lebensdauer
          },
        };

        // Metadaten für die Session gleichzeitig laden
        const metadataRequest = {
          endpoint: `/api/sessions/${sessionId}/metadata`,
          method: "GET",
          headers: authStore.createAuthHeaders(),
          id: `metadata_${sessionId}`,
        };

        // Beide Anfragen in einem Batch senden
        const [messagesResponse, metadataResponse] =
          await batchStoreQueries<any>([messagesRequest, metadataRequest]);

        // Nachrichten für diese Session speichern
        messages.value = {
          ...messages.value,
          [sessionId]: messagesResponse as ChatMessage[],
        };

        // Wenn Metadaten geladen wurden, Session-Metadaten aktualisieren
        if (metadataResponse && typeof metadataResponse === "object") {
          // Session-Metadaten aktualisieren (z.B. Lesezeichen, Tags, etc.)
          const sessionIndex = sessions.value.findIndex(
            (s) => s.id === sessionId,
          );
          if (sessionIndex !== -1) {
            sessions.value[sessionIndex] = {
              ...sessions.value[sessionIndex],
              ...metadataResponse,
              // Wichtig: UpdatedAt vom Server nicht übernehmen, wenn es älter ist
              updatedAt:
                new Date(metadataResponse.updatedAt).getTime() >
                new Date(sessions.value[sessionIndex].updatedAt).getTime()
                  ? metadataResponse.updatedAt
                  : sessions.value[sessionIndex].updatedAt,
            };
          }
        }

        return messagesResponse as ChatMessage[];
      } catch (err: any) {
        console.error(`Error fetching messages for session ${sessionId}:`, err);
        error.value =
          err.response?.data?.message || "Fehler beim Laden der Nachrichten";
        return [];
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Nachrichten für mehrere Sessions gleichzeitig laden
     *
     * Optimierte Version mit Batch-Anfragen für effiziente Massenoperationen
     */
    async function fetchMultipleSessionMessages(
      sessionIds: string[],
    ): Promise<Record<string, ChatMessage[]>> {
      if (!sessionIds.length || !authStore.isAuthenticated) return {};

      isLoading.value = true;
      error.value = null;

      try {
        // Anfragen für alle Session-IDs erstellen
        const requests = sessionIds.map((sessionId) => ({
          endpoint: `/api/sessions/${sessionId}/messages`,
          method: "GET" as const,
          headers: authStore.createAuthHeaders(),
          id: `messages_batch_${sessionId}`,
          meta: {
            sessionId, // Speichern der Session-ID für spätere Zuordnung
            cacheTTL: 60000,
          },
        }));

        // Alle Anfragen in einem Batch senden
        const responses = await batchStoreQueries<ChatMessage[]>(requests);

        // Ergebnisse in das Messages-Objekt eintragen
        const result: Record<string, ChatMessage[]> = {};
        responses.forEach((messagesData, index) => {
          const sessionId = sessionIds[index];
          result[sessionId] = messagesData;

          // Auch im Store speichern
          messages.value = {
            ...messages.value,
            [sessionId]: messagesData,
          };
        });

        return result;
      } catch (err: any) {
        console.error(`Error fetching messages for multiple sessions:`, err);
        error.value =
          err.response?.data?.message || "Fehler beim Laden der Nachrichten";
        return {};
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
          isLocal: true, // Markieren als lokal erstellt
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

            const response = await axios.post<ChatSession>(
              "/api/sessions",
              payload,
              {
                headers: authStore.createAuthHeaders(),
              },
            );

            // Lokale Markierung entfernen
            const index = sessions.value.findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              delete sessions.value[index].isLocal;
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
              const response = await axios.post(
                `/api/sessions/${sessionId}/messages`,
                {
                  content: message.content,
                  role: message.role,
                },
                {
                  headers: authStore.createAuthHeaders(),
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

      messages.value[sessionId].push(userMessage);

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
        // Event-Source für Streaming einrichten
        const eventSource = new EventSource(
          `/api/sessions/${sessionId}/stream?message=${encodeURIComponent(content)}`,
        );

        // Temporäre ID für die Antwortnachricht
        const assistantTempId = `temp-response-${uuidv4()}`;
        let assistantContent = "";

        // Anfangszustand der Antwortnachricht
        const assistantMessage: ChatMessage = {
          id: assistantTempId,
          sessionId,
          content: "",
          role: "assistant",
          timestamp: new Date().toISOString(),
          isStreaming: true,
          status: "pending",
        };

        // Antwortnachricht zum lokalen State hinzufügen
        messages.value[sessionId].push(assistantMessage);

        // Funktion zum Aktualisieren des Nachrichteninhalts
        const updateMessageContent = (content: string) => {
          const index = messages.value[sessionId].findIndex(
            (m) => m.id === assistantTempId,
          );
          if (index !== -1) {
            messages.value[sessionId][index] = {
              ...messages.value[sessionId][index],
              content,
              isStreaming: true,
            };
          }
        };

        // Event-Handler für Streaming-Events
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "content") {
              // Inhalt zur Antwort hinzufügen
              assistantContent += data.content;
              updateMessageContent(assistantContent);
            } else if (data.type === "metadata") {
              // Metadaten zur Antwort hinzufügen (z.B. Quellenangaben)
              const index = messages.value[sessionId].findIndex(
                (m) => m.id === assistantTempId,
              );
              if (index !== -1) {
                messages.value[sessionId][index] = {
                  ...messages.value[sessionId][index],
                  metadata: data.metadata,
                };
              }
            } else if (data.type === "progress") {
              // Fortschritt aktualisieren
              streaming.value.progress = data.progress;
            }
          } catch (err) {
            console.error("Error parsing streaming event:", err);
          }
        };

        // Event-Handler für den Abschluss des Streamings
        eventSource.addEventListener("done", async (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);

            // Streaming beenden
            streaming.value = {
              isActive: false,
              progress: 100,
              currentSessionId: null,
            };

            // Antwortnachricht mit finaler ID aktualisieren
            const index = messages.value[sessionId].findIndex(
              (m) => m.id === assistantTempId,
            );
            if (index !== -1) {
              messages.value[sessionId][index] = {
                ...messages.value[sessionId][index],
                id: data.id || assistantTempId,
                content: data.content || assistantContent,
                isStreaming: false,
                status: "sent",
                metadata:
                  data.metadata || messages.value[sessionId][index].metadata,
              };
            }

            // Session-Titel aktualisieren, falls es eine neue Session ohne Titel ist
            const session = sessions.value.find((s) => s.id === sessionId);
            if (session && session.title === "Neue Unterhaltung") {
              // Automatisch einen Titel basierend auf der ersten Benutzernachricht generieren
              const title =
                content.length > 30
                  ? content.substring(0, 30) + "..."
                  : content;
              await updateSessionTitle(sessionId, title);
            }

            // Event-Source schließen
            eventSource.close();
          } catch (err) {
            console.error("Error processing done event:", err);
            eventSource.close();
          }
        });

        // Event-Handler für Fehler
        eventSource.onerror = (err) => {
          console.error("EventSource error:", err);

          // Streaming beenden
          streaming.value = {
            isActive: false,
            progress: 0,
            currentSessionId: null,
          };

          // Fehlerstatus setzen
          const index = messages.value[sessionId].findIndex(
            (m) => m.id === assistantTempId,
          );
          if (index !== -1) {
            messages.value[sessionId][index] = {
              ...messages.value[sessionId][index],
              isStreaming: false,
              status: "error",
              content: assistantContent || "Fehler beim Laden der Antwort.",
            };
          }

          // Event-Source schließen
          eventSource.close();
          error.value = "Fehler bei der Kommunikation mit dem Server.";
        };
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
      (isAuthenticated) => {
        if (isAuthenticated) {
          // Wenn der Benutzer angemeldet ist, ausstehende Nachrichten synchronisieren
          syncPendingMessages();
        }
      },
    );

    // Bei Store-Erstellung initialisieren
    const cleanup = initialize();

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

    // Öffentliche API des Stores
    return {
      // State
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

      // Getters
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
      updateSessionTitle,
      archiveSession,
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
    // Store serialization options für Persistenz
    persist: {
      // Verwende localStorage für die Persistenz
      storage: localStorage,

      // Selektives Speichern bestimmter State-Elemente
      paths: [
        "sessions",
        "currentSessionId",
        "version",
        "pendingMessages",
        "syncStatus.lastSyncTime",
        "availableTags",
        "availableCategories",
        "selectedSessionIds",
      ],

      // Optimierung für große Datasets
      serializer: {
        deserialize: (value) => {
          try {
            return JSON.parse(value);
          } catch (err) {
            console.error("Error deserializing store data:", err);
            return {};
          }
        },
        serialize: (state) => {
          try {
            // Optimierung: Speichere nur die Sitzungsmetadaten, nicht den vollständigen Nachrichtenverlauf
            // Nachrichten werden separat in sessionStorage gespeichert oder können nachgeladen werden
            const optimizedState = {
              ...state,
              // Nachrichten nicht persistieren, um Speicherplatz zu sparen
              messages: {},
            };
            return JSON.stringify(optimizedState);
          } catch (err) {
            console.error("Error serializing store data:", err);
            return "{}";
          }
        },
      },
    },
  },
);
