<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Unterhaltungen</h2>
    </div>
    
    <div class="sidebar-content">
      <ul class="session-list">
        <li 
          v-for="session in sessions" 
          :key="session.id"
          class="session-item"
          :class="{ 'active': session.isActive }"
          @click="setActiveSession(session.id)"
        >
          <div class="session-info">
            <Icon name="chatBubble" :size="16" class="session-icon" />
            <div class="session-title">{{ session.title }}</div>
          </div>
          <Button 
            icon="trash" 
            variant="secondary" 
            class="delete-button"
            :iconSize="16"
            @click.stop="handleDelete(session.id)"
          />
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { ChatSession } from '../types';
import Icon from './Icon.vue';
import Button from './Button.vue';

const props = defineProps<{
  sessions: ChatSession[];
}>();

const emit = defineEmits(['setActive', 'delete']);

const setActiveSession = (sessionId: string) => {
  emit('setActive', sessionId);
};

const handleDelete = (sessionId: string) => {
  if (confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
    emit('delete', sessionId);
  }
};
</script>

<style scoped>
.sidebar {
  width: 250px;
  height: 100%;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  margin-bottom: 0.25rem;
  transition: background-color 0.2s;
}

.session-item:hover {
  background-color: #eeeeee;
}

.session-item.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
}

.session-icon {
  flex-shrink: 0;
}

.session-title {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-button {
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .delete-button {
  opacity: 1;
}
</style>