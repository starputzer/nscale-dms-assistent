<template>
  <div class="chat-view">
    <div class="chat-container">
      <!-- Sessions sidebar -->
      <aside class="sessions-sidebar">
        <SessionList 
          :current-session-id="currentSessionId"
          @session-selected="handleSessionSelected"
          @session-created="handleSessionCreated"
          @session-deleted="handleSessionDeleted"
        />
      </aside>
      
      <!-- Main chat area -->
      <main class="chat-main">
        <div v-if="!currentSessionId" class="no-session">
          <!-- MOTD Banner für Startseite (wenn aktiviert) -->
          <div 
            v-if="motd && motd.enabled && motd.display.showOnStartup && !motdDismissed" 
            class="motd-banner motd-banner-startup"
            :style="{
              backgroundColor: motd.style.backgroundColor,
              borderColor: motd.style.borderColor,
              color: motd.style.textColor,
              border: '1px solid ' + motd.style.borderColor
            }"
          >
            <div class="motd-inner">
              <div v-if="motd.style.iconClass" class="motd-icon">
                <i :class="['fas', `fa-${motd.style.iconClass}`]"></i>
              </div>
              <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
              <button 
                v-if="motd.display.dismissible" 
                @click="dismissMotd" 
                class="dismiss-btn"
                :style="{ color: motd.style.textColor }"
                title="Nachricht ausblenden"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <div class="empty-state">
            <i class="fas fa-comment-dots text-5xl text-gray-300 mb-4"></i>
            <h3 class="text-lg font-medium mb-2">Keine Unterhaltung ausgewählt</h3>
            <p class="text-sm text-gray-500 mb-4">Wählen Sie eine Unterhaltung aus der Seitenleiste oder starten Sie eine neue.</p>
            <button @click="createNewSession" class="new-session-btn">
              <i class="fas fa-plus mr-2"></i>
              Neue Unterhaltung starten
            </button>
          </div>
        </div>
        
        <div v-else class="chat-content">
          <!-- MOTD Banner (if enabled) -->
          <div 
            v-if="motd && motd.enabled && motd.display.showInChat && !motdDismissed" 
            class="motd-banner"
            :style="{
              backgroundColor: motd.style.backgroundColor,
              borderColor: motd.style.borderColor,
              color: motd.style.textColor,
              border: '1px solid ' + motd.style.borderColor
            }"
          >
            <div class="motd-inner">
              <div v-if="motd.style.iconClass" class="motd-icon">
                <i :class="['fas', `fa-${motd.style.iconClass}`]"></i>
              </div>
              <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
              <button 
                v-if="motd.display.dismissible" 
                @click="dismissMotd" 
                class="dismiss-btn"
                :style="{ color: motd.style.textColor }"
                title="Nachricht ausblenden"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- Messages list with scroll container -->
          <div class="messages-container" ref="messagesContainer">
            <MessageList 
              :messages="currentMessages" 
              :session-id="currentSessionId"
              :loading="loading"
              :is-streaming="isStreaming"
              @show-sources="handleShowSources"
              @show-explanation="handleShowExplanation"
            />
          </div>
          
          <!-- Chat input area -->
          <div class="input-container">
            <ChatInput 
              :disabled="!currentSessionId || isProcessing"
              :is-loading="isProcessing"
              @question-sent="handleQuestionSent"
            />
          </div>
        </div>
      </main>
    </div>
    
    <!-- Source Dialog -->
    <SourceDialog
      :show="showSourceDialog"
      :title="sourceDialogTitle"
      :sources="sourcesList"
      :source="selectedSource"
      :explanation="currentExplanation"
      :loading="sourceDialogLoading"
      @close="closeSourceDialog"
      @back="backToSourcesList"
      @select-source="selectSource"
    />
    
    <!-- Feedback Dialog -->
    <div v-if="showFeedbackDialog" class="feedback-dialog-overlay" @click="closeFeedbackDialog">
      <div class="feedback-dialog" @click.stop>
        <div class="dialog-header">
          <h3>Feedback geben</h3>
          <button class="close-button" @click="closeFeedbackDialog">×</button>
        </div>
        
        <div class="dialog-content">
          <p class="feedback-prompt">Bitte teilen Sie uns mit, warum diese Antwort nicht hilfreich war:</p>
          
          <textarea 
            v-model="feedbackComment" 
            class="feedback-textarea"
            placeholder="Ihr Feedback zur Antwort..."
            rows="4"
          ></textarea>
        </div>
        
        <div class="dialog-footer">
          <button 
            @click="submitFeedbackWithComment" 
            class="submit-button"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">
              <i class="fas fa-spinner fa-spin mr-2"></i>
              Wird gesendet...
            </span>
            <span v-else>Feedback senden</span>
          </button>
          <button @click="closeFeedbackDialog" class="cancel-button">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeMount } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useMotdStore } from '@/stores/motdStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Components
