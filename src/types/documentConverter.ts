/**
 * Typdefinitionen für den Dokumentenkonverter
 * 
 * Dieses Modul enthält TypeScript-Interfaces für den Dokumentenkonverter-Bereich,
 * einschließlich Status, Konfigurationen und Dateitypen.
 */

import { Document } from './api';

/**
 * Konversionsergebnis
 */
export interface ConversionResult {
  /** Eindeutige ID */
  id: string;
  
  /** Ursprünglicher Dateiname */
  originalName: string;
  
  /** Ursprüngliches Format */
  originalFormat: string;
  
  /** Dateigröße in Bytes */
  size: number;
  
  /** Extrahierter Inhalt (bei Textformaten) */
  content?: string;
  
  /** Hochladezeitpunkt */
  uploadedAt?: Date;
  
  /** Konvertierungszeitpunkt */
  convertedAt?: Date;
  
  /** Konvertierungsstatus */
  status: 'pending' | 'processing' | 'success' | 'error';
  
  /** Fehlermeldung bei Konvertierungsproblemen */
  error?: string;
  
  /** Dokument-Metadaten */
  metadata?: DocumentMetadata;
  
  /** War die Konvertierung erfolgreich? */
  success?: boolean;
  
  /** Konvertiertes Dokument */
  document?: Document;
  
  /** Warnungen während der Konvertierung */
  warnings?: string[];
  
  /** Dauer der Konvertierung in Millisekunden */
  duration?: number;
  
  /** Ursprüngliche Dateigröße in Bytes */
  originalSize?: number;
  
  /** Resultierende Dateigröße in Bytes */
  resultSize?: number;
}

/**
 * Dokument-Metadaten
 */
export interface DocumentMetadata {
  /** Dokumenttitel */
  title?: string;
  
  /** Autor des Dokuments */
  author?: string;
  
  /** Erstellungsdatum */
  created?: Date;
  
  /** Änderungsdatum */
  modified?: Date;
  
  /** Schlüsselwörter/Tags */
  keywords?: string[];
  
  /** Anzahl der Seiten */
  pageCount?: number;
  
  /** Extrahierte Tabellen */
  tables?: TableMetadata[];
  
  /** Zusätzliche, formatspezifische Metadaten */
  [key: string]: any;
}

/**
 * Metadaten für extrahierte Tabellen
 */
export interface TableMetadata {
  /** Seitennummer */
  pageNumber: number;
  
  /** Anzahl Zeilen */
  rowCount: number;
  
  /** Anzahl Spalten */
  columnCount: number;
  
  /** Tabellenüberschriften */
  headers?: string[];
  
  /** Tabellendaten */
  data?: string[][];
}

/**
 * Unterstützte Dateiformate
 */
export type SupportedFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';

/**
 * Konvertierungseinstellungen
 */
export interface ConversionSettings {
  /** Ursprüngliche Formatierung beibehalten */
  preserveFormatting: boolean;
  
  /** Metadaten extrahieren */
  extractMetadata: boolean;
  
  /** Tabellen extrahieren */
  extractTables: boolean;
  
  /** OCR aktivieren */
  ocrEnabled?: boolean;
  
  /** OCR-Sprache */
  ocrLanguage?: string;
  
  /** Maximale Seitenanzahl */
  maxPages?: number;
}

/**
 * Konvertierungsfortschritt
 */
export interface ConversionProgress {
  /** Dokument-ID */
  documentId: string;
  
  /** Fortschritt in Prozent (0-100) */
  progress: number;
  
  /** Aktueller Verarbeitungsschritt */
  step: string;
  
  /** Geschätzte verbleibende Zeit in Sekunden */
  estimatedTimeRemaining?: number;
}

/**
 * Upload-Fortschritt
 */
export interface UploadProgress {
  /** Bereits hochgeladene Bytes */
  loaded: number;
  
  /** Gesamtzahl der Bytes */
  total: number;
  
  /** Fortschritt in Prozent (0-100) */
  percentage: number;
}

/**
 * Status eines Dokuments im Konvertierungsprozess
 */
export interface DocumentConverterState {
  /** Dokument-ID */
  id: string;
  
  /** Aktueller Status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Fortschritt in Prozent (0-100) */
  progress: number;
  
  /** Fehlerzähler für automatische Wiederholungen */
  errorCount?: number;
  
  /** Vollständiges Dokument, falls vorhanden */
  document?: Document;
  
