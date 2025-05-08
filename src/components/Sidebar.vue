<template>
  <aside class="n-sidebar" :class="{ 'n-sidebar--collapsed': isSidebarCollapsed }">
    <div class="n-sidebar__header">
      <h2 class="n-sidebar__title">{{ title }}</h2>
      <button 
        class="n-sidebar__toggle-btn" 
        @click="toggleSidebar" 
        :title="isSidebarCollapsed ? 'Seitenleiste einblenden' : 'Seitenleiste ausblenden'"
        type="button"
      >
        <svg 
          class="n-sidebar__toggle-icon" 
          :class="{ 'n-sidebar__toggle-icon--collapsed': isSidebarCollapsed }"
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    </div>
    
    <div class="n-sidebar__content">
      <div v-if="isLoading" class="n-sidebar__loading">
        <div class="n-sidebar__loading-spinner"></div>
        <span class="n-sidebar__loading-text">Lade {{ itemsName }}...</span>
      </div>
      
      <div v-else-if="items.length === 0" class="n-sidebar__empty">
        <div class="n-sidebar__empty-icon">
          <slot name="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </slot>
        </div>
        <p class="n-sidebar__empty-message">{{ emptyMessage }}</p>
        <button v-if="showCreateButton" class="n-sidebar__create-btn" @click="$emit('create')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span class="n-sidebar__create-text">{{ createButtonText }}</span>
        </button>
      </div>
      
      <ul v-else class="n-sidebar__list">
        <li 
          v-for="item in items" 
          :key="item.id"
          class="n-sidebar__item" 
          :class="{ 'n-sidebar__item--active': activeItemId === item.id }"
          @click="selectItem(item.id)"
        >
          <div class="n-sidebar__item-content">
            <div class="n-sidebar__item-icon">
              <slot name="item-icon" :item="item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </slot>
            </div>
            <span class="n-sidebar__item-label">{{ item.title || item.name }}</span>
          </div>
          
          <div class="n-sidebar__item-actions">
            <slot name="item-actions" :item="item">
              <button 
                v-if="enableDelete"
                class="n-sidebar__item-delete" 
                @click.stop="confirmDeleteItem(item.id)"
                type="button"
                :title="`${deleteItemLabel} löschen`"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </slot>
          </div>
        </li>
      </ul>
    </div>
    
    <div class="n-sidebar__footer">
      <slot name="footer"></slot>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="n-sidebar__delete-dialog">
      <div class="n-sidebar__delete-dialog-content">
        <p class="n-sidebar__delete-dialog-message">{{ deleteConfirmMessage }}</p>
        <div class="n-sidebar__delete-dialog-actions">
          <button 
            class="n-sidebar__delete-dialog-button n-sidebar__delete-dialog-button--cancel" 
            @click="cancelDelete"
            type="button"
          >
            Abbrechen
          </button>
          <button 
            class="n-sidebar__delete-dialog-button n-sidebar__delete-dialog-button--confirm" 
            @click="deleteItem"
            type="button"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUIStore } from '../stores/ui';

export interface SidebarItem {
  id: string;
  title?: string;
  name?: string;
  [key: string]: any;
}

export interface SidebarProps {
  /** Titel der Sidebar */
  title?: string;
  /** Liste der anzuzeigenden Elemente */
  items?: SidebarItem[];
  /** ID des aktiven Elements */
  activeItemId?: string;
  /** Text für leere Liste */
  emptyMessage?: string;
  /** Name der Elemente (für Ladeanzeige) */
  itemsName?: string;
  /** Ob Elemente löschbar sind */
  enableDelete?: boolean;
  /** Label für zu löschende Elemente */
  deleteItemLabel?: string;
  /** Ob ein "Erstellen"-Button angezeigt werden soll */
  showCreateButton?: boolean;
  /** Text für den "Erstellen"-Button */
  createButtonText?: string;
  /** Bestätigungstext für das Löschen */
  deleteConfirmMessage?: string;
  /** Ob die Sidebar gerade lädt */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<SidebarProps>(), {
  title: 'Unterhaltungen',
  items: () => [],
  emptyMessage: 'Keine Elemente vorhanden',
  itemsName: 'Elemente',
  enableDelete: true,
  deleteItemLabel: 'Element',
  showCreateButton: true,
  createButtonText: 'Neu erstellen',
  deleteConfirmMessage: 'Element wirklich löschen?',
  isLoading: false
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn ein Element ausgewählt wird */
  (e: 'select', id: string): void;
  /** Wird ausgelöst, wenn ein Element gelöscht wird */
  (e: 'delete', id: string): void;
  /** Wird ausgelöst, wenn ein neues Element erstellt werden soll */
  (e: 'create'): void;
  /** Wird ausgelöst, wenn die Sidebar ein-/ausgeklappt wird */
  (e: 'toggle-collapse', collapsed: boolean): void;
}>();

// UI Store für globalen Status
const uiStore = useUIStore();

// Lokaler Status
const isSidebarCollapsed = ref(false);
const showDeleteConfirm = ref(false);
const itemToDelete = ref<string | null>(null);

/**
 * Schaltet die Sidebar ein/aus
 */
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  emit('toggle-collapse', isSidebarCollapsed.value);
  
