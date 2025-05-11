/**
 * OptimizedChatBridge - Enhanced chat integration with optimized streaming
 *
 * This component provides high-performance chat streaming with optimized rendering,
 * efficient state updates, and error recovery mechanisms.
 */

import { BridgeLogger, BridgeErrorState } from "../types";
import { BridgeStatusManager } from "../statusManager";
import { PerformanceMonitor } from "./performanceMonitor";
import { debounce, throttle } from "./utils";

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  status?: "pending" | "streaming" | "complete" | "error";
  metadata?: Record<string, any>;
}

/**
 * Chat session structure
 */
export interface ChatSession {
  id: string;
  title: string;
  created: number;
  lastActive: number;
  messageCount: number;
  lastMessagePreview?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for OptimizedChatBridge
 */
export interface OptimizedChatBridgeConfig {
  // Streaming performance options
  streaming: {
    // Enable token batching
    enableBatching: boolean;

    // Batch size (tokens)
    batchSize: number;

    // Batch delay (ms)
    batchDelay: number;

    // Maximum batch size for large messages
    maxBatchSize: number;

    // Target token processing rate (tokens/s)
    targetTokenRate: number;

    // Defer rendering during high frequency events
    deferRendering: boolean;

    // Minimum delay between DOM updates (ms)
    minRenderDelay: number;

    // Whether to use requestAnimationFrame for updates
    useAnimationFrame: boolean;

    // Scrolling behavior configuration
    scrolling: {
      // Whether to enable scroll position management
      manageScrollPosition: boolean;

      // Throttle scroll events
      throttleScroll: boolean;

      // Scroll throttle time (ms)
      scrollThrottleTime: number;

      // Smooth scrolling when near bottom
      smoothScrollingNearBottom: boolean;

      // Distance from bottom to trigger auto-scroll (px)
      bottomThreshold: number;
    };
  };

  // Large message list optimization
  messageLists: {
    // Enable virtualization for large message lists
    enableVirtualization: boolean;

    // Message count threshold for virtualization
    virtualizationThreshold: number;

    // Number of messages to render outside viewport
    overscan: number;

    // Use lightweight content preview for offscreen messages
    useLightweightPreviews: boolean;

    // Debounce resize handler
    debounceResize: boolean;

    // Resize debounce time (ms)
    resizeDebounceTime: number;
  };

  // Event optimization
  events: {
    // Batch chat events
    batchEvents: boolean;

    // Debounce session updates
    debounceSessionUpdates: boolean;

    // Session update debounce time (ms)
    sessionUpdateDebounceTime: number;

    // Throttle status updates
    throttleStatusUpdates: boolean;

    // Status update throttle time (ms)
    statusUpdateThrottleTime: number;
  };

  // Recovery options
  recovery: {
    // Enable automatic recovery for stream errors
    enableAutoRecovery: boolean;

    // Enable state backups for recovery
    enableStateBackups: boolean;

    // Recovery retry attempts
    maxRecoveryAttempts: number;

    // Delay between recovery attempts (ms)
    recoveryAttemptDelay: number;

    // Preserve partial message content on recovery
    preservePartialContent: boolean;
  };

  // Performance monitoring
  monitoring: {
    // Enable detailed performance monitoring
    enableDetailedMonitoring: boolean;

    // Track token processing rate
    trackTokenRate: boolean;

    // Track rendering performance
    trackRenderPerformance: boolean;

    // Track event processing time
    trackEventProcessing: boolean;

    // Maximum datapoints to retain
    maxDatapoints: number;
  };
}

/**
 * Default configuration for OptimizedChatBridge
 */
const DEFAULT_CONFIG: OptimizedChatBridgeConfig = {
  streaming: {
    enableBatching: true,
    batchSize: 8,
    batchDelay: 33, // ~30fps
    maxBatchSize: 50,
    targetTokenRate: 60, // 60 tokens/s
    deferRendering: true,
    minRenderDelay: 16, // ~60fps
    useAnimationFrame: true,

    scrolling: {
      manageScrollPosition: true,
      throttleScroll: true,
      scrollThrottleTime: 100,
      smoothScrollingNearBottom: true,
      bottomThreshold: 300,
    },
  },

  messageLists: {
    enableVirtualization: true,
    virtualizationThreshold: 30,
    overscan: 3,
    useLightweightPreviews: true,
    debounceResize: true,
    resizeDebounceTime: 150,
  },

  events: {
    batchEvents: true,
    debounceSessionUpdates: true,
    sessionUpdateDebounceTime: 300,
    throttleStatusUpdates: true,
    statusUpdateThrottleTime: 100,
  },

  recovery: {
    enableAutoRecovery: true,
    enableStateBackups: true,
    maxRecoveryAttempts: 3,
    recoveryAttemptDelay: 1000,
    preservePartialContent: true,
  },

  monitoring: {
    enableDetailedMonitoring: true,
    trackTokenRate: true,
    trackRenderPerformance: true,
    trackEventProcessing: true,
    maxDatapoints: 100,
  },
};

/**
 * Token batch for streaming
 */
interface TokenBatch {
  tokens: string[];
  timestamp: number;
}

/**
 * Message update operation
 */
interface MessageUpdateOperation {
  sessionId: string;
  messageId: string;
  content: string;
  isComplete: boolean;
  timestamp: number;
}

/**
 * Event subscription details
 */
interface EventSubscription {
  id: string;
  callback: Function;
  unsubscribe: () => void;
}

/**
 * Session update details
 */
interface SessionUpdate {
  id: string;
  update: Partial<ChatSession>;
  timestamp: number;
}

/**
 * Performance metrics for streaming
 */
interface StreamingMetrics {
  tokenCount: number;
  tokensPerSecond: number;
  batchCount: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  startTime: number | null;
  endTime: number | null;
  timepoints: {
    time: number;
    tokenCount: number;
    tokensPerSecond: number;
    processingTime: number;
  }[];
}

/**
 * Implementation of the optimized chat bridge
 */
export class OptimizedChatBridge {
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private performanceMonitor?: PerformanceMonitor;
  private config: OptimizedChatBridgeConfig;

