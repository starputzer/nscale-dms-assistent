<template>
  <div class="chat-view">
    <!-- Message display area -->
    <div class="message-container" ref="scrollContainer">
      <div v-if="isLoading" class="messages-loading">
        <div class="loading-spinner"></div>
        <span>Lade Unterhaltung...</span>
      </div>

      <div
        v-else-if="!currentMessages || currentMessages.length === 0"
        class="no-messages"
      >
        <div class="welcome-message">
          <img
            src="/images/senmvku-logo.png"
            alt="nscale DMS Assistent"
            class="welcome-logo"
          />
          <h2>Willkommen beim nscale DMS Assistenten</h2>
          <p>Wie kann ich Ihnen heute mit nscale helfen?</p>
        </div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="(message, index) in currentMessages"
          :key="message.id || index"
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

        <div v-if="isStreaming" class="message-wrapper assistant-message">
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

    <!-- Message input area -->
    <div class="input-container">
      <div class="input-wrapper">
        <form class="input-form" @submit.prevent="handleSubmit">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            class="nscale-input message-input"
            placeholder="Stellen Sie Ihre Frage..."
            :disabled="isInputDisabled"
            @keydown.enter.exact.prevent="handleSubmit"
            @input="adjustTextareaHeight"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
          ></textarea>

          <div class="input-buttons">
            <button
              type="button"
              class="attachment-button"
              :disabled="isInputDisabled"
              @click="triggerFileSelect"
              title="Datei anhängen"
            >
              <i class="fas fa-paperclip"></i>
            </button>

            <button
              type="submit"
              class="send-button"
              :disabled="!canSubmit"
              :class="{ 'send-button-active': canSubmit }"
              title="Nachricht senden"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>

          <input
            type="file"
            ref="fileInput"
            class="file-input"
            @change="handleFileSelected"
            accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
        </form>
      </div>

      <div class="input-footer">
        <div
          class="character-count"
          :class="{ 'character-limit-warning': isNearCharacterLimit }"
        >
          {{ inputText.length }}/4000
        </div>

        <div class="footer-hints">
          <span class="hint"
            >Drücken Sie <kbd>Enter</kbd> zum Senden, <kbd>Shift</kbd>+<kbd
              >Enter</kbd
            >
            für neue Zeile</span
          >
        </div>

        <div v-if="selectedFile" class="file-preview">
          <div class="file-preview-info">
            <i class="fas fa-file-alt file-icon"></i>
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size"
              >({{ formatFileSize(selectedFile.size) }})</span
            >
          </div>
          <button
            type="button"
            class="remove-file-button"
            @click="removeSelectedFile"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useSessionsStore } from "../stores/sessions";
import { useSettingsStore } from "../stores/settings";
import { useUIStore } from "../stores/ui";
import DOMPurify from "dompurify";
import marked from "marked";

// Stores
const sessionsStore = useSessionsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

// Refs
const scrollContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const inputText = ref("");
const selectedFile = ref<File | null>(null);
const isInputFocused = ref(false);

// Constants
const MAX_CHARACTERS = 4000;
const NEAR_LIMIT_THRESHOLD = 3800;

// Computed properties
const currentSessionId = computed(() => sessionsStore.currentSessionId);
const currentMessages = computed(() => sessionsStore.currentMessages);
const isLoading = computed(() => sessionsStore.isLoading);
const isStreaming = computed(() => sessionsStore.isStreaming);

const isInputDisabled = computed(() => {
  return isStreaming.value || !currentSessionId.value;
});

const canSubmit = computed(() => {
  return (
    !isInputDisabled.value &&
    ((inputText.value.trim().length > 0 &&
      inputText.value.length <= MAX_CHARACTERS) ||
      selectedFile.value !== null)
  );
});

const isNearCharacterLimit = computed(() => {
  return inputText.value.length > NEAR_LIMIT_THRESHOLD;
});

// Watch for changes in messages to scroll to bottom
watch(
  () => [...currentMessages.value],
  () => {
    scrollToBottom();
  },
  { deep: true },
);

// Watch for typing indicator to scroll to bottom
watch(
  () => isStreaming.value,
  () => {
    scrollToBottom();
  },
);

// Reset textarea height when input is cleared
watch(
  () => inputText.value,
  (newValue) => {
    if (newValue === "" && textareaRef.value) {
      textareaRef.value.style.height = "auto";
    }
  },
);

// Lifecycle hooks
onMounted(() => {
  adjustTextareaHeight();
  scrollToBottom();

  // Focus input on mount if there's a session
  if (textareaRef.value && currentSessionId.value) {
    textareaRef.value.focus();
  }
});

// Methods
function scrollToBottom(): void {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

function adjustTextareaHeight() {
  if (!textareaRef.value) return;

  // Reset height to get the scrollHeight value for actual content
  textareaRef.value.style.height = "auto";

  // Set the height based on scrollHeight with a max height
  const maxHeight = 150; // max height in pixels
  const newHeight = Math.min(textareaRef.value.scrollHeight, maxHeight);
  textareaRef.value.style.height = `${newHeight}px`;
}

function formatMessageContent(content: string): string {
  if (!content) return "";

  // Use marked to render Markdown (if enabled in settings)
  let renderedContent = settingsStore.messages.renderMarkdown
    ? marked(content)
    : content.replace(/\n/g, "<br>");

  // Use DOMPurify to sanitize HTML
  const sanitizedContent = DOMPurify.sanitize(renderedContent);

  // Replace source reference markers with clickable spans
  return sanitizedContent.replace(
    /\[\[src:([^\]]+)\]\]/g,
    (match, sourceId) => {
      return `<span class="source-reference" data-source-id="${sourceId}">[${sourceId}]</span>`;
    },
  );
}

