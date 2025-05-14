import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
  Role,
  TokenStatus,
  PermissionCheck,
} from "../types/auth";
import type { UseAuthReturn } from "../utils/composableTypes";

/**
 * Hook für Authentifizierungsfunktionen in Komponenten
 * Kapselt den Zugriff auf den Auth-Store und bietet eine einheitliche API
 * für Authentifizierungs-, Autorisierungs- und Benutzerverwaltungsfunktionen
 *
 * @returns {UseAuthReturn} Objekt mit Authentifizierungsfunktionen und reaktiven Eigenschaften
 */
export function useAuth(): UseAuthReturn {
  const authStore = useAuthStore();

  // Computed Properties für Reaktivität
  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);
  const tokenStatus = computed(() => authStore.tokenStatus);
  const tokenExpiresIn = computed(() => authStore.tokenExpiresIn);
  const permissions = computed(() => authStore.permissions);

  /**
   * Benutzer anmelden
   * @param credentials Anmeldeinformationen (E-Mail/Passwort)
   * @returns True, wenn die Anmeldung erfolgreich war
   */
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    return await authStore.login(credentials);
  };

  /**
   * Neuen Benutzer registrieren
   * @param credentials Registrierungsinformationen
   * @returns True, wenn die Registrierung erfolgreich war
   */
  const register = async (
    credentials: RegisterCredentials,
  ): Promise<boolean> => {
    return await authStore.register(credentials);
  };

  /**
   * Benutzer abmelden
   */
  const logout = async (): Promise<void> => {
    await authStore.logout();
  };

  /**
   * Prüfen, ob der aktuelle Benutzer eine bestimmte Rolle hat
   * @param role Die zu prüfende Rolle
   * @returns True, wenn der Benutzer die Rolle hat
   */
  const hasRole = (role: Role): boolean => {
    return authStore.hasRole(role);
  };

  /**
   * Prüfen, ob der aktuelle Benutzer eine von mehreren Rollen hat
   * @param roles Die zu prüfenden Rollen
   * @returns True, wenn der Benutzer mindestens eine der Rollen hat
   */
  const hasAnyRole = (roles: Role[]): boolean => {
    return authStore.hasAnyRole(roles);
  };

  /**
   * Prüfen, ob der aktuelle Benutzer eine bestimmte Berechtigung hat
   * @param permission Die zu prüfende Berechtigung (z.B. 'user:read')
   * @returns True, wenn der Benutzer die Berechtigung hat
   */
  const hasPermission = (permission: string): boolean => {
    return authStore.hasPermission(permission);
  };

  /**
   * Prüfen, ob der aktuelle Benutzer eine von mehreren Berechtigungen hat
   * @param permissions Die zu prüfenden Berechtigungen
   * @returns True, wenn der Benutzer mindestens eine der Berechtigungen hat
   */
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return authStore.hasAnyPermission(requiredPermissions);
  };

  /**
   * Umfassende Berechtigungsprüfung mit detaillierten Informationen
   * @param permission Die zu prüfende Berechtigung
   * @returns Objekt mit Informationen zur Berechtigungsprüfung
   */
  const checkPermission = (permission: string): PermissionCheck => {
    return authStore.checkPermission(permission);
  };

  /**
   * Benutzerinfos aktualisieren
   * @returns True, wenn die Aktualisierung erfolgreich war
   */
  const refreshUserInfo = async (): Promise<boolean> => {
    return await authStore.refreshUserInfo();
  };

  /**
   * Aktives Token validieren und bei Bedarf aktualisieren
   * @returns True, wenn das Token gültig ist oder erfolgreich aktualisiert wurde
   */
  const validateCurrentToken = async (): Promise<boolean> => {
    return await authStore.validateCurrentToken();
  };

  /**
   * Benutzerpräferenzen aktualisieren
   * @param preferences Zu aktualisierende Präferenzen
   * @returns True, wenn die Aktualisierung erfolgreich war
   */
  const updateUserPreferences = async (
    preferences: Record<string, any>,
  ): Promise<boolean> => {
    return await authStore.updateUserPreferences(preferences);
  };

  /**
   * Authorization-Header für API-Anfragen erstellen
   * @returns Authorization-Header mit Bearer-Token
   */
  const createAuthHeaders = () => {
    return authStore.createAuthHeaders();
  };

  return {
    // Computed Properties
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    tokenStatus,
    tokenExpiresIn,
    permissions,

    // Authentifizierungsmethoden
    login,
    register,
    logout,
    validateCurrentToken,
    refreshUserInfo,

    // Autorisierungsmethoden
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    checkPermission,

    // Benutzerverwaltung
    updateUserPreferences,

    // Hilfsmethoden
    createAuthHeaders,
  };
}
