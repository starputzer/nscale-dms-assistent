<template>
  <div 
    class="n-session-list"
    :class="{ 
      'n-session-list--loading': isLoading,
      'n-session-list--empty': !isLoading && visibleSessions.length === 0 
    }"
  >
    <!-- Header mit Suchfeld und Sortierung -->
    <div class="n-session-list__header">
      <div class="n-session-list__search">
        <input
          v-model="searchQuery"
          type="text"
          class="n-session-list__search-input"
          placeholder="Unterhaltungen durchsuchen..."
          :disabled="isLoading"
          @input="handleSearch"
        />
        <button 
          v-if="searchQuery" 
          class="n-session-list__search-clear" 
          @click="clearSearch"
          aria-label="Suche löschen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="n-session-list__sort">
        <button 
          class="n-session-list__sort-toggle" 
          @click="toggleSortOptions"
          :aria-expanded="showSortOptions"
          aria-controls="sort-options"
          aria-label="Sortieroptionen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="7 11 12 6 17 11"></polyline>
            <polyline points="7 17 12 12 17 17"></polyline>
          </svg>
          <span class="n-session-list__sort-text">{{ sortOptions[currentSort].label }}</span>
        </button>
        
        <div 
          id="sort-options"
          v-show="showSortOptions" 
          class="n-session-list__sort-options"
          ref="sortOptionsMenu"
        >
          <button 
            v-for="(option, key) in sortOptions" 
            :key="key"
            class="n-session-list__sort-option"
            :class="{ 'n-session-list__sort-option--active': currentSort === key }"
            @click="setSortOption(key)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Ladezustand -->
    <div v-if="isLoading" class="n-session-list__loading">
      <div class="n-session-list__spinner"></div>
      <span>Lade Unterhaltungen...</span>
    </div>
    
    <!-- Leer-Zustand -->
    <div v-else-if="visibleSessions.length === 0" class="n-session-list__empty">
      <div class="n-session-list__empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <p class="n-session-list__empty-message">{{ 
        searchQuery 
          ? 'Keine Ergebnisse für Ihre Suche gefunden.' 
          : emptyMessage 
      }}</p>
      
      <button 
        v-if="!searchQuery && showCreateButton" 
        class="n-session-list__create-btn" 
        @click="handleCreateSession"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>{{ createButtonText }}</span>
      </button>
    </div>
    
    <!-- Session-Liste mit Drag-and-Drop -->
    <draggable
      v-else
      v-model="draggableSessions"
      class="n-session-list__items"
      handle=".n-session-list__drag-handle"
      item-key="id"
      :disabled="!enableDragAndDrop || isLoading"
      @end="handleDragEnd"
      ghost-class="n-session-list__item--ghost"
      chosen-class="n-session-list__item--chosen"
      drag-class="n-session-list__item--drag"
    >
      <template #item="{ element, index }">
        <SessionItem
          :session="element"
          :is-active="activeSessionId === element.id"
          :is-pinned="element.isPinned"
          :show-drag-handle="enableDragAndDrop"
          :index="index"
          @select="handleSessionSelect"
          @contextmenu="handleContextMenu"
          @pin="handlePinSession"
          @delete="handleConfirmDelete"
          @rename="handleRenameSession"
        />
      </template>
    </draggable>
    
    <!-- Create Session Button (Floating) -->
    <button 
      v-if="showCreateButton && visibleSessions.length > 0 && !searchQuery" 
      class="n-session-list__create-floating-btn" 
      @click="handleCreateSession"
      aria-label="Neue Unterhaltung erstellen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
    
    <!-- Kontextmenü -->
    <div 
      v-if="showContextMenu"
      class="n-session-list__context-menu"
      :style="{
        top: `${contextMenuPos.y}px`,
        left: `${contextMenuPos.x}px`
      }"
      ref="contextMenu"
      role="menu"
    >
      <div class="n-session-list__context-menu-header">
        <span class="n-session-list__context-menu-title">{{ contextSession?.title || 'Unterhaltung' }}</span>
      </div>
      <div class="n-session-list__context-menu-content">
        <button 
          class="n-session-list__context-menu-item"
          @click="handleContextMenuAction('rename')"
          role="menuitem"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Umbenennen</span>
        </button>
        <button 
          class="n-session-list__context-menu-item"
          @click="handleContextMenuAction('pin')"
          role="menuitem"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{{ contextSession?.isPinned ? 'Anheften aufheben' : 'Anheften' }}</span>
        </button>
        <button 
          class="n-session-list__context-menu-item n-session-list__context-menu-item--danger"
          @click="handleContextMenuAction('delete')"
          role="menuitem"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>Löschen</span>
        </button>
      </div>
    </div>
    
    <!-- Löschen-Dialog -->
    <div v-if="showDeleteDialog" class="n-session-list__delete-dialog">
      <div class="n-session-list__delete-dialog-content">
        <h3 class="n-session-list__delete-dialog-title">Unterhaltung löschen</h3>
        <p class="n-session-list__delete-dialog-message">
          Möchten Sie die Unterhaltung "{{ sessionToDelete?.title || 'Unterhaltung' }}" wirklich löschen?
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div class="n-session-list__delete-dialog-actions">
          <button 
            class="n-session-list__delete-dialog-btn n-session-list__delete-dialog-btn--cancel" 
            @click="cancelDelete"
          >
            Abbrechen
          </button>
          <button 
            class="n-session-list__delete-dialog-btn n-session-list__delete-dialog-btn--danger" 
            @click="confirmDelete"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
    
    <!-- Rename-Dialog -->
    <div v-if="showRenameDialog" class="n-session-list__rename-dialog">
      <div class="n-session-list__rename-dialog-content">
        <h3 class="n-session-list__rename-dialog-title">Unterhaltung umbenennen</h3>
        <div class="n-session-list__rename-dialog-input-container">
          <input
            v-model="renameValue"
            type="text"
            class="n-session-list__rename-dialog-input"
            placeholder="Neuer Name"
            ref="renameInput"
            @keydown.enter="confirmRename"
            @keydown.esc="cancelRename"
          />
        </div>
        <div class="n-session-list__rename-dialog-actions">
          <button 
            class="n-session-list__rename-dialog-btn n-session-list__rename-dialog-btn--cancel" 
            @click="cancelRename"
          >
            Abbrechen
          </button>
          <button 
            class="n-session-list__rename-dialog-btn n-session-list__rename-dialog-btn--confirm" 
            @click="confirmRename"
            :disabled="!renameValue.trim()"
          >
            Umbenennen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useSessionsStore } from '@/stores/sessions';
