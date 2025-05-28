/**
 * Typdefinitionen für den Document Converter Store
 */

import type { IBaseStore } from "./stores";
import type {
  ConversionResult,
  ConversionSettings,
  DocumentMetadata,
  SupportedFormat,
} from "./documentConverter";

/**
 * Interface für den DocumentConverter-Store
 */
export interface IDocumentConverterStore extends IBaseStore {
  // State properties
  uploadedFiles: any[];
  convertedDocuments: ConversionResult[];
  conversionProgress: number;
  conversionStep: string;
  estimatedTimeRemaining: number;
  isConverting: boolean;
  isUploading: boolean;
  selectedDocumentId: string | null;
  error: any | null;
  currentView: string;
  conversionSettings: Partial<ConversionSettings>;
  lastUpdated: Date | null;
  initialized: boolean;
  isLoading: boolean;
  useFallback: boolean;
  activeConversionId: string | null;

  // Getters
  hasDocuments: boolean;
  selectedDocument: ConversionResult | null;
  conversionStatus: string;
  filteredDocuments: (filterType: string) => ConversionResult[];
  documentsByFormat: Record<string, ConversionResult[]>;
  documentCounts: {
    total: number;
    pending: number;
    processing: number;
    success: number;
    error: number;
  };
  supportedFormats: SupportedFormat[];
  maxFileSize: number;

  // Actions
  initialize(): Promise<void>;
  uploadDocument(file: File): Promise<string | null>;
  convertDocument(
    documentId: string,
    progressCallback?: (
      progress: number,
      step: string,
      timeRemaining: number | null,
    ) => void,
    settings?: Partial<ConversionSettings>,
  ): Promise<boolean>;
  deleteDocument(documentId: string): Promise<boolean>;
  cancelConversion(documentId: string): Promise<void>;
  selectDocument(documentId: string | null): void;
  setView(view: string): void;
  updateSettings(settings: Partial<ConversionSettings>): void;
  setError(code: string, error: any): void;
  clearError(): void;
  resetState(): void;
  refreshDocuments(): Promise<void>;
  setUseFallback(value: boolean): void;
  isSupportedFormat(format: string): boolean;
  downloadDocument(documentId: string): Promise<void>;
}

/**
 * Interface für den Store-Rückgabewert
 */
export interface DocumentConverterStoreReturn extends IDocumentConverterStore {
  // Store-spezifische Methoden
}

/**
 * State-Interface für den DocumentConverter
 */
export interface DocumentConverterState {
  uploadedFiles: any[];
  convertedDocuments: ConversionResult[];
  conversionProgress: number;
  conversionStep: string;
  estimatedTimeRemaining: number;
  isConverting: boolean;
  isUploading: boolean;
  selectedDocumentId: string | null;
  error: any | null;
  currentView: string;
  conversionSettings: Partial<ConversionSettings>;
  lastUpdated: Date | null;
  initialized: boolean;
  isLoading: boolean;
  useFallback: boolean;
  activeConversionId: string | null;
}
