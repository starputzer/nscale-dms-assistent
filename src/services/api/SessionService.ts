/**
 * SessionService - Spezialisierter Service für Chat-Sessions
 *
 * Dieser Service verwaltet die Chat-Sessions und deren Nachrichten,
 * einschließlich Streaming-Unterstützung und Offline-Funktionalität.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import {
  createStreamingConnection,
  StreamingService,
} from "./StreamingService";
import { defaultIndexedDBService } from "../storage/IndexedDBService";
import { LogService } from "../log/LogService";
import {
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  StreamingEvent,
  CreateSessionRequest,
  ApiResponse,
  PaginationRequest,
} from "@/types/api";
import { EventCallback, UnsubscribeFn } from "@/types/events";

/**
 * Optionen für StreamingMessage
 */
export interface StreamingOptions {
  /** Event-Handler für empfangene Chunks */
  onChunk?: (chunk: string) => void;

  /** Event-Handler für Fortschritt */
  onProgress?: (progress: number) => void;

  /** Event-Handler für Fehler */
  onError?: (error: Error) => void;

  /** Event-Handler für vollständige Antwort */
  onComplete?: (message: ChatMessage) => void;

  /** Event-Handler für Metadaten */
  onMetadata?: (metadata: any) => void;
}

/**
 * SessionService-Klasse zur Verwaltung von Chat-Sessions
 */
