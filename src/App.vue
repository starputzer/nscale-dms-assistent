<template>
  <div class="app-container" :class="themeClass">
    <ErrorBoundary
      featureFlag="app"
      :minSeverity="'medium'"
      :maxRetries="3"
      :fallbackStrategy="'threshold'"
      @error="handleError"
      @fallback="handleFallback"
    >
      <template #fallback="{ error, resetFallback }">
        <div class="app-fallback">
          <div class="app-fallback__content">
            <h1 class="app-fallback__title">{{ t('app.error.title') }}</h1>
            <p class="app-fallback__message">{{ t('app.error.message') }}</p>
            <p v-if="error" class="app-fallback__details">{{ error?.message }}</p>
            <button @click="resetFallback" class="nscale-btn-primary app-fallback__button">
              {{ t('app.error.retry') }}
            </button>
          </div>
        </div>
      </template>

      <template v-if="authStore.isAuthenticated">
        <MainLayout
          :showSidebar="true"
          :showHeader="true"
          :showFooter="true"
          :sidebarItems="navigationItems"
          :sidebarCollapsed="uiStore.sidebarIsCollapsed"
          @update:sidebarCollapsed="uiStore.setSidebarIsCollapsed"
          @sidebar-item-select="handleNavigationSelect"
        >
          <template #header>
            <Header
              :user="headerUser"
              @logout="handleLogout"
            />
          </template>

          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <KeepAlive>
                <ErrorBoundary
                  :key="$route.path"
                  :featureFlag="getFeatureFlagFromRoute($route.name?.toString())"
                  @error="handleViewError"
                >
                  <component :is="Component" />

                  <template #error="{ error, retry }">
                    <div class="view-error">
                      <h3 class="view-error__title">{{ t('app.viewError.title') }}</h3>
                      <p class="view-error__message">{{ error?.message }}</p>
                      <div class="view-error__actions">
                        <button
                          @click="retry"
                          class="nscale-btn-primary view-error__retry"
                        >
                          {{ t('app.viewError.retry') }}
                        </button>
                        <button
                          @click="handleNavigateHome"
                          class="nscale-btn-secondary"
                        >
                          {{ t('app.viewError.home') }}
                        </button>
                      </div>
                    </div>
                  </template>
                </ErrorBoundary>
              </KeepAlive>
            </transition>
          </router-view>

          <template #footer>
            <div class="app-footer">
              <p>© {{ currentYear }} nscale DMS Assistent</p>
              <div class="app-footer__links">
                <a href="#" @click.prevent="openSettings">{{ t('app.footer.settings') }}</a>
                <a href="#" @click.prevent="toggleTheme">{{ t('app.footer.theme') }}</a>
                <a href="#" @click.prevent="showAbout">{{ t('app.footer.about') }}</a>
              </div>
            </div>
          </template>
        </MainLayout>
      </template>

      <template v-else>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <ErrorBoundary
              :key="$route.path"
              :featureFlag="getFeatureFlagFromRoute($route.name?.toString())"
              @error="handleViewError"
            >
              <component :is="Component" />

              <template #error="{ error, retry }">
                <div class="view-error">
                  <h3 class="view-error__title">{{ t('app.viewError.title') }}</h3>
                  <p class="view-error__message">{{ error?.message }}</p>
                  <div class="view-error__actions">
                    <button
                      @click="retry"
                      class="nscale-btn-primary view-error__retry"
                    >
                      {{ t('app.viewError.retry') }}
                    </button>
                  </div>
                </div>
              </template>
            </ErrorBoundary>
          </transition>
        </router-view>
      </template>
    </ErrorBoundary>

    <!-- UI Components -->
    <Toast />
    <DialogProvider />

    <!-- Offline Status Banner -->
    <div v-if="isOffline" class="offline-banner">
      {{ t('app.offline.message') }}
      <button @click="checkConnection" class="offline-banner__retry">
        {{ t('app.offline.retry') }}
      </button>
    </div>

    <!-- Loading Overlay für App Initialisierung -->
    <div v-if="!storeInitializationComplete" class="app-initialization-overlay">
      <div class="app-initialization-content">
        <div class="app-initialization-spinner"></div>
        <p>{{ t('app.initializing') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide, watch, onBeforeUnmount } from 'vue';
import { useRouter, useRoute, RouteRecordName } from 'vue-router';
// If you're having issues with vue-i18n, you can implement a temporary solution:
// Uncomment this if vue-i18n is not installed
/*
const useI18n = () => ({
  t: (key: string) => key // Simple fallback that returns the key
});
*/
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useSessionsStore } from '@/stores/sessions';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import { useErrorReporting } from '@/utils/errorReportingService';
import { useFallbackManager } from '@/utils/fallbackManager';
import { useTheme } from '@/composables/useTheme';
import { isInitialized, storeStatus } from '@/stores/storeInitializer';
import type { ErrorSeverity, ErrorCategory } from '@/components/shared/ErrorBoundary.vue';
import type { SidebarItem } from '@/components/layout/MainLayout.vue';

