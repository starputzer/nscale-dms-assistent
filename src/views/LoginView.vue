<template>
  <div class="login-container flex justify-center items-center min-h-screen p-4">
    <div class="nscale-card max-w-md w-full p-8">
      <div class="nscale-logo text-center mb-6">
        <img src="@/assets/images/senmvku-logo.png" alt="nscale DMS Assistent" class="h-12 mx-auto mb-4">
        <h1 class="text-xl">nscale DMS Assistent</h1>
      </div>

      <div class="flex border-b mb-6">
        <button
          class="py-2 px-4 w-1/2 text-center"
          :class="{ 'active-tab': activeTab === 'login' }"
          @click="activeTab = 'login'"
          type="button"
        >
          Anmelden
        </button>
        <button
          class="py-2 px-4 w-1/2 text-center"
          :class="{ 'active-tab': activeTab === 'register' }"
          @click="activeTab = 'register'"
          type="button"
        >
          Registrieren
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="submitForm">
        <!-- Login/Register Fields -->
        <div class="form-group">
          <label for="email" class="form-label">E-Mail</label>
          <input
            id="email"
            v-model="formData.email"
            class="nscale-input w-full"
            type="email"
            placeholder="name@example.de"
            required
            autocomplete="email"
            :disabled="isLoading"
          >
        </div>

        <div v-if="activeTab === 'register'" class="form-group">
          <label for="username" class="form-label">Benutzername</label>
          <input
            id="username"
            v-model="formData.username"
            class="nscale-input w-full"
            type="text"
            placeholder="Benutzername"
            required
            autocomplete="username"
            :disabled="isLoading"
          >
        </div>

        <div v-if="activeTab === 'register'" class="form-group">
          <label for="displayName" class="form-label">Anzeigename (optional)</label>
          <input
            id="displayName"
            v-model="formData.displayName"
            class="nscale-input w-full"
            type="text"
            placeholder="Ihr Name"
            autocomplete="name"
            :disabled="isLoading"
          >
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Passwort</label>
          <input
            id="password"
            v-model="formData.password"
            class="nscale-input w-full"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            :disabled="isLoading"
          >
        </div>

        <div v-if="activeTab === 'register'" class="form-group">
          <label for="passwordConfirm" class="form-label">Passwort bestätigen</label>
          <input
            id="passwordConfirm"
            v-model="formData.passwordConfirm"
            class="nscale-input w-full"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            :disabled="isLoading"
          >
        </div>

        <div v-if="activeTab === 'login'" class="flex items-center">
          <input
            id="rememberMe"
            v-model="formData.rememberMe"
            type="checkbox"
            class="mr-2"
            :disabled="isLoading"
          >
          <label for="rememberMe" class="text-sm text-gray-600">Angemeldet bleiben</label>
        </div>

        <!-- Error Message -->
        <div v-if="authError" class="error-message">
          {{ authError }}
        </div>

        <!-- Submit Button -->
        <button
          class="nscale-btn-primary w-full"
          type="submit"
          :disabled="isLoading || (activeTab === 'register' && !isPasswordMatch)"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ activeTab === 'login' ? 'Anmelden' : 'Registrieren' }}
        </button>

        <!-- Password Requirements (Register) -->
        <div v-if="activeTab === 'register'" class="text-sm text-gray-600 mt-4">
          <h3 class="font-medium mb-2">Passwort-Anforderungen:</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li :class="{ 'text-green-600': passwordStrength.length }">Mindestens 8 Zeichen</li>
            <li :class="{ 'text-green-600': passwordStrength.hasLower }">Mindestens ein Kleinbuchstabe</li>
            <li :class="{ 'text-green-600': passwordStrength.hasUpper }">Mindestens ein Großbuchstabe</li>
            <li :class="{ 'text-green-600': passwordStrength.hasNumber }">Mindestens eine Zahl</li>
          </ul>

          <div v-if="formData.password" class="mt-3">
            <div class="text-sm mb-1">Passwortstärke: {{ passwordStrengthLabel }}</div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div :class="`h-full ${passwordStrengthColor}`" :style="`width: ${passwordStrengthPercentage}%`"></div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useAuthStore } from '@/stores/auth';
import type { LoginCredentials, RegisterCredentials } from '@/types/auth';

// Stores und Composables
const router = useRouter();
const { login, register, isLoading, error: authError } = useAuth();
const authStore = useAuthStore(); // Direkt für erweiterte Funktionen

// Formular-State
const activeTab = ref('login');
const formData = reactive({
  email: '',
  username: '',
  displayName: '',
  password: '',
  passwordConfirm: '',
  rememberMe: false
});