import type { ChatSession } from '@/types/session';
import draggable from 'vuedraggable';
import SessionItem from './SessionItem.vue';

interface Props {
  /** Array der anzuzeigenden Sessions */
  sessions?: ChatSession[];
  /** Die aktive Session-ID */
  activeSessionId?: string | null;
  /** Gibt an, ob die Liste gerade geladen wird */
  isLoading?: boolean;
  /** Nachricht für leere Liste */
  emptyMessage?: string;
  /** Ob ein Button zum Erstellen neuer Sessions angezeigt werden soll */
  showCreateButton?: boolean;
  /** Text für den Button zum Erstellen neuer Sessions */
  createButtonText?: string;
  /** Ob Drag-and-Drop aktiviert sein soll */
  enableDragAndDrop?: boolean;
  /** Ob der User die Sortierung ändern kann */
  enableSorting?: boolean;
  /** Standardsortierung */
  defaultSort?: 'newest' | 'oldest' | 'alphabetical' | 'lastUpdated';
  /** Ob Filterfunktionen verfügbar sein sollen */
  enableFiltering?: boolean;
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  sessions: () => [],
  activeSessionId: null,
  isLoading: false,
  emptyMessage: 'Noch keine Unterhaltungen vorhanden.',
  showCreateButton: true,
  createButtonText: 'Neue Unterhaltung',
  enableDragAndDrop: true,
  enableSorting: true,
  defaultSort: 'lastUpdated',
  enableFiltering: true
});

