/**
 * useAuthentication - Vue 3 Composable für Authentifizierungslogik
 * 
 * Dieses Composable kapselt die gesamte Authentifizierungslogik und stellt
 * reaktive Variablen, berechnete Eigenschaften und Methoden für die 
 * Authentifizierungsverwaltung bereit.
 */

import { ref, computed, reactive, watch, onMounted, Ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthService, { 
  AuthError, 
  LoginCredentials, 
  RegisterCredentials,
  AuthResponse
} from '@/services/auth/AuthService'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useErrorReporting } from '@/composables/useErrorReporting'
import { useAuthStore } from '@/stores/auth'

// Interface für den Benutzer
export interface User {
  id: string
  email: string
  username?: string
  displayName?: string
  role?: string
}

// Interface für den Return-Typ des Composables
export interface UseAuthenticationReturn {
  // Reaktiver State
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
  authError: Ref<AuthError | null>
  lastActivity: Ref<number>
  
  // Anmeldedaten für Formulare
  loginForm: {
    email: string
    password: string
    rememberMe: boolean
  }
  
  registerForm: {
    username: string
    email: string
    password: string
    passwordConfirm: string
    displayName: string
  }
  
  // Berechnete Eigenschaften
  isAdmin: Ref<boolean>
  hasRole: (role: string) => boolean
  
  // Methoden
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (credentials: RegisterCredentials) => Promise<boolean>
  logout: () => Promise<void>
  demoLogin: () => Promise<boolean>
  validateSession: () => Promise<boolean>
  refreshSession: () => Promise<boolean>
  resetError: () => void
  clearSession: () => void
}

/**
 * Composable für Authentifizierungsfunktionalität 
 */
