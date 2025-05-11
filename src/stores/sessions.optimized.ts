import { defineStore } from "pinia";
import { computed, ref, watch, shallowRef, readonly, markRaw } from "vue";
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

/**
 * Optimierter Sessions Store zur Verwaltung von Chat-Sessions und Nachrichten
 * - Verbesserte Reaktivität mit selektiven Updates
 * - Optimierte Persistenz für große Datensätze
 * - Effiziente Streaming-Verarbeitung mit Batch-Updates
 * - Verbesserte Offline-Unterstützung
 * - Memoization für rechenintensive Getter
 */
export const useSessionsStore = defineStore(
  "sessions",
  () => {
    // Referenz auf den Auth-Store für Benutzerinformationen
    const authStore = useAuthStore();

    // State
    // Verwenden von shallowRef für bessere Performance bei Arrays und Objects mit vielen Elementen
    const sessions = shallowRef<ChatSession[]>([]);
    const currentSessionId = ref<string | null>(null);

    // Für Nachrichten verwenden wir ein Zwei-Ebenen-System:
    // 1. Ein ShallowRef für das Haupt-Nachrichtenobjekt (äußere Map)
    // 2. Normale Refs für die Nachrichtenarrays pro Session (innere Arrays)
    const messages = shallowRef<Record<string, ChatMessage[]>>({});

    const streaming = ref<StreamingStatus>({
      isActive: false,
      progress: 0,
      currentSessionId: null,
    });

    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const version = ref<number>(3); // Erhöhte Version wegen Optimierungen

    // Verwende markRaw für Daten, die nicht reaktiv sein müssen
    const pendingMessages = shallowRef<Record<string, ChatMessage[]>>({});

    const syncStatus = ref<{
      lastSyncTime: number;
      isSyncing: boolean;
      error: string | null;
      pendingSessionIds: Set<string>; // Neue Eigenschaft für Synchronisation-Tracking
    }>({
      lastSyncTime: 0,
      isSyncing: false,
      error: null,
      pendingSessionIds: new Set(),
    });

    // Verfügbare Tags und Kategorien (nicht reaktiv, da selten geändert)
    const availableTags = shallowRef<SessionTag[]>([
      { id: "important", name: "Wichtig", color: "#F56565" },
      { id: "work", name: "Arbeit", color: "#3182CE" },
      { id: "personal", name: "Persönlich", color: "#48BB78" },
      { id: "research", name: "Recherche", color: "#9F7AEA" },
      { id: "followup", name: "Nachverfolgen", color: "#ED8936" },
      { id: "draft", name: "Entwurf", color: "#A0AEC0" },
    ]);

    const availableCategories = shallowRef<SessionCategory[]>([
      { id: "general", name: "Allgemein", color: "#718096" },
      { id: "support", name: "Support", color: "#3182CE" },
      { id: "documentation", name: "Dokumentation", color: "#48BB78" },
      { id: "training", name: "Training", color: "#9F7AEA" },
      { id: "project", name: "Projekt", color: "#ED8936" },
      { id: "archive", name: "Archiv", color: "#A0AEC0" },
    ]);

    // Ausgewählte Sessions (für Multi-Select)
    const selectedSessionIds = ref<string[]>([]);

    // Cache für optimierte Getter
    const getterCache = new Map<string, any>();

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

              // Nachrichten konvertieren und in das neue Format umwandeln
              const newMessages: Record<string, ChatMessage[]> = {};
              Object.keys(parsedMessages).forEach((sessionId) => {
                newMessages[sessionId] = parsedMessages[sessionId].map(
                  (msg: any) => ({
                    ...msg,
                    timestamp: msg.timestamp || new Date().toISOString(),
                    status: msg.status || "sent",
                  }),
                );
              });

              messages.value = newMessages;
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
                // Effiziente Synchronisation - nur wenn keine andere läuft
                if (!syncStatus.value.isSyncing) {
                  synchronizeSessions();
                }
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

    // Optimierte Getters mit Memoization

    // Cache für Getter zurücksetzen (wird bei wichtigen Zustandsänderungen aufgerufen)
    function resetGetterCache() {
      getterCache.clear();
    }

    // Memoized Getter für die aktuelle Session
    const currentSession = computed(() => {
      // Cache-Schlüssel aufbauend auf relevanten Daten
      const cacheKey = `currentSession:${currentSessionId.value}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result =
        sessions.value.find((s) => s.id === currentSessionId.value) || null;
      getterCache.set(cacheKey, result);
      return result;
    });

    // Memoized Getter für aktuelle Nachrichten
    const currentMessages = computed(() => {
      if (!currentSessionId.value) return [];

      // Cache-Schlüssel basierend auf der Session-ID und Nachrichtenlänge
      const sessionMessages = messages.value[currentSessionId.value] || [];
      const cacheKey = `currentMessages:${currentSessionId.value}:${sessionMessages.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      getterCache.set(cacheKey, sessionMessages);
      return sessionMessages;
    });

    // Optimierte Version des Getter für sortierte Sessions
    const sortedSessions = computed(() => {
      // Cache-Schlüssel basierend auf Sessions-Array-Länge und den letzten Änderungen
      const cacheKey = `sortedSessions:${sessions.value.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = [...sessions.value].sort((a, b) => {
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

      getterCache.set(cacheKey, result);
      return result;
    });

    // Sessions mit Tags filtern - Memoization mit Fabrikfunktion
    const getSessionsByTag = computed(() => (tagId: string) => {
      // Cache-Schlüssel basierend auf Tag-ID und Sessions-Array-Länge
      const cacheKey = `sessionsByTag:${tagId}:${sessions.value.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = sessions.value.filter((session) =>
        session.tags?.some((tag) => tag.id === tagId),
      );

      getterCache.set(cacheKey, result);
      return result;
    });

    // Sessions nach Kategorie filtern - Memoization mit Fabrikfunktion
    const getSessionsByCategory = computed(() => (categoryId: string) => {
      // Cache-Schlüssel basierend auf Kategorie-ID und Sessions-Array-Länge
      const cacheKey = `sessionsByCategory:${categoryId}:${sessions.value.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = sessions.value.filter(
        (session) => session.category?.id === categoryId,
      );

      getterCache.set(cacheKey, result);
      return result;
    });

    // Archivierte Sessions - Memoized
    const archivedSessions = computed(() => {
      // Cache-Schlüssel basierend auf Sessions-Array-Länge
      const cacheKey = `archivedSessions:${sessions.value.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = sessions.value.filter((session) => session.isArchived);
      getterCache.set(cacheKey, result);
      return result;
    });

    // Aktive (nicht-archivierte) Sessions - Memoized
    const activeSessions = computed(() => {
      // Cache-Schlüssel basierend auf Sessions-Array-Länge
      const cacheKey = `activeSessions:${sessions.value.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = sessions.value.filter((session) => !session.isArchived);
      getterCache.set(cacheKey, result);
      return result;
    });

    const isStreaming = computed(() => streaming.value.isActive);

    // Aktuelle ausstehende Nachrichten für die aktuelle Session
    const currentPendingMessages = computed(() =>
      currentSessionId.value
        ? pendingMessages.value[currentSessionId.value] || []
        : [],
    );

    // Alle Nachrichten der aktuellen Session (inklusive ausstehende) - Memoized
    const allCurrentMessages = computed(() => {
      if (!currentSessionId.value) return [];

      // Cache-Schlüssel basierend auf Session-ID und Nachrichtenlängen
      const sessionMessages = messages.value[currentSessionId.value] || [];
      const pendingSessionMessages =
        pendingMessages.value[currentSessionId.value] || [];
      const cacheKey = `allCurrentMessages:${currentSessionId.value}:${sessionMessages.length}:${pendingSessionMessages.length}`;

      if (getterCache.has(cacheKey)) {
        return getterCache.get(cacheKey);
      }

      const result = [...sessionMessages, ...pendingSessionMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      getterCache.set(cacheKey, result);
      return result;
    });

    // Optimierte Actions mit selektiven Updates

    /**
     * Alle Sessions des angemeldeten Benutzers laden und mit lokalem State synchronisieren
     * - Verbesserte Synchronisationsstrategie mit selektivem Update
     */
    async function synchronizeSessions(): Promise<void> {
      if (!authStore.isAuthenticated || syncStatus.value.isSyncing) return;

      syncStatus.value.isSyncing = true;
      error.value = null;

      try {
        const response = await axios.get<ChatSession[]>("/api/sessions", {
          headers: authStore.createAuthHeaders(),
          params: {
            since: syncStatus.value.lastSyncTime,
          },
        });

        // Server-Sessions mit dem lokalen Zustand zusammenführen
        const serverSessions = response.data;

        if (serverSessions.length > 0) {
          // Optimiertes Update mit minimalen Änderungen
          const updatedSessions = [...sessions.value]; // Neue Array-Referenz für Vue-Reaktivität
          let hasChanges = false;

          // Bestehende Sessions aktualisieren und neue hinzufügen
          serverSessions.forEach((serverSession) => {
            const existingIndex = updatedSessions.findIndex(
              (s) => s.id === serverSession.id,
            );

            if (existingIndex !== -1) {
              // Aktualisieren, aber nur, wenn der Server eine neuere Version hat
              const localUpdatedAt = new Date(
                updatedSessions[existingIndex].updatedAt,
              ).getTime();
              const serverUpdatedAt = new Date(
                serverSession.updatedAt,
              ).getTime();

              if (serverUpdatedAt > localUpdatedAt) {
                updatedSessions[existingIndex] = {
                  ...updatedSessions[existingIndex],
                  ...serverSession,
                };
                hasChanges = true;
              }
            } else {
              // Neue Session hinzufügen
              updatedSessions.push(serverSession);
              hasChanges = true;
            }
          });

          // Gelöschte Sessions entfernen (wenn sie auf dem Server nicht mehr existieren)
          const serverSessionIds = new Set(serverSessions.map((s) => s.id));
          const filteredSessions = updatedSessions.filter(
            (s) => serverSessionIds.has(s.id) || s.isLocal === true,
          );

          // Nur State-Update durchführen, wenn es tatsächlich Änderungen gab
          if (
            hasChanges ||
            filteredSessions.length !== updatedSessions.length
          ) {
            sessions.value = filteredSessions;
            resetGetterCache(); // Cache zurücksetzen bei Änderungen
          }
        }

        syncStatus.value.lastSyncTime = Date.now();
        syncStatus.value.error = null;
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
     * - Verbesserte Fehlerbehandlung und optimiertes Caching
     */
    async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
      if (!sessionId || !authStore.isAuthenticated) return [];

      // Einen bereits laufenden Ladevorgang für diese Session verhindern
      if (syncStatus.value.pendingSessionIds.has(sessionId)) {
        return messages.value[sessionId] || [];
      }

      isLoading.value = true;
      error.value = null;

      // Session als ausstehend markieren
      syncStatus.value.pendingSessionIds.add(sessionId);

      try {
        const response = await axios.get<ChatMessage[]>(
          `/api/sessions/${sessionId}/messages`,
          {
            headers: authStore.createAuthHeaders(),
          },
        );

        // Optimiertes Update der Nachrichten
        const messagesCopy = { ...messages.value };
        messagesCopy[sessionId] = response.data;
        messages.value = messagesCopy;

        resetGetterCache(); // Cache zurücksetzen bei Änderungen
        return response.data;
      } catch (err: any) {
        console.error(`Error fetching messages for session ${sessionId}:`, err);
        error.value =
          err.response?.data?.message || "Fehler beim Laden der Nachrichten";
        return [];
      } finally {
        isLoading.value = false;
        // Session aus den ausstehenden entfernen
        syncStatus.value.pendingSessionIds.delete(sessionId);
      }
    }

    /**
     * Erstellt eine neue Chat-Session und wechselt zu ihr
     * - Verbesserte optimistische Updates
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

        // Optimistisches Update mit minimaler Reakivität
        sessions.value = [...sessions.value, newSession];

        // Initialisieren des Nachrichten-Arrays für diese Session
        const messagesCopy = { ...messages.value };
        messagesCopy[sessionId] = [];
        messages.value = messagesCopy;

        // Getter-Cache zurücksetzen
        resetGetterCache();

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
            const sessionsClone = [...sessions.value];
            const index = sessionsClone.findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              sessionsClone[index] = { ...sessionsClone[index] };
              delete sessionsClone[index].isLocal;
              sessions.value = sessionsClone;
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
     * - Verbesserte Lade-Strategie mit Caching
     */
    async function setCurrentSession(sessionId: string): Promise<void> {
      if (currentSessionId.value === sessionId) return;

      currentSessionId.value = sessionId;
      resetGetterCache(); // Cache zurücksetzen bei Session-Wechsel

      // Nachrichten laden, wenn sie noch nicht im Store sind oder nur teilweise
      if (
        !messages.value[sessionId] ||
        messages.value[sessionId].length === 0
      ) {
        await fetchMessages(sessionId);
      }
    }

    /**
     * Aktualisiert den Titel einer Session
     * - Verbesserte optimistische Updates
     */
    async function updateSessionTitle(
      sessionId: string,
      newTitle: string,
    ): Promise<void> {
      if (!sessionId) return;

      // Optimistische Aktualisierung im lokalen State
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        // Shallow-Copy des Sessions-Arrays
        const sessionsClone = [...sessions.value];

        // Deep-Copy nur des zu ändernden Elements
        sessionsClone[sessionIndex] = {
          ...sessionsClone[sessionIndex],
          title: newTitle,
          updatedAt: new Date().toISOString(),
        };

        sessions.value = sessionsClone;
        resetGetterCache(); // Cache zurücksetzen bei Änderungen
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

            // Shallow-Copy des Sessions-Arrays
            const sessionsClone = [...sessions.value];

            // Deep-Copy nur des zu ändernden Elements
            sessionsClone[sessionIndex] = {
              ...sessionsClone[sessionIndex],
              title: oldTitle,
            };

            sessions.value = sessionsClone;
            resetGetterCache(); // Cache zurücksetzen bei Änderungen
          }
        }
      }
    }

    /**
     * Archiviert/löscht eine Session
     * - Optimierte Reaktivität für bessere Performance
     */
    async function archiveSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Optimistische Löschung im lokalen State
      const sessionsBefore = sessions.value;

      // Effiziente Filterung mit neuer Array-Referenz
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      // Nachrichten-State optimiert aktualisieren
      const messagesClone = { ...messages.value };
      delete messagesClone[sessionId];
      messages.value = messagesClone;

      // Getter-Cache zurücksetzen
      resetGetterCache();

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

          // Auch die Nachrichtendaten wiederherstellen, wenn nötig
          if (messagesClone[sessionId]) {
            messages.value = {
              ...messagesClone,
              [sessionId]: messagesClone[sessionId],
            };
          }

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Markiert eine Session als angeheftet/nicht angeheftet
     * - Selektive Updates für optimierte Reaktivität
     */
    async function togglePinSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Aktuellen Pin-Status finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      const isPinned = !sessions.value[sessionIndex].isPinned;

      // Effizientes Update mit neuer Array-Referenz und selektivem Deep-Copy
      const sessionsClone = [...sessions.value];
      sessionsClone[sessionIndex] = {
        ...sessionsClone[sessionIndex],
        isPinned,
        updatedAt: new Date().toISOString(),
      };

      sessions.value = sessionsClone;
      resetGetterCache(); // Cache zurücksetzen bei Änderungen

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
          const sessionsRollback = [...sessions.value];
          sessionsRollback[sessionIndex] = {
            ...sessionsRollback[sessionIndex],
            isPinned: !isPinned,
          };

          sessions.value = sessionsRollback;
          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Synchronisiert lokale ausstehende Nachrichten mit dem Server
     * - Verbesserte Retry-Strategie und Priorisierung
     */
    async function syncPendingMessages(): Promise<void> {
      if (!authStore.isAuthenticated) return;

      // Alle Sessions mit ausstehenden Nachrichten durchgehen
      const sessionIdsWithPending = Object.keys(pendingMessages.value);

      // Sortiere die Sessions nach Priorität (aktuelle Session zuerst)
      sessionIdsWithPending.sort((a, b) => {
        if (a === currentSessionId.value) return -1;
        if (b === currentSessionId.value) return 1;
        return 0;
      });

      for (const sessionId of sessionIdsWithPending) {
        const pendingForSession = pendingMessages.value[sessionId];

        if (pendingForSession && pendingForSession.length > 0) {
          // Lokalen Zustand für optimistisches Update speichern
          const pendingBackup = [...pendingForSession];
          const messagesBackup = messages.value[sessionId]
            ? [...messages.value[sessionId]]
            : [];

          // Optimistisch die Nachrichten als gesendet markieren
          const pendingUpdated = { ...pendingMessages.value };
          pendingUpdated[sessionId] = [];
          pendingMessages.value = pendingUpdated;

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

              // Nachricht aus den ausstehenden entfernen und zu normalen Nachrichten hinzufügen
              if (!messages.value[sessionId]) {
                const messagesUpdated = { ...messages.value };
                messagesUpdated[sessionId] = [];
                messages.value = messagesUpdated;
              }

              // Optimiertes Update der Nachrichtenliste
              const messagesForSession = [...(messages.value[sessionId] || [])];
              messagesForSession.push({
                ...message,
                id: response.data.id || message.id,
                status: "sent",
              });

              const messagesUpdated = {
                ...messages.value,
                [sessionId]: messagesForSession,
              };
              messages.value = messagesUpdated;
            } catch (err) {
              console.error(
                `Error syncing pending message ${message.id}:`,
                err,
              );

              // Bei Fehler die Nachricht zurück in die ausstehenden Liste setzen
              const pendingUpdated = { ...pendingMessages.value };
              if (!pendingUpdated[sessionId]) {
                pendingUpdated[sessionId] = [];
              }

              pendingUpdated[sessionId] = [
                ...pendingUpdated[sessionId],
                message,
              ];
              pendingMessages.value = pendingUpdated;
            }
          }

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Sendet eine Nachricht und verarbeitet die Antwort
     * - Kann mit Streaming oder ohne verwendet werden
     * - Optimierte Reaktivität und Batch-Updates
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

      // Optimiertes Update der Nachrichtenliste für die Session
      const messagesUpdated = { ...messages.value };
      if (!messagesUpdated[sessionId]) {
        messagesUpdated[sessionId] = [];
      }

      messagesUpdated[sessionId] = [...messagesUpdated[sessionId], userMessage];
      messages.value = messagesUpdated;

      // Sitzung aktualisieren - optimiert durch Shallow-Copy und selektives Deep-Copy
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        const sessionsClone = [...sessions.value];
        sessionsClone[sessionIndex] = {
          ...sessionsClone[sessionIndex],
          updatedAt: timestamp,
        };

        sessions.value = sessionsClone;
      }

      // Streaming-Status setzen
      streaming.value = {
        isActive: true,
        progress: 0,
        currentSessionId: sessionId,
      };

      // Cache zurücksetzen bei Änderungen
      resetGetterCache();

      // Falls nicht angemeldet, Nachricht zur ausstehenden Liste hinzufügen
      if (!authStore.isAuthenticated) {
        const pendingUpdated = { ...pendingMessages.value };
        if (!pendingUpdated[sessionId]) {
          pendingUpdated[sessionId] = [];
        }

        pendingUpdated[sessionId] = [
          ...pendingUpdated[sessionId],
          {
            ...userMessage,
            status: "pending",
          },
        ];

        pendingMessages.value = pendingUpdated;

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

        // Optimiertes Update für die Antwort
        const messagesWithResponse = { ...messages.value };
        messagesWithResponse[sessionId] = [
          ...messagesWithResponse[sessionId],
          assistantMessage,
        ];
        messages.value = messagesWithResponse;

        // Streaming beenden
        streaming.value = {
          isActive: false,
          progress: 100,
          currentSessionId: null,
        };

        resetGetterCache(); // Cache zurücksetzen bei Änderungen
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

        // Variablen für Batch-Updates
        let lastUpdateTime = Date.now();
        let pendingContent = "";
        const updateInterval = 100; // Update alle 100ms

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
        const messagesWithAssistant = { ...messages.value };
        messagesWithAssistant[sessionId] = [
          ...messagesWithAssistant[sessionId],
          assistantMessage,
        ];
        messages.value = messagesWithAssistant;

        resetGetterCache(); // Cache zurücksetzen bei Änderungen

        // Funktion zum batchen Aktualisieren des Nachrichteninhalts
        const updateMessageContent = (
          content: string,
          force: boolean = false,
        ) => {
          const now = Date.now();

          // Inhalte sammeln und nur in Intervallen aktualisieren
          pendingContent += content;

          // Nur aktualisieren, wenn das Intervall abgelaufen ist oder wenn erzwungen
          if (force || now - lastUpdateTime >= updateInterval) {
            const index = messages.value[sessionId].findIndex(
              (m) => m.id === assistantTempId,
            );

            if (index !== -1) {
              // Klonen des State vor den Änderungen für Immutability
              const sessionMessages = [...messages.value[sessionId]];
              sessionMessages[index] = {
                ...sessionMessages[index],
                content: assistantContent + pendingContent,
                isStreaming: true,
              };

              // Gesamten Messages-State aktualisieren mit optimierter Zugriffsstrategie
              const messagesUpdated = {
                ...messages.value,
                [sessionId]: sessionMessages,
              };
              messages.value = messagesUpdated;

              assistantContent += pendingContent;
              pendingContent = "";
              lastUpdateTime = now;

              resetGetterCache(); // Cache zurücksetzen bei Änderungen
            }
          }
        };

        // Event-Handler für Streaming-Events
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "content") {
              // Inhalt sammeln für Batch-Update
              updateMessageContent(data.content);
            } else if (data.type === "metadata") {
              // Metadaten zur Antwort hinzufügen (z.B. Quellenangaben)
              const index = messages.value[sessionId].findIndex(
                (m) => m.id === assistantTempId,
              );
              if (index !== -1) {
                // Klonen des State vor den Änderungen für Immutability
                const sessionMessages = [...messages.value[sessionId]];
                sessionMessages[index] = {
                  ...sessionMessages[index],
                  metadata: data.metadata,
                };

                // Gesamten Messages-State aktualisieren mit optimierter Zugriffsstrategie
                const messagesUpdated = {
                  ...messages.value,
                  [sessionId]: sessionMessages,
                };
                messages.value = messagesUpdated;

                resetGetterCache(); // Cache zurücksetzen bei Änderungen
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

            // Letztes Update erzwingen, um sicherzustellen, dass der vollständige Inhalt angezeigt wird
            updateMessageContent("", true);

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
              // Klonen des State vor den Änderungen für Immutability
              const sessionMessages = [...messages.value[sessionId]];
              sessionMessages[index] = {
                ...sessionMessages[index],
                id: data.id || assistantTempId,
                content: data.content || assistantContent,
                isStreaming: false,
                status: "sent",
                metadata: data.metadata || sessionMessages[index].metadata,
              };

              // Gesamten Messages-State aktualisieren mit optimierter Zugriffsstrategie
              const messagesUpdated = {
                ...messages.value,
                [sessionId]: sessionMessages,
              };
              messages.value = messagesUpdated;

              resetGetterCache(); // Cache zurücksetzen bei Änderungen
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
            // Letztes Update erzwingen
            updateMessageContent("", true);

            // Nachrichten-Status aktualisieren
            const sessionMessages = [...messages.value[sessionId]];
            sessionMessages[index] = {
              ...sessionMessages[index],
              isStreaming: false,
              status: "error",
              content: assistantContent || "Fehler beim Laden der Antwort.",
            };

            // Gesamten Messages-State aktualisieren
            const messagesUpdated = {
              ...messages.value,
              [sessionId]: sessionMessages,
            };
            messages.value = messagesUpdated;

            resetGetterCache(); // Cache zurücksetzen bei Änderungen
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
     * - Optimiert mit selektiven Updates
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
          // Klonen der Nachrichtenliste für Immutability
          const sessionMessages = [...currentSessionMessages];
          sessionMessages[streamingMessageIndex] = {
            ...sessionMessages[streamingMessageIndex],
            isStreaming: false,
            content:
              sessionMessages[streamingMessageIndex].content + " [abgebrochen]",
            status: "error",
          };

          // Update mit selektiver Immutability
          const messagesUpdated = {
            ...messages.value,
            [currentSessionId.value]: sessionMessages,
          };
          messages.value = messagesUpdated;

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Löscht eine Nachricht aus einer Session
     * - Optimierte Immutability
     */
    async function deleteMessage(
      sessionId: string,
      messageId: string,
    ): Promise<void> {
      if (!sessionId || !messageId) return;

      // Backup für Rollback erstellen
      const messagesBackup = messages.value[sessionId]
        ? [...messages.value[sessionId]]
        : [];

      // Optimistisches Update
      if (messages.value[sessionId]) {
        const sessionMessages = messages.value[sessionId].filter(
          (m) => m.id !== messageId,
        );
        const messagesUpdated = {
          ...messages.value,
          [sessionId]: sessionMessages,
        };
        messages.value = messagesUpdated;

        resetGetterCache(); // Cache zurücksetzen bei Änderungen
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
          const messagesUpdated = {
            ...messages.value,
            [sessionId]: messagesBackup,
          };
          messages.value = messagesUpdated;

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Lädt den gesamten Chat-Verlauf neu
     * - Optimierte Methode mit besserer Fehlerbehandlung
     */
    async function refreshSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      await fetchMessages(sessionId);
    }

    /**
     * Exportiert alle Sessions und Nachrichten als JSON
     * - Performance-optimierte Version
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
     * - Verbesserte Validierung und Fehlerbehandlung
     */
    function importData(jsonData: string): boolean {
      try {
        const data = JSON.parse(jsonData);

        // Validierung der Import-Daten
        if (!data.sessions || !Array.isArray(data.sessions)) {
          throw new Error("Ungültiges Format: sessions-Array fehlt");
        }

        if (!data.messages || typeof data.messages !== "object") {
          throw new Error("Ungültiges Format: messages-Objekt fehlt");
        }

        // Daten importieren
        sessions.value = data.sessions;
        messages.value = data.messages;

        if (data.version) {
          version.value = data.version;
        }

        resetGetterCache(); // Cache zurücksetzen bei Änderungen
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
     * - Überarbeitete Strategie für bessere Performance
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
          const messagesUpdated = {
            ...messages.value,
            [sessionId]: recentMessages,
          };
          messages.value = messagesUpdated;

          // Ältere Nachrichten in den sessionStorage verschieben
          try {
            // Bestehende ältere Nachrichten abrufen
            const existingOlder = JSON.parse(
              sessionStorage.getItem(`session_${sessionId}_older_messages`) ||
                "[]",
            );

            // In Chunks teilen, um sessionStorage-Limits zu vermeiden
            const chunkSize = 20;
            const totalOlder = [...existingOlder, ...olderMessages];
            const chunks = Math.ceil(totalOlder.length / chunkSize);

            for (let i = 0; i < chunks; i++) {
              const start = i * chunkSize;
              const end = Math.min(start + chunkSize, totalOlder.length);
              const chunk = totalOlder.slice(start, end);

              sessionStorage.setItem(
                `session_${sessionId}_older_messages_${i}`,
                JSON.stringify(chunk),
              );
            }

            // Metadata für die Chunks speichern
            sessionStorage.setItem(
              `session_${sessionId}_older_messages_meta`,
              JSON.stringify({
                chunks,
                totalCount: totalOlder.length,
                lastUpdated: new Date().toISOString(),
              }),
            );
          } catch (e) {
            console.error(
              `Error storing older messages for session ${sessionId}:`,
              e,
            );
          }

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      });
    }

    /**
     * Lädt ältere Nachrichten aus dem sessionStorage
     * - Verbesserte Chunking-Strategie
     */
    function loadOlderMessages(sessionId: string): ChatMessage[] {
      if (!sessionId) return [];

      try {
        // Metadata für die Chunks abrufen
        const meta = JSON.parse(
          sessionStorage.getItem(`session_${sessionId}_older_messages_meta`) ||
            "null",
        );

        if (!meta) {
          // Fallback für alte Speicherform
          const olderMessages = JSON.parse(
            sessionStorage.getItem(`session_${sessionId}_older_messages`) ||
              "[]",
          );

          if (olderMessages.length > 0) {
            // Zu den aktuellen Nachrichten hinzufügen
            if (!messages.value[sessionId]) {
              const messagesUpdated = { ...messages.value, [sessionId]: [] };
              messages.value = messagesUpdated;
            }

            // Zusammenführen und nach Zeitstempel sortieren
            const combinedMessages = [
              ...olderMessages,
              ...messages.value[sessionId],
            ].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            );

            const messagesUpdated = {
              ...messages.value,
              [sessionId]: combinedMessages,
            };
            messages.value = messagesUpdated;

            // Aus dem sessionStorage entfernen, da sie jetzt im Hauptspeicher sind
            sessionStorage.removeItem(`session_${sessionId}_older_messages`);

            resetGetterCache(); // Cache zurücksetzen bei Änderungen
            return olderMessages;
          }

          return [];
        }

        // Nachrichten aus allen Chunks laden
        let allOlderMessages: ChatMessage[] = [];

        for (let i = 0; i < meta.chunks; i++) {
          const chunkKey = `session_${sessionId}_older_messages_${i}`;
          const chunk = JSON.parse(sessionStorage.getItem(chunkKey) || "[]");
          allOlderMessages = [...allOlderMessages, ...chunk];

          // Chunk entfernen, da die Daten jetzt im Hauptspeicher sind
          sessionStorage.removeItem(chunkKey);
        }

        if (allOlderMessages.length > 0) {
          // Zu den aktuellen Nachrichten hinzufügen
          if (!messages.value[sessionId]) {
            const messagesUpdated = { ...messages.value, [sessionId]: [] };
            messages.value = messagesUpdated;
          }

          // Zusammenführen und nach Zeitstempel sortieren
          const combinedMessages = [
            ...allOlderMessages,
            ...messages.value[sessionId],
          ].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

          const messagesUpdated = {
            ...messages.value,
            [sessionId]: combinedMessages,
          };
          messages.value = messagesUpdated;

          // Metadata entfernen
          sessionStorage.removeItem(`session_${sessionId}_older_messages_meta`);

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }

        return allOlderMessages;
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
     * - Optimierte Version mit selektiven Updates
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
      const sessionsClone = [...sessions.value];
      const sessionClone = { ...sessionsClone[sessionIndex] };

      if (!sessionClone.tags) {
        sessionClone.tags = [];
      } else {
        sessionClone.tags = [...sessionClone.tags];
      }

      // Überprüfen, ob der Tag bereits vorhanden ist
      if (!sessionClone.tags.some((t) => t.id === tagId)) {
        sessionClone.tags.push(tag);
        sessionClone.updatedAt = new Date().toISOString();

        sessionsClone[sessionIndex] = sessionClone;
        sessions.value = sessionsClone;

        resetGetterCache(); // Cache zurücksetzen bei Änderungen
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
     * - Optimierte Version mit selektiven Updates
     */
    async function removeTagFromSession(
      sessionId: string,
      tagId: string,
    ): Promise<void> {
      if (!sessionId || !tagId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1 || !sessions.value[sessionIndex].tags) return;

      // Optimistisches Update
      const sessionsClone = [...sessions.value];
      const sessionClone = { ...sessionsClone[sessionIndex] };

      // Tag entfernen
      sessionClone.tags = sessionClone.tags!.filter((t) => t.id !== tagId);
      sessionClone.updatedAt = new Date().toISOString();

      sessionsClone[sessionIndex] = sessionClone;
      sessions.value = sessionsClone;

      resetGetterCache(); // Cache zurücksetzen bei Änderungen

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
     * - Optimierte Version mit selektiven Updates
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
      const sessionsClone = [...sessions.value];
      const sessionClone = { ...sessionsClone[sessionIndex] };

      sessionClone.category = category;
      sessionClone.updatedAt = new Date().toISOString();

      sessionsClone[sessionIndex] = sessionClone;
      sessions.value = sessionsClone;

      resetGetterCache(); // Cache zurücksetzen bei Änderungen

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
     * - Optimierte Version mit selektiven Updates
     */
    async function removeCategoryFromSession(sessionId: string): Promise<void> {
      if (!sessionId) return;

      // Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Optimistische Aktualisierung im lokalen State
      const sessionsClone = [...sessions.value];
      const sessionClone = { ...sessionsClone[sessionIndex] };

      sessionClone.category = undefined;
      sessionClone.updatedAt = new Date().toISOString();

      sessionsClone[sessionIndex] = sessionClone;
      sessions.value = sessionsClone;

      resetGetterCache(); // Cache zurücksetzen bei Änderungen

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
     * - Optimierte Version mit selektiven Updates
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
      const sessionsClone = [...sessions.value];
      const sessionClone = { ...sessionsClone[sessionIndex] };

      sessionClone.isArchived = archive;
      sessionClone.updatedAt = new Date().toISOString();

      sessionsClone[sessionIndex] = sessionClone;
      sessions.value = sessionsClone;

      resetGetterCache(); // Cache zurücksetzen bei Änderungen

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
          const sessionsRollback = [...sessions.value];
          const sessionRollback = { ...sessionsRollback[sessionIndex] };

          sessionRollback.isArchived = !archive;
          sessionsRollback[sessionIndex] = sessionRollback;

          sessions.value = sessionsRollback;
          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }
      }
    }

    /**
     * Aktualisiert die Vorschau einer Session
     * - Optimierte Version, die Vorschau-Updates batcht
     */
    const previewUpdateQueue = new Map<
      string,
      { text: string; count: number; timer: number | null }
    >();

    function updateSessionPreview(
      sessionId: string,
      previewText: string,
      messageCount: number,
    ): void {
      if (!sessionId) return;

      // Aktuelle Session finden
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex === -1) return;

      // Vorherige Timer löschen, falls vorhanden
      if (
        previewUpdateQueue.has(sessionId) &&
        previewUpdateQueue.get(sessionId)!.timer !== null
      ) {
        clearTimeout(previewUpdateQueue.get(sessionId)!.timer!);
      }

      // Update zur Warteschlange hinzufügen
      previewUpdateQueue.set(sessionId, {
        text: previewText,
        count: messageCount,
        timer: window.setTimeout(() => {
          // Nach 100ms das Update durchführen
          const queuedUpdate = previewUpdateQueue.get(sessionId);
          if (!queuedUpdate) return;

          // Session-Index nochmal prüfen, da er sich in der Zwischenzeit geändert haben könnte
          const currentIndex = sessions.value.findIndex(
            (s) => s.id === sessionId,
          );
          if (currentIndex === -1) return;

          // Optimistisches Update mit selektiver Immutability
          const sessionsClone = [...sessions.value];
          const sessionClone = { ...sessionsClone[currentIndex] };

          sessionClone.preview = queuedUpdate.text;
          sessionClone.messageCount = queuedUpdate.count;

          sessionsClone[currentIndex] = sessionClone;
          sessions.value = sessionsClone;

          // Aus der Warteschlange entfernen
          previewUpdateQueue.delete(sessionId);

          resetGetterCache(); // Cache zurücksetzen bei Änderungen
        }, 100),
      });
    }

    /**
     * Wählt eine Session zur Massenbearbeitung aus
     */
    function selectSession(sessionId: string): void {
      if (!sessionId) return;

      if (!selectedSessionIds.value.includes(sessionId)) {
        selectedSessionIds.value = [...selectedSessionIds.value, sessionId];
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
      sessions: readonly(sessions),
      currentSessionId,
      messages: readonly(messages),
      streaming,
      isLoading,
      error,
      version,
      pendingMessages: readonly(pendingMessages),
      syncStatus,
      availableTags: readonly(availableTags),
      availableCategories: readonly(availableCategories),
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

      // Performance-Optimierung
      resetGetterCache,
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
