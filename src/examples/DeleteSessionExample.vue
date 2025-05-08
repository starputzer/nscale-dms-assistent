<template>
  <div class="session-item" :class="{ 'is-active': session.isActive }">
    <div class="session-info" @click="setActiveSession(session.id)">
      <h3 class="session-title">{{ session.title }}</h3>
      <span class="session-date">{{ formatDate(session.timestamp) }}</span>
    </div>
    
    <div class="session-actions">
      <button 
        class="session-delete-btn" 
        title="Unterhaltung löschen"
        @click="confirmDeleteSession(session.id)"
      >
        <span class="sr-only">Löschen</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlobalDialog } from '@/composables/useDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Eigenschaften definieren
interface Session {
  id: string;
  title: string;
  timestamp: string;
  isActive?: boolean;
}

interface Props {
  session: Session;
}

// Emits definieren
const emit = defineEmits<{
  (e: 'delete', id: string): void;
  (e: 'setActive', id: string): void;
}>();

const props = defineProps<Props>();

// Dialog-Service importieren
const dialog = useGlobalDialog();

// Datum formatieren
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'dd. MMMM yyyy, HH:mm', { locale: de });
};

// Aktive Session setzen
const setActiveSession = (id: string) => {
  emit('setActive', id);
};

// Löschen mit dem neuen Dialog-System bestätigen
const confirmDeleteSession = async (id: string) => {
  const confirmed = await dialog.confirm({
    title: 'Unterhaltung löschen',
    message: 'Möchten Sie diese Unterhaltung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    confirmButtonText: 'Löschen',
    cancelButtonText: 'Abbrechen',
    type: 'warning'
  });
  
  if (confirmed) {
    emit('delete', id);
  }
};
</script>

<style scoped>
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.session-item:hover {
  background-color: #f3f4f6;
}

.session-item.is-active {
  background-color: #e6f5ee; /* Leichtes Grün für aktive Session */
  border-left: 3px solid #0d7a40;
}

.session-info {
  flex: 1;
  overflow: hidden;
}

.session-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.session-actions {
  display: flex;
  gap: 4px;
}

.session-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.session-delete-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>