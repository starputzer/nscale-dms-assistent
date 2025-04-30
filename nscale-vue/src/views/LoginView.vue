<!-- views/LoginView.vue -->
<template>
  <div class="login-view">
    <h1 class="view-title">Anmelden</h1>
    <p class="view-subtitle">Melden Sie sich mit Ihren Zugangsdaten an</p>
    
    <!-- Erfolgs- oder Fehlermeldung -->
    <div v-if="successMessage" class="status-message success">
      <font-awesome-icon icon="check-circle" class="message-icon" />
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="status-message error">
      <font-awesome-icon icon="exclamation-circle" class="message-icon" />
      {{ errorMessage }}
    </div>
    
    <!-- Login-Formular -->
    <form @submit.prevent="login" class="auth-form">
      <div class="form-group">
        <label for="email" class="form-label">E-Mail</label>
        <div class="input-container">
          <font-awesome-icon icon="envelope" class="input-icon" />
          <input 
            v-model="email" 
            type="email" 
            id="email" 
            class="form-input" 
            placeholder="Ihre E-Mail-Adresse"
            required
            autocomplete="email"
            :disabled="isLoading"
          />
        </div>
      </div>
      
      <div class="form-group">
        <label for="password" class="form-label">Passwort</label>
        <div class="input-container">
          <font-awesome-icon icon="lock" class="input-icon" />
          <input 
            v-model="password" 
            :type="showPassword ? 'text' : 'password'" 
            id="password" 
            class="form-input" 
            placeholder="Ihr Passwort"
            required
            autocomplete="current-password"
            :disabled="isLoading"
          />
          <button 
            type="button"
            @click="togglePasswordVisibility"
            class="password-toggle"
            :title="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'"
          >
            <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
          </button>
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          type="submit" 
          class="submit-button"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-indicator">
            <font-awesome-icon icon="circle-notch" spin />
            Anmelden...
          </span>
          <span v-else>
            <font-awesome-icon icon="sign-in-alt" class="button-icon" />
            Anmelden
          </span>
        </button>
      </div>
    </form>
    
    <!-- Links zu anderen Seiten -->
    <div class="auth-links">
      <router-link to="/auth/forgot-password" class="auth-link">
        Passwort vergessen?
      </router-link>
      
      <div class="auth-divider">
        <span>oder</span>
      </div>
      
      <router-link to="/auth/register" class="register-link">
        <font-awesome-icon icon="user-plus" class="link-icon" />
        Neues Konto erstellen
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/composables/useToast';

// Router und Stores
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { showToast } = useToast();

// Formular-Zustände
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// Berechnete Eigenschaften
const isLoading = computed(() => authStore.loading);

// Methoden
const login = async () => {
  // Validierung (einfache Beispiele)
  if (!email.value || !password.value) {
    errorMessage.value = 'Bitte geben Sie E-Mail und Passwort ein.';
    return;
  }
  
  // Fehler- und Erfolgsmeldungen zurücksetzen
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    // Anmelden über den Auth-Store
    const success = await authStore.login({
      email: email.value,
      password: password.value
    });
    
    if (success) {
      // Bei Erfolg zur Zielseite weiterleiten
      const redirectPath = route.query.redirect || '/';
      router.push(redirectPath);
    } else {
      // Fehler aus dem Store anzeigen
      errorMessage.value = authStore.error || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
    }
  } catch (error) {
    console.error('Login-Fehler:', error);
    errorMessage.value = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
  }
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

// Lebenszyklus-Hooks
onMounted(() => {
  // Erfolgs- oder Fehlermeldung aus der URL abfragen
  const successMsg = route.query.success;
  const errorMsg = route.query.error;
  
  if (successMsg) {
    successMessage.value = decodeURIComponent(successMsg);
  }
  
  if (errorMsg) {
    errorMessage.value = decodeURIComponent(errorMsg);
  }
  
  // Wenn der Benutzer bereits angemeldet ist, zur Startseite weiterleiten
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});
</script>

<style scoped>
.login-view {
  width: 100%;
}

.view-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--nscale-dark-gray);
  margin-bottom: 0.5rem;
  text-align: center;
}

.view-subtitle {
  font-size: 0.95rem;
  color: var(--nscale-gray-dark);
  margin-bottom: 2rem;
  text-align: center;
}

.status-message {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
}

.status-message.success {
  background-color: var(--nscale-primary-light);
  color: var(--nscale-primary-dark);
  border: 1px solid var(--nscale-primary);
}

