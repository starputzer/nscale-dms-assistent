/**
 * Router Guards Plugin
 * 
 * Initialisiert Router Guards für sichere Navigation und 404-Fehlerbehandlung
 */

import { Router, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { routerService } from '@/services/router/RouterServiceFixed';
import { useLogger } from '@/composables/useLogger';
import { useAuthStore } from '@/stores/auth';
import { useFeatureTogglesStore } from '@/stores/featureToggles';

export interface RouterGuardOptions {
  enableLogging?: boolean;
  enableFeatureChecks?: boolean;
  enableAuthChecks?: boolean;
  problematicRoutes?: string[];
}

/**
 * Installiert Router Guards
 */
export function installRouterGuards(router: Router, options: RouterGuardOptions = {}) {
  const {
    enableLogging = true,
    enableFeatureChecks = true,
    enableAuthChecks = true,
    problematicRoutes = ['/chat/:id', '/session/:id']
  } = options;

  const logger = useLogger();

  /**
   * Guard: Router Initialization Check
   * Stellt sicher, dass der Router vollständig initialisiert ist
   */
  router.beforeEach(async (to, from, next) => {
    if (enableLogging) {
      logger.debug(`Navigation: ${from.path} -> ${to.path}`);
    }

    // Prüfe Router-Initialisierung
    const routerState = routerService.getState();
    
    if (!routerState.isInitialized) {
      logger.warn('Router noch nicht initialisiert, warte...');
      
      // Versuche Router zu initialisieren
      const initialized = await routerService.initialize(router);
      
      if (!initialized) {
        logger.error('Router-Initialisierung fehlgeschlagen');
        return next('/error?code=router_init_failed');
      }
    }

    // Prüfe auf bereits navigierende Anfragen
    if (routerState.isNavigating && to.path !== from.path) {
      logger.warn('Navigation bereits im Gange, warte...');
      
      // Warte kurz und versuche erneut
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    next();
  });

  /**
   * Guard: Route Validation
   * Validiert Routen vor der Navigation
   */
  router.beforeEach(async (to, from, next) => {
    // Spezielle Behandlung für problematische Routen
    if (isProblematicRoute(to.path, problematicRoutes)) {
      logger.info(`Problematische Route erkannt: ${to.path}`);
      
      // Validiere Route-Parameter
      if (to.path.startsWith('/chat/') || to.path.startsWith('/session/')) {
        const id = to.params.id as string;
        
        if (!isValidSessionId(id)) {
          logger.warn(`Ungültige Session-ID: ${id}`);
          return next('/error?code=invalid_session_id');
        }
      }
    }

    next();
  });

  /**
   * Guard: Feature Toggle Check
   * Prüft Feature-Flags für Routen
   */
  if (enableFeatureChecks) {
    router.beforeEach((to, from, next) => {
      // Skip für kritische Routen
      if (isCriticalRoute(to.path)) {
        return next();
      }

      const featureToggles = useFeatureTogglesStore();
      const featureFlag = to.meta.featureFlag as string;

      if (featureFlag && !featureToggles.isEnabled(featureFlag)) {
        logger.warn(`Feature ${featureFlag} ist deaktiviert`);
        return next('/');
      }

      next();
    });
  }

  /**
   * Guard: Authentication Check
   * Prüft Authentifizierung für geschützte Routen
   */
  if (enableAuthChecks) {
    router.beforeEach(async (to, from, next) => {
      // Skip für öffentliche Routen
      if (to.meta.guest || to.path === '/login' || to.path === '/error') {
        return next();
      }

      const authStore = useAuthStore();

      if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        logger.info('Authentifizierung erforderlich');
        return next({
          path: '/login',
          query: { redirect: to.fullPath }
        });
      }

      if (to.meta.adminOnly && !authStore.isAdmin) {
        logger.warn('Admin-Rechte erforderlich');
        return next('/error?code=unauthorized');
      }

      next();
    });
  }

  /**
   * Guard: Error Recovery
   * Erkennt und behandelt Navigationsfehler
   */
  router.afterEach((to, from, failure) => {
    if (failure) {
      // Spezielle Behandlung für bestimmte Fehlertypen
      if (failure.type === 32 /* isNavigationFailure(failure, NavigationFailureType.duplicated) */) {
        // Ignoriere duplizierte Navigationen - das ist kein Fehler
        if (enableLogging) {
          logger.debug('Duplizierte Navigation ignoriert:', failure.message);
        }
        return;
      }

      // Nur echte Fehler loggen und behandeln
      logger.error('Navigation fehlgeschlagen', failure);

      // Navigiere zur Fehlerseite
      router.push({
        path: '/error',
        query: {
          code: 'navigation_failed',
          from: from.path,
          to: to.path,
          message: failure.message
        }
      }).catch(err => {
        logger.error('Fehler beim Navigieren zur Fehlerseite', err);
        // Als letztes Mittel: Hard Reload
        window.location.href = '/error';
      });
    }
  });

  /**
   * Guard: Route Logging
   * Protokolliert erfolgreiche Navigationen
   */
  router.afterEach((to, from) => {
    if (enableLogging) {
      logger.info(`Navigation erfolgreich: ${from.path} -> ${to.path}`);
    }

    // Speichere erfolgreiche Route
    if (to.path !== '/error' && !to.path.includes('404')) {
      localStorage.setItem('lastSuccessfulRoute', to.path);
    }
  });

  /**
   * Global Error Handler
   * Fängt Router-bezogene Fehler ab
   */
  router.onError((error) => {
    logger.error('Router Error', error);

    // Spezielle Behandlung für "Cannot read properties of undefined"
    if (error.message.includes('Cannot read properties of undefined')) {
      if (error.message.includes('currentRoute')) {
        logger.error('currentRoute-Fehler erkannt, Router-Reset...');
        
        // Versuche Router-Reset
        setTimeout(() => {
          router.replace('/').catch(() => {
            window.location.href = '/';
          });
        }, 100);
      }
    }
  });
}

/**
 * Prüft ob eine Route als problematisch gilt
 */
function isProblematicRoute(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(':id', '[^/]+'));
    return regex.test(path);
  });
}

/**
 * Prüft ob eine Route kritisch ist (sollte immer erreichbar sein)
 */
function isCriticalRoute(path: string): boolean {
  const criticalPaths = ['/', '/login', '/error', '/404'];
  return criticalPaths.includes(path) || path.startsWith('/error');
}

/**
 * Validiert Session-IDs
 */
function isValidSessionId(id: string): boolean {
  if (!id) return false;
  
  // UUID v4 Format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Legacy ID Format (falls verwendet)
  const legacyRegex = /^[a-zA-Z0-9_-]{8,}$/;
  
  return uuidRegex.test(id) || legacyRegex.test(id);
}

/**
 * Error Type Guards
 */
export function isNavigationError(error: any): boolean {
  return error && error.type !== undefined && error.to !== undefined;
}

export function isRouterNotReadyError(error: any): boolean {
  return error && error.message && (
    error.message.includes('Router not installed') ||
    error.message.includes('Cannot read properties of undefined') ||
    error.message.includes('currentRoute')
  );
}