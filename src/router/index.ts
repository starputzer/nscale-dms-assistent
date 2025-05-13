import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useErrorReporting } from "@/utils/errorReportingService";
import { useSessionsStore } from "@/stores/sessions";
import { toastService } from "@/services/ui/ToastService";

// Debug konstante für Feature-Flags
const DISABLE_FEATURE_CHECKS = true;

// Router-Fehler-Diagnose aktivieren (nur für Entwicklung empfohlen)
const ENABLE_ROUTER_ERROR_DIAGNOSTICS = import.meta.env.DEV || false;

/**
 * Optimierte Router-Konfiguration mit:
 * - Erweiterten Lazy-Loading-Optionen mit Chunking
 * - Präfabrikantion häufig genutzter Routen
 * - Named Chunks für bessere Cache-Kontrolle
 * - Kompliziertere Komponenten mit dediziertem Chunk
 * - Verbesserte Fehlerbehandlung für Route-Ladeprobleme
 */

// Feature-Flag-Mapping für Route-Zugriffskontrolle
const routeFeatureFlags: Record<string, string> = {
  Chat: "useSfcChat",
  Documents: "useSfcDocConverter",
  Admin: "useSfcAdmin",
  Settings: "useSfcSettings",
  Login: "useSfcLogin",
};

import {
  dynamicImport,
  createRouterView,
  preloadComponentGroup,
  setupNetworkMonitoring,
  setupRouterErrorTracking,
} from "@/utils/dynamicImport";

// Netzwerkbedingungen überwachen für adaptive Ladestrategien
const networkMonitor = setupNetworkMonitoring();

// Fehler-Tracking für Router-Komponenten initialisieren
const routerErrorTracking = setupRouterErrorTracking();

/**
 * Optimierte Lazy-Loading-Funktion mit erweiterten Features:
 * - Intelligentes Caching
 * - Adaptive Ladestrategien basierend auf Netzwerk
 * - Priorisierte Komponenten-Ladung
 * - Detaillierte Chunk-Steuerung
 * - Performance-Tracking
 */
function lazyLoadView(
  viewPath: string,
  options = {
    chunkName: "view",
    preload: false,
    prefetch: true,
    priority: "medium" as "critical" | "high" | "medium" | "low",
  },
) {
  // Router-View mit Tracking und adaptiven Ladestrategien erstellen
  try {
    return createRouterView(viewPath, {
      chunkName: options.chunkName,
      preload: options.preload && networkMonitor.shouldPreload(),
      prefetch: options.prefetch && networkMonitor.isOnline(),
      priority: options.priority,
      loadingDelay: networkMonitor.getAdaptiveDelay(
        options.priority === "critical"
          ? 0
          : options.priority === "high"
            ? 50
            : options.priority === "medium"
              ? 150
              : 300,
      ),
      meta: { route: viewPath },
    });
  } catch (error) {
    console.error(`Fehler beim Laden von ${viewPath}:`, error);
    // Im Fehlerfall ErrorView als Fallback zurückgeben
    return createRouterView("ErrorView", {
      chunkName: "error",
      priority: "critical",
      preload: true,
      meta: { 
        errorSource: viewPath,
        errorDetails: error instanceof Error ? error.message : String(error)
      },
    });
  }
}

// Nach Funktionalitätsgruppen organisierte Chunks mit optimierten Ladestrategien
const lazyLoadAdmin = (component: string) => {
  try {
    return createRouterView(component, {
      chunkName: "admin",
      priority: "medium",
      prefetch: networkMonitor.isOnline() && !networkMonitor.isSlowConnection(),
      meta: { moduleType: "admin" },
    });
  } catch (error) {
    console.error(`Fehler beim Laden von Admin-Komponente ${component}:`, error);
    return createRouterView("ErrorView", {
      chunkName: "error",
      priority: "critical",
      preload: true,
      meta: { 
        errorSource: `admin/${component}`,
        errorDetails: error instanceof Error ? error.message : String(error)
      },
    });
  }
};

