<template>
  <div class="message-actions">
    <!-- Feedback buttons -->
    <div class="feedback-buttons">
      <span v-if="message.feedback_comment" class="feedback-comment">
        {{ message.feedback_comment }}
      </span>
      
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
        @click="showFeedbackDialog"
        class="feedback-button"
        title="Kommentar hinzufügen"
      >
        <i class="fas fa-comment"></i>
      </button>
    </div>
    
    <!-- Source reference buttons -->
    <div v-if="hasSourceReferences(message.message)" class="source-buttons mt-2">
      <button class="source-btn" @click="$emit('show-explanation', message)">
        <i class="fas fa-info-circle"></i>
        Antwort erklären
      </button>
      
      <button class="source-btn" @click="$emit('show-sources', message)">
        <i class="fas fa-bookmark"></i>
        Quellen anzeigen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useChatStore } from '@/stores/chatStore';

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  sessionId: {
    type: Number,
    required: true
  }
});

// Emits
const emit = defineEmits(['show-sources', 'show-explanation']);

// Store
const chatStore = useChatStore();

// Methods
const submitFeedback = async (isPositive) => {
  if (!props.message.id) return;
  
  await chatStore.sendFeedback(
    props.message.id, 
    props.sessionId, 
    isPositive
  );
};

const showFeedbackDialog = () => {
  chatStore.prepareFeedback(props.message.id, props.sessionId);
  chatStore.showFeedbackDialog = true;
};

// Check if a message has source references
const hasSourceReferences = (text) => {
  if (!text) return false;
  return /\[\d+\]/.test(text);
};
</script>

<style scoped>
.message-actions {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.feedback-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feedback-button {
  background: transparent;
  border: none;
  color: #64748b;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-button:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.feedback-button.selected {
  color: #10b981;
  background-color: #ecfdf5;
}

.feedback-button.selected.negative {
  color: #ef4444;
  background-color: #fef2f2;
}

.feedback-comment {
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
  margin-right: 0.5rem;
}

.source-buttons {
  display: flex;
  gap: 0.5rem;
}

.source-btn {
  font-size: 0.8rem;
  background-color: #f1f5f9;
  color: #475569;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.source-btn:hover {
  background-color: #e2e8f0;
  color: #334155;
}
</style>