<!--
App.vue.fixed - Diese Datei enthält eine bereinigte Version der App.vue mit TypeScript-Korrekturen
-->
<template>
  <div class="app-container" :class="{ 'theme-dark': isDarkTheme }">
    <div id="fallback-container" style="display: none;">
      <h1>nscale DMS Assistant</h1>
      <p>Anwendung wird geladen...</p>
      <button @click="navigateHome">Zur Startseite</button>
    </div>
    
    <!-- Vue Router View mit höchster Priorität für Login-Seite -->
    <router-view v-if="isAuthRoute" />
    
    <!-- Hauptanwendung nur anzeigen, wenn nicht auf Auth-Route -->
    <template v-else>
      <!-- Vue Router View für alle anderen Seiten -->
      <router-view />
      
      <!-- Modals -->
      <feedback-dialog 
        v-if="showFeedbackDialog"
        :message="feedbackMessage"
        :type="feedbackType"
        v-model:comment="feedbackComment"
        @close="showFeedbackDialog = false"
        @submit="submitFeedbackWithComment"
        @select-type="submitFeedback"
      />
      
      <settings-dialog
        v-if="settingsVisible"
        v-model:font-size="fontSizeLevel"
        v-model:contrast-mode="contrastMode"
        v-model:color-mode="colorMode"
        v-model:language="language"
        v-model:streaming-enabled="streamingEnabled"
        :system-info="systemInfo"
        :user-role="userRole"
        @close="toggleSettings"
        @reset="resetSettings"
      />
      
      <!-- Toast-Container für Benachrichtigungen -->
      <toast-container />
      
      <!-- Error-Boundary für Fehlerfälle -->
      <error-boundary>
        <template #default="{ error, resetError }">
          <critical-error :error="error" @reset="resetError" />
        </template>
      </error-boundary>
    </template>
    
    <!-- Auth-Error-Boundary für Auth-bezogene Fehler -->
    <auth-error-boundary @retry-auth="retryAuthentication">
      <!-- Auth-bezogene Fehler werden hier abgefangen -->
    </auth-error-boundary>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Komponenten importieren
import AppHeader from '@/components/layout/Header.vue'
import AppMotd from '@/components/ui/Motd.vue'
import FeedbackDialog from '@/components/dialog/FeedbackDialog.vue'
import SettingsDialog from '@/components/dialog/SettingsDialog.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import CriticalError from '@/components/shared/CriticalError.vue'
import AuthErrorBoundary from '@/components/auth/AuthErrorBoundary.vue'

// Type definitions and interfaces
interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isArchived?: boolean;
  isPinned?: boolean;
}

// Message type (compatible with different message formats)
interface Message {
  id: string;
  sessionId?: string;
  content?: string;
  role?: 'user' | 'assistant' | 'system';
  text?: string;
  is_user?: boolean;
  timestamp: string;
  sources?: any[];
}

// MOTD configuration
interface MotdConfig {
  enabled: boolean;
  title?: string;
  content: string;
  display?: {
    showInChat: boolean;
    showOnStartup: boolean;
  };
  format?: string;
  style?: Record<string, string>;
}

// Store types (mock implementations)
interface AuthStore {
  isAuthenticated: boolean;
  token: string | null;
  userRole: string;
  logout(): void;
  validateToken(): Promise<void>;
}

interface SessionsStore {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: Message[];
  loadSessions(): Promise<void>;
  createNewSession(): Promise<string>;
  setCurrentSession(sessionId: string): Promise<void>;
  loadSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
  sendMessage(params: { sessionId: string, content: string, role?: string }): Promise<void>;
  addMessage(message: Message): void;
  updateStreamedMessage(content: string): void;
  clearSessions(): void;
}

interface SettingsStore {
  fontSizeLevel: number;
  contrastMode: string;
  colorMode: string;
  language: string;
  streamingEnabled: boolean;
  setFontSizeLevel(value: number): void;
  setContrastMode(value: string): void;
  setColorMode(value: string): void;
  setLanguage(value: string): void;
  setStreamingEnabled(value: boolean): void;
  resetToDefaults(): void;
}

interface UIStore {
  activeView: string;
  settingsVisible: boolean;
  setActiveView(view: string): void;
  toggleSettings(): void;
  showToast(toast: {type: string, message: string}): void;
}

interface MotdStore {
  config: MotdConfig;
  editConfig: MotdConfig;
  dismissed: boolean;
  dismiss(): void;
  saveConfig(config: MotdConfig): void;
}

interface FeedbackStore {
  submitFeedback(feedback: {
    messageId: string | null;
    type: string;
    comment: string;
    sessionId: string | null;
  }): Promise<void>;
}

