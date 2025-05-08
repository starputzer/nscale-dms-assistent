<template>
  <div class="fallback-example">
    <h2>Fallback-Mechanismus Demo</h2>
    
    <!-- Basis-Beispiel mit EnhancedFeatureWrapper -->
    <section class="example-section">
      <h3>Einfaches Fallback-Beispiel</h3>
      <EnhancedFeatureWrapper
        feature="useSfcDocConverter"
        :new-component="NewComponent"
        :legacy-component="LegacyComponent"
        fallback-strategy="threshold"
        :error-threshold="3"
        :retry-interval="5000"
        @feature-error="handleError"
        @feature-fallback="handleFallback"
        @feature-retry="handleRetry"
        @component-mounted="handleMount"
      />
    </section>
    
    <!-- Erweitertes Beispiel mit mehrstufigem Fallback -->
    <section class="example-section">
      <h3>Mehrstufiger Fallback</h3>
      <EnhancedFeatureWrapper
        feature="useSfcSettings"
        :new-component="NewAdvancedComponent"
        :intermediate-component="IntermediateComponent"
        :legacy-component="LegacyComponent"
        fallback-strategy="progressive"
        :use-intermediate-failover="true"
        @feature-error="handleAdvancedError"
      />
    </section>
    
    <!-- Beispiel mit ErrorBoundary direkt -->
    <section class="example-section">
      <h3>Low-Level Error-Boundary</h3>
      <ErrorBoundary
        feature-flag="useSfcSettings"
        fallback-strategy="immediate"
        @error="handleBoundaryError"
      >
        <CustomErrorComponent :simulate-error="simulateError" />
        
        <template #error="{ error, retry }">
          <div class="custom-error-display">
            <h4>Fehler in der Komponente</h4>
            <p>{{ error.message }}</p>
            <button @click="retry">Erneut versuchen</button>
          </div>
        </template>
        
        <template #fallback="{ resetFallback }">
          <div class="custom-fallback">
            <h4>Fallback-Komponente</h4>
            <p>Die Komponente wurde durch eine Alternative ersetzt.</p>
            <button @click="resetFallback">Zurücksetzen</button>
          </div>
        </template>
      </ErrorBoundary>
      
      <div class="error-controls">
        <button @click="simulateError = !simulateError">
          {{ simulateError ? 'Fehler beheben' : 'Fehler simulieren' }}
        </button>
      </div>
    </section>
    
    <!-- Steuerung und Status -->
    <section class="example-section">
      <h3>Fallback-Status</h3>
      <table class="fallback-status-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Fehler</th>
            <th>Level</th>
            <th>Recovery-Versuche</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(status, feature) in featureStatus" :key="feature">
            <td>{{ formatFeatureName(feature) }}</td>
            <td :class="`status-${status.status}`">{{ status.status }}</td>
            <td>{{ status.errorCount }}</td>
            <td>{{ status.level }}/{{ status.maxLevel }}</td>
            <td>{{ status.recoveryAttempts }}</td>
            <td class="status-actions">
              <button 
                v-if="status.status === 'active'"
                @click="deactivateFallback(feature)"
                class="action-button"
              >Deaktivieren</button>
              <button 
                v-else
                @click="activateFallback(feature)"
                class="action-button"
              >Aktivieren</button>
              <button 
                @click="clearErrors(feature)"
                class="action-button"
              >Fehler löschen</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    
    <!-- Event-Historie -->
    <section class="example-section">
      <h3>Event-Historie</h3>
      <div class="event-history">
        <div 
          v-for="(event, index) in eventHistory" 
          :key="`event-${index}`"
          class="event-item"
          :class="`event-${event.type}`"
        >
          <div class="event-time">{{ formatTime(event.timestamp) }}</div>
          <div class="event-type">{{ event.type }}</div>
          <div class="event-feature">{{ formatFeatureName(event.feature) }}</div>
          <div class="event-data">
            <pre v-if="event.data">{{ JSON.stringify(event.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import EnhancedFeatureWrapper from '@/components/shared/EnhancedFeatureWrapper.vue';
import ErrorBoundary, { type BoundaryError } from '@/components/shared/ErrorBoundary.vue';
import { useLogger } from '@/composables/useLogger';
import { useFallbackManager, type FeatureFallbackState, type FallbackEvent } from '@/utils/fallbackManager';

// Logger für die Komponente
const logger = useLogger();

// Fallback-Manager für zentrales Management
const fallbackManager = useFallbackManager({
  onEvent: (event) => {
    // Events in Event-Historie speichern
    eventHistory.value.unshift(event);
    
    // Historie auf 20 Einträge begrenzen
    if (eventHistory.value.length > 20) {
      eventHistory.value.pop();
    }
    
    // In Konsole loggen
    logger.info(`[FallbackManager] Event: ${event.type} für ${event.feature}`, event.data);
  }
});

// Komponenten für den Demo-Bereich
const NewComponent = {
  name: 'NewDocConverter',
  template: `
    <div class="new-component">
      <h4>Neue Vue 3 SFC-Komponente</h4>
      <p>Dies ist die neue Implementierung als Vue 3 SFC-Komponente.</p>
      <p>Countdown bis Fehler: {{ countdown }}</p>
      <button @click="triggerError">Fehler auslösen</button>
      <button @click="reset">Zurücksetzen</button>
    </div>
  `,
  setup() {
    const countdown = ref(10);
    const intervalId = ref<number | null>(null);
    
    function triggerError() {
      throw new Error('Manuell ausgelöster Fehler in neuer Komponente');
    }
    
    function reset() {
      countdown.value = 10;
      if (intervalId.value !== null) {
        clearInterval(intervalId.value);
        intervalId.value = null;
      }
    }
    
    onMounted(() => {
      // Countdown starten, der nach Ablauf einen Fehler auslöst
      intervalId.value = window.setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          triggerError();
        }
      }, 1000);
    });
    
    return {
      countdown,
      triggerError,
      reset
    };
  }
};

