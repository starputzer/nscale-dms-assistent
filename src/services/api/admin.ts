/**
 * API-Service für Admin-Funktionalitäten
 * Basierend auf dem Admin-Komponenten-Design (08.05.2025)
 */

import axios from 'axios';
import type { NewUser, MotdConfig } from '@/types/admin';

export const adminApi = {
  // User Management
  getUsers: () => axios.get('/api/admin/users'),
  createUser: (userData: NewUser) => axios.post('/api/admin/users', userData),
  updateUserRole: (userId: string, role: string) => axios.put(`/api/admin/users/${userId}/role`, { role }),
  deleteUser: (userId: string) => axios.delete(`/api/admin/users/${userId}`),
  
  // System
  getSystemStats: () => axios.get('/api/admin/stats'),
  clearModelCache: () => axios.post('/api/admin/clear-cache'),
  clearEmbeddingCache: () => axios.post('/api/admin/clear-embedding-cache'),
  
  // Feedback
  getFeedbackStats: () => axios.get('/api/admin/feedback/stats'),
  getNegativeFeedback: () => axios.get('/api/admin/feedback/negative'),
  
  // MOTD
  getMotd: () => axios.get('/api/motd'),
  updateMotd: (motdConfig: MotdConfig) => axios.post('/api/admin/update-motd', motdConfig),
  reloadMotd: () => axios.post('/api/admin/reload-motd'),
  
  // Document Converter
  getDocConverterStatus: () => axios.get('/api/admin/doc-converter/status'),
  getDocConverterJobs: () => axios.get('/api/admin/doc-converter/jobs'),
  getDocConverterSettings: () => axios.get('/api/admin/doc-converter/settings'),
  updateDocConverterSettings: (settings: any) => axios.post('/api/admin/doc-converter/settings', settings),
  startDocConverterJob: (jobId: string) => axios.post(`/api/admin/doc-converter/jobs/${jobId}/start`),
  cancelDocConverterJob: (jobId: string) => axios.post(`/api/admin/doc-converter/jobs/${jobId}/cancel`),
};