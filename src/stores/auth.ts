import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { User, LoginCredentials, Role, AuthState } from '@/types/auth';
import axios from 'axios';

/**
 * Auth Store zur Verwaltung der Benutzerauthentifizierung
 * - Verwaltet Login und Logout
 * - Token-Verwaltung mit automatischem Refresh
 * - Rollenbasierte Zugriffskontrolle
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
  const version = ref<number>(2); // Für Migrationen und Versionierung
  const tokenRefreshInProgress = ref<boolean>(false);
  const lastTokenRefresh = ref<number>(0);

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

  /**
   * Migration von Legacy-Storage
   */
  function migrateFromLegacyStorage() {
    try {
      // Legacy v1 Daten
      const legacyToken = localStorage.getItem('token');
      const legacyUser = localStorage.getItem('user');
      const legacyExpires = localStorage.getItem('token_expires');
      
      // Nur migrieren, wenn noch keine v2 Daten vorhanden sind
      if (legacyToken && !token.value) {
        token.value = legacyToken;
        
        if (legacyUser) {
          try {
            user.value = JSON.parse(legacyUser);
            
            // Stellen sicher, dass das User-Objekt die aktuellen Felder enthält
            if (!user.value.roles) {
              user.value.roles = user.value.role ? [user.value.role] : ['user'];
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
          // Fallback: 24 Stunden ab jetzt
          expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
        }
        
        console.log('Auth-Daten aus Legacy-Storage migriert');
      }
    } catch (error) {
      console.error('Fehler bei der Auth-Migration:', error);
    }
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
        token.value = response.data.token;
        refreshToken.value = response.data.refreshToken || refreshToken.value;
        expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000); // Default: 1 Stunde
        
        // Benutzerinfos aktualisieren, falls vorhanden
        if (response.data.user) {
          user.value = response.data.user;
        }
        
        lastTokenRefresh.value = Date.now();
        return true;
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
    let tokenRefreshInterval: number | null = null;
    
    if (isAuthenticated.value) {
      // Sofort prüfen, ob ein Token-Refresh nötig ist
      refreshTokenIfNeeded();
      
      // Interval für regelmäßige Prüfungen setzen
      tokenRefreshInterval = window.setInterval(() => {
        refreshTokenIfNeeded();
      }, 60000); // Alle 60 Sekunden prüfen
    }
    
    // Cleanup-Funktion
    return () => {
      if (tokenRefreshInterval !== null) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }

  // Automatischer Cleanup, wenn der Store zerstört wird
  const cleanup = initialize();

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
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        token.value = response.data.token;
        refreshToken.value = response.data.refreshToken || null;
        user.value = response.data.user;
        expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
        lastTokenRefresh.value = Date.now();
        
        // Wenn der Benutzer angemeldet ist, initialisieren wir den Token-Refresh-Mechanismus
        initialize();
        
        return true;
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
   * Benutzer abmelden
   */
  async function logout(): Promise<void> {
    isLoading.value = true;
    
    try {
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
    
    // Getters
    isAuthenticated,
    isAdmin,
    isExpired,
    tokenExpiresIn,
    
    // Actions
    login,
    logout,
    hasRole,
    hasAnyRole,
    refreshUserInfo,
    refreshTokenIfNeeded,
    createAuthHeaders,
    initialize,
    migrateFromLegacyStorage
  };
}, {
  // Persistenz-Konfiguration
  persist: {
    // Verwende localStorage für die Persistenz
    storage: localStorage,
    
    // Selektives Speichern bestimmter State-Elemente
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version'],
    
    // Automatisch beim Seitenladen aktivieren
    autoRestore: true
  },
});