// Import von Komponenten
import MainLayout from '@/components/layout/MainLayout.vue';
import Header from '@/components/layout/Header.vue';
import Toast from '@/components/ui/Toast.vue';
import DialogProvider from '@/components/dialog/DialogProvider.vue';
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue';

// Define interfaces for header user
interface HeaderUser {
  name?: string;
  avatar?: string;
  email?: string;
}

// i18n
const { t } = useI18n();

// Stores
const authStore = useAuthStore();
const uiStore = useUIStore();
const sessionsStore = useSessionsStore();
const featureToggles = useFeatureTogglesStore();
const router = useRouter();
const route = useRoute();

// Services
const errorReporting = useErrorReporting();
const fallbackManager = useFallbackManager();

// Status-Variablen
const isOffline = ref(false);
const initializationComplete = ref(false);
const storeInitializationComplete = computed(() => isInitialized.value);

// Theme-Informationen
const {
  currentTheme,
  isDarkTheme,
  isLightTheme,
  isContrastTheme,
  setTheme
} = useTheme();

// Convert authStore.user to HeaderUser format
const headerUser = computed<HeaderUser | undefined>(() => {
  if (!authStore.user) return undefined;
  
  return {
    name: authStore.user.displayName || authStore.user.email,
    email: authStore.user.email,
    avatar: undefined // Add avatar property if it exists in your user object
  };
});

// Abgeleitete Werte
const themeClass = computed(() => {
  return {
    'theme-dark': isDarkTheme.value,
    'theme-light': isLightTheme.value,
    'theme-contrast': isContrastTheme.value
  };
});

const currentYear = computed(() => new Date().getFullYear());

// Navigation-Items
const navigationItems = computed<SidebarItem[]>(() => {
  const items: SidebarItem[] = [
    {
      id: 'chat',
      label: t('navigation.chat'),
      icon: 'chat',
      route: '/',
      active: route.name === 'Chat'
    },
    {
      id: 'documents',
      label: t('navigation.documents'),
      icon: 'document',
      route: '/documents',
      active: route.name === 'Documents'
    }
  ];

  // Admin-Bereich nur für Administratoren anzeigen
  if (authStore.isAdmin) {
    items.push({
      id: 'admin',
      label: t('navigation.admin'),
      icon: 'admin',
      route: '/admin',
      active: route.name === 'Admin'
    });
  }

  // Einstellungen für alle anzeigen
  items.push({
    id: 'settings',
    label: t('navigation.settings'),
    icon: 'settings',
    route: '/settings',
    active: route.name === 'Settings'
  });

  return items;
});

// Mapping von Routen zu Feature-Flags
const routeFeatureFlagMap: Record<string, string> = {
  'Chat': 'useSfcChat',
  'Documents': 'useSfcDocConverter',
  'Admin': 'useSfcAdmin',
  'Settings': 'useSfcSettings',
  'Login': 'useSfcLogin'
};

// Event-Handler
/**
 * Behandelt Navigationsauswahl aus der Sidebar
 */
function handleNavigationSelect(id: string) {
  const item = navigationItems.value.find(item => item.id === id);
  if (item && item.route) {
    router.push(item.route);
  }
}

/**
 * Behandelt den Logout-Vorgang
 */
