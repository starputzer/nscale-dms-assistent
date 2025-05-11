/**
 * Integrationsskript für die verbesserte Bridge und die Vanilla JS Chat-Implementierung
 *
 * Dieses Skript ermöglicht die Kommunikation zwischen der Vue 3-basierten Chat-Komponente
 * und der bestehenden Vanilla JS-Implementierung.
 */

(function () {
  "use strict";

  // Initialer Check, ob die Bridge bereits verfügbar ist
  if (!window.nScaleBridge) {
    console.warn(
      "Bridge ist nicht verfügbar. Stelle sicher, dass sie vor diesem Skript geladen wird.",
    );
    return;
  }

  // Chat-Namespace erstellen
  window.nScaleChat = window.nScaleChat || {};

  /**
   * Chat-Integration mit der Bridge
   */
  const ChatBridgeIntegration = {
    /**
     * Initialzustand
     */
    state: {
      initialized: false,
      sessions: [],
      activeSessionId: null,
      messages: [],
      isLoading: false,
      isSending: false,
      hasStreamingMessage: false,
    },

    /**
     * Bridge-Referenz
     */
    bridge: window.nScaleBridge,

    /**
     * Callbacks für Statusänderungen
     */
    callbacks: {
      onSessionChange: null,
      onMessagesChange: null,
      onStatusChange: null,
      onError: null,
    },

    /**
     * Integrationsmodul initialisieren
     */
    init: function () {
      if (this.state.initialized) {
        return;
      }

      // Ereignishandler registrieren
      this.registerEventHandlers();

      // Bereitschaftssignal senden
      this.bridge.emit("vanillaChat:ready", { status: "ready" });

      // Initialen Status von Vue abrufen
      this.requestSyncFromVue();

      this.state.initialized = true;
      console.info("Chat-Bridge-Integration initialisiert.");
    },

    /**
     * Ereignishandler registrieren
     */
    registerEventHandlers: function () {
      // Ereignisse von der Vue-Seite
      this.bridge.on(
        "vueChat:messagesUpdated",
        this.handleMessagesUpdated.bind(this),
      );
      this.bridge.on(
        "vueChat:statusUpdated",
        this.handleStatusUpdated.bind(this),
      );
      this.bridge.on(
        "vueChat:sessionsUpdated",
        this.handleSessionsUpdated.bind(this),
      );
      this.bridge.on(
        "vueChat:sessionCreated",
        this.handleSessionCreated.bind(this),
      );
      this.bridge.on(
        "vueChat:sessionDeleted",
        this.handleSessionDeleted.bind(this),
      );
      this.bridge.on("vueChat:error", this.handleError.bind(this));
      this.bridge.on("vueChat:vanillaReady", this.handleVueReady.bind(this));
      this.bridge.on("vueChat:pingVanilla", this.handlePing.bind(this));

      // Hilfs-Event für die Synchronisierung
      this.bridge.on(
        "vanillaChat:requestSync",
        this.handleSyncRequest.bind(this),
      );
    },

    /**
     * Synchronisierung von Vue anfordern
     */
    requestSyncFromVue: function () {
      this.bridge.emit("vanillaChat:requestSync", { timestamp: Date.now() });
    },

    /**
     * Verbindung testen
     */
    testConnection: function () {
      const startTime = Date.now();
      this.bridge.emit("vanillaChat:ping", { timestamp: startTime });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ connected: false, latency: -1 });
        }, 1000);

        const handlePong = (data) => {
          clearTimeout(timeout);
          this.bridge.off("vueChat:pong", handlePong);

          resolve({
            connected: true,
            latency: data.latency || Date.now() - startTime,
          });
        };

        this.bridge.on("vueChat:pong", handlePong);
      });
    },

    /**
     * Callback für Sitzungsänderung setzen
     */
    setSessionChangeCallback: function (callback) {
      if (typeof callback === "function") {
        this.callbacks.onSessionChange = callback;
      }
    },

    /**
     * Callback für Nachrichtenänderung setzen
     */
    setMessagesChangeCallback: function (callback) {
      if (typeof callback === "function") {
        this.callbacks.onMessagesChange = callback;
      }
    },

    /**
     * Callback für Statusänderung setzen
     */
    setStatusChangeCallback: function (callback) {
      if (typeof callback === "function") {
        this.callbacks.onStatusChange = callback;
      }
    },

    /**
     * Callback für Fehler setzen
     */
    setErrorCallback: function (callback) {
      if (typeof callback === "function") {
        this.callbacks.onError = callback;
      }
    },

    /**
     * Nachricht senden
     */
    sendMessage: function (content, sessionId) {
      const targetSessionId = sessionId || this.state.activeSessionId;

      if (!targetSessionId) {
        console.error("Keine aktive Sitzung zum Senden der Nachricht");
        return Promise.reject(new Error("Keine aktive Sitzung"));
      }

      if (!content || typeof content !== "string" || !content.trim()) {
        console.error("Nachrichteninhalt ist leer oder ungültig");
        return Promise.reject(new Error("Ungültiger Nachrichteninhalt"));
      }

      this.bridge.emit("vanillaChat:sendMessage", {
        content: content.trim(),
        sessionId: targetSessionId,
        timestamp: Date.now(),
      });

      return Promise.resolve();
    },

    /**
     * Nachricht bearbeiten
     */
    editMessage: function (messageId, content, sessionId) {
      const targetSessionId = sessionId || this.state.activeSessionId;

      if (!targetSessionId) {
        console.error("Keine aktive Sitzung zum Bearbeiten der Nachricht");
        return Promise.reject(new Error("Keine aktive Sitzung"));
      }

      if (!messageId) {
        console.error("Keine Nachrichten-ID zum Bearbeiten angegeben");
        return Promise.reject(new Error("Keine Nachrichten-ID"));
      }

      if (!content || typeof content !== "string" || !content.trim()) {
        console.error("Nachrichteninhalt ist leer oder ungültig");
        return Promise.reject(new Error("Ungültiger Nachrichteninhalt"));
      }

      this.bridge.emit("vanillaChat:editMessage", {
        messageId,
        content: content.trim(),
        sessionId: targetSessionId,
        timestamp: Date.now(),
      });

      return Promise.resolve();
    },

    /**
     * Nachricht erneut senden
     */
    retryMessage: function (messageId, sessionId) {
      const targetSessionId = sessionId || this.state.activeSessionId;

      if (!targetSessionId) {
        console.error("Keine aktive Sitzung zum erneuten Senden der Nachricht");
        return Promise.reject(new Error("Keine aktive Sitzung"));
      }

      if (!messageId) {
        console.error("Keine Nachrichten-ID zum erneuten Senden angegeben");
        return Promise.reject(new Error("Keine Nachrichten-ID"));
      }

      this.bridge.emit("vanillaChat:retryMessage", {
        messageId,
        sessionId: targetSessionId,
        timestamp: Date.now(),
      });

      return Promise.resolve();
    },

    /**
     * Sitzung laden
     */
    loadSession: function (sessionId) {
      if (!sessionId) {
        console.error("Keine Sitzungs-ID zum Laden angegeben");
        return Promise.reject(new Error("Keine Sitzungs-ID"));
      }

      this.bridge.emit("vanillaChat:loadSession", {
        sessionId,
        timestamp: Date.now(),
      });

      this.state.activeSessionId = sessionId;

      return Promise.resolve();
    },

    /**
     * Neue Sitzung erstellen
     */
    createSession: function () {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout beim Erstellen einer neuen Sitzung"));
        }, 5000);

        const handleSessionCreated = (data) => {
          clearTimeout(timeout);
          this.bridge.off("vueChat:sessionCreated", handleSessionCreated);

          this.state.activeSessionId = data.sessionId;
          resolve({ id: data.sessionId });
        };

        this.bridge.on("vueChat:sessionCreated", handleSessionCreated);
        this.bridge.emit("vanillaChat:createSession", {
          timestamp: Date.now(),
        });
      });
    },

    /**
     * Sitzung löschen
     */
    deleteSession: function (sessionId) {
      if (!sessionId) {
        console.error("Keine Sitzungs-ID zum Löschen angegeben");
        return Promise.reject(new Error("Keine Sitzungs-ID"));
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout beim Löschen der Sitzung"));
        }, 5000);

        const handleSessionDeleted = (data) => {
          clearTimeout(timeout);
          this.bridge.off("vueChat:sessionDeleted", handleSessionDeleted);

          if (this.state.activeSessionId === sessionId) {
            this.state.activeSessionId = null;
          }

          resolve();
        };

        this.bridge.on("vueChat:sessionDeleted", handleSessionDeleted);
        this.bridge.emit("vanillaChat:deleteSession", {
          sessionId,
          timestamp: Date.now(),
        });
      });
    },

    /**
     * Textgenerierung stoppen
     */
    stopGeneration: function () {
      this.bridge.emit("vanillaChat:stopGeneration", { timestamp: Date.now() });
      return Promise.resolve();
    },

    /**
     * Nachrichten von Vue aktualisiert
     */
    handleMessagesUpdated: function (data) {
      this.state.messages = data.messages || [];

      if (this.callbacks.onMessagesChange) {
        this.callbacks.onMessagesChange(this.state.messages);
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onMessagesUpdated === "function") {
        window.nScaleChat.onMessagesUpdated(this.state.messages);
      }
    },

    /**
     * Status von Vue aktualisiert
     */
    handleStatusUpdated: function (data) {
      this.state.isLoading = data.isLoading;
      this.state.isSending = data.isSending;
      this.state.hasStreamingMessage = data.hasStreamingMessage;

      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange({
          isLoading: this.state.isLoading,
          isSending: this.state.isSending,
          hasStreamingMessage: this.state.hasStreamingMessage,
        });
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onStatusUpdated === "function") {
        window.nScaleChat.onStatusUpdated({
          isLoading: this.state.isLoading,
          isSending: this.state.isSending,
          hasStreamingMessage: this.state.hasStreamingMessage,
        });
      }
    },

    /**
     * Sitzungen von Vue aktualisiert
     */
    handleSessionsUpdated: function (data) {
      this.state.sessions = data.sessions || [];
      this.state.activeSessionId = data.activeSessionId;

      if (this.callbacks.onSessionChange) {
        this.callbacks.onSessionChange({
          sessions: this.state.sessions,
          activeSessionId: this.state.activeSessionId,
        });
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onSessionsUpdated === "function") {
        window.nScaleChat.onSessionsUpdated({
          sessions: this.state.sessions,
          activeSessionId: this.state.activeSessionId,
        });
      }
    },

    /**
     * Sitzung von Vue erstellt
     */
    handleSessionCreated: function (data) {
      this.state.activeSessionId = data.sessionId;

      if (this.callbacks.onSessionChange) {
        this.callbacks.onSessionChange({
          activeSessionId: this.state.activeSessionId,
        });
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onSessionCreated === "function") {
        window.nScaleChat.onSessionCreated(data.sessionId);
      }
    },

    /**
     * Sitzung von Vue gelöscht
     */
    handleSessionDeleted: function (data) {
      if (this.state.activeSessionId === data.sessionId) {
        this.state.activeSessionId = null;
      }

      if (this.callbacks.onSessionChange) {
        this.callbacks.onSessionChange({
          activeSessionId: this.state.activeSessionId,
        });
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onSessionDeleted === "function") {
        window.nScaleChat.onSessionDeleted(data.sessionId);
      }
    },

    /**
     * Fehler von Vue
     */
    handleError: function (data) {
      if (this.callbacks.onError) {
        this.callbacks.onError(data);
      }

      // Anzeigen für die Vanilla-UI
      if (typeof window.nScaleChat.onError === "function") {
        window.nScaleChat.onError(data);
      }
    },

    /**
     * Vue ist bereit
     */
    handleVueReady: function (data) {
      console.log("Vue-Chat-Komponenten sind bereit:", data);

      // Initialen Status anfordern
      this.requestSyncFromVue();
    },

    /**
     * Ping von Vue
     */
    handlePing: function (data) {
      // Sofort antworten
      this.bridge.emit("vanillaChat:pong", {
        timestamp: Date.now(),
        latency: Date.now() - data.timestamp,
      });
    },

    /**
     * Synchronisierungsanforderung von der Bridge
     */
    handleSyncRequest: function () {
      // Nichts zu tun, Vue leitet die Synchronisierung ein
    },
  };

  // Öffentliche API
  window.nScaleChat = {
    // Integrationsmodul verfügbar machen
    integration: ChatBridgeIntegration,

    // Initialisierung, vom Hauptskript aufgerufen
    init: function () {
      return ChatBridgeIntegration.init();
    },

    // Ereignisbehandlung (können von der Vanilla-UI überschrieben werden)
    onMessagesUpdated: null,
    onStatusUpdated: null,
    onSessionsUpdated: null,
    onSessionCreated: null,
    onSessionDeleted: null,
    onError: null,

    // Öffentliche API
    sendMessage: function (content, sessionId) {
      return ChatBridgeIntegration.sendMessage(content, sessionId);
    },

    editMessage: function (messageId, content, sessionId) {
      return ChatBridgeIntegration.editMessage(messageId, content, sessionId);
    },

    retryMessage: function (messageId, sessionId) {
      return ChatBridgeIntegration.retryMessage(messageId, sessionId);
    },

    loadSession: function (sessionId) {
      return ChatBridgeIntegration.loadSession(sessionId);
    },

    createSession: function () {
      return ChatBridgeIntegration.createSession();
    },

    deleteSession: function (sessionId) {
      return ChatBridgeIntegration.deleteSession(sessionId);
    },

    stopGeneration: function () {
      return ChatBridgeIntegration.stopGeneration();
    },

    getState: function () {
      return { ...ChatBridgeIntegration.state };
    },

    testConnection: function () {
      return ChatBridgeIntegration.testConnection();
    },

    // Callbacks setzen
    setSessionChangeCallback: function (callback) {
      ChatBridgeIntegration.setSessionChangeCallback(callback);
    },

    setMessagesChangeCallback: function (callback) {
      ChatBridgeIntegration.setMessagesChangeCallback(callback);
    },

    setStatusChangeCallback: function (callback) {
      ChatBridgeIntegration.setStatusChangeCallback(callback);
    },

    setErrorCallback: function (callback) {
      ChatBridgeIntegration.setErrorCallback(callback);
    },
  };

  // Automatische Initialisierung, wenn das DOM geladen ist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.nScaleChat.init();
    });
  } else {
    // DOM ist bereits geladen
    window.nScaleChat.init();
  }
})();
