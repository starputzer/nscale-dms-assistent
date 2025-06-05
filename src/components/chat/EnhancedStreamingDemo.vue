<template>
  <div class="enhanced-streaming-demo">
    <div class="streaming-header">
      <h2>Enhanced Streaming Demo</h2>
      <div class="connection-status" :class="`status-${connectionState}`">
        <span class="status-dot"></span>
        {{ connectionStateLabel }}
      </div>
    </div>

    <!-- Controls -->
    <div class="streaming-controls">
      <button
        @click="startDemo"
        :disabled="isStreaming"
        class="btn btn-primary"
      >
        Start Streaming
      </button>
      <button
        @click="stopStreaming"
        :disabled="!isStreaming"
        class="btn btn-secondary"
      >
        Stop
      </button>
      <button
        @click="reconnect"
        :disabled="!canReconnect"
        class="btn btn-secondary"
      >
        Reconnect
      </button>
    </div>

    <!-- Progress Bar -->
    <div v-if="progress" class="streaming-progress">
      <div class="progress-header">
        <span>Progress: {{ Math.round(progress.percentageComplete) }}%</span>
        <span>{{ progress.tokensPerSecond }} tokens/s</span>
        <span v-if="progress.estimatedTimeRemaining > 0">
          ~{{ formatTime(progress.estimatedTimeRemaining) }} remaining
        </span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${progress.percentageComplete}%` }"
          :class="`confidence-${progress.confidence}`"
        ></div>
      </div>
      <div class="progress-stats">
        <span>{{ progress.tokensReceived }} tokens</span>
        <span>Confidence: {{ progress.confidence }}</span>
        <span>{{ formatTime(progress.elapsedTime) }} elapsed</span>
      </div>
    </div>

    <!-- Metadata Display -->
    <div v-if="metadata.length > 0" class="streaming-metadata">
      <h3>Stream Events</h3>
      <div class="metadata-list">
        <div
          v-for="(meta, index) in recentMetadata"
          :key="`meta-${index}`"
          class="metadata-item"
          :class="`type-${meta.type}`"
        >
          <span class="meta-type">{{ meta.type }}</span>
          <span class="meta-time">{{ formatTimestamp(meta.timestamp) }}</span>
          <div v-if="meta.type === 'thinking'" class="meta-content">
            {{ meta.data.message || "Thinking..." }}
          </div>
          <div v-else-if="meta.type === 'tool_use'" class="meta-content">
            Using tool: {{ meta.data.tool }} ({{ meta.data.status }})
          </div>
        </div>
      </div>
    </div>

    <!-- Stream Content -->
    <div class="streaming-content">
      <h3>Response</h3>
      <div class="content-display" :class="{ 'is-streaming': isStreaming }">
        <p v-if="!streamContent && !isStreaming" class="placeholder">
          Response will appear here...
        </p>
        <div v-else class="content-text">
          {{ streamContent }}
          <span v-if="isStreaming" class="cursor-blink">▊</span>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="streaming-error">
      <div class="error-header">
        <span>Error</span>
        <button @click="error = null" class="close-btn">×</button>
      </div>
      <div class="error-content">
        {{ error.message }}
      </div>
    </div>

    <!-- Connection Stats -->
    <div v-if="showStats && connectionStats" class="connection-stats">
      <h3>Connection Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Connection Attempts</span>
          <span class="stat-value">{{
            connectionStats.connectionAttempts
          }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Successful Connections</span>
          <span class="stat-value">{{
            connectionStats.successfulConnections
          }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Messages</span>
          <span class="stat-value">{{ connectionStats.totalMessages }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Reconnect Time</span>
          <span class="stat-value"
            >{{ Math.round(connectionStats.averageReconnectTime) }}ms</span
          >
        </div>
      </div>
    </div>

    <!-- Debug Toggle -->
    <div class="debug-toggle">
      <label>
        <input type="checkbox" v-model="showStats" />
        Show Connection Stats
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useEnhancedStreaming } from "@/composables/useEnhancedStreaming";

// Demo configuration
const showStats = ref(false);
const connectionStats = ref<any>(null);

// Use enhanced streaming
const {
  isStreaming,
  streamContent,
  progress,
  metadata,
  error,
  connectionState,
  hasError,
  isConnected,
  canReconnect,
  startStreaming,
  stopStreaming,
  reconnect,
  getConnectionStats,
} = useEnhancedStreaming({
  enableBatching: true,
  batchSize: 5,
  batchTimeout: 50,
  enableProgress: true,
  enableReconnection: true,
  maxReconnectAttempts: 3,
  debug: true,
  onMetadata: (meta) => {
    console.log("Metadata received:", meta);
  },
  onError: (err) => {
    console.error("Streaming error:", err);
  },
});

// Computed properties
const connectionStateLabel = computed(() => {
  const labels = {
    idle: "Not Connected",
    connecting: "Connecting...",
    connected: "Connected",
    error: "Connection Error",
    disconnected: "Disconnected",
  };
  return labels[connectionState.value] || "Unknown";
});

const recentMetadata = computed(() => {
  // Show last 5 metadata events
  return metadata.value.slice(-5).reverse();
});

// Methods
const startDemo = async () => {
  // For demo purposes, use a mock endpoint
  // In real usage, this would be your actual streaming endpoint
  const demoUrl =
    "/api/chat/message/stream?question=Tell+me+about+streaming&session_id=demo";

  // You can pass headers if needed
  const headers = {
    Authorization: "Bearer your-token-here",
  };

  await startStreaming(demoUrl, headers);
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Update stats periodically
watch(showStats, (show) => {
  if (show) {
    const updateStats = () => {
      connectionStats.value = getConnectionStats();
    };
    updateStats();
    const interval = setInterval(updateStats, 1000);

    // Cleanup
    const stopWatcher = watch(showStats, (newShow) => {
      if (!newShow) {
        clearInterval(interval);
        stopWatcher();
      }
    });
  }
});
</script>

<style scoped>
.enhanced-streaming-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.streaming-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.status-idle {
  color: #6b7280;
  background: #f3f4f6;
}
.status-connecting {
  color: #f59e0b;
  background: #fef3c7;
}
.status-connected {
  color: #10b981;
  background: #d1fae5;
}
.status-error {
  color: #ef4444;
  background: #fee2e2;
}
.status-disconnected {
  color: #6b7280;
  background: #f3f4f6;
}

.streaming-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.streaming-progress {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6b7280;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.confidence-low {
  background: #fbbf24;
}
.confidence-medium {
  background: #3b82f6;
}
.confidence-high {
  background: #10b981;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

.streaming-metadata {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.metadata-list {
  margin-top: 12px;
}

.metadata-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 14px;
}

.type-thinking {
  background: #dbeafe;
}
.type-tool_use {
  background: #fef3c7;
}
.type-progress {
  background: #e0e7ff;
}

.meta-type {
  font-weight: 600;
  text-transform: capitalize;
  min-width: 80px;
}

.meta-time {
  color: #6b7280;
  font-size: 12px;
}

.meta-content {
  flex: 1;
  color: #4b5563;
}

.streaming-content {
  margin-bottom: 20px;
}

.content-display {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
}

.content-display.is-streaming {
  border-color: #3b82f6;
}

.placeholder {
  color: #9ca3af;
  font-style: italic;
}

.content-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor-blink {
  animation: blink 1s infinite;
  color: #3b82f6;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.streaming-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  color: #dc2626;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #dc2626;
}

.error-content {
  color: #7f1d1d;
}

.connection-stats {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.debug-toggle {
  margin-top: 20px;
  font-size: 14px;
}

.debug-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
</style>
