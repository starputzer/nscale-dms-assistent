/**
 * TypedSessionService - Typsicherer Service für Chat-Sessions
 *
 * Diese Klasse bietet eine voll typisierte Schnittstelle für die Interaktion
 * mit Chat-Sessions und Nachrichten unter Verwendung der API-Utilities.
 */

import { BaseApiService } from "./BaseApiService";
import { apiConfig } from "./config";
import { defaultIndexedDBService } from "../storage/IndexedDBService";
import {
  createStreamingConnection,
  StreamingService,
} from "./StreamingService";
import { Result, APIError, CachePolicy } from "@/utils/apiTypes";

import type {
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  CreateSessionRequest,
  StreamingEvent,
  PaginationParams,
} from "@/types/api";

/**
 * Filterparameter für Session-Abfragen
 */
export interface SessionFilterParams extends PaginationParams {
  /** Nach Tags filtern */
  tags?: string[];

  /** Nach Kategorien filtern */
  categories?: string[];

  /** Nur archivierte Sessions einschließen */
  archived?: boolean;

  /** Nur angeheftete Sessions einschließen */
  pinned?: boolean;

  /** Sortierung nach einem Feld */
  sortBy?: "createdAt" | "updatedAt" | "title";

  /** Sortierrichtung */
  sortDirection?: "asc" | "desc";
}

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
 * Typisierte Ereignisse, die vom SessionService ausgelöst werden können
 */
export type SessionServiceEvent =
  | "sessionCreated"
  | "sessionUpdated"
  | "sessionDeleted"
  | "sessionSelected"
  | "messageAdded"
  | "messageUpdated"
  | "messageDeleted"
  | "messageChunk"
  | "messageProgress"
  | "messageMetadata"
  | "messageError"
  | "messageCompleted"
  | "streamCancelled"
  | "online"
  | "offline";

/**
 * Ereignis-Handler-Typ
 */
export type SessionEventHandler = (data: any) => void;

/**
 * Typisierter SessionService
 */
export class TypedSessionService extends BaseApiService<
  ChatSession,
  CreateSessionRequest,
  Partial<ChatSession>,
  SessionFilterParams