function hasSourceReferences(content: string): boolean {
  return content && content.includes("[[src:");
}

function formatTime(timestamp: string): string {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function sendFeedback(messageId: string, type: "positive" | "negative"): void {
  // Implement feedback functionality when the store is available
  uiStore.showToast({
    type: "info",
    message: `Feedback (${type}) für Nachricht ${messageId} gesendet.`,
  });
}

function showExplanation(messageId: string): void {
  // Implement explanation functionality when the store is available
  uiStore.showToast({
    type: "info",
    message: `Erklärung für Nachricht ${messageId} angefordert.`,
  });
}

function showSources(messageId: string): void {
  // Implement sources functionality when the store is available
  uiStore.showToast({
    type: "info",
    message: `Quellen für Nachricht ${messageId} angefordert.`,
  });
}

function handleSubmit() {
  if (!canSubmit.value || !currentSessionId.value) return;

  // If we have a file, emit upload event
  if (selectedFile.value) {
    // TODO: Implement file upload when API is available
    uiStore.showToast({
      type: "info",
      message: `Datei '${selectedFile.value.name}' wird hochgeladen.`,
    });
    removeSelectedFile();
  }

  // If we have text, send the message
  if (inputText.value.trim()) {
    sessionsStore.sendMessage({
      sessionId: currentSessionId.value,
      content: inputText.value,
      role: "user",
    });

    inputText.value = "";

    // Reset textarea height
    if (textareaRef.value) {
      textareaRef.value.style.height = "auto";
    }
  }

  // Focus back on the textarea
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
}

function triggerFileSelect() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
}

function removeSelectedFile() {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background-color: var(--nscale-background, #f9fafb);
}

.messages-loading,
.no-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--nscale-text-light, #666);
  text-align: center;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--nscale-border, #eaeaea);
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
  color: var(--nscale-text, #333333);
}

.welcome-message p {
  color: var(--nscale-text-light, #666);
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
  background-color: var(--nscale-light-green);
  color: var(--nscale-text, #333333);
}

.nscale-message-assistant {
  background-color: white;
  color: var(--nscale-text, #333333);
  border: 1px solid var(--nscale-border, #eaeaea);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.nscale-message-system {
  background-color: var(--nscale-gray, #f7f7f7);
  color: var(--nscale-text-light, #666);
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
  color: var(--nscale-text-light, #666);
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
  border-left: 4px solid var(--nscale-border, #eaeaea);
  padding-left: 1rem;
  margin: 0.75rem 0;
  color: var(--nscale-text-light, #666);
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
  color: var(--nscale-text-light, #666);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.feedback-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--nscale-text, #333333);
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
  border: 1px solid var(--nscale-border, #eaeaea);
  border-radius: 4px;
  color: var(--nscale-text, #333333);
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
  background-color: var(--nscale-text-light, #666);
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

.input-container {
  background-color: var(--nscale-card-bg, white);
  border-top: 1px solid var(--nscale-border, #eaeaea);
  padding: 1rem 1.5rem;
  width: 100%;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.input-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  position: relative;
}

.message-input {
  flex: 1;
  resize: none;
  min-height: 44px;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.5;
  padding-right: 5rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  width: 100%;
}

.input-buttons {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 0.5rem;
}

.send-button,
.attachment-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: none;
  border: none;
  color: var(--nscale-text-light, #666);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.send-button:hover:not(:disabled),
.attachment-button:hover:not(:disabled) {
  background-color: var(--nscale-gray, #f7f7f7);
  color: var(--nscale-text, #333333);
}

.send-button:disabled,
.attachment-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-button-active {
  color: var(--nscale-green);
}

.file-input {
  display: none;
}

.input-footer {
  max-width: 900px;
  margin: 0.5rem auto 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--nscale-text-light, #666);
}

.character-count {
  font-family: monospace;
}

.character-limit-warning {
  color: #e53e3e;
  font-weight: 500;
}

.footer-hints {
  flex: 1;
  text-align: center;
}

.hint kbd {
  background-color: var(--nscale-gray, #f7f7f7);
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid var(--nscale-border, #eaeaea);
  font-family: monospace;
  font-size: 0.7rem;
}

.file-preview {
  display: flex;
  align-items: center;
  background-color: var(--nscale-gray, #f7f7f7);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  max-width: 900px;
  margin: 0.5rem auto 0;
}

.file-preview-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  flex: 1;
}

.file-icon {
  color: var(--nscale-text-light, #666);
}

.file-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  color: var(--nscale-text-light, #666);
  white-space: nowrap;
}

.remove-file-button {
  background: none;
  border: none;
  color: var(--nscale-text-light, #666);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.remove-file-button:hover {
  background-color: rgba(229, 62, 62, 0.1);
  color: #e53e3e;
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

  .input-container {
    padding: 0.75rem 1rem;
  }

  .footer-hints {
    display: none;
  }

  .file-preview {
    margin-top: 0.75rem;
  }
}
</style>
