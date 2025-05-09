import { defineStore } from 'pinia';
import { ref, computed, watch, onUnmounted } from 'vue';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  Role,
  AuthState,
  TokenStatus,
  PermissionCheck,
  LoginResponse
} from '@/types/auth';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

/**
 * Auth Store zur Verwaltung der Benutzerauthentifizierung
 * - Verwaltet Login und Logout
 * - Token-Verwaltung mit automatischem Refresh
 * - Rollenbasierte Zugriffskontrolle
 * - Granulare Berechtigungsprüfungen
 * - Sichere Token-Validierung und Speicherung
 * - Fehlerbehandlung und Wiederherstellung
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const version = ref<number>(3); // Für Migrationen und Versionierung
  const tokenRefreshInProgress = ref<boolean>(false);
  const lastTokenRefresh = ref<number>(0);
  const tokenRefreshInterval = ref<number | null>(null);
  const permissions = ref<Set<string>>(new Set());

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const isAdmin = computed(() => !!user.value?.roles?.includes('admin'));

  const isExpired = computed(() => {
    if (!expiresAt.value) return false;
    // Token gilt als abgelaufen, wenn er in weniger als 5 Minuten abläuft
    return Date.now() > (expiresAt.value - 5 * 60 * 1000);
  });

  // Token-Ablaufzeit (in Sekunden)
  const tokenExpiresIn = computed(() => {
    if (!expiresAt.value) return 0;
    return Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000));
  });

  // Token-Status für Monitoring und Debugging
  const tokenStatus = computed((): TokenStatus => {
    if (!token.value) return 'missing';
    if (!expiresAt.value) return 'invalid';

    const timeToExpiry = expiresAt.value - Date.now();

    if (timeToExpiry <= 0) return 'expired';
    if (timeToExpiry < 5 * 60 * 1000) return 'expiring'; // < 5 Minuten
    return 'valid';
  });

  /**
   * Hilfsfunktion zur Validierung eines JWT-Tokens
   * Überprüft Struktur und grundlegende Claims
   */
  function validateToken(tokenValue: string): boolean {
    try {
      if (!tokenValue || typeof tokenValue !== 'string') {
        return false;
      }

      // JWT-Struktur prüfen (header.payload.signature)
      if (!tokenValue.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
        return false;
      }

      // Token dekodieren und Claims prüfen
      const decodedToken: any = jwtDecode(tokenValue);

      // Notwendige Claims prüfen
      if (!decodedToken.sub || !decodedToken.exp) {
        return false;
      }

      // Ablaufzeit prüfen
      const expiryTime = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
      if (Date.now() >= expiryTime) {
        return false;
      }

      return true;
    } catch (err) {
      console.error('Token-Validierungsfehler:', err);
      return false;
    }
  }

  /**
   * Migration von Legacy-Storage
   */
  function migrateFromLegacyStorage() {
    try {
      // Legacy v1/v2 Daten
      const legacyToken = localStorage.getItem('token');
      const legacyRefreshToken = localStorage.getItem('refreshToken');
      const legacyUser = localStorage.getItem('user');
      const legacyExpires = localStorage.getItem('token_expires');
      const legacyVersion = localStorage.getItem('auth_version');

      // Nur migrieren, wenn noch keine v3 Daten vorhanden sind oder Version < 3
      const currentVersion = legacyVersion ? parseInt(legacyVersion, 10) : 0;
      if ((legacyToken && !token.value) || currentVersion < 3) {
        // Token migrieren und validieren
        if (legacyToken && validateToken(legacyToken)) {
          token.value = legacyToken;

          // Refresh-Token migrieren, falls vorhanden
          if (legacyRefreshToken) {
            refreshToken.value = legacyRefreshToken;
          }

          // Benutzerdaten migrieren
          if (legacyUser) {
            try {
              user.value = JSON.parse(legacyUser);

              // Stellen sicher, dass das User-Objekt die aktuellen Felder enthält
              if (!user.value.roles) {
                user.value.roles = user.value.role ? [user.value.role] : ['user'];
              }

              // Berechtigungen aus Rollen extrahieren
              if (user.value.roles) {
                extractPermissionsFromRoles(user.value.roles);
              }
            } catch (e) {
              console.error('Fehler beim Parsen der Legacy-Benutzerdaten', e);
            }
          }

          // Ablaufzeit setzen
          if (legacyExpires) {
            try {
              expiresAt.value = parseInt(legacyExpires, 10);
            } catch (e) {
              // Fallback: 24 Stunden ab jetzt
              expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
            }
          } else {
            try {
              // Aus Token extrahieren, falls möglich
              const decodedToken: any = jwtDecode(legacyToken);
              if (decodedToken.exp) {
                expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
              } else {
                // Fallback: 24 Stunden ab jetzt
                expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
              }
            } catch (e) {
              // Fallback: 24 Stunden ab jetzt
              expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
            }
          }

          console.log('Auth-Daten aus Legacy-Storage migriert');
        }
      }
    } catch (error) {
      console.error('Fehler bei der Auth-Migration:', error);
    }
  }

  /**
   * Extrahiert standardisierte Berechtigungen aus Rollen
   * Basierend auf Rollenkonventionen wie 'admin', 'user:read', etc.
   */
  function extractPermissionsFromRoles(roles: string[]) {
    permissions.value.clear();

    // Standardberechtigungen basierend auf Rollen
    roles.forEach(role => {
      // Administratorrechte
      if (role === 'admin') {
        permissions.value.add('user:create');
        permissions.value.add('user:read');
        permissions.value.add('user:update');
        permissions.value.add('user:delete');
        permissions.value.add('system:manage');
        permissions.value.add('settings:manage');
        permissions.value.add('docs:manage');
      }

      // Supportrechte
      if (role === 'support') {
        permissions.value.add('user:read');
        permissions.value.add('system:read');
        permissions.value.add('docs:read');
        permissions.value.add('docs:convert');
      }

      // Standard-Benutzerrechte
      if (role === 'user') {
        permissions.value.add('docs:read');
        permissions.value.add('docs:convert');
        permissions.value.add('settings:read');
      }

      // Gastrechte
      if (role === 'guest') {
        permissions.value.add('docs:read');
      }

      // Spezifische berechtigungsbasierte Rollen (Format: resource:action)
      if (role.includes(':')) {
        permissions.value.add(role);
      }
    });
  }

  /**
   * Prüft, ob der Benutzer eine bestimmte Berechtigung hat
   */
  function hasPermission(permission: string): boolean {
    if (!isAuthenticated.value) return false;

    // Admin hat immer alle Berechtigungen
    if (isAdmin.value) return true;

    return permissions.value.has(permission);
  }

  /**
   * Prüft, ob der Benutzer eine der angegebenen Berechtigungen hat
   */
  function hasAnyPermission(requiredPermissions: string[]): boolean {
    if (!isAuthenticated.value) return false;

    // Admin hat immer alle Berechtigungen
    if (isAdmin.value) return true;

    return requiredPermissions.some(permission => permissions.value.has(permission));
  }

  /**
   * Umfassende Berechtigungsprüfung mit detaillierten Informationen
   */
  function checkPermission(permission: string): PermissionCheck {
    if (!isAuthenticated.value) {
      return { hasPermission: false, user: null };
    }

    // Admin hat immer alle Berechtigungen
    if (isAdmin.value) {
      return { hasPermission: true, user: user.value };
    }

    const hasRequired = permissions.value.has(permission);

    return {
      hasPermission: hasRequired,
      user: user.value,
      requiredRole: hasRequired ? undefined : 'admin' // Falls nicht berechtigt, zeige erforderliche Rolle
    };
  }

  /**
   * Token-Refresh-Mechanismus
   * Automatisches Aktualisieren des Tokens, wenn er bald abläuft
   */
  async function refreshTokenIfNeeded(): Promise<boolean> {
    // Nicht ausführen, wenn:
    // - Kein Token vorhanden
    // - Token noch gültig
    // - Bereits ein Refresh läuft
    // - Letzter Refresh war vor weniger als 10 Sekunden (Schutz vor Endlosschleifen)
    if (
      !token.value ||
      !refreshToken.value ||
      !isExpired.value ||
      tokenRefreshInProgress.value ||
      (Date.now() - lastTokenRefresh.value) < 10000
    ) {
      return true;
    }

    tokenRefreshInProgress.value = true;

    try {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: refreshToken.value
      });

      if (response.data.success) {
        const newToken = response.data.token;

        // Token validieren, bevor er gespeichert wird
        if (validateToken(newToken)) {
          token.value = newToken;
          refreshToken.value = response.data.refreshToken || refreshToken.value;

          // Ablaufzeit aus Token extrahieren oder vom Server verwenden
          try {
            const decodedToken: any = jwtDecode(newToken);
            if (decodedToken.exp) {
              expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
            } else {
              // Fallback auf Server-gelieferte Zeit
              expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
            }
          } catch (e) {
            // Fallback auf Server-gelieferte Zeit
            expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
          }

          // Benutzerinfos aktualisieren, falls vorhanden
          if (response.data.user) {
            user.value = response.data.user;

            // Berechtigungen aktualisieren
            if (user.value.roles) {
              extractPermissionsFromRoles(user.value.roles);
            }
          }

          lastTokenRefresh.value = Date.now();
          return true;
        } else {
          console.error('Erhaltener Token ist ungültig');
          logout();
          return false;
        }
      }

      // Bei Fehlschlag: Abmelden, da der Token nicht mehr gültig ist
      logout();
      return false;
    } catch (err) {
      console.error('Fehler beim Token-Refresh:', err);

      // Bei Netzwerkfehlern nicht sofort abmelden, nur bei Authentifizierungsfehlern
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }

      return false;
    } finally {
      tokenRefreshInProgress.value = false;
    }
  }

  /**
   * Initialisiert den Auth-Store
   */
  function initialize() {
    migrateFromLegacyStorage();

    // Automatischer Token-Refresh, wenn der Benutzer aktiv ist
    if (isAuthenticated.value) {
      // Sofort prüfen, ob ein Token-Refresh nötig ist
      refreshTokenIfNeeded();

      // Interval für regelmäßige Prüfungen setzen
      if (tokenRefreshInterval.value !== null) {
        clearInterval(tokenRefreshInterval.value);
      }

      tokenRefreshInterval.value = window.setInterval(() => {
        refreshTokenIfNeeded();
      }, 60000); // Alle 60 Sekunden prüfen
    }

    // Automatisch bereinigen, wenn Komponente zerstört wird
    onUnmounted(() => {
      cleanup();
    });
  }

  /**
   * Cleanup-Funktion für Timer und Intervalle
   */
  function cleanup() {
    if (tokenRefreshInterval.value !== null) {
      clearInterval(tokenRefreshInterval.value);
      tokenRefreshInterval.value = null;
    }
  }

  /**
   * Benutzerspezifische HTTP-Header für API-Anfragen erstellen
   */
  function createAuthHeaders() {
    if (!token.value) return {};

    return {
      Authorization: `Bearer ${token.value}`
    };
  }

  /**
   * Login-Vorgang durchführen
   */
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await axios.post<LoginResponse>('/api/auth/login', credentials);

      if (response.data.success) {
        const newToken = response.data.token;

        // Token validieren, bevor er gespeichert wird
        if (validateToken(newToken)) {
          token.value = newToken;
          refreshToken.value = response.data.refreshToken || null;
          user.value = response.data.user;

          // Ablaufzeit aus Token extrahieren oder vom Server verwenden
          try {
            const decodedToken: any = jwtDecode(newToken);
            if (decodedToken.exp) {
              expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
            } else {
              // Fallback auf Server-gelieferte Zeit
              expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
            }
          } catch (e) {
            // Fallback auf Server-gelieferte Zeit
            expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
          }

          lastTokenRefresh.value = Date.now();

          // Berechtigungen aus Rollen extrahieren
          if (user.value.roles) {
            extractPermissionsFromRoles(user.value.roles);
          }

          // Wenn der Benutzer angemeldet ist, initialisieren wir den Token-Refresh-Mechanismus
          initialize();

          return true;
        } else {
          error.value = 'Ungültiger Token vom Server erhalten';
          return false;
        }
      } else {
        error.value = response.data.message || 'Login fehlgeschlagen';
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Netzwerkfehler beim Login';
      error.value = errorMessage;
      console.error('Login-Fehler:', errorMessage);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Registrieren eines neuen Benutzers
   */
  async function register(credentials: RegisterCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await axios.post<LoginResponse>('/api/auth/register', credentials);

      if (response.data.success) {
        const newToken = response.data.token;

        // Token validieren, bevor er gespeichert wird
        if (validateToken(newToken)) {
          token.value = newToken;
          refreshToken.value = response.data.refreshToken || null;
          user.value = response.data.user;

          // Ablaufzeit aus Token extrahieren oder vom Server verwenden
          try {
            const decodedToken: any = jwtDecode(newToken);
            if (decodedToken.exp) {
              expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
            } else {
              // Fallback auf Server-gelieferte Zeit
              expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
            }
          } catch (e) {
            // Fallback auf Server-gelieferte Zeit
            expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
          }

          lastTokenRefresh.value = Date.now();

          // Berechtigungen aus Rollen extrahieren
          if (user.value.roles) {
            extractPermissionsFromRoles(user.value.roles);
          }

          // Wenn der Benutzer angemeldet ist, initialisieren wir den Token-Refresh-Mechanismus
          initialize();

          return true;
        } else {
          error.value = 'Ungültiger Token vom Server erhalten';
          return false;
        }
      } else {
        error.value = response.data.message || 'Registrierung fehlgeschlagen';
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Netzwerkfehler bei der Registrierung';
      error.value = errorMessage;
      console.error('Registrierungsfehler:', errorMessage);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Benutzer abmelden
   */
  async function logout(): Promise<void> {
    isLoading.value = true;

    try {
      // Cleanup für Timer und Intervalle
      cleanup();

      // Nur Logout-Request senden, wenn ein Token vorhanden ist
      if (token.value) {
        await axios.post('/api/auth/logout', {
          refreshToken: refreshToken.value
        }, {
          headers: createAuthHeaders()
        }).catch(err => {
          // Fehler beim Logout ignorieren, trotzdem lokal abmelden
          console.warn('Fehler beim Logout-Request:', err);
        });
      }
    } finally {
      // Lokalen State zurücksetzen
      token.value = null;
      refreshToken.value = null;
      user.value = null;
      expiresAt.value = null;
      lastTokenRefresh.value = 0;
      isLoading.value = false;
      permissions.value.clear();

      // Version und Error behalten
      // error.value = null;
    }
  }

  /**
   * Prüfen, ob der aktuelle Benutzer eine bestimmte Rolle hat
   */
  function hasRole(role: Role): boolean {
    if (!user.value?.roles) return false;
    return user.value.roles.includes(role);
  }

  /**
   * Mehrere Rollen prüfen (eine davon muss vorhanden sein)
   */
  function hasAnyRole(roles: Role[]): boolean {
    if (!user.value?.roles) return false;
    return roles.some(role => user.value!.roles.includes(role));
  }

  /**
   * Benutzerinformationen vom Server aktualisieren
   */
  async function refreshUserInfo(): Promise<boolean> {
    if (!token.value) return false;

    // Wenn Token abgelaufen ist, zuerst Token aktualisieren
    if (isExpired.value) {
      const refreshSuccess = await refreshTokenIfNeeded();
      if (!refreshSuccess) return false;
    }

    isLoading.value = true;

    try {
      const response = await axios.get('/api/auth/user', {
        headers: createAuthHeaders()
      });

      if (response.data.success) {
        user.value = response.data.user;

        // Berechtigungen aktualisieren
        if (user.value.roles) {
          extractPermissionsFromRoles(user.value.roles);
        }

        return true;
      } else {
        return false;
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Token ist ungültig, versuchen zu aktualisieren
        const refreshSuccess = await refreshTokenIfNeeded();

        // Wenn Refresh erfolgreich, erneut versuchen
        if (refreshSuccess) {
          return refreshUserInfo();
        } else {
          // Wenn Refresh fehlschlägt, abmelden
          logout();
        }
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Aktiven Token überprüfen
   * - Validiert die Struktur
   * - Überprüft die Gültigkeit
   * - Aktualisiert bei Bedarf
   */
  async function validateCurrentToken(): Promise<boolean> {
    if (!token.value) return false;

    // Token-Struktur validieren
    if (!validateToken(token.value)) {
      // Wenn Token ungültig ist, versuchen zu aktualisieren
      if (refreshToken.value) {
        return await refreshTokenIfNeeded();
      } else {
        // Ohne Refresh-Token abmelden
        logout();
        return false;
      }
    }

    // Wenn Token abläuft, aktualisieren
    if (isExpired.value) {
      return await refreshTokenIfNeeded();
    }

    return true;
  }

  /**
   * Benutzerpräferenzen im Benutzerprofil aktualisieren
   */
  async function updateUserPreferences(preferences: Record<string, any>): Promise<boolean> {
    if (!isAuthenticated.value) return false;

    try {
      isLoading.value = true;

      // Token validieren und bei Bedarf aktualisieren
      const isTokenValid = await validateCurrentToken();
      if (!isTokenValid) return false;

      const response = await axios.patch('/api/auth/preferences', {
        preferences
      }, {
        headers: createAuthHeaders()
      });

      if (response.data.success) {
        // Lokale Benutzerdaten aktualisieren
        if (user.value) {
          user.value = {
            ...user.value,
            preferences: {
              ...(user.value.preferences || {}),
              ...preferences
            }
          };
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Benutzereinstellungen:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Bei Token-Änderungen automatisch die HTTP-Clients konfigurieren
  watch(token, (newToken) => {
    if (newToken) {
      // Axios-Interceptor für automatischen Token-Refresh
      const interceptorId = axios.interceptors.response.use(
        response => response,
        async error => {
          const originalRequest = error.config;

          // Wenn der Fehler 401 ist und es sich nicht um einen Token-Refresh-Request handelt
          // und der Request noch nicht wiederholt wurde
          if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/api/auth/refresh')
          ) {
            originalRequest._retry = true;

            const refreshSuccess = await refreshTokenIfNeeded();
            if (refreshSuccess) {
              // Ursprüngliche Anfrage mit neuem Token wiederholen
              originalRequest.headers.Authorization = `Bearer ${token.value}`;
              return axios(originalRequest);
            }
          }

          return Promise.reject(error);
        }
      );

      // Cleanup beim Logout
      const unwatchToken = watch(token, (newTokenValue) => {
        if (!newTokenValue) {
          axios.interceptors.response.eject(interceptorId);
          unwatchToken();
        }
      });
    }
  });

  return {
    // State
    user,
    token,
    refreshToken,
    expiresAt,
    isLoading,
    error,
    version,
    permissions,

    // Getters
    isAuthenticated,
    isAdmin,
    isExpired,
    tokenExpiresIn,
    tokenStatus,

    // Actions
    login,
    logout,
    register,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    checkPermission,
    refreshUserInfo,
    refreshTokenIfNeeded,
    validateCurrentToken,
    validateToken,
    createAuthHeaders,
    initialize,
    migrateFromLegacyStorage,
    updateUserPreferences,
    extractPermissionsFromRoles
  };
}, {
  // Persistenz-Konfiguration
  persist: {
    // Verwende localStorage für die Persistenz
    storage: localStorage,

    // Selektives Speichern bestimmter State-Elemente
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version'],

    // Sicherheitsmaßnahmen für die Persistenz
    serializer: {
      serialize: (state) => {
        // Selektives Serialisieren und Prüfung sensibler Daten
        const serialized = JSON.stringify({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user ? {
            ...state.user,
            // Sensible Daten nicht speichern
            password: undefined
          } : null,
          expiresAt: state.expiresAt,
          version: state.version
        });

        return serialized;
      },
      deserialize: (data) => {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error('Fehler beim Deserialisieren der Auth-Daten:', e);
          return {};
        }
      }
    },

    // Automatisch beim Seitenladen aktivieren
    autoRestore: true
  },
});
