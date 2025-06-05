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
    DASHBOARD: '/api/admin-dashboard',
    USERS: '/api/admin/users',
    USER: (id: number) => `/api/admin/users/${id}`,
    FEEDBACK: '/api/admin/feedback',
    STATISTICS: '/api/admin-statistics',
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
      BASE: '/api/knowledge',
      TRAIN: '/api/knowledge/train'
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
