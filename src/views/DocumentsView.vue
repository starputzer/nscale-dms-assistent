<template>
  <div class="documents-view">
    <div class="documents-view__header">
      <h1 class="documents-view__title">Dokumentenkonverter</h1>
      <p class="documents-view__description">
        Konvertieren Sie Ihre Dokumente in ein nscale-kompatibles Format.
        Unterstützte Formate: PDF, DOCX, XLSX, PPTX, HTML, TXT.
      </p>
    </div>

    <!-- Fehleranzeige bei Initialisierungsproblemen -->
    <ErrorDisplay v-if="error" :error="error" @retry="initialize" />

    <div v-else class="documents-view__content">
      <!-- Upload-Bereich mit Drag & Drop Unterstützung -->
      <FileUpload
        v-if="currentView === 'upload' && !isConverting"
        @upload="startConversion"
        :is-uploading="isUploading"
        :allowed-extensions="supportedFormats"
        :max-file-size="maxFileSize"
      />

      <!-- Fortschrittsanzeige während der Konvertierung -->
      <ConversionProgress
        v-if="isConverting"
        :progress="conversionProgress"
        :current-step="conversionStep"
        :estimated-time="estimatedTimeRemaining"
        @cancel="handleCancelConversion"
      />

      <!-- Ergebnis der Konvertierung -->
      <div
        v-if="currentView === 'results' && selectedDocument"
        class="documents-view__results"
      >
        <div class="documents-view__result-header">
          <h2 class="documents-view__result-title">
            {{ selectedDocument.originalName }}
          </h2>

          <div class="documents-view__result-actions">
            <button
              class="documents-view__action-btn"
              @click="downloadSelectedDocument"
              v-if="selectedDocument.status === 'success'"
            >
              <i class="fa fa-download"></i> Herunterladen
            </button>
            <button
              class="documents-view__action-btn"
              @click="clearSelectedDocument"
            >
              <i class="fa fa-times"></i> Schließen
            </button>
          </div>
        </div>

        <div class="documents-view__result-content">
          <div
            v-if="selectedDocument.status === 'success'"
            class="documents-view__document-preview"
          >
            <!-- Document preview content -->
            <div v-if="documentContent" class="documents-view__preview-content">
              <pre>{{ documentContent }}</pre>
            </div>
            <div v-else class="documents-view__loading-preview">
              <div class="documents-view__spinner"></div>
              <p>Lade Dokumenteninhalt...</p>
            </div>
          </div>

          <div
            v-if="selectedDocument.metadata"
            class="documents-view__document-metadata"
          >
            <h3>Dokumentinformationen</h3>
            <div class="documents-view__metadata-item">
              <span class="documents-view__metadata-label">Format:</span>
              <span class="documents-view__metadata-value">{{
                selectedDocument.originalFormat.toUpperCase()
              }}</span>
            </div>
            <div class="documents-view__metadata-item">
              <span class="documents-view__metadata-label">Größe:</span>
              <span class="documents-view__metadata-value">{{
                formatFileSize(selectedDocument.size)
              }}</span>
            </div>
            <div class="documents-view__metadata-item">
              <span class="documents-view__metadata-label"
                >Konvertiert am:</span
              >
              <span class="documents-view__metadata-value">{{
                formatDate(selectedDocument.convertedAt)
              }}</span>
            </div>
            <div
              v-if="selectedDocument.metadata.title"
              class="documents-view__metadata-item"
            >
              <span class="documents-view__metadata-label">Titel:</span>
              <span class="documents-view__metadata-value">{{
                selectedDocument.metadata.title
              }}</span>
            </div>
            <div
              v-if="selectedDocument.metadata.author"
              class="documents-view__metadata-item"
            >
              <span class="documents-view__metadata-label">Autor:</span>
              <span class="documents-view__metadata-value">{{
                selectedDocument.metadata.author
              }}</span>
            </div>
            <div
              v-if="selectedDocument.metadata.created"
              class="documents-view__metadata-item"
            >
              <span class="documents-view__metadata-label">Erstellt am:</span>
              <span class="documents-view__metadata-value">{{
                formatDate(selectedDocument.metadata.created)
              }}</span>
            </div>
            <div
              v-if="selectedDocument.metadata.pageCount"
              class="documents-view__metadata-item"
            >
              <span class="documents-view__metadata-label">Seitenanzahl:</span>
              <span class="documents-view__metadata-value">{{
                selectedDocument.metadata.pageCount
              }}</span>
            </div>
            <div
              v-if="
                selectedDocument.metadata.keywords &&
                selectedDocument.metadata.keywords.length > 0
              "
              class="documents-view__metadata-item"
            >
              <span class="documents-view__metadata-label"
                >Schlüsselwörter:</span
              >
              <div class="documents-view__metadata-tags">
                <span
                  v-for="(keyword, index) in selectedDocument.metadata.keywords"
                  :key="index"
                  class="documents-view__metadata-tag"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>

            <!-- Tabellen anzeigen, falls vorhanden -->
            <div
              v-if="
                selectedDocument.metadata.tables &&
                selectedDocument.metadata.tables.length > 0
              "
              class="documents-view__tables"
            >
              <h3>Erkannte Tabellen</h3>
              <div
                v-for="(table, tableIndex) in selectedDocument.metadata.tables"
                :key="tableIndex"
                class="documents-view__table-container"
              >
                <h4>Tabelle auf Seite {{ table.pageNumber }}</h4>
                <table class="documents-view__table">
                  <thead v-if="table.headers && table.headers.length > 0">
                    <tr>
                      <th
                        v-for="(header, headerIndex) in table.headers"
                        :key="headerIndex"
                      >
                        {{ header }}
                      </th>
                    </tr>
                  </thead>
                  <tbody v-if="table.data && table.data.length > 0">
                    <tr v-for="(row, rowIndex) in table.data" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste der konvertierten Dokumente -->
      <div class="documents-view__list-container">
        <div class="documents-view__list-header">
          <h2 class="documents-view__list-title">Dokumentenliste</h2>
          <button
            class="documents-view__refresh-btn"
            @click="refreshDocumentList"
            :disabled="isLoading"
          >
            <i class="fa fa-sync-alt"></i> Aktualisieren
          </button>
        </div>
        <DocumentList
          :documents="documents"
          :selected-document="selectedDocument"
          :loading="isLoading"
          @select="selectDocument"
          @view="viewDocument"
          @download="downloadDocument"
          @delete="promptDeleteDocument"
        />
      </div>

      <!-- Fallback-Konverter, falls etwas schief geht -->
      <div v-if="useFallback" class="documents-view__fallback">
        <h3>Alternative Konvertierungsmethode</h3>
        <p>
          Die Standardkonvertierung ist aufgrund eines Fehlers nicht verfügbar.
          Es wird eine vereinfachte Version verwendet.
        </p>
        <div class="documents-view__fallback-actions">
          <button
            @click="retryStandardConversion"
            class="documents-view__retry-btn"
          >
            <i class="fa fa-redo"></i> Standardkonvertierung erneut versuchen
          </button>
        </div>
      </div>

      <!-- Steuerelemente am unteren Rand -->
      <div class="documents-view__controls" v-if="currentView === 'results'">
        <button
          class="documents-view__btn documents-view__btn-primary"
          @click="clearSelectedDocument"
        >
          Neue Konvertierung
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useDocumentConverterCompat } from "@/stores/adapters/documentConverterAdapter";
import { getDialogStoreCompat } from "@/stores/adapters/dialogStoreAdapter";
import DocumentConverterServiceWrapper from "@/services/api/DocumentConverterServiceWrapper";
import {
  ConversionResult,
  DocumentMetadata,
  TableMetadata,
} from "@/types/documentConverter";

