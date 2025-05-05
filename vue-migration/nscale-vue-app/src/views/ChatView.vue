<template>
  <div class="chat-view">
    <div class="sidebar">
      <div class="sessions">
        <h2>Unterhaltungen</h2>
        <button @click="createNewSession" class="new-session-btn">Neue Unterhaltung</button>
        <div class="session-list">
          <!-- Placeholder für die Session-Liste -->
          <div 
            v-for="session in sessions" 
            :key="session.id"
            :class="['session-item', { active: session.id === activeSessionId }]"
            @click="selectSession(session.id)"
          >
            {{ session.title }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-area">
      <div class="chat-header">
        <h2>{{ activeSessionTitle }}</h2>
      </div>
      
      <div class="messages">
        <!-- Placeholder für die Nachrichten -->
        <div 
          v-for="message in messages" 
          :key="message.id"
          :class="['message', message.is_user ? 'user-message' : 'assistant-message']"
        >
          <div class="message-content">{{ message.message }}</div>
        </div>
      </div>
      
      <div class="input-area">
        <textarea 
          v-model="userInput" 
          placeholder="Stellen Sie eine Frage..."
          @keypress.enter.prevent="sendMessage"
        ></textarea>
        <button @click="sendMessage">Senden</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Beispieldaten (in einer echten Anwendung würden diese von einer API kommen)
const sessions = ref([
  { id: 1, title: 'Erste Unterhaltung' },
  { id: 2, title: 'Zweite Unterhaltung' }
])

const messages = ref([
  { id: 1, message: 'Wie kann ich Ihnen helfen?', is_user: false },
  { id: 2, message: 'Ich habe eine Frage zu nscale.', is_user: true },
  { id: 3, message: 'Gerne, was möchten Sie wissen?', is_user: false }
])

const userInput = ref('')
const activeSessionId = ref(1)
const activeSessionTitle = ref('Erste Unterhaltung')

// Funktionen
const selectSession = (sessionId) => {
  activeSessionId.value = sessionId
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    activeSessionTitle.value = session.title
  }
  // Hier würden wir die Nachrichten der ausgewählten Session laden
}

const createNewSession = () => {
  // Hier würden wir eine neue Session erstellen
  console.log('Neue Unterhaltung erstellen')
}

const sendMessage = () => {
  if (!userInput.value.trim()) return
  
  // Nachricht hinzufügen
  messages.value.push({
    id: messages.value.length + 1,
    message: userInput.value,
    is_user: true
  })
  
  // Hier würden wir die Nachricht an den Server senden
  
  // Input zurücksetzen
  userInput.value = ''
}
</script>

<style scoped>
.chat-view {
  display: flex;
  height: calc(100vh - 80px);
}

.sidebar {
  width: 250px;
  border-right: 1px solid #ccc;
  padding: 20px;
}

.sessions h2 {
  margin-top: 0;
}

.new-session-btn {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.session-item {
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
  cursor: pointer;
}

.session-item.active {
  background-color: #e0f0ff;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid #ccc;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.message {
  margin-bottom: 15px;
  max-width: 80%;
}

.user-message {
  margin-left: auto;
}

.assistant-message {
  margin-right: auto;
}

.message-content {
  padding: 10px 15px;
  border-radius: 18px;
}

.user-message .message-content {
  background-color: #3498db;
  color: white;
}

.assistant-message .message-content {
  background-color: #f0f0f0;
}

.input-area {
  padding: 15px;
  border-top: 1px solid #ccc;
  display: flex;
}

.input-area textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
  height: 50px;
}

.input-area button {
  margin-left: 10px;
  padding: 0 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>