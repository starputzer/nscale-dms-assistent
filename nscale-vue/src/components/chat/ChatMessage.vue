<template>
  <!-- Systemnachricht -->
  <div v-if="message.is_system" class="nscale-message-system">
    <div v-html="formatMessage(message.message)" class="prose"></div>
  </div>
  
  <!-- Benutzer- oder Assistenten-Nachricht mit Wrapper -->
  <div v-else :class="['message-wrapper', message.is_user ? 'user-message' : 'assistant-message']">
    <div :class="[message.is_user ? 'nscale-message-user' : 'nscale-message-assistant']">
      <!-- Nachrichten-Inhalt -->
      <div v-if="message.is_user" v-html="formatMessage(message.message)" class="prose"></div>
      <div v-else v-html="formatMessageWithSources(message.message)" class="prose"></div>
      
      <!-- Feedback-Buttons nur für Assistenten-Nachrichten -->
      <div v-if="!message.is_user" class="feedback-buttons">
        <span v-if="message.feedback_comment" class="feedback-comment">{{ message.feedback_comment }}</span>
        <button 
          @click="submitFeedback(true)" 
          :class="['feedback-button', { 'selected': message.feedback_positive === true }]"
          title="Hilfreich">
          <i class="fas fa-thumbs-up"></i>
        </button>
        <button 
          @click="submitFeedback(false)" 
          :class="['feedback-button', { 'selected negative': message.feedback_positive === false }]"
          title="Nicht hilfreich">
          <i class="fas fa-thumbs-down"></i>
        </button>
        <button 
          v-if="message.feedback_positive === false" 
          @click="$emit('show-feedback-dialog', message)" 
          class="feedback-button"
          title="Kommentar hinzufügen">
          <i class="fas fa-comment"></i>
        </button>
      </div>
      
      <!-- Quellenbuttons nur für Assistenten-Nachrichten -->
      <div v-if="!message.is_user" class="source-buttons mt-2">
        <button class="source-btn" @click="$emit('load-explanation', message)">
          <i class="fas fa-info-circle"></i>
          Antwort erklären
        </button>
        <button class="source-btn" @click="$emit('show-sources', message)">
          <i class="fas fa-bookmark"></i>
          Quellen anzeigen
        </button>
      </div>
      
      <!-- Debug-Info für message_id -->
      <div v-if="debug" style="font-size: 10px; color: gray; margin-top: 5px;">
        message_id: {{message.id || 'undefined'}}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import marked from 'marked';

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  debug: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'submit-feedback',
  'show-feedback-dialog',
  'load-explanation',
  'show-sources'
]);

// Methoden
function formatMessage(message) {
  if (!message) return '';
  
  // Exakte Kopie der Formatierungsfunktion aus app.js
  return marked(message);
}

function formatMessageWithSources(message) {
  if (!message) return '';
  
  // Exakte Kopie der Formatierungsfunktion mit Quellenbehandlung aus app.js
  // Hier würde die Quellenverarbeitung stattfinden
  return formatMessage(message);
}

function submitFeedback(isPositive) {
  emit('submit-feedback', {
    messageId: props.message.id,
    sessionId: props.sessionId,
    isPositive
  });
}

// Lifecycle-Hooks
onMounted(() => {
  // Scroll zur Nachricht, wenn sie neu ist
  if (props.message.isNew) {
    const element = document.querySelector('.message-wrapper:last-child');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */
/* Die Styles werden aus den bestehenden CSS-Dateien geladen */

/* Falls notwendig, spezifische Ergänzungen */
.message-wrapper {
  margin-bottom: 1.5rem;
}

.nscale-message-system {
  background-color: #f9fafb;
  border-left: 4px solid #9ca3af;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.375rem;
}

.nscale-message-user {
  background-color: #f0f9ff;
  border-left: 4px solid #0ea5e9;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 0.375rem;
}

.nscale-message-assistant {
  background-color: #f0fdf4;
  border-left: 4px solid #10b981;
  padding: 1rem;
  border-radius: 0.375rem;
}

.feedback-buttons {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  gap: 0.5rem;
}

.feedback-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-button:hover {
  background-color: #e5e7eb;
}

.feedback-button.selected {
  background-color: #d1fae5;
  border-color: #10b981;
  color: #047857;
}

.feedback-button.selected.negative {
  background-color: #fee2e2;
  border-color: #ef4444;
  color: #b91c1c;
}

.source-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.source-btn {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
}

.source-btn:hover {
  background-color: #e5e7eb;
}
</style>