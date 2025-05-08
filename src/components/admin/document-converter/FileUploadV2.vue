<template>
  <div 
    class="file-upload"
    :class="{ 
      'file-upload--dragging': isDragging, 
      'file-upload--disabled': isUploading 
    }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @click="triggerFileInput"
    @keydown.space.prevent="triggerFileInput"
    @keydown.enter.prevent="triggerFileInput"
    tabindex="0"
    role="button"
    :aria-disabled="isUploading"
    :aria-label="t('documentConverter.uploadFiles', 'Dateien hochladen')"
  >
    <div class="file-upload__content">
      <div class="file-upload__icon" aria-hidden="true">
        <i class="fa fa-cloud-upload-alt"></i>
      </div>
      
      <div class="file-upload__text">
        <p v-if="!isUploading">
          {{ t('documentConverter.dropFiles', 'Dateien hier ablegen oder') }} 
          <span class="file-upload__browse">
            {{ t('documentConverter.browse', 'auswählen') }}
          </span>
        </p>
        <p v-else>
          {{ t('documentConverter.uploading', 'Dateien werden hochgeladen...') }}
        </p>
        <p class="file-upload__hint">
          {{ t('documentConverter.supportedFormats', 'Unterstützte Formate:') }} 
          {{ allowedExtensions.map(ext => ext.toUpperCase()).join(', ') }}
        </p>
      </div>
      
      <input 
        type="file"
        ref="fileInput"
        @change="onFileSelected"
        :accept="allowedExtensions.map(ext => '.' + ext).join(',')"
        class="file-upload__input"
        :disabled="isUploading"
        multiple
        :aria-label="t('documentConverter.selectFiles', 'Dateien auswählen')"
      >
    </div>

    <!-- Fortschrittsanzeige -->
    <div v-if="isUploading" class="file-upload__progress" role="progressbar"
      :aria-valuenow="uploadProgress" aria-valuemin="0" aria-valuemax="100">
      <div class="file-upload__progress-bar" :style="{ width: `${uploadProgress}%` }"></div>
      <div class="file-upload__progress-text">
        {{ uploadProgress }}% {{ t('documentConverter.complete', 'abgeschlossen') }}
      </div>
    </div>

    <!-- Ausgewählte Dateien -->
    <transition-group name="file-list" tag="div" class="file-upload__selected-files">
      <div v-for="(file, index) in selectedFiles" :key="file.id" class="file-upload__selected">
        <div class="file-upload__selected-file">
          <div class="file-upload__file-icon" aria-hidden="true">
            <i :class="getFileIcon(file.file)"></i>
          </div>
          <div class="file-upload__file-info">
            <span class="file-upload__selected-name">{{ file.file.name }}</span>
            <span class="file-upload__selected-size">
              ({{ formatFileSize(file.file.size) }} - {{ getFileType(file.file) }})
            </span>
            <div v-if="file.error" class="file-upload__file-error">
              {{ file.error }}
            </div>
          </div>
          <button 
            class="file-upload__remove-btn" 
            @click.stop="removeFile(index)"
            :aria-label="t('documentConverter.removeFile', 'Datei entfernen')"
            :disabled="isUploading"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="file.validationStatus === 'validating'" class="file-upload__validating">
          {{ t('documentConverter.validating', 'Datei wird überprüft...') }}
        </div>
        <div v-else-if="file.validationStatus === 'invalid'" class="file-upload__invalid">
          {{ file.validationMessage }}
        </div>
      </div>
    </transition-group>

    <!-- Aktions-Buttons -->
    <div v-if="selectedFiles.length > 0 && !isUploading" class="file-upload__actions">
      <button 
        @click.stop="uploadSelectedFiles" 
        class="file-upload__upload-btn"
        :disabled="!hasValidFiles || isUploading"
        aria-live="polite"
      >
        {{ t('documentConverter.convert', 'Konvertieren') }} 
        <span v-if="validFilesCount > 0">({{ validFilesCount }} {{ validFilesCount === 1 ? 'Datei' : 'Dateien' }})</span>
      </button>
      <button 
        @click.stop="clearAllFiles" 
        class="file-upload__clear-btn"
        :disabled="isUploading"
      >
        {{ t('common.cancel', 'Abbrechen') }}
      </button>
    </div>

    <!-- Fehlermeldungen für Screenreader -->
    <div class="sr-only" aria-live="assertive">
      {{ screenReaderMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useGlobalDialog } from '@/composables/useDialog';
import { useI18n } from '@/composables/useI18n';

// Dialog-Service für Fehlermeldungen
const dialog = useGlobalDialog();
const { t } = useI18n();

// Typdefinitionen
interface FileUploadProps {
  /** Flag, ob gerade ein Upload im Gange ist */
  isUploading?: boolean;
  
  /** Fortschritt des aktuellen Uploads (0-100) */
  uploadProgress?: number;
  
  /** Maximale Dateigröße in Bytes */
  maxFileSize?: number;
  
  /** Liste der erlaubten Dateierweiterungen */
  allowedExtensions?: string[];
  
  /** Maximale Anzahl an Dateien, die gleichzeitig hochgeladen werden können */
  maxFiles?: number;
}

interface SelectedFile {
  /** Eindeutige ID für die Datei */
  id: string;
  
  /** Die eigentliche File-Instanz */
  file: File;
  
  /** Validierungsstatus (pending, validating, valid, invalid) */
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid';
  
  /** Validierungsnachricht bei Fehler */
  validationMessage?: string;
  
  /** Allgemeiner Fehler */
  error?: string;
}

// Interface-Definition für emittierte Events
interface FileUploadEmits {
  (e: 'upload', files: File[]): void;
  (e: 'cancel'): void;
  (e: 'fileAdded', file: File): void;
  (e: 'fileRemoved', file: File): void;
  (e: 'validationError', error: string, file: File): void;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<FileUploadProps>(), {
  isUploading: false,
  uploadProgress: 0,
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt'],
  maxFiles: 10
});

// Event-Emitter definieren
const emit = defineEmits<FileUploadEmits>();

// Reaktiver Zustand
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<SelectedFile[]>([]);
const isDragging = ref<boolean>(false);
const screenReaderMessage = ref<string>('');

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
const hasValidFiles = computed<boolean>(() => {
  return selectedFiles.value.some(file => file.validationStatus === 'valid');
});

const validFilesCount = computed<number>(() => {
  return selectedFiles.value.filter(file => file.validationStatus === 'valid').length;
});

// Datei-Auswahl Dialog öffnen
function triggerFileInput(event: Event): void {
  // Stoppe Ereignispropagierung, wenn auf bestimmte Elemente geklickt wurde
  if (
    event.target instanceof HTMLButtonElement || 
    event.target instanceof HTMLInputElement ||
    (event.target as HTMLElement).closest('.file-upload__selected') ||
    (event.target as HTMLElement).closest('.file-upload__actions')
  ) {
    return;
  }
  
  if (props.isUploading) return;
  
  if (fileInput.value) {
    fileInput.value.click();
  }
}

// Drag & Drop Handlers
function onDragOver(event: DragEvent): void {
  if (props.isUploading) return;
  
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
  if (props.isUploading) return;
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
  // Überprüfe, ob maximale Anzahl überschritten wird
  const remainingSlots = props.maxFiles - selectedFiles.value.length;
  if (remainingSlots <= 0) {
    showError(t('documentConverter.tooManyFiles', `Maximale Anzahl von ${props.maxFiles} Dateien erreicht.`));
    return;
  }
  
  // Anzahl der zu verarbeitenden Dateien beschränken
  const filesToProcess = files.slice(0, remainingSlots);
  
  // Jede Datei verarbeiten
  filesToProcess.forEach(file => {
    addFile(file);
  });
  
  // Meldung, wenn Dateien ignoriert wurden
  if (files.length > remainingSlots) {
    const ignoredCount = files.length - remainingSlots;
    showError(t('documentConverter.filesIgnored', 
      `${ignoredCount} ${ignoredCount === 1 ? 'Datei wurde' : 'Dateien wurden'} ignoriert, da das Maximum erreicht ist.`));
  }
}

// Datei zum Array hinzufügen
function addFile(file: File): void {
  // Temporäre ID erzeugen
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Datei zur Liste hinzufügen mit initialem pending-Status
  selectedFiles.value.push({
    id: fileId,
    file,
    validationStatus: 'pending'
  });
  
  // Event auslösen
  emit('fileAdded', file);
  
  // Screen Reader Meldung
  setScreenReaderMessage(t('documentConverter.fileAdded', `Datei ${file.name} hinzugefügt.`));
  
  // Datei asynchron validieren
  validateFile(fileId, file);
}

// Datei validieren
async function validateFile(fileId: string, file: File): Promise<void> {
  // Status auf "wird validiert" setzen
  const fileIndex = selectedFiles.value.findIndex(f => f.id === fileId);
  if (fileIndex === -1) return;
  
  selectedFiles.value[fileIndex].validationStatus = 'validating';
  
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
      emit('validationError', errorMessage, file);
      return;
    }
    
    // Dateigröße überprüfen
    if (file.size > props.maxFileSize) {
      const errorMessage = t('documentConverter.fileTooLarge', 
        `Die Datei ist zu groß (${formatFileSize(file.size)}). Maximale Dateigröße: ${formatFileSize(props.maxFileSize)}`);
      
      setFileError(fileId, 'invalid', errorMessage);
      emit('validationError', errorMessage, file);
      return;
    }
    
    // Datei ist gültig
    const fileIndex = selectedFiles.value.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      selectedFiles.value[fileIndex].validationStatus = 'valid';
    }
    
  } catch (error) {
    // Allgemeiner Fehler
    const errorMessage = t('documentConverter.validationError', 'Fehler bei der Validierung');
    setFileError(fileId, 'invalid', errorMessage);
    emit('validationError', errorMessage, file);
  }
}

