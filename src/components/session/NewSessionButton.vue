<template>
  <button 
    class="n-new-session-button"
    :class="{
      'n-new-session-button--block': display === 'block',
      'n-new-session-button--floating': display === 'floating',
      'n-new-session-button--compact': compact,
      'n-new-session-button--loading': isLoading
    }"
    @click="handleClick"
    :disabled="disabled || isLoading"
    :title="buttonText"
    :aria-label="buttonText"
    :aria-busy="isLoading"
  >
    <!-- Loading Spinner -->
    <div v-if="isLoading" class="n-new-session-button__spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
    </div>
    
    <!-- Icon -->
    <div v-else class="n-new-session-button__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>

    <!-- Text (only if not compact mode) -->
    <span v-if="!compact || display === 'block'" class="n-new-session-button__text">
      {{ buttonText }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSessionsStore } from '@/stores/sessions';

/**
 * NewSessionButton
 * 
 * Eine flexible Schaltfläche zum Erstellen neuer Chat-Sessions. Kann in
 * verschiedenen Modi angezeigt werden und integriert sich direkt mit dem
 * Sessions-Store.
 */

interface Props {
  /** Anzeigemodus der Schaltfläche */
  display?: 'inline' | 'block' | 'floating';
  /** Text auf der Schaltfläche */
  buttonText?: string;
  /** Ob die Schaltfläche deaktiviert sein soll */
  disabled?: boolean;
  /** Kompakter Modus (nur Icon) */
  compact?: boolean;
  /** Benutzerdefinierte Größe */
  size?: 'sm' | 'md' | 'lg';
  /** Ob die Schaltfläche direkt den Store nutzen soll */
  useStore?: boolean;
  /** Sessiontitel für neue Sessions */
  defaultSessionTitle?: string;
  /** Callback nach erfolgreicher Erstellung */
  afterCreate?: (sessionId: string) => void;
}

// Props mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  display: 'inline',
  buttonText: 'Neue Unterhaltung',
  disabled: false,
  compact: false,
  size: 'md',
  useStore: true,
  defaultSessionTitle: 'Neue Unterhaltung'
});

// Emits
const emit = defineEmits<{
  /** Wird ausgelöst, wenn eine neue Session erstellt werden soll */
  (e: 'create'): void;
  /** Wird ausgelöst, nachdem eine neue Session erstellt wurde */
  (e: 'created', sessionId: string): void;
}>();

// Store
const sessionsStore = useSessionsStore();

// Status
const isLoading = ref(false);

// Methoden
/**
 * Verarbeitet den Klick auf die Schaltfläche
 */
async function handleClick(): Promise<void> {
  if (props.disabled || isLoading.value) return;
  
  // Emit, falls der Eltern-Komponent die Erstellung kontrollieren soll
  if (!props.useStore) {
    emit('create');
    return;
  }
  
  // Direkt mit dem Store interagieren
  isLoading.value = true;
  
  try {
    // Neue Session erstellen
    const sessionId = await sessionsStore.createSession(props.defaultSessionTitle);
    
    // Erstellungsevent auslösen
    emit('created', sessionId);
    
    // Callback aufrufen, falls vorhanden
    if (props.afterCreate) {
      props.afterCreate(sessionId);
    }
  } catch (error) {
    console.error('Fehler beim Erstellen einer neuen Session:', error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
/* Basis-Stile für die Schaltfläche */
.n-new-session-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--n-space-2, 0.5rem);
  padding: var(--n-space-2, 0.5rem) var(--n-space-4, 1rem);
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  border: none;
  border-radius: var(--n-border-radius-md, 0.5rem);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  box-shadow: var(--n-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

.n-new-session-button:hover:not(:disabled) {
  background-color: var(--n-primary-color-dark, #2c5282);
  box-shadow: var(--n-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
}

.n-new-session-button:active:not(:disabled) {
  transform: scale(0.98);
}

.n-new-session-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--n-primary-color-light, rgba(49, 130, 206, 0.4));
}

.n-new-session-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Block-Variante */
.n-new-session-button--block {
  display: flex;
  width: 100%;
  text-align: center;
  justify-content: center;
}

/* Floating-Variante */
.n-new-session-button--floating {
  position: fixed;
  bottom: var(--n-space-4, 1rem);
  right: var(--n-space-4, 1rem);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  padding: 0;
  box-shadow: var(--n-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
  z-index: 100;
}

.n-new-session-button--floating:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--n-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04));
}

.n-new-session-button--floating .n-new-session-button__text {
  display: none;
}

/* Kompakte Variante */
.n-new-session-button--compact {
  padding: var(--n-space-2, 0.5rem);
}

.n-new-session-button--compact .n-new-session-button__text {
  display: none;
}

/* Größenvarianten */
.n-new-session-button[data-size="sm"] {
  font-size: var(--n-font-size-xs, 0.75rem);
  padding: var(--n-space-1, 0.25rem) var(--n-space-2, 0.5rem);
}

.n-new-session-button[data-size="lg"] {
  font-size: var(--n-font-size-md, 1rem);
  padding: var(--n-space-3, 0.75rem) var(--n-space-5, 1.25rem);
}

/* Icon und Text */
.n-new-session-button__icon,
.n-new-session-button__spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-new-session-button__icon svg,
.n-new-session-button__spinner svg {
  width: 20px;
  height: 20px;
}

.n-new-session-button--compact .n-new-session-button__icon svg,
.n-new-session-button--compact .n-new-session-button__spinner svg {
  width: 18px;
  height: 18px;
}

.n-new-session-button[data-size="sm"] .n-new-session-button__icon svg,
.n-new-session-button[data-size="sm"] .n-new-session-button__spinner svg {
  width: 16px;
  height: 16px;
}

.n-new-session-button[data-size="lg"] .n-new-session-button__icon svg,
.n-new-session-button[data-size="lg"] .n-new-session-button__spinner svg {
  width: 24px;
  height: 24px;
}

.n-new-session-button__text {
  white-space: nowrap;
}

/* Ladezustand */
.n-new-session-button--loading {
  position: relative;
  pointer-events: none;
}

.n-new-session-button__spinner svg {
  animation: n-spin 1s linear infinite;
}

@keyframes n-spin {
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-new-session-button--floating {
    bottom: var(--n-space-3, 0.75rem);
    right: var(--n-space-3, 0.75rem);
  }
}
</style>