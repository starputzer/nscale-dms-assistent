import { defineStore } from 'pinia';
import DocumentConverterService from '@/services/api/DocumentConverterService';
import DocumentConverterApi from '@/services/api/DocumentConverterApi';
import DocumentConverterServiceWrapper, { ConversionError } from '@/services/api/DocumentConverterServiceWrapper';
import {
  ConversionResult,
  ConversionSettings,
  SupportedFormat,
  DocumentMetadata
} from '@/types/documentConverter';

/**
 * Definiert den Konvertierungsansichtsmodus
 */
export type ConverterView = 'upload' | 'conversion' | 'results' | 'list';

/**
 * Stellt den Status des Konvertierungsprozesses dar
 */
export type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'completed' | 'error';

/**
 * Repräsentiert eine hochgeladene Datei vor der Konvertierung
 */
export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  uploadedAt: Date;
  error?: string;
}

/**
 * Repräsentiert einen Fehler im Dokumentenkonverter
 */
export interface ConverterError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Zustandsschnittstelle des Document Converter Stores
 */
export interface DocumentConverterState {
  // Hochgeladene Dateien, die noch nicht konvertiert wurden
  uploadedFiles: UploadedFile[];
  
  // Konvertierte Dokumente mit deren Ergebnissen
  convertedDocuments: ConversionResult[];
  
  // Fortschritt der aktuellen Konvertierung (0-100%)
  conversionProgress: number;
  
  // Aktueller Konvertierungsschritt als Textbeschreibung
  conversionStep: string;
  
  // Geschätzte verbleibende Zeit in Sekunden
  estimatedTimeRemaining: number;
  
  // Flag, ob gerade eine Konvertierung läuft
  isConverting: boolean;
  
  // Flag, ob gerade ein Upload läuft
  isUploading: boolean;
  
  // ID des aktuell ausgewählten Dokuments
  selectedDocumentId: string | null;
  
  // Fehlerinformationen bei Problemen
  error: ConverterError | null;
  
  // Aktuelle Ansicht im Dokumentenkonverter
  currentView: ConverterView;
  
  // Konvertierungseinstellungen für neue Dokumente
  conversionSettings: Partial<ConversionSettings>;
  
  // Zeitstempel der letzten Aktualisierung des Zustands
  lastUpdated: Date | null;
  
  // Flag, ob die Daten initialisiert wurden
  initialized: boolean;
  
  // Flag, ob gerade Daten geladen werden
  isLoading: boolean;
  
  // Flag, ob der Fallback-Konverter verwendet werden soll
  useFallback: boolean;
  
  // ID des aktiven Konvertierungsprozesses
  activeConversionId: string | null;
}

/**
 * Pinia Store für den Dokumentenkonverter
 * Verwaltet den Zustand und die Aktionen für den Dokumentenkonvertierungsprozess
 */