interface ABTestStore {
  tests: any[];
  loadTests(): Promise<void>;
}

// Mock store functions with initial values
function useAuthStore(): AuthStore {
  return {
    isAuthenticated: false,
    token: null,
    userRole: 'user',
    logout: () => {},
    validateToken: async () => {}
  };
}

function useSessionsStore(): SessionsStore {
  return {
    sessions: [],
    currentSession: null,
    messages: [],
    loadSessions: async () => {},
    createNewSession: async () => "session-id",
    setCurrentSession: async () => {},
    loadSession: async () => {},
    deleteSession: async () => {},
    archiveSession: async () => {},
    sendMessage: async () => {},
    addMessage: () => {},
    updateStreamedMessage: () => {},
    clearSessions: () => {}
  };
}

function useSettingsStore(): SettingsStore {
  return {
    fontSizeLevel: 1,
    contrastMode: 'normal',
    colorMode: 'light',
    language: 'de',
    streamingEnabled: true,
    setFontSizeLevel: () => {},
    setContrastMode: () => {},
    setColorMode: () => {},
    setLanguage: () => {},
    setStreamingEnabled: () => {},
    resetToDefaults: () => {}
  };
}

function useUIStore(): UIStore {
  return {
    activeView: 'chat',
    settingsVisible: false,
    setActiveView: () => {},
    toggleSettings: () => {},
    showToast: () => {}
  };
}

function useMotdStore(): MotdStore {
  return {
    config: {
      enabled: false,
      content: '',
      display: {
        showInChat: false,
        showOnStartup: false
      }
    },
    editConfig: {
      enabled: false,
      content: '',
      display: {
        showInChat: false,
        showOnStartup: false
      }
    },
    dismissed: false,
    dismiss: () => {},
    saveConfig: () => {}
  };
}

function useFeedbackStore(): FeedbackStore {
  return {
    submitFeedback: async () => {}
  };
}

function useABTestStore(): ABTestStore {
  return {
    tests: [],
    loadTests: async () => {}
  };
}

export default defineComponent({
  name: 'App',
  
  components: {
    AppHeader,
    AppMotd,
    FeedbackDialog,
    SettingsDialog,
    ToastContainer,
    ErrorBoundary,
    CriticalError,
    AuthErrorBoundary
  },
  
  props: {
    // App doesn't have props since it's the root component
  },
  
  setup() {
    // Stores
    const authStore = useAuthStore()
    const settingsStore = useSettingsStore()
    const uiStore = useUIStore()
    const feedbackStore = useFeedbackStore()
    const route = useRoute()
    
    // Reaktive State-Variablen
    const showFeedbackDialog = ref(false)
    const feedbackMessage = ref<Message | null>(null)
    const feedbackType = ref('')
    const feedbackComment = ref('')
    
    // Computed Properties
    const userRole = computed(() => authStore.userRole)
    const settingsVisible = computed(() => uiStore.settingsVisible)
    const isDarkTheme = computed(() => settingsStore.colorMode === 'dark' || 
      (settingsStore.colorMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches))
    
    // Prüfen, ob die aktuelle Route eine Auth-Route ist
    const isAuthRoute = computed(() => {
      return route.path === '/login' || 
             route.path === '/register' || 
             route.path.startsWith('/auth');
    })
    
    // Feedback-Funktionen

    // Feedback-Funktionen
    const submitFeedback = (type: string): void => {
      feedbackType.value = type
    }

    const submitFeedbackWithComment = async (): Promise<void> => {
      try {
        await feedbackStore.submitFeedback({
          messageId: feedbackMessage.value?.id || null,
          type: feedbackType.value,
          comment: feedbackComment.value,
          sessionId: null
        })

        showFeedbackDialog.value = false
        feedbackType.value = ''
        feedbackComment.value = ''

        uiStore.showToast({
          type: 'success',
          message: 'Vielen Dank für Ihr Feedback!'
        })
      } catch (error) {
        uiStore.showToast({
          type: 'error',
          message: 'Fehler beim Senden des Feedbacks'
        })
      }
    }

    // Einstellungen
    const toggleSettings = (): void => {
      uiStore.toggleSettings()
    }

    const resetSettings = (): void => {
      settingsStore.resetToDefaults()
    }

    // Auth-Funktionen werden über den Router und Guards gehandhabt
    
    // Hilfsfunktion für erneuten Authentifizierungsversuch
    const retryAuthentication = () => {
      console.log('Authentifizierung wird erneut versucht...');
      
      // Zurücksetzen von Auth-Fehlern
      if (authStore.resetAuthErrors) {
        authStore.resetAuthErrors();
      }
      
      // Optional: Weiterleitung zur Login-Seite
      if (route.path !== '/login') {
        const router = (window as any).$router;
        if (router) {
          router.push('/login');
        } else {
          // Fallback bei fehlerhaftem Router
          window.location.href = '/login';
        }
      }
      
      // Toast-Benachrichtigung anzeigen
      uiStore.showToast({
        type: 'info',
        message: 'Bitte erneut anmelden'
      });
    }

    // Initialisierung
    onMounted(() => {
      // Theme setzen basierend auf Einstellungen
      document.documentElement.classList.toggle('theme-dark', isDarkTheme.value)
      
      // Entferne Ladeanimation
      const appLoader = document.getElementById('app-loading')
      if (appLoader) {
        appLoader.classList.add('app-loader-fade')
        setTimeout(() => {
          appLoader.style.display = 'none'
        }, 500)
      }
    })
    
    // Watch für Theme-Änderungen
    watch(isDarkTheme, (newValue: boolean) => {
      document.documentElement.classList.toggle('theme-dark', newValue)
    })
    
    return {
      // State
      userRole,
      showFeedbackDialog,
      feedbackMessage,
      feedbackType,
      feedbackComment,
      settingsVisible,
      isDarkTheme,
      isAuthRoute,
      
      // Einstellungen mit korrekter Typisierung für Vue 3 computed mit Getter/Setter
      fontSizeLevel: {
        get: () => settingsStore.fontSizeLevel,
        set: (value: number) => settingsStore.setFontSizeLevel(value)
      },
      contrastMode: {
        get: () => settingsStore.contrastMode,
        set: (value: string) => settingsStore.setContrastMode(value)
      },
      colorMode: {
        get: () => settingsStore.colorMode,
        set: (value: string) => settingsStore.setColorMode(value)
      },
      language: {
        get: () => settingsStore.language,
        set: (value: string) => settingsStore.setLanguage(value)
      },
      streamingEnabled: {
        get: () => settingsStore.streamingEnabled,
        set: (value: boolean) => settingsStore.setStreamingEnabled(value)
      },
      systemInfo: computed(() => ({
        version: '1.0.0',
        build: '20250511',
        model: 'nScale Assistant',
        endpoint: '/api'
      })),
      
      // Methoden
      submitFeedback,
      submitFeedbackWithComment,
      toggleSettings,
      resetSettings,
      retryAuthentication,
      
      // Notfall-Navigation
      navigateHome: () => {
        window.location.href = "/";
      }
    }
  }
})
</script>

