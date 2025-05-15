<!--
App.vue - Hauptanwendungskomponente mit verbesserter 404-Fehlerbehandlung
-->
<template>
  <div class="app-container" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Improved Error Boundary mit robuster 404-Behandlung -->
    <ImprovedErrorBoundary
      :enableAutoRecovery="true"
      :showDiagnostics="isDevMode"
      @error="handleError"
      @recovery-started="handleRecoveryStarted"
      @recovery-completed="handleRecoveryCompleted"
    >
      <div id="fallback-container" style="display: none;">
        <h1>nscale DMS Assistant</h1>
        <p>Anwendung wird geladen...</p>
        <button @click="navigateHome">Zur Startseite</button>
      </div>
      
      <!-- Router-Bereitschaftsprüfung -->
      <div v-if="!isRouterReady" class="router-initialization">
        <SpinnerIcon size="large" />
        <p>Router wird initialisiert...</p>
      </div>
      
      <!-- Hauptanwendung -->
      <template v-else>
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
          
          <!-- Error Debug Panel (nur im Dev-Modus oder bei aktiviertem Debug) -->
          <ErrorDebugPanel
            v-if="showDebugPanel"
            :enabled="showDebugPanel"
            @close="showDebugPanel = false"
            @action="handleDebugAction"
          />
          
          <!-- Router Health Monitor - DEAKTIVIERT -->
          <!-- <RouterHealthMonitor
            v-if="isDevMode || hasRouterErrors"
            :position="'bottom-right'"
            :start-expanded="hasRouterErrors"
            :auto-hide="true"
            :auto-hide-delay="30000"
            ref="healthMonitor"
          /> -->
        </template>
      </template>
      
      <!-- Auth-Error-Boundary für Auth-bezogene Fehler -->
      <auth-error-boundary @retry-auth="retryAuthentication">
        <!-- Auth-bezogene Fehler werden hier abgefangen -->
      </auth-error-boundary>
    </ImprovedErrorBoundary>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Komponenten importieren
import AppHeader from '@/components/layout/Header.vue'
import AppMotd from '@/components/ui/Motd.vue'
import FeedbackDialog from '@/components/dialog/FeedbackDialog.vue'
import SettingsDialog from '@/components/dialog/SettingsDialog.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ImprovedErrorBoundary from '@/components/shared/ImprovedErrorBoundary.vue'
import AuthErrorBoundary from '@/components/auth/AuthErrorBoundary.vue'
import ErrorDebugPanel from '@/components/debug/ErrorDebugPanel.vue'
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue'
// import RouterHealthMonitor from '@/components/monitoring/RouterHealthMonitor.vue' // ENTFERNT

// Services und Composables
import { routerService } from '@/services/router/RouterServiceFixed'
import { navigationController } from '@/controllers/NavigationController'
// Verwende Basic Route Fallback ohne DOM-Fehler-Erkennung
import { useBasicRouteFallback } from '@/composables/useBasicRouteFallback'
import { domErrorDetector } from '@/utils/domErrorDiagnosticsFixed'
import { diagnosticsInitializer } from '@/services/diagnostics/DiagnosticsInitializer'
import { useLogger } from '@/composables/useLogger'
import { useToast } from '@/composables/useToast'
import { installRouterGuards } from '@/plugins/routerGuardsFixed'

// Type definitions and interfaces
interface SystemInfo {
  version: string;
  environment: string;
  apiStatus: string;
  lastUpdate: string;
}

