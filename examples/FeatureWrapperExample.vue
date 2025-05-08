<template>
  <div class="feature-wrapper-example">
    <h1>Feature-Toggle Beispiel</h1>
    
    <div class="feature-status">
      <h2>Feature-Status</h2>
      <p>
        <strong>DocConverter SFC:</strong> 
        <span 
          :class="{ 
            'status-active': featureToggles.shouldUseFeature('useSfcDocConverter'),
            'status-inactive': !featureToggles.shouldUseFeature('useSfcDocConverter'),
            'status-error': featureToggles.isFallbackActive('useSfcDocConverter')
          }"
        >
          {{ getFeatureStatus('useSfcDocConverter') }}
        </span>
      </p>
      <p>
        <strong>Admin SFC:</strong> 
        <span 
          :class="{ 
            'status-active': featureToggles.shouldUseFeature('useSfcAdmin'),
            'status-inactive': !featureToggles.shouldUseFeature('useSfcAdmin'),
            'status-error': featureToggles.isFallbackActive('useSfcAdmin')
          }"
        >
          {{ getFeatureStatus('useSfcAdmin') }}
        </span>
      </p>
      <p>
        <strong>Chat SFC:</strong> 
        <span 
          :class="{ 
            'status-active': featureToggles.shouldUseFeature('useSfcChat'),
            'status-inactive': !featureToggles.shouldUseFeature('useSfcChat'),
            'status-error': featureToggles.isFallbackActive('useSfcChat')
          }"
        >
          {{ getFeatureStatus('useSfcChat') }}
        </span>
      </p>
      <p>
        <strong>Settings SFC:</strong> 
        <span 
          :class="{ 
            'status-active': featureToggles.shouldUseFeature('useSfcSettings'),
            'status-inactive': !featureToggles.shouldUseFeature('useSfcSettings'),
            'status-error': featureToggles.isFallbackActive('useSfcSettings')
          }"
        >
          {{ getFeatureStatus('useSfcSettings') }}
        </span>
      </p>
    </div>
    
    <div class="feature-controls">
      <h2>Feature-Steuerung</h2>
      <div class="feature-toggles">
        <div class="feature-toggle">
          <label for="toggle-doc-converter">DocConverter SFC</label>
          <input 
            id="toggle-doc-converter" 
            type="checkbox" 
            v-model="featureToggles.sfcDocConverter"
          >
        </div>
        <div class="feature-toggle">
          <label for="toggle-admin">Admin SFC</label>
          <input 
            id="toggle-admin" 
            type="checkbox" 
            v-model="featureToggles.sfcAdmin"
          >
        </div>
        <div class="feature-toggle">
          <label for="toggle-chat">Chat SFC</label>
          <input 
            id="toggle-chat" 
            type="checkbox" 
            v-model="featureToggles.sfcChat"
          >
        </div>
        <div class="feature-toggle">
          <label for="toggle-settings">Settings SFC</label>
          <input 
            id="toggle-settings" 
            type="checkbox" 
            v-model="featureToggles.sfcSettings"
          >
        </div>
      </div>
      
      <div class="feature-actions">
        <button @click="featureToggles.enableAllSfcFeatures()">Alle SFC aktivieren</button>
        <button @click="featureToggles.disableAllSfcFeatures()">Alle SFC deaktivieren</button>
        <button @click="createTestError">Test-Fehler erzeugen</button>
      </div>
    </div>
    
    <div class="feature-demo">
      <h2>Komponenten-Demo</h2>
      
      <div class="feature-demo-item">
        <h3>DocConverter</h3>
        <FeatureWrapper
          feature="useSfcDocConverter"
          :newComponent="SfcDocConverterComponent"
          :legacyComponent="LegacyDocConverterComponent"
          @feature-error="handleFeatureError"
          @feature-fallback="handleFeatureFallback"
          @component-mounted="handleComponentMounted"
        />
      </div>
      
      <div class="feature-demo-item">
        <h3>Admin-Panel</h3>
        <FeatureWrapper
          feature="useSfcAdmin"
          :newComponent="SfcAdminComponent"
          :legacyComponent="LegacyAdminComponent"
          @feature-error="handleFeatureError"
          @feature-fallback="handleFeatureFallback"
          @component-mounted="handleComponentMounted"
        />
      </div>
    </div>
    
    <div class="event-log">
      <h2>Event-Log</h2>
      <ul>
        <li v-for="(event, index) in eventLog" :key="index" :class="event.type">
          <span class="event-time">{{ formatTime(event.time) }}</span>
          <span class="event-message">{{ event.message }}</span>
        </li>
      </ul>
    </div>
    
    <div class="feature-admin-panel">
      <h2>Feature-Admin-Panel</h2>
      <FeatureTogglesPanel 
        initialUserRole="developer"
        @role-change="handleRoleChange"
        @feature-change="handleFeatureChange"
        @error-clear="handleErrorClear"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import FeatureWrapper from '@/components/shared/FeatureWrapper.vue';
