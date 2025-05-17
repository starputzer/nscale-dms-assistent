<template>
  <div v-if="showDebug" class="streaming-debug-panel">
    <div class="debug-panel-header">
      <h3>Streaming Debug Panel</h3>
      <div class="controls">
        <button @click="toggleExpanded">{{ isExpanded ? 'Collapse' : 'Expand' }}</button>
        <button @click="clearLogs">Clear</button>
        <button @click="showDebug = false">Close</button>
      </div>
    </div>
    
    <div v-if="isExpanded" class="debug-panel-content">
      <!-- Direct Store Access Section -->
      <div class="debug-section">
        <h4>Store Stats</h4>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Session ID:</span>
            <span class="status-value">{{ directStoreAccess.sessionId || 'None' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Store Messages:</span>
            <span class="status-value">{{ directStoreAccess.storeMessages.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Computed Messages:</span>
            <span class="status-value">{{ directStoreAccess.computedMessages.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Pending Messages:</span>
            <span class="status-value">{{ directStoreAccess.pendingMessages.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Sessions Count:</span>
            <span class="status-value">{{ directStoreAccess.sessionsCount }}</span>
          </div>
        </div>
      </div>

      <!-- Current Streaming Status Section -->
      <div class="debug-section">
        <h4>Streaming Status</h4>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Active:</span>
            <span class="status-value" :class="{'status-active': isStreaming}">
              {{ isStreaming ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">Progress:</span>
            <span class="status-value">{{ streamingProgress }}%</span>
          </div>
          <div class="status-item">
            <span class="status-label">Session ID:</span>
            <span class="status-value">{{ currentStreamingSessionId || 'None' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Message ID:</span>
            <span class="status-value">{{ currentStreamingMessageId || 'None' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Connection:</span>
            <span class="status-value" :class="connectionStatusClass">
              {{ connectionStatus }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">Transport:</span>
            <span class="status-value">{{ currentTransport }}</span>
          </div>
        </div>
      </div>
      
      <!-- Content Tracking Section -->
      <div class="debug-section">
        <h4>Content Tracking</h4>
        <div class="content-metrics">
          <div class="metric-item">
            <span class="metric-label">Total Length:</span>
            <span class="metric-value">{{ responseLength }} chars</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Tokens Received:</span>
            <span class="metric-value">{{ tokenCount }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Update Rate:</span>
            <span class="metric-value">{{ updateRate }}/sec</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Last Update:</span>
            <span class="metric-value">{{ timeSinceLastUpdate }}</span>
          </div>
        </div>
        
        <!-- Latest Content Preview -->
        <div class="content-preview">
          <div class="preview-header">
            <h5>Latest Content</h5>
            <button @click="toggleFullContent">{{ showFullContent ? 'Show Less' : 'Show Full' }}</button>
          </div>
          <pre class="content-display" v-if="!showFullContent">{{ streamingMessageContent }}</pre>
          <pre class="content-display full" v-else>{{ currentContent }}</pre>
        </div>
      </div>
      
      <!-- Direct Store Messages Section -->
      <div class="debug-section">
        <h4>Direct Store Messages</h4>
        <div v-if="!directStoreAccess.sessionId" class="no-issues">
          No current session ID
        </div>
        <div v-else-if="directStoreAccess.storeMessages.length === 0" class="no-issues">
          No messages for session {{ directStoreAccess.sessionId }}
        </div>
        <div v-else class="history-list">
          <div v-for="(msg, idx) in directStoreAccess.storeMessages" :key="idx" class="history-item">
            <div class="history-meta">
              <span class="history-index">[{{ idx }}]</span>
              <span class="history-role">[{{ msg.role }}]</span>
              <span v-if="msg.isStreaming" class="msg-streaming">[STREAMING]</span>
              <span class="history-status">[{{ msg.status }}]</span>
            </div>
            <div class="history-content">
              <pre>{{ msg.content.substring(0, 100) }}...</pre>
            </div>
          </div>
        </div>
      </div>
      
      <!-- All Computed Messages Section -->
      <div class="debug-section">
        <h4>Computed Messages</h4>
        <div v-if="allMessages.length === 0" class="no-issues">
          No computed messages available
        </div>
        <div v-else class="history-list">
          <div v-for="(msg, idx) in allMessages" :key="idx" class="history-item">
            <div class="history-meta">
              <span class="history-index">[{{ idx }}]</span>
              <span class="history-role">[{{ msg.role }}]</span>
              <span v-if="msg.isStreaming" class="msg-streaming">[STREAMING]</span>
              <span class="history-status">[{{ msg.status }}]</span>
            </div>
            <div class="history-content">
              <pre>{{ msg.content.substring(0, 100) }}...</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Update History Section -->
      <div class="debug-section">
        <h4>Update History</h4>
        <div class="update-history">
          <div class="history-controls">
            <label>
              <input type="checkbox" v-model="showDetailedHistory" />
              Show Detailed History
            </label>
            <span class="history-count">{{ messageUpdateHistory.length }} updates</span>
          </div>
          
          <div v-if="messageUpdateHistory.length === 0" class="no-issues">
            No message updates recorded
          </div>
          
          <div v-else class="history-list">
            <div v-for="(update, index) in displayedHistory" :key="index" class="history-item">
              <div class="history-meta">
                <span class="history-time">{{ formatTime(update.timestamp) }}</span>
                <span class="history-size">+{{ update.contentDelta }} chars</span>
              </div>
              <div v-if="showDetailedHistory" class="history-content">
                <pre>{{ update.content }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error Tracking Section -->
      <div class="debug-section">
        <h4>Errors & Warnings</h4>
        <div v-if="errors.length === 0 && warnings.length === 0 && !lastError" class="no-issues">
          No errors or warnings recorded
        </div>
        
        <div v-if="lastError" class="error-list">
          <h5>Last Error</h5>
          <div class="error-item">
            <div class="error-message">{{ lastError }}</div>
          </div>
        </div>
        
        <div v-if="errors.length > 0" class="error-list">
          <h5>Errors ({{ errors.length }})</h5>
          <div v-for="(error, index) in errors" :key="`err-${index}`" class="error-item">
            <div class="error-time">{{ formatTime(error.timestamp) }}</div>
            <div class="error-message">{{ error.message }}</div>
            <div v-if="error.details" class="error-details">
              <pre>{{ error.details }}</pre>
            </div>
          </div>
        </div>
        
        <div v-if="warnings.length > 0" class="warning-list">
          <h5>Warnings ({{ warnings.length }})</h5>
          <div v-for="(warning, index) in warnings" :key="`warn-${index}`" class="warning-item">
            <div class="warning-time">{{ formatTime(warning.timestamp) }}</div>
            <div class="warning-message">{{ warning.message }}</div>
          </div>
        </div>
      </div>
      
      <!-- Actions Section -->
      <div class="debug-actions">
        <button @click="cancelStreaming" :disabled="!isStreaming" class="action-button cancel">
          Cancel Streaming
        </button>
        <button @click="refreshDebug" class="action-button refresh">
          Refresh
        </button>
        <button @click="downloadLogs" class="action-button">
          Download Logs
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSessionsStore } from '@/stores/sessions'

// State
const sessionsStore = useSessionsStore()
const showDebug = ref(true)
const isExpanded = ref(true)
const showFullContent = ref(false)
const showDetailedHistory = ref(false)
const lastError = ref<string | null>(null)
const refreshCount = ref(0)
const refreshInterval = ref<number | null>(null)

// Metrics tracking
const messageUpdateHistory = ref<any[]>([])
const errors = ref<any[]>([])
const warnings = ref<any[]>([])
const recentEvents = ref<any[]>([])
const tokenCount = ref(0)
const totalBytesReceived = ref(0)
const transferRate = ref(0)
const eventCount = ref(0)
const updateRate = ref(0)
const lastUpdateTime = ref<number | null>(null)
const connectionStatus = ref('Disconnected')
const currentTransport = ref('EventSource')

// Direct access to store for debugging
const directStoreAccess = computed(() => {
  const sessionId = sessionsStore.currentSessionId;
  return {
    sessionId,
    storeMessages: sessionId ? sessionsStore.messages[sessionId] || [] : [],
    computedMessages: sessionsStore.allCurrentMessages,
    pendingMessages: sessionId ? sessionsStore.pendingMessages[sessionId] || [] : [],
    isStreaming: sessionsStore.isStreaming,
    sessionsCount: sessionsStore.sessions.length
  };
})

// Streaming status
const isStreaming = computed(() => sessionsStore.isStreaming)
const streamingStatus = computed(() => isStreaming.value ? 'Active' : 'Inactive')
const streamingProgress = computed(() => sessionsStore.streaming.progress || 0)
const currentStreamingSessionId = computed(() => sessionsStore.streaming.currentSessionId || null)

// Content computation
const responseLength = computed(() => {
  // Direct store access to bypass computed properties
  const sessionId = sessionsStore.currentSessionId;
  if (!sessionId) return 0;
  
  const directMessages = sessionsStore.messages[sessionId] || [];
  const streamingMessage = directMessages.find(msg => msg.isStreaming);
  
  // Also check computed messages as fallback
  const computedMessages = sessionsStore.allCurrentMessages
  const computedStreamingMessage = computedMessages.find(msg => msg.isStreaming)
  
  return streamingMessage ? streamingMessage.content.length : 
         computedStreamingMessage ? computedStreamingMessage.content.length : 0;
})

// Current streaming message
const currentStreamingMessageId = computed(() => {
  if (!isStreaming.value || !currentStreamingSessionId.value) return null;
  
  const messages = sessionsStore.messages[currentStreamingSessionId.value] || [];
  const streamingMessage = messages.find(msg => msg.isStreaming);
  return streamingMessage?.id || null;
});

const currentContent = computed(() => {
  if (!isStreaming.value || !currentStreamingSessionId.value) return '';
  
  const messages = sessionsStore.messages[currentStreamingSessionId.value] || [];
  const streamingMessage = messages.find(msg => msg.isStreaming);
  return streamingMessage?.content || '';
});

const streamingMessageContent = computed(() => {
  const content = currentContent.value;
  if (!content) return 'None';
  if (content.length <= 100) return content;
  return content.substring(0, 100) + '...';
})

// Session and message computations
const currentSessionId = computed(() => sessionsStore.currentSessionId)
const messageCount = computed(() => sessionsStore.allCurrentMessages.length)
const allMessages = computed(() => sessionsStore.allCurrentMessages)

// Utility computations
const connectionStatusClass = computed(() => {
  if (connectionStatus.value === 'Connected') return 'status-connected';
  if (connectionStatus.value === 'Connecting') return 'status-connecting';
  if (connectionStatus.value === 'Disconnected') return 'status-disconnected';
  if (connectionStatus.value === 'Error') return 'status-error';
  return '';
});

const displayedHistory = computed(() => {
  return messageUpdateHistory.value.slice().reverse().slice(0, 20);
});

const timeSinceLastUpdate = computed(() => {
  if (!lastUpdateTime.value) return 'N/A';
  
  const diff = Date.now() - lastUpdateTime.value;
  if (diff < 1000) return `${diff}ms ago`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  return `${Math.floor(diff / 60000)}m ago`;
});

// UI Interaction methods
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function toggleFullContent() {
  showFullContent.value = !showFullContent.value;
}

function clearLogs() {
  messageUpdateHistory.value = [];
  errors.value = [];
  warnings.value = [];
  recentEvents.value = [];
  tokenCount.value = 0;
  totalBytesReceived.value = 0;
  lastError.value = null;
}

function cancelStreaming() {
  if (isStreaming.value) {
    sessionsStore.cancelStreaming();
    logEvent({
      type: 'Streaming Cancelled',
      size: 0,
      timestamp: Date.now()
    });
  }
}

const clearDebugInfo = clearLogs;

function refreshDebug() {
  refreshCount.value++;
  console.log('[DEBUG PANEL] Refreshed, current messages:', allMessages.value);
}

// Helper functions
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + 
    '.' + String(date.getMilliseconds()).padStart(3, '0');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function logEvent(event) {
  recentEvents.value.unshift(event);
  if (recentEvents.value.length > 10) {
    recentEvents.value.pop();
  }
  eventCount.value++;
}

function logError(message, details = null) {
  errors.value.push({
    timestamp: Date.now(),
    message,
    details
  });
}

function logWarning(message) {
  warnings.value.push({
    timestamp: Date.now(),
    message
  });
}

function downloadLogs() {
  const logData = {
    timestamp: new Date().toISOString(),
    streamingStatus: {
      isActive: isStreaming.value,
      progress: streamingProgress.value,
      sessionId: currentStreamingSessionId.value,
      messageId: currentStreamingMessageId.value
    },
    storeData: {
      currentSessionId: currentSessionId.value,
      messageCount: messageCount.value,
      directStoreAccess: {
        sessionId: directStoreAccess.value.sessionId,
        storeMessagesCount: directStoreAccess.value.storeMessages.length,
        computedMessagesCount: directStoreAccess.value.computedMessages.length,
        pendingMessagesCount: directStoreAccess.value.pendingMessages.length,
        sessionsCount: directStoreAccess.value.sessionsCount
      }
    },
    metrics: {
      messageUpdates: messageUpdateHistory.value,
      contentLength: responseLength.value,
      tokenCount: tokenCount.value,
      updateRate: updateRate.value,
      bytesReceived: totalBytesReceived.value
    },
    errors: errors.value,
    warnings: warnings.value,
    events: recentEvents.value,
    lastError: lastError.value,
    fullContent: currentContent.value
  };
  
  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `streaming-debug-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Setup event listeners to monitor streaming
function setupStreamingMonitors() {
  // Set up interval to calculate transfer rate
  refreshInterval.value = window.setInterval(() => {
    refreshDebug();
    
    if (isStreaming.value && lastUpdateTime.value) {
      // Calculate transfer rate
      transferRate.value = totalBytesReceived.value / 
        ((Date.now() - lastUpdateTime.value) / 1000 || 1);
        
      // Update connection status if still streaming but not getting updates
      const timeSinceUpdate = Date.now() - lastUpdateTime.value;
      if (timeSinceUpdate > 10000 && connectionStatus.value === 'Connected') {
        connectionStatus.value = 'Stalled';
        logWarning('Streaming connection may have stalled - no updates in 10s');
      }
    } else {
      transferRate.value = 0;
    }
  }, 1000);
}

// Watch for content changes
watch(() => currentContent.value, (newContent, oldContent) => {
  if (!oldContent || newContent === oldContent) return;
  
  const timestamp = Date.now();
  const contentDelta = newContent.length - (oldContent?.length || 0);
  
  // Log the update if there's actual content being added
  if (contentDelta > 0) {
    // Update connection status if not set
    if (connectionStatus.value !== 'Connected') {
      connectionStatus.value = 'Connected';
      logEvent({
        type: 'Connection Established',
        size: 0,
        timestamp
      });
    }
    
    // Track the update
    messageUpdateHistory.value.push({
      timestamp,
      content: newContent.slice(oldContent.length), // Just the new part
      contentDelta,
      totalLength: newContent.length
    });
    
    // Update metrics
    tokenCount.value++;
    totalBytesReceived.value += contentDelta;
    lastUpdateTime.value = timestamp;
    
    // Calculate update rate
    if (messageUpdateHistory.value.length > 1) {
      const recentUpdates = messageUpdateHistory.value
        .filter(update => timestamp - update.timestamp < 5000);
      
      updateRate.value = recentUpdates.length / 5;
    }
  }
});

// Watch streaming status changes
watch(() => isStreaming.value, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // Streaming started
    connectionStatus.value = 'Connecting';
    // Don't clear history here - we want to keep history across sessions
    
    // Log the start event
    logEvent({
      type: 'Streaming Started',
      size: 0,
      timestamp: Date.now()
    });
  }
  
  if (!newValue && oldValue) {
    // Streaming ended
    connectionStatus.value = 'Disconnected';
    
    // Log the end event
    logEvent({
      type: 'Streaming Ended',
      size: 0,
      timestamp: Date.now()
    });
  }
});

// Auto-refresh when messages change
watch(() => sessionsStore.allCurrentMessages, (newMessages, oldMessages) => {
  // Only log when there's a meaningful change (length difference or new IDs)
  if (!oldMessages || oldMessages.length !== newMessages.length) {
    console.log('[DEBUG PANEL] Messages changed:', 
      `${oldMessages?.length || 0} → ${newMessages.length}`);
  }
}, { deep: false }) // Deep: false improves performance

// Monitor store messages directly
watch(() => directStoreAccess.value.storeMessages, (newMessages, oldMessages) => {
  if (!oldMessages || oldMessages.length !== newMessages.length) {
    console.log('[DEBUG PANEL] Store messages changed:', 
      `${oldMessages?.length || 0} → ${newMessages.length}`);
  }
}, { deep: false })

// Lifecycle hooks
onMounted(() => {
  console.log('[DEBUG PANEL] StreamingDebugPanel mounted');
  setupStreamingMonitors();
  
  // Initialize connection status based on current streaming state
  if (isStreaming.value) {
    connectionStatus.value = 'Connected';
  }
  
  // Add global functions for debugging
  if (import.meta.env.DEV) {
    window.streamingDebug = {
      showPanel: () => showDebug.value = true,
      hidePanel: () => showDebug.value = false,
      getInfo: () => ({
        streaming: streamingStatus.value,
        responseLength: responseLength.value,
        sessionId: currentSessionId.value,
        messageCount: messageCount.value,
        messages: allMessages.value,
        lastError: lastError.value,
        history: messageUpdateHistory.value,
        errors: errors.value,
        warnings: warnings.value
      }),
      getStore: () => sessionsStore,
      triggerRefresh: refreshDebug,
      clearLogs,
      logEvent,
      logError,
      logWarning
    }
  }
})

onUnmounted(() => {
  console.log('[DEBUG PANEL] StreamingDebugPanel unmounted');
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
  
  if (import.meta.env.DEV) {
    delete window.streamingDebug;
  }
});
</script>

<style scoped>
.streaming-debug-panel {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 400px;
  max-height: 80vh;
  background-color: #1e1e1e;
  color: #e0e0e0;
  border-top-left-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.debug-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #444;
}

.debug-panel-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00d06a;
}

.controls {
  display: flex;
  gap: 8px;
}

.debug-panel-content {
  padding: 12px;
  overflow-y: auto;
  max-height: calc(80vh - 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.debug-section {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 10px;
  background-color: #2a2a2a;
}

.debug-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #00a5ff;
  border-bottom: 1px solid #444;
  padding-bottom: 5px;
}

.status-grid, 
.content-metrics,
.network-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.status-item,
.metric-item,
.network-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label,
.metric-label,
.network-label {
  color: #888;
}

.status-value,
.metric-value,
.network-value {
  font-weight: bold;
}

.status-active {
  color: #4caf50;
}

.status-connected {
  color: #4caf50;
}

.status-connecting {
  color: #ffeb3b;
}

.status-disconnected {
  color: #888;
}

.status-error {
  color: #f44336;
}

.content-preview {
  margin-top: 10px;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background-color: #333;
}

.preview-header h5 {
  margin: 0;
  font-size: 12px;
  color: #ccc;
}

.content-display {
  margin: 0;
  padding: 10px;
  background-color: #222;
  color: #ddd;
  white-space: pre-wrap;
  max-height: 100px;
  overflow-y: auto;
}

.content-display.full {
  max-height: 300px;
}

.update-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-count {
  color: #888;
  font-size: 11px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #333;
  border-radius: 3px;
  padding: 5px;
  background-color: #262626;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  gap: 5px;
}

.history-time {
  color: #888;
}

.history-size {
  color: #4caf50;
}

.history-index {
  color: #64B5F6;
}

.history-role {
  color: #AED581;
}

.history-status {
  color: #FFAB91;
}

.history-content {
  margin-top: 5px;
  padding: 5px;
  background-color: #222;
  border-radius: 3px;
  max-height: 60px;
  overflow-y: auto;
}

.history-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 11px;
}

.error-list, 
.warning-list {
  margin-top: 10px;
}

.error-list h5, 
.warning-list h5 {
  margin: 0 0 5px 0;
  font-size: 12px;
}

.error-list h5 {
  color: #f44336;
}

.warning-list h5 {
  color: #ff9800;
}

.error-item,
.warning-item {
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 3px;
}

.error-item {
  background-color: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
}

.warning-item {
  background-color: rgba(255, 152, 0, 0.1);
  border-left: 3px solid #ff9800;
}

.error-time,
.warning-time {
  font-size: 10px;
  color: #888;
}

.error-message,
.warning-message {
  margin: 3px 0;
}

.error-details {
  margin-top: 5px;
  padding: 5px;
  background-color: #222;
  border-radius: 3px;
  font-size: 11px;
  max-height: 100px;
  overflow-y: auto;
}

.error-details pre {
  margin: 0;
  white-space: pre-wrap;
}

.msg-streaming {
  color: #FFD54F;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

.no-issues {
  text-align: center;
  color: #888;
  padding: 10px;
}

.debug-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.action-button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background-color: #2d2d2d;
  color: #ddd;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover:not(:disabled) {
  background-color: #3d3d3d;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.cancel {
  background-color: #541212;
  color: #ff9999;
}

.action-button.cancel:hover:not(:disabled) {
  background-color: #6a1b1b;
}

.action-button.refresh {
  background-color: #1f4e5f;
  color: #88ddff;
}

.action-button.refresh:hover:not(:disabled) {
  background-color: #2a6b81;
}

button {
  padding: 4px 8px;
  background-color: #333;
  color: #ddd;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
}

button:hover {
  background-color: #444;
}

input[type="checkbox"] {
  margin-right: 5px;
}
</style>