// Fehler für eine Datei setzen
function setFileError(fileId: string, status: 'invalid', message: string): void {
  const fileIndex = selectedFiles.value.findIndex(f => f.id === fileId);
  if (fileIndex === -1) return;
  
  selectedFiles.value[fileIndex].validationStatus = status;
  selectedFiles.value[fileIndex].validationMessage = message;
}

// Datei aus der Liste entfernen
function removeFile(index: number): void {
  if (props.isUploading) return;
  
  if (index >= 0 && index < selectedFiles.value.length) {
    const removedFile = selectedFiles.value[index].file;
    selectedFiles.value.splice(index, 1);
    emit('fileRemoved', removedFile);
    
    // Screen Reader Meldung
    setScreenReaderMessage(t('documentConverter.fileRemoved', `Datei ${removedFile.name} entfernt.`));
  }
}

// Alle Dateien entfernen
function clearAllFiles(): void {
  if (props.isUploading) return;
  
  selectedFiles.value = [];
  emit('cancel');
  
  // Screen Reader Meldung
  setScreenReaderMessage(t('documentConverter.filesCleared', 'Alle Dateien entfernt.'));
}

// Ausgewählte Dateien hochladen
function uploadSelectedFiles(): void {
  // Nur gültige Dateien hochladen
  const validFiles = selectedFiles.value
    .filter(item => item.validationStatus === 'valid')
    .map(item => item.file);
  
  if (validFiles.length === 0) {
    showError(t('documentConverter.noValidFiles', 'Keine gültigen Dateien zum Hochladen vorhanden.'));
    return;
  }
  
  emit('upload', validFiles);
}

