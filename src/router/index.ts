import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import { useErrorReporting } from '@/utils/errorReportingService';
import { useSessionsStore } from '@/stores/sessions';
import { toastService } from '@/services/ui/ToastService';

// Feature-Flag-Mapping für Route-Zugriffskontrolle
const routeFeatureFlags: Record<string, string> = {
  'Chat': 'useSfcChat',
  'Documents': 'useSfcDocConverter',
  'Admin': 'useSfcAdmin',
  'Settings': 'useSfcSettings',
  'Login': 'useSfcLogin'
};

// Routen-Definitionen
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: {
      requiresAuth: true,
      featureFlag: 'useSfcChat',
      title: 'Chat',
      fallbackRoute: '/enhanced-chat'
    }
  },
  {
    path: '/ui-components-demo',
    name: 'UIComponentsDemo',
    component: () => import('@/views/UIComponentsDemoView.vue'),
    meta: {
      requiresAuth: true,
      adminOnly: true,
      title: 'UI Components Demo',
      featureFlag: 'uiComponentsDemo'
    }
  },
  {
    path: '/enhanced-chat',
    name: 'EnhancedChat',
    component: () => import('@/views/EnhancedChatView.vue'),
    meta: {
      requiresAuth: true,
      featureFlag: 'enhancedChatComponents',
      title: 'Enhanced Chat'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      guest: true,
      title: 'Login',
      featureFlag: 'useSfcLogin'
    }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: {
      requiresAuth: true,
      adminOnly: true,
      title: 'Administration',
      featureFlag: 'useSfcAdmin'
    }
  },
  {
    path: '/documents',
    name: 'Documents',
    component: () => import('@/views/DocumentsView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Dokumentenkonverter',
      featureFlag: 'useSfcDocConverter'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Einstellungen',
      featureFlag: 'useSfcSettings'
    }
  },
  {
    path: '/session/:id',
    name: 'Session',
    component: () => import('@/views/ChatView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Chat Session',
      featureFlag: 'useSfcChat'
    }
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/views/ErrorView.vue'),
    meta: {
      title: 'Fehler'
    },
    props: (route) => ({
      errorCode: route.query.code || '500',
      errorMessage: route.query.message || 'Ein unbekannter Fehler ist aufgetreten.'
    })
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Seite nicht gefunden'
    }
  }
];

// Router-Instanz erstellen
const router = createRouter({
  history: createWebHistory(),
  routes,
  // Scroll-Verhalten definieren
  scrollBehavior(to, from, savedPosition) {
    // Wenn ein gespeicherter Scrollpunkt existiert, dorthin scrollen
    if (savedPosition) {
      return savedPosition;
    }

    // Bei Routenwechsel zum Anfang der Seite scrollen
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    } else {
      return { top: 0, behavior: 'smooth' };
    }
  }
});

/**
 * Prüft Authentifizierung und Berechtigungen
 */
const checkAuth = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Stores abrufen
  const authStore = useAuthStore();

  try {
    // Prüfe, ob Route Authentifizierung erfordert
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      // Token-Validität prüfen (falls Token vorhanden)
      if (authStore.token) {
        const isValid = await authStore.validateCurrentToken();
        if (!isValid) {
          // Wenn Token ungültig, zum Login umleiten
          return next({
            path: '/login',
            query: {
              redirect: to.fullPath,
              error: 'session_expired'
            }
          });
        }
      } else {
        // Wenn kein Token vorhanden, zum Login umleiten
        return next({
          path: '/login',
          query: { redirect: to.fullPath }
        });
      }
    }

    // Prüfe, ob Route Admin-Rechte erfordert
    if (to.meta.adminOnly && !authStore.isAdmin) {
      toastService.error('Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.');
      return next({ path: '/' });
    }

    // Prüfe, ob Route nur für Gäste ist (z.B. Login)
    if (to.meta.guest && authStore.isAuthenticated) {
      return next({ path: '/' });
    }

    // Prüfen auf Session-ID-Parameter für Chat-Ansichten
    if (to.params.id && to.name === 'Session') {
      const sessionsStore = useSessionsStore();
      const sessionId = to.params.id as string;

      // Prüfen, ob Session existiert
      const sessionExists = sessionsStore.sessions.some(s => s.id === sessionId);
      if (!sessionExists) {
        // Wenn Session nicht existiert, zur Hauptseite umleiten
        toastService.warning('Die angeforderte Konversation existiert nicht oder wurde gelöscht.');
        return next({ path: '/' });
      }

      // Aktuelle Session setzen
      await sessionsStore.setCurrentSession(sessionId);
    }

    // Navigation erlauben
    return next();
  } catch (error) {
    // Fehler loggen
    const errorReporting = useErrorReporting();
    errorReporting.captureError(error, {
      severity: 'medium',
      source: {
        type: 'system',
        name: 'Router Guard'
      },
      context: {
        from: from.path,
        to: to.path
      }
    });

    // Zur Fehlerseite umleiten
    return next({
      path: '/error',
      query: {
        code: '500',
        message: 'Ein Fehler ist bei der Navigation aufgetreten.'
      }
    });
  }
};

