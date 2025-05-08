import { apiService } from './ApiService';
import { ConversionResult, SupportedFormat, ConversionSettings } from '@/types/documentConverter';

class DocumentConverterApi {
  /**
   * Lädt ein Dokument hoch und gibt die Dokument-ID zurück
   */
  async uploadDocument(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const response = await apiService.uploadFile<{ documentId: string }>(
      '/api/documents/upload',
      file,
      {
        onProgress,
        priority: 10
      }
    );
    
    return response.data.documentId;
  }
  
  /**
   * Startet den Konvertierungsprozess für ein hochgeladenes Dokument
   */
  async convertDocument(
    documentId: string, 
    settings?: Partial<ConversionSettings>
  ): Promise<any> {
    const response = await apiService.post(`/api/documents/${documentId}/convert`, settings);
    return response.data;
  }
  
  /**
   * Ruft den Konvertierungsstatus eines Dokuments ab
   */
  async getConversionStatus(documentId: string): Promise<{
    status: 'pending' | 'processing' | 'success' | 'error';
    progress: number;
    step?: string;
    estimatedTimeRemaining?: number;
    error?: string;
  }> {
    const response = await apiService.get(`/api/documents/${documentId}/status`);
    return response.data;
  }
  
  /**
   * Ruft eine Liste aller konvertierten Dokumente ab
   */
  async getDocuments(): Promise<ConversionResult[]> {
    const response = await apiService.get('/api/documents');
    return response.data;
  }
  
  /**
   * Ruft Details zu einem Dokument ab
   */
  async getDocument(documentId: string): Promise<ConversionResult> {
    const response = await apiService.get(`/api/documents/${documentId}`);
    return response.data;
  }
  
  /**
   * Ruft den Inhalt eines konvertierten Dokuments ab
   */
  async getDocumentContent(documentId: string): Promise<{ content: string }> {
    const response = await apiService.get(`/api/documents/${documentId}/content`);
    return response.data;
  }
  
  /**
   * Lädt den Inhalt eines konvertierten Dokuments herunter
   */
  async downloadDocument(documentId: string, filename?: string): Promise<void> {
    await apiService.downloadFile(
      `/api/documents/${documentId}/download`,
      {
        filename: filename || `document_${documentId}.txt`
      }
    );
  }
  
  /**
   * Löscht ein konvertiertes Dokument
   */
  async deleteDocument(documentId: string): Promise<void> {
    await apiService.delete(`/api/documents/${documentId}`);
  }
  
  /**
   * Prüft, ob ein Dateiformat unterstützt wird
   */
  isFormatSupported(format: string): format is SupportedFormat {
    const supportedFormats: SupportedFormat[] = [
      'pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'
    ];
    return supportedFormats.includes(format as SupportedFormat);
  }
}

export default new DocumentConverterApi();