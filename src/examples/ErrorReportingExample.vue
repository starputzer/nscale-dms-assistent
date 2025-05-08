<template>
  <div class="error-reporting-example">
    <h2>Fehlerbehandlung mit automatischem Fallback</h2>
    
    <div class="component-selector">
      <h3>Komponente anzeigen:</h3>
      <div class="buttons">
        <button 
          v-for="(_, key) in components" 
          :key="key"
          @click="currentComponent = key"
          :class="{ active: currentComponent === key }"
        >
          {{ key }}
        </button>
      </div>
    </div>
    
    <div class="component-container">
      <template v-if="hasError && !isFallbackActive">
        <div class="error-display">
          <h3>Fehler aufgetreten</h3>
          <p>{{ currentError?.message }}</p>
          <div v-if="currentError?.source" class="error-source">
            in {{ currentError.source.type }}: {{ currentError.source.name }}
          </div>
          <div class="error-actions">
            <button @click="resetError">Erneut versuchen</button>
            <button @click="activateFallback">Fallback aktivieren</button>
          </div>
        </div>
      </template>
      
      <template v-else-if="isFallbackActive">
        <div class="fallback-display">
          <h3>Fallback-Modus ist aktiv</h3>
          <p>Es wurde auf die Fallback-Implementierung umgeschaltet.</p>
          <button @click="deactivateFallback">Zurücksetzen</button>
        </div>
      </template>
      
      <template v-else>
        <component 
          :is="components[currentComponent]" 
          @trigger-error="handleComponentError" 
        />
      </template>
    </div>
    
    <div class="error-history">
      <h3>Fehlerprotokoll ({{ errorCount }})</h3>
      <div v-if="errorCount === 0" class="no-errors">
        Keine Fehler aufgetreten
      </div>
      <ul v-else>
        <li v-for="error in recentErrors" :key="error.id" class="error-item">
          <div class="error-header">
            <span class="error-severity" :class="error.severity">{{ error.severity }}</span>
            <span class="error-source">{{ error.source.type }}: {{ error.source.name }}</span>
            <span class="error-time">{{ formatTime(error.timestamp) }}</span>
          </div>
          <div class="error-message">{{ error.message }}</div>
          <button class="dismiss-button" @click="ignoreError(error.id)">
            Ignorieren
          </button>
        </li>
      </ul>
      <button v-if="errorCount > 0" @click="clearAllErrors" class="clear-all">
        Alle Fehler löschen
      </button>
    </div>
    
    <div class="test-actions">
      <h3>Fehler simulieren</h3>
      <button @click="triggerRenderError">Render-Fehler</button>
      <button @click="triggerApiError">API-Fehler</button>
      <button @click="triggerStoreError">Store-Fehler</button>
      <button @click="triggerAsyncError">Async-Fehler</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { useErrorReporting } from '@/composables/useErrorReporting';

const currentComponent = ref('SafeComponent');

// Komponenten mit unterschiedlichem Fehlerverhalten
const components = {
  'SafeComponent': defineAsyncComponent(() => 
    import('./components/SafeComponent.vue')
  ),
  'ErrorComponent': defineAsyncComponent(() => 
    import('./components/ErrorComponent.vue')
  ),
  'AsyncErrorComponent': defineAsyncComponent(() => 
    import('./components/AsyncErrorComponent.vue')
  )
};

// Error-Reporting-Hook einbinden
const {
  hasError,
  currentError,
  isFallbackActive,
  reportError,
  reportComponentError,
  reportApiError,
  reportStoreError,
  resetError,
  activateFallback,
  deactivateFallback,
  ignoreError,
  clearAllErrors,
  getErrors,
  errorCount
} = useErrorReporting({
  featureFlag: 'errorReportingExample',
  captureComponentErrors: true,
  automaticFallback: true,
  defaultSeverity: 'medium'
});

// Aktuelle Fehler für die Anzeige abrufen
const recentErrors = computed(() => {
  return getErrors(5); // Nur die neuesten 5 Fehler anzeigen
});

// Formatierungsfunktion für Zeitangaben
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString();
}

// Fehler von Kind-Komponenten behandeln
function handleComponentError(error: Error): void {
  reportComponentError(error, {
    severity: 'medium',
    context: {
      source: 'child-component-event',
      componentName: currentComponent.value
    }
  });
}

// Verschiedene Fehlertypen simulieren
function triggerRenderError(): void {
  reportComponentError(new Error('Fehler beim Rendern der Komponente'), {
    severity: 'high',
    context: {
      renderFunction: 'render()',
      component: 'ExampleComponent'
    }
  });
}

function triggerApiError(): void {
  reportApiError('/api/example', new Error('API-Anfrage fehlgeschlagen'), {
    severity: 'high',
    context: {
      statusCode: 500,
      endpoint: '/api/example',
      requestData: { id: 123 }
    }
  });
}

function triggerStoreError(): void {
  reportStoreError('exampleStore', new Error('Zustandsaktualisierung fehlgeschlagen'), {
    severity: 'medium',
    context: {
      action: 'updateData',
      payload: { newValue: 'test' }
    }
  });
}

function triggerAsyncError(): void {
  // Asynchronen Fehler simulieren
  setTimeout(() => {
    reportError(new Error('Asynchroner Fehler aufgetreten'), {
      source: {
        type: 'lifecycle',
        name: 'asyncOperation'
      },
      severity: 'medium',
      context: {
        operation: 'fetchData',
        async: true
      }
    });
  }, 500);
}
</script>

<style scoped>
.error-reporting-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  color: rgb(17, 24, 39);
}

h3 {
  margin-bottom: 15px;
  color: rgb(75, 85, 99);
}

.component-selector {
  margin-bottom: 20px;
}

.buttons {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  background-color: #e5e7eb;
}

button.active {
  background-color: #0d7a40;
  color: white;
}

.component-container {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 20px;
  min-height: 200px;
  background-color: #f3f4f6;
}

.error-display, .fallback-display {
  background-color: rgba(239, 68, 68, 0.1);
  padding: 15px;
  border-radius: 6px;
  border: 1px solid rgb(239, 68, 68);
}

.fallback-display {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: rgb(245, 158, 11);
}

.error-source {
  font-size: 14px;
  color: rgb(107, 114, 128);
  margin: 10px 0;
}

.error-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.error-history {
  margin-top: 30px;
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f3f4f6;
}

.no-errors {
  font-style: italic;
  color: rgb(107, 114, 128);
}

.error-item {
  background-color: rgba(239, 68, 68, 0.05);
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  position: relative;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.error-severity {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
}

.error-severity.low {
  background-color: rgba(59, 130, 246, 0.2);
  color: rgb(37, 99, 235);
}

.error-severity.medium {
  background-color: rgba(245, 158, 11, 0.2);
  color: rgb(217, 119, 6);
}

.error-severity.high, .error-severity.critical {
  background-color: rgba(239, 68, 68, 0.2);
  color: rgb(220, 38, 38);
}

.error-source {
  font-weight: 500;
}

.error-time {
  color: rgb(107, 114, 128);
}

.error-message {
  margin-bottom: 8px;
}

.dismiss-button {
  padding: 4px 8px;
  font-size: 12px;
  background-color: transparent;
  border: 1px solid #e5e7eb;
}

.clear-all {
  margin-top: 10px;
  width: 100%;
}

.test-actions {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-actions h3 {
  margin-bottom: 10px;
}

.test-actions button {
  padding: 10px;
  background-color: #e5e7eb;
}

@media (max-width: 768px) {
  .error-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .buttons {
    flex-wrap: wrap;
  }
}
</style>