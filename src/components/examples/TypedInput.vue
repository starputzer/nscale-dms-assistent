<template>
  <div
    class="n-input-wrapper"
    :class="{
      'n-input--disabled': disabled,
      'n-input--readonly': readonly,
      'n-input--focused': isFocused,
      'n-input--error': Boolean(error),
      'n-input--success': success,
      'n-input--has-prefix': Boolean($slots.prefix),
      'n-input--has-suffix': Boolean($slots.suffix) || clearable,
    }"
  >
    <label v-if="label" :for="inputId" class="n-input__label">
      {{ label }}
      <span v-if="required" class="n-input__required-mark">*</span>
    </label>

    <div class="n-input__container">
      <div v-if="$slots.prefix" class="n-input__prefix">
        <slot name="prefix"></slot>
      </div>

      <input
        :id="inputId"
        ref="inputRef"
        v-bind="$attrs"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :maxlength="maxlength"
        class="n-input__field"
        @input="onInput"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />

      <div class="n-input__suffix">
        <button
          v-if="clearable && modelValue && !disabled && !readonly"
          type="button"
          class="n-input__clear-button"
          @click="onClear"
          aria-label="Clear input"
        >
          <svg viewBox="0 0 24 24" class="n-input__clear-icon">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>

        <slot name="suffix"></slot>
      </div>
    </div>

    <div v-if="maxlength" class="n-input__character-count">
      {{ modelValue?.length || 0 }}/{{ maxlength }}
    </div>

    <div v-if="error" class="n-input__error-message">
      {{ error }}
    </div>

    <div v-else-if="hint" class="n-input__hint">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { VModelProps, VModelEmits } from "@/utils/componentTypes";
import { ref, computed, useAttrs, onMounted } from "vue";

// Input-Typen als Konstante definieren
export const INPUT_TYPES = [
  "text",
  "password",
  "email",
  "number",
  "tel",
  "url",
  "search",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "color",
] as const;
export type InputType = (typeof INPUT_TYPES)[number];

/**
 * V-Model Props Definition
 */
type InputModelValueType = string | number | null | undefined;

export interface InputProps extends VModelProps<InputModelValueType> {
  /**
   * Eindeutige ID für das Input-Element
   */
  id?: string;

  /**
   * Label für das Input-Element
   */
  label?: string;

  /**
   * Platzhaltertext, der angezeigt wird, wenn kein Wert eingegeben wurde
   */
  placeholder?: string;

  /**
   * Typ des Input-Elements
   */
  type?: InputType;

  /**
   * Gibt an, ob das Input-Element deaktiviert ist
   */
  disabled?: boolean;

  /**
   * Gibt an, ob das Input-Element schreibgeschützt ist
   */
  readonly?: boolean;

  /**
   * Gibt an, ob das Input-Element erforderlich ist
   */
  required?: boolean;

  /**
   * Fehlermeldung, die angezeigt wird, wenn das Input-Element ungültig ist
   */
  error?: string;

  /**
   * Gibt an, ob das Input-Element einen gültigen Wert hat
   */
  success?: boolean;

  /**
   * Hinweistext, der unter dem Input-Element angezeigt wird
   */
  hint?: string;

  /**
   * Gibt an, ob eine Schaltfläche zum Löschen des Wertes angezeigt werden soll
   */
  clearable?: boolean;

  /**
   * Maximale Anzahl von Zeichen, die eingegeben werden können
   */
  maxlength?: number;

  /**
   * Gibt an, ob ein Zähler für die Anzahl der eingegebenen Zeichen angezeigt werden soll
   */
  showCharCount?: boolean;

  /**
   * Gibt an, ob der Fokus beim Mounten des Elements gesetzt werden soll
   */
  autofocus?: boolean;
}

/**
 * V-Model Emits Definition
 */
export type InputEmits = VModelEmits<InputModelValueType> & {
  /**
   * Wird ausgelöst, wenn der Input-Wert geändert wurde
   */
  change: [InputModelValueType];

  /**
   * Wird ausgelöst, wenn das Input-Element den Fokus erhält
   */
  focus: [FocusEvent];

  /**
   * Wird ausgelöst, wenn das Input-Element den Fokus verliert
   */
  blur: [FocusEvent];

  /**
   * Wird ausgelöst, wenn eine Taste gedrückt wird
   */
  keydown: [KeyboardEvent];

  /**
   * Wird ausgelöst, wenn der Wert gelöscht wird
   */
  clear: [];
};

/**
 * Stark typisierte Input-Komponente mit v-model Unterstützung
 *
 * @example
 * ```vue
 * <TypedInput
 *   v-model="value"
 *   label="Username"
 *   placeholder="Enter your username"
 *   :error="errors.username"
 *   clearable
 *   required
 * />
 * ```
 */

// Props Definition
const props = withDefaults(defineProps<InputProps>(), {
  type: "text",
  modelValue: "",
  disabled: false,
  readonly: false,
  required: false,
  success: false,
  clearable: false,
  showCharCount: false,
  autofocus: false,
});

// Event-Emitter mit Typsicherheit
const emit = defineEmits<InputEmits>();

// Lokaler Zustand
const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);
const attrs = useAttrs();

// Berechnete Eigenschaften
const inputId = computed(() => props.id || `input-${Date.now()}`);

// Event-Handler
function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  let value: InputModelValueType = target.value;

  // Bei number-Eingabefeldern in number konvertieren
  if (props.type === "number" && value !== "") {
    value = parseFloat(value);
  }

  emit("update:modelValue", value);
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  let value: InputModelValueType = target.value;

  // Bei number-Eingabefeldern in number konvertieren
  if (props.type === "number" && value !== "") {
    value = parseFloat(value);
  }

  emit("change", value);
}

