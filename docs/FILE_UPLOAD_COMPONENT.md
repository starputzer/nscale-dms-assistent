# FileUpload Komponente

Die `FileUpload` Komponente ist eine erweiterte Datei-Upload-Komponente für den nscale Dokumentenkonverter. Sie ermöglicht das Hochladen von Dateien per Drag & Drop oder über den klassischen Dateiauswahl-Dialog.

## Features

- **Drag & Drop Unterstützung**
  - Visuelles Feedback beim Ziehen von Dateien über den Upload-Bereich
  - Validierung von Dateitypen beim Ablegen

- **Mehrfachauswahl**
  - Unterstützung für das gleichzeitige Hochladen mehrerer Dateien
  - Konfigurierbare maximale Anzahl an Dateien

- **Fortgeschrittene Validierung**
  - MIME-Typ und Dateierweiterungsprüfung
  - Größenbeschränkungen mit benutzerfreundlichen Fehlermeldungen
  - Validierungsstatus für jede einzelne Datei

- **Visuelle Rückmeldung**
  - Fortschrittsanzeige während des Uploads
  - Liste der ausgewählten Dateien mit Typ-Icons und Größeninformationen
  - Entfernen einzelner Dateien vor dem Upload

- **Zugänglichkeit**
  - Vollständige Tastaturnavigation
  - Screenreader-Unterstützung
  - ARIA-Attribute für verbesserte Barrierefreiheit
  - Statusmeldungen für Screenreader

## Verwendung

```vue
<template>
  <FileUpload
    :is-uploading="uploading"
    :upload-progress="progress"
    :max-file-size="20 * 1024 * 1024"
    :allowed-extensions="['pdf', 'docx', 'xlsx']"
    :max-files="5"
    @upload="handleUpload"
    @cancel="handleCancel"
    @file-added="handleFileAdded"
    @file-removed="handleFileRemoved"
    @validation-error="handleValidationError"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileUpload from '@/components/admin/document-converter/FileUploadV2.vue';

const uploading = ref(false);
const progress = ref(0);

// Dateien hochladen
function handleUpload(files: File[]) {
  uploading.value = true;
  
  // Hier den Upload-Prozess implementieren
  // Zum Beispiel mit einem Upload-Service
  
  // Upload-Fortschritt simulieren
  const interval = setInterval(() => {
    progress.value += 5;
    if (progress.value >= 100) {
      clearInterval(interval);
      uploading.value = false;
      progress.value = 0;
    }
  }, 200);
}

// Upload abbrechen
function handleCancel() {
  // Upload-Prozess abbrechen
  uploading.value = false;
  progress.value = 0;
}

// Neue Datei hinzugefügt
function handleFileAdded(file: File) {
  console.log(`Datei hinzugefügt: ${file.name}`);
}

// Datei entfernt
function handleFileRemoved(file: File) {
  console.log(`Datei entfernt: ${file.name}`);
}

// Validierungsfehler
function handleValidationError(error: string, file: File) {
  console.error(`Fehler bei Datei ${file.name}: ${error}`);
}
</script>
```

## Props

| Name | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `isUploading` | `Boolean` | `false` | Gibt an, ob aktuell ein Upload-Prozess läuft |
| `uploadProgress` | `Number` | `0` | Fortschritt des aktuellen Upload-Prozesses (0-100) |
| `maxFileSize` | `Number` | `50 * 1024 * 1024` | Maximale Dateigröße in Bytes (Standard: 50 MB) |
| `allowedExtensions` | `Array<String>` | `['pdf', 'docx', 'xlsx', 'pptx', 'html', 'htm', 'txt']` | Liste der erlaubten Dateierweiterungen |
| `maxFiles` | `Number` | `10` | Maximale Anzahl an Dateien, die gleichzeitig ausgewählt werden können |

## Events

| Name | Parameter | Beschreibung |
|------|-----------|-------------|
| `upload` | `files: File[]` | Wird ausgelöst, wenn der Benutzer den Upload-Prozess startet. Enthält ein Array mit den hochzuladenden Dateien. |
| `cancel` | - | Wird ausgelöst, wenn der Benutzer den Vorgang abbricht. |
| `fileAdded` | `file: File` | Wird ausgelöst, wenn eine Datei zur Liste hinzugefügt wird. |
| `fileRemoved` | `file: File` | Wird ausgelöst, wenn eine Datei aus der Liste entfernt wird. |
| `validationError` | `error: string, file: File` | Wird ausgelöst, wenn eine Datei die Validierung nicht besteht. |

## Unterstützte Dateitypen und MIME-Typen

Die Komponente unterstützt die folgenden Dateitypen und ihre entsprechenden MIME-Typen:

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

## Barrierefreiheit

Die Komponente wurde mit Fokus auf Barrierefreiheit entwickelt:

- Die Komponente ist vollständig mit der Tastatur bedienbar
- Der Upload-Bereich kann mit der Leertaste oder Enter-Taste aktiviert werden
- Alle interaktiven Elemente haben fokussierbare Zustände
- Screenreader werden über Änderungen und Statusmeldungen informiert
- ARIA-Attribute beschreiben die Funktionalität für assistive Technologien
- Die Fortschrittsanzeige ist mit entsprechenden ARIA-Attributen versehen

## CSS-Anpassungen

Die Komponente verwendet ein modulares CSS-Design mit BEM-Konvention. Sie können das Aussehen der Komponente anpassen, indem Sie die folgenden CSS-Variablen in Ihrer Anwendung überschreiben:

```css
:root {
  --file-upload-border-color: #ced4da;
  --file-upload-bg-color: #f8f9fa;
  --file-upload-dragging-color: #e7f5ff;
  --file-upload-highlight-color: #4a6cf7;
  --file-upload-text-color: #212529;
  --file-upload-icon-color: #6c757d;
  --file-upload-error-color: #e53e3e;
}
```

## Responsive Design

Die Komponente passt sich automatisch an verschiedene Bildschirmgrößen an:

- Auf Mobilgeräten werden die Dateiinformationen und Aktionen neu angeordnet
- Die Buttons werden auf kleineren Bildschirmen übereinander angezeigt
- Die Dateiliste bleibt auch auf kleineren Bildschirmen gut lesbar

## Integration in DocConverterContainer

Die Komponente kann einfach in die bestehende `DocConverterContainer`-Komponente integriert werden:

```vue
<template>
  <div class="doc-converter-container" v-if="featureToggles.isDocConverterEnabled">
    <!-- ... -->
    
    <!-- Neue FileUpload-Komponente verwenden -->
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
    
    <!-- ... -->
  </div>
</template>

<script setup lang="ts">
// ... bestehende Imports ...
import FileUpload from './FileUploadV2.vue';

// ... bestehender Code ...

// Funktion zur Verarbeitung mehrerer Dateien
async function handleFilesUpload(files: File[]) {
  for (const file of files) {
    await startConversion(file);
  }
}

// ... restlicher Code ...
</script>
```

## Limitierungen und bekannte Probleme

- Sehr große Dateien können zu Performanceproblemen führen, besonders beim Validieren
- Drag & Drop funktioniert nicht auf allen Mobilgeräten (Fallback auf Dateiauswahl-Dialog)
- Einige Browser beschränken den Zugriff auf Datei-MIME-Typen aus Sicherheitsgründen