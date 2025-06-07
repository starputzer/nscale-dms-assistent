/**
 * TypeScript-Definitionen für Feature-Toggles
 * Erstellt im Rahmen der Feature-Toggle-Verbesserungen (05.2025)
 */

/**
 * Feature Toggles
 */
export interface FeatureToggle {
  key: string;
<<<<<<< HEAD
  id?: string; // Add backwards compatibility with API
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  name: string;
  description?: string;
  category: string;
  enabled: boolean;
  dependencies?: string[];
  locked?: boolean;
  experimental?: boolean;
<<<<<<< HEAD
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
 * Feature Toggle Statistics
 */
export interface FeatureToggleStats {
<<<<<<< HEAD
  total?: number; // Add backwards compatibility
  enabled?: number;
  enabledPercent?: number;
  categories?: Record<string, number>;
  history?: Array<{
    date: string;
    enabled: number;
  }>;
  // Original fields
  totalFeatures?: number;
  enabledFeatures?: number;
  disabledFeatures?: number;
  experimentalFeatures?: number;
  lockedFeatures?: number;
  categoryCounts?: Record<string, number>;
  mostUsedFeatures?: Array<{
=======
  totalFeatures: number;
  enabledFeatures: number;
  disabledFeatures: number;
  experimentalFeatures: number;
  lockedFeatures: number;
  categoryCounts: Record<string, number>;
  mostUsedFeatures: Array<{
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    key: string;
    name: string;
    usageCount: number;
  }>;
<<<<<<< HEAD
  recentErrors?: FeatureErrorLog[];
=======
  recentErrors: FeatureErrorLog[];
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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

/**
 * Feature Toggle Error
 */
export interface FeatureToggleError {
  code?: string;
  message: string;
  feature?: string;
  details?: any;
  timestamp?: Date;
  fallbackActive?: boolean;
}

/**
 * Feature Toggle Status
 */
export interface FeatureToggleStatus {
  enabled: boolean;
  available?: boolean;
  reason?: string;
  lastChecked?: Date;
  errorCount?: number;
  fallbackActive?: boolean;
}

/**
 * Feature Config
 */
export interface FeatureConfig {
  name: string;
  description: string;
  enabled: boolean;
  group?: string;
  requiredRole?: FeatureToggleRole;
  dependencies?: string[];
  status?: FeatureToggleStatus;
  [key: string]: any;
}

/**
 * Feature Toggle Role
 */
export type FeatureToggleRole = 'admin' | 'user' | 'developer' | 'guest';
