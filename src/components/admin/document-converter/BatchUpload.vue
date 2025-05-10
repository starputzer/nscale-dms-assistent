<template>
  <div class="batch-upload">
    <div class="batch-upload__header">
      <h3 class="batch-upload__title">{{ t('documentConverter.batchUpload.title', 'Batch-Upload') }}</h3>
      <div class="batch-upload__description">
        {{ t('documentConverter.batchUpload.description', 'Laden Sie mehrere Dokumente gleichzeitig hoch und konvertieren Sie sie als Stapel.') }}
      </div>
    </div>

    <!-- Upload-Bereich -->
    <div 
      class="batch-upload__dropzone"
      :class="{ 
        'batch-upload__dropzone--dragging': isDragging, 
        'batch-upload__dropzone--disabled': isProcessing || isLoading
      }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerFileInput"
      @keydown.space.prevent="triggerFileInput"
      @keydown.enter.prevent="triggerFileInput"
      tabindex="0"
      role="button"
      :aria-disabled="isProcessing || isLoading"
      :aria-label="t('documentConverter.batchUpload.dropzone', 'Dateien für Batch-Upload hier ablegen')"
    >
      <div class="batch-upload__dropzone-content">
        <div class="batch-upload__icon" aria-hidden="true">
          <i class="fa fa-cloud-upload-alt"></i>
        </div>
        
        <div class="batch-upload__text">
          <p class="batch-upload__prompt">
            {{ t('documentConverter.batchUpload.dropFiles', 'Dateien hier ablegen oder') }} 
            <span class="batch-upload__browse">
              {{ t('documentConverter.browse', 'auswählen') }}
            </span>
          </p>
          <p class="batch-upload__hint">
            {{ t('documentConverter.supportedFormats', 'Unterstützte Formate:') }} 
            {{ allowedExtensions.map(ext => ext.toUpperCase()).join(', ') }}
            <br>
            {{ t('documentConverter.batchUpload.maxFiles', 'Maximale Anzahl:') }} {{ maxFiles }} {{ t('documentConverter.batchUpload.files', 'Dateien') }}
          </p>
        </div>
        
        <input 
          type="file"
          ref="fileInput"
          @change="onFileSelected"
          :accept="allowedExtensions.map(ext => '.' + ext).join(',')"
          class="batch-upload__input"
          :disabled="isProcessing || isLoading"
          multiple
          :aria-label="t('documentConverter.selectFiles', 'Dateien auswählen')"
        >
      </div>
    </div>

    <!-- Ladestatus bei Upload/Verarbeitung -->
    <div v-if="isLoading || uploadInProgress" class="batch-upload__loading">
      <div class="batch-upload__loader">
        <i class="fa fa-spinner fa-spin" aria-hidden="true"></i>
        <span>{{ t('documentConverter.batchUpload.preparingFiles', 'Dateien werden vorbereitet...') }}</span>
      </div>
    </div>

    <!-- Batch Übersicht -->
    <div v-if="batchFiles.length > 0" class="batch-upload__overview">
      <div class="batch-upload__stats">
        <div class="batch-upload__stat-item">
          <span class="batch-upload__stat-label">{{ t('documentConverter.batchUpload.totalFiles', 'Dateien gesamt:') }}</span>
          <span class="batch-upload__stat-value">{{ batchFiles.length }}</span>
        </div>
        <div class="batch-upload__stat-item">
          <span class="batch-upload__stat-label">{{ t('documentConverter.batchUpload.totalSize', 'Gesamtgröße:') }}</span>
          <span class="batch-upload__stat-value" :class="{'batch-upload__stat-value--error': isTotalSizeExceeded}">
            {{ totalSizeFormatted }}
            <span v-if="isTotalSizeExceeded" class="batch-upload__error-icon" aria-hidden="true">⚠️</span>
          </span>
        </div>
        <div class="batch-upload__stat-item">
          <span class="batch-upload__stat-label">{{ t('documentConverter.batchUpload.validFiles', 'Gültige Dateien:') }}</span>
          <span class="batch-upload__stat-value" :class="{'batch-upload__stat-value--success': validFilesCount > 0}">
            {{ validFilesCount }}
          </span>
        </div>
        <div v-if="invalidFilesCount > 0" class="batch-upload__stat-item">
          <span class="batch-upload__stat-label">{{ t('documentConverter.batchUpload.invalidFiles', 'Ungültige Dateien:') }}</span>
          <span class="batch-upload__stat-value batch-upload__stat-value--error">{{ invalidFilesCount }}</span>
        </div>
      </div>

      <!-- Stapelpriorität und Einstellungen -->
      <div class="batch-upload__settings">
        <div class="batch-upload__priority">
          <label class="batch-upload__label">
            {{ t('documentConverter.batchUpload.priority', 'Stapelpriorität:') }}
          </label>
          <select 
            v-model="batchPriority" 
            class="batch-upload__select"
            :disabled="isProcessing"
          >
            <option value="high">{{ t('documentConverter.batchUpload.priorityHigh', 'Hoch') }}</option>
            <option value="normal">{{ t('documentConverter.batchUpload.priorityNormal', 'Normal') }}</option>
            <option value="low">{{ t('documentConverter.batchUpload.priorityLow', 'Niedrig') }}</option>
          </select>
        </div>
        
        <div class="batch-upload__option">
          <input 
            type="checkbox" 
            id="auto-convert" 
            v-model="autoConvert"
            :disabled="isProcessing"
            class="batch-upload__checkbox"
          >
          <label for="auto-convert" class="batch-upload__checkbox-label">
            {{ t('documentConverter.batchUpload.autoConvert', 'Automatisch konvertieren nach Upload') }}
          </label>
        </div>
      </div>

      <!-- Fehlermeldung bei Gesamtgrößenüberschreitung -->
      <div v-if="isTotalSizeExceeded" class="batch-upload__error-message" role="alert">
        {{ t('documentConverter.batchUpload.totalSizeExceeded', `Die Gesamtgröße der ausgewählten Dateien (${totalSizeFormatted}) überschreitet das Maximum von ${maxTotalSizeFormatted}.`) }}
      </div>

      <!-- Dateiliste mit Status -->
      <div class="batch-upload__file-list">
        <h4 class="batch-upload__subheading">
          {{ t('documentConverter.batchUpload.filesToUpload', 'Dateien für den Stapel-Upload:') }}
        </h4>
        
        <div class="batch-upload__files">
          <div
            v-for="(file, index) in batchFiles"
            :key="file.id"
            class="batch-upload__file-item"
            :class="{
              'batch-upload__file-item--invalid': file.validationStatus === 'invalid',
              'batch-upload__file-item--uploading': file.status === 'uploading',
              'batch-upload__file-item--uploaded': file.status === 'uploaded',
              'batch-upload__file-item--error': file.error,
              'batch-upload__file-item--swiping': fileSwiping === file.id
            }"
            v-touch="{
              left: () => handleSwipeLeft(file.id, index),
              right: () => handleSwipeRight(file.id, index),
              tap: () => handleFileTap(file.id, index)
            }"
          >
            <!-- Touch Action Overlay for Mobile -->
            <div v-if="fileSwiping === file.id" class="batch-upload__touch-actions">
              <button
                v-if="touchActionButtons.get(file.id) === true"
                class="batch-upload__touch-btn batch-upload__touch-upload-btn"
                @click.stop="uploadSingleFile(index)"
                :aria-label="t('documentConverter.batchUpload.uploadNow', `Datei '${file.file.name}' jetzt hochladen`)"
              >
                <i class="fa fa-upload" aria-hidden="true"></i>
                <span>{{ t('documentConverter.batchUpload.uploadNow', 'Jetzt hochladen') }}</span>
              </button>
              <button
                v-if="touchActionButtons.get(file.id) === false"
                class="batch-upload__touch-btn batch-upload__touch-remove-btn"
                @click.stop="removeFile(index)"
                :aria-label="t('documentConverter.batchUpload.removeFile', `Datei '${file.file.name}' entfernen`)"
              >
                <i class="fa fa-trash" aria-hidden="true"></i>
                <span>{{ t('documentConverter.batchUpload.remove', 'Entfernen') }}</span>
              </button>
            </div>

            <div class="batch-upload__file-header">
              <div class="batch-upload__file-icon" aria-hidden="true">
                <i :class="getFileIcon(file.file)"></i>
              </div>
              
              <div class="batch-upload__file-info">
                <span class="batch-upload__file-name" :title="file.file.name">{{ file.file.name }}</span>
                <span class="batch-upload__file-meta">
                  {{ formatFileSize(file.file.size) }} - {{ getFileType(file.file) }}
                </span>
              </div>
              
              <div class="batch-upload__file-actions">
                <!-- Priorität für einzelne Datei -->
                <div v-if="!isProcessing && file.validationStatus === 'valid'" class="batch-upload__file-priority">
                  <select 
                    v-model="file.priority" 
                    class="batch-upload__file-priority-select"
                    :aria-label="t('documentConverter.batchUpload.filePriority', 'Dateiprioritä')"
                  >
                    <option value="high">{{ t('documentConverter.batchUpload.priorityHigh', 'Hoch') }}</option>
                    <option value="normal">{{ t('documentConverter.batchUpload.priorityNormal', 'Normal') }}</option>
                    <option value="low">{{ t('documentConverter.batchUpload.priorityLow', 'Niedrig') }}</option>
                  </select>
                </div>
                
                <!-- Einzelne Datei hochladen -->
                <button
                  v-if="file.validationStatus === 'valid' && !isProcessing && !file.status"
                  class="batch-upload__action-btn batch-upload__upload-single-btn"
                  @click.stop="uploadSingleFile(index)"
                  :aria-label="t('documentConverter.uploadSingleFile', `Datei '${file.file.name}' einzeln hochladen`)"
                >
                  <i class="fa fa-upload" aria-hidden="true"></i>
                </button>
                
                <!-- Einzelne Datei entfernen -->
                <button
                  class="batch-upload__remove-btn"
                  @click.stop="removeFile(index)"
                  :aria-label="t('documentConverter.removeFile', `Datei '${file.file.name}' entfernen`)"
                  :disabled="isProcessing && file.status === 'uploading'"
                >
                  <i class="fa fa-times" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            
            <!-- Fortschrittsanzeige für Datei -->
            <div v-if="file.status === 'uploading'" class="batch-upload__file-progress">
              <div class="batch-upload__progress" role="progressbar"
                :aria-valuenow="file.progress" aria-valuemin="0" aria-valuemax="100">
                <div class="batch-upload__progress-bar" :style="{ width: `${file.progress}%` }"></div>
                <span class="batch-upload__progress-text">{{ file.progress }}%</span>
              </div>
            </div>
            
            <!-- Validierungsstatus -->
            <div v-if="file.validationStatus === 'validating'" class="batch-upload__validating">
              <i class="fa fa-spinner fa-spin" aria-hidden="true"></i>
              {{ t('documentConverter.validating', 'Datei wird überprüft...') }}
            </div>
            <div v-else-if="file.validationStatus === 'invalid'" class="batch-upload__invalid">
              <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
              {{ file.validationMessage }}
            </div>
            <div v-else-if="file.error" class="batch-upload__error">
              <i class="fa fa-exclamation-circle" aria-hidden="true"></i>
              {{ file.error }}
            </div>
            
            <!-- Wiederaufnahme-Schaltfläche -->
            <div v-if="file.canResume" class="batch-upload__resume">
              <button 
                class="batch-upload__resume-btn"
                @click="resumeUpload(index)"
                :disabled="isProcessing"
              >
                <i class="fa fa-sync-alt" aria-hidden="true"></i>
                {{ t('documentConverter.batchUpload.resumeUpload', 'Upload fortsetzen') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons für Batch-Aktionen -->
      <div class="batch-upload__actions">
        <button
          class="batch-upload__start-btn"
          @click="startBatchUpload"
          :disabled="!canStartBatch || isProcessing"
        >
          <i class="fa fa-play" aria-hidden="true"></i>
          {{ t('documentConverter.batchUpload.startBatch', 'Stapel-Upload starten') }}
        </button>
        
        <button
          class="batch-upload__clear-btn"
          @click="clearBatch"
          :disabled="isProcessing"
        >
          <i class="fa fa-trash" aria-hidden="true"></i>
          {{ t('documentConverter.batchUpload.clearBatch', 'Stapel leeren') }}
        </button>
        
        <button
          v-if="isProcessing"
          class="batch-upload__cancel-btn"
          @click="cancelBatchUpload"
        >
          <i class="fa fa-stop" aria-hidden="true"></i>
          {{ t('documentConverter.batchUpload.cancelBatch', 'Stapel-Upload abbrechen') }}
        </button>
      </div>

      <!-- Batch-Fortschritt -->
      <div v-if="isProcessing" class="batch-upload__batch-progress">
        <h4 class="batch-upload__subheading">
          {{ t('documentConverter.batchUpload.progress', 'Stapel-Fortschritt:') }}
        </h4>
        
        <div class="batch-upload__batch-stats">
          <div class="batch-upload__batch-stat">
            <span class="batch-upload__batch-label">{{ t('documentConverter.batchUpload.filesProcessed', 'Dateien verarbeitet:') }}</span>
            <span class="batch-upload__batch-value">{{ completedFilesCount }} / {{ totalFilesToProcess }}</span>
          </div>
          <div class="batch-upload__batch-stat">
            <span class="batch-upload__batch-label">{{ t('documentConverter.batchUpload.currentFile', 'Aktuelle Datei:') }}</span>
            <span class="batch-upload__batch-value">{{ currentFileName || '-' }}</span>
          </div>
          <div class="batch-upload__batch-stat">
            <span class="batch-upload__batch-label">{{ t('documentConverter.batchUpload.estimatedTimeRemaining', 'Geschätzte Restzeit:') }}</span>
            <span class="batch-upload__batch-value">{{ formatTimeRemaining(estimatedTimeRemaining) }}</span>
          </div>
        </div>
        
        <div class="batch-upload__total-progress" role="progressbar"
          :aria-valuenow="batchProgress" aria-valuemin="0" aria-valuemax="100">
          <div class="batch-upload__total-progress-bar" :style="{ width: `${batchProgress}%` }"></div>
          <span class="batch-upload__total-progress-text">{{ batchProgress }}%</span>
        </div>
      </div>
    </div>

    <!-- Leerer Zustand -->
    <div v-if="!batchFiles.length && !isLoading" class="batch-upload__empty">
      <p>{{ t('documentConverter.batchUpload.empty', 'Fügen Sie Dateien hinzu, um einen Stapel-Upload zu starten.') }}</p>
    </div>

    <!-- Schnellauswahl-Optionen -->
    <div v-if="batchFiles.length > 0 && !isProcessing" class="batch-upload__quick-actions">
      <button
        class="batch-upload__quick-action"
        @click="setPriorityForAll('high')"
      >
        {{ t('documentConverter.batchUpload.setAllHigh', 'Alle auf hohe Priorität setzen') }}
      </button>
      <button
        class="batch-upload__quick-action"
        @click="setPriorityForAll('normal')"
      >
        {{ t('documentConverter.batchUpload.setAllNormal', 'Alle auf normale Priorität setzen') }}
      </button>
      <button
        class="batch-upload__quick-action"
        @click="removeInvalidFiles"
      >
        {{ t('documentConverter.batchUpload.removeInvalid', 'Ungültige Dateien entfernen') }}
      </button>
    </div>

    <!-- Screenreader-Meldungen -->
    <div class="sr-only" aria-live="polite">
      {{ screenReaderMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import { useGlobalDialog } from '@/composables/useDialog';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { vTouch } from '@/directives/touch-directives';

// Services und Dependencies
const documentConverterStore = useDocumentConverterStore();
const dialog = useGlobalDialog();
const { t } = useI18n();
const toast = useToast();

// Typdefinitionen
interface BatchUploadProps {
  /** Maximale Dateigröße in Bytes */
  maxFileSize?: number;

  /** Maximale Gesamtgröße aller Dateien in Bytes */
  maxTotalSize?: number;

  /** Liste der erlaubten Dateierweiterungen */
  allowedExtensions?: string[];

  /** Maximale Anzahl an Dateien, die gleichzeitig hochgeladen werden können */
  maxFiles?: number;

  /** Ob Queue-Priorisierung aktiviert ist */
  enablePrioritization?: boolean;

  /** Ob automatische Konvertierung nach Upload aktiviert ist */
  enableAutoConvert?: boolean;

  /** Ob erweiterte Dateivalidierung aktiviert ist */
  enhancedValidation?: boolean;

  /** Ob unterbrochene Uploads wiederaufgenommen werden können */
  enableResume?: boolean;
}

type ValidationStatus = 'pending' | 'validating' | 'valid' | 'invalid';
type UploadStatus = '' | 'queued' | 'uploading' | 'uploaded' | 'failed' | 'canceled';
type FilePriority = 'high' | 'normal' | 'low';

interface BatchFile {
  /** Eindeutige ID für die Datei */
  id: string;
  
  /** Die eigentliche File-Instanz */
  file: File;
  
  /** Validierungsstatus */
  validationStatus: ValidationStatus;
  
  /** Validierungsnachricht bei Fehler */
  validationMessage?: string;
  
  /** Upload-Status */
  status?: UploadStatus;
  
  /** Upload-Fortschritt (0-100) */
  progress: number;
  
  /** Priorität der Datei im Stapel */
  priority: FilePriority;
  
  /** Zeitpunkt der Hinzufügung */
  addedAt: Date;

  /** Bytes bereits übertragen (für Resume) */
  uploadedBytes?: number;
  
  /** Upload-Token (für Resume) */
  uploadToken?: string;
  
  /** Ob Upload wiederaufgenommen werden kann */
  canResume?: boolean;
  
  /** Allgemeiner Fehler */
  error?: string;
}

// Interface-Definition für emittierte Events
interface BatchUploadEmits {
  /** Wird ausgelöst, wenn der Stapel-Upload gestartet wird */
  (e: 'start-batch', files: File[], priorities: Record<string, FilePriority>): void;

  /** Wird ausgelöst, wenn eine einzelne Datei hochgeladen wird */
  (e: 'upload-single', file: File, priority: FilePriority): void;

  /** Wird ausgelöst, wenn der Stapel-Upload abgeschlossen ist */
  (e: 'batch-completed', results: any[]): void;

  /** Wird ausgelöst, wenn ein Stapel-Upload abgebrochen wird */
  (e: 'batch-canceled'): void;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<BatchUploadProps>(), {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  maxTotalSize: 500 * 1024 * 1024, // 500 MB
  allowedExtensions: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt'],
  maxFiles: 25,
  enablePrioritization: true,
  enableAutoConvert: true,
  enhancedValidation: true,
  enableResume: true
});

// Event-Emitter definieren
const emit = defineEmits<BatchUploadEmits>();

// Reaktiver Zustand
const fileInput = ref<HTMLInputElement | null>(null);
const batchFiles = ref<BatchFile[]>([]);
const isDragging = ref<boolean>(false);
const isProcessing = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const uploadInProgress = ref<boolean>(false);
const screenReaderMessage = ref<string>('');
const batchPriority = ref<FilePriority>('normal');
const autoConvert = ref<boolean>(true);
const currentFileIndex = ref<number>(-1);
const batchProgress = ref<number>(0);
const completedFilesCount = ref<number>(0);
const totalFilesToProcess = ref<number>(0);
const currentFileName = ref<string>('');
const estimatedTimeRemaining = ref<number>(0);
const uploadStartTime = ref<Date | null>(null);
const resumableUploads = ref<Map<string, any>>(new Map());
// Mobile touch gesture state
const fileSwiping = ref<string | null>(null);
const touchActionButtons = ref<Map<string, boolean>>(new Map());

// MIME-Typen zu Dateiendungen zuordnen
const mimeTypesMap = {
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'text/plain': ['txt'],
  'text/html': ['html', 'htm'],
  'text/csv': ['csv']
};

// Berechnete Eigenschaften
const validFilesCount = computed<number>(() => {
  return batchFiles.value.filter(file => file.validationStatus === 'valid').length;
});

const invalidFilesCount = computed<number>(() => {
  return batchFiles.value.filter(file => file.validationStatus === 'invalid').length;
});

const totalFilesSize = computed<number>(() => {
  return batchFiles.value.reduce((total, file) => total + file.file.size, 0);
});

const isTotalSizeExceeded = computed<boolean>(() => {
  return totalFilesSize.value > props.maxTotalSize;
});

const totalSizeFormatted = computed<string>(() => {
  return formatFileSize(totalFilesSize.value);
});

const maxTotalSizeFormatted = computed<string>(() => {
  return formatFileSize(props.maxTotalSize);
});

const canStartBatch = computed<boolean>(() => {
  return validFilesCount.value > 0 && !isTotalSizeExceeded.value;
});

// Datei-Auswahl Dialog öffnen
function triggerFileInput(event: Event): void {
  // Stoppe Ereignispropagierung, wenn auf bestimmte Elemente geklickt wurde
  if (
    event.target instanceof HTMLButtonElement || 
    event.target instanceof HTMLInputElement ||
    (event.target as HTMLElement).closest('.batch-upload__file-item') ||
    (event.target as HTMLElement).closest('.batch-upload__actions')
  ) {
    return;
  }
  
  if (isProcessing.value || isLoading.value) return;
  
  if (fileInput.value) {
    fileInput.value.click();
  }
}

// Drag & Drop Handlers
function onDragOver(event: DragEvent): void {
  if (isProcessing.value || isLoading.value) return;
  
  // Überprüfen, ob Dateien gezogen werden
  if (event.dataTransfer?.types.includes('Files')) {
    isDragging.value = true;
    
    // Accept-Drop-Effekt setzen
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }
}

function onDragLeave(event: DragEvent): void {
  // Nur bei tatsächlichem Verlassen des Elements
  if (
    event.relatedTarget === null || 
    !(event.currentTarget as Node).contains(event.relatedTarget as Node)
  ) {
    isDragging.value = false;
  }
}

function onDrop(event: DragEvent): void {
  if (isProcessing.value || isLoading.value) return;
  isDragging.value = false;
  
  if (!event.dataTransfer?.files.length) return;
  
  // Mehrere Dateien verarbeiten
  const files = Array.from(event.dataTransfer.files);
  processFiles(files);
}

// Datei ausgewählt
function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  // Mehrere Dateien verarbeiten
  const files = Array.from(input.files);
  processFiles(files);
  
  // Input zurücksetzen für erneute Auswahl der gleichen Datei
  input.value = '';
}

// Verarbeite mehrere Dateien
function processFiles(files: File[]): void {
  if (isProcessing.value || isLoading.value) return;
  isLoading.value = true;
  
  // Überprüfe, ob maximale Anzahl überschritten wird
  const remainingSlots = props.maxFiles - batchFiles.value.length;
  if (remainingSlots <= 0) {
    toast.error(t('documentConverter.batchUpload.tooManyFiles', `Maximale Anzahl von ${props.maxFiles} Dateien erreicht.`));
    isLoading.value = false;
    return;
  }
  
  // Anzahl der zu verarbeitenden Dateien beschränken
  const filesToProcess = files.slice(0, remainingSlots);
  
  // Jede Datei zum Batch hinzufügen und validieren
  const processPromises = filesToProcess.map(file => addFileToBatch(file));
  
  Promise.all(processPromises).then(() => {
    // Meldung, wenn Dateien ignoriert wurden
    if (files.length > remainingSlots) {
      const ignoredCount = files.length - remainingSlots;
      toast.warning(t('documentConverter.batchUpload.filesIgnored', 
        `${ignoredCount} ${ignoredCount === 1 ? 'Datei wurde' : 'Dateien wurden'} ignoriert, da das Maximum erreicht ist.`));
    }
    
    if (filesToProcess.length > 0) {
      setScreenReaderMessage(t('documentConverter.batchUpload.filesAdded', 
        `${filesToProcess.length} ${filesToProcess.length === 1 ? 'Datei' : 'Dateien'} zum Stapel hinzugefügt.`));
    }
    
    isLoading.value = false;
  });
}

// Datei zum Batch hinzufügen
async function addFileToBatch(file: File): Promise<void> {
  // Temporäre ID erzeugen
  const fileId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Datei zur Liste hinzufügen mit initialem pending-Status
  const batchFile: BatchFile = {
    id: fileId,
    file,
    validationStatus: 'pending',
    progress: 0,
    priority: batchPriority.value,
    addedAt: new Date()
  };
  
  batchFiles.value.push(batchFile);
  
  // Datei asynchron validieren
  await validateFile(fileId, file);
  
  // Prüfen, ob alle Dateien validiert wurden
  checkValidationComplete();
}

// Prüft, ob alle Dateien validiert wurden
function checkValidationComplete(): void {
  // Prüfen, ob noch Dateien in Validierung sind
  const stillValidating = batchFiles.value.some(file => 
    file.validationStatus === 'validating' || file.validationStatus === 'pending'
  );

  if (!stillValidating) {
    // Wenn alle Dateien validiert wurden, überprüfe Gesamtgröße
    if (isTotalSizeExceeded.value) {
      const errorMessage = t('documentConverter.batchUpload.totalSizeExceeded',
        `Die Gesamtgröße der ausgewählten Dateien (${totalSizeFormatted.value}) überschreitet das Maximum von ${maxTotalSizeFormatted.value}.`);

      toast.error(errorMessage);
    }
  }
}

// Datei validieren
async function validateFile(fileId: string, file: File): Promise<void> {
  // Status auf "wird validiert" setzen
  const fileIndex = batchFiles.value.findIndex(f => f.id === fileId);
  if (fileIndex === -1) return;

  batchFiles.value[fileIndex].validationStatus = 'validating';

  // Kleine Verzögerung für UI-Feedback
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Dateityp überprüfen
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidType = isFileTypeSupported(file);

    if (!isValidType) {
      const errorMessage = t('documentConverter.unsupportedFormat',
        `Nicht unterstütztes Dateiformat "${fileExtension}". Erlaubte Formate: ${props.allowedExtensions.join(', ')}`);

      setFileError(fileId, 'invalid', errorMessage);
      return;
    }

    // Dateigröße überprüfen
    if (file.size > props.maxFileSize) {
      const errorMessage = t('documentConverter.fileTooLarge',
        `Die Datei ist zu groß (${formatFileSize(file.size)}). Maximale Dateigröße: ${formatFileSize(props.maxFileSize)}`);

      setFileError(fileId, 'invalid', errorMessage);
      return;
    }

    // Erweiterte Validierung, wenn aktiviert
    if (props.enhancedValidation) {
      // Prüfe auf leere Dateien
      if (file.size === 0) {
        const errorMessage = t('documentConverter.emptyFile', 'Die Datei ist leer und kann nicht konvertiert werden.');
        setFileError(fileId, 'invalid', errorMessage);
        return;
      }

      // Zusätzliche Dateiformatvalidierung für bekannte Dateitypen
      if (file.type && !validateMimeTypeConsistency(file)) {
        const errorMessage = t('documentConverter.mimeTypeMismatch',
          'Die Dateiendung passt nicht zum Dateityp. Bitte überprüfen Sie die Datei.');
        setFileError(fileId, 'invalid', errorMessage);
        return;
      }
    }

    // Datei ist gültig
    const idx = batchFiles.value.findIndex(f => f.id === fileId);
    if (idx !== -1) {
      batchFiles.value[idx].validationStatus = 'valid';
    }

  } catch (error) {
    // Allgemeiner Fehler
    const errorMessage = t('documentConverter.validationError', 'Fehler bei der Validierung');
    setFileError(fileId, 'invalid', errorMessage);
  }
}

// Prüft, ob der MIME-Typ mit der Dateiendung konsistent ist
function validateMimeTypeConsistency(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Wenn kein MIME-Typ gesetzt ist, nicht weiter prüfen
  if (!file.type) return true;

  // Prüfen, ob der MIME-Typ zu einer der bekannten Erweiterungen passt
  for (const [mimeType, extensions] of Object.entries(mimeTypesMap)) {
    if (file.type === mimeType) {
      return extensions.includes(extension);
    }
  }

  // Bei unbekanntem MIME-Typ erlauben
  return true;
}

// Fehler für eine Datei setzen
function setFileError(fileId: string, status: 'invalid', message: string): void {
  const fileIndex = batchFiles.value.findIndex(f => f.id === fileId);
  if (fileIndex === -1) return;
  
  batchFiles.value[fileIndex].validationStatus = status;
  batchFiles.value[fileIndex].validationMessage = message;
}

// Datei aus dem Batch entfernen
function removeFile(index: number): void {
  if (isProcessing.value && batchFiles.value[index].status === 'uploading') {
    // Nicht während des Uploads entfernen
    toast.warning(t('documentConverter.batchUpload.cannotRemoveDuringUpload', 
      'Dateien können während des Uploads nicht entfernt werden.'));
    return;
  }
  
  if (index >= 0 && index < batchFiles.value.length) {
    const removedFile = batchFiles.value[index].file;
    batchFiles.value.splice(index, 1);
    
    setScreenReaderMessage(t('documentConverter.batchUpload.fileRemoved', 
      `Datei ${removedFile.name} aus dem Stapel entfernt.`));
  }
}

// Alle Dateien aus dem Batch entfernen
function clearBatch(): void {
  if (isProcessing.value) {
    toast.warning(t('documentConverter.batchUpload.cannotClearDuringProcessing',
      'Der Stapel kann während der Verarbeitung nicht geleert werden.'));
    return;
  }
  
  // Bestätigungsdialog anzeigen
  if (batchFiles.value.length > 0) {
    dialog.confirm({
      title: t('documentConverter.batchUpload.clearBatchConfirmTitle', 'Stapel leeren'),
      message: t('documentConverter.batchUpload.clearBatchConfirm', 
        'Möchten Sie wirklich alle Dateien aus dem Stapel entfernen?'),
      confirmButtonText: t('common.yes', 'Ja'),
      cancelButtonText: t('common.no', 'Nein'),
      onConfirm: () => {
        batchFiles.value = [];
        setScreenReaderMessage(t('documentConverter.batchUpload.batchCleared', 'Stapel wurde geleert.'));
      }
    });
  }
}

// Ungültige Dateien entfernen
function removeInvalidFiles(): void {
  if (isProcessing.value) return;
  
  const invalidCount = invalidFilesCount.value;
  if (invalidCount === 0) return;
  
  batchFiles.value = batchFiles.value.filter(file => file.validationStatus === 'valid');
  
  setScreenReaderMessage(t('documentConverter.batchUpload.invalidFilesRemoved',
    `${invalidCount} ungültige ${invalidCount === 1 ? 'Datei wurde' : 'Dateien wurden'} entfernt.`));
  
  toast.info(t('documentConverter.batchUpload.invalidFilesRemoved',
    `${invalidCount} ungültige ${invalidCount === 1 ? 'Datei wurde' : 'Dateien wurden'} entfernt.`));
}

// Priorität für alle Dateien setzen
function setPriorityForAll(priority: FilePriority): void {
  if (isProcessing.value) return;
  
  batchFiles.value.forEach(file => {
    if (file.validationStatus === 'valid') {
      file.priority = priority;
    }
  });
  
  setScreenReaderMessage(t('documentConverter.batchUpload.allPrioritySet',
    `Priorität für alle gültigen Dateien auf ${t(`documentConverter.batchUpload.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`, priority)} gesetzt.`));
}

// Einzelne Datei hochladen
async function uploadSingleFile(index: number): Promise<void> {
  if (isProcessing.value) return;
  
  const file = batchFiles.value[index];
  if (!file || file.validationStatus !== 'valid') {
    return;
  }
  
  emit('upload-single', file.file, file.priority);
  
  // Status aktualisieren
  batchFiles.value[index].status = 'uploading';
  
  try {
    isProcessing.value = true;
    uploadInProgress.value = true;
    
    // Upload starten und Fortschritt verfolgen
    await uploadFile(index);
    
    toast.success(t('documentConverter.batchUpload.singleFileUploaded',
      `Datei "${file.file.name}" erfolgreich hochgeladen.`));
    
    // Status aktualisieren
    batchFiles.value[index].status = 'uploaded';
    batchFiles.value[index].progress = 100;
    
    // Auto-Konvertierung, wenn aktiviert
    if (autoConvert.value) {
      convertUploadedFile(file.file);
    }
  } catch (error) {
    // Fehler setzen
    batchFiles.value[index].status = 'failed';
    batchFiles.value[index].error = error instanceof Error ? error.message : 
      t('documentConverter.batchUpload.uploadFailed', 'Upload fehlgeschlagen');
    
    toast.error(t('documentConverter.batchUpload.singleUploadFailed',
      `Upload von "${file.file.name}" fehlgeschlagen: ${batchFiles.value[index].error}`));
    
    // Prüfen, ob Upload wiederaufgenommen werden kann
    if (props.enableResume && isResumeSupported(file.file)) {
      batchFiles.value[index].canResume = true;
    }
  } finally {
    isProcessing.value = false;
    uploadInProgress.value = false;
  }
}

// Stapel-Upload starten
async function startBatchUpload(): Promise<void> {
  if (isProcessing.value || !canStartBatch.value) return;
  
  // Bestätigung bei großen Stapeln
  if (validFilesCount.value > 10) {
    dialog.confirm({
      title: t('documentConverter.batchUpload.largeBatchTitle', 'Großer Stapel'),
      message: t('documentConverter.batchUpload.largeBatchConfirm', 
        `Sie sind dabei, ${validFilesCount.value} Dateien hochzuladen. Möchten Sie fortfahren?`),
      confirmButtonText: t('common.yes', 'Ja'),
      cancelButtonText: t('common.no', 'Nein'),
      onConfirm: executeBatchUpload
    });
  } else {
    executeBatchUpload();
  }
}

// Stapel-Upload ausführen
async function executeBatchUpload(): Promise<void> {
  try {
    isProcessing.value = true;
    
    // Nur gültige Dateien hochladen
    const filesToUpload = batchFiles.value.filter(file => file.validationStatus === 'valid');
    totalFilesToProcess.value = filesToUpload.length;
    completedFilesCount.value = 0;
    batchProgress.value = 0;
    uploadStartTime.value = new Date();
    
    // Dateien nach Priorität sortieren
    const sortedFiles = [...filesToUpload].sort((a, b) => {
      const priorityMap = { high: 0, normal: 1, low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
    
    // Prioritäten für Event extrahieren
    const priorities: Record<string, FilePriority> = {};
    sortedFiles.forEach(file => {
      priorities[file.id] = file.priority;
    });
    
    // Event auslösen
    emit('start-batch', sortedFiles.map(f => f.file), priorities);
    
    // Stapel-Status initialisieren
    sortedFiles.forEach(file => {
      const index = batchFiles.value.findIndex(f => f.id === file.id);
      if (index !== -1) {
        batchFiles.value[index].status = 'queued';
      }
    });
    
    // Dateien sequentiell hochladen
    const results = [];
    for (let i = 0; i < sortedFiles.length; i++) {
      if (!isProcessing.value) break; // Überprüfen, ob abgebrochen wurde
      
      const fileIndex = batchFiles.value.findIndex(f => f.id === sortedFiles[i].id);
      if (fileIndex === -1) continue;
      
      currentFileIndex.value = fileIndex;
      currentFileName.value = batchFiles.value[fileIndex].file.name;
      batchFiles.value[fileIndex].status = 'uploading';
      
      // Nachricht für Screenreader
      setScreenReaderMessage(t('documentConverter.batchUpload.uploadingFile',
        `Lade Datei ${i + 1} von ${sortedFiles.length} hoch: ${currentFileName.value}`));
      
      try {
        // Datei hochladen und auf Abschluss warten
        const result = await uploadFile(fileIndex);
        results.push(result);
        
        // Status aktualisieren
        batchFiles.value[fileIndex].status = 'uploaded';
        batchFiles.value[fileIndex].progress = 100;
        completedFilesCount.value++;
        
        // Batch-Fortschritt aktualisieren
        batchProgress.value = Math.round((completedFilesCount.value / totalFilesToProcess.value) * 100);
        
        // Verbleibende Zeit schätzen
        updateEstimatedTime();
        
      } catch (error) {
        // Fehler setzen
        batchFiles.value[fileIndex].status = 'failed';
        batchFiles.value[fileIndex].error = error instanceof Error ? error.message : 
          t('documentConverter.batchUpload.uploadFailed', 'Upload fehlgeschlagen');
        
        // Prüfen, ob Upload wiederaufgenommen werden kann
        if (props.enableResume && isResumeSupported(batchFiles.value[fileIndex].file)) {
          batchFiles.value[fileIndex].canResume = true;
        }
        
        // Zum nächsten fortfahren, Fehler nicht werfen
        completedFilesCount.value++;
        batchProgress.value = Math.round((completedFilesCount.value / totalFilesToProcess.value) * 100);
      }
    }
    
    // Batch abgeschlossen
    if (isProcessing.value) { // Nur wenn nicht abgebrochen
      emit('batch-completed', results);
      
      // Auto-Konvertierung, wenn aktiviert
      if (autoConvert.value && results.length > 0) {
        // Konvertierungen starten
        convertBatch(results);
      }
      
      toast.success(t('documentConverter.batchUpload.batchCompleted',
        `Stapel-Upload abgeschlossen: ${completedFilesCount.value} von ${totalFilesToProcess.value} Dateien verarbeitet.`));
      
      setScreenReaderMessage(t('documentConverter.batchUpload.batchCompleted',
        `Stapel-Upload abgeschlossen: ${completedFilesCount.value} von ${totalFilesToProcess.value} Dateien verarbeitet.`));
    }
  } catch (error) {
    toast.error(t('documentConverter.batchUpload.batchFailed',
      `Stapel-Upload fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`));
    
    setScreenReaderMessage(t('documentConverter.batchUpload.batchFailed',
      `Stapel-Upload fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`));
  } finally {
    isProcessing.value = false;
    currentFileIndex.value = -1;
    currentFileName.value = '';
  }
}

// Upload einer einzelnen Datei
async function uploadFile(fileIndex: number): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const file = batchFiles.value[fileIndex];
    
    // Upload mit Fortschrittsanzeige
    documentConverterStore.uploadDocument(file.file)
      .then(documentId => {
        if (documentId) {
          resolve({ documentId, fileName: file.file.name });
        } else {
          reject(new Error(t('documentConverter.batchUpload.uploadFailed', 'Upload fehlgeschlagen')));
        }
      })
      .catch(error => {
        reject(error);
      });
    
    // Fortschritt beobachten
    const progressInterval = setInterval(() => {
      if (!isProcessing.value || batchFiles.value[fileIndex].status !== 'uploading') {
        clearInterval(progressInterval);
        return;
      }
      
      // Fortschritt aus dem Store auslesen
      const uploadProgress = documentConverterStore.uploadProgress;
      batchFiles.value[fileIndex].progress = uploadProgress;
    }, 100);
  });
}

// Stapel-Upload abbrechen
function cancelBatchUpload(): void {
  if (!isProcessing.value) return;
  
  dialog.confirm({
    title: t('documentConverter.batchUpload.cancelUploadTitle', 'Upload abbrechen'),
    message: t('documentConverter.batchUpload.cancelUploadConfirm', 'Möchten Sie den laufenden Stapel-Upload wirklich abbrechen?'),
    confirmButtonText: t('common.yes', 'Ja'),
    cancelButtonText: t('common.no', 'Nein'),
    onConfirm: () => {
      // Status zurücksetzen
      isProcessing.value = false;
      
      // Laufende Uploads auf "failed" setzen
      batchFiles.value.forEach(file => {
        if (file.status === 'uploading' || file.status === 'queued') {
          file.status = 'canceled';
          file.progress = 0;
          
          // Prüfen, ob Upload wiederaufgenommen werden kann
          if (props.enableResume && isResumeSupported(file.file)) {
            file.canResume = true;
          }
        }
      });
      
      // Event auslösen
      emit('batch-canceled');
      
      toast.info(t('documentConverter.batchUpload.uploadCanceled', 'Stapel-Upload wurde abgebrochen.'));
      setScreenReaderMessage(t('documentConverter.batchUpload.uploadCanceled', 'Stapel-Upload wurde abgebrochen.'));
    }
  });
}

// Upload wiederherstellen
function resumeUpload(index: number): void {
  if (isProcessing.value) return;
  
  const file = batchFiles.value[index];
  if (!file.canResume) return;
  
  // Status zurücksetzen
  file.error = undefined;
  file.status = undefined;
  file.canResume = false;
  
  // Datei erneut validieren und dann hochladen
  validateFile(file.id, file.file).then(() => {
    if (file.validationStatus === 'valid') {
      // Bei Einzeldatei direkt hochladen
      uploadSingleFile(index);
    }
  });
}

// Prüft, ob ein Upload wiederaufgenommen werden kann
function isResumeSupported(file: File): boolean {
  // Implementierung je nach API und Unterstützung
  // Hier nur eine Beispiel-Implementation
  return file.size > 10 * 1024 * 1024; // Nur für Dateien > 10MB
}

// Geschätzte Restzeit aktualisieren
function updateEstimatedTime(): void {
  if (!uploadStartTime.value || completedFilesCount.value === 0) {
    estimatedTimeRemaining.value = 0;
    return;
  }
  
  const elapsedMs = new Date().getTime() - uploadStartTime.value.getTime();
  const msPerFile = elapsedMs / completedFilesCount.value;
  const remainingFiles = totalFilesToProcess.value - completedFilesCount.value;
  const remainingMs = msPerFile * remainingFiles;
  
  estimatedTimeRemaining.value = Math.max(0, Math.round(remainingMs / 1000));
}

// Restzeit formatieren
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '-';
  
  if (seconds < 60) {
    return `${seconds} ${t('documentConverter.batchUpload.seconds', 'Sekunden')}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} ${t('documentConverter.batchUpload.minutes', 'Minuten')} ${remainingSeconds} ${t('documentConverter.batchUpload.seconds', 'Sekunden')}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ${t('documentConverter.batchUpload.hours', 'Stunden')} ${minutes} ${t('documentConverter.batchUpload.minutes', 'Minuten')}`;
  }
}

// Hochgeladenen Batch konvertieren
function convertBatch(results: any[]): void {
  // Implementierung der Batch-Konvertierung
  // Diese Funktion würde den Document-Converter-Store verwenden
  // Hier nur als Beispiel
  toast.info(t('documentConverter.batchUpload.startingConversion', 'Starte Konvertierung des Stapels...'));
}

// Einzelne Datei konvertieren
function convertUploadedFile(file: File): void {
  // Implementierung der Einzeldatei-Konvertierung
  // Diese Funktion würde den Document-Converter-Store verwenden
  // Hier nur als Beispiel
  toast.info(t('documentConverter.batchUpload.startingFileConversion', `Starte Konvertierung von "${file.name}"...`));
}

// Dateityp überprüfen
function isFileTypeSupported(file: File): boolean {
  // MIME-Typ prüfen
  for (const [mimeType, extensions] of Object.entries(mimeTypesMap)) {
    if (file.type === mimeType) {
      // Prüfen, ob eine der zugehörigen Erweiterungen erlaubt ist
      if (extensions.some(ext => props.allowedExtensions.includes(ext))) {
        return true;
      }
    }
  }
  
  // Dateierweiterung prüfen als Fallback
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  return props.allowedExtensions.includes(fileExtension);
}

// Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Dateitypbezeichnung ermitteln
function getFileType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  const fileTypes: Record<string, string> = {
    'pdf': 'PDF-Dokument',
    'docx': 'Word-Dokument',
    'doc': 'Word-Dokument',
    'xlsx': 'Excel-Tabelle',
    'xls': 'Excel-Tabelle',
    'pptx': 'PowerPoint-Präsentation',
    'ppt': 'PowerPoint-Präsentation',
    'html': 'HTML-Dokument',
    'htm': 'HTML-Dokument',
    'txt': 'Textdatei'
  };
  
  return fileTypes[extension] || extension.toUpperCase();
}