import SessionList from '@/components/chat/SessionList.vue';
import MessageList from '@/components/chat/MessageList.vue';
import ChatInput from '@/components/chat/ChatInput.vue';
import SourceDialog from '@/components/chat/SourceDialog.vue';

// Stores
const chatStore = useChatStore();
const sessionStore = useSessionStore();
const motdStore = useMotdStore();

// Refs
const messagesContainer = ref(null);
const feedbackComment = ref('');

// Computed properties
const currentSessionId = computed(() => sessionStore.currentSessionId);
const currentSession = computed(() => sessionStore.currentSession);
const currentMessages = computed(() => currentSession.value?.messages || []);
const isProcessing = computed(() => chatStore.isProcessing);
const isStreaming = computed(() => chatStore.streaming);
const loading = computed(() => sessionStore.loading || chatStore.loading);
const showFeedbackDialog = computed(() => chatStore.showFeedbackDialog);
const currentFeedback = computed(() => chatStore.currentFeedback);

// Source Dialog state
const showSourceDialog = ref(false);
const sourceDialogTitle = ref('Quelleninformationen');
const sourcesList = ref([]);
const selectedSource = ref(null);
const currentExplanation = ref(null);
const sourceDialogLoading = ref(false);

// MOTD state
const motd = computed(() => motdStore.motd);
const motdDismissed = computed(() => motdStore.dismissed);

// Methods
const handleSessionSelected = (sessionId) => {
  scrollToBottom();
};

const handleSessionCreated = (sessionId) => {
  scrollToBottom();
};

const handleSessionDeleted = (sessionId) => {
  // Handle when current session is deleted
  if (sessionId === currentSessionId.value) {
    // If there are other sessions, the store will automatically select the first one
    // We just need to make sure the UI updates
    nextTick(() => {
      scrollToBottom();
    });
  }
};

const createNewSession = async () => {
  const sessionId = await sessionStore.createSession();
  if (sessionId) {
    scrollToBottom();
  }
};

