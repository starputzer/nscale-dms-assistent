<template>
  <div class="mobile-chat-view" :class="{ 'mobile-chat-view--dark': isDarkMode }">
    <!-- Mobile Header mit Sessionwechsel und Menü -->
    <div class="mobile-chat-view__header">
      <button 
        class="mobile-chat-view__menu-btn"
        @click="toggleSessionSidebar"
        aria-label="Sessions anzeigen"
      >
        <div class="mobile-chat-view__hamburger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
      
      <div class="mobile-chat-view__title">
        {{ currentSession?.title || 'Neue Unterhaltung' }}
      </div>
      
      <button 
        class="mobile-chat-view__action-btn"
        @click="openSettings"
        aria-label="Einstellungen"
      >
        <div class="mobile-chat-view__settings-icon">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path>
          </svg>
        </div>
      </button>
    </div>
    
    <!-- Mobile Session Sidebar (Off-Canvas) -->
    <div 
      class="mobile-chat-view__session-sidebar"
      :class="{ 'mobile-chat-view__session-sidebar--visible': showSessionSidebar }"
    >
      <div class="mobile-chat-view__sidebar-header">
        <h2 class="mobile-chat-view__sidebar-title">Unterhaltungen</h2>
        <button 
          class="mobile-chat-view__close-btn"
          @click="toggleSessionSidebar"
          aria-label="Schließen"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"></path>
          </svg>
        </button>
      </div>
      
      <div class="mobile-chat-view__sidebar-content">
        <button 
          class="mobile-chat-view__new-session-btn"
          @click="createNewSession"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"></path>
          </svg>
          <span>Neue Unterhaltung</span>
        </button>
        
        <div class="mobile-chat-view__session-list">
          <div 
            v-for="session in sessions" 
            :key="session.id"
            class="mobile-chat-view__session-item"
            :class="{ 'mobile-chat-view__session-item--active': currentSessionId === session.id }"
            v-touch="{
              tap: () => selectSession(session.id),
              left: () => showActionsForSession(session.id),
              longPress: () => showActionsForSession(session.id)
            }"
          >
            <div class="mobile-chat-view__session-info">
              <div class="mobile-chat-view__session-title">{{ session.title }}</div>
              <div class="mobile-chat-view__session-date">{{ formatDate(session.lastUpdated) }}</div>
            </div>
            
            <div 
              v-if="sessionWithActions === session.id"
              class="mobile-chat-view__session-actions"
            >
              <button 
                class="mobile-chat-view__session-action mobile-chat-view__session-action--rename"
                @click="renameSession(session.id)"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"></path>
                </svg>
              </button>
              
              <button 
                class="mobile-chat-view__session-action mobile-chat-view__session-action--delete"
                @click="deleteSession(session.id)"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"></path>
                </svg>
              </button>
              
              <button 
                class="mobile-chat-view__session-action mobile-chat-view__session-action--close"
                @click="sessionWithActions = null"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Backdrop for mobile sidebar -->
    <div 
      v-if="showSessionSidebar" 
      class="mobile-chat-view__backdrop"
      @click="toggleSessionSidebar"
    ></div>
    
    <!-- Chat Messages Area -->
    <div 
      class="mobile-chat-view__messages"
      ref="messagesContainer"
      @scroll="handleScroll"
    >
      <div v-if="!hasMessages" class="mobile-chat-view__empty-state">
        <div class="mobile-chat-view__empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18"></path>
          </svg>
        </div>
        <h3 class="mobile-chat-view__empty-title">Starten Sie eine neue Unterhaltung</h3>
        <p class="mobile-chat-view__empty-text">Stellen Sie eine Frage, um zu beginnen.</p>
      </div>
      
      <virtual-message-list
        v-else
        :messages="currentMessages"
        :session-id="currentSessionId"
        :estimated-item-size="65"
        :buffer-size="5"
        @load-more="loadMoreMessages"
      />
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="mobile-chat-view__loading">
      <div class="mobile-chat-view__loading-spinner"></div>
    </div>
    
    <!-- Chat Input Area -->
    <div class="mobile-chat-view__input-area">
      <div v-if="isStreaming" class="mobile-chat-view__streaming-indicator">
        <span class="mobile-chat-view__streaming-dot"></span>
        <span class="mobile-chat-view__streaming-dot"></span>
        <span class="mobile-chat-view__streaming-dot"></span>
      </div>
      
      <div class="mobile-chat-view__input-container">
        <textarea
          ref="messageInput"
          v-model="messageText"
          class="mobile-chat-view__input"
          placeholder="Nachricht eingeben..."
          :disabled="isStreaming"
          @keydown.enter.prevent="sendMessage"
          @input="adjustTextareaHeight"
        ></textarea>
        
        <button 
          class="mobile-chat-view__send-btn"
          :disabled="!canSendMessage"
          @click="sendMessage"
          aria-label="Senden"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChat } from '@/composables/useChat';
