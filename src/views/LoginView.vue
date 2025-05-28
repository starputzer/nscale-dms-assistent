<template>
  <div
    class="login-page login-container flex justify-center items-center min-h-screen p-4"
  >
    <div class="nscale-card max-w-md w-full p-8">
      <div class="nscale-logo text-center mb-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="logo-icon mx-auto mb-4"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="2"
          />
          <line
            x1="8"
            y1="8"
            x2="16"
            y2="8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="8"
            y1="12"
            x2="16"
            y2="12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="8"
            y1="16"
            x2="11"
            y2="16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <h1 class="text-2xl font-bold text-gray-900">
          Digitale Akte Assistent
        </h1>
      </div>

      <div class="flex border-b mb-6">
        <button
          class="py-2 px-4 w-half text-center"
          :class="{ 'active-tab': activeTab === 'login' }"
          @click="activeTab = 'login'"
          type="button"
        >
          Anmelden
        </button>
        <button
          class="py-2 px-4 w-half text-center"
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
          />
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
          />
        </div>

        <div v-if="activeTab === 'register'" class="form-group">
          <label for="displayName" class="form-label"
            >Anzeigename (optional)</label
          >
          <input
            id="displayName"
            v-model="formData.displayName"
            class="nscale-input w-full"
            type="text"
            placeholder="Ihr Name"
            autocomplete="name"
            :disabled="isLoading"
          />
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
          />
          <!-- Default-Password für Demo-Zwecke (kann in Produktion entfernt werden) -->
          <div class="text-sm text-gray-600 mt-1">
            Hinweis: Verwende "123" als Test-Passwort.
          </div>
        </div>

        <div v-if="activeTab === 'register'" class="form-group">
          <label for="passwordConfirm" class="form-label"
            >Passwort bestätigen</label
          >
          <input
            id="passwordConfirm"
            v-model="formData.passwordConfirm"
            class="nscale-input w-full"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            :disabled="isLoading"
          />
        </div>

        <div v-if="activeTab === 'login'" class="flex items-center">
          <input
            id="rememberMe"
            v-model="formData.rememberMe"
            type="checkbox"
            class="mr-2"
            :disabled="isLoading"
          />
          <label for="rememberMe" class="text-sm text-gray-700"
            >Angemeldet bleiben</label
          >
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          <div class="font-bold">Fehler:</div>
          {{ errorMessage }}
        </div>

        <!-- Success Message (after successful login) -->
        <div v-if="loginSuccess" class="success-message">
          Login erfolgreich! Sie werden weitergeleitet...
        </div>

        <!-- Submit Button -->
        <button
          class="nscale-btn-primary w-full"
          type="submit"
          :disabled="
            isLoading || (activeTab === 'register' && !isPasswordMatch)
          "
        >
          <span v-if="isLoading">Wird angemeldet...</span>
          <span v-else>{{
            activeTab === "login" ? "Anmelden" : "Registrieren"
          }}</span>
        </button>

        <!-- Password Requirements (Register) -->
        <div v-if="activeTab === 'register'" class="text-sm text-gray-600 mt-4">
          <h3 class="font-medium mb-2">Passwort-Anforderungen:</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li :class="{ 'text-green-600': passwordStrength.length }">
              Mindestens 8 Zeichen
            </li>
            <li :class="{ 'text-green-600': passwordStrength.hasLower }">
              Mindestens ein Kleinbuchstabe
            </li>
            <li :class="{ 'text-green-600': passwordStrength.hasUpper }">
              Mindestens ein Großbuchstabe
            </li>
            <li :class="{ 'text-green-600': passwordStrength.hasNumber }">
              Mindestens eine Zahl
            </li>
          </ul>

          <div v-if="formData.password" class="mt-3">
            <div class="text-sm mb-1">
              Passwortstärke: {{ passwordStrengthLabel }}
            </div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                :class="`h-full ${passwordStrengthColor}`"
                :style="`width: ${passwordStrengthPercentage}%`"
              ></div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// Stores und Composables
const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);
const loginSuccess = ref(false);
const errorMessage = ref<string | null>(null);

// LogService für die Fehlerdiagnose laden (asynchron)
let logger: any = console;
onMounted(async () => {
  try {
    const { LogService } = await import("@/services/log/LogService");
    logger = new LogService("LoginView");
    logger.info("LoginView geladen und Logger initialisiert");
  } catch (err) {
    console.warn(
      "LogService konnte nicht geladen werden, verwende console",
      err,
    );
  }
});

// Formular-State
const activeTab = ref("login");
const formData = reactive({
  email: "martin@danglefeet.com", // Default für Testzwecke
  username: "",
  displayName: "",
  password: "123", // Default für Testzwecke
  passwordConfirm: "",
  rememberMe: false,
});

// Formularvalidierung und Passwortstärke
const isPasswordMatch = computed(() => {
  return !formData.password || formData.password === formData.passwordConfirm;
});

const passwordStrength = computed(() => {
  const password = formData.password || "";
  return {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    score: calculatePasswordScore(password),
  };
});