> {
  /** Aktuelle Streaming-Verbindung */
  private currentStream: StreamingService | null = null;

  /** Aktuelle Session-ID */
  private currentSessionId: string | null = null;

  /** Offline-Modus aktiv */
  private offlineMode: boolean = false;

  /** Event-Handler für Session-Ereignisse */
  private eventHandlers: Map<SessionServiceEvent, Set<SessionEventHandler>> =
    new Map();

  /**
   * Konstruktor
   */
  constructor() {
    super({
      resourcePath: "sessions",
      serviceName: "TypedSessionService",
      defaultCachePolicy: CachePolicy.CACHE_FIRST,
      defaultCacheTTL: 300, // 5 Minuten
      errorMessages: {
        GET_ERROR: "Fehler beim Abrufen der Session",
        LIST_ERROR: "Fehler beim Abrufen der Session-Liste",
        CREATE_ERROR: "Fehler beim Erstellen einer neuen Session",
        UPDATE_ERROR: "Fehler beim Aktualisieren der Session",
        DELETE_ERROR: "Fehler beim Löschen der Session",
      },
    });

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
   * Holt Sessions aus dem Offline-Speicher
   */
  private async getOfflineSessions(
    params?: SessionFilterParams,
  ): Promise<Result<ChatSession[], APIError>> {
    try {

      const pageSize = params? (response.data as any).pageSize || 20;
      const sortBy = params?.sortBy || "updatedAt";
      const sortDirection = params?.sortDirection || "desc";

      // Abfrageparameter erstellen
      const queryOptions: any = {
        limit: pageSize,
        direction: sortDirection === "desc" ? "prev" : "next",
        index: sortBy,
      };

      // Filter für archivierte/angeheftete Sessions
      const filterFn = (session: ChatSession): boolean => {
        // Wenn kein Filter gesetzt ist, alle einschließen
        if (params?.archived === undefined && params?.pinned === undefined) {
          return true;
        }

        // Nach archivierten filtern
        if (
          params?.archived !== undefined &&
          session.isArchived !== params.archived
        ) {
          return false;
        }

        // Nach angehefteten filtern
        if (
          params?.pinned !== undefined &&
          session.isPinned !== params.pinned
        ) {
          return false;
        }

        return true;
      };

      // Aus IndexedDB laden
      const sessions = await defaultIndexedDBService.getAll<ChatSession>(
        "sessions",
        queryOptions,
      );

      // Filter anwenden
      const filteredSessions = sessions.filter(filterFn);

      return {
        success: true,
        data: filteredSessions,
      };
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der Sessions aus dem Offline-Speicher",
        error,
      );
      return {
        success: false,
        error: {
          code: "OFFLINE_SESSIONS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
          status: 0,
        },
      };
    }
  }

  /**
   * Überschreibt die Standard-Listenmethode für Sessions
   */
  public async list(
    params?: SessionFilterParams,
  ): Promise<Result<ChatSession[], APIError>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineSessions(params);
      }

      // Online-Modus: normalen API-Aufruf verwenden
      const result = await super.list(params);

      // Bei Erfolg im Offline-Speicher synchronisieren
      if (result.success) {
        await this.syncSessionsToOfflineStorage(result.data);
      }

      return result;
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Sessions", error);

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Sessions");
        return this.getOfflineSessions(params);
      }

      return {
        success: false,
        error: {
          code: "SESSIONS_FETCH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Fehler beim Abrufen der Sessions",
          status: 0,
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
   * Holt eine Session aus dem Offline-Speicher
   */
  private async getOfflineSession(
    sessionId: string,
  ): Promise<Result<ChatSession, APIError>> {
    try {
      const session = await defaultIndexedDBService.get<ChatSession>(
        "sessions",
        sessionId,
      );

      if (!session) {
        return {
          success: false,
          error: {
            code: "OFFLINE_SESSION_NOT_FOUND",
            message: `Session ${sessionId} nicht im Offline-Speicher gefunden`,
            status: 404,
          },
        };
      }

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen der Session ${sessionId} aus dem Offline-Speicher`,
        error,
      );
      return {
        success: false,
        error: {
          code: "OFFLINE_SESSION_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
          status: 0,
        },
      };
    }
  }

  /**
   * Überschreibt die Standard-Get-Methode für Sessions
   */
  public async get(sessionId: string): Promise<Result<ChatSession, APIError>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineSession(sessionId);
      }

      // Online-Modus: normalen API-Aufruf verwenden
      const result = await super.get(sessionId);

      // Bei Erfolg im Offline-Speicher speichern
      if (result.success) {
        await defaultIndexedDBService.upsert(
          "sessions",
          result.data,
          result.data.id,
        );

        // Aktuelle Session-ID setzen
        this.currentSessionId = sessionId;
      }

      return result;
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
        error: {
          code: "SESSION_FETCH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : `Fehler beim Abrufen der Session ${sessionId}`,
          status: 0,
        },
      };
    }
  }

  /**
   * Holt Nachrichten für eine bestimmte Session
   */
  public async getMessages(
    sessionId: string,
    pagination?: PaginationParams,
  ): Promise<Result<ChatMessage[], APIError>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineMessages(sessionId, pagination);
      }

      // Cache-Strategie
      const options = {
        cache: true,
        cachePolicy: CachePolicy.STALE_WHILE_REVALIDATE,
        cacheTTL: this.defaultCacheTTL,
      };

      // Über den Cached-API-Service anfragen
      const url = apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId);
      const result = await this.safeRequest<ChatMessage[]>(
        cachedApiService.getPaginated.bind(cachedApiService),
        `Fehler beim Abrufen der Nachrichten für Session ${sessionId}`,
        url,
        pagination || { page: a1, pageSize: 50 },
        options,
      );

      // Bei Erfolg im Offline-Speicher synchronisieren
      if (result.success) {
        await this.syncMessagesToOfflineStorage(sessionId, result.data);
      }

      return result;
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
        error: {
          code: "MESSAGES_FETCH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : `Fehler beim Abrufen der Nachrichten für Session ${sessionId}`,
          status: 0,
        },
      };
    }
  }

  /**
   * Holt Nachrichten aus dem Offline-Speicher
   */
  private async getOfflineMessages(
    sessionId: string,
    pagination?: PaginationParams,
  ): Promise<Result<ChatMessage[], APIError>> {
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
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen der Nachrichten für Session ${sessionId} aus dem Offline-Speicher`,
        error,
      );
      return {
        success: false,
        error: {
          code: "OFFLINE_MESSAGES_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
          status: 0,
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
  ): Promise<Result<ChatMessage, APIError>> {
    try {
      // Im Offline-Modus keine neuen Nachrichten senden
      if (this.offlineMode) {
        return {
          success: false,
          error: {
            code: "OFFLINE_MODE_SEND_ERROR",
            message:
              "Im Offline-Modus können keine Nachrichten gesendet werden",
            status: 0,
          },
        };
      }

      // Streaming-Modus
      if (message.stream) {
        return this.sendStreamingMessage(sessionId, message);
      }

      // Normale Nachricht senden
      const url = apiConfig.ENDPOINTS.CHAT.MESSAGES(sessionId);
      const result = await this.safeRequest<ChatMessage>(
        apiService.post.bind(apiService),
        `Fehler beim Senden einer Nachricht an Session ${sessionId}`,
        url,
        message,
      );

      // Bei Erfolg im Offline-Speicher speichern
      if (result.success) {
        await defaultIndexedDBService.upsert(
          "messages",
          result.data,
          result.data.id,
        );

        // Event auslösen
        this.emitEvent("messageSent" as any, result.(data as any);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Fehler beim Senden einer Nachricht an Session ${sessionId}`,
        error,
      );
      return {
        success: false,
        error: {
          code: "MESSAGE_SEND_ERROR",
          message:
            error instanceof Error
              ? error.message
              : `Fehler beim Senden einer Nachricht an Session ${sessionId}`,
          status: 0,
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
  ): Promise<Result<ChatMessage, APIError>> {
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
            reject({
              success: false,
              error: {
                code: "STREAMING_ERROR",
                message: error.message,
                status: 0,
              },
            });
          },
        });

        // Aktuelle Session-ID setzen
        this.currentSessionId = sessionId;
      } catch (error) {
        this.logger.error(
          `Fehler beim Streaming einer Nachricht an Session ${sessionId}`,
          error,
        );
        reject({
          success: false,
          error: {
            code: "STREAMING_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown streaming error",
            status: 0,
          },
        });
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

        await defaultIndexedDBService.deleteBulk("offlineRequests", _ids);
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
   * Fügt eine Anfrage zur Synchronisationsqueue hinzu
   */
  private async _addToSyncQueue(request: {
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
   * Event-System
   */

  /**
   * Registriert einen Event-Handler
   */
  public on(
    event: SessionServiceEvent,
    handler: SessionEventHandler,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);

    // Rückgabe der Unsubscribe-Funktion
    return () => this.off(event, handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: SessionServiceEvent, handler: SessionEventHandler): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: SessionServiceEvent, data?: any): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach((handler: any) => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
          }
        });
      }
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
export const typedSessionService = new TypedSessionService();

export default typedSessionService;
