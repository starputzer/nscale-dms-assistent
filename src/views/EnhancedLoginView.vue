<template>
  <div class="enhanced-login-container">
    <div class="auth-wrapper">
      <div class="auth-content">
        <!-- Logo/Header -->
        <div class="auth-header">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="auth-logo" />
          <h1 class="auth-title">nscale DMS Assistent</h1>
          <p class="auth-subtitle">
            {{
              activeTab === "login"
                ? "Willkommen zurück!"
                : "Jetzt registrieren"
            }}
          </p>
        </div>

        <!-- Tab-Navigation für Login/Register -->
        <div class="auth-tabs">
          <button
            type="button"
            :class="['auth-tab', { active: activeTab === 'login' }]"
            @click="setActiveTab('login')"
          >
            Anmelden
          </button>
          <button
            type="button"
            :class="['auth-tab', { active: activeTab === 'register' }]"
            @click="setActiveTab('register')"
          >
            Registrieren
          </button>
        </div>

        <!-- Feedback-Bereich (Fehler und Erfolgsmeldungen) -->
        <div v-if="authError || formError" class="auth-error">
          <span class="error-icon">⚠️</span>
          <p>{{ authError || formError }}</p>
        </div>

        <div v-if="loginSuccess" class="auth-success">
          <span class="success-icon">✅</span>
          <p>Anmeldung erfolgreich! Sie werden weitergeleitet...</p>
        </div>

        <!-- Formular -->
        <form @submit.prevent="submitForm" class="auth-form">
          <!-- Email-Feld (für beide Tabs) -->
          <div class="form-group">
            <label for="email">E-Mail</label>
            <input
              v-model="formData.email"
              type="email"
              id="email"
              name="email"
              placeholder="ihre-email@beispiel.de"
              :disabled="isLoading"
              required
              autocomplete="email"
              @blur="v$.email.$touch"
            />
            <div v-if="v$.email.$error" class="form-error">
              <span v-for="error in v$.email.$errors" :key="error.$uid">
                {{ error.$message }}
              </span>
            </div>
          </div>

          <!-- Benutzername (nur für Registrierung) -->
          <div v-if="activeTab === 'register'" class="form-group">
            <label for="username">Benutzername</label>
            <input
              v-model="formData.username"
              type="text"
              id="username"
              name="username"
              placeholder="benutzername"
              :disabled="isLoading"
              @blur="v$.username?.$touch"
            />
            <div v-if="v$.username?.$error" class="form-error">
              <span v-for="error in v$.username.$errors" :key="error.$uid">
                {{ error.$message }}
              </span>
            </div>
          </div>

          <!-- Anzeigename (nur für Registrierung) -->
          <div v-if="activeTab === 'register'" class="form-group">
            <label for="displayName">Anzeigename (optional)</label>
            <input
              v-model="formData.displayName"
              type="text"
              id="displayName"
              name="displayName"
              placeholder="Max Mustermann"
              :disabled="isLoading"
            />
          </div>

          <!-- Passwort-Feld -->
          <div class="form-group">
            <label for="password">Passwort</label>
            <div class="password-input-wrapper">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                id="password"
                name="password"
                placeholder="••••••••"
                :disabled="isLoading"
                required
                autocomplete="current-password"
                @blur="v$.password.$touch"
              />
              <button
                type="button"
                class="password-toggle"
                @click="togglePasswordVisibility"
                :aria-label="
                  showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'
                "
              >
                {{ showPassword ? "👁️" : "👁️‍🗨️" }}
              </button>
            </div>
            <div v-if="v$.password.$error" class="form-error">
              <span v-for="error in v$.password.$errors" :key="error.$uid">
                {{ error.$message }}
              </span>
            </div>
          </div>

          <!-- Passwort bestätigen (nur für Registrierung) -->
          <div v-if="activeTab === 'register'" class="form-group">
            <label for="passwordConfirm">Passwort bestätigen</label>
            <input
              v-model="formData.passwordConfirm"
              :type="showPassword ? 'text' : 'password'"
              id="passwordConfirm"
              name="passwordConfirm"
              placeholder="••••••••"
              :disabled="isLoading"
              @blur="v$.passwordConfirm?.$touch"
            />
            <div v-if="v$.passwordConfirm?.$error" class="form-error">
              <span
                v-for="error in v$.passwordConfirm.$errors"
                :key="error.$uid"
              >
                {{ error.$message }}
              </span>
            </div>
          </div>

          <!-- Passwort-Stärke-Anzeige (nur für Registrierung) -->
          <div
            v-if="activeTab === 'register' && formData.password"
            class="password-strength"
          >
            <div class="strength-indicator">
              <div
                :class="['strength-bar', `strength-${passwordStrength.score}`]"
              ></div>
            </div>
            <span class="strength-label">{{ passwordStrengthLabel }}</span>
          </div>

          <!-- Remember Me (nur für Login) -->
          <div v-if="activeTab === 'login'" class="form-group checkbox-group">
            <label>
              <input
                v-model="formData.rememberMe"
                type="checkbox"
                name="rememberMe"
                :disabled="isLoading"
              />
              Angemeldet bleiben
            </label>
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
        </form>

        <!-- Passwort vergessen (nur für Login) -->
        <div v-if="activeTab === 'login'" class="forgot-password">
          <a href="#" @click.prevent="handleForgotPassword"
            >Passwort vergessen?</a
          >
        </div>

        <!-- Footer mit Rechtlichem -->
        <div class="auth-footer">
          <p>© {{ currentYear }} nscale DMS Assistent</p>
          <div class="legal-links">
            <a href="#" @click.prevent="showLegal('datenschutz')"
              >Datenschutz</a
            >
            <a href="#" @click.prevent="showLegal('impressum')">Impressum</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useRouter } from "vue-router";
