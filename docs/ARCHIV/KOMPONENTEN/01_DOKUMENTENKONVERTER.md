# Dokumentenkonverter

**Version:** 2.1.0 | **Letzte Aktualisierung:** 14.05.2025 | **Status:** Aktiv in Entwicklung

## 1. Übersicht

Der Dokumentenkonverter ist eine zentrale Komponente der nscale Assist App, die verschiedene Dokumentformate (PDF, DOCX, XLSX, PPTX, HTML, TXT) in durchsuchbaren Text konvertiert. Diese Komponente wurde als robuste Vue 3 SFC-Komponente mit mehrschichtigen Fallback-Mechanismen implementiert und befindet sich aktuell in der Migrationsphase von Vanilla JavaScript zu Vue 3 (ca. 50% abgeschlossen).

### Hauptmerkmale

- Konvertierung verschiedener Dokumentformate in durchsuchbaren Text
- Benutzerfreundliche Oberfläche mit Drag & Drop-Funktionalität
- Echtzeit-Fortschrittsanzeige während der Konvertierung
- Robuste Fehlerbehandlung mit Fallback-Mechanismen
- Integration in das nscale DMS-System

### Migrationsstand

Die Vue 3 SFC-Migration des Dokumentenkonverters ist Teil der schrittweisen Modernisierung der nscale Assist Anwendung. Derzeit befinden wir uns in Phase 2 des Migrationsprozesses:

- ✅ **Phase 1**: Analyse und Vorbereitung (abgeschlossen)
- 🔄 **Phase 2**: Implementierung von Kernkomponenten (in Bearbeitung, ca. 50% abgeschlossen)
- ⏳ **Phase 3**: Integration und vollständige Testabdeckung (geplant)
- ⏳ **Phase 4**: Produktivstellung und Legacy-Code-Entfernung (geplant)

## 2. Architektur

### 2.1 Frontendseitige Komponentenarchitektur

Der Dokumentenkonverter folgt einer hierarchischen Struktur, bei der jede Komponente eine klar definierte Verantwortlichkeit hat:

```
src/components/admin/document-converter/
├── DocConverterContainer.vue     # Hauptcontainer-Komponente
├── FileUpload.vue                # Datei-Upload-Komponente
├── ConversionProgress.vue        # Fortschrittsanzeige
├── DocumentList.vue              # Liste konvertierter Dokumente
├── ConversionResult.vue          # Ergebnisanzeige
├── DocumentPreview.vue           # Dokumentvorschau
├── ErrorDisplay.vue              # Fehleranzeige
└── FallbackConverter.vue         # Fallback-Komponente
```

### 2.2 Datenfluss zwischen Komponenten

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

### 2.3 Backend-Architektur

Der Dokumentenkonverter ist im Backend modular aufgebaut:

```
doc_converter/
├── converters/         # Format-spezifische Konverter
│   ├── pdf_converter.py        # PDF-Konvertierung
│   ├── docx_converter.py       # DOCX-Konvertierung
│   ├── xlsx_converter.py       # Excel-Konvertierung
│   ├── pptx_converter.py       # PowerPoint-Konvertierung
│   └── html_converter.py       # HTML-Konvertierung
├── data/
│   ├── inventory/      # Inventar konvertierter Dokumente
│   └── temp/           # Temporäre Dateien während Konvertierung
├── inventory/          # Inventarverwaltung
│   ├── inventory_scanner.py    # Scannt nach konvertierbaren Dokumenten
│   ├── document_classifier.py  # Klassifiziert Dokumente nach Inhalt
│   └── report_generator.py     # Generiert Konvertierungsberichte
├── processing/         # Verarbeitungspipeline
│   ├── cleaner.py      # Bereinigt extrahierten Text 
│   ├── structure_fixer.py      # Rekonstruiert Dokumentstruktur
│   ├── table_formatter.py      # Formatiert erkannte Tabellen 
│   └── validator.py    # Validiert Konvertierungsergebnisse
└── utils/              # Hilfsfunktionen
    ├── file_utils.py   # Dateioperationen
    ├── config.py       # Konfigurationsmanagement
    └── logger.py       # Logging-Funktionalitäten
```

### 2.4 API-Integration

Der Dokumentenkonverter kommuniziert mit dem Backend über einen spezialisierten Service mit einem Wrapper für verbesserte Fehlerbehandlung:

