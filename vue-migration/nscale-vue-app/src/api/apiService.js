import axios from 'axios'

// API Basis-URL konfigurieren
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request Interceptor für Authentifizierung
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor für Fehlerbehandlung
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    // Bei 401 Unauthorized automatisch abmelden
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      // Optional: Zur Login-Seite umleiten
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getUserInfo: () => apiClient.get('/auth/user'),
  resetPassword: (email) => apiClient.post('/auth/reset-password', { email })
}

// Sessions API
export const sessionsApi = {
  getSessions: () => apiClient.get('/sessions'),
  getSession: (sessionId) => apiClient.get(`/session/${sessionId}`),
  createSession: (title = 'Neue Unterhaltung') => apiClient.post('/session', { title }),
  deleteSession: (sessionId) => apiClient.delete(`/session/${sessionId}`),
  updateSessionTitle: (sessionId) => apiClient.post(`/session/${sessionId}/update-title`)
}

// Chat API
export const chatApi = {
  sendQuestion: (sessionId, question) => apiClient.post(`/chat/${sessionId}`, { question }),
  startStreaming: (sessionId, question) => apiClient.post(`/chat/${sessionId}/stream`, { question }),
  submitFeedback: (messageId, sessionId, isPositive, comment = '') => 
    apiClient.post(`/feedback/${messageId}`, { session_id: sessionId, positive: isPositive, comment })
}

// Admin API
export const adminApi = {
  // Benutzer-Verwaltung
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (userData) => apiClient.post('/admin/users', userData),
  updateUserRole: (userId, role) => apiClient.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
  
  // System-Monitoring
  getSystemStats: () => apiClient.get('/admin/system/stats'),
  clearModelCache: () => apiClient.post('/admin/system/clear-model-cache'),
  clearEmbeddingCache: () => apiClient.post('/admin/system/clear-embedding-cache'),
  
  // Feedback-Verwaltung
  getFeedbackStats: () => apiClient.get('/admin/feedback/stats'),
  getNegativeFeedback: () => apiClient.get('/admin/feedback/negative'),
  
  // MOTD-Verwaltung
  getMotdConfig: () => apiClient.get('/admin/motd/config'),
  saveMotdConfig: (config) => apiClient.post('/admin/motd/config', config),
  reloadMotd: () => apiClient.post('/admin/motd/reload')
}

// Dokumentenkonverter API
export const docConverterApi = {
  convertDocument: (formData) => 
    apiClient.post('/doc-converter/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  getConversionHistory: () => apiClient.get('/doc-converter/history')
}

// Einheitlicher Export
export default {
  auth: authApi,
  sessions: sessionsApi,
  chat: chatApi,
  admin: adminApi,
  docConverter: docConverterApi
}