// Icon für Dateityp ermitteln
function getFileIcon(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
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
}

// Touch gesture handlers for mobile
function handleSwipeLeft(fileId: string, index: number): void {
  // Left swipe to show upload action (if valid)
  const file = batchFiles.value[index];

  // Reset any previous swiping state
  fileSwiping.value = null;
  touchActionButtons.value.clear();

  if (file.validationStatus === 'valid' && !isProcessing.value && !file.status) {
    fileSwiping.value = fileId;
    touchActionButtons.value.set(fileId, true);

    // Add upload action button
    setScreenReaderMessage(t('documentConverter.batchUpload.swipeLeftForUpload',
      'Nach links gewischt für Upload-Option von Datei: ' + file.file.name));

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (fileSwiping.value === fileId) {
        fileSwiping.value = null;
        touchActionButtons.value.delete(fileId);
      }
    }, 3000);
  }
}

function handleSwipeRight(fileId: string, index: number): void {
  // Right swipe to show delete action
  if (isProcessing.value && batchFiles.value[index].status === 'uploading') {
    return; // Don't allow during active upload
  }

  // Reset any previous swiping state
  fileSwiping.value = null;
  touchActionButtons.value.clear();

  fileSwiping.value = fileId;
  touchActionButtons.value.set(fileId, false); // false indicates delete action

  setScreenReaderMessage(t('documentConverter.batchUpload.swipeRightForDelete',
    'Nach rechts gewischt für Lösch-Option von Datei: ' + batchFiles.value[index].file.name));

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (fileSwiping.value === fileId) {
      fileSwiping.value = null;
      touchActionButtons.value.delete(fileId);
    }
  }, 3000);
}

