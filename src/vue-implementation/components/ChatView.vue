<template>
  <div class="chat-view">
    <div v-if="session" class="chat-container">
      <div class="chat-messages" ref="messagesContainer">
        <MessageItem 
          v-for="message in session.messages" 
          :key="message.id" 
          :message="message"
          @feedback="handleFeedback"
        />
      </div>
      
      <div class="chat-input">
        <TextInput
          v-model="inputText"
          placeholder="Stellen Sie Ihre Frage zur nscale DMS-Software..."
          @enter="sendMessage"
          :autoResize="true"
          :minHeight="40"
          :maxHeight="150"
        >
          <template #actions>
            <Button 
              icon="send" 
              variant="primary" 
              class="send-button"
              :disabled="!canSend"
              @click="sendMessage"
            />
          </template>
        </TextInput>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <div class="empty-state-content">
        <Icon name="chatBubble" :size="48" color="#ddd" />
        <h3>Keine Unterhaltung ausgewählt</h3>
        <p>Wählen Sie eine bestehende Unterhaltung aus oder erstellen Sie eine neue.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import type { ChatSession } from '../types';
import MessageItem from './MessageItem.vue';
import TextInput from './TextInput.vue';
import Button from './Button.vue';
import Icon from './Icon.vue';

const props = defineProps<{
  session?: ChatSession;
}>();

const emit = defineEmits(['sendMessage', 'feedback']);

const inputText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Berechne, ob eine Nachricht gesendet werden kann
const canSend = computed(() => inputText.value.trim().length > 0);

// Nachricht senden
const sendMessage = () => {
  if (canSend.value) {
    emit('sendMessage', inputText.value);
    inputText.value = '';
  }
};

// Feedback behandeln
const handleFeedback = (messageId: string, feedback: 'positive' | 'negative' | null) => {
  emit('feedback', messageId, feedback);
};

// Scrolle zum Ende der Nachrichten, wenn sich die Nachrichten ändern
watch(
  () => props.session?.messages,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  },
  { deep: true }
);

// Scrolle zum Ende, wenn eine neue Session geladen wird
watch(
  () => props.session,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  }
);

// Zum Ende der Nachrichten scrollen
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Initial zum Ende der Nachrichten scrollen
onMounted(() => {
  nextTick(() => {
    scrollToBottom();
  });
});
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  overflow: hidden;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: #fafafa;
}

.chat-input {
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  background-color: white;
}

.send-button {
  margin-bottom: 0.5rem;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.empty-state-content {
  text-align: center;
  padding: 2rem;
}

.empty-state-content h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #616161;
}

.empty-state-content p {
  color: #9e9e9e;
  max-width: 300px;
}
</style>