#### 2.4.1 DocumentConverterService

Die Kernimplementierung stellt die direkte Verbindung zur API bereit:

```typescript
// Auszug aus src/services/api/DocumentConverterService.ts
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

#### 2.4.2 DocumentConverterServiceWrapper

Der neue `DocumentConverterServiceWrapper` erweitert den Basis-Service um folgende Funktionen:

- **Standardisierte Fehlerbehandlung**: Konvertiert unterschiedliche Fehlerformate in ein einheitliches `ConversionError`-Format
- **Intelligente Fehlererkennung**: Analysiert Fehlermeldungen, um den Fehlertyp automatisch zu bestimmen
- **Benutzerfreundliche Fehlermeldungen**: Liefert kontextbezogene Lösungsvorschläge und Hilfestellungen
- **Detailliertes Logging**: Protokolliert alle Operationen und Fehler für bessere Diagnose
- **Verbesserte Fortschrittsüberwachung**: Fortschrittsweitergabe für Uploads und Konvertierungen

```typescript
// Auszug aus src/services/api/DocumentConverterServiceWrapper.ts
export interface ConversionError extends ErrorObject {
  documentId?: string;
  originalError?: Error;
  timestamp: Date;
}

class DocumentConverterServiceWrapper {
  // ...

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

  // Weitere Methoden...
}
```

#### 2.4.3 API-Endpunkte

| Endpunkt                        | Methode | Beschreibung                    |
|---------------------------------|---------|--------------------------------|
| `/api/documents/upload`         | POST    | Lädt ein Dokument hoch         |
| `/api/documents/{id}/convert`   | POST    | Startet Konvertierungsprozess  |
| `/api/documents/{id}/status`    | GET     | Ruft Konvertierungsstatus ab   |
| `/api/documents`                | GET     | Ruft alle Dokumente ab         |
| `/api/documents/{id}`           | GET     | Ruft Dokumentdetails ab        |
| `/api/documents/{id}/content`   | GET     | Ruft konvertierten Inhalt ab   |
| `/api/documents/{id}/download`  | GET     | Lädt Dokument herunter         |
| `/api/documents/{id}`           | DELETE  | Löscht ein Dokument            |
| `/api/documents/{id}/cancel`    | POST    | Bricht eine Konvertierung ab   |
| `/api/documents/upload/multiple`| POST    | Lädt mehrere Dokumente hoch    |

## 3. Komponenten-Dokumentation

### 3.1 DocConverterContainer

**Hauptkomponente** des Dokumentenkonverters, die als Koordinator für alle Unterkomponenten dient.

**Datei:** `/src/components/admin/document-converter/DocConverterContainer.vue`

**Verantwortlichkeiten:**
- Koordination der Unterkomponenten
- Verwaltung des Konvertierungsprozesses
- Fehlerbehandlung auf oberster Ebene
- Lebenszyklus-Management

**Wichtige Props und Events:**
- Keine externen Props (verwendet Feature-Toggles zur Aktivierung)
- Keine externen Events (interne Kommunikation über Store)

**Implementierungsgrad:** 75%

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
      <!-- ... Unterkomponenten ... -->
    </div>
  </div>
</template>

<script setup lang="ts">
  // Composables
  const featureToggles = useFeatureToggles();
  const { t } = useI18n();
  const store = useDocumentConverterStore();
  
  // Reaktiver Zustand
  const { error, isConverting, /* ... */ } = toRefs(store);
  
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
  
  // ... Weitere Logik ...
</script>
```

### 3.2 FileUpload

**Spezialisierte Komponente** für den Dateiupload mit Drag & Drop und Mehrfachauswahl.

**Datei:** `/src/components/admin/document-converter/FileUpload.vue`

**Verantwortlichkeiten:**
- Dateiauswahl über Dialog oder Drag & Drop
- Validierung von Dateitypen und -größen
- Anzeige ausgewählter Dateien vor dem Upload
- Fortschrittsanzeige während des Uploads

**Wichtige Props und Events:**
- `isUploading: boolean` - Gibt an, ob ein Upload läuft
- `uploadProgress: number` - Fortschritt des Uploads (0-100)
- `maxFileSize: number` - Maximale Dateigröße in Bytes
- `allowedExtensions: string[]` - Liste erlaubter Dateierweiterungen
- `@upload` - Emittiert, wenn Dateien hochgeladen werden sollen
- `@cancel` - Emittiert, wenn der Upload abgebrochen wird

