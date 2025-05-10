# Dokumentliste Komponente (DocumentList)

Die `DocumentList`-Komponente ist eine Vue 3-Komponente, die eine Liste von konvertierten Dokumenten anzeigt und umfangreiche Interaktionsmöglichkeiten bietet. Diese Komponente wird im Dokumentenkonverter-Modul der nscale DMS Assistent-Anwendung verwendet.

## Funktionalitäten

- Anzeige konvertierter Dokumente mit Details (Name, Größe, Datum, Format, Status)
- Filterung nach Dokumentenstatus und Format
- Sortierung nach verschiedenen Kriterien (Name, Datum, Größe, Format)
- Suchfunktion zum Filtern von Dokumenten nach Namen
- Dokumentenaktionen (Anzeigen, Herunterladen, Löschen) mit Bestätigungsdialogen
- Paginierung für umfangreiche Dokumentenlisten
- Statusanzeige (Erfolg, Fehler, Ausstehend, In Bearbeitung)
- Responsive Design für unterschiedliche Bildschirmgrößen
- Vollständige Unterstützung für Tastaturnavigation
- ARIA-Attribute für Barrierefreiheit

## Technische Eigenschaften

- Implementiert als Vue 3 Single File Component mit Composition API
- TypeScript für Typsicherheit
- Reaktive Filter und Sortierung
- Gekapselte Stile mit scoped CSS
- Integration mit dem Dialog-Service für Bestätigungsdialoge
- Optimierte Leistung durch berechnete Eigenschaften
- Fallback-Lösung für Internationalisierung

## Installation und Import

Die Komponente kann aus dem Verzeichnis `/src/components/admin/document-converter/` importiert werden:

```typescript
import DocumentList from '@/components/admin/document-converter/DocumentList.vue';
```

Zusätzlich wird der Typ `ConversionResult` aus dem Modul `@/types/documentConverter` benötigt:

```typescript
import { ConversionResult, SupportedFormat } from '@/types/documentConverter';
```

## Props

| Name | Typ | Standard | Beschreibung |
|------|-----|----------|--------------|
| `documents` | `ConversionResult[]` | `[]` | Liste der anzuzeigenden Dokumente |
| `selectedDocument` | `ConversionResult \| null` | `null` | Das aktuell ausgewählte Dokument oder null, wenn keines ausgewählt ist |
| `loading` | `boolean` | `false` | Steuert die Anzeige des Ladeindikators |
| `supportedFormats` | `SupportedFormat[]` | `['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']` | Liste der unterstützten Dateiformate für Filter |

## Events

| Event | Parameter | Beschreibung |
|-------|-----------|--------------|
| `select` | `documentId: string` | Wird ausgelöst, wenn ein Dokument ausgewählt wird |
| `view` | `documentId: string` | Wird ausgelöst, wenn die Anzeigen-Aktion für ein Dokument aufgerufen wird |
| `download` | `documentId: string` | Wird ausgelöst, wenn die Herunterladen-Aktion für ein Dokument aufgerufen wird |
| `delete` | `documentId: string` | Wird ausgelöst, wenn ein Dokument gelöscht wird (nach Bestätigung) |

## Verwendung

### Basis-Implementierung

```vue
<template>
  <DocumentList
    :documents="convertedDocuments"
    :selected-document="selectedDocument"
    :loading="isLoading"
    @select="handleSelectDocument"
    @view="handleViewDocument"
    @download="handleDownloadDocument"
    @delete="handleDeleteDocument"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DocumentList from '@/components/admin/document-converter/DocumentList.vue';
import { ConversionResult } from '@/types/documentConverter';
import { useDocumentConverterStore } from '@/stores/documentConverter';

// Store für den Dokumentenkonverter
const documentConverterStore = useDocumentConverterStore();

// Reaktive Eigenschaften
const isLoading = ref(false);

// Berechnete Eigenschaften aus dem Store
const convertedDocuments = computed(() => documentConverterStore.convertedDocuments);
const selectedDocument = computed(() => documentConverterStore.selectedDocument);

// Event-Handler
function handleSelectDocument(documentId: string) {
  documentConverterStore.selectDocument(documentId);
}

function handleViewDocument(documentId: string) {
  // Implementierung der Anzeigefunktion
}

function handleDownloadDocument(documentId: string) {
  // Implementierung des Downloads
}

function handleDeleteDocument(documentId: string) {
  documentConverterStore.deleteDocument(documentId);
}
</script>
```

