<<<<<<< HEAD
// Unified API Routes Configuration

// Export base URL for compatibility
export const API_BASE = '/api';
export const API_BASE_VERSIONED = '/api';  // No v1 anymore

export const API_ROUTES = {
  // Base URL
  BASE: API_BASE,
  
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  
  // Chat
  CHAT: {
    MESSAGE: '/api/chat',
    SESSIONS: '/api/sessions'
  },
  
  // Documents
  DOCUMENTS: {
    UPLOAD: '/api/documents/upload',
    LIST: '/api/documents',
    DELETE: (id: string) => `/api/documents/${id}`
  },
  
  // Admin
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    USERS: '/api/admin/users',
    USER: (id: number) => `/api/admin/users/${id}`,
    FEEDBACK: '/api/admin/feedback',
    STATISTICS: '/api/admin/statistics',
    SYSTEM: {
      INFO: '/api/admin/system/info',
      CACHE_CLEAR: '/api/admin/system/cache/clear',
      OPTIMIZE: '/api/admin/system/optimize'
    },
    RAG: {
      CONFIG: '/api/rag-settings/config',
      REINDEX: '/api/rag/reindex'
    },
    KNOWLEDGE: {
      BASE: '/api/knowledge-manager',
      TRAIN: '/api/knowledge-manager/train'
    },
    TASKS: {
      LIST: '/api/background-processing/jobs',
      DETAIL: (id: string) => `/api/background-processing/jobs/${id}`,
      CANCEL: (id: string) => `/api/background-processing/jobs/${id}/cancel`
    },
    MONITOR: {
      HEALTH: '/api/system-monitor/health',
      PERFORMANCE: '/api/performance/metrics'
    }
  },
  
  // Public
  PUBLIC: {
    HEALTH: '/api/health',
    VERSION: '/api/version',
    FEATURES: '/api/features'
  }
};

// Helper function to build API URLs
export function buildApiUrl(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  return `${API_BASE}/${path}`;
}

export default API_ROUTES;
=======
/**
 * Shared API Routes Configuration
 * 
 * This file contains all API routes used by both frontend and backend.
 * It ensures consistency and prevents path conflicts.
 * 
 * Best Practice: Single source of truth for all API paths
 */

// API Version - Change this in one place to update all routes
export const API_VERSION = 'v1';

// Base API path without version
export const API_BASE = '/api';

// Full API base with version
export const API_BASE_VERSIONED = `${API_BASE}/${API_VERSION}`;

/**
 * Authentication Routes
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  LOGOUT: '/logout',
  REFRESH: '/refresh',
  USER: '/user',
  VERIFY: '/verify',
} as const;

/**
 * Session Routes
 */
export const SESSION_ROUTES = {
  LIST: '/sessions',
  GET: (id: string) => `/sessions/${id}`,
  CREATE: '/sessions',
  UPDATE: (id: string) => `/sessions/${id}`,
  DELETE: (id: string) => `/sessions/${id}`,
  MESSAGES: (id: string) => `/sessions/${id}/messages`,
  STREAM: (id: string) => `/sessions/${id}/stream`,
  ASK: '/ask',
} as const;

/**
 * Admin Routes
 */
