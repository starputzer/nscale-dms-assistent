<template>
  <div 
    class="n-session-manager"
    :class="{ 
      'n-session-manager--loading': loading, 
      'n-session-manager--collapsed': collapsed
    }"
    role="navigation"
    aria-label="Chat-Sitzungen"
  >
    <!-- Header mit Titel und Aktionen -->
    <div class="n-session-manager__header">
      <h2 
        class="n-session-manager__title"
        :id="headerId"
      >
        {{ title }}
      </h2>
      
      <div class="n-session-manager__header-actions">
        <!-- Suchfeld-Toggle -->
        <button 
          v-if="searchEnabled" 
          class="n-session-manager__action-btn"
          :class="{ 'n-session-manager__action-btn--active': isSearchVisible }"
          @click="toggleSearch"
          :aria-label="isSearchVisible ? 'Suche ausblenden' : 'Suche anzeigen'"
          :aria-expanded="isSearchVisible"
        >
          <span class="n-session-manager__icon n-session-manager__icon--search"></span>
        </button>
        
        <!-- Collapse-Button -->
        <button 
          class="n-session-manager__action-btn"
          @click="$emit('toggle-collapse')"
          :aria-label="collapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'"
          :aria-expanded="!collapsed"
        >
          <span 
            class="n-session-manager__icon"
            :class="collapsed ? 'n-session-manager__icon--expand' : 'n-session-manager__icon--collapse'"
          ></span>
        </button>
      </div>
    </div>
    
    <!-- Suchfeld (wenn sichtbar) -->
    <div 
      v-if="searchEnabled && isSearchVisible" 
      class="n-session-manager__search"
    >
      <div class="n-session-manager__search-input-container">
        <input
          ref="searchInput"
          v-model="searchQuery"
          class="n-session-manager__search-input"
          type="text"
          placeholder="Sitzungen durchsuchen..."
          aria-label="Sitzungen durchsuchen"
        />
        <button 
          v-if="searchQuery" 
          class="n-session-manager__search-clear"
          @click="clearSearch"
          aria-label="Suche zurücksetzen"
        >
          <span class="n-session-manager__icon n-session-manager__icon--clear"></span>
        </button>
      </div>
    </div>
    
    <!-- Aktionsbereich (neue Sitzung erstellen) -->
    <div class="n-session-manager__actions">
      <button 
        class="n-session-manager__new-session-btn"
        @click="createNewSession"
        :disabled="loading || maxSessionsReached"
        aria-label="Neue Unterhaltung starten"
      >
        <span class="n-session-manager__icon n-session-manager__icon--plus"></span>
        <span class="n-session-manager__btn-text">Neue Unterhaltung</span>
      </button>
    </div>
    
    <!-- Sitzungsliste mit Virtualisierung und Drag & Drop -->
    <div
      v-if="loading"
      class="n-session-manager__loading"
      aria-live="polite"
    >
      <div class="n-session-manager__spinner" aria-hidden="true"></div>
      <span>Lade Sitzungen...</span>
    </div>
    
    <div
      v-else
      ref="sessionListContainer"
      class="n-session-manager__session-list"
      :aria-labelledby="headerId"
    >
      <transition-group
        name="session-list"
        tag="ul"
        class="n-session-manager__list"
        role="listbox"
        :aria-activedescendant="currentSessionId ? `session-${currentSessionId}` : undefined"
      >
        <!-- Meldung, wenn keine Sitzungen gefunden wurden -->
        <li 
          v-if="filteredSessions.length === 0" 
          key="empty"
          class="n-session-manager__empty"
          role="option"
          aria-selected="false"
        >
          <p v-if="searchQuery">Keine Sitzungen gefunden für "<strong>{{ searchQuery }}</strong>"</p>
          <p v-else>Keine Sitzungen vorhanden</p>
        </li>
        
        <!-- Sortierbare Sitzungsliste -->
        <VueDraggable
          v-else
          v-model="draggedSessions"
          v-bind="dragOptions"
          item-key="id"
          handle=".n-session-manager__drag-handle"
          tag="div"
          :disabled="!sortable || !!searchQuery"
          @end="onDragEnd"
        >
          <template #item="{element}">
            <li
              :key="element.id"
              :id="`session-${element.id}`"
              class="n-session-manager__session"
              :class="{
                'n-session-manager__session--active': element.id === currentSessionId,
                'n-session-manager__session--pinned': element.isPinned
              }"
              :aria-selected="element.id === currentSessionId"
              role="option"
              @click="selectSession(element.id)"
              @keydown="handleSessionKeydown($event, element.id)"
              tabindex="0"
            >
              <!-- Drag-Handle (wenn sortierbar) -->
              <div 
                v-if="sortable && !searchQuery"
                class="n-session-manager__drag-handle"
                aria-hidden="true"
              >
                <span class="n-session-manager__icon n-session-manager__icon--drag"></span>
              </div>
              
              <!-- Pin-Icon (wenn angeheftet) -->
              <div 
                v-if="element.isPinned"
                class="n-session-manager__pin-indicator"
                aria-hidden="true"
              >
                <span class="n-session-manager__icon n-session-manager__icon--pin"></span>
              </div>
              
              <!-- Sitzungstitel -->
              <div class="n-session-manager__session-title">
                <span>{{ element.title }}</span>
              </div>
              
              <!-- Sitzungsdatum -->
              <div class="n-session-manager__session-date">
                <span>{{ formatDate(element.updatedAt) }}</span>
              </div>
              
              <!-- Aktionsmenü -->
              <div class="n-session-manager__session-actions">
                <button
                  class="n-session-manager__session-action-btn"
                  @click.stop="toggleSessionMenu(element.id)"
                  aria-label="Sitzungsaktionen"
                  :aria-expanded="openMenuId === element.id"
                  :aria-controls="openMenuId === element.id ? `menu-${element.id}` : undefined"
                >
                  <span class="n-session-manager__icon n-session-manager__icon--menu"></span>
                </button>
                
                <!-- Dropdown-Menü -->
                <div 
                  v-if="openMenuId === element.id"
                  :id="`menu-${element.id}`"
                  class="n-session-manager__menu"
                  role="menu"
                >
                  <button
                    class="n-session-manager__menu-item"
                    @click.stop="renameSession(element.id, element.title)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--edit"></span>
                    <span>Umbenennen</span>
                  </button>
                  
                  <button
                    class="n-session-manager__menu-item"
                    @click.stop="togglePinSession(element.id, !element.isPinned)"
                    role="menuitem"
                  >
                    <span 
                      class="n-session-manager__icon"
                      :class="element.isPinned ? 'n-session-manager__icon--unpin' : 'n-session-manager__icon--pin'"
                    ></span>
                    <span>{{ element.isPinned ? 'Loslösen' : 'Anheften' }}</span>
                  </button>
                  
                  <button
                    class="n-session-manager__menu-item n-session-manager__menu-item--danger"
                    @click.stop="confirmDeleteSession(element.id)"
                    role="menuitem"
                  >
                    <span class="n-session-manager__icon n-session-manager__icon--delete"></span>
                    <span>Löschen</span>
                  </button>
                </div>
              </div>
            </li>
          </template>
        </VueDraggable>
      </transition-group>
    </div>
    
    <!-- Rename Dialog -->
    <div 
      v-if="renameDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelRename"
      aria-hidden="true"
    ></div>
    
    <div 
      v-if="renameDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="rename-dialog-title"
      aria-describedby="rename-dialog-description"
    >
      <h3 id="rename-dialog-title" class="n-session-manager__dialog-title">
        Sitzung umbenennen
      </h3>
      <p id="rename-dialog-description" class="n-session-manager__dialog-description">
        Geben Sie einen neuen Namen für die Sitzung ein.
      </p>
      
      <div class="n-session-manager__dialog-content">
        <input 
          ref="renameInput"
          v-model="newSessionTitle" 
          class="n-session-manager__dialog-input"
          type="text"
          @keydown.enter="confirmRename"
          @keydown.esc="cancelRename"
          aria-label="Neuer Sitzungsname"
        />
      </div>
      
      <div class="n-session-manager__dialog-actions">
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelRename"
        >
          Abbrechen
        </button>
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--primary"
          @click="confirmRename"
          :disabled="!newSessionTitle.trim()"
        >
          Speichern
        </button>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div 
      v-if="deleteDialogVisible"
      class="n-session-manager__dialog-backdrop"
      @click="cancelDelete"
      aria-hidden="true"
    ></div>
    
    <div 
      v-if="deleteDialogVisible"
      class="n-session-manager__dialog"
      role="dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <h3 id="delete-dialog-title" class="n-session-manager__dialog-title">
        Sitzung löschen
      </h3>
      <p id="delete-dialog-description" class="n-session-manager__dialog-description">
        Möchten Sie diese Sitzung wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
      </p>
      
      <div class="n-session-manager__dialog-actions">
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--secondary"
          @click="cancelDelete"
        >
          Abbrechen
        </button>
        <button 
          class="n-session-manager__dialog-btn n-session-manager__dialog-btn--danger"
          @click="confirmDelete"
        >
          Löschen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import VueDraggable from 'vuedraggable';
