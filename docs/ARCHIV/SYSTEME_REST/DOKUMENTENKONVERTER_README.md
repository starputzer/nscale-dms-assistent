# Dokumentenkonverter für nscale DMS Assistent

## Übersicht

Der Dokumentenkonverter ist eine umfassende Komponente, die das Hochladen, Konvertieren, Verwalten und Herunterladen von Dokumenten in der nscale DMS Assistent-Anwendung ermöglicht. Die Komponente bietet eine benutzerfreundliche Oberfläche mit Drag-and-Drop-Funktionalität, Fortschrittsanzeige, Fehlerbehandlung und einer übersichtlichen Dokumentenverwaltung.

## Funktionalitäten

- Dateiupload mit Drag-and-Drop-Unterstützung
- Fortschrittsanzeige während des Uploads und der Konvertierung
- Detaillierte Statusinformationen während des Konvertierungsprozesses
- Übersichtliche Dokumentenliste mit Sortier- und Filterfunktionen
- Dokumentenvorschau mit Metadatenanzeige
- Robuste Fehlerbehandlung mit hilfreichen Fehlermeldungen
- Batch-Aktionen für mehrere Dokumente
- Responsive Design für Desktop und mobile Geräte

## Architektur

Der Dokumentenkonverter besteht aus mehreren Komponenten:

1. **DocumentsView.vue**: Hauptkomponente für die Dokumentenkonvertierung
2. **FileUpload.vue**: Komponente für den Dateiupload mit Drag-and-Drop-Unterstützung
3. **ConversionProgress.vue**: Anzeige des Konvertierungsfortschritts
4. **DocumentList.vue**: Liste der konvertierten Dokumente mit Sortier- und Filterfunktionen
5. **ErrorDisplay.vue**: Fehleranzeige mit kontextbezogenen Lösungsvorschlägen

### State Management

Der Zustand des Dokumentenkonverters wird über einen Pinia-Store verwaltet:

- `documentConverter.ts`: Store für den Konvertierungsprozess und die Dokumentenverwaltung

### API-Integration

Die Kommunikation mit dem Backend erfolgt über dedizierte Service-Klassen:

- `DocumentConverterApi.ts`: Einfache API-Wrapper-Klasse
- `DocumentConverterService.ts`: Umfassendere Service-Implementierung
- `DocumentConverterServiceWrapper.ts`: Erweiterte Service-Klasse mit Fehlerbehandlung

## Verwendung

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

### Direkte Verwendung des Service-Wrappers

```typescript
import DocumentConverterServiceWrapper from '@/services/api/DocumentConverterServiceWrapper';

// Dokument hochladen
const file = new File(['...'], 'document.pdf', { type: 'application/pdf' });
const documentId = await DocumentConverterServiceWrapper.uploadDocument(file, (progress) => {
  console.log(`Upload-Fortschritt: ${progress}%`);
});

// Konvertierungsprozess starten mit Fortschrittsanzeige
await DocumentConverterServiceWrapper.convertDocument(
  documentId,
  { extractMetadata: true, extractTables: true },
  (progress, step, timeRemaining) => {
    console.log(`Konvertierungsfortschritt: ${progress}%, Schritt: ${step}, Verbleibende Zeit: ${timeRemaining}s`);
  }
);

// Dokumentenliste abrufen
const documents = await DocumentConverterServiceWrapper.getDocuments();

// Dokumentinhalt abrufen
const content = await DocumentConverterServiceWrapper.getDocumentContent(documentId);

// Dokument herunterladen
await DocumentConverterServiceWrapper.downloadDocument(documentId, 'document.txt');

// Dokument löschen
await DocumentConverterServiceWrapper.deleteDocument(documentId);
```

## Fehlerbehandlung

Der Dokumentenkonverter verwendet ein strukturiertes Fehlerformat, das kontextbezogene Fehlermeldungen und Lösungsvorschläge bietet. Die `ErrorDisplay`-Komponente zeigt diese Fehler in einer benutzerfreundlichen Form an.

```typescript
import { ErrorObject } from '@/components/admin/document-converter/ErrorDisplay.vue';

// Beispiel für einen strukturierten Fehler
const error: ErrorObject = {
  message: 'Die Datei konnte nicht hochgeladen werden',
  code: 'UPLOAD_FAILED',
  type: 'network',
  details: '...', // Technische Details
  resolution: 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
  helpItems: [
    'Stellen Sie sicher, dass Ihre Internetverbindung stabil ist',
    'Versuchen Sie, eine kleinere Datei hochzuladen'
  ]
};

// Fehler anzeigen
<ErrorDisplay 
  :error="error" 
  :canRetry="true" 
  @retry="handleRetry" 
/>
```

## Responsive Design

Der Dokumentenkonverter ist vollständig responsiv und passt sich verschiedenen Bildschirmgrößen an. Dies wird durch CSS-Media-Queries und flexible Layouts erreicht.

## Unterstützte Dateiformate

Der Dokumentenkonverter unterstützt die folgenden Dateiformate:

- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- Microsoft Excel (`.xlsx`)
- Microsoft PowerPoint (`.pptx`)
- HTML (`.html`, `.htm`)
- Textdateien (`.txt`)

## Beispiele

### FileUpload-Komponente

```vue
<template>
  <FileUpload 
    :isUploading="isUploading"
    :uploadProgress="uploadProgress"
    :allowedExtensions="['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']"
    :maxFileSize="20 * 1024 * 1024"
    @upload="handleUpload"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileUpload from '@/components/admin/document-converter/FileUpload.vue';

const isUploading = ref(false);
const uploadProgress = ref(0);

function handleUpload(file: File) {
  isUploading.value = true;
  // Upload-Logik hier...
}

function handleCancel() {
  isUploading.value = false;
  uploadProgress.value = 0;
}
</script>
```

### ConversionProgress-Komponente

```vue
<template>
  <ConversionProgress 
    :progress="conversionProgress"
    :currentStep="currentStep"
    :estimatedTime="estimatedTimeRemaining"
    :cancelable="true"
    @cancel="handleCancelConversion"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ConversionProgress from '@/components/admin/document-converter/ConversionProgress.vue';

const conversionProgress = ref(45);
const currentStep = ref('Extrahiere Textinhalte...');
const estimatedTimeRemaining = ref(120); // Sekunden

function handleCancelConversion() {
  // Konvertierungsabbruch-Logik hier...
}
</script>
```

## Erweiterungen und Anpassungen

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

## Bekannte Einschränkungen

- Maximale Dateigröße: 20 MB
- Die Konvertierungsdauer kann je nach Dateigröße und -komplexität variieren
- Die Tabellenerkennung funktioniert am besten bei einfachen Tabellenstrukturen

## Fehlerbehebung

### Häufige Fehler und Lösungen

- **Netzwerkfehler**: Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- **Formatfehler**: Stellen Sie sicher, dass die Datei ein unterstütztes Format hat und nicht beschädigt ist.
- **Serverfehler**: Wenden Sie sich an den Support, wenn das Problem weiterhin besteht.
- **Zeitüberschreitung**: Versuchen Sie es mit einer kleineren Datei oder während einer Zeit mit geringerer Serverauslastung.

### Logging

Der Dokumentenkonverter verwendet einen umfassenden Logging-Mechanismus. Fehler werden in der Browserkonsole und im Server-Log protokolliert. Bei Problemen können Sie folgende Logs überprüfen:

- Browser-Konsole für clientseitige Fehler
- `app.log` für serverseitige Fehler