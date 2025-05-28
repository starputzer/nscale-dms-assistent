<template>
  <div
    class="file-upload"
    :class="{
      'file-upload--dragging': isDragging,
      'file-upload--disabled': isUploading,
      'file-upload--error': hasUploadError,
    }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    role="region"
    aria-label="Datei-Upload-Bereich"
  >
    <div class="file-upload__content">
      <div class="file-upload__icon">
        <i class="fa fa-cloud-upload-alt" aria-hidden="true"></i>
      </div>
      <div class="file-upload__text">
        <p v-if="!isUploading">
          {{ t("documentConverter.dropFiles", "Datei hier ablegen oder") }}
          <span
            @click="triggerFileInput"
            @keydown.enter="triggerFileInput"
            @keydown.space="triggerFileInput"
            tabindex="0"
            role="button"
            aria-label="Datei auswählen"
            class="file-upload__browse"
          >
            {{ t("documentConverter.browse", "auswählen") }}
          </span>
        </p>
        <p v-else>
          {{ t("documentConverter.uploading", "Datei wird hochgeladen...") }}
        </p>
        <p class="file-upload__hint">
          {{ t("documentConverter.supportedFormats", "Unterstützte Formate:") }}
          {{
            props.allowedExtensions.map((ext) => ext.toUpperCase()).join(", ")
          }}
        </p>
        <p class="file-upload__size-hint">
          {{ t("documentConverter.maxSize", "Maximale Dateigröße:") }}
          {{ formatFileSize(props.maxFileSize) }}
        </p>
      </div>
      <input
        type="file"
        ref="fileInput"
        @change="onFileSelected"
        :accept="props.allowedExtensions.map((ext) => '.' + ext).join(',')"
        class="file-upload__input"
        :disabled="isUploading"
        aria-label="Datei auswählen"
      />
    </div>

    <div v-if="isUploading" class="file-upload__progress">
      <div
        class="file-upload__progress-bar"
        :style="{ width: `${uploadProgress}%` }"
        role="progressbar"
        :aria-valuenow="uploadProgress"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
      <div class="file-upload__progress-text">{{ uploadProgress }}%</div>
    </div>

    <div v-if="hasUploadError" class="file-upload__error">
      <i class="fa fa-exclamation-circle" aria-hidden="true"></i>
      <span>{{ uploadError }}</span>
    </div>

    <div v-if="selectedFile && !isUploading" class="file-upload__selected">
      <div class="file-upload__selected-file">
        <div
          class="file-upload__file-icon"
          :class="`file-upload__file-icon--${fileFormat}`"
        >
          <i :class="getFormatIcon(fileFormat)" aria-hidden="true"></i>
        </div>
        <div class="file-upload__file-info">
          <span class="file-upload__selected-name">{{
            selectedFile.name
          }}</span>
          <span class="file-upload__selected-size"
            >({{ formatFileSize(selectedFile.size) }})</span
          >
        </div>
      </div>
      <div class="file-upload__actions">
        <button
          @click="uploadSelectedFile"
          class="file-upload__upload-btn"
          aria-label="Datei konvertieren"
        >
          {{ t("documentConverter.convert", "Konvertieren") }}
        </button>
        <button
          @click="clearSelectedFile"
          class="file-upload__clear-btn"
          aria-label="Auswahl abbrechen"
        >
          {{ t("common.cancel", "Abbrechen") }}
        </button>
      </div>
    </div>

    <div v-if="!selectedFile && !isUploading" class="file-upload__examples">
      <div class="file-upload__examples-header">
        <span>{{ t("documentConverter.examplesTitle", "Beispiele") }}</span>
        <button
          @click="toggleExamples"
          class="file-upload__examples-toggle"
          :aria-expanded="showExamples"
          aria-controls="file-examples-section"
        >
          <i
            :class="showExamples ? 'fa fa-chevron-up' : 'fa fa-chevron-down'"
            aria-hidden="true"
          ></i>
        </button>
      </div>
      <div
        v-if="showExamples"
        id="file-examples-section"
        class="file-upload__examples-content"
      >
        <div
          v-for="example in exampleFiles"
          :key="example.name"
          class="file-upload__example-item"
          @click="useExampleFile(example)"
          @keydown.enter="useExampleFile(example)"
          tabindex="0"
          role="button"
          :aria-label="`Beispieldatei ${example.name} verwenden`"
        >
          <div
            class="file-upload__example-icon"
            :class="`file-upload__file-icon--${example.format}`"
          >
            <i :class="getFormatIcon(example.format)" aria-hidden="true"></i>
          </div>
          <div class="file-upload__example-info">
            <span class="file-upload__example-name">{{ example.name }}</span>
            <span class="file-upload__example-description">{{
              example.description
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

// Mock für Dialog-Service
const useGlobalDialog = () => ({
  error: (options) => console.error(options.message)
});

// Dialog-Service für Fehlermeldungen
const dialog = useGlobalDialog();

// Beispieldateien für den Benutzer
const exampleFiles = [
  {
    name: "Beispiel-Dokument.pdf",
    format: "pdf",
    description: "Ein Beispiel-PDF mit Text und Tabellen",
    url: "/examples/Beispiel-Dokument.pdf",
  },
  {
    name: "Tabellen-Beispiel.xlsx",
    format: "xlsx",
    description: "Excel-Datei mit verschiedenen Tabellen",
    url: "/examples/Tabellen-Beispiel.xlsx",
  },
  {
    name: "Präsentation.pptx",
    format: "pptx",
    description: "Eine kurze Beispiel-Präsentation",
    url: "/examples/Präsentation.pptx",
  },
  {
    name: "Textdokument.docx",
    format: "docx",
    description: "Word-Dokument mit formatiertem Text",
    url: "/examples/Textdokument.docx",
  },
];

const props = defineProps({
  isUploading: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  maxFileSize: {
    type: Number,
    default: 50 * 1024 * 1024 // 50 MB
  },
  allowedExtensions: {
    type: Array,
    default: () => [
    "pdf",
    "docx",
    "xlsx",
    "pptx",
    "html",
    "htm",
    "txt",
  ],
});

const emit = defineEmits(["upload", "cancel"]);

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const uploadError = ref("");
const showExamples = ref(false);

// Berechne das Dateiformat der ausgewählten Datei
const fileFormat = computed(() => {
  if (!selectedFile.value) return "";
  return selectedFile.value.name.split(".").pop()?.toLowerCase() || "";
});

// Prüfe, ob ein Upload-Fehler vorliegt
const hasUploadError = computed(() => !!uploadError.value);

// Datei-Auswahl Dialog öffnen
function triggerFileInput() {
  if (props.isUploading) return;
  if (fileInput.value) {
    fileInput.value.click();
  }
}

// Drag & Drop Handlers
function onDragOver(event) {
  if (props.isUploading) return;
  isDragging.value = true;
}

function onDragLeave(event) {
  isDragging.value = false;
}

function onDrop(event) {
  if (props.isUploading) return;
  isDragging.value = false;

  if (event.dataTransfer?.files.length > 0) {
    validateAndSelectFile(event.dataTransfer.files[0]);
  }
}

// Datei ausgewählt
function onFileSelected(event) {
  const input = event.target;
  if (input.files && input.files.length > 0) {
    validateAndSelectFile(input.files[0]);
  }
}

// Datei validieren und auswählen
function validateAndSelectFile(file) {
  // Fehler zurücksetzen
  uploadError.value = "";

  // Dateityp überprüfen
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

  if (!props.allowedExtensions.includes(fileExtension)) {
    uploadError.value = t(
      "documentConverter.unsupportedFormat",
      `Nicht unterstütztes Dateiformat. Bitte laden Sie eine Datei mit einer der folgenden Erweiterungen hoch: ${props.allowedExtensions.join(", ")}`,
    );
    return;
  }

  // Dateigröße überprüfen
  if (file.size > props.maxFileSize) {
    uploadError.value = t(
      "documentConverter.fileTooLarge",
      `Die Datei ist zu groß. Maximale Dateigröße: ${formatFileSize(props.maxFileSize)}`,
    );
    return;
  }

  selectedFile.value = file;
}

// Ausgewählte Datei zurücksetzen
function clearSelectedFile() {
  selectedFile.value = null;
  uploadError.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
  emit("cancel");
}

// Ausgewählte Datei hochladen
function uploadSelectedFile() {
  if (selectedFile.value) {
    emit("upload", selectedFile.value);
  }
}

// Beispieldateien ein-/ausblenden
function toggleExamples() {
  showExamples.value = !showExamples.value;
}

// Beispieldatei verwenden
async function useExampleFile(example) {
  try {
    const response = await fetch(example.url);
    if (!response.ok) {
      throw new Error(`HTTP-Fehler: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], example.name, {
      type: getMimeType(example.format),
    });

    validateAndSelectFile(file);
  } catch (error) {
    console.error("Fehler beim Laden der Beispieldatei:", error);
    dialog.error({
      title: t("documentConverter.error", "Fehler"),
      message: t(
        "documentConverter.exampleFileError",
        "Die Beispieldatei konnte nicht geladen werden.",
      ),
    });
  }
}

// Hilfsfunktion für MIME-Typen
function getMimeType(format) {
  const mimeTypes = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    html: "text/html",
    htm: "text/html",
    txt: "text/plain",
  };

  return mimeTypes[format] || "application/octet-stream";
}

// Dateigröße formatieren
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Dateiformat-Icon ermitteln
function getFormatIcon(format) {
  const icons = {
    pdf: "fa fa-file-pdf",
    docx: "fa fa-file-word",
    doc: "fa fa-file-word",
    xlsx: "fa fa-file-excel",
    xls: "fa fa-file-excel",
    pptx: "fa fa-file-powerpoint",
    ppt: "fa fa-file-powerpoint",
    html: "fa fa-file-code",
    htm: "fa fa-file-code",
    txt: "fa fa-file-alt",
  };

  return icons[format] || "fa fa-file";
}

// i18n Hilfsfunktion
function t(key, fallback) {
  // In einer echten Implementierung würde hier die i18n-Bibliothek verwendet werden
  return fallback;
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

.file-upload--error {
  border-color: #dc3545;
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
  font-weight: 500;
}

.file-upload__browse:hover {
  text-decoration: none;
}

.file-upload__browse:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: 2px;
}

.file-upload__hint,
.file-upload__size-hint {
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

.file-upload__input {
  display: none;
}

.file-upload__progress {
  margin-top: 1.5rem;
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
  font-weight: 500;
}

.file-upload__error {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc3545;
  font-size: 0.9rem;
  padding: 0.75rem;
  background-color: #f8d7da;
  border-radius: 4px;
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
  gap: 1rem;
}

.file-upload__file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: white;
  font-size: 1.5rem;
}

.file-upload__file-icon--pdf {
  background-color: #e74c3c;
}
.file-upload__file-icon--docx,
.file-upload__file-icon--doc {
  background-color: #3498db;
}
.file-upload__file-icon--xlsx,
.file-upload__file-icon--xls {
  background-color: #2ecc71;
}
.file-upload__file-icon--pptx,
.file-upload__file-icon--ppt {
  background-color: #e67e22;
}
.file-upload__file-icon--html,
.file-upload__file-icon--htm {
  background-color: #9b59b6;
}
.file-upload__file-icon--txt {
  background-color: #95a5a6;
}

.file-upload__file-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.file-upload__selected-name {
  font-weight: 500;
  color: #212529;
  word-break: break-all;
}

.file-upload__selected-size {
  color: #6c757d;
  font-size: 0.9rem;
  margin-top: 0.25rem;
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
  transition: background-color 0.2s;
  font-weight: 500;
}

.file-upload__upload-btn:hover {
  background-color: #3a5be7;
}

.file-upload__clear-btn {
  padding: 0.5rem 1rem;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-upload__clear-btn:hover {
  background-color: #dee2e6;
}

.file-upload__examples {
  margin-top: 2rem;
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.file-upload__examples-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.file-upload__examples-header span {
  font-weight: 500;
  color: #495057;
}

.file-upload__examples-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-upload__examples-toggle:hover {
  color: #495057;
}

.file-upload__examples-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  animation: fadeIn 0.3s ease;
}

.file-upload__example-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  background-color: white;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s;
}

.file-upload__example-item:hover {
  background-color: #f8f9fa;
  border-color: #ced4da;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.file-upload__example-item:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: 2px;
}

.file-upload__example-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.file-upload__example-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.file-upload__example-name {
  font-weight: 500;
  font-size: 0.9rem;
  color: #212529;
}

.file-upload__example-description {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .file-upload {
    padding: 1.75rem 1.5rem;
    border-width: 2px;
    border-radius: 8px;
  }

  .file-upload__content {
    padding: 0.5rem;
  }

  .file-upload__icon {
    font-size: 3rem;
    margin-bottom: 1.25rem;
  }

  .file-upload__text {
    font-size: 1rem;
    line-height: 1.5;
  }

  .file-upload__browse {
    padding: 0.5rem 0;
    display: inline-block;
    min-height: 44px; /* Touch-friendly height */
    font-size: 1.1rem;
  }

  .file-upload__hint,
  .file-upload__size-hint {
    font-size: 0.9rem;
    margin-top: 0.75rem;
  }

  /* Progress bar improvements */
  .file-upload__progress {
    height: 12px; /* Taller progress bar */
    margin-top: 1.75rem;
    border-radius: 6px;
  }

  .file-upload__progress-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: #4a6cf7;
    top: 16px; /* Position below bar instead of on top */
  }

  /* Selected file improvements */
  .file-upload__selected {
    margin-top: 1.75rem;
    padding: 1.25rem;
    border-radius: 8px;
  }

  .file-upload__selected-file {
    flex-direction: row; /* Keep horizontal on tablets */
    align-items: center;
    gap: 1rem;
  }

  .file-upload__file-icon {
    width: 44px; /* Touch-friendly size */
    height: 44px; /* Touch-friendly size */
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .file-upload__file-info {
    flex: 1;
    min-width: 0; /* Prevent overflow */
  }

  .file-upload__selected-name {
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-upload__selected-size {
    font-size: 0.9rem;
  }

  /* Actions become full-width buttons */
  .file-upload__actions {
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .file-upload__upload-btn,
  .file-upload__clear-btn {
    height: 44px; /* Touch-friendly height */
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    width: 100%;
    justify-content: center;
    display: flex;
    align-items: center;
    border-radius: 6px;
  }

  /* Examples grid for tablets */
  .file-upload__examples-content {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .file-upload__examples-toggle {
    width: 44px; /* Touch-friendly width */
    height: 44px; /* Touch-friendly height */
  }

  .file-upload__example-item {
    min-height: 44px; /* Touch-friendly height */
  }
}

/* Small mobile screens */
@media (max-width: 480px) {
  .file-upload {
    padding: 1.25rem 1rem;
  }

  .file-upload__icon {
    font-size: 2.5rem;
  }

  .file-upload__text p {
    font-size: 0.95rem;
  }

  .file-upload__selected-file {
    flex-direction: column; /* Stack on small mobile */
    align-items: flex-start;
  }

  .file-upload__file-icon {
    margin-bottom: 0.5rem;
  }

  .file-upload__examples-content {
    grid-template-columns: 1fr; /* Single column on small mobile */
  }

  .file-upload__error {
    font-size: 0.85rem;
    padding: 0.75rem 0.5rem;
  }
}
</style>
