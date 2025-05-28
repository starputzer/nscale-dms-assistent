/**
 * Globale TypeScript-Definitionen
 *
 * Diese Datei definiert globale Typen für die Anwendung
 */

// Vue-spezifische Typen
declare module "vue" {
  export interface GlobalProperties {
    $formatDate: (date: Date | string) => string;
    $formatCurrency: (amount: number) => string;
    $truncate: (text: string, length: number) => string;
  }
}

// Environment-Variablen
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_PORT: string;
  readonly VITE_PREVIEW_PORT: string;
  readonly VITE_USE_MOCK_DATA: string;
  readonly VITE_LOG_LEVEL: "debug" | "info" | "warn" | "error";
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_ALLOWED_FILE_TYPES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Window-Erweiterungen
interface Window {
  __APP_VERSION__: string;
  __BUILD_DATE__: string;
  __ENV__: string;
  __DEBUG__: boolean;
  __STORE_DEBUG__: boolean;
  __PERFORMANCE_MONITOR__: boolean;

  // Service Worker Registration
  __SW_REGISTRATION__?: ServiceWorkerRegistration;

  // Performance Metrics
  __PERFORMANCE_MARKS__: Map<string, number>;
  __PERFORMANCE_MEASURES__: Array<{
    name: string;
    duration: number;
    startTime: number;
  }>;
}

// API Response Typen
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Fehler-Typen
export interface AppError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp: Date;
  isOperational: boolean;
}

// Form-Typen
export interface FormField<T = any> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  validators: Array<(value: T) => string | null>;
}

export interface FormState<T extends Record<string, any>> {
  fields: {
    [K in keyof T]: FormField<T[K]>;
  };
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

// Navigation Typen
export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
  roles?: string[];
  hidden?: boolean;
}

// Notification Typen
export interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    handler: () => void;
    style?: "primary" | "secondary" | "text";
  }>;
  timestamp: Date;
}

// User Preferences
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  display: {
    density: "compact" | "comfortable" | "spacious";
    fontSize: "small" | "medium" | "large";
    animations: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    showOnlineStatus: boolean;
  };
}

// File Upload
export interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  result?: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  };
}

// Suchparameter
export interface SearchFilters {
  query: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  filters: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  categories?: string[];
}

// WebSocket Events
export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  id: string;
  userId?: string;
  sessionId?: string;
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  description: string;
  category: string;
  enabled: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

// Chart Daten
export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  meta?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: "line" | "bar" | "area" | "scatter";
  visible?: boolean;
}

// Tabellen-Konfiguration
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  format?: (value: any, row: T) => string;
  component?: any;
  hidden?: boolean;
  fixed?: "left" | "right";
}
