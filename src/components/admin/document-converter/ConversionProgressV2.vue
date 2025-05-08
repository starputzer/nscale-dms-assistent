<template>
  <div 
    class="conversion-progress" 
    role="region" 
    aria-live="polite" 
    aria-label="Dokumentenkonvertierungsfortschritt"
  >
    <h3 class="conversion-title">
      {{ t('documentConverter.conversionInProgress', 'Konvertierung läuft...') }}
    </h3>
    
    <div v-if="documentName" class="current-document">
      <i class="document-icon" :class="documentIcon" aria-hidden="true"></i>
      <span class="document-name">{{ documentName }}</span>
      <span v-if="documentIndex !== undefined && totalDocuments > 1" class="document-position">
        ({{ documentIndex + 1 }}/{{ totalDocuments }})
      </span>
    </div>
    
    <div class="progress-stages" aria-hidden="true">
      <div 
        v-for="(stage, index) in stages" 
        :key="index"
        class="progress-stage"
        :class="{
          'stage-completed': stageIndex > index,
          'stage-active': stageIndex === index,
          'stage-pending': stageIndex < index
        }"
      >
        <div class="stage-indicator">
          <i v-if="stageIndex > index" class="fa fa-check"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="stage-label">{{ stage }}</div>
      </div>
      <div class="stages-connector"></div>
    </div>
    
    <div class="progress-container">
      <div 
        class="progress-bar-container"
        role="progressbar" 
        :aria-valuenow="progress" 
        aria-valuemin="0" 
        aria-valuemax="100"
        :aria-label="`${progress}% abgeschlossen`"
      >
        <div 
          class="progress-bar" 
          :style="{ width: `${progress}%` }"
        ></div>
        <div v-if="isIndeterminate" class="progress-bar-indeterminate"></div>
      </div>
      
      <div class="progress-info">
        <span class="progress-percentage">{{ progress }}%</span>
        <span v-if="estimatedTimeRemaining > 0" class="estimated-time">
          {{ t('documentConverter.estimatedTimeRemaining', 'Verbleibend') }}: {{ formatTime(estimatedTimeRemaining) }}
        </span>
      </div>
    </div>
    
    <div class="step-details">
      <div class="current-step-container">
        <div class="current-step-label">{{ t('documentConverter.currentStep', 'Aktueller Schritt') }}:</div>
        <div class="current-step">{{ currentStep }}</div>
      </div>
      
      <transition name="fade">
        <div v-if="details" class="step-details-text">
          <pre>{{ details }}</pre>
        </div>
      </transition>
      
      <div v-if="warnings && warnings.length > 0" class="conversion-warnings">
        <div class="warning-label">
          <i class="fa fa-exclamation-triangle warning-icon" aria-hidden="true"></i>
          {{ t('documentConverter.warnings', 'Hinweise') }}:
        </div>
        <ul class="warning-list">
          <li v-for="(warning, index) in warnings" :key="index" class="warning-item">
            {{ warning }}
          </li>
        </ul>
      </div>
    </div>
    
    <div class="actions">
      <button 
        class="cancel-button" 
        @click="emit('cancel')" 
        :disabled="progress >= 100 || !canCancel"
        :aria-label="t('documentConverter.cancelConversion', 'Konvertierung abbrechen')"
      >
        <i class="fa fa-times" aria-hidden="true"></i>
        {{ t('documentConverter.cancelConversion', 'Abbrechen') }}
      </button>
      
      <button 
        v-if="canPause" 
        class="pause-button" 
        @click="emit('pause')"
        :disabled="progress >= 100 || isPaused"
        :aria-label="t('documentConverter.pauseConversion', 'Konvertierung pausieren')"
      >
        <i class="fa fa-pause" aria-hidden="true"></i>
        {{ t('documentConverter.pause', 'Pausieren') }}
      </button>
      
      <button 
        v-if="canPause && isPaused" 
        class="resume-button" 
        @click="emit('resume')"
        :aria-label="t('documentConverter.resumeConversion', 'Konvertierung fortsetzen')"
      >
        <i class="fa fa-play" aria-hidden="true"></i>
        {{ t('documentConverter.resume', 'Fortsetzen') }}
      </button>
    </div>
    
    <div v-if="logs && logs.length > 0" class="conversion-logs">
      <details class="logs-details">
        <summary class="logs-summary">
          {{ t('documentConverter.showLogs', 'Konvertierungsprotokolle anzeigen') }}
        </summary>
        <div class="logs-container">
          <div v-for="(log, index) in logs" :key="index" class="log-entry">
            <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
            <span class="log-level" :class="`log-level-${log.level}`">{{ log.level }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

// Definiere die Props mit TypeScript-Typen
interface Props {
  /** Fortschritt in Prozent (0-100) */
  progress: number;
  
  /** Aktueller Konvertierungsschritt als Text */
  currentStep: string;
  
  /** Geschätzte verbleibende Zeit in Sekunden */
  estimatedTimeRemaining: number;
  
  /** Name des aktuell konvertierten Dokuments */
  documentName?: string;
  
  /** Index des aktuellen Dokuments (0-basiert, für Mehrfach-Konvertierung) */
  documentIndex?: number;
  
  /** Gesamtanzahl der zu konvertierenden Dokumente */
  totalDocuments?: number;
  
  /** Detaillierte Informationen zum aktuellen Schritt */
  details?: string;
  
  /** Flag, ob die Konvertierung pausiert werden kann */
  canPause?: boolean;
  
  /** Flag, ob die Konvertierung pausiert ist */
  isPaused?: boolean;
  
  /** Flag, ob die Konvertierung abgebrochen werden kann */
  canCancel?: boolean;
  
  /** Liste von Warnungen während der Konvertierung */
  warnings?: string[];
  
  /** Konvertierungsprotokolle */
  logs?: Array<{
    timestamp: Date | string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
  
  /** Flag, ob eine unbestimmte Fortschrittsanzeige angezeigt werden soll */
  isIndeterminate?: boolean;
}

// Definiere die Standardwerte für die Props
const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  currentStep: 'Initialisierung...',
  estimatedTimeRemaining: 0,
  documentName: '',
  documentIndex: undefined,
  totalDocuments: 0,
  details: '',
  canPause: false,
  isPaused: false,
  canCancel: true,
  warnings: () => [],
  logs: () => [],
  isIndeterminate: false
});

