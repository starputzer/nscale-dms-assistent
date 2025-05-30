/**
 * @file Sessions Bridge Module
 * @description Provides chat sessions functionality for the bridge system,
 * synchronizing sessions and messages between modern and legacy components.
 *
 * @redundancy-analysis
 * This module consolidates session management functionality previously scattered across:
 * - bridge/sessions.ts
 * - bridge/enhanced/chatBridge.ts
 * - bridge/messageSync.ts
 */

import { ref, computed, watch } from "vue";
import { useSessionsStore } from "@/stores/sessions";
import type {
  SessionsBridgeConfig,
  BridgeError,
  BridgeResult,
  BridgeSubscription,
  TypedEventEmitter,
} from "../core/types";
import { success, failure } from "../core/results";
import { BridgeLogger } from "../core/logger";
import type {
  ChatMessage,
  ChatSession,
  SendMessageParams,
} from "@/types/session";

// Create module-specific logger
const logger = new BridgeLogger("sessions");

/**
 * Sessions bridge state interface
 */
interface SessionsBridgeState {
  /** Whether the sessions bridge is initialized */
  initialized: boolean;

  /** Whether session synchronization is active */
  syncActive: boolean;

  /** Last session synchronization timestamp */
  lastSyncTime: number;

  /** Cache of sessions that need updates */
  dirtySessionIds: Set<string>;

  /** Cache of message IDs that need updates */
  dirtyMessageIds: Map<string, Set<string>>;

  /** List of active subscriptions */
  subscriptions: BridgeSubscription[];

  /** Streaming message cache */
  streamingMessages: Map<string, ChatMessage>;
}

/**
 * Sessions bridge API interface
 */
export interface SessionsBridgeAPI {
  /** Get current session information */
  getCurrentSession(): ChatSession | null;

  /** Get list of all sessions */
  getSessions(): ChatSession[];

  /** Get a specific session by ID */
  getSession(sessionId: string): ChatSession | null;

  /** Get messages for a session */
  getMessages(sessionId: string): ChatMessage[];

  /** Create a new session */
  createSession(
    sessionData?: Partial<ChatSession>,
  ): Promise<BridgeResult<ChatSession>>;

  /** Update a session */
  updateSession(
    sessionId: string,
    sessionData: Partial<ChatSession>,
  ): Promise<BridgeResult<ChatSession>>;

  /** Delete a session */
  deleteSession(sessionId: string): Promise<BridgeResult<void>>;

  /** Select a session as the current session */
  selectSession(sessionId: string): Promise<BridgeResult<ChatSession>>;

  /** Send a message in a session */
  sendMessage(params: SendMessageParams): Promise<BridgeResult<ChatMessage>>;

  /** Delete a message */
  deleteMessage(
    sessionId: string,
    messageId: string,
  ): Promise<BridgeResult<void>>;

  /** Check if a session has streaming message */
  isSessionStreaming(sessionId: string): boolean;

  /** Get streaming status information */
  getStreamingStatus(): {
    isActive: boolean;
    progress: number;
    sessionId: string | null;
  };

  /** Cleanup resources */
  dispose(): void;
}

/**
 * Default sessions bridge configuration
 */
const DEFAULT_SESSIONS_CONFIG: Required<SessionsBridgeConfig> = {
  maxCachedSessions: 50,
  enableStreaming: true,
  enableOptimisticUpdates: true,
};

/**
 * Initialize the sessions bridge
 *
 * @param eventBus - The event bus for bridge communication
 * @param config - Sessions bridge configuration
 * @returns Sessions bridge API
 */