const lazyLoadChat = (component: string) => {
  try {
    return createRouterView(component, {
      chunkName: "chat",
      priority: "high",
      prefetch: networkMonitor.isOnline(),
      loadingDelay: networkMonitor.getAdaptiveDelay(100),
      meta: { moduleType: "chat" },
    });
  } catch (error) {
    console.error(`Fehler beim Laden von Chat-Komponente ${component}:`, error);
    return createRouterView("ErrorView", {
      chunkName: "error",
      priority: "critical",
      preload: true,
      meta: { 
        errorSource: `chat/${component}`,
        errorDetails: error instanceof Error ? error.message : String(error)
      },
    });
  }
};

const lazyLoadDocs = (component: string) => {
  try {
    return createRouterView(component, {
      chunkName: "docs",
      priority: "medium",
      prefetch: networkMonitor.isOnline() && !networkMonitor.isSlowConnection(),
      meta: { moduleType: "docs" },
    });
  } catch (error) {
    console.error(`Fehler beim Laden von Docs-Komponente ${component}:`, error);
    return createRouterView("ErrorView", {
      chunkName: "error",
      priority: "critical",
      preload: true,
      meta: { 
        errorSource: `docs/${component}`,
        errorDetails: error instanceof Error ? error.message : String(error)
      },
    });
  }
};

// Routen-Definitionen
const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: () => lazyLoadChat("ChatView"),
    meta: {
      requiresAuth: true,
      title: "Chat",
    },
  },
  {
    path: "/ui-components-demo",
    name: "UIComponentsDemo",
    component: lazyLoadView("UIComponentsDemoView", {
      chunkName: "demo",
      preload: false,
      prefetch: false,
    }),
    meta: {
      requiresAuth: true,
      adminOnly: true,
      title: "UI Components Demo",
      featureFlag: "uiComponentsDemo",
    },
  },
  {
    path: "/enhanced-chat",
    name: "EnhancedChat",
    component: () => lazyLoadChat("EnhancedChatView"), 
    meta: {
      requiresAuth: true,
      title: "Enhanced Chat",
    },
  },
  {
    path: "/login",
    name: "Login",
    // Direkte Import-Anweisung für höchste Zuverlässigkeit
    component: () => import('../views/LoginView.simple.vue'),
    meta: {
      guest: true,
      title: "Login",
      featureFlag: "useSfcLogin",
      isCriticalPath: true, // Markiere explizit als kritischen Pfad
    },
    // Alternativer Komponentenpfad für Entwicklungs- und Testzwecke
    alias: "/auth"
  },
  {
    path: "/auth",
    name: "Auth",
    component: lazyLoadView("AuthView", {
      chunkName: "auth",
      preload: true,
    }),
    meta: {
      guest: true,
      title: "Anmelden",
      featureFlag: "useSfcLogin",
    },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => lazyLoadAdmin("AdminView"),
    meta: {
      requiresAuth: true,
      adminOnly: true,
      title: "Administration",
      featureFlag: "useSfcAdmin",
    },
  },
  {
    path: "/documents",
    name: "Documents",
    component: () => lazyLoadDocs("DocumentsView"),
    meta: {
      requiresAuth: true,
      title: "Dokumentenkonverter",
      featureFlag: "useSfcDocConverter",
    },
  },
  {
    path: "/settings",
    name: "Settings",
    component: lazyLoadView("SettingsView", {
      chunkName: "settings",
    }),
    meta: {
      requiresAuth: true,
      title: "Einstellungen",
      featureFlag: "useSfcSettings",
    },
  },
  {
    path: "/session/:id",
    name: "Session",
    component: () => lazyLoadChat("ChatView"),
    meta: {
      requiresAuth: true,
      title: "Chat Session",
      featureFlag: "useSfcChat",
    },
  },
  {
    path: "/error",
    name: "Error",
    component: lazyLoadView("ErrorView", {
      chunkName: "error",
      priority: "critical", // Höchste Priorität für Fehlerseite
      preload: true, // Vorausladen, damit Fehlerseite immer verfügbar ist
    }),
    meta: {
      title: "Fehler",
      requiresAuth: false, // Sicherstellen, dass die Fehlerseite ohne Auth erreichbar ist
    },
    props: (route) => ({
      errorCode: route.query.code || "500",
      errorMessage: route.query.message || "Ein unbekannter Fehler ist aufgetreten.",
      errorDetails: route.query.details || "",
      canRetry: route.query.canRetry === "true",
      // Erweiterte Diagnoseinformationen durchreichen
      source: route.query.source,
      component: route.query.component,
      from: route.query.from,
      originalRoute: route.query.originalRoute
    }),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: lazyLoadView("NotFoundView", {
      chunkName: "error",
      priority: "high", // Hohe Priorität für 404-Seite
      preload: true, // Vorausladen für bessere Benutzererfahrung
    }),
    meta: {
      title: "Seite nicht gefunden",
      requiresAuth: false, // Keine Authentifizierung erforderlich
    },
  },
];