// Definiere die Emits
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'pause'): void;
  (e: 'resume'): void;
}>();

// Definiere die Konvertierungsphasen
const stages = [
  t('documentConverter.stage.preparation', 'Vorbereitung'),
  t('documentConverter.stage.extraction', 'Extraktion'),
  t('documentConverter.stage.processing', 'Verarbeitung'),
  t('documentConverter.stage.formatting', 'Formatierung'),
  t('documentConverter.stage.finalization', 'Fertigstellung')
];

// Berechne den aktuellen Schritt basierend auf dem Fortschritt
const stageIndex = computed(() => {
  if (props.progress >= 100) return stages.length - 1;
  return Math.min(Math.floor(props.progress / (100 / stages.length)), stages.length - 1);
});

// Bestimme das Icon des Dokuments basierend auf dem Dateinamen
const documentIcon = computed(() => {
  if (!props.documentName) return 'fa fa-file';
  
  const extension = props.documentName.split('.').pop()?.toLowerCase() || '';
  
  const fileIcons: Record<string, string> = {
    'pdf': 'fa fa-file-pdf',
    'docx': 'fa fa-file-word',
    'doc': 'fa fa-file-word',
    'xlsx': 'fa fa-file-excel',
    'xls': 'fa fa-file-excel',
    'pptx': 'fa fa-file-powerpoint',
    'ppt': 'fa fa-file-powerpoint',
    'html': 'fa fa-file-code',
    'htm': 'fa fa-file-code',
    'txt': 'fa fa-file-alt'
  };
  
  return fileIcons[extension] || 'fa fa-file';
});

/**
 * Formatiert die geschätzte verbleibende Zeit in ein benutzerfreundliches Format
 * @param seconds - Die verbleibende Zeit in Sekunden
 * @returns Formatierte Zeit als String (z.B. "2 Min 30 Sek" oder "30 Sek")
 */