export function initSessionsBridge(
  eventBus: TypedEventEmitter,
  config: SessionsBridgeConfig = {},
): SessionsBridgeAPI {
  // Merge with default configuration
  const mergedConfig: Required<SessionsBridgeConfig> = {
    ...DEFAULT_SESSIONS_CONFIG,
    ...config,
  };

  logger.info("Initializing sessions bridge", mergedConfig);

  // Initialize state
  const state: SessionsBridgeState = {
    initialized: false,
    syncActive: false,
    lastSyncTime: 0,
    dirtySessionIds: new Set<string>(),
    dirtyMessageIds: new Map<string, Set<string>>(),
    subscriptions: [],
    streamingMessages: new Map<string, ChatMessage>(),
  };

  // Get the sessions store
  const sessionsStore = useSessionsStore();

  /**
   * Track dirty (changed) sessions that need synchronization
   */
  function markSessionDirty(sessionId: string) {
    state.dirtySessionIds.add(sessionId);
  }

  /**
   * Track dirty (changed) messages that need synchronization
   */
  function markMessageDirty(sessionId: string, messageId: string) {
    if (!state.dirtyMessageIds.has(sessionId)) {
      state.dirtyMessageIds.set(sessionId, new Set<string>());
    }
    state.dirtyMessageIds.get(sessionId)?.add(messageId);
  }

  /**
   * Clear dirty tracking for a session
   */
  function clearSessionDirty(sessionId: string) {
    state.dirtySessionIds.delete(sessionId);
    state.dirtyMessageIds.delete(sessionId);
  }

  /**
   * Setup legacy synchronization
   * This establishes two-way sync between modern Vue stores and legacy JS
   */
  function setupLegacySynchronization() {
    if (state.syncActive) {
      logger.warn("Sessions synchronization already active");
      return;
    }

    state.syncActive = true;

    // Subscribe to sessions store changes
    const sessionsUnwatch = sessionsStore.$subscribe((mutation, store) => {
      if (mutation.type === "direct" || mutation.type === "patch function") {
        // Sicherheitsprüfung für mutation.payload
        if (!mutation.payload) return;

        // If sessions array changes, determine which sessions changed
        if (mutation.payload && "sessions" in mutation.payload) {
          const updatedSessions = sessionsStore.sessions;
          // We would need to determine which sessions changed
          // For simplicity, we'll mark all as dirty and let the sync logic handle it
          updatedSessions.forEach((session: any) => markSessionDirty(session.id));

          // Emit sessions list updated event
          eventBus.emit("session:listUpdated", {
            sessions: updatedSessions.map((s: any) => ({
              id: s.id,
              title: s.title,
              updatedAt: s.updatedAt,
            })),
          });
        }

        // If current session ID changes
        if (mutation.payload && "currentSessionId" in mutation.payload) {
          const currentSession = sessionsStore.currentSession;
          if (currentSession) {
            eventBus.emit("session:selected", { sessionId: currentSession.id });
          }
        }

        // If messages change
        if (mutation.payload && "messages" in mutation.payload) {
          // This is more complex as we need to determine which session's messages changed
          // For simplicity, we'll compare the keys in the messages object
          Object.keys(sessionsStore.messages).forEach((sessionId: any) => {
            if (sessionsStore.messages[sessionId]?.length > 0) {
              // Mark this session's messages as dirty
              sessionsStore.messages[sessionId].forEach((message: any) => {
                markMessageDirty(sessionId, message.id);
              });

              // Emit messages updated event
              eventBus.emit("message:listUpdated", {
                sessionId,
                messages: sessionsStore.messages[sessionId],
              });
            }
          });
        }

        // If streaming status changes
        if (mutation.payload && "streaming" in mutation.payload) {
          eventBus.emit(
            "message:streamingStatusUpdated",
            sessionsStore.streaming,
          );
        }
      }
    });

    // Listen for legacy session events
    const sessionCreatedSub = eventBus.on(
      "vanillaChat:sessionCreated",
      async (payload) => {
        if (payload && payload.session) {
          logger.debug("Received legacy session created event", {
            sessionId: payload.session.id,
          });

          // Check if session already exists
          const existingSession = sessionsStore.sessions.find(
            (s) => s.id === payload.session.id,
          );
          if (!existingSession) {
            // Add session to store
            await sessionsStore.addSession(payload.session);
          }
        }
      },
    );

    const sessionUpdatedSub = eventBus.on(
      "vanillaChat:sessionUpdated",
      async (payload) => {
        if (payload && payload.session) {
          logger.debug("Received legacy session updated event", {
            sessionId: payload.session.id,
          });

          // Update session in store
          await sessionsStore.updateSession(
            payload.session.id,
            payload.session,
          );
        }
      },
    );

    const sessionDeletedSub = eventBus.on(
      "vanillaChat:sessionDeleted",
      async (payload) => {
        if (payload && payload.sessionId) {
          logger.debug("Received legacy session deleted event", {
            sessionId: payload.sessionId,
          });

          // Delete session from store
          await sessionsStore.deleteSession(payload.sessionId);
        }
      },
    );

    const sessionSelectedSub = eventBus.on(
      "vanillaChat:sessionSelected",
      async (payload) => {
        if (payload && payload.sessionId) {
          logger.debug("Received legacy session selected event", {
            sessionId: payload.sessionId,
          });

          // Select session in store
          await sessionsStore.setCurrentSession(payload.sessionId);
        }
      },
    );

    // Listen for legacy message events
    const messageReceivedSub = eventBus.on(
      "vanillaChat:messageReceived",
      async (payload) => {
        if (payload && payload.message && payload.sessionId) {
          logger.debug("Received legacy message received event", {
            sessionId: payload.sessionId,
            messageId: payload.message.id,
          });

          // Check if session exists
          const session = sessionsStore.sessions.find(
            (s) => s.id === payload.sessionId,
          );
          if (!session) {
            logger.warn("Received message for non-existent session", {
              sessionId: payload.sessionId,
            });
            return;
          }

          // Add message to store
          const sessionMessages =
            sessionsStore.messages[payload.sessionId] || [];
          const existingMessage = sessionMessages.find(
            (m) => m.id === payload.message.id,
          );

          if (!existingMessage) {
            // If streaming is enabled and the message is from the assistant, it may be streaming
            if (
              mergedConfig.enableStreaming &&
              payload.message.role === "assistant"
            ) {
              // Track this as a streaming message
              state.streamingMessages.set(payload.message.id, payload.message);

              // Update the streaming status
              sessionsStore.$patch({
                streaming: {
                  isActive: true,
                  progress: 0,
                  currentSessionId: payload.sessionId,
                },
              });
            }

            await sessionsStore.addMessage(payload.sessionId, payload.message);
          }
        }
      },
    );

    const messageUpdatedSub = eventBus.on(
      "vanillaChat:messageUpdated",
      async (payload) => {
        if (payload && payload.message && payload.sessionId) {
          logger.debug("Received legacy message updated event", {
            sessionId: payload.sessionId,
            messageId: payload.message.id,
          });

          // Update message in store
          await sessionsStore.updateMessage(
            payload.sessionId,
            payload.message.id,
            payload.message,
          );

          // If this was a streaming message and it's no longer streaming, update the status
          if (
            state.streamingMessages.has(payload.message.id) &&
            (!payload.message.isStreaming ||
              payload.message.isStreaming === false)
          ) {
            state.streamingMessages.delete(payload.message.id);

            // If no more streaming messages, reset streaming status
            if (state.streamingMessages.size === 0) {
              sessionsStore.$patch({
                streaming: {
                  isActive: false,
                  progress: 100,
                  currentSessionId: null,
                },
              });
            }
          }
        }
      },
    );

    const messageDeletedSub = eventBus.on(
      "vanillaChat:messageDeleted",
      async (payload) => {
        if (payload && payload.messageId && payload.sessionId) {
          logger.debug("Received legacy message deleted event", {
            sessionId: payload.sessionId,
            messageId: payload.messageId,
          });

          // Delete message from store
          await sessionsStore.deleteMessage(
            payload.sessionId,
            payload.messageId,
          );

          // If this was a streaming message, update streaming status
          if (state.streamingMessages.has(payload.messageId)) {
            state.streamingMessages.delete(payload.messageId);

            // If no more streaming messages, reset streaming status
            if (state.streamingMessages.size === 0) {
              sessionsStore.$patch({
                streaming: {
                  isActive: false,
                  progress: 100,
                  currentSessionId: null,
                },
              });
            }
          }
        }
      },
    );

    const streamingProgressSub = eventBus.on(
      "vanillaChat:streamingProgress",
      (payload) => {
        if (payload && typeof payload.progress === "number") {
          logger.debug("Received streaming progress event", {
            progress: payload.progress,
          });

          // Update streaming status if we're already streaming
          if (sessionsStore.streaming.isActive) {
            sessionsStore.$patch({
              streaming: {
                ...sessionsStore.streaming,
                progress: payload.progress,
              },
            });
          }
        }
      },
    );

    // Add subscriptions to state for later cleanup
    state.subscriptions.push(
      sessionCreatedSub,
      sessionUpdatedSub,
      sessionDeletedSub,
      sessionSelectedSub,
      messageReceivedSub,
      messageUpdatedSub,
      messageDeletedSub,
      streamingProgressSub,
    );

    // Add cleanup function for store unwatcher
    state.subscriptions.push({
      unsubscribe: sessionsUnwatch,
      pause: () => {},
      resume: () => {},
      id: "sessions-store-unwatcher",
    });

    // Setup regular synchronization if needed
    // This is useful for catching any missed updates
    const syncInterval = window.setInterval(() => {
      synchronizeState();
    }, 5000); // Every 5 seconds

    // Add interval cleanup to subscriptions
    state.subscriptions.push({
      unsubscribe: () => window.clearInterval(syncInterval),
      pause: () => {},
      resume: () => {},
      id: "sync-interval",
    });

    logger.info("Sessions synchronization established");
  }

  /**
   * Synchronize state between modern and legacy systems
   */
  function synchronizeState() {
    if (!state.syncActive) {
      return;
    }

    // Only synchronize if we have dirty sessions or messages
    if (state.dirtySessionIds.size === 0 && state.dirtyMessageIds.size === 0) {
      return;
    }

    logger.debug("Synchronizing state", {
      dirtySessions: state.dirtySessionIds.size,
      dirtyMessageSessions: state.dirtyMessageIds.size,
    });

    // Synchronize dirty sessions
    state.dirtySessionIds.forEach((sessionId: any) => {
      const session = sessionsStore.sessions.find((s) => s.id === sessionId);
      if (session) {
        // Emit session updated event
        eventBus.emit("session:updated", { session });
      }

      // Clear dirty flag
      state.dirtySessionIds.delete(sessionId);
    });

    // Synchronize dirty messages
    state.dirtyMessageIds.forEach((messageIds, sessionId: any) => {
      const sessionMessages = sessionsStore.messages[sessionId] || [];

      // Collect messages to synchronize
      const messagesToSync = sessionMessages.filter((m: any) =>
        messageIds.has(m.id),
      );

      if (messagesToSync.length > 0) {
        // Emit messages updated event in batches for better performance
        const batchSize = 20;
        for (let i = 0; i < messagesToSync.length; i += batchSize) {
          const batch = messagesToSync.slice(i, i + batchSize);
          eventBus.emit("message:batchUpdated", {
            sessionId,
            messages: batch,
          });
        }
      }

      // Clear dirty flags
      state.dirtyMessageIds.delete(sessionId);
    });

    // Update last sync time
    state.lastSyncTime = Date.now();
  }

  /**
   * Initialize the sessions bridge
   */
  function initialize() {
    if (state.initialized) {
      logger.warn("Sessions bridge already initialized");
      return;
    }

    // Setup synchronization between modern and legacy systems
    setupLegacySynchronization();

    // Perform initial synchronization of current state
    const initialSessions = sessionsStore.sessions;
    if (initialSessions.length > 0) {
      eventBus.emit("session:listUpdated", {
        sessions: initialSessions.map((s: any) => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt,
        })),
      });

      // If we have a current session, emit selected event
      const currentSession = sessionsStore.currentSession;
      if (currentSession) {
        eventBus.emit("session:selected", { sessionId: currentSession.id });
      }
    }

    // Emit initialized event
    eventBus.emit("sessions:initialized", {});

    state.initialized = true;
    logger.info("Sessions bridge initialized");
  }

  /**
   * Cleanup sessions bridge resources
   */
  function dispose() {
    logger.debug("Disposing sessions bridge resources");

    // Unsubscribe from all events
    state.subscriptions.forEach((subscription: any) => {
      subscription.unsubscribe();
    });

    // Clear the state
    state.subscriptions = [];
    state.syncActive = false;
    state.initialized = false;
    state.dirtySessionIds.clear();
    state.dirtyMessageIds.clear();
    state.streamingMessages.clear();

    logger.info("Sessions bridge disposed");
  }

  // Public API
  const api: SessionsBridgeAPI = {
    getCurrentSession() {
      return sessionsStore.currentSession;
    },

    getSessions() {
      return sessionsStore.sessions;
    },

    getSession(sessionId: string) {
      return sessionsStore.sessions.find((s) => s.id === sessionId) || null;
    },

    getMessages(sessionId: string) {
      return sessionsStore.messages[sessionId] || [];
    },

    async createSession(sessionData = {}) {
      try {
        logger.debug("Creating new session", sessionData);

        const newSession = await sessionsStore.createSession(sessionData);

        if (newSession) {
          logger.info("Session created successfully", {
            sessionId: newSession.id,
          });

          // Mark session as dirty for synchronization
          markSessionDirty(newSession.id);

          // Force immediate sync for this important event
          synchronizeState();

          // Emit session created event
          eventBus.emit("session:created", { session: newSession });

          return success(newSession);
        } else {
          logger.warn("Failed to create session");

          return failure("Failed to create session", "SESSIONS_CREATE_FAILED");
        }
      } catch (error) {
        logger.error("Exception during session creation", error);

        return failure(
          "Exception during session creation",
          "SESSIONS_CREATE_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async updateSession(sessionId: string, sessionData: Partial<ChatSession>) {
      try {
        logger.debug("Updating session", { sessionId, sessionData });

        const updatedSession = await sessionsStore.updateSession(
          sessionId,
          sessionData,
        );

        if (updatedSession) {
          logger.info("Session updated successfully", { sessionId });

          // Mark session as dirty for synchronization
          markSessionDirty(sessionId);

          // Force immediate sync for this important event
          synchronizeState();

          // Emit session updated event
          eventBus.emit("session:updated", { session: updatedSession });

          return success(updatedSession);
        } else {
          logger.warn("Failed to update session", { sessionId });

          return failure("Failed to update session", "SESSIONS_UPDATE_FAILED", {
            sessionId,
          });
        }
      } catch (error) {
        logger.error("Exception during session update", error);

        return failure(
          "Exception during session update",
          "SESSIONS_UPDATE_ERROR",
          {
            sessionId,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async deleteSession(sessionId: string) {
      try {
        logger.debug("Deleting session", { sessionId });

        const success = await sessionsStore.deleteSession(sessionId);

        if (success) {
          logger.info("Session deleted successfully", { sessionId });

          // Clear any dirty flags for this session
          clearSessionDirty(sessionId);

          // Emit session deleted event
          eventBus.emit("session:deleted", { sessionId });

          return success(undefined);
        } else {
          logger.warn("Failed to delete session", { sessionId });

          return failure("Failed to delete session", "SESSIONS_DELETE_FAILED", {
            sessionId,
          });
        }
      } catch (error) {
        logger.error("Exception during session deletion", error);

        return failure(
          "Exception during session deletion",
          "SESSIONS_DELETE_ERROR",
          {
            sessionId,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async selectSession(sessionId: string) {
      try {
        logger.debug("Selecting session", { sessionId });

        await sessionsStore.setCurrentSession(sessionId);

        const currentSession = sessionsStore.currentSession;

        if (currentSession && currentSession.id === sessionId) {
          logger.info("Session selected successfully", { sessionId });

          // Emit session selected event
          eventBus.emit("session:selected", { sessionId });

          return success(currentSession);
        } else {
          logger.warn("Failed to select session", { sessionId });

          return failure("Failed to select session", "SESSIONS_SELECT_FAILED", {
            sessionId,
          });
        }
      } catch (error) {
        logger.error("Exception during session selection", error);

        return failure(
          "Exception during session selection",
          "SESSIONS_SELECT_ERROR",
          {
            sessionId,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async sendMessage(params: SendMessageParams) {
      try {
        logger.debug("Sending message", {
          sessionId: params.sessionId,
          contentLength: params.content.length,
        });

        // Handle case where session doesn't exist
        const session = this.getSession(params.sessionId);
        if (!session) {
          logger.warn("Attempted to send message to non-existent session", {
            sessionId: params.sessionId,
          });

          return failure("Session not found", "SESSIONS_MESSAGE_SEND_FAILED", {
            sessionId: params.sessionId,
          });
        }

        // Send the message
        const message = await sessionsStore.sendMessage(params);

        if (message) {
          logger.info("Message sent successfully", {
            sessionId: params.sessionId,
            messageId: message.id,
          });

          // Mark the message as dirty for synchronization
          markMessageDirty(params.sessionId, message.id);

          // Force immediate sync for this important event
          synchronizeState();

          // Emit message sent event
          eventBus.emit("message:sent", {
            message,
            sessionId: params.sessionId,
          });

          return success(message);
        } else {
          logger.warn("Failed to send message", {
            sessionId: params.sessionId,
          });

          return failure(
            "Failed to send message",
            "SESSIONS_MESSAGE_SEND_FAILED",
            { sessionId: params.sessionId },
          );
        }
      } catch (error) {
        logger.error("Exception during message sending", error);

        return failure(
          "Exception during message sending",
          "SESSIONS_MESSAGE_SEND_ERROR",
          {
            sessionId: params.sessionId,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async deleteMessage(sessionId: string, messageId: string) {
      try {
        logger.debug("Deleting message", { sessionId, messageId });

        const success = await sessionsStore.deleteMessage(sessionId, messageId);

        if (success) {
          logger.info("Message deleted successfully", { sessionId, messageId });

          // Emit message deleted event
          eventBus.emit("message:deleted", { messageId, sessionId });

          return success(undefined);
        } else {
          logger.warn("Failed to delete message", { sessionId, messageId });

          return failure(
            "Failed to delete message",
            "SESSIONS_MESSAGE_DELETE_FAILED",
            { sessionId, messageId },
          );
        }
      } catch (error) {
        logger.error("Exception during message deletion", error);

        return failure(
          "Exception during message deletion",
          "SESSIONS_MESSAGE_DELETE_ERROR",
          {
            sessionId,
            messageId,
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    isSessionStreaming(sessionId: string) {
      return (
        sessionsStore.streaming.isActive &&
        sessionsStore.streaming.currentSessionId === sessionId
      );
    },

    getStreamingStatus() {
      return {
        isActive: sessionsStore.streaming.isActive,
        progress: sessionsStore.streaming.progress,
        sessionId: sessionsStore.streaming.currentSessionId,
      };
    },

    dispose,
  };

  // Initialize the sessions bridge
  initialize();

  // Return the API
  return api;
}