function handleFileTap(fileId: string, index: number): void {
  // Clear any active swipe actions when tapping on a file
  if (fileSwiping.value) {
    fileSwiping.value = null;
    touchActionButtons.value.clear();
  }
}

// Screen Reader Meldung setzen
function setScreenReaderMessage(message: string): void {
  screenReaderMessage.value = message;
  // Nach kurzer Zeit zurücksetzen
  setTimeout(() => {
    screenReaderMessage.value = '';
  }, 5000);
}

// Store-Zustand im LocalStorage speichern
function saveResumeState(): void {
  if (!props.enableResume) return;
  
  // Speichere nur unvollständige Uploads
  const incompleteUploads = batchFiles.value.filter(file => 
    file.status === 'failed' || file.status === 'canceled' && file.canResume
  );
  
  if (incompleteUploads.length > 0) {
    try {
      const resumeData = incompleteUploads.map(file => ({
        id: file.id,
        name: file.file.name,
        size: file.file.size,
        type: file.file.type,
        lastModified: file.file.lastModified,
        progress: file.progress,
        uploadToken: file.uploadToken,
        uploadedBytes: file.uploadedBytes,
        priority: file.priority,
        timestamp: new Date().toISOString()
      }));
      
      localStorage.setItem('batch-upload-resume', JSON.stringify(resumeData));
    } catch (error) {
      console.error('Fehler beim Speichern der Resume-Daten:', error);
    }
  } else {
    // Keine unvollständigen Uploads, Resume-Daten löschen
    localStorage.removeItem('batch-upload-resume');
  }
}