export default defineComponent({
  name: 'App',
  components: {
    AppHeader,
    AppMotd,
    FeedbackDialog,
    SettingsDialog,
    ToastContainer,
    ImprovedErrorBoundary,
    AuthErrorBoundary,
    ErrorDebugPanel,
    SpinnerIcon
    // RouterHealthMonitor // ENTFERNT
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const logger = useLogger()
    const toast = useToast()
    
    // State variables
    const isDarkTheme = ref(false)
    const showFeedbackDialog = ref(false)
    const feedbackMessage = ref('')
    const feedbackType = ref('')
    const feedbackComment = ref('')
    const settingsVisible = ref(false)
    const showDebugPanel = ref(false)
    const isDevMode = computed(() => import.meta.env.DEV)
    const isRouterReady = ref(false)
    // const healthMonitor = ref(null) // ENTFERNT
    
    // Computed für Router-Fehler
    // const hasRouterErrors = computed(() => false) // ENTFERNT
    
    // TEMPORÄR: Basic Route Fallback ohne DOM-Fehlererkennung
    const {
      navigateToFallback,
      enable: enableFallback,
      disable: disableFallback,
      enabled: fallbackEnabled
    } = useBasicRouteFallback()
    
    // Dummy-Werte für deaktivierte Features
    const isMonitoring = ref(false)
    const routeHealth = ref({ healthy: true, consecutiveFailures: 0 })
    const safeNavigate = async (path: string) => router.push(path)
    const checkRouteHealth = () => {}
    
    // Settings
    const fontSizeLevel = ref(2)
    const contrastMode = ref(false)
    const colorMode = ref('light')
    const language = ref('de')
    const streamingEnabled = ref(true)
    
    // User and system info
    const userRole = ref('user')
    const systemInfo = ref<SystemInfo>({
      version: '1.0.0',
      environment: 'production',
      apiStatus: 'online',
      lastUpdate: new Date().toISOString()
    })
    
    // Computed properties
    const isAuthRoute = computed(() => 
      route.path === '/login' || 
      route.path === '/auth' || 
      route.path.startsWith('/auth/')
    )
    
    // Router Initialization
    const initializeRouter = async () => {
      try {
        logger.info('Diagnose-System-Initialisierung gestartet')
        
        // Router im Service setzen
        if (router) {
          routerService.setRouter(router)
        }
        
        // Alle Diagnose-Services initialisieren
        const services = await diagnosticsInitializer.initialize(router)
        
        if (!services.initialized) {
          throw new Error('Diagnose-Services konnten nicht initialisiert werden')
        }
        
        // Router Guards installieren
        installRouterGuards(router, {
          enableLogging: isDevMode.value,
          enableFeatureChecks: true,
          enableAuthChecks: true
        })
        
        isRouterReady.value = true
        logger.info('Diagnose-System erfolgreich initialisiert', services)
      } catch (error) {
        logger.error('Diagnose-System-Initialisierung fehlgeschlagen', error)
        toast.error('System-Initialisierung fehlgeschlagen. Bitte Seite neu laden.')
        
        // Fallback: Grundfunktionalität sicherstellen
        isRouterReady.value = true
        
        // Seite nach Verzögerung neu laden
        setTimeout(() => {
          window.location.reload()
        }, 5000)
      }
    }
    
    // Navigation Methods mit Error Handling
    const navigateHome = async () => {
      try {
        const success = await navigationController.navigateHome({
          showToast: true,
          fallbackOnError: false
        })
        
        if (!success) {
          window.location.href = '/'
        }
      } catch (error) {
        logger.error('Navigation zur Startseite fehlgeschlagen', error)
        window.location.href = '/'
      }
    }
    
    const toggleSettings = () => {
      settingsVisible.value = !settingsVisible.value
    }
    
    const resetSettings = () => {
      fontSizeLevel.value = 2
      contrastMode.value = false
      colorMode.value = 'light'
      language.value = 'de'
      streamingEnabled.value = true
    }
    
    const submitFeedback = (type: string) => {
      feedbackType.value = type
      // Feedback logic
    }
    
    const submitFeedbackWithComment = () => {
      // Submit feedback with comment
      showFeedbackDialog.value = false
    }
    
    const retryAuthentication = async () => {
      logger.info('Retrying authentication...')
      // Retry authentication logic
    }
    
    // Error Handlers
    const handleError = (error: Error) => {
      logger.error('App-Level Error:', error)
      
      // Spezielle Behandlung für currentRoute-Fehler
      if (error.message.includes('Cannot read properties of undefined')) {
        if (error.message.includes('currentRoute')) {
          logger.warn('CurrentRoute-Fehler erkannt, Router-Reset...')
          initializeRouter()
        }
      }
    }
    
    const handleRecoveryStarted = () => {
      logger.info('Fehlerwiederherstellung gestartet')
      toast.info('Automatische Fehlerkorrektur läuft...')
    }
    
    const handleRecoveryCompleted = (success: boolean) => {
      if (success) {
        logger.info('Fehlerwiederherstellung erfolgreich')
        toast.success('Fehler erfolgreich behoben')
      } else {
        logger.error('Fehlerwiederherstellung fehlgeschlagen')
        toast.error('Automatische Korrektur fehlgeschlagen. Bitte Seite neu laden.')
        showDebugPanel.value = true
      }
    }
    
    const handleDebugAction = (action: string, result: any) => {
      logger.info(`Debug action: ${action}`, result)
    }
    
    // Lifecycle hooks
    onMounted(async () => {
      // Router initialisieren
      await initializeRouter()
      
      // Theme initialization
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        isDarkTheme.value = savedTheme === 'dark'
        colorMode.value = savedTheme
      }
      
      // Developer mode setup
      if (isDevMode.value) {
        // Debug keyboard shortcut (Ctrl+Shift+D)
        const handleKeyPress = (e: KeyboardEvent) => {
          if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            showDebugPanel.value = !showDebugPanel.value
          }
        }
        window.addEventListener('keydown', handleKeyPress)
        
        // Cleanup
        onBeforeUnmount(() => {
          window.removeEventListener('keydown', handleKeyPress)
        })
      }
      
      // Global Error Handler für undefined currentRoute
      window.addEventListener('error', (event) => {
        if (event.error?.message?.includes('Cannot read properties of undefined')) {
          if (event.error.message.includes('currentRoute')) {
            event.preventDefault()
            handleError(event.error)
          }
        }
      })
      
      // Start DOM error detection with defensive programming
      let stopDetection: (() => void) | null = null
      
      try {
        if (domErrorDetector && typeof domErrorDetector.startAutoDetection === 'function') {
          stopDetection = domErrorDetector.startAutoDetection(3000)
          console.log('DOM error detection started successfully')
        } else {
          console.warn('domErrorDetector not available or invalid')
        }
      } catch (error) {
        console.error('Failed to start DOM error detection:', error)
      }
      
      onBeforeUnmount(() => {
        if (stopDetection && typeof stopDetection === 'function') {
          stopDetection()
        }
      })
    })
    
    // Watch theme changes
    watch(isDarkTheme, (newValue) => {
      localStorage.setItem('theme', newValue ? 'dark' : 'light')
      document.documentElement.classList.toggle('theme-dark', newValue)
    })
    
    // Watch route changes for error detection
    // TEMPORÄR DEAKTIVIERT - DOM-Fehlererkennung ist zu aggressiv
    /*
    watch(() => route.path, async () => {
      // Verzögerte Prüfung der Route-Gesundheit
      setTimeout(() => {
        checkRouteHealth()
      }, 500)
    })
    */
    
    // Watch Router Health
    watch(routeHealth, (health) => {
      if (!health.healthy && health.consecutiveFailures > 2) {
        logger.warn('Route-Gesundheit kritisch', health)
        if (!showDebugPanel.value && isDevMode.value) {
          showDebugPanel.value = true
        }
      }
    })
    
    return {
      // State
      isDarkTheme,
      showFeedbackDialog,
      feedbackMessage,
      feedbackType,
      feedbackComment,
      settingsVisible,
      showDebugPanel,
      isDevMode,
      isRouterReady,
      // hasRouterErrors, // ENTFERNT
      // healthMonitor, // ENTFERNT
      
      // Settings
      fontSizeLevel,
      contrastMode,
      colorMode,
      language,
      streamingEnabled,
      
      // User and system
      userRole,
      systemInfo,
      
      // Computed
      isAuthRoute,
      isMonitoring,
      routeHealth,
      
      // Methods
      navigateHome,
      toggleSettings,
      resetSettings,
      submitFeedback,
      submitFeedbackWithComment,
      retryAuthentication,
      handleError,
      handleRecoveryStarted,
      handleRecoveryCompleted,
      handleDebugAction
    }
  }
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: all 0.3s ease;
}

.app-container.theme-dark {
  background-color: var(--color-background-dark);
  color: var(--color-text-dark);
}

.router-initialization {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.router-initialization p {
  font-size: 1.2rem;
  color: var(--color-text-light);
}

#fallback-container {
  text-align: center;
  padding: 2rem;
  margin-top: 20vh;
}

#fallback-container h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--color-primary);
}

#fallback-container p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: var(--color-text-light);
}

#fallback-container button {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

#fallback-container button:hover {
  background-color: var(--color-primary-dark);
}

/* Global error handling styles */
:deep(.error-boundary-fallback) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

/* Debug panel positioning */
:deep(.error-debug-panel) {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}
</style>