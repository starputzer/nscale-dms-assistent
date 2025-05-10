---
title: "Dokumentenkonverter"
version: "1.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten"
tags: ["Dokumentenkonverter", "Vue3", "SFC", "Upload", "Konvertierung", "Dokumentenverwaltung"]
---

# Dokumentenkonverter

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## 1. Übersicht und Zielsetzung

Der Dokumentenkonverter ist eine umfassende Komponente des nscale DMS Assistenten, die das Hochladen, Konvertieren, Verwalten und Herunterladen von Dokumenten ermöglicht. Diese Komponente wurde im Rahmen der Vue 3 Single File Component (SFC) Migration vollständig modernisiert und bietet nun eine verbesserte Benutzererfahrung, bessere Leistung und erweiterte Funktionalitäten.

### Aktuelle Migrationsphase

Die Migration des Dokumentenkonverters zu Vue 3 Single File Components ist Teil der schrittweisen Modernisierung der nscale Assist Anwendung:

- ✅ **Phase 1**: Analyse und Vorbereitung (abgeschlossen)
- ✅ **Phase 2**: Implementierung von Kernkomponenten (abgeschlossen)
- 🔄 **Phase 3**: Integration und vollständige Testabdeckung (in Bearbeitung)
- ⏳ **Phase 4**: Produktivstellung und Legacy-Code-Entfernung (geplant)

### Kernfunktionalitäten

- **Erweiterte Dateiupload-Funktionalität** mit Drag & Drop und Mehrfachauswahl
- **Fortschrittsanzeige** während des Uploads und der Konvertierung
- **Umfassende Dokumentenverwaltung** mit Sortier- und Filterfunktionen
- **Vorschau konvertierter Dokumente** mit verschiedenen Darstellungsoptionen
- **Robuste Fehlerbehandlung** mit kontextspezifischen Lösungsvorschlägen
- **Unterstützung verschiedener Dateiformate** (PDF, Office-Dokumente, HTML, Text)
- **Responsive Design** für optimale Darstellung auf allen Geräten
- **Vollständige Barrierefreiheit** mit Tastatur-Navigation und Screen-Reader-Unterstützung

### Vorteile gegenüber der klassischen Implementierung

Die neue SFC-Implementierung bietet mehrere signifikante Verbesserungen:

| Aspekt | Klassische Implementierung | Vue 3 SFC-Implementierung |
|--------|---------------------------|--------------------------|
| **Struktur** | Monolithische Implementierung | Modulare Komponenten mit klaren Verantwortlichkeiten |
| **Typsicherheit** | Keine Typsicherheit | Vollständige TypeScript-Integration |
| **Reaktivität** | Vue 2 Reaktivitätssystem | Vue 3 Composition API mit verbesserten reaktiven Primitiven |
| **Wartbarkeit** | Schwer zu verstehende Mischung aus JS/HTML | Klar strukturierte Single File Components |
| **Dateiupload** | Grundlegende Funktionalität | Erweiterte Funktionalität mit Drag & Drop und Mehrfachauswahl |
| **Fehlerbehandlung** | Grundlegende Fehlerbehandlung | Robuste Fehlerbehandlung mit automatischem Fallback |
| **Barrierefreiheit** | Minimale Unterstützung | Vollständige Keyboard-Navigation und Screen-Reader-Unterstützung |
| **Integration** | Fest integriert | Über Feature-Toggles flexibel aktivierbar |

## 2. Architektur

### Komponentenhierarchie

Die Architektur des Dokumentenkonverters folgt einem hierarchischen Modell, bei dem jede Komponente eine klar definierte Verantwortlichkeit hat:

```
App
└── AdminPanel
    └── DocConverterContainer
        ├── FileUpload               # Dateiupload mit Drag & Drop
        ├── ConversionProgress       # Fortschrittsanzeige für Konvertierung
        ├── ConversionResult         # Anzeige der Konvertierungsergebnisse
        ├── DocumentList             # Liste aller konvertierten Dokumente
        ├── DocumentPreview          # Vorschau ausgewählter Dokumente
        ├── ErrorDisplay             # Fehleranzeige mit Lösungsvorschlägen
        └── FallbackConverter        # Fallback bei deaktiviertem Feature
```

Die Komponenten werden durch den DocumentConverterStore orchestriert, der den Zustand verwaltet und die API-Kommunikation abstrahiert.

### Datenfluss

Der Datenfluss im Dokumentenkonverter folgt dem unidirektionalen Datenflussprinzip von Vue, ergänzt durch den zentralen Pinia-Store:

1. Die **DocConverterContainer**-Komponente fungiert als Hauptkoordinator und verwaltet den übergeordneten Zustand
2. Kindkomponenten erhalten Daten als **Props** und kommunizieren Änderungen durch **Events** zurück
3. Der **DocumentConverterStore** stellt einen zentralen Zustand bereit, auf den alle Komponenten zugreifen können
4. **API-Aufrufe** werden durch den Store abstrahiert, sodass Komponenten nur mit dem lokalen Zustand interagieren

Beispiel für den Datenfluss beim Dateiupload:

```
1. Benutzer wählt Datei(en) in FileUpload aus
2. FileUpload-Komponente emittiert 'upload'-Event mit Datei-Objekt(en)
3. DocConverterContainer fängt Event ab und ruft store.uploadDocument() auf
4. Store führt API-Aufruf durch und aktualisiert den Zustand
5. Reaktive Zustandsänderungen bewirken UI-Updates in allen abhängigen Komponenten
```

