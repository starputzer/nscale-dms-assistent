/**
 * Unterstützte Dateiformate
 */
export type SupportedFormat = "pdf" | "docx" | "xlsx" | "pptx" | "html" | "txt";

export interface ConversionSettings {
  preserveFormatting: boolean;
  extractMetadata: boolean;
  extractTables: boolean;
  ocrEnabled: boolean;
  ocrLanguage: string;
}

export interface ConversionResult {
  id: string;
  filename: string;
  format: string;
  size: number;
  status: "pending" | "processing" | "completed" | "failed";
  uploadedAt: number; // timestamp
  convertedAt: number; // timestamp
  duration?: number; // duration in milliseconds
  content?: string;
  metadata?: Record<string, any>;
  error?: string;
  // Alternative property names that might come from API
  originalName?: string;
  originalFormat?: string;
}

export interface DocumentStatistics {
  totalConversions: number;
  conversionsPastWeek: number;
  successRate: number;
  activeConversions: number;
  conversionsByFormat: Record<string, number>;
  conversionTrend: number[]; // Last 7 days
}

export interface QueueJob {
  id: string;
  filename: string;
  userId: string;
  status: "processing" | "waiting";
  submittedAt: number; // timestamp
  progress?: number;
}

export interface QueueStats {
  activeJobs: number;
  waitingJobs: number;
  averageTime: number; // in seconds
}

export interface QueueInfo {
  queue: QueueJob[];
  stats: QueueStats;
  paused: boolean;
}

export interface ConverterSettings {
  maxFileSize: number; // in MB
  defaultFormat: string;
  enableThumbnails: boolean;
  enableOCR: boolean;
  ocrLanguage: string;
  enhancedOCR: boolean;
  storageLimit: number; // in GB
  retentionPeriod: number; // in days
}

export interface DocumentMeta {
  id: string;
  filename: string;
  format: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  author?: string;
  title?: string;
  pages?: number;
}
