/**
 * Chat-spezifische Bridge-Implementierung
 *
 * Diese Datei enthält eine spezialisierte Bridge-Implementation für die
 * Kommunikation zwischen Vue 3 Chat-Komponenten und Vanilla JS Chat-Implementierung.
 */

import { BridgeAPI, LogLevel } from "./types";
import { EnhancedBridge } from "./bridgeCore";

// Chat-spezifische Typen
interface ChatMessage {
  id: string;
  content: string;
  role: string;
  timestamp: number;
  status: string;
  sessionId: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  lastActivity: number;
  messageCount: number;
  isPinned?: boolean;
}

/**
 * Chat-Bridge-Konfiguration
 */
export interface ChatBridgeConfiguration {
  autoSync: boolean;
  syncInterval: number;
  maxSyncAttempts: number;
  syncRetryDelay: number;
  messageCache: boolean;
  messageCacheSize: number;
  sessionCache: boolean;
  sessionCacheSize: number;
}

/**
 * Chat-spezifische Bridge-Erweiterung
 */
export class ChatBridge {
  private bridge: BridgeAPI;
  private config: ChatBridgeConfiguration;
  private syncTimer: number | null = null;
  private messageCache: Map<string, ChatMessage> = new Map();
  private sessionCache: Map<string, ChatSession> = new Map();
  private isInitialized = false;
  private syncAttempts = 0;
  private activeSessionId: string | null = null;

  /**
   * Chat-Bridge erstellen
   */
  constructor(
    bridge: BridgeAPI | EnhancedBridge,
    config?: Partial<ChatBridgeConfiguration>,
  ) {
    // Wenn eine EnhancedBridge-Instanz übergeben wurde, die API extrahieren
    this.bridge = (bridge as EnhancedBridge).exposeGlobalAPI
      ? (bridge as EnhancedBridge).exposeGlobalAPI()
      : (bridge as BridgeAPI);

    // Standardkonfiguration
    this.config = {
      autoSync: true,
      syncInterval: 1000,
      maxSyncAttempts: 5,
      syncRetryDelay: 500,
      messageCache: true,
      messageCacheSize: 100,
      sessionCache: true,
      sessionCacheSize: 20,
      ...config,
    };

    // Ereignis-Handler registrieren
    this.registerEventHandlers();

    // Automatische Synchronisierung starten
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Ereignis-Handler registrieren
   */
  private registerEventHandlers(): void {
    // Von Vue-Seite kommende Events
    this.bridge.on(
      "vueChat:messagesUpdated",
      this.handleVueMessagesUpdated.bind(this),
    );
    this.bridge.on(
      "vueChat:statusUpdated",
      this.handleVueStatusUpdated.bind(this),
    );
    this.bridge.on(
      "vueChat:sessionsUpdated",
      this.handleVueSessionsUpdated.bind(this),
    );
    this.bridge.on(
      "vueChat:sessionCreated",
      this.handleVueSessionCreated.bind(this),
    );
    this.bridge.on(
      "vueChat:sessionDeleted",
      this.handleVueSessionDeleted.bind(this),
    );
    this.bridge.on("vueChat:error", this.handleVueError.bind(this));
    this.bridge.on("vueChat:pingVanilla", this.handleVuePing.bind(this));

    // Vanilla-seitige Hilfsereignisse für die Fehlerbehebung
    this.bridge.on("vanillaChat:ready", this.handleVanillaReady.bind(this));
  }

  /**
   * Bridge initialisieren und Verbindung mit Vue-Komponenten herstellen
   */
  public initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isInitialized) {
        resolve(true);
        return;
      }

      // Timeout für die Initialisierung
      const timeout = setTimeout(() => {
        this.bridge.log(
          LogLevel.WARN,
          "ChatBridge: Timeout bei der Initialisierung",
        );
        resolve(false);
      }, 3000);

