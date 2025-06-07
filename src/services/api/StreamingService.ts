/**
 * StreamingService - Verbesserte SSE-Implementierung für Chat-Streaming
 *
 * Diese Klasse bietet eine robuste Implementation von Server-Sent Events (SSE)
 * mit Fehlerbehandlung, Reconnect-Logik und strukturierten Event-Handling.
 */

import { apiConfig } from "./config";
import { StreamingEvent } from "@/types/api";
import { LogService } from "../log/LogService";
import { StorageService } from "../storage/StorageService";

/**
 * Konfiguration für den StreamingService
 */
export interface StreamingOptions {
  /** URL für den SSE-Endpunkt */
  url: string;

  /** Verbindungs-Timeout (ms) */
  connectionTimeout?: number;

  /** Automatisch wiederverbinden bei Verbindungsabbruch */
  autoReconnect?: boolean;

  /** Maximale Anzahl von Wiederverbindungsversuchen */
  maxReconnectAttempts?: number;

  /** Basisverzögerung für Wiederverbindung (ms) */
  reconnectBaseDelay?: number;

  /** Backoff-Faktor für exponentielle Wiederverbindungsverzögerung */
  reconnectBackoffFactor?: number;

  /** Maximale Verzögerung zwischen Wiederverbindungsversuchen (ms) */
  maxReconnectDelay?: number;

  /** Event-Handler für empfangene Daten */
  onMessage?: (event: StreamingEvent) => void;

  /** Event-Handler für Fehler */
  onError?: (error: Error) => void;

  /** Event-Handler für Verbindungsabbruch */
  onClose?: () => void;

  /** Event-Handler für erfolgreiche Verbindung */
  onOpen?: () => void;

  /** Event-Handler für Ende des Streams */
  onComplete?: (fullResponse?: any) => void;

  /** Event-Handler für Fortschrittsupdate */
  onProgress?: (progress: number) => void;

  /** Anfrage-Parameter */
  params?: Record<string, string>;

  /** HTTP-Header */
  headers?: Record<string, string>;

  /** WebWorker für Hintergrundverarbeitung verwenden */
  useWorker?: boolean;

  /** Maximale Laufzeit des Streams (ms) */
  maxStreamDuration?: number;
}

/**
 * Interner Zustand des StreamingService
 */
interface StreamingState {
  /** Aktive EventSource-Instanz */
  eventSource: EventSource | null;

  /** Verbindungsstatus */
  connected: boolean;

  /** Wiederverbindungsversuch-Zähler */
  reconnectAttempts: number;

  /** Timeout-ID für Verbindungsabbruch */
  connectionTimeoutId: number | null;

  /** Timeout-ID für maximale Streaming-Dauer */
  maxDurationTimeoutId: number | null;

  /** Zeitpunkt der Verbindungsherstellung */
  connectedAt: number | null;

  /** Aktuelle Verzögerung für Wiederverbindung */
  currentReconnectDelay: number;

  /** Vollständige Antwort (bei Content-Chunks) */
  fullResponse: string;

  /** Fortschritt (0-100) */
  progress: number;

  /** Fehlermeldung */
  error: Error | null;

  /** Abgeschlossen-Status */
  completed: boolean;

  /** Manuell beendet */
  manuallyClosed: boolean;
}

/**
 * Event-Typen für SSE
 */
type StreamingEventType =
  | "message"
  | "error"
  | "open"
  | "close"
  | "complete"
  | "progress";

/**
 * StreamingService - Verbesserte SSE-Implementierung
 */
export class StreamingService {
  /** Optionen für den StreamingService */
  private options: StreamingOptions;

  /** Interner Zustand */
  private state: StreamingState;

  /** Logger-Instanz */
  private logService: LogService;

  /** Storage-Service für Token */
  private storageService: StorageService;

  /** Event-Handler-Map */
  private eventHandlers: Map<
    StreamingEventType,
    Array<(...args: any[]) => void>
  > = new Map();