### Integration mit Feature-Toggle-System

Die Integration des Vue 3 SFC-Dokumentenkonverters in die bestehende Anwendung erfolgt über einen FeatureWrapper-Ansatz:

```vue
<!-- AdminPanel.vue (vereinfacht) -->
<template>
  <div class="admin-panel">
    <!-- Andere Admin-Bereiche... -->
    
    <FeatureWrapper
      feature="useSfcDocConverter"
      :newComponent="SfcDocConverterContainer"
      :legacyComponent="LegacyDocConverterContainer"
      @feature-error="handleFeatureError"
    />
  </div>
</template>
```

Dieser Ansatz ermöglicht:
- Koexistenz von altem und neuem Code während der Migration
- Einfaches A/B-Testing verschiedener Implementierungen
- Sofortigen Fallback bei Fehlern in der neuen Implementierung
- Schrittweise Migration ohne größere Risiken

## 3. Hauptkomponenten

### DocConverterContainer

**Hauptkomponente** des Dokumentenkonverters, die als Koordinator für alle Unterkomponenten dient.

**Datei:** `/src/components/admin/document-converter/DocConverterContainer.vue`

**Verantwortlichkeiten:**
- Koordination der Unterkomponenten
- Verwaltung des Konvertierungsprozesses
- Fehlerbehandlung auf oberster Ebene
- Lebenszyklus-Management

**Code-Beispiel:**
```vue
<template>
  <div class="doc-converter-container" v-if="featureToggles.isDocConverterEnabled">
    <!-- Komponenten-Header -->
    <div class="doc-converter-header">
      <h2>{{ t('documentConverter.title', 'Dokumentenkonverter') }}</h2>
      <!-- ... -->
    </div>
    
    <!-- Fehleranzeige -->
    <ErrorDisplay 
      v-if="error" 
      :error="error" 
      @retry="initialize" 
    />
    
    <!-- Hauptinhalt mit bedingtem Rendering der Unterkomponenten -->
    <div v-else class="doc-converter-content">
      <!-- FileUpload-Komponente für initialen Upload -->
      <FileUpload 
        v-if="!isConverting && !conversionResult" 
        :is-uploading="isUploading"
        :upload-progress="uploadProgress"
        :max-file-size="maxFileSize"
        :allowed-extensions="allowedExtensions"
        @upload="handleFilesUpload" 
        @cancel="handleUploadCancel"
        @validation-error="handleValidationError"
      />
      
      <!-- Konvertierungsfortschritt -->
      <ConversionProgress 
        v-if="isConverting" 
        :progress="conversionProgress"
        :current-step="conversionStep"
        :estimated-time="estimatedTimeRemaining"
        @cancel="handleConversionCancel"
      />
      
      <!-- Dokumentenliste -->
      <DocumentList 
        v-if="!isConverting && hasDocuments" 
        :documents="documents"
        :selected-document="selectedDocument"
        :loading="isLoading"
        @select="selectDocument"
        @view="viewDocument"
        @download="downloadDocument"
        @delete="deleteDocument"
      />
      
      <!-- Dokumentvorschau -->
      <DocumentPreview 
        v-if="showPreview && selectedDocument" 
        :document="selectedDocument"
        @close="closePreview"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  // Composables
  const featureToggles = useFeatureToggles();
  const { t } = useI18n();
  const store = useDocumentConverterStore();
  
  // Reaktiver Zustand aus dem Store
  const { 
    error, 
    isConverting, 
    isUploading,
    uploadProgress,
    conversionProgress,
    conversionStep,
    estimatedTimeRemaining,
    documents,
    selectedDocument,
    conversionResult,
    isLoading
  } = toRefs(store);
  
  // Berechnete Eigenschaften
  const hasDocuments = computed(() => documents.value.length > 0);
  const showPreview = ref(false);
  const maxFileSize = 20 * 1024 * 1024; // 20 MB
  const allowedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'];
  
  // Methoden
  function handleFilesUpload(files: File[]) {
    store.uploadAndConvertFiles(files);
  }
  
  function handleUploadCancel() {
    store.cancelUpload();
  }
  
  function handleConversionCancel() {
    store.cancelConversion();
  }
  
  function selectDocument(id: string) {
    store.selectDocument(id);
  }
  
  function viewDocument(id: string) {
    store.selectDocument(id);
    showPreview.value = true;
  }
  
  function closePreview() {
    showPreview.value = false;
  }
  
  function downloadDocument(id: string) {
    store.downloadDocument(id);
  }
  
  function deleteDocument(id: string) {
    store.deleteDocument(id);
  }
  
  function handleValidationError(error: string, file: File) {
    // Validierungsfehler behandeln
  }
  
  // Initialisierung
  onMounted(() => {
    store.initialize();
  });
  
  // Bereinigung
  onBeforeUnmount(() => {
    if (store.isConverting && store.activeConversionId) {
      store.cancelConversion(store.activeConversionId);
    }
  });
</script>
```

### FileUpload

**Spezialisierte Komponente** für den Dateiupload mit Drag & Drop und Mehrfachauswahl.

**Datei:** `/src/components/admin/document-converter/FileUpload.vue`