<style lang="scss">
// Basis-Styles
:root {
  /* Primary color palette */
  --nscale-green: #00a550;
  --nscale-green-dark: #008d45;
  --nscale-green-darker: #00773b;
  --nscale-green-light: #e8f7ef;
  --nscale-green-lighter: #f2fbf7;
  
  /* Secondary colors */
  --nscale-dark-gray: #333333;
  --nscale-mid-gray: #666666;
  --nscale-light-gray: #cccccc;
  --nscale-lightest-gray: #f5f5f5;

  /* State colors */
  --nscale-success: #00a550;
  --nscale-warning: #ffc107;
  --nscale-error: #dc3545;
  --nscale-info: #17a2b8;
  
  /* UI component colors */
  --nscale-border-color: #e2e8f0;
  --nscale-shadow-color: rgba(0, 0, 0, 0.1);
  --nscale-focus-ring: rgba(0, 165, 80, 0.25);
  
  /* Background colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f5f9;
  
  /* Text colors */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #888888;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Animation duration */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}

// Dark theme variables
.theme-dark {
  --nscale-green-light: rgba(0, 165, 80, 0.2);
  --nscale-green-lighter: rgba(0, 165, 80, 0.1);
  
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #333333;
  
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  
  --nscale-border-color: #444444;
  --nscale-shadow-color: rgba(0, 0, 0, 0.3);
}

// Basis-Stile
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.5;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// Lade-Animation
.app-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity var(--duration-normal) ease-out;
  
  &.app-loader-fade {
    opacity: 0;
  }
}

.app-loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.app-loader-logo {
  width: 80px;
  height: auto;
}

.app-loader-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--nscale-green-light);
  border-top-color: var(--nscale-green);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Critical error styling
.critical-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.critical-error-content {
  background-color: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.critical-error h2 {
  color: var(--nscale-error);
  margin-top: 0;
}

.critical-error button {
  background-color: var(--nscale-green);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
  margin-top: var(--spacing-md);
  transition: background-color var(--duration-fast) ease;
  
  &:hover {
    background-color: var(--nscale-green-dark);
  }
}
</style>