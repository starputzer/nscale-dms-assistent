<template>
  <div class="n-chat-container" :class="{ 'n-chat-container--loading': isLoading }">
    <!-- Header für den Chat mit Sitzungsinformationen -->
    <div class="n-chat-container__header">
      <div class="n-chat-container__session-info">
        <h2 class="n-chat-container__title">{{ sessionTitle }}</h2>
        <span v-if="currentSession?.updatedAt" class="n-chat-container__timestamp">
          {{ formatTimestamp(currentSession.updatedAt) }}
        </span>
      </div>
      <div class="n-chat-container__actions">
        <button
          v-if="canRenameSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung umbenennen"
          aria-label="Sitzung umbenennen"
          @click="handleRenameSession"
        >
          <span class="n-chat-container__action-icon n-chat-container__action-icon--edit">✏️</span>
        </button>
        <button
          v-if="canExportSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung exportieren"
          aria-label="Sitzung als Textdatei exportieren"
          @click="handleExportSession"
        >
          <span class="n-chat-container__action-icon n-chat-container__action-icon--export">📤</span>
        </button>
        <button
          v-if="canClearSession"
          type="button"
          class="n-chat-container__action-btn"
          title="Sitzung leeren"
          aria-label="Sitzung leeren"
          @click="handleClearSession"
        >
          <span class="n-chat-container__action-icon n-chat-container__action-icon--clear">🗑️</span>
        </button>
      </div>
    </div>
    
    <!-- Container für die Nachrichtenliste -->
    <div class="n-chat-container__messages">
      <MessageList
        ref="messageListRef"
        :messages="messages"
        :is-loading="isLoading"
        :is-streaming="isStreaming"
        :welcome-title="welcomeTitle"
        :welcome-message="welcomeMessage"
        :logo-url="logoUrl"
        :virtualized="virtualizedList"
        :show-message-actions="showMessageActions"
        @feedback="handleFeedback"
        @view-sources="handleViewSources"
        @view-explanation="handleViewExplanation"
        @retry="handleRetry"
        @delete="handleDeleteMessage"
        @scroll="handleScroll"
        @load-more="handleLoadMore"
      />
    </div>
    
    <!-- Container für die Nachrichteneingabe -->
    <div class="n-chat-container__input">
      <MessageInput
        v-model="inputText"
        :disabled="inputDisabled"
        :is-loading="isSending"
        :is-streaming="isStreaming"
        :is-editing="isEditing"
        :error="inputError"
        :placeholder="inputPlaceholder"
        :draft="messageDraft"
        :show-templates="showMessageTemplates"
        :templates="messageTemplates"
        @submit="handleSendMessage"
        @draft-change="handleDraftChange"
        @stop-stream="handleStopGeneration"
        @cancel-edit="handleCancelEdit"
      />
    </div>
    
    <!-- Modaler Dialog für Quellen, falls geöffnet -->
    <div 
      v-if="showSourcesDialog" 
      class="n-chat-container__dialog-overlay"
      @click="closeSourcesDialog"
    >
      <div 
        class="n-chat-container__dialog"
        @click.stop
      >
        <div class="n-chat-container__dialog-header">
          <h3 class="n-chat-container__dialog-title">Quellenangaben</h3>
          <button
            type="button"
            class="n-chat-container__dialog-close"
            aria-label="Dialog schließen"
            @click="closeSourcesDialog"
          >
            <span class="n-chat-container__dialog-close-icon">×</span>
          </button>
        </div>
        <div class="n-chat-container__dialog-content">
          <ul v-if="selectedMessageSources.length" class="n-chat-container__sources-list">
            <li 
              v-for="source in selectedMessageSources" 
              :key="source.id"
              class="n-chat-container__source-item"
            >
              <div class="n-chat-container__source-header">
                <h4 class="n-chat-container__source-title">{{ source.title }}</h4>
                <span v-if="source.pageNumber" class="n-chat-container__source-page">
                  Seite {{ source.pageNumber }}
                </span>
              </div>
              <div class="n-chat-container__source-content">
                {{ source.content }}
              </div>
              <div class="n-chat-container__source-footer">
                <span class="n-chat-container__source-relevance">
                  Relevanz: {{ formatRelevance(source.relevanceScore || 0) }}
                </span>
              </div>
            </li>
          </ul>
          <p v-else class="n-chat-container__sources-empty">
            Keine Quellenangaben für diese Nachricht verfügbar.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useSessionsStore } from '@/stores/sessions';
