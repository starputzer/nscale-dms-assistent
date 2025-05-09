<template>
  <div 
    class="n-chat-input"
    :class="{
      'n-chat-input--focused': isFocused,
      'n-chat-input--disabled': disabled,
      'n-chat-input--loading': isLoading,
      'n-chat-input--streaming': isStreaming,
      'n-chat-input--editing': isEditing
    }"
  >
    <!-- Streaming-Status -->
    <div v-if="isStreaming" class="n-chat-input__streaming-status">
      <div class="n-chat-input__streaming-indicator">
        <span class="n-chat-input__streaming-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="n-chat-input__streaming-text">Antwort wird generiert...</span>
      </div>
      <button
        type="button"
        class="n-chat-input__stop-btn"
        @click="$emit('stop-stream')"
        aria-label="Generierung abbrechen"
      >
        <span class="n-chat-input__stop-icon"></span>
        <span class="n-chat-input__stop-text">Abbrechen</span>
      </button>
    </div>
    
    <!-- Bearbeitungs-Status -->
    <div v-if="isEditing" class="n-chat-input__editing-status">
      <span class="n-chat-input__editing-icon">✏️</span>
      <span class="n-chat-input__editing-text">Nachricht bearbeiten</span>
      <button
        type="button"
        class="n-chat-input__cancel-btn"
        @click="$emit('cancel-edit')"
        aria-label="Bearbeitung abbrechen"
      >
        <span class="n-chat-input__cancel-text">Abbrechen</span>
      </button>
    </div>

    <div class="n-chat-input__container">
      <!-- Vorgefertigte Nachrichtenvorlagen (optional) -->
      <div v-if="showTemplates && templates.length > 0" class="n-chat-input__templates">
        <button 
          v-for="(template, index) in templates" 
          :key="index"
          type="button" 
          class="n-chat-input__template-btn"
          @click="applyTemplate(template)"
        >
          {{ template.label }}
        </button>
      </div>
      
      <!-- Textbereich mit Autoresize -->
      <textarea
        ref="inputElement"
        v-model="inputValue"
        class="n-chat-input__textarea"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :disabled="disabled || isLoading"
        @input="resizeTextarea"
        @keydown.enter.exact.prevent="handleSubmit"
        @keydown.shift.enter="allowNewline"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
        aria-label="Nachrichteneingabe"
      ></textarea>
      
      <div class="n-chat-input__actions">
        <!-- Zeichenzähler -->
        <div v-if="maxLength && showCharacterCount" class="n-chat-input__char-count">
          {{ inputValue.length }}/{{ maxLength }}
        </div>
        
        <!-- Senden-Button -->
        <button
          type="button"
          class="n-chat-input__send-btn"
          :disabled="!canSubmit || disabled || isLoading || isStreaming"
          @click="handleSubmit"
          :title="sendButtonTitle"
          aria-label="Nachricht senden"
        >
          <span v-if="isLoading" class="n-chat-input__loading-indicator" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span v-else class="n-chat-input__send-icon" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    
    <!-- Fehlermeldung und Hinweis -->
    <div v-if="error" class="n-chat-input__error" role="alert">
      {{ error }}
    </div>
    
    <div v-if="hint" class="n-chat-input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';

// Template-Interface für vorgefertigte Nachrichten
interface MessageTemplate {
  label: string;
  content: string;
}

// Props Definition
interface Props {
  /**
   * Initialer Wert für das Eingabefeld
   */
  modelValue?: string;
  
  /**
   * Platzhaltertext
   */
  placeholder?: string;
  
  /**
   * Ob die Eingabe deaktiviert ist
   */
  disabled?: boolean;
  
  /**
   * Ob die Komponente gerade lädt (Nachricht wird gesendet)
   */
  isLoading?: boolean;
  
  /**
   * Ob gerade eine Antwort gestreamt wird
   */
  isStreaming?: boolean;
  
  /**
   * Ob eine Nachricht bearbeitet wird
   */
  isEditing?: boolean;
  
  /**
   * Maximale Anzahl an Zeichen
   */
  maxLength?: number;
  