// Router-Instanz erstellen mit optimierten Einstellungen
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
      return { el: to.hash, behavior: "smooth" };
    } else {
      return { top: 0, behavior: "smooth" };
    }
  },
});

/**
 * Prüft Authentifizierung und Berechtigungen
 */
const checkAuth = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  // Stores abrufen
  const authStore = useAuthStore();

  try {
    // Spezialbehandlung für Error-Routen: immer erlauben
    if (to.name === 'Error' || to.path.startsWith('/error')) {
      return next();
    }
    
    // Prüfe, ob Route Authentifizierung erfordert
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      // Token-Validität prüfen (falls Token vorhanden)
      if (authStore.token) {
        try {
          const isValid = await authStore.validateCurrentToken();
          if (!isValid) {
            // Wenn Token ungültig, zum Login umleiten
            return next({
              path: "/login",
              query: {
                redirect: to.fullPath,
                error: "session_expired",
              },
            });
          }
        } catch (error) {
          // Bei Fehler zur Error-Seite weiterleiten
          console.error("Fehler bei Token-Validierung:", error);
          return next({
            path: "/error",
            query: {
              code: "auth_error",
              message: "Fehler bei der Authentifizierung. Bitte erneut anmelden.",
              from: to.fullPath
            }
          });
        }
      } else {
        // Wenn kein Token vorhanden, zum Login umleiten
        return next({
          path: "/login",
          query: { redirect: to.fullPath },
        });
      }
    }

    // Prüfe, ob Route Admin-Rechte erfordert
    if (to.meta.adminOnly && !authStore.isAdmin) {
      toastService.error(
        "Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.",
      );
      return next({ path: "/" });
    }

    // Prüfe, ob Route nur für Gäste ist (z.B. Login)
    if (to.meta.guest && authStore.isAuthenticated) {
      return next({ path: "/" });
    }

    // Prüfen auf Session-ID-Parameter für Chat-Ansichten
    if (to.params.id && to.name === "Session") {
      const sessionsStore = useSessionsStore();
      const sessionId = to.params.id as string;

      // Prüfen, ob Session existiert
      const sessionExists = sessionsStore.sessions.some(
        (s) => s.id === sessionId,
      );
      if (!sessionExists) {
        // Wenn Session nicht existiert, zur Hauptseite umleiten
        toastService.warning(
          "Die angeforderte Konversation existiert nicht oder wurde gelöscht.",
        );
        return next({ path: "/" });
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
      severity: "medium",
      source: {
        type: "system",
        name: "Router Guard",
      },
      context: {
        from: from.path,
        to: to.path,
      },
    });

    // Zur Fehlerseite umleiten
    return next({
      path: "/error",
      query: {
        code: "500",
        message: "Ein Fehler ist bei der Navigation aufgetreten.",
      },
    });
  }
};

