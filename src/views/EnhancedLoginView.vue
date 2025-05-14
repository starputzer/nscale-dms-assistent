<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="@/assets/images/senmvku-logo.png" alt="nscale DMS Assistent" class="logo" />
          <h1 class="app-title">nscale DMS Assistent</h1>
        </div>
        
        <div class="auth-tabs">
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'login' }" 
            @click="setActiveTab('login')"
          >
            Anmelden
          </button>
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'register' }" 
            @click="setActiveTab('register')"
          >
            Registrieren
          </button>
        </div>
        
        <form class="auth-form" @submit.prevent="submitForm">
          <!-- E-Mail-Feld (für beide Tabs) -->
          <div class="form-group">
            <label for="email">E-Mail</label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              class="form-input"
              :class="{ 'input-error': v$.email.$error }"
              placeholder="name@example.com"
              required
              autocomplete="email"
              :disabled="isLoading"
              @blur="v$.email.$touch()"
            />
            <div v-if="v$.email.$error" class="input-error-message">
              {{ v$.email.$errors[0].$message }}
            </div>
          </div>
          
          <!-- Username (nur für Registrierung) -->
          <div v-if="activeTab === 'register'" class="form-group">
            <label for="username">Benutzername</label>
            <input
              id="username"
              v-model="formData.username"
              type="text"
              class="form-input"
              :class="{ 'input-error': v$.username?.$error }"
              placeholder="Benutzername"
              required
              autocomplete="username"
              :disabled="isLoading"
              @blur="v$.username?.$touch()"
            />
            <div v-if="v$.username?.$error" class="input-error-message">
              {{ v$.username.$errors[0].$message }}
            </div>
          </div>
          
          <!-- Passwort (für beide Tabs) -->
          <div class="form-group">
            <label for="password">Passwort</label>
            <div class="password-input-container">
              <input
                id="password"
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                :class="{ 'input-error': v$.password.$error }"
                placeholder="••••••••"
                required
                :autocomplete="activeTab === 'login' ? 'current-password' : 'new-password'"
                :disabled="isLoading"
                @blur="v$.password.$touch()"
              />
              <button
                type="button"
                class="password-toggle"
                @click="togglePasswordVisibility"
              >
                <span v-if="showPassword">Verbergen</span>
                <span v-else>Anzeigen</span>
              </button>
            </div>
            <div v-if="v$.password.$error" class="input-error-message">
              {{ v$.password.$errors[0].$message }}
            </div>
            
            <!-- Passwort-Hinweis -->
            <p v-if="activeTab === 'login'" class="password-hint">
              Hinweis: Verwenden Sie "123" als Test-Passwort.
            </p>
          </div>
          
          <!-- "Angemeldet bleiben" Checkbox (nur für Login) -->
          <div v-if="activeTab === 'login'" class="form-group checkbox-group">
            <div class="checkbox-container">
              <input
                id="rememberMe"
                v-model="formData.rememberMe"
                type="checkbox"
                :disabled="isLoading"
              />
              <label for="rememberMe">Angemeldet bleiben</label>
            </div>
          </div>
          
          <!-- Fehlermeldungen -->
          <div v-if="authError" class="auth-error-message">
            <strong>Fehler:</strong> {{ authError.message }}
          </div>
          
          <!-- Erfolgsmeldung -->
          <div v-if="loginSuccess" class="auth-success-message">
            {{ activeTab === 'login' ? 'Login erfolgreich!' : 'Registrierung erfolgreich!' }}
            Sie werden weitergeleitet...
          </div>
          
          <!-- Submit-Button -->
          <button
            type="submit"
            class="auth-submit-button"
            :disabled="isSubmitDisabled"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            {{ activeTab === "login" ? "Anmelden" : "Registrieren" }}
          </button>
          
          <!-- Demo-Login-Button -->
          <button
            v-if="activeTab === 'login'"
            type="button"
            class="demo-login-button"
            :disabled="isLoading"
            @click="handleDemoLogin"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            Demo-Login (martin@danglefeet.com/123)
          </button>
        </form>
        
        <!-- Passwort vergessen (nur für Login) -->
        <div v-if="activeTab === 'login'" class="forgot-password">
          <a href="#" @click.prevent="handleForgotPassword">Passwort vergessen?</a>
        </div>
        
        <!-- Footer mit Rechtlichem -->
        <div class="auth-footer">
          <p>© {{ currentYear }} nscale DMS Assistent</p>
          <div class="legal-links">
            <a href="#" @click.prevent="showLegal('datenschutz')">Datenschutz</a>
            <a href="#" @click.prevent="showLegal('impressum')">Impressum</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, sameAs, helpers } from '@vuelidate/validators'