  /**
   * Minimale Höhe des Textfelds in Pixeln
   */
  minHeight?: number;
  
  /**
   * Maximale Höhe des Textfelds in Pixeln
   */
  maxHeight?: number;
  
  /**
   * Anfangshöhe des Textfelds in Pixeln
   */
  initialHeight?: number;
  
  /**
   * Zeigt die Zeichenanzahl an
   */
  showCharacterCount?: boolean;
  
  /**
   * Fehlermeldung
   */
  error?: string;
  
  /**
   * Hinweistext
   */
  hint?: string;
  
  /**
   * Titel für den Senden-Button
   */
  sendButtonTitle?: string;
  
  /**
   * Autofokus
   */
  autofocus?: boolean;
  
  /**
   * Entwurfswert (für persistenten Entwurf zwischen Sitzungen)
   */
  draft?: string;
  
  /**
   * Zeigt vorgefertigte Nachrichtenvorlagen an
   */
  showTemplates?: boolean;
  
  /**
   * Vorgefertigte Nachrichtenvorlagen
   */
  templates?: MessageTemplate[];
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Geben Sie Ihre Nachricht ein...',
  disabled: false,
  isLoading: false,
  isStreaming: false,
  isEditing: false,
  maxLength: 4000,
  minHeight: 56,
  maxHeight: 200,
  initialHeight: 56,
  showCharacterCount: true,
  sendButtonTitle: 'Nachricht senden (Enter)',
  autofocus: true,
  draft: '',
  showTemplates: false,
  templates: () => []
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Event beim Ändern des Eingabewerts
   */
  (e: 'update:modelValue', value: string): void;
  
  /**
   * Event beim Absenden des Formulars
   */
  (e: 'submit', value: string): void;
  
  /**
   * Event beim Fokussieren des Eingabefelds
   */
  (e: 'focus'): void;
  
  /**
   * Event beim Verlassen des Eingabefelds
   */
  (e: 'blur'): void;
  
  /**
   * Event beim Drücken einer Taste
   */
  (e: 'keydown', event: KeyboardEvent): void;
  
  /**
   * Event bei Änderung des Entwurfs
   */
  (e: 'draft-change', value: string): void;
  
  /**
   * Event beim Abbrechen des Streamings
   */
  (e: 'stop-stream'): void;
  
  /**
   * Event beim Abbrechen der Bearbeitung
   */
  (e: 'cancel-edit'): void;
}>();

// Lokale Zustände
const inputElement = ref<HTMLTextAreaElement | null>(null);
const inputValue = ref(props.modelValue || props.draft || '');
const isFocused = ref(false);
const previousInputHeight = ref(props.initialHeight);
const draftTimer = ref<number | null>(null);

// Computed Properties
const canSubmit = computed(() => {
  return inputValue.value.trim().length > 0 && 
         (!props.maxLength || inputValue.value.length <= props.maxLength) &&
         !props.isStreaming;
});

// Event-Handler
function handleSubmit(): void {
  if (!canSubmit.value || props.disabled || props.isLoading || props.isStreaming) {
    return;
  }
  
  const trimmedValue = inputValue.value.trim();
  emit('submit', trimmedValue);
  
  // Bei Bearbeitung den Eingabewert nicht zurücksetzen
  if (!props.isEditing) {
    inputValue.value = '';
  }
  
  // Entwurf aktualisieren
  emit('draft-change', '');
  
  // Textarea zurücksetzen und Größe anpassen
  nextTick(() => {
    resizeTextarea();
  });
}

function allowNewline(event: KeyboardEvent): void {
  // Shift+Enter erlaubt einen Zeilenumbruch
  event.stopPropagation();
}

function handleKeydown(event: KeyboardEvent): void {
  // Event an die übergeordnete Komponente weiterleiten
  emit('keydown', event);
  
  // Escape-Taste zum Abbrechen der Bearbeitung
  if (event.key === 'Escape' && props.isEditing) {
    emit('cancel-edit');
  }
}

function handleFocus(): void {
  isFocused.value = true;
  emit('focus');
}

function handleBlur(): void {
  isFocused.value = false;
  emit('blur');
  
  // Entwurf speichern
  saveDraft();
}

