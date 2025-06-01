<template>
  <button
    :class="[
      'n-button',
      `n-button--${variant}`,
      `n-button--${size}`,
      {
        'n-button--loading': loading,
        'n-button--full-width': fullWidth,
        'n-button--icon-only': isIconOnly,
      },
    ]"
    :disabled="disabled || loading"
    :type="type"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : 'false'"
    v-bind="$attrs"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space="handleClick"
  >
    <span v-if="loading" class="n-button__loader" aria-hidden="true">
      <svg
        class="n-button__spinner"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="n-button__spinner-path"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke-width="3"
        />
      </svg>
    </span>
    <span
      v-if="iconLeft && !loading"
      class="n-button__icon n-button__icon--left"
      aria-hidden="true"
    >
      <component :is="iconLeft" />
    </span>
    <span
      class="n-button__content"
      :class="{ 'n-button__content--hidden': loading }"
    >
      <slot></slot>
    </span>
    <span
      v-if="iconRight && !loading"
      class="n-button__icon n-button__icon--right"
      aria-hidden="true"
    >
      <component :is="iconRight" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PropType, withDefaultProp } from "@/utils/componentTypes";
import { isOneOf } from "@/utils/propValidators";

// Typische Button-Varianten als Konstante definieren
export const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "tertiary",
  "danger",
  "ghost",
] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

// Typische Button-Größen als Konstante definieren
export const BUTTON_SIZES = ["small", "medium", "large"] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

// Button-Typen als HTML-Attribute
export const BUTTON_TYPES = ["button", "submit", "reset"] as const;
export type ButtonType = (typeof BUTTON_TYPES)[number];

/**
 * Stark typisierte Button-Komponente mit umfassender Validierung
 *
 * @example
 * ```vue
 * <TypedButton
 *   variant="primary"
 *   size="medium"
 *   type="button"
 *   :loading="isLoading"
 *   :disabled="isDisabled"
 *   @click="handleClick"
 * >
 *   Click Me
 * </TypedButton>
 * ```
 */

// Props Definition mit Typvalidierung, Standardwerten und Validierungsfunktionen
const props = defineProps({
  /**
   * Button-Stil-Variante
   */
  variant: {
    type: String as PropType<ButtonVariant>,
    default: "primary",
    validator: isOneOf(BUTTON_VARIANTS),
  },

  /**
   * Button-Größe
   */
  size: withDefaultProp(
    String as PropType<ButtonSize>,
    "medium",
    isOneOf(BUTTON_SIZES),
  ),

  /**
   * Button HTML Typ-Attribut
   */
  type: withDefaultProp(
    String as PropType<ButtonType>,
    "button",
    isOneOf(BUTTON_TYPES),
  ),

  /**
   * Gibt an, ob der Button deaktiviert ist
   */
  disabled: withDefaultProp(Boolean, false),

  /**
   * Gibt an, ob der Button im Lade-Zustand ist
   */
  loading: withDefaultProp(Boolean, false),

  /**
   * Gibt an, ob der Button die gesamte Breite des Containers einnehmen soll
   */
  fullWidth: withDefaultProp(Boolean, false),

  /**
   * Icon-Komponente zur Anzeige auf der linken Seite
   */
  iconLeft: {
    type: [Object, Function],
    default: null,
  },

  /**
   * Icon-Komponente zur Anzeige auf der rechten Seite
   */
  iconRight: {
    type: [Object, Function],
    default: null,
  },

  /**
   * Gibt an, ob der Button nur ein Icon enthält (kein Text)
   */
  iconOnly: withDefaultProp(Boolean, false),
});

// Stark typisierte Event-Definitionen
const emit = defineEmits<{
  /**
   * Wird ausgelöst, wenn auf den Button geklickt wird
   * @param event Das ursprüngliche Maus- oder Tastatur-Event
   */
  (e: "click", event: MouseEvent | KeyboardEvent): void;

  /**
   * Wird ausgelöst, wenn der Button fokussiert wird
   * @param event Das ursprüngliche FocusEvent
   */
  (e: "focus", event: FocusEvent): void;

  /**
   * Wird ausgelöst, wenn der Button den Fokus verliert
   * @param event Das ursprüngliche FocusEvent
   */
  (e: "blur", event: FocusEvent): void;
}>();

/**
 * Computed property zur Bestimmung, ob der Button nur ein Icon enthält
 */