import { useUIStore } from '@/stores/ui';
import { useChat } from '@/composables/useChat';
import type { ChatMessage, ChatSession, SourceReference } from '@/types/session';
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';

// Interface für vorgefertigte Nachrichtenvorlagen
interface MessageTemplate {
  label: string;
  content: string;
}

// Props Definition
interface Props {
  /**
   * ID der aktuellen Sitzung
   */
  sessionId?: string;
  
  /**
   * Ob die Nachrichtenliste virtualisiert werden soll
   */
  virtualizedList?: boolean;
  
  /**
   * Willkommenstitel für leere Chats
   */
  welcomeTitle?: string;
  
  /**
   * Willkommensnachricht für leere Chats
   */
  welcomeMessage?: string;
  
  /**
   * URL des Logos für den Willkommensbildschirm
   */
  logoUrl?: string;
  
  /**
   * Ob Aktionsschaltflächen für Nachrichten angezeigt werden sollen
   */
  showMessageActions?: boolean;
  
  /**
   * Ob Nachrichtenvorlagen angezeigt werden sollen
   */
  showMessageTemplates?: boolean;
  
  /**
   * Vorgefertigte Nachrichtenvorlagen
   */
  messageTemplates?: MessageTemplate[];
  
  /**
   * Platzhaltertext für die Eingabe
   */
  inputPlaceholder?: string;
  
  /**
   * Ob die Sitzung umbenannt werden kann
   */
  canRenameSession?: boolean;
  
  /**
   * Ob die Sitzung exportiert werden kann
   */
  canExportSession?: boolean;
  
  /**
   * Ob die Sitzung geleert werden kann
   */
  canClearSession?: boolean;
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  sessionId: '',
  virtualizedList: true,
  welcomeTitle: 'Willkommen beim nscale DMS Assistenten',
  welcomeMessage: 'Wie kann ich Ihnen heute mit nscale helfen?',
  showMessageActions: true,
  showMessageTemplates: false,
  messageTemplates: () => [],
  inputPlaceholder: 'Geben Sie Ihre Nachricht ein...',
  canRenameSession: true,
  canExportSession: true,
  canClearSession: true
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Event beim Senden einer Nachricht
   */
  (e: 'message-sent', payload: { content: string, sessionId: string }): void;
  
  /**
   * Event beim Empfangen einer Nachricht
   */
  (e: 'message-received', payload: { message: ChatMessage, sessionId: string }): void;
  
  /**
   * Event, wenn es einen Fehler gibt
   */
  (e: 'error', payload: { error: string, context?: string }): void;
  
  /**
   * Event, wenn die Sitzung umbenannt wurde
   */
  (e: 'session-renamed', payload: { sessionId: string, title: string }): void;
  
  /**
   * Event, wenn die Sitzung geleert wurde
   */
  (e: 'session-cleared', payload: { sessionId: string }): void;
  
  /**
   * Event, wenn mehr Nachrichten geladen wurden
   */
  (e: 'messages-loaded', payload: { count: number, direction: 'up' | 'down' }): void;
  
  /**
   * Event, wenn das Scrollen sich verändert hat
   */
  (e: 'scroll', payload: { isAtBottom: boolean, scrollTop: number }): void;
}>();

// Refs
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const inputText = ref('');
const messageDraft = ref('');
const inputError = ref('');
const isEditing = ref(false);
const editingMessageId = ref('');
const showSourcesDialog = ref(false);
const selectedMessageId = ref('');

// Stores und Composables
const uiStore = useUIStore();
const sessionsStore = useSessionsStore();
const { 
  messages,
  isLoading,
  isStreaming,
  error,
  currentSession,
  isSending,
  sendMessage,
  cancelStream,
  deleteMessage,
  refreshCurrentSession,
  loadOlderMessages,
  retryMessage
} = useChat();