// Versuchen, gespeicherte Resume-Daten zu laden
function loadResumeState(): void {
  if (!props.enableResume) return;
  
  try {
    const resumeData = localStorage.getItem('batch-upload-resume');
    if (resumeData) {
      const parsedData = JSON.parse(resumeData);
      
      // Prüfen, ob die Daten aktuell sind (nicht älter als 24 Stunden)
      const now = new Date();
      const validResumeData = parsedData.filter((item: any) => {
        const timestamp = new Date(item.timestamp);
        const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
        return hoursDiff < 24;
      });
      
      if (validResumeData.length > 0) {
        toast.info(t('documentConverter.batchUpload.resumeDataFound', 
          `${validResumeData.length} unterbrochene Uploads gefunden. Sie können diese Uploads fortsetzen.`));
        
        // Hier könnten wir die Uploads wiederherstellen
        // In der echten Implementierung müssten wir die Dateien aus dem FileSystem API oder
        // einer anderen Quelle wiederherstellen
      }
    }
  } catch (error) {
    console.error('Fehler beim Laden der Resume-Daten:', error);
  }
}

// Initialisierung und Cleanup
onMounted(() => {
  // Resume-Daten laden
  loadResumeState();
});

onUnmounted(() => {
  // Resume-Daten speichern
  saveResumeState();
});
</script>