export function useAuthentication(): UseAuthenticationReturn {
  // Abhängigkeiten
  const router = useRouter()
  const authService = AuthService
  
  // Try-Catch verwenden, um Fehler bei der Initialisierung des Error-Reporting zu vermeiden
  let errorReporting;
  try {
    errorReporting = useErrorReporting();
  } catch (e) {
    console.warn('Error Reporting Service konnte nicht initialisiert werden, verwende Dummy-Implementation', e);
    // Dummy-Implementation laden, wenn die normale nicht funktioniert
    const { dummyErrorReporting } = require('@/utils/errorReportingDummy');
    errorReporting = dummyErrorReporting;
  }
  
  // Persistenter Storage mit lokalem Fallback
  const { 
    value: storedUser, 
    setValue: setStoredUser 
  } = useLocalStorage<User | null>('auth_user', null)
  
  // Reaktiver State
  const user = ref<User | null>(storedUser.value)
  const isAuthenticated = computed(() => Boolean(user.value && authService.isAuthenticated()))
  const isLoading = ref(false)
  const authError = ref<AuthError | null>(null)
  const lastActivity = ref<number>(Date.now())
  const sessionTimeoutId = ref<number | null>(null)
  
  // Status der automatischen Session-Validierung
  const isValidatingSession = ref(false)
  
  // Formulardaten
  const loginForm = reactive({
    email: '',
    password: '',
    rememberMe: false
  })
  
  const registerForm = reactive({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    displayName: ''
  })
  
  // Computed properties
  const isAdmin = computed(() => {
    return user.value?.role === 'admin'
  })
  
  /**
   * Überwacht Benutzeraktivität und aktualisiert den Zeitstempel
   */
  function setupActivityTracking() {
    const updateActivity = () => {
      lastActivity.value = Date.now()
    }
    
    // Event-Listener für Benutzeraktivität
    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('click', updateActivity)
    window.addEventListener('touchstart', updateActivity)
    
    // Session-Timeout überwachen und erneuern
    watch(lastActivity, () => {
      if (isAuthenticated.value) {
        // Bestehenden Timer abbrechen
        if (sessionTimeoutId.value) {
          window.clearTimeout(sessionTimeoutId.value)
        }
        
        // Neuen Timer setzen (z.B. 30 Minuten)
        const thirtyMinutes = 30 * 60 * 1000
        sessionTimeoutId.value = window.setTimeout(() => {
          // Bei Inaktivität Session validieren
          validateSession()
        }, thirtyMinutes)
      }
    })
  }
  
  /**
   * Login mit E-Mail und Passwort
   */
  async function login(credentials: LoginCredentials): Promise<boolean> {
    try {
      resetError()
      isLoading.value = true
      
      // Fallback für leere Felder
      if (!credentials.email && loginForm.email) {
        credentials.email = loginForm.email
      }
      
      if (!credentials.password && loginForm.password) {
        credentials.password = loginForm.password
      }
      
      // Login über AuthService
      const response = await authService.login(credentials)
      
      if (response.token && response.user) {
        // Benutzer im lokalen State und Storage speichern
        setUserData(response.user)
        return true
      } else {
        throw new AuthError('Ungültige Antwort vom Authentifizierungsserver', 'unknown')
      }
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Benutzerregistrierung
   */
  async function register(credentials: RegisterCredentials): Promise<boolean> {
    try {
      resetError()
      isLoading.value = true
      
      // Fallback für leere Felder
      if (!credentials.email && registerForm.email) {
        credentials.email = registerForm.email
      }
      
      if (!credentials.username && registerForm.username) {
        credentials.username = registerForm.username
      }
      
      if (!credentials.password && registerForm.password) {
        credentials.password = registerForm.password
      }
      
      if (!credentials.displayName && registerForm.displayName) {
        credentials.displayName = registerForm.displayName
      }
      
      // Registrierung über AuthService
      const response = await authService.register(credentials)
      
      if (response.token && response.user) {
        // Benutzer im lokalen State und Storage speichern
        setUserData(response.user)
        return true
      } else {
        throw new AuthError('Ungültige Antwort vom Registrierungsserver', 'unknown')
      }
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Demo-Login mit vorkonfigurierten Testdaten
   */
  async function demoLogin(): Promise<boolean> {
    try {
      resetError()
      isLoading.value = true
      
      // Demo-Login über AuthService
      const response = await authService.demoLogin()
      
      if (response.token && response.user) {
        // Benutzer im lokalen State und Storage speichern
        setUserData(response.user)
        return true
      } else {
        console.error('Ungültige Antwort vom Authentifizierungsserver:', response)
        throw new AuthError('Ungültige Antwort vom Authentifizierungsserver', 'unknown')
      }
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Logout-Funktion
   */
  async function logout(): Promise<void> {
    try {
      isLoading.value = true
      
      // Logout über AuthService
      await authService.logout()
      
      // Lokale Daten zurücksetzen
      clearSession()
      
      // Zur Login-Seite navigieren
      router.push({ name: 'Login' })
    } catch (error) {
      console.error('Fehler beim Logout:', error)
      
      // Bei Fehlern trotzdem lokale Daten zurücksetzen
      clearSession()
      router.push({ name: 'Login' })
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Session validieren (z.B. beim App-Start oder nach Inaktivität)
   */
  async function validateSession(): Promise<boolean> {
    // Wenn keine Session existiert oder bereits validiert wird
    if (!isAuthenticated.value || isValidatingSession.value) {
      return false
    }
    
    try {
      isValidatingSession.value = true
      
      // Token auf dem Server validieren
      const isValid = await authService.validateToken()
      
      if (!isValid) {
        // Bei ungültigem Token Session zurücksetzen
        clearSession()
        router.push({ name: 'Login' })
        return false
      }
      
      return true
    } catch (error) {
      console.error('Fehler bei Session-Validierung:', error)
      
      // Bei Netzwerkfehlern gehen wir davon aus, dass die Session noch gültig ist
      if (error instanceof AuthError && error.type === 'network') {
        return true
      }
      
      // Bei anderen Fehlern Session zurücksetzen
      clearSession()
      router.push({ name: 'Login' })
      return false
    } finally {
      isValidatingSession.value = false
    }
  }
  
  /**
   * Session aktualisieren (Token erneuern)
   */
  async function refreshSession(): Promise<boolean> {
    if (!isAuthenticated.value) {
      return false
    }
    
    try {
      isLoading.value = true
      
      // Token aktualisieren
      await authService.refreshToken()
      return true
    } catch (error) {
      handleAuthError(error)
      
      // Bei Token-Fehlern Session zurücksetzen
      if (
        error instanceof AuthError && (
          error.type === 'token_expired' || 
          error.type === 'token_invalid'
        )
      ) {
        clearSession()
        router.push({ name: 'Login' })
      }
      
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Benutzer hat eine bestimmte Rolle
   */
  function hasRole(role: string): boolean {
    return user.value?.role === role
  }
  
  /**
   * Benutzerdaten im State und Storage speichern
   */
  function setUserData(userData: User): void {
    user.value = userData
    setStoredUser(userData)
    lastActivity.value = Date.now()
    
    // Auch den Auth Store aktualisieren
    const authStore = useAuthStore()
    authStore.user = userData
    if (authService.getToken()) {
      authStore.token = authService.getToken()!
      authStore.expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 Stunden default
    }
  }
  
  /**
   * Session-Daten zurücksetzen
   */
  function clearSession(): void {
    user.value = null
    setStoredUser(null)
    
    // Timer abbrechen
    if (sessionTimeoutId.value) {
      window.clearTimeout(sessionTimeoutId.value)
      sessionTimeoutId.value = null
    }
    
    // Auch den Auth Store zurücksetzen
    const authStore = useAuthStore()
    authStore.user = null
    authStore.token = null
    authStore.expiresAt = null
  }
  
  /**
   * Authentifizierungsfehler behandeln
   */
  function handleAuthError(error: unknown): void {
    // Fehler in standardisiertes Format konvertieren
    if (error instanceof AuthError) {
      authError.value = error
    } else if (error instanceof Error) {
      authError.value = new AuthError(
        error.message,
        'unknown',
        undefined,
        { stack: error.stack }
      )
    } else {
      authError.value = new AuthError(
        'Unbekannter Authentifizierungsfehler',
        'unknown',
        undefined,
        { originalError: error }
      )
    }
    
    // Fehler an Reporting-System senden
    try {
      if (errorReporting && typeof errorReporting.captureError === 'function') {
        errorReporting.captureError(
          authError.value,
          {
            source: { type: 'auth', name: 'useAuthentication' },
            severity: 'high',
            context: {
              errorType: authError.value.type,
              userId: user.value?.id
            }
          }
        );
      } else {
        // Fallback, wenn errorReporting nicht verfügbar ist
        console.error('[useAuthentication] Auth Error:', authError.value, 'Typ:', authError.value.type, 'User:', user.value?.id);
      }
    } catch (e) {
      console.error('[useAuthentication] Fehler beim Error-Reporting:', e);
    }
    
    console.error('Auth error:', authError.value)
  }
  
  /**
   * Authentifizierungsfehler zurücksetzen
   */
  function resetError(): void {
    authError.value = null
  }
  
  /**
   * Initialisierung beim Komponenten-Mount
   */
  onMounted(() => {
    // Activity-Tracking einrichten
    setupActivityTracking()
    
    // Session validieren, wenn bereits eine existiert
    if (isAuthenticated.value) {
      validateSession()
    }
  })
  
  // Composable-API zurückgeben
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    authError,
    lastActivity,
    
    // Formulardaten
    loginForm,
    registerForm,
    
    // Computed properties
    isAdmin,
    hasRole,
    
    // Methoden
    login,
    register,
    logout,
    demoLogin,
    validateSession,
    refreshSession,
    resetError,
    clearSession
  }
}

// Standardexport für einfache Verwendung
export default useAuthentication