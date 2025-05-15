<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo-container">
        <img src="@/assets/images/senmvku-logo.png" alt="nscale DMS Assistent" class="logo" />
        <h1>nscale DMS Assistent</h1>
      </div>
      
      <div class="tab-container">
        <button class="tab-button" :class="{ active: activeTab === 'login' }" @click="activeTab = 'login'">
          Anmelden
        </button>
        <button class="tab-button" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">
          Registrieren
        </button>
      </div>
      
      <form @submit.prevent="submitForm" class="form">
        <div class="form-group">
          <label for="email">E-Mail</label>
          <input 
            id="email" 
            v-model="formData.email" 
            type="email" 
            required 
            placeholder="name@example.de"
            :disabled="isLoading"
          />
        </div>
        
        <div v-if="activeTab === 'register'" class="form-group">
          <label for="username">Benutzername</label>
          <input 
            id="username" 
            v-model="formData.username" 
            type="text" 
            required 
            placeholder="Benutzername"
            :disabled="isLoading"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Passwort</label>
          <input 
            id="password" 
            v-model="formData.password" 
            type="password" 
            required 
            placeholder="••••••••"
            :disabled="isLoading"
          />
          <div class="password-hint">Hinweis: Verwende "123" als Test-Passwort.</div>
        </div>
        
        <div v-if="authError" class="error-message">
          <strong>Fehler:</strong> {{ authError }}
        </div>
        
        <div v-if="loginSuccess" class="success-message">
          Login erfolgreich! Sie werden weitergeleitet...
        </div>
        
        <button type="submit" class="primary-button" :disabled="isLoading">
          {{ activeTab === "login" ? "Anmelden" : "Registrieren" }}
        </button>
        
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

// Store-Mock für die einfache Implementierung
const authError = ref(null);
const loginSuccess = ref(false);
const isLoading = ref(false);
const router = useRouter();

// Form state
const activeTab = ref('login');
const formData = reactive({
  email: '',
  username: '',
  password: '',
  rememberMe: false
});

// Demo-Login Funktion
async function loginWithTestUser() {
  formData.email = 'martin@danglefeet.com';
  formData.password = '123';
  await handleLogin();
}

// Form submit handler
async function submitForm() {
  if (activeTab.value === 'login') {
    await handleLogin();
  } else {
    await handleRegister();
  }
}

// Login-Funktion (vereinfacht)
async function handleLogin() {
  try {
    isLoading.value = true;
    loginSuccess.value = false;
    authError.value = null;
    
    // Simulierter Login-Erfolg
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Erfolgreichen Login simulieren
    loginSuccess.value = true;
    
    // Zur Hauptseite weiterleiten
    setTimeout(() => {
      router.push('/');
    }, 1000);
  } catch (error) {
    authError.value = "Login fehlgeschlagen. Bitte versuchen Sie es später erneut.";
  } finally {
    isLoading.value = false;
  }
}

// Register-Funktion (vereinfacht)
async function handleRegister() {
  try {
    isLoading.value = true;
    authError.value = null;
    
    // Simulierter Registrierungserfolg
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Erfolgreiche Registrierung simulieren
    loginSuccess.value = true;
    
    // Zur Hauptseite weiterleiten
    setTimeout(() => {
      router.push('/');
    }, 1000);
  } catch (error) {
    authError.value = "Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background-color: #f5f5f5;
}

.login-card {
  max-width: 400px;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.logo-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo {
  height: 48px;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  color: #333;
}

.tab-container {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.5rem;
}

.tab-button {
  flex: 1;
  background: none;
  border: none;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
}

.tab-button.active {
  color: #0078d4;
  border-bottom: 2px solid #0078d4;
  font-weight: 500;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.875rem;
  color: #666;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #0078d4;
}

.password-hint {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.5rem;
}

.primary-button {
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background-color: #006bbe;
}

.secondary-button {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.secondary-button:hover:not(:disabled) {
  background-color: #e5e5e5;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #fdeded;
  color: #d32f2f;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.success-message {
  background-color: #edf7ed;
  color: #388e3c;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}
</style>