<style scoped>
.batch-upload {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.batch-upload__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.batch-upload__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #2d3748;
}

.batch-upload__description {
  color: #4a5568;
  font-size: 0.875rem;
}

.batch-upload__dropzone {
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  padding: 2rem;
  background-color: #f7fafc;
  transition: all 0.3s ease;
  cursor: pointer;
  outline: none;
}

.batch-upload__dropzone:focus {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.3);
}

.batch-upload__dropzone--dragging {
  border-color: #4a6cf7;
  background-color: #ebf4ff;
}

.batch-upload__dropzone--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.batch-upload__dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.batch-upload__icon {
  font-size: 2.5rem;
  color: #4a5568;
}

.batch-upload__text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.batch-upload__prompt {
  margin: 0;
  font-size: 1rem;
  color: #2d3748;
}

.batch-upload__browse {
  color: #4a6cf7;
  text-decoration: underline;
  cursor: pointer;
}

.batch-upload__hint {
  font-size: 0.75rem;
  color: #718096;
  margin: 0;
}

.batch-upload__input {
  display: none;
}

.batch-upload__overview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.batch-upload__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  background-color: #f7fafc;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.batch-upload__stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.batch-upload__stat-label {
  font-size: 0.75rem;
  color: #718096;
}

.batch-upload__stat-value {
  font-weight: 600;
  font-size: 0.875rem;
  color: #2d3748;
}

