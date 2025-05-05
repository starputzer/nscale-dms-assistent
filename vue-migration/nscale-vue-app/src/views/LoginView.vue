<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

// Formular-Modi
const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  RESET: 'reset'
}

// Reaktiver Zustand
const authMode = ref(AUTH_MODES.LOGIN)
const form = reactive({
  email: '',
  password: ''
})
const successMessage = ref('')
const errorMessage = ref('')
const loading = ref(false)

// Berechnen, ob der Button deaktiviert werden soll
const isButtonDisabled = computed(() => {
  if (loading.value) return true
  if (authMode.value === AUTH_MODES.RESET) {
    return !form.email
  }
  return !form.email || !form.password
})

// Login-Funktion
const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const success = await authStore.login(form.email, form.password)
    if (success) {
      router.push({ name: 'home' })
    } else {
      errorMessage.value = authStore.error || 'Login fehlgeschlagen'
    }
  } catch (error) {
    errorMessage.value = 'Ein unerwarteter Fehler ist aufgetreten'
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}

// Registrierungs-Funktion
const handleRegister = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    // API-Aufruf ausführen
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password
      })
    })
    
    // Nach erfolgreicher Registrierung zum Login wechseln
    successMessage.value = 'Registrierung erfolgreich. Bitte melden Sie sich an.'
    authMode.value = AUTH_MODES.LOGIN
    
    // Formular zurücksetzen
    form.password = ''
  } catch (error) {
    errorMessage.value = 'Registrierung fehlgeschlagen'
    console.error('Registration error:', error)
  } finally {
    loading.value = false
  }
}

// Passwort-Reset-Funktion
const handlePasswordReset = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // API-Aufruf ausführen
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      successMessage.value = data.message || 'Passwort-Reset-E-Mail wurde gesendet.'
    } else {
      const data = await response.json()
      errorMessage.value = data.detail || 'Passwort-Reset fehlgeschlagen'
    }
  } catch (error) {
    errorMessage.value = 'Ein unerwarteter Fehler ist aufgetreten'
    console.error('Password reset error:', error)
  } finally {
    loading.value = false
  }
}

// Formularverarbeitung
const submitForm = () => {
  if (authMode.value === AUTH_MODES.LOGIN) {
    handleLogin()
  } else if (authMode.value === AUTH_MODES.REGISTER) {
    handleRegister()
  } else if (authMode.value === AUTH_MODES.RESET) {
    handlePasswordReset()
  }
}

// Modus wechseln und Nachrichten zurücksetzen
const switchMode = (mode) => {
  authMode.value = mode
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="login-container">
    <div class="login-card nscale-card">
      <div class="text-center mb-8">
        <div class="nscale-logo">nscale DMS Assistent</div>
        <p class="text-gray-500 mt-2">Ihr Digitalisierungspartner für DMS-Lösungen</p>
      </div>
      
      <div class="auth-tabs">
        <button 
          @click="switchMode(AUTH_MODES.LOGIN)" 
          :class="['auth-tab', authMode === AUTH_MODES.LOGIN ? 'active' : '']">
          Anmelden
        </button>
        <button 
          @click="switchMode(AUTH_MODES.REGISTER)" 
          :class="['auth-tab', authMode === AUTH_MODES.REGISTER ? 'active' : '']">
          Registrieren
        </button>
      </div>
      
      <!-- Login Form -->
      <form v-if="authMode === AUTH_MODES.LOGIN" @submit.prevent="submitForm" class="auth-form">
        <div class="form-group">
          <label for="email">E-Mail</label>
          <input 
            v-model="form.email" 
            type="email" 
            id="email" 
            class="nscale-input" 
            placeholder="Ihre E-Mail-Adresse" 
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Passwort</label>
          <input 
            v-model="form.password" 
            type="password" 
            id="password" 
            class="nscale-input" 
            placeholder="Ihr Passwort" 
            required
          />
        </div>
        <div class="mt-6">
          <button 
            type="submit" 
            class="nscale-btn-primary w-full" 
            :disabled="isButtonDisabled">
            <span v-if="loading" class="loading-dots">Anmelden</span>
            <span v-else>Anmelden</span>
          </button>
        </div>
        <div class="text-center mt-4">
          <a 
            href="#" 
            class="text-link" 
            @click.prevent="switchMode(AUTH_MODES.RESET)">
            Passwort vergessen?
          </a>
        </div>
      </form>
      
      <!-- Register Form -->
      <form v-if="authMode === AUTH_MODES.REGISTER" @submit.prevent="submitForm" class="auth-form">
        <div class="form-group">
          <label for="reg-email">E-Mail</label>
          <input 
            v-model="form.email" 
            type="email" 
            id="reg-email" 
            class="nscale-input" 
            placeholder="Ihre E-Mail-Adresse" 
            required
          />
        </div>
        <div class="form-group">
          <label for="reg-password">Passwort</label>
          <input 
            v-model="form.password" 
            type="password" 
            id="reg-password" 
            class="nscale-input" 
            placeholder="Ihr sicheres Passwort" 
            required
          />
        </div>
        <div class="mt-6">
          <button 
            type="submit" 
            class="nscale-btn-primary w-full" 
            :disabled="isButtonDisabled">
            <span v-if="loading" class="loading-dots">Registrieren</span>
            <span v-else>Registrieren</span>
          </button>
        </div>
      </form>
      
      <!-- Reset Password Form -->
      <form v-if="authMode === AUTH_MODES.RESET" @submit.prevent="submitForm" class="auth-form">
        <div class="form-group">
          <label for="reset-email">E-Mail</label>
          <input 
            v-model="form.email" 
            type="email" 
            id="reset-email" 
            class="nscale-input" 
            placeholder="Ihre E-Mail-Adresse" 
            required
          />
        </div>
        <div class="mt-6">
          <button 
            type="submit" 
            class="nscale-btn-primary w-full" 
            :disabled="isButtonDisabled">
            <span v-if="loading" class="loading-dots">Passwort zurücksetzen</span>
            <span v-else>Passwort zurücksetzen</span>
          </button>
        </div>
        <div class="text-center mt-4">
          <a 
            href="#" 
            class="text-link" 
            @click.prevent="switchMode(AUTH_MODES.LOGIN)">
            Zurück zur Anmeldung
          </a>
        </div>
      </form>
      
      <!-- Success & Error Messages -->
      <div v-if="successMessage" class="message success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="message error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.nscale-logo {
  font-size: 1.75rem;
  font-weight: 700;
  color: #38a169;
  margin-bottom: 0.5rem;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: #718096;
}

.auth-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
}

.auth-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #718096;
  font-weight: 500;
  transition: all 0.2s;
}

.auth-tab.active {
  color: #38a169;
  border-bottom: 2px solid #38a169;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-weight: 500;
  color: #4a5568;
  font-size: 0.875rem;
}

.mt-4 {
  margin-top: 16px;
}

.mt-6 {
  margin-top: 24px;
}

.mb-8 {
  margin-bottom: 32px;
}

.w-full {
  width: 100%;
}

.text-link {
  color: #38a169;
  text-decoration: none;
  font-size: 0.875rem;
}

.text-link:hover {
  text-decoration: underline;
}

.message {
  margin-top: 16px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  text-align: center;
}

.success-message {
  background-color: #c6f6d5;
  color: #276749;
}

.error-message {
  background-color: #fed7d7;
  color: #c53030;
}
</style>