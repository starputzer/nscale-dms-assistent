<template>
  <div class="error-component">
    <h3>Fehlerhafte Komponente</h3>
    <p>
      Diese Komponente enthält einen Rendering-Fehler, der beim Aktivieren
      auftritt.
    </p>
    <div class="content">
      <button @click="triggerError">Fehler auslösen</button>

      <!-- Dieser Code verursacht einen Fehler, wenn showError true ist -->
      <div v-if="showError" class="error-section">
        {{ nonExistentProperty.value }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from "vue";

const emit = defineEmits<{
  (e: "trigger-error", error: Error): void;
}>();

const showError = ref(false);

function triggerError() {
  try {
    // Entweder direkt einen Fehler auslösen oder render-Fehler triggern
    if (Math.random() > 0.5) {
      // Direkter Fehler
      throw new Error("Manuell ausgelöster Fehler in ErrorComponent");
    } else {
      // Render-Fehler
      showError.value = true;
    }
  } catch (error) {
    // Nur wenn wir einen direkten Fehler haben, emittieren wir ihn
    // Der Render-Fehler wird vom ErrorBoundary gefangen
    emit("trigger-error", error as Error);
  }
}
</script>

<style scoped>
.error-component {
  padding: 15px;
  border-radius: var(--border-radius-md);
  background-color: var(--color-background-error-light);
  border: 1px dashed var(--color-error);
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--color-error);
}

.content {
  margin-top: 20px;
}

button {
  padding: 8px 16px;
  background-color: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

button:hover {
  background-color: var(--color-error-dark);
}
</style>