**Verantwortlichkeiten:**
- Dateiauswahl über Dialog oder Drag & Drop
- Validierung von Dateitypen und -größen
- Anzeige ausgewählter Dateien vor dem Upload
- Fortschrittsanzeige während des Uploads

**Props und Events:**

| Name | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `isUploading` | `Boolean` | `false` | Gibt an, ob aktuell ein Upload-Prozess läuft |
| `uploadProgress` | `Number` | `0` | Fortschritt des aktuellen Upload-Prozesses (0-100) |
| `maxFileSize` | `Number` | `50 * 1024 * 1024` | Maximale Dateigröße in Bytes (Standard: 50 MB) |
| `allowedExtensions` | `Array<String>` | `['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt']` | Liste der erlaubten Dateierweiterungen |
| `maxFiles` | `Number` | `10` | Maximale Anzahl an Dateien, die gleichzeitig ausgewählt werden können |

| Event | Parameter | Beschreibung |
|------|-----------|-------------|
| `upload` | `files: File[]` | Wird ausgelöst, wenn der Benutzer den Upload-Prozess startet. Enthält ein Array mit den hochzuladenden Dateien. |
| `cancel` | - | Wird ausgelöst, wenn der Benutzer den Vorgang abbricht. |
| `fileAdded` | `file: File` | Wird ausgelöst, wenn eine Datei zur Liste hinzugefügt wird. |
| `fileRemoved` | `file: File` | Wird ausgelöst, wenn eine Datei aus der Liste entfernt wird. |
| `validationError` | `error: string, file: File` | Wird ausgelöst, wenn eine Datei die Validierung nicht besteht. |

**Code-Beispiel:**
```vue
<template>
  <div 
    class="file-upload"
    :class="{ 'file-upload--dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    tabindex="0"
    role="button"
    aria-label="Dateien hochladen"
  >
    <!-- Upload-Bereich -->
    <div class="file-upload-area" v-if="!hasSelectedFiles && !isUploading">
      <div class="file-upload-icon">
        <i class="fas fa-upload"></i>
      </div>
      <div class="file-upload-text">
        <h3>{{ t('documentConverter.dragAndDrop', 'Ziehen Sie Dateien hierher') }}</h3>
        <p>{{ t('documentConverter.orClickToUpload', 'Oder klicken Sie, um Dateien auszuwählen') }}</p>
      </div>
      <div class="file-upload-info">
        <p>{{ t('documentConverter.supportedFormats', 'Unterstützte Formate') }}: {{ allowedExtensions.join(', ') }}</p>
        <p>{{ t('documentConverter.maxFileSize', 'Maximale Dateigröße') }}: {{ formatFileSize(maxFileSize) }}</p>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        class="file-upload-input" 
        :multiple="true"
        :accept="allowedMimeTypes"
        @change="onFileInputChange" 
      >
    </div>
    
    <!-- Ausgewählte Dateien -->
    <div class="file-upload-selected-files" v-if="hasSelectedFiles && !isUploading">
      <h3>{{ t('documentConverter.selectedFiles', 'Ausgewählte Dateien') }}</h3>
      <ul class="file-list">
        <li v-for="file in selectedFiles" :key="file.id" class="file-item">
          <div class="file-info">
            <div class="file-icon">
              <i :class="getFileIcon(file.file.type)"></i>
            </div>
            <div class="file-details">
              <div class="file-name">{{ file.file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.file.size) }}</div>
            </div>
          </div>
          <button 
            class="file-remove" 
            @click="removeFile(file.id)"
            aria-label="Datei entfernen"
          >
            <i class="fas fa-times"></i>
          </button>
        </li>
      </ul>
      <div class="file-upload-actions">
        <button 
          class="btn btn-primary" 
          @click="startUpload"
          :disabled="selectedFiles.length === 0"
        >
          {{ t('documentConverter.startUpload', 'Upload starten') }}
        </button>
        <button 
          class="btn btn-secondary" 
          @click="cancelSelection"
        >
          {{ t('common.cancel', 'Abbrechen') }}
        </button>
      </div>
    </div>
    
    <!-- Upload-Fortschritt -->
    <div class="file-upload-progress" v-if="isUploading">
      <h3>{{ t('documentConverter.uploading', 'Hochladen...') }}</h3>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: `${uploadProgress}%` }"></div>
      </div>
      <div class="progress-info">
        <span>{{ uploadProgress }}%</span>
      </div>
      <button 
        class="btn btn-secondary" 
        @click="cancelUpload"
      >
        {{ t('common.cancel', 'Abbrechen') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  // Props und Events
  const props = withDefaults(defineProps<{
    isUploading?: boolean;
    uploadProgress?: number;
    maxFileSize?: number;
    allowedExtensions?: string[];
    maxFiles?: number;
  }>(), {
    isUploading: false,
    uploadProgress: 0,
    maxFileSize: 50 * 1024 * 1024,
    allowedExtensions: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'],
    maxFiles: 10
  });
  
  const emit = defineEmits<{
    (e: 'upload', files: File[]): void;
    (e: 'cancel'): void;
    (e: 'fileAdded', file: File): void;
    (e: 'fileRemoved', file: File): void;
    (e: 'validationError', error: string, file: File): void;
  }>();
  
  // Interner Status
  const { t } = useI18n();
  const isDragging = ref<boolean>(false);
  const fileInput = ref<HTMLInputElement | null>(null);
  const selectedFiles = ref<{id: string, file: File}[]>([]);
  
  // Berechnete Eigenschaften
  const hasSelectedFiles = computed(() => selectedFiles.value.length > 0);
  
  const allowedMimeTypes = computed(() => {
    const mimeTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'html': 'text/html',
      'txt': 'text/plain'
    };
    
    return props.allowedExtensions
      .map(ext => mimeTypeMap[ext] || `application/${ext}`)
      .join(',');
  });
  
  // Ereignishandler
  function onDragOver(event: DragEvent): void {
    isDragging.value = true;
  }
  
  function onDragLeave(event: DragEvent): void {
    isDragging.value = false;
  }
  
  function onDrop(event: DragEvent): void {
    isDragging.value = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      handleFiles(Array.from(files));
    }
  }
  
  function onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files) {
      handleFiles(Array.from(files));
    }
  }
  
  function handleFiles(files: File[]): void {
    // Validieren und hinzufügen der Dateien
    for (const file of files) {
      if (selectedFiles.value.length >= props.maxFiles) {
        emit('validationError', `Maximale Anzahl von ${props.maxFiles} Dateien erreicht`, file);
        continue;
      }
      
      if (!validateFile(file)) {
        continue;
      }
      
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      selectedFiles.value.push({ id: fileId, file });
      emit('fileAdded', file);
    }
    
    // Datei-Input zurücksetzen
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
  
  function validateFile(file: File): boolean {
    // Prüfen der Dateigröße
    if (file.size > props.maxFileSize) {
      emit('validationError', `Die Datei ist zu groß (max. ${formatFileSize(props.maxFileSize)})`, file);
      return false;
    }
    
    // Prüfen der Dateierweiterung
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !props.allowedExtensions.includes(extension)) {
      emit('validationError', `Nicht unterstütztes Dateiformat (${extension})`, file);
      return false;
    }
    
    return true;
  }
  
  function removeFile(id: string): void {
    const index = selectedFiles.value.findIndex(file => file.id === id);
    if (index !== -1) {
      const file = selectedFiles.value[index].file;
      selectedFiles.value.splice(index, 1);
      emit('fileRemoved', file);
    }
  }
  
  function startUpload(): void {
    if (selectedFiles.value.length > 0) {
      const files = selectedFiles.value.map(item => item.file);
      emit('upload', files);
    }
  }
  
  function cancelSelection(): void {
    selectedFiles.value = [];
    emit('cancel');
  }
  
  function cancelUpload(): void {
    emit('cancel');
  }
  
  // Hilfsfunktionen
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }
  
  function getFileIcon(mimeType: string): string {
    // MIME-Typ zu Icon-Klasse zuordnen
    if (mimeType.includes('pdf')) return 'far fa-file-pdf';
    else if (mimeType.includes('word')) return 'far fa-file-word';
    else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'far fa-file-excel';
    else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'far fa-file-powerpoint';
    else if (mimeType.includes('html')) return 'far fa-file-code';
    else if (mimeType.includes('text')) return 'far fa-file-alt';
    else return 'far fa-file';
  }
</script>
```