// Events
const emit = defineEmits<{
  /** Wird ausgelöst, wenn eine Session ausgewählt wird */
  (e: 'select', sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session gelöscht wird */
  (e: 'delete', sessionId: string): void;
  /** Wird ausgelöst, wenn eine Session umbenannt wird */
  (e: 'rename', sessionId: string, newTitle: string): void;
  /** Wird ausgelöst, wenn eine Session angeheftet/abgeheftet wird */
  (e: 'pin', sessionId: string, pinned: boolean): void;
  /** Wird ausgelöst, wenn eine neue Session erstellt werden soll */
  (e: 'create'): void;
  /** Wird ausgelöst, wenn die Reihenfolge der Sessions geändert wurde */
  (e: 'reorder', sessions: ChatSession[]): void;
}>();

// Store
const sessionsStore = useSessionsStore();

// Reaktive Zustände
const searchQuery = ref('');
const currentSort = ref(props.defaultSort);
const showSortOptions = ref(false);
const sortOptionsMenu = ref<HTMLElement | null>(null);
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const contextSession = ref<ChatSession | null>(null);
const showDeleteDialog = ref(false);
const sessionToDelete = ref<ChatSession | null>(null);
const showRenameDialog = ref(false);
const sessionToRename = ref<ChatSession | null>(null);
const renameValue = ref('');
const renameInput = ref<HTMLInputElement | null>(null);
const contextMenu = ref<HTMLElement | null>(null);

// Sortieroptionen
const sortOptions = {
  newest: { label: 'Neueste zuerst', compareFn: (a: ChatSession, b: ChatSession) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
  oldest: { label: 'Älteste zuerst', compareFn: (a: ChatSession, b: ChatSession) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  alphabetical: { label: 'Alphabetisch', compareFn: (a: ChatSession, b: ChatSession) => a.title.localeCompare(b.title) },
  lastUpdated: { label: 'Zuletzt aktualisiert', compareFn: (a: ChatSession, b: ChatSession) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() }
};

// Computed Properties
const filteredSessions = computed(() => {
  if (!searchQuery.value) return props.sessions;
  
  const query = searchQuery.value.toLowerCase().trim();
  return props.sessions.filter(session => 
    session.title.toLowerCase().includes(query)
  );
});

const sortedSessions = computed(() => {
  // Gepinnte Sessions immer oben
  const pinnedSessions = filteredSessions.value.filter(s => s.isPinned);
  const unpinnedSessions = filteredSessions.value.filter(s => !s.isPinned);
  
  // Sortiere beide Gruppen individuell
  const sortFn = sortOptions[currentSort.value].compareFn;
  pinnedSessions.sort(sortFn);
  unpinnedSessions.sort(sortFn);
  
  // Kombiniere beide sortierten Arrays
  return [...pinnedSessions, ...unpinnedSessions];
});

const visibleSessions = computed(() => {
  return sortedSessions.value;
});

// Für Draggable - zweiseitige Bindung ist erfordert
const draggableSessions = computed({
  get: () => visibleSessions.value,
  set: (value) => {
    // Wird von der draggable-Komponente aufgerufen, wenn die Reihenfolge geändert wird
    // Diese Methode speichert nicht sofort, handleDragEnd tut dies
  }
});

// Event Handlers
function handleSearch() {
  // Debounce könnte hier implementiert werden, wenn nötig
}

function clearSearch() {
  searchQuery.value = '';
}

function toggleSortOptions() {
  showSortOptions.value = !showSortOptions.value;
}

function setSortOption(option: string) {
  if (option in sortOptions) {
    currentSort.value = option as keyof typeof sortOptions;
    showSortOptions.value = false;
  }
}

function handleSessionSelect(sessionId: string) {
  emit('select', sessionId);
}

function handleCreateSession() {
  emit('create');
}

function handlePinSession(sessionId: string, pinned: boolean) {
  emit('pin', sessionId, pinned);
}

function handleConfirmDelete(sessionId: string) {
  const session = props.sessions.find(s => s.id === sessionId);
  if (session) {
    sessionToDelete.value = session;
    showDeleteDialog.value = true;
  }
}

function cancelDelete() {
  sessionToDelete.value = null;
  showDeleteDialog.value = false;
}

function confirmDelete() {
  if (sessionToDelete.value) {
    emit('delete', sessionToDelete.value.id);
  }
  cancelDelete();
}

function handleRenameSession(sessionId: string) {
  const session = props.sessions.find(s => s.id === sessionId);
  if (session) {
    sessionToRename.value = session;
    renameValue.value = session.title;
    showRenameDialog.value = true;
    
    // Fokus auf Eingabefeld setzen
    nextTick(() => {
      renameInput.value?.focus();
      renameInput.value?.select();
    });
  }
}

function cancelRename() {
  sessionToRename.value = null;
  renameValue.value = '';
  showRenameDialog.value = false;
}

function confirmRename() {
  if (sessionToRename.value && renameValue.value.trim()) {
    emit('rename', sessionToRename.value.id, renameValue.value.trim());
  }
  cancelRename();
}

function handleDragEnd(event: any) {
  // Damit die neue Reihenfolge gespeichert wird
  emit('reorder', draggableSessions.value);
}

function handleContextMenu(event: MouseEvent, session: ChatSession) {
  event.preventDefault();
  
  // Aktuelle Session setzen
  contextSession.value = session;
  
  // Position des Kontextmenüs berechnen
  // Wir stellen sicher, dass es nicht über den Rand des Fensters hinausragt
  const maxX = window.innerWidth - 200; // Angenommene Breite des Menüs
  const maxY = window.innerHeight - 250; // Angenommene Höhe des Menüs
  
  contextMenuPos.value = {
    x: Math.min(event.clientX, maxX),
    y: Math.min(event.clientY, maxY)
  };
  
  // Menü anzeigen
  showContextMenu.value = true;
  
  // Fokus auf Menü setzen
  nextTick(() => {
    contextMenu.value?.focus();
    
    // Tastatur-Navigation mit Tab auf das Menü beschränken
    contextMenu.value?.querySelector('button')?.focus();
  });
}

function handleContextMenuAction(action: 'rename' | 'pin' | 'delete') {
  if (!contextSession.value) return;
  
  switch(action) {
    case 'rename':
      handleRenameSession(contextSession.value.id);
      break;
    case 'pin':
      emit('pin', contextSession.value.id, !contextSession.value.isPinned);
      break;
    case 'delete':
      handleConfirmDelete(contextSession.value.id);
      break;
  }
  
  // Menü schließen
  showContextMenu.value = false;
}

// Klick außerhalb des Sortiermenüs schließt dieses
function handleOutsideClick(event: MouseEvent) {
  if (showSortOptions.value && sortOptionsMenu.value && !sortOptionsMenu.value.contains(event.target as Node)) {
    showSortOptions.value = false;
  }
  
  if (showContextMenu.value && contextMenu.value && !contextMenu.value.contains(event.target as Node)) {
    showContextMenu.value = false;
  }
}

// Keyboard Handlers
function handleKeyDown(event: KeyboardEvent) {
  // ESC schließt alle geöffneten Menüs
  if (event.key === 'Escape') {
    showSortOptions.value = false;
    showContextMenu.value = false;
    showDeleteDialog.value = false;
    showRenameDialog.value = false;
  }
}

// Lifecycle Hooks
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.n-session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background-color: var(--n-surface-color, #ffffff);
  border-radius: var(--n-border-radius-md, 0.5rem);
  overflow: hidden;
}

/* Header mit Suchfeld und Sortierung */
.n-session-list__header {
  display: flex;
  flex-direction: column;
  gap: var(--n-space-3, 0.75rem);
  padding: var(--n-space-4, 1rem) var(--n-space-4, 1rem) var(--n-space-3, 0.75rem);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  background-color: var(--n-surface-color, #ffffff);
  z-index: 2;
}

.n-session-list__search {
  position: relative;
  width: 100%;
}

.n-session-list__search-input {
  width: 100%;
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  padding-right: var(--n-space-8, 2rem);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  background-color: var(--n-input-bg, #f7fafc);
  color: var(--n-text-color, #2d3748);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.n-session-list__search-input:focus {
  border-color: var(--n-primary-color, #3182ce);
  box-shadow: 0 0 0 3px var(--n-primary-color-light, rgba(49, 130, 206, 0.2));
  outline: none;
}

.n-session-list__search-clear {
  position: absolute;
  right: var(--n-space-2, 0.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--n-text-color-secondary, #718096);
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.n-session-list__search-clear:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-text-color, #2d3748);
}

.n-session-list__search-clear svg {
  width: 16px;
  height: 16px;
}

.n-session-list__sort {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}

.n-session-list__sort-toggle {
  display: flex;
  align-items: center;
  gap: var(--n-space-2, 0.5rem);
  padding: var(--n-space-1, 0.25rem) var(--n-space-2, 0.5rem);
  background: transparent;
  border: none;
  color: var(--n-text-color-secondary, #718096);
  font-size: var(--n-font-size-sm, 0.875rem);
  cursor: pointer;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.n-session-list__sort-toggle:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-text-color, #2d3748);
}

.n-session-list__sort-toggle svg {
  width: 16px;
  height: 16px;
}

.n-session-list__sort-options {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  width: 180px;
  background-color: var(--n-surface-color, #ffffff);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  box-shadow: var(--n-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
  overflow: hidden;
  margin-top: var(--n-space-1, 0.25rem);
}

.n-session-list__sort-option {
  display: block;
  width: 100%;
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  text-align: left;
  background: transparent;
  border: none;
  color: var(--n-text-color, #2d3748);
  font-size: var(--n-font-size-sm, 0.875rem);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-session-list__sort-option:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-session-list__sort-option--active {
  background-color: var(--n-active-color, rgba(49, 130, 206, 0.1));
  color: var(--n-primary-color, #3182ce);
  font-weight: var(--n-font-weight-medium, 500);
}

/* Ladezustand */
.n-session-list--loading .n-session-list__items {
  opacity: 0.5;
  pointer-events: none;
}

.n-session-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--n-space-8, 2rem);
  color: var(--n-text-color-secondary, #718096);
  text-align: center;
  flex: 1;
}

.n-session-list__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--n-border-color, #e2e8f0);
  border-top-color: var(--n-primary-color, #3182ce);
  border-radius: 50%;
  animation: n-session-list-spin 1s linear infinite;
  margin-bottom: var(--n-space-4, 1rem);
}

/* Leer-Zustand */
.n-session-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--n-space-8, 2rem);
  color: var(--n-text-color-secondary, #718096);
  text-align: center;
  flex: 1;
}

.n-session-list__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background-color: var(--n-background-color-light, #f7fafc);
  border-radius: 50%;
  margin-bottom: var(--n-space-4, 1rem);
}

.n-session-list__empty-icon svg {
  width: 32px;
  height: 32px;
  color: var(--n-text-color-tertiary, #a0aec0);
}

.n-session-list__empty-message {
  margin-bottom: var(--n-space-6, 1.5rem);
  font-size: var(--n-font-size-md, 1rem);
  max-width: 300px;
}

.n-session-list__create-btn {
  display: flex;
  align-items: center;
  gap: var(--n-space-2, 0.5rem);
  padding: var(--n-space-2, 0.5rem) var(--n-space-4, 1rem);
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.n-session-list__create-btn:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-session-list__create-btn:active {
  transform: scale(0.98);
}

.n-session-list__create-btn svg {
  width: 16px;
  height: 16px;
}

/* Session-Liste */
.n-session-list__items {
  flex: 1;
  overflow-y: auto;
  padding: var(--n-space-2, 0.5rem);
}

/* Drag-and-Drop Styling */
.n-session-list__item--ghost {
  opacity: 0.5;
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-session-list__item--chosen {
  background-color: var(--n-active-color, rgba(49, 130, 206, 0.1));
}

.n-session-list__item--drag {
  cursor: grabbing;
}

/* Floating Create Button */
.n-session-list__create-floating-btn {
  position: absolute;
  bottom: var(--n-space-4, 1rem);
  right: var(--n-space-4, 1rem);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--n-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  transition: background-color 0.2s ease, transform 0.1s ease;
  z-index: 5;
}

.n-session-list__create-floating-btn:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-session-list__create-floating-btn:active {
  transform: scale(0.95);
}

.n-session-list__create-floating-btn svg {
  width: 24px;
  height: 24px;
}

/* Kontextmenü */
.n-session-list__context-menu {
  position: fixed;
  z-index: 1000;
  width: 220px;
  background-color: var(--n-surface-color, #ffffff);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  box-shadow: var(--n-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  overflow: hidden;
}

.n-session-list__context-menu-header {
  padding: var(--n-space-3, 0.75rem);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-session-list__context-menu-title {
  font-weight: var(--n-font-weight-medium, 500);
  font-size: var(--n-font-size-sm, 0.875rem);
  color: var(--n-text-color, #2d3748);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.n-session-list__context-menu-content {
  padding: var(--n-space-1, 0.25rem);
}

.n-session-list__context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--n-space-3, 0.75rem);
  width: 100%;
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  background: transparent;
  border: none;
  text-align: left;
  font-size: var(--n-font-size-sm, 0.875rem);
  color: var(--n-text-color, #2d3748);
  cursor: pointer;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  transition: background-color 0.2s ease;
}

.n-session-list__context-menu-item:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-session-list__context-menu-item svg {
  width: 16px;
  height: 16px;
}

.n-session-list__context-menu-item--danger {
  color: var(--n-danger-color, #e53e3e);
}

.n-session-list__context-menu-item--danger:hover {
  background-color: var(--n-danger-color-light, rgba(229, 62, 62, 0.1));
}

/* Dialoge */
.n-session-list__delete-dialog,
.n-session-list__rename-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.n-session-list__delete-dialog-content,
.n-session-list__rename-dialog-content {
  width: 100%;
  max-width: 400px;
  background-color: var(--n-surface-color, #ffffff);
  border-radius: var(--n-border-radius-lg, 0.75rem);
  box-shadow: var(--n-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04));
  overflow: hidden;
}

.n-session-list__delete-dialog-title,
.n-session-list__rename-dialog-title {
  padding: var(--n-space-4, 1rem) var(--n-space-4, 1rem) var(--n-space-2, 0.5rem);
  margin: 0;
  font-size: var(--n-font-size-lg, 1.125rem);
  font-weight: var(--n-font-weight-semibold, 600);
  color: var(--n-text-color, #2d3748);
}

.n-session-list__delete-dialog-message {
  padding: 0 var(--n-space-4, 1rem) var(--n-space-4, 1rem);
  margin: 0;
  color: var(--n-text-color-secondary, #718096);
  font-size: var(--n-font-size-md, 1rem);
}

.n-session-list__rename-dialog-input-container {
  padding: 0 var(--n-space-4, 1rem) var(--n-space-4, 1rem);
}

.n-session-list__rename-dialog-input {
  width: 100%;
  padding: var(--n-space-2, 0.5rem) var(--n-space-3, 0.75rem);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-md, 1rem);
  color: var(--n-text-color, #2d3748);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.n-session-list__rename-dialog-input:focus {
  border-color: var(--n-primary-color, #3182ce);
  box-shadow: 0 0 0 3px var(--n-primary-color-light, rgba(49, 130, 206, 0.2));
  outline: none;
}

.n-session-list__delete-dialog-actions,
.n-session-list__rename-dialog-actions {
  display: flex;
  justify-content: flex-end;
  padding: var(--n-space-4, 1rem);
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  gap: var(--n-space-3, 0.75rem);
}

.n-session-list__delete-dialog-btn,
.n-session-list__rename-dialog-btn {
  padding: var(--n-space-2, 0.5rem) var(--n-space-4, 1rem);
  border: none;
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-session-list__delete-dialog-btn--cancel,
.n-session-list__rename-dialog-btn--cancel {
  background-color: var(--n-button-secondary-bg, #edf2f7);
  color: var(--n-text-color, #2d3748);
}

.n-session-list__delete-dialog-btn--cancel:hover,
.n-session-list__rename-dialog-btn--cancel:hover {
  background-color: var(--n-button-secondary-hover-bg, #e2e8f0);
}

.n-session-list__delete-dialog-btn--danger {
  background-color: var(--n-danger-color, #e53e3e);
  color: white;
}

.n-session-list__delete-dialog-btn--danger:hover {
  background-color: var(--n-danger-color-dark, #c53030);
}

.n-session-list__rename-dialog-btn--confirm {
  background-color: var(--n-primary-color, #3182ce);
  color: white;
}

.n-session-list__rename-dialog-btn--confirm:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-session-list__rename-dialog-btn--confirm:disabled {
  background-color: var(--n-disabled-bg, #cbd5e1);
  color: var(--n-disabled-color, #718096);
  cursor: not-allowed;
}

/* Animationen */
@keyframes n-session-list-spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-session-list__header {
    padding: var(--n-space-3, 0.75rem);
  }
  
  .n-session-list__sort-toggle {
    padding: var(--n-space-1, 0.25rem);
  }
  
  .n-session-list__sort-text {
    display: none;
  }
  
  .n-session-list__create-floating-btn {
    bottom: var(--n-space-3, 0.75rem);
    right: var(--n-space-3, 0.75rem);
  }
}
</style>