const IntermediateComponent = {
  name: 'IntermediateComponent',
  template: `
    <div class="intermediate-component">
      <h4>Intermediäre Komponente</h4>
      <p>Dies ist eine vereinfachte Version mit eingeschränkter Funktionalität.</p>
      <p>Diese Komponente wird verwendet, wenn die neue Komponente Fehler verursacht, 
         aber noch nicht auf die Legacy-Version zurückgefallen werden soll.</p>
    </div>
  `
};

const LegacyComponent = {
  name: 'LegacyDocConverter',
  template: `
    <div class="legacy-component">
      <h4>Legacy-Komponente</h4>
      <p>Dies ist die ursprüngliche Implementierung als Fallback.</p>
    </div>
  `
};

const NewAdvancedComponent = {
  name: 'NewAdvancedComponent',
  template: `
    <div class="new-advanced-component">
      <h4>Erweiterte neue Komponente</h4>
      <p>Diese Komponente ist komplexer und erlaubt mehrstufigen Fallback.</p>
      <p>Fehlerrate: {{ errorRate }}%</p>
      <div class="error-slider">
        <input type="range" min="0" max="100" v-model="errorRate" />
      </div>
      <button @click="performAction">Aktion ausführen</button>
    </div>
  `,
  setup() {
    const errorRate = ref(0);
    
    function performAction() {
      // Mit konfigurierter Wahrscheinlichkeit Fehler auslösen
      if (Math.random() * 100 < errorRate.value) {
        throw new Error('Zufälliger Fehler basierend auf Fehlerrate');
      } else {
        console.log('Aktion erfolgreich ausgeführt');
      }
    }
    
    return {
      errorRate,
      performAction
    };
  }
};

const CustomErrorComponent = {
  name: 'CustomErrorComponent',
  props: {
    simulateError: {
      type: Boolean,
      default: false
    }
  },
  template: `
    <div class="custom-error-component">
      <h4>Benutzerdefinierte Komponente mit Error-Boundary</h4>
      <p>Diese Komponente zeigt, wie die ErrorBoundary direkt verwendet wird.</p>
      <p>Status: {{ simulateError ? 'Fehlerhaft' : 'Normal' }}</p>
    </div>
  `,
  setup(props) {
    if (props.simulateError) {
      throw new Error('Simulierter Fehler in der benutzerdefinierten Komponente');
    }
  }
};

// Zustandsvariablen für das Beispiel
const simulateError = ref(false);
const eventHistory = ref<FallbackEvent[]>([]);
const featureStatus = computed(() => {
  const result: Record<string, FeatureFallbackState> = {};
  
  // Zustand aller Features sammeln
  for (const [feature, state] of fallbackManager.getAllStatus()) {
    result[feature] = state;
  }
  
  return result;
});

// Event-Handler für den EnhancedFeatureWrapper
function handleError(error: BoundaryError, feature: string) {
  logger.error(`Fehler in Feature ${feature}: ${error.message}`, {
    component: error.component,
    severity: error.severity,
    category: error.category
  });
}

function handleFallback(error: BoundaryError, feature: string) {
  logger.warn(`Fallback für Feature ${feature} aktiviert: ${error.message}`);
}

function handleRetry(error: BoundaryError, feature: string, attempt: number) {
  logger.info(`Wiederholungsversuch ${attempt} für Feature ${feature}`);
}