// Speichert den aktuellen Eingabewert als Entwurf
function saveDraft(): void {
  if (draftTimer.value) {
    clearTimeout(draftTimer.value);
  }
  
  // Verzögern, um übermäßige Updates zu vermeiden
  draftTimer.value = window.setTimeout(() => {
    emit('draft-change', inputValue.value);
  }, 500);
}

// Textarea-Größe an den Inhalt anpassen
function resizeTextarea(): void {
  if (!inputElement.value) return;
  
  const textarea = inputElement.value;
  
  // Höhe zurücksetzen
  textarea.style.height = `${props.initialHeight}px`;
  
  // Neue Höhe berechnen (scrollHeight = Höhe des Inhalts)
  const newHeight = Math.min(
    Math.max(textarea.scrollHeight, props.minHeight),
    props.maxHeight
  );
  
  // Nur aktualisieren, wenn sich die Höhe geändert hat
  if (newHeight !== previousInputHeight.value) {
    textarea.style.height = `${newHeight}px`;
    previousInputHeight.value = newHeight;
  }
  
  // Modellwert aktualisieren
  emit('update:modelValue', inputValue.value);
  
  // Entwurf-Event auslösen, aber gedrosselt
  if (!props.isStreaming) {
    saveDraft();
  }
}

// Vorlage anwenden
function applyTemplate(template: MessageTemplate): void {
  inputValue.value = template.content;
  nextTick(() => {
    resizeTextarea();
    inputElement.value?.focus();
  });
}

// Lifecycle Hooks
onMounted(() => {
  // Initial die Textarea-Größe anpassen
  nextTick(() => {
    resizeTextarea();
  });
  
  // Autofokus
  if (props.autofocus && inputElement.value && !props.isStreaming) {
    inputElement.value.focus();
  }
});

// Watches
watch(() => props.modelValue, (newValue) => {
  if (newValue !== inputValue.value) {
    inputValue.value = newValue;
    nextTick(() => {
      resizeTextarea();
    });
  }
});

// Wenn ein Entwurf gesetzt wird, diesen verwenden
watch(() => props.draft, (newValue) => {
  if (newValue && newValue !== inputValue.value && !isFocused.value) {
    inputValue.value = newValue;
    nextTick(() => {
      resizeTextarea();
    });
  }
});

// Stellt sicher, dass die Größe angepasst wird, wenn sich der Wert ändert
watch(() => inputValue.value, () => {
  nextTick(() => {
    resizeTextarea();
  });
});

// Wenn Streaming beginnt, Fokus vom Eingabefeld entfernen
watch(() => props.isStreaming, (isStreaming) => {
  if (isStreaming && inputElement.value) {
    // Fokus entfernen, während Streaming aktiv ist
    inputElement.value.blur();
  } else if (!isStreaming && props.autofocus && inputElement.value) {
    // Nach dem Streaming wieder Fokus setzen
    nextTick(() => {
      inputElement.value?.focus();
    });
  }
});
</script>