### ConversionProgress

**Spezialisierte Komponente** zur Anzeige des Konvertierungsfortschritts.

**Datei:** `/src/components/admin/document-converter/ConversionProgress.vue`

**Verantwortlichkeiten:**
- Anzeige des Konvertierungsfortschritts
- Darstellung des aktuellen Konvertierungsschritts
- Anzeige der geschätzten verbleibenden Zeit
- Möglichkeit zum Abbrechen der Konvertierung

**Props und Events:**

| Name | Typ | Beschreibung |
|------|-----|-------------|
| `progress` | `Number` | Fortschritt in Prozent (0-100) |
| `currentStep` | `String` | Beschreibung des aktuellen Schritts |
| `estimatedTime` | `Number` | Geschätzte verbleibende Zeit in Sekunden |
| `documentName` | `String` | Name des zu konvertierenden Dokuments |
| `isPaused` | `Boolean` | Gibt an, ob die Konvertierung pausiert ist |
| `canPause` | `Boolean` | Gibt an, ob die Konvertierung pausiert werden kann |
| `canCancel` | `Boolean` | Gibt an, ob die Konvertierung abgebrochen werden kann |

| Event | Beschreibung |
|------|-------------|
| `cancel` | Emittiert, wenn die Konvertierung abgebrochen werden soll |
| `pause` | Emittiert, wenn die Konvertierung pausiert werden soll |
| `resume` | Emittiert, wenn die Konvertierung fortgesetzt werden soll |

### DocumentList

**Komponente zur Anzeige** konvertierter Dokumente mit Interaktionsmöglichkeiten.

**Datei:** `/src/components/admin/document-converter/DocumentList.vue`

**Verantwortlichkeiten:**
- Anzeige der Liste konvertierter Dokumente
- Sortier- und Filterfunktionen
- Aktionen für jedes Dokument (Anzeigen, Herunterladen, Löschen)
- Statusanzeige für jedes Dokument

