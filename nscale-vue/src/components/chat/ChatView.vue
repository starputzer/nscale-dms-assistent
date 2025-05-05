<template>
  <div class="h-full flex flex-col">
    <!-- Leere Ansicht, wenn keine Session ausgewählt -->
    <div v-if="!currentSessionId" class="flex h-full items-center justify-center text-gray-400 p-8">
      <div class="text-center">
        <i class="fas fa-comment-dots text-5xl text-gray-300 mb-4"></i>
        <h3 class="text-lg font-medium mb-2">Keine Unterhaltung ausgewählt</h3>
        <p class="text-sm text-gray-500 mb-4">Wählen Sie eine Unterhaltung aus der Seitenleiste oder starten Sie eine neue.</p>
        <button @click="$emit('new-session')" class="nscale-btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Neue Unterhaltung starten
        </button>
      </div>
    </div>
    
    <!-- Chat-Container, wenn Session ausgewählt -->
    <div v-else class="chat-container h-full">
      <!-- MOTD im Chat anzeigen -->
      <div v-if="motd && motd.enabled && motd.display.showInChat && !motdDismissed" 
          class="motd-banner p-4 mx-4 mt-4 mb-4 rounded-lg relative shadow-sm"
          :style="{
            backgroundColor: motd.style.backgroundColor,
            borderColor: motd.style.borderColor,
            color: motd.style.textColor,
            border: '1px solid ' + motd.style.borderColor
          }">
        <button v-if="motd.display.dismissible" 
              @click="dismissMotd" 
              class="absolute top-2 right-2 font-bold"
              :style="{ color: motd.style.textColor }">
          ×
        </button>
        <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
      </div>
      
      <!-- Chat Messages -->
      <div class="message-container flex-1 overflow-y-auto p-4" ref="chatMessages">
        <chat-message 
          v-for="(message, index) in messages" 
          :key="index" 
          :message="message"
          :session-id="currentSessionId"
          :debug="debug"
          @submit-feedback="submitFeedback"
          @show-feedback-dialog="showFeedbackDialog"
          @load-explanation="loadExplanation"
          @show-sources="showSourcesDialog"
        />
        
        <div v-if="isLoading" class="flex justify-center p-4">
          <div class="loader"></div>
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="input-container p-4 border-t border-gray-100 bg-white">
        <form @submit.prevent="sendMessage" class="flex space-x-2">
          <input 
            v-model="question" 
            class="nscale-input flex-1" 
            placeholder="Stellen Sie Ihre Frage zur nscale DMS-Software..." 
            :disabled="!currentSessionId || isLoading"
          />
          <button 
            type="submit" 
            class="nscale-btn-primary flex items-center"
            :disabled="!currentSessionId || !question || isLoading"
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useFeatureToggleStore } from '@/stores/featureToggleStore';
import ChatMessage from './ChatMessage.vue';
import marked from 'marked';

// Props
const props = defineProps({
  currentSessionId: {
    type: String,
    default: null
  },
  messages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  motd: {
    type: Object,
    default: () => null
  },
  motdDismissed: {
    type: Boolean,
    default: false
  },
  debug: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'new-session', 
  'submit-feedback', 
  'show-feedback-dialog',
  'load-explanation',
  'show-sources-dialog',
  'dismiss-motd',
  'send-message'
]);

// Reaktiver Zustand
const question = ref('');
const chatMessages = ref(null);
const featureStore = useFeatureToggleStore();
const vueChatEnabled = ref(featureStore.isEnabled('vueChat'));

// Methoden
function formatMotdContent(content) {
  if (!content) return '';
  return props.motd.format === 'markdown' ? marked(content) : content;
}

function dismissMotd() {
  emit('dismiss-motd');
}

function submitFeedback(payload) {
  emit('submit-feedback', payload);
}

function showFeedbackDialog(message) {
  emit('show-feedback-dialog', message);
}

function loadExplanation(message) {
  emit('load-explanation', message);
}

function showSourcesDialog(message) {
  emit('show-sources-dialog', message);
}

function sendMessage() {
  if (question.value.trim() && !props.isLoading) {
    emit('send-message', question.value);
    question.value = '';
  }
}

// Scroll zum Ende der Nachrichten, wenn neue hinzugefügt werden
watch(() => props.messages.length, async () => {
  if (chatMessages.value) {
    await nextTick();
    chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
  }
});

// Fallback Mechanismus
function loadFallbackChat() {
  console.log('Lade Fallback-Chat-Implementierung...');
  
  // Vue-Chat ausblenden
  const vueChat = document.querySelector('.vue-chat-container');
  if (vueChat) vueChat.style.display = 'none';
  
  // Klassischen Chat anzeigen
  const classicChat = document.querySelector('.classic-chat-container');
  if (classicChat) classicChat.style.display = 'block';
  
  // Klassisches Script laden falls notwendig
  if (!window.classicChatInitialized) {
    const script = document.createElement('script');
    script.src = '/static/js/chat.js';
    script.type = 'module';
    
    script.onload = () => {
      console.log('Klassische Chat-Implementierung geladen');
      window.classicChatInitialized = true;
    };
    
    script.onerror = () => {
      console.error('Fehler beim Laden der klassischen Chat-Implementierung');
    };
    
    document.head.appendChild(script);
  }
}

// Komponenten-Initialisierung
onMounted(() => {
  if (!vueChatEnabled.value) {
    loadFallbackChat();
    return;
  }
  
  try {
    // Chat-Funktionalität initialisieren
    console.log('Vue-Chat-Komponente initialisiert');
    
    // Zum Ende der Nachrichten scrollen
    if (chatMessages.value && props.messages.length > 0) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
    
    // Fallback-Timer für Fehlerfall
    const fallbackTimer = setTimeout(() => {
      console.warn('Vue-Chat-Komponente konnte nicht vollständig initialisiert werden, Fallback wird geladen');
      loadFallbackChat();
    }, 3000);
    
    // Timer löschen
    clearTimeout(fallbackTimer);
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Vue-Chat-Komponente:', error);
    loadFallbackChat();
  }
});
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */
/* Die Styles werden aus den bestehenden CSS-Dateien geladen */

/* Falls notwendig, spezifische Ergänzungen */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.input-container {
  border-top: 1px solid #f3f4f6;
  padding: 1rem;
}

.loader {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--nscale-primary, #2563eb);
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>