/**
 * Prüft Feature-Flags für Routen
 */
const checkFeatureFlags = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Feature-Flag-Store abrufen
  const featureToggles = useFeatureTogglesStore();

  try {
    // Feature-Flag aus Route oder Mapping holen
    const featureFlag = to.meta.featureFlag as string || routeFeatureFlags[to.name as string];

    // Wenn kein Feature-Flag definiert ist oder es aktiv ist, weitermachen
    if (!featureFlag || featureToggles.isEnabled(featureFlag)) {
      return next();
    }

    // Ansonsten zur Fallback-Route oder Fehlerseite umleiten
    const fallbackRoute = to.meta.fallbackRoute as string || '/error';

    if (fallbackRoute === '/error') {
      return next({
        path: fallbackRoute,
        query: {
          code: 'feature_disabled',
          message: `Das Feature "${featureFlag}" ist derzeit deaktiviert.`
        }
      });
    }

    // Zur Fallback-Route umleiten
    return next({ path: fallbackRoute });
  } catch (error) {
    // Bei Fehler zur Hauptseite oder Fehlerseite umleiten
    const errorReporting = useErrorReporting();
    errorReporting.captureError(error, {
      severity: 'medium',
      source: {
        type: 'system',
        name: 'Feature Flag Router Guard'
      }
    });

    return next({ path: '/error' });
  }
};

/**
 * Setzt den Dokumenttitel basierend auf Route-Metadaten
 */
const setDocumentTitle = (to: RouteLocationNormalized) => {
  // Basis-Titel der Anwendung
  const baseTitle = 'nscale DMS Assistent';

  // Titel aus Route-Metadaten oder Fallback
  const pageTitle = to.meta.title ? `${to.meta.title} | ${baseTitle}` : baseTitle;

  // Dokumenttitel setzen
  document.title = pageTitle;

  // Auch als Meta-Tag setzen
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', `${pageTitle} - Digitaler Assistent für nscale DMS`);
  }
};

/**
 * Erfasst Navigation für Analytics
 */
const trackNavigation = (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
  try {
    // Wenn Produktionsumgebung und Analytics-Funktion verfügbar
    if (import.meta.env.PROD && window.trackPageView) {
      window.trackPageView({
        path: to.path,
        name: to.name as string,
        from: from.path,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error tracking navigation:', error);
  }
};

// Navigation Guards registrieren
router.beforeEach(checkAuth);
router.beforeEach(checkFeatureFlags);
router.afterEach((to, from) => {
  setDocumentTitle(to);
  trackNavigation(to, from);
});

// Fehlerbehandlung bei Routing-Fehlern
router.onError((error) => {
  console.error('Router error:', error);

  const errorReporting = useErrorReporting();
  errorReporting.captureError(error, {
    severity: 'high',
    source: {
      type: 'system',
      name: 'Router Error'
    }
  });

  // Zur Fehlerseite umleiten
  router.push({
    path: '/error',
    query: {
      code: 'router_error',
      message: 'Fehler beim Laden der Seite. Bitte versuchen Sie es erneut.'
    }
  });
});

export default router;