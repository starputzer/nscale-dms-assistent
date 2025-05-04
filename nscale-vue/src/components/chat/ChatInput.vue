<template>
  <div class="chat-input">
    <form @submit.prevent="sendQuestion" class="chat-form">
      <input
        v-model="questionText"
        class="input-field"
        type="text"
        placeholder="Stellen Sie Ihre Frage zur nscale DMS-Software..."
        :disabled="disabled || isLoading"
        ref="inputRef"
      />
      
      <button
        type="submit"
        class="send-button"
        :disabled="disabled || isLoading || !questionText"
      >
        <span v-if="isLoading">
          <i class="fas fa-spinner fa-spin mr-2"></i>
          Wird gesendet...
        </span>
        <span v-else>
          <i class="fas fa-paper-plane mr-2"></i>
          Senden
        </span>
      </button>
    </form>
    
    <!-- Simple language toggle -->
    <div class="settings-row">
      <div class="toggle-option">
        <input
          type="checkbox"
          id="simple-language"
          v-model="useSimpleLanguage"
          @change="updateSimpleLanguageSetting"
        />
        <label for="simple-language">Einfache Sprache verwenden</label>
      </div>
      
      <!-- Streaming toggle -->
      <div class="toggle-option">
        <input
          type="checkbox"
          id="streaming"
          v-model="useStreaming"
          @change="updateStreamingSetting"
        />
        <label for="streaming">Live-Streaming der Antwort</label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useChatStore } from '@/stores/chatStore';

// Props
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['question-sent']);

// Store
const chatStore = useChatStore();

// Refs
const questionText = ref('');
const inputRef = ref(null);
const useSimpleLanguage = ref(chatStore.useSimpleLanguage);
const useStreaming = ref(chatStore.useStreaming);

// Methods
const sendQuestion = async () => {
  if (!questionText.value.trim() || props.disabled || props.isLoading) {
    return;
  }
  
  // Set the question in the store
  chatStore.setQuestion(questionText.value);
  
  // Send question to the server
  await chatStore.sendQuestion();
  
  // Emit event to parent
  emit('question-sent', questionText.value);
  
  // Clear input
  questionText.value = '';
  
  // Focus on input again
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus();
    }
  }, 100);
};

// Update settings in the store
const updateSimpleLanguageSetting = () => {
  chatStore.setSimpleLanguage(useSimpleLanguage.value);
};

const updateStreamingSetting = () => {
  chatStore.setStreaming(useStreaming.value);
};

// Load settings when component mounts
onMounted(() => {
  chatStore.loadSettings();
  useSimpleLanguage.value = chatStore.useSimpleLanguage;
  useStreaming.value = chatStore.useStreaming;
});

// Watch for changes in the store
watch(() => chatStore.useSimpleLanguage, (newVal) => {
  useSimpleLanguage.value = newVal;
});

watch(() => chatStore.useStreaming, (newVal) => {
  useStreaming.value = newVal;
});
</script>

<style scoped>
.chat-input {
  border-top: 1px solid #e2e8f0;
  padding: 1rem;
  background-color: #fff;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.chat-form {
  display: flex;
  gap: 0.75rem;
}

.input-field {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.input-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input-field:disabled {
  background-color: #f8fafc;
  cursor: not-allowed;
}

.send-button {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.send-button:disabled {
  background-color: #cbd5e1;
  cursor: not-allowed;
}

.settings-row {
  display: flex;
  margin-top: 0.75rem;
  gap: 2rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
}

.toggle-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
}

.toggle-option input[type="checkbox"] {
  accent-color: #3b82f6;
}
</style>