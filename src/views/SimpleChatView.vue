<template>
  <div class="chat-view">
    <!-- Chat Header -->
    <div class="chat-header">
      <h2 class="chat-title">
        {{ currentSession?.title || "Neue Unterhaltung" }}
      </h2>
    </div>

    <!-- Message Area -->
    <div class="message-area" ref="messageArea">
      <!-- MOTD - shown when no messages and MOTD is enabled -->
      <div v-if="!messages.length && !isLoading && motdStore.shouldShowInChat && !motdStore.dismissed" class="motd-container">
        <div 
          class="motd-display"
          :style="{
            backgroundColor: motdStore.config.style?.backgroundColor || '#fff3cd',
            borderColor: motdStore.config.style?.borderColor || '#ffeeba',
            color: motdStore.config.style?.textColor || '#856404',
            border: '1px solid',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            maxWidth: '600px',
            margin: '0 auto 24px'
          }"
        >
          <div v-html="motdStore.previewHtml" class="motd-content"></div>
          <button 
            v-if="motdStore.config.display?.dismissible"
            @click="motdStore.dismiss()"
            class="motd-dismiss-btn"
            style="margin-top: 12px; padding: 6px 16px; background: transparent; border: 1px solid currentColor; border-radius: 4px; cursor: pointer; font-size: 14px;"
          >
            Ausblenden
          </button>
        </div>
      </div>
      
      <!-- Welcome Message - shown when no messages -->
      <div v-if="!messages.length && !isLoading" class="welcome-message">
        <div class="welcome-logo">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <line
              x1="8"
              y1="8"
              x2="16"
              y2="8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="8"
              y1="12"
              x2="16"
              y2="12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="8"
              y1="16"
              x2="11"
              y2="16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h3>Willkommen beim Digitalen Akte Assistenten</h3>
        <p>Wie kann ich Ihnen heute helfen?</p>
      </div>

      <!-- Messages -->
      <div v-else class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{
            'message-user': message.role === 'user',
            'message-assistant': message.role !== 'user',
          }"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'user'">{{ userInitials }}</span>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" stroke-linecap="round" />
              <line x1="8" y1="12" x2="16" y2="12" stroke-linecap="round" />
              <line x1="8" y1="16" x2="11" y2="16" stroke-linecap="round" />
            </svg>
          </div>

          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">{{
                message.role === "user" ? "Sie" : "Assistent"
              }}</span>
              <span class="message-time">{{
                formatTime(message.timestamp)
              }}</span>
            </div>
            <div class="message-text">
              <template v-if="message.isStreaming">
                <span style="white-space: pre-wrap">{{ message.content }}</span>
                <span class="streaming-cursor">▊</span>
              </template>
              <div v-else v-html="formatMessage(message.content)"></div>
            </div>

            <!-- Message Actions for Assistant Messages -->
            <div v-if="message.role !== 'user'" class="message-actions">
              <button
                class="action-btn"
                @click="handleFeedback(message, 'positive', $event)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                  ></path>
                </svg>
              </button>
              <button
                class="action-btn"
                @click="handleFeedback(message, 'negative', $event)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
                  ></path>
                </svg>
              </button>
              <button class="action-btn" @click="handleViewSources(message)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  ></path>
                </svg>
                <span>Quellen</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Streaming Indicator -->
        <div
          v-if="isStreaming && !hasStreamingMessage"
          class="loading-indicator"
        >
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <form @submit.prevent="sendMessage" class="message-form">
        <input
          v-model="messageInput"
          type="text"
          class="message-input"
          placeholder="Nachricht eingeben..."
          :disabled="isLoading"
        />
        <button
          type="submit"
          class="send-button"
          :disabled="!messageInput.trim() || isLoading"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSessionsStore } from "@/stores/sessions";
import { useMotdStore } from "@/stores/admin/motd";
import { renderMarkdown } from "@/utils/markdownRenderer";
import axios from "axios";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const sessionsStore = useSessionsStore();
const motdStore = useMotdStore();