  // UI-Store aktualisieren für app-weite Konsistenz
  uiStore.toggleSidebar();
}

/**
 * Wählt ein Element aus
 * @param id ID des Elements
 */
function selectItem(id: string) {
  emit('select', id);
}

/**
 * Öffnet den Lösch-Dialog für ein Element
 * @param id ID des zu löschenden Elements
 */
function confirmDeleteItem(id: string) {
  itemToDelete.value = id;
  showDeleteConfirm.value = true;
}

/**
 * Bricht den Löschvorgang ab
 */
function cancelDelete() {
  itemToDelete.value = null;
  showDeleteConfirm.value = false;
}

/**
 * Löscht das ausgewählte Element
 */
function deleteItem() {
  if (itemToDelete.value) {
    emit('delete', itemToDelete.value);
  }
  
  // Dialog schließen
  cancelDelete();
}
</script>

<style scoped>
.n-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: var(--n-sidebar-width, 280px);
  background-color: var(--n-sidebar-bg, var(--n-surface-color, #ffffff));
  border-right: 1px solid var(--n-border-color, #e2e8f0);
  transition: width 0.3s ease;
  overflow: hidden;
  color: var(--n-sidebar-color, var(--n-text-color-primary, #2d3748));
}

.n-sidebar--collapsed {
  width: var(--n-sidebar-collapsed-width, 64px);
}

.n-sidebar__header {
  height: var(--n-sidebar-header-height, 64px);
  padding: 0 var(--n-spacing-md, 16px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  flex-shrink: 0;
}

.n-sidebar__title {
  margin: 0;
  font-size: var(--n-font-size-md, 1rem);
  font-weight: var(--n-font-weight-medium, 500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-sidebar--collapsed .n-sidebar__title {
  display: none;
}

.n-sidebar__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--n-sidebar-icon-color, var(--n-text-color-secondary, #718096));
  cursor: pointer;
  border-radius: var(--n-border-radius-md, 4px);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.n-sidebar__toggle-btn:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-text-color-primary, #2d3748);
}

.n-sidebar__toggle-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-sidebar__toggle-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.n-sidebar__toggle-icon--collapsed {
  transform: rotate(180deg);
}

.n-sidebar__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.n-sidebar__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--n-spacing-xl, 32px) var(--n-spacing-md, 16px);
  color: var(--n-text-color-secondary, #718096);
}

.n-sidebar__loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--n-border-color, #e2e8f0);
  border-top-color: var(--n-primary-color, #3182ce);
  border-radius: 50%;
  animation: n-spin 1s linear infinite;
  margin-bottom: var(--n-spacing-sm, 8px);
}

.n-sidebar__loading-text {
  font-size: var(--n-font-size-sm, 0.875rem);
}

.n-sidebar__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--n-spacing-xl, 32px) var(--n-spacing-md, 16px);
  text-align: center;
  color: var(--n-text-color-secondary, #718096);
}

.n-sidebar__empty-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--n-spacing-md, 16px);
  color: var(--n-text-color-tertiary, #a0aec0);
}

.n-sidebar__empty-icon svg {
  width: 100%;
  height: 100%;
}

.n-sidebar__empty-message {
  margin-bottom: var(--n-spacing-lg, 24px);
  font-size: var(--n-font-size-sm, 0.875rem);
}

.n-sidebar__create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--n-spacing-xs, 4px);
  padding: var(--n-spacing-sm, 8px) var(--n-spacing-md, 16px);
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: var(--n-border-radius-md, 4px);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-sidebar__create-btn:hover {
  background-color: var(--n-primary-color-dark, #2c5282);
}

.n-sidebar__create-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-sidebar__create-btn svg {
  width: 16px;
  height: 16px;
}

.n-sidebar--collapsed .n-sidebar__create-text {
  display: none;
}

.n-sidebar__list {
  list-style: none;
  padding: var(--n-spacing-sm, 8px);
  margin: 0;
}

.n-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--n-spacing-sm, 8px) var(--n-spacing-md, 16px);
  border-radius: var(--n-border-radius-md, 4px);
  margin-bottom: var(--n-spacing-xs, 4px);
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.n-sidebar__item:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-sidebar__item--active {
  background-color: var(--n-active-color, rgba(49, 130, 206, 0.1));
  color: var(--n-primary-color, #3182ce);
  font-weight: var(--n-font-weight-medium, 500);
}

.n-sidebar__item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--n-primary-color, #3182ce);
  border-radius: 0 3px 3px 0;
}

.n-sidebar__item-content {
  display: flex;
  align-items: center;
  overflow: hidden;
  flex: 1;
}

.n-sidebar__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: var(--n-spacing-sm, 8px);
  color: var(--n-sidebar-icon-color, var(--n-text-color-secondary, #718096));
  flex-shrink: 0;
}

.n-sidebar__item--active .n-sidebar__item-icon {
  color: var(--n-primary-color, #3182ce);
}

.n-sidebar__item-icon svg {
  width: 18px;
  height: 18px;
}

.n-sidebar__item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s ease;
}

.n-sidebar--collapsed .n-sidebar__item-label {
  opacity: 0;
  width: 0;
}

.n-sidebar__item-actions {
  display: flex;
  align-items: center;
}

.n-sidebar__item-delete {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--n-text-color-secondary, #718096);
  opacity: 0;
  cursor: pointer;
  border-radius: var(--n-border-radius-md, 4px);
  transition: background-color 0.2s ease, opacity 0.2s ease, color 0.2s ease;
}

.n-sidebar__item:hover .n-sidebar__item-delete {
  opacity: 1;
}

.n-sidebar__item-delete:hover {
  background-color: var(--n-danger-color-light, rgba(229, 62, 62, 0.1));
  color: var(--n-danger-color, #e53e3e);
}

.n-sidebar__item-delete:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
  opacity: 1;
}

.n-sidebar__item-delete svg {
  width: 16px;
  height: 16px;
}

.n-sidebar--collapsed .n-sidebar__item-delete {
  display: none;
}

.n-sidebar__footer {
  padding: var(--n-spacing-md, 16px);
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  flex-shrink: 0;
}

.n-sidebar__delete-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: var(--n-z-index-modal, 1000);
}

.n-sidebar__delete-dialog-content {
  width: 100%;
  max-width: 320px;
  background-color: var(--n-surface-color, #ffffff);
  border-radius: var(--n-border-radius-lg, 8px);
  box-shadow: var(--n-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  overflow: hidden;
}

.n-sidebar__delete-dialog-message {
  padding: var(--n-spacing-lg, 24px);
  margin: 0;
  text-align: center;
  font-size: var(--n-font-size-md, 1rem);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-sidebar__delete-dialog-actions {
  display: flex;
  padding: var(--n-spacing-md, 16px);
  gap: var(--n-spacing-sm, 8px);
}

.n-sidebar__delete-dialog-button {
  flex: 1;
  padding: var(--n-spacing-sm, 8px) var(--n-spacing-md, 16px);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  border-radius: var(--n-border-radius-md, 4px);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-sidebar__delete-dialog-button--cancel {
  background-color: var(--n-button-secondary-bg, #edf2f7);
  color: var(--n-text-color-primary, #2d3748);
}

.n-sidebar__delete-dialog-button--cancel:hover {
  background-color: var(--n-button-secondary-hover-bg, #e2e8f0);
}

.n-sidebar__delete-dialog-button--confirm {
  background-color: var(--n-danger-color, #e53e3e);
  color: white;
}

.n-sidebar__delete-dialog-button--confirm:hover {
  background-color: var(--n-danger-color-dark, #c53030);
}

/* Animation für den Spinner */
@keyframes n-spin {
  to { transform: rotate(360deg); }
}

/* Responsive Styles */
@media (max-width: 768px) {
  .n-sidebar {
    position: fixed;
    left: 0;
    top: var(--n-navigation-bar-height, 64px);
    bottom: 0;
    z-index: var(--n-z-index-sidebar, 90);
    box-shadow: var(--n-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
    transform: translateX(0);
    transition: transform 0.3s ease, width 0.3s ease;
  }
  
  .n-sidebar--collapsed {
    transform: translateX(calc(-1 * var(--n-sidebar-width, 280px)));
  }
}
</style>