function handleMount(feature: string, stage: 'new' | 'intermediate' | 'legacy') {
  logger.info(`Komponente für ${feature} gemountet im Stadium: ${stage}`);
}

// Handler für das erweiterte Beispiel
function handleAdvancedError(error: BoundaryError) {
  logger.error('Fehler in erweiterter Komponente', {
    message: error.message,
    severity: error.severity
  });
}

// Handler für ErrorBoundary direkt
function handleBoundaryError(error: BoundaryError) {
  logger.error('Error-Boundary-Fehler', {
    message: error.message,
    component: error.component
  });
}

// Aktionen für die Fallback-Steuerung
function activateFallback(feature: string) {
  fallbackManager.activateFallback(feature);
}

function deactivateFallback(feature: string) {
  fallbackManager.deactivateFallback(feature, true);
}

function clearErrors(feature: string) {
  fallbackManager.clearErrors(feature);
}

// Hilfsfunktionen
function formatFeatureName(feature: string): string {
  return feature
    .replace(/^use/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Bei Komponenten-Mountierung automatisch alle Features konfigurieren
onMounted(() => {
  // Features konfigurieren, falls nicht bereits vorhanden
  fallbackManager.configureFeature('useSfcDocConverter', {
    strategy: 'threshold',
    errorThreshold: 3,
    autoRecovery: true,
    recoveryTimeout: 10000, // 10 Sekunden (für Demo-Zwecke)
    useProgressiveFallback: false
  });
  
  fallbackManager.configureFeature('useSfcSettings', {
    strategy: 'progressive',
    errorThreshold: 2,
    autoRecovery: true,
    recoveryTimeout: 5000, // 5 Sekunden (für Demo-Zwecke)
    useProgressiveFallback: true
  });
});
</script>

<style scoped>
.fallback-example {
  font-family: 'Segoe UI', system-ui, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.example-section {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #555;
  font-size: 1.2em;
  border-bottom: 1px solid #e1e1e1;
  padding-bottom: 8px;
}

.error-controls {
  margin-top: 15px;
  text-align: center;
}

button {
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #3a5cf0;
}

.action-button {
  margin-right: 5px;
  padding: 5px 10px;
  font-size: 12px;
}

.fallback-status-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.fallback-status-table th, 
.fallback-status-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #e1e1e1;
}

.fallback-status-table th {
  background-color: #f0f0f0;
  font-weight: 600;
}

.status-active {
  color: #ef4444;
  font-weight: 600;
}

.status-disabled {
  color: #10b981;
}

.status-recovering {
  color: #f59e0b;
  font-weight: 600;
}

.status-actions {
  white-space: nowrap;
}

.event-history {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e1e1e1;
  border-radius: 4px;
}

.event-item {
  display: flex;
  padding: 8px 10px;
  font-size: 13px;
  border-bottom: 1px solid #e1e1e1;
}

.event-item:last-child {
  border-bottom: none;
}

.event-item:nth-child(odd) {
  background-color: #f5f5f5;
}

.event-error {
  background-color: rgba(239, 68, 68, 0.1) !important;
}

.event-activation {
  background-color: rgba(249, 115, 22, 0.1) !important;
}

.event-deactivation {
  background-color: rgba(16, 185, 129, 0.1) !important;
}

.event-time {
  width: 100px;
  color: #666;
}

.event-type {
  width: 120px;
  font-weight: 600;
}

.event-feature {
  width: 150px;
}

.event-data {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
}

.event-data pre {
  margin: 0;
  white-space: pre-wrap;
}

/* Komponentenstile für die Demo */
:deep(.new-component),
:deep(.intermediate-component),
:deep(.legacy-component),
:deep(.new-advanced-component),
:deep(.custom-error-component) {
  border: 1px solid #e1e1e1;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
}

:deep(.new-component) {
  background-color: #ecfdf5;
  border-color: #10b981;
}

:deep(.intermediate-component) {
  background-color: #fffbeb;
  border-color: #f59e0b;
}

:deep(.legacy-component) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

:deep(.new-advanced-component) {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

:deep(.custom-error-component) {
  background-color: #f9fafb;
  border-color: #6b7280;
}

:deep(.custom-error-display) {
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  padding: 15px;
  color: #b91c1c;
}

:deep(.custom-fallback) {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 15px;
  color: #374151;
}

@media (max-width: 640px) {
  .fallback-example {
    padding: 10px;
  }
  
  .example-section {
    padding: 15px;
  }
  
  .event-item {
    flex-direction: column;
  }
  
  .event-time,
  .event-type,
  .event-feature {
    width: auto;
    margin-bottom: 5px;
  }
}
</style>