### Integration mit Dialogen

```vue
<script setup lang="ts">
import { useDialog } from '@/composables/useDialog';

// Dialog-Service für Bestätigungen
const dialog = useDialog();

// Handler zum Löschen eines Dokuments mit Bestätigung
async function handleDeleteWithConfirmation(documentId: string) {
  const doc = convertedDocuments.value.find(d => d.id === documentId);
  if (!doc) return;
  
  const confirmed = await dialog.confirm({
    title: 'Dokument löschen',
    message: `Sind Sie sicher, dass Sie das Dokument "${doc.originalName}" löschen möchten?`,
    type: 'warning',
    confirmButtonText: 'Löschen',
    cancelButtonText: 'Abbrechen'
  });
  
  if (confirmed) {
    documentConverterStore.deleteDocument(documentId);
  }
}
</script>
```

## Beispielkomponente

Eine vollständige Beispielkomponente, die zeigt, wie die `DocumentList`-Komponente verwendet werden kann, ist im Verzeichnis `/examples/document-converter/DocumentListExample.vue` verfügbar.

Diese Beispielkomponente demonstriert:
- Erstellen und Anzeigen von Beispieldokumenten
- Umschalten des Ladezustands für Tests
- Behandlung aller Events (Auswählen, Anzeigen, Herunterladen, Löschen)
- Integration mit dem Dialog-Service
- Anzeigen von Aktionen und ausgewählten Dokumenten

## Styling

Die Komponente hat ein eigenes scoped Styling, das eine konsistente Anzeige sicherstellt. Das Design ist responsiv und passt sich an verschiedene Bildschirmgrößen an. Dokumente werden je nach Status unterschiedlich dargestellt:

- Erfolgreich: Grüner Statusbalken und Icon
- Fehler: Roter Statusbalken und Icon
- Ausstehend: Grauer Statusbalken und Icon
- In Bearbeitung: Orangefarbener Statusbalken und animiertes Icon

Die Aktionsschaltflächen sind:
- Anzeigen: Augensymbol (disabled für nicht erfolgreiche Dokumente)
- Herunterladen: Download-Symbol (disabled für nicht erfolgreiche Dokumente)
- Löschen: Papierkorbsymbol (immer aktiv)

## Barrierefreiheit

Die Komponente enthält umfassende ARIA-Attribute für bessere Zugänglichkeit:
- `role`-Attribute für semantische Strukturierung
- `aria-live`-Regionen für dynamische Inhalte
- `aria-selected` für die aktuelle Auswahl
- Beschriftete Steuerelemente mit `aria-label`
- Tastaturnavigation mit Fokussteuerung
- Screen-Reader-freundliche Textbeschreibungen
- Statusmeldungen für Filter ohne Ergebnisse

## Internationalisierung

Die Komponente verwendet eine Fallback-Lösung für i18n mit einer `$t`-Hilfsfunktion. In einer Umgebung mit einer i18n-Bibliothek (wie vue-i18n) kann diese Fallback-Funktion ersetzt werden.

## Paginierung

Die Komponente unterstützt Paginierung für große Dokumentenlisten. Die Standardseitengröße beträgt 10 Dokumente pro Seite. Benutzer können zwischen Seiten navigieren, und bei Filteränderungen wird die Seitennummer automatisch zurückgesetzt.

## Erweiterungen

Mögliche Erweiterungen für zukünftige Versionen:
- Anpassbare Seitengröße
- Drag-and-Drop-Sortierung
- Massenoperationen (mehrere Dokumente gleichzeitig löschen)
- Erweiterte Filteroptionen (Datumsbereiche, Größenbereiche)
- Ansichtsmodi (Liste, Kacheln, Details)
- Export-Funktionen (CSV, JSON)
- Spaltenanpassung und -sortierung