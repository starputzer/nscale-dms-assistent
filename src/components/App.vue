<template>
  <div id="app" :class="appClasses">
    <!-- Navigation bar at the top -->
    <NavigationBar 
      @new-chat="createNewSession"
      @logout="logout"
    />
    
    <!-- Main content area with sidebar and chat view -->
    <main class="app-main">
      <!-- Sidebar with chat sessions -->
      <Sidebar v-if="isAuthenticated" />
      
      <!-- Main chat view or welcome/auth screen -->
      <div class="content-area">
        <div v-if="!isAuthenticated" class="auth-container">
          <div class="auth-form">
            <div class="auth-logo">
              <img src="/images/senmvku-logo.png" alt="nscale Logo" class="auth-logo-image">
              <h1 class="auth-title">nscale DMS Assistent</h1>
            </div>
            
            <div class="login-form">
              <div class="form-group">
                <label for="username">Benutzername</label>
                <input 
                  type="text" 
                  id="username" 
                  v-model="credentials.username" 
                  class="nscale-input" 
                  placeholder="Benutzername"
                  :disabled="isLoggingIn"
                  @keyup.enter="login"
                >
              </div>
              
              <div class="form-group">
                <label for="password">Passwort</label>
                <input 
                  type="password" 
                  id="password" 
                  v-model="credentials.password" 
                  class="nscale-input" 
                  placeholder="Passwort"
                  :disabled="isLoggingIn"
                  @keyup.enter="login"
                >
              </div>
              
              <div v-if="loginError" class="login-error">
                {{ loginError }}
              </div>
              
              <button 
                class="nscale-btn-primary login-btn" 
                @click="login" 
                :disabled="isLoggingIn || !canLogin"
              >
                <span v-if="isLoggingIn" class="loading-spinner-small"></span>
                <span v-else>Anmelden</span>
              </button>
            </div>
          </div>
        </div>
        
        <ChatView v-else-if="isAuthenticated && currentSessionId" />
        
        <div v-else-if="isAuthenticated && !currentSessionId" class="welcome-container">
          <div class="welcome-content">
            <img src="/images/senmvku-logo.png" alt="nscale Logo" class="welcome-logo">
            <h1 class="welcome-title">Willkommen beim nscale DMS Assistenten</h1>
            <p class="welcome-text">Starten Sie eine neue Unterhaltung oder wählen Sie eine bestehende aus.</p>
            <button class="nscale-btn-primary new-chat-btn" @click="createNewSession">
              <i class="fas fa-plus-circle"></i>
              Neue Unterhaltung starten
            </button>
          </div>
        </div>
      </div>
    </main>
    
    <!-- System message area for notifications -->
    <div v-if="hasSystemMessages" class="system-messages">
      <div 
        v-for="(message, index) in systemMessages" 
        :key="index" 
        class="system-message"
        :class="message.type"
      >
        <i :class="getSystemMessageIcon(message.type)"></i>
        <span class="system-message-text">{{ message.text }}</span>
        <button class="close-btn" @click="dismissSystemMessage(index)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSessionsStore } from '../stores/sessions';
import { useSettingsStore } from '../stores/settings';
import { useUIStore } from '../stores/ui';
import NavigationBar from './NavigationBar.vue';
import Sidebar from './Sidebar.vue';
import ChatView from './ChatView.vue';

// Stores
const authStore = useAuthStore();
const sessionsStore = useSessionsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

// Auth state
const credentials = ref({
  username: '',
  password: ''
});
const loginError = ref<string | null>(null);
const isLoggingIn = ref(false);

// System messages
const systemMessages = ref<{ type: string; text: string }[]>([]);

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentSessionId = computed(() => sessionsStore.currentSessionId);
const isDarkTheme = computed(() => uiStore.isDarkMode);
const isHighContrast = computed(() => settingsStore.a11y.highContrast);

const appClasses = computed(() => ({
  'theme-dark': isDarkTheme.value,
  'theme-light': !isDarkTheme.value,
  'high-contrast': isHighContrast.value
}));

const canLogin = computed(() => 
  credentials.value.username.trim() !== '' && 
  credentials.value.password.trim() !== ''
);

const hasSystemMessages = computed(() => systemMessages.value.length > 0);

// Initialize app on mount
onMounted(async () => {
  // Load settings
  await settingsStore.fetchSettings();
  
  // Check if user is already authenticated
  if (isAuthenticated.value) {
    await sessionsStore.fetchSessions();
  }
});

// Watch for auth state changes
watch(() => authStore.isAuthenticated, (newValue) => {
  if (newValue) {
    sessionsStore.fetchSessions();
  }
});

// Watch for UI store toasts to show as system messages
watch(() => uiStore.toasts, (newToasts) => {
  if (newToasts.length > 0) {
    const newMessage = {
      type: newToasts[0].type,
      text: newToasts[0].message
    };
    systemMessages.value.push(newMessage);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      const index = systemMessages.value.findIndex(m => m.text === newMessage.text);
      if (index !== -1) {
        dismissSystemMessage(index);
      }
    }, 5000);
  }
}, { deep: true });

