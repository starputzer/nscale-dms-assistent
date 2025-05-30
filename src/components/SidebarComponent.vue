<template>
  <aside
    class="nscale-sidebar"
    :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
  >
    <div class="sidebar-header">
      <h2 class="sidebar-title">Unterhaltungen</h2>
      <button
        class="collapse-button"
        @click="toggleSidebar"
        title="Seitenleiste ausblenden"
      >
        <i
          :class="
            isSidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'
          "
        ></i>
      </button>
    </div>

    <div v-if="isLoading" class="sidebar-loading">
      <div class="loading-spinner"></div>
      <span>Lade Unterhaltungen...</span>
    </div>

    <div v-else-if="sessions.length === 0" class="no-sessions">
      <i class="fas fa-comment-slash"></i>
      <p>Keine Unterhaltungen vorhanden</p>
      <button class="nscale-btn-primary new-chat-btn" @click="createNewSession">
        <i class="fas fa-plus-circle"></i>
        Neue Unterhaltung starten
      </button>
    </div>

    <ul v-else class="session-list">
      <li
        v-for="session in sessions"
        :key="session.id"
        class="nscale-session-item"
        :class="{ 'active-session': activeSessionId === session.id }"
        @click="selectSession(session.id)"
      >
        <div class="session-title-container">
          <i class="fas fa-comment"></i>
          <span class="session-title">{{ session.title }}</span>
        </div>
        <button
          class="session-delete-button"
          @click.stop="confirmDeleteSession(session.id)"
          title="Unterhaltung löschen"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
      </li>
    </ul>

    <div v-if="showDeleteConfirm" class="delete-confirmation">
      <p>Unterhaltung wirklich löschen?</p>
      <div class="delete-actions">
        <button
          class="nscale-btn-secondary confirm-cancel-btn"
          @click="cancelDelete"
        >
          Abbrechen
        </button>
        <button
          class="nscale-btn-primary confirm-delete-btn"
          @click="deleteSession"
        >
          Löschen
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useSessionsStore } from "@/stores/sessions";
import { useRouter } from "vue-router";

const sessionsStore = useSessionsStore();
const router = useRouter();

const isSidebarCollapsed = ref(false);
const showDeleteConfirm = ref(false);
const sessionToDelete = ref<string | null>(null);

const sessions = computed(() => sessionsStore.sortedSessions);
const isLoading = computed(() => sessionsStore.isLoading);
const activeSessionId = computed(() => sessionsStore.currentSessionId);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

async function createNewSession() {
  const sessionId = await sessionsStore.createSession();
  router.push(`/session/${sessionId}`);
}

function selectSession(sessionId: string) {
  router.push(`/session/${sessionId}`);
}

function confirmDeleteSession(sessionId: string) {
  sessionToDelete.value = sessionId;
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  sessionToDelete.value = null;
  showDeleteConfirm.value = false;
}

async function deleteSession() {
  if (sessionToDelete.value) {
    await sessionsStore.deleteSession(sessionToDelete.value);
    if (activeSessionId.value === sessionToDelete.value) {
      // If we're deleting the active session, navigate to the first available session
      // or to the home page if no sessions remain
      if (sessions.value.length > 0) {
        router.push(`/session/${sessions.value[0].id}`);
      } else {
        router.push("/");
      }
    }
  }

  showDeleteConfirm.value = false;
  sessionToDelete.value = null;
}
</script>

<style scoped>
.nscale-sidebar {
  width: 300px;
  height: 100%;
  background-color: var(--nscale-sidebar-bg);
  border-right: 1px solid var(--nscale-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 1.25rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--nscale-border);
}

.sidebar-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--nscale-text);
  white-space: nowrap;
}

.collapse-button {
  background: none;
  border: none;
  color: var(--nscale-text-light);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.collapse-button:hover {
  background-color: var(--nscale-gray);
}

.session-list {
  list-style: none;
  padding: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.nscale-session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  overflow: hidden;
}

.nscale-session-item:hover {
  background-color: var(--nscale-gray);
}

.active-session {
  background-color: var(--nscale-light-green);
}

.session-title-container {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1;
}

.session-title-container i {
  margin-right: 10px;
  color: var(--nscale-text-light);
}

.session-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9375rem;
}

.session-delete-button {
  background: none;
  border: none;
  color: var(--nscale-text-light);
  cursor: pointer;
  opacity: 0;
  padding: 4px;
  border-radius: 4px;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.nscale-session-item:hover .session-delete-button {
  opacity: 1;
}

.session-delete-button:hover {
  background-color: rgba(229, 62, 62, 0.1);
  color: #e53e3e;
}

.delete-confirmation {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  background-color: var(--nscale-card-bg);
  border: 1px solid var(--nscale-border);
  border-radius: 6px;
  padding: 1rem;
  box-shadow: var(--nscale-shadow);
  z-index: 100;
}

.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.confirm-delete-btn {
  background-color: #e53e3e;
}

.confirm-delete-btn:hover {
  background-color: #c53030;
}

.sidebar-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--nscale-text-light);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--nscale-border);
  border-top-color: var(--nscale-green);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.no-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1rem;
  color: var(--nscale-text-light);
}

.no-sessions i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.no-sessions p {
  margin-bottom: 1.5rem;
}

.new-chat-btn {
  display: flex;
  align-items: center;
}

.new-chat-btn i {
  margin-right: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .nscale-sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid var(--nscale-border);
  }

  .sidebar-collapsed {
    height: 50px;
    width: 100%;
  }
}
</style>