import { useTheme } from '@/composables/useTheme';
import { useDialog } from '@/composables/useDialog';
import { vTouch } from '@/directives/touch-directives';
import VirtualMessageList from '@/components/chat/enhanced/VirtualMessageList.vue';

// Composables
const { 
  sessions, 
  currentSessionId, 
  currentSession, 
  messages: allMessages, 
  isStreaming, 
  sendMessageToSession, 
  createSession,
  switchSession,
  renameSessionById,
  deleteSessionById,
  loadMoreMessagesForSession
} = useChat();

const { isDarkMode, toggleTheme } = useTheme();
const dialog = useDialog();

// Local State
const messageText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLTextAreaElement | null>(null);
const showSessionSidebar = ref(false);
const sessionWithActions = ref<string | null>(null);
const isLoading = ref(false);

// Computed Properties
const currentMessages = computed(() => {
  return currentSessionId.value ? allMessages.value[currentSessionId.value] || [] : [];
});

const hasMessages = computed(() => {
  return currentMessages.value.length > 0;
});

const canSendMessage = computed(() => {
  return messageText.value.trim().length > 0 && !isStreaming.value;
});

// Methods
const toggleSessionSidebar = () => {
  showSessionSidebar.value = !showSessionSidebar.value;
  sessionWithActions.value = null;
};

const createNewSession = async () => {
  try {
    isLoading.value = true;
    const sessionId = await createSession();
    showSessionSidebar.value = false;
    messageInput.value?.focus();
  } catch (error) {
    console.error('Failed to create session:', error);
    dialog.showError('Fehler beim Erstellen der Unterhaltung');
  } finally {
    isLoading.value = false;
  }
};

const selectSession = async (sessionId: string) => {
  try {
    isLoading.value = true;
    await switchSession(sessionId);
    showSessionSidebar.value = false;
    sessionWithActions.value = null;
  } catch (error) {
    console.error('Failed to switch session:', error);
    dialog.showError('Fehler beim Wechseln der Unterhaltung');
  } finally {
    isLoading.value = false;
  }
};

const showActionsForSession = (sessionId: string) => {
  if (sessionWithActions.value === sessionId) {
    sessionWithActions.value = null;
  } else {
    sessionWithActions.value = sessionId;
  }
};

const renameSession = async (sessionId: string) => {
  try {
    const session = sessions.value.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    const result = await dialog.showPrompt({
      title: 'Unterhaltung umbenennen',
      message: 'Geben Sie einen neuen Namen für die Unterhaltung ein:',
      value: session.title,
      placeholder: 'Unterhaltungsname',
      confirmButtonText: 'Umbenennen',
      cancelButtonText: 'Abbrechen'
    });
    
    if (result) {
      await renameSessionById(sessionId, result);
      sessionWithActions.value = null;
    }
  } catch (error) {
    console.error('Failed to rename session:', error);
    dialog.showError('Fehler beim Umbenennen der Unterhaltung');
  }
};

const deleteSession = async (sessionId: string) => {
  try {
    const confirmed = await dialog.showConfirm({
      title: 'Unterhaltung löschen',
      message: 'Möchten Sie diese Unterhaltung wirklich löschen?',
      confirmButtonText: 'Löschen',
      cancelButtonText: 'Abbrechen',
      type: 'warning'
    });
    
    if (confirmed) {
      await deleteSessionById(sessionId);
      sessionWithActions.value = null;
    }
  } catch (error) {
    console.error('Failed to delete session:', error);
    dialog.showError('Fehler beim Löschen der Unterhaltung');
  }
};