**Implementierungsgrad:** 80%

**Barrierefreiheitsmerkmale:**
- Vollständige Keyboard-Navigation
- ARIA-Attribute für Screenreader
- Fokus-Management
- Statusmeldungen für assistive Technologien

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
    <!-- Ausgewählte Dateien -->
    <!-- Aktions-Buttons -->
  </div>
</template>

<script setup lang="ts">
  // Props und Events
  const props = withDefaults(defineProps<FileUploadProps>(), {
    isUploading: false,
    uploadProgress: 0,
    maxFileSize: 50 * 1024 * 1024,
    allowedExtensions: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']
  });
  
  const emit = defineEmits<{
    (e: 'upload', files: File[]): void;
    (e: 'cancel'): void;
  }>();
  
  // Interner Status
  const isDragging = ref<boolean>(false);
  const selectedFiles = ref<SelectedFile[]>([]);
  
  // Drag & Drop Handler
  function onDragOver(event: DragEvent): void { /* ... */ }
  function onDragLeave(event: DragEvent): void { /* ... */ }
  function onDrop(event: DragEvent): void { /* ... */ }
  
  // Dateivalidierung
  function validateFile(file: File): boolean { /* ... */ }
  
  // ... Weitere Logik ...
</script>
```

### 3.3 ConversionProgress

**Spezialisierte Komponente** zur Anzeige des Konvertierungsfortschritts.

**Datei:** `/src/components/admin/document-converter/ConversionProgress.vue`

**Verantwortlichkeiten:**
- Anzeige des Konvertierungsfortschritts
- Darstellung des aktuellen Konvertierungsschritts
- Anzeige der geschätzten verbleibenden Zeit
- Möglichkeit zum Abbrechen der Konvertierung

**Wichtige Props und Events:**
- `progress: number` - Fortschritt in Prozent (0-100)
- `currentStep: string` - Beschreibung des aktuellen Schritts
- `estimatedTime: number` - Geschätzte verbleibende Zeit in Sekunden
- `@cancel` - Emittiert, wenn die Konvertierung abgebrochen werden soll

**Implementierungsgrad:** 85%

**Hauptfunktionen:**
- Anzeige des Fortschritts in Prozent mit Fortschrittsbalken
- Berechnung und Anzeige der verbleibenden Zeit
- Anzeige des aktuellen Konvertierungsschritts
- Abbrechen-Button zum Stoppen der Konvertierung
- Vollständige Barrierefreiheit durch ARIA-Attribute

**Code-Beispiel:**
```vue
<template>
  <div class="conversion-progress" role="progressbar" :aria-valuenow="progress">
    <div class="progress-bar">
      <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
    </div>
    <div class="progress-info">
      <div class="progress-step">{{ currentStep }}</div>
      <div class="progress-time" v-if="estimatedTime > 0">
        {{ formatTime(estimatedTime) }} verbleibend
      </div>
    </div>
    <button 
      class="cancel-button" 
      @click="emit('cancel')"
      aria-label="Konvertierung abbrechen"
    >
      Abbrechen
    </button>
  </div>
</template>