import type { ChatSession } from '@/types/session';

// Eindeutige ID für ARIA-Zwecke
const headerId = `session-manager-heading-${uuidv4().slice(0, 8)}`;

// Props Definition
interface Props {
  /**
   * Liste der verfügbaren Sitzungen
   */
  sessions: ChatSession[];
  
  /**
   * ID der aktuell ausgewählten Sitzung
   */
  currentSessionId?: string | null;
  
  /**
   * Titel der Komponente
   */
  title?: string;
  
  /**
   * Ladezustand
   */
  loading?: boolean;
  
  /**
   * Ob die Suchfunktionalität aktiviert ist
   */
  searchEnabled?: boolean;
  
  /**
   * Ob Sitzungen per Drag & Drop neu angeordnet werden können
   */
  sortable?: boolean;
  
  /**
   * Ob die Seitenleiste eingeklappt ist
   */
  collapsed?: boolean;
  
  /**
   * Maximal anzuzeigende Sitzungen (0 = unbegrenzt)
   */
  maxSessions?: number;
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  currentSessionId: null,
  title: 'Unterhaltungen',
  loading: false,
  searchEnabled: true,
  sortable: true,
  collapsed: false,
  maxSessions: 0
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Wird ausgelöst, wenn eine Sitzung ausgewählt wird
   */
  (e: 'session-selected', sessionId: string): void;
  