// Methods
async function login() {
  if (!canLogin.value || isLoggingIn.value) return;
  
  loginError.value = null;
  isLoggingIn.value = true;
  
  try {
    const success = await authStore.login({
      username: credentials.value.username,
      password: credentials.value.password
    });
    
    if (success) {
      credentials.value.password = ''; // Clear password
      await sessionsStore.fetchSessions();
      
      // Show welcome message
      addSystemMessage('success', 'Erfolgreich angemeldet');
    } else {
      loginError.value = authStore.error || 'Benutzername oder Passwort falsch';
    }
  } catch (error) {
    loginError.value = 'Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.';
    console.error('Login error:', error);
  } finally {
    isLoggingIn.value = false;
  }
}

function logout() {
  authStore.logout();
  // Navigate to login view
  addSystemMessage('info', 'Sie wurden abgemeldet');
}

async function createNewSession() {
  try {
    await sessionsStore.createSession('Neue Unterhaltung');
  } catch (error) {
    addSystemMessage('error', 'Fehler beim Erstellen einer neuen Unterhaltung');
    console.error('Error creating session:', error);
  }
}

function addSystemMessage(type: string, text: string) {
  systemMessages.value.push({ type, text });
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const index = systemMessages.value.findIndex(m => m.text === text);
    if (index !== -1) {
      dismissSystemMessage(index);
    }
  }, 5000);
}

function dismissSystemMessage(index: number) {
  systemMessages.value.splice(index, 1);
}

function getSystemMessageIcon(type: string): string {
  switch (type) {
    case 'success':
      return 'fas fa-check-circle';
    case 'error':
      return 'fas fa-exclamation-circle';
    case 'warning':
      return 'fas fa-exclamation-triangle';
    case 'info':
    default:
      return 'fas fa-info-circle';
  }
}
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif);
  color: var(--nscale-text, #333333);
  background-color: var(--nscale-background, white);
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Auth styles */
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: var(--nscale-background, #f9fafb);
}

.auth-form {
  background-color: var(--nscale-card-bg, white);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.auth-logo-image {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--nscale-text, #333333);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--nscale-text, #333333);
}

.login-error {
  color: #e53e3e;
  font-size: 0.875rem;
  margin-top: -0.5rem;
}

.login-btn {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
}

.loading-spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

/* Welcome view styles */
.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: var(--nscale-background, #f9fafb);
}

.welcome-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
}

.welcome-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
}

.welcome-title {
  font-size: 1.75rem;
  margin-bottom: 1rem;
  color: var(--nscale-text, #333333);
}

.welcome-text {
  color: var(--nscale-text-light, #666);
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.new-chat-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
}

.new-chat-btn i {
  margin-right: 0.5rem;
}

/* System messages */
.system-messages {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 1000;
  max-width: 400px;
}

.system-message {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease-in-out;
}

.system-message.success {
  background-color: #e6f7ed;
  border-left: 4px solid #10b981;
  color: #065f46;
}

.system-message.error {
  background-color: #fee2e2;
  border-left: 4px solid #e53e3e;
  color: #9b1c1c;
}

.system-message.warning {
  background-color: #fff8e6;
  border-left: 4px solid #f59e0b;
  color: #92400e;
}

.system-message.info {
  background-color: #e0f2fe;
  border-left: 4px solid #0ea5e9;
  color: #0c4a6e;
}

.system-message i {
  margin-right: 0.75rem;
  font-size: 1.25rem;
}

.system-message-text {
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  padding: 4px;
  margin-left: 0.5rem;
}

.close-btn:hover {
  opacity: 1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Theme classes */
.theme-dark {
  --nscale-background: #1a202c;
  --nscale-card-bg: #2d3748;
  --nscale-text: #f7fafc;
  --nscale-text-light: #a0aec0;
  --nscale-border: #4a5568;
  --nscale-sidebar-bg: #2d3748;
  --nscale-user-bg: #2c313d;
  --nscale-assistant-bg: #3a4556;
}

.theme-light {
  --nscale-background: #f9fafb;
  --nscale-card-bg: #ffffff;
  --nscale-text: #333333;
  --nscale-text-light: #666666;
  --nscale-border: #eaeaea;
  --nscale-sidebar-bg: #f7f7f7;
  --nscale-user-bg: var(--nscale-light-green);
  --nscale-assistant-bg: #ffffff;
}

.high-contrast {
  --nscale-text: #000000;
  --nscale-text-light: #333333;
  --nscale-green: #006633;
  --nscale-green-dark: #005522;
  --nscale-border: #000000;
}

/* Responsive styles */
@media (max-width: 768px) {
  .app-main {
    flex-direction: column;
  }
  
  .auth-form {
    width: 90%;
    max-width: none;
    padding: 1.5rem;
  }
  
  .system-messages {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }
}
</style>