/**
 * Prüft Feature-Flags für Routen
 */
const checkFeatureFlags = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  // Feature-Checks komplett deaktivieren für Debugging
  if (DISABLE_FEATURE_CHECKS) {
    return next();
  }
  
  // Für kritische Routen immer weitermachen (besonders während der Entwicklung)
  if (to.path === '/' || to.path === '/login' || to.path === '/enhanced-chat' || to.path === '/error' || to.path.startsWith('/error')) {
    return next();
  }
  
  // Feature-Flag-Store abrufen
  const featureToggles = useFeatureTogglesStore();

  try {
    // Feature-Flag aus Route oder Mapping holen
    const featureFlag =
      (to.meta.featureFlag as string) || routeFeatureFlags[to.name as string];

    // Wenn kein Feature-Flag definiert ist oder es aktiv ist, weitermachen
    if (!featureFlag || featureToggles.isEnabled(featureFlag)) {
      return next();
    }
    
    // In der Entwicklung alle Features zulassen
    if (import.meta.env.DEV) {
      console.log(`Feature "${featureFlag}" ist deaktiviert, wird aber in DEV erlaubt`);
      return next();
    }

    // Ansonsten zur Home-Route umleiten
    console.log(`Feature "${featureFlag}" ist deaktiviert, Umleitung zur Startseite`);
    return next({ path: "/" });
  } catch (error) {
    console.warn('Feature Flag Check Error:', error);
    // Bei Fehler zur Hauptseite weiterleiten
    return next();
  }
};

/**
 * Vorausladen von Komponenten für häufig verwendete Routen mit optimierter Strategie:
 * - Adaptive Entscheidung basierend auf Netzwerkbedingungen
 * - Benutzerrolle und -verhalten berücksichtigen
 * - Progressive Ladepriorität mit gestaffeltem Timing
 */
function preloadPopularRoutes() {
  // Nur vorausladen, wenn Netzwerkbedingungen gut sind
  if (!networkMonitor.shouldPreload()) {
    return; // Kein Preloading bei schlechter Verbindung oder Offline
  }

  // Benutzer-Auth-Status abrufen
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  // Verzögert laden, um die Priorität der aktuellen Route nicht zu beeinträchtigen
  setTimeout(() => {
    // Für alle Benutzer: Chat ist die Haupt-Route
    preloadComponentGroup(
      [
        "views/ChatView.vue",
        "components/chat/MessageItem.vue",
        "components/chat/MessageList.vue",
      ],
      {
        chunkName: "chat",
        priority: "high",
        preload: isAuthenticated, // Nur für authentifizierte Benutzer vorausladen
      },
    );

    // Nach einer weiteren Verzögerung, rollenbasiertes Laden
    setTimeout(() => {
      // Admin-spezifische Komponenten
      if (isAdmin) {
        preloadComponentGroup(
          ["views/AdminView.vue", "components/admin/AdminPanel.vue"],
          {
            chunkName: "admin",
            priority: "medium",
            preload: true,
          },
        );
      }

      // Dokumentenkonverter (häufig verwendete Komponente)
      if (isAuthenticated) {
        preloadComponentGroup(["views/DocumentsView.vue"], {
          chunkName: "docs",
          priority: "low",
          preload: true,
          delayLoad: 2500, // Verzögerung bis zum tatsächlichen Laden
        });
      }
    }, 1500);
  }, 1000);
}

/**
 * Setzt den Dokumenttitel basierend auf Route-Metadaten
 */
const setDocumentTitle = (to: RouteLocationNormalized) => {
  // Basis-Titel der Anwendung
  const baseTitle = "nscale DMS Assistent";

  // Titel aus Route-Metadaten oder Fallback
  const pageTitle = to.meta.title
    ? `${to.meta.title} | ${baseTitle}`
    : baseTitle;

  // Dokumenttitel setzen
  document.title = pageTitle;

  // Auch als Meta-Tag setzen
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      `${pageTitle} - Digitaler Assistent für nscale DMS`,
    );
  }
};