**Hauptmerkmale:**
- **Erweiterte Filterung**: Fortschrittliche Möglichkeiten zur Dokumentfilterung nach mehreren Kriterien
- **Batch-Operationen**: Aktionen für mehrere Dokumente gleichzeitig
- **Verbesserte Metadatenanzeige**: Erweiterte Darstellung von Dokumentmetadaten
- **Exportfunktionen**: Export von Dokumenten und Metadaten
- **Responsive Design**: Optimale Darstellung auf allen Geräten
- **Verbesserte Suchfunktion**: Fortschrittliche Suchoptionen und Ergebnisfilterung
- **Paginierung**: Effizienter Umgang mit großen Dokumentenlisten

### DocumentPreview

Die DocumentPreview-Komponente bietet eine umfassende Vorschau für verschiedene Dokumenttypen.

**Hauptmerkmale:**
- **Multi-Format-Unterstützung**: PDF, Bilder, HTML, Text und Tabellen
- **Zoom- und Navigationsfunktionen**: Zoom, Rotation und Seitennavigation
- **Responsive Design**: Optimale Darstellung auf allen Geräten
- **Tastaturnavigation**: Vollständige Tastaturunterstützung für bessere Zugänglichkeit
- **Metadaten-Anzeige**: Anzeige von Dokumenteninformationen und Metadaten
- **Tabellenexport**: Export von Tabelleninhalten in CSV und JSON

### ErrorDisplay

**Spezialisierte Komponente** zur Anzeige und Behandlung von Fehlern.

**Datei:** `/src/components/admin/document-converter/ErrorDisplay.vue`

**Verantwortlichkeiten:**
- Anzeige von Fehlermeldungen
- Formatierung und Präsentation von Fehlerdetails
- Aktionen zur Fehlerbehebung
- Verbindung zur Fehlerprotokollierung

**Code-Beispiel:**
```vue
<template>
  <div class="error-display" role="alert">
    <div class="error-icon">
      <i class="fas fa-exclamation-triangle"></i>
    </div>
    <div class="error-content">
      <h3>{{ t('documentConverter.errorTitle', 'Ein Fehler ist aufgetreten') }}</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <div v-if="errorDetails" class="error-details">
        <pre>{{ errorDetails }}</pre>
      </div>
      <div class="error-actions">
        <button 
          @click="emit('retry')"
          class="retry-button"
        >
          {{ t('common.retry', 'Erneut versuchen') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // Props und Events
  const props = defineProps<{
    error: Error | string | ErrorObject;
  }>();
  
  const emit = defineEmits<{
    (e: 'retry'): void;
  }>();
  
  // Berechnete Eigenschaften
  const errorMessage = computed<string>(() => {
    if (typeof props.error === 'string') {
      return props.error;
    } else if (isErrorObject(props.error)) {
      return props.error.message;
    }
    return props.error.message || 'Unbekannter Fehler';
  });
  
  const errorDetails = computed<string | null>(() => {
    if (typeof props.error === 'object' && 'stack' in props.error) {
      return props.error.stack;
    } else if (isErrorObject(props.error) && props.error.details) {
      return typeof props.error.details === 'string' 
        ? props.error.details
        : JSON.stringify(props.error.details, null, 2);
    }
    return null;
  });
  
  // Hilfsfunktionen
  function isErrorObject(error: any): error is ErrorObject {
    return typeof error === 'object' && 'message' in error && 'code' in error;
  }
</script>
```

## 4. State-Management

### DocumentConverterStore

**Zentraler Pinia-Store** für die Verwaltung des Dokumentenkonverter-Zustands.

**Datei:** `/src/stores/documentConverter.ts`

**Hauptfunktionen:**
- Verwaltung des gesamten Dokumentenkonverter-Zustands
- Kommunikation mit dem Backend über die API
- Koordination der Konvertierungsprozesse
- Fehlerbehandlung und Wiederherstellung

**State:**
```typescript
interface DocumentConverterState {
  // Status
  isInitialized: boolean;
  isLoading: boolean;
  isUploading: boolean;
  isConverting: boolean;
  error: Error | null;
  
  // Daten
  documents: ConversionResult[];
  selectedDocumentId: string | null;
  
  // Fortschritt
  uploadProgress: number;
  conversionProgress: number;
  conversionStep: string;
  estimatedTimeRemaining: number;
  
  // Aktiver Konvertierungsvorgang
  activeConversionId: string | null;
  
  // Zeitstempel
  lastUpdated: Date | null;
}
```

**Getters:**
```typescript
// Berechnete Eigenschaften
const selectedDocument = computed(() => 
  selectedDocumentId.value 
    ? documents.value.find(doc => doc.id === selectedDocumentId.value) 
    : null
);

const hasDocuments = computed(() => documents.value.length > 0);

const documentsByType = computed(() => {
  const result: Record<string, ConversionResult[]> = {};
  documents.value.forEach(doc => {
    const type = doc.originalFormat || 'unknown';
    if (!result[type]) result[type] = [];
    result[type].push(doc);
  });
  return result;
});
```

**Actions:**
```typescript
// Initialisierung
async function initialize(): Promise<void>;

// Dokument hochladen
async function uploadDocument(file: File): Promise<string | null>;

// Dokument konvertieren
async function convertDocument(
  documentId: string, 
  settings?: Partial<ConversionSettings>
): Promise<boolean>;

// Konvertierung abbrechen
async function cancelConversion(documentId: string): Promise<void>;

// Dokument löschen
async function deleteDocument(documentId: string): Promise<boolean>;

// Dokument auswählen
function selectDocument(documentId: string): void;

// Auswahl zurücksetzen
function clearSelection(): void;
```