export class SessionService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Aktuelle Streaming-Verbindung */
  private currentStream: StreamingService | null = null;

  /** Aktuelle Session-ID */
  private currentSessionId: string | null = null;

  /** Offline-Modus aktiv */
  private offlineMode: boolean = false;

  /** Event-Handler für Session-Ereignisse */
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("SessionService");

    // Offline-Status überwachen
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnlineEvent);
      window.addEventListener("offline", this.handleOfflineEvent);
      this.offlineMode = !navigator.onLine;
    }

    // IndexedDB initialisieren
    this.initializeOfflineStorage();
  }

  /**
   * Initialisiert den Offline-Speicher
   */
  private async initializeOfflineStorage(): Promise<void> {
    try {
      await defaultIndexedDBService.init();
      this.logger.info("Offline-Speicher initialisiert");
    } catch (error) {
      this.logger.error(
        "Fehler bei der Initialisierung des Offline-Speichers",
        error,
      );
    }
  }

  /**
   * Holt alle Sessions
   */
  public async getSessions(
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<ChatSession[]>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineSessions(pagination);
      }

      // Cache-Strategie: Veraltete Daten akzeptieren, aber im Hintergrund aktualisieren
      const options = {
        cache: true,
        staleWhileRevalidate: true,
        cacheTTL: 300, // 5 Minuten
      };

      // Über den Cached-API-Service anfragen
      const response = await cachedApiService.get<ChatSession[]>(
        apiConfig.ENDPOINTS.CHAT.SESSIONS,
        pagination || { page: 1, pageSize: 20 },
        options,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher synchronisieren
        await this.syncSessionsToOfflineStorage(response.data);
      }

      return response;
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Sessions", error);

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Sessions");
        return this.getOfflineSessions(pagination);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Sessions",
        error: {
          code: "SESSIONS_FETCH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Fehler beim Abrufen der Sessions",
        },
      };
    }
  }

  /**
   * Holt Sessions aus dem Offline-Speicher
   */
  private async getOfflineSessions(
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<ChatSession[]>> {
    try {

      const pageSize = pagination?.pageSize || 20;
      const sortBy = pagination?.sortBy || "updatedAt";
      const sortDirection = pagination?.sortDirection || "desc";

      // Aus IndexedDB laden
      const sessions = await defaultIndexedDBService.getAll<ChatSession>(
        "sessions",
        {
          limit: pageSize,
          // Direction entsprechend der Sortierrichtung
          direction: sortDirection === "desc" ? "prev" : "next",
          // Index basierend auf dem Sortierfeld
          index: sortBy,
        },
      );

      return {
        success: true,
        data: sessions,
        message: "Sessions aus Offline-Speicher geladen",
      };
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der Sessions aus dem Offline-Speicher",
        error,
      );
      return {
        success: false,
        message: "Fehler beim Abrufen der Offline-Sessions",
        error: {
          code: "OFFLINE_SESSIONS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Synchronisiert Sessions in den Offline-Speicher
   */
  private async syncSessionsToOfflineStorage(
    sessions: ChatSession[],
  ): Promise<void> {
    try {
      for (const session of sessions) {
        await defaultIndexedDBService.upsert("sessions", session, session.id);
      }
      this.logger.debug(
        `${sessions.length} Sessions im Offline-Speicher synchronisiert`,
      );
    } catch (error) {
      this.logger.error("Fehler bei der Synchronisierung der Sessions", error);
    }
  }

  /**
   * Holt eine einzelne Session
   */
  public async getSession(
    sessionId: string,
  ): Promise<ApiResponse<ChatSession>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineSession(sessionId);
      }

      // Cache-Strategie: Veraltete Daten akzeptieren, aber im Hintergrund aktualisieren
      const options = {
        cache: true,
        staleWhileRevalidate: true,
        cacheTTL: 300, // 5 Minuten
      };

      // Über den Cached-API-Service anfragen
      const response = await cachedApiService.get<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId),
        undefined,
        options,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "sessions",
          response.data,
          response.data.id,
        );

        // Aktuelle Session-ID setzen
        this.currentSessionId = sessionId;
      }

      return response;
    } catch (error) {
      this.logger.error(`Fehler beim Abrufen der Session ${sessionId}`, error);

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Session");
        return this.getOfflineSession(sessionId);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Abrufen der Session ${sessionId}`,
        error: {
          code: "SESSION_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Holt eine Session aus dem Offline-Speicher
   */
  private async getOfflineSession(
    sessionId: string,
  ): Promise<ApiResponse<ChatSession>> {
    try {
      const session = await defaultIndexedDBService.get<ChatSession>(
        "sessions",
        sessionId,
      );

      if (!session) {
        return {
          success: false,
          message: `Session ${sessionId} nicht im Offline-Speicher gefunden`,
          error: {
            code: "OFFLINE_SESSION_NOT_FOUND",
            message: `Session ${sessionId} nicht im Offline-Speicher gefunden`,
          },
        };
      }

      return {
        success: true,
        data: session,
        message: "Session aus Offline-Speicher geladen",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen der Session ${sessionId} aus dem Offline-Speicher`,
        error,
      );
      return {
        success: false,
        message: "Fehler beim Abrufen der Offline-Session",
        error: {
          code: "OFFLINE_SESSION_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Erstellt eine neue Session
   */
  public async createSession(
    request: CreateSessionRequest = {},
  ): Promise<ApiResponse<ChatSession>> {
    try {
      // Im Offline-Modus keine neue Session erstellen
      if (this.offlineMode) {
        return {
          success: false,
          message:
            "Im Offline-Modus können keine neuen Sessions erstellt werden",
          error: {
            code: "OFFLINE_MODE_CREATE_ERROR",
            message:
              "Im Offline-Modus können keine neuen Sessions erstellt werden",
          },
        };
      }

      const response = await apiService.post<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSIONS,
        request,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "sessions",
          response.data,
          response.data.id,
        );

        // Aktuelle Session-ID setzen
        this.currentSessionId = response.data.id;

        // Event auslösen
        this.emitEvent("sessionCreated", response.data);
      }

      return response;
    } catch (error) {
      this.logger.error("Fehler beim Erstellen einer neuen Session", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Erstellen einer neuen Session",
        error: {
          code: "SESSION_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Löscht eine Session
   */
  public async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    try {
      // Im Offline-Modus nur lokales Löschen
      if (this.offlineMode) {
        // Aus IndexedDB löschen
        await defaultIndexedDBService.delete("sessions", sessionId);

        // Alle zugehörigen Nachrichten löschen
        const messages = await defaultIndexedDBService.query<ChatMessage>(
          "messages",
          {
            index: "sessionId",
            equalTo: sessionId,
          },
        );

        if (messages.length > 0) {
          const messageIds = messages.map((msg) => msg.id);
          await defaultIndexedDBService.deleteBulk("messages", messageIds);
        }

        // Event auslösen
        this.emitEvent("sessionDeleted", { sessionId });

        return {
          success: true,
          message: "Session lokal gelöscht (Offline-Modus)",
        };
      }

      // Über API löschen
      const response = await apiService.delete<void>(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId),
      );

      if (response.success) {
        // Aus IndexedDB löschen
        await defaultIndexedDBService.delete("sessions", sessionId);

        // Alle zugehörigen Nachrichten löschen
        const messages = await defaultIndexedDBService.query<ChatMessage>(
          "messages",
          {
            index: "sessionId",
            equalTo: sessionId,
          },
        );

        if (messages.length > 0) {
          const messageIds = messages.map((msg) => msg.id);
          await defaultIndexedDBService.deleteBulk("messages", messageIds);
        }

        // Aktuelle Session-ID zurücksetzen, wenn es die aktuelle war
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
        }

        // Event auslösen
        this.emitEvent("sessionDeleted", { sessionId });
      }

      return response;
    } catch (error) {
      this.logger.error(`Fehler beim Löschen der Session ${sessionId}`, error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen der Session ${sessionId}`,
        error: {
          code: "SESSION_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Aktualisiert eine Session (Titel, Tags, etc.)
   */
  public async updateSession(
    sessionId: string,
    updates: Partial<ChatSession>,
  ): Promise<ApiResponse<ChatSession>> {
    try {
      // Im Offline-Modus lokale Aktualisierung mit Synchronisationsqueue
      if (this.offlineMode) {
        return this.updateOfflineSession(sessionId, updates);
      }

      const response = await apiService.patch<ChatSession>(
        apiConfig.ENDPOINTS.CHAT.SESSION(sessionId),
        updates,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher aktualisieren
        await defaultIndexedDBService.upsert(
          "sessions",
          response.data,
          response.data.id,
        );

        // Event auslösen
        this.emitEvent("sessionUpdated", response.data);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren der Session ${sessionId}`,
        error,
      );

      // Fallback auf Offline-Update bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Update als Fallback");
        return this.updateOfflineSession(sessionId, updates);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren der Session ${sessionId}`,
        error: {
          code: "SESSION_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Aktualisiert eine Session im Offline-Modus
   */
  private async updateOfflineSession(
    sessionId: string,
    updates: Partial<ChatSession>,
  ): Promise<ApiResponse<ChatSession>> {
    try {
      // Aktuelle Session aus dem Speicher laden
      const session = await defaultIndexedDBService.get<ChatSession>(
        "sessions",
        sessionId,
      );

      if (!session) {
        return {
          success: false,
          message: `Session ${sessionId} nicht im Offline-Speicher gefunden`,
          error: {
            code: "OFFLINE_SESSION_NOT_FOUND",
            message: `Session ${sessionId} nicht im Offline-Speicher gefunden`,
          },
        };
      }

      // Updates anwenden
      const updatedSession = {
        ...session,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Im Offline-Speicher aktualisieren
      await defaultIndexedDBService.upsert(
        "sessions",
        updatedSession,
        updatedSession.id,
      );

      // In die Sync-Queue für spätere Synchronisierung einfügen
      await this.addToSyncQueue({
        url: apiConfig.ENDPOINTS.CHAT.SESSION(sessionId),
        method: "PATCH",
        data: updates,
        timestamp: Date.now(),
        status: "pending",
      });

      // Event auslösen
      this.emitEvent("sessionUpdated", updatedSession);

      return {
        success: true,
        data: updatedSession,
        message: "Session lokal aktualisiert (Offline-Modus)",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren der Session ${sessionId} im Offline-Modus`,
        error,
      );
      return {
        success: false,
        message: "Fehler beim Offline-Update der Session",
        error: {
          code: "OFFLINE_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Fügt eine Anfrage zur Synchronisationsqueue hinzu
   */
  private async addToSyncQueue(request: {
    url: string;
    method: string;
    data?: any;
    timestamp: number;
    status: "pending" | "processing" | "completed" | "failed";
  }): Promise<void> {
    try {
      await defaultIndexedDBService.add("offlineRequests", request);
      this.logger.debug("Anfrage zur Sync-Queue hinzugefügt", request);
    } catch (error) {
      this.logger.error("Fehler beim Hinzufügen zur Sync-Queue", error);
    }
  }

  /**
   * Holt Nachrichten für eine Session
   */
  public async getMessages(
    sessionId: string,
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<ChatMessage[]>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineMessages(sessionId, pagination);
      }

      // Cache-Strategie
      const options = {
        cache: true,
        staleWhileRevalidate: true,
        cacheTTL: 300, // 5 Minuten
      };

      // Über den Cached-API-Service anfragen
      const response = await cachedApiService.get<ChatMessage[]>(
        apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId),
        pagination || { page: 1, pageSize: 50 },
        options,
      );

      if (response.success && response.data) {
        // Nachrichten im Offline-Speicher synchronisieren
        await this.syncMessagesToOfflineStorage(sessionId, response.data);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen der Nachrichten für Session ${sessionId}`,
        error,
      );

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Nachrichten");
        return this.getOfflineMessages(sessionId, pagination);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Abrufen der Nachrichten für Session ${sessionId}`,
        error: {
          code: "MESSAGES_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Holt Nachrichten aus dem Offline-Speicher
   */
  private async getOfflineMessages(
    sessionId: string,
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<ChatMessage[]>> {
    try {

      const pageSize = pagination?.pageSize || 50;

      // Aus IndexedDB laden
      const messages = await defaultIndexedDBService.query<ChatMessage>(
        "messages",
        {
          index: "sessionAndTimestamp",
          // Nachrichten für diese Session
          startKey: [sessionId, ""],
          endKey: [sessionId, "\uffff"],
          // Sortierung nach Zeitstempel aufsteigend
          direction: "next",
          limit: pageSize,
        },
      );

      return {
        success: true,
        data: messages,
        message: "Nachrichten aus Offline-Speicher geladen",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen der Nachrichten für Session ${sessionId} aus dem Offline-Speicher`,
        error,
      );
      return {
        success: false,
        message: "Fehler beim Abrufen der Offline-Nachrichten",
        error: {
          code: "OFFLINE_MESSAGES_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Synchronisiert Nachrichten in den Offline-Speicher
   */
  private async syncMessagesToOfflineStorage(
    _sessionId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    try {
      for (const message of messages) {
        await defaultIndexedDBService.upsert("messages", message, message.id);
      }
      this.logger.debug(
        `${messages.length} Nachrichten im Offline-Speicher synchronisiert`,
      );
    } catch (error) {
      this.logger.error(
        "Fehler bei der Synchronisierung der Nachrichten",
        error,
      );
    }
  }

  /**
   * Sendet eine Nachricht an eine Session
   */
  public async sendMessage(
    sessionId: string,
    message: SendMessageRequest,
  ): Promise<ApiResponse<ChatMessage>> {
    try {
      // Im Offline-Modus keine neuen Nachrichten senden
      if (this.offlineMode) {
        return {
          success: false,
          message: "Im Offline-Modus können keine Nachrichten gesendet werden",
          error: {
            code: "OFFLINE_MODE_SEND_ERROR",
            message:
              "Im Offline-Modus können keine Nachrichten gesendet werden",
          },
        };
      }

      // Streaming-Modus
      if (message.stream) {
        return this.sendStreamingMessage(sessionId, message);
      }

      // Normale Nachricht senden
      const response = await apiService.post<ChatMessage>(
        apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId),
        message,
      );

      if (response.success && response.data) {
        // Benutzernachricht und Antwort im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "messages",
          response.data,
          response.data.id,
        );

        // Event auslösen
        this.emitEvent("messageSent", response.data);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Senden einer Nachricht an Session ${sessionId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Senden einer Nachricht an Session ${sessionId}`,
        error: {
          code: "MESSAGE_SEND_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Sendet eine Streaming-Nachricht
   */
  private async sendStreamingMessage(
    sessionId: string,
    message: SendMessageRequest,
    options: StreamingOptions = {},
  ): Promise<ApiResponse<ChatMessage>> {
    return new Promise((resolve, reject) => {
      try {
        // Aktuelle Streaming-Verbindung schließen, falls vorhanden
        if (this.currentStream) {
          this.currentStream.close();
          this.currentStream = null;
        }

        // User-Nachricht erstellen (lokale Kopie)
        const userMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          sessionId,
          role: "user",
          content: message.content,
          timestamp: new Date().toISOString(),
        };

        // Im Offline-Speicher speichern
        defaultIndexedDBService
          .upsert("messages", userMessage, userMessage.id)
          .catch((err) =>
            this.logger.error(
              "Fehler beim Speichern der Benutzernachricht",
              err,
            ),
          );

        // Event auslösen
        this.emitEvent("messageAdded", userMessage);

        // Temporäre Assistant-Nachricht
        const assistantMessage: ChatMessage = {
          id: `temp-assistant-${Date.now()}`,
          sessionId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        // Im Offline-Speicher speichern
        defaultIndexedDBService
          .upsert("messages", assistantMessage, assistantMessage.id)
          .catch((err) =>
            this.logger.error(
              "Fehler beim Speichern der temporären Assistentennachricht",
              err,
            ),
          );

        // Event auslösen
        this.emitEvent("messageAdded", assistantMessage);

        // Streaming-Verbindung erstellen
        const streamUrl = apiConfig.ENDPOINTS.CHAT.STREAM(sessionId);

        // Vollständige Antwort sammeln
        let completeResponse = "";
        let finalMessage: ChatMessage | null = null;

        this.currentStream = createStreamingConnection({
          url: streamUrl,
          params: {
            content: message.content,
            role: message.role || "user",
            ...message.context,
          },
          onMessage: (event: StreamingEvent) => {
            if (event.type === "content" && event.content) {
              completeResponse += event.content;

              // Event auslösen für Chunk
              this.emitEvent("messageChunk", {
                sessionId,
                messageId: assistantMessage.id,
                content: event.content,
              });

              // Callback für Chunk
              if (options.onChunk) {
                options.onChunk(event.content);
              }
            } else if (event.type === "metadata" && event.metadata) {
              // Event auslösen für Metadaten
              this.emitEvent("messageMetadata", {
                sessionId,
                messageId: assistantMessage.id,
                metadata: event.metadata,
              });

              // Callback für Metadaten
              if (options.onMetadata) {
                options.onMetadata(event.metadata);
              }
            } else if (
              event.type === "progress" &&
              event.progress !== undefined
            ) {
              // Event auslösen für Fortschritt
              this.emitEvent("messageProgress", {
                sessionId,
                messageId: assistantMessage.id,
                progress: event.progress,
              });

              // Callback für Fortschritt
              if (options.onProgress) {
                options.onProgress(event.progress);
              }
            } else if (event.type === "error" && event.error) {
              const error = new Error(
                event.error.message || "Streaming-Fehler",
              );

              // Event auslösen für Fehler
              this.emitEvent("messageError", {
                sessionId,
                messageId: assistantMessage.id,
                error,
              });

              // Callback für Fehler
              if (options.onError) {
                options.onError(error);
              }

              reject(error);
            } else if (event.type === "end" && event.message) {
              finalMessage = event.message;
            }
          },
          onComplete: (_response) => {
            // Stream beenden
            this.currentStream = null;

            // Nachricht mit Server-ID aktualisieren
            const receivedMessage = finalMessage || {
              ...assistantMessage,
              content: completeResponse,
            };

            // Im Offline-Speicher aktualisieren
            defaultIndexedDBService
              .upsert("messages", receivedMessage, receivedMessage.id)
              .catch((err) =>
                this.logger.error(
                  "Fehler beim Aktualisieren der Assistentennachricht",
                  err,
                ),
              );

            // Temporäre Nachricht löschen
            defaultIndexedDBService
              .delete("messages", assistantMessage.id)
              .catch((err) =>
                this.logger.error(
                  "Fehler beim Löschen der temporären Nachricht",
                  err,
                ),
              );

            // Event auslösen
            this.emitEvent("messageCompleted", receivedMessage);

            // Callback für vollständige Antwort
            if (options.onComplete) {
              options.onComplete(receivedMessage);
            }

            // Promise auflösen
            resolve({
              success: true,
              data: receivedMessage,
            });
          },
          onError: (error) => {
            // Stream beenden
            this.currentStream = null;

            // Event auslösen
            this.emitEvent("messageError", {
              sessionId,
              messageId: assistantMessage.id,
              error,
            });

            // Callback für Fehler
            if (options.onError) {
              options.onError(error);
            }

            // Promise ablehnen
            reject(error);
          },
        });

        // Aktuelle Session-ID setzen
        this.currentSessionId = sessionId;
      } catch (error) {
        this.logger.error(
          `Fehler beim Streaming einer Nachricht an Session ${sessionId}`,
          error,
        );
        reject(error);
      }
    });
  }

  /**
   * Bricht die aktuelle Streaming-Anfrage ab
   */
  public cancelStream(): void {
    if (this.currentStream) {
      this.logger.info("Streaming-Anfrage abgebrochen");
      this.currentStream.close();
      this.currentStream = null;

      // Event auslösen
      this.emitEvent("streamCancelled", {
        sessionId: this.currentSessionId,
      });
    }
  }

  /**
   * Handler für Online-Events
   */
  private handleOnlineEvent = (): void => {
    this.offlineMode = false;
    this.logger.info("Online-Modus aktiviert");

    // Event auslösen
    this.emitEvent("online");

    // Änderungen synchronisieren
    this.processSyncQueue().catch((error) => {
      this.logger.error(
        "Fehler bei der Synchronisierung nach Online-Wechsel",
        error,
      );
    });
  };

  /**
   * Handler für Offline-Events
   */
  private handleOfflineEvent = (): void => {
    this.offlineMode = true;
    this.logger.info("Offline-Modus aktiviert");

    // Event auslösen
    this.emitEvent("offline");
  };

  /**
   * Verarbeitet die Synchronisationsqueue
   */
  private async processSyncQueue(): Promise<void> {
    try {
      // Alle ausstehenden Anfragen laden
      const pendingRequests = await defaultIndexedDBService.query(
        "offlineRequests",
        {
          index: "status",
          equalTo: "pending",
        },
      );

      if (pendingRequests.length === 0) {
        this.logger.debug(
          "Keine ausstehenden Anfragen in der Synchronisationsqueue",
        );
        return;
      }

      this.logger.info(
        `${pendingRequests.length} ausstehende Anfragen in der Synchronisationsqueue gefunden`,
      );

      // Anfragen verarbeiten
      for (const request of pendingRequests) {
        try {
          // Als in Bearbeitung markieren
          await defaultIndexedDBService.put("offlineRequests", {
            ...request,
            status: "processing",
          });

          // Anfrage ausführen
          switch (request.method) {
            case "POST":
              await apiService.post(request.url, request.data);
              break;
            case "PUT":
              await apiService.put(request.url, request.data);
              break;
            case "PATCH":
              await apiService.patch(request.url, request.data);
              break;
            case "DELETE":
              await apiService.delete(request.url);
              break;
          }

          // Als abgeschlossen markieren
          await defaultIndexedDBService.put("offlineRequests", {
            ...request,
            status: "completed",
          });

          this.logger.debug(`Anfrage ${request.id} erfolgreich synchronisiert`);
        } catch (error) {
          this.logger.error(
            `Fehler bei der Synchronisierung von Anfrage ${request.id}`,
            error,
          );

          // Als fehlgeschlagen markieren
          await defaultIndexedDBService.put("offlineRequests", {
            ...request,
            status: "failed",
            error:
              error instanceof Error ? error.message : "Unbekannter Fehler",
          });
        }
      }

      // Abgeschlossene und alte Anfragen bereinigen
      const completedRequests = await defaultIndexedDBService.query(
        "offlineRequests",
        {
          index: "status",
          equalTo: "completed",
        },
      );

      if (completedRequests.length > 0) {
        const requestIds = completedRequests.map((req: any) => req.id);
        await defaultIndexedDBService.deleteBulk("offlineRequests", requestIds);
        this.logger.debug(
          `${completedRequests.length} abgeschlossene Anfragen aus der Queue entfernt`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Fehler bei der Verarbeitung der Synchronisationsqueue",
        error,
      );
      throw error;
    }
  }

  /**
   * Registriert einen Event-Handler
   */
  public on(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: string, data?: any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.forEach((handler: any) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
        }
      });
    }
  }

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
    // Aktiven Stream beenden
    if (this.currentStream) {
      this.currentStream.close();
      this.currentStream = null;
    }

    // Event-Listener entfernen
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnlineEvent);
      window.removeEventListener("offline", this.handleOfflineEvent);
    }

    // Event-Handler löschen
    this.eventHandlers.clear();
  }
}

// Singleton-Instanz erstellen
export const sessionService = new SessionService();

export default sessionService;