import { useAuthentication } from '@/composables/useAuthentication'
import { useErrorReporting } from '@/composables/useErrorReporting'
import { useToast } from '@/composables/useToast'

// Router und Services einbinden
const router = useRouter()
const toast = useToast()

// Error Reporting mit Fallback
let errorReporting;
try {
  errorReporting = useErrorReporting();
} catch (e) {
  console.warn('Error Reporting Service konnte nicht initialisiert werden, verwende Dummy-Implementation', e);
  // Dummy-Implementation importieren
  import('@/utils/errorReportingDummy').then(module => {
    errorReporting = module.default;
  }).catch(err => {
    console.error('Fehler beim Laden des Dummy Error Reporting:', err);
    // Minimaler Fallback, wenn selbst das Dummy nicht geladen werden kann
    errorReporting = {
      captureError: (error) => { console.error('[FEHLER]', error); return 'error-id'; }
    };
  });
}

// Auth-Composable mit reactive state und Methoden
const { 
  login, 
  register, 
  demoLogin, 
  isLoading, 
  isAuthenticated, 
  authError, 
  resetError 
} = useAuthentication()

// Lokaler reaktiver State
const activeTab = ref<'login' | 'register'>('login')
const loginSuccess = ref(false)
const showPassword = ref(false)
const redirectTimeout = ref<number | null>(null)
const formError = ref<string | null>(null)

// Das aktuelle Jahr für das Copyright
const currentYear = new Date().getFullYear()

// Formulardaten
const formData = reactive({
  email: 'martin@danglefeet.com', // Default-Email für einfaches Testen
  username: '',
  password: '123', // Default-Passwort für einfaches Testen
  passwordConfirm: '',
  displayName: '',
  rememberMe: false,
})

// Validierungsregeln
const rules = computed(() => {
  const baseRules = {
    email: { 
      required: helpers.withMessage('E-Mail ist erforderlich', required),
      email: helpers.withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein', email) 
    },
    password: { 
      required: helpers.withMessage('Passwort ist erforderlich', required) 
    }
  }
  
  // Zusätzliche Regeln für Registrierung
  if (activeTab.value === 'register') {
    return {
      ...baseRules,
      username: { 
        required: helpers.withMessage('Benutzername ist erforderlich', required),
        minLength: helpers.withMessage(
          'Benutzername muss mindestens 3 Zeichen haben',
          minLength(3)
        )
      },
      password: {
        ...baseRules.password,
        minLength: helpers.withMessage(
          'Passwort muss mindestens 8 Zeichen haben',
          minLength(8)
        )
      },
      passwordConfirm: {
        required: helpers.withMessage('Passwortbestätigung ist erforderlich', required),
        sameAsPassword: helpers.withMessage(
          'Passwörter stimmen nicht überein',
          sameAs(formData.password)
        )
      }
    }
  }
  
  return baseRules
})

// Vuelidate initialisieren
const v$ = useVuelidate(rules, formData)

// Passwort-Stärke berechnen
const passwordStrength = computed(() => {
  const password = formData.password || ''
  
  return {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    score: calculatePasswordScore(password),
  }
})

const passwordStrengthLabel = computed(() => {
  const score = passwordStrength.value.score
  if (score === 0) return 'Sehr schwach'
  if (score === 1) return 'Schwach'
  if (score === 2) return 'Mittel'
  if (score === 3) return 'Stark'
  return 'Sehr stark'
})

const passwordStrengthColor = computed(() => {
  const score = passwordStrength.value.score
  if (score <= 1) return 'strength-weak'
  if (score === 2) return 'strength-medium'
  if (score === 3) return 'strength-good'
  return 'strength-strong'
})

// Ist der Submit-Button deaktiviert?
const isSubmitDisabled = computed(() => {
  if (isLoading.value) return true
  
  // Bei Registrierung Passwortübereinstimmung prüfen
  if (activeTab.value === 'register') {
    return formData.password !== formData.passwordConfirm
  }
  
  return false
})

// Tab wechseln und Formular zurücksetzen
function setActiveTab(tab: 'login' | 'register') {
  // Aktiven Tab setzen
  activeTab.value = tab
  
  // Fehler zurücksetzen
  resetError()
  formError.value = null
  
  // Formularvalidierung zurücksetzen
  nextTick(() => {
    v$.value.$reset()
  })
  
  // Erfolg zurücksetzen
  loginSuccess.value = false
  
  // Timeout löschen
  if (redirectTimeout.value) {
    window.clearTimeout(redirectTimeout.value)
    redirectTimeout.value = null
  }
}