.batch-upload__stat-value--success {
  color: #38a169;
}

.batch-upload__stat-value--error {
  color: #e53e3e;
}

.batch-upload__settings {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.batch-upload__priority {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.batch-upload__label {
  font-size: 0.875rem;
  color: #4a5568;
}

.batch-upload__select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #2d3748;
  background-color: #fff;
}

.batch-upload__option {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.batch-upload__checkbox-label {
  font-size: 0.875rem;
  color: #4a5568;
}

.batch-upload__error-message {
  background-color: #fff5f5;
  color: #e53e3e;
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #e53e3e;
  font-size: 0.875rem;
}

.batch-upload__file-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.batch-upload__subheading {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  color: #2d3748;
}

.batch-upload__files {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.batch-upload__file-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative; /* For positioning touch action overlay */
  overflow: hidden; /* For swipe animation */
  transition: transform 0.3s ease; /* For swipe animations */
}

.batch-upload__file-item--invalid {
  border-color: #fc8181;
  background-color: #fff5f5;
}

.batch-upload__file-item--uploading {
  border-color: #4a6cf7;
  background-color: #ebf8ff;
}

.batch-upload__file-item--uploaded {
  border-color: #68d391;
  background-color: #f0fff4;
}

.batch-upload__file-item--error {
  border-color: #fc8181;
  background-color: #fff5f5;
}

.batch-upload__file-item--swiping {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Touch Action Overlay */
.batch-upload__touch-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  z-index: 10;
  border-radius: 6px;
  animation: fadeIn 0.2s ease;
}

.batch-upload__touch-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: none;
  min-width: 120px;
  min-height: 100px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 500;
}

.batch-upload__touch-btn i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.batch-upload__touch-upload-btn {
  background-color: #4a6cf7;
  color: white;
}

.batch-upload__touch-upload-btn:active {
  background-color: #3a5be7;
  transform: scale(0.95);
}

.batch-upload__touch-remove-btn {
  background-color: #e53e3e;
  color: white;
}

.batch-upload__touch-remove-btn:active {
  background-color: #c53030;
  transform: scale(0.95);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.batch-upload__file-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.batch-upload__file-icon {
  font-size: 1.5rem;
  color: #4a5568;
  width: 2rem;
  text-align: center;
  flex-shrink: 0;
}

.batch-upload__file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.batch-upload__file-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: #2d3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-upload__file-meta {
  font-size: 0.75rem;
  color: #718096;
}

.batch-upload__file-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.batch-upload__file-priority-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #2d3748;
  background-color: #fff;
}

