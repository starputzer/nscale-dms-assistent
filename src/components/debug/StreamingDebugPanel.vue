<template>
  <div class="streaming-debug-panel" :class="{ 'is-expanded': isExpanded }">
    <div class="panel-header" @click="toggleExpanded">
      <h3>{{ isExpanded ? 'Streaming Debug Panel' : 'Debug' }}</h3>
      <button class="toggle-button">
        {{ isExpanded ? '▼' : '▲' }}
      </button>
    </div>
    
    <div v-if="isExpanded" class="panel-content">
      <div class="debug-section">
        <h4>Chat Status</h4>
        <div class="status-row">
          <span class="status-label">Active Session:</span>
          <span class="status-value">{{ activeSessionId || 'None' }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Messages:</span>
          <span class="status-value">{{ messageCount }}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Streaming:</span>
          <span class="status-value" :class="{'status-active': isStreaming}">
            {{ isStreaming ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="status-row">
          <span class="status-label">Rendering:</span>
          <span class="status-value" :class="{'status-error': renderingIssue}">
            {{ renderingStatus }}
          </span>
        </div>
      </div>
      
      <div class="debug-section">
        <h4>DOM Inspection</h4>
        <div class="status-row">
          <span class="status-label">Message List:</span>
          <span class="status-value" :class="{'status-error': !hasMessageList}">
            {{ hasMessageList ? 'Found' : 'Missing' }}
          </span>
        </div>
        <div class="status-row">
          <span class="status-label">Visible Messages:</span>
          <span class="status-value" :class="{'status-error': visibleMessageCount === 0 && messageCount > 0}">
            {{ visibleMessageCount }}
          </span>
        </div>
        <div class="status-row">
          <span class="status-label">CSS Issues:</span>
          <span class="status-value" :class="{'status-error': cssIssues.length > 0}">
            {{ cssIssues.length > 0 ? cssIssues.join(', ') : 'None' }}
          </span>
        </div>
      </div>
      
      <div class="debug-actions">
        <button class="action-button" @click="refreshDiagnostics">
          Refresh
        </button>
        <button class="action-button" @click="forceMessageDisplay">
          Force Display
        </button>
        <button class="action-button emergency" @click="activateEmergencyMode">
          Emergency Mode
        </button>
      </div>
      
      <div v-if="recentMessages.length > 0" class="message-preview">
        <h4>Latest Messages</h4>
        <div 
          v-for="(message, index) in recentMessages.slice().reverse()" 
          :key="index"
          class="preview-message"
          :class="{ 'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant' }"
        >
          <div class="message-role">{{ message.role }}</div>
          <div class="message-preview-content">{{ truncate(message.content, 100) }}</div>
          <div class="message-meta">ID: {{ message.id.substring(0, 8) }}... | {{ message.isStreaming ? 'Streaming' : 'Complete' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useSessionsStore } from '@/stores/sessions';

// Local state
const isExpanded = ref(false);
const sessionsStore = useSessionsStore();
const diagnosticsInterval = ref<number | null>(null);
const cssIssues = ref<string[]>([]);
const hasMessageList = ref(true);
const visibleMessageCount = ref(0);
const renderingIssue = ref(false);
const recentMessages = ref<any[]>([]);

// Toggle panel expansion
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    refreshDiagnostics();
    startDiagnosticsTimer();
  } else {
    stopDiagnosticsTimer();
  }
};

// Computed values
const activeSessionId = computed(() => sessionsStore.currentSessionId);
const messageCount = computed(() => {
  if (!activeSessionId.value) return 0;
  const activeSession = sessionsStore.sessions.find(s => s.id === activeSessionId.value);
  return activeSession?.messages?.length || 0;
});
const isStreaming = computed(() => {
  if (!activeSessionId.value) return false;
  const activeSession = sessionsStore.sessions.find(s => s.id === activeSessionId.value);
  const streamingMsg = sessionsStore.allCurrentMessages.find(m => m.isStreaming);
  return !!streamingMsg || sessionsStore.isStreaming;
});
const renderingStatus = computed(() => {
  if (renderingIssue.value) return 'Issues Detected';
  if (messageCount.value > 0 && visibleMessageCount.value === 0) return 'No Messages Rendered';
  if (cssIssues.value.length > 0) return 'CSS Issues';
  return 'Normal';
});

// Methods
const refreshDiagnostics = async () => {
  // Check if the EmergencyChatFixer global is available
  if (window.EmergencyChatFixer && typeof window.EmergencyChatFixer.runDiagnostics === 'function') {
    try {
      const diagnostics = await window.EmergencyChatFixer.runDiagnostics();
      cssIssues.value = diagnostics.cssIssues || [];
      hasMessageList.value = diagnostics.domStructureValid;
      visibleMessageCount.value = diagnostics.renderedMessageCount;
      renderingIssue.value = 
        (diagnostics.messageCount > 0 && diagnostics.renderedMessageCount === 0) ||
        diagnostics.cssIssues.length > 0 ||
        !diagnostics.domStructureValid;
    } catch (error) {
      console.error('Error running diagnostics:', error);
    }
  } else {
    // Manual checks if the emergency system isn't available
    checkDOMManually();
  }
  
  // Update recent messages
  updateRecentMessages();
};

const checkDOMManually = () => {
  // Check if message list exists
  const messageList = document.querySelector('.message-list-container, .n-message-list');
  hasMessageList.value = !!messageList;
  
  // Count visible messages
  if (messageList) {
    const messages = messageList.querySelectorAll('.message-item, .n-message-item');
    visibleMessageCount.value = messages.length;
    
    // Check for CSS issues
    const cssIssuesFound = [];
    const styles = window.getComputedStyle(messageList);
    
    if (styles.display === 'none') cssIssuesFound.push('display-none');
    if (styles.visibility === 'hidden') cssIssuesFound.push('visibility-hidden');
    if (parseFloat(styles.opacity) === 0) cssIssuesFound.push('zero-opacity');
    if (parseInt(styles.height) === 0) cssIssuesFound.push('zero-height');
    
    cssIssues.value = cssIssuesFound;
  } else {
    visibleMessageCount.value = 0;
    cssIssues.value = ['container-missing'];
  }
  
  // Determine if there's a rendering issue
  renderingIssue.value = 
    (messageCount.value > 0 && visibleMessageCount.value === 0) ||
    cssIssues.value.length > 0 ||
    !hasMessageList.value;
};

const updateRecentMessages = () => {
  if (!activeSessionId.value) {
    recentMessages.value = [];
    return;
  }
  
  // Get the most recent messages (up to 3)
  recentMessages.value = [...sessionsStore.allCurrentMessages].slice(-3);
};

const forceMessageDisplay = () => {
  if (window.EmergencyChatFixer && typeof window.EmergencyChatFixer.forceMessageDisplay === 'function') {
    window.EmergencyChatFixer.forceMessageDisplay();
    setTimeout(refreshDiagnostics, 500);
  } else {
    console.warn('Emergency chat fixer not available');
    // Try to perform some basic fixes
    const messageList = document.querySelector('.message-list-container, .n-message-list');
    if (messageList) {
      messageList.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important;');
    }
  }
};

const activateEmergencyMode = () => {
  if (window.EmergencyChatFixer && typeof window.EmergencyChatFixer.activate === 'function') {
    window.EmergencyChatFixer.activate();
  } else {
    console.warn('Emergency chat fixer not available');
  }
};

// Helper function to truncate text
const truncate = (text: string, maxLength: number) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Timer functions
const startDiagnosticsTimer = () => {
  if (diagnosticsInterval.value !== null) {
    clearInterval(diagnosticsInterval.value);
  }
  diagnosticsInterval.value = window.setInterval(refreshDiagnostics, 5000);
};

const stopDiagnosticsTimer = () => {
  if (diagnosticsInterval.value !== null) {
    clearInterval(diagnosticsInterval.value);
    diagnosticsInterval.value = null;
  }
};

// Lifecycle hooks
onMounted(() => {
  refreshDiagnostics();
  
  // If the panel starts expanded, start the timer
  if (isExpanded.value) {
    startDiagnosticsTimer();
  }
  
  // Watch for store changes that might affect our diagnostics
  watch(() => [
    sessionsStore.currentSessionId,
    sessionsStore.allCurrentMessages.length,
    sessionsStore.isStreaming
  ], refreshDiagnostics);
  
  // Also listen for custom message update events
  window.addEventListener('message-content-updated', () => {
    // Update diagnostics when a message is updated
    refreshDiagnostics();
  });
});

onBeforeUnmount(() => {
  stopDiagnosticsTimer();
});

// Expose the emergency chat fixer to the window object if it doesn't exist
// This serves as a bridge between Vue and the DOM
if (typeof window !== 'undefined' && !window.EmergencyChatFixer) {
  window.EmergencyChatFixer = {
    runDiagnostics: async () => {
      checkDOMManually();
      return {
        messageCount: messageCount.value,
        renderedMessageCount: visibleMessageCount.value,
        domStructureValid: hasMessageList.value,
        cssIssues: cssIssues.value,
        storeAvailable: true,
        activeSessionId: activeSessionId.value,
        errors: []
      };
    },
    forceMessageDisplay: forceMessageDisplay,
    activate: activateEmergencyMode,
    fixCssIssues: (issues: string[]) => {
      const messageList = document.querySelector('.message-list-container, .n-message-list');
      if (messageList) {
        messageList.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important;');
      }
    },
    debug: true
  };
}
</script>

<style scoped>
.streaming-debug-panel {
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 300px;
  background-color: rgba(31, 41, 55, 0.95);
  color: #e5e7eb;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow: hidden;
  transition: height 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(17, 24, 39, 0.95);
  cursor: pointer;
}

.panel-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: normal;
  color: #f3f4f6;
}

.toggle-button {
  background: none;
  border: none;
  color: #f3f4f6;
  font-size: 12px;
  cursor: pointer;
}

.panel-content {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.debug-section {
  margin-bottom: 16px;
  background-color: rgba(17, 24, 39, 0.5);
  border-radius: 4px;
  padding: 8px;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: bold;
  color: #f3f4f6;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
}

.status-label {
  color: #9ca3af;
}

.status-value {
  color: #34d399;
  font-weight: bold;
}

.status-active {
  color: #60a5fa;
}

.status-error {
  color: #f87171;
}

.debug-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.action-button {
  background-color: #4b5563;
  color: #f3f4f6;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.action-button:hover {
  background-color: #6b7280;
}

.action-button.emergency {
  background-color: #b91c1c;
}

.action-button.emergency:hover {
  background-color: #dc2626;
}

.message-preview {
  margin-top: 8px;
}

.preview-message {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: rgba(17, 24, 39, 0.5);
  font-size: 11px;
}

.user-message {
  border-left: 3px solid #60a5fa;
}

.assistant-message {
  border-left: 3px solid #34d399;
}

.message-role {
  font-weight: bold;
  margin-bottom: 4px;
  color: #d1d5db;
}

.message-preview-content {
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 4px;
}

.message-meta {
  font-size: 9px;
  color: #9ca3af;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(17, 24, 39, 0.5);
}

::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}
</style>

<script lang="ts">
// Add type declaration for the EmergencyChatFixer
declare global {
  interface Window {
    EmergencyChatFixer: {
      runDiagnostics: () => Promise<any>;
      forceMessageDisplay: () => void;
      activate: () => void;
      deactivate: () => void;
      fixCssIssues: (issues: string[]) => void;
      debug: boolean;
    };
  }
}
</script>