### API-Service-Architektur

Die Kommunikation mit dem Backend wurde grundlegend überarbeitet und folgt nun einem mehrschichtigen Ansatz:

1. **DocumentConverterService**: Die Basis-Implementierung, die direkt mit der API kommuniziert
2. **DocumentConverterServiceWrapper**: Erweitert den Basis-Service um verbesserte Fehlerbehandlung und standardisierte Fehlerformate
3. **DocumentConverterStore**: Verwendet den ServiceWrapper für alle API-Interaktionen und zentrale Fehlerbehandlung

Diese Architektur bietet zahlreiche Vorteile:

- **Standardisierte Fehlerbehandlung**: Alle API-Fehler werden in ein einheitliches Format konvertiert
- **Intelligente Fehlererkennung**: Der Fehlertyp wird automatisch durch Analyse der Fehlermeldung erkannt
- **Benutzerfreundliche Fehlermeldungen**: Kontextbezogene Lösungsvorschläge und Hilfestellungen
- **Detailliertes Logging**: Umfassendes Logging für Diagnose und Fehlersuche
- **Verbessertes Fehler-Reporting**: Strukturierte Fehlerinformationen für Monitoring und Analyse
- **Einheitliches Error-Handling**: Konsistente Fehlerbehandlung in allen Komponenten

**DocumentConverterService Interface:**
```typescript
export interface IDocumentConverterService {
  uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<string>;
  convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
    onProgress?: (progress: number, step: string, timeRemaining: number) => void
  ): Promise<ConversionResult>;
  getDocuments(): Promise<ConversionResult[]>;
  getDocument(documentId: string): Promise<ConversionResult>;
  deleteDocument(documentId: string): Promise<void>;
  downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;
  getConversionStatus(documentId: string): Promise<ConversionProgress>;
  cancelConversion(documentId: string): Promise<void>;
}
```

**DocumentConverterServiceWrapper:**
```typescript
export interface ConversionError extends ErrorObject {
  documentId?: string;        // Betroffene Dokument-ID
  originalError?: Error;      // Ursprünglicher Fehler
  timestamp: Date;            // Zeitstempel
  message: string;            // Benutzerfreundliche Fehlermeldung
  code: string;               // Fehlercode (z.B. 'UPLOAD_FAILED')
  type: string;               // Fehlertyp (z.B. 'network', 'server')
  resolution?: string;        // Lösungsvorschlag
  helpItems?: string[];       // Hilfestellungen
  details?: string;           // Technische Details
}

class DocumentConverterServiceWrapper {
  // Dokument hochladen mit verbesserter Fehlerbehandlung
  public async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<string> {
    try {
      this.logger.info(`Starte Upload für ${file.name} (${formatFileSize(file.size)})`);
      return await this.service.uploadDocument(file, onProgress);
    } catch (error) {
      const convertedError = this.convertError(error, 'UPLOAD_FAILED', 'network', {
        message: `Fehler beim Hochladen der Datei ${file.name}`,
        resolution: 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
        helpItems: [
          'Stellen Sie sicher, dass Ihre Internetverbindung stabil ist',
          'Versuchen Sie, die Datei in einem anderen Format zu speichern',
          'Reduzieren Sie die Dateigröße, falls möglich'
        ]
      });

      this.logger.error('Fehler beim Hochladen:', convertedError);
      throw convertedError;
    }
  }

  // Standardisierte Fehlerkonvertierung
  private convertError(
    error: unknown,
    code: string,
    type: 'network' | 'format' | 'server' | 'permission' | 'validation' | 'timeout' | 'unknown' = 'unknown',
    additional: Partial<ConversionError> = {}
  ): ConversionError;
}
```

### Persistenz und Caching

Die Persistenz im DocumentConverterStore ist mehrschichtig implementiert:

1. **Zustandspersistenz** mit Pinia-Plugin:
   ```typescript
   // Konfiguration im Store
   persist: {
     key: 'nscale-doc-converter',
     storage: localStorage,
     paths: [
       'documents',
       'selectedDocumentId',
       'conversionSettings',
       'lastUpdated'
     ]
   }
   ```

2. **API-Caching** mit lokalem Browser-Cache:
   - Ergebnisse von GET-Anfragen werden im Cache gespeichert
   - Cache-Kontrolle über HTTP-Header
   - Manuelle Invalidierung bei Zustandsänderungen

3. **Offline-Unterstützung**:
   - Basisdaten bleiben im persistierten Zustand verfügbar
   - Metadaten konvertierter Dokumente sind offline verfügbar
   - Volltextinhalte werden bei Bedarf nachgeladen

## 5. Fehlerbehandlung

Der Dokumentenkonverter implementiert eine robuste Fehlerbehandlungsstrategie auf mehreren Ebenen:

### Standardisiertes Fehlerformat

```typescript
export interface ErrorObject {
  message: string;            // Benutzerfreundliche Fehlermeldung
  code: string;               // Fehlercode (z.B. 'UPLOAD_FAILED')
  type: string;               // Fehlertyp (z.B. 'network', 'server')
  timestamp?: Date;           // Zeitstempel
  details?: string | any;     // Technische Details für Entwickler
  resolution?: string;        // Lösungsvorschlag für Benutzer
  helpItems?: string[];       // Liste von Hilfestellungen
  retry?: boolean;            // Gibt an, ob ein Wiederholungsversuch möglich ist
}
```