<script setup lang="ts">
  // Props und Events
  const props = defineProps<{
    progress: number;
    currentStep: string;
    estimatedTime: number;
  }>();
  
  const emit = defineEmits<{
    (e: 'cancel'): void;
  }>();
  
  // Formatierungsfunktion
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
</script>
```

### 3.4 DocumentList

**Komponente zur Anzeige** konvertierter Dokumente mit Interaktionsmöglichkeiten.

**Datei:** `/src/components/admin/document-converter/DocumentList.vue`

**Verantwortlichkeiten:**
- Anzeige der Liste konvertierter Dokumente
- Sortier- und Filterfunktionen
- Aktionen für jedes Dokument (Anzeigen, Herunterladen, Löschen)
- Statusanzeige für jedes Dokument

**Wichtige Props und Events:**
- `documents: ConversionResult[]` - Liste der konvertierten Dokumente
- `selectedDocument: ConversionResult | null` - Aktuell ausgewähltes Dokument
- `loading: boolean` - Gibt an, ob Dokumente geladen werden
- `@select` - Emittiert, wenn ein Dokument ausgewählt wird
- `@view` - Emittiert, wenn ein Dokument angezeigt werden soll
- `@download` - Emittiert, wenn ein Dokument heruntergeladen werden soll
- `@delete` - Emittiert, wenn ein Dokument gelöscht werden soll

**Implementierungsgrad:** 75%

**Hauptfunktionen:**
- Tabellarische Anzeige aller konvertierten Dokumente
- Sortierung nach verschiedenen Kriterien (Name, Datum, Größe)
- Filterung nach Dokumenttypen und Suchbegriffen
- Paginierung für große Dokumentenlisten
- Aktionen für jedes Dokument (Anzeigen, Herunterladen, Löschen)

**Code-Beispiel:**
```vue
<template>
  <div class="document-list">
    <h3>{{ t('documentConverter.documentList', 'Konvertierte Dokumente') }}</h3>
    
    <!-- Ladeindikator -->
    <div v-if="loading" class="document-list-loading">
      <!-- Spinner oder Ladeanzeige -->
    </div>
    
    <!-- Leere Liste -->
    <div v-else-if="documents.length === 0" class="document-list-empty">
      {{ t('documentConverter.noDocuments', 'Keine Dokumente vorhanden') }}
    </div>
    
    <!-- Dokumente -->
    <div v-else class="document-list-table">
      <table>
        <!-- Tabellenkopf -->
        <thead><!-- ... --></thead>
        
        <!-- Tabelleninhalt -->
        <tbody>
          <tr 
            v-for="doc in documents" 
            :key="doc.id"
            :class="{ 'selected': selectedDocument?.id === doc.id }"
            @click="emit('select', doc.id)"
          >
            <!-- Dokumentdetails und Aktionen -->
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
  // Props und Events
  const props = defineProps<{
    documents: ConversionResult[];
    selectedDocument: ConversionResult | null;
    loading: boolean;
  }>();
  
  const emit = defineEmits<{
    (e: 'select', id: string): void;
    (e: 'view', id: string): void;
    (e: 'download', id: string): void;
    (e: 'delete', id: string): void;
  }>();
  
  // ... Weitere Logik ...
</script>
```

### 3.5 ErrorDisplay

**Spezialisierte Komponente** zur Anzeige und Behandlung von Fehlern.

**Datei:** `/src/components/admin/document-converter/ErrorDisplay.vue`

**Verantwortlichkeiten:**
- Anzeige von Fehlermeldungen
- Formatierung und Präsentation von Fehlerdetails
- Aktionen zur Fehlerbehebung
- Verbindung zur Fehlerprotokollierung

**Wichtige Props und Events:**
- `error: Error | string` - Der anzuzeigende Fehler
- `details: string` - Zusätzliche Fehlerdetails
- `error-type: string` - Typ des Fehlers (Netzwerk, Format, Server, Berechtigung)
- `@retry` - Emittiert, wenn ein Wiederholungsversuch gestartet werden soll
- `@support` - Emittiert, wenn der Support kontaktiert werden soll
- `@fallback` - Emittiert, wenn die Fallback-Version verwendet werden soll

**Implementierungsgrad:** 90%

**Fehlertypen:**
- Netzwerkfehler
- Formatfehler
- Serverfehler
- Berechtigungsfehler

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
    error: Error | string;
  }>();
  
  const emit = defineEmits<{
    (e: 'retry'): void;
  }>();
  
  // Berechnete Eigenschaften
  const errorMessage = computed<string>(() => {
    if (typeof props.error === 'string') {
      return props.error;
    }
    return props.error.message || 'Unbekannter Fehler';
  });
  
  const errorDetails = computed<string | null>(() => {
    if (typeof props.error === 'object' && props.error.stack) {
      return props.error.stack;
    }
    return null;
  });
</script>
```

## 4. Store-Dokumentation

### 4.1 DocumentConverterStore

Der `documentConverter` Store verwaltet den Zustand und die Logik für die Dokumentenkonvertierungsfunktionen der Anwendung. Er ist als Pinia-Store implementiert und bietet eine zentrale Schnittstelle für alle Dokumentenkonverter-Komponenten.

**Datei:** `/src/stores/documentConverter.ts`

