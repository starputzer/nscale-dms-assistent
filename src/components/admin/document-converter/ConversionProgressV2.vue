<template>
  <div 
    class="conversion-progress" 
    role="region" 
    aria-live="polite" 
    aria-label="Dokumentenkonvertierungsfortschritt"
    data-testid="conversion-progress-container"
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
        data-testid="conversion-stage"
      >
        <div class="stage-indicator">
          <i v-if="stageIndex > index" class="fa fa-check"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="stage-label">{{ stage.name }}</div>
        <div v-if="stage.description && stageIndex === index" class="stage-description">
          {{ stage.description }}
        </div>
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
        data-testid="progress-bar-container"
      >
        <div 
          class="progress-bar" 
          :style="{ width: `${progress}%` }"
          :class="{ 'progress-bar--paused': isPaused }"
          data-testid="progress-bar"
        ></div>
        <div v-if="isIndeterminate" class="progress-bar-indeterminate"></div>
      </div>
      
      <div class="progress-info">
        <span class="progress-percentage" data-testid="progress-percentage">{{ progress }}%</span>
        <div class="progress-details">
          <span v-if="isPaused" class="progress-paused">
            <i class="fa fa-pause-circle"></i>
            {{ t('documentConverter.pausedStatus', 'Pausiert') }}
          </span>
          <span v-else-if="estimatedCompletionTime" class="estimated-completion">
            {{ t('documentConverter.estimatedCompletion', 'Fertig um') }}: {{ formatTime(estimatedCompletionTime) }}
          </span>
          <span v-else-if="estimatedTimeRemaining > 0" class="estimated-time">
            {{ t('documentConverter.estimatedTimeRemaining', 'Verbleibend') }}: {{ formatDuration(estimatedTimeRemaining) }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="step-details">
      <div class="current-step-container">
        <div class="current-step-label">{{ t('documentConverter.currentStep', 'Aktueller Schritt') }}:</div>
        <div class="current-step" data-testid="current-step">{{ currentStep }}</div>
      </div>
      
      <transition name="fade">
        <div v-if="details" class="step-details-text" data-testid="step-details">
          <pre>{{ details }}</pre>
        </div>
      </transition>
      
      <div v-if="warnings && warnings.length > 0" class="conversion-warnings" data-testid="conversion-warnings">
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
        @click="handleCancel" 
        :disabled="progress >= 100 || !canCancel"
        :aria-label="t('documentConverter.cancelConversion', 'Konvertierung abbrechen')"
        data-testid="cancel-button"
      >
        <i class="fa fa-times" aria-hidden="true"></i>
        {{ t('documentConverter.cancelConversion', 'Abbrechen') }}
      </button>
      
      <button 
        v-if="canPause && !isPaused" 
        class="pause-button" 
        @click="handlePause"
        :disabled="progress >= 100"
        :aria-label="t('documentConverter.pauseConversion', 'Konvertierung pausieren')"
        data-testid="pause-button"
      >
        <i class="fa fa-pause" aria-hidden="true"></i>
        {{ t('documentConverter.pause', 'Pausieren') }}
      </button>
      
      <button 
        v-if="canPause && isPaused" 
        class="resume-button" 
        @click="handleResume"
        :aria-label="t('documentConverter.resumeConversion', 'Konvertierung fortsetzen')"
        data-testid="resume-button"
      >
        <i class="fa fa-play" aria-hidden="true"></i>
        {{ t('documentConverter.resume', 'Fortsetzen') }}
      </button>
      
      <button
        v-if="showDebugButton"
        class="debug-button"
        @click="toggleDebugInfo"
        :aria-label="showDebugInfo ? 'Debug-Informationen ausblenden' : 'Debug-Informationen anzeigen'"
        data-testid="debug-button"
      >
        <i class="fa fa-bug" aria-hidden="true"></i>
        {{ showDebugInfo ? t('documentConverter.hideDebug', 'Debug ausblenden') : t('documentConverter.showDebug', 'Debug anzeigen') }}
      </button>
    </div>
    
    <transition name="slide">
      <div v-if="showDebugInfo" class="debug-info" data-testid="debug-info">
        <h4 class="debug-info-title">{{ t('documentConverter.debugInfo', 'Debug-Informationen') }}</h4>
        <div class="debug-info-content">
          <div class="debug-info-section">
            <h5>{{ t('documentConverter.conversionPhases', 'Konvertierungsphasen') }}</h5>
            <ul class="debug-phase-list">
              <li 
                v-for="(phase, idx) in phaseTimings" 
                :key="idx" 
                class="debug-phase-item"
                :class="{ 'debug-phase-item--current': idx === currentPhaseIndex }"
              >
                <span class="debug-phase-name">{{ phase.name }}</span>
                <span class="debug-phase-timing">
                  {{ phase.startTime ? formatTime(phase.startTime) : '-' }} →
                  {{ phase.endTime ? formatTime(phase.endTime) : phase.startTime ? '...' : '-' }}
                  ({{ phase.duration !== null ? `${phase.duration.toFixed(1)}s` : '-' }})
                </span>
              </li>
            </ul>
          </div>
          
          <div class="debug-info-section">
            <h5>{{ t('documentConverter.performanceMetrics', 'Leistungsmetriken') }}</h5>
            <div class="debug-metrics">
              <div class="debug-metric">
                <span class="debug-metric-label">{{ t('documentConverter.avgProcessingSpeed', 'Durchschn. Verarbeitungsgeschwindigkeit') }}:</span>
                <span class="debug-metric-value">{{ avgProcessingSpeed }}</span>
              </div>
              <div class="debug-metric">
                <span class="debug-metric-label">{{ t('documentConverter.startTime', 'Startzeit') }}:</span>
                <span class="debug-metric-value">{{ formatTime(startTime) }}</span>
              </div>
              <div class="debug-metric">
                <span class="debug-metric-label">{{ t('documentConverter.elapsedTime', 'Verstrichene Zeit') }}:</span>
                <span class="debug-metric-value">{{ formatDuration(elapsedTimeSeconds) }}</span>
              </div>
              <div class="debug-metric">
                <span class="debug-metric-label">{{ t('documentConverter.timeRemaining', 'Verbleibende Zeit') }}:</span>
                <span class="debug-metric-value">{{ formatDuration(estimatedTimeRemaining) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="debug-controls">
          <button 
            class="debug-action-btn" 
            @click="simulateError"
            data-testid="simulate-error-btn"
          >
            {{ t('documentConverter.simulateError', 'Fehler simulieren') }}
          </button>
          <button 
            class="debug-action-btn" 
            @click="adjustTimeEstimation(0.8)"
            title="Zeitschätzung beschleunigen"
            data-testid="accelerate-btn"
          >
            {{ t('documentConverter.accelerate', 'Beschleunigen') }}
          </button>
          <button 
            class="debug-action-btn" 
            @click="adjustTimeEstimation(1.2)"
            title="Zeitschätzung verlangsamen"
            data-testid="decelerate-btn"
          >
            {{ t('documentConverter.decelerate', 'Verlangsamen') }}
          </button>
        </div>
      </div>
    </transition>
    
    <div v-if="logs && logs.length > 0" class="conversion-logs" data-testid="conversion-logs">
      <details class="logs-details">
        <summary class="logs-summary">
          {{ t('documentConverter.showLogs', 'Konvertierungsprotokolle anzeigen') }}
          <span class="logs-count" :class="{ 'logs-count--warning': hasWarningLogs, 'logs-count--error': hasErrorLogs }">
            {{ logs.length }}
          </span>
        </summary>
        <div class="logs-container">
          <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="`log-level-${log.level}`">
            <span class="log-timestamp">{{ formatLogTime(log.timestamp) }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
        <div class="logs-actions">
          <button 
            class="logs-action-btn" 
            @click="clearLogs"
            :title="t('documentConverter.clearLogs', 'Protokolle löschen')"
            data-testid="clear-logs-btn"
          >
            <i class="fa fa-trash" aria-hidden="true"></i>
            {{ t('documentConverter.clearLogs', 'Protokolle löschen') }}
          </button>
          <button 
            class="logs-action-btn" 
            @click="exportLogs"
            :title="t('documentConverter.exportLogs', 'Protokolle exportieren')"
            data-testid="export-logs-btn"
          >
            <i class="fa fa-download" aria-hidden="true"></i>
            {{ t('documentConverter.exportLogs', 'Exportieren') }}
          </button>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useDocumentConverterStore } from '@/stores/documentConverter';

interface ConversionPhase {
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  duration: number | null;
}

interface Log {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

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
  
  /** Flag, ob Debug-Informationen angezeigt werden können */
  showDebugButton?: boolean;
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
  canPause: true,
  isPaused: false,
  canCancel: true,
  warnings: () => [],
  logs: () => [],
  isIndeterminate: false,
  showDebugButton: false
});

// Definiere die Emits
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'pause'): void;
  (e: 'resume'): void;
  (e: 'error', error: Error): void;
}>();