  /**
   * Wird ausgelöst, wenn eine neue Sitzung erstellt werden soll
   */
  (e: 'session-created', title?: string): void;
  
  /**
   * Wird ausgelöst, wenn eine Sitzung gelöscht werden soll
   */
  (e: 'session-deleted', sessionId: string): void;
  
  /**
   * Wird ausgelöst, wenn eine Sitzung umbenannt werden soll
   */
  (e: 'session-updated', payload: { id: string, title: string }): void;
  
  /**
   * Wird ausgelöst, wenn der Pin-Status einer Sitzung geändert werden soll
   */
  (e: 'session-pinned', payload: { id: string, isPinned: boolean }): void;
  
  /**
   * Wird ausgelöst, wenn die Reihenfolge der Sitzungen geändert wird
   */
  (e: 'sessions-reordered', sessionIds: string[]): void;
  
  /**
   * Wird ausgelöst, wenn die Seitenleiste ein-/ausgeklappt werden soll
   */
  (e: 'toggle-collapse'): void;
}>();

// Lokale Zustände
const searchQuery = ref('');
const isSearchVisible = ref(false);
const openMenuId = ref<string | null>(null);
const draggedSessions = ref<ChatSession[]>([...props.sessions]);

// Dialog-Zustände
const renameDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const sessionToRenameId = ref<string | null>(null);
const sessionToDeleteId = ref<string | null>(null);
const newSessionTitle = ref('');