  /**
   * Konstruktor
   */
  constructor(options: StreamingOptions) {
    this.options = {
      // Default-Werte
      connectionTimeout: apiConfig.STREAMING.CONNECTION_TIMEOUT,
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectBaseDelay: 1000,
      reconnectBackoffFactor: 1.5,
      maxReconnectDelay: 10000,
      useWorker: false,
      maxStreamDuration: 5 * 60 * 1000, // 5 Minuten
      ...options,
    };

    this.state = {
      eventSource: null,
      connected: false,
      reconnectAttempts: 0,
      connectionTimeoutId: null,
      maxDurationTimeoutId: null,
      connectedAt: null,
      currentReconnectDelay: this.options.reconnectBaseDelay || 1000,
      fullResponse: "",
      progress: 0,
      error: null,
      completed: false,
      manuallyClosed: false,
    };

    this.logService = new LogService("StreamingService");
    this.storageService = new StorageService();

    // Handler registrieren
    if (this.options.onMessage) this.on("message", this.options.onMessage);
    if (this.options.onError) this.on("error", this.options.onError);
    if (this.options.onClose) this.on("close", this.options.onClose);
    if (this.options.onOpen) this.on("open", this.options.onOpen);
    if (this.options.onComplete) this.on("complete", this.options.onComplete);
    if (this.options.onProgress) this.on("progress", this.options.onProgress);

    // Event-Listener für Seiten-Verlassen
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
      window.addEventListener("cancel-streaming", this.close);
    }
  }

  /**
   * Fügt einen Event-Handler hinzu
   */
  public on(
    eventType: StreamingEventType,
    handler: (...args: any[]) => void,
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)?.push(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(
    eventType: StreamingEventType,
    handler: (...args: any[]) => void,
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }

    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Löst ein Event aus
   */
  private emit(eventType: StreamingEventType, ...args: any[]): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler: any) => {
        try {
          handler(...args);
        } catch (error) {
          this.logService.error(
            `Fehler in Event-Handler für ${eventType}`,
            error,
          );
        }
      });
    }
  }

  /**
   * Stellt eine Verbindung zum Server her
   */
  public connect(): void {
    // Bereits verbunden oder manuell geschlossen
    if (this.state.eventSource || this.state.manuallyClosed) {
      return;
    }

    this.state.error = null;

    // URL mit Parametern erstellen
    let url = this.options.url;
    if (this.options.params) {
      const queryParams = new URLSearchParams();

      for (const [key, value] of Object.entries(this.options.params)) {
        queryParams.append(key, value);
      }

      url += (url.includes("?") ? "&" : "?") + queryParams.toString();
    }

    try {
      // Verbindungs-Timeout starten
      if (this.options.connectionTimeout) {
        this.state.connectionTimeoutId = window.setTimeout(() => {
          this.handleConnectionTimeout();
        }, this.options.connectionTimeout);
      }

      // Max-Dauer-Timeout starten
      if (this.options.maxStreamDuration) {
        this.state.maxDurationTimeoutId = window.setTimeout(() => {
          this.handleMaxDuration();
        }, this.options.maxStreamDuration);
      }

      // EventSource-Optionen
      const eventSourceOptions: EventSourceInit = {
        withCredentials: true,
      };

      // Auth-Token in die URL einbauen
      const token = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
      );
      if (token) {
        url +=
          (url.includes("?") ? "&" : "?") +
          `token=${encodeURIComponent(token)}`;
      }

      // EventSource erstellen
      this.state.eventSource = new EventSource(url, eventSourceOptions);

      // EventSource-Handler registrieren
      this.state.eventSource.onopen = this.handleOpen;
      this.state.eventSource.onerror = this.handleError;
      this.state.eventSource.onmessage = this.handleMessage;

      // Benutzerdefinierte Event-Typen registrieren
      this.state.eventSource.addEventListener(
        "content",
        this.handleContentEvent,
      );
      this.state.eventSource.addEventListener(
        "metadata",
        this.handleMetadataEvent,
      );
      this.state.eventSource.addEventListener(
        "progress",
        this.handleProgressEvent,
      );
      this.state.eventSource.addEventListener("error", this.handleErrorEvent);
      this.state.eventSource.addEventListener("end", this.handleEndEvent);
      this.state.eventSource.addEventListener("done", this.handleEndEvent);

      this.logService.debug(`Verbindung hergestellt zu ${url}`);
    } catch (error) {
      this.handleError(error as Event);
    }
  }

  /**
   * Schließt die Verbindung
   */
  public close = (): void => {
    this.state.manuallyClosed = true;

    // Timeouts löschen
    if (this.state.connectionTimeoutId) {
      clearTimeout(this.state.connectionTimeoutId);
      this.state.connectionTimeoutId = null;
    }

    if (this.state.maxDurationTimeoutId) {
      clearTimeout(this.state.maxDurationTimeoutId);
      this.state.maxDurationTimeoutId = null;
    }

    // EventSource schließen
    if (this.state.eventSource) {
      this.state.eventSource.close();
      this.state.eventSource = null;
    }

    this.state.connected = false;

    // Event auslösen
    this.emit("close");

    this.logService.debug("Verbindung geschlossen");
  };

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
    this.close();

    // Event-Listener entfernen
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
      window.removeEventListener("cancel-streaming", this.close);
    }

    // Event-Handler löschen
    this.eventHandlers.clear();
  }

  /**
   * Handler für Verbindungstimeout
   */
  private handleConnectionTimeout(): void {
    if (!this.state.connected) {
      const error = new Error(
        "Verbindungs-Timeout: Konnte keine Verbindung zum Server herstellen",
      );
      this.logService.error("Verbindungs-Timeout", error);

      // EventSource schließen
      if (this.state.eventSource) {
        this.state.eventSource.close();
        this.state.eventSource = null;
      }

      this.state.error = error;

      // Error-Event auslösen
      this.emit("error", error);

      // Verbindung automatisch wiederherstellen?
      if (this.options.autoReconnect && !this.state.manuallyClosed) {
        this.attemptReconnect();
      } else {
        this.emit("close");
      }
    }
  }

  /**
   * Handler für maximale Streaming-Dauer
   */
  private handleMaxDuration(): void {
    this.logService.warn(
      `Maximale Streaming-Dauer von ${this.options.maxStreamDuration}ms erreicht, beende Stream`,
    );

    // Verbindung schließen, aber als normal abgeschlossen markieren
    if (this.state.eventSource) {
      this.state.eventSource.close();
      this.state.eventSource = null;
    }

    this.state.connected = false;

    // Als abgeschlossen markieren und Complete-Event auslösen
    if (!this.state.completed) {
      this.state.completed = true;
      this.emit("complete", {
        content: this.state.fullResponse,
        truncated: true,
      });
    }

    this.emit("close");
  }

  /**
   * Handler für onopen-Event
   */