export const useDocumentConverterStore = defineStore('documentConverter', {
  /**
   * Initialzustand des Stores
   */
  state: (): DocumentConverterState => ({
    uploadedFiles: [],
    convertedDocuments: [],
    conversionProgress: 0,
    conversionStep: '',
    estimatedTimeRemaining: 0,
    isConverting: false,
    isUploading: false,
    selectedDocumentId: null,
    error: null,
    currentView: 'upload',
    conversionSettings: {
      preserveFormatting: true,
      extractMetadata: true,
      extractTables: true,
      ocrEnabled: false,
      ocrLanguage: 'de',
    },
    lastUpdated: null,
    initialized: false,
    isLoading: false,
    useFallback: false,
    activeConversionId: null
  }),

  /**
   * Getter für abgeleitete Zustandswerte
   */
  getters: {
    /**
     * Prüft, ob Dokumente zum Anzeigen vorhanden sind
     */
    hasDocuments: (state) => state.convertedDocuments.length > 0,

    /**
     * Gibt das aktuell ausgewählte Dokument zurück
     */
    selectedDocument: (state) => {
      if (!state.selectedDocumentId) return null;
      return state.convertedDocuments.find(
        doc => doc.id === state.selectedDocumentId
      ) || null;
    },

    /**
     * Gibt den aktuellen Konvertierungsstatus zurück
     */
    conversionStatus: (state): ConversionStatus => {
      if (state.error) return 'error';
      if (state.isUploading) return 'uploading';
      if (state.isConverting) return 'converting';
      if (state.convertedDocuments.length > 0) return 'completed';
      return 'idle';
    },

    /**
     * Filtert Dokumente nach dem angegebenen Format oder Status
     */
    filteredDocuments: (state) => {
      return (filterType: string): ConversionResult[] => {
        if (!filterType) return state.convertedDocuments;
        
        // Nach Format filtern
        if (['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'].includes(filterType)) {
          return state.convertedDocuments.filter(
            doc => doc.originalFormat === filterType
          );
        }
        
        // Nach Status filtern
        if (['pending', 'processing', 'success', 'error'].includes(filterType)) {
          return state.convertedDocuments.filter(
            doc => doc.status === filterType
          );
        }
        
        return state.convertedDocuments;
      };
    },

    /**
     * Gruppiert Dokumente nach ihrem Originalformat
     */
    documentsByFormat: (state) => {
      const result: Record<string, ConversionResult[]> = {};
      
      state.convertedDocuments.forEach(doc => {
        const format = doc.originalFormat || 'unknown';
        if (!result[format]) {
          result[format] = [];
        }
        result[format].push(doc);
      });
      
      return result;
    },

    /**
     * Gibt die Anzahl der Dokumente je Status zurück
     */
    documentCounts: (state) => {
      return {
        total: state.convertedDocuments.length,
        pending: state.convertedDocuments.filter(doc => doc.status === 'pending').length,
        processing: state.convertedDocuments.filter(doc => doc.status === 'processing').length,
        success: state.convertedDocuments.filter(doc => doc.status === 'success').length,
        error: state.convertedDocuments.filter(doc => doc.status === 'error').length
      };
    },

    /**
     * Liefert die unterstützten Dateiformate
     */
    supportedFormats: (): SupportedFormat[] => {
      return ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'];
    },
    
    /**
     * Liefert die maximale Dateigröße in Bytes
     */
    maxFileSize: (): number => {
      return 20 * 1024 * 1024; // 20 MB
    }
  },

  /**
   * Aktionen für Zustandsänderungen und API-Aufrufe
   */
  actions: {
    /**
     * Initialisiert den Store und lädt vorhandene Dokumente
     */
    async initialize(): Promise<void> {
      if (this.initialized) return;

      this.isLoading = true;
      this.error = null;

      try {
        const documents = await DocumentConverterServiceWrapper.getDocuments();
        this.convertedDocuments = documents;
        this.initialized = true;
        this.lastUpdated = new Date();
        this.error = null;
      } catch (err) {
        this.setError('INITIALIZATION_FAILED', err);
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Lädt eine Datei hoch und gibt die Dokument-ID zurück
     * @param file - Die hochzuladende Datei
     * @returns Die ID des hochgeladenen Dokuments
     */
    async uploadDocument(file: File): Promise<string | null> {
      try {
        this.isUploading = true;
        this.error = null;
        
        // Neuen Upload zum Status hinzufügen
        const uploadedFile: UploadedFile = {
          id: `temp-${Date.now()}`,
          file,
          progress: 0,
          uploadedAt: new Date()
        };
        
        this.uploadedFiles.push(uploadedFile);
        
        // Datei hochladen mit Fortschrittsanzeige
        const documentId = await DocumentConverterServiceWrapper.uploadDocument(
          file,
          (progress: number) => {
            // Upload-Fortschritt aktualisieren
            const index = this.uploadedFiles.findIndex(f => f.id === uploadedFile.id);
            if (index !== -1) {
              this.uploadedFiles[index].progress = progress;
            }
          }
        );
        
        // Hochgeladenes Dokument aktualisieren
        const index = this.uploadedFiles.findIndex(f => f.id === uploadedFile.id);
        if (index !== -1) {
          this.uploadedFiles[index].id = documentId;
        }
        
        // Neues Dokument zum Status hinzufügen
        this.convertedDocuments.unshift({
          id: documentId,
          originalName: file.name,
          originalFormat: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          size: file.size,
          uploadedAt: new Date(),
          status: 'pending'
        });
        
        this.lastUpdated = new Date();
        return documentId;
      } catch (err) {
        this.setError('UPLOAD_FAILED', err);
        return null;
      } finally {
        this.isUploading = false;
      }
    },

    /**
     * Konvertiert ein hochgeladenes Dokument
     * @param documentId - Die ID des zu konvertierenden Dokuments
     * @param progressCallback - Callback-Funktion für Fortschrittsaktualisierungen
     * @param settings - Optionale Konvertierungseinstellungen
     */
    async convertDocument(
      documentId: string,
      progressCallback?: (progress: number, step: string, timeRemaining: number | null) => void,
      settings?: Partial<ConversionSettings>
    ): Promise<boolean> {
      try {
        this.isConverting = true;
        this.conversionProgress = 0;
        this.conversionStep = 'Initialisiere Konvertierung...';
        this.error = null;
        this.currentView = 'conversion';
        this.activeConversionId = documentId;
        
        // Dokumentstatus aktualisieren
        const docIndex = this.convertedDocuments.findIndex(doc => doc.id === documentId);
        if (docIndex !== -1) {
          this.convertedDocuments[docIndex].status = 'processing';
        }
        
        // Konvertierungseinstellungen zusammenführen
        const mergedSettings = {
          ...this.conversionSettings,
          ...settings
        };
        
        // Eigenen Fortschritts-Callback für Store-Aktualisierungen
        const updateProgress = (progress: number, step: string, timeRemaining: number | null) => {
          this.conversionProgress = progress;
          this.conversionStep = step;
          this.estimatedTimeRemaining = timeRemaining || 0;
          
          // Progresscallback weiterleiten, falls vorhanden
          if (progressCallback) {
            progressCallback(progress, step, timeRemaining);
          }
        };
        
        // Konvertierung mit Fortschrittsanzeige starten
        const result = await DocumentConverterServiceWrapper.convertDocument(
          documentId,
          mergedSettings,
          updateProgress
        );
        
        // Polling für Fortschrittsaktualisierungen
        const pollInterval = setInterval(async () => {
          if (!this.isConverting) {
            clearInterval(pollInterval);
            return;
          }
          
          try {
            const status = await DocumentConverterServiceWrapper.getConversionStatus(documentId);
            updateProgress(
              status.progress, 
              status.step || 'Verarbeite Dokument...', 
              status.estimatedTimeRemaining || null
            );
            
            if (status.status === 'success' || status.status === 'error') {
              clearInterval(pollInterval);
              if (status.status === 'success') {
                // Erfolgreich konvertiert
                const document = await DocumentConverterServiceWrapper.getDocument(documentId);
                
                // Dokument mit Ergebnis aktualisieren
                if (docIndex !== -1) {
                  this.convertedDocuments[docIndex] = {
                    ...this.convertedDocuments[docIndex],
                    ...document,
                    status: 'success',
                    convertedAt: new Date()
                  };
                }
                
                this.currentView = 'results';
                this.selectedDocumentId = documentId;
                this.isConverting = false;
              } else if (status.status === 'error') {
                // Fehler bei der Konvertierung
                throw new Error(status.error || 'Unbekannter Fehler bei der Konvertierung');
              }
            }
          } catch (err) {
            clearInterval(pollInterval);
            throw err;
          }
        }, 1000);
        
        this.lastUpdated = new Date();
        return true;
      } catch (err) {
        this.setError('CONVERSION_FAILED', err);
        
        // Fehler im Dokument vermerken
        const docIndex = this.convertedDocuments.findIndex(doc => doc.id === documentId);
        if (docIndex !== -1) {
          this.convertedDocuments[docIndex].status = 'error';
          this.convertedDocuments[docIndex].error = err instanceof Error ? err.message : 'Unbekannter Fehler';
        }
        
        this.isConverting = false;
        this.activeConversionId = null;
        return false;
      }
    },

    /**
     * Löscht ein konvertiertes Dokument
     * @param documentId - Die ID des zu löschenden Dokuments
     */
    async deleteDocument(documentId: string): Promise<boolean> {
      try {
        await DocumentConverterServiceWrapper.deleteDocument(documentId);
        
        // Dokument aus der Liste entfernen
        this.convertedDocuments = this.convertedDocuments.filter(
          doc => doc.id !== documentId
        );
        
        // Wenn das gelöschte Dokument ausgewählt war, Auswahl zurücksetzen
        if (this.selectedDocumentId === documentId) {
          this.selectedDocumentId = null;
        }
        
        this.lastUpdated = new Date();
        return true;
      } catch (err) {
        this.setError('DELETE_FAILED', err);
        return false;
      }
    },

    /**
     * Bricht eine laufende Konvertierung ab
     * @param documentId - Die ID des Dokuments, dessen Konvertierung abgebrochen wird
     */
    async cancelConversion(documentId: string): Promise<void> {
      try {
        // API-Aufruf zum Abbrechen der Konvertierung
        await DocumentConverterServiceWrapper.cancelConversion(documentId);
        
        // Status zurücksetzen
        this.isConverting = false;
        this.conversionProgress = 0;
        this.conversionStep = '';
        this.activeConversionId = null;
        
        // Dokument-Status aktualisieren
        const docIndex = this.convertedDocuments.findIndex(doc => doc.id === documentId);
        if (docIndex !== -1) {
          this.convertedDocuments[docIndex].status = 'error';
          this.convertedDocuments[docIndex].error = 'Konvertierung wurde abgebrochen';
        }
        
        this.currentView = 'upload';
      } catch (err) {
        this.setError('CANCEL_FAILED', err);
      }
    },

    /**
     * Wählt ein Dokument aus
     * @param documentId - Die ID des auszuwählenden Dokuments
     */
    selectDocument(documentId: string | null): void {
      this.selectedDocumentId = documentId;
      
      if (documentId) {
        const document = this.convertedDocuments.find(doc => doc.id === documentId);
        if (document && document.status === 'success') {
          this.currentView = 'results';
        }
      }
    },

    /**
     * Setzt die aktuelle Ansicht
     * @param view - Die neue Ansicht
     */
    setView(view: ConverterView): void {
      this.currentView = view;
    },

    /**
     * Aktualisiert die Konvertierungseinstellungen
     * @param settings - Die neuen Einstellungen
     */
    updateSettings(settings: Partial<ConversionSettings>): void {
      this.conversionSettings = {
        ...this.conversionSettings,
        ...settings
      };
    },

    /**
     * Setzt einen Fehler im Store
     * @param code - Der Fehlercode
     * @param error - Das Fehlerobjekt oder die Nachricht
     */
    setError(code: string, error: any): void {
      console.error(`DocumentConverterStore error (${code}):`, error);

      // Wenn bereits ein formatierter Fehler (ConversionError) vorliegt, diesen verwenden
      if (error && typeof error === 'object' && 'code' in error && 'type' in error && 'timestamp' in error) {
        this.error = error;
      } else {
        // Sonst einen neuen Error erstellen
        this.error = {
          code,
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2),
          timestamp: new Date()
        };
      }
    },

    /**
     * Löscht den aktuellen Fehler
     */
    clearError(): void {
      this.error = null;
    },

    /**
     * Setzt den Store auf den Ausgangszustand zurück
     */
    resetState(): void {
      this.$reset();
    },

    /**
     * Aktualisiert die Liste der konvertierten Dokumente
     */
    async refreshDocuments(): Promise<void> {
      try {
        this.isLoading = true;
        const documents = await DocumentConverterServiceWrapper.getDocuments();
        this.convertedDocuments = documents;
        this.lastUpdated = new Date();
        this.isLoading = false;
      } catch (err) {
        this.setError('REFRESH_FAILED', err);
        this.isLoading = false;
      }
    },
    
    /**
     * Aktiviert oder deaktiviert den Fallback-Konverter
     */
    setUseFallback(value: boolean): void {
      this.useFallback = value;
    },
    
    /**
     * Prüft, ob ein Format unterstützt wird
     */
    isSupportedFormat(format: string): boolean {
      return DocumentConverterServiceWrapper.isFormatSupported(format);
    },
    
    /**
     * Lädt ein konvertiertes Dokument herunter
     */
    async downloadDocument(documentId: string): Promise<void> {
      try {
        const document = this.convertedDocuments.find(doc => doc.id === documentId);
        if (!document) {
          throw new Error('Dokument nicht gefunden');
        }

        await DocumentConverterServiceWrapper.downloadDocument(documentId, document.originalName);
      } catch (err) {
        this.setError('DOWNLOAD_FAILED', err);
      }
    }
  },

  /**
   * Persistenzkonfiguration für den Store
   * Speichert ausgewählte Teile des Zustands im localStorage
   */
  persist: {
    key: 'nscale-doc-converter',
    paths: [
      'convertedDocuments',
      'selectedDocumentId',
      'conversionSettings',
      'lastUpdated'
    ],
    // Serialisiert Date-Objekte beim Speichern und Wiederherstellen
    serializer: {
      serialize: (state) => {
        const serializedState = JSON.stringify(state, (key, value) => {
          // Serialisiert Date-Objekte als ISO-Strings
          if (value instanceof Date) {
            return { __type: 'date', value: value.toISOString() };
          }
          return value;
        });
        return serializedState;
      },
      deserialize: (serializedState) => {
        return JSON.parse(serializedState, (key, value) => {
          // Konvertiert serialisierte Date-Objekte zurück
          if (value && typeof value === 'object' && value.__type === 'date') {
            return new Date(value.value);
          }
          return value;
        });
      }
    }
  }
});

/**
 * Hilfsfunktion zum Import von API-Abhängigkeiten
 * Wird am Ende definiert, um Zirkelbezüge zu vermeiden
 */
import ApiService from '@/services/api/ApiService';