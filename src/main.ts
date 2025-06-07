/**
 * Digitale Akte Assistent - Haupteinstiegspunkt
 * Verwendet die redesigned App-Komponente mit dynamischen Layouts
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import type { Pinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { RouteLocationNormalized } from "vue-router";

// App-Komponente mit dynamischen Layouts
import App from "./App.vue";

// Router
import router from "./router";

// Stores
import { useAuthStore } from "./stores/auth";
<<<<<<< HEAD
// import { useUIStore } from "./stores/ui"; // Unused import
=======
import { useUIStore } from "./stores/ui";
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
import { useTheme } from "./composables/useTheme";

// Direktiven und Composables
import { globalDirectives } from "@/directives";
import { globalPlugins } from "@/plugins";

// Services und Utilities
import { initializeApiServices } from "@/services/api/config";
import { initializeTelemetry } from "@/services/analytics/telemetry";
<<<<<<< HEAD
import { fixAxiosBaseURL } from "@/utils/fixAxiosBaseURL";
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

import { performanceMonitor } from "@/utils/performanceMonitor";

// Debug utilities (only in development)

import { setupNetworkMonitoring } from "@/utils/networkMonitor";
import { CentralAuthManager } from "@/services/auth/CentralAuthManager";

// Import i18n instance
// Import i18n instance and log initialization
import i18n from "@/i18n";
console.log(`[Main] Initializing app with i18n locale: ${i18n.global.locale}`);

// Styles
import "@/assets/styles/main.scss";
import "@/assets/themes.scss";
import "@/assets/layout-fixes.css";
import "@/assets/styles/base-components.css"; // Base components styling
import "@/assets/styles/admin-modern.css"; // Moderne Admin-Panel-Verbesserungen

// Create app
const app = createApp(App);
const pinia: Pinia = createPinia();

// Persist certain stores
pinia.use(piniaPluginPersistedstate);

// App configuration
app.use(pinia);
app.use(router);

// Register i18n with enhanced debugging
app.use(i18n);

// Make sure we're explicitly in composition mode
if (i18n.mode === 'composition') {
  console.log(`[Main] i18n registered with app in composition mode - this is correct`);
} else {
  console.error(`[Main] i18n NOT in composition mode - expected composition mode`);
}

// Debug i18n configuration for diagnostics
console.log(`[Main] i18n config:`, {
  mode: i18n.mode,
  global: !!i18n.global,
  globalInjection: (i18n.global as any).allowComposition === true ? 'enabled' : 'not enabled'
});

// Log current locale setup
console.log(`[Main] Current locale:`, typeof i18n.global.locale === 'object' ? i18n.global.locale.value : i18n.global.locale);

// Test translations directly using global i18n
const adminDocConverterTitle = i18n.global.t('admin.docConverter.title');
const adminCommonRefresh = i18n.global.t('admin.common.refresh');
const adminTitle = i18n.global.t('admin.title');
const adminTabsDocConverter = i18n.global.t('admin.tabs.docConverter');

console.log(`[Main] Testing global translations:`, {
  'admin.title': adminTitle,
  'admin.docConverter.title': adminDocConverterTitle,
  'admin.common.refresh': adminCommonRefresh,
  'admin.tabs.docConverter': adminTabsDocConverter
});

// Ensure translations are loaded by forcing a re-merge
const deMessages = i18n.global.getLocaleMessage('de');
const enMessages = i18n.global.getLocaleMessage('en');

// Clear and reload messages to ensure clean state
<<<<<<< HEAD
i18n.global.setLocaleMessage('de' as any, {} as any);
i18n.global.setLocaleMessage('en' as any, {} as any);
=======
i18n.global.setLocaleMessage('de', {});
i18n.global.setLocaleMessage('en', {});
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
i18n.global.setLocaleMessage('de', deMessages);
i18n.global.setLocaleMessage('en', enMessages);

console.log('[Main] Translations have been reloaded');

// Global plugins
for (const { plugin, options } of globalPlugins) {
  app.use(plugin, options);
}

// Global directives
for (const [name, directive] of Object.entries(globalDirectives)) {
  app.directive(name, directive);
}

// Initialize services
const initApp = async () => {
  try {
    // Initialize stores - must be done after pinia is installed on app
    const authStore = useAuthStore();

    // Initialize theme
    const { initializeTheme } = useTheme();
    initializeTheme();

    // Initialize stores using the storeInitializer
    const { initializeStores } = await import("./stores/storeInitializer");
    await initializeStores();

<<<<<<< HEAD
    // Fix axios base URL before initializing services
    fixAxiosBaseURL();

=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    // Initialize API services
    await initializeApiServices();

    // Setup central authentication manager
    const authManager = CentralAuthManager.getInstance();
    authManager.setupInterceptors();

    // Initialize telemetry
    initializeTelemetry();
    
    // Track app initialization performance
    performanceMonitor.track('app.initialization', performance.now());

    // Setup network monitoring
    setupNetworkMonitoring();

    // Import debug utilities
    import("./utils/debugAuth");
    import("./utils/tokenDebug");

    // Initialize error reporting
    // Temporarily disabled as the service needs fixing
    // const { initializeErrorReporting } = useErrorReporting()
    // initializeErrorReporting()

    // Initialize auth state properly
    // Don't clear existing valid tokens
    // NOTE: pinia is already defined above, no need to access from app.config

    // Check if we have an existing valid token
    const existingToken = localStorage.getItem("nscale_access_token");
    const existingRefreshToken = localStorage.getItem("nscale_refresh_token");
    const existingUser = localStorage.getItem("nscale_user");

    if (existingToken) {
      // If we have a token, restore the store state
      authStore.$state.token = existingToken;
      authStore.$state.refreshToken = existingRefreshToken;

      if (existingUser) {
        try {
          authStore.$state.user = JSON.parse(existingUser);
        } catch (e) {
          console.error("Failed to parse user data:", e);
        }
      }

      console.log("Existing auth state loaded from localStorage");
    } else {
      // Only reset if no valid token exists
      authStore.$reset();
      console.log("No existing auth, reset auth state");
    }

    // Setup router guards
    router.beforeEach(
      async (
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next,
      ) => {
        console.log("Navigation guard - to:", to.path, "from:", from.path);

        // Allow login page access always
        if (to.path === "/login") {
          return next();
        }

        // Check if authenticated
        const isAuthenticated = authStore.isAuthenticated && authStore.token;
        console.log("Auth check:", isAuthenticated);

        // Redirect to login if not authenticated and route requires auth
        if (!isAuthenticated && to.meta.requiresAuth !== false) {
          console.log("Not authenticated, redirecting to login");
          return next({ path: "/login", query: { redirect: to.fullPath } });
        }

        // Check admin access if required
        if (to.meta.requiresAdmin && authStore.userRole !== "admin") {
          console.log("Admin access required but user is not admin");
          return next({ path: "/", query: { unauthorized: "true" } });
        }

        // Allow navigation
        next();
      },
    );

    console.log("Digitale Akte Assistent initialized successfully");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    throw error; // Re-throw to handle in mount process
  }
};

// Initialize app before mounting
initApp().then(() => {
  // Mount app after initialization is complete
  app.mount("#app");
  console.log("App mounted successfully");
}).catch((error) => {
  console.error("Critical initialization error:", error);
  // Show error to user in UI if possible
  const root = document.getElementById("app");
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
    `;
  }
});