**Hauptzustand (State):**

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

**Wichtige Datenstrukturen:**

```typescript
// Konvertierungsansicht
type ConverterView = 'upload' | 'conversion' | 'results' | 'list';

// Konvertierungsstatus
type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'completed' | 'error';

// Hochgeladene Datei
interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  uploadedAt: Date;
  error?: string;
}

// Fehler im Konverter
interface ConverterError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Konvertierungsergebnis
interface ConversionResult {
  id: string;
  originalName: string;
  originalFormat: string;
  size: number;
  content?: string;
  uploadedAt?: Date;
  convertedAt?: Date;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  metadata?: DocumentMetadata;
}
```

**Hauptaktionen (Actions):**

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

// Ansicht ändern
function setView(view: ConverterView): void;

// Einstellungen aktualisieren
function updateSettings(settings: Partial<ConversionSettings>): void;

// Status zurücksetzen
function resetState(): void;

// Dokumente aktualisieren
async function refreshDocuments(): Promise<void>;
```

**Berechnete Eigenschaften (Getters):**

```typescript
// Prüft, ob Dokumente vorhanden sind
const hasDocuments = computed(() => documents.value.length > 0);

// Gibt das ausgewählte Dokument zurück
const selectedDocument = computed(() => 
  selectedDocumentId.value 
    ? documents.value.find(doc => doc.id === selectedDocumentId.value) 
    : null
);

// Gibt den Konvertierungsstatus zurück
const conversionStatus = computed<ConversionStatus>(() => {
  if (isUploading.value) return 'uploading';
  if (isConverting.value) return 'converting';
  if (error.value) return 'error';
  if (documents.value.length > 0) return 'completed';
  return 'idle';
});

// Filtert Dokumente nach Typ oder Status
const filteredDocuments = (filterType: string) => 
  documents.value.filter(doc => 
    doc.originalFormat === filterType || doc.status === filterType
  );

// Gruppiert Dokumente nach Format
const documentsByFormat = computed(() => {
  const result: Record<string, ConversionResult[]> = {};
  documents.value.forEach(doc => {
    const type = doc.originalFormat || 'unknown';
    if (!result[type]) result[type] = [];
    result[type].push(doc);
  });
  return result;
});
```

**Persistenz:**

Der Store ist so konfiguriert, dass bestimmte Teile des Zustands im localStorage gespeichert werden:

- `convertedDocuments`: Liste der konvertierten Dokumente
- `selectedDocumentId`: ID des ausgewählten Dokuments
- `conversionSettings`: Konvertierungseinstellungen
- `lastUpdated`: Zeitstempel der letzten Aktualisierung

```typescript
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

**Beispielverwendung:**

```typescript
// In einer Komponente
const store = useDocumentConverterStore();

// Initialisierung
onMounted(() => {
  store.initialize();
});

// Datei hochladen und konvertieren
async function handleFileUpload(file: File) {
  const documentId = await store.uploadDocument(file);
  if (documentId) {
    await store.convertDocument(documentId);
  }
}

// Dokument löschen
function deleteSelectedDocument() {
  if (store.selectedDocument) {
    store.deleteDocument(store.selectedDocument.id);
  }
}
```

## 5. Robustheitsmechanismen

### 5.1 Mehrschichtige Fallback-Mechanismen

Der Dokumentenkonverter implementiert mehrere Ebenen von Fallback-Mechanismen:

1. **Mehrschichtige UI-Fallbacks**:
   - Primär: Hauptimplementierung mit vollem Funktionsumfang
   - Sekundär: Vereinfachte Version bei Problemen mit der Hauptimplementierung
   - Tertiär: Minimale Implementierung bei schwerwiegenden Problemen

2. **Pfad-Alternativen**:
   - Automatische Bereitstellung von Ressourcen unter verschiedenen Pfaden
   - Dynamische Generierung und Test von Alternativpfaden
   - Selbstheilende Mechanismen

3. **DOM-Überwachung**:
   - Kontinuierliche Überprüfung der DocConverter-Container
   - Automatisches Sichtbarmachen versteckter Elemente
   - Korrektur von DOM-Inkonsistenzen

4. **CSS-Garantie**:
   - Kritisches CSS direkt im HTML eingebettet
   - Inline-Styles für wichtige Komponenten
   - `!important`-Regeln für kritische Anzeigeeigenschaften

