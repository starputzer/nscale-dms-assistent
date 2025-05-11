<template>
  <div
    class="n-chat-input"
    :class="{
      'n-chat-input--focused': isFocused,
      'n-chat-input--disabled': disabled,
      'n-chat-input--loading': isLoading,
    }"
  >
    <div class="n-chat-input__container">
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
        @focus="isFocused = true"
        @blur="isFocused = false"
      ></textarea>

      <div class="n-chat-input__actions">
        <div
          v-if="maxLength && showCharacterCount"
          class="n-chat-input__char-count"
        >
          {{ inputValue.length }}/{{ maxLength }}
        </div>

        <button
          type="button"
          class="n-chat-input__send-btn"
          :disabled="!canSubmit || disabled || isLoading"
          @click="handleSubmit"
          :title="sendButtonTitle"
        >
          <span v-if="isLoading" class="n-chat-input__loading-indicator">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span v-else class="n-chat-input__send-icon"></span>
        </button>
      </div>
    </div>

    <div v-if="error" class="n-chat-input__error">
      {{ error }}
    </div>

    <div v-if="hint" class="n-chat-input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";

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
   * Ob die Komponente gerade lädt
   */
  isLoading?: boolean;

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
}

// Default-Werte für Props
const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Geben Sie Ihre Nachricht ein...",
  disabled: false,
  isLoading: false,
  maxLength: 4000,
  minHeight: 56,
  maxHeight: 200,
  initialHeight: 56,
  showCharacterCount: true,
  sendButtonTitle: "Nachricht senden (Enter)",
  autofocus: true,
});

// Emit Definition
const emit = defineEmits<{
  /**
   * Event beim Ändern des Eingabewerts
   */
  (e: "update:modelValue", value: string): void;

  /**
   * Event beim Absenden des Formulars
   */
  (e: "submit", value: string): void;

  /**
   * Event beim Fokussieren des Eingabefelds
   */
  (e: "focus"): void;

  /**
   * Event beim Verlassen des Eingabefelds
   */
  (e: "blur"): void;

  /**
   * Event beim Drücken einer Taste
   */
  (e: "keydown", event: KeyboardEvent): void;
}>();

// Lokale Zustände
const inputElement = ref<HTMLTextAreaElement | null>(null);
const inputValue = ref(props.modelValue);
const isFocused = ref(false);

// Computed Properties
const canSubmit = computed(() => {
  return (
    inputValue.value.trim().length > 0 &&
    (!props.maxLength || inputValue.value.length <= props.maxLength)
  );
});

// Event-Handler
function handleSubmit(): void {
  if (!canSubmit.value || props.disabled || props.isLoading) {
    return;
  }

  const trimmedValue = inputValue.value.trim();
  emit("submit", trimmedValue);
  inputValue.value = "";

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
  emit("keydown", event);
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
    props.maxHeight,
  );

  textarea.style.height = `${newHeight}px`;

  // Modellwert aktualisieren
  emit("update:modelValue", inputValue.value);
}

// Lifecycle Hooks
onMounted(() => {
  // Initial die Textarea-Größe anpassen
  nextTick(() => {
    resizeTextarea();
  });

  // Autofokus
  if (props.autofocus && inputElement.value) {
    inputElement.value.focus();
  }
});

// Watches
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue;
      nextTick(() => {
        resizeTextarea();
      });
    }
  },
);

// Stellt sicher, dass die Größe angepasst wird, wenn sich der Wert ändert
watch(
  () => inputValue.value,
  () => {
    nextTick(() => {
      resizeTextarea();
    });
  },
);
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
  font-family: var(--nscale-font-family-base, "Segoe UI", sans-serif);
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
  content: "";
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
  animation: dot-pulse 1.4s infinite ease-in-out both;
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
@keyframes dot-pulse {
  0%,
  80%,
  100% {
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
}

/* Reduktion von Animationen für Benutzer, die das bevorzugen */
@media (prefers-reduced-motion: reduce) {
  .n-chat-input__loading-indicator span {
    animation: none;
  }

  .n-chat-input__send-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