const { t } = useI18n();
const store = useDocumentConverterStore();

// Interne Zustandsvariablen
const showDebugInfo = ref(false);
const startTime = ref<Date>(new Date());
const phaseTimings = ref<ConversionPhase[]>([
  { name: 'Initialisierung', startTime: new Date(), endTime: null, duration: null },
  { name: 'Extraktion', startTime: null, endTime: null, duration: null },
  { name: 'Verarbeitung', startTime: null, endTime: null, duration: null },
  { name: 'Formatierung', startTime: null, endTime: null, duration: null },
  { name: 'Fertigstellung', startTime: null, endTime: null, duration: null }
]);

const currentPhaseIndex = ref(0);
const internalLogs = ref<Log[]>([]);
const timeEstimationFactor = ref(1);
const avgSpeed = ref<number | null>(null);
const elapsedTimeSeconds = ref(0);
const timeUpdater = ref<number | null>(null);
const estimatedCompletionTime = ref<Date | null>(null);

// Definiere die Konvertierungsphasen
const stages = [
  { 
    name: t('documentConverter.stage.preparation', 'Vorbereitung'),
    description: t('documentConverter.stage.preparationDesc', 'Dokumentanalyse und Vorbereitung der Konvertierung')
  },
  { 
    name: t('documentConverter.stage.extraction', 'Extraktion'),
    description: t('documentConverter.stage.extractionDesc', 'Inhaltsextraktion und Metadatensammlung')
  },
  { 
    name: t('documentConverter.stage.processing', 'Verarbeitung'),
    description: t('documentConverter.stage.processingDesc', 'Strukturerkennung und Inhaltsverarbeitung')
  },
  { 
    name: t('documentConverter.stage.formatting', 'Formatierung'),
    description: t('documentConverter.stage.formattingDesc', 'Anwendung von Formaten und Strukturen')
  },
  { 
    name: t('documentConverter.stage.finalization', 'Fertigstellung'),
    description: t('documentConverter.stage.finalizationDesc', 'Ergebniszusammenstellung und Finalisierung')
  }
];