.batch-upload__action-btn,
.batch-upload__remove-btn {
  background: transparent;
  border: none;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-upload__action-btn {
  color: #4a6cf7;
}

.batch-upload__action-btn:hover:not(:disabled) {
  background-color: #ebf4ff;
}

.batch-upload__remove-btn {
  color: #e53e3e;
}

.batch-upload__remove-btn:hover:not(:disabled) {
  background-color: #fff5f5;
}

.batch-upload__file-progress {
  margin-top: 0.5rem;
}

.batch-upload__progress {
  height: 0.5rem;
  background-color: #edf2f7;
  border-radius: 0.25rem;
  overflow: hidden;
  position: relative;
}

.batch-upload__progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  transition: width 0.3s ease;
}

.batch-upload__progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  color: #2d3748;
  font-weight: 500;
}

.batch-upload__validating,
.batch-upload__invalid,
.batch-upload__error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.batch-upload__validating {
  background-color: #ebf8ff;
  color: #4299e1;
}

.batch-upload__invalid,
.batch-upload__error {
  background-color: #fff5f5;
  color: #e53e3e;
}

.batch-upload__resume {
  display: flex;
  justify-content: flex-end;
}

.batch-upload__resume-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #4a6cf7;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-upload__resume-btn:hover:not(:disabled) {
  background-color: #bee3f8;
}