### API-Fehlerbehandlung

Die folgende Tabelle zeigt die verfügbaren API-Endpunkte und ihre spezifische Fehlerbehandlung durch den DocumentConverterServiceWrapper:

| Endpunkt                        | Methode | Beschreibung                    | Fehlerbehandlung | Lösungsvorschläge |
|---------------------------------|---------|--------------------------------|-----------------|-------------------|
| `/api/documents/upload`         | POST    | Lädt ein Dokument hoch         | Netzwerk, Format, Größe | Internetverbindung prüfen, Dateiformat konvertieren, Dateigröße reduzieren |
| `/api/documents/{id}/convert`   | POST    | Startet Konvertierungsprozess  | Server, Format, Timeout | Mit anderem Format versuchen, Server-Status prüfen, kleinere Datei versuchen |
| `/api/documents/{id}/status`    | GET     | Ruft Konvertierungsstatus ab   | Server, Nicht gefunden | Konvertierung neu starten, Server-Status prüfen |
| `/api/documents`                | GET     | Ruft alle Dokumente ab         | Server, Berechtigung | Berechtigungen prüfen, Neuanmeldung versuchen |
| `/api/documents/{id}`           | GET     | Ruft Dokumentdetails ab        | Server, Nicht gefunden | Dokument erneut hochladen, Dokument-ID prüfen |
| `/api/documents/{id}/content`   | GET     | Ruft konvertierten Inhalt ab   | Server, Formatierung | Erneute Konvertierung mit anderen Einstellungen |
| `/api/documents/{id}/download`  | GET     | Lädt Dokument herunter         | Netzwerk, Nicht gefunden | Internetverbindung prüfen, Dokument erneut suchen |
| `/api/documents/{id}`           | DELETE  | Löscht ein Dokument            | Server, Berechtigung | Berechtigungen prüfen, Administrator kontaktieren |
| `/api/documents/{id}/cancel`    | POST    | Bricht Konvertierung ab        | Server, Status | Seite neu laden, erneut versuchen |
| `/api/documents/upload/multiple`| POST    | Lädt mehrere Dokumente hoch    | Netzwerk, Format, Größe | Einzeln hochladen, Formate prüfen, Größe reduzieren |

### Fehlerwiederherstellung

Der Dokumentenkonverter implementiert mehrere Strategien zur Wiederherstellung nach Fehlern:

1. **Automatische Wiederholungsversuche**: Bei transienten Fehlern werden Operationen automatisch wiederholt
2. **Fallback-Mechanismen**: Bei kritischen Fehlern wird auf eine vereinfachte Version zurückgefallen
3. **Fehlerbehebungsvorschläge**: Kontextbezogene Lösungsvorschläge für Benutzer
4. **Zustandswiederherstellung**: Automatische Wiederherstellung des letzten validen Zustands nach Fehlern

```typescript
// Beispiel für einen Wiederholungsversuch bei einem transienten Fehler
async function uploadDocumentWithRetry(file: File, retries = 3): Promise<string | null> {
  try {
    return await documentService.uploadDocument(file);
  } catch (error) {
    if (isTransientError(error) && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Kurze Verzögerung
      return uploadDocumentWithRetry(file, retries - 1);
    }
    throw error;
  }
}
```

## 6. Barrierefreiheit

Der Dokumentenkonverter wurde mit besonderem Augenmerk auf Barrierefreiheit entwickelt:

### Tastaturnavigation

Alle Funktionen des Dokumentenkonverters sind vollständig über die Tastatur bedienbar:

- Der Upload-Bereich kann mit Tab fokussiert und mit der Leertaste oder Enter-Taste aktiviert werden
- Alle Aktionen in der Dokumentenliste sind per Tastatur erreichbar
- Die Dokumentvorschau unterstützt Tastaturkürzel für Zoom, Navigation und andere Funktionen
- Eindeutige Fokus-Indikatoren zeigen dem Benutzer, wo er sich gerade befindet

### ARIA-Attribute

Die Komponenten verwenden entsprechende ARIA-Attribute, um die Zugänglichkeit für Screenreader zu verbessern:

- Die FileUpload-Komponente hat `role="button"` und `aria-label="Dateien hochladen"`
- Die Fortschrittsanzeige nutzt `role="progressbar"` mit den passenden `aria-valuenow` und `aria-valuemax` Attributen
- Die Dokumentenliste verwendet semantisch korrekte Tabellenstrukturen mit entsprechenden ARIA-Attributen
- Die ErrorDisplay-Komponente nutzt `role="alert"`, um Fehlermeldungen auch für Screenreader erkennbar zu machen

### Farbkontrast und Visuelles Design

Das Design des Dokumentenkonverters erfüllt die WCAG 2.1 AA Anforderungen für Kontrast:

- Text hat einen Kontrast von mindestens 4.5:1 gegenüber dem Hintergrund
- Interaktive Elemente haben einen Kontrast von mindestens 3:1 zum Hintergrund
- Farbkombinationen berücksichtigen Farbenblindheit

### Responsive Design

Die Komponenten passen sich verschiedenen Bildschirmgrößen und -orientierungen an:

- Optimierte Layouts für Desktop, Tablet und Mobilgeräte
- Anpassungen für verschiedene Eingabemethoden (Maus, Touch, Stift)
- Barrierefreiheit bleibt auch auf kleinen Bildschirmen gewährleistet