### 5.2 Integration mit dem Fallback-Mechanismus

Der Dokumentenkonverter ist vollständig in den Fallback-Mechanismus des nscale DMS Assistant integriert. Dies wird durch drei Hauptkomponenten erreicht:

1. **EnhancedFeatureWrapper**: Wrapping der Dokumentenkonverter-SFC-Komponenten mit dem Feature-Flag `useSfcDocConverter`.
2. **ErrorBoundary**: Integration in jede Unterkomponente des Dokumentenkonverters für granulare Fehlerbehandlung.
3. **Intermediäre Komponenten**: Vereinfachte Versionen der Dokumentenkonverter-Komponenten für einen progressiven Fallback-Mechanismus.

Bei Fehlern in einer SFC-Komponente wird automatisch entweder die intermediäre Version oder die Legacy-Implementierung verwendet, um einen kontinuierlichen Betrieb zu gewährleisten.

### 5.3 Behobene Probleme

1. **Pfadprobleme**:
   - Inkonsistente Pfadstruktur zwischen verschiedenen Umgebungen
   - Lösung: Multi-Path-Strategie mit Ressourcen unter verschiedenen Pfaden
   - Implementierung eines Path-Testers und Path-Loggers für Diagnose

2. **DOM-Verfügbarkeit**:
   - Skripte versuchten, auf DOM-Elemente zuzugreifen, bevor diese bereit waren
   - Lösung: Verzögerte Initialisierung und DOM-Überwachung

3. **Endlosschleifen**:
   - Rekursive Initialisierungsversuche führten zu Endlosschleifen
   - Lösung: Limitierung von Intervallen und Timeouts, klare Initialisierungsflags

4. **Fehlerbehandlung**:
   - Unzureichende Fehlerbehandlung führte zu Abstürzen
   - Lösung: Umfassende Try-Catch-Mechanismen und graceful degradation

## 6. Konvertierungsfunktionalität

### 6.1 Unterstützte Formate

Der Dokumentenkonverter unterstützt folgende Formate:

- PDF (.pdf)
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx)
- Microsoft PowerPoint (.pptx)
- HTML (.html, .htm)
- Text (.txt)

### 6.2 Konvertierungsoptionen

- Extraktion von Text mit Struktur
- Erkennung von Tabellen
- Erkennung von Überschriften und Abschnitten
- Erhalt von Formatierung (optional)
- Metadata-Extraktion
- OCR für Bilder und gescannte Dokumente (geplant)

### 6.3 Ausgabeformate

- Reiner Text
- Strukturierter Text (JSON)
- HTML mit Formatierung
- Durchsuchbares PDF

## 7. Testing

Alle Komponenten des Dokumentenkonverters sind umfassend mit Unit-Tests abgedeckt. Die Tests prüfen:

- Korrektes Rendering der UI-Elemente
- Benutzereingaben und -interaktionen
- Korrekte Verarbeitung von Props und Events
- Edge Cases und Fehlerszenarien
- Integration mit dem Store und anderen Services

**Testdateien:**
- `ErrorDisplay.spec.ts`
- `ConversionProgress.spec.ts`
- `FileUpload.spec.ts`
- `DocumentList.spec.ts`
- `DocConverterContainer.spec.ts`

## 8. Best Practices

Bei der Verwendung des Dokumentenkonverters sollten folgende Best Practices beachtet werden:

1. **Fehlerbehandlung**: Alle Fehler während der Dokumentenkonvertierung sollten mit der ErrorDisplay-Komponente angezeigt werden.
2. **Fortschrittsüberwachung**: Bei lang andauernden Operationen sollte immer die ConversionProgress-Komponente verwendet werden.
3. **Typsicherheit**: Alle Interaktionen mit dem Dokumentenkonverter sollten die definierten TypeScript-Typen verwenden.
4. **Barrierefreiheit**: Alle Komponenten bieten umfassende ARIA-Attribute und sollten unverändert verwendet werden.
5. **Internationalisierung**: Alle Texte sollten über die i18n-Funktionalität lokalisiert werden.

## 9. Bekannte Herausforderungen und Lösungsansätze