<style scoped>
/* Hauptcontainer */
.n-chat-input {
  width: 100%;
  background-color: var(--nscale-input-bg, #ffffff);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem);
  box-shadow: var(--nscale-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
  transition: all 0.2s ease;
  position: relative;
}

/* Fokus-Zustand */
.n-chat-input--focused {
  border-color: var(--nscale-primary, #00a550);
  box-shadow: 0 0 0 3px var(--nscale-primary-light, #e0f5ea);
}

/* Deaktivierter Zustand */
.n-chat-input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nscale-disabled-bg, #f1f5f9);
}

/* Lade-Zustand */
.n-chat-input--loading {
  border-color: var(--nscale-primary-light, #e0f5ea);
}

/* Streaming-Zustand */
.n-chat-input--streaming {
  border-color: var(--nscale-primary-light, #e0f5ea);
  background-color: var(--nscale-disabled-bg, #f1f5f9);
}

/* Bearbeitungs-Zustand */
.n-chat-input--editing {
  border-color: var(--nscale-warning, #f59e0b);
  background-color: var(--nscale-warning-ultra-light, #fffbeb);
}

/* Flexbox-Container für Textarea und Buttons */
.n-chat-input__container {
  display: flex;
  align-items: flex-end;
  position: relative;
}

/* Textarea für Benutzereingabe */
.n-chat-input__textarea {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--nscale-font-family-base, 'Segoe UI', sans-serif);
  font-size: var(--nscale-font-size-base, 1rem);
  color: var(--nscale-text, #1a202c);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  resize: none;
  outline: none;
  max-height: var(--nscale-chat-input-max-height, 200px);
  overflow-y: auto;
  line-height: var(--nscale-line-height-normal, 1.5);
}

.n-chat-input__textarea::placeholder {
  color: var(--nscale-placeholder, #a0aec0);
}

/* Streaming-Status-Anzeige */
.n-chat-input__streaming-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  background-color: var(--nscale-primary-ultra-light, #f0faf5);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem) var(--nscale-border-radius-md, 0.5rem) 0 0;
}

.n-chat-input__streaming-indicator {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2, 0.5rem);
}

.n-chat-input__streaming-dots {
  display: flex;
  align-items: center;
  gap: 2px;
}

.n-chat-input__streaming-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--nscale-primary, #00a550);
  animation: typing-dot 1.4s infinite ease-in-out both;
}

.n-chat-input__streaming-dots span:nth-child(1) {
  animation-delay: 0s;
}

.n-chat-input__streaming-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.n-chat-input__streaming-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.n-chat-input__streaming-text {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
}

.n-chat-input__stop-btn {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-1, 0.25rem);
  background-color: var(--nscale-error-light, #fee2e2);
  color: var(--nscale-error, #dc2626);
  border: 1px solid var(--nscale-error, #dc2626);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  padding: var(--nscale-space-1, 0.25rem) var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-chat-input__stop-btn:hover {
  background-color: var(--nscale-error, #dc2626);
  color: white;
}

.n-chat-input__stop-icon {
  position: relative;
  width: 12px;
  height: 12px;
  background-color: currentColor;
  border-radius: 2px;
}

/* Bearbeitungs-Status-Anzeige */
.n-chat-input__editing-status {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  background-color: var(--nscale-warning-ultra-light, #fffbeb);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-md, 0.5rem) var(--nscale-border-radius-md, 0.5rem) 0 0;
}

.n-chat-input__editing-text {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  flex: 1;
}

.n-chat-input__cancel-btn {
  background: none;
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  color: var(--nscale-text-secondary, #64748b);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  padding: var(--nscale-space-1, 0.25rem) var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-chat-input__cancel-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--nscale-border-color-dark, #cbd5e1);
}

/* Vorlagen-Bereich */
.n-chat-input__templates {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nscale-space-2, 0.5rem);
  padding: var(--nscale-space-3, 0.75rem) var(--nscale-space-4, 1rem);
  border-bottom: 1px solid var(--nscale-border-color, #e2e8f0);
}

.n-chat-input__template-btn {
  background-color: var(--nscale-surface-color, #f8fafc);
  border: 1px solid var(--nscale-border-color, #e2e8f0);
  border-radius: var(--nscale-border-radius-sm, 0.25rem);
  padding: var(--nscale-space-1, 0.25rem) var(--nscale-space-2, 0.5rem);
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.n-chat-input__template-btn:hover {
  background-color: var(--nscale-hover-bg, rgba(0, 0, 0, 0.05));
  border-color: var(--nscale-border-color-dark, #cbd5e1);
}

/* Aktionsbereich am unteren Rand */
.n-chat-input__actions {
  display: flex;
  align-items: center;
  padding-right: var(--nscale-space-3, 0.75rem);
  padding-bottom: var(--nscale-space-3, 0.75rem);
}

/* Zeichenzähler */
.n-chat-input__char-count {
  font-size: var(--nscale-font-size-xs, 0.75rem);
  color: var(--nscale-text-tertiary, #94a3b8);
  margin-right: var(--nscale-space-2, 0.5rem);
}

/* Senden-Button */
.n-chat-input__send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background-color: var(--nscale-primary, #00a550);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-chat-input__send-btn:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
  transform: scale(1.05);
}

.n-chat-input__send-btn:disabled {
  background-color: var(--nscale-disabled, #cbd5e1);
  cursor: not-allowed;
}

/* Senden-Icon */
.n-chat-input__send-icon {
  width: 16px;
  height: 16px;
  position: relative;
  display: inline-block;
  background-color: transparent;
}

.n-chat-input__send-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  width: 10px;
  height: 10px;
  border-bottom: 2px solid white;
  border-right: 2px solid white;
}

/* Animations-Punkte für Lade-Indikator */
.n-chat-input__loading-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
}

.n-chat-input__loading-indicator span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: white;
  display: inline-block;
  animation: typing-dot 1.4s infinite ease-in-out both;
}

.n-chat-input__loading-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.n-chat-input__loading-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.n-chat-input__loading-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Fehlermeldung */
.n-chat-input__error {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-error, #dc2626);
  margin-top: var(--nscale-space-1, 0.25rem);
  padding: 0 var(--nscale-space-4, 1rem);
}

/* Hinweis */
.n-chat-input__hint {
  font-size: var(--nscale-font-size-sm, 0.875rem);
  color: var(--nscale-text-secondary, #64748b);
  margin-top: var(--nscale-space-1, 0.25rem);
  padding: 0 var(--nscale-space-4, 1rem);
}

/* Animationen */
@keyframes typing-dot {
  0%, 80%, 100% { 
    transform: scale(0.8);
    opacity: 0.6; 
  }
  40% { 
    transform: scale(1);
    opacity: 1; 
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-chat-input {
    border-radius: var(--nscale-border-radius-sm, 0.25rem);
  }
  
  .n-chat-input__textarea {
    padding: var(--nscale-space-2, 0.5rem) var(--nscale-space-3, 0.75rem);
    font-size: var(--nscale-font-size-sm, 0.875rem);
  }
  
  .n-chat-input__actions {
    padding-right: var(--nscale-space-2, 0.5rem);
    padding-bottom: var(--nscale-space-2, 0.5rem);
  }
  
  .n-chat-input__send-btn {
    width: 30px;
    height: 30px;
  }
  
  .n-chat-input__streaming-status,
  .n-chat-input__editing-status {
    padding: var(--nscale-space-2, 0.5rem);
    font-size: var(--nscale-font-size-xs, 0.75rem);
  }
  
  .n-chat-input__templates {
    padding: var(--nscale-space-2, 0.5rem);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-chat-input__loading-indicator span,
  .n-chat-input__streaming-dots span {
    animation: none;
  }
  
  .n-chat-input__send-btn:hover:not(:disabled) {
    transform: none;
  }
}

/* Dunkles Theme Unterstützung */
@media (prefers-color-scheme: dark) {
  .n-chat-input {
    background-color: var(--nscale-dark-input-bg, #1a1a1a);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-input__textarea {
    color: var(--nscale-dark-text, #e2e8f0);
  }
  
  .n-chat-input__textarea::placeholder {
    color: var(--nscale-dark-placeholder, #64748b);
  }
  
  .n-chat-input--disabled {
    background-color: var(--nscale-dark-disabled-bg, #252525);
  }
  
  .n-chat-input--streaming {
    background-color: var(--nscale-dark-disabled-bg, #252525);
  }
  
  .n-chat-input--editing {
    background-color: rgba(245, 158, 11, 0.15);
  }
  
  .n-chat-input__streaming-status {
    background-color: rgba(0, 165, 80, 0.15);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-input__editing-status {
    background-color: rgba(245, 158, 11, 0.15);
    border-color: var(--nscale-dark-border-color, #333);
  }
  
  .n-chat-input__cancel-btn {
    border-color: var(--nscale-dark-border-color, #444);
    color: var(--nscale-dark-text-secondary, #94a3b8);
  }
  
  .n-chat-input__template-btn {
    background-color: var(--nscale-dark-surface-color, #252525);
    border-color: var(--nscale-dark-border-color, #444);
    color: var(--nscale-dark-text-secondary, #94a3b8);
  }
}
</style>