// Element-Referenzen
const sessionListContainer = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

// Computed Properties
const filteredSessions = computed(() => {
  if (!searchQuery.value) {
    return draggedSessions.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return draggedSessions.value.filter(session => 
    session.title.toLowerCase().includes(query)
  );
});

const maxSessionsReached = computed(() => {
  return props.maxSessions > 0 && props.sessions.length >= props.maxSessions;
});

// Drag & Drop Konfiguration
const dragOptions = computed(() => ({
  animation: 150,
  ghostClass: 'n-session-manager__session--ghost',
  chosenClass: 'n-session-manager__session--chosen',
  dragClass: 'n-session-manager__session--drag',
  group: 'sessions',
  disabled: !props.sortable || !!searchQuery.value
}));

// Methoden
function selectSession(sessionId: string): void {
  if (sessionId !== props.currentSessionId) {
    emit('session-selected', sessionId);
  }
}

function createNewSession(): void {
  if (props.loading || maxSessionsReached.value) return;
  
  emit('session-created', 'Neue Unterhaltung');
}

function renameSession(sessionId: string, currentTitle: string): void {
  sessionToRenameId.value = sessionId;
  newSessionTitle.value = currentTitle;
  renameDialogVisible.value = true;
  openMenuId.value = null;
  
  // Fokus auf Eingabefeld setzen
  nextTick(() => {
    if (renameInput.value) {
      renameInput.value.focus();
      renameInput.value.select();
    }
  });
}

function confirmRename(): void {
  if (sessionToRenameId.value && newSessionTitle.value.trim()) {
    emit('session-updated', {
      id: sessionToRenameId.value,
      title: newSessionTitle.value.trim()
    });
    
    renameDialogVisible.value = false;
    sessionToRenameId.value = null;
    newSessionTitle.value = '';
  }
}

function cancelRename(): void {
  renameDialogVisible.value = false;
  sessionToRenameId.value = null;
  newSessionTitle.value = '';
}

function confirmDeleteSession(sessionId: string): void {
  sessionToDeleteId.value = sessionId;
  deleteDialogVisible.value = true;
  openMenuId.value = null;
}

function confirmDelete(): void {
  if (sessionToDeleteId.value) {
    emit('session-deleted', sessionToDeleteId.value);
    deleteDialogVisible.value = false;
    sessionToDeleteId.value = null;
  }
}

function cancelDelete(): void {
  deleteDialogVisible.value = false;
  sessionToDeleteId.value = null;
}

function togglePinSession(sessionId: string, isPinned: boolean): void {
  emit('session-pinned', { id: sessionId, isPinned });
  openMenuId.value = null;
}

function toggleSessionMenu(sessionId: string): void {
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId;
}

function toggleSearch(): void {
  isSearchVisible.value = !isSearchVisible.value;
  
  if (isSearchVisible.value) {
    // Fokus auf Suchfeld setzen
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  } else {
    clearSearch();
  }
}

function clearSearch(): void {
  searchQuery.value = '';
}

function onDragEnd(): void {
  if (searchQuery.value) return;
  
  const sessionIds = draggedSessions.value.map(session => session.id);
  emit('sessions-reordered', sessionIds);
}

function handleSessionKeydown(event: KeyboardEvent, sessionId: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectSession(sessionId);
  }
  
  // Tastaturnavigation durch die Sitzungsliste
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    
    const sessions = filteredSessions.value;
    const currentIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % sessions.length;
    } else {
      nextIndex = (currentIndex - 1 + sessions.length) % sessions.length;
    }
    
    // Nächste Sitzung finden und fokussieren
    const nextSessionId = sessions[nextIndex].id;
    const nextElement = document.getElementById(`session-${nextSessionId}`);
    
    if (nextElement) {
      nextElement.focus();
    }
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: de });
    } else if (isYesterday(date)) {
      return 'Gestern';
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: de });
    } else if (isThisYear(date)) {
      return format(date, 'd. MMM', { locale: de });
    } else {
      return format(date, 'd. MMM yyyy', { locale: de });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

// Außerhalb-Klick-Handler für Menüs
function handleOutsideClick(event: MouseEvent): void {
  if (openMenuId.value) {
    const clickedElement = event.target as HTMLElement;
    const menuElement = document.getElementById(`menu-${openMenuId.value}`);
    
    if (menuElement && !menuElement.contains(clickedElement)) {
      // Prüfen, ob auf einen Menü-Button geklickt wurde
      const isMenuButton = clickedElement.classList.contains('n-session-manager__session-action-btn') ||
                           clickedElement.closest('.n-session-manager__session-action-btn');
      
      if (!isMenuButton) {
        openMenuId.value = null;
      }
    }
  }
}

// Zuhörer für Escape-Taste zum Schließen von Dialogen
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (renameDialogVisible.value) {
      cancelRename();
    } else if (deleteDialogVisible.value) {
      cancelDelete();
    } else if (openMenuId.value) {
      openMenuId.value = null;
    } else if (isSearchVisible.value) {
      toggleSearch();
    }
  }
}