const handleQuestionSent = (question) => {
  // Auto-scroll to bottom after sending a question
  nextTick(() => {
    scrollToBottom();
  });
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Source Dialog methods
const handleShowSources = (message) => {
  sourceDialogLoading.value = true;
  sourceDialogTitle.value = 'Quellenreferenzen';
  showSourceDialog.value = true;
  selectedSource.value = null;
  currentExplanation.value = null;
  
  // Extract sources from the message
  if (message.sources && message.sources.length > 0) {
    sourcesList.value = message.sources;
  } else {
    sourcesList.value = [];
  }
  
  sourceDialogLoading.value = false;
};

const handleShowExplanation = async (message) => {
  if (!message || !message.id) return;
  
  sourceDialogLoading.value = true;
  sourceDialogTitle.value = 'Antwort-Erklärung';
  showSourceDialog.value = true;
  selectedSource.value = null;
  sourcesList.value = [];
  
  try {
    await chatStore.loadExplanation(message.id);
    currentExplanation.value = chatStore.currentExplanation;
  } catch (error) {
    console.error('Fehler beim Laden der Erklärung:', error);
    currentExplanation.value = null;
  } finally {
    sourceDialogLoading.value = false;
  }
};

const selectSource = (source) => {
  selectedSource.value = source;
  sourcesList.value = [];
  sourceDialogTitle.value = 'Quellendetails';
};

const backToSourcesList = () => {
  selectedSource.value = null;
  currentExplanation.value = null;
  sourceDialogTitle.value = 'Quellenreferenzen';
};

const closeSourceDialog = () => {
  showSourceDialog.value = false;
  selectedSource.value = null;
  sourcesList.value = [];
  currentExplanation.value = null;
};

// Feedback dialog methods
const submitFeedbackWithComment = async () => {
  if (!currentFeedback.value.messageId || !feedbackComment.value.trim()) return;
  
  await chatStore.sendFeedback(
    currentFeedback.value.messageId,
    currentSessionId.value,
    false,
    feedbackComment.value
  );
  
  feedbackComment.value = '';
  closeFeedbackDialog();
};

const closeFeedbackDialog = () => {
  chatStore.showFeedbackDialog = false;
  feedbackComment.value = '';
};

// MOTD methods
const dismissMotd = () => {
  motdStore.setDismissed(true);
};

const formatMotdContent = (content) => {
  if (!content) return '';
  try {
    // Markdown in HTML konvertieren
    const rawHtml = marked.parse(content);
    
    // HTML bereinigen (XSS-Schutz)
    return DOMPurify.sanitize(rawHtml);
  } catch (error) {
    console.error('Fehler beim Rendern des Markdown-Inhalts:', error);
    return `<p>Fehler beim Rendern des Inhalts</p>`;
  }
};

// Stream updates watcher for auto-scroll
watch(() => chatStore.currentAnswer, () => {
  // Only auto-scroll if we're streaming an answer
  if (chatStore.streaming) {
    scrollToBottom();
  }
});

// When messages update, auto-scroll to bottom
watch(() => currentMessages.value.length, () => {
  scrollToBottom();
});

// Lifecycle hooks
onMounted(async () => {
  // Load user settings from localStorage
  chatStore.loadSettings();
  
  // Fetch sessions if not already loaded
  if (sessionStore.sessions.length === 0) {
    await sessionStore.fetchSessions();
  }
  
  // Start polling for session updates
  sessionStore.startSessionPolling();
  
  // Load MOTD if available
  await motdStore.loadMotd();
  
  // Initialize scroll position
  scrollToBottom();
});
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  display: flex;
  height: 100%;
  background-color: #f8fafc;
}

.sessions-sidebar {
  width: 280px;
  background-color: white;
  border-right: 1px solid #e2e8f0;
  flex-shrink: 0;
  overflow-y: auto;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 0.5rem;
  overflow: hidden;
}

.chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.no-session {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8fafc;
}

.motd-banner-startup {
  margin: 2rem 2rem 0 2rem;
  max-width: 900px;
  align-self: center;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.new-session-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.new-session-btn:hover {
  background-color: #2563eb;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  background-color: #f8fafc;
}

.input-container {
  margin-top: auto;
}

.motd-banner {
  position: relative;
  padding: 1rem;
  margin: 1rem;
  border-radius: 0.5rem;
  background-color: #eff6ff;
  border: 1px solid #3b82f6;
  color: #1e3a8a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.motd-inner {
  display: flex;
  align-items: flex-start;
}

.motd-icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  font-size: 1.25rem;
  height: 1.5rem;
  display: flex;
  align-items: flex-start;
}

.motd-content {
  flex-grow: 1;
  font-size: 0.95rem;
  padding-right: 1.5rem;
}

.motd-content :deep(p) {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.motd-content :deep(p:last-child) {
  margin-bottom: 0;
}

.motd-content :deep(ul), .motd-content :deep(ol) {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
}

.motd-content :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.dismiss-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 0;
  font-size: 0.9rem;
  opacity: 0.7;
}

.dismiss-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

/* Feedback dialog styles */
.feedback-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.feedback-dialog {
  background-color: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dialog-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.dialog-content {
  padding: 1.5rem;
}

.feedback-prompt {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #475569;
}

.feedback-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.submit-button, .cancel-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.submit-button {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.submit-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.submit-button:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.cancel-button {
  background-color: #f1f5f9;
  color: #475569;
  border: none;
}

.cancel-button:hover {
  background-color: #e2e8f0;
  color: #334155;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sessions-sidebar {
    width: 240px;
  }
}

@media (max-width: 640px) {
  .chat-container {
    flex-direction: column;
  }
  
  .sessions-sidebar {
    width: 100%;
    height: auto;
    max-height: 30vh;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>