async function handleLogout() {
  try {
    await authStore.logout();
    router.push('/login');
    uiStore.showSuccess(t('auth.logout.success'));
  } catch (error) {
    uiStore.showError(t('auth.logout.error'));
    errorReporting.captureError(error as Error, {
      severity: 'medium',
      source: {
        type: 'component',
        name: 'App'
      },
      feature: 'auth'
    });
  }
}

/**
 * Behandelt allgemeine App-Fehler
 */
function handleError(error: any) {
  console.error('App Error:', error);

  errorReporting.captureError(error.originalError as Error, {
    severity: error.severity as ErrorSeverity,
    source: {
      type: 'component',
      name: error.component || 'App'
    },
    feature: 'app'
  });

  // Fehler dem Benutzer anzeigen
  uiStore.showError(error.message, {
    duration: 8000,
    closable: true
  });
}

/**
 * Behandelt Fallback-Aktivierung
 */
function handleFallback(error: any) {
  console.error('App Fallback activated:', error);

  // Globalen Fallback aktivieren
  featureToggles.setFallbackMode('app', true);

  // Kritischen Fehler anzeigen
  uiStore.showError(t('app.criticalError'), {
    duration: 0,
    closable: true,
    actions: [{
      label: t('app.reload'),
      onClick: () => window.location.reload()
    }]
  });
}

/**
 * Behandelt Fehler in View-Komponenten
 */
function handleViewError(error: any) {
  console.error('View Error:', error);

  const routeName = route.name as string;
  const featureFlag = getFeatureFlagFromRoute(routeName);

  errorReporting.captureError(error.originalError as Error, {
    severity: error.severity as ErrorSeverity,
    source: {
      type: 'component',
      name: error.component || routeName
    },
    feature: featureFlag
  });

  // Fehler dem Benutzer anzeigen
  uiStore.showError(`${t('app.viewError.prefix')} ${error.message}`, {
    duration: 8000,
    closable: true
  });
}

/**
 * Ermittelt das Feature-Flag für eine Route
 */
function getFeatureFlagFromRoute(routeName: string | null | undefined): string {
  if (!routeName) return 'app';
  return routeFeatureFlagMap[routeName] || 'app';
}

/**
 * Navigiert zur Startseite
 */
function handleNavigateHome() {
  router.push('/');
}

/**
 * Prüft die Verbindung zum Server
 */
async function checkConnection() {
  try {
    const response = await fetch('/api/health');
    isOffline.value = !response.ok;
  } catch (error) {
    isOffline.value = true;
  }
}

/**
 * Öffnet die Einstellungen
 */
function openSettings() {
  router.push('/settings');
}

/**
 * Wechselt das Theme
 */
function toggleTheme() {
  if (isDarkTheme.value) {
    setTheme('light');
  } else {
    setTheme('dark');
  }
}

/**
 * Zeigt Informationen über die Anwendung
 */
function showAbout() {
  // Check if the showDialog method exists on uiStore
  if ('showDialog' in uiStore) {
    (uiStore as any).showDialog({
      title: t('app.about.title'),
      content: t('app.about.content'),
      confirmText: t('common.ok'),
      type: 'info'
    });
  } else {
    // Fallback if showDialog doesn't exist
    uiStore.showInfo(t('app.about.title') + ': ' + t('app.about.content'));
  }
}

// Netzwerkstatus überwachen
function handleOnline() {
  isOffline.value = false;
  if (initializationComplete.value) {
    uiStore.showSuccess(t('app.online.message'));

    // Verbindung wiederherstellen
    initializeDataAfterReconnect();
  }
}

function handleOffline() {
  isOffline.value = true;
  if (initializationComplete.value) {
    uiStore.showWarning(t('app.offline.message'), {
      duration: 0,
      closable: true
    });
  }
}

/**
 * Initialisiert Daten nach einer Wiederverbindung
 */
async function initializeDataAfterReconnect() {
  try {
    // Prüfen, ob der Benutzer noch angemeldet ist
    if (authStore.isAuthenticated) {
      await authStore.refreshUserInfo();

      // Sessions synchronisieren
      await sessionsStore.synchronizeSessions();

      // Feature-Flags aktualisieren
      await featureToggles.refreshFeatures();
    }
  } catch (error) {
    console.error('Error reconnecting:', error);
  }
}

