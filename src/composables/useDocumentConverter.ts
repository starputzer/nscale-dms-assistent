import { ref, computed, onMounted } from "vue";
import DocumentConverterService from "@/services/api/DocumentConverterService";
import {
  ConversionResult,
  ConversionSettings,
} from "@/types/documentConverter";

export function useDocumentConverter() {
  // Zustandsvariablen
  const isInitialized = ref(false);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const documents = ref<ConversionResult[]>([]);
  const selectedDocumentId = ref<string | null>(null);
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const isConverting = ref(false);
  const conversionProgress = ref(0);
  const conversionStep = ref("");
  const estimatedTimeRemaining = ref(0);

  // Berechnete Eigenschaften
  const selectedDocument = computed(() => {
    if (!selectedDocumentId.value) return null;
    return (
      documents.value.find((doc: ConversionResult) => doc.id === selectedDocumentId.value) || null
    );
  });

  // Initialisierung
  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Dokumente vom Server laden
      const result = await DocumentConverterService.getDocuments();
      documents.value = result;
      isInitialized.value = true;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err
          : new Error("Fehler beim Laden der Dokumente");
      console.error("Initialisierungsfehler:", error.value);
    } finally {
      isLoading.value = false;
    }
  }

  // Dokument hochladen
  async function uploadDocument(file: File): Promise<string | null> {
    isUploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    try {
      // Upload mit Fortschrittsanzeige
      const documentId = await DocumentConverterService.uploadDocument(
        file,
        (progress: number) => {
          uploadProgress.value = progress;
        },
      );

      // Dokument zur Liste hinzufügen
      documents.value.unshift({
        id: documentId,
        originalName: file.name,
        originalFormat: file.name.split(".").pop()?.toLowerCase() || "unknown",
        size: file.size,
        uploadedAt: new Date().getTime(),
        status: "pending",
      });

      return documentId;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err
          : new Error("Fehler beim Hochladen des Dokuments");
      console.error("Upload-Fehler:", error.value);
      return null;
    } finally {
      isUploading.value = false;
    }
  }

  // Dokument konvertieren
  async function convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
  ): Promise<boolean> {
    isConverting.value = true;
    conversionProgress.value = 0;
    conversionStep.value = "Initialisiere Konvertierung...";
    error.value = null;

    try {
      // Status im Dokument aktualisieren
      const docIndex = documents.value.findIndex(
        (doc: ConversionResult) => doc.id === documentId,
      );
      if (docIndex !== -1) {
        documents.value[docIndex].status = "processing";
      }

      // Konvertierung starten und Fortschritt überwachen
      const result = await DocumentConverterService.convertDocument(
        documentId,
        settings,
        (progress: number, step: string, timeRemaining: number) => {
          conversionProgress.value = progress;
          conversionStep.value = step;
          estimatedTimeRemaining.value = timeRemaining;
        },
      );

      // Dokument mit Ergebnis aktualisieren
      if (docIndex !== -1) {
        documents.value[docIndex] = {
          ...documents.value[docIndex],
          ...result,
          status: "success",
          convertedAt: new Date().getTime(),
        };
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err
          : new Error("Fehler bei der Konvertierung des Dokuments");

      // Fehler im Dokument vermerken
      const docIndex = documents.value.findIndex(
        (doc: ConversionResult) => doc.id === documentId,
      );
      if (docIndex !== -1) {
        documents.value[docIndex].status = "error";
        documents.value[docIndex].error = error.value.message;
      }

      console.error("Konvertierungsfehler:", error.value);
      return false;
    } finally {
      isConverting.value = false;
    }
  }

  // Dokument löschen
  async function deleteDocument(documentId: string): Promise<boolean> {
    error.value = null;

    try {
      await DocumentConverterService.deleteDocument(documentId);

      // Dokument aus der Liste entfernen
      documents.value = documents.value.filter((doc: any) => doc.id !== documentId);

      // Wenn das gelöschte Dokument ausgewählt war, Auswahl zurücksetzen
      if (selectedDocumentId.value === documentId) {
        selectedDocumentId.value = null;
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err
          : new Error("Fehler beim Löschen des Dokuments");
      console.error("Löschfehler:", error.value);
      return false;
    }
  }

  // Dokument auswählen
  function selectDocument(documentId: string): void {
    selectedDocumentId.value = documentId;
  }

  // Auswahl zurücksetzen
  function clearSelection(): void {
    selectedDocumentId.value = null;
  }

  // Beim Mounten initialisieren
  onMounted(() => {
    initialize();
  });

  return {
    // Status
    isInitialized,
    isLoading,
    isUploading,
    isConverting,
    error,

    // Daten
    documents,
    selectedDocument,

    // Fortschritt
    uploadProgress,
    conversionProgress,
    conversionStep,
    estimatedTimeRemaining,

    // Aktionen
    initialize,
    uploadDocument,
    convertDocument,
    deleteDocument,
    selectDocument,
    clearSelection,
  };
}
