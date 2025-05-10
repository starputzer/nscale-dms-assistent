# Dokumentenkonverter Store Dokumentation

Diese Dokumentation erklärt die Verwendung und Funktionalität des Pinia Stores für den Dokumentenkonverter in der nscale Assist Anwendung.

## Übersicht

Der `documentConverter` Store verwaltet den Zustand und die Logik für die Dokumentenkonvertierungsfunktionen der Anwendung. Er ermöglicht das Hochladen, Konvertieren, Anzeigen und Verwalten von Dokumenten mit TypeScript-Unterstützung und Zustandspersistenz.

## Installation und Einrichtung

Der Store ist bereits im Haupt-Pinia-Store registriert und kann direkt in jeder Vue-Komponente verwendet werden.

```typescript
import { useDocumentConverterStore } from '@/stores/documentConverter';
// oder
import { useDocumentConverterStore } from '@/stores';

// In der Komponente verwenden
const documentStore = useDocumentConverterStore();
```

## Datenstrukturen

### Hauptzustand (State)

Der Store verwaltet den folgenden Zustand:

```typescript
interface DocumentConverterState {
  uploadedFiles: UploadedFile[];        // Hochgeladene, noch nicht konvertierte Dateien
  convertedDocuments: ConversionResult[]; // Liste konvertierter Dokumente
  conversionProgress: number;           // Fortschritt der aktuellen Konvertierung (0-100%)
  conversionStep: string;               // Aktueller Schritt als Text
  estimatedTimeRemaining: number;       // Geschätzte Zeit in Sekunden
  isConverting: boolean;                // Flag für laufende Konvertierung
  isUploading: boolean;                 // Flag für laufenden Upload
  selectedDocumentId: string | null;    // ID des ausgewählten Dokuments
  error: ConverterError | null;         // Fehlerinformationen
  currentView: ConverterView;           // Aktuelle UI-Ansicht
  conversionSettings: Partial<ConversionSettings>; // Einstellungen
  lastUpdated: Date | null;             // Zeitstempel der letzten Aktualisierung
  initialized: boolean;                 // Initialisierungsstatus
}
```

### Wichtige Typen

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

// Konvertierungsergebnis (importiert aus types/documentConverter.ts)
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

## Aktionen (Actions)

Der Store bietet folgende Aktionen zur Interaktion mit dem Dokumentenkonverter:

### initialize()

Initialisiert den Store und lädt vorhandene Dokumente.

```typescript
await documentStore.initialize();
```

### uploadDocument(file: File)

Lädt eine Datei hoch und gibt die Dokument-ID zurück.

```typescript
const documentId = await documentStore.uploadDocument(myFile);
```

### convertDocument(documentId: string, settings?: Partial<ConversionSettings>)

Konvertiert ein hochgeladenes Dokument mit den angegebenen Einstellungen.

```typescript
await documentStore.convertDocument(documentId, {
  preserveFormatting: true,
  extractMetadata: true,
  extractTables: false
});
```

### deleteDocument(documentId: string)

Löscht ein Dokument vom Server und aus dem Store.

```typescript
await documentStore.deleteDocument(documentId);
```

### cancelConversion(documentId: string)

Bricht eine laufende Konvertierung ab.

```typescript
await documentStore.cancelConversion(documentId);
```

### selectDocument(documentId: string | null)

Wählt ein Dokument aus oder hebt die Auswahl auf.

```typescript
documentStore.selectDocument(documentId);
```

### setView(view: ConverterView)

Setzt die aktuelle Ansicht im Dokumentenkonverter.

```typescript
documentStore.setView('results');
```

### updateSettings(settings: Partial<ConversionSettings>)

Aktualisiert die Konvertierungseinstellungen.

```typescript
documentStore.updateSettings({
  ocrEnabled: true,
  ocrLanguage: 'deu'
});
```

### resetState()

Setzt den Store-Zustand zurück.

```typescript
documentStore.resetState();
```

### refreshDocuments()

Aktualisiert die Liste der Dokumente vom Server.

```typescript
await documentStore.refreshDocuments();
```

## Getters

Der Store bietet folgende berechnete Eigenschaften:

### hasDocuments

Prüft, ob Dokumente zum Anzeigen vorhanden sind.

```typescript
if (documentStore.hasDocuments) {
  // Dokumente sind verfügbar
}
```

### selectedDocument

Gibt das aktuell ausgewählte Dokument zurück.

```typescript
const document = documentStore.selectedDocument;
```

### conversionStatus

Gibt den aktuellen Konvertierungsstatus zurück.