// Komponenten importieren
import FileUpload from "@/components/admin/document-converter/FileUpload.vue";
import ConversionProgress from "@/components/admin/document-converter/ConversionProgress.vue";
import DocumentList from "@/components/admin/document-converter/DocumentList.vue";
import ErrorDisplay from "@/components/admin/document-converter/ErrorDisplay.vue";

// Stores
const documentConverterStore = useDocumentConverterCompat();
const dialogStore = getDialogStoreCompat();

// Reaktive Zustände für TypeScript-Kompatibilität
const documents = computed(() => documentConverterStore.convertedDocuments || []);
const isConverting = computed(() => documentConverterStore.isConverting || false);
const isUploading = computed(() => documentConverterStore.isUploading || false);
const isLoading = computed(() => documentConverterStore.isLoading || false);
const error = computed(() => documentConverterStore.error || null);
const conversionProgress = computed(() => documentConverterStore.conversionProgress || 0);
const conversionStep = computed(() => documentConverterStore.conversionStep || '');
const estimatedTimeRemaining = computed(() => documentConverterStore.estimatedTimeRemaining || 0);
const currentView = computed(() => documentConverterStore.currentView || 'upload');
const useFallback = computed(() => documentConverterStore.useFallback || false);
const selectedDocument = computed(() => documentConverterStore.selectedDocument || null);