function onFocus(event: FocusEvent) {
  isFocused.value = true;
  emit("focus", event);
}

function onBlur(event: FocusEvent) {
  isFocused.value = false;
  emit("blur", event);
}

function onKeydown(event: KeyboardEvent) {
  emit("keydown", event);
}

function onClear() {
  emit("update:modelValue", "");
  emit("clear");

  // Fokus zurück auf das Eingabefeld setzen
  inputRef.value?.focus();
}

// Lifecycle-Hooks
onMounted(() => {
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus();
  }
});
</script>

<style scoped>
/* Komponente wird in einem Container eingeschlossen */
.n-input-wrapper {
  position: relative;
  margin-bottom: 1.25rem;
  width: 100%;
  font-family: var(--n-font-family, system-ui, sans-serif);
}

/* Label-Styling */
.n-input__label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-label-color, #4a5568);
}

.n-input__required-mark {
  color: var(--n-error-color, #e53e3e);
  margin-left: 0.125rem;
}

/* Input-Container für Flexbox-Layout */
.n-input__container {
  position: relative;
  display: flex;
  width: 100%;
  background-color: var(--n-input-bg, #ffffff);
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius, 0.375rem);
  transition: all 0.2s ease-in-out;
}

/* Input-Feld */
.n-input__field {
  flex-grow: 1;
  width: 100%;
  padding: 0.625rem 0.75rem;
  color: var(--n-text-color, #2d3748);
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: transparent;
  border: none;
  outline: none;
}

.n-input__field::-webkit-input-placeholder {
  color: var(--n-placeholder-color, #a0aec0);
}

.n-input__field::-moz-placeholder {
  color: var(--n-placeholder-color, #a0aec0);
}

/* Prefix & Suffix Container */
.n-input__prefix,
.n-input__suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.75rem;
  color: var(--n-icon-color, #718096);
}

/* "×" (Clear) Button */
.n-input__clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  padding: 0;
  background: none;
  border: none;
  color: var(--n-icon-color, #718096);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.n-input__clear-button:hover {
  opacity: 1;
}

.n-input__clear-icon {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

/* Verschiedene Zustände */
.n-input--focused .n-input__container {
  border-color: var(--n-primary-color, #3182ce);
  box-shadow: 0 0 0 2px var(--n-primary-focus-color, rgba(49, 130, 206, 0.2));
}

.n-input--error .n-input__container {
  border-color: var(--n-error-color, #e53e3e);
}

.n-input--error.n-input--focused .n-input__container {
  box-shadow: 0 0 0 2px var(--n-error-focus-color, rgba(229, 62, 62, 0.2));
}

.n-input--success .n-input__container {
  border-color: var(--n-success-color, #38a169);
}

.n-input--success.n-input--focused .n-input__container {
  box-shadow: 0 0 0 2px var(--n-success-focus-color, rgba(56, 161, 105, 0.2));
}

.n-input--disabled .n-input__container {
  background-color: var(--n-disabled-bg, #f7fafc);
  border-color: var(--n-disabled-border, #e2e8f0);
  cursor: not-allowed;
}

.n-input--disabled .n-input__field,
.n-input--readonly .n-input__field {
  cursor: not-allowed;
  color: var(--n-disabled-text, #a0aec0);
}

/* Hinweis- und Fehlermeldungen */
.n-input__hint,
.n-input__error-message {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  line-height: 1.25;
}

.n-input__hint {
  color: var(--n-hint-color, #718096);
}

.n-input__error-message {
  color: var(--n-error-color, #e53e3e);
}

/* Zeichenzähler */
.n-input__character-count {
  position: absolute;
  bottom: -1.25rem;
  right: 0;
  font-size: 0.75rem;
  color: var(--n-hint-color, #718096);
}

/* Anpassungen für verschiedene Eingabetypen */
input[type="number"].n-input__field {
  appearance: textfield;
}

input[type="number"].n-input__field::-webkit-inner-spin-button,
input[type="number"].n-input__field::-webkit-outer-spin-button {
  appearance: none;
}

input[type="date"].n-input__field,
input[type="time"].n-input__field,
input[type="datetime-local"].n-input__field,
input[type="month"].n-input__field,
input[type="week"].n-input__field {
  padding-right: 0.5rem;
}

/* Anpassungen für den Safari-Browser */
@supports (not (color-scheme: dark)) {
  input[type="date"].n-input__field,
  input[type="time"].n-input__field,
  input[type="datetime-local"].n-input__field,
  input[type="month"].n-input__field,
  input[type="week"].n-input__field {
    padding-right: 0.25rem;
  }
}

/* Unterstützung für Dunkelmodus */
@media (prefers-color-scheme: dark) {
  .n-input__label {
    color: var(--n-dark-label-color, #e2e8f0);
  }

  .n-input__container {
    background-color: var(--n-dark-input-bg, #2d3748);
    border-color: var(--n-dark-border-color, #4a5568);
  }

  .n-input__field {
    color: var(--n-dark-text-color, #e2e8f0);
  }

  .n-input__field::-webkit-input-placeholder {
    color: var(--n-dark-placeholder-color, #718096);
  }

  .n-input__field::-moz-placeholder {
    color: var(--n-dark-placeholder-color, #718096);
  }

  .n-input--disabled .n-input__container {
    background-color: var(--n-dark-disabled-bg, #1a202c);
    border-color: var(--n-dark-disabled-border, #4a5568);
  }

  .n-input--disabled .n-input__field,
  .n-input--readonly .n-input__field {
    color: var(--n-dark-disabled-text, #718096);
  }

  .n-input__hint,
  .n-input__character-count {
    color: var(--n-dark-hint-color, #a0aec0);
  }
}
</style>