import FeatureTogglesPanel from '@/components/admin/FeatureTogglesPanel.vue';
import { FeatureToggleRole } from '@/stores/featureToggles';

// Feature-Toggles verwenden
const featureToggles = useFeatureToggles({
  userRole: 'developer',
  debug: true
});

// Event-Log für Demonstrationszwecke
const eventLog = ref<{ time: Date; message: string; type: string }[]>([]);

// Komponenten asynchron laden für bessere Performance
const SfcDocConverterComponent = defineAsyncComponent(() => 
  import('@/components/admin/document-converter/DocConverterContainer.vue')
);

const LegacyDocConverterComponent = {
  name: 'LegacyDocConverterComponent',
  template: `
    <div class="legacy-component">
      <h4>Legacy DocConverter</h4>
      <p>Dies ist die Legacy-Version des Dokumentenkonverters.</p>
      <div class="legacy-form">
        <div class="legacy-form-row">
          <label>Datei auswählen:</label>
          <input type="file" disabled>
        </div>
        <div class="legacy-form-row">
          <button disabled>Datei hochladen</button>
        </div>
      </div>
    </div>
  `
};

const SfcAdminComponent = {
  name: 'SfcAdminComponent',
  template: `
    <div class="sfc-component">
      <h4>SFC Admin Panel</h4>
      <p>Dies ist die Vue 3 SFC-Version des Admin-Panels.</p>
      <div v-if="shouldThrowError" class="error-trigger">
        <!-- Absichtlicher Fehler für Demonstrationszwecke -->
        {{ nonExistentVariable.property }}
      </div>
      <button @click="toggleErrorTrigger">Fehler auslösen</button>
    </div>
  `,
  data() {
    return {
      shouldThrowError: false
    };
  },
  methods: {
    toggleErrorTrigger() {
      this.shouldThrowError = true;
    }
  }
};

const LegacyAdminComponent = {
  name: 'LegacyAdminComponent',
  template: `
    <div class="legacy-component">
      <h4>Legacy Admin Panel</h4>
      <p>Dies ist die Legacy-Version des Admin-Panels.</p>
      <div class="legacy-panel">
        <div class="legacy-panel-item">
          <h5>Benutzer</h5>
          <p>Benutzer verwalten (Legacy)</p>
        </div>
        <div class="legacy-panel-item">
          <h5>Einstellungen</h5>
          <p>Einstellungen konfigurieren (Legacy)</p>
        </div>
      </div>
    </div>
  `
};

// Bei Komponenten-Montierung
onMounted(() => {
  logEvent('Anwendung gestartet', 'info');
});

// Feature-Status als Text zurückgeben
function getFeatureStatus(featureName: string): string {
  if (featureToggles.isFallbackActive(featureName)) {
    return 'Fallback aktiv (Fehler)';
  }
  if (featureToggles.shouldUseFeature(featureName)) {
    return 'Aktiv';
  }
  return 'Inaktiv';
}