  // Chat state
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, Map<string, ChatMessage>> = new Map();
  private activeSessionId: string | null = null;
  private streamingSessionId: string | null = null;
  private streamingMessageId: string | null = null;

  // Streaming state
  private tokenBatches: Map<string, TokenBatch[]> = new Map();
  private pendingMessageUpdates: Map<string, MessageUpdateOperation> =
    new Map();
  private streamingMetrics: Map<string, StreamingMetrics> = new Map();
  private isProcessingBatch: boolean = false;
  private nextAnimationFrameId: number | null = null;

  // Event subscribers
  private subscribers: Map<string, EventSubscription[]> = new Map();

  // Session update queue
  private pendingSessionUpdates: Map<string, SessionUpdate> = new Map();

  // Recovery state
  private recoveryAttempts: number = 0;
  private lastStreamBackup: { content: string; timestamp: number } | null =
    null;

  // DOM elements for scroll management
  private messageContainerElement: HTMLElement | null = null;
  private wasScrolledToBottom: boolean = true;

  // Throttled and debounced functions
  private debouncedProcessMessageUpdates: Function;
  private throttledScrollToBottom: Function;
  private debouncedProcessSessionUpdates: Function;
  private throttledEmitStatusUpdate: Function;

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<OptimizedChatBridgeConfig> = {},
    performanceMonitor?: PerformanceMonitor,
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.performanceMonitor = performanceMonitor;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Set up throttled and debounced functions
    this.debouncedProcessMessageUpdates = debounce(
      this.processMessageUpdates.bind(this),
      this.config.streaming.batchDelay,
    );

    this.throttledScrollToBottom = throttle(
      this.scrollToBottom.bind(this),
      this.config.streaming.scrolling.scrollThrottleTime,
    );

    this.debouncedProcessSessionUpdates = debounce(
      this.processSessionUpdates.bind(this),
      this.config.events.sessionUpdateDebounceTime,
    );

    this.throttledEmitStatusUpdate = throttle(
      this.emitStatusUpdate.bind(this),
      this.config.events.statusUpdateThrottleTime,
    );

    // Initialize scroll tracking (if DOM is available)
    this.initScrollTracking();

    this.logger.info("OptimizedChatBridge initialized");
  }

  /**
   * Sets the message container element for scroll management
   */
  setMessageContainer(element: HTMLElement | null): void {
    this.messageContainerElement = element;

    // If virtualization is enabled, apply necessary styles
    if (element && this.config.messageLists.enableVirtualization) {
      element.style.overflowY = "auto";
      element.style.position = "relative";
      element.style.height = "100%";
    }

    this.initScrollTracking();
  }

  /**
   * Initializes scroll position tracking
   */
  private initScrollTracking(): void {
    if (
      !this.messageContainerElement ||
      !this.config.streaming.scrolling.manageScrollPosition
    ) {
      return;
    }

    // Track scroll position
    const scrollHandler = this.config.streaming.scrolling.throttleScroll
      ? throttle(
          this.handleScroll.bind(this),
          this.config.streaming.scrolling.scrollThrottleTime,
        )
      : this.handleScroll.bind(this);

    this.messageContainerElement.addEventListener(
      "scroll",
      scrollHandler as EventListener,
    );

    // Track resize
    const resizeHandler = this.config.messageLists.debounceResize
      ? debounce(
          this.handleResize.bind(this),
          this.config.messageLists.resizeDebounceTime,
        )
      : this.handleResize.bind(this);

    window.addEventListener("resize", resizeHandler as EventListener);

    this.logger.debug("Scroll tracking initialized");
  }

