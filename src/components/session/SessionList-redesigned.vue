<template>
  <div class="session-list">
    <div class="session-list__header">
      <h2 class="session-list__title">Unterhaltungen</h2>
      <button 
        class="session-list__new"
        @click="createNewSession"
        title="Neue Unterhaltung"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <div class="session-list__content">
      <div 
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ 'session-item--active': session.id === activeSessionId }"
        @click="selectSession(session.id)"
      >
        <div class="session-item__content">
          <h3 class="session-item__title">{{ session.title }}</h3>
          <p class="session-item__preview">{{ session.lastMessage || 'Noch keine Nachrichten' }}</p>
          <span class="session-item__time">{{ formatTime(session.updatedAt) }}</span>
        </div>
        <button 
          class="session-item__delete"
          @click.stop="deleteSession(session.id)"
          title="Löschen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <div v-if="sessions.length === 0" class="session-list__empty">
        <p>Noch keine Unterhaltungen vorhanden.</p>
        <button 
          class="session-list__empty-button"
          @click="createNewSession"
        >
          Neue Unterhaltung starten
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionsStore } from '@/stores/sessions'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

const router = useRouter()
const sessionsStore = useSessionsStore()

const sessions = computed(() => sessionsStore.sessions)
const activeSessionId = computed(() => sessionsStore.currentSessionId)

const createNewSession = async () => {
  const sessionId = await sessionsStore.createSession('Neue Unterhaltung')
  router.push(`/chat/${sessionId}`)
}

const selectSession = (sessionId: string) => {
  sessionsStore.setCurrentSession(sessionId)
  router.push(`/chat/${sessionId}`)
}

const deleteSession = async (sessionId: string) => {
  if (confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
    await sessionsStore.deleteSession(sessionId)
    if (sessionId === activeSessionId.value) {
      const remainingSessions = sessions.value
      if (remainingSessions.length > 0) {
        selectSession(remainingSessions[0].id)
      } else {
        router.push('/chat')
      }
    }
  }
}

const formatTime = (date: string): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.session-list__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.session-list__new {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.session-list__new:hover {
  background: var(--primary);
  color: white;
}

.session-list__new svg {
  width: 18px;
  height: 18px;
}

.session-list__content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.session-item:hover {
  background: var(--button-hover);
}

.session-item--active {
  background: var(--primary);
  color: white;
}

.session-item__content {
  flex: 1;
  min-width: 0;
}

.session-item__title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item--active .session-item__title {
  color: white;
}

.session-item__preview {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item--active .session-item__preview {
  color: rgba(255, 255, 255, 0.8);
}

.session-item__time {
  font-size: 12px;
  color: var(--text-muted);
}

.session-item--active .session-item__time {
  color: rgba(255, 255, 255, 0.7);
}

.session-item__delete {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.session-item:hover .session-item__delete {
  opacity: 1;
}

.session-item--active .session-item__delete {
  color: white;
}

.session-item__delete:hover {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.session-item__delete svg {
  width: 16px;
  height: 16px;
}

.session-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.session-list__empty p {
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

.session-list__empty-button {
  padding: 8px 16px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.session-list__empty-button:hover {
  background: var(--primary-hover);
}
</style>