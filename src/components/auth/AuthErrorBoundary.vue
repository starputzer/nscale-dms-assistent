<template>
  <!-- 
    AuthErrorBoundary: Fängt Authentifizierungsfehler auf und zeigt benutzerfreundliche Fehlermeldungen
    anstelle des generischen "Schwerwiegender Fehler" Overlays.
    
    Verwendet Vue 3 ErrorBoundary-Muster mit onErrorCaptured + Slots
  -->
  <div class="auth-error-boundary">
    <!-- Zeigt den Error-UI nur bei Fehlern an, sonst den normalen Content -->
    <template v-if="error">
      <div class="auth-error-container">
        <div class="auth-error-icon">
          <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        </div>
        <h2 class="auth-error-title">{{ errorTitle }}</h2>
        <p class="auth-error-message">{{ errorMessage }}</p>
        
        <!-- Zusätzliche Details im ausgeklappten Zustand -->
        <div v-if="showDetails" class="auth-error-details">
          <pre>{{ JSON.stringify(errorDetails, null, 2) }}</pre>
        </div>
        
        <!-- Toggle für Details -->
        <button 
          v-if="hasErrorDetails" 
          @click="toggleDetails" 
          class="auth-details-toggle"
        >
          {{ showDetails ? 'Details ausblenden' : 'Details anzeigen' }}
        </button>
        
        <!-- Aktionen für Benutzer -->
        <div class="auth-error-actions">
          <button @click="retryAuthentication" class="auth-error-retry">
            Erneut versuchen
          </button>
          <button @click="resetError" class="auth-error-reset">
            Anmeldeseite neu laden
          </button>
        </div>
      </div>
    </template>
    
    <!-- Standardinhalt (LoginView) wenn kein Fehler vorliegt -->
    <slot v-else></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useErrorReporting } from '@/composables/useErrorReporting'

// Strukturierte Error-Typen für bessere Typprüfung
type AuthErrorType = 'network' | 'server' | 'timeout' | 'token' | 'permission' | 'validation' | 'unknown'

interface AuthError {
  type: AuthErrorType
  message: string
  details?: Record<string, any>
  timestamp: string
  code?: string
  retry?: boolean
}

// Reaktiver State
const error = ref<AuthError | null>(null)
const showDetails = ref(false)
const router = useRouter()
const errorReporting = useErrorReporting()

// Computed Properties für UI-Darstellung
const errorTitle = computed(() => {
  if (!error.value) return 'Unbekannter Fehler'
  
  switch (error.value.type) {
    case 'network':
      return 'Verbindungsproblem'
    case 'server':
      return 'Serverfehler'
    case 'timeout':
      return 'Zeitüberschreitung'
    case 'token':
      return 'Authentifizierungsproblem'
    case 'permission':
      return 'Berechtigungsfehler'
    case 'validation':
      return 'Ungültige Eingabe'
    default:
      return 'Anmeldefehler'
  }
})

