<template>
  <div class="monitoring-settings">
    <div class="settings-header">
      <h3>{{ t('monitoring.settings.title', 'Monitoring-Einstellungen') }}</h3>
      <div class="settings-actions">
        <button @click="resetToDefaults" class="settings-button reset-button">
          {{ t('monitoring.settings.resetDefaults', 'Standardwerte') }}
        </button>
        <button @click="saveSettings" class="settings-button save-button" :disabled="!hasChanges">
          {{ t('monitoring.settings.save', 'Änderungen speichern') }}
        </button>
      </div>
    </div>

    <form class="settings-form" @submit.prevent="saveSettings">
      <!-- Allgemeine Einstellungen -->
      <div class="settings-section">
        <h4>{{ t('monitoring.settings.general', 'Allgemeine Einstellungen') }}</h4>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="enableMonitoring">
              {{ t('monitoring.settings.enableMonitoring', 'Monitoring aktivieren') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="enableMonitoring" 
                v-model="formData.enableMonitoring"
              />
              <label for="enableMonitoring"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.enableMonitoringHelp', 'Aktiviert oder deaktiviert das gesamte Monitoring-System. Bei Deaktivierung werden keine Daten gesammelt.') }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="dataPersistence">
            {{ t('monitoring.settings.dataPersistence', 'Daten-Persistenz') }}
          </label>
          <select id="dataPersistence" v-model="formData.dataPersistence" class="form-select">
            <option value="session">{{ t('monitoring.settings.persistenceOptions.session', 'Nur Sitzung (SessionStorage)') }}</option>
            <option value="local">{{ t('monitoring.settings.persistenceOptions.local', 'Lokal (localStorage)') }}</option>
            <option value="indexeddb">{{ t('monitoring.settings.persistenceOptions.indexeddb', 'IndexedDB') }}</option>
          </select>
          <div class="form-help">
            {{ t('monitoring.settings.dataPersistenceHelp', 'Legt fest, wo und wie lange Monitoring-Daten gespeichert werden sollen.') }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="dataRetention">
            {{ t('monitoring.settings.dataRetention', 'Daten-Aufbewahrung') }}
          </label>
          <select id="dataRetention" v-model="formData.dataRetention" class="form-select">
            <option value="1">{{ t('monitoring.settings.retentionOptions.day', '1 Tag') }}</option>
            <option value="7">{{ t('monitoring.settings.retentionOptions.week', '1 Woche') }}</option>
            <option value="30">{{ t('monitoring.settings.retentionOptions.month', '1 Monat') }}</option>
            <option value="90">{{ t('monitoring.settings.retentionOptions.quarter', '3 Monate') }}</option>
          </select>
          <div class="form-help">
            {{ t('monitoring.settings.dataRetentionHelp', 'Bestimmt, wie lange Monitoring-Daten aufbewahrt werden, bevor sie automatisch gelöscht werden.') }}
          </div>
        </div>
      </div>

      <!-- Datenerfassung -->
      <div class="settings-section">
        <h4>{{ t('monitoring.settings.dataCollection', 'Datenerfassung') }}</h4>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="collectErrors">
              {{ t('monitoring.settings.collectErrors', 'Fehler erfassen') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="collectErrors" 
                v-model="formData.collectErrors"
                :disabled="!formData.enableMonitoring"
              />
              <label for="collectErrors"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.collectErrorsHelp', 'Erfasst Fehler mit Kontext, Stack-Traces und Fehler-Deduplizierung.') }}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="collectPerformance">
              {{ t('monitoring.settings.collectPerformance', 'Performance-Metriken erfassen') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="collectPerformance" 
                v-model="formData.collectPerformance"
                :disabled="!formData.enableMonitoring"
              />
              <label for="collectPerformance"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.collectPerformanceHelp', 'Misst und erfasst Ladezeiten, Renderzeiten und Speicherverbrauch von Features.') }}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="collectUsage">
              {{ t('monitoring.settings.collectUsage', 'Nutzungsdaten erfassen') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="collectUsage" 
                v-model="formData.collectUsage"
                :disabled="!formData.enableMonitoring"
              />
              <label for="collectUsage"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.collectUsageHelp', 'Erfasst Daten zu Aktivierung, Nutzungsdauer und Interaktionen mit Features.') }}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="collectFeedback">
              {{ t('monitoring.settings.collectFeedback', 'Benutzer-Feedback erfassen') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="collectFeedback" 
                v-model="formData.collectFeedback"
                :disabled="!formData.enableMonitoring"
              />
              <label for="collectFeedback"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.collectFeedbackHelp', 'Sammelt und analysiert Benutzerbewertungen und Kommentare zu Features.') }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="samplingRate">
            {{ t('monitoring.settings.samplingRate', 'Sampling-Rate') }}
          </label>
          <div class="range-control">
            <input 
              type="range" 
              id="samplingRate" 
              v-model.number="formData.samplingRate" 
              min="1" 
              max="100" 
              step="1"
              :disabled="!formData.enableMonitoring"
            />
            <span class="range-value">{{ formData.samplingRate }}%</span>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.samplingRateHelp', 'Prozentsatz der Sitzungen, für die Daten gesammelt werden. Reduzieren Sie den Wert, um die Leistung zu verbessern.') }}
          </div>
        </div>
      </div>

      <!-- Warnungen und Benachrichtigungen -->
      <div class="settings-section">
        <h4>{{ t('monitoring.settings.alerts', 'Warnungen & Benachrichtigungen') }}</h4>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="enableAlerts">
              {{ t('monitoring.settings.enableAlerts', 'Warnungen aktivieren') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="enableAlerts" 
                v-model="formData.enableAlerts"
                :disabled="!formData.enableMonitoring"
              />
              <label for="enableAlerts"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.enableAlertsHelp', 'Aktiviert Warnungen und Benachrichtigungen bei Überschreitung von Schwellenwerten.') }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="errorThreshold">
            {{ t('monitoring.settings.errorThreshold', 'Fehler-Schwellenwert') }}
          </label>
          <div class="input-group">
            <input 
              type="number" 
              id="errorThreshold" 
              v-model.number="formData.errorThreshold" 
              min="1" 
              max="100"
              :disabled="!formData.enableMonitoring || !formData.enableAlerts"
              class="form-input"
            />
            <span class="input-group-text">{{ t('monitoring.settings.errors', 'Fehler') }}</span>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.errorThresholdHelp', 'Anzahl der Fehler innerhalb von 5 Minuten, ab der eine Warnung ausgelöst wird.') }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="performanceThreshold">
            {{ t('monitoring.settings.performanceThreshold', 'Performance-Schwellenwert') }}
          </label>
          <div class="input-group">
            <input 
              type="number" 
              id="performanceThreshold" 
              v-model.number="formData.performanceThreshold" 
              min="0" 
              max="10000"
              :disabled="!formData.enableMonitoring || !formData.enableAlerts"
              class="form-input"
            />
            <span class="input-group-text">ms</span>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.performanceThresholdHelp', 'Ladezeit in Millisekunden, ab der eine Performance-Warnung ausgelöst wird.') }}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="autoDisableFeatures">
              {{ t('monitoring.settings.autoDisableFeatures', 'Features automatisch deaktivieren') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="autoDisableFeatures" 
                v-model="formData.autoDisableFeatures"
                :disabled="!formData.enableMonitoring || !formData.enableAlerts"
              />
              <label for="autoDisableFeatures"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.autoDisableFeaturesHelp', 'Deaktiviert problematische Features automatisch, wenn kritische Schwellenwerte überschritten werden.') }}
          </div>
        </div>
      </div>

      <!-- Datenschutz -->
      <div class="settings-section">
        <h4>{{ t('monitoring.settings.privacy', 'Datenschutz') }}</h4>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="anonymizeUserData">
              {{ t('monitoring.settings.anonymizeUserData', 'Benutzerdaten anonymisieren') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="anonymizeUserData" 
                v-model="formData.anonymizeUserData"
                :disabled="!formData.enableMonitoring"
              />
              <label for="anonymizeUserData"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.anonymizeUserDataHelp', 'Anonymisiert Benutzer-IDs und personenbezogene Daten in allen Berichten.') }}
          </div>
        </div>
        
        <div class="form-group">
          <div class="form-group-header">
            <label for="allowOptOut">
              {{ t('monitoring.settings.allowOptOut', 'Opt-Out-Option für Benutzer') }}
            </label>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="allowOptOut" 
                v-model="formData.allowOptOut"
                :disabled="!formData.enableMonitoring"
              />
              <label for="allowOptOut"></label>
            </div>
          </div>
          <div class="form-help">
            {{ t('monitoring.settings.allowOptOutHelp', 'Ermöglicht Benutzern, die Datensammlung zu deaktivieren.') }}
          </div>
        </div>
        
        <div class="form-group privacy-notice">
          <div class="privacy-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="privacy-content">
            <h5>{{ t('monitoring.settings.dataPrivacyNotice', 'Datenschutzhinweis') }}</h5>
            <p>
              {{ t('monitoring.settings.dataPrivacyText', 'Alle gesammelten Daten werden nur lokal auf diesem Gerät gespeichert und nicht an externe Server übertragen. Ihre Privatsphäre wird geschützt.') }}
            </p>
          </div>
        </div>
      </div>
    </form>

    <div class="settings-footer">
      <div class="settings-info">
        <div class="info-item">
          <div class="info-label">{{ t('monitoring.settings.monitoringStatus', 'Monitoring-Status:') }}</div>
          <div class="info-value">
            <span :class="formData.enableMonitoring ? 'status-active' : 'status-inactive'">
              {{ formData.enableMonitoring 
                ? t('monitoring.settings.status.enabled', 'Aktiviert') 
                : t('monitoring.settings.status.disabled', 'Deaktiviert') 
              }}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">{{ t('monitoring.settings.dataSize', 'Gespeicherte Daten:') }}</div>
          <div class="info-value">{{ formatDataSize(dataSize) }}</div>
        </div>
      </div>
      <button @click="clearAllData" class="settings-button clear-button">
        {{ t('monitoring.settings.clearAllData', 'Alle Daten löschen') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useGlobalDialog } from '@/composables/useDialog';

// Typen
interface MonitoringSettingsData {
  // Allgemeine Einstellungen
  enableMonitoring: boolean;
  dataPersistence: 'session' | 'local' | 'indexeddb';
  dataRetention: number;
  
  // Datenerfassung
  collectErrors: boolean;
  collectPerformance: boolean;
  collectUsage: boolean;
  collectFeedback: boolean;
  samplingRate: number;
  
  // Warnungen & Benachrichtigungen
  enableAlerts: boolean;
  errorThreshold: number;
  performanceThreshold: number;
  autoDisableFeatures: boolean;
  
  // Datenschutz
  anonymizeUserData: boolean;
  allowOptOut: boolean;
}

interface MonitoringSettingsProps {
  settings: MonitoringSettingsData;
}

// Event-Definition
interface Emits {
  (e: 'update:settings', settings: MonitoringSettingsData): void;
}

// Props und Emits
const props = defineProps<MonitoringSettingsProps>();
const emit = defineEmits<Emits>();

// Composables
const { t } = useI18n();
const dialog = useGlobalDialog();

// Formular-Daten
const formData = reactive<MonitoringSettingsData>({
  ...props.settings
});

// Ursprüngliche Einstellungen speichern
const originalSettings = ref<MonitoringSettingsData>({
  ...props.settings
});

// Datengröße (Mock-Wert)
const dataSize = ref<number>(1024 * 1024 * 2.7); // 2.7 MB

// Computed Properties
const hasChanges = computed(() => {
  return JSON.stringify(formData) !== JSON.stringify(originalSettings.value);
});

// Standard-Einstellungen
const defaultSettings: MonitoringSettingsData = {
  enableMonitoring: true,
  dataPersistence: 'local',
  dataRetention: 30,
  collectErrors: true,
  collectPerformance: true,
  collectUsage: true,
  collectFeedback: true,
  samplingRate: 100,
  enableAlerts: true,
  errorThreshold: 10,
  performanceThreshold: 2000,
  autoDisableFeatures: false,
  anonymizeUserData: true,
  allowOptOut: true
};

// Methoden
function saveSettings(): void {
  // Einstellungen speichern und Event emittieren
  emit('update:settings', { ...formData });
  
  // Aktualisierte Einstellungen als neue Original-Einstellungen setzen
  originalSettings.value = { ...formData };
  
  // Bestätigungsmeldung anzeigen
  dialog.alert({
    title: t('monitoring.settings.saveSuccess', 'Einstellungen gespeichert'),
    message: t('monitoring.settings.saveSuccessMessage', 'Ihre Monitoring-Einstellungen wurden erfolgreich gespeichert.'),
    type: 'success'
  });
}

function resetToDefaults(): void {
  // Bestätigung anfordern
  dialog.confirm({
    title: t('monitoring.settings.resetConfirm', 'Standardwerte wiederherstellen?'),
    message: t('monitoring.settings.resetConfirmMessage', 'Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.'),
    confirmButtonText: t('common.yes', 'Ja'),
    cancelButtonText: t('common.no', 'Nein'),
    type: 'warning'
  }).then(confirmed => {
    if (confirmed) {
      // Auf Standardwerte zurücksetzen
      Object.assign(formData, defaultSettings);
      
      // Änderungen speichern
      saveSettings();
    }
  });
}

function clearAllData(): void {
  // Bestätigung anfordern
  dialog.confirm({
    title: t('monitoring.settings.clearDataConfirm', 'Alle Daten löschen?'),
    message: t('monitoring.settings.clearDataConfirmMessage', 'Möchten Sie wirklich alle gesammelten Monitoring-Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.'),
    confirmButtonText: t('common.yes', 'Ja'),
    cancelButtonText: t('common.no', 'Nein'),
    type: 'danger'
  }).then(confirmed => {
    if (confirmed) {
      // Mock-Implementierung: Datengröße zurücksetzen
      dataSize.value = 0;
      
      // Bestätigungsmeldung anzeigen
      dialog.alert({
        title: t('monitoring.settings.dataCleared', 'Daten gelöscht'),
        message: t('monitoring.settings.dataClearedMessage', 'Alle Monitoring-Daten wurden erfolgreich gelöscht.'),
        type: 'success'
      });
    }
  });
}

function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Watches
watch(() => props.settings, (newSettings) => {
  // Aktualisieren der Form-Daten, wenn sich die Props ändern
  Object.assign(formData, newSettings);
  originalSettings.value = { ...newSettings };
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  // Einstellungen initialisieren
  originalSettings.value = { ...props.settings };
});
</script>

<style scoped>
.monitoring-settings {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.settings-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.settings-actions {
  display: flex;
  gap: 10px;
}

.settings-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.settings-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-button {
  background-color: #e5e7eb;
  color: #374151;
}

.reset-button:hover:not(:disabled) {
  background-color: #d1d5db;
}

.save-button {
  background-color: #0d7a40;
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: #0a6032;
}

.clear-button {
  background-color: #fee2e2;
  color: #b91c1c;
}

.clear-button:hover {
  background-color: #fecaca;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.settings-section {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
}

.settings-section h4 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-help {
  margin-top: 5px;
  font-size: 0.85rem;
  color: #666;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.input-group {
  display: flex;
  align-items: center;
}

.input-group .form-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  flex: 1;
}

.input-group-text {
  padding: 8px 12px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-left: none;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  color: #666;
  font-size: 0.9rem;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 15px;
}

.range-control input[type="range"] {
  flex: 1;
}

.range-value {
  min-width: 45px;
  font-size: 0.9rem;
  color: #666;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
  margin: 0;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #0d7a40;
}

.toggle-switch input:focus + label {
  box-shadow: 0 0 1px #0d7a40;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.toggle-switch input:disabled + label {
  background-color: #e0e0e0;
  cursor: not-allowed;
}

.toggle-switch input:disabled + label:before {
  background-color: #ddd;
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.privacy-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.privacy-content h5 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: #1e40af;
}

.privacy-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.5;
}

.settings-footer {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #eee;
}

.settings-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-weight: 500;
  color: #555;
}

.status-active {
  color: #16a34a;
}

.status-inactive {
  color: #6b7280;
}

@media (max-width: 768px) {
  .settings-header, .settings-footer {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .settings-footer {
    padding: 15px;
  }
  
  .form-group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .toggle-switch {
    align-self: flex-start;
  }
  
  .privacy-notice {
    flex-direction: column;
  }
}
</style>