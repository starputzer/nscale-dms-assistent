export interface ConversionResult {
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

export interface DocumentMetadata {
  title?: string;
  author?: string;
  created?: Date;
  modified?: Date;
  keywords?: string[];
  pageCount?: number;
  tables?: TableMetadata[];
  [key: string]: any; // Für zusätzliche, formatspezifische Metadaten
}

export interface TableMetadata {
  pageNumber: number;
  rowCount: number;
  columnCount: number;
  headers?: string[];
  data?: string[][];
}

export type SupportedFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';

export interface ConversionSettings {
  preserveFormatting: boolean;
  extractMetadata: boolean;
  extractTables: boolean;
  ocrEnabled?: boolean;
  ocrLanguage?: string;
  maxPages?: number;
}

export interface ConversionProgress {
  documentId: string;
  progress: number;
  step: string;
  estimatedTimeRemaining?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}