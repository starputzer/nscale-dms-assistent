<template>
  <div :class="['message-wrapper', message.is_user ? 'user-message' : 'assistant-message']">
    <div :class="[message.is_user ? 'nscale-message-user' : 'nscale-message-assistant']">
      <!-- Nachrichteninhalt -->
      <div v-if="message.is_user" v-html="formattedMessage" class="prose"></div>
      <div v-else v-html="formattedMessageWithSources" class="prose"></div>
      
      <!-- Feedback-Buttons und Quellenbuttons nur für Assistenten-Nachrichten
           und nur wenn die Antwort bereits vollständig ist (kein Streaming läuft) -->
      <div 
        v-if="!message.is_user && !isStreaming" 
        class="message-actions"
        :style="{
          opacity: isStreaming ? '0' : '1',
          transition: 'opacity 0.5s ease'
        }"
      >
        <!-- Feedback-Buttons -->
        <div class="feedback-buttons">
          <span v-if="message.feedback_comment" class="feedback-comment">{{ message.feedback_comment }}</span>
          <button 
            @click="submitFeedback(true)" 
            :class="['feedback-button', { 'selected': message.feedback_positive === true }]"
            title="Hilfreich"
          >
            <i class="fas fa-thumbs-up"></i>
          </button>
          <button 
            @click="submitFeedback(false)" 
            :class="['feedback-button', { 'selected negative': message.feedback_positive === false }]"
            title="Nicht hilfreich"
          >
            <i class="fas fa-thumbs-down"></i>
          </button>
          <button 
            v-if="message.feedback_positive === false" 
            @click="showFeedbackCommentDialog" 
            class="feedback-button"
            title="Kommentar hinzufügen"
          >
            <i class="fas fa-comment"></i>
          </button>
        </div>
        
        <!-- Quellbuttons nur anzeigen, wenn Quellenreferenzen gefunden wurden -->
        <div v-if="hasSourceReferences" class="source-buttons mt-2">
          <button class="source-btn" @click="loadExplanation">
            <i class="fas fa-info-circle"></i>
            Antwort erklären
          </button>
          <button class="source-btn" @click="showSourcesDialog">
            <i class="fas fa-bookmark"></i>
            Quellen anzeigen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useFeedbackStore } from '@/stores/feedback';
import { useSourceStore } from '@/stores/source';
import { useFormatter } from '@/composables/useFormatter';

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isStreaming: {
    type: Boolean,
    default: false
  }
});

// Store-Referenzen
const sessionStore = useSessionStore();
const feedbackStore = useFeedbackStore();
const sourceStore = useSourceStore();

// Composables
const { formatMessage, formatMessageWithSources } = useFormatter();

// Computed
const formattedMessage = computed(() => {
  return formatMessage(props.message.message);
});

const formattedMessageWithSources = computed(() => {
  return formatMessageWithSources(props.message.message);
});

const hasSourceReferences = computed(() => {
  return sourceStore.hasSourceReferences(props.message.message);
});

// Methoden
const submitFeedback = (isPositive) => {
  feedbackStore.submitFeedback({
    messageId: props.message.id,
    sessionId: sessionStore.currentSessionId,
    isPositive
  });
};

const showFeedbackCommentDialog = () => {
  feedbackStore.showFeedbackCommentDialog(props.message);
};

const loadExplanation = () => {
  sourceStore.loadExplanation(props.message);
};

const showSourcesDialog = () => {
  sourceStore.showSourcesDialog(props.message);
};
</script>

<style scoped>
.message-wrapper {
  margin-bottom: 1.5rem;
}

.user-message {
  display: flex;
  justify-content: flex-end;
}

.assistant-message {
  display: flex;
  justify-content: flex-start;
}

.nscale-message-user, .nscale-message-assistant {
  max-width: 85%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  position: relative;
}

.nscale-message-user {
  background-color: #e7f7ff;
  border-top-right-radius: 0;
}

.nscale-message-assistant {
  background-color: #f8f9fa;
  border-top-left-radius: 0;
}

.message-actions {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.nscale-message-assistant:hover .message-actions {
  opacity: 1;
}

.feedback-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.feedback-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: #f1f3f5;
  color: #6c757d;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.feedback-button:hover {
  background-color: #e9ecef;
  color: #495057;
}

.feedback-button.selected {
  background-color: #d1e7dd;
  color: #0f5132;
}

.feedback-button.selected.negative {
  background-color: #f8d7da;
  color: #842029;
}

.source-buttons {
  display: flex;
  gap: 0.5rem;
}

.source-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: #f1f3f5;
  color: #6c757d;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.source-btn:hover {
  background-color: #e9ecef;
  color: #495057;
}

.feedback-comment {
  font-size: 0.75rem;
  font-style: italic;
  color: #6c757d;
  margin-right: 0.5rem;
}
</style>