// Berechnete Eigenschaften
const stageIndex = computed(() => {
  if (props.progress >= 100) return stages.length - 1;
  return Math.min(Math.floor(props.progress / (100 / stages.length)), stages.length - 1);
});

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

const combinedLogs = computed(() => {
  const externalLogs = (props.logs || []).map(log => ({
    timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
    level: log.level,
    message: log.message
  }));
  
  return [...internalLogs.value, ...externalLogs].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
});

const hasWarningLogs = computed(() => {
  return combinedLogs.value.some(log => log.level === 'warning');
});

const hasErrorLogs = computed(() => {
  return combinedLogs.value.some(log => log.level === 'error');
});

const avgProcessingSpeed = computed(() => {
  if (avgSpeed.value === null) {
    return t('documentConverter.notAvailable', 'Nicht verfügbar');
  }
  
  return `${avgSpeed.value.toFixed(2)} %/s`;
});

// Methoden
function handleCancel(): void {
  addLog('info', 'Konvertierung wurde vom Benutzer abgebrochen');
  emit('cancel');
}

function handlePause(): void {
  addLog('info', 'Konvertierung wurde vom Benutzer pausiert');
  emit('pause');
}

function handleResume(): void {
  addLog('info', 'Konvertierung wurde vom Benutzer fortgesetzt');
  emit('resume');
}

function toggleDebugInfo(): void {
  showDebugInfo.value = !showDebugInfo.value;
}

function addLog(level: 'info' | 'warning' | 'error', message: string): void {
  internalLogs.value.push({
    timestamp: new Date(),
    level,
    message
  });
  
  // Logs auf eine vernünftige Größe begrenzen
  if (internalLogs.value.length > 100) {
    internalLogs.value = internalLogs.value.slice(-100);
  }
}

function clearLogs(): void {
  internalLogs.value = [];
}

