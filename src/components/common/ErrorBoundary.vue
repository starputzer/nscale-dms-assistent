<template>
  <slot v-if="!error" />
  <div v-else class="error-boundary">
    <slot name="fallback" :error="error" :reset="resetError">
      <div class="error-boundary__content">
        <div class="error-boundary__icon">
          <i class="fa fa-exclamation-triangle"></i>
        </div>
        <div class="error-boundary__message">
          <h3>Komponente konnte nicht geladen werden</h3>
          <p>{{ errorMessage }}</p>
          <button @click="resetError" class="error-boundary__button">
            Erneut versuchen
          </button>
          <button
            v-if="fallbackComponent"
            @click="useFallback"
            class="error-boundary__button error-boundary__button--secondary"
          >
            Fallback-Version laden
          </button>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup>
import { ref, computed, watch, onErrorCaptured, provide } from "vue";

const props = defineProps({
  fallbackComponent: {
    type: Object,
    default: null,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  resetOnPropsChange: {
    type: Boolean,
    default: false,
  },
  onError: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(["error", "reset", "fallback"]);

const error = ref(null);
const retryCount = ref(0);
const useFallbackVersion = ref(false);

const errorMessage = computed(() => {
  if (!error.value) return "";

  if (typeof error.value === "string") {
    return error.value;
  }

  if (error.value instanceof Error) {
    return error.value.message || "Ein unbekannter Fehler ist aufgetreten";
  }

  return "Ein unbekannter Fehler ist aufgetreten";
});

// Fehler zurücksetzen und erneut versuchen
function resetError() {
  if (retryCount.value >= props.maxRetries) {
    console.warn(
      `Maximale Anzahl von Wiederholungen erreicht (${props.maxRetries})`,
    );
    return;
  }

  retryCount.value++;
  error.value = null;
  useFallbackVersion.value = false;
  emit("reset", retryCount.value);
}

// Fallback-Komponente verwenden
function useFallback() {
  useFallbackVersion.value = true;
  emit("fallback");
}

// Fehlerbehandlung für Kind-Komponenten
onErrorCaptured((err, instance, info) => {
  console.error("Fehler in Kind-Komponente gefangen:", err);

  // Fehler speichern
  error.value = err;

  // Optional Callback aufrufen
  if (props.onError) {
    props.onError(err, instance, info);
  }

  // Event emittieren
  emit("error", { error: err, instance, info, retryCount: retryCount.value });

  // Verhindern, dass der Fehler weiter hochgereicht wird
  return false;
});

// In übergeordneten Props-Änderungen zurücksetzen
watch(
  () => props,
  () => {
    if (props.resetOnPropsChange && error.value) {
      resetError();
    }
  },
  { deep: true },
);

// Fehlerstatus für Kinder bereitstellen
provide("errorBoundary", {
  hasError: computed(() => !!error.value),
  error,
  resetError,
});
</script>

<style scoped>
.error-boundary {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #fff8f8;
  border: 1px solid #f5c6cb;
}

.error-boundary__content {
  display: flex;
  align-items: flex-start;
}

.error-boundary__icon {
  font-size: 2rem;
  color: #dc3545;
  margin-right: 1rem;
  padding-top: 0.25rem;
}

.error-boundary__message {
  flex: 1;
}

.error-boundary__message h3 {
  margin: 0 0 1rem;
  color: #721c24;
  font-size: 1.25rem;
}

.error-boundary__message p {
  margin: 0 0 1rem;
  color: #721c24;
}

.error-boundary__button {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-right: 0.75rem;
}

.error-boundary__button--secondary {
  background-color: #6c757d;
}
</style>
