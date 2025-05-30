<template>
  <div class="streaming-demo">
    <div class="demo-header">
      <h1>Enhanced Streaming Demo</h1>
      <p>Demonstriert die erweiterten Streaming-Features mit automatischer Wiederverbindung, Progress-Tracking und Metadaten.</p>
    </div>

    <!-- Control Panel -->
    <div class="control-panel">
      <div class="control-group">
        <label>Streaming URL:</label>
        <input 
          v-model="streamingUrl" 
          type="text" 
          class="control-input"
          placeholder="/api/stream"
        />
      </div>

      <div class="control-group">
        <label>Batch Size:</label>
        <input 
          v-model.number="batchSize" 
          type="number" 
          min="1" 
          max="100"
          class="control-input"
        />
      </div>

      <div class="control-group">
        <label>Max Reconnect Attempts:</label>
        <input 
          v-model.number="maxReconnectAttempts" 
          type="number" 
          min="0" 
          max="10"
          class="control-input"
        />
      </div>

      <div class="control-actions">
        <button 
          @click="startStreaming" 
          :disabled="streaming.isStreaming"
          class="btn btn-primary"
        >
          Start Streaming
        </button>
        <button 
          @click="stopStreaming" 
          :disabled="!streaming.isStreaming"
          class="btn btn-danger"
        >
          Stop
        </button>
        <button 
          @click="retryConnection" 
          :disabled="streaming.isConnected || streaming.isConnecting"
          class="btn btn-secondary"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Status Display -->
    <div class="status-panel">
      <h2>Connection Status</h2>
      <StreamingIndicator
        :visible="true"
        :is-streaming="streaming.state.isStreaming"
        :connection-state="streaming.state.connectionState"
        :progress="streaming.progress.value"
        :estimated-time="streaming.estimatedTimeRemaining.value"
        :metadata="streaming.state.metadata"
        :token-count="streaming.state.tokensProcessed"
        :connection-quality="streaming.connectionQuality.value"
        :reconnect-attempt="reconnectAttempt"
        :max-reconnect-attempts="maxReconnectAttempts"
        :show-metadata="true"
        :show-quality="true"
        :show-progress="true"
        :show-thinking="true"
        :has-tokens="streaming.state.tokensProcessed > 0"
        @retry="retryConnection"
        @stop="stopStreaming"
      />
    </div>

    <!-- Streaming Output -->
    <div class="output-panel">
      <h2>Streaming Output</h2>
      <div class="output-content" ref="outputContent">
        <div v-if="streamingContent" class="streaming-text">
          {{ streamingContent }}
          <span v-if="streaming.isStreaming" class="cursor">|</span>
        </div>
        <div v-else-if="!streaming.isStreaming" class="placeholder">
          Klicken Sie auf "Start Streaming" um zu beginnen...
        </div>
      </div>
    </div>

    <!-- Metrics Panel -->
    <div class="metrics-panel">
      <h2>Performance Metrics</h2>
      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-label">Tokens Processed:</span>
          <span class="metric-value">{{ streaming.state.tokensProcessed }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Connection Uptime:</span>
          <span class="metric-value">{{ formatUptime(streaming.state.stats.uptime) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Messages Received:</span>
          <span class="metric-value">{{ streaming.state.stats.messageCount }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Reconnect Count:</span>
          <span class="metric-value">{{ streaming.state.stats.reconnectCount }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Error Count:</span>
          <span class="metric-value">{{ streaming.state.stats.errorCount }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Batch Metrics:</span>
          <span class="metric-value">{{ batchMetrics }}</span>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="event-log">
      <h2>Event Log</h2>
      <div class="log-controls">
        <button @click="clearLog" class="btn btn-small">Clear Log</button>
        <label>
          <input v-model="autoScroll" type="checkbox" />
          Auto-scroll
        </label>
      </div>
      <div class="log-content" ref="logContent">
        <div 
          v-for="(event, index) in eventLog" 
          :key="index"
          class="log-entry"
          :class="`log-entry--${event.type}`"
        >
          <span class="log-time">{{ formatTime(event.timestamp) }}</span>
          <span class="log-type">{{ event.type }}</span>
          <span class="log-message">{{ event.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useEnhancedStreaming } from '@/composables/useEnhancedStreaming';
import StreamingIndicator from '@/components/StreamingIndicator.vue';
import { useTelemetry } from '@/services/TelemetryService';

// State
const streamingUrl = ref('/api/stream/demo');
const batchSize = ref(10);
const maxReconnectAttempts = ref(5);
const streamingContent = ref('');
const eventLog = ref<Array<{ timestamp: number; type: string; message: string }>>([]);
const autoScroll = ref(true);
const reconnectAttempt = ref(0);
const batchMetrics = ref('—');

// Refs
const outputContent = ref<HTMLElement>();
const logContent = ref<HTMLElement>();

// Telemetry
const telemetry = useTelemetry();

// Enhanced Streaming
const streaming = useEnhancedStreaming({
  url: streamingUrl.value,
  batchSize: batchSize.value,
  maxReconnectAttempts: maxReconnectAttempts.value,
  onToken: handleToken,
  onComplete: handleComplete,
  onError: handleError
});

// Methods
function startStreaming() {
  streamingContent.value = '';
  logEvent('info', 'Starting streaming...');
  
  streaming.start({
    url: streamingUrl.value,
    batchSize: batchSize.value,
    maxReconnectAttempts: maxReconnectAttempts.value
  });
  
  telemetry.trackFeatureUsage('streaming_demo_start');
}

function stopStreaming() {
  logEvent('info', 'Stopping streaming...');
  streaming.stop();
}

function retryConnection() {
  logEvent('info', 'Retrying connection...');
  streaming.retry();
}

function handleToken(token: string) {
  streamingContent.value += token;
  
  // Update batch metrics
  const stats = streaming.getStats();
  const tokensPerBatch = streaming.state.tokensProcessed / Math.max(1, stats.messageCount);
  batchMetrics.value = `${tokensPerBatch.toFixed(1)} tokens/batch`;
}

function handleComplete(data: any) {
  logEvent('success', `Streaming completed. Total tokens: ${streaming.state.tokensProcessed}`);
  telemetry.track({
    type: 'performance',
    category: 'streaming_demo',
    action: 'complete',
    value: streaming.state.tokensProcessed
  });
}

function handleError(error: Error) {
  logEvent('error', `Streaming error: ${error.message}`);
}

function logEvent(type: string, message: string) {
  eventLog.value.push({
    timestamp: Date.now(),
    type,
    message
  });
  
  // Limit log size
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(-50);
  }
  
  // Auto-scroll
  if (autoScroll.value) {
    nextTick(() => {
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight;
      }
    });
  }
}

function clearLog() {
  eventLog.value = [];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function formatUptime(ms: number): string {
  if (ms === 0) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Watch for streaming events
watch(() => streaming.state, (newState) => {
  // Log connection state changes
  if (newState.connectionState === 'connected') {
    logEvent('success', 'Connected to streaming endpoint');
  } else if (newState.connectionState === 'connecting') {
    logEvent('info', 'Connecting to streaming endpoint...');
  } else if (newState.connectionState === 'reconnecting') {
    reconnectAttempt.value = newState.stats.reconnectCount;
    logEvent('warning', `Reconnecting... (attempt ${reconnectAttempt.value})`);
  } else if (newState.connectionState === 'error') {
    logEvent('error', `Connection error: ${newState.error?.message || 'Unknown error'}`);
  }
}, { deep: true });

// Initial log
onMounted(() => {
  logEvent('info', 'Enhanced Streaming Demo initialized');
});
</script>

<style scoped lang="scss">
.streaming-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-secondary);
  }
}

// Control Panel
.control-panel {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.control-group {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  label {
    font-weight: 500;
  }
}

.control-input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
}

.control-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

// Buttons
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: var(--primary-color);
    color: white;

    &:hover:not(:disabled) {
      background: var(--primary-color-dark);
    }
  }

  &.btn-danger {
    background: #ef4444;
    color: white;

    &:hover:not(:disabled) {
      background: #dc2626;
    }
  }

  &.btn-secondary {
    background: #6b7280;
    color: white;

    &:hover:not(:disabled) {
      background: #4b5563;
    }
  }

  &.btn-small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
}

// Status Panel
.status-panel {
  margin-bottom: 2rem;

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

// Output Panel
.output-panel {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.output-content {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  background: var(--background-color);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.streaming-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  animation: blink 1s infinite;
}

.placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

// Metrics Panel
.metrics-panel {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--background-color);
  border-radius: 0.25rem;
}

.metric-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.metric-value {
  font-weight: 600;
  font-family: monospace;
}

// Event Log
.event-log {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}

.log-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
}

.log-content {
  height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--background-color);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}

.log-entry {
  display: grid;
  grid-template-columns: 100px 80px 1fr;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  &.log-entry--error {
    color: #ef4444;
  }

  &.log-entry--warning {
    color: #f59e0b;
  }

  &.log-entry--success {
    color: #10b981;
  }

  &.log-entry--info {
    color: var(--text-secondary);
  }
}

.log-time {
  color: var(--text-tertiary);
}

.log-type {
  font-weight: 600;
  text-transform: uppercase;
}

.log-message {
  word-break: break-word;
}

// Animations
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

// Dark mode
:root {
  --surface-color: #ffffff;
  --background-color: #f9fafb;
  --border-color: #e5e7eb;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --primary-color: #3b82f6;
  --primary-color-dark: #2563eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-color: #1f2937;
    --background-color: #111827;
    --border-color: #374151;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    --primary-color: #3b82f6;
    --primary-color-dark: #2563eb;
  }
}
</style>