// Fehlermeldung anzeigen
function showError(message: string): void {
  dialog.error({
    title: t('documentConverter.error', 'Fehler'),
    message: message
  });
  
  // Screen Reader Meldung
  setScreenReaderMessage(message);
}

// Screen Reader Meldung setzen
function setScreenReaderMessage(message: string): void {
  screenReaderMessage.value = message;
  // Nach kurzer Zeit zurücksetzen
  setTimeout(() => {
    screenReaderMessage.value = '';
  }, 5000);
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
</script>

<style scoped>
.file-upload {
  border: 2px dashed #ced4da;
  border-radius: 8px;
  padding: 2rem;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  position: relative;
  cursor: pointer;
  outline: none;
}

.file-upload:focus {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.3);
}

.file-upload--dragging {
  background-color: #e7f5ff;
  border-color: #4a6cf7;
}

.file-upload--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.file-upload__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.file-upload__icon {
  font-size: 3rem;
  color: #6c757d;
  margin-bottom: 1rem;
}

.file-upload__text {
  margin-bottom: 1rem;
}

.file-upload__browse {
  color: #4a6cf7;
  cursor: pointer;
  text-decoration: underline;
}

.file-upload__hint {
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

.file-upload__input {
  display: none;
}

.file-upload__progress {
  margin-top: 1rem;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  height: 8px;
  position: relative;
}

.file-upload__progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  transition: width 0.3s ease;
}

.file-upload__progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  color: #6c757d;
  white-space: nowrap;
}

.file-upload__selected-files {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-upload__selected {
  padding: 1rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.file-upload__selected-file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-upload__file-icon {
  font-size: 1.5rem;
  color: #6c757d;
  width: 2rem;
  text-align: center;
}

.file-upload__file-info {
  flex: 1;
  overflow: hidden;
}

.file-upload__selected-name {
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-upload__selected-size {
  color: #6c757d;
  font-size: 0.9rem;
}

.file-upload__file-error {
  font-size: 0.8rem;
  color: #e53e3e;
  margin-top: 0.25rem;
}

.file-upload__validating {
  font-size: 0.9rem;
  color: #4a6cf7;
  margin-top: 0.5rem;
}

.file-upload__invalid {
  font-size: 0.9rem;
  color: #e53e3e;
  margin-top: 0.5rem;
}

.file-upload__remove-btn {
  background: transparent;
  border: none;
  color: #6c757d;
  font-size: 1rem;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.file-upload__remove-btn:hover {
  background-color: #f8f9fa;
  color: #e53e3e;
}

.file-upload__remove-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.3);
}

.file-upload__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.file-upload__upload-btn {
  padding: 0.75rem 1.5rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
  font-weight: 500;
  transition: all 0.2s ease;
}

.file-upload__upload-btn:hover:not(:disabled) {
  background-color: #3a5be7;
  transform: translateY(-1px);
}

.file-upload__upload-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.file-upload__clear-btn {
  padding: 0.75rem 1.5rem;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-upload__clear-btn:hover:not(:disabled) {
  background-color: #dee2e6;
}

.file-upload__clear-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Animationen für die Dateiliste */
.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.3s ease;
}

.file-list-enter-from,
.file-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

/* Responsives Design */
@media (max-width: 768px) {
  .file-upload {
    padding: 1.5rem;
  }
  
  .file-upload__selected-file {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .file-upload__remove-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }
  
  .file-upload__selected {
    position: relative;
    padding-top: 2rem;
  }
  
  .file-upload__actions {
    flex-direction: column;
  }
  
  .file-upload__upload-btn,
  .file-upload__clear-btn {
    width: 100%;
  }
}
</style>