function exportLogs(): void {
  // Alle Logs als JSON exportieren
  const exportData = combinedLogs.value.map(log => ({
    timestamp: log.timestamp.toISOString(),
    level: log.level,
    message: log.message
  }));
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversion_logs_${new Date().toISOString().replace(/:/g, '-')}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Simuliert einen Fehler (nur für Debugging-Zwecke)
 */
function simulateError(): void {
  addLog('error', 'Simulierter Fehler während der Konvertierung');
  emit('error', new Error('Simulierter Fehler während der Konvertierung'));
}

/**
 * Passt den Faktor für die Zeitschätzung an (nur für Debugging-Zwecke)
 */
function adjustTimeEstimation(factor: number): void {
  timeEstimationFactor.value = factor;
  addLog('info', `Zeitschätzungsfaktor auf ${factor} angepasst`);
  updateTimeEstimation();
}

/**
 * Aktualisiert die Zeitschätzung basierend auf dem aktuellen Fortschritt
 */
function updateTimeEstimation(): void {
  if (props.isPaused) return;
  
  const currentProgress = props.progress;
  const currentTime = new Date();
  const elapsedMs = currentTime.getTime() - startTime.value.getTime();
  
  // Verstrichene Zeit in Sekunden
  elapsedTimeSeconds.value = elapsedMs / 1000;
  
  // Durchschnittsgeschwindigkeit berechnen (% pro Sekunde)
  if (currentProgress > 0 && elapsedMs > 0) {
    avgSpeed.value = (currentProgress / elapsedMs) * 1000;
  }
  
  // Verbleibende Zeit berechnen
  if (avgSpeed.value !== null && currentProgress < 100) {
    const remainingProgress = 100 - currentProgress;
    const estimatedRemainingMs = (remainingProgress / avgSpeed.value) * 1000;
    
    // Angepasste Schätzung mit Faktor
    const adjustedEstimatedRemainingMs = estimatedRemainingMs * timeEstimationFactor.value;
    
    // Geschätzten Abschlusszeitpunkt berechnen
    estimatedCompletionTime.value = new Date(currentTime.getTime() + adjustedEstimatedRemainingMs);
  } else if (currentProgress >= 100) {
    estimatedCompletionTime.value = new Date();
  }
}

/**
 * Aktualisiert den Phasenstatus basierend auf dem aktuellen Fortschritt
 */
function updatePhaseStatus(): void {
  const newPhaseIndex = stageIndex.value;
  
  // Wenn sich die Phase geändert hat
  if (newPhaseIndex !== currentPhaseIndex.value) {
    // Vorherige Phase abschließen
    if (currentPhaseIndex.value < phaseTimings.value.length) {
      const now = new Date();
      phaseTimings.value[currentPhaseIndex.value].endTime = now;
      
      // Dauer berechnen
      const phase = phaseTimings.value[currentPhaseIndex.value];
      if (phase.startTime) {
        phase.duration = (now.getTime() - phase.startTime.getTime()) / 1000;
      }
      
      // Log
      addLog('info', `Phase "${phaseTimings.value[currentPhaseIndex.value].name}" abgeschlossen`);
    }
    
    // Neue Phase starten
    if (newPhaseIndex < phaseTimings.value.length) {
      phaseTimings.value[newPhaseIndex].startTime = new Date();
      addLog('info', `Phase "${phaseTimings.value[newPhaseIndex].name}" gestartet`);
    }
    
    // Aktuellen Phasenindex aktualisieren
    currentPhaseIndex.value = newPhaseIndex;
  }
}

/**
 * Formatiert die geschätzte verbleibende Zeit in ein benutzerfreundliches Format
 * @param seconds - Die verbleibende Zeit in Sekunden
 * @returns Formatierte Zeit als String (z.B. "2 Min 30 Sek" oder "30 Sek")
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} ${minutes === 1 ? 'Min' : 'Min'} ${remainingSeconds} ${remainingSeconds === 1 ? 'Sek' : 'Sek'}`;
    }
    return `${minutes} ${minutes === 1 ? 'Min' : 'Min'}`;
  } else {
    return `${remainingSeconds} ${remainingSeconds === 1 ? 'Sek' : 'Sek'}`;
  }
}

/**
 * Formatiert ein Datum in ein lesbares Zeitformat (HH:MM:SS)
 */
function formatTime(date: Date | null): string {
  if (!date) return '';
  
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Formatiert einen Zeitstempel für die Protokollanzeige
 */
function formatLogTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

// Initialisierung
onMounted(() => {
  addLog('info', 'Konvertierungsprozess gestartet');
  
  // Timer für die Zeitaktualisierung starten
  timeUpdater.value = window.setInterval(() => {
    if (!props.isPaused) {
      updateTimeEstimation();
    }
  }, 1000);
});

// Aufräumen beim Unmount
onUnmounted(() => {
  // Timer stoppen
  if (timeUpdater.value !== null) {
    clearInterval(timeUpdater.value);
  }
});

// Beobachter für Fortschritt und Phasenwechsel
watch(() => props.progress, (newProgress) => {
  updatePhaseStatus();
  
  // Bei 100% alle Logs exportieren
  if (newProgress >= 100) {
    addLog('info', 'Konvertierungsprozess abgeschlossen');
    
    // Letzte Phase abschließen
    const lastPhaseIndex = phaseTimings.value.length - 1;
    if (phaseTimings.value[lastPhaseIndex].endTime === null && phaseTimings.value[lastPhaseIndex].startTime !== null) {
      const now = new Date();
      phaseTimings.value[lastPhaseIndex].endTime = now;
      phaseTimings.value[lastPhaseIndex].duration = (now.getTime() - phaseTimings.value[lastPhaseIndex].startTime!.getTime()) / 1000;
    }
  }
});

// Warnungen beobachten
watch(() => props.warnings, (newWarnings) => {
  if (newWarnings && newWarnings.length > 0) {
    // Neue Warnungen als Logs hinzufügen
    for (const warning of newWarnings) {
      if (!internalLogs.value.some(log => log.level === 'warning' && log.message === warning)) {
        addLog('warning', warning);
      }
    }
  }
});

// Pause/Fortsetzen beobachten
watch(() => props.isPaused, (isPaused) => {
  if (isPaused) {
    addLog('info', 'Konvertierung pausiert');
  } else {
    addLog('info', 'Konvertierung fortgesetzt');
  }
});
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
  max-width: 120px;
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
  font-size: 0.85rem;
  text-align: center;
  color: #6c757d;
  transition: color 0.3s ease;
  max-width: 120px;
  margin-bottom: 0.5rem;
}

.stage-description {
  font-size: 0.75rem;
  text-align: center;
  color: #6c757d;
  max-width: 120px;
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
  margin-bottom: 0.75rem;
  position: relative;
}

.progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
}

