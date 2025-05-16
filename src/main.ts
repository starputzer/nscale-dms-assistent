/**
 * Digitale Akte Assistent - Haupteinstiegspunkt
 * Verwendet die redesigned App-Komponente mit dynamischen Layouts
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { RouteLocationNormalized } from 'vue-router'

// App-Komponente mit dynamischen Layouts
import App from './App.vue'

// Router
import router from './router'

// Stores
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/ui'
import { useTheme } from './composables/useTheme'

// Direktiven und Composables
import { globalDirectives } from '@/directives'
import { globalPlugins } from '@/plugins'

// Services und Utilities
import { initializeApiServices } from '@/services/api/config'
import { initializeTelemetry } from '@/services/analytics/telemetry'
import { useErrorReporting } from '@/utils/errorReportingService'
import { setupNetworkMonitoring } from '@/utils/networkMonitor'
import { CentralAuthManager } from '@/services/auth/CentralAuthManager'

// Styles
import '@/assets/styles/main.scss'
import '@/assets/themes.scss'
import '@/assets/layout-fixes.css'

// Create app
const app = createApp(App)
const pinia: Pinia = createPinia()

// Persist certain stores
pinia.use(piniaPluginPersistedstate)

// App configuration
app.use(pinia)
app.use(router)

// Global plugins
for (const { plugin, options } of globalPlugins) {
  app.use(plugin, options)
}

// Global directives
for (const [name, directive] of Object.entries(globalDirectives)) {
  app.directive(name, directive)
}

// Initialize services
const initApp = async () => {
  try {
    // Initialize stores - must be done after pinia is installed on app
    const authStore = useAuthStore(pinia)
    const uiStore = useUIStore(pinia)
    
    // Initialize theme
    const { initializeTheme } = useTheme()
    initializeTheme()
    
    // Initialize stores using the storeInitializer
    const { initializeStores } = await import('./stores/storeInitializer')
    await initializeStores()
    
    // Initialize API services
    await initializeApiServices()
    
    // Setup central authentication manager
    const authManager = CentralAuthManager.getInstance()
    authManager.setupInterceptors()
    
    // Initialize telemetry
    initializeTelemetry()
    
    // Setup network monitoring
    setupNetworkMonitoring()
    
    // Import debug utilities
    import('./utils/debugAuth')
    import('./utils/tokenDebug')
    
    // Initialize error reporting
    // Temporarily disabled as the service needs fixing
    // const { initializeErrorReporting } = useErrorReporting()
    // initializeErrorReporting()
    
    // Initialize auth state properly
    // Don't clear existing valid tokens
    // NOTE: pinia is already defined above, no need to access from app.config
    
    // Check if we have an existing valid token
    const existingToken = localStorage.getItem('nscale_access_token')
    const existingRefreshToken = localStorage.getItem('nscale_refresh_token')
    const existingUser = localStorage.getItem('nscale_user')
    
    if (existingToken) {
      // If we have a token, restore the store state
      authStore.$state.token = existingToken
      authStore.$state.refreshToken = existingRefreshToken
      
      if (existingUser) {
        try {
          authStore.$state.user = JSON.parse(existingUser)
        } catch (e) {
          console.error('Failed to parse user data:', e)
        }
      }
      
      console.log('Existing auth state loaded from localStorage')
    } else {
      // Only reset if no valid token exists
      authStore.$reset()
      console.log('No existing auth, reset auth state')
    }
    
    // Setup router guards
    router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next) => {
      console.log('Navigation guard - to:', to.path, 'from:', from.path)
      
      // Allow login page access always
      if (to.path === '/login') {
        return next()
      }
      
      // Check if authenticated
      const isAuthenticated = authStore.isAuthenticated && authStore.token
      console.log('Auth check:', isAuthenticated)
      
      // Redirect to login if not authenticated and route requires auth
      if (!isAuthenticated && to.meta.requiresAuth !== false) {
        console.log('Not authenticated, redirecting to login')
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }
      
      // Check admin access if required
      if (to.meta.requiresAdmin && authStore.userRole !== 'admin') {
        console.log('Admin access required but user is not admin')
        return next({ path: '/', query: { unauthorized: 'true' } })
      }
      
      // Allow navigation
      next()
    })
    
    console.log('Digitale Akte Assistent initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    throw error; // Re-throw to handle in mount process
  }
}

// Mount app and then initialize
app.mount('#app')

// Initialize after mounting to ensure DOM is ready
initApp().catch(error => {
  console.error('Critical initialization error:', error)
  // Show error to user in UI if possible
  const root = document.getElementById('app')
  if (root) {
    root.innerHTML = `
      <div class="error-container" style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        color: #dc3545;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1>Initialization Error</h1>
          <p>Failed to initialize the application. Please refresh the page.</p>
          <p style="font-size: 0.875rem; color: #6c757d;">${error.message}</p>
        </div>
      </div>
    `
  }
})