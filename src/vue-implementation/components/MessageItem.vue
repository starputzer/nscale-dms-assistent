<template>
  <div 
    class="message-container" 
    :class="{ 
      'message-assistant': message.isAssistant, 
      'message-user': !message.isAssistant 
    }"
  >
    <div class="message-content">
      <div class="message-avatar" v-if="message.isAssistant">
        <div class="avatar-image">AI</div>
      </div>
      <div class="message-body">
        <div class="message-text">{{ message.text }}</div>
        <div class="message-footer" v-if="message.isAssistant">
          <div class="message-timestamp">{{ formattedTime }}</div>
          <div class="message-feedback">
            <Button 
              icon="thumbsUp" 
              variant="secondary" 
              class="feedback-button"
              :class="{ 'active': message.feedback === 'positive' }"
              @click="handleFeedback('positive')"
              :iconSize="16"
            />
            <Button 
              icon="thumbsDown" 
              variant="secondary" 
              class="feedback-button"
              :class="{ 'active': message.feedback === 'negative' }"
              @click="handleFeedback('negative')"
              :iconSize="16"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../types';
import Button from './Button.vue';

const props = defineProps<{
  message: ChatMessage;
}>();

const emit = defineEmits(['feedback']);

// Formatierte Zeit berechnen
const formattedTime = computed(() => {
  try {
    const date = new Date(props.message.timestamp);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) {
    console.error('Fehler beim Formatieren des Timestamps', e);
    return '';
  }
});

// Feedback behandeln
const handleFeedback = (feedback: 'positive' | 'negative') => {
  // Wenn bereits dieses Feedback gewählt wurde, entferne es
  const newFeedback = props.message.feedback === feedback ? null : feedback;
  emit('feedback', props.message.id, newFeedback);
};
</script>

<style scoped>
.message-container {
  display: flex;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-content {
  display: flex;
  max-width: 80%;
}

.message-assistant .message-content {
  margin-right: auto;
}

.message-user .message-content {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.avatar-image {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2e7d32;
  color: white;
  font-weight: bold;
  font-size: 0.75rem;
}

.message-body {
  display: flex;
  flex-direction: column;
}

.message-text {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-assistant .message-text {
  background-color: white;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-user .message-text {
  background-color: #e8f5e9;
  color: #1b5e20;
}

.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
  padding: 0 0.5rem;
}

.message-timestamp {
  font-size: 0.75rem;
  color: #757575;
}

.message-feedback {
  display: flex;
  gap: 0.25rem;
}

.feedback-button {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.feedback-button:hover, .feedback-button.active {
  opacity: 1;
}

.feedback-button.active {
  background-color: #e8f5e9;
  border-color: #2e7d32;
  color: #2e7d32;
}
</style>