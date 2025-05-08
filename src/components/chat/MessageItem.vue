<template>
  <div 
    class="n-message-item"
    :class="{
      'n-message-item--user': message.role === 'user',
      'n-message-item--assistant': message.role === 'assistant',
      'n-message-item--system': message.role === 'system',
      'n-message-item--error': message.status === 'error',
      'n-message-item--streaming': message.isStreaming
    }"
    :data-message-id="message.id"
  >
    <div class="n-message-item__content">
      <div class="n-message-item__header">
        <div class="n-message-item__role">
          {{ formatRoleLabel(message.role) }}
        </div>
        <div class="n-message-item__time" v-if="message.timestamp">
          {{ formatTimestamp(message.timestamp) }}
        </div>
        <div 
          v-if="message.status === 'error'" 
          class="n-message-item__status n-message-item__status--error"
        >
          <span class="n-message-item__error-icon">⚠️</span>
          <span>Fehler</span>
        </div>
      </div>
      
      <div 
        ref="contentElement"
        class="n-message-item__text"
        v-html="formattedContent"
      ></div>
      
      <div 
        v-if="showActions && message.role === 'assistant'" 
        class="n-message-item__actions"
      >
        <div class="n-message-item__feedback">
          <button
            type="button"
            class="n-message-item__feedback-btn"
            :class="{ 'n-message-item__feedback-btn--active': feedback === 'positive' }"
            title="Positives Feedback"
            @click="handleFeedback('positive')"
          >
            <span class="n-message-item__feedback-icon">👍</span>
          </button>
          <button
            type="button"
            class="n-message-item__feedback-btn"
            :class="{ 'n-message-item__feedback-btn--active': feedback === 'negative' }"
            title="Negatives Feedback"
            @click="handleFeedback('negative')"
          >
            <span class="n-message-item__feedback-icon">👎</span>
          </button>
        </div>
        
        <div class="n-message-item__action-buttons">
          <button
            v-if="hasSourceReferences"
            type="button"
            class="n-message-item__action-btn"
            title="Quellen anzeigen"
            @click="$emit('view-sources', { messageId: message.id })"
          >
            <span class="n-message-item__btn-icon">📄</span>
            <span class="n-message-item__btn-text">Quellen</span>
          </button>
          
          <button
            v-if="message.role === 'assistant'"
            type="button"
            class="n-message-item__action-btn"
            title="Antwort erklären"
            @click="$emit('view-explanation', { messageId: message.id })"
          >
            <span class="n-message-item__btn-icon">ℹ️</span>
            <span class="n-message-item__btn-text">Erklären</span>
          </button>
          
          <button
            v-if="message.status === 'error' || message.role === 'assistant'"
            type="button"
            class="n-message-item__action-btn"
            title="Erneut versuchen"
            @click="$emit('retry', { messageId: message.id })"
          >
            <span class="n-message-item__btn-icon">🔄</span>
            <span class="n-message-item__btn-text">Wiederholen</span>
          </button>
          
          <button
            type="button"
            class="n-message-item__action-btn n-message-item__action-btn--danger"
            title="Nachricht löschen"
            @click="handleDelete"
          >
            <span class="n-message-item__btn-icon">🗑️</span>
            <span class="n-message-item__btn-text">Löschen</span>
          </button>
        </div>
      </div>
      
      <div 
        v-if="message.metadata?.sourceReferences?.length && showReferences" 
        class="n-message-item__references"
      >
        <div class="n-message-item__references-heading">
          Quellen
        </div>
        <ul class="n-message-item__references-list">
          <li 
            v-for="(source, index) in message.metadata.sourceReferences" 
            :key="source.id"
            class="n-message-item__reference"
          >
            <div class="n-message-item__reference-title">
              {{ source.title || `Quelle ${index + 1}` }}
            </div>
            <div v-if="source.content" class="n-message-item__reference-content">
              {{ truncateContent(source.content, 150) }}
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useUIStore } from '@/stores/ui';
import type { ChatMessage, SourceReference } from '@/types/session';
import { highlightCode, linkifySourceReferences } from '@/utils/messageFormatter';

