import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import type { LoginCredentials, User } from '../types/auth';

/**
 * Hook für Authentifizierungsfunktionen in Komponenten
 * Kapselt den Zugriff auf den Auth-Store und bietet eine vereinfachte API
 */
export function useAuth() {
  const authStore = useAuthStore();
  
  // Computed Properties für Reaktivität
  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);
  
  /**
   * Benutzer anmelden
   */
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    return await authStore.login(credentials);
  };
  
  /**
   * Benutzer abmelden
   */
  const logout = async (): Promise<void> => {
    await authStore.logout();
  };
  
  /**
   * Prüfen, ob der aktuelle Benutzer eine bestimmte Rolle hat
   */
  const hasRole = (role: string): boolean => {
    return authStore.hasRole(role);
  };
  
  /**
   * Benutzerinfos aktualisieren
   */
  const refreshUserInfo = async (): Promise<void> => {
    await authStore.refreshUserInfo();
  };
  
  return {
    // Computed Properties
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    
    // Methoden
    login,
    logout,
    hasRole,
    refreshUserInfo
  };
}