/**
 * EMERGENCY CHAT DISPLAY FIXER
 *
 * This script provides emergency fallback mechanisms when Vue rendering fails to display chat messages.
 * It includes:
 * - Diagnostic functions to detect rendering failures
 * - Direct DOM manipulation for emergency message display
 * - Store extraction bypassing Vue reactivity
 * - An emergency overlay UI when all else fails
 *
 * USAGE:
 * 1. Add <script src="/js/emergency-chat.js"></script> to index.html
 * 2. The script self-initializes and monitors for problems
 * 3. Optional manual trigger: window.EmergencyChatFixer.activate()
 */

(function () {
  // Namespace for the emergency fixer
  window.EmergencyChatFixer = window.EmergencyChatFixer || {};

  // Configuration
  const CONFIG = {
    messageListSelector: ".message-list-container",
    chatViewSelector: ".chat-view",
    messageSelector: ".message-item",
    emptyStateSelector: ".empty-state",
    authorClassMapping: {
      user: "message-user",
      assistant: "message-assistant",
      system: "message-system",
    },
    checkInterval: 2000,
    maxRetries: 5,
    debugMode: true,
  };

  // Store cache to prevent repeated store lookups
  let storeCache = {
    sessionsStore: null,
    uiStore: null,
    lastMessages: [],
    activeSessionId: null,
    timestamp: 0,
  };

  /**
   * ChatDebugger - Diagnostic tool to analyze chat rendering issues
   */
  class ChatDebugger {
    constructor() {
      this.diagnostics = {
        messageCount: 0,
        renderedMessageCount: 0,
        storeAvailable: false,
        vueAvailable: false,
        piniaAvailable: false,
        sessions: [],
        activeSessionId: null,
        domStructureValid: false,
        authValid: false,
        cssIssues: [],
        requestValid: false,
        errors: [],
      };
    }

    /**
     * Run full diagnostic check on chat system
     */
    async runDiagnostics() {
      try {
        console.log("[EmergencyChatFixer] Running diagnostics...");

        // Check Vue and store availability
        this.checkFrameworkAvailability();

        // Check DOM structure
        this.checkDomStructure();

        // Check store data
        if (this.diagnostics.storeAvailable) {
          await this.checkStoreData();
        }

        // Check CSS issues
        this.checkCssIssues();

        // Check authentication
        this.checkAuthentication();

        // Check network requests (recent API calls)
        await this.checkRecentRequests();

        console.log(
          "[EmergencyChatFixer] Diagnostics complete:",
          this.diagnostics,
        );
        return this.diagnostics;
      } catch (error) {
        console.error("[EmergencyChatFixer] Diagnostics error:", error);
        this.diagnostics.errors.push(error.toString());
        return this.diagnostics;
      }
    }

    /**
     * Check if Vue, Pinia and stores are available
     */
    checkFrameworkAvailability() {
      // Check Vue
      this.diagnostics.vueAvailable = !!window.__VUE__;

      // Check Pinia
      this.diagnostics.piniaAvailable = !!(
        this.diagnostics.vueAvailable && window.__pinia
      );

      // Check if stores are available
      try {
        const stores = this.extractStores();
        this.diagnostics.storeAvailable = !!stores.sessionsStore;
      } catch (e) {
        this.diagnostics.storeAvailable = false;
        this.diagnostics.errors.push(
          "Store extraction failed: " + e.toString(),
        );
      }
    }

    /**
     * Check if DOM structure for chat is correct
     */
    checkDomStructure() {
      const messageList = document.querySelector(CONFIG.messageListSelector);
      const chatView = document.querySelector(CONFIG.chatViewSelector);

      this.diagnostics.domStructureValid = !!(messageList && chatView);

      if (this.diagnostics.domStructureValid) {
        const messages = document.querySelectorAll(CONFIG.messageSelector);
        this.diagnostics.renderedMessageCount = messages ? messages.length : 0;
      }
    }

    /**
     * Check store data for messages and sessions
     */
    async checkStoreData() {
      try {
        const stores = this.extractStores();

        if (stores.sessionsStore) {
          const sessions = stores.sessionsStore.sessions || [];
          this.diagnostics.sessions = sessions.map((s) => ({
            id: s.id,
            title: s.title,
            messageCount: (s.messages || []).length,
          }));

          this.diagnostics.activeSessionId =
            stores.sessionsStore.activeSessionId;

          // Get message count in active session
          const activeSession = sessions.find(
            (s) => s.id === this.diagnostics.activeSessionId,
          );
          this.diagnostics.messageCount = activeSession
            ? (activeSession.messages || []).length
            : 0;

          storeCache.lastMessages = activeSession
            ? activeSession.messages || []
            : [];
          storeCache.activeSessionId = this.diagnostics.activeSessionId;
        }
      } catch (e) {
        this.diagnostics.errors.push(
          "Store data check failed: " + e.toString(),
        );
      }
    }

    /**
     * Extract stores from Pinia
     */
    extractStores() {
      if (!window.__pinia) {
        return { sessionsStore: null, uiStore: null };
      }

      // Cache the stores to avoid repeated lookups
      if (
        storeCache.sessionsStore &&
        Date.now() - storeCache.timestamp < 5000
      ) {
        return {
          sessionsStore: storeCache.sessionsStore,
          uiStore: storeCache.uiStore,
        };
      }

      // Try to find the sessions store
      let sessionsStore = null;
      let uiStore = null;

      // Iterate through pinia stores to find our targets
      const stores = Object.values(window.__pinia.state.value);

      for (const store of stores) {
        // Check if this looks like the sessions store
        if (store && (store.sessions || store.activeSessionId)) {
          sessionsStore = store;
        }

        // Check if this looks like the UI store
        if (
          store &&
          (store.sidebarOpen !== undefined || store.darkMode !== undefined)
        ) {
          uiStore = store;
        }
      }

      // Update cache
      storeCache.sessionsStore = sessionsStore;
      storeCache.uiStore = uiStore;
      storeCache.timestamp = Date.now();

      return { sessionsStore, uiStore };
    }

    /**
     * Check for CSS issues that might hide messages
     */
    checkCssIssues() {
      const messageList = document.querySelector(CONFIG.messageListSelector);
      const issues = [];

      if (messageList) {
        const styles = window.getComputedStyle(messageList);

        // Check visibility
        if (styles.display === "none") {
          issues.push("message-list-display-none");
        }

        if (styles.visibility === "hidden") {
          issues.push("message-list-visibility-hidden");
        }

        // Check dimensions
        if (parseInt(styles.height) === 0 || styles.height === "0px") {
          issues.push("message-list-zero-height");
        }

        if (parseInt(styles.width) === 0 || styles.width === "0px") {
          issues.push("message-list-zero-width");
        }

        // Check if overflow might be hiding content
        if (
          styles.overflow === "hidden" &&
          messageList.scrollHeight > messageList.clientHeight
        ) {
          issues.push("message-list-overflow-hidden");
        }

        // Check Z-index
        if (parseInt(styles.zIndex) < 0) {
          issues.push("message-list-negative-z-index");
        }

        // Check opacity
        if (parseFloat(styles.opacity) === 0) {
          issues.push("message-list-zero-opacity");
        }

        // Check positioning
        if (styles.position === "absolute") {
          const rect = messageList.getBoundingClientRect();
          if (rect.top < -5000 || rect.left < -5000) {
            issues.push("message-list-positioned-offscreen");
          }
        }
      } else {
        issues.push("message-list-not-found");
      }

      this.diagnostics.cssIssues = issues;
    }

    /**
     * Check if authentication is valid
     */
    checkAuthentication() {
      // Check for authentication token in localStorage or sessionStorage
      const hasLocalToken = !!localStorage.getItem("auth_token");
      const hasSessionToken = !!sessionStorage.getItem("auth_token");

      // Check if we have a token from any source
      this.diagnostics.authValid = hasLocalToken || hasSessionToken;
    }

    /**
     * Check if recent API requests were successful
     */
    async checkRecentRequests() {
      try {
        // Make a simple request to check if API is working
        const response = await fetch("/api/status", {
          method: "GET",
          headers: {
            Authorization: this.getAuthToken(),
            "Content-Type": "application/json",
          },
        });

        this.diagnostics.requestValid = response.ok;
      } catch (e) {
        this.diagnostics.requestValid = false;
        this.diagnostics.errors.push(
          "API request check failed: " + e.toString(),
        );
      }
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        ""
      );
    }
  }

  /**
   * ChatDisplayFixer - Fixes chat display issues through DOM manipulation
   */
  class ChatDisplayFixer {
    constructor() {
      this.debugger = new ChatDebugger();
      this.fixAttempts = 0;
      this.isActive = false;
      this.emergencyContainerId = "emergency-chat-container";
      this.emergencyStyleId = "emergency-chat-styles";
    }

    /**
     * Initialize the fixer and start monitoring
     */
    initialize() {
      console.log("[EmergencyChatFixer] Initializing...");
      this.injectEmergencyStyles();
      this.startMonitoring();
    }

    /**
     * Start monitoring for chat display issues
     */
    startMonitoring() {
      // Initial check
      this.checkAndFix();

      // Periodic checks
      setInterval(() => this.checkAndFix(), CONFIG.checkInterval);
    }

    /**
     * Check for issues and fix if needed
     */
    async checkAndFix() {
      if (this.isActive) {
        this.updateEmergencyDisplay();
        return;
      }

      const diagnostics = await this.debugger.runDiagnostics();

      // Determine if we need to intervene
      const needsIntervention = this.shouldActivateEmergencyMode(diagnostics);

      if (needsIntervention) {
        this.fixAttempts++;

        // Try escalating fixes
        if (this.fixAttempts === 1) {
          this.fixCssIssues(diagnostics.cssIssues);
        } else if (this.fixAttempts === 2) {
          this.fixDomStructure();
        } else if (this.fixAttempts === 3) {
          this.forceMessageDisplay();
        } else if (this.fixAttempts >= CONFIG.maxRetries) {
          this.activateEmergencyDisplay();
        }
      } else {
        // Reset fix attempts if things look good
        this.fixAttempts = 0;
      }
    }

    /**
     * Determine if emergency mode should be activated
     */
    shouldActivateEmergencyMode(diagnostics) {
      // If we have messages in store but none rendered, that's a problem
      const messageDiscrepancy =
        diagnostics.messageCount > 0 && diagnostics.renderedMessageCount === 0;

      // If there are CSS issues affecting visibility
      const hasCriticalCssIssues = diagnostics.cssIssues.length > 0;

      // If we have DOM structure issues
      const hasDomIssues = !diagnostics.domStructureValid;

      return messageDiscrepancy || hasCriticalCssIssues || hasDomIssues;
    }

    /**
     * Fix CSS issues
     */
    fixCssIssues(issues) {
      console.log("[EmergencyChatFixer] Applying CSS fixes for:", issues);

      const messageList = document.querySelector(CONFIG.messageListSelector);
      if (!messageList) return;

      if (issues.includes("message-list-display-none")) {
        messageList.style.display = "block";
      }

      if (issues.includes("message-list-visibility-hidden")) {
        messageList.style.visibility = "visible";
      }

      if (issues.includes("message-list-zero-height")) {
        messageList.style.height = "400px";
      }

      if (issues.includes("message-list-zero-width")) {
        messageList.style.width = "100%";
      }

      if (issues.includes("message-list-overflow-hidden")) {
        messageList.style.overflow = "auto";
      }

      if (issues.includes("message-list-negative-z-index")) {
        messageList.style.zIndex = "1";
      }

      if (issues.includes("message-list-zero-opacity")) {
        messageList.style.opacity = "1";
      }

      if (issues.includes("message-list-positioned-offscreen")) {
        messageList.style.position = "relative";
        messageList.style.top = "0";
        messageList.style.left = "0";
      }
    }

    /**
     * Fix DOM structure if needed
     */
    fixDomStructure() {
      console.log("[EmergencyChatFixer] Fixing DOM structure...");

      const chatView = document.querySelector(CONFIG.chatViewSelector);
      if (!chatView) return;

      // Check if message list container exists
      let messageList = document.querySelector(CONFIG.messageListSelector);

      // Create it if it doesn't exist
      if (!messageList) {
        messageList = document.createElement("div");
        messageList.className = "message-list-container emergency-fix";
        messageList.style.height = "400px";
        messageList.style.overflow = "auto";
        chatView.appendChild(messageList);
      }

      // Remove any empty state that might be blocking messages
      const emptyState = document.querySelector(CONFIG.emptyStateSelector);
      if (emptyState) {
        emptyState.style.display = "none";
      }
    }

    /**
     * Force display of messages by rebuilding message elements
     */
    forceMessageDisplay() {
      console.log("[EmergencyChatFixer] Forcing message display...");

      const { sessionsStore } = this.debugger.extractStores();
      if (!sessionsStore) return;

      const messageList = document.querySelector(CONFIG.messageListSelector);
      if (!messageList) return;

      const activeSessionId = sessionsStore.activeSessionId;
      if (!activeSessionId) return;

      const activeSession = (sessionsStore.sessions || []).find(
        (s) => s.id === activeSessionId,
      );
      if (!activeSession) return;

      const messages = activeSession.messages || [];

      // Remove existing messages that might be corrupted
      const existingMessages = messageList.querySelectorAll(
        CONFIG.messageSelector,
      );
      existingMessages.forEach((el) => el.remove());

      // Create message elements manually
      messages.forEach((message) => {
        const messageEl = document.createElement("div");
        messageEl.className = `message-item emergency-message ${CONFIG.authorClassMapping[message.role] || ""}`;
        messageEl.dataset.messageId = message.id;

        const contentEl = document.createElement("div");
        contentEl.className = "message-content";
        contentEl.innerHTML = message.content;

        messageEl.appendChild(contentEl);
        messageList.appendChild(messageEl);
      });

      // Scroll to bottom
      messageList.scrollTop = messageList.scrollHeight;
    }

    /**
     * Create emergency overlay display for messages
     */
    activateEmergencyDisplay() {
      console.log("[EmergencyChatFixer] Activating emergency display...");
      this.isActive = true;

      // Check if we already created the emergency container
      let container = document.getElementById(this.emergencyContainerId);

      // Create container if it doesn't exist
      if (!container) {
        container = document.createElement("div");
        container.id = this.emergencyContainerId;
        container.className = "emergency-chat-overlay";

        // Add header
        const header = document.createElement("div");
        header.className = "emergency-chat-header";
        header.innerHTML =
          '<h3>Emergency Chat Display</h3><button class="emergency-close-btn">×</button>';
        container.appendChild(header);

        // Add message container
        const messageContainer = document.createElement("div");
        messageContainer.className = "emergency-messages";
        container.appendChild(messageContainer);

        // Add input area
        const inputArea = document.createElement("div");
        inputArea.className = "emergency-input-area";
        inputArea.innerHTML = `
                    <textarea class="emergency-chat-input" placeholder="Nachricht eingeben..."></textarea>
                    <button class="emergency-send-btn">Senden</button>
                `;
        container.appendChild(inputArea);

        // Add to body
        document.body.appendChild(container);

        // Set up event listeners
        const closeBtn = container.querySelector(".emergency-close-btn");
        closeBtn.addEventListener("click", () =>
          this.deactivateEmergencyDisplay(),
        );

        const sendBtn = container.querySelector(".emergency-send-btn");
        const input = container.querySelector(".emergency-chat-input");

        sendBtn.addEventListener("click", () => {
          const message = input.value.trim();
          if (message) {
            this.sendMessage(message);
            input.value = "";
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
          }
        });
      }

      this.updateEmergencyDisplay();
    }

    /**
     * Deactivate emergency display
     */
    deactivateEmergencyDisplay() {
      console.log("[EmergencyChatFixer] Deactivating emergency display...");
      this.isActive = false;
      this.fixAttempts = 0;

      const container = document.getElementById(this.emergencyContainerId);
      if (container) {
        container.style.display = "none";
      }
    }

    /**
     * Update emergency display with latest messages
     */
    updateEmergencyDisplay() {
      const container = document.getElementById(this.emergencyContainerId);
      if (!container) return;

      container.style.display = "flex";

      // Get latest messages from store
      const { sessionsStore } = this.debugger.extractStores();
      if (!sessionsStore) return;

      const activeSessionId = sessionsStore.activeSessionId;
      if (!activeSessionId) return;

      const activeSession = (sessionsStore.sessions || []).find(
        (s) => s.id === activeSessionId,
      );
      if (!activeSession) return;

      const messages = activeSession.messages || [];

      // Update message container
      const messageContainer = container.querySelector(".emergency-messages");
      if (messageContainer) {
        // Clear if messages changed
        if (
          JSON.stringify(messages) !== JSON.stringify(storeCache.lastMessages)
        ) {
          messageContainer.innerHTML = "";

          // Render messages
          messages.forEach((message) => {
            const messageEl = document.createElement("div");
            messageEl.className = `emergency-message emergency-${message.role}`;

            const contentEl = document.createElement("div");
            contentEl.className = "emergency-message-content";
            contentEl.innerHTML = message.content;

            messageEl.appendChild(contentEl);
            messageContainer.appendChild(messageEl);
          });

          // Scroll to bottom
          messageContainer.scrollTop = messageContainer.scrollHeight;

          // Update cache
          storeCache.lastMessages = [...messages];
        }
      }
    }

    /**
     * Send a message using direct store access
     */
    async sendMessage(content) {
      try {
        console.log("[EmergencyChatFixer] Sending message:", content);

        const { sessionsStore } = this.debugger.extractStores();
        if (!sessionsStore) {
          throw new Error("Sessions store not available");
        }

        const activeSessionId = sessionsStore.activeSessionId;
        if (!activeSessionId) {
          throw new Error("No active session");
        }

        // Check if the store has a sendMessage action
        if (typeof sessionsStore.sendMessage === "function") {
          await sessionsStore.sendMessage({
            sessionId: activeSessionId,
            content: content,
            role: "user",
          });
        } else {
          // Direct API call fallback
          await this.sendMessageApi(activeSessionId, content);
        }

        // Update the display
        setTimeout(() => this.updateEmergencyDisplay(), 100);
      } catch (error) {
        console.error("[EmergencyChatFixer] Send message error:", error);
        this.showSendError(error.toString());
      }
    }

    /**
     * Send message directly via API as fallback
     */
    async sendMessageApi(sessionId, content) {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token") ||
        "";

      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content,
          role: "user",
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    }

    /**
     * Show send error in emergency UI
     */
    showSendError(errorText) {
      const container = document.getElementById(this.emergencyContainerId);
      if (!container) return;

      // Create error message
      const errorEl = document.createElement("div");
      errorEl.className = "emergency-error-message";
      errorEl.textContent = `Error: ${errorText}`;

      // Add to container
      const messageContainer = container.querySelector(".emergency-messages");
      if (messageContainer) {
        messageContainer.appendChild(errorEl);
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }

      // Remove after 5 seconds
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.parentNode.removeChild(errorEl);
        }
      }, 5000);
    }

    /**
     * Inject emergency styles
     */
    injectEmergencyStyles() {
      // Check if styles already exist
      if (document.getElementById(this.emergencyStyleId)) return;

      const styleEl = document.createElement("style");
      styleEl.id = this.emergencyStyleId;
      styleEl.textContent = `
                .emergency-message {
                    margin: 8px 0;
                    padding: 8px 12px;
                    border-radius: 8px;
                    max-width: 80%;
                    word-break: break-word;
                }
                
                .emergency-user {
                    background-color: #e1f5fe;
                    margin-left: auto;
                    margin-right: 0;
                }
                
                .emergency-assistant {
                    background-color: #f5f5f5;
                    margin-left: 0;
                    margin-right: auto;
                }
                
                .emergency-system {
                    background-color: #fff3e0;
                    margin-left: 0;
                    margin-right: auto;
                }
                
                .emergency-chat-overlay {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 360px;
                    height: 500px;
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    z-index: 9999;
                    border: 1px solid #ddd;
                }
                
                .emergency-chat-header {
                    padding: 10px 16px;
                    background-color: #f5f5f5;
                    border-bottom: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 8px 8px 0 0;
                }
                
                .emergency-chat-header h3 {
                    margin: 0;
                    font-size: 16px;
                    color: #333;
                }
                
                .emergency-close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                }
                
                .emergency-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                }
                
                .emergency-input-area {
                    border-top: 1px solid #ddd;
                    padding: 10px;
                    display: flex;
                    gap: 8px;
                }
                
                .emergency-chat-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    resize: none;
                    height: 60px;
                }
                
                .emergency-send-btn {
                    background-color: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 0 16px;
                    cursor: pointer;
                }
                
                .emergency-error-message {
                    background-color: #ffebee;
                    color: #c62828;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin: 8px 0;
                    border-left: 3px solid #c62828;
                }
                
                .emergency-message-content {
                    white-space: pre-wrap;
                }
                
                /* Fix for emergency rendered messages in normal view */
                .emergency-message.message-item {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                /* Ensure message list is visible */
                .message-list-container.emergency-fix {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-height: 300px !important;
                    overflow: auto !important;
                    position: relative !important;
                    z-index: 1 !important;
                }
            `;

      document.head.appendChild(styleEl);
    }
  }

  // Initialize and expose the fixer
  const fixer = new ChatDisplayFixer();

  // Public API
  window.EmergencyChatFixer = {
    activate: () => fixer.activateEmergencyDisplay(),
    deactivate: () => fixer.deactivateEmergencyDisplay(),
    runDiagnostics: () => new ChatDebugger().runDiagnostics(),
    forceMessageDisplay: () => fixer.forceMessageDisplay(),
    fixCssIssues: (issues) => fixer.fixCssIssues(issues || []),
    debug: CONFIG.debugMode,
  };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => {
    fixer.initialize();
  });

  // If DOM already loaded, initialize immediately
  if (document.readyState !== "loading") {
    fixer.initialize();
  }
})();
