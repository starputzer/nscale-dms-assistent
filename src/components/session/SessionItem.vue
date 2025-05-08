<template>
  <div 
    class="n-session-item" 
    :class="{
      'n-session-item--active': isActive,
      'n-session-item--pinned': isPinned
    }"
    role="option"
    :aria-selected="isActive"
    :data-session-id="session.id"
    tabindex="0"
    @click="$emit('select', session.id)"
    @keydown.enter="$emit('select', session.id)"
    @keydown.space.prevent="$emit('select', session.id)"
    @contextmenu="handleContextMenu"
  >
    <!-- Drag Handle -->
    <div 
      v-if="showDragHandle" 
      class="n-session-item__drag-handle"
      role="button"
      aria-label="Eintrag verschieben"
      tabindex="0"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
        <line x1="8" y1="18" x2="16" y2="18"></line>
      </svg>
    </div>
    
    <!-- Pin Indicator -->
    <div 
      v-if="isPinned"
      class="n-session-item__pin-indicator"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
    
    <!-- Icon (Optional) -->
    <div class="n-session-item__icon">
      <slot name="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </slot>
    </div>
    
    <!-- Session Info -->
    <div class="n-session-item__content">
      <div class="n-session-item__title" :title="session.title">
        {{ session.title }}
      </div>
      <div class="n-session-item__meta" v-if="showMetadata">
        <span class="n-session-item__date">{{ formattedDate }}</span>
      </div>
    </div>
    
    <!-- Actions (visible on hover/focus) -->
    <div class="n-session-item__actions">
      <button 
        class="n-session-item__action-btn" 
        @click.stop="$emit('pin', session.id, !isPinned)"
        aria-label="Unterhaltung anheften"
        :title="isPinned ? 'Anheften aufheben' : 'Anheften'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </button>
      
      <button 
        class="n-session-item__action-btn" 
        @click.stop="$emit('rename', session.id)"
        aria-label="Unterhaltung umbenennen"
        title="Umbenennen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      
      <button 
        class="n-session-item__action-btn n-session-item__action-btn--danger" 
        @click.stop="$emit('delete', session.id)"
        aria-label="Unterhaltung löschen"
        title="Löschen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatSession } from '@/types/session';

interface Props {
  /** Die Session, die angezeigt werden soll */
  session: ChatSession;
  /** Ob diese Session momentan aktiv ist */
  isActive?: boolean;
  /** Ob diese Session angeheftet ist */
  isPinned?: boolean;
  /** Ob ein Drag-Handle angezeigt werden soll */
  showDragHandle?: boolean;
  /** Ob Metadaten wie das Datum angezeigt werden sollen */
  showMetadata?: boolean;
  /** Ob Aktionsschaltflächen angezeigt werden sollen */
  showActions?: boolean;
  /** Ob ein kontextuelles Menü aktiviert sein soll */
  enableContextMenu?: boolean;
  /** Index innerhalb der Liste */
  index?: number;
  /** Das zu verwendende Datumsformat */
  dateFormat?: 'relative' | 'short' | 'long';
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  isPinned: false,
  showDragHandle: true,
  showMetadata: true,
  showActions: true,
  enableContextMenu: true,
  index: -1,
  dateFormat: 'relative'
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn die Session ausgewählt wird */
  (e: 'select', sessionId: string): void;
  /** Wird ausgelöst, wenn die Session angeheftet/abgeheftet wird */
  (e: 'pin', sessionId: string, pinned: boolean): void;
  /** Wird ausgelöst, wenn die Session umbenannt werden soll */
  (e: 'rename', sessionId: string): void;
  /** Wird ausgelöst, wenn die Session gelöscht werden soll */
  (e: 'delete', sessionId: string): void;
  /** Wird ausgelöst, wenn das Kontextmenü geöffnet werden soll */
  (e: 'contextmenu', event: MouseEvent, session: ChatSession): void;
}>();