// Computed Properties
const sessionTitle = computed(() => {
  return currentSession.value?.title || props.welcomeTitle;
});

const inputDisabled = computed(() => {
  return isLoading.value || !props.sessionId;
});

// Quellen für die ausgewählte Nachricht
const selectedMessageSources = computed(() => {
  if (!selectedMessageId.value) return [];
  
  const message = messages.value.find(m => m.id === selectedMessageId.value);
  return message?.metadata?.sourceReferences || [];
});

// Methods
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

function formatRelevance(score: number): string {
  if (score >= 0.8) return 'Sehr hoch';
  if (score >= 0.6) return 'Hoch';
  if (score >= 0.4) return 'Mittel';
  if (score >= 0.2) return 'Niedrig';
  return 'Sehr niedrig';
}

// Sendet eine Nachricht
async function handleSendMessage(content: string): Promise<void> {
  if (!content.trim() || !props.sessionId) return;
  
  try {
    // Wenn eine Nachricht bearbeitet wird
    if (isEditing.value && editingMessageId.value) {
      // TODO: Implementieren der Bearbeitungsfunktion
      isEditing.value = false;
      editingMessageId.value = '';
    } else {
      // Neue Nachricht senden
      await sendMessage(content);
      emit('message-sent', { content, sessionId: props.sessionId });
    }
    
    // Eingabe zurücksetzen
    inputText.value = '';
    messageDraft.value = '';
    inputError.value = '';
  } catch (err: any) {
    console.error('Error sending message:', err);
    inputError.value = err.message || 'Fehler beim Senden der Nachricht.';
    emit('error', { error: inputError.value, context: 'send-message' });
  }
}

// Stoppt die Generierung einer Antwort
function handleStopGeneration(): void {
  cancelStream();
}

// Behandelt Feedback zu einer Nachricht
function handleFeedback(payload: { messageId: string, type: 'positive' | 'negative', feedback?: string }): void {
  // TODO: Implementieren der Feedback-Funktion
  uiStore.showSuccess(`Vielen Dank für Ihr Feedback!`);
}

// Öffnet den Dialog mit Quellenangaben
function handleViewSources(payload: { messageId: string }): void {
  selectedMessageId.value = payload.messageId;
  showSourcesDialog.value = true;
}

// Öffnet einen Dialog mit Erklärungen
function handleViewExplanation(payload: { messageId: string }): void {
  // TODO: Implementieren der Erklärungs-Anzeige
  uiStore.showInfo(`Erklärung wird angezeigt für Nachricht ${payload.messageId}`);
}

// Löscht eine Nachricht
async function handleDeleteMessage(payload: { messageId: string }): Promise<void> {
  try {
    await deleteMessage(payload.messageId);
    uiStore.showSuccess('Nachricht wurde gelöscht.');
  } catch (err: any) {
    console.error('Error deleting message:', err);
    uiStore.showError('Fehler beim Löschen der Nachricht.');
    emit('error', { error: err.message, context: 'delete-message' });
  }
}

// Sendet eine Nachricht erneut
async function handleRetry(payload: { messageId: string }): Promise<void> {
  try {
    await retryMessage(payload.messageId);
  } catch (err: any) {
    console.error('Error retrying message:', err);
    uiStore.showError('Fehler beim erneuten Senden der Nachricht.');
    emit('error', { error: err.message, context: 'retry-message' });
  }
}

// Behandelt Scroll-Events in der Nachrichtenliste
function handleScroll(payload: { scrollTop: number, scrollHeight: number, clientHeight: number, isAtBottom: boolean }): void {
  emit('scroll', { isAtBottom: payload.isAtBottom, scrollTop: payload.scrollTop });
}

// Lädt weitere Nachrichten
function handleLoadMore(payload: { direction: 'up' | 'down', firstVisibleIndex?: number, lastVisibleIndex?: number }): void {
  // In einer echten Implementierung würden ältere Nachrichten geladen werden
  if (payload.direction === 'up') {
    const olderMessages = loadOlderMessages(props.sessionId);
    emit('messages-loaded', { count: olderMessages.length, direction: 'up' });
  }
}