// State
const messageInput = ref("");
const isLoading = ref(false);
const messageArea = ref<HTMLElement>();

// Computed
const currentSessionId = computed(
  () => (route.params.id as string) || sessionsStore.currentSessionId,
);
const currentSession = computed(() => sessionsStore.currentSession);
const messages = computed(() => sessionsStore.currentMessages);
const isStreaming = computed(() => sessionsStore.isStreaming);
const hasStreamingMessage = computed(() =>
  messages.value.some((msg) => msg.isStreaming),
);
const userInitials = computed(() => {
  const name =
    authStore.user?.displayName ||
    authStore.user?.username ||
    authStore.user?.email?.split("@")[0] ||
    "Benutzer";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

// Methods
const loadMessages = async () => {
  if (!currentSessionId.value) return;

  isLoading.value = true;
  try {
    await sessionsStore.fetchMessages(currentSessionId.value);
  } catch (error) {
    console.error("Failed to load messages:", error);
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
};

const sendMessage = async () => {
  const text = messageInput.value.trim();
  if (!text || isLoading.value) return;

  let sessionId = currentSessionId.value;

  // Create a new session if none exists
  if (!sessionId) {
    try {
      sessionId = await sessionsStore.createSession();
      // Navigate to the new session route
      if (sessionId && !route.params.id) {
        await router.push(`/chat/${sessionId}`);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      return;
    }
  }

  // Clear input immediately
  messageInput.value = "";
  isLoading.value = true;

  try {
    await sessionsStore.sendMessage({ sessionId, content: text });
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
};

const formatMessage = (text: string) => {
  if (!text) return "";
  // For now, use basic HTML formatting until async rendering is supported
  // TODO: Implement async message rendering with renderMarkdown
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const handleFeedback = async (
  message: any,
  type: "positive" | "negative",
  event?: Event,
) => {
  console.log("Feedback:", type, message);

  try {
    // Finde die vorherige Benutzer-Nachricht (die Frage)
    const messageIndex = messages.value.findIndex((m) => m.id === message.id);
    let question = "";

    if (messageIndex > 0) {
      // Suche die vorherige Benutzer-Nachricht
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages.value[i].role === "user") {
          question = messages.value[i].content;
          break;
        }
      }
    }

    // Sende Feedback an die API
    const response = await axios.post(
      "/api/v1/feedback",
      {
        message_id: message.id,
        session_id: currentSessionId.value,
        rating: type === "positive" ? 1 : -1,
        question: question,
        answer: message.content,
      },
      {
        headers: authStore.createAuthHeaders(),
      },
    );

    console.log("Feedback gespeichert:", response.data);

    // Zeige eine kurze Bestätigungsmeldung
    const feedbackButton = event?.currentTarget as HTMLButtonElement;
    if (feedbackButton) {
      const originalContent = feedbackButton.innerHTML;
      feedbackButton.innerHTML = "✓";
      feedbackButton.style.backgroundColor =
        type === "positive" ? "#d1fae5" : "#fee2e2";
      feedbackButton.style.color = type === "positive" ? "#00a550" : "#dc3545";
      feedbackButton.setAttribute("disabled", "true");

      setTimeout(() => {
        feedbackButton.innerHTML = originalContent;
        feedbackButton.style.backgroundColor = "";
        feedbackButton.style.color = "";
        feedbackButton.removeAttribute("disabled");
      }, 2000);
    }
  } catch (error) {
    console.error("Fehler beim Senden des Feedbacks:", error);
  }
};

const handleViewSources = (message: any) => {
  console.log("View sources:", message);
  // Implement source viewing functionality
};

const scrollToBottom = async () => {
  if (messageArea.value) {
    await nextTick();
    messageArea.value.scrollTop = messageArea.value.scrollHeight;
  }
};


// Watch for new messages to scroll to bottom
watch(
  messages,
  () => {
    scrollToBottom();
  },
  { deep: true },
);

// Watch for streaming status changes
watch(isStreaming, (newVal) => {
  if (newVal) {
    scrollToBottom();
  }
});

// Watch for route changes to switch sessions
watch(() => route.params.id, async (newId) => {
  if (newId && newId !== sessionsStore.currentSessionId) {
    await sessionsStore.setCurrentSession(newId as string);
    await loadMessages();
  } else if (!newId) {
    // If no session ID in route, clear current session
    sessionsStore.clearCurrentSession();
  }
}, { immediate: false });

// Lifecycle
onMounted(async () => {
  // Load MOTD configuration
  try {
    await motdStore.fetchConfig();
  } catch (error) {
    console.error('Failed to load MOTD config:', error);
  }
  
  // Set current session from route or use persisted session
  if (route.params.id) {
    await sessionsStore.setCurrentSession(route.params.id as string);
  } else if (sessionsStore.currentSessionId) {
    // If no route param but we have a persisted session, use it
    router.replace(`/chat/${sessionsStore.currentSessionId}`);
  }

  // Load messages for current session
  if (sessionsStore.currentSessionId) {
    await loadMessages();
  }
});
</script>

<style scoped>
.chat-view {
  height: calc(100vh - 64px); /* Account for header height */
  display: flex;
  flex-direction: column;
  background: var(--nscale-background, #f8f9fa);
  position: relative;
}

.chat-header {
  background: var(--nscale-surface, #ffffff);
  border-bottom: 1px solid var(--nscale-border, #dee2e6);
  padding: 16px 24px;
  flex-shrink: 0;
}

.chat-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--nscale-text, #333);
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 100px; /* Space for fixed input area */
  scroll-behavior: smooth;
}

.welcome-message {
  text-align: center;
  padding: 48px 24px;
  animation: fadeIn 0.5s ease;
}

.welcome-logo {
  margin-bottom: 24px;
  color: var(--nscale-primary, #0056b3);
}

.welcome-message h3 {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--nscale-text, #333);
}

.welcome-message p {
  color: var(--nscale-text-secondary, #6c757d);
}

/* MOTD Styles */
.motd-container {
  margin-bottom: 24px;
  animation: fadeIn 0.5s ease-out;
}

.motd-content {
  font-size: 14px;
  line-height: 1.6;
}

.motd-content h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.motd-content p {
  margin: 8px 0;
}

.motd-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.motd-dismiss-btn {
  transition: opacity 0.2s;
}

.motd-dismiss-btn:hover {
  opacity: 0.8;
}

@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: translateY(-10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: slideIn 0.3s ease;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background: var(--nscale-primary, #0056b3);
  color: white;
}

.message-assistant .message-avatar {
  background: var(--nscale-surface, #f8f9fa);
  color: var(--nscale-primary, #0056b3);
  border: 1px solid var(--nscale-border, #dee2e6);
}

.message-content {
  background: var(--nscale-surface, #ffffff);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-user .message-content {
  background: var(--nscale-primary, #0056b3);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
}

.message-sender {
  font-weight: 500;
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
}

.message-text {
  line-height: 1.5;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--nscale-border, #dee2e6);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--nscale-text-secondary, #6c757d);
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--nscale-surface, #f8f9fa);
  color: var(--nscale-text, #333);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--nscale-primary, #0056b3);
  animation: bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Input area - fixed at bottom */
.input-area {
  position: fixed;
  bottom: 0;
  left: 260px; /* Account for sidebar width */
  right: 0;
  background: var(--nscale-surface, #ffffff);
  border-top: 1px solid var(--nscale-border, #dee2e6);
  padding: 16px 24px;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.message-form {
  display: flex;
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--nscale-border, #dee2e6);
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--nscale-background, #f8f9fa);
}

.message-input:focus {
  border-color: var(--nscale-primary, #0056b3);
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button {
  background: var(--nscale-primary, #0056b3);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  transition: opacity 0.2s;
}

.send-button:hover:not(:disabled) {
  opacity: 0.9;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

/* Streaming cursor animation */
.streaming-cursor {
  animation: blink 1s infinite;
  color: var(--nscale-primary, #0056b3);
  font-weight: bold;
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
</style>