```typescript
if (documentStore.conversionStatus === 'error') {
  // Fehler behandeln
}
```

### filteredDocuments(filterType: string)

Filtert Dokumente nach dem angegebenen Format oder Status.

```typescript
const pdfDocuments = documentStore.filteredDocuments('pdf');
const errorDocuments = documentStore.filteredDocuments('error');
```

### documentsByFormat

Gruppiert Dokumente nach ihrem Originalformat.

```typescript
const docGroups = documentStore.documentsByFormat;
// { pdf: [...], docx: [...], ... }
```

### documentCounts

Gibt die Anzahl der Dokumente je Status zurück.

```typescript
const counts = documentStore.documentCounts;
// { total: 10, pending: 1, processing: 2, success: 5, error: 2 }
```

### supportedFormats

Gibt die unterstützten Dateiformate zurück.

```typescript
const formats = documentStore.supportedFormats;
// ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']
```

## Persistenz

Der Store ist so konfiguriert, dass er bestimmte Teile des Zustands im localStorage speichert:

- `convertedDocuments`: Liste der konvertierten Dokumente
- `selectedDocumentId`: ID des ausgewählten Dokuments
- `conversionSettings`: Konvertierungseinstellungen
- `lastUpdated`: Zeitstempel der letzten Aktualisierung

Diese Persistenz ermöglicht es der Anwendung, den Zustand zwischen Seitenaktualisierungen zu behalten und die Benutzererfahrung zu verbessern.

## API-Integration

Der DocumentConverterStore kommuniziert nicht mehr direkt mit dem DocumentConverterService, sondern verwendet den neuen DocumentConverterServiceWrapper, der eine verbesserte Fehlerbehandlung und standardisierte Fehlerformate bietet.

### DocumentConverterServiceWrapper

```typescript
// Auszug aus DocumentConverterServiceWrapper.ts
class DocumentConverterServiceWrapper {
  // Basis DocumentConverterService-Instanz
  private service: IDocumentConverterService;
  private logger: LogService;

  // Dokument hochladen mit verbesserter Fehlerbehandlung
  public async uploadDocument(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string>;

  // Dokument konvertieren mit verbesserter Fehlerbehandlung
  public async convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
    onProgress?: (progress: number, step: string, timeRemaining: number) => void
  ): Promise<ConversionResult>;

  // Weitere Methoden mit verbesserter Fehlerbehandlung...

  // Standardisierte Fehlerkonvertierung
  private convertError(
    error: unknown,
    code: string,
    type: 'network' | 'format' | 'server' | 'permission' | 'validation' | 'timeout' | 'unknown' = 'unknown',
    additional: Partial<ConversionError> = {}
  ): ConversionError;
}

// Standardisiertes Fehlerformat
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
```

### Store-Integration mit dem ServiceWrapper

Der Store verwendet den ServiceWrapper für alle API-Aufrufe:

```typescript
// Auszug aus documentConverter.ts
import documentConverterServiceWrapper from '@/services/api/DocumentConverterServiceWrapper';

// In defineStore:
actions: {
  async uploadDocument(file: File) {
    try {
      state.isUploading = true;
      state.uploadProgress = 0;

      // Verwendung des ServiceWrappers mit Fortschrittsanzeige
      const documentId = await documentConverterServiceWrapper.uploadDocument(
        file,
        (progress) => {
          state.uploadProgress = progress;
        }
      );

      return documentId;
    } catch (error) {
      // Der Wrapper hat den Fehler bereits in das ConversionError-Format konvertiert
      state.error = error as ConversionError;
      throw error;
    } finally {
      state.isUploading = false;
    }
  }

  // Weitere Aktionen...
}
```

### Verbesserte Fehlerbehandlung

Der ServiceWrapper bietet folgende Verbesserungen bei der Fehlerbehandlung:

1. **Einheitliches Fehlerformat**: Alle API-Fehler werden in das `ConversionError`-Format konvertiert.
2. **Intelligente Fehlererkennung**: Analyse von Fehlermeldungen zur automatischen Bestimmung des Fehlertyps.
3. **Benutzerfreundliche Fehlermeldungen**: Kontextbezogene Lösungsvorschläge und Hilfestellungen.
4. **Lösungsorientierte Fehler**: Jeder Fehler enthält Vorschläge zur Behebung.
5. **Detailliertes Logging**: Protokollierung aller Operationen für bessere Diagnose.

### API-Endpunkte