// Computed-Eigenschaften aus dem Store
const supportedFormats = computed(() => documentConverterStore.supportedFormats || ['.pdf', '.docx', '.xlsx', '.pptx', '.html', '.txt']);
const maxFileSize = computed(() => documentConverterStore.maxFileSize || 10485760);

// Lokaler Zustand
const documentContent = ref<string | null>(null);
const isLoadingContent = ref(false);

// Initialisierung
onMounted(() => {
  initialize();
});

// Überwache das ausgewählte Dokument und lade dessen Inhalt
watch(
  () => selectedDocument.value,
  async (newDoc) => {
    documentContent.value = null;

    if (newDoc && newDoc.status === "success") {
      await loadSelectedDocumentContent();
    }
  },
);

/**
 * Initialisiere die Dokumentenkonverter-Komponente
 */
async function initialize(): Promise<void> {
  try {
    await documentConverterStore.initialize();
  } catch (err) {
    dialogStore.showError({
      title: "Initialisierungsfehler",
      message:
        "Der Dokumentenkonverter konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut.",
    });
  }
}

/**
 * Startet den Konvertierungsprozess für eine hochgeladene Datei
 */
async function startConversion(file: File): Promise<void> {
  // Validiere die Datei noch einmal
  if (!validateFile(file)) {
    return;
  }

  try {
    // Dokument hochladen
    const documentId = await documentConverterStore.uploadDocument(file);

    if (!documentId) {
      return;
    }

    // Konvertierung starten
    const success = await documentConverterStore.convertDocument(
      documentId,
      (progress, step, timeRemaining) => {
        // Fortschritts-Callback (wird bereits im Store verarbeitet)
      },
    );

    if (success) {
      // Dokument anzeigen
      viewDocument(documentId);
    }
  } catch (err) {
    dialogStore.showError({
      title: "Fehler bei der Dokumentenkonvertierung",
      message:
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler bei der Konvertierung",
    });
  }
}

/**
 * Validiert die hochzuladende Datei
 */
function validateFile(file: File): boolean {
  // Dateityp prüfen
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

  if (!supportedFormats.value.includes(fileExtension as any)) {
    dialogStore.showError({
      title: "Nicht unterstütztes Format",
      message: `Die Datei hat ein nicht unterstütztes Format. Unterstützt werden: ${supportedFormats.value.join(", ").toUpperCase()}`,
    });
    return false;
  }

  // Dateigröße prüfen
  if (file.size > maxFileSize.value) {
    dialogStore.showError({
      title: "Datei zu groß",
      message: `Die Datei ist zu groß. Maximale Dateigröße: ${formatFileSize(maxFileSize.value)}`,
    });
    return false;
  }

  return true;
}

/**
 * Zeigt ein bereits konvertiertes Dokument an
 */
function viewDocument(documentId: string): void {
  documentConverterStore.selectDocument(documentId);
}

/**
 * Entfernt die Auswahl des aktuellen Dokuments
 */
function clearSelectedDocument(): void {
  documentConverterStore.selectDocument(null);
  documentConverterStore.setView("upload");
}

/**
 * Wählt ein Dokument in der Liste aus
 */
function selectDocument(documentId: string): void {
  documentConverterStore.selectDocument(documentId);
}

/**
 * Lädt den Inhalt des ausgewählten Dokuments
 */
