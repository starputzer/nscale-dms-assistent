/**
 * TypeScript-Definitionen für Feature-Toggles
 * Erstellt im Rahmen der Feature-Toggle-Verbesserungen (05.2025)
 */

/**
 * Feature Toggles
 */
export interface FeatureToggle {
  key: string;
  name: string;
  description?: string;
  category: string;
  enabled: boolean;
  dependencies?: string[];
  locked?: boolean;
  experimental?: boolean;
}

/**
 * Feature Metrics
 */
export interface FeatureMetrics {
  usageCount: number;
  errorCount: number;
  errorRate: number;
  lastUsed?: string | null;
  trend?: {
    date: string;
    count: number;
  }[];
}

/**
 * Feature Error Log
 */
export interface FeatureErrorLog {
  feature: string;
  message: string;
  timestamp: string;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
  browserInfo?: {
    userAgent: string;
    device: string;
    os: string;
    browser: string;
  };
}

/**
 * Feature History Entry
 */
export interface FeatureHistoryEntry {
  timestamp: string;
  user: string;
  changes: Record<
    string,
    {
      old: any;
      new: any;
    }
  >;
}

/**
 * Feature Category
 */
export type FeatureCategory = string;

/**
 * Import Options
 */
export interface FeatureImportOptions {
  overwrite: boolean;
  keepEnabled: boolean;
}

/**
 * Metrics Query Parameters
 */
export interface MetricsQuery {
  startDate: Date;
  endDate: Date;
  features?: string[];
}

/**
 * Feature Toggles Store State
 */
export interface FeatureTogglesState {
  features: FeatureToggle[];
  categories: FeatureCategory[];
  loading: boolean;
  error: string | null;
  metrics: Record<string, FeatureMetrics>;
}