.status-message.error {
  background-color: var(--nscale-red-light);
  color: var(--nscale-red);
  border: 1px solid var(--nscale-red);
}

.message-icon {
  margin-right: 0.75rem;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.auth-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--nscale-dark-gray);
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--nscale-gray-dark);
  font-size: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.1);
  outline: none;
}

.password-toggle {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: var(--nscale-gray-dark);
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--nscale-primary);
}

.form-actions {
  margin-top: 2rem;
}

.submit-button {
  width: 100%;
  background-color: var(--nscale-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark);
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  margin-right: 0.75rem;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auth-links {
  text-align: center;
}

.auth-link {
  color: var(--nscale-primary);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.auth-link:hover {
  color: var(--nscale-primary-dark);
  text-decoration: underline;
}

.auth-divider {
  margin: 1.5rem 0;
  position: relative;
  text-align: center;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--nscale-gray-medium);
  z-index: 1;
}

.auth-divider span {
  display: inline-block;
  position: relative;
  padding: 0 0.75rem;
  background-color: white;
  color: var(--nscale-gray-dark);
  font-size: 0.9rem;
  z-index: 2;
}

.register-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  color: var(--nscale-primary);
  border: 1px solid var(--nscale-primary);
  border-radius: 6px;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.register-link:hover {
  background-color: var(--nscale-primary-light);
  transform: translateY(-1px);
}

.link-icon {
  margin-right: 0.75rem;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .view-title {
  color: #f0f0f0;
}

:global(.theme-dark) .view-subtitle {
  color: #aaa;
}

:global(.theme-dark) .form-label {
  color: #f0f0f0;
}

:global(.theme-dark) .input-icon,
:global(.theme-dark) .password-toggle {
  color: #aaa;
}

:global(.theme-dark) .password-toggle:hover {
  color: #00c060;
}

:global(.theme-dark) .form-input {
  background-color: #333;
  color: #f0f0f0;
  border-color: #555;
}

:global(.theme-dark) .form-input:focus {
  border-color: #00c060;
  box-shadow: 0 0 0 2px rgba(0, 192, 96, 0.2);
}

:global(.theme-dark) .submit-button {
  background-color: #00c060;
}

:global(.theme-dark) .submit-button:hover:not(:disabled) {
  background-color: #00a550;
}

:global(.theme-dark) .auth-link {
  color: #00c060;
}

:global(.theme-dark) .auth-link:hover {
  color: #00a550;
}

:global(.theme-dark) .auth-divider::before {
  background-color: #555;
}

:global(.theme-dark) .auth-divider span {
  background-color: #1e1e1e;
  color: #aaa;
}

:global(.theme-dark) .register-link {
  background-color: #1e1e1e;
  color: #00c060;
  border-color: #00c060;
}

:global(.theme-dark) .register-link:hover {
  background-color: rgba(0, 192, 96, 0.1);
}

:global(.theme-dark) .status-message.success {
  background-color: rgba(0, 192, 96, 0.1);
  color: #00c060;
  border-color: #00c060;
}

:global(.theme-dark) .status-message.error {
  background-color: rgba(229, 62, 62, 0.1);
  color: #ff4d4d;
  border-color: #ff4d4d;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .view-title,
:global(.theme-contrast) .view-subtitle,
:global(.theme-contrast) .form-label {
  color: #ffeb3b;
}

:global(.theme-contrast) .input-icon,
:global(.theme-contrast) .password-toggle {
  color: #ffeb3b;
}

:global(.theme-contrast) .form-input {
  background-color: #000000;
  color: #ffffff;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .form-input:focus {
  border-color: #ffeb3b;
  box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3);
}

:global(.theme-contrast) .submit-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .submit-button:hover:not(:disabled) {
  background-color: #ffd600;
}

:global(.theme-contrast) .auth-link {
  color: #ffeb3b;
}

:global(.theme-contrast) .auth-link:hover {
  color: #ffd600;
}

:global(.theme-contrast) .auth-divider::before {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .auth-divider span {
  background-color: #000000;
  color: #ffeb3b;
}

:global(.theme-contrast) .register-link {
  background-color: #000000;
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .register-link:hover {
  background-color: #333300;
}

:global(.theme-contrast) .status-message.success {
  background-color: #333300;
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .status-message.error {
  background-color: #330000;
  color: #ff4444;
  border: 2px solid #ff4444;
}
</style>