// Test-Fehler erzeugen
function createTestError() {
  try {
    throw new Error('Manuell ausgelöster Test-Fehler');
  } catch (error) {
    featureToggles.reportError(
      'useSfcDocConverter',
      error instanceof Error ? error.message : 'Unbekannter Fehler',
      { source: 'Test' }
    );
    
    logEvent(`Test-Fehler für DocConverter erzeugt: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
  }
}

// Event-Handler für FeatureWrapper-Ereignisse
function handleFeatureError(error: Error, feature: string) {
  logEvent(`Fehler in Feature "${feature}": ${error.message}`, 'error');
}

function handleFeatureFallback(feature: string) {
  logEvent(`Fallback für Feature "${feature}" aktiviert`, 'warning');
}

function handleComponentMounted(feature: string, isNew: boolean) {
  logEvent(`Komponente für "${feature}" gemountet: ${isNew ? 'SFC' : 'Legacy'}`, 'info');
}

// Event-Handler für FeatureTogglesPanel-Ereignisse
function handleRoleChange(role: FeatureToggleRole) {
  logEvent(`Benutzerrolle geändert: ${role}`, 'info');
}

function handleFeatureChange(featureName: string, enabled: boolean) {
  logEvent(`Feature "${featureName}" ${enabled ? 'aktiviert' : 'deaktiviert'}`, 'info');
}

function handleErrorClear(featureName: string) {
  logEvent(`Fehler für Feature "${featureName}" gelöscht`, 'info');
}

// Hilfsfunktion für Event-Logging
function logEvent(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
  eventLog.value.unshift({
    time: new Date(),
    message,
    type
  });
  
  // Event-Log auf maximal 100 Einträge begrenzen
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(0, 100);
  }
}

// Zeitstempel formatieren
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<style scoped>
.feature-wrapper-example {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1, h2, h3 {
  color: #0d7a40;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
}

.feature-status,
.feature-controls,
.feature-demo,
.event-log,
.feature-admin-panel {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.feature-status p {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.status-active {
  color: #16a34a;
  font-weight: bold;
}

.status-inactive {
  color: #64748b;
}

.status-error {
  color: #dc2626;
  font-weight: bold;
}

.feature-toggles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.feature-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.feature-actions button {
  padding: 0.5rem 1rem;
  background-color: #0d7a40;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.feature-actions button:hover {
  background-color: #0a6032;
}

.feature-demo-item {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.event-log {
  background-color: #1a202c;
  color: #e2e8f0;
}

.event-log h2 {
  color: #e2e8f0;
}

.event-log ul {
  max-height: 300px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: 'Courier New', monospace;
}

.event-log li {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-left: 3px solid transparent;
  display: flex;
}

.event-log li.info {
  border-color: #3b82f6;
}

.event-log li.warning {
  border-color: #eab308;
}

.event-log li.error {
  border-color: #ef4444;
}

.event-log li.success {
  border-color: #22c55e;
}

.event-time {
  color: #94a3b8;
  margin-right: 1rem;
  flex-shrink: 0;
}

.event-message {
  flex: 1;
}

/* Legacy-Komponenten-Styling */
.legacy-component {
  background-color: #fff8dc;
  border: 1px dashed #daa520;
  padding: 1rem;
  border-radius: 4px;
}

.legacy-form {
  margin-top: 1rem;
}

.legacy-form-row {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legacy-panel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.legacy-panel-item {
  background-color: #fffbeb;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #fef3c7;
}

.legacy-panel-item h5 {
  margin: 0 0 0.5rem 0;
  color: #92400e;
}

/* SFC-Komponenten-Styling */
.sfc-component {
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  padding: 1rem;
  border-radius: 4px;
}

.sfc-component button {
  padding: 0.5rem 1rem;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.sfc-component button:hover {
  background-color: #dc2626;
}

/* Responsive Design */
@media (max-width: 768px) {
  .feature-wrapper-example {
    padding: 1rem;
  }
  
  .feature-toggles,
  .feature-actions {
    grid-template-columns: 1fr;
  }
}
</style>