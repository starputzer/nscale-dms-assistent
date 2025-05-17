/**
 * Zentrale View-Import-Map für Vue Router
 * 
 * Diese Datei stellt sicher, dass alle Views korrekt importiert werden,
 * unabhängig vom Build-System oder der Laufzeitumgebung
 */

export const viewImports = {
  ChatView: () => import('@/views/ChatView.vue'),
  DocumentsView: () => import('@/views/DocumentsView.vue'),
  AdminView: () => import('@/views/AdminView.vue'),
  SettingsView: () => import('@/views/SettingsView.vue'),
  AuthView: () => import('@/views/AuthView.vue'),
  EnhancedChatView: () => import('@/views/EnhancedChatView.vue'),
  EnhancedLoginView: () => import('@/views/EnhancedLoginView.vue'),
  LoginView: () => import('@/views/LoginView.vue'),
  ErrorView: () => import('@/views/ErrorView.vue'),
  NotFoundView: () => import('@/views/NotFoundView.vue')
};