<template>
  <div class="session-list">
    <h2 class="title">Unterhaltungen</h2>
    
    <!-- New session button -->
    <button @click="createNewSession" class="new-session-btn">
      <i class="fas fa-plus"></i>
      Neue Unterhaltung
    </button>
    
    <!-- Sessions loading state -->
    <div v-if="loading" class="loading-state">
      <div class="loader"></div>
      <p>Lade Unterhaltungen...</p>
    </div>
    
    <!-- Empty sessions state -->
    <div v-else-if="sessions.length === 0" class="empty-state">
      <p>Keine Unterhaltungen vorhanden</p>
      <p class="empty-note">Starten Sie eine neue Unterhaltung mit dem Assistenten</p>
    </div>
    
    <!-- Session list -->
    <ul v-else class="sessions">
      <li 
        v-for="session in sortedSessions" 
        :key="session.id"
        @click="selectSession(session.id)"
        :class="['session-item', { active: currentSessionId === session.id }]"
      >
        <div class="session-title-container">
          <i class="fas fa-comment session-icon"></i>
          <span class="session-title">{{ session.title }}</span>
        </div>
        
        <button 
          @click.stop="confirmDeleteSession(session.id)" 
          class="delete-button"
          title="Unterhaltung löschen"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
      </li>
    </ul>
    
    <!-- Delete confirmation modal -->
    <div v-if="showDeleteModal" class="delete-modal">
      <div class="modal-content">
        <h3>Unterhaltung löschen?</h3>
        <p>Möchten Sie diese Unterhaltung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        
        <div class="modal-actions">
          <button @click="deleteSession" class="delete-confirm-btn">
            Löschen
          </button>
          <button @click="showDeleteModal = false" class="cancel-btn">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';

// Props
const props = defineProps({
  currentSessionId: {
    type: Number,
    default: null
  }
});

// Emits
const emit = defineEmits(['session-selected', 'session-created', 'session-deleted']);

// Store
const sessionStore = useSessionStore();

// State
const showDeleteModal = ref(false);
const sessionToDelete = ref(null);

// Computed
const sessions = computed(() => sessionStore.sessions);
const sortedSessions = computed(() => sessionStore.sortedSessions);
const loading = computed(() => sessionStore.loading);

// Methods
const selectSession = (sessionId) => {
  if (sessionId === props.currentSessionId) return;
  
  sessionStore.setCurrentSession(sessionId);
  emit('session-selected', sessionId);
};

const createNewSession = async () => {
  const sessionId = await sessionStore.createSession();
  if (sessionId) {
    emit('session-created', sessionId);
  }
};

const confirmDeleteSession = (sessionId) => {
  sessionToDelete.value = sessionId;
  showDeleteModal.value = true;
};

const deleteSession = async () => {
  if (!sessionToDelete.value) return;
  
  const success = await sessionStore.deleteSession(sessionToDelete.value);
  if (success) {
    emit('session-deleted', sessionToDelete.value);
  }
  
  showDeleteModal.value = false;
  sessionToDelete.value = null;
};

// Lifecycle
onMounted(async () => {
  // Load sessions on component mount
  await sessionStore.fetchSessions();
  
  // Start polling for new sessions (useful for multi-tab)
  sessionStore.startSessionPolling();
});

// Clean up on component unmount
watch(
  () => sessionStore.sessions,
  (newSessions) => {
    // If current session is deleted, emit an event
    if (props.currentSessionId && !newSessions.find(s => s.id === props.currentSessionId)) {
      emit('session-deleted', props.currentSessionId);
    }
  }
);
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
}

.title {
  font-size: 1.25rem;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.new-session-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.new-session-btn:hover {
  background-color: #2563eb;
}

.sessions {
  list-style-type: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f8fafc;
}

.session-item:hover {
  background-color: #f1f5f9;
}

.session-item.active {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.session-title-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: calc(100% - 40px);
  overflow: hidden;
}

.session-icon {
  color: #64748b;
  font-size: 0.875rem;
}

.session-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
  color: #334155;
}

.delete-button {
  opacity: 0;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.session-item:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  color: #ef4444;
  background-color: #fee2e2;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #94a3b8;
  text-align: center;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-note {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Modal styles */
.delete-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.modal-content h3 {
  margin-top: 0;
  color: #1e293b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.delete-confirm-btn {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
}

.delete-confirm-btn:hover {
  background-color: #dc2626;
}

.cancel-btn {
  background-color: #f1f5f9;
  color: #334155;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #e2e8f0;
}
</style>