.progress-bar--paused {
  background-image: repeating-linear-gradient(
    45deg,
    #4a6cf7 0px,
    #4a6cf7 10px,
    #7089f9 10px,
    #7089f9 20px
  );
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

.progress-details {
  display: flex;
  align-items: center;
  color: #6c757d;
}

.progress-paused {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  color: #fd7e14;
}

.progress-paused i {
  font-size: 0.9rem;
}

.estimated-completion, .estimated-time {
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
  margin-bottom: 0.75rem;
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
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cancel-button,
.pause-button,
.resume-button,
.debug-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.debug-button {
  background-color: #6c757d;
  color: white;
}

.debug-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.cancel-button:disabled,
.pause-button:disabled,
.resume-button:disabled,
.debug-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.debug-info {
  background-color: #343a40;
  color: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.debug-info-title {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: #f8f9fa;
}

.debug-info-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.debug-info-section {
  margin-bottom: 1rem;
}

.debug-info-section h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #adb5bd;
}

.debug-phase-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debug-phase-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.debug-phase-item--current {
  background-color: rgba(74, 108, 247, 0.3);
  border-left: 3px solid #4a6cf7;
}

.debug-phase-name {
  font-weight: 500;
}

.debug-phase-timing {
  font-family: monospace;
  font-size: 0.8rem;
  color: #adb5bd;
}

.debug-metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.debug-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-metric-label {
  color: #adb5bd;
}

.debug-metric-value {
  font-family: monospace;
  color: #f8f9fa;
}

.debug-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.debug-action-btn {
  background-color: #495057;
  color: #f8f9fa;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.debug-action-btn:hover {
  background-color: #6c757d;
}

.conversion-logs {
  margin-top: 1.5rem;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background-color 0.2s;
}

.logs-summary:hover {
  background-color: #e9ecef;
}

.logs-count {
  background-color: #6c757d;
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  min-width: 20px;
  text-align: center;
}

.logs-count--warning {
  background-color: #ffc107;
  color: #212529;
}

.logs-count--error {
  background-color: #e74c3c;
}

.logs-container {
  max-height: 200px;
  overflow-y: auto;
  background-color: #212529;
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.8rem;
}

.log-entry {
  margin-bottom: 0.4rem;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
}

.log-timestamp {
  color: #6c757d;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.log-level {
  display: inline-block;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  margin-right: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.log-level-info {
  color: white;
  background-color: #4a6cf7;
}

.log-level-warning {
  color: #212529;
  background-color: #ffc107;
}

.log-level-error {
  color: white;
  background-color: #e74c3c;
}

.log-message {
  color: #f8f9fa;
  word-break: break-word;
}

.logs-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

.logs-action-btn {
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.logs-action-btn:hover {
  background-color: #dee2e6;
}

/* Fade-In/Out-Animation für Details */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Slide-Animation für Debug-Info */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .progress-stages {
    display: none;
  }
  
  .debug-info-content {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .cancel-button,
  .pause-button,
  .resume-button,
  .debug-button {
    width: 100%;
  }
}
</style>