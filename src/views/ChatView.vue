<template>
  <div class="chat-view">
    <MessageList :messages="messages" :isLoading="isLoadingMessages" />
    <InputComponent 
      :disabled="isLoadingMessages || isSendingMessage" 
      @send-message="sendMessage" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useChat } from '@/composables/useChat';
import MessageList from '@/components/MessageList.vue';
import InputComponent from '@/components/InputComponent.vue';

const route = useRoute();
const router = useRouter();
const store = useStore();
const { messages, isLoadingMessages, isSendingMessage, sendMessage: sendChatMessage, loadMessages } = useChat();

const sessionId = computed(() => route.params.id as string);

// Watch for route changes to load messages for the new session
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadSessionMessages(newId as string);
  }
}, { immediate: true });

onMounted(() => {
  // If no session id in route, redirect to home or create a new one
  if (!sessionId.value) {
    const sessions = store.getters['sessions/allSessions'];
    if (sessions.length > 0) {
      router.push(`/session/${sessions[0].id}`);
    } else {
      store.dispatch('sessions/createSession')
        .then((newSessionId: string) => {
          router.push(`/session/${newSessionId}`);
        });
    }
  } else {
    loadSessionMessages(sessionId.value);
    // Set active session in store
    store.commit('sessions/setActiveSession', sessionId.value);
  }
});

function loadSessionMessages(id: string) {
  loadMessages(id);
}

function sendMessage(content: string) {
  if (!sessionId.value || !content.trim()) return;
  
  sendChatMessage(sessionId.value, content);
}
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>