const sendMessage = async () => {
  if (!canSendMessage.value) return;
  
  const message = messageText.value.trim();
  messageText.value = '';
  
  // Reset textarea height
  if (messageInput.value) {
    messageInput.value.style.height = 'auto';
  }
  
  try {
    if (!currentSessionId.value) {
      await createNewSession();
    }
    
    await sendMessageToSession(currentSessionId.value as string, message);
    
    // Scroll to bottom after sending message
    scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
    dialog.showError('Fehler beim Senden der Nachricht');
  }
};

const adjustTextareaHeight = () => {
  if (!messageInput.value) return;
  
  messageInput.value.style.height = 'auto';
  messageInput.value.style.height = `${Math.min(120, messageInput.value.scrollHeight)}px`;
};

const scrollToBottom = () => {
  if (!messagesContainer.value) return;
  
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const handleScroll = () => {
  if (!messagesContainer.value) return;
  
  const { scrollTop } = messagesContainer.value;
  
  // Load more messages when scrolled to top
  if (scrollTop === 0) {
    loadMoreMessages();
  }
};

const loadMoreMessages = async () => {
  if (!currentSessionId.value || isLoading.value) return;
  
  try {
    isLoading.value = true;
    await loadMoreMessagesForSession(currentSessionId.value);
  } catch (error) {
    console.error('Failed to load more messages:', error);
  } finally {
    isLoading.value = false;
  }
};

const openSettings = () => {
  dialog.showDialog({
    title: 'Einstellungen',
    content: 'Einstellungen-Dialog (Demo)',
    showCancel: false
  });
};

const formatDate = (timestamp: number | string | Date): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Lifecycle Hooks
onMounted(() => {
  if (messageInput.value) {
    messageInput.value.focus();
  }
});

// Watch for message changes to scroll to bottom
watch(
  () => currentMessages.value.length,
  (newLength, oldLength) => {
    if (newLength > oldLength) {
      scrollToBottom();
    }
  }
);
</script>

<style lang="scss" scoped>
.mobile-chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--nscale-background);
  color: var(--nscale-foreground);
  font-family: var(--nscale-font-family-base);
  
  /* Header */
  &__header {
    display: flex;
    align-items: center;
    padding: var(--nscale-space-2);
    height: 56px;
    border-bottom: 1px solid var(--nscale-border);
    background-color: var(--nscale-background);
    z-index: 2;
  }
  
  &__menu-btn,
  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: none;
    background: transparent;
    color: var(--nscale-foreground);
    
    &:active {
      background-color: var(--nscale-muted-light);
    }
  }
  
  &__hamburger {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 20px;
    height: 14px;
    
    span {
      display: block;
      height: 2px;
      width: 100%;
      background-color: currentColor;
      border-radius: 2px;
    }
  }
  
  &__title {
    flex: 1;
    font-size: var(--nscale-font-size-base);
    font-weight: var(--nscale-font-weight-medium);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 var(--nscale-space-2);
  }
  
  /* Session Sidebar */
  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10;
  }
  
  &__session-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 85%;
    max-width: 320px;
    height: 100%;
    background-color: var(--nscale-background);
    z-index: 11;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: var(--nscale-shadow-lg);
    
    &--visible {
      transform: translateX(0);
    }
  }
  
  &__sidebar-header {
    display: flex;
    align-items: center;
    padding: var(--nscale-space-3);
    border-bottom: 1px solid var(--nscale-border);
  }
  
  &__sidebar-title {
    flex: 1;
    margin: 0;
    font-size: var(--nscale-font-size-lg);
    font-weight: var(--nscale-font-weight-medium);
  }
  
  &__close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 18px;
    border: none;
    background: transparent;
    color: var(--nscale-foreground);
    
    &:active {
      background-color: var(--nscale-muted-light);
    }
  }
  
  &__sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--nscale-space-2);
  }
  
  &__new-session-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--nscale-space-3);
    border-radius: var(--nscale-border-radius-md);
    border: 1px solid var(--nscale-border);
    background-color: var(--nscale-background);
    color: var(--nscale-primary);
    font-weight: var(--nscale-font-weight-medium);
    margin-bottom: var(--nscale-space-3);
    
    svg {
      margin-right: var(--nscale-space-2);
    }
    
    &:active {
      background-color: var(--nscale-muted-light);
    }
  }
  
  &__session-list {
    display: flex;
    flex-direction: column;
    gap: var(--nscale-space-2);
  }
  
  &__session-item {
    position: relative;
    display: flex;
    padding: var(--nscale-space-3);
    border-radius: var(--nscale-border-radius-md);
    background-color: var(--nscale-background);
    border: 1px solid var(--nscale-border);
    overflow: hidden;
    
    &--active {
      border-color: var(--nscale-primary);
      background-color: var(--nscale-primary-ultra-light);
    }
  }
  
  &__session-info {
    flex: 1;
    min-width: 0; /* Enable text truncation */
  }
  
  &__session-title {
    font-weight: var(--nscale-font-weight-medium);
    margin-bottom: var(--nscale-space-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &__session-date {
    font-size: var(--nscale-font-size-sm);
    color: var(--nscale-muted);
  }
  
  &__session-actions {
    display: flex;
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
  }
  
  &__session-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 100%;
    border: none;
    
    &--rename {
      background-color: var(--nscale-info);
      color: white;
    }
    
    &--delete {
      background-color: var(--nscale-error);
      color: white;
    }
    
    &--close {
      background-color: var(--nscale-muted);
      color: white;
    }
  }
  
  /* Messages Area */
  &__messages {
    flex: 1;
    padding: var(--nscale-space-2);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  }
  
  &__empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--nscale-space-6);
    text-align: center;
  }
  
  &__empty-icon {
    color: var(--nscale-muted);
    margin-bottom: var(--nscale-space-4);
  }
  
  &__empty-title {
    font-size: var(--nscale-font-size-xl);
    font-weight: var(--nscale-font-weight-medium);
    margin-bottom: var(--nscale-space-2);
    color: var(--nscale-foreground);
  }
  
  &__empty-text {
    font-size: var(--nscale-font-size-base);
    color: var(--nscale-muted);
    margin: 0;
  }
  
  /* Loading Indicator */
  &__loading {
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: var(--nscale-space-2);
    background-color: rgba(var(--nscale-background-rgb), 0.8);
    z-index: 1;
  }
  
  &__loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--nscale-muted-light);
    border-top-color: var(--nscale-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Input Area */
  &__input-area {
    padding: var(--nscale-space-2);
    border-top: 1px solid var(--nscale-border);
    background-color: var(--nscale-background);
  }
  
  &__streaming-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--nscale-space-1);
    margin-bottom: var(--nscale-space-2);
  }
  
  &__streaming-dot {
    width: 8px;
    height: 8px;
    background-color: var(--nscale-primary);
    border-radius: 50%;
    animation: pulse 1.5s infinite ease-in-out;
    
    &:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.6s;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  &__input-container {
    display: flex;
    background-color: var(--nscale-muted-light);
    border-radius: var(--nscale-border-radius-lg);
    padding: var(--nscale-space-1);
  }
  
  &__input {
    flex: 1;
    min-height: 44px;
    max-height: 120px;
    padding: var(--nscale-space-2) var(--nscale-space-3);
    border: none;
    background: transparent;
    font-family: var(--nscale-font-family-base);
    font-size: var(--nscale-font-size-base);
    color: var(--nscale-foreground);
    resize: none;
    
    &:focus {
      outline: none;
    }
    
    &::placeholder {
      color: var(--nscale-muted);
    }
    
    &:disabled {
      opacity: 0.7;
    }
  }
  
  &__send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 22px;
    border: none;
    background-color: var(--nscale-primary);
    color: white;
    align-self: flex-end;
    
    &:disabled {
      background-color: var(--nscale-muted);
      opacity: 0.7;
    }
    
    &:active:not(:disabled) {
      background-color: var(--nscale-primary-dark);
    }
  }
  
  /* Dark Mode */
  &--dark {
    background-color: var(--nscale-background);
    
    .mobile-chat-view__input-container {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

// Touch directive (needed for v-touch to work)
:deep(.v-touch-active) {
  opacity: 0.8;
  transition: opacity 0.2s;
}
</style>