## 7. Unterstützte Dateiformate

Der Dokumentenkonverter unterstützt die folgenden Dateiformate:

| Dateityp | MIME-Typ | Beschreibung |
|----------|----------|-------------|
| `pdf` | `application/pdf` | PDF-Dokument |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Word-Dokument (neueres Format) |
| `doc` | `application/msword` | Word-Dokument (älteres Format) |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Excel-Tabelle (neueres Format) |
| `xls` | `application/vnd.ms-excel` | Excel-Tabelle (älteres Format) |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | PowerPoint-Präsentation (neueres Format) |
| `ppt` | `application/vnd.ms-powerpoint` | PowerPoint-Präsentation (älteres Format) |
| `html`, `htm` | `text/html` | HTML-Dokument |
| `txt` | `text/plain` | Textdatei |
| `csv` | `text/csv` | CSV-Datei |

## 8. Integration und Erweiterung

### Einbindung in Vue-Komponenten

```vue
<template>
  <div>
    <DocumentsView />
  </div>
</template>

<script setup lang="ts">
import DocumentsView from '@/views/DocumentsView.vue';
</script>
```

### Verwendung des Stores

```typescript
import { useDocumentConverterStore } from '@/stores/documentConverter';

const documentConverterStore = useDocumentConverterStore();

// Store initialisieren und Dokumente laden
await documentConverterStore.initialize();

// Dokument hochladen
const file = new File(['...'], 'document.pdf', { type: 'application/pdf' });
const documentId = await documentConverterStore.uploadDocument(file);

// Konvertierungsprozess starten
await documentConverterStore.convertDocument(documentId);

// Dokument löschen
await documentConverterStore.deleteDocument(documentId);
```

### Hinzufügen neuer Dateiformate

1. Erweitern Sie den `SupportedFormat` Typ in `documentConverter.ts`:

```typescript
export type SupportedFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt' | 'neu';
```

2. Aktualisieren Sie die `isFormatSupported`-Methode im `DocumentConverterService`:

```typescript
public isFormatSupported(format: string): format is SupportedFormat {
  const supportedFormats: SupportedFormat[] = [
    'pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt', 'neu'
  ];
  return supportedFormats.includes(format as SupportedFormat);
}
```

3. Fügen Sie ein passendes Icon in `getFormatIcon` in `DocumentList.vue` hinzu.

### Anpassen der Konvertierungseinstellungen

Die Konvertierungseinstellungen können über das `ConversionSettings`-Interface in `documentConverter.ts` angepasst werden:

```typescript
export interface ConversionSettings {
  preserveFormatting: boolean;
  extractMetadata: boolean;
  extractTables: boolean;
  ocrEnabled?: boolean;
  ocrLanguage?: string;
  maxPages?: number;
  // Neue Einstellungen hier hinzufügen
}
```

## 9. Limitierungen und bekannte Probleme

### Aktuelle Einschränkungen

- Maximale Dateigröße: 20 MB für Standard-Uploads
- Die Konvertierungsdauer kann je nach Dateigröße und -komplexität variieren
- Die Tabellenerkennung funktioniert am besten bei einfachen Tabellenstrukturen
- OCR-Funktionalität für Bilder und gescannte Dokumente ist noch in Entwicklung

### Bekannte Probleme

1. **Browser-Kompatibilität**
   - Drag & Drop funktioniert in älteren Browsern nicht zuverlässig
   - Lösung: Progressive Enhancement mit Fallback auf klassischen Datei-Dialog

2. **Große Dateien**
   - Browser-Limitierungen bei sehr großen Dateien (>100MB)
   - Lösung: Implementierung eines Chunk-Upload-Verfahrens (geplant für künftige Version)

3. **Offline-Funktionalität**
   - Begrenzte Unterstützung in Offline-Szenarien
   - Lösung: Service Worker für Offline-Caching (in Konzeptphase)

4. **Internet Explorer-Unterstützung**
   - Keine volle Unterstützung für IE11
   - Lösung: Legacy-Fallback für IE11-Benutzer

5. **Leistungsoptimierung**
   - Verzögerungen bei der Verarbeitung komplexer PDF-Dokumente
   - Lösung: Worker-Thread-Implementierung für Vorschauverarbeitung (in Entwicklung)

## 10. Zusammenfassung

Der Dokumentenkonverter stellt eine zentrale Komponente des nscale DMS Assistenten dar, die dank der Migration zu Vue 3 Single File Components nun moderner, leistungsfähiger und besser wartbar ist. Die neue Implementierung bietet:

- **Verbesserte Benutzerfreundlichkeit** mit Drag & Drop-Unterstützung und Mehrfachauswahl
- **Robuste Fehlerbehandlung** mit kontextbezogenen Lösungsvorschlägen
- **Optimierte Leistung** durch effizientere Zustandsverwaltung und Rendering
- **Vollständige Barrierefreiheit** für alle Benutzer
- **Erweiterbare Architektur** für zukünftige Funktionen

Die Komponente ist vollständig in das Feature-Toggle-System integriert, was eine sichere, schrittweise Migration ermöglicht. Zukünftige Entwicklungen werden sich auf erweiterte Funktionalität, Leistungsoptimierung und verbesserte Offline-Unterstützung konzentrieren.

---

Zuletzt aktualisiert: 10.05.2025