/**
 * Initialisiert die Anwendung beim Start
 */
async function initializeApp() {
  try {
    // Router-Route prüfen und ggf. umleiten basierend auf Authentifizierung
    const currentRoute = router.currentRoute.value;

    if (authStore.isAuthenticated) {
      if (currentRoute.meta.guest) {
        // Wenn bereits angemeldet und auf Guest-Route, zur Hauptseite umleiten
        router.push('/');
      } else if (currentRoute.meta.requiresAuth) {
        // Prüfen, ob Admin-Bereich zugänglich ist
        if (currentRoute.meta.adminOnly && !authStore.isAdmin) {
          router.push('/');
        }
      }
    } else if (currentRoute.meta.requiresAuth) {
      // Wenn nicht angemeldet und Route erfordert Authentifizierung, zum Login umleiten
      router.push('/login');
    }

    // Initialisierung abgeschlossen
    initializationComplete.value = true;
  } catch (error) {
    console.error('Error initializing app:', error);

    errorReporting.captureError(error as Error, {
      severity: 'high',
      source: {
        type: 'system',
        name: 'App Initialization'
      },
      feature: 'app'
    });

    // Kritischen Fehler anzeigen
    uiStore.showError(t('app.initError'), {
      duration: 0,
      closable: true,
      actions: [{
        label: t('app.reload'),
        onClick: () => window.location.reload()
      }]
    });
  }
}

// Provide-Funktionen für Komponentenhierarchie
// Stelle UI-Context zur Verfügung, um Prop-Drilling zu vermeiden
provide('uiStore', uiStore);

// Provide theme information to all components
provide('isDarkTheme', isDarkTheme);
provide('isContrastTheme', isContrastTheme);
provide('isLightTheme', isLightTheme);
provide('currentTheme', currentTheme);
provide('setTheme', setTheme);

// Error-Reporting-Context zur Verfügung stellen
provide('errorReporting', errorReporting);

// Fallback-Manager zur Verfügung stellen
provide('fallbackManager', fallbackManager);

// Lifecycle-Hooks
onMounted(() => {
  // Event-Listener für Online/Offline-Status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Anfänglichen Netzwerkstatus prüfen
  isOffline.value = !navigator.onLine;

  // API-Fehler abfangen
  window.addEventListener('api:error', (event: CustomEvent) => {
    const detail = event.detail;

    errorReporting.captureApiError(
      detail.url || 'unknown',
      detail.message,
      {
        severity: 'medium',
        context: detail
      }
    );

    // Fehler anzeigen, wenn nicht schon durch den ApiService geschehen
    if (!detail.handled) {
      uiStore.showError(detail.message);
    }
  });

  // App initialisieren
  initializeApp();
});

onBeforeUnmount(() => {
  // Event-Listener entfernen
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  window.removeEventListener('api:error', () => {});
});

// Route-Änderungen überwachen
watch(() => route.path, () => {
  // Feature-Flag aus der Route ermitteln
  const featureFlag = getFeatureFlagFromRoute(route.name as string);

  // Prüfen, ob Feature aktiviert ist
  if (featureFlag && !featureToggles.isEnabled(featureFlag)) {
    // Fallback-Verhalten basierend auf Feature-Flag
    const fallbackRoute = featureToggles.getFeatureFallbackRoute(featureFlag);

    if (fallbackRoute) {
      router.push(fallbackRoute);

      uiStore.showWarning(t('app.feature.disabled'), {
        duration: 5000
      });
    }
  }
});
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  font-family: var(--nscale-font-family-base);
  height: 100%;
  width: 100%;
}

.app-container {
  color: var(--nscale-foreground);
  background-color: var(--nscale-background);
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Fallback styles */
.app-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: var(--nscale-background);
}

.app-fallback__content {
  max-width: 500px;
  padding: 2rem;
  text-align: center;
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-lg);
  box-shadow: var(--nscale-shadow-lg);
}

.app-fallback__title {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: var(--nscale-text-color);
}