function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} Min ${remainingSeconds} Sek`;
    }
    return `${minutes} Min`;
  } else {
    return `${remainingSeconds} Sek`;
  }
}

/**
 * Formatiert einen Zeitstempel für die Protokollanzeige
 * @param timestamp - Das zu formatierende Datum oder der Zeitstempel
 * @returns Formatierter Zeitstempel als String (HH:MM:SS)
 */
function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

// Animation für fließenden Übergang
watch(() => props.progress, (newValue, oldValue) => {
  if (newValue === 100 && oldValue < 100) {
    // Konvertierung abgeschlossen - hier könnte eine Animation oder ein Ereignis ausgelöst werden
  }
}, { immediate: false });
</script>

<style scoped>
.conversion-progress {
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.conversion-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
  color: #212529;
}

.current-document {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.document-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #6c757d;
}

.document-name {
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-position {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.progress-stages {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  position: relative;
  padding: 0 1rem;
}

.progress-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

.stage-indicator {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #6c757d;
  border: 2px solid #ced4da;
  transition: all 0.3s ease;
}

.stage-label {
  font-size: 0.75rem;
  text-align: center;
  color: #6c757d;
  transition: color 0.3s ease;
  max-width: 80px;
}

.stages-connector {
  position: absolute;
  top: 1rem;
  left: 2rem;
  right: 2rem;
  height: 2px;
  background-color: #e9ecef;
  z-index: 1;
}

.stage-completed .stage-indicator {
  background-color: #4a6cf7;
  color: #fff;
  border-color: #4a6cf7;
}

.stage-completed .stage-label {
  color: #4a6cf7;
  font-weight: 500;
}

.stage-active .stage-indicator {
  background-color: #fff;
  color: #4a6cf7;
  border-color: #4a6cf7;
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(74, 108, 247, 0.2);
}

.stage-active .stage-label {
  color: #4a6cf7;
  font-weight: 600;
}

.progress-container {
  margin-bottom: 1.5rem;
}

.progress-bar-container {
  width: 100%;
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  position: relative;
}

.progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
}

.progress-bar-indeterminate {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 30%;
  background-color: #4a6cf7;
  border-radius: 5px;
  animation: indeterminate 1.5s infinite ease-in-out;
}

@keyframes indeterminate {
  0% {
    left: -30%;
  }
  100% {
    left: 100%;
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.progress-percentage {
  font-weight: 600;
  color: #4a6cf7;
}

.estimated-time {
  color: #6c757d;
}

.step-details {
  background-color: #ffffff;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.current-step-container {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.current-step-label {
  font-weight: 600;
  color: #212529;
  margin-right: 0.5rem;
  white-space: nowrap;
}

.current-step {
  color: #495057;
}

.step-details-text {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #495057;
  max-height: 150px;
  overflow-y: auto;
}

.step-details-text pre {
  margin: 0;
  white-space: pre-wrap;
}

.conversion-warnings {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #fff3cd;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.warning-label {
  font-weight: 600;
  color: #856404;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.warning-icon {
  margin-right: 0.5rem;
  color: #ffc107;
}

.warning-list {
  margin: 0;
  padding-left: 1.5rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.warning-item {
  margin-bottom: 0.25rem;
}

.warning-item:last-child {
  margin-bottom: 0;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cancel-button,
.pause-button,
.resume-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
}

.cancel-button:hover:not(:disabled) {
  background-color: #c0392b;
}

.pause-button {
  background-color: #f39c12;
  color: white;
}

.pause-button:hover:not(:disabled) {
  background-color: #d68910;
}

.resume-button {
  background-color: #2ecc71;
  color: white;
}

.resume-button:hover:not(:disabled) {
  background-color: #27ae60;
}

.cancel-button:disabled,
.pause-button:disabled,
.resume-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button i,
.pause-button i,
.resume-button i {
  margin-right: 0.5rem;
}

.conversion-logs {
  margin-top: 1rem;
}

.logs-details {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.logs-summary {
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  cursor: pointer;
  font-weight: 500;
  color: #495057;
  transition: background-color 0.2s;
}

.logs-summary:hover {
  background-color: #e9ecef;
}

.logs-container {
  max-height: 200px;
  overflow-y: auto;
  background-color: #212529;
  color: #f8f9fa;
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.8rem;
}

.log-entry {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.log-timestamp {
  color: #6c757d;
  margin-right: 0.5rem;
}

.log-level {
  display: inline-block;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  margin-right: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.log-level-info {
  background-color: #4a6cf7;
  color: white;
}

.log-level-warning {
  background-color: #f39c12;
  color: white;
}

.log-level-error {
  background-color: #e74c3c;
  color: white;
}

.log-message {
  color: #f8f9fa;
}

/* Fade Transition für Details */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .progress-stages {
    display: none; /* Auf kleinen Bildschirmen ausblenden */
  }
  
  .actions {
    flex-wrap: wrap;
  }
  
  .cancel-button,
  .pause-button,
  .resume-button {
    flex: 1 0 auto;
    min-width: 120px;
  }
  
  .step-details-text {
    max-height: 100px;
  }
  
  .logs-container {
    max-height: 150px;
  }
}
</style>