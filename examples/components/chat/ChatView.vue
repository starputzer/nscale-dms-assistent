<template>
  <div class="chat-container h-full">
    <!-- MOTD im Chat anzeigen -->
    <MotdDisplay 
      v-if="motdStore.motd && motdStore.motd.enabled && motdStore.motd.display.showInChat && !motdStore.isDismissed"
      :motd="motdStore.motd"
      class="mb-4"
      @dismiss="motdStore.dismissMotd"
    />
    
    <!-- Keine Session ausgewählt Fallback -->
    <div v-if="!sessionStore.currentSessionId" class="flex h-full items-center justify-center text-gray-400 p-8">
      <div class="text-center">
        <i class="fas fa-comment-dots text-5xl text-gray-300 mb-4"></i>
        <h3 class="text-lg font-medium mb-2">Keine Unterhaltung ausgewählt</h3>
        <p class="text-sm text-gray-500 mb-4">Wählen Sie eine Unterhaltung aus der Seitenleiste oder starten Sie eine neue.</p>
        <NScaleButton primary @click="sessionStore.startNewSession">
          <i class="fas fa-plus mr-2"></i>
          Neue Unterhaltung starten
        </NScaleButton>
      </div>
    </div>
    
    <!-- Chat-Hauptbereich -->
    <div v-else class="flex flex-col h-full">
      <!-- Nachrichtenliste -->
      <MessageList 
        :messages="sessionStore.messages" 
        :is-streaming="sessionStore.isStreaming"
        ref="messageListRef"
      />
      
      <!-- Eingabebereich -->
      <InputArea 
        v-model="question"
        :is-disabled="!sessionStore.currentSessionId || sessionStore.isLoading" 
        :is-loading="sessionStore.isLoading"
        @send="sendMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useMotdStore } from '@/stores/motd';
import { useSourceStore } from '@/stores/source';
import { useChat } from '@/composables/useChat';

import MessageList from '@/components/chat/MessageList.vue';
import InputArea from '@/components/chat/InputArea.vue';
import MotdDisplay from '@/components/ui/MotdDisplay.vue';
import NScaleButton from '@/components/ui/NScaleButton.vue';

// Store-Referenzen
const sessionStore = useSessionStore();
const motdStore = useMotdStore();
const sourceStore = useSourceStore();

// Chat-Funktionalität
const { sendMessage } = useChat();

// Lokaler Zustand
const question = ref('');
const messageListRef = ref(null);

// Methoden
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollToBottom();
    }
  });
};

// Watcher
watch(() => sessionStore.messages.length, () => {
  scrollToBottom();
});

watch(() => sessionStore.isStreaming, (isStreaming) => {
  if (!isStreaming) {
    scrollToBottom();
  }
});

// Lebenszyklus-Hooks
onMounted(() => {
  // Lade letzte aktive Session, falls vorhanden
  if (sessionStore.sessions.length > 0 && !sessionStore.currentSessionId) {
    const lastSession = sessionStore.sessions[0];
    sessionStore.loadSession(lastSession.id);
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>