// Passwortsichtbarkeit umschalten
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}

// Passwort-Stärke bewerten (0-4)
function calculatePasswordScore(password: string): number {
  if (!password) return 0
  
  let score = 0
  
  // Mindestlänge (8 Zeichen)
  if (password.length >= 8) score++
  
  // Zeichenkomplexität
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  
  // Zahlen
  if (/[0-9]/.test(password)) score++
  
  // Sonderzeichen
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  return score
}

// Formular absenden
async function submitForm() {
  try {
    resetError()
    formError.value = null
    
    // Formular validieren
    const isFormValid = await v$.value.$validate()
    if (!isFormValid) {
      return
    }
    
    if (activeTab.value === 'login') {
      await handleLogin()
    } else {
      await handleRegister()
    }
  } catch (error) {
    console.error('Fehler beim Absenden des Formulars:', error)
    
    // Error an Error-Reporting-Service senden
    try {
      if (errorReporting && typeof errorReporting.captureError === 'function') {
        errorReporting.captureError(error as Error, {
          source: { type: 'auth', name: 'LoginView' },
          severity: 'high',
          context: { activeTab: activeTab.value }
        });
      } else {
        // Fallback, wenn errorReporting nicht verfügbar ist
        console.error('[LoginView] Fehler:', error, 'activeTab:', activeTab.value);
      }
    } catch (e) {
      console.error('[LoginView] Fehler beim Error-Reporting:', e);
    }
    
    // Benutzerfreundliche Fehlermeldung anzeigen
    formError.value = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    
    // Toast-Nachricht anzeigen
    toast.error('Ein unerwarteter Fehler ist aufgetreten')
  }
}

// Login-Handler
async function handleLogin() {
  try {
    const success = await login({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe
    })
    
    if (success) {
      loginSuccess.value = true
      
      // Zur Hauptseite weiterleiten
      redirectAfterSuccess()
    }
  } catch (error) {
    console.error('Login fehlgeschlagen:', error)
    
    // Fehler wird bereits vom useAuthentication Composable behandelt
  }
}

// Registrierungs-Handler
async function handleRegister() {
  try {
    const success = await register({
      email: formData.email,
      username: formData.username,
      password: formData.password,
      displayName: formData.displayName
    })
    
    if (success) {
      loginSuccess.value = true
      
      // Zur Hauptseite weiterleiten
      redirectAfterSuccess()
      
      // Erfolgsmeldung anzeigen
      toast.success('Registrierung erfolgreich')
    }
  } catch (error) {
    console.error('Registrierung fehlgeschlagen:', error)
    
    // Fehler wird bereits vom useAuthentication Composable behandelt
  }
}

// Demo-Login-Handler
async function handleDemoLogin() {
  try {
    resetError()
    
    const success = await demoLogin()
    
    if (success) {
      loginSuccess.value = true
      
      // Zur Hauptseite weiterleiten
      redirectAfterSuccess()
    }
  } catch (error) {
    console.error('Demo-Login fehlgeschlagen:', error)
    
    // Fehler wird bereits vom useAuthentication Composable behandelt
  }
}

// Nach erfolgreichem Login/Registrierung weiterleiten
function redirectAfterSuccess() {
  // Bereits bestehenden Timeout löschen
  if (redirectTimeout.value) {
    window.clearTimeout(redirectTimeout.value)
  }
  
  // Neuen Timeout setzen
  redirectTimeout.value = window.setTimeout(() => {
    // Prüfen, ob es einen Redirect-Parameter gibt
    const redirect = router.currentRoute.value.query.redirect as string
    
    if (redirect) {
      // Zur Redirect-URL navigieren
      router.push(redirect)
    } else {
      // Zur Hauptseite navigieren
      router.push({ name: 'Home' })
    }
    
    // Timeout zurücksetzen
    redirectTimeout.value = null
  }, 1000) // 1 Sekunde Verzögerung für besseres UX-Feedback
}

// Passwort vergessen Handler
function handleForgotPassword() {
  // Hier könnte ein Modal oder eine separate Route geöffnet werden
  toast.info('Passwort-Wiederherstellung ist aktuell nicht verfügbar.')
}

// Rechtliche Informationen anzeigen
function showLegal(type: 'datenschutz' | 'impressum') {
  // Hier könnte ein Modal oder eine separate Route geöffnet werden
  toast.info(`${type === 'datenschutz' ? 'Datenschutz' : 'Impressum'} wird geladen...`)
}