.app-fallback__message {
  margin-bottom: 1.5rem;
  color: var(--nscale-text-color-secondary);
}

.app-fallback__details {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--nscale-background);
  border-radius: var(--nscale-border-radius-md);
  font-family: monospace;
  word-break: break-word;
  color: var(--nscale-error);
  text-align: left;
}

.app-fallback__button {
  padding: 0.75rem 1.5rem;
}

/* View error styles */
.view-error {
  padding: 2rem;
  max-width: 800px;
  margin: 2rem auto;
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-lg);
  box-shadow: var(--nscale-shadow-md);
  text-align: center;
}

.view-error__title {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: var(--nscale-text-color);
}

.view-error__message {
  margin-bottom: 1.5rem;
  color: var(--nscale-text-color-secondary);
}

.view-error__actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Offline banner */
.offline-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background-color: var(--nscale-warning-light);
  color: var(--nscale-warning-dark);
  text-align: center;
  font-weight: 500;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.offline-banner__retry {
  margin-left: 1rem;
  padding: 0.25rem 0.75rem;
  background-color: var(--nscale-warning);
  color: white;
  border: none;
  border-radius: var(--nscale-border-radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
}

/* Footer styles */
.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  width: 100%;
  font-size: 0.875rem;
  color: var(--nscale-text-color-secondary);
}

.app-footer__links {
  display: flex;
  gap: 1rem;
}

.app-footer__links a {
  color: var(--nscale-primary);
  text-decoration: none;
}

.app-footer__links a:hover {
  text-decoration: underline;
}

/* Base UI classes updated with new design system */
.nscale-btn-primary {
  background-color: var(--nscale-btn-primary-bg);
  color: var(--nscale-btn-primary-text);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-2) var(--nscale-space-4);
  border: 1px solid var(--nscale-btn-primary-border);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick) ease;
}

.nscale-btn-primary:hover {
  background-color: var(--nscale-btn-primary-hover-bg);
}

.nscale-btn-secondary {
  background-color: var(--nscale-btn-secondary-bg);
  color: var(--nscale-btn-secondary-text);
  border: 1px solid var(--nscale-btn-secondary-border);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-2) var(--nscale-space-4);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick) ease;
}

.nscale-btn-secondary:hover {
  background-color: var(--nscale-btn-secondary-hover-bg);
}

.nscale-input {
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-3) var(--nscale-space-4);
  font-size: var(--nscale-font-size-sm);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
  width: 100%;
}

.nscale-input:focus {
  outline: none;
  border-color: var(--nscale-input-focus-border);
  box-shadow: 0 0 0 2px var(--nscale-focus-ring);
}

.nscale-card {
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-lg);
  box-shadow: var(--nscale-shadow-md);
  border: 1px solid var(--nscale-card-border);
}

/* Utility classes updated with design system spacing variables */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.justify-center { justify-content: center; }
.items-center { align-items: center; }
.space-x-2 > * + * { margin-left: var(--nscale-space-2); }
.space-y-4 > * + * { margin-top: var(--nscale-space-4); }
.w-full { width: 100%; }
.max-w-md { max-width: 28rem; }
.p-4 { padding: var(--nscale-space-4); }
.p-8 { padding: var(--nscale-space-8); }
.py-2 { padding-top: var(--nscale-space-2); padding-bottom: var(--nscale-space-2); }
.px-4 { padding-left: var(--nscale-space-4); padding-right: var(--nscale-space-4); }
.mb-6 { margin-bottom: var(--nscale-space-6); }
.text-center { text-align: center; }
.text-lg { font-size: var(--nscale-font-size-lg); }
.font-medium { font-weight: var(--nscale-font-weight-medium); }
.border-b { border-bottom: 1px solid var(--nscale-border); }

/* App Initialization Overlay */
.app-initialization-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(4px);
}

.app-initialization-content {
  background-color: var(--nscale-card-bg);
  padding: 2rem;
  border-radius: var(--nscale-border-radius-lg);
  box-shadow: var(--nscale-shadow-lg);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.app-initialization-spinner {
  display: inline-block;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.5rem;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--nscale-primary);
  animation: spin 1s infinite linear;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>