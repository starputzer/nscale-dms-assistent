<template>
  <div class="message-list">
    <!-- Loading indicator -->
    <div v-if="loading" class="flex justify-center p-4">
      <div class="loader"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="messages.length === 0" class="empty-state">
      <div class="flex flex-col items-center justify-center text-gray-400 p-8">
        <i class="fas fa-comment-dots text-5xl text-gray-300 mb-4"></i>
        <h3 class="text-lg font-medium mb-2">Keine Nachrichten</h3>
        <p class="text-sm text-gray-500 mb-4">Stellen Sie eine Frage, um mit dem Assistenten zu beginnen.</p>
      </div>
    </div>

    <!-- Message list -->
    <div v-else class="messages-container">
      <div v-for="(message, index) in messages" :key="message.id || index" class="mb-6">
        <!-- System message -->
        <div v-if="message.is_system" class="system-message">
          <div v-html="formatMessage(message.message)" class="prose"></div>
        </div>
        
        <!-- User or assistant message -->
        <div 
          v-else 
          :class="['message-wrapper', message.is_user ? 'user-message' : 'assistant-message']"
        >
          <!-- Message content container -->
          <div :class="message.is_user ? 'message-user' : 'message-assistant'">
            <!-- Message content -->
            <div 
              v-if="message.is_user" 
              v-html="formatMessage(message.message)" 
              class="prose"
            ></div>
            <div 
              v-else 
              v-html="formatMessageWithSources(message.message)" 
              class="prose"
            ></div>
            
            <!-- Interactive elements (feedback, sources) for assistant messages -->
            <MessageActions 
              v-if="!message.is_user && !isStreaming" 
              :message="message"
              :session-id="sessionId"
              @show-sources="$emit('show-sources', message)"
              @show-explanation="$emit('show-explanation', message)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';
import { useChatStore } from '@/stores/chatStore';
import MessageActions from './MessageActions.vue';

// Props
const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  sessionId: {
    type: Number,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  isStreaming: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['show-sources', 'show-explanation']);

// Store
const chatStore = useChatStore();

// Methods
const formatMessage = (text) => {
  if (!text) return '';
  
  // Sanitize and format markdown using marked.js
  return marked.parse(text, {
    gfm: true,             // GitHub Flavored Markdown
    breaks: true,          // Convert line breaks to <br>
    sanitize: true,        // Sanitize HTML
    smartypants: true,     // Typographic punctuation
    highlight: function(code, lang) {
      // Here you could integrate a syntax highlighter
      return code;
    }
  });
};

// Format message with source references highlighted
const formatMessageWithSources = (text) => {
  if (!text) return '';
  
  // Format markdown first
  let formattedText = formatMessage(text);
  
  // Replace source references with highlighted spans
  // Example: [1] -> <span class="source-reference" data-source-id="1">[1]</span>
  formattedText = formattedText.replace(
    /\[(\d+)\]/g, 
    '<span class="source-reference" data-source-id="$1">[$1]</span>'
  );
  
  return formattedText;
};

// Check if a message has source references
const hasSourceReferences = (text) => {
  if (!text) return false;
  return /\[\d+\]/.test(text);
};
</script>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: 100%;
  padding: 1rem;
}

.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}

.message-user {
  background-color: #e9f5ff;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 85%;
  margin-left: auto;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-assistant {
  background-color: #f9f9f9;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 85%;
  margin-right: auto;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.system-message {
  background-color: #fffde7;
  border-left: 4px solid #ffd600;
  padding: 0.75rem;
  margin: 1rem 0;
  font-style: italic;
  color: #5d4037;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Source reference styling */
:deep(.source-reference) {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(.source-reference:hover) {
  background-color: #bbdefb;
}

/* Prose styling for markdown */
:deep(.prose) {
  font-size: 0.95rem;
}

:deep(.prose pre) {
  background-color: #2d3748;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

:deep(.prose code) {
  background-color: #edf2f7;
  color: #2d3748;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

:deep(.prose pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
}
</style>