1. **Browser-Kompatibilität**
   - **Problem**: Drag & Drop funktioniert in älteren Browsern nicht zuverlässig
   - **Lösung**: Progressive Enhancement mit Fallback auf klassischen Datei-Dialog
   - **Status**: Implementiert, wird kontinuierlich verbessert

2. **Große Dateien**
   - **Problem**: Browser-Limitierungen bei sehr großen Dateien (>100MB)
   - **Lösung**: Implementierung eines Chunk-Upload-Verfahrens
   - **Status**: Geplant für Phase 3

3. **Offline-Funktionalität**
   - **Problem**: Begrenzte Unterstützung in Offline-Szenarien
   - **Lösung**: Service Worker für Offline-Caching
   - **Status**: Konzeptphase

4. **Internet Explorer-Unterstützung**
   - **Problem**: Keine volle Unterstützung für IE11
   - **Lösung**: Legacy-Fallback für IE11-Benutzer
   - **Status**: Implementiert über Feature-Detection

5. **Leistungsoptimierung**
   - **Problem**: Verzögerungen bei der Verarbeitung komplexer PDF-Dokumente
   - **Lösung**: Worker-Thread-Implementierung für Vorschauverarbeitung
   - **Status**: In Entwicklung

## 10. Zukünftige Verbesserungen

Folgende Verbesserungen sind für den Dokumentenkonverter geplant:

1. **Verbesserter PDF-Parser**:
   - Bessere Erkennung von Tabellen und Strukturen in PDFs
   - OCR für Bilder und gescannte Dokumente
   - Intelligente Layouterkennung

2. **Batch-Konvertierung**:
   - Unterstützung für gleichzeitige Konvertierung mehrerer Dokumente
   - Fortschrittsanzeige für Batch-Konvertierungen
   - Automatisierte Verarbeitung von Dokumentensammlungen

3. **Erweiterte Metadatenextraktion**:
   - Erweiterte Extraktion von Metadaten aus Dokumenten
   - Dokument-Klassifizierung basierend auf Metadaten
   - Automatische Tagging-Funktionalität

4. **Integration mit nscale DMS**:
   - Direkte Integration in die nscale DMS-Workflows
   - Automatische Indexierung in nscale
   - Versionsverwaltung und Nachverfolgung in nscale

5. **UI-Verbesserungen**:
   - Fortschrittsanzeige im Browser-Tab
   - Benachrichtigungen nach abgeschlossener Konvertierung
   - Verbesserte mobile Unterstützung

## 11. Änderungshistorie

| Datum | Version | Autor | Änderungen |
|-------|---------|-------|------------|
| 14.05.2025 | 2.1.0 | Claude | Verbesserung der API-Integration mit DocumentConverterServiceWrapper. Implementierung standardisierter Fehlerformate und verbesserter Fehlerbehandlung. Aktualisierung der Dokumentation zur API-Service-Architektur. |
| 11.05.2025 | 2.0.0 | Claude | Umfassende Konsolidierung der Dokumentenkonverter-Dokumentation aus verschiedenen Quellen. Ergänzung der Store-Dokumentation und Aktualisierung des Migrationsstatus. |
| 08.05.2025 | 1.2.0 | Team | Ergänzung um Dokumentation zu Vue 3 SFC-Implementierung und aktuellen Migrationsstatus. |
| 07.05.2025 | 1.1.0 | Team | Hinzufügung von Abschnitten zu Robustheitsmechanismen und zukünftigen Verbesserungen. |
| 30.04.2025 | 1.0.0 | Team | Initiale Dokumentation des Dokumentenkonverters. |

---

**Verweise:**
- [Feature-Toggle-System](/opt/nscale-assist/app/docs/06_SYSTEME/03_FEATURE_TOGGLE_SYSTEM.md)
- [DocumentConverter Store-Dokumentation](/opt/nscale-assist/app/docs/06_SYSTEME/02_DOCUMENT_CONVERTER_STORE.md)
- [Fehlerbehandlung und Fallback](/opt/nscale-assist/app/docs/05_REFERENZEN/03_FEHLERBEHANDLUNG.md)
- [Vue 3 SFC-Migration: Dokumentenkonverter](/opt/nscale-assist/app/docs/06_SYSTEME/06_VUE3_SFC_DOKUMENTENKONVERTER.md)
- [Migrations-Aktionsplan](/opt/nscale-assist/app/docs/03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md)