  /** Fehlermeldung, falls vorhanden */
  error?: string;
}

/**
 * Konfiguration für den Dokumentenkonverter
 */
export interface DocumentConverterConfig {
  /** Maximale Dateigröße in Bytes */
  maxFileSize: number;
  
  /** Erlaubte Dateitypen (MIME-Types) */
  allowedTypes: string[];
  
  /** Timeout für die Konvertierung in Millisekunden */
  conversionTimeout: number;
  
  /** Status-Polling-Intervall in Millisekunden */
  statusPollingInterval: number;
  
  /** Maximale Anzahl paralleler Uploads */
  maxConcurrentUploads: number;
  
  /** Maximale Anzahl paralleler Konvertierungen */
  maxConcurrentConversions: number;
  
  /** Cache-TTL für konvertierte Dokumente in Sekunden */
  documentCacheTTL: number;
}

/**
 * Mapping von Dateierweiterungen zu MIME-Types
 */
export const FILE_TYPE_MAP: Record<string, string> = {
  // Dokumente
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'odt': 'application/vnd.oasis.opendocument.text',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odp': 'application/vnd.oasis.opendocument.presentation',
  
  // Bilder
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  
  // Textdateien
  'txt': 'text/plain',
  'csv': 'text/csv',
  'html': 'text/html',
  'htm': 'text/html',
  'xml': 'application/xml',
  'json': 'application/json',
  'md': 'text/markdown',
  
  // Archive
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/gzip'
};

/**
 * Standardkonfiguration für den Dokumentenkonverter
 */
export const DEFAULT_CONVERTER_CONFIG: DocumentConverterConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/plain',
    'text/csv',
    'text/html',
    'application/xml',
    'application/json',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml'
  ],
  conversionTimeout: 5 * 60 * 1000, // 5 Minuten
  statusPollingInterval: 2000, // 2 Sekunden
  maxConcurrentUploads: 3,
  maxConcurrentConversions: 5,
  documentCacheTTL: 24 * 60 * 60 // 24 Stunden
};

/**
 * Konvertierungsoptionen für verschiedene Zielformate
 */
export interface ConversionOptions {
  /** Zielformat für die Konvertierung */
  targetFormat: string;
  
  /** Komprimierungsqualität (0-100 für Bilder, PDF) */
  quality?: number;
  
  /** OCR aktivieren für Bilder und PDFs */
  ocrEnabled?: boolean;
  
  /** Zielsprache für OCR */
  ocrLanguage?: string;
  
  /** Seitenbereiche für mehrseitige Dokumente */
  pageRange?: {
    start?: number;
    end?: number;
  };
  
  /** Extrahiere strukturierte Daten (z.B. Tabellen) */
  extractStructuredData?: boolean;
  
  /** Formatierungsoptionen */
  formatting?: {
    /** Behalte die ursprüngliche Formatierung bei */
    preserveFormatting?: boolean;
    
    /** Schriftgröße skalieren */
    fontScale?: number;
    
    /** Einheitlicher Schrifttyp für das ganze Dokument */
    uniformFont?: string;
  };
}

/**
 * Validierungsergebnis für einen Datei-Upload
 */
export interface FileValidationResult {
  /** Ist die Datei gültig? */
  valid: boolean;
  
  /** Fehlermeldungen */
  errors: string[];
  
  /** Warnungen */
  warnings: string[];
  
  /** Automatische Korrekturen */
  corrections: string[];
}

/**
 * Unterstützte Zielformate für die Konvertierung
 */
export enum TargetFormat {
  PDF = 'pdf',
  TEXT = 'txt',
  HTML = 'html',
  MARKDOWN = 'md',
  JSON = 'json',
  CSV = 'csv',
  DOCX = 'docx',
  XLSX = 'xlsx'
}

/**
 * Hilfstypen für Konvertierungswarteschlange
 */
export interface QueuedConversion {
  /** Eindeutige ID für die Warteschlange */
  queueId: string;
  
  /** Dokument-ID */
  documentId: string;
  
  /** Konvertierungsoptionen */
  options: ConversionOptions;
  
  /** Zeitpunkt des Eintrags in die Warteschlange */
  queuedAt: number;
  
  /** Status in der Warteschlange */
  status: 'queued' | 'processing' | 'completed' | 'failed';
  
  /** Priorität (höhere Werte = höhere Priorität) */
  priority: number;
}