      // Event-Handler für die Erfolgsbestätigung
      const handleInitSuccess = () => {
        clearTimeout(timeout);
        this.bridge.off("vueChat:ready", handleInitSuccess);

        this.isInitialized = true;
        this.bridge.log(
          LogLevel.INFO,
          "ChatBridge: Erfolgreich mit Vue-Komponenten verbunden",
        );

        // Bereitschaftssignal senden
        this.bridge.emit("vanillaChat:ready", { status: "ready" });

        resolve(true);
      };

      // Auf Bereitschaftssignal von Vue warten
      this.bridge.on("vueChat:ready", handleInitSuccess);

      // Ping an Vue-Komponenten senden
      this.bridge.emit("vanillaChat:ping", { timestamp: Date.now() });

      this.bridge.log(LogLevel.INFO, "ChatBridge: Initialisierung gestartet");
    });
  }

  /**
   * Automatische Synchronisierung starten
   */
  private startAutoSync(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = window.setInterval(() => {
      this.syncState();
    }, this.config.syncInterval);

    this.bridge.log(
      LogLevel.DEBUG,
      "ChatBridge: Automatische Synchronisierung gestartet",
    );
  }

  /**
   * Automatische Synchronisierung stoppen
   */
  public stopAutoSync(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.bridge.log(
      LogLevel.DEBUG,
      "ChatBridge: Automatische Synchronisierung gestoppt",
    );
  }

  /**
   * Status synchronisieren
   */
  public syncState(): void {
    if (!this.isInitialized) {
      this.syncAttempts++;

      if (this.syncAttempts > this.config.maxSyncAttempts) {
        this.bridge.log(
          LogLevel.WARN,
          "ChatBridge: Maximale Synchronisierungsversuche erreicht",
        );
        return;
      }

      setTimeout(() => {
        this.bridge.emit("vanillaChat:requestSync", { timestamp: Date.now() });
      }, this.config.syncRetryDelay);

      return;
    }

    this.syncAttempts = 0;
    this.bridge.emit("vanillaChat:requestSync", { timestamp: Date.now() });
  }

  /**
   * Nachricht senden
   */
  public sendMessage(content: string, sessionId?: string): void {
    const targetSessionId = sessionId || this.activeSessionId;

    if (!targetSessionId) {
      this.bridge.log(
        LogLevel.ERROR,
        "ChatBridge: Keine aktive Session zum Senden der Nachricht",
      );
      return;
    }

    this.bridge.emit("vanillaChat:sendMessage", {
      content,
      sessionId: targetSessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Nachricht bearbeiten
   */
  public editMessage(
    messageId: string,
    content: string,
    sessionId?: string,
  ): void {
    const targetSessionId = sessionId || this.activeSessionId;

    if (!targetSessionId) {
      this.bridge.log(
        LogLevel.ERROR,
        "ChatBridge: Keine aktive Session zum Bearbeiten der Nachricht",
      );
      return;
    }

    this.bridge.emit("vanillaChat:editMessage", {
      messageId,
      content,
      sessionId: targetSessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Nachricht erneut senden
   */
  public retryMessage(messageId: string, sessionId?: string): void {
    const targetSessionId = sessionId || this.activeSessionId;

    if (!targetSessionId) {
      this.bridge.log(
        LogLevel.ERROR,
        "ChatBridge: Keine aktive Session zum erneuten Senden der Nachricht",
      );
      return;
    }

    this.bridge.emit("vanillaChat:retryMessage", {
      messageId,
      sessionId: targetSessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Session laden
   */
  public loadSession(sessionId: string): void {
    this.activeSessionId = sessionId;

    this.bridge.emit("vanillaChat:loadSession", {
      sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Neue Session erstellen
   */
  public createSession(): Promise<{ id: string }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout beim Erstellen einer neuen Session"));
      }, 5000);

      const handleSessionCreated = (data: { sessionId: string }) => {
        clearTimeout(timeout);
        this.bridge.off("vueChat:sessionCreated", handleSessionCreated);

        this.activeSessionId = data.sessionId;
        resolve({ id: data.sessionId });
      };

      this.bridge.on("vueChat:sessionCreated", handleSessionCreated);
      this.bridge.emit("vanillaChat:createSession", { timestamp: Date.now() });
    });
  }

  /**
   * Session löschen
   */
  public deleteSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout beim Löschen der Session"));
      }, 5000);

      const handleSessionDeleted = () => {
        clearTimeout(timeout);
        this.bridge.off("vueChat:sessionDeleted", handleSessionDeleted);

        if (this.activeSessionId === sessionId) {
          this.activeSessionId = null;
        }

        resolve();
      };

      this.bridge.on("vueChat:sessionDeleted", handleSessionDeleted);
      this.bridge.emit("vanillaChat:deleteSession", {
        sessionId,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Text-Generierung stoppen
   */
  public stopGeneration(): void {
    this.bridge.emit("vanillaChat:stopGeneration", { timestamp: Date.now() });
  }

  /**
   * Nachrichten von Vue aktualisiert
   */
  private handleVueMessagesUpdated(data: {
    messages: ChatMessage[];
    timestamp: number;
  }): void {
    if (this.config.messageCache) {
      // Cache aktualisieren
      for (const message of data.messages) {
        this.messageCache.set(message.id, message);

        // Cache-Größe kontrollieren
        if (this.messageCache.size > this.config.messageCacheSize) {
          const oldestEntry = this.messageCache.keys().next();
          if (!oldestEntry.done && oldestEntry.value) {
            this.messageCache.delete(oldestEntry.value);
          }
        }
      }
    }

    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onMessagesUpdated === "function") {
        window.nScaleChat.onMessagesUpdated(data.messages);
      }
    }
  }

  /**
   * Status von Vue aktualisiert
   */
  private handleVueStatusUpdated(data: {
    isLoading: boolean;
    isSending: boolean;
    hasStreamingMessage: boolean;
    timestamp: number;
  }): void {
    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onStatusUpdated === "function") {
        window.nScaleChat.onStatusUpdated({
          isLoading: data.isLoading,
          isSending: data.isSending,
          hasStreamingMessage: data.hasStreamingMessage,
        });
      }
    }
  }

  /**
   * Sessions von Vue aktualisiert
   */
  private handleVueSessionsUpdated(data: {
    sessions: ChatSession[];
    activeSessionId: string | null;
    timestamp: number;
  }): void {
    this.activeSessionId = data.activeSessionId;

    if (this.config.sessionCache) {
      // Cache aktualisieren
      for (const session of data.sessions) {
        this.sessionCache.set(session.id, session);

        // Cache-Größe kontrollieren
        if (this.sessionCache.size > this.config.sessionCacheSize) {
          // Nicht angepinnte Sessions zuerst entfernen
          let oldestKey = null;
          let oldestTimestamp = Infinity;

          for (const [key, cachedSession] of this.sessionCache.entries()) {
            if (
              !cachedSession.isPinned &&
              cachedSession.lastActivity < oldestTimestamp
            ) {
              oldestKey = key;
              oldestTimestamp = cachedSession.lastActivity;
            }
          }

          if (oldestKey) {
            this.sessionCache.delete(oldestKey);
          } else {
            // Wenn alle angepinnt sind, die älteste entfernen
            const oldestEntry = this.sessionCache.keys().next();
            if (!oldestEntry.done && oldestEntry.value) {
              this.sessionCache.delete(oldestEntry.value);
            }
          }
        }
      }
    }

    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onSessionsUpdated === "function") {
        window.nScaleChat.onSessionsUpdated({
          sessions: data.sessions,
          activeSessionId: data.activeSessionId,
        });
      }
    }
  }

  /**
   * Session von Vue erstellt
   */
  private handleVueSessionCreated(data: { sessionId: string }): void {
    this.activeSessionId = data.sessionId;

    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onSessionCreated === "function") {
        window.nScaleChat.onSessionCreated(data.sessionId);
      }
    }
  }

  /**
   * Session von Vue gelöscht
   */
  private handleVueSessionDeleted(data: { sessionId: string }): void {
    if (this.activeSessionId === data.sessionId) {
      this.activeSessionId = null;
    }

    // Aus Cache entfernen
    if (this.config.sessionCache) {
      this.sessionCache.delete(data.sessionId);
    }

    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onSessionDeleted === "function") {
        window.nScaleChat.onSessionDeleted(data.sessionId);
      }
    }
  }

  /**
   * Fehler von Vue
   */
  private handleVueError(data: { action: string; error: string }): void {
    this.bridge.log(
      LogLevel.ERROR,
      `ChatBridge: Fehler bei ${data.action} - ${data.error}`,
    );

    // Ereignis an die Vanilla-UI weiterleiten
    if (typeof window.nScaleChat === "object" && window.nScaleChat !== null) {
      if (typeof window.nScaleChat.onError === "function") {
        window.nScaleChat.onError(data);
      }
    }
  }

  /**
   * Ping von Vue
   */
  private handleVuePing(data: { timestamp: number }): void {
    // Sofort antworten
    this.bridge.emit("vanillaChat:pong", {
      timestamp: Date.now(),
      latency: Date.now() - data.timestamp,
    });
  }

  /**
   * Vanilla ist bereit
   */
  private handleVanillaReady(data: { status: string }): void {
    if (data.status === "ready") {
      this.bridge.emit("vueChat:vanillaReady", { status: "acknowledged" });
      this.syncState(); // Sofortige Synchronisierung
    }
  }

  /**
   * Bridge-Verfügbarkeit testen
   */
  public testConnection(): Promise<{
    connected: boolean;
    latency: number;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        resolve({ connected: false, latency: -1 });
      }, 1000);

      const handlePong = () => {
        clearTimeout(timeout);
        this.bridge.off("vanillaChat:pong", handlePong);

        const endTime = Date.now();
        const roundTripTime = endTime - startTime;

        resolve({
          connected: true,
          latency: roundTripTime,
        });
      };

      this.bridge.on("vanillaChat:pong", handlePong);
      this.bridge.emit("vueChat:pingVanilla", { timestamp: startTime });
    });
  }

  /**
   * Ressourcen freigeben
   */
  public destroy(): void {
    // Automatische Synchronisierung stoppen
    this.stopAutoSync();

    // Event-Handler entfernen
    this.bridge.off("vueChat:messagesUpdated", this.handleVueMessagesUpdated);
    this.bridge.off("vueChat:statusUpdated", this.handleVueStatusUpdated);
    this.bridge.off("vueChat:sessionsUpdated", this.handleVueSessionsUpdated);
    this.bridge.off("vueChat:sessionCreated", this.handleVueSessionCreated);
    this.bridge.off("vueChat:sessionDeleted", this.handleVueSessionDeleted);
    this.bridge.off("vueChat:error", this.handleVueError);
    this.bridge.off("vueChat:pingVanilla", this.handleVuePing);
    this.bridge.off("vanillaChat:ready", this.handleVanillaReady);

    // Caches leeren
    this.messageCache.clear();
    this.sessionCache.clear();

    this.bridge.log(LogLevel.INFO, "ChatBridge: Ressourcen freigegeben");
  }
}

/**
 * Chat-Bridge erstellen
 */
export function createChatBridge(
  bridge: BridgeAPI | EnhancedBridge,
  config?: Partial<ChatBridgeConfiguration>,
): ChatBridge {
  return new ChatBridge(bridge, config);
}

// Typ-Erweiterung für window
declare global {
  interface Window {
    nScaleChat?: {
      onMessagesUpdated?: (messages: ChatMessage[]) => void;
      onStatusUpdated?: (status: {
        isLoading: boolean;
        isSending: boolean;
        hasStreamingMessage: boolean;
      }) => void;
      onSessionsUpdated?: (data: {
        sessions: ChatSession[];
        activeSessionId: string | null;
      }) => void;
      onSessionCreated?: (sessionId: string) => void;
      onSessionDeleted?: (sessionId: string) => void;
      onError?: (data: { action: string; error: string }) => void;
    };
  }
}
