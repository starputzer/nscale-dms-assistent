<template>
  <div 
    class="file-upload"
    :class="{ 'file-upload--dragging': isDragging, 'file-upload--disabled': isUploading }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="file-upload__content">
      <div class="file-upload__icon">
        <i class="fa fa-cloud-upload-alt"></i>
      </div>
      <div class="file-upload__text">
        <p v-if="!isUploading">
          {{ t('documentConverter.dropFiles', 'Datei hier ablegen oder') }} 
          <span @click="triggerFileInput" class="file-upload__browse">
            {{ t('documentConverter.browse', 'auswählen') }}
          </span>
        </p>
        <p v-else>
          {{ t('documentConverter.uploading', 'Datei wird hochgeladen...') }}
        </p>
        <p class="file-upload__hint">
          {{ t('documentConverter.supportedFormats', 'Unterstützte Formate:') }} 
          {{ props.allowedExtensions.map(ext => ext.toUpperCase()).join(', ') }}
        </p>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        @change="onFileSelected"
        :accept="props.allowedExtensions.map(ext => '.' + ext).join(',')"
        class="file-upload__input"
        :disabled="isUploading"
      >
    </div>

    <div v-if="isUploading" class="file-upload__progress">
      <div class="file-upload__progress-bar" :style="{ width: `${uploadProgress}%` }"></div>
      <div class="file-upload__progress-text">{{ uploadProgress }}%</div>
    </div>

    <div v-if="selectedFile && !isUploading" class="file-upload__selected">
      <div class="file-upload__selected-file">
        <span class="file-upload__selected-name">{{ selectedFile.name }}</span>
        <span class="file-upload__selected-size">({{ formatFileSize(selectedFile.size) }})</span>
      </div>
      <div class="file-upload__actions">
        <button 
          @click="uploadSelectedFile" 
          class="file-upload__upload-btn"
        >
          {{ t('documentConverter.convert', 'Konvertieren') }}
        </button>
        <button 
          @click="clearSelectedFile" 
          class="file-upload__clear-btn"
        >
          {{ t('common.cancel', 'Abbrechen') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGlobalDialog } from '@/composables/useDialog';
import { useI18n } from '@/composables/useI18n';

// Dialog-Service für Fehlermeldungen
const dialog = useGlobalDialog();
const { t } = useI18n();

interface FileUploadProps {
  isUploading?: boolean;
  uploadProgress?: number;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

const props = withDefaults(defineProps<FileUploadProps>(), {
  isUploading: false,
  uploadProgress: 0,
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt']
});

const emit = defineEmits<{
  (e: 'upload', file: File): void;
  (e: 'cancel'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragging = ref<boolean>(false);

// Datei-Auswahl Dialog öffnen
function triggerFileInput(): void {
  if (props.isUploading) return;
  if (fileInput.value) {
    fileInput.value.click();
  }
}

// Drag & Drop Handlers
function onDragOver(event: DragEvent): void {
  if (props.isUploading) return;
  isDragging.value = true;
}

function onDragLeave(event: DragEvent): void {
  isDragging.value = false;
}

function onDrop(event: DragEvent): void {
  if (props.isUploading) return;
  isDragging.value = false;
  
  if (event.dataTransfer?.files.length > 0) {
    validateAndSelectFile(event.dataTransfer.files[0]);
  }
}

// Datei ausgewählt
function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    validateAndSelectFile(input.files[0]);
  }
}

// Datei validieren und auswählen
function validateAndSelectFile(file: File): void {
  // Dateityp überprüfen
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/html',
    'text/plain'
  ];
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (!supportedTypes.includes(file.type) && !props.allowedExtensions.includes(fileExtension)) {
    dialog.error({
      title: t('documentConverter.error', 'Fehler'),
      message: t('documentConverter.unsupportedFormat', 
        `Nicht unterstütztes Dateiformat. Bitte laden Sie eine Datei mit einer der folgenden Erweiterungen hoch: ${props.allowedExtensions.join(', ')}`)
    });
    return;
  }
  
  // Dateigröße überprüfen
  if (file.size > props.maxFileSize) {
    dialog.error({
      title: t('documentConverter.error', 'Fehler'),
      message: t('documentConverter.fileTooLarge', 
        `Die Datei ist zu groß. Maximale Dateigröße: ${formatFileSize(props.maxFileSize)}`)
    });
    return;
  }
  
  selectedFile.value = file;
}

// Ausgewählte Datei zurücksetzen
function clearSelectedFile(): void {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  emit('cancel');
}

// Ausgewählte Datei hochladen
function uploadSelectedFile(): void {
  if (selectedFile.value) {
    emit('upload', selectedFile.value);
  }
}

// Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
}

.file-upload__selected {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.file-upload__selected-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-upload__selected-name {
  font-weight: 500;
}

.file-upload__selected-size {
  color: #6c757d;
  font-size: 0.9rem;
}

.file-upload__actions {
  display: flex;
  gap: 0.75rem;
}

.file-upload__upload-btn {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
}

.file-upload__clear-btn {
  padding: 0.5rem 1rem;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
}
</style>