/**
 * Erfasst Navigation für Analytics
 */
const trackNavigation = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => {
  try {
    // Wenn Produktionsumgebung und Analytics-Funktion verfügbar
    if (import.meta.env.PROD && window.trackPageView) {
      window.trackPageView({
        path: to.path,
        name: to.name as string,
        from: from.path,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error tracking navigation:", error);
  }
};

// Debug Router
console.log("Router Konfiguration:", routes);

// Initialer Redirect zur Login-Seite, wenn der Pfad direkt auf "/" endet
router.beforeEach((to, from, next) => {
  // Wenn die App gerade gestartet wird und man versucht "/" zu öffnen,
  // direkt zum Login umleiten, da wir prüfen müssen, ob der Benutzer angemeldet ist
  const authStore = useAuthStore();
  if (to.path === "/" && !authStore.isAuthenticated) {
    console.log("Benutzer nicht angemeldet - Umleitung zum Login");
    localStorage.setItem('redirected', 'true');
    return next({ path: "/login" });
  }
  
  // Entferne den Redirect-Flag nach erfolgreicher Navigation
  if (to.path !== "/" && localStorage.getItem('redirected')) {
    localStorage.removeItem('redirected');
  }
  
  // Bei allen anderen Navigationen fortsetzen
  return next();
});

// Fehlerbehandlung und Debug-Logging
router.beforeEach((to, from, next) => {
  console.log(`Navigation: ${from.path} -> ${to.path}`);
  
  // Fehlerseite direkt anzeigen, wenn von dort aus navigiert wird
  if (from.path === "/error") {
    console.log("Navigation von Fehlerseite - direktes Durchlassen");
    return next();
  }
  
  // Root-Route immer erlauben
  if (to.path === "/" || to.name === "Home") {
    console.log("Navigation zur Root-Route - direktes Durchlassen");
    return next();
  }
  
  // Weiterleiten an normale Navigation Guards
  next();
});

// Hilfsfunktion, die prüft, ob es sich um einen kritischen oder Fehler-Pfad handelt
function isCriticalPath(path: string, route?: RouteLocationNormalized) {
  // Prüfe zuerst auf explizites isCriticalPath-Flag in Route-Metadaten
  if (route && route.meta.isCriticalPath === true) {
    return true;
  }

  // Sonst prüfe anhand des Pfads
  return (
    path === "/" || 
    path === "/login" || 
    path === "/auth" ||
    path === "/enhanced-chat" || 
    path === "/error" || 
    path.startsWith("/error") || 
    path.includes("/error") || 
    path.includes("chunk_load_error") || 
    path.includes("router_error")
  );
}

// Feature-Flags prüfen vor Auth, damit Auth-Checks immer durchlaufen
router.beforeEach((to, from, next) => {
  try {
    // Wenn es sich um einen kritischen Pfad handelt, direkt weitergeben
    if (isCriticalPath(to.path, to) || to.name === "Error" || to.name === "NotFound") {
      console.log("Skipping feature and auth checks for critical path:", to.path);
      return next();
    }
    
    // Sonst normale Guards ausführen
    return checkFeatureFlags(to, from, next);
  } catch (error) {
    console.error("Fehler bei Routing-Guard-Ausführung:", error);
    // Bei Fehler direkt zur Login-Seite weiterleiten
    return next({ path: "/login" });
  }
});

router.beforeEach(checkAuth);
router.afterEach((to, from) => {
  setDocumentTitle(to);
  trackNavigation(to, from);

  // Vorausladen beliebter Routen nach Navigation
  if (to.path === "/") {
    preloadPopularRoutes();
  }
});

// Erweiterte Fehlerbehandlung bei Routing-Fehlern mit Diagnose und self-healing
router.onError((error) => {
  console.error("Router error:", error);

  const errorReporting = useErrorReporting();
  
  // Detailliertere Fehlerinformationen sammeln
  let errorDetails = "Unbekannter Fehler";
  let errorCode = "router_error";
  let severity = "high";
  let currentRoute = router.currentRoute.value.fullPath;
  let targetRoute = '';
  
  try {
    // Versuch, die Zielroute aus dem Fehler zu extrahieren
    const errorString = String(error);
    const routeMatch = errorString.match(/(?:failed to load chunk|failed at path|chunk|module) ['"](.+?)['"]/i);
    
    if (routeMatch && routeMatch[1]) {
      targetRoute = routeMatch[1];
    } else if (router.currentRoute.value.redirectedFrom) {
      targetRoute = router.currentRoute.value.redirectedFrom.fullPath;
    }
  } catch (e) {
    console.error("Fehler beim Extrahieren der Zielroute:", e);
  }
  
  if (error instanceof Error) {
    errorDetails = error.message;
    
    // Spezifische Fehlermeldungen für häufige Fehlertypen kategorisieren
    if (error.message.includes("Failed to fetch dynamically imported module") || 
        error.message.includes("Importing a module script failed")) {
      errorCode = "chunk_load_error";
      errorDetails = "Modul konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.";
    } else if (error.message.includes("NetworkError") || error.message.includes("network error")) {
      errorCode = "network_error";
      severity = "medium"; // Netzwerkfehler können vorübergehend sein
      errorDetails = "Netzwerkfehler beim Laden der Komponente. Bitte überprüfen Sie Ihre Internetverbindung.";
    } else if (error.message.includes("ChunkLoadError") || error.message.includes("Loading chunk")) {
      errorCode = "chunk_load_error";
      errorDetails = "Fehler beim Laden des Seitenmoduls. Bitte leeren Sie den Browser-Cache und versuchen Sie es erneut.";
    } else if (error.message.includes("TypeError") || error.message.includes("is not a function")) {
      errorCode = "js_error";
      errorDetails = "JavaScript-Fehler in der Anwendung. Dies könnte ein Problem mit der Anwendungsversion sein.";
    } else if (error.message.includes("failed to resolve component")) {
      errorCode = "component_error";
      errorDetails = "Fehler beim Auflösen der Komponentenabhängigkeiten.";
    }
  }
  
  // Fehler im Route-Tracking-System erfassen
  if (targetRoute) {
    routerErrorTracking.trackError(targetRoute, error);
  }
  
  // Fehlerdiagnose für detaillierte Fehlerberichterstattung
  const diagnostics = routerErrorTracking.getDiagnostics();
  
  // Fehler erfassen mit umfassenden Diagnoseinformationen
  errorReporting.captureError(error, {
    severity: severity,
    source: {
      type: "system",
      name: "Router Error",
    },
    context: {
      code: errorCode,
      details: errorDetails,
      currentRoute: currentRoute,
      targetRoute: targetRoute || 'unknown',
      url: window.location.href,
      userAgent: navigator.userAgent,
      routeErrorCount: targetRoute ? (diagnostics.errors[targetRoute]?.count || 1) : 0,
      totalRouteErrors: diagnostics.totalErrors,
      mostProblematicRoute: diagnostics.highestErrorRoute?.route || 'none',
      timestamp: new Date().toISOString()
    }
  });

  // Zur Fehlerseite umleiten mit umfassenden Diagnoseinformationen
  router.push({
    path: "/error",
    query: {
      code: errorCode,
      message: errorDetails,
      from: currentRoute,
      component: targetRoute || undefined,
      source: error.stack ? 'runtime' : 'loading',
      originalRoute: router.currentRoute.value.redirectedFrom?.fullPath,
      ts: Date.now().toString(), // Timestamp hinzufügen, um Cache-Probleme zu vermeiden
    },
  }).catch(navigationError => {
    // Fallback falls sogar die Navigation zur Fehlerseite fehlschlägt
    console.error("Kritischer Fehler - Navigation zur Fehlerseite fehlgeschlagen:", navigationError);
    
    // Manuelle Umleitung als letzten Ausweg
    window.location.href = `/error?code=${errorCode}&critical=true`;
  });
});

// TypeScript-Erweiterung für Window-Objekt
declare global {
  interface Window {
    trackPageView?: (data: any) => void;
  }
}

// Debug-Hilfsmittel für die Entwicklung
if (ENABLE_ROUTER_ERROR_DIAGNOSTICS) {
  /**
   * Globales Diagnose-Tool für die Browserkonsole
   * Erlaubt Entwicklern, Router-Fehler zu diagnostizieren und zu beheben
   */
  (window as any).__routerDiagnostics = {
    // Router-Instanz für weitere Diagnose
    router,
    
    // Fehlerdiagnose
    getErrorDiagnostics: () => routerErrorTracking.getDiagnostics(),
    
    // Fehler für eine bestimmte Route zurücksetzen
    resetErrorsForRoute: (route: string) => routerErrorTracking.resetErrorsForRoute(route),
    
    // Alle Fehler zurücksetzen
    resetAllErrors: () => routerErrorTracking.resetAllErrors(),
    
    // Router-Cache löschen und Neustart erzwingen
    forceRouterReset: () => {
      // Cache löschen
      const routeCache = (router as any).matcher.getRoutes();
      for (const route of routeCache) {
        if (route.components && route.components.default) {
          try {
            delete route.components.default.__file;
            delete route.components.default.__hmrId;
          } catch (e) {
            console.warn('Fehler beim Zurücksetzen der Route:', e);
          }
        }
      }
      
      // Toast-Information für Entwickler
      toastService.info('Router Cache wurde zurückgesetzt', {
        duration: 2000,
        position: 'top-center'
      });
      
      // Optional: Seite nach kurzer Verzögerung neu laden
      return 'Router Cache wurde zurückgesetzt. Verwenden Sie location.reload() für einen vollständigen Neustart.';
    },
    
    // Netzwerkbedingungen für Testzwecke simulieren
    simulateNetworkCondition: (condition: 'offline' | 'slow' | 'normal') => {
      // In der Praxis würde dies mit einem Service-Worker umgesetzt werden
      // Hier eine vereinfachte Simulation für Testzwecke
      (window.navigator as any).__simulatedNetwork = condition;
      if (condition === 'offline') {
        toastService.warning('Offline-Modus simuliert. Einige Features werden beeinträchtigt.');
      } else if (condition === 'slow') {
        toastService.info('Langsame Verbindung simuliert. Komponenten werden verzögert geladen.');
      } else {
        toastService.success('Netzwerksimulation zurückgesetzt.');
        delete (window.navigator as any).__simulatedNetwork;
      }
    },
    
    // Hilfefunktion für Diagnose-Tool
    help: () => {
      console.log(`
Router Diagnose-Tools:
---------------------
__routerDiagnostics.getErrorDiagnostics() - Zeigt Fehlerstatistiken und Diagnose an
__routerDiagnostics.resetErrorsForRoute(route) - Setzt Fehler für eine bestimmte Route zurück
__routerDiagnostics.resetAllErrors() - Setzt alle Router-Fehlerstatistiken zurück
__routerDiagnostics.forceRouterReset() - Erzwingt ein Zurücksetzen des Router-Caches
__routerDiagnostics.simulateNetworkCondition(condition) - Simuliert Netzwerkbedingungen ('offline', 'slow', 'normal')
      `);
    }
  };
  
  // Information in der Entwicklerkonsole
  console.info('Router-Diagnose-Tools verfügbar unter window.__routerDiagnostics');
  console.info('Verwende __routerDiagnostics.help() für mehr Informationen');
}

export default router;