import { useVuelidate } from "@vuelidate/core";
import {
  required,
  email,
  minLength,
  sameAs,
  helpers,
} from "@vuelidate/validators";
import { useAuthentication } from "@/composables/useAuthentication";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { useToast } from "@/composables/useToast";

// Router und Services einbinden
const router = useRouter();
const toast = useToast();

// Auth-Composable mit reactive state und Methoden
const {
  login,
  register,
  demoLogin,
  isLoading,
  isAuthenticated,
  authError,
  resetError,
} = useAuthentication();

// Lokaler reaktiver State
const activeTab = ref<"login" | "register">("login");
const loginSuccess = ref(false);
const showPassword = ref(false);
const formError = ref<string | null>(null);

// Das aktuelle Jahr für das Copyright
const currentYear = new Date().getFullYear();

// Formulardaten
const formData = reactive({
  email: "",
  username: "",
  password: "",
  passwordConfirm: "",
  displayName: "",
  rememberMe: false,
});

// Logo URL (optional, kann angepasst werden)
const logoUrl = computed(() => "/assets/images/senmvku-logo.png");

// Validierungsregeln
const rules = computed(() => {
  const baseRules = {
    email: {
      required: helpers.withMessage("E-Mail ist erforderlich", required),
      email: helpers.withMessage(
        "Bitte geben Sie eine gültige E-Mail-Adresse ein",
        email,
      ),
    },
    password: {
      required: helpers.withMessage("Passwort ist erforderlich", required),
    },
  };

  // Zusätzliche Regeln für Registrierung
  if (activeTab.value === "register") {
    return {
      ...baseRules,
      username: {
        required: helpers.withMessage(
          "Benutzername ist erforderlich",
          required,
        ),
        minLength: helpers.withMessage(
          "Benutzername muss mindestens 3 Zeichen haben",
          minLength(3),
        ),
      },
      password: {
        ...baseRules.password,
        minLength: helpers.withMessage(
          "Passwort muss mindestens 8 Zeichen haben",
          minLength(8),
        ),
      },
      passwordConfirm: {
        required: helpers.withMessage(
          "Passwortbestätigung ist erforderlich",
          required,
        ),
        sameAsPassword: helpers.withMessage(
          "Passwörter stimmen nicht überein",
          sameAs(formData.password),
        ),
      },
    };
  }

  return baseRules;
});

// Vuelidate initialisieren
const v$ = useVuelidate(rules, formData);

// Passwort-Stärke berechnen
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

const passwordStrengthLabel = computed(() => {
  const score = passwordStrength.value.score;
  if (score === 0) return "Sehr schwach";
  if (score === 1) return "Schwach";
  if (score === 2) return "Mittel";
  if (score === 3) return "Stark";
  return "Sehr stark";
});

// Submit-Button deaktivieren, wenn Formular ungültig oder lädt
const isSubmitDisabled = computed(() => isLoading.value || v$.value.$invalid);

// Aktiven Tab setzen
function setActiveTab(tab: "login" | "register") {
  activeTab.value = tab;
  resetError();
  formError.value = null;
  loginSuccess.value = false;

  nextTick(() => {
    v$.value.$reset();
  });
}

// Passwortsichtbarkeit umschalten
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

// Passwort-Stärke bewerten (0-4)
function calculatePasswordScore(password: string): number {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return score;
}