const isIconOnly = computed(() => {
  return (
    props.iconOnly || (!slots.default && (props.iconLeft || props.iconRight))
  );
});

/**
 * Zugriff auf die Komponenten-Slots
 */
const slots = defineSlots();

/**
 * Event-Handler für Klick-Events
 */
function handleClick(event: MouseEvent | KeyboardEvent) {
  if (props.disabled || props.loading) return;

  // Bei Tastatur-Events nur fortfahren, wenn es Enter oder Space ist
  if (event instanceof KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
  }

  emit("click", event);
}
</script>

<style scoped>
/* Styles aus dem Original-Button übernommen */
.n-button {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(
    --n-font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  font-weight: 500;
  border-radius: var(--n-border-radius, 4px);
  transition: all 0.2s ease;
  cursor: pointer;
  outline: none;
  position: relative;
  border: 1px solid transparent;
  gap: 0.5rem;
  margin: 0;
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
}

/* Size variants */
.n-button--small {
  font-size: var(--n-font-size-sm, 0.875rem);
  padding: 0.375rem 0.75rem;
  height: 2rem;
}

.n-button--medium {
  font-size: var(--n-font-size-md, 1rem);
  padding: 0.5rem 1rem;
  height: 2.5rem;
}

.n-button--large {
  font-size: var(--n-font-size-lg, 1.125rem);
  padding: 0.625rem 1.25rem;
  height: 3rem;
}

/* Icon-only buttons are square */
.n-button--icon-only.n-button--small {
  padding: 0.375rem;
  width: 2rem;
}

.n-button--icon-only.n-button--medium {
  padding: 0.5rem;
  width: 2.5rem;
}

.n-button--icon-only.n-button--large {
  padding: 0.625rem;
  width: 3rem;
}

/* Color variants */
.n-button--primary {
  background-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
  border-color: var(--n-color-primary, #0066cc);
}

.n-button--primary:hover:not(:disabled) {
  background-color: var(--n-color-primary-dark, #0052a3);
  border-color: var(--n-color-primary-dark, #0052a3);
}

.n-button--secondary {
  background-color: var(--n-color-white, #ffffff);
  color: var(--n-color-primary, #0066cc);
  border-color: var(--n-color-primary, #0066cc);
}

.n-button--secondary:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  border-color: var(--n-color-primary-dark, #0052a3);
  color: var(--n-color-primary-dark, #0052a3);
}

.n-button--tertiary {
  background-color: var(--n-color-white, #ffffff);
  color: var(--n-color-gray-700, #4a5568);
  border-color: var(--n-color-gray-300, #e2e8f0);
}

.n-button--tertiary:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  border-color: var(--n-color-gray-400, #cbd5e0);
  color: var(--n-color-gray-800, #2d3748);
}

.n-button--danger {
  background-color: var(--n-color-danger, #e53e3e);
  color: var(--n-color-white, #ffffff);
  border-color: var(--n-color-danger, #e53e3e);
}

.n-button--danger:hover:not(:disabled) {
  background-color: var(--n-color-danger-dark, #c53030);
  border-color: var(--n-color-danger-dark, #c53030);
}

.n-button--ghost {
  background-color: transparent;
  color: var(--n-color-primary, #0066cc);
  border-color: transparent;
}

.n-button--ghost:hover:not(:disabled) {
  background-color: var(--n-color-gray-100, #f5f5f5);
  color: var(--n-color-primary-dark, #0052a3);
}

/* States */
.n-button:focus-visible {
  outline: 2px solid var(--n-color-primary-light, #3498db);
  outline-offset: 2px;
}

.n-button:active:not(:disabled) {
  transform: translateY(1px);
}

.n-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading state */
.n-button--loading {
  cursor: wait;
}

.n-button__loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1.25em;
  height: 1.25em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-button__spinner {
  animation: spin 1s linear infinite;
  width: 100%;
  height: 100%;
}

.n-button__spinner-path {
  stroke: currentColor;
  stroke-linecap: round;
  animation: spinner-dash 1.5s ease-in-out infinite;
}

.n-button__content--hidden {
  visibility: hidden;
  opacity: 0;
}

/* Icons */
.n-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}

.n-button__icon--left {
  margin-right: 0.25rem;
}

.n-button__icon--right {
  margin-left: 0.25rem;
}

/* For icon-only buttons, no margins */
.n-button--icon-only .n-button__icon {
  margin: 0;
}

/* Full width */
.n-button--full-width {
  width: 100%;
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spinner-dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