/**
 * Lifecycle Hooks
 */
onMounted(() => {
  // Prüfen, ob Benutzer bereits angemeldet ist
  if (isAuthenticated.value) {
    router.push({ name: 'Home' })
  }
  
  // Event Listener für Formularverlassen hinzufügen
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// Überwachen, ob der Benutzer authentifiziert ist
watch(isAuthenticated, (newValue) => {
  if (newValue === true) {
    router.push({ name: 'Home' })
  }
})

// Beim Tab-Wechsel Formularvalidierung zurücksetzen
watch(activeTab, () => {
  nextTick(() => {
    v$.value.$reset()
  })
})

// Warnung beim Verlassen der Seite, wenn das Formular ausgefüllt wurde
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (
    (formData.email && formData.email !== 'martin@danglefeet.com') ||
    (formData.password && formData.password !== '123') ||
    formData.username ||
    formData.displayName
  ) {
    event.preventDefault()
    event.returnValue = ''
  }
}
</script>

<style scoped>
/* Container und Layout */
.login-page {
  min-height: 100vh !important;
  width: 100vw !important; 
  max-width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  background-color: var(--color-background, #f5f7fa) !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  z-index: 9999 !important; /* Höchste Priorität */
}

.login-container {
  width: 100% !important;
  max-width: 480px !important;
  margin: 2rem !important;
  perspective: 1000px !important;
  position: relative !important;
  z-index: 10000 !important; /* Höhere Priorität als die Seite */
}

.login-card {
  width: 100%;
  background-color: var(--color-card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* Header mit Logo */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  height: 3rem;
  margin-bottom: 1rem;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary, #1a202c);
  margin: 0;
}

/* Tabs */
.auth-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  margin-bottom: 2rem;
}

.tab-button {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.75rem 0;
  color: var(--color-text-secondary, #4a5568);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-button.active {
  color: var(--color-primary, #3182ce);
  border-bottom: 2px solid var(--color-primary, #3182ce);
}

/* Formular */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-group {
  margin-top: -0.5rem;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #4a5568);
}

.optional {
  font-weight: normal;
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #718096);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.375rem;
  font-size: 1rem;
  width: 100%;
  background-color: var(--color-input-bg, #ffffff);
  color: var(--color-text-primary, #1a202c);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary, #3182ce);
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
  outline: none;
}

.form-input.input-error {
  border-color: var(--color-error, #e53e3e);
}

.input-error-message {
  font-size: 0.75rem;
  color: var(--color-error, #e53e3e);
  margin-top: 0.25rem;
}

/* Password Input mit Toggle */
.password-input-container {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #718096);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.password-toggle:hover {
  color: var(--color-primary, #3182ce);
}

.password-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #718096);
  margin-top: 0.5rem;
}

/* Fehler und Erfolg */
.auth-error-message,
.auth-success-message {
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.auth-error-message {
  background-color: var(--color-error-bg, #fff5f5);
  color: var(--color-error, #e53e3e);
  border: 1px solid var(--color-error-border, #fed7d7);
}

.auth-success-message {
  background-color: var(--color-success-bg, #f0fff4);
  color: var(--color-success, #38a169);
  border: 1px solid var(--color-success-border, #c6f6d5);
}

/* Buttons */
.auth-submit-button,
.demo-login-button {
  position: relative;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  border: none;
}

.auth-submit-button {
  background-color: var(--color-primary, #3182ce);
  color: white;
}

.auth-submit-button:hover:not(:disabled) {
  background-color: var(--color-primary-dark, #2c5282);
}

.auth-submit-button:active:not(:disabled) {
  transform: translateY(1px);
}

.demo-login-button {
  background-color: var(--color-bg-tertiary, #edf2f7);
  color: var(--color-text-secondary, #4a5568);
  margin-top: 0.75rem;
}

.demo-login-button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary-dark, #e2e8f0);
}

.auth-submit-button:disabled,
.demo-login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Passwort vergessen */
.forgot-password {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
}

.forgot-password a {
  color: var(--color-primary, #3182ce);
  text-decoration: none;
}

.forgot-password a:hover {
  text-decoration: underline;
}

/* Footer */
.auth-footer {
  margin-top: 2rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #718096);
}

.legal-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.legal-links a {
  color: var(--color-text-secondary, #4a5568);
  text-decoration: none;
}

.legal-links a:hover {
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 640px) {
  .login-container {
    margin: 1rem;
  }
  
  .login-card {
    padding: 1.5rem;
  }
}
</style>