import { ref, computed, onUnmounted, Ref, ComputedRef } from "vue";
import {
  EnhancedEventSource,
  ConnectionStats,
  StreamingMetadata,
} from "@/services/EnhancedEventSource";
import { BatchUpdateManager } from "@/utils/BatchUpdateManager";
import { useTelemetry } from "@/services/TelemetryService";

export interface StreamingState {
  isStreaming: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionState:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";
  progress: number;
  estimatedTime: number;
  tokensProcessed: number;
  metadata: StreamingMetadata | null;
  error: Error | null;
  stats: ConnectionStats;
}

export interface StreamingOptions {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  batchSize?: number;
  onToken?: (token: string) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
  headers?: Record<string, string>;
}

export interface UseEnhancedStreamingReturn {
  state: Ref<StreamingState>;
  isStreaming: ComputedRef<boolean>;
  isConnected: ComputedRef<boolean>;
  progress: ComputedRef<number>;
  estimatedTimeRemaining: ComputedRef<string>;
  connectionQuality: ComputedRef<
    "excellent" | "good" | "poor" | "disconnected"
  >;
  start: (options?: Partial<StreamingOptions>) => void;
  stop: () => void;
  retry: () => void;
  getStats: () => ConnectionStats;
}

export function useEnhancedStreaming(
  defaultOptions: StreamingOptions,
): UseEnhancedStreamingReturn {
  const telemetry = useTelemetry();

  // State
  const state = ref<StreamingState>({
    isStreaming: false,
    isConnecting: false,
    isReconnecting: false,
    connectionState: "disconnected",
    progress: 0,
    estimatedTime: 0,
    tokensProcessed: 0,
    metadata: null,
    error: null,
    stats: {
      connectedAt: null,
      disconnectedAt: null,
      reconnectCount: 0,
      messageCount: 0,
      errorCount: 0,
      lastError: null,
      uptime: 0,
    },
  });

  // Internal state
  let eventSource: EnhancedEventSource | null = null;
  let tokenBatcher: BatchUpdateManager<string> | null = null;
  let currentOptions = { ...defaultOptions };
  let streamStartTime = 0;
  let tokenBuffer: string[] = [];

  // Computed
  const isStreaming = computed(() => state.value.isStreaming);
  const isConnected = computed(
    () => state.value.connectionState === "connected",
  );
  const progress = computed(() => state.value.progress);

  const estimatedTimeRemaining = computed(() => {
    if (!state.value.isStreaming || state.value.estimatedTime === 0) {
      return "—";
    }

    const remaining = Math.max(
      0,
      state.value.estimatedTime - (Date.now() - streamStartTime),
    );
    const seconds = Math.ceil(remaining / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  });

  const connectionQuality = computed(() => {
    const stats = state.value.stats;
    if (state.value.connectionState !== "connected") {
      return "disconnected";
    }

    if (stats.errorCount === 0 && stats.reconnectCount === 0) {
      return "excellent";
    } else if (stats.errorCount < 3 && stats.reconnectCount < 2) {
      return "good";
    } else {
      return "poor";
    }
  });

  // Token processing
  const processTokenBatch = (tokens: string[]) => {
    if (currentOptions.onToken && tokens.length > 0) {
      // Join tokens and process
      const combined = tokens.join("");
      currentOptions.onToken(combined);

      // Update state
      state.value.tokensProcessed += tokens.length;

      // Track performance
      telemetry.track({
        type: "performance",
        category: "streaming",
        action: "token-batch",
        value: tokens.length,
        metadata: {
          batchSize: tokens.length,
          totalProcessed: state.value.tokensProcessed,
        },
      });
    }
  };

  // Start streaming
  const start = (options?: Partial<StreamingOptions>) => {
    // Merge options
    currentOptions = { ...defaultOptions, ...options };

    // Reset state
    state.value = {
      ...state.value,
      isStreaming: true,
      isConnecting: true,
      connectionState: "connecting",
      progress: 0,
      estimatedTime: 0,
      tokensProcessed: 0,
      metadata: null,
      error: null,
    };

    streamStartTime = Date.now();
    tokenBuffer = [];

    // Create batch manager
    tokenBatcher = new BatchUpdateManager<string>(processTokenBatch, {
      maxBatchSize: currentOptions.batchSize || 50,
      flushIntervalMs: 16, // ~60 FPS
      adaptiveThrottling: true,
      priority: "high",
    });

    // Create enhanced event source
    eventSource = new EnhancedEventSource({
      url: currentOptions.url,
      headers: currentOptions.headers,
      reconnect: currentOptions.reconnect ?? true,
      maxReconnectAttempts: currentOptions.maxReconnectAttempts ?? 5,
    });

    // Setup event handlers
    setupEventHandlers();

    // Track start
    telemetry.trackFeatureUsage("enhanced_streaming_start");
  };

  // Stop streaming
  const stop = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (tokenBatcher) {
      tokenBatcher.flush();
      tokenBatcher.clear();
      tokenBatcher = null;
    }

    state.value = {
      ...state.value,
      isStreaming: false,
      isConnecting: false,
      isReconnecting: false,
      connectionState: "disconnected",
    };

    // Track stop
    telemetry.track({
      type: "user_action",
      category: "streaming",
      action: "stop",
      metadata: {
        duration: Date.now() - streamStartTime,
        tokensProcessed: state.value.tokensProcessed,
      },
    });
  };

  // Retry connection
  const retry = () => {
    stop();
    start();
  };

  // Get connection stats
  const getStats = (): ConnectionStats => {
    return eventSource?.getStats() || state.value.stats;
  };

  // Setup event handlers
  const setupEventHandlers = () => {
    if (!eventSource) return;

    // Connection events
    eventSource.on("open", () => {
      state.value.isConnecting = false;
      state.value.connectionState = "connected";
      state.value.error = null;
      telemetry.trackFeatureUsage("enhanced_streaming_connected");
    });

    eventSource.on("connecting", () => {
      state.value.connectionState = "connecting";
    });

    eventSource.on("reconnecting", (info) => {
      state.value.isReconnecting = true;
      state.value.connectionState = "reconnecting";

      telemetry.track({
        type: "performance",
        category: "streaming",
        action: "reconnecting",
        metadata: info,
      });
    });

    eventSource.on("reconnected", (count) => {
      state.value.isReconnecting = false;
      state.value.connectionState = "connected";

      telemetry.track({
        type: "performance",
        category: "streaming",
        action: "reconnected",
        value: count,
      });
    });

    // Data events
    eventSource.onToken((token: string) => {
      tokenBatcher?.enqueue(token);
    });

    eventSource.onMetadata((metadata: StreamingMetadata) => {
      state.value.metadata = metadata;

      if (metadata.estimatedDuration) {
        state.value.estimatedTime = metadata.estimatedDuration;
      }

      telemetry.track({
        type: "performance",
        category: "streaming",
        action: "metadata",
        metadata,
      });
    });

    eventSource.onProgress((progress: number, estimated: number) => {
      state.value.progress = progress;
      state.value.estimatedTime = estimated;
    });

    eventSource.onError((error: Error) => {
      state.value.error = error;
      state.value.connectionState = "error";

      telemetry.trackError(error, {
        feature: "enhanced_streaming",
        url: currentOptions.url,
      });

      if (currentOptions.onError) {
        currentOptions.onError(error);
      }
    });

    eventSource.onDone((data: any) => {
      // Flush remaining tokens
      tokenBatcher?.flush();

      const duration = Date.now() - streamStartTime;

      state.value.isStreaming = false;
      state.value.progress = 100;

      telemetry.track({
        type: "performance",
        category: "streaming",
        action: "complete",
        value: duration,
        metadata: {
          tokensProcessed: state.value.tokensProcessed,
          reconnects: state.value.stats.reconnectCount,
          errors: state.value.stats.errorCount,
        },
      });

      if (currentOptions.onComplete) {
        currentOptions.onComplete(data);
      }
    });

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (eventSource) {
        state.value.stats = eventSource.getStats();
      }
    }, 1000);

    // Cleanup on unmount
    onUnmounted(() => {
      clearInterval(statsInterval);
    });
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stop();
  });

  return {
    state: state as Ref<StreamingState>,
    isStreaming,
    isConnected,
    progress,
    estimatedTimeRemaining,
    connectionQuality,
    start,
    stop,
    retry,
    getStats,
  };
}