// Lifecycle Hooks
onMounted(() => {
  // Event-Listener hinzufügen
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  // Event-Listener entfernen
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleKeydown);
});

// Watches
watch(() => props.sessions, (newSessions) => {
  // Nur aktualisieren, wenn nicht im Drag-Modus
  if (!openMenuId.value) {
    draggedSessions.value = [...newSessions];
  }
}, { deep: true });

// Stellt sicher, dass die aktuelle Sitzung im sichtbaren Bereich ist
watch(() => props.currentSessionId, (newId) => {
  if (newId) {
    nextTick(() => {
      const currentElement = document.getElementById(`session-${newId}`);
      if (currentElement && sessionListContainer.value) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
});
</script>

<style scoped>
.n-session-manager {
  display: flex;
  flex-direction: column;
  width: var(--nscale-sidebar-width, 300px);
  height: 100%;
  background-color: var(--nscale-surface-color, #f8fafc);
  border-right: 1px solid var(--nscale-border-color, #e2e8f0);
  transition: width 0.2s ease;
  position: relative;
  overflow: hidden;
}

/* Eingeklappter Zustand */
.n-session-manager--collapsed {
  width: var(--nscale-sidebar-collapsed-width, 60px);
}

/* Header-Bereich */
.n-session-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  color: var(--nscale-text, #1a202c);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-session-manager__header-actions {
  display: flex;
  gap: var(--nscale-space-1, 0.25rem);
}

.n-session-manager__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
  color: var(--nscale-text-secondary, #64748b);
  transition: all 0.2s ease;
}

.n-session-manager__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__action-btn--active {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  color: var(--nscale-primary, #00a550);
}

/* Suchfeld */
.n-session-manager__search {
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.n-session-manager__search-input {
  width: 100%;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
  padding-right: var(--nscale-space-8, 2rem);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  background-color: var(--nscale-input-bg, #ffffff);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__search-input:focus {
  outline: none;
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 2px var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__search-clear {
  position: absolute;
  right: var(--nscale-space-2, 0.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background-color: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
}

.n-session-manager__search-clear:hover {
  color: var(--nscale-text-secondary, #64748b);
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

/* Aktionsbereich */
.n-session-manager__actions {
  padding: var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-session-manager__new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border: 1px solid var(--nscale-primary, #00a550);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  background-color: var(--nscale-primary, #00a550);
  color: white;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-session-manager__new-session-btn:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
}

.n-session-manager__new-session-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.n-session-manager__btn-text {
  margin-left: var(--nscale-space-2, 0.5rem);
}

/* Sitzungsliste */
.n-session-manager__session-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--nscale-space-2, 0.5rem) 0;
}

.n-session-manager__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.n-session-manager__session {
  display: flex;
  align-items: center;
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.n-session-manager__session:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__session:focus {
  outline: 2px solid var(--nscale-primary, #00a550);
  outline-offset: -2px;
}

.n-session-manager__session--active {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
}

.n-session-manager__session--pinned {
  border-left: 3px solid var(--nscale-primary, #00a550);
}

/* Drag & Drop Styling */
.n-session-manager__session--ghost {
  opacity: 0.5;
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
}

.n-session-manager__session--chosen {
  background-color: var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__session--drag {
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.n-session-manager__drag-handle {
  margin-right: var(--nscale-space-2, 0.5rem);
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.n-session-manager__session:hover .n-session-manager__drag-handle {
  opacity: 1;
}

.n-session-manager__pin-indicator {
  margin-right: var(--nscale-space-2, 0.5rem);
  color: var(--nscale-primary, #00a550);
}

.n-session-manager__session-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__session-date {
  margin-left: var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  white-space: nowrap;
}

.n-session-manager__session-actions {
  margin-left: var(--nscale-space-2, 0.5rem);
  position: relative;
}

.n-session-manager__session-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
  opacity: 0;
  transition: all 0.2s ease;
}

.n-session-manager__session:hover .n-session-manager__session-action-btn,
.n-session-manager__session:focus .n-session-manager__session-action-btn,
.n-session-manager__session--active .n-session-manager__session-action-btn {
  opacity: 1;
}

.n-session-manager__session-action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.1));
  color: var(--nscale-text-secondary, #64748b);
}

/* Sitzungsmenü */
.n-session-manager__menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 150px;
  background-color: white;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  padding: var(--nscale-space-1, 0.25rem);
}

.n-session-manager__menu-item {
  display: flex;
  align-items: center;
  padding: var(--nscale-space-2, 0.5rem);
  border: none;
  background-color: transparent;
  width: 100%;
  text-align: left;
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text, #1a202c);
  cursor: pointer;
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
}

.n-session-manager__menu-item:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__menu-item--danger {
  color: var(--nscale-error, #dc2626);
}

.n-session-manager__menu-item--danger:hover {
  background-color: var(--nscale-error-light, #fee2e2);
}

.n-session-manager__menu-item .n-session-manager__icon {
  margin-right: var(--nscale-space-2, 0.5rem);
}

/* Leere/Lademeldung */
.n-session-manager__empty,
.n-session-manager__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--nscale-space-6, 1.5rem);
  color: var(--nscale-text-secondary, #64748b);
  text-align: center;
  font-size: var(--nscale-font-size-sm, 0.875rem);
}

.n-session-manager__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--nscale-border-color, #e2e8f0);
  border-top-color: var(--nscale-primary, #00a550);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--nscale-space-4, 1rem);
}

/* Dialog */
.n-session-manager__dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-session-manager__dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: var(--nscale-border-radius-lg, 0.75rem);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90vw;
  z-index: 101;
  overflow: hidden;
  padding: var(--nscale-space-6, 1.5rem);
}

.n-session-manager__dialog-title {
  font-size: var(--nscale-font-size-lg, 1.125rem);
  font-weight: var(--nscale-font-weight-semibold, 600);
  color: var(--nscale-text, #1a202c);
  margin: 0 0 var(--nscale-space-2, 0.5rem);
}

.n-session-manager__dialog-description {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  margin: 0 0 var(--nscale-space-4, 1rem);
}

.n-session-manager__dialog-content {
  margin-bottom: var(--nscale-space-6, 1.5rem);
}

.n-session-manager__dialog-input {
  width: 100%;
  padding: var(--nscale-space-3, 0.75rem);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-md, 1rem);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__dialog-input:focus {
  outline: none;
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 2px var(--nscale-primary-light, #e0f5ea);
}

.n-session-manager__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nscale-space-3, 0.75rem);
}

.n-session-manager__dialog-btn {
  padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-4, 1rem);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  font-weight: var(--nscale-font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-session-manager__dialog-btn--secondary {
  background-color: transparent;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  color: var(--nscale-text, #1a202c);
}

.n-session-manager__dialog-btn--secondary:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-session-manager__dialog-btn--primary {
  background-color: var(--nscale-primary, #00a550);
  color: white;
  border: 1px solid var(--nscale-primary, #00a550);
}

.n-session-manager__dialog-btn--primary:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
}

.n-session-manager__dialog-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.n-session-manager__dialog-btn--danger {
  background-color: var(--nscale-error, #dc2626);
  color: white;
  border: 1px solid var(--nscale-error, #dc2626);
}

.n-session-manager__dialog-btn--danger:hover {
  background-color: var(--nscale-error-dark, #b91c1c);
}

/* Icons */
.n-session-manager__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  position: relative;
}

.n-session-manager__icon--plus::before,
.n-session-manager__icon--plus::after {
  content: '';
  position: absolute;
  background-color: currentColor;
}

.n-session-manager__icon--plus::before {
  width: 12px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.n-session-manager__icon--plus::after {
  width: 2px;
  height: 12px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.n-session-manager__icon--search::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 3px;
  left: 3px;
}

.n-session-manager__icon--search::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 6px;
  background-color: currentColor;
  transform: rotate(45deg);
  bottom: 3px;
  right: 5px;
}

.n-session-manager__icon--clear::before,
.n-session-manager__icon--clear::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 12px;
  background-color: currentColor;
  top: 50%;
  left: 50%;
}

.n-session-manager__icon--clear::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.n-session-manager__icon--clear::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.n-session-manager__icon--collapse::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translate(-2px, 0) rotate(45deg);
}

.n-session-manager__icon--expand::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-right: 2px solid currentColor;
  border-top: 2px solid currentColor;
  transform: translate(0, 0) rotate(45deg);
}

.n-session-manager__icon--drag::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 2px;
  background-color: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--pin::before {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--pin::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 10px;
  background-color: currentColor;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--unpin::before {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 2px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.n-session-manager__icon--unpin::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 10px;
  background-color: currentColor;
  top: 7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.n-session-manager__icon--menu::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background-color: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.n-session-manager__icon--edit::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background-color: currentColor;
  transform: rotate(45deg);
  top: 14px;
  left: 6px;
}

.n-session-manager__icon--delete::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 14px;
  border: 2px solid currentColor;
  border-top: none;
  border-radius: 0 0 2px 2px;
  top: 6px;
  left: 4px;
}

.n-session-manager__icon--delete::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 2px;
  background-color: currentColor;
  top: 4px;
  left: 6px;
  box-shadow: -3px 0 0 currentColor, 3px 0 0 currentColor;
}

/* Transition-Animationen */
.session-list-enter-active,
.session-list-leave-active {
  transition: all 0.3s ease;
}

.session-list-enter-from,
.session-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Animationen */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Eingeklappte Ansicht */
.n-session-manager--collapsed .n-session-manager__btn-text,
.n-session-manager--collapsed .n-session-manager__session-title,
.n-session-manager--collapsed .n-session-manager__session-date,
.n-session-manager--collapsed .n-session-manager__title,
.n-session-manager--collapsed .n-session-manager__search,
.n-session-manager--collapsed .n-session-manager__pin-indicator,
.n-session-manager--collapsed .n-session-manager__drag-handle,
.n-session-manager--collapsed .n-session-manager__session-actions {
  display: none;
}

.n-session-manager--collapsed .n-session-manager__new-session-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  margin: 0 auto;
}

.n-session-manager--collapsed .n-session-manager__session {
  padding: var(--nscale-space-2, 0.5rem);
  justify-content: center;
}

/* Responsive Design (für kleinere Bildschirme) */
@media (max-width: 768px) {
  .n-session-manager {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  }
  
  .n-session-manager--collapsed {
    width: var(--nscale-sidebar-collapsed-width, 60px);
  }
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-session-manager__spinner {
    animation: none;
  }
  
  .session-list-enter-active,
  .session-list-leave-active {
    transition: none;
  }
}
</style>