| Endpunkt                        | Methode | Beschreibung                    | Fehlerbehandlung |
|---------------------------------|---------|--------------------------------|-----------------|
| `/api/documents/upload`         | POST    | Lädt ein Dokument hoch         | Netzwerk, Format, Größe |
| `/api/documents/{id}/convert`   | POST    | Startet Konvertierungsprozess  | Server, Format, Timeout |
| `/api/documents/{id}/status`    | GET     | Ruft Konvertierungsstatus ab   | Server, Nicht gefunden |
| `/api/documents`                | GET     | Ruft alle Dokumente ab         | Server, Berechtigung |
| `/api/documents/{id}`           | GET     | Ruft Dokumentdetails ab        | Server, Nicht gefunden |
| `/api/documents/{id}/content`   | GET     | Ruft konvertierten Inhalt ab   | Server, Formatierung |
| `/api/documents/{id}/download`  | GET     | Lädt Dokument herunter         | Netzwerk, Nicht gefunden |
| `/api/documents/{id}`           | DELETE  | Löscht ein Dokument            | Server, Berechtigung |
| `/api/documents/{id}/cancel`    | POST    | Bricht Konvertierung ab        | Server, Status |
| `/api/documents/upload/multiple`| POST    | Lädt mehrere Dokumente hoch    | Netzwerk, Format, Größe |

## Beispiel-Verwendung

```typescript
<script setup lang="ts">
import { useDocumentConverterStore } from '@/stores/documentConverter';
import { onMounted, ref } from 'vue';

// Store initialisieren
const store = useDocumentConverterStore();
const selectedFile = ref<File | null>(null);

// Handler für Dateiauswahl
function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
}

// Konvertierungsprozess starten
async function startConversion() {
  if (!selectedFile.value) return;
  
  try {
    // Datei hochladen
    const documentId = await store.uploadDocument(selectedFile.value);
    
    if (documentId) {
      // Konvertierung starten
      await store.convertDocument(documentId);
    }
  } catch (error) {
    console.error('Konvertierungsfehler:', error);
  }
}

// Beim Mounten initialisieren
onMounted(() => {
  store.initialize();
});
</script>

<template>
  <div>
    <h2>Dokumentenkonverter</h2>
    
    <!-- Fehleranzeige -->
    <div v-if="store.error" class="error">
      {{ store.error.message }}
    </div>
    
    <!-- Upload-Bereich -->
    <div v-if="store.currentView === 'upload'">
      <input type="file" @change="handleFileSelected">
      <button @click="startConversion" :disabled="!selectedFile">
        Dokument konvertieren
      </button>
    </div>
    
    <!-- Ergebnisanzeige -->
    <div v-if="store.selectedDocument">
      <h3>{{ store.selectedDocument.originalName }}</h3>
      <p>Status: {{ store.selectedDocument.status }}</p>
    </div>
    
    <!-- Dokumentenliste -->
    <div v-if="store.hasDocuments">
      <h3>Konvertierte Dokumente</h3>
      <ul>
        <li v-for="doc in store.convertedDocuments" :key="doc.id">
          {{ doc.originalName }} - {{ doc.status }}
        </li>
      </ul>
    </div>
  </div>
</template>
```

## Best Practices

1. **Initialisierung**: Rufen Sie `initialize()` frühzeitig auf, idealerweise in `onMounted` der Hauptkomponente.

2. **Fehlerbehandlung**: Überwachen Sie den `error`-State, um Fehler anzuzeigen.

3. **Zustandsüberprüfung**: Verwenden Sie die bereitgestellten Getter wie `hasDocuments` und `conversionStatus`.

4. **Ressourcenfreigabe**: Bei Komponenten-Unmount sollten laufende Konvertierungen mit `cancelConversion` abgebrochen werden.

5. **Aktualisieren**: Verwenden Sie `refreshDocuments()`, um die Dokumentenliste zu aktualisieren.

## Integration mit dem bestehenden DocumentConverterContainer

Der Store kann leicht in die bestehende `DocConverterContainer`-Komponente integriert werden, indem Sie die Composable-basierte Logik durch Store-Aufrufe ersetzen. Beispiel:

```typescript
// Vorher (Composable-basiert)
const {
  isConverting,
  documents,
  uploadDocument,
  convertDocument
} = useDocumentConverter();

// Nachher (Store-basiert)
const store = useDocumentConverterStore();
// store.isConverting, store.convertedDocuments, store.uploadDocument, store.convertDocument
```

Diese Änderung zentralisiert die Zustandsverwaltung und ermöglicht konsistente Daten zwischen verschiedenen Komponenten.