// Formularvalidierung und Passwortstärke
const isPasswordMatch = computed(() => {
  return !formData.password || formData.password === formData.passwordConfirm;
});

const passwordStrength = computed(() => {
  const password = formData.password || '';
  return {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    score: calculatePasswordScore(password)
  };
});

const passwordStrengthPercentage = computed(() => {
  return Math.min(100, passwordStrength.value.score * 25);
});

const passwordStrengthLabel = computed(() => {
  const score = passwordStrength.value.score;
  if (score === 0) return 'Sehr schwach';
  if (score === 1) return 'Schwach';
  if (score === 2) return 'Mittel';
  if (score === 3) return 'Stark';
  return 'Sehr stark';
});

const passwordStrengthColor = computed(() => {
  const score = passwordStrength.value.score;
  if (score <= 1) return 'bg-red-500';
  if (score === 2) return 'bg-yellow-500';
  if (score === 3) return 'bg-green-500';
  return 'bg-green-600';
});

function calculatePasswordScore(password: string): number {
  if (!password) return 0;

  let score = 0;
  // Mindestlänge (8 Zeichen)
  if (password.length >= 8) score++;
  // Zeichenkomplexität
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  // Zahlen
  if (/[0-9]/.test(password)) score++;
  // Sonderzeichen
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return score;
}

// Formular absenden
async function submitForm() {
  if (activeTab.value === 'login') {
    await handleLogin();
  } else {
    await handleRegister();
  }
}

async function handleLogin() {
  // Anmeldeinformationen zusammenstellen
  const credentials: LoginCredentials = {
    email: formData.email,
    password: formData.password,
    rememberMe: formData.rememberMe
  };

  // Login versuchen
  const success = await authStore.login(credentials);

  if (success) {
    // Bei Erfolg zur Startseite navigieren
    router.push({ name: 'home' });
  }
}

async function handleRegister() {
  // Prüfen, ob Passwörter übereinstimmen
  if (formData.password !== formData.passwordConfirm) {
    authStore.error = 'Die Passwörter stimmen nicht überein.';
    return;
  }

  // Registrierungsinformationen zusammenstellen
  const credentials: RegisterCredentials = {
    email: formData.email,
    username: formData.username,
    displayName: formData.displayName || undefined,
    password: formData.password,
    rememberMe: true  // Bei Registrierung automatisch angemeldet bleiben
  };

  // Registrieren versuchen
  const success = await authStore.register(credentials);

  if (success) {
    // Bei Erfolg zur Startseite navigieren
    router.push({ name: 'home' });
  }
}
</script>

<style scoped>
.login-container {
  background-color: var(--nscale-background);
}

.nscale-logo {
  color: var(--nscale-text);
}

.nscale-card {
  background-color: var(--nscale-card-bg);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.nscale-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nscale-border);
  border-radius: 0.375rem;
  background-color: var(--nscale-input-bg);
  color: var(--nscale-text);
  transition: border-color 0.15s ease-in-out;
}

.nscale-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 3px rgba(var(--nscale-primary-rgb), 0.2);
}

.nscale-btn-primary {
  background-color: var(--nscale-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.nscale-btn-primary:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark);
}

.nscale-btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.active-tab {
  color: var(--nscale-primary);
  border-bottom: 2px solid var(--nscale-primary);
  font-weight: 500;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--nscale-text-light);
}

.error-message {
  color: var(--nscale-error);
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: var(--nscale-error-bg);
  border-radius: 4px;
  margin-top: 0.5rem;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Utility Classes */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.text-center { text-align: center; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-1 > * + * { margin-top: 0.25rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mr-2 { margin-right: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.min-h-screen { min-height: 100vh; }
.h-12 { height: 3rem; }
.h-2 { height: 0.5rem; }
.h-full { height: 100%; }
.w-full { width: 100%; }
.w-1/2 { width: 50%; }
.p-4 { padding: 1rem; }
.p-8 { padding: 2rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.pl-5 { padding-left: 1.25rem; }
.max-w-md { max-width: 28rem; }
.text-xl { font-size: 1.25rem; }
.text-sm { font-size: 0.875rem; }
.font-medium { font-weight: 500; }
.text-gray-600 { color: #718096; }
.text-green-600 { color: #059669; }
.bg-gray-200 { background-color: #E5E7EB; }
.bg-red-500 { background-color: #EF4444; }
.bg-yellow-500 { background-color: #F59E0B; }
.bg-green-500 { background-color: #10B981; }
.bg-green-600 { background-color: #059669; }
.rounded-full { border-radius: 9999px; }
.overflow-hidden { overflow: hidden; }
.list-disc { list-style-type: disc; }
</style>