.batch-upload__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.batch-upload__start-btn,
.batch-upload__clear-btn,
.batch-upload__cancel-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-upload__start-btn {
  background-color: #4a6cf7;
  color: #fff;
  border: none;
  flex: 1;
}

.batch-upload__start-btn:hover:not(:disabled) {
  background-color: #3a5be7;
}

.batch-upload__start-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.batch-upload__clear-btn {
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.batch-upload__clear-btn:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.batch-upload__cancel-btn {
  background-color: #fed7d7;
  color: #e53e3e;
  border: 1px solid #feb2b2;
}

.batch-upload__cancel-btn:hover:not(:disabled) {
  background-color: #feb2b2;
}

.batch-upload__batch-progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.batch-upload__batch-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.batch-upload__batch-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 140px;
}

.batch-upload__batch-label {
  font-size: 0.75rem;
  color: #718096;
}

.batch-upload__batch-value {
  font-weight: 500;
  font-size: 0.875rem;
  color: #2d3748;
}

.batch-upload__total-progress {
  height: 0.75rem;
  background-color: #edf2f7;
  border-radius: 0.375rem;
  overflow: hidden;
  position: relative;
  margin-top: 0.5rem;
}

.batch-upload__total-progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  transition: width 0.3s ease;
}

.batch-upload__total-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  color: #2d3748;
  font-weight: 500;
}

.batch-upload__loading {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.batch-upload__loader {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4a6cf7;
  font-size: 0.875rem;
}

.batch-upload__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background-color: #f7fafc;
  border-radius: 6px;
  border: 1px dashed #cbd5e0;
  color: #718096;
}

.batch-upload__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.batch-upload__quick-action {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-upload__quick-action:hover {
  background-color: #edf2f7;
}

/* Screenreader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .batch-upload__settings {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .batch-upload__priority {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .batch-upload__label {
    min-width: 120px;
  }

  .batch-upload__select {
    flex: 1;
    height: 44px; /* Touch-friendly height */
    font-size: 1rem; /* Larger text for better readability */
  }

  .batch-upload__file-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .batch-upload__file-actions {
    align-self: flex-end;
    margin-top: -2.5rem;
  }

  .batch-upload__action-btn,
  .batch-upload__remove-btn {
    width: 44px;  /* Touch-friendly target size */
    height: 44px; /* Touch-friendly target size */
    font-size: 1.25rem; /* Larger icons */
  }

  .batch-upload__file-priority-select {
    height: 36px; /* Touch-friendly height */
    min-width: 100px; /* Wider for better touch target */
    font-size: 0.875rem;
  }

  .batch-upload__actions {
    flex-direction: column;
    gap: 1rem;
  }

  .batch-upload__start-btn,
  .batch-upload__clear-btn,
  .batch-upload__cancel-btn {
    padding: 0.875rem 1.5rem; /* Taller buttons */
    font-size: 1rem; /* Larger text */
    width: 100%; /* Full width */
    justify-content: center;
  }

  .batch-upload__batch-stats {
    flex-direction: column;
    gap: 0.75rem;
  }

  .batch-upload__option {
    margin-top: 0.5rem;
  }

  .batch-upload__checkbox {
    width: 22px; /* Larger checkbox */
    height: 22px; /* Larger checkbox */
  }

  .batch-upload__checkbox-label {
    font-size: 1rem; /* Larger text */
    padding: 8px 0; /* Creates larger touch target */
  }

  .batch-upload__quick-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .batch-upload__quick-action {
    padding: 0.5rem 0.75rem; /* Larger buttons */
    font-size: 0.875rem; /* Larger text */
    flex: 1 0 auto;
    min-width: 130px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .batch-upload {
    padding: 1rem;
  }

  .batch-upload__dropzone {
    padding: 2rem 1rem; /* More vertical space for touch */
    min-height: 150px; /* Ensures adequate touch target size */
  }

  .batch-upload__icon {
    font-size: 2.5rem; /* Larger icon */
  }

  .batch-upload__prompt {
    font-size: 1rem; /* Larger text */
    padding: 0.5rem 0; /* More vertical padding */
  }

  .batch-upload__browse {
    padding: 0.25rem 0; /* Creates better touch target */
    display: inline-block;
  }

  .batch-upload__stats {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  .batch-upload__stat-item {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0; /* More vertical padding */
  }

  .batch-upload__stat-label,
  .batch-upload__stat-value {
    font-size: 1rem; /* Larger text */
  }

  /* Improve file items display for small screens */
  .batch-upload__file-item {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .batch-upload__file-name {
    font-size: 1rem; /* Larger text */
    padding: 0.25rem 0; /* Better touch target */
  }

  .batch-upload__file-meta {
    font-size: 0.875rem; /* Slightly larger text */
  }

  /* Optimize scrollable list for touch */
  .batch-upload__files {
    max-height: 350px;
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    scrollbar-width: thin; /* Modern browsers */
  }

  /* Make validation messages more prominent */
  .batch-upload__validating,
  .batch-upload__invalid,
  .batch-upload__error {
    font-size: 0.875rem; /* Larger text */
    padding: 0.75rem; /* More padding */
  }

  /* Resume button optimization */
  .batch-upload__resume-btn {
    padding: 0.5rem 1rem; /* Larger button */
    font-size: 0.875rem; /* Larger text */
    width: 100%; /* Full width */
    justify-content: center;
    margin-top: 0.5rem;
  }
}
</style>