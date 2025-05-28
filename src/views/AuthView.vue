<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <img
          src="/assets/images/senmvku-logo.png"
          alt="nscale Logo"
          class="auth-logo"
        />
        <h1>nscale DMS Assistant</h1>
      </div>

      <div class="auth-tabs">
        <button
          :class="['auth-tab', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          Anmelden
        </button>
        <button
          :class="['auth-tab', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
          v-if="showRegister"
        >
          Registrieren
        </button>
      </div>

      <div v-if="activeTab === 'login'" class="auth-form">
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Benutzername</label>
            <input
              type="text"
              id="username"
              v-model="loginForm.username"
              required
              :disabled="isLoading"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="password">Passwort</label>
            <input
              type="password"
              id="password"
              v-model="loginForm.password"
              required
              :disabled="isLoading"
              autocomplete="current-password"
            />
          </div>

          <div class="form-options">
            <label>
              <input
                type="checkbox"
                v-model="loginForm.rememberMe"
                :disabled="isLoading"
              />
              Angemeldet bleiben
            </label>

            <a
              href="#"
              @click.prevent="showForgotPassword"
              class="forgot-password"
            >
              Passwort vergessen?
            </a>
          </div>

          <div v-if="error" class="auth-error">
            {{ error }}
          </div>

          <button type="submit" class="auth-button" :disabled="isLoading">
            <span v-if="isLoading">Anmelden...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>
      </div>

      <div v-if="activeTab === 'register'" class="auth-form">
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="newUsername">Benutzername</label>
            <input
              type="text"
              id="newUsername"
              v-model="registerForm.username"
              required
              :disabled="isLoading"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="email">E-Mail</label>
            <input
              type="email"
              id="email"
              v-model="registerForm.email"
              required
              :disabled="isLoading"
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="newPassword">Passwort</label>
            <input
              type="password"
              id="newPassword"
              v-model="registerForm.password"
              required
              :disabled="isLoading"
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              required
              :disabled="isLoading"
              autocomplete="new-password"
            />
          </div>

          <div v-if="error" class="auth-error">
            {{ error }}
          </div>

          <button type="submit" class="auth-button" :disabled="isLoading">
            <span v-if="isLoading">Registrieren...</span>
            <span v-else>Registrieren</span>
          </button>
        </form>
      </div>

      <div class="auth-footer">
        <p>© {{ currentYear }} nscale DMS Assistant</p>
        <p>Version {{ version }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

// Store und Router
const router = useRouter();
const { login, register, isLoading, error } = useAuth();

// Formulardaten
const loginForm = ref({
  username: "",
  password: "",
  rememberMe: false,
});

const registerForm = ref({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

// UI-Zustand
const activeTab = ref("login");
const showRegister = ref(true);
const version = ref("1.0.0");
const currentYear = computed(() => new Date().getFullYear());

// Methoden
const handleLogin = async () => {
  try {
    await login(
      loginForm.value.username,
      loginForm.value.password,
      loginForm.value.rememberMe,
    );
    router.push("/");
  } catch (err) {
    console.error("Login fehlgeschlagen:", err);
  }
};

const handleRegister = async () => {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    error.value = "Die Passwörter stimmen nicht überein.";
    return;
  }

  try {
    await register(
      registerForm.value.username,
      registerForm.value.email,
      registerForm.value.password,
    );

    // Nach erfolgreicher Registrierung zum Login wechseln
    activeTab.value = "login";
    loginForm.value.username = registerForm.value.username;
  } catch (err) {
    console.error("Registrierung fehlgeschlagen:", err);
  }
};

const showForgotPassword = () => {
  // Funktion für "Passwort vergessen"
  alert(
    "Bitte kontaktieren Sie den Administrator, um Ihr Passwort zurückzusetzen.",
  );
};

onMounted(() => {
  // Automatische Weiterleitung, falls bereits angemeldet
  if (localStorage.getItem("authToken")) {
    router.push("/");
  }

  // Version aus der Konfiguration laden
  if (window.APP_CONFIG && window.APP_CONFIG.buildVersion) {
    version.value = window.APP_CONFIG.buildVersion;
  }
});
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: var(--background-color, #f5f5f5);
}

.auth-card {
  width: 100%;
  max-width: 480px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.auth-header {
  padding: 24px 24px 16px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.auth-logo {
  max-width: 100px;
  margin-bottom: 16px;
}

.auth-header h1 {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary, #333);
  margin: 0;
}

.auth-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.auth-tab {
  flex: 1;
  padding: 16px;
  border: none;
  background: none;
  font-weight: 500;
  color: var(--text-secondary, #777);
  cursor: pointer;
  transition: 0.2s;
}

.auth-tab.active {
  color: var(--primary-color, #1976d2);
  border-bottom: 2px solid var(--primary-color, #1976d2);
}

.auth-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  border-color: var(--primary-color, #1976d2);
  outline: none;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.forgot-password {
  color: var(--primary-color, #1976d2);
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.auth-button {
  width: 100%;
  padding: 12px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.auth-button:hover {
  background-color: var(--primary-color-dark, #1565c0);
}

.auth-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.auth-error {
  background-color: #ffebee;
  color: #d32f2f;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.auth-footer {
  padding: 16px 24px;
  text-align: center;
  background-color: #f9f9f9;
  color: var(--text-secondary, #777);
  font-size: 0.8rem;
}

.auth-footer p {
  margin: 4px 0;
}
</style>