export const ADMIN_ROUTES = {
  // User Management
  USERS: {
    LIST: '/admin/users',
    GET: (id: string) => `/admin/users/${id}`,
    CREATE: '/admin/users',
    UPDATE: (id: string) => `/admin/users/${id}`,
    DELETE: (id: string) => `/admin/users/${id}`,
    UPDATE_ROLE: (id: string) => `/admin/users/${id}/role`,
    COUNT: '/admin/users/count',
    STATS: '/admin/users/stats',
    ACTIVE: '/admin/users/active',
    LOCK: (id: string) => `/admin/users/${id}/lock`,
    UNLOCK: (id: string) => `/admin/users/${id}/unlock`,
  },
  
  // Feedback Management
  FEEDBACK: {
    LIST: '/admin/feedback',
    GET: (id: string) => `/admin/feedback/${id}`,
    UPDATE: (id: string) => `/admin/feedback/${id}`,
    DELETE: (id: string) => `/admin/feedback/${id}`,
    STATS: '/admin/feedback/stats',
    NEGATIVE: '/admin/feedback/negative',
    EXPORT: '/admin/feedback/export',
    FILTER: '/admin/feedback/filter',
  },
  
  // Feature Toggles
  FEATURES: {
    LIST: '/admin/feature-toggles',
    GET: (id: string) => `/admin/feature-toggles/${id}`,
    UPDATE: (id: string) => `/admin/feature-toggles/${id}`,
    CREATE: '/admin/feature-toggles',
    DELETE: (id: string) => `/admin/feature-toggles/${id}`,
    STATS: '/admin/feature-toggles/stats',
  },
  
  // System Management
  SYSTEM: {
    INFO: '/admin/system',
    STATS: '/admin/system/stats',
    CHECK: '/admin/system/check',
    ACTIONS: '/admin/system/actions',
    CLEAR_CACHE: '/admin/clear-cache',
    CLEAR_EMBEDDING_CACHE: '/admin/clear-embedding-cache',
    REINDEX: '/admin/reindex',
  },
  
  // MOTD Management
  MOTD: {
    GET: '/admin/motd',
    UPDATE: '/admin/motd',
    RELOAD: '/admin/motd/reload',
  },
  
  // Document Converter
  DOC_CONVERTER: {
    STATUS: '/admin/doc-converter/status',
    JOBS: '/admin/doc-converter/jobs',
    SETTINGS: '/admin/doc-converter/settings',
  },
} as const;

/**
 * Document Routes
 */
export const DOCUMENT_ROUTES = {
  UPLOAD: '/documents/upload',
  CONVERT: '/documents/convert',
  GET: (id: string) => `/documents/${id}`,
  DELETE: (id: string) => `/documents/${id}`,
  LIST: '/documents',
} as const;

/**
 * Feedback Routes (non-admin)
 */
export const FEEDBACK_ROUTES = {
  SUBMIT: '/feedback',
} as const;

/**
 * System Routes (non-admin)
 */
export const SYSTEM_ROUTES = {
  HEALTH: '/health',
  INFO: '/info',
  MOTD: '/motd',
} as const;

/**
 * Helper function to build full API URL
 */
export function buildApiUrl(route: string, includeVersion = true): string {
  if (includeVersion) {
    return `${API_BASE_VERSIONED}${route}`;
  }
  return `${API_BASE}${route}`;
}

/**
 * Helper function to build full URL with base URL
 */
export function buildFullUrl(baseUrl: string, route: string, includeVersion = true): string {
  const apiPath = buildApiUrl(route, includeVersion);
  // Remove trailing slash from baseUrl and leading slash from apiPath if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanApiPath = apiPath.startsWith('/') ? apiPath : '/' + apiPath;
  return `${cleanBaseUrl}${cleanApiPath}`;
}

/**
 * Export all routes as a single object for convenience
 */
export const API_ROUTES = {
  AUTH: AUTH_ROUTES,
  SESSION: SESSION_ROUTES,
  ADMIN: ADMIN_ROUTES,
  DOCUMENT: DOCUMENT_ROUTES,
  FEEDBACK: FEEDBACK_ROUTES,
  SYSTEM: SYSTEM_ROUTES,
} as const;

/**
 * Type exports for TypeScript
 */
export type ApiRoute = typeof API_ROUTES;
export type AuthRoute = typeof AUTH_ROUTES;
export type SessionRoute = typeof SESSION_ROUTES;
export type AdminRoute = typeof ADMIN_ROUTES;
export type DocumentRoute = typeof DOCUMENT_ROUTES;
export type FeedbackRoute = typeof FEEDBACK_ROUTES;
export type SystemRoute = typeof SYSTEM_ROUTES;
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
