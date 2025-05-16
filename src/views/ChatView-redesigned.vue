<template>
  <div class="chat-view">
    <div class="chat-header">
      <h2 class="chat-header__title">
        {{ currentSession?.title || 'Neue Unterhaltung' }}
      </h2>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div class="chat-messages__content">
        <div 
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="`message--${message.role}`"
        >
          <div class="message__content">
            <div class="message__text" v-html="formatMessage(message.content)"></div>
            <div class="message__time">{{ formatTime(message.createdAt) }}</div>
          </div>
          <div v-if="message.role === 'assistant'" class="message__actions">
            <button 
              class="message__action"
              @click="copyMessage(message.content)"
              title="Kopieren"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="isLoading" class="message message--assistant">
          <div class="message__content">
            <div class="message__loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <form @submit.prevent="sendMessage" class="chat-input__form">
        <textarea
          v-model="messageInput"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.shift.enter.exact="newline"
          class="chat-input__textarea"
          placeholder="Nachricht eingeben..."
          :disabled="isLoading"
          rows="1"
        ></textarea>
        <button 
          type="submit"
          class="chat-input__submit"
          :disabled="!messageInput.trim() || isLoading"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionsStore } from '@/stores/sessions'
import { useUIStore } from '@/stores/ui'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

const route = useRoute()
const sessionsStore = useSessionsStore()
const uiStore = useUIStore()

const messagesContainer = ref<HTMLElement>()
const messageInput = ref('')
const isLoading = computed(() => sessionsStore.isLoading)

const currentSession = computed(() => sessionsStore.currentSession)
const messages = computed(() => sessionsStore.currentMessages)

const sendMessage = async () => {
  const content = messageInput.value.trim()
  if (!content || isLoading.value) return

  messageInput.value = ''
  
  await sessionsStore.sendMessage({
    sessionId: currentSession.value?.id || '',
    content
  })
  
  scrollToBottom()
}

const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    uiStore.showSuccess('Nachricht kopiert')
  } catch (error) {
    uiStore.showError('Kopieren fehlgeschlagen')
  }
}

const formatMessage = (content: string): string => {
  // Simple markdown formatting
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
}

const formatTime = (date: string): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de })
  } catch {
    return ''
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const newline = (event: KeyboardEvent) => {
  const textarea = event.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  messageInput.value = messageInput.value.substring(0, start) + '\n' + messageInput.value.substring(end)
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1
  })
}

// Auto-resize textarea
watch(messageInput, () => {
  nextTick(() => {
    const textarea = document.querySelector('.chat-input__textarea') as HTMLTextAreaElement
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  })
})

// Watch for session changes
watch(() => route.params.sessionId, async (sessionId) => {
  if (sessionId && typeof sessionId === 'string') {
    await sessionsStore.setCurrentSession(sessionId)
    scrollToBottom()
  }
}, { immediate: true })

// Watch for new messages
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background);
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--background);
}

.chat-header__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.chat-messages__content {
  max-width: 800px;
  margin: 0 auto;
}

.message {
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
}

.message--user {
  flex-direction: row-reverse;
}

.message__content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
}

.message--user .message__content {
  background: var(--primary);
  color: white;
}

.message--assistant .message__content {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.message__text {
  line-height: 1.5;
  word-wrap: break-word;
}

.message__text code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.message--user .message__text code {
  background: rgba(255, 255, 255, 0.2);
}

.message__time {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.7;
}

.message__actions {
  display: flex;
  align-items: flex-end;
}

.message__action {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.message__action:hover {
  background: var(--button-hover);
  color: var(--text);
}

.message__action svg {
  width: 16px;
  height: 16px;
}

.message__loading {
  display: flex;
  gap: 4px;
}

.message__loading span {
  width: 6px;
  height: 6px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: loading 1.4s infinite ease-in-out both;
}

.message__loading span:nth-child(1) {
  animation-delay: -0.32s;
}

.message__loading span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--background);
}

.chat-input__form {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

.chat-input__textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.chat-input__textarea:focus {
  border-color: var(--primary);
}

.chat-input__textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input__submit {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.chat-input__submit:hover:not(:disabled) {
  background: var(--primary-hover);
}

.chat-input__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input__submit svg {
  width: 20px;
  height: 20px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .chat-messages {
    padding: 16px;
  }

  .message__content {
    max-width: 85%;
  }

  .chat-input {
    padding: 12px 16px;
  }
}
</style>