// Speichert den Entwurf einer Nachricht
function handleDraftChange(value: string): void {
  messageDraft.value = value;
}

// Abbrechen der Bearbeitung
function handleCancelEdit(): void {
  isEditing.value = false;
  editingMessageId.value = '';
  inputText.value = '';
  messageDraft.value = '';
}

// Schließt den Quellen-Dialog
function closeSourcesDialog(): void {
  showSourcesDialog.value = false;
  selectedMessageId.value = '';
}

// Umbenennen der Sitzung
function handleRenameSession(): void {
  if (!props.sessionId) return;
  
  const newTitle = prompt('Neuer Titel für die Sitzung:', sessionTitle.value);
  
  if (newTitle && newTitle.trim() !== '') {
    try {
      sessionsStore.updateSessionTitle(props.sessionId, newTitle);
      emit('session-renamed', { sessionId: props.sessionId, title: newTitle });
      uiStore.showSuccess('Sitzung wurde umbenannt.');
    } catch (err: any) {
      console.error('Error renaming session:', err);
      uiStore.showError('Fehler beim Umbenennen der Sitzung.');
      emit('error', { error: err.message, context: 'rename-session' });
    }
  }
}

// Exportieren der Sitzung
function handleExportSession(): void {
  if (!props.sessionId || !messages.value.length) return;
  
  try {
    // Formatiere die Nachrichten als Text
    const formattedMessages = messages.value.map(msg => {
      return `${msg.role === 'user' ? 'Sie' : 'Assistent'} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}\n\n`;
    }).join('---\n\n');
    
    // Erstelle einen Blob mit dem Text
    const blob = new Blob([formattedMessages], { type: 'text/plain;charset=utf-8' });
    
    // Erstelle einen Download-Link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `nscale-chat-${props.sessionId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    uiStore.showSuccess('Sitzung wurde exportiert.');
  } catch (err: any) {
    console.error('Error exporting session:', err);
    uiStore.showError('Fehler beim Exportieren der Sitzung.');
    emit('error', { error: err.message, context: 'export-session' });
  }
}

// Löschen aller Nachrichten in der Sitzung
function handleClearSession(): void {
  if (!props.sessionId) return;
  
  if (confirm('Möchten Sie wirklich alle Nachrichten in dieser Sitzung löschen?')) {
    try {
      // In einer echten Implementierung würden alle Nachrichten gelöscht werden
      // sessionsStore.clearSessionMessages(props.sessionId);
      emit('session-cleared', { sessionId: props.sessionId });
      uiStore.showSuccess('Alle Nachrichten wurden gelöscht.');
    } catch (err: any) {
      console.error('Error clearing session:', err);
      uiStore.showError('Fehler beim Löschen der Nachrichten.');
      emit('error', { error: err.message, context: 'clear-session' });
    }
  }
}

// Scrollt zum Ende der Nachrichtenliste
function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
  nextTick(() => {
    messageListRef.value?.scrollToBottom(behavior);
  });
}

// Öffentliche Methoden
defineExpose({
  scrollToBottom,
  handleSendMessage,
  handleStopGeneration
});

// Lifecycle Hooks
onMounted(() => {
  // Sitzung laden, wenn eine ID vorhanden ist
  if (props.sessionId) {
    try {
      refreshCurrentSession();
    } catch (err: any) {
      console.error('Error loading session:', err);
      emit('error', { error: err.message, context: 'load-session' });
    }
  }
});

// Watches
watch(() => props.sessionId, (newSessionId) => {
  if (newSessionId) {
    try {
      refreshCurrentSession();
    } catch (err: any) {
      console.error('Error loading session:', err);
      emit('error', { error: err.message, context: 'load-session' });
    }
  }
});

// Überwacht Fehler im Store
watch(() => error.value, (newError) => {
  if (newError) {
    inputError.value = newError;
    emit('error', { error: newError, context: 'store-error' });
  } else {
    inputError.value = '';
  }
});

// Überwacht eingehende Nachrichten
watch(() => messages.value, (newMessages, oldMessages) => {
  if (props.sessionId && newMessages.length > oldMessages.length) {
    // Eine neue Nachricht wurde empfangen
    const newMessage = newMessages[newMessages.length - 1];
    if (newMessage.role === 'assistant') {
      emit('message-received', { message: newMessage, sessionId: props.sessionId });
    }
  }
});
</script>