// Props Definition
interface Props {
  /** Die anzuzeigende Nachricht */
  message: ChatMessage;
  
  /** Zeigt Aktionen wie Feedback und Quellen an */
  showActions?: boolean;
  
  /** Zeigt Quellenreferenzen direkt an */
  showReferences?: boolean;
  
  /** Soll Code hervorgehoben werden */
  highlightCodeBlocks?: boolean;
  
  /** Soll externe Links formatiert werden */
  formatLinks?: boolean;
  
  /** Datum/Zeit-Format für den Zeitstempel */
  timeFormat?: 'short' | 'medium' | 'long';
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  showReferences: false,
  highlightCodeBlocks: true,
  formatLinks: true,
  timeFormat: 'short',
});

// Emit definition
const emit = defineEmits<{
  /** Wird ausgelöst, wenn Feedback zu einer Nachricht gegeben wird */
  (e: 'feedback', payload: { messageId: string, type: 'positive' | 'negative', feedback?: string }): void;
  
  /** Wird ausgelöst, wenn Quellen angezeigt werden sollen */
  (e: 'view-sources', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Erklärung angezeigt werden soll */
  (e: 'view-explanation', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Nachricht wiederholt werden soll */
  (e: 'retry', payload: { messageId: string }): void;
  
  /** Wird ausgelöst, wenn eine Nachricht gelöscht werden soll */
  (e: 'delete', payload: { messageId: string }): void;
}>();

// Lokale Zustände
const feedback = ref<'positive' | 'negative' | null>(null);
const contentElement = ref<HTMLElement | null>(null);
const uiStore = useUIStore();

// Quellenreferenzen in der Nachricht finden
const hasSourceReferences = computed(() => {
  if (props.message.metadata?.sourceReferences?.length) {
    return true;
  }
  
  // Sucht nach Quellen-Markierungen im Text (z.B. [[src:1]])
  return /\[\[src:\w+\]\]/i.test(props.message.content);
});

// Formatiert den Nachrichteninhalt mit Markdown und Syntax-Highlighting
const formattedContent = computed(() => {
  let content = props.message.content || '';
  
  // Markdown zu HTML konvertieren
  content = marked(content, { breaks: true });
  
  // Quellenreferenzen in klickbare Spans umwandeln
  if (props.formatLinks) {
    content = linkifySourceReferences(content);
  }
  
  // HTML bereinigen, um XSS zu verhindern
  content = DOMPurify.sanitize(content);
  
  return content;
});

// Methoden
function formatRoleLabel(role: string): string {
  switch (role) {
    case 'user': return 'Sie';
    case 'assistant': return 'Assistent';
    case 'system': return 'System';
    default: return role;
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    
    switch (props.timeFormat) {
      case 'short':
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      case 'medium':
        return date.toLocaleString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
      case 'long':
        return date.toLocaleString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      default:
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

function handleFeedback(type: 'positive' | 'negative'): void {
  // Toggle-Verhalten, wenn bereits ausgewählt
  if (feedback.value === type) {
    feedback.value = null;
  } else {
    feedback.value = type;
  }
  
  // Event emittieren
  emit('feedback', { 
    messageId: props.message.id, 
    type: feedback.value || type
  });
  
  // Erfolgsmeldung anzeigen
  uiStore.showSuccess(`Vielen Dank für Ihr ${type === 'positive' ? 'positives' : 'negatives'} Feedback!`);
}

function handleDelete(): void {
  if (window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
    emit('delete', { messageId: props.message.id });
  }
}

// Lifecycle Hooks
onMounted(() => {
  nextTick(() => {
    if (props.highlightCodeBlocks && contentElement.value) {
      highlightCode(contentElement.value);
    }
    
    // Event-Listener für Quellen-Klicks hinzufügen
    if (contentElement.value) {
      contentElement.value.querySelectorAll('.source-reference').forEach(element => {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          const sourceId = (e.currentTarget as HTMLElement).dataset.sourceId;
          if (sourceId) {
            emit('view-sources', { messageId: props.message.id });
          }
        });
      });
    }
  });
});

// Watches
watch(() => props.message.content, () => {
  nextTick(() => {
    if (props.highlightCodeBlocks && contentElement.value) {
      highlightCode(contentElement.value);
    }
  });
});
</script>

<style scoped>
/* Basisstil für Message-Items */
.n-message-item {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  margin-left: auto;
  margin-right: auto;
}

/* Ausrichtung der Nachrichten basierend auf der Rolle */
.n-message-item--user {
  align-self: flex-end;
  margin-left: auto;
  margin-right: 0;
}

.n-message-item--assistant {
  align-self: flex-start;
  margin-left: 0;
  margin-right: auto;
}

.n-message-item--system {
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;
}

/* Inhalt-Container für alle Nachrichtentypen */
.n-message-item__content {
  padding: var(--nscale-space-4, 1rem);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

/* Styling für verschiedene Nachrichtentypen */
.n-message-item--user .n-message-item__content {
  background-color: var(--nscale-message-user-bg, #e6f7ef);
  color: var(--nscale-message-user-text, #1a202c);
  border-top-right-radius: 0;
}

.n-message-item--assistant .n-message-item__content {
  background-color: var(--nscale-message-assistant-bg, #f8fafc);
  color: var(--nscale-message-assistant-text, #1a202c);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-top-left-radius: 0;
}

.n-message-item--system .n-message-item__content {
  background-color: var(--nscale-message-system-bg, #f1f5f9);
  color: var(--nscale-message-system-text, #64748b);
  font-style: italic;
  text-align: center;
}

.n-message-item--error .n-message-item__content {
  border-color: var(--nscale-error-light, #fee2e2);
  background-color: var(--nscale-error-bg, #fff5f5);
}

/* Kopfzeile mit Rolle und Zeitstempel */
.n-message-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
}

.n-message-item__role {
  font-weight: var(--nscale-font-weight-medium, 500);
  color: var(--nscale-text-secondary, #64748b);
}

.n-message-item__time {
  color: var(--nscale-text-tertiary, #94a3b8);
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-message-item__status {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1, 0.25rem);
  font-size: var(--nscale-font-size-xs, 0.75rem);
}

.n-message-item__status--error {
  color: var(--nscale-error, #dc2626);
}

/* Hauptinhalt der Nachricht */
.n-message-item__text {
  font-size: var(--nscale-font-size-base, 1rem);
  line-height: var(--nscale-line-height-normal, 1.5);
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Spezielle Stile für Markdown-Inhalte */
.n-message-item__text :deep(p) {
  margin-bottom: var(--nscale-space-3, 0.75rem);
}

.n-message-item__text :deep(p:last-child) {
  margin-bottom: 0;
}

.n-message-item__text :deep(ul), 
.n-message-item__text :deep(ol) {
  margin: var(--nscale-space-3, 0.75rem) 0;
  padding-left: var(--nscale-space-6, 1.5rem);
}

.n-message-item__text :deep(li) {
  margin-bottom: var(--nscale-space-1, 0.25rem);
}

.n-message-item__text :deep(code) {
  font-family: var(--nscale-font-family-mono, monospace);
  font-size: 0.9em;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

.n-message-item__text :deep(pre) {
  margin: var(--nscale-space-3, 0.75rem) 0;
  padding: var(--nscale-space-3, 0.75rem);
  background-color: var(--nscale-code-bg, #2d3748);
  color: var(--nscale-code-text, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  overflow-x: auto;
}

.n-message-item__text :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
  white-space: pre;
}

.n-message-item__text :deep(blockquote) {
  border-left: 4px solid var(--nscale-border-color, #e2e8f0);
  padding-left: var(--nscale-space-4, 1rem);
  margin: var(--nscale-space-3, 0.75rem) 0;
  color: var(--nscale-text-secondary, #64748b);
}

.n-message-item__text :deep(a) {
  color: var(--nscale-primary, #00a550);
  text-decoration: none;
}

.n-message-item__text :deep(a:hover) {
  text-decoration: underline;
}

.n-message-item__text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: var(--nscale-space-3, 0.75rem) 0;
}

.n-message-item__text :deep(th),
.n-message-item__text :deep(td) {
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  padding: var(--nscale-space-2, 0.5rem);
  text-align: left;
}

.n-message-item__text :deep(th) {
  background-color: var(--nscale-table-header-bg, #f1f5f9);
  font-weight: var(--nscale-font-weight-medium, 500);
}

.n-message-item__text :deep(.source-reference) {
  display: inline-block;
  color: var(--nscale-primary, #00a550);
  cursor: pointer;
  font-weight: var(--nscale-font-weight-medium, 500);
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  padding: 0 0.3em;
  border-radius: 0.25em;
}

.n-message-item__text :deep(.source-reference:hover) {
  text-decoration: underline;
  background-color: var(--nscale-primary-light, #e0f5ea);
}

/* Animation für Streaming */
.n-message-item--streaming .n-message-item__text {
  position: relative;
}

.n-message-item--streaming .n-message-item__text::after {
  content: "|";
  display: inline-block;
  color: var(--nscale-primary, #00a550);
  animation: blink 1s step-start infinite;
  vertical-align: baseline;
  margin-left: 2px;
}

/* Aktionsbereich unterhalb der Nachricht */
.n-message-item__actions {
  margin-top: var(--nscale-space-3, 0.75rem);
  padding-top: var(--nscale-space-3, 0.75rem);
  border-top: 1px solid var(--nscale-border-color-light, rgba(226, 232, 240, 0.6));
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-2, 0.5rem);
}

/* Feedback-Buttons */
.n-message-item__feedback {
  display: flex;
  gap: var(--nscale-space-3, 0.75rem);
}

.n-message-item__feedback-btn {
  background: none;
  border: none;
  padding: var(--nscale-space-1, 0.25rem);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  cursor: pointer;
  color: var(--nscale-text-tertiary, #94a3b8);
  transition: all 0.2s ease;
}

.n-message-item__feedback-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--nscale-text-secondary, #64748b);
}

.n-message-item__feedback-btn--active {
  color: var(--nscale-primary, #00a550);
}

/* Aktionsbuttons */
.n-message-item__action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-message-item__action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--nscale-space-1, 0.25rem);
  background: none;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  padding: var(--nscale-space-1, 0.25rem) var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-message-item__action-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--nscale-border-color-dark, #cbd5e1);
}

.n-message-item__action-btn--danger:hover {
  background-color: var(--nscale-error-light, #fee2e2);
  border-color: var(--nscale-error, #dc2626);
  color: var(--nscale-error, #dc2626);
}

/* Quellenreferenzen-Bereich */
.n-message-item__references {
  margin-top: var(--nscale-space-3, 0.75rem);
  padding-top: var(--nscale-space-3, 0.75rem);
  border-top: 1px solid var(--nscale-border-color-light, rgba(226, 232, 240, 0.6));
}

.n-message-item__references-heading {
  font-weight: var(--nscale-font-weight-medium, 500);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  margin-bottom: var(--nscale-space-2, 0.5rem);
}

.n-message-item__references-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-message-item__reference {
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  padding: var(--nscale-space-2, 0.5rem);
}

.n-message-item__reference-title {
  font-weight: var(--nscale-font-weight-medium, 500);
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text, #1a202c);
  margin-bottom: var(--nscale-space-1, 0.25rem);
}

.n-message-item__reference-content {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-secondary, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* Animationen */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-message-item {
    max-width: 90%;
  }
  
  .n-message-item__action-buttons {
    flex-direction: column;
  }
  
  .n-message-item__action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-message-item--streaming .n-message-item__text::after {
    animation: none;
  }
}
</style>