<template>
  <div class="message-container" ref="scrollContainer">
    <div v-if="isLoading" class="messages-loading">
      <div class="loading-spinner"></div>
      <span>Lade Unterhaltung...</span>
    </div>

    <div v-else-if="messages.length === 0" class="no-messages">
      <div class="welcome-message">
        <img
          src="@/assets/images/senmvku-logo.png"
          alt="nscale DMS Assistent"
          class="welcome-logo"
        />
        <h2>Willkommen beim nscale DMS Assistenten</h2>
        <p>Wie kann ich Ihnen heute mit nscale helfen?</p>
      </div>
    </div>

    <div v-else class="messages-list">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message-wrapper"
        :class="{
          'user-message': message.role === 'user',
          'assistant-message': message.role === 'assistant',
          'system-message': message.role === 'system',
        }"
      >
        <div
          class="message-bubble"
          :class="{
            'nscale-message-user': message.role === 'user',
            'nscale-message-assistant': message.role === 'assistant',
            'nscale-message-system': message.role === 'system',
          }"
        >
          <div class="message-header">
            <div class="message-role">
              {{ messageRoleLabel(message.role) }}
            </div>
            <div class="message-time" v-if="message.timestamp">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>

          <div
            class="message-content"
            v-html="formatMessageContent(message.content)"
          ></div>

          <div v-if="message.role === 'assistant'" class="message-actions">
            <div class="feedback-buttons">
              <button
                class="feedback-button"
                @click="sendFeedback(message.id, 'positive')"
                title="Positives Feedback"
              >
                <i class="fas fa-thumbs-up"></i>
              </button>
              <button
                class="feedback-button"
                @click="sendFeedback(message.id, 'negative')"
                title="Negatives Feedback"
              >
                <i class="fas fa-thumbs-down"></i>
              </button>
            </div>

            <div
              v-if="hasSourceReferences(message.content)"
              class="source-buttons"
            >
              <button
                class="source-btn"
                @click="showExplanation(message.id)"
                title="Antwort erklären"
              >
                <i class="fas fa-info-circle"></i>
                <span>Antwort erklären</span>
              </button>
              <button
                class="source-btn"
                @click="showSources(message.id)"
                title="Quellen anzeigen"
              >
                <i class="fas fa-bookmark"></i>
                <span>Quellen anzeigen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isTyping" class="message-wrapper assistant-message">
        <div class="message-bubble nscale-message-assistant typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";

// Replace Vuex with Pinia stores
import { useSessionsStore } from "@/stores/sessions";
import { useSourcesStore } from "@/stores/sources";
import { useFeedbackStore } from "@/stores/admin/feedback";
import { useSourceReferences } from "@/composables/useSourceReferences";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

const props = defineProps<{
  messages: Message[];
  isLoading: boolean;
}>();

// Use Pinia stores
const sessionsStore = useSessionsStore();
const sourcesStore = useSourcesStore();
const feedbackStore = useFeedbackStore();

// Use source references composable
const {
  hasSourceReferences,
  isSourceReferencesVisible,
  isLoadingSourceReferences,
  showSourcePopupHandler,
} = useSourceReferences();

const scrollContainer = ref<HTMLElement | null>(null);
const isTyping = computed(() => sessionsStore.isTyping);

// Watch for new messages to scroll to bottom
watch(
  () => [...props.messages],
  () => {
    scrollToBottom();
  },
  { deep: true },
);

// Watch for typing indicator
watch(
  () => isTyping.value,
  () => {
    scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();

  // Set up event handler for source reference clicks
  const handleSourceReferenceClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.matches(".source-reference")) {
      const sourceId = target.getAttribute("data-source-id");
      if (sourceId) {
        showSourcePopupHandler(event, sourceId);
      }
    }
  };

  // Add event listener to the scroll container
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener("click", handleSourceReferenceClick);
  }
});