// Formatierung des Datums
const formattedDate = computed(() => {
  if (!props.session.updatedAt) return '';
  
  const date = new Date(props.session.updatedAt);
  const now = new Date();
  
  // Relative Zeitformatierung (z.B. "vor 2 Stunden")
  if (props.dateFormat === 'relative') {
    const diff = now.getTime() - date.getTime();
    const diffInSeconds = diff / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    if (diffInSeconds < 60) {
      return 'gerade eben';
    } else if (diffInMinutes < 60) {
      const minutes = Math.floor(diffInMinutes);
      return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  } else if (props.dateFormat === 'short') {
    // Kurzes Datumsformat (z.B. "13.04.2023")
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } else {
    // Langes Datumsformat (z.B. "13. April 2023, 14:23")
    return date.toLocaleString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
});

// Event-Handler
function handleContextMenu(event: MouseEvent) {
  if (props.enableContextMenu) {
    emit('contextmenu', event, props.session);
  }
}
</script>

<style scoped>
.n-session-item {
  display: flex;
  align-items: center;
  padding: var(--n-space-3, 0.75rem);
  border-radius: var(--n-border-radius-md, 0.5rem);
  background-color: var(--n-surface-color, #ffffff);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
  margin-bottom: var(--n-space-2, 0.5rem);
  position: relative;
  outline: none;
}

.n-session-item:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  border-color: var(--n-border-color, #e2e8f0);
}

.n-session-item:focus-visible {
  box-shadow: 0 0 0 2px var(--n-focus-color, #3182ce);
  border-color: var(--n-focus-color, #3182ce);
}

.n-session-item--active {
  background-color: var(--n-active-color, rgba(49, 130, 206, 0.1));
  border-color: var(--n-primary-color-light, #63b3ed);
}

.n-session-item--pinned {
  border-left: 3px solid var(--n-primary-color, #3182ce);
}

.n-session-item__drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: var(--n-space-2, 0.5rem);
  color: var(--n-text-color-tertiary, #a0aec0);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.n-session-item:hover .n-session-item__drag-handle,
.n-session-item:focus-within .n-session-item__drag-handle {
  opacity: 1;
}

.n-session-item__drag-handle:hover {
  color: var(--n-text-color-secondary, #718096);
}

.n-session-item__drag-handle svg {
  width: 16px;
  height: 16px;
}

.n-session-item__pin-indicator {
  position: absolute;
  top: var(--n-space-1, 0.25rem);
  right: var(--n-space-1, 0.25rem);
  color: var(--n-primary-color, #3182ce);
}

.n-session-item__pin-indicator svg {
  width: 14px;
  height: 14px;
}

.n-session-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--n-border-radius-md, 0.5rem);
  margin-right: var(--n-space-3, 0.75rem);
  color: var(--n-text-color-secondary, #718096);
  flex-shrink: 0;
}

.n-session-item__icon svg {
  width: 20px;
  height: 20px;
}

.n-session-item--active .n-session-item__icon {
  color: var(--n-primary-color, #3182ce);
}

.n-session-item__content {
  flex: 1;
  min-width: 0;
  margin-right: var(--n-space-2, 0.5rem);
}

.n-session-item__title {
  font-weight: var(--n-font-weight-medium, 500);
  color: var(--n-text-color, #2d3748);
  font-size: var(--n-font-size-sm, 0.875rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-session-item__meta {
  display: flex;
  align-items: center;
  margin-top: var(--n-space-1, 0.25rem);
}

.n-session-item__date {
  font-size: var(--n-font-size-xs, 0.75rem);
  color: var(--n-text-color-tertiary, #a0aec0);
}

.n-session-item__actions {
  display: flex;
  align-items: center;
  gap: var(--n-space-1, 0.25rem);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.n-session-item:hover .n-session-item__actions,
.n-session-item:focus-within .n-session-item__actions {
  opacity: 1;
}

.n-session-item__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  color: var(--n-text-color-tertiary, #a0aec0);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.n-session-item__action-btn:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-text-color-secondary, #718096);
}

.n-session-item__action-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--n-focus-color, #3182ce);
  outline: none;
}

.n-session-item__action-btn--danger:hover {
  color: var(--n-danger-color, #e53e3e);
  background-color: var(--n-danger-color-light, rgba(229, 62, 62, 0.1));
}

.n-session-item__action-btn svg {
  width: 16px;
  height: 16px;
}

/* Dark Mode */
:root[data-theme='dark'] .n-session-item,
.dark-mode .n-session-item {
  background-color: var(--n-surface-color-dark, #2d3748);
  color: var(--n-text-color-dark, #f7fafc);
}

:root[data-theme='dark'] .n-session-item:hover,
.dark-mode .n-session-item:hover {
  background-color: var(--n-hover-color-dark, rgba(255, 255, 255, 0.05));
}

:root[data-theme='dark'] .n-session-item--active,
.dark-mode .n-session-item--active {
  background-color: var(--n-active-color-dark, rgba(66, 153, 225, 0.2));
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-session-item {
    padding: var(--n-space-2, 0.5rem);
  }
  
  .n-session-item__actions {
    opacity: 1;
  }
  
  .n-session-item__drag-handle {
    display: none;
  }
}
</style>