async function loadSelectedDocumentContent(): Promise<void> {
  if (!selectedDocument.value || selectedDocument.value.status !== "success") {
    return;
  }

  isLoadingContent.value = true;
  documentContent.value = null;

  try {
    const content = await DocumentConverterServiceWrapper.getDocumentContent(
      selectedDocument.value.id,
    );
    documentContent.value = content;
  } catch (err) {
    documentContent.value = "Fehler beim Laden des Dokumentinhalts";
    console.error("Fehler beim Laden des Dokumentinhalts:", err);

    // Formatierter Fehler für besseres Nutzererlebnis
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Unbekannter Fehler beim Laden des Dokumentinhalts";
    const errorType =
      err && typeof err === "object" && "type" in err ? err.type : "server";

    dialogStore.showError({
      title: "Fehler beim Laden des Inhalts",
      message: errorMessage,
      type: errorType,
    });
  } finally {
    isLoadingContent.value = false;
  }
}

/**
 * Lädt das ausgewählte Dokument herunter
 */
async function downloadSelectedDocument(): Promise<void> {
  if (selectedDocument.value) {
    await downloadDocument(selectedDocument.value.id);
  }
}

/**
 * Lädt ein Dokument herunter
 */
async function downloadDocument(documentId: string): Promise<void> {
  try {
    await documentConverterStore.downloadDocument(documentId);
  } catch (err) {
    dialogStore.showError({
      title: "Download fehlgeschlagen",
      message:
        err instanceof Error
          ? err.message
          : "Das Dokument konnte nicht heruntergeladen werden.",
    });
  }
}

/**
 * Bestätigt das Löschen eines Dokuments
 */
async function promptDeleteDocument(documentId: string): Promise<void> {
  const document = documents.value.find((doc) => doc.id === documentId);
  if (!document) return;

  const confirmed = await dialogStore.showConfirm({
    title: "Dokument löschen",
    message: `Möchten Sie das Dokument "${document.originalName}" wirklich löschen?`,
    confirmButtonText: "Löschen",
    cancelButtonText: "Abbrechen",
    type: "warning",
  });

  if (confirmed) {
    try {
      await documentConverterStore.deleteDocument(documentId);

      // Wenn das gelöschte Dokument das aktuelle war, Auswahl zurücksetzen
      if (selectedDocument.value && selectedDocument.value.id === documentId) {
        clearSelectedDocument();
      }

      dialogStore.showSuccess({
        title: "Dokument gelöscht",
        message: `Das Dokument "${document.originalName}" wurde erfolgreich gelöscht.`,
      });
    } catch (err) {
      dialogStore.showError({
        title: "Fehler beim Löschen",
        message:
          err instanceof Error
            ? err.message
            : "Das Dokument konnte nicht gelöscht werden.",
      });
    }
  }
}

/**
 * Bricht eine laufende Konvertierung ab
 */
async function handleCancelConversion(): Promise<void> {
  const confirmed = await dialogStore.showConfirm({
    title: "Konvertierung abbrechen",
    message: "Möchten Sie die laufende Konvertierung wirklich abbrechen?",
    confirmButtonText: "Ja",
    cancelButtonText: "Nein",
    type: "warning",
  });

  if (confirmed && documentConverterStore.activeConversionId) {
    try {
      await documentConverterStore.cancelConversion(
        documentConverterStore.activeConversionId,
      );
      documentConverterStore.setView("upload");
    } catch (err) {
      dialogStore.showError({
        title: "Fehler beim Abbrechen der Konvertierung",
        message:
          err instanceof Error
            ? err.message
            : "Die Konvertierung konnte nicht abgebrochen werden.",
      });
    }
  }
}

/**
 * Versucht, zur Standardkonvertierung zurückzukehren
 */
function retryStandardConversion(): void {
  if (typeof documentConverterStore.setUseFallback === 'function') {
    documentConverterStore.setUseFallback(false);
  } else {
    documentConverterStore.$patch({ useFallback: false });
  }

  if (typeof documentConverterStore.clearError === 'function') {
    documentConverterStore.clearError();
  } else {
    documentConverterStore.$patch({ error: null });
  }

  if (typeof documentConverterStore.setView === 'function') {
    documentConverterStore.setView("upload");
  } else {
    documentConverterStore.$patch({ currentView: "upload" });
  }
}

/**
 * Aktualisiert die Liste der Dokumente
 */