  /**
   * Handles scroll events
   */
  private handleScroll(): void {
    if (!this.messageContainerElement) return;

    const { scrollTop, scrollHeight, clientHeight } =
      this.messageContainerElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Update scroll position state
    this.wasScrolledToBottom =
      distanceFromBottom < this.config.streaming.scrolling.bottomThreshold;
  }

  /**
   * Handles resize events
   */
  private handleResize(): void {
    // Check if we need to re-scroll
    if (this.wasScrolledToBottom) {
      this.scrollToBottom();
    }
  }

  /**
   * Scrolls to the bottom of the message container
   */
  private scrollToBottom(): void {
    if (!this.messageContainerElement) return;

    const { scrollHeight, clientHeight } = this.messageContainerElement;

    // Use smooth scrolling when close to bottom
    if (
      this.config.streaming.scrolling.smoothScrollingNearBottom &&
      this.wasScrolledToBottom
    ) {
      this.messageContainerElement.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
    } else {
      this.messageContainerElement.scrollTop = scrollHeight - clientHeight;
    }
  }

  /**
   * Loads chat sessions
   */
  async loadSessions(): Promise<ChatSession[]> {
    try {
      if (this.performanceMonitor) {
        return await this.performanceMonitor.timeAsyncFunction(
          "chat.loadSessions",
          async () => this.loadSessionsImpl(),
          "chat",
          "sessions",
        );
      } else {
        return await this.loadSessionsImpl();
      }
    } catch (error) {
      this.logger.error("Error loading sessions", error);
      throw error;
    }
  }

  /**
   * Implementation of loadSessions
   */
  private async loadSessionsImpl(): Promise<ChatSession[]> {
    // This is where you would normally fetch sessions from a store
    // For now, we'll just return the currently loaded sessions
    return Array.from(this.sessions.values());
  }

