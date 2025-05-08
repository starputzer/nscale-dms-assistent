<template>
  <div class="async-error-component">
    <h3>Asynchrone Fehlerkomponente</h3>
    <p>Diese Komponente enthält asynchrone Operationen, die Fehler verursachen können.</p>
    
    <div class="content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Lädt Daten...</span>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>Fehler beim Laden der Daten:</p>
        <pre>{{ error.message }}</pre>
        <button @click="retryFetch">Erneut versuchen</button>
      </div>
      
      <div v-else-if="data" class="data-display">
        <h4>Geladene Daten:</h4>
        <pre>{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
      
      <div class="actions">
        <button @click="fetchValidData" :disabled="loading">
          Gültige Daten laden
        </button>
        <button @click="fetchInvalidData" :disabled="loading">
          Ungültige Daten laden
        </button>
        <button @click="triggerAsyncError" :disabled="loading">
          Netzwerkfehler simulieren
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const emit = defineEmits<{
  (e: 'trigger-error', error: Error): void
}>();

const loading = ref(false);
const data = ref<any>(null);
const error = ref<Error | null>(null);

// Simulation: Gültige Daten laden
async function fetchValidData() {
  loading.value = true;
  error.value = null;
  data.value = null;
  
  try {
    // Simulierte API-Anfrage
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    data.value = {
      id: 123,
      name: "Beispieldaten",
      status: "success",
      timestamp: new Date().toISOString(),
      items: [
        { id: 1, value: "Item 1" },
        { id: 2, value: "Item 2" },
        { id: 3, value: "Item 3" }
      ]
    };
  } catch (err) {
    const thrownError = err as Error;
    error.value = thrownError;
    emit('trigger-error', thrownError);
  } finally {
    loading.value = false;
  }
}

// Simulation: Ungültige Daten laden (Format-Fehler)
async function fetchInvalidData() {
  loading.value = true;
  error.value = null;
  data.value = null;
  
  try {
    // Simulierte API-Anfrage
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Ungültige Antwort simulieren
    const invalidResponse = "This is not valid JSON";
    
    // Versuchen, die Antwort zu verarbeiten
    try {
      data.value = JSON.parse(invalidResponse);
    } catch (parseError) {
      throw new Error(`Fehler beim Parsen der Antwort: ${(parseError as Error).message}`);
    }
  } catch (err) {
    const thrownError = err as Error;
    error.value = thrownError;
    emit('trigger-error', thrownError);
  } finally {
    loading.value = false;
  }
}

// Simulation: Netzwerkfehler
async function triggerAsyncError() {
  loading.value = true;
  error.value = null;
  data.value = null;
  
  try {
    // Simulierte API-Anfrage mit Timeout
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Netzwerkfehler simulieren
    throw new Error("Netzwerkfehler: Server nicht erreichbar (Timeout nach 30 Sekunden)");
  } catch (err) {
    const thrownError = err as Error;
    error.value = thrownError;
    emit('trigger-error', thrownError);
  } finally {
    loading.value = false;
  }
}

// Wiederholung der letzten Anfrage
function retryFetch() {
  fetchValidData();
}
</script>

<style scoped>
.async-error-component {
  padding: 15px;
  border-radius: var(--border-radius-md);
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border);
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--color-text-primary);
}

.content {
  margin-top: 20px;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background-color: var(--color-background-tertiary);
  border-radius: var(--border-radius-sm);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 15px;
  background-color: var(--color-background-error-light);
  border-radius: var(--border-radius-sm);
  border-left: 4px solid var(--color-error);
}

.error-message pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 10px;
  border-radius: var(--border-radius-sm);
  overflow: auto;
  margin-top: 10px;
  margin-bottom: 15px;
}

.data-display {
  padding: 15px;
  background-color: var(--color-background-success-light);
  border-radius: var(--border-radius-sm);
  border-left: 4px solid var(--color-success);
}

.data-display pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 10px;
  border-radius: var(--border-radius-sm);
  overflow: auto;
  max-height: 200px;
}

.actions button:nth-child(2) {
  background-color: var(--color-warning);
}

.actions button:nth-child(2):hover:not(:disabled) {
  background-color: var(--color-warning-dark);
}

.actions button:nth-child(3) {
  background-color: var(--color-error);
}

.actions button:nth-child(3):hover:not(:disabled) {
  background-color: var(--color-error-dark);
}
</style>