async function refreshDocumentList(): Promise<void> {
  try {
    if (typeof documentConverterStore.refreshDocuments === 'function') {
      await documentConverterStore.refreshDocuments();
    } else {
      // Fallback implementation
      documentConverterStore.$patch({ isLoading: true });
      try {
        const documents = await DocumentConverterServiceWrapper.getDocuments();
        documentConverterStore.$patch({
          convertedDocuments: documents,
          lastUpdated: new Date()
        });
      } finally {
        documentConverterStore.$patch({ isLoading: false });
      }
    }
  } catch (err) {
    dialogStore.showError({
      title: "Aktualisierungsfehler",
      message: "Die Dokumentenliste konnte nicht aktualisiert werden.",
    });
  }
}

/**
 * Formatiert die Dateigröße benutzerfreundlich
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Formatiert ein Datum benutzerfreundlich
 */
function formatDate(date?: Date | string | null): string {
  if (!date) return "";

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  return dateObj.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style scoped>
.documents-view {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

.documents-view__header {
  margin-bottom: 2rem;
  text-align: center;
}

.documents-view__title {
  font-size: 2rem;
  color: #0d7a40; /* nscale Grün */
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.documents-view__description {
  font-size: 1.1rem;
  color: #666;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.5;
}

.documents-view__content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.documents-view__results {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.documents-view__result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.documents-view__result-title {
  font-size: 1.25rem;
  margin: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.documents-view__result-actions {
  display: flex;
  gap: 0.75rem;
}

.documents-view__action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #e9ecef;
  color: #495057;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.documents-view__action-btn:hover {
  background-color: #dee2e6;
}

.documents-view__action-btn i {
  font-size: 1rem;
}

.documents-view__result-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (max-width: 992px) {
  .documents-view__result-content {
    grid-template-columns: 1fr;
  }
}

.documents-view__document-preview {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  max-height: 600px;
  overflow: auto;
}

.documents-view__preview-content {
  font-family: "Courier New", monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  line-height: 1.4;
  color: #212529;
}

.documents-view__loading-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #6c757d;
  gap: 1rem;
}

.documents-view__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #0d7a40;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.documents-view__document-metadata {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
}

.documents-view__document-metadata h3 {
  font-size: 1.1rem;
  margin-top: 0;
  margin-bottom: 1rem;
  color: #0d7a40;
  font-weight: 600;
}

.documents-view__metadata-item {
  display: flex;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.documents-view__metadata-label {
  font-weight: 600;
  width: 130px;
  flex-shrink: 0;
  color: #495057;
}

.documents-view__metadata-value {
  color: #212529;
}

.documents-view__metadata-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.documents-view__metadata-tag {
  background-color: #e7f5ff;
  color: #1c7ed6;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.documents-view__tables {
  margin-top: 1.5rem;
}

.documents-view__tables h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #0d7a40;
  font-weight: 600;
}

.documents-view__table-container {
  margin-bottom: 1.5rem;
}

.documents-view__table-container h4 {
  font-size: 1rem;
  margin: 0.5rem 0;
  color: #495057;
}

.documents-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  display: block;
  max-height: 300px;
  overflow-y: auto;
}

.documents-view__table th,
.documents-view__table td {
  border: 1px solid #dee2e6;
  padding: 0.5rem;
  text-align: left;
}

.documents-view__table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.documents-view__fallback {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.documents-view__fallback h3 {
  color: #856404;
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.documents-view__fallback p {
  color: #856404;
  margin-bottom: 1rem;
}

.documents-view__fallback-actions {
  display: flex;
  justify-content: flex-end;
}

.documents-view__retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #495057;
  cursor: pointer;
}

.documents-view__retry-btn:hover {
  background-color: #e2e6ea;
}

.documents-view__controls {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.documents-view__btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
  border: none;
  outline: none;
}

.documents-view__btn:hover {
  transform: translateY(-1px);
}

.documents-view__btn:active {
  transform: translateY(0);
}

.documents-view__btn-primary {
  background-color: #0d7a40; /* nscale Grün */
  color: white;
}

.documents-view__btn-primary:hover {
  background-color: #0a6032; /* Dunkleres Grün beim Hover */
}

.documents-view__list-container {
  margin-top: 2rem;
}

.documents-view__list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.documents-view__list-title {
  font-size: 1.25rem;
  margin: 0;
  color: #0d7a40;
}

.documents-view__refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #495057;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.documents-view__refresh-btn:hover {
  background-color: #e9ecef;
}

.documents-view__refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.documents-view__refresh-btn i {
  font-size: 0.9rem;
}
</style>
