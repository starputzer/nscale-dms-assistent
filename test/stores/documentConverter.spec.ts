import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDocumentConverterStore } from '../../src/stores/documentConverter';
import DocumentConverterService from '../../src/services/api/DocumentConverterService';
import ApiService from '../../src/services/api/ApiService';
import { createApiResponse, mockDate, waitForPromises } from './__setup__/testSetup';

/**
 * Tests für den DocumentConverter-Store
 * 
 * Testet:
 * - Dokument-Upload-Prozess
 * - Konvertierungsprozess
 * - Dokumentenverwaltung
 * - Fehlerbehandlung
 * - Reaktive Berechnungen
 */

// DocumentConverterService und ApiService mocken
vi.mock('../../src/services/api/DocumentConverterService');
vi.mock('../../src/services/api/ApiService');

describe('DocumentConverter Store', () => {
  // Mock-Daten für Dokumente
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  
  const mockDocument = {
    id: 'doc-123',
    originalName: 'test.pdf',
    originalFormat: 'pdf',
    size: 12345,
    uploadedAt: new Date('2023-01-01T12:00:00Z'),
    status: 'pending'
  };
  
  const mockConversionResult = {
    id: 'doc-123',
    originalName: 'test.pdf',
    originalFormat: 'pdf',
    size: 12345,
    uploadedAt: new Date('2023-01-01T12:00:00Z'),
    status: 'success',
    convertedText: 'Extracted text from the document',
    pages: 5,
    convertedAt: new Date('2023-01-01T12:05:00Z')
  };
  
  const documentList = [
    {
      id: 'doc-1',
      originalName: 'document1.pdf',
      originalFormat: 'pdf',
      size: 10000,
      uploadedAt: new Date('2023-01-01T10:00:00Z'),
      status: 'success',
      convertedText: 'Content of document 1',
      pages: 3,
      convertedAt: new Date('2023-01-01T10:05:00Z')
    },
    {
      id: 'doc-2',
      originalName: 'presentation.pptx',
      originalFormat: 'pptx',
      size: 20000,
      uploadedAt: new Date('2023-01-01T11:00:00Z'),
      status: 'success',
      convertedText: 'Content of presentation',
      pages: 15,
      convertedAt: new Date('2023-01-01T11:10:00Z')
    },
    {
      id: 'doc-3',
      originalName: 'spreadsheet.xlsx',
      originalFormat: 'xlsx',
      size: 15000,
      uploadedAt: new Date('2023-01-01T12:00:00Z'),
      status: 'error',
      error: 'Failed to convert file'
    }
  ];
  
  // Mocks für Service-Methoden zurücksetzen
  beforeEach(() => {
    // Mocks für DocumentConverterService
    vi.mocked(DocumentConverterService.getDocuments).mockReset();
    vi.mocked(DocumentConverterService.uploadDocument).mockReset();
    vi.mocked(DocumentConverterService.convertDocument).mockReset();
    vi.mocked(DocumentConverterService.deleteDocument).mockReset();
    
    // Mock für ApiService
    vi.mocked(ApiService.post).mockReset();
    
    // Mock-Zeit für konsistente Tests
    mockDate('2023-01-01T13:00:00Z');
  });
  
  describe('Initialisierung', () => {
    it('sollte mit korrekten Standardwerten initialisiert werden', () => {
      // Arrange & Act
      const store = useDocumentConverterStore();
      
      // Assert
      expect(store.uploadedFiles).toEqual([]);
      expect(store.convertedDocuments).toEqual([]);
      expect(store.conversionProgress).toBe(0);
      expect(store.conversionStep).toBe('');
      expect(store.isConverting).toBe(false);
      expect(store.isUploading).toBe(false);
      expect(store.selectedDocumentId).toBeNull();
      expect(store.error).toBeNull();
      expect(store.currentView).toBe('upload');
      expect(store.initialized).toBe(false);
    });
    
    it('sollte bei initialize() Dokumente vom Server laden', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      vi.mocked(DocumentConverterService.getDocuments).mockResolvedValueOnce(documentList);
      
      // Act
      await store.initialize();
      
      // Assert
      expect(store.convertedDocuments).toEqual(documentList);
      expect(store.initialized).toBe(true);
      expect(store.lastUpdated).toBeInstanceOf(Date);
      expect(store.error).toBeNull();
      
      // Verify API call
      expect(DocumentConverterService.getDocuments).toHaveBeenCalled();
    });
    
    it('sollte beim Initialisierungsfehler einen Fehler setzen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      const mockError = new Error('Server nicht erreichbar');
      vi.mocked(DocumentConverterService.getDocuments).mockRejectedValueOnce(mockError);
      
      // Act
      await store.initialize();
      
      // Assert
      expect(store.error).not.toBeNull();
      expect(store.error!.code).toBe('INITIALIZATION_FAILED');
      expect(store.error!.message).toBe('Server nicht erreichbar');
      expect(store.initialized).toBe(false);
    });
    
    it('sollte initialize() nur einmal ausführen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      store.initialized = true;
      
      // Act
      await store.initialize();
      
      // Assert
      expect(DocumentConverterService.getDocuments).not.toHaveBeenCalled();
    });
  });
  
  describe('Dokument-Upload', () => {
    it('sollte ein Dokument erfolgreich hochladen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      vi.mocked(DocumentConverterService.uploadDocument).mockImplementation(
        async (file, progressCallback) => {
          // Fortschritt simulieren
          if (progressCallback) {
            progressCallback(25);
            progressCallback(50);
            progressCallback(100);
          }
          return 'doc-123';
        }
      );
      
      // Date.now mock für konsistente IDs
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1672574400000); // 2023-01-01T12:00:00Z
      
      // Act
      const documentId = await store.uploadDocument(mockFile);
      
      // Assert
      expect(documentId).toBe('doc-123');
      expect(store.isUploading).toBe(false);
      expect(store.error).toBeNull();
      
      // UploadedFiles sollte aktualisiert sein
      expect(store.uploadedFiles).toHaveLength(1);
      expect(store.uploadedFiles[0].id).toBe('doc-123');
      expect(store.uploadedFiles[0].file).toBe(mockFile);
      expect(store.uploadedFiles[0].progress).toBe(100);
      
      // ConvertedDocuments sollte aktualisiert sein
      expect(store.convertedDocuments).toHaveLength(1);
      expect(store.convertedDocuments[0].id).toBe('doc-123');
      expect(store.convertedDocuments[0].originalName).toBe('test.pdf');
      expect(store.convertedDocuments[0].originalFormat).toBe('pdf');
      expect(store.convertedDocuments[0].status).toBe('pending');
      
      // Verify API call
      expect(DocumentConverterService.uploadDocument).toHaveBeenCalledWith(
        mockFile,
        expect.any(Function)
      );
      
      // Cleanup
      nowSpy.mockRestore();
    });
    
    it('sollte bei Upload-Fehler einen Fehler setzen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      const mockError = new Error('Netzwerkfehler beim Upload');
      vi.mocked(DocumentConverterService.uploadDocument).mockRejectedValueOnce(mockError);
      
      // Act
      const documentId = await store.uploadDocument(mockFile);
      
      // Assert
      expect(documentId).toBeNull();
      expect(store.isUploading).toBe(false);
      expect(store.error).not.toBeNull();
      expect(store.error!.code).toBe('UPLOAD_FAILED');
      expect(store.error!.message).toBe('Netzwerkfehler beim Upload');
    });
  });
  
  describe('Dokument-Konvertierung', () => {
    it('sollte ein Dokument erfolgreich konvertieren', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokument zum Store hinzufügen
      store.convertedDocuments = [mockDocument];
      
      // Mock für die Konvertierung
      vi.mocked(DocumentConverterService.convertDocument).mockImplementation(
        async (documentId, settings, progressCallback) => {
          // Fortschritt simulieren
          if (progressCallback) {
            progressCallback(25, 'Parsing document...', 30);
            progressCallback(50, 'Extracting text...', 20);
            progressCallback(100, 'Finalizing...', 0);
          }
          return mockConversionResult;
        }
      );
      
      // Act
      const result = await store.convertDocument('doc-123', { preserveFormatting: false });
      
      // Assert
      expect(result).toBe(true);
      expect(store.isConverting).toBe(false);
      expect(store.conversionProgress).toBe(100);
      expect(store.conversionStep).toBe('Finalizing...');
      expect(store.error).toBeNull();
      expect(store.currentView).toBe('results');
      expect(store.selectedDocumentId).toBe('doc-123');
      
      // Dokument sollte aktualisiert sein
      expect(store.convertedDocuments[0].status).toBe('success');
      expect(store.convertedDocuments[0].convertedText).toBe('Extracted text from the document');
      expect(store.convertedDocuments[0].pages).toBe(5);
      expect(store.convertedDocuments[0].convertedAt).toBeInstanceOf(Date);
      
      // Verify API call
      expect(DocumentConverterService.convertDocument).toHaveBeenCalledWith(
        'doc-123',
        { preserveFormatting: false, extractMetadata: true, extractTables: true },
        expect.any(Function)
      );
    });
    
    it('sollte bei Konvertierungsfehler einen Fehler setzen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokument zum Store hinzufügen
      store.convertedDocuments = [mockDocument];
      
      // Mock für den Konvertierungsfehler
      const mockError = new Error('Datei konnte nicht konvertiert werden');
      vi.mocked(DocumentConverterService.convertDocument).mockRejectedValueOnce(mockError);
      
      // Act
      const result = await store.convertDocument('doc-123');
      
      // Assert
      expect(result).toBe(false);
      expect(store.isConverting).toBe(false);
      expect(store.error).not.toBeNull();
      expect(store.error!.code).toBe('CONVERSION_FAILED');
      
      // Dokument sollte als Fehler markiert sein
      expect(store.convertedDocuments[0].status).toBe('error');
      expect(store.convertedDocuments[0].error).toBe('Datei konnte nicht konvertiert werden');
    });
    
    it('sollte eine Konvertierung abbrechen können', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokument zum Store hinzufügen
      store.convertedDocuments = [mockDocument];
      
      // Laufende Konvertierung simulieren
      store.isConverting = true;
      store.conversionProgress = 50;
      store.conversionStep = 'Extracting text...';
      
      // Mock für den Abbruch
      vi.mocked(ApiService.post).mockResolvedValueOnce({});
      
      // Act
      await store.cancelConversion('doc-123');
      
      // Assert
      expect(store.isConverting).toBe(false);
      expect(store.conversionProgress).toBe(0);
      expect(store.conversionStep).toBe('');
      expect(store.currentView).toBe('upload');
      
      // Dokument sollte als Fehler markiert sein
      expect(store.convertedDocuments[0].status).toBe('error');
      expect(store.convertedDocuments[0].error).toBe('Konvertierung wurde abgebrochen');
      
      // Verify API call
      expect(ApiService.post).toHaveBeenCalledWith('/api/documents/doc-123/cancel');
    });
  });
  
  describe('Dokumentenverwaltung', () => {
    it('sollte ein Dokument löschen können', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokumente zum Store hinzufügen
      store.convertedDocuments = [
        { ...documentList[0] },
        { ...documentList[1] }
      ];
      store.selectedDocumentId = 'doc-1';
      
      // Mock für das Löschen
      vi.mocked(DocumentConverterService.deleteDocument).mockResolvedValueOnce(undefined);
      
      // Act
      const result = await store.deleteDocument('doc-1');
      
      // Assert
      expect(result).toBe(true);
      expect(store.convertedDocuments).toHaveLength(1);
      expect(store.convertedDocuments[0].id).toBe('doc-2');
      expect(store.selectedDocumentId).toBeNull(); // Ausgewähltes Dokument wurde zurückgesetzt
      
      // Verify API call
      expect(DocumentConverterService.deleteDocument).toHaveBeenCalledWith('doc-1');
    });
    
    it('sollte bei Löschfehler einen Fehler setzen', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokument zum Store hinzufügen
      store.convertedDocuments = [mockDocument];
      
      // Mock für den Löschfehler
      const mockError = new Error('Dokument konnte nicht gelöscht werden');
      vi.mocked(DocumentConverterService.deleteDocument).mockRejectedValueOnce(mockError);
      
      // Act
      const result = await store.deleteDocument('doc-123');
      
      // Assert
      expect(result).toBe(false);
      expect(store.error).not.toBeNull();
      expect(store.error!.code).toBe('DELETE_FAILED');
      
      // Dokument sollte noch vorhanden sein
      expect(store.convertedDocuments).toHaveLength(1);
    });
    
    it('sollte ein Dokument auswählen können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Dokumente zum Store hinzufügen
      store.convertedDocuments = [
        { ...mockConversionResult },
        { ...documentList[1] }
      ];
      
      // Act
      store.selectDocument('doc-123');
      
      // Assert
      expect(store.selectedDocumentId).toBe('doc-123');
      expect(store.currentView).toBe('results'); // Wenn Status 'success' ist, zur Ergebnisansicht wechseln
      
      // Ein Dokument mit Nicht-Erfolgs-Status sollte die Ansicht nicht ändern
      store.currentView = 'list';
      store.selectDocument('doc-3');
      expect(store.selectedDocumentId).toBe('doc-3');
      expect(store.currentView).toBe('list'); // Ansicht bleibt unverändert
    });
    
    it('sollte die Dokumentenliste aktualisieren können', async () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Mock für die Aktualisierung
      vi.mocked(DocumentConverterService.getDocuments).mockResolvedValueOnce(documentList);
      
      // Act
      await store.refreshDocuments();
      
      // Assert
      expect(store.convertedDocuments).toEqual(documentList);
      expect(store.lastUpdated).toBeInstanceOf(Date);
      
      // Verify API call
      expect(DocumentConverterService.getDocuments).toHaveBeenCalled();
    });
  });
  
  describe('Fehlerbehandlung', () => {
    it('sollte einen Fehler setzen können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      const mockError = new Error('Testfehler');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Act
      store.setError('TEST_ERROR', mockError);
      
      // Assert
      expect(store.error).not.toBeNull();
      expect(store.error!.code).toBe('TEST_ERROR');
      expect(store.error!.message).toBe('Testfehler');
      expect(store.error!.details).toBe(mockError);
      expect(store.error!.timestamp).toBeInstanceOf(Date);
      
      // Verify console output
      expect(consoleSpy).toHaveBeenCalledWith(
        'DocumentConverterStore error (TEST_ERROR):', 
        mockError
      );
      
      // Cleanup
      consoleSpy.mockRestore();
    });
    
    it('sollte nicht-Error-Objekte bei setError() verarbeiten können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Act
      store.setError('STRING_ERROR', 'Einfache Fehlermeldung');
      
      // Assert
      expect(store.error).not.toBeNull();
      expect(store.error!.message).toBe('Einfache Fehlermeldung');
      
      // Act mit anderen Typen
      store.setError('NUMBER_ERROR', 404);
      
      // Assert
      expect(store.error!.message).toBe('404');
    });
    
    it('sollte einen Fehler löschen können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      store.error = {
        code: 'TEST_ERROR',
        message: 'Testfehler',
        timestamp: new Date()
      };
      
      // Act
      store.clearError();
      
      // Assert
      expect(store.error).toBeNull();
    });
    
    it('sollte den Zustand zurücksetzen können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Store-Zustand verändern
      store.convertedDocuments = [mockDocument];
      store.error = { code: 'TEST_ERROR', message: 'Testfehler', timestamp: new Date() };
      store.currentView = 'results';
      
      // Act
      store.resetState();
      
      // Assert
      expect(store.convertedDocuments).toEqual([]);
      expect(store.error).toBeNull();
      expect(store.currentView).toBe('upload');
    });
  });
  
  describe('Getter und reaktive Berechnungen', () => {
    it('sollte den aktuellen Konvertierungsstatus korrekt berechnen', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Fehlerstatus
      store.error = { code: 'ERROR', message: 'Fehler', timestamp: new Date() };
      expect(store.conversionStatus).toBe('error');
      
      // Upload-Status
      store.error = null;
      store.isUploading = true;
      expect(store.conversionStatus).toBe('uploading');
      
      // Konvertierungsstatus
      store.isUploading = false;
      store.isConverting = true;
      expect(store.conversionStatus).toBe('converting');
      
      // Abgeschlossener Status
      store.isConverting = false;
      store.convertedDocuments = [mockDocument];
      expect(store.conversionStatus).toBe('completed');
      
      // Leerlaufstatus
      store.convertedDocuments = [];
      expect(store.conversionStatus).toBe('idle');
    });
    
    it('sollte hasDocuments korrekt berechnen', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Keine Dokumente
      expect(store.hasDocuments).toBe(false);
      
      // Mit Dokumenten
      store.convertedDocuments = [mockDocument];
      expect(store.hasDocuments).toBe(true);
    });
    
    it('sollte das ausgewählte Dokument korrekt berechnen', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Kein ausgewähltes Dokument
      expect(store.selectedDocument).toBeNull();
      
      // Dokument hinzufügen und auswählen
      store.convertedDocuments = [mockDocument];
      store.selectedDocumentId = 'doc-123';
      
      // Assert
      expect(store.selectedDocument).toEqual(mockDocument);
      
      // Nicht existierendes Dokument
      store.selectedDocumentId = 'nicht-vorhanden';
      expect(store.selectedDocument).toBeNull();
    });
    
    it('sollte Dokumente nach Format oder Status filtern können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      store.convertedDocuments = documentList;
      
      // Nach Format filtern
      expect(store.filteredDocuments('pdf')).toHaveLength(1);
      expect(store.filteredDocuments('pdf')[0].id).toBe('doc-1');
      
      expect(store.filteredDocuments('pptx')).toHaveLength(1);
      expect(store.filteredDocuments('pptx')[0].id).toBe('doc-2');
      
      // Nach Status filtern
      expect(store.filteredDocuments('success')).toHaveLength(2);
      expect(store.filteredDocuments('error')).toHaveLength(1);
      
      // Ohne Filter
      expect(store.filteredDocuments('')).toHaveLength(3);
      
      // Nicht vorhandenes Format
      expect(store.filteredDocuments('docx')).toHaveLength(0);
    });
    
    it('sollte Dokumente nach Format gruppieren können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      store.convertedDocuments = documentList;
      
      // Act & Assert
      const grouped = store.documentsByFormat;
      
      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped.pdf).toHaveLength(1);
      expect(grouped.pptx).toHaveLength(1);
      expect(grouped.xlsx).toHaveLength(1);
      
      expect(grouped.pdf[0].id).toBe('doc-1');
      expect(grouped.pptx[0].id).toBe('doc-2');
      expect(grouped.xlsx[0].id).toBe('doc-3');
    });
    
    it('sollte die Dokumentanzahl je Status korrekt berechnen', () => {
      // Arrange
      const store = useDocumentConverterStore();
      store.convertedDocuments = documentList;
      
      // Act & Assert
      const counts = store.documentCounts;
      
      expect(counts.total).toBe(3);
      expect(counts.success).toBe(2);
      expect(counts.error).toBe(1);
      expect(counts.pending).toBe(0);
      expect(counts.processing).toBe(0);
    });
    
    it('sollte unterstützte Formate zurückgeben', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Act & Assert
      const formats = store.supportedFormats;
      
      expect(formats).toContain('pdf');
      expect(formats).toContain('docx');
      expect(formats).toContain('xlsx');
      expect(formats).toContain('pptx');
      expect(formats).toContain('html');
      expect(formats).toContain('txt');
    });
  });
  
  describe('Store-Einstellungen', () => {
    it('sollte die Ansicht ändern können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Act
      store.setView('list');
      
      // Assert
      expect(store.currentView).toBe('list');
    });
    
    it('sollte Konvertierungseinstellungen aktualisieren können', () => {
      // Arrange
      const store = useDocumentConverterStore();
      
      // Standardeinstellungen prüfen
      expect(store.conversionSettings.preserveFormatting).toBe(true);
      expect(store.conversionSettings.extractMetadata).toBe(true);
      expect(store.conversionSettings.extractTables).toBe(true);
      
      // Act
      store.updateSettings({
        preserveFormatting: false,
        extractMetadata: false
      });
      
      // Assert
      expect(store.conversionSettings.preserveFormatting).toBe(false);
      expect(store.conversionSettings.extractMetadata).toBe(false);
      expect(store.conversionSettings.extractTables).toBe(true); // Unverändert
    });
  });
});