const errorMessage = computed(() => {
  if (!error.value) return 'Ein unbekannter Fehler ist aufgetreten.'
  
  switch (error.value.type) {
    case 'network':
      return 'Verbindung zum Server nicht möglich. Bitte überprüfen Sie Ihre Internetverbindung.'
    case 'server':
      return 'Der Server konnte die Anfrage nicht verarbeiten. Bitte versuchen Sie es später erneut.'
    case 'timeout':
      return 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.'
    case 'token':
      return 'Ihre Sitzung ist abgelaufen oder ungültig. Bitte melden Sie sich erneut an.'
    case 'permission':
      return 'Sie haben keine Berechtigung für diese Aktion.'
    case 'validation':
      return error.value.message || 'Die eingegebenen Daten sind ungültig.'
    default:
      return error.value.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
})

const errorDetails = computed(() => {
  if (!error.value) return {}
  
  return {
    type: error.value.type,
    message: error.value.message,
    code: error.value.code,
    timestamp: error.value.timestamp,
    ...error.value.details
  }
})

const hasErrorDetails = computed(() => {
  return error.value?.details && Object.keys(error.value.details).length > 0
})

// Methoden
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const resetError = () => {
  error.value = null
  // Browser-Seite neu laden als letzte Rettung
  window.location.reload()
}

const retryAuthentication = () => {
  // Fehler zurücksetzen
  error.value = null
  
  // Optional: Trigger eines spezifischen Events 
  // für komponenten-übergreifende Koordination
  emit('retry-auth')
}

/**
 * Setzt den Fehler mit strukturiertem Format
 * @param errorType Art des Fehlers
 * @param message Fehlermeldung
 * @param details Optionale Details (für Debugging)
 * @param code Optionaler Fehlercode
 */
const setAuthError = (
  errorType: AuthErrorType, 
  message: string, 
  details?: Record<string, any>,
  code?: string
) => {
  error.value = {
    type: errorType,
    message,
    details,
    code,
    timestamp: new Date().toISOString(),
    retry: true
  }
  
  // Fehler an Error-Reporting-System melden
  if (errorReporting) {
    errorReporting.captureError(new Error(message), {
      source: { type: 'auth', name: 'AuthErrorBoundary' },
      severity: errorType === 'network' ? 'medium' : 'high',
      context: {
        errorType,
        errorCode: code,
        ...details
      }
    })
  }
}

// Event-Emitter definieren
const emit = defineEmits<{
  (e: 'retry-auth'): void
  (e: 'error', error: AuthError): void
}>()

// Error-Handling mit onErrorCaptured Hook
onErrorCaptured((err, instance, info) => {
  console.error('[AuthErrorBoundary] Caught error:', err)
  
  // Error-Objekt analysieren und kategorisieren
  let errorType: AuthErrorType = 'unknown'
  let errorMessage = err instanceof Error ? err.message : String(err)
  let errorDetails: Record<string, any> = { info }
  let errorCode: string | undefined
  
  // Error-Typen erkennen
  if (err instanceof Error) {
    // Netzwerkfehler erkennen
    if (
      errorMessage.includes('network') || 
      errorMessage.includes('Network Error') ||
      errorMessage.includes('Failed to fetch')
    ) {
      errorType = 'network'
    } 
    // Timeout erkennen
    else if (
      errorMessage.includes('timeout') || 
      errorMessage.includes('timed out')
    ) {
      errorType = 'timeout'
    }
    // Server-Fehler erkennen
    else if (
      errorMessage.includes('500') ||
      errorMessage.includes('Server Error')
    ) {
      errorType = 'server'
    }
    // Token/Auth-Fehler erkennen
    else if (
      errorMessage.includes('token') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403')
    ) {
      errorType = 'token'
    }
    
    // Wenn Error ein eigenes "code"-Property hat (z.B. von API)
    if ('code' in err) {
      errorCode = (err as any).code
    }
    
    // Wenn Error ein eigenes "details"-Property hat
    if ('details' in err) {
      errorDetails = { ...errorDetails, ...(err as any).details }
    }
  }
  
  // Error mit erkanntem Typ setzen
  setAuthError(errorType, errorMessage, errorDetails, errorCode)
  
  // Event für den Parent emittieren
  emit('error', error.value as AuthError)
  
  // Fehler abfangen - nicht an Vue propagieren
  return false
})

// Expose function für Parent Components
defineExpose({
  setAuthError
})

// Provide context für verschachtelte Komponenten
provide('authErrorBoundary', {
  setAuthError
})
</script>

<style scoped>
.auth-error-boundary {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.auth-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.auth-error-icon {
  margin-bottom: 1.5rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #fee2e2;
  color: #dc2626;
}

.auth-error-title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.auth-error-message {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.5;
}

.auth-error-details {
  width: 100%;
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 4px;
  text-align: left;
  overflow-x: auto;
}

.auth-error-details pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.auth-details-toggle {
  margin-bottom: 1.5rem;
  padding: 0;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;
}

.auth-error-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.auth-error-retry,
.auth-error-reset {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.auth-error-retry {
  background-color: #2563eb;
  color: white;
  border: none;
}

.auth-error-retry:hover {
  background-color: #1d4ed8;
}

.auth-error-reset {
  background-color: transparent;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.auth-error-reset:hover {
  background-color: #f3f4f6;
}

@media (max-width: 640px) {
  .auth-error-container {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .auth-error-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .auth-error-retry,
  .auth-error-reset {
    width: 100%;
  }
}
</style>