// Format message content with markdown
function formatMessageContent(content: string): string {
  // CRITICAL: Never display raw SSE data
  if (content.includes("data: {") || content.includes("event: ")) {
    console.error("WARNING: Raw SSE data detected in message content!");
    console.error("First 200 chars:", content.substring(0, 200));
    // Return error message instead of raw SSE data
    return "<em>Fehler beim Verarbeiten der Antwort. Bitte versuchen Sie es erneut.</em>";
  }
  
  // Use DOMPurify to sanitize HTML
  const sanitizedContent = DOMPurify.sanitize(marked(content));

  // Replace source reference markers with clickable spans
  let formattedContent = sanitizedContent.replace(
    /\[\[src:([^\]]+)\]\]/g,
    (match, sourceId) => {
      return `<span class="source-reference" data-source-id="${sourceId}">[${sourceId}]</span>`;
    },
  );

  // Add support for legacy source reference patterns
  formattedContent = formattedContent.replace(
    /\(Quelle-(\d+)\)/g,
    (match, sourceId) => {
      return `<span class="source-reference" data-source-id="${sourceId}">${match}</span>`;
    },
  );

  return formattedContent;
}

// Format time (e.g., "14:35")
function formatTime(timestamp: Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get readable role label
function messageRoleLabel(role: string): string {
  switch (role) {
    case "user":
      return "Sie";
    case "assistant":
      return "Assistent";
    case "system":
      return "System";
    default:
      return "";
  }
}

// Send feedback for a message
function sendFeedback(messageId: string, type: "positive" | "negative"): void {
  feedbackStore.sendFeedback({
    messageId,
    type,
    sessionId: sessionsStore.currentSessionId || "",
  });
}

// Show explanation for a message
function showExplanation(messageId: string): void {
  sourcesStore.showExplanation({ messageId });
}

// Show sources for a message
function showSources(messageId: string): void {
  sourcesStore.showSources({ messageId });
}

// Scroll to bottom of the message container
function scrollToBottom(): void {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}
</script>

<style scoped>
.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background-color: var(--nscale-background);
}

.messages-loading,
.no-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--nscale-text-light);
  text-align: center;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--nscale-border);
  border-top-color: var(--nscale-green);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

.welcome-message {
  max-width: 500px;
  padding: 2rem;
}

.welcome-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
}

.welcome-message h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--nscale-text);
}

.welcome-message p {
  color: var(--nscale-text-light);
  font-size: 1.125rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.message-wrapper {
  display: flex;
  max-width: 100%;
}

.user-message {
  justify-content: flex-end;
}

.message-bubble {
  padding: 1rem;
  border-radius: 8px;
  max-width: 80%;
  overflow-wrap: break-word;
}

.nscale-message-user {
  background-color: var(--nscale-user-bg);
  color: var(--nscale-text);
}

.nscale-message-assistant {
  background-color: var(--nscale-assistant-bg);
  color: var(--nscale-text);
}

.nscale-message-system {
  background-color: var(--nscale-gray);
  color: var(--nscale-text-light);
  font-style: italic;
  max-width: 90%;
  margin: 0 auto;
  text-align: center;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  color: var(--nscale-text-light);
  font-size: 0.875rem;
}

.message-content {
  line-height: 1.6;
}

.message-content :deep(p) {
  margin-bottom: 0.75rem;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.75rem 0;
}

.message-content :deep(code) {
  font-family: monospace;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.9em;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.message-content :deep(li) {
  margin-bottom: 0.25rem;
}

.message-content :deep(blockquote) {
  border-left: 4px solid var(--nscale-border);
  padding-left: 1rem;
  margin: 0.75rem 0;
  color: var(--nscale-text-light);
}

.message-content :deep(.source-reference) {
  display: inline-block;
  color: var(--nscale-green);
  cursor: pointer;
  font-weight: 500;
  padding: 0 0.2rem;
}

.message-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 0.75rem;
}

.feedback-buttons {
  display: flex;
  gap: 1rem;
}

.feedback-button {
  background: none;
  border: none;
  color: var(--nscale-text-light);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.feedback-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--nscale-text);
}

.source-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.source-btn {
  display: flex;
  align-items: center;
  background: none;
  border: 1px solid var(--nscale-border);
  border-radius: 4px;
  color: var(--nscale-text);
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.source-btn i {
  margin-right: 0.5rem;
}

.source-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.typing-indicator {
  display: inline-block;
  padding: 0.75rem 1rem;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--nscale-text-light);
  display: inline-block;
  animation: typing-dot 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .message-container {
    padding: 1rem;
  }

  .message-bubble {
    max-width: 90%;
  }

  .source-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