const passwordStrengthPercentage = computed(() => {
  return Math.min(100, passwordStrength.value.score * 25);
});

const passwordStrengthLabel = computed(() => {
  const score = passwordStrength.value.score;
  if (score === 0) return "Sehr schwach";
  if (score === 1) return "Schwach";
  if (score === 2) return "Mittel";
  if (score === 3) return "Stark";
  return "Sehr stark";
});

const passwordStrengthColor = computed(() => {
  const score = passwordStrength.value.score;
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-yellow-500";
  if (score === 3) return "bg-green-500";
  return "bg-green-600";
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
  if (activeTab.value === "login") {
    await handleLogin();
  } else {
    await handleRegister();
  }
}

// Verbesserte Login-Funktion
async function handleLogin() {
  isLoading.value = true;
  loginSuccess.value = false;
  errorMessage.value = null;

  try {
    const success = await authStore.login({
      email: formData.email,
      password: formData.password,
      remember: formData.rememberMe,
    });

    console.log("Login result:", success);

    if (success) {
      loginSuccess.value = true;
      console.log("Login successful, redirecting to chat...");

      // Direct navigation without timeout
      try {
        await router.push("/chat");
        console.log("Navigation to /chat completed");
      } catch (navError) {
        console.error("Navigation error:", navError);
        // Fallback to location.href
        window.location.href = "/chat";
      }
    } else {
      errorMessage.value = authStore.error || "Anmeldung fehlgeschlagen";
    }
  } catch (error: any) {
    logger.error("Login-Fehler:", error);
    errorMessage.value =
      error.message || "Ein unerwarteter Fehler ist aufgetreten";
  } finally {
    isLoading.value = false;
  }
}

async function handleRegister() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    // Prüfen, ob Passwörter übereinstimmen
    if (formData.password !== formData.passwordConfirm) {
      errorMessage.value = "Die Passwörter stimmen nicht überein.";
      return;
    }

    const success = await authStore.register({
      email: formData.email,
      username: formData.username || formData.email,
      password: formData.password,
      displayName: formData.displayName,
    });

    if (success) {
      loginSuccess.value = true;
      // Weiterleitung zur Chat-Seite
      setTimeout(() => {
        router.push("/chat");
      }, 1000);
    } else {
      errorMessage.value = authStore.error || "Registrierung fehlgeschlagen";
    }
  } catch (error: any) {
    logger.error("Registrierung fehlgeschlagen:", error);
    errorMessage.value = error.message || "Registrierung fehlgeschlagen";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  background-color: var(--nscale-background);
}

.logo-icon {
  width: 64px;
  height: 64px;
  color: var(--nscale-primary);
}

.nscale-logo {
  color: var(--nscale-text);
}

.nscale-logo h1 {
  color: var(--nscale-text);
}

.nscale-card {
  background-color: var(--nscale-surface);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.nscale-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nscale-border);
  border-radius: 0.375rem;
  background-color: var(--nscale-background);
  color: var(--nscale-text);
  transition: border-color 0.15s ease-in-out;
}

.nscale-input:focus {
  outline: none;
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 3px rgba(0, 165, 80, 0.2);
}

.nscale-btn-primary {
  background-color: var(--nscale-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
  border: none;
  cursor: pointer;
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
  color: var(--nscale-text-secondary);
}

.error-message {
  color: var(--nscale-error, #721c24);
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: var(--nscale-error-bg, #f8d7da);
  border-radius: 4px;
  margin-top: 0.5rem;
}

.success-message {
  color: var(--nscale-success, #155724);
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: var(--nscale-success-bg, #d4edda);
  border-radius: 4px;
  margin-top: 0.5rem;
}

/* Utility Classes */
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.text-center {
  text-align: center;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.min-h-screen {
  min-height: 100vh;
}

.w-full {
  width: 100%;
}

.w-half {
  width: 50%;
}

.p-4 {
  padding: 1rem;
}

.p-8 {
  padding: 2rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.pl-5 {
  padding-left: 1.25rem;
}

.max-w-md {
  max-width: 28rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.text-xl {
  font-size: 1.25rem;
}

.text-sm {
  font-size: 0.875rem;
}

.font-bold {
  font-weight: 700;
}

.font-medium {
  font-weight: 500;
}

.text-gray-600 {
  color: #718096;
}

.text-gray-700 {
  color: #4a5568;
}

.text-gray-900 {
  color: #1a202c;
}

.text-green-600 {
  color: #059669;
}

.bg-gray-200 {
  background-color: #e5e7eb;
}

.bg-red-500 {
  background-color: #ef4444;
}

.bg-yellow-500 {
  background-color: #f59e0b;
}

.bg-green-500 {
  background-color: #10b981;
}

.bg-green-600 {
  background-color: #059669;
}

.rounded-full {
  border-radius: 9999px;
}

.overflow-hidden {
  overflow: hidden;
}

.list-disc {
  list-style-type: disc;
}

.h-2 {
  height: 0.5rem;
}

.h-full {
  height: 100%;
}

.mt-1 {
  margin-top: 0.25rem;
}

.border-b {
  border-bottom-width: 1px;
}
</style>
