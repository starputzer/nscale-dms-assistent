<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <img src="../assets/berlin-logo.svg" alt="Berlin Logo" class="logo" />
        <h1 class="app-title">nscale DMS Assistent</h1>
      </div>
      <div class="header-right">
        <Button 
          icon="plus" 
          variant="primary"
          @click="createNewSession"
        >
          Neue Unterhaltung
        </Button>
        <Button 
          icon="settings" 
          variant="secondary"
          @click="openAdminPanel"
        >
          Administration
        </Button>
        <Button 
          icon="logout" 
          variant="secondary"
          @click="logout"
        >
          Abmelden
        </Button>
      </div>
    </header>
    
    <main class="main">
      <Sidebar 
        :sessions="sessions" 
        @setActive="setActiveSession" 
        @delete="deleteSession"
      />
      <ChatView 
        :session="activeSession" 
        @sendMessage="sendMessage"
        @feedback="giveFeedback"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '../composables/useChat';
import Button from './Button.vue';
import Sidebar from './Sidebar.vue';
import ChatView from './ChatView.vue';

// Chat-Funktionalität verwenden
const { 
  sessions,
  activeSession,
  setActiveSession,
  createNewSession,
  deleteSession,
  sendMessage,
  giveFeedback
} = useChat();

// Admin-Panel öffnen (simuliert)
const openAdminPanel = () => {
  alert('Administration wird geöffnet...');
};

// Logout (simuliert)
const logout = () => {
  if (confirm('Möchten Sie sich wirklich abmelden?')) {
    alert('Sie wurden abgemeldet.');
  }
};
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  height: 2.5rem;
  margin-right: 1rem;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>