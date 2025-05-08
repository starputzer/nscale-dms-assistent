<template>
  <div class="document-list-example">
    <h2>Dokumenten-Liste</h2>
    
    <div class="actions-bar">
      <button @click="addSampleDocument" class="action-button">
        <i class="fa fa-plus"></i> Beispieldokument hinzufügen
      </button>
      <button @click="toggleLoading" class="action-button">
        <i class="fa fa-spinner"></i> Ladezustand umschalten
      </button>
      <button @click="clearDocuments" class="action-button action-button--danger">
        <i class="fa fa-trash"></i> Alle Dokumente löschen
      </button>
    </div>
    
    <DocumentList
      :documents="documents"
      :selected-document="selectedDocument"
      :loading="isLoading"
      :supported-formats="supportedFormats"
      @select="handleSelectDocument"
      @view="handleViewDocument"
      @download="handleDownloadDocument"
      @delete="handleDeleteDocument"
    />
    
    <div v-if="selectedDocument" class="document-details">
      <h3>Ausgewähltes Dokument</h3>
      <pre>{{ JSON.stringify(selectedDocument, null, 2) }}</pre>
    </div>
    
    <div v-if="lastAction" class="action-log">
      <h3>Letzte Aktion</h3>
      <div class="action-message">{{ lastAction }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import DocumentList from '@/components/admin/document-converter/DocumentList.vue';
import { ConversionResult, SupportedFormat } from '@/types/documentConverter';
import { useDialog } from '@/composables/useDialog';

// Dialog-Service für Benachrichtigungen
const dialog = useDialog();

// Zustandsvariablen
const documents = ref<ConversionResult[]>([]);
const selectedDocumentId = ref<string | null>(null);
const isLoading = ref(false);
const lastAction = ref<string | null>(null);
const supportedFormats = ref<SupportedFormat[]>(['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']);

// Aktuelle Auswahl als abgeleiteter Wert
const selectedDocument = computed(() => {
  if (!selectedDocumentId.value) return null;
  return documents.value.find(doc => doc.id === selectedDocumentId.value) || null;
});

// Beispiel-Dokumenttypen mit realistischen Eigenschaften
const sampleDocumentTypes = [
  { 
    format: 'pdf', 
    name: 'Technische_Dokumentation', 
    size: 2540000, 
    icon: 'fa-file-pdf'
  },
  { 
    format: 'docx', 
    name: 'Projektbericht', 
    size: 1230000, 
    icon: 'fa-file-word'
  },
  { 
    format: 'xlsx', 
    name: 'Finanzdaten', 
    size: 980000, 
    icon: 'fa-file-excel'
  },
  { 
    format: 'pptx', 
    name: 'Präsentation', 
    size: 3450000, 
    icon: 'fa-file-powerpoint'
  },
  { 
    format: 'html', 
    name: 'Webseite', 
    size: 45000, 
    icon: 'fa-file-code'
  },
  { 
    format: 'txt', 
    name: 'Notizen', 
    size: 15000, 
    icon: 'fa-file-alt'
  },
];

// Mögliche Status für Dokumente
const statuses: Array<'pending' | 'processing' | 'success' | 'error'> = ['pending', 'processing', 'success', 'error'];

/**
 * Generiert eine zufällige ID
 */
function generateId(): string {
  return `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Fügt ein zufälliges Beispieldokument hinzu
 */
function addSampleDocument() {
  // Wählt einen zufälligen Dokumenttyp
  const typeIndex = Math.floor(Math.random() * sampleDocumentTypes.length);
  const type = sampleDocumentTypes[typeIndex];
  
  // Wählt einen zufälligen Status (mit höherer Wahrscheinlichkeit für 'success')
  const statusIndex = Math.floor(Math.random() * (statuses.length + 3));
  const status = statuses[statusIndex < statuses.length ? statusIndex : 2];  // Höhere Wahrscheinlichkeit für 'success'
  
  // Erstellt ein zufälliges Datum in den letzten 30 Tagen
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  // Erstellt eine Versionsnummer für den Dateinamen
  const version = Math.floor(Math.random() * 5) + 1;
  
  // Erstellt ein neues Beispieldokument
  const newDocument: ConversionResult = {
    id: generateId(),
    originalName: `${type.name}_v${version}.${type.format}`,
    originalFormat: type.format as SupportedFormat,
    size: type.size + Math.floor(Math.random() * 100000),
    uploadedAt: date,
    convertedAt: status !== 'pending' ? new Date(date.getTime() + 120000) : undefined, // 2 Minuten später konvertiert
    status: status,
    error: status === 'error' ? 'Fehler bei der Konvertierung: Format nicht unterstützt' : undefined,
    metadata: status === 'success' ? {
      title: type.name.replace('_', ' '),
      author: 'Max Mustermann',
      created: new Date(date.getTime() - 86400000 * 10), // 10 Tage vor dem Upload erstellt
      modified: date,
      pageCount: Math.floor(Math.random() * 30) + 1,
    } : undefined
  };
  
  // Fügt das neue Dokument zur Liste hinzu
  documents.value.unshift(newDocument);
  
  // Zeigt eine Benachrichtigung an
  lastAction.value = `Dokument "${newDocument.originalName}" wurde hinzugefügt`;
}

/**
 * Schaltet den Ladezustand um
 */
function toggleLoading() {
  isLoading.value = !isLoading.value;
  lastAction.value = isLoading.value ? 'Ladezustand aktiviert' : 'Ladezustand deaktiviert';
}

/**
 * Löscht alle Dokumente
 */
function clearDocuments() {
  documents.value = [];
  selectedDocumentId.value = null;
  lastAction.value = 'Alle Dokumente wurden gelöscht';
}

/**
 * Event-Handler für die Dokumentenauswahl
 */
function handleSelectDocument(documentId: string) {
  selectedDocumentId.value = documentId;
  lastAction.value = `Dokument ausgewählt: ${documentId}`;
}

/**
 * Event-Handler für die Dokumentenanzeige
 */
function handleViewDocument(documentId: string) {
  const document = documents.value.find(doc => doc.id === documentId);
  if (document) {
    dialog.info({
      title: 'Dokument anzeigen',
      message: `Dokument "${document.originalName}" wird angezeigt.`,
      confirmButtonText: 'Schließen'
    });
    
    lastAction.value = `Dokument angezeigt: ${document.originalName}`;
  }
}

/**
 * Event-Handler für den Dokumentdownload
 */
function handleDownloadDocument(documentId: string) {
  const document = documents.value.find(doc => doc.id === documentId);
  if (document) {
    dialog.success({
      title: 'Download gestartet',
      message: `Dokument "${document.originalName}" wird heruntergeladen.`,
      confirmButtonText: 'OK'
    });
    
    lastAction.value = `Dokument heruntergeladen: ${document.originalName}`;
  }
}

/**
 * Event-Handler für das Löschen eines Dokuments
 */
function handleDeleteDocument(documentId: string) {
  const document = documents.value.find(doc => doc.id === documentId);
  
  if (document) {
    // Entfernt das Dokument aus der Liste
    documents.value = documents.value.filter(doc => doc.id !== documentId);
    
    // Setzt die Auswahl zurück, wenn das gelöschte Dokument ausgewählt war
    if (selectedDocumentId.value === documentId) {
      selectedDocumentId.value = null;
    }
    
    lastAction.value = `Dokument gelöscht: ${document.originalName}`;
  }
}

// Fügt einige Beispieldokumente beim Start hinzu
for (let i = 0; i < 5; i++) {
  addSampleDocument();
}
</script>

<style scoped>
.document-list-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

h3 {
  color: #2c3e50;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}

.action-button:hover {
  background-color: #3b5bd9;
}

.action-button--danger {
  background-color: #dc3545;
}

.action-button--danger:hover {
  background-color: #c82333;
}

.document-details {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

pre {
  background-color: #f1f3f5;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
  font-size: 0.9rem;
}

.action-log {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #e9ecef;
  border-radius: 8px;
}

.action-message {
  padding: 0.75rem;
  background-color: #fff;
  border-radius: 4px;
  border-left: 3px solid #4a6cf7;
}
</style>