  /**
   * Loads messages for a session
   */
  async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      if (this.performanceMonitor) {
        return await this.performanceMonitor.timeAsyncFunction(
          "chat.loadMessages",
          async () => this.loadMessagesImpl(sessionId),
          "chat",
          "messages",
        );
      } else {
        return await this.loadMessagesImpl(sessionId);
      }
    } catch (error) {
      this.logger.error(
        `Error loading messages for session ${sessionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Implementation of loadMessages
   */
  private async loadMessagesImpl(sessionId: string): Promise<ChatMessage[]> {
    // Get messages for the session
    if (!this.messages.has(sessionId)) {
      this.messages.set(sessionId, new Map());
    }

    const sessionMessages = this.messages.get(sessionId)!;

    // Return messages sorted by timestamp
    return Array.from(sessionMessages.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }

  /**
   * Sets the active session
   */
  setActiveSession(sessionId: string | null): void {
    // Skip if already active
    if (this.activeSessionId === sessionId) return;

    const prevSessionId = this.activeSessionId;
    this.activeSessionId = sessionId;

    // Emit session changed event
    this.emit("sessionChanged", {
      sessionId,
      previousSessionId: prevSessionId,
    });

    this.logger.debug(`Active session changed to ${sessionId}`);
  }

  /**
   * Gets a message by ID
   */
  getMessage(sessionId: string, messageId: string): ChatMessage | undefined {
    if (!this.messages.has(sessionId)) return undefined;

    return this.messages.get(sessionId)!.get(messageId);
  }

  /**
   * Adds a message to a session
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    // Ensure session exists
    if (!this.sessions.has(sessionId)) {
      this.logger.warn(
        `Attempted to add message to non-existent session ${sessionId}`,
      );
      return;
    }

    // Ensure message map exists for session
    if (!this.messages.has(sessionId)) {
      this.messages.set(sessionId, new Map());
    }

    // Add message
    this.messages.get(sessionId)!.set(message.id, message);

    // Update session info
    const session = this.sessions.get(sessionId)!;
    this.queueSessionUpdate(sessionId, {
      messageCount: this.messages.get(sessionId)!.size,
      lastActive: message.timestamp,
      lastMessagePreview:
        message.content.substring(0, 50) +
        (message.content.length > 50 ? "..." : ""),
    });

    // Emit message added event
    this.emit("messageAdded", {
      sessionId,
      messageId: message.id,
      message,
    });

    this.logger.debug(`Message ${message.id} added to session ${sessionId}`);
  }

  /**
   * Updates a message
   */
  updateMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<ChatMessage>,
  ): void {
    // Skip if no session or message
    if (!this.messages.has(sessionId)) return;
    if (!this.messages.get(sessionId)!.has(messageId)) return;

    // Get the message
    const message = this.messages.get(sessionId)!.get(messageId)!;

    // Update the message
    const updatedMessage = {
      ...message,
      ...updates,
    };

    // Store the updated message
    this.messages.get(sessionId)!.set(messageId, updatedMessage);

    // Emit message updated event
    this.emit("messageUpdated", {
      sessionId,
      messageId,
      message: updatedMessage,
    });

    this.logger.debug(`Message ${messageId} in session ${sessionId} updated`);
  }

  /**
   * Creates a user message and initiates streaming for assistant response
   */
  async sendMessage(sessionId: string, content: string): Promise<string> {
    try {
      // Ensure session exists
      if (!this.sessions.has(sessionId)) {
        throw new Error(`Session ${sessionId} does not exist`);
      }

      // Create user message
      const userMessageId = this.generateId();
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content,
        timestamp: Date.now(),
      };

      // Add user message
      this.addMessage(sessionId, userMessage);

      // Create assistant message
      const assistantMessageId = this.generateId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "pending",
      };

      // Add initial assistant message
      this.addMessage(sessionId, assistantMessage);

      // Emit message sent event
      this.emit("messageSent", {
        sessionId,
        userMessageId,
        assistantMessageId,
        content,
      });

      // Start streaming (this would normally call the API)
      // For demonstration, we'll just simulate streaming
      this.startStreaming(sessionId, assistantMessageId);

      return assistantMessageId;
    } catch (error) {
      this.logger.error(`Error sending message to session ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Initiates streaming for an assistant message
   */
  private startStreaming(sessionId: string, messageId: string): void {
    // Skip if already streaming
    if (this.streamingSessionId !== null) {
      this.logger.warn("Already streaming, cannot start another stream");
      return;
    }

    // Set streaming state
    this.streamingSessionId = sessionId;
    this.streamingMessageId = messageId;

    // Update message status
    this.updateMessage(sessionId, messageId, {
      status: "streaming",
    });

    // Initialize streaming metrics
    this.streamingMetrics.set(messageId, {
      tokenCount: 0,
      tokensPerSecond: 0,
      batchCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      startTime: Date.now(),
      endTime: null,
      timepoints: [],
    });

    // Initialize token batch for this message
    this.tokenBatches.set(messageId, []);

    // Start sending tokens (in a real implementation, this would be the API response)
    this.simulateTokenStreaming(sessionId, messageId);

    // Update UI status
    this.throttledEmitStatusUpdate();

    this.logger.debug(
      `Started streaming for message ${messageId} in session ${sessionId}`,
    );
  }

  /**
   * Simulates token streaming from an API
   * This is just for demonstration - in a real implementation,
   * this would be replaced with actual API calls
   */
  private simulateTokenStreaming(sessionId: string, messageId: string): void {
    let tokenIndex = 0;
    // Sample response text
    const tokens = [
      "Based ",
      "on ",
      "the ",
      "code ",
      "analysis, ",
      "I'll ",
      "implement ",
      "an ",
      "optimized ",
      "bridge ",
      "system ",
      "for ",
      "communication ",
      "between ",
      "Vue ",
      "and ",
      "legacy ",
      "JavaScript ",
      "components. ",
      "This ",
      "optimized ",
      "bridge ",
      "will ",
      "include:\n\n",
      "1. ",
      "Selective ",
      "state ",
      "synchronization\n",
      "2. ",
      "Event ",
      "batching ",
      "for ",
      "high-",
      "frequency ",
      "events\n",
      "3. ",
      "Efficient ",
      "serialization ",
      "for ",
      "complex ",
      "objects\n",
      "4. ",
      "Memory ",
      "leak ",
      "prevention\n",
      "5. ",
      "Enhanced ",
      "self-",
      "healing ",
      "mechanisms\n",
      "6. ",
      "Comprehensive ",
      "performance ",
      "monitoring\n",
      "7. ",
      "Optimized ",
      "chat ",
      "integration\n\n",
      "Let's ",
      "start ",
      "by ",
      "implementing ",
      "the ",
      "core ",
      "components ",
      "one ",
      "by ",
      "one.",
    ];

    const interval = setInterval(() => {
      // Stop if streaming is cancelled
      if (
        this.streamingSessionId !== sessionId ||
        this.streamingMessageId !== messageId
      ) {
        clearInterval(interval);
        return;
      }

      // Get the next token
      const token = tokens[tokenIndex++];

      // Add token to batch
      this.addTokenToBatch(sessionId, messageId, token);

      // Stop when all tokens are sent
      if (tokenIndex >= tokens.length) {
        clearInterval(interval);
        this.completeStreaming(sessionId, messageId);
      }
    }, 50); // Send a token every 50ms (20 tokens per second)
  }

  /**
   * Adds a token to the streaming batch
   */
  private addTokenToBatch(
    sessionId: string,
    messageId: string,
    token: string,
  ): void {
    // Skip if not streaming this message
    if (
      this.streamingSessionId !== sessionId ||
      this.streamingMessageId !== messageId
    ) {
      return;
    }

    // Get the token batch
    if (!this.tokenBatches.has(messageId)) {
      this.tokenBatches.set(messageId, []);
    }

    const batches = this.tokenBatches.get(messageId)!;

    // Create a new batch if needed
    if (
      batches.length === 0 ||
      batches[batches.length - 1].tokens.length >=
        this.config.streaming.batchSize
    ) {
      batches.push({
        tokens: [],
        timestamp: Date.now(),
      });
    }

    // Add token to the latest batch
    const currentBatch = batches[batches.length - 1];
    currentBatch.tokens.push(token);

    // Update streaming metrics
    const metrics = this.streamingMetrics.get(messageId);
    if (metrics) {
      metrics.tokenCount++;

      // Calculate tokens per second
      if (metrics.startTime) {
        const elapsedSeconds = (Date.now() - metrics.startTime) / 1000;
        if (elapsedSeconds > 0) {
          metrics.tokensPerSecond = metrics.tokenCount / elapsedSeconds;
        }
      }

      // Add timepoint every 10 tokens
      if (metrics.tokenCount % 10 === 0) {
        metrics.timepoints.push({
          time: Date.now(),
          tokenCount: metrics.tokenCount,
          tokensPerSecond: metrics.tokensPerSecond,
          processingTime:
            metrics.totalProcessingTime / Math.max(1, metrics.batchCount),
        });

        // Limit timepoints
        if (metrics.timepoints.length > this.config.monitoring.maxDatapoints) {
          metrics.timepoints.shift();
        }
      }

      // Record metrics if performance monitoring is enabled
      if (this.performanceMonitor && this.config.monitoring.trackTokenRate) {
        this.performanceMonitor.recordMetric(
          "chat.tokenRate",
          metrics.tokensPerSecond,
          "tokens/s",
          "chat",
          "streaming",
        );
      }
    }

    // Process batch if it's full or contains newlines
    const shouldProcessImmediately =
      currentBatch.tokens.length >= this.config.streaming.batchSize ||
      currentBatch.tokens.some((t) => t.includes("\n"));

    if (shouldProcessImmediately) {
      this.processBatches(sessionId, messageId);
    } else {
      // Schedule processing
      this.debouncedProcessMessageUpdates();
    }
  }

  /**
   * Processes all pending token batches
   */
  private processBatches(sessionId: string, messageId: string): void {
    // Skip if not streaming this message
    if (
      this.streamingSessionId !== sessionId ||
      this.streamingMessageId !== messageId
    ) {
      return;
    }

    // Skip if no batches
    if (
      !this.tokenBatches.has(messageId) ||
      this.tokenBatches.get(messageId)!.length === 0
    ) {
      return;
    }

    const startTime = performance.now();

    // Get all batches
    const batches = this.tokenBatches.get(messageId)!;

    // Merge all tokens from all batches
    const tokens = batches.reduce(
      (allTokens, batch) => [...allTokens, ...batch.tokens],
      [] as string[],
    );

    // Clear batches
    this.tokenBatches.set(messageId, []);

    // Get the current message
    const message = this.getMessage(sessionId, messageId);
    if (!message) return;

    // Create the message update
    const updatedContent = message.content + tokens.join("");

    // Queue the update
    this.queueMessageUpdate(sessionId, messageId, updatedContent, false);

    // Update streaming metrics
    const metrics = this.streamingMetrics.get(messageId);
    if (metrics) {
      const processingTime = performance.now() - startTime;
      metrics.batchCount++;
      metrics.totalProcessingTime += processingTime;
      metrics.averageProcessingTime =
        metrics.totalProcessingTime / metrics.batchCount;
    }

    // If backup is enabled, periodically save the content
    if (
      this.config.recovery.enableStateBackups &&
      (!this.lastStreamBackup ||
        Date.now() - this.lastStreamBackup.timestamp > 5000)
    ) {
      this.lastStreamBackup = {
        content: updatedContent,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Queues a message update for processing
   */
  private queueMessageUpdate(
    sessionId: string,
    messageId: string,
    content: string,
    isComplete: boolean,
  ): void {
    // Create update operation
    const updateOp: MessageUpdateOperation = {
      sessionId,
      messageId,
      content,
      isComplete,
      timestamp: Date.now(),
    };

    // Add to pending updates
    const updateKey = `${sessionId}:${messageId}`;
    this.pendingMessageUpdates.set(updateKey, updateOp);

    // Process updates
    if (this.config.streaming.deferRendering) {
      if (this.config.streaming.useAnimationFrame) {
        // Use requestAnimationFrame for rendering
        if (this.nextAnimationFrameId === null) {
          this.nextAnimationFrameId = requestAnimationFrame(() => {
            this.nextAnimationFrameId = null;
            this.processMessageUpdates();
          });
        }
      } else {
        // Use debounced processing
        this.debouncedProcessMessageUpdates();
      }
    } else {
      // Immediate processing
      this.processMessageUpdates();
    }
  }

  /**
   * Processes all pending message updates
   */
  private processMessageUpdates(): void {
    if (this.isProcessingBatch) return;

    try {
      this.isProcessingBatch = true;

      // Measure render performance
      const startTime = performance.now();

      // Process each pending update
      for (const [key, update] of this.pendingMessageUpdates.entries()) {
        // Update the message
        this.updateMessage(update.sessionId, update.messageId, {
          content: update.content,
          status: update.isComplete ? "complete" : "streaming",
        });

        // Remove from pending updates
        this.pendingMessageUpdates.delete(key);
      }

      // Scroll to bottom if needed
      if (this.wasScrolledToBottom) {
        this.throttledScrollToBottom();
      }

      // Measure render performance
      if (
        this.performanceMonitor &&
        this.config.monitoring.trackRenderPerformance
      ) {
        const renderTime = performance.now() - startTime;
        this.performanceMonitor.recordMetric(
          "chat.renderTime",
          renderTime,
          "ms",
          "chat",
          "rendering",
        );
      }
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Completes the streaming process
   */
  private completeStreaming(sessionId: string, messageId: string): void {
    // Skip if not streaming this message
    if (
      this.streamingSessionId !== sessionId ||
      this.streamingMessageId !== messageId
    ) {
      return;
    }

    // Process any remaining batches
    this.processBatches(sessionId, messageId);

    // Get the final message
    const message = this.getMessage(sessionId, messageId);
    if (!message) return;

    // Update streaming metrics
    const metrics = this.streamingMetrics.get(messageId);
    if (metrics) {
      metrics.endTime = Date.now();

      // Log metrics
      this.logger.debug("Streaming metrics", {
        messageId,
        tokenCount: metrics.tokenCount,
        tokensPerSecond: metrics.tokensPerSecond.toFixed(2),
        duration:
          ((metrics.endTime - (metrics.startTime || 0)) / 1000).toFixed(2) +
          "s",
        batchCount: metrics.batchCount,
        avgProcessingTime: metrics.averageProcessingTime.toFixed(2) + "ms",
      });
    }

    // Update the message
    this.queueMessageUpdate(sessionId, messageId, message.content, true);

    // Reset streaming state
    this.streamingSessionId = null;
    this.streamingMessageId = null;
    this.recoveryAttempts = 0;
    this.lastStreamBackup = null;

    // Clean up
    this.tokenBatches.delete(messageId);

    // Update UI status
    this.throttledEmitStatusUpdate();

    // Emit streaming completed event
    this.emit("streamingCompleted", {
      sessionId,
      messageId,
      metrics: metrics
        ? {
            tokenCount: metrics.tokenCount,
            tokensPerSecond: metrics.tokensPerSecond,
            duration:
              metrics.endTime && metrics.startTime
                ? (metrics.endTime - metrics.startTime) / 1000
                : 0,
            batchCount: metrics.batchCount,
          }
        : undefined,
    });

    this.logger.debug(
      `Streaming completed for message ${messageId} in session ${sessionId}`,
    );
  }

  /**
   * Cancels the current streaming process
   */
  cancelStreaming(): void {
    // Skip if not streaming
    if (this.streamingSessionId === null || this.streamingMessageId === null) {
      return;
    }

    const sessionId = this.streamingSessionId;
    const messageId = this.streamingMessageId;

    // Process any remaining batches
    this.processBatches(sessionId, messageId);

    // Update the message
    const message = this.getMessage(sessionId, messageId);
    if (message) {
      this.updateMessage(sessionId, messageId, {
        status: "complete",
      });
    }

    // Reset streaming state
    this.streamingSessionId = null;
    this.streamingMessageId = null;
    this.recoveryAttempts = 0;
    this.lastStreamBackup = null;

    // Clean up
    this.tokenBatches.delete(messageId);

    // Update UI status
    this.throttledEmitStatusUpdate();

    // Emit streaming cancelled event
    this.emit("streamingCancelled", {
      sessionId,
      messageId,
    });

    this.logger.debug(
      `Streaming cancelled for message ${messageId} in session ${sessionId}`,
    );
  }

  /**
   * Handles a streaming error and attempts recovery
   */
  handleStreamingError(error: Error): void {
    // Skip if not streaming
    if (this.streamingSessionId === null || this.streamingMessageId === null) {
      return;
    }

    const sessionId = this.streamingSessionId;
    const messageId = this.streamingMessageId;

    this.logger.error(
      `Streaming error for message ${messageId} in session ${sessionId}`,
      error,
    );

    // Emit streaming error event
    this.emit("streamingError", {
      sessionId,
      messageId,
      error,
    });

    // Update message status
    this.updateMessage(sessionId, messageId, {
      status: "error",
      metadata: {
        error: error.message,
      },
    });

    // Attempt recovery if enabled
    if (
      this.config.recovery.enableAutoRecovery &&
      this.recoveryAttempts < this.config.recovery.maxRecoveryAttempts
    ) {
      this.recoveryAttempts++;

      this.logger.info(
        `Attempting recovery (${this.recoveryAttempts}/${this.config.recovery.maxRecoveryAttempts})`,
      );

      // Schedule recovery
      setTimeout(() => {
        this.attemptStreamingRecovery(sessionId, messageId);
      }, this.config.recovery.recoveryAttemptDelay);
    } else {
      // Too many recovery attempts, fail
      this.streamingSessionId = null;
      this.streamingMessageId = null;
      this.recoveryAttempts = 0;

      // Update status
      this.throttledEmitStatusUpdate();

      // Update bridge status
      this.statusManager.updateStatus({
        state: BridgeErrorState.COMMUNICATION_ERROR,
        message: "Streaming failed after multiple recovery attempts",
        affectedComponents: ["ChatBridge"],
      });
    }
  }

  /**
   * Attempts to recover from a streaming error
   */
  private attemptStreamingRecovery(sessionId: string, messageId: string): void {
    // Skip if no backup
    if (!this.config.recovery.enableStateBackups || !this.lastStreamBackup) {
      // No backup, just restart streaming
      this.resetAndRestartStreaming(sessionId, messageId);
      return;
    }

    // Get the message
    const message = this.getMessage(sessionId, messageId);
    if (!message) {
      this.logger.error(
        `Cannot recover message ${messageId} in session ${sessionId}, message not found`,
      );
      return;
    }

    // Check if we should preserve partial content
    if (this.config.recovery.preservePartialContent && this.lastStreamBackup) {
      // Restore from backup
      this.updateMessage(sessionId, messageId, {
        content: this.lastStreamBackup.content,
        status: "streaming",
      });
    } else {
      // Reset content
      this.updateMessage(sessionId, messageId, {
        content: "",
        status: "streaming",
      });
    }

    // Reset streaming state
    this.streamingSessionId = sessionId;
    this.streamingMessageId = messageId;

    // Reset metrics
    this.streamingMetrics.set(messageId, {
      tokenCount: 0,
      tokensPerSecond: 0,
      batchCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      startTime: Date.now(),
      endTime: null,
      timepoints: [],
    });

    // Reset token batch
    this.tokenBatches.set(messageId, []);

    // Restart streaming (would be API call in real implementation)
    this.simulateTokenStreaming(sessionId, messageId);

    // Update UI status
    this.throttledEmitStatusUpdate();

    // Emit recovery event
    this.emit("streamingRecoveryAttempt", {
      sessionId,
      messageId,
      attempt: this.recoveryAttempts,
      preservedContent: this.config.recovery.preservePartialContent,
    });

    this.logger.debug(
      `Recovery attempt for message ${messageId} in session ${sessionId}`,
    );
  }

  /**
   * Resets and restarts streaming from scratch
   */
  private resetAndRestartStreaming(sessionId: string, messageId: string): void {
    // Reset the message
    this.updateMessage(sessionId, messageId, {
      content: "",
      status: "streaming",
    });

    // Reset streaming state
    this.streamingSessionId = sessionId;
    this.streamingMessageId = messageId;

    // Reset metrics
    this.streamingMetrics.set(messageId, {
      tokenCount: 0,
      tokensPerSecond: 0,
      batchCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      startTime: Date.now(),
      endTime: null,
      timepoints: [],
    });

    // Reset token batch
    this.tokenBatches.set(messageId, []);

    // Restart streaming (would be API call in real implementation)
    this.simulateTokenStreaming(sessionId, messageId);

    // Update UI status
    this.throttledEmitStatusUpdate();
  }

  /**
   * Creates a new chat session
   */
  createSession(title: string = "New Chat"): string {
    const sessionId = this.generateId();

    // Create session
    const session: ChatSession = {
      id: sessionId,
      title,
      created: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Initialize message map
    this.messages.set(sessionId, new Map());

    // Emit session created event
    this.emit("sessionCreated", {
      sessionId,
      session,
    });

    this.logger.debug(`Session ${sessionId} created with title "${title}"`);

    return sessionId;
  }

  /**
   * Updates a session
   */
  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    // Skip if session doesn't exist
    if (!this.sessions.has(sessionId)) {
      this.logger.warn(`Attempted to update non-existent session ${sessionId}`);
      return;
    }

    this.queueSessionUpdate(sessionId, updates);
  }

  /**
   * Queues a session update
   */
  private queueSessionUpdate(
    sessionId: string,
    updates: Partial<ChatSession>,
  ): void {
    // Skip if session doesn't exist
    if (!this.sessions.has(sessionId)) return;

    // Get current update or create new one
    if (!this.pendingSessionUpdates.has(sessionId)) {
      this.pendingSessionUpdates.set(sessionId, {
        id: sessionId,
        update: {},
        timestamp: Date.now(),
      });
    }

    // Merge updates
    const pendingUpdate = this.pendingSessionUpdates.get(sessionId)!;
    pendingUpdate.update = { ...pendingUpdate.update, ...updates };
    pendingUpdate.timestamp = Date.now();

    // Process updates
    if (this.config.events.debounceSessionUpdates) {
      this.debouncedProcessSessionUpdates();
    } else {
      this.processSessionUpdates();
    }
  }

  /**
   * Processes all pending session updates
   */
  private processSessionUpdates(): void {
    // Process each pending update
    for (const [sessionId, update] of this.pendingSessionUpdates.entries()) {
      // Get the session
      const session = this.sessions.get(sessionId);
      if (!session) continue;

      // Update the session
      const updatedSession = {
        ...session,
        ...update.update,
      };

      // Store the updated session
      this.sessions.set(sessionId, updatedSession);

      // Emit session updated event
      this.emit("sessionUpdated", {
        sessionId,
        session: updatedSession,
      });
    }

    // Clear pending updates
    this.pendingSessionUpdates.clear();
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: string): void {
    // Skip if session doesn't exist
    if (!this.sessions.has(sessionId)) {
      this.logger.warn(`Attempted to delete non-existent session ${sessionId}`);
      return;
    }

    // Check if this is the active session
    const wasActive = this.activeSessionId === sessionId;

    // Delete session
    this.sessions.delete(sessionId);

    // Delete messages
    this.messages.delete(sessionId);

    // Reset active session if needed
    if (wasActive) {
      this.activeSessionId = null;
    }

    // Emit session deleted event
    this.emit("sessionDeleted", {
      sessionId,
    });

    this.logger.debug(`Session ${sessionId} deleted`);
  }

  /**
   * Subscribes to an event
   */
  on(event: string, callback: Function): { unsubscribe: () => void } {
    // Initialize listener array if needed
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    // Generate ID
    const id = this.generateId();

    // Create subscription
    const subscription: EventSubscription = {
      id,
      callback,
      unsubscribe: () => this.off(event, id),
    };

    // Add to subscribers
    this.subscribers.get(event)!.push(subscription);

    return subscription;
  }

  /**
   * Unsubscribes from an event
   */
  off(
    event: string,
    subscriptionOrId: { unsubscribe: () => void } | string,
  ): void {
    // Skip if no subscribers
    if (!this.subscribers.has(event)) return;

    const id =
      typeof subscriptionOrId === "string"
        ? subscriptionOrId
        : (subscriptionOrId as EventSubscription).id;

    const subscribers = this.subscribers.get(event)!;

    // Remove subscription
    const index = subscribers.findIndex((s) => s.id === id);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }

    // Remove empty subscriber list
    if (subscribers.length === 0) {
      this.subscribers.delete(event);
    }
  }

  /**
   * Emits an event to all subscribers
   */
  private emit(event: string, data: any): void {
    // Skip if no subscribers
    if (!this.subscribers.has(event)) return;

    // Time event processing if performance monitoring is enabled
    if (
      this.performanceMonitor &&
      this.config.monitoring.trackEventProcessing
    ) {
      this.performanceMonitor.timeFunction(
        `chat.event.${event}`,
        () => this.emitImpl(event, data),
        "chat",
        "events",
      );
    } else {
      this.emitImpl(event, data);
    }
  }

  /**
   * Implementation of emit
   */
  private emitImpl(event: string, data: any): void {
    const subscribers = this.subscribers.get(event)!;

    // Call all subscribers
    for (const subscriber of subscribers) {
      try {
        subscriber.callback(data);
      } catch (error) {
        this.logger.error(`Error in subscriber for event ${event}`, error);
      }
    }
  }

  /**
   * Emits a status update event
   */
  private emitStatusUpdate(): void {
    const isStreaming =
      this.streamingSessionId !== null && this.streamingMessageId !== null;

    this.emit("statusUpdated", {
      isStreaming,
      sessionId: this.streamingSessionId,
      messageId: this.streamingMessageId,
      activeSessionId: this.activeSessionId,
    });
  }

  /**
   * Gets current streaming metrics
   */
  getStreamingMetrics(): any {
    if (
      !this.streamingMessageId ||
      !this.streamingMetrics.has(this.streamingMessageId)
    ) {
      return null;
    }

    return this.streamingMetrics.get(this.streamingMessageId);
  }

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Destroys the chat bridge
   */
  destroy(): void {
    // Cancel any active streaming
    this.cancelStreaming();

    // Clear all state
    this.sessions.clear();
    this.messages.clear();
    this.tokenBatches.clear();
    this.pendingMessageUpdates.clear();
    this.pendingSessionUpdates.clear();
    this.streamingMetrics.clear();
    this.subscribers.clear();

    // Reset properties
    this.activeSessionId = null;
    this.streamingSessionId = null;
    this.streamingMessageId = null;
    this.recoveryAttempts = 0;
    this.lastStreamBackup = null;
    this.wasScrolledToBottom = true;
    this.messageContainerElement = null;

    // Cancel any pending animations
    if (this.nextAnimationFrameId !== null) {
      cancelAnimationFrame(this.nextAnimationFrameId);
      this.nextAnimationFrameId = null;
    }

    this.logger.info("OptimizedChatBridge destroyed");
  }
}