// Formular absenden
async function submitForm() {
  try {
    resetError();
    formError.value = null;

    const isFormValid = await v$.value.$validate();
    if (!isFormValid) {
      return;
    }

    if (activeTab.value === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  } catch (error) {
    console.error("Fehler beim Absenden des Formulars:", error);
    formError.value = "Ein unerwarteter Fehler ist aufgetreten.";
    toast.error("Ein unerwarteter Fehler ist aufgetreten");
  }
}

// Login-Handler
async function handleLogin() {
  try {
    console.log("handleLogin aufgerufen");
    const success = await login({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
    });

    if (success) {
      loginSuccess.value = true;
      toast.success("Login erfolgreich!");

      // Kurze Verzögerung, dann weiterleiten
      setTimeout(() => {
        const redirect =
          (router.currentRoute.value.query.redirect as string) || "/chat";
        router.push(redirect);
      }, 500);
    }
  } catch (error) {
    console.error("Login fehlgeschlagen:", error);
  }
}

// Registrierungs-Handler
async function handleRegister() {
  try {
    const success = await register({
      email: formData.email,
      username: formData.username,
      password: formData.password,
      displayName: formData.displayName,
    });

    if (success) {
      loginSuccess.value = true;
      toast.success("Registrierung erfolgreich! Sie werden weitergeleitet...");

      setTimeout(() => {
        router.push("/chat");
      }, 1500);
    }
  } catch (error) {
    console.error("Registrierung fehlgeschlagen:", error);
  }
}

// Demo-Login-Handler
async function handleDemoLogin() {
  try {
    console.log("Demo-Login wird ausgeführt");
    const success = await demoLogin();

    if (success) {
      loginSuccess.value = true;
      toast.success("Demo-Login erfolgreich!");

      setTimeout(() => {
        router.push("/chat");
      }, 500);
    }
  } catch (error) {
    console.error("Demo-Login fehlgeschlagen:", error);
  }
}

// Passwort vergessen Handler
function handleForgotPassword() {
  toast.info("Passwort-Wiederherstellung ist aktuell nicht verfügbar.");
}

// Rechtliche Informationen anzeigen
function showLegal(type: "datenschutz" | "impressum") {
  toast.info(
    `${type === "datenschutz" ? "Datenschutz" : "Impressum"} wird geladen...`,
  );
}

// beforeunload Event Handler
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if ((formData.email || formData.password) && !loginSuccess.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}

// KEINE automatischen Weiterleitungen in onMounted oder watch!
onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
});

// Aufräumen
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<style scoped>
.enhanced-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
}

.auth-wrapper {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.auth-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
  position: relative;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  object-fit: contain;
}

.auth-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: #666;
  font-size: 1rem;
}

.auth-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.auth-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.auth-tab:hover {
  color: #1a1a2e;
}

.auth-tab.active {
  color: #1a1a2e;
}

.auth-tab.active::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #007bff;
}

.auth-error,
.auth-success {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.auth-error {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.auth-success {
  background: #efe;
  color: #393;
  border: 1px solid #cfc;
}

.error-icon,
.success-icon {
  font-size: 1.25rem;
}

.auth-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  padding-right: 3rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.password-toggle:hover {
  opacity: 1;
}

.form-error {
  margin-top: 0.5rem;
  color: #c33;
  font-size: 0.85rem;
}

.form-error span {
  display: block;
}

.password-strength {
  margin-top: 0.75rem;
}

.strength-indicator {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.strength-bar {
  height: 100%;
  width: 0;
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
}

.strength-bar.strength-0 {
  width: 20%;
  background: #c33;
}

.strength-bar.strength-1 {
  width: 40%;
  background: #f93;
}

.strength-bar.strength-2 {
  width: 60%;
  background: #fc3;
}

.strength-bar.strength-3 {
  width: 80%;
  background: #9c3;
}

.strength-bar.strength-4 {
  width: 100%;
  background: #3c9;
}

.strength-label {
  font-size: 0.85rem;
  color: #666;
}

.checkbox-group {
  margin-bottom: 1.5rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.auth-submit-button,
.demo-login-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.auth-submit-button {
  background: #007bff;
  color: white;
  margin-bottom: 1rem;
}

.auth-submit-button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.auth-submit-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.demo-login-button {
  background: transparent;
  color: #007bff;
  border: 2px solid #007bff;
}

.demo-login-button:hover:not(:disabled) {
  background: #007bff;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
}

.demo-login-button:disabled {
  color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.demo-login-button .loading-spinner {
  border-color: rgba(0, 123, 255, 0.3);
  border-top-color: #007bff;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.forgot-password {
  text-align: center;
  margin-bottom: 1.5rem;
}

.forgot-password a {
  color: #007bff;
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.forgot-password a:hover {
  color: #0056b3;
  text-decoration: underline;
}

.auth-footer {
  text-align: center;
  color: #999;
  font-size: 0.85rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.legal-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.legal-links a {
  color: #666;
  text-decoration: none;
  transition: color 0.3s ease;
}

.legal-links a:hover {
  color: #007bff;
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 480px) {
  .auth-content {
    padding: 1.5rem;
  }

  .auth-title {
    font-size: 1.5rem;
  }

  .auth-tabs {
    gap: 0.25rem;
  }

  .auth-tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