<<<<<<< HEAD
  private handleOpen = (_event: Event): void => {
=======
  private handleOpen = (event: Event): void => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    // Timeout löschen
    if (this.state.connectionTimeoutId) {
      clearTimeout(this.state.connectionTimeoutId);
      this.state.connectionTimeoutId = null;
    }

    this.state.connected = true;
    this.state.connectedAt = Date.now();
    this.state.reconnectAttempts = 0;

    this.logService.info("EventSource-Verbindung geöffnet");

    // Open-Event auslösen
    this.emit("open");
  };

  /**
   * Handler für onerror-Event
   */
  private handleError = (event: Event): void => {
    const error =
      event instanceof Error
        ? event
        : new Error("Fehler in der EventSource-Verbindung");

    this.logService.error("EventSource-Fehler", error);

    this.state.error = error;
    this.state.connected = false;

    // Error-Event auslösen
    this.emit("error", error);

    // Verbindung automatisch wiederherstellen?
    if (
      this.options.autoReconnect &&
      !this.state.manuallyClosed &&
      !this.state.completed
    ) {
      this.attemptReconnect();
    } else {
      // EventSource schließen
      if (this.state.eventSource) {
        this.state.eventSource.close();
        this.state.eventSource = null;
      }

      this.emit("close");
    }
  };

  /**
   * Handler für onmessage-Event
   */
  private handleMessage = (event: MessageEvent): void => {
    try {
      // Daten parsen
      const data = JSON.parse(event.data) as StreamingEvent;

      // Message-Event auslösen
      this.emit("message", data);

      // Inhalt zur vollständigen Antwort hinzufügen, wenn es sich um einen Inhalts-Chunk handelt
      if (data.type === "content" && data.content) {
        this.state.fullResponse += data.content;
      }

      // Bei Fehler Error-Event auslösen
      if (data.type === "error" && data.error) {
        this.state.error = new Error(data.error.message);
        this.emit("error", this.state.error);
      }

      // Bei Ende Complete-Event auslösen
      if (data.type === "end" || data.type === "error") {
        this.handleEndEvent(event);
      }
    } catch (error) {
      this.logService.error("Fehler beim Parsen der SSE-Nachricht", error);
      this.emit("error", new Error("Fehler beim Parsen der SSE-Nachricht"));
    }
  };

  /**
   * Handler für content-Event
   */
  private handleContentEvent = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);

      // Inhalt zur vollständigen Antwort hinzufügen
      if (data.content) {
        this.state.fullResponse += data.content;
      }

      const streamingEvent: StreamingEvent = {
        type: "content",
        content: data.content,
        messageId: data.messageId,
        sessionId: data.sessionId,
      };

      this.emit("message", streamingEvent);
    } catch (error) {
      this.logService.error(
        "Fehler beim Verarbeiten eines Content-Events",
        error,
      );
    }
  };

  /**
   * Handler für metadata-Event
   */
  private handleMetadataEvent = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);

      const streamingEvent: StreamingEvent = {
        type: "metadata",
        metadata: data.metadata,
        messageId: data.messageId,
        sessionId: data.sessionId,
      };

      this.emit("message", streamingEvent);
    } catch (error) {
      this.logService.error(
        "Fehler beim Verarbeiten eines Metadata-Events",
        error,
      );
    }
  };

  /**
   * Handler für progress-Event
   */
  private handleProgressEvent = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);

      if (typeof data.progress === "number") {
        this.state.progress = data.progress;

        const streamingEvent: StreamingEvent = {
          type: "progress",
          progress: data.progress,
          messageId: data.messageId,
          sessionId: data.sessionId,
        };

        this.emit("message", streamingEvent);
        this.emit("progress", data.progress);
      }
    } catch (error) {
      this.logService.error(
        "Fehler beim Verarbeiten eines Progress-Events",
        error,
      );
    }
  };

  /**
   * Handler für error-Event
   */
  private handleErrorEvent = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);

      const streamingEvent: StreamingEvent = {
        type: "error",
        error: data.error,
        messageId: data.messageId,
        sessionId: data.sessionId,
      };

      this.state.error = new Error(
        data.error?.message || "Unbekannter Streaming-Fehler",
      );

      this.emit("message", streamingEvent);
      this.emit("error", this.state.error);

      // Stream als abgeschlossen markieren
      this.handleEndEvent(event);
    } catch (error) {
      this.logService.error(
        "Fehler beim Verarbeiten eines Error-Events",
        error,
      );
    }
  };

  /**
   * Handler für end-Event oder done-Event
   */
  private handleEndEvent = (event: MessageEvent): void => {
    try {
      // Daten extrahieren
      let data: StreamingEvent = { type: "end" };

      if (event.data) {
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          // Ignorieren, wenn Daten nicht geparst werden können
        }
      }

      this.logService.info("EventSource-Stream abgeschlossen");

      // Als abgeschlossen markieren
      this.state.completed = true;

      // EventSource schließen
      if (this.state.eventSource) {
        this.state.eventSource.close();
        this.state.eventSource = null;
      }

      this.state.connected = false;

      // Zeitlimit-Timeout löschen
      if (this.state.maxDurationTimeoutId) {
        clearTimeout(this.state.maxDurationTimeoutId);
        this.state.maxDurationTimeoutId = null;
      }

      // Vollständige Antwort erstellen
      const fullResponse = {
        content: this.state.fullResponse,
        message: data.message,
        metadata: data.metadata,
      };

      // Events auslösen
      if (data.type === "end") {
        this.emit("message", data);
      }

      this.emit("complete", fullResponse);
      this.emit("close");
    } catch (error) {
      this.logService.error("Fehler beim Verarbeiten eines End-Events", error);
    }
  };

  /**
   * Versucht, die Verbindung wiederherzustellen
   */
  private attemptReconnect(): void {
    // Maximale Wiederverbindungsversuche überprüfen
    if (
      this.state.reconnectAttempts >= (this.options.maxReconnectAttempts || 0)
    ) {
      this.logService.warn(
        `Maximale Anzahl von Wiederverbindungsversuchen (${this.options.maxReconnectAttempts}) erreicht`,
      );

      if (!this.state.completed) {
        // Als abgeschlossen markieren und Complete-Event auslösen
        this.state.completed = true;
        this.emit("complete", {
          content: this.state.fullResponse,
          error: this.state.error,
        });
      }

      this.emit("close");
      return;
    }

    this.state.reconnectAttempts++;

    // Exponentielle Verzögerung berechnen
    this.state.currentReconnectDelay = Math.min(
      this.state.currentReconnectDelay *
        (this.options.reconnectBackoffFactor || 1.5),
      this.options.maxReconnectDelay || 10000,
    );

    this.logService.info(
      `Wiederverbindung in ${this.state.currentReconnectDelay}ms (Versuch ${this.state.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
    );

    // Timeout für Wiederverbindung starten
    setTimeout(() => {
      if (!this.state.manuallyClosed && !this.state.completed) {
        this.connect();
      }
    }, this.state.currentReconnectDelay);
  }

  /**
   * Handler für beforeunload-Event
   */
  private handleBeforeUnload = (): void => {
    // Verbindung sauber schließen, wenn der Benutzer die Seite verlässt
    this.close();
  };

  /**
   * Gibt den aktuellen Status zurück
   */
  public getState(): Omit<StreamingState, "eventSource"> {
    const { eventSource, ...state } = this.state;
    return state;
  }
}

/**
 * Erstellt eine neue SSE-Streaming-Verbindung
 */
export function createStreamingConnection(
  options: StreamingOptions,
): StreamingService {
  const service = new StreamingService(options);
  service.connect();
  return service;
}

export default StreamingService;