<style scoped>
/* Chat-Container Hauptstil */
.n-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--nscale-body-bg, #ffffff);
  overflow: hidden;
}

/* Header-Bereich */
.n-chat-container__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color, #f8fafc);
}

.n-chat-container__session-info {
  display: flex;
  flex-direction: column;
}

.n-chat-container__title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  margin: 0;
  color: var(--nscale-text, #1a202c);
}

.n-chat-container__timestamp {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-chat-container__actions {
  display: flex;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-chat-container__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-chat-container__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--nscale-border-color-dark, #cbd5e1);
}

.n-chat-container__action-icon {
  font-size: 16px;
}

/* Messages-Bereich */
.n-chat-container__messages {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Input-Bereich */
.n-chat-container__input {
  padding: var(--nscale-space-4, 1rem);
  border-top: 1px solid var(--nscale-border-color, #e2e8f0);
  background-color: var(--nscale-surface-color, #f8fafc);
}

/* Dialog für Quellen */
.n-chat-container__dialog-overlay {
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

.n-chat-container__dialog {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  background-color: var(--nscale-body-bg, #ffffff);
  border-radius: var(--nscale-border-radius-lg, 0.75rem);
  box-shadow: var(--nscale-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.n-chat-container__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-chat-container__dialog-title {
  margin: 0;
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text, #1a202c);
}

.n-chat-container__dialog-close {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
}

.n-chat-container__dialog-close:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-chat-container__dialog-close-icon {
  font-size: 24px;
  line-height: 1;
}

.n-chat-container__dialog-content {
  padding: var(--nscale-space-4, 1rem);
  overflow-y: auto;
}

.n-chat-container__sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-4, 1rem);
}

.n-chat-container__source-item {
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem);
}

.n-chat-container__source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nscale-space-2, 0.5rem);
}

.n-chat-container__source-title {
  margin: 0;
  font-size: var(--nscale-font-size-md, 1rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text, #1a202c);
}

.n-chat-container__source-page {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-chat-container__source-content {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  line-height: var(--nscale-line-height-normal, 1.5);
  margin-bottom: var(--nscale-space-3, 0.75rem);
  color: var(--nscale-text, #1a202c);
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--nscale-body-bg, #ffffff);
  padding: var(--nscale-space-2, 0.5rem);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
}

.n-chat-container__source-footer {
  display: flex;
  justify-content: flex-end;
}

.n-chat-container__source-relevance {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-chat-container__sources-empty {
  text-align: center;
  padding: var(--nscale-space-6, 1.5rem);
  color: var(--nscale-text-secondary, #64748b);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-chat-container__header,
  .n-chat-container__input {
    padding: var(--nscale-space-3, 0.75rem);
  }
  
  .n-chat-container__title {
    font-size: var(--nscale-font-size-base, 1rem);
  }
  
  .n-chat-container__action-btn {
    width: 28px;
    height: 28px;
  }
}

/* Dunkles Theme Unterstützung */
@media (prefers-color-scheme: dark) {
  .n-chat-container {
    background-color: var(--nscale-dark-body-bg, #121212);
  }
  
  .n-chat-container__header {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-container__title {
    color: var(--nscale-dark-text, #e2e8f0);
  }
  
  .n-chat-container__input {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-container__action-btn {
    border-color: var(--nscale-dark-border-color, #444);
  }
  
  .n-chat-container__dialog {
    background-color: var(--nscale-dark-body-bg, #121212);
  }
  
  .n-chat-container__dialog-header {
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-container__dialog-title {
    color: var(--nscale-dark-text, #e2e8f0);
  }
  
  .n-chat-container__source-item {
    background-color: var(--nscale-dark-surface-color, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-container__source-title {
    color: var(--nscale-dark-text, #e2e8f0);
  }
  
  .n-chat-container__source-content {
    color: var(--nscale-dark-text, #e2e8f0);